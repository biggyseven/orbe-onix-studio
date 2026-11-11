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
