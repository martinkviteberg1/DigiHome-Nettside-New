"""
Lager Open Graph-bilder (1200×630) for nøkkelsidene — med sidens egne fonter, farger og bilder.
Én mal, samme grammatikk som forsiden: bilde til høyre, elfenbensflate til venstre, stor Right Grotesk-tittel
med lilla punktum, én undertittel i Diatype, wordmark oppe, sti nede. Ingen «slop»: hvert bilde er komponert
for siden det står på.

Kjør:  python3 scripts/lag-og.py            (alle)
       python3 scripts/lag-og.py bedrift    (én)
Skriver til public/og/<slug>.jpg (kvalitet 86). Kjør på nytt når tekster/bilder endres.
"""
import asyncio, base64, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROT = Path(__file__).resolve().parents[1]
PUB = ROT / 'public'
UT = PUB / 'og'
UT.mkdir(exist_ok=True)

INK, LILLA, PAPIR = '#15130F', '#D496FF', '#FBFAF8'

# slug → tittel (linjer), under, label, bilde (relativ til public), fokus (object-position), tone: 'lys' | 'kart' | 'mork'
SIDER = {
    'boligeiere':               { 'tittel': ['Utleie på', 'autopilot.'], 'under': 'Annonse, leietaker, kontrakt, husleie og drift — du godkjenner det som betyr noe.', 'label': 'For boligeiere', 'bilde': 'v4/video/eier-hjemme-1920.webp', 'fokus': '62% 40%', 'speil': True },
    'bedrift':                  { 'tittel': ['Hele porteføljen.', 'Ett system.'], 'under': 'Bygg, selskaper, roller og godkjenninger — med full historikk.', 'label': 'For eiendomsselskaper', 'bilde': 'v4/dag-bolig-4000.webp', 'fokus': '70% 45%' },
    'utleiemeglere':            { 'tittel': ['Hundre eiere.', 'Én rolig morgen.'], 'under': 'Salg, drift, klientkonto og oppgjør per eier — systemet DigiHome selv forvalter på.', 'label': 'For utleiemeglere og forvaltere', 'tone': 'kart' },
    'forvaltning':              { 'tittel': ['Vi tar jobben.', 'Du bestemmer.'], 'under': 'Full forvaltning i Bergen: én fast forvalter, et helt team bak. Ingen bindingstid.', 'label': 'Full forvaltning · Bergen', 'bilde': 'brand/sarah-sleeman-1600.webp', 'fokus': '50% 18%', 'skala': 62, 'venstre': 46, 'topp': -8, 'hoyde': 116 },
    'priser':                   { 'tittel': ['5 % av husleien.', 'Ingen bindingstid.'], 'under': 'Selvforvaltning fra 5 %. Full forvaltning etter omfang — tilbud innen 24 timer.', 'label': 'Priser', 'tone': 'lys' },
    'om-oss':                   { 'tittel': ['Startet i Bergen.', 'For å fjerne styret.'], 'under': 'Ett system for annonse, kontrakt, husleie og saker — og full forvaltning for dem som vil slippe alt.', 'label': 'Om DigiHome', 'bilde': 'brand/tilbud-cover-bergen.jpg', 'fokus': '50% 55%' },
    'kontakt':                  { 'tittel': ['Snakk med oss.', 'Vi svarer i dag.'], 'under': 'Ring, skriv eller book en samtale — uforpliktende, om boligen eller porteføljen din.', 'label': 'Kontakt', 'tone': 'lys' },
    'book-mote':                { 'tittel': ['Tjue minutter.', 'Om din bolig.'], 'under': 'Vi ringer deg og finner et tidspunkt som passer. Digitalt, hos deg eller hos oss.', 'label': 'Book en samtale', 'tone': 'lys' },
    'kom-i-gang':               { 'tittel': ['Hvem leier ut?'], 'under': 'Huseier eller eiendomsselskap — velg, så tar vi deg rett til riktig start.', 'label': 'Kom i gang', 'bilde': 'v4/stue-2000.webp', 'fokus': '28% 55%' },
    'bli-utleier':              { 'tittel': ['Lei ut boligen.', 'Vi tar resten.'], 'under': 'Annonsering, visninger, leietakersjekk, kontrakt og husleie. 0 kr oppstart, ingen bindingstid.', 'label': 'Utleiemegler i Bergen', 'bilde': 'v4/bolig-oslo-2000.webp', 'fokus': '0% 50%', 'speil': True },
    'bli-leietaker':            { 'tittel': ['Leie bolig', 'i Bergen.'], 'under': 'Kvalitetssikrede boliger, kontrakt med BankID og profesjonell oppfølging — gratis for deg.', 'label': 'For leietakere', 'bilde': 'v4/leietaker-4x5.webp', 'fokus': '50% 30%' },
    'ledige-boliger':           { 'tittel': ['Ledige boliger', 'i Bergen.'], 'under': 'Forvaltet av DigiHome: kvalitetssikret utleie, digital kontrakt og depositumskonto.', 'label': 'Ledige boliger', 'bilde': 'v4/annonse/fasade-kveld-1920.webp', 'fokus': '50% 30%', 'speil': True },
    'guider':                   { 'tittel': ['Alt du må vite', 'som utleier.'], 'under': 'Provisjon, depositum, skatt og fradrag, Airbnb og husleieloven — enkelt forklart.', 'label': 'Guider', 'tone': 'lys' },
    'nyheter':                  { 'tittel': ['Innsikt om', 'utleie i Bergen.'], 'under': 'Artikler og analyser om leiemarkedet og eiendomsforvaltning fra DigiHome.', 'label': 'Nyheter', 'tone': 'lys' },
    'priskalkulator':           { 'tittel': ['Hva koster', 'forvaltning?'], 'under': 'Velg bolig, utleiemodell og tillegg — veiledende pris på ett minutt. Gratis og uforpliktende.', 'label': 'Priskalkulator', 'tone': 'lys' },
    'leiemarkedet':             { 'tittel': ['Leiemarkedet', 'i tall.'], 'under': 'Snittleie, prisutvikling og etterspørsel — basert på SSB og DigiHomes egen indeks.', 'label': 'Leiemarkedet', 'tone': 'kart' },
    'utleiemegler-bergen':      { 'tittel': ['Utleiemegler', 'i Bergen.'], 'under': 'Selvforvaltning fra 5 % eller full forvaltning — annonsering, visninger, kontrakt og husleie.', 'label': 'Bergen', 'bilde': 'brand/tilbud-cover-bergen.jpg', 'fokus': '50% 55%' },
    'airbnb-forvaltning-bergen':{ 'tittel': ['Airbnb-forvaltning', 'i Bergen.'], 'under': 'Airbnb og Booking.com, dynamisk prising, gjester, renhold og rapportering — uten at du løfter en finger.', 'label': 'Korttidsutleie', 'bilde': 'v4/bolig-hero.webp', 'fokus': '50% 50%' },
    'selvforvaltning':          { 'tittel': ['Lei ut selv.', 'Med system.'], 'under': 'FINN-annonse, kontrakt med BankID, depositumskonto og husleieinnkreving — 5 % av husleien.', 'label': 'Selvforvaltning', 'bilde': 'v4/stue-2000.webp', 'fokus': '28% 55%' },
}

