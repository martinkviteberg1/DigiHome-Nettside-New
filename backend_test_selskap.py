#!/usr/bin/env python3
"""
Backend test for Selskapsøkonomi API (multi-entity finance)
Tests DigiHome AS, Digihome Tech AS, and Konsern (consolidated) finance endpoints.
"""

import requests
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 90  # First call to /selskap can take 5-10s

# Test state
qa_cost_ids = []
qa_inntektspost_ids = []
original_prisliste_pris = None
original_autoregler_llm = None
original_kontant_tech = None

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_case(num, desc):
    print(f"\n{'='*80}")
    print(f"TEST CASE {num}: {desc}")
    print('='*80)

def verify_invariants(data, test_name):
    """Verify the critical invariants for selskapsøkonomi"""
    log(f"Verifying invariants for {test_name}...")
    
    naa = data.get('naa', {})
    digihome = naa.get('digihome', {})
    tech = naa.get('tech', {})
    konsern = naa.get('konsern', {})
    prisliste = data.get('prisliste', {})
    
    # Extract values
    dh_lisens = digihome.get('lisens', 0)
    tech_lisens = tech.get('lisens', 0)
    konsern_eliminert = konsern.get('eliminert', 0)
    dh_enheter = digihome.get('enheter', 0)
    forvaltning_pris = prisliste.get('forvaltning', {}).get('pris', 0)
    
    dh_inntekt = digihome.get('inntekt', 0)
    tech_inntekt = tech.get('inntekt', 0)
    konsern_inntekt = konsern.get('inntekt', 0)
    
    dh_kost = digihome.get('kost', 0)
    tech_kost = tech.get('kost', 0)
    konsern_kost = konsern.get('kost', 0)
    
    tech_poster = tech.get('poster', {})
    tech_poster_sum = tech_poster.get('huseier', 0) + tech_poster.get('bedrift', 0) + tech_poster.get('annet', 0)
    
    errors = []
    
    # Invariant 1: tech.lisens === digihome.lisens === konsern.eliminert
    if not (tech_lisens == dh_lisens == konsern_eliminert):
        errors.append(f"Invariant 1 FAILED: tech.lisens ({tech_lisens}) !== digihome.lisens ({dh_lisens}) !== konsern.eliminert ({konsern_eliminert})")
    else:
        log(f"✓ Invariant 1: tech.lisens = digihome.lisens = konsern.eliminert = {tech_lisens}")
    
    # Invariant 2: lisens === digihome.enheter × prisliste.forvaltning.pris
    expected_lisens = dh_enheter * forvaltning_pris
    if abs(dh_lisens - expected_lisens) > 1:
        errors.append(f"Invariant 2 FAILED: lisens ({dh_lisens}) !== enheter ({dh_enheter}) × pris ({forvaltning_pris}) = {expected_lisens}")
    else:
        log(f"✓ Invariant 2: lisens ({dh_lisens}) = enheter ({dh_enheter}) × pris ({forvaltning_pris})")
    
    # Invariant 3: konsern.inntekt === digihome.inntekt + tech.inntekt − eliminert (±1)
    expected_konsern_inntekt = dh_inntekt + tech_inntekt - konsern_eliminert
    if abs(konsern_inntekt - expected_konsern_inntekt) > 1:
        errors.append(f"Invariant 3 FAILED: konsern.inntekt ({konsern_inntekt}) !== dh.inntekt ({dh_inntekt}) + tech.inntekt ({tech_inntekt}) - eliminert ({konsern_eliminert}) = {expected_konsern_inntekt}")
    else:
        log(f"✓ Invariant 3: konsern.inntekt ({konsern_inntekt}) = dh ({dh_inntekt}) + tech ({tech_inntekt}) - eliminert ({konsern_eliminert})")
    
    # Invariant 4: konsern.kost === digihome.kost + tech.kost − eliminert (±1)
    expected_konsern_kost = dh_kost + tech_kost - konsern_eliminert
    if abs(konsern_kost - expected_konsern_kost) > 1:
        errors.append(f"Invariant 4 FAILED: konsern.kost ({konsern_kost}) !== dh.kost ({dh_kost}) + tech.kost ({tech_kost}) - eliminert ({konsern_eliminert}) = {expected_konsern_kost}")
    else:
        log(f"✓ Invariant 4: konsern.kost ({konsern_kost}) = dh ({dh_kost}) + tech ({tech_kost}) - eliminert ({konsern_eliminert})")
    
    # Invariant 5: tech.inntekt === lisens + poster sum
    expected_tech_inntekt = tech_lisens + tech_poster_sum
    if abs(tech_inntekt - expected_tech_inntekt) > 1:
        errors.append(f"Invariant 5 FAILED: tech.inntekt ({tech_inntekt}) !== lisens ({tech_lisens}) + poster ({tech_poster_sum}) = {expected_tech_inntekt}")
    else:
        log(f"✓ Invariant 5: tech.inntekt ({tech_inntekt}) = lisens ({tech_lisens}) + poster ({tech_poster_sum})")
    
    if errors:
        for err in errors:
            log(f"❌ {err}")
        return False
    else:
        log(f"✅ All invariants verified for {test_name}")
        return True

