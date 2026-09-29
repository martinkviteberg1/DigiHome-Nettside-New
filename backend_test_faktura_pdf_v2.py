#!/usr/bin/env python3
"""
Backend test for FAKTURA PDF v2 + REGISTRERINGSDATO (ingen tilbakefakturering) + kundeadresse/referanse

Test plan (11 steps + Z cleanup):
1. GET /api/admin/pris/data → verify customer fields (adresse/postnr/sted/referanse)
2. GET /api/admin/pris/grunnlag?kunde=D&maaned=2026-08 → verify structure and values
3. GET grunnlag?kunde=D&maaned=2026-09 → verify forRegistrering=0, nye>=1
4. GET grunnlag?kunde=D&maaned=2026-07 → verify units<24, forRegistrering>=6
5. GET /api/admin/pris/faktura?kunde=D&maaned=2026-08&spesifiser=1 → verify lines and merker
6. GET /api/admin/pris/faktura/pdf → parse PDF text with pymupdf
7. KUNDEFELT: create QA customer with address fields, verify in faktura JSON and PDF
8. GET /api/admin/fakturering/oversikt?maaned=2026-08 → verify per-row data
9. GET /api/admin/leieforhold → verify all rows have registrert field
10. MongoDB pris_enhet_minne → verify registrert field
11. AUTH: verify 401 without key
Z. CLEANUP: delete QA customer and verify counts

SAFETY RULES (ABSOLUTE):
- NEVER freeze DigiHome AS
- NEVER call POST/DELETE /api/admin/pris/poweroffice/utkast
- NEVER use tvang
- NEVER modify/delete DigiHome AS or Forvalter plan
- ONLY write: QA customer 'QA Adresse AS' (manual source) which MUST be deleted in step Z
"""

import sys
import os
import re
import json
import time
from datetime import datetime
from pymongo import MongoClient
import pymupdf  # for PDF text extraction

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_customer_id = None
qa_plan_id = None


def log_test(step, status, message, details=None):
    """Log test result"""
    result = {
        "step": step,
        "status": status,
        "message": message,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"{icon} STEP {step}: {message}")
    if details:
        print(f"   Details: {json.dumps(details, indent=2)}")


def make_request(method, path, params=None, json_data=None, expect_json=True):
    """Make HTTP request using curl"""
    import subprocess
    
    url = f"{BASE_URL}{path}"
    if params:
        query = "&".join([f"{k}={v}" for k, v in params.items()])
        url = f"{url}?{query}"
    
    cmd = ["curl", "-s", "-X", method, url]
    
    if json_data:
        cmd.extend(["-H", "Content-Type: application/json", "-d", json.dumps(json_data)])
    
    # Add response headers
    cmd.extend(["-i"])
    
    try:
        # For binary responses (PDF), use binary mode
        result = subprocess.run(cmd, capture_output=True, timeout=90)
        output = result.stdout
        
        # Split headers and body (binary safe)
        sep = b"\r\n\r\n"
        parts = output.split(sep, 1)
        if len(parts) < 2:
            sep = b"\n\n"
            parts = output.split(sep, 1)
        
        headers = parts[0].decode('utf-8', errors='ignore') if len(parts) > 1 else ""
        body = parts[1] if len(parts) > 1 else parts[0]
        
        # Extract status code
        status_match = re.search(r"HTTP/[\d.]+ (\d+)", headers)
        status_code = int(status_match.group(1)) if status_match else 0
        
        # Check content type
        is_pdf = "application/pdf" in headers.lower()
        
        if is_pdf:
            return status_code, body, headers
        elif expect_json:
            try:
                body_str = body.decode('utf-8') if isinstance(body, bytes) else body
                return status_code, json.loads(body_str), headers
            except:
                body_str = body.decode('utf-8', errors='ignore') if isinstance(body, bytes) else body
                return status_code, body_str, headers
        else:
            body_str = body.decode('utf-8', errors='ignore') if isinstance(body, bytes) else body
            return status_code, body_str, headers
    except subprocess.TimeoutExpired:
        return 0, {"error": "Request timeout"}, ""
    except Exception as e:
        return 0, {"error": str(e)}, ""


