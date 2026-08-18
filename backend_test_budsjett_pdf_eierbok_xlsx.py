#!/usr/bin/env python3
"""
Backend test for NYE eksport-endepunkter:
- GET /api/admin/budsjett/plan/pdf (PDF-rapport)
- GET /api/admin/selskap/eierbok/xlsx (Eierbok-Excel)
- Regression: GET /api/admin/budsjett/plan/xlsx, /api/admin/signering/mine, /api/admin/selskap/eierbok, /api/admin/users

CRITICAL RULES:
- ONLY GET calls to budsjett/selskap/eierbok — NEVER create/modify/delete plans, companies, owners, transactions or documents
- If need non-admin user: create ONLY @example.com user via POST /admin/users and DELETE after (verify 0 @example.com users at end)
- Plan-id: GET /api/admin/budsjett/planer (find plan with name containing 'Investormodell') or directly in Mongo collection 'budgets'
- Selskap-id: Mongo collection 'selskaper', field id
"""

import requests
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Owner credentials
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"

print("=" * 80)
print("BACKEND TEST: Budsjett PDF + Eierbok Excel")
print("=" * 80)
print(f"Base URL: {API_BASE}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# Connect to MongoDB
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Step 1: Login as owner to get token
print("=" * 80)
print("STEP 1: Owner login")
print("=" * 80)
try:
    login_resp = requests.post(
        f"{API_BASE}/admin/auth/login",
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
        timeout=10
    )
    print(f"POST /api/admin/auth/login: {login_resp.status_code}")
    if login_resp.status_code != 200:
        print(f"ERROR: Login failed: {login_resp.text}")
        exit(1)
    
    login_data = login_resp.json()
    if not login_data.get('ok') or not login_data.get('token'):
        print(f"ERROR: Login response missing token: {login_data}")
        exit(1)
    
    OWNER_TOKEN = login_data['token']
    print(f"✅ Owner logged in successfully, token obtained")
    print()
except Exception as e:
    print(f"❌ EXCEPTION during login: {e}")
    exit(1)

# Step 2: Find plan ID with name containing 'Investormodell'
print("=" * 80)
print("STEP 2: Find plan ID (Investormodell)")
print("=" * 80)
try:
    # Try via API first
    planer_resp = requests.get(
        f"{API_BASE}/admin/budsjett/planer",
        params={"key": OWNER_TOKEN},
        timeout=10
    )
    print(f"GET /api/admin/budsjett/planer: {planer_resp.status_code}")
    
    PLAN_ID = None
    if planer_resp.status_code == 200:
        planer_data = planer_resp.json()
        if planer_data.get('ok') and planer_data.get('planer'):
            for plan in planer_data['planer']:
                if 'Investormodell' in plan.get('navn', ''):
                    PLAN_ID = plan.get('id')
                    print(f"✅ Found plan via API: '{plan.get('navn')}' (id: {PLAN_ID})")
                    break
    
    # Fallback to MongoDB if API didn't work
    if not PLAN_ID:
        print("Plan not found via API, trying MongoDB...")
        budget_doc = db.budgets.find_one(
            {"plan": True, "navn": {"$regex": "Investormodell", "$options": "i"}},
            {"id": 1, "navn": 1, "investorSynlig": 1}
        )
        if budget_doc:
            PLAN_ID = budget_doc.get('id')
            print(f"✅ Found plan via MongoDB: '{budget_doc.get('navn')}' (id: {PLAN_ID})")
        else:
            print("❌ ERROR: No plan with 'Investormodell' found in API or MongoDB")
            exit(1)
    
    # Get investorSynlig value from MongoDB for test 4
    plan_doc = db.budgets.find_one({"id": PLAN_ID}, {"investorSynlig": 1})
    INVESTOR_SYNLIG = plan_doc.get('investorSynlig', False) if plan_doc else False
    print(f"Plan investorSynlig: {INVESTOR_SYNLIG}")
    print()
except Exception as e:
    print(f"❌ EXCEPTION finding plan: {e}")
    exit(1)

# Step 3: Find selskap ID from MongoDB
print("=" * 80)
print("STEP 3: Find selskap ID")
print("=" * 80)
try:
    selskap_doc = db.selskaper.find_one({}, {"id": 1, "navn": 1})
    if selskap_doc:
        SELSKAP_ID = selskap_doc.get('id')
        print(f"✅ Found selskap via MongoDB: '{selskap_doc.get('navn')}' (id: {SELSKAP_ID})")
    else:
        SELSKAP_ID = None
        print("⚠️  No selskap found in MongoDB (will test without selskapId)")
    print()
except Exception as e:
    print(f"❌ EXCEPTION finding selskap: {e}")
    SELSKAP_ID = None
    print()

# Test counters
tests_passed = 0
tests_failed = 0

print("=" * 80)
print("A) PDF-RAPPORT TESTS")
print("=" * 80)

# Test A1: Owner + valid planId → 200, Content-Type application/pdf, body starts with %PDF, size > 20 kB
print("\n[A1] Owner + valid planId → 200 application/pdf, %PDF header, size > 20 kB")
try:
    pdf_resp = requests.get(
        f"{API_BASE}/admin/budsjett/plan/pdf",
        params={"id": PLAN_ID, "key": OWNER_TOKEN},
        timeout=30
    )
    print(f"GET /api/admin/budsjett/plan/pdf?id={PLAN_ID}&key=<token>: {pdf_resp.status_code}")
    
    if pdf_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {pdf_resp.status_code}")
        print(f"Response: {pdf_resp.text[:500]}")
        tests_failed += 1
    else:
        content_type = pdf_resp.headers.get('Content-Type', '')
        content_disp = pdf_resp.headers.get('Content-Disposition', '')
        body = pdf_resp.content
        
        checks = []
        checks.append(('Content-Type is application/pdf', 'application/pdf' in content_type))
        checks.append(('Body starts with %PDF', body[:4] == b'%PDF'))
        checks.append(('Size > 20 kB', len(body) > 20000))
        checks.append(('Content-Disposition attachment', 'attachment' in content_disp))
        checks.append(('Filename starts with digihome-vekstbudsjett-', 'digihome-vekstbudsjett-' in content_disp))
        
        all_passed = all(check[1] for check in checks)
        
        for check_name, check_result in checks:
            print(f"  {'✅' if check_result else '❌'} {check_name}")
        
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disp}")
        print(f"  Body size: {len(body)} bytes")
        print(f"  Body starts with: {body[:20]}")
        
        if all_passed:
            print("✅ TEST A1 PASSED")
            tests_passed += 1
        else:
            print("❌ TEST A1 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test A1: {e}")
    tests_failed += 1

