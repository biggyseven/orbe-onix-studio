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

      camera = new THREE.PerspectiveCamera(33, 1, .1, 40);
      camera.position.set(0, 0, 6.25);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.85));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.HemisphereLight(0xded5ff, 0x17131e, 1.4));

      const key = new THREE.DirectionalLight(0xffffff, 4.1);
      key.position.set(-3.5, 4.5, 5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc4a9ff, 2.2);
      fill.position.set(4, 1, 3);
      scene.add(fill);

      const strip = new THREE.DirectionalLight(0xffffff, 2.6);
      strip.position.set(1.5, -3.5, 4.5);
      scene.add(strip);

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
        color: 0xe2dfeb,
        metalness: 1,
        roughness: .095,
        clearcoat: 1,
        clearcoatRoughness: .02,
        envMapIntensity: 2.35
      });
      resources.push(chromeMaterial);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xa995ec,
        metalness: .035,
        roughness: .035,
        transmission: .9,
        thickness: 1.15,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: .025,
        attenuationColor: new THREE.Color(0xa58be8),
        attenuationDistance: .82,
        envMapIntensity: 2.1
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

      // The paths deliberately weave in depth. They cross in the camera view,
      // but their high/low passes are shaped into each loop rather than cut apart.
      const outerPath = makeWovenLoopPath(THREE, 1.32, .24, -.3, .028);
      const outerGeometry = makeSculpturalTubeGeometry(THREE, outerPath, {
        tubularSegments: 640,
        radialSegments: 72,
        radius: .188,
        depthRatio: .68,
        phase: .4,
        swell: .065,
        sectionExponent: .78
      });
      chromeRing = new THREE.Mesh(outerGeometry, chromeMaterial);
      chromeRing.rotation.set(1.02, .26, -.24);
      sculpture.add(chromeRing);
      resources.push(outerGeometry);

      const glassPath = makeWovenLoopPath(THREE, 1.14, .31, 1.35, .042);
      const glassGeometry = makeSculpturalTubeGeometry(THREE, glassPath, {
        tubularSegments: 640,
        radialSegments: 80,
        radius: .255,
        depthRatio: .34,
        phase: 1.1,
        swell: .105,
        sectionExponent: .68
      });
      glassRing = new THREE.Mesh(glassGeometry, glassMaterial);
      glassRing.rotation.set(-.68, .7, .48);
      sculpture.add(glassRing);
      resources.push(glassGeometry);

      const bridgePath = makeWovenLoopPath(THREE, .86, .19, .75, .03);
      const bridgeGeometry = makeSculpturalTubeGeometry(THREE, bridgePath, {
        tubularSegments: 512,
        radialSegments: 64,
        radius: .086,
        depthRatio: .78,
        phase: .7,
        swell: .055,
        sectionExponent: .82
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
          sculpture.rotation.y = .08 + pointer.x * .16 + Math.sin(elapsed * .2) * .022;
          sculpture.rotation.x = -.12 - pointer.y * .12 + Math.cos(elapsed * .17) * .016;
          sculpture.rotation.z = -.08 + Math.sin(elapsed * .13) * .012;
          glassRing.rotation.z = .48 + Math.sin(elapsed * .14) * .012;
          chromeRing.rotation.y = .26 + Math.cos(elapsed * .12) * .01;
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
