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
    const width = window.innerWidth < 680 ? 768 : 1280;
    const height = width / 2;
    let seed = 20261108;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };
    const fields = [[12, 6], [24, 12], [48, 24], [96, 48]].map(([columns, rows]) => {
      const values = new Float32Array(columns * rows);
      for (let index = 0; index < values.length; index += 1) values[index] = random();
      return { columns, rows, values };
    });
    const sampleNoise = (field, u, v) => {
      const px = ((u % 1 + 1) % 1) * field.columns;
      const py = Math.max(0, Math.min(.999999, v)) * (field.rows - 1);
      const x0 = Math.floor(px) % field.columns;
      const x1 = (x0 + 1) % field.columns;
      const y0 = Math.floor(py);
      const y1 = Math.min(field.rows - 1, y0 + 1);
      const tx = smooth(px - Math.floor(px));
      const ty = smooth(py - y0);
      const a = field.values[y0 * field.columns + x0];
      const b = field.values[y0 * field.columns + x1];
      const c = field.values[y1 * field.columns + x0];
      const d = field.values[y1 * field.columns + x1];
      const top = a + (b - a) * tx;
      const bottom = c + (d - c) * tx;
      return top + (bottom - top) * ty;
    };

    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorContext = colorCanvas.getContext("2d");
    const colorPixels = colorContext.createImageData(width, height);
    const heights = new Float32Array(width * height);
    const roughnessValues = new Uint8Array(width * height);

    // Layered value noise creates the cloudy, grown-inside-the-stone character.
    for (let y = 0; y < height; y += 1) {
      const v = y / height;
      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        const broad = sampleNoise(fields[0], u, v);
        const medium = sampleNoise(fields[1], u, v);
        const fine = sampleNoise(fields[2], u, v);
        const micro = sampleNoise(fields[3], u, v);
        const warp = sampleNoise(fields[1], u + .16, v + .07);
        const cloud = broad * .48 + medium * .3 + fine * .15 + micro * .07;
        const bandPosition = v * 9.2 + (broad - .5) * 2.1 + (warp - .5) * .85;
        const band = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(bandPosition * Math.PI * 2))), 13);
        const fineVein = Math.pow(Math.max(0, 1 - Math.abs(fine - micro) * 5.2), 8) * .22;
        const mineral = clamp01((cloud - .2) * 1.42 + .12);
        const silver = clamp01(band * .62 + fineVein + Math.max(0, micro - .83) * .8);
        const shadow = clamp01((.48 - cloud) * .7);
        const index = y * width + x;
        const pixel = index * 4;

        colorPixels.data[pixel] = Math.round(27 + mineral * 66 + silver * 83 - shadow * 9);
        colorPixels.data[pixel + 1] = Math.round(19 + mineral * 59 + silver * 79 - shadow * 7);
        colorPixels.data[pixel + 2] = Math.round(40 + mineral * 91 + silver * 91 - shadow * 3);
        colorPixels.data[pixel + 3] = 255;

        heights[index] = 104 + mineral * 28 + band * 23 + fineVein * 28 + (micro - .5) * 13;
        roughnessValues[index] = Math.max(62, Math.min(220,
          Math.round(155 + (broad - .5) * 33 + (fine - .5) * 26 - silver * 38 + random() * 13)
        ));
      }
    }
    colorContext.putImageData(colorPixels, 0, 0);

    // Fine fractures follow the mineral bands and split into hairline branches.
    for (let vein = 0; vein < 118; vein += 1) {
      let x = random() * width;
      let y = random() * height;
      const points = [[x, y]];
      const count = 6 + Math.floor(random() * 10);
      let direction = (random() - .5) * .9;
      for (let step = 0; step < count; step += 1) {
        direction += (random() - .5) * .62;
        x += Math.cos(direction) * (9 + random() * 23);
        y += Math.sin(direction) * (7 + random() * 18);
        points.push([x, y]);
      }
      colorContext.beginPath();
      colorContext.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(point => colorContext.lineTo(point[0], point[1]));
      colorContext.lineWidth = .45 + random() * 1.2;
      colorContext.strokeStyle = "rgba(14,9,22," + (.12 + random() * .18) + ")";
      colorContext.stroke();
      colorContext.beginPath();
      colorContext.moveTo(points[0][0] + .7, points[0][1] - .5);
      points.slice(1).forEach(point => colorContext.lineTo(point[0] + .7, point[1] - .5));
      colorContext.lineWidth = .25 + random() * .62;
      colorContext.strokeStyle = "rgba(244,237,255," + (.12 + random() * .28) + ")";
      colorContext.stroke();

      if (points.length > 5 && random() > .32) {
        const origin = points[2 + Math.floor(random() * (points.length - 3))];
        colorContext.beginPath();
        colorContext.moveTo(origin[0], origin[1]);
        colorContext.lineTo(origin[0] + (random() - .5) * 42, origin[1] + (random() - .5) * 48);
        colorContext.lineWidth = .25 + random() * .55;
        colorContext.strokeStyle = "rgba(222,207,248," + (.1 + random() * .2) + ")";
        colorContext.stroke();
      }
    }

    // Mica dust is sparse: most of the surface remains deep and glassy.
    for (let index = 0; index < 9800; index += 1) {
      const x = random() * width;
      const y = random() * height;
      const length = random() > .88 ? 1.2 + random() * 3.8 : .25 + random() * 1.1;
      colorContext.beginPath();
      colorContext.ellipse(x, y, length, .22 + random() * .48, random() * Math.PI, 0, Math.PI * 2);
      colorContext.fillStyle = random() > .64
        ? "rgba(250,244,255," + (.07 + random() * .24) + ")"
        : "rgba(8,5,16," + (.04 + random() * .15) + ")";
      colorContext.fill();
    }

    const reliefCanvas = document.createElement("canvas");
    reliefCanvas.width = width;
    reliefCanvas.height = height;
    const reliefContext = reliefCanvas.getContext("2d");
    const reliefPixels = reliefContext.createImageData(width, height);
    for (let index = 0; index < heights.length; index += 1) {
      const value = Math.round(heights[index]);
      const offset = index * 4;
      reliefPixels.data[offset] = value;
      reliefPixels.data[offset + 1] = value;
      reliefPixels.data[offset + 2] = value;
      reliefPixels.data[offset + 3] = 255;
    }
    reliefContext.putImageData(reliefPixels, 0, 0);

    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalContext = normalCanvas.getContext("2d");
    const normalPixels = normalContext.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const left = heights[y * width + ((x - 1 + width) % width)];
        const right = heights[y * width + ((x + 1) % width)];
        const up = heights[Math.max(0, y - 1) * width + x];
        const down = heights[Math.min(height - 1, y + 1) * width + x];
        let nx = -(right - left) * .11;
        let ny = (down - up) * .11;
        let nz = 1;
        const length = Math.hypot(nx, ny, nz);
        nx /= length;
        ny /= length;
        nz /= length;
        const offset = (y * width + x) * 4;
        normalPixels.data[offset] = Math.round((nx * .5 + .5) * 255);
        normalPixels.data[offset + 1] = Math.round((ny * .5 + .5) * 255);
        normalPixels.data[offset + 2] = Math.round((nz * .5 + .5) * 255);
        normalPixels.data[offset + 3] = 255;
      }
    }
    normalContext.putImageData(normalPixels, 0, 0);

    const roughnessCanvas = document.createElement("canvas");
    roughnessCanvas.width = width;
    roughnessCanvas.height = height;
    const roughnessContext = roughnessCanvas.getContext("2d");
    const roughnessPixels = roughnessContext.createImageData(width, height);
    for (let index = 0; index < roughnessValues.length; index += 1) {
      const value = roughnessValues[index];
      const offset = index * 4;
      roughnessPixels.data[offset] = value;
      roughnessPixels.data[offset + 1] = value;
      roughnessPixels.data[offset + 2] = value;
      roughnessPixels.data[offset + 3] = 255;
    }
    roughnessContext.putImageData(roughnessPixels, 0, 0);

    const anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.anisotropy = anisotropy;
    const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
    roughnessMap.anisotropy = anisotropy;
    resources.push(map, normalMap, roughnessMap);
    return { map, normalMap, roughnessMap };
  };

  const createCrystalGeometry = THREE => {
    const geometry = new THREE.IcosahedronGeometry(1.04, 4);
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
      const radius = 1.04 * (1 + facetWave * .021 + crystallineRidge * .009);
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
    const geometry = new THREE.TetrahedronGeometry(.021, 0);
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
    const inclusions = new THREE.InstancedMesh(geometry, material, 68);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 68; index += 1) {
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
      const scale = .24 + random() * 1.05;
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
      renderer.toneMappingExposure = 1.22;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.2 : 1.55));

      scene.add(new THREE.HemisphereLight(0xe9e1ff, 0x171020, 1.45));
      scene.add(new THREE.AmbientLight(0xb4a5d8, .42));

      const keyLight = new THREE.DirectionalLight(0xffffff, 4.25);
      keyLight.position.set(-3.8, 4.8, 5.4);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0xb89aff, 6.1, 8);
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
        color: 0xe0d4f1,
        map: surfaceMaps.map,
        normalMap: surfaceMaps.normalMap,
        normalScale: new THREE.Vector2(.46, .46),
        roughnessMap: surfaceMaps.roughnessMap,
        metalness: .12,
        roughness: .24,
        clearcoat: 1,
        clearcoatRoughness: .065,
        transmission: .16,
        thickness: 1.1,
        ior: 1.49,
        iridescence: .22,
        iridescenceIOR: 1.34,
        iridescenceThicknessRange: [135, 420],
        attenuationColor: 0x80639f,
        attenuationDistance: 2.2,
        emissive: 0x21132f,
        emissiveIntensity: .25,
        envMapIntensity: 2.35,
        flatShading: true
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.rotation.set(.18, -.3, .08);
      crystalRig.add(crystal);
      resources.push(crystalGeometry, crystalMaterial);
      addCrystalInclusions(THREE, crystalRig);

      // A clear polished skin gives the facets a convincing glass edge and fresnel reflection.
      const shellGeometry = new THREE.SphereGeometry(1.092, 80, 64);
      const shellMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd9cafa,
        metalness: .02,
        roughness: .055,
        transmission: .34,
        thickness: .42,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: .025,
        iridescence: .12,
        iridescenceIOR: 1.32,
        iridescenceThicknessRange: [180, 360],
        attenuationColor: 0xb6a0dc,
        attenuationDistance: 3.4,
        envMapIntensity: 2.6,
        side: THREE.FrontSide
      });
      const glassShell = new THREE.Mesh(shellGeometry, shellMaterial);
      crystalRig.add(glassShell);
      resources.push(shellGeometry, shellMaterial);

      const innerGeometry = new THREE.IcosahedronGeometry(.57, 2);
      const innerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x8972b1,
        metalness: .08,
        roughness: .18,
        transmission: .3,
        thickness: .6,
        ior: 1.46,
        clearcoat: .9,
        clearcoatRoughness: .08,
        iridescence: .16,
        iridescenceThicknessRange: [110, 300],
        emissive: 0x60468b,
        emissiveIntensity: .54,
        transparent: true,
        opacity: .58,
        depthWrite: false,
        envMapIntensity: 1.8,
        flatShading: true
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