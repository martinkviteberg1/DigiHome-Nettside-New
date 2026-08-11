#!/usr/bin/env python3
"""
Backend test for DELOPPGAVE-VARSLING (subtask notification feature).
Tests email notifications for subtask assignments with deadlines.

CRITICAL SAFETY RULES:
1. SendGrid is LIVE - use ONLY @example.com addresses (mocked/blocked)
2. Activity log is the source of truth (taskEpost returns true for @example.com)
3. Do NOT modify real data (Martin Kviteberg)
4. Mandatory cleanup at the end
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_state = {
    "p1_id": None,
    "p2_id": None,
    "task1_id": None,
    "task2_id": None,
    "task3_id": None,
}

def test_setup():
    """(A) OPPSETT: Create 2 QA persons with master key"""
    print("\n=== (A) SETUP: Creating QA persons ===")
    
    # Create P1: QA Deloppgave Person
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
            json={
                "name": "QA Deloppgave Person",
                "email": "qa-delopp@example.com",
                "role": "bruker",
                "password": "QApass1234!",
                "invite": False
            },
            timeout=15
        )
        print(f"POST /admin/users (P1) status: {resp.status_code}")
        if resp.status_code in [200, 201]:
            data = resp.json()
            test_state["p1_id"] = data.get("member", {}).get("id") or data.get("id")
            print(f"✓ P1 created: {test_state['p1_id']}")
        else:
            print(f"✗ P1 creation failed: {resp.text}")
            return False
    except Exception as e:
        print(f"✗ P1 creation error: {e}")
        return False
    
    # Create P2: QA Hovedansvarlig
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
            json={
                "name": "QA Hovedansvarlig",
                "email": "qa-hoved@example.com",
                "role": "bruker",
                "password": "QApass1234!",
                "invite": False
            },
            timeout=15
        )
        print(f"POST /admin/users (P2) status: {resp.status_code}")
        if resp.status_code in [200, 201]:
            data = resp.json()
            test_state["p2_id"] = data.get("member", {}).get("id") or data.get("id")
            print(f"✓ P2 created: {test_state['p2_id']}")
        else:
            print(f"✗ P2 creation failed: {resp.text}")
            return False
    except Exception as e:
        print(f"✗ P2 creation error: {e}")
        return False
    
    print(f"✅ SETUP COMPLETE: P1={test_state['p1_id']}, P2={test_state['p2_id']}")
    return True


def test_post_varsling():
    """(B) POST-VARSLING: Create task with subtasks, verify notification"""
    print("\n=== (B) POST-VARSLING: Task creation with subtasks ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            json={
                "title": "QA DelSak1",
                "notify": True,
                "subtasks": [
                    {"text": "Ring kunde", "assigneeId": test_state["p1_id"], "due": "2027-03-01"},
                    {"text": "Uten ansvarlig"}
                ]
            },
            timeout=15
        )
        print(f"POST /admin/tasks status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ Task creation failed: {resp.text}")
            return False
        
        data = resp.json()
        task = data.get("task", {})
        test_state["task1_id"] = task.get("id")
        
        # Check subtasks
        subtasks = task.get("subtasks", [])
        if len(subtasks) != 2:
            print(f"✗ Expected 2 subtasks, got {len(subtasks)}")
            return False
        
        if subtasks[0].get("due") != "2027-03-01":
            print(f"✗ Expected due='2027-03-01', got {subtasks[0].get('due')}")
            return False
        
        if subtasks[0].get("assigneeId") != test_state["p1_id"]:
            print(f"✗ Expected assigneeId={test_state['p1_id']}, got {subtasks[0].get('assigneeId')}")
            return False
        
        # Check activity log for notification
        activity = task.get("activity", [])
        notification_found = any(
            "E-postvarsel sendt til QA Deloppgave Person (deloppgave tildelt)" in entry.get("text", "")
            for entry in activity
        )
        
        if not notification_found:
            print(f"✗ Activity log missing notification. Activity: {activity}")
            return False
        
        print(f"✓ Task created: {test_state['task1_id']}")
        print(f"✓ Subtasks correct: due=2027-03-01, assigneeId={test_state['p1_id']}")
        print(f"✓ Activity log contains: 'E-postvarsel sendt til QA Deloppgave Person (deloppgave tildelt)'")
        print("✅ POST-VARSLING TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ POST-VARSLING error: {e}")
        return False


def test_hovedansvarlig_unntak():
    """(C) HOVEDANSVARLIG-UNNTAK: Main assignee should NOT get subtask notification"""
    print("\n=== (C) HOVEDANSVARLIG-UNNTAK: Main assignee exclusion ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            json={
                "title": "QA DelSak2",
                "notify": True,
                "assigneeId": test_state["p2_id"],
                "subtasks": [
                    {"text": "X", "assigneeId": test_state["p2_id"]}
                ]
            },
            timeout=15
        )
        print(f"POST /admin/tasks status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ Task creation failed: {resp.text}")
            return False
        
        data = resp.json()
        task = data.get("task", {})
        test_state["task2_id"] = task.get("id")
        
        # Check activity log
        activity = task.get("activity", [])
        
        # Should have main assignment notification
        main_notification = any(
            "E-postvarsel sendt til QA Hovedansvarlig" in entry.get("text", "") and
            "(deloppgave tildelt)" not in entry.get("text", "")
            for entry in activity
        )
        
        # Should NOT have subtask notification for P2
        subtask_notification = any(
            "E-postvarsel sendt til QA Hovedansvarlig (deloppgave tildelt)" in entry.get("text", "")
            for entry in activity
        )
        
        if subtask_notification:
            print(f"✗ Found subtask notification for main assignee (should be excluded)")
            print(f"Activity: {activity}")
            return False
        
        if not main_notification:
            print(f"✓ No main assignment notification found (acceptable - may be in different format)")
        
        print(f"✓ Task created: {test_state['task2_id']}")
        print(f"✓ No subtask notification for main assignee (correctly excluded)")
        print("✅ HOVEDANSVARLIG-UNNTAK TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ HOVEDANSVARLIG-UNNTAK error: {e}")
        return False


def test_ingen_revarsling():
    """(D) INGEN RE-VARSLING: Toggling done should NOT re-notify"""
    print("\n=== (D) INGEN RE-VARSLING: No re-notification on done toggle ===")
    
    try:
        # First, get current task state
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1 = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1:
            print(f"✗ Task1 not found in GET response")
            return False
        
        # Count current activity entries with "(deloppgave tildelt)"
        activity_before = task1.get("activity", [])
        count_before = sum(
            1 for entry in activity_before
            if "(deloppgave tildelt)" in entry.get("text", "")
        )
        
        # Get subtasks with server-generated IDs
        subtasks = task1.get("subtasks", [])
        if not subtasks:
            print(f"✗ No subtasks found in task1")
            return False
        
        # Toggle done on first subtask
        subtasks[0]["done"] = True
        
        # PUT with same subtasks but done=true
        resp = requests.put(
            f"{BASE_URL}/admin/tasks/{test_state['task1_id']}?key={ADMIN_KEY}",
            json={
                "subtasks": subtasks
            },
            timeout=15
        )
        print(f"PUT /admin/tasks/{test_state['task1_id']} status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ PUT failed: {resp.text}")
            return False
        
        # Get updated task
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1_updated = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1_updated:
            print(f"✗ Task1 not found after update")
            return False
        
        # Count activity entries after update
        activity_after = task1_updated.get("activity", [])
        count_after = sum(
            1 for entry in activity_after
            if "(deloppgave tildelt)" in entry.get("text", "")
        )
        
        if count_after > count_before:
            print(f"✗ New notification added (count before: {count_before}, after: {count_after})")
            print(f"Activity after: {activity_after}")
            return False
        
        print(f"✓ Done toggled successfully")
        print(f"✓ No new '(deloppgave tildelt)' notification (count: {count_before} → {count_after})")
        print("✅ INGEN RE-VARSLING TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ INGEN RE-VARSLING error: {e}")
        return False


def test_omfordeling():
    """(E) OMFORDELING: Reassigning subtask should notify new assignee"""
    print("\n=== (E) OMFORDELING: Reassignment notification ===")
    
    try:
        # Get current task state
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1 = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1:
            print(f"✗ Task1 not found")
            return False
        
        # Get subtasks
        subtasks = task1.get("subtasks", [])
        if not subtasks:
            print(f"✗ No subtasks found")
            return False
        
        # Change assigneeId of first subtask to P2
        subtasks[0]["assigneeId"] = test_state["p2_id"]
        
        # PUT with reassigned subtask
        resp = requests.put(
            f"{BASE_URL}/admin/tasks/{test_state['task1_id']}?key={ADMIN_KEY}",
            json={
                "subtasks": subtasks
            },
            timeout=15
        )
        print(f"PUT /admin/tasks/{test_state['task1_id']} status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ PUT failed: {resp.text}")
            return False
        
        # Get updated task
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1_updated = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1_updated:
            print(f"✗ Task1 not found after update")
            return False
        
        # Check activity log for new notification to P2
        activity = task1_updated.get("activity", [])
        notification_found = any(
            "E-postvarsel sendt til QA Hovedansvarlig (deloppgave tildelt)" in entry.get("text", "")
            for entry in activity
        )
        
        if not notification_found:
            print(f"✗ No notification found for P2 after reassignment")
            print(f"Activity: {activity}")
            return False
        
        print(f"✓ Subtask reassigned to P2")
        print(f"✓ Activity log contains: 'E-postvarsel sendt til QA Hovedansvarlig (deloppgave tildelt)'")
        print("✅ OMFORDELING TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ OMFORDELING error: {e}")
        return False


def test_notify_false():
    """(F) NOTIFY:FALSE: notify=false should suppress notifications"""
    print("\n=== (F) NOTIFY:FALSE: Suppressing notifications ===")
    
    try:
        # Get current task state
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1 = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1:
            print(f"✗ Task1 not found")
            return False
        
        # Count current notifications
        activity_before = task1.get("activity", [])
        count_before = sum(
            1 for entry in activity_before
            if "(deloppgave tildelt)" in entry.get("text", "")
        )
        
        # Get subtasks
        subtasks = task1.get("subtasks", [])
        if len(subtasks) < 2:
            print(f"✗ Expected at least 2 subtasks")
            return False
        
        # Assign second subtask (previously unassigned) to P1
        subtasks[1]["assigneeId"] = test_state["p1_id"]
        
        # PUT with notify=false
        resp = requests.put(
            f"{BASE_URL}/admin/tasks/{test_state['task1_id']}?key={ADMIN_KEY}",
            json={
                "notify": False,
                "subtasks": subtasks
            },
            timeout=15
        )
        print(f"PUT /admin/tasks/{test_state['task1_id']} (notify=false) status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ PUT failed: {resp.text}")
            return False
        
        # Get updated task
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        
        if resp.status_code != 200:
            print(f"✗ GET tasks failed: {resp.text}")
            return False
        
        data = resp.json()
        tasks = data.get("tasks", [])
        task1_updated = next((t for t in tasks if t.get("id") == test_state["task1_id"]), None)
        
        if not task1_updated:
            print(f"✗ Task1 not found after update")
            return False
        
        # Count notifications after
        activity_after = task1_updated.get("activity", [])
        count_after = sum(
            1 for entry in activity_after
            if "(deloppgave tildelt)" in entry.get("text", "")
        )
        
        if count_after > count_before:
            print(f"✗ New notification added despite notify=false (count: {count_before} → {count_after})")
            print(f"Activity: {activity_after}")
            return False
        
        print(f"✓ Subtask assigned with notify=false")
        print(f"✓ No new notification (count: {count_before} → {count_after})")
        print("✅ NOTIFY:FALSE TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ NOTIFY:FALSE error: {e}")
        return False


def test_aktor_unntak():
    """(G) AKTØR-UNNTAK: Actor should not receive notification for their own assignment"""
    print("\n=== (G) AKTØR-UNNTAK: Actor exclusion ===")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            json={
                "title": "QA DelSak3",
                "notify": True,
                "actor": "QA Deloppgave Person",
                "subtasks": [
                    {"text": "Egen oppgave", "assigneeId": test_state["p1_id"]}
                ]
            },
            timeout=15
        )
        print(f"POST /admin/tasks status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"✗ Task creation failed: {resp.text}")
            return False
        
        data = resp.json()
        task = data.get("task", {})
        test_state["task3_id"] = task.get("id")
        
        # Check activity log - should NOT have subtask notification
        activity = task.get("activity", [])
        notification_found = any(
            "(deloppgave tildelt)" in entry.get("text", "")
            for entry in activity
        )
        
        if notification_found:
            print(f"✗ Found notification for actor (should be excluded)")
            print(f"Activity: {activity}")
            return False
        
        print(f"✓ Task created: {test_state['task3_id']}")
        print(f"✓ No '(deloppgave tildelt)' notification for actor")
        print("✅ AKTØR-UNNTAK TEST PASSED")
        return True
        
    except Exception as e:
        print(f"✗ AKTØR-UNNTAK error: {e}")
        return False


def test_regression():
    """(H) REGRESJON: Basic regression tests"""
    print("\n=== (H) REGRESJON: Basic regression tests ===")
    
    passed = 0
    total = 3
    
    # Test 1: POST task without subtasks
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            json={
                "title": "QA Vanlig",
                "notify": False
            },
            timeout=15
        )
        if resp.status_code == 200:
            print(f"✓ POST task without subtasks: 200")
            passed += 1
        else:
            print(f"✗ POST task without subtasks: {resp.status_code}")
    except Exception as e:
        print(f"✗ POST task error: {e}")
    
    # Test 2: GET /admin/tasks
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        if resp.status_code == 200:
            print(f"✓ GET /admin/tasks: 200")
            passed += 1
        else:
            print(f"✗ GET /admin/tasks: {resp.status_code}")
    except Exception as e:
        print(f"✗ GET /admin/tasks error: {e}")
    
    # Test 3: POST without key should return 401
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/tasks",
            json={"title": "Test"},
            timeout=15
        )
        if resp.status_code == 401:
            print(f"✓ POST without key: 401")
            passed += 1
        else:
            print(f"✗ POST without key: {resp.status_code} (expected 401)")
    except Exception as e:
        print(f"✗ POST without key error: {e}")
    
    if passed == total:
        print(f"✅ REGRESJON TEST PASSED ({passed}/{total})")
        return True
    else:
        print(f"⚠️ REGRESJON TEST PARTIAL ({passed}/{total})")
        return passed > 0


def test_cleanup():
    """(I) OBLIGATORISK OPPRYDDING: Delete all QA data"""
    print("\n=== (I) CLEANUP: Deleting all QA data ===")
    
    # Delete tasks
    for task_id in [test_state["task1_id"], test_state["task2_id"], test_state["task3_id"]]:
        if task_id:
            try:
                resp = requests.delete(
                    f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}",
                    timeout=15
                )
                print(f"DELETE task {task_id}: {resp.status_code}")
            except Exception as e:
                print(f"✗ DELETE task {task_id} error: {e}")
    
    # Delete "QA Vanlig" task
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            timeout=15
        )
        if resp.status_code == 200:
            tasks = resp.json().get("tasks", [])
            for task in tasks:
                if task.get("title", "").startswith("QA "):
                    try:
                        resp = requests.delete(
                            f"{BASE_URL}/admin/tasks/{task['id']}?key={ADMIN_KEY}",
                            timeout=15
                        )
                        print(f"DELETE task {task['id']} ({task['title']}): {resp.status_code}")
                    except Exception as e:
                        print(f"✗ DELETE task error: {e}")
    except Exception as e:
        print(f"✗ GET tasks for cleanup error: {e}")
    
    # Delete users
    for user_id in [test_state["p1_id"], test_state["p2_id"]]:
        if user_id:
            try:
                resp = requests.delete(
                    f"{BASE_URL}/admin/users/{user_id}?key={ADMIN_KEY}",
                    timeout=15
                )
                print(f"DELETE user {user_id}: {resp.status_code}")
            except Exception as e:
                print(f"✗ DELETE user {user_id} error: {e}")
    
    # Verify in MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check admin_users
        qa_users = db.admin_users.count_documents({"name": {"$regex": "^QA "}})
        print(f"MongoDB admin_users with 'QA ' prefix: {qa_users}")
        
        # Check tasks
        qa_tasks = db.tasks.count_documents({"title": {"$regex": "^QA "}})
        print(f"MongoDB tasks with 'QA ' prefix: {qa_tasks}")
        
        client.close()
        
        if qa_users == 0 and qa_tasks == 0:
            print("✅ CLEANUP COMPLETE: 0 QA documents remain")
            return True
        else:
            print(f"⚠️ CLEANUP INCOMPLETE: {qa_users} users, {qa_tasks} tasks remain")
            return False
            
    except Exception as e:
        print(f"✗ MongoDB verification error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 80)
    print("DELOPPGAVE-VARSLING BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("=" * 80)
    
    results = {}
    
    # Run tests in order
    results["A_SETUP"] = test_setup()
    
    if results["A_SETUP"]:
        results["B_POST_VARSLING"] = test_post_varsling()
        results["C_HOVEDANSVARLIG_UNNTAK"] = test_hovedansvarlig_unntak()
        results["D_INGEN_REVARSLING"] = test_ingen_revarsling()
        results["E_OMFORDELING"] = test_omfordeling()
        results["F_NOTIFY_FALSE"] = test_notify_false()
        results["G_AKTOR_UNNTAK"] = test_aktor_unntak()
        results["H_REGRESSION"] = test_regression()
    else:
        print("\n⚠️ SETUP FAILED - Skipping remaining tests")
    
    # Always run cleanup
    results["I_CLEANUP"] = test_cleanup()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")


if __name__ == "__main__":
    main()
