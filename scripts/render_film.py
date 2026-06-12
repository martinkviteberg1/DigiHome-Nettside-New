#!/usr/bin/env python3
"""
Rendrer DigiHome-filmen «Utleie på autopilot» til MP4.
Frame-for-frame (deterministisk) + WebAudio-musikk renderet offline.

Filmatisk pipeline:
  - Fanger 60 fps og blander ned til 30 fps (tmix) => ekte motion blur (180° shutter)
  - Subtil filmatisk fargegradering (løftede svartnivåer, lilla skygger, mild kontrast)

Bruk:
  python3 scripts/render_film.py [--test]
"""
import asyncio
import base64
import os
import subprocess
import sys

from playwright.async_api import async_playwright

CAPTURE_FPS = 60   # fanges i 60 fps ...
OUT_FPS = 30       # ... og blandes ned til 30 fps med motion blur
DURATION = 84
URL = "http://localhost:3000/video?record=1"
FRAMES_DIR = "/tmp/film_frames"
WAV_PATH = "/tmp/film_music.wav"
OUT_PATH = "/app/public/film/digihome-utleie-pa-autopilot-16x9.mp4"
TEST_MODE = "--test" in sys.argv

TOTAL_FRAMES = CAPTURE_FPS * DURATION if not TEST_MODE else 12


async def render():
    os.makedirs(FRAMES_DIR, exist_ok=True)
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

        # varm opp alle bilder/fonter ved aa hoppe gjennom filmen
        for t in [3, 10, 17, 28, 35, 40, 45, 52, 57, 69]:
            await page.evaluate(f"window.__setTime({t})")
            await page.wait_for_timeout(250)
        await page.wait_for_timeout(1500)

        print(f"rendering {TOTAL_FRAMES} frames @ {CAPTURE_FPS}fps capture...", flush=True)
        for i in range(TOTAL_FRAMES):
            t = (i / CAPTURE_FPS) if not TEST_MODE else (i * 6.0)  # test: sample hele filmen
            t = min(t, DURATION - 0.001)
            await page.evaluate(f"window.__setTime({t})")
            await page.screenshot(path=f"{FRAMES_DIR}/f{i:05d}.jpg", type="jpeg", quality=92)
            if i % 300 == 0:
                print(f"  frame {i}/{TOTAL_FRAMES} (t={t:.1f}s)", flush=True)

        print("rendering music + voiceover (OfflineAudioContext)...", flush=True)
        wav_b64 = await page.evaluate(f"window.__renderMusicWav({DURATION})")
        with open(WAV_PATH, "wb") as f:
            f.write(base64.b64decode(wav_b64))
        print(f"music: {os.path.getsize(WAV_PATH) / 1e6:.1f} MB wav", flush=True)

        await browser.close()


def encode():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    # Filmatisk etterbehandling:
    #  1) tmix=2 + fps=30  -> motion blur (to 60fps-frames blandes per 30fps-frame)
    #  2) curves            -> løftede svartnivåer + myke høylys (film-look)
    #  3) colorbalance      -> lilla/blå tone i skygger (DigiHome-palett)
    #  4) eq                -> mild kontrast + metning
    vf = (
        "tmix=frames=2,fps=30,"
        "curves=master='0/0.012 0.5/0.5 1/0.995',"
        "colorbalance=rs=0.015:bs=0.045:bm=0.012,"
        "eq=contrast=1.03:saturation=1.05"
    )
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(CAPTURE_FPS),
        "-i", f"{FRAMES_DIR}/f%05d.jpg",
        "-i", WAV_PATH,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart",
        OUT_PATH,
    ]
    print(" ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)
    print(f"OUTPUT: {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1e6:.1f} MB)", flush=True)


if __name__ == "__main__":
    asyncio.run(render())
    if not TEST_MODE:
        encode()
    print("ALL DONE", flush=True)