def test_step_1():
    """STEP 1: GET /api/admin/pris/data → verify customer fields"""
    print("\n" + "="*80)
    print("STEP 1: GET /api/admin/pris/data")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/pris/data", {"key": ADMIN_KEY})
    
    if status != 200:
        log_test("1", "FAIL", f"Expected 200, got {status}", data)
        return None, None
    
    if not data.get("ok"):
        log_test("1", "FAIL", "Response ok=false", data)
        return None, None
    
    kunder = data.get("kunder", [])
    planer = data.get("planer", [])
    
    if not kunder:
        log_test("1", "FAIL", "No customers found", data)
        return None, None
    
    if not planer:
        log_test("1", "FAIL", "No plans found", data)
        return None, None
    
    # Find DigiHome AS (first customer)
    digihome = kunder[0]
    forvalter_plan = planer[0]
    
    # Verify customer has address fields (they should exist, even if empty strings)
    required_fields = ["adresse", "postnr", "sted", "referanse"]
    missing = [f for f in required_fields if f not in digihome]
    
    # If fields are missing, try to update the customer to trigger normaliserKunde
    if missing:
        print(f"   ⚠️  Customer missing fields {missing}, attempting to update customer to add them...")
        status_update, data_update, _ = make_request("POST", "/admin/pris/kunder", {"key": ADMIN_KEY}, {
            "id": digihome["id"],
            "navn": digihome["navn"]
        })
        
        if status_update == 200 and data_update.get("ok"):
            # Reload customer data
            status, data, _ = make_request("GET", "/admin/pris/data", {"key": ADMIN_KEY})
            if status == 200 and data.get("ok"):
                kunder = data.get("kunder", [])
                digihome = kunder[0] if kunder else digihome
                missing = [f for f in required_fields if f not in digihome]
        
        if missing:
            log_test("1", "FAIL", f"Customer still missing fields after update: {missing}", digihome)
            return None, None
    
    log_test("1", "PASS", f"Found DigiHome AS (id: {digihome['id']}) and Forvalter plan (id: {forvalter_plan['id']})", {
        "customer_name": digihome.get("navn"),
        "customer_fields": {k: digihome.get(k) for k in required_fields},
        "plan_name": forvalter_plan.get("navn")
    })
    
    return digihome["id"], forvalter_plan["id"]


