"""Lager en sømløs loop av «eieren hjemme i sofaen» til heroens sluttbilde.

Kilde: 4K HEVC (15 s). Loopen blir sømløs ved å krysstone det siste sekundet inn i det første
(xfade): body = 1–15 s, head = 0–1 s → 14 s film som slutter på nøyaktig samme bilde som den starter.

Ut (public/v4/video/):
  eier-hjemme-loop-1920.mp4   H.264, 1920×1088
  eier-hjemme-loop-1280.mp4   H.264, 1280×726 (smal skjerm)
  eier-hjemme-loop-1280.webm  VP9 (nettlesere uten H.264)
  eier-hjemme-loop-poster.webp  første bilde

Bruk: python3 scripts/lag-hjemme-loop.py /tmp/hero-loop.mp4
"""
import os
import subprocess
import sys

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
UT = os.path.join(os.path.dirname(__file__), '..', 'public', 'v4', 'video')
FADE = 1.0
START = 2.0     # de to første sekundene kuttes
SLUTT = 15.0


def kjor(args):
    r = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', *args], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        raise SystemExit(r.returncode)


def main(kilde):
    os.makedirs(UT, exist_ok=True)
    # 1) Sømløs loop i mellomformat (lossless-ish), skalert til 1920
    loop = '/tmp/hjemme-loop-1920.mp4'
    offset = (SLUTT - START - FADE) - FADE  # body varer SLUTT-START-FADE; xfade begynner FADE før slutten av body
    fc = (
        f"[0:v]trim={START}:{START + FADE},setpts=PTS-STARTPTS,fps=24,scale=1920:-2,settb=AVTB[head];"
        f"[0:v]trim={START + FADE}:{SLUTT},setpts=PTS-STARTPTS,fps=24,scale=1920:-2,settb=AVTB[body];"
        f"[body][head]xfade=transition=fade:duration={FADE}:offset={offset},format=yuv420p[v]"
    )
    kjor(['-i', kilde, '-filter_complex', fc, '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', loop])
    print('mellomformat ok')
    # 2) Leveranser
    kjor(['-i', loop, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(UT, 'eier-hjemme-loop-1920.mp4')])
    print('1920 ok')
    kjor(['-i', loop, '-vf', 'scale=1280:-2', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(UT, 'eier-hjemme-loop-1280.mp4')])
    print('1280 ok')
    kjor(['-i', loop, '-vf', 'scale=1280:-2', '-an', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', os.path.join(UT, 'eier-hjemme-loop-1280.webm')])
    print('webm ok')
    kjor(['-i', loop, '-frames:v', '1', '-vf', 'scale=1920:-2', '-c:v', 'libwebp', '-quality', '82', os.path.join(UT, 'eier-hjemme-loop-poster.webp')])
    print('poster ok')
    for f in sorted(os.listdir(UT)):
        if f.startswith('eier-hjemme-loop'):
            print(f, round(os.path.getsize(os.path.join(UT, f)) / 1024 / 1024, 2), 'MB')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/hero-loop.mp4')