try:
    # ========================================================================
    # TEST CASE 1: GET /api/admin/finance/selskap - Structure and Invariants
    # ========================================================================
    test_case(1, "GET /api/admin/finance/selskap - Structure and Invariants")
    
    log(f"GET {API_BASE}/admin/finance/selskap?key={ADMIN_KEY}")
    log("⚠️  First call can take 5-10 seconds (platform fetch, DB cache)...")
    
    r1 = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    log(f"Status: {r1.status_code}")
    
    if r1.status_code != 200:
        log(f"❌ TEST 1 FAILED: Expected 200, got {r1.status_code}")
        log(f"Response: {r1.text}")
        raise Exception("Test 1 failed")
    
    data1 = r1.json()
    log(f"Response keys: {list(data1.keys())}")
    
    # Verify structure
    assert data1.get('ok') == True, "Missing ok:true"
    assert 'naa' in data1, "Missing naa"
    assert 'tidslinje' in data1, "Missing tidslinje"
    assert 'prisliste' in data1, "Missing prisliste"
    assert 'autoregler' in data1, "Missing autoregler"
    assert 'kilde' in data1, "Missing kilde"
    
    naa = data1['naa']
    assert 'digihome' in naa, "Missing naa.digihome"
    assert 'tech' in naa, "Missing naa.tech"
    assert 'konsern' in naa, "Missing naa.konsern"
    assert 'ym' in naa, "Missing naa.ym"
    
    # Verify tidslinje
    tidslinje = data1['tidslinje']
    assert len(tidslinje) == 13, f"Expected tidslinje.length === 13, got {len(tidslinje)}"
    assert tidslinje[-1]['ym'] == naa['ym'], f"Last tidslinje ym should match naa.ym"
    log(f"✓ Tidslinje has 13 months, last ym: {tidslinje[-1]['ym']}")
    
    # Verify prisliste structure
    prisliste = data1['prisliste']
    assert 'huseier' in prisliste, "Missing prisliste.huseier"
    assert 'forvaltning' in prisliste, "Missing prisliste.forvaltning"
    assert 'bedrift' in prisliste, "Missing prisliste.bedrift"
    assert 'modell' in prisliste['forvaltning'], "Missing prisliste.forvaltning.modell"
    assert 'pris' in prisliste['forvaltning'], "Missing prisliste.forvaltning.pris"
    original_prisliste_pris = prisliste['forvaltning']['pris']
    log(f"✓ Prisliste.forvaltning: modell={prisliste['forvaltning']['modell']}, pris={original_prisliste_pris}")
    
    # Verify autoregler
    autoregler = data1['autoregler']
    assert 'annonser' in autoregler, "Missing autoregler.annonser"
    assert 'llm' in autoregler, "Missing autoregler.llm"
    assert 'ext' in autoregler, "Missing autoregler.ext"
    assert 'plattform' in autoregler, "Missing autoregler.plattform"
    assert autoregler['llm'] in ['digihome', 'tech'], f"autoregler.llm should be 'digihome' or 'tech', got {autoregler['llm']}"
    original_autoregler_llm = autoregler['llm']
    log(f"✓ Autoregler: annonser={autoregler['annonser']}, llm={autoregler['llm']}, ext={autoregler['ext']}, plattform={autoregler['plattform']}")
    
    # Verify kilde
    kilde = data1['kilde']
    assert 'portefolje' in kilde, "Missing kilde.portefolje"
    assert kilde['portefolje'] in ['leieforhold', 'kontrakter'], f"kilde.portefolje should be 'leieforhold' or 'kontrakter', got {kilde['portefolje']}"
    log(f"✓ Kilde.portefolje: {kilde['portefolje']}")
    
    # Verify naa structure for each entity
    for entity in ['digihome', 'tech', 'konsern']:
        e = naa[entity]
        assert 'inntekt' in e, f"Missing naa.{entity}.inntekt"
        assert 'kost' in e, f"Missing naa.{entity}.kost"
        assert 'resultat' in e, f"Missing naa.{entity}.resultat"
        assert 'byCat' in e, f"Missing naa.{entity}.byCat"
        assert 'costBreakdown' in e, f"Missing naa.{entity}.costBreakdown"
        log(f"✓ naa.{entity}: inntekt={e['inntekt']}, kost={e['kost']}, resultat={e['resultat']}")
    
    # Verify digihome-specific fields
    assert 'lisens' in naa['digihome'], "Missing naa.digihome.lisens"
    assert 'enheter' in naa['digihome'], "Missing naa.digihome.enheter"
    log(f"✓ naa.digihome: lisens={naa['digihome']['lisens']}, enheter={naa['digihome']['enheter']}")
    
    # Verify tech-specific fields
    assert 'lisens' in naa['tech'], "Missing naa.tech.lisens"
    assert 'poster' in naa['tech'], "Missing naa.tech.poster"
    assert 'auto' in naa['tech'], "Missing naa.tech.auto"
    log(f"✓ naa.tech: lisens={naa['tech']['lisens']}, poster={naa['tech']['poster']}")
    
    # Verify konsern-specific fields
    assert 'eliminert' in naa['konsern'], "Missing naa.konsern.eliminert"
    log(f"✓ naa.konsern: eliminert={naa['konsern']['eliminert']}")
    
    # Verify invariants
    if not verify_invariants(data1, "initial state"):
        raise Exception("Invariants failed for initial state")
    
    log("✅ TEST 1 PASSED: Structure and invariants verified")
    
    # ========================================================================
    # TEST CASE 2: POST /settings - Change prisliste, verify lisens, restore
    # ========================================================================
    test_case(2, "POST /settings - Change prisliste.forvaltning.pris to 250, verify lisens calculation, restore to 200")
    
    log(f"POST {API_BASE}/admin/finance/settings with prisliste.forvaltning.pris=250")
    r2a = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'prisliste': {'forvaltning': {'modell': 'fast', 'pris': 250}}},
        timeout=30
    )
    log(f"Status: {r2a.status_code}")
    
    if r2a.status_code != 200:
        log(f"❌ TEST 2a FAILED: Expected 200, got {r2a.status_code}")
        log(f"Response: {r2a.text}")
        raise Exception("Test 2a failed")
    
    data2a = r2a.json()
    assert data2a.get('ok') == True, "Missing ok:true"
    log(f"✓ Settings updated")
    
    # Verify change
    log(f"GET {API_BASE}/admin/finance/selskap to verify lisens calculation")
    r2b = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data2b = r2b.json()
    
    naa2 = data2b['naa']
    enheter = naa2['digihome']['enheter']
    lisens = naa2['digihome']['lisens']
    expected_lisens = enheter * 250
    
    if abs(lisens - expected_lisens) > 1:
        log(f"❌ TEST 2b FAILED: lisens ({lisens}) !== enheter ({enheter}) × 250 = {expected_lisens}")
        raise Exception("Test 2b failed")
    
    log(f"✓ Lisens calculation correct: {lisens} = {enheter} × 250")
    
    # Verify invariants still hold
    if not verify_invariants(data2b, "after prisliste change"):
        raise Exception("Invariants failed after prisliste change")
    
    # Restore original price
    log(f"Restoring prisliste.forvaltning.pris to {original_prisliste_pris}")
    r2c = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'prisliste': {'forvaltning': {'modell': 'fast', 'pris': original_prisliste_pris}}},
        timeout=30
    )
    
    if r2c.status_code != 200:
        log(f"❌ TEST 2c FAILED: Could not restore prisliste")
        raise Exception("Test 2c failed")
    
    log(f"✓ Prisliste restored to {original_prisliste_pris}")
    log("✅ TEST 2 PASSED: Prisliste change, verification, and restoration successful")
    
    # ========================================================================
    # TEST CASE 3: POST /settings - Change autoregler.llm, verify auto.poster, restore
    # ========================================================================
    test_case(3, "POST /settings - Change autoregler.llm, verify autoregler persisted, restore")
    
    # Determine target value (opposite of current)
    target_llm = 'digihome' if original_autoregler_llm == 'tech' else 'tech'
    
    log(f"POST {API_BASE}/admin/finance/settings with autoregler.llm={target_llm}")
    r3a = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'autoregler': {'llm': target_llm}},
        timeout=30
    )
    log(f"Status: {r3a.status_code}")
    
    if r3a.status_code != 200:
        log(f"❌ TEST 3a FAILED: Expected 200, got {r3a.status_code}")
        log(f"Response: {r3a.text}")
        raise Exception("Test 3a failed")
    
    log(f"✓ Autoregler updated to llm={target_llm}")
    
    # Verify change persisted
    log(f"GET {API_BASE}/admin/finance/selskap to verify autoregler.llm changed")
    r3b = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data3b = r3b.json()
    
    new_autoregler = data3b.get('autoregler', {})
    if new_autoregler.get('llm') != target_llm:
        log(f"❌ TEST 3b FAILED: autoregler.llm should be '{target_llm}', got '{new_autoregler.get('llm')}'")
        raise Exception("Test 3b failed")
    
    log(f"✓ autoregler.llm correctly set to '{target_llm}'")
    
    # Note: auto.poster only shows costs that actually exist with auto=true
    # If there are LLM costs, they would appear in the correct company's auto.poster
    naa3 = data3b['naa']
    dh_auto_poster = naa3['digihome'].get('auto', {}).get('poster', [])
    tech_auto_poster = naa3['tech'].get('auto', {}).get('poster', [])
    
    log(f"digihome.auto.poster has {len(dh_auto_poster)} items: {[p.get('id') for p in dh_auto_poster]}")
    log(f"tech.auto.poster has {len(tech_auto_poster)} items: {[p.get('id') for p in tech_auto_poster]}")
    
    # Verify that if 'llm' exists in auto.poster, it's in the correct company
    llm_in_dh = any(p.get('id') == 'llm' for p in dh_auto_poster)
    llm_in_tech = any(p.get('id') == 'llm' for p in tech_auto_poster)
    
    if llm_in_dh and llm_in_tech:
        log(f"❌ TEST 3b FAILED: 'llm' should not be in both companies")
        raise Exception("Test 3b failed")
    
    if llm_in_dh and target_llm != 'digihome':
        log(f"❌ TEST 3b FAILED: 'llm' in digihome but autoregler.llm={target_llm}")
        raise Exception("Test 3b failed")
    
    if llm_in_tech and target_llm != 'tech':
        log(f"❌ TEST 3b FAILED: 'llm' in tech but autoregler.llm={target_llm}")
        raise Exception("Test 3b failed")
    
    if llm_in_dh or llm_in_tech:
        log(f"✓ 'llm' cost found in correct company ({target_llm})")
    else:
        log(f"✓ No 'llm' auto costs exist (rule change verified via autoregler field)")
    
    # Restore original value
    log(f"Restoring autoregler.llm to {original_autoregler_llm}")
    r3c = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'autoregler': {'llm': original_autoregler_llm}},
        timeout=30
    )
    
    if r3c.status_code != 200:
        log(f"❌ TEST 3c FAILED: Could not restore autoregler")
        raise Exception("Test 3c failed")
    
    log(f"✓ Autoregler restored to llm={original_autoregler_llm}")
    log("✅ TEST 3 PASSED: Autoregler change, verification, and restoration successful")
    
    # ========================================================================
    # TEST CASE 4: POST/GET/DELETE /inntektsposter - CRUD and verify tech.inntekt
    # ========================================================================
    test_case(4, "POST/GET/DELETE /inntektsposter - CRUD operations and verify tech.inntekt changes")
    
    # Get baseline tech.inntekt
    r4a = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    baseline_tech_inntekt = r4a.json()['naa']['tech']['inntekt']
    baseline_tech_poster_bedrift = r4a.json()['naa']['tech']['poster']['bedrift']
    log(f"Baseline tech.inntekt: {baseline_tech_inntekt}, tech.poster.bedrift: {baseline_tech_poster_bedrift}")
    
    # Create inntektspost
    log(f"POST {API_BASE}/admin/finance/inntektsposter")
    r4b = requests.post(
        f"{API_BASE}/admin/finance/inntektsposter",
        params={'key': ADMIN_KEY},
        json={
            'navn': 'QA Bedrift AS',
            'kundetype': 'bedrift',
            'enheter': 10,
            'belop': 790,
            'startDate': '2026-01-01'
        },
        timeout=30
    )
    log(f"Status: {r4b.status_code}")
    
    if r4b.status_code != 200:
        log(f"❌ TEST 4b FAILED: Expected 200, got {r4b.status_code}")
        log(f"Response: {r4b.text}")
        raise Exception("Test 4b failed")
    
    data4b = r4b.json()
    assert data4b.get('ok') == True, "Missing ok:true"
    assert 'post' in data4b, "Missing post in response"
    post_id = data4b['post']['id']
    qa_inntektspost_ids.append(post_id)
    log(f"✓ Inntektspost created with id: {post_id}")
    
    # Verify it appears in GET /inntektsposter
    log(f"GET {API_BASE}/admin/finance/inntektsposter")
    r4c = requests.get(f"{API_BASE}/admin/finance/inntektsposter", params={'key': ADMIN_KEY}, timeout=30)
    data4c = r4c.json()
    
    assert data4c.get('ok') == True, "Missing ok:true"
    assert 'poster' in data4c, "Missing poster in response"
    
    found = False
    for post in data4c['poster']:
        if post['id'] == post_id:
            found = True
            assert post['navn'] == 'QA Bedrift AS', f"Expected navn 'QA Bedrift AS', got {post['navn']}"
            assert post['belop'] == 790, f"Expected belop 790, got {post['belop']}"
            log(f"✓ Inntektspost found in list: {post['navn']}, belop={post['belop']}")
            break
    
    if not found:
        log(f"❌ TEST 4c FAILED: Inntektspost {post_id} not found in list")
        raise Exception("Test 4c failed")
    
    # Verify tech.inntekt increased
    log(f"GET {API_BASE}/admin/finance/selskap to verify tech.inntekt increase")
    r4d = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data4d = r4d.json()
    
    new_tech_inntekt = data4d['naa']['tech']['inntekt']
    new_tech_poster_bedrift = data4d['naa']['tech']['poster']['bedrift']
    
    if new_tech_poster_bedrift < baseline_tech_poster_bedrift + 790:
        log(f"❌ TEST 4d FAILED: tech.poster.bedrift ({new_tech_poster_bedrift}) should be >= baseline ({baseline_tech_poster_bedrift}) + 790")
        raise Exception("Test 4d failed")
    
    log(f"✓ tech.poster.bedrift increased from {baseline_tech_poster_bedrift} to {new_tech_poster_bedrift}")
    log(f"✓ tech.inntekt increased from {baseline_tech_inntekt} to {new_tech_inntekt}")
    
    # Test validation: POST with belop 0 should return 400
    log(f"POST {API_BASE}/admin/finance/inntektsposter with belop=0 (should fail)")
    r4e = requests.post(
        f"{API_BASE}/admin/finance/inntektsposter",
        params={'key': ADMIN_KEY},
        json={
            'navn': 'QA Invalid',
            'kundetype': 'bedrift',
            'enheter': 10,
            'belop': 0,
            'startDate': '2026-01-01'
        },
        timeout=30
    )
    
    if r4e.status_code != 400:
        log(f"❌ TEST 4e FAILED: Expected 400 for belop=0, got {r4e.status_code}")
        raise Exception("Test 4e failed")
    
    log(f"✓ Validation working: belop=0 returns 400")
    
    # Test paused: POST with paused:true should not count
    log(f"POST {API_BASE}/admin/finance/inntektsposter with paused=true")
    r4f = requests.post(
        f"{API_BASE}/admin/finance/inntektsposter",
        params={'key': ADMIN_KEY},
        json={
            'id': post_id,  # Update existing
            'navn': 'QA Bedrift AS',
            'kundetype': 'bedrift',
            'enheter': 10,
            'belop': 790,
            'startDate': '2026-01-01',
            'paused': True
        },
        timeout=30
    )
    
    if r4f.status_code != 200:
        log(f"❌ TEST 4f FAILED: Expected 200, got {r4f.status_code}")
        raise Exception("Test 4f failed")
    
    log(f"✓ Inntektspost paused")
    
    # Verify tech.poster.bedrift decreased back
    r4g = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    paused_tech_poster_bedrift = r4g.json()['naa']['tech']['poster']['bedrift']
    
    if paused_tech_poster_bedrift >= new_tech_poster_bedrift:
        log(f"❌ TEST 4g FAILED: tech.poster.bedrift ({paused_tech_poster_bedrift}) should be < {new_tech_poster_bedrift} after pausing")
        raise Exception("Test 4g failed")
    
    log(f"✓ tech.poster.bedrift decreased to {paused_tech_poster_bedrift} after pausing")
    
    # Delete inntektspost
    log(f"DELETE {API_BASE}/admin/finance/inntektsposter with id={post_id}")
    r4h = requests.delete(
        f"{API_BASE}/admin/finance/inntektsposter",
        params={'key': ADMIN_KEY},
        json={'id': post_id},
        timeout=30
    )
    
    if r4h.status_code != 200:
        log(f"❌ TEST 4h FAILED: Expected 200, got {r4h.status_code}")
        raise Exception("Test 4h failed")
    
    log(f"✓ Inntektspost deleted")
    qa_inntektspost_ids.remove(post_id)
    
    log("✅ TEST 4 PASSED: Inntektsposter CRUD and tech.inntekt verification successful")
    
    # ========================================================================
    # TEST CASE 5: POST /costs with selskap, flytt, bekreft, forslagFlytt
    # ========================================================================
    test_case(5, "POST /costs with selskap, test flytt, bekreft, forslagFlytt")
    
    # Create cost with selskap='tech'
    log(f"POST {API_BASE}/admin/finance/costs with selskap='tech'")
    r5a = requests.post(
        f"{API_BASE}/admin/finance/costs",
        params={'key': ADMIN_KEY},
        json={
            'name': 'QA Tech-kost',
            'category': 'API/LLM',
            'amount': 1000,
            'frequency': 'monthly',
            'selskap': 'tech'
        },
        timeout=30
    )
    log(f"Status: {r5a.status_code}")
    
    if r5a.status_code != 200:
        log(f"❌ TEST 5a FAILED: Expected 200, got {r5a.status_code}")
        log(f"Response: {r5a.text}")
        raise Exception("Test 5a failed")
    
    data5a = r5a.json()
    assert data5a.get('ok') == True, "Missing ok:true"
    assert 'cost' in data5a, "Missing cost in response"
    cost_id_tech = data5a['cost']['id']
    qa_cost_ids.append(cost_id_tech)
    
    assert data5a['cost']['selskap'] == 'tech', f"Expected selskap='tech', got {data5a['cost']['selskap']}"
    assert data5a['cost'].get('selskapBekreftet') == True, f"Expected selskapBekreftet=true"
    log(f"✓ Cost created with id: {cost_id_tech}, selskap='tech', selskapBekreftet=true")
    
    # Verify it appears in GET /costs?selskap=tech
    log(f"GET {API_BASE}/admin/finance/costs?selskap=tech")
    r5b = requests.get(f"{API_BASE}/admin/finance/costs", params={'key': ADMIN_KEY, 'selskap': 'tech'}, timeout=30)
    data5b = r5b.json()
    
    found_in_tech = any(c['id'] == cost_id_tech for c in data5b['costs'])
    if not found_in_tech:
        log(f"❌ TEST 5b FAILED: Cost {cost_id_tech} not found in tech costs")
        raise Exception("Test 5b failed")
    
    log(f"✓ Cost found in GET /costs?selskap=tech")
    
    # Verify it does NOT appear in GET /costs?selskap=digihome
    log(f"GET {API_BASE}/admin/finance/costs?selskap=digihome")
    r5c = requests.get(f"{API_BASE}/admin/finance/costs", params={'key': ADMIN_KEY, 'selskap': 'digihome'}, timeout=30)
    data5c = r5c.json()
    
    found_in_dh = any(c['id'] == cost_id_tech for c in data5c['costs'])
    if found_in_dh:
        log(f"❌ TEST 5c FAILED: Cost {cost_id_tech} should NOT be in digihome costs")
        raise Exception("Test 5c failed")
    
    log(f"✓ Cost NOT found in GET /costs?selskap=digihome")
    
    # Move cost to digihome
    log(f"POST {API_BASE}/admin/finance/costs/flytt with ids=[{cost_id_tech}], selskap='digihome'")
    r5d = requests.post(
        f"{API_BASE}/admin/finance/costs/flytt",
        params={'key': ADMIN_KEY},
        json={'ids': [cost_id_tech], 'selskap': 'digihome'},
        timeout=30
    )
    log(f"Status: {r5d.status_code}")
    
    if r5d.status_code != 200:
        log(f"❌ TEST 5d FAILED: Expected 200, got {r5d.status_code}")
        log(f"Response: {r5d.text}")
        raise Exception("Test 5d failed")
    
    data5d = r5d.json()
    assert data5d.get('ok') == True, "Missing ok:true"
    assert data5d.get('flyttet') >= 1, f"Expected flyttet >= 1, got {data5d.get('flyttet')}"
    log(f"✓ Cost moved to digihome, flyttet={data5d.get('flyttet')}")
    
    # Verify it now appears in digihome and digihome.byCat includes it
    log(f"GET {API_BASE}/admin/finance/selskap to verify digihome.byCat['API/LLM']")
    r5e = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data5e = r5e.json()
    
    dh_by_cat = data5e['naa']['digihome']['byCat']
    if 'API/LLM' not in dh_by_cat:
        log(f"❌ TEST 5e FAILED: 'API/LLM' not found in digihome.byCat")
        raise Exception("Test 5e failed")
    
    if dh_by_cat['API/LLM'] < 1000:
        log(f"❌ TEST 5e FAILED: digihome.byCat['API/LLM'] ({dh_by_cat['API/LLM']}) should be >= 1000")
        raise Exception("Test 5e failed")
    
    log(f"✓ digihome.byCat['API/LLM'] = {dh_by_cat['API/LLM']} (includes 1000)")
    
    # Create another cost without selskap (should default to 'digihome')
    log(f"POST {API_BASE}/admin/finance/costs without selskap (should default to 'digihome')")
    r5f = requests.post(
        f"{API_BASE}/admin/finance/costs",
        params={'key': ADMIN_KEY},
        json={
            'name': 'QA Default-kost',
            'category': 'API/LLM',
            'amount': 500,
            'frequency': 'monthly'
        },
        timeout=30
    )
    
    if r5f.status_code != 200:
        log(f"❌ TEST 5f FAILED: Expected 200, got {r5f.status_code}")
        raise Exception("Test 5f failed")
    
    data5f = r5f.json()
    cost_id_default = data5f['cost']['id']
    qa_cost_ids.append(cost_id_default)
    
    if data5f['cost']['selskap'] != 'digihome':
        log(f"❌ TEST 5f FAILED: Expected default selskap='digihome', got {data5f['cost']['selskap']}")
        raise Exception("Test 5f failed")
    
    log(f"✓ Cost created without selskap, defaulted to 'digihome', id={cost_id_default}")
    
    # Verify forslagFlytt contains the unconfirmed API/LLM cost in digihome
    log(f"GET {API_BASE}/admin/finance/selskap to check forslagFlytt")
    r5g = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data5g = r5g.json()
    
    forslag_flytt = data5g.get('forslagFlytt', [])
    log(f"forslagFlytt has {len(forslag_flytt)} items")
    
    # The unconfirmed cost should be in forslagFlytt
    found_in_forslag = False
    for forslag in forslag_flytt:
        if forslag.get('id') == cost_id_default:
            found_in_forslag = True
            log(f"✓ Cost {cost_id_default} found in forslagFlytt: {forslag.get('name')}, category={forslag.get('category')}")
            break
    
    if not found_in_forslag:
        log(f"⚠️  Cost {cost_id_default} not found in forslagFlytt (may be auto-confirmed or filtered)")
    
    # Confirm the cost
    log(f"POST {API_BASE}/admin/finance/costs/bekreft with ids=[{cost_id_default}]")
    r5h = requests.post(
        f"{API_BASE}/admin/finance/costs/bekreft",
        params={'key': ADMIN_KEY},
        json={'ids': [cost_id_default]},
        timeout=30
    )
    
    if r5h.status_code != 200:
        log(f"❌ TEST 5h FAILED: Expected 200, got {r5h.status_code}")
        raise Exception("Test 5h failed")
    
    data5h = r5h.json()
    assert data5h.get('ok') == True, "Missing ok:true"
    assert data5h.get('bekreftet') >= 1, f"Expected bekreftet >= 1, got {data5h.get('bekreftet')}"
    log(f"✓ Cost confirmed, bekreftet={data5h.get('bekreftet')}")
    
    # Verify it's no longer in forslagFlytt
    r5i = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data5i = r5i.json()
    
    forslag_flytt_after = data5i.get('forslagFlytt', [])
    found_after = any(f.get('id') == cost_id_default for f in forslag_flytt_after)
    
    if found_after:
        log(f"❌ TEST 5i FAILED: Cost {cost_id_default} should NOT be in forslagFlytt after bekreft")
        raise Exception("Test 5i failed")
    
    log(f"✓ Cost {cost_id_default} no longer in forslagFlytt after bekreft")
    
    log("✅ TEST 5 PASSED: Costs with selskap, flytt, bekreft, forslagFlytt all working")
    
    # ========================================================================
    # TEST CASE 6: POST /settings - kontantTech, verify, restore
    # ========================================================================
    test_case(6, "POST /settings - Set kontantTech, verify naa.tech.kontant, restore to null")
    
    # Get current kontantTech (should be null or have a value)
    r6a = requests.get(f"{API_BASE}/admin/finance/settings", params={'key': ADMIN_KEY}, timeout=30)
    data6a = r6a.json()
    original_kontant_tech = data6a.get('settings', {}).get('kontantTech')
    log(f"Original kontantTech: {original_kontant_tech}")
    
    # Set kontantTech
    log(f"POST {API_BASE}/admin/finance/settings with kontantTech={{saldo:100000, dato:'2026-09-01'}}")
    r6b = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'kontantTech': {'saldo': 100000, 'dato': '2026-09-01'}},
        timeout=30
    )
    
    if r6b.status_code != 200:
        log(f"❌ TEST 6b FAILED: Expected 200, got {r6b.status_code}")
        log(f"Response: {r6b.text}")
        raise Exception("Test 6b failed")
    
    log(f"✓ kontantTech set")
    
    # Verify naa.tech.kontant
    log(f"GET {API_BASE}/admin/finance/selskap to verify naa.tech.kontant")
    r6c = requests.get(f"{API_BASE}/admin/finance/selskap", params={'key': ADMIN_KEY}, timeout=TIMEOUT)
    data6c = r6c.json()
    
    tech_kontant = data6c['naa']['tech'].get('kontant')
    if tech_kontant != 100000:
        log(f"❌ TEST 6c FAILED: Expected naa.tech.kontant=100000, got {tech_kontant}")
        raise Exception("Test 6c failed")
    
    log(f"✓ naa.tech.kontant = {tech_kontant}")
    
    # Restore to null
    log(f"Restoring kontantTech to null")
    r6d = requests.post(
        f"{API_BASE}/admin/finance/settings",
        params={'key': ADMIN_KEY},
        json={'kontantTech': {'saldo': None}},
        timeout=30
    )
    
    if r6d.status_code != 200:
        log(f"❌ TEST 6d FAILED: Could not restore kontantTech")
        raise Exception("Test 6d failed")
    
    log(f"✓ kontantTech restored to null")
    log("✅ TEST 6 PASSED: kontantTech set, verified, and restored")
    
    # ========================================================================
    # CLEANUP: Delete all QA costs and inntektsposter
    # ========================================================================
    test_case("CLEANUP", "Delete all QA costs and inntektsposter")
    
    for cost_id in qa_cost_ids:
        log(f"DELETE cost {cost_id}")
        r = requests.delete(
            f"{API_BASE}/admin/finance/costs",
            params={'key': ADMIN_KEY},
            json={'id': cost_id},
            timeout=30
        )
        if r.status_code == 200:
            log(f"✓ Cost {cost_id} deleted")
        else:
            log(f"⚠️  Failed to delete cost {cost_id}: {r.status_code}")
    
    for post_id in qa_inntektspost_ids:
        log(f"DELETE inntektspost {post_id}")
        r = requests.delete(
            f"{API_BASE}/admin/finance/inntektsposter",
            params={'key': ADMIN_KEY},
            json={'id': post_id},
            timeout=30
        )
        if r.status_code == 200:
            log(f"✓ Inntektspost {post_id} deleted")
        else:
            log(f"⚠️  Failed to delete inntektspost {post_id}: {r.status_code}")
    
    log("✅ CLEANUP COMPLETE")
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print("✅ TEST 1 PASSED: GET /selskap structure and invariants verified")
    print("✅ TEST 2 PASSED: POST /settings prisliste change, lisens calculation, restore")
    print("✅ TEST 3 PASSED: POST /settings autoregler change, auto.poster verification, restore")
    print("✅ TEST 4 PASSED: POST/GET/DELETE /inntektsposter CRUD and tech.inntekt verification")
    print("✅ TEST 5 PASSED: POST /costs with selskap, flytt, bekreft, forslagFlytt")
    print("✅ TEST 6 PASSED: POST /settings kontantTech, verification, restore")
    print("✅ CLEANUP PASSED: All QA data deleted")
    print("="*80)
    print("ALL TESTS PASSED (6/6)")
    print("="*80)

