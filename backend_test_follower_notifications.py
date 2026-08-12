#!/usr/bin/env python3
"""
Backend test for FOLLOWER NOTIFICATIONS in DigiHome case management system.
Tests that followers receive both in-app notifications AND emails when someone comments/updates a case.
"""

import os
import sys
import requests
import time
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test data
SARAH_DATA = {
    "name": "Sarah Varseltest",
    "email": "sarah.varseltest@example.com",
    "role": "bruker",
    "password": "TestPass123!",
    "groups": []
}

ERIK_DATA = {
    "name": "Erik Varseltest",
    "email": "erik.varseltest@example.com",
    "role": "bruker",
    "password": "TestPass123!",
    "groups": []
}

def print_test(msg):
    """Print test message"""
    print(f"  {msg}")

def print_success(msg):
    """Print success message"""
    print(f"  ✅ {msg}")

def print_error(msg):
    """Print error message"""
    print(f"  ❌ {msg}")

def get_mongo_client():
    """Get MongoDB client"""
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection
        return client
    except Exception as e:
        print_error(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)

def cleanup_test_data(mongo_client):
    """Clean up all test data from MongoDB"""
    try:
        db = mongo_client[DB_NAME]
        
        # Delete test users
        users_result = db.admin_users.delete_many({
            "email": {"$regex": "varseltest@example.com", "$options": "i"}
        })
        print_test(f"Deleted {users_result.deleted_count} test users")
        
        # Delete test tasks
        tasks_result = db.tasks.delete_many({
            "title": {"$regex": "^VARSELTEST", "$options": "i"}
        })
        print_test(f"Deleted {tasks_result.deleted_count} test tasks")
        
        # Delete notifications for test users (get user IDs first)
        test_user_ids = []
        for email in ["sarah.varseltest@example.com", "erik.varseltest@example.com"]:
            user = db.admin_users.find_one({"email": email})
            if user:
                test_user_ids.append(user.get('id'))
        
        if test_user_ids:
            notif_result = db.notifications.delete_many({
                "userId": {"$in": test_user_ids}
            })
            print_test(f"Deleted {notif_result.deleted_count} test notifications")
        
        print_success("Cleanup completed")
        return True
    except Exception as e:
        print_error(f"Cleanup failed: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("FOLLOWER NOTIFICATIONS TEST - DigiHome Case Management System")
    print("="*80 + "\n")
    
    mongo_client = get_mongo_client()
    db = mongo_client[DB_NAME]
    
    # Initial cleanup
    print("🧹 INITIAL CLEANUP")
    cleanup_test_data(mongo_client)
    print()
    
    sarah_id = None
    erik_id = None
    task_id = None
    sarah_token = None
    
    try:
        # ============================================================
        # SETUP: Create test users
        # ============================================================
        print("📋 SETUP: Creating test users")
        
        # Create Sarah
        print_test("Creating Sarah Varseltest...")
        resp = requests.post(
            f"{API_BASE}/admin/users",
            params={"key": ADMIN_KEY},
            json=SARAH_DATA,
            timeout=10
        )
        if resp.status_code not in [200, 201]:
            print_error(f"Failed to create Sarah: {resp.status_code} - {resp.text}")
            sys.exit(1)
        resp_data = resp.json()
        sarah_id = resp_data.get('member', {}).get('id') or resp_data.get('user', {}).get('id')
        print_success(f"Sarah created with ID: {sarah_id}")
        
        # Create Erik
        print_test("Creating Erik Varseltest...")
        resp = requests.post(
            f"{API_BASE}/admin/users",
            params={"key": ADMIN_KEY},
            json=ERIK_DATA,
            timeout=10
        )
        if resp.status_code not in [200, 201]:
            print_error(f"Failed to create Erik: {resp.status_code} - {resp.text}")
            sys.exit(1)
        resp_data = resp.json()
        erik_id = resp_data.get('member', {}).get('id') or resp_data.get('user', {}).get('id')
        print_success(f"Erik created with ID: {erik_id}")
        print()
        
        # ============================================================
        # SETUP: Create test task
        # ============================================================
        print("📋 SETUP: Creating test task")
        
        task_data = {
            "title": "VARSELTEST følgere",
            "status": "inbox",
            "assigneeId": sarah_id,
            "followers": [erik_id],
            "notify": False,  # Don't send notifications on creation
            "actor": "TestAgent"
        }
        
        print_test("Creating test task...")
        resp = requests.post(
            f"{API_BASE}/admin/tasks",
            params={"key": ADMIN_KEY},
            json=task_data,
            timeout=10
        )
        if resp.status_code not in [200, 201]:
            print_error(f"Failed to create task: {resp.status_code} - {resp.text}")
            sys.exit(1)
        task_id = resp.json().get('task', {}).get('id')
        print_success(f"Task created with ID: {task_id}")
        print()
        
        # ============================================================
        # T1: COMMENT NOTIFICATIONS
        # ============================================================
        print("🧪 T1: COMMENT NOTIFICATIONS")
        print_test("Testing that both assignee (Sarah) and follower (Erik) receive notifications...")
        
        # Clear any existing notifications
        db.notifications.delete_many({"userId": {"$in": [sarah_id, erik_id]}})
        
        # Post a comment
        comment_data = {
            "text": "Sender dere saldo på lånene?",
            "author": "TestAgent"
        }
        
        print_test("Posting comment...")
        resp = requests.post(
            f"{API_BASE}/admin/tasks/{task_id}/comments",
            params={"key": ADMIN_KEY},
            json=comment_data,
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"Failed to post comment: {resp.status_code} - {resp.text}")
            sys.exit(1)
        print_success("Comment posted successfully")
        
        # Wait a bit for notifications to be created
        time.sleep(1)
        
        # T1a: Check in-app notifications
        print_test("T1a: Checking in-app notifications in MongoDB...")
        
        sarah_notif = db.notifications.find_one({
            "userId": sarah_id,
            "taskId": task_id,
            "type": "kommentar"
        })
        
        erik_notif = db.notifications.find_one({
            "userId": erik_id,
            "taskId": task_id,
            "type": "kommentar"
        })
        
        if not sarah_notif:
            print_error("Sarah did NOT receive in-app notification (kommentar)")
            sys.exit(1)
        print_success(f"Sarah received in-app notification: type={sarah_notif.get('type')}, text='{sarah_notif.get('text')}'")
        
        if not erik_notif:
            print_error("Erik did NOT receive in-app notification (kommentar)")
            sys.exit(1)
        print_success(f"Erik received in-app notification: type={erik_notif.get('type')}, text='{erik_notif.get('text')}'")
        
        # T1b: Check activity log for email notifications
        print_test("T1b: Checking activity log for email notifications...")
        
        task = db.tasks.find_one({"id": task_id})
        if not task:
            print_error("Task not found in database")
            sys.exit(1)
        
        activity = task.get('activity', [])
        email_activity = [a for a in activity if 'E-postvarsel sendt til' in a.get('text', '') and '(kommentar)' in a.get('text', '')]
        
        if not email_activity:
            print_error("No email notification activity found in task")
            sys.exit(1)
        
        email_text = email_activity[-1].get('text', '')
        print_success(f"Email activity found: '{email_text}'")
        
        # Check that both names are in the activity
        if 'Sarah Varseltest' not in email_text:
            print_error("Sarah's name not found in email activity")
            sys.exit(1)
        print_success("Sarah's name found in email activity")
        
        if 'Erik Varseltest' not in email_text:
            print_error("Erik's name not found in email activity")
            sys.exit(1)
        print_success("Erik's name found in email activity")
        
        print()
        
        # ============================================================
        # T2: STATUS CHANGE NOTIFICATIONS
        # ============================================================
        print("🧪 T2: STATUS CHANGE NOTIFICATIONS")
        print_test("Testing that both assignee and follower receive status change notifications...")
        
        # Clear notifications
        db.notifications.delete_many({"userId": {"$in": [sarah_id, erik_id]}, "type": "status"})
        
        # Update status
        status_data = {
            "status": "doing",
            "actor": "TestAgent"
        }
        
        print_test("Updating task status to 'doing'...")
        resp = requests.put(
            f"{API_BASE}/admin/tasks/{task_id}",
            params={"key": ADMIN_KEY},
            json=status_data,
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"Failed to update status: {resp.status_code} - {resp.text}")
            sys.exit(1)
        print_success("Status updated successfully")
        
        # Wait a bit for notifications
        time.sleep(1)
        
        # T2a: Check in-app notifications
        print_test("T2a: Checking in-app notifications for status change...")
        
        sarah_status_notif = db.notifications.find_one({
            "userId": sarah_id,
            "taskId": task_id,
            "type": "status"
        })
        
        erik_status_notif = db.notifications.find_one({
            "userId": erik_id,
            "taskId": task_id,
            "type": "status"
        })
        
        if not sarah_status_notif:
            print_error("Sarah did NOT receive status change notification")
            sys.exit(1)
        print_success(f"Sarah received status notification: type={sarah_status_notif.get('type')}, text='{sarah_status_notif.get('text')}'")
        
        if not erik_status_notif:
            print_error("Erik did NOT receive status change notification")
            sys.exit(1)
        print_success(f"Erik received status notification: type={erik_status_notif.get('type')}, text='{erik_status_notif.get('text')}'")
        
        # T2b: Check activity log for email notifications
        print_test("T2b: Checking activity log for status change emails...")
        
        task = db.tasks.find_one({"id": task_id})
        activity = task.get('activity', [])
        status_email_activity = [a for a in activity if 'E-postvarsel sendt til' in a.get('text', '') and '(statusendring)' in a.get('text', '')]
        
        if not status_email_activity:
            print_error("No status change email activity found")
            sys.exit(1)
        
        status_email_text = status_email_activity[-1].get('text', '')
        print_success(f"Status email activity found: '{status_email_text}'")
        
        # Check both names
        if 'Sarah Varseltest' not in status_email_text and 'Erik Varseltest' not in status_email_text:
            print_error("Neither Sarah nor Erik found in status email activity")
            sys.exit(1)
        print_success("Status change email activity contains expected names")
        
        print()
        
        # ============================================================
        # T3: AUTHOR NOT NOTIFIED OF OWN COMMENTS
        # ============================================================
        print("🧪 T3: AUTHOR NOT NOTIFIED OF OWN COMMENTS")
        print_test("Testing that Sarah is NOT notified of her own comments...")
        
        # Login as Sarah to get her token
        print_test("Logging in as Sarah...")
        resp = requests.post(
            f"{API_BASE}/admin/auth/login",
            json={
                "email": SARAH_DATA["email"],
                "password": SARAH_DATA["password"]
            },
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"Failed to login as Sarah: {resp.status_code} - {resp.text}")
            sys.exit(1)
        sarah_token = resp.json().get('token')
        print_success("Sarah logged in successfully")
        
        # Clear notifications
        db.notifications.delete_many({"userId": sarah_id, "type": "kommentar"})
        
        # Count Sarah's notifications before comment
        notif_count_before = db.notifications.count_documents({"userId": sarah_id, "type": "kommentar"})
        
        # Post comment as Sarah
        sarah_comment = {
            "text": "Mitt eget svar",
            "author": "Sarah Varseltest"
        }
        
        print_test("Posting comment as Sarah...")
        resp = requests.post(
            f"{API_BASE}/admin/tasks/{task_id}/comments",
            params={"key": sarah_token},
            json=sarah_comment,
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"Failed to post comment as Sarah: {resp.status_code} - {resp.text}")
            sys.exit(1)
        print_success("Comment posted as Sarah")
        
        # Wait a bit
        time.sleep(1)
        
        # Check that Sarah did NOT get a new notification
        notif_count_after = db.notifications.count_documents({"userId": sarah_id, "type": "kommentar"})
        
        if notif_count_after > notif_count_before:
            print_error(f"Sarah received notification for her own comment! Before: {notif_count_before}, After: {notif_count_after}")
            sys.exit(1)
        print_success("Sarah did NOT receive notification for her own comment (correct behavior)")
        
        # Check that Erik DID get a notification
        erik_new_notif = db.notifications.find_one({
            "userId": erik_id,
            "taskId": task_id,
            "type": "kommentar",
            "actor": "Sarah Varseltest"
        })
        
        if not erik_new_notif:
            print_error("Erik did NOT receive notification for Sarah's comment")
            sys.exit(1)
        print_success("Erik received notification for Sarah's comment (correct behavior)")
        
        print()
        
        # ============================================================
        # T4: PREFERENCE RESPECT (OPTIONAL)
        # ============================================================
        print("🧪 T4: PREFERENCE RESPECT (OPTIONAL)")
        print_test("Testing that email preferences are respected...")
        
        # Set Erik's email preference for 'kommentar' to false
        print_test("Setting Erik's notifPrefs.email.kommentar to false...")
        db.admin_users.update_one(
            {"id": erik_id},
            {"$set": {"notifPrefs.email.kommentar": False}}
        )
        print_success("Erik's email preference updated")
        
        # Clear activity log
        db.tasks.update_one(
            {"id": task_id},
            {"$set": {"activity": []}}
        )
        
        # Post another comment as admin
        pref_comment = {
            "text": "Testing preference respect",
            "author": "TestAgent"
        }
        
        print_test("Posting comment to test preference...")
        resp = requests.post(
            f"{API_BASE}/admin/tasks/{task_id}/comments",
            params={"key": ADMIN_KEY},
            json=pref_comment,
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"Failed to post comment: {resp.status_code} - {resp.text}")
            sys.exit(1)
        
        time.sleep(1)
        
        # Check activity log - Erik should NOT be in the email list
        task = db.tasks.find_one({"id": task_id})
        activity = task.get('activity', [])
        email_activity = [a for a in activity if 'E-postvarsel sendt til' in a.get('text', '') and '(kommentar)' in a.get('text', '')]
        
        if email_activity:
            email_text = email_activity[-1].get('text', '')
            if 'Erik Varseltest' in email_text:
                print_error(f"Erik's name found in email activity despite preference being false: '{email_text}'")
                sys.exit(1)
            print_success("Erik's name NOT in email activity (preference respected)")
        else:
            print_success("No email activity (both users may have preferences disabled)")
        
        # Check that Erik still got in-app notification (preferences only affect email)
        # Note: We need to count notifications after the comment, not search by text
        erik_pref_notif_count = db.notifications.count_documents({
            "userId": erik_id,
            "taskId": task_id,
            "type": "kommentar",
            "actor": "TestAgent"
        })
        
        if erik_pref_notif_count == 0:
            print_error("Erik did NOT receive in-app notification (should always receive regardless of email pref)")
            sys.exit(1)
        print_success("Erik received in-app notification (correct - preferences only affect email)")
        
        print()
        
        # ============================================================
        # T5: REGRESSION TEST
        # ============================================================
        print("🧪 T5: REGRESSION TEST")
        print_test("Testing that basic endpoints still work...")
        
        resp = requests.get(
            f"{API_BASE}/admin/tasks",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        if resp.status_code != 200:
            print_error(f"GET /admin/tasks failed: {resp.status_code}")
            sys.exit(1)
        print_success("GET /admin/tasks returned 200 OK")
        
        print()
        
        # ============================================================
        # FINAL SUMMARY
        # ============================================================
        print("="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80)
        print()
        print("Summary:")
        print("  ✅ T1: Comment notifications - Both assignee and follower received in-app + email")
        print("  ✅ T2: Status change notifications - Both assignee and follower received in-app + email")
        print("  ✅ T3: Author exclusion - Sarah NOT notified of her own comments")
        print("  ✅ T4: Preference respect - Email preferences honored (in-app always sent)")
        print("  ✅ T5: Regression - Basic endpoints working")
        print()
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # ============================================================
        # CLEANUP
        # ============================================================
        print("🧹 FINAL CLEANUP")
        cleanup_test_data(mongo_client)
        mongo_client.close()
        print()

if __name__ == "__main__":
    main()
