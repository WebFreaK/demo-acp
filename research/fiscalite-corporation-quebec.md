# Guide — Fiscalité et impôts d'une corporation au Québec

**Date :** 2 avril 2026  
**Contexte :** Corporation offrant des services d'intégration ACP / OpenAI Commerce  
**Statut :** 🔍 Guide de référence — Consulter un comptable (CPA) avant de prendre des décisions fiscales

---

## Table des matières

1. [Taux d'imposition des sociétés](#1-taux-dimposition-des-sociétés)
2. [TPS/TVQ — Taxes de vente](#2-tpstvq--taxes-de-vente)
3. [Retenues à la source et cotisations employeur](#3-retenues-à-la-source-et-cotisations-employeur)
4. [Déclarations fiscales obligatoires](#4-déclarations-fiscales-obligatoires)
5. [Calendrier fiscal annuel](#5-calendrier-fiscal-annuel)
6. [Crédits d'impôt pertinents](#6-crédits-dimpôt-pertinents)
7. [Rémunération du dirigeant — Salaire vs dividendes](#7-rémunération-du-dirigeant--salaire-vs-dividendes)
8. [Acomptes provisionnels](#8-acomptes-provisionnels)
9. [Ressources](#9-ressources)

---

## 1. Taux d'imposition des sociétés

### Taux fédéraux (2026)

| Catégorie | Taux de base | Après abattement et réductions | Taux net |
|---|---|---|---|
| **Taux général** | 38% | Abattement fédéral de 10% + réduction générale de 13% | **15%** |
| **Petite entreprise (SPCC/DPE)** | 38% | Déduction pour petites entreprises | **9%** |

- La **déduction pour petites entreprises (DPE)** s'applique aux premières **500 000 $** de revenu imposable d'une société privée sous contrôle canadien (SPCC)
- Le plafond de 500 000 $ est réduit progressivement si le capital imposable dépasse 10 M$

### Taux provinciaux — Québec

| Catégorie | Taux QC |
|---|---|
| **Taux général** | **11.5%** |
| **Petite entreprise (DPE)** | **3.2%** |

- Le plafond des affaires au Québec est de **500 000 $** de revenu admissible
- Le Québec administre son propre impôt des sociétés (pas perçu par l'ARC)

### Taux combinés (Fédéral + Québec)

| Catégorie | Fédéral | Québec | **Total combiné** |
|---|---|---|---|
| **Petite entreprise (≤ 500K$)** | 9% | 3.2% | **12.2%** |
| **Taux général (> 500K$)** | 15% | 11.5% | **26.5%** |

**⭐ Avantage clé :** Les premiers 500 000 $ de profit d'une SPCC sont imposés à seulement **12.2%**, comparé au taux marginal personnel qui peut dépasser 50%.

### Conditions pour être une SPCC (Société privée sous contrôle canadien)

- Société privée constituée au Canada
- Non contrôlée par des non-résidents ou par des sociétés publiques
- Actions non cotées en bourse
- **Notre entreprise se qualifie probablement comme SPCC**

---

## 2. TPS/TVQ — Taxes de vente

### Inscription obligatoire

| Taxe | Taux | Organisme | Seuil d'inscription |
|---|---|---|---|
| **TPS** (fédérale) | 5% | Agence du revenu du Canada (ARC) | Revenus > 30 000 $ / 4 trimestres |
| **TVQ** (provinciale) | 9.975% | Revenu Québec | Revenus > 30 000 $ / 4 trimestres |
| **Total** | **14.975%** | | |

### Règles clés

- **Petit fournisseur :** Si revenus < 30 000 $/an, l'inscription est facultative (mais recommandée pour récupérer les CTI/RTI)
- **Services technologiques :** Nos services d'intégration ACP sont taxables (TPS + TVQ)
- **Clients hors Québec :** Règles spéciales pour fournitures interprovinciales et exportations
- **Fournitures détaxées :** Les exportations de services sont généralement à 0% (si le client est hors Canada)

### Crédits de taxe sur les intrants (CTI) et remboursements de taxe sur les intrants (RTI)

- On récupère la TPS/TVQ payée sur nos achats d'entreprise (ordinateurs, logiciels, loyer, etc.)
- Demandés dans les déclarations de TPS/TVQ
- **Conserver toutes les factures** — obligation de documentation

### Fréquence de déclaration

| Revenus annuels | Fréquence TPS | Fréquence TVQ |
|---|---|---|
| ≤ 1 500 000 $ | Annuelle | Annuelle |
| 1 500 001 $ – 6 000 000 $ | Trimestrielle | Trimestrielle |
| > 6 000 000 $ | Mensuelle | Mensuelle |

---

## 3. Retenues à la source et cotisations employeur

### Quand ça s'applique
Dès qu'on embauche des **employés** (pas des sous-traitants). Le dirigeant qui se verse un salaire est aussi un employé.

### Retenues sur le salaire de l'employé

| Retenue | Taux approximatif | Payé par |
|---|---|---|
| **Impôt fédéral** | Selon les tables (progressif) | Employé (retenu par employeur) |
| **Impôt du Québec** | Selon les tables (progressif) | Employé (retenu par employeur) |
| **RRQ/QPP** (Régime de rentes du Québec) | ~6.4% (part employé) | Employé |
| **AE** (Assurance-emploi) | ~1.33% (part employé) | Employé |
| **RQAP** (Régime québécois d'assurance parentale) | ~0.494% (part employé) | Employé |

### Cotisations de l'employeur (en plus du salaire)

| Cotisation | Taux approximatif | Détail |
|---|---|---|
| **RRQ/QPP** | ~6.4% | Part employeur (égale à la part employé) |
| **AE** | ~1.4 × cotisation employé | L'employeur paie 1.4 fois la cotisation de l'employé |
| **RQAP** | ~0.692% | Part employeur |
| **FSS** (Fonds des services de santé) | 1.65% – 4.26% | Selon masse salariale totale (PME : ~1.65%-2.7%) |
| **CNESST** | Variable (~0.5% – 3%+) | Selon le secteur d'activité (services tech = bas) |
| **CNT** (Normes du travail) | 0.07% | Sur tous les salaires |
| **1% formation** | 1% de masse salariale | Si masse salariale > 2 M$ (sinon exempt) |

### Fréquence de remise

| Masse salariale | Fréquence de remise |
|---|---|
| Nouvel employeur | Le 15 du mois suivant |
| Petite masse salariale | Trimestrielle |
| Moyenne | Mensuelle (le 15 du mois suivant) |
| Grande masse salariale | Deux fois par mois |

### Outils

- **WebRAS** (Revenu Québec) — Calcul en ligne des retenues et cotisations : https://www.revenuquebec.ca/en/online-services/tools/webras/
- **Trousse de l'employeur** — Guide annuel de Revenu Québec

---

## 4. Déclarations fiscales obligatoires

### Corporation — Déclarations de revenus

| Déclaration | Organisme | Formulaire | Échéance |
|---|---|---|---|
| **Impôt fédéral des sociétés** | ARC | T2 | 6 mois après la fin de l'exercice |
| **Impôt provincial des sociétés** | Revenu Québec | CO-17 | 6 mois après la fin de l'exercice |

### Taxes de vente

| Déclaration | Organisme | Fréquence |
|---|---|---|
| **TPS** | ARC | Annuelle, trimestrielle ou mensuelle |
| **TVQ** | Revenu Québec | Annuelle, trimestrielle ou mensuelle |

### Employeur

| Déclaration | Organisme | Échéance |
|---|---|---|
| **Feuillets T4** (revenus d'emploi) | ARC | 28-29 février |
| **Feuillets RL-1** (revenus d'emploi QC) | Revenu Québec | 28-29 février |
| **T4 Sommaire** | ARC | 28-29 février |
| **RL-1 Sommaire** | Revenu Québec | 28-29 février |
| **Cotisations CNESST** | CNESST | 15 mars |

### Registraire des entreprises

| Déclaration | Organisme | Échéance |
|---|---|---|
| **Déclaration de mise à jour annuelle** | REQ | Date anniversaire de l'immatriculation |

---

## 5. Calendrier fiscal annuel

Exemple basé sur un exercice se terminant le **31 décembre** :

| Mois | Obligations |
|---|---|
| **Janvier** | Préparer les relevés d'emploi (T4, RL-1). Acompte provisionnel si applicable |
| **Février** | Transmettre T4/RL-1 (28 fév). Payer le solde de CNESST |
| **Mars** | Acompte provisionnel (15 mars). Déclaration annuelle CNESST (15 mars) |
| **Avril** | Acompte provisionnel. Déclaration TPS/TVQ (si annuelle, 30 avril) |
| **Mai** | - |
| **Juin** | **Déclarations T2 et CO-17** (30 juin = 6 mois après fin d'exercice). Acompte provisionnel |
| **Juillet** | Paiement du solde d'impôt (3 mois après fin d'exercice = 31 mars pour paiement, mais 2 mois pour SPCC) |
| **Août** | - |
| **Septembre** | Acompte provisionnel |
| **Octobre** | - |
| **Novembre** | - |
| **Décembre** | Acompte provisionnel. Fin de l'exercice fiscal. Planification fiscale de fin d'année |

**⚠️ Paiement de l'impôt :** Le solde de l'impôt doit être payé dans les **2 mois** (SPCC) ou **3 mois** (autre) suivant la fin de l'exercice, même si la déclaration a 6 mois.

---

## 6. Crédits d'impôt pertinents

Voir le document détaillé dans `subventions-quebec-canada.md`. Résumé ci-dessous :

| Crédit | Niveau | Valeur estimée |
|---|---|---|
| **RS&DE** | Fédéral + QC | Jusqu'à 64% des dépenses R&D admissibles |
| **CDAE** (développement des affaires électroniques) | QC | 24% des salaires admissibles |
| **Commercialisation de PI** | QC | Congé d'impôt temporaire |
| **Crédit pour investissement TI** | QC | Variable |

---

## 7. Rémunération du dirigeant — Salaire vs dividendes

### Comparaison

| Facteur | Salaire | Dividendes |
|---|---|---|
| **Déductible pour la société** | Oui — réduit le revenu imposable | Non — payé après impôt corporatif |
| **Cotisations sociales** | Oui (RRQ, AE, RQAP, FSS, CNESST) | Non |
| **Accès aux programmes sociaux** | Oui (RRQ, AE, RQAP) | Non |
| **RS&DE** | Salaires admissibles | Non admissible |
| **CDAE** | Salaires admissibles | Non admissible |
| **REER** | Oui (crée des droits de cotisation) | Non |
| **Complexité** | Retenues à la source requises | Plus simple (pas de retenues) |
| **Coût total employeur** | Salaire + ~15% cotisations patronales | Montant du dividende |

### Recommandation pour notre situation

**Stratégie mixte recommandée :**

1. **Se verser un salaire suffisant** pour :
   - Maximiser les cotisations REER (~31 560 $ en 2026 = besoin d'un salaire ~175 000 $)
   - Cotiser au RRQ/QPP (pour la retraite)
   - Qualifier les dépenses de salaire pour le RS&DE et CDAE
   - Avoir accès au RQAP et à l'AE

2. **Verser des dividendes** sur le surplus pour :
   - Éviter les cotisations sociales additionnelles
   - Bénéficier du taux d'impôt réduit sur les dividendes au personnel

**⚠️ Faire calculer par un CPA :** L'optimisation dépend du revenu total, de la situation familiale, et des crédits d'impôt visés.

---

## 8. Acomptes provisionnels

### Quand les payer ?

| Impôt | Seuil | Fréquence |
|---|---|---|
| **Impôt fédéral** | Impôt net > 3 000 $ dans l'année courante ou précédente | Mensuel (dernier jour de chaque mois) |
| **Impôt Québec** | Impôt net > 3 000 $ | Mensuel |
| **TPS** | Si déclaration annuelle | Trimestriel |
| **TVQ** | Si déclaration annuelle | Trimestriel |

### Première année

- Généralement pas d'acomptes provisionnels la première année (pas d'historique)
- Le solde complet est dû à la fin de l'exercice

---

## 9. Ressources

| Ressource | Lien |
|---|---|
| **Revenu Québec — Entreprises** | https://www.revenuquebec.ca/en/businesses/ |
| **ARC — Impôt des sociétés** | https://www.canada.ca/en/services/taxes/income-tax/corporation-income-tax.html |
| **ARC — Taux d'impôt des sociétés** | https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html |
| **Revenu Québec — Retenues à la source** | https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/ |
| **WebRAS — Calcul retenues** | https://www.revenuquebec.ca/en/online-services/tools/webras/ |
| **ARC — Guide T2** | https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012.html |
| **Trouver un CPA** | https://cpaquebec.ca/ |

---

## Notes

- Le Québec est la **seule province** qui administre son propre impôt des sociétés séparément de l'ARC — double déclaration (T2 + CO-17)
- Les **intérêts de retard** sur les remises en retard sont élevés — toujours payer à temps
- Un bon **logiciel de comptabilité** (QuickBooks, Sage, Xero) simplifie énormément la gestion fiscale
- Garder les documents comptables et pièces justificatives pendant **6 ans** minimum
