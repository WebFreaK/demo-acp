# Guide d'évaluation de l'effort — Intégration ACP par client

**Usage :** Ce document sert à évaluer le temps, la complexité et le coût de livraison pour chaque nouveau client avant de rédiger une proposition.

---

## 1. Grille d'évaluation rapide

Remplir cette grille lors du premier appel découverte ou après l'audit gratuit. Chaque facteur est noté **Faible (F)**, **Moyen (M)** ou **Élevé (É)**, avec un nombre d'heures associé.

---

## 2. Facteur A — Taille et complexité du catalogue

C'est le facteur #1 qui détermine l'effort. Plus il y a de produits, plus il y a de données à structurer, valider et maintenir.

### A1. Nombre de produits (SKUs uniques)

| Tranche | Niveau | Heures estimées | Notes |
|---|---|---|---|
| 1 – 100 | Faible | 8 – 15h | Structuration manuelle possible |
| 101 – 500 | Moyen | 15 – 30h | Semi-automatisé, scripts de transformation |
| 501 – 2 000 | Élevé | 30 – 60h | Automatisation nécessaire, validation par échantillon |
| 2 001 – 10 000 | Très élevé | 60 – 120h | Pipeline de données, scripts de nettoyage, QA structuré |
| 10 000+ | Enterprise | 120 – 200h+ | Équipe dédiée, intégration directe avec PIM/ERP |

### A2. Variantes par produit

Les variantes (taille, couleur, matière, etc.) multiplient le volume réel.

| Situation | Multiplicateur d'effort | Exemple |
|---|---|---|
| Pas de variantes | ×1 | Thés, livres, forfaits spa |
| 2-3 variantes simples (S/M/L) | ×1.3 | T-shirts basiques |
| 5-10 variantes combinées (taille × couleur) | ×1.8 | Chaussures, vêtements mode |
| 10+ variantes avec prix/images différents | ×2.5 | Meubles configurables, électronique |

**Calcul :** Heures de base (A1) × Multiplicateur variantes (A2) = Heures catalogue ajustées

**Exemple :** 1 500 SKUs × multiplicateur 1.8 (mode avec taille/couleur) = ~54h → ~72h ajustées

### A3. Qualité des données existantes

| État des données | Impact sur l'effort | Heures additionnelles |
|---|---|---|
| **Excellent** — Titres propres, descriptions complètes, images HD, prix à jour, données structurées (JSON/CSV) | Aucun ajout | +0h |
| **Bon** — Données dans Shopify/WooCommerce, quelques champs manquants | Nettoyage léger | +5 – 15h |
| **Passable** — Données éparpillées (ERP + Excel + site web), descriptions incomplètes, images de qualité variable | Nettoyage moyen | +15 – 40h |
| **Mauvais** — Pas de catalogue structuré, descriptions absentes ou minimales, images manquantes, prix non centralisés | Refonte majeure | +40 – 80h |

**Questions à poser au client :**
- « Avez-vous un export CSV/JSON de votre catalogue avec titres, descriptions, prix et images ? »
- « Utilisez-vous un PIM (Product Information Manager) ? »
- « Vos descriptions produits sont-elles en français ET en anglais ? »
- « Vos images produit sont-elles hébergées sur des URLs publiques ? »

---

## 3. Facteur B — Méthode d'intégration

ACP offre deux méthodes. Le choix affecte directement l'effort technique.

### B1. File Upload (snapshot quotidien)

| Aspect | Détail |
|---|---|
| **Quand l'utiliser** | Catalogue stable (moins de 50 changements/jour), rafraîchi 1×/jour |
| **Effort initial** | Créer le script d'export au format ACP + validation des champs requis |
| **Effort récurrent** | Automatiser l'upload quotidien (cron job ou tâche planifiée) |
| **Heures estimées** | 10 – 25h (setup) + 2 – 5h/mois (maintenance) |
| **Idéal pour** | Boutiques mode, décor, articles spécialisés |

### B2. API (mises à jour temps réel)

| Aspect | Détail |
|---|---|
| **Quand l'utiliser** | Catalogue dynamique (prix qui changent, stock limité, promotions fréquentes) |
| **Effort initial** | Développer l'intégration API (upsert produits, gestion des promotions) |
| **Effort récurrent** | Monitoring des appels, gestion des erreurs, mises à jour de l'API |
| **Heures estimées** | 25 – 50h (setup) + 5 – 10h/mois (maintenance) |
| **Idéal pour** | Épicerie en ligne, voyage, abonnements, tout ce qui change en temps réel |

### B3. Hybride (recommandé pour la plupart)

