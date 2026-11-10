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
  let orbitGroup;
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

  const makeOpenCurve = (THREE, coordinates) => new THREE.CatmullRomCurve3(
    coordinates.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "centripetal",
    .42
  );

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

    // FORM STUDY 002: a faceted glass monolith, not another interlocking loop.
    const prismGeometry = track(new THREE.CylinderGeometry(.13, .66, 1.72, 5, 1, false));
    const prism = new THREE.Mesh(prismGeometry, glass);
    prism.position.set(-.02, .02, -.04);
    prism.rotation.set(.12, .42, -.16);
    prism.scale.set(.82, 1.08, .74);
    sculpture.add(prism);

    // Fine metallic edges make the crystal's cut planes legible in studio light.
    const edgeGeometry = track(new THREE.EdgesGeometry(prismGeometry, 8));
    const edgeMaterial = track(new THREE.LineBasicMaterial({
      color: 0xf1edff,
      transparent: true,
      opacity: .48
    }));
    const prismEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    prismEdges.position.copy(prism.position);
    prismEdges.rotation.copy(prism.rotation);
    prismEdges.scale.copy(prism.scale);
    sculpture.add(prismEdges);

    // Two open, swept chrome blades cross the monolith at different depths.
    const bladeCurveA = makeOpenCurve(THREE, [
      [-1.05, -.94, .42], [-.78, -.42, .72], [-.42, .08, .55],
      [-.08, .56, .18], [.42, .98, -.12], [.88, 1.06, -.26]
    ]);
    const bladeA = new THREE.Mesh(
      track(new THREE.TubeGeometry(bladeCurveA, 220, .052, 18, false)),
      chrome
    );
    bladeA.rotation.z = -.06;
    sculpture.add(bladeA);

    const bladeCurveB = makeOpenCurve(THREE, [
      [1.02, -.84, -.38], [.75, -.45, -.62], [.32, -.06, -.68],
      [-.1, .32, -.52], [-.48, .72, -.12], [-.68, 1.08, .2]
    ]);
    const bladeB = new THREE.Mesh(
      track(new THREE.TubeGeometry(bladeCurveB, 220, .035, 16, false)),
      silver
    );
    sculpture.add(bladeB);

    // A smaller luminous crystal sits inside the glass body, offset from its axis.
    const innerGeometry = track(new THREE.OctahedronGeometry(.29, 0));
    const innerMaterial = track(new THREE.MeshPhysicalMaterial({
      color: 0xe8fbff,
      metalness: .34,
      roughness: .12,
      clearcoat: 1,
      clearcoatRoughness: .025,
      iridescence: .22,
      iridescenceIOR: 1.32,
      iridescenceThicknessMinimum: 190,
      iridescenceThicknessMaximum: 520,
      emissive: 0x244c5a,
      emissiveIntensity: .18,
      envMapIntensity: 2
    }));
    const innerCrystal = new THREE.Mesh(innerGeometry, innerMaterial);
    innerCrystal.position.set(.12, -.04, .36);
    innerCrystal.rotation.set(.28, .3, -.2);
    sculpture.add(innerCrystal);

    // Detached facets create a little depth around the main vertical form.
    orbitGroup = new THREE.Group();
    scene.add(orbitGroup);
    const fragmentGeometry = track(new THREE.TetrahedronGeometry(.16, 0));
    const fragmentGeometrySmall = track(new THREE.OctahedronGeometry(.105, 0));
    const fragments = [
      { geometry: fragmentGeometry, material: pearlMaterial, position: [1.05, .58, .18], rotation: [.3, .1, -.25], speed: .22 },
      { geometry: fragmentGeometrySmall, material: chrome, position: [-.98, -.58, .28], rotation: [.2, -.4, .15], speed: -.3 },
      { geometry: fragmentGeometry, material: glass, position: [.82, -.82, -.3], rotation: [-.3, .2, .4], speed: .17 }
    ];
    fragments.forEach(fragment => {
      const mesh = new THREE.Mesh(fragment.geometry, fragment.material);
      mesh.position.set(...fragment.position);
      mesh.rotation.set(...fragment.rotation);
      mesh.userData.spin = fragment.speed;
      orbitGroup.add(mesh);
    });

    const glint = new THREE.Mesh(
      track(new THREE.SphereGeometry(.035, 20, 16)),
      track(new THREE.MeshBasicMaterial({ color: 0xa6f3f8, toneMapped: false }))
    );
    glint.position.set(1.12, .12, .28);
    orbitGroup.add(glint);

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
    if (!reducedMotion && rig && orbitGroup) {
      rig.rotation.y += delta * .085;
      rig.rotation.x = -.035 + Math.sin(time * .00031) * .045 + pointer.y * .075;
      rig.rotation.y += pointer.x * .0018;
      orbitGroup.rotation.z += delta * -.018;
      orbitGroup.rotation.y = Math.sin(time * .00018) * .07;
      orbitGroup.children.forEach(fragment => {
        if (fragment.userData.spin) {
          fragment.rotation.x += delta * fragment.userData.spin;
          fragment.rotation.y += delta * fragment.userData.spin * .72;
        }
      });
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
