#!/usr/bin/env python3
"""
DigiHome SAKER v2 + kontoer/roller Backend Test
Tests authentication, role-based access, tasks with subtasks/recurrence/followers/archived, and chunked file attachments.
"""

import requests
import json
import base64
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MASTER_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test tracking
test_results = []
created_users = []
created_tasks = []
created_files = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")

def cleanup():
    """Cleanup all test data"""
    print("\n=== MANDATORY CLEANUP ===")
    
    # Get owner token for cleanup
    try:
        resp = requests.post(f"{BASE_URL}/admin/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        if resp.status_code == 200:
            owner_token = resp.json().get("token")
        else:
            owner_token = MASTER_KEY
    except:
        owner_token = MASTER_KEY
    
    # Delete all test tasks (including auto-created recurrence tasks)
    for task_id in created_tasks:
        try:
            resp = requests.delete(f"{BASE_URL}/admin/tasks/{task_id}?key={owner_token}")
            if resp.status_code == 200:
                print(f"✓ Deleted task {task_id}")
            else:
                print(f"✗ Failed to delete task {task_id}: {resp.status_code}")
        except Exception as e:
            print(f"✗ Error deleting task {task_id}: {e}")
    
    # Delete all test users
    for user_id in created_users:
        try:
            resp = requests.delete(f"{BASE_URL}/admin/users/{user_id}?key={owner_token}")
            if resp.status_code == 200:
                print(f"✓ Deleted user {user_id}")
            else:
                print(f"✗ Failed to delete user {user_id}: {resp.status_code}")
        except Exception as e:
            print(f"✗ Error deleting user {user_id}: {e}")
    
    # Verify cleanup
    try:
        resp = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
        if resp.status_code == 200:
            tasks = resp.json().get("tasks", [])
            qa_tasks = [t for t in tasks if t.get("title", "").startswith("QA ")]
            if len(qa_tasks) == 0:
                print("✓ All QA tasks cleaned up")
            else:
                print(f"✗ {len(qa_tasks)} QA tasks still remain")
        
        resp = requests.get(f"{BASE_URL}/admin/users?key={owner_token}")
        if resp.status_code == 200:
            members = resp.json().get("members", [])
            qa_users = [u for u in members if u.get("email", "").startswith("qa-")]
            if len(qa_users) == 0:
                print("✓ All QA users cleaned up")
            else:
                print(f"✗ {len(qa_users)} QA users still remain")
    except Exception as e:
        print(f"✗ Error verifying cleanup: {e}")

def main():
    print("=== DigiHome SAKER v2 + kontoer/roller Backend Test ===\n")
    print(f"Base URL: {BASE_URL}")
    print(f"Owner: {OWNER_EMAIL}")
    print(f"Master Key: {MASTER_KEY}\n")
    
    owner_token = None
    qa_bruker_token = None
    qa_admin_token = None
    qa_bruker_id = None
    qa_admin_id = None
    qa_utenepost_id = None
    owner_id = None
    
    try:
        # ===== (A) AUTH & ROLLER =====
        print("=== (A) AUTH & ROLLER ===\n")
        
        # A1: Owner login with correct credentials
        try:
            resp = requests.post(f"{BASE_URL}/admin/auth/login", json={
                "email": OWNER_EMAIL,
                "password": OWNER_PASSWORD
            })
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok") and data.get("token") and data.get("user", {}).get("role") == "owner":
                    owner_token = data["token"]
                    log_test("A1: Owner login with correct credentials", True, 
                            f"Token received, role=owner")
                else:
                    log_test("A1: Owner login with correct credentials", False, 
                            f"Missing token or role: {data}")
            else:
                log_test("A1: Owner login with correct credentials", False, 
                        f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("A1: Owner login with correct credentials", False, str(e))
        
        # A1b: GET /admin/auth/me with token
        try:
            resp = requests.get(f"{BASE_URL}/admin/auth/me?key={owner_token}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok") and data.get("user"):
                    log_test("A1b: GET /admin/auth/me with token", True, 
                            f"User: {data['user'].get('email')}")
                else:
                    log_test("A1b: GET /admin/auth/me with token", False, f"Response: {data}")
            else:
                log_test("A1b: GET /admin/auth/me with token", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A1b: GET /admin/auth/me with token", False, str(e))
        
        # A2: Wrong password returns 401
        try:
            resp = requests.post(f"{BASE_URL}/admin/auth/login", json={
                "email": OWNER_EMAIL,
                "password": "WrongPassword123"
            })
            if resp.status_code == 401:
                log_test("A2: Wrong password returns 401", True)
            else:
                log_test("A2: Wrong password returns 401", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A2: Wrong password returns 401", False, str(e))
        
        # A3: Empty body returns 400
        try:
            resp = requests.post(f"{BASE_URL}/admin/auth/login", json={})
            if resp.status_code == 400:
                log_test("A3: Empty body returns 400", True)
            else:
                log_test("A3: Empty body returns 400", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A3: Empty body returns 400", False, str(e))
        
        # A4: Create QA Bruker (role='bruker')
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "QA Bruker",
                "email": "qa-bruker-test@example.com",
                "role": "bruker",
                "password": "QaTest1234!"
            })
            if resp.status_code == 200:
                data = resp.json()
                member = data.get("member", {})
                if member.get("role") == "bruker" and member.get("harPassord") == True:
                    qa_bruker_id = member.get("id")
                    created_users.append(qa_bruker_id)
                    log_test("A4: Create QA Bruker", True, 
                            f"ID: {qa_bruker_id}, role=bruker, harPassord=true")
                else:
                    log_test("A4: Create QA Bruker", False, f"Member: {member}")
            else:
                log_test("A4: Create QA Bruker", False, 
                        f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("A4: Create QA Bruker", False, str(e))
        
        # A5: Login as QA Bruker
        try:
            resp = requests.post(f"{BASE_URL}/admin/auth/login", json={
                "email": "qa-bruker-test@example.com",
                "password": "QaTest1234!"
            })
            if resp.status_code == 200:
                data = resp.json()
                if data.get("token") and data.get("user", {}).get("role") == "bruker":
                    qa_bruker_token = data["token"]
                    log_test("A5: Login as QA Bruker", True, 
                            f"Token received, role=bruker")
                else:
                    log_test("A5: Login as QA Bruker", False, f"Data: {data}")
            else:
                log_test("A5: Login as QA Bruker", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A5: Login as QA Bruker", False, str(e))
        
        # A6: QA Bruker can access tasks endpoints
        try:
            # GET /admin/tasks
            resp1 = requests.get(f"{BASE_URL}/admin/tasks?key={qa_bruker_token}")
            # GET /admin/users
            resp2 = requests.get(f"{BASE_URL}/admin/users?key={qa_bruker_token}")
            # POST /admin/tasks
            resp3 = requests.post(f"{BASE_URL}/admin/tasks?key={qa_bruker_token}", json={
                "title": "QA rolletest",
                "notify": False
            })
            
            if resp1.status_code == 200 and resp2.status_code == 200 and resp3.status_code == 200:
                task_id = resp3.json().get("task", {}).get("id")
                if task_id:
                    created_tasks.append(task_id)
                log_test("A6: QA Bruker can access tasks endpoints", True, 
                        "GET /tasks, GET /users, POST /tasks all return 200")
            else:
                log_test("A6: QA Bruker can access tasks endpoints", False, 
                        f"Status codes: {resp1.status_code}, {resp2.status_code}, {resp3.status_code}")
        except Exception as e:
            log_test("A6: QA Bruker can access tasks endpoints", False, str(e))
        
        # A6b: GET /admin/tasks/summary should work for QA Bruker (safe - no forfalt with email)
        try:
            resp = requests.get(f"{BASE_URL}/admin/tasks/summary?key={qa_bruker_token}")
            if resp.status_code == 200:
                log_test("A6b: QA Bruker can GET /admin/tasks/summary", True)
            else:
                log_test("A6b: QA Bruker can GET /admin/tasks/summary", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A6b: QA Bruker can GET /admin/tasks/summary", False, str(e))
        
        # A7: QA Bruker CANNOT access admin-only endpoints (server-side enforcement)
        try:
            # GET /admin/pulse
            resp1 = requests.get(f"{BASE_URL}/admin/pulse?key={qa_bruker_token}")
            # POST /admin/users
            resp2 = requests.post(f"{BASE_URL}/admin/users?key={qa_bruker_token}", json={
                "name": "Test", "email": "test@example.com", "role": "bruker"
            })
            # POST /admin/rentmarket/refresh
            resp3 = requests.post(f"{BASE_URL}/admin/rentmarket/refresh?key={qa_bruker_token}")
            
            if resp1.status_code == 401 and resp2.status_code == 401 and resp3.status_code == 401:
                log_test("A7: QA Bruker CANNOT access admin-only endpoints", True, 
                        "All return 401 (server-side enforcement working)")
            else:
                log_test("A7: QA Bruker CANNOT access admin-only endpoints", False, 
                        f"Status codes: {resp1.status_code}, {resp2.status_code}, {resp3.status_code}")
        except Exception as e:
            log_test("A7: QA Bruker CANNOT access admin-only endpoints", False, str(e))
        
        # A8: Create QA Admin
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "QA Admin",
                "email": "qa-admin-test@example.com",
                "role": "admin",
                "password": "QaAdmin1234!"
            })
            if resp.status_code == 200:
                qa_admin_id = resp.json().get("member", {}).get("id")
                created_users.append(qa_admin_id)
                log_test("A8: Create QA Admin", True, f"ID: {qa_admin_id}")
            else:
                log_test("A8: Create QA Admin", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A8: Create QA Admin", False, str(e))
        
        # A9: Login as QA Admin
        try:
            resp = requests.post(f"{BASE_URL}/admin/auth/login", json={
                "email": "qa-admin-test@example.com",
                "password": "QaAdmin1234!"
            })
            if resp.status_code == 200:
                qa_admin_token = resp.json().get("token")
                log_test("A9: Login as QA Admin", True)
            else:
                log_test("A9: Login as QA Admin", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A9: Login as QA Admin", False, str(e))
        
        # A10: Get owner ID
        try:
            resp = requests.get(f"{BASE_URL}/admin/users?key={owner_token}")
            if resp.status_code == 200:
                members = resp.json().get("members", [])
                owner_user = next((u for u in members if u.get("email") == OWNER_EMAIL), None)
                if owner_user:
                    owner_id = owner_user.get("id")
                    log_test("A10: Get owner ID", True, f"Owner ID: {owner_id}")
                else:
                    log_test("A10: Get owner ID", False, "Owner not found in members list")
            else:
                log_test("A10: Get owner ID", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("A10: Get owner ID", False, str(e))
        
        # A11: QA Admin CANNOT modify owner account
        if owner_id and qa_admin_token:
            try:
                # PUT owner account
                resp1 = requests.put(f"{BASE_URL}/admin/users/{owner_id}?key={qa_admin_token}", 
                                    json={"name": "Modified Name"})
                # DELETE owner account
                resp2 = requests.delete(f"{BASE_URL}/admin/users/{owner_id}?key={qa_admin_token}")
                
                if resp1.status_code == 403 and resp2.status_code == 403:
                    log_test("A11: QA Admin CANNOT modify owner account", True, 
                            "Both PUT and DELETE return 403")
                else:
                    log_test("A11: QA Admin CANNOT modify owner account", False, 
                            f"Status codes: PUT={resp1.status_code}, DELETE={resp2.status_code}")
            except Exception as e:
                log_test("A11: QA Admin CANNOT modify owner account", False, str(e))
        
        # A12: Validation - password too short
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "Test",
                "email": "test-short-pw@example.com",
                "role": "bruker",
                "password": "1234"
            })
            if resp.status_code == 400:
                log_test("A12: Validation - password too short returns 400", True)
            else:
                log_test("A12: Validation - password too short returns 400", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A12: Validation - password too short returns 400", False, str(e))
        
        # A13: Validation - password without email
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "Test",
                "role": "bruker",
                "password": "TestPassword123"
            })
            if resp.status_code == 400:
                log_test("A13: Validation - password without email returns 400", True)
            else:
                log_test("A13: Validation - password without email returns 400", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A13: Validation - password without email returns 400", False, str(e))
        
        # A14: Validation - duplicate email
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "Duplicate",
                "email": "qa-bruker-test@example.com",
                "role": "bruker",
                "password": "TestPassword123"
            })
            if resp.status_code == 400:
                log_test("A14: Validation - duplicate email returns 400", True)
            else:
                log_test("A14: Validation - duplicate email returns 400", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("A14: Validation - duplicate email returns 400", False, str(e))
        
        # A15: Update role (bruker -> admin -> bruker)
        if qa_bruker_id and owner_token:
            try:
                # Change to admin
                resp1 = requests.put(f"{BASE_URL}/admin/users/{qa_bruker_id}?key={owner_token}", 
                                    json={"role": "admin"})
                # Change back to bruker
                resp2 = requests.put(f"{BASE_URL}/admin/users/{qa_bruker_id}?key={owner_token}", 
                                    json={"role": "bruker"})
                
                if resp1.status_code == 200 and resp2.status_code == 200:
                    log_test("A15: Update role (bruker -> admin -> bruker)", True)
                else:
                    log_test("A15: Update role (bruker -> admin -> bruker)", False, 
                            f"Status codes: {resp1.status_code}, {resp2.status_code}")
            except Exception as e:
                log_test("A15: Update role (bruker -> admin -> bruker)", False, str(e))
        
        # ===== (B) TASKS-UTVIDELSER =====
        print("\n=== (B) TASKS-UTVIDELSER ===\n")
        
        # B1: Create test person WITHOUT email (safe for digest)
        try:
            resp = requests.post(f"{BASE_URL}/admin/users?key={owner_token}", json={
                "name": "QA UtenEpost",
                "role": "bruker"
            })
            if resp.status_code == 200:
                qa_utenepost_id = resp.json().get("member", {}).get("id")
                created_users.append(qa_utenepost_id)
                log_test("B1: Create test person WITHOUT email", True, 
                        f"ID: {qa_utenepost_id}")
            else:
                log_test("B1: Create test person WITHOUT email", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("B1: Create test person WITHOUT email", False, str(e))
        
        # B2: Create task with subtasks, recurrence, followers, labels, past due date
        task_id_v2 = None
        if qa_utenepost_id:
            try:
                past_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
                resp = requests.post(f"{BASE_URL}/admin/tasks?key={owner_token}", json={
                    "title": "QA v2-sak",
                    "subtasks": [
                        {"text": "Del 1"},
                        {"text": "Del 2"}
                    ],
                    "recurrence": "monthly",
                    "followers": [qa_utenepost_id],
                    "labels": ["qa"],
                    "dueDate": past_date,
                    "assigneeId": qa_utenepost_id,
                    "notify": False
                })
                if resp.status_code == 200:
                    data = resp.json()
                    task = data.get("task", {})
                    task_id_v2 = task.get("id")
                    created_tasks.append(task_id_v2)
                    
                    # Verify fields
                    checks = []
                    checks.append(len(task.get("subtasks", [])) == 2)
                    checks.append(all(not st.get("done") for st in task.get("subtasks", [])))
                    checks.append(task.get("recurrence") == "monthly")
                    checks.append(qa_utenepost_id in task.get("followers", []))
                    checks.append(task.get("attachments", []) == [])
                    checks.append(task.get("archived") == False)
                    
                    if all(checks):
                        log_test("B2: Create task with all v2 features", True, 
                                f"ID: {task_id_v2}, subtasks=2, recurrence=monthly, followers=1")
                    else:
                        log_test("B2: Create task with all v2 features", False, 
                                f"Some fields incorrect: {task}")
                else:
                    log_test("B2: Create task with all v2 features", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("B2: Create task with all v2 features", False, str(e))
        
        # B3: Update subtasks (toggle done)
        if task_id_v2:
            try:
                # Get current task
                resp = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
                task = next((t for t in resp.json().get("tasks", []) if t.get("id") == task_id_v2), None)
                
                if task:
                    subtasks = task.get("subtasks", [])
                    if len(subtasks) >= 2:
                        subtasks[0]["done"] = True
                        
                        resp = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                          json={"subtasks": subtasks, "notify": False})
                        
                        if resp.status_code == 200:
                            updated_task = resp.json().get("task", {})
                            if updated_task.get("subtasks", [])[0].get("done") == True:
                                log_test("B3: Update subtasks (toggle done)", True)
                            else:
                                log_test("B3: Update subtasks (toggle done)", False, 
                                        "Subtask not marked as done")
                        else:
                            log_test("B3: Update subtasks (toggle done)", False, 
                                    f"Status {resp.status_code}")
                    else:
                        log_test("B3: Update subtasks (toggle done)", False, 
                                "Not enough subtasks")
                else:
                    log_test("B3: Update subtasks (toggle done)", False, 
                            "Task not found")
            except Exception as e:
                log_test("B3: Update subtasks (toggle done)", False, str(e))
        
        # B4: Update followers (remove and add back)
        if task_id_v2 and qa_utenepost_id:
            try:
                # Remove followers
                resp1 = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                    json={"followers": [], "notify": False})
                # Add back
                resp2 = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                    json={"followers": [qa_utenepost_id], "notify": False})
                
                if resp1.status_code == 200 and resp2.status_code == 200:
                    task1 = resp1.json().get("task", {})
                    task2 = resp2.json().get("task", {})
                    
                    if len(task1.get("followers", [])) == 0 and qa_utenepost_id in task2.get("followers", []):
                        # Check activity log
                        activity = task2.get("activity", [])
                        has_remove = any("fjernet" in a.get("text", "").lower() for a in activity)
                        has_add = any("lagt til" in a.get("text", "").lower() for a in activity)
                        
                        if has_remove and has_add:
                            log_test("B4: Update followers with activity logging", True)
                        else:
                            log_test("B4: Update followers with activity logging", False, 
                                    "Activity log missing entries")
                    else:
                        log_test("B4: Update followers with activity logging", False, 
                                "Followers not updated correctly")
                else:
                    log_test("B4: Update followers with activity logging", False, 
                            f"Status codes: {resp1.status_code}, {resp2.status_code}")
            except Exception as e:
                log_test("B4: Update followers with activity logging", False, str(e))
        
        # B5: Recurrence - complete task creates next occurrence
        next_task_id = None
        if task_id_v2:
            try:
                resp = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                  json={"status": "done", "notify": False})
                
                if resp.status_code == 200:
                    data = resp.json()
                    next_task = data.get("nesteTask")
                    
                    if next_task:
                        next_task_id = next_task.get("id")
                        created_tasks.append(next_task_id)
                        
                        # Verify next task
                        checks = []
                        checks.append(next_task.get("status") == "inbox")
                        checks.append(next_task.get("dueDate") is not None)
                        checks.append(all(not st.get("done") for st in next_task.get("subtasks", [])))
                        checks.append(qa_utenepost_id in next_task.get("followers", []))
                        
                        # Check original task has completedAt
                        original_task = data.get("task", {})
                        checks.append(original_task.get("completedAt") is not None)
                        
                        if all(checks):
                            log_test("B5: Recurrence creates next occurrence", True, 
                                    f"Next task ID: {next_task_id}, status=inbox, subtasks reset")
                        else:
                            log_test("B5: Recurrence creates next occurrence", False, 
                                    f"Next task fields incorrect: {next_task}")
                    else:
                        log_test("B5: Recurrence creates next occurrence", False, 
                                "No nesteTask in response")
                else:
                    log_test("B5: Recurrence creates next occurrence", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("B5: Recurrence creates next occurrence", False, str(e))
        
        # B6: Archive task
        if task_id_v2:
            try:
                # Archive
                resp1 = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                    json={"archived": True, "notify": False})
                # Check not in regular list
                resp2 = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
                # Check in archive list
                resp3 = requests.get(f"{BASE_URL}/admin/tasks?arkiv=1&key={owner_token}")
                # Unarchive
                resp4 = requests.put(f"{BASE_URL}/admin/tasks/{task_id_v2}?key={owner_token}", 
                                    json={"archived": False, "notify": False})
                # Check back in regular list
                resp5 = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
                
                if all(r.status_code == 200 for r in [resp1, resp2, resp3, resp4, resp5]):
                    regular_tasks = resp2.json().get("tasks", [])
                    archive_tasks = resp3.json().get("tasks", [])
                    restored_tasks = resp5.json().get("tasks", [])
                    
                    not_in_regular = not any(t.get("id") == task_id_v2 for t in regular_tasks)
                    in_archive = any(t.get("id") == task_id_v2 for t in archive_tasks)
                    back_in_regular = any(t.get("id") == task_id_v2 for t in restored_tasks)
                    
                    if not_in_regular and in_archive and back_in_regular:
                        log_test("B6: Archive and unarchive task", True)
                    else:
                        log_test("B6: Archive and unarchive task", False, 
                                f"Archive flow incorrect: not_in_regular={not_in_regular}, in_archive={in_archive}, back={back_in_regular}")
                else:
                    log_test("B6: Archive and unarchive task", False, 
                            "Some requests failed")
            except Exception as e:
                log_test("B6: Archive and unarchive task", False, str(e))
        
        # B7: Invalid recurrence is ignored
        try:
            resp = requests.post(f"{BASE_URL}/admin/tasks?key={owner_token}", json={
                "title": "QA invalid recurrence",
                "recurrence": "daily",
                "notify": False
            })
            if resp.status_code == 200:
                task = resp.json().get("task", {})
                task_id = task.get("id")
                created_tasks.append(task_id)
                
                if task.get("recurrence") is None or task.get("recurrence") == "":
                    log_test("B7: Invalid recurrence is ignored", True)
                else:
                    log_test("B7: Invalid recurrence is ignored", False, 
                            f"Recurrence not null: {task.get('recurrence')}")
            else:
                log_test("B7: Invalid recurrence is ignored", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("B7: Invalid recurrence is ignored", False, str(e))
        
        # ===== (C) VEDLEGG (chunked) =====
        print("\n=== (C) VEDLEGG (chunked) ===\n")
        
        # C1: Upload file in 2 chunks
        file_id = None
        test_task_id = None
        if owner_token:
            try:
                # Create a test task for attachments
                resp = requests.post(f"{BASE_URL}/admin/tasks?key={owner_token}", json={
                    "title": "QA vedlegg test",
                    "notify": False
                })
                if resp.status_code == 200:
                    test_task_id = resp.json().get("task", {}).get("id")
                    created_tasks.append(test_task_id)
                    
                    # Create test content
                    content = "DigiHome QA vedleggstest 12345"
                    content_b64 = base64.b64encode(content.encode()).decode()
                    
                    # Split into 2 chunks
                    mid = len(content_b64) // 2
                    chunk0 = content_b64[:mid]
                    chunk1 = content_b64[mid:]
                    
                    upload_id = f"qa-up-{int(time.time())}"
                    
                    # Upload chunk 0
                    resp1 = requests.post(f"{BASE_URL}/admin/task-files/chunk?key={owner_token}", json={
                        "uploadId": upload_id,
                        "taskId": test_task_id,
                        "index": 0,
                        "total": 2,
                        "data": chunk0,
                        "name": "qa-test.txt",
                        "type": "text/plain",
                        "actor": "QA"
                    })
                    
                    # Upload chunk 1
                    resp2 = requests.post(f"{BASE_URL}/admin/task-files/chunk?key={owner_token}", json={
                        "uploadId": upload_id,
                        "taskId": test_task_id,
                        "index": 1,
                        "total": 2,
                        "data": chunk1,
                        "name": "qa-test.txt",
                        "type": "text/plain",
                        "actor": "QA"
                    })
                    
                    if resp1.status_code == 200 and resp2.status_code == 200:
                        data1 = resp1.json()
                        data2 = resp2.json()
                        
                        if (data1.get("ok") and not data1.get("complete") and data1.get("mottatt") == 1 and
                            data2.get("ok") and data2.get("complete") and data2.get("attachment")):
                            
                            file_id = data2.get("attachment", {}).get("id")
                            created_files.append(file_id)
                            
                            log_test("C1: Upload file in 2 chunks", True, 
                                    f"File ID: {file_id}, name: {data2.get('attachment', {}).get('name')}")
                        else:
                            log_test("C1: Upload file in 2 chunks", False, 
                                    f"Chunk responses incorrect: {data1}, {data2}")
                    else:
                        log_test("C1: Upload file in 2 chunks", False, 
                                f"Status codes: {resp1.status_code}, {resp2.status_code}")
                else:
                    log_test("C1: Upload file in 2 chunks", False, 
                            "Failed to create test task")
            except Exception as e:
                log_test("C1: Upload file in 2 chunks", False, str(e))
        
        # C2: Task has attachment
        if test_task_id and file_id:
            try:
                resp = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
                if resp.status_code == 200:
                    task = next((t for t in resp.json().get("tasks", []) 
                               if t.get("id") == test_task_id), None)
                    
                    if task:
                        attachments = task.get("attachments", [])
                        if len(attachments) == 1 and attachments[0].get("id") == file_id:
                            log_test("C2: Task has attachment", True)
                        else:
                            log_test("C2: Task has attachment", False, 
                                    f"Attachments: {attachments}")
                    else:
                        log_test("C2: Task has attachment", False, "Task not found")
                else:
                    log_test("C2: Task has attachment", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("C2: Task has attachment", False, str(e))
        
        # C3: Download file
        if file_id:
            try:
                resp = requests.get(f"{BASE_URL}/admin/task-files/{file_id}?key={owner_token}")
                if resp.status_code == 200:
                    content = resp.text
                    expected = "DigiHome QA vedleggstest 12345"
                    
                    if content == expected:
                        # Check Content-Disposition
                        cd = resp.headers.get("Content-Disposition", "")
                        if "qa-test.txt" in cd:
                            log_test("C3: Download file", True, 
                                    "Content matches, Content-Disposition correct")
                        else:
                            log_test("C3: Download file", False, 
                                    f"Content-Disposition missing filename: {cd}")
                    else:
                        log_test("C3: Download file", False, 
                                f"Content mismatch: got '{content}', expected '{expected}'")
                else:
                    log_test("C3: Download file", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("C3: Download file", False, str(e))
        
        # C4: Delete file
        if file_id and test_task_id:
            try:
                resp = requests.delete(f"{BASE_URL}/admin/task-files/{file_id}?key={owner_token}")
                if resp.status_code == 200:
                    # Check task has 0 attachments
                    resp2 = requests.get(f"{BASE_URL}/admin/tasks?key={owner_token}")
                    if resp2.status_code == 200:
                        task = next((t for t in resp2.json().get("tasks", []) 
                                   if t.get("id") == test_task_id), None)
                        
                        if task and len(task.get("attachments", [])) == 0:
                            log_test("C4: Delete file", True)
                        else:
                            log_test("C4: Delete file", False, 
                                    "Attachment not removed from task")
                    else:
                        log_test("C4: Delete file", False, 
                                "Failed to verify task")
                else:
                    log_test("C4: Delete file", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("C4: Delete file", False, str(e))
        
        # C5: Chunk error - invalid index
        if test_task_id:
            try:
                resp = requests.post(f"{BASE_URL}/admin/task-files/chunk?key={owner_token}", json={
                    "uploadId": "qa-error-test",
                    "taskId": test_task_id,
                    "index": 2,
                    "total": 2,
                    "data": "dGVzdA==",
                    "name": "test.txt",
                    "type": "text/plain",
                    "actor": "QA"
                })
                if resp.status_code == 400:
                    log_test("C5: Chunk error - invalid index returns 400", True)
                else:
                    log_test("C5: Chunk error - invalid index returns 400", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("C5: Chunk error - invalid index returns 400", False, str(e))
        
        # C6: Chunk error - unknown taskId
        try:
            resp = requests.post(f"{BASE_URL}/admin/task-files/chunk?key={owner_token}", json={
                "uploadId": "qa-error-test2",
                "taskId": "unknown-task-id-12345",
                "index": 0,
                "total": 1,
                "data": "dGVzdA==",
                "name": "test.txt",
                "type": "text/plain",
                "actor": "QA"
            })
            if resp.status_code == 404:
                log_test("C6: Chunk error - unknown taskId returns 404", True)
            else:
                log_test("C6: Chunk error - unknown taskId returns 404", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("C6: Chunk error - unknown taskId returns 404", False, str(e))
        
        # C7: Role check - QA Bruker can upload chunks
        if test_task_id and qa_bruker_token:
            try:
                resp = requests.post(f"{BASE_URL}/admin/task-files/chunk?key={qa_bruker_token}", json={
                    "uploadId": f"qa-bruker-up-{int(time.time())}",
                    "taskId": test_task_id,
                    "index": 0,
                    "total": 1,
                    "data": base64.b64encode(b"test").decode(),
                    "name": "bruker-test.txt",
                    "type": "text/plain",
                    "actor": "QA Bruker"
                })
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("ok") and data.get("complete"):
                        # Clean up the file
                        file_id = data.get("attachment", {}).get("id")
                        if file_id:
                            requests.delete(f"{BASE_URL}/admin/task-files/{file_id}?key={owner_token}")
                        log_test("C7: QA Bruker can upload chunks", True)
                    else:
                        log_test("C7: QA Bruker can upload chunks", False, 
                                f"Response: {data}")
                else:
                    log_test("C7: QA Bruker can upload chunks", False, 
                            f"Status {resp.status_code}")
            except Exception as e:
                log_test("C7: QA Bruker can upload chunks", False, str(e))
        
        # ===== (D) REMIND-FEILBANER (error paths only) =====
        print("\n=== (D) REMIND-FEILBANER ===\n")
        
        # D1: Remind without assignee returns 400
        try:
            resp = requests.post(f"{BASE_URL}/admin/tasks?key={owner_token}", json={
                "title": "QA no assignee",
                "notify": False
            })
            if resp.status_code == 200:
                task_id = resp.json().get("task", {}).get("id")
                created_tasks.append(task_id)
                
                resp2 = requests.post(f"{BASE_URL}/admin/tasks/{task_id}/remind?key={owner_token}")
                if resp2.status_code == 400:
                    log_test("D1: Remind without assignee returns 400", True)
                else:
                    log_test("D1: Remind without assignee returns 400", False, 
                            f"Status {resp2.status_code}")
            else:
                log_test("D1: Remind without assignee returns 400", False, 
                        "Failed to create task")
        except Exception as e:
            log_test("D1: Remind without assignee returns 400", False, str(e))
        
        # D2: Remind with unknown task ID returns 404
        try:
            resp = requests.post(f"{BASE_URL}/admin/tasks/unknown-task-id-12345/remind?key={owner_token}")
            if resp.status_code == 404:
                log_test("D2: Remind with unknown task ID returns 404", True)
            else:
                log_test("D2: Remind with unknown task ID returns 404", False, 
                        f"Status {resp.status_code}")
        except Exception as e:
            log_test("D2: Remind with unknown task ID returns 404", False, str(e))
        
        # ===== SUMMARY =====
        print("\n=== TEST SUMMARY ===\n")
        
        passed = sum(1 for t in test_results if t["passed"])
        total = len(test_results)
        
        print(f"Total: {passed}/{total} tests passed ({100*passed//total}% success rate)\n")
        
        if passed < total:
            print("Failed tests:")
            for t in test_results:
                if not t["passed"]:
                    print(f"  ❌ {t['name']}")
                    if t["details"]:
                        print(f"     {t['details']}")
        
    finally:
        # Always cleanup
        cleanup()

if __name__ == "__main__":
    main()
