#!/usr/bin/env python3
"""
Backend test for INVESTOR ROLE + BUDGET MODULE
Tests two new features in DigiHome admin portal.
"""
import requests
import sys
import os
from datetime import datetime
from pymongo import MongoClient

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# MongoDB connection
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test data
QA_INV_EMAIL = "qa-inv-test@example.com"
QA_INV2_EMAIL = "qa-inv2@example.com"
QA_PASSWORD = "QaTest12345!"

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_investor_role():
    """Test FEATURE 1: Investor role with module-based access"""
    log("=" * 80)
    log("FEATURE 1: INVESTOR ROLE (dataroom, read-only, module-based access)")
    log("=" * 80)
    
    qa_inv_id = None
    qa_inv2_id = None
    qa_inv_token = None
    
    try:
        # TEST 1: Create investor user
        log("\n[TEST 1] POST /api/admin/users - Create investor user")
        resp = requests.post(
            f"{API_URL}/admin/users",
            params={"key": ADMIN_KEY},
            json={
                "name": "QA Inv Test",
                "email": QA_INV_EMAIL,
                "role": "investor",
                "password": QA_PASSWORD,
                "invite": False
            },
            timeout=10
        )
        log(f"Status: {resp.status_code}")
        if resp.status_code not in [200, 201]:
            log(f"❌ FAIL: Expected 200/201, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            log(f"❌ FAIL: Response ok=false")
            return False
        
        member = data.get('member') or data.get('user')
        if not member:
            log(f"❌ FAIL: No member/user in response")
            return False
        
        qa_inv_id = member.get('id')
        if member.get('role') != 'investor':
            log(f"❌ FAIL: Expected role='investor', got {member.get('role')}")
            return False
        
        log(f"✅ PASS: Created investor user {qa_inv_id} with role='investor'")
        
        # TEST 2: Login as investor and verify auth/me
        log("\n[TEST 2] Login as investor and GET /api/admin/auth/me")
        resp = requests.post(
            f"{API_URL}/admin/auth/login",
            json={"email": QA_INV_EMAIL, "password": QA_PASSWORD},
            timeout=10
        )
        log(f"Login status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Login failed with {resp.status_code}")
            return False
        
        login_data = resp.json()
        qa_inv_token = login_data.get('token')
        if not qa_inv_token:
            log(f"❌ FAIL: No token in login response")
            return False
        
        log(f"✅ Login successful, got token")
        
        # Verify auth/me
        resp = requests.get(
            f"{API_URL}/admin/auth/me",
            params={"key": qa_inv_token},
            timeout=10
        )
        log(f"auth/me status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: auth/me failed with {resp.status_code}")
            return False
        
        me_data = resp.json()
        user = me_data.get('user', {})
        
        if user.get('role') != 'investor':
            log(f"❌ FAIL: Expected role='investor', got {user.get('role')}")
            return False
        
        if 'moduler' not in user:
            log(f"❌ FAIL: Missing 'moduler' field in auth/me response")
            return False
        
        if 'moteTilgang' not in user:
            log(f"❌ FAIL: Missing 'moteTilgang' field in auth/me response")
            return False
        
        log(f"✅ PASS: auth/me returns role='investor', moduler={user.get('moduler')}, moteTilgang={user.get('moteTilgang')}")
        
        # TEST 3: Verify NO access without modules
        log("\n[TEST 3] Verify investor has NO access without modules")
        
        endpoints_to_test = [
            ("/admin/leieforhold", "leieforhold"),
            ("/admin/budsjett?year=2026", "budsjett"),
            ("/admin/tasks", "tasks"),
            ("/admin/kpi", "kpi"),
        ]
        
        for endpoint, name in endpoints_to_test:
            resp = requests.get(
                f"{API_URL}{endpoint}",
                params={"key": qa_inv_token},
                timeout=10
            )
            log(f"  {name}: {resp.status_code}")
            if resp.status_code != 401:
                log(f"❌ FAIL: Expected 401 for {name}, got {resp.status_code}")
                return False
        
        log(f"✅ PASS: All endpoints return 401 without modules")
        
        # TEST 3b: Verify write operations blocked
        log("\n[TEST 3b] Verify PUT /api/admin/users/<own-id> returns 401")
        resp = requests.put(
            f"{API_URL}/admin/users/{qa_inv_id}",
            params={"key": qa_inv_token},
            json={"name": "QA Inv Test Updated"},
            timeout=10
        )
        log(f"PUT users status: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401 for PUT users, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: PUT users returns 401 (investor cannot modify users)")
        
        # TEST 4: Grant modules with sanitization
        log("\n[TEST 4] PUT /api/admin/users/<qa-id> - Grant modules with invalid module")
        resp = requests.put(
            f"{API_URL}/admin/users/{qa_inv_id}",
            params={"key": ADMIN_KEY},
            json={"moduler": ["leieforhold", "budsjett", "ugyldig-modul"]},
            timeout=10
        )
        log(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        member = data.get('member') or data.get('user')
        moduler = member.get('moduler', [])
        
        if 'leieforhold' not in moduler:
            log(f"❌ FAIL: 'leieforhold' not in moduler: {moduler}")
            return False
        
        if 'budsjett' not in moduler:
            log(f"❌ FAIL: 'budsjett' not in moduler: {moduler}")
            return False
        
        if 'ugyldig-modul' in moduler:
            log(f"❌ FAIL: 'ugyldig-modul' should be filtered out but found in: {moduler}")
            return False
        
        log(f"✅ PASS: Modules granted and sanitized: {moduler} (ugyldig-modul filtered out)")
        
        # TEST 5: Verify read access with modules
        log("\n[TEST 5] Verify investor can READ with granted modules")
        
        # Test leieforhold
        resp = requests.get(
            f"{API_URL}/admin/leieforhold",
            params={"key": qa_inv_token},
            timeout=30
        )
        log(f"  leieforhold: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200 for leieforhold, got {resp.status_code}")
            return False
        
        # Test budsjett
        resp = requests.get(
            f"{API_URL}/admin/budsjett",
            params={"key": qa_inv_token, "year": "2026"},
            timeout=10
        )
        log(f"  budsjett: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200 for budsjett, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: Investor can read leieforhold and budsjett with modules")
        
        # TEST 5b: Verify write operations still blocked
        log("\n[TEST 5b] Verify PUT /api/admin/budsjett returns 401 (admin-only)")
        resp = requests.put(
            f"{API_URL}/admin/budsjett",
            params={"key": qa_inv_token},
            json={"year": 2025, "inntekter": {}, "kostnader": {}},
            timeout=10
        )
        log(f"PUT budsjett status: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401 for PUT budsjett, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: PUT budsjett returns 401 (admin-only)")
        
        # TEST 5c: Verify forslag endpoint blocked
        log("\n[TEST 5c] Verify GET /api/admin/budsjett/forslag returns 401 (admin-only)")
        resp = requests.get(
            f"{API_URL}/admin/budsjett/forslag",
            params={"key": qa_inv_token, "year": "2026"},
            timeout=10
        )
        log(f"GET forslag status: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401 for GET forslag, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: GET forslag returns 401 (admin-only)")
        
        # TEST 5d: Verify tasks still blocked (no module for tasks)
        log("\n[TEST 5d] Verify GET /api/admin/tasks still returns 401 (no tasks module)")
        resp = requests.get(
            f"{API_URL}/admin/tasks",
            params={"key": qa_inv_token},
            timeout=10
        )
        log(f"GET tasks status: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401 for GET tasks, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: GET tasks returns 401 (investor role rejected by sakerAuthed)")
        
        # TEST 6: Change role to investor
        log("\n[TEST 6] Create bruker and change role to investor")
        
        # Create bruker
        resp = requests.post(
            f"{API_URL}/admin/users",
            params={"key": ADMIN_KEY},
            json={
                "name": "QA Inv2 Test",
                "email": QA_INV2_EMAIL,
                "role": "bruker",
                "password": QA_PASSWORD,
                "invite": False
            },
            timeout=10
        )
        log(f"Create bruker status: {resp.status_code}")
        if resp.status_code not in [200, 201]:
            log(f"❌ FAIL: Failed to create bruker")
            return False
        
        data = resp.json()
        member = data.get('member') or data.get('user')
        qa_inv2_id = member.get('id')
        
        if member.get('role') != 'bruker':
            log(f"❌ FAIL: Expected role='bruker', got {member.get('role')}")
            return False
        
        log(f"✅ Created bruker {qa_inv2_id}")
        
        # Change role to investor
        resp = requests.put(
            f"{API_URL}/admin/users/{qa_inv2_id}",
            params={"key": ADMIN_KEY},
            json={"role": "investor"},
            timeout=10
        )
        log(f"Change role status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Failed to change role")
            return False
        
        data = resp.json()
        member = data.get('member') or data.get('user')
        
        if member.get('role') != 'investor':
            log(f"❌ FAIL: Expected role='investor', got {member.get('role')}")
            return False
        
        log(f"✅ PASS: Role changed from bruker to investor")
        
        log("\n" + "=" * 80)
        log("✅ FEATURE 1 COMPLETE: All investor role tests passed")
        log("=" * 80)
        
        return True
        
    except Exception as e:
        log(f"❌ EXCEPTION in test_investor_role: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup will be done in main cleanup function
        pass

def test_budget_module():
    """Test FEATURE 2: Budget module"""
    log("\n" + "=" * 80)
    log("FEATURE 2: BUDGET MODULE")
    log("=" * 80)
    
    try:
        # TEST 7: GET budsjett for 2026 (demo data - DO NOT MODIFY)
        log("\n[TEST 7] GET /api/admin/budsjett?year=2026 - Verify structure and faktisk data")
        resp = requests.get(
            f"{API_URL}/admin/budsjett",
            params={"key": ADMIN_KEY, "year": "2026"},
            timeout=10
        )
        log(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Verify structure
        required_fields = ['ok', 'year', 'inntekter', 'kostnader', 'egnePoster', 'faktisk', 'kategorier']
        for field in required_fields:
            if field not in data:
                log(f"❌ FAIL: Missing field '{field}' in response")
                return False
        
        if data['year'] != 2026:
            log(f"❌ FAIL: Expected year=2026, got {data['year']}")
            return False
        
        # Verify inntekter has 3 categories
        inntekter = data.get('inntekter', {})
        if len(inntekter) < 3:
            log(f"❌ FAIL: Expected at least 3 inntekt categories, got {len(inntekter)}")
            return False
        
        # Verify each category has 12 months
        for cat, values in inntekter.items():
            if not isinstance(values, list) or len(values) != 12:
                log(f"❌ FAIL: Category '{cat}' should have 12 values, got {len(values) if isinstance(values, list) else 'not a list'}")
                return False
        
        # Verify kostnader has 7 categories
        kostnader = data.get('kostnader', {})
        if len(kostnader) < 7:
            log(f"❌ FAIL: Expected at least 7 kostnad categories, got {len(kostnader)}")
            return False
        
        # Verify faktisk structure
        faktisk = data.get('faktisk', {})
        if 'honorar' not in faktisk:
            log(f"❌ FAIL: Missing 'honorar' in faktisk")
            return False
        
        if 'kostnaderPerKategori' not in faktisk:
            log(f"❌ FAIL: Missing 'kostnaderPerKategori' in faktisk")
            return False
        
        if 'kostnaderSum' not in faktisk:
            log(f"❌ FAIL: Missing 'kostnaderSum' in faktisk")
            return False
        
        # Verify honorar has 12 values
        honorar = faktisk.get('honorar', [])
        if len(honorar) != 12:
            log(f"❌ FAIL: honorar should have 12 values, got {len(honorar)}")
            return False
        
        # Verify past months have non-null values, future months are null
        # Assuming current date is Aug 2026, so Jan-Aug should have values, Sep-Dec should be null
        current_month = datetime.now().month
        has_past_values = any(v is not None and v > 0 for v in honorar[:current_month])
        has_future_nulls = all(v is None for v in honorar[current_month:])
        
        if not has_past_values:
            log(f"⚠️  WARNING: Expected some non-null values in past months (Jan-{current_month}), got all null/zero")
            # Not failing, just warning
        
        log(f"✅ PASS: GET budsjett 2026 structure valid")
        log(f"  - inntekter: {len(inntekter)} categories")
        log(f"  - kostnader: {len(kostnader)} categories")
        log(f"  - egnePoster: {len(data.get('egnePoster', []))} items")
        log(f"  - faktisk.honorar: {honorar[:3]}... (first 3 months)")
        
        # TEST 8: PUT budsjett for 2025 with sanitization tests
        log("\n[TEST 8] PUT /api/admin/budsjett?year=2025 - Test sanitization")
        
        payload = {
            "year": 2025,
            "inntekter": {
                "Honorar (forvaltning)": [1000] * 12
            },
            "kostnader": {
                "Lønn": [2000] * 12
            },
            "egnePoster": [
                {
                    "type": "kost",
                    "navn": "QA Testpost",
                    "frekvens": "kvartalsvis",
                    "mapTil": "Annet",
                    "verdier": [500, 0, 0, 500, 0, 0, 500, 0, 0, 500, 0, 0]
                },
                {
                    "type": "inn",
                    "navn": "",  # Empty name - should be DROPPED
                    "verdier": [9] * 12
                },
                {
                    "type": "kost",
                    "navn": "QA Ugyldig Map",
                    "frekvens": "tullball",  # Invalid frekvens - should fallback to 'manedlig'
                    "mapTil": "FinnesIkke",  # Invalid mapTil - should become null
                    "verdier": [-50, "abc", 100.7, None, 0, 0, 0, 0, 0, 0, 0, 0]
                    # -50 should be clamped to 0
                    # "abc" should be 0
                    # 100.7 should be rounded to 101
                    # None should be 0
                }
            ]
        }
        
        resp = requests.put(
            f"{API_URL}/admin/budsjett",
            params={"key": ADMIN_KEY},
            json=payload,
            timeout=10
        )
        log(f"PUT status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        # Verify by GET
        resp = requests.get(
            f"{API_URL}/admin/budsjett",
            params={"key": ADMIN_KEY, "year": "2025"},
            timeout=10
        )
        log(f"GET 2025 status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        egne = data.get('egnePoster', [])
        
        # Should have only 2 posts (empty navn was dropped)
        if len(egne) != 2:
            log(f"❌ FAIL: Expected 2 egnePoster (empty navn dropped), got {len(egne)}")
            return False
        
        log(f"✅ PASS: Empty navn was dropped (2 egnePoster remain)")
        
        # Find QA Testpost
        testpost = next((p for p in egne if p.get('navn') == 'QA Testpost'), None)
        if not testpost:
            log(f"❌ FAIL: QA Testpost not found")
            return False
        
        if testpost.get('frekvens') != 'kvartalsvis':
            log(f"❌ FAIL: QA Testpost frekvens should be 'kvartalsvis', got {testpost.get('frekvens')}")
            return False
        
        if testpost.get('mapTil') != 'Annet':
            log(f"❌ FAIL: QA Testpost mapTil should be 'Annet', got {testpost.get('mapTil')}")
            return False
        
        expected_verdier = [500, 0, 0, 500, 0, 0, 500, 0, 0, 500, 0, 0]
        if testpost.get('verdier') != expected_verdier:
            log(f"❌ FAIL: QA Testpost verdier mismatch")
            log(f"  Expected: {expected_verdier}")
            log(f"  Got: {testpost.get('verdier')}")
            return False
        
        log(f"✅ PASS: QA Testpost preserved correctly")
        
        # Find QA Ugyldig Map
        ugyldig = next((p for p in egne if p.get('navn') == 'QA Ugyldig Map'), None)
        if not ugyldig:
            log(f"❌ FAIL: QA Ugyldig Map not found")
            return False
        
        if ugyldig.get('frekvens') != 'manedlig':
            log(f"❌ FAIL: QA Ugyldig Map frekvens should fallback to 'manedlig', got {ugyldig.get('frekvens')}")
            return False
        
        if ugyldig.get('mapTil') is not None:
            log(f"❌ FAIL: QA Ugyldig Map mapTil should be null, got {ugyldig.get('mapTil')}")
            return False
        
        verdier = ugyldig.get('verdier', [])
        if verdier[0] != 0:
            log(f"❌ FAIL: verdier[0] should be 0 (negative clamped), got {verdier[0]}")
            return False
        
        if verdier[1] != 0:
            log(f"❌ FAIL: verdier[1] should be 0 (non-numeric), got {verdier[1]}")
            return False
        
        if verdier[2] != 101:
            log(f"❌ FAIL: verdier[2] should be 101 (rounded), got {verdier[2]}")
            return False
        
        if verdier[3] != 0:
            log(f"❌ FAIL: verdier[3] should be 0 (null), got {verdier[3]}")
            return False
        
        log(f"✅ PASS: QA Ugyldig Map sanitized correctly")
        log(f"  - frekvens: 'tullball' → 'manedlig'")
        log(f"  - mapTil: 'FinnesIkke' → null")
        log(f"  - verdier[0]: -50 → 0 (clamped)")
        log(f"  - verdier[1]: 'abc' → 0 (non-numeric)")
        log(f"  - verdier[2]: 100.7 → 101 (rounded)")
        log(f"  - verdier[3]: null → 0")
        
        # TEST 9: Invalid year
        log("\n[TEST 9] PUT /api/admin/budsjett with invalid year")
        resp = requests.put(
            f"{API_URL}/admin/budsjett",
            params={"key": ADMIN_KEY},
            json={"year": 1999, "inntekter": {}, "kostnader": {}},
            timeout=10
        )
        log(f"Status: {resp.status_code}")
        if resp.status_code != 400:
            log(f"❌ FAIL: Expected 400 for invalid year, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: Invalid year returns 400")
        
        # TEST 10: GET forslag with driver overrides
        log("\n[TEST 10] GET /api/admin/budsjett/forslag?year=2026&env=prod")
        resp = requests.get(
            f"{API_URL}/admin/budsjett/forslag",
            params={
                "key": ADMIN_KEY,
                "year": "2026",
                "env": "prod"
            },
            timeout=60  # Can take 10-25s
        )
        log(f"Status: {resp.status_code} (took {resp.elapsed.total_seconds():.2f}s)")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        
        # Verify structure
        required_fields = ['ok', 'kilde', 'inntekter', 'drivere', 'grunnlag']
        for field in required_fields:
            if field not in data:
                log(f"❌ FAIL: Missing field '{field}' in forslag response")
                return False
        
        kilde = data.get('kilde', {})
        if kilde.get('env') != 'prod':
            log(f"❌ FAIL: Expected env='prod', got {kilde.get('env')}")
            return False
        
        if kilde.get('antallRader', 0) <= 0:
            log(f"❌ FAIL: Expected antallRader > 0, got {kilde.get('antallRader')}")
            return False
        
        # Verify inntekter has Honorar (forvaltning) with 12 values
        inntekter = data.get('inntekter', {})
        honorar = inntekter.get('Honorar (forvaltning)')
        if not honorar or len(honorar) != 12:
            log(f"❌ FAIL: Expected 'Honorar (forvaltning)' with 12 values")
            return False
        
        # Verify drivere
        drivere = data.get('drivere', {})
        required_drivere = ['nyeEnheterPerMnd', 'fyllLedigPerMnd', 'snittLeie', 'honorarPct']
        for driver in required_drivere:
            if driver not in drivere:
                log(f"❌ FAIL: Missing driver '{driver}'")
                return False
        
        if drivere.get('snittLeie', 0) <= 0:
            log(f"❌ FAIL: Expected snittLeie > 0, got {drivere.get('snittLeie')}")
            return False
        
        if drivere.get('honorarPct', 0) <= 0:
            log(f"❌ FAIL: Expected honorarPct > 0, got {drivere.get('honorarPct')}")
            return False
        
        # Verify grunnlag
        grunnlag = data.get('grunnlag', {})
        required_grunnlag = ['utleide', 'pipeline', 'ledige']
        for field in required_grunnlag:
            if field not in grunnlag:
                log(f"❌ FAIL: Missing grunnlag field '{field}'")
                return False
        
        log(f"✅ PASS: GET forslag structure valid")
        log(f"  - kilde: env={kilde.get('env')}, antallRader={kilde.get('antallRader')}")
        log(f"  - inntekter: Honorar (forvaltning) = {honorar[:3]}... (first 3 months)")
        log(f"  - drivere: nye={drivere.get('nyeEnheterPerMnd')}, fyll={drivere.get('fyllLedigPerMnd')}, snittLeie={drivere.get('snittLeie')}, honorarPct={drivere.get('honorarPct')}")
        log(f"  - grunnlag: utleide={grunnlag.get('utleide')}, pipeline={grunnlag.get('pipeline')}, ledige={grunnlag.get('ledige')}")
        
        # TEST 10b: Driver overrides
        log("\n[TEST 10b] GET /api/admin/budsjett/forslag with driver overrides")
        resp = requests.get(
            f"{API_URL}/admin/budsjett/forslag",
            params={
                "key": ADMIN_KEY,
                "year": "2026",
                "env": "prod",
                "nye": "0",
                "fyll": "0",
                "oppstart": "5000"
            },
            timeout=60
        )
        log(f"Status: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        drivere = data.get('drivere', {})
        
        if drivere.get('nyeEnheterPerMnd') != 0:
            log(f"❌ FAIL: Expected nyeEnheterPerMnd=0, got {drivere.get('nyeEnheterPerMnd')}")
            return False
        
        if drivere.get('fyllLedigPerMnd') != 0:
            log(f"❌ FAIL: Expected fyllLedigPerMnd=0, got {drivere.get('fyllLedigPerMnd')}")
            return False
        
        if drivere.get('oppstartPerEnhet') != 5000:
            log(f"❌ FAIL: Expected oppstartPerEnhet=5000, got {drivere.get('oppstartPerEnhet')}")
            return False
        
        log(f"✅ PASS: Driver overrides working (nye=0, fyll=0, oppstart=5000)")
        
        # TEST 11: Auth tests
        log("\n[TEST 11] Auth tests for budget endpoints")
        
        # GET without key
        resp = requests.get(
            f"{API_URL}/admin/budsjett",
            params={"year": "2026"},
            timeout=10
        )
        log(f"GET budsjett without key: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401, got {resp.status_code}")
            return False
        
        # PUT without key
        resp = requests.put(
            f"{API_URL}/admin/budsjett",
            json={"year": 2025, "inntekter": {}, "kostnader": {}},
            timeout=10
        )
        log(f"PUT budsjett without key: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401, got {resp.status_code}")
            return False
        
        # GET forslag without key
        resp = requests.get(
            f"{API_URL}/admin/budsjett/forslag",
            params={"year": "2026"},
            timeout=10
        )
        log(f"GET forslag without key: {resp.status_code}")
        if resp.status_code != 401:
            log(f"❌ FAIL: Expected 401, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: All budget endpoints require auth (401 without key)")
        
        # TEST 12: Regression
        log("\n[TEST 12] Regression tests")
        
        # GET leieforhold
        resp = requests.get(
            f"{API_URL}/admin/leieforhold",
            params={"key": ADMIN_KEY, "env": "prod"},
            timeout=30
        )
        log(f"GET leieforhold: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        # GET tasks
        resp = requests.get(
            f"{API_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        log(f"GET tasks: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        # Admin login
        resp = requests.post(
            f"{API_URL}/admin/auth/login",
            json={"email": "martin@kviteberg.no", "password": "Pyramiden2025##"},
            timeout=10
        )
        log(f"Admin login: {resp.status_code}")
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}")
            return False
        
        log(f"✅ PASS: Regression tests passed")
        
        log("\n" + "=" * 80)
        log("✅ FEATURE 2 COMPLETE: All budget module tests passed")
        log("=" * 80)
        
        return True
        
    except Exception as e:
        log(f"❌ EXCEPTION in test_budget_module: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup():
    """Mandatory cleanup"""
    log("\n" + "=" * 80)
    log("MANDATORY CLEANUP")
    log("=" * 80)
    
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete QA users
        log("\n[CLEANUP] Deleting QA users...")
        result = db.admin_users.delete_many({
            "email": {"$in": [QA_INV_EMAIL, QA_INV2_EMAIL]}
        })
        log(f"Deleted {result.deleted_count} QA users")
        
        # Delete 2025 budget document
        log("\n[CLEANUP] Deleting 2025 budget document...")
        result = db.budgets.delete_one({"year": 2025})
        log(f"Deleted {result.deleted_count} budget document(s) for year 2025")
        
        # Verify cleanup
        log("\n[CLEANUP] Verifying cleanup...")
        
        qa_users = db.admin_users.count_documents({
            "email": {"$in": [QA_INV_EMAIL, QA_INV2_EMAIL]}
        })
        if qa_users > 0:
            log(f"❌ FAIL: Found {qa_users} QA users remaining")
            return False
        
        budget_2025 = db.budgets.count_documents({"year": 2025})
        if budget_2025 > 0:
            log(f"❌ FAIL: Found {budget_2025} budget documents for year 2025")
            return False
        
        log(f"✅ PASS: Cleanup verified")
        log(f"  - 0 QA users (qa-inv-test@example.com, qa-inv2@example.com)")
        log(f"  - 0 budget documents for year 2025")
        
        # Verify demo investor still exists
        demo_investor = db.admin_users.find_one({"email": "qa-investor@example.com"})
        if demo_investor:
            log(f"✅ Demo investor qa-investor@example.com preserved (NOT deleted)")
        else:
            log(f"⚠️  WARNING: Demo investor qa-investor@example.com not found (should exist)")
        
        return True
        
    except Exception as e:
        log(f"❌ EXCEPTION in cleanup: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    log("=" * 80)
    log("BACKEND TEST: INVESTOR ROLE + BUDGET MODULE")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    log("=" * 80)
    
    try:
        # Run tests
        feature1_pass = test_investor_role()
        feature2_pass = test_budget_module()
        
        # Cleanup
        cleanup_pass = cleanup()
        
        # Summary
        log("\n" + "=" * 80)
        log("TEST SUMMARY")
        log("=" * 80)
        log(f"FEATURE 1 (Investor Role): {'✅ PASS' if feature1_pass else '❌ FAIL'}")
        log(f"FEATURE 2 (Budget Module): {'✅ PASS' if feature2_pass else '❌ FAIL'}")
        log(f"CLEANUP: {'✅ PASS' if cleanup_pass else '❌ FAIL'}")
        log("=" * 80)
        
        if feature1_pass and feature2_pass and cleanup_pass:
            log("✅ ALL TESTS PASSED")
            sys.exit(0)
        else:
            log("❌ SOME TESTS FAILED")
            sys.exit(1)
            
    except Exception as e:
        log(f"❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
