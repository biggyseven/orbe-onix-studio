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

    // Broad studio softboxes create long, readable highlights on polished metal.
    const softboxes = [
      { x: 110, y: 42, w: 250, h: 770, color: "#fff", alpha: .56 },
      { x: 770, y: 30, w: 180, h: 520, color: "#e6dcff", alpha: .42 },
      { x: 1250, y: 90, w: 310, h: 760, color: "#fff", alpha: .48 },
      { x: 1710, y: 70, w: 92, h: 640, color: "#d4c5ff", alpha: .36 }
    ];
    softboxes.forEach(({ x, y, w, h, color, alpha }) => {
      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(.2, color);
      gradient.addColorStop(.78, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);
    });
    ctx.globalAlpha = 1;

    const overhead = ctx.createRadialGradient(1024, 70, 10, 1024, 70, 650);
    overhead.addColorStop(0, "rgba(255,255,255,.42)");
    overhead.addColorStop(.34, "rgba(220,208,255,.16)");
    overhead.addColorStop(1, "rgba(220,208,255,0)");
    ctx.fillStyle = overhead;
    ctx.fillRect(330, 0, 1388, 650);

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

  // Custom swept sections make the interlocking forms feel sculpted,
  // not like three generic torus primitives.
  const makeWovenLoopPath = (THREE, radius, depth, phase, irregularity) => {
    const points = [];
    const samples = 96;
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const radial = 1
        + irregularity * Math.sin(angle * 3 + phase)
        + irregularity * .34 * Math.cos(angle * 5 - phase);
      const z = depth * Math.sin(angle * 2 + phase)
        + depth * .24 * Math.sin(angle * 3 - phase * .7);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * radial,
        Math.sin(angle) * radius * radial,
        z
      ));
    }
    return new THREE.CatmullRomCurve3(points, true, "centripetal", .36);
  };

  const transformedLoopSamples = (THREE, curve, rotation, zOffset, scale = [1, 1, 1], count = 192) => {
    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], "XYZ");
    const scaleVector = new THREE.Vector3(scale[0], scale[1], scale[2]);
    return curve.getSpacedPoints(count).slice(0, -1).map(point => {
      point.multiply(scaleVector).applyEuler(euler);
      point.z += zOffset;
      return point;
    });
  };

  const measureLoopClearance = (pointsA, pointsB) => {
    let minimum = Infinity;
    for (const pointA of pointsA) {
      for (const pointB of pointsB) {
        minimum = Math.min(minimum, pointA.distanceTo(pointB));
      }
    }
    return minimum;
  };

  const makeSculpturalTubeGeometry = (THREE, curve, options = {}) => {
    const tubularSegments = options.tubularSegments || 512;
    const radialSegments = options.radialSegments || 64;
    const radius = options.radius || .16;
    const depthRatio = options.depthRatio || .7;
    const phase = options.phase || 0;
    const swell = options.swell ?? .07;
    const sectionExponent = options.sectionExponent ?? .82;
    const frames = curve.computeFrenetFrames(tubularSegments, true);
    const positions = [];
    const uvs = [];
    const indices = [];
    const tau = Math.PI * 2;

    for (let i = 0; i <= tubularSegments; i += 1) {
      const u = i / tubularSegments;
      const point = curve.getPointAt(u);
      const normal = frames.normals[i];
      const binormal = frames.binormals[i];
      const widthProfile = 1
        + swell * Math.sin(tau * 2 * u + phase)
        + swell * .28 * Math.cos(tau * 5 * u - phase);
      const depthProfile = 1 + swell * .42 * Math.cos(tau * 3 * u + phase);
      const halfWidth = radius * widthProfile;
      const halfDepth = radius * depthRatio * depthProfile;

      for (let j = 0; j <= radialSegments; j += 1) {
        const v = j / radialSegments;
        const angle = tau * v;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        // Softly squared bevel: broad reflective face, rounded edge transitions.
        const sectionX = Math.sign(cosine) * Math.pow(Math.abs(cosine), sectionExponent) * halfWidth;
        const sectionY = Math.sign(sine) * Math.pow(Math.abs(sine), sectionExponent) * halfDepth;
        const vertex = point.clone()
          .addScaledVector(normal, sectionX)
          .addScaledVector(binormal, sectionY);
        positions.push(vertex.x, vertex.y, vertex.z);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < tubularSegments; i += 1) {
      for (let j = 0; j < radialSegments; j += 1) {
        const a = (radialSegments + 1) * i + j;
        const b = (radialSegments + 1) * (i + 1) + j;
        const c = b + 1;
        const d = a + 1;
        indices.push(a, b, d, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  };

  const start = async () => {
    try {
      const THREE = await import(CDN);
      if (disposed || !canvas.isConnected) return;

      scene = new THREE.Scene();
      scene.environment = makeEnvironment(THREE);

      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 512;
      shadowCanvas.height = 384;
      const shadowContext = shadowCanvas.getContext("2d");
      const shadowGradient = shadowContext.createRadialGradient(256, 192, 14, 256, 192, 184);
      shadowGradient.addColorStop(0, "rgba(5,4,10,.42)");
      shadowGradient.addColorStop(.44, "rgba(8,6,14,.22)");
      shadowGradient.addColorStop(.8, "rgba(12,9,20,.06)");
      shadowGradient.addColorStop(1, "rgba(12,9,20,0)");
      shadowContext.fillStyle = shadowGradient;
      shadowContext.fillRect(0, 0, 512, 384);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      shadowTexture.colorSpace = THREE.SRGBColorSpace;
      const shadowGeometry = new THREE.PlaneGeometry(3.9, 2.95);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture, transparent: true, opacity: .68,
        depthWrite: false, toneMapped: false
      });
      const contactShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      contactShadow.position.set(0, -.08, -1.25);
      contactShadow.renderOrder = 0;
      scene.add(contactShadow);
      resources.push(shadowTexture, shadowGeometry, shadowMaterial);

      camera = new THREE.PerspectiveCamera(33, 1, .1, 40);
      camera.position.set(0, 0, 6.25);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.3 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xded5ff, 0x17131e, 1.4));

      const key = new THREE.DirectionalLight(0xffffff, 3.5);
      key.position.set(-3.5, 4.5, 5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc4a9ff, 1.85);
      fill.position.set(4, 1, 3);
      scene.add(fill);

      const strip = new THREE.DirectionalLight(0xffffff, 2.2);
      strip.position.set(1.5, -3.5, 4.5);
      scene.add(strip);

      const rim = new THREE.DirectionalLight(0xf6f1ff, 3.7);
      rim.position.set(0, 2, -4);
      scene.add(rim);

      const acid = new THREE.PointLight(0xd9e9a0, 5.5, 8, 2);
      acid.position.set(2.2, -2.2, 2.6);
      scene.add(acid);

      sculpture = new THREE.Group();
      sculpture.rotation.set(-.12, .08, -.08);
      scene.add(sculpture);

      const chromeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe2dfeb,
        metalness: 1,
        roughness: .11,
        clearcoat: 1,
        clearcoatRoughness: .02,
        envMapIntensity: 2.15
      });
      resources.push(chromeMaterial);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xa995ec,
        metalness: .045,
        roughness: .055,
        transmission: .78,
        thickness: .92,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: .04,
        attenuationColor: new THREE.Color(0xa58be8),
        attenuationDistance: .9,
        envMapIntensity: 1.95
      });
      resources.push(glassMaterial);

      const pearlMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe4dcff,
        metalness: .22,
        roughness: .15,
        clearcoat: 1,
        clearcoatRoughness: .06,
        emissive: 0x39245e,
        emissiveIntensity: .2,
        envMapIntensity: 1.7
      });
      resources.push(pearlMaterial);

      // The paths deliberately weave in depth. They cross in the camera view,
      // but their high/low passes are shaped into each loop rather than cut apart.
      const outerPath = makeWovenLoopPath(THREE, 1.32, .24, -.3, .028);
      const outerGeometry = makeSculpturalTubeGeometry(THREE, outerPath, {
        tubularSegments: 768,
        radialSegments: 88,
        radius: .16,
        depthRatio: .72,
        phase: .4,
        swell: .04,
        sectionExponent: 1.12
      });
      chromeRing = new THREE.Mesh(outerGeometry, chromeMaterial);
      chromeRing.rotation.set(1.02, .26, -.24);
      chromeRing.position.z = .3;
      sculpture.add(chromeRing);
      resources.push(outerGeometry);

      const glassPath = makeWovenLoopPath(THREE, 1.14, .31, 1.35, .042);
      const glassGeometry = makeSculpturalTubeGeometry(THREE, glassPath, {
        tubularSegments: 768,
        radialSegments: 96,
        radius: .22,
        depthRatio: .38,
        phase: 1.1,
        swell: .055,
        sectionExponent: 1.18
      });
      glassRing = new THREE.Mesh(glassGeometry, glassMaterial);
      glassRing.rotation.set(-.68, .7, .48);
      glassRing.position.z = -.6;
      glassRing.scale.setScalar(1.04);
      sculpture.add(glassRing);
      resources.push(glassGeometry);

      const bridgePath = makeWovenLoopPath(THREE, .86, .19, .75, .03);

      const chromeSamples = transformedLoopSamples(THREE, outerPath, [1.02, .26, -.24], .3);
      const glassSamples = transformedLoopSamples(THREE, glassPath, [-.68, .7, .48], -.6, [1.04, 1.04, 1.04]);
      const bridgeSamples = transformedLoopSamples(THREE, bridgePath, [.38, -.88, .22], 0, [1.12, .78, 1]);
      const clearances = [
        measureLoopClearance(chromeSamples, glassSamples) - (.16 + .22 * 1.04),
        measureLoopClearance(chromeSamples, bridgeSamples) - (.16 + .075 * 1.12),
        measureLoopClearance(glassSamples, bridgeSamples) - (.22 * 1.04 + .075 * 1.12)
      ];
      if (clearances.some(gap => gap < .035)) {
        throw new Error("Hero sculpture links are too close: " + clearances.map(value => value.toFixed(3)).join(", "));
      }
      const bridgeGeometry = makeSculpturalTubeGeometry(THREE, bridgePath, {
        tubularSegments: 768,
        radialSegments: 80,
        radius: .075,
        depthRatio: .78,
        phase: .7,
        swell: .035,
        sectionExponent: 1.12
      });
      const bridgeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf0edf6,
        metalness: .98,
        roughness: .085,
        clearcoat: 1,
        clearcoatRoughness: .025,
        envMapIntensity: 2.3
      });
      resources.push(bridgeGeometry, bridgeMaterial);
      const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
      bridge.rotation.set(.38, -.88, .22);
      bridge.scale.set(1.12, .78, 1);
      bridge.position.z = 0;
      sculpture.add(bridge);

      const pearlGeometry = new THREE.SphereGeometry(.205, 112, 80);
      pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
      pearl.position.set(-.08, .08, .08);
      sculpture.add(pearl);
      resources.push(pearlGeometry);

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
          sculpture.rotation.y = .08 + pointer.x * .06 + Math.sin(elapsed * .2) * .012;
          sculpture.rotation.x = -.12 - pointer.y * .045 + Math.cos(elapsed * .17) * .008;
          sculpture.rotation.z = -.08 + Math.sin(elapsed * .13) * .006;
          pearl.position.y = .08 + Math.sin(elapsed * .85) * .02;
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
