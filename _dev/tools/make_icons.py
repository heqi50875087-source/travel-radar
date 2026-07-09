#!/usr/bin/env python3
# 纸墨雷达 PWA 图标：纸底 + 黄铜同心圈 + 赤陶扫描扇 + 松绿光点
import math, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = f"{ROOT}/icons"
os.makedirs(OUT, exist_ok=True)

PAPER = (246, 241, 233, 255)
INK = (33, 28, 22, 255)
TERRA = (199, 92, 61, 255)
PINE = (47, 74, 63, 255)
BRASS = (176, 138, 79, 255)

def make(size):
    S = 4  # 超采样抗锯齿
    W = size * S
    img = Image.new("RGBA", (W, W), PAPER)
    d = ImageDraw.Draw(img)
    cx = cy = W / 2
    R = W * 0.36

    # 扫描扇（赤陶，余辉三层）
    for i, (span, alpha) in enumerate([(52, 46), (34, 90), (16, 160)]):
        ov = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.pieslice([cx - R, cy - R, cx + R, cy + R], -90 - span, -90, fill=TERRA[:3] + (alpha,))
        img = Image.alpha_composite(img, ov)
    d = ImageDraw.Draw(img)

    # 同心圈（黄铜）
    for i in range(1, 4):
        r = R * i / 3
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BRASS, width=max(2, W // 160))
    # 十字准线（淡墨）
    lw = max(2, W // 220)
    d.line([cx - R, cy, cx + R, cy], fill=INK[:3] + (70,), width=lw)
    d.line([cx, cy - R, cx, cy + R], fill=INK[:3] + (70,), width=lw)
    # 扫描线（赤陶粗线指向正上）
    d.line([cx, cy, cx, cy - R], fill=TERRA, width=max(3, W // 90))
    # 光点（松绿 2 + 赤陶 1）
    for (ang, rr, col, sz) in [(35, 0.72, PINE, 0.045), (150, 0.5, PINE, 0.038), (250, 0.62, TERRA, 0.05)]:
        a = math.radians(ang)
        px, py = cx + math.cos(a) * R * rr, cy - math.sin(a) * R * rr
        s = W * sz / 2
        d.ellipse([px - s, py - s, px + s, py + s], fill=col)
    # 中心点（墨）
    s = W * 0.028
    d.ellipse([cx - s, cy - s, cx + s, cy + s], fill=INK)

    return img.resize((size, size), Image.LANCZOS)

for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    make(size).save(f"{OUT}/{name}")
    print(name)

# favicon 32
make(64).resize((32, 32), Image.LANCZOS).save(f"{OUT}/favicon.png")
print("favicon.png")
