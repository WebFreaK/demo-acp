# Guide — Conformité et réglementations au Québec

**Date :** 2 avril 2026  
**Contexte :** Corporation tech au Québec — intégration ACP / OpenAI Commerce  
**Lois principales :** Loi 25 (vie privée), Loi 96 (langue française), LPC, Code civil du Québec

---

## Table des matières

1. [Loi 25 — Protection des renseignements personnels](#1-loi-25)
2. [Loi 96 — Charte de la langue française](#2-loi-96)
3. [Loi sur la protection du consommateur (LPC)](#3-loi-sur-la-protection-du-consommateur)
4. [Commerce en ligne — Cadre spécifique](#4-commerce-en-ligne)
5. [Propriété intellectuelle](#5-propriété-intellectuelle)
6. [Contrats commerciaux](#6-contrats-commerciaux)
7. [Intelligence artificielle — Cadre réglementaire](#7-intelligence-artificielle)
8. [Anti-pourriel (LCAP)](#8-loi-anti-pourriel)
9. [Accessibilité numérique](#9-accessibilité-numérique)
10. [Déclarations et renouvellements annuels](#10-déclarations-annuelles)
11. [Checklist conformité](#11-checklist-conformité)

---

## 1. Loi 25 — Protection des renseignements personnels

### Contexte

La **Loi 25** (anciennement Projet de loi 64) modernise la protection de la vie privée au Québec. Entrée en vigueur en 3 phases : sept. 2022, sept. 2023, sept. 2024. **Toutes les obligations sont maintenant en vigueur.**

### Obligations pour notre entreprise

#### A. Responsable de la protection des renseignements personnels

- **Désigner un responsable** de la protection des renseignements personnels
- Par défaut, c'est la personne ayant la plus haute autorité (PDG)
- Peut être délégué par écrit
- Titre et coordonnées publiés sur le site web

#### B. Politique de confidentialité

Doit être **publiée sur le site web** et contenir :

| Élément | Détail |
|---|---|
| Types de renseignements collectés | Nom, courriel, adresse, données de paiement, etc. |
| Fins de la collecte | Transaction, marketing, service client, analytics |
| Moyens de collecte | Formulaire, cookies, API, achat via agent AI |
| Droits des personnes | Accès, rectification, suppression |
| Durée de conservation | Combien de temps on conserve chaque type |
| Transferts hors Québec | Si les données transitent hors de la province |
| Coordonnées du responsable | Pour recevoir les plaintes et demandes |

#### C. Consentement

- **Consentement explicite** requis avant la collecte
- Doit être **libre, éclairé, spécifique** et **temporellement limité**
- **Consentement séparé** pour chaque finalité (ex : marketing ≠ service)
- Pour les **mineurs de moins de 14 ans** : consentement du titulaire de l'autorité parentale
- **Pas de case pré-cochée** — le consentement doit être actif

#### D. Évaluation des facteurs relatifs à la vie privée (EFVP)

- **Obligatoire** avant tout projet impliquant des renseignements personnels
- Inclut : acquisition de système, transfert hors Québec, sous-traitance
- Pour notre entreprise : **EFVP requis** lors de l'intégration de systèmes AI/OpenAI avec les données clients

#### E. Incidents de confidentialité

En cas de violation de données :

1. **Évaluer** le risque de préjudice sérieux
2. **Aviser la CAI** (Commission d'accès à l'information) si risque sérieux
3. **Aviser les personnes touchées** si risque sérieux
4. **Tenir un registre** de tous les incidents (même mineurs)

**Sanctions :**
- Personne physique : jusqu'à 100 000 $
- Entreprise : jusqu'à 25 000 000 $ ou **4% du chiffre d'affaires mondial**

#### F. Droit à la portabilité

- Les clients ont le droit de demander leurs données dans un format structuré
- Délai de réponse : 30 jours

#### G. Profilage et décisions automatisées

- Si on utilise l'IA pour prendre des décisions automatisées → obligation d'informer
- La personne a le droit de connaître les renseignements utilisés et les facteurs de la décision
- Très pertinent pour les agents AI / recommandations ACP

---

## 2. Loi 96 — Charte de la langue française

### Obligations linguistiques

| Aspect | Obligation |
|---|---|
| **Langue de travail** | Le français est la langue normale du travail au Québec |
| **Communications** | Toute communication avec les employés doit être disponible en français |
| **Contrats** | Les contrats d'adhésion et de consommation doivent être en français |
| **Site web** | Le site web doit être disponible en français (peut être bilingue, mais la version française doit être au moins aussi accessible) |
| **Logiciels de travail** | La version française des logiciels doit être disponible si elle existe |
| **Affichage** | Signalisation et affichage : français prédominant |
| **Service à la clientèle** | Droit d'être servi en français |

### Seuils

| Nombre d'employés | Obligations |
|---|---|
| **1–24 employés** | Obligations de base en français (depuis juin 2025) |
| **25–49 employés** | Obligations de francisation accrues, comité de francisation possible |
| **50–99 employés** | Programme de francisation obligatoire |
| **100+ employés** | Comité de francisation et programme complet |

### Pour notre entreprise tech

- Site web : version française obligatoire (peut aussi avoir l'anglais)
- Interface agent ACP : doit supporter le français
- Contrats clients QC : en français
- Documentation technique interne : recommandé en français
- **Exception :** Les contrats B2B hors Québec peuvent être en anglais

---

## 3. Loi sur la protection du consommateur (LPC)

### Pertinence pour ACP

Nos clients vendent aux consommateurs via l'agent AI. La LPC s'applique à ces transactions.

### Obligations principales

| Obligation | Détail |
|---|---|
| **Prix** | Doit être clairement affiché, incluant tous les frais |
| **Description** | Description exacte et non trompeuse du produit |
| **Garantie légale** | Tout bien doit servir à un usage normal pendant une durée raisonnable |
| **Droit d'annulation** | 10 jours pour contrats à distance si conditions non respectées |
| **Politique de retour** | Doit être clairement communiquée |
| **Représentations commerciales** | Interdiction de pratiques commerciales trompeuses |

### Commerce en ligne — Article 54.4 et suivants

Pour la vente à distance (applicable à l'agent ACP) :

Le **commerçant** doit fournir **AVANT** la transaction :
1. Nom et coordonnées du commerçant
2. Description détaillée du bien
3. Prix détaillé incluant tous les frais (taxes, livraison)
4. Conditions de livraison (délai, mode)
5. Politique d'annulation, d'échange, de remboursement
6. Devise utilisée
7. Toute restriction ou condition applicable

→ L'agent AI/ACP doit présenter **toutes** ces informations avant de confirmer la commande.

---

## 4. Commerce en ligne — Cadre spécifique

### Contrats à distance (LPCQ arts. 54.1-54.16)

| Règle | Détail |
|---|---|
| **État du compte** | Le consommateur doit pouvoir vérifier le contenu de sa commande avant de payer |
| **Confirmation écrite** | Contrat envoyé par écrit dans les 15 jours de la commande |
| **Annulation** | 7 jours après réception du contrat écrit si non reçu dans les 15 jours |
| **Non-livraison** | Si non livré dans les 30 jours (ou date convenue) → droit d'annulation |
| **Remboursement** | Dans les 15 jours suivant l'annulation |

### Implications pour l'agent ACP

1. L'agent doit afficher le résumé complet de la commande avant confirmation
2. La confirmation écrite (par courriel) doit être envoyée automatiquement
3. Les politiques de retour du commerçant doivent être accessibles via l'agent
4. L'agent ne doit PAS induire en erreur (pas de fausses urgences, faux stocks limités)

---

## 5. Propriété intellectuelle

### Protection du code et de la PI

| Type | Protection | Démarche |
|---|---|---|
| **Droit d'auteur** | Automatique à la création | Aucun enregistrement requis (mais recommandé) |
| **Marque de commerce** | Enregistrement | OPIC — demande en ligne (~330 $+) |
| **Brevet** | Enregistrement | OPIC — très coûteux (~5-15K $), protège l'invention |
| **Secret commercial** | Contrats de confidentialité | NDA, clauses dans les contrats d'emploi |

### Pour notre entreprise

| Actif PI | Protection recommandée |
|---|---|
| **Code source ACP** | Droit d'auteur (automatique) + clauses employés |
| **Nom de la marque** | Enregistrement de marque de commerce à l'OPIC |
| **Processus/méthodes** | Secret commercial (NDA) — les méthodes sont difficiles à breveter au Canada |
| **Documentation technique** | Droit d'auteur |
| **Logo** | Droit d'auteur + marque de commerce |

### Clauses PI dans les contrats d'emploi

Tout contrat d'employé ou de sous-traitant doit inclure :
- **Cession de PI** : tout le travail produit appartient à la société
- **Confidentialité** : protection des secrets commerciaux
- **Non-sollicitation** : protection de la base de clients
- **Inventions antérieures** : liste des créations préexistantes de l'employé

---

## 6. Contrats commerciaux

### Contrats avec les clients (B2B)

| Clause essentielle | Détail |
|---|---|
| **Portée des services** | Description détaillée de ce qui est livré |
| **Livrables** | Liste précise avec critères d'acceptation |
| **Prix et paiement** | Montant, échéancier, pénalités de retard |
| **Durée** | Début, fin, renouvellement |
| **Résiliation** | Conditions de résiliation anticipée, préavis |
| **Responsabilité** | Limitation de responsabilité (cap au montant du contrat) |
| **Garantie** | SLA, temps de réponse, disponibilité |
| **Confidentialité** | Obligations mutuelles |
| **PI** | À qui appartient le code personnalisé |
| **Données personnelles** | Responsabilités respectives (Loi 25) |
| **Loi applicable** | Lois du Québec, tribunaux du Québec |
| **Force majeure** | Événements hors contrôle |

### Contrat de sous-traitance (traitement des données)

Si on traite les données personnelles des clients de nos clients :
- **Entente de traitement des données** obligatoire (Loi 25)
- Préciser : finalités, types de données, mesures de sécurité
- Interdire la sous-traitance sans consentement écrit
- Prévoir le retour/destruction des données à la fin du contrat

---

## 7. Intelligence artificielle — Cadre réglementaire

### Cadre actuel au Canada (2026)

| Aspect | Statut |
|---|---|
| **Loi sur l'IA et les données (AIDA)** | Partie du projet de loi C-27 — pas encore adopté |
| **Code de conduite volontaire pour l'IA** | Publié par le gouvernement fédéral — non contraignant |
| **Loi 25 (Québec)** | Obligations sur les décisions automatisées — en vigueur |

### Obligations spécifiques pour les agents AI/ACP

| Obligation | Source | Action requise |
|---|---|---|
| **Transparence** | Loi 25 | Informer que le client interagit avec un agent AI |
| **Décisions automatisées** | Loi 25 | Permettre de comprendre les facteurs de recommandation |
| **Consentement** | Loi 25 | Obtenir le consentement pour l'utilisation des données |
| **Non-discrimination** | Charte QC | S'assurer que l'agent ne discrimine pas dans les recommandations |
| **Exactitude** | LPC | L'agent ne doit pas faire de représentations fausses ou trompeuses |

### Bonnes pratiques IA pour notre produit

1. **Mention claire** : « Vous interagissez avec un assistant virtuel propulsé par l'IA »
2. **Aucune pression de vente artificielle** (fausses urgences, faux stocks)
3. **Traçabilité** des recommandations produits
4. **Audit régulier** des réponses de l'agent pour qualité et exactitude
5. **Possibilité de parler à un humain** à tout moment

---

## 8. Loi anti-pourriel (LCAP)

### La LCAP s'applique si on envoie des communications commerciales électroniques

| Règle | Détail |
|---|---|
| **Consentement** | Exprès ou tacite requis avant l'envoi |
| **Identification** | Nom et coordonnées de l'expéditeur |
| **Désabonnement** | Mécanisme de désabonnement fonctionnel dans chaque message |
| **Délai** | Traiter la demande de désabonnement dans 10 jours ouvrables |

### Consentement tacite (sans opt-in explicite)

Valide pendant **2 ans** si :
- Relation d'affaires existante (achat, contrat en cours)
- Demande de renseignements dans les 6 derniers mois

### Sanctions

- Jusqu'à **1 000 000 $** par violation (individu)
- Jusqu'à **10 000 000 $** par violation (organisation)

### Pour notre entreprise

- **Newsletter / infolettres** : opt-in obligatoire
- **Courriels de prospection** : seulement si consentement ou relation d'affaires existante
- **Communications transactionnelles** (confirmation de commande, facture) : exemptées

---

## 9. Accessibilité numérique

### Cadre québécois

- La **Loi assurant l'exercice des droits des personnes handicapées** s'applique aux organismes publics
- Pour les entreprises privées : pas d'obligation légale stricte, mais **fortement recommandé**
- Standards : **WCAG 2.1 niveau AA** (Web Content Accessibility Guidelines)

### Bonnes pratiques pour notre produit

| Aspect | Action |
|---|---|
| **Contraste** | Ratio minimum 4.5:1 pour le texte |
| **Navigation clavier** | Tous les éléments interactifs accessibles au clavier |
| **Textes alternatifs** | Alt text pour toutes les images |
| **Labels** | Labels clairs sur les formulaires |
| **Agent conversationnel** | Réponses textuelles accessibles aux lecteurs d'écran |

---

## 10. Déclarations annuelles

### Obligations récurrentes

| Déclaration | Organisme | Fréquence | Échéance |
|---|---|---|---|
| **Déclaration de mise à jour annuelle** | REQ | Annuelle | Dans les 60 jours de la date anniversaire |
| **T2 — Déclaration de revenus fédérale** | ARC | Annuelle | 6 mois après fin d'exercice |
| **CO-17 — Déclaration de revenus QC** | Revenu Québec | Annuelle | 6 mois après fin d'exercice |
| **TPS/TVQ** | ARC / RQ | Trimestrielle ou annuelle | Selon seuil |
| **T4 / RL-1 — Feuillets employés** | ARC / RQ | Annuelle | 28 février |
| **CNESST — Déclaration des salaires** | CNESST | Annuelle | 15 mars |
| **Registre des bénéficiaires ultimes** | REQ | Mise à jour annuelle | Avec la déclaration annuelle |

---

## 11. Checklist conformité

### Phase 1 — Avant le lancement

- [ ] Nommer un responsable de la protection des renseignements personnels
- [ ] Rédiger et publier la politique de confidentialité (site web)
- [ ] Mettre en place le mécanisme de consentement (cookies, données)
- [ ] Rédiger les conditions d'utilisation du site/service
- [ ] Créer le registre des incidents de confidentialité
- [ ] Faire une EFVP pour le projet d'intégration AI/OpenAI
- [ ] S'assurer que le site web est disponible en français
- [ ] Enregistrer la marque de commerce (OPIC)

### Phase 2 — Opérations courantes

- [ ] Politique anti-pourriel : opt-in pour les communications marketing
- [ ] Tenir le registre des incidents de confidentialité à jour
- [ ] Vérifier la conformité des agents AI (transparence, exactitude)
- [ ] Clause PI dans tous les contrats d'employés et sous-traitants
- [ ] Entente de traitement des données avec chaque client
- [ ] Politique contre le harcèlement à jour

### Phase 3 — Annuel

- [ ] Déclaration annuelle REQ
- [ ] Mise à jour du registre des bénéficiaires ultimes
- [ ] Révision de la politique de confidentialité
- [ ] Audit de conformité Loi 25
- [ ] Vérification de la conformité linguistique (Loi 96)

---

## Ressources

| Ressource | Lien |
|---|---|
| **CAI — Commission d'accès à l'information** | https://www.cai.gouv.qc.ca |
| **OQLF — Office québécois de la langue française** | https://www.oqlf.gouv.qc.ca |
| **OPC — Office de la protection du consommateur** | https://www.opc.gouv.qc.ca |
| **OPIC — Office de la propriété intellectuelle du Canada** | https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en |
| **CRTC — LCAP** | https://crtc.gc.ca/eng/internet/anti.htm |
| **REQ — Registraire des entreprises** | https://www.registreentreprises.gouv.qc.ca |
| **Loi 25 — Texte complet** | https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1 |
