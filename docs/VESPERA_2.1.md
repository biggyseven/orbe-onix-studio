# VESPERA 2.1 — Planetary refinement 003

## Intent
A controlled refinement of the VESPERA 2.0 reference. V2.0 remains available for comparison. VESPERA 2.1 is an isolated study and does not replace the homepage engine until a separate approval.

## Art direction
Combine cinematic planetary lighting, alien tectonic geology and ORBE & ONIX's restrained graphite, indigo, violet, lavender and ivory palette. The Moon is a visual companion to the planet, not a scale-accurate astronomical model.

## What changes in 2.1
- More readable tectonic uplifts and mountain belts.
- Increased multi-scale relief and erosion detail, without adding a melted silhouette.
- Sparse mineral filaments embedded in raised strata.
- Lower dense cloud coverage, larger clear windows and an additional sparse high-altitude cirrus field.
- More translucent dense decks and subtle cloud-edge scatter.
- Correct view-to-sun direction for the Mie forward-scattering lobe.
- Distinct day, twilight and night atmospheric colour contributions.
- A restrained cyan ozone-rich band at the atmospheric limb.
- A NASA-derived lunar colour map and elevation-derived normal map.
- A slightly inclined, low-eccentricity lunar orbit with a subtle guide curve.
- Synchronous lunar orientation, solar phases and restrained VESPERA-reflected light on the lunar night side.

## Files
- `assets/studio-orb-3d-v2-1.js`: isolated V2.1 runtime, atmosphere and lunar shaders.
- `scripts/make_vespera_v2_1_textures.py`: deterministic 3D-sphere procedural texture generator.
- `assets/vespera-v2-1/{1024,2048,4096}/`: colour, normal, ORM and cloud textures.
- `assets/moon-nasa/2048/{color,normal}.webp`: processed NASA-derived lunar maps.
- `scripts/prepare_moon_nasa.py`: preparation script for the lunar maps.
- `vespera-v2-1-preview.html`: direct comparison between V2.0 and V2.1.

## Validation gate
V2.1 does not replace V2.0 or V1. Review the preview at desktop and mobile widths, inspect console/WebGL status, confirm both lunar maps load, and compare relief, cloud coverage, terminator, ozone band and lunar phases before promoting it.
