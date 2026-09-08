"""Mobil-gjennomgang: skjermbilder av hele forsiden ved 390 px i 760 px-steg (dev-server).
Kjør: python3 scripts/mobilbilder.py [url] [prefix]"""
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000/'
PRE = sys.argv[2] if len(sys.argv) > 2 else '/tmp/mob'
W = int(sys.argv[3]) if len(sys.argv) > 3 else 390

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': W, 'height': 844}, device_scale_factor=2)
        await pg.goto(URL, wait_until='load', timeout=120000)
        await pg.wait_for_timeout(1500)
        try:
            await pg.click('text=Kun nødvendige', timeout=1500)
        except Exception:
            pass
        await pg.wait_for_timeout(500)
        H = await pg.evaluate('document.documentElement.scrollHeight')
        y = 0; i = 0
        while y < H and i < 20:
            await pg.evaluate(f'window.scrollTo(0,{y})')
            await pg.wait_for_timeout(1600)
            await pg.screenshot(path=f'{PRE}_{i:02d}.jpg', quality=45)
            y += 760; i += 1
            H = await pg.evaluate('document.documentElement.scrollHeight')
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        print('shots', i, 'H', H, 'scrollW', sw)
        await b.close()
asyncio.run(main())
