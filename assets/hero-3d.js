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
  let pearl;
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
  // Three true interlocking loops. Their centre-lines are designed as a
  // spatial chain, not three overlapping rings. The middle link passes
  // through the holes of the two outer links with a measured surface gap.
  const makeInterlockedLoopPath = (THREE, radius, plane, center, samples = 160) => {
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const cosine = Math.cos(angle) * radius;
      const sine = Math.sin(angle) * radius;
      if (plane === "xz") {
        points.push(new THREE.Vector3(center.x + cosine, center.y, center.z + sine));
      } else {
        points.push(new THREE.Vector3(center.x + cosine, center.y + sine, center.z));
      }
    }
    return new THREE.CatmullRomCurve3(points, true, "centripetal", .5);
  };

  const measureLoopClearance = (curveA, curveB) => {
    const pointsA = curveA.getSpacedPoints(192);
    const pointsB = curveB.getSpacedPoints(192);
    let minimum = Infinity;
    for (const pointA of pointsA) {
      for (const pointB of pointsB) {
        minimum = Math.min(minimum, pointA.distanceTo(pointB));
      }
    }
    return minimum;
  };

  const tubeEnvelope = (radius, depthRatio, swell) =>
    radius * Math.hypot(1 + swell * 1.28, depthRatio * (1 + swell * .42));

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

      // A restrained soft contact shadow anchors the sculpture to the dark stage.
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 512;
      shadowCanvas.height = 384;
      const shadowContext = shadowCanvas.getContext("2d");
      const shadowGradient = shadowContext.createRadialGradient(256, 192, 16, 256, 192, 184);
      shadowGradient.addColorStop(0, "rgba(5,4,10,.46)");
      shadowGradient.addColorStop(.42, "rgba(8,6,14,.25)");
      shadowGradient.addColorStop(.76, "rgba(12,9,20,.08)");
      shadowGradient.addColorStop(1, "rgba(12,9,20,0)");
      shadowContext.fillStyle = shadowGradient;
      shadowContext.fillRect(0, 0, 512, 384);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      shadowTexture.colorSpace = THREE.SRGBColorSpace;
      shadowTexture.needsUpdate = true;
      const shadowGeometry = new THREE.PlaneGeometry(3.9, 2.95);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: .72,
        depthWrite: false,
        toneMapped: false
      });
      const contactShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      contactShadow.position.set(0, -.08, -1.02);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xded5ff, 0x17131e, 1.4));

      const key = new THREE.DirectionalLight(0xffffff, 3.5);
      key.position.set(-3.5, 4.5, 5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc4a9ff, 1.8);
      fill.position.set(4, 1, 3);
      scene.add(fill);

      const strip = new THREE.DirectionalLight(0xffffff, 2.15);
      strip.position.set(1.5, -3.5, 4.5);
      scene.add(strip);

      const rim = new THREE.DirectionalLight(0xf6f1ff, 3.6);
      rim.position.set(0, 2, -4);
      scene.add(rim);

      const acid = new THREE.PointLight(0xd9e9a0, 5.5, 8, 2);
      acid.position.set(2.2, -2.2, 2.6);
      scene.add(acid);

      sculpture = new THREE.Group();
      sculpture.rotation.set(.54, .06, -.04);
      sculpture.scale.setScalar(.76);
      scene.add(sculpture);

      const chromeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe2dfeb,
        metalness: 1,
        roughness: .125,
        clearcoat: 1,
        clearcoatRoughness: .02,
        envMapIntensity: 2.1
      });
      resources.push(chromeMaterial);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x9c88e8,
        metalness: .06,
        roughness: .06,
        transmission: .66,
        thickness: .88,
        ior: 1.48,
        clearcoat: 1,
        clearcoatRoughness: .045,
        attenuationColor: new THREE.Color(0x9078d8),
        attenuationDistance: .72,
        envMapIntensity: 1.8
      });
      resources.push(glassMaterial);

      const pearlMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd6cbea,
        metalness: .22,
        roughness: .17,
        clearcoat: 1,
        clearcoatRoughness: .06,
        emissive: 0x39245e,
        emissiveIntensity: .18,
        envMapIntensity: 1.8
      });
      resources.push(pearlMaterial);

      // The three links are real spatial neighbours:
      // left chrome <-> central violet and central violet <-> right silver.
      // The outside links stay apart, so no two swept surfaces can slice through.
      const chromePath = makeInterlockedLoopPath(
        THREE, .98, "xy", new THREE.Vector3(-1.18, 0, 0)
      );
      const glassPath = makeInterlockedLoopPath(
        THREE, 1.16, "xz", new THREE.Vector3(0, 0, 0)
      );
      const bridgePath = makeInterlockedLoopPath(
        THREE, .82, "xy", new THREE.Vector3(1.18, 0, 0)
      );

      const chromeRadius = .17;
      const glassRadius = .205;
      const bridgeRadius = .13;
      const chromeDepth = .56;
      const glassDepth = .38;
      const bridgeDepth = .65;
      const chromeSwell = .035;
      const glassSwell = .04;
      const bridgeSwell = .03;
      const clearanceChecks = [
        [chromePath, glassPath, tubeEnvelope(chromeRadius, chromeDepth, chromeSwell), tubeEnvelope(glassRadius, glassDepth, glassSwell)],
        [glassPath, bridgePath, tubeEnvelope(glassRadius, glassDepth, glassSwell), tubeEnvelope(bridgeRadius, bridgeDepth, bridgeSwell)],
        [chromePath, bridgePath, tubeEnvelope(chromeRadius, chromeDepth, chromeSwell), tubeEnvelope(bridgeRadius, bridgeDepth, bridgeSwell)]
      ];
      clearanceChecks.forEach(([pathA, pathB, envelopeA, envelopeB]) => {
        const gap = measureLoopClearance(pathA, pathB) - envelopeA - envelopeB;
        if (gap < .05) {
          throw new Error(`Interlocked sculpture clearance too small: ${gap.toFixed(3)}`);
        }
      });

      const chromeGeometry = makeSculpturalTubeGeometry(THREE, chromePath, {
        tubularSegments: 768,
        radialSegments: 88,
        radius: chromeRadius,
        depthRatio: chromeDepth,
        phase: .42,
        swell: chromeSwell,
        sectionExponent: 1.42
      });
      const chromeLink = new THREE.Mesh(chromeGeometry, chromeMaterial);
      sculpture.add(chromeLink);
      resources.push(chromeGeometry);

      const glassGeometry = makeSculpturalTubeGeometry(THREE, glassPath, {
        tubularSegments: 768,
        radialSegments: 96,
        radius: glassRadius,
        depthRatio: glassDepth,
        phase: 1.08,
        swell: glassSwell,
        sectionExponent: 1.72
      });
      const glassLink = new THREE.Mesh(glassGeometry, glassMaterial);
      sculpture.add(glassLink);
      resources.push(glassGeometry);

      const bridgeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf0edf6,
        metalness: .98,
        roughness: .085,
        clearcoat: 1,
        clearcoatRoughness: .025,
        envMapIntensity: 2.3
      });
      resources.push(bridgeMaterial);
      const bridgeGeometry = makeSculpturalTubeGeometry(THREE, bridgePath, {
        tubularSegments: 768,
        radialSegments: 80,
        radius: bridgeRadius,
        depthRatio: bridgeDepth,
        phase: .72,
        swell: bridgeSwell,
        sectionExponent: 1.42
      });
      const bridgeLink = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
      sculpture.add(bridgeLink);
      resources.push(bridgeGeometry);

      const pearlGeometry = new THREE.SphereGeometry(.195, 112, 80);
      pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
      pearl.position.set(0, .025, .12);
      sculpture.add(pearl);
      resources.push(pearlGeometry);

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
          sculpture.rotation.y = .06 + pointer.x * .055 + Math.sin(elapsed * .2) * .009;
          sculpture.rotation.x = .54 - pointer.y * .045 + Math.cos(elapsed * .17) * .008;
          sculpture.rotation.z = -.04 + Math.sin(elapsed * .13) * .006;
          pearl.position.y = .025 + Math.sin(elapsed * .85) * .018;
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
