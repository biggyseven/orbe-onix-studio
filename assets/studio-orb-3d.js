// ORBE & ONIX — homepage studio crystal orb, rendered as a real Three.js object.
(() => {
  const host = document.querySelector("[data-studio-orb3d]");
  if (!host) return;

  const canvas = host.querySelector("canvas");
  if (!canvas) return;

  const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let renderer = null;
  let scene = null;
  let camera = null;
  let crystalRig = null;
  let resizeObserver = null;
  let intersectionObserver = null;
  let animationFrame = 0;
  let started = false;
  let visible = true;
  let disposed = false;
  let elapsed = 0;
  let lastTime = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const resources = [];

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    stop();
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerleave", onPointerLeave);
    resources.forEach(resource => {
      if (resource && typeof resource.dispose === "function") resource.dispose();
    });
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };

  const onPointerMove = event => {
    if (!finePointer) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    pointer.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
  };

  const onPointerLeave = () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  };

  const onVisibilityChange = () => {
    visible = !document.hidden;
    if (visible) drawOrResume();
    else stop();
  };

  const resize = () => {
    if (!renderer || !camera || disposed) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.55));
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    host.classList.add("is-ready");
    host.classList.remove("is-fallback");
  };

  const drawOrResume = () => {
    if (!renderer || disposed || !visible) return;
    if (reducedMotion) {
      renderer.render(scene, camera);
      return;
    }
    if (!animationFrame) {
      lastTime = 0;
      animationFrame = requestAnimationFrame(renderFrame);
    }
  };

  const renderFrame = timestamp => {
    animationFrame = 0;
    if (disposed || !visible || document.hidden || !renderer || !crystalRig) return;
    const delta = lastTime ? Math.min(.05, (timestamp - lastTime) / 1000) : 0;
    lastTime = timestamp;
    elapsed += delta;

    pointer.x += (pointer.targetX - pointer.x) * .035;
    pointer.y += (pointer.targetY - pointer.y) * .035;
    crystalRig.rotation.y = elapsed * .145 + pointer.x * .11;
    crystalRig.rotation.x = Math.sin(elapsed * .22) * .045 - pointer.y * .075;
    crystalRig.rotation.z = Math.sin(elapsed * .16) * .025;
    crystalRig.position.y = Math.sin(elapsed * .48) * .035;

    renderer.render(scene, camera);
    if (renderer.info.render.calls > 0) {
      host.classList.add("is-ready");
      host.classList.remove("is-fallback");
    }
    animationFrame = requestAnimationFrame(renderFrame);
  };

  const createEnvironment = THREE => {
    const envCanvas = document.createElement("canvas");
    envCanvas.width = 1024;
    envCanvas.height = 512;
    const context = envCanvas.getContext("2d");
    const base = context.createLinearGradient(0, 0, 1024, 512);
    base.addColorStop(0, "#171322");
    base.addColorStop(.22, "#9d8db8");
    base.addColorStop(.4, "#272033");
    base.addColorStop(.62, "#756a87");
    base.addColorStop(.82, "#211a2d");
    base.addColorStop(1, "#09080f");
    context.fillStyle = base;
    context.fillRect(0, 0, 1024, 512);

    const softboxes = [
      { x: 72, y: 30, w: 104, h: 430, color: "#fff", alpha: .92 },
      { x: 318, y: 0, w: 62, h: 350, color: "#e4d8ff", alpha: .74 },
      { x: 595, y: 24, w: 128, h: 440, color: "#fff", alpha: .82 },
      { x: 846, y: 54, w: 42, h: 360, color: "#d5c7ff", alpha: .62 }
    ];
    softboxes.forEach(({ x, y, w, h, color, alpha }) => {
      const gradient = context.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.48, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.globalAlpha = alpha;
      context.fillStyle = gradient;
      context.fillRect(x, y, w, h);
    });
    context.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(envCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    resources.push(texture);
    return texture;
  };

  const createCrystalGeometry = THREE => {
    const geometry = new THREE.IcosahedronGeometry(1.04, 2);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const length = Math.max(.0001, Math.hypot(x, y, z));
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      const facetWave = (
        Math.sin(nx * 8.3 + ny * 3.7) +
        Math.cos(ny * 9.1 - nz * 4.2) +
        Math.sin(nz * 7.4 + nx * 5.8)
      ) / 3;
      const radius = 1.04 * (1 + facetWave * .025);
      positions.setXYZ(index, nx * radius, ny * radius * .98, nz * radius);
    }
    geometry.computeVertexNormals();
    const faceted = geometry.toNonIndexed();
    geometry.dispose();
    faceted.computeVertexNormals();
    return faceted;
  };

  const start = async () => {
    if (started || disposed) return;
    started = true;
    try {
      const THREE = await import(THREE_CDN);
      if (disposed || !host.isConnected) return;

      scene = new THREE.Scene();
      scene.environment = createEnvironment(THREE);
      camera = new THREE.PerspectiveCamera(34, 1, .1, 20);
      camera.position.set(0, 0, 4.05);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power"
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.16;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.55));

      scene.add(new THREE.HemisphereLight(0xe9e1ff, 0x171020, 1.45));
      scene.add(new THREE.AmbientLight(0xb4a5d8, .42));

      const keyLight = new THREE.DirectionalLight(0xffffff, 4.25);
      keyLight.position.set(-3.4, 4.2, 4.8);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0xb89aff, 5.2, 8);
      rimLight.position.set(3.1, 1.5, -1.6);
      scene.add(rimLight);
      const lowerLight = new THREE.PointLight(0xe7dcff, 2.2, 7);
      lowerLight.position.set(-2.2, -2.5, 2.3);
      scene.add(lowerLight);

      crystalRig = new THREE.Group();
      scene.add(crystalRig);

      const crystalGeometry = createCrystalGeometry(THREE);
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xb8a5dd,
        metalness: .28,
        roughness: .19,
        clearcoat: 1,
        clearcoatRoughness: .1,
        transmission: .14,
        thickness: .7,
        ior: 1.42,
        emissive: 0x2a1a40,
        emissiveIntensity: .32,
        envMapIntensity: 1.9,
        flatShading: true
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.rotation.set(.18, -.3, .08);
      crystalRig.add(crystal);
      resources.push(crystalGeometry, crystalMaterial);

      const innerGeometry = new THREE.IcosahedronGeometry(.57, 1);
      const innerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x745a9e,
        metalness: .3,
        roughness: .24,
        clearcoat: 1,
        clearcoatRoughness: .16,
        emissive: 0x674b9c,
        emissiveIntensity: .72,
        transparent: true,
        opacity: .72,
        depthWrite: false,
        envMapIntensity: 1.35
      });
      const innerCrystal = new THREE.Mesh(innerGeometry, innerMaterial);
      innerCrystal.rotation.set(-.36, .42, .18);
      crystalRig.add(innerCrystal);
      resources.push(innerGeometry, innerMaterial);

      const coreGeometry = new THREE.IcosahedronGeometry(.22, 2);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xd8c8ff,
        transparent: true,
        opacity: .7,
        depthWrite: false
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      crystalRig.add(core);
      resources.push(coreGeometry, coreMaterial);

      const orbitGeometry = new THREE.TorusGeometry(1.22, .006, 6, 160);
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xe8ddff,
        transparent: true,
        opacity: .62
      });
      const crystalOrbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      crystalOrbit.rotation.set(1.08, .28, -.26);
      crystalRig.add(crystalOrbit);
      resources.push(orbitGeometry, orbitMaterial);

      const resizeHandler = () => resize();
      window.addEventListener("resize", resizeHandler, { passive: true });
      window.addEventListener("pagehide", cleanup, { once: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave, { passive: true });
      resources.push({
        dispose: () => window.removeEventListener("resize", resizeHandler)
      });

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      }
      resize();
      drawOrResume();
    } catch (error) {
      console.warn("ORBE & ONIX studio crystal could not start; CSS fallback remains active.", error);
      host.classList.remove("is-ready");
      host.classList.add("is-fallback");
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
    }
  };

  if ("IntersectionObserver" in window) {
    visible = false;
    intersectionObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      visible = Boolean(entry && entry.isIntersecting);
      if (visible) {
        start();
        drawOrResume();
      } else {
        stop();
      }
    }, { rootMargin: "180px 0px" });
    intersectionObserver.observe(host);
  } else {
    start();
  }
})();