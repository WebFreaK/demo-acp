# Guide de déploiement — Demos Agent Commerce sur Vercel

## Vue d'ensemble

Ce guide couvre le déploiement des deux démos MVP (Patrick Morin et Matério) sur Vercel. Les projets utilisent la même architecture :

- **Frontend** : HTML/CSS/JS statique (dossier `public/`)
- **Backend** : Fonctions serverless Node.js (`api/chat.js`, `api/checkout.js`)
- **APIs externes** : OpenAI GPT-4o (chat + function calling), Stripe (paiements)
- **Données** : Fichiers JSON statiques (catalogue produits, magasins)

---

## Prérequis

| Outil | Version | Installation |
|-------|---------|-------------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | Inclus avec Node.js |
| Vercel CLI | Dernière | `npm i -g vercel` |
| Git | Dernière | https://git-scm.com |
| Compte Vercel | — | https://vercel.com/signup |
| Compte Stripe | — | https://dashboard.stripe.com/register |
| Clé API OpenAI | — | https://platform.openai.com/api-keys |

---

## 1. Préparer les comptes externes

### Stripe

1. Créer un compte sur https://dashboard.stripe.com
2. Récupérer les clés **test** pour valider le déploiement :
   - `pk_test_...` (clé publique)
   - `sk_test_...` (clé secrète)
3. Pour la mise en production, activer le mode live et récupérer :
   - `pk_live_...` (clé publique)
   - `sk_live_...` (clé secrète)

### OpenAI

1. Créer un compte sur https://platform.openai.com
2. Générer une clé API : `sk-proj-...`
3. S'assurer que le modèle GPT-4o est accessible sur le compte

---

## 2. Déployer sur Vercel

### Option A — Via le CLI (recommandé)

```bash
# Installer le CLI
npm i -g vercel

# Se connecter
vercel login
```

#### Déployer Patrick Morin MVP

```bash
cd website/demo-patrick-morin-mvp
npm install
vercel
```

Suivre les prompts :
- **Set up and deploy?** → `Y`
- **Which scope?** → Sélectionner votre compte
- **Link to existing project?** → `N`
- **Project name?** → `demo-patrick-morin`
- **Directory?** → `./`

#### Déployer Matério MVP

```bash
cd website/demo-materio-mvp
npm install
vercel
```

Même procédure, nom de projet : `demo-materio`

### Option B — Via GitHub (CI/CD automatique)

1. Pousser le code vers un repo GitHub
2. Aller sur https://vercel.com/new
3. Importer le repo
4. Configurer le **Root Directory** :
   - Projet 1 : `website/demo-patrick-morin-mvp`
   - Projet 2 : `website/demo-materio-mvp`
5. Vercel détectera automatiquement le `vercel.json`

---

## 3. Configurer les variables d'environnement

### Via le CLI

```bash
# Pour chaque projet, ajouter les 3 variables :
vercel env add OPENAI_API_KEY        # Coller : sk-proj-...
vercel env add STRIPE_SECRET_KEY     # Coller : sk_test_... ou sk_live_...
vercel env add STRIPE_PUBLISHABLE_KEY # Coller : pk_test_... ou pk_live_...
```

Sélectionner les environnements : **Production**, **Preview**, **Development**.

### Via le dashboard

1. Aller sur https://vercel.com → Projet → Settings → Environment Variables
2. Ajouter chaque variable pour tous les environnements

| Variable | Valeur | Environnements |
|----------|--------|---------------|
| `OPENAI_API_KEY` | `sk-proj-...` | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` | Production, Preview, Development |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` / `pk_live_...` | Production, Preview, Development |

> **⚠️ Important** : Utiliser les clés **test** Stripe pour les environnements Preview/Development et les clés **live** uniquement pour Production.

---

## 4. Déployer en production

```bash
# Depuis le dossier du projet
vercel --prod
```

Vercel fournira une URL de production : `https://demo-patrick-morin.vercel.app`

---

## 5. Configurer un domaine personnalisé (optionnel)

```bash
# Ajouter un domaine
vercel domains add demo.votredomaine.com

# Ou via le dashboard : Settings → Domains → Add
```

