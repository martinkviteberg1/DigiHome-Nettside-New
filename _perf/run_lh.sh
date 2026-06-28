#!/usr/bin/env bash
# Kjører Lighthouse N ganger mot en lokal PROD-server (next start) for både
# mobil og desktop, lagrer rå JSON per kjøring. Median beregnes av summarize.js.
set -u
URL="${1:-http://localhost:3100/}"
RUNS="${RUNS:-5}"
OUTDIR="${OUTDIR:-/app/_perf/lh}"
LH="/app/node_modules/.bin/lighthouse"
FLAGS="--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
CATS="performance,accessibility,best-practices,seo"

mkdir -p "$OUTDIR"
slug=$(echo "$URL" | sed -E 's#https?://[^/]+##; s#[^a-zA-Z0-9]+#_#g; s#^_+|_+$##g')
slug="${slug:-root}"

for form in mobile desktop; do
  preset=""
  [ "$form" = "desktop" ] && preset="--preset=desktop"
  for i in $(seq 1 "$RUNS"); do
    out="$OUTDIR/${slug}-${form}-${i}.json"
    echo ">> $form run $i -> $out"
    "$LH" "$URL" $preset \
      --only-categories="$CATS" \
      --output=json --output-path="$out" \
      --quiet "$FLAGS" >/dev/null 2>&1
    if [ ! -s "$out" ]; then echo "   FAILED run $i ($form)"; fi
  done
done
echo "DONE"
