#!/usr/bin/env python3
"""Dependency-free, reproducible 180x180 iPhone home-screen PNG.
The detailed SVG logo remains the main app artwork.
"""
from pathlib import Path
import struct
import zlib

WIDTH = HEIGHT = 180
palette = (
    (9, 15, 11),      # dark background
    (163, 255, 18),   # bright lime camera lens / headlights
    (20, 39, 27),     # dark camera glass
    (139, 164, 150),  # metal truck
    (5, 8, 7),        # window and grille
)
pixels = bytearray([0] * (WIDTH * HEIGHT))

def rect(x1, y1, x2, y2, color):
    for y in range(max(0, y1), min(HEIGHT - 1, y2) + 1):
        for x in range(max(0, x1), min(WIDTH - 1, x2) + 1):
            pixels[y * WIDTH + x] = color

# Camera lens.
for y in range(HEIGHT):
    for x in range(WIDTH):
        d2 = (x - 90) ** 2 + (y - 87) ** 2
        if d2 <= 80 ** 2:
            pixels[y * WIDTH + x] = 2
        if 74 ** 2 <= d2 <= 80 ** 2:
            pixels[y * WIDTH + x] = 1
        if 69 ** 2 <= d2 <= 70 ** 2:
            pixels[y * WIDTH + x] = 3

# Semi-truck's stacks, raised cab, windshield, grille, lights, bumper.
rect(65, 47, 70, 97, 3)
rect(110, 47, 115, 97, 3)
rect(68, 73, 112, 118, 3)
rect(72, 77, 108, 101, 4)
rect(49, 116, 131, 151, 3)
rect(70, 114, 110, 151, 4)
for x in (77, 86, 95, 104):
    rect(x, 119, x + 2, 143, 3)
rect(50, 126, 67, 138, 1)
rect(113, 126, 130, 138, 1)
rect(47, 150, 133, 156, 1)
rect(51, 156, 71, 164, 4)
rect(109, 156, 129, 164, 4)

def chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xffffffff)

raw = b"".join(b"\x00" + bytes(pixels[y * WIDTH:(y + 1) * WIDTH]) for y in range(HEIGHT))
png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 3, 0, 0, 0))
    + chunk(b"PLTE", bytes(channel for color in palette for channel in color))
    + chunk(b"IDAT", zlib.compress(raw, 9))
    + chunk(b"IEND", b"")
)
Path("apple-touch-icon.png").write_bytes(png)
print(f"Generated complete {WIDTH}x{HEIGHT} iPhone icon ({len(png)} bytes).")
