#!/usr/bin/env python3
"""
SALGSRADAR Backend Test
Tests the new sales system (Fase 1): FINN ad → analysis → AI styling → public offer page
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test credentials (investor WITHOUT salgsradar module)
INVESTOR_EMAIL = "qa-investor@example.com"
INVESTOR_PASSWORD = "QaInvest12345!"

# Expected example lead
EXAMPLE_LEAD_ADDRESS = "Nordnesveien 25"
EXAMPLE_FINNKODE = "473281470"

def test_salgsradar():
    """Main test function"""
    print("\n" + "="*80)
    print("SALGSRADAR BACKEND TEST")
    print("="*80)
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # ============================================================
        # TEST 1: GET /api/admin/salgsradar/leads with admin key
        # ============================================================
        print("\n[TEST 1] GET /api/admin/salgsradar/leads with admin key")
        try:
            r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY}, timeout=10)
            print(f"Status: {r.status_code}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            
            data = r.json()
            assert data.get("ok") == True, "Expected ok:true"
            assert "leads" in data, "Expected leads array"
            
            leads = data["leads"]
            print(f"Found {len(leads)} leads")
            
            # Find the example lead
            example_lead = None
            for lead in leads:
                if lead.get("adresse") == EXAMPLE_LEAD_ADDRESS:
                    example_lead = lead
                    break
            
            assert example_lead is not None, f"Expected to find lead with address '{EXAMPLE_LEAD_ADDRESS}'"
            print(f"✅ Found example lead: {example_lead.get('adresse')}")
            
            # Verify structure
            required_fields = ["id", "adresse", "pris", "m2", "soverom", "bilder", "tilbudSlug", "stylet", "analyse", "status"]
            for field in required_fields:
                assert field in example_lead, f"Expected field '{field}' in lead"
            
            # Verify specific values
            assert example_lead.get("pris") == 25000, f"Expected pris 25000, got {example_lead.get('pris')}"
            assert example_lead.get("m2") == 62, f"Expected m2 62, got {example_lead.get('m2')}"
            assert example_lead.get("soverom") == 2, f"Expected soverom 2, got {example_lead.get('soverom')}"
            assert isinstance(example_lead.get("bilder"), list), "Expected bilder to be a list"
            assert len(example_lead.get("bilder", [])) > 0, "Expected at least one bilde"
            assert isinstance(example_lead.get("tilbudSlug"), str), "Expected tilbudSlug to be a string"
            assert len(example_lead.get("tilbudSlug", "")) > 10, "Expected tilbudSlug to be non-trivial"
            
            # Verify stylet array
            stylet = example_lead.get("stylet", [])
            assert isinstance(stylet, list), "Expected stylet to be a list"
            assert len(stylet) == 1, f"Expected 1 styled image, got {len(stylet)}"
            stylet_img = stylet[0]
            assert "id" in stylet_img, "Expected id in styled image"
            assert "kildeUrl" in stylet_img, "Expected kildeUrl in styled image"
            assert "stil" in stylet_img, "Expected stil in styled image"
            
            # Verify analyse
            analyse = example_lead.get("analyse", {})
            assert "anbefaltLeie" in analyse, "Expected anbefaltLeie in analyse"
            assert "honorarPct" in analyse, "Expected honorarPct in analyse"
            assert "grunnlag" in analyse, "Expected grunnlag in analyse"
            
            # Store for later tests
            lead_id = example_lead["id"]
            tilbud_slug = example_lead["tilbudSlug"]
            stylet_bilde_id = stylet_img["id"]
            
            print(f"✅ Lead structure verified: id={lead_id}, slug={tilbud_slug}, stylet_id={stylet_bilde_id}")
            print("✅ TEST 1 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 1 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 2: Auth tests
        # ============================================================
        print("\n[TEST 2] Auth tests")
        try:
            # 2a: GET leads without key → 401
            print("  [2a] GET leads without key → 401")
            r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", timeout=10)
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  ✅ 401 without key")
            
            # 2b: Login as investor (without salgsradar module)
            print("  [2b] Login as investor without salgsradar module")
            r = requests.post(f"{BASE_URL}/admin/auth/login", json={
                "email": INVESTOR_EMAIL,
                "password": INVESTOR_PASSWORD
            }, timeout=10)
            assert r.status_code == 200, f"Login failed: {r.status_code}"
            investor_token = r.json().get("token")
            assert investor_token, "Expected token from login"
            
            # Verify user does NOT have salgsradar module
            user_data = r.json().get("user", {})
            moduler = user_data.get("moduler", [])
            assert "salgsradar" not in moduler, f"Expected investor to NOT have salgsradar module, but has: {moduler}"
            print(f"  ✅ Investor logged in, moduler: {moduler} (no salgsradar)")
            
            # 2c: GET leads with investor token → 401
            print("  [2c] GET leads with investor token → 401")
            r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": investor_token}, timeout=10)
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  ✅ 401 with investor token (missing module)")
            
            # 2d: POST hent with investor token → 401
            print("  [2d] POST hent with investor token → 401")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/hent", 
                            params={"key": investor_token},
                            json={"url": "https://www.finn.no/realestate/lettings/ad.html?finnkode=123456789"},
                            timeout=10)
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  ✅ 401 POST hent with investor token")
            
            # 2e: PUT lead with investor token → 401
            print("  [2e] PUT lead with investor token → 401")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": investor_token},
                           json={"id": lead_id, "notat": "test"},
                           timeout=10)
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  ✅ 401 PUT lead with investor token")
            
            # 2f: DELETE lead with investor token → 401
            print("  [2f] DELETE lead with investor token → 401")
            r = requests.delete(f"{BASE_URL}/admin/salgsradar/lead",
                              params={"key": investor_token, "id": lead_id},
                              timeout=10)
            assert r.status_code == 401, f"Expected 401, got {r.status_code}"
            print("  ✅ 401 DELETE lead with investor token")
            
            print("✅ TEST 2 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 2 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 3: POST /api/admin/salgsradar/hent validations
        # ============================================================
        print("\n[TEST 3] POST /api/admin/salgsradar/hent validations")
        try:
            # 3a: Non-finn.no URL → 400
            print("  [3a] Non-finn.no URL → 400")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/hent",
                            params={"key": ADMIN_KEY},
                            json={"url": "https://www.hybel.no/annonse/123"},
                            timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for non-finn.no URL")
            
            # 3b: Invalid URL → 400
            print("  [3b] Invalid URL → 400")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/hent",
                            params={"key": ADMIN_KEY},
                            json={"url": "ikke-en-url"},
                            timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for invalid URL")
            
            # 3c: finn.no URL without finnkode → 400
            print("  [3c] finn.no URL without finnkode → 400")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/hent",
                            params={"key": ADMIN_KEY},
                            json={"url": "https://www.finn.no/realestate/lettings/ad.html"},
                            timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for finn.no URL without finnkode")
            
            print("✅ TEST 3 PASSED (DO NOT test with valid finnkode - unnecessary external traffic)")
            
        except Exception as e:
            print(f"❌ TEST 3 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 4: PUT /api/admin/salgsradar/lead
        # ============================================================
        print("\n[TEST 4] PUT /api/admin/salgsradar/lead")
        try:
            # 4a: Non-existent lead → 404
            print("  [4a] Non-existent lead → 404")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": ADMIN_KEY},
                           json={"id": "finnes-ikke-123", "notat": "test"},
                           timeout=10)
            assert r.status_code == 404, f"Expected 404, got {r.status_code}"
            print("  ✅ 404 for non-existent lead")
            
            # 4b: Invalid status → 400
            print("  [4b] Invalid status → 400")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": ADMIN_KEY},
                           json={"id": lead_id, "status": "tullball"},
                           timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for invalid status")
            
            # 4c: Valid status change → 200
            print("  [4c] Valid status change to 'kontaktet' → 200")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": ADMIN_KEY},
                           json={"id": lead_id, "status": "kontaktet"},
                           timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            data = r.json()
            assert data.get("ok") == True, "Expected ok:true"
            print("  ✅ Status changed to 'kontaktet'")
            
            # Verify in GET
            r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY}, timeout=10)
            leads = r.json().get("leads", [])
            updated_lead = next((l for l in leads if l["id"] == lead_id), None)
            assert updated_lead is not None, "Lead not found after update"
            assert updated_lead.get("status") == "kontaktet", f"Expected status 'kontaktet', got {updated_lead.get('status')}"
            print("  ✅ Status verified in GET")
            
            # 4d: Update notat → 200
            print("  [4d] Update notat → 200")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": ADMIN_KEY},
                           json={"id": lead_id, "notat": "QA-notat"},
                           timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  ✅ Notat updated")
            
            # 4e: Update analyse with honorarPct clamping → 200
            print("  [4e] Update analyse (honorarPct should be clamped to 15 max) → 200")
            r = requests.put(f"{BASE_URL}/admin/salgsradar/lead",
                           params={"key": ADMIN_KEY},
                           json={"id": lead_id, "analyse": {"anbefaltLeie": 27500, "honorarPct": 20}},
                           timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  ✅ Analyse updated")
            
            # Verify clamping
            r = requests.get(f"{BASE_URL}/admin/salgsradar/leads", params={"key": ADMIN_KEY}, timeout=10)
            leads = r.json().get("leads", [])
            updated_lead = next((l for l in leads if l["id"] == lead_id), None)
            assert updated_lead is not None, "Lead not found after analyse update"
            analyse = updated_lead.get("analyse", {})
            assert analyse.get("anbefaltLeie") == 27500, f"Expected anbefaltLeie 27500, got {analyse.get('anbefaltLeie')}"
            assert analyse.get("honorarPct") == 15, f"Expected honorarPct clamped to 15, got {analyse.get('honorarPct')}"
            print(f"  ✅ Analyse verified: anbefaltLeie={analyse.get('anbefaltLeie')}, honorarPct={analyse.get('honorarPct')} (clamped from 20 to 15)")
            
            print("✅ TEST 4 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 4 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 5: POST /api/admin/salgsradar/stil validations
        # ============================================================
        print("\n[TEST 5] POST /api/admin/salgsradar/stil validations (NO REAL AI CALLS)")
        try:
            # 5a: Non-existent lead → 404
            print("  [5a] Non-existent lead → 404")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/stil",
                            params={"key": ADMIN_KEY},
                            json={"leadId": "finnes-ikke-123", "bildeUrl": "https://example.com/bilde.jpg", "stil": "nordisk"},
                            timeout=10)
            assert r.status_code == 404, f"Expected 404, got {r.status_code}"
            print("  ✅ 404 for non-existent lead")
            
            # 5b: Image URL not from ad → 400
            print("  [5b] Image URL not from ad → 400")
            r = requests.post(f"{BASE_URL}/admin/salgsradar/stil",
                            params={"key": ADMIN_KEY},
                            json={"leadId": lead_id, "bildeUrl": "https://eksempel.no/bilde.jpg", "stil": "nordisk"},
                            timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for image URL not from ad")
            
            print("✅ TEST 5 PASSED (DO NOT test with valid leadId+bildeUrl - paid AI call)")
            
        except Exception as e:
            print(f"❌ TEST 5 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 6: Public offer page GET /api/tilbud
        # ============================================================
        print("\n[TEST 6] Public offer page GET /api/tilbud")
        try:
            # 6a: GET without spor → 200 with public data
            print("  [6a] GET /api/tilbud?slug=<slug> without spor → 200")
            r = requests.get(f"{BASE_URL}/tilbud", params={"slug": tilbud_slug}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            
            data = r.json()
            assert data.get("ok") == True, "Expected ok:true"
            assert "tilbud" in data, "Expected tilbud object"
            
            tilbud = data["tilbud"]
            # Verify public fields
            required_public_fields = ["tittel", "adresse", "regnestykke", "stylet", "bilder"]
            for field in required_public_fields:
                assert field in tilbud, f"Expected field '{field}' in tilbud"
            
            # Verify regnestykke
            regnestykke = tilbud.get("regnestykke", {})
            required_regnestykke_fields = ["anbefaltLeie", "honorarMnd", "nettoTilEier", "gevinstMnd"]
            for field in required_regnestykke_fields:
                assert field in regnestykke, f"Expected field '{field}' in regnestykke"
            
            # Verify NO sensitive fields
            sensitive_fields = ["notat", "kontaktLogg", "kontaktTlf", "grunnlag"]
            for field in sensitive_fields:
                assert field not in tilbud, f"Sensitive field '{field}' should NOT be in public tilbud"
                # Also check nested in analyse
                if "analyse" in tilbud:
                    assert "grunnlag" not in tilbud["analyse"], "Sensitive field 'grunnlag' should NOT be in analyse"
            
            print(f"  ✅ Public tilbud verified: {tilbud.get('tittel')}, {tilbud.get('adresse')}")
            print(f"  ✅ Regnestykke: anbefaltLeie={regnestykke.get('anbefaltLeie')}, honorarMnd={regnestykke.get('honorarMnd')}")
            print(f"  ✅ No sensitive fields exposed")
            
            # 6b: GET with spor=1 → 200 and aapninger incremented
            print("  [6b] GET /api/tilbud?slug=<slug>&spor=1 → 200 and aapninger incremented")
            
            # Get current aapninger from DB
            lead_doc = db.salgsradar_leads.find_one({"id": lead_id})
            current_aapninger = lead_doc.get("aapninger", 0) if lead_doc else 0
            print(f"  Current aapninger: {current_aapninger}")
            
            r = requests.get(f"{BASE_URL}/tilbud", params={"slug": tilbud_slug, "spor": "1"}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            
            # Verify aapninger incremented in DB
            lead_doc = db.salgsradar_leads.find_one({"id": lead_id})
            new_aapninger = lead_doc.get("aapninger", 0) if lead_doc else 0
            assert new_aapninger == current_aapninger + 1, f"Expected aapninger to increment from {current_aapninger} to {current_aapninger + 1}, got {new_aapninger}"
            print(f"  ✅ Aapninger incremented to {new_aapninger}")
            
            # 6c: GET with non-existent slug → 404
            print("  [6c] GET /api/tilbud?slug=finnes-ikke → 404")
            r = requests.get(f"{BASE_URL}/tilbud", params={"slug": "finnes-ikke-123"}, timeout=10)
            assert r.status_code == 404, f"Expected 404, got {r.status_code}"
            print("  ✅ 404 for non-existent slug")
            
            print("✅ TEST 6 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 6 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 7: GET /api/tilbud/bilde
        # ============================================================
        print("\n[TEST 7] GET /api/tilbud/bilde")
        try:
            # 7a: GET with valid stylet bilde id → 200 with binary image
            print("  [7a] GET /api/tilbud/bilde?id=<stylet_bilde_id> → 200")
            r = requests.get(f"{BASE_URL}/tilbud/bilde", params={"id": stylet_bilde_id}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            
            # Verify Content-Type is image/*
            content_type = r.headers.get("Content-Type", "")
            assert content_type.startswith("image/"), f"Expected Content-Type image/*, got {content_type}"
            print(f"  ✅ Content-Type: {content_type}")
            
            # Verify binary body > 10000 bytes
            body_length = len(r.content)
            assert body_length > 10000, f"Expected body > 10000 bytes, got {body_length}"
            print(f"  ✅ Binary body size: {body_length} bytes")
            
            # 7b: GET with non-existent id → 404
            print("  [7b] GET /api/tilbud/bilde?id=finnes-ikke → 404")
            r = requests.get(f"{BASE_URL}/tilbud/bilde", params={"id": "finnes-ikke-123"}, timeout=10)
            assert r.status_code == 404, f"Expected 404, got {r.status_code}"
            print("  ✅ 404 for non-existent id")
            
            print("✅ TEST 7 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 7 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 8: POST /api/tilbud/kontakt
        # ============================================================
        print("\n[TEST 8] POST /api/tilbud/kontakt")
        try:
            # 8a: Valid contact form → 200
            print("  [8a] POST /api/tilbud/kontakt with valid data → 200")
            r = requests.post(f"{BASE_URL}/tilbud/kontakt",
                            json={
                                "slug": tilbud_slug,
                                "navn": "QA Test",
                                "telefon": "99887766",
                                "melding": "test"
                            },
                            timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            data = r.json()
            assert data.get("ok") == True, "Expected ok:true"
            print("  ✅ Contact form submitted")
            
            # Verify in DB: kontaktLogg has 1 entry and status is 'dialog'
            lead_doc = db.salgsradar_leads.find_one({"id": lead_id})
            assert lead_doc is not None, "Lead not found in DB"
            kontakt_logg = lead_doc.get("kontaktLogg", [])
            assert len(kontakt_logg) >= 1, f"Expected at least 1 kontaktLogg entry, got {len(kontakt_logg)}"
            latest_kontakt = kontakt_logg[-1]
            assert latest_kontakt.get("navn") == "QA Test", f"Expected navn 'QA Test', got {latest_kontakt.get('navn')}"
            assert latest_kontakt.get("telefon") == "99887766", f"Expected telefon '99887766', got {latest_kontakt.get('telefon')}"
            print(f"  ✅ kontaktLogg verified: {len(kontakt_logg)} entries")
            
            status = lead_doc.get("status")
            assert status == "dialog", f"Expected status 'dialog', got {status}"
            print(f"  ✅ Status changed to 'dialog'")
            
            # Verify notifications with type 'salgsradar' exist
            notifications = list(db.notifications.find({"type": "salgsradar"}))
            assert len(notifications) > 0, "Expected at least one 'salgsradar' notification"
            print(f"  ✅ Found {len(notifications)} 'salgsradar' notifications")
            
            # 8b: Missing navn → 400
            print("  [8b] POST /api/tilbud/kontakt without navn → 400")
            r = requests.post(f"{BASE_URL}/tilbud/kontakt",
                            json={
                                "slug": tilbud_slug,
                                "navn": "",
                                "telefon": "99887766",
                                "melding": "test"
                            },
                            timeout=10)
            assert r.status_code == 400, f"Expected 400, got {r.status_code}"
            print("  ✅ 400 for missing navn")
            
            # 8c: Non-existent slug → 404
            print("  [8c] POST /api/tilbud/kontakt with non-existent slug → 404")
            r = requests.post(f"{BASE_URL}/tilbud/kontakt",
                            json={
                                "slug": "finnes-ikke-123",
                                "navn": "X",
                                "telefon": "1",
                                "melding": "test"
                            },
                            timeout=10)
            assert r.status_code == 404, f"Expected 404, got {r.status_code}"
            print("  ✅ 404 for non-existent slug")
            
            print("✅ TEST 8 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 8 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 9: Regression tests
        # ============================================================
        print("\n[TEST 9] Regression tests")
        try:
            # 9a: GET /api/admin/budsjett/planer
            print("  [9a] GET /api/admin/budsjett/planer → 200")
            r = requests.get(f"{BASE_URL}/admin/budsjett/planer", params={"key": ADMIN_KEY}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  ✅ budsjett/planer working")
            
            # 9b: GET /api/admin/datarom/enhetsokonomi
            print("  [9b] GET /api/admin/datarom/enhetsokonomi → 200")
            r = requests.get(f"{BASE_URL}/admin/datarom/enhetsokonomi", params={"key": ADMIN_KEY}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  ✅ datarom/enhetsokonomi working")
            
            # 9c: GET /api/admin/leieforhold/okonomi
            print("  [9c] GET /api/admin/leieforhold/okonomi → 200")
            r = requests.get(f"{BASE_URL}/admin/leieforhold/okonomi", params={"key": ADMIN_KEY}, timeout=10)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print("  ✅ leieforhold/okonomi working")
            
            print("✅ TEST 9 PASSED")
            
        except Exception as e:
            print(f"❌ TEST 9 FAILED: {e}")
            raise
        
        # ============================================================
        # TEST 10: CLEANUP (MANDATORY)
        # ============================================================
        print("\n[TEST 10] CLEANUP (MANDATORY)")
        try:
            print("  Resetting example lead to original state...")
            
            # Reset lead in MongoDB
            result = db.salgsradar_leads.update_one(
                {"id": lead_id},
                {
                    "$set": {
                        "status": "analysert",
                        "aapninger": 0,
                        "sistAapnet": None,
                        "kontaktLogg": [],
                        "notat": "",
                        "analyse.anbefaltLeie": 25000,
                        "analyse.honorarPct": 8
                    }
                }
            )
            assert result.modified_count == 1, f"Expected to modify 1 lead, modified {result.modified_count}"
            print(f"  ✅ Lead reset: status='analysert', aapninger=0, kontaktLogg=[], notat='', analyse.anbefaltLeie=25000, analyse.honorarPct=8")
            
            # Delete 'salgsradar' notifications
            result = db.notifications.delete_many({"type": "salgsradar"})
            print(f"  ✅ Deleted {result.deleted_count} 'salgsradar' notifications")
            
            # Verify lead still exists
            lead_doc = db.salgsradar_leads.find_one({"id": lead_id})
            assert lead_doc is not None, "Lead should still exist after cleanup"
            assert lead_doc.get("adresse") == EXAMPLE_LEAD_ADDRESS, "Lead address should be unchanged"
            print(f"  ✅ Lead still exists: {lead_doc.get('adresse')}")
            
            # Verify styled image still exists
            stylet_doc = db.salgsradar_bilder.find_one({"id": stylet_bilde_id})
            assert stylet_doc is not None, "Styled image should still exist after cleanup"
            print(f"  ✅ Styled image still exists: {stylet_bilde_id}")
            
            print("✅ TEST 10 PASSED (CLEANUP COMPLETE)")
            
        except Exception as e:
            print(f"❌ TEST 10 FAILED: {e}")
            raise
        
        print("\n" + "="*80)
        print("ALL TESTS PASSED ✅")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ TEST SUITE FAILED: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    test_salgsradar()
