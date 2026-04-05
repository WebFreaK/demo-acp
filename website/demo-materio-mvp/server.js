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
const TEMPLATES_PATH = join(__dirname, 'data', 'project-templates.json');

let catalogData = null;
let catalogProductMap = {};
let VALID_IDS = new Set();
let servicesData = null;
let storesData = null;
let projectTemplates = null;
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

    // Load project templates
    if (existsSync(TEMPLATES_PATH)) {
      projectTemplates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
      console.log(`📋 Project templates loaded — ${Object.keys(projectTemplates.projects).length} types`);
    }
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
2. Recommander UNIQUEMENT les produits du catalogue (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Proposer les services Matério quand pertinent (coupe, livraison, estimation, financement)
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. *** RÈGLE CRITIQUE — RECHERCHE OBLIGATOIRE ***
   Quand un client demande un produit ou décrit un projet, tu DOIS:
   a) Appeler search_catalog pour trouver les produits dans le catalogue (tu peux l'appeler plusieurs fois avec des mots-clés différents)
   b) Appeler show_products avec les pid trouvés et les quantités
   Ne JAMAIS recommander un produit en texte sans avoir appelé search_catalog + show_products.
   L'échantillon ci-dessous sert de RÉFÉRENCE pour connaître les catégories, mais utilise search_catalog pour obtenir les pid réels.
8. Appeler show_services quand tu mentionnes un service (coupe, livraison, estimation)
9. Appeler show_financing quand le total du panier dépasse 750$ et que le financement est pertinent
10. Appeler show_estimation quand le client décrit un projet complexe qui nécessite une soumission professionnelle
11. Appeler show_checkout quand le client dit vouloir commander, acheter, passer la commande, réserver, ou checkout
12. Pour la livraison spécialisée: mentionner les camions-girafe et la livraison sur le toit quand le projet l'exige
13. Pour le centre de coupe: vérifier que le magasin du client a le service avant de le proposer
14. Le catalogue complet contient ${catalog.products.length} produits. Utilise search_catalog pour chercher des produits.
15. Tous les ${catalog.products.length} produits sont disponibles en magasin. Ne dis JAMAIS qu'un produit n'est pas disponible.
16. VENTE COMPLÉMENTAIRE: Quand un client demande un produit, proposer les produits complémentaires nécessaires pour compléter le travail. Exemples:
  - Bardeaux → papier feutre, clous à toiture, solin, évent de toit, sous-couche
  - Peinture → rouleau, pinceau, ruban de peintre, bâche, apprêt
  - Bois de charpente → vis, clous, équerres, ancrages, quincaillerie de fixation
  - Revêtement de plancher → sous-couche, moulures de transition, adhésif
  - Gypse → vis à gypse, ruban à joints, composé à joints, couteau à enduire
  - Isolation → pare-vapeur, ruban d'étanchéité, agrafe
  - Plomberie (bain, toilette) → robinetterie, raccords, silicone, drain
  - Escalier/marche → nez de marche, limon, garde-corps, balustre, main courante
  - Cabanon/remise → équerre charpente, vis construction, contreplaqué, bardeau, porte cabanon
  - Armoire/cuisine → poignée, charnière, vis armoire, moulure couronne
  - Électrique (prise, interrupteur) → fil électrique, boîte électrique, connecteur marrette, plaque
  - Céramique/carrelage → mortier-colle, coulis, croisillons, truelle dentelée
  Présente le produit demandé EN PREMIER, puis une section "Pour compléter votre projet" avec les compléments.

PROJETS TYPES (catégories de matériaux à couvrir selon le projet):

