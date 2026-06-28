#!/usr/bin/env bash
# Rent standalone-redeploy.
# VIKTIG: standalone-serveren har prosess-tittel "next-server", saa vi maa
# drepe paa det monsteret (ikke "node server.js"), og frigjore port 3100,
# ellers serverer en gammel build mens static-mappen overskrives -> 400-feil.
set -e
cd /app
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "node server.js" 2>/dev/null || true
fuser -k 3100/tcp 2>/dev/null || true
sleep 2
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd /app/.next/standalone
nohup env PORT=3100 HOSTNAME=127.0.0.1 node server.js > /app/_perf/prodserver.log 2>&1 &
echo "prod server started pid $!"
sleep 5
curl -s -o /dev/null -w "home %{http_code} %{time_total}s\n" --max-time 20 http://localhost:3100/
