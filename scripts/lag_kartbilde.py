"""Genererer statisk, forhåndsuskarpt Bergen-kart for onboarding-tomtilstanden.
Blur bakes inn i selve filen => null runtime-filter => null lag."""
import asyncio, os, re, sys
from playwright.async_api import async_playwright

KEY = None
with open('/app/.env') as f:
    for line in f:
        m = re.match(r'^GOOGLE_MAPS_API_KEY=(.+)$', line.strip())
        if m:
            KEY = m.group(1).strip()
assert KEY, 'Fant ikke GOOGLE_MAPS_API_KEY'

HTML = """<!DOCTYPE html><html><head><meta charset='utf-8'><style>html,body,#k{height:100%;margin:0}</style></head>
<body><div id='k'></div><script>
window.init=function(){
  var s=[
    {elementType:'geometry',stylers:[{color:'#f5f3f0'}]},
    {elementType:'labels.text.fill',stylers:[{color:'#6b6b6b'}]},
    {elementType:'labels.text.stroke',stylers:[{color:'#ffffff'},{weight:3}]},
    {featureType:'poi.business',stylers:[{visibility:'off'}]},
    {featureType:'poi.park',elementType:'geometry.fill',stylers:[{color:'#d6e8c8'}]},
    {featureType:'poi.park',elementType:'labels',stylers:[{visibility:'simplified'}]},
    {featureType:'transit',stylers:[{visibility:'off'}]},
    {featureType:'poi.attraction',stylers:[{visibility:'simplified'}]},
    {featureType:'poi.medical',stylers:[{visibility:'off'}]},
    {featureType:'poi.school',stylers:[{visibility:'off'}]},
    {featureType:'water',elementType:'geometry.fill',stylers:[{color:'#c4dff0'}]},
    {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#8aafcc'}]},
    {featureType:'road.highway',elementType:'geometry.fill',stylers:[{color:'#ffd080'}]},
    {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#f0c060'}]},
    {featureType:'road.arterial',elementType:'geometry.fill',stylers:[{color:'#ffffff'}]},
    {featureType:'road.arterial',elementType:'geometry.stroke',stylers:[{color:'#e0ddd8'}]},
    {featureType:'road.local',elementType:'geometry.fill',stylers:[{color:'#ffffff'}]},
    {featureType:'road.local',elementType:'geometry.stroke',stylers:[{color:'#eeebe6'}]},
    {featureType:'landscape.man_made',elementType:'geometry.fill',stylers:[{color:'#edeae5'}]},
    {featureType:'landscape.natural',elementType:'geometry.fill',stylers:[{color:'#e8eee2'}]},
    {featureType:'administrative',elementType:'labels.text.fill',stylers:[{color:'#999999'}]}
  ];
  var m=new google.maps.Map(document.getElementById('k'),{center:{lat:60.3913,lng:5.3221},zoom:15,styles:s,disableDefaultUI:true,clickableIcons:false});
  m.addListener('tilesloaded',function(){window.__klar=true;});
};
</script>
<script async src='https://maps.googleapis.com/maps/api/js?key=__KEY__&callback=init&v=weekly'></script>
</body></html>"""

async def main():
    with open('/tmp/kartgen.html', 'w') as f:
        f.write(HTML.replace('__KEY__', KEY))
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium' if os.path.exists('/usr/bin/chromium') else None)
        page = await browser.new_page(viewport={'width': 1400, 'height': 1600})
        await page.goto('file:///tmp/kartgen.html')
        try:
            await page.wait_for_function('window.__klar === true', timeout=25000)
        except Exception as e:
            print('ADVARSEL: tilesloaded timeout —', e)
        await page.wait_for_timeout(2500)
        await page.screenshot(path='/tmp/kart-raw.png')
        await browser.close()
    print('Screenshot OK')

asyncio.run(main())