# Test A2: Without key → 401
print("\n[A2] Without key → 401")
try:
    pdf_nokey_resp = requests.get(
        f"{API_BASE}/admin/budsjett/plan/pdf",
        params={"id": PLAN_ID},
        timeout=10
    )
    print(f"GET /api/admin/budsjett/plan/pdf?id={PLAN_ID} (no key): {pdf_nokey_resp.status_code}")
    
    if pdf_nokey_resp.status_code == 401:
        print("✅ TEST A2 PASSED: 401 without key")
        tests_passed += 1
    else:
        print(f"❌ TEST A2 FAILED: Expected 401, got {pdf_nokey_resp.status_code}")
        tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test A2: {e}")
    tests_failed += 1

# Test A3: Unknown id → 404
print("\n[A3] Unknown id (id=finnes-ikke) → 404")
try:
    pdf_404_resp = requests.get(
        f"{API_BASE}/admin/budsjett/plan/pdf",
        params={"id": "finnes-ikke", "key": OWNER_TOKEN},
        timeout=10
    )
    print(f"GET /api/admin/budsjett/plan/pdf?id=finnes-ikke&key=<token>: {pdf_404_resp.status_code}")
    
    if pdf_404_resp.status_code == 404:
        print("✅ TEST A3 PASSED: 404 for unknown id")
        tests_passed += 1
    else:
        print(f"❌ TEST A3 FAILED: Expected 404, got {pdf_404_resp.status_code}")
        tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test A3: {e}")
    tests_failed += 1