| Aspect | Détail |
|---|---|
| **Quand l'utiliser** | La plupart des clients — snapshot quotidien complet + API pour les changements urgents |
| **Effort initial** | File upload + endpoints API pour prix/stock/promos |
| **Heures estimées** | 30 – 60h (setup) + 5 – 8h/mois (maintenance) |

**Questions à poser au client :**
- « À quelle fréquence changent vos prix ? » (quotidien = API nécessaire)
- « Avez-vous souvent des produits en rupture de stock ? » (oui = API pour retrait rapide)
- « Faites-vous des promotions flash ou saisonnières ? » (oui = API promotions)

---

## 4. Facteur C — Configuration du paiement (Stripe / ACP Checkout)

### C1. Situation Stripe actuelle du client

| Situation | Effort | Heures |
|---|---|---|
| **Déjà sur Stripe** | Configuration du Shared Payment Token seulement | 3 – 5h |
| **Sur Stripe mais ancien setup** | Migration vers Stripe API récente + token | 8 – 15h |
| **Pas sur Stripe (Moneris, Nuvei, etc.)** | Création compte Stripe + configuration comme canal secondaire + token | 15 – 25h |
| **Pas de paiement en ligne du tout** | Setup complet Stripe from scratch + formation | 25 – 40h |

### C2. Complexité du checkout

| Situation | Impact | Heures additionnelles |
|---|---|---|
| Prix fixe, pas de taxes complexes | Simple | +0h |
| Taxes multiples (TPS/TVQ + autres provinces) | Moyen | +3 – 5h |
| Frais de livraison variables (poids, zone) | Moyen | +5 – 10h |
| Abonnements / paiements récurrents | Élevé | +10 – 20h |
| Produits configurables (gravure, personnalisation) | Élevé | +10 – 15h |

**Questions à poser au client :**
- « Quel processeur de paiement utilisez-vous actuellement ? »
- « Avez-vous déjà un compte Stripe ? »
- « Vendez-vous par abonnement ? »
- « Vos frais de livraison dépendent-ils du poids, de la destination, ou sont-ils fixes ? »

---

## 5. Facteur D — Conformité et contenu

### D1. Vérification politique produits OpenAI

| Situation | Effort | Heures |
|---|---|---|
| Catalogue 100% conforme (mode, maison, tech, alimentation non-alcool) | Vérification rapide | 1 – 2h |
| Catalogue mixte (certains produits à valider — ex: couteaux de cuisine, suppléments) | Revue article par article pour catégories sensibles | 3 – 8h |
| Catalogue avec zones grises (produits proches des limites — ex: CBD, produits de santé) | Analyse approfondie + correspondance avec OpenAI si nécessaire | 8 – 15h |

### D2. Bilinguisme (français / anglais)

| Situation | Effort | Heures |
|---|---|---|
| Catalogue déjà bilingue FR/EN | Aucun ajout | +0h |
| Catalogue en français seulement | Traduction nécessaire pour maximiser la portée | +0.05h par produit |
| Catalogue en anglais seulement | Traduction en français pour conformité Loi 96 et marché QC | +0.05h par produit |

### D3. Qualité des descriptions pour l'IA

L'IA comprend mieux les descriptions factuelles et structurées. Si les descriptions sont vagues ou marketing-only, elles doivent être retravaillées.

| Qualité | Exemple | Effort |
|---|---|---|
| **Bonne** | « Bottes imperméables, cuir pleine fleur, semelle Vibram, doublure Thinsulate, hauteur 20cm, pointures 6-12 » | +0h |
| **Moyenne** | « Bottes d'hiver confortables pour femmes » | +0.02h par produit (enrichissement) |
| **Mauvaise** | « LA botte qui va vous faire ADORER l'hiver 🥾❄️ » | +0.05h par produit (réécriture factuelle) |

---

## 6. Facteur E — Infrastructure technique du client

### E1. Plateforme e-commerce

| Plateforme | Facilité d'export | Effort d'intégration |
|---|---|---|
| **Shopify / Shopify Plus** | Excellent — API et exports natifs | Faible (8 – 15h) |
| **WooCommerce** | Bon — plugins d'export disponibles | Faible-Moyen (10 – 20h) |
| **Magento / Adobe Commerce** | Moyen — puissant mais complexe | Moyen (20 – 35h) |
| **BigCommerce** | Bon — API solide | Faible-Moyen (10 – 20h) |
| **Lightspeed eCom** | Moyen — API disponible mais limitée | Moyen (15 – 30h) |
| **Sur mesure (custom)** | Variable — dépend entièrement de la stack | Moyen-Élevé (25 – 50h+) |
| **Pas de plateforme (catalogue physique seulement)** | Aucun — tout à construire | Très élevé (40 – 80h) |

