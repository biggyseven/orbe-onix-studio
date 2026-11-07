# ORBE & ONIX — Conception des pages Travaux et Services

**Document de conception · v0.3 · 7 novembre 2026**  
**Statut : première intégration de Travaux, Services et des études de cas.** `work.html` présente les trois concepts dans une archive homogène, avec filtres et périmètres explorés ; l’ancienne couche d’entrée qui masquait l’archive a été retirée des parcours et les liens internes pointent désormais directement vers la page. `services.html` présente les quatre familles de prestations, leurs livrables, dépendances, limites, processus et FAQ. `project.html` personnalise désormais le périmètre, le récit et la note de transparence pour NAYA HOUSE, FORME et FLOWSTATE, avec prototypes locaux explicitement signalés. Le contrôle visuel dans le navigateur reste à confirmer. Cette évolution ne crée ni backend, ni formulaire de transmission, ni paiement, ni fonctionnalité commerciale nouvelle.

---

## 1. Intention commune

Les pages doivent prolonger la direction du prototype v0.3 : futurisme éditorial, graphite, gris fumé, ivoire chaud, transparences maîtrisées et lavande en accent. La profondeur vient de la composition, des matières et de la lumière, pas d'une accumulation d'effets.

### Principes non négociables

- **Éditorial avant promotionnel.** Des titres courts, des descriptions précises et de l'espace autour des contenus.
- **Matière contrôlée.** Verre fumé, bordures fines, reflets doux et halos lavande localisés. Les surfaces translucides restent derrière les contenus, jamais sous un paragraphe à faible contraste.
- **Une hiérarchie stable.** Même logique de navigation, de titres, de métadonnées et de CTA sur les deux pages.
- **Mouvement utile.** Les transitions indiquent un état ou invitent à explorer. Pas de parallaxe lourde, de zoom agressif ou de défilement forcé.
- **Honnêteté éditoriale.** Les trois projets actuels restent identifiés comme concepts indépendants. Aucune statistique, citation client, marque cliente ou promesse de résultat ne doit être ajoutée.
- **Français prioritaire.** Les repères anglais peuvent rester comme détails éditoriaux, mais les explications, filtres, livrables et CTA sont en français.

### Palette et typographie de référence

| Usage | Référence |
|---|---|
| Fond profond | Graphite #111116 |
| Surface profonde | Graphite secondaire #191920 |
| Fond clair | Ivoire #efeee9 |
| Texte clair | Ivoire doux #f4f0f7 |
| Texte secondaire | Gris fumé #aaa5b2 |
| Accent principal | Lavande #9383f5 |
| Accent lumineux | Lavande claire #c9c0ff |
| Accent rare | Vert doux #d3ef79 |
| Titres | Space Grotesk |
| Lecture | Inter |
| Index / métadonnées | IBM Plex Mono |

L'accent vert reste réservé à un état, un repère ou un micro-détail. Il ne devient pas une couleur de bouton dominante. Les titres peuvent employer la serif italique déjà présente dans le système pour un seul mot ou une courte expression.

---

# 2. Page « Travaux »

## 2.1 Rôle et promesse

Présenter une archive courte de trois études indépendantes, montrer ce que chaque concept explore et conduire vers une étude de cas. La page n'est pas un mur de réalisations clients ni une galerie de logos.

**Titre proposé :** « Le travail en mouvement. »  
**Introduction proposée :** « Trois terrains d'exploration. Trois contextes, trois langages visuels, une même recherche : donner une forme juste aux idées. »  
**Mention visible :** « Les projets présentés sont des concepts indépendants réalisés par ORBE & ONIX. »