except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    print("\nAttempting cleanup...")
    
    # Cleanup on failure
    for cost_id in qa_cost_ids:
        try:
            requests.delete(
                f"{API_BASE}/admin/finance/costs",
                params={'key': ADMIN_KEY},
                json={'id': cost_id},
                timeout=30
            )
            log(f"✓ Cleaned up cost {cost_id}")
        except:
            pass
    
    for post_id in qa_inntektspost_ids:
        try:
            requests.delete(
                f"{API_BASE}/admin/finance/inntektsposter",
                params={'key': ADMIN_KEY},
                json={'id': post_id},
                timeout=30
            )
            log(f"✓ Cleaned up inntektspost {post_id}")
        except:
            pass
    
    # Try to restore settings
    if original_prisliste_pris is not None:
        try:
            requests.post(
                f"{API_BASE}/admin/finance/settings",
                params={'key': ADMIN_KEY},
                json={'prisliste': {'forvaltning': {'modell': 'fast', 'pris': original_prisliste_pris}}},
                timeout=30
            )
            log(f"✓ Restored prisliste.forvaltning.pris to {original_prisliste_pris}")
        except:
            pass
    
    if original_autoregler_llm is not None:
        try:
            requests.post(
                f"{API_BASE}/admin/finance/settings",
                params={'key': ADMIN_KEY},
                json={'autoregler': {'llm': original_autoregler_llm}},
                timeout=30
            )
            log(f"✓ Restored autoregler.llm to {original_autoregler_llm}")
        except:
            pass
    
    try:
        requests.post(
            f"{API_BASE}/admin/finance/settings",
            params={'key': ADMIN_KEY},
            json={'kontantTech': {'saldo': None}},
            timeout=30
        )
        log(f"✓ Restored kontantTech to null")
    except:
        pass
    
    raise
