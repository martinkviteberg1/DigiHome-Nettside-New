#!/usr/bin/env python3
"""
Backend test for Signering Authorization Fix
Tests that users with 'dokumenter' module can send/cancel/remind signing on task documents they can see.
Previously required FULL admin access → now requires modulAuthed('dokumenter') + hentSynligSak.

CRITICAL SAFETY RULES:
- NEVER create a real Posten signing job with a valid PDF
- Use small .txt file so opprettSigneringsjobb fails safely with 400 (PDF/format error)
- NEVER touch/cancel/remind existing docs in sign_jobber or real documents/tasks
- QA users ONLY @example.com
- Delete ALL QA data at the end (users, task, file)
- SendGrid is LIVE - do not trigger emails to real addresses
"""

import requests
import json
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Owner credentials
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"

def log(msg):
    print(f"✓ {msg}")

def error(msg):
    print(f"✗ {msg}")

def main():
    print("\n" + "="*80)
    print("SIGNERING AUTHORIZATION FIX TEST")
    print("="*80 + "\n")
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Track QA data for cleanup
    qa_user_ids = []
    qa_task_id = None
    qa_file_id = None
    baseline_sign_jobber_count = db.sign_jobber.count_documents({})
    
    try:
        # ============================================================
        # TEST 1: Login as owner to get token
        # ============================================================
        print("\n[TEST 1] Login as owner")
        r = requests.post(f"{API_URL}/admin/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert r.status_code == 200, f"Owner login failed: {r.status_code} {r.text}"
        owner_token = r.json().get('token')
        assert owner_token, "No token in owner login response"
        log(f"Owner logged in successfully, token: {owner_token[:20]}...")
        
        # ============================================================
        # TEST 2: Create QA user WITH dokumenter module
        # ============================================================
        print("\n[TEST 2] Create QA user WITH dokumenter module")
        r = requests.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json={
            "name": "QA Sign User WITH Modul",
            "email": "qa-sign-with@example.com",
            "role": "bruker",
            "moduler": ["dokumenter"],
            "invite": False
        })
        assert r.status_code == 200, f"Create user WITH module failed: {r.status_code} {r.text}"
        qa_user_with_id = r.json().get('member', {}).get('id')
        assert qa_user_with_id, "No user id in response"
        qa_user_ids.append(qa_user_with_id)
        log(f"Created QA user WITH dokumenter module: {qa_user_with_id}")
        
        # Set password for QA user
        r = requests.put(f"{API_URL}/admin/users/{qa_user_with_id}?key={ADMIN_KEY}", json={
            "password": "QAtest1234"
        })
        assert r.status_code == 200, f"Set password failed: {r.status_code} {r.text}"
        log("Set password for QA user WITH module")
        
        # Login as QA user WITH module
        r = requests.post(f"{API_URL}/admin/auth/login", json={
            "email": "qa-sign-with@example.com",
            "password": "QAtest1234"
        })
        assert r.status_code == 200, f"QA user login failed: {r.status_code} {r.text}"
        qa_token_with = r.json().get('token')
        assert qa_token_with, "No token in QA user login response"
        log(f"QA user WITH module logged in, token: {qa_token_with[:20]}...")
        
        # ============================================================
        # TEST 3: Create QA user WITHOUT dokumenter module
        # ============================================================
        print("\n[TEST 3] Create QA user WITHOUT dokumenter module")
        r = requests.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json={
            "name": "QA Sign User WITHOUT Modul",
            "email": "qa-sign-without@example.com",
            "role": "bruker",
            "moduler": [],  # NO dokumenter module
            "invite": False
        })
        assert r.status_code == 200, f"Create user WITHOUT module failed: {r.status_code} {r.text}"
        qa_user_without_id = r.json().get('member', {}).get('id')
        assert qa_user_without_id, "No user id in response"
        qa_user_ids.append(qa_user_without_id)
        log(f"Created QA user WITHOUT dokumenter module: {qa_user_without_id}")
        
        # Set password for QA user WITHOUT module
        r = requests.put(f"{API_URL}/admin/users/{qa_user_without_id}?key={ADMIN_KEY}", json={
            "password": "QAtest1234"
        })
        assert r.status_code == 200, f"Set password failed: {r.status_code} {r.text}"
        log("Set password for QA user WITHOUT module")
        
        # Login as QA user WITHOUT module
        r = requests.post(f"{API_URL}/admin/auth/login", json={
            "email": "qa-sign-without@example.com",
            "password": "QAtest1234"
        })
        assert r.status_code == 200, f"QA user login failed: {r.status_code} {r.text}"
        qa_token_without = r.json().get('token')
        assert qa_token_without, "No token in QA user login response"
        log(f"QA user WITHOUT module logged in, token: {qa_token_without[:20]}...")
        
        # ============================================================
        # TEST 4: Create QA task visible to QA user WITH module
        # ============================================================
        print("\n[TEST 4] Create QA task visible to QA user WITH module")
        # For 'bruker' role, tasks are visible based on groups or if they are assigned/following
        # Let's assign the task to the QA user WITH module so they can see it
        r = requests.post(f"{API_URL}/admin/tasks?key={ADMIN_KEY}", json={
            "title": "QA Signering Test Sak",
            "assigneeId": qa_user_with_id,
            "notify": False
        })
        assert r.status_code == 200, f"Create task failed: {r.status_code} {r.text}"
        qa_task_id = r.json().get('task', {}).get('id')
        assert qa_task_id, "No task id in response"
        log(f"Created QA task: {qa_task_id}")
        
        # Verify QA user WITH module can see the task
        r = requests.get(f"{API_URL}/admin/tasks?key={qa_token_with}")
        assert r.status_code == 200, f"Get tasks failed: {r.status_code} {r.text}"
        tasks = r.json().get('tasks', [])
        task_ids = [t.get('id') for t in tasks]
        assert qa_task_id in task_ids, f"QA user WITH module cannot see the task. Task IDs: {task_ids}"
        log("QA user WITH module can see the task")
        
        # ============================================================
        # TEST 5: Upload small .txt file as attachment to task
        # ============================================================
        print("\n[TEST 5] Upload small .txt file as attachment")
        # Create a small text file content (base64 encoded)
        import base64
        txt_content = "This is a test file for signing authorization test. NOT a PDF."
        txt_base64 = base64.b64encode(txt_content.encode('utf-8')).decode('utf-8')
        
        # Generate upload ID
        import uuid
        upload_id = str(uuid.uuid4())
        
        # Upload via chunked endpoint (single chunk)
        r = requests.post(f"{API_URL}/admin/task-files/chunk?key={ADMIN_KEY}", json={
            "uploadId": upload_id,
            "taskId": qa_task_id,
            "index": 0,
            "total": 1,
            "data": txt_base64,
            "name": "qa-test-file.txt",
            "type": "text/plain",
            "actor": "TestAgent"
        })
        assert r.status_code == 200, f"Upload chunk failed: {r.status_code} {r.text}"
        upload_data = r.json()
        assert upload_data.get('ok') == True, f"Upload not ok: {upload_data}"
        assert upload_data.get('complete') == True, f"Upload not complete: {upload_data}"
        qa_file_id = upload_data.get('attachment', {}).get('id')
        assert qa_file_id, f"No file id in upload response: {upload_data}"
        log(f"Uploaded file with id: {qa_file_id}")
        
        # ============================================================
        # TEST 6: THE FIX - QA user WITH module can POST signering
        # ============================================================
        print("\n[TEST 6] THE FIX - QA user WITH module can POST signering (expect 400 PDF error, NOT 401)")
        r = requests.post(f"{API_URL}/admin/task-files/{qa_file_id}/signering?key={qa_token_with}", json={
            "tittel": "QA Signering Test",
            "signatarer": [
                {
                    "navn": "QA Test Signatar",
                    "epost": "qa-signatar@example.com"
                }
            ],
            "dagerFrist": 5
        })
        # We expect a 400 error because the file is .txt not PDF
        # But NOT 401 (which would mean auth failed)
        assert r.status_code != 401, f"Got 401 Unauthorized - auth gate FAILED! Response: {r.text}"
        if r.status_code == 400:
            log(f"Got expected 400 error (PDF/format error): {r.json().get('error', 'No error message')}")
            log("✅ AUTH GATE PASSED - user WITH dokumenter module can access signering endpoint")
        else:
            # Unexpected status code
            error(f"Unexpected status code {r.status_code}: {r.text}")
            raise AssertionError(f"Expected 400 or 401, got {r.status_code}")
        
        # Verify NO new doc appeared in sign_jobber
        current_sign_jobber_count = db.sign_jobber.count_documents({})
        assert current_sign_jobber_count == baseline_sign_jobber_count, \
            f"New sign job created! Baseline: {baseline_sign_jobber_count}, Current: {current_sign_jobber_count}"
        log("Verified NO new sign job was created (as expected with .txt file)")
        
        # ============================================================
        # TEST 7: Same call WITHOUT token → 401
        # ============================================================
        print("\n[TEST 7] Same call WITHOUT token → 401")
        r = requests.post(f"{API_URL}/admin/task-files/{qa_file_id}/signering", json={
            "tittel": "QA Signering Test",
            "signatarer": [{"navn": "QA Test", "epost": "qa@example.com"}],
            "dagerFrist": 5
        })
        assert r.status_code == 401, f"Expected 401 without token, got {r.status_code}: {r.text}"
        log("Got expected 401 without token")
        
        # ============================================================
        # TEST 8: QA user WITHOUT dokumenter module → 401
        # ============================================================
        print("\n[TEST 8] QA user WITHOUT dokumenter module → 401")
        r = requests.post(f"{API_URL}/admin/task-files/{qa_file_id}/signering?key={qa_token_without}", json={
            "tittel": "QA Signering Test",
            "signatarer": [{"navn": "QA Test", "epost": "qa@example.com"}],
            "dagerFrist": 5
        })
        assert r.status_code == 401, f"Expected 401 for user WITHOUT module, got {r.status_code}: {r.text}"
        log("Got expected 401 for user WITHOUT dokumenter module")
        
        # ============================================================
        # TEST 9: POST kanseller with unknown job id → 404 (NOT 401)
        # ============================================================
        print("\n[TEST 9] POST kanseller with unknown job id → 404 (NOT 401)")
        fake_job_id = "00000000-0000-0000-0000-000000000000"
        r = requests.post(f"{API_URL}/admin/signering/{fake_job_id}/kanseller?key={qa_token_with}")
        assert r.status_code == 404, f"Expected 404 for unknown job, got {r.status_code}: {r.text}"
        assert "Jobb ikke funnet" in r.json().get('error', ''), f"Expected 'Jobb ikke funnet' error, got: {r.text}"
        log("Got expected 404 'Jobb ikke funnet' for kanseller with unknown job id")
        
        # ============================================================
        # TEST 10: POST purring with unknown job id → 404 (NOT 401)
        # ============================================================
        print("\n[TEST 10] POST purring with unknown job id → 404 (NOT 401)")
        r = requests.post(f"{API_URL}/admin/signering/{fake_job_id}/purring?key={qa_token_with}")
        assert r.status_code == 404, f"Expected 404 for unknown job, got {r.status_code}: {r.text}"
        assert "Jobb ikke funnet" in r.json().get('error', ''), f"Expected 'Jobb ikke funnet' error, got: {r.text}"
        log("Got expected 404 'Jobb ikke funnet' for purring with unknown job id")
        
        # ============================================================
        # TEST 11: GET /admin/users as QA user → 200 {ok, members}
        # ============================================================
        print("\n[TEST 11] GET /admin/users as QA user → 200 {ok, members}")
        r = requests.get(f"{API_URL}/admin/users?key={qa_token_with}")
        assert r.status_code == 200, f"GET users failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get('ok') == True, f"Expected ok:true, got: {data}"
        assert 'members' in data, f"Expected 'members' in response, got: {data.keys()}"
        members = data.get('members', [])
        assert len(members) > 0, "Expected at least one member"
        log(f"GET /admin/users returned {len(members)} members (for signatory quick-pick chips)")
        
        # ============================================================
        # TEST 12: REGRESSION - Owner can still POST signering
        # ============================================================
        print("\n[TEST 12] REGRESSION - Owner can still POST signering (expect 400 format error, NOT 401)")
        r = requests.post(f"{API_URL}/admin/task-files/{qa_file_id}/signering?key={owner_token}", json={
            "tittel": "QA Owner Signering Test",
            "signatarer": [{"navn": "QA Test", "epost": "qa@example.com"}],
            "dagerFrist": 5
        })
        assert r.status_code != 401, f"Owner got 401 - regression! Response: {r.text}"
        if r.status_code == 400:
            log(f"Owner got expected 400 error (PDF/format error): {r.json().get('error', 'No error message')}")
            log("✅ REGRESSION PASSED - owner can still access signering endpoint")
        else:
            error(f"Unexpected status code {r.status_code}: {r.text}")
        
        # Verify still NO new doc in sign_jobber
        current_sign_jobber_count = db.sign_jobber.count_documents({})
        assert current_sign_jobber_count == baseline_sign_jobber_count, \
            f"New sign job created! Baseline: {baseline_sign_jobber_count}, Current: {current_sign_jobber_count}"
        log("Verified NO new sign job was created")
        
        print("\n" + "="*80)
        print("ALL TESTS PASSED ✅")
        print("="*80)
        
    except AssertionError as e:
        error(f"Test failed: {e}")
        raise
    except Exception as e:
        error(f"Unexpected error: {e}")
        raise
    finally:
        # ============================================================
        # MANDATORY CLEANUP
        # ============================================================
        print("\n" + "="*80)
        print("MANDATORY CLEANUP")
        print("="*80 + "\n")
        
        # Delete QA task (will cascade delete file)
        if qa_task_id:
            print(f"Deleting QA task: {qa_task_id}")
            r = requests.delete(f"{API_URL}/admin/tasks/{qa_task_id}?key={ADMIN_KEY}")
            if r.status_code == 200:
                log(f"Deleted QA task: {qa_task_id}")
            else:
                error(f"Failed to delete task: {r.status_code} {r.text}")
        
        # Delete QA users
        for user_id in qa_user_ids:
            print(f"Deleting QA user: {user_id}")
            r = requests.delete(f"{API_URL}/admin/users/{user_id}?key={ADMIN_KEY}")
            if r.status_code == 200:
                log(f"Deleted QA user: {user_id}")
            else:
                error(f"Failed to delete user: {r.status_code} {r.text}")
        
        # Verify cleanup in MongoDB
        print("\nVerifying cleanup in MongoDB...")
        
        # Verify no QA tasks
        qa_tasks = list(db.tasks.find({"title": {"$regex": "^QA Signering"}}))
        if len(qa_tasks) == 0:
            log("Verified 0 QA tasks remain")
        else:
            error(f"Found {len(qa_tasks)} QA tasks remaining!")
        
        # Verify no QA users
        qa_users = list(db.admin_users.find({"email": {"$regex": "^qa-sign-"}}))
        if len(qa_users) == 0:
            log("Verified 0 QA users remain")
        else:
            error(f"Found {len(qa_users)} QA users remaining!")
        
        # Verify no QA files
        qa_files = list(db.task_files.find({"name": "qa-test-file.txt"}))
        if len(qa_files) == 0:
            log("Verified 0 QA files remain")
        else:
            error(f"Found {len(qa_files)} QA files remaining!")
        
        # Verify sign_jobber count unchanged
        final_sign_jobber_count = db.sign_jobber.count_documents({})
        if final_sign_jobber_count == baseline_sign_jobber_count:
            log(f"Verified sign_jobber count unchanged: {baseline_sign_jobber_count}")
        else:
            error(f"sign_jobber count changed! Baseline: {baseline_sign_jobber_count}, Final: {final_sign_jobber_count}")
        
        print("\n" + "="*80)
        print("CLEANUP COMPLETE")
        print("="*80 + "\n")
        
        client.close()

if __name__ == "__main__":
    main()
