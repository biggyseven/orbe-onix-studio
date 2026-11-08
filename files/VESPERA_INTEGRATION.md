# VESPERA — intégration (section #studio uniquement)

## 1. Fichiers à copier dans le dépôt

```
assets/studio-orb-3d.js            ← remplace le fichier actuel
assets/vespera/1024/*.webp
assets/vespera/2048/*.webp
assets/vespera/4096/*.webp
assets/vespera/vespera-poster.webp ← fallback sans WebGL
scripts/make_vespera_textures.py   ← régénération des textures (hors site)
```

Ne **pas** copier `_height.npy` (fichiers de travail) ni `scripts/harness.html|shot.py|preview_sphere.py`
(outils de test).

## 2. Balise script (important)

Le module utilise `import.meta.url` : il doit être chargé en **module**.

```html
<script type="module" src="assets/studio-orb-3d.js"></script>
```

Si `index.html` le charge aujourd'hui avec `<script src=...>` ou `defer` sans `type="module"`,
changer uniquement cette balise.

## 3. CSS à ajouter à la fin de `assets/site.css`

```css
/* VESPERA — canvas & fallback (section #studio) */
.home-studio-3d { position: relative; overflow: hidden; }
.home-studio-3d .vespera-canvas,
.home-studio-3d .vespera-poster {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: block; object-fit: contain;
}
.home-studio-3d .vespera-canvas { opacity: 0; transition: opacity 1.2s ease; }
.home-studio-3d.is-ready .vespera-canvas { opacity: 1; }
.home-studio-3d.is-fallback .vespera-canvas { display: none; }
@media (prefers-reduced-motion: reduce) {
  .home-studio-3d .vespera-canvas { transition: none; }
}
```

Le panneau garde ses dimensions actuelles : le canvas remplit `.home-studio-3d`.
Si `.home-studio-3d` n'a pas de hauteur propre (aspect-ratio / min-height), il faut en garder une,
sinon le canvas fait 0 px.

## 4. Comportement

- Chargement paresseux : rien n'est téléchargé tant que le panneau n'est pas à ~300 px du viewport.
- Tier 1024 (≈0,5 Mo) affiché d'abord, puis montée silencieuse vers 2048 (mobile / GPU limité)
  ou 4096 (ordinateur) quand le navigateur est inactif.
- Pause automatique : panneau hors écran ou onglet masqué. `prefers-reduced-motion` : une seule image fixe.
- Échec WebGL2, chargement ou compilation des shaders → `vespera-poster.webp`.

## 5. Réglages rapides (haut de `studio-orb-3d.js`)

| Constante | Effet |
|---|---|
| `SUN_DIR` | direction du soleil (monde) |
| `SPIN`, `CLOUD_DRIFT` | rotation de la planète, dérive propre des nuages |
| `PARALLAX` | amplitude du mouvement de caméra au curseur |
| `uSunPower` (dans `mountVespera`) | exposition globale |

## 6. Régénérer les textures

```
python scripts/make_vespera_textures.py 4096 assets/vespera/4096
python scripts/make_vespera_textures.py 2048 assets/vespera/2048
python scripts/make_vespera_textures.py 1024 assets/vespera/1024
```
Graine fixe : même planète à chaque exécution. Besoin : Python 3, numpy, scipy, Pillow.
Le 4096 demande ~3 Go de RAM.
