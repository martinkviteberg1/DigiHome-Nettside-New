#!/usr/bin/env python3
"""Tar stillbilder av filmen ved gitte tidspunkter for visuell verifisering."""
import asyncio
import sys
from playwright.async_api import async_playwright

TIMES = [float(x) for x in sys.argv[1:]] or [3.5, 11.5, 17.5, 22.0, 29.0, 35.0, 41.0, 46.0, 52.8, 57.0, 62.0, 66.0, 70.0]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1", "--hide-scrollbars"],
        )
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        await page.goto("http://localhost:3000/video?record=1", wait_until="networkidle")
        await page.wait_for_function("window.__filmReady === true", timeout=30000)
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(800)
        for t in TIMES:
            await page.evaluate(f"window.__setTime({t})")
            await page.wait_for_timeout(450)
            path = f"/tmp/snap_t{str(t).replace('.', '_')}.jpg"
            await page.screenshot(path=path, type="jpeg", quality=85)
            print(f"OK t={t} -> {path}", flush=True)
        await browser.close()

asyncio.run(main())
