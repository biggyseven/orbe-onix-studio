# VESPERA 2.0 — Planetary Study 002

## Intention
VESPERA 2.0 is the second material and lighting exploration for the proprietary ORBE & ONIX 3D engine. The approved VESPERA 1.0 homepage rendering remains untouched while the new version is reviewed.

Art direction combines cinematic realism in lighting, atmosphere and material response; alien geology with coherent tectonic provinces, mineral shelves, impact basins and erosion; and a restrained luxury palette of graphite, indigo, violet, lavender and ivory.

## Technical structure
- Three.js r187, loaded as an ES module.
- assets/studio-orb-3d-v2.js: separate V2 runtime. It mounts only .vespera-v2-3d.
- scripts/make_vespera_v2_textures.py: deterministic offline texture generator. Terrain and cloud fields are sampled as 3D noise on a unit sphere to avoid UV seam and pole artifacts.
- assets/vespera-v2/{1024,2048,4096}/: color, normal, ORM and cloud maps.
- assets/vespera-v2/vespera-poster.webp: static fallback.
- vespera-v2-preview.html: A/B comparison between the approved baseline and V2.

## Rendering improvements
- More physically coherent surface specular response using a GGX microfacet BRDF.
- Geological color determined by coherent mineral provinces and elevation, rather than random color noise.
- Multi-scale relief and erosion detail.
- Fragmented convective cloud fields, curved fronts and wisps.
- Independent cloud shell with self-shadowing, edge scatter and directional lighting.
- A more restrained atmospheric shell.

## Texture generation
The GitHub Actions workflow "Build VESPERA 2.0 textures" restores the compressed generator source, installs Python dependencies, creates the 1024, 2048 and 4096 tiers, removes intermediate height arrays, validates dimensions, and commits the final assets.

The Pages workflow deploys again after the texture-generation workflow succeeds.

## Validation and release rule
VESPERA 2.0 is exploratory until visually approved. Do not replace the homepage V1 engine or its texture resources until the comparison page has been reviewed on desktop and mobile, clouds/surface/contrast/atmosphere have been visually accepted, and performance and reduced-motion behavior have been checked.

The V1 homepage remains the rollback-safe reference.
