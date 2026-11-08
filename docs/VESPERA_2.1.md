# VESPERA 2.1 — Planetary refinement 003

## Intent
A controlled refinement of the approved VESPERA 2.0 base. V2.0 remains available as the comparison reference; the homepage still uses V1 until a separate approval.

## Art direction
Combine cinematic planetary lighting, alien tectonic geology, and ORBE & ONIX's restrained graphite/indigo/violet/lavender/ivory palette.

## What changes in 2.1
- More readable tectonic uplifts and mountain belts.
- Increased multi-scale relief and erosion detail, without adding a melted silhouette.
- Sparse mineral filaments embedded in raised strata.
- Lower dense cloud coverage, larger clear windows, and an additional sparse high-altitude cirrus field.
- More translucent dense decks and subtle cloud-edge scatter.
- Correct view-to-sun direction for the Mie forward-scattering lobe.
- Distinct day, twilight, and night atmospheric colour contributions.

## Files
- `assets/studio-orb-3d-v2-1.js`: isolated V2.1 runtime.
- `scripts/make_vespera_v2_1_textures.py`: deterministic 3D-sphere procedural texture generator.
- `assets/vespera-v2-1/{1024,2048,4096}/`: color, normal, ORM and cloud textures.
- `vespera-v2-1-preview.html`: direct comparison between V2.0 and V2.1.

## Validation gate
V2.1 does not replace V2.0 or V1. Review the page at desktop and mobile widths, inspect console/WebGL status, and compare relief, cloud coverage, terminator and atmosphere before promoting it.