## 2.2 Structure desktop

    ┌──────────────────────────────────────────────────────────────────────┐
    │ HEADER : logo       Accueil  Travaux  Services  Studio  Lab   CTA    │
    ├──────────────────────────────────────────────────────────────────────┤
    │ GRAPHITE / INTRO ÉDITORIALE                                          │
    │ ORBE & ONIX / WORK INDEX                         ARCHIVE / 001—003   │
    │                                                                      │
    │ Le travail                         03 CONCEPTS                       │
    │ en mouvement.                     Trois terrains d'exploration...   │
    │                                   Tous les projets sont conceptuels │
    │ ───────────────────────────────────────────────────────────────────  │
    ├──────────────────────────────────────────────────────────────────────┤
    │ FOND IVOIRE                                                          │
    │ [Tout voir 03] [Sites & lieux 01] [Commerce 01] [Applications 01]   │
    │                                                                      │
    │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐       │
    │ │ VISUEL 4:3       │ │ VISUEL 4:3       │ │ VISUEL 4:3       │       │
    │ │ NAYA HOUSE       │ │ FORME            │ │ FLOWSTATE        │       │
    │ │ CONCEPT          │ │ CONCEPT          │ │ CONCEPT          │       │
    │ ├──────────────────┤ ├──────────────────┤ ├──────────────────┤       │
    │ │ 01 / SITE        │ │ 02 / COMMERCE    │ │ 03 / APPLICATION │       │
    │ │ NAYA HOUSE   ↗   │ │ FORME        ↗   │ │ FLOWSTATE    ↗   │       │
    │ │ Résumé précis    │ │ Résumé précis    │ │ Résumé précis    │       │
    │ │ UX · UI · ...    │ │ UX · UI · ...    │ │ UX · UI · ...    │       │
    │ └──────────────────┘ └──────────────────┘ └──────────────────┘       │
    │                                                                      │
    │ NOTE : études conceptuelles, pas des commandes clients.             │
    ├──────────────────────────────────────────────────────────────────────┤
    │ CTA GRAPHITE : « Une idée à mettre en forme ? »  [Parlons-en ↗]     │
    └──────────────────────────────────────────────────────────────────────┘

### Composition

- Conserver le hero graphite actuel et son vocabulaire orbital, mais limiter les grands halos à l'arrière-plan.
- Conteneur de lecture : environ 1 200–1 280 px, avec marges généreuses.
- Hero sur deux colonnes : titre à gauche, compteur et texte à droite.
- Archive sur fond ivoire, avec filtres en haut et grille de trois cartes de même anatomie.
- Les trois visuels peuvent garder leur direction artistique propre. Leur cadre, leur ratio, leurs métadonnées et leur pied de carte restent communs.
- Préférer un ratio d'image proche de **4:3** et une hauteur homogène. La variété vient des visuels, pas de tailles de cartes arbitrairement différentes.
- Conserver une note de transparence en bas de galerie, puis un CTA calme sur fond graphite.

### Cartes proposées

**01 — NAYA HOUSE**  
Catégorie : Sites & expériences · Hospitality  
Résumé : « Une expérience numérique imaginée pour faire ressentir un refuge côtier avant la visite. »  
Exploration : Architecture éditoriale · Direction artistique · Parcours responsive  
Visuel : garder l'étude architecturale et côtière existante.  
Statut : **Concept indépendant**.

**02 — FORME**  
Catégorie : Commerce · E-commerce  
Résumé : « Une boutique conceptuelle où les objets, les matières et la découverte produit prennent le premier rôle. »  
Exploration : Catalogue · Fiche produit · Parcours panier  
Visuel : garder l'univers galerie / objets existant.  
Statut : **Concept indépendant**.

**03 — FLOWSTATE**  
Catégorie : Applications · Produit numérique  
Résumé : « Un espace de travail conceptuel qui organise projets, tâches et priorités en niveaux de lecture clairs. »  
Exploration : Architecture de l'information · Tableau de bord · États d'interface  
Visuel : garder l'interface de productivité existante.  
Statut : **Concept indépendant**.

Ne pas ajouter de résultats chiffrés, de logos de clients, de témoignages ou de dates de livraison. Les chiffres d'interface visibles dans FLOWSTATE restent des données de démonstration et doivent être compris comme telles.

## 2.3 Filtres

Quatre filtres suffisent pour trois projets :

