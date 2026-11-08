#!/usr/bin/env python3
"""
VESPERA 2.2 texture generator (offline, deterministic).

Everything is sampled as 3D noise on the unit sphere -> no seam, no pole pinching.
Outputs (assets/vespera-v2-2/<size>/):
  color.webp   albedo (sRGB)
  normal.webp  tangent-space normal map
  orm.webp     R = cavity/AO, G = roughness, B = height   (Three: aoMap + roughnessMap share it)
  clouds.webp  grayscale cloud density (R=G=B)

usage: python make_vespera_v2_2_textures.py [width] [out_dir]
"""
import sys, os, time
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

W = int(sys.argv[1]) if len(sys.argv) > 1 else 2048
OUT = sys.argv[2] if len(sys.argv) > 2 else "out"
H = W // 2
rng = np.random.default_rng(7)  # fixed seed -> reproducible planet

# ---------------------------------------------------------------- sphere grid
lon = (np.arange(W, dtype=np.float32) + 0.5) / W * 2 * np.pi - np.pi
lat = np.pi / 2 - (np.arange(H, dtype=np.float32) + 0.5) / H * np.pi
LON, LAT = np.meshgrid(lon, lat)
cl = np.cos(LAT)
PX = (cl * np.cos(LON)).astype(np.float32)
PY = np.sin(LAT).astype(np.float32)
PZ = (cl * np.sin(LON)).astype(np.float32)
del LON

# ---------------------------------------------------------------- 3D value noise
TABLE_N = 256
_tab = rng.random((TABLE_N,), dtype=np.float32) * 2 - 1
_perm = rng.permutation(TABLE_N).astype(np.int32)


def _h(ix, iy, iz):
    return _tab[_perm[(_perm[(_perm[ix & 255] + iy) & 255] + iz) & 255]]


def noise3(x, y, z):
    """smooth 3D value noise in [-1,1] (quintic fade)."""
    x0 = np.floor(x); y0 = np.floor(y); z0 = np.floor(z)
    fx = x - x0; fy = y - y0; fz = z - z0
    ix = x0.astype(np.int32); iy = y0.astype(np.int32); iz = z0.astype(np.int32)
    u = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    w = fz * fz * fz * (fz * (fz * 6 - 15) + 10)
    c000 = _h(ix, iy, iz);         c100 = _h(ix + 1, iy, iz)
    c010 = _h(ix, iy + 1, iz);     c110 = _h(ix + 1, iy + 1, iz)
    c001 = _h(ix, iy, iz + 1);     c101 = _h(ix + 1, iy, iz + 1)
    c011 = _h(ix, iy + 1, iz + 1); c111 = _h(ix + 1, iy + 1, iz + 1)
    a = c000 + (c100 - c000) * u; b = c010 + (c110 - c010) * u
    c = c001 + (c101 - c001) * u; d = c011 + (c111 - c011) * u
    e = a + (b - a) * v; f = c + (d - c) * v
    return e + (f - e) * w


# rotate each octave so lattice axes never line up (kills grid artifacts)
_R = np.array([[0.8, -0.6, 0.0], [0.6, 0.8, 0.0], [0.0, 0.0, 1.0]], np.float32)
_R2 = np.array([[1, 0, 0], [0, 0.936, -0.352], [0, 0.352, 0.936]], np.float32)
ROT = (_R @ _R2).astype(np.float32)


def rot(x, y, z):
    return (ROT[0, 0] * x + ROT[0, 1] * y + ROT[0, 2] * z,
            ROT[1, 0] * x + ROT[1, 1] * y + ROT[1, 2] * z,
            ROT[2, 0] * x + ROT[2, 1] * y + ROT[2, 2] * z)


