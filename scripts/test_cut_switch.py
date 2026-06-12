#!/usr/bin/env python3
"""Interaksjonstest: bytt til 60s-kuttet via pillen, spill av, sjekk nedlastingsstatus."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:3000/video", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        # 1) klikk Reklame-pillen på plakaten
        pill = page.get_by_text("Reklame · 1:00").first
        await pill.click(force=True)
        await page.wait_for_timeout(600)
        await page.screenshot(path="/tmp/ui_60poster.jpg", type="jpeg", quality=70)
        print("pill klikket")
        # 2) start filmen (klikk på selve scenen)
        await page.mouse.click(640, 300)
        await page.wait_for_timeout(2500)
        await page.screenshot(path="/tmp/ui_60playing.jpg", type="jpeg", quality=70)
        # 3) sjekk at tid/varighet viser 1:00
        body = await page.inner_text("body")
        print("viser 1:00:", "1:00" in body)
        # 4) sjekk nedlastingsknapp (dlReady)
        dl = await page.locator('button[aria-label="Last ned MP4"]').count()
        print("nedlastingsknapp synlig:", dl > 0)
        print("js-feil:", errors if errors else "ingen")
        await browser.close()

asyncio.run(main())
