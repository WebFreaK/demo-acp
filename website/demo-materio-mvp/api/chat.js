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
const TEMPLATES_PATH = join(__dirname, '..', 'data', 'project-templates.json');

let SYSTEM_PROMPT = '';
let VALID_IDS = new Set();
let servicesData = null;
let storesData = null;
let catalogData = null;
let projectTemplates = null;

function loadCatalog() {
  try {
    // Load services and stores
    if (existsSync(SERVICES_PATH)) {
      servicesData = JSON.parse(readFileSync(SERVICES_PATH, 'utf-8'));
    }
    if (existsSync(STORES_PATH)) {
      storesData = JSON.parse(readFileSync(STORES_PATH, 'utf-8'));
    }
    if (existsSync(TEMPLATES_PATH)) {
      projectTemplates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
      console.log(`📋 api/chat.js: Project templates loaded — ${Object.keys(projectTemplates.projects).length} types`);
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
2. Recommander UNIQUEMENT les produits du catalogue (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Proposer les services Matério quand pertinent (coupe, livraison, estimation, financement)
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. *** RÈGLE CRITIQUE — OUTILS OBLIGATOIRES ***
   Quand un client décrit un PROJET (toiture, terrasse, sous-sol, salle de bain, cabanon, garage, clôture, peinture):
   → Appeler analyze_project EN PREMIER pour obtenir la liste complète de matériaux avec quantités calculées
   → Puis appeler show_products avec les produits retournés par analyze_project
   Quand un client demande un produit spécifique:
   → Appeler search_catalog pour chercher dans le catalogue complet
   → Puis appeler show_products avec les pid trouvés et les quantités
   Ne JAMAIS recommander un produit en texte sans avoir appelé show_products.
   L'échantillon ci-dessous sert de RÉFÉRENCE pour connaître les catégories, mais utilise search_catalog ou analyze_project pour obtenir les pid réels.
8. Appeler show_services quand tu mentionnes un service (coupe, livraison, estimation)
9. Appeler show_financing quand le total du panier dépasse 750$ et que le financement est pertinent
10. Appeler show_estimation quand le client décrit un projet complexe qui nécessite une soumission professionnelle
11. Appeler show_checkout quand le client dit vouloir commander, acheter, passer la commande, réserver, ou checkout
12. Pour la livraison spécialisée: mentionner les camions-girafe et la livraison sur le toit quand le projet l'exige
13. Pour le centre de coupe: vérifier que le magasin du client a le service avant de le proposer
14. Le catalogue complet contient ${catalogData.products.length} produits. Utilise search_catalog pour chercher des produits.
15. Tous les ${catalogData.products.length} produits sont disponibles en magasin. Ne dis JAMAIS qu'un produit n'est pas disponible.
16. VENTE COMPLÉMENTAIRE (produit individuel seulement): Quand un client demande un PRODUIT SPÉCIFIQUE (pas un projet complet), le système ajoute automatiquement des produits complémentaires dans l'UI. Mentionne-les brièvement. Ne PAS ajouter de compléments manuellement pour les projets — analyze_project fournit déjà le BOM complet.

PROJETS TYPES (catégories de matériaux à couvrir selon le projet):

🏠 TOITURE (bardeaux):
  Structure: contreplaqué/OSB, papier feutre 15lb ou sous-couche synthétique
  Couverture: bardeaux (calculer par carré = 100pi²), faîtière
  Ventilation: évents de toit, soffites ventilés
  Étanchéité: membrane autocollante (débords, vallées), solin aluminium, scellant toiture
  Fixation: clous à toiture galvanisés (1¼"), clous solin
  ⚠️ Pour un projet toiture: appeler analyze_project("toiture", "1200 pieds carrés") qui calculera automatiquement toutes les quantités.
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "bardeau", category: "Bardeau") → bardeaux
    - search_catalog(query: "membrane", category: "Papier - Membrane") → feutre, sous-couche
    - search_catalog(query: "solin") → solins
    - search_catalog(query: "clou toiture") → clous
    - search_catalog(query: "évent toit") → ventilation
  Questions à poser: superficie toit? pente? nombre de couches existantes? cheminée/évent?

🪵 TERRASSE / PATIO:
  Structure: madriers traités 2×8 ou 2×10, poteaux 6×6, solives
  Surface: platelage 5/4×6 ou composite
  Fixation: vis inox ou enduites #8×3", ancrages de poteaux, équerres de solive, boulons tire-fond
  Finition: teinture/scellant extérieur, solin contre la maison
  Escalier: limons, marches, garde-corps si >30" du sol
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "bois traité", category: "Bois traité brun") → madriers, poteaux
    - search_catalog(query: "vis terrasse") → vis extérieur
    - search_catalog(query: "teinture", category: "Teinture et vernis") → teinture extérieur
    - search_catalog(query: "ancrage") → ancrages de poteaux
    - search_catalog(query: "garde-corps") → garde-corps
  Questions à poser: dimensions? hauteur du sol? accès requis? garde-corps? escalier?

🧱 SOUS-SOL / FINITION:
  Ossature: colombages 2×4 ou 2×3, fourrures 1×3
  Isolation: panneaux polystyrène ou laine R-12 minimum
  Pare-vapeur: polyéthylène 6 mil, ruban d'étanchéité
  Revêtement: gypse ½", vis à gypse, ruban-composé-couteau
  Plancher: sous-couche DRIcore ou membrane Delta, plancher flottant
  Électrique: boîtes électriques, fils, disjoncteurs (rappeler permis requis)
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "gypse", category: "Gypse") → panneaux gypse
    - search_catalog(query: "isolant", category: "Isolation") → laine, panneaux
    - search_catalog(query: "colombage") → colombages acier/bois
    - search_catalog(query: "plancher", category: "Stratifié") → plancher flottant
    - search_catalog(query: "pare-vapeur") → membrane pare-vapeur
  Questions à poser: dimensions? hauteur libre? humidité? fenêtres existantes?

🚿 SALLE DE BAIN:
  Plomberie: robinetterie, drain, raccords PEX, silicone
  Murs: panneau ciment (Durock), vis ciment, membrane d'étanchéité
  Plancher: membrane Ditra/Kerdi, mortier-colle, céramique, coulis
  Ventilateur: ventilateur-extracteur (CFM selon superficie), conduit, clapet
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "tuile céramique", category: "Céramique et porcelaine") → tuiles
    - search_catalog(query: "robinet", category: "Cuisine et salle de bain") → robinetterie
    - search_catalog(query: "membrane douche") → membranes Kerdi/Ditra
    - search_catalog(query: "vanité") → vanités
    - search_catalog(query: "douche") → cabines de douche
  Questions à poser: douche ou bain? dimensions pièce? ventilation existante?

🏗️ GARAGE:
  Fondation: coffrages, béton, ancrages (rappeler: permis municipal requis, fondation par professionnel recommandé)
  Structure murs: colombages 2×6 ou 2×4 x 16 pi, sablières doubles, lisses
  Revêtement extérieur: contreplaqué ou OSB + pare-air + vinyle/canexel
  Toiture: fermes de toit pré-usinées OU chevrons 2×8/2×10, contreplaqué/OSB sur toit, sous-couche synthétique, bardeaux, faîtière, membrane autocollante (débords), solin, évents
  ⚠️ Pour un projet garage: appeler analyze_project(\"garage\", \"24x28\") qui calculera automatiquement toutes les quantités.
  Porte de garage: porte sectionnelle (simple 9×7 ou double 16×7)
  Porte piéton: porte extérieure isolée
  Fenêtres: optionnel, fenêtres de garage
  Isolation: si chauffé, isolant murs R-24 + plafond R-40
  Quincaillerie: équerres Simpson, ancrages, tire-fond, vis construction, clous charpente
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "2 po x 6", category: "Épinette") → colombages murs
    - search_catalog(query: "contreplaqué", category: "Contreplaqué") → revêtement + toit
    - search_catalog(query: "bardeau", category: "Bardeau") → bardeaux toiture
    - search_catalog(query: "membrane", category: "Papier - Membrane") → sous-couche toit
    - search_catalog(query: "porte garage") → portes de garage
    - search_catalog(query: "vis construction") → vis structurelles
    - search_catalog(query: "ancrage") → ancrages de poteaux
    - search_catalog(query: "isolant", category: "Isolation") → isolation (si chauffé)
  Questions à poser: dimensions? chauffé ou non? nombre de portes de garage? type de revêtement? fondation déjà coulée?

🏗️ CABANON / REMISE:
  ⚠️ Si le client veut CONSTRUIRE un cabanon: recommander des MATÉRIAUX DE CONSTRUCTION (bois, contreplaqué, bardeaux, vis). Ne PAS recommander des remises préfabriquées.
  Fondation: blocs de béton ou pieux vissés
  Structure: colombages 2×4, sablière, lisse
  Revêtement extérieur: contreplaqué + papier + vinyle/canexel
  Toiture: fermes ou chevrons, contreplaqué, membrane, bardeaux
  Porte: porte de cabanon ou porte de garage
  Quincaillerie: équerres, ancrages, vis, clous
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "2 po x 4", category: "Épinette") → colombages
    - search_catalog(query: "contreplaqué", category: "Contreplaqué") → panneaux
    - search_catalog(query: "bardeau", category: "Bardeau") → bardeaux
    - search_catalog(query: "vis construction", category: "Bois et charpente") → vis structurelles
    - search_catalog(query: "porte cabanon") → portes
    - search_catalog(query: "équerre charpente") → équerres
  Questions à poser: dimensions? permis municipal? fondation souhaitée?

