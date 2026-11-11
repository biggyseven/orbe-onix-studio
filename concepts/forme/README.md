# FORME® — Objects with presence

Prototype conceptuel e-commerce indépendant dans la galerie ORBE & ONIX.

## Direction artistique
- Showroom graphique, grille asymétrique, typographie Space Grotesk.
- Craie (#F0EFE9), carbone (#17191D), cobalt (#244BE5), corail (#F05A3E), aluminium (#C6C8C4).
- Langage visuel commercial et géométrique, distinct de NAYA HOUSE.

## Écrans
- `index.html` : showroom / accueil.
- `catalogue.html` : index produits, recherche, filtres catégorie/prix/matière, tri.
- `produit.html?id=arc-chair` : fiche produit paramétrique.
- `studio.html` : manifeste et principes.
- `panier.html` : gestion du panier et quantités.
- `commande.html` : formulaire et simulation de confirmation.

## Interactions
- Panier persistant en localStorage.
- Ajout, modification et suppression de produits.
- Filtrage, recherche et tri du catalogue.
- Choix de variantes et quantités sur la fiche produit.
- Tiroir panier avec résumé et accès au panier complet.
- Parcours de commande de démonstration sans paiement ni transmission de données.

## Lancer
Depuis la racine du dépôt :

```powershell
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/concepts/forme/`.

## Important
Tous les produits, prix, stocks, caractéristiques et conditions de livraison sont fictifs et utilisés uniquement pour la maquette. Les photos proviennent d'Unsplash et ne sont pas des images contractuelles de produits commercialisés. Aucun backend, compte client, paiement, CRM ou transmission de commande n'est connecté.

## Visuels produits / références temporaires
Les photographies de cette passe sont des références de présentation chargées depuis leurs CDN d'origine. Elles permettent de mieux lire la silhouette et la matière des objets dans le prototype. Elles ne constituent pas des visuels FORME propriétaires ni des produits réellement proposés à la vente. Avant une publication commerciale, remplacer ces références par des photographies propres ou dûment licenciées.

- ARC CHAIR : [Romein concept store](https://romein.cz/en/products/etcetera-armchair)
- LUMEN LIGHT : [Tanguay](https://www.tanguay.ca/en/prod1/6/home-decor-lighting/O/lighting/SA1/table-lamps/1014338/)
- FORMA VESSEL : [Louise Roe](https://louise-roe.com/collections/ceramic-vases-2)
- ORBIT STOOL : [InnerUnionHome](https://innerunionhome.com/products/sculptural-walnut-wood-stool)
- HALO PENDANT : [LedArena](https://ledarena.pl/pl/products/lampa-wiszaca-bezowa-zlota-e27-nad-stol-nowoczesna-1133.html)
- FOLD TRAY : [Cement Decor](https://cementdecor.it/en/products/vassoio-wavy-in-stile-minimal)
- SOFT SEAT : [MOMU](https://momu.com.au/products/salona/)
- LINE OBJECT : [Reviva Home](https://www.revivahome.com.br/escultura-decorativa-off-white-abstrata-em-ceramica-p6101)

## Passe de visibilité
- Les images produit ne sont plus fusionnées avec la couleur du fond via `mix-blend-mode: multiply`.
- Les visuels sont cadrés et dimensionnés pour occuper plus d'espace.
- Les huit objets utilisent des références photo cohérentes avec leur catégorie.
- La fiche produit met l'objet en grand, puis propose un agrandissement matière et une plaque technique au lieu de photos d'ambiance génériques.
