# Spécification et plan d'implémentation — Démo Patrick Morin

**Date :** 1er avril 2026  
**Statut :** ✅ MVP entièrement construit et fonctionnel (3 avril 2026)  
**Document :** Spécification technique détaillée et plan d'exécution pas à pas  
**Référence :** analyse-demo-patrick-morin.md

---

## TABLE DES MATIÈRES

1. [Objectifs de la démo](#1-objectifs-de-la-démo)
2. [Architecture technique](#2-architecture-technique)
3. [Données produits — Extraction et structuration](#3-données-produits--extraction-et-structuration)
4. [Interface de la démo — Spécification UI](#4-interface-de-la-démo--spécification-ui)
5. [Scénarios conversationnels — Scripts détaillés](#5-scénarios-conversationnels--scripts-détaillés)
6. [Mockup checkout ACP](#6-mockup-checkout-acp)
7. [Production vidéo](#7-production-vidéo)
8. [Documents commerciaux](#8-documents-commerciaux)
9. [Plan d'exécution semaine par semaine](#9-plan-dexécution-semaine-par-semaine)
10. [Stack technique et outils](#10-stack-technique-et-outils)
11. [Critères de qualité / Definition of Done](#11-critères-de-qualité--definition-of-done)

---

## 1. Objectifs de la démo

### 1.1 Objectif principal

Convaincre la direction de Patrick Morin de signer un contrat d'intégration ACP / ChatGPT Commerce en montrant un prototype fonctionnel avec **leurs vrais produits, leurs vrais prix et leurs vrais magasins**.

### 1.2 Objectifs mesurables

| # | Objectif | Critère de succès |
|---|---|---|
| O1 | Montrer la valeur B2C | Le prospect dit : « Je vois comment ça génère des ventes » |
| O2 | Montrer la valeur B2B (PM PRO) | Le prospect dit : « Mes entrepreneurs utiliseraient ça » |
| O3 | Créer l'urgence concurrentielle | Le prospect demande : « Quand est-ce qu'on peut commencer ? » |
| O4 | Justifier l'investissement | Le prospect comprend le ROI en < 3 mois |
| O5 | Paraître crédible et professionnel | La démo utilise les vrais produits PM, pas des données fictives |

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
┌──────────────────────────────────────────────────────────┐
│                    DÉMO INTERACTIVE (MVP)                    │
│                                                           │
│  ┌─────────────────┐    ┌──────────────────────────────┐  │
│  │  Panel gauche    │    │    Panel droit                │  │
│  │                  │    │                               │  │
│  │  Chat GPT-4o     │    │  Fiches produits PM           │  │
│  │  (IA réelle)     │    │  (images réelles,             │  │
│  │                  │    │   prix, stock, magasin)       │  │
│  │  Conversation    │◄──►│  Mise à jour dynamique        │  │
│  │  temps réel      │    │  via function calling         │  │
│  │  SSE streaming   │    │  (show_products,              │  │
│  │                  │    │   show_checkout)              │  │
│  └─────────────────┘    └──────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Barre de métriques en bas                │  │
│  │   Temps: 90s │ Produits: 8 │ Panier: 1 487$ │ ROI    │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
             │                          │
             ▼                          ▼
 ┌──────────────────────┐  ┌────────────────────┐
 │   OpenAI GPT-4o API    │  │  Stripe Checkout    │
 │   (function calling)  │  │  (paiement réel)    │
 └──────────────────────┘  └────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   Données produits   │
              │   (Bloomreach API)  │
              │   10 200 vrais      │
              │   produits PM       │
              │   + 23 magasins     │
              └──────────────────────┘
```

### 2.2 Stack technique de la démo

| Composant | Technologie | Justification |
|---|---|---|
| **Application démo** | Node.js + HTML/CSS/JS vanilla | Serveur léger avec API endpoints pour chat (OpenAI) et checkout (Stripe) |
| **Données produits** | JSON dynamique (catalog-acp.json, 10 200 produits) | Extrait via API Bloomreach Discovery, rafraîchissement horaire (cron.js), sélection subcatégorielle (top 3 par sous-catégorie L2, ~128 sous-catégories = ~300 produits dans le prompt) |
| **Chat IA** | OpenAI GPT-4o avec function calling + SSE streaming (temp 0.7 dev / 0.4 prod, max_tokens 2048) | Conversations en temps réel, recommandation via `show_products`, checkout via `show_checkout` |
| **Paiement** | Stripe Checkout (réel) | Checkout fonctionnel avec taxes QC et escompte PM PRO |
| **Animations** | CSS transitions + JS requestAnimationFrame | Streaming token-by-token, cascade de cartes produits |
| **Images produits** | 13 images locales + URLs Bloomreach pour le reste | Vrais visuels = crédibilité |
| **Hébergement** | Vercel (Serverless Functions) | Déploiement serverless requis pour les API endpoints |
| **API Catalogue** | Endpoint `/api/catalog` (Cache 5 min) | Sert le catalogue dynamiquement au frontend, auto-reload toutes les 5 minutes |
| **Scraper** | Node.js + Bloomreach Discovery API | Extraction automatisée de 10 200 produits + 23 magasins |

### 2.3 Structure de fichiers

```
demo-patrick-morin-mvp/
├── server.js            # Serveur local HTTP (dev sans Vercel)
├── package.json         # Dépendances (openai, stripe, node-cron)
├── vercel.json          # Config déploiement Vercel (serverless)
├── api/
│   ├── chat.js         # OpenAI GPT-4o streaming + function calling (Vercel)
│   └── checkout.js     # Stripe Checkout Session (Vercel)
├── data/
│   ├── catalog-acp.json # Catalogue 10 200 produits (Bloomreach API)
│   └── stores.json     # 23 magasins avec coordonnées et inventaire
├── public/
│   ├── index.html     # Interface split-screen (Chat + produits)
│   ├── success.html   # Page post-paiement Stripe
│   ├── cancel.html    # Page annulation Stripe
│   ├── css/
│   │   └── style.css   # Thème ChatGPT dark + branding PM
│   ├── js/
│   │   ├── app.js      # Logique chat, SSE streaming, panier, Stripe
│   │   ├── products.js # Fallback (catalogue chargé dynamiquement via /api/catalog)
│   │   └── animations.js # Markdown rendering, thinking dots, cascade
│   └── assets/
│       └── images/
│           └── products/  # 13 images produits locales
├── scraper/
│   ├── index.js       # Scraper Bloomreach Discovery API
│   └── cron.js        # Planificateur de rafraîchissement horaire
└── docs/
    ├── proposition.md # Proposition commerciale
    └── one-pager.md   # Résumé 1 page
```

---

## 3. Données produits — Extraction et structuration

### 3.1 Sélection des produits

**État actuel (MVP implémenté) :** Le catalogue complet de **10 200 produits** a été extrait automatiquement via l'API Bloomreach Discovery de patrickmorin.com, dépassant largement l'objectif initial de 60 produits. Le scraper (Node.js) rafraîchit les données automatiquement toutes les heures via `scraper/cron.js`.

**Sélection pour le prompt IA :** Le serveur charge le catalogue au démarrage et le recharge toutes les 5 minutes (`setInterval`). Les produits en stock (prix > 0) sont groupés par sous-catégorie de niveau 2, triés par stock total décroissant, et les **top 3 de chaque sous-catégorie** (~128 sous-catégories) sont injectés dans le system prompt — assurant une couverture équilibrée de tous les départements (~300 produits représentatifs).

Le prompt système inclut également :
- **Mapping d'upsell** : catégories complémentaires automatiques (bardeaux → feutre/clous, peinture → rouleau/ruban, etc.)
- **Templates de projets** : 8 types (toiture, terrasse, sous-sol, salle de bain, cabanon, clôture, peinture, etc.) avec questions à poser et formules de calcul
- **Formules de quantité** : bardeaux (3 paq./carré), contreplaqué (surface ÷ 32), gypse (périmètre × hauteur ÷ 32), peinture (1 gal ≈ 350-400 pi²), solives (longueur ÷ espacement + 1), etc.

Les 3 scénarios de démo fonctionnent avec l'IA GPT-4o en temps réel — le modèle filtre et recommande les produits pertinents dynamiquement parmi les 10 200 du catalogue, incluant :

#### Scénario 1 — « Le projet patio » (20 produits)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Bois traité | Planches 2×6×12, 2×6×16, 4×4×8 (poteaux), solives | 5 |
| Quincaillerie terrasse | Vis à terrasse (boîte), supports de poteau, équerres, boulons | 5 |
| Teinture / protecteur | Teinture bois extérieur, protecteur UV, scellant | 3 |
| Outils (complémentaires) | Scie circulaire, perceuse-visseuse, niveau | 3 |
| Accessoires patio | Rampe/balustrade, escalier préfab, latte de finition | 4 |

#### Scénario 2 — « La réparation urgente plomberie » (15 produits)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Réparation fuite | Kit de réparation fuite, ruban téflon, colle PVC, mastic plomberie | 4 |
| Tuyauterie | Raccords PVC, coudes, adaptateurs, tuyau flexible | 4 |
| Outils plomberie | Clé à tuyau, pince multiprise, coupe-tube | 3 |
| Accessoires | Seau, serviettes absorbantes, lampe de poche | 2 |
| Remplacement évier | Robinet cuisine, siphon, flexible alimentation | 2 |

#### Scénario 3 — « Commande entrepreneur salle de bain » (15 produits)

| Catégorie | Produits à extraire | Quantité |
|---|---|---|
| Gypse | Gypse résistant à l'humidité 1/2", gypse standard 1/2" | 2 |
| Composés et finition | Composé à joints, ruban à joints, apprêt | 3 |
| Quincaillerie | Vis à gypse (boîte), fixations, ancres | 3 |
| Membrane / étanchéité | Membrane d'étanchéité, silicone salle de bain | 2 |
| Plomberie SDB | Robinet lavabo, pomme de douche, flexible | 3 |
| Ventilation | Ventilateur de salle de bain | 1 |
| Éclairage | Plafonnier étanche salle de bain | 1 |

#### Produits additionnels pour crédibilité (10 produits)

Des produits populaires visibles en page d'accueil pour montrer la diversité du catalogue :

| Produit (réels, scrappés du site) | SKU | Prix |
|---|---|---|
| Barbecue au propane, 5 brûleurs, 75 000 BTU | 0127216 | 329,99 $ (était 429,99 $) |
| Scie à onglets coulissante à deux biseaux, 10 po | 0837289 | 339,99 $ (était 399,99 $) |
| Ensemble perceuse et visseuse à chocs MILWAUKEE, 18 V | 1198052 | 229,99 $ (était 349,99 $) |
| Scie circulaire sans fil DEWALT, 20 V MAX, 6 1/2 po | 0834335 | 219,99 $ |
| Barbecue NAPOLEON Freestyle 425, 4 brûleurs | 0312815 | 649,99 $ (était 699,99 $) |
| Gazebo MALITO aluminium, 10×12 pi | 0075042 | 1 299,99 $ (était 1 399,99 $) |
| Ensemble conversation KELOWNA, 6 pièces + parasol | 0178665 | 1 299,99 $ (était 1 399,99 $) |
| Génératrice à essence, 12 600 W | 0721895 | 999,99 $ (était 1 099,99 $) |
| Visseuse à gypse MAKITA, 18 V LXT | 1198087 | 199,99 $ (était 249,99 $) |
| Outil multifonction oscillant DEWALT, 20 V MAX XR | 0834555 | 229,99 $ |

### 3.2 Méthode d'extraction

#### Étape 3.2.1 — Scraper automatisé via Bloomreach Discovery API (implémenté)

Le scraper Node.js (`scraper/index.js`) interroge l'API Bloomreach Discovery utilisée par patrickmorin.com pour extraire l'intégralité du catalogue produit :

```javascript
// scraper/index.js — Extraction automatisée via API Bloomreach
// Extrait les 10 200 produits + 23 magasins avec inventaire par store
// Appels paginés avec rate limiting (300ms entre pages)
// 3 retries en cas d'erreur réseau
// Sortie : data/catalog-acp.json
```

- **Source :** API Bloomreach Discovery (même API utilisée par le frontend du site PM)
- **Pagination :** Extraction par lots de 200 produits avec délai de 300ms
- **Résilience :** 3 tentatives automatiques en cas d'erreur
- **Planification :** Rafraîchissement horaire via `scraper/cron.js` (node-cron)
- **Données extraites :** ID, titre, description, prix (actuel + original), image, marque, catégorie, disponibilité par magasin, livraison, attributs

### 3.3 Format de données ACP (structure cible)

Chaque produit doit être converti au format ACP pour montrer dans la démo ce que le flux réel contiendrait :

```json
{
  "products": [
    {
      "id": "PM-0127216",
      "title": "Barbecue au propane, 5 brûleurs, 75 000 BTU",
      "description": "Barbecue au propane avec 5 brûleurs pour une puissance totale de 75 000 BTU. Idéal pour les repas en famille et les grandes réceptions extérieures. Surface de cuisson généreuse.",
      "url": "https://patrickmorin.com/fr/barbecue-au-propane-5-bruleurs-75-000-btu-0127216",
      "image_url": "https://patrickmorin.com/media/catalog/product/...",
      "price": {
        "amount": 32999,
        "currency": "CAD",
        "original_amount": 42999
      },
      "brand": "Patrick Morin",
      "category": "Extérieur et jardin > Barbecues et cuisine d'extérieur",
      "availability": {
        "in_stock": true,
        "quantity_by_store": {
          "Laval": 45,
          "Repentigny": 12,
          "Brossard": 8,
          "Saint-Eustache": 15
        }
      },
      "shipping": {
        "available": true,
        "free_above": 10000,
        "pickup_in_store": true,
        "pickup_delay": "24h"
      },
      "attributes": {
        "fuel_type": "Propane",
        "burners": 5,
        "btu": 75000
      },
      "locale": "fr_CA"
    }
  ]
}
```

> **Note :** Le MVP implémenté contient **10 200 produits** dans `data/catalog-acp.json` avec stock par magasin pour les **23 succursales**. La structure de données réelle inclut également les champs `banner`, `web_only`, et `pid` (identifiant Bloomreach).

### 3.4 Données magasins

Le fichier `data/stores.json` contient les **23 magasins** Patrick Morin :

---

## 4. Interface de la démo — Spécification UI

### 4.1 Layout principal

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo PM]  Démo ChatGPT Commerce × Patrick Morin   [Scénario ▼]│ <- header fixe
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   PANEL CONVERSATION       │   PANEL PRODUITS                   │
│   (style ChatGPT)          │   (style fiche PM)                 │
│                            │                                    │
│   ┌──────────────────┐     │   ┌──────────────────────────┐     │
│   │ 👤 User msg      │     │   │  [Image produit]          │     │
│   └──────────────────┘     │   │  Titre produit            │     │
│                            │   │  SKU: 0127216             │     │
│   ┌──────────────────┐     │   │  329,99 $ ~~429,99 $~~    │     │
│   │ 🤖 ChatGPT       │     │   │  ✅ 45 en stock - Laval  │     │
│   │ response avec    │     │   │  [Ajouter au panier]      │     │
│   │ typing animation │     │   └──────────────────────────┘     │
│   └──────────────────┘     │                                    │
│                            │   ┌──────────────────────────┐     │
│   ┌──────────────────┐     │   │  [Image produit 2]        │     │
│   │ 👤 User msg 2    │     │   │  ...                      │     │
│   └──────────────────┘     │   └──────────────────────────┘     │
│                            │                                    │
│   [Zone de saisie simulée] │   TOTAL PANIER: 1 487,32 $        │
│                            │   [Acheter via ChatGPT →]          │
│                            │                                    │
├────────────────────────────┴────────────────────────────────────┤
│ ⏱ 90s │ 🛒 8 produits │ 💰 1 487$ │ 📍 Repentigny │ 🚀 ROI 3mo│ <- barre métriques
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Charte graphique

| Élément | Valeur | Source |
|---|---|---|
| **Couleur primaire PM** | `#e30613` (rouge Patrick Morin) | Logo du site |
| **Couleur secondaire** | `#1a1a1a` (noir) | Navbar du site |
| **Couleur fond ChatGPT** | `#343541` (gris foncé) | Interface ChatGPT réelle |
| **Couleur message user** | `#40414f` | Interface ChatGPT réelle |
| **Couleur message assistant** | `#444654` | Interface ChatGPT réelle |
| **Police** | `Söhne, -apple-system, sans-serif` | Typographie ChatGPT |
| **Police titres PM** | `-apple-system, BlinkMacSystemFont, sans-serif` | Site PM |
| **Border radius cards** | `12px` | Cohérent avec ChatGPT moderne |
| **Espacement** | `16px` base grid | Standard |

### 4.3 Composants UI détaillés

#### 4.3.1 — Message utilisateur

```html
<div class="message message-user">
  <div class="message-avatar">
    <img src="assets/user-avatar.svg" alt="User" />
  </div>
  <div class="message-content">
    <p>Je veux construire un patio en bois traité, environ 12×16 pieds.
       De quoi j'ai besoin ?</p>
  </div>
</div>
```

Comportement :
- Apparaît immédiatement quand le scénario avance
- Texte animé lettre par lettre (50ms/caractère) pour simuler la frappe

#### 4.3.2 — Message ChatGPT (réponse)

```html
<div class="message message-assistant">
  <div class="message-avatar">
    <img src="assets/chatgpt-icon.svg" alt="ChatGPT" />
  </div>
  <div class="message-content">
    <p>Voici ce dont vous aurez besoin pour un patio de 12×16 pieds
       en bois traité :</p>
    <div class="product-recommendations">
      <!-- Cartes produits intégrées dans la réponse -->
    </div>
  </div>
</div>
```

Comportement :
- Délai de 800ms après le message utilisateur (simule le "thinking")
- Indicateur "●●●" de typing pendant 1.5 secondes
- Texte apparaît progressivement (typing effect, 30ms/caractère)
- Les cartes produits apparaissent en cascade (200ms de délai entre chaque)

#### 4.3.3 — Carte produit dans la conversation

```html
<div class="product-card" data-sku="0127216">
  <img src="assets/images/products/0127216.jpg"
       alt="Barbecue au propane, 5 brûleurs" class="product-image" />
  <div class="product-info">
    <span class="product-brand">NAPOLEON</span>
    <h4 class="product-title">Barbecue au propane, 5 brûleurs, 75 000 BTU</h4>
    <div class="product-pricing">
      <span class="price-current">329,99 $</span>
      <span class="price-original">429,99 $</span>
      <span class="price-badge">-23%</span>
    </div>
    <div class="product-availability">
      <span class="stock-badge in-stock">✅ 45 en stock</span>
      <span class="store-name">Patrick Morin Laval</span>
    </div>
    <div class="product-actions">
      <button class="btn-add-cart">Ajouter au panier</button>
      <button class="btn-pickup">Ramassage en magasin</button>
    </div>
  </div>
</div>
```

#### 4.3.4 — Panneau droit : Résumé panier / Checkout

```html
<div class="panel-right">
  <div class="cart-summary">
    <h3>Votre panier ChatGPT</h3>
    <div class="cart-items">
      <!-- Items ajoutés dynamiquement -->
    </div>
    <div class="cart-totals">
      <div class="subtotal">Sous-total: <strong>1 284,91 $</strong></div>
      <div class="tax-tps">TPS (5%): <strong>64,25 $</strong></div>
      <div class="tax-tvq">TVQ (9,975%): <strong>128,17 $</strong></div>
      <div class="shipping">Livraison: <strong>Gratuite ✓</strong></div>
      <div class="total">Total: <strong>1 477,33 $</strong></div>
    </div>
    <button class="btn-checkout-acp">
      Payer avec ChatGPT Commerce →
    </button>
    <div class="checkout-badges">
      <img src="assets/stripe-badge.svg" alt="Powered by Stripe" />
      <span>Paiement sécurisé • Données protégées (Loi 25)</span>
    </div>
  </div>
</div>
```

### 4.4 Barre de métriques en temps réel (bottom bar)

Objectif : montrer visuellement l'efficacité pendant la démo.

| Métrique | Icône | Comportement |
|---|---|---|
| **Temps écoulé** | ⏱ | Chronomètre qui tourne depuis le début du scénario |
| **Produits recommandés** | 🛒 | Compteur qui s'incrémente à chaque produit affiché |
| **Valeur du panier** | 💰 | Montant qui augmente à chaque ajout |
| **Magasin le plus proche** | 📍 | Nom du magasin avec stock (Repentigny, Laval, etc.) |
| **Économie vs Google Ads** | 🚀 | « Cette vente aurait coûté ~65 $ en acquisition sur Google » |

### 4.5 Responsive / Modes d'affichage

| Mode | Layout | Usage |
|---|---|---|
| **Desktop (>1200px)** | Split 50/50 avec barre métriques bottom | Présentation normale |
| **Desktop large (>1400px)** | Split 45/55 (plus de place pour les produits) | Grand écran / projection |
| **Tablette (768-1200px)** | Conversation full-width, produits en overlay slide-in | Présentation informelle |
| **Mobile** | Non prioritaire pour cette démo | — |

---

## 5. Scénarios conversationnels — Scripts détaillés

### 5.1 Scénario 1 — « Le projet patio » (B2C)

**Durée cible :** 2 minutes  
**Persona :** Marie, propriétaire à Repentigny  
**Contexte :** Fin avril, Marie planifie la construction de son patio pour l'été.

#### Tour 1 — La demande initiale

**User (Marie) :**
> Je veux construire un patio en bois traité, environ 12 pieds par 16 pieds. C'est pour ma cour à Repentigny. De quoi j'ai besoin comme matériaux et combien ça va me coûter ?

**ChatGPT (après 2s de typing) :**
> Super projet ! Pour un patio de 12×16 pi en bois traité, voici la liste de matériaux que je vous recommande, disponibles chez **Patrick Morin Repentigny** :
>
> **Structure :**
> - 12× Planches 2×6×16' bois traité (solives) — **X,XX $ chacune**
> - 6× Poteaux 4×4×8' bois traité (supports) — **X,XX $ chacun**
> - 4× Poutres 2×8×16' bois traité (porteurs) — **X,XX $ chacune**
>
> **Platelage :**
> - 32× Planches 5/4×6×12' bois traité (surface) — **X,XX $ chacune**
>
> **Quincaillerie :**
> - 2× Boîtes de vis à terrasse en acier inoxydable (3") — **X,XX $ /boîte**
> - 12× Supports de poteau ajustables — **X,XX $ chacun**
> - 1× Paquet d'équerres de renfort — **X,XX $**
>
> **Finition :**
> - 2× Teinture bois extérieur (3,78L) — **X,XX $ chacune**

*(Les cartes produits apparaissent en cascade dans le panneau droit)*

**Métriques mises à jour :** ⏱ 0:35 │ 🛒 12 produits │ 💰 ~1 200 $ │ 📍 Repentigny

#### Tour 2 — Le total

**User (Marie) :**
> Ça fait combien au total avec les taxes ?

**ChatGPT :**
> Voici le récapitulatif :
>
> | Catégorie | Montant |
> |---|---|
> | Structure (bois) | 845,00 $ |
> | Quincaillerie (vis, supports) | 189,91 $ |
> | Finition (teinture) | 89,98 $ |
> | **Sous-total** | **1 124,89 $** |
> | TPS (5%) | 56,24 $ |
> | TVQ (9,975%) | 112,21 $ |
> | Livraison | **Gratuite** (> 100 $) |
> | **Total** | **1 293,34 $** |
>
> Tout est disponible au magasin Patrick Morin de **Repentigny** (567, boul. Pierre-Le Gardeur). Voulez-vous commander pour ramassage en magasin ?

**Métriques :** ⏱ 0:55 │ 💰 1 293,34 $

#### Tour 3 — Ajout d'outils

**User (Marie) :**
> Oui ! Ah, et j'ai besoin d'une perceuse aussi. Quelque chose de bonne qualité mais pas trop cher.

**ChatGPT :**
> Je vous recommande cet ensemble très populaire :
>
> **Ensemble combiné perceuse-visseuse et visseuse à chocs DEWALT, 20 V MAX** — **229,99 $** (SKU: 0834497)
> ✅ 11 en stock à Repentigny
>
> Il inclut la perceuse, la visseuse à chocs, 2 batteries et le chargeur. Parfait pour monter un patio. Je l'ajoute à votre commande ?

*(Carte produit apparaît avec photo réelle, prix, stock)*

**Métriques :** ⏱ 1:15 │ 🛒 13 produits │ 💰 1 523,33 $

#### Tour 4 — Checkout

**User (Marie) :**
> Oui, ajoute-la. Je commande tout, ramassage au magasin de Repentigny.

**ChatGPT :**
> Parfait ! Voici votre récapitulatif final :
>
> **13 produits** — Total : **1 558,67 $** (taxes incluses)
> 📍 Ramassage : **Patrick Morin Repentigny** — commande prête sous 24h
>
> [Procéder au paiement sécurisé →]

*(Transition vers le mockup checkout ACP — voir section 6)*

**Métriques finales :** ⏱ 1:30 │ 🛒 13 produits │ 💰 1 558,67 $ │ 🚀 « Coût Google Ads équivalent : ~65 $ »

---

### 5.2 Scénario 2 — « La réparation urgente » (B2C)

**Durée cible :** 1 minute  
**Persona :** Jean, locataire à Laval  
**Contexte :** Samedi 8h du matin, l'évier coule.

#### Tour 1

**User (Jean) :**
> J'ai une fuite sous l'évier de ma cuisine, ça coule pas mal. J'ai besoin de quelque chose pour patcher ça en attendant le plombier lundi. Je suis à Laval.

**ChatGPT (après 1.5s) :**
> Voici ce que je vous recommande pour colmater en urgence, tout disponible au **Patrick Morin Laval** (4300, boul. Robert-Bourassa) :
>
> 1. **Ruban de réparation auto-fusionnant pour tuyaux** — **X,XX $** ✅ En stock
>    *S'enroule autour du tuyau et scelle la fuite sans outils*
>
> 2. **Mastic époxy pour plomberie** — **X,XX $** ✅ En stock
>    *Pour colmater les fissures sur les raccords*
>
> 3. **Ruban téflon (rouleau)** — **X,XX $** ✅ En stock
>    *Pour resserrer les joints filetés qui suintent*
>
> 💡 **Conseil :** Coupez l'eau sous l'évier (valve d'arrêt) avant d'appliquer le ruban. Placez un seau en dessous en attendant.
>
> Total estimé : **~25 $ – 35 $**. Voulez-vous acheter pour ramassage immédiat ?

**Métriques :** ⏱ 0:20 │ 🛒 3 produits │ 💰 ~30 $ │ 📍 Laval (8 min en auto)

#### Tour 2

**User (Jean) :**
> Oui, je veux ramasser ça le plus vite possible.

**ChatGPT :**
> Commande confirmée ! 🎉
>
> **3 produits** — Total : **34,47 $** (taxes incluses)
> 📍 **Patrick Morin Laval** — Ouvert maintenant (8h-17h samedi)
> 🚗 Environ 8 minutes de route depuis le centre de Laval
>
> Votre commande sera prête au comptoir. Présentez votre confirmation à l'arrivée.
>
> [Payer maintenant →]

**Métriques finales :** ⏱ 0:40 │ 💰 34,47 $ │ 📍 Prêt au comptoir │ 🚀 « Client capté en 40 secondes. Sur Google, il aurait été chez Home Depot. »

---

### 5.3 Scénario 3 — « La commande entrepreneur » (B2B / PM PRO)

**Durée cible :** 2 minutes  
**Persona :** Luc, entrepreneur général, RBQ actif  
**Contexte :** Luc rénove une salle de bain complète à Saint-Eustache. Il commande ses matériaux le matin pour livraison chantier.

#### Tour 1

**User (Luc) :**
> Bonjour, je suis entrepreneur, compte PM PRO #14523. J'ai un remodelage de salle de bain à Saint-Eustache. J'ai besoin de : gypse résistant à l'humidité, composé à joints, vis à gypse, membrane d'étanchéité, et un ventilateur de salle de bain. Livraison au chantier demain matin 7h au 234 rue des Pins, Saint-Eustache.

**ChatGPT :**
> Bonjour Luc ! Votre compte PM PRO #14523 est vérifié. ✅
>
> Voici votre liste de matériaux, avec les **prix PM PRO** :
>
> | Produit | Qté | Prix PRO unit. | Total |
> |---|---|---|---|
> | Gypse résistant à l'humidité 1/2" × 4' × 8' | 12 feuilles | XX,XX $ | XXX,XX $ |
> | Composé à joints tout usage (21 kg) | 2 seaux | XX,XX $ | XX,XX $ |
> | Ruban à joints papier (150') | 2 rouleaux | XX,XX $ | XX,XX $ |
> | Vis à gypse 1-1/4" (boîte 1000) | 1 boîte | XX,XX $ | XX,XX $ |
> | Membrane d'étanchéité liquide (3,78L) | 1 contenant | XX,XX $ | XX,XX $ |
> | Ventilateur SDB 80 CFM avec lumière | 1 | XX,XX $ | XX,XX $ |
>
> **Sous-total PRO : XXX,XX $**
> **Livraison chantier : XX,XX $**
>
> 📍 Livraison : **234 rue des Pins, Saint-Eustache**
> 📅 Demain **7h00** — Depuis le magasin de **Saint-Eustache** (525, boul. Arthur-Sauvé)
>
> Je mets ça sur votre compte PM PRO ? La facture sera ajoutée à votre relevé mensuel.

**Métriques :** ⏱ 0:30 │ 🛒 6 produits │ 💰 ~650 $ │ 📍 Livraison chantier 7h

#### Tour 2 — Ajout et confirmation

**User (Luc) :**
> Ajoute aussi de la silicone pour salle de bain, 2 tubes. Et oui, mets tout sur le compte.

**ChatGPT :**
> Ajouté ! 2× **Silicone pour cuisine et salle de bain** — **X,XX $ chacun**
>
> Récapitulatif final :
>
> **8 produits** — Sous-total PRO : **XXX,XX $** + taxes
> 💰 Total avec taxes et livraison : **XXX,XX $**
> 📄 Facturé au **Compte PM PRO #14523**
> 📍 Livraison : 234 rue des Pins, Saint-Eustache — **Demain 7h00**
>
> Commande confirmée ! ✅ Vous recevrez une confirmation par courriel avec le numéro de suivi.

**Métriques finales :** ⏱ 1:00 │ 🛒 8 produits │ 💰 ~700 $ │ 🚀 « Commande passée en 60 secondes vs. 20 min au téléphone »

---

### 5.4 Interaction dans la démo (MVP implémenté)

Le MVP utilise GPT-4o en temps réel — les scénarios ci-dessus servent de **suggestions de conversation** mais l'utilisateur peut poser n'importe quelle question. Le modèle utilise le function calling pour afficher les produits (`show_products`) et déclencher le checkout (`show_checkout`).

**Architecture du prompt IA :**
- Catalogue dynamique : ~300 produits sélectionnés (top 3 par sous-catégorie L2 parmi ~128 sous-catégories) injectés dans le system prompt
- Auto-reload : le serveur recharge le catalogue depuis `catalog-acp.json` toutes les 5 minutes
- 8 templates de projets intégrés (toiture, terrasse, sous-sol, SDB, cabanon, clôture, peinture)
- Formules de calcul de quantités (bardeaux, gypse, peinture, solives, etc.)
- Mapping d'upsell automatique par catégorie

L'interface propose des **suggestion chips** pour guider les premières interactions :
- 🏡 « Construire un patio 12×16 »
- 🔧 « Urgence plomberie »
- 👷 « Commande PM PRO salle de bain »

---

## 6. Mockup checkout ACP

### 6.1 Écran de checkout

Cet écran apparaît quand le client clique « Payer maintenant » dans la conversation. Il simule l'expérience de checkout ACP / Stripe.

```
┌─────────────────────────────────────────────────────────┐
│                  Logo Patrick Morin                       │
│           Paiement sécurisé — ChatGPT Commerce           │
├────────────────────────────┬────────────────────────────┤
│                            │                             │
│   VOTRE COMMANDE           │   PAIEMENT                  │
│                            │                             │
│   🛒 13 produits            │   Nom sur la carte          │
│                            │   [Marie Tremblay        ]  │
│   Bois traité 2×6×16'     │                             │
│   × 12 ............645,00 $│   Numéro de carte           │
│   Poteaux 4×4×8'           │   [4242 •••• •••• ••••   ]  │
│   × 6 .............155,00 $│                             │
│   Perceuse DEWALT          │   Expiration    CVC         │
│   × 1 .............229,99 $│   [06/27    ]   [•••    ]  │
│   ... +10 autres produits  │                             │
│                            │   📍 Ramassage en magasin    │
│   ─────────────────────    │   Patrick Morin Repentigny  │
│   Sous-total    1 354,89 $ │   567, boul. Pierre-Le      │
│   TPS (5%)         67,74 $ │   Gardeur, J5Z 5H1          │
│   TVQ (9,975%)    135,13 $ │   Prêt sous 24h             │
│   Livraison       Gratuite │                             │
│   ─────────────────────    │                             │
│   TOTAL        1 557,76 $  │   [🔒 Payer 1 557,76 $]    │
│                            │                             │
│   Marchand: Patrick Morin  │   Powered by Stripe         │
│   Centres de rénovation    │   🔒 Paiement 256-bit       │
│                            │   Conforme Loi 25 QC        │
└────────────────────────────┴────────────────────────────┘
```

### 6.2 Écran de confirmation (après « paiement »)

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│             ✅ Commande confirmée !                   │
│                                                      │
│          Commande #PM-2026-04-15-1847                │
│                                                      │
│   📍 Ramassage : Patrick Morin Repentigny            │
│      567, boul. Pierre-Le Gardeur                    │
│      Prêt avant : 16 avril 2026, 17h00              │
│                                                      │
│   📧 Confirmation envoyée à marie@email.com          │
│                                                      │
│   📦 13 produits — Total payé : 1 557,76 $           │
│                                                      │
│   [Voir ma commande]  [Retour à ChatGPT]             │
│                                                      │
│   ──────────────────────────────────────────         │
│   Marchand : Patrick Morin Centres de rénovation     │
│   Ce paiement a été traité via ChatGPT Commerce      │
│   powered by Stripe. Vous êtes le client de          │
│   Patrick Morin, pas d'OpenAI.                       │
└─────────────────────────────────────────────────────┘
```

### 6.3 Points à souligner visuellement dans le checkout

| Point | Comment le montrer |
|---|---|
| **Patrick Morin est le marchand** | Logo PM en haut, « Marchand : Patrick Morin » |
| **0% commission** | Aucune mention de frais de plateforme. Contraster avec un badge « Pas de commission Amazon/Etsy » |
| **Données du client → Patrick Morin** | « Votre email sera utilisé par Patrick Morin pour le suivi de commande » |
| **Paiement sécurisé** | Badge Stripe, mention « 256-bit encryption » |
| **Conformité Loi 25** | Mention « Conforme Loi 25 Québec — Vos données protégées » |
| **Taxes QC correctes** | TPS + TVQ affichées séparément (preuve de connaissance du marché QC) |

---

## 7. Production vidéo

### 7.1 Storyboard

| Segment | Durée | Contenu visuel | Voiceover (FR) |
|---|---|---|---|
| **Intro** | 0:00 – 0:10 | Logo PM + titre « Et si vos clients achetaient directement dans ChatGPT ? » | *« Chaque jour, 300 millions de personnes demandent à ChatGPT quoi acheter. Vos produits n'y sont pas. Pas encore. »* |
| **Problème** | 0:10 – 0:25 | Animation : requête Google « bois traité patio » → 42M résultats → confusion. Puis même requête dans ChatGPT → réponse directe. | *« Vos clients ne veulent plus chercher. Ils veulent des réponses. Et ils veulent acheter — maintenant. »* |
| **Scénario 1** | 0:25 – 1:30 | Démo live du scénario patio (accéléré). Conversation + produits + checkout. | *« Regardez. Marie à Repentigny tape sa question… 90 secondes plus tard, elle a commandé pour 1 500 dollars de matériaux. Ramassage au magasin demain. »* |
| **Le point clé** | 1:30 – 1:45 | Chiffres en gros : 0% commission, 90 secondes, 1 557$ de vente | *« Zéro commission. Le client est le vôtre. L'argent va dans votre compte Stripe. Pas celui d'Amazon. »* |
| **Scénario 3 (B2B)** | 1:45 – 2:15 | Démo rapide du scénario entrepreneur PM PRO | *« Et vos entrepreneurs du comptoir PM PRO ? Imaginez : commande en 60 secondes, livraison au chantier à 7h, facturé sur le compte PRO. Plus besoin d'attendre au téléphone. »* |
| **Urgence** | 2:15 – 2:35 | Logos Home Depot + Amazon + Canac. Texte : « Ils vont le faire. La question c'est : avant ou après vous ? » | *« Home Depot a les budgets pour intégrer ça demain. Canac y pense déjà. La fenêtre pour être le premier quincaillier québécois sur ChatGPT est maintenant. »* |
| **CTA** | 2:35 – 2:50 | Écran avec coordonnées, logo, « Parlons-en — 30 minutes, sans engagement » | *« On est prêts à vous montrer ça avec vos vrais produits. 30 minutes, c'est tout ce qu'il faut. »* |

### 7.2 Teaser vidéo (30 secondes)

| Segment | Durée | Contenu |
|---|---|---|
| Hook | 0:00 – 0:05 | *« Patrick Morin sur ChatGPT. Regardez. »* |
| Démo flash | 0:05 – 0:22 | Accéléré : question patio → produits → total → checkout. Musique dynamique. |
| CTA | 0:22 – 0:30 | *« Vos produits. Vos prix. Vos clients. Zéro commission. On vous montre ? »* |

### 7.3 Spécifications techniques vidéo

| Paramètre | Valeur |
|---|---|
| Résolution | 1920×1080 (Full HD) |
| FPS | 30 |
| Format | MP4 (H.264) |
| Audio | Voiceover mono, musique de fond low-fi (royalty-free) |
| Sous-titres | Oui, FR, intégrés (pour lecture LinkedIn/email sans son) |
| Taille cible | < 50 MB (démo longue), < 15 MB (teaser) |

---

## 8. Documents commerciaux

### 8.1 One-pager (1 page PDF)

Structure :

```
┌──────────────────────────────────────────────┐
│  [Logo PM]  ×  [Logo ChatGPT Commerce]        │
│                                               │
│  VOS PRODUITS SUR CHATGPT                     │
│  300M d'acheteurs. 0% de commission.          │
│                                               │
│  ┌───────┐ ┌───────┐ ┌───────┐                │
│  │ 1 557$│ │ 0%    │ │ 90s   │                │
│  │ vente │ │ comm. │ │ pour  │                │
│  │ patio │ │       │ │ vendre│                │
│  └───────┘ └───────┘ └───────┘                │
│                                               │
│  COMMENT ÇA MARCHE                            │
│  1. Le client pose sa question dans ChatGPT   │
│  2. ChatGPT recommande VOS produits           │
│  3. Le client achète → paiement dans VOTRE    │
│     Stripe → ramassage dans VOTRE magasin     │
│                                               │
│  POURQUOI MAINTENANT                          │
│  • Programme en accès anticipé                │
│  • Vos concurrents n'y sont pas encore        │
│  • Fit naturel avec la quincaillerie          │
│                                               │
│  PROJECTION CONSERVATRICE                     │
│  100 commandes/mois × 180$ = 18 000$/mois    │
│  = 216 000$/an de revenu additionnel          │
│  ROI positif en ~3 mois                       │
│                                               │
│  [Coordonnées] [QR code vers la vidéo démo]   │
└──────────────────────────────────────────────┘
```

### 8.2 Proposition commerciale (4-6 pages PDF)

Plan du document :

| Page | Contenu |
|---|---|
| **1 — Couverture** | « Proposition — Intégration ChatGPT Commerce pour Patrick Morin ». Logos, date, coordonnées. |
| **2 — Le contexte** | L'IA change le commerce. 300M d'utilisateurs. La quincaillerie = cas d'usage parfait. Concurrents qui bougent. |
| **3 — Ce qu'on propose** | Intégration ACP complète. Détail des livrables : audit catalogue, feed produits, API stock multi-magasins, Stripe, soumission partenaire, formation. |
| **4 — Les résultats attendus** | Projections de ventes. ROI. Scénarios (conservateur / optimiste). Comparaison coût d'acquisition vs. Google Ads. |
| **5 — L'investissement** | Grille tarifaire (Enterprise ACP + PM PRO + Maintenance). Paiement en phases possible. |
| **6 — Prochaines étapes** | 1) Appel découverte 30 min. 2) Audit gratuit du catalogue (1 semaine). 3) Proposition détaillée. 4) Kick-off projet. |

---

## 9. Plan d'exécution semaine par semaine

### SEMAINE 1 — Recherche et extraction des données ✅ Complétée

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Recherche contacts | Identifier sur LinkedIn le VP marketing / VP numérique / DG de Patrick Morin. Trouver les décideurs. | 2h | Liste de 3-5 contacts avec profils |
| L-M | Extraction produits (Scénario 1) | Visiter 20 pages produits (bois, quincaillerie terrasse, teinture), extraire toutes les données | 4h | 20 fiches produit JSON validées |
| M-Me | Extraction produits (Scénario 2) | 15 produits plomberie + urgence | 3h | 15 fiches produit JSON validées |
| Me-J | Extraction produits (Scénario 3) | 15 produits salle de bain + gypse | 3h | 15 fiches produit JSON validées |
| J-V | Extraction produits complémentaires | 10 produits populaires (barbecues, outils, etc.) | 2h | 10 fiches produit JSON validées |
| V | Structuration données | Conversion au format ACP JSON, validation, création fichier stores.json | 3h | `catalog-acp.json` + `stores.json` finaux |
| **Total S1** | | | **17h** | 10 200 produits + 23 magasins en JSON ✅ |

### SEMAINE 2 — Développement de l'application démo ✅ Complétée

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Setup projet | Créer la structure de fichiers, configurer le build (si React) ou le fichier HTML, importer les données | 2h | Projet initialisé, données chargées |
| L-M | UI — Panel conversation | Layout split-screen, composant message user/assistant, animations typing (CSS + JS) | 4h | Conversation ChatGPT fonctionnelle avec animation |
| M-Me | UI — Cartes produits | Composant carte produit avec image, prix, stock, badges. Design fidèle au site PM. | 3h | Cartes produit visuellement polies |
| Me | UI — Panel panier/résumé | Résumé panier dynamique, calcul TPS/TVQ, compteur | 2h | Panier fonctionnel avec taxes |
| J | UI — Barre métriques | Chronomètre, compteurs, indicateurs en temps réel | 2h | Barre de métriques animée |
| J | Logique scénarios | Système de step-through : chaque touche avance la conversation, charge les bons produits, met à jour le panier | 3h | Navigation par clavier fonctionnelle (1/2/3, espace, reset) |
| V | Scénario 1 complet | Brancher les 4 tours de conversation avec les 20 produits du patio | 2h | Scénario 1 jouable de bout en bout |
| V | Scénario 2 complet | Brancher les 2 tours plomberie urgente | 1.5h | Scénario 2 jouable |
| V | Scénario 3 complet | Brancher les 2 tours entrepreneur PM PRO | 2h | Scénario 3 jouable |
| **Total S2** | | | **21.5h** | Application démo fonctionnelle, 3 scénarios jouables ✅ |

### SEMAINE 3 — Checkout, polish et vidéo ✅ Partiellement complétée

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Checkout Stripe | Checkout Stripe réel avec taxes QC, escompte PM PRO, pages success/cancel, branding PM | 3h | Checkout fonctionnel ✅ |
| L-M | Polish UI | Responsive, transitions fluides, corrections visuelles, test sur projecteur/grand écran | 3h | Application finalisée et polie ✅ |
| M | Mode auto-play | Ajouter le mode lecture automatique pour l'enregistrement vidéo (timings calibrés) | 2h | Auto-play fonctionnel |
| Me | Rédaction script voiceover | Écrire le texte du narrateur pour la vidéo 2:50 + teaser 30s | 2h | Scripts voiceover finaux |
| Me-J | Enregistrement vidéo | OBS Studio : enregistrer 3 prises de la démo en auto-play, avec résolution 1080p | 2h | Fichiers vidéo bruts |
| J | Enregistrement voiceover | Enregistrer la narration audio (micro USB, pièce calme, fichier WAV) | 1h | Fichier audio voiceover |
| J-V | Montage vidéo principale | DaVinci Resolve : assembler screen recording + voiceover + sous-titres FR + musique | 4h | Vidéo démo 2:50 finalisée (MP4) |
| V | Montage teaser | Couper 30 secondes de highlights, ajout musique dynamique | 1.5h | Teaser 30s finalisé (MP4) |
| **Total S3** | | | **18.5h** | Vidéo démo + teaser + application finalisée |

### SEMAINE 4 — Documents et approche commerciale ✅ Partiellement complétée

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | One-pager | Rédiger + designer le one-pager PDF (Figma ou Canva) | 2h | One-pager PDF final ✅ |
| L-M | Proposition commerciale | Rédiger les 6 pages de la proposition personnalisée PM | 4h | Proposition PDF finale ✅ |
| M | Hébergement démo | Déployer l'application sur Vercel (serverless functions), obtenir l'URL propre | 1h | URL partageable de la démo ✅ |
| Me | Revue complète | Relecture de tous les livrables, test démo end-to-end, validation chiffres | 2h | Tous livrables validés |
| Me | Préparer l'approche | Rédiger le message LinkedIn + email d'accompagnement, personnalisés par contact | 1.5h | Templates de messages prêts |
| J | Premier contact LinkedIn | Envoyer le message LinkedIn au contact #1 avec teaser vidéo | 0.5h | Message envoyé |
| V | Suivi email | Envoyer l'email avec proposition + lien vidéo démo + one-pager | 0.5h | Email envoyé |
| **Total S4** | | | **11.5h** | Tous livrables finaux + premier contact initié |

### SEMAINE 5 — Suivi et relances

| Jour | Tâche | Détail | Heures | Livrable |
|---|---|---|---|---|
| L | Relance LinkedIn | Message de suivi au contact #1 si pas de réponse | 0.5h | — |
| M | Contact #2 | Approcher le deuxième contact identifié (même matériel) | 0.5h | — |
| Me | Relance téléphonique | Appeler le standard Patrick Morin, demander le VP marketing/numérique | 0.5h | — |
| J-V | Ajustements | Si feedback reçu, ajuster la démo ou la proposition | 2h | — |
| **Total S5** | | | **3.5h** | Objectif : appel découverte planifié |

### RÉSUMÉ DES HEURES

| Semaine | Focus | Heures | Statut |
|---|---|---|---|
| S1 | Données, recherche et scraper | 17h | ✅ |
| S2 | Développement démo (Node.js + GPT-4o + Stripe) | 21.5h | ✅ |
| S3 | Checkout, polish, vidéo | 18.5h | ✅ Partiel (vidéo ⏳) |
| S4 | Documents, déploiement, contact | 11.5h | ✅ Partiel (approche ⏳) |
| S5 | Suivi / relances | 3.5h | ⏳ |
| **Total** | | **72h** | **~80% fait** |

---

## 10. Stack technique et outils

### 10.1 Outils de développement

| Outil | Usage | Coût |
|---|---|---|
| **VS Code** | Éditeur de code pour l'application démo | Gratuit |
| **Git + GitHub** | Versionnement | Gratuit |
| **Chrome DevTools** | Debug, test responsive | Gratuit |
| **Node.js** | Runtime serveur + scraper | Gratuit |
| **OpenAI SDK** | Intégration GPT-4o (chat + function calling) | Pay-per-use |
| **Stripe SDK** | Checkout réel (mode test disponible) | Gratuit en test |

### 10.2 Outils design / contenu

| Outil | Usage | Coût |
|---|---|---|
| **Figma** | Design des mockups checkout, one-pager (si besoin de pixel-perfect) | Gratuit (plan starter) |
| **Canva** | Alternative rapide pour le one-pager et la proposition PDF | Gratuit / Pro |
| **Google Fonts** | Polices (Söhne alternative : Inter ou Plus Jakarta Sans) | Gratuit |

### 10.3 Outils vidéo / audio

| Outil | Usage | Coût |
|---|---|---|
| **OBS Studio** | Screen recording HD | Gratuit |
| **DaVinci Resolve** | Montage vidéo professionnel | Gratuit |
| **Audacity** | Édition audio voiceover | Gratuit |
| **Pixabay / Uppbeat** | Musique de fond royalty-free | Gratuit |

### 10.4 Outils de prospection

| Outil | Usage | Coût |
|---|---|---|
| **LinkedIn** | Recherche contacts + outreach | Gratuit (ou Sales Navigator ~100 $/mois) |
| **Hunter.io** | Trouver les adresses email | Gratuit (50 recherches/mois) |
| **Calendly** | Planifier l'appel découverte | Gratuit |

---

## 11. Critères de qualité / Definition of Done

### 11.1 Application démo

| Critère | Description | ✅ Quand c'est OK |
|---|---|---|
| **Vrais produits** | Les 10 200 produits ont des données réelles (prix, SKU, images) extraites via API Bloomreach | Les prix correspondent au site (à vérifier périodiquement, rafraîchis toutes les heures) |
| **Animation réaliste** | Le streaming SSE token-by-token est fluide, GPT-4o répond en temps réel | Les réponses apparaissent de façon naturelle |
| **Navigation fluide** | Le chat IA fonctionne sans bug, les cartes produits apparaissent en cascade | 3 conversations complètes consécutives sans bug |
| **Taxes QC correctes** | TPS (5%) et TVQ (9,975%) calculées correctement | Montants vérifiés sur 3 scénarios |
| **Responsive** | Fonctionne sur écran 1080p, 1440p et projection HD | Testé sur 2 résolutions + navigateur |
| **Temps de chargement** | L'application charge en < 2 secondes | Mesuré avec DevTools |
| **Offline-capable** | Le catalogue est chargé au démarrage depuis le JSON local ; les images clés (13) sont embarquées | Test avec les images locales |

### 11.2 Vidéo démo

| Critère | Description |
|---|---|
| **Durée** | 2:30 – 3:00 (pas plus) |
| **Voiceover** | Français québécois, ton professionnel mais accessible, pas de jargon technique |
| **Sous-titres** | Intégrés (pour lecture LinkedIn sans son) |
| **Qualité visuelle** | 1080p minimum, pas de pixelisation, pas de curseur visible |
| **Audio** | Voiceover clair, musique de fond non intrusive, pas de clipping |
| **CTA** | Call-to-action clair à la fin avec coordonnées |

### 11.3 Documents

| Critère | Description |
|---|---|
| **Personnalisation** | Chaque mention de « Patrick Morin » est correcte, pas de placeholder oublié |
| *x] L'URL de la démo fonctionne (testée dans Chrome, Firefox, Safari)
- [ ] La vidéo se lit correctement (testée sur mobile et desktop)
- [ ] Le teaser fait < 30 secondes (compatible LinkedIn natif)
- [x] Le PDF de la proposition s'ouvre correctement
- [ ] Les coordonnées de contact sont correctes
- [ ] Le message LinkedIn est personnalisé pour le contact spécifique
- [x] Aucune mention d'un autre client ou concurrent dans les documents (pas de copier-coller d'un autre prospect)
- [x] L'URL de la démo fonctionne (testée dans Chrome, Firefox, Safari)
- [ ] La vidéo se lit correctement (testée sur mobile et desktop)
- [ ] Le teaser fait < 30 secondes (compatible LinkedIn natif)
- [ ] Le PDF de la proposition s'ouvre correctement
- [ ] Les coordonnées de contact sont correctes
- [ ] Le message LinkedIn est personnalisé pour le contact spécifique
- [ ] Aucune mention d'un autre client ou concurrent dans les documents (pas de copier-coller d'un autre prospect)
- [ ] Les prix produits affichés dans la démo sont à jour (vérifier 5 produits aléatoires sur le site avant envoi)
