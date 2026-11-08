# VESPERA 2.2 — Balanced material study 004

## Purpose
VESPERA 2.2 is an isolated synthesis study. It does not replace VESPERA 2.0, VESPERA 2.1, or the approved homepage V1 engine.

## Findings from the 2.0 / 2.1 comparison
- The 2.1 texture maps are not lower-resolution. At 2048, the committed color, normal and ORM maps are larger than the 2.0 maps.
- The cloud map is substantially smaller in 2.1 (about 60 KB versus 136 KB for 2.0 at 2048), consistent with its reduced coverage and additional clear windows.
- The 2.1 shader also lowers dense-cloud opacity (0.64 blend value / 0.74 ceiling versus 0.78 / 0.82 in 2.0). This can make the planet feel less materially rich even where the surface maps contain more detail.
- The 2.1 relief generator increases normal-map strength from 3.25 to 3.85 and increases fine height contributions.

These are file-level and code-level observations. Visual approval still requires comparing the generated renders on the same display and camera framing.

## Recalibration results (2026-11-08)
The second cloud-generation pass completed successfully for the 1024, 2048 and 4096 tiers.

- VESPERA 2.0 reference: 10% coverage above 0.35, mean cloud-map value 0.11.
- VESPERA 2.1 reference: 1% coverage above 0.35, mean 0.03.
- VESPERA 2.2 recalibrated: 13% coverage above 0.35, mean 0.13 at all three generated tiers.
- The first 2.2 pass measured 4% coverage and 0.06 mean, so the retune restored substantially more cloud body.

These are generator-level texture statistics, not a direct measurement of visible cloud pixels in the final render. The 2.2 shader keeps dense-cloud opacity below the 2.0 reference, so the final appearance must still be judged in the three-way preview under the same camera and lighting.

## 2.2 synthesis choices
- Keep the 2.1 mineral seam field and multi-scale cirrus layer.
- Blend broad landform weighting between 2.0 and 2.1, and set normal strength to an intermediate 3.55.
- Restore some cloud-body presence without returning fully to 2.0 opacity. The new cloud field uses intermediate deck thresholds and contribution weights.
- Keep the corrected 2.1 view-to-sun direction for atmospheric Mie scattering.
- Keep V2.2 isolated under its own renderer and asset directory: `assets/studio-orb-3d-v2-2.js` and `assets/vespera-v2-2/`.

## Preview and build
- Open `vespera-v2-2-preview.html` for a three-way comparison of V2.0, V2.1 and V2.2.
- `.github/workflows/build-vespera-v2-2.yml` generates the 1024, 2048 and 4096 texture tiers and commits them to the branch that triggered the workflow.
- Development branch: `feature/vespera-2-2-balanced-materials`.

## Release gate
Do not promote V2.2 or replace the homepage renderer until the preview has been reviewed on desktop and mobile, cloud density / relief / atmosphere are visually accepted, console and WebGL output are clean, and performance plus reduced-motion behavior have been checked.