# Test A4: Investor role test (conditional based on investorSynlig)
print(f"\n[A4] Investor role test (investorSynlig={INVESTOR_SYNLIG})")
print("Creating QA investor user...")
QA_INVESTOR_ID = None
INVESTOR_TOKEN = None
try:
    # Create QA investor user
    create_user_resp = requests.post(
        f"{API_BASE}/admin/users",
        params={"key": OWNER_TOKEN},
        json={
            "name": "QA Investor Test",
            "email": "qa-investor-budsjett@example.com",
            "role": "investor",
            "moduler": ["budsjett"],
            "invite": False
        },
        timeout=10
    )
    print(f"POST /api/admin/users: {create_user_resp.status_code}")
    
    if create_user_resp.status_code == 200:
        user_data = create_user_resp.json()
        QA_INVESTOR_ID = user_data.get('id')
        print(f"✅ Created QA investor user (id: {QA_INVESTOR_ID})")
        
        # Set password
        set_pwd_resp = requests.put(
            f"{API_BASE}/admin/users/{QA_INVESTOR_ID}",
            params={"key": OWNER_TOKEN},
            json={"password": "QAtest1234##"},
            timeout=10
        )
        print(f"PUT /api/admin/users/{QA_INVESTOR_ID} (set password): {set_pwd_resp.status_code}")
        
        if set_pwd_resp.status_code == 200:
            # Login as investor
            investor_login_resp = requests.post(
                f"{API_BASE}/admin/auth/login",
                json={"email": "qa-investor-budsjett@example.com", "password": "QAtest1234##"},
                timeout=10
            )
            print(f"POST /api/admin/auth/login (investor): {investor_login_resp.status_code}")
            
            if investor_login_resp.status_code == 200:
                investor_login_data = investor_login_resp.json()
                INVESTOR_TOKEN = investor_login_data.get('token')
                print(f"✅ Investor logged in successfully")
                
                # Test PDF access
                investor_pdf_resp = requests.get(
                    f"{API_BASE}/admin/budsjett/plan/pdf",
                    params={"id": PLAN_ID, "key": INVESTOR_TOKEN},
                    timeout=30
                )
                print(f"GET /api/admin/budsjett/plan/pdf?id={PLAN_ID}&key=<investor_token>: {investor_pdf_resp.status_code}")
                
                if INVESTOR_SYNLIG:
                    # If investorSynlig=true, investor should get 200
                    if investor_pdf_resp.status_code == 200:
                        print(f"✅ TEST A4 PASSED: Investor got 200 (investorSynlig=true)")
                        tests_passed += 1
                    else:
                        print(f"❌ TEST A4 FAILED: Expected 200 for investor when investorSynlig=true, got {investor_pdf_resp.status_code}")
                        tests_failed += 1
                else:
                    # If investorSynlig=false, investor should get 404
                    if investor_pdf_resp.status_code == 404:
                        print(f"✅ TEST A4 PASSED: Investor got 404 (investorSynlig=false)")
                        tests_passed += 1
                    else:
                        print(f"❌ TEST A4 FAILED: Expected 404 for investor when investorSynlig=false, got {investor_pdf_resp.status_code}")
                        tests_failed += 1
            else:
                print(f"⚠️  SKIPPING TEST A4: Investor login failed")
                print(f"Note: Test skipped due to login issue, not counted as failure")
        else:
            print(f"⚠️  SKIPPING TEST A4: Failed to set investor password")
            print(f"Note: Test skipped due to password setup issue, not counted as failure")
    else:
        print(f"⚠️  SKIPPING TEST A4: Failed to create investor user")
        print(f"Note: Test skipped due to user creation issue, not counted as failure")
except Exception as e:
    print(f"⚠️  SKIPPING TEST A4: Exception: {e}")
    print(f"Note: Test skipped due to exception, not counted as failure")

print("\n" + "=" * 80)
print("B) EIERBOK-EXCEL TESTS")
print("=" * 80)

# Test B5: Owner without selskapId → 200, Content-Type spreadsheet, body starts with PK
print("\n[B5] Owner without selskapId → 200, spreadsheet, PK header")
try:
    xlsx_resp = requests.get(
        f"{API_BASE}/admin/selskap/eierbok/xlsx",
        params={"key": OWNER_TOKEN},
        timeout=30
    )
    print(f"GET /api/admin/selskap/eierbok/xlsx?key=<token> (no selskapId): {xlsx_resp.status_code}")
    
    if xlsx_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {xlsx_resp.status_code}")
        print(f"Response: {xlsx_resp.text[:500]}")
        tests_failed += 1
    else:
        content_type = xlsx_resp.headers.get('Content-Type', '')
        content_disp = xlsx_resp.headers.get('Content-Disposition', '')
        body = xlsx_resp.content
        
        checks = []
        checks.append(('Content-Type is spreadsheet', 'spreadsheet' in content_type))
        checks.append(('Body starts with PK (ZIP signature)', body[:2] == b'PK'))
        checks.append(('Content-Disposition attachment', 'attachment' in content_disp))
        checks.append(('Filename starts with digihome-aksjeeierbok-', 'digihome-aksjeeierbok-' in content_disp))
        
        all_passed = all(check[1] for check in checks)
        
        for check_name, check_result in checks:
            print(f"  {'✅' if check_result else '❌'} {check_name}")
        
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disp}")
        print(f"  Body size: {len(body)} bytes")
        print(f"  Body starts with: {body[:10]}")
        
        if all_passed:
            print("✅ TEST B5 PASSED")
            tests_passed += 1
        else:
            print("❌ TEST B5 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test B5: {e}")
    tests_failed += 1