1. **Tout voir** — 03
2. **Sites & lieux** — 01
3. **Commerce** — 01
4. **Applications** — 01

Ils correspondent aux trois concepts existants. Ne pas ajouter de filtre « branding », « UX » ou « développement » tant qu'il n'existe pas assez de projets pour que ces catégories soient utiles.

**Comportement attendu :**

- Un seul filtre actif à la fois.
- État actif visible par fond graphite et texte ivoire, sans accent néon.
- Le compteur annonce le nombre de projets affichés via une zone aria-live="polite".
- Les cartes masquées sont réellement retirées de l'ordre de tabulation.
- Le changement de filtre ne déclenche pas de déplacement brutal de page.
- Les filtres sont des boutons, utilisables au clavier et au toucher.
- Si un filtre ne contient aucun projet dans une évolution future, il est masqué ou désactivé avec un état explicite.

Le code actuel possède déjà un filtrage local via les attributs data-filter et data-category et un compteur accessible. La prochaine intégration pourra conserver cette logique en renommant proprement les catégories et leurs libellés.

## 2.4 États des cartes

| État | Comportement |
|---|---|
| Repos | Visuel stable, bordure fine, ombre très douce |
| Survol | Visuel agrandi au maximum de 1,02, translation de 2–4 px, flèche légèrement déplacée |
| Focus clavier | Contour lavande net, indépendant du hover |
| Pression tactile | Aucun effet qui dépend du hover ; toute la carte reste activable |
| Chargement | Dimensions réservées pour éviter le saut de mise en page |

La carte entière est un lien. Ne pas imbriquer un second bouton ou un autre lien dans cette zone.

## 2.5 Maquette mobile

    ┌──────────────────────────────┐
    │ HEADER / MENU                │
    ├──────────────────────────────┤
    │ WORK INDEX                   │
    │                              │
    │ Le travail                   │
    │ en mouvement.                │
    │                              │
    │ 03 CONCEPTS                  │
    │ Trois terrains d'exploration │
    │ ...                          │
    ├──────────────────────────────┤
    │ [Tout voir 03] [Sites 01]    │
    │ [Commerce 01] [Applications] │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ VISUEL NAYA / 4:3        │ │
    │ └──────────────────────────┘ │
    │ 01 / SITES & LIEUX           │
    │ NAYA HOUSE               ↗   │
    │ Concept indépendant          │
    │ Résumé sur 2–3 lignes        │
    │ UX · UI · RESPONSIVE         │
    │                              │
    │ ──────────────────────────   │
    │ ┌──────────────────────────┐ │
    │ │ VISUEL FORME / 4:3       │ │
    │ └──────────────────────────┘ │
    │ 02 / COMMERCE                │
    │ FORME                    ↗   │
    │ ...                          │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ VISUEL FLOWSTATE / 4:3   │ │
    │ └──────────────────────────┘ │
    │ ...                          │
    ├──────────────────────────────┤
    │ NOTE SUR LES CONCEPTS        │
    ├──────────────────────────────┤
    │ CTA / PARLONS DU PROJET      │
    └──────────────────────────────┘

Sur mobile : une seule colonne, filtres qui passent à la ligne, texte aligné à gauche, aucun élément flottant au-dessus du titre ou des cartes. Les visuels gardent un ratio constant. Les métadonnées peuvent s'empiler, jamais être réduites au point de devenir illisibles.

## 2.6 Études de cas : modèle commun

Le modèle actuel de project.html et ses données dynamiques couvrent déjà une bonne partie de ce besoin. La proposition consiste à consolider la hiérarchie, pas à inventer trois pages commerciales différentes.

Ordre recommandé :