def b64(p):
    return base64.b64encode((PUB / p).read_bytes()).decode()

FONT_CSS = f"""
@font-face {{ font-family: 'RG'; src: url(data:font/woff2;base64,{b64('fonts/right-grotesk/PPRightGrotesk-Bold.woff2')}) format('woff2'); font-weight: 700; }}
@font-face {{ font-family: 'DT'; src: url(data:font/woff2;base64,{b64('fonts/diatype/ABCDiatype-Regular.woff2')}) format('woff2'); font-weight: 400; }}
@font-face {{ font-family: 'DT'; src: url(data:font/woff2;base64,{b64('fonts/diatype/ABCDiatype-Medium.woff2')}) format('woff2'); font-weight: 500; }}
"""
IKON = (PUB / 'brand/digihome-icon-purple.svg').read_text()
WORDMARK = f"<span style='display:inline-flex;align-items:center;gap:12px'><span style='display:inline-flex;height:34px'>{IKON}</span><span style='font-family:DT;font-weight:500;font-size:26px;letter-spacing:-0.01em;color:{INK}'>digihome</span></span>"

def html(slug, s):
    tone = s.get('tone', 'foto')
    tittel = s['tittel']
    # Siste linje får lilla punktum hvis den slutter på punktum
    linjer = []
    for i, l in enumerate(tittel):
        if i == len(tittel) - 1 and l.endswith('.'):
            linjer.append(f"{l[:-1]}<span style='color:{LILLA}'>.</span>")
        elif i == len(tittel) - 1 and l.endswith('?'):
            linjer.append(f"{l[:-1]}<span style='color:{LILLA}'>?</span>")
        else:
            linjer.append(l)
    tittel_html = '<br>'.join(linjer)
    if tone == 'foto':
        mime = 'image/jpeg' if s['bilde'].endswith('.jpg') else 'image/webp'
        speil = 'transform:scaleX(-1);' if s.get('speil') else ''
        geo = f"left:{s['venstre']}%;top:{s.get('topp',0)}%;width:{s['skala']}%;height:{s.get('hoyde',100)}%;" if s.get('skala') else 'inset:0;width:100%;height:100%;'
        bak = f"<img src='data:{mime};base64,{b64(s['bilde'])}' style='position:absolute;{geo}object-fit:cover;object-position:{s.get('fokus','50% 50%')};{speil}'>" \
              f"<div style='position:absolute;inset:0;background:linear-gradient(90deg, {PAPIR} 0%, {PAPIR} 40%, rgba(251,250,248,0.92) 52%, rgba(251,250,248,0.35) 72%, rgba(251,250,248,0) 100%)'></div>" \
              f"<div style='position:absolute;inset:0;background:linear-gradient(180deg, rgba(251,250,248,0) 55%, rgba(251,250,248,0.55) 100%)'></div>"
    elif tone == 'kart':
        bak = f"<img src='data:image/svg+xml;base64,{b64('v4/annonse/bergen-kart-m.svg')}' style='position:absolute;left:38%;top:-30%;width:1500px;height:auto;opacity:0.9'>" \
              f"<div style='position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 78% 50%, rgba(251,250,248,0) 0%, rgba(251,250,248,0.5) 55%, {PAPIR} 100%)'></div>" \
              f"<div style='position:absolute;inset:0;background:linear-gradient(90deg, {PAPIR} 0%, {PAPIR} 42%, rgba(251,250,248,0) 75%)'></div>" \
              + ''.join(f"<span style='position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{w}px;border-radius:50%;background:{LILLA};box-shadow:0 0 0 3px {PAPIR}'></span>" for x, y, w in [(880,210,14),(940,300,11),(1010,250,12),(970,380,14),(1080,330,11),(850,330,10),(1040,430,12),(920,470,11),(1100,190,10),(990,150,11),(1130,420,12),(870,120,10)])
    else:
        bak = f"<div style='position:absolute;inset:0;background:radial-gradient(ellipse 55% 70% at 80% 45%, rgba(212,150,255,0.35) 0%, rgba(212,150,255,0.10) 45%, rgba(212,150,255,0) 75%)'></div>" \
              f"<div style='position:absolute;right:-120px;top:-120px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle, rgba(21,19,15,0.06) 0%, rgba(21,19,15,0) 70%)'></div>"
    return f"""<!doctype html><html><head><meta charset='utf-8'><style>{FONT_CSS}
    html,body{{margin:0;width:1200px;height:630px;overflow:hidden;background:{PAPIR};color:{INK};-webkit-font-smoothing:antialiased}}
    .ramme{{position:relative;width:1200px;height:630px}}
    .mark{{position:absolute;left:72px;top:60px;height:34px;display:flex;align-items:center}} .mark svg{{height:34px;width:auto}}
    .tittel{{position:absolute;left:72px;top:{178 if len(tittel) > 1 else 226}px;font-family:'RG';font-weight:700;font-size:{82 if max(len(l) for l in tittel) <= 17 else 70}px;line-height:0.96;letter-spacing:-0.035em;max-width:720px}}
    .under{{position:absolute;left:72px;top:{392 if len(tittel) > 1 else 330}px;font-family:'DT';font-size:27px;line-height:1.38;color:rgba(21,19,15,0.66);max-width:600px}}
    .label{{position:absolute;left:72px;top:126px;font-family:'DT';font-weight:500;font-size:17px;letter-spacing:0.02em;color:rgba(21,19,15,0.55)}}
    .sti{{position:absolute;left:72px;bottom:56px;font-family:'DT';font-size:18px;color:rgba(21,19,15,0.5)}}
    .strek{{position:absolute;left:72px;right:72px;bottom:100px;height:1px;background:rgba(21,19,15,0.10)}}
    </style></head><body><div class='ramme'>{bak}
    <div class='mark'>{WORDMARK}</div>
    <div class='label'>{s['label']}</div>
    <div class='tittel'>{tittel_html}</div>
    <div class='under'>{s['under']}</div>
    <div class='strek'></div>
    <div class='sti'>digihome.no/{slug}</div>
    </div></body></html>"""

async def main(kun=None):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROME') or ('/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell' if os.path.exists('/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell') else None))
        pg = await b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        for slug, s in SIDER.items():
            if kun and slug not in kun: continue
            await pg.set_content(html(slug, s), wait_until='load')
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(120)
            ut = UT / f'{slug}.jpg'
            await pg.screenshot(path=str(ut), type='jpeg', quality=86)
            print(slug, os.path.getsize(ut) // 1024, 'kB')
        await b.close()

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1:] or None))
