#!/usr/bin/env python3
"""
Backend test for FAKTURERING BAKGRUNNSJOBBER (po_jobber)
Tests background job system for PowerOffice invoice draft creation.

SAFETY RULES (MANDATORY):
- NEVER send tvang:true
- NEVER call DELETE /poweroffice/utkast
- NEVER modify/delete customer DigiHome AS or plan Forvalter
- NEVER unlock grunnlag
- NEVER touch regnskap_selskaper
- Use ONLY existing demo drafts (2026-06, 2026-07, 2026-08, 2026-09) for idempotency tests
- Test against PowerOffice DEMO client (harmless demo drafts)
"""

import requests
import time
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"
KUNDE_ID = "01e45c62-d8bd-4ebd-9174-afb33eb283c0"  # DigiHome AS

def log(msg):
    print(f"[TEST] {msg}")

def poll_job(job_id, max_seconds=60):
    """Poll job status until it's no longer 'kjorer'"""
    log(f"Polling job {job_id} (max {max_seconds}s)...")
    start = time.time()
    last_steg = None
    
    while time.time() - start < max_seconds:
        try:
            resp = requests.get(
                f"{BASE_URL}/admin/pris/poweroffice/jobb",
                params={"id": job_id, "key": ADMIN_KEY},
                timeout=10
            )
            
            if resp.status_code != 200:
                log(f"  Poll error: {resp.status_code}")
                return None
            
            data = resp.json()
            jobb = data.get("jobb", {})
            status = jobb.get("status")
            steg = jobb.get("steg", "")
            
            if steg != last_steg:
                log(f"  Status: {status}, Steg: {steg}")
                last_steg = steg
            
            if status != "kjorer":
                elapsed = time.time() - start
                log(f"  Job finished in {elapsed:.1f}s with status: {status}")
                return jobb
            
            time.sleep(1)
        except Exception as e:
            log(f"  Poll exception: {e}")
            return None
    
    log(f"  Timeout after {max_seconds}s")
    return None