1. **Fil d'Ariane + index** : retour à Travaux, numéro de l'étude.
2. **Hero de l'étude** : nom, phrase d'intention, badge « Concept indépendant », visuel principal.
3. **Bandeau de synthèse** : domaine, périmètre exploré, statut.
4. **Intention et question de conception** : le contexte fictif est présenté comme un exercice, jamais comme un client réel.
5. **Réponse de conception** : architecture, direction visuelle, choix UX.
6. **Trois principes** : hiérarchie, matière, mouvement ou principes propres au projet.
7. **Fragment interactif** : prototype local existant, avec un avertissement visible lorsque les données sont simulées.
8. **Périmètre exploré** : composants, écrans ou parcours effectivement représentés.
9. **Note de transparence** : ce qui est conceptuel, simulé ou non connecté.
10. **Étude suivante + CTA** : navigation vers un autre concept et invitation à présenter un besoin réel.

### Vocabulaire à privilégier

- « Intention », « exploration », « concept indépendant », « parcours imaginé », « prototype local », « périmètre présenté ».
- Éviter « client », « mission livrée », « résultats obtenus », « conversion améliorée », « utilisateurs actifs » ou tout indicateur non mesuré.
- Pour les fragments interactifs, préciser ce qui se passe réellement dans le navigateur : état local, démonstration, aucune commande, réservation ou donnée persistée.

### Mobile pour une étude de cas

Le visuel principal passe sous le titre et garde une hauteur maîtrisée. Le bandeau de synthèse devient une pile de lignes ou une grille 2 × 2. Les principes se lisent en cartes verticales. Les commandes de prototype sont larges, espacées et utilisables au toucher. La note de transparence reste proche du prototype, pas reléguée uniquement au footer.

---

# 3. Page « Services »

## 3.1 Rôle et promesse

Expliquer clairement ce que le studio peut raisonnablement concevoir et développer aujourd'hui, ce qui sera livré, ce qui dépend d'un cadrage technique et ce qui n'est pas inclus par défaut.

**Titre proposé :** « Des expériences web pensées pour leur usage. »  
**Introduction proposée :** « Du site vitrine à l'outil métier, nous concevons des interfaces claires et des expériences adaptées à votre objectif. Chaque périmètre est étudié avant de proposer une réalisation. »

Pas de faux forfaits, de prix d'appel, de délais standard ou de promesse de performance. Les quatre entrées sont des familles de projets, pas quatre packs figés.

## 3.2 Structure desktop

    ┌──────────────────────────────────────────────────────────────────────┐
    │ HEADER : navigation commune                                          │
    ├──────────────────────────────────────────────────────────────────────┤
    │ HERO GRAPHITE                                                         │
    │ SERVICES / 01—04                                                     │
    │ Des expériences web                 Du site vitrine à l'outil métier,│
    │ pensées pour leur usage.             chaque projet commence par...    │
    │ [Présenter mon projet ↗]             [Voir le processus ↓]           │
    ├──────────────────────────────────────────────────────────────────────┤
    │ FOND IVOIRE : NOS DOMAINES                                           │
    │                                                                       │
    │ ┌────────────────────────────┐ ┌────────────────────────────┐       │
    │ │ 01 / SITE VITRINE          │ │ 02 / LANDING PAGE          │       │
    │ │ Présenter avec clarté      │ │ Concentrer l'attention     │       │
    │ │ Pour quel besoin           │ │ Pour quel besoin           │       │
    │ │ Livrables                  │ │ Livrables                  │       │
    │ │ Limites / à cadrer         │ │ Limites / à cadrer         │       │
    │ └────────────────────────────┘ └────────────────────────────┘       │
    │ ┌────────────────────────────┐ ┌────────────────────────────┐       │
    │ │ 03 / E-COMMERCE            │ │ 04 / APPLICATION WEB       │       │
    │ │ Vendre avec un parcours    │ │ Structurer un outil        │       │
    │ │ Livrables / dépendances    │ │ Étude de faisabilité       │       │
    │ └────────────────────────────┘ └────────────────────────────┘       │
    ├──────────────────────────────────────────────────────────────────────┤
    │ PÉRIMÈTRE : CE QUI EST INCLUS / CE QUI SE DÉFINIT À PART              │
    ├──────────────────────────────────────────────────────────────────────┤
    │ PROCESSUS : 01 CADRER → 02 STRUCTURER → 03 CONCEVOIR → 04 DÉVELOPPER │
    │             → 05 TESTER & LIVRER                                     │
    ├──────────────────────────────────────────────────────────────────────┤
    │ FAQ : contenu, devis, délais, hébergement, maintenance                │
    ├──────────────────────────────────────────────────────────────────────┤
    │ CTA GRAPHITE : « Parlons du besoin avant de parler de solution. »    │
    └──────────────────────────────────────────────────────────────────────┘

