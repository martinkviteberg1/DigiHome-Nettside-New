import os, glob, shutil, time
from playwright.sync_api import sync_playwright
import imageio_ffmpeg

SHELL = '/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell'
ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--force-color-profile=srgb']
FF = imageio_ffmpeg.get_ffmpeg_exe()
BASE = 'http://localhost:3000'
WORK = '/app/.vidwork'
OUTDIR = '/app/public/promo'
shutil.rmtree(WORK, ignore_errors=True); os.makedirs(WORK, exist_ok=True); os.makedirs(OUTDIR, exist_ok=True)

AUTO = "() => { document.documentElement.style.scrollBehavior='auto'; }"

# Myk scroll + synkroniserte forklarende bildetekster p\u00e5 \u00e9n klokke. Bildeteksten
# ligger som en nedre plakat i appens overskriftsfont, toner inn/ut ved hvert punkt.
SCROLLCAP = r"""(arg) => new Promise((res) => {
  const { caps, dur, mode, val } = arg;
  if (!window.__ovl) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:var(--font-body),sans-serif';
    const cap = document.createElement('div');
    cap.style.cssText = 'position:absolute;left:50%;bottom:70px;transform:translate(-50%,16px);width:calc(100% - 100px);max-width:900px;opacity:0;transition:opacity .42s ease, transform .42s cubic-bezier(0.2,0.7,0.2,1)';
    const inner = document.createElement('div');
    inner.style.cssText = 'display:inline-flex;align-items:flex-start;gap:16px;padding:22px 30px;border-radius:22px;background:rgba(243,241,236,0.94);box-shadow:0 16px 50px rgba(21,19,15,0.18),0 0 0 1px rgba(21,19,15,0.06)';
    inner.innerHTML = '<span style="margin-top:12px;flex:none;width:11px;height:11px;border-radius:999px;background:#D496FF"></span><span id="dhcap" style="font-family:var(--font-heading),sans-serif;font-weight:700;font-size:32px;line-height:1.16;letter-spacing:-0.02em;color:#15130F"></span>';
    cap.appendChild(inner); wrap.appendChild(cap); document.body.appendChild(wrap);
    window.__ovl = { cap, txt: inner.querySelector('#dhcap') };
  }
  const setCap = (t) => {
    const o = window.__ovl;
    o.cap.style.opacity = '0'; o.cap.style.transform = 'translate(-50%,16px)';
    if (!t) return;
    setTimeout(() => { o.txt.textContent = t; o.cap.style.opacity = '1'; o.cap.style.transform = 'translate(-50%,0)'; }, 170);
  };
  const start = performance.now();
  const y0 = window.scrollY;
  const max = document.body.scrollHeight - window.innerHeight;
  const dist = mode === 'to' ? (val * max - y0) : val;
  const ease = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  let ci = -2;
  function fr(now) {
    const el = now - start;
    const p = Math.min(1, el / dur);
    window.scrollTo(0, y0 + ease(p) * dist);
    let idx = -1;
    for (let i = 0; i < caps.length; i++) { if (el >= caps[i].at) idx = i; }
    if (idx !== ci) { ci = idx; setCap(idx >= 0 ? caps[idx].t : ''); }
    if (p < 1) requestAnimationFrame(fr); else { setTimeout(() => { setCap(''); setTimeout(res, 350); }, 550); }
  }
  requestAnimationFrame(fr);
})"""

def normalize(webm, ss, t, out):
    return os.system(f'{FF} -y -ss {ss:.2f} -i "{webm}" -t {t:.2f} -vf "fps=30,scale=1080:1080:flags=bicubic,setsar=1,format=yuv420p" -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "{out}" 2>>/tmp/ff.log')