🪜 CLÔTURE:
  Poteaux: 4×4 traité ou 6×6 traité, ancrages de poteaux
  Structure: traverses 2×4 traité
  Revêtement: planches 1×6 ou 5/4×6 traité, lattis
  Fixation: vis extérieur inox, boulons tire-fond
  Finition: teinture extérieur
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "poteau", category: "Bois traité brun") → poteaux traités
    - search_catalog(query: "clôture", category: "Rampe et clôture") → panneaux, planches
    - search_catalog(query: "vis extérieur") → vis inox
    - search_catalog(query: "teinture", category: "Teinture et vernis") → teinture extérieur
  Questions à poser: longueur linéaire? hauteur? style (fermée, ajourée)? portail?

🎨 PEINTURE INTÉRIEURE:
  Peinture: latex acrylique (calculer par gallon = 350-400 pi²)
  Apprêt: apprêt/primer si surface neuve ou changement de couleur foncé
  Outils: rouleaux (10" + mini 4"), manchon, pinceaux (2" + angulaire), bac, rallonge
  Protection: ruban de peintre, bâche/toile plastique
  Préparation: bouche-pores, papier sablé, éponge
  Recherches catalog suggérées (utilise le paramètre category pour filtrer):
    - search_catalog(query: "peinture", category: "Peinture") → peinture intérieur
    - search_catalog(query: "rouleau", category: "Accessoires et outils de peinture") → rouleaux
    - search_catalog(query: "ruban masquer") → ruban à masquer
    - search_catalog(query: "apprêt") → apprêt/primer
    - search_catalog(query: "pinceau") → pinceaux
  Questions à poser: nombre de pièces? superficie murs? type de surface? couleur actuelle?

FLUX DE RECOMMANDATION PROJET:
Quand un client décrit un projet ou demande des matériaux:
1. IDENTIFIER le type → appeler analyze_project avec le type et les dimensions
2. analyze_project retourne bom_summary: la liste COMPLÈTE des matériaux avec quantités DÉJÀ CALCULÉES, pid réels, et descriptions des formules
3. Appeler show_products avec TOUS les produits retournés
4. PRÉSENTER le bom_summary retourné par analyze_project — UTILISER les quantités du bom_summary TELLES QUELLES:
   a) Matériaux principaux: nom, quantité du bom_summary, description de la formule entre parenthèses, prix unitaire × quantité
   b) Quincaillerie et fixation: idem
   c) Accessoires et finition: idem
   d) 🔧 Outils recommandés: REPRODUIRE EXACTEMENT le format du bom_summary avec les badges d'importance:
      - 🔴 Essentiel = indispensable
      - 🟡 Très utile = fortement recommandé
      - 🟢 Recommandé = optionnel mais pratique
      Pour chaque outil, afficher: badge + nom + prix + explication en italique. NE PAS reformater cette section en tableau.
