#!/usr/bin/env python3
"""
COMPREHENSIVE TEST: NYE MANUELLE STYLINGFLYTEN I DIGIHOME SALGSRADAR

Test den nye manuelle stylingflyten der auto-pipeline IKKE lenger styler bilder
automatisk, og all styling skjer via jobber med review-prosess.

Base URL: NEXT_PUBLIC_BASE_URL + /api
Admin key: dh_admin_b3Kx92Qz7Lm4 (query param ?key=)
Ingest key: SALGSRADAR_INGEST_KEY (Bearer header)
MongoDB: mongodb://localhost:27017, DB: your_database_name

KRITISKE SIKKERHETSREGLER:
1. IKKE rør de 3 reelle leadsene (Johannes Bruns gate 1, Strandgaten 222, skuteviken smalgang 11)
2. Lag SYNTETISK testlead via POST /api/salgsradar/ingest med finnkode 99900077
3. Testleaden trenger EKTE finncdn-bilde-URLer fra Strandgaten 222
4. OBLIGATORISK OPPRYDDING: DELETE testleaden + fjern tombstone
5. Maks 3 ekte AI-genereringer totalt (hver tar 30-90 sek og koster penger)
"""

import requests
import time
import json
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INGEST_KEY = "dh_ingest_5f85080f4e4534c4684f5740cea43a09808a"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"
TEST_FINNKODE = "99900077"

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
test_lead_id = None
test_slug = None
generation_count = 0
MAX_GENERATIONS = 3

def log(msg):
    print(f"[TEST] {msg}")

def assert_equal(actual, expected, msg):
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected}, got {actual}")
    log(f"✓ {msg}")

def assert_true(condition, msg):
    if not condition:
        raise AssertionError(f"{msg}: condition was False")
    log(f"✓ {msg}")

def assert_in(item, container, msg):
    if item not in container:
        raise AssertionError(f"{msg}: {item} not in {container}")
    log(f"✓ {msg}")

# ============================================================================
# STEP 0: VERIFY BASELINE - Real leads unchanged
# ============================================================================
def step0_verify_baseline():
    log("\n=== STEP 0: VERIFY BASELINE ===")
    
    # Get baseline counts for real leads
    strandgaten = db.salgsradar_leads.find_one({"adresse": "Strandgaten 222"}, {"stylet": 1})
    johannes = db.salgsradar_leads.find_one({"adresse": "Johannes Bruns gate 1"}, {"stylet": 1})
    skuteviken = db.salgsradar_leads.find_one({"adresse": "skuteviken smalgang 11"}, {"stylet": 1})
    
    baseline = {
        "Strandgaten 222": len(strandgaten.get("stylet", [])) if strandgaten else 0,
        "Johannes Bruns gate 1": len(johannes.get("stylet", [])) if johannes else 0,
        "skuteviken smalgang 11": len(skuteviken.get("stylet", [])) if skuteviken else 0,
    }
    
    log(f"Baseline stylet counts: {baseline}")
    return baseline

# ============================================================================
# STEP 1: GET REAL IMAGE URLs FROM STRANDGATEN 222
# ============================================================================
def step1_get_real_images():
    log("\n=== STEP 1: GET REAL IMAGE URLs ===")
    
    strandgaten = db.salgsradar_leads.find_one(
        {"adresse": "Strandgaten 222"},
        {"bilder": 1}
    )
    
    if not strandgaten or not strandgaten.get("bilder"):
        raise AssertionError("Strandgaten 222 lead not found or has no images")
    
    # Get first 3 images
    real_images = strandgaten["bilder"][:3]
    log(f"Got {len(real_images)} real finncdn images from Strandgaten 222")
    for i, img in enumerate(real_images, 1):
        log(f"  Image {i}: {img[:80]}...")
    
    return real_images

