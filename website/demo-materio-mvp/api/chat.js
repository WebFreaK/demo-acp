import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════
// Matério — Chat API (OpenAI GPT-4o + Function Calling)
// 5 tools: show_products, show_services, show_financing,
//          show_estimation, show_checkout
// ═══════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'catalog-materio.json');
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');
const STORES_PATH = join(__dirname, '..', 'data', 'stores.json');

let SYSTEM_PROMPT = '';
let VALID_IDS = new Set();
let servicesData = null;
let storesData = null;
let catalogData = null;

function loadCatalog() {
  try {
    // Load services and stores
    if (existsSync(SERVICES_PATH)) {
      servicesData = JSON.parse(readFileSync(SERVICES_PATH, 'utf-8'));
    }
    if (existsSync(STORES_PATH)) {
      storesData = JSON.parse(readFileSync(STORES_PATH, 'utf-8'));
    }

    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  api/chat.js: No catalog-materio.json found');
      return;
    }
    catalogData = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
    VALID_IDS = new Set(catalogData.products.map(p => p.pid));

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

    const storeLines = (storesData?.stores || [])
      .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
      .join('\n');

    // Services text
    let servicesText = '';
    if (servicesData) {
      servicesText = '\nSERVICES MATÉRIO:\n';
      if (servicesData.centre_de_coupe) {
        servicesText += `🔧 CENTRE DE COUPE: Magasins: ${servicesData.centre_de_coupe.available_stores.join(', ')}. Capacités: ${servicesData.centre_de_coupe.capabilities.join('; ')}\n`;
      }
      if (servicesData.livraison_specialisee) {
        servicesText += `🚚 LIVRAISON SPÉCIALISÉE: 35 véhicules (${servicesData.livraison_specialisee.vehicles.join(', ')}). ${servicesData.livraison_specialisee.capabilities.join('; ')}. ${servicesData.livraison_specialisee.schedule}\n`;
      }
      if (servicesData.estimation) {
        servicesText += `📋 ESTIMATION: Magasins: ${servicesData.estimation.available_stores.join(', ')}\n`;
      }
      if (servicesData.programme_fidelite) {
        servicesText += `💳 CARTE MATÉRIO: Gratuit. ${servicesData.programme_fidelite.earn_rate}. ${servicesData.programme_fidelite.redeem}.\n`;
      }
    }

    // Financing text
    let financingText = '';
    if (servicesData?.financement) {
      financingText = '\n💰 FINANCEMENT SANS INTÉRÊTS:\n';
      for (const plan of servicesData.financement.plans) {
        financingText += `- ${plan.min}$ à ${plan.max}$: ${plan.months} mois sans intérêts\n`;
      }
      financingText += `Conditions: ${servicesData.financement.conditions}\n`;
    }

    SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Matério, une chaîne de centres de rénovation dans les Laurentides au Québec fondée en 1979. Matério compte 6 magasins et fait partie du groupe d'achat ILDC (4 milliards $ de pouvoir d'achat). Tu aides les clients à trouver les bons produits et services pour leurs projets de rénovation et construction.

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
14. Le catalogue complet contient ${catalogData.products.length} produits. Tu as un échantillon de ${totalSelected} ci-dessous. Utilise search_catalog pour chercher des produits spécifiques absents de l'échantillon.
15. Quand un client demande un type de produit, cherche d'abord dans l'échantillon. Si tu ne trouves pas assez de résultats, appelle search_catalog avec des mots-clés pertinents, puis appelle show_products avec les pid trouvés.
16. Tous les ${catalogData.products.length} produits sont disponibles en magasin. Ne dis JAMAIS qu'un produit n'est pas disponible.
17. VENTE COMPLÉMENTAIRE: Quand un client demande un produit, TOUJOURS proposer les produits complémentaires nécessaires pour compléter le travail. Utilise search_catalog pour trouver les accessoires et matériaux associés. Exemples:
  - Bardeaux → papier feutre, clous à toiture, solin, évent de toit, sous-couche
  - Peinture → rouleau, pinceau, ruban de peintre, bâche, apprêt
  - Bois de charpente → vis, clous, équerres, ancrages, quincaillerie de fixation
  - Revêtement de plancher → sous-couche, moulures de transition, adhésif
  - Gypse → vis à gypse, ruban à joints, composé à joints, couteau à enduire
  - Isolation → pare-vapeur, ruban d'étanchéité, agrafe
  - Plomberie (bain, toilette) → robinetterie, raccords, silicone, drain
  Présente le produit demandé EN PREMIER, puis une section "Pour compléter votre projet" avec les compléments.