🏠 TOITURE (bardeaux):
  Structure: contreplaqué/OSB, papier feutre 15lb ou sous-couche synthétique
  Couverture: bardeaux (calculer par carré = 100pi²), faîtière
  Ventilation: évents de toit, soffites ventilés
  Étanchéité: membrane autocollante (débords, vallées), solin aluminium, scellant toiture
  Fixation: clous à toiture galvanisés (1¼"), clous solin
  ⚠️ CALCUL BARDEAUX: superficie ÷ 100 = carrés, carrés × 3 = PAQUETS, + 10% pertes.
     Ex: 1200 pi² → 1200÷100=12 carrés → 12×3=36 paq → +10%= **40 paquets** (PAS 12!)
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
  ⚠️ CALCUL TOITURE GARAGE: surface au sol ≈ surface toit (pente faible) ou ×1.1 (pente moyenne). Ex: 24×28=672 pi² ×1.1=740 pi² → 740÷100=8 carrés × 3 paq = 24 paq +10%= **27 paquets**
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

### 🔧 Outils recommandés (par ordre d'importance)
- **🔴 Essentiel** — Perceuse-visseuse: Ensemble perceuse 1/2 po — 149.99$
  _Pour assembler la charpente et fixer le revêtement._
- **🟡 Très utile** — Niveau à poutre: Niveau poutre en I — 89.99$
  _Pour vérifier l'aplomb des murs et le niveau de la dalle._
- **🟢 Recommandé** — Ruban à mesurer: Stanley FATMAX — 22.98$
  _Pour mesurer les murs et calculer l'espacement des colombages._

**Sous-total: X$** | TPS: X$ | TVQ: X$ | **Total: X$**
---

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
  const _cat = (p) => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const _title = (p) => (p.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Score: exact leaf match > leaf-contains > title-only > nested category
  const _rank = (p) => {
    const inTitle = _title(p).includes(q);
    const catParts = _cat(p).split(' > ');
    const leaf = catParts[catParts.length - 1] || '';
    const leafIs = leaf === q || leaf.startsWith(q + ' ');
    const leafHas = !leafIs && leaf.includes(q);
    const inCat = _cat(p).includes(q);
    if (leafIs && inTitle) return 10;
    if (leafIs)            return 8;
    if (inTitle && !inCat) return 6;
    if (leafHas && inTitle) return 4;
    if (leafHas)           return 3;
    if (inTitle && inCat)  return 2;
    if (inCat)             return 1;
    return 0;
  };

  // Tier 1: Phrase match — sorted by relevance
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

// ─── analyzeProject (deterministic BOM generator) ──────

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

    // ── Compute quantity deterministically ──
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
      description: "Search the full Matério catalog (6978 products). ALWAYS use this to find products before recommending them. Returns up to 10 matching products with pid, title, price, category. You can call this multiple times with different keywords. Use 'category' to filter by product category for more precise results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords in French (e.g. 'bardeau asphalte', 'vis à bois 3 pouces')" },
          category: { type: "string", description: "Optional category filter to narrow results (e.g. 'Épinette', 'Contreplaqué', 'Bardeau', 'Toiture', 'Bois traité brun'). Matches against the product category path." }
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

function computeQuantityHints(products, userMsg) {
  const allMsgs = (userMsg || '').toLowerCase();
  // Extract surface area in pi² from user messages
  const surfMatch = allMsgs.match(/(\d[\d\s,.]*)\s*(?:pi(?:eds?)?\s*(?:carr[eé]s?|²)|pi2|pc)/i);
  if (!surfMatch) return '';
  const surface = parseFloat(surfMatch[1].replace(/[\s,]/g, ''));
  if (!surface || surface <= 0) return '';

  const hints = [];
  for (const p of products) {
    const cat = ((catalogProductMap[p.product_id]?.category || '') + ' ' + (catalogProductMap[p.product_id]?.title || '')).toLowerCase();
    if (/bardeau/i.test(cat) && !/bande.*d[eé]part|fa[iî]t|ar[eê]te/i.test(cat)) {
      const carres = Math.ceil(surface / 100);
      const paquets = carres * 3;
      const avecPertes = Math.ceil(paquets * 1.1);
      hints.push(`BARDEAUX: ${surface} pi² ÷ 100 pi²/carré = ${carres} carrés × 3 paq/carré = ${paquets} paq + 10% pertes = **${avecPertes} paquets**. Utilise qty=${avecPertes} et MONTRE ce calcul au client.`);
    } else if (/sous-couche|rhino/i.test(cat)) {
      const rouleaux = Math.ceil(surface / 400);
      hints.push(`SOUS-COUCHE: ${surface} pi² ÷ 400 pi²/rouleau = **${rouleaux} rouleaux**. MONTRE ce calcul.`);
    } else if (/contreplaqu[eé]|osb/i.test(cat)) {
      const feuilles = Math.ceil((surface / 32) * 1.1);
      hints.push(`CONTREPLAQUÉ: ${surface} pi² ÷ 32 pi²/feuille × 1.1 = **${feuilles} feuilles**. MONTRE ce calcul.`);
    } else if (/membrane.*auto|pare-air/i.test(cat)) {
      const rouleaux = Math.ceil(surface * 0.1 / 65);
      hints.push(`MEMBRANE (débords/vallées ≈10% surface): **${Math.max(rouleaux, 2)} rouleaux**. MONTRE ce calcul.`);
    }
  }
  return hints.length > 0 ? '\n⚠️ CALCULS DE QUANTITÉS (INCLURE DANS TA RÉPONSE):\n' + hints.join('\n') : '';
}

function executeTool(tc, userMsg) {
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

      if (qtyHint) console.log('📐 Quantity hints injected:', qtyHint);
      return {
        results: mapped,
        total_found: mapped.length,
        next_step: mapped.length > 0
          ? `${mapped.length} produit(s) trouvé(s). Tu DOIS appeler show_products avec les pid ci-dessus et les quantités calculées. Ne réponds PAS en texte seul.${qtyHint}`
          : 'Aucun résultat. Essaie avec des mots-clés plus courts ou différents (ex: un seul mot principal).'
      };
    }
    case 'show_checkout':
      return { success: true, checkout_ready: true, products: args.product_ids?.length || 0 };
    case 'analyze_project': {
      const result = analyzeProject(args.project_type, args.dimensions, args.details);
      return result;
    }
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
  { match: ['escalier', 'marche'], searches: ['nez de marche', 'limon escalier', 'garde-corps', 'balustre', 'main courante'] },
  { match: ['cabanon', 'remise'], searches: ['équerre charpente', 'vis construction', 'contreplaqué', 'bardeau', 'porte cabanon'] },
  { match: ['garage'], searches: ['équerre charpente', 'vis construction', 'ancrage', 'bardeau', 'porte garage', 'contreplaqué'] },
  { match: ['armoire', 'cuisine'], searches: ['poignée armoire', 'charnière', 'vis armoire', 'moulure couronne'] },
  { match: ['électrique', 'prise', 'interrupteur'], searches: ['fil électrique', 'boîte électrique', 'connecteur marrette', 'plaque interrupteur'] },
  { match: ['carrelage', 'céramique', 'tuile'], searches: ['mortier-colle', 'coulis', 'croisillons', 'truelle dentelée', 'coupe-carreaux'] },
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
  const trimmedMessages = messages.slice(-20);
  const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages];

  // Detect if last user message is about products/projects (needs tool calls)
  const lastUserMsg = trimmedMessages.filter(m => m.role === 'user').pop()?.content || '';
  const needsSearch = /toiture|terrasse|patio|sous-sol|salle de bain|garage|cabanon|clôture|cloture|peintur|plancher|fenêtre|porte|bardeau|bois traité|gypse|isol|plomberie|rénovation|construction|projet|je veux|je dois|refaire|construire|installer|remplacer|changer|poser|comptoir|évier|robinet|escalier|rampe|revêtement|avez-vous|cherche|besoin|matériaux|matériel|produit|combien|coût/i.test(lastUserMsg);
  // Detect if it's a project query (should use analyze_project instead of search_catalog)
  const isProjectQuery = /toiture|terrasse|patio|sous-sol|sous sol|salle de bain|garage|cabanon|remise|clôture|cloture|peintur|refaire|construire|rénover|finir|bâtir|projet/i.test(lastUserMsg);
  console.log(`📩 User msg: "${lastUserMsg.slice(0, 80)}..." | isProjectQuery=${isProjectQuery} | needsSearch=${needsSearch}`);

  try {
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

      // No tool calls = final response, exit loop
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
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) {
            send('complements', { products: complementIds });
          }
          productsShown = true;
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
          productsShown = true; // checkout = final action, stop looping
        }

        if (tc.function.name === 'analyze_project') {
          // Execute analyze_project and emit products SSE event with the full BOM
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
            const allIds = [...(projectResult.products || []), ...(projectResult.tools || [])].map(p => p.product_id);
            const complementIds = findComplements(allIds);
            if (complementIds.length > 0) {
              send('complements', { products: complementIds });
            }
            if (projectResult.total_before_tax && parseFloat(projectResult.total_before_tax) >= 750) {
              const plan = getFinancingPlan(parseFloat(projectResult.total_before_tax));
              if (plan) send('financing', { total_amount: parseFloat(projectResult.total_before_tax), plan });
            }
            hasSearchResults = true;
            productsShown = true;
          }
        }

        const result = executeTool(tc, lastUserMsg);
        // Track if search_catalog found results
        if (tc.function.name === 'search_catalog') {
          searchRounds++;
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
          const c = chunk.choices[0]?.delta?.content;
          if (c) send('delta', { content: c });
        }
        break;
      }
      // Loop continues — next round will call the model again with tool results
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
        if (delta.content) { send('delta', { content: delta.content }); contentBuffer += delta.content; }
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
          send('products', { products: validProducts });
          const complementIds = findComplements(validProducts.map(p => p.product_id));
          if (complementIds.length > 0) send('complements', { products: complementIds });
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

