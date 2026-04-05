import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════
// Patrick Morin — Chat API (OpenAI GPT-4o + Function Calling)
// 4 tools: show_products, search_catalog, analyze_project, show_checkout
// ═══════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'catalog-acp.json');
const TEMPLATES_PATH = join(__dirname, '..', 'data', 'project-templates.json');

let SYSTEM_PROMPT = '';
let VALID_IDS = new Set();
let catalogData = null;
let projectTemplates = null;

function loadCatalog() {
  try {
    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  api/chat.js: No catalog-acp.json found');
      return;
    }
    catalogData = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
    VALID_IDS = new Set(catalogData.products.map(p => p.pid));

    if (existsSync(TEMPLATES_PATH)) {
      projectTemplates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
      console.log(`📋 api/chat.js: Project templates loaded — ${Object.keys(projectTemplates.projects).length} types`);
    }

    // Top products balanced across subcategories (top 5 per level-2 subcategory)
    const inStock = catalogData.products
      .filter(p => p.availability.in_stock && p.price.amount > 0);

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

    const storeLines = (catalogData.stores || [])
      .filter(s => ['Laval','Repentigny','Saint-Eustache','Brossard','Pointe-aux-Trembles','Pincourt'].includes(s.name))
      .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
      .join('\n');

    SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Patrick Morin, une chaîne de quincailleries au Québec fondée en 1960 avec 23 magasins. Tu aides les clients à trouver les bons produits pour leurs projets de rénovation et construction.

RÈGLES:
1. Toujours répondre en français québécois, ton chaleureux et professionnel
2. Recommander UNIQUEMENT les produits du catalogue (utiliser les product_id exacts = le pid)
3. Utiliser les quantités calculées par analyze_project quand le client décrit un projet (ne JAMAIS recalculer toi-même)
4. Mentionner les prix et la disponibilité en magasin
5. Pour les entrepreneurs PM PRO, appliquer l'escompte de 10%
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. *** RÈGLE CRITIQUE — OUTILS OBLIGATOIRES ***
   Quand un client décrit un PROJET (toiture, terrasse, sous-sol, salle de bain, cabanon, garage, clôture, peinture):
   → Appeler analyze_project EN PREMIER pour obtenir la liste complète de matériaux avec quantités
   → Puis appeler show_products avec les produits retournés par analyze_project
   Quand un client demande un produit spécifique:
   → Appeler search_catalog pour trouver le produit dans le catalogue complet
   → Puis appeler show_products avec les pid trouvés
   Ne JAMAIS recommander un produit en texte sans avoir appelé show_products.
8. Appeler show_checkout SEULEMENT quand le client dit explicitement vouloir commander/acheter
9. Le catalogue complet contient ${catalogData.products.length} produits. Utilise search_catalog pour chercher des produits.
10. VENTE COMPLÉMENTAIRE: Quand un client demande un produit, TOUJOURS proposer les produits complémentaires nécessaires:
  - Bardeaux → papier feutre, clous à toiture, solin, évent de toit, sous-couche
  - Peinture → rouleau, pinceau, ruban de peintre, bâche, apprêt
  - Bois de charpente → vis, clous, équerres, ancrages, quincaillerie de fixation
  - Revêtement de plancher → sous-couche, moulures de transition, adhésif
  - Gypse → vis à gypse, ruban à joints, composé à joints, couteau à enduire
  - Isolation → pare-vapeur, ruban d'étanchéité, agrafe
  - Plomberie (bain, toilette) → robinetterie, raccords, silicone, drain
  - Céramique/carrelage → mortier-colle, coulis, croisillons, truelle dentelée
  Présente le produit demandé EN PREMIER, puis une section "Pour compléter votre projet" avec les compléments.

PROJETS TYPES (catégories de matériaux à couvrir selon le projet):

🏠 TOITURE (bardeaux):
  Structure: contreplaqué/OSB, papier feutre 15lb ou sous-couche synthétique
  Couverture: bardeaux (calculer par carré = 100pi²), faîtière
  Ventilation: évents de toit, soffites ventilés
  Étanchéité: membrane autocollante (débords, vallées), solin aluminium, scellant toiture
  Fixation: clous à toiture galvanisés (1¼"), clous solin
  Questions à poser: superficie toit? pente? nombre de couches existantes? cheminée/évent?

🪵 TERRASSE / PATIO:
  Structure: madriers traités 2×8 ou 2×10, poteaux 6×6, solives
  Surface: platelage 5/4×6 ou composite
  Fixation: vis inox ou enduites #8×3", ancrages de poteaux, équerres de solive, boulons tire-fond
  Finition: teinture/scellant extérieur, solin contre la maison
  Escalier: limons, marches, garde-corps si >30" du sol
  Questions à poser: dimensions? hauteur du sol? accès requis? garde-corps? escalier?

🧱 SOUS-SOL / FINITION:
  Ossature: colombages 2×4 ou 2×3, fourrures 1×3
  Isolation: panneaux polystyrène ou laine R-12 minimum
  Pare-vapeur: polyéthylène 6 mil, ruban d'étanchéité
  Revêtement: gypse ½", vis à gypse, ruban-composé-couteau
  Plancher: sous-couche DRIcore ou membrane Delta, plancher flottant
  Électrique: boîtes électriques, fils, disjoncteurs (rappeler permis requis)
  Questions à poser: dimensions? hauteur libre? humidité? fenêtres existantes?

🚿 SALLE DE BAIN:
  Plomberie: robinetterie, drain, raccords PEX, silicone
  Murs: panneau ciment (Durock), vis ciment, membrane d'étanchéité
  Plancher: membrane Ditra/Kerdi, mortier-colle, céramique, coulis
  Ventilateur: ventilateur-extracteur (CFM selon superficie), conduit, clapet
  Questions à poser: douche ou bain? dimensions pièce? ventilation existante?

🏗️ CABANON / REMISE:
  Fondation: blocs de béton ou pieux vissés
  Structure: colombages 2×4, sablière, lisse
  Revêtement extérieur: contreplaqué + papier + vinyle/canexel
  Toiture: fermes ou chevrons, contreplaqué, membrane, bardeaux
  Porte: porte de cabanon ou porte de garage
  Quincaillerie: équerres, ancrages, vis, clous
  Questions à poser: dimensions? permis municipal? fondation souhaitée?

🪜 CLÔTURE:
  Poteaux: 4×4 traité ou 6×6 traité, ancrages de poteaux
  Structure: traverses 2×4 traité
  Revêtement: planches 1×6 ou 5/4×6 traité, lattis
  Fixation: vis extérieur inox, boulons tire-fond
  Finition: teinture extérieur
  Questions à poser: longueur linéaire? hauteur? style (fermée, ajourée)? portail?

🎨 PEINTURE INTÉRIEURE:
  Peinture: latex acrylique (calculer par gallon = 350-400 pi²)
  Apprêt: apprêt/primer si surface neuve ou changement de couleur foncé
  Outils: rouleaux (10" + mini 4"), manchon, pinceaux (2" + angulaire), bac, rallonge
  Protection: ruban de peintre, bâche/toile plastique
  Préparation: bouche-pores, papier sablé, éponge
  Questions à poser: nombre de pièces? superficie murs? type de surface? couleur actuelle?

FLUX DE RECOMMANDATION PROJET:
Quand un client décrit un projet (pas une demande de produit spécifique):
1. IDENTIFIER le type de projet → appeler analyze_project avec le type et les dimensions
2. analyze_project retourne bom_summary: la liste COMPLÈTE des matériaux avec quantités DÉJÀ CALCULÉES, pid réels, et descriptions des formules
3. Appeler show_products avec TOUS les produits retournés
4. PRÉSENTER le bom_summary au client — UTILISER les quantités TELLES QUELLES:
   a) Matériaux principaux: nom, quantité du bom_summary, description de la formule entre parenthèses, prix
   b) Quincaillerie et fixation
   c) Accessoires et finition
   d) 🔧 Outils recommandés: REPRODUIRE EXACTEMENT le format du bom_summary avec les badges d'importance:
      - 🔴 Essentiel = indispensable
      - 🟡 Très utile = fortement recommandé
      - 🟢 Recommandé = optionnel mais pratique
      Pour chaque outil, afficher: badge + nom + prix + explication en italique. NE PAS reformater cette section en tableau.
