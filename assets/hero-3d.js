// ORBE & ONIX — procedural 3D hero sculpture, rendered with Three.js.
(() => {
  const host = document.querySelector("[data-hero-3d]");
  if (!host) return;

  const canvas = host.querySelector("canvas");
  const stage = host.closest(".hero-v07-stage");
  if (!canvas || !stage) return;

  const CDN = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let renderer;
  let resizeObserver;
  let animationFrame = 0;
  let visible = true;
  let disposed = false;
  let scene;
  let camera;
  let sculpture;
  let chromeRing;
  let glassRing;
  let pearl;
  let orbit;
  let envTexture;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const resources = [];

  const fallback = () => {
    host.classList.remove("is-ready");
    host.classList.add("is-fallback");
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const makeEnvironment = THREE => {
    const envCanvas = document.createElement("canvas");
    envCanvas.width = 2048;
    envCanvas.height = 1024;
    const ctx = envCanvas.getContext("2d");
    const base = ctx.createLinearGradient(0, 0, 2048, 1024);
    base.addColorStop(0, "#2b2638");
    base.addColorStop(.28, "#aaa0c7");
    base.addColorStop(.46, "#17151e");
    base.addColorStop(.67, "#777187");
    base.addColorStop(1, "#17141d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 2048, 1024);

    const lights = [
      [160, 0, 170, 1024, "#fff", .78],
      [540, 60, 70, 720, "#d8ccff", .72],
      [940, 0, 150, 430, "#fff", .58],
      [1460, 90, 90, 840, "#d9d0ed", .68],
      [1810, 0, 48, 1024, "#fff", .42]
    ];
    lights.forEach(([x,y,w,h,color,alpha]) => {
      const gradient = ctx.createLinearGradient(x, y, x+w, y+h);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.48, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);
    });
    ctx.globalAlpha = 1;

    const floor = ctx.createLinearGradient(0, 660, 0, 1024);
    floor.addColorStop(0, "rgba(212,198,255,0)");
    floor.addColorStop(1, "rgba(216,206,240,.34)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 660, 2048, 364);

    const texture = new THREE.CanvasTexture(envCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    resources.push(texture);
    return texture;
  };

  const start = async () => {
    try {
      const THREE = await import(CDN);
      if (disposed || !canvas.isConnected) return;

      scene = new THREE.Scene();
      scene.environment = makeEnvironment(THREE);

      camera = new THREE.PerspectiveCamera(33, 1, .1, 40);
      camera.position.set(0, 0, 6.25);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xded5ff, 0x17131e, 1.4));

      const key = new THREE.DirectionalLight(0xffffff, 4.5);
      key.position.set(-3.5, 4.5, 5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc4a9ff, 3.2);
      fill.position.set(4, 1, 3);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xf6f1ff, 4.2);
      rim.position.set(0, 2, -4);
      scene.add(rim);

      const acid = new THREE.PointLight(0xd9e9a0, 8, 8, 2);
      acid.position.set(2.2, -2.2, 2.6);
      scene.add(acid);

      sculpture = new THREE.Group();
      sculpture.rotation.set(-.12, .08, -.08);
      scene.add(sculpture);

      const chromeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xdcd9e6,
        metalness: .98,
        roughness: .115,
        clearcoat: 1,
        clearcoatRoughness: .035,
        envMapIntensity: 2.15
      });
      resources.push(chromeMaterial);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xa995ec,
        metalness: .08,
        roughness: .055,
        transmission: .9,
        thickness: .95,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: .055,
        attenuationColor: new THREE.Color(0xb3a0f5),
        attenuationDistance: 1.18,
        envMapIntensity: 1.85
      });
      resources.push(glassMaterial);

      const pearlMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe4dcff,
        metalness: .3,
        roughness: .12,
        clearcoat: 1,
        clearcoatRoughness: .06,
        emissive: 0x39245e,
        emissiveIntensity: .5,
        envMapIntensity: 1.6
      });
      resources.push(pearlMaterial);

      const chromeGeometry = new THREE.TorusGeometry(1.32, .185, 72, 384);
      chromeRing = new THREE.Mesh(chromeGeometry, chromeMaterial);
      chromeRing.rotation.set(1.02, .26, -.24);
      sculpture.add(chromeRing);
      resources.push(chromeGeometry);

      const glassGeometry = new THREE.TorusGeometry(1.14, .22, 80, 384);
      glassRing = new THREE.Mesh(glassGeometry, glassMaterial);
      glassRing.rotation.set(-.68, .7, .48);
      sculpture.add(glassRing);
      resources.push(glassGeometry);

      const bridgeGeometry = new THREE.TorusGeometry(.86, .075, 56, 288);
      const bridgeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xece8f5,
        metalness: .9,
        roughness: .125,
        clearcoat: 1,
        clearcoatRoughness: .04,
        envMapIntensity: 2
      });
      resources.push(bridgeGeometry, bridgeMaterial);
      const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
      bridge.rotation.set(.38, -.88, .22);
      bridge.scale.set(1.12, .78, 1);
      sculpture.add(bridge);

      const pearlGeometry = new THREE.SphereGeometry(.235, 112, 80);
      pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
      pearl.position.set(-.08, .08, .34);
      sculpture.add(pearl);
      resources.push(pearlGeometry);

      const coreGeometry = new THREE.SphereGeometry(.075, 40, 32);
      const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      resources.push(coreGeometry, coreMaterial);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.set(-.08, .08, .56);
      sculpture.add(core);

      const orbitGeometry = new THREE.TorusGeometry(1.78, .009, 16, 320);
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xc9b8ff,
        transparent: true,
        opacity: .26
      });
      resources.push(orbitGeometry, orbitMaterial);
      orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.set(1.27, .3, -.48);
      sculpture.add(orbit);

      const markerGeometry = new THREE.SphereGeometry(.04, 40, 32);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xd9e9a0 });
      resources.push(markerGeometry, markerMaterial);
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(1.53, -.62, .14);
      sculpture.add(marker);

      const resize = () => {
        if (!renderer || disposed) return;
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener("resize", resize, { passive: true });
      }
      resize();

      const clock = new THREE.Clock();
      const renderFrame = () => {
        animationFrame = 0;
        if (disposed || !visible || document.hidden || !renderer) return;

        const elapsed = clock.getElapsedTime();
        if (!reducedMotion) {
          pointer.x += (pointer.targetX - pointer.x) * .035;
          pointer.y += (pointer.targetY - pointer.y) * .035;
          sculpture.rotation.y = .08 + pointer.x * .22 + Math.sin(elapsed * .22) * .035;
          sculpture.rotation.x = -.12 - pointer.y * .16 + Math.cos(elapsed * .18) * .025;
          sculpture.rotation.z = -.08 + Math.sin(elapsed * .14) * .025;
          glassRing.rotation.z = .48 + Math.sin(elapsed * .18) * .07;
          chromeRing.rotation.y = .26 + Math.cos(elapsed * .15) * .045;
          orbit.rotation.z = -.48 + elapsed * .035;
          pearl.position.y = .08 + Math.sin(elapsed * .85) * .045;
        }

        renderer.render(scene, camera);
        host.classList.add("is-ready");
        if (!reducedMotion) animationFrame = requestAnimationFrame(renderFrame);
      };

      const startLoop = () => {
        if (!reducedMotion && visible && !document.hidden && !animationFrame) {
          animationFrame = requestAnimationFrame(renderFrame);
        } else if (reducedMotion && renderer) {
          renderer.render(scene, camera);
          host.classList.add("is-ready");
        }
      };

      const stopLoop = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      };

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          if (visible) startLoop();
          else stopLoop();
        }, { threshold: .05 });
        observer.observe(host);
        resources.push({ dispose: () => observer.disconnect() });
      }

      if (finePointer && !reducedMotion) {
        stage.addEventListener("pointermove", event => {
          const rect = stage.getBoundingClientRect();
          pointer.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
          pointer.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
        }, { passive: true });
        stage.addEventListener("pointerleave", () => {
          pointer.targetX = 0;
          pointer.targetY = 0;
        }, { passive: true });
      }

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopLoop();
        else startLoop();
      });
      startLoop();
    } catch (error) {
      console.warn("ORBE & ONIX 3D hero unavailable; CSS fallback enabled.", error);
      fallback();
    }
  };

  window.addEventListener("pagehide", () => {
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (resizeObserver) resizeObserver.disconnect();
    resources.forEach(resource => {
      if (resource && typeof resource.dispose === "function") resource.dispose();
    });
    if (renderer) renderer.dispose();
  }, { once: true });

  start();
})();