// ─── GPT Actions API (REST JSON for Custom GPT) ────────

async function handleGpt(req, res) {
  const body = await readBody(req);
  const action = body.action;

  // CORS for ChatGPT
  res.setHeader('Access-Control-Allow-Origin', 'https://chat.openai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, openai-conversation-id, openai-ephemeral-user-id');

  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    switch (action) {
      case 'search': {
        if (!body.query) return json({ error: 'Le paramètre "query" est requis.' }, 400);
        const results = searchCatalogInternal(body.query, body.category)
          .slice(0, Math.min(body.limit || 10, 20))
          .map(p => ({ ...p, currency: 'CAD', in_stock: true }));
        return json({ results, total_found: results.length, catalog_size: catalogData?.products?.length || 0 });
      }
      case 'project': {
        if (!body.project_type) {
          return json({ error: 'Le paramètre "project_type" est requis.', available_types: projectTemplates ? Object.keys(projectTemplates.projects) : [] }, 400);
        }
        const result = analyzeProject(body.project_type, body.dimensions, body.details);
        if (result.error) return json(result, 400);
        // Restructure for GPT-friendly output
        const materials = [...(result.products || [])].map(p => {
          const full = catalogData.products.find(cp => cp.pid === p.product_id);
          return { pid: p.product_id, title: full?.title || p.product_id, price: full ? (full.price.amount / 100).toFixed(2) : '0', quantity: p.quantity, currency: 'CAD' };
        });
        const tools = (result.tools || []).map(p => {
          const full = catalogData.products.find(cp => cp.pid === p.product_id);
          return { pid: p.product_id, title: full?.title || p.product_id, price: full ? (full.price.amount / 100).toFixed(2) : '0', quantity: p.quantity, currency: 'CAD' };
        });
        return json({
          project: { type: result.project_type, name: result.project_name, dimensions: result.dimensions },
          bom_summary: result.bom_summary,
          materials,
          tools,
          pricing: { subtotal: result.total_before_tax, total: result.total_with_tax, currency: 'CAD' },
          note: 'Tous les produits sont disponibles en magasin Matério.'
        });
      }
      case 'stores': {
        const stores = (storesData?.stores || []).map(s => ({ name: s.name, address: s.address, phone: s.phone, services: s.services, hours: s.hours, highlight: s.highlight || null }));
        return json({ stores, total: stores.length, hours_default: storesData?.hours_default || 'lun-ven 7h30-21h, sam 8h-17h, dim 9h-17h' });
      }
      case 'services': {
        if (body.service_type && servicesData?.[body.service_type]) {
          return json({ service: servicesData[body.service_type] });
        }
        return json({ available_services: Object.keys(servicesData || {}).map(k => ({ key: k, name: servicesData[k].name, icon: servicesData[k].icon })) });
      }
      default:
        return json({ name: 'Matério API — Agent Commerce Platform', version: '1.0', endpoints: ['search', 'project', 'stores', 'services'] });
    }
  } catch (err) {
    console.error('GPT API error:', err);
    json({ error: 'Erreur interne du serveur' }, 500);
  }
}

// ─── HTTP Server ───────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url === '/api/gpt' && req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://chat.openai.com');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, openai-conversation-id, openai-ephemeral-user-id');
      res.writeHead(204);
      res.end();
    } else if (url === '/api/gpt' && req.method === 'POST') {
      await handleGpt(req, res);
    } else if (url === '/api/chat' && req.method === 'POST') {
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
            inStock: p.availability.in_stock,
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
