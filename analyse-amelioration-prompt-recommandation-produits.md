# Analyse — Amélioration du prompt pour la recommandation de produits par projet

**Date :** 3 avril 2026  
**Portée :** demo-materio-mvp & demo-patrick-morin-mvp  
**Objectif :** Maximiser la pertinence des produits recommandés lorsqu'un client décrit un projet de rénovation ou construction.

---

## 1. État actuel du système de prompt

### 1.1 Architecture actuelle

Les deux démos (Matério et Patrick Morin) utilisent une architecture similaire :

| Composant | Matério MVP | Patrick Morin MVP |
|-----------|-------------|-------------------|
| Modèle | GPT-4o-mini | GPT-4o |
| Température | ~~0.7~~ → **0.4** ✅ | ~~0.7~~ → **0.4** ✅ |
| Tokens max | ~~1024~~ → **2048** ✅ | **2048** (déjà en place) |
| Outils (function calling) | 6 (show_products, show_services, show_financing, show_estimation, search_catalog, show_checkout) | 2 (show_products, show_checkout) |
| Produits dans le contexte | ~200 échantillons sur 6 978 | ~300 échantillons sur 10 200 (top 3 par ~128 sous-catégories L2) |
| Recherche catalogue complète | ✅ `search_catalog` — forcé round 1 + OR-fallback | ❌ Non implémenté |
| Vente complémentaire | ✅ `COMPLEMENT_MAP` + `findComplements()` | ❌ Non implémenté |
| Fiches projets types | ✅ **7 projets types** + termes de recherche suggérés | ✅ **7 projets types** dans le prompt |
| Formules de calcul | ✅ **12 formules** dans le prompt | ✅ **12 formules** dans le prompt |
| Flux de raisonnement projet | ✅ **8 étapes** — produits d'abord, questions après | ✅ **7 étapes structurées** |
| Règles de vente complémentaire (prompt) | ✅ **13 catégories** (était 7) | ✅ **8 catégories** (était 0) |
| Boucle itérative tool-calling | ✅ **5 rounds** — search(×N) → show_products → texte | ❌ N/A |
| Filtrage contextuel recherche | ✅ Cuisine ≠ salle de bain | ❌ N/A |
| Détection projet (needsSearch) | ✅ **40+ termes** regex | ❌ N/A |

### 1.2 Faiblesses identifiées dans le prompt actuel

#### A. Échantillonnage biaisé du catalogue

**Matério :** L'échantillon injecté dans le prompt est construit en prenant **1 produit par sous-catégorie de niveau 3**, trié par **prix décroissant**. Cela signifie que :
- Le modèle voit d'abord les produits les plus chers, pas les plus pertinents
- Les produits populaires / best-sellers ne sont pas priorisés
- Un projet « petit budget » recevra des suggestions de prix élevé par défaut

**Patrick Morin :** L'échantillon prend **3 produits par sous-catégorie de niveau 2** (~128 sous-catégories), triés par **stock total décroissant**, ce qui donne ~300 produits représentatifs. C'est un meilleur proxy de popularité, mais le score composite proposé en 2.4 serait encore plus efficace.

#### B. Absence de raisonnement projet → matériaux

Le prompt donne des règles de vente complémentaire (bardeaux → papier feutre, clous…) sous forme de liste statique, mais **il ne guide pas le modèle pour décomposer un projet en tâches, puis en catégories de matériaux**. Le modèle doit faire ce raisonnement seul, ce qui mène à des oublis.

Exemple concret :  
> Client : « Je veux refaire ma terrasse 12×16 en bois traité »  
> **Attendu** : madriers de structure, solives, platelage 5/4, vis inox, poteaux 6×6, ancrages, solin, teinture  
> **Obtenu actuellement** : souvent juste du bois + vis, sans ancrages ni teinture ni solin

#### C. Absence de calcul de quantité fiable

Le prompt dit « Calculer les quantités nécessaires quand le client décrit un projet » mais ne fournit **aucune formule de référence**. Le LLM improvise les calculs, ce qui génère des erreurs significatives (ex. : nombre de feuilles de contreplaqué pour un mur, nombre de bardeaux par coverage, etc.).

