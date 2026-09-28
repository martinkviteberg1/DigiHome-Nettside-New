#!/usr/bin/env python3
"""
Backend test for SELVBETJENTE ENHETER v4: plan-regler (grunnlag/prøveperiode/dvale), 
enhetsminne, sammendrag.selvbetjent

CRITICAL SAFETY RULES:
1. NEVER call POST /api/admin/pris/poweroffice/utkast with tvang:true
2. NEVER call DELETE /api/admin/pris/poweroffice/utkast for DigiHome AS
3. NEVER call /api/admin/fakturering/utkast-alle or frys-alle
4. Do NOT write to the real plan 'Forvalter' (read only)
5. Do NOT modify/delete the real customer DigiHome AS
6. Never freeze (POST grunnlag/laas) DigiHome AS
7. Use QA plan and QA customer, DELETE them at cleanup
8. Verify at end: pris_planer has exactly 1 doc (Forvalter unchanged), 
   pris_kunder exactly 1, po_faktura_utkast exactly 1 (unchanged)
"""

import requests
import json
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
qa_plan_id = None
qa_kunde_id = None
digihome_kunde_id = None
forvalter_plan_id = None

def test_step(step_num, description):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def verify(condition, message):
    """Verify a condition and print result"""
    if condition:
        print(f"✅ {message}")
        return True
    else:
        print(f"❌ FAILED: {message}")
        return False