### E2. Accès technique

| Situation | Impact |
|---|---|
| Client a une équipe dev interne qui collabore | Réduit l'effort de 20-30% |
| Client donne accès admin à la plateforme | Normal |
| Client a un prestataire externe qui doit être impliqué | Ajoute 10-20% (coordination) |
| Client ne sait pas qui gère son site | Ajoute 20-30% (découverte + accès) |

**Questions à poser au client :**
- « Quelle plateforme e-commerce utilisez-vous ? »
- « Avez-vous un développeur interne ou une agence web ? »
- « Pouvez-vous nous donner un accès API / admin au catalogue ? »

---

## 7. Facteur F — Demande d'accès partenaire OpenAI

| Situation | Effort | Heures |
|---|---|---|
| Client déjà approuvé par OpenAI | Aucun | 0h |
| Première demande — catalogue standard | Préparation + soumission via chatgpt.com/merchants | 2 – 4h |
| Première demande — catalogue edge case | Préparation détaillée + justification + suivi | 5 – 10h |
| Délai d'approbation imprévisible | **Risque :** l'intégration peut être prête mais l'accès non approuvé. Communiquer le risque au client. | Variable |

---

## 8. Fiche d'évaluation client (template)

Copier cette fiche pour chaque nouveau prospect.

```
═══════════════════════════════════════════════════════════
CLIENT : [Nom de l'entreprise]
DATE D'ÉVALUATION : [Date]
ÉVALUATEUR : [Votre nom]
═══════════════════════════════════════════════════════════

A. CATALOGUE
   A1. Nombre de SKUs :           ______ → Heures base : ______h
   A2. Variantes/produit :        ______ → Multiplicateur : ×______
   A3. Qualité des données :      [Excellent / Bon / Passable / Mauvais] → +______h
   
   SOUS-TOTAL CATALOGUE :         ______h

B. MÉTHODE D'INTÉGRATION
   B1. Méthode choisie :          [File Upload / API / Hybride]
   B2. Setup :                    ______h
   B3. Maintenance mensuelle :    ______h/mois
   
   SOUS-TOTAL INTÉGRATION :       ______h (setup)

C. PAIEMENT
   C1. Situation Stripe :         [Déjà Stripe / Migration / Nouveau]  → ______h
   C2. Complexité checkout :      [Simple / Moyen / Élevé]             → +______h
   
   SOUS-TOTAL PAIEMENT :          ______h

D. CONFORMITÉ & CONTENU
   D1. Politique produits :       [Conforme / Mixte / Zone grise]      → ______h
   D2. Bilinguisme :              [Déjà bilingue / Traduction requise] → +______h
   D3. Qualité descriptions :     [Bonne / Moyenne / Mauvaise]         → +______h
   
   SOUS-TOTAL CONFORMITÉ :        ______h

E. INFRASTRUCTURE
   E1. Plateforme :               [Shopify / Woo / Magento / Custom / Autre] → ______h
   E2. Accès technique :          [Équipe interne / Admin / Externe / Inconnu]
   E2. Ajustement %:              ×______
   
   SOUS-TOTAL INFRA :             ______h

F. ACCÈS PARTENAIRE
   F1. Statut :                   [Approuvé / À soumettre / Edge case] → ______h

═══════════════════════════════════════════════════════════

CALCUL TOTAL
─────────────────────────────────────────────────────────
Heures brutes (A+B+C+D+E+F) :                    ______h
Buffer imprévus (+15%) :                          +______h
TOTAL HEURES ESTIMÉES :                           ______h

Taux horaire interne :                            ______$/h
COÛT DE LIVRAISON :                               ______$
Marge ciblée (×1.5 – ×2.5) :                     ×______
PRIX CLIENT PROPOSÉ :                             ______$

Maintenance mensuelle estimée :                   ______h/mois
PRIX MAINTENANCE MENSUELLE :                      ______$/mois

FORFAIT RECOMMANDÉ :     [Starter / Pro / Enterprise]
DÉLAI DE LIVRAISON :     ______ semaines
═══════════════════════════════════════════════════════════
```

---

## 9. Exemples concrets d'évaluation

### Exemple 1 — Boutique mode québécoise (type Frank And Oak)

| Facteur | Valeur | Heures |
|---|---|---|
| A1. SKUs | 800 | 22h |
| A2. Variantes | Taille × couleur (×1.8) | → 40h |
| A3. Données | Bon (Shopify) | +8h |
| B. Intégration | Hybride | 35h |
| C. Paiement | Déjà Stripe | 4h |
| D. Conformité | 100% conforme, bilingue | 2h |
| E. Plateforme | Shopify Plus | 10h |
| F. Accès | À soumettre | 3h |
| **Heures brutes** | | **102h** |
| **+15% buffer** | | **+15h** |
| **TOTAL** | | **117h** |
| **Coût interne** (75$/h) | | **8 775 $** |
| **Prix client** (×2) | | **~17 500 $** |
| **Forfait** | Pro | |
| **Délai** | 3-4 semaines | |
| **Maintenance** | 6h/mois → 900$/mois | |

