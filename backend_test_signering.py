#!/usr/bin/env python3
"""
Backend test for DigiHome self-healing e-signature status sync (Posten Signering).
Tests T1-T7 as specified in test_result.md.

CRITICAL SAFETY RULES:
- Do NOT create real signature jobs against Posten API
- Do NOT modify or delete any existing documents/jobs in signering_jobber collection
- All tests are non-destructive endpoint tests only
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_t1_diagnose_with_key():
    """T1: GET /api/admin/signering/diagnose?key=... → 200 with ok, ko, sistCronTick, aktive"""
    print("\n=== T1: GET /admin/signering/diagnose WITH KEY ===")
    try:
        url = f"{BASE_URL}/admin/signering/diagnose?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Check required fields
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        if data.get('ko') != 'digihome-saker-preview':
            print(f"❌ FAILED: Expected ko='digihome-saker-preview', got '{data.get('ko')}'")
            return False
        
        if 'sistCronTick' not in data:
            print(f"❌ FAILED: sistCronTick field missing")
            return False
        
        # Check sistCronTick is fresh (< 3 minutes old)
        if data.get('sistCronTick'):
            tick_time = datetime.fromisoformat(data['sistCronTick'].replace('Z', '+00:00'))
            now = datetime.now(tick_time.tzinfo)
            age_seconds = (now - tick_time).total_seconds()
            print(f"sistCronTick: {data['sistCronTick']} (age: {age_seconds:.0f}s)")
            
            if age_seconds > 180:  # 3 minutes
                print(f"⚠️  WARNING: sistCronTick is {age_seconds:.0f}s old (> 3 minutes) - scheduler may not be running")
            else:
                print(f"✓ sistCronTick is fresh (< 3 minutes old)")
        else:
            print(f"sistCronTick: null (scheduler may not have run yet)")
        
        if 'aktive' not in data or not isinstance(data['aktive'], list):
            print(f"❌ FAILED: aktive field missing or not an array")
            return False
        
        print(f"aktive: {len(data['aktive'])} active jobs")
        print(f"✅ T1 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T1 FAILED with exception: {e}")
        return False

def test_t2_diagnose_without_key():
    """T2: GET /api/admin/signering/diagnose WITHOUT KEY → 401"""
    print("\n=== T2: GET /admin/signering/diagnose WITHOUT KEY ===")
    try:
        url = f"{BASE_URL}/admin/signering/diagnose"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✅ T2 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T2 FAILED with exception: {e}")
        return False

def test_t3_poll_with_avstemt():
    """T3: POST /api/admin/signering/poll?key=... → 200 with numeric 'avstemt' field"""
    print("\n=== T3: POST /admin/signering/poll WITH KEY ===")
    try:
        url = f"{BASE_URL}/admin/signering/poll?key={ADMIN_KEY}"
        response = requests.post(url, timeout=15)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        if 'avstemt' not in data:
            print(f"❌ FAILED: avstemt field missing")
            return False
        
        if not isinstance(data['avstemt'], (int, float)):
            print(f"❌ FAILED: avstemt is not numeric, got type {type(data['avstemt'])}")
            return False
        
        print(f"avstemt: {data['avstemt']} (numeric field present)")
        print(f"✅ T3 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T3 FAILED with exception: {e}")
        return False

def test_t4_cron_auth_and_heartbeat():
    """T4: POST /api/cron/signering auth tests and heartbeat update"""
    print("\n=== T4: POST /api/cron/signering AUTH AND HEARTBEAT ===")
    
    # First, get initial sistCronTick
    print("\n--- T4a: Get initial sistCronTick ---")
    try:
        url = f"{BASE_URL}/admin/signering/diagnose?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"❌ FAILED: Could not get initial sistCronTick")
            return False
        
        initial_data = response.json()
        initial_tick = initial_data.get('sistCronTick')
        print(f"Initial sistCronTick: {initial_tick}")
    except Exception as e:
        print(f"❌ T4a FAILED: {e}")
        return False
    
    # Test without auth
    print("\n--- T4b: POST /cron/signering WITHOUT AUTH → 401 ---")
    try:
        url = f"{BASE_URL}/cron/signering"
        response = requests.post(url, timeout=15)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✓ Correctly returned 401 without auth")
    except Exception as e:
        print(f"❌ T4b FAILED: {e}")
        return False
    
    # Test with x-admin-key header
    print("\n--- T4c: POST /cron/signering WITH x-admin-key HEADER → 200 ---")
    try:
        url = f"{BASE_URL}/cron/signering"
        headers = {'x-admin-key': ADMIN_KEY}
        response = requests.post(url, headers=headers, timeout=15)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        print(f"✓ Correctly returned 200 with x-admin-key header")
    except Exception as e:
        print(f"❌ T4c FAILED: {e}")
        return False
    
    # Check sistCronTick was updated
    print("\n--- T4d: Verify sistCronTick was updated ---")
    try:
        import time
        time.sleep(1)  # Small delay to ensure timestamp difference
        
        url = f"{BASE_URL}/admin/signering/diagnose?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"❌ FAILED: Could not get updated sistCronTick")
            return False
        
        updated_data = response.json()
        updated_tick = updated_data.get('sistCronTick')
        print(f"Updated sistCronTick: {updated_tick}")
        
        if not updated_tick:
            print(f"❌ FAILED: sistCronTick is null after cron call")
            return False
        
        if initial_tick and updated_tick:
            initial_time = datetime.fromisoformat(initial_tick.replace('Z', '+00:00'))
            updated_time = datetime.fromisoformat(updated_tick.replace('Z', '+00:00'))
            
            if updated_time <= initial_time:
                print(f"❌ FAILED: sistCronTick was not updated (initial: {initial_tick}, updated: {updated_tick})")
                return False
            
            print(f"✓ sistCronTick was updated (heartbeat working)")
        else:
            print(f"✓ sistCronTick is present: {updated_tick}")
        
        print(f"✅ T4 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T4d FAILED: {e}")
        return False

def test_t5_public_token_endpoint():
    """T5: POST /api/signering-status-token (public) with various payloads"""
    print("\n=== T5: POST /api/signering-status-token (PUBLIC) ===")
    
    # Test with empty body
    print("\n--- T5a: POST with empty body {} → 200 {ok:true, oppdatert:false} ---")
    try:
        url = f"{BASE_URL}/signering-status-token"
        response = requests.post(url, json={}, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        if data.get('oppdatert') != False:
            print(f"❌ FAILED: Expected oppdatert=false, got {data.get('oppdatert')}")
            return False
        
        print(f"✓ Correctly returned 200 with ok:true, oppdatert:false")
    except Exception as e:
        print(f"❌ T5a FAILED: {e}")
        return False
    
    # Test with invalid token
    print("\n--- T5b: POST with invalid token → 200 (never 500) ---")
    try:
        url = f"{BASE_URL}/signering-status-token"
        payload = {"token": "invalid_token_12345", "jobb": "x"}
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        if data.get('oppdatert') != False:
            print(f"❌ FAILED: Expected oppdatert=false, got {data.get('oppdatert')}")
            return False
        
        print(f"✓ Correctly returned 200 (never 500) with invalid token")
        print(f"✅ T5 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T5b FAILED: {e}")
        return False

def test_t6_jobber_no_secret_leak():
    """T6: GET /api/admin/signering/jobber?key=... → NO 'sisteToken' field in response"""
    print("\n=== T6: GET /admin/signering/jobber SECRET LEAK CHECK ===")
    try:
        url = f"{BASE_URL}/admin/signering/jobber?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Check poll.cron field exists
        if 'poll' not in data or 'cron' not in data.get('poll', {}):
            print(f"❌ FAILED: poll.cron field missing")
            return False
        
        print(f"✓ poll.cron field present: {data['poll'].get('cron')}")
        
        # Check NO job contains 'sisteToken' field
        jobber = data.get('jobber', [])
        print(f"Checking {len(jobber)} jobs for sisteToken leak...")
        
        for i, jobb in enumerate(jobber):
            if 'sisteToken' in jobb:
                print(f"❌ FAILED: Job {i} contains 'sisteToken' field (SECRET LEAK!)")
                print(f"Job: {jobb}")
                return False
        
        print(f"✓ NO job contains 'sisteToken' field (secret protected)")
        print(f"✅ T6 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T6 FAILED with exception: {e}")
        return False

def test_t7_regression():
    """T7: REGRESSION tests - signering-puls and admin/tasks"""
    print("\n=== T7: REGRESSION TESTS ===")
    
    # Test signering-puls
    print("\n--- T7a: POST /signering-puls (public) → 200 ---")
    try:
        url = f"{BASE_URL}/signering-puls"
        response = requests.post(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        print(f"✓ signering-puls working")
    except Exception as e:
        print(f"❌ T7a FAILED: {e}")
        return False
    
    # Test admin/tasks
    print("\n--- T7b: GET /admin/tasks?key=... → 200 ---")
    try:
        url = f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            print(f"❌ FAILED: ok field is not true")
            return False
        
        print(f"✓ admin/tasks working")
        print(f"✅ T7 PASSED")
        return True
        
    except Exception as e:
        print(f"❌ T7b FAILED: {e}")
        return False

def main():
    print("=" * 80)
    print("DigiHome Self-Healing E-Signature Status Sync Test")
    print("Testing Posten Signering endpoints (T1-T7)")
    print("=" * 80)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY[:20]}...")
    print("\nCRITICAL SAFETY: All tests are non-destructive endpoint tests only")
    print("=" * 80)
    
    results = {}
    
    # Run all tests
    results['T1'] = test_t1_diagnose_with_key()
    results['T2'] = test_t2_diagnose_without_key()
    results['T3'] = test_t3_poll_with_avstemt()
    results['T4'] = test_t4_cron_auth_and_heartbeat()
    results['T5'] = test_t5_public_token_endpoint()
    results['T6'] = test_t6_jobber_no_secret_leak()
    results['T7'] = test_t7_regression()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test}: {status}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Self-healing e-signature status sync is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    exit(main())
