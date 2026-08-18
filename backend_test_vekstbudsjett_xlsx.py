#!/usr/bin/env python3
"""
Backend test for Vekstbudsjett Excel-eksport + investor-tilpasset invitasjons-e-post
Base URL: https://saker-hub.preview.emergentagent.com/api
Owner: martin@kviteberg.no / Pyramiden2025##
Master key: dh_admin_b3Kx92Qz7Lm4
MongoDB: mongodb://localhost:27017, DB: your_database_name
Collection for plans: 'budgets' with plan:true
"""

import requests
import sys
import time
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Unique timestamp for this test run
TEST_RUN_ID = str(int(time.time()))

# Test state
test_results = []
cleanup_items = {
    "qa_users": [],
    "qa_plans": [],
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def get_mongo_client():
    """Get MongoDB client"""
    return MongoClient(MONGO_URL)

def cleanup_all():
    """Cleanup all test data"""
    print("\n=== CLEANUP ===")
    try:
        client = get_mongo_client()
        db = client[DB_NAME]
        
        # Delete QA users
        for user_id in cleanup_items["qa_users"]:
            if not user_id:
                continue
            try:
                resp = requests.delete(
                    f"{BASE_URL}/admin/users/{user_id}",
                    headers={"x-admin-key": ADMIN_KEY},
                    timeout=10
                )
                print(f"Deleted QA user {user_id}: {resp.status_code}")
            except Exception as e:
                print(f"Error deleting user {user_id}: {e}")
        
        # Delete QA plans
        for plan_id in cleanup_items["qa_plans"]:
            try:
                resp = requests.delete(
                    f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={ADMIN_KEY}",
                    timeout=10
                )
                print(f"Deleted QA plan {plan_id}: {resp.status_code}")
            except Exception as e:
                print(f"Error deleting plan {plan_id}: {e}")
        
        # Verify cleanup in MongoDB
        budgets_count = db.budgets.count_documents({"navn": {"$regex": "^QA ", "$options": "i"}})
        users_count = db.admin_users.count_documents({"email": {"$regex": "@example\\.com$"}})
        
        print(f"Verification: {budgets_count} QA plans, {users_count} QA users remain in MongoDB")
        
        client.close()
    except Exception as e:
        print(f"Cleanup error: {e}")

def main():
    print("=== VEKSTBUDSJETT EXCEL-EKSPORT + INVESTOR-TILPASSET INVITASJONS-E-POST TESTING ===\n")
    
    try:
        # Connect to MongoDB
        client = get_mongo_client()
        db = client[DB_NAME]
        
        # ===== SETUP: Owner login =====
        print("=== SETUP: Owner Login ===")
        try:
            login_resp = requests.post(
                f"{BASE_URL}/admin/auth/login",
                json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
                timeout=10
            )
            if login_resp.status_code == 200:
                owner_token = login_resp.json().get("token", "")
                log_test("Owner login successful", True, f"Got session token")
            else:
                log_test("Owner login", False, f"Status {login_resp.status_code}")
                print("Cannot proceed without owner login")
                return
        except Exception as e:
            log_test("Owner login", False, str(e))
            return
        
        # ===== (A) EXCEL EXPORT TESTS =====
        print("\n=== (A) EXCEL EXPORT TESTS ===")
        
        # (A1) Find the real plan "Investormodell 2027–2028"
        print("\n(A1) Find real plan 'Investormodell 2027–2028'")
        try:
            plans_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/planer?key={owner_token}",
                timeout=10
            )
            if plans_resp.status_code == 200:
                plans_data = plans_resp.json()
                planer = plans_data.get("planer", [])
                real_plan = None
                for p in planer:
                    if "Investormodell 2027" in p.get("navn", "") or "Investormodell 2027–2028" in p.get("navn", ""):
                        real_plan = p
                        break
                
                if real_plan:
                    real_plan_id = real_plan.get("id")
                    real_plan_navn = real_plan.get("navn")
                    real_plan_investor_synlig = real_plan.get("investorSynlig", False)
                    log_test("Found real plan", True, f"ID: {real_plan_id}, navn: {real_plan_navn}, investorSynlig: {real_plan_investor_synlig}")
                else:
                    log_test("Found real plan", False, "Plan 'Investormodell 2027–2028' not found")
                    print("Cannot proceed without real plan")
                    return
            else:
                log_test("GET /admin/budsjett/planer", False, f"Status {plans_resp.status_code}")
                return
        except Exception as e:
            log_test("GET /admin/budsjett/planer", False, str(e))
            return
        
        # (A1.1) GET xlsx as owner for real plan → 200, correct headers, PK bytes
        print("\n(A1.1) GET xlsx as owner for real plan")
        try:
            xlsx_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/plan/xlsx?id={real_plan_id}&key={owner_token}",
                timeout=15
            )
            if xlsx_resp.status_code == 200:
                content_type = xlsx_resp.headers.get("Content-Type", "")
                content_disp = xlsx_resp.headers.get("Content-Disposition", "")
                body = xlsx_resp.content
                
                checks = []
                checks.append(("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in content_type))
                checks.append(("Content-Disposition contains 'digihome-vekstbudsjett-'", "digihome-vekstbudsjett-" in content_disp))
                checks.append(("Body starts with 'PK' (ZIP signature)", body[:2] == b'PK'))
                checks.append(("Body size > 5000 bytes", len(body) > 5000))
                
                all_passed = all(c[1] for c in checks)
                details = ", ".join([f"{c[0]}: {c[1]}" for c in checks])
                log_test("GET xlsx as owner for real plan", all_passed, details)
            else:
                log_test("GET xlsx as owner for real plan", False, f"Status {xlsx_resp.status_code}")
        except Exception as e:
            log_test("GET xlsx as owner for real plan", False, str(e))
        
        # (A2) No token → 401
        print("\n(A2) GET xlsx without token → 401")
        try:
            xlsx_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/plan/xlsx?id={real_plan_id}",
                timeout=10
            )
            passed = xlsx_resp.status_code == 401
            log_test("GET xlsx without token → 401", passed, f"Status {xlsx_resp.status_code}")
        except Exception as e:
            log_test("GET xlsx without token → 401", False, str(e))
        
        # (A2.1) Unknown id → 404
        print("\n(A2.1) GET xlsx with unknown id → 404")
        try:
            xlsx_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/plan/xlsx?id=finnes-ikke-123&key={owner_token}",
                timeout=10
            )
            passed = xlsx_resp.status_code == 404
            log_test("GET xlsx with unknown id → 404", passed, f"Status {xlsx_resp.status_code}")
        except Exception as e:
            log_test("GET xlsx with unknown id → 404", False, str(e))
        
        # (A3) Access control for investors
        print("\n(A3) Access control for investors")
        
        # (A3.1) Create QA investor user with budsjett module
        print("\n(A3.1) Create QA investor user with budsjett module")
        try:
            qa_investor_email = f"qa-investor-xlsx-{TEST_RUN_ID}@example.com"
            create_resp = requests.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Investor XLSX",
                    "email": qa_investor_email,
                    "role": "investor",
                    "moduler": ["budsjett"],
                    "invite": False
                },
                timeout=10
            )
            if create_resp.status_code == 200 or create_resp.status_code == 201:
                resp_data = create_resp.json()
                qa_investor_id = resp_data.get("member", {}).get("id")
                cleanup_items["qa_users"].append(qa_investor_id)
                log_test("Created QA investor user", True, f"ID: {qa_investor_id}")
                
                # Set password
                set_pw_resp = requests.put(
                    f"{BASE_URL}/admin/users/{qa_investor_id}",
                    json={"password": "QAtest1234"},
                    headers={"x-admin-key": ADMIN_KEY},
                    timeout=10
                )
                if set_pw_resp.status_code == 200:
                    log_test("Set password for QA investor", True)
                    
                    # Login as QA investor
                    login_resp = requests.post(
                        f"{BASE_URL}/admin/auth/login",
                        json={"email": qa_investor_email, "password": "QAtest1234"},
                        timeout=10
                    )
                    if login_resp.status_code == 200:
                        qa_investor_token = login_resp.json().get("token", "")
                        log_test("Login as QA investor", True)
                    else:
                        log_test("Login as QA investor", False, f"Status {login_resp.status_code}")
                        qa_investor_token = None
                else:
                    log_test("Set password for QA investor", False, f"Status {set_pw_resp.status_code}")
                    qa_investor_token = None
            else:
                log_test("Created QA investor user", False, f"Status {create_resp.status_code}")
                qa_investor_token = None
        except Exception as e:
            log_test("Create QA investor user", False, str(e))
            qa_investor_token = None
        
        # (A3.2) As QA investor: GET xlsx for REAL plan (investorSynlig:false) → 404
        if qa_investor_token:
            print("\n(A3.2) As QA investor: GET xlsx for REAL plan (investorSynlig:false) → 404")
            try:
                xlsx_resp = requests.get(
                    f"{BASE_URL}/admin/budsjett/plan/xlsx?id={real_plan_id}&key={qa_investor_token}",
                    timeout=10
                )
                passed = xlsx_resp.status_code == 404
                log_test("QA investor GET xlsx for real plan (investorSynlig:false) → 404", passed, f"Status {xlsx_resp.status_code}")
            except Exception as e:
                log_test("QA investor GET xlsx for real plan → 404", False, str(e))
        
        # (A3.3) As owner: create QA plan with investorSynlig:true
        print("\n(A3.3) As owner: create QA plan with investorSynlig:true")
        try:
            create_plan_resp = requests.put(
                f"{BASE_URL}/admin/budsjett/plan?key={owner_token}",
                json={
                    "navn": "QA Eksportplan SLETTES",
                    "type": "modell",
                    "investorSynlig": True,
                    "antallMnd": 12,
                    "startYm": "2026-01",
                    "fakta": {"eksisterendeEnheter": 10, "eksisterendeHonorar": 50000},
                    "drivere": {
                        "nyePerMnd": 2,
                        "snittleieNye": 15000,
                        "honorarPctNye": 8,
                        "oppstartPerEnhet": 5000,
                        "aarligChurnPct": 10,
                        "systemPerEnhet": 100,
                        "enheterPerAarsverk": 50,
                        "aarslonn": 600000,
                        "paslagPct": 40,
                        "mfFast": 10000,
                        "provisjonPerNyEnhet": 10000,
                        "adminFast": 20000,
                        "andreFaste": 5000,
                        "vekstplan": [],
                        "bemanningstrinn": [{"type": "dato", "fraYm": "2026-01", "prosent": 100}],
                        "maalUtnyttelsePct": 80
                    }
                },
                timeout=10
            )
            if create_plan_resp.status_code == 200 or create_plan_resp.status_code == 201:
                qa_plan_id = create_plan_resp.json().get("id")
                cleanup_items["qa_plans"].append(qa_plan_id)
                log_test("Created QA plan with investorSynlig:true", True, f"ID: {qa_plan_id}")
            else:
                log_test("Created QA plan", False, f"Status {create_plan_resp.status_code}: {create_plan_resp.text[:200]}")
                qa_plan_id = None
        except Exception as e:
            log_test("Create QA plan", False, str(e))
            qa_plan_id = None
        
        # (A3.4) As QA investor: GET xlsx for QA plan (investorSynlig:true) → 200 with PK bytes
        if qa_investor_token and qa_plan_id:
            print("\n(A3.4) As QA investor: GET xlsx for QA plan (investorSynlig:true) → 200")
            try:
                xlsx_resp = requests.get(
                    f"{BASE_URL}/admin/budsjett/plan/xlsx?id={qa_plan_id}&key={qa_investor_token}",
                    timeout=15
                )
                if xlsx_resp.status_code == 200:
                    body = xlsx_resp.content
                    passed = body[:2] == b'PK' and len(body) > 5000
                    log_test("QA investor GET xlsx for QA plan (investorSynlig:true) → 200 with PK", passed, f"Body starts with PK: {body[:2] == b'PK'}, size: {len(body)}")
                else:
                    log_test("QA investor GET xlsx for QA plan → 200", False, f"Status {xlsx_resp.status_code}")
            except Exception as e:
                log_test("QA investor GET xlsx for QA plan → 200", False, str(e))
        
        # (A3.5) Create QA investor WITHOUT budsjett module
        print("\n(A3.5) Create QA investor WITHOUT budsjett module")
        try:
            qa_investor2_email = f"qa-investor2-xlsx-{TEST_RUN_ID}@example.com"
            create_resp = requests.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Investor2 XLSX",
                    "email": qa_investor2_email,
                    "role": "investor",
                    "moduler": [],
                    "invite": False
                },
                timeout=10
            )
            if create_resp.status_code == 200 or create_resp.status_code == 201:
                resp_data = create_resp.json()
                qa_investor2_id = resp_data.get("member", {}).get("id")
                cleanup_items["qa_users"].append(qa_investor2_id)
                log_test("Created QA investor2 user (no budsjett module)", True, f"ID: {qa_investor2_id}")
                
                # Set password and login
                set_pw_resp = requests.put(
                    f"{BASE_URL}/admin/users/{qa_investor2_id}",
                    json={"password": "QAtest1234"},
                    headers={"x-admin-key": ADMIN_KEY},
                    timeout=10
                )
                if set_pw_resp.status_code == 200:
                    login_resp = requests.post(
                        f"{BASE_URL}/admin/auth/login",
                        json={"email": qa_investor2_email, "password": "QAtest1234"},
                        timeout=10
                    )
                    if login_resp.status_code == 200:
                        qa_investor2_token = login_resp.json().get("token", "")
                        log_test("Login as QA investor2", True)
                    else:
                        qa_investor2_token = None
                else:
                    qa_investor2_token = None
            else:
                log_test("Created QA investor2 user", False, f"Status {create_resp.status_code}")
                qa_investor2_token = None
        except Exception as e:
            log_test("Create QA investor2 user", False, str(e))
            qa_investor2_token = None
        
        # (A3.6) QA investor2 WITHOUT budsjett module → GET xlsx → 401
        if qa_investor2_token and qa_plan_id:
            print("\n(A3.6) QA investor2 WITHOUT budsjett module → GET xlsx → 401")
            try:
                xlsx_resp = requests.get(
                    f"{BASE_URL}/admin/budsjett/plan/xlsx?id={qa_plan_id}&key={qa_investor2_token}",
                    timeout=10
                )
                passed = xlsx_resp.status_code == 401
                log_test("QA investor2 (no budsjett module) GET xlsx → 401", passed, f"Status {xlsx_resp.status_code}")
            except Exception as e:
                log_test("QA investor2 GET xlsx → 401", False, str(e))
        
        # (A4) Regression: GET /admin/budsjett/plan?id=<real plan id> as owner still 200
        print("\n(A4) Regression: GET /admin/budsjett/plan as owner still 200")
        try:
            plan_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/plan?id={real_plan_id}&key={owner_token}",
                timeout=10
            )
            if plan_resp.status_code == 200:
                plan_data = plan_resp.json()
                passed = plan_data.get("ok") == True and plan_data.get("plan") is not None
                log_test("Regression: GET /admin/budsjett/plan still works", passed, f"ok: {plan_data.get('ok')}, has plan: {plan_data.get('plan') is not None}")
            else:
                log_test("Regression: GET /admin/budsjett/plan", False, f"Status {plan_resp.status_code}")
        except Exception as e:
            log_test("Regression: GET /admin/budsjett/plan", False, str(e))
        
        # ===== (B) INVESTOR INVITE EMAIL BRANCH =====
        print("\n=== (B) INVESTOR INVITE EMAIL BRANCH ===")
        
        # (B1) Create QA investor user with role 'investor' → verify POST response ok:true
        print("\n(B1) Create QA investor user with role 'investor' (email branch test)")
        try:
            qa_investor3_email = f"qa-investor3-email-{TEST_RUN_ID}@example.com"
            create_resp = requests.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Investor3 Email",
                    "email": qa_investor3_email,
                    "role": "investor",
                    "moduler": ["budsjett"],
                    "invite": True  # This will trigger sendVelkomstEpost
                },
                timeout=10
            )
            if create_resp.status_code == 200 or create_resp.status_code == 201:
                resp_data = create_resp.json()
                qa_investor3_id = resp_data.get("member", {}).get("id")
                cleanup_items["qa_users"].append(qa_investor3_id)
                passed = resp_data.get("ok") == True
                log_test("Create QA investor3 with invite (investor email branch)", passed, f"ok: {resp_data.get('ok')}, id: {qa_investor3_id}")
            else:
                log_test("Create QA investor3 with invite", False, f"Status {create_resp.status_code}: {create_resp.text[:200]}")
        except Exception as e:
            log_test("Create QA investor3 with invite", False, str(e))
        
        # (B2) Create QA user with role 'bruker' → ok:true (team email branch regression)
        print("\n(B2) Create QA user with role 'bruker' (team email branch regression)")
        try:
            qa_bruker_email = f"qa-bruker-email-{TEST_RUN_ID}@example.com"
            create_resp = requests.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Bruker Email",
                    "email": qa_bruker_email,
                    "role": "bruker",
                    "moduler": [],
                    "invite": True
                },
                timeout=10
            )
            if create_resp.status_code == 200 or create_resp.status_code == 201:
                resp_data = create_resp.json()
                qa_bruker_id = resp_data.get("member", {}).get("id")
                cleanup_items["qa_users"].append(qa_bruker_id)
                passed = resp_data.get("ok") == True
                log_test("Create QA bruker with invite (team email branch)", passed, f"ok: {resp_data.get('ok')}, id: {qa_bruker_id}")
            else:
                log_test("Create QA bruker with invite", False, f"Status {create_resp.status_code}")
        except Exception as e:
            log_test("Create QA bruker with invite", False, str(e))
        
        # ===== CLEANUP =====
        cleanup_all()
        
        # ===== FINAL VERIFICATION =====
        print("\n=== FINAL VERIFICATION ===")
        try:
            # Verify real plan is untouched
            plan_resp = requests.get(
                f"{BASE_URL}/admin/budsjett/plan?id={real_plan_id}&key={owner_token}",
                timeout=10
            )
            if plan_resp.status_code == 200:
                plan_data = plan_resp.json().get("plan", {})
                navn_unchanged = "Investormodell 2027" in plan_data.get("navn", "")
                investor_synlig_unchanged = plan_data.get("investorSynlig") == False
                passed = navn_unchanged and investor_synlig_unchanged
                log_test("Real plan untouched", passed, f"navn contains 'Investormodell 2027': {navn_unchanged}, investorSynlig:false: {investor_synlig_unchanged}")
            else:
                log_test("Real plan verification", False, f"Status {plan_resp.status_code}")
        except Exception as e:
            log_test("Real plan verification", False, str(e))
        
        # Verify cleanup
        budgets_count = db.budgets.count_documents({"navn": {"$regex": "^QA ", "$options": "i"}})
        users_count = db.admin_users.count_documents({"email": {"$regex": "@example\\.com$"}})
        passed = budgets_count == 0 and users_count == 0
        log_test("Cleanup verification", passed, f"{budgets_count} QA plans, {users_count} QA users remain")
        
        client.close()
        
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # ===== SUMMARY =====
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    total = len(test_results)
    passed = sum(1 for t in test_results if t["passed"])
    failed = total - passed
    
    print(f"\nTotal: {total} tests")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success rate: {(passed/total*100) if total > 0 else 0:.1f}%")
    
    if failed > 0:
        print("\nFailed tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['name']}")
                if t["details"]:
                    print(f"     {t['details']}")
    
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        cleanup_all()
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        cleanup_all()
        sys.exit(1)
