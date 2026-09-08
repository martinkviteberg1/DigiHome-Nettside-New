#!/usr/bin/env bash
# Lighthouse (mobil) mot et lokalt produksjonsbygg.
#   1) NEXT_DIST_DIR=.next-prod yarn build
#   2) NEXT_DIST_DIR=.next-prod PORT=3100 node_modules/.bin/next start -p 3100 &
#   3) scripts/lh.sh http://localhost:3100/ /tmp/lh-forside.json
# Skriver hovedtall (score, LCP, CLS, TBT, SI, TTI, bytes) til stdout.
URL="${1:-http://localhost:3100/}"
OUT="${2:-/tmp/lh.json}"
CHROME="${CHROME_PATH:-/pw-browsers/chromium-1223/chrome-linux/chrome}"
cd /app
CHROME_PATH="$CHROME" node_modules/.bin/lighthouse "$URL" \
  --quiet --output=json --output-path="$OUT" \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --only-categories=performance \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" >/dev/null 2>&1
node -e '
const r = require(process.argv[1]);
const a = r.audits; const f = (k) => a[k] && a[k].displayValue;
console.log("PERF", Math.round(r.categories.performance.score*100));
console.log("FCP", f("first-contentful-paint"), "| LCP", f("largest-contentful-paint"), "| CLS", f("cumulative-layout-shift"), "| TBT", f("total-blocking-time"), "| SI", f("speed-index"), "| TTI", f("interactive"));
const lcp = a["largest-contentful-paint-element"]; if (lcp && lcp.details && lcp.details.items && lcp.details.items[0] && lcp.details.items[0].items) console.log("LCP el:", JSON.stringify(lcp.details.items[0].items[0].node && lcp.details.items[0].items[0].node.snippet).slice(0,200));
const tot = a["total-byte-weight"]; console.log("Bytes:", tot && tot.displayValue);
const rs = a["resource-summary"]; if (rs && rs.details) rs.details.items.forEach(i=>console.log("  ", i.resourceType, i.requestCount, Math.round(i.transferSize/1024)+"kB"));
const nr = a["network-requests"]; if (nr && nr.details) { const items = nr.details.items.slice().sort((x,y)=>(y.transferSize||0)-(x.transferSize||0)).slice(0,14); console.log("Top requests:"); items.forEach(i=>console.log("  ", Math.round((i.transferSize||0)/1024)+"kB", i.resourceType, i.url.replace(/^https?:\/\/[^/]+/,"").slice(0,90), "start", Math.round(i.networkRequestTime), "end", Math.round(i.networkEndTime))); }
const ls = a["layout-shifts"] || a["layout-shift-elements"]; if (ls && ls.details && ls.details.items) ls.details.items.slice(0,6).forEach(i=>console.log("  shift", (i.score||0).toFixed(3), i.node && i.node.snippet && i.node.snippet.slice(0,120)));
const lt = a["long-tasks"]; if (lt && lt.details) lt.details.items.slice(0,5).forEach(i=>console.log("  longtask", Math.round(i.duration)+"ms", (i.url||"").replace(/^https?:\/\/[^/]+/,"").slice(0,80)));
const mw = a["mainthread-work-breakdown"]; if (mw && mw.details) mw.details.items.slice(0,5).forEach(i=>console.log("  main", i.groupLabel, Math.round(i.duration)+"ms"));
const bs = a["bootup-time"]; if (bs && bs.details) bs.details.items.slice(0,6).forEach(i=>console.log("  js", Math.round(i.total)+"ms", i.url.replace(/^https?:\/\/[^/]+/,"").slice(0,80)));
' "$OUT"
