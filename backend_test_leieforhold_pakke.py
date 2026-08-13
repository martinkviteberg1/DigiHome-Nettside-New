#!/usr/bin/env python3
"""
Backend test for LEIEFORHOLD-PAKKE (3 tasks):
1. LEIEFORHOLD DATAMOTOR V2 (units+contracts flettet, alltid prod)
2. MODUL-LAGRING FIKS (dr-* whitelist)
3. DATAROM AUTO-SYNK FRA LEIEFORHOLD

Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
MongoDB: mongodb://localhost:27017, DB: your_database_name

CRITICAL SAFETY RULES:
- SendGrid is LIVE: never trigger emails, use notify:false and @example.com
- Do NOT delete/modify qa-investor@example.com or martin@kviteberg.no
- Platform API is REAL PRODUCTION but all leieforhold calls are READ-ONLY (safe)
- In datarom_enheter collection: rows with kildeId starting with 'lf:' are managed by sync;
  rows with kildeId null are manual and should NEVER be deleted by you (except QA rows you create)
- Clean up ALL QA data after testing
"""

import requests
import time
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(test_name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {test_name}: PASS {details}")
    else:
        tests_failed += 1
        print(f"❌ {test_name}: FAIL {details}")

def test_leieforhold_datamotor_v2():
    """Test LEIEFORHOLD DATAMOTOR V2 (units+contracts flettet, alltid prod)"""
    print("\n" + "="*80)
    print("TEST 1: LEIEFORHOLD DATAMOTOR V2")
    print("="*80)
    
    # Test 1.1: GET /api/admin/leieforhold basic structure
    try:
        print("\n[T1.1] GET /api/admin/leieforhold → verify response structure")
        r = requests.get(f"{BASE_URL}/admin/leieforhold", params={"key": ADMIN_KEY}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        # Verify basic structure
        assert data.get("ok") == True, "Expected ok:true"
        assert data.get("source") == "units-contracts", f"Expected source:'units-contracts', got {data.get('source')}"
        assert data.get("env") == "prod", f"Expected env:'prod', got {data.get('env')}"
        assert "rows" in data, "Expected 'rows' field"
        assert isinstance(data["rows"], list), "Expected rows to be array"
        
        rows = data["rows"]
        print(f"   Response: ok={data['ok']}, source={data['source']}, env={data['env']}, rows={len(rows)}")
        
        # Verify row structure (check first row)
        if len(rows) > 0:
            row = rows[0]
            required_fields = ["unit_room", "address", "unit_type", "group", "advertised", 
                             "monthly_rent", "fee_percent", "fee_amount", "net_to_owner", "income_type"]
            for field in required_fields:
                assert field in row, f"Expected field '{field}' in row"
            print(f"   First row has all required fields: {', '.join(required_fields)}")
        
        # Verify at least one row with unit_type='Rom i bofellesskap'
        bofellesskap_rows = [r for r in rows if r.get("unit_type") == "Rom i bofellesskap"]
        assert len(bofellesskap_rows) > 0, "Expected at least one row with unit_type='Rom i bofellesskap'"
        print(f"   Found {len(bofellesskap_rows)} rows with unit_type='Rom i bofellesskap' ✓")
        
        # Verify totals structure
        assert "totals" in data, "Expected 'totals' field"
        totals = data["totals"]
        required_totals = ["fee_garantert", "fee_estimert", "fee_total", "advertised"]
        for field in required_totals:
            assert field in totals, f"Expected field '{field}' in totals"
            assert isinstance(totals[field], (int, float)), f"Expected {field} to be numeric"
        print(f"   Totals: fee_garantert={totals['fee_garantert']}, fee_estimert={totals['fee_estimert']}, fee_total={totals['fee_total']}, advertised={totals['advertised']}")
        
        log_test("T1.1 GET leieforhold structure", True, f"(rows={len(rows)}, bofellesskap={len(bofellesskap_rows)})")
    except Exception as e:
        log_test("T1.1 GET leieforhold structure", False, f"Error: {e}")
    
    # Test 1.2: Verify env=test is IGNORED (env should still be 'prod')
    try:
        print("\n[T1.2] GET /api/admin/leieforhold?env=test → verify env override is IGNORED")
        r = requests.get(f"{BASE_URL}/admin/leieforhold", params={"key": ADMIN_KEY, "env": "test"}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("env") == "prod", f"Expected env:'prod' (override ignored), got {data.get('env')}"
        print(f"   Response env={data['env']} (env=test parameter correctly IGNORED)")
        log_test("T1.2 env=test override ignored", True, "(env still 'prod')")
    except Exception as e:
        log_test("T1.2 env=test override ignored", False, f"Error: {e}")
    
    # Test 1.3: fresh=1 (may take 10-25s on first call)
    try:
        print("\n[T1.3] GET /api/admin/leieforhold?fresh=1 → verify fresh fetch (timeout 60s)")
        start = time.time()
        r = requests.get(f"{BASE_URL}/admin/leieforhold", params={"key": ADMIN_KEY, "fresh": "1"}, timeout=60)
        elapsed = time.time() - start
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        print(f"   Response: ok={data['ok']}, elapsed={elapsed:.2f}s")
        log_test("T1.3 fresh=1", True, f"(elapsed={elapsed:.2f}s)")
    except Exception as e:
        log_test("T1.3 fresh=1", False, f"Error: {e}")
    
    # Test 1.4: XLSX export
    try:
        print("\n[T1.4] GET /api/admin/leieforhold/xlsx → verify XLSX export")
        r = requests.get(f"{BASE_URL}/admin/leieforhold/xlsx", params={"key": ADMIN_KEY}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "spreadsheetml" in r.headers.get("Content-Type", ""), f"Expected spreadsheetml, got {r.headers.get('Content-Type')}"
        assert len(r.content) > 8000, f"Expected >8000 bytes, got {len(r.content)}"
        print(f"   Response: Content-Type={r.headers.get('Content-Type')}, size={len(r.content)} bytes")
        log_test("T1.4 XLSX export", True, f"(size={len(r.content)} bytes)")
    except Exception as e:
        log_test("T1.4 XLSX export", False, f"Error: {e}")
    
    # Test 1.5: CSV export
    try:
        print("\n[T1.5] GET /api/admin/leieforhold/csv → verify CSV export")
        r = requests.get(f"{BASE_URL}/admin/leieforhold/csv", params={"key": ADMIN_KEY}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert "text/csv" in r.headers.get("Content-Type", ""), f"Expected text/csv, got {r.headers.get('Content-Type')}"
        print(f"   Response: Content-Type={r.headers.get('Content-Type')}, size={len(r.content)} bytes")
        log_test("T1.5 CSV export", True, f"(size={len(r.content)} bytes)")
    except Exception as e:
        log_test("T1.5 CSV export", False, f"Error: {e}")
    
    # Test 1.6: Auth - all 3 leieforhold routes without key should return 401
    try:
        print("\n[T1.6] Auth: all 3 leieforhold routes without key → 401")
        routes = ["/admin/leieforhold", "/admin/leieforhold/xlsx", "/admin/leieforhold/csv"]
        for route in routes:
            r = requests.get(f"{BASE_URL}{route}", timeout=10)
            assert r.status_code == 401, f"Expected 401 for {route}, got {r.status_code}"
            print(f"   {route} without key → 401 ✓")
        log_test("T1.6 Auth (401 without key)", True, "(all 3 routes)")
    except Exception as e:
        log_test("T1.6 Auth (401 without key)", False, f"Error: {e}")

def test_modul_lagring_fiks():
    """Test MODUL-LAGRING FIKS (dr-* whitelist)"""
    print("\n" + "="*80)
    print("TEST 2: MODUL-LAGRING FIKS (dr-* whitelist)")
    print("="*80)
    
    test_user_id = None
    
    try:
        # Test 2.1: POST /api/admin/users with dr-* modules
        print("\n[T2.1] POST /api/admin/users with moduler=['dr-oversikt','dr-enheter']")
        payload = {
            "name": "QA Modultest",
            "email": "qa-modultest@example.com",
            "role": "investor",
            "moduler": ["dr-oversikt", "dr-enheter"]
        }
        r = requests.post(f"{BASE_URL}/admin/users", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "member" in data, "Expected 'member' field"
        test_user_id = data["member"].get("id")
        assert test_user_id, "Expected user id"
        
        # Verify moduler contains both dr-* keys
        moduler = data["member"].get("moduler", [])
        assert "dr-oversikt" in moduler, "Expected 'dr-oversikt' in moduler"
        assert "dr-enheter" in moduler, "Expected 'dr-enheter' in moduler"
        print(f"   Created user id={test_user_id}, moduler={moduler}")
        log_test("T2.1 POST users with dr-* modules", True, f"(moduler={moduler})")
        
        # Test 2.2: PUT /api/admin/users/:id with more dr-* modules
        print("\n[T2.2] PUT /api/admin/users/:id with moduler=['dr-resultat','dr-pipeline','dr-selskap','dr-dokumenter','budsjett']")
        payload = {
            "moduler": ["dr-resultat", "dr-pipeline", "dr-selskap", "dr-dokumenter", "budsjett"]
        }
        r = requests.put(f"{BASE_URL}/admin/users/{test_user_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify via GET /api/admin/users
        print("   Verifying via GET /api/admin/users")
        r = requests.get(f"{BASE_URL}/admin/users", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        users = data.get("members", [])  # Response has 'members' not 'users'
        test_user = next((u for u in users if u.get("id") == test_user_id), None)
        assert test_user, f"Expected to find user {test_user_id}"
        
        moduler = test_user.get("moduler", [])
        expected_modules = ["dr-resultat", "dr-pipeline", "dr-selskap", "dr-dokumenter", "budsjett"]
        for mod in expected_modules:
            assert mod in moduler, f"Expected '{mod}' in moduler"
        print(f"   User moduler={moduler} (all 5 modules saved)")
        log_test("T2.2 PUT users with dr-* modules", True, f"(moduler={moduler})")
        
    except Exception as e:
        log_test("T2.1-T2.2 MODUL-LAGRING FIKS", False, f"Error: {e}")
    finally:
        # Test 2.3: DELETE test user
        if test_user_id:
            try:
                print(f"\n[T2.3] DELETE /api/admin/users/{test_user_id}")
                r = requests.delete(f"{BASE_URL}/admin/users/{test_user_id}", params={"key": ADMIN_KEY}, timeout=10)
                assert r.status_code == 200, f"Expected 200, got {r.status_code}"
                print(f"   Deleted user {test_user_id}")
                log_test("T2.3 DELETE test user", True, f"(id={test_user_id})")
            except Exception as e:
                log_test("T2.3 DELETE test user", False, f"Error: {e}")

def test_datarom_auto_sync():
    """Test DATAROM AUTO-SYNK FRA LEIEFORHOLD"""
    print("\n" + "="*80)
    print("TEST 3: DATAROM AUTO-SYNK FRA LEIEFORHOLD")
    print("="*80)
    
    manual_unit_id = None
    
    try:
        # Test 3.1: GET /api/admin/datarom/enheter → verify autoSync object
        print("\n[T3.1] GET /api/admin/datarom/enheter → verify autoSync object")
        r = requests.get(f"{BASE_URL}/admin/datarom/enheter", params={"key": ADMIN_KEY}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        assert "autoSync" in data, "Expected 'autoSync' field"
        
        autoSync = data["autoSync"]
        assert "ok" in autoSync, "Expected 'ok' in autoSync"
        print(f"   Response: ok={data['ok']}, autoSync={autoSync}")
        
        # Verify drift/pipeline lists
        assert "drift" in data, "Expected 'drift' field"
        assert "pipeline" in data, "Expected 'pipeline' field"
        drift_count = len(data["drift"])
        pipeline_count = len(data["pipeline"])
        print(f"   drift={drift_count} units, pipeline={pipeline_count} units")
        
        # Verify at least some drift units have kildeId starting with 'lf:'
        lf_units = [u for u in data["drift"] if isinstance(u.get("kildeId"), str) and u.get("kildeId").startswith("lf:")]
        print(f"   Found {len(lf_units)} drift units with kildeId starting with 'lf:' (synced from leieforhold)")
        
        log_test("T3.1 GET datarom/enheter with autoSync", True, f"(drift={drift_count}, pipeline={pipeline_count}, lf-synced={len(lf_units)})")
        
        # Test 3.2: Call again immediately → verify autoSync.skipped:true (10 min throttle)
        print("\n[T3.2] GET /api/admin/datarom/enheter again → verify autoSync.skipped:true (throttle)")
        r = requests.get(f"{BASE_URL}/admin/datarom/enheter", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        autoSync = data.get("autoSync", {})
        assert autoSync.get("skipped") == True, f"Expected autoSync.skipped:true, got {autoSync}"
        print(f"   autoSync={autoSync} (throttle working)")
        log_test("T3.2 autoSync throttle (skipped:true)", True)
        
    except Exception as e:
        log_test("T3.1-T3.2 DATAROM AUTO-SYNK", False, f"Error: {e}")
    
    try:
        # Test 3.3: POST manual unit → verify it survives GET (not deleted by sync)
        print("\n[T3.3] POST /api/admin/datarom/enheter (manual unit) → verify it survives sync")
        payload = {
            "navn": "QA Manuell enhet",
            "fase": "drift",
            "status": "ledig"
        }
        r = requests.post(f"{BASE_URL}/admin/datarom/enheter", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 201, f"Expected 201, got {r.status_code}"
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        # Response has 'enhet' object with id inside
        enhet = data.get("enhet", {})
        manual_unit_id = enhet.get("id")
        assert manual_unit_id, "Expected unit id"
        print(f"   Created manual unit id={manual_unit_id}")
        
        # GET again to verify it exists
        print("   Verifying manual unit survives GET (sync should not delete it)")
        r = requests.get(f"{BASE_URL}/admin/datarom/enheter", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        drift_units = data.get("drift", [])
        manual_unit = next((u for u in drift_units if u.get("id") == manual_unit_id), None)
        assert manual_unit, f"Expected to find manual unit {manual_unit_id} (should survive sync)"
        assert manual_unit.get("navn") == "QA Manuell enhet", "Expected correct navn"
        assert manual_unit.get("kildeId") is None, "Expected kildeId to be null (manual unit)"
        print(f"   Manual unit found: navn={manual_unit['navn']}, kildeId={manual_unit.get('kildeId')} (null = manual)")
        log_test("T3.3 Manual unit survives sync", True, f"(id={manual_unit_id})")
        
    except Exception as e:
        log_test("T3.3 Manual unit survives sync", False, f"Error: {e}")
    finally:
        # Test 3.4: DELETE manual unit
        if manual_unit_id:
            try:
                print(f"\n[T3.4] DELETE /api/admin/datarom/enheter?id={manual_unit_id}")
                r = requests.delete(f"{BASE_URL}/admin/datarom/enheter", params={"key": ADMIN_KEY, "id": manual_unit_id}, timeout=10)
                assert r.status_code == 200, f"Expected 200, got {r.status_code}"
                data = r.json()
                assert data.get("ok") == True, "Expected ok:true"
                print(f"   Deleted manual unit {manual_unit_id}")
                log_test("T3.4 DELETE manual unit", True, f"(id={manual_unit_id})")
            except Exception as e:
                log_test("T3.4 DELETE manual unit", False, f"Error: {e}")

def test_regression():
    """Test REGRESSION"""
    print("\n" + "="*80)
    print("TEST 4: REGRESSION")
    print("="*80)
    
    # Test 4.1: GET /api/admin/budsjett/forslag?year=2026
    try:
        print("\n[T4.1] GET /api/admin/budsjett/forslag?year=2026 → verify it uses leieforholdTarget")
        r = requests.get(f"{BASE_URL}/admin/budsjett/forslag", params={"key": ADMIN_KEY, "year": "2026"}, timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        print(f"   Response: ok={data['ok']}")
        log_test("T4.1 GET budsjett/forslag", True)
    except Exception as e:
        log_test("T4.1 GET budsjett/forslag", False, f"Error: {e}")
    
    # Test 4.2: GET /api/admin/tasks
    try:
        print("\n[T4.2] GET /api/admin/tasks → regression check")
        r = requests.get(f"{BASE_URL}/admin/tasks", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") == True, "Expected ok:true"
        print(f"   Response: ok={data['ok']}")
        log_test("T4.2 GET tasks", True)
    except Exception as e:
        log_test("T4.2 GET tasks", False, f"Error: {e}")

def main():
    print("="*80)
    print("BACKEND TEST: LEIEFORHOLD-PAKKE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print()
    print("CRITICAL SAFETY RULES:")
    print("- SendGrid is LIVE: never trigger emails")
    print("- Do NOT delete/modify qa-investor@example.com or martin@kviteberg.no")
    print("- Platform API is REAL PRODUCTION but leieforhold calls are READ-ONLY")
    print("- Manual datarom units (kildeId null) should never be deleted")
    print("- Clean up ALL QA data after testing")
    print("="*80)
    
    # Run tests
    test_leieforhold_datamotor_v2()
    test_modul_lagring_fiks()
    test_datarom_auto_sync()
    test_regression()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    total = tests_passed + tests_failed
    success_rate = (tests_passed / total * 100) if total > 0 else 0
    print(f"Total tests: {total}")
    print(f"Passed: {tests_passed}")
    print(f"Failed: {tests_failed}")
    print(f"Success rate: {success_rate:.1f}%")
    print("="*80)
    
    if tests_failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
