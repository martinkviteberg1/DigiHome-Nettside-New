#!/usr/bin/env python3
"""
Backend test for BUDSJETT-PLAN endpoints (DigiHome Next.js App Router).
Tests the updated budget plan endpoints with investorSynlig field and extended antallMnd range (1-36).

BASE URL: https://saker-hub.preview.emergentagent.com/api
ADMIN KEY: dh_admin_b3Kx92Qz7Lm4
MongoDB: mongodb://localhost:27017, DB: your_database_name

CRITICAL SAFETY RULES:
1. Do NOT delete or modify existing production plan 'Neste 12 mnd (rullerende)' or year budget (year:2026)
2. Do NOT call any signing/Posten endpoints
3. Use ONLY @example.com addresses for test users
4. All QA plans/users prefixed with 'QA ' and DELETED after testing
5. MANDATORY CLEANUP completed - verified 0 QA documents remain in MongoDB
"""

import requests
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_all():
    print("=" * 80)
    print("BUDSJETT-PLAN ENDPOINTS TEST")
    print("=" * 80)
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        print(f"✓ Connected to MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False
    
    all_passed = True
    qa_plan_ids = []
    qa_user_ids = []
    
    try:
        # ========== SECTION A: ADMIN TESTS ==========
        print("\n" + "=" * 80)
        print("SECTION A: ADMIN TESTS")
        print("=" * 80)
        
        # A1: Create plan with investorSynlig:false, antallMnd:6
        print("\n[A1] PUT plan: Create 'QA Testplan A' with investorSynlig:false, antallMnd:6")
        try:
            payload = {
                "navn": "QA Testplan A",
                "startYm": "2027-01",
                "antallMnd": 6,
                "inntekter": {
                    "Honorar (forvaltning)": [10000, 10000, 10000, 10000, 10000, 10000]
                },
                "investorSynlig": False
            }
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and data.get("id"):
                    plan_a_id = data["id"]
                    qa_plan_ids.append(plan_a_id)
                    print(f"   ✓ Plan A created with id: {plan_a_id}")
                    print(f"   ✓ investorSynlig: {data.get('investorSynlig')}")
                else:
                    print(f"   ✗ Response missing ok/id: {data}")
                    all_passed = False
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A2: Create plan with antallMnd:2, investorSynlig:true (verifies antallMnd 2 is now accepted)
        print("\n[A2] PUT plan: Create 'QA Testplan B' with antallMnd:2, investorSynlig:true")
        try:
            payload = {
                "navn": "QA Testplan B",
                "startYm": "2027-01",
                "antallMnd": 2,
                "investorSynlig": True
            }
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and data.get("id"):
                    plan_b_id = data["id"]
                    qa_plan_ids.append(plan_b_id)
                    print(f"   ✓ Plan B created with id: {plan_b_id}")
                    print(f"   ✓ antallMnd 2 accepted (was previously rejected under 3)")
                else:
                    print(f"   ✗ Response missing ok/id: {data}")
                    all_passed = False
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A3: Test antallMnd boundaries (0 → 400, 37 → 400, 36 → 200)
        print("\n[A3] PUT plan: Test antallMnd boundaries")
        try:
            # Test antallMnd 0 → 400
            print("   Testing antallMnd=0 (should reject with 400)")
            payload = {"navn": "QA Testplan Invalid", "startYm": "2027-01", "antallMnd": 0}
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            if r.status_code == 400:
                print(f"   ✓ antallMnd=0 rejected with 400")
            else:
                print(f"   ✗ Expected 400, got {r.status_code}")
                all_passed = False
            
            # Test antallMnd 37 → 400
            print("   Testing antallMnd=37 (should reject with 400)")
            payload = {"navn": "QA Testplan Invalid", "startYm": "2027-01", "antallMnd": 37}
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            if r.status_code == 400:
                print(f"   ✓ antallMnd=37 rejected with 400")
            else:
                print(f"   ✗ Expected 400, got {r.status_code}")
                all_passed = False
            
            # Test antallMnd 36 → 200
            print("   Testing antallMnd=36 (should accept with 200)")
            payload = {"navn": "QA Testplan C", "startYm": "2027-01", "antallMnd": 36}
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and data.get("id"):
                    plan_c_id = data["id"]
                    qa_plan_ids.append(plan_c_id)
                    print(f"   ✓ antallMnd=36 accepted, Plan C created with id: {plan_c_id}")
                else:
                    print(f"   ✗ Response missing ok/id: {data}")
                    all_passed = False
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A4: GET planer with admin key → should return both A (investorSynlig:false) and B (investorSynlig:true)
        print("\n[A4] GET planer with admin key → should see both A and B")
        try:
            r = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={ADMIN_KEY}", timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                planer = data.get("planer", [])
                qa_planer = [p for p in planer if p.get("navn", "").startswith("QA Testplan")]
                print(f"   ✓ Found {len(qa_planer)} QA plans")
                
                # Check if both A and B are present
                plan_a_found = any(p.get("id") == plan_a_id for p in qa_planer)
                plan_b_found = any(p.get("id") == plan_b_id for p in qa_planer)
                
                if plan_a_found and plan_b_found:
                    print(f"   ✓ Both Plan A (investorSynlig:false) and Plan B (investorSynlig:true) found")
                else:
                    print(f"   ✗ Missing plans: A={plan_a_found}, B={plan_b_found}")
                    all_passed = False
                
                # Verify investorSynlig field exists
                for p in qa_planer:
                    if "investorSynlig" not in p:
                        print(f"   ✗ Plan {p.get('navn')} missing investorSynlig field")
                        all_passed = False
                    else:
                        print(f"   ✓ Plan {p.get('navn')}: investorSynlig={p.get('investorSynlig')}")
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A5: GET plan?id=<A> with admin → should return plan with investorSynlig:false
        print("\n[A5] GET plan?id=<A> with admin → verify investorSynlig:false, antallMnd:6")
        try:
            r = requests.get(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_a_id}", timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                plan = data.get("plan", {})
                if plan.get("investorSynlig") == False:
                    print(f"   ✓ Plan A has investorSynlig=False")
                else:
                    print(f"   ✗ Expected investorSynlig=False, got {plan.get('investorSynlig')}")
                    all_passed = False
                
                if plan.get("antallMnd") == 6:
                    print(f"   ✓ Plan A has antallMnd=6")
                else:
                    print(f"   ✗ Expected antallMnd=6, got {plan.get('antallMnd')}")
                    all_passed = False
                
                # Verify inntekter array has 6 elements
                honorar = plan.get("inntekter", {}).get("Honorar (forvaltning)", [])
                if len(honorar) == 6 and all(x == 10000 for x in honorar):
                    print(f"   ✓ Honorar array has 6 elements, all 10000")
                else:
                    print(f"   ✗ Honorar array incorrect: {honorar}")
                    all_passed = False
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A6: GET plan/forslag with various antallMnd values
        print("\n[A6] GET plan/forslag: Test antallMnd boundaries")
        try:
            # Test antallMnd=1 → 200
            print("   Testing antallMnd=1 (should accept)")
            r = requests.get(f"{BASE_URL}/admin/budsjett/plan/forslag?key={ADMIN_KEY}&startYm=2027-01&antallMnd=1", timeout=15)
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and "sikret" in data:
                    sikret = data.get("sikret", [])
                    if len(sikret) == 1:
                        print(f"   ✓ antallMnd=1 accepted, sikret array length=1")
                    else:
                        print(f"   ✗ Expected sikret length 1, got {len(sikret)}")
                        all_passed = False
                else:
                    print(f"   ✗ Response missing ok/sikret: {data}")
                    all_passed = False
            else:
                # Note: If external leieforhold API returns 502, this is environment-dependent
                if r.status_code == 502:
                    print(f"   ⚠ Got 502 (external API issue, environment-dependent)")
                else:
                    print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                    all_passed = False
            
            # Test antallMnd=0 → defaults to 12 (|| 12 in code)
            print("   Testing antallMnd=0 (should default to 12)")
            r = requests.get(f"{BASE_URL}/admin/budsjett/plan/forslag?key={ADMIN_KEY}&startYm=2027-01&antallMnd=0", timeout=15)
            if r.status_code == 200:
                data = r.json()
                if data.get("antallMnd") == 12:
                    print(f"   ✓ antallMnd=0 defaults to 12 (as per || 12 in code)")
                else:
                    print(f"   ✗ Expected antallMnd=12, got {data.get('antallMnd')}")
                    all_passed = False
            else:
                # Note: If external leieforhold API returns 502, this is environment-dependent
                if r.status_code == 502:
                    print(f"   ⚠ Got 502 (external API issue, environment-dependent)")
                else:
                    print(f"   ✗ Expected 200, got {r.status_code}")
                    all_passed = False
            
            # Test antallMnd=37 → 400
            print("   Testing antallMnd=37 (should reject)")
            r = requests.get(f"{BASE_URL}/admin/budsjett/plan/forslag?key={ADMIN_KEY}&startYm=2027-01&antallMnd=37", timeout=10)
            if r.status_code == 400:
                print(f"   ✓ antallMnd=37 rejected with 400")
            else:
                print(f"   ✗ Expected 400, got {r.status_code}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # A7: Update Plan A to investorSynlig:true
        print("\n[A7] PUT plan: Update Plan A to investorSynlig:true")
        try:
            payload = {
                "id": plan_a_id,
                "navn": "QA Testplan A",
                "startYm": "2027-01",
                "antallMnd": 6,
                "inntekter": {
                    "Honorar (forvaltning)": [10000, 10000, 10000, 10000, 10000, 10000]
                },
                "investorSynlig": True
            }
            r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                # Verify by GET
                r2 = requests.get(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_a_id}", timeout=10)
                if r2.status_code == 200:
                    plan = r2.json().get("plan", {})
                    if plan.get("investorSynlig") == True:
                        print(f"   ✓ Plan A updated to investorSynlig=True")
                    else:
                        print(f"   ✗ investorSynlig not updated: {plan.get('investorSynlig')}")
                        all_passed = False
                else:
                    print(f"   ✗ GET verification failed: {r2.status_code}")
                    all_passed = False
            else:
                print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # ========== SECTION B: NON-ADMIN FILTERING ==========
        print("\n" + "=" * 80)
        print("SECTION B: NON-ADMIN FILTERING")
        print("=" * 80)
        
        # B1: Create QA test user with role 'bruker', moduler ['budsjett']
        print("\n[B1] Create QA test user with budsjett module")
        try:
            user_payload = {
                "name": "QA Budsjett Person",
                "email": "qa-budsjett@example.com",
                "role": "bruker",
                "moduler": ["budsjett"],
                "password": "QAtest12345!"
            }
            r = requests.post(f"{BASE_URL}/admin/users?key={ADMIN_KEY}", json=user_payload, timeout=10)
            print(f"   Status: {r.status_code}")
            if r.status_code == 201 or r.status_code == 200:
                data = r.json()
                user_id = data.get("id") or data.get("user", {}).get("id") or data.get("member", {}).get("id")
                if user_id:
                    qa_user_ids.append(user_id)
                    print(f"   ✓ User created with id: {user_id}")
                    
                    # Login to get token
                    login_payload = {"email": "qa-budsjett@example.com", "password": "QAtest12345!"}
                    r2 = requests.post(f"{BASE_URL}/admin/auth/login", json=login_payload, timeout=10)
                    if r2.status_code == 200:
                        user_token = r2.json().get("token")
                        if user_token:
                            print(f"   ✓ User logged in, token obtained")
                        else:
                            print(f"   ✗ Login response missing token: {r2.json()}")
                            all_passed = False
                            user_token = None
                    else:
                        print(f"   ✗ Login failed: {r2.status_code}: {r2.text[:200]}")
                        all_passed = False
                        user_token = None
                else:
                    print(f"   ✗ User creation response missing id: {data}")
                    all_passed = False
                    user_token = None
            else:
                print(f"   ✗ Expected 201/200, got {r.status_code}: {r.text[:200]}")
                all_passed = False
                user_token = None
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
            user_token = None
        
        if user_token:
            # B2: GET planer with user token → should only see investorSynlig:true plans
            print("\n[B2] GET planer with user token → should only see investorSynlig:true")
            try:
                r = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={user_token}", timeout=10)
                print(f"   Status: {r.status_code}")
                if r.status_code == 200:
                    data = r.json()
                    planer = data.get("planer", [])
                    qa_planer = [p for p in planer if p.get("navn", "").startswith("QA Testplan")]
                    print(f"   ✓ Found {len(qa_planer)} QA plans visible to user")
                    
                    # Both A and B should be visible now (A was updated to investorSynlig:true in A7)
                    plan_a_visible = any(p.get("id") == plan_a_id for p in qa_planer)
                    plan_b_visible = any(p.get("id") == plan_b_id for p in qa_planer)
                    
                    if plan_a_visible and plan_b_visible:
                        print(f"   ✓ Both Plan A and B visible (both have investorSynlig:true)")
                    else:
                        print(f"   ✗ Expected both plans visible: A={plan_a_visible}, B={plan_b_visible}")
                        all_passed = False
                    
                    # Check that production plan 'Neste 12 mnd (rullerende)' is NOT visible (should have investorSynlig:false)
                    prod_plan = any(p.get("navn") == "Neste 12 mnd (rullerende)" for p in planer)
                    if not prod_plan:
                        print(f"   ✓ Production plan 'Neste 12 mnd (rullerende)' NOT visible (correct)")
                    else:
                        print(f"   ⚠ Production plan visible (may have investorSynlig:true)")
                else:
                    print(f"   ✗ Expected 200, got {r.status_code}: {r.text[:200]}")
                    all_passed = False
            except Exception as e:
                print(f"   ✗ Exception: {e}")
                all_passed = False
            
            # B3: Set Plan A back to investorSynlig:false, verify user can't see it
            print("\n[B3] Set Plan A to investorSynlig:false, verify user can't see it")
            try:
                payload = {
                    "id": plan_a_id,
                    "navn": "QA Testplan A",
                    "startYm": "2027-01",
                    "antallMnd": 6,
                    "inntekter": {
                        "Honorar (forvaltning)": [10000, 10000, 10000, 10000, 10000, 10000]
                    },
                    "investorSynlig": False
                }
                r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=payload, timeout=10)
                if r.status_code == 200:
                    print(f"   ✓ Plan A set to investorSynlig:false")
                    
                    # Verify user can't see it
                    r2 = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={user_token}", timeout=10)
                    if r2.status_code == 200:
                        planer = r2.json().get("planer", [])
                        plan_a_visible = any(p.get("id") == plan_a_id for p in planer if p.get("navn", "").startswith("QA Testplan"))
                        plan_b_visible = any(p.get("id") == plan_b_id for p in planer if p.get("navn", "").startswith("QA Testplan"))
                        
                        if not plan_a_visible and plan_b_visible:
                            print(f"   ✓ Plan A hidden, Plan B still visible")
                        else:
                            print(f"   ✗ Unexpected visibility: A={plan_a_visible}, B={plan_b_visible}")
                            all_passed = False
                    else:
                        print(f"   ✗ GET verification failed: {r2.status_code}")
                        all_passed = False
                else:
                    print(f"   ✗ PUT failed: {r.status_code}: {r.text[:200]}")
                    all_passed = False
            except Exception as e:
                print(f"   ✗ Exception: {e}")
                all_passed = False
            
            # B4: GET plan?id=<A> with user token → 404, GET plan?id=<B> → 200
            print("\n[B4] GET plan?id=<A> with user token → 404, GET plan?id=<B> → 200")
            try:
                # Try to get Plan A (investorSynlig:false) → should be 404
                r = requests.get(f"{BASE_URL}/admin/budsjett/plan?key={user_token}&id={plan_a_id}", timeout=10)
                if r.status_code == 404:
                    print(f"   ✓ Plan A (investorSynlig:false) returns 404 for non-admin")
                else:
                    print(f"   ✗ Expected 404, got {r.status_code}")
                    all_passed = False
                
                # Try to get Plan B (investorSynlig:true) → should be 200
                r2 = requests.get(f"{BASE_URL}/admin/budsjett/plan?key={user_token}&id={plan_b_id}", timeout=10)
                if r2.status_code == 200:
                    print(f"   ✓ Plan B (investorSynlig:true) returns 200 for non-admin")
                else:
                    print(f"   ✗ Expected 200, got {r2.status_code}")
                    all_passed = False
            except Exception as e:
                print(f"   ✗ Exception: {e}")
                all_passed = False
            
            # B5: PUT/DELETE/forslag with user token → 401
            print("\n[B5] PUT/DELETE/forslag with user token → 401 (admin-only)")
            try:
                # Try PUT
                payload = {"navn": "QA Unauthorized", "startYm": "2027-01", "antallMnd": 12}
                r = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={user_token}", json=payload, timeout=10)
                if r.status_code == 401:
                    print(f"   ✓ PUT returns 401 for non-admin")
                else:
                    print(f"   ✗ PUT: Expected 401, got {r.status_code}")
                    all_passed = False
                
                # Try DELETE
                r2 = requests.delete(f"{BASE_URL}/admin/budsjett/plan?key={user_token}&id={plan_b_id}", timeout=10)
                if r2.status_code == 401:
                    print(f"   ✓ DELETE returns 401 for non-admin")
                else:
                    print(f"   ✗ DELETE: Expected 401, got {r2.status_code}")
                    all_passed = False
                
                # Try forslag
                r3 = requests.get(f"{BASE_URL}/admin/budsjett/plan/forslag?key={user_token}&startYm=2027-01&antallMnd=12", timeout=10)
                if r3.status_code == 401:
                    print(f"   ✓ forslag returns 401 for non-admin")
                else:
                    print(f"   ✗ forslag: Expected 401, got {r3.status_code}")
                    all_passed = False
            except Exception as e:
                print(f"   ✗ Exception: {e}")
                all_passed = False
            
            # B6: Create user WITHOUT budsjett module → GET planer → 401
            print("\n[B6] Create user WITHOUT budsjett module → GET planer → 401")
            try:
                user_payload = {
                    "name": "QA No Budsjett",
                    "email": "qa-no-budsjett@example.com",
                    "role": "bruker",
                    "moduler": [],
                    "password": "QAtest12345!"
                }
                r = requests.post(f"{BASE_URL}/admin/users?key={ADMIN_KEY}", json=user_payload, timeout=10)
                if r.status_code in [200, 201]:
                    data = r.json()
                    user2_id = data.get("id") or data.get("user", {}).get("id") or data.get("member", {}).get("id")
                    if user2_id:
                        qa_user_ids.append(user2_id)
                        
                        # Login
                        login_payload = {"email": "qa-no-budsjett@example.com", "password": "QAtest12345!"}
                        r2 = requests.post(f"{BASE_URL}/admin/auth/login", json=login_payload, timeout=10)
                        if r2.status_code == 200:
                            user2_token = r2.json().get("token")
                            if user2_token:
                                # Try GET planer
                                r3 = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={user2_token}", timeout=10)
                                if r3.status_code == 401:
                                    print(f"   ✓ User without budsjett module gets 401")
                                else:
                                    print(f"   ✗ Expected 401, got {r3.status_code}")
                                    all_passed = False
                            else:
                                print(f"   ✗ Login missing token")
                                all_passed = False
                        else:
                            print(f"   ✗ Login failed: {r2.status_code}")
                            all_passed = False
                    else:
                        print(f"   ✗ User creation missing id")
                        all_passed = False
                else:
                    print(f"   ✗ User creation failed: {r.status_code}")
                    all_passed = False
            except Exception as e:
                print(f"   ✗ Exception: {e}")
                all_passed = False
        
        # ========== SECTION C: CLEANUP ==========
        print("\n" + "=" * 80)
        print("SECTION C: MANDATORY CLEANUP")
        print("=" * 80)
        
        # C1: Delete QA plans
        print("\n[C1] Delete QA plans via DELETE with admin key")
        try:
            for plan_id in qa_plan_ids:
                r = requests.delete(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_id}", timeout=10)
                if r.status_code == 200:
                    print(f"   ✓ Deleted plan {plan_id}")
                else:
                    print(f"   ✗ Failed to delete plan {plan_id}: {r.status_code}")
                    all_passed = False
            
            # Verify plans are gone
            r = requests.get(f"{BASE_URL}/admin/budsjett/planer?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                planer = r.json().get("planer", [])
                qa_planer = [p for p in planer if p.get("navn", "").startswith("QA Testplan")]
                if len(qa_planer) == 0:
                    print(f"   ✓ Verified: 0 QA plans remain in GET planer")
                else:
                    print(f"   ✗ {len(qa_planer)} QA plans still exist")
                    all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # C2: Delete QA users
        print("\n[C2] Delete QA users via DELETE /api/admin/users/:id")
        try:
            for user_id in qa_user_ids:
                r = requests.delete(f"{BASE_URL}/admin/users/{user_id}?key={ADMIN_KEY}", timeout=10)
                if r.status_code in [200, 204]:
                    print(f"   ✓ Deleted user {user_id}")
                else:
                    print(f"   ✗ Failed to delete user {user_id}: {r.status_code}")
                    all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
        
        # C3: Verify in MongoDB
        print("\n[C3] Verify in MongoDB: no QA plans or users remain")
        try:
            # Check budgets collection
            qa_plans_in_db = db.budgets.count_documents({"navn": {"$regex": "^QA Testplan"}})
            if qa_plans_in_db == 0:
                print(f"   ✓ 0 QA plans in budgets collection")
            else:
                print(f"   ✗ {qa_plans_in_db} QA plans still in budgets collection")
                all_passed = False
            
            # Check admin_users collection
            qa_users_in_db = db.admin_users.count_documents({"email": {"$regex": "^qa-.*@example.com"}})
            if qa_users_in_db == 0:
                print(f"   ✓ 0 QA users in admin_users collection")
            else:
                print(f"   ✗ {qa_users_in_db} QA users still in admin_users collection")
                all_passed = False
        except Exception as e:
            print(f"   ✗ Exception: {e}")
            all_passed = False
    
    except Exception as e:
        print(f"\n✗ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    finally:
        # Final cleanup attempt
        print("\n" + "=" * 80)
        print("FINAL CLEANUP VERIFICATION")
        print("=" * 80)
        try:
            # Delete any remaining QA plans
            remaining_plans = list(db.budgets.find({"navn": {"$regex": "^QA Testplan"}}, {"id": 1}))
            if remaining_plans:
                print(f"⚠ Found {len(remaining_plans)} remaining QA plans, deleting...")
                for plan in remaining_plans:
                    db.budgets.delete_one({"id": plan["id"]})
                print(f"✓ Deleted {len(remaining_plans)} remaining QA plans")
            
            # Delete any remaining QA users
            remaining_users = list(db.admin_users.find({"email": {"$regex": "^qa-.*@example.com"}}, {"id": 1}))
            if remaining_users:
                print(f"⚠ Found {len(remaining_users)} remaining QA users, deleting...")
                for user in remaining_users:
                    db.admin_users.delete_one({"id": user["id"]})
                print(f"✓ Deleted {len(remaining_users)} remaining QA users")
            
            # Final verification
            final_plans = db.budgets.count_documents({"navn": {"$regex": "^QA Testplan"}})
            final_users = db.admin_users.count_documents({"email": {"$regex": "^qa-.*@example.com"}})
            
            print(f"\nFinal counts:")
            print(f"  QA plans in DB: {final_plans}")
            print(f"  QA users in DB: {final_users}")
            
            if final_plans == 0 and final_users == 0:
                print("✓ All QA data cleaned up successfully")
            else:
                print("✗ Some QA data remains in database")
                all_passed = False
        except Exception as e:
            print(f"✗ Cleanup verification failed: {e}")
        
        client.close()
    
    print("\n" + "=" * 80)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("=" * 80)
    
    return all_passed

if __name__ == "__main__":
    success = test_all()
    sys.exit(0 if success else 1)
