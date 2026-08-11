#!/usr/bin/env python3
"""
Backend test for Google Ads offline-conversion feature (Steg 1).
Tests POST /api/admin/lead-status wonValue/wonCurrency storage and
GET /api/admin/ads/offline-conversions CSV generation.
"""
import requests
import time
import re

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_google_ads_offline_conversions():
    """Test Google Ads offline-conversion CSV feed with OBVIOUSLY FAKE test data."""
    print("\n" + "="*80)
    print("GOOGLE ADS OFFLINE-CONVERSION BACKEND TEST")
    print("="*80)
    
    created_lead_ids = []
    
    try:
        # ===== TEST 1: Create lead with gclid =====
        print("\n[TEST 1] POST /api/leads with gclid in attribution")
        lead_payload = {
            "name": "QA Won Lead",
            "email": "qa-won@example.test",
            "phone": "+47 90000001",
            "address": "Testveien 1",
            "lead_type": "huseier",
            "source": "qa-ads",
            "attribution": {
                "source": "google",
                "medium": "cpc",
                "gclid": "QA_CONV_GCLID_777"
            }
        }
        
        resp = requests.post(f"{BASE_URL}/leads", json=lead_payload, timeout=30)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 201:
            print(f"❌ FAILED: Expected 201, got {resp.status_code}")
            print(f"Response: {resp.text}")
            return
        
        data = resp.json()
        if not data.get("success"):
            print(f"❌ FAILED: success=false in response")
            print(f"Response: {data}")
            return
        
        lead_id = data.get("data", {}).get("id") or data.get("lead", {}).get("id")
        if not lead_id:
            print(f"❌ FAILED: No lead.id in response")
            print(f"Response: {data}")
            return
        
        created_lead_ids.append(lead_id)
        print(f"✅ PASSED: Lead created with id={lead_id}")
        print(f"   Attribution gclid: {data.get('lead', {}).get('attribution', {}).get('gclid')}")
        
        # ===== TEST 2: Mark lead as won with value =====
        print(f"\n[TEST 2] POST /api/admin/lead-status with status='won', value=25000, currency='NOK'")
        status_payload = {
            "id": lead_id,
            "status": "won",
            "value": 25000,
            "currency": "NOK"
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status",
            params={"key": ADMIN_KEY},
            json=status_payload,
            timeout=30
        )
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text}")
            return
        
        data = resp.json()
        if not data.get("ok") or data.get("status") != "won":
            print(f"❌ FAILED: Expected {{ok:true, status:'won'}}")
            print(f"Response: {data}")
            return
        
        print(f"✅ PASSED: Lead marked as won with value=25000 NOK")
        
        # Wait a moment for DB to settle
        time.sleep(1)
        
        # ===== TEST 3: Get offline-conversions CSV =====
        print(f"\n[TEST 3] GET /api/admin/ads/offline-conversions with key")
        resp = requests.get(
            f"{BASE_URL}/admin/ads/offline-conversions",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {resp.status_code}")
            print(f"Response: {resp.text}")
            return
        
        # Check Content-Type
        content_type = resp.headers.get("Content-Type", "")
        if "text/csv" not in content_type:
            print(f"❌ FAILED: Expected Content-Type containing 'text/csv', got '{content_type}'")
            return
        print(f"✅ Content-Type: {content_type}")
        
        # Check Content-Disposition
        content_disp = resp.headers.get("Content-Disposition", "")
        if "attachment" not in content_disp:
            print(f"❌ FAILED: Expected Content-Disposition with 'attachment', got '{content_disp}'")
            return
        print(f"✅ Content-Disposition: {content_disp}")
        
        # Parse CSV body
        csv_body = resp.text
        lines = csv_body.strip().split('\n')
        
        print(f"\n--- CSV BODY ({len(lines)} lines) ---")
        for i, line in enumerate(lines[:10], 1):  # Print first 10 lines
            print(f"{i}: {line}")
        if len(lines) > 10:
            print(f"... ({len(lines) - 10} more lines)")
        print("--- END CSV BODY ---\n")
        
        # (a) Check first line
        if len(lines) < 1 or lines[0].strip() != "Parameters:TimeZone=Europe/Oslo":
            print(f"❌ FAILED: First line must be exactly 'Parameters:TimeZone=Europe/Oslo'")
            print(f"   Got: '{lines[0] if lines else '(empty)'}'")
            return
        print(f"✅ First line correct: Parameters:TimeZone=Europe/Oslo")
        
        # (b) Check header line
        expected_header = "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Transaction ID"
        if len(lines) < 2 or lines[1].strip() != expected_header:
            print(f"❌ FAILED: Second line must be exactly the header")
            print(f"   Expected: {expected_header}")
            print(f"   Got: '{lines[1] if len(lines) > 1 else '(missing)'}'")
            return
        print(f"✅ Header line correct")
        
        # (c) Check data row for our lead
        found_our_lead = False
        for i, line in enumerate(lines[2:], 3):
            if "QA_CONV_GCLID_777" in line:
                found_our_lead = True
                print(f"\n✅ Found our lead in CSV at line {i}:")
                print(f"   {line}")
                
                # Parse the CSV line (simple split, handle quoted fields)
                parts = []
                current = ""
                in_quotes = False
                for char in line:
                    if char == '"':
                        in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        parts.append(current.strip())
                        current = ""
                    else:
                        current += char
                parts.append(current.strip())
                
                if len(parts) < 6:
                    print(f"❌ FAILED: Expected 6 fields in data row, got {len(parts)}")
                    print(f"   Parts: {parts}")
                    return
                
                gclid, conv_name, conv_time, conv_value, conv_currency, transaction_id = parts[:6]
                
                # Verify gclid
                if gclid != "QA_CONV_GCLID_777":
                    print(f"❌ FAILED: Expected gclid='QA_CONV_GCLID_777', got '{gclid}'")
                    return
                print(f"   ✓ Google Click ID: {gclid}")
                
                # Verify conversion name (default)
                if not conv_name or conv_name == "":
                    print(f"❌ FAILED: Conversion Name is empty")
                    return
                print(f"   ✓ Conversion Name: {conv_name}")
                
                # Verify conversion time format (yyyy-MM-dd HH:mm:ss)
                time_pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
                if not re.match(time_pattern, conv_time):
                    print(f"❌ FAILED: Conversion Time format incorrect")
                    print(f"   Expected format: yyyy-MM-dd HH:mm:ss")
                    print(f"   Got: '{conv_time}'")
                    return
                print(f"   ✓ Conversion Time: {conv_time} (format correct)")
                
                # Verify conversion value
                if conv_value != "25000.00":
                    print(f"❌ FAILED: Expected Conversion Value='25000.00', got '{conv_value}'")
                    return
                print(f"   ✓ Conversion Value: {conv_value}")
                
                # Verify conversion currency
                if conv_currency != "NOK":
                    print(f"❌ FAILED: Expected Conversion Currency='NOK', got '{conv_currency}'")
                    return
                print(f"   ✓ Conversion Currency: {conv_currency}")
                
                # Verify transaction ID matches our lead ID
                if transaction_id != lead_id:
                    print(f"❌ FAILED: Expected Transaction ID='{lead_id}', got '{transaction_id}'")
                    return
                print(f"   ✓ Transaction ID: {transaction_id} (matches lead.id)")
                
                break
        
        if not found_our_lead:
            print(f"❌ FAILED: Our lead with gclid='QA_CONV_GCLID_777' not found in CSV")
            return
        
        print(f"\n✅ PASSED: CSV contains correct data row for our lead")
        
        # ===== TEST 4: Get CSV without key (401) =====
        print(f"\n[TEST 4] GET /api/admin/ads/offline-conversions WITHOUT key")
        resp = requests.get(f"{BASE_URL}/admin/ads/offline-conversions", timeout=30)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {resp.status_code}")
            return
        print(f"✅ PASSED: Returns 401 without key")
        
        # ===== TEST 5: Negative inclusion check (lead without gclid) =====
        print(f"\n[TEST 5] Create lead WITHOUT gclid, mark won, verify NOT in CSV")
        
        lead_no_gclid_payload = {
            "name": "QA No GCLID Lead",
            "email": "qa-no-gclid@example.test",
            "phone": "+47 90000002",
            "address": "Testveien 2",
            "lead_type": "huseier",
            "source": "qa-direct",
            "attribution": {
                "source": "direct"
            }
        }
        
        resp = requests.post(f"{BASE_URL}/leads", json=lead_no_gclid_payload, timeout=30)
        if resp.status_code != 201:
            print(f"❌ FAILED: Could not create second lead, status {resp.status_code}")
            return
        
        data = resp.json()
        lead_id_2 = data.get("data", {}).get("id") or data.get("lead", {}).get("id")
        if not lead_id_2:
            print(f"❌ FAILED: No lead.id in response for second lead")
            return
        
        created_lead_ids.append(lead_id_2)
        print(f"   Created second lead with id={lead_id_2} (no gclid)")
        
        # Mark as won
        status_payload_2 = {
            "id": lead_id_2,
            "status": "won",
            "value": 30000,
            "currency": "NOK"
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status",
            params={"key": ADMIN_KEY},
            json=status_payload_2,
            timeout=30
        )
        if resp.status_code != 200:
            print(f"❌ FAILED: Could not mark second lead as won, status {resp.status_code}")
            return
        print(f"   Marked second lead as won")
        
        time.sleep(1)
        
        # Get CSV again
        resp = requests.get(
            f"{BASE_URL}/admin/ads/offline-conversions",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        if resp.status_code != 200:
            print(f"❌ FAILED: Could not get CSV, status {resp.status_code}")
            return
        
        csv_body_2 = resp.text
        
        # Verify second lead ID does NOT appear in CSV
        if lead_id_2 in csv_body_2:
            print(f"❌ FAILED: Second lead (no gclid) SHOULD NOT appear in CSV but it does")
            print(f"   Lead ID: {lead_id_2}")
            return
        
        print(f"✅ PASSED: Second lead (no gclid) correctly NOT included in CSV")
        
        # ===== TEST 6: Regression tests =====
        print(f"\n[TEST 6] REGRESSION TESTS")
        
        # 6a: Invalid status
        print(f"  6a) POST /api/admin/lead-status with invalid status 'bogus'")
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status",
            params={"key": ADMIN_KEY},
            json={"id": lead_id, "status": "bogus"},
            timeout=30
        )
        if resp.status_code != 400:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
            return
        print(f"  ✅ Returns 400 for invalid status")
        
        # 6b: Unknown id
        print(f"  6b) POST /api/admin/lead-status with unknown id 'nope'")
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status",
            params={"key": ADMIN_KEY},
            json={"id": "nope", "status": "won"},
            timeout=30
        )
        if resp.status_code != 404:
            print(f"  ❌ FAILED: Expected 404, got {resp.status_code}")
            return
        print(f"  ✅ Returns 404 for unknown id")
        
        # 6c: Without key
        print(f"  6c) POST /api/admin/lead-status without key")
        resp = requests.post(
            f"{BASE_URL}/admin/lead-status",
            json={"id": lead_id, "status": "won"},
            timeout=30
        )
        if resp.status_code != 401:
            print(f"  ❌ FAILED: Expected 401, got {resp.status_code}")
            return
        print(f"  ✅ Returns 401 without key")
        
        # 6d: Root endpoint
        print(f"  6d) GET /api/")
        resp = requests.get(f"{BASE_URL}/", timeout=30)
        if resp.status_code != 200:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
            return
        data = resp.json()
        if not data.get("ok"):
            print(f"  ❌ FAILED: Expected {{ok:true}}, got {data}")
            return
        print(f"  ✅ GET /api/ returns 200 {{ok:true}}")
        
        print(f"\n✅ ALL REGRESSION TESTS PASSED")
        
        print("\n" + "="*80)
        print("✅ ALL GOOGLE ADS OFFLINE-CONVERSION TESTS PASSED")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # ===== CLEANUP: Delete QA leads =====
        print(f"\n[CLEANUP] Deleting {len(created_lead_ids)} QA leads")
        for lead_id in created_lead_ids:
            try:
                resp = requests.post(
                    f"{BASE_URL}/admin/delete",
                    params={"key": ADMIN_KEY},
                    json={"id": lead_id},
                    timeout=30
                )
                if resp.status_code == 200:
                    print(f"  ✓ Deleted lead {lead_id}")
                else:
                    print(f"  ⚠ Could not delete lead {lead_id}: {resp.status_code}")
            except Exception as e:
                print(f"  ⚠ Error deleting lead {lead_id}: {e}")
        
        print(f"\n[CLEANUP] Complete")

if __name__ == "__main__":
    test_google_ads_offline_conversions()