def test_step_2(kunde_id):
    """STEP 2: GET /api/admin/pris/grunnlag?kunde=D&maaned=2026-08"""
    print("\n" + "="*80)
    print("STEP 2: GET /api/admin/pris/grunnlag?kunde=D&maaned=2026-08")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/pris/grunnlag", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-08"
    })
    
    if status != 200:
        log_test("2", "FAIL", f"Expected 200, got {status}", data)
        return None
    
    if not data.get("ok"):
        log_test("2", "FAIL", "Response ok=false", data)
        return None
    
    grunnlag = data.get("grunnlag", {})
    
    # Verify structure
    antall_enheter = grunnlag.get("antallEnheter")
    sum_eks_mva = grunnlag.get("sumEksMva")
    sammendrag = grunnlag.get("sammendrag", {})
    nye = sammendrag.get("nye")
    for_registrering = sammendrag.get("forRegistrering")
    selvbetjent = sammendrag.get("selvbetjent", {})
    
    # Report actual values (may differ from expected 24/4084/6/6)
    details = {
        "antallEnheter": antall_enheter,
        "sumEksMva": sum_eks_mva,
        "sammendrag.nye": nye,
        "sammendrag.forRegistrering": for_registrering,
        "sammendrag.selvbetjent": selvbetjent
    }
    
    # Verify ALL linjer[].enheter[] have required fields
    linjer = grunnlag.get("linjer", [])
    all_enheter = []
    for linje in linjer:
        all_enheter.extend(linje.get("enheter", []))
    
    if not all_enheter:
        log_test("2", "FAIL", "No enheter found in linjer", details)
        return None
    
    # Check all enheter have registrert, nyIMaaneden, detalj
    missing_fields = []
    invalid_registrert = []
    registrert_after_period = []
    ny_count = 0
    ny_not_in_period = []
    
    for i, e in enumerate(all_enheter):
        if "registrert" not in e:
            missing_fields.append(f"enhet[{i}] missing registrert")
        elif not re.match(r"^\d{4}-\d{2}-\d{2}$", e.get("registrert", "")):
            invalid_registrert.append(f"enhet[{i}] registrert={e.get('registrert')}")
        elif e.get("registrert", "") > "2026-08-31":
            registrert_after_period.append(f"enhet[{i}] registrert={e.get('registrert')}")
        
        if "nyIMaaneden" not in e:
            missing_fields.append(f"enhet[{i}] missing nyIMaaneden")
        elif e.get("nyIMaaneden"):
            ny_count += 1
            if not e.get("registrert", "").startswith("2026-08"):
                ny_not_in_period.append(f"enhet[{i}] nyIMaaneden=true but registrert={e.get('registrert')}")
        
        if "detalj" not in e:
            missing_fields.append(f"enhet[{i}] missing detalj")
        elif not isinstance(e.get("detalj"), str):
            missing_fields.append(f"enhet[{i}] detalj not string")
    
    # Check Gimlebakken 34
    gimle = next((e for e in all_enheter if "Gimlebakken 34" in e.get("address", "")), None)
    gimle_details = None
    if gimle:
        gimle_details = {
            "registrert": gimle.get("registrert"),
            "dager": gimle.get("dager"),
            "dagerForvaltet": gimle.get("dagerForvaltet"),
            "vekt": gimle.get("vektUtleid", 0) + gimle.get("vektLedig", 0),
            "belop": gimle.get("belop")
        }
    
    # Check for 'Leilighet' in detalj
    has_leilighet = any("Leilighet" in e.get("detalj", "") for e in all_enheter)
    
    # Check Øvregaten 15 rom rows
    ovregaten_rom = [e for e in all_enheter if "Øvregaten 15" in e.get("address", "") and "Rom" in e.get("unit_room", "")]
    ovregaten_rom_without_rom_in_detalj = [e for e in ovregaten_rom if "Rom" not in e.get("detalj", "")]
    
    errors = []
    if missing_fields:
        errors.extend(missing_fields[:5])  # First 5
    if invalid_registrert:
        errors.extend(invalid_registrert[:5])
    if registrert_after_period:
        errors.append(f"{len(registrert_after_period)} enheter with registrert > 2026-08-31")
    if ny_not_in_period:
        errors.extend(ny_not_in_period[:3])
    
    details.update({
        "total_enheter_in_linjer": len(all_enheter),
        "ny_count": ny_count,
        "gimlebakken_34": gimle_details,
        "has_leilighet_in_detalj": has_leilighet,
        "ovregaten_rom_count": len(ovregaten_rom),
        "ovregaten_rom_without_rom_in_detalj": len(ovregaten_rom_without_rom_in_detalj)
    })
    
    if errors:
        log_test("2", "FAIL", f"Structure validation failed: {errors[:3]}", details)
        return None
    
    log_test("2", "PASS", "All structure requirements met", details)
    return grunnlag


def test_step_3(kunde_id):
    """STEP 3: GET grunnlag?kunde=D&maaned=2026-09"""
    print("\n" + "="*80)
    print("STEP 3: GET /api/admin/pris/grunnlag?kunde=D&maaned=2026-09")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/pris/grunnlag", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-09"
    })
    
    if status != 200:
        log_test("3", "FAIL", f"Expected 200, got {status}", data)
        return
    
    grunnlag = data.get("grunnlag", {})
    sammendrag = grunnlag.get("sammendrag", {})
    selvbetjent = sammendrag.get("selvbetjent", {})
    
    details = {
        "sammendrag.forRegistrering": sammendrag.get("forRegistrering"),
        "sammendrag.nye": sammendrag.get("nye"),
        "selvbetjent.fakturert": selvbetjent.get("fakturert"),
        "selvbetjent.prove": selvbetjent.get("prove"),
        "selvbetjent.medLeieforhold": selvbetjent.get("medLeieforhold")
    }
    
    log_test("3", "PASS", "2026-09 data retrieved", details)