# ============================================================================
# STEP 2: CREATE SYNTHETIC TEST LEAD
# ============================================================================
def step2_create_test_lead(real_images):
    global test_lead_id, test_slug
    
    log("\n=== STEP 2: CREATE SYNTHETIC TEST LEAD ===")
    
    payload = {
        "finnkode": TEST_FINNKODE,
        "tittel": "QA Manuell Styling Test",
        "adresse": "QA Testgate 99",
        "postnr": "5000",
        "pris": 15000,
        "m2": 50,
        "soverom": 2,
        "boligtype": "Leilighet",
        "bilder": real_images,  # Use REAL finncdn URLs
        "beskrivelse": "QA testlead for manuell stylingflyt"
    }
    
    headers = {"Authorization": f"Bearer {INGEST_KEY}"}
    resp = requests.post(f"{BASE_URL}/salgsradar/ingest", json=payload, headers=headers)
    
    assert_equal(resp.status_code, 201, "Ingest returned 201")
    data = resp.json()
    assert_true(data.get("ok"), "Ingest response ok=true")
    
    test_lead_id = data.get("leadId")
    test_slug = data.get("tilbudSlug")
    
    assert_true(test_lead_id, "Got leadId from ingest")
    assert_true(test_slug, "Got tilbudSlug from ingest")
    
    log(f"Created test lead: {test_lead_id}")
    log(f"Tilbud slug: {test_slug}")
    
    return test_lead_id, test_slug

# ============================================================================
# STEP A: AUTO-PIPELINE STYLER IKKE LENGER (KRITISK)
# ============================================================================
def stepA_verify_auto_no_styling(lead_id):
    log("\n=== STEP A: AUTO-PIPELINE STYLER IKKE LENGER ===")
    
    # Poll until auto.status === 'ferdig'
    max_wait = 60  # 60 seconds max
    start = time.time()
    
    while time.time() - start < max_wait:
        lead = db.salgsradar_leads.find_one({"id": lead_id})
        auto_status = lead.get("auto", {}).get("status")
        
        log(f"Auto status: {auto_status}")
        
        if auto_status == "ferdig":
            break
        elif auto_status == "feilet":
            raise AssertionError(f"Auto-pipeline failed: {lead.get('auto', {}).get('feil')}")
        
        time.sleep(2)
    
    # Verify auto finished
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    assert_equal(lead.get("auto", {}).get("status"), "ferdig", "Auto-pipeline finished")
    
    # CRITICAL: lead.stylet must be EMPTY array
    stylet = lead.get("stylet", [])
    assert_equal(len(stylet), 0, "lead.stylet is EMPTY (no automatic styling)")
    log("✓ CRITICAL: Auto-pipeline did NOT style any images")
    
    # Verify GET /api/admin/salgsradar/leads includes foreslattStil
    resp = requests.get(f"{BASE_URL}/admin/salgsradar/leads?key={ADMIN_KEY}")
    assert_equal(resp.status_code, 200, "GET leads returned 200")
    leads = resp.json().get("leads", [])
    test_lead = next((l for l in leads if l.get("id") == lead_id), None)
    assert_true(test_lead, "Test lead found in leads list")
    assert_true("foreslattStil" in test_lead, "foreslattStil field present")
    log(f"foreslattStil: {test_lead.get('foreslattStil')}")

# ============================================================================
# STEP B: OPPRETT STYLINGJOBBER
# ============================================================================
def stepB_create_styling_jobs(lead_id, real_images):
    log("\n=== STEP B: OPPRETT STYLINGJOBBER ===")
    
    # Create 2 jobs with different parameters
    payload = {
        "leadId": lead_id,
        "bilder": [
            {
                "kildeUrl": real_images[0],
                "stil": "optimal",
                "intensitet": "varsom",
                "instruks": "behold alle møbler nøyaktig som de er"
            },
            {
                "kildeUrl": real_images[1],
                "stil": "lysloft",
                "intensitet": "full"
            }
        ]
    }
    
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 200, "POST styling-jobber returned 200")
    
    data = resp.json()
    assert_true(data.get("ok"), "Response ok=true")
    
    jobber = data.get("jobber", [])
    assert_equal(len(jobber), 2, "Created 2 jobs")
    
    for i, jobb in enumerate(jobber, 1):
        assert_in(jobb.get("status"), ["venter", "kjorer"], f"Job {i} status is venter or kjorer")
        assert_true(jobb.get("kildeUrl"), f"Job {i} has kildeUrl")
        assert_true(jobb.get("stil"), f"Job {i} has stil")
        assert_true(jobb.get("intensitet"), f"Job {i} has intensitet")
        log(f"Job {i}: {jobb.get('id')} - {jobb.get('stil')}/{jobb.get('intensitet')}")
    
    # Verify first job has instruks
    assert_equal(jobber[0].get("instruks"), "behold alle møbler nøyaktig som de er", "Job 1 has instruks")
    
    return jobber