#### D. ~~Le `search_catalog` est sous-utilisé~~ ✅ CORRIGÉ

~~Le prompt dit « cherche d'abord dans l'échantillon, puis appelle search_catalog si tu ne trouves pas assez ». En pratique, le modèle :~~
1. ~~Trouve un produit approximatif dans l'échantillon et s'en contente~~
2. ~~N'appelle `search_catalog` que si le terme exact est absent~~
3. ~~Ne fait jamais de recherches multiples pour couvrir tous les matériaux d'un projet~~

**Corrections appliquées :**
- `tool_choice` forcé à `search_catalog` au round 1 (au lieu de `"required"` qui laissait le modèle choisir n'importe quel outil)
- Boucle itérative de 5 rounds : le modèle peut faire 2+ recherches avant d'être forcé à `show_products`
- OR-fallback dans la recherche : si AND ne retourne rien, score par nombre de mots matchés
- Filtrage contextuel : les requêtes salle de bain excluent les éviers de cuisine (et vice versa)
- Termes de recherche suggérés dans chaque fiche projet type
- `needsSearch` regex étendu à 40+ termes pour détecter plus de scénarios

#### E. Pas de notion de « projet type »

Le modèle ne possède aucun template de projet. Il doit reconstruire de mémoire ce qu'il faut pour « refaire une toiture » ou « construire un cabanon ». Les LLMs ne sont pas fiables pour ça — ils omettent régulièrement des matériaux essentiels.

#### F. Patrick Morin n'a pas de `search_catalog`

Le MVP Patrick Morin ne peut recommander que les ~300 produits injectés dans le prompt (top 3 par sous-catégorie). Si un projet nécessite un produit absent de l'échantillon, le modèle est bloqué ou hallucine un PID.

---

## 2. Recommandations d'amélioration

### 2.1 Injecter des « fiches projet type » dans le prompt

**Impact : ⬆⬆⬆ Élevé**

Ajouter un bloc `PROJETS TYPES` dans le system prompt avec les catégories de matériaux nécessaires par type de projet. Le modèle utilise cette fiche comme checklist plutôt que de deviner.

```
PROJETS TYPES (catégories de matériaux à couvrir):

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
  Recherches catalog suggérées: "tuile céramique", "robinet salle bain", "membrane douche", "vanité", "douche"
  Questions à poser: douche ou bain? dimensions pièce? ventilation existante?

🏗️ CABANON / REMISE:
  Fondation: blocs de béton ou pieux vissés
  Structure: colombages 2×4, sablière, lisse
  Revêtement extérieur: contreplaqué + papier + vinyle/canexel
  Toiture: fermes ou chevrons, contreplaqué, membrane, bardeaux
  Porte: porte de cabanon ou porte de garage
  Quincaillerie: équerres, ancrages, vis, clous
  Questions à poser: dimensions? permis municipal? fondation souhaitée?
```

### 2.2 Ajouter des formules de quantité dans le prompt

**Impact : ⬆⬆⬆ Élevé**

Le modèle a besoin de références fiables pour calculer les quantités. Injecter un bloc de formules :

```
FORMULES DE CALCUL:
- Bardeaux: 3 paquets par carré (1 carré = 100 pi²). Ajouter 10% pour pertes.
- Contreplaqué 4×8: superficie ÷ 32 pi² = nombre de feuilles. Ajouter 10%.
- Gypse 4×8: (périmètre × hauteur) ÷ 32 pi². Soustraire portes/fenêtres. Ajouter 10%.
- Isolation (rouleau R-20): vérifier la largeur (15" ou 23") selon l'espacement des colombages.
- Vis à gypse: ~300 vis par 1000 pi².
- Clous toiture: ~4 clous/bardeau × ~80 bardeaux/paquet × nombre de paquets.
- Peinture: 1 gallon couvre ~350-400 pi². 2 couches recommandées.
- Bois de platelage 5/4×6×12': superficie terrasse (pi²) ÷ 5.5 pi² par planche de 12'.
- Solives: longueur de terrasse ÷ espacement (16" = 1.33' centre-à-centre) + 1.
- Mortier-colle: ~50 pi² par sac de 25lb (céramique standard).
```

### 2.3 Restructurer le prompt avec un flux de raisonnement projet

**Impact : ⬆⬆ Moyen-élevé**

Ajouter une instruction de raisonnement structuré quand le client décrit un projet :

```
FLUX DE RECOMMANDATION PROJET:
Quand un client décrit un projet (pas une demande de produit spécifique):
1. IDENTIFIER le type de projet → consulter la fiche projet type correspondante
2. POSER 2-3 questions clés pour dimensionner (dimensions, contraintes, préférences)
3. CALCULER les quantités avec les formules de calcul
4. CHERCHER les produits: d'abord dans l'échantillon, puis search_catalog pour chaque catégorie de matériaux
5. PRÉSENTER en 3 sections:
   a) Matériaux principaux (structure, revêtement)
   b) Quincaillerie et fixation
   c) Accessoires et finition
6. TOTALISER et proposer financement si > 750$
7. PROPOSER les services pertinents (livraison, coupe, estimation)
```

### 2.4 Améliorer la stratégie d'échantillonnage du catalogue

**Impact : ⬆⬆ Moyen-élevé**

Remplacer le tri par prix (Matério) ou par stock (Patrick Morin) par un score composite :

```javascript
// Score de pertinence pour l'échantillonnage
function productScore(p) {
  let score = 0;
  // Les produits en stock sont plus utiles
  if (p.availability.in_stock) score += 50;
  // Favoriser les prix moyens (le cœur de gamme)
  const price = p.price.amount / 100;
  if (price >= 5 && price <= 500) score += 30;
  // Favoriser les grandes marques connues
  if (p.brand && p.brand.length > 0) score += 10;
  // Pénaliser les produits saisonniers / déco
  if (p.category?.includes('SAISONNIER') || p.category?.includes('Ornement')) score -= 20;
  // Bonus pour les catégories « cœur de métier »
  const core = ['Bois', 'Quincaillerie', 'Plomberie', 'Électricité', 'Toiture', 'Isolation', 'Peinture'];
  if (core.some(c => p.category?.includes(c))) score += 20;
  return score;
}
```

Cela garantit que l'échantillon visible par le modèle contient les produits les plus utiles pour des projets de rénovation réels, pas des plantes décoratives à 7,99 $.

### 2.5 Implémenter `search_catalog` dans Patrick Morin

**Impact : ⬆⬆ Moyen-élevé**

Copier le pattern de Matério : ajouter un outil `search_catalog` qui fouille le catalogue complet. Sans ça, le MVP Patrick Morin est fondamentalement limité à ~150 produits.

### 2.6 Forcer les recherches multiples pour les projets

**Impact : ⬆⬆ Moyen** → ✅ **Implémenté via boucle itérative multi-rounds**

~~Le modèle appelle `search_catalog` une seule fois, puis répond.~~

**Solution implémentée :** Au lieu d'un outil `search_catalog_multi`, la boucle itérative a été étendue à **5 rounds** avec une logique de forçage progressive :

```
Round 1: tool_choice = forced:search_catalog (si needsSearch détecte un projet)
Round 2: tool_choice = auto (le modèle peut faire d'autres search_catalog)
Round 3: tool_choice = forced:show_products (si searchRounds ≥ 2 et hasSearchResults)
Round 4: texte final après show_products
Round 5: fallback si besoin
```

Cela permet au modèle de faire **2-3 recherches** (ex: "tuile céramique", "robinet salle bain", "membrane douche") avant d'être forcé à afficher les produits.

**Améliorations complémentaires :**
- `search_catalog` utilise un **OR-fallback** : si AND matching retourne 0 résultat pour une requête multi-mots, il passe en score par nombre de mots matchés
- **Filtrage contextuel** : les requêtes salle de bain excluent automatiquement les produits "évier de cuisine" (et vice versa), car la catégorie Matério "Cuisine et salle de bain" créait de la pollution croisée
- **Termes de recherche suggérés** ajoutés dans chaque fiche projet type (ex: salle de bain → "tuile céramique", "robinet salle bain", "membrane douche", "vanité", "douche")

### 2.7 Ajouter un outil `analyze_project` dédié

**Impact : ⬆⬆ Moyen**

Créer un nouvel outil `analyze_project` qui décharge le raisonnement du modèle vers du code déterministe :

```javascript
{
  type: "function",
  function: {
    name: "analyze_project",
    description: "Analyser un projet de rénovation et retourner la liste complète des catégories de matériaux nécessaires avec les quantités estimées. Appeler AVANT show_products pour les projets complexes.",
    parameters: {
      type: "object",
      properties: {
        project_type: { type: "string", enum: ["toiture", "terrasse", "sous_sol", "salle_de_bain", "cabanon", "cloture", "peinture_interieure", "plancher", "cuisine", "autre"] },
        dimensions: { type: "string", description: "Dimensions du projet (ex: '12x16 pieds', '200 pi²')" },
        details: { type: "string", description: "Détails supplémentaires fournis par le client" }
      },
      required: ["project_type"]
    }
  }
}
```

L'exécution côté serveur retournerait une checklist préremplie avec des recherches catalogue automatiques, éliminant le besoin de deviner du modèle.

### 2.8 Réduire la température pour les recommandations techniques

**Impact : ⬆ Moyen-faible**

La température actuelle de `0.7` est raisonnable pour le ton conversationnel, mais elle introduit de la variabilité dans les calculs de quantité et les recommandations de produits. Options :

- **Approche simple :** Réduire à `0.4` globalement — le ton reste naturel, les calculs sont plus stables
- **Approche avancée :** Utiliser un premier appel à `temperature: 0.2` pour l'analyse projet/produits, puis un second à `0.7` pour la rédaction de la réponse (double-pass)

### 2.9 Augmenter `max_tokens` pour les réponses projet

**Impact : ⬆ Moyen-faible**

Avec `max_tokens: 1024`, une recommandation de projet complète (10+ produits, quantités, prix, services) est souvent tronquée. Augmenter à `2048` pour les réponses qui impliquent un appel `show_products` avec plus de 5 items.

### 2.10 Ajouter un contexte conversationnel structuré

**Impact : ⬆ Faible-moyen**

Actuellement, la conversation est trimmée à 20 messages (`messages.slice(-20)`). Pour les projets complexes où le client donne des détails progressivement, ajouter un mécanisme de résumé de projet :

```
Si la conversation dépasse 10 messages et concerne un même projet, 
résume les spécifications confirmées jusqu'ici avant de recommander:
"Projet confirmé: terrasse 12×16, bois traité, hauteur 24", escalier 3 marches, garde-corps."
```

---

## 3. Amélioration du `COMPLEMENT_MAP`

Le `COMPLEMENT_MAP` actuel (Matério uniquement) est statique et limité. Améliorations proposées :

### 3.1 Ajouter des catégories manquantes

```javascript
// Catégories à ajouter au COMPLEMENT_MAP
{ match: ['escalier', 'marche'], searches: ['nez de marche', 'limon escalier', 'garde-corps', 'balustre', 'main courante'] },
{ match: ['cabanon', 'remise'], searches: ['équerre charpente', 'vis construction', 'contreplaqué', 'bardeau', 'porte cabanon'] },
{ match: ['armoire', 'cuisine'], searches: ['poignée armoire', 'charnière', 'vis armoire', 'moulure couronne'] },
{ match: ['électrique', 'prise', 'interrupteur'], searches: ['fil électrique', 'boîte électrique', 'connecteur marrette', 'plaque interrupteur'] },
{ match: ['carrelage', 'céramique', 'tuile'], searches: ['mortier-colle', 'coulis', 'croisillons', 'truelle dentelée', 'coupe-carreaux'] },
```

### 3.2 Rendre le COMPLEMENT_MAP bidirectionnel et pondéré

Actuellement, acheter des « bardeaux » propose des clous. Mais acheter des « clous à toiture » ne propose pas de bardeaux. Ajouter une logique de relation bidirectionnelle avec une confiance :

```javascript
const PRODUCT_RELATIONS = [
  { products: ['bardeau', 'toiture'], complements: ['clou toiture', 'papier feutre', 'solin'], confidence: 'high' },
  { products: ['clou toiture'], complements: ['bardeau', 'papier feutre'], confidence: 'medium' },
];
```

---

## 4. Priorisation des améliorations

| # | Amélioration | Effort | Impact | Statut |
|---|-------------|--------|--------|--------|
| 2.1 | Fiches projet type dans le prompt | Faible (texte) | ⬆⬆⬆ | ✅ **Implémenté** — 7 projets types ajoutés (Matério + Patrick Morin) |
| 2.2 | Formules de quantité | Faible (texte) | ⬆⬆⬆ | ✅ **Implémenté** — 12 formules ajoutées (Matério + Patrick Morin) |
| 2.3 | Flux de raisonnement structuré | Faible (texte) | ⬆⬆ | ✅ **Implémenté** — 7 étapes ajoutées (Matério + Patrick Morin) |
| 2.4 | Meilleur échantillonnage catalogue | Moyen (code) | ⬆⬆ | 🟡 Sprint suivant |
| 2.5 | search_catalog pour Patrick Morin | Moyen (code) | ⬆⬆ | 🟡 Sprint suivant |
| 2.6 | Recherches multiples pour projets | Moyen (code) | ⬆⬆ | ✅ **Implémenté** — boucle 5 rounds, OR-fallback, filtrage contextuel, termes suggérés |
| 2.7 | Outil analyze_project | Élevé (code) | ⬆⬆ | 🟠 V2 |
| 2.8 | Réduire la température | Faible (config) | ⬆ | ✅ **Implémenté** — 0.7 → 0.4 (Matério + Patrick Morin) |
| 2.9 | Augmenter max_tokens | Faible (config) | ⬆ | ✅ **Implémenté** — 1024 → 2048 (Matério) · Patrick Morin déjà à 2048 |
| 2.10 | Résumé conversationnel | Moyen (code) | ⬆ | 🟠 V2 |
| 3.1 | Compléter COMPLEMENT_MAP | Faible (données) | ⬆ | ✅ **Implémenté** — 6 entrées ajoutées (escalier, cabanon, armoire, électrique, céramique) |
| 3.2 | Relations bidirectionnelles | Moyen (code) | ⬆ | 🟠 V2 |

---

## 5. Mesures de succès

Pour valider l'impact des améliorations, implémenter des métriques :

| Métrique | Description | Cible |
|----------|-------------|-------|
| **Produits par projet** | Nombre moyen de produits distincts recommandés quand le client décrit un projet | ≥ 8 (vs ~3-4 actuellement) |
| **Taux de couverture projet** | % des catégories de matériaux nécessaires effectivement recommandées | ≥ 85% |
| **Panier moyen** | Valeur moyenne du panier pour les conversations « projet » | +40% vs baseline |
| **Précision quantité** | Écart entre quantité recommandée et quantité réelle nécessaire | ≤ 15% d'erreur |
| **Appels search_catalog** | Nombre moyen d'appels par conversation « projet » | ≥ 3 |
| **Taux d'ajout au panier** | % des produits recommandés effectivement ajoutés au panier | Mesurer baseline d'abord |

### 5.1 Tests de validation — Résultats

Jeu de 10 scénarios de test standardisés, exécutés avant et après les améliorations :

| # | Scénario | Avant | Après | Produits | Compléments |
|---|----------|-------|-------|----------|-------------|
| 1 | Toiture 30×40, 2 versants | ❌ 0 produits | ✅ 5 produits | bardeaux, membrane | clous, solin, évent, papier feutre, scellant |
| 2 | Terrasse 12×16 bois traité | ❌ 0 produits | ✅ 3 produits | bois traité, vis | teinture, ancrage, équerre, solin, vis terrasse |
| 3 | Sous-sol 600 pi² | ❌ 0 produits | ✅ 3 produits | gypse, isolant | vis gypse, ruban, composé, pare-vapeur |
| 4 | Salle de bain céramique 3×5 | ❌ 0 produits | ✅ 10 produits | tuiles céramique, membrane Kerdi, robinet | mortier, coulis, silicone, truelle |
| 5 | Cabanon 10×12 | ❌ 0 produits | ✅ 5 produits | remises préfabriquées | équerres, vis, contreplaqué, bardeau |
| 6 | Clôture 80 pi lin. | ❌ 0 produits | ✅ 3 produits | bois traité, poteaux | vis terrasse, teinture, poteau |
| 7 | Peinture 1200 pi² | ✅ 5 produits | ✅ 10 produits | peinture intérieure | rouleaux, pinceaux, ruban peintre |
| 8 | Plancher vinyle 150 pi² | ❌ 0 produits | ✅ 10 produits | vinyle SPC, plancher | sous-couche |
| 9 | 5 fenêtres + porte patio | ❌ 0 produits | ✅ 4 produits | fenêtres, porte patio | calfeutrage, mousse, solin, vis |
| 10 | Revêtement ext. 1500 pi² | ❌ 0 produits | ✅ 10 produits | revêtement canexel | clous, solin, papier |

**Score global : 1/10 → 10/10** (objectif ≥ 8/10 atteint)

Scripts de test : `test-scenarios.mjs`, `test-bathroom.mjs`

---

## 6. Conclusion

La faiblesse principale du système actuel n'est pas le modèle lui-même, mais **le manque de connaissance métier structurée dans le prompt**. Le LLM est compétent en conversation et en fonction calling, mais il n'a pas les références nécessaires (fiches projets, formules de calcul) pour faire un travail de conseiller en quincaillerie.

### ✅ Changements implémentés (3 avril 2026)

Toutes les améliorations ont été appliquées aux deux MVPs (sauf mention contraire) :

| # | Changement | Matério | Patrick Morin |
|---|-----------|---------|---------------|
| 1 | 7 fiches projets types + termes de recherche suggérés par projet | ✅ `server.js` + `api/chat.js` | ✅ `api/chat.js` |
| 2 | 12 formules de calcul de quantité | ✅ | ✅ |
| 3 | Flux de raisonnement projet en 8 étapes (produits d'abord, questions après) | ✅ | ✅ |
| 4 | Température 0.7 → 0.4 (Pass 1 + Pass 2) | ✅ | ✅ |
| 5 | max_tokens 1024 → 2048 | ✅ | Déjà à 2048 |
| 6 | 6 nouvelles entrées COMPLEMENT_MAP (escalier, cabanon, armoire, électrique, céramique) | ✅ | N/A (pas de COMPLEMENT_MAP) |
| 7 | 6 nouvelles règles de vente complémentaire dans le prompt | ✅ (13 total) | ✅ (8 total, était 0) |
| 8 | `tool_choice` forcé à `search_catalog` round 1 (au lieu de `"required"`) | ✅ | N/A |
| 9 | Suppression de l'auto-display qui court-circuitait la boucle | ✅ | N/A |
| 10 | Message `next_step` renforcé dans `search_catalog` (force `show_products`) | ✅ | N/A |
| 11 | `needsSearch` regex étendu à 40+ termes (comptoir, évier, matériaux, coût…) | ✅ | N/A |
| 12 | Boucle itérative 5 rounds avec `searchRounds` tracking | ✅ | N/A |
| 13 | Force `show_products` après ≥2 rounds de recherche (flag `hasSearchResults`) | ✅ | N/A |
| 14 | OR-fallback dans `search_catalog` (score par mots si AND = 0) | ✅ | N/A |
| 15 | Filtrage contextuel cuisine ≠ salle de bain dans `search_catalog` | ✅ | N/A |

**Résultat test 10 scénarios : 1/10 → 10/10** ✅

### 🟡 Prochaines étapes (Sprint suivant)

1. **Meilleur échantillonnage catalogue** — Score composite remplaçant le tri par prix/stock
2. **`search_catalog` pour Patrick Morin** — Débloquer les ~150 produits vers le catalogue complet

### 🟠 V2

1. Outil `analyze_project` — Raisonnement projet déterministe côté serveur
2. Résumé conversationnel — Suivi de projet sur conversations longues
3. Relations bidirectionnelles dans COMPLEMENT_MAP
4. `search_catalog_multi` — Recherche multi-termes en un seul appel (si la latence des multi-rounds est problématique)
