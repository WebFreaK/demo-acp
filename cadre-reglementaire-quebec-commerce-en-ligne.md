# Cadre réglementaire québécois pour le commerce en ligne

**Date :** 31 mars 2026  
**Objectif :** Document de connaissance interne — maîtriser les lois et règlements applicables au commerce en ligne au Québec afin de conseiller nos clients dans le cadre de l'intégration ACP / OpenAI Commerce.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Loi sur la protection du consommateur (LPC)](#2-loi-sur-la-protection-du-consommateur-lpc)
3. [Loi 25 — Protection des renseignements personnels](#3-loi-25--protection-des-renseignements-personnels)
4. [Loi 96 — Charte de la langue française](#4-loi-96--charte-de-la-langue-française)
5. [Taxes de vente (TPS / TVQ)](#5-taxes-de-vente-tps--tvq)
6. [Loi canadienne anti-pourriel (LCAP / CASL)](#6-loi-canadienne-anti-pourriel-lcap--casl)
7. [Loi sur la concurrence (fédéral)](#7-loi-sur-la-concurrence-fédéral)
8. [Normes d'accessibilité web](#8-normes-daccessibilité-web)
9. [Implications spécifiques pour l'intégration ACP](#9-implications-spécifiques-pour-lintégration-acp)
10. [Checklist de conformité pour nos clients](#10-checklist-de-conformité-pour-nos-clients)

---

## 1. Vue d'ensemble

Le commerce en ligne au Québec est encadré par un ensemble de lois **provinciales et fédérales** plus strict que la moyenne canadienne. Les trois piliers principaux sont :

| Pilier | Loi principale | Organisme responsable |
|---|---|---|
| **Protection du consommateur** | Loi sur la protection du consommateur (LPC) | Office de la protection du consommateur (OPC) |
| **Vie privée / données personnelles** | Loi 25 (Loi 64 à l'origine) — modifiant la Loi sur le privé | Commission d'accès à l'information (CAI) |
| **Langue française** | Charte de la langue française (Loi 101) telle que modifiée par la Loi 96 | Office québécois de la langue française (OQLF) |

> **Point clé pour nos ventes :** La complexité réglementaire québécoise est un **avantage concurrentiel** pour nous. Les entreprises ont besoin d'un intégrateur local qui connaît ces exigences, pas d'un fournisseur américain qui les ignore.

---

## 2. Loi sur la protection du consommateur (LPC)

### 2.1 Contrats à distance (articles 54.1 à 54.16)

La LPC contient des dispositions spécifiques aux **contrats conclus à distance** (en ligne, par téléphone, etc.) qui s'appliquent directement au commerce via ChatGPT / ACP.

#### Obligations du commerçant AVANT la conclusion du contrat

Le commerçant doit divulguer clairement :

| Information requise | Détail |
|---|---|
| **Identité du commerçant** | Nom, adresse, numéro de téléphone |
| **Description du bien/service** | Description détaillée incluant caractéristiques essentielles |
| **Prix détaillé** | Prix unitaire, frais supplémentaires, taxes, frais de livraison |
| **Conditions de livraison** | Date ou délai de livraison, mode de livraison |
| **Politique d'annulation / retour** | Modalités de remboursement, échange |
| **Devise** | Si le prix est en devise étrangère, le mentionner clairement |
| **Restrictions géographiques** | Zones de livraison applicables |

#### Droit d'annulation du consommateur

- Le consommateur peut **annuler le contrat dans les 7 jours** suivant la réception du document contractuel si celui-ci ne contient pas toutes les informations requises.
- Si le commerçant ne livre pas dans les **30 jours** suivant la date convenue (ou la date du contrat si aucune date n'a été fixée), le consommateur peut annuler.
- Le commerçant dispose de **15 jours** pour effectuer le remboursement après annulation.

#### Rétrofacturation (chargeback)

Si le commerçant ne rembourse pas dans les 15 jours, le consommateur peut demander une **rétrofacturation** à l'émetteur de sa carte de crédit.

### 2.2 Pratiques interdites

| Pratique | Article LPC | Risque |
|---|---|---|
| Fausse représentation sur le prix | Art. 224 | Amende + poursuite pénale |
| Prix annoncé qui n'inclut pas tous les frais obligatoires (« drip pricing ») | Art. 224 c) | Amende |
| Afficher un prix de référence fictif (faux « était à ») | Art. 231 | Amende + recours civil |
| Envoyer un produit non sollicité | Art. 230 | Le consommateur n'a aucune obligation de payer |
| Conditions peu claires ou trompeuses | Art. 228-229 | Annulation du contrat |

### 2.3 Garanties légales

Au Québec, les **garanties légales** s'appliquent automatiquement et ne peuvent pas être exclues par contrat :

- **Garantie de qualité** — Le bien doit servir à un usage normal pendant une durée raisonnable.
- **Garantie de conformité** — Le bien doit correspondre à la description donnée.
- **Garantie de sécurité** — Le bien ne doit pas présenter de danger pour la santé ou la sécurité.

> **Impact ACP :** Les descriptions de produits dans le flux ACP doivent être **exactes et complètes**. Une description générée par IA qui exagère les caractéristiques du produit expose le client à des recours en vertu de la LPC.

---

## 3. Loi 25 — Protection des renseignements personnels

### 3.1 Contexte

La **Loi 25** (anciennement projet de loi 64) a modernisé le cadre de protection de la vie privée au Québec en trois phases :

| Phase | Date d'entrée en vigueur | Éléments clés |
|---|---|---|
| Phase 1 | 22 septembre 2022 | Nomination d'un responsable vie privée, signalement d'incidents, registre des incidents |
| Phase 2 | 22 septembre 2023 | Politique de confidentialité, consentement explicite, évaluation des facteurs relatifs à la vie privée (EFVP), droit à la portabilité |
| Phase 3 | 22 septembre 2024 | Droit à la portabilité des données pleinement applicable, anonymisation |

### 3.2 Obligations clés pour le commerce en ligne

| Obligation | Détail | Pertinence ACP |
|---|---|---|
| **Désignation d'un responsable** | Toute entreprise doit nommer un responsable de la protection des renseignements personnels. Par défaut, c'est le dirigeant le plus haut placé. | Le client doit l'avoir fait avant l'intégration |
| **Politique de confidentialité** | Rédigée en termes clairs, publiée sur le site web. Doit préciser : types de RP collectés, finalités, moyens de collecte, droits des personnes, coordonnées du responsable | La politique doit mentionner le partage de données avec OpenAI/Stripe |
| **Consentement** | Doit être **manifeste, libre, éclairé, donné à des fins spécifiques et demandé pour chaque finalité**. Pour les mineurs de moins de 14 ans : consentement du parent/tuteur. | Les transactions via ChatGPT impliquent la collecte de données : le consentement doit être clair |
| **EFVP (évaluation des facteurs)** | Obligatoire avant de communiquer des renseignements personnels hors Québec ou de confier le traitement à un sous-traitant | **Critique** — OpenAI (USA) et Stripe (USA) sont des entités hors Québec |
| **Notification d'incident** | En cas d'incident de confidentialité présentant un risque sérieux : notifier la CAI + les personnes concernées | Processus à mettre en place chez le client |
| **Droit de suppression / désindexation** | Les individus peuvent demander la suppression de leurs renseignements personnels | Le client doit avoir un processus pour traiter ces demandes |

### 3.3 Transferts hors Québec

C'est le point le plus sensible pour l'intégration ACP :

- **Avant** de transférer des renseignements personnels hors du Québec, l'entreprise doit réaliser une **EFVP** (Évaluation des facteurs relatifs à la vie privée).
- L'EFVP doit évaluer si la juridiction de destination offre une protection **adéquate**.
- Le transfert doit faire l'objet d'un **contrat écrit** avec le sous-traitant (ex. : Stripe, OpenAI) spécifiant les mesures de protection.
- Le transfert doit être mentionné dans la **politique de confidentialité**.

> **Action concrète pour nos clients :** Nous devons aider le client à (1) réaliser ou mettre à jour son EFVP, (2) vérifier que les contrats avec Stripe et OpenAI couvrent les exigences de la Loi 25, (3) mettre à jour sa politique de confidentialité.

### 3.4 Sanctions

| Type | Montant maximal |
|---|---|
| Sanction administrative pécuniaire (entreprise) | 10 000 000 $ ou 2 % du chiffre d'affaires mondial |
| Amende pénale (entreprise) | 25 000 000 $ ou 4 % du chiffre d'affaires mondial |
| Dommages punitifs (recours civil) | Pas de plafond |

---

## 4. Loi 96 — Charte de la langue française

### 4.1 Obligations linguistiques pour le commerce en ligne

La Loi 96 (entrée en vigueur en juin 2022, avec entrée en vigueur progressive) a renforcé les exigences linguistiques pour les entreprises au Québec.

| Exigence | Détail | Impact e-commerce |
|---|---|---|
| **Affichage en français** | Le français doit être **nettement prédominant** dans l'affichage commercial au Québec | Le site web, les descriptions produits, les prix affichés doivent être en français |
| **Contrats d'adhésion** | Doivent être rédigés en français. Une version anglaise peut être fournie si le consommateur le demande. | Les conditions générales de vente (CGV) et les contrats de service doivent exister en français |
| **Communications commerciales** | Toute communication avec un consommateur québécois doit être disponible en français | Courriels de confirmation, factures, notifications de livraison |
| **Inscriptions sur les produits** | Les inscriptions sur les produits (emballage, étiquetage) doivent être en français | Les fiches produits dans le flux ACP doivent être en français |
| **Service à la clientèle** | Toute personne a le droit d'être servie en français au Québec | Support client post-vente en français obligatoire |

### 4.2 Entreprises de 25+ employés

Les entreprises de **25 employés ou plus** (seuil abaissé de 50 à 25 par la Loi 96) doivent :

- Obtenir un **certificat de francisation** de l'OQLF
- Avoir un **comité de francisation**
- S'assurer que les logiciels et systèmes internes sont disponibles en français
- Respecter la **généralisation de l'utilisation du français** dans les communications internes

### 4.3 Implications pour le flux ACP

| Élément du flux ACP | Exigence linguistique |
|---|---|
| Titres des produits | En français (version anglaise optionnelle) |
| Descriptions | En français (version anglaise optionnelle) |
| Options / variantes | En français (taille, couleur, etc.) |
| Politique de retour | Disponible en français |
| Courriels transactionnels | En français pour les clients QC |
| Checkout (page de paiement) | Texte en français disponible |

> **Avantage compétitif :** La plupart des intégrateurs hors Québec ne gèrent pas les exigences linguistiques. Notre service bilingue natif est un atout majeur.

---

## 5. Taxes de vente (TPS / TVQ)

### 5.1 Règles de base

| Taxe | Taux | Organisme |
|---|---|---|
| **TPS** (Taxe sur les produits et services — fédéral) | 5 % | Agence du revenu du Canada (ARC) |
| **TVQ** (Taxe de vente du Québec) | 9,975 % | Revenu Québec |
| **Total combiné** | 14,975 % | — |

### 5.2 Commerçants hors Québec

Depuis le **1er janvier 2019**, les entreprises situées **hors du Québec** qui vendent des biens ou services incorporels à des consommateurs québécois doivent :

- S'inscrire au **régime de la TVQ** si leurs ventes au Québec dépassent **30 000 $** sur 12 mois
- Percevoir et remettre la TVQ

Ceci s'applique aux **plateformes numériques** (ex. : si OpenAI facilite la vente, la question de qui perçoit la taxe se pose).

### 5.3 Biens détaxés et exonérés

| Catégorie | Exemples | Taxe applicable |
|---|---|---|
| Biens détaxés (0 %) | Produits alimentaires de base, médicaments sur ordonnance, produits d'exportation | TPS 0 % + TVQ 0 % |
| Biens exonérés | Services financiers, services de santé, services éducatifs | Aucune taxe |
| Biens taxables standard | Vêtements, électronique, meubles, logiciels, services professionnels | TPS 5 % + TVQ 9,975 % |

### 5.4 Affichage du prix

Au Québec, la pratique standard est d'afficher le prix **avant taxes**, mais le commerçant doit indiquer clairement que les taxes ne sont pas incluses. Le prix affiché dans le flux ACP doit suivre cette convention.

> **Point d'attention ACP :** Le flux ACP structure le prix dans un champ "price" — s'assurer que la gestion de la taxe est conforme au contexte québécois, en coordination avec Stripe Tax ou le moteur de taxe du client.

---

## 6. Loi canadienne anti-pourriel (LCAP / CASL)

### 6.1 Règles applicables au commerce en ligne

La LCAP (loi fédérale, 2014) encadre l'envoi de **messages électroniques commerciaux** (MEC).

| Règle | Détail |
|---|---|
| **Consentement exprès** | Avant d'envoyer un courriel commercial (promo, newsletter), il faut le consentement **exprès** du destinataire |
| **Consentement tacite** | Permis dans des cas limités : relation d'affaires existante (achat dans les 24 derniers mois), demande de renseignements (6 mois) |
| **Identification** | Chaque MEC doit identifier l'expéditeur (nom, adresse, coordonnées) |
| **Mécanisme de désabonnement** | Lien de désabonnement fonctionnel dans chaque MEC, traitement dans les 10 jours ouvrables |
| **Interdiction d'altération** | Interdit d'installer un logiciel sans consentement, ou de modifier les données de transmission |

### 6.2 Amendes

| Violation | Amende maximale |
|---|---|
| Personne physique | 1 000 000 $ par violation |
| Entreprise | 10 000 000 $ par violation |

> **Impact ACP :** Si le client souhaite envoyer des courriels de suivi / marketing aux acheteurs acquis via ChatGPT, il doit respecter la LCAP. Le consentement d'achat via ChatGPT ne constitue **pas** automatiquement un consentement à recevoir du marketing.

---

## 7. Loi sur la concurrence (fédéral)

### 7.1 Pratiques trompeuses (en ligne)

Le Bureau de la concurrence du Canada surveille :

| Pratique | Risque |
|---|---|
| **Indications de prix trompeuses** | Faux rabais, prix « de référence » gonflés | 
| **Indications fausses ou trompeuses** | Descriptions de produits inexactes, faux témoignages |
| **Avis/témoignages fabriqués** | Faux avis clients, astroturfing |
| **Drip pricing** | Ajouter des frais cachés au moment du paiement |

### 7.2 Dispositions sur l'IA

En 2025-2026, le Bureau a indiqué une surveillance accrue des **pratiques commerciales impliquant l'IA**, incluant :

- Descriptions de produits générées par IA qui pourraient être trompeuses
- Prix dynamiques basés sur le profilage IA
- Recommandations de produits biaisées

> **Précaution ACP :** Les descriptions de produits dans le flux doivent être **exactes et vérifiées par le client**. Ne pas laisser un modèle IA générer des descriptions sans validation humaine.

---

## 8. Normes d'accessibilité web

### 8.1 Obligations actuelles

| Organisme | Norme | Application |
|---|---|---|
| **Gouvernement du Québec** | SGQRI 008 3.0 (basé sur WCAG 2.1 niveau AA) | Obligatoire pour les organismes publics |
| **Secteur privé** | Pas d'obligation légale spécifique au QC pour l'instant, mais fortement recommandé | Best practice — réduit le risque de poursuites |
| **Fédéral** | Loi canadienne sur l'accessibilité (2019) | S'applique aux entreprises sous réglementation fédérale |

### 8.2 Bonnes pratiques recommandées

- Textes alternatifs sur les images de produits
- Navigation possible au clavier
- Contraste de couleurs suffisant
- Descriptions de produits lisibles par lecteurs d'écran

> **Impact ACP :** Le flux ACP inclut des champs de texte descriptif et des URL d'images. S'assurer que les descriptions sont suffisamment détaillées pour être utiles aux utilisateurs de technologies d'assistance.

---

## 9. Implications spécifiques pour l'intégration ACP

### 9.1 Matrice de conformité ACP × Réglementation QC

| Composante ACP | LPC | Loi 25 | Loi 96 | Taxes | LCAP |
|---|---|---|---|---|---|
| **Flux produits (Product Feed)** | Descriptions exactes, prix complet | Pas de RP dans le flux | Français obligatoire | Prix HT ou TTC clairement indiqué | — |
| **Checkout (Stripe)** | Affichage de toutes les conditions avant paiement | Consentement pour collecte de données de paiement | Interface disponible en français | Calcul TPS/TVQ correct | — |
| **Confirmation de commande** | Envoi du document contractuel complet | Consentement pour utilisation des données | En français | Détail des taxes | Pas de marketing sans consentement |
| **Suivi post-achat** | Respect des délais de livraison | Minimisation des données | En français | — | Consentement requis pour marketing |
| **Retours / remboursements** | Politique conforme à la LPC (7/30 jours) | Suppression des données sur demande | Politique en français | Remboursement des taxes | — |

### 9.2 Responsabilités : Client vs OpenAI vs Stripe vs Nous

| Obligation | Responsable principal | Notre rôle |
|---|---|---|
| Exactitude des descriptions produits | **Client** | Valider la conformité lors de la structuration du flux |
| Politique de confidentialité | **Client** | Recommander les mises à jour nécessaires |
| EFVP (transfert hors QC) | **Client** | Fournir un gabarit et assister la rédaction |
| Traduction française du flux produits | **Client + Nous** | Livrer le flux bilingue |
| Perception des taxes | **Client (via Stripe)** | Configurer Stripe Tax correctement |
| Conformité au checkout | **Stripe + OpenAI** | Vérifier que le flow respecte la LPC |
| Consentement marketing | **Client** | Conseiller sur la stratégie de consentement |

---

## 10. Checklist de conformité pour nos clients

À valider **avant la mise en ligne** du flux ACP :

### Protection du consommateur (LPC)
- [ ] Identité complète du commerçant accessible (nom, adresse, téléphone)
- [ ] Prix affichés conformes (pas de frais cachés)
- [ ] Descriptions de produits exactes et complètes
- [ ] Politique de retour / annulation conforme (7 jours / 30 jours livraison)
- [ ] Garanties légales québécoises mentionnées dans les CGV
- [ ] Document contractuel transmis après chaque achat

### Vie privée (Loi 25)
- [ ] Responsable de la protection des RP désigné
- [ ] Politique de confidentialité à jour et publiée
- [ ] EFVP réalisée pour les transferts vers OpenAI (USA) et Stripe (USA)
- [ ] Contrats de sous-traitance avec OpenAI et Stripe incluant les clauses requises
- [ ] Mécanisme de consentement pour la collecte des données de paiement
- [ ] Processus de notification d'incident en place
- [ ] Processus de traitement des demandes d'accès / suppression

### Langue française (Loi 96)
- [ ] Flux produits (titres, descriptions, variantes) disponible en français
- [ ] Conditions générales de vente en français
- [ ] Courriels transactionnels en français
- [ ] Page de paiement accessible en français
- [ ] Support client post-vente disponible en français

### Taxes
- [ ] Inscription TPS (ARC) à jour
- [ ] Inscription TVQ (Revenu Québec) à jour
- [ ] Stripe Tax configuré correctement pour le QC (TPS 5 % + TVQ 9,975 %)
- [ ] Affichage des taxes conforme (HT avec mention ou TTC)

### Communications (LCAP)
- [ ] Distinction claire entre courriels transactionnels et commerciaux
- [ ] Consentement exprès obtenu avant tout envoi marketing
- [ ] Mécanisme de désabonnement fonctionnel
- [ ] Coordonnées complètes dans chaque message commercial

---

## Sources et références

| Ressource | Lien |
|---|---|
| Loi sur la protection du consommateur (LPC) | legisquebec.gouv.qc.ca |
| Office de la protection du consommateur (OPC) | opc.gouv.qc.ca |
| Loi 25 — Texte officiel | assnat.qc.ca |
| Commission d'accès à l'information (CAI) | cai.gouv.qc.ca |
| Charte de la langue française / Loi 96 | legisquebec.gouv.qc.ca |
| Office québécois de la langue française (OQLF) | oqlf.gouv.qc.ca |
| Revenu Québec — TVQ commerce électronique | revenuquebec.ca |
| LCAP / CASL | fightspam.gc.ca |
| Bureau de la concurrence du Canada | bureaudelaconcurrence.gc.ca |

---

*Ce document est un outil de référence interne et ne constitue pas un avis juridique. Pour toute question spécifique, consulter un avocat spécialisé en droit du commerce électronique au Québec.*
