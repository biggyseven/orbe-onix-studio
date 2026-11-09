#!/usr/bin/env python3
"""Prepare authentic NASA LROC/LOLA maps for the VESPERA Moon.

Inputs:
  lroc_color_16bit_srgb_4k.tif  NASA CGI Moon Kit, 4096x2048 color map
  ldem_16.tif                   NASA CGI Moon Kit, LOLA elevation map (km)

Output:
  color.webp                    naturally toned, lightly cool/lavender color map
  normal.webp                   tangent-space normals generated from real LOLA heights
  moon-preview-nasa.png         lit sphere preview for visual approval

Usage (PowerShell, after downloading the two NASA files into the TEMP folder):
  $dataDir = Join-Path $env:TEMP "vespera-moon-nasa"
  py scripts/prepare_moon_nasa.py --color "$dataDir\lroc_color_2k.jpg" --height "$dataDir\ldem_4.tif" --out ".\assets\moon-nasa\2048" --size 2048

Dependencies: numpy, Pillow. No SciPy.
"""

from __future__ import annotations

import argparse
import os
import time

import numpy as np
from PIL import Image


MOON_RADIUS_KM = 1737.4


def sample_equirect(image: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """Bilinear equirectangular sampling with a wrapped longitude seam."""
    height, width = image.shape[:2]
    x = (u % 1.0) * width - 0.5
    y = np.clip(v, 0.0, 1.0) * (height - 1)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    tx = (x - x0)[..., None]
    ty = (y - y0)[..., None]
    xa = x0 % width
    xb = (x0 + 1) % width
    ya = np.clip(y0, 0, height - 1)
    yb = np.clip(y0 + 1, 0, height - 1)
    top = image[ya, xa] * (1.0 - tx) + image[ya, xb] * tx
    bottom = image[yb, xa] * (1.0 - tx) + image[yb, xb] * tx
    return top * (1.0 - ty) + bottom * ty


def resize_float_map(values: np.ndarray, size: int) -> np.ndarray:
    target = (size, size // 2)
    image = Image.fromarray(values.astype(np.float32), mode="F")
    return np.asarray(image.resize(target, Image.Resampling.LANCZOS), dtype=np.float32)


def cool_lavender_grade(rgb: np.ndarray, strength: float = 0.12) -> np.ndarray:
    """Keep NASA albedo structure; add only a restrained cool-lavender white balance."""
    c = np.clip(rgb.astype(np.float32) / 255.0, 0.0, 1.0)
    linear = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    luminance = (
        linear[..., 0] * 0.2126
        + linear[..., 1] * 0.7152
        + linear[..., 2] * 0.0722
    )
    tint = np.stack(
        [luminance * 0.995, luminance * 0.985, luminance * 1.045],
        axis=-1,
    )
    graded = linear * (1.0 - strength) + tint * strength
    srgb = np.where(
        graded <= 0.0031308,
        graded * 12.92,
        1.055 * np.power(np.clip(graded, 0.0, 1.0), 1.0 / 2.4) - 0.055,
    )
    return (np.clip(srgb, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)


def height_to_normal(height: np.ndarray, strength: float = 1.25) -> np.ndarray:
    """Convert LOLA elevation (km) to tangent-space normals using spherical distances."""
    h, w = height.shape
    lat = np.pi / 2.0 - (np.arange(h, dtype=np.float32) + 0.5) / h * np.pi
    cos_lat = np.maximum(np.cos(lat), 0.12)[:, None]
    dlon = (2.0 * np.pi) / w
    dlat = np.pi / h

    # Longitude increases east; image rows increase south.
    dx_km = MOON_RADIUS_KM * cos_lat * dlon
    dy_km = MOON_RADIUS_KM * dlat
    dh_east = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / (2.0 * dx_km)
    dh_south = (
        np.concatenate((height[1:2], height[2:], height[-1:]), axis=0)
        - np.concatenate((height[:1], height[:-2], height[-2:-1]), axis=0)
    ) / (2.0 * dy_km)

    nx = -dh_east * strength
    ny = dh_south * strength
    nz = np.ones_like(nx)

    # Fade tiny longitude derivatives at the poles where equirectangular pixels converge.
    pole_fade = np.clip((cos_lat - 0.04) / 0.24, 0.0, 1.0)
    nx *= pole_fade
    ny *= pole_fade
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack([nx / norm, ny / norm, nz / norm], axis=-1)
    return np.clip(normal * 0.5 + 0.5, 0.0, 1.0)


def render_preview(color: np.ndarray, normal: np.ndarray, output_path: str, size: int = 800) -> None:
    yy, xx = np.mgrid[-1.0:1.0:complex(size), -1.0:1.0:complex(size)]
    radius2 = xx * xx + yy * yy
    mask = radius2 <= 0.88 ** 2
    zz = np.sqrt(np.maximum(1.0 - radius2, 0.0))
    lon = np.arctan2(zz, xx)
    lat = np.arcsin(np.clip(-yy, -1.0, 1.0))
    u = lon / (2.0 * np.pi) + 0.5
    v = 0.5 - lat / np.pi

    albedo = sample_equirect(color.astype(np.float32) / 255.0, u, v)
    nmap = sample_equirect(normal, u, v) * 2.0 - 1.0
    east = np.stack([-np.sin(lon), np.zeros_like(lon), np.cos(lon)], axis=-1)
    north = np.stack(
        [-np.sin(lat) * np.cos(lon), np.cos(lat), -np.sin(lat) * np.sin(lon)],
        axis=-1,
    )
    sphere_n = np.stack(
        [np.cos(lat) * np.cos(lon), np.sin(lat), np.cos(lat) * np.sin(lon)],
        axis=-1,
    )
    world_n = east * nmap[..., 0:1] + north * nmap[..., 1:2] + sphere_n * nmap[..., 2:3]
    world_n /= np.maximum(np.linalg.norm(world_n, axis=-1, keepdims=True), 1e-6)

    light = np.array([-0.72, 0.34, 0.61], dtype=np.float32)
    light /= np.linalg.norm(light)
    diffuse = np.clip(np.sum(world_n * light, axis=-1), 0.0, 1.0)
    # Subtle fill preserves terrain visibility without flattening the terminator.
    shade = 0.14 + 0.96 * diffuse
    result = np.clip(albedo * shade[..., None], 0.0, 1.0)
    canvas = np.zeros((size, size, 3), dtype=np.uint8)
    canvas[mask] = (result[mask] * 255.0 + 0.5).astype(np.uint8)
    Image.fromarray(canvas, "RGB").save(output_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare NASA lunar maps for VESPERA.")
    parser.add_argument("--color", required=True, help="NASA LROC 4K sRGB color TIFF")
    parser.add_argument("--height", required=True, help="NASA LOLA 16 px/degree elevation TIFF (km)")
    parser.add_argument("--out", default="assets/moon-nasa/2048", help="output folder")
    parser.add_argument("--size", type=int, choices=(1024, 2048, 4096), default=2048)
    parser.add_argument("--normal-strength", type=float, default=1.25)
    parser.add_argument("--lavender-grade", type=float, default=0.12)
    args = parser.parse_args()

    started = time.time()
    for source in (args.color, args.height):
        if not os.path.isfile(source):
            parser.error(f"Input file does not exist: {source}")

    print("VESPERA Moon: preparing NASA LROC + LOLA maps")
    print(f"  Color source: {args.color}")
    color_image = Image.open(args.color).convert("RGB")
    color_image = color_image.resize((args.size, args.size // 2), Image.Resampling.LANCZOS)
    color_array = np.asarray(color_image, dtype=np.uint8)
    color_array = cool_lavender_grade(color_array, args.lavender_grade)

    print(f"  Elevation source: {args.height}")
    height_image = Image.open(args.height)
    height_raw = np.asarray(height_image)
    if height_raw.ndim != 2:
        parser.error(f"Expected a single-channel elevation TIFF, got shape {height_raw.shape}")
    height_raw = height_raw.astype(np.float32)
    if not np.isfinite(height_raw).all():
        parser.error("Elevation TIFF contains non-finite values.")
    if float(height_raw.max() - height_raw.min()) < 0.001:
        parser.error("Elevation TIFF appears to contain no usable terrain range.")

    elevation = resize_float_map(height_raw, args.size)
    normal = height_to_normal(elevation, args.normal_strength)

    os.makedirs(args.out, exist_ok=True)
    color_path = os.path.join(args.out, "color.webp")
    normal_path = os.path.join(args.out, "normal.webp")
    preview_path = os.path.join(args.out, "moon-preview-nasa.png")

    Image.fromarray(color_array, "RGB").save(color_path, quality=95, method=6)
    normal_u8 = (normal * 255.0 + 0.5).astype(np.uint8)
    Image.fromarray(normal_u8, "RGB").save(normal_path, quality=96, method=6)
    render_preview(color_array, normal, preview_path)

    print(f"  Elevation range: {height_raw.min():.4f} .. {height_raw.max():.4f} km")
    print(f"  color.webp:  {os.path.getsize(color_path) / 1024:.0f} KB")
    print(f"  normal.webp: {os.path.getsize(normal_path) / 1024:.0f} KB")
    print(f"  preview:     {preview_path}")
    print(f"  done in {time.time() - started:.1f}s")


if __name__ == "__main__":
    main()