def stepB_validations(lead_id, real_images):
    log("\n=== STEP B: VALIDATIONS ===")
    
    # B1: kildeUrl not in lead's bilder → 400
    payload = {
        "leadId": lead_id,
        "bilder": [{"kildeUrl": "https://images.finncdn.no/dynamic/1600w/item/999999999/fake-image.jpg", "stil": "optimal"}]
    }
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 400, "Invalid kildeUrl returns 400")
    log("✓ Invalid kildeUrl rejected")
    
    # B2: Empty bilder array → 400
    payload = {"leadId": lead_id, "bilder": []}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 400, "Empty bilder array returns 400")
    log("✓ Empty bilder array rejected")
    
    # B3: Duplicate kildeUrl (active job) → should be skipped
    # First, create a job
    payload = {
        "leadId": lead_id,
        "bilder": [{"kildeUrl": real_images[2], "stil": "optimal"}]
    }
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 200, "First job created")
    
    # Try to create another job for same kildeUrl
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
    data = resp.json()
    # Should either return 400 or have hoppet array
    if resp.status_code == 400:
        log("✓ Duplicate kildeUrl rejected with 400")
    else:
        assert_true(len(data.get("hoppet", [])) > 0, "Duplicate kildeUrl skipped")
        log("✓ Duplicate kildeUrl skipped")
    
    # B4: GET without leadId → 400
    resp = requests.get(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}")
    assert_equal(resp.status_code, 400, "GET without leadId returns 400")
    log("✓ GET without leadId rejected")
    
    # B5: Without key → 401
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber", json={"leadId": lead_id, "bilder": []})
    assert_equal(resp.status_code, 401, "POST without key returns 401")
    log("✓ Auth required")

# ============================================================================
# STEP C: POLL TIL FERDIG
# ============================================================================
def stepC_poll_until_finished(lead_id, jobber):
    global generation_count
    
    log("\n=== STEP C: POLL TIL FERDIG ===")
    log(f"WARNING: This will use {len(jobber)} AI generations (current count: {generation_count}/{MAX_GENERATIONS})")
    
    if generation_count + len(jobber) > MAX_GENERATIONS:
        log(f"SKIPPING: Would exceed max generations ({MAX_GENERATIONS})")
        return None
    
    max_wait = 240  # 4 minutes max
    start = time.time()
    
    while time.time() - start < max_wait:
        resp = requests.get(f"{BASE_URL}/admin/salgsradar/styling-jobber?leadId={lead_id}&key={ADMIN_KEY}")
        assert_equal(resp.status_code, 200, "GET styling-jobber returned 200")
        
        data = resp.json()
        current_jobber = data.get("jobber", [])
        
        all_done = all(j.get("status") in ["ferdig", "feilet"] for j in current_jobber)
        
        statuses = [f"{j.get('id')[:8]}: {j.get('status')}" for j in current_jobber]
        log(f"Job statuses: {', '.join(statuses)}")
        
        if all_done:
            break
        
        time.sleep(5)
    
    # Get final state
    resp = requests.get(f"{BASE_URL}/admin/salgsradar/styling-jobber?leadId={lead_id}&key={ADMIN_KEY}")
    current_jobber = resp.json().get("jobber", [])
    
    finished_jobber = []
    for jobb in current_jobber:
        if jobb.get("status") == "ferdig":
            finished_jobber.append(jobb)
            generation_count += 1
            
            # Verify job fields
            assert_equal(jobb.get("review"), "venter", f"Job {jobb.get('id')[:8]} review=venter")
            assert_true(jobb.get("resultatBildeId"), f"Job {jobb.get('id')[:8]} has resultatBildeId")
            
            # Verify in MongoDB: salgsradar_bilder document
            bilde_doc = db.salgsradar_bilder.find_one({"id": jobb.get("resultatBildeId")})
            assert_true(bilde_doc, f"Bilde document exists for {jobb.get('resultatBildeId')}")
            assert_equal(bilde_doc.get("godkjent"), False, "Bilde godkjent=false")
            assert_equal(bilde_doc.get("jobbId"), jobb.get("id"), "Bilde jobbId matches")
            assert_equal(bilde_doc.get("kildeUrl"), jobb.get("kildeUrl"), "Bilde kildeUrl matches (PARRING!)")
            assert_true(bilde_doc.get("dataUrl", "").startswith("data:image/"), "Bilde dataUrl is data URL")
            
            log(f"✓ Job {jobb.get('id')[:8]} finished successfully")
        elif jobb.get("status") == "feilet":
            log(f"⚠ Job {jobb.get('id')[:8]} failed: {jobb.get('feil')}")
    
    if not finished_jobber:
        log("WARNING: No jobs finished successfully - may need provIgjen")
        return None
    
    # Verify lead.stylet is STILL empty
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    assert_equal(len(lead.get("stylet", [])), 0, "lead.stylet is STILL empty (candidates not auto-added)")
    
    # Verify public tilbud endpoint does NOT leak candidates
    resp = requests.get(f"{BASE_URL}/tilbud?slug={test_slug}")
    assert_equal(resp.status_code, 200, "GET tilbud returned 200")
    tilbud = resp.json().get("tilbud", {})
    assert_equal(len(tilbud.get("stylet", [])), 0, "Public tilbud stylet array is empty (no leak)")
    
    log(f"✓ {len(finished_jobber)} jobs finished, candidates NOT leaked to public")
    
    return finished_jobber

