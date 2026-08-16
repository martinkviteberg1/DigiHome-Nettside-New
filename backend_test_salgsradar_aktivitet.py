#!/usr/bin/env python3
"""
Backend test for Salgsradar aktivitetslogg + preview-tracking.

Tests:
1. loggInnslag - append activity log entries (kontakt/notat/oppgave)
2. loggOppdater - update task completion status
3. loggSlett - delete log entries
4. spor=0 - preview mode should NOT increment aapninger
5. Regression - status/notat updates still work
"""

import requests
import json
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_salgsradar_aktivitet():
    print("=" * 80)
    print("SALGSRADAR AKTIVITETSLOGG + PREVIEW-TRACKING TEST")
    print("=" * 80)
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    leads_coll = db['salgsradar_leads']
    
    # Get an existing lead for testing
    print("\n[SETUP] Getting existing lead for testing...")
    existing_lead = leads_coll.find_one({}, {"id": 1, "tilbudSlug": 1, "aapninger": 1, "sistAapnet": 1, "status": 1, "notat": 1, "logg": 1})
    if not existing_lead:
        print("❌ ERROR: No existing leads found in database")
        return False
    
    lead_id = existing_lead['id']
    tilbud_slug = existing_lead['tilbudSlug']
    original_aapninger = existing_lead.get('aapninger', 0)
    original_sistAapnet = existing_lead.get('sistAapnet')
    original_status = existing_lead.get('status', 'analysert')
    original_notat = existing_lead.get('notat', '')
    original_logg = existing_lead.get('logg', [])
    
    print(f"✓ Using lead: {lead_id}")
    print(f"  - tilbudSlug: {tilbud_slug}")
    print(f"  - Original aapninger: {original_aapninger}")
    print(f"  - Original sistAapnet: {original_sistAapnet}")
    print(f"  - Original status: {original_status}")
    print(f"  - Original notat: '{original_notat}'")
    print(f"  - Original logg entries: {len(original_logg)}")
    
    all_passed = True
    created_log_ids = []
    
    try:
        # ===== TEST 1: loggInnslag - kontakt =====
        print("\n" + "=" * 80)
        print("TEST 1: loggInnslag with type='kontakt'")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "kontakt",
                        "tekst": "Ringte utleier - interessert i tilbudet"
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead'):
                    lead = data['lead']
                    logg = lead.get('logg', [])
                    if len(logg) > len(original_logg):
                        new_entry = logg[-1]
                        if (new_entry.get('type') == 'kontakt' and 
                            'Ringte utleier' in new_entry.get('tekst', '') and
                            new_entry.get('id') and
                            new_entry.get('at')):
                            print(f"✅ PASS: kontakt log entry created")
                            print(f"   - id: {new_entry['id']}")
                            print(f"   - type: {new_entry['type']}")
                            print(f"   - tekst: {new_entry['tekst']}")
                            print(f"   - at: {new_entry['at']}")
                            print(f"   - gjort field: {'gjort' in new_entry} (should be False for kontakt)")
                            created_log_ids.append(new_entry['id'])
                        else:
                            print(f"❌ FAIL: Log entry structure incorrect")
                            print(f"   Entry: {json.dumps(new_entry, indent=2)}")
                            all_passed = False
                    else:
                        print(f"❌ FAIL: No new log entry created")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Response missing ok/lead")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 2: loggInnslag - notat =====
        print("\n" + "=" * 80)
        print("TEST 2: loggInnslag with type='notat'")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "notat",
                        "tekst": "Utleier ønsker møte neste uke"
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead'):
                    lead = data['lead']
                    logg = lead.get('logg', [])
                    new_entry = logg[-1]
                    if (new_entry.get('type') == 'notat' and 
                        'møte neste uke' in new_entry.get('tekst', '')):
                        print(f"✅ PASS: notat log entry created")
                        print(f"   - id: {new_entry['id']}")
                        print(f"   - type: {new_entry['type']}")
                        print(f"   - tekst: {new_entry['tekst']}")
                        created_log_ids.append(new_entry['id'])
                    else:
                        print(f"❌ FAIL: Log entry incorrect")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Response missing ok/lead")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 3: loggInnslag - oppgave =====
        print("\n" + "=" * 80)
        print("TEST 3: loggInnslag with type='oppgave' (should have gjort:false)")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "oppgave",
                        "tekst": "Send tilbud på e-post"
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead'):
                    lead = data['lead']
                    logg = lead.get('logg', [])
                    new_entry = logg[-1]
                    if (new_entry.get('type') == 'oppgave' and 
                        'Send tilbud' in new_entry.get('tekst', '') and
                        new_entry.get('gjort') == False):
                        print(f"✅ PASS: oppgave log entry created with gjort:false")
                        print(f"   - id: {new_entry['id']}")
                        print(f"   - type: {new_entry['type']}")
                        print(f"   - tekst: {new_entry['tekst']}")
                        print(f"   - gjort: {new_entry['gjort']}")
                        created_log_ids.append(new_entry['id'])
                    else:
                        print(f"❌ FAIL: oppgave entry missing gjort:false")
                        print(f"   Entry: {json.dumps(new_entry, indent=2)}")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Response missing ok/lead")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 4: loggInnslag - invalid type =====
        print("\n" + "=" * 80)
        print("TEST 4: loggInnslag with invalid type (should return 400)")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "foo",
                        "tekst": "Invalid type"
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 400:
                data = response.json()
                if 'Ugyldig loggtype' in data.get('error', ''):
                    print(f"✅ PASS: Invalid type rejected with 400 and correct error message")
                    print(f"   Error: {data.get('error')}")
                else:
                    print(f"❌ FAIL: Wrong error message")
                    print(f"   Response: {response.text}")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 400, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 5: loggInnslag - empty text =====
        print("\n" + "=" * 80)
        print("TEST 5: loggInnslag with empty text (should return 400)")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "notat",
                        "tekst": "   "
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 400:
                data = response.json()
                if 'tom' in data.get('error', '').lower():
                    print(f"✅ PASS: Empty text rejected with 400")
                    print(f"   Error: {data.get('error')}")
                else:
                    print(f"❌ FAIL: Wrong error message")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 400, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 6: loggInnslag - text truncation (1000 chars) =====
        print("\n" + "=" * 80)
        print("TEST 6: loggInnslag with text over 1000 chars (should truncate)")
        print("=" * 80)
        try:
            long_text = "A" * 1500
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggInnslag": {
                        "type": "notat",
                        "tekst": long_text
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead'):
                    lead = data['lead']
                    logg = lead.get('logg', [])
                    new_entry = logg[-1]
                    if len(new_entry.get('tekst', '')) == 1000:
                        print(f"✅ PASS: Text truncated to 1000 chars")
                        print(f"   Original length: 1500")
                        print(f"   Stored length: {len(new_entry['tekst'])}")
                        created_log_ids.append(new_entry['id'])
                    else:
                        print(f"❌ FAIL: Text not truncated correctly")
                        print(f"   Length: {len(new_entry.get('tekst', ''))}")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Response missing ok/lead")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 7: loggOppdater - mark oppgave as done =====
        print("\n" + "=" * 80)
        print("TEST 7: loggOppdater - mark oppgave as gjort:true")
        print("=" * 80)
        try:
            # Get the oppgave ID from created_log_ids (3rd entry)
            if len(created_log_ids) >= 3:
                oppgave_id = created_log_ids[2]
                response = requests.put(
                    f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                    json={
                        "id": lead_id,
                        "loggOppdater": {
                            "id": oppgave_id,
                            "gjort": True
                        }
                    },
                    timeout=10
                )
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    # Verify in MongoDB
                    lead_doc = leads_coll.find_one({"id": lead_id}, {"logg": 1})
                    logg = lead_doc.get('logg', [])
                    oppgave_entry = next((e for e in logg if e.get('id') == oppgave_id), None)
                    
                    if oppgave_entry and oppgave_entry.get('gjort') == True:
                        print(f"✅ PASS: oppgave marked as gjort:true")
                        print(f"   - oppgave id: {oppgave_id}")
                        print(f"   - gjort: {oppgave_entry['gjort']}")
                    else:
                        print(f"❌ FAIL: oppgave not updated correctly")
                        print(f"   Entry: {oppgave_entry}")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Expected 200, got {response.status_code}")
                    all_passed = False
            else:
                print(f"❌ FAIL: No oppgave ID available for testing")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 8: loggOppdater - mark oppgave as not done =====
        print("\n" + "=" * 80)
        print("TEST 8: loggOppdater - mark oppgave as gjort:false")
        print("=" * 80)
        try:
            if len(created_log_ids) >= 3:
                oppgave_id = created_log_ids[2]
                response = requests.put(
                    f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                    json={
                        "id": lead_id,
                        "loggOppdater": {
                            "id": oppgave_id,
                            "gjort": False
                        }
                    },
                    timeout=10
                )
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    # Verify in MongoDB
                    lead_doc = leads_coll.find_one({"id": lead_id}, {"logg": 1})
                    logg = lead_doc.get('logg', [])
                    oppgave_entry = next((e for e in logg if e.get('id') == oppgave_id), None)
                    
                    if oppgave_entry and oppgave_entry.get('gjort') == False:
                        print(f"✅ PASS: oppgave marked as gjort:false")
                        print(f"   - oppgave id: {oppgave_id}")
                        print(f"   - gjort: {oppgave_entry['gjort']}")
                    else:
                        print(f"❌ FAIL: oppgave not updated correctly")
                        all_passed = False
                else:
                    print(f"❌ FAIL: Expected 200, got {response.status_code}")
                    all_passed = False
            else:
                print(f"❌ FAIL: No oppgave ID available for testing")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 9: loggOppdater - unknown ID (should not crash) =====
        print("\n" + "=" * 80)
        print("TEST 9: loggOppdater with unknown ID (should not crash)")
        print("=" * 80)
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "loggOppdater": {
                        "id": "unknown-id-12345",
                        "gjort": True
                    }
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"✅ PASS: Unknown ID handled gracefully (200 OK)")
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 10: spor=0 - preview mode should NOT increment aapninger =====
        print("\n" + "=" * 80)
        print("TEST 10: GET /api/tilbud?slug=X&spor=0 (preview - should NOT increment)")
        print("=" * 80)
        try:
            # Read current aapninger and sistAapnet from MongoDB
            lead_before = leads_coll.find_one({"id": lead_id}, {"aapninger": 1, "sistAapnet": 1})
            aapninger_before = lead_before.get('aapninger', 0)
            sistAapnet_before = lead_before.get('sistAapnet')
            
            print(f"Before: aapninger={aapninger_before}, sistAapnet={sistAapnet_before}")
            
            # Call with spor=0 twice
            for i in range(2):
                response = requests.get(
                    f"{BASE_URL}/tilbud?slug={tilbud_slug}&spor=0",
                    timeout=10
                )
                print(f"Call {i+1}: Status {response.status_code}")
                
                if response.status_code != 200:
                    print(f"❌ FAIL: Expected 200, got {response.status_code}")
                    all_passed = False
                    break
            
            # Read again from MongoDB
            lead_after = leads_coll.find_one({"id": lead_id}, {"aapninger": 1, "sistAapnet": 1})
            aapninger_after = lead_after.get('aapninger', 0)
            sistAapnet_after = lead_after.get('sistAapnet')
            
            print(f"After: aapninger={aapninger_after}, sistAapnet={sistAapnet_after}")
            
            if aapninger_after == aapninger_before and sistAapnet_after == sistAapnet_before:
                print(f"✅ PASS: spor=0 did NOT increment aapninger or update sistAapnet")
                print(f"   - aapninger unchanged: {aapninger_before} → {aapninger_after}")
                print(f"   - sistAapnet unchanged: {sistAapnet_before} → {sistAapnet_after}")
            else:
                print(f"❌ FAIL: spor=0 incorrectly modified tracking fields")
                print(f"   - aapninger: {aapninger_before} → {aapninger_after}")
                print(f"   - sistAapnet: {sistAapnet_before} → {sistAapnet_after}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 11: Regression - status update still works =====
        print("\n" + "=" * 80)
        print("TEST 11: Regression - PUT with status still works")
        print("=" * 80)
        try:
            # Change status to 'kontaktet'
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "status": "kontaktet"
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead', {}).get('status') == 'kontaktet':
                    print(f"✅ PASS: Status updated to 'kontaktet'")
                else:
                    print(f"❌ FAIL: Status not updated correctly")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
        # ===== TEST 12: Regression - notat update still works =====
        print("\n" + "=" * 80)
        print("TEST 12: Regression - PUT with notat still works")
        print("=" * 80)
        try:
            test_notat = "Test notat for regression"
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "notat": test_notat
                },
                timeout=10
            )
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and data.get('lead', {}).get('notat') == test_notat:
                    print(f"✅ PASS: Notat updated correctly")
                else:
                    print(f"❌ FAIL: Notat not updated correctly")
                    all_passed = False
            else:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"❌ FAIL: Exception - {e}")
            all_passed = False
        
    finally:
        # ===== CLEANUP: Delete all created log entries =====
        print("\n" + "=" * 80)
        print("CLEANUP: Deleting all created log entries")
        print("=" * 80)
        
        for log_id in created_log_ids:
            try:
                print(f"Deleting log entry: {log_id}")
                response = requests.put(
                    f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                    json={
                        "id": lead_id,
                        "loggSlett": log_id
                    },
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"  ✓ Deleted: {log_id}")
                else:
                    print(f"  ✗ Failed to delete: {log_id} (status {response.status_code})")
            except Exception as e:
                print(f"  ✗ Exception deleting {log_id}: {e}")
        
        # Restore original status and notat
        print(f"\nRestoring original status and notat...")
        try:
            response = requests.put(
                f"{BASE_URL}/admin/salgsradar/lead?key={ADMIN_KEY}",
                json={
                    "id": lead_id,
                    "status": original_status,
                    "notat": original_notat
                },
                timeout=10
            )
            if response.status_code == 200:
                print(f"  ✓ Restored status to '{original_status}' and notat to '{original_notat}'")
            else:
                print(f"  ✗ Failed to restore (status {response.status_code})")
        except Exception as e:
            print(f"  ✗ Exception restoring: {e}")
        
        # Verify cleanup in MongoDB
        print(f"\nVerifying cleanup in MongoDB...")
        final_lead = leads_coll.find_one({"id": lead_id}, {"logg": 1, "status": 1, "notat": 1, "aapninger": 1, "sistAapnet": 1})
        final_logg = final_lead.get('logg', [])
        
        if len(final_logg) == len(original_logg):
            print(f"✅ CLEANUP VERIFIED: logg restored to original length ({len(original_logg)} entries)")
        else:
            print(f"⚠️  WARNING: logg length mismatch (original: {len(original_logg)}, final: {len(final_logg)})")
        
        print(f"Final state:")
        print(f"  - status: {final_lead.get('status')}")
        print(f"  - notat: '{final_lead.get('notat')}'")
        print(f"  - logg entries: {len(final_logg)}")
        print(f"  - aapninger: {final_lead.get('aapninger')}")
        print(f"  - sistAapnet: {final_lead.get('sistAapnet')}")
    
    client.close()
    
    print("\n" + "=" * 80)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 80)
    
    return all_passed

if __name__ == "__main__":
    success = test_salgsradar_aktivitet()
    sys.exit(0 if success else 1)
