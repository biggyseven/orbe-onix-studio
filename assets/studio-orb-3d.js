// ORBE & ONIX — VESPERA / 001, a procedural exoplanet and synchronized orbital system.
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
  let systemRig = null;
  let planetRig = null;
  let cloudLayer = null;
  let atmosphereMaterial = null;
  let orbitalRig = null;
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

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const hash3 = (x, y, z, seed) => {
    let h = Math.imul(x | 0, 374761393);
    h = (h + Math.imul(y | 0, 668265263)) | 0;
    h = (h + Math.imul(z | 0, 2147483647) + (seed | 0)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  };
  const valueNoise3 = (x, y, z, seed) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx0 = x - ix;
    const fy0 = y - iy;
    const fz0 = z - iz;
    const fx = fx0 * fx0 * (3 - 2 * fx0);
    const fy = fy0 * fy0 * (3 - 2 * fy0);
    const fz = fz0 * fz0 * (3 - 2 * fz0);
    const x00 = mix(hash3(ix, iy, iz, seed), hash3(ix + 1, iy, iz, seed), fx);
    const x10 = mix(hash3(ix, iy + 1, iz, seed), hash3(ix + 1, iy + 1, iz, seed), fx);
    const x01 = mix(hash3(ix, iy, iz + 1, seed), hash3(ix + 1, iy, iz + 1, seed), fx);
    const x11 = mix(hash3(ix, iy + 1, iz + 1, seed), hash3(ix + 1, iy + 1, iz + 1, seed), fx);
    return mix(mix(x00, x10, fy), mix(x01, x11, fy), fz);
  };
  const fbm3 = (x, y, z, octaves, seed) => {
    let value = 0;
    let amplitude = .5;
    let total = 0;
    let frequency = 1;
    for (let octave = 0; octave < octaves; octave += 1) {
      value += valueNoise3(x * frequency, y * frequency, z * frequency, seed + octave * 97) * amplitude;
      total += amplitude;
      amplitude *= .5;
      frequency *= 2.03;
    }
    return value / total;
  };

  const makeCraterCatalog = () => {
    let seed = 7401901;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const craters = [];
    for (let index = 0; index < 31; index += 1) {
      const y = random() * 1.72 - .86;
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(1 - y * y);
      craters.push({
        x: Math.cos(angle) * radial,
        y,
        z: Math.sin(angle) * radial,
        radius: .025 + Math.pow(random(), 1.7) * .075,
        depth: .006 + random() * .012
      });
    }
    return craters;
  };
  const craters = makeCraterCatalog();

  const craterField = (x, y, z) => {
    let displacement = 0;
    let shade = 0;
    for (let index = 0; index < craters.length; index += 1) {
      const crater = craters[index];
      const dot = clamp(x * crater.x + y * crater.y + z * crater.z, -1, 1);
      if (dot < .986) continue;
      const chord = Math.sqrt(Math.max(0, 2 - 2 * dot));
      const q = chord / crater.radius;
      if (q > 1.48) continue;
      const bowl = 1 - smoothstep(.04, 1.03, q);
      const rim = Math.exp(-Math.pow((q - 1.02) / .12, 2));
      displacement += -crater.depth * bowl * .78 + crater.depth * rim * .38;
      shade = Math.max(shade, bowl * .42 + rim * .1);
    }
    return { displacement, shade };
  };

  const terrainAt = (x, y, z) => {
    const continentNoise = fbm3(x * 2.65 + 4.1, y * 2.65 - 1.7, z * 2.65 + 3.2, 4, 1301);
    const regionalNoise = fbm3(x * 6.7 - 2.4, y * 6.7 + 5.2, z * 6.7 + 1.1, 3, 2711);
    const detailNoise = fbm3(x * 18.5 + 3.1, y * 18.5, z * 18.5 - 4.2, 4, 3917);
    const ridgeNoise = fbm3(x * 41 + 1.7, y * 41 - 3.6, z * 41 + 2.2, 3, 5113);
    const continental = continentNoise * .72 + regionalNoise * .28;
    const land = smoothstep(.465, .565, continental);
    const highland = smoothstep(.55, .7, continental + regionalNoise * .12);
    const ridges = Math.pow(1 - Math.abs(ridgeNoise * 2 - 1), 1.8);
    const impact = craterField(x, y, z);
    const elevation = land * (
      .012 + (regionalNoise - .5) * .018 + detailNoise * .01 +
      highland * (.012 + ridges * .014)
    ) - (1 - land) * (.014 + detailNoise * .007) + impact.displacement;
    return {
      height: elevation,
      land,
      highland: clamp(highland + ridges * highland * .35, 0, 1),
      detail: detailNoise,
      ridge: ridges,
      crater: impact.shade,
      coast: smoothstep(.435, .535, continental)
    };
  };

  const buildPlanetMaps = THREE => {
    const width = window.innerWidth < 680 ? 512 : 768;
    const height = width / 2;
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = width;
    colorCanvas.height = height;
    const colorContext = colorCanvas.getContext("2d", { alpha: false });
    const colorPixels = colorContext.createImageData(width, height);
    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpContext = bumpCanvas.getContext("2d", { alpha: false });
    const bumpPixels = bumpContext.createImageData(width, height);
    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughContext = roughCanvas.getContext("2d", { alpha: false });
    const roughPixels = roughContext.createImageData(width, height);

    for (let py = 0; py < height; py += 1) {
      const latitude = Math.PI * (.5 - py / height);
      const cosLatitude = Math.cos(latitude);
      const sy = Math.sin(latitude);
      for (let px = 0; px < width; px += 1) {
        const longitude = (px / width) * Math.PI * 2;
        const x = cosLatitude * Math.cos(longitude);
        const z = cosLatitude * Math.sin(longitude);
        const terrain = terrainAt(x, sy, z);
        const polar = smoothstep(.72, .96, Math.abs(sy));
        const fineGrain = fbm3(x * 94 + 7, sy * 94 - 2, z * 94 + 5, 2, 6203);
        const oceanDepth = clamp((.52 - terrain.land) * 2.2 + .2, 0, 1);
        const shallow = 1 - terrain.coast;
        let red;
        let green;
        let blue;

        const oceanColor = [
          mix(31, 61, shallow),
          mix(42, 67, shallow),
          mix(91, 133, shallow)
        ];
        const basinColor = [
          mix(18, 34, oceanDepth),
          mix(24, 43, oceanDepth),
          mix(57, 91, oceanDepth)
        ];
        const lowlandColor = [
          mix(66, 109, terrain.detail),
          mix(49, 83, terrain.detail),
          mix(111, 159, terrain.detail)
        ];
        const highlandColor = [
          mix(118, 194, terrain.highland),
          mix(91, 157, terrain.highland),
          mix(171, 224, terrain.highland)
        ];
        const landMix = smoothstep(.12, .82, terrain.highland);
        const landR = mix(lowlandColor[0], highlandColor[0], landMix);
        const landG = mix(lowlandColor[1], highlandColor[1], landMix);
        const landB = mix(lowlandColor[2], highlandColor[2], landMix);
        const ice = polar * (.25 + terrain.highland * .6);
        const craterDarkening = 1 - terrain.crater * .32;
        const mineralFleck = (fineGrain - .5) * 15;

        red = mix(basinColor[0], oceanColor[0], smoothstep(.7, .98, terrain.coast));
        green = mix(basinColor[1], oceanColor[1], smoothstep(.7, .98, terrain.coast));
        blue = mix(basinColor[2], oceanColor[2], smoothstep(.7, .98, terrain.coast));
        red = mix(red, landR, terrain.land);
        green = mix(green, landG, terrain.land);
        blue = mix(blue, landB, terrain.land);
        red = mix(red, 207, ice);
        green = mix(green, 205, ice);
        blue = mix(blue, 232, ice);
        red = red * craterDarkening + mineralFleck;
        green = green * craterDarkening + mineralFleck;
        blue = blue * craterDarkening + mineralFleck * 1.15;

        const index = (py * width + px) * 4;
        colorPixels.data[index] = clamp(Math.round(red), 0, 255);
        colorPixels.data[index + 1] = clamp(Math.round(green), 0, 255);
        colorPixels.data[index + 2] = clamp(Math.round(blue), 0, 255);
        colorPixels.data[index + 3] = 255;

        const elevationByte = clamp(Math.round(128 + terrain.height * 2350), 0, 255);
        bumpPixels.data[index] = elevationByte;
        bumpPixels.data[index + 1] = elevationByte;
        bumpPixels.data[index + 2] = elevationByte;
        bumpPixels.data[index + 3] = 255;

        const roughness = mix(42, 208, terrain.land) + terrain.highland * 22 - terrain.coast * 12;
        const roughByte = clamp(Math.round(roughness), 0, 255);
        roughPixels.data[index] = roughByte;
        roughPixels.data[index + 1] = roughByte;
        roughPixels.data[index + 2] = roughByte;
        roughPixels.data[index + 3] = 255;
      }
    }
    colorContext.putImageData(colorPixels, 0, 0);
    bumpContext.putImageData(bumpPixels, 0, 0);
    roughContext.putImageData(roughPixels, 0, 0);

    const anisotropy = Math.min(12, rendererMaxAnisotropy);
    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.anisotropy = anisotropy;
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.ClampToEdgeWrapping;
    bumpMap.anisotropy = anisotropy;
    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
    roughnessMap.anisotropy = anisotropy;
    resources.push(map, bumpMap, roughnessMap);
    return { map, bumpMap, roughnessMap };
  };

  let rendererMaxAnisotropy = 8;

  const createPlanetGeometry = THREE => {
    const geometry = new THREE.SphereGeometry(1, 176, 128);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const length = Math.max(.000001, Math.hypot(x, y, z));
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;
      const radius = 1 + terrainAt(nx, ny, nz).height * .12;
      positions.setXYZ(index, nx * radius, ny * radius, nz * radius);
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  };

  const buildCloudTexture = THREE => {
    const width = window.innerWidth < 680 ? 640 : 896;
    const height = width / 2;
    let seed = 913733;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const grids = [
      { columns: 40, rows: 20 },
      { columns: 80, rows: 40 },
      { columns: 160, rows: 80 }
    ].map(grid => {
      const values = new Float32Array(grid.columns * grid.rows);
      for (let index = 0; index < values.length; index += 1) values[index] = random();
      return { ...grid, values };
    });
    const sample = (field, u, v) => {
      const gx = ((u % 1 + 1) % 1) * field.columns;
      const gy = clamp(v, 0, .999999) * (field.rows - 1);
      const x0 = Math.floor(gx);
      const x1 = (x0 + 1) % field.columns;
      const y0 = Math.floor(gy);
      const y1 = Math.min(field.rows - 1, y0 + 1);
      const tx0 = gx - x0;
      const ty0 = gy - y0;
      const tx = tx0 * tx0 * (3 - 2 * tx0);
      const ty = ty0 * ty0 * (3 - 2 * ty0);
      const a = mix(field.values[y0 * field.columns + x0], field.values[y0 * field.columns + x1], tx);
      const b = mix(field.values[y1 * field.columns + x0], field.values[y1 * field.columns + x1], tx);
      return mix(a, b, ty);
    };

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      const v = y / height;
      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        const broadWarp = sample(grids[0], u, v);
        const fineWarp = sample(grids[1], u + .19, v + .11);
        const warpedU = u + (broadWarp - .5) * .045;
        const warpedV = v + (fineWarp - .5) * .035;
        const broad = sample(grids[0], warpedU, warpedV);
        const medium = sample(grids[1], warpedU, warpedV);
        const fine = sample(grids[2], warpedU, warpedV);
        const polar = smoothstep(.72, .98, Math.abs(v - .5) * 2);
        const flow = Math.sin((warpedV * 8.2 + broad * 1.7) * Math.PI) * .035;
        const clouds = broad * .54 + medium * .31 + fine * .15 + flow;
        const coverage = smoothstep(.625, .79, clouds + polar * .045);
        const wispyEdge = smoothstep(.58, .76, clouds + (fine - .5) * .08);
        const alpha = Math.round(coverage * (34 + wispyEdge * 72));
        const index = (y * width + x) * 4;
        image.data[index] = Math.round(194 + fine * 38);
        image.data[index + 1] = Math.round(194 + fine * 35);
        image.data[index + 2] = Math.round(226 + fine * 27);
        image.data[index + 3] = alpha;
      }
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(8, rendererMaxAnisotropy);
    resources.push(texture);
    return texture;
  };

  const makeAtmosphereMaterial = THREE => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: [
      "varying vec3 vNormalView;",
      "varying vec3 vViewDirection;",
      "void main(){",
      "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
      "  vNormalView = normalize(normalMatrix * normal);",
      "  vViewDirection = normalize(-mvPosition.xyz);",
      "  gl_Position = projectionMatrix * mvPosition;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime;",
      "varying vec3 vNormalView;",
      "varying vec3 vViewDirection;",
      "void main(){",
      "  float facing = max(dot(normalize(vNormalView), normalize(vViewDirection)), 0.0);",
      "  float rim = pow(1.0 - facing, 3.3);",
      "  float fineRim = pow(1.0 - facing, 7.5);",
      "  float flow = 0.92 + 0.08 * sin(uTime * 0.38 + facing * 7.0);",
      "  vec3 violet = vec3(0.35, 0.28, 0.78);",
      "  vec3 ice = vec3(0.78, 0.86, 1.0);",
      "  vec3 atmosphere = mix(violet, ice, fineRim);",
      "  gl_FragColor = vec4(atmosphere, (rim * 0.58 + fineRim * 0.28) * flow);",
      "}"
    ].join("\n")
  });

  const addOrbitStrand = (THREE, parent, radius, tube, tint, opacity, tiltX, tiltZ) => {
    const geometry = new THREE.TorusGeometry(radius, tube, 6, 520);
    const material = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const strand = new THREE.Mesh(geometry, material);
    strand.rotation.set(tiltX, 0, tiltZ);
    strand.renderOrder = 2;
    parent.add(strand);
    resources.push(geometry, material);
    return strand;
  };

  const addStars = THREE => {
    let seed = 119039;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const positions = [];
    const colors = [];
    for (let index = 0; index < 420; index += 1) {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radius = 2.5 + random() * 2.7;
      const horizontal = Math.sqrt(1 - y * y);
      positions.push(Math.cos(angle) * horizontal * radius, y * radius, Math.sin(angle) * horizontal * radius - 1.1);
      const c = random();
      colors.push(.6 + c * .38, .58 + c * .34, .78 + c * .22);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: .019,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: .72,
      depthWrite: false
    });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
    resources.push(geometry, material);
    return stars;
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", cleanup);
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
  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const resize = () => {
    if (!renderer || !camera || disposed) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 680 ? 1.15 : 1.55));
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    host.classList.add("is-ready");
    host.classList.remove("is-fallback");
  };

  const renderFrame = timestamp => {
    animationFrame = 0;
    if (disposed || !visible || document.hidden || !renderer || !systemRig) return;
    const delta = lastTime ? Math.min(.045, (timestamp - lastTime) / 1000) : 0;
    lastTime = timestamp;
    elapsed += delta;

    pointer.x += (pointer.targetX - pointer.x) * .026;
    pointer.y += (pointer.targetY - pointer.y) * .026;
    systemRig.rotation.y = pointer.x * .12;
    systemRig.rotation.x = -.035 - pointer.y * .075;
    planetRig.rotation.y = elapsed * .052;
    planetRig.rotation.x = .045 + Math.sin(elapsed * .12) * .012;
    if (cloudLayer) {
      cloudLayer.rotation.y = elapsed * .071;
      cloudLayer.rotation.x = Math.sin(elapsed * .17) * .008;
    }
    if (orbitalRig) {
      orbitalRig.rotation.y = .16 + elapsed * .032;
      orbitalRig.rotation.z = -.23 + Math.sin(elapsed * .09) * .012;
    }
    if (atmosphereMaterial) atmosphereMaterial.uniforms.uTime.value = elapsed;

    renderer.render(scene, camera);
    if (renderer.info.render.calls > 0) {
      host.classList.add("is-ready");
      host.classList.remove("is-fallback");
    }
    animationFrame = requestAnimationFrame(renderFrame);
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

  const createEnvironment = THREE => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 768;
    const context = canvas.getContext("2d");
    const base = context.createLinearGradient(0, 0, 1536, 768);
    base.addColorStop(0, "#070914");
    base.addColorStop(.19, "#171a31");
    base.addColorStop(.38, "#35304c");
    base.addColorStop(.56, "#0a0d1b");
    base.addColorStop(.76, "#39324a");
    base.addColorStop(1, "#080914");
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const lightPanels = [
      { x: 90, y: 20, w: 210, h: 660, color: "#dce7ff", alpha: .58 },
      { x: 430, y: 40, w: 85, h: 570, color: "#9b91cf", alpha: .34 },
      { x: 770, y: 0, w: 270, h: 640, color: "#e6e7ff", alpha: .48 },
      { x: 1270, y: 40, w: 110, h: 660, color: "#a99bd7", alpha: .38 }
    ];
    lightPanels.forEach(panel => {
      const gradient = context.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.48, panel.color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.globalAlpha = panel.alpha;
      context.fillStyle = gradient;
      context.fillRect(panel.x, panel.y, panel.w, panel.h);
    });
    context.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    resources.push(texture);
    return texture;
  };

  const addRing = (THREE, parent, inner, outer, color, brightness) => {
    const geometry = new THREE.RingGeometry(inner, outer, 420, 2);
    const material = makeRingMaterial(THREE, inner, outer, color, brightness);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    parent.add(mesh);
    resources.push(geometry, material);
    return mesh;
  };



  const start = async () => {
    if (started || disposed) return;
    started = true;
    try {
      const THREE = await import(THREE_CDN);
      if (disposed || !host.isConnected) return;

      scene = new THREE.Scene();
      scene.environment = createEnvironment(THREE);
      camera = new THREE.PerspectiveCamera(40, 1, .1, 30);
      camera.position.set(0, 0, 4.75);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.34;
      renderer.setClearColor(0x000000, 0);
      rendererMaxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      scene.add(new THREE.HemisphereLight(0xe8eaff, 0x30264e, 1.75));
      scene.add(new THREE.AmbientLight(0x9c8fc7, .58));
      const key = new THREE.DirectionalLight(0xfff5f2, 4.8);
      key.position.set(-3.8, 3.6, 4.4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x9c9cff, 2.35);
      fill.position.set(3.8, -1.2, 2.6);
      scene.add(fill);
      const frontLift = new THREE.DirectionalLight(0x879aff, 1.05);
      frontLift.position.set(.2, .5, 5.5);
      scene.add(frontLift);
      const rim = new THREE.PointLight(0xb1a5ff, 4.8, 8);
      rim.position.set(2.6, 1.8, -2.4);
      scene.add(rim);

      addStars(THREE);
      systemRig = new THREE.Group();
      scene.add(systemRig);

      planetRig = new THREE.Group();
      systemRig.add(planetRig);
      const planetMaps = buildPlanetMaps(THREE);
      const planetGeometry = createPlanetGeometry(THREE);
      const planetMaterial = new THREE.MeshPhysicalMaterial({
        map: planetMaps.map,
        bumpMap: planetMaps.bumpMap,
        bumpScale: .008,
        roughnessMap: planetMaps.roughnessMap,
        roughness: .62,
        metalness: .035,
        clearcoat: .34,
        clearcoatRoughness: .28,
        emissive: 0x17143b,
        emissiveIntensity: .26
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.rotation.set(-.14, .12, .08);
      planetRig.add(planet);
      resources.push(planetGeometry, planetMaterial);

      const cloudTexture = buildCloudTexture(THREE);
      const cloudGeometry = new THREE.SphereGeometry(1.009, 128, 96);
      const cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        color: 0xc6c4e6,
        transparent: true,
        opacity: .48,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
        side: THREE.FrontSide
      });
      cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloudLayer.renderOrder = 1;
      planetRig.add(cloudLayer);
      resources.push(cloudGeometry, cloudMaterial);

      const atmosphereGeometry = new THREE.SphereGeometry(1.078, 112, 80);
      atmosphereMaterial = makeAtmosphereMaterial(THREE);
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.renderOrder = 2;
      planetRig.add(atmosphere);
      resources.push(atmosphereGeometry, atmosphereMaterial);

      orbitalRig = new THREE.Group();
      orbitalRig.rotation.set(1.04, .12, -.48);
      systemRig.add(orbitalRig);
      addOrbitStrand(THREE, orbitalRig, 1.22, .0025, 0xd6d3ff, .76, 0, 0);
      addOrbitStrand(THREE, orbitalRig, 1.29, .0017, 0x9f9bdc, .52, .018, .012);
      addOrbitStrand(THREE, orbitalRig, 1.37, .0022, 0xe6e1ff, .68, -.014, -.018);
      addOrbitStrand(THREE, orbitalRig, 1.46, .0014, 0xbab5f1, .42, .026, -.012);

      const resizeHandler = () => resize();
      window.addEventListener("resize", resizeHandler, { passive: true });
      window.addEventListener("pagehide", cleanup, { once: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave, { passive: true });
      resources.push({ dispose: () => window.removeEventListener("resize", resizeHandler) });

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      }
      resize();
      drawOrResume();
    } catch (error) {
      console.warn("ORBE & ONIX Vespera planet could not start; the static fallback remains active.", error);
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
    }, { rootMargin: "220px 0px" });
    intersectionObserver.observe(host);
  } else {
    start();
  }
})();