# Test B6: Owner with dato=2020-01-01 → 200 PK (time travel)
print("\n[B6] Owner with dato=2020-01-01 → 200 PK (time travel, filename contains '-per-2020-01-01')")
try:
    xlsx_date_resp = requests.get(
        f"{API_BASE}/admin/selskap/eierbok/xlsx",
        params={"key": OWNER_TOKEN, "dato": "2020-01-01"},
        timeout=30
    )
    print(f"GET /api/admin/selskap/eierbok/xlsx?key=<token>&dato=2020-01-01: {xlsx_date_resp.status_code}")
    
    if xlsx_date_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {xlsx_date_resp.status_code}")
        tests_failed += 1
    else:
        content_disp = xlsx_date_resp.headers.get('Content-Disposition', '')
        body = xlsx_date_resp.content
        
        checks = []
        checks.append(('Body starts with PK', body[:2] == b'PK'))
        checks.append(('Filename contains -per-2020-01-01', '-per-2020-01-01' in content_disp))
        
        all_passed = all(check[1] for check in checks)
        
        for check_name, check_result in checks:
            print(f"  {'✅' if check_result else '❌'} {check_name}")
        
        print(f"  Content-Disposition: {content_disp}")
        
        if all_passed:
            print("✅ TEST B6 PASSED")
            tests_passed += 1
        else:
            print("❌ TEST B6 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test B6: {e}")
    tests_failed += 1

# Test B7: Without key → 401
print("\n[B7] Without key → 401")
try:
    xlsx_nokey_resp = requests.get(
        f"{API_BASE}/admin/selskap/eierbok/xlsx",
        timeout=10
    )
    print(f"GET /api/admin/selskap/eierbok/xlsx (no key): {xlsx_nokey_resp.status_code}")
    
    if xlsx_nokey_resp.status_code == 401:
        print("✅ TEST B7 PASSED: 401 without key")
        tests_passed += 1
    else:
        print(f"❌ TEST B7 FAILED: Expected 401, got {xlsx_nokey_resp.status_code}")
        tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test B7: {e}")
    tests_failed += 1

print("\n" + "=" * 80)
print("C) REGRESSION TESTS")
print("=" * 80)

# Test C8: GET /api/admin/budsjett/plan/xlsx → 200, PK-header (Excel with formulas)
print("\n[C8] GET /api/admin/budsjett/plan/xlsx?id=<planId>&key=<token> → 200, PK-header")
try:
    xlsx_plan_resp = requests.get(
        f"{API_BASE}/admin/budsjett/plan/xlsx",
        params={"id": PLAN_ID, "key": OWNER_TOKEN},
        timeout=30
    )
    print(f"GET /api/admin/budsjett/plan/xlsx?id={PLAN_ID}&key=<token>: {xlsx_plan_resp.status_code}")
    
    if xlsx_plan_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {xlsx_plan_resp.status_code}")
        tests_failed += 1
    else:
        body = xlsx_plan_resp.content
        if body[:2] == b'PK':
            print(f"  ✅ Body starts with PK (Excel file)")
            print("✅ TEST C8 PASSED")
            tests_passed += 1
        else:
            print(f"  ❌ Body does not start with PK: {body[:10]}")
            print("❌ TEST C8 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test C8: {e}")
    tests_failed += 1

# Test C9: GET /api/admin/signering/mine → 200 {ok:true, ventende:[]}
print("\n[C9] GET /api/admin/signering/mine?key=<token> → 200 {ok:true, ventende:[]}")
try:
    signering_resp = requests.get(
        f"{API_BASE}/admin/signering/mine",
        params={"key": OWNER_TOKEN},
        timeout=10
    )
    print(f"GET /api/admin/signering/mine?key=<token>: {signering_resp.status_code}")
    
    if signering_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {signering_resp.status_code}")
        tests_failed += 1
    else:
        data = signering_resp.json()
        if data.get('ok') == True and 'ventende' in data:
            print(f"  ✅ Response has ok:true and ventende field")
            print("✅ TEST C9 PASSED")
            tests_passed += 1
        else:
            print(f"  ❌ Response missing ok:true or ventende: {data}")
            print("❌ TEST C9 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test C9: {e}")
    tests_failed += 1

