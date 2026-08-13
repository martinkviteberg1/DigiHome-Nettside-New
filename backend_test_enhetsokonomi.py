#!/usr/bin/env python3
"""
Backend test for ENHETSØKONOMI I LEIEFORHOLD
Tests the new economy mode endpoints for leieforhold (rental properties)
"""

import asyncio
import aiohttp
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
INVESTOR_EMAIL = "qa-investor@example.com"
INVESTOR_PASSWORD = "QaInvest12345!"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
created_felles_ids = []
created_enhet_ids = []
investor_token = None

async def test_1_get_okonomi_initial(session):
    """Test 1: GET /api/admin/leieforhold/okonomi returns 200 with felles (including Lønn post) and enheter"""
    print("\n=== TEST 1: GET okonomi initial state ===")
    try:
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200:
                print(f"❌ FAILED: Expected 200, got {status}")
                print(f"Response: {data}")
                return False
            
            if not data.get('ok'):
                print(f"❌ FAILED: Response ok is not true")
                print(f"Response: {data}")
                return False
            
            if 'felles' not in data:
                print(f"❌ FAILED: Response missing 'felles' field")
                return False
            
            if 'enheter' not in data:
                print(f"❌ FAILED: Response missing 'enheter' field")
                return False
            
            # Check if Lønn post exists (real data - should NOT be deleted)
            lonn_found = False
            for item in data['felles']:
                if 'Lønn' in item.get('navn', '') and item.get('belop') == 60000:
                    lonn_found = True
                    print(f"✓ Found real 'Lønn — 1 ansatt' post with belop 60000 (will NOT delete this)")
                    break
            
            if not lonn_found:
                print(f"⚠️  WARNING: 'Lønn — 1 ansatt' (60000) not found in felles - may have been deleted or not created yet")
            
            print(f"✅ PASSED: GET okonomi returns 200 with ok:true, felles:{len(data['felles'])} items, enheter:{len(data['enheter'])} items")
            return True
            
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_2_crud_felles(session):
    """Test 2: PUT felles (create), GET (verify), PUT (update), DELETE, GET (verify gone)"""
    print("\n=== TEST 2: CRUD operations on felles ===")
    try:
        # CREATE
        print("Step 2.1: Create new felles cost")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={ADMIN_KEY}"
        body = {
            "navn": "QA Testkostnad",
            "belop": 12345,
            "fordeling": "utleide",
            "kategori": "annet"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200:
                print(f"❌ FAILED: Create expected 200, got {status}")
                print(f"Response: {data}")
                return False
            
            if not data.get('ok') or not data.get('id'):
                print(f"❌ FAILED: Create response missing ok:true or id")
                print(f"Response: {data}")
                return False
            
            felles_id = data['id']
            created_felles_ids.append(felles_id)
            print(f"✓ Created felles with id: {felles_id}")
        
        # VERIFY CREATE
        print("Step 2.2: Verify created felles appears in GET")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            data = await resp.json()
            found = False
            for item in data['felles']:
                if item.get('id') == felles_id:
                    if item.get('navn') == 'QA Testkostnad' and item.get('belop') == 12345:
                        found = True
                        print(f"✓ Found created felles in GET response")
                        break
            
            if not found:
                print(f"❌ FAILED: Created felles not found in GET response")
                return False
        
        # UPDATE
        print("Step 2.3: Update felles belop to 54321")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={ADMIN_KEY}"
        body = {
            "id": felles_id,
            "navn": "QA Testkostnad",
            "belop": 54321,
            "fordeling": "utleide",
            "kategori": "annet"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('ok'):
                print(f"❌ FAILED: Update expected 200 ok:true, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ Updated felles")
        
        # VERIFY UPDATE
        print("Step 2.4: Verify updated belop in GET")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            data = await resp.json()
            found = False
            for item in data['felles']:
                if item.get('id') == felles_id:
                    if item.get('belop') == 54321:
                        found = True
                        print(f"✓ Verified updated belop 54321")
                        break
            
            if not found:
                print(f"❌ FAILED: Updated belop not found in GET response")
                return False
        
        # DELETE
        print("Step 2.5: Delete felles")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={ADMIN_KEY}&id={felles_id}"
        async with session.delete(url) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('ok'):
                print(f"❌ FAILED: Delete expected 200 ok:true, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ Deleted felles")
            created_felles_ids.remove(felles_id)
        
        # VERIFY DELETE
        print("Step 2.6: Verify felles is gone from GET")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            data = await resp.json()
            found = False
            for item in data['felles']:
                if item.get('id') == felles_id:
                    found = True
                    break
            
            if found:
                print(f"❌ FAILED: Deleted felles still appears in GET response")
                return False
            
            print(f"✓ Verified felles is gone")
        
        print(f"✅ PASSED: Full CRUD cycle on felles working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_3_felles_validation(session):
    """Test 3: PUT felles without navn/belop returns 400"""
    print("\n=== TEST 3: Felles validation (missing navn/belop) ===")
    try:
        # Missing navn
        print("Step 3.1: PUT felles without navn")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={ADMIN_KEY}"
        body = {
            "belop": 1000,
            "fordeling": "alle",
            "kategori": "annet"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 400:
                print(f"❌ FAILED: Expected 400, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ PUT without navn returns 400")
        
        # Missing belop
        print("Step 3.2: PUT felles without belop")
        body = {
            "navn": "Test",
            "fordeling": "alle",
            "kategori": "annet"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 400:
                print(f"❌ FAILED: Expected 400, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ PUT without belop returns 400")
        
        # Missing both
        print("Step 3.3: PUT felles without navn and belop")
        body = {
            "fordeling": "alle",
            "kategori": "annet"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 400:
                print(f"❌ FAILED: Expected 400, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ PUT without navn and belop returns 400")
        
        print(f"✅ PASSED: Felles validation working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_4_crud_enhet(session):
    """Test 4: PUT enhet (create), GET (verify), PUT with cac:0 (delete), GET (verify gone)"""
    print("\n=== TEST 4: CRUD operations on enhet ===")
    try:
        enhet_id = "qa-enhet-1"
        
        # CREATE
        print("Step 4.1: Create enhet with cac and notat")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/enhet?key={ADMIN_KEY}"
        body = {
            "enhetId": enhet_id,
            "cac": 9000,
            "notat": "QA test notat"
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('ok'):
                print(f"❌ FAILED: Create expected 200 ok:true, got {status}")
                print(f"Response: {data}")
                return False
            
            created_enhet_ids.append(enhet_id)
            print(f"✓ Created enhet with enhetId: {enhet_id}")
        
        # VERIFY CREATE
        print("Step 4.2: Verify created enhet appears in GET")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            data = await resp.json()
            
            if enhet_id not in data.get('enheter', {}):
                print(f"❌ FAILED: Created enhet not found in GET response")
                print(f"Enheter: {data.get('enheter', {})}")
                return False
            
            enhet_data = data['enheter'][enhet_id]
            if enhet_data.get('cac') != 9000 or enhet_data.get('notat') != 'QA test notat':
                print(f"❌ FAILED: Enhet data mismatch")
                print(f"Expected: cac=9000, notat='QA test notat'")
                print(f"Got: {enhet_data}")
                return False
            
            print(f"✓ Found created enhet in GET response with correct data")
        
        # DELETE (by setting cac:0 and notat:'')
        print("Step 4.3: Delete enhet by setting cac:0 and notat:''")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/enhet?key={ADMIN_KEY}"
        body = {
            "enhetId": enhet_id,
            "cac": 0,
            "notat": ""
        }
        async with session.put(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('ok'):
                print(f"❌ FAILED: Delete expected 200 ok:true, got {status}")
                print(f"Response: {data}")
                return False
            
            if not data.get('slettet'):
                print(f"⚠️  WARNING: Response doesn't have slettet:true, but may still work")
            
            print(f"✓ Deleted enhet")
            created_enhet_ids.remove(enhet_id)
        
        # VERIFY DELETE
        print("Step 4.4: Verify enhet is gone from GET")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            data = await resp.json()
            
            if enhet_id in data.get('enheter', {}):
                print(f"❌ FAILED: Deleted enhet still appears in GET response")
                print(f"Enheter: {data.get('enheter', {})}")
                return False
            
            print(f"✓ Verified enhet is gone")
        
        print(f"✅ PASSED: Full CRUD cycle on enhet working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_5_auth(session):
    """Test 5: Auth - write routes require admin, investor can only read"""
    print("\n=== TEST 5: Authentication and authorization ===")
    global investor_token
    
    try:
        # Test 5.1: Write routes without key return 401
        print("Step 5.1: PUT felles without key returns 401")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles"
        body = {"navn": "Test", "belop": 1000}
        async with session.put(url, json=body) as resp:
            status = resp.status
            if status != 401:
                print(f"❌ FAILED: Expected 401, got {status}")
                return False
            print(f"✓ PUT felles without key returns 401")
        
        print("Step 5.2: DELETE felles without key returns 401")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?id=test"
        async with session.delete(url) as resp:
            status = resp.status
            if status != 401:
                print(f"❌ FAILED: Expected 401, got {status}")
                return False
            print(f"✓ DELETE felles without key returns 401")
        
        print("Step 5.3: PUT enhet without key returns 401")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/enhet"
        body = {"enhetId": "test", "cac": 1000}
        async with session.put(url, json=body) as resp:
            status = resp.status
            if status != 401:
                print(f"❌ FAILED: Expected 401, got {status}")
                return False
            print(f"✓ PUT enhet without key returns 401")
        
        # Test 5.4: Login as investor
        print("Step 5.4: Login as investor")
        url = f"{BASE_URL}/admin/auth/login"
        body = {
            "email": INVESTOR_EMAIL,
            "password": INVESTOR_PASSWORD
        }
        async with session.post(url, json=body) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('token'):
                print(f"❌ FAILED: Login expected 200 with token, got {status}")
                print(f"Response: {data}")
                return False
            
            investor_token = data['token']
            print(f"✓ Logged in as investor, got token")
        
        # Test 5.5: Investor can GET okonomi
        print("Step 5.5: Investor can GET okonomi (read-only)")
        url = f"{BASE_URL}/admin/leieforhold/okonomi?key={investor_token}"
        async with session.get(url) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200 or not data.get('ok'):
                print(f"❌ FAILED: Investor GET expected 200 ok:true, got {status}")
                print(f"Response: {data}")
                return False
            
            print(f"✓ Investor can GET okonomi (read-only access working)")
        
        # Test 5.6: Investor cannot PUT felles
        print("Step 5.6: Investor cannot PUT felles (write blocked)")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={investor_token}"
        body = {"navn": "Investor Test", "belop": 1000}
        async with session.put(url, json=body) as resp:
            status = resp.status
            
            if status != 401:
                print(f"❌ FAILED: Investor PUT felles expected 401, got {status}")
                return False
            
            print(f"✓ Investor cannot PUT felles (401)")
        
        # Test 5.7: Investor cannot PUT enhet
        print("Step 5.7: Investor cannot PUT enhet (write blocked)")
        url = f"{BASE_URL}/admin/leieforhold/okonomi/enhet?key={investor_token}"
        body = {"enhetId": "test", "cac": 1000}
        async with session.put(url, json=body) as resp:
            status = resp.status
            
            if status != 401:
                print(f"❌ FAILED: Investor PUT enhet expected 401, got {status}")
                return False
            
            print(f"✓ Investor cannot PUT enhet (401)")
        
        print(f"✅ PASSED: Authentication and authorization working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_6_leieforhold_enhet_id(session):
    """Test 6: GET /api/admin/leieforhold returns rows with enhet_id field"""
    print("\n=== TEST 6: Leieforhold rows have enhet_id ===")
    try:
        url = f"{BASE_URL}/admin/leieforhold?key={ADMIN_KEY}"
        async with session.get(url) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200:
                print(f"❌ FAILED: Expected 200, got {status}")
                print(f"Response: {data}")
                return False
            
            if not data.get('ok'):
                print(f"❌ FAILED: Response ok is not true")
                return False
            
            rows = data.get('rows', [])
            if not rows:
                print(f"❌ FAILED: No rows returned")
                return False
            
            # Check first row has enhet_id
            first_row = rows[0]
            if 'enhet_id' not in first_row:
                print(f"❌ FAILED: First row missing enhet_id field")
                print(f"First row keys: {first_row.keys()}")
                return False
            
            enhet_id = first_row['enhet_id']
            if not enhet_id or not isinstance(enhet_id, str):
                print(f"❌ FAILED: enhet_id is not a non-empty string")
                print(f"enhet_id: {enhet_id}")
                return False
            
            print(f"✓ First row has enhet_id: '{enhet_id}'")
            print(f"✅ PASSED: Leieforhold rows have enhet_id field")
            return True
            
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_7_xlsx_export(session):
    """Test 7: GET /api/admin/leieforhold/xlsx returns valid XLSX with at least 3 sheets including 'Enhetsøkonomi'"""
    print("\n=== TEST 7: XLSX export with Enhetsøkonomi sheet ===")
    try:
        url = f"{BASE_URL}/admin/leieforhold/xlsx?key={ADMIN_KEY}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            status = resp.status
            
            if status != 200:
                print(f"❌ FAILED: Expected 200, got {status}")
                return False
            
            content_type = resp.headers.get('Content-Type', '')
            if 'spreadsheetml' not in content_type:
                print(f"❌ FAILED: Expected Content-Type with 'spreadsheetml', got '{content_type}'")
                return False
            
            content = await resp.read()
            size = len(content)
            
            if size < 1000:
                print(f"❌ FAILED: XLSX file too small ({size} bytes)")
                return False
            
            print(f"✓ XLSX export returns 200 with Content-Type spreadsheetml, size {size} bytes")
            
            # Parse XLSX to check sheets
            import openpyxl
            from io import BytesIO
            
            wb = openpyxl.load_workbook(BytesIO(content))
            sheet_names = wb.sheetnames
            
            if len(sheet_names) < 3:
                print(f"❌ FAILED: Expected at least 3 sheets, got {len(sheet_names)}")
                print(f"Sheet names: {sheet_names}")
                return False
            
            if 'Enhetsøkonomi' not in sheet_names:
                print(f"❌ FAILED: 'Enhetsøkonomi' sheet not found")
                print(f"Sheet names: {sheet_names}")
                return False
            
            print(f"✓ XLSX has {len(sheet_names)} sheets: {sheet_names}")
            print(f"✓ 'Enhetsøkonomi' sheet found")
            
            print(f"✅ PASSED: XLSX export with Enhetsøkonomi sheet working correctly")
            return True
            
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_8_regression_datarom_oversikt(session):
    """Test 8: GET /api/admin/datarom/oversikt returns 200 with kostnaderMnd >= 60000"""
    print("\n=== TEST 8: Regression - datarom/oversikt includes felleskostnader ===")
    try:
        url = f"{BASE_URL}/admin/datarom/oversikt?key={ADMIN_KEY}"
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            status = resp.status
            data = await resp.json()
            
            if status != 200:
                print(f"❌ FAILED: Expected 200, got {status}")
                print(f"Response: {data}")
                return False
            
            if not data.get('ok'):
                print(f"❌ FAILED: Response ok is not true")
                return False
            
            oversikt = data.get('oversikt', {})
            drift = oversikt.get('drift', {})
            kostnader_mnd = drift.get('kostnaderMnd', 0)
            
            if kostnader_mnd < 60000:
                print(f"❌ FAILED: kostnaderMnd ({kostnader_mnd}) is less than 60000")
                print(f"Expected: kostnaderMnd >= 60000 (should include Lønn 60000)")
                return False
            
            print(f"✓ kostnaderMnd = {kostnader_mnd} (>= 60000, includes felleskostnader)")
            print(f"✅ PASSED: Datarom oversikt includes felleskostnader in kostnaderMnd")
            return True
            
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def cleanup(session):
    """Clean up all QA data created during tests"""
    print("\n=== CLEANUP: Removing all QA data ===")
    
    # Clean up felles
    for felles_id in created_felles_ids[:]:
        try:
            url = f"{BASE_URL}/admin/leieforhold/okonomi/felles?key={ADMIN_KEY}&id={felles_id}"
            async with session.delete(url) as resp:
                if resp.status == 200:
                    print(f"✓ Deleted felles: {felles_id}")
                    created_felles_ids.remove(felles_id)
                else:
                    print(f"⚠️  Failed to delete felles {felles_id}: {resp.status}")
        except Exception as e:
            print(f"⚠️  Error deleting felles {felles_id}: {e}")
    
    # Clean up enheter
    for enhet_id in created_enhet_ids[:]:
        try:
            url = f"{BASE_URL}/admin/leieforhold/okonomi/enhet?key={ADMIN_KEY}"
            body = {"enhetId": enhet_id, "cac": 0, "notat": ""}
            async with session.put(url, json=body) as resp:
                if resp.status == 200:
                    print(f"✓ Deleted enhet: {enhet_id}")
                    created_enhet_ids.remove(enhet_id)
                else:
                    print(f"⚠️  Failed to delete enhet {enhet_id}: {resp.status}")
        except Exception as e:
            print(f"⚠️  Error deleting enhet {enhet_id}: {e}")
    
    # Verify cleanup in MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check for any QA felles
        qa_felles = list(db.enhetsokonomi.find({"type": "felles", "navn": {"$regex": "^QA "}}))
        if qa_felles:
            print(f"⚠️  WARNING: Found {len(qa_felles)} QA felles items still in MongoDB")
            for item in qa_felles:
                print(f"   - {item.get('navn')} (id: {item.get('id')})")
        else:
            print(f"✓ Verified: 0 QA felles items in MongoDB")
        
        # Check for any QA enheter
        qa_enheter = list(db.enhetsokonomi.find({"type": "enhet", "enhetId": {"$regex": "^qa-"}}))
        if qa_enheter:
            print(f"⚠️  WARNING: Found {len(qa_enheter)} QA enhet items still in MongoDB")
            for item in qa_enheter:
                print(f"   - {item.get('enhetId')}")
        else:
            print(f"✓ Verified: 0 QA enhet items in MongoDB")
        
        # Verify Lønn post still exists (should NOT be deleted)
        lonn_post = db.enhetsokonomi.find_one({"type": "felles", "navn": {"$regex": "Lønn"}, "belop": 60000})
        if lonn_post:
            print(f"✓ Verified: 'Lønn — 1 ansatt' (60000) still exists (real data preserved)")
        else:
            print(f"⚠️  WARNING: 'Lønn — 1 ansatt' (60000) not found - may have been deleted or not created")
        
        client.close()
        
    except Exception as e:
        print(f"⚠️  Error verifying cleanup in MongoDB: {e}")
    
    print("=== CLEANUP COMPLETE ===")

async def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST: ENHETSØKONOMI I LEIEFORHOLD")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 80)
    
    results = []
    
    async with aiohttp.ClientSession() as session:
        try:
            # Run tests
            results.append(("Test 1: GET okonomi initial", await test_1_get_okonomi_initial(session)))
            results.append(("Test 2: CRUD felles", await test_2_crud_felles(session)))
            results.append(("Test 3: Felles validation", await test_3_felles_validation(session)))
            results.append(("Test 4: CRUD enhet", await test_4_crud_enhet(session)))
            results.append(("Test 5: Auth", await test_5_auth(session)))
            results.append(("Test 6: Leieforhold enhet_id", await test_6_leieforhold_enhet_id(session)))
            results.append(("Test 7: XLSX export", await test_7_xlsx_export(session)))
            results.append(("Test 8: Regression datarom oversikt", await test_8_regression_datarom_oversikt(session)))
            
        finally:
            # Always cleanup
            await cleanup(session)
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
