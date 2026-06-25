#!/usr/bin/env python3
"""
Rendrer DigiHome × Keyhole-integrasjonsfilmen til MP4 (uten lyd).
Frame-for-frame (deterministisk via window.__setTime) + filmatisk grade.

  - Fanger 60 fps og blander ned til 30 fps (tmix) => motion blur (180° shutter)
  - Subtil filmatisk fargegradering (løftede svartnivåer, mild kontrast/metning)

Bruk:
  python3 scripts/render_keyhole.py [--test]
"""
import asyncio
import base64
import os
import subprocess
import sys

from playwright.async_api import async_playwright

CAPTURE_FPS = 60
OUT_FPS = 30
DURATION = 53.5
URL = "http://localhost:3000/keyhole?record=1"
FRAMES_DIR = "/tmp/keyhole_frames"
WAV_PATH = "/tmp/keyhole_music.wav"
OUT_PATH = "/app/public/film/digihome-keyhole-16x9.mp4"
TEST_MODE = "--test" in sys.argv

TOTAL_FRAMES = int(CAPTURE_FPS * DURATION) if not TEST_MODE else 12


async def render():
    os.makedirs(FRAMES_DIR, exist_ok=True)
    for f in os.listdir(FRAMES_DIR):
        if f.endswith(".jpg"):
            os.remove(os.path.join(FRAMES_DIR, f))
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--force-device-scale-factor=1",
                "--hide-scrollbars",
                "--disable-gpu-vsync",
            ],
        )
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_function("window.__filmReady === true", timeout=30000)
        await page.evaluate("document.fonts.ready")
        print("page ready, warming up assets...", flush=True)

        for t in [2, 6, 11, 13, 18, 25, 30, 36, 44, 49, 52]:
            await page.evaluate(f"window.__setTime({t})")
            await page.wait_for_timeout(220)
        await page.wait_for_timeout(1200)

        print(f"rendering {TOTAL_FRAMES} frames @ {CAPTURE_FPS}fps capture...", flush=True)
        for i in range(TOTAL_FRAMES):
            t = (i / CAPTURE_FPS) if not TEST_MODE else (i * (DURATION / 12))
            t = min(t, DURATION - 0.001)
            await page.evaluate(f"window.__setTime({t})")
            await page.screenshot(path=f"{FRAMES_DIR}/f{i:05d}.jpg", type="jpeg", quality=92)
            if i % 300 == 0:
                print(f"  frame {i}/{TOTAL_FRAMES} (t={t:.1f}s)", flush=True)

        await browser.close()


def encode():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    vf = (
        "tmix=frames=2,fps=30,"
        "curves=master='0/0.012 0.5/0.5 1/0.995',"
        "colorbalance=rs=0.012:bs=0.030:bm=0.010,"
        "eq=contrast=1.03:saturation=1.05"
    )
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(CAPTURE_FPS),
        "-i", f"{FRAMES_DIR}/f%05d.jpg",
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-an", "-movflags", "+faststart",
        OUT_PATH,
    ]
    print(" ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)
    print(f"OUTPUT: {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1e6:.1f} MB)", flush=True)


if __name__ == "__main__":
    asyncio.run(render())
    encode()
    print("ALL DONE", flush=True)
