// server.js — Local dev server (no Vercel CLI needed)
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

// ─── CATALOG LOADER ────────────────────────────────────

const CATALOG_PATH = join(__dirname, 'data', 'catalog-acp.json');
const TEMPLATES_PATH = join(__dirname, 'data', 'project-templates.json');
let catalogData = null;
let catalogProductMap = {};
let VALID_IDS = new Set();
let projectTemplates = null;
let SYSTEM_PROMPT = '';

function loadCatalog() {
  try {
    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  No catalog-acp.json found. Run: node scraper/index.js');
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

    // Group by level-2 subcategory, take top 5 per subcategory for diverse coverage
    const bySubcat = {};
    for (const p of inStock) {
      const parts = (p.category || '').split(' > ');
      const subcat = parts.slice(0, 2).join(' > ') || 'Autre';
      if (!bySubcat[subcat]) bySubcat[subcat] = [];
      bySubcat[subcat].push(p);
    }

    const byCategory = {};
    let totalSelected = 0;
    for (const [subcat, items] of Object.entries(bySubcat).sort()) {
      items.sort((a, b) => b.availability.total_stock - a.availability.total_stock);
      const topLevel = subcat.split(' > ')[0];
      if (!byCategory[topLevel]) byCategory[topLevel] = [];
      for (const p of items.slice(0, 3)) {
        const price = (p.price.amount / 100).toFixed(2);
        const origPrice = p.price.original_amount ? ` (rég. ${(p.price.original_amount / 100).toFixed(2)}$)` : '';
        const lavalStock = p.availability.quantity_by_store['Laval'] || 0;
        byCategory[topLevel].push(`- ${p.pid}: ${p.title} | ${price}$${origPrice} | Laval:${lavalStock} | ${p.brand}`);
        totalSelected++;
      }
    }

    let catalogText = '';
    for (const [cat, lines] of Object.entries(byCategory).sort()) {
      catalogText += `\n${cat.toUpperCase()}:\n${lines.join('\n')}\n`;
    }

    // Store info
    const storeLines = (catalogData.stores || [])
      .filter(s => ['Laval','Repentigny','Saint-Eustache','Brossard','Pointe-aux-Trembles','Pincourt'].includes(s.name))
      .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
      .join('\n');

    SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Patrick Morin, une chaîne de quincailleries au Québec fondée en 1960 avec 23 magasins. Tu aides les clients à trouver les bons produits pour leurs projets de rénovation et construction.

RÈGLES:
1. Toujours répondre en français québécois, ton chaleureux et professionnel
2. Recommander UNIQUEMENT les produits du catalogue (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Pour les entrepreneurs PM PRO, appliquer l'escompte de 10%
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. TOUJOURS appeler show_products quand tu recommandes des produits spécifiques
8. Appeler show_checkout SEULEMENT quand le client dit explicitement vouloir commander/acheter
9. Le catalogue contient ${catalogData.products.length} produits. Utilise search_catalog pour chercher des produits.

FLUX DE RECOMMANDATION PROJET:
Quand un client décrit un projet ou demande des matériaux:
1. IDENTIFIER le type → appeler analyze_project avec le type et les dimensions
2. analyze_project retourne bom_summary: la liste COMPLÈTE des matériaux avec quantités DÉJÀ CALCULÉES, pid réels, et descriptions des formules
3. Appeler show_products avec TOUS les produits retournés
4. PRÉSENTER le bom_summary retourné par analyze_project — UTILISER les quantités du bom_summary TELLES QUELLES:
   a) Matériaux principaux: nom, quantité du bom_summary, description de la formule, prix
   b) Quincaillerie et fixation: idem
   c) Accessoires et finition: idem
   d) 🔧 Outils recommandés: REPRODUIRE EXACTEMENT le format du bom_summary avec les badges d'importance:
      - 🔴 Essentiel = indispensable
      - 🟡 Très utile = fortement recommandé
      - 🟢 Recommandé = optionnel mais pratique
      Pour chaque outil, afficher: badge + nom + prix + explication en italique. NE PAS reformater cette section en tableau.
5. Si dimensions manquantes: poser 1-2 questions de raffinement APRÈS, pas avant.
6. TOTALISER le montant retourné par analyze_project
7. PROPOSER les services pertinents

