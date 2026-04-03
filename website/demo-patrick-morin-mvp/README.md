# Patrick Morin × ChatGPT Commerce — MVP

MVP fonctionnel d'un assistant commercial IA pour Patrick Morin, intégrant OpenAI GPT-4o et Stripe Checkout.

## Architecture

```
demo-patrick-morin-mvp/
├── api/
│   ├── chat.js          ← OpenAI GPT-4o streaming + function calling
│   └── checkout.js      ← Stripe Checkout Session
├── data/
│   ├── catalog-acp.json ← Catalogue 10 200 produits (Bloomreach API)
│   └── stores.json      ← 23 magasins avec coordonnées et stock
├── public/
│   ├── index.html       ← Interface split-screen (ChatGPT + produits)
│   ├── css/style.css    ← Thème ChatGPT dark + branding PM
│   ├── js/
│   │   ├── app.js       ← Logique chat, streaming SSE, panier, Stripe
│   │   ├── products.js  ← Fallback (catalogue chargé dynamiquement via /api/catalog)
│   │   └── animations.js← Markdown rendering, thinking dots, cascade
│   └── assets/images/products/  ← 13 images produits locales
│   ├── success.html     ← Page post-paiement Stripe
│   └── cancel.html      ← Page annulation Stripe
├── scraper/
│   ├── index.js         ← Scraper Bloomreach Discovery API
│   └── cron.js          ← Rafraîchissement horaire automatisé
├── server.js            ← Serveur local (dev sans Vercel)
├── vercel.json          ← Config déploiement Vercel
└── package.json
```

## Démarrage rapide

### 1. Installer les dépendances

```bash
cd demo-patrick-morin-mvp
npm install
```

### 2. Configurer les clés API

```bash
cp .env.example .env
```

Modifier `.env` avec vos clés :

```
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Lancer le serveur local

```bash
node server.js
```

Ouvrir http://localhost:3000

## Fonctionnalités

| Fonctionnalité | Statut |
|---|---|
| Chat IA temps réel (GPT-4o) | ✅ |
| Streaming token-by-token (SSE) | ✅ |
| Recommandation de produits (function calling) | ✅ |
| 10 200 produits réels PM (Bloomreach API) | ✅ |
| 23 magasins avec stock en temps réel | ✅ |
| 13 images produits locales | ✅ |
| Scraper automatisé + rafraîchissement horaire | ✅ |
| Cartes produits avec stock/prix | ✅ |
| Panier automatique | ✅ |
| Checkout Stripe réel | ✅ |
| Taxes QC (TPS 5% + TVQ 9.975%) | ✅ |
| Escompte PM PRO 10% | ✅ |
| Thème ChatGPT dark | ✅ |
| Responsive | ✅ |

## Déploiement Vercel

```bash
npm i -g vercel
vercel
```

Ajouter les variables d'environnement dans les paramètres du projet Vercel :
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`

## Flow utilisateur

1. L'utilisateur décrit son projet (ex: « construire un patio 12×16 »)
2. GPT-4o analyse et recommande des produits via `show_products` (function calling)
3. Les produits apparaissent en cartes sur le panneau droit
4. L'utilisateur confirme sa commande
5. GPT-4o appelle `show_checkout` → panneau de commande
6. Clic « Payer avec Stripe » → redirection Stripe Checkout
7. Paiement → page de confirmation

## Scénarios suggérés

- 🏡 **Patio 12×16** — Projet complet bois traité (~1 500$)
- 🔧 **Urgence plomberie** — Conversion rapide (~25$)
- 👷 **PM PRO SDB** — Entrepreneur avec escompte 10%
