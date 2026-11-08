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

  const createCrystalSurfaceMaps = (THREE, renderer) => {
    const width = 1536;
    const height = 768;
    let seed = 2471108;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = width;
    colorCanvas.height = height;
    const color = colorCanvas.getContext("2d");
    const base = color.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#21172f");
    base.addColorStop(.17, "#59456f");
    base.addColorStop(.31, "#2b203b");
    base.addColorStop(.48, "#a18dbd");
    base.addColorStop(.62, "#30213f");
    base.addColorStop(.79, "#66527f");
    base.addColorStop(1, "#1b1427");
    color.fillStyle = base;
    color.fillRect(0, 0, width, height);

    // Clouded mineral layers create depth below the polished surface.
    for (let index = 0; index < 34; index += 1) {
      const x = random() * width;
      const y = random() * height;
      const radius = 34 + random() * 180;
      const glow = color.createRadialGradient(x, y, 0, x, y, radius);
      const tint = random() > .55 ? "224,211,255" : "117,91,151";
      glow.addColorStop(0, "rgba(" + tint + "," + (.08 + random() * .1) + ")");
      glow.addColorStop(1, "rgba(" + tint + ",0)");
      color.fillStyle = glow;
      color.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Long, broken quartz veins with a restrained silver edge.
    for (let vein = 0; vein < 46; vein += 1) {
      let x = random() * width;
      let y = random() * height;
      const points = [];
      const count = 5 + Math.floor(random() * 7);
      const drift = (random() - .5) * 90;
      for (let step = 0; step < count; step += 1) {
        points.push([x, y]);
        x += (random() - .5) * 105 + drift * .16;
        y += (random() - .5) * 74;
      }
      color.beginPath();
      color.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(point => color.lineTo(point[0], point[1]));
      color.lineWidth = .65 + random() * 2.4;
      color.strokeStyle = "rgba(19,13,29," + (.16 + random() * .22) + ")";
      color.stroke();
      color.beginPath();
      color.moveTo(points[0][0] + 1.2, points[0][1] - .8);
      points.slice(1).forEach(point => color.lineTo(point[0] + 1.2, point[1] - .8));
      color.lineWidth = .35 + random() * .8;
      color.strokeStyle = "rgba(242,234,255," + (.14 + random() * .27) + ")";
      color.stroke();

      // Small offshoot fractures make the inclusions feel naturally grown.
      if (points.length > 4 && random() > .28) {
        const origin = points[2 + Math.floor(random() * (points.length - 3))];
        color.beginPath();
        color.moveTo(origin[0], origin[1]);
        color.lineTo(origin[0] + (random() - .5) * 36, origin[1] + (random() - .5) * 42);
        color.lineWidth = .35 + random() * .65;
        color.strokeStyle = "rgba(228,216,250," + (.12 + random() * .22) + ")";
        color.stroke();
      }
    }

    // Fine grain, tiny mica flecks and elongated mineral glints.
    for (let index = 0; index < 7200; index += 1) {
      const x = random() * width;
      const y = random() * height;
      const radius = random() > .94 ? .8 + random() * 1.8 : .18 + random() * .65;
      const light = random() > .58;
      color.beginPath();
      color.arc(x, y, radius, 0, Math.PI * 2);
      color.fillStyle = light
        ? "rgba(247,239,255," + (.05 + random() * .23) + ")"
        : "rgba(8,5,16," + (.04 + random() * .16) + ")";
      color.fill();
    }
    for (let index = 0; index < 170; index += 1) {
      const x = random() * width;
      const y = random() * height;
      color.beginPath();
      color.moveTo(x, y);
      color.lineTo(x + (random() - .5) * 15, y + 2 + random() * 24);
      color.lineWidth = .35 + random() * .8;
      color.strokeStyle = "rgba(238,229,255," + (.08 + random() * .2) + ")";
      color.stroke();
    }

    // A separate greyscale relief map catches light on the micro-fractures.
    const reliefCanvas = document.createElement("canvas");
    reliefCanvas.width = width;
    reliefCanvas.height = height;
    const relief = reliefCanvas.getContext("2d");
    const pixels = relief.createImageData(width, height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const value = 119 + Math.floor(random() * 25);
      pixels.data[index] = value;
      pixels.data[index + 1] = value;
      pixels.data[index + 2] = value;
      pixels.data[index + 3] = 255;
    }
    relief.putImageData(pixels, 0, 0);

    for (let vein = 0; vein < 74; vein += 1) {
      let x = random() * width;
      let y = random() * height;
      relief.beginPath();
      relief.moveTo(x, y);
      const count = 4 + Math.floor(random() * 8);
      for (let step = 0; step < count; step += 1) {
        x += (random() - .5) * 92;
        y += (random() - .5) * 60;
        relief.lineTo(x, y);
      }
      relief.lineWidth = .55 + random() * 1.8;
      relief.strokeStyle = random() > .5 ? "rgba(220,220,220,.72)" : "rgba(48,48,48,.64)";
      relief.stroke();
    }
    for (let index = 0; index < 4800; index += 1) {
      const x = random() * width;
      const y = random() * height;
      const radius = .25 + random() * 1.05;
      relief.beginPath();
      relief.arc(x, y, radius, 0, Math.PI * 2);
      const value = random() > .5 ? 205 : 58;
      relief.fillStyle = "rgba(" + value + "," + value + "," + value + "," + (.12 + random() * .35) + ")";
      relief.fill();
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const bumpMap = new THREE.CanvasTexture(reliefCanvas);
    bumpMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const roughnessMap = new THREE.CanvasTexture(reliefCanvas);
    roughnessMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    resources.push(map, bumpMap, roughnessMap);
    return { map, bumpMap, roughnessMap };
  };

  const createCrystalGeometry = THREE => {
    const geometry = new THREE.IcosahedronGeometry(1.04, 3);
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
      const crystallineRidge = Math.pow(Math.max(0, Math.sin(nx * 12.4 + nz * 6.3) * Math.cos(ny * 10.7)), 5);
      const radius = 1.04 * (1 + facetWave * .032 + crystallineRidge * .014);
      positions.setXYZ(index, nx * radius, ny * radius * .98, nz * radius);
    }
    geometry.computeVertexNormals();
    const faceted = geometry.toNonIndexed();
    geometry.dispose();
    faceted.computeVertexNormals();
    return faceted;
  };

  const addCrystalInclusions = (THREE, parent) => {
    let seed = 8102026;
    const random = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed / 4294967296;
    };
    const geometry = new THREE.TetrahedronGeometry(.025, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf1eaff,
      metalness: .18,
      roughness: .22,
      clearcoat: 1,
      emissive: 0x9e84cf,
      emissiveIntensity: .38,
      transparent: true,
      opacity: .48,
      depthWrite: false
    });
    const inclusions = new THREE.InstancedMesh(geometry, material, 34);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 34; index += 1) {
      const z = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(1 - z * z);
      const radius = .32 + random() * .48;
      dummy.position.set(
        Math.cos(angle) * radial * radius,
        z * radius,
        Math.sin(angle) * radial * radius
      );
      dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      const scale = .32 + random() * 1.2;
      dummy.scale.set(scale, scale * (.45 + random() * .9), scale * (.35 + random() * .8));
      dummy.updateMatrix();
      inclusions.setMatrixAt(index, dummy.matrix);
      const tint = random() > .55 ? 0xe8ddff : 0xa992d5;
      inclusions.setColorAt(index, new THREE.Color(tint));
    }
    inclusions.instanceMatrix.needsUpdate = true;
    if (inclusions.instanceColor) inclusions.instanceColor.needsUpdate = true;
    parent.add(inclusions);
    resources.push(geometry, material);
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
      const surfaceMaps = createCrystalSurfaceMaps(THREE, renderer);
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd1c3e8,
        map: surfaceMaps.map,
        bumpMap: surfaceMaps.bumpMap,
        bumpScale: .018,
        roughnessMap: surfaceMaps.roughnessMap,
        metalness: .24,
        roughness: .28,
        clearcoat: .96,
        clearcoatRoughness: .13,
        transmission: .08,
        thickness: .9,
        ior: 1.48,
        emissive: 0x28193b,
        emissiveIntensity: .3,
        envMapIntensity: 2.05,
        flatShading: true
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.rotation.set(.18, -.3, .08);
      crystalRig.add(crystal);
      resources.push(crystalGeometry, crystalMaterial);
      addCrystalInclusions(THREE, crystalRig);

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