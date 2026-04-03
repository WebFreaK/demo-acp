# Matério — ChatGPT Commerce MVP

Assistant conversationnel IA pour **Matério**, quincaillerie québécoise (6 succursales, Laurentides).

## Fonctionnalités

- **5 function calls** : `show_products`, `show_services`, `show_financing`, `show_estimation`, `show_checkout`
- Streaming SSE avec GPT-4o
- Scraper Magento 2 (REST API → GraphQL → HTML)
- Paiement Stripe Checkout (TPS + TVQ)
- Services intégrés : centre de coupe, livraison spécialisée, financement 0%, estimation

## Stack

Node.js · vanilla HTML/CSS/JS · OpenAI GPT-4o · Stripe · Vercel

## Setup

```bash
cp .env.example .env
# Ajouter OPENAI_API_KEY et STRIPE_SECRET_KEY dans .env

npm install
npm run dev        # http://localhost:3000
npm run scrape     # Scraper le catalogue materio.ca
```

## Déploiement Vercel

```bash
vercel --prod
```

Variables d'environnement requises : `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`