Vercel configurera automatiquement :
- Le certificat SSL/TLS (Let's Encrypt)
- Les enregistrements DNS (si le domaine est géré par Vercel)

Si le domaine est chez un registraire externe, ajouter les enregistrements DNS :
- **CNAME** : `demo` → `cname.vercel-dns.com`
- Ou **A** : `76.76.21.21`

---

## 6. Optimiser la région de déploiement

Par défaut, les fonctions serverless s'exécutent à Washington DC (`iad1`). Pour réduire la latence vers le Québec :

1. Dashboard → Project → Settings → Functions
2. Changer la région par défaut vers **Montreal (`yul1`)** ou **Toronto (`yyz1`)**

Ou dans `vercel.json` :

```json
{
  "regions": ["yul1"],
  "functions": {
    "api/chat.js": { "runtime": "@vercel/node", "maxDuration": 60 },
    "api/checkout.js": { "runtime": "@vercel/node", "maxDuration": 15 }
  }
}
```

---

## 7. Mettre à jour les URLs Stripe (callbacks)

Après le déploiement, mettre à jour les URLs de callback Stripe dans `api/checkout.js` :

```javascript
success_url: 'https://VOTRE-DOMAINE.vercel.app/success.html',
cancel_url: 'https://VOTRE-DOMAINE.vercel.app/cancel.html',
```

Ajouter aussi le domaine dans les webhooks Stripe si utilisés :
- Dashboard Stripe → Developers → Webhooks → Add endpoint

---

## 8. Checklist pré-lancement

### Sécurité
- [ ] Clés Stripe en mode **live** pour la production
- [ ] Variables d'environnement configurées (pas de clés dans le code)
- [ ] HTTPS actif (automatique sur Vercel)
- [ ] Rate limiting activé sur `/api/chat` (Vercel WAF → 3 règles gratuites)

### Fonctionnel
- [ ] Tester le chat avec GPT-4o (streaming fonctionne)
- [ ] Tester un achat complet via Stripe Checkout
- [ ] Vérifier les pages `success.html` et `cancel.html`
- [ ] Vérifier le catalogue produits (données JSON valides)
- [ ] Tester sur mobile

### Performance
- [ ] Région Vercel optimisée (`yul1` pour le Québec)
- [ ] Taille du catalogue < 50 MB (limite Vercel pour les fichiers statiques)
- [ ] Temps de réponse chat < 5s (premier token)

### Legal / Conformité
- [ ] Politique de confidentialité accessible
- [ ] Conditions d'utilisation affichées
- [ ] Conformité Loi 25 (Québec) — consentement cookies si applicable

---

## 9. Commandes utiles post-déploiement

```bash
# Voir les logs en temps réel
vercel logs https://demo-patrick-morin.vercel.app --follow

# Lister les déploiements
vercel ls

# Rollback vers un déploiement précédent
vercel rollback

# Redéployer après modifications
vercel --prod

# Vérifier les variables d'environnement
vercel env ls
```

---

## 10. Coûts estimés

### Vercel — Plan Hobby (gratuit)

| Ressource | Inclus | Suffisant pour |
|-----------|--------|----------------|
| Fonctions serverless | 1M invocations/mois | ~33 000 conversations/jour |
| Bande passante | 100 GB/mois | ~100 000 visiteurs/mois |
| Durée CPU | 4h/mois | ~240 conversations streaming/jour |
| Builds | Illimités | Déploiements illimités |

### Coûts APIs externes (estimations)

| Service | Coût unitaire | ~100 conversations/jour |
|---------|--------------|------------------------|
| OpenAI GPT-4o | ~$0.01-0.03/conversation | $30-90/mois |
| Stripe | 2.9% + $0.30/transaction | Variable selon ventes |

### Quand passer au plan Pro ($20/mois)

- Plus de 4h de CPU serverless/mois (beaucoup de conversations longues)
- Besoin de collaboration en équipe
- Domaines personnalisés multiples avec protection avancée

---

## Architecture déployée

```
Utilisateur (Québec)
       │
       ▼
  Vercel CDN (Edge global)
       │
       ├── Fichiers statiques (/public)
       │   ├── index.html
       │   ├── css/style.css
       │   ├── js/app.js, products.js, animations.js
       │   ├── success.html
       │   └── cancel.html
       │
       └── Fonctions Serverless (yul1 — Montréal)
           ├── /api/chat    → OpenAI GPT-4o (streaming SSE, 60s max)
           └── /api/checkout → Stripe Checkout Session (15s max)
```

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| Chat ne répond pas | `OPENAI_API_KEY` manquante | Vérifier `vercel env ls` |
| Erreur 504 sur `/api/chat` | Timeout dépassé | Vérifier `maxDuration: 60` dans `vercel.json` |
| Checkout échoue | Clés Stripe invalides | Vérifier mode test vs live |
| Page blanche | `outputDirectory` incorrect | Doit être `public` dans `vercel.json` |
| CORS errors | Domaine non autorisé | Ajouter headers CORS dans les fonctions API |
| Catalogue vide | `data/catalog-acp.json` manquant | Lancer `npm run scrape` avant le déploiement |

---

*Dernière mise à jour : 2 avril 2026*
