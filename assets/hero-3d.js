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


  // A hand-shaped, variable-section sweep. Unlike a TorusGeometry, the
  // silhouette can swell, flatten and twist along its path.
  const makeSculpturalTubeGeometry = (THREE, curve, options = {}) => {
    const tubularSegments = options.tubularSegments || 288;
    const radialSegments = options.radialSegments || 40;
    const radius = options.radius || .18;
    const depthRatio = options.depthRatio || .62;
    const phase = options.phase || 0;
    const swell = options.swell ?? .15;
    const twist = options.twist || 0;
    const closed = options.closed !== false;
    const frames = curve.computeFrenetFrames(tubularSegments, closed);
    const positions = [];
    const uvs = [];
    const indices = [];
    const tau = Math.PI * 2;

    for (let i = 0; i <= tubularSegments; i += 1) {
      const u = i / tubularSegments;
      const point = curve.getPointAt(u);
      const normal = frames.normals[i];
      const binormal = frames.binormals[i];
      const swellProfile = 1
        + swell * Math.sin(tau * 2 * u + phase)
        + swell * .34 * Math.cos(tau * 5 * u - phase * .7);
      const depthProfile = 1 + .075 * Math.cos(tau * 3 * u + phase);
      const taper = closed ? 1 : .62 + .38 * Math.sin(Math.PI * u);
      const halfWidth = radius * swellProfile * taper;
      const halfDepth = radius * depthRatio * depthProfile * taper;

      for (let j = 0; j <= radialSegments; j += 1) {
        const v = j / radialSegments;
        const angle = tau * v + twist * u;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        // A softly rounded rectangular section gives the glass a ribbon-like edge.
        const sectionX = Math.sign(cosine) * Math.pow(Math.abs(cosine), .86) * halfWidth;
        const sectionY = Math.sign(sine) * Math.pow(Math.abs(sine), .86) * halfDepth;
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
      camera.position.set(0, 0, 6.7);
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
      renderer.toneMappingExposure = 1.08;
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
      sculpture.rotation.set(-.08, .12, -.12);
      sculpture.scale.setScalar(.94);
      scene.add(sculpture);

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

      // One continuous ribbon forms the sculpture. Its centerline never crosses
      // itself, and its opening stays clear around the floating pearl.
      const ribbonPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.96, .04, -.02),
        new THREE.Vector3(-.82, .58, .12),
        new THREE.Vector3(-.28, .86, .22),
        new THREE.Vector3(.38, .82, .08),
        new THREE.Vector3(.91, .42, -.14),
        new THREE.Vector3(.98, -.18, -.08),
        new THREE.Vector3(.54, -.75, .16),
        new THREE.Vector3(-.14, -.88, .24),
        new THREE.Vector3(-.78, -.58, .08)
      ], true, "catmullrom", .42);

      const ribbonGeometry = makeSculpturalTubeGeometry(THREE, ribbonPath, {
        tubularSegments: 480,
        radialSegments: 64,
        radius: .148,
        depthRatio: .56,
        phase: .55,
        swell: .12,
        twist: 0
      });
      const ribbonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xa995ec,
        metalness: .16,
        roughness: .105,
        transmission: .76,
        thickness: .92,
        ior: 1.49,
        clearcoat: 1,
        clearcoatRoughness: .045,
        attenuationColor: new THREE.Color(0xb3a0f5),
        attenuationDistance: 1.18,
        envMapIntensity: 1.95
      });
      resources.push(ribbonGeometry, ribbonMaterial);
      const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      ribbon.rotation.set(-.18, .12, -.12);
      sculpture.add(ribbon);

      const pearlGeometry = new THREE.SphereGeometry(.17, 96, 72);
      pearl = new THREE.Mesh(pearlGeometry, pearlMaterial);
      pearl.position.set(.02, -.015, .02);
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
          sculpture.rotation.y = .12 + pointer.x * .16 + Math.sin(elapsed * .18) * .022;
          sculpture.rotation.x = -.08 - pointer.y * .12 + Math.cos(elapsed * .16) * .016;
          sculpture.rotation.z = -.12 + Math.sin(elapsed * .12) * .014;
          pearl.position.y = -.015 + Math.sin(elapsed * .7) * .022;
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
