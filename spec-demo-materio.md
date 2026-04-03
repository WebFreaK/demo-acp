# Spécification et plan d'implémentation — Démo Matério

**Date :** 2 avril 2026  
**Document :** Spécification technique détaillée et plan d'exécution pas à pas  
**Référence :** analyse-demo-materio.md

---

## TABLE DES MATIÈRES

1. [Objectifs de la démo](#1-objectifs-de-la-démo)
2. [Architecture technique](#2-architecture-technique)
3. [Données produits — Extraction et structuration](#3-données-produits--extraction-et-structuration)
4. [Interface de la démo — Spécification UI](#4-interface-de-la-démo--spécification-ui)
5. [Scénarios conversationnels — Scripts détaillés](#5-scénarios-conversationnels--scripts-détaillés)
6. [Logique services intégrés (coupe, estimation, livraison, financement)](#6-logique-services-intégrés)
7. [Mockup checkout ACP](#7-mockup-checkout-acp)
8. [Production vidéo](#8-production-vidéo)
9. [Documents commerciaux](#9-documents-commerciaux)
10. [Plan d'exécution semaine par semaine](#10-plan-dexécution-semaine-par-semaine)
11. [Stack technique et outils](#11-stack-technique-et-outils)
12. [Critères de qualité / Definition of Done](#12-critères-de-qualité--definition-of-done)

---

## 1. Objectifs de la démo

### 1.1 Objectif principal

Convaincre la direction de Matério de signer un contrat d'intégration ACP / ChatGPT Commerce en montrant un prototype fonctionnel avec **leurs vrais produits, leurs vrais prix, leurs vrais magasins et leurs vrais services différenciants** (centre de coupe, livraison spécialisée, estimation, financement).

### 1.2 Objectifs mesurables

| # | Objectif | Critère de succès |
|---|---|---|
| O1 | Montrer la valeur B2C | Le prospect dit : « Je vois comment ça génère des ventes » |
| O2 | Montrer la valeur Services | Le prospect dit : « L'IA vend même notre centre de coupe et notre livraison spécialisée » |
| O3 | Montrer la valeur B2B (Entrepreneurs/Autoconstructeurs) | Le prospect dit : « Mes autoconstructeurs et entrepreneurs utiliseraient ça » |
| O4 | Créer l'urgence concurrentielle | Le prospect demande : « Quand est-ce qu'on peut commencer ? » |
| O5 | Justifier l'investissement | Le prospect comprend le ROI en < 3 mois |
| O6 | Paraître crédible et professionnel | La démo utilise les vrais produits Matério, pas des données fictives |
| O7 | Démontrer l'avantage « premier canal conversationnel » | Le prospect réalise que Matério n'a aucun chat existant et que c'est une opportunité |

### 1.3 Livrables finaux

| Livrable | Format | Usage |
|---|---|---|
| **Démo interactive web** | Application HTML/JS hébergée | Présentation en personne ou visioconférence |
| **Vidéo démo** | MP4, 2-3 minutes, voiceover FR | Envoi par email/LinkedIn, consultation asynchrone |
| **Teaser vidéo** | MP4, 30-45 secondes | Premier contact LinkedIn/courriel |
| **Proposition commerciale** | PDF, 4-6 pages | Accompagne la démo |
| **One-pager** | PDF, 1 page | Pièce jointe initiale |

---

## 2. Architecture technique

### 2.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                    DÉMO INTERACTIVE (MVP)                     │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │  Panel gauche    │    │    Panel droit                    │ │
│  │                  │    │                                   │ │
│  │  Chat GPT-4o     │    │  Fiches produits Matério          │ │
│  │  (IA réelle)     │    │  (images réelles,                 │ │
│  │                  │    │   prix, stock, magasin)           │ │
│  │  Conversation    │◄──►│  Mise à jour dynamique            │ │
│  │  temps réel      │    │  via function calling             │ │
│  │  SSE streaming   │    │  (show_products, show_services,   │ │
│  │                  │    │   show_checkout, show_financing)  │ │
│  └─────────────────┘    └──────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Barre de métriques en bas                   │ │
│  │  Temps: 120s │ Produits: 6 │ Panier: 3 200$ │ Services │ │
│  │  📍 Saint-Jérôme │ 🔧 Coupe réservée │ 🚚 Livraison   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
             │                          │
             ▼                          ▼
 ┌──────────────────────┐  ┌────────────────────┐
 │   OpenAI GPT-4o API    │  │  Stripe Checkout    │
 │   (function calling)  │  │  (paiement réel)    │
 └──────────────────────┘  └────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   Données produits    │
              │   (Magento 2 scrape   │
              │   ou REST API)        │
              │   ~10 000+ vrais      │
              │   produits Matério    │
              │   + 6 magasins        │
              └──────────────────────┘
```

### 2.2 Stack technique de la démo

| Composant | Technologie | Justification |
|---|---|---|
| **Application démo** | Node.js + HTML/CSS/JS vanilla | Réutilisation du template Patrick Morin éprouvé, adapté pour Matério |
| **Données produits** | JSON dynamique (`catalog-materio.json`) | Extrait via scraping Magento 2 (REST API ou HTML), rafraîchissement périodique |
| **Chat IA** | OpenAI GPT-4o avec function calling + SSE streaming | Conversations en temps réel, recommandation de produits + services |
| **Paiement** | Stripe Checkout (réel) | Checkout fonctionnel avec taxes QC et calcul financement |
| **Animations** | CSS transitions + JS requestAnimationFrame | Streaming token-by-token, cascade de cartes produits |
| **Images produits** | URLs Magento 2 (images hébergées sur materio.ca) | Vrais visuels = crédibilité |
| **Hébergement** | Vercel (Serverless Functions) | Déploiement serverless pour les API endpoints |
| **Scraper** | Node.js + Magento 2 REST API / HTML scraping | Extraction du catalogue complet |

### 2.3 Différences clés vs. démo Patrick Morin

| Aspect | Patrick Morin | Matério | Impact technique |
|---|---|---|---|
| **Source de données** | API Bloomreach Discovery | Magento 2 natif (REST API ou HTML scraping) | Scraper différent à développer |
| **Magasins** | 23 succursales | 6 succursales | Complexité réduite sur le stock multi-magasins |
| **Services intégrés** | Non (seulement produits + checkout) | Oui : coupe, estimation, livraison, financement | **4 nouvelles fonctions** à implémenter |
| **Programme B2B** | PM PRO (escompte 10%) | Compte charge/comptant (autoconstructeurs/entrepreneurs) | Logique de facturation au compte |
| **Chat existant** | Widget de chat sur le site | Aucun | Pitch de « premier canal conversationnel » |
| **Langue** | FR + EN | FR uniquement | Simplifié |

### 2.4 Structure de fichiers

```
demo-materio-mvp/
├── server.js              # Serveur local HTTP (dev sans Vercel)
├── package.json           # Dépendances (openai, stripe, node-cron)
├── vercel.json            # Config déploiement Vercel (serverless)
├── .env.example           # Template variables d'environnement
├── api/
│   ├── chat.js           # OpenAI GPT-4o streaming + function calling
│   │                     # Functions: show_products, show_services, 
│   │                     #            show_checkout, show_financing,
│   │                     #            show_estimation
│   └── checkout.js       # Stripe Checkout Session (Vercel)
├── data/
│   ├── catalog-materio.json  # Catalogue ~10 000+ produits (scraping Magento 2)
│   ├── stores.json           # 6 magasins avec coordonnées et services
│   └── services.json         # Définition des services (coupe, livraison, financement)
├── public/
│   ├── index.html       # Interface split-screen (Chat + produits + services)
│   ├── success.html     # Page post-paiement Stripe
│   ├── cancel.html      # Page annulation Stripe
│   ├── css/
│   │   └── style.css     # Thème ChatGPT dark + branding Matério
│   ├── js/
│   │   ├── app.js        # Logique chat, SSE streaming, panier, Stripe, services
│   │   ├── products.js   # Fallback catalogue
│   │   ├── services.js   # UI des cartes services (coupe, livraison, financement)
│   │   └── animations.js # Markdown rendering, thinking dots, cascade
│   └── assets/
│       └── images/
│           └── products/  # Images produits locales (si nécessaire)
├── scraper/
│   ├── index.js         # Scraper Magento 2 REST API
│   ├── html-fallback.js # Scraper HTML fallback si API REST inaccessible
│   └── cron.js          # Planificateur de rafraîchissement
└── docs/
    ├── proposition.md   # Proposition commerciale
    └── one-pager.md     # Résumé 1 page
```

---

## 3. Données produits — Extraction et structuration

### 3.1 Stratégie d'extraction

Matério utilise Magento 2 comme plateforme e-commerce. Contrairement à Patrick Morin qui exposait une API Bloomreach Discovery, Matério utilise probablement l'infrastructure Magento native. Trois approches sont envisagées :

#### Approche A — Magento 2 REST API (prioritaire)

Tester les endpoints Magento 2 standard :
```
GET https://www.materio.ca/rest/V1/products?searchCriteria[pageSize]=100&searchCriteria[currentPage]=1
GET https://www.materio.ca/rest/V1/categories
GET https://www.materio.ca/rest/V1/products?searchCriteria[filter_groups][0][filters][0][field]=category_id&searchCriteria[filter_groups][0][filters][0][value]=3
```

**Avantage :** Données structurées, pagination native, JSON direct  
**Risque :** L'API REST peut être protégée par authentification ou désactivée

#### Approche B — Magento 2 GraphQL

```graphql
{
  products(search: "bois traité", pageSize: 50, currentPage: 1) {
    total_count
    items {
      sku
      name
      price_range { minimum_price { final_price { value currency } } }
      description { html }
      image { url }
      categories { name breadcrumbs { category_name } }
    }
  }
}
```

**Endpoint :** `POST https://www.materio.ca/graphql`  
**Avantage :** Plus flexible, requêtes ciblées  
**Risque :** Peut être désactivé ou limité

#### Approche C — HTML Scraping (fallback)

Scraper le catalogue via les pages de recherche Magento :
```
https://www.materio.ca/catalogsearch/result/?q={terme}&product_list_limit=48&p={page}
https://www.materio.ca/{categorie}?product_list_limit=48&p={page}
```

Données observées dans le HTML :
- **Titre** : `<a class="product-item-link">`
- **Prix actuel** : `<span class="price">`
- **Prix original** : `<span class="old-price">`
- **SKU** : Dans l'URL du produit (ex: `ct03741`)
- **Image** : `<img class="product-image-photo">`
- **Marque** : Dans le texte du produit (ex: "LEBEL CAMBIUM")
- **Catégorie** : Via la breadcrumb du listing

**Avantage :** Fonctionne toujours  
**Inconvénient :** Plus fragile, pas de stock par magasin nativement

### 3.2 Plan d'extraction par priorité

| Étape | Action | Durée estimée |
|---|---|---|
| 1 | Tester `GET /rest/V1/products` (API REST Magento) | 30 min |
| 2 | Tester `POST /graphql` (API GraphQL Magento) | 30 min |
| 3 | Si APIs indisponibles → implémenter scraper HTML par catégorie | 3-4h |
| 4 | Scraper les 10 catégories principales par pagination | 2-3h |
| 5 | Extraire les fiches produit individuelles pour données complètes | 2-3h |
| 6 | Structurer en `catalog-materio.json` | 1-2h |
| **Total** | | **5 – 8h** |

### 3.3 Catégories à extraire

| Catégorie | URL | Produits estimés | Priorité |
|---|---|---|---|
| **Matériaux** | `/materiaux` | 2 532 | P0 — Scénarios 1, 3 |
| **Quincaillerie et Outillage** | `/quincaillerie-et-outillage` | ~2 000+ | P0 — Tous scénarios |
| **Plomberie** | `/plomberie` | ~800+ | P1 — Scénario secondaire |
| **Peinture** | `/peinture` | ~600+ | P1 — Scénario finition |
| **Couvre-plancher** | `/couvre-plancher` | ~600+ | P1 |
| **Électricité** | `/electricite` | ~800+ | P1 |
| **Saisonnier** | `/saisonnier` | ~1 500+ | P2 |
| **Décoration** | `/decoration` | ~500+ | P2 |
| **Poêles et Foyers** | `/poeles-et-foyers` | ~300+ | P2 |
| **Poutrelles** | `/poutrelles` | ~100+ | P2 |

### 3.4 Produits ciblés par scénario de démo

#### Scénario 1 — « Le projet toiture » (25 produits cibles)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Bardeaux | Bardeaux d'asphalte Dakota BP (noir, brun, gris), bardeaux GAF | 4 |
| Accessoires toiture | Membrane sous-toiture, clous à toiture, solin aluminium, faîtière | 5 |
| Ventilation toiture | Ventilateur de faîte, évents de toit, Maximum | 3 |
| Isolation | Rockwool, Owens Corning, membrane Soprema | 3 |
| Bois de structure | Chevrons, contreplaqué, fourrures, liteaux | 4 |
| Outils | Cloueuse à bardeaux, couteau à bardeaux, marteau de couvreur | 3 |
| Scellant | Scellant toiture, goudron, ciment plastique | 3 |

#### Scénario 2 — « Le comptoir sur mesure » (15 produits cibles)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Comptoirs | Comptoir bambou 1½×25×96 naturel, stratifié, butcher block | 3 |
| Éviers | Ensemble évier tout-en-un Technoform, évier simple, double | 3 |
| Robinetterie | Robinet cuisine monotrou, robinet extraction, flexible | 3 |
| Quincaillerie | Vis comptoir, supports L, colle de montage, silicone | 3 |
| Finition | Bande de chant, profil d'aluminium, cédule de coupe | 3 |

#### Scénario 3 — « Commande chantier autoconstructeur » (25 produits cibles)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Bois de charpente | 2×4×8, 2×4×10, 2×6×8, 2×6×10, 4×4×8 | 5 |
| Isolation | Rockwool R-24, polystyrène, pare-vapeur | 4 |
| Gypse | Gypse 1/2×4×8 standard, résistant humidité | 3 |
| Composés | Composé à joints, ruban, vis à gypse | 3 |
| Panneaux | OSB 7/16, contreplaqué 3/4, aspenite | 3 |
| Quincaillerie structure | Équerres Simpson, supports, clous charpente, boulons | 4 |
| Fenêtres/portes | Fenêtre coulissante, porte extérieure Jeld-Wen | 3 |

#### Scénario 4 — « Estimation augmentée IA » (pas de produits spécifiques nécessaires — utilise le catalogue complet)

#### Produits additionnels pour crédibilité (10 produits)

Produits de la circulaire / vedettes du site :

| Produit (observé sur le site) | Marque | Prix observé |
|---|---|---|
| Peinture intérieure plafond MF Expérience 3.78L | Peintures MF | 26,98 $ (rég. 32,99 $) |
| Comptoir en bambou 1½×25×96 naturel | — | En circulaire |
| Pavillon permanent Ventura 10×10 acier toit double | Sojag | 1 049,98 $ (rég. 1 299,99 $) |
| Ensemble évier cuisine tout-en-un 29×16×9 | Technoform | 269,98 $ (rég. 369,99 $) |
| Planche composite Prime Dark Teak 5½×12 rainuré | — | 40,56 $ (rég. 45,99 $) |
| Cadrage MDF prépeint B4F 3/8×2⅛×7pi | Alexandria | 2,28 $ (rég. 2,69 $) |
| Bardeau d'asphalte Dakota brun 2 tons | BP | 41,99 $ |
| Clôture intimité bois traité tanatone 5×8pi | Lebel Cambium | 94,99 $ |
| Porte intérieure prémontée Rockport | — | En circulaire |
| Ensemble bâti porte simple MDF apprêt blanc | Alexandria | 20,98 $ (rég. 27,99 $) |

### 3.5 Format de données ACP (structure cible)

```json
{
  "metadata": {
    "merchant": "Matério",
    "extracted_at": "2026-04-07T14:00:00Z",
    "total_products": 10250,
    "total_stores": 6,
    "source": "materio.ca (Magento 2)"
  },
  "products": [
    {
      "pid": "TO02212",
      "title": "Bardeau d'asphalte DAKOTA brun 2 tons",
      "description": "Bardeau d'asphalte Dakota par BP. Couvre 32.3 pi². Couleur brun 2 tons. Garantie limitée 25 ans.",
      "url": "https://www.materio.ca/bardeaux-a-toiture-dakota-brun-2-tons-to02212",
      "image_url": "https://www.materio.ca/media/catalog/product/cache/...",
      "price": {
        "amount": 4199,
        "currency": "CAD",
        "original_amount": null
      },
      "brand": "BP",
      "category": "Matériaux > Toiture > Bardeaux",
      "availability": {
        "in_stock": true,
        "quantity_by_store": {
          "Saint-Jérôme": 250,
          "Terrebonne": 180,
          "Sainte-Sophie": 120,
          "Saint-Hippolyte": 45,
          "Mirabel (Saint-Antoine)": 60,
          "Mirabel (Saint-Benoît)": 40
        },
        "total_stock": 695
      },
      "shipping": {
        "available": true,
        "specialized": true,
        "specialized_options": ["livraison_toit", "plateforme", "camion_girafe"],
        "pickup_in_store": true,
        "pickup_delay": "24h"
      },
      "services": {
        "centre_de_coupe": false,
        "estimation": true,
        "financement_eligible": true
      },
      "attributes": {
        "coverage_sqft": 32.3,
        "warranty": "25 ans",
        "color": "Brun 2 tons"
      },
      "locale": "fr_CA"
    }
  ],
  "stores": [
    {
      "id": "store-st-jerome",
      "name": "Saint-Jérôme",
      "address": "2159, boulevard Curé-Labelle, Saint-Jérôme (Qc) J7Y 1T1",
      "phone": "450-438-3577",
      "coordinates": { "lat": 45.7833, "lng": -74.0000 },
      "hours": {
        "lun-ven": "7h30-21h",
        "sam": "8h-17h",
        "dim": "9h-17h"
      },
      "services": {
        "centre_de_coupe": true,
        "livraison_specialisee": true,
        "estimation": true,
        "financement": true,
        "ouverture_compte": true
      },
      "surface_magasin_sqft": 39000,
      "cour_bois_sqft": 500000,
      "note": "Plus grande cour à bois des Laurentides"
    }
  ],
  "services": {
    "centre_de_coupe": {
      "description": "Service exclusif de coupe sur mesure",
      "available_stores": ["Saint-Jérôme", "Terrebonne", "Sainte-Sophie"],
      "capabilities": [
        "Mélamine — coupe + bande de chant",
        "Marches d'escalier — coupe + nez de marche",
        "Comptoir — coupe 45/90, trou évier, finition extrémités",
        "Plancher/céramique — moulures de transition",
        "Porte panneau — usinage complet, modification",
        "Bois traité — fabrication sur mesure",
        "Aluminium — coupe et pliage (10' max)",
        "Porte extérieure — perçage pêne dormant",
        "Plexiglas — coupe et perçage"
      ]
    },
    "livraison_specialisee": {
      "description": "Parc de 35 véhicules spécialisés",
      "vehicles": ["camions-girafe", "mât articulé", "plateformes", "cubes"],
      "capabilities": ["Livraison sur le toit", "Jusqu'au 4e étage", "Dépôt stratégique chantier"],
      "schedule": "Lundi au samedi",
      "all_stores": true
    },
    "financement": {
      "description": "Financement sans frais ni intérêts",
      "plans": [
        { "min": 750, "max": 2499, "months": 12 },
        { "min": 2500, "max": 4999, "months": 18 },
        { "min": 5000, "max": 7499, "months": 24 },
        { "min": 7500, "max": 10000, "months": 36 }
      ],
      "conditions": "Taxes et livraison payables à l'achat. Sous réserve approbation crédit."
    },
    "estimation": {
      "description": "Service de soumission pour projets de rénovation et construction neuve",
      "available_stores": ["Saint-Jérôme", "Terrebonne", "Saint-Hippolyte", "Sainte-Sophie", "Mirabel (Saint-Benoît)"],
      "contact": "Via formulaire web ou téléphone"
    },
    "programme_fidelite": {
      "name": "Carte Matério",
      "earn_rate": "1 point par 1$ d'achat",
      "redeem": "1000 points = 10$ de rabais",
      "cost": "Gratuit",
      "partial_redemption": true
    }
  }
}
```

### 3.6 Données magasins détaillées (`stores.json`)

```json
{
  "stores": [
    {
      "id": "store-st-jerome",
      "name": "Saint-Jérôme",
      "address": "2159, boulevard Curé-Labelle, Saint-Jérôme (Qc) J7Y 1T1",
      "phone": "450-438-3577",
      "google_maps": "https://goo.gl/maps/1m4cvbxFq3DKHv9YA",
      "surface_magasin": "39 000 pi²",
      "cour_bois": "500 000 pi²",
      "highlight": "Plus grande cour à bois des Laurentides",
      "services": ["centre_de_coupe", "livraison", "estimation", "financement", "compte"],
      "year_opened": 1987
    },
    {
      "id": "store-terrebonne",
      "name": "Terrebonne",
      "address": "7700, boulevard Laurier, Terrebonne (Qc) J7M 2K8",
      "phone": "450-478-7557",
      "google_maps": "https://goo.gl/maps/iVV7aRMuVwGvVWsC7",
      "surface_magasin": "42 000 pi²",
      "cour_bois": "350 000 pi²",
      "services": ["centre_de_coupe", "livraison", "estimation", "financement", "compte"],
      "year_opened": 2005
    },
    {
      "id": "store-st-hippolyte",
      "name": "Saint-Hippolyte",
      "address": "Saint-Hippolyte (Qc)",
      "phone": "450-224-8555",
      "surface_magasin": "20 000 pi²",
      "cour_bois": "105 000 pi²",
      "services": ["livraison", "estimation", "financement", "compte"],
      "year_opened": 2017
    },
    {
      "id": "store-mirabel-st-antoine",
      "name": "Mirabel (Saint-Antoine)",
      "address": "Mirabel (Qc)",
      "surface_magasin": "5 500 pi²",
      "cour_bois": "100 000 pi²",
      "services": ["livraison", "financement", "compte"],
      "year_opened": 2021
    },
    {
      "id": "store-ste-sophie",
      "name": "Sainte-Sophie",
      "address": "2019, boulevard Sainte-Sophie, Sainte-Sophie (Qc) J5J 2...",
      "phone": "450-224-2918",
      "surface_magasin": "28 000 pi²",
      "cour_bois": "150 000 pi² (total)",
      "services": ["centre_de_coupe", "livraison", "estimation", "financement", "compte"],
      "year_opened": 2023
    },
    {
      "id": "store-mirabel-st-benoit",
      "name": "Mirabel (Saint-Benoît)",
      "address": "3660, rue Chénier, Mirabel (Qc) J7N 2N1",
      "phone": "450-258-0129",
      "google_maps": "https://maps.app.goo.gl/si1JtHwCgndHuUVQ9",
      "surface_magasin": "8 000 pi²",
      "cour_bois": "80 000 pi²",
      "services": ["livraison", "estimation", "financement", "compte"],
      "year_opened": 2024
    }
  ]
}
```

---

## 4. Interface de la démo — Spécification UI

### 4.1 Layout principal

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo Matério]  Démo ChatGPT Commerce × Matério      [Scénario ▼] │ <- header fixe
├──────────────────────────────┬──────────────────────────────────────┤
│                              │                                      │
│   PANEL CONVERSATION         │   PANEL PRODUITS + SERVICES          │
│   (style ChatGPT)            │   (style fiche Matério)              │
│                              │                                      │
│   ┌────────────────────┐     │   ┌──────────────────────────────┐   │
│   │ 👤 User msg        │     │   │  [Image produit]              │   │
│   └────────────────────┘     │   │  MARQUE                       │   │
│                              │   │  Titre produit                │   │
│   ┌────────────────────┐     │   │  SKU: TO02212                 │   │
│   │ 🤖 ChatGPT         │     │   │  41,99 $                      │   │
│   │ réponse IA         │     │   │  ✅ 250 en stock - St-Jérôme  │   │
│   │ avec streaming     │     │   │  🚚 Livraison toit dispo      │   │
│   └────────────────────┘     │   │  [Ajouter au panier]          │   │
│                              │   └──────────────────────────────┘   │
│   ┌────────────────────┐     │                                      │
│   │ 🔧 Service card    │     │   ┌──────────────────────────────┐   │
│   │ Centre de coupe    │     │   │  💰 FINANCEMENT DISPONIBLE    │   │
│   │ disponible à       │     │   │  18 versements × 178$/mois    │   │
│   │ Terrebonne         │     │   │  Sans frais ni intérêts       │   │
│   └────────────────────┘     │   │  [Appliquer le financement]   │   │
│                              │   └──────────────────────────────┘   │
│   [Zone de saisie]           │                                      │
│                              │   TOTAL PANIER: 3 200 $              │
│                              │   [Acheter via ChatGPT →]            │
├──────────────────────────────┴──────────────────────────────────────┤
│ ⏱ 120s │ 🛒 6 produits │ 💰 3 200$ │ 📍 Saint-Jérôme │ 🔧 Coupe  │ <- métriques
│ 🚚 Livraison toit │ 💳 18× 178$/mois │ 🚀 ROI 3 mois              │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Charte graphique — Branding Matério

| Élément | Valeur | Source |
|---|---|---|
| **Couleur primaire Matério** | `#C8102E` (rouge Matério) | Logo du site |
| **Couleur secondaire** | `#1a1a1a` (noir) | Navbar du site |
| **Couleur accent** | `#F5A623` (jaune/orange promo) | Badges circulaire |
| **Couleur fond ChatGPT** | `#343541` (gris foncé) | Interface ChatGPT réelle |
| **Couleur message user** | `#40414f` | Interface ChatGPT réelle |
| **Couleur message assistant** | `#444654` | Interface ChatGPT réelle |
| **Couleur service card** | `#2D5F2D` (vert foncé) | Différencier services vs. produits |
| **Police** | `Söhne, -apple-system, sans-serif` | Typographie ChatGPT |
| **Border radius cards** | `12px` | Cohérent avec ChatGPT moderne |

### 4.3 Composants UI spécifiques à Matério

#### 4.3.1 — Carte produit Matério

```html
<div class="product-card" data-sku="TO02212">
  <img src="https://www.materio.ca/media/catalog/product/..." 
       alt="Bardeau d'asphalte Dakota" class="product-image" />
  <div class="product-info">
    <span class="product-brand">BP</span>
    <h4 class="product-title">Bardeau d'asphalte DAKOTA brun 2 tons</h4>
    <p class="product-spec">Couvre 32.3 pi² | Garantie 25 ans</p>
    <div class="product-pricing">
      <span class="price-current">41,99 $</span>
    </div>
    <div class="product-availability">
      <span class="stock-badge in-stock">✅ 250 en stock</span>
      <span class="store-name">Matério Saint-Jérôme</span>
    </div>
    <div class="product-services">
      <span class="service-badge delivery">🚚 Livraison toit disponible</span>
      <span class="service-badge financing">💳 Financement disponible</span>
    </div>
    <div class="product-actions">
      <button class="btn-add-cart">Ajouter au panier</button>
      <button class="btn-pickup">Ramassage en magasin</button>
    </div>
  </div>
</div>
```

#### 4.3.2 — Carte service (NOUVEAU vs. Patrick Morin)

```html
<div class="service-card" data-service="centre_de_coupe">
  <div class="service-icon">🔧</div>
  <div class="service-info">
    <h4 class="service-title">Centre de coupe sur mesure</h4>
    <p class="service-desc">Coupe de comptoir 45°, perçage trou d'évier, 
       finition des extrémités — disponible à Terrebonne</p>
    <div class="service-availability">
      <span class="available">✅ Disponible à Terrebonne</span>
    </div>
    <button class="btn-reserve-service">Réserver ce service</button>
  </div>
</div>
```

#### 4.3.3 — Carte financement (NOUVEAU)

```html
<div class="financing-card">
  <div class="financing-header">
    <span class="financing-icon">💰</span>
    <h4>Plan de financement Matério</h4>
  </div>
  <div class="financing-details">
    <div class="financing-amount">
      <span class="monthly">178,00 $/mois</span>
      <span class="terms">× 18 versements</span>
    </div>
    <div class="financing-total">
      Total: 3 204,00 $ — <strong>0 $ d'intérêts</strong>
    </div>
    <p class="financing-note">Sous réserve de l'approbation du crédit. 
       Taxes et livraison payables à l'achat.</p>
  </div>
  <button class="btn-apply-financing">Appliquer le financement</button>
</div>
```

### 4.4 Barre de métriques en temps réel (bottom bar)

Métriques augmentées par rapport à Patrick Morin pour inclure les services :

| Métrique | Icône | Comportement |
|---|---|---|
| **Temps écoulé** | ⏱ | Chronomètre depuis le début du scénario |
| **Produits recommandés** | 🛒 | Compteur qui s'incrémente |
| **Valeur du panier** | 💰 | Montant qui augmente |
| **Magasin sélectionné** | 📍 | Nom du magasin avec stock |
| **Service(s) réservé(s)** | 🔧 | « Coupe réservée » / « Estimation demandée » |
| **Livraison spécialisée** | 🚚 | « Livraison toit planifiée » |
| **Financement** | 💳 | « 18× 178$/mois » |
| **Économie vs Google Ads** | 🚀 | « Coût Google Ads équivalent : ~85 $ » |

### 4.5 Responsive / Modes d'affichage

| Mode | Layout | Usage |
|---|---|---|
| **Desktop (>1200px)** | Split 50/50 avec barre métriques bottom | Présentation normale |
| **Desktop large (>1400px)** | Split 45/55 (plus de place pour produits + services) | Grand écran / projection |
| **Tablette (768-1200px)** | Conversation full-width, produits en overlay slide-in | Présentation informelle |
| **Mobile** | Non prioritaire pour cette démo | — |

---

## 5. Scénarios conversationnels — Scripts détaillés

### 5.1 Scénario 1 — « Le projet toiture » (B2C + Services)

**Durée cible :** 2 minutes 30  
**Persona :** Sophie, propriétaire à Saint-Jérôme  
**Contexte :** Mai, toiture de 25 ans à refaire avant l'été.  
**Valeur ajoutée démo :** Produits + livraison toit + financement intégré

#### Tour 1 — La demande initiale

**User (Sophie) :**
> Ma toiture a 25 ans et j'ai des infiltrations d'eau. Je dois la refaire au complet. C'est un bungalow, environ 1 200 pi². Je suis à Saint-Jérôme. De quoi j'ai besoin ?

**ChatGPT (après 2s de typing) :**
> C'est un bon timing pour la refaire avant les pluies d'été ! 😊 Pour un bungalow de 1 200 pi², voici ce qu'il vous faut, tout disponible chez **Matério Saint-Jérôme** :
>
> **Bardeaux et membrane :**
> - 37× Paquets de bardeaux d'asphalte DAKOTA BP (couvre 32,3 pi²/pqt) — **41,99 $ /pqt**
> - 4× Rouleaux de membrane sous-toiture autocollante — **XX,XX $ /rouleau**
> - 1× Rouleau membrane de départ (faîtière) — **XX,XX $**
>
> **Quincaillerie toiture :**
> - 3× Boîtes de clous à toiture galvanisés (5 lb) — **XX,XX $ /boîte**
> - 10'× Solin d'aluminium — **XX,XX $**
> - 2× Évent de toit Maximum — **XX,XX $ /unité**
>
> **Protection :**
> - 2× Tubes de ciment plastique toiture — **XX,XX $ /tube**

*(Cartes produits apparaissent en cascade dans le panneau droit)*

**Métriques :** ⏱ 0:35 │ 🛒 10 produits │ 💰 ~2 800 $ │ 📍 Saint-Jérôme

#### Tour 2 — Le total et la livraison toit

**User (Sophie) :**
> Combien ça fait au total ? Et est-ce que vous pouvez livrer les bardeaux directement sur le toit ? Je ne suis pas capable de monter ça dans l'échelle…

**ChatGPT :**
> Absolument ! Matério a des **camions-girafe** qui déposent les bardeaux directement sur votre toit. C'est un service exclusif dans la région ! 🏗️
>
> | Poste | Montant |
> |---|---|
> | Bardeaux (37 pqts) | 1 553,63 $ |
> | Membrane et accessoires | 486,00 $ |
> | Quincaillerie toiture | 187,50 $ |
> | **Sous-total matériaux** | **2 227,13 $** |
> | 🚚 Livraison sur le toit (camion-girafe) | 125,00 $ |
> | TPS (5%) | 117,61 $ |
> | TVQ (9,975%) | 234,69 $ |
> | **Total** | **2 704,43 $** |
>
> 📍 Tout en stock au **Matério Saint-Jérôme** — la plus grande cour à bois des Laurentides !

*(Carte service « livraison toit » apparaît dans le panneau droit)*

**Métriques :** ⏱ 0:55 │ 💰 2 704,43 $ │ 🚚 Livraison toit

#### Tour 3 — Le financement

**User (Sophie) :**
> Ouf, c'est un bon montant. Est-ce que je peux payer en plusieurs versements ?

**ChatGPT :**
> Oui ! Matério offre du **financement sans frais ni intérêts** 💰
>
> Pour un achat de 2 704,43 $, vous êtes éligible à :
>
> **18 versements de 150,25 $/mois — 0 $ d'intérêts !**
>
> Aucuns frais cachés. Sous réserve de l'approbation du service de crédit. Les taxes et la livraison sont payables à l'achat (359,30 $), et le reste est financé.
>
> Voulez-vous procéder avec le financement ?

*(Carte financement apparaît avec le détail des versements)*

**Métriques :** ⏱ 1:15 │ 💳 18× 150,25$/mois │ Sans intérêts

#### Tour 4 — Checkout

**User (Sophie) :**
> Oui, allons-y avec le financement ! Livraison sur le toit samedi matin si possible.

**ChatGPT :**
> Parfait ! Voici votre récapitulatif final :
>
> **10 produits** — Total : **2 704,43 $** (taxes incluses)
> 🚚 **Livraison camion-girafe sur le toit** — Samedi matin 8h-12h
> 💳 **Financement** : 18 versements de 150,25 $/mois (0% intérêts)
> 📍 Depuis **Matério Saint-Jérôme** (2159, boul. Curé-Labelle)
>
> [Procéder au paiement sécurisé →]

**Métriques finales :** ⏱ 1:45 │ 🛒 10 produits │ 💰 2 704,43 $ │ 🚚 Livraison toit sam. │ 💳 18× 150$/mois │ 🚀 « Vente de 2 700 $ avec services en < 2 min. Google Ads : ~85 $ d'acquisition. »

---

### 5.2 Scénario 2 — « Le comptoir sur mesure » (B2C + Centre de coupe)

**Durée cible :** 1 minute 30  
**Persona :** Marc, rénovateur amateur à Terrebonne  
**Contexte :** Rénovation cuisine, veut un nouveau comptoir.  
**Valeur ajoutée démo :** Cross-sell + centre de coupe = service invisible rendu visible par l'IA

#### Tour 1 — Recherche comptoir

**User (Marc) :**
> Je cherche un comptoir en bambou pour ma cuisine. Ma section principale fait 8 pieds et j'ai un L de 4 pieds. Qu'est-ce que vous avez ?

**ChatGPT :**
> Super choix le bambou, c'est durable et naturellement antibactérien ! 🎋 Voici ce qu'on a chez **Matério Terrebonne** :
>
> **Comptoir en bambou 1½ po × 25 po × 96 po — Naturel** — prix circulaire
> ✅ En stock à Terrebonne
>
> Pour votre configuration en L (8' + 4'), vous aurez besoin de :
> - 1× Comptoir bambou 96 po (section principale de 8')
> - 1× Comptoir bambou 96 po (à couper à 48 po pour le L)
>
> 💡 Bonne nouvelle : le **centre de coupe Matério à Terrebonne** peut faire la coupe à 45° pour le joint du L, le perçage du trou d'évier, et la finition des extrémités. C'est un service exclusif dans la région !

*(Carte produit comptoir + carte service centre de coupe apparaissent)*

**Métriques :** ⏱ 0:25 │ 🛒 2 produits │ 🔧 Coupe disponible

#### Tour 2 — Cross-sell évier

**User (Marc) :**
> Parfait ! J'ai besoin d'un évier aussi. Quelque chose de moderne, simple, pas trop cher.

**ChatGPT :**
> Je vous recommande cet ensemble très populaire :
>
> **Ensemble évier de cuisine TOUT-EN-UN en acier inoxydable** — **269,98 $** (rég. 369,99 $, -27%)
> 29 po × 16 po × 9 po | Incluant : crépine, robinet et grille
> ✅ En stock à Terrebonne
>
> Le centre de coupe peut aussi percer le trou d'évier dans votre comptoir en bambou — tout sera prêt quand vous viendrez chercher ! 👌
>
> Voulez-vous ajouter l'ensemble et réserver la coupe ?

**Métriques :** ⏱ 0:45 │ 🛒 3 produits │ 💰 ~870 $ │ 🔧 Coupe + perçage

#### Tour 3 — Checkout avec service

**User (Marc) :**
> Oui, ajoute tout. Je viens chercher quand la coupe est faite.

**ChatGPT :**
> Parfait ! Voici le récapitulatif :
>
> **3 produits + service de coupe**
> | Produit | Prix |
> |---|---|
> | 2× Comptoir bambou 25×96 | XXX,XX $ |
> | 1× Ensemble évier tout-en-un Technoform | 269,98 $ |
> | 🔧 Services de coupe (45°, trou évier, finition) | Inclus* |
> | TPS + TVQ | XX,XX $ |
> | **Total** | **~870 $** |
>
> *Le service de coupe est offert à l'achat des matériaux.
>
> 📍 **Matério Terrebonne** — Coupe prête sous 24-48h, on vous appelle quand c'est prêt.
>
> [Procéder au paiement →]

**Métriques finales :** ⏱ 1:10 │ 🛒 3 produits │ 💰 ~870 $ │ 🔧 Coupe 45° + perçage │ 🚀 « Le centre de coupe = avantage invisible. L'IA le vend à CHAQUE client. »

---

### 5.3 Scénario 3 — « La commande chantier autoconstructeur » (B2B)

**Durée cible :** 2 minutes  
**Persona :** Martin, autoconstructeur à Mirabel  
**Contexte :** Construction maison, commande régulière de matériaux.

#### Tour 1 — Commande en lot

**User (Martin) :**
> Bonjour, je suis autoconstructeur et j'ai un compte chez Matério, numéro 847291. Je construis ma maison à Mirabel. J'ai besoin pour cette semaine de : 100 montants 2×4×8 traité, 50 montants 2×6×10, 20 feuilles d'OSB 7/16, et 10 rouleaux d'isolant Rockwool R-24. Livraison au chantier jeudi matin, lot 15 rang Sainte-Marguerite.

**ChatGPT :**
> Bonjour Martin ! Votre compte Matério #847291 est vérifié. ✅
>
> Voici votre commande avec les **prix autoconstructeur** :
>
> | Produit | Qté | Prix unit. | Total |
> |---|---|---|---|
> | Montants 2×4×8' bois traité | 100 | X,XX $ | XXX,XX $ |
> | Montants 2×6×10' bois traité | 50 | X,XX $ | XXX,XX $ |
> | Panneaux OSB 7/16 × 4 × 8 | 20 | XX,XX $ | XXX,XX $ |
> | Isolant Rockwool R-24 (16") | 10 | XX,XX $ | XXX,XX $ |
>
> **Sous-total :** X XXX,XX $
>
> 📍 Stock vérifié au **Matério Mirabel (Saint-Benoît)** — tout est disponible
> 🚚 **Livraison chantier** : Jeudi matin, lot 15 rang Sainte-Marguerite, Mirabel
>      Camion plateforme — dépôt sur le terrain
>
> Je mets tout sur votre compte charge #847291 ?

**Métriques :** ⏱ 0:30 │ 🛒 4 produits │ 💰 ~4 500 $ │ 📍 Mirabel │ 🚚 Livraison jeudi

#### Tour 2 — Ajout et confirmation

**User (Martin) :**
> Ajoute aussi une boîte de clous 3" pour la charpente et 2 paquets de vis à gypse. Oui, tout sur le compte.

**ChatGPT :**
> Ajouté ! ✅
>
> - 1× Boîte de clous à charpente 3" (25 lb) — **XX,XX $**
> - 2× Boîtes de vis à gypse 1¼" (1000/bte) — **XX,XX $ chacune**
>
> Récapitulatif final :
>
> **6 produits** — Sous-total : **X XXX,XX $** + taxes
> 💰 Total avec TPS/TVQ et livraison : **X XXX,XX $**
> 📄 Facturé au **Compte charge Matério #847291**
> 🚚 Livraison : Lot 15 rang Ste-Marguerite, Mirabel — **Jeudi matin**
> 📧 Confirmation envoyée — ajouté à votre relevé mensuel
>
> Commande confirmée ! ✅ Martin, bon chantier ! 💪

**Métriques finales :** ⏱ 1:00 │ 🛒 6 produits │ 💰 ~4 700 $ │ 🚀 « Commande en 60 secondes. En personne : 45 min aller-retour. Au téléphone : 20 min. »

---

### 5.4 Scénario 4 — « L'estimation augmentée par l'IA » (Nouveau canal de vente)

**Durée cible :** 2 minutes  
**Persona :** Diane, propriétaire à Sainte-Sophie, planifie un agrandissement.  
**Valeur ajoutée démo :** L'IA pré-qualifie les projets d'estimation → plus de conversions, équipe plus productive

#### Tour 1 — Demande d'estimation

**User (Diane) :**
> Je voudrais ajouter une pièce à ma maison, environ 12 pieds par 14 pieds. C'est possible d'avoir une idée du coût des matériaux ?

**ChatGPT :**
> Bien sûr ! Pour vous donner une estimation précise, j'ai quelques questions :
>
> 1. **Type de fondation** : Fondation en béton coulé, sur pilotis, ou dalle sur sol ?
> 2. **Isolation** : Quel niveau d'isolation visez-vous ? (R-24 standard mur, R-41 plafond ?)
> 3. **Finition intérieure** : Gypse peint, lambris de bois, ou autre ?
> 4. **Finition extérieure** : Même revêtement que la maison existante ?
> 5. **Toiture** : Pente simple vers l'arrière ou intégrée au toit existant ?
> 6. **Fenêtres** : Combien de fenêtres prévoyez-vous ?
>
> Et quel **Matério** est le plus proche de chez vous ?

#### Tour 2 — Qualification du projet

**User (Diane) :**
> Fondation sur pilotis Pylex. Isolation R-24 dans les murs. Gypse standard peint. Le revêtement extérieur c'est du Canexel. Toiture avec pente simple. 2 fenêtres, une grande et une petite. Je suis près du Matério de Sainte-Sophie.

**ChatGPT :**
> Merci Diane ! Voici une **pré-estimation IA** basée sur les produits Matério disponibles à **Sainte-Sophie** :
>
> | Poste | Estimation |
> |---|---|
> | **Fondation** (pilotis Pylex, solives) | 800 $ – 1 200 $ |
> | **Charpente** (montants 2×4, 2×6, contreplaqué, OSB) | 2 500 $ – 3 500 $ |
> | **Isolation** (Rockwool R-24 murs + R-41 plafond) | 800 $ – 1 100 $ |
> | **Toiture** (bardeaux, membrane, solin) | 600 $ – 900 $ |
> | **Revêtement extérieur** (Canexel) | 1 200 $ – 1 800 $ |
> | **Fenêtres** (2, Jeld-Wen) | 500 $ – 900 $ |
> | **Gypse + finition** (gypse, composé, peinture) | 400 $ – 600 $ |
> | **Quincaillerie** (vis, clous, équerres, solins) | 300 $ – 500 $ |
> | **Total matériaux estimé** | **7 100 $ – 10 500 $** |
>
> ⚠️ Ceci est une pré-estimation. Pour une soumission détaillée et précise, notre **service d'estimation à Sainte-Sophie** peut vous préparer un devis complet gratuitement.
>
> Voulez-vous que je vous mette en contact avec notre équipe d'estimation ?

*(Panneau droit montre une vue sommaire des produits par poste + carte service estimation)*

**Métriques :** ⏱ 1:00 │ 💰 7 100 – 10 500 $ (estimation) │ 📍 Sainte-Sophie

#### Tour 3 — Transfert au service d'estimation

**User (Diane) :**
> Oui, j'aimerais avoir une vraie soumission détaillée !

**ChatGPT :**
> Parfait ! Je transfère votre projet au service d'estimation de **Matério Sainte-Sophie** 📋
>
> Voici ce que j'ai transmis à notre équipe :
>
> | Info projet | Détail |
> |---|---|
> | Type | Agrandissement résidentiel |
> | Dimensions | 12 × 14 pieds |
> | Fondation | Pilotis Pylex |
> | Isolation | R-24 murs, R-41 plafond |
> | Revêtement | Canexel |
> | Toiture | Pente simple |
> | Fenêtres | 2 (1 grande, 1 petite) |
> | Finition | Gypse peint |
> | Magasin | Sainte-Sophie |
> | Estimation IA | 7 100 – 10 500 $ |
>
> 📞 **L'équipe de Sainte-Sophie** va vous contacter sous 48h au numéro que vous indiquerez. Vous pouvez aussi appeler directement au **450-224-2918**.
>
> 💡 En attendant, vous pouvez déjà commander certains matériaux de base si vous voulez commencer les fondations !

**Métriques finales :** ⏱ 1:45 │ 📋 Estimation transmise │ 📍 Sainte-Sophie │ 🚀 « Demande d'estimation qualifiée en 2 minutes. Formulaire web actuel : souvent incomplet + 48h de va-et-vient. L'IA livre un dossier prêt à estimer. »

---

### 5.5 Interaction dans la démo (MVP implémenté)

Le MVP utilise GPT-4o en temps réel — les scénarios ci-dessus servent de suggestions mais l'utilisateur peut poser n'importe quelle question. Le modèle utilise le function calling avec les fonctions suivantes :

| Fonction | Déclencheur | Action dans le UI |
|---|---|---|
| `show_products` | L'IA recommande des produits spécifiques | Affiche les cartes produits dans le panneau droit |
| `show_services` | L'IA mentionne un service (coupe, livraison, estimation) | Affiche une carte service verte |
| `show_financing` | Le panier dépasse 750 $ ou le client demande des versements | Affiche la carte financement avec calcul |
| `show_checkout` | Le client veut acheter | Transition vers le checkout Stripe |
| `show_estimation` | Le client demande une estimation de projet | Affiche le récapitulatif et le formulaire pré-rempli |

**Suggestion chips :** pour guider les premières interactions :
- 🏠 « Refaire ma toiture 1 200 pi² »
- 🔧 « Comptoir bambou avec coupe sur mesure »
- 👷 « Commande autoconstructeur — bois et isolation »
- 📋 « Estimation pour un agrandissement »

---

## 6. Logique services intégrés

### 6.1 Function calling — Définition des nouvelles fonctions

```javascript
const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description: "Affiche des produits Matério recommandés au client. Utiliser quand on recommande des produits spécifiques du catalogue.",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "Liste des pid (identifiants produit) à afficher"
          },
          store: {
            type: "string",
            description: "Nom du magasin pour vérifier le stock"
          }
        },
        required: ["product_ids"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_services",
      description: "Affiche une carte service Matério. Utiliser quand on recommande un service : centre de coupe, livraison spécialisée, ouverture de compte, ou estimation.",
      parameters: {
        type: "object",
        properties: {
          service_type: {
            type: "string",
            enum: ["centre_de_coupe", "livraison_specialisee", "estimation", "ouverture_compte"],
            description: "Type de service à afficher"
          },
          store: {
            type: "string",
            description: "Magasin où le service est disponible"
          },
          details: {
            type: "string",
            description: "Détails spécifiques (ex: type de coupe, date de livraison)"
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
      description: "Calcule et affiche un plan de financement Matério. Utiliser quand le panier dépasse 750$ ou que le client demande à payer en versements.",
      parameters: {
        type: "object",
        properties: {
          total_amount: {
            type: "number",
            description: "Montant total à financer en dollars (avant taxes, hors livraison)"
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
      description: "Affiche un résumé de projet d'estimation et propose le transfert au service d'estimation humain. Utiliser quand le client demande une soumission ou estimation de projet.",
      parameters: {
        type: "object",
        properties: {
          project_type: {
            type: "string",
            description: "Type de projet (rénovation, construction neuve, agrandissement)"
          },
          project_details: {
            type: "object",
            description: "Détails du projet recueillis par l'IA",
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
            description: "Magasin le plus proche pour le service d'estimation"
          },
          estimated_range: {
            type: "string",
            description: "Fourchette d'estimation IA (ex: 7 100 $ – 10 500 $)"
          }
        },
        required: ["project_type", "store"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_checkout",
      description: "Déclenche le processus de paiement Stripe. SEULEMENT quand le client confirme vouloir acheter.",
      parameters: {
        type: "object",
        properties: {
          product_ids: {
            type: "array",
            items: { type: "string" },
            description: "Liste des pid à acheter"
          },
          store: {
            type: "string",
            description: "Magasin pour le ramassage ou l'expédition"
          },
          delivery_type: {
            type: "string",
            enum: ["pickup", "standard", "toit", "chantier"],
            description: "Type de livraison"
          },
          financing: {
            type: "boolean",
            description: "Si le client a choisi un plan de financement"
          },
          account_number: {
            type: "string",
            description: "Numéro de compte charge si B2B"
          }
        },
        required: ["product_ids"]
      }
    }
  }
];
```

### 6.2 Logique de calcul de financement

```javascript
function calculateFinancing(amount) {
  // Plans Matério sans frais ni intérêts
  const plans = [
    { min: 750, max: 2499, months: 12 },
    { min: 2500, max: 4999, months: 18 },
    { min: 5000, max: 7499, months: 24 },
    { min: 7500, max: 10000, months: 36 },
  ];
  
  const plan = plans.find(p => amount >= p.min && amount <= p.max);
  if (!plan) return null;
  
  const monthly = Math.ceil((amount / plan.months) * 100) / 100;
  return {
    eligible: true,
    months: plan.months,
    monthly_payment: monthly,
    total: amount,
    interest: 0,
    note: "Taxes et livraison payables à l'achat. Sous réserve approbation crédit."
  };
}
```

### 6.3 System Prompt — Agent IA Matério

```javascript
const SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Matério, une entreprise de quincaillerie, construction et rénovation fondée en 1979 dans les Laurentides au Québec. Matério possède 6 magasins et la plus grande cour à bois des Laurentides (500 000 pi² à Saint-Jérôme).

RÈGLES:
1. Toujours répondre en français québécois, ton chaleureux et professionnel
2. Recommander UNIQUEMENT les produits du catalogue ci-dessous (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Pour les autoconstructeurs/entrepreneurs avec compte, offrir les prix du compte
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. TOUJOURS appeler show_products quand tu recommandes des produits spécifiques
8. Appeler show_checkout SEULEMENT quand le client dit explicitement vouloir commander/acheter
9. Proposer les SERVICES Matério quand pertinent:
   - CENTRE DE COUPE: pour mélamine, comptoirs, portes, escaliers, aluminium, plexiglas (Saint-Jérôme, Terrebonne, Sainte-Sophie seulement). Appeler show_services.
   - LIVRAISON SPÉCIALISÉE: 35 camions incluant camions-girafe (livraison sur le toit), mât articulé (4e étage), plateformes. Appeler show_services.
   - ESTIMATION: service de soumission pour gros projets (réno ou neuf). Pré-qualifier le projet et appeler show_estimation.
   - FINANCEMENT: 12-36 versements sans intérêts (750$-10 000$). Appeler show_financing quand le panier > 750$ ou que le client hésite sur le prix.
10. Programme fidélité Carte Matério: 1 pt/1$, 1000 pts = 10$ rabais
11. Pouvoir d'achat de 4 milliards $ via ILDC = prix aussi compétitifs que les grandes bannières

MAGASINS:
${storeLines}

CATALOGUE MATÉRIO (${totalSelected} produits populaires sur ${totalProducts} total):
${catalogText}`;
```

---

## 7. Mockup checkout ACP

### 7.1 Écran de checkout

```
┌─────────────────────────────────────────────────────────┐
│                   Logo Matério                           │
│           Paiement sécurisé — ChatGPT Commerce           │
├────────────────────────────┬────────────────────────────┤
│                            │                             │
│   VOTRE COMMANDE           │   PAIEMENT                  │
│                            │                             │
│   🛒 10 produits            │   Nom sur la carte          │
│                            │   [Sophie Lavoie          ]  │
│   37× Bardeaux Dakota BP   │                             │
│   ............. 1 553,63 $ │   Numéro de carte           │
│   4× Membrane sous-toiture │   [4242 •••• •••• ••••   ]  │
│   ................486,00 $ │                             │
│   ... +7 autres produits   │   Expiration    CVC         │
│                            │   [06/27    ]   [•••    ]  │
│   ─────────────────────    │                             │
│   Sous-total    2 227,13 $ │   📍 Livraison spécialisée  │
│   🚚 Livraison toit 125,00$│   Camion-girafe sur le toit │
│   TPS (5%)        117,61 $ │   Samedi matin 8h-12h       │
│   TVQ (9,975%)    234,69 $ │   Matério Saint-Jérôme      │
│   ─────────────────────    │                             │
│   💳 FINANCEMENT            │                             │
│   18× 150,25$/mois         │                             │
│   0$ d'intérêts             │                             │
│   ─────────────────────    │                             │
│   TOTAL        2 704,43 $  │   [🔒 Payer 2 704,43 $]    │
│                            │                             │
│   Marchand: Matério        │   Powered by Stripe         │
│   Quincaillerie et Constr. │   🔒 Paiement 256-bit       │
│                            │   Conforme Loi 25 QC        │
└────────────────────────────┴────────────────────────────┘
```

### 7.2 Écran de confirmation

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│             ✅ Commande confirmée !                       │
│                                                          │
│          Commande #MAT-2026-05-07-0934                   │
│                                                          │
│   🚚 Livraison : Camion-girafe sur le toit              │
│      Samedi 10 mai 2026, 8h-12h                         │
│      Matério Saint-Jérôme                               │
│                                                          │
│   📧 Confirmation envoyée à sophie@email.com             │
│                                                          │
│   📦 10 produits — Total : 2 704,43 $                    │
│   💳 Financement : 18× 150,25$/mois (0% intérêts)       │
│                                                          │
│   🔧 Services inclus :                                   │
│      • Livraison sur le toit (camion-girafe)             │
│                                                          │
│   💡 Points Carte Matério : +2 704 points accumulés !    │
│      (Vers un rabais de 27 $ sur votre prochain achat)   │
│                                                          │
│   [Voir ma commande]  [Retour à ChatGPT]                 │
│                                                          │
│   ──────────────────────────────────────────             │
│   Marchand : Matério — Quincaillerie, Construction       │
│   et Rénovation depuis 1979                              │
│   Ce paiement a été traité via ChatGPT Commerce          │
│   powered by Stripe. Vous êtes le client de Matério.     │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Points clés à souligner visuellement

| Point | Comment le montrer |
|---|---|
| **Matério est le marchand** | Logo Matério en haut, « Marchand : Matério » |
| **0% commission** | Badge « Pas de commission marketplace » |
| **Services dans le checkout** | Livraison toit, financement, coupe — tout dans le même flux |
| **Points fidélité** | « +2 704 points accumulés ! » — montre la rétention |
| **Financement** | Versements affichés clairement, 0 $ d'intérêts |
| **Conformité Loi 25** | Mention « Conforme Loi 25 Québec » |
| **Taxes QC** | TPS + TVQ séparées |

---

## 8. Production vidéo

### 8.1 Storyboard

| Segment | Durée | Contenu visuel | Voiceover (FR) |
|---|---|---|---|
| **Intro** | 0:00 – 0:10 | Logo Matério + titre « Et si vos clients achetaient directement dans ChatGPT ? » | *« 300 millions de personnes utilisent ChatGPT chaque jour. Quand ils planifient leur rénovation, ils posent des questions. Et bientôt, ils vont acheter. Vos produits y sont-ils ? »* |
| **Le problème** | 0:10 – 0:25 | Animation : recherche Google « refaire toiture bardeaux Laurentides » → 10 résultats → Home Depot, Amazon, forums. Puis même question dans ChatGPT → réponse Matério directe. | *« Vos clients ne veulent plus chercher parmi des dizaines de résultats. Ils veulent UNE réponse. Avec les bons produits. Au bon prix. En stock dans leur magasin. »* |
| **Scénario 1** | 0:25 – 1:30 | Démo live : projet toiture. Question → produits → livraison toit → financement → checkout. | *« Sophie à Saint-Jérôme refait sa toiture. Elle demande à ChatGPT. En 2 minutes, c'est commandé : bardeaux, membrane, quincaillerie — 2 700 dollars. Livraison camion-girafe SUR le toit. Financement 18 mois sans intérêts. Tout dans le même flux. »* |
| **Services** | 1:30 – 1:50 | Split-screen : 3 services Matério mis en avant (coupe, livraison, estimation) | *« L'IA ne vend pas juste des produits. Elle vend VOS services. Le centre de coupe exclusif, la livraison spécialisée avec 35 camions, le service d'estimation. Des avantages que Home Depot n'a pas — et que l'IA met en avant pour vous. »* |
| **Scénario 3** | 1:50 – 2:15 | Démo rapide : commande autoconstructeur + livraison chantier + compte charge | *« Et vos autoconstructeurs ? Martin commande son bois de charpente en 60 secondes. Livraison au chantier jeudi matin. Facturé au compte. Plus besoin de se déplacer ou d'attendre au téléphone. »* |
| **Urgence** | 2:15 – 2:35 | Logos Home Depot + Patrick Morin + Canac. Texte : « Ils vont le faire. Avec 6 magasins — vous devez bouger en premier. » | *« Patrick Morin a 23 magasins et prépare déjà son intégration IA. Home Depot a le budget pour le faire demain. Avec 6 magasins, votre avantage est la vitesse. Soyez le PREMIER dans les Laurentides sur ChatGPT. »* |
| **CTA** | 2:35 – 2:50 | Coordonnées + QR code + « 30 minutes, sans engagement » | *« On est prêts à vous montrer ça avec vos vrais produits. 30 minutes, c'est tout ce qu'il faut. »* |

### 8.2 Teaser vidéo (30 secondes)

| Segment | Durée | Contenu |
|---|---|---|
| Hook | 0:00 – 0:05 | *« Matério sur ChatGPT. Regardez ce que ça donne. »* |
| Démo flash | 0:05 – 0:22 | Accéléré : question toiture → produits → livraison toit → financement → checkout. |
| CTA | 0:22 – 0:30 | *« Vos produits. Vos services. Vos clients. Zéro commission. On vous montre ? »* |

### 8.3 Spécifications techniques vidéo

| Paramètre | Valeur |
|---|---|
| Résolution | 1920×1080 (Full HD) |
| FPS | 30 |
| Format | MP4 (H.264) |
| Audio | Voiceover mono, musique de fond low-fi (royalty-free) |
| Sous-titres | Oui, FR, intégrés (pour LinkedIn/email sans son) |
| Taille cible | < 50 MB (démo longue), < 15 MB (teaser) |

---

## 9. Documents commerciaux

### 9.1 One-pager (1 page PDF)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo Matério]  ×  [Logo ChatGPT Commerce]              │
│                                                          │
│  VOS PRODUITS ET VOS SERVICES SUR CHATGPT                │
│  300M d'acheteurs. 0% de commission. Vos services inclus.│
│                                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ 2 704$ │ │ 0%     │ │ 2 min  │ │ 35     │            │
│  │ vente  │ │ comm.  │ │ pour   │ │ camions │            │
│  │ toiture│ │        │ │ vendre │ │ vendus  │            │
│  │        │ │        │ │ + coupe│ │ par l'IA│            │
│  └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                          │
│  COMMENT ÇA MARCHE                                       │
│  1. Le client pose sa question dans ChatGPT              │
│  2. ChatGPT recommande VOS produits + VOS services       │
│     (coupe sur mesure, livraison toit, financement)      │
│  3. Le client achète → paiement dans VOTRE Stripe        │
│     → ramassage/livraison depuis VOTRE magasin           │
│                                                          │
│  CE QUE L'IA VEND POUR VOUS (ET QUE VOS CONCURRENTS     │
│  NE PEUVENT PAS COPIER)                                  │
│  🔧 Centre de coupe exclusif dans la région              │
│  🚚 35 camions-girafe qui livrent sur le toit            │
│  📋 Service d'estimation qualifié par l'IA               │
│  💳 Financement 0% calculé en temps réel                 │
│                                                          │
│  PROJECTION CONSERVATRICE                                │
│  60 commandes/mois × 300$ = 18 000$/mois                │
│  = 216 000$/an de revenu additionnel                     │
│  ROI positif en ~3 mois                                  │
│                                                          │
│  [Coordonnées] [QR code vidéo démo]                      │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Proposition commerciale (4-6 pages PDF)

| Page | Contenu |
|---|---|
| **1 — Couverture** | « Proposition — Intégration ChatGPT Commerce pour Matério ». Logos, date, coordonnées. |
| **2 — Le contexte** | L'IA change le commerce. 300M d'utilisateurs. La quincaillerie construction = cas d'usage parfait. Vos concurrents bougent (Patrick Morin, Home Depot). Avec 6 magasins, l'innovation est votre arme. |
| **3 — L'avantage Matério** | Vos services différenciants (coupe, livraison, estimation) que l'IA rend visibles et vendus numériquement. Aucun concurrent ne peut répliquer cette combinaison. |
| **4 — Ce qu'on propose** | Intégration ACP complète. Détail : audit catalogue, feed produits + services, API stock 6 magasins, Stripe, service d'estimation augmenté IA, calcul financement, formation. |
| **5 — Les résultats attendus** | Projections de ventes. ROI. Scénarios (conservateur/optimiste). Services réservés via IA. Estimation qualifiée → taux de conversion. |
| **6 — L'investissement** | Grille tarifaire (Enterprise ACP + Module Services IA + Maintenance). Paiement en phases possible. Prochaines étapes : 1) Appel 30 min. 2) Audit gratuit. 3) Proposition. 4) Kick-off. |

---

## 10. Plan d'exécution semaine par semaine

### SEMAINE 1 — Recherche, extraction de données et scraper

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Audit technique Magento 2 | Tester REST API (`/rest/V1/products`), GraphQL (`/graphql`), identifier la meilleure approche d'extraction | 2h | Rapport d'audit API |
| L | Recherche contacts | Identifier sur LinkedIn le président, DG, VP opérations, directeur marketing | 2h | Liste de 3-5 contacts décisionnels |
| M | Développer le scraper | Implémenter le scraper (API REST, GraphQL ou HTML fallback) avec pagination et rate limiting | 4h | `scraper/index.js` fonctionnel |
| M-Me | Extraction catalogue P0 | Scraper Matériaux (2 532 prod.) + Quincaillerie et Outillage (~2 000 prod.) | 3h | ~4 500 produits extraits |
| Me-J | Extraction catalogue P1 | Scraper Plomberie, Peinture, Couvre-plancher, Électricité | 3h | ~7 300 produits total |
| J | Extraction catalogue P2 | Scraper Saisonnier, Décoration, Poêles, Poutrelles | 2h | ~10 000+ produits total |
| J-V | Données magasins + services | Créer `stores.json` (6 magasins) et `services.json` (coupe, livraison, financement, estimation) | 2h | Fichiers JSON finaux |
| V | Structuration ACP | Convertir au format `catalog-materio.json`, valider les données, tester la qualité | 2h | Catalogue ACP validé |
| **Total S1** | | | **20h** | ~10 000+ produits + 6 magasins + 4 services en JSON |

### SEMAINE 2 — Développement de l'application démo

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Fork + adaptation | Copier le template Patrick Morin, adapter le branding (couleurs, logo, textes) | 2h | Projet initialisé avec branding Matério |
| L | System prompt | Écrire le system prompt Matério avec les règles services + catalogue + magasins | 2h | System prompt testé |
| M | Nouvelles functions | Implémenter `show_services`, `show_financing`, `show_estimation` (function calling) | 4h | 3 nouvelles fonctions opérationnelles |
| M-Me | UI services | Composants cartes service (vert), carte financement, carte estimation | 3h | UI services intégrée |
| Me | Logique financement | Calcul dynamique des plans (12/18/24/36 mois), affichage dans le panneau droit | 2h | Calculateur financement fonctionnel |
| J | Scénario 1 — Toiture | Test complet : produits → livraison toit → financement → checkout | 2h | Scénario 1 jouable |
| J | Scénario 2 — Comptoir | Test complet : comptoir → centre de coupe → évier → checkout | 2h | Scénario 2 jouable |
| V | Scénario 3 — Autoconstructeur | Test complet : commande lot → livraison chantier → compte charge | 2h | Scénario 3 jouable |
| V | Scénario 4 — Estimation | Test complet : questions qualification → pré-estimation → transfert humain | 2h | Scénario 4 jouable |
| **Total S2** | | | **21h** | Application démo fonctionnelle, 4 scénarios jouables |

### SEMAINE 3 — Checkout, polish et vidéo

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Checkout Stripe | Adapter le checkout Patrick Morin : ajouter financement, livraison spécialisée, points fidélité, branding Matério | 3h | Checkout fonctionnel |
| L-M | Barre métriques augmentée | Ajouter les indicateurs services (🔧 Coupe, 🚚 Livraison, 💳 Financement) à la barre du bas | 2h | Barre métriques avec services |
| M | Polish UI | Responsive, transitions, corrections visuelles, test sur grand écran | 3h | Application finalisée |
| Me | Rédaction script voiceover | Écrire la narration vidéo 2:50 + teaser 30s (angle services + urgence) | 2h | Scripts voiceover finaux |
| Me-J | Enregistrement vidéo | OBS Studio : enregistrer les 4 scénarios, prises multiples | 2h | Fichiers vidéo bruts |
| J | Enregistrement voiceover | Narration audio (micro USB, pièce calme, WAV) | 1h | Fichier audio voiceover |
| J-V | Montage vidéo principale | DaVinci Resolve : screen recording + voiceover + sous-titres FR + musique | 4h | Vidéo démo 2:50 (MP4) |
| V | Montage teaser | 30 secondes de highlights, musique dynamique | 1.5h | Teaser 30s (MP4) |
| **Total S3** | | | **18.5h** | Vidéo démo + teaser + application finalisée |

### SEMAINE 4 — Documents et approche commerciale

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | One-pager | Rédiger + designer le one-pager PDF (angle services) | 2h | One-pager PDF final |
| L-M | Proposition commerciale | Rédiger les 6 pages personnalisées Matério (avantage services, projections, tarification) | 4h | Proposition PDF finale |
| M | Hébergement démo | Déployer sur Vercel, URL propre, test final | 1h | URL partageable |
| Me | Revue complète | Relecture de tous les livrables, test démo end-to-end, validation chiffres et services | 2h | Tous livrables validés |
| Me | Préparer l'approche | Message LinkedIn + email personnalisés. Angle : « Patrick Morin prépare son intégration IA. Matério, c'est votre tour. » | 1.5h | Templates messages prêts |
| J | Premier contact LinkedIn | Envoyer au contact #1 avec teaser vidéo | 0.5h | Message envoyé |
| V | Suivi email | Email avec proposition + lien vidéo + one-pager + lien démo interactive | 0.5h | Email envoyé |
| **Total S4** | | | **11.5h** | Tous livrables + premier contact initié |

### SEMAINE 5 — Suivi et relances

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Relance LinkedIn | Suivi au contact #1 | 0.5h | — |
| M | Contact #2 | Approcher le deuxième décideur | 0.5h | — |
| Me | Relance téléphonique | Appeler le standard Matério Saint-Jérôme (450-438-3577) | 0.5h | — |
| J-V | Ajustements | Adapter la démo si feedback reçu | 2h | — |
| **Total S5** | | | **3.5h** | Objectif : appel découverte planifié |

### RÉSUMÉ DES HEURES

| Semaine | Focus | Heures |
|---|---|---|
| S1 | Données, recherche, scraper Magento 2 | 20h |
| S2 | Développement démo (fonctions services + 4 scénarios) | 21h |
| S3 | Checkout, polish, vidéo | 18.5h |
| S4 | Documents, déploiement, contact | 11.5h |
| S5 | Suivi / relances | 3.5h |
| **Total** | | **74.5h** |

> **Note :** 2.5h de plus que Patrick Morin (72h) dû au scraper Magento non-Bloomreach et aux fonctions services additionnelles.

---

## 11. Stack technique et outils

### 11.1 Outils de développement

| Outil | Usage | Coût |
|---|---|---|
| **VS Code** | Éditeur de code | Gratuit |
| **Git + GitHub** | Versionnement | Gratuit |
| **Chrome DevTools** | Debug, test responsive | Gratuit |
| **Node.js** | Runtime serveur + scraper | Gratuit |
| **OpenAI SDK** | GPT-4o (chat + function calling) | Pay-per-use (~2-5$/démo) |
| **Stripe SDK** | Checkout réel (mode test) | Gratuit en test |
| **Cheerio** | HTML scraping Magento (si API indisponible) | Gratuit |

### 11.2 Outils design / contenu

| Outil | Usage | Coût |
|---|---|---|
| **Figma** | Mockups checkout, one-pager | Gratuit (plan starter) |
| **Canva** | Alternative rapide PDF | Gratuit / Pro |

### 11.3 Outils vidéo / audio

| Outil | Usage | Coût |
|---|---|---|
| **OBS Studio** | Screen recording HD | Gratuit |
| **DaVinci Resolve** | Montage vidéo | Gratuit |
| **Audacity** | Édition audio voiceover | Gratuit |
| **Pixabay / Uppbeat** | Musique royalty-free | Gratuit |

### 11.4 Outils de prospection

| Outil | Usage | Coût |
|---|---|---|
| **LinkedIn** | Recherche contacts + outreach | Gratuit / Sales Navigator ~100$/mois |
| **Hunter.io** | Trouver adresses email | Gratuit (50 recherches/mois) |
| **Calendly** | Planifier appel découverte | Gratuit |

---

## 12. Critères de qualité / Definition of Done

### 12.1 Application démo

| Critère | Description | ✅ Quand c'est OK |
|---|---|---|
| **Vrais produits** | Les produits affichent données réelles (prix, SKU, images) | Prix vérifiés sur materio.ca (échantillon 20 produits) |
| **Services fonctionnels** | Cartes service (coupe, livraison, estimation, financement) s'affichent | 4 types de cartes service testés |
| **Financement correct** | Calcul 12/18/24/36 mois conforme aux règles Matério | 4 tranches testées avec montants limites |
| **Animation réaliste** | Streaming SSE token-by-token fluide, GPT-4o temps réel | Réponses naturelles, pas de lag |
| **Navigation fluide** | Chat IA + produits + services sans bug | 4 scénarios complets consécutifs sans bug |
| **Taxes QC correctes** | TPS (5%) et TVQ (9,975%) calculées correctement | Vérifié sur 4 scénarios |
| **Stock par magasin** | Stock affiché est spécifique au magasin sélectionné | Testé pour 3 magasins différents |
| **Responsive** | Fonctionne en 1080p, 1440p et projection | Testé sur 2 résolutions |
| **Temps de chargement** | Application charge en < 3 secondes | Mesuré avec DevTools |

### 12.2 Vidéo démo

| Critère | Description | ✅ Quand c'est OK |
|---|---|---|
| **Durée** | 2:30 – 3:00 | Chronométré |
| **Qualité audio** | Voiceover clair, pas de bruit de fond | Écouté au casque |
| **Sous-titres** | Français, intégrés à la vidéo | Visible sans son |
| **Services mis en avant** | Le centre de coupe, la livraison toit et le financement sont clairement montrés | 3 services visibles dans la vidéo |
| **CTA clair** | Coordonnées et prochaine étape visibles | Dernier écran lisible |

### 12.3 Documents commerciaux

| Critère | Description | ✅ Quand c'est OK |
|---|---|---|
| **Personnalisation Matério** | Mentions Matério, pas de texte générique ou Patrick Morin | Relu 2 fois |
| **Chiffres vérifiables** | Projections basées sur des hypothèses documentées | Sources citées |
| **Avantage services** | L'angle « services vendus par l'IA » est le fil rouge | Présent en page 2-3-4 |
| **Tarification claire** | Grille de prix sans ambiguïté, montants en CAD | Pages investissement relue |
| **PDF professionnel** | Mise en page soignée, logo Matério présent | Impression test satisfaisante |

---

## Annexe A — Comparaison des approches de scraping

### Priorité 1 : API REST Magento 2

```bash
# Test rapide — exécuter depuis le terminal
curl -s "https://www.materio.ca/rest/V1/products?searchCriteria[pageSize]=1" | head -c 500
```

Si la réponse contient du JSON avec des produits → utiliser cette approche.

### Priorité 2 : GraphQL Magento 2

```bash
curl -s -X POST "https://www.materio.ca/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products(search:\"bois\", pageSize:1) { total_count items { sku name } } }"}'
```

### Priorité 3 : HTML Scraping

```javascript
// scraper/html-fallback.js — Structure du scraper HTML
import * as cheerio from 'cheerio';

const CATEGORIES = [
  { name: 'Matériaux', url: '/materiaux', estimated: 2532 },
  { name: 'Quincaillerie et Outillage', url: '/quincaillerie-et-outillage', estimated: 2000 },
  // ... 8 autres catégories
];

async function scrapeCategory(category) {
  let page = 1;
  let products = [];
  
  while (true) {
    const url = `https://www.materio.ca${category.url}?product_list_limit=48&p=${page}`;
    const html = await fetch(url).then(r => r.text());
    const $ = cheerio.load(html);
    
    const items = $('.product-item');
    if (items.length === 0) break;
    
    items.each((_, el) => {
      products.push({
        pid: $(el).find('.product-item-link').attr('href')?.split('-').pop(),
        title: $(el).find('.product-item-link').text().trim(),
        price: parseFloat($(el).find('.price').first().text().replace(/[^0-9.,]/g, '').replace(',', '.')),
        image_url: $(el).find('.product-image-photo').attr('src'),
        brand: $(el).find('.product-brand').text().trim() || extractBrandFromTitle(title),
        url: $(el).find('.product-item-link').attr('href'),
      });
    });
    
    page++;
    await delay(500); // Rate limiting
  }
  
  return products;
}
```

---

## Annexe B — Mapping des services par magasin

| Service | Saint-Jérôme | Terrebonne | Saint-Hippolyte | Mirabel (St-Antoine) | Sainte-Sophie | Mirabel (St-Benoît) |
|---|---|---|---|---|---|---|
| Centre de coupe | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Livraison spécialisée | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service d'estimation | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Financement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ouverture de compte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Programme fidélité | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
