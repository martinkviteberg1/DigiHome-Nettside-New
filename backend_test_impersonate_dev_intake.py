#!/usr/bin/env python3
"""
Backend test for IMPERSONERING + SAKSMOTTAK-INNSTILLINGER + BRIDGE MED MOTTAKERE
Tests POST /api/admin/impersonate, GET/PUT /api/admin/dev-issue-innstillinger,
POST /api/bridge/dev-issue with recipients, and regression tests.
"""

import requests
import json
import sys
import time
from pymongo import MongoClient
import os
import base64
import random

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')
AGENT_BRIDGE_SECRET = os.getenv('AGENT_BRIDGE_SECRET', 'dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
qa_user_id = None
qa_user_email = "qa-imp@example.com"
admin_session_token = None
imp_token = None
owner_id = None
qa_task_ids = []
qa_event_ids = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  {details}")
    return passed

def cleanup():
    """Cleanup all QA data"""
    global qa_user_id, qa_task_ids
    
    print("\n=== MANDATORY CLEANUP ===")
    
    # Delete QA user
    if qa_user_id:
        try:
            resp = requests.delete(f"{API_BASE}/admin/users/{qa_user_id}?key={ADMIN_KEY}")
            print(f"Deleted QA user: {resp.status_code}")
        except Exception as e:
            print(f"Error deleting QA user: {e}")
    
    # Delete QA tasks from MongoDB
    if qa_task_ids:
        try:
            result = db.tasks.delete_many({"id": {"$in": qa_task_ids}})
            print(f"Deleted {result.deleted_count} QA tasks from MongoDB")
        except Exception as e:
            print(f"Error deleting QA tasks: {e}")
    
    # Delete QA notifications
    try:
        if qa_user_id:
            result = db.notifications.delete_many({"userId": qa_user_id})
            print(f"Deleted {result.deleted_count} QA notifications")
        if qa_task_ids:
            result = db.notifications.delete_many({"taskId": {"$in": qa_task_ids}})
            print(f"Deleted notifications for QA tasks")
    except Exception as e:
        print(f"Error deleting notifications: {e}")
    
    # Delete QA task_files
    if qa_task_ids:
        try:
            result = db.task_files.delete_many({"taskId": {"$in": qa_task_ids}})
            print(f"Deleted {result.deleted_count} QA task_files")
        except Exception as e:
            print(f"Error deleting task_files: {e}")
    
    # Delete impersonation logs for QA user
    if qa_user_id:
        try:
            result = db.impersonation_log.delete_many({"targetId": qa_user_id})
            print(f"Deleted {result.deleted_count} impersonation logs")
        except Exception as e:
            print(f"Error deleting impersonation logs: {e}")
    
    # Reset dev_issue_intake settings to defaults
    try:
        db.settings.update_one(
            {"key": "dev_issue_intake"},
            {"$set": {
                "recipientIds": [],
                "notifyEmail": True,
                "addAsFollowers": True
            }},
            upsert=True
        )
        print("Reset dev_issue_intake settings to defaults")
    except Exception as e:
        print(f"Error resetting settings: {e}")
    
    # Verify cleanup
    try:
        qa_users = db.admin_users.count_documents({"email": qa_user_email})
        qa_tasks = db.tasks.count_documents({"title": {"$regex": "^QA "}})
        qa_notifs = db.notifications.count_documents({"userId": qa_user_id}) if qa_user_id else 0
        print(f"\nCleanup verification: {qa_users} QA users, {qa_tasks} QA tasks, {qa_notifs} QA notifications")
        if qa_users == 0 and qa_tasks == 0 and qa_notifs == 0:
            print("✅ Cleanup successful - all QA data removed")
        else:
            print("⚠️ Warning: Some QA data may remain")
    except Exception as e:
        print(f"Error verifying cleanup: {e}")

def main():
    global qa_user_id, admin_session_token, imp_token, owner_id, qa_task_ids, qa_event_ids
    
    print("=" * 80)
    print("BACKEND TEST: IMPERSONERING + DEV-ISSUE INTAKE WITH RECIPIENTS")
    print("=" * 80)
    print(f"Base URL: {API_BASE}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Bridge secret: {AGENT_BRIDGE_SECRET}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 80)
    
    tests_passed = 0
    tests_total = 0
    
    try:
        # ===================================================================
        # SETUP: Admin login and create QA user
        # ===================================================================
        print("\n=== SETUP ===")
        
        # Admin login
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/auth/login", json={
                "email": "martin@kviteberg.no",
                "password": "Pyramiden2025##"
            })
            if resp.status_code == 200:
                data = resp.json()
                admin_session_token = data.get('token')
                if admin_session_token:
                    tests_passed += log_test("Admin login", True, f"Got session token")
                else:
                    log_test("Admin login", False, "No token in response")
            else:
                log_test("Admin login", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("Admin login", False, f"Exception: {e}")
        
        # Get owner ID (martin@kviteberg.no)
        try:
            owner_doc = db.admin_users.find_one({"email": "martin@kviteberg.no"}, {"_id": 0, "id": 1})
            if owner_doc:
                owner_id = owner_doc['id']
                print(f"Owner ID: {owner_id}")
        except Exception as e:
            print(f"Error getting owner ID: {e}")
        
        # Create QA user
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/users?key={ADMIN_KEY}", json={
                "name": "QA Imp Bruker",
                "email": qa_user_email,
                "role": "bruker",
                "password": "TestPass123!",
                "groups": ["utvikling"]
            })
            if resp.status_code == 200:
                data = resp.json()
                member = data.get('member', {})
                qa_user_id = member.get('id')
                if qa_user_id:
                    tests_passed += log_test("Create QA user", True, f"User ID: {qa_user_id}")
                else:
                    log_test("Create QA user", False, f"No ID in response: {data}")
            else:
                log_test("Create QA user", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("Create QA user", False, f"Exception: {e}")
        
        if not qa_user_id or not admin_session_token:
            print("\n❌ CRITICAL: Setup failed, cannot continue")
            return
        
        # ===================================================================
        # 1) IMPERSONERING: POST /api/admin/impersonate
        # ===================================================================
        print("\n=== 1) IMPERSONERING TESTS ===")
        
        # 1a) Happy path: impersonate QA user with admin session token
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/impersonate?key={admin_session_token}", json={
                "userId": qa_user_id
            })
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and data.get('token') and data.get('user'):
                    imp_token = data['token']
                    user = data['user']
                    # Check impersonatedBy field
                    if user.get('impersonatedBy') and user['impersonatedBy'].get('name'):
                        tests_passed += log_test("1a) Impersonate QA user (happy path)", True, 
                            f"Got token, user.role={user.get('role')}, impersonatedBy.name={user['impersonatedBy'].get('name')}")
                    else:
                        log_test("1a) Impersonate QA user (happy path)", False, "Missing impersonatedBy field")
                else:
                    log_test("1a) Impersonate QA user (happy path)", False, f"Response: {data}")
            else:
                log_test("1a) Impersonate QA user (happy path)", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("1a) Impersonate QA user (happy path)", False, f"Exception: {e}")
        
        # 1b) auth/me with imp token
        tests_total += 1
        if imp_token:
            try:
                resp = requests.get(f"{API_BASE}/admin/auth/me?key={imp_token}")
                if resp.status_code == 200:
                    data = resp.json()
                    user = data.get('user', {})
                    if user.get('role') == 'bruker' and user.get('impersonatedBy'):
                        tests_passed += log_test("1b) auth/me with imp token", True, 
                            f"role=bruker, impersonatedBy set")
                    else:
                        log_test("1b) auth/me with imp token", False, f"role={user.get('role')}, impersonatedBy={user.get('impersonatedBy')}")
                else:
                    log_test("1b) auth/me with imp token", False, f"Status {resp.status_code}")
            except Exception as e:
                log_test("1b) auth/me with imp token", False, f"Exception: {e}")
        
        # 1c) Imp token follows target user's permissions
        # Admin-only endpoint should return 401
        tests_total += 1
        if imp_token:
            try:
                resp = requests.get(f"{API_BASE}/admin/dev-issue-innstillinger?key={imp_token}")
                if resp.status_code == 401:
                    tests_passed += log_test("1c) Imp token admin-only endpoint → 401", True, 
                        "dev-issue-innstillinger correctly rejected")
                else:
                    log_test("1c) Imp token admin-only endpoint → 401", False, f"Status {resp.status_code}")
            except Exception as e:
                log_test("1c) Imp token admin-only endpoint → 401", False, f"Exception: {e}")
        
        # User-accessible endpoint should work
        tests_total += 1
        if imp_token:
            try:
                resp = requests.get(f"{API_BASE}/admin/tasks/summary?key={imp_token}")
                if resp.status_code == 200:
                    tests_passed += log_test("1c) Imp token user endpoint → 200", True, 
                        "tasks/summary accessible")
                else:
                    log_test("1c) Imp token user endpoint → 200", False, f"Status {resp.status_code}")
            except Exception as e:
                log_test("1c) Imp token user endpoint → 200", False, f"Exception: {e}")
        
        # 1d) Chain impersonation (should fail - bruker role rejected by adminAuthed)
        tests_total += 1
        if imp_token and qa_user_id:
            try:
                # Try to impersonate another user with imp token
                resp = requests.post(f"{API_BASE}/admin/impersonate?key={imp_token}", json={
                    "userId": qa_user_id
                })
                if resp.status_code == 401:
                    tests_passed += log_test("1d) Chain impersonation → 401", True, 
                        "Bruker role correctly rejected by adminAuthed")
                else:
                    log_test("1d) Chain impersonation → 401", False, f"Status {resp.status_code}")
            except Exception as e:
                log_test("1d) Chain impersonation → 401", False, f"Exception: {e}")
        
        # 1e) Owner target (should fail with 403 or 400 if admin IS owner)
        tests_total += 1
        if owner_id:
            try:
                resp = requests.post(f"{API_BASE}/admin/impersonate?key={admin_session_token}", json={
                    "userId": owner_id
                })
                data = resp.json()
                # If admin IS owner, returns 400 "Du kan ikke se portalen som deg selv"
                # If admin is NOT owner, returns 403 "Eier-kontoen kan ikke imiteres"
                if resp.status_code == 403 and 'Eier-kontoen' in data.get('error', ''):
                    tests_passed += log_test("1e) Owner target → 403", True, 
                        "Owner account correctly protected")
                elif resp.status_code == 400 and 'deg selv' in data.get('error', ''):
                    tests_passed += log_test("1e) Owner target → 400 (self-imp)", True, 
                        "Admin IS owner, self-impersonation rejected")
                else:
                    log_test("1e) Owner target → 403/400", False, f"Status {resp.status_code}: {data.get('error')}")
            except Exception as e:
                log_test("1e) Owner target → 403/400", False, f"Exception: {e}")
        
        # 1f) Self-impersonation (should fail with 400)
        tests_total += 1
        try:
            # Get admin's own user ID from MongoDB (auth/me doesn't return id field)
            admin_user = db.admin_users.find_one({"email": "martin@kviteberg.no"}, {"_id": 0, "id": 1})
            if admin_user:
                admin_user_id = admin_user['id']
                resp = requests.post(f"{API_BASE}/admin/impersonate?key={admin_session_token}", json={
                    "userId": admin_user_id
                })
                if resp.status_code == 400:
                    tests_passed += log_test("1f) Self-impersonation → 400", True, 
                        "Self-impersonation correctly rejected")
                else:
                    log_test("1f) Self-impersonation → 400", False, f"Status {resp.status_code}")
            else:
                log_test("1f) Self-impersonation → 400", False, "Could not get admin user ID from MongoDB")
        except Exception as e:
            log_test("1f) Self-impersonation → 400", False, f"Exception: {e}")
        
        # 1g) Without auth (should fail with 401)
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/impersonate", json={
                "userId": qa_user_id
            })
            if resp.status_code == 401:
                tests_passed += log_test("1g) Impersonate without auth → 401", True)
            else:
                log_test("1g) Impersonate without auth → 401", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("1g) Impersonate without auth → 401", False, f"Exception: {e}")
        
        # 1h) Unknown userId (should fail with 404)
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/impersonate?key={admin_session_token}", json={
                "userId": "finnes-ikke-123"
            })
            if resp.status_code == 404:
                tests_passed += log_test("1h) Unknown userId → 404", True)
            else:
                log_test("1h) Unknown userId → 404", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("1h) Unknown userId → 404", False, f"Exception: {e}")
        
        # 1i) Verify impersonation_log in MongoDB
        tests_total += 1
        try:
            log_count = db.impersonation_log.count_documents({"targetId": qa_user_id})
            if log_count >= 1:
                log_entry = db.impersonation_log.find_one({"targetId": qa_user_id})
                if log_entry and log_entry.get('adminEmail') and log_entry.get('targetId') == qa_user_id:
                    tests_passed += log_test("1i) Impersonation log in MongoDB", True, 
                        f"Found {log_count} log entries, adminEmail={log_entry.get('adminEmail')}")
                else:
                    log_test("1i) Impersonation log in MongoDB", False, "Log entry missing required fields")
            else:
                log_test("1i) Impersonation log in MongoDB", False, f"Found {log_count} log entries")
        except Exception as e:
            log_test("1i) Impersonation log in MongoDB", False, f"Exception: {e}")
        
        # ===================================================================
        # 2) SAKSMOTTAK-INNSTILLINGER: GET/PUT /api/admin/dev-issue-innstillinger
        # ===================================================================
        print("\n=== 2) SAKSMOTTAK-INNSTILLINGER TESTS ===")
        
        # 2a) GET with admin key (should return defaults)
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/admin/dev-issue-innstillinger?key={ADMIN_KEY}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and 'recipientIds' in data and 'notifyEmail' in data and 'addAsFollowers' in data:
                    tests_passed += log_test("2a) GET dev-issue-innstillinger", True, 
                        f"recipientIds={data['recipientIds']}, notifyEmail={data['notifyEmail']}, addAsFollowers={data['addAsFollowers']}")
                else:
                    log_test("2a) GET dev-issue-innstillinger", False, f"Response: {data}")
            else:
                log_test("2a) GET dev-issue-innstillinger", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("2a) GET dev-issue-innstillinger", False, f"Exception: {e}")
        
        # 2b) PUT with valid and invalid recipient IDs
        tests_total += 1
        try:
            resp = requests.put(f"{API_BASE}/admin/dev-issue-innstillinger?key={ADMIN_KEY}", json={
                "recipientIds": [qa_user_id, "finnes-ikke-id"],
                "notifyEmail": False,
                "addAsFollowers": True
            })
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and qa_user_id in data.get('recipientIds', []) and 'finnes-ikke-id' not in data.get('recipientIds', []):
                    tests_passed += log_test("2b) PUT dev-issue-innstillinger (filter invalid)", True, 
                        f"recipientIds={data['recipientIds']}, notifyEmail={data['notifyEmail']}")
                else:
                    log_test("2b) PUT dev-issue-innstillinger (filter invalid)", False, f"recipientIds={data.get('recipientIds')}")
            else:
                log_test("2b) PUT dev-issue-innstillinger (filter invalid)", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("2b) PUT dev-issue-innstillinger (filter invalid)", False, f"Exception: {e}")
        
        # 2c) GET again to verify persistence
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/admin/dev-issue-innstillinger?key={ADMIN_KEY}")
            if resp.status_code == 200:
                data = resp.json()
                if qa_user_id in data.get('recipientIds', []) and data.get('notifyEmail') == False:
                    tests_passed += log_test("2c) GET dev-issue-innstillinger (verify persistence)", True, 
                        f"Settings persisted correctly")
                else:
                    log_test("2c) GET dev-issue-innstillinger (verify persistence)", False, f"Settings not persisted: {data}")
            else:
                log_test("2c) GET dev-issue-innstillinger (verify persistence)", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("2c) GET dev-issue-innstillinger (verify persistence)", False, f"Exception: {e}")
        
        # 2d) Without auth (should fail with 401)
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/admin/dev-issue-innstillinger")
            if resp.status_code == 401:
                tests_passed += log_test("2d) GET without auth → 401", True)
            else:
                log_test("2d) GET without auth → 401", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("2d) GET without auth → 401", False, f"Exception: {e}")
        
        tests_total += 1
        try:
            resp = requests.put(f"{API_BASE}/admin/dev-issue-innstillinger", json={
                "recipientIds": []
            })
            if resp.status_code == 401:
                tests_passed += log_test("2d) PUT without auth → 401", True)
            else:
                log_test("2d) PUT without auth → 401", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("2d) PUT without auth → 401", False, f"Exception: {e}")
        
        # ===================================================================
        # 3) BRIDGE MED MOTTAKERE: POST /api/bridge/dev-issue
        # ===================================================================
        print("\n=== 3) BRIDGE MED MOTTAKERE TESTS ===")
        
        # 3a) POST dev-issue with recipients (notifyEmail=false to avoid sending emails)
        tests_total += 1
        event_id_1 = f"qa-intake-{random.randint(1000, 9999)}"
        qa_event_ids.append(event_id_1)
        try:
            resp = requests.post(f"{API_BASE}/bridge/dev-issue", 
                headers={"x-bridge-secret": AGENT_BRIDGE_SECRET},
                json={
                    "event_id": event_id_1,
                    "title": "QA Innmeldt testsak",
                    "description": "QA test description",
                    "type": "feil",
                    "severity": "normal",
                    "reporter": {
                        "name": "QA Tester",
                        "email": "qa-tester@example.com"
                    },
                    "context": {
                        "module": "Oversikt"
                    }
                })
            if resp.status_code == 201:
                data = resp.json()
                if data.get('ok') and data.get('task_id') and data.get('recipients') == 1:
                    task_id = data['task_id']
                    qa_task_ids.append(task_id)
                    tests_passed += log_test("3a) POST dev-issue with recipients", True, 
                        f"task_id={task_id}, recipients={data['recipients']}")
                else:
                    log_test("3a) POST dev-issue with recipients", False, f"Response: {data}")
            else:
                log_test("3a) POST dev-issue with recipients", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            log_test("3a) POST dev-issue with recipients", False, f"Exception: {e}")
        
        # 3b) Verify in MongoDB
        tests_total += 1
        if qa_task_ids:
            try:
                task = db.tasks.find_one({"id": qa_task_ids[0]}, {"_id": 0})
                if task:
                    # Check followers
                    if qa_user_id in task.get('followers', []):
                        followers_ok = True
                    else:
                        followers_ok = False
                    
                    # Check space, labels
                    space_ok = task.get('space') == 'utvikling'
                    labels_ok = 'innmeldt' in task.get('labels', [])
                    
                    # Check notification
                    notif = db.notifications.find_one({"userId": qa_user_id, "taskId": qa_task_ids[0]})
                    notif_ok = notif and notif.get('type') == 'innmeldt'
                    
                    if followers_ok and space_ok and labels_ok and notif_ok:
                        tests_passed += log_test("3b) MongoDB verification", True, 
                            f"followers=[{qa_user_id}], space=utvikling, labels=['innmeldt'], notification created")
                    else:
                        log_test("3b) MongoDB verification", False, 
                            f"followers_ok={followers_ok}, space_ok={space_ok}, labels_ok={labels_ok}, notif_ok={notif_ok}")
                else:
                    log_test("3b) MongoDB verification", False, "Task not found in MongoDB")
            except Exception as e:
                log_test("3b) MongoDB verification", False, f"Exception: {e}")
        
        # 3c) Idempotency: same event_id again
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/bridge/dev-issue", 
                headers={"x-bridge-secret": AGENT_BRIDGE_SECRET},
                json={
                    "event_id": event_id_1,
                    "title": "QA Innmeldt testsak (duplicate)",
                    "description": "Should be ignored",
                    "type": "feil",
                    "severity": "normal"
                })
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and data.get('duplicate') == True and data.get('task_id') == qa_task_ids[0]:
                    tests_passed += log_test("3c) Idempotency (same event_id)", True, 
                        f"duplicate=true, same task_id={data['task_id']}")
                else:
                    log_test("3c) Idempotency (same event_id)", False, f"Response: {data}")
            else:
                log_test("3c) Idempotency (same event_id)", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("3c) Idempotency (same event_id)", False, f"Exception: {e}")
        
        # 3d) Wrong secret (should fail with 401)
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/bridge/dev-issue", 
                headers={"x-bridge-secret": "wrong-secret"},
                json={
                    "event_id": "qa-test-wrong-secret",
                    "title": "Should fail"
                })
            if resp.status_code == 401:
                tests_passed += log_test("3d) Wrong secret → 401", True)
            else:
                log_test("3d) Wrong secret → 401", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("3d) Wrong secret → 401", False, f"Exception: {e}")
        
        # 3e) Reset settings and send new dev-issue (should have recipients=0)
        tests_total += 1
        try:
            # Reset settings
            resp = requests.put(f"{API_BASE}/admin/dev-issue-innstillinger?key={ADMIN_KEY}", json={
                "recipientIds": [],
                "notifyEmail": True,
                "addAsFollowers": True
            })
            if resp.status_code == 200:
                # Send new dev-issue
                event_id_2 = f"qa-standard-{random.randint(1000, 9999)}"
                qa_event_ids.append(event_id_2)
                resp = requests.post(f"{API_BASE}/bridge/dev-issue", 
                    headers={"x-bridge-secret": AGENT_BRIDGE_SECRET},
                    json={
                        "event_id": event_id_2,
                        "title": "QA Standard varsling",
                        "description": "Test standard notification",
                        "type": "forbedring",
                        "severity": "lav"
                    })
                if resp.status_code == 201:
                    data = resp.json()
                    if data.get('ok') and data.get('recipients') == 0:
                        task_id = data['task_id']
                        qa_task_ids.append(task_id)
                        # Verify followers is empty
                        task = db.tasks.find_one({"id": task_id}, {"_id": 0, "followers": 1})
                        if task and len(task.get('followers', [])) == 0:
                            # Verify notifications created for admin users
                            notif_count = db.notifications.count_documents({"taskId": task_id})
                            if notif_count > 0:
                                tests_passed += log_test("3e) Reset settings + standard notification", True, 
                                    f"recipients=0, followers=[], {notif_count} notifications for admin/utvikling users")
                            else:
                                log_test("3e) Reset settings + standard notification", False, "No notifications created")
                        else:
                            log_test("3e) Reset settings + standard notification", False, f"followers={task.get('followers') if task else 'task not found'}")
                    else:
                        log_test("3e) Reset settings + standard notification", False, f"recipients={data.get('recipients')}")
                else:
                    log_test("3e) Reset settings + standard notification", False, f"POST status {resp.status_code}")
            else:
                log_test("3e) Reset settings + standard notification", False, f"PUT status {resp.status_code}")
        except Exception as e:
            log_test("3e) Reset settings + standard notification", False, f"Exception: {e}")
        
        # ===================================================================
        # 4) REGRESSION TESTS
        # ===================================================================
        print("\n=== 4) REGRESSION TESTS ===")
        
        # 4a) Admin login still works
        tests_total += 1
        try:
            resp = requests.post(f"{API_BASE}/admin/auth/login", json={
                "email": "martin@kviteberg.no",
                "password": "Pyramiden2025##"
            })
            if resp.status_code == 200 and resp.json().get('token'):
                tests_passed += log_test("4a) Admin login regression", True)
            else:
                log_test("4a) Admin login regression", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("4a) Admin login regression", False, f"Exception: {e}")
        
        # 4b) auth/me with normal session token (no impersonatedBy field)
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/admin/auth/me?key={admin_session_token}")
            if resp.status_code == 200:
                data = resp.json()
                user = data.get('user', {})
                if 'impersonatedBy' not in user:
                    tests_passed += log_test("4b) auth/me without impersonation", True, 
                        "No impersonatedBy field (correct)")
                else:
                    log_test("4b) auth/me without impersonation", False, 
                        f"impersonatedBy field present: {user.get('impersonatedBy')}")
            else:
                log_test("4b) auth/me without impersonation", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("4b) auth/me without impersonation", False, f"Exception: {e}")
        
        # 4c) GET /api/admin/tasks still works
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/admin/tasks?key={ADMIN_KEY}")
            if resp.status_code == 200:
                tests_passed += log_test("4c) GET /api/admin/tasks regression", True)
            else:
                log_test("4c) GET /api/admin/tasks regression", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("4c) GET /api/admin/tasks regression", False, f"Exception: {e}")
        
        # 4d) GET /api/bridge/dev-issue (discovery endpoint, no auth)
        tests_total += 1
        try:
            resp = requests.get(f"{API_BASE}/bridge/dev-issue")
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and data.get('service') and data.get('method'):
                    tests_passed += log_test("4d) GET /api/bridge/dev-issue (discovery)", True, 
                        f"service={data.get('service')}")
                else:
                    log_test("4d) GET /api/bridge/dev-issue (discovery)", False, f"Response: {data}")
            else:
                log_test("4d) GET /api/bridge/dev-issue (discovery)", False, f"Status {resp.status_code}")
        except Exception as e:
            log_test("4d) GET /api/bridge/dev-issue (discovery)", False, f"Exception: {e}")
        
    finally:
        # Always cleanup
        cleanup()
    
    # ===================================================================
    # SUMMARY
    # ===================================================================
    print("\n" + "=" * 80)
    print(f"TESTS COMPLETED: {tests_passed}/{tests_total} passed ({100*tests_passed//tests_total if tests_total > 0 else 0}%)")
    print("=" * 80)
    
    if tests_passed == tests_total:
        print("✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"❌ {tests_total - tests_passed} TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
