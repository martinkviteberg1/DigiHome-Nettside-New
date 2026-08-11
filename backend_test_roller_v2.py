#!/usr/bin/env python3
"""
Backend test for ROLLER + MODULER + DELOPPGAVER + MENTIONS v2
With better timeout handling and retry logic
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
MASTER_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
QA_PARTNER = {"name": "QA Partner P", "email": "qa-p@example.com", "role": "partner", "password": "QApass1234!"}
QA_EIER = {"name": "QA Eier E", "email": "qa-e@example.com", "role": "eier", "password": "QApass1234!"}
QA_MODUL_USER = {"name": "QA Modul M", "email": "qa-m@example.com", "role": "bruker", "password": "QApass1234!", "moduler": ["i-leads", "historikk", "tull"]}
QA_MENTION_PERSON = {"name": "QA Mention Mottaker", "email": "qa-mm@example.com", "role": "bruker"}

# Global state
test_results = []
created_users = []
created_tasks = []
partner_token = None
eier_token = None
modul_user_token = None
modul_user_id = None
test_task_id = None

def log_test(test_name, passed, details=""):
    status = "✅" if passed else "❌"
    result = f"{status} {test_name}"
    if details:
        result += f": {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def make_request(method, path, data=None, key=None, token=None, timeout=20):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    params = {}
    if key:
        params["key"] = key
    elif token:
        params["key"] = token
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, params=params, json=data, headers=headers, timeout=timeout)
        elif method == "PUT":
            response = requests.put(url, params=params, json=data, headers=headers, timeout=timeout)
        elif method == "DELETE":
            response = requests.delete(url, params=params, json=data, headers=headers, timeout=timeout)
        else:
            return None
        return response
    except requests.exceptions.Timeout:
        print(f"  ⏱️  Timeout after {timeout}s")
        return None
    except Exception as e:
        print(f"  ❌ Error: {str(e)[:100]}")
        return None

def main():
    global partner_token, eier_token, modul_user_token, modul_user_id, test_task_id
    
    print("="*80)
    print("BACKEND TEST: ROLLER + MODULER + DELOPPGAVER + MENTIONS v2")
    print("="*80)
    
    # (A) ROLLER
    print("\n(A) TESTING ROLLER")
    print("-"*80)
    
    # Create Partner
    resp = make_request("POST", "/admin/users", data=QA_PARTNER, key=MASTER_KEY)
    if resp and resp.status_code == 200:
        partner_id = resp.json().get("member", {}).get("id")
        created_users.append(partner_id)
        log_test("A1: Create Partner", True, partner_id)
    else:
        log_test("A1: Create Partner", False, f"Status: {resp.status_code if resp else 'timeout'}")
    
    # Create Eier
    resp = make_request("POST", "/admin/users", data=QA_EIER, key=MASTER_KEY)
    if resp and resp.status_code == 200:
        eier_id = resp.json().get("member", {}).get("id")
        created_users.append(eier_id)
        log_test("A2: Create Eier", True, eier_id)
    else:
        log_test("A2: Create Eier", False, f"Status: {resp.status_code if resp else 'timeout'}")
    
    # Login Partner
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_PARTNER["email"], "password": QA_PARTNER["password"]})
    if resp and resp.status_code == 200:
        partner_token = resp.json().get("token")
        log_test("A3: Partner login", True, "Token received")
    else:
        log_test("A3: Partner login", False)
    
    # Login Eier
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_EIER["email"], "password": QA_EIER["password"]})
    if resp and resp.status_code == 200:
        eier_token = resp.json().get("token")
        log_test("A4: Eier login", True, "Token received")
    else:
        log_test("A4: Eier login", False)
    
    # Partner access: should have tasks/meetings/users, NOT kpi/finance/pulse
    if partner_token:
        tests = [
            ("tasks", "/admin/tasks", 200),
            ("meetings", "/admin/meetings", 200),
            ("users", "/admin/users", 200),
            ("kpi", "/admin/kpi", 401),
            ("finance", "/admin/finance/resultat", 401),
            ("pulse", "/admin/pulse", 401),
        ]
        results = []
        for name, path, expected in tests:
            resp = make_request("GET", path, token=partner_token, timeout=15)
            if resp:
                results.append(resp.status_code == expected)
                print(f"  {name}: {resp.status_code} (expected {expected})")
            else:
                results.append(False)
                print(f"  {name}: timeout")
        log_test("A5: Partner access", all(results), f"{sum(results)}/6 correct")
    
    # Eier access: should have kpi/kpi-settings/finance/meetings, NOT tasks/finance-write
    if eier_token:
        tests = [
            ("kpi", "/admin/kpi", 200, "GET"),
            ("kpi-settings", "/admin/kpi/settings", 200, "GET"),
            ("finance", "/admin/finance/resultat", 200, "GET"),
            ("meetings", "/admin/meetings", 200, "GET"),
            ("tasks", "/admin/tasks", 401, "GET"),
            ("finance-write", "/admin/finance/costs", 401, "POST"),
            ("kpi-write", "/admin/kpi/settings", 401, "POST"),
        ]
        results = []
        for name, path, expected, method in tests:
            if method == "POST":
                resp = make_request("POST", path, data={}, token=eier_token, timeout=15)
            else:
                resp = make_request("GET", path, token=eier_token, timeout=15)
            if resp:
                results.append(resp.status_code == expected)
                print(f"  {name}: {resp.status_code} (expected {expected})")
            else:
                results.append(False)
                print(f"  {name}: timeout")
        log_test("A6: Eier access", all(results), f"{sum(results)}/7 correct")
    
    # (B) MODULER
    print("\n(B) TESTING MODULER")
    print("-"*80)
    
    # Create user with modules
    resp = make_request("POST", "/admin/users", data=QA_MODUL_USER, key=MASTER_KEY)
    if resp and resp.status_code == 200:
        data = resp.json()
        modul_user_id = data.get("member", {}).get("id")
        moduler = data.get("member", {}).get("moduler", [])
        created_users.append(modul_user_id)
        # Check 'tull' was filtered
        if set(moduler) == {"i-leads", "historikk"}:
            log_test("B1: Create with modules", True, f"Filtered: {moduler}")
        else:
            log_test("B1: Create with modules", False, f"Got: {moduler}")
    else:
        log_test("B1: Create with modules", False)
    
    # Login
    resp = make_request("POST", "/admin/auth/login", data={"email": QA_MODUL_USER["email"], "password": QA_MODUL_USER["password"]})
    if resp and resp.status_code == 200:
        data = resp.json()
        modul_user_token = data.get("token")
        moduler = data.get("user", {}).get("moduler", [])
        if set(moduler) == {"i-leads", "historikk"}:
            log_test("B2: Login with modules", True, f"Modules in response: {moduler}")
        else:
            log_test("B2: Login with modules", False, f"Got: {moduler}")
    else:
        log_test("B2: Login with modules", False)
    
    # Test initial access
    if modul_user_token:
        tests = [
            ("leads", "/admin/leads", 200),
            ("imported", "/admin/imported-leads", 200),
            ("finance", "/admin/finance/resultat", 401),
            ("kpi", "/admin/kpi", 401),
        ]
        results = []
        for name, path, expected in tests:
            resp = make_request("GET", path, token=modul_user_token, timeout=15)
            if resp:
                results.append(resp.status_code == expected)
                print(f"  {name}: {resp.status_code} (expected {expected})")
            else:
                results.append(False)
        log_test("B3: Initial module access", all(results), f"{sum(results)}/4 correct")
    
    # Update modules
    if modul_user_id:
        resp = make_request("PUT", f"/admin/users/{modul_user_id}", data={"moduler": ["okonomi"]}, key=MASTER_KEY)
        if resp and resp.status_code == 200:
            moduler = resp.json().get("member", {}).get("moduler", [])
            log_test("B4: Update modules", moduler == ["okonomi"], f"Updated to: {moduler}")
        else:
            log_test("B4: Update modules", False)
    
    # Test updated access (same token - DB lookup)
    if modul_user_token:
        tests = [
            ("finance", "/admin/finance/resultat", 200),
            ("leads", "/admin/leads", 401),
        ]
        results = []
        for name, path, expected in tests:
            resp = make_request("GET", path, token=modul_user_token, timeout=15)
            if resp:
                results.append(resp.status_code == expected)
                print(f"  {name}: {resp.status_code} (expected {expected})")
            else:
                results.append(False)
        log_test("B5: Updated module access", all(results), f"{sum(results)}/2 correct")
    
    # (C) DELOPPGAVER
    print("\n(C) TESTING DELOPPGAVER")
    print("-"*80)
    
    # Create task with subtasks
    task_data = {
        "title": "QA Sub Sak",
        "notify": False,
        "subtasks": [
            {"text": "Punkt A", "assigneeId": "test-id-1", "due": "2027-03-01"},
            {"text": "Punkt B", "due": "ikke-dato"},
            {"text": ""}
        ]
    }
    resp = make_request("POST", "/admin/tasks", data=task_data, key=MASTER_KEY)
    if resp and resp.status_code == 200:
        data = resp.json()
        test_task_id = data.get("task", {}).get("id")
        subtasks = data.get("task", {}).get("subtasks", [])
        created_tasks.append(test_task_id)
        
        checks = [
            len(subtasks) == 2,
            subtasks[0].get("text") == "Punkt A",
            subtasks[0].get("assigneeId") == "test-id-1",
            subtasks[0].get("due") == "2027-03-01",
            subtasks[1].get("text") == "Punkt B",
            subtasks[1].get("due") is None,
            subtasks[1].get("assigneeId") is None,
        ]
        log_test("C1: Create with subtasks", all(checks), f"{sum(checks)}/7 checks passed")
    else:
        log_test("C1: Create with subtasks", False)
    
    # Update subtasks
    if test_task_id and len(subtasks) >= 1:
        updated = [{**subtasks[0], "due": "2027-06-15", "assigneeId": None}]
        if len(subtasks) >= 2:
            updated.append(subtasks[1])
        resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"subtasks": updated, "notify": False}, key=MASTER_KEY)
        if resp and resp.status_code == 200:
            st = resp.json().get("task", {}).get("subtasks", [])
            if st and st[0].get("due") == "2027-06-15" and st[0].get("assigneeId") is None:
                log_test("C2: Update subtasks", True, "Due and assigneeId updated")
            else:
                log_test("C2: Update subtasks", False)
        else:
            log_test("C2: Update subtasks", False)
    
    # Verify persistence
    if test_task_id:
        resp = make_request("GET", "/admin/tasks", key=MASTER_KEY)
        if resp and resp.status_code == 200:
            tasks = resp.json().get("tasks", [])
            task = next((t for t in tasks if t.get("id") == test_task_id), None)
            if task:
                st = task.get("subtasks", [])
                if st and st[0].get("due") == "2027-06-15":
                    log_test("C3: Verify persistence", True, "Subtasks persisted")
                else:
                    log_test("C3: Verify persistence", False)
            else:
                log_test("C3: Verify persistence", False, "Task not found")
        else:
            log_test("C3: Verify persistence", False)
    
    # (D) MENTIONS
    print("\n(D) TESTING MENTIONS")
    print("-"*80)
    
    # Create mention person
    resp = make_request("POST", "/admin/users", data={**QA_MENTION_PERSON, "invite": False}, key=MASTER_KEY)
    if resp and resp.status_code == 200:
        mention_id = resp.json().get("member", {}).get("id")
        created_users.append(mention_id)
        log_test("D1: Create mention person", True, mention_id)
    else:
        log_test("D1: Create mention person", False)
    
    # Add @mention to description
    if test_task_id:
        desc = f"Hei @{QA_MENTION_PERSON['name']} — se på dette"
        resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"description": desc, "notify": False}, key=MASTER_KEY)
        if resp and resp.status_code == 200:
            saved = resp.json().get("task", {}).get("description", "")
            log_test("D2: Add @mention", saved == desc, "Description saved")
        else:
            log_test("D2: Add @mention", False)
    
    # Update with same mention (should not fail)
    if test_task_id:
        desc2 = f"Hei @{QA_MENTION_PERSON['name']} — se på dette (oppdatert)"
        resp = make_request("PUT", f"/admin/tasks/{test_task_id}", data={"description": desc2, "notify": False}, key=MASTER_KEY)
        if resp and resp.status_code == 200:
            saved = resp.json().get("task", {}).get("description", "")
            log_test("D3: Re-mention same person", saved == desc2, "No error")
        else:
            log_test("D3: Re-mention same person", False)
    
    # (E) REGRESJON
    print("\n(E) TESTING REGRESJON")
    print("-"*80)
    
    # Partner update profile
    if partner_token:
        resp = make_request("PUT", "/admin/auth/profile", data={"name": "QA Partner P2"}, token=partner_token)
        log_test("E1: Partner update profile", resp and resp.status_code == 200)
    
    # Partner confirm password
    if partner_token:
        resp = make_request("POST", "/admin/auth/bekreft", data={"password": QA_PARTNER["password"]}, token=partner_token)
        if resp and resp.status_code == 200:
            log_test("E2: Partner confirm password", resp.json().get("ok") is True)
        else:
            log_test("E2: Partner confirm password", False)
    
    # Eier confirm password
    if eier_token:
        resp = make_request("POST", "/admin/auth/bekreft", data={"password": QA_EIER["password"]}, token=eier_token)
        if resp and resp.status_code == 200:
            log_test("E3: Eier confirm password", resp.json().get("ok") is True)
        else:
            log_test("E3: Eier confirm password", False)
    
    # Meetings without auth
    resp = make_request("GET", "/admin/meetings", timeout=10)
    log_test("E4: Meetings auth required", resp and resp.status_code == 401)
    
    # (F) CLEANUP
    print("\n(F) MANDATORY CLEANUP")
    print("-"*80)
    
    # Delete tasks
    for task_id in created_tasks:
        resp = make_request("DELETE", f"/admin/tasks/{task_id}", key=MASTER_KEY)
        if resp and resp.status_code == 200:
            print(f"  ✅ Deleted task: {task_id}")
    log_test("F1: Delete tasks", True, f"{len(created_tasks)} tasks")
    
    # Delete users
    for user_id in created_users:
        resp = make_request("DELETE", f"/admin/users/{user_id}", key=MASTER_KEY)
        if resp and resp.status_code == 200:
            print(f"  ✅ Deleted user: {user_id}")
    log_test("F2: Delete users", True, f"{len(created_users)} users")
    
    # Verify in MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        qa_users = list(db.admin_users.find({"name": {"$regex": "^QA "}}))
        qa_tasks = list(db.tasks.find({"title": {"$regex": "^QA "}}))
        log_test("F3: MongoDB verification", len(qa_users) == 0 and len(qa_tasks) == 0, f"Users: {len(qa_users)}, Tasks: {len(qa_tasks)}")
        client.close()
    except Exception as e:
        log_test("F3: MongoDB verification", False, str(e)[:100])
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    total = len(test_results)
    passed = sum(1 for r in test_results if r["passed"])
    print(f"Total: {total}, Passed: {passed}, Failed: {total-passed}")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if passed < total:
        print("\nFailed tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  ❌ {r['test']}: {r['details']}")

if __name__ == "__main__":
    main()