⛔ RÈGLE CRITIQUE QUANTITÉS:
- Les quantités sont CALCULÉES par le serveur dans analyze_project. Ne JAMAIS recalculer toi-même.
- Ne JAMAIS inventer tes propres formules. Utilise uniquement quantity et quantity_formula du bom_summary.
- Les chiffres du bom_summary FONT AUTORITÉ. Ne les modifie pas, ne les arrondis pas autrement.
❌ INTERDIT: recalculer "périmètre ÷ 1.33 = X colombages" avec tes propres chiffres
✅ CORRECT: "**95 colombages** (périmètre ÷ 1.33 + cadrage)" — reprendre la quantité et la description du bom_summary

Pour les demandes de produits spécifiques (pas un projet): utiliser search_catalog puis show_products.

RÈGLE CRITIQUE: Ne JAMAIS répondre en texte seul quand le client parle d'un projet. TOUJOURS appeler analyze_project + show_products.

CATALOGUE PATRICK MORIN (${totalSelected} produits populaires sur ${catalogData.products.length} total):
${catalogText}
MAGASINS PRINCIPAUX:
${storeLines}
Heures: lun-ven 8h-21h, sam 8h-17h, dim 9h-17h

Dernière mise à jour du catalogue: ${catalogData.metadata?.scraped_at || 'inconnue'}`;

    console.log(`📦 Catalog loaded: ${catalogData.products.length} products, ${Object.keys(byCategory).length} categories`);

    // Load project templates
    if (existsSync(TEMPLATES_PATH)) {
      projectTemplates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
      console.log(`📋 Project templates loaded — ${Object.keys(projectTemplates.projects).length} types`);
    }
  } catch (err) {
    console.error('❌ Failed to load catalog:', err.message);
  }
}

// Load on startup
loadCatalog();

// Reload catalog every 5 minutes (picks up scraper updates)
setInterval(loadCatalog, 5 * 60 * 1000);

// ─── searchCatalogInternal (shared by analyzeProject + executeTool) ──

function searchCatalogInternal(query, category) {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = q.split(/\s+/).filter(w => w.length > 1 || /\d/.test(w));
  if (!words.length || !catalogData) return [];

  const catFilter = (category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let pool = catalogData.products;
  if (catFilter) {
    pool = pool.filter(p => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(catFilter));
  }

  const _txt = (p) => (p.title + ' ' + p.category + ' ' + (p.brand || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let results = pool.filter(p => _txt(p).includes(q)).slice(0, 10);
  if (results.length === 0) {
    results = pool.filter(p => words.every(w => _txt(p).includes(w))).slice(0, 10);
  }
  if (results.length === 0 && words.length > 1) {
    const scored = pool
      .map(p => ({ p, score: words.filter(w => _txt(p).includes(w)).length }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    results = scored.map(s => s.p);
  }

  return results.map(p => ({
    pid: p.pid,
    title: p.title,
    price: (p.price.amount / 100).toFixed(2) + '$',
    price_cents: p.price.amount,
    category: p.category,
    brand: p.brand || ''
  }));
}

// ─── analyzeProject (deterministic BOM generator) ──────

function analyzeProject(projectType, dimensions, details) {
  if (!projectTemplates || !catalogData) {
    return { error: 'Templates or catalog not loaded' };
  }

  const template = projectTemplates.projects[projectType];
  if (!template) {
    return { error: `Unknown project type: ${projectType}`, available_types: Object.keys(projectTemplates.projects) };
  }

  let surface = 0, length = 0, width = 0, linear = 0;
  const dimStr = (dimensions || details || '').toString();

  if (template.dimension_parser.type === 'lxw') {
    const lxwMatch = dimStr.match(/(\d+)\s*[x×X]\s*(\d+)/);
    if (lxwMatch) {
      length = parseInt(lxwMatch[1]);
      width = parseInt(lxwMatch[2]);
      surface = length * width;
    } else {
      surface = template.dimension_parser.fallback_surface || 100;
      length = Math.ceil(Math.sqrt(surface * 1.33));
      width = Math.ceil(surface / length);
    }
  } else if (template.dimension_parser.type === 'surface') {
    const surfMatch = dimStr.match(/(\d[\d\s,.]*)\s*(?:pi(?:eds?)?\s*(?:carr[eé]s?|²)|pi2|pc)/i);
    if (surfMatch) {
      surface = parseFloat(surfMatch[1].replace(/[\s,]/g, ''));
    } else {
      const numMatch = dimStr.match(/(\d+)/);
      surface = numMatch ? parseInt(numMatch[1]) : template.dimension_parser.fallback;
    }
    length = Math.ceil(Math.sqrt(surface));
    width = length;
  } else if (template.dimension_parser.type === 'linear') {
    const linMatch = dimStr.match(/(\d+)\s*(?:pi(?:eds?)?\s*(?:lin[eé]aires?)?|')/i);
    if (linMatch) {
      linear = parseInt(linMatch[1]);
    } else {
      const numMatch = dimStr.match(/(\d+)/);
      linear = numMatch ? parseInt(numMatch[1]) : template.dimension_parser.fallback;
    }
    surface = linear * 6;
    length = linear;
    width = 6;
  }

  const bom = { principal: [], quincaillerie: [], accessoire: [], outil: [] };
  let totalCents = 0;
  const allProductIds = [];

  for (const cat of template.categories) {
    const results = searchCatalogInternal(cat.search.query, cat.search.category);
    if (results.length === 0) continue;

    const bestMatch = results[0];

    let quantity = 1;
    try {
      const formula = cat.quantity_formula;
      if (formula.type === 'fixed') {
        quantity = formula.quantity;
      } else if (formula.calculate) {
        const fn = new Function('surface', 'length', 'width', 'linear', `return ${formula.calculate};`);
        quantity = Math.max(1, Math.round(fn(surface, length, width, linear)));
      }
    } catch (e) {
      quantity = 1;
    }

    const item = {
      product_id: bestMatch.pid,
      title: bestMatch.title,
      price: bestMatch.price,
      price_cents: bestMatch.price_cents,
      category_name: cat.name,
      quantity,
      quantity_formula: cat.quantity_formula.description,
      brand: bestMatch.brand,
      importance: cat.importance || 0,
      importance_label: cat.importance_label || '',
      explanation: cat.explanation || ''
    };

    totalCents += bestMatch.price_cents * quantity;
    allProductIds.push(bestMatch.pid);
    bom[cat.role].push(item);
  }

  const totalDollars = (totalCents / 100).toFixed(2);
  const tps = (totalCents * 0.05 / 100).toFixed(2);
  const tvq = (totalCents * 0.09975 / 100).toFixed(2);
  const grandTotal = (totalCents * 1.14975 / 100).toFixed(2);

  let bomText = `⚠️ DONNÉES CALCULÉES PAR LE SERVEUR — UTILISER CES QUANTITÉS EXACTES, NE PAS RECALCULER.\n\n`;
  bomText += `## ANALYSE DE PROJET: ${template.icon} ${template.name}\n`;
  bomText += `**Dimensions:** ${dimensions || 'estimées'}`;
  if (template.dimension_parser.type === 'lxw') bomText += ` (longueur=${length} pi, largeur=${width} pi)`;
  bomText += `\n`;
  if (surface) bomText += `**Surface calculée:** ${surface} pi²\n`;
  if (linear) bomText += `**Longueur linéaire:** ${linear} pieds\n`;
  bomText += '\n';

  const formatSection = (title, items) => {
    if (!items.length) return '';
    let text = `### ${title}\n`;
    for (const item of items) {
      text += `- **${item.category_name}**: ${item.title} — **${item.quantity}** × ${item.price} = ${(item.price_cents * item.quantity / 100).toFixed(2)}$ (${item.quantity_formula}) [pid: ${item.product_id}]\n`;
    }
    return text + '\n';
  };

  bomText += formatSection('Matériaux principaux', bom.principal);
  bomText += formatSection('Quincaillerie et fixation', bom.quincaillerie);
  bomText += formatSection('Accessoires et finition', bom.accessoire);
  if (bom.outil.length) {
    bomText += `### 🔧 Outils recommandés (par ordre d'importance)\n`;
    for (const item of bom.outil) {
      const badge = item.importance === 1 ? '🔴 Essentiel' : item.importance === 2 ? '🟡 Très utile' : '🟢 Recommandé';
      bomText += `- **${badge}** — ${item.category_name}: ${item.title} — ${item.price} [pid: ${item.product_id}]\n`;
      bomText += `  _${item.explanation}_\n`;
    }
    bomText += '\n';
  }

  bomText += `### Totaux\n`;
  bomText += `- Sous-total: **${totalDollars}$**\n`;
  bomText += `- TPS (5%): ${tps}$\n`;
  bomText += `- TVQ (9,975%): ${tvq}$\n`;
  bomText += `- **Total: ${grandTotal}$**\n`;

  bomText += `\n### Questions de raffinement\n`;
  for (const q of template.questions) {
    bomText += `- ${q}\n`;
  }
  bomText += `\n⚠️ RAPPEL: Présente les quantités ci-dessus TELLES QUELLES au client. Ne recalcule pas. Cite la description entre parenthèses pour expliquer chaque quantité.\n`;

  return {
    success: true,
    project_type: projectType,
    project_name: template.name,
    dimensions: { surface, length, width, linear },
    bom_summary: bomText,
    products: [...bom.principal, ...bom.quincaillerie, ...bom.accessoire].map(p => ({
      product_id: p.product_id,
      quantity: p.quantity
    })),
    tools: bom.outil.map(p => ({
      product_id: p.product_id,
      quantity: p.quantity
    })),
    all_product_ids: allProductIds,
    total_before_tax: totalDollars,
    total_with_tax: grandTotal,
    categories_found: bom.principal.length + bom.quincaillerie.length + bom.accessoire.length + bom.outil.length,
    categories_expected: template.categories.length,
    message: `Projet analysé: ${template.categories.length} catégories recherchées, ${bom.principal.length + bom.quincaillerie.length + bom.accessoire.length} produits trouvés. INSTRUCTIONS: 1) Appelle show_products avec les pid ci-dessus. 2) Présente le bom_summary au client en UTILISANT LES QUANTITÉS EXACTES retournées — ne recalcule RIEN toi-même. 3) Pour chaque matériau, cite la description de formule entre parenthèses du bom_summary.`
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description: "Display product cards to the customer. Call this EVERY TIME you recommend specific products.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Exact product ID from catalog" },
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
      name: "analyze_project",
      description: "Analyze a renovation/construction project and return a complete Bill of Materials (BOM) with all products and calculated quantities. Call this FIRST when a customer describes a project (toiture, terrasse, sous-sol, salle de bain, cabanon, garage, clôture, peinture). Returns products with quantities — then call show_products with the returned products.",
      parameters: {
        type: "object",
        properties: {
          project_type: {
            type: "string",
            enum: ["toiture", "terrasse", "sous_sol", "salle_de_bain", "cabanon", "garage", "cloture", "peinture"],
            description: "Type of project"
          },
          dimensions: {
            type: "string",
            description: "Dimensions from the customer (e.g. '1200 pi²', '12x16 pieds', '60 pieds linéaires')"
          },
          details: {
            type: "string",
            description: "Additional project details from the customer"
          }
        },
        required: ["project_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Search the full Patrick Morin catalog. ALWAYS use this to find products before recommending them. Returns up to 10 matching products with pid, title, price, category.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords in French" },
          category: { type: "string", description: "Optional category filter to narrow results" }
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
          is_pro: { type: "boolean" },
          store: { type: "string" },
          delivery_method: { type: "string", enum: ["pickup", "delivery"] }
        },
        required: ["is_pro"]
      }
    }
  }
];