### Composition

- Garder le hero sombre de la page Services, mais adopter un titre français et deux CTA hiérarchisés.
- Présenter les quatre services dans une grille 2 × 2. Chaque carte contient le besoin, les livrables de base et les limites principales.
- Utiliser un accent lavande pour le numéro, le focus ou un petit repère. Éviter quatre couleurs distinctes pour les quatre services.
- Après les cartes, clarifier les dépendances et exclusions dans une section lisible.
- Présenter le processus en cinq étapes avec une ligne de progression discrète.
- Terminer par une FAQ courte et un CTA vers le brief de contact.

## 3.3 Contenu proposé des quatre offres

### 01 — Sites vitrines

**Promesse :** présenter une activité, une organisation ou une marque avec une structure claire et une identité cohérente.

**Livrables de base à proposer :**
- Arborescence et hiérarchie des pages.
- Wireframes ou structure de contenu pour les pages prévues.
- Direction UI et composants visuels.
- Intégration responsive des pages convenues.
- Métadonnées et bases SEO techniques.
- Vérification des liens, affichages et états essentiels.
- Livraison des fichiers et consignes d'utilisation prévues au périmètre.

**À cadrer séparément :** rédaction complète, photographie, identité de marque, CMS, espace membre, réservation, multilingue, intégration CRM, formulaires avec réception serveur, hébergement et maintenance.

### 02 — Landing pages

**Promesse :** faire comprendre une offre et guider vers une action principale, sans détour.

**Livrables de base à proposer :**
- Clarification de l'objectif et de l'action principale.
- Structure éditoriale et hiérarchie des sections.
- Direction UI d'une page responsive.
- Intégration des sections et CTA.
- Vérification des liens et du comportement mobile.
- Métadonnées de partage et SEO de base.

**À cadrer séparément :** rédaction publicitaire complète, production photo/vidéo, gestion de campagnes, tracking publicitaire, tests A/B, CRM et traitement serveur d'un formulaire. Ne jamais garantir un taux de conversion.

### 03 — E-commerce

**Promesse :** concevoir un parcours produit et une expérience de commande compréhensibles.

**Livrables possibles après choix de la solution :**
- Architecture du catalogue et des catégories.
- Modèles de fiche produit.
- Parcours panier et étapes de commande.
- Direction UI responsive.
- Intégration à une plateforme e-commerce choisie, uniquement après validation technique.
- Tests du parcours sur l'environnement convenu.

**Dépendances majeures à valider avant devis :** plateforme, moyens de paiement, pays et devise, transporteurs, frais de livraison, taxes, stock, gestion des commandes, emails transactionnels, sécurité et responsabilités de maintenance. Un panier visuel ou une démonstration locale ne constitue pas une boutique opérationnelle.

### 04 — Applications web sur étude

**Promesse :** transformer un besoin métier en périmètre fonctionnel compréhensible avant de décider de la réalisation.

**Première étape réaliste :**
- Entretien et cadrage du besoin.
- Cartographie des rôles, parcours et états.
- Modèle fonctionnel et priorisation.
- Wireframes ou prototype d'interface.
- Étude de faisabilité et proposition d'architecture.
- Estimation distincte pour la réalisation.

**À chiffrer uniquement après étude :** authentification, base de données, rôles et permissions, API, notifications, paiements, journaux d'audit, sauvegardes, hébergement, sécurité et maintenance. Ne pas vendre une application complète sur la seule base d'une maquette.

## 3.4 Limites et responsabilités à afficher

Présenter ces éléments comme des points de cadrage, pas comme des petites lignes dissimulées :

