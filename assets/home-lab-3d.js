// ORBE & ONIX — dedicated Three.js artwork for the homepage Open Experiments feature.
// Reuses the Lab's physical chrome / glass material language without mounting its full interactive engine twice.
(() => {
  const host = document.querySelector("[data-home-lab-3d]");
  if (!host) return;

  const canvas = host.querySelector("canvas");
  if (!canvas) return;

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resources = [];
  let renderer = null;
  let resizeObserver = null;
  let animationFrame = 0;
  let disposed = false;
  let visible = true;
  let ready = false;
  let scene;
  let camera;
  let rig;
  let previousTime = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  const markFallback = () => {
    host.classList.remove("is-ready");
    host.classList.add("is-fallback");
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };

  const track = resource => {
    resources.push(resource);
    return resource;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    resources.forEach(resource => resource?.dispose?.());
    resources.length = 0;
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };

  const makeEnvironment = THREE => {
    const image = document.createElement("canvas");
    image.width = 1536;
    image.height = 768;
    const context = image.getContext("2d");
    if (!context) throw new Error("Canvas 2D environment is unavailable.");

    const base = context.createLinearGradient(0, 0, 1536, 768);
    base.addColorStop(0, "#2b2638");
    base.addColorStop(.27, "#aaa0c7");
    base.addColorStop(.47, "#17151e");
    base.addColorStop(.7, "#777187");
    base.addColorStop(1, "#17141d");
    context.fillStyle = base;
    context.fillRect(0, 0, 1536, 768);

    const softboxes = [
      { x: 80, y: 15, w: 165, h: 680, color: "#ffffff", alpha: .58 },
      { x: 390, y: 35, w: 120, h: 510, color: "#d8ccff", alpha: .44 },
      { x: 720, y: 0, w: 210, h: 620, color: "#ffffff", alpha: .48 },
      { x: 1120, y: 25, w: 150, h: 690, color: "#d4c5ff", alpha: .42 },
      { x: 1390, y: 10, w: 58, h: 650, color: "#ffffff", alpha: .34 }
    ];
    softboxes.forEach(({ x, y, w, h, color, alpha }) => {
      const gradient = context.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.22, color);
      gradient.addColorStop(.78, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.globalAlpha = alpha;
      context.fillStyle = gradient;
      context.fillRect(x, y, w, h);
    });
    context.globalAlpha = 1;

    const overhead = context.createRadialGradient(780, 70, 12, 780, 70, 470);
    overhead.addColorStop(0, "rgba(255,255,255,.38)");
    overhead.addColorStop(.34, "rgba(220,208,255,.17)");
    overhead.addColorStop(1, "rgba(220,208,255,0)");
    context.fillStyle = overhead;
    context.fillRect(270, 0, 1050, 560);

    const texture = track(new THREE.CanvasTexture(image));
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  // A broad, softly cambered shell swept along a curve. Unlike a tube,
  // the surface has a readable front face, folded edges and a changing width.
  // A thick, cambered shell with a controlled ridge through its face.
  // The relief gives the material a folded, formed-metal / optical-glass reading.
  const makeFoldedRibbonGeometry = (THREE, coordinates, width, options = {}) => {
    const segments = options.segments || 192;
    const across = options.across || 32;
    const twist = options.twist ?? 0;
    const thickness = options.thickness ?? .05;
    const camber = options.camber ?? .12;
    const taper = options.taper ?? .62;
    const fold = options.fold ?? .08;
    const phase = options.phase ?? 0;
    const curve = new THREE.CatmullRomCurve3(
      coordinates.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      "centripetal",
      .42
    );
    const frames = curve.computeFrenetFrames(segments, false);
    const front = [];
    const back = [];
    const uvs = [];
    const indices = [];
    const rows = segments + 1;
    const columns = across + 1;

    for (let i = 0; i < rows; i += 1) {
      const u = i / segments;
      const tangent = frames.tangents[i];
      const side = frames.normals[i].clone().applyAxisAngle(
        tangent,
        twist * Math.sin(Math.PI * 2 * u + phase)
      ).normalize();
      const depth = tangent.clone().cross(side).normalize();
      const center = curve.getPointAt(u);
      const endTaper = Math.pow(Math.max(0, Math.sin(Math.PI * u)), taper);
      const widthPulse = 1 + .055 * Math.sin(Math.PI * 2 * u + phase);

      for (let j = 0; j < columns; j += 1) {
        const v = j / across;
        const acrossValue = v * 2 - 1;
        const centerRidge = fold * Math.pow(Math.max(0, 1 - Math.abs(acrossValue)), 2);
        const edgeRoll = .018 * Math.pow(Math.abs(acrossValue), 3);
        const point = center.clone().addScaledVector(
          side,
          acrossValue * width * endTaper * widthPulse
        );
        const relief = (
          camber * (1 - acrossValue * acrossValue) + centerRidge - edgeRoll
        ) * Math.sin(Math.PI * u);
        point.addScaledVector(depth, relief);
        const frontPoint = point.clone().addScaledVector(depth, thickness * .5);
        const backPoint = point.clone().addScaledVector(depth, -thickness * .5);
        front.push(frontPoint.x, frontPoint.y, frontPoint.z);
        back.push(backPoint.x, backPoint.y, backPoint.z);
        uvs.push(v, u);
      }
    }

    const vertexCount = rows * columns;
    const positions = [...front, ...back];
    const offset = vertexCount;
    for (let i = 0; i < segments; i += 1) {
      for (let j = 0; j < across; j += 1) {
        const a = i * columns + j;
        const b = (i + 1) * columns + j;
        const c = b + 1;
        const d = a + 1;
        indices.push(a, b, d, b, c, d);
        indices.push(offset + a, offset + d, offset + b, offset + b, offset + d, offset + c);
      }
      for (const j of [0, across]) {
        const a = i * columns + j;
        const b = (i + 1) * columns + j;
        indices.push(a, offset + a, b, b, offset + a, offset + b);
      }
    }
    for (let j = 0; j < across; j += 1) {
      const a = j;
      const b = j + 1;
      indices.push(a, b, offset + a, b, offset + b, offset + a);
      const end = segments * columns + j;
      indices.push(end, offset + end, end + 1, end + 1, offset + end, offset + end + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute([...uvs, ...uvs], 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  };

  const buildScene = THREE => {
    scene = new THREE.Scene();
    scene.environment = makeEnvironment(THREE);

    camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
    camera.position.set(0, 0, 5.15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.15 : 1.45));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.HemisphereLight(0xded5ff, 0x17131e, 1.35));

    const key = new THREE.DirectionalLight(0xffffff, 3.7);
    key.position.set(-3.5, 4.5, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc4a9ff, 2.0);
    fill.position.set(4, 1, 3);
    scene.add(fill);

    const strip = new THREE.DirectionalLight(0xffffff, 2.2);
    strip.position.set(1.5, -3.5, 4.5);
    scene.add(strip);

    const rim = new THREE.DirectionalLight(0xf6f1ff, 3.5);
    rim.position.set(0, 2, -4);
    scene.add(rim);

    const accent = new THREE.PointLight(0x9ee9ef, 3.2, 8, 2);
    accent.position.set(2.2, -2.2, 2.6);
    scene.add(accent);

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 192;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(128, 96, 6, 128, 96, 94);
      gradient.addColorStop(0, "rgba(5,4,10,.42)");
      gradient.addColorStop(.48, "rgba(8,6,14,.17)");
      gradient.addColorStop(1, "rgba(12,9,20,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 256, 192);
      const shadowTexture = track(new THREE.CanvasTexture(shadowCanvas));
      const shadowGeometry = track(new THREE.PlaneGeometry(3.8, 2.4));
      const shadowMaterial = track(new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: .65,
        depthWrite: false,
        toneMapped: false
      }));
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.position.set(0, -.12, -1.1);
      scene.add(shadow);
    }

    rig = new THREE.Group();
    scene.add(rig);

    const sculpture = new THREE.Group();
    sculpture.rotation.set(-.12, .08, -.08);
    rig.add(sculpture);

    const chrome = track(new THREE.MeshPhysicalMaterial({
      color: 0xe2dfeb,
      metalness: 1,
      roughness: .105,
      clearcoat: 1,
      clearcoatRoughness: .025,
      iridescence: .055,
      iridescenceIOR: 1.3,
      iridescenceThicknessMinimum: 300,
      iridescenceThicknessMaximum: 440,
      envMapIntensity: 2.2
    }));

    const glass = track(new THREE.MeshPhysicalMaterial({
      color: 0xa995ec,
      metalness: .045,
      roughness: .065,
      transmission: .76,
      thickness: .82,
      ior: 1.49,
      clearcoat: 1,
      clearcoatRoughness: .035,
      attenuationColor: new THREE.Color(0xa58be8),
      attenuationDistance: .9,
      iridescence: .14,
      iridescenceIOR: 1.32,
      iridescenceThicknessMinimum: 175,
      iridescenceThicknessMaximum: 470,
      sheen: .09,
      sheenColor: new THREE.Color(0xb8a8f0),
      sheenRoughness: .35,
      envMapIntensity: 1.9
    }));

    const pearlMaterial = track(new THREE.MeshPhysicalMaterial({
      color: 0xe8e0ff,
      metalness: .2,
      roughness: .15,
      clearcoat: 1,
      clearcoatRoughness: .055,
      iridescence: .12,
      iridescenceIOR: 1.3,
      iridescenceThicknessMinimum: 210,
      iridescenceThicknessMaximum: 440,
      sheen: .07,
      sheenColor: new THREE.Color(0xcfc5ff),
      sheenRoughness: .4,
      emissive: 0x39245e,
      emissiveIntensity: .18,
      envMapIntensity: 1.75
    }));

    const silver = track(new THREE.MeshPhysicalMaterial({
      color: 0xf0edf6,
      metalness: .98,
      roughness: .085,
      clearcoat: 1,
      clearcoatRoughness: .025,
      envMapIntensity: 2.25
    }));

    // SCULPTURE 004 — THE RIFT
    // Two thick opposing shells form one silhouette around a deliberate aperture.
    // A broad chrome seam follows the front fold; a faceted crystal sits in the void.
    const glassPetalMaterial = glass.clone();
    glassPetalMaterial.color.setHex(0x9b8bd3);
    glassPetalMaterial.transmission = .78;
    glassPetalMaterial.roughness = .068;
    glassPetalMaterial.thickness = 1.18;
    glassPetalMaterial.side = THREE.DoubleSide;
    track(glassPetalMaterial);

    const pearlPetalMaterial = pearlMaterial.clone();
    pearlPetalMaterial.color.setHex(0xd1d8e4);
    pearlPetalMaterial.metalness = .28;
    pearlPetalMaterial.roughness = .22;
    pearlPetalMaterial.transmission = .12;
    pearlPetalMaterial.side = THREE.DoubleSide;
    track(pearlPetalMaterial);

    // Front shell: the lower left sweep turns toward the upper centre.
    const mainPetalGeometry = track(makeFoldedRibbonGeometry(THREE, [
      [-.78, -1.02, .12],
      [-.82, -.54, .2],
      [-.43, -.04, .27],
      [.12, .28, .12],
      [.61, .68, -.08],
      [.4, 1.08, -.24]
    ], .72, {
      twist: .94, thickness: .082, camber: .19, taper: .55,
      fold: .105, phase: .22
    }));
    const mainPetal = new THREE.Mesh(mainPetalGeometry, glassPetalMaterial);
    mainPetal.rotation.set(.035, -.16, -.075);
    sculpture.add(mainPetal);

    // Rear shell turns in the opposite direction and frames the central opening.
    const rearPetalGeometry = track(makeFoldedRibbonGeometry(THREE, [
      [.78, -.9, -.38],
      [.53, -.48, -.25],
      [.08, -.08, -.1],
      [-.36, .3, .1],
      [-.16, .74, .28],
      [.5, 1.03, .2]
    ], .49, {
      twist: -.88, thickness: .068, camber: .145, taper: .59,
      fold: .075, phase: -.3
    }));
    const rearPetal = new THREE.Mesh(rearPetalGeometry, pearlPetalMaterial);
    rearPetal.rotation.set(-.075, .2, .105);
    sculpture.add(rearPetal);

    // A wide chrome inlay follows the front fold as a structural seam.
    const chromeBladeGeometry = track(makeFoldedRibbonGeometry(THREE, [
      [-.92, -.94, .43],
      [-.61, -.53, .49],
      [-.2, -.12, .43],
      [.28, .2, .29],
      [.69, .59, .08],
      [.94, .91, -.06]
    ], .145, {
      twist: .28, thickness: .06, camber: .04, taper: .78,
      fold: .018, phase: .12
    }));
    const chromeBlade = new THREE.Mesh(chromeBladeGeometry, silver);
    sculpture.add(chromeBlade);

    // One crisp crystal is seated in the negative space, not floating around it.
    const coreGeometry = track(new THREE.OctahedronGeometry(.255, 0));
    const coreMaterial = track(new THREE.MeshPhysicalMaterial({
      color: 0xe5f4f4,
      metalness: .34,
      roughness: .105,
      clearcoat: 1,
      clearcoatRoughness: .02,
      iridescence: .24,
      iridescenceIOR: 1.32,
      iridescenceThicknessMinimum: 190,
      iridescenceThicknessMaximum: 540,
      emissive: 0x29465a,
      emissiveIntensity: .13,
      envMapIntensity: 2.1
    }));
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(.035, -.015, .54);
    core.scale.set(.76, 1.22, .72);
    core.rotation.set(.16, .42, -.22);
    sculpture.add(core);
    return { sculpture };
  };

  const resize = () => {
    if (!renderer || !camera || disposed) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 520 ? 5.55 : 5.15;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const renderFrame = time => {
    animationFrame = 0;
    if (disposed || !renderer || !visible || document.hidden) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time;

    pointer.x += (pointer.targetX - pointer.x) * .045;
    pointer.y += (pointer.targetY - pointer.y) * .045;
    if (!reducedMotion && rig) {
      rig.rotation.y += delta * .026;
      rig.rotation.x = -.035 + Math.sin(time * .00024) * .022 + pointer.y * .04;
      rig.rotation.z = pointer.x * -.025;
    }

    renderer.render(scene, camera);
    if (!ready && renderer.info.render.calls > 0) {
      ready = true;
      host.classList.add("is-ready");
      host.classList.remove("is-fallback");
    }
    if (!reducedMotion) animationFrame = requestAnimationFrame(renderFrame);
  };

  const schedule = () => {
    if (!reducedMotion && !animationFrame && visible && !document.hidden && !disposed) {
      animationFrame = requestAnimationFrame(renderFrame);
    } else if (reducedMotion && renderer && !disposed) {
      renderer.render(scene, camera);
      if (!ready && renderer.info.render.calls > 0) {
        ready = true;
        host.classList.add("is-ready");
        host.classList.remove("is-fallback");
      }
    }
  };

  const start = async () => {
    try {
      const THREE = await import(THREE_URL);
      if (disposed || !canvas.isConnected) return;
      buildScene(THREE);
      resize();

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          visible = Boolean(entries[0]?.isIntersecting);
          if (visible) {
            previousTime = 0;
            schedule();
          } else if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
          }
        }, { rootMargin: "120px 0px" });
        observer.observe(host);
        resources.push({ dispose: () => observer.disconnect() });
      }

      host.addEventListener("pointermove", event => {
        if (reducedMotion) return;
        const bounds = host.getBoundingClientRect();
        pointer.targetX = (event.clientX - bounds.left) / Math.max(1, bounds.width) - .5;
        pointer.targetY = (event.clientY - bounds.top) / Math.max(1, bounds.height) - .5;
      }, { passive: true });
      host.addEventListener("pointerleave", () => {
        pointer.targetX = 0;
        pointer.targetY = 0;
      }, { passive: true });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        } else if (!document.hidden) {
          previousTime = 0;
          schedule();
        }
      });
      canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        markFallback();
      }, false);

      schedule();
    } catch (error) {
      console.warn("ORBE & ONIX homepage Lab 3D unavailable; keeping the CSS artwork.", error);
      markFallback();
    }
  };

  window.addEventListener("pagehide", dispose, { once: true });
  start();
})();