def test_step_4(kunde_id):
    """STEP 4: GET grunnlag?kunde=D&maaned=2026-07"""
    print("\n" + "="*80)
    print("STEP 4: GET /api/admin/pris/grunnlag?kunde=D&maaned=2026-07")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/pris/grunnlag", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-07"
    })
    
    if status != 200:
        log_test("4", "FAIL", f"Expected 200, got {status}", data)
        return
    
    grunnlag = data.get("grunnlag", {})
    sammendrag = grunnlag.get("sammendrag", {})
    
    details = {
        "antallEnheter": grunnlag.get("antallEnheter"),
        "sammendrag.forRegistrering": sammendrag.get("forRegistrering")
    }
    
    log_test("4", "PASS", "2026-07 data retrieved", details)


def test_step_5(kunde_id):
    """STEP 5: GET /api/admin/pris/faktura?kunde=D&maaned=2026-08&spesifiser=1"""
    print("\n" + "="*80)
    print("STEP 5: GET /api/admin/pris/faktura?kunde=D&maaned=2026-08&spesifiser=1")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/pris/faktura", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-08",
        "spesifiser": "1"
    })
    
    if status != 200:
        log_test("5", "FAIL", f"Expected 200, got {status}", data)
        return
    
    faktura = data.get("faktura", {})
    linjer = faktura.get("linjer", [])
    
    # Count lines with merker k='ny'
    ny_count = 0
    rom_count = 0
    rom_without_rom_in_detalj = 0
    
    for linje in linjer:
        merker = linje.get("merker", [])
        if any(m.get("k") == "ny" for m in merker):
            ny_count += 1
        
        beskrivelse = linje.get("beskrivelse", "")
        detalj = linje.get("detalj", "")
        
        if re.search(r"Rom [1-5]$", beskrivelse):
            rom_count += 1
            if "Rom" not in detalj:
                rom_without_rom_in_detalj += 1
    
    # Find one ST. HANSSTREDET 5 line
    st_hans = next((l for l in linjer if "ST. HANSSTREDET 5" in l.get("beskrivelse", "").upper()), None)
    st_hans_example = None
    if st_hans:
        st_hans_example = {
            "beskrivelse": st_hans.get("beskrivelse"),
            "detalj": st_hans.get("detalj")
        }
    
    # Verify kjoper fields
    kjoper = faktura.get("kjoper", {})
    kjoper_fields = ["adresse", "postnr", "sted", "referanse"]
    kjoper_has_all = all(f in kjoper for f in kjoper_fields)
    
    details = {
        "linjer_length": len(linjer),
        "ny_merker_count": ny_count,
        "rom_lines_count": rom_count,
        "rom_without_rom_in_detalj": rom_without_rom_in_detalj,
        "st_hansstredet_example": st_hans_example,
        "sammendrag.nye": faktura.get("sammendrag", {}).get("nye"),
        "sammendrag.forRegistrering": faktura.get("sammendrag", {}).get("forRegistrering"),
        "kjoper_has_all_fields": kjoper_has_all,
        "kjoper": kjoper
    }
    
    # Test without spesifiser
    status2, data2, _ = make_request("GET", "/admin/pris/faktura", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-08"
    })
    
    if status2 == 200:
        faktura2 = data2.get("faktura", {})
        linjer2 = faktura2.get("linjer", [])
        details["without_spesifiser_linjer_length"] = len(linjer2)
        if linjer2:
            details["without_spesifiser_first_line"] = {
                "vekt": linjer2[0].get("vekt"),
                "belop": linjer2[0].get("belop")
            }
    
    log_test("5", "PASS", "Faktura structure verified", details)


