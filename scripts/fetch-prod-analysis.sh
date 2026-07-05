#!/usr/bin/env bash
# Henter ALLE datasett for verdensklasse-analysen fra PROD — utelukkende lese-GETs.
set -e
source <(grep '^ADMIN_KEY=' /app/.env)
B="https://digihome.no/api"
K="key=${ADMIN_KEY}"
mkdir -p /tmp/analyse

fetch() { echo "→ $1"; curl -s -m 45 "$2" -o "/tmp/analyse/$1.json" && python3 -c "import json;d=json.load(open('/tmp/analyse/$1.json'));print('   ok –', list(d.keys())[:8] if isinstance(d,dict) else type(d))" || echo "   FEIL $1"; }

fetch leads                "$B/admin/leads?$K"
fetch ads_overview_30      "$B/admin/ads/overview?$K&googlePeriod=last_30d&metaPeriod=last_30d"
fetch ads_overview_90      "$B/admin/ads/overview?$K&googlePeriod=last_90d&metaPeriod=last_90d"
fetch adstudio_ads_30      "$B/admin/adstudio/ads?$K&days=30"
fetch adstudio_ads_90      "$B/admin/adstudio/ads?$K&days=90"
fetch pacing               "$B/admin/ads/pacing?$K"
fetch alerts               "$B/admin/ads/alerts?$K"
fetch ads_table            "$B/admin/ads/table?$K&googlePeriod=last_30d&metaPeriod=last_30d"
fetch recommendations      "$B/admin/ads/recommendations?$K"
echo "FERDIG"; ls -la /tmp/analyse/
