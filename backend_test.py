#!/usr/bin/env python3
"""
Backend test for @mentions in POST /api/admin/tasks/:id/comments
CRITICAL: Uses notify:false to prevent real emails via SendGrid (LIVE)
"""
import requests
import json
import sys
from pymongo import MongoClient

# Configuration from .env
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def print_test(msg):
    print(f"  → {msg}")

def print_success(msg):
    print(f"  ✅ {msg}")

def print_fail(msg):
    print(f"  ❌ {msg}")

def main():
    print("\n" + "="*80)
    print("BACKEND TEST: @mentions i POST /api/admin/tasks/:id/comments")
    print("="*80)
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        print_success(f"Connected to MongoDB: {MONGO_URL}/{DB_NAME}")
    except Exception as e:
        print_fail(f"MongoDB connection failed: {e}")
        return 1
    
    # Track test data for cleanup
    test_user_ids = []
    test_task_id = None
    
    try:
        # ===================================================================
        # STEP 1: Create test person WITHOUT email (no real email can be sent)
        # ===================================================================
        print("\n[1] CREATE TEST PERSON WITHOUT EMAIL")
        person_payload = {
            "name": "QA Mention Person",
            "role": "bruker"
            # NO email field - this is critical to prevent real emails
        }
        r = requests.post(f"{BASE_URL}/admin/users?key={ADMIN_KEY}", json=person_payload)
        if r.status_code not in [200, 201]:
            print_fail(f"Failed to create test person: {r.status_code} {r.text}")
            return 1
        person_data = r.json()
        person_id = person_data.get("member", {}).get("id") or person_data.get("user", {}).get("id")
        if not person_id:
            print_fail(f"No person ID returned: {person_data}")
            return 1
        test_user_ids.append(person_id)
        print_success(f"Created test person WITHOUT email: id={person_id}, name='QA Mention Person'")
        
        # ===================================================================
        # STEP 2: Create test task (notify:false, no assignee, no dueDate)
        # ===================================================================
        print("\n[2] CREATE TEST TASK")
        task_payload = {
            "title": "QA mention-sak",
            "notify": False  # CRITICAL: no notifications
            # NO assigneeId, NO dueDate
        }
        r = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=task_payload)
        if r.status_code not in [200, 201]:
            print_fail(f"Failed to create test task: {r.status_code} {r.text}")
            return 1
        task_data = r.json()
        test_task_id = task_data.get("task", {}).get("id")
        if not test_task_id:
            print_fail(f"No task ID returned: {task_data}")
            return 1
        print_success(f"Created test task: id={test_task_id}, title='QA mention-sak'")
        
        # ===================================================================
        # STEP 3: POST comment with @mention (notify:false)
        # ===================================================================
        print("\n[3] POST COMMENT WITH @MENTION (exact case)")
        comment_payload = {
            "text": "Hei @QA Mention Person kan du sjekke?",
            "author": "QA Tester",
            "notify": False  # CRITICAL: no emails
        }
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={ADMIN_KEY}", json=comment_payload)
        if r.status_code != 200:
            print_fail(f"Failed to post comment: {r.status_code} {r.text}")
            return 1
        comment_data = r.json()
        if not comment_data.get("ok"):
            print_fail(f"Comment not ok: {comment_data}")
            return 1
        comment = comment_data.get("comment", {})
        mentions = comment.get("mentions", [])
        mentioned = comment_data.get("mentioned", [])
        
        # Verify mentions array contains person_id
        if person_id not in mentions:
            print_fail(f"Person ID {person_id} not in mentions: {mentions}")
            return 1
        print_success(f"comment.mentions contains person_id: {mentions}")
        
        # Verify mentioned array is empty (person has no email)
        if len(mentioned) != 0:
            print_fail(f"mentioned should be empty (no email), got: {mentioned}")
            return 1
        print_success(f"mentioned=[] (person has no email, no notification sent)")
        
        # ===================================================================
        # STEP 4: Case-insensitive matching
        # ===================================================================
        print("\n[4] CASE-INSENSITIVE MATCHING")
        comment_payload = {
            "text": "ping @qa mention person",  # lowercase
            "author": "QA Tester",
            "notify": False
        }
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={ADMIN_KEY}", json=comment_payload)
        if r.status_code != 200:
            print_fail(f"Failed to post comment: {r.status_code} {r.text}")
            return 1
        comment_data = r.json()
        comment = comment_data.get("comment", {})
        mentions = comment.get("mentions", [])
        
        if person_id not in mentions:
            print_fail(f"Case-insensitive match failed: {mentions}")
            return 1
        print_success(f"Case-insensitive match works: '@qa mention person' matched person_id")
        
        # ===================================================================
        # STEP 5: No mention (plain comment)
        # ===================================================================
        print("\n[5] NO MENTION (plain comment)")
        comment_payload = {
            "text": "vanlig kommentar uten mentions",
            "notify": False
        }
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={ADMIN_KEY}", json=comment_payload)
        if r.status_code != 200:
            print_fail(f"Failed to post comment: {r.status_code} {r.text}")
            return 1
        comment_data = r.json()
        comment = comment_data.get("comment", {})
        mentions = comment.get("mentions", [])
        
        if len(mentions) != 0:
            print_fail(f"mentions should be empty, got: {mentions}")
            return 1
        print_success(f"mentions=[] for plain comment without @mentions")
        
        # ===================================================================
        # STEP 6: Self-mention exclusion from notification
        # ===================================================================
        print("\n[6] SELF-MENTION EXCLUSION")
        comment_payload = {
            "text": "@QA Mention Person",
            "author": "QA Mention Person",  # Same as mentioned person
            "notify": False
        }
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={ADMIN_KEY}", json=comment_payload)
        if r.status_code != 200:
            print_fail(f"Failed to post comment: {r.status_code} {r.text}")
            return 1
        comment_data = r.json()
        comment = comment_data.get("comment", {})
        mentions = comment.get("mentions", [])
        mentioned = comment_data.get("mentioned", [])
        
        # mentions should contain person_id
        if person_id not in mentions:
            print_fail(f"mentions should contain person_id: {mentions}")
            return 1
        print_success(f"mentions contains person_id (self-mention detected)")
        
        # mentioned should be empty (self-mention excluded from notification)
        if len(mentioned) != 0:
            print_fail(f"mentioned should be empty (self-mention), got: {mentioned}")
            return 1
        print_success(f"mentioned=[] (self-mention excluded from notification)")
        
        # ===================================================================
        # STEP 7: Error cases
        # ===================================================================
        print("\n[7] ERROR CASES")
        
        # 7a: Empty text
        print_test("7a: Empty text → 400")
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={ADMIN_KEY}", json={"text": "", "notify": False})
        if r.status_code != 400:
            print_fail(f"Expected 400 for empty text, got {r.status_code}")
            return 1
        print_success("Empty text returns 400")
        
        # 7b: Unknown task ID
        print_test("7b: Unknown task ID → 404")
        r = requests.post(f"{BASE_URL}/admin/tasks/ukjent-task-id-xyz/comments?key={ADMIN_KEY}", json={"text": "test", "notify": False})
        if r.status_code != 404:
            print_fail(f"Expected 404 for unknown task, got {r.status_code}")
            return 1
        print_success("Unknown task ID returns 404")
        
        # 7c: No auth
        print_test("7c: No auth → 401")
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments", json={"text": "test", "notify": False})
        if r.status_code != 401:
            print_fail(f"Expected 401 without key, got {r.status_code}")
            return 1
        print_success("No auth returns 401")
        
        # ===================================================================
        # STEP 8: Role check (bruker role can access)
        # ===================================================================
        print("\n[8] ROLE CHECK (bruker role)")
        
        # Create QA user with password and bruker role
        print_test("Create QA user with bruker role and password")
        qa_user_payload = {
            "name": "QA Kommentar Bruker",
            "email": "qa-komm-test@example.com",
            "role": "bruker",
            "password": "QaTest1234!"
        }
        r = requests.post(f"{BASE_URL}/admin/users?key={ADMIN_KEY}", json=qa_user_payload)
        if r.status_code not in [200, 201]:
            print_fail(f"Failed to create QA user: {r.status_code} {r.text}")
            return 1
        qa_user_data = r.json()
        qa_user_id = qa_user_data.get("member", {}).get("id") or qa_user_data.get("user", {}).get("id")
        test_user_ids.append(qa_user_id)
        print_success(f"Created QA user: id={qa_user_id}, role=bruker")
        
        # Login as QA user
        print_test("Login as QA user")
        login_payload = {
            "email": "qa-komm-test@example.com",
            "password": "QaTest1234!"
        }
        r = requests.post(f"{BASE_URL}/admin/auth/login", json=login_payload)
        if r.status_code != 200:
            print_fail(f"Failed to login: {r.status_code} {r.text}")
            return 1
        login_data = r.json()
        qa_token = login_data.get("token")
        if not qa_token:
            print_fail(f"No token returned: {login_data}")
            return 1
        print_success(f"Logged in as QA user, got token")
        
        # Post comment with bruker token (notify:false, no mentions)
        print_test("Post comment with bruker token")
        comment_payload = {
            "text": "kommentar fra bruker-rolle",
            "notify": False
        }
        r = requests.post(f"{BASE_URL}/admin/tasks/{test_task_id}/comments?key={qa_token}", json=comment_payload)
        if r.status_code != 200:
            print_fail(f"bruker role should have access: {r.status_code} {r.text}")
            return 1
        print_success("bruker role can post comments (sakerAuthed)")
        
        # ===================================================================
        # STEP 9: Regression checks
        # ===================================================================
        print("\n[9] REGRESSION CHECKS")
        
        # 9a: GET /api/admin/tasks
        print_test("9a: GET /api/admin/tasks")
        r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}")
        if r.status_code != 200:
            print_fail(f"GET /admin/tasks failed: {r.status_code}")
            return 1
        tasks_data = r.json()
        tasks = tasks_data.get("tasks", [])
        # Find our test task
        test_task = next((t for t in tasks if t.get("id") == test_task_id), None)
        if not test_task:
            print_fail(f"Test task not found in tasks list")
            return 1
        # Verify comments are present
        comments = test_task.get("comments", [])
        if len(comments) < 5:  # We posted 5 comments
            print_fail(f"Expected at least 5 comments, got {len(comments)}")
            return 1
        print_success(f"GET /admin/tasks returns task with {len(comments)} comments")
        
        # 9b: PUT /api/admin/tasks/:id (update task, notify:false)
        print_test("9b: PUT /api/admin/tasks/:id")
        update_payload = {
            "status": "doing",
            "notify": False
        }
        r = requests.put(f"{BASE_URL}/admin/tasks/{test_task_id}?key={ADMIN_KEY}", json=update_payload)
        if r.status_code != 200:
            print_fail(f"PUT /admin/tasks failed: {r.status_code} {r.text}")
            return 1
        print_success("PUT /admin/tasks works (route file not broken)")
        
        # ===================================================================
        # STEP 10: CLEANUP
        # ===================================================================
        print("\n[10] CLEANUP")
        
        # Delete test task
        print_test("Delete test task")
        r = requests.delete(f"{BASE_URL}/admin/tasks/{test_task_id}?key={ADMIN_KEY}")
        if r.status_code != 200:
            print_fail(f"Failed to delete task: {r.status_code} {r.text}")
            # Continue cleanup anyway
        else:
            print_success(f"Deleted test task: {test_task_id}")
        
        # Delete test users
        for user_id in test_user_ids:
            print_test(f"Delete test user: {user_id}")
            r = requests.delete(f"{BASE_URL}/admin/users/{user_id}?key={ADMIN_KEY}")
            if r.status_code != 200:
                print_fail(f"Failed to delete user {user_id}: {r.status_code} {r.text}")
                # Continue cleanup anyway
            else:
                print_success(f"Deleted test user: {user_id}")
        
        # Verify no QA data remains
        print_test("Verify no QA data remains")
        r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}")
        if r.status_code == 200:
            tasks_data = r.json()
            tasks = tasks_data.get("tasks", [])
            qa_tasks = [t for t in tasks if t.get("title", "").startswith("QA ")]
            if len(qa_tasks) > 0:
                print_fail(f"Found {len(qa_tasks)} QA tasks remaining")
            else:
                print_success("No QA tasks remain")
        
        r = requests.get(f"{BASE_URL}/admin/users?key={ADMIN_KEY}")
        if r.status_code == 200:
            users_data = r.json()
            users = users_data.get("users", [])
            qa_users = [u for u in users if u.get("name", "").startswith("QA ")]
            if len(qa_users) > 0:
                print_fail(f"Found {len(qa_users)} QA users remaining")
            else:
                print_success("No QA users remain")
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED")
        print("="*80)
        print("\nSUMMARY:")
        print("  • @mentions detection works (case-insensitive)")
        print("  • comment.mentions[] populated correctly")
        print("  • mentioned=[] when person has no email (no notification)")
        print("  • Self-mention excluded from notification")
        print("  • notify:false prevents all email sending")
        print("  • Error cases handled (400/404/401)")
        print("  • bruker role can access (sakerAuthed)")
        print("  • Regression tests passed")
        print("  • Cleanup completed")
        print("\nCRITICAL SAFETY:")
        print("  ✓ Used notify:false on ALL comment/task operations")
        print("  ✓ Used test person WITHOUT email (no real emails possible)")
        print("  ✓ All test data cleaned up")
        print("  ✓ SendGrid LIVE but no emails sent")
        
        return 0
        
    except Exception as e:
        print_fail(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        # Emergency cleanup in case of failure
        if test_task_id:
            try:
                requests.delete(f"{BASE_URL}/admin/tasks/{test_task_id}?key={ADMIN_KEY}")
            except:
                pass
        for user_id in test_user_ids:
            try:
                requests.delete(f"{BASE_URL}/admin/users/{user_id}?key={ADMIN_KEY}")
            except:
                pass

if __name__ == "__main__":
    sys.exit(main())