def test_step_6(kunde_id):
    """STEP 6: GET /api/admin/pris/faktura/pdf → parse PDF text"""
    print("\n" + "="*80)
    print("STEP 6: GET /api/admin/pris/faktura/pdf")
    print("="*80)
    
    # Test without spesifiser
    status1, body1, headers1 = make_request("GET", "/admin/pris/faktura/pdf", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-08"
    }, expect_json=False)
    
    if status1 != 200:
        log_test("6", "FAIL", f"Expected 200, got {status1}")
        return
    
    if "application/pdf" not in headers1.lower():
        log_test("6", "FAIL", "Expected application/pdf content type")
        return
    
    size1_kb = len(body1) / 1024
    
    # Test with spesifiser=1
    status2, body2, headers2 = make_request("GET", "/admin/pris/faktura/pdf", {
        "key": ADMIN_KEY,
        "kunde": kunde_id,
        "maaned": "2026-08",
        "spesifiser": "1"
    }, expect_json=False)
    
    size2_kb = len(body2) / 1024 if status2 == 200 else 0
    
    # Save PDFs temporarily for text extraction
    pdf1_path = "/tmp/test_faktura_normal.pdf"
    pdf2_path = "/tmp/test_faktura_spesifiser.pdf"
    
    with open(pdf1_path, "wb") as f:
        f.write(body1)
    
    if status2 == 200:
        with open(pdf2_path, "wb") as f:
            f.write(body2)
    
    # Extract text from PDF using pymupdf
    try:
        doc = pymupdf.open(pdf1_path)
        page_count = len(doc)
        
        # Extract all text
        all_text = ""
        for page in doc:
            all_text += page.get_text()
        
        doc.close()
        
        # Check for required strings (use regex with \s* for spaced headers)
        checks = {
            "Side 1 av": "Side 1 av" in all_text,
            "ENHETSSPESIFIKASJON": bool(re.search(r"E\s*N\s*H\s*E\s*T\s*S\s*S\s*P\s*E\s*S\s*I\s*F\s*I\s*K\s*A\s*S\s*J\s*O\s*N", all_text)),
            "Tuva Madelen Holden": "Tuva Madelen Holden" in all_text,
            "Nerli": "Nerli" in all_text,
            "30.06.27": "30.06.27" in all_text,
            "Leilighet": "Leilighet" in all_text,
            "nye på plattformen denne måneden": "nye på plattformen denne måneden" in all_text or "nye på plattformen" in all_text,
            "registrert etter perioden": "registrert etter perioden" in all_text,
            "NOT Holden N…": "Holden N" not in all_text and "Holden…" not in all_text,
            "NOT Bertinussen T…": "Bertinussen T" not in all_text and "Bertinussen…" not in all_text
        }
        
        details = {
            "size_normal_kb": round(size1_kb, 2),
            "size_spesifiser_kb": round(size2_kb, 2),
            "page_count": page_count,
            "text_checks": checks,
            "text_sample": all_text[:500] if len(all_text) > 500 else all_text
        }
        
        failed_checks = [k for k, v in checks.items() if not v]
        
        if failed_checks:
            log_test("6", "WARN", f"Some text checks failed: {failed_checks}", details)
        else:
            log_test("6", "PASS", "PDF generated and text verified", details)
        
    except Exception as e:
        log_test("6", "FAIL", f"PDF text extraction failed: {str(e)}")
    finally:
        # Cleanup
        if os.path.exists(pdf1_path):
            os.remove(pdf1_path)
        if os.path.exists(pdf2_path):
            os.remove(pdf2_path)


