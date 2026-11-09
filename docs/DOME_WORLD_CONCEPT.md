# DOME WORLD — concept and technical architecture

ORBE & ONIX Studio · Lab / Experiment 004  
Status: concept approved for exploration; no production scene code yet  
Base: Three.js r187, ES modules, same CDN URL as the existing VESPERA module

## 1. Product intent

Create a second, independent 3D experience: a circular world beneath a transparent hemispherical dome, with a Sun and a Moon moving inside it.

The experience deliberately combines two presentations of the same fictional cosmological model:

- **ATLAS / Exploration** — a clear, technical-looking interactive maquette with labels, guides, trajectories, time controls and explanatory callouts.
- **CINEMA / Immersion** — the same geometry and deterministic motion, presented without technical overlays, with restrained lighting, reflections, atmospheric depth and a more expressive camera.

These are two presentation modes, not two different physical models. The underlying geometry, positions and simulation state must remain identical when switching modes.

**Truth-in-presentation rule:** this is an artistic/speculative model, not a scientifically accurate description of Earth, the Sun, the Moon or the real solar system. The interface must label it visibly as a fictional cosmological visualization. Any scales, orbital paths, speeds and lighting are illustrative parameters, not physical measurements.

## 2. Where it belongs in ORBE & ONIX

- Keep VESPERA as its own independent planetary experience.
- Add DOME WORLD as a separate Lab experiment, initially reachable from a dedicated page named **dome-world.html** and a card in **lab.html** only after the scene is validated.
- Do not replace the existing Lab material playground or the homepage VESPERA canvas.
- Do not merge this feature branch into **main** without explicit user approval.

## 3. Visual direction

### Shared scene
- A circular, gently beveled world platform, viewed in three-quarter perspective.
- A translucent upper hemisphere with a readable silhouette, a fine cool edge reflection and subtle optical highlights.
- A warm ivory-gold Sun and a smaller cratered Moon, both clearly enclosed by the dome.
- A restrained graphite / midnight background, cool blue-violet glass, mineral earth tones and controlled warm solar accents.
- The world disk remains the main object; the dome is legible but never becomes an opaque glass bowl.

### ATLAS / Exploration mode
- Persistent small disclosure: “Modèle cosmologique fictif — échelles et mouvements illustratifs”.
- Discreet coordinate rings / radial grid on the disk.
- Toggleable orbit tracks for the Sun and Moon; object labels with leader lines.
- Controls: play/pause, time scrubber, animation speed, show/hide guides, reset view.
- A compact information panel explaining the current illustrative state.
- Camera controls: drag to orbit, wheel to zoom, reset.
- Default camera exposes the disk surface and the dome profile at once.

### CINEMA / Immersion mode
- Same scene state; remove grid, labels, coordinate lines and explanatory panel.
- Keep only a minimal mode switch and persistent fiction disclosure.
- Slower motion, soft camera drift, subtle Fresnel edge on the dome and carefully controlled local halo, not a full-screen post-process.
- No rapid orbit, strobing, heavy volumetrics or visual clutter.

## 4. Scene architecture

Use a dedicated module. Do not add DOME WORLD conditionals to **assets/studio-orb-3d.js**.

Proposed files:
- **dome-world.html** — semantic page shell, accessible controls and canvas host.
- **assets/dome-world.js** — scene bootstrap, lifecycle, camera, renderer, shared simulation state.
- **assets/dome-world.css** — page and control styling, responsive layout.
- **assets/dome-world-poster.webp** — static fallback if WebGL2 or module loading fails.
- **docs/DOME_WORLD_CONCEPT.md** — this design contract.

Suggested scene graph:
- **scene**
  - **worldRoot**
    - **diskBase** — beveled cylinder / circular platform
    - **surface** — circular map and low-relief terrain
    - **gridOverlay** — optional ATLAS guides
    - **sunPath** — optional ATLAS trajectory
    - **moonPath** — optional ATLAS trajectory
    - **sun** — luminous sphere and restrained local halo
    - **moon** — cratered sphere, lit by the same illustrative Sun direction
  - **domeRoot**
    - **domeShell** — upper hemisphere, Fresnel edge and subtle reflection
    - **domeRim** — narrow structural rim / seal at the base
  - **cameraRig**
  - **environment** — background and restrained local lighting