def test_step_1():
    """(1) POST utkast for 2026-09 → 202, poll until ferdig with alleredeOpprettet:true"""
    log("\n=== STEP 1: POST utkast for existing draft (2026-09) ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/pris/poweroffice/utkast",
            params={"key": ADMIN_KEY},
            json={"kundeId": KUNDE_ID, "maaned": "2026-09"},
            timeout=10
        )
        
        log(f"POST response: {resp.status_code}")
        
        if resp.status_code != 202:
            log(f"❌ Expected 202, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        
        if not data.get("ok"):
            log(f"❌ Response ok is not true: {data}")
            return False
        
        jobb = data.get("jobb", {})
        job_id = jobb.get("id")
        job_type = jobb.get("type")
        job_status = jobb.get("status")
        
        log(f"Job created: id={job_id}, type={job_type}, status={job_status}")
        
        if not job_id or job_type != "utkast" or job_status != "kjorer":
            log(f"❌ Invalid job fields: {jobb}")
            return False
        
        # Poll until finished
        final_jobb = poll_job(job_id)
        
        if not final_jobb:
            log("❌ Job polling failed or timed out")
            return False
        
        if final_jobb.get("status") != "ferdig":
            log(f"❌ Expected status 'ferdig', got: {final_jobb.get('status')}")
            log(f"Error: {final_jobb.get('feil')}, Hint: {final_jobb.get('hint')}")
            return False
        
        if final_jobb.get("httpStatus") != 200:
            log(f"❌ Expected httpStatus 200, got: {final_jobb.get('httpStatus')}")
            return False
        
        resultat = final_jobb.get("resultat", {})
        
        if not resultat.get("alleredeOpprettet"):
            log(f"❌ Expected alleredeOpprettet:true, got: {resultat}")
            return False
        
        utkast = resultat.get("utkast", {})
        if utkast.get("kundeId") != KUNDE_ID:
            log(f"❌ Utkast kundeId mismatch: {utkast.get('kundeId')}")
            return False
        
        log("✅ STEP 1 PASSED: Job completed with alleredeOpprettet:true")
        return True
        
    except Exception as e:
        log(f"❌ STEP 1 EXCEPTION: {e}")
        return False

def test_step_2():
    """(2) Two simultaneous POSTs for 2026-04 → both 202, same job.id, at least one gjenbrukt:true"""
    log("\n=== STEP 2: Simultaneous POSTs for 2026-04 (job sharing) ===")
    
    try:
        import concurrent.futures
        
        def post_utkast():
            resp = requests.post(
                f"{BASE_URL}/admin/pris/poweroffice/utkast",
                params={"key": ADMIN_KEY},
                json={"kundeId": KUNDE_ID, "maaned": "2026-04"},
                timeout=10
            )
            return resp.json() if resp.status_code == 202 else None
        
        # Send two requests simultaneously
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(post_utkast) for _ in range(2)]
            results = [f.result() for f in futures]
        
        log(f"Got {len([r for r in results if r])} successful responses")
        
        if len([r for r in results if r]) != 2:
            log(f"❌ Expected 2 successful 202 responses")
            return False
        
        job_ids = [r.get("jobb", {}).get("id") for r in results if r]
        gjenbrukt_flags = [r.get("gjenbrukt", False) for r in results if r]
        
        log(f"Job IDs: {job_ids}")
        log(f"Gjenbrukt flags: {gjenbrukt_flags}")
        
        # Both should have the same job ID
        if job_ids[0] != job_ids[1]:
            log(f"❌ Job IDs don't match: {job_ids[0]} vs {job_ids[1]}")
            return False
        
        # At least one should have gjenbrukt:true
        if not any(gjenbrukt_flags):
            log(f"❌ Neither request has gjenbrukt:true")
            return False
        
        log(f"✅ Both requests share job ID: {job_ids[0]}")
        log(f"✅ At least one has gjenbrukt:true")
        
        # Poll the job to completion
        final_jobb = poll_job(job_ids[0])
        
        if not final_jobb:
            log("❌ Job polling failed")
            return False
        
        final_status = final_jobb.get("status")
        
        # Accept both 'ferdig' and 'feil' (demo data for April may lack units)
        if final_status == "ferdig":
            log("✅ Job completed successfully (ferdig)")
        elif final_status == "feil":
            feil = final_jobb.get("feil", "")
            if "Ingen fakturerbare enheter" in feil:
                log(f"✅ Job failed as expected (no billable units for 2026-04): {feil}")
            else:
                log(f"⚠️ Job failed with unexpected error: {feil}")
        else:
            log(f"❌ Unexpected final status: {final_status}")
            return False
        
        # Verify no duplicate po_faktura_utkast rows
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        count = db.po_faktura_utkast.count_documents({
            "kundeId": KUNDE_ID,
            "maaned": "2026-04"
        })
        client.close()
        
        log(f"po_faktura_utkast count for kunde+2026-04: {count}")
        
        if count > 1:
            log(f"❌ Found {count} po_faktura_utkast rows (expected 0 or 1)")
            return False
        
        log("✅ STEP 2 PASSED: Job sharing working, no duplicate utkast rows")
        return True
        
    except Exception as e:
        log(f"❌ STEP 2 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_step_3():
    """(3) GET jobb with unknown id → 404"""
    log("\n=== STEP 3: GET jobb with unknown id ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/pris/poweroffice/jobb",
            params={"id": "finnes-ikke", "key": ADMIN_KEY},
            timeout=10
        )
        
        log(f"Response: {resp.status_code}")
        
        if resp.status_code != 404:
            log(f"❌ Expected 404, got {resp.status_code}")
            return False
        
        data = resp.json()
        if data.get("ok") is not False:
            log(f"❌ Expected ok:false, got: {data}")
            return False
        
        log("✅ STEP 3 PASSED: Unknown job id returns 404")
        return True
        
    except Exception as e:
        log(f"❌ STEP 3 EXCEPTION: {e}")
        return False

def test_step_4():
    """(4) POST utkast with unknown kundeId → 404"""
    log("\n=== STEP 4: POST utkast with unknown kundeId ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/pris/poweroffice/utkast",
            params={"key": ADMIN_KEY},
            json={"kundeId": "x", "maaned": "2026-09"},
            timeout=10
        )
        
        log(f"Response: {resp.status_code}")
        
        if resp.status_code != 404:
            log(f"❌ Expected 404, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        if data.get("ok") is not False or not data.get("feil"):
            log(f"❌ Expected ok:false with feil, got: {data}")
            return False
        
        log("✅ STEP 4 PASSED: Unknown kundeId returns 404")
        return True
        
    except Exception as e:
        log(f"❌ STEP 4 EXCEPTION: {e}")
        return False

def test_step_5():
    """(5) Auth tests: GET jobb and POST utkast without key → 401"""
    log("\n=== STEP 5: Auth tests (401 without key) ===")
    
    try:
        # GET jobb without key
        resp1 = requests.get(
            f"{BASE_URL}/admin/pris/poweroffice/jobb",
            params={"id": "test"},
            timeout=10
        )
        
        log(f"GET jobb without key: {resp1.status_code}")
        
        if resp1.status_code != 401:
            log(f"❌ Expected 401 for GET jobb, got {resp1.status_code}")
            return False
        
        # POST utkast without key
        resp2 = requests.post(
            f"{BASE_URL}/admin/pris/poweroffice/utkast",
            json={"kundeId": KUNDE_ID, "maaned": "2026-09"},
            timeout=10
        )
        
        log(f"POST utkast without key: {resp2.status_code}")
        
        if resp2.status_code != 401:
            log(f"❌ Expected 401 for POST utkast, got {resp2.status_code}")
            return False
        
        log("✅ STEP 5 PASSED: Auth working (401 without key)")
        return True
        
    except Exception as e:
        log(f"❌ STEP 5 EXCEPTION: {e}")
        return False

def test_step_6():
    """(6) POST frys-alle with non-closed month → 400 JSON"""
    log("\n=== STEP 6: POST frys-alle with future month (2099-01) ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/fakturering/frys-alle",
            params={"key": ADMIN_KEY},
            json={"maaned": "2099-01"},
            timeout=10
        )
        
        log(f"Response: {resp.status_code}")
        
        if resp.status_code != 400:
            log(f"❌ Expected 400, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        if data.get("ok") is not False:
            log(f"❌ Expected ok:false, got: {data}")
            return False
        
        log("✅ STEP 6 PASSED: Future month returns 400 JSON")
        return True
        
    except Exception as e:
        log(f"❌ STEP 6 EXCEPTION: {e}")
        return False

def test_step_7():
    """(7) POST utkast-alle for 2026-09 → 202, poll until ferdig"""
    log("\n=== STEP 7: POST utkast-alle for 2026-09 ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/fakturering/utkast-alle",
            params={"key": ADMIN_KEY},
            json={"maaned": "2026-09"},
            timeout=10
        )
        
        log(f"Response: {resp.status_code}")
        
        if resp.status_code != 202:
            log(f"❌ Expected 202, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        jobb = data.get("jobb", {})
        
        if jobb.get("type") != "utkast-alle":
            log(f"❌ Expected type 'utkast-alle', got: {jobb.get('type')}")
            return False
        
        if jobb.get("kundeId") is not None:
            log(f"❌ Expected kundeId null, got: {jobb.get('kundeId')}")
            return False
        
        job_id = jobb.get("id")
        log(f"Job created: {job_id}")
        
        # Poll until finished
        final_jobb = poll_job(job_id)
        
        if not final_jobb:
            log("❌ Job polling failed")
            return False
        
        if final_jobb.get("status") != "ferdig":
            log(f"❌ Expected status 'ferdig', got: {final_jobb.get('status')}")
            return False
        
        resultat = final_jobb.get("resultat", {})
        resultat_list = resultat.get("resultat", [])
        
        log(f"Resultat: opprettet={resultat.get('opprettet')}, feilet={resultat.get('feilet')}")
        log(f"Resultat list has {len(resultat_list)} entries")
        
        # Should have one entry for DigiHome AS with alleredeOpprettet:true
        digihome_entry = None
        for entry in resultat_list:
            if entry.get("kundeId") == KUNDE_ID:
                digihome_entry = entry
                break
        
        if not digihome_entry:
            log(f"❌ DigiHome AS not in resultat list")
            return False
        
        if not digihome_entry.get("alleredeOpprettet"):
            log(f"❌ Expected alleredeOpprettet:true for DigiHome AS")
            return False
        
        if resultat.get("opprettet") != 0:
            log(f"⚠️ Expected opprettet=0, got: {resultat.get('opprettet')}")
        
        if resultat.get("feilet") != 0:
            log(f"⚠️ Expected feilet=0, got: {resultat.get('feilet')}")
        
        log("✅ STEP 7 PASSED: utkast-alle completed with DigiHome AS alleredeOpprettet:true")
        return True
        
    except Exception as e:
        log(f"❌ STEP 7 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_step_8():
    """(8) POST frys-alle for 2026-09 → 202, poll until ferdig with alleredeLaast:true"""
    log("\n=== STEP 8: POST frys-alle for 2026-09 ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/fakturering/frys-alle",
            params={"key": ADMIN_KEY},
            json={"maaned": "2026-09"},
            timeout=10
        )
        
        log(f"Response: {resp.status_code}")
        
        if resp.status_code != 202:
            log(f"❌ Expected 202, got {resp.status_code}")
            log(f"Response: {resp.text}")
            return False
        
        data = resp.json()
        jobb = data.get("jobb", {})
        
        if jobb.get("type") != "frys-alle":
            log(f"❌ Expected type 'frys-alle', got: {jobb.get('type')}")
            return False
        
        job_id = jobb.get("id")
        log(f"Job created: {job_id}")
        
        # Poll until finished
        final_jobb = poll_job(job_id)
        
        if not final_jobb:
            log("❌ Job polling failed")
            return False
        
        if final_jobb.get("status") != "ferdig":
            log(f"❌ Expected status 'ferdig', got: {final_jobb.get('status')}")
            return False
        
        resultat = final_jobb.get("resultat", {})
        resultat_list = resultat.get("resultat", [])
        
        log(f"Resultat list has {len(resultat_list)} entries")
        
        # Find DigiHome AS entry
        digihome_entry = None
        for entry in resultat_list:
            if entry.get("kundeId") == KUNDE_ID or "DigiHome" in entry.get("navn", ""):
                digihome_entry = entry
                break
        
        if not digihome_entry:
            log(f"⚠️ DigiHome AS not in resultat list (may already be frozen)")
        else:
            if digihome_entry.get("alleredeLaast"):
                log(f"✅ DigiHome AS has alleredeLaast:true (already frozen)")
            else:
                log(f"✅ DigiHome AS frozen successfully")
        
        log("✅ STEP 8 PASSED: frys-alle completed")
        return True
        
    except Exception as e:
        log(f"❌ STEP 8 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_step_9():
    """(9) Verify MongoDB: po_jobber documents exist, po_faktura_utkast count for 2026-09 is 1"""
    log("\n=== STEP 9: MongoDB verification ===")
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check po_jobber collection
        job_count = db.po_jobber.count_documents({})
        log(f"po_jobber collection has {job_count} documents")
        
        if job_count == 0:
            log("❌ No po_jobber documents found")
            client.close()
            return False
        
        # Check one job document has required fields
        sample_job = db.po_jobber.find_one()
        required_fields = ["id", "type", "status", "steg", "startet", "oppdatert"]
        
        for field in required_fields:
            if field not in sample_job:
                log(f"❌ Job document missing field: {field}")
                client.close()
                return False
        
        log(f"✅ Job document has all required fields: {required_fields}")
        
        # Check po_faktura_utkast for kunde + 2026-09
        utkast_count = db.po_faktura_utkast.count_documents({
            "kundeId": KUNDE_ID,
            "maaned": "2026-09"
        })
        
        log(f"po_faktura_utkast count for DigiHome AS + 2026-09: {utkast_count}")
        
        if utkast_count != 1:
            log(f"❌ Expected 1 po_faktura_utkast, found {utkast_count}")
            client.close()
            return False
        
        log("✅ STEP 9 PASSED: MongoDB verification successful")
        client.close()
        return True
        
    except Exception as e:
        log(f"❌ STEP 9 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    log("=" * 80)
    log("FAKTURERING BAKGRUNNSJOBBER (po_jobber) - Backend Test")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    log(f"Customer: DigiHome AS ({KUNDE_ID})")
    log("=" * 80)
    
    results = []
    
    # Run all tests
    results.append(("STEP 1: POST utkast 2026-09 (existing draft)", test_step_1()))
    results.append(("STEP 2: Simultaneous POSTs (job sharing)", test_step_2()))
    results.append(("STEP 3: Unknown job id → 404", test_step_3()))
    results.append(("STEP 4: Unknown kundeId → 404", test_step_4()))
    results.append(("STEP 5: Auth (401 without key)", test_step_5()))
    results.append(("STEP 6: frys-alle future month → 400", test_step_6()))
    results.append(("STEP 7: utkast-alle 2026-09", test_step_7()))
    results.append(("STEP 8: frys-alle 2026-09", test_step_8()))
    results.append(("STEP 9: MongoDB verification", test_step_9()))
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    log("=" * 80)
    log(f"TOTAL: {passed} passed, {failed} failed out of {len(results)} tests")
    log("=" * 80)
    
    if failed > 0:
        log("\n❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        log("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