function executeTool(tc) {
  const name = tc.function.name;
  let args;
  try { args = JSON.parse(tc.function.arguments); } catch { return { error: "Invalid args" }; }
  if (name === "show_products") {
    const valid = (args.products || []).filter(p => VALID_IDS.has(p.product_id));
    return { success: true, products_displayed: valid.length };
  }
  if (name === "show_checkout") return { success: true, checkout_ready: true };
  if (name === "analyze_project") {
    return analyzeProject(args.project_type, args.dimensions, args.details);
  }
  if (name === "search_catalog") {
    const results = searchCatalogInternal(args.query, args.category);
    return {
      results: results.map(p => ({ pid: p.pid, title: p.title, price: p.price, category: p.category, brand: p.brand })),
      total_found: results.length,
      next_step: results.length > 0
        ? `${results.length} produit(s) trouvé(s). Appelle show_products avec les pid ci-dessus.`
        : 'Aucun résultat. Essaie avec des mots-clés différents.'
    };
  }
  return { error: `Unknown tool: ${name}` };
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
  const trimmedMessages = messages.slice(-20);
  const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages];

  // Detect if last user message is about products/projects
  const lastUserMsg = trimmedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const needsSearch = /toiture|terrasse|patio|sous-sol|salle de bain|garage|cabanon|clôture|cloture|peintur|plancher|fenêtre|porte|bardeau|bois traité|gypse|isol|plomberie|rénovation|construction|projet|je veux|je dois|refaire|construire|installer|remplacer|changer|poser|comptoir|évier|robinet|escalier|rampe|revêtement|avez-vous|cherche|besoin|matériaux|matériel|produit|combien|coût/i.test(lastUserMsg);
  const isProjectQuery = /toiture|terrasse|patio|sous-sol|sous sol|salle de bain|garage|cabanon|remise|clôture|cloture|peintur|refaire|construire|rénover|finir|bâtir|projet/i.test(lastUserMsg);
  console.log(`📩 User msg: "${lastUserMsg.slice(0, 80)}..." | isProjectQuery=${isProjectQuery} | needsSearch=${needsSearch}`);

  try {
    const MAX_ROUNDS = 8;
    let productsShown = false;
    let hasSearchResults = false;
    let searchRounds = 0;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const isFirstRound = round === 0;
      let toolChoice;
      if (isFirstRound && isProjectQuery) {
        toolChoice = { type: "function", function: { name: "analyze_project" } };
      } else if (isFirstRound && needsSearch) {
        toolChoice = { type: "function", function: { name: "search_catalog" } };
      } else if (hasSearchResults && !productsShown && searchRounds >= 4) {
        toolChoice = { type: "function", function: { name: "show_products" } };
      } else {
        toolChoice = "auto";
      }
      const tcLabel = typeof toolChoice === 'string' ? toolChoice : `forced:${toolChoice.function.name}`;
      console.log(`🔄 Round ${round + 1}/${MAX_ROUNDS} — tool_choice: ${tcLabel}`);

      const stream = await openai.chat.completions.create({
        model: "gpt-4o", messages: fullMessages, tools: TOOLS,
        tool_choice: toolChoice,
        stream: true, temperature: 0.4, max_tokens: 2048,
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
      console.log(`🔧 Round ${round + 1}: ${toolCalls.length} tool call(s)`, toolCalls.map(t => t.function.name).join(', '));

      if (toolCalls.length === 0) break;

      const assistantMsg = { role: "assistant", tool_calls: toolCalls };
      if (contentBuffer) assistantMsg.content = contentBuffer;
      fullMessages.push(assistantMsg);

      for (const tc of toolCalls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        if (tc.function.name === 'show_products' && args.products) {
          const validProducts = args.products.filter(p => VALID_IDS.has(p.product_id));
          send('products', { products: validProducts });
          productsShown = true;
        }
        if (tc.function.name === 'show_checkout') {
          send('checkout', { is_pro: args.is_pro || false, store: args.store || 'Laval', delivery_method: args.delivery_method || 'pickup' });
          productsShown = true;
        }
        if (tc.function.name === 'analyze_project') {
          const projectResult = analyzeProject(args.project_type, args.dimensions, args.details);
          if (projectResult.success) {
            if (projectResult.products?.length) {
              const validProducts = projectResult.products.filter(p => VALID_IDS.has(p.product_id));
              send('products', { products: validProducts });
            }
            if (projectResult.tools?.length) {
              const validTools = projectResult.tools.filter(p => VALID_IDS.has(p.product_id));
              send('tools', { products: validTools });
            }
            hasSearchResults = true;
            productsShown = true;
          }
        }
        if (tc.function.name === 'search_catalog') {
          searchRounds++;
          const searchResult = searchCatalogInternal(args.query, args.category);
          if (searchResult.length > 0) hasSearchResults = true;
        }

        const result = executeTool(tc);
        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      if (productsShown) {
        const finalStream = await openai.chat.completions.create({
          model: "gpt-4o", messages: fullMessages, stream: true, temperature: 0.4, max_tokens: 2048,
        });
        for await (const chunk of finalStream) {
          const c = chunk.choices[0]?.delta?.content;
          if (c) send('delta', { content: c });
        }
        break;
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
  const { items, isPro } = body;

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

      let unitPrice = price;
      if (isPro) unitPrice = Math.round(unitPrice * 90) / 100;
      subtotal += unitPrice * quantity;

      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: { name: title, ...(sku ? { description: `SKU: ${sku}` } : {}) },
          unit_amount: Math.round(unitPrice * 100),
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
      metadata: { source: 'patrick-morin-chatgpt-commerce-mvp', is_pro: isPro ? 'true' : 'false' },
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
      // Serve catalog data to frontend
      if (!catalogData) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Catalog not loaded. Run: node scraper/index.js' }));
      } else {
        // Send only what the frontend needs (product map keyed by pid)
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
            shipping: p.shipping.colis_available,
            pickupInStore: true,
            banner: p.banner,
          };
        }
        const payload = JSON.stringify({ products, stores: catalogData.stores, metadata: catalogData.metadata });
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        });
        res.end(payload);
      }
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
║  Patrick Morin × ChatGPT Commerce — MVP             ║
║  🌐 http://localhost:${PORT}                           ║
║                                                      ║
║  OpenAI  : ${process.env.OPENAI_API_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Stripe  : ${process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Catalog : ${catalogData ? `✅ ${catalogData.products.length} produits` : '❌ Manquant (node scraper/index.js)'}             ║
╚══════════════════════════════════════════════════════╝
`);
});