Keep one source of truth for:
- normalized simulation time t;
- Sun position;
- Moon position;
- orbital path parameters;
- animation speed and pause state;
- current presentation mode.

The ATLAS and CINEMA modes must read the same state. Switching modes must never restart or teleport either object.

## 5. Technical approach

- Three.js r187 ES module, same exact CDN import URL already used by VESPERA; no second Three.js copy and no extra dependency.
- Use a dedicated renderer and canvas, initialized lazily when the page approaches the viewport.
- Respect prefers-reduced-motion, page visibility and intersection visibility.
- Use a requestAnimationFrame loop only while visible and motion is enabled; render a still frame otherwise.
- Provide resize handling and a mobile-aware pixel-ratio cap.
- Build the dome with a lightweight custom ShaderMaterial or MeshPhysicalMaterial only after a performance comparison. Prefer a controllable Fresnel/edge treatment over expensive full-scene transmission.
- Use depth testing so the dome and objects visually occlude one another correctly. Ensure the dome does not wash out the world disk.
- Keep the Sun and Moon trajectories deterministic and parameterized. Do not add physically misleading numeric claims.
- The flat world should use a deliberate disk-oriented map projection or a purpose-built stylized cartographic texture; do not stretch a rectangular equirectangular Earth texture across a circular disk.
- Surface relief should be modest and readable at the default camera distance.
- Dispose geometry, material and textures on teardown; do not leak listeners or observers.
- Fallback to a poster with a clear label if WebGL2, shader compilation or required resources fail.

## 6. Performance and accessibility budgets

Initial budgets for the first visual prototype:
- 1 canvas and 1 WebGLRenderer for this page.
- Keep the primary scene around 8–12 draw calls before optional overlays.
- No full-screen post-processing.
- No shadow-casting point lights; use directional lighting and shader accents.
- One low-cost dome shell; no nested glass layers.
- Mobile: reduced segment counts, capped device pixel ratio, simplified dome reflections and optional hidden grid labels.
- Semantic buttons with visible focus, readable contrast, keyboard-operable controls and an accessible canvas description.
- Reduced-motion mode freezes the simulation at a deterministic, composed frame.

## 7. Implementation phases (visual approval after every phase)

1. **Static composition** — disk, dome, rim, Sun and Moon; no animation. Approve silhouette and proportions.
2. **Materials** — earth surface, glass dome, solar body and lunar materials. Approve material separation and legibility.
3. **Motion** — deterministic Sun and Moon paths with play/pause and speed. Approve timing and occlusion.
4. **ATLAS controls** — labels, guide tracks, time scrubber, reset and help notes.
5. **CINEMA mode** — restrained lighting, reflections, camera drift and overlay suppression.
6. **Responsive / reliability** — desktop, mobile, reduced motion, context loss, fallback and disposal tests.
7. **Lab integration** — add a clear experiment card and page link without disturbing existing Lab experiments or VESPERA.

No phase proceeds until its screenshot and behavior are approved.

## 8. Acceptance checklist

- The dome is visibly transparent and its edge remains readable against both bright and dark backgrounds.
- Sun and Moon remain visibly inside the dome; the dome and world occlude objects correctly.
- The disk reads as a designed world surface, not a flat circle with an unrelated texture pasted on it.
- ATLAS is understandable and operable without reading source code.
- CINEMA feels premium and calm, with no control clutter.
- Mode switching preserves the same scene state.
- Fictional / illustrative status is clear in both modes.
- VESPERA and current site sections are unchanged.
- No regressions on mobile or reduced-motion settings.
- The user can later change labels, colors, orbit speed and camera reset from documented configuration values without rewriting the scene.

## 9. First lesson to accompany implementation

Explain the difference between:
- **Geometry** — the actual 3D shape (disk, dome, spheres).
- **Material** — how a surface responds to light (matte earth, glass, emissive Sun).
- **Scene graph** — the parent/child structure that makes objects move together.
- **Simulation state** — the values that describe positions and motion at time t.
- **Presentation mode** — a visual layer that changes guides and atmosphere but not the underlying simulation.
