// ORBE & ONIX — procedural 3D hero sculpture, rendered with Three.js.
(() => {
  const host = document.querySelector("[data-hero-3d]");
  if (!host) return;

  const canvas = host.querySelector("canvas");
  const stage = host.closest(".hero-v07-stage");
  if (!canvas || !stage) return;

  // Opt-in browser diagnostics. Nothing is displayed unless ?debug3d=1 is present.
  const debug3DEnabled = new URLSearchParams(window.location.search).get("debug3d") === "1";
  let debug3DPanel = null;
  const debug3DLog = [];
  const debug3D = (label, details = null) => {
    const entry = { time: new Date().toLocaleTimeString(), label, details };
    debug3DLog.push(entry);
    if (debug3DLog.length > 12) debug3DLog.shift();
    if (!debug3DEnabled) return;
    if (!debug3DPanel) {
      debug3DPanel = document.createElement("pre");
      debug3DPanel.setAttribute("role", "status");
      debug3DPanel.style.cssText = [
        "position:fixed", "top:8px", "left:8px", "right:8px",
        "z-index:2147483647", "max-height:48vh", "overflow:auto",
        "margin:0", "padding:12px", "border:1px solid #a995ec",
        "border-radius:8px", "background:rgba(10,9,16,.96)",
        "color:#f0edff", "font:11px/1.5 ui-monospace,monospace",
        "white-space:pre-wrap", "overflow-wrap:anywhere",
        "pointer-events:none", "box-shadow:0 8px 32px #0009"
      ].join(";");
      document.body.appendChild(debug3DPanel);
    }
    debug3DPanel.textContent = "ORBE & ONIX · 3D DIAGNOSTIC\n"
      + debug3DLog.map(item => item.time + " · " + item.label
        + (item.details ? "\n" + JSON.stringify(item.details) : "")).join("\n\n");
  };
  const errorText = error => error && (error.stack || error.message)
    ? String(error.stack || error.message)
    : String(error);

  debug3D("script-start", {
    viewport: [window.innerWidth, window.innerHeight],
    devicePixelRatio: window.devicePixelRatio,
    stage: [Math.round(stage.getBoundingClientRect().width), Math.round(stage.getBoundingClientRect().height)],
    host: [Math.round(host.getBoundingClientRect().width), Math.round(host.getBoundingClientRect().height)]
  });
  window.addEventListener("error", event => debug3D("window-error", {
    message: event.message, file: event.filename, line: event.lineno, column: event.colno
  }));
  window.addEventListener("unhandledrejection", event => debug3D("unhandled-rejection", {
    reason: errorText(event.reason)
  }));

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
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0 };
  const resources = [];

  const fallback = error => {
    debug3D("fallback", error ? { error: errorText(error) } : null);
    host.classList.remove("is-ready", "has-3d-orbits");
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
      debug3D("three-import-start", { url: CDN });
      const THREE = await import(CDN);
      debug3D("three-import-ok", { revision: THREE.REVISION });
      if (disposed || !canvas.isConnected) return;

      scene = new THREE.Scene();
      scene.environment = makeEnvironment(THREE);
      const isStudyScene = stage.hasAttribute("data-sculpture-stage");

      // 3D orbital guides replace the former flat CSS ellipses.
      // Kepler's equation gives each satellite a natural speed increase at periapsis.
      const TAU = Math.PI * 2;
      let motionElapsed = 0;
      let entranceElapsed = 0;
      let entranceActive = isStudyScene && !reducedMotion;
      let entranceScale = isStudyScene && !reducedMotion ? .001 : 1;
      let sculptureBaseScale = 1;
      const orbitStates = [];
      const clamp01 = value => Math.max(0, Math.min(1, value));
      const smoothStep = value => {
        const t = clamp01(value);
        return t * t * (3 - 2 * t);
      };
      const solveOrbitPosition = (state, meanAnomaly) => {
        let eccentricAnomaly = meanAnomaly;
        for (let iteration = 0; iteration < 7; iteration += 1) {
          const error = eccentricAnomaly - state.eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
          eccentricAnomaly -= error / (1 - state.eccentricity * Math.cos(eccentricAnomaly));
        }
        return new THREE.Vector3(
          state.semiMajor * (Math.cos(eccentricAnomaly) - state.eccentricity),
          state.semiMinor * Math.sin(eccentricAnomaly),
          0
        );
      };
      const createOrbit = config => {
        const segments = 420;
        const radialSegments = 8;
        const trailCount = 22;
        const semiMinor = config.a * Math.sqrt(1 - config.e * config.e);
        const points = [];
        for (let index = 0; index < segments; index += 1) {
          const eccentricAnomaly = TAU * index / segments;
          points.push(new THREE.Vector3(
            config.a * (Math.cos(eccentricAnomaly) - config.e),
            semiMinor * Math.sin(eccentricAnomaly),
            0
          ));
        }
        const curve = new THREE.CatmullRomCurve3(points, true, "centripetal", .5);
        const group = new THREE.Group();
        group.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
        scene.add(group);

        const glowGeometry = new THREE.TubeGeometry(curve, segments, .022, radialSegments, true);
        const coreGeometry = new THREE.TubeGeometry(curve, segments, .007, radialSegments, true);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: config.color, transparent: true, opacity: .17,
          depthTest: true, depthWrite: false, toneMapped: false
        });
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: config.color, transparent: true, opacity: .78,
          depthTest: true, depthWrite: false, toneMapped: false
        });
        const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
        const coreRing = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(glowRing, coreRing);

        const markerGeometry = new THREE.SphereGeometry(.034, 20, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: config.color, toneMapped: false });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        const markerGlowGeometry = new THREE.SphereGeometry(.082, 16, 12);
        const markerGlowMaterial = new THREE.MeshBasicMaterial({
          color: config.color, transparent: true, opacity: .2,
          depthTest: true, depthWrite: false, toneMapped: false
        });
        const markerGlow = new THREE.Mesh(markerGlowGeometry, markerGlowMaterial);
        group.add(markerGlow, marker);

        const trailGeometry = new THREE.BufferGeometry();
        const trailAttribute = new THREE.BufferAttribute(new Float32Array(trailCount * 3), 3);
        trailAttribute.setUsage(THREE.DynamicDrawUsage);
        trailGeometry.setAttribute("position", trailAttribute);
        trailGeometry.setDrawRange(0, trailCount);
        const trailMaterial = new THREE.LineBasicMaterial({
          color: config.color, transparent: true, opacity: .48,
          depthTest: true, depthWrite: false, toneMapped: false
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        trail.frustumCulled = false;
        group.add(trail);

        const state = {
          group, glowGeometry, coreGeometry, marker, markerGlow,
          trailGeometry, trailAttribute, trail,
          semiMajor: config.a, semiMinor, eccentricity: config.e,
          meanAnomaly: config.phase, meanMotion: TAU / config.period,
          direction: config.direction, drawDelay: config.drawDelay,
          drawDuration: config.drawDuration, baseRotation: config.rotation,
          precession: config.precession, segments, radialSegments, trailCount
        };
        const initialPosition = solveOrbitPosition(state, state.meanAnomaly);
        marker.position.copy(initialPosition);
        markerGlow.position.copy(initialPosition);
        glowGeometry.setDrawRange(0, reducedMotion ? glowGeometry.index.count : 0);
        coreGeometry.setDrawRange(0, reducedMotion ? coreGeometry.index.count : 0);
        marker.visible = reducedMotion;
        markerGlow.visible = reducedMotion;
        trail.visible = false;
        resources.push(
          glowGeometry, coreGeometry, glowMaterial, coreMaterial,
          markerGeometry, markerMaterial, markerGlowGeometry, markerGlowMaterial,
          trailGeometry, trailMaterial
        );
        return state;
      };

      if (isStudyScene) orbitStates.push(
        createOrbit({
          a: 1.92, b: 1.18, e: .18, period: 17.5, direction: 1,
          phase: .35, drawDelay: 0, drawDuration: .86,
          rotation: [.76, .18, -.38], precession: .035, color: 0xbba7ff
        }),
        createOrbit({
          a: 1.7, b: 1.42, e: .24, period: 22.5, direction: -1,
          phase: 2.2, drawDelay: .16, drawDuration: .92,
          rotation: [-.62, .58, .3], precession: -.027, color: 0x70e5f5
        })
      );
      if (isStudyScene) stage.classList.add("has-3d-orbits");

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
      camera.position.set(0, 0, isStudyScene ? 5.4 : 6.25);
      camera.lookAt(0, 0, 0);
      let targetCameraZ = camera.position.z;
      let cameraFramingScale = 1;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      const diagnosticGL = renderer.getContext();
      debug3D("webgl-context-created", {
        version: diagnosticGL.getParameter(diagnosticGL.VERSION),
        shadingLanguage: diagnosticGL.getParameter(diagnosticGL.SHADING_LANGUAGE_VERSION),
        maxTextureSize: diagnosticGL.getParameter(diagnosticGL.MAX_TEXTURE_SIZE),
        contextLost: diagnosticGL.isContextLost()
      });
      // A successful Three.js render is the reliable readiness signal.
      // Reading pixels from the default framebuffer is not reliable on every
      // mobile browser when preserveDrawingBuffer is disabled: Safari may
      // return transparent pixels after presentation even when the scene drew.
      const revealCanvasWhenDrawn = () => {
        if (!renderer || disposed) return;
        try {
          const gl = renderer.getContext();
          const hasDrawCalls = renderer.info && renderer.info.render && renderer.info.render.calls > 0;
          if (!gl.isContextLost() && hasDrawCalls) {
            host.classList.add("is-ready");
            host.classList.remove("is-fallback");
            return;
          }
        } catch (error) {
          console.warn("ORBE & ONIX WebGL readiness check failed.", error);
        }
        host.classList.remove("is-ready");
        host.classList.add("is-fallback");
      };
      canvas.addEventListener("webglcontextlost", () => {
        host.classList.remove("is-ready");
        host.classList.add("is-fallback");
      }, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.65));
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

      const lightRig = { key, fill, strip, rim, acid };
      const lightPresets = {
        studio: {
          key: 3.5, fill: 1.85, strip: 2.2, rim: 3.7, acid: 5.5, exposure: 1.04,
          colors: [0xffffff, 0xc4a9ff, 0xffffff, 0xf6f1ff, 0xd9e9a0],
          label: "STUDIO / 01"
        },
        soft: {
          key: 2.65, fill: 2.55, strip: 1.45, rim: 2.75, acid: 2.25, exposure: 1.08,
          colors: [0xe9e2ff, 0xb8a8ed, 0xf3edff, 0xded2ff, 0xc9d2a8],
          label: "SOFT / 02"
        },
        contrast: {
          key: 4.9, fill: .9, strip: 3.25, rim: 4.45, acid: 3.5, exposure: 1.0,
          colors: [0xffffff, 0x8f7bd0, 0xffffff, 0xffffff, 0xe2ed9b],
          label: "CONTRAST / 03"
        }
      };
      const lightingButtons = [...document.querySelectorAll("[data-light-preset]")];
      const lightStatus = document.querySelector("[data-light-status]");
      const sceneFrame = stage.closest(".study-scene-frame");
      let activeLightPreset = "studio";
      if (sceneFrame) sceneFrame.dataset.lightPreset = activeLightPreset;
      let lightingTarget = lightPresets.studio;
      let lightTransitionActive = false;

      const applyLighting = alpha => {
        const target = lightingTarget;
        const lightValues = [
          [lightRig.key, target.key],
          [lightRig.fill, target.fill],
          [lightRig.strip, target.strip],
          [lightRig.rim, target.rim],
          [lightRig.acid, target.acid]
        ];
        lightValues.forEach(([light, intensity]) => {
          light.intensity += (intensity - light.intensity) * alpha;
        });
        const rigLights = [lightRig.key, lightRig.fill, lightRig.strip, lightRig.rim, lightRig.acid];
        rigLights.forEach((light, index) => {
          light.color.lerp(new THREE.Color(target.colors[index]), alpha);
        });
        renderer.toneMappingExposure += (target.exposure - renderer.toneMappingExposure) * alpha;

        const intensityRemaining = lightValues.some(([light, intensity]) =>
          Math.abs(light.intensity - intensity) > .012
        );
        const colorRemaining = rigLights.some((light, index) => {
          const targetColor = new THREE.Color(target.colors[index]);
          const colorDelta = Math.abs(light.color.r - targetColor.r)
            + Math.abs(light.color.g - targetColor.g)
            + Math.abs(light.color.b - targetColor.b);
          return colorDelta > .006;
        });
        lightTransitionActive = intensityRemaining || colorRemaining
          || Math.abs(renderer.toneMappingExposure - target.exposure) > .002;
        if (!lightTransitionActive) {
          lightValues.forEach(([light, intensity]) => { light.intensity = intensity; });
          rigLights.forEach((light, index) => light.color.setHex(target.colors[index]));
          renderer.toneMappingExposure = target.exposure;
        }
      };

      sculpture = new THREE.Group();
      sculpture.rotation.set(-.12, .08, -.08);
      scene.add(sculpture);

      const chromeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe2dfeb,
        metalness: 1,
        roughness: .11,
        clearcoat: 1,
        clearcoatRoughness: .02,
        sheen: isStudyScene ? .08 : 0,
        sheenRoughness: .3,
        sheenColor: new THREE.Color(0xd8d0ff),
        iridescence: isStudyScene ? .055 : 0,
        iridescenceIOR: 1.25,
        iridescenceThicknessRange: [120, 220],
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
        sheen: isStudyScene ? .12 : 0,
        sheenRoughness: .28,
        sheenColor: new THREE.Color(0xc7b8ff),
        iridescence: isStudyScene ? .075 : 0,
        iridescenceIOR: 1.28,
        iridescenceThicknessRange: [110, 260],
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

      const tubeSegments = 768;

      // The paths deliberately weave in depth. They cross in the camera view,
      // but their high/low passes are shaped into each loop rather than cut apart.
      const outerPath = makeWovenLoopPath(THREE, 1.32, .24, -.3, .028);
      const outerGeometry = makeSculpturalTubeGeometry(THREE, outerPath, {
        tubularSegments: tubeSegments,
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
        tubularSegments: tubeSegments,
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
      debug3D("sculpture-built", {
        children: sculpture.children.length,
        clearances: clearances.map(value => Number(value.toFixed(3))),
        tubeSegments
      });
      const bridgeGeometry = makeSculpturalTubeGeometry(THREE, bridgePath, {
        tubularSegments: tubeSegments,
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
        iridescence: isStudyScene ? .045 : 0,
        iridescenceIOR: 1.22,
        iridescenceThicknessRange: [130, 210],
        envMapIntensity: 2.3
      });
      resources.push(bridgeGeometry, bridgeMaterial);
      const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
      bridge.rotation.set(.38, -.88, .22);
      bridge.scale.set(1.12, .78, 1);
      bridge.position.z = 0;
      sculpture.add(bridge);

      const materialFocusMaterials = {
        chrome: chromeMaterial,
        glass: glassMaterial,
        silver: bridgeMaterial
      };
      const materialFocusTargets = {
        chrome: {
          chrome: { env: 2.72, roughness: .082 },
          glass: { env: 1.62, roughness: .09, transmission: .7 },
          silver: { env: 1.82, roughness: .125 }
        },
        glass: {
          chrome: { env: 1.78, roughness: .135 },
          glass: { env: 2.55, roughness: .042, transmission: .87 },
          silver: { env: 1.82, roughness: .125 }
        },
        silver: {
          chrome: { env: 1.78, roughness: .135 },
          glass: { env: 1.58, roughness: .095, transmission: .69 },
          silver: { env: 2.86, roughness: .064 }
        }
      };
      let activeMaterialKey = "chrome";
      let materialFocusActive = !reducedMotion;

      const applyMaterialFocus = alpha => {
        const targets = materialFocusTargets[activeMaterialKey];
        let remaining = false;
        Object.entries(materialFocusMaterials).forEach(([key, material]) => {
          const target = targets[key];
          material.envMapIntensity += (target.env - material.envMapIntensity) * alpha;
          material.roughness += (target.roughness - material.roughness) * alpha;
          if (key === "glass" && target.transmission !== undefined) {
            material.transmission += (target.transmission - material.transmission) * alpha;
          }
          const transmissionRemaining = key === "glass" && target.transmission !== undefined
            ? Math.abs(target.transmission - material.transmission) > .003
            : false;
          if (
            Math.abs(target.env - material.envMapIntensity) > .008 ||
            Math.abs(target.roughness - material.roughness) > .0015 ||
            transmissionRemaining
          ) remaining = true;
        });
        materialFocusActive = remaining;
        if (!remaining) {
          Object.entries(materialFocusMaterials).forEach(([key, material]) => {
            const target = targets[key];
            material.envMapIntensity = target.env;
            material.roughness = target.roughness;
            if (key === "glass" && target.transmission !== undefined) {
              material.transmission = target.transmission;
            }
          });
        }
      };

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
        const hostRect = host.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(hostRect.width || stageRect.width || window.innerWidth));
        const height = Math.max(1, Math.round(hostRect.height || stageRect.height || window.innerHeight));
        const aspect = width / height;

        // Keep the camera and desktop sculpture size unchanged. Scale only the
        // study object, proportionally to the real 3D frame dimensions.
        // 520 × 420 px is the reference frame; small screens scale down smoothly.
        if (isStudyScene) {
          const responsiveScale = Math.max(.42, Math.min(1, width / 520, height / 420));
          sculptureBaseScale = responsiveScale;
          sculpture.scale.setScalar(responsiveScale * entranceScale);
        } else {
          sculptureBaseScale = 1;
          sculpture.scale.setScalar(entranceScale);
        }
        cameraFramingScale = 1;
        camera.position.z = targetCameraZ;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.25 : 1.65
        ));
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
        revealCanvasWhenDrawn();
        debug3D("resize-render", {
          viewport: [window.innerWidth, window.innerHeight],
          stage: [Math.round(stageRect.width), Math.round(stageRect.height)],
          host: [Math.round(hostRect.width), Math.round(hostRect.height)],
          canvas: [canvas.width, canvas.height],
          cssCanvas: [Math.round(canvas.getBoundingClientRect().width), Math.round(canvas.getBoundingClientRect().height)],
          objectScale: Number(sculpture.scale.x.toFixed(3)),
          cameraZ: Number(camera.position.z.toFixed(3)),
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          contextLost: renderer.getContext().isContextLost()
        });
      };

      if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resizeObserver.observe(stage);
        const sceneFrame = stage.closest(".study-scene-frame");
        if (sceneFrame) resizeObserver.observe(sceneFrame);
      }
      window.addEventListener("resize", resize, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", resize, { passive: true });
      }
      resources.push({
        dispose: () => {
          window.removeEventListener("resize", resize);
          if (window.visualViewport) window.visualViewport.removeEventListener("resize", resize);
        }
      });
      resize();
      requestAnimationFrame(resize);

      const timer = new THREE.Timer();
      timer.connect(document);
      resources.push({ dispose: () => timer.dispose() });
      let motionPlaying = !reducedMotion;
      let rotationSpeed = .16;
      let rotationPhase = 0;
      let viewRotation = { x: -.12, y: .08, z: -.08 };
      let targetViewRotation = { ...viewRotation };
      let viewTransitionActive = false;
      const drag = { active: false, pointerId: null, x: 0, y: 0, lastTime: 0, velocityX: 0, velocityY: 0 };
      const dragOffset = { x: 0, y: 0 };
      let dragGliding = false;
      let dragReturning = false;
      let dragReturnVelocityX = 0;
      let dragReturnVelocityY = 0;
      let parallaxActive = false;
      const motionControls = document.querySelector("[data-sculpture-controls]");
      const exhibitionViewer = document.querySelector("[data-exhibition-viewer]");
      const fullscreenButton = document.querySelector("[data-exhibition-fullscreen]");
      const fullscreenLabel = fullscreenButton?.querySelector("[data-fullscreen-label]");
      const syncFullscreenState = () => {
        const active = Boolean(exhibitionViewer && document.fullscreenElement === exhibitionViewer);
        if (fullscreenButton) fullscreenButton.setAttribute("aria-pressed", String(active));
        if (fullscreenLabel) fullscreenLabel.textContent = active ? "Quitter le plein écran" : "Mode exposition";
        if (exhibitionViewer) exhibitionViewer.classList.toggle("is-fullscreen", active);
      };
      if (fullscreenButton && exhibitionViewer?.requestFullscreen) {
        fullscreenButton.addEventListener("click", async () => {
          try {
            if (document.fullscreenElement === exhibitionViewer) {
              await document.exitFullscreen();
            } else if (!document.fullscreenElement) {
              await exhibitionViewer.requestFullscreen();
            }
          } catch (error) {
            if (fullscreenLabel) fullscreenLabel.textContent = "Plein écran indisponible";
          }
        });
        document.addEventListener("fullscreenchange", syncFullscreenState);
      } else if (fullscreenButton) {
        fullscreenButton.hidden = true;
      }
      const motionToggle = motionControls?.querySelector("[data-motion-toggle]");
      const motionLabel = motionControls?.querySelector("[data-motion-label]");
      const motionStatus = motionControls?.querySelector("[data-motion-status]");
      const speedButtons = motionControls ? [...motionControls.querySelectorAll("[data-motion-speed]")] : [];
      const viewButtons = motionControls ? [...motionControls.querySelectorAll("[data-sculpture-view]")] : [];
      const resetButton = motionControls?.querySelector("[data-sculpture-reset]");
      const captureButton = motionControls?.querySelector("[data-sculpture-capture]");
      const captureStatus = motionControls?.querySelector("[data-capture-status]");
      const lightButtons = motionControls ? [...motionControls.querySelectorAll("[data-light-preset]")] : [];
      const galleryButtons = [...document.querySelectorAll("[data-study-gallery-view]")];
      const viewPresets = {
        front: { x: -.12, y: .08, z: -.08, cameraZ: targetCameraZ },
        "three-quarter": { x: -.12, y: .62, z: -.08, cameraZ: targetCameraZ - .18 },
        side: { x: -.04, y: 1.48, z: -.035, cameraZ: targetCameraZ + .28 }
      };

      const hasActiveAnimation = () => motionPlaying || entranceActive || drag.active || dragGliding || dragReturning || parallaxActive || viewTransitionActive || lightTransitionActive || materialFocusActive;
      const approachAngle = (current, target, amount) => {
        const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
        return current + difference * amount;
      };

      const updateMotionControls = () => {
        if (motionToggle) {
          motionToggle.setAttribute("aria-pressed", String(motionPlaying));
          motionToggle.classList.toggle("is-playing", motionPlaying);
        }
        if (motionLabel) motionLabel.textContent = reducedMotion ? "Mouvement réduit" : (motionPlaying ? "Mettre en pause" : "Reprendre le mouvement");
        if (motionStatus) motionStatus.textContent = reducedMotion ? "Mode mouvement réduit" : (motionPlaying ? "Mouvement actif" : "Mouvement en pause");
        if (motionToggle) motionToggle.disabled = reducedMotion;
        speedButtons.forEach(button => {
          button.setAttribute("aria-pressed", String(Number(button.dataset.motionSpeed) === rotationSpeed));
        });
        viewButtons.forEach(button => {
          button.setAttribute("aria-pressed", String(button.dataset.sculptureView === activeView));
        });
        lightButtons.forEach(button => {
          button.setAttribute("aria-pressed", String(button.dataset.lightPreset === activeLightPreset));
        });
        if (lightStatus) lightStatus.textContent = lightPresets[activeLightPreset].label;
      };
      let activeView = "front";

      const setLightingPreset = keyName => {
        const preset = lightPresets[keyName];
        if (!preset) return;
        activeLightPreset = keyName;
        if (sceneFrame) sceneFrame.dataset.lightPreset = keyName;
        lightingTarget = preset;
        lightTransitionActive = true;
        updateMotionControls();
        if (reducedMotion) {
          applyLighting(1);
          renderer.render(scene, camera);
        } else {
          startLoop();
        }
      };

      const partDetails = {
        chrome: {
          index: "01 / MATIÈRE SÉLECTIONNÉE",
          title: "Chrome poli",
          copy: "La boucle extérieure porte la structure. Sa surface miroir capte les grandes sources de lumière et fait lire le volume par contraste.",
          finish: "Mirror polish",
          role: "Structure extérieure",
          reading: "Reflet & contraste"
        },
        glass: {
          index: "02 / MATIÈRE SÉLECTIONNÉE",
          title: "Verre lavande",
          copy: "Le ruban central apporte la couleur et la profondeur. Ses bords adoucis révèlent la transparence sans perdre la présence de la matière.",
          finish: "Optical glass · lavender",
          role: "Volume central",
          reading: "Transmission & teinte"
        },
        silver: {
          index: "03 / MATIÈRE SÉLECTIONNÉE",
          title: "Argent satiné",
          copy: "La petite boucle intérieure précise la composition. Son reflet plus doux conduit le regard vers la perle centrale.",
          finish: "Soft silver",
          role: "Liaison intérieure",
          reading: "Ligne & précision"
        }
      };
      const partTriggers = [...document.querySelectorAll("[data-study-part]")];
      const partDetail = document.querySelector("[data-study-detail]");
      const selectStudyPart = keyName => {
        const detail = partDetails[keyName];
        if (!detail) return;
        activeMaterialKey = keyName;
        materialFocusActive = !reducedMotion;
        if (reducedMotion) applyMaterialFocus(1);
        partTriggers.forEach(button => {
          const selected = button.dataset.studyPart === keyName;
          button.setAttribute("aria-pressed", String(selected));
          button.classList.toggle("is-active", selected);
        });
        document.querySelectorAll("[data-material-card]").forEach(card => {
          card.classList.toggle("is-active", card.dataset.materialCard === keyName);
        });
        if (!partDetail) return;
        const fields = {
          "[data-part-index]": detail.index,
          "[data-part-title]": detail.title,
          "[data-part-copy]": detail.copy,
          "[data-part-finish]": detail.finish,
          "[data-part-role]": detail.role,
          "[data-part-reading]": detail.reading
        };
        Object.entries(fields).forEach(([selector, value]) => {
          const node = partDetail.querySelector(selector);
          if (node) node.textContent = value;
        });
      };
      partTriggers.forEach(button => {
        button.addEventListener("click", () => {
          selectStudyPart(button.dataset.studyPart);
          if (reducedMotion) {
            renderer.render(scene, camera);
          } else {
            startLoop();
          }
        });
      });
      if (partTriggers.length) selectStudyPart("chrome");

      const renderFrame = timestamp => {
        animationFrame = 0;
        if (disposed || !visible || document.hidden || !renderer) return;
        timer.update(timestamp);
        const delta = Math.min(.05, Math.max(0, timer.getDelta()));
        if (motionPlaying && isStudyScene) motionElapsed += delta;
        const elapsed = isStudyScene ? motionElapsed : timer.getElapsed();
        if (motionPlaying && !isStudyScene) rotationPhase = (rotationPhase + delta * rotationSpeed) % TAU;

        if (viewTransitionActive) {
          const transitionAmount = 1 - Math.exp(-delta * 3.4);
          viewRotation.x = approachAngle(viewRotation.x, targetViewRotation.x, transitionAmount);
          viewRotation.y = approachAngle(viewRotation.y, targetViewRotation.y, transitionAmount);
          viewRotation.z = approachAngle(viewRotation.z, targetViewRotation.z, transitionAmount);
          const fittedCameraZ = targetCameraZ * cameraFramingScale;
          camera.position.z += (fittedCameraZ - camera.position.z) * transitionAmount;
          const rotationRemaining = Math.max(
            Math.abs(Math.atan2(Math.sin(targetViewRotation.x - viewRotation.x), Math.cos(targetViewRotation.x - viewRotation.x))),
            Math.abs(Math.atan2(Math.sin(targetViewRotation.y - viewRotation.y), Math.cos(targetViewRotation.y - viewRotation.y))),
            Math.abs(Math.atan2(Math.sin(targetViewRotation.z - viewRotation.z), Math.cos(targetViewRotation.z - viewRotation.z)))
          );
          if (rotationRemaining < .001 && Math.abs(fittedCameraZ - camera.position.z) < .001) {
            viewRotation = { ...targetViewRotation };
            camera.position.z = fittedCameraZ;
            viewTransitionActive = false;
            stage.classList.remove("is-view-transitioning");
          }
        }

        if (lightTransitionActive) applyLighting(1 - Math.exp(-delta * 3.1));
        if (materialFocusActive) applyMaterialFocus(1 - Math.exp(-delta * 3.8));

        // Critically damped cursor spring is reserved for the Form in Light study.
        if (!reducedMotion && isStudyScene) {
          const omega = 5.8;
          const accelerationX = omega * omega * (pointer.targetX - pointer.x) - 2 * omega * pointer.velocityX;
          const accelerationY = omega * omega * (pointer.targetY - pointer.y) - 2 * omega * pointer.velocityY;
          pointer.velocityX += accelerationX * delta;
          pointer.velocityY += accelerationY * delta;
          pointer.x += pointer.velocityX * delta;
          pointer.y += pointer.velocityY * delta;
          parallaxActive = Math.abs(pointer.targetX - pointer.x) > .001
            || Math.abs(pointer.targetY - pointer.y) > .001
            || Math.abs(pointer.velocityX) > .002
            || Math.abs(pointer.velocityY) > .002;
        } else if (!reducedMotion && !isStudyScene) {
          pointer.x += (pointer.targetX - pointer.x) * .025;
          pointer.y += (pointer.targetY - pointer.y) * .025;
          parallaxActive = Math.abs(pointer.targetX - pointer.x) > .001 || Math.abs(pointer.targetY - pointer.y) > .001;
        }

        // Exponential angular damping (0.8 s half-life), then critically damped return.
        if (!drag.active && dragGliding) {
          dragOffset.x += drag.velocityX * delta;
          dragOffset.y += drag.velocityY * delta;
          const damping = Math.exp(-Math.LN2 * delta / .8);
          drag.velocityX *= damping;
          drag.velocityY *= damping;
          if (Math.hypot(drag.velocityX, drag.velocityY) < .018) {
            drag.velocityX = 0;
            drag.velocityY = 0;
            dragGliding = false;
            dragReturning = true;
            dragReturnVelocityX = 0;
            dragReturnVelocityY = 0;
          }
        }
        if (!drag.active && dragReturning) {
          const omega = 3.1;
          const accelerationX = -2 * omega * dragReturnVelocityX - omega * omega * dragOffset.x;
          const accelerationY = -2 * omega * dragReturnVelocityY - omega * omega * dragOffset.y;
          dragReturnVelocityX += accelerationX * delta;
          dragReturnVelocityY += accelerationY * delta;
          dragOffset.x += dragReturnVelocityX * delta;
          dragOffset.y += dragReturnVelocityY * delta;
          if (
            Math.abs(dragOffset.x) < .001 && Math.abs(dragOffset.y) < .001
            && Math.abs(dragReturnVelocityX) < .002 && Math.abs(dragReturnVelocityY) < .002
          ) {
            dragOffset.x = 0;
            dragOffset.y = 0;
            dragReturnVelocityX = 0;
            dragReturnVelocityY = 0;
            dragReturning = false;
          }
        }

        // Trace the 3D ellipses; depth testing decides which arc passes in front.
        orbitStates.forEach(state => {
          const rawProgress = reducedMotion ? 1 : (entranceElapsed - state.drawDelay) / state.drawDuration;
          const progress = smoothStep(rawProgress);
          const indexCount = Math.floor(state.segments * progress) * state.radialSegments * 6;
          state.glowGeometry.setDrawRange(0, Math.min(indexCount, state.glowGeometry.index.count));
          state.coreGeometry.setDrawRange(0, Math.min(indexCount, state.coreGeometry.index.count));
          state.marker.visible = progress >= .78;
          state.markerGlow.visible = progress >= .78;
          state.trail.visible = motionPlaying && progress >= .9;
          if (motionPlaying) {
            state.meanAnomaly += state.direction * state.meanMotion * delta;
            state.group.rotation.x = state.baseRotation[0] + Math.sin(motionElapsed * .19 + state.drawDelay) * .055;
            state.group.rotation.y = state.baseRotation[1] + Math.cos(motionElapsed * .15 + state.drawDelay) * .07;
            state.group.rotation.z += state.precession * delta;
          }
          const markerPosition = solveOrbitPosition(state, state.meanAnomaly);
          state.marker.position.copy(markerPosition);
          state.markerGlow.position.copy(markerPosition);
          for (let index = 0; index < state.trailCount; index += 1) {
            const trailAge = index / (state.trailCount - 1) * .42;
            const trailPosition = solveOrbitPosition(
              state, state.meanAnomaly - state.direction * state.meanMotion * trailAge
            );
            state.trailAttribute.setXYZ(index, trailPosition.x, trailPosition.y, trailPosition.z);
          }
          state.trailAttribute.needsUpdate = true;
        });

        // Orbit draw-in, followed by a spring reveal with a small overshoot.
        if (entranceActive) {
          entranceElapsed += delta;
          const popTime = clamp01((entranceElapsed - .28) / 1.32);
          const dampingRatio = .64;
          const angularFrequency = 7.2;
          const dampedFrequency = angularFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
          const springResponse = 1 - Math.exp(-dampingRatio * angularFrequency * popTime) * (
            Math.cos(dampedFrequency * popTime)
            + (dampingRatio / Math.sqrt(1 - dampingRatio * dampingRatio)) * Math.sin(dampedFrequency * popTime)
          );
          entranceScale = Math.max(.001, springResponse);
          if (popTime >= 1) {
            entranceScale = 1;
            entranceActive = false;
          }
        }

        // Rest cycles are 37 s (yaw) and 53 s (pitch) at 1×.
        // A drifting white key light moves highlights across the physical surfaces.
        const speedFactor = rotationSpeed / .16;
        if (motionPlaying && isStudyScene) {
          key.position.x = -3.5 + Math.sin(motionElapsed * TAU / 47) * .7;
          key.position.y = 4.5 + Math.cos(motionElapsed * TAU / 61) * .32;
          key.position.z = 5 + Math.sin(motionElapsed * TAU / 43) * .24;
        }
        const restYaw = motionPlaying ? (isStudyScene ? Math.sin(motionElapsed * TAU / 37 * speedFactor) * .16 : rotationPhase) : 0;
        const restPitch = motionPlaying ? (isStudyScene ? Math.sin(motionElapsed * TAU / 53 * speedFactor) * .095 : Math.sin(elapsed * .34) * .028) : 0;
        sculpture.rotation.set(
          viewRotation.x + restPitch + dragOffset.x - pointer.y * .028,
          viewRotation.y + restYaw + dragOffset.y + pointer.x * .04,
          viewRotation.z + (motionPlaying ? (isStudyScene ? Math.sin(motionElapsed * TAU / 29) * .012 : Math.sin(elapsed * .23) * .018) : 0)
        );
        sculpture.position.y = motionPlaying ? (isStudyScene ? Math.sin(motionElapsed * TAU / 8.4) * .045 : Math.sin(elapsed * .58) * .045) : 0;
        sculpture.scale.setScalar(sculptureBaseScale * entranceScale);

        renderer.render(scene, camera);
        revealCanvasWhenDrawn();
        if (hasActiveAnimation()) animationFrame = requestAnimationFrame(renderFrame);
      };

      const startLoop = () => {
        if (hasActiveAnimation() && visible && !document.hidden && !animationFrame) {
          timer.reset();
          animationFrame = requestAnimationFrame(renderFrame);
        } else if (renderer) {
          renderer.render(scene, camera);
          revealCanvasWhenDrawn();
        }
      };

      const stopLoop = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      };

      const renderStudyGallery = () => {
        const galleryImages = [...document.querySelectorAll("[data-study-render]")];
        if (!galleryImages.length || !renderer || !scene || !camera || !sculpture) return;

        // Gallery thumbnails are secondary to the live sculpture. Keep their
        // GPU cost modest on compact screens and avoid multisample buffers there.
        const compactViewport = window.matchMedia("(max-width: 760px)").matches;
        const width = compactViewport ? 360 : 720;
        const height = compactViewport ? 270 : 540;
        const ratio = renderer.getPixelRatio();
        const target = new THREE.WebGLRenderTarget(width, height, {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          depthBuffer: true,
          stencilBuffer: false,
          samples: compactViewport ? 0 : 4
        });
        target.texture.colorSpace = THREE.SRGBColorSpace;
        target.texture.generateMipmaps = false;

        const previousTarget = renderer.getRenderTarget();
        const previousViewport = renderer.getViewport(new THREE.Vector4());
        const previousScissor = renderer.getScissor(new THREE.Vector4());
        const previousScissorTest = renderer.getScissorTest();
        const previousClearColor = renderer.getClearColor(new THREE.Color()).clone();
        const previousClearAlpha = renderer.getClearAlpha();
        const previousAspect = camera.aspect;
        const previousCameraZ = camera.position.z;
        const previousRotation = sculpture.rotation.clone();
        const previousPositionY = sculpture.position.y;
        const previousScale = sculpture.scale.clone();
        const frames = [
          { key: "front", pose: viewPresets.front },
          { key: "three-quarter", pose: viewPresets["three-quarter"] },
          { key: "side", pose: viewPresets.side }
        ];

        try {
          applyMaterialFocus(1);
          renderer.setRenderTarget(target);
          renderer.setViewport(0, 0, width / ratio, height / ratio);
          renderer.setScissorTest(false);
          renderer.setClearColor(0x000000, 0);

          frames.forEach(frame => {
            const image = galleryImages.find(item => item.dataset.studyRender === frame.key);
            if (!image) return;

            sculpture.rotation.set(frame.pose.x, frame.pose.y, frame.pose.z);
            sculpture.scale.setScalar(sculptureBaseScale);
            sculpture.position.y = 0;
            camera.position.set(0, 0, frame.pose.cameraZ);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.clear(true, true, true);
            renderer.render(scene, camera);

            const pixels = new Uint8Array(width * height * 4);
            renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
            const output = document.createElement("canvas");
            output.width = width;
            output.height = height;
            const context = output.getContext("2d");
            if (!context) return;

            const imageData = context.createImageData(width, height);
            const rowLength = width * 4;
            for (let row = 0; row < height; row += 1) {
              const sourceStart = (height - row - 1) * rowLength;
              imageData.data.set(pixels.subarray(sourceStart, sourceStart + rowLength), row * rowLength);
            }
            context.putImageData(imageData, 0, 0);
            image.src = output.toDataURL("image/webp", .9);
            image.classList.add("is-rendered");
            image.closest(".study-gallery-card")?.classList.add("is-rendered");
          });
        } catch (error) {
          console.warn("ORBE & ONIX gallery renders unavailable.", error);
        } finally {
          renderer.setRenderTarget(previousTarget);
          renderer.setViewport(previousViewport);
          renderer.setScissor(previousScissor);
          renderer.setScissorTest(previousScissorTest);
          renderer.setClearColor(previousClearColor, previousClearAlpha);
          camera.aspect = previousAspect;
          camera.position.set(0, 0, previousCameraZ);
          camera.updateProjectionMatrix();
          sculpture.rotation.copy(previousRotation);
          sculpture.position.y = previousPositionY;
          sculpture.scale.copy(previousScale);
          target.dispose();
          renderer.render(scene, camera);
        }
      };

      // Do not render off-screen gallery thumbnails before the main sculpture.
      // On phones that work can compete with the first WebGL frame and exhaust
      // limited GPU memory. Render them only shortly before the gallery is seen.
      const scheduleStudyGalleryRender = () => {
        const gallerySection = document.querySelector(".study-gallery");
        if (!gallerySection) return;

        if (!("IntersectionObserver" in window)) {
          requestAnimationFrame(() => {
            if (!disposed) renderStudyGallery();
          });
          return;
        }

        const galleryObserver = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          galleryObserver.disconnect();
          if (!disposed) requestAnimationFrame(renderStudyGallery);
        }, { rootMargin: "180px 0px" });

        galleryObserver.observe(gallerySection);
        resources.push({ dispose: () => galleryObserver.disconnect() });
      };

      const captureSculpture = async () => {
        if (!renderer || !scene || !camera || !captureButton || captureButton.disabled) return;
        captureButton.disabled = true;
        if (captureStatus) captureStatus.textContent = "Préparation du PNG…";

        let target;
        let restoreRenderer = () => {};
        let outputWidth = 0;
        let outputHeight = 0;

        try {
          const bounds = host.getBoundingClientRect();
          const scale = Math.min(3, 2400 / Math.max(bounds.width, bounds.height));
          outputWidth = Math.max(1, Math.round(bounds.width * scale));
          outputHeight = Math.max(1, Math.round(bounds.height * scale));
          target = new THREE.WebGLRenderTarget(outputWidth, outputHeight, {
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            depthBuffer: true,
            stencilBuffer: false
          });
          target.texture.colorSpace = THREE.SRGBColorSpace;
          target.texture.generateMipmaps = false;

          const previousTarget = renderer.getRenderTarget();
          const previousViewport = renderer.getViewport(new THREE.Vector4());
          const previousScissor = renderer.getScissor(new THREE.Vector4());
          const previousScissorTest = renderer.getScissorTest();
          const previousClearColor = renderer.getClearColor(new THREE.Color()).clone();
          const previousClearAlpha = renderer.getClearAlpha();

          restoreRenderer = () => {
            renderer.setRenderTarget(previousTarget);
            renderer.setViewport(previousViewport);
            renderer.setScissor(previousScissor);
            renderer.setScissorTest(previousScissorTest);
            renderer.setClearColor(previousClearColor, previousClearAlpha);
            renderer.render(scene, camera);
            restoreRenderer = () => {};
          };

          renderer.setRenderTarget(target);
          renderer.setViewport(0, 0, outputWidth, outputHeight);
          renderer.setScissorTest(false);
          renderer.setClearColor(0x000000, 0);
          renderer.clear(true, true, true);
          renderer.render(scene, camera);

          const pixels = new Uint8Array(outputWidth * outputHeight * 4);
          renderer.readRenderTargetPixels(target, 0, 0, outputWidth, outputHeight, pixels);
          restoreRenderer();

          const output = document.createElement("canvas");
          output.width = outputWidth;
          output.height = outputHeight;
          const context = output.getContext("2d");
          if (!context) throw new Error("Canvas 2D context unavailable");

          const imageData = context.createImageData(outputWidth, outputHeight);
          const rowLength = outputWidth * 4;
          for (let row = 0; row < outputHeight; row += 1) {
            const sourceStart = (outputHeight - row - 1) * rowLength;
            imageData.data.set(pixels.subarray(sourceStart, sourceStart + rowLength), row * rowLength);
          }
          context.putImageData(imageData, 0, 0);

          const blob = await new Promise((resolve, reject) => {
            output.toBlob(result => {
              if (result) resolve(result);
              else reject(new Error("PNG encoding failed"));
            }, "image/png");
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "orbe-onix-etude-001-" + new Date().toISOString().slice(0, 10) + ".png";
          link.hidden = true;
          document.body.append(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);

          if (captureStatus) captureStatus.textContent = "PNG transparent exporté · " + outputWidth + " × " + outputHeight;
        } catch (error) {
          console.warn("ORBE & ONIX sculpture export failed.", error);
          if (captureStatus) captureStatus.textContent = "Export impossible. Réessayez.";
        } finally {
          restoreRenderer();
          if (target) target.dispose();
          captureButton.disabled = false;
        }
      };

      if (captureButton) {
        captureButton.addEventListener("click", captureSculpture);
      }

      if (motionToggle) {
        motionToggle.addEventListener("click", () => {
          if (reducedMotion) return;
          motionPlaying = !motionPlaying;
          timer.reset();
          if (hasActiveAnimation()) startLoop();
          else {
            stopLoop();
            sculpture.position.y = 0;
            renderer.render(scene, camera);
          }
          updateMotionControls();
        });
      }

      speedButtons.forEach(button => button.addEventListener("click", () => {
        const nextSpeed = Number(button.dataset.motionSpeed);
        if (!Number.isFinite(nextSpeed) || nextSpeed <= 0) return;
        rotationSpeed = nextSpeed;
        updateMotionControls();
      }));

      viewButtons.forEach(button => button.addEventListener("click", () => {
        const nextView = button.dataset.sculptureView;
        const preset = viewPresets[nextView];
        if (!preset) return;
        // Start the transition from the exact pose currently visible on screen.
        viewRotation = {
          x: sculpture.rotation.x,
          y: sculpture.rotation.y,
          z: sculpture.rotation.z
        };
        rotationPhase = 0;
        activeView = nextView;
        dragOffset.x = 0; dragOffset.y = 0;
        drag.velocityX = 0; drag.velocityY = 0;
        dragGliding = false; dragReturning = false;
        targetViewRotation = { x: preset.x, y: preset.y, z: preset.z };
        targetCameraZ = preset.cameraZ;
        viewTransitionActive = !reducedMotion;
        stage.classList.toggle("is-view-transitioning", viewTransitionActive);
        if (reducedMotion) {
          viewRotation = { ...targetViewRotation };
          camera.position.z = targetCameraZ * cameraFramingScale;
        }
        updateMotionControls();
        if (viewTransitionActive || hasActiveAnimation()) startLoop();
        else {
          sculpture.rotation.set(viewRotation.x, viewRotation.y, viewRotation.z);
          renderer.render(scene, camera);
        }
      }));

      lightButtons.forEach(button => button.addEventListener("click", () => {
        setLightingPreset(button.dataset.lightPreset);
      }));

      if (resetButton) {
        resetButton.addEventListener("click", () => {
          viewRotation = {
            x: sculpture.rotation.x,
            y: sculpture.rotation.y,
            z: sculpture.rotation.z
          };
          rotationPhase = 0;
          activeView = "front";
          dragOffset.x = 0; dragOffset.y = 0;
          drag.velocityX = 0; drag.velocityY = 0;
          dragGliding = false; dragReturning = false;
          targetViewRotation = { ...viewPresets.front };
          targetCameraZ = viewPresets.front.cameraZ;
          viewTransitionActive = !reducedMotion;
          stage.classList.toggle("is-view-transitioning", viewTransitionActive);
          rotationSpeed = .16;
          rotationPhase = 0;
          motionPlaying = !reducedMotion;
          selectStudyPart("chrome");
          setLightingPreset("studio");
          if (reducedMotion) {
            viewRotation = { ...targetViewRotation };
            camera.position.z = targetCameraZ * cameraFramingScale;
          }
          timer.reset();
          updateMotionControls();
          stopLoop();
          startLoop();
        });
      }
      updateMotionControls();
      scheduleStudyGalleryRender();

      galleryButtons.forEach(button => {
        button.addEventListener("click", () => {
          const viewButton = viewButtons.find(item => item.dataset.sculptureView === button.dataset.studyGalleryView);
          const lightButton = lightButtons.find(item => item.dataset.lightPreset === button.dataset.studyGalleryLight);
          lightButton?.click();
          viewButton?.click();
          document.querySelector("#explorer")?.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "center"
          });
        });
      });

      if (stage.hasAttribute("data-sculpture-stage")) {
        document.addEventListener("keydown", event => {
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
          if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;

          const triggerView = key => viewButtons.find(button => button.dataset.sculptureView === key)?.click();
          switch (event.code) {
            case "Space":
              if (motionToggle) {
                event.preventDefault();
                motionToggle.click();
              }
              break;
            case "Digit1":
            case "Numpad1":
              triggerView("front");
              break;
            case "Digit2":
            case "Numpad2":
              triggerView("three-quarter");
              break;
            case "Digit3":
            case "Numpad3":
              triggerView("side");
              break;
            case "KeyC":
              if (captureButton) {
                event.preventDefault();
                captureButton.click();
              }
              break;
            case "KeyF":
              if (fullscreenButton) {
                event.preventDefault();
                fullscreenButton.click();
              }
              break;
            default:
              break;
          }
        });
      }

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          if (visible) startLoop();
          else stopLoop();
        }, { threshold: .05 });
        observer.observe(host);
        resources.push({ dispose: () => observer.disconnect() });
      }

      if (stage.hasAttribute("data-sculpture-stage")) {
        stage.style.touchAction = "pan-y";
        stage.style.cursor = "grab";
        stage.addEventListener("pointerdown", event => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (event.target.closest("button, a")) return;
          drag.active = true;
          drag.pointerId = event.pointerId;
          drag.x = event.clientX;
          drag.y = event.clientY;
          drag.lastTime = performance.now();
          drag.velocityX = 0;
          drag.velocityY = 0;
          dragGliding = false;
          dragReturning = false;
          targetCameraZ = camera.position.z / cameraFramingScale;
          rotationPhase = 0;
          viewTransitionActive = false;
          activeView = "custom";
          pointer.targetX = 0;
          pointer.targetY = 0;
          stage.classList.remove("is-view-transitioning");
          stage.classList.add("is-dragging");
          stage.style.cursor = "grabbing";
          if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
          updateMotionControls();
          startLoop();
        });

        stage.addEventListener("pointermove", event => {
          if (drag.active && drag.pointerId === event.pointerId) {
            const now = performance.now();
            const sampleDelta = Math.max(.008, Math.min(.08, (now - drag.lastTime) / 1000 || .016));
            const deltaX = event.clientX - drag.x;
            const deltaY = event.clientY - drag.y;
            drag.x = event.clientX;
            drag.y = event.clientY;
            drag.lastTime = now;
            const pitchDelta = deltaY * .008;
            const yawDelta = deltaX * .009;
            dragOffset.x = Math.max(-1.15, Math.min(1.15, dragOffset.x + pitchDelta));
            dragOffset.y += yawDelta;
            if (!reducedMotion) {
              const pitchVelocity = pitchDelta / sampleDelta;
              const yawVelocity = yawDelta / sampleDelta;
              drag.velocityX = Math.max(-2.8, Math.min(2.8, pitchVelocity * .34 + drag.velocityX * .66));
              drag.velocityY = Math.max(-2.8, Math.min(2.8, yawVelocity * .34 + drag.velocityY * .66));
              startLoop();
            } else {
              sculpture.rotation.set(viewRotation.x + dragOffset.x, viewRotation.y + dragOffset.y, viewRotation.z);
              renderer.render(scene, camera);
            }
            return;
          }
          if (finePointer && !reducedMotion) {
            const rect = stage.getBoundingClientRect();
            pointer.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
            pointer.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
            parallaxActive = true;
            startLoop();
          }
        }, { passive: true });

        const finishDrag = event => {
          if (!drag.active || (event && event.pointerId !== drag.pointerId)) return;
          const cancelled = event?.type === "pointercancel";
          drag.active = false;
          drag.pointerId = null;
          stage.classList.remove("is-dragging");
          stage.style.cursor = "grab";
          if (stage.hasPointerCapture && stage.hasPointerCapture(event.pointerId)) {
            stage.releasePointerCapture(event.pointerId);
          }
          if (!reducedMotion && !cancelled) {
            dragGliding = Math.hypot(drag.velocityX, drag.velocityY) > .035;
            dragReturning = !dragGliding && (Math.abs(dragOffset.x) > .001 || Math.abs(dragOffset.y) > .001);
            dragReturnVelocityX = 0;
            dragReturnVelocityY = 0;
          } else {
            drag.velocityX = 0;
            drag.velocityY = 0;
            dragGliding = false;
            dragReturning = false;
          }
          updateMotionControls();
          if (hasActiveAnimation()) startLoop();
          else renderer.render(scene, camera);
        };
        stage.addEventListener("pointerup", finishDrag);
        stage.addEventListener("pointercancel", finishDrag);
        stage.addEventListener("lostpointercapture", finishDrag);
        stage.addEventListener("pointerleave", () => {
          if (!drag.active) {
            pointer.targetX = 0;
            pointer.targetY = 0;
            if (parallaxActive) startLoop();
          }
        }, { passive: true });
      } else if (finePointer && !reducedMotion) {
        stage.addEventListener("pointermove", event => {
          const rect = stage.getBoundingClientRect();
          pointer.targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
          pointer.targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
          parallaxActive = true;
          startLoop();
        }, { passive: true });
        stage.addEventListener("pointerleave", () => {
          pointer.targetX = 0;
          pointer.targetY = 0;
          if (parallaxActive) startLoop();
        }, { passive: true });
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopLoop();
        else startLoop();
      });
      startLoop();
      debug3D("start-complete", {
        hostClasses: host.className,
        canvas: [canvas.width, canvas.height],
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles
      });
    } catch (error) {
      console.warn("ORBE & ONIX 3D hero unavailable; CSS fallback enabled.", error);
      debug3D("start-error", { error: errorText(error) });
      fallback(error);
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
