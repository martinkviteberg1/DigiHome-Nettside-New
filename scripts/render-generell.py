import os, glob, shutil, time, sys
from playwright.sync_api import sync_playwright
import imageio_ffmpeg

# ---------------------------------------------------------------------------
# Generell DigiHome-markedsfilm. Rent brandet, forklarende, INGEN passiv scroll.
# Seks scener fra /promo (?del=...&record=1) settes sammen med myke kryssfades.
# Standard: vertikal 9:16 (1080x1920). Kan overstyres: python render-generell.py square|wide
# Skriver til public/promo/digihome-generell*.mp4 (rører ikke LinkedIn-videoen).
# ---------------------------------------------------------------------------

MODE = (sys.argv[1] if len(sys.argv) > 1 else 'vertical').lower()
DIMS = {'vertical': (1080, 1920, ''), 'square': (1080, 1080, '-1x1'), 'wide': (1920, 1080, '-16x9')}
W, H, SUFFIX = DIMS.get(MODE, DIMS['vertical'])

SHELL = '/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell'
ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--force-color-profile=srgb']
FF = imageio_ffmpeg.get_ffmpeg_exe()
BASE = 'http://localhost:3000'
WORK = '/app/.vidwork_g'
OUTDIR = '/app/public/promo'
FINAL = f'{OUTDIR}/digihome-generell{SUFFIX}.mp4'
LOG = '/tmp/ffg.log'
shutil.rmtree(WORK, ignore_errors=True); os.makedirs(WORK, exist_ok=True); os.makedirs(OUTDIR, exist_ok=True)
open(LOG, 'w').close()

# (del, wait_ms etter goto, trim inn i klippet, klippets lengde i sek)
SCENES = [
    ('hook',      5200, 0.15, 4.7),
    ('flyt',      5400, 0.15, 4.9),
    ('oversikt',  5400, 0.15, 4.9),
    ('leietaker', 5200, 0.15, 4.7),
    ('inntekt',   5700, 0.15, 5.2),
    ('cta',       5000, 0.20, 4.5),
]

def normalize(webm, ss, t, out):
    return os.system(f'{FF} -y -ss {ss:.2f} -i "{webm}" -t {t:.2f} '
                     f'-vf "fps=30,scale={W}:{H}:flags=bicubic,setsar=1,format=yuv420p" '
                     f'-an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "{out}" 2>>{LOG}')

segs = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=SHELL, headless=True, args=ARGS)
    w = browser.new_context(viewport={'width': W, 'height': H}); wp = w.new_page()
    for dpart, *_ in SCENES:
        try:
            wp.goto(f'{BASE}/promo?del={dpart}&record=1', wait_until='networkidle', timeout=45000); wp.wait_for_timeout(400)
        except Exception as e:
            print('warm', dpart, repr(e)[:90])
    w.close(); print('WARMUP done', MODE, W, 'x', H, flush=True)

    def rec():
        ctx = browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1,
                                  record_video_dir=WORK, record_video_size={'width': W, 'height': H},
                                  reduced_motion='no-preference', color_scheme='light')
        return ctx, ctx.new_page(), time.time()

    for dpart, wait_ms, trim, dur in SCENES:
        ctx, page, t0 = rec()
        page.goto(f'{BASE}/promo?del={dpart}&record=1', wait_until='networkidle')
        mark = time.time(); page.wait_for_timeout(wait_ms)
        ss = max(0.0, mark - t0 + trim); ctx.close()
        segs.append((page.video.path(), ss, dur)); print(f'{dpart} ss=%.2f dur=%.1f' % (ss, dur), flush=True)

    browser.close()

norm = []
for i, (webm, ss, t) in enumerate(segs):
    out = f'{WORK}/seg{i}.mp4'; rc = normalize(webm, ss, t, out)
    ok = os.path.exists(out) and os.path.getsize(out) > 0
    print(f'seg{i} rc={rc} ok={ok} size={os.path.getsize(out) if ok else 0}', flush=True); norm.append((out, t))

f = 0.45
d = [t for (_, t) in norm]
n = len(norm)
if n == 1:
    total = d[0]
    fc = f'[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st={total-0.6:.2f}:d=0.6,format=yuv420p[v]'
else:
    chain = []; prev = '[0:v]'; cum = d[0]
    for i in range(1, n):
        off = cum - f
        out = '[vpre]' if i == n - 1 else f'[x{i}]'
        chain.append(f'{prev}[{i}:v]xfade=transition=fade:duration={f}:offset={off:.2f}{out}')
        prev = out; cum += d[i] - f
    total = cum
    fc = ';'.join(chain) + f';[vpre]fade=t=in:st=0:d=0.5,fade=t=out:st={total-0.6:.2f}:d=0.6,format=yuv420p[v]'

inputs = ' '.join(f'-i "{o}"' for (o, _) in norm)
rc = os.system(f'{FF} -y {inputs} -filter_complex "{fc}" -map "[v]" -r 30 '
               f'-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "{WORK}/noaudio.mp4" 2>>{LOG}')
# stille lydspor => trygg opplasting til alle sosiale plattformer
os.system(f'{FF} -y -i "{WORK}/noaudio.mp4" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 '
          f'-shortest -c:v copy -c:a aac -b:a 128k -movflags +faststart "{FINAL}" 2>>{LOG}')
print('FINAL', FINAL, 'rc', rc, 'exists', os.path.exists(FINAL),
      'size', os.path.getsize(FINAL) if os.path.exists(FINAL) else 0, 'dur~', round(total, 1), flush=True)

FR = '/app/.genframes'; shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR, exist_ok=True)
os.system(f'{FF} -y -i "{FINAL}" -vf "fps=1/2,scale=360:-1" "{FR}/frame_%02d.jpg" 2>>{LOG}')
print('frames', len(glob.glob(FR + '/*.jpg')), flush=True)
