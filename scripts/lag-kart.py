"""Lager et hårlinjekart (SVG) av Bergen sentrum rundt Nygårdsgaten 5 fra OSM-data (Overpass).
Bruk: python3 scripts/lag-kart.py /tmp/bergen.json public/v4/annonse/bergen-kart.svg
Lag: vann (svak flate), parker (svak flate), kystlinje (linje), veier (hårlinjer etter klasse), bane (stiplet).
Alt i ink-alpha på gjennomsiktig bakgrunn — legges bak adressefeltet i annonsefilmen."""
import json, math, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bergen.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/app/public/v4/annonse/bergen-kart.svg'
LAT0, LON0 = 60.3888910, 5.3249180          # Nygårdsgaten 5
W, H = 1600, 1000                            # viewBox = meter (ca.)
M_PER_DEG_LAT = 111320.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(LAT0))

def proj(lat, lon):
    x = (lon - LON0) * M_PER_DEG_LON + W / 2
    y = (LAT0 - lat) * M_PER_DEG_LAT + H / 2
    return x, y

data = json.load(open(SRC))
nodes = {}
ways = {}
rels = []
for el in data['elements']:
    if el['type'] == 'node': nodes[el['id']] = (el['lat'], el['lon'])
    elif el['type'] == 'way': ways[el['id']] = el
    elif el['type'] == 'relation': rels.append(el)

def pts(way):
    out = []
    for nid in way.get('nodes', []):
        if nid in nodes:
            x, y = proj(*nodes[nid]); out.append((x, y))
    return out

def simplify(p, tol=1.2):
    if len(p) < 3: return p
    out = [p[0]]
    for q in p[1:-1]:
        if abs(q[0] - out[-1][0]) + abs(q[1] - out[-1][1]) >= tol: out.append(q)
    out.append(p[-1]); return out

def inside(p, pad=60):
    return any(-pad <= x <= W + pad and -pad <= y <= H + pad for x, y in p)

def d(p, close=False):
    s = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in p)
    return s + (' Z' if close else '')

def lengde(p):
    return sum(math.hypot(p[i+1][0]-p[i][0], p[i+1][1]-p[i][1]) for i in range(len(p)-1))

layers = {'vann': [], 'park': [], 'kyst': [], 'hoved': [], 'gate': [], 'sti': [], 'bane': []}
for w in ways.values():
    t = w.get('tags', {})
    p = simplify(pts(w))
    if len(p) < 2 or not inside(p): continue
    if t.get('natural') == 'water' or t.get('leisure') == 'park':
        (layers['vann'] if t.get('natural') == 'water' else layers['park']).append(d(p, True)); continue
    if t.get('natural') == 'coastline': layers['kyst'].append(d(p)); continue
    if t.get('railway') == 'rail': layers['bane'].append(d(p)); continue
    hw = t.get('highway', '')
    if hw in ('trunk', 'primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link'): layers['hoved'].append(d(p))
    elif hw in ('residential', 'unclassified', 'living_street', 'pedestrian'): layers['gate'].append(d(p))
    elif hw in ('service', 'footway') and lengde(p) >= 45: layers['sti'].append(d(p))
# vann-relasjoner (multipolygon): ytre ringer
for r in rels:
    if r.get('tags', {}).get('natural') != 'water': continue
    for m in r.get('members', []):
        if m['type'] == 'way' and m.get('role', 'outer') == 'outer' and m['ref'] in ways:
            p = simplify(pts(ways[m['ref']]))
            if len(p) >= 3 and inside(p): layers['vann'].append(d(p, True))

INK = '#15130F'
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">']
svg.append(f'<g fill="{INK}" fill-opacity="0.045"><path d="{" ".join(layers["vann"])}"/></g>')
svg.append(f'<g fill="{INK}" fill-opacity="0.028"><path d="{" ".join(layers["park"])}"/></g>')
svg.append(f'<g stroke="{INK}" stroke-opacity="0.22" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"><path d="{" ".join(layers["kyst"])}"/></g>')
svg.append(f'<g stroke="{INK}" stroke-opacity="0.10" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"><path d="{" ".join(layers["sti"])}"/></g>')
svg.append(f'<g stroke="{INK}" stroke-opacity="0.16" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="{" ".join(layers["gate"])}"/></g>')
svg.append(f'<g stroke="{INK}" stroke-opacity="0.24" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="{" ".join(layers["hoved"])}"/></g>')
svg.append(f'<g stroke="{INK}" stroke-opacity="0.16" stroke-width="1.2" stroke-dasharray="6 5"><path d="{" ".join(layers["bane"])}"/></g>')
svg.append('</svg>')
out = '\n'.join(svg)
open(OUT, 'w').write(out)
print({k: len(v) for k, v in layers.items()}, 'bytes', len(out))
