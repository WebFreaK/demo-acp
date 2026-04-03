# Guide — Comptabilité et tenue de livres au Québec

**Date :** 2 avril 2026  
**Contexte :** Corporation tech au Québec — intégration ACP / OpenAI Commerce  
**Lois principales :** Loi de l'impôt sur le revenu, Loi sur les impôts (QC), Loi sur les sociétés par actions du Québec

---

## Table des matières

1. [Choix de la fin d'exercice financier](#1-fin-dexercice-financier)
2. [Plan comptable de base](#2-plan-comptable)
3. [Logiciels comptables](#3-logiciels-comptables)
4. [Tenue de livres au quotidien](#4-tenue-de-livres)
5. [Facturation](#5-facturation)
6. [TPS/TVQ — Gestion pratique](#6-tpstvq)
7. [Gestion des dépenses](#7-gestion-des-dépenses)
8. [États financiers](#8-états-financiers)
9. [Comptabilité de la paie](#9-comptabilité-de-la-paie)
10. [Conservation des documents](#10-conservation-des-documents)
11. [Audit et examen](#11-audit-et-examen)
12. [Relation avec le CPA](#12-relation-avec-le-cpa)
13. [Checklist comptable](#13-checklist-comptable)

---

## 1. Fin d'exercice financier

### Choix de la date

- La corporation peut choisir **n'importe quelle date** de fin d'exercice
- **Premier exercice** : ne peut pas dépasser 53 semaines après l'incorporation
- Le choix est permanent (modification possible mais complexe)

### Options courantes

| Fin d'exercice | Avantages | Inconvénients |
|---|---|---|
| **31 décembre** | Aligné avec l'année civile, simple | Saison occupée pour les CPA |
| **31 mars** | Aligné avec le fiscal fédéral | — |
| **30 juin** | CPA moins occupé, tarifs potentiellement meilleurs | — |
| **31 août** | Peu populaire, CPA disponible | — |

### Recommandation pour notre entreprise

**31 mars** ou **30 juin** → le CPA sera plus disponible et possiblement moins cher. Éviter le 31 décembre (haute saison comptable).

---

## 2. Plan comptable

### Structure de base pour une entreprise de services tech

#### Actifs (1000-1999)

| # | Compte |
|---|---|
| 1000 | Encaisse — Compte bancaire principal |
| 1010 | Encaisse — Compte épargne entreprise |
| 1050 | Stripe — Fonds en transit |
| 1100 | Comptes clients (à recevoir) |
| 1200 | TPS à recevoir (CTI) |
| 1210 | TVQ à recevoir (RTI) |
| 1300 | Charges payées d'avance |
| 1500 | Matériel informatique |
| 1510 | Amortissement cumulé — Matériel informatique |
| 1600 | Logiciels et licences |
| 1610 | Amortissement cumulé — Logiciels |

#### Passifs (2000-2999)

| # | Compte |
|---|---|
| 2000 | Comptes fournisseurs (à payer) |
| 2100 | TPS à payer |
| 2110 | TVQ à payer |
| 2200 | Retenues à la source à payer |
| 2210 | Cotisations employeur à payer |
| 2300 | Impôts sur le revenu à payer |
| 2400 | Salaires à payer |
| 2500 | Revenus reportés |
| 2800 | Dette à long terme |

#### Capitaux propres (3000-3999)

| # | Compte |
|---|---|
| 3000 | Capital-actions ordinaire |
| 3100 | Bénéfices non répartis |
| 3200 | Dividendes déclarés |

#### Revenus (4000-4999)

| # | Compte |
|---|---|
| 4000 | Revenus — Services d'intégration ACP |
| 4010 | Revenus — Forfait Démarrage |
| 4020 | Revenus — Forfait Croissance |
| 4030 | Revenus — Forfait Entreprise |
| 4100 | Revenus — Maintenance mensuelle |
| 4200 | Revenus — Consultation / heures supplémentaires |
| 4500 | Revenus d'intérêts |
| 4900 | Subventions gouvernementales |

#### Dépenses (5000-8999)

| # | Compte |
|---|---|
| 5000 | Salaires et avantages |
| 5010 | Cotisations sociales employeur |
| 5020 | CNESST |
| 5100 | Sous-traitants |
| 5200 | Services cloud (OpenAI API, AWS, Vercel) |
| 5210 | Logiciels et abonnements SaaS |
| 5220 | Domaines et hébergement |
| 5300 | Loyer bureau |
| 5310 | Bureau à domicile (portion déductible) |
| 5400 | Télécommunications (internet, téléphone) |
| 5500 | Assurances (E&O, responsabilité) |
| 5600 | Honoraires professionnels (CPA, avocat) |
| 5700 | Marketing et publicité |
| 5710 | Frais de représentation (50%) |
| 5720 | Conférences et événements |
| 5800 | Déplacements |
| 5810 | Frais automobiles |
| 5900 | Formation et développement professionnel |
| 6000 | Frais bancaires et Stripe |
| 6100 | Fournitures de bureau |
| 6200 | Amortissement |
| 6300 | Mauvaises créances |
| 7000 | Frais d'incorporation |
| 8000 | Impôts sur le revenu — fédéral |
| 8010 | Impôts sur le revenu — Québec |

---

## 3. Logiciels comptables

### Comparatif

| Logiciel | Prix/mois | Paie intégrée | TPS/TVQ QC | Multi-devise | Idéal pour |
|---|---|---|---|---|---|
| **QuickBooks Online** | ~35-100 $ | Oui (+) | Oui | Oui | PME, standard de l'industrie |
| **Xero** | ~17-68 $ | Via partenaire | Oui | Oui | Tech-friendly, API |
| **FreshBooks** | ~22-66 $ | Non | Oui | Limité | Freelancers, petites équipes |
| **Sage 50** | ~45-85 $ | Oui | Oui | Limité | Comptabilité traditionnelle |
| **Wave** | Gratuit | Non | Oui | Non | Très petit budget |

### Recommandation

**QuickBooks Online** — Plus simple à vie :
- Standard au Canada, tous les CPAs le connaissent
- Intégration Stripe native
- Gestion TPS/TVQ automatique
- Paie intégrée (add-on ~22 $/mois)
- Rapports fiscaux T2/CO-17 compatibles

### Connexions recommandées

| Service | Intégration |
|---|---|
| **Stripe** | Sync automatique des paiements reçus |
| **Compte bancaire** | Flux bancaire automatique |
| **Dext (anciennement Receipt Bank)** | Numérisation automatique des reçus |
| **Wagepoint** | Sync paie (si paie externe) |

---

## 4. Tenue de livres au quotidien

### Flux de travail quotidien/hebdomadaire

```
Revenus reçus (Stripe, virement)
    ↓
Enregistrer dans le logiciel comptable
    ↓
Catégoriser par type de revenu (forfait, maintenance, consultation)
    ↓
Rapprocher avec le compte bancaire

Dépenses payées (carte de crédit, virement)
    ↓
Numériser le reçu (Dext / photo)
    ↓
Catégoriser la dépense
    ↓
Rapprocher avec le compte bancaire/carte
```

### Fréquence recommandée

| Tâche | Fréquence |
|---|---|
| Enregistrer les revenus | À chaque réception |
| Enregistrer les dépenses | Hebdomadaire |
| Rapprochement bancaire | Mensuel (au minimum) |
| Revue des comptes clients | Bi-mensuel |
| Déclaration TPS/TVQ | Trimestrielle ou annuelle |
| Rapprochement complet | Mensuel |

### Règle d'or

**Ne jamais mélanger les finances personnelles et corporatives.** Tout passe par le compte bancaire de la corporation.

---

## 5. Facturation

### Contenu obligatoire d'une facture

| Élément | Requis |
|---|---|
| Nom légal de la corporation | Oui |
| Numéro NEQ | Recommandé |
| Adresse de l'entreprise | Oui |
| Numéro TPS (si inscrit) | Oui |
| Numéro TVQ (si inscrit) | Oui |
| Date de la facture | Oui |
| Numéro de facture (séquentiel) | Oui |
| Nom et adresse du client | Oui |
| Description des services | Oui |
| Montant avant taxes | Oui |
| TPS (5%) | Oui (si inscrit) |
| TVQ (9.975%) | Oui (si inscrit) |
| Total | Oui |
| Conditions de paiement | Recommandé |

### Numérotation recommandée

Format : `ACP-2026-001`, `ACP-2026-002`, etc.

### Conditions de paiement typiques (B2B tech)

| Condition | Usage |
|---|---|
| **Net 15** | Petits projets, maintenance |
| **Net 30** | Standard B2B |
| **50% à la commande, 50% à la livraison** | Projets d'intégration |
| **Acompte 30%, milestones, solde final** | Gros projets entreprise |

### Gestion des retards de paiement

- Relance courtoise à J+7 après l'échéance
- Relance ferme à J+15
- Intérêts de retard : max 2%/mois (ou tel que stipulé au contrat)
- Mise en demeure à J+30 (lettre recommandée)
- En dernier recours : Cour des petites créances (< 15 000 $) ou avocat

---

## 6. TPS/TVQ — Gestion pratique

### Inscription

- **Obligatoire** si revenus > 30 000 $ sur 4 trimestres consécutifs
- **Recommandé** de s'inscrire dès le départ : permet de récupérer la TPS/TVQ sur les dépenses

### Périodes de déclaration

| Revenus annuels | Période de déclaration |
|---|---|
| < 1 500 000 $ | Annuelle (option trimestrielle) |
| 1 500 000 $ – 6 000 000 $ | Trimestrielle |
| > 6 000 000 $ | Mensuelle |

### Calcul simplifié

```
TPS/TVQ collectée sur les ventes
  MOINS
TPS/TVQ payée sur les dépenses (CTI/RTI)
  =
Montant à remettre (ou à recevoir si en démarrage)
```

### CTI et RTI — Ce qui est récupérable

| Dépense | TPS récupérable | TVQ récupérable |
|---|---|---|
| Services cloud (OpenAI, AWS) | Oui si facturé avec TPS | Oui si facturé avec TVQ |
| Équipement informatique | Oui | Oui |
| Fournitures de bureau | Oui | Oui |
| Loyer commercial | Oui | Oui |
| Honoraires professionels | Oui | Oui |
| Repas d'affaires | 50% | 50% |
| Essence (auto affaires) | Proportion affaires | Proportion affaires |
| Services importés (pas de TPS facturée) | Non | Autocotisation TVQ requise |

### ⚠️ Autocotisation TVQ sur services importés

Pour les services achetés hors Québec/Canada **sans TVQ facturée** (ex : OpenAI API, AWS si facturé des USA) :
- On doit **autocotiser** la TVQ (9.975%) et la déclarer
- On peut ensuite la récupérer comme RTI (effet neutre)
- **Ne pas oublier** : l'omission est une infraction

---

## 7. Gestion des dépenses

### Dépenses déductibles courantes (entreprise tech)

| Catégorie | Exemples | Déductibilité |
|---|---|---|
| **Cloud et API** | OpenAI API, AWS, Azure, Vercel, Stripe fees | 100% |
| **Logiciels** | GitHub, Slack, Notion, Figma | 100% |
| **Équipement** | Ordinateur, écrans, clavier | DPA catégorie 50 (55%) |
| **Télécommunications** | Internet, téléphone cellulaire | Portion affaires |
| **Bureau à domicile** | Loyer, électricité, internet, assurance | Proportion au pro-rata de la superficie |
| **Assurance** | E&O, responsabilité civile | 100% |
| **Honoraires pro.** | CPA, avocat | 100% |
| **Marketing** | Site web, publicité en ligne | 100% |
| **Repas et divertissement** | Repas d'affaires avec clients | 50% |
| **Déplacements** | Transport pour rencontres clients | 100% |
| **Auto** | Essence, assurance, entretien | Proportion km affaires |
| **Formation** | Cours, conférences, certifications | 100% |
| **Frais bancaires** | Frais de compte, frais Stripe | 100% |

### Déduction pour amortissement (DPA)

| Catégorie | Taux | Biens |
|---|---|---|
| **Catégorie 10** | 30% | Véhicule automobile |
| **Catégorie 10.1** | 30% | Véhicule de luxe (plafonné) |
| **Catégorie 12** | 100% | Logiciels (< 500 $) |
| **Catégorie 46** | 30% | Équipement d'infrastructure réseau |
| **Catégorie 50** | 55% | Matériel informatique (ordinateur, serveur) |
| **IIAA** | Passation en charges immédiate | Biens admissibles acquis après 2022 (pour SPCC) |

### Passation en charges immédiate (IIAA)

Les **SPCC** peuvent déduire immédiatement le coût total de certains biens amortissables (max 1.5M$ par année). Très avantageux pour :
- Ordinateurs, moniteurs, équipement tech
- Mobilier de bureau
- Véhicules

---

## 8. États financiers

### Les 3 états financiers de base

#### 1. Bilan (État de la situation financière)

```
ACTIFS
  Actifs à court terme
    Encaisse                    XX $
    Comptes clients             XX $
    TPS/TVQ à recevoir          XX $
    Charges payées d'avance     XX $
  Actifs à long terme
    Matériel informatique       XX $
    Amort. cumulé              (XX $)
  ─────────────────────────────────
  Total des actifs              XX $

PASSIFS
  Passifs à court terme
    Comptes fournisseurs        XX $
    TPS/TVQ à payer             XX $
    Retenues source à payer     XX $
    Impôts à payer              XX $
  Passifs à long terme
    Emprunts                    XX $
  ─────────────────────────────────
  Total des passifs             XX $

CAPITAUX PROPRES
  Capital-actions               XX $
  Bénéfices non répartis        XX $
  ─────────────────────────────────
  Total capitaux propres        XX $

TOTAL PASSIFS + CAPITAUX        XX $
```

#### 2. État des résultats (Revenus et dépenses)

```
REVENUS
  Services d'intégration ACP    XX $
  Maintenance mensuelle         XX $
  Consultation                  XX $
  ─────────────────────────────────
  Total des revenus             XX $

DÉPENSES
  Salaires et cotisations       XX $
  Services cloud et API         XX $
  Logiciels et abonnements      XX $
  Honoraires professionnels     XX $
  Marketing                     XX $
  Assurances                    XX $
  Amortissement                 XX $
  Autres dépenses               XX $
  ─────────────────────────────────
  Total des dépenses            XX $

BÉNÉFICE AVANT IMPÔTS          XX $
  Impôts sur le revenu          XX $
BÉNÉFICE NET                    XX $
```

#### 3. État des flux de trésorerie

```
ACTIVITÉS D'EXPLOITATION
  Bénéfice net                  XX $
  + Amortissement               XX $
  +/- Variation fonds roulement XX $
  ─────────────────────────────────
  Flux d'exploitation           XX $

ACTIVITÉS D'INVESTISSEMENT
  Achat d'équipement           (XX $)
  ─────────────────────────────────
  Flux d'investissement        (XX $)

ACTIVITÉS DE FINANCEMENT
  Émission d'actions            XX $
  Dividendes versés            (XX $)
  ─────────────────────────────────
  Flux de financement           XX $

VARIATION NETTE DE L'ENCAISSE   XX $
```

---

## 9. Comptabilité de la paie

### Processus à chaque paie

1. **Calculer le salaire brut** (heures × taux ou salaire fixe)
2. **Calculer les retenues de l'employé** :
   - Impôt fédéral (tables)
   - Impôt QC (tables)
   - RRQ (~6.4%)
   - AE (~1.33%)
   - RQAP (~0.494%)
3. **Calculer les cotisations de l'employeur** :
   - RRQ (~6.4%)
   - AE (~1.86%)
   - RQAP (~0.692%)
   - FSS (1.65-4.26%)
   - CNESST (variable)
   - CNT (0.07%)
4. **Payer le salaire net** à l'employé
5. **Remettre les retenues** au gouvernement (selon la fréquence)
6. **Enregistrer** les écritures comptables

### Écritures comptables de la paie

```
Débit : Salaires (5000)               5 000 $
Débit : Cotisations employeur (5010)     750 $
  Crédit : Banque (1000)              3 800 $
  Crédit : Retenues à payer (2200)    1 200 $
  Crédit : Cotisations à payer (2210)   750 $
```

### Fréquence de remise des retenues

| Catégorie | Seuil (retenues mensuelles) | Fréquence |
|---|---|---|
| **Petit remetteur** | < 3 000 $/mois | Trimestrielle |
| **Remetteur régulier** | 3 000 – 25 000 $ | Mensuelle (15 du mois suivant) |
| **Remetteur accéléré** | > 25 000 $ | Semi-mensuelle ou mensuelle |

---

## 10. Conservation des documents

### Durée obligatoire de conservation

| Document | Durée | Source |
|---|---|---|
| **Registres comptables** | 6 ans après la dernière année fiscale | ARC + RQ |
| **Factures (émises et reçues)** | 6 ans | ARC + RQ |
| **Relevés bancaires** | 6 ans | ARC + RQ |
| **Déclarations de revenus** | 6 ans | ARC + RQ |
| **Contrats** | 6 ans après l'expiration | Code civil |
| **Registres de paie** | 6 ans | ARC + RQ |
| **T4 / RL-1** | 6 ans | ARC + RQ |
| **Livre de minutes** | Durée de vie de la corporation | LSAQ |
| **Registre des actionnaires** | Durée de vie de la corporation | LSAQ |
| **Registre des administrateurs** | Durée de vie de la corporation | LSAQ |

### Format de conservation

- **Format électronique accepté** par l'ARC et Revenu Québec
- Les documents numérisés sont valides si le processus est fiable
- **Recommandation :** Cloud sécurisé (Google Drive, OneDrive) avec backup

### Organisation recommandée

```
Comptabilite/
├── 2026/
│   ├── Factures-emises/
│   ├── Factures-recues/
│   ├── Releves-bancaires/
│   ├── Paie/
│   ├── TPS-TVQ/
│   ├── Declarations-revenus/
│   └── Contrats/
├── 2027/
│   └── ...
├── Livre-minutes/
├── Registres-corporatifs/
└── Assurances/
```

---

## 11. Audit et examen

### Exigences selon la taille

| Taille / Situation | Obligation |
|---|---|
| **SPCC — actionnaire unique** | Aucun audit requis (résolution de renonciation) |
| **SPCC — tous actionnaires consentent** | Mission de compilation suffit (pas d'audit) |
| **Au moins un actionnaire ne consent pas** | Mission d'examen ou audit |
| **Revenus > 10M$ ou actifs > 5M$** | Audit recommandé |
| **Financement bancaire** | La banque peut exiger un examen ou audit |
| **Subvention gouvernementale** | Le programme peut exiger des états financiers vérifiés |

### Types de missions CPA

| Mission | Coût approx. | Niveau d'assurance | Quand |
|---|---|---|---|
| **Compilation** | 1 000-3 000 $ | Aucune | Startup, petit budget |
| **Mission d'examen** | 3 000-8 000 $ | Limitée | PME, demandes des tiers |
| **Audit** | 8 000-25 000 $+ | Raisonnable | Grande entreprise, exigences réglementaires |

### Pour notre entreprise (démarrage)

- **Année 1 :** Mission de compilation (1-3K $) — résolution de renonciation à l'audit
- **When raising money :** Mission d'examen ou audit sera probablement requis par les investisseurs

---

## 12. Relation avec le CPA

### Quand engager un CPA

| Service | Quand | Fréquence |
|---|---|---|
| **Configuration initiale** | À l'incorporation | Une fois |
| **Tenue de livres** | Dès les premières transactions | Mensuel ou auto-géré |
| **Déclarations de revenus T2/CO-17** | Annuel | 1×/an |
| **Déclarations TPS/TVQ** | Trimestriel/annuel | 1-4×/an |
| **T4/RL-1** | Annuel | 1×/an |
| **Conseil fiscal** | Au besoin (planification salaire/dividendes) | Au besoin |
| **États financiers** | Annuel | 1×/an |

### Coûts typiques pour une micro-entreprise tech

| Service | Coût annuel approx. |
|---|---|
| Tenue de livres (externe) | 3 000-8 000 $/an |
| Déclarations T2 + CO-17 | 1 500-4 000 $/an |
| TPS/TVQ | 500-1 500 $/an |
| T4/RL-1 | 250-500 $/an |
| Conseil fiscal ponctuel | 200-400 $/heure |
| **Total estimé** | **5 000-12 000 $/an** |

### Comment économiser

1. **Faire sa propre tenue de livres** avec QuickBooks → économise 3-8K $/an
2. **Numériser les reçus** avec Dext → réduit le temps du CPA
3. **Rapprochement bancaire mensuel** → moins de travail pour le CPA en fin d'année
4. **Préparer le dossier de fin d'année** → réduit les heures CPA

---

## 13. Checklist comptable

### Au démarrage

- [ ] Choisir la date de fin d'exercice
- [ ] Ouvrir un compte bancaire corporatif
- [ ] Obtenir une carte de crédit corporative
- [ ] Configurer QuickBooks Online (ou autre logiciel)
- [ ] S'inscrire aux TPS/TVQ
- [ ] Créer le plan comptable
- [ ] Trouver un CPA
- [ ] Configurer un système de numérisation des reçus

### Hebdomadaire

- [ ] Catégoriser les transactions bancaires
- [ ] Numériser les reçus de dépenses

### Mensuel

- [ ] Rapprochement bancaire
- [ ] Rapprochement carte de crédit
- [ ] Enregistrer les revenus récurrents
- [ ] Vérifier les comptes clients (relances)
- [ ] Remettre les retenues à la source (si requis)

### Trimestriel

- [ ] Produire la déclaration TPS/TVQ (si applicable)
- [ ] Verser les acomptes provisionnels d'impôts (si requis)
- [ ] Réviser les états financiers intérimaires

### Annuel

- [ ] Fermer les livres de l'exercice
- [ ] Fournir le dossier au CPA
- [ ] Produire les T4 et RL-1 (28 février)
- [ ] Produire la déclaration CNESST (15 mars)
- [ ] Produire le T2 et CO-17 (6 mois après fin d'exercice)
- [ ] Payer le solde d'impôts
- [ ] Déclaration annuelle REQ
- [ ] Archiver les documents de l'année

---

## Ressources et outils

| Ressource | Lien |
|---|---|
| **QuickBooks Online Canada** | https://quickbooks.intuit.com/ca/fr/ |
| **Dext (reçus)** | https://dext.com/ca/fr |
| **Revenu Québec — Entreprises** | https://www.revenuquebec.ca/fr/entreprises/ |
| **ARC — Entreprises** | https://www.canada.ca/fr/agence-revenu/services/impot/entreprises.html |
| **WebRAS — Calcul retenues QC** | https://www.revenuquebec.ca/fr/services-en-ligne/outils/webras/ |
| **Calculateur DPA** | Intégré dans QuickBooks/logiciel comptable |
| **Ordre des CPA du Québec** | https://cpaquebec.ca |