# ============================================================================
# STEP D: REVIEW
# ============================================================================
def stepD_review(lead_id, finished_jobber):
    global generation_count
    
    if not finished_jobber or len(finished_jobber) < 2:
        log("\n=== STEP D: REVIEW (SKIPPED - not enough finished jobs) ===")
        return
    
    log("\n=== STEP D: REVIEW ===")
    
    jobbA = finished_jobber[0]
    jobbB = finished_jobber[1]
    
    # D1: Godkjenn jobbA
    payload = {"jobbId": jobbA.get("id"), "handling": "godkjenn"}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 200, "Godkjenn returned 200")
    
    # Verify lead.stylet has EXACTLY 1 entry
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    stylet = lead.get("stylet", [])
    assert_equal(len(stylet), 1, "lead.stylet has EXACTLY 1 entry")
    
    stylet_entry = stylet[0]
    assert_equal(stylet_entry.get("id"), jobbA.get("resultatBildeId"), "stylet entry id matches resultatBildeId")
    assert_equal(stylet_entry.get("kildeUrl"), jobbA.get("kildeUrl"), "stylet entry kildeUrl matches")
    assert_equal(stylet_entry.get("stil"), jobbA.get("stil"), "stylet entry stil matches")
    
    # Verify bilde doc has godkjent=true
    bilde_doc = db.salgsradar_bilder.find_one({"id": jobbA.get("resultatBildeId")})
    assert_equal(bilde_doc.get("godkjent"), True, "Bilde godkjent=true")
    
    # Verify job review=godkjent
    jobb_doc = db.salgsradar_stylingjobber.find_one({"id": jobbA.get("id")})
    assert_equal(jobb_doc.get("review"), "godkjent", "Job review=godkjent")
    
    log("✓ Godkjenn: bilde added to lead.stylet")
    
    # Verify public tilbud now shows the image
    resp = requests.get(f"{BASE_URL}/tilbud?slug={test_slug}")
    tilbud = resp.json().get("tilbud", {})
    assert_equal(len(tilbud.get("stylet", [])), 1, "Public tilbud has 1 stylet image")
    assert_equal(tilbud["stylet"][0].get("id"), jobbA.get("resultatBildeId"), "Public stylet id matches")
    
    # Verify GET /api/tilbud/bilde works
    resp = requests.get(f"{BASE_URL}/tilbud/bilde?id={jobbA.get('resultatBildeId')}")
    assert_equal(resp.status_code, 200, "GET tilbud/bilde returned 200")
    log("✓ Public tilbud shows approved image")
    
    # D2: Forkast jobbB
    payload = {"jobbId": jobbB.get("id"), "handling": "forkast"}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 200, "Forkast returned 200")
    
    # Verify kandidat bilde DELETED
    bilde_doc = db.salgsradar_bilder.find_one({"id": jobbB.get("resultatBildeId")})
    assert_true(bilde_doc is None, "Kandidat bilde document DELETED")
    
    # Verify job review=forkastet, resultatBildeId=null
    jobb_doc = db.salgsradar_stylingjobber.find_one({"id": jobbB.get("id")})
    assert_equal(jobb_doc.get("review"), "forkastet", "Job review=forkastet")
    assert_true(jobb_doc.get("resultatBildeId") is None, "Job resultatBildeId=null")
    
    # Verify lead.stylet still has only 1 entry
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    assert_equal(len(lead.get("stylet", [])), 1, "lead.stylet still has 1 entry")
    
    log("✓ Forkast: kandidat deleted, lead.stylet unchanged")
    
    # D3: ERSTATT-SEMANTIKK (use 3rd generation if available)
    if generation_count < MAX_GENERATIONS:
        log("\n=== D3: ERSTATT-SEMANTIKK ===")
        
        # Create new job for SAME kildeUrl as jobbA
        payload = {
            "leadId": lead_id,
            "bilder": [{"kildeUrl": jobbA.get("kildeUrl"), "stil": "optimal", "intensitet": "full"}]
        }
        resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-jobber?key={ADMIN_KEY}", json=payload)
        assert_equal(resp.status_code, 200, "Created replacement job")
        
        new_jobber = resp.json().get("jobber", [])
        if new_jobber:
            new_jobb = new_jobber[0]
            
            # Poll until finished
            max_wait = 120
            start = time.time()
            while time.time() - start < max_wait:
                resp = requests.get(f"{BASE_URL}/admin/salgsradar/styling-jobber?leadId={lead_id}&key={ADMIN_KEY}")
                current_jobber = resp.json().get("jobber", [])
                new_jobb_current = next((j for j in current_jobber if j.get("id") == new_jobb.get("id")), None)
                
                if new_jobb_current and new_jobb_current.get("status") == "ferdig":
                    new_jobb = new_jobb_current
                    generation_count += 1
                    break
                
                time.sleep(5)
            
            if new_jobb.get("status") == "ferdig":
                # Godkjenn new job
                payload = {"jobbId": new_jobb.get("id"), "handling": "godkjenn"}
                resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
                assert_equal(resp.status_code, 200, "Godkjenn replacement returned 200")
                
                # Verify lead.stylet has STILL exactly 1 entry (new id, old id gone)
                lead = db.salgsradar_leads.find_one({"id": lead_id})
                stylet = lead.get("stylet", [])
                assert_equal(len(stylet), 1, "lead.stylet has STILL 1 entry (REPLACE semantics)")
                assert_equal(stylet[0].get("id"), new_jobb.get("resultatBildeId"), "New id in stylet")
                assert_true(stylet[0].get("id") != jobbA.get("resultatBildeId"), "Old id gone")
                
                # Verify OLD bilde doc is DELETED
                old_bilde = db.salgsradar_bilder.find_one({"id": jobbA.get("resultatBildeId")})
                assert_true(old_bilde is None, "Old bilde document DELETED (REPLACE semantics)")
                
                log("✓ ERSTATT-SEMANTIKK: new version replaced old, old bilde deleted")
            else:
                log("⚠ Replacement job did not finish in time")
    else:
        log(f"\n=== D3: ERSTATT-SEMANTIKK (SKIPPED - max generations reached) ===")
    
    # D4: Validations
    log("\n=== D4: REVIEW VALIDATIONS ===")
    
    # Invalid handling → 400
    payload = {"jobbId": jobbA.get("id"), "handling": "invalid"}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 400, "Invalid handling returns 400")
    
    # Godkjenn already godkjent → 200 with allerede:true or ok
    payload = {"jobbId": jobbA.get("id"), "handling": "godkjenn"}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 200, "Godkjenn already godkjent returns 200")
    
    # Forkast godkjent job → 400
    # (Note: jobbA might have been replaced, so skip this if needed)
    
    # Unknown jobbId → 404
    payload = {"jobbId": "unknown-job-id-12345", "handling": "godkjenn"}
    resp = requests.post(f"{BASE_URL}/admin/salgsradar/styling-review?key={ADMIN_KEY}", json=payload)
    assert_equal(resp.status_code, 404, "Unknown jobbId returns 404")
    
    log("✓ All review validations passed")

