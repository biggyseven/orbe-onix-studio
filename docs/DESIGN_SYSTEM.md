# ORBE & ONIX — Design system

## Direction artistique
Éditorial futuriste, surfaces graphite, ivoire chaud, verre fumé et reflets lavande. Le langage visuel doit rester lisible, précis et distinctif. Éviter le néon gratuit, les effets de poster et les animations sans fonction.

## Tokens de référence
- Graphite : `#111116`
- Graphite secondaire : `#191920`
- Ivoire : `#efeee9`
- Lavande : `#9383f5`
- Lavande claire : `#c9c0ff`
- Accent acide : `#d3ef79`

## Typographie
- Space Grotesk : titres et expression
- Inter : interface et lecture
- IBM Plex Mono : métadonnées et repères

## Interaction
- Le mouvement révèle une hiérarchie ou un état.
- Respecter `prefers-reduced-motion`.
- Conserver des états focus visibles et une navigation clavier.
- Le verre ne doit jamais réduire le contraste.
- Les prototypes restent locaux et ne simulent pas une transaction réelle.

## Matières visuelles
Les illustrations de marque et de projets sont dessinées en SVG et CSS. Aucun visuel raster généré n'est nécessaire.

## Responsive
- Navigation mobile dédiée.
- Grilles adaptées aux largeurs intermédiaires et mobiles.
- Éviter le débordement horizontal.
- Tester les pages sur clavier, tactile et pointeur fin.

## Système de boutons V2
Le système de boutons suit une géométrie éditoriale, avec des angles de 5 px plutôt que des pilules systématiques. La hauteur standard est de 46 px (45 px au plus petit breakpoint).

- **Principal — `.button.primary`** : fond lavande claire `#c9c0ff`, texte graphite `#17151e`. Réservé à l'action principale d'une section. Au survol, le fond passe à l'accent acide `#d3ef79`.
- **Secondaire — `.button.ghost`** : fond transparent, contour lavande discret et texte ivoire. Sert aux actions de soutien.
- **Sombre — `.button.dark`** : fond graphite et texte ivoire, à utiliser sur les surfaces claires.
- **Lien éditorial — `.text-link` / `.services-text-link`** : sans bloc de fond, avec soulignement ou flèche. À privilégier pour une navigation secondaire.
- **Commandes iconiques** : contrôles carrés distincts des CTA. Ne pas détourner les variantes de navigation pour les commandes des prototypes.

Règles communes : Inter en 10 px minimum pour les CTA compacts, graisse 600, libellés en casse phrase, flèche animée de quelques pixels au survol, focus clavier nettement visible et respect de `prefers-reduced-motion`. Le CTA de l'en-tête utilise la variante principale ; l'état courant de Contact reste secondaire.