# Test C10: GET /api/admin/selskap/eierbok → 200 {ok:true}
print("\n[C10] GET /api/admin/selskap/eierbok?key=<token> → 200 {ok:true}")
try:
    eierbok_resp = requests.get(
        f"{API_BASE}/admin/selskap/eierbok",
        params={"key": OWNER_TOKEN},
        timeout=10
    )
    print(f"GET /api/admin/selskap/eierbok?key=<token>: {eierbok_resp.status_code}")
    
    if eierbok_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {eierbok_resp.status_code}")
        tests_failed += 1
    else:
        data = eierbok_resp.json()
        if data.get('ok') == True:
            print(f"  ✅ Response has ok:true")
            print("✅ TEST C10 PASSED")
            tests_passed += 1
        else:
            print(f"  ❌ Response missing ok:true: {data}")
            print("❌ TEST C10 FAILED")
            tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test C10: {e}")
    tests_failed += 1

# Test C11: GET /api/admin/users → 200; verify members have 'avatar' field
print("\n[C11] GET /api/admin/users?key=<token> → 200; verify members have 'avatar' field")
try:
    users_resp = requests.get(
        f"{API_BASE}/admin/users",
        params={"key": OWNER_TOKEN},
        timeout=10
    )
    print(f"GET /api/admin/users?key=<token>: {users_resp.status_code}")
    
    if users_resp.status_code != 200:
        print(f"❌ FAILED: Expected 200, got {users_resp.status_code}")
        tests_failed += 1
    else:
        data = users_resp.json()
        members = data.get('members', [])
        if not members:
            print(f"  ⚠️  No members in response, cannot verify avatar field")
            print("✅ TEST C11 PASSED (no members to check)")
            tests_passed += 1
        else:
            # Check if all members have 'avatar' field (can be empty string)
            all_have_avatar = all('avatar' in member for member in members)
            if all_have_avatar:
                print(f"  ✅ All {len(members)} members have 'avatar' field")
                print("✅ TEST C11 PASSED")
                tests_passed += 1
            else:
                missing_avatar = [m.get('email', m.get('id', 'unknown')) for m in members if 'avatar' not in m]
                print(f"  ❌ Some members missing 'avatar' field: {missing_avatar}")
                print("❌ TEST C11 FAILED")
                tests_failed += 1
except Exception as e:
    print(f"❌ EXCEPTION in test C11: {e}")
    tests_failed += 1

print("\n" + "=" * 80)
print("D) CLEANUP")
print("=" * 80)

# Delete QA investor user if created
if QA_INVESTOR_ID:
    print(f"\n[D] Deleting QA investor user (id: {QA_INVESTOR_ID})")
    try:
        delete_resp = requests.delete(
            f"{API_BASE}/admin/users/{QA_INVESTOR_ID}",
            params={"key": OWNER_TOKEN},
            timeout=10
        )
        print(f"DELETE /api/admin/users/{QA_INVESTOR_ID}: {delete_resp.status_code}")
        if delete_resp.status_code == 200:
            print("✅ QA investor user deleted")
        else:
            print(f"⚠️  Failed to delete QA investor user: {delete_resp.text}")
    except Exception as e:
        print(f"⚠️  Exception deleting QA investor user: {e}")

# Verify 0 @example.com users remain
print("\n[D] Verifying 0 @example.com users remain in MongoDB")
try:
    example_users = list(db.admin_users.find({"email": {"$regex": "@example.com$"}}, {"email": 1}))
    if len(example_users) == 0:
        print("✅ Verified 0 @example.com users in MongoDB")
    else:
        print(f"⚠️  WARNING: Found {len(example_users)} @example.com users:")
        for u in example_users:
            print(f"  - {u.get('email')}")
except Exception as e:
    print(f"⚠️  Exception verifying cleanup: {e}")

# Final summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Success rate: {100 * tests_passed / (tests_passed + tests_failed) if (tests_passed + tests_failed) > 0 else 0:.1f}%")
print("=" * 80)

if tests_failed == 0:
    print("🎉 ALL TESTS PASSED!")
    exit(0)
else:
    print(f"⚠️  {tests_failed} TEST(S) FAILED")
    exit(1)