segs = []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=SHELL, headless=True, args=ARGS)
    w = browser.new_context(viewport={'width': 1080, 'height': 1080}); wp = w.new_page()
    for u in ['/promo?del=intro&record=1', '/promo?del=outro&record=1', '/?record=1', '/lp/inntekt?record=1']:
        try: wp.goto(BASE + u, wait_until='networkidle', timeout=45000); wp.wait_for_timeout(700)
        except Exception as e: print('warmup', u, repr(e)[:100])
    w.close(); print('WARMUP done')

    def rec():
        ctx = browser.new_context(viewport={'width': 1080, 'height': 1080}, device_scale_factor=1,
                                  record_video_dir=WORK, record_video_size={'width': 1080, 'height': 1080},
                                  reduced_motion='no-preference', color_scheme='light')
        return ctx, ctx.new_page(), time.time()

    # 1) INTRO (kinetisk, forklarende)
    ctx, page, t0 = rec()
    page.goto(BASE + '/promo?del=intro&record=1', wait_until='networkidle')
    mark = time.time(); page.wait_for_timeout(5000)
    ss = max(0.0, mark - t0 + 0.4); ctx.close(); segs.append((page.video.path(), ss, 4.4)); print('intro ss=%.2f' % ss)

    # 2) FORSIDE + forklarende bildetekster
    caps_f = [
        {'at': 0,     't': 'Skriv inn adressen \u2014 vi finner boligen og lager annonsen'},
        {'at': 2900,  't': 'Leietaker, kontrakt med BankID og husleie \u2014 automatisk'},
        {'at': 5600,  't': 'Lei ut selv, eller la DigiHome ta hele jobben'},
        {'at': 8300,  't': 'Tre enkle steg \u2014 resten g\u00e5r p\u00e5 autopilot'},
        {'at': 10900, 't': 'Full oversikt. Utleie i Bergen, uten styret'},
    ]
    ctx, page, t0 = rec()
    page.goto(BASE + '/?record=1', wait_until='networkidle'); page.wait_for_timeout(1500)
    page.evaluate(AUTO)
    page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(1600)
    page.evaluate("() => window.scrollTo(0, 0)"); page.wait_for_timeout(1000)
    mark = time.time()
    page.evaluate(SCROLLCAP, {'caps': caps_f, 'dur': 13000, 'mode': 'to', 'val': 1.0})
    ss = max(0.0, mark - t0); ctx.close(); segs.append((page.video.path(), ss, 13.8)); print('forside ss=%.2f' % ss)

    # 3) INNTEKT + bildetekst
    caps_i = [{'at': 0, 't': 'Opptil 30 % h\u00f8yere leieinntekt \u2014 p\u00e5 samme bolig'}]
    ctx, page, t0 = rec()
    page.goto(BASE + '/lp/inntekt?record=1', wait_until='networkidle'); page.wait_for_timeout(1200)
    page.evaluate(AUTO)
    page.evaluate("""() => { const el = document.querySelector('[data-testid=\\"lp-inntektsmodell\\"]'); if (el) { const top = el.getBoundingClientRect().top + window.scrollY; window.scrollTo(0, Math.max(0, top - window.innerHeight*0.82)); } }""")
    mark = time.time()
    page.evaluate(SCROLLCAP, {'caps': caps_i, 'dur': 4600, 'mode': 'by', 'val': 950})
    ss = max(0.0, mark - t0); ctx.close(); segs.append((page.video.path(), ss, 5.6)); print('inntekt ss=%.2f' % ss)

    # 4) OUTRO
    ctx, page, t0 = rec()
    page.goto(BASE + '/promo?del=outro&record=1', wait_until='networkidle')
    mark = time.time(); page.wait_for_timeout(4200)
    ss = max(0.0, mark - t0 + 0.45); ctx.close(); segs.append((page.video.path(), ss, 3.6)); print('outro ss=%.2f' % ss)

    browser.close()

open('/tmp/ff.log', 'w').close()
norm = []
for i, (webm, ss, t) in enumerate(segs):
    out = f'{WORK}/seg{i}.mp4'; rc = normalize(webm, ss, t, out)
    ok = os.path.exists(out) and os.path.getsize(out) > 0
    print(f'seg{i} rc={rc} ok={ok} size={os.path.getsize(out) if ok else 0}'); norm.append((out, t))

f = 0.4
d = [t for (_, t) in norm]
o1 = d[0]-f; o2 = d[0]+d[1]-2*f; o3 = d[0]+d[1]+d[2]-3*f; total = sum(d)-3*f
fc = (f'[0:v][1:v]xfade=transition=fade:duration={f}:offset={o1:.2f}[a];'
      f'[a][2:v]xfade=transition=fade:duration={f}:offset={o2:.2f}[b];'
      f'[b][3:v]xfade=transition=fade:duration={f}:offset={o3:.2f},'
      f'fade=t=in:st=0:d=0.5,fade=t=out:st={total-0.6:.2f}:d=0.6,format=yuv420p[v]')
FINAL = f'{OUTDIR}/digihome-linkedin.mp4'
inputs = ' '.join(f'-i "{o}"' for (o, _) in norm)
rc = os.system(f'{FF} -y {inputs} -filter_complex "{fc}" -map "[v]" -r 30 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "{WORK}/noaudio.mp4" 2>>/tmp/ff.log')
# stille lydspor for trygg LinkedIn-opplasting
os.system(f'{FF} -y -i "{WORK}/noaudio.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest -c:v copy -c:a aac -b:a 128k -movflags +faststart "{FINAL}" 2>>/tmp/ff.log')
print('FINAL rc', rc, 'exists', os.path.exists(FINAL), 'size', os.path.getsize(FINAL) if os.path.exists(FINAL) else 0, 'dur~', round(total,1))

FR = '/app/.promoframes'; shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR, exist_ok=True)
os.system(f'{FF} -y -i "{FINAL}" -vf "fps=1/2,scale=540:540" "{FR}/frame_%02d.jpg" 2>>/tmp/ff.log')
print('frames', len(glob.glob(FR + '/*.jpg')))