---

### Exemple 2 — Détaillant maison (type Simons — gros catalogue)

| Facteur | Valeur | Heures |
|---|---|---|
| A1. SKUs | 25 000 | 160h |
| A2. Variantes | Complexes (×2.5) | → 400h... plafonné à 200h avec automatisation |
| A3. Données | Excellent (PIM existant) | +0h |
| B. Intégration | Hybride + sharding fichiers | 50h |
| C. Paiement | Pas Stripe (Moneris) | 20h |
| D. Conformité | Conforme, bilingue | 3h |
| E. Plateforme | Custom (intégration ERP SAP) | 40h |
| F. Accès | À soumettre | 4h |
| **Heures brutes** | | **317h** |
| **+15% buffer** | | **+48h** |
| **TOTAL** | | **365h** |
| **Coût interne** (75$/h) | | **27 375 $** |
| **Prix client** (×1.5 pour Enterprise) | | **~41 000 $** |
| **Forfait** | Enterprise | |
| **Délai** | 6-8 semaines (2 personnes) | |
| **Maintenance** | 12h/mois → 1 800$/mois | |

---

### Exemple 3 — Spa / service (type Strom Spa)

| Facteur | Valeur | Heures |
|---|---|---|
| A1. SKUs | 30 (forfaits + boutique) | 10h |
| A2. Variantes | Aucune (×1) | → 10h |
| A3. Données | Passable (site web seulement) | +12h |
| B. Intégration | File Upload | 12h |
| C. Paiement | Pas Stripe | 18h |
| D. Conformité | Conforme | 1h |
| E. Plateforme | Site custom WordPress | 15h |
| F. Accès | À soumettre | 3h |
| **Heures brutes** | | **71h** |
| **+15% buffer** | | **+11h** |
| **TOTAL** | | **82h** |
| **Coût interne** (75$/h) | | **6 150 $** |
| **Prix client** (×1.3 pour Starter) | | **~8 000 $** |
| **Forfait** | Starter | |
| **Délai** | 2-3 semaines | |
| **Maintenance** | 3h/mois → 450$/mois | |

---

## 10. Red flags — Quand dire non ou reporter

| Signal | Risque | Recommandation |
|---|---|---|
| Client n'a **aucun catalogue numérique** | Effort de création de contenu dépasse l'intégration ACP | Référer à une agence de contenu d'abord, revenir après |
| Produits dans une **zone grise OpenAI** (CBD, suppléments, loteries) | Rejet possible par OpenAI | Valider avant de signer. Ne pas promettre l'approbation. |
| Client veut **intégrer en 1 semaine** avec 5 000+ SKUs | Impossible sans sacrifier la qualité | Proposer un lancement par phases (500 SKUs d'abord, reste en sprint 2) |
| Budget client **< 3 000 $** | Pas rentable | Proposer un service réduit (audit seulement) ou attendre qu'un outil self-serve existe |
| Client n'a **aucun trafic web** existant | ChatGPT ne compensera pas le manque total de présence | Suggérer de bâtir la présence en ligne d'abord |
| **Pas de Stripe ET refus total d'ajouter Stripe** | Bloqueur technique non contournable | Mettre en attente. Recontacter quand le PSP du client supporte ACP. |
| Client veut un **NDA de 20 pages** avant même de parler | Cycle de vente interminable, coût juridique | Évaluer si le contrat potentiel justifie l'effort. Enterprise seulement. |

---

## 11. Checklist pré-proposition

Avant d'envoyer une proposition formelle, valider :

- [ ] Catalogue : source de données identifiée et accessible
- [ ] Nombre de SKUs et variantes : chiffres confirmés par le client
- [ ] Plateforme e-commerce identifiée (Shopify, Woo, Magento, custom...)
- [ ] Situation Stripe : confirmée (existant ou prêt à ajouter)
- [ ] Produits : vérifiés conformes à la politique OpenAI
- [ ] Bilinguisme : état actuel des descriptions FR/EN évalué
- [ ] Budget client : discuté et dans la fourchette du forfait approprié
- [ ] Décideur identifié : la personne qui signe est dans la boucle
- [ ] Délai client : attentes de livraison alignées avec l'effort estimé
- [ ] Accès technique : plan clair pour obtenir les accès API/admin nécessaires
