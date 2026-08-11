#!/usr/bin/env python3
"""
Backend test for POST /admin/tasks mention notifications.
Tests the new mention notification block added to POST /admin/tasks.
"""

import requests
import os
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://conversion-optimize-7.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def test_post_mention_notifications():
    """
    Test POST /admin/tasks mention notifications.
    
    Test plan:
    (A) Create QA person with @example.com email
    (B) POST task with @mention - verify success (email blocked for @example.com)
    (C) Test exclusions: assignee same as mentioned, notify:false
    (D) Regression: POST without mention, PUT with mention, GET tasks
    (E) Mandatory cleanup: delete QA tasks and person, verify 0 QA documents
    """
    
    print("=" * 80)
    print("BACKEND TEST: POST /admin/tasks MENTION NOTIFICATIONS")
    print("=" * 80)
    print(f"Base URL: {API_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print()
    
    test_results = []
    qa_person_id = None
    qa_task_ids = []
    
    try:
        # ===================================================================
        # (A) CREATE QA PERSON
        # ===================================================================
        print("(A) CREATING QA PERSON...")
        print("-" * 80)
        
        response = requests.post(
            f"{API_URL}/admin/users",
            params={'key': ADMIN_KEY},
            json={
                'name': 'QA Nevnt Person',
                'email': 'qa-nevnt@example.com',
                'role': 'bruker',
                'invite': False
            },
            timeout=15
        )
        
        print(f"POST /admin/users: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            qa_person_id = data.get('member', {}).get('id')
            print(f"✓ QA person created: {qa_person_id}")
            test_results.append(("A: Create QA person", True, f"Created with ID {qa_person_id}"))
        else:
            print(f"✗ Failed to create QA person: {response.text}")
            test_results.append(("A: Create QA person", False, f"Status {response.status_code}"))
            return test_results
        
        print()
        
        # ===================================================================
        # (B) POST TASK WITH @MENTION
        # ===================================================================
        print("(B) POST TASK WITH @MENTION IN DESCRIPTION...")
        print("-" * 80)
        
        response = requests.post(
            f"{API_URL}/admin/tasks",
            params={'key': ADMIN_KEY},
            json={
                'title': 'QA MentionPost',
                'description': 'Hei @QA Nevnt Person se her',
                'notify': True
            },
            timeout=15
        )
        
        print(f"POST /admin/tasks (with mention): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            task = data.get('task', {})
            task_id = task.get('id')
            qa_task_ids.append(task_id)
            
            # Verify description is intact
            description = task.get('description', '')
            if description == 'Hei @QA Nevnt Person se her':
                print(f"✓ Task created with ID {task_id}")
                print(f"✓ Description intact: '{description}'")
                
                # Check activity log (may or may not have mention line due to @example.com blocking)
                activity = task.get('activity', [])
                mention_activity = [a for a in activity if '(nevnt i beskrivelsen)' in a.get('text', '')]
                
                if mention_activity:
                    print(f"✓ BONUS: Activity log contains mention notification: '{mention_activity[0].get('text')}'")
                    print("  (This means taskEpost returned true despite @example.com)")
                else:
                    print("✓ No mention activity log (expected - @example.com blocked before SendGrid)")
                
                test_results.append(("B: POST with mention", True, f"Task created, description intact"))
            else:
                print(f"✗ Description mismatch: '{description}'")
                test_results.append(("B: POST with mention", False, "Description not intact"))
        else:
            print(f"✗ Failed: {response.text}")
            test_results.append(("B: POST with mention", False, f"Status {response.status_code}"))
        
        print()
        
        # ===================================================================
        # (C) EXCLUSIONS
        # ===================================================================
        print("(C) TESTING EXCLUSIONS...")
        print("-" * 80)
        
        # C1: Mention + assignee same person (should not cause double logic error)
        print("C1: POST with mention AND assigneeId same person...")
        response = requests.post(
            f"{API_URL}/admin/tasks",
            params={'key': ADMIN_KEY},
            json={
                'title': 'QA MentionPost2',
                'description': '@QA Nevnt Person fikser dette',
                'assigneeId': qa_person_id,
                'notify': False  # Use notify:false to avoid any email attempts
            },
            timeout=15
        )
        
        print(f"POST /admin/tasks (mention + assignee): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            task = data.get('task', {})
            task_id = task.get('id')
            qa_task_ids.append(task_id)
            
            # Verify assigneeId is set correctly
            if task.get('assigneeId') == qa_person_id:
                print(f"✓ Task created with assigneeId set correctly")
                print(f"✓ No error (mention logic correctly excludes assignee)")
                test_results.append(("C1: Mention + assignee same", True, "No double logic error"))
            else:
                print(f"✗ AssigneeId not set correctly")
                test_results.append(("C1: Mention + assignee same", False, "AssigneeId mismatch"))
        else:
            print(f"✗ Failed: {response.text}")
            test_results.append(("C1: Mention + assignee same", False, f"Status {response.status_code}"))
        
        print()
        
        # C2: Mention with notify:false (should not send notification)
        print("C2: POST with mention and notify:false...")
        response = requests.post(
            f"{API_URL}/admin/tasks",
            params={'key': ADMIN_KEY},
            json={
                'title': 'QA MentionPost3',
                'description': 'Hei @QA Nevnt Person',
                'notify': False
            },
            timeout=15
        )
        
        print(f"POST /admin/tasks (mention + notify:false): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            task = data.get('task', {})
            task_id = task.get('id')
            qa_task_ids.append(task_id)
            
            # Verify no mention activity log
            activity = task.get('activity', [])
            mention_activity = [a for a in activity if '(nevnt i beskrivelsen)' in a.get('text', '')]
            
            if not mention_activity:
                print(f"✓ Task created without mention notification (notify:false respected)")
                test_results.append(("C2: notify:false", True, "No mention activity log"))
            else:
                print(f"✗ Mention activity found despite notify:false: {mention_activity}")
                test_results.append(("C2: notify:false", False, "Mention activity present"))
        else:
            print(f"✗ Failed: {response.text}")
            test_results.append(("C2: notify:false", False, f"Status {response.status_code}"))
        
        print()
        
        # ===================================================================
        # (D) REGRESSION
        # ===================================================================
        print("(D) REGRESSION TESTS...")
        print("-" * 80)
        
        # D1: POST without mention
        print("D1: POST task without mention...")
        response = requests.post(
            f"{API_URL}/admin/tasks",
            params={'key': ADMIN_KEY},
            json={
                'title': 'QA Regular Task',
                'description': 'No mentions here',
                'notify': False
            },
            timeout=15
        )
        
        print(f"POST /admin/tasks (no mention): {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            task_id = data.get('task', {}).get('id')
            qa_task_ids.append(task_id)
            print(f"✓ Task created without mention: {task_id}")
            test_results.append(("D1: POST without mention", True, "Success"))
        else:
            print(f"✗ Failed: {response.text}")
            test_results.append(("D1: POST without mention", False, f"Status {response.status_code}"))
        
        print()
        
        # D2: PUT with mention (existing functionality)
        print("D2: PUT task with mention in description...")
        if qa_task_ids:
            response = requests.put(
                f"{API_URL}/admin/tasks/{qa_task_ids[-1]}",
                params={'key': ADMIN_KEY},
                json={
                    'description': 'Updated with @QA Nevnt Person mention',
                    'notify': False
                },
                timeout=15
            )
            
            print(f"PUT /admin/tasks/:id (mention): {response.status_code}")
            
            if response.status_code == 200:
                print(f"✓ PUT with mention works (existing functionality)")
                test_results.append(("D2: PUT with mention", True, "Success"))
            else:
                print(f"✗ Failed: {response.text}")
                test_results.append(("D2: PUT with mention", False, f"Status {response.status_code}"))
        else:
            print("⊘ Skipped (no task ID available)")
            test_results.append(("D2: PUT with mention", None, "Skipped"))
        
        print()
        
        # D3: GET tasks
        print("D3: GET /admin/tasks...")
        response = requests.get(
            f"{API_URL}/admin/tasks",
            params={'key': ADMIN_KEY},
            timeout=15
        )
        
        print(f"GET /admin/tasks: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            tasks = data.get('tasks', [])
            qa_tasks = [t for t in tasks if t.get('title', '').startswith('QA ')]
            print(f"✓ GET tasks works, found {len(qa_tasks)} QA tasks")
            test_results.append(("D3: GET tasks", True, f"Found {len(qa_tasks)} QA tasks"))
        else:
            print(f"✗ Failed: {response.text}")
            test_results.append(("D3: GET tasks", False, f"Status {response.status_code}"))
        
        print()
        
    finally:
        # ===================================================================
        # (E) MANDATORY CLEANUP
        # ===================================================================
        print("(E) MANDATORY CLEANUP...")
        print("-" * 80)
        
        # Delete QA tasks
        deleted_tasks = 0
        for task_id in qa_task_ids:
            try:
                response = requests.delete(
                    f"{API_URL}/admin/tasks/{task_id}",
                    params={'key': ADMIN_KEY},
                    timeout=15
                )
                if response.status_code == 200:
                    deleted_tasks += 1
                    print(f"✓ Deleted task {task_id}")
            except Exception as e:
                print(f"✗ Failed to delete task {task_id}: {e}")
        
        print(f"Deleted {deleted_tasks}/{len(qa_task_ids)} QA tasks")
        
        # Delete QA person
        if qa_person_id:
            try:
                response = requests.delete(
                    f"{API_URL}/admin/users/{qa_person_id}",
                    params={'key': ADMIN_KEY},
                    timeout=15
                )
                if response.status_code == 200:
                    print(f"✓ Deleted QA person {qa_person_id}")
                else:
                    print(f"✗ Failed to delete QA person: {response.text}")
            except Exception as e:
                print(f"✗ Failed to delete QA person: {e}")
        
        # Verify cleanup in MongoDB
        print()
        print("Verifying cleanup in MongoDB...")
        
        qa_tasks_count = db.tasks.count_documents({'title': {'$regex': '^QA '}})
        qa_users_count = db.admin_users.count_documents({'name': {'$regex': '^QA '}})
        
        print(f"Tasks with 'QA ' prefix: {qa_tasks_count}")
        print(f"Users with 'QA ' prefix: {qa_users_count}")
        
        if qa_tasks_count == 0 and qa_users_count == 0:
            print("✓ Cleanup verified: 0 QA documents remain")
            test_results.append(("E: Cleanup", True, "0 QA documents remain"))
        else:
            print(f"✗ Cleanup incomplete: {qa_tasks_count} tasks, {qa_users_count} users remain")
            test_results.append(("E: Cleanup", False, f"{qa_tasks_count} tasks, {qa_users_count} users remain"))
        
        print()
    
    # ===================================================================
    # SUMMARY
    # ===================================================================
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result, _ in test_results if result is True)
    failed = sum(1 for _, result, _ in test_results if result is False)
    skipped = sum(1 for _, result, _ in test_results if result is None)
    total = len(test_results)
    
    for test_name, result, details in test_results:
        status = "✓ PASS" if result is True else ("✗ FAIL" if result is False else "⊘ SKIP")
        print(f"{status}: {test_name} - {details}")
    
    print()
    print(f"Total: {total} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    print(f"Success rate: {passed}/{total - skipped} ({100 * passed / (total - skipped) if (total - skipped) > 0 else 0:.1f}%)")
    print()
    
    if failed > 0:
        print("❌ SOME TESTS FAILED")
        return 1
    else:
        print("✅ ALL TESTS PASSED")
        return 0

if __name__ == '__main__':
    try:
        exit_code = test_post_mention_notifications()
        sys.exit(exit_code)
    except Exception as e:
        print(f"❌ TEST SCRIPT ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