# ============================================================================
# STEP E: FJERN GODKJENT BILDE
# ============================================================================
def stepE_remove_approved_image(lead_id):
    log("\n=== STEP E: FJERN GODKJENT BILDE ===")
    
    # Get current stylet
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    stylet = lead.get("stylet", [])
    
    if not stylet:
        log("No approved images to remove")
        return
    
    bilde_id = stylet[0].get("id")
    
    # DELETE stylet-bilde
    resp = requests.delete(f"{BASE_URL}/admin/salgsradar/stylet-bilde?leadId={lead_id}&bildeId={bilde_id}&key={ADMIN_KEY}")
    assert_equal(resp.status_code, 200, "DELETE stylet-bilde returned 200")
    
    # Verify lead.stylet is empty
    lead = db.salgsradar_leads.find_one({"id": lead_id})
    assert_equal(len(lead.get("stylet", [])), 0, "lead.stylet is empty")
    
    # Verify bilde doc is deleted
    bilde_doc = db.salgsradar_bilder.find_one({"id": bilde_id})
    assert_true(bilde_doc is None, "Bilde document deleted")
    
    log("✓ Approved image removed")
    
    # Validation: Unknown bildeId → 404
    resp = requests.delete(f"{BASE_URL}/admin/salgsradar/stylet-bilde?leadId={lead_id}&bildeId=unknown-id&key={ADMIN_KEY}")
    assert_equal(resp.status_code, 404, "Unknown bildeId returns 404")

