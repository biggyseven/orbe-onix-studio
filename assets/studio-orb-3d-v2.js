/* VESPERA 2.0 — ORBE & ONIX proprietary planet engine
 * Three.js r187 · geological surface · physically layered clouds · cinematic atmosphere.
 * Load with: <script type="module" src="assets/studio-orb-3d-v2.js"></script>
 * Textures: assets/vespera-v2/{1024,2048,4096}/{color,normal,orm,clouds}.webp
 *           (made by scripts/make_vespera_v2_textures.py)
 */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';
const BASE = new URL('./vespera-v2/', import.meta.url).href;

/* ------------------------------------------------------------------ GLSL */
const COMMON = /* glsl */ `
const float PI = 3.14159265359;
vec3 acesFilm(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0);
  return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 display(vec3 c){ return toSRGB(acesFilm(c)); }
// image-space coords: u east 0..1, v 0 (north) .. 1 (south)
vec2 lonlat(vec3 p){ return vec2(atan(p.z, p.x)/(2.0*PI) + 0.5, 0.5 - asin(clamp(p.y,-1.0,1.0))/PI); }
// seam-safe derivatives (atan jumps at lon = +-PI would otherwise break mip selection)
void seamGrad(vec2 uv, out vec2 gx, out vec2 gy){
  vec2 uvB = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
  gx = dFdx(uv); gy = dFdy(uv);
  vec2 bx = dFdx(uvB), by = dFdy(uvB);
  if (dot(bx,bx) + dot(by,by) < dot(gx,gx) + dot(gy,gy)) { gx = bx; gy = by; }
}
// textures are flipY = true -> sample with 1 - v
vec4 texG(sampler2D s, vec2 uv, vec2 gx, vec2 gy){
  return textureGrad(s, vec2(uv.x, 1.0 - uv.y), vec2(gx.x, -gx.y), vec2(gy.x, -gy.y));
}
`;

const VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vWorld;
void main(){
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLANET_FRAG = /* glsl */ `
uniform sampler2D uColor; uniform sampler2D uNormal; uniform sampler2D uOrm; uniform sampler2D uClouds;
uniform vec3 uSun; uniform mat3 uModel; uniform mat3 uCloudInv; uniform float uSunPower;
varying vec3 vObj; varying vec3 vWorld;
${COMMON}
void main(){
  vec3 N = normalize(vObj);
  vec2 uv = lonlat(N);
  vec2 gx, gy; seamGrad(uv, gx, gy);
  vec3 alb = texG(uColor, uv, gx, gy).rgb;
  vec3 nm  = texG(uNormal, uv, gx, gy).xyz * 2.0 - 1.0;
  vec3 orm = texG(uOrm, uv, gx, gy).rgb;

  float lon = (uv.x - 0.5) * 2.0 * PI, lat = (0.5 - uv.y) * PI;
  vec3 east  = vec3(-sin(lon), 0.0, cos(lon));
  vec3 north = vec3(-sin(lat)*cos(lon), cos(lat), -sin(lat)*sin(lon));
  vec3 nLoc = normalize(nm.x*east + nm.y*north + nm.z*N);
  vec3 Nw = normalize(uModel * N);
  vec3 nW = normalize(uModel * nLoc);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSun);

  // soft shadow of the cloud layer, cast away from the sun
  vec3 Lt = L - Nw * dot(L, Nw);
  vec3 pc = normalize(uCloudInv * normalize(Nw - 0.020 * Lt));
  vec2 uvc = lonlat(pc);
  float shadow = textureLod(uClouds, vec2(uvc.x, 1.0 - uvc.y), 2.5).r;

  float ndl = dot(nW, L), ndlS = dot(Nw, L);
  float diff = clamp(ndl, 0.0, 1.0);
  float term = smoothstep(-0.02, 0.18, ndlS);
  vec3 H = normalize(L + V);
  float rough = clamp(orm.g, 0.25, 1.0);
  float ndv = max(dot(nW, V), 0.025);
  float ndh = clamp(dot(nW, H), 0.0, 1.0);
  float vdh = clamp(dot(V, H), 0.0, 1.0);
  float alphaR = rough * rough;
  float alpha2 = alphaR * alphaR;
  float denom = ndh*ndh*(alpha2 - 1.0) + 1.0;
  float D = alpha2 / max(PI*denom*denom, 0.0001);
  float k = pow(rough + 1.0, 2.0) * 0.125;
  float Gv = ndv / (ndv*(1.0-k) + k);
  float Gl = max(ndl, 0.0) / (max(ndl, 0.0)*(1.0-k) + k);
  vec3 F0 = vec3(0.044, 0.041, 0.052);
  vec3 F = F0 + (1.0-F0)*pow(1.0-vdh, 5.0);
  vec3 spec = D * Gv * Gl * F / max(4.0*ndv*max(ndl, 0.001), 0.001);

  vec3 sunc = vec3(1.0, 0.965, 0.94);
  vec3 amb = vec3(0.024, 0.026, 0.065);
  float cav = clamp(orm.r, 0.0, 1.0);
  vec3 diffuseAlb = alb * (1.0 - F) / PI;
  vec3 col = diffuseAlb * (1.0 - 0.52*shadow) * (diff*term) * sunc * uSunPower
           + spec * uSunPower * sunc * term
           + alb * amb * mix(0.72, 1.0, cav);
  float fres = pow(1.0 - clamp(dot(Nw, V), 0.0, 1.0), 3.0);
  col += fres * vec3(0.10, 0.09, 0.22) * smoothstep(-0.1, 0.5, ndlS) * 0.4;
  gl_FragColor = vec4(display(col), 1.0);
}`;

const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uClouds;
uniform vec3 uSun; uniform mat3 uCloudInv; uniform float uSunPower;
varying vec3 vObj; varying vec3 vWorld;
${COMMON}
void main(){
  vec3 P = normalize(vObj);
  vec2 uv = lonlat(P);
  vec2 gx, gy; seamGrad(uv, gx, gy);
  float base = texG(uClouds, uv, gx, gy).r;
  float fine = texG(uClouds, uv*2.7 + vec2(0.23, 0.41), gx*2.7, gy*2.7).r;
  float micro = texG(uClouds, uv*6.1 + vec2(0.61, 0.17), gx*6.1, gy*6.1).r;
  float density = clamp(base * (0.82 + 0.24*fine) + (micro-0.5)*0.075, 0.0, 1.0);

  vec3 Lc = normalize(uCloudInv * normalize(uSun));
  float lon = (uv.x - 0.5) * 2.0 * PI, lat = (0.5 - uv.y) * PI;
  vec3 Ec = vec3(-sin(lon), 0.0, cos(lon));
  vec3 Nn = vec3(-sin(lat)*cos(lon), cos(lat), -sin(lat)*sin(lon));
  float du = dot(Ec, Lc) / (2.0*PI*max(cos(lat), 0.2)) * 0.009;
  float dv = -dot(Nn, Lc) / PI * 0.009;
  float shadowA = texG(uClouds, uv + vec2(du, dv), gx, gy).r;
  float shadowB = texG(uClouds, uv + 2.0*vec2(du, dv), gx, gy).r;
  float selfShadow = clamp((max(shadowA, shadowB)-base)*2.8, 0.0, 1.0);

  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = dot(P, Lc);
  float daylight = smoothstep(-0.16, 0.38, ndl);
  float silver = smoothstep(0.12, 0.72, ndl);
  float edge = pow(1.0-max(dot(P, V), 0.0), 2.4);
  float forward = pow(max(dot(V, -Lc), 0.0), 5.0);
  float body = smoothstep(0.24, 0.86, density);
  vec3 pearl = vec3(0.91, 0.925, 0.97);
  vec3 lavender = vec3(0.72, 0.66, 0.91);
  vec3 cloudColor = mix(pearl, lavender, body*0.22);
  float innerShade = 1.0 - 0.48*selfShadow - 0.22*body;
  vec3 direct = cloudColor * mix(vec3(1.0,0.77,0.91), vec3(1.0,0.985,0.97), silver)
              * daylight * innerShade * uSunPower * 0.58;
  vec3 ambient = cloudColor * vec3(0.035,0.040,0.085) * 1.75;
  vec3 scatter = cloudColor * (forward*0.32 + edge*0.10) * vec3(0.78,0.82,1.0);
  vec3 result = direct + ambient + scatter;
  float wispyAlpha = smoothstep(0.055, 0.50, density);
  float denseAlpha = smoothstep(0.34, 0.88, density);
  float alpha = mix(wispyAlpha*0.30, 0.78, denseAlpha);
  alpha *= mix(0.52, 1.0, daylight) + edge*0.16;
  gl_FragColor = vec4(display(result), clamp(alpha, 0.0, 0.82));
}`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uSun;
varying vec3 vWorld;
${COMMON}
void main(){
  vec3 c = cameraPosition;
  vec3 d = normalize(vWorld - c);
  float tc = -dot(c, d);
  vec3 P = c + d*tc;                 // closest approach to the planet centre
  float b = length(P);
  const float Rp = 1.0; const float Hs = 0.020;
  float mu = sqrt(clamp(1.0 - (b/Rp)*(b/Rp), 0.0, 1.0));
  float graz = sqrt(2.0*PI*Hs*Rp);
  float colIn = min(Hs / max(mu, 0.02), graz);
  float colOut = sqrt(2.0*PI*max(b, 1e-3)*Hs) * exp(-(b - Rp)/Hs);
  float colden = (b < Rp) ? colIn : colOut;
  float opac = 1.0 - exp(-3.4*colden);
  vec3 pt = P;
  if (b < Rp) { vec3 Hh = c + d*(tc - sqrt(max(Rp*Rp - b*b, 0.0))); pt = P + 0.45*(Hh - P); }
  vec3 L = normalize(uSun);
  float s = dot(normalize(pt), L);
  float day = smoothstep(-0.18, 0.55, s);
  float twi = exp(-pow(s/0.20, 2.0));
  float cosT = dot(d, L); const float g = 0.45;
  float hg = (1.0 - g*g) / (4.0*PI*pow(1.0 + g*g - 2.0*g*cosT, 1.5));
  float phase = 0.6 + 0.4*(0.75*(1.0 + cosT*cosT)) + 1.1*hg;
  vec3 dayc = vec3(0.42, 0.52, 1.0), lavc = vec3(0.72, 0.58, 1.0), twic = vec3(1.0, 0.50, 0.80);
  vec3 acol = (dayc*(1.0 - 0.35*day) + lavc*0.35*day) * day + twic * (twi*0.55);
  float a = clamp(opac * (0.04 + 0.96*clamp(day + 0.45*twi, 0.0, 1.0)) * phase * 0.60, 0.0, 1.0);
  if (a < 0.002) discard;
  gl_FragColor = vec4(display(acol * 0.95), a);
}`;

export const SHADERS = { COMMON, VERT, PLANET_FRAG, CLOUD_FRAG, ATMO_FRAG };

/* ------------------------------------------------------------------ app */
const SUN_DIR = [-0.85, 0.30, 0.45];
const TILT = 14 * Math.PI / 180;
const SPIN = 0.0105;          // rad/s planet (~10 min / turn)
const CLOUD_DRIFT = 0.0062;   // extra rad/s for the cloud layer
const PARALLAX = 0.075;       // max camera swing (rad)

function hasWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

function showPoster(container) {
  container.classList.add('is-fallback');
  if (container.querySelector('.vespera-poster')) return;
  const img = new Image();
  img.className = 'vespera-poster';
  img.alt = 'VESPERA 2.0, planète minérale lavande';
  img.decoding = 'async';
  img.src = BASE + 'vespera-poster.webp';
  container.appendChild(img);
}

export async function mountVespera(container) {
  if (container.dataset.vesperaMounted) return;
  container.dataset.vesperaMounted = '1';
  if (!hasWebGL2()) return showPoster(container);

  let THREE;
  try { THREE = await import(THREE_URL); } catch (e) { console.warn('[VESPERA] three.js unavailable', e); return showPoster(container); }

  const coarse = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Reuse the preview canvas already in the markup; never create a duplicate layer.
  const canvas = container.querySelector('canvas') || document.createElement('canvas');
  canvas.classList.add('vespera-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  if (!canvas.isConnected) container.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return showPoster(container); }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.debug.onShaderError = () => { stop(); canvas.remove(); showPoster(container); };

  const maxTex = renderer.capabilities.maxTextureSize;
  const mem = navigator.deviceMemory || 4;
  const tier = (maxTex < 4096 || coarse) ? 2048 : 4096;
  const finalTier = mem <= 2 ? 1024 : tier;
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);

  const sun = new THREE.Vector3(...SUN_DIR).normalize();
  const uCloudInv = { value: new THREE.Matrix3() };
  const uModel = { value: new THREE.Matrix3() };
  const uSunPower = { value: 2.0 };
  const placeholder = new THREE.Texture();

  const planetMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: PLANET_FRAG,
    uniforms: {
      uColor: { value: placeholder }, uNormal: { value: placeholder }, uOrm: { value: placeholder }, uClouds: { value: placeholder },
      uSun: { value: sun }, uModel, uCloudInv, uSunPower
    }
  });
  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
    uniforms: { uClouds: { value: placeholder }, uSun: { value: sun }, uCloudInv, uSunPower }
  });
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: { uSun: { value: sun } }
  });

  const seg = coarse ? [128, 80] : [192, 112];
  const system = new THREE.Group();
  system.rotation.z = TILT;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.0, ...seg), planetMat);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.014, ...seg), cloudMat);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.085, 128, 88), atmoMat);
  clouds.renderOrder = 1; atmo.renderOrder = 2;
  planet.rotation.y = 0.35;
  system.add(planet, clouds); scene.add(system, atmo);

  /* --- textures (1024 first for a fast reveal, then the final tier) --- */
  const loader = new THREE.TextureLoader();
  const loadTex = (url, srgb) => new Promise((res, rej) => loader.load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    res(t);
  }, undefined, rej));
  const loadSet = async (size) => {
    const u = (n) => `${BASE}${size}/${n}.webp`;
    const [color, normal, orm, cl] = await Promise.all([loadTex(u('color'), true), loadTex(u('normal')), loadTex(u('orm')), loadTex(u('clouds'))]);
    return { color, normal, orm, clouds: cl };
  };
  let current = null;
  const applySet = (set) => {
    Object.values(set).forEach((t) => renderer.initTexture(t));       // upload now, no hitch on swap
    planetMat.uniforms.uColor.value = set.color; planetMat.uniforms.uNormal.value = set.normal;
    planetMat.uniforms.uOrm.value = set.orm; planetMat.uniforms.uClouds.value = set.clouds;
    cloudMat.uniforms.uClouds.value = set.clouds;
    if (current) Object.values(current).forEach((t) => t.dispose());
    current = set;
  };

  /* --- sizing --- */
  let dist = 6;
  const fit = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; 
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = 1.17 / Math.min(half, half * camera.aspect);
    camera.updateProjectionMatrix();
    renderOnce();
  };

  /* --- loop --- */
  let raf = 0, running = false, last = 0, tx = 0, ty = 0, cx = 0, cy = 0, visible = false, ready = false;
  const m4 = new THREE.Matrix4();
  const frame = (dt) => {
    if (!reduced.matches) {
      planet.rotation.y += SPIN * dt;
      clouds.rotation.y += (SPIN + CLOUD_DRIFT) * dt;
      cx += (tx - cx) * Math.min(1, dt * 2.2); cy += (ty - cy) * Math.min(1, dt * 2.2);
    }
    camera.position.set(Math.sin(cx) * dist * Math.cos(cy), Math.sin(cy) * dist, Math.cos(cx) * dist * Math.cos(cy));
    camera.lookAt(0, 0, 0);
    system.updateMatrixWorld(true);
    uModel.value.setFromMatrix4(planet.matrixWorld);
    uCloudInv.value.setFromMatrix4(clouds.matrixWorld).invert();
    renderer.render(scene, camera);
  };
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    frame(dt); raf = requestAnimationFrame(tick);
  };
  const start = () => { if (running || reduced.matches || !ready) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
  function stop() { running = false; cancelAnimationFrame(raf); }
  const renderOnce = () => { if (ready) frame(0); };
  const sync = () => { (visible && !document.hidden) ? start() : stop(); };

  /* --- events --- */
  new ResizeObserver(fit).observe(container);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.01 }).observe(container);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { reduced.matches ? (stop(), renderOnce()) : sync(); });
  if (!coarse) {
    container.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2 * -PARALLAX;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2 * PARALLAX * 0.6;
    }, { passive: true });
    container.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); showPoster(container); });
  canvas.addEventListener('webglcontextrestored', () => { container.classList.remove('is-fallback'); container.querySelector('.vespera-poster')?.remove(); ready = true; renderOnce(); sync(); });

  /* --- boot --- */
  try {
    applySet(await loadSet(1024));
    ready = true; fit();
    container.classList.add('is-ready');
    sync();
    if (finalTier > 1024) {
      // upgrade quietly once the browser is idle
      (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(async () => {
        try { applySet(await loadSet(finalTier)); renderOnce(); } catch (e) { console.warn('[VESPERA] hi-res tier failed, keeping 1024', e); }
      });
    }
  } catch (e) {
    console.warn('[VESPERA] textures failed', e);
    stop(); canvas.remove(); showPoster(container);
  }
}

/* Lazy init: only when the Studio panel approaches the viewport */
const host = document.querySelector('.vespera-v2-3d');
if (host) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); mountVespera(host); }
  }, { rootMargin: '300px' });
  io.observe(host);
}
