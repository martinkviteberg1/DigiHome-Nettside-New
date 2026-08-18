#!/usr/bin/env python3
"""
Backend test for DigiHome Datarom Puls endpoint
Tests the new GET /api/admin/datarom/puls endpoint + regression tests
"""
import requests
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_puls_endpoint():
    """Test (a): GET /api/admin/datarom/puls with valid key"""
    print("\n=== TEST (a): GET /api/admin/datarom/puls with valid key ===")
    try:
        url = f"{BASE_URL}/admin/datarom/puls?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {data}")
        
        # Check structure
        if not data.get('ok'):
            print("❌ FAILED: Response missing 'ok: true'")
            return False
        
        if 'saker' not in data:
            print("❌ FAILED: Response missing 'saker' object")
            return False
        
        if 'signering' not in data:
            print("❌ FAILED: Response missing 'signering' object")
            return False
        
        saker = data['saker']
        signering = data['signering']
        
        # Check saker structure
        required_saker_keys = ['open', 'overdue', 'dueToday']
        for key in required_saker_keys:
            if key not in saker:
                print(f"❌ FAILED: saker missing key '{key}'")
                return False
            if not isinstance(saker[key], int) or saker[key] < 0:
                print(f"❌ FAILED: saker.{key} is not a non-negative integer: {saker[key]}")
                return False
        
        # Check signering structure
        required_signering_keys = ['aktive', 'venterPaa']
        for key in required_signering_keys:
            if key not in signering:
                print(f"❌ FAILED: signering missing key '{key}'")
                return False
            if not isinstance(signering[key], int) or signering[key] < 0:
                print(f"❌ FAILED: signering.{key} is not a non-negative integer: {signering[key]}")
                return False
        
        print(f"✅ PASSED: Structure valid")
        print(f"   saker.open={saker['open']}, overdue={saker['overdue']}, dueToday={saker['dueToday']}")
        print(f"   signering.aktive={signering['aktive']}, venterPaa={signering['venterPaa']}")
        
        # Cross-check with MongoDB
        print("\n--- Cross-checking with MongoDB ---")
        try:
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            
            # Count open tasks (archived != true AND status != 'done')
            tasks_count = db.tasks.count_documents({
                'archived': {'$ne': True},
                'status': {'$ne': 'done'}
            })
            print(f"MongoDB tasks count (archived != true, status != 'done'): {tasks_count}")
            print(f"API saker.open: {saker['open']}")
            
            if tasks_count != saker['open']:
                print(f"❌ FAILED: MongoDB count ({tasks_count}) != API saker.open ({saker['open']})")
                return False
            
            print(f"✅ PASSED: saker.open matches MongoDB count")
            
            # Count active signing jobs (status == 'I_GANG')
            signing_count = db.signering_jobber.count_documents({'status': 'I_GANG'})
            print(f"MongoDB signering_jobber count (status == 'I_GANG'): {signing_count}")
            print(f"API signering.aktive: {signering['aktive']}")
            
            if signing_count != signering['aktive']:
                print(f"❌ FAILED: MongoDB count ({signing_count}) != API signering.aktive ({signering['aktive']})")
                return False
            
            print(f"✅ PASSED: signering.aktive matches MongoDB count")
            
            client.close()
            
        except Exception as e:
            print(f"❌ FAILED: MongoDB cross-check error: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False

def test_puls_no_key():
    """Test (b): GET /api/admin/datarom/puls without key → 401"""
    print("\n=== TEST (b): GET /api/admin/datarom/puls without key → 401 ===")
    try:
        url = f"{BASE_URL}/admin/datarom/puls"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ PASSED: Returns 401 without key")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False

def test_puls_invalid_key():
    """Test (b): GET /api/admin/datarom/puls with invalid key → 401"""
    print("\n=== TEST (b): GET /api/admin/datarom/puls with invalid key → 401 ===")
    try:
        url = f"{BASE_URL}/admin/datarom/puls?key=feilnokkel"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 401:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            return False
        
        print(f"✅ PASSED: Returns 401 with invalid key")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False

def test_oversikt_regression():
    """Test (c): GET /api/admin/datarom/oversikt regression"""
    print("\n=== TEST (c): GET /api/admin/datarom/oversikt regression ===")
    try:
        url = f"{BASE_URL}/admin/datarom/oversikt?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print("❌ FAILED: Response missing 'ok: true'")
            return False
        
        if 'oversikt' not in data:
            print("❌ FAILED: Response missing 'oversikt' object")
            return False
        
        oversikt = data['oversikt']
        required_keys = ['drift', 'pipeline', 'pnl', 'okonomi', 'selskap']
        
        for key in required_keys:
            if key not in oversikt:
                print(f"❌ FAILED: oversikt missing key '{key}'")
                return False
        
        print(f"✅ PASSED: oversikt has all required keys: {required_keys}")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False

def test_leieforhold_regression():
    """Test (d): GET /api/admin/leieforhold regression"""
    print("\n=== TEST (d): GET /api/admin/leieforhold regression ===")
    try:
        url = f"{BASE_URL}/admin/leieforhold?key={ADMIN_KEY}"
        response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print("❌ FAILED: Response missing 'ok: true'")
            return False
        
        if 'rows' not in data:
            print("❌ FAILED: Response missing 'rows' array")
            return False
        
        if not isinstance(data['rows'], list):
            print(f"❌ FAILED: 'rows' is not an array: {type(data['rows'])}")
            return False
        
        print(f"✅ PASSED: Returns ok:true with rows array (length: {len(data['rows'])})")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception: {e}")
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: DigiHome Datarom Puls Endpoint")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    results = []
    
    # Test (a): New endpoint with valid key + MongoDB cross-check
    results.append(("(a) GET /api/admin/datarom/puls with valid key + MongoDB cross-check", test_puls_endpoint()))
    
    # Test (b): Auth tests
    results.append(("(b) GET /api/admin/datarom/puls without key → 401", test_puls_no_key()))
    results.append(("(b) GET /api/admin/datarom/puls with invalid key → 401", test_puls_invalid_key()))
    
    # Test (c): Regression - oversikt
    results.append(("(c) GET /api/admin/datarom/oversikt regression", test_oversikt_regression()))
    
    # Test (d): Regression - leieforhold
    results.append(("(d) GET /api/admin/leieforhold regression", test_leieforhold_regression()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