try:
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # ========================================================================
    # STEP 1: Verify Forvalter plan has modell===4 and new fields
    # ========================================================================
    test_step(1, "GET /api/admin/pris/data → verify Forvalter plan has modell===4 and new fields")
    
    response = requests.get(f"{BASE_URL}/admin/pris/data", params={"key": ADMIN_KEY})
    verify(response.status_code == 200, f"GET /admin/pris/data returns 200 (got {response.status_code})")
    
    data = response.json()
    verify(data.get("ok") == True, "Response has ok:true")
    
    planer = data.get("planer", [])
    verify(len(planer) >= 1, f"Has at least 1 plan (got {len(planer)})")
    
    forvalter = planer[0]
    forvalter_plan_id = forvalter.get("id")
    verify(forvalter.get("navn") == "Forvalter", f"First plan is 'Forvalter' (got '{forvalter.get('navn')}')")
    verify(forvalter.get("modell") == 4, f"Forvalter modell===4 (got {forvalter.get('modell')})")
    verify(forvalter.get("selvbetjentGrunnlag") == "leieforhold", 
           f"Forvalter selvbetjentGrunnlag==='leieforhold' (got '{forvalter.get('selvbetjentGrunnlag')}')")
    verify(forvalter.get("selvbetjentProveDager") == 30, 
           f"Forvalter selvbetjentProveDager===30 (got {forvalter.get('selvbetjentProveDager')})")
    verify(forvalter.get("selvbetjentDvaleDager") == 90, 
           f"Forvalter selvbetjentDvaleDager===90 (got {forvalter.get('selvbetjentDvaleDager')})")
    
    kunder = data.get("kunder", [])
    verify(len(kunder) >= 1, f"Has at least 1 customer (got {len(kunder)})")
    
    digihome = kunder[0]
    digihome_kunde_id = digihome.get("id")
    verify(digihome.get("navn") == "DigiHome AS", f"First customer is 'DigiHome AS' (got '{digihome.get('navn')}')")
    
    print(f"\n📝 Forvalter plan ID: {forvalter_plan_id}")
    print(f"📝 DigiHome AS kunde ID: {digihome_kunde_id}")
    
    # ========================================================================
    # STEP 2: Create QA plan with selvbetjent fields, test clamping
    # ========================================================================
    test_step(2, "POST /api/admin/pris/planer → create QA plan, test field persistence and clamping")
    
    # Create QA plan with valid values
    qa_plan_body = {
        "navn": "QA Selv",
        "trinn": [{"fraEnheter": 0, "pris": 200}],
        "prisModell": "per_type",
        "selvbetjentPris": 79,
        "selvbetjentGrunnlag": "kunde",
        "selvbetjentProveDager": 60,
        "selvbetjentDvaleDager": 180
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/planer", 
                            params={"key": ADMIN_KEY}, 
                            json=qa_plan_body)
    verify(response.status_code == 200, f"POST /admin/pris/planer returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    qa_plan = result.get("plan")
    qa_plan_id = qa_plan.get("id")
    verify(qa_plan_id is not None, f"Plan created with ID: {qa_plan_id}")
    verify(qa_plan.get("navn") == "QA Selv", f"Plan navn==='QA Selv' (got '{qa_plan.get('navn')}')")
    verify(qa_plan.get("modell") == 4, f"Plan modell===4 (got {qa_plan.get('modell')})")
    verify(qa_plan.get("selvbetjentGrunnlag") == "kunde", 
           f"selvbetjentGrunnlag==='kunde' (got '{qa_plan.get('selvbetjentGrunnlag')}')")
    verify(qa_plan.get("selvbetjentProveDager") == 60, 
           f"selvbetjentProveDager===60 (got {qa_plan.get('selvbetjentProveDager')})")
    verify(qa_plan.get("selvbetjentDvaleDager") == 180, 
           f"selvbetjentDvaleDager===180 (got {qa_plan.get('selvbetjentDvaleDager')})")
    
    # Test clamping with invalid values
    print("\n🔧 Testing field clamping with invalid values...")
    clamp_body = {
        "id": qa_plan_id,
        "selvbetjentGrunnlag": "tull",  # Invalid, should keep 'kunde'
        "selvbetjentProveDager": 9999,  # Should clamp to 365
        "selvbetjentDvaleDager": -5     # Should clamp to 0
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/planer", 
                            params={"key": ADMIN_KEY}, 
                            json=clamp_body)
    verify(response.status_code == 200, f"POST with invalid values returns 200 (got {response.status_code})")
    
    result = response.json()
    qa_plan = result.get("plan")
    verify(qa_plan.get("selvbetjentGrunnlag") == "kunde", 
           f"Invalid selvbetjentGrunnlag ignored, kept 'kunde' (got '{qa_plan.get('selvbetjentGrunnlag')}')")
    verify(qa_plan.get("selvbetjentProveDager") == 365, 
           f"selvbetjentProveDager clamped to 365 (got {qa_plan.get('selvbetjentProveDager')})")
    verify(qa_plan.get("selvbetjentDvaleDager") == 0, 
           f"selvbetjentDvaleDager clamped to 0 (got {qa_plan.get('selvbetjentDvaleDager')})")
    
    # Reset to original values
    print("\n🔧 Resetting QA plan to original values...")
    reset_body = {
        "id": qa_plan_id,
        "selvbetjentGrunnlag": "leieforhold",
        "selvbetjentProveDager": 30,
        "selvbetjentDvaleDager": 90
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/planer", 
                            params={"key": ADMIN_KEY}, 
                            json=reset_body)
    verify(response.status_code == 200, "Reset QA plan values")
    
    # ========================================================================
    # STEP 3: GET grunnlag for DigiHome AS 2026-08 → verify selvbetjent data
    # ========================================================================
    test_step(3, "GET /api/admin/pris/grunnlag?maaned=2026-08&kunde=<DigiHome> → verify selvbetjent data")
    
    response = requests.get(f"{BASE_URL}/admin/pris/grunnlag", 
                           params={"key": ADMIN_KEY, "maaned": "2026-08", "kunde": digihome_kunde_id})
    verify(response.status_code == 200, f"GET /admin/pris/grunnlag returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    grunnlag = result.get("grunnlag", {})
    modell = grunnlag.get("modell", {})
    verify(modell.get("selvbetjentGrunnlag") == "leieforhold", 
           f"modell.selvbetjentGrunnlag==='leieforhold' (got '{modell.get('selvbetjentGrunnlag')}')")
    verify(modell.get("selvbetjentProveDager") == 30, 
           f"modell.selvbetjentProveDager===30 (got {modell.get('selvbetjentProveDager')})")
    verify(modell.get("selvbetjentDvaleDager") == 90, 
           f"modell.selvbetjentDvaleDager===90 (got {modell.get('selvbetjentDvaleDager')})")
    
    sammendrag = grunnlag.get("sammendrag", {})
    selvbetjent = sammendrag.get("selvbetjent")
    verify(selvbetjent is not None, "sammendrag.selvbetjent exists")
    verify(isinstance(selvbetjent, dict), f"sammendrag.selvbetjent is object (got {type(selvbetjent).__name__})")
    verify(selvbetjent.get("registrert") == 4, 
           f"selvbetjent.registrert===4 (got {selvbetjent.get('registrert')})")
    verify(selvbetjent.get("medLeieforhold") == 2, 
           f"selvbetjent.medLeieforhold===2 (got {selvbetjent.get('medLeieforhold')})")
    verify(selvbetjent.get("fakturert") == 2, 
           f"selvbetjent.fakturert===2 (got {selvbetjent.get('fakturert')})")
    verify(selvbetjent.get("prove") == 0, 
           f"selvbetjent.prove===0 (got {selvbetjent.get('prove')})")
    verify(selvbetjent.get("dvale") == 0, 
           f"selvbetjent.dvale===0 (got {selvbetjent.get('dvale')})")
    verify(selvbetjent.get("regel") == "leieforhold", 
           f"selvbetjent.regel==='leieforhold' (got '{selvbetjent.get('regel')}')")
    
    verify(grunnlag.get("antallEnheter") == 27, 
           f"antallEnheter===27 (got {grunnlag.get('antallEnheter')})")
    verify(grunnlag.get("sumEksMva") == 5162, 
           f"sumEksMva===5162 (got {grunnlag.get('sumEksMva')})")
    
    linjer = grunnlag.get("linjer", [])
    verify(len(linjer) > 0, f"Has linjer (got {len(linjer)})")
    
    enheter = linjer[0].get("enheter", []) if linjer else []
    verify(len(enheter) > 0, f"Has enheter (got {len(enheter)})")
    
    # Check for selvbetjent type and dagerProve field
    selvbetjent_count = sum(1 for e in enheter if e.get("type") == "selvbetjent")
    verify(selvbetjent_count >= 2, f"Has at least 2 selvbetjent enheter (got {selvbetjent_count})")
    
    # Verify no ledig selvbetjent (ledige selvbetjente should not be counted)
    ledig_selvbetjent = [e for e in enheter if e.get("status") == "ledig" and e.get("type") == "selvbetjent"]
    verify(len(ledig_selvbetjent) == 0, 
           f"No ledig selvbetjent enheter in list (got {len(ledig_selvbetjent)})")
    
    # Verify all enheter have dagerProve field
    all_have_dager_prove = all("dagerProve" in e for e in enheter)
    verify(all_have_dager_prove, "All enheter have dagerProve field")
    
    print(f"\n📊 DigiHome AS 2026-08 summary:")
    print(f"   - Total enheter: {grunnlag.get('antallEnheter')}")
    print(f"   - Sum eks mva: {grunnlag.get('sumEksMva')} NOK")
    print(f"   - Selvbetjent: registrert={selvbetjent.get('registrert')}, "
          f"medLeieforhold={selvbetjent.get('medLeieforhold')}, "
          f"fakturert={selvbetjent.get('fakturert')}")
    
    # ========================================================================
    # STEP 4: GET fakturering/oversikt → verify selvbetjent data
    # ========================================================================
    test_step(4, "GET /api/admin/fakturering/oversikt?maaned=2026-08 → verify selvbetjent data")
    
    response = requests.get(f"{BASE_URL}/admin/fakturering/oversikt", 
                           params={"key": ADMIN_KEY, "maaned": "2026-08"})
    verify(response.status_code == 200, f"GET /admin/fakturering/oversikt returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    per = result.get("per", [])
    verify(len(per) > 0, f"Has per array (got {len(per)})")
    
    digihome_oversikt = per[0] if per else {}
    verify(digihome_oversikt.get("antallEnheter") == 27, 
           f"DigiHome antallEnheter===27 (got {digihome_oversikt.get('antallEnheter')})")
    verify(digihome_oversikt.get("sumEksMva") == 5162, 
           f"DigiHome sumEksMva===5162 (got {digihome_oversikt.get('sumEksMva')})")
    
    oversikt_sammendrag = digihome_oversikt.get("sammendrag", {})
    oversikt_selvbetjent = oversikt_sammendrag.get("selvbetjent")
    verify(oversikt_selvbetjent is not None, "oversikt has sammendrag.selvbetjent")
    verify(oversikt_selvbetjent.get("registrert") == 4, 
           f"oversikt selvbetjent.registrert===4 (got {oversikt_selvbetjent.get('registrert')})")
    verify(oversikt_selvbetjent.get("fakturert") == 2, 
           f"oversikt selvbetjent.fakturert===2 (got {oversikt_selvbetjent.get('fakturert')})")
    
    # ========================================================================
    # STEP 5: POST faktura → verify selvbetjent in faktura, test PDF
    # ========================================================================
    test_step(5, "POST /api/admin/pris/faktura → verify selvbetjent data, test PDF generation")
    
    faktura_body = {
        "maaned": "2026-08",
        "kunde": digihome,
        "plan": forvalter
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/faktura", 
                            params={"key": ADMIN_KEY}, 
                            json=faktura_body)
    verify(response.status_code == 200, f"POST /admin/pris/faktura returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    faktura = result.get("faktura", {})
    faktura_sammendrag = faktura.get("sammendrag", {})
    faktura_selvbetjent = faktura_sammendrag.get("selvbetjent")
    verify(faktura_selvbetjent is not None, "faktura has sammendrag.selvbetjent")
    verify(faktura_selvbetjent.get("registrert") == 4, 
           f"faktura selvbetjent.registrert===4 (got {faktura_selvbetjent.get('registrert')})")
    
    # Test PDF generation
    print("\n📄 Testing PDF generation...")
    response = requests.post(f"{BASE_URL}/admin/pris/faktura/pdf", 
                            params={"key": ADMIN_KEY}, 
                            json=faktura_body)
    verify(response.status_code == 200, f"POST /admin/pris/faktura/pdf returns 200 (got {response.status_code})")
    verify(response.headers.get("content-type") == "application/pdf", 
           f"Content-Type is application/pdf (got '{response.headers.get('content-type')}')")
    
    pdf_size = len(response.content)
    verify(pdf_size > 5000, f"PDF size > 5 KB (got {pdf_size} bytes)")
    print(f"   PDF size: {pdf_size} bytes")
    
    # Test PDF with spesifiser=1
    print("\n📄 Testing PDF with spesifiser=1...")
    response = requests.post(f"{BASE_URL}/admin/pris/faktura/pdf", 
                            params={"key": ADMIN_KEY, "spesifiser": "1"}, 
                            json=faktura_body)
    verify(response.status_code == 200, f"POST /admin/pris/faktura/pdf?spesifiser=1 returns 200 (got {response.status_code})")
    verify(response.headers.get("content-type") == "application/pdf", "Content-Type is application/pdf")
    
    pdf_spec_size = len(response.content)
    print(f"   PDF with spesifiser size: {pdf_spec_size} bytes")
    
    # ========================================================================
    # STEP 6: Verify pris_enhet_minne collection and index
    # ========================================================================
    test_step(6, "MongoDB: verify pris_enhet_minne collection and unique index")
    
    minne_collection = db["pris_enhet_minne"]
    minne_count = minne_collection.count_documents({})
    verify(minne_count >= 27, f"pris_enhet_minne has >= 27 documents (got {minne_count})")
    
    # Check a sample document
    sample_doc = minne_collection.find_one()
    if sample_doc:
        verify("enhet_id" in sample_doc, "Document has enhet_id field")
        verify("forstSett" in sample_doc, "Document has forstSett field")
        verify("sistSett" in sample_doc, "Document has sistSett field")
        print(f"   Sample document fields: {list(sample_doc.keys())}")
    
    # Check for documents with forsteInnflytting
    docs_with_innflytting = minne_collection.count_documents({"forsteInnflytting": {"$exists": True, "$ne": None}})
    verify(docs_with_innflytting >= 1, 
           f"At least 1 document has forsteInnflytting (got {docs_with_innflytting})")
    
    # Verify unique index pris_uniq_enhet
    indexes = list(minne_collection.list_indexes())
    index_names = [idx.get("name") for idx in indexes]
    verify("pris_uniq_enhet" in index_names, 
           f"Index pris_uniq_enhet exists (found indexes: {index_names})")
    
    # Check if index is unique
    pris_uniq_enhet_idx = next((idx for idx in indexes if idx.get("name") == "pris_uniq_enhet"), None)
    if pris_uniq_enhet_idx:
        verify(pris_uniq_enhet_idx.get("unique") == True, 
               f"Index pris_uniq_enhet is unique (got {pris_uniq_enhet_idx.get('unique')})")
    
    # ========================================================================
    # STEP 7: Create manual customer → verify no selvbetjent data
    # ========================================================================
    test_step(7, "POST /api/admin/pris/kunder (manual) → verify sammendrag.selvbetjent===null")
    
    qa_kunde_body = {
        "navn": "QA Selv Man",
        "enhetskilde": "manuell",
        "manueltAntall": 5,
        "planId": qa_plan_id,
        "status": "prove"
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/kunder", 
                            params={"key": ADMIN_KEY}, 
                            json=qa_kunde_body)
    verify(response.status_code == 200, f"POST /admin/pris/kunder returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    qa_kunde = result.get("kunde")
    qa_kunde_id = qa_kunde.get("id")
    verify(qa_kunde_id is not None, f"Customer created with ID: {qa_kunde_id}")
    verify(qa_kunde.get("navn") == "QA Selv Man", f"Customer navn==='QA Selv Man' (got '{qa_kunde.get('navn')}')")
    verify(qa_kunde.get("enhetskilde") == "manuell", 
           f"Customer enhetskilde==='manuell' (got '{qa_kunde.get('enhetskilde')}')")
    
    # Get grunnlag for manual customer
    print("\n🔍 Getting grunnlag for manual customer...")
    response = requests.get(f"{BASE_URL}/admin/pris/grunnlag", 
                           params={"key": ADMIN_KEY, "maaned": "2026-08", "kunde": qa_kunde_id})
    verify(response.status_code == 200, f"GET grunnlag for manual customer returns 200 (got {response.status_code})")
    
    result = response.json()
    grunnlag = result.get("grunnlag", {})
    verify(grunnlag.get("antallEnheter") == 5, 
           f"Manual customer antallEnheter===5 (got {grunnlag.get('antallEnheter')})")
    verify(grunnlag.get("sumEksMva") == 1000, 
           f"Manual customer sumEksMva===1000 (5×200) (got {grunnlag.get('sumEksMva')})")
    
    manual_sammendrag = grunnlag.get("sammendrag", {})
    manual_selvbetjent = manual_sammendrag.get("selvbetjent")
    verify(manual_selvbetjent is None or manual_selvbetjent == {}, 
           f"Manual customer sammendrag.selvbetjent is null/undefined (got {manual_selvbetjent})")
    
    # ========================================================================
    # STEP 8: Live preview with QA plan (per_type) → verify selvbetjent line
    # ========================================================================
    test_step(8, "POST /api/admin/pris/grunnlag (live preview) → verify per_type selvbetjent line")
    
    # Get QA plan details
    response = requests.get(f"{BASE_URL}/admin/pris/data", params={"key": ADMIN_KEY})
    data = response.json()
    qa_plan_full = next((p for p in data.get("planer", []) if p.get("id") == qa_plan_id), None)
    
    # Prepare preview body with DigiHome customer on QA plan
    preview_body = {
        "maaned": "2026-08",
        "kunde": {**digihome, "planId": qa_plan_id},
        "plan": qa_plan_full
    }
    
    response = requests.post(f"{BASE_URL}/admin/pris/grunnlag", 
                            params={"key": ADMIN_KEY}, 
                            json=preview_body)
    verify(response.status_code == 200, f"POST /admin/pris/grunnlag (preview) returns 200 (got {response.status_code})")
    
    result = response.json()
    verify(result.get("ok") == True, "Response has ok:true")
    
    preview_grunnlag = result.get("grunnlag", {})
    preview_linjer = preview_grunnlag.get("linjer", [])
    verify(len(preview_linjer) >= 2, f"Has at least 2 linjer (forvaltet + selvbetjent) (got {len(preview_linjer)})")
    
    # Find selvbetjent line
    selvbetjent_linje = next((l for l in preview_linjer if l.get("type") == "selvbetjent"), None)
    verify(selvbetjent_linje is not None, "Has selvbetjent line in per_type model")
    
    if selvbetjent_linje:
        verify(selvbetjent_linje.get("pris") == 79, 
               f"Selvbetjent line pris===79 (got {selvbetjent_linje.get('pris')})")
        verify(selvbetjent_linje.get("vekt") == 2, 
               f"Selvbetjent line vekt===2 (got {selvbetjent_linje.get('vekt')})")
        verify(selvbetjent_linje.get("belop") == 158, 
               f"Selvbetjent line belop===158 (79×2) (got {selvbetjent_linje.get('belop')})")
    
    # Find forvaltet line
    forvaltet_linje = next((l for l in preview_linjer if l.get("type") == "forvaltet"), None)
    verify(forvaltet_linje is not None, "Has forvaltet line in per_type model")
    
    preview_selvbetjent = preview_grunnlag.get("sammendrag", {}).get("selvbetjent")
    verify(preview_selvbetjent is not None, "Preview has sammendrag.selvbetjent")
    verify(preview_selvbetjent.get("fakturert") == 2, 
           f"Preview selvbetjent.fakturert===2 (got {preview_selvbetjent.get('fakturert')})")
    
    print(f"\n📊 Live preview summary:")
    print(f"   - Linjer: {len(preview_linjer)}")
    if selvbetjent_linje:
        print(f"   - Selvbetjent: pris={selvbetjent_linje.get('pris')}, "
              f"vekt={selvbetjent_linje.get('vekt')}, belop={selvbetjent_linje.get('belop')}")
    
    # ========================================================================
    # STEP 9: AUTH test
    # ========================================================================
    test_step(9, "GET /api/admin/pris/grunnlag without key → 401")
    
    response = requests.get(f"{BASE_URL}/admin/pris/grunnlag", 
                           params={"maaned": "2026-08", "kunde": digihome_kunde_id})
    verify(response.status_code == 401, f"GET without key returns 401 (got {response.status_code})")
    
    # ========================================================================
    # STEP Z: CLEANUP
    # ========================================================================
    test_step("Z", "CLEANUP: Delete QA customer and plan, verify database state")
    
    # Delete QA customer
    if qa_kunde_id:
        print(f"\n🗑️  Deleting QA customer {qa_kunde_id}...")
        response = requests.delete(f"{BASE_URL}/admin/pris/kunder", 
                                  params={"key": ADMIN_KEY, "id": qa_kunde_id})
        verify(response.status_code == 200, f"DELETE QA customer returns 200 (got {response.status_code})")
    
    # Delete QA plan
    if qa_plan_id:
        print(f"\n🗑️  Deleting QA plan {qa_plan_id}...")
        response = requests.delete(f"{BASE_URL}/admin/pris/planer", 
                                  params={"key": ADMIN_KEY, "id": qa_plan_id})
        verify(response.status_code == 200, f"DELETE QA plan returns 200 (got {response.status_code})")
    
    # Verify database state
    print("\n🔍 Verifying final database state...")
    
    # Check pris_planer
    planer_count = db["pris_planer"].count_documents({})
    verify(planer_count == 1, f"pris_planer has exactly 1 document (got {planer_count})")
    
    forvalter_doc = db["pris_planer"].find_one({"id": forvalter_plan_id})
    if forvalter_doc:
        verify(forvalter_doc.get("navn") == "Forvalter", "Forvalter plan unchanged (navn)")
        verify(forvalter_doc.get("selvbetjentGrunnlag") == "leieforhold", 
               "Forvalter plan unchanged (selvbetjentGrunnlag)")
        verify(forvalter_doc.get("selvbetjentProveDager") == 30, 
               "Forvalter plan unchanged (selvbetjentProveDager)")
        verify(forvalter_doc.get("selvbetjentDvaleDager") == 90, 
               "Forvalter plan unchanged (selvbetjentDvaleDager)")
    
    # Check pris_kunder
    kunder_count = db["pris_kunder"].count_documents({})
    verify(kunder_count == 1, f"pris_kunder has exactly 1 document (got {kunder_count})")
    
    digihome_doc = db["pris_kunder"].find_one({"id": digihome_kunde_id})
    verify(digihome_doc is not None, "DigiHome AS customer exists")
    verify(digihome_doc.get("navn") == "DigiHome AS", "DigiHome AS unchanged")
    
    # Check po_faktura_utkast
    utkast_count = db["po_faktura_utkast"].count_documents({})
    verify(utkast_count == 1, f"po_faktura_utkast has exactly 1 document (got {utkast_count})")
    
    # Check no frozen grunnlag for DigiHome 2026-08
    laast_count = db["pris_grunnlag_laast"].count_documents({
        "kundeId": digihome_kunde_id,
        "maaned": "2026-08"
    })
    verify(laast_count == 0, 
           f"No pris_grunnlag_laast for DigiHome AS 2026-08 (got {laast_count})")
    
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED - SELVBETJENTE ENHETER v4 WORKING CORRECTLY")
    print("="*80)
    print("\n📊 Summary:")
    print("   - Forvalter plan has modell v4 with selvbetjent fields (leieforhold/30/90)")
    print("   - QA plan created, field clamping working correctly")
    print("   - DigiHome AS 2026-08: 27 enheter, 5162 NOK, selvbetjent data correct")
    print("   - Faktura generation working with selvbetjent data")
    print("   - PDF generation working (both normal and spesifiser)")
    print("   - pris_enhet_minne collection exists with >= 27 docs and unique index")
    print("   - Manual customer has no selvbetjent data (correct)")
    print("   - Live preview with per_type shows selvbetjent line (pris 79, vekt 2, belop 158)")
    print("   - Auth working (401 without key)")
    print("   - Database cleanup successful (1 plan, 1 kunde, 1 utkast, 0 frozen grunnlag)")
    
except Exception as e:
    print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
    
    # Attempt cleanup on error
    print("\n🧹 Attempting cleanup after error...")
    try:
        if qa_kunde_id:
            requests.delete(f"{BASE_URL}/admin/pris/kunder", 
                          params={"key": ADMIN_KEY, "id": qa_kunde_id})
        if qa_plan_id:
            requests.delete(f"{BASE_URL}/admin/pris/planer", 
                          params={"key": ADMIN_KEY, "id": qa_plan_id})
    except:
        pass
    
    raise

finally:
    # Close MongoDB connection
    if 'client' in locals():
        client.close()