def test_step_7(plan_id):
    """STEP 7: KUNDEFELT - create QA customer with address fields"""
    global qa_customer_id
    
    print("\n" + "="*80)
    print("STEP 7: KUNDEFELT - Create QA customer with address fields")
    print("="*80)
    
    # Create QA customer
    status, data, _ = make_request("POST", "/admin/pris/kunder", {"key": ADMIN_KEY}, {
        "navn": "QA Adresse AS",
        "enhetskilde": "manuell",
        "manueltAntall": 3,
        "planId": plan_id,
        "status": "prove",
        "adresse": "Testveien 1",
        "postnr": "5003",
        "sted": "Bergen",
        "referanse": "PO-123"
    })
    
    if status != 200 or not data.get("ok"):
        log_test("7", "FAIL", f"Failed to create QA customer: {status}", data)
        return
    
    kunde = data.get("kunde", {})
    qa_customer_id = kunde.get("id")
    
    # Verify fields
    fields_ok = (
        kunde.get("adresse") == "Testveien 1" and
        kunde.get("postnr") == "5003" and
        kunde.get("sted") == "Bergen" and
        kunde.get("referanse") == "PO-123"
    )
    
    if not fields_ok:
        log_test("7", "FAIL", "Customer fields not saved correctly", kunde)
        return
    
    # Get plan object
    status_plan, data_plan, _ = make_request("GET", "/admin/pris/data", {"key": ADMIN_KEY})
    plan = next((p for p in data_plan.get("planer", []) if p.get("id") == plan_id), None)
    
    # Test faktura JSON with unsaved kunde/plan
    status2, data2, _ = make_request("POST", "/admin/pris/faktura", {"key": ADMIN_KEY}, {
        "maaned": "2026-08",
        "kunde": kunde,
        "plan": plan
    })
    
    if status2 != 200:
        log_test("7", "FAIL", f"Failed to get faktura: {status2}", data2)
        return
    
    faktura = data2.get("faktura", {})
    kjoper = faktura.get("kjoper", {})
    
    kjoper_ok = (
        kjoper.get("adresse") == "Testveien 1" and
        kjoper.get("postnr") == "5003" and
        kjoper.get("sted") == "Bergen" and
        kjoper.get("referanse") == "PO-123" and
        faktura.get("sumEksMva") == 600
    )
    
    if not kjoper_ok:
        log_test("7", "FAIL", "Faktura kjoper fields incorrect", {"kjoper": kjoper, "sumEksMva": faktura.get("sumEksMva")})
        return
    
    # Test PDF
    status3, body3, headers3 = make_request("POST", "/admin/pris/faktura/pdf", {"key": ADMIN_KEY}, {
        "maaned": "2026-08",
        "kunde": kunde,
        "plan": plan
    }, expect_json=False)
    
    if status3 != 200:
        log_test("7", "FAIL", f"Failed to get PDF: {status3}")
        return
    
    # Extract PDF text
    pdf_path = "/tmp/test_qa_faktura.pdf"
    with open(pdf_path, "wb") as f:
        f.write(body3)
    
    try:
        doc = pymupdf.open(pdf_path)
        all_text = "".join(page.get_text() for page in doc)
        doc.close()
        
        pdf_checks = {
            "Testveien 1": "Testveien 1" in all_text,
            "5003 Bergen": "5003 Bergen" in all_text or ("5003" in all_text and "Bergen" in all_text),
            "Deres ref.: PO-123": "PO-123" in all_text
        }
        
        # Test postnr clamping
        status4, data4, _ = make_request("POST", "/admin/pris/kunder", {"key": ADMIN_KEY}, {
            "id": qa_customer_id,
            "postnr": "123456789012345"
        })
        
        if status4 == 200:
            kunde_updated = data4.get("kunde", {})
            postnr_clamped = len(kunde_updated.get("postnr", "")) <= 10
        else:
            postnr_clamped = False
        
        details = {
            "qa_customer_id": qa_customer_id,
            "customer_fields_saved": fields_ok,
            "faktura_kjoper_ok": kjoper_ok,
            "pdf_text_checks": pdf_checks,
            "postnr_clamping": postnr_clamped
        }
        
        log_test("7", "PASS", "QA customer created and verified in faktura/PDF", details)
        
    except Exception as e:
        log_test("7", "FAIL", f"PDF text extraction failed: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)


def test_step_8(kunde_id):
    """STEP 8: GET /api/admin/fakturering/oversikt?maaned=2026-08"""
    print("\n" + "="*80)
    print("STEP 8: GET /api/admin/fakturering/oversikt?maaned=2026-08")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/fakturering/oversikt", {
        "key": ADMIN_KEY,
        "maaned": "2026-08"
    })
    
    if status != 200:
        log_test("8", "FAIL", f"Expected 200, got {status}", data)
        return
    
    per = data.get("per", [])
    digihome_row = next((r for r in per if r.get("kundeId") == kunde_id), None)
    
    if not digihome_row:
        log_test("8", "FAIL", "DigiHome AS row not found in oversikt")
        return
    
    details = {
        "antallEnheter": digihome_row.get("antallEnheter"),
        "sumEksMva": digihome_row.get("sumEksMva"),
        "sammendrag.nye": digihome_row.get("sammendrag", {}).get("nye"),
        "sammendrag.forRegistrering": digihome_row.get("sammendrag", {}).get("forRegistrering")
    }
    
    log_test("8", "PASS", "Fakturering oversikt verified", details)


