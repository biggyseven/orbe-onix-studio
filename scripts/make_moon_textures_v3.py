#!/usr/bin/env python3
"""VESPERA Moon texture generator v3.

Creates a restrained, cratered cool-grey/lavender Moon.
Outputs: color.webp, normal.webp, moon-preview-v3.png.

Usage:
  py scripts/make_moon_textures_v3.py 1024 assets/moon-v3/1024
  py scripts/make_moon_textures_v3.py 2048 assets/moon-v3/2048

Dependencies: numpy, Pillow.
"""
from __future__ import annotations

import argparse
import os
import time

import numpy as np
from PIL import Image


def smooth(a: float, b: float, x: np.ndarray) -> np.ndarray:
    k = np.clip((x - a) / (b - a), 0.0, 1.0)
    return k * k * (3.0 - 2.0 * k)


def soften_height(image: np.ndarray, sigma: float = 0.35) -> np.ndarray:
    """Very light separable blur using NumPy only; wraps longitude and clamps poles."""
    neighbor = float(np.exp(-0.5 / (sigma * sigma)))
    norm = 1.0 + 2.0 * neighbor

    horizontal = (
        image
        + neighbor * np.roll(image, 1, axis=1)
        + neighbor * np.roll(image, -1, axis=1)
    ) / norm

    up = np.concatenate((horizontal[:1, :], horizontal[:-1, :]), axis=0)
    down = np.concatenate((horizontal[1:, :], horizontal[-1:, :]), axis=0)
    return (horizontal + neighbor * up + neighbor * down) / norm


def hexc(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


def mixc(c0: np.ndarray, c1: np.ndarray, amount: np.ndarray) -> np.ndarray:
    return c0 * (1.0 - amount[..., None]) + c1 * amount[..., None]


class SphereNoise:
    """Deterministic 3D value noise sampled on a sphere: no UV seam or pole pinching."""

    def __init__(self, seed: int = 21) -> None:
        rng = np.random.default_rng(seed)
        self.table = rng.random(256, dtype=np.float32) * 2.0 - 1.0
        self.perm = rng.permutation(256).astype(np.int32)
        r1 = np.array([[0.8, -0.6, 0.0], [0.6, 0.8, 0.0], [0.0, 0.0, 1.0]], dtype=np.float32)
        r2 = np.array([[1.0, 0.0, 0.0], [0.0, 0.936, -0.352], [0.0, 0.352, 0.936]], dtype=np.float32)
        self.rot = (r1 @ r2).astype(np.float32)

    def _hash(self, ix: np.ndarray, iy: np.ndarray, iz: np.ndarray) -> np.ndarray:
        return self.table[self.perm[(self.perm[(self.perm[ix & 255] + iy) & 255] + iz) & 255]]

    def noise3(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
        x0 = np.floor(x); y0 = np.floor(y); z0 = np.floor(z)
        fx = x - x0; fy = y - y0; fz = z - z0
        ix = x0.astype(np.int32); iy = y0.astype(np.int32); iz = z0.astype(np.int32)
        u = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0)
        v = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0)
        w = fz * fz * fz * (fz * (fz * 6.0 - 15.0) + 10.0)
        c000 = self._hash(ix, iy, iz);         c100 = self._hash(ix + 1, iy, iz)
        c010 = self._hash(ix, iy + 1, iz);     c110 = self._hash(ix + 1, iy + 1, iz)
        c001 = self._hash(ix, iy, iz + 1);     c101 = self._hash(ix + 1, iy, iz + 1)
        c011 = self._hash(ix, iy + 1, iz + 1); c111 = self._hash(ix + 1, iy + 1, iz + 1)
        a = c000 + (c100 - c000) * u
        b = c010 + (c110 - c010) * u
        c = c001 + (c101 - c001) * u
        d = c011 + (c111 - c011) * u
        e = a + (b - a) * v
        f = c + (d - c) * v
        return e + (f - e) * w

    def fbm(self, x: np.ndarray, y: np.ndarray, z: np.ndarray, octaves: int,
            gain: float = 0.5, seed_offset: float = 0.0) -> np.ndarray:
        total = np.zeros_like(x, dtype=np.float32)
        amplitude = 1.0
        norm = 0.0
        ox, oy, oz = seed_offset, seed_offset * 1.3, seed_offset * 0.7
        for _ in range(octaves):
            total += self.noise3(x + ox, y + oy, z + oz) * amplitude
            norm += amplitude
            x, y, z = (
                self.rot[0, 0] * x * 2.03 + self.rot[0, 1] * y * 2.03 + self.rot[0, 2] * z * 2.03,
                self.rot[1, 0] * x * 2.03 + self.rot[1, 1] * y * 2.03 + self.rot[1, 2] * z * 2.03,
                self.rot[2, 0] * x * 2.03 + self.rot[2, 1] * y * 2.03 + self.rot[2, 2] * z * 2.03,
            )
            amplitude *= gain
        return total / norm