CATALOGUE MATÉRIO (${totalSelected} produits échantillon sur ${catalogData.products.length} total):
${catalogText}
MAGASINS MATÉRIO (6 succursales dans les Laurentides):
${storeLines}
Heures: ${storesData?.hours_default || 'lun-ven 7h30-21h, sam 8h-17h, dim 9h-17h'}
${servicesText}
${financingText}
Dernière mise à jour du catalogue: ${catalogData.metadata?.scraped_at || 'inconnue'}`;

    console.log(`📦 api/chat.js: Catalog loaded — ${catalogData.products.length} products, ${VALID_IDS.size} IDs`);
  } catch (err) {
    console.error('❌ api/chat.js: Failed to load catalog:', err.message);
  }
}

loadCatalog();

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
            description: "Products to display with quantities",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Exact product pid from the catalog" },
                quantity: { type: "integer", description: "Recommended quantity", minimum: 1 }
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
      description: "Display a service card (centre de coupe, livraison spécialisée, estimation). Call this when you recommend a Matério service.",
      parameters: {
        type: "object",
        properties: {
          service_type: { type: "string", enum: ["centre_de_coupe", "livraison_specialisee", "estimation", "ouverture_compte"], description: "The service to display" },
          store: { type: "string", description: "Store name where the service is available" },
          details: { type: "string", description: "Additional details about the service recommendation" }
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
          total_amount: { type: "number", description: "Total cart amount before taxes" },
          months: { type: "integer", description: "Number of months for the financing plan" }
        },
        required: ["total_amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_estimation",
      description: "Show estimation request form for complex projects. Call when the customer describes a large project needing a professional quote.",
      parameters: {
        type: "object",
        properties: {
          project_type: { type: "string", description: "Type of project (rénovation, construction neuve, agrandissement)" },
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
          store: { type: "string", description: "Preferred store for estimation" },
          estimated_range: { type: "string", description: "AI estimated cost range (e.g., 7 100 $ – 10 500 $)" }
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
      description: "Show the checkout/order panel. ONLY call this when the customer explicitly says they want to buy, order, or reserve products.",
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
          financing: { type: "boolean", description: "Whether customer chose financing" },
          account_number: { type: "string", description: "B2B account number if applicable" }
        },
        required: ["product_ids"]
      }
    }
  }
];

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
  const productMap = {};
  for (const p of catalogData.products) productMap[p.pid] = p;

  const texts = productIds
    .map(pid => productMap[pid])
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

function executeTool(toolCall) {
  const name = toolCall.function.name;
  let args;
  try { args = JSON.parse(toolCall.function.arguments); } catch { return { error: "Invalid arguments" }; }

  switch (name) {
    case "show_products": {
      const valid = (args.products || []).filter(p => VALID_IDS.has(p.product_id));
      const complements = findComplements(valid.map(p => p.product_id));
      const productMap = {};
      for (const p of catalogData.products) productMap[p.pid] = p;
      const complementNames = complements.map(c => productMap[c.product_id]?.title).filter(Boolean);
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
    case "show_services": {
      const storeReq = args.store;
      const storeObj = storeReq && storesData?.stores?.find(s => s.name === storeReq);
      const available = !storeObj || storeObj.services?.includes(args.service_type === 'livraison_specialisee' ? 'livraison' : args.service_type);
      return { success: true, service_displayed: args.service_type, store_available: available };
    }
    case "show_financing": {
      const plan = getFinancingPlan(args.total_amount || 0);
      return { success: true, financing: plan };
    }
    case "show_estimation":
      return { success: true, estimation_requested: true, project_type: args.project_type, store: args.store };
    case "search_catalog": {
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
    case "show_checkout":
      return { success: true, checkout_ready: true, products: args.product_ids?.length || 0 };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Vercel Serverless Handler ───────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const trimmedMessages = messages.slice(-20);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const openai = new OpenAI({ apiKey });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", messages: fullMessages, tools: TOOLS,
      tool_choice: "auto", stream: true, temperature: 0.7, max_tokens: 1024,
    });

    let contentBuffer = "";
    const toolCallsMap = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        send("delta", { content: delta.content });
        contentBuffer += delta.content;
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap[idx]) {
            toolCallsMap[idx] = { id: "", type: "function", function: { name: "", arguments: "" } };
          }
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

        if (tc.function.name === "show_products" && args.products) {
          const validProducts = args.products.filter(p => VALID_IDS.has(p.product_id));
          send("products", { products: validProducts });
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) {
            send("complements", { products: complementIds });
          }
        }
        if (tc.function.name === "show_services") {
          const serviceInfo = servicesData?.[args.service_type] || {};
          send("service", { service_type: args.service_type, store: args.store || "Saint-Jérôme", details: args.details || "", info: serviceInfo });
        }
        if (tc.function.name === "show_financing") {
          const plan = getFinancingPlan(args.total_amount);
          send("financing", { total_amount: args.total_amount, plan, months: args.months });
        }
        if (tc.function.name === "show_estimation") {
          send("estimation", { project_type: args.project_type, project_details: args.project_details || {}, estimated_range: args.estimated_range || "", store: args.store || "Saint-Jérôme" });
        }
        if (tc.function.name === "show_checkout") {
          send("checkout", { product_ids: args.product_ids || [], store: args.store || "Saint-Jérôme", delivery_type: args.delivery_type || "pickup", financing: args.financing || false, account_number: args.account_number || "" });
        }

        const result = executeTool(tc);
        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      const followUp = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: fullMessages, stream: true, temperature: 0.7, max_tokens: 1024,
      });

      for await (const chunk of followUp) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) send("delta", { content });
      }
    }

    send("done", {});
  } catch (error) {
    console.error("Chat API error:", error);
    send("error", { message: error.message || "Erreur interne du serveur" });
  }

  res.end();
}
