"""Mobilprofil av forsiden mot et lokalt produksjonsbygg (port 3100).
Måler: DOM-noder, layout/style-tall (CDP Performance), lange oppgaver, CLS, LCP,
bytes per ressurstype, og scroll-jank (lange frames under programmert scroll).
Kjør: python3 scripts/profil.py [url]
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100/'

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell', args=['--no-sandbox', '--disable-dev-shm-usage'])
        ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True,
                                        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        page = await ctx.new_page()
        cdp = await ctx.new_cdp_session(page)
        await cdp.send('Performance.enable')
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 40, 'downloadThroughput': 1.6 * 1024 * 1024 / 8 * 4, 'uploadThroughput': 750 * 1024 / 8})
        reqs = []
        page.on('response', lambda r: reqs.append(r))
        await page.add_init_script("""
          window.__lt=[]; window.__cls=0; window.__lcp=0; window.__shifts=[];
          try { new PerformanceObserver(l=>{for(const e of l.getEntries()) window.__lt.push(e.duration)}).observe({type:'longtask',buffered:true}); } catch(e){}
          try { new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput){ window.__cls+=e.value; window.__shifts.push({v:e.value,t:Math.round(e.startTime),src:(e.sources||[]).map(s=>s.node&&(s.node.tagName+'.'+(s.node.className||'').toString().slice(0,60))).slice(0,3)}); }}).observe({type:'layout-shift',buffered:true}); } catch(e){}
          try { new PerformanceObserver(l=>{const es=l.getEntries(); const e=es[es.length-1]; window.__lcp=e.startTime; window.__lcpEl=e.element&&(e.element.tagName+' '+(e.element.getAttribute('src')||e.element.getAttribute('poster')||e.element.textContent||'').slice(0,80));}).observe({type:'largest-contentful-paint',buffered:true}); } catch(e){}
        """)
        t0 = asyncio.get_event_loop().time()
        await page.goto(URL, wait_until='load', timeout=120000)
        load_t = asyncio.get_event_loop().time() - t0
        await page.wait_for_timeout(3000)
        m = (await cdp.send('Performance.getMetrics'))['metrics']
        M = {x['name']: x['value'] for x in m}
        nodes = await page.evaluate('document.getElementsByTagName("*").length')
        lt = await page.evaluate('window.__lt')
        cls = await page.evaluate('window.__cls')
        shifts = await page.evaluate('window.__shifts')
        lcp = await page.evaluate('window.__lcp')
        lcp_el = await page.evaluate('window.__lcpEl')
        print(f'load {load_t:.2f}s  DOM nodes {nodes}  LCP {lcp:.0f}ms el={lcp_el}')
        print(f'longtasks n={len(lt)} sum={sum(lt):.0f}ms max={max(lt) if lt else 0:.0f}ms')
        print(f'CLS {cls:.4f}', json.dumps(shifts[:8]))
        print('Layout', round(M.get('LayoutCount', 0)), 'RecalcStyle', round(M.get('RecalcStyleCount', 0)), 'LayoutDur', round(M.get('LayoutDuration', 0) * 1000), 'ms', 'RecalcDur', round(M.get('RecalcStyleDuration', 0) * 1000), 'ms', 'Script', round(M.get('ScriptDuration', 0) * 1000), 'ms', 'Task', round(M.get('TaskDuration', 0) * 1000), 'ms', 'JSHeap', round(M.get('JSHeapUsedSize', 0) / 1e6), 'MB')
        # bytes per type
        by = {}
        for r in reqs:
            try:
                h = await r.header_value('content-length')
                n = int(h) if h else 0
            except Exception:
                n = 0
            t = r.request.resource_type
            by.setdefault(t, [0, 0]); by[t][0] += 1; by[t][1] += n
        print('requests:', {k: f'{v[0]}x {v[1]//1024}kB' for k, v in sorted(by.items(), key=lambda kv: -kv[1][1])})
        big = []
        for r in reqs:
            try:
                h = await r.header_value('content-length'); n = int(h) if h else 0
            except Exception:
                n = 0
            big.append((n, r.request.resource_type, r.url.split('/', 3)[-1][:80]))
        big.sort(reverse=True)
        for n, t, u in big[:18]: print(f'   {n//1024:5d}kB {t:10s} {u}')
        # scroll-jank: programmatic scroll over 6 s, count frames > 50 ms
        jank = await page.evaluate("""() => new Promise(res => {
          const frames=[]; let last=performance.now(); let y=0; const H=document.documentElement.scrollHeight-innerHeight; const t0=performance.now();
          function step(){ const now=performance.now(); frames.push(now-last); last=now; const p=Math.min(1,(now-t0)/7000); window.scrollTo(0, p*H); if(p<1) requestAnimationFrame(step); else res({n:frames.length, long:frames.filter(f=>f>50).length, vlong:frames.filter(f=>f>100).length, max:Math.round(Math.max(...frames)), avg:Math.round(frames.reduce((a,b)=>a+b,0)/frames.length), H}); }
          requestAnimationFrame(step);
        })""")
        print('scroll-jank', jank)
        m2 = (await cdp.send('Performance.getMetrics'))['metrics']
        M2 = {x['name']: x['value'] for x in m2}
        print('after scroll: Layout +', round(M2.get('LayoutCount', 0) - M.get('LayoutCount', 0)), 'Recalc +', round(M2.get('RecalcStyleCount', 0) - M.get('RecalcStyleCount', 0)), 'LayoutDur +', round((M2.get('LayoutDuration', 0) - M.get('LayoutDuration', 0)) * 1000), 'ms', 'Script +', round((M2.get('ScriptDuration', 0) - M.get('ScriptDuration', 0)) * 1000), 'ms')
        lt2 = await page.evaluate('window.__lt')
        print('longtasks during scroll:', len(lt2) - len(lt), 'sum', round(sum(lt2[len(lt):])), 'ms')
        cls2 = await page.evaluate('window.__cls'); shifts2 = await page.evaluate('window.__shifts')
        print(f'CLS total {cls2:.4f}', json.dumps(shifts2[len(shifts):len(shifts)+8]))
        vw = await page.evaluate('document.documentElement.clientWidth')
        off = await page.evaluate("() => [...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0,5).map(e => e.tagName+'.'+(e.className||'').toString().slice(0,50))")
        print('VIEWPORT', vw, 'OVERFLOW', off)
        by2 = {}
        for r in reqs:
            try:
                h = await r.header_value('content-length'); n = int(h) if h else 0
            except Exception:
                n = 0
            t = r.request.resource_type
            by2.setdefault(t, [0, 0]); by2[t][0] += 1; by2[t][1] += n
        print('requests after full scroll:', {k: f'{v[0]}x {v[1]//1024}kB' for k, v in sorted(by2.items(), key=lambda kv: -kv[1][1])})
        await browser.close()

asyncio.run(main())
