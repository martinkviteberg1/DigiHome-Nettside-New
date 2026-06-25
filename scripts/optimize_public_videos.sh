#!/usr/bin/env bash
# Re-koder store videoer i /public til web-optimalisert størrelse (beholder oppløsning).
# Erstatter originalen kun hvis resultatet faktisk er mindre. Originaler ligger i git.
set -u
cd /app/public || exit 1

FILES=(
  "film/digihome-utleie-pa-autopilot-16x9.mp4"
  "film/digihome-utleie-pa-autopilot-60s-16x9.mp4"
  "langtid-hero-audio.mp4"
  "brandfilm-web.mp4"
  "film/digihome-keyhole-16x9.mp4"
  "langtid-hero.mp4"
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then echo "SKIP (mangler): $f"; continue; fi
  before=$(stat -c%s "$f")
  tmp="${f%.mp4}.opt.mp4"
  # Har filen lydspor?
  has_audio=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" 2>/dev/null | head -1)
  if [ -n "$has_audio" ]; then
    aopt=(-c:a aac -b:a 128k)
  else
    aopt=(-an)
  fi
  echo "Re-koder $f ..."
  ffmpeg -y -i "$f" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
    "${aopt[@]}" -movflags +faststart "$tmp" >/dev/null 2>&1
  if [ -f "$tmp" ]; then
    after=$(stat -c%s "$tmp")
    if [ "$after" -lt "$before" ]; then
      mv -f "$tmp" "$f"
      echo "  OK: $f  $(numfmt --to=iec $before) -> $(numfmt --to=iec $after)"
    else
      rm -f "$tmp"
      echo "  BEHOLDT original (ny var ikke mindre): $f"
    fi
  else
    echo "  FEIL: klarte ikke re-kode $f"
  fi
done

echo "=== Ferdig. Ny /public-størrelse: ==="
du -sh /app/public
echo "=== Videoer nå: ==="
find /app/public -name "*.mp4" -exec du -h {} + | sort -rh