def sample_equirect(image: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    x = (u % 1.0) * w - 0.5
    y = np.clip(v, 0.0, 1.0) * (h - 1)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    tx = (x - x0)[..., None]
    ty = (y - y0)[..., None]
    xa = x0 % w
    xb = (x0 + 1) % w
    ya = np.clip(y0, 0, h - 1)
    yb = np.clip(y0 + 1, 0, h - 1)
    top = image[ya, xa] * (1.0 - tx) + image[ya, xb] * tx
    bottom = image[yb, xa] * (1.0 - tx) + image[yb, xb] * tx
    return top * (1.0 - ty) + bottom * ty


def make_preview(color: np.ndarray, normal: np.ndarray, output_path: str, size: int = 720) -> None:
    yy, xx = np.mgrid[-1.0:1.0:complex(size), -1.0:1.0:complex(size)]
    radius2 = xx * xx + yy * yy
    mask = radius2 <= 0.88 ** 2
    zz = np.sqrt(np.maximum(1.0 - radius2, 0.0))
    lon = np.arctan2(zz, xx)
    lat = np.arcsin(np.clip(-yy, -1.0, 1.0))
    u = lon / (2.0 * np.pi) + 0.5
    v = 0.5 - lat / np.pi

    albedo = sample_equirect(color, u, v)
    nmap = sample_equirect(normal, u, v) * 2.0 - 1.0
    east = np.stack([-np.sin(lon), np.zeros_like(lon), np.cos(lon)], axis=-1)
    north = np.stack([-np.sin(lat) * np.cos(lon), np.cos(lat), -np.sin(lat) * np.sin(lon)], axis=-1)
    sphere_n = np.stack([np.cos(lat) * np.cos(lon), np.sin(lat), np.cos(lat) * np.sin(lon)], axis=-1)
    world_n = east * nmap[..., 0:1] + north * nmap[..., 1:2] + sphere_n * nmap[..., 2:3]
    world_n /= np.maximum(np.linalg.norm(world_n, axis=-1, keepdims=True), 1e-6)
    light = np.array([-0.72, 0.34, 0.61], dtype=np.float32)
    light /= np.linalg.norm(light)
    diffuse = np.clip(np.sum(world_n * light, axis=-1), 0.0, 1.0)
    shade = 0.17 + 0.95 * diffuse
    result = np.clip(albedo * shade[..., None], 0.0, 1.0)
    canvas = np.zeros((size, size, 3), dtype=np.uint8)
    canvas[mask] = (result[mask] * 255.0 + 0.5).astype(np.uint8)
    Image.fromarray(canvas, "RGB").save(output_path, optimize=True)


def generate(width: int, out_dir: str) -> None:
    started = time.time()
    height_px = width // 2
    rng = np.random.default_rng(2026)
    noise = SphereNoise(21)

    lon = (np.arange(width, dtype=np.float32) + 0.5) / width * 2.0 * np.pi - np.pi
    lat = np.pi / 2.0 - (np.arange(height_px, dtype=np.float32) + 0.5) / height_px * np.pi
    LON, LAT = np.meshgrid(lon, lat)
    cl = np.cos(LAT).astype(np.float32)
    px = (cl * np.cos(LON)).astype(np.float32)
    py = np.sin(LAT).astype(np.float32)
    pz = (cl * np.sin(LON)).astype(np.float32)

    print(f"VESPERA Moon v3: {width}x{height_px}")
    # Broad highland and mare provinces; muted contrast keeps the surface lunar, not metallic.
    macro = noise.fbm(px * 1.35, py * 1.35, pz * 1.35, 5, seed_offset=101.0) * 0.5 + 0.5
    mare_field = noise.fbm(px * 1.75, py * 1.75, pz * 1.75, 4, seed_offset=121.0) * 0.5 + 0.5
    mid_detail = noise.fbm(px * 8.0, py * 8.0, pz * 8.0, 4, seed_offset=141.0) * 0.5 + 0.5
    fine_detail = noise.fbm(px * 28.0, py * 28.0, pz * 28.0, 3, gain=0.52, seed_offset=161.0)
    regolith = noise.fbm(px * 58.0, py * 58.0, pz * 58.0, 4, gain=0.54, seed_offset=181.0)
    highlands = smooth(0.30, 0.72, macro)
    maria = smooth(0.55, 0.78, mare_field) * (1.0 - highlands * 0.35)

    base_height = 0.36 * highlands + 0.07 * mid_detail + 0.012 * fine_detail
    base_height -= 0.055 * maria

    # Three crater populations: many small impacts, fewer medium craters, rare large basins.
    small_n = 230 if width < 2048 else 400
    medium_n = 60 if width < 2048 else 100
    large_n = 14 if width < 2048 else 24
    basin_n = 4 if width < 2048 else 6
    radii = np.concatenate([
        rng.uniform(0.006, 0.018, small_n),
        rng.uniform(0.018, 0.052, medium_n),
        rng.uniform(0.055, 0.13, large_n),
        rng.uniform(0.13, 0.17, basin_n),
    ]).astype(np.float32)
    centers = rng.normal(size=(len(radii), 3)).astype(np.float32)
    centers /= np.maximum(np.linalg.norm(centers, axis=1, keepdims=True), 1e-6)
    order = np.argsort(radii)[::-1]
    radii = radii[order]
    centers = centers[order]

    crater_basin = np.zeros_like(base_height, dtype=np.float32)
    ejecta_field = np.zeros_like(base_height, dtype=np.float32)
    ray_field = np.zeros_like(base_height, dtype=np.float32)
    for i, (center, crater_radius) in enumerate(zip(centers, radii)):
        dot = np.clip(px * center[0] + py * center[1] + pz * center[2], -1.0, 1.0)
        angular = np.arccos(dot)
        rr = angular / crater_radius

        # Only a minority of medium impacts are young enough to retain faint rays.
        is_fresh = (0.026 <= crater_radius <= 0.105) and (rng.random() < 0.22)
        reach = 4.5 if is_fresh else 1.75
        region = rr < reach
        if not np.any(region):
            continue

        # Build a local tangent frame so rim wobble and ejecta rays follow the sphere.
        reference = np.array([0.0, 1.0, 0.0], dtype=np.float32)
        if abs(float(center[1])) > 0.92:
            reference = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        east = np.cross(reference, center)
        east /= max(float(np.linalg.norm(east)), 1e-6)
        north = np.cross(center, east)
        azimuth = np.arctan2(
            px[region] * north[0] + py[region] * north[1] + pz[region] * north[2],
            px[region] * east[0] + py[region] * east[1] + pz[region] * east[2]
        )
        phase = rng.uniform(0.0, 2.0 * np.pi)
        r = rr[region]
        # Real impacts are not perfect circles: the rim has subtle lobes and erosion.
        warped_r = r * (
            1.0
            + 0.022 * np.sin(5.0 * azimuth + phase)
            + 0.013 * np.sin(9.0 * azimuth - phase * 0.65)
        )
        core = warped_r < 1.75
        if np.any(core):
            rc = warped_r[core]
            core_indices = np.flatnonzero(region)[core]
            # Concave bowl, low broken rim, shallow ejecta apron.
            bowl = -(1.0 - smooth(0.035, 0.94, rc)) * 0.60
            rim_breakup = 0.90 + 0.10 * np.sin(7.0 * azimuth[core] + phase * 0.5)
            rim = np.exp(-((rc - 0.99) / 0.205) ** 2) * 0.255 * rim_breakup
            outer_apron = np.exp(-((rc - 1.18) / 0.39) ** 2) * 0.035
            peak_strength = np.clip((crater_radius - 0.045) / 0.075, 0.0, 1.0)
            central_peak = np.exp(-(rc / 0.17) ** 2) * 0.052 * peak_strength
            depth = 0.020 + 0.118 * np.sqrt(crater_radius / 0.17)
            profile = bowl + rim + outer_apron + central_peak
            base_height.flat[core_indices] += profile * depth
            crater_basin.flat[core_indices] = np.maximum(
                crater_basin.flat[core_indices],
                (1.0 - smooth(0.12, 0.92, rc)) * (0.30 + 0.22 * (crater_radius / 0.078))
            )

            if is_fresh:
                # A subdued bright rim and asymmetric ejecta blanket, not a white outline.
                fresh_rim = np.exp(-((rc - 1.04) / 0.19) ** 2) * 0.26
                ejecta_field.flat[core_indices] = np.maximum(
                    ejecta_field.flat[core_indices], fresh_rim.astype(np.float32)
                )

        if is_fresh:
            # Faint radial ejecta rays taper quickly and vary in length and strength.
            ray_wave = np.clip(0.5 + 0.5 * np.cos(8.0 * azimuth + phase), 0.0, 1.0) ** 4.5
            ray_wave *= 0.72 + 0.28 * np.cos(3.0 * azimuth - phase * 0.8) ** 2
            ray_envelope = np.exp(-((warped_r - 2.15) / 1.15) ** 2)
            rays = ray_wave * ray_envelope * 0.13
            rays[warped_r < 1.12] = 0.0
            rays[warped_r > 4.25] = 0.0
            ejecta_field[region] = np.maximum(
                ejecta_field[region], (rays * rng.uniform(0.55, 0.95)).astype(np.float32)
            )
            ray_field[region] = np.maximum(ray_field[region], rays.astype(np.float32))

    low, high = np.percentile(base_height, [0.4, 99.6])
    terrain = np.clip((base_height - low) / max(high - low, 1e-6), 0.0, 1.0).astype(np.float32)

    # Cool lunar palette: grey first, a very light lavender bias, no shiny metallic highlights.
    dark_mare = hexc("555460")
    lowland = hexc("777583")
    highland_color = hexc("a6a3af")
    fresh_color = hexc("b2afbc")
    col = mixc(lowland, highland_color, smooth(0.16, 0.78, terrain))
    col = mixc(col, dark_mare, np.clip(maria * 0.56, 0.0, 0.62))
    # Ejecta are pale mineral dust, while the faint ray field remains restrained.
    col = mixc(col, fresh_color, np.clip(ejecta_field * 0.46, 0.0, 0.24))
    col = mixc(col, hexc("a7a4b1"), np.clip(ray_field * 0.20, 0.0, 0.035))
    col *= (0.966 + 0.050 * mid_detail + 0.022 * fine_detail + 0.012 * regolith)[..., None]
    col *= (1.0 - 0.060 * crater_basin)[..., None]
    col = np.clip(col, 0.0, 1.0).astype(np.float32)

    # A little smoothing plus a moderated normal strength keeps crater walls tactile, not metallic.
    # NumPy implementation keeps the generator free of a SciPy dependency.
    soft_height = soften_height(terrain, sigma=0.48)
    hx = np.roll(soft_height, -1, axis=1) - np.roll(soft_height, 1, axis=1)
    hy = np.vstack([soft_height[1:2] - soft_height[0:1],
                    soft_height[2:] - soft_height[:-2],
                    soft_height[-1:] - soft_height[-2:-1]])
    bump = 2.85
    nx = -hx * bump * (width / 512.0) / np.maximum(cl, 0.12)
    ny = hy * bump * (width / 512.0)
    nz = np.ones_like(nx)
    pole_fade = smooth(0.08, 0.28, cl)
    nx *= pole_fade
    ny *= pole_fade
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack([nx / norm, ny / norm, nz / norm], axis=-1) * 0.5 + 0.5
    normal = np.clip(normal, 0.0, 1.0).astype(np.float32)

    os.makedirs(out_dir, exist_ok=True)
    Image.fromarray((col * 255.0 + 0.5).astype(np.uint8), "RGB").save(
        os.path.join(out_dir, "color.webp"), quality=94, method=6
    )
    Image.fromarray((normal * 255.0 + 0.5).astype(np.uint8), "RGB").save(
        os.path.join(out_dir, "normal.webp"), quality=96, method=6
    )
    make_preview(col, normal, os.path.join(out_dir, "moon-preview-v3.png"))
    print(f"  color.webp  {os.path.getsize(os.path.join(out_dir, 'color.webp')) / 1024:.0f} KB")
    print(f"  normal.webp {os.path.getsize(os.path.join(out_dir, 'normal.webp')) / 1024:.0f} KB")
    print(f"  done in {time.time() - started:.1f}s")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate VESPERA Moon texture maps.")
    parser.add_argument("width", nargs="?", type=int, default=1024, help="texture width: 1024 or 2048")
    parser.add_argument("out_dir", nargs="?", default=None, help="output directory")
    args = parser.parse_args()
    if args.width not in (1024, 2048):
        parser.error("width must be 1024 or 2048")
    out_dir = args.out_dir or os.path.join("assets", "moon-v3", str(args.width))
    generate(args.width, out_dir)


if __name__ == "__main__":
    main()