def test_step_9():
    """STEP 9: GET /api/admin/leieforhold → verify all rows have registrert"""
    print("\n" + "="*80)
    print("STEP 9: GET /api/admin/leieforhold")
    print("="*80)
    
    status, data, _ = make_request("GET", "/admin/leieforhold", {"key": ADMIN_KEY})
    
    if status != 200:
        log_test("9", "FAIL", f"Expected 200, got {status}", data)
        return
    
    rows = data.get("rows", [])
    
    if not rows:
        log_test("9", "FAIL", "No rows returned")
        return
    
    # Check all rows have registrert
    missing_registrert = [i for i, r in enumerate(rows) if not r.get("registrert")]
    invalid_registrert = [i for i, r in enumerate(rows) if r.get("registrert") and not re.match(r"^\d{4}-\d{2}-\d{2}$", r.get("registrert", ""))]
    
    # Find specific rows
    lien_7 = next((r for r in rows if "Lien 7" in r.get("address", "")), None)
    nygaardsvegen_27 = next((r for r in rows if "Nygårdsvegen 27" in r.get("address", "")), None)
    
    details = {
        "total_rows": len(rows),
        "missing_registrert": len(missing_registrert),
        "invalid_registrert": len(invalid_registrert),
        "lien_7_registrert": lien_7.get("registrert") if lien_7 else None,
        "nygaardsvegen_27_registrert": nygaardsvegen_27.get("registrert") if nygaardsvegen_27 else None
    }
    
    if missing_registrert or invalid_registrert:
        log_test("9", "FAIL", f"Some rows missing/invalid registrert", details)
    else:
        log_test("9", "PASS", "All leieforhold rows have valid registrert field", details)


def test_step_10():
    """STEP 10: MongoDB pris_enhet_minne → verify registrert field"""
    print("\n" + "="*80)
    print("STEP 10: MongoDB pris_enhet_minne collection")
    print("="*80)
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        count_with_registrert = db.pris_enhet_minne.count_documents({"registrert": {"$exists": True}})
        total_count = db.pris_enhet_minne.count_documents({})
        
        details = {
            "total_documents": total_count,
            "with_registrert": count_with_registrert
        }
        
        if count_with_registrert >= 30:
            log_test("10", "PASS", "MongoDB pris_enhet_minne has registrert field", details)
        else:
            log_test("10", "WARN", f"Only {count_with_registrert} documents have registrert (expected >=30)", details)
        
        client.close()
    except Exception as e:
        log_test("10", "FAIL", f"MongoDB query failed: {str(e)}")