def fbm(x, y, z, octaves, lacunarity=2.03, gain=0.5, ridged=False, seed_off=0.0):
    tot = np.zeros_like(x); amp = 1.0; norm = 0.0
    ox, oy, oz = seed_off, seed_off * 1.3, seed_off * 0.7
    for _ in range(octaves):
        n = noise3(x + ox, y + oy, z + oz)
        if ridged:
            n = 1.0 - np.abs(n) * 1.6
            n = np.clip(n, 0, 1) ** 2
            n = n * 2 - 1
        tot += n * amp; norm += amp
        x, y, z = rot(x * lacunarity, y * lacunarity, z * lacunarity)
        amp *= gain
    return tot / norm


def t(msg, t0):
    print(f"  {msg:<28s} {time.time()-t0:5.1f}s", flush=True)


def smooth(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def mixc(c0, c1, k):
    c0 = c0 if c0.ndim == 3 else c0[None, None, :]
    c1 = c1 if c1.ndim == 3 else c1[None, None, :]
    return c0 * (1 - k[..., None]) + c1 * k[..., None]


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


# ================================================================= HEIGHT
print(f"VESPERA 2.2 {W}x{H}")
T0 = time.time()

# Broad tectonic provinces: large coherent plates, restrained warping, no marble-like swirls.
wx = fbm(PX * 1.15, PY * 1.15, PZ * 1.15, 3, seed_off=11.0)
wy = fbm(PX * 1.15, PY * 1.15, PZ * 1.15, 3, seed_off=23.0)
wz = fbm(PX * 1.15, PY * 1.15, PZ * 1.15, 3, seed_off=37.0)
WX = PX + 0.115 * wx; WY = PY + 0.115 * wy; WZ = PZ + 0.115 * wz
t("tectonic warp", T0)

plate = fbm(WX * 1.48, WY * 1.48, WZ * 1.48, 6, gain=0.53, seed_off=3.0) * 0.5 + 0.5
highland = smooth(0.405, 0.635, plate)
lowland = 1.0 - smooth(0.40, 0.61, plate)
t("tectonic provinces", T0)

# Mountain belts follow plate transitions, with ridged peaks embedded in the belt.
boundary = np.exp(-((plate - 0.52) / 0.115) ** 2)
ridges = fbm(WX * 3.05, WY * 3.05, WZ * 3.05, 6, gain=0.52, ridged=True, seed_off=51.0)
ridges = np.clip(ridges * 0.5 + 0.5, 0, 1)
mount = (0.20 + 0.80 * ridges) * boundary * (0.235 + 0.765 * highland)

# Layered plateaus and eroded shelves, kept subordinate to the primary landforms.
terr = fbm(WX * 2.15, WY * 2.15, WZ * 2.15, 4, seed_off=71.0) * 0.5 + 0.5
terr = np.floor(terr * 6.0) / 6.0 + smooth(0.0, 1.0, (terr * 6.0) % 1.0) / 6.0 * 0.35

# Fractures are broad geological troughs, not thin dark contour scribbles.
fault_base = np.abs(fbm(WX * 2.0, WY * 2.0, WZ * 2.0, 4, seed_off=91.0))
fault_detail = np.abs(fbm(WX * 4.2, WY * 4.2, WZ * 4.2, 3, seed_off=97.0))
fracture_region = smooth(0.48, 0.67, plate) * smooth(0.44, 0.66,
    fbm(PX * 2.2, PY * 2.2, PZ * 2.2, 3, seed_off=81.0) * 0.5 + 0.5)
rifts = (1.0 - smooth(0.025, 0.095, fault_base)) * fracture_region
rifts += 0.22 * (1.0 - smooth(0.018, 0.060, fault_detail)) * boundary
rifts = np.clip(rifts, 0.0, 0.72)

# Erosion, talus and crystalline grain at progressively smaller scales.
grain = fbm(PX * 56, PY * 56, PZ * 56, 4, gain=0.52, seed_off=5.0)
detail = fbm(PX * 10.5, PY * 10.5, PZ * 10.5, 5, seed_off=15.0)
erosion = fbm(WX * 6.8, WY * 6.8, WZ * 6.8, 4, ridged=True, seed_off=31.0) * 0.5 + 0.5
micro = fbm(PX * 23.0, PY * 23.0, PZ * 23.0, 4, gain=0.56, ridged=True, seed_off=41.0) * 0.5 + 0.5
micro2 = fbm(PX * 39.0, PY * 39.0, PZ * 39.0, 3, gain=0.52, seed_off=47.0)
t("mountain belts + erosion", T0)

height = (0.4325 * highland + 0.2725 * mount + 0.105 * terr * highland
          + 0.0675 * detail + 0.016 * grain + 0.041 * erosion
          + 0.029 * (micro - 0.5) + 0.0105 * micro2
          - 0.0795 * rifts + 0.045)

# Impact basins: fewer overlapping large scars, with a restrained field of small craters.
NC = 125 if W >= 2048 else 72
cx = rng.normal(size=(NC, 3)); cx /= np.linalg.norm(cx, axis=1, keepdims=True)
rad = 0.016 + 0.18 * rng.power(0.26, NC) ** 3.0 * 0.58 + 0.018 * rng.random(NC)
rad = np.sort(rad)[::-1]
crater_mask = np.zeros_like(height)
for i in range(NC):
    cd = PX * cx[i, 0] + PY * cx[i, 1] + PZ * cx[i, 2]
    ang = np.arccos(np.clip(cd, -1, 1))
    rr_all = ang / rad[i]
    m = rr_all < 1.55
    if not m.any():
        continue
    rr = rr_all[m]
    bowl = -(1.0 - smooth(0.0, 1.0, rr)) * 0.82
    rim = np.exp(-((rr - 1.015) / 0.15) ** 2) * 0.38
    floor_ = np.exp(-(rr / 0.31) ** 2) * 0.075
    prof = (bowl + rim + floor_) * (0.022 + 0.22 * rad[i] ** 0.82)
    height[m] += prof
    crater_mask[m] = np.maximum(crater_mask[m], 1.0 - smooth(0.0, 1.28, rr))
t("impact basins", T0)

hmin, hmax = np.percentile(height, [0.25, 99.75])
height = np.clip((height - hmin) / (hmax - hmin), 0, 1).astype(np.float32)

# ================================================================= COLOR
# Lithology is organized by geological province and elevation, not by random colour noise.
GRAPH = hexc('20212b'); BASALT = hexc('292d48'); INDIGO = hexc('35356c')
VIOLET = hexc('59458f'); LAV = hexc('8878bd'); LAV2 = hexc('b5a7d8')
IVORY = hexc('d8d3d0'); MAUVE = hexc('75618f')

province = fbm(WX * 1.95, WY * 1.95, WZ * 1.95, 5, seed_off=111.0) * 0.5 + 0.5
province2 = fbm(WX * 3.15, WY * 3.15, WZ * 3.15, 4, seed_off=133.0) * 0.5 + 0.5
strata = fbm(WX * 8.0, WY * 8.0, WZ * 8.0, 3, seed_off=151.0) * 0.5 + 0.5
crystal = fbm(PX * 18.0, PY * 18.0, PZ * 18.0, 4, ridged=True, seed_off=181.0) * 0.5 + 0.5
# Narrow, discontinuous mineral seams follow uplifted shelves instead of random swirls.
vein_field = fbm(WX * 5.6, WY * 5.6, WZ * 5.6, 5, gain=0.52, ridged=True, seed_off=193.0) * 0.5 + 0.5
vein_lines = smooth(0.70, 0.88, vein_field) * smooth(0.34, 0.72, height) * smooth(0.28, 0.72, province)

col = mixc(GRAPH, BASALT, smooth(0.28, 0.78, province2) * 0.72)
col = mixc(col, INDIGO, smooth(0.42, 0.78, lowland) * 0.48)
# Purple mineral provinces occupy coherent plateaus and uplifted shelves.
vein_belt = smooth(0.35, 0.73, province) * smooth(0.18, 0.58, height)
col = mixc(col, VIOLET, vein_belt * 0.82)
col = mixc(col, MAUVE, smooth(0.64, 0.88, province2) * smooth(0.36, 0.68, height) * 0.62)
col = mixc(col, LAV, smooth(0.57, 0.82, province) * smooth(0.43, 0.76, height) * 0.66)
col = mixc(col, LAV2, smooth(0.72, 0.91, crystal) * smooth(0.56, 0.82, height) * 0.26)
# Fine lilac/ivory mineral seams are sparse and embedded in raised strata.
col = mixc(col, LAV2, vein_lines * 0.22)
# Pale mineral salts appear in selected basins and at high exposed ridges.
salt_field = fbm(WX * 2.25, WY * 2.25, WZ * 2.25, 4, seed_off=171.0) * 0.5 + 0.5
salt = np.clip(smooth(0.79, 0.93, height) * 0.52
               + smooth(0.70, 0.84, salt_field) * smooth(0.12, 0.56, lowland) * 0.42, 0, 0.78)
col = mixc(col, IVORY, salt)
# Stratification and crystal grain are deliberately low contrast.
col *= (0.94 + 0.12 * strata + 0.055 * (crystal - 0.5))[..., None]
# Eroded fracture walls darken gently, with no ink-like outlines.
col *= (1.0 - 0.105 * rifts)[..., None]
# Mineral sheen follows exposed crystal ridges rather than broad random blotches.
col *= (0.91 + 0.16 * smooth(0.60, 0.90, crystal) * smooth(0.45, 0.78, height))[..., None]
col = np.clip(col, 0, 1)

# Ambient cavity from local relief; reduce it toward the poles where equirectangular pixels stretch.
blur_s = gaussian_filter(height, (W / 850, W / 850), mode=('nearest', 'wrap'))
blur_l = gaussian_filter(height, (W / 210, W / 210), mode=('nearest', 'wrap'))
cav = np.clip(0.52 + (height - blur_s) * 6.0 + (height - blur_l) * 1.45, 0, 1)
pole = smooth(0.08, 0.28, cl)
cav = 0.5 + (cav - 0.5) * pole
col *= (0.84 + 0.30 * cav)[..., None]
col = np.clip(col, 0, 1)
t("lithology + colour", T0)

# ================================================================= NORMAL
BUMP = 3.55 * (W / 4096.0 + 0.5)       # strength tuned per resolution
hx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
hy = np.vstack([height[1:2] - height[0:1], height[2:] - height[:-2], height[-1:] - height[-2:-1]])
cosl = np.maximum(cl, 0.12)
nx = -hx * BUMP * (W / 512.0) / cosl
ny = hy * BUMP * (W / 512.0)       # v axis points down in the image -> +Y in tangent space
nz = np.ones_like(nx)
ln = np.sqrt(nx * nx + ny * ny + nz * nz)
pf = smooth(0.08, 0.28, cl); nx *= pf; ny *= pf
ln = np.sqrt(nx * nx + ny * ny + nz * nz)
normal = np.stack([nx / ln, ny / ln, nz / ln], -1) * 0.5 + 0.5
t("normal", T0)

# ================================================================= ORM
rough = 0.90 - 0.16 * salt - 0.08 * lowland + 0.025 * grain
rough = np.clip(rough, 0.3, 1.0)
orm = np.stack([cav, rough, height], -1)

for _n in ('wx','wy','wz','WX','WY','WZ','plate','highland','lowland','boundary','ridges','mount','terr','fault_base','fault_detail','fracture_region','rifts','detail','erosion','micro','micro2','province','province2','strata','crystal','vein_field','vein_lines','salt_field','salt','blur_s','blur_l','hx','hy','nx','ny','nz','ln','cav','rough','grain','cl','crater_mask','cx','rad','cd','ang','rr_all','m','rr','bowl','rim','floor_','prof'):
    globals().pop(_n, None)
import gc; gc.collect()
# ================================================================= CLOUDS
# A multi-scale convective field with curved fronts and a sparse high-altitude cirrus veil.
cwx = fbm(PX * 1.65, PY * 1.65, PZ * 1.65, 4, seed_off=201.0)
cwy = fbm(PX * 1.65, PY * 1.65, PZ * 1.65, 4, seed_off=211.0)
cwz = fbm(PX * 1.65, PY * 1.65, PZ * 1.65, 4, seed_off=221.0)
CX = PX + 0.27 * cwx; CY = PY + 0.20 * cwy; CZ = PZ + 0.27 * cwz
macro = fbm(CX * 2.5, CY * 2.5, CZ * 2.5, 5, gain=0.56, seed_off=231.0) * 0.5 + 0.5
meso = fbm(CX * 5.2, CY * 5.2, CZ * 5.2, 5, gain=0.54, seed_off=241.0) * 0.5 + 0.5
cells = fbm(CX * 10.5, CY * 10.5, CZ * 10.5, 4, seed_off=251.0) * 0.5 + 0.5
mottle = fbm(CX * 17.0, CY * 17.0, CZ * 17.0, 3, seed_off=281.0) * 0.5 + 0.5
# Convective decks are interrupted by clear windows at every scale.
formation = macro * 0.42 + meso * 0.39 + cells * 0.19
deck = smooth(0.405, 0.685, formation) * (0.70 + 0.44 * mottle)
# Wind-sheared fronts create curved, broken cloud filaments instead of latitude stripes.
front = fbm(CX * 6.2, CY * 7.0, CZ * 6.2, 5, ridged=True, seed_off=261.0) * 0.5 + 0.5
front = gaussian_filter(front, (0.45, max(0.6, W / 6200)), mode=('nearest', 'wrap'))
wisps = smooth(0.62, 0.855, front) * (1.0 - deck * 0.74)
# A sparse cirrus layer adds high, fine veils in otherwise clear windows.
cirrus_field = fbm(CX * 13.0, CY * 13.0, CZ * 13.0, 4, gain=0.53, ridged=True, seed_off=291.0) * 0.5 + 0.5
cirrus = smooth(0.73, 0.91, cirrus_field) * (1.0 - smooth(0.28, 0.69, macro))
# Compact high-density cores, surrounded by softer cloud shoulders.
core_field = fbm(CX * 3.8, CY * 3.8, CZ * 3.8, 4, seed_off=271.0) * 0.5 + 0.5
cores = smooth(0.69, 0.91, core_field * 0.55 + cells * 0.45) * deck
clouds = deck * (0.43 + 0.22 * mottle) + cores * 0.16 + wisps * 0.34 + cirrus * 0.15
clouds = smooth(0.11, 0.78, clouds) ** 1.02
clouds = np.clip(clouds, 0, 1)
print(f"  cloud coverage (>0.35): {(clouds > 0.35).mean()*100:.0f}%  mean {clouds.mean():.2f}")
t("cloud systems", T0)


# ================================================================= WRITE
def to8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


os.makedirs(OUT, exist_ok=True)
Image.fromarray(to8(col)).save(f"{OUT}/color.webp", quality=93, method=6)
Image.fromarray(to8(normal)).save(f"{OUT}/normal.webp", quality=95, method=6)
Image.fromarray(to8(orm)).save(f"{OUT}/orm.webp", quality=91, method=6)
c8 = to8(clouds)
Image.fromarray(np.stack([c8, c8, c8], -1)).save(f"{OUT}/clouds.webp", quality=91, method=6)
# float height for the preview renderer
np.save(f"{OUT}/_height.npy", height.astype(np.float16))
for f in ("color", "normal", "orm", "clouds"):
    print(f"  {f}.webp  {os.path.getsize(f'{OUT}/{f}.webp')/1024:7.0f} KB")
t("done", T0)
