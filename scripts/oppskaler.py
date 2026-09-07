"""Oppskalerer produktfilmens scenefotoer med Real-ESRGAN (ONNX, CPU) — for skarpe fullskjermsbilder på retina.

Modeller (BSD-3, eksportert 1:1 fra RealESRGAN_x2plus / x4plus):
  https://huggingface.co/SceneWorks/real-esrgan-onnx  ->  /tmp/sr/real_esrgan_x2.onnx, real_esrgan_x4.onnx
Kjør: python3 scripts/oppskaler.py <inn> <ut-basenavn> <faktor 2|4> <maalbredde> [ekstra bredder,...]
  Lager <ut-basenavn>-<bredde>.webp for maalbredde og ev. ekstra bredder (nedskalert med Lanczos fra SR-resultatet).
Flislegging 384 px m/ 24 px overlapp (dynamisk H/W i modellen).
"""
import sys
import time

import numpy as np
import onnxruntime as ort
from PIL import Image

TILE = 384
PAD = 24


def sr(im: Image.Image, faktor: int) -> Image.Image:
    sess = ort.InferenceSession(f"/root/sr/real_esrgan_x{faktor}.onnx", providers=["CPUExecutionProvider"])
    x0_ = np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0  # H W 3
    H0, W0, _ = x0_.shape
    # x2-modellen bruker pixel-unshuffle: alle mål må være delelige med 4 → reflekter-padd hele bildet
    ph = (-H0) % 4; pw = (-W0) % 4
    x = np.pad(x0_, ((0, ph), (0, pw), (0, 0)), mode="reflect") if (ph or pw) else x0_
    h, w, _ = x.shape
    ut = np.zeros((h * faktor, w * faktor, 3), dtype=np.float32)
    t0 = time.time()
    for y0 in range(0, h, TILE):
        for x0 in range(0, w, TILE):
            y1 = min(h, y0 + TILE); x1 = min(w, x0 + TILE)
            py0 = max(0, y0 - PAD); px0 = max(0, x0 - PAD); py1 = min(h, y1 + PAD); px1 = min(w, x1 + PAD)
            flis = x[py0:py1, px0:px1].transpose(2, 0, 1)[None]
            res = sess.run(None, {"input": flis})[0][0].transpose(1, 2, 0)
            # klipp bort padden (i SR-koordinater)
            oy0 = (y0 - py0) * faktor; ox0 = (x0 - px0) * faktor
            oy1 = oy0 + (y1 - y0) * faktor; ox1 = ox0 + (x1 - x0) * faktor
            ut[y0 * faktor:y1 * faktor, x0 * faktor:x1 * faktor] = res[oy0:oy1, ox0:ox1]
        print(f"  rad {y0}/{h} ({time.time() - t0:.0f}s)", flush=True)
    ut = ut[:H0 * faktor, :W0 * faktor]
    return Image.fromarray((np.clip(ut, 0, 1) * 255).round().astype(np.uint8))


def main():
    inn, base, faktor, maal = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    ekstra = [int(b) for b in sys.argv[5:]]
    im = Image.open(inn).convert("RGB")
    print("inn", im.size, "->", faktor, "x", flush=True)
    stor = sr(im, faktor)
    print("sr", stor.size, flush=True)
    for b in [maal] + ekstra:
        if b > stor.size[0]:
            print("!! maal", b, "> sr-bredde", stor.size[0]); b = stor.size[0]
        hh = round(stor.size[1] * b / stor.size[0])
        r = stor.resize((b, hh), Image.LANCZOS)
        ut = f"{base}-{b}.webp"
        r.save(ut, "WEBP", quality=82, method=6)
        import os
        print("skrev", ut, r.size, f"{os.path.getsize(ut) / 1e6:.2f} MB", flush=True)


if __name__ == "__main__":
    main()
