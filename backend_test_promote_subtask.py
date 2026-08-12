#!/usr/bin/env python3
"""
Backend test for POST /api/admin/tasks/<taskId>/promote-subtask endpoint.
Tests the new endpoint that promotes a checklist item (subtask) into a full task.
"""

import requests
import json
import os
import time
from pymongo import MongoClient
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def print_test(name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")

def cleanup_existing_test_tasks():
    """Cleanup any existing test tasks before starting"""
    try:
        # Delete any existing test tasks
        result = db.tasks.delete_many({"title": {"$regex": "^TESTSAK promote"}})
        if result.deleted_count > 0:
            print(f"Pre-cleanup: Deleted {result.deleted_count} existing test tasks")
        
        # Delete any Punkt tasks
        result = db.tasks.delete_many({"title": {"$regex": "^Punkt [ABC]$"}})
        if result.deleted_count > 0:
            print(f"Pre-cleanup: Deleted {result.deleted_count} existing Punkt tasks")
    except Exception as e:
        print(f"Pre-cleanup warning: {str(e)}")

def create_parent_task():
    """Create a parent test task with subtasks"""
    url = f"{API_BASE}/admin/tasks?key={ADMIN_KEY}"
    payload = {
        "title": "TESTSAK promote - slett meg",
        "status": "doing",
        "priority": 1,
        "projectId": None,
        "notify": False,
        "actor": "TestAgent",
        "subtasks": [
            {"text": "Punkt A", "done": False, "assigneeId": None, "due": "2026-09-01"},
            {"text": "Punkt B", "done": True, "assigneeId": None, "due": None},
            {"text": "Punkt C", "done": False, "assigneeId": None, "due": None}
        ]
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code in [200, 201]:
            data = response.json()
            if data.get('ok'):
                task_id = data.get('task', {}).get('id')
                print_test("Setup: Create parent task", True, f"Task ID: {task_id}")
                return task_id
        print_test("Setup: Create parent task", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
        return None
    except Exception as e:
        print_test("Setup: Create parent task", False, f"Exception: {str(e)}")
        return None

def test_auth_no_key(task_id):
    """Test 1: AUTH - no key should return 401"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask"
    payload = {"index": 0, "text": "Punkt A", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        passed = response.status_code == 401
        print_test("Test 1: AUTH - no key", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 1: AUTH - no key", False, f"Exception: {str(e)}")
        return False

def test_auth_invalid_key(task_id):
    """Test 2: AUTH - invalid key should return 401"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key=invalid_key_123"
    payload = {"index": 0, "text": "Punkt A", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        passed = response.status_code == 401
        print_test("Test 2: AUTH - invalid key", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 2: AUTH - invalid key", False, f"Exception: {str(e)}")
        return False

def test_validation_missing_text(task_id):
    """Test 3: VALIDATION - missing text should return 400"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key={ADMIN_KEY}"
    payload = {"index": 0, "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        passed = response.status_code == 400
        print_test("Test 3: VALIDATION - missing text", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 3: VALIDATION - missing text", False, f"Exception: {str(e)}")
        return False

def test_validation_nonexistent_text(task_id):
    """Test 4: VALIDATION - non-existent text should return 409"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key={ADMIN_KEY}"
    payload = {"index": 0, "text": "Finnes ikke", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        passed = response.status_code == 409
        print_test("Test 4: VALIDATION - non-existent text", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 4: VALIDATION - non-existent text", False, f"Exception: {str(e)}")
        return False

def test_validation_unknown_task():
    """Test 5: VALIDATION - unknown taskId should return 404"""
    url = f"{API_BASE}/admin/tasks/unknown-task-id-123/promote-subtask?key={ADMIN_KEY}"
    payload = {"index": 0, "text": "Punkt A", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        passed = response.status_code == 404
        print_test("Test 5: VALIDATION - unknown taskId", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 5: VALIDATION - unknown taskId", False, f"Exception: {str(e)}")
        return False

def test_happy_path_correct_index(task_id):
    """Test 6: HAPPY PATH - promote with correct index"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key={ADMIN_KEY}"
    payload = {"index": 0, "text": "Punkt A", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            print_test("Test 6: HAPPY PATH - correct index", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False, None
        
        data = response.json()
        if not data.get('ok'):
            print_test("Test 6: HAPPY PATH - correct index", False, f"Response ok=false: {data}")
            return False, None
        
        new_task = data.get('task', {})
        new_task_id = new_task.get('id')
        
        # Verify task structure
        checks = []
        checks.append(("title", new_task.get('title') == "Punkt A"))
        checks.append(("parentId", new_task.get('parentId') == task_id))
        checks.append(("status", new_task.get('status') == "inbox"))
        checks.append(("priority", new_task.get('priority') == 1))
        checks.append(("dueDate", new_task.get('dueDate') == "2026-09-01"))
        checks.append(("completedAt", new_task.get('completedAt') is None))
        checks.append(("id is UUID", len(new_task_id) == 36 and '-' in new_task_id))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            print_test("Test 6: HAPPY PATH - correct index", True, f"New task ID: {new_task_id}")
        else:
            print_test("Test 6: HAPPY PATH - correct index", False, f"Failed checks: {failed_checks}")
        
        return all_passed, new_task_id
    except Exception as e:
        print_test("Test 6: HAPPY PATH - correct index", False, f"Exception: {str(e)}")
        return False, None

def verify_parent_subtasks_and_activity(task_id, expected_subtask_count, promoted_task_id):
    """Test 7: Verify parent's subtasks and activity"""
    url = f"{API_BASE}/admin/tasks?key={ADMIN_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print_test("Test 7: Verify parent subtasks", False, f"Status: {response.status_code}")
            return False
        
        data = response.json()
        tasks = data.get('tasks', [])
        parent = next((t for t in tasks if t.get('id') == task_id), None)
        
        if not parent:
            print_test("Test 7: Verify parent subtasks", False, "Parent task not found")
            return False
        
        # Check subtasks count
        subtasks = parent.get('subtasks', [])
        subtasks_ok = len(subtasks) == expected_subtask_count
        
        # Check activity log
        activity = parent.get('activity', [])
        activity_text = ' '.join([a.get('text', '') for a in activity])
        activity_ok = 'Punkt A' in activity_text and 'undersak' in activity_text
        
        # Check new task exists with correct parentId
        new_task = next((t for t in tasks if t.get('id') == promoted_task_id), None)
        new_task_ok = new_task is not None and new_task.get('parentId') == task_id
        
        all_ok = subtasks_ok and activity_ok and new_task_ok
        details = f"Subtasks: {len(subtasks)} (expected {expected_subtask_count}), Activity: {'OK' if activity_ok else 'MISSING'}, New task: {'OK' if new_task_ok else 'MISSING'}"
        
        print_test("Test 7: Verify parent subtasks and activity", all_ok, details)
        return all_ok
    except Exception as e:
        print_test("Test 7: Verify parent subtasks and activity", False, f"Exception: {str(e)}")
        return False

def test_done_subtask(task_id):
    """Test 8: Promote done subtask (Punkt B)"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key={ADMIN_KEY}"
    # After removing Punkt A, Punkt B is now at index 0
    payload = {"index": 0, "text": "Punkt B", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            print_test("Test 8: Promote done subtask", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False, None
        
        data = response.json()
        new_task = data.get('task', {})
        new_task_id = new_task.get('id')
        
        # Verify status is 'done' and completedAt is set
        status_ok = new_task.get('status') == 'done'
        completed_at = new_task.get('completedAt')
        completed_ok = completed_at is not None and len(completed_at) > 0
        
        all_ok = status_ok and completed_ok
        details = f"Status: {new_task.get('status')}, CompletedAt: {'SET' if completed_ok else 'NULL'}"
        
        print_test("Test 8: Promote done subtask", all_ok, details)
        return all_ok, new_task_id
    except Exception as e:
        print_test("Test 8: Promote done subtask", False, f"Exception: {str(e)}")
        return False, None

def test_wrong_index_correct_text(task_id):
    """Test 9: Wrong index but correct text (fallback to text search)"""
    url = f"{API_BASE}/admin/tasks/{task_id}/promote-subtask?key={ADMIN_KEY}"
    # After removing Punkt A and B, Punkt C is at index 0, but we send index 99
    payload = {"index": 99, "text": "Punkt C", "actor": "TestAgent"}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            print_test("Test 9: Wrong index, correct text", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False, None
        
        data = response.json()
        if not data.get('ok'):
            print_test("Test 9: Wrong index, correct text", False, f"Response ok=false: {data}")
            return False, None
        
        new_task = data.get('task', {})
        new_task_id = new_task.get('id')
        title_ok = new_task.get('title') == "Punkt C"
        
        print_test("Test 9: Wrong index, correct text (fallback)", title_ok, f"New task ID: {new_task_id}")
        return title_ok, new_task_id
    except Exception as e:
        print_test("Test 9: Wrong index, correct text", False, f"Exception: {str(e)}")
        return False, None

def verify_parent_subtasks_empty(task_id):
    """Verify parent's subtasks are now empty"""
    url = f"{API_BASE}/admin/tasks?key={ADMIN_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print_test("Verify parent subtasks empty", False, f"Status: {response.status_code}")
            return False
        
        data = response.json()
        tasks = data.get('tasks', [])
        parent = next((t for t in tasks if t.get('id') == task_id), None)
        
        if not parent:
            print_test("Verify parent subtasks empty", False, "Parent task not found")
            return False
        
        subtasks = parent.get('subtasks', [])
        empty_ok = len(subtasks) == 0
        
        print_test("Verify parent subtasks empty", empty_ok, f"Subtasks count: {len(subtasks)}")
        return empty_ok
    except Exception as e:
        print_test("Verify parent subtasks empty", False, f"Exception: {str(e)}")
        return False

def test_regression_get_tasks():
    """Test 10: Regression - GET /admin/tasks"""
    url = f"{API_BASE}/admin/tasks?key={ADMIN_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        passed = response.status_code == 200 and response.json().get('ok') == True
        print_test("Test 10: Regression - GET /admin/tasks", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 10: Regression - GET /admin/tasks", False, f"Exception: {str(e)}")
        return False

def test_regression_get_insights():
    """Test 11: Regression - GET /admin/tasks/insights"""
    url = f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        passed = response.status_code == 200 and response.json().get('ok') == True
        print_test("Test 11: Regression - GET /admin/tasks/insights", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        print_test("Test 11: Regression - GET /admin/tasks/insights", False, f"Exception: {str(e)}")
        return False

def cleanup(parent_task_id, promoted_task_ids):
    """Cleanup: Delete test tasks and notifications from MongoDB"""
    print("\n=== CLEANUP ===")
    
    try:
        # Delete parent task
        result = db.tasks.delete_one({"id": parent_task_id})
        print_test("Cleanup: Delete parent task", result.deleted_count == 1, f"Deleted: {result.deleted_count}")
        
        # Delete promoted tasks
        for task_id in promoted_task_ids:
            if task_id:
                result = db.tasks.delete_one({"id": task_id})
                print(f"  Deleted promoted task {task_id}: {result.deleted_count}")
        
        # Delete notifications for test tasks
        all_task_ids = [parent_task_id] + [tid for tid in promoted_task_ids if tid]
        result = db.notifications.delete_many({"taskId": {"$in": all_task_ids}})
        print_test("Cleanup: Delete notifications", True, f"Deleted: {result.deleted_count} notifications")
        
        # Small delay to ensure MongoDB operations complete
        time.sleep(0.5)
        
        # Verify demo tasks still exist
        demo_tasks = [
            "Oppgradere fellesareal Storgata 4",
            "Bestille elektriker til belysning",
            "Innhente tilbud fra tre malere",
            "Innhente fargeprøver fra maler",
            "Signere fornyet leieavtale Damsgårdsveien 12"
        ]
        
        demo_count = db.tasks.count_documents({"title": {"$in": demo_tasks}})
        print_test("Cleanup: Verify demo tasks exist", demo_count == 5, f"Demo tasks found: {demo_count}/5")
        
        # Verify no test tasks remain
        test_count = db.tasks.count_documents({"title": {"$regex": "^TESTSAK promote"}})
        punkt_count = db.tasks.count_documents({"title": {"$regex": "^Punkt [ABC]$"}})
        print_test("Cleanup: Verify no test tasks remain", test_count == 0 and punkt_count == 0, 
                   f"Test tasks: {test_count}, Punkt tasks: {punkt_count}")
        
    except Exception as e:
        print_test("Cleanup", False, f"Exception: {str(e)}")

def main():
    print("=" * 80)
    print("BACKEND TEST: POST /api/admin/tasks/<taskId>/promote-subtask")
    print("=" * 80)
    print(f"Base URL: {API_BASE}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 80)
    print()
    
    # Pre-cleanup
    cleanup_existing_test_tasks()
    print()
    
    # Setup
    parent_task_id = create_parent_task()
    if not parent_task_id:
        print("\n❌ SETUP FAILED - Cannot continue")
        return
    
    promoted_task_ids = []
    
    print("\n=== AUTHENTICATION TESTS ===")
    test_auth_no_key(parent_task_id)
    test_auth_invalid_key(parent_task_id)
    
    print("\n=== VALIDATION TESTS ===")
    test_validation_missing_text(parent_task_id)
    test_validation_nonexistent_text(parent_task_id)
    test_validation_unknown_task()
    
    print("\n=== HAPPY PATH TESTS ===")
    passed, task_id = test_happy_path_correct_index(parent_task_id)
    if task_id:
        promoted_task_ids.append(task_id)
    
    if passed:
        verify_parent_subtasks_and_activity(parent_task_id, 2, task_id)
    
    print("\n=== DONE SUBTASK TEST ===")
    passed, task_id = test_done_subtask(parent_task_id)
    if task_id:
        promoted_task_ids.append(task_id)
    
    print("\n=== TEXT SEARCH FALLBACK TEST ===")
    passed, task_id = test_wrong_index_correct_text(parent_task_id)
    if task_id:
        promoted_task_ids.append(task_id)
    
    if passed:
        verify_parent_subtasks_empty(parent_task_id)
    
    print("\n=== REGRESSION TESTS ===")
    test_regression_get_tasks()
    test_regression_get_insights()
    
    # Cleanup
    cleanup(parent_task_id, promoted_task_ids)
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
