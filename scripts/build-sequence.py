"""Builds the roboPet scroll sequence from a Veo turntable clip.

Veo exports 720p, which reads soft once a 2x display upscales it again. Each frame is
upscaled 2x with Real-ESRGAN for edge detail, blended with a lanczos upscale so the PLA
layer-line texture is not smoothed into plastic, then black-lifted and exported as WebP
at two widths. The site shows the film in black and white, so run
scripts/grade-frames-bw.mjs on the output afterwards.

Usage (needs torch, spandrel, pillow; cwebp + ffmpeg on PATH):
  python scripts/build-sequence.py <clip.mp4> <RealESRGAN_x2plus.pth> [--frames 240]
  node scripts/grade-frames-bw.mjs
"""
import argparse, pathlib, subprocess, tempfile
import numpy as np, torch
from PIL import Image, ImageFilter
from spandrel import ModelLoader

p = argparse.ArgumentParser()
p.add_argument("clip"); p.add_argument("weights")
p.add_argument("--frames", type=int, default=240)
p.add_argument("--stage", default="15,17,16", help="measured source stage RGB")
p.add_argument("--out", default="public/sequence/robopet")
p.add_argument("--blend", type=float, default=0.62)
p.add_argument("--resume", action="store_true", help="skip frames already exported")
a = p.parse_args()

out = pathlib.Path(a.out)
for size in ("lg", "sm"):
    (out / size).mkdir(parents=True, exist_ok=True)
    if not a.resume:
        for old in (out / size).glob("*.webp"):
            old.unlink()

# Per-channel tone map that lands the measured stage colour on pure black while
# leaving highlights untouched.
SRC = np.array([float(v) for v in a.stage.split(",")], np.float32)
DST = np.array([0, 0, 0], np.float32)

def grade(px):
    low = px * (DST / SRC)
    high = DST + (px - SRC) * ((255 - DST) / (255 - SRC))
    return np.where(px < SRC, low, high)

dev = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
model = ModelLoader().load_from_file(a.weights).to(dev).eval()
# fp16 roughly halves Metal inference time with no visible difference after blending.
half = dev.type == "mps"
if half:
    model = model.half()

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["ffmpeg", "-v", "error", "-i", a.clip, "-frames:v", str(a.frames),
                    f"{tmp}/%03d.png"], check=True)
    for i, f in enumerate(sorted(pathlib.Path(tmp).glob("*.png"))):
        if a.resume and (out / "sm" / f"{i + 1:03d}.webp").exists():
            continue
        src = Image.open(f).convert("RGB")
        x = torch.from_numpy(np.asarray(src, np.float32) / 255).permute(2, 0, 1)[None].to(dev)
        if half:
            x = x.half()
        with torch.no_grad():
            sr = model(x).float().clamp(0, 1)[0].permute(1, 2, 0).cpu().numpy() * 255
        lz = np.asarray(src.resize((sr.shape[1], sr.shape[0]), Image.LANCZOS), np.float32)
        mix = sr * a.blend + lz * (1 - a.blend)
        mix = grade(mix)
        img = Image.fromarray(mix.clip(0, 255).round().astype(np.uint8))
        img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
        for size, width, q in (("lg", 1920, "80"), ("sm", 960, "76")):
            png = f"{tmp}/o-{size}.png"
            img.resize((width, round(width * img.height / img.width)), Image.LANCZOS).save(png)
            subprocess.run(["cwebp", "-quiet", "-q", q, "-m", "6", png, "-o",
                            str(out / size / f"{i + 1:03d}.webp")], check=True)
        if i % 40 == 0:
            print(f"{i}/{a.frames}", flush=True)
print("done")