- **Contenus :** textes, produits, données et visuels sont fournis par le client, sauf prestation éditoriale ou de production explicitement incluse.
- **Services tiers :** hébergement, domaine, licences, extensions, passerelles de paiement et abonnements sont identifiés séparément.
- **Fonctions connectées :** un formulaire, un paiement, une réservation, une synchronisation ou un espace membre ne sont annoncés comme opérationnels qu'après intégration et test réels.
- **Maintenance :** corrections après livraison, mises à jour, sauvegardes et assistance continue nécessitent un périmètre distinct.
- **Référencement :** la prestation de base couvre les fondations techniques convenues, pas une position garantie dans les moteurs de recherche.
- **Résultats :** aucune garantie de ventes, de trafic ou de conversion.

## 3.5 Processus proposé

| Étape | Travail | Validation attendue |
|---|---|---|
| 01 — Cadrer | Objectif, public, contenu, contraintes, fonctionnalités | Besoin et priorité compris |
| 02 — Définir | Périmètre, exclusions, dépendances, estimation | Proposition et périmètre acceptés |
| 03 — Concevoir | Arborescence, parcours, wireframes, direction UI | Structure et direction validées |
| 04 — Développer | Intégration, fonctions incluses, responsive | Version de revue sur environnement convenu |
| 05 — Vérifier & livrer | Tests, corrections prévues, documentation, transfert | Livraison et limites connues |

Le nombre de cycles de retours, les délais de validation, les modalités de paiement et le support après livraison doivent être définis dans chaque proposition commerciale. Ne pas inventer de durée ou de conditions standard dans la page publique.

## 3.6 FAQ recommandée

**Comment obtenir une estimation ?**  
Présentez votre activité, l'objectif, les pages ou fonctions attendues et vos contraintes. Le périmètre sera clarifié avant toute estimation.

**Les textes et visuels sont-ils inclus ?**  
Ils peuvent être fournis par le client ou faire l'objet d'une prestation distincte. Le devis précise les responsabilités.

**Le site sera-t-il administrable ?**  
Cela dépend du besoin et de la solution retenue. Un CMS ou une interface d'administration ne sont pas inclus automatiquement dans un site statique.

**Pouvez-vous intégrer le paiement ou un formulaire ?**  
Oui, si le fournisseur, le mode de réception, les accès et les contraintes techniques sont identifiés et validés. Une maquette seule ne traite aucune transaction.

**L'hébergement et la maintenance sont-ils inclus ?**  
Ils sont étudiés séparément, avec les coûts récurrents, les accès et les responsabilités clairement documentés.

**Quels sont les tarifs et délais ?**  
Ils dépendent du nombre de pages, des contenus, des intégrations et du niveau de complexité. Ils sont communiqués après cadrage, sans prix ou délai universel affiché.

## 3.7 Maquette mobile

    ┌──────────────────────────────┐
    │ HEADER / MENU                │
    ├──────────────────────────────┤
    │ SERVICES / 01—04             │
    │ Des expériences web          │
    │ pensées pour leur usage.     │
    │ Texte court...               │
    │ [Présenter mon projet]       │
    │ [Voir le processus ↓]        │
    ├──────────────────────────────┤
    │ NOS DOMAINES                 │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ 01 / SITE VITRINE        │ │
    │ │ Présenter avec clarté    │ │
    │ │ Pour quel besoin         │ │
    │ │ Livrables                │ │
    │ │ À cadrer                 │ │
    │ │ En savoir plus ↗         │ │
    │ └──────────────────────────┘ │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ 02 / LANDING PAGE        │ │
    │ │ ...                      │ │
    │ └──────────────────────────┘ │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ 03 / E-COMMERCE          │ │
    │ │ ...                      │ │
    │ └──────────────────────────┘ │
    │                              │
    │ ┌──────────────────────────┐ │
    │ │ 04 / APPLICATION WEB     │ │
    │ │ ...                      │ │
    │ └──────────────────────────┘ │
    ├──────────────────────────────┤
    │ CE QUI EST À DÉFINIR         │
    │ Contenus · Hébergement       │
    │ Intégrations · Maintenance  │
    ├──────────────────────────────┤
    │ PROCESSUS                    │
    │ 01 Cadrer                    │
    │ 02 Définir                   │
    │ 03 Concevoir                 │
    │ 04 Développer                │
    │ 05 Livrer                    │
    ├──────────────────────────────┤
    │ FAQ en accordéons natifs     │
    ├──────────────────────────────┤
    │ CTA / PRÉPARER UN BRIEF      │
    └──────────────────────────────┘