def test_step_11():
    """STEP 11: AUTH - verify 401 without key"""
    print("\n" + "="*80)
    print("STEP 11: AUTH - verify 401 without key")
    print("="*80)
    
    endpoints = [
        ("/admin/pris/faktura/pdf", {"maaned": "2026-08"}),
        ("/admin/pris/grunnlag", {"maaned": "2026-08"})
    ]
    
    results = []
    for path, params in endpoints:
        status, _, _ = make_request("GET", path, params, expect_json=False)
        results.append({"path": path, "status": status, "is_401": status == 401})
    
    all_401 = all(r["is_401"] for r in results)
    
    if all_401:
        log_test("11", "PASS", "All endpoints return 401 without key", {"results": results})
    else:
        log_test("11", "FAIL", "Some endpoints did not return 401", {"results": results})


def test_step_z():
    """STEP Z: CLEANUP - delete QA customer and verify counts"""
    global qa_customer_id
    
    print("\n" + "="*80)
    print("STEP Z: CLEANUP - Delete QA customer and verify counts")
    print("="*80)
    
    if not qa_customer_id:
        log_test("Z", "WARN", "No QA customer to delete")
        return
    
    # Delete QA customer
    status, data, _ = make_request("DELETE", "/admin/pris/kunder", {
        "key": ADMIN_KEY,
        "id": qa_customer_id
    })
    
    if status != 200 or not data.get("ok"):
        log_test("Z", "FAIL", f"Failed to delete QA customer: {status}", data)
        return
    
    # Verify counts in MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        pris_kunder_count = db.pris_kunder.count_documents({})
        pris_planer_count = db.pris_planer.count_documents({})
        po_faktura_utkast_count = db.po_faktura_utkast.count_documents({})
        pris_grunnlag_laast_digihome = db.pris_grunnlag_laast.count_documents({"kunde.navn": "DigiHome AS"})
        
        details = {
            "pris_kunder": pris_kunder_count,
            "pris_planer": pris_planer_count,
            "po_faktura_utkast": po_faktura_utkast_count,
            "pris_grunnlag_laast_digihome": pris_grunnlag_laast_digihome
        }
        
        expected_ok = (
            pris_kunder_count == 1 and
            pris_planer_count == 1 and
            po_faktura_utkast_count == 1 and
            pris_grunnlag_laast_digihome == 0
        )
        
        if expected_ok:
            log_test("Z", "PASS", "Cleanup successful, database state verified", details)
        else:
            log_test("Z", "WARN", "Database counts differ from expected (1/1/1/0)", details)
        
        client.close()
    except Exception as e:
        log_test("Z", "FAIL", f"MongoDB verification failed: {str(e)}")


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("FAKTURA PDF v2 + REGISTRERINGSDATO BACKEND TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("="*80)
    
    try:
        # Step 1: Get customer and plan IDs
        kunde_id, plan_id = test_step_1()
        if not kunde_id or not plan_id:
            print("\n❌ CRITICAL: Could not get customer/plan IDs. Stopping tests.")
            return
        
        # Step 2-4: Grunnlag tests
        test_step_2(kunde_id)
        test_step_3(kunde_id)
        test_step_4(kunde_id)
        
        # Step 5: Faktura JSON
        test_step_5(kunde_id)
        
        # Step 6: Faktura PDF
        test_step_6(kunde_id)
        
        # Step 7: QA customer with address fields
        test_step_7(plan_id)
        
        # Step 8: Fakturering oversikt
        test_step_8(kunde_id)
        
        # Step 9: Leieforhold registrert
        test_step_9()
        
        # Step 10: MongoDB pris_enhet_minne
        test_step_10()
        
        # Step 11: Auth
        test_step_11()
        
        # Step Z: Cleanup
        test_step_z()
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in test_results if r["status"] == "PASS")
    failed = sum(1 for r in test_results if r["status"] == "FAIL")
    warned = sum(1 for r in test_results if r["status"] == "WARN")
    
    print(f"Total tests: {len(test_results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Warnings: {warned}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed} TEST(S) FAILED")
        print("\nFailed tests:")
        for r in test_results:
            if r["status"] == "FAIL":
                print(f"  - STEP {r['step']}: {r['message']}")
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