5. Si dimensions manquantes: poser 1-2 questions de raffinement APRÈS avoir montré les produits
6. TOTALISER avec taxes (TPS + TVQ)
7. Mentionner le programme PM PRO si le client est entrepreneur

⛔ RÈGLE CRITIQUE QUANTITÉS:
- Les quantités sont CALCULÉES par le serveur dans analyze_project. Ne JAMAIS recalculer toi-même.
- Ne JAMAIS inventer tes propres formules. Utilise uniquement quantity et quantity_formula du bom_summary.
- Si tu veux expliquer un calcul, cite UNIQUEMENT la description de la formule retournée dans le bom_summary.
❌ INTERDIT: recalculer avec tes propres chiffres
✅ CORRECT: reprendre la quantité et la description du bom_summary tel quel

CATALOGUE PATRICK MORIN (${totalSelected} produits échantillon sur ${catalogData.products.length} total):
${catalogText}
MAGASINS PRINCIPAUX:
${storeLines}
Heures: lun-ven 8h-21h, sam 8h-17h, dim 9h-17h

Dernière mise à jour du catalogue: ${catalogData.metadata?.scraped_at || 'inconnue'}`;

    console.log(`📦 api/chat.js: Catalog loaded — ${catalogData.products.length} products, ${VALID_IDS.size} IDs`);
  } catch (err) {
    console.error('❌ api/chat.js: Failed to load catalog:', err.message);
  }
}

// Load on module init
loadCatalog();

// ─── Internal catalog search (reusable for analyze_project + search_catalog tool) ───

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

  // Tier 1: Phrase match
  let results = pool.filter(p => _txt(p).includes(q)).slice(0, 10);
  // Tier 2: AND matching
  if (results.length === 0) {
    results = pool.filter(p => words.every(w => _txt(p).includes(w))).slice(0, 10);
  }
  // Tier 3: OR matching, scored by word hits
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

// ─── Server-side project analyzer (deterministic BOM generation) ───

function analyzeProject(projectType, dimensions, details) {
  if (!projectTemplates || !catalogData) {
    return { error: 'Templates or catalog not loaded' };
  }

  const template = projectTemplates.projects[projectType];
  if (!template) {
    return { error: `Unknown project type: ${projectType}`, available_types: Object.keys(projectTemplates.projects) };
  }

  // ── Parse dimensions ──
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

  // ── Search catalog for each category and compute quantities ──
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
    message: `Projet analysé: ${template.categories.length} catégories recherchées, ${bom.principal.length + bom.quincaillerie.length + bom.accessoire.length + bom.outil.length} produits trouvés. INSTRUCTIONS: 1) Appelle show_products avec les pid ci-dessus. 2) Présente le bom_summary au client en UTILISANT LES QUANTITÉS EXACTES retournées — ne recalcule RIEN toi-même. 3) Pour chaque matériau, cite la description de formule entre parenthèses du bom_summary.`
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description: "Display product cards to the customer. Call this EVERY TIME you recommend specific products from the Patrick Morin catalog.",
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
      name: "search_catalog",
      description: `Search the full Patrick Morin catalog (${catalogData?.products?.length || 10200} products). Use this to find specific products. Returns up to 10 matching products with pid, title, price, category. You can call this multiple times with different keywords.`,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords in French (e.g. 'bardeau asphalte', 'vis terrasse')" },
          category: { type: "string", description: "Optional category filter to narrow results. Matches against the product category path." }
        },
        required: ["query"]
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
          dimensions: { type: "string", description: "Dimensions from the customer (e.g. '1200 pi²', '12x16 pieds', '60 pieds linéaires')" },
          details: { type: "string", description: "Additional project details from the customer" }
        },
        required: ["project_type"]
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
          is_pro: { type: "boolean", description: "Whether the customer is a PM PRO member (10% discount)" },
          store: { type: "string", description: "Preferred store name for pickup" },
          delivery_method: { type: "string", enum: ["pickup", "delivery"], description: "Pickup in store or delivery to job site" }
        },
        required: ["is_pro"]
      }
    }
  }
];

function executeTool(toolCall) {
  const name = toolCall.function.name;
  let args;
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    return { error: "Invalid arguments" };
  }

  switch (name) {
    case "show_products": {
      const valid = (args.products || []).filter((p) => VALID_IDS.has(p.product_id));
      return {
        success: true,
        products_displayed: valid.length,
        message: `${valid.length} produit(s) affichés au client.`,
      };
    }
    case "search_catalog": {
      const results = searchCatalogInternal(args.query, args.category);
      return {
        results,
        total_found: results.length,
        next_step: results.length > 0
          ? `${results.length} produit(s) trouvé(s). Tu DOIS appeler show_products avec les pid ci-dessus et les quantités calculées. Ne réponds PAS en texte seul.`
          : 'Aucun résultat. Essaie avec des mots-clés plus courts ou différents (ex: un seul mot principal).'
      };
    }
    case "analyze_project": {
      return analyzeProject(args.project_type, args.dimensions, args.details);
    }
    case "show_checkout":
      return { success: true, checkout_ready: true };
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

  // Limit conversation length to prevent abuse
  const trimmedMessages = messages.slice(-20);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const openai = new OpenAI({ apiKey });

  // Detect if last user message is about a project (needs analyze_project)
  const lastUserMsg = trimmedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const isProjectQuery = /toiture|terrasse|patio|sous-sol|sous sol|salle de bain|garage|cabanon|remise|clôture|cloture|peintur|refaire|construire|rénover|finir|bâtir|projet/i.test(lastUserMsg);
  const needsSearch = isProjectQuery || /bardeau|bois traité|gypse|isol|plomberie|fenêtre|porte|plancher|rénovation|construction|je veux|je dois|installer|remplacer|changer|poser|avez-vous|cherche|besoin|matériaux|produit/i.test(lastUserMsg);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmedMessages,
    ];

    // Iterative tool-calling loop (max 6 rounds)
    const MAX_ROUNDS = 6;
    let productsShown = false;
    let hasSearchResults = false;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const isFirstRound = round === 0;
      let toolChoice;
      if (isFirstRound && isProjectQuery) {
        toolChoice = { type: "function", function: { name: "analyze_project" } };
      } else if (isFirstRound && needsSearch) {
        toolChoice = { type: "function", function: { name: "search_catalog" } };
      } else {
        toolChoice = "auto";
      }

      const tcLabel = typeof toolChoice === 'string' ? toolChoice : `forced:${toolChoice.function.name}`;
      console.log(`🔄 Round ${round + 1}/${MAX_ROUNDS} — tool_choice: ${tcLabel}`);

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: fullMessages,
        tools: TOOLS,
        tool_choice: toolChoice,
        stream: true,
        temperature: 0.4,
        max_tokens: 2048,
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
      console.log(`🔧 Round ${round + 1}: ${toolCalls.length} tool call(s)`, toolCalls.map(t => t.function.name).join(', '));

      // No tool calls = final response, exit loop
      if (toolCalls.length === 0) break;

      const assistantMsg = { role: "assistant", tool_calls: toolCalls };
      if (contentBuffer) assistantMsg.content = contentBuffer;
      fullMessages.push(assistantMsg);

      for (const tc of toolCalls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        if (tc.function.name === "show_products" && args.products) {
          const validProducts = args.products.filter(p => VALID_IDS.has(p.product_id));
          send("products", { products: validProducts });
          productsShown = true;
        }

        if (tc.function.name === "show_checkout") {
          send("checkout", {
            is_pro: args.is_pro || false,
            store: args.store || "Laval",
            delivery_method: args.delivery_method || "pickup",
          });
          productsShown = true;
        }

        if (tc.function.name === "analyze_project") {
          const projectResult = analyzeProject(args.project_type, args.dimensions, args.details);
          if (projectResult.success) {
            if (projectResult.products?.length) {
              const validProducts = projectResult.products.filter(p => VALID_IDS.has(p.product_id));
              send("products", { products: validProducts });
            }
            if (projectResult.tools?.length) {
              const validTools = projectResult.tools.filter(p => VALID_IDS.has(p.product_id));
              send("tools", { products: validTools });
            }
            hasSearchResults = true;
            productsShown = true;
          }
        }

        const result = executeTool(tc);
        if (tc.function.name === 'search_catalog' && result.results?.length > 0) {
          hasSearchResults = true;
        }

        fullMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // If products/checkout were shown, do one final text-only call and stop
      if (productsShown) {
        const finalStream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: fullMessages,
          stream: true,
          temperature: 0.4,
          max_tokens: 2048,
        });
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) send("delta", { content });
        }
        break;
      }
    }

    send("done", {});
  } catch (error) {
    console.error("Chat API error:", error);
    send("error", {
      message: error.message || "Erreur interne du serveur",
    });
  }

  res.end();
}
