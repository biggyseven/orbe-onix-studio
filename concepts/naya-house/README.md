# NAYA HOUSE — Carnet de marée

Version de conception : **V2 / Le carnet de marée**  
Projet conceptuel indépendant de la galerie ORBE & ONIX.

## Intention

Un site d'hospitalité construit comme un carnet de voyage éditorial, plutôt qu'un modèle hôtelier classique. La navigation par chapitres, les annotations, les légendes photographiques et la composition asymétrique donnent au site son langage propre.

## Identité visuelle

- Papier coquillage, vert forêt, argile et bleu-vert.
- Instrument Serif pour la narration, DM Sans pour les textes et DM Mono pour les notes et index.
- Index latéral numéroté sur grand écran, index horizontal sur mobile.
- Photographies traitées comme des planches de carnet, pas comme des cartes standard.
- Chapitres narratifs : Départ, La maison, Les chambres, Les heures, Le littoral, Correspondance.

## Interactions

- Navigation mobile compacte.
- Index des chapitres avec état actif et progression.
- Module « Les heures » : le choix du moment change texte et photographie.
- Agrandissement des photographies.
- Formulaire de demande de séjour avec contrôles de dates, en démonstration uniquement.

## Lancer localement

Depuis la racine du dépôt :

```powershell
python -m http.server 8000
```

Ouvrir ensuite :

```text
http://localhost:8000/concepts/naya-house/
```

## Limites et données provisoires

- Aucun backend et aucune réservation réelle.
- Les coordonnées, l'emplacement exact, les prestations, tarifs et capacités restent à confirmer.
- Les photographies Unsplash sont des images d'ambiance, pas des photos attestées de l'établissement.
- Une connexion internet est nécessaire pour les polices et les photographies externes.
- Ce dossier est isolé du site racine, de ses styles globaux et de ses scènes 3D.


## Ergonomie V3
- États de focus visibles sur les liens, boutons et champs.
- Cibles tactiles agrandies sur la navigation, les chapitres et le module des heures.
- Décalage de défilement mobile ajusté pour les deux barres sticky.
- Navigation des chapitres annoncée avec aria-current.
- Menu mobile refermable par Échap et clic extérieur, avec restitution du focus.
- Module des heures utilisable avec les flèches du clavier, Début et Fin.
- Visionneuse photo avec focus conservé, fermeture clavier et piège de focus.
- Dates contrôlées avec message explicite sans effacer les champs déjà remplis.
- Le style éditorial, les proportions, la palette, les polices et l'ordre des chapitres sont conservés.
