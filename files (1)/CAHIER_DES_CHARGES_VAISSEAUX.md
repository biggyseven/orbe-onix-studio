# CAHIER DES CHARGES — Vaisseaux de la scène VESPERA
Projet ORBE & ONIX Studio · section « The Studio » · rendu Three.js r187 (WebGL)

## 1. Objectif

Créer 2 vaisseaux (3 en option) au format **glTF binaire (.glb)** pour animer discrètement la scène autour de la planète VESPERA.

Ce sont des **éléments secondaires**. Ils passent lentement devant puis derrière la planète. À l'écran ils font **15 à 60 pixels** de long (jusqu'à ~120 px lors d'un passage proche sur grand écran). Ils ne doivent jamais attirer l'œil avant la planète.

Conséquence directe : on cherche une **silhouette forte et élégante**, pas du détail. Un vaisseau qui se lit bien à 40 px vaut mieux qu'un modèle riche qu'on ne verra pas.

## 2. Direction artistique

Identité ORBE & ONIX : sculptural, minimal, premium. Palette : **graphite, ivoire, argent, accents lavande**.

À faire :
- Des formes de **design d'objet** : fuseaux, anneaux, arcs, volumes lisses, proportions étudiées.
- Des matières **mates à satinées** (métal brossé, céramique, ivoire mat). Rien de plastique brillant.
- Un seul point d'accent par vaisseau : une lueur de propulsion lavande ou blanc-bleuté.

À éviter :
- Le cliché sci-fi : canons, pointes agressives, ailes de chasseur, greebles (petits détails mécaniques) partout, couleurs saturées.
- Toute ressemblance avec un vaisseau d'une franchise existante (Star Wars, Star Trek, Halo, etc.).
- Logos, textes, inscriptions.

### Vaisseaux demandés

| Réf. | Nom | Idée | Taille relative |
|---|---|---|---|
| A | **Fuseau** | Navette allongée en goutte étirée, coque ivoire, un anneau de propulsion en graphite à l'arrière. Silhouette de stylo ou de lame. | longueur 1,0 |
| B | **Anneau** | Vaisseau torique fin (un anneau de coque, un noyau central suspendu). Se lit très bien de face et de profil. | diamètre 1,3 |
| C (option) | **Sonde** | Petit éclaireur : un noyau sphérique et deux arcs fins. | 0,5 |

Proposer un croquis ou un rendu rapide avant de modéliser en détail.

## 3. Contraintes techniques (strictes)

| Élément | Limite |
|---|---|
| Triangles | A ≤ 6 000 · B ≤ 8 000 · C ≤ 3 000 |
| Matériaux | 2 par vaisseau (coque + émissif), 3 maximum |
| Textures | Aucune si possible (couleurs et valeurs uniformes). Sinon 1 seule carte coque 512×512 max. |
| Poids du .glb | **≤ 200 Ko** chacun, après compression |
| Animations | Aucune dans le fichier (le code gère le mouvement) |
| Lumières, caméras | Aucune dans le fichier |

### Matériaux (PBR métal/rugosité)

