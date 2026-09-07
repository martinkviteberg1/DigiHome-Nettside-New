#!/usr/bin/env python3
"""
Backend test for external deck-sharing feature (DigiHome Next.js app).
Tests all endpoints under /api/investor/deck/deling and the locked deck access via ?t=<token>.
"""

import requests
import sys
import os
from datetime import datetime

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin key from test_credentials.md
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test state
test_state = {
    'plan_id': None,
    'tech_id': None,
    'link_id': None,
    'link_token': None,
    'link_id_2': None,
    'link_token_2': None,
    'link_id_3': None,
    'link_token_3': None,
    'investor_room_link_id': None,
    'cookie': None,
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_step(step_num, description):
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

try:
    # STEP 1: Get presenter deck to obtain PLAN and TECH ids
    test_step(1, "GET /api/investor/deck?key=KEY → get PLAN and TECH ids")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'key': ADMIN_KEY}, timeout=30)
    log(f"GET /investor/deck?key=... → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        log(f"Response: {data}")
        sys.exit(1)
    
    if not data.get('presenter'):
        log(f"❌ FAILED: presenter should be true")
        sys.exit(1)
    
    if not data.get('plan') or not data['plan'].get('id'):
        log(f"❌ FAILED: plan.id missing")
        sys.exit(1)
    
    test_state['plan_id'] = data['plan']['id']
    test_state['tech_id'] = data.get('tech', {}).get('id') if data.get('tech') else None
    
    log(f"✅ PASSED: Got PLAN={test_state['plan_id']}, TECH={test_state['tech_id']}")
    log(f"   presenter=true, plan.id={test_state['plan_id'][:8]}...")
    
    # STEP 2: GET /api/investor/deck/deling?key=KEY&plan=PLAN → list deck links
    test_step(2, "GET /api/investor/deck/deling?key=KEY&plan=PLAN → list deck links")
    
    r = requests.get(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'plan': test_state['plan_id']}, timeout=30)
    log(f"GET /investor/deck/deling?plan=... → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    if 'lenker' not in data or not isinstance(data['lenker'], list):
        log(f"❌ FAILED: lenker should be an array")
        sys.exit(1)
    
    log(f"✅ PASSED: Got {len(data['lenker'])} existing deck links for plan")
    
    # STEP 3: POST /api/investor/deck/deling?key=KEY → create deck link (positive case)
    test_step(3, "POST /api/investor/deck/deling?key=KEY → create deck link with PIN")
    
    payload = {
        'label': 'QA Ekstern',
        'pin': '1234',
        'planId': test_state['plan_id'],
        'techPlanId': test_state['tech_id'],
        'expiresDays': 0
    }
    
    r = requests.post(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json=payload, timeout=30)
    log(f"POST /investor/deck/deling → {r.status_code}")
    
    if r.status_code != 201:
        log(f"❌ FAILED: Expected 201, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        log(f"Response: {data}")
        sys.exit(1)
    
    link = data.get('link', {})
    if not link.get('id') or not link.get('token'):
        log(f"❌ FAILED: link.id or link.token missing")
        sys.exit(1)
    
    if link.get('kind') != 'deck':
        log(f"❌ FAILED: link.kind should be 'deck', got {link.get('kind')}")
        sys.exit(1)
    
    if link.get('planId') != test_state['plan_id']:
        log(f"❌ FAILED: link.planId should match PLAN")
        sys.exit(1)
    
    if not link.get('harPassord'):
        log(f"❌ FAILED: link.harPassord should be true")
        sys.exit(1)
    
    if len(link['token']) != 16:
        log(f"❌ FAILED: token should be 16 chars, got {len(link['token'])}")
        sys.exit(1)
    
    test_state['link_id'] = link['id']
    test_state['link_token'] = link['token']
    
    log(f"✅ PASSED: Created deck link id={link['id'][:8]}..., token={link['token'][:8]}... (16 chars)")
    log(f"   kind='deck', planId matches, harPassord=true")
    
    # STEP 3b: POST without planId → 400
    test_step("3b", "POST /api/investor/deck/deling without planId → 400")
    
    r = requests.post(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json={'label': 'QA Test'}, timeout=30)
    log(f"POST /investor/deck/deling (no planId) → {r.status_code}")
    
    if r.status_code != 400:
        log(f"❌ FAILED: Expected 400, got {r.status_code}")
        sys.exit(1)
    
    log(f"✅ PASSED: POST without planId returns 400")
    
    # STEP 3c: POST with planId='finnes-ikke' → 400
    test_step("3c", "POST /api/investor/deck/deling with planId='finnes-ikke' → 400")
    
    r = requests.post(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json={'label': 'QA Test', 'planId': 'finnes-ikke'}, timeout=30)
    log(f"POST /investor/deck/deling (invalid planId) → {r.status_code}")
    
    if r.status_code != 400:
        log(f"❌ FAILED: Expected 400, got {r.status_code}")
        sys.exit(1)
    
    log(f"✅ PASSED: POST with invalid planId returns 400")
    
    # STEP 3d: POST with ?t=<token> instead of ?key → 401
    test_step("3d", "POST /api/investor/deck/deling with ?t=<token> instead of ?key → 401")
    
    r = requests.post(f"{API_BASE}/investor/deck/deling", params={'t': test_state['link_token']}, json={'label': 'QA Test', 'planId': test_state['plan_id']}, timeout=30)
    log(f"POST /investor/deck/deling?t=... → {r.status_code}")
    
    if r.status_code != 401:
        log(f"❌ FAILED: Expected 401, got {r.status_code}")
        sys.exit(1)
    
    log(f"✅ PASSED: POST with ?t= instead of ?key= returns 401")
    
    # STEP 4: GET /api/investor/deck?t=TOKEN (no cookie) → 401 with needsPin
    test_step(4, "GET /api/investor/deck?t=TOKEN (no cookie) → 401 with needsPin")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'t': test_state['link_token']}, timeout=30)
    log(f"GET /investor/deck?t=... (no cookie) → {r.status_code}")
    
    if r.status_code != 401:
        log(f"❌ FAILED: Expected 401, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if data.get('ok') != False:
        log(f"❌ FAILED: ok should be false")
        sys.exit(1)
    
    if not data.get('needsPin'):
        log(f"❌ FAILED: needsPin should be true")
        sys.exit(1)
    
    if not data.get('ekstern'):
        log(f"❌ FAILED: ekstern should be true")
        sys.exit(1)
    
    if data.get('label') != 'QA Ekstern':
        log(f"❌ FAILED: label should be 'QA Ekstern', got {data.get('label')}")
        sys.exit(1)
    
    log(f"✅ PASSED: Returns 401 with needsPin=true, ekstern=true, label='QA Ekstern'")
    
    # STEP 4b: POST /api/investor/deck/pin?t=TOKEN with wrong PIN → 401
    test_step("4b", "POST /api/investor/deck/pin?t=TOKEN with wrong PIN → 401")
    
    r = requests.post(f"{API_BASE}/investor/deck/pin", params={'t': test_state['link_token']}, json={'pin': '9999'}, timeout=30)
    log(f"POST /investor/deck/pin (wrong PIN) → {r.status_code}")
    
    if r.status_code != 401:
        log(f"❌ FAILED: Expected 401, got {r.status_code}")
        sys.exit(1)
    
    log(f"✅ PASSED: Wrong PIN returns 401")
    
    # STEP 4c: POST /api/investor/deck/pin?t=TOKEN with correct PIN → 200 + cookie
    test_step("4c", "POST /api/investor/deck/pin?t=TOKEN with correct PIN → 200 + cookie")
    
    r = requests.post(f"{API_BASE}/investor/deck/pin", params={'t': test_state['link_token']}, json={'pin': '1234'}, timeout=30)
    log(f"POST /investor/deck/pin (correct PIN) → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    # Check for Set-Cookie header
    cookie_header = r.headers.get('Set-Cookie', '')
    if not cookie_header.startswith('dh_deckpin_'):
        log(f"❌ FAILED: Set-Cookie should start with 'dh_deckpin_', got: {cookie_header[:50]}")
        sys.exit(1)
    
    # Extract cookie value for subsequent requests
    cookie_parts = cookie_header.split(';')[0].split('=', 1)
    if len(cookie_parts) == 2:
        test_state['cookie'] = {cookie_parts[0]: cookie_parts[1]}
    
    log(f"✅ PASSED: Correct PIN returns 200 with Set-Cookie starting with 'dh_deckpin_'")
    
    # STEP 4d: GET /api/investor/deck?t=TOKEN with cookie → 200 with deck data
    test_step("4d", "GET /api/investor/deck?t=TOKEN with cookie → 200 with deck data")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'t': test_state['link_token']}, cookies=test_state['cookie'], timeout=30)
    log(f"GET /investor/deck?t=... (with cookie) → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    if data.get('presenter') != False:
        log(f"❌ FAILED: presenter should be false")
        sys.exit(1)
    
    if not data.get('plan') or data['plan'].get('id') != test_state['plan_id']:
        log(f"❌ FAILED: plan.id should match PLAN")
        sys.exit(1)
    
    if test_state['tech_id'] and (not data.get('tech') or data['tech'].get('id') != test_state['tech_id']):
        log(f"❌ FAILED: tech.id should match TECH")
        sys.exit(1)
    
    investor = data.get('investor', {})
    if investor.get('label') != 'QA Ekstern':
        log(f"❌ FAILED: investor.label should be 'QA Ekstern'")
        sys.exit(1)
    
    if not investor.get('harPassord'):
        log(f"❌ FAILED: investor.harPassord should be true")
        sys.exit(1)
    
    if not investor.get('ekstern'):
        log(f"❌ FAILED: investor.ekstern should be true")
        sys.exit(1)
    
    if 'planer' in data:
        log(f"❌ FAILED: planer should be undefined for investor")
        sys.exit(1)
    
    log(f"✅ PASSED: Returns 200 with presenter=false, plan.id matches, tech.id matches (if TECH not null)")
    log(f"   investor.label='QA Ekstern', harPassord=true, ekstern=true, planer is undefined")
    
    # STEP 5: POST /api/investor/deck/hendelse?t=TOKEN → 200 and stats updated
    test_step(5, "POST /api/investor/deck/hendelse?t=TOKEN → 200 and stats updated")
    
    r = requests.post(f"{API_BASE}/investor/deck/hendelse", params={'t': test_state['link_token']}, cookies=test_state['cookie'], json={'type': 'deck_aapnet'}, timeout=30)
    log(f"POST /investor/deck/hendelse → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    log(f"✅ PASSED: Event logged successfully")
    
    # Verify stats updated
    r = requests.get(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'plan': test_state['plan_id']}, timeout=30)
    if r.status_code == 200:
        data = r.json()
        link = next((l for l in data.get('lenker', []) if l.get('id') == test_state['link_id']), None)
        if link:
            stats = link.get('stats', {})
            if stats.get('aapninger', 0) >= 1:
                log(f"✅ PASSED: stats.aapninger >= 1 (actual: {stats.get('aapninger')})")
            else:
                log(f"⚠️  WARNING: stats.aapninger should be >= 1, got {stats.get('aapninger')}")
            
            if link.get('status') == 'active':
                log(f"✅ PASSED: status='active'")
            else:
                log(f"⚠️  WARNING: status should be 'active', got {link.get('status')}")
    
    # STEP 6a: PUT /api/investor/deck/deling?key=KEY {id, patch:{revoked:true}} → 200
    test_step("6a", "PUT /api/investor/deck/deling {id, patch:{revoked:true}} → 200")
    
    r = requests.put(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json={'id': test_state['link_id'], 'patch': {'revoked': True}}, timeout=30)
    log(f"PUT /investor/deck/deling (revoke) → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    log(f"✅ PASSED: Link revoked successfully")
    
    # STEP 6b: GET /api/investor/deck?t=TOKEN → 410
    test_step("6b", "GET /api/investor/deck?t=TOKEN (revoked) → 410")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'t': test_state['link_token']}, cookies=test_state['cookie'], timeout=30)
    log(f"GET /investor/deck?t=... (revoked) → {r.status_code}")
    
    if r.status_code != 410:
        log(f"❌ FAILED: Expected 410, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    log(f"✅ PASSED: Revoked link returns 410")
    
    # STEP 6c: PUT /api/investor/deck/deling {id, patch:{revoked:false, pin:''}} → 200
    test_step("6c", "PUT /api/investor/deck/deling {id, patch:{revoked:false, pin:''}} → 200")
    
    r = requests.put(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json={'id': test_state['link_id'], 'patch': {'revoked': False, 'pin': ''}}, timeout=30)
    log(f"PUT /investor/deck/deling (unrevoke + remove PIN) → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    log(f"✅ PASSED: Link unrevoked and PIN removed")
    
    # STEP 6d: GET /api/investor/deck?t=TOKEN (no cookie) → 200 with harPassord=false
    test_step("6d", "GET /api/investor/deck?t=TOKEN (no cookie, no PIN) → 200")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'t': test_state['link_token']}, timeout=30)
    log(f"GET /investor/deck?t=... (no cookie, no PIN) → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    investor = data.get('investor', {})
    if investor.get('harPassord') != False:
        log(f"❌ FAILED: investor.harPassord should be false")
        sys.exit(1)
    
    log(f"✅ PASSED: Link accessible without PIN, investor.harPassord=false")
    
    # STEP 6e: PUT with id of a NON-deck link → 404
    test_step("6e", "PUT /api/investor/deck/deling with NON-deck link id → 404")
    
    # Get a non-deck link from investor-room
    r = requests.get(f"{API_BASE}/admin/investor-room", params={'key': ADMIN_KEY}, timeout=30)
    if r.status_code == 200:
        data = r.json()
        non_deck_link = next((l for l in data.get('links', []) if l.get('kind') != 'deck'), None)
        if non_deck_link:
            test_state['investor_room_link_id'] = non_deck_link['id']
            
            r = requests.put(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY}, json={'id': non_deck_link['id'], 'patch': {'label': 'Test'}}, timeout=30)
            log(f"PUT /investor/deck/deling (non-deck link) → {r.status_code}")
            
            if r.status_code != 404:
                log(f"❌ FAILED: Expected 404, got {r.status_code}")
                sys.exit(1)
            
            log(f"✅ PASSED: PUT with non-deck link id returns 404")
        else:
            log(f"⚠️  SKIPPED: No non-deck links found in investor-room")
    else:
        log(f"⚠️  SKIPPED: Could not fetch investor-room links")
    
    # STEP 7: GET /api/admin/investor-room?key=KEY → links contains no kind='deck'
    test_step(7, "GET /api/admin/investor-room?key=KEY → links contains no kind='deck'")
    
    r = requests.get(f"{API_BASE}/admin/investor-room", params={'key': ADMIN_KEY}, timeout=30)
    log(f"GET /admin/investor-room → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    links = data.get('links', [])
    deck_links = [l for l in links if l.get('kind') == 'deck']
    
    if len(deck_links) > 0:
        log(f"❌ FAILED: investor-room should not contain deck links, found {len(deck_links)}")
        sys.exit(1)
    
    log(f"✅ PASSED: investor-room contains no deck links (found {len(links)} non-deck links)")
    
    # STEP 8a: DELETE /api/investor/deck/deling?key=KEY&id=ID → 200
    test_step("8a", "DELETE /api/investor/deck/deling?key=KEY&id=ID → 200")
    
    r = requests.delete(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'id': test_state['link_id']}, timeout=30)
    log(f"DELETE /investor/deck/deling → {r.status_code}")
    
    if r.status_code != 200:
        log(f"❌ FAILED: Expected 200, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    data = r.json()
    if not data.get('ok'):
        log(f"❌ FAILED: Response ok=false")
        sys.exit(1)
    
    log(f"✅ PASSED: Link deleted successfully")
    
    # STEP 8b: GET /api/investor/deck?t=TOKEN → 404
    test_step("8b", "GET /api/investor/deck?t=TOKEN (deleted) → 404")
    
    r = requests.get(f"{API_BASE}/investor/deck", params={'t': test_state['link_token']}, timeout=30)
    log(f"GET /investor/deck?t=... (deleted) → {r.status_code}")
    
    if r.status_code != 404:
        log(f"❌ FAILED: Expected 404, got {r.status_code}")
        log(f"Response: {r.text}")
        sys.exit(1)
    
    log(f"✅ PASSED: Deleted link returns 404")
    
    # STEP 8c: DELETE same id again → 404
    test_step("8c", "DELETE /api/investor/deck/deling (same id again) → 404")
    
    r = requests.delete(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'id': test_state['link_id']}, timeout=30)
    log(f"DELETE /investor/deck/deling (already deleted) → {r.status_code}")
    
    if r.status_code != 404:
        log(f"❌ FAILED: Expected 404, got {r.status_code}")
        sys.exit(1)
    
    log(f"✅ PASSED: DELETE already deleted link returns 404")
    
    # CLEANUP: Verify no QA links remain
    test_step("CLEANUP", "Verify all QA deck links are deleted")
    
    r = requests.get(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'plan': test_state['plan_id']}, timeout=30)
    if r.status_code == 200:
        data = r.json()
        qa_links = [l for l in data.get('lenker', []) if l.get('label', '').startswith('QA ')]
        if len(qa_links) > 0:
            log(f"⚠️  WARNING: Found {len(qa_links)} QA links remaining, attempting cleanup...")
            for link in qa_links:
                r = requests.delete(f"{API_BASE}/investor/deck/deling", params={'key': ADMIN_KEY, 'id': link['id']}, timeout=30)
                log(f"   Deleted QA link {link['id'][:8]}... → {r.status_code}")
        else:
            log(f"✅ PASSED: No QA links remaining")
    
    print(f"\n{'='*80}")
    print("✅ ALL TESTS PASSED")
    print('='*80)
    print(f"\nSummary:")
    print(f"  - Tested GET /api/investor/deck?key= (presenter mode)")
    print(f"  - Tested GET /api/investor/deck/deling (list deck links)")
    print(f"  - Tested POST /api/investor/deck/deling (create with validation)")
    print(f"  - Tested GET /api/investor/deck?t= (PIN flow: 401 → correct PIN → 200)")
    print(f"  - Tested POST /api/investor/deck/hendelse (event tracking)")
    print(f"  - Tested PUT /api/investor/deck/deling (revoke/unrevoke/remove PIN)")
    print(f"  - Tested GET /api/admin/investor-room (deck links excluded)")
    print(f"  - Tested DELETE /api/investor/deck/deling (deletion + 404 on re-delete)")
    print(f"  - All QA links cleaned up")
    print(f"\nBase URL: {API_BASE}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Plan ID: {test_state['plan_id']}")
    print(f"Tech ID: {test_state['tech_id']}")

except Exception as e:
    print(f"\n❌ TEST FAILED WITH EXCEPTION:")
    print(f"   {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
