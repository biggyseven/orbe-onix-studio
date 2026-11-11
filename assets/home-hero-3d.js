// ORBE & ONIX — dedicated faceted crystal for the homepage hero.
(() => {
  const host = document.querySelector("[data-home-hero-3d]");
  const canvas = host?.querySelector("canvas");
  if (!host || !canvas) return;

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer = null;
  let scene = null;
  let camera = null;
  let crystal = null;
  let environment = null;
  let geometry = null;
  let material = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let frameId = 0;
  let previousTime = 0;
  let visible = true;
  let disposed = false;

  const stop = () => {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const fallback = () => {
    stop();
    host.classList.remove("is-ready");
    host.classList.add("is-fallback");
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    renderer?.dispose();
    renderer = null;
  };

  const resize = () => {
    if (!renderer || !camera || disposed) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 520 ? 4.85 : 4.45;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const render = time => {
    frameId = 0;
    if (disposed || !renderer || document.hidden || !visible) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time;

    if (!reducedMotion.matches && crystal) {
      crystal.rotation.y += delta * .19;
      crystal.rotation.x += delta * .035;
    }

    renderer.render(scene, camera);
    host.classList.add("is-ready");
    host.classList.remove("is-fallback");
    if (!reducedMotion.matches) frameId = requestAnimationFrame(render);
  };

  const schedule = () => {
    if (disposed || !renderer || document.hidden || !visible) return;
    if (reducedMotion.matches) {
      renderer.render(scene, camera);
      host.classList.add("is-ready");
      host.classList.remove("is-fallback");
      return;
    }
    if (!frameId) {
      previousTime = 0;
      frameId = requestAnimationFrame(render);
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else schedule();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    geometry?.dispose();
    material?.dispose();
    environment?.dispose();
    renderer?.dispose();
    renderer = null;
  };

  const makeEnvironment = () => {
    const image = document.createElement("canvas");
    image.width = 1024;
    image.height = 512;
    const context = image.getContext("2d");
    if (!context) throw new Error("Canvas 2D environment is unavailable.");

    const base = context.createLinearGradient(0, 0, 1024, 512);
    base.addColorStop(0, "#211d2b");
    base.addColorStop(.28, "#887d9f");
    base.addColorStop(.5, "#17151e");
    base.addColorStop(.74, "#aaa0bd");
    base.addColorStop(1, "#17151e");
    context.fillStyle = base;
    context.fillRect(0, 0, 1024, 512);

    const panels = [
      { x: 90, width: 115, alpha: .62, color: "#fff" },
      { x: 345, width: 72, alpha: .44, color: "#d9cdff" },
      { x: 620, width: 145, alpha: .56, color: "#fff" },
      { x: 875, width: 54, alpha: .38, color: "#e3d8ff" }
    ];
    panels.forEach(panel => {
      const gradient = context.createLinearGradient(panel.x, 0, panel.x + panel.width, 512);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.28, panel.color);
      gradient.addColorStop(.78, panel.color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.globalAlpha = panel.alpha;
      context.fillStyle = gradient;
      context.fillRect(panel.x, 0, panel.width, 512);
    });
    context.globalAlpha = 1;

    const overhead = context.createRadialGradient(510, 45, 10, 510, 45, 330);
    overhead.addColorStop(0, "rgba(255,255,255,.32)");
    overhead.addColorStop(.4, "rgba(220,208,255,.13)");
    overhead.addColorStop(1, "rgba(220,208,255,0)");
    context.fillStyle = overhead;
    context.fillRect(180, 0, 700, 430);

    const texture = new THREE.CanvasTexture(image);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  const start = async () => {
    try {
      const THREE = await import(THREE_URL);
      if (disposed || !canvas.isConnected) return;

      scene = new THREE.Scene();
      environment = makeEnvironment();
      scene.environment = environment;

      camera = new THREE.PerspectiveCamera(34, 1, .1, 24);
      camera.position.set(0, 0, 4.45);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xe8e2ff, 0x17131e, 1.55));

      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(-3.2, 4.1, 4.5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xb9a7f2, 1.65);
      fill.position.set(3.4, .2, 2.4);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xf2edff, 2.45);
      rim.position.set(.2, 2.8, -3.7);
      scene.add(rim);

      geometry = new THREE.IcosahedronGeometry(1.08, 0);
      material = new THREE.MeshPhysicalMaterial({
        color: 0xb9a9e8,
        metalness: .38,
        roughness: .2,
        clearcoat: 1,
        clearcoatRoughness: .07,
        iridescence: .12,
        iridescenceIOR: 1.3,
        iridescenceThicknessMinimum: 210,
        iridescenceThicknessMaximum: 470,
        envMapIntensity: 1.55,
        flatShading: true
      });
      crystal = new THREE.Mesh(geometry, material);
      crystal.rotation.set(.16, .28, -.08);
      scene.add(crystal);

      resize();
      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }

      if ("IntersectionObserver" in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          if (visible) schedule();
          else stop();
        }, { rootMargin: "120px 0px", threshold: .01 });
        intersectionObserver.observe(host);
      }

      document.addEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.addEventListener?.("change", schedule);
      canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        fallback();
      }, { once: true });

      if (!intersectionObserver) schedule();
      else if (reducedMotion.matches) schedule();
    } catch (error) {
      console.warn("ORBE & ONIX homepage crystal unavailable; keeping the CSS fallback.", error);
      fallback();
    }
  };

  window.addEventListener("pagehide", dispose, { once: true });
  start();
})();