- `Mat_Hull` : coque. Couleur de base ivoire (#d9d2c8) ou graphite (#2a2933), métallicité 0,0 à 0,6, rugosité **0,45 à 0,75**.
- `Mat_Glow` : lueur de moteur, **émissif** lavande (#b9a8ea) ou blanc-bleu. Intensité d'émission modérée (≤ 3). Appliqué uniquement sur les faces du moteur.
- `Mat_Nav` (option) : points des feux de navigation. Matériaux séparés pour pouvoir les faire clignoter (rouge discret, vert discret).

### Convention de modèle (glTF)

- Axe **Y vers le haut**. Le **nez du vaisseau pointe vers +Z** (convention glTF).
- Origine au **centre du modèle**.
- Échelle : le vaisseau fait **1,0 unité de long** (B : 1,3 de diamètre).
- **Toutes les transformations appliquées** (Ctrl+A → Tout dans Blender), aucun modificateur non appliqué.
- Normales vers l'extérieur, pas de faces internes inutiles, pas de faces superposées (z-fighting).
- Un seul objet principal par fichier, nommé `Ship_Fuseau`, `Ship_Anneau`, `Ship_Sonde`.

## 4. Export et optimisation

1. Export Blender : **glTF 2.0 binaire (.glb)**, option « +Y Up », sans caméras ni lumières, sans animation.
2. Optimisation (compression de géométrie) avec glTF-Transform :
   ```
   npx @gltf-transform/cli optimize ship.glb ship.opt.glb --compress meshopt
   ```
   (ajouter `--texture-compress webp` s'il y a une texture ; vérifier les options dans la documentation de la version installée).
3. Vérifier le résultat dans un visualiseur glTF (par exemple gltf-viewer de Don McCurdy) : couleurs, émissif, orientation du nez (+Z).

## 5. Livrables

- `ship_fuseau.glb`, `ship_anneau.glb` (+ `ship_sonde.glb` si fait), chacun compressé meshopt.
- Les fichiers source `.blend`.
- Un rendu **turntable** de chaque vaisseau (3 vues : dessus, profil, trois-quarts) sur fond noir, avec un éclairage directionnel unique, pour valider l'apparence.
- Une fiche indiquant triangles et poids de chaque fichier.

## 6. Critères d'acceptation

1. **Lisibilité :** la silhouette est reconnaissable à 40 px de long, sur fond noir.
2. **Sobriété :** aucun détail ne scintille ou ne grésille (aliasing) à cette taille.
3. **Matières :** pas de plastique brillant ; sous un soleil directionnel unique, la coque garde des valeurs lisibles côté ombre.
4. **Cohérence :** palette limitée à graphite, ivoire, argent et lavande.
5. **Technique :** limites de triangles, matériaux et poids respectées ; orientation +Z ; pas d'artefacts de normales.
6. **Test dans la scène :** le vaisseau reste secondaire et ne fait pas concurrence à la planète.

## 7. Intégration dans le code (pour le développeur)

**Attention : une ligne à ajouter dans `index.html`, hors section Studio.** Le chargeur `GLTFLoader` de Three.js importe `three` par son nom nu (`import ... from 'three'`). Sans bundler, cela échoue tant qu'une *import map* n'est pas déclarée **avant** tout script de type module :

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"
} }
</script>
```

L'URL de `three` doit être **strictement identique** à celle utilisée dans `studio-orb-3d.js`, pour que le navigateur ne charge pas deux copies de Three.js.

Dans le module, importer le chargeur et le décodeur meshopt depuis `three/addons/`, avec ce comportement :
- charger les .glb **après** l'affichage de la planète, en arrière-plan ;
- **fallback automatique** vers une géométrie procédurale simple si un fichier manque ou échoue ;
- 2 vaisseaux sur ordinateur, 0 ou 1 sur mobile ;
- lueur de moteur et feux de navigation animés par le code (clignotement discret), pas par le fichier ;
- `dispose()` propre, et arrêt complet avec `prefers-reduced-motion`.

## 8. Qui peut le réaliser

- **Un modeleur 3D** (freelance Blender) : ce document sert de brief.
- **Via ChatGPT avec un script Blender (Python / bpy)** : possible pour des formes simples comme le Fuseau et l'Anneau, qui sont des géométries paramétriques (courbes, tores, extrusions). Le rendu sera plus géométrique qu'artisanal ; à valider avec les turntables. Je n'ai pas pu tester Blender ici, donc ce chemin reste à vérifier de votre côté.

Prompt à donner à ChatGPT pour cette voie :

```
Écris un script Blender Python (bpy, Blender 4.x) qui génère le vaisseau « Fuseau » :
fuseau allongé (goutte étirée, ~6 000 triangles max) avec un anneau de propulsion à l'arrière,
nez vers +Z, Y vers le haut, longueur totale 1,0 unité, origine au centre.
Matériaux : Mat_Hull (ivoire #d9d2c8, rugosité 0,6, métallique 0,2) et Mat_Glow (émissif #b9a8ea, force 2,5)
appliqué sur le disque de propulsion uniquement. Applique toutes les transformations,
recalcule les normales, supprime les doublons, puis exporte en .glb (+Y Up, sans caméra ni lumière)
dans un chemin que je peux changer en haut du script. Donne le nombre de triangles final.
Même chose ensuite pour « Anneau » (tore fin + noyau central suspendu, diamètre 1,3).
```