5. Si dimensions manquantes: poser 1-2 questions de raffinement APRÈS, pas avant.
6. TOTALISER le montant retourné par analyze_project et proposer financement si > 750$
7. PROPOSER les services pertinents — APPELER show_services pour chaque service mentionné:
   - Si projet toiture ou gros matériaux → appeler show_services("livraison_specialisee") en mentionnant la livraison sur le toit par camion-girafe
   - Si le client demande explicitement la livraison → appeler show_services("livraison_specialisee") OBLIGATOIREMENT

⛔ RÈGLE CRITIQUE QUANTITÉS:
- Les quantités sont CALCULÉES par le serveur dans analyze_project. Ne JAMAIS recalculer toi-même.
- Ne JAMAIS inventer tes propres formules. Utilise uniquement quantity et quantity_formula du bom_summary.
- Les chiffres du bom_summary FONT AUTORITÉ. Ne les modifie pas, ne les arrondis pas autrement.
- Si tu veux expliquer un calcul, cite UNIQUEMENT la description de la formule retournée dans le bom_summary (le champ entre parenthèses).
❌ INTERDIT: recalculer "périmètre ÷ 1.33 = X colombages" avec tes propres chiffres
✅ CORRECT: "**95 colombages** (périmètre ÷ 1.33 + cadrage)" — reprendre la quantité et la description du bom_summary

