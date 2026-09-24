#!/usr/bin/env python3
"""
Backend test for FAKTURERING-modul: /api/admin/fakturering/* + DELETE poweroffice/utkast
Tests the new invoicing module endpoints with frozen billing basis and PowerOffice integration.

CRITICAL SAFETY RULES (PowerOffice DEMO is LIVE):
1. NEVER send tvang:true to POST /api/admin/pris/poweroffice/utkast
2. NEVER call DELETE /api/admin/pris/poweroffice/utkast with DigiHome AS's kundeId
3. POST /api/admin/fakturering/utkast-alle ONLY with maaned '2026-08' and ONLY while QA customers have status 'prove' or 'inaktiv'
4. POST /api/admin/fakturering/frys-alle ONLY with maaned '2026-07'
5. Never delete/modify the real customer DigiHome AS, the real plan 'Forvalter', or the real row in po_faktura_utkast
6. MANDATORY CLEANUP at the end: unlock 2026-07, delete QA customers
"""

import requests
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_customer_ids = []
digihome_customer_id = None
standard_plan_id = None

def log_test(step, description, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - STEP {step}: {description}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({"step": step, "description": description, "passed": passed, "details": details})
    if not passed:
        raise Exception(f"Test failed at step {step}: {description}")

def get_with_key(endpoint):
    """GET request with admin key"""
    url = f"{BASE_URL}{endpoint}"
    separator = '&' if '?' in endpoint else '?'
    return requests.get(f"{url}{separator}key={ADMIN_KEY}")

def post_with_key(endpoint, data):
    """POST request with admin key"""
    url = f"{BASE_URL}{endpoint}?key={ADMIN_KEY}"
    return requests.post(url, json=data)

def delete_with_key(endpoint):
    """DELETE request with admin key"""
    url = f"{BASE_URL}{endpoint}"
    separator = '&' if '?' in endpoint else '?'
    return requests.delete(f"{url}{separator}key={ADMIN_KEY}")

print("=" * 80)
print("FAKTURERING-MODUL BACKEND TEST")
print("=" * 80)
print()

try:
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    print(f"✓ Connected to MongoDB: {MONGO_URL}/{DB_NAME}\n")

    # ========== STEP 1: GET oversikt for 2026-08 ==========
    print("STEP 1: GET /api/admin/fakturering/oversikt?maaned=2026-08")
    print("-" * 80)
    
    resp = get_with_key("/admin/fakturering/oversikt?maaned=2026-08")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    # Verify structure
    assert data.get("ok") == True or "maaned" in data, "Response should have ok:true or maaned field"
    assert data["maaned"] == "2026-08", f"Expected maaned '2026-08', got {data.get('maaned')}"
    assert data.get("maanedAvsluttet") == True, "Expected maanedAvsluttet to be true for 2026-08"
    assert "per" in data and isinstance(data["per"], list), "Expected 'per' array"
    assert "sum" in data, "Expected 'sum' field"
    assert "po" in data, "Expected 'po' field"
    assert "settings" in data, "Expected 'settings' field"
    
    # Find DigiHome AS
    digihome = next((k for k in data["per"] if "DigiHome AS" in k.get("navn", "")), None)
    assert digihome is not None, "DigiHome AS not found in per array"
    digihome_customer_id = digihome["kundeId"]
    
    # Verify DigiHome AS data
    assert digihome["enhetskilde"] == "plattform", f"Expected enhetskilde 'plattform', got {digihome.get('enhetskilde')}"
    assert digihome["grunnlagType"] == "alle", f"Expected grunnlagType 'alle', got {digihome.get('grunnlagType')}"
    assert digihome["antallEnheter"] > 0, "Expected antallEnheter > 0"
    assert digihome.get("linjer", 0) > 0, "Expected linjer > 0"
    assert digihome["sumEksMva"] > 0, "Expected sumEksMva > 0"
    
    # Verify math: sumInkMva should be approximately sumEksMva * 1.25
    expected_ink = round(digihome["sumEksMva"] * 1.25)
    actual_ink = digihome["sumInkMva"]
    assert abs(actual_ink - expected_ink) <= 1, f"sumInkMva math error: expected ~{expected_ink}, got {actual_ink}"
    
    # Verify utkast exists
    assert digihome.get("utkast") is not None, "Expected utkast to exist for DigiHome AS"
    assert digihome["utkast"]["env"] == "demo", f"Expected env 'demo', got {digihome['utkast'].get('env')}"
    assert digihome["utkast"]["sumEksMva"] == 3600, f"Expected utkast sumEksMva 3600, got {digihome['utkast'].get('sumEksMva')}"
    
    # Verify klar flags
    assert digihome.get("klar", {}).get("orgnr") == False, "Expected klar.orgnr to be false"
    assert digihome.get("klar", {}).get("epost") == False, "Expected klar.epost to be false"
    
    # Verify PowerOffice config
    assert data["po"]["konfigurert"] == True, "Expected po.konfigurert to be true"
    assert isinstance(data["po"]["selskaper"], list), "Expected po.selskaper to be array"
    for selskap in data["po"]["selskaper"]:
        assert "clientKey" not in selskap, "clientKey should NOT be exposed in selskaper array"
    
    # Verify settings
    assert "fakturadag" in data["settings"], "Expected settings.fakturadag"
    
    log_test("1", "GET oversikt for 2026-08", True, 
             f"DigiHome AS found with {digihome['antallEnheter']} units, sumEksMva {digihome['sumEksMva']}, utkast exists with sumEksMva 3600")
    
    # Test auth
    resp_no_auth = requests.get(f"{BASE_URL}/admin/fakturering/oversikt?maaned=2026-08")
    assert resp_no_auth.status_code == 401, f"Expected 401 without key, got {resp_no_auth.status_code}"
    
    # Test default maaned (previous month)
    resp_default = get_with_key("/admin/fakturering/oversikt")
    assert resp_default.status_code == 200, "Expected 200 for default maaned"
    default_data = resp_default.json()
    # Should be previous month (not 2026-08)
    print(f"    Default maaned: {default_data.get('maaned')}")
    
    print()

    # ========== STEP 2: Create QA customers ==========
    print("STEP 2: Create 3 QA customers (K1: prove 10 units, K2: prove 0 units, K3: inaktiv 7 units)")
    print("-" * 80)
    
    # Get standard plan ID
    resp = get_with_key("/admin/pris/data")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    pris_data = resp.json()
    standard_plan = next((p for p in pris_data.get("planer", []) if p.get("standard") == True), None)
    assert standard_plan is not None, "Standard plan not found"
    standard_plan_id = standard_plan["id"]
    print(f"    Standard plan ID: {standard_plan_id} (navn: {standard_plan.get('navn')})")
    
    # Create K1: QA Fakt Prove 10
    resp = post_with_key("/admin/pris/kunder", {
        "navn": "QA Fakt Prove 10",
        "enhetskilde": "manuell",
        "manueltAntall": 10,
        "status": "prove",
        "orgnr": "999888777",
        "planId": standard_plan_id
    })
    assert resp.status_code == 200, f"Expected 200 for K1, got {resp.status_code}"
    k1_data = resp.json()
    assert k1_data.get("ok") == True, "Expected ok:true for K1"
    k1_id = k1_data["kunde"]["id"]
    qa_customer_ids.append(k1_id)
    print(f"    ✓ K1 created: {k1_id}")
    
    # Create K2: QA Fakt Prove 0
    resp = post_with_key("/admin/pris/kunder", {
        "navn": "QA Fakt Prove 0",
        "enhetskilde": "manuell",
        "manueltAntall": 0,
        "status": "prove",
        "planId": standard_plan_id
    })
    assert resp.status_code == 200, f"Expected 200 for K2, got {resp.status_code}"
    k2_data = resp.json()
    k2_id = k2_data["kunde"]["id"]
    qa_customer_ids.append(k2_id)
    print(f"    ✓ K2 created: {k2_id}")
    
    # Create K3: QA Fakt Inaktiv
    resp = post_with_key("/admin/pris/kunder", {
        "navn": "QA Fakt Inaktiv",
        "enhetskilde": "manuell",
        "manueltAntall": 7,
        "status": "inaktiv",
        "planId": standard_plan_id
    })
    assert resp.status_code == 200, f"Expected 200 for K3, got {resp.status_code}"
    k3_data = resp.json()
    k3_id = k3_data["kunde"]["id"]
    qa_customer_ids.append(k3_id)
    print(f"    ✓ K3 created: {k3_id}")
    
    log_test("2", "Create 3 QA customers", True, f"K1: {k1_id}, K2: {k2_id}, K3: {k3_id}")
    print()

    # ========== STEP 3: Verify oversikt with QA customers ==========
    print("STEP 3: GET oversikt?maaned=2026-08 with QA customers")
    print("-" * 80)
    
    resp = get_with_key("/admin/fakturering/oversikt?maaned=2026-08")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    # Should have 4 rows (DigiHome AS + 3 QA)
    assert len(data["per"]) == 4, f"Expected 4 rows, got {len(data['per'])}"
    
    # Find K1
    k1 = next((k for k in data["per"] if k["kundeId"] == k1_id), None)
    assert k1 is not None, "K1 not found"
    assert k1["antallEnheter"] == 10, f"Expected K1 antallEnheter 10, got {k1['antallEnheter']}"
    assert k1["sumEksMva"] == 2000, f"Expected K1 sumEksMva 2000, got {k1['sumEksMva']}"
    assert k1["klar"]["orgnr"] == True, "Expected K1 klar.orgnr true"
    assert k1["klar"]["epost"] == False, "Expected K1 klar.epost false"
    assert k1.get("laast") is None, "Expected K1 laast to be null"
    assert k1.get("utkast") is None, "Expected K1 utkast to be null"
    
    # Find K2
    k2 = next((k for k in data["per"] if k["kundeId"] == k2_id), None)
    assert k2 is not None, "K2 not found"
    assert k2["antallEnheter"] == 0, f"Expected K2 antallEnheter 0, got {k2['antallEnheter']}"
    assert k2.get("linjer", 0) == 0, f"Expected K2 linjer 0, got {k2.get('linjer')}"
    
    # Find K3
    k3 = next((k for k in data["per"] if k["kundeId"] == k3_id), None)
    assert k3 is not None, "K3 not found"
    assert k3["status"] == "inaktiv", f"Expected K3 status 'inaktiv', got {k3.get('status')}"
    
    # Verify sum (should NOT include K3 since it's inaktiv)
    # sum.eks should be DigiHome AS + K1 (not K2 with 0 units, not K3 inaktiv)
    digihome_eks = next((k["sumEksMva"] for k in data["per"] if k["kundeId"] == digihome_customer_id), 0)
    expected_sum = digihome_eks + 2000  # DigiHome + K1
    assert data["sum"]["eks"] == expected_sum, f"Expected sum.eks {expected_sum}, got {data['sum']['eks']}"
    
    log_test("3", "Verify oversikt with QA customers", True,
             f"K1: 10 units, 2000 eks; K2: 0 units; K3: inaktiv; sum.eks = {data['sum']['eks']}")
    print()

    # ========== STEP 4: POST frys-alle for 2026-07 ==========
    print("STEP 4: POST /api/admin/fakturering/frys-alle {maaned:'2026-07'}")
    print("-" * 80)
    
    resp = post_with_key("/admin/fakturering/frys-alle", {"maaned": "2026-07"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data.get("ok") == True, "Expected ok:true"
    assert data["maaned"] == "2026-07", f"Expected maaned '2026-07', got {data.get('maaned')}"
    assert "resultat" in data, "Expected resultat array"
    assert "frosset" in data, "Expected frosset count"
    
    # Find DigiHome AS in resultat
    digihome_result = next((r for r in data["resultat"] if r["kundeId"] == digihome_customer_id), None)
    assert digihome_result is not None, "DigiHome AS not in resultat"
    assert digihome_result["ok"] == True, "Expected DigiHome AS ok:true"
    digihome_already_locked = digihome_result.get("alleredeLaast", False)
    print(f"    DigiHome AS: ok={digihome_result['ok']}, alleredeLaast={digihome_already_locked}")
    
    # Find K1 in resultat
    k1_result = next((r for r in data["resultat"] if r["kundeId"] == k1_id), None)
    assert k1_result is not None, "K1 not in resultat"
    assert k1_result["ok"] == True, "Expected K1 ok:true"
    assert k1_result.get("alleredeLaast") == False, "Expected K1 alleredeLaast:false on first call"
    assert k1_result["sumEksMva"] == 2000, f"Expected K1 sumEksMva 2000, got {k1_result.get('sumEksMva')}"
    print(f"    K1: ok={k1_result['ok']}, alleredeLaast={k1_result.get('alleredeLaast')}, sumEksMva={k1_result.get('sumEksMva')}")
    
    # Find K2 in resultat
    k2_result = next((r for r in data["resultat"] if r["kundeId"] == k2_id), None)
    assert k2_result is not None, "K2 not in resultat"
    assert k2_result["ok"] == False, "Expected K2 ok:false (no billable units)"
    assert "Ingen fakturerbare enheter" in k2_result.get("feil", ""), f"Expected 'Ingen fakturerbare enheter' error, got {k2_result.get('feil')}"
    print(f"    K2: ok={k2_result['ok']}, feil={k2_result.get('feil')}")
    
    # K3 should NOT be in resultat (inaktiv)
    k3_result = next((r for r in data["resultat"] if r["kundeId"] == k3_id), None)
    assert k3_result is None, "K3 should NOT be in resultat (inaktiv)"
    print(f"    K3: not in resultat (inaktiv) ✓")
    
    # Verify frosset count
    expected_frosset = 1 if digihome_already_locked else 2  # K1 + DigiHome (if not already locked)
    assert data["frosset"] == expected_frosset, f"Expected frosset {expected_frosset}, got {data['frosset']}"
    
    # Call again to test idempotency
    print("    Testing idempotency (calling again)...")
    resp2 = post_with_key("/admin/fakturering/frys-alle", {"maaned": "2026-07"})
    assert resp2.status_code == 200, f"Expected 200 on second call, got {resp2.status_code}"
    data2 = resp2.json()
    
    # All should have alleredeLaast:true now
    for r in data2["resultat"]:
        if r["ok"]:
            assert r.get("alleredeLaast") == True, f"Expected alleredeLaast:true for {r['navn']}, got {r.get('alleredeLaast')}"
    assert data2["frosset"] == 0, f"Expected frosset 0 on second call, got {data2['frosset']}"
    print(f"    Idempotency verified: frosset=0, all have alleredeLaast:true")
    
    # Test current month rejection
    from datetime import datetime
    current_month = datetime.now().strftime("%Y-%m")
    resp_current = post_with_key("/admin/fakturering/frys-alle", {"maaned": current_month})
    assert resp_current.status_code == 400, f"Expected 400 for current month, got {resp_current.status_code}"
    print(f"    Current month ({current_month}) correctly rejected with 400")
    
    log_test("4", "POST frys-alle for 2026-07", True,
             f"Frozen: {expected_frosset} customers (K1 + DigiHome AS if not already locked), idempotency working, current month rejected")
    print()

    # ========== STEP 5: Verify oversikt shows laast for 2026-07 ==========
    print("STEP 5: GET oversikt?maaned=2026-07 to verify laast")
    print("-" * 80)
    
    resp = get_with_key("/admin/fakturering/oversikt?maaned=2026-07")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    # Find K1
    k1 = next((k for k in data["per"] if k["kundeId"] == k1_id), None)
    assert k1 is not None, "K1 not found"
    assert k1.get("laast") is not None, "Expected K1 laast to be set"
    assert "tid" in k1["laast"], "Expected laast.tid"
    assert k1["laast"]["av"] == "manuell", f"Expected laast.av 'manuell', got {k1['laast'].get('av')}"
    print(f"    K1 laast: tid={k1['laast']['tid']}, av={k1['laast']['av']}")
    
    # Find DigiHome AS
    digihome = next((k for k in data["per"] if k["kundeId"] == digihome_customer_id), None)
    assert digihome is not None, "DigiHome AS not found"
    assert digihome.get("laast") is not None, "Expected DigiHome AS laast to be set"
    print(f"    DigiHome AS laast: tid={digihome['laast']['tid']}, av={digihome['laast']['av']}")
    
    # Verify laaste count
    assert data.get("laaste", 0) == 2, f"Expected laaste 2, got {data.get('laaste')}"
    
    log_test("5", "Verify oversikt shows laast for 2026-07", True,
             f"K1 and DigiHome AS both have laast set, laaste count = 2")
    print()

    # ========== STEP 6: GET fakturaer ==========
    print("STEP 6: GET /api/admin/fakturering/fakturaer")
    print("-" * 80)
    
    resp = get_with_key("/admin/fakturering/fakturaer")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data.get("ok") == True, "Expected ok:true"
    assert "aarListe" in data, "Expected aarListe"
    assert "2026" in data["aarListe"], "Expected '2026' in aarListe"
    assert "fakturaer" in data, "Expected fakturaer array"
    
    # Find K1 2026-07 row
    k1_row = next((f for f in data["fakturaer"] if f["kundeId"] == k1_id and f["maaned"] == "2026-07"), None)
    assert k1_row is not None, "K1 2026-07 row not found"
    assert k1_row.get("laast") is not None, "Expected K1 laast"
    assert k1_row["sumEksMva"] == 2000, f"Expected K1 sumEksMva 2000, got {k1_row['sumEksMva']}"
    assert k1_row["planNavn"] == "Forvalter", f"Expected planNavn 'Forvalter', got {k1_row.get('planNavn')}"
    print(f"    K1 2026-07: laast={k1_row['laast'] is not None}, sumEksMva={k1_row['sumEksMva']}, planNavn={k1_row['planNavn']}")
    
    # Find DigiHome AS 2026-07 row
    digihome_07_row = next((f for f in data["fakturaer"] if f["kundeId"] == digihome_customer_id and f["maaned"] == "2026-07"), None)
    assert digihome_07_row is not None, "DigiHome AS 2026-07 row not found"
    assert digihome_07_row.get("laast") is not None, "Expected DigiHome AS 2026-07 laast"
    print(f"    DigiHome AS 2026-07: laast={digihome_07_row['laast'] is not None}")
    
    # Find DigiHome AS 2026-08 row
    digihome_08_row = next((f for f in data["fakturaer"] if f["kundeId"] == digihome_customer_id and f["maaned"] == "2026-08"), None)
    assert digihome_08_row is not None, "DigiHome AS 2026-08 row not found"
    assert digihome_08_row.get("utkast") is not None, "Expected DigiHome AS 2026-08 utkast"
    assert digihome_08_row["utkast"]["env"] == "demo", f"Expected env 'demo', got {digihome_08_row['utkast'].get('env')}"
    # poOrderNo can be null or a string
    print(f"    DigiHome AS 2026-08: utkast.env={digihome_08_row['utkast']['env']}, poOrderNo={digihome_08_row['utkast'].get('poOrderNo')}")
    
    # Verify sort order (newest month first)
    if len(data["fakturaer"]) >= 2:
        assert data["fakturaer"][0]["maaned"] >= data["fakturaer"][1]["maaned"], "Expected fakturaer sorted by maaned desc"
    
    # Test with aar filter
    resp_2026 = get_with_key("/admin/fakturering/fakturaer?aar=2026")
    assert resp_2026.status_code == 200, "Expected 200 for aar=2026"
    data_2026 = resp_2026.json()
    assert data_2026["aar"] == "2026", "Expected aar '2026'"
    # Should have same fakturaer as unfiltered (all are 2026)
    
    resp_2019 = get_with_key("/admin/fakturering/fakturaer?aar=2019")
    assert resp_2019.status_code == 200, "Expected 200 for aar=2019"
    data_2019 = resp_2019.json()
    assert data_2019["fakturaer"] == [], "Expected empty fakturaer for 2019"
    # aarListe is derived from fakturaer, so when filtering by 2019 (no data), it may be empty or contain all years
    print(f"    aar=2019 filter: fakturaer=[], aarListe={data_2019['aarListe']}")
    
    # Test auth
    resp_no_auth = requests.get(f"{BASE_URL}/admin/fakturering/fakturaer")
    assert resp_no_auth.status_code == 401, f"Expected 401 without key, got {resp_no_auth.status_code}"
    
    log_test("6", "GET fakturaer", True,
             f"Found K1 2026-07 (laast), DigiHome AS 2026-07 (laast), DigiHome AS 2026-08 (utkast), sorted correctly")
    print()

    # ========== STEP 7: POST utkast-alle for 2026-08 ==========
    print("STEP 7: POST /api/admin/fakturering/utkast-alle {maaned:'2026-08'}")
    print("-" * 80)
    print("    SAFETY: QA customers have status 'prove' or 'inaktiv', so only DigiHome AS (aktiv) will be processed")
    
    resp = post_with_key("/admin/fakturering/utkast-alle", {"maaned": "2026-08"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data.get("ok") == True, "Expected ok:true"
    assert data["maaned"] == "2026-08", f"Expected maaned '2026-08', got {data.get('maaned')}"
    assert "resultat" in data, "Expected resultat array"
    
    # Should ONLY have DigiHome AS (aktiv), not K1/K2/K3 (prove/inaktiv)
    assert len(data["resultat"]) == 1, f"Expected 1 result (only DigiHome AS), got {len(data['resultat'])}"
    
    digihome_result = data["resultat"][0]
    assert digihome_result["kundeId"] == digihome_customer_id, "Expected DigiHome AS in resultat"
    assert digihome_result["ok"] == True, "Expected DigiHome AS ok:true"
    assert digihome_result.get("alleredeOpprettet") == True, "Expected alleredeOpprettet:true (utkast already exists)"
    
    assert data["opprettet"] == 0, f"Expected opprettet 0 (already existed), got {data['opprettet']}"
    assert data["feilet"] == 0, f"Expected feilet 0, got {data['feilet']}"
    
    print(f"    DigiHome AS: ok={digihome_result['ok']}, alleredeOpprettet={digihome_result.get('alleredeOpprettet')}")
    print(f"    K1/K2/K3 NOT in resultat (prove/inaktiv) ✓")
    
    log_test("7", "POST utkast-alle for 2026-08", True,
             f"Only DigiHome AS processed (aktiv), alleredeOpprettet:true, opprettet=0, feilet=0")
    print()

    # ========== STEP 8: DELETE poweroffice/utkast with unknown kundeId ==========
    print("STEP 8: DELETE /api/admin/pris/poweroffice/utkast with unknown kundeId")
    print("-" * 80)
    
    resp = delete_with_key("/admin/pris/poweroffice/utkast?kundeId=finnes-ikke&maaned=2026-08")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    data = resp.json()
    assert data.get("ok") == False, "Expected ok:false"
    print(f"    Unknown kundeId correctly returned 404: {data.get('feil')}")
    
    # Test auth
    resp_no_auth = requests.delete(f"{BASE_URL}/admin/pris/poweroffice/utkast?kundeId=finnes-ikke&maaned=2026-08")
    assert resp_no_auth.status_code == 401, f"Expected 401 without key, got {resp_no_auth.status_code}"
    
    print("    SAFETY: NOT calling DELETE with DigiHome AS kundeId (as per safety rules)")
    
    log_test("8", "DELETE poweroffice/utkast with unknown kundeId", True,
             "404 returned for unknown kundeId, auth working")
    print()

    # ========== STEP 9: POST poweroffice/utkast without tvang (idempotency) ==========
    print("STEP 9: POST /api/admin/pris/poweroffice/utkast for DigiHome AS 2026-08 WITHOUT tvang")
    print("-" * 80)
    print("    SAFETY: NOT sending tvang:true (as per safety rules)")
    
    resp = post_with_key("/admin/pris/poweroffice/utkast", {
        "kundeId": digihome_customer_id,
        "maaned": "2026-08"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data.get("ok") == True, "Expected ok:true"
    assert data.get("alleredeOpprettet") == True, "Expected alleredeOpprettet:true (idempotent)"
    print(f"    Idempotency working: alleredeOpprettet={data.get('alleredeOpprettet')}")
    
    log_test("9", "POST poweroffice/utkast without tvang (idempotency)", True,
             "alleredeOpprettet:true, no PowerOffice call made")
    print()

    # ========== STEP 10: GET regnskap/selskaper (verify no clientKey) ==========
    print("STEP 10: GET /api/admin/regnskap/selskaper")
    print("-" * 80)
    
    resp = get_with_key("/admin/regnskap/selskaper")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    
    assert data.get("ok") == True, "Expected ok:true"
    assert "selskaper" in data, "Expected selskaper array"
    
    for selskap in data["selskaper"]:
        assert "clientKey" not in selskap, f"clientKey should NOT be exposed for {selskap.get('navn')}"
        # Should have klientNokkelMaske instead
        if "klientNokkelMaske" in selskap:
            print(f"    {selskap.get('navn')}: klientNokkelMaske={selskap['klientNokkelMaske']} (clientKey NOT exposed) ✓")
    
    log_test("10", "GET regnskap/selskaper", True,
             "clientKey NOT exposed in selskaper array")
    print()

    # ========== STEP Z: MANDATORY CLEANUP ==========
    print("=" * 80)
    print("STEP Z: MANDATORY CLEANUP")
    print("=" * 80)
    
    # Z1: Unlock 2026-07 for K1
    print("Z1: Unlock 2026-07 for K1...")
    resp = delete_with_key(f"/admin/pris/grunnlag/laas?kundeId={k1_id}&maaned=2026-07")
    assert resp.status_code == 200, f"Expected 200 for K1 unlock, got {resp.status_code}"
    print(f"    ✓ K1 2026-07 unlocked")
    
    # Z2: Unlock 2026-07 for DigiHome AS
    print("Z2: Unlock 2026-07 for DigiHome AS...")
    print("    SAFETY: DigiHome AS has no PowerOffice utkast for 2026-07, so no 409 expected")
    resp = delete_with_key(f"/admin/pris/grunnlag/laas?kundeId={digihome_customer_id}&maaned=2026-07")
    assert resp.status_code == 200, f"Expected 200 for DigiHome AS unlock, got {resp.status_code}"
    print(f"    ✓ DigiHome AS 2026-07 unlocked")
    
    # Z3: Delete QA customers
    print("Z3: Delete QA customers...")
    for qa_id in qa_customer_ids:
        resp = delete_with_key(f"/admin/pris/kunder?id={qa_id}")
        assert resp.status_code == 200, f"Expected 200 for customer delete, got {resp.status_code}"
        print(f"    ✓ Deleted customer {qa_id}")
    
    # Z4: Verify MongoDB state
    print("Z4: Verify MongoDB state...")
    
    # pris_kunder should have exactly 1 doc (DigiHome AS)
    kunder_count = db.pris_kunder.count_documents({})
    assert kunder_count == 1, f"Expected 1 kunde (DigiHome AS), got {kunder_count}"
    print(f"    ✓ pris_kunder: {kunder_count} document (DigiHome AS)")
    
    # pris_grunnlag_laast should have 0 rows for maaned 2026-07
    laast_2026_07_count = db.pris_grunnlag_laast.count_documents({"maaned": "2026-07"})
    assert laast_2026_07_count == 0, f"Expected 0 laast rows for 2026-07, got {laast_2026_07_count}"
    print(f"    ✓ pris_grunnlag_laast: {laast_2026_07_count} rows for 2026-07")
    
    # po_faktura_utkast should still have exactly 1 row (DigiHome AS 2026-08)
    utkast_count = db.po_faktura_utkast.count_documents({})
    assert utkast_count == 1, f"Expected 1 utkast (DigiHome AS 2026-08), got {utkast_count}"
    utkast_doc = db.po_faktura_utkast.find_one({})
    assert utkast_doc["kundeId"] == digihome_customer_id, "Expected utkast to be for DigiHome AS"
    assert utkast_doc["maaned"] == "2026-08", "Expected utkast maaned to be 2026-08"
    assert utkast_doc["sumEksMva"] == 3600, f"Expected utkast sumEksMva 3600, got {utkast_doc.get('sumEksMva')}"
    print(f"    ✓ po_faktura_utkast: {utkast_count} row (DigiHome AS 2026-08, sumEksMva 3600)")
    
    log_test("Z", "MANDATORY CLEANUP", True,
             "Unlocked 2026-07 for K1 and DigiHome AS, deleted 3 QA customers, verified MongoDB state")
    print()

    # ========== SUMMARY ==========
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    print(f"✅ ALL {total} TESTS PASSED ({passed}/{total})")
    print()
    print("VERIFIED:")
    print("  ✓ GET /api/admin/fakturering/oversikt with all fields and calculations")
    print("  ✓ POST /api/admin/fakturering/frys-alle with idempotency and current month rejection")
    print("  ✓ POST /api/admin/fakturering/utkast-alle (only aktiv customers processed)")
    print("  ✓ GET /api/admin/fakturering/fakturaer with sorting and year filter")
    print("  ✓ DELETE /api/admin/pris/poweroffice/utkast (404 for unknown)")
    print("  ✓ POST /api/admin/pris/poweroffice/utkast idempotency (alleredeOpprettet:true)")
    print("  ✓ GET /api/admin/regnskap/selskaper (clientKey NOT exposed)")
    print("  ✓ Auth working (401 without key)")
    print("  ✓ MANDATORY CLEANUP completed and verified")
    print()
    print("CRITICAL SAFETY RULES FOLLOWED:")
    print("  ✓ NEVER sent tvang:true to POST poweroffice/utkast")
    print("  ✓ NEVER called DELETE poweroffice/utkast with DigiHome AS kundeId")
    print("  ✓ utkast-alle ONLY called for 2026-08 with QA customers having status 'prove'")
    print("  ✓ frys-alle ONLY called for 2026-07")
    print("  ✓ Never deleted/modified real customer DigiHome AS or real plan Forvalter")
    print("  ✓ Real po_faktura_utkast row preserved (DigiHome AS 2026-08, sumEksMva 3600)")
    print()

except Exception as e:
    print(f"\n❌ TEST FAILED: {str(e)}\n")
    import traceback
    traceback.print_exc()
    
    # Attempt cleanup even on failure
    print("\n" + "=" * 80)
    print("ATTEMPTING CLEANUP AFTER FAILURE...")
    print("=" * 80)
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete QA customers
        for qa_id in qa_customer_ids:
            try:
                resp = delete_with_key(f"/admin/pris/kunder?id={qa_id}")
                print(f"  Deleted customer {qa_id}: {resp.status_code}")
            except:
                pass
        
        # Unlock 2026-07 for all QA customers
        for qa_id in qa_customer_ids:
            try:
                resp = delete_with_key(f"/admin/pris/grunnlag/laas?kundeId={qa_id}&maaned=2026-07")
                print(f"  Unlocked 2026-07 for {qa_id}: {resp.status_code}")
            except:
                pass
        
        # Unlock 2026-07 for DigiHome AS if we have the ID
        if digihome_customer_id:
            try:
                resp = delete_with_key(f"/admin/pris/grunnlag/laas?kundeId={digihome_customer_id}&maaned=2026-07")
                print(f"  Unlocked 2026-07 for DigiHome AS: {resp.status_code}")
            except:
                pass
        
        print("Cleanup attempt completed.")
    except:
        print("Cleanup failed.")
    
    exit(1)

print("=" * 80)
print("FAKTURERING-MODUL BACKEND TEST COMPLETE")
print("=" * 80)
