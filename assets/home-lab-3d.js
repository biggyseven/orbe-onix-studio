// ORBE & ONIX — simple rotating 3D sphere for Open Experiments.
(() => {
  const host = document.querySelector("[data-home-lab-3d]");
  const canvas = host?.querySelector(".home-lab-3d-canvas");
  if (!host || !canvas) return;

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer = null;
  let scene = null;
  let camera = null;
  let sphere = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let frameId = 0;
  let previousTime = 0;
  let visible = false;
  let disposed = false;

  const fallback = () => {
    host.classList.remove("is-ready");
    host.classList.add("is-fallback");
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };

  const resize = () => {
    if (!renderer || !camera || disposed) return;
    const { width, height } = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 520 ? 4.35 : 4.05;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const draw = time => {
    frameId = 0;
    if (disposed || !renderer || document.hidden) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;

    if (!reducedMotion.matches && sphere) {
      sphere.rotation.y += delta * 0.23;
    }
    renderer.render(scene, camera);
    host.classList.add("is-ready");
    host.classList.remove("is-fallback");

    if (!reducedMotion.matches && visible) {
      frameId = requestAnimationFrame(draw);
    }
  };

  const schedule = () => {
    if (disposed || !renderer || document.hidden) return;
    if (reducedMotion.matches) {
      renderer.render(scene, camera);
      host.classList.add("is-ready");
      host.classList.remove("is-fallback");
      return;
    }
    if (visible && !frameId) {
      previousTime = 0;
      frameId = requestAnimationFrame(draw);
    }
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    renderer?.dispose();
    renderer = null;
  };

  const onVisibilityChange = () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      schedule();
    }
  };

  const start = async () => {
    try {
      const THREE = await import(THREE_URL);
      if (disposed || !canvas.isConnected) return;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.set(0, 0, 4.05);

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

      scene.add(new THREE.HemisphereLight(0xe8e2ff, 0x17131e, 1.8));

      const key = new THREE.DirectionalLight(0xffffff, 3.1);
      key.position.set(-3.2, 4.2, 4.5);
      scene.add(key);

      const fill = new THREE.PointLight(0xb6a4f4, 22, 8, 2);
      fill.position.set(3, -1.3, 2.8);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xe6e0ff, 1.6);
      rim.position.set(0.5, 2.5, -3.5);
      scene.add(rim);

      const geometry = new THREE.SphereGeometry(1.12, 64, 48);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xa99ade,
        metalness: 0.18,
        roughness: 0.27,
        clearcoat: 0.72,
        clearcoatRoughness: 0.2
      });
      sphere = new THREE.Mesh(geometry, material);
      sphere.rotation.set(-0.12, 0.2, 0.06);
      scene.add(sphere);

      resize();
      resizeObserver = "ResizeObserver" in window
        ? new ResizeObserver(resize)
        : null;
      resizeObserver?.observe(host);
      if (!resizeObserver) window.addEventListener("resize", resize, { passive: true });

      if ("IntersectionObserver" in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          if (visible) schedule();
          else if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
          }
        }, { rootMargin: "100px 0px", threshold: 0.01 });
        intersectionObserver.observe(host);
      } else {
        visible = true;
      }

      document.addEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.addEventListener?.("change", schedule);
      canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        fallback();
      }, { once: true });

      renderer.render(scene, camera);
      if (!intersectionObserver) schedule();
    } catch (error) {
      console.warn("ORBE & ONIX 3D sphere unavailable; using the CSS sphere.", error);
      fallback();
    }
  };

  window.addEventListener("pagehide", dispose, { once: true });
  start();
})();