Pour les demandes de produits spécifiques (pas un projet): utiliser search_catalog puis show_products.

RÈGLE CRITIQUE: Ne JAMAIS répondre en texte seul quand le client parle d'un projet. TOUJOURS appeler analyze_project + show_products.

EXEMPLE DE RÉPONSE (garage 24×28) — utilise les données du bom_summary:
---
Voici l'estimation complète pour votre garage 24×28 (672 pi²):

### Matériaux principaux
| Matériau | Quantité | Prix unitaire | Sous-total |
|----------|----------|---------------|------------|
| **Épinette 2×6 16 pi** | 95 (périmètre ÷ 1.33 + cadrage) | 12.99$ | 1 234.05$ |
| **Contreplaqué** | 53 (murs + toit) | 86.99$ | 4 610.47$ |
| **Bardeau DURATION** | 25 (surface toit ÷ 100 × 3 + 10%) | 43.99$ | 1 099.75$ |
| ... | ... | ... | ... |

### Quincaillerie
...
### Accessoires
...

**Sous-total: X$** | TPS: X$ | TVQ: X$ | **Total: X$**
---

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
  const _cat = (p) => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const _title = (p) => (p.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Score: exact leaf match > leaf-contains > title-only > nested category
  const _rank = (p) => {
    const inTitle = _title(p).includes(q);
    const catParts = _cat(p).split(' > ');
    const leaf = catParts[catParts.length - 1] || '';
    const leafIs = leaf === q || leaf.startsWith(q + ' ');   // leaf IS the query ("gypse")
    const leafHas = !leafIs && leaf.includes(q);             // leaf CONTAINS query ("vis (gypse,...)")
    const inCat = _cat(p).includes(q);
    if (leafIs && inTitle) return 10;   // "Panneau de cloison (gypse)" in category Gypse
    if (leafIs)            return 8;    // category Gypse, title doesn't say gypse
    if (inTitle && !inCat) return 6;    // title says gypse, unrelated category
    if (leafHas && inTitle) return 4;   // "Vis pour le gypse" in "Vis (gypse,...)"
    if (leafHas)           return 3;    // leaf mentions query but not in title
    if (inTitle && inCat)  return 2;    // title + deep category mention
    if (inCat)             return 1;    // only in category path
    return 0;
  };

  // Tier 1: Phrase match — sorted by relevance (title > category leaf > category path)
  let results = pool.filter(p => _txt(p).includes(q));
  if (results.length > 0) {
    results.sort((a, b) => _rank(b) - _rank(a));
    results = results.slice(0, 10);
  }
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
      // Try plain number
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
    surface = linear * 6; // default fence height
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

    const bestMatch = results[0]; // Take best match

    // ── Compute quantity deterministically ──
    let quantity = 1;
    try {
      const formula = cat.quantity_formula;
      if (formula.type === 'fixed') {
        quantity = formula.quantity;
      } else if (formula.calculate) {
        // Safe eval with known variables only
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

  // ── Format the BOM for the LLM ──
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

  if (totalCents >= 75000) {
    const plan = getFinancingPlan(totalCents / 100);
    if (plan) {
      bomText += `\n💰 **Financement disponible**: ${plan.months} mois sans intérêts = ${plan.monthly}$/mois\n`;
    }
  }

  bomText += `\n### Questions de raffinement\n`;
  for (const q of template.questions) {
    bomText += `- ${q}\n`;
  }
  bomText += `\n⚠️ RAPPEL: Présente les quantités ci-dessus TELLES QUELLES au client. Ne recalcule pas. Cite la description entre parenthèses pour expliquer chaque quantité.\n`;

  // Return structured data for the LLM + SSE events
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
      description: "Search the full Matério catalog (6978 products). ALWAYS use this to find products before recommending them. Returns up to 10 matching products with pid, title, price, category. You can call this multiple times with different keywords. Use 'category' to filter by product category for more precise results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords in French (e.g. 'bardeau asphalte', 'vis \u00e0 bois 3 pouces')" },
          category: { type: "string", description: "Optional category filter to narrow results (e.g. '\u00c9pinette', 'Contreplaqu\u00e9', 'Bardeau', 'Toiture', 'Bois trait\u00e9 brun'). Matches against the product category path." }
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
  { match: ['escalier', 'marche'], searches: ['nez de marche', 'limon escalier', 'garde-corps', 'balustre', 'main courante'] },
  { match: ['cabanon', 'remise'], searches: ['équerre charpente', 'vis construction', 'contreplaqué', 'bardeau', 'porte cabanon'] },
  { match: ['garage'], searches: ['équerre charpente', 'vis construction', 'ancrage', 'bardeau', 'porte garage', 'contreplaqué'] },
  { match: ['armoire', 'cuisine'], searches: ['poignée armoire', 'charnière', 'vis armoire', 'moulure couronne'] },
  { match: ['électrique', 'prise', 'interrupteur'], searches: ['fil électrique', 'boîte électrique', 'connecteur marrette', 'plaque interrupteur'] },
  { match: ['carrelage', 'céramique', 'tuile'], searches: ['mortier-colle', 'coulis', 'croisillons', 'truelle dentelée', 'coupe-carreaux'] },
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
    if (complements.length >= 10) break;
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

function computeQuantityHints(products, userMsg, productMap) {
  const allMsgs = (userMsg || '').toLowerCase();
  const surfMatch = allMsgs.match(/(\d[\d\s,.]*)\s*(?:pi(?:eds?)?\s*(?:carr[eé]s?|²)|pi2|pc)/i);
  if (!surfMatch) return '';
  const surface = parseFloat(surfMatch[1].replace(/[\s,]/g, ''));
  if (!surface || surface <= 0) return '';
  const seen = new Set();
  const hints = [];
  for (const p of products) {
    const cat = ((productMap[p.product_id]?.category || '') + ' ' + (productMap[p.product_id]?.title || '')).toLowerCase();
    if (/bardeau/i.test(cat) && !/bande.*d[eé]part|fa[iî]t|ar[eê]te/i.test(cat) && !seen.has('bardeau')) {
      seen.add('bardeau');
      const carres = Math.ceil(surface / 100);
      const paquets = carres * 3;
      const avecPertes = Math.ceil(paquets * 1.1);
      hints.push(`⚠️ BARDEAUX pour ${surface} pi²: ${surface}÷100=${carres} carrés × 3 paq/carré = ${paquets} paq + 10% pertes = ${avecPertes} paquets. UTILISE qty=${avecPertes} dans show_products et MONTRE ce calcul au client.`);
    } else if (/sous-couche|rhino/i.test(cat) && !seen.has('sous-couche')) {
      seen.add('sous-couche');
      const rouleaux = Math.ceil(surface / 400);
      hints.push(`⚠️ SOUS-COUCHE pour ${surface} pi²: ${surface}÷400=${rouleaux} rouleaux. UTILISE qty=${rouleaux} et MONTRE ce calcul.`);
    } else if (/contreplaqu[eé]|osb/i.test(cat) && !seen.has('contreplaque')) {
      seen.add('contreplaque');
      const feuilles = Math.ceil((surface / 32) * 1.1);
      hints.push(`⚠️ CONTREPLAQUÉ pour ${surface} pi²: ${surface}÷32×1.1=${feuilles} feuilles. UTILISE qty=${feuilles} et MONTRE ce calcul.`);
    }
  }
  return hints.length > 0 ? '\n' + hints.join('\n') : '';
}

function executeTool(toolCall, userMsg) {
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
      if (!q.trim() || !catalogData) return { results: [], message: 'Aucun terme de recherche' };
      // Use shared search with ranking
      let mapped = searchCatalogInternal(args.query, args.category);
      // Context-aware exclusions: bathroom queries should not return kitchen products and vice versa
      const isBathroomContext = /salle|bain|douche|lavabo|vanite|baignoire/i.test(q) && !/cuisine/i.test(q);
      const isKitchenContext = /cuisine/i.test(q) && !/salle.*bain|bain/i.test(q);
      if (isBathroomContext || isKitchenContext) {
        mapped = mapped.filter(p => {
          const cat = (p.category || '').toLowerCase();
          if (isBathroomContext && (cat.includes('evier de cuisine') || cat.includes('évier de cuisine') || (p.title || '').toLowerCase().includes('cuisine'))) return false;
          if (isKitchenContext && (cat.includes('salle de bain') || cat.includes('lavabo de salle') || cat.includes('douche'))) return false;
          return true;
        });
      }

      // Compute quantity hints based on user-provided dimensions
      let qtyHint = '';
      if (mapped.length > 0 && userMsg) {
        const surfMatch = userMsg.match(/(\d[\d\s,.]*)\s*(?:pi(?:eds?)?\s*(?:carr[eé]s?|²)|pi2|pc)/i);
        if (surfMatch) {
          const surface = parseFloat(surfMatch[1].replace(/[\s,]/g, ''));
          if (surface > 0) {
            const seen = new Set();
            const hints = [];
            for (const p of mapped) {
              const txt = (p.title + ' ' + p.category).toLowerCase();
              if (/bardeau/i.test(txt) && !/bande.*d[eé]part|fa[iî]t|ar[eê]te/i.test(txt) && !seen.has('bardeau')) {
                seen.add('bardeau');
                const carres = Math.ceil(surface / 100);
                const paquets = carres * 3;
                const avecPertes = Math.ceil(paquets * 1.1);
                hints.push(`⚠️ BARDEAUX pour ${surface} pi²: ${surface}÷100=${carres} carrés × 3 paq/carré = ${paquets} paq + 10% pertes = ${avecPertes} paquets. UTILISE qty=${avecPertes} dans show_products et MONTRE ce calcul au client.`);
              } else if (/sous-couche|rhino/i.test(txt) && !seen.has('sous-couche')) {
                seen.add('sous-couche');
                const rouleaux = Math.ceil(surface / 400);
                hints.push(`⚠️ SOUS-COUCHE pour ${surface} pi²: ${surface}÷400=${rouleaux} rouleaux. UTILISE qty=${rouleaux} et MONTRE ce calcul.`);
              } else if (/contreplaqu[eé]|osb/i.test(txt) && !seen.has('contreplaque')) {
                seen.add('contreplaque');
                const feuilles = Math.ceil((surface / 32) * 1.1);
                hints.push(`⚠️ CONTREPLAQUÉ pour ${surface} pi²: ${surface}÷32×1.1=${feuilles} feuilles. UTILISE qty=${feuilles} et MONTRE ce calcul.`);
              }
            }
            if (hints.length > 0) qtyHint = '\n' + hints.join('\n');
          }
        }
      }

      return {
        results: mapped,
        total_found: mapped.length,
        next_step: mapped.length > 0
          ? `${mapped.length} produit(s) trouvé(s). Tu DOIS appeler show_products avec les pid ci-dessus et les quantités calculées. Ne réponds PAS en texte seul.${qtyHint}`
          : 'Aucun résultat. Essaie avec des mots-clés plus courts ou différents (ex: un seul mot principal).'
      };
    }
    case "show_checkout":
      return { success: true, checkout_ready: true, products: args.product_ids?.length || 0 };
    case "analyze_project": {
      const result = analyzeProject(args.project_type, args.dimensions, args.details);
      return result;
    }
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

  // Detect if last user message is about products/projects (needs tool calls)
  const lastUserMsg = trimmedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const needsSearch = /toiture|terrasse|patio|sous-sol|salle de bain|garage|cabanon|clôture|cloture|peintur|plancher|fenêtre|porte|bardeau|bois traité|gypse|isol|plomberie|rénovation|construction|projet|je veux|je dois|refaire|construire|installer|remplacer|changer|poser|comptoir|évier|robinet|escalier|rampe|revêtement|avez-vous|cherche|besoin|matériaux|matériel|produit|combien|coût/i.test(lastUserMsg);
  // Detect if it's a project query (should use analyze_project instead of search_catalog)
  const isProjectQuery = /toiture|terrasse|patio|sous-sol|sous sol|salle de bain|garage|cabanon|remise|clôture|cloture|peintur|refaire|construire|rénover|finir|bâtir|projet/i.test(lastUserMsg);
  console.log(`📩 User msg: "${lastUserMsg.slice(0, 80)}..." | isProjectQuery=${isProjectQuery} | needsSearch=${needsSearch}`);
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages];

    // Iterative tool-calling loop (max 8 rounds: search(es) → show_products → final text)
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
        // Force show_products after at least 4 search rounds
        toolChoice = { type: "function", function: { name: "show_products" } };
      } else {
        toolChoice = "auto";
      }
      const tcLabel = typeof toolChoice === 'string' ? toolChoice : `forced:${toolChoice.function.name}`;
      console.log(`🔄 Round ${round + 1}/${MAX_ROUNDS} — tool_choice: ${tcLabel}, needsSearch: ${needsSearch}, hasSearchResults: ${hasSearchResults}`);

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: fullMessages, tools: TOOLS,
        tool_choice: toolChoice,
        stream: true, temperature: 0.4, max_tokens: 2048,
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
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) {
            send("complements", { products: complementIds });
          }
          productsShown = true;
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
          productsShown = true; // checkout = final action, stop looping
        }

        if (tc.function.name === "analyze_project") {
          // Execute analyze_project and emit products SSE event with the full BOM
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
            // No cross-sell for projects — analyze_project BOM is already complete
            if (projectResult.total_before_tax && parseFloat(projectResult.total_before_tax) >= 750) {
              const plan = getFinancingPlan(parseFloat(projectResult.total_before_tax));
              if (plan) send("financing", { total_amount: parseFloat(projectResult.total_before_tax), plan });
            }
            hasSearchResults = true;
            productsShown = true;
          }
        }

        const result = executeTool(tc, lastUserMsg);
        // Track if search_catalog found results
        if (tc.function.name === 'search_catalog') {
          searchRounds++
          if (result.results?.length > 0) {
            hasSearchResults = true;
          }
        }

        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      // If products/checkout were shown, do one final text-only call and stop
      if (productsShown) {
        const finalStream = await openai.chat.completions.create({
          model: "gpt-4o-mini", messages: fullMessages, stream: true, temperature: 0.4, max_tokens: 2048,
        });
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) send("delta", { content });
        }
        break;
      }
      // Loop continues — next round will call the model again with tool results,
      // allowing it to make more tool calls (e.g., search_catalog → show_products)
    }

    // Safety net: if search found results but products were never shown, force one extra round
    if (hasSearchResults && !productsShown) {
      console.log('⚠️ Safety net: search found results but show_products was never called. Forcing show_products.');
      const forceStream = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: fullMessages, tools: TOOLS,
        tool_choice: { type: "function", function: { name: "show_products" } },
        stream: true, temperature: 0.4, max_tokens: 2048,
      });
      let contentBuffer = '';
      const toolCallsMap = {};
      for await (const chunk of forceStream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        if (delta.content) { send("delta", { content: delta.content }); contentBuffer += delta.content; }
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
      for (const tc of Object.values(toolCallsMap)) {
        let args; try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
        if (tc.function.name === 'show_products' && args.products) {
          const validProducts = args.products.filter(p => VALID_IDS.has(p.product_id));
          send("products", { products: validProducts });
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) send("complements", { products: complementIds });
        }
        fullMessages.push({ role: "assistant", tool_calls: [tc] });
        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(executeTool(tc, lastUserMsg)) });
      }
      // Final text after forced products
      const finalStream = await openai.chat.completions.create({
        model: "gpt-4o-mini", messages: fullMessages, stream: true, temperature: 0.4, max_tokens: 2048,
      });
      for await (const chunk of finalStream) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) send("delta", { content: c });
      }
    }

    send("done", {});
  } catch (error) {
    console.error("Chat API error:", error);
    send("error", { message: error.message || "Erreur interne du serveur" });
  }

  res.end();
}
