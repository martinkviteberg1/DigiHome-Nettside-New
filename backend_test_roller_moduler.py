#!/usr/bin/env python3
"""
Backend test for ROLLER (partner/eier) + MODULTILGANG + DELOPPGAVER v2 + BESKRIVELSE-MENTIONS
DigiHome Admin API - Next.js catch-all route

Test plan:
(A) ROLLER: Test partner and eier roles with different access levels
(B) MODULER: Test module-based access control
(C) DELOPPGAVER: Test subtasks with assigneeId and due date
(D) MENTIONS: Test @mentions in task descriptions
(E) REGRESJON: Test that existing functionality still works
(F) OPPRYDDING: Mandatory cleanup - delete all QA data
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
MASTER_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
QA_PARTNER = {
    "name": "QA Partner P",
    "email": "qa-p@example.com",
    "role": "partner",
    "password": "QApass1234!"
}

QA_EIER = {
    "name": "QA Eier E",
    "email": "qa-e@example.com",
    "role": "eier",
    "password": "QApass1234!"
}

QA_MODUL_USER = {
    "name": "QA Modul M",
    "email": "qa-m@example.com",
    "role": "bruker",
    "password": "QApass1234!",
    "moduler": ["i-leads", "historikk", "tull"]  # 'tull' should be filtered out
}

QA_MENTION_PERSON = {
    "name": "QA Mention Mottaker",
    "email": "qa-mm@example.com",
    "role": "bruker"
}

# Global state
test_results = []
created_users = []
created_tasks = []
partner_token = None
eier_token = None
modul_user_token = None
modul_user_id = None
mention_person_id = None
test_task_id = None


def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})


def make_request(method, path, data=None, key=None, token=None, expect_status=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    
    # Add auth
    params = {}
    if key:
        params["key"] = key
    elif token:
        params["key"] = token
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, params=params, json=data, headers=headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, params=params, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, params=params, json=data, headers=headers, timeout=10)
        else:
            return None
        
        if expect_status and response.status_code != expect_status:
            print(f"  ⚠️  Expected {expect_status}, got {response.status_code}: {response.text[:200]}")
        
        return response
    except Exception as e:
        print(f"  ❌ Request failed: {e}")
        return None


def test_a_roller():
    """Test (A) ROLLER: partner and eier roles with different access levels"""
    global partner_token, eier_token, created_users
    
    print("\n" + "="*80)
    print("(A) TESTING ROLLER (partner/eier)")
    print("="*80)
    
    # A1: Create QA Partner
    print("\nA1: Create QA Partner user...")
    resp = make_request("POST", "/admin/users", data=QA_PARTNER, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        partner_id = data.get("member", {}).get("id")
        created_users.append(partner_id)
        log_test("A1: Create QA Partner", True, f"ID: {partner_id}")
    else:
        log_test("A1: Create QA Partner", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # A2: Create QA Eier
    print("\nA2: Create QA Eier user...")
    resp = make_request("POST", "/admin/users", data=QA_EIER, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        eier_id = data.get("member", {}).get("id")
        created_users.append(eier_id)
        log_test("A2: Create QA Eier", True, f"ID: {eier_id}")
    else:
        log_test("A2: Create QA Eier", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # A3: Login as Partner
    print("\nA3: Login as QA Partner...")
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_PARTNER["email"], "password": QA_PARTNER["password"]}, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        partner_token = data.get("token")
        user_role = data.get("user", {}).get("role")
        if partner_token and user_role == "partner":
            log_test("A3: Partner login", True, f"Token received, role: {user_role}")
        else:
            log_test("A3: Partner login", False, f"Token: {bool(partner_token)}, role: {user_role}")
            return
    else:
        log_test("A3: Partner login", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # A4: Login as Eier
    print("\nA4: Login as QA Eier...")
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_EIER["email"], "password": QA_EIER["password"]}, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        eier_token = data.get("token")
        user_role = data.get("user", {}).get("role")
        if eier_token and user_role == "eier":
            log_test("A4: Eier login", True, f"Token received, role: {user_role}")
        else:
            log_test("A4: Eier login", False, f"Token: {bool(eier_token)}, role: {user_role}")
            return
    else:
        log_test("A4: Eier login", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # A5: Partner access tests
    print("\nA5: Testing Partner access...")
    tests = [
        ("GET /admin/tasks", "/admin/tasks", 200, True),
        ("GET /admin/meetings", "/admin/meetings", 200, True),
        ("GET /admin/users", "/admin/users", 200, True),
        ("GET /admin/kpi", "/admin/kpi", 401, False),
        ("GET /admin/finance/resultat", "/admin/finance/resultat", 401, False),
        ("GET /admin/pulse", "/admin/pulse", 401, False),
    ]
    
    all_passed = True
    for test_name, path, expected_status, should_pass in tests:
        resp = make_request("GET", path, token=partner_token)
        if resp and resp.status_code == expected_status:
            print(f"  ✅ {test_name}: {expected_status}")
        else:
            print(f"  ❌ {test_name}: Expected {expected_status}, got {resp.status_code if resp else 'None'}")
            all_passed = False
    
    log_test("A5: Partner access control", all_passed, "6 endpoints tested")
    
    # A6: Eier access tests
    print("\nA6: Testing Eier access...")
    tests = [
        ("GET /admin/kpi", "/admin/kpi", 200, True),
        ("GET /admin/kpi/settings", "/admin/kpi/settings", 200, True),
        ("GET /admin/finance/resultat", "/admin/finance/resultat", 200, True),
        ("GET /admin/meetings", "/admin/meetings", 200, True),
        ("GET /admin/tasks", "/admin/tasks", 401, False),
        ("POST /admin/finance/costs", "/admin/finance/costs", 401, False),
        ("POST /admin/kpi/settings", "/admin/kpi/settings", 401, False),
    ]
    
    all_passed = True
    for test_name, path, expected_status, should_pass in tests:
        if "POST" in test_name:
            resp = make_request("POST", path, data={}, token=eier_token)
        else:
            resp = make_request("GET", path, token=eier_token)
        
        if resp and resp.status_code == expected_status:
            print(f"  ✅ {test_name}: {expected_status}")
        else:
            print(f"  ❌ {test_name}: Expected {expected_status}, got {resp.status_code if resp else 'None'}")
            all_passed = False
    
    log_test("A6: Eier access control", all_passed, "7 endpoints tested")


def test_b_moduler():
    """Test (B) MODULER: module-based access control"""
    global modul_user_token, modul_user_id, created_users
    
    print("\n" + "="*80)
    print("(B) TESTING MODULER (module-based access)")
    print("="*80)
    
    # B1: Create QA Modul user with modules
    print("\nB1: Create QA Modul user with modules ['i-leads', 'historikk', 'tull']...")
    resp = make_request("POST", "/admin/users", data=QA_MODUL_USER, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        modul_user_id = data.get("member", {}).get("id")
        member_moduler = data.get("member", {}).get("moduler", [])
        created_users.append(modul_user_id)
        
        # Check that 'tull' was filtered out
        if set(member_moduler) == {"i-leads", "historikk"}:
            log_test("B1: Create user with modules", True, f"Modules filtered correctly: {member_moduler}")
        else:
            log_test("B1: Create user with modules", False, f"Expected ['i-leads', 'historikk'], got {member_moduler}")
            return
    else:
        log_test("B1: Create user with modules", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # B2: Login as Modul user
    print("\nB2: Login as QA Modul user...")
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_MODUL_USER["email"], "password": QA_MODUL_USER["password"]}, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        modul_user_token = data.get("token")
        user_moduler = data.get("user", {}).get("moduler", [])
        
        if modul_user_token and set(user_moduler) == {"i-leads", "historikk"}:
            log_test("B2: Modul user login", True, f"Token received, modules in response: {user_moduler}")
        else:
            log_test("B2: Modul user login", False, f"Token: {bool(modul_user_token)}, modules: {user_moduler}")
            return
    else:
        log_test("B2: Modul user login", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # B3: Test module access with initial modules
    print("\nB3: Testing module access with i-leads and historikk...")
    tests = [
        ("GET /admin/leads", "/admin/leads", 200, True),
        ("GET /admin/imported-leads", "/admin/imported-leads", 200, True),
        ("GET /admin/finance/resultat", "/admin/finance/resultat", 401, False),
        ("GET /admin/kpi", "/admin/kpi", 401, False),
    ]
    
    all_passed = True
    for test_name, path, expected_status, should_pass in tests:
        resp = make_request("GET", path, token=modul_user_token)
        if resp and resp.status_code == expected_status:
            print(f"  ✅ {test_name}: {expected_status}")
        else:
            print(f"  ❌ {test_name}: Expected {expected_status}, got {resp.status_code if resp else 'None'}")
            all_passed = False
    
    log_test("B3: Initial module access", all_passed, "4 endpoints tested")
    
    # B4: Update modules to 'okonomi' only
    print("\nB4: Update user modules to ['okonomi']...")
    resp = make_request("PUT", f"/admin/users/{modul_user_id}", data={"moduler": ["okonomi"]}, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        updated_moduler = data.get("member", {}).get("moduler", [])
        if updated_moduler == ["okonomi"]:
            log_test("B4: Update modules", True, f"Modules updated to: {updated_moduler}")
        else:
            log_test("B4: Update modules", False, f"Expected ['okonomi'], got {updated_moduler}")
            return
    else:
        log_test("B4: Update modules", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # B5: Test module access after update (no new login needed - DB lookup)
    print("\nB5: Testing module access after update (same token)...")
    tests = [
        ("GET /admin/finance/resultat", "/admin/finance/resultat", 200, True),
        ("GET /admin/leads", "/admin/leads", 401, False),
    ]
    
    all_passed = True
    for test_name, path, expected_status, should_pass in tests:
        resp = make_request("GET", path, token=modul_user_token)
        if resp and resp.status_code == expected_status:
            print(f"  ✅ {test_name}: {expected_status}")
        else:
            print(f"  ❌ {test_name}: Expected {expected_status}, got {resp.status_code if resp else 'None'}")
            all_passed = False
    
    log_test("B5: Module access after update", all_passed, "Module removed, access revoked without re-login")


def test_c_deloppgaver():
    """Test (C) DELOPPGAVER: subtasks with assigneeId and due date"""
    global test_task_id, created_tasks
    
    print("\n" + "="*80)
    print("(C) TESTING DELOPPGAVER (subtasks v2)")
    print("="*80)
    
    # C1: Create task with subtasks
    print("\nC1: Create task with subtasks...")
    task_data = {
        "title": "QA Sub Sak",
        "notify": False,
        "subtasks": [
            {"text": "Punkt A", "assigneeId": "test-id-1", "due": "2027-03-01"},
            {"text": "Punkt B", "due": "ikke-dato"},  # Invalid date
            {"text": ""}  # Empty text, should be filtered
        ]
    }
    
    resp = make_request("POST", "/admin/tasks", data=task_data, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        test_task_id = data.get("task", {}).get("id")
        subtasks = data.get("task", {}).get("subtasks", [])
        created_tasks.append(test_task_id)
        
        # Verify subtasks
        checks = []
        checks.append(("Length", len(subtasks) == 2, f"Expected 2, got {len(subtasks)}"))
        
        if len(subtasks) >= 1:
            checks.append(("Subtask[0].text", subtasks[0].get("text") == "Punkt A", f"Got: {subtasks[0].get('text')}"))
            checks.append(("Subtask[0].assigneeId", subtasks[0].get("assigneeId") == "test-id-1", f"Got: {subtasks[0].get('assigneeId')}"))
            checks.append(("Subtask[0].due", subtasks[0].get("due") == "2027-03-01", f"Got: {subtasks[0].get('due')}"))
        
        if len(subtasks) >= 2:
            checks.append(("Subtask[1].text", subtasks[1].get("text") == "Punkt B", f"Got: {subtasks[1].get('text')}"))
            checks.append(("Subtask[1].due", subtasks[1].get("due") is None, f"Got: {subtasks[1].get('due')}"))
            checks.append(("Subtask[1].assigneeId", subtasks[1].get("assigneeId") is None, f"Got: {subtasks[1].get('assigneeId')}"))
        
        all_passed = all(check[1] for check in checks)
        details = "; ".join([f"{check[0]}: {'✓' if check[1] else '✗ ' + check[2]}" for check in checks])
        log_test("C1: Create task with subtasks", all_passed, details)
        
        if not all_passed:
            return
    else:
        log_test("C1: Create task with subtasks", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # C2: Update subtasks
    print("\nC2: Update subtasks (change due date and assigneeId)...")
    if len(subtasks) >= 1:
        updated_subtasks = [
            {**subtasks[0], "due": "2027-06-15", "assigneeId": None}
        ]
        if len(subtasks) >= 2:
            updated_subtasks.append(subtasks[1])
        
        resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"subtasks": updated_subtasks, "notify": False}, key=MASTER_KEY, expect_status=200)
        if resp and resp.status_code == 200:
            data = resp.json()
            updated = data.get("task", {}).get("subtasks", [])
            
            if len(updated) >= 1:
                if updated[0].get("due") == "2027-06-15" and updated[0].get("assigneeId") is None:
                    log_test("C2: Update subtasks", True, f"Due: {updated[0].get('due')}, assigneeId: {updated[0].get('assigneeId')}")
                else:
                    log_test("C2: Update subtasks", False, f"Due: {updated[0].get('due')}, assigneeId: {updated[0].get('assigneeId')}")
            else:
                log_test("C2: Update subtasks", False, "No subtasks in response")
        else:
            log_test("C2: Update subtasks", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # C3: Verify persistence with GET
    print("\nC3: Verify subtasks persistence with GET...")
    resp = make_request("GET", "/admin/tasks", key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        tasks = data.get("tasks", [])
        task = next((t for t in tasks if t.get("id") == test_task_id), None)
        
        if task:
            subtasks = task.get("subtasks", [])
            if len(subtasks) >= 1 and subtasks[0].get("due") == "2027-06-15" and subtasks[0].get("assigneeId") is None:
                log_test("C3: Verify persistence", True, "Subtasks persisted correctly")
            else:
                log_test("C3: Verify persistence", False, f"Subtasks: {subtasks}")
        else:
            log_test("C3: Verify persistence", False, "Task not found")
    else:
        log_test("C3: Verify persistence", False, f"Status: {resp.status_code if resp else 'None'}")


def test_d_mentions():
    """Test (D) MENTIONS: @mentions in task descriptions"""
    global mention_person_id, test_task_id, created_users
    
    print("\n" + "="*80)
    print("(D) TESTING BESKRIVELSE-MENTIONS")
    print("="*80)
    
    # D1: Create QA Mention person (without password, invite:false)
    print("\nD1: Create QA Mention person...")
    person_data = {
        "name": QA_MENTION_PERSON["name"],
        "email": QA_MENTION_PERSON["email"],
        "role": QA_MENTION_PERSON["role"],
        "invite": False
    }
    
    resp = make_request("POST", "/admin/users", data=person_data, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        mention_person_id = data.get("member", {}).get("id")
        created_users.append(mention_person_id)
        log_test("D1: Create mention person", True, f"ID: {mention_person_id}")
    else:
        log_test("D1: Create mention person", False, f"Status: {resp.status_code if resp else 'None'}")
        return
    
    # D2: Update task description with @mention
    print("\nD2: Update task description with @mention...")
    if not test_task_id:
        log_test("D2: Update with @mention", False, "No test task available")
        return
    
    description = f"Hei @{QA_MENTION_PERSON['name']} — se på dette"
    resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"description": description, "notify": False}, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        saved_desc = data.get("task", {}).get("description", "")
        if saved_desc == description:
            log_test("D2: Update with @mention", True, "Description saved with mention")
        else:
            log_test("D2: Update with @mention", False, f"Expected: {description}, got: {saved_desc}")
    else:
        log_test("D2: Update with @mention", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # D3: Update again with same mention (should not fail)
    print("\nD3: Update again with same @mention (person already mentioned)...")
    description2 = f"Hei @{QA_MENTION_PERSON['name']} — se på dette (oppdatert)"
    resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"description": description2, "notify": False}, key=MASTER_KEY, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        saved_desc = data.get("task", {}).get("description", "")
        if saved_desc == description2:
            log_test("D3: Re-mention same person", True, "Description updated, no error")
        else:
            log_test("D3: Re-mention same person", False, f"Expected: {description2}, got: {saved_desc}")
    else:
        log_test("D3: Re-mention same person", False, f"Status: {resp.status_code if resp else 'None'}")


def test_e_regresjon():
    """Test (E) REGRESJON: ensure existing functionality still works"""
    global partner_token, eier_token
    
    print("\n" + "="*80)
    print("(E) TESTING REGRESJON")
    print("="*80)
    
    # E1: Partner can update own profile
    print("\nE1: Partner can update own profile...")
    if not partner_token:
        log_test("E1: Partner update profile", False, "No partner token")
    else:
        resp = make_request("PUT", "/admin/auth/profile", data={"name": "QA Partner P2"}, token=partner_token, expect_status=200)
        if resp and resp.status_code == 200:
            log_test("E1: Partner update profile", True, "Profile updated")
        else:
            log_test("E1: Partner update profile", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # E2: Partner can confirm password
    print("\nE2: Partner can confirm password...")
    if not partner_token:
        log_test("E2: Partner confirm password", False, "No partner token")
    else:
        resp = make_request("POST", "/admin/auth/bekreft", data={"password": QA_PARTNER["password"]}, token=partner_token, expect_status=200)
        if resp and resp.status_code == 200:
            data = resp.json()
            if data.get("ok") is True:
                log_test("E2: Partner confirm password", True, "Password confirmed")
            else:
                log_test("E2: Partner confirm password", False, f"Response: {data}")
        else:
            log_test("E2: Partner confirm password", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # E3: Eier can confirm password
    print("\nE3: Eier can confirm password...")
    if not eier_token:
        log_test("E3: Eier confirm password", False, "No eier token")
    else:
        resp = make_request("POST", "/admin/auth/bekreft", data={"password": QA_EIER["password"]}, token=eier_token, expect_status=200)
        if resp and resp.status_code == 200:
            data = resp.json()
            if data.get("ok") is True:
                log_test("E3: Eier confirm password", True, "Password confirmed")
            else:
                log_test("E3: Eier confirm password", False, f"Response: {data}")
        else:
            log_test("E3: Eier confirm password", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # E4: GET /admin/meetings without key returns 401
    print("\nE4: GET /admin/meetings without key returns 401...")
    resp = make_request("GET", "/admin/meetings", expect_status=401)
    if resp and resp.status_code == 401:
        log_test("E4: Meetings auth required", True, "401 returned")
    else:
        log_test("E4: Meetings auth required", False, f"Status: {resp.status_code if resp else 'None'}")
    
    # E5: Owner login still works
    print("\nE5: Owner login still works...")
    resp = make_request("POST", "/admin/auth/login", data={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, expect_status=200)
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get("token") and data.get("user", {}).get("role") == "owner":
            log_test("E5: Owner login", True, "Owner can still login")
        else:
            log_test("E5: Owner login", False, f"Response: {data}")
    else:
        log_test("E5: Owner login", False, f"Status: {resp.status_code if resp else 'None'}")


def test_f_cleanup():
    """Test (F) OPPRYDDING: mandatory cleanup - delete all QA data"""
    global created_users, created_tasks
    
    print("\n" + "="*80)
    print("(F) MANDATORY CLEANUP")
    print("="*80)
    
    # F1: Delete all QA tasks
    print("\nF1: Delete all QA tasks...")
    deleted_tasks = 0
    for task_id in created_tasks:
        # Master key doesn't need password body
        resp = make_request("DELETE", f"/admin/tasks/{task_id}", key=MASTER_KEY, expect_status=200)
        if resp and resp.status_code == 200:
            deleted_tasks += 1
            print(f"  ✅ Deleted task: {task_id}")
        else:
            print(f"  ❌ Failed to delete task: {task_id}")
    
    log_test("F1: Delete QA tasks", deleted_tasks == len(created_tasks), f"Deleted {deleted_tasks}/{len(created_tasks)} tasks")
    
    # F2: Delete all QA users
    print("\nF2: Delete all QA users...")
    deleted_users = 0
    for user_id in created_users:
        resp = make_request("DELETE", f"/admin/users/{user_id}", key=MASTER_KEY, expect_status=200)
        if resp and resp.status_code == 200:
            deleted_users += 1
            print(f"  ✅ Deleted user: {user_id}")
        else:
            print(f"  ❌ Failed to delete user: {user_id}")
    
    log_test("F2: Delete QA users", deleted_users == len(created_users), f"Deleted {deleted_users}/{len(created_users)} users")
    
    # F3: Verify in MongoDB
    print("\nF3: Verify cleanup in MongoDB...")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check admin_users
        qa_users = list(db.admin_users.find({"name": {"$regex": "^QA "}}))
        users_clean = len(qa_users) == 0
        
        # Check tasks
        qa_tasks = list(db.tasks.find({"title": {"$regex": "^QA "}}))
        tasks_clean = len(qa_tasks) == 0
        
        if users_clean and tasks_clean:
            log_test("F3: MongoDB verification", True, "No QA documents remain")
        else:
            log_test("F3: MongoDB verification", False, f"Found {len(qa_users)} QA users, {len(qa_tasks)} QA tasks")
        
        client.close()
    except Exception as e:
        log_test("F3: MongoDB verification", False, f"Error: {e}")


def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r["passed"])
    failed = total - passed
    
    print(f"\nTotal tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\nFailed tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  ❌ {r['test']}: {r['details']}")
    
    print("\n" + "="*80)


def main():
    """Main test execution"""
    print("="*80)
    print("BACKEND TEST: ROLLER + MODULER + DELOPPGAVER + MENTIONS")
    print("DigiHome Admin API")
    print("="*80)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Master Key: {MASTER_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("\n⚠️  CRITICAL SAFETY RULES:")
    print("  - SendGrid is LIVE: using @example.com addresses only")
    print("  - notify:false on all task operations")
    print("  - Mandatory cleanup at end")
    print("  - DO NOT modify real user 'Martin Kviteberg'")
    
    try:
        test_a_roller()
        test_b_moduler()
        test_c_deloppgaver()
        test_d_mentions()
        test_e_regresjon()
        test_f_cleanup()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted! Running cleanup...")
        test_f_cleanup()
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        print("Running cleanup...")
        test_f_cleanup()
    finally:
        print_summary()


if __name__ == "__main__":
    main()