Sur mobile, les cartes deviennent une colonne et gardent les mêmes informations dans le même ordre. Les listes de livrables sont visibles sans interaction obligatoire. Si un accordéon est utilisé pour les détails, le titre, le nombre d'éléments et l'état ouvert/fermé doivent rester explicites. Le CTA principal occupe une largeur confortable.

---

# 4. Composants réutilisables

| Composant | Usage | Règle commune |
|---|---|---|
| PageHero | Intro Travaux / Services | Eyebrow, titre, texte, action facultative |
| SectionHeading | Début de section | Index, titre, note courte |
| FilterPills | Archive Travaux | Boutons accessibles, état actif, compteur |
| ProjectCard | Galerie Travaux | Visuel, catégorie, badge concept, titre, résumé, tags |
| ConceptBadge | Cartes et études de cas | Libellé constant « Concept indépendant » |
| ProjectMeta | Synthèse d'étude | Domaine, périmètre, statut |
| CaseHero | Haut d'une étude de cas | Titre, intention, visuel, badge |
| CasePrinciple | Principes de conception | Numéro, intitulé, explication |
| PrototypeNotice | Démonstrations locales | Explique données et actions simulées |
| ServiceCard | Quatre familles de services | Besoin, livrables, limites, CTA |
| DeliverableList | Détails des offres | Liste courte et concrète |
| ScopeNotice | Dépendances / exclusions | Fond fumé, contraste fort, ton factuel |
| ProcessStep | Processus | Numéro, verbe, description, validation |
| FAQItem | Questions fréquentes | details/summary natifs, focus visible |
| CTASection | Bas de page | Une phrase, une action principale |

Réutiliser les tokens et composants de assets/site.css. Ne pas créer une feuille de style parallèle pour chaque page. Les variantes doivent être pilotées par des classes de page explicites.

---

# 5. Interactions et qualité UI/UX

## Travaux
- Filtres instantanés et annoncés par lecteur d'écran.
- Hover subtil sur pointeur fin uniquement.
- Focus clavier aussi soigné que le hover.
- Carte entière cliquable avec zone tactile confortable.
- Ouverture d'une étude de cas sans animation de porte obligatoire.
- Si le seuil/porte du prototype est conservé, il reste une entrée facultative, peut être ignoré immédiatement et ne bloque jamais l'accès au contenu. La préférence de mouvement réduit désactive l'animation.

## Services
- Ancres « Voir les services » et « Voir le processus » avec défilement naturel.
- FAQ natives, utilisables au clavier et sans dépendance JavaScript.
- CTA conduisant vers le brief existant, avec indication claire de son fonctionnement actuel.
- Aucun bouton « Acheter », « Réserver », « Obtenir instantanément » ou « Envoyer » si l'action correspondante n'est pas réellement connectée.

## Responsive et accessibilité
- Cibles tactiles d'au moins 44 × 44 px lorsque possible.
- Contraste de texte conforme aux bonnes pratiques WCAG AA, particulièrement sur les surfaces translucides.
- prefers-reduced-motion respecté pour toutes les animations.
- Aucun contenu essentiel révélé uniquement au survol.
- Pas de débordement horizontal à 320, 360, 390, 768, 1024 et 1440 px.
- Vérifier navigation clavier, ordre des titres, liens, boutons, états aria-pressed, focus et zones aria-live.
- Réserver les dimensions des images et charger les visuels sans provoquer de saut de mise en page.
- Les effets de verre restent décoratifs et ne diminuent jamais la lisibilité.

