#!/usr/bin/env python3
"""
Backend test for PowerOffice Fakturautkast (SalesOrder Draft) feature.
Tests the NEW write integration with PowerOffice Go v2 API.

CRITICAL: This hits the REAL PowerOffice DEMO API (test client "Shd Eiendom AS - API Test Client").
Creating drafts in demo is SAFE. Do NOT try to delete PowerOffice orders.
Only clean up the Mongo collection `po_faktura_utkast` and any QA customer created.
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def test_poweroffice_utkast():
    """Test PowerOffice Fakturautkast (SalesOrder Draft) feature."""
    
    print("\n" + "="*80)
    print("POWEROFFICE FAKTURAUTKAST TEST")
    print("="*80)
    
    qa_customer_id = None
    test_maaned = '2026-04'
    
    try:
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 1: GET /api/admin/pris/data → 200, note a customer id
        # ────────────────────────────────────────────────────────────────────────────
        print("\n[STEP 1] GET /api/admin/pris/data to find existing customer...")
        r = requests.get(f"{API_URL}/admin/pris/data", params={'key': ADMIN_KEY}, timeout=30)
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        data = r.json()
        assert data.get('ok') == True, "Expected ok:true"
        
        kunder = data.get('kunder', [])
        planer = data.get('planer', [])
        
        print(f"Found {len(kunder)} customers, {len(planer)} plans")
        
        # Try to find an existing customer (preferably 'DigiHome AS')
        kunde_id = None
        if kunder:
            # Prefer platform customer
            for k in kunder:
                if k.get('enhetskilde') == 'plattform':
                    kunde_id = k.get('id')
                    print(f"✅ Found platform customer: {k.get('navn')} (id: {kunde_id})")
                    break
            
            # Fallback to any customer
            if not kunde_id:
                kunde_id = kunder[0].get('id')
                print(f"✅ Using first customer: {kunder[0].get('navn')} (id: {kunde_id})")
        
        # If no customer exists, create a manual QA customer
        if not kunde_id:
            print("No existing customer found. Creating QA customer...")
            
            # Need a plan ID
            if not planer:
                print("❌ ERROR: No plans exist. Cannot create customer without a plan.")
                return
            
            plan_id = planer[0].get('id')
            print(f"Using plan: {planer[0].get('navn')} (id: {plan_id})")
            
            # Create QA customer
            qa_customer_body = {
                'navn': 'QA PO Kunde',
                'orgnr': '835595242',  # Valid test org number
                'enhetskilde': 'manuell',
                'manueltAntall': 31,
                'planId': plan_id,
                'status': 'aktiv'
            }
            
            print(f"Creating QA customer: {qa_customer_body}")
            r_create = requests.post(
                f"{API_URL}/admin/pris/kunder",
                params={'key': ADMIN_KEY},
                json=qa_customer_body,
                timeout=30
            )
            print(f"Create customer status: {r_create.status_code}")
            assert r_create.status_code == 200, f"Failed to create customer: {r_create.status_code}"
            
            create_result = r_create.json()
            assert create_result.get('ok') == True, "Expected ok:true from customer creation"
            
            kunde_id = create_result.get('kunde', {}).get('id')
            qa_customer_id = kunde_id
            print(f"✅ Created QA customer with id: {kunde_id}")
        
        print(f"\n✅ STEP 1 PASSED: Using customer id: {kunde_id}")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 2: GET /api/admin/pris/poweroffice/utkast?maaned=2026-04 → 200
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 2] GET /api/admin/pris/poweroffice/utkast?maaned={test_maaned} (status before)...")
        r = requests.get(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY, 'maaned': test_maaned},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        status_before = r.json()
        print(f"Response: {json.dumps(status_before, indent=2)}")
        
        assert status_before.get('ok') == True, "Expected ok:true"
        assert status_before.get('konfigurert') == True, "Expected konfigurert:true"
        assert status_before.get('env') == 'demo', "Expected env:'demo'"
        assert 'utkast' in status_before, "Expected utkast array"
        
        initial_utkast_count = len(status_before.get('utkast', []))
        print(f"✅ STEP 2 PASSED: Found {initial_utkast_count} existing drafts for {test_maaned}")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 3: POST /api/admin/pris/poweroffice/utkast {kundeId, maaned} → 200
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 3] POST /api/admin/pris/poweroffice/utkast (create draft)...")
        create_body = {
            'kundeId': kunde_id,
            'maaned': test_maaned
        }
        print(f"Body: {json.dumps(create_body, indent=2)}")
        
        r = requests.post(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY},
            json=create_body,
            timeout=60  # PowerOffice API can be slow
        )
        print(f"Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"Response: {r.text}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        create_result = r.json()
        print(f"Response: {json.dumps(create_result, indent=2)}")
        
        assert create_result.get('ok') == True, "Expected ok:true"
        assert 'utkast' in create_result, "Expected utkast object"
        
        utkast = create_result.get('utkast', {})
        
        # Verify required fields
        assert utkast.get('poOrderId') is not None, "Expected poOrderId (not null)"
        assert utkast.get('poCustomerId') is not None, "Expected poCustomerId"
        
        ext_ref = utkast.get('extRef', '')
        assert ext_ref.startswith('dhlic:'), f"Expected extRef to start with 'dhlic:', got: {ext_ref}"
        assert len(ext_ref) <= 50, f"Expected extRef length ≤50, got: {len(ext_ref)}"
        
        assert utkast.get('status') == 'Draft', f"Expected status:'Draft', got: {utkast.get('status')}"
        
        gui = utkast.get('gui', '')
        assert 'godemo.poweroffice.net' in gui, f"Expected gui to contain 'godemo.poweroffice.net', got: {gui}"
        
        # First call may set opprettetProdukt/opprettetKunde true
        if create_result.get('opprettetProdukt'):
            print("ℹ️  Created product 'Plattformlisens' in PowerOffice (expected on first run)")
        if create_result.get('opprettetKunde'):
            print("ℹ️  Created customer in PowerOffice (expected on first run)")
        
        po_order_id = utkast.get('poOrderId')
        print(f"✅ STEP 3 PASSED: Created draft with poOrderId: {po_order_id}, extRef: {ext_ref}")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 4: IDEMPOTENCY - same POST again (no tvang) → 200 {alleredeOpprettet:true}
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 4] POST same request again (test idempotency)...")
        r = requests.post(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY},
            json=create_body,
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        idempotent_result = r.json()
        print(f"Response: {json.dumps(idempotent_result, indent=2)}")
        
        assert idempotent_result.get('ok') == True, "Expected ok:true"
        assert idempotent_result.get('alleredeOpprettet') == True, "Expected alleredeOpprettet:true"
        
        idempotent_utkast = idempotent_result.get('utkast', {})
        assert idempotent_utkast.get('poOrderId') == po_order_id, f"Expected SAME poOrderId: {po_order_id}, got: {idempotent_utkast.get('poOrderId')}"
        
        print(f"✅ STEP 4 PASSED: Idempotency working (same poOrderId: {po_order_id})")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 5: GET status again → utkast[] now contains the row for that kundeId
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 5] GET /api/admin/pris/poweroffice/utkast?maaned={test_maaned} (status after)...")
        r = requests.get(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY, 'maaned': test_maaned},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        status_after = r.json()
        assert status_after.get('ok') == True, "Expected ok:true"
        
        utkast_list = status_after.get('utkast', [])
        print(f"Found {len(utkast_list)} drafts for {test_maaned}")
        
        # Find our draft
        our_draft = None
        for u in utkast_list:
            if u.get('kundeId') == kunde_id:
                our_draft = u
                break
        
        assert our_draft is not None, f"Expected to find draft for kundeId: {kunde_id}"
        assert our_draft.get('poOrderId') == po_order_id, f"Expected poOrderId: {po_order_id}"
        
        print(f"✅ STEP 5 PASSED: Draft found in status list (kundeId: {kunde_id}, poOrderId: {po_order_id})")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 6: ERRORS - POST with unknown kundeId → 404, POST without key → 401
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 6] Test error cases...")
        
        # 6a: Unknown kundeId → 404
        print("6a: POST with unknown kundeId...")
        r = requests.post(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY},
            json={'kundeId': 'ukjent-kunde-id-xyz', 'maaned': test_maaned},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 404, f"Expected 404 for unknown kundeId, got {r.status_code}"
        
        error_result = r.json()
        assert error_result.get('ok') == False, "Expected ok:false"
        print(f"✅ 6a PASSED: Unknown kundeId returns 404")
        
        # 6b: POST without key → 401
        print("6b: POST without key...")
        r = requests.post(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            json=create_body,
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 401, f"Expected 401 without key, got {r.status_code}"
        print(f"✅ 6b PASSED: POST without key returns 401")
        
        # 6c: GET without key → 401
        print("6c: GET without key...")
        r = requests.get(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'maaned': test_maaned},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 401, f"Expected 401 without key, got {r.status_code}"
        print(f"✅ 6c PASSED: GET without key returns 401")
        
        print(f"✅ STEP 6 PASSED: All error cases working correctly")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 7: FORCE - POST {kundeId, maaned, tvang:true} → 200 (creates new draft)
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 7] POST with tvang:true (force create new draft)...")
        force_body = {
            'kundeId': kunde_id,
            'maaned': test_maaned,
            'tvang': True
        }
        print(f"Body: {json.dumps(force_body, indent=2)}")
        
        r = requests.post(
            f"{API_URL}/admin/pris/poweroffice/utkast",
            params={'key': ADMIN_KEY},
            json=force_body,
            timeout=60
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        force_result = r.json()
        print(f"Response: {json.dumps(force_result, indent=2)}")
        
        assert force_result.get('ok') == True, "Expected ok:true"
        # alleredeOpprettet should be falsy (not present or false)
        assert not force_result.get('alleredeOpprettet'), "Expected alleredeOpprettet to be falsy with tvang:true"
        
        force_utkast = force_result.get('utkast', {})
        new_po_order_id = force_utkast.get('poOrderId')
        
        print(f"✅ STEP 7 PASSED: Force created new draft with poOrderId: {new_po_order_id}")
        
        # ────────────────────────────────────────────────────────────────────────────
        # STEP 8: CLEANUP - delete all po_faktura_utkast docs with maaned:'2026-04'
        # ────────────────────────────────────────────────────────────────────────────
        print(f"\n[STEP 8] CLEANUP...")
        
        # 8a: Delete po_faktura_utkast documents
        print(f"8a: Deleting po_faktura_utkast documents for maaned={test_maaned}...")
        po_utkast_coll = db['po_faktura_utkast']
        delete_result = po_utkast_coll.delete_many({'maaned': test_maaned})
        print(f"Deleted {delete_result.deleted_count} po_faktura_utkast documents")
        
        # Verify cleanup
        remaining = po_utkast_coll.count_documents({'maaned': test_maaned})
        assert remaining == 0, f"Expected 0 remaining documents, found {remaining}"
        print(f"✅ Verified: 0 po_faktura_utkast documents remain for {test_maaned}")
        
        # 8b: Delete QA customer if we created one
        if qa_customer_id:
            print(f"8b: Deleting QA customer (id: {qa_customer_id})...")
            r = requests.delete(
                f"{API_URL}/admin/pris/kunder",
                params={'key': ADMIN_KEY, 'id': qa_customer_id},
                timeout=30
            )
            print(f"Delete customer status: {r.status_code}")
            assert r.status_code == 200, f"Failed to delete QA customer: {r.status_code}"
            
            delete_result = r.json()
            assert delete_result.get('ok') == True, "Expected ok:true from customer deletion"
            print(f"✅ Deleted QA customer")
            
            # Verify customer is gone
            r_verify = requests.get(f"{API_URL}/admin/pris/data", params={'key': ADMIN_KEY}, timeout=30)
            verify_data = r_verify.json()
            verify_kunder = verify_data.get('kunder', [])
            qa_still_exists = any(k.get('id') == qa_customer_id for k in verify_kunder)
            assert not qa_still_exists, "QA customer still exists after deletion"
            print(f"✅ Verified: QA customer removed from pris_kunder")
        else:
            print("8b: No QA customer to delete (used existing customer)")
        
        print(f"✅ STEP 8 PASSED: Cleanup completed successfully")
        
        # ────────────────────────────────────────────────────────────────────────────
        # FINAL SUMMARY
        # ────────────────────────────────────────────────────────────────────────────
        print("\n" + "="*80)
        print("✅ ALL 8 STEPS PASSED - POWEROFFICE FAKTURAUTKAST WORKING PERFECTLY")
        print("="*80)
        print("\nKEY OBSERVATIONS:")
        print(f"  • PowerOffice environment: demo (Shd Eiendom AS - API Test Client)")
        print(f"  • Created draft with poOrderId: {po_order_id}")
        print(f"  • External reference: {ext_ref} (length: {len(ext_ref)} ≤ 50)")
        print(f"  • Status: Draft")
        print(f"  • GUI URL: {gui}")
        print(f"  • Idempotency working (same poOrderId on repeat)")
        print(f"  • Force create working (tvang:true creates new draft)")
        print(f"  • All error cases working (404 for unknown kunde, 401 without auth)")
        print(f"  • Cleanup successful (all test data removed)")
        print("\nNOTE: This feature calls the REAL PowerOffice DEMO API.")
        print("Creating drafts in demo is SAFE. Did NOT delete PowerOffice orders.")
        print("Only cleaned up Mongo collection po_faktura_utkast and QA customer.")
        
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        mongo_client.close()

if __name__ == '__main__':
    success = test_poweroffice_utkast()
    exit(0 if success else 1)
