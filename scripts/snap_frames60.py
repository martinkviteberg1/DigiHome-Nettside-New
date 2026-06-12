#!/usr/bin/env python3
"""Stillbilder fra 60s-reklamekuttet (?cut=60) for visuell QA."""
import asyncio
import sys
from playwright.async_api import async_playwright

URL = "http://localhost:3000/video?record=1&cut=60"
TIMES = [float(x) for x in sys.argv[1:]] or [3.0, 7.3, 12.0, 17.0, 21.36, 24.0]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars"])
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_function("window.__filmReady === true", timeout=30000)
        await page.wait_for_timeout(800)
        for t in TIMES:
            await page.evaluate(f"window.__setTime({t})")
            await asyncio.sleep(0.55)
            name = f"/tmp/cut60_t{str(t).replace('.', '_')}.jpg"
            await page.screenshot(path=name, type="jpeg", quality=80)
            print("OK t=%s -> %s" % (t, name), flush=True)
        await browser.close()

asyncio.run(main())