---

# 6. État actuel du projet et intégration

Éléments déjà présents dans le dépôt au moment de cette proposition :

- work.html contient les trois concepts, leurs visuels, les filtres et une note de transparence.
- assets/site.js gère déjà les filtres locaux et leur compteur accessible.
- project.html et les données de assets/site.js fournissent un modèle d'étude de cas dynamique pour NAYA HOUSE, FORME et FLOWSTATE.
- services.html contient déjà les quatre familles de services, un processus en quatre étapes et une FAQ.
- assets/site.css possède les styles de galerie, de cartes, de processus, de FAQ et de pages de cas.

La prochaine évolution doit donc être une **consolidation de contenu et de hiérarchie visuelle**, pas une réécriture complète du site. Garder les visuels existants et les interactions déjà testées lorsque leur comportement est juste.

### Limite importante du contact actuel

Le formulaire de contact.html valide les champs et génère un brief copiable dans le navigateur. Il ne transmet ni ne stocke les informations. Les CTA des pages Travaux et Services doivent donc être formulés comme « Préparer un brief » ou « Présenter mon projet », avec une note explicite sur la copie manuelle, jusqu'à ce qu'un canal de réception réel soit choisi et configuré.

### Hors périmètre de cette conception

- Backend, base de données, CMS ou authentification.
- Réception serveur des formulaires.
- Paiement, commande, réservation ou gestion de stock.
- CRM, analytics ou suivi publicitaire.
- Tarification automatique, devis instantané ou promesse de délai.
- Création de faux témoignages, logos clients ou résultats.

---

# 7. Arbitrages à confirmer avant intégration

| Sujet | Recommandation de départ | À confirmer |
|---|---|---|
| Public prioritaire | PME, indépendants et marques ayant besoin d'une présence web claire | Types de clients que le studio souhaite réellement cibler |
| Langue | Français pour le contenu principal, micro-labels anglais possibles | Site entièrement bilingue ou non |
| Tarifs | Pas de prix public tant que les périmètres ne sont pas stabilisés | Fourchettes ou devis uniquement |
| Délais | Estimation après cadrage | Capacité et délais réalistes du studio |
| Contenus | Fournis par le client par défaut | Rédaction, photo et identité incluses ou non |
| Stack vitrine | Solution statique ou CMS selon besoin | Technologies que le studio veut officiellement proposer |
| E-commerce | Plateforme et paiement choisis avant engagement | Plateforme, pays, devise, livraison et prestataire de paiement |
| Applications | Étude de faisabilité avant engagement de développement | Types d'applications acceptés et limites de complexité |
| Hébergement | Ligne séparée dans le devis | Qui achète le domaine, héberge et renouvelle |
| Maintenance | Option distincte et documentée | Niveau de support réellement soutenable |
| Contact | Brief copié manuellement pour l'instant | Adresse ou service qui recevra les demandes |

---

## 8. Ordre d'intégration recommandé

1. **Valider la hiérarchie et le contenu** de cette proposition, notamment les limites commerciales.
2. **Travaux :** harmoniser les quatre filtres, les trois cartes, leurs libellés et la note de transparence.
3. **Études de cas :** consolider le badge conceptuel, la synthèse du périmètre et les notes sur les prototypes.
4. **Services :** passer des longues lignes de services à quatre cartes structurées, clarifier les livrables et dépendances, puis adapter le processus en cinq étapes.
5. **Responsive et accessibilité :** tester les tailles d'écran, clavier, tactile et mouvement réduit.
6. **Publication :** lancer les contrôles statiques existants, puis effectuer une vérification visuelle sur les pages publiées.

**Décision de conception recommandée :** conserver la direction sombre/ivoire et les univers visuels existants ; simplifier la galerie pour rendre les trois concepts immédiatement comparables ; rendre les services plus concrets grâce aux livrables et aux limites ; ne développer aucune fonction commerciale avant d'avoir arbitré ses dépendances.
