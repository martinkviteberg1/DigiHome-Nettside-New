#!/usr/bin/env bash
# Runde 2: presser de gjenværende store videoene videre ned (real-footage + lang film).
# Originaler ligger i git. Erstatter kun hvis mindre.
set -u
cd /app/public || exit 1

# format: "fil|skala|crf|maxrate"
JOBS=(
  "langtid-hero-audio.mp4|-2:1080|27|2M"
  "brandfilm-web.mp4|-2:1080|27|2M"
  "langtid-hero.mp4|-2:1080|27|2M"
  "film/digihome-utleie-pa-autopilot-16x9.mp4|-2:720|28|1500k"
  "film/digihome-utleie-pa-autopilot-60s-16x9.mp4|-2:720|28|1500k"
)

for job in "${JOBS[@]}"; do
  IFS='|' read -r f scale crf maxrate <<< "$job"
  [ -f "$f" ] || { echo "SKIP (mangler): $f"; continue; }
  before=$(stat -c%s "$f")
  tmp="${f%.mp4}.opt2.mp4"
  has_audio=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" 2>/dev/null | head -1)
  if [ -n "$has_audio" ]; then aopt=(-c:a aac -b:a 96k); else aopt=(-an); fi
  echo "Re-koder $f (scale=$scale crf=$crf maxrate=$maxrate) ..."
  ffmpeg -y -i "$f" -vf "scale=${scale}:flags=lanczos" -c:v libx264 -preset medium -crf "$crf" \
    -maxrate "$maxrate" -bufsize "$(echo $maxrate | sed 's/[A-Za-z]//g')"000k -pix_fmt yuv420p \
    "${aopt[@]}" -movflags +faststart "$tmp" >/dev/null 2>&1
  if [ -f "$tmp" ] && [ "$(stat -c%s "$tmp")" -lt "$before" ]; then
    after=$(stat -c%s "$tmp"); mv -f "$tmp" "$f"
    echo "  OK: $f  $(numfmt --to=iec $before) -> $(numfmt --to=iec $after)"
  else
    rm -f "$tmp"; echo "  BEHOLDT original: $f"
  fi
done

echo "=== Ny /public-størrelse: ==="; du -sh /app/public
echo "=== Videoer nå: ==="; find /app/public -name "*.mp4" -exec du -h {} + | sort -rh
