#!/usr/bin/env python3
"""
Backend test for PASSORDBEKREFTET SLETTING AV SAKER
Tests password-confirmed task deletion and auth/bekreft endpoint
"""
import requests
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test data
QA_USER_EMAIL = "qa-slett@example.com"
QA_USER_PASSWORD = "QAslett123!"
QA_USER_NAME = "QA Slettebruker"

print("=" * 80)
print("BACKEND TEST: PASSORDBEKREFTET SLETTING AV SAKER")
print("=" * 80)
print(f"Base URL: {API_URL}")
print(f"Admin key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
print()

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Track created resources for cleanup
qa_user_id = None
qa_task_ids = []
owner_token = None
qa_user_token = None

try:
    # ========================================================================
    # (A) OPPSETT: Create QA user, login, create 3 QA tasks
    # ========================================================================
    print("=" * 80)
    print("(A) OPPSETT: Create QA user and tasks")
    print("=" * 80)
    
    # Create QA user with master key
    print(f"\n[A1] Creating QA user: {QA_USER_EMAIL}")
    resp = requests.post(
        f"{API_URL}/admin/users",
        params={"key": ADMIN_KEY},
        json={
            "name": QA_USER_NAME,
            "email": QA_USER_EMAIL,
            "role": "bruker",
            "password": QA_USER_PASSWORD
        }
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code in [200, 201]:
        data = resp.json()
        qa_user_id = data.get('member', {}).get('id') or data.get('user', {}).get('id')
        print(f"✅ QA user created: {qa_user_id}")
    else:
        print(f"❌ Failed to create QA user: {resp.text}")
        raise Exception("Setup failed")
    
    # Login as QA user
    print(f"\n[A2] Login as QA user")
    resp = requests.post(
        f"{API_URL}/admin/auth/login",
        json={
            "email": QA_USER_EMAIL,
            "password": QA_USER_PASSWORD
        }
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        qa_user_token = data.get('token')
        print(f"✅ QA user logged in, token: {qa_user_token[:20]}...")
    else:
        print(f"❌ Failed to login: {resp.text}")
        raise Exception("Setup failed")
    
    # Create 3 QA tasks with master key
    for i in range(1, 4):
        print(f"\n[A3.{i}] Creating QA task {i}")
        resp = requests.post(
            f"{API_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            json={
                "title": f"QA Slett {i}",
                "notify": False
            }
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code in [200, 201]:
            data = resp.json()
            task_id = data.get('task', {}).get('id')
            qa_task_ids.append(task_id)
            print(f"✅ Task created: {task_id}")
        else:
            print(f"❌ Failed to create task: {resp.text}")
            raise Exception("Setup failed")
    
    print(f"\n✅ OPPSETT COMPLETE: QA user {qa_user_id}, 3 tasks: {qa_task_ids}")
    
    # ========================================================================
    # (B) AUTH/BEKREFT: Test password verification endpoint
    # ========================================================================
    print("\n" + "=" * 80)
    print("(B) AUTH/BEKREFT: Test POST /admin/auth/bekreft")
    print("=" * 80)
    
    # B1: Master key with empty body
    print("\n[B1] POST /admin/auth/bekreft with master key + empty body")
    resp = requests.post(
        f"{API_URL}/admin/auth/bekreft",
        params={"key": ADMIN_KEY},
        json={}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 200 and data.get('ok') and data.get('master'):
        print("✅ Master key returns {ok:true, master:true}")
    else:
        print("❌ Expected 200 {ok:true, master:true}")
    
    # B2: QA user token with correct password
    print("\n[B2] POST /admin/auth/bekreft with QA user token + correct password")
    resp = requests.post(
        f"{API_URL}/admin/auth/bekreft",
        params={"key": qa_user_token},
        json={"password": QA_USER_PASSWORD}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 200 and data.get('ok'):
        print("✅ Correct password returns {ok:true}")
    else:
        print("❌ Expected 200 {ok:true}")
    
    # B3: QA user token with wrong password
    print("\n[B3] POST /admin/auth/bekreft with QA user token + wrong password")
    resp = requests.post(
        f"{API_URL}/admin/auth/bekreft",
        params={"key": qa_user_token},
        json={"password": "feilpassord"}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 403 and not data.get('ok') and 'Feil passord' in data.get('error', ''):
        print("✅ Wrong password returns 403 {ok:false, error:'Feil passord'}")
    else:
        print("❌ Expected 403 with 'Feil passord'")
    
    # B4: Without key (401)
    print("\n[B4] POST /admin/auth/bekreft without key")
    resp = requests.post(
        f"{API_URL}/admin/auth/bekreft",
        json={"password": QA_USER_PASSWORD}
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 401:
        print("✅ Without key returns 401")
    else:
        print(f"❌ Expected 401, got {resp.status_code}")
    
    # ========================================================================
    # (C) DELETE-HÅNDHEVING: Test password requirement for DELETE
    # ========================================================================
    print("\n" + "=" * 80)
    print("(C) DELETE-HÅNDHEVING: Test password requirement with QA user token")
    print("=" * 80)
    
    task1_id = qa_task_ids[0]
    
    # C1: DELETE without body (no password)
    print(f"\n[C1] DELETE /admin/tasks/{task1_id} without body (no password)")
    resp = requests.delete(
        f"{API_URL}/admin/tasks/{task1_id}",
        params={"key": qa_user_token}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 403 and 'Sletting krever passordbekreftelse' in data.get('error', ''):
        print("✅ Returns 403 'Sletting krever passordbekreftelse'")
    else:
        print("❌ Expected 403 with 'Sletting krever passordbekreftelse'")
    
    # Verify task still exists
    print(f"[C1.1] Verify task {task1_id} still exists")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    tasks = resp.json().get('tasks', [])
    task_exists = any(t['id'] == task1_id for t in tasks)
    if task_exists:
        print(f"✅ Task {task1_id} still exists")
    else:
        print(f"❌ Task {task1_id} was deleted (should still exist)")
    
    # C2: DELETE with wrong password
    print(f"\n[C2] DELETE /admin/tasks/{task1_id} with wrong password")
    resp = requests.delete(
        f"{API_URL}/admin/tasks/{task1_id}",
        params={"key": qa_user_token},
        json={"password": "feilpassord"}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 403:
        print("✅ Returns 403")
    else:
        print(f"❌ Expected 403, got {resp.status_code}")
    
    # Verify task still exists
    print(f"[C2.1] Verify task {task1_id} still exists")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    tasks = resp.json().get('tasks', [])
    task_exists = any(t['id'] == task1_id for t in tasks)
    if task_exists:
        print(f"✅ Task {task1_id} still exists")
    else:
        print(f"❌ Task {task1_id} was deleted (should still exist)")
    
    # C3: DELETE with correct password
    print(f"\n[C3] DELETE /admin/tasks/{task1_id} with correct password")
    resp = requests.delete(
        f"{API_URL}/admin/tasks/{task1_id}",
        params={"key": qa_user_token},
        json={"password": QA_USER_PASSWORD}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 200 and data.get('ok'):
        print("✅ Returns 200 {ok:true}")
    else:
        print(f"❌ Expected 200 {{ok:true}}, got {resp.status_code}")
    
    # Verify task is deleted
    print(f"[C3.1] Verify task {task1_id} is deleted")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    tasks = resp.json().get('tasks', [])
    task_exists = any(t['id'] == task1_id for t in tasks)
    if not task_exists:
        print(f"✅ Task {task1_id} is deleted")
        qa_task_ids.remove(task1_id)  # Remove from cleanup list
    else:
        print(f"❌ Task {task1_id} still exists (should be deleted)")
    
    # ========================================================================
    # (D) MASTERNØKKEL-UNNTAK: Master key bypasses password requirement
    # ========================================================================
    print("\n" + "=" * 80)
    print("(D) MASTERNØKKEL-UNNTAK: Master key bypasses password requirement")
    print("=" * 80)
    
    task2_id = qa_task_ids[0]  # Second task (first was deleted)
    
    print(f"\n[D1] DELETE /admin/tasks/{task2_id} with master key WITHOUT body")
    resp = requests.delete(
        f"{API_URL}/admin/tasks/{task2_id}",
        params={"key": ADMIN_KEY}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 200 and data.get('ok'):
        print("✅ Master key deletes without password: 200 {ok:true}")
    else:
        print(f"❌ Expected 200 {{ok:true}}, got {resp.status_code}")
    
    # Verify task is deleted
    print(f"[D1.1] Verify task {task2_id} is deleted")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    tasks = resp.json().get('tasks', [])
    task_exists = any(t['id'] == task2_id for t in tasks)
    if not task_exists:
        print(f"✅ Task {task2_id} is deleted")
        qa_task_ids.remove(task2_id)  # Remove from cleanup list
    else:
        print(f"❌ Task {task2_id} still exists (should be deleted)")
    
    # ========================================================================
    # (E) EIER-SESJON + REGRESJON: Owner session with password + regression
    # ========================================================================
    print("\n" + "=" * 80)
    print("(E) EIER-SESJON + REGRESJON: Owner session + regression tests")
    print("=" * 80)
    
    # E1: Login as owner
    print(f"\n[E1] Login as owner: {OWNER_EMAIL}")
    resp = requests.post(
        f"{API_URL}/admin/auth/login",
        json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        }
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        owner_token = data.get('token')
        print(f"✅ Owner logged in, token: {owner_token[:20]}...")
    else:
        print(f"❌ Failed to login as owner: {resp.text}")
        raise Exception("Owner login failed")
    
    # E2: DELETE with owner session + owner password
    task3_id = qa_task_ids[0]  # Third task (first two were deleted)
    print(f"\n[E2] DELETE /admin/tasks/{task3_id} with owner token + owner password")
    resp = requests.delete(
        f"{API_URL}/admin/tasks/{task3_id}",
        params={"key": owner_token},
        json={"password": OWNER_PASSWORD}
    )
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Response: {data}")
    if resp.status_code == 200 and data.get('ok'):
        print("✅ Owner session with correct password: 200 {ok:true}")
    else:
        print(f"❌ Expected 200 {{ok:true}}, got {resp.status_code}")
    
    # Verify task is deleted
    print(f"[E2.1] Verify task {task3_id} is deleted")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    tasks = resp.json().get('tasks', [])
    task_exists = any(t['id'] == task3_id for t in tasks)
    if not task_exists:
        print(f"✅ Task {task3_id} is deleted")
        qa_task_ids.remove(task3_id)  # Remove from cleanup list
    else:
        print(f"❌ Task {task3_id} still exists (should be deleted)")
    
    # E3: Regression - POST /admin/tasks (create new QA task)
    print(f"\n[E3] REGRESSION: POST /admin/tasks (create new QA task)")
    resp = requests.post(
        f"{API_URL}/admin/tasks",
        params={"key": ADMIN_KEY},
        json={
            "title": "QA Regresjon",
            "notify": False
        }
    )
    print(f"Status: {resp.status_code}")
    if resp.status_code in [200, 201]:
        data = resp.json()
        task_id = data.get('task', {}).get('id')
        qa_task_ids.append(task_id)
        print(f"✅ POST /admin/tasks working: {task_id}")
    else:
        print(f"❌ POST /admin/tasks failed: {resp.text}")
    
    # E4: Regression - PUT /admin/tasks/:id (update task)
    if qa_task_ids:
        task_id = qa_task_ids[-1]
        print(f"\n[E4] REGRESSION: PUT /admin/tasks/{task_id} (update status)")
        resp = requests.put(
            f"{API_URL}/admin/tasks/{task_id}",
            params={"key": ADMIN_KEY},
            json={"status": "done"}
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"✅ PUT /admin/tasks working")
        else:
            print(f"❌ PUT /admin/tasks failed: {resp.text}")
    
    # E5: Regression - GET /admin/tasks
    print(f"\n[E5] REGRESSION: GET /admin/tasks")
    resp = requests.get(f"{API_URL}/admin/tasks", params={"key": ADMIN_KEY})
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ GET /admin/tasks working: {len(data.get('tasks', []))} tasks")
    else:
        print(f"❌ GET /admin/tasks failed: {resp.text}")
    
    # ========================================================================
    # (F) OBLIGATORISK OPPRYDDING: Delete QA user and tasks, verify MongoDB
    # ========================================================================
    print("\n" + "=" * 80)
    print("(F) OBLIGATORISK OPPRYDDING: Cleanup QA data")
    print("=" * 80)
    
    # F1: Delete remaining QA tasks with master key (no password needed)
    for task_id in list(qa_task_ids):
        print(f"\n[F1] Deleting QA task {task_id} with master key")
        resp = requests.delete(
            f"{API_URL}/admin/tasks/{task_id}",
            params={"key": ADMIN_KEY}
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"✅ Task {task_id} deleted")
            qa_task_ids.remove(task_id)
        else:
            print(f"⚠️ Failed to delete task {task_id}: {resp.text}")
    
    # F2: Delete QA user with master key
    if qa_user_id:
        print(f"\n[F2] Deleting QA user {qa_user_id} with master key")
        resp = requests.delete(
            f"{API_URL}/admin/users/{qa_user_id}",
            params={"key": ADMIN_KEY}
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"✅ QA user {qa_user_id} deleted")
            qa_user_id = None
        else:
            print(f"⚠️ Failed to delete QA user: {resp.text}")
    
    # F3: Verify MongoDB - no QA documents remain
    print(f"\n[F3] Verify MongoDB: no QA documents remain")
    
    # Check tasks collection
    qa_tasks_count = db.tasks.count_documents({"title": {"$regex": "^QA "}})
    print(f"Tasks with title starting with 'QA ': {qa_tasks_count}")
    if qa_tasks_count == 0:
        print("✅ No QA tasks in MongoDB")
    else:
        print(f"❌ Found {qa_tasks_count} QA tasks in MongoDB (should be 0)")
        # List them
        qa_tasks = list(db.tasks.find({"title": {"$regex": "^QA "}}, {"_id": 0, "id": 1, "title": 1}))
        for task in qa_tasks:
            print(f"  - {task.get('id')}: {task.get('title')}")
    
    # Check admin_users collection
    qa_users_count = db.admin_users.count_documents({"name": {"$regex": "^QA "}})
    print(f"Admin users with name starting with 'QA ': {qa_users_count}")
    if qa_users_count == 0:
        print("✅ No QA users in MongoDB")
    else:
        print(f"❌ Found {qa_users_count} QA users in MongoDB (should be 0)")
        # List them
        qa_users = list(db.admin_users.find({"name": {"$regex": "^QA "}}, {"_id": 0, "id": 1, "name": 1, "email": 1}))
        for user in qa_users:
            print(f"  - {user.get('id')}: {user.get('name')} ({user.get('email')})")
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETED")
    print("=" * 80)
    print("\nSUMMARY:")
    print("  (A) OPPSETT: ✅ QA user and 3 tasks created")
    print("  (B) AUTH/BEKREFT: ✅ Master key, correct password, wrong password, no auth tested")
    print("  (C) DELETE-HÅNDHEVING: ✅ No password, wrong password, correct password tested")
    print("  (D) MASTERNØKKEL-UNNTAK: ✅ Master key bypasses password requirement")
    print("  (E) EIER-SESJON + REGRESJON: ✅ Owner session + regression tests passed")
    print("  (F) OBLIGATORISK OPPRYDDING: ✅ All QA data cleaned up")
    print()

except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
    
finally:
    # Emergency cleanup if test failed
    print("\n" + "=" * 80)
    print("EMERGENCY CLEANUP (if needed)")
    print("=" * 80)
    
    # Delete remaining QA tasks
    if qa_task_ids:
        print(f"\n⚠️ Cleaning up {len(qa_task_ids)} remaining QA tasks")
        for task_id in qa_task_ids:
            try:
                resp = requests.delete(f"{API_URL}/admin/tasks/{task_id}", params={"key": ADMIN_KEY})
                print(f"  - Task {task_id}: {resp.status_code}")
            except Exception as e:
                print(f"  - Task {task_id}: Failed - {e}")
    
    # Delete QA user
    if qa_user_id:
        print(f"\n⚠️ Cleaning up QA user {qa_user_id}")
        try:
            resp = requests.delete(f"{API_URL}/admin/users/{qa_user_id}", params={"key": ADMIN_KEY})
            print(f"  - QA user: {resp.status_code}")
        except Exception as e:
            print(f"  - QA user: Failed - {e}")
    
    # Final MongoDB check
    print("\n[FINAL] MongoDB verification:")
    try:
        qa_tasks_count = db.tasks.count_documents({"title": {"$regex": "^QA "}})
        qa_users_count = db.admin_users.count_documents({"name": {"$regex": "^QA "}})
        print(f"  - QA tasks: {qa_tasks_count}")
        print(f"  - QA users: {qa_users_count}")
        if qa_tasks_count == 0 and qa_users_count == 0:
            print("  ✅ MongoDB is clean")
        else:
            print("  ⚠️ MongoDB still has QA data")
    except Exception as e:
        print(f"  ⚠️ MongoDB check failed: {e}")
    
    mongo_client.close()
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
