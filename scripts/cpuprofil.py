"""CPU-profil av forsiden (mobil, 4x CPU-throttling) mot et lokalt produksjonsbygg.
Aggregerer self-time per (url, funksjon) fra V8-sampling-profileren — svarer på «hva bruker hovedtråden tid på».
Kjør: python3 scripts/cpuprofil.py [url] [sekunder] [scroll:0|1]"""
import asyncio, sys
from collections import defaultdict
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100/'
SEK = float(sys.argv[2]) if len(sys.argv) > 2 else 7
SCROLL = (sys.argv[3] == '1') if len(sys.argv) > 3 else False

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell', args=['--no-sandbox', '--disable-dev-shm-usage'])
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        cdp = await ctx.new_cdp_session(page)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        await cdp.send('Profiler.enable')
        await cdp.send('Profiler.setSamplingInterval', {'interval': 500})
        await cdp.send('Profiler.start')
        await page.goto(URL, wait_until='commit', timeout=120000)
        if SCROLL:
            for y in range(0, 6000, 400):
                await page.evaluate(f'window.scrollTo(0,{y})')
                await page.wait_for_timeout(250)
        else:
            await page.wait_for_timeout(SEK * 1000)
        prof = (await cdp.send('Profiler.stop'))['profile']
        nodes = {n['id']: n for n in prof['nodes']}
        # self time per node = antall samples * delta
        self_t = defaultdict(float)
        samples = prof['samples']; deltas = prof['timeDeltas']
        for sid, dt in zip(samples, deltas):
            self_t[sid] += dt / 1000.0
        total = sum(self_t.values())
        agg = defaultdict(float); by_url = defaultdict(float)
        idle = 0
        for nid, t in self_t.items():
            cf = nodes[nid]['callFrame']
            fn = cf['functionName'] or '(anon)'
            url = cf['url'].replace('http://localhost:3100', '') or '(native)'
            if fn in ('(idle)', '(program)', '(garbage collector)') and not cf['url']:
                if fn == '(idle)': idle += t
                agg[(fn, '')] += t; continue
            agg[(fn, url[-48:] + ':' + str(cf['lineNumber']))] += t
            by_url[url[-60:]] += t
        print(f'total {total:.0f}ms  idle {idle:.0f}ms  busy {total-idle:.0f}ms')
        print('-- per url --')
        for u, t in sorted(by_url.items(), key=lambda kv: -kv[1])[:12]: print(f'  {t:7.0f}ms  {u}')
        print('-- per funksjon (self) --')
        for (fn, loc), t in sorted(agg.items(), key=lambda kv: -kv[1])[:40]:
            if fn == '(idle)': continue
            print(f'  {t:7.0f}ms  {fn[:40]:40s} {loc}')
        await browser.close()

asyncio.run(main())