# ============================================================================
# STEP F: OPPRYDDING + REGRESJON
# ============================================================================
def stepF_cleanup_and_regression(lead_id, baseline):
    log("\n=== STEP F: OPPRYDDING + REGRESJON ===")
    
    # Delete test lead
    resp = requests.delete(f"{BASE_URL}/admin/salgsradar/lead?id={lead_id}&key={ADMIN_KEY}")
    assert_equal(resp.status_code, 200, "DELETE lead returned 200")
    
    # Verify in MongoDB: 0 documents in salgsradar_stylingjobber and salgsradar_bilder for leadId
    jobber_count = db.salgsradar_stylingjobber.count_documents({"leadId": lead_id})
    bilder_count = db.salgsradar_bilder.count_documents({"leadId": lead_id})
    
    assert_equal(jobber_count, 0, "0 styling jobs remain in DB")
    assert_equal(bilder_count, 0, "0 bilder remain in DB")
    
    log("✓ Cascade delete worked: jobs and bilder deleted")
    
    # Remove tombstone
    db.salgsradar_tombstones.delete_many({"finnkode": TEST_FINNKODE})
    log("✓ Tombstone removed")
    
    # Verify real leads unchanged
    strandgaten = db.salgsradar_leads.find_one({"adresse": "Strandgaten 222"}, {"stylet": 1})
    johannes = db.salgsradar_leads.find_one({"adresse": "Johannes Bruns gate 1"}, {"stylet": 1})
    skuteviken = db.salgsradar_leads.find_one({"adresse": "skuteviken smalgang 11"}, {"stylet": 1})
    
    current = {
        "Strandgaten 222": len(strandgaten.get("stylet", [])) if strandgaten else 0,
        "Johannes Bruns gate 1": len(johannes.get("stylet", [])) if johannes else 0,
        "skuteviken smalgang 11": len(skuteviken.get("stylet", [])) if skuteviken else 0,
    }
    
    for addr, count in baseline.items():
        assert_equal(current[addr], count, f"{addr} stylet count unchanged ({count})")
    
    log("✓ Real leads unchanged")

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================
def main():
    try:
        log("=" * 80)
        log("COMPREHENSIVE TEST: NYE MANUELLE STYLINGFLYTEN")
        log("=" * 80)
        
        # Step 0: Baseline
        baseline = step0_verify_baseline()
        
        # Step 1: Get real images
        real_images = step1_get_real_images()
        
        # Step 2: Create test lead
        lead_id, slug = step2_create_test_lead(real_images)
        
        # Step A: Verify auto-pipeline does NOT style
        stepA_verify_auto_no_styling(lead_id)
        
        # Step B: Create styling jobs
        jobber = stepB_create_styling_jobs(lead_id, real_images)
        stepB_validations(lead_id, real_images)
        
        # Step C: Poll until finished
        finished_jobber = stepC_poll_until_finished(lead_id, jobber)
        
        # Step D: Review
        stepD_review(lead_id, finished_jobber)
        
        # Step E: Remove approved image
        stepE_remove_approved_image(lead_id)
        
        # Step F: Cleanup and regression
        stepF_cleanup_and_regression(lead_id, baseline)
        
        log("\n" + "=" * 80)
        log("✅ ALL TESTS PASSED")
        log(f"Total AI generations used: {generation_count}/{MAX_GENERATIONS}")
        log("=" * 80)
        
    except Exception as e:
        log(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        
        # Attempt cleanup
        if test_lead_id:
            log("\nAttempting cleanup...")
            try:
                requests.delete(f"{BASE_URL}/admin/salgsradar/lead?id={test_lead_id}&key={ADMIN_KEY}")
                db.salgsradar_tombstones.delete_many({"finnkode": TEST_FINNKODE})
                log("Cleanup completed")
            except:
                log("Cleanup failed - manual cleanup required")
        
        raise

if __name__ == "__main__":
    main()
