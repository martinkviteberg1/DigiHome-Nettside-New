#!/usr/bin/env python3
"""
Backend test for wizard catalog endpoints (priskalkulator).
Tests GET /api/wizard/catalog (public) and PUT /api/admin/wizard/catalog (admin).
"""

import asyncio
import aiohttp
import sys
import json
from datetime import datetime

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

# Expected default catalog structure
EXPECTED_DEFAULT = {
    "serviceLevels": [
        {"key": "selvbetjent", "pct": 5, "minMonthly": 500},
        {"key": "fullforvaltning", "pct": 10}
    ],
    "models": [
        {"key": "langtid"},
        {"key": "hybrid", "upliftPct": 25}
    ],
    "addons": [
        {"key": "markedspakke", "price": 4900},
        {"key": "foto", "price": 2900},
        {"key": "kredittsjekk", "price": 490},
        {"key": "innflytting", "price": 3900},
        {"key": "visningshjelp", "price": 1490, "for": "selvbetjent"},
        {"key": "juridisk", "price": 1990}
    ]
}

async def test_wizard_catalog():
    """Test wizard catalog endpoints according to test sequence."""
    print(f"\n{'='*80}")
    print("WIZARD CATALOG BACKEND TEST")
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print(f"{'='*80}\n")

    timeout = aiohttp.ClientTimeout(total=TIMEOUT)
    
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 1: GET /api/wizard/catalog (initial state, should be default)
            # ═══════════════════════════════════════════════════════════════
            print("TEST 1: GET /api/wizard/catalog (initial state)")
            print("-" * 80)
            
            try:
                async with session.get(f"{BASE_URL}/wizard/catalog") as resp:
                    status = resp.status
                    data = await resp.json()
                    
                    print(f"✓ Status: {status}")
                    
                    if status != 200:
                        print(f"❌ FAIL: Expected 200, got {status}")
                        return False
                    
                    if not data.get("ok"):
                        print(f"❌ FAIL: ok is not true: {data}")
                        return False
                    print(f"✓ ok: true")
                    
                    source = data.get("source")
                    print(f"✓ source: {source}")
                    
                    catalog = data.get("catalog")
                    if not catalog:
                        print(f"❌ FAIL: No catalog in response")
                        return False
                    
                    # Verify structure
                    if "serviceLevels" not in catalog:
                        print(f"❌ FAIL: Missing serviceLevels")
                        return False
                    print(f"✓ catalog.serviceLevels present ({len(catalog['serviceLevels'])} items)")
                    
                    if len(catalog["serviceLevels"]) != 2:
                        print(f"❌ FAIL: Expected 2 serviceLevels, got {len(catalog['serviceLevels'])}")
                        return False
                    
                    # Check selvbetjent
                    selvbetjent = next((s for s in catalog["serviceLevels"] if s.get("key") == "selvbetjent"), None)
                    if not selvbetjent:
                        print(f"❌ FAIL: selvbetjent not found")
                        return False
                    if selvbetjent.get("pct") != 5:
                        print(f"❌ FAIL: selvbetjent pct should be 5, got {selvbetjent.get('pct')}")
                        return False
                    if selvbetjent.get("minMonthly") != 500:
                        print(f"❌ FAIL: selvbetjent minMonthly should be 500, got {selvbetjent.get('minMonthly')}")
                        return False
                    print(f"✓ selvbetjent: pct=5, minMonthly=500")
                    
                    # Check fullforvaltning
                    fullforvaltning = next((s for s in catalog["serviceLevels"] if s.get("key") == "fullforvaltning"), None)
                    if not fullforvaltning:
                        print(f"❌ FAIL: fullforvaltning not found")
                        return False
                    if fullforvaltning.get("pct") != 10:
                        print(f"❌ FAIL: fullforvaltning pct should be 10, got {fullforvaltning.get('pct')}")
                        return False
                    print(f"✓ fullforvaltning: pct=10")
                    
                    # Check models
                    if "models" not in catalog:
                        print(f"❌ FAIL: Missing models")
                        return False
                    print(f"✓ catalog.models present ({len(catalog['models'])} items)")
                    
                    if len(catalog["models"]) != 2:
                        print(f"❌ FAIL: Expected 2 models, got {len(catalog['models'])}")
                        return False
                    
                    langtid = next((m for m in catalog["models"] if m.get("key") == "langtid"), None)
                    if not langtid:
                        print(f"❌ FAIL: langtid model not found")
                        return False
                    print(f"✓ langtid model present")
                    
                    hybrid = next((m for m in catalog["models"] if m.get("key") == "hybrid"), None)
                    if not hybrid:
                        print(f"❌ FAIL: hybrid model not found")
                        return False
                    if hybrid.get("upliftPct") != 25:
                        print(f"❌ FAIL: hybrid upliftPct should be 25, got {hybrid.get('upliftPct')}")
                        return False
                    print(f"✓ hybrid model: upliftPct=25")
                    
                    # Check addons
                    if "addons" not in catalog:
                        print(f"❌ FAIL: Missing addons")
                        return False
                    print(f"✓ catalog.addons present ({len(catalog['addons'])} items)")
                    
                    if len(catalog["addons"]) != 6:
                        print(f"❌ FAIL: Expected 6 addons, got {len(catalog['addons'])}")
                        return False
                    
                    markedspakke = next((a for a in catalog["addons"] if a.get("key") == "markedspakke"), None)
                    if not markedspakke:
                        print(f"❌ FAIL: markedspakke addon not found")
                        return False
                    if markedspakke.get("price") != 4900:
                        print(f"❌ FAIL: markedspakke price should be 4900, got {markedspakke.get('price')}")
                        return False
                    print(f"✓ markedspakke: price=4900")
                    
                    visningshjelp = next((a for a in catalog["addons"] if a.get("key") == "visningshjelp"), None)
                    if not visningshjelp:
                        print(f"❌ FAIL: visningshjelp addon not found")
                        return False
                    if visningshjelp.get("for") != "selvbetjent":
                        print(f"❌ FAIL: visningshjelp 'for' should be 'selvbetjent', got {visningshjelp.get('for')}")
                        return False
                    print(f"✓ visningshjelp: for='selvbetjent'")
                    
                    # Store original catalog for cleanup
                    original_catalog = catalog
                    
                    print(f"✅ TEST 1 PASSED: GET /wizard/catalog returns correct default structure\n")
                    
            except Exception as e:
                print(f"❌ TEST 1 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 2: PUT /api/admin/wizard/catalog WITHOUT key → 401
            # ═══════════════════════════════════════════════════════════════
            print("TEST 2: PUT /api/admin/wizard/catalog WITHOUT key → 401")
            print("-" * 80)
            
            try:
                test_catalog = {"catalog": original_catalog}
                async with session.put(
                    f"{BASE_URL}/admin/wizard/catalog",
                    json=test_catalog
                ) as resp:
                    status = resp.status
                    print(f"✓ Status: {status}")
                    
                    if status != 401:
                        print(f"❌ FAIL: Expected 401, got {status}")
                        return False
                    
                    print(f"✅ TEST 2 PASSED: PUT without key returns 401\n")
                    
            except Exception as e:
                print(f"❌ TEST 2 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 3: PUT /api/admin/wizard/catalog with key but empty body → 400
            # ═══════════════════════════════════════════════════════════════
            print("TEST 3: PUT /api/admin/wizard/catalog with key but empty body → 400")
            print("-" * 80)
            
            try:
                async with session.put(
                    f"{BASE_URL}/admin/wizard/catalog?key={ADMIN_KEY}",
                    json={}
                ) as resp:
                    status = resp.status
                    data = await resp.json()
                    print(f"✓ Status: {status}")
                    
                    if status != 400:
                        print(f"❌ FAIL: Expected 400, got {status}")
                        return False
                    
                    if "error" not in data:
                        print(f"❌ FAIL: Expected error message in response")
                        return False
                    print(f"✓ Error message: {data.get('error')}")
                    
                    print(f"✅ TEST 3 PASSED: PUT with empty body returns 400\n")
                    
            except Exception as e:
                print(f"❌ TEST 3 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 4: PUT /api/admin/wizard/catalog with modified catalog (markedspakke price 5900)
            # ═══════════════════════════════════════════════════════════════
            print("TEST 4: PUT /api/admin/wizard/catalog with modified catalog")
            print("-" * 80)
            
            try:
                # Modify markedspakke price to 5900
                modified_catalog = json.loads(json.dumps(original_catalog))  # Deep copy
                for addon in modified_catalog["addons"]:
                    if addon.get("key") == "markedspakke":
                        addon["price"] = 5900
                        break
                
                async with session.put(
                    f"{BASE_URL}/admin/wizard/catalog?key={ADMIN_KEY}",
                    json={"catalog": modified_catalog}
                ) as resp:
                    status = resp.status
                    data = await resp.json()
                    print(f"✓ Status: {status}")
                    
                    if status != 200:
                        print(f"❌ FAIL: Expected 200, got {status}")
                        return False
                    
                    if not data.get("ok"):
                        print(f"❌ FAIL: ok is not true: {data}")
                        return False
                    print(f"✓ ok: true")
                    
                    print(f"✅ TEST 4 PASSED: PUT with modified catalog returns 200\n")
                    
            except Exception as e:
                print(f"❌ TEST 4 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 5: GET /api/wizard/catalog again → source='db', markedspakke price=5900
            # ═══════════════════════════════════════════════════════════════
            print("TEST 5: GET /api/wizard/catalog (verify DB update)")
            print("-" * 80)
            
            try:
                async with session.get(f"{BASE_URL}/wizard/catalog") as resp:
                    status = resp.status
                    data = await resp.json()
                    
                    print(f"✓ Status: {status}")
                    
                    if status != 200:
                        print(f"❌ FAIL: Expected 200, got {status}")
                        return False
                    
                    if not data.get("ok"):
                        print(f"❌ FAIL: ok is not true: {data}")
                        return False
                    print(f"✓ ok: true")
                    
                    source = data.get("source")
                    if source != "db":
                        print(f"❌ FAIL: Expected source='db', got '{source}'")
                        return False
                    print(f"✓ source: 'db'")
                    
                    catalog = data.get("catalog")
                    if not catalog:
                        print(f"❌ FAIL: No catalog in response")
                        return False
                    
                    markedspakke = next((a for a in catalog["addons"] if a.get("key") == "markedspakke"), None)
                    if not markedspakke:
                        print(f"❌ FAIL: markedspakke addon not found")
                        return False
                    
                    if markedspakke.get("price") != 5900:
                        print(f"❌ FAIL: markedspakke price should be 5900, got {markedspakke.get('price')}")
                        return False
                    print(f"✓ markedspakke price: 5900 (updated)")
                    
                    print(f"✅ TEST 5 PASSED: GET returns updated catalog from DB\n")
                    
            except Exception as e:
                print(f"❌ TEST 5 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 6: CLEANUP - PUT back original catalog (markedspakke price 4900)
            # ═══════════════════════════════════════════════════════════════
            print("TEST 6: CLEANUP - Restore original catalog")
            print("-" * 80)
            
            try:
                async with session.put(
                    f"{BASE_URL}/admin/wizard/catalog?key={ADMIN_KEY}",
                    json={"catalog": original_catalog}
                ) as resp:
                    status = resp.status
                    data = await resp.json()
                    print(f"✓ Status: {status}")
                    
                    if status != 200:
                        print(f"❌ FAIL: Expected 200, got {status}")
                        return False
                    
                    if not data.get("ok"):
                        print(f"❌ FAIL: ok is not true: {data}")
                        return False
                    print(f"✓ ok: true")
                    
                    # Verify restoration
                    async with session.get(f"{BASE_URL}/wizard/catalog") as resp2:
                        data2 = await resp2.json()
                        catalog2 = data2.get("catalog")
                        markedspakke2 = next((a for a in catalog2["addons"] if a.get("key") == "markedspakke"), None)
                        
                        if markedspakke2.get("price") != 4900:
                            print(f"❌ FAIL: markedspakke price should be restored to 4900, got {markedspakke2.get('price')}")
                            return False
                        print(f"✓ markedspakke price: 4900 (restored)")
                        
                        source2 = data2.get("source")
                        print(f"✓ source: '{source2}' (will be 'db' after update, this is expected)")
                    
                    print(f"✅ TEST 6 PASSED: Original catalog restored\n")
                    
            except Exception as e:
                print(f"❌ TEST 6 FAILED: {e}\n")
                return False
            
            # ═══════════════════════════════════════════════════════════════
            # TEST 7: REGRESSION - POST /api/leads (verify leads endpoint still works)
            # ═══════════════════════════════════════════════════════════════
            print("TEST 7: REGRESSION - POST /api/leads")
            print("-" * 80)
            
            try:
                lead_data = {
                    "name": "Wizard Backend Test",
                    "email": "wizard-backend-test@digihome-test.no",
                    "source": "priskalkulator",
                    "rental_model": "selvbetjent:langtid",
                    "lead_type": "huseier",
                    "notes": "PRISKALKULATOR — Selvbetjent (5 %) · Langtid. Test."
                }
                
                async with session.post(
                    f"{BASE_URL}/leads",
                    json=lead_data
                ) as resp:
                    status = resp.status
                    data = await resp.json()
                    print(f"✓ Status: {status}")
                    
                    if status not in [200, 201]:
                        print(f"❌ FAIL: Expected 200/201, got {status}")
                        return False
                    
                    if not data.get("success"):
                        print(f"❌ FAIL: success is not true: {data}")
                        return False
                    print(f"✓ success: true")
                    
                    lead_id = None
                    if data.get("data") and data["data"].get("id"):
                        lead_id = data["data"]["id"]
                    elif data.get("lead") and data["lead"].get("id"):
                        lead_id = data["lead"]["id"]
                    
                    if not lead_id:
                        print(f"❌ FAIL: No id in response")
                        return False
                    print(f"✓ Lead ID: {lead_id}")
                    
                    print(f"✅ TEST 7 PASSED: POST /api/leads works correctly\n")
                    
            except Exception as e:
                print(f"❌ TEST 7 FAILED: {e}\n")
                return False
            
            print(f"\n{'='*80}")
            print("✅ ALL WIZARD CATALOG TESTS PASSED (7/7)")
            print(f"{'='*80}\n")
            return True
            
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_wizard_catalog())
    sys.exit(0 if result else 1)
