// server.js — Matério × ChatGPT Commerce MVP — Local dev server
// Usage: node server.js

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import Stripe from 'stripe';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

// Load .env file
const envPath = join(__dirname, '.env');
try {
  const envContent = await readFile(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  console.warn('⚠️  No .env file found. Create one from .env.example');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

// ─── Static file server ────────────────────────────────

async function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = join(__dirname, 'public', urlPath === '/' ? 'index.html' : urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');

    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// ─── Read JSON body helper ─────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ─── CATALOG + SERVICES LOADER ─────────────────────────

const CATALOG_PATH = join(__dirname, 'data', 'catalog-materio.json');
const SERVICES_PATH = join(__dirname, 'data', 'services.json');
const STORES_PATH = join(__dirname, 'data', 'stores.json');

let catalogData = null;
let catalogProductMap = {};
let VALID_IDS = new Set();
let servicesData = null;
let storesData = null;
let SYSTEM_PROMPT = '';

function loadServices() {
  try {
    if (existsSync(SERVICES_PATH)) {
      servicesData = JSON.parse(readFileSync(SERVICES_PATH, 'utf-8'));
    }
    if (existsSync(STORES_PATH)) {
      storesData = JSON.parse(readFileSync(STORES_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('⚠️  Failed to load services/stores:', err.message);
  }
}

function loadCatalog() {
  try {
    loadServices();

    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  No catalog-materio.json found. Run: node scraper/index.js');
      buildSystemPromptWithoutCatalog();
      return;
    }
    const raw = readFileSync(CATALOG_PATH, 'utf-8');
    catalogData = JSON.parse(raw);

    // Build product map by pid
    catalogProductMap = {};
    for (const p of catalogData.products) {
      catalogProductMap[p.pid] = p;
    }
    VALID_IDS = new Set(Object.keys(catalogProductMap));

    // Build compact catalog for system prompt — balanced across subcategories
    const inStock = catalogData.products
      .filter(p => p.availability.in_stock && p.price.amount > 0);

    const bySubcat = {};
    for (const p of inStock) {
      const parts = (p.category || '').split(' > ');
      const subcat = parts.slice(0, 3).join(' > ') || 'Autre';
      if (!bySubcat[subcat]) bySubcat[subcat] = [];
      bySubcat[subcat].push(p);
    }

    const byCategory = {};
    let totalSelected = 0;
    for (const [subcat, items] of Object.entries(bySubcat).sort()) {
      items.sort((a, b) => b.price.amount - a.price.amount);
      const topLevel = subcat.split(' > ')[0];
      if (!byCategory[topLevel]) byCategory[topLevel] = [];
      for (const p of items.slice(0, 1)) {
        const price = (p.price.amount / 100).toFixed(2);
        const brand = p.brand ? ` ${p.brand}` : '';
        byCategory[topLevel].push(`${p.pid}|${p.title}|${price}$${brand}`);
        totalSelected++;
      }
    }

    let catalogText = '';
    for (const [cat, lines] of Object.entries(byCategory).sort()) {
      catalogText += `\n${cat.toUpperCase()}:\n${lines.join('\n')}\n`;
    }

    // Store info
    const storeLines = (storesData?.stores || [])
      .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
      .join('\n');

    // Services info
    const servicesText = buildServicesText();

    // Financing info
    const financingText = buildFinancingText();

    SYSTEM_PROMPT = buildFullSystemPrompt(catalogData, totalSelected, catalogText, storeLines, servicesText, financingText);

    console.log(`📦 Catalog loaded: ${catalogData.products.length} products, ${Object.keys(byCategory).length} categories`);
  } catch (err) {
    console.error('❌ Failed to load catalog:', err.message);
    buildSystemPromptWithoutCatalog();
  }
}

function buildServicesText() {
  if (!servicesData) return '';
  let text = '\nSERVICES MATÉRIO:\n';
  if (servicesData.centre_de_coupe) {
    text += `\n🔧 CENTRE DE COUPE SUR MESURE:\n`;
    text += `Magasins: ${servicesData.centre_de_coupe.available_stores.join(', ')}\n`;
    text += `Capacités: ${servicesData.centre_de_coupe.capabilities.join('; ')}\n`;
  }
  if (servicesData.livraison_specialisee) {
    text += `\n🚚 LIVRAISON SPÉCIALISÉE:\n`;
    text += `35 véhicules: ${servicesData.livraison_specialisee.vehicles.join(', ')}\n`;
    text += `Capacités: ${servicesData.livraison_specialisee.capabilities.join('; ')}\n`;
    text += `Horaire: ${servicesData.livraison_specialisee.schedule}\n`;
  }
  if (servicesData.estimation) {
    text += `\n📋 SERVICE D'ESTIMATION:\n`;
    text += `Magasins: ${servicesData.estimation.available_stores.join(', ')}\n`;
  }
  if (servicesData.programme_fidelite) {
    text += `\n💳 CARTE MATÉRIO (fidélité):\n`;
    text += `Gratuit. ${servicesData.programme_fidelite.earn_rate}. ${servicesData.programme_fidelite.redeem}.\n`;
  }
  return text;
}

function buildFinancingText() {
  if (!servicesData?.financement) return '';
  let text = '\n💰 FINANCEMENT SANS INTÉRÊTS:\n';
  for (const plan of servicesData.financement.plans) {
    text += `- ${plan.min}$ à ${plan.max}$: ${plan.months} mois sans intérêts\n`;
  }
  text += `Conditions: ${servicesData.financement.conditions}\n`;
  return text;
}

function buildFullSystemPrompt(catalog, totalSelected, catalogText, storeLines, servicesText, financingText) {
  return `Tu es l'assistant commercial IA de Matério, une chaîne de centres de rénovation dans les Laurentides au Québec fondée en 1979. Matério compte 6 magasins et fait partie du groupe d'achat ILDC (4 milliards $ de pouvoir d'achat). Tu aides les clients à trouver les bons produits et services pour leurs projets de rénovation et construction.

RÈGLES:
1. Toujours répondre en français québécois, ton chaleureux et professionnel
2. Recommander UNIQUEMENT les produits du catalogue ci-dessous (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Proposer les services Matério quand pertinent (coupe, livraison, estimation, financement)
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. TOUJOURS appeler show_products quand tu recommandes des produits spécifiques
8. Appeler show_services quand tu mentionnes un service (coupe, livraison, estimation)
9. Appeler show_financing quand le total du panier dépasse 750$ et que le financement est pertinent
10. Appeler show_estimation quand le client décrit un projet complexe qui nécessite une soumission professionnelle
11. Appeler show_checkout SEULEMENT quand le client dit explicitement vouloir commander/acheter
12. Pour la livraison spécialisée: mentionner les camions-girafe et la livraison sur le toit quand le projet l'exige
13. Pour le centre de coupe: vérifier que le magasin du client a le service avant de le proposer
14. Le catalogue complet contient ${catalog.products.length} produits. Tu as un échantillon de ${totalSelected} ci-dessous. Utilise search_catalog pour chercher des produits spécifiques absents de l'échantillon.
15. Quand un client demande un type de produit, cherche d'abord dans l'échantillon. Si tu ne trouves pas assez de résultats, appelle search_catalog avec des mots-clés pertinents, puis appelle show_products avec les pid trouvés.
16. Tous les ${catalog.products.length} produits sont disponibles en magasin. Ne dis JAMAIS qu'un produit n'est pas disponible.
17. VENTE COMPLÉMENTAIRE: Quand un client demande un produit, TOUJOURS proposer les produits complémentaires nécessaires pour compléter le travail. Utilise search_catalog pour trouver les accessoires et matériaux associés. Exemples:
  - Bardeaux → papier feutre, clous à toiture, solin, évent de toit, sous-couche
  - Peinture → rouleau, pinceau, ruban de peintre, bâche, apprêt
  - Bois de charpente → vis, clous, équerres, ancrages, quincaillerie de fixation
  - Revêtement de plancher → sous-couche, moulures de transition, adhésif
  - Gypse → vis à gypse, ruban à joints, composé à joints, couteau à enduire
  - Isolation → pare-vapeur, ruban d'étanchéité, agrafe
  - Plomberie (bain, toilette) → robinetterie, raccords, silicone, drain
  Présente le produit demandé EN PREMIER, puis une section "Pour compléter votre projet" avec les compléments.

CATALOGUE MATÉRIO (${totalSelected} produits échantillon sur ${catalog.products.length} total):
${catalogText}
MAGASINS MATÉRIO (6 succursales dans les Laurentides):
${storeLines}
Heures: ${storesData?.hours_default || 'lun-ven 7h30-21h, sam 8h-17h, dim 9h-17h'}
${servicesText}
${financingText}
Dernière mise à jour du catalogue: ${catalog.metadata?.scraped_at || 'inconnue'}`;
}

function buildSystemPromptWithoutCatalog() {
  loadServices();
  const storeLines = (storesData?.stores || [])
    .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
    .join('\n');
  const servicesText = buildServicesText();
  const financingText = buildFinancingText();

  SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Matério, une chaîne de centres de rénovation dans les Laurentides au Québec fondée en 1979. Matério compte 6 magasins et fait partie du groupe d'achat ILDC (4 milliards $ de pouvoir d'achat).

⚠️ Le catalogue produits n'est pas encore chargé. Tu peux quand même aider avec les services et informations générales.

MAGASINS MATÉRIO:
${storeLines}
${servicesText}
${financingText}`;
}

// Load on startup
loadCatalog();

// Reload catalog every 5 minutes
setInterval(loadCatalog, 5 * 60 * 1000);

// ─── TOOLS (Function Calling) ──────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description: "Display product cards to the customer. Call this EVERY TIME you recommend specific products from the Matério catalog.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Exact product pid from catalog" },
                quantity: { type: "integer", minimum: 1 }
              },
              required: ["product_id", "quantity"]
            }
          }
        },
        required: ["products"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_services",
      description: "Display a service card (centre de coupe, livraison spécialisée, estimation, ouverture de compte). Call this when you recommend a Matério service.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["centre_de_coupe", "livraison_specialisee", "estimation", "ouverture_compte"],
            description: "The service to display"
          },
          store: {
            type: "string",
            description: "Store name where the service is available"
          },
          details: {
            type: "string",
            description: "Additional details about the service recommendation"
          }
        },
        required: ["service_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_financing",
      description: "Show financing options when cart total exceeds 750$. Call this to display monthly payment plan.",
      parameters: {
        type: "object",
        properties: {
          total_amount: {
            type: "number",
            description: "Total cart amount before taxes"
          },
          months: {
            type: "integer",
            description: "Number of months for the financing plan"
          }
        },
        required: ["total_amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_estimation",
      description: "Show estimation request form for complex projects (construction, renovation). Call when the customer describes a large project that needs a professional quote.",
      parameters: {
        type: "object",
        properties: {
          project_type: {
            type: "string",
            description: "Type of project (rénovation, construction neuve, agrandissement)"
          },
          project_details: {
            type: "object",
            description: "Project details gathered by the AI",
            properties: {
              dimensions: { type: "string" },
              foundation: { type: "string" },
              insulation: { type: "string" },
              exterior: { type: "string" },
              interior: { type: "string" },
              roofing: { type: "string" },
              windows: { type: "string" }
            }
          },
          store: {
            type: "string",
            description: "Preferred store for estimation"
          },
          estimated_range: {
            type: "string",
            description: "AI estimated cost range (e.g., 7 100 $ – 10 500 $)"
          }
        },
        required: ["project_type", "store"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Search the full Matério catalog (6978 products) by keyword. Use this to find products not in the sample list. Returns up to 10 matching products with pid, title, price, category.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords in French (e.g. 'bardeau asphalte', 'vis à bois 3 pouces')" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_checkout",
      description: "Show checkout panel. ONLY when customer explicitly wants to buy/order/reserve.",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "List of product pids to purchase"
          },
          store: { type: "string", description: "Store for pickup or shipping" },
          delivery_type: { type: "string", enum: ["pickup", "standard", "toit", "chantier"], description: "Type of delivery" },
          financing: { type: "boolean", description: "Whether the customer chose a financing plan" },
          account_number: { type: "string", description: "B2B account number if applicable" }
        },
        required: ["product_ids"]
      }
    }
  }
];

function executeTool(tc) {
  const name = tc.function.name;
  let args;
  try { args = JSON.parse(tc.function.arguments); } catch { return { error: "Invalid args" }; }

  switch (name) {
    case 'show_products': {
      const valid = (args.products || []).filter(p => VALID_IDS.has(p.product_id));
      const complements = findComplements(valid.map(p => p.product_id));
      const complementNames = complements.map(c => catalogProductMap[c.product_id]?.title).filter(Boolean);
      return {
        success: true,
        products_displayed: valid.length,
        complements_displayed: complements.length,
        complement_names: complementNames,
        message: complements.length > 0
          ? `${valid.length} produit(s) affichés + ${complements.length} produit(s) complémentaires suggérés automatiquement: ${complementNames.join(', ')}. Mentionne-les brièvement dans ta réponse.`
          : `${valid.length} produit(s) affichés.`
      };
    }
    case 'show_services': {
      // Validate service availability at requested store
      const store = args.store;
      const storeData = store && storesData?.stores?.find(s => s.name === store);
      const available = !storeData || storeData.services?.includes(args.service_type === 'livraison_specialisee' ? 'livraison' : args.service_type);
      return { success: true, service_displayed: args.service_type, store_available: available };
    }
    case 'show_financing': {
      const amount = args.total_amount || 0;
      const plan = getFinancingPlan(amount);
      return { success: true, financing: plan };
    }
    case 'show_estimation':
      return { success: true, estimation_requested: true, project_type: args.project_type, store: args.store };
    case 'search_catalog': {
      const q = (args.query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const words = q.split(/\s+/).filter(w => w.length > 1);
      if (!words.length || !catalogData) return { results: [], message: 'Aucun terme de recherche' };
      const results = catalogData.products
        .filter(p => {
          const text = (p.title + ' ' + p.category + ' ' + (p.brand || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return words.every(w => text.includes(w));
        })
        .slice(0, 10)
        .map(p => ({ pid: p.pid, title: p.title, price: (p.price.amount / 100).toFixed(2) + '$', category: p.category, brand: p.brand || '' }));
      return { results, total_found: results.length };
    }
    case 'show_checkout':
      return { success: true, checkout_ready: true, products: args.product_ids?.length || 0 };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Cross-sell: complementary product mapping ─────────

const COMPLEMENT_MAP = [
  { match: ['bardeau', 'toiture', 'shingle'], searches: ['clou toiture', 'papier feutre', 'solin', 'évent toit', 'sous-couche toiture'] },
  { match: ['peinture'], searches: ['rouleau peinture', 'pinceau', 'ruban peintre', 'bâche protection', 'apprêt'] },
  { match: ['gypse', 'placoplâtre'], searches: ['vis gypse', 'ruban joints', 'composé joints', 'couteau enduire'] },
  { match: ['isolant', 'isolation', 'laine'], searches: ['pare-vapeur', 'ruban étanchéité', 'agrafe'] },
  { match: ['plancher', 'flottant', 'vinyle'], searches: ['sous-couche plancher', 'moulure transition', 'adhésif plancher'] },
  { match: ['bois', 'madrier', '2x4', '2x6', 'colombage'], searches: ['vis construction', 'clou charpente', 'équerre', 'ancrage'] },
  { match: ['clôture', 'cloture'], searches: ['vis terrasse', 'poteau', 'teinture extérieur'] },
  { match: ['terrasse', 'deck', 'patio'], searches: ['vis terrasse', 'teinture extérieur', 'ancrage poteau', 'solin'] },
  { match: ['robinet', 'toilette', 'baignoire', 'lavabo', 'douche'], searches: ['silicone plomberie', 'robinet salle', 'raccord pex', 'drain baignoire'] },
  { match: ['fenêtre', 'porte'], searches: ['calfeutrage', 'mousse expansive', 'solin', 'vis bois'] },
  { match: ['membrane', 'étanchéité'], searches: ['apprêt membrane', 'rouleau', 'solin', 'clou toiture'] },
  { match: ['béton', 'ciment'], searches: ['truelle', 'coffrage', 'armature', 'scellant béton'] },
];

function findComplements(productIds) {
  if (!catalogData || !productIds.length) return [];
  const texts = productIds
    .map(pid => catalogProductMap[pid])
    .filter(Boolean)
    .map(p => (p.title + ' ' + p.category).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  if (!texts.length) return [];

  const searchTerms = new Set();
  for (const entry of COMPLEMENT_MAP) {
    const matched = entry.match.some(kw => {
      const norm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return texts.some(t => t.includes(norm));
    });
    if (matched) {
      for (const s of entry.searches) searchTerms.add(s);
    }
  }

  if (!searchTerms.size) return [];

  const seen = new Set(productIds);
  const complements = [];
  for (const term of searchTerms) {
    if (complements.length >= 6) break;
    const words = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
    const found = catalogData.products.find(p => {
      if (seen.has(p.pid)) return false;
      const text = (p.title + ' ' + p.category).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return words.every(w => text.includes(w));
    });
    if (found) {
      seen.add(found.pid);
      complements.push({ product_id: found.pid, quantity: 1 });
    }
  }
  return complements;
}

function getFinancingPlan(amount) {
  if (!servicesData?.financement?.plans) return null;
  for (const plan of servicesData.financement.plans) {
    if (amount >= plan.min && amount <= plan.max) {
      return { months: plan.months, monthly: Math.ceil(amount / plan.months * 100) / 100, total: amount, interest: 0 };
    }
  }
  if (amount > 10000) {
    return { months: 36, monthly: Math.ceil(amount / 36 * 100) / 100, total: amount, interest: 0 };
  }
  return null;
}

// ─── Chat handler ──────────────────────────────────────

async function handleChat(req, res) {
  const body = await readBody(req);
  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'messages array required' }));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured. Create a .env file.' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", messages: fullMessages, tools: TOOLS,
      tool_choice: "auto", stream: true, temperature: 0.7, max_tokens: 1024,
    });

    let contentBuffer = '';
    const toolCallsMap = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        send('delta', { content: delta.content });
        contentBuffer += delta.content;
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap[idx]) toolCallsMap[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          if (tc.id) toolCallsMap[idx].id = tc.id;
          if (tc.function?.name) toolCallsMap[idx].function.name = tc.function.name;
          if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    const toolCalls = Object.values(toolCallsMap);
    if (toolCalls.length > 0) {
      const assistantMsg = { role: "assistant", tool_calls: toolCalls };
      if (contentBuffer) assistantMsg.content = contentBuffer;
      fullMessages.push(assistantMsg);

      for (const tc of toolCalls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        if (tc.function.name === 'show_products' && args.products) {
          const validProducts = args.products.filter(p => VALID_IDS.has(p.product_id));
          send('products', { products: validProducts });
          // Auto cross-sell: find complementary products
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) {
            send('complements', { products: complementIds });
          }
        }
        if (tc.function.name === 'show_services') {
          const serviceInfo = servicesData?.[args.service_type] || {};
          send('service', {
            service_type: args.service_type,
            store: args.store || 'Saint-Jérôme',
            details: args.details || '',
            info: serviceInfo
          });
        }
        if (tc.function.name === 'show_financing') {
          const plan = getFinancingPlan(args.total_amount);
          send('financing', { total_amount: args.total_amount, plan, months: args.months });
        }
        if (tc.function.name === 'show_estimation') {
          send('estimation', {
            project_type: args.project_type,
            project_details: args.project_details || {},
            estimated_range: args.estimated_range || '',
            store: args.store || 'Saint-Jérôme'
          });
        }
        if (tc.function.name === 'show_checkout') {
          send('checkout', {
            product_ids: args.product_ids || [],
            store: args.store || 'Saint-Jérôme',
            delivery_type: args.delivery_type || 'pickup',
            financing: args.financing || false,
            account_number: args.account_number || ''
          });
        }

        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(executeTool(tc)) });
      }

      // Pass 2: Follow-up stream
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: fullMessages, stream: true, temperature: 0.7, max_tokens: 1024,
      });
      for await (const chunk of followUp) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) send('delta', { content: c });
      }
    }

    send('done', {});
  } catch (err) {
    console.error('Chat error:', err);
    send('error', { message: err.message || 'Internal server error' });
  }

  res.end();
}

// ─── Checkout handler ──────────────────────────────────

async function handleCheckout(req, res) {
  const body = await readBody(req);
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'items array required' }));
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured. Create a .env file.' }));
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const title = String(item.title || 'Produit').slice(0, 200);
      const price = Number(item.price);
      const quantity = Math.min(Math.max(Math.round(Number(item.quantity)), 1), 999);
      const sku = String(item.sku || '').slice(0, 50);
      if (!price || price <= 0 || price > 100000) continue;

      subtotal += price * quantity;

      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: { name: title, ...(sku ? { description: `SKU: ${sku}` } : {}) },
          unit_amount: Math.round(price * 100),
        },
        quantity,
      });
    }

    if (lineItems.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid items' }));
      return;
    }

    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;

    lineItems.push({ price_data: { currency: 'cad', product_data: { name: 'TPS (5%)' }, unit_amount: Math.round(tps * 100) }, quantity: 1 });
    lineItems.push({ price_data: { currency: 'cad', product_data: { name: 'TVQ (9,975%)' }, unit_amount: Math.round(tvq * 100) }, quantity: 1 });

    const origin = `http://localhost:${PORT}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      locale: 'fr-CA',
      metadata: { source: 'materio-chatgpt-commerce-mvp' },
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error('Checkout error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ─── HTTP Server ───────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url === '/api/chat' && req.method === 'POST') {
      await handleChat(req, res);
    } else if (url === '/api/checkout' && req.method === 'POST') {
      await handleCheckout(req, res);
    } else if (url === '/api/catalog' && req.method === 'GET') {
      if (!catalogData) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Catalog not loaded. Run: node scraper/index.js' }));
      } else {
        const products = {};
        for (const p of catalogData.products) {
          products[p.pid] = {
            id: p.id,
            pid: p.pid,
            sku: p.pid,
            title: p.title,
            description: p.description?.slice(0, 300) || '',
            price: p.price.amount / 100,
            originalPrice: p.price.original_amount ? p.price.original_amount / 100 : null,
            currency: 'CAD',
            imageUrl: p.image_url,
            productUrl: p.url,
            category: p.category,
            brand: p.brand,
            availability: p.availability.quantity_by_store,
            shipping: p.shipping,
            pickupInStore: true,
            services: p.services || {},
          };
        }
        const payload = JSON.stringify({
          products,
          stores: storesData?.stores || [],
          services: servicesData || {},
          metadata: catalogData.metadata
        });
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        });
        res.end(payload);
      }
    } else if (url === '/api/services' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ services: servicesData || {}, stores: storesData?.stores || [] }));
    } else {
      await serveStatic(req, res);
    }
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Matério × ChatGPT Commerce — MVP                   ║
║  🌐 http://localhost:${PORT}                           ║
║                                                      ║
║  OpenAI  : ${process.env.OPENAI_API_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Stripe  : ${process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Catalog : ${catalogData ? `✅ ${catalogData.products.length} produits` : '❌ Manquant (node scraper/index.js)'}             ║
╚══════════════════════════════════════════════════════╝
`);
});
