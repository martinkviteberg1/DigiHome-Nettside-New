#!/usr/bin/env python3
"""
Backend test for Signering fixes (production bug: 0/3 status despite 2 signatures at Posten)

FIXES TESTED:
1. POST /api/signering-status-token (PUBLIC, no auth, rate-limited 10/min)
2. Real Posten integration: name as signer-identifier (postenId='Navn · suffiks')
3. GET /api/admin/signering/jobber (masked signerUrl/sid)
4. Regression tests

BASE URL: https://saker-hub.preview.emergentagent.com/api
AUTH: martin@kviteberg.no / Pyramiden2025##
MongoDB: mongodb://localhost:27017, DB: your_database_name
"""

import requests
import sys
import time
from pymongo import MongoClient
import os
from datetime import datetime
import io

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_EMAIL = "martin@kviteberg.no"
ADMIN_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test counters
tests_passed = 0
tests_failed = 0

def log_test(test_name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {test_name}: PASSED {details}")
    else:
        tests_failed += 1
        print(f"❌ {test_name}: FAILED {details}")

def get_admin_token():
    """Login as admin and get token"""
    try:
        response = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print(f"✅ Admin login successful, token: {token[:20]}...")
            return token
        else:
            print(f"❌ Admin login failed: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"❌ Admin login error: {e}")
        return None

def create_minimal_pdf():
    """Create a minimal valid PDF file"""
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(QAFIX Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF
"""
    return pdf_content

def main():
    print("=" * 80)
    print("SIGNERING FIXES BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print()

    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Cannot proceed without admin token")
        sys.exit(1)

    # Connect to MongoDB
    try:
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        print(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        sys.exit(1)

    print()
    print("=" * 80)
    print("INITIAL CLEANUP: Removing any leftover QAFIX data from previous runs")
    print("=" * 80)
    
    try:
        # Clean up any leftover QAFIX data from previous test runs
        qafix_jobs_before = db.signering_jobber.delete_many({"signatarer.navn": {"$regex": "QAFIX", "$options": "i"}})
        qafix_files_before = db.task_files.delete_many({"name": {"$regex": "qafix", "$options": "i"}})
        print(f"  Cleaned up {qafix_jobs_before.deleted_count} QAFIX jobs and {qafix_files_before.deleted_count} QAFIX files from previous runs")
    except Exception as e:
        print(f"  ⚠️ Initial cleanup warning: {e}")
    
    print()
    print("=" * 80)
    print("(A) POST /api/signering-status-token (PUBLIC, no auth)")
    print("=" * 80)

    # A1: Valid token format
    try:
        response = requests.post(
            f"{BASE_URL}/signering-status-token",
            json={"token": "AbC123-xyz~test"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("oppdatert") == False:
                log_test("A1: Valid token format", True, f"→ 200 {data}")
            else:
                log_test("A1: Valid token format", False, f"→ unexpected response: {data}")
        else:
            log_test("A1: Valid token format", False, f"→ {response.status_code} {response.text}")
    except Exception as e:
        log_test("A1: Valid token format", False, f"→ exception: {e}")

    time.sleep(0.5)

    # A2: XSS attempt (should NOT crash, return 200)
    try:
        response = requests.post(
            f"{BASE_URL}/signering-status-token",
            json={"token": "<script>alert(1)</script>"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("oppdatert") == False:
                log_test("A2: XSS token (no crash)", True, f"→ 200 {data} (NEVER 500, no leakage)")
            else:
                log_test("A2: XSS token (no crash)", False, f"→ unexpected response: {data}")
        else:
            log_test("A2: XSS token (no crash)", False, f"→ {response.status_code} (should be 200, not 500)")
    except Exception as e:
        log_test("A2: XSS token (no crash)", False, f"→ exception: {e}")

    time.sleep(0.5)

    # A3: Empty body
    try:
        response = requests.post(
            f"{BASE_URL}/signering-status-token",
            json={},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("oppdatert") == False:
                log_test("A3: Empty body", True, f"→ 200 {data}")
            else:
                log_test("A3: Empty body", False, f"→ unexpected response: {data}")
        else:
            log_test("A3: Empty body", False, f"→ {response.status_code} {response.text}")
    except Exception as e:
        log_test("A3: Empty body", False, f"→ exception: {e}")

    time.sleep(0.5)

    # A4: Non-existent job hint
    try:
        response = requests.post(
            f"{BASE_URL}/signering-status-token",
            json={"token": "abc", "jobb": "ikke-eksisterende-id"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True and data.get("oppdatert") == False:
                log_test("A4: Non-existent job hint", True, f"→ 200 {data}")
            else:
                log_test("A4: Non-existent job hint", False, f"→ unexpected response: {data}")
        else:
            log_test("A4: Non-existent job hint", False, f"→ {response.status_code} {response.text}")
    except Exception as e:
        log_test("A4: Non-existent job hint", False, f"→ exception: {e}")

    print()
    print("=" * 80)
    print("(B) REAL POSTEN INTEGRATION (creates real job at Posten, will be cancelled)")
    print("=" * 80)

    # B1: Upload test PDF to Dokumenter hub using chunked upload
    print("\n[B1] Uploading test PDF to Dokumenter hub...")
    
    try:
        import base64
        import uuid
        
        # Create PDF and encode to base64
        pdf_content = create_minimal_pdf()
        pdf_b64 = base64.b64encode(pdf_content).decode('utf-8')
        
        # Split into chunks (max 1MB per chunk, but our PDF is tiny)
        chunk_size = 1000000  # 1MB
        chunks = []
        for i in range(0, len(pdf_b64), chunk_size):
            chunks.append(pdf_b64[i:i+chunk_size])
        
        upload_id = str(uuid.uuid4())
        total_chunks = len(chunks)
        
        print(f"  Upload ID: {upload_id}")
        print(f"  Total chunks: {total_chunks}")
        print(f"  PDF size: {len(pdf_content)} bytes")
        
        # Upload chunks
        file_id = None
        for index, chunk_data in enumerate(chunks):
            response = requests.post(
                f"{BASE_URL}/admin/task-files/chunk?key={admin_token}",
                json={
                    "uploadId": upload_id,
                    "taskId": "DOKUMENTER",
                    "index": index,
                    "total": total_chunks,
                    "data": chunk_data,
                    "name": "qafix-signering-test.pdf",
                    "type": "application/pdf"
                },
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"❌ Failed to upload chunk {index}: {response.status_code} {response.text}")
                log_test("B1: Upload test PDF", False, f"→ chunk {index} failed: {response.status_code}")
                file_id = None
                break
            
            data = response.json()
            if data.get("complete"):
                # File ID is in attachment.id, not file.id
                file_id = data.get("attachment", {}).get("id")
                if file_id:
                    print(f"✅ Uploaded test PDF, file_id: {file_id}")
                    log_test("B1: Upload test PDF", True, f"→ file_id: {file_id}")
                else:
                    print(f"❌ Upload complete but no file_id in response: {data}")
                    log_test("B1: Upload test PDF", False, f"→ no file_id in response")
                break
        
        if file_id is None and response.status_code == 200:
            # All chunks uploaded but no file_id returned
            print(f"❌ Chunks uploaded but upload not complete. Last response: {data}")
            log_test("B1: Upload test PDF", False, "→ chunks uploaded but no file_id returned")
    except Exception as e:
        print(f"❌ B1 exception: {e}")
        import traceback
        traceback.print_exc()
        log_test("B1: Upload test PDF", False, f"→ exception: {e}")
        file_id = None

    # B2: Create signing job with real Posten integration
    if file_id:
        print("\n[B2] Creating signing job with Posten (REAL API call)...")
        try:
            response = requests.post(
                f"{BASE_URL}/admin/task-files/{file_id}/signering?key={admin_token}",
                json={
                    "tittel": "QAFIX signeringstest",
                    "melding": "test",
                    "signatarer": [
                        {
                            "navn": "QAFIX Testperson",
                            "epost": "qafix-sign@example.com"
                        }
                    ],
                    "dagerFrist": 2
                },
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") == True and data.get("jobb"):
                    jobb_id = data["jobb"].get("id")
                    print(f"✅ Created signing job at Posten, jobb_id: {jobb_id}")
                    log_test("B2: Create signing job", True, f"→ jobb_id: {jobb_id}")
                else:
                    print(f"❌ Unexpected response: {data}")
                    log_test("B2: Create signing job", False, f"→ unexpected response: {data}")
                    jobb_id = None
            else:
                print(f"❌ Failed to create signing job: {response.status_code} {response.text}")
                log_test("B2: Create signing job", False, f"→ {response.status_code}")
                jobb_id = None
        except Exception as e:
            print(f"❌ B2 exception: {e}")
            log_test("B2: Create signing job", False, f"→ exception: {e}")
            jobb_id = None
    else:
        jobb_id = None
        log_test("B2: Create signing job", False, "→ no file_id from B1")

    # B3: Verify in MongoDB
    if jobb_id:
        print("\n[B3] Verifying job in MongoDB...")
        try:
            job_doc = db.signering_jobber.find_one({"id": jobb_id})
            if job_doc:
                flyt = job_doc.get("flyt")
                status = job_doc.get("status")
                signatarer = job_doc.get("signatarer", [])
                
                checks = []
                checks.append(("flyt='direkte'", flyt == "direkte"))
                checks.append(("status='I_GANG'", status == "I_GANG"))
                
                if signatarer and len(signatarer) > 0:
                    posten_id = signatarer[0].get("postenId", "")
                    signer_url = signatarer[0].get("signerUrl")
                    
                    checks.append((f"postenId starts with 'QAFIX Testperson · '", posten_id.startswith("QAFIX Testperson · ")))
                    checks.append(("signerUrl is set (not null/undefined)", signer_url is not None and signer_url != ""))
                    
                    print(f"  flyt: {flyt}")
                    print(f"  status: {status}")
                    print(f"  signatarer[0].postenId: {posten_id}")
                    print(f"  signatarer[0].signerUrl: {'SET' if signer_url else 'NULL/MISSING'}")
                else:
                    checks.append(("signatarer array has items", False))
                
                all_passed = all(check[1] for check in checks)
                details = ", ".join([f"{check[0]}: {'✓' if check[1] else '✗'}" for check in checks])
                
                if all_passed:
                    log_test("B3: MongoDB verification", True, f"→ {details}")
                else:
                    log_test("B3: MongoDB verification", False, f"→ {details}")
            else:
                log_test("B3: MongoDB verification", False, f"→ job not found in signering_jobber")
        except Exception as e:
            print(f"❌ B3 exception: {e}")
            log_test("B3: MongoDB verification", False, f"→ exception: {e}")
    else:
        log_test("B3: MongoDB verification", False, "→ no jobb_id from B2")

    # B4: Cancel the job
    if jobb_id:
        print("\n[B4] Cancelling the signing job...")
        try:
            response = requests.post(
                f"{BASE_URL}/admin/signering/{jobb_id}/kanseller?key={admin_token}",
                json={},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Cancelled job: {data}")
                
                # Verify status in MongoDB
                time.sleep(1)
                job_doc = db.signering_jobber.find_one({"id": jobb_id})
                if job_doc and job_doc.get("status") == "KANSELLERT":
                    log_test("B4: Cancel job", True, f"→ status='KANSELLERT' in MongoDB")
                else:
                    log_test("B4: Cancel job", False, f"→ status not KANSELLERT in MongoDB: {job_doc.get('status') if job_doc else 'not found'}")
            else:
                print(f"❌ Failed to cancel job: {response.status_code} {response.text}")
                log_test("B4: Cancel job", False, f"→ {response.status_code}")
        except Exception as e:
            print(f"❌ B4 exception: {e}")
            log_test("B4: Cancel job", False, f"→ exception: {e}")
    else:
        log_test("B4: Cancel job", False, "→ no jobb_id from B2")

    # B5: Cleanup
    print("\n[B5] Cleanup: deleting QAFIX job and test PDF...")
    cleanup_success = True
    
    # Delete job from signering_jobber
    if jobb_id:
        try:
            result = db.signering_jobber.delete_one({"id": jobb_id})
            print(f"  Deleted {result.deleted_count} job from signering_jobber (id: {jobb_id})")
        except Exception as e:
            print(f"  ❌ Failed to delete job: {e}")
            cleanup_success = False
    
    # Delete file from task_files
    if file_id:
        try:
            # First check what we're deleting
            file_doc = db.task_files.find_one({"id": file_id}, {"_id": 0, "id": 1, "name": 1})
            print(f"  Deleting file: {file_doc}")
            result = db.task_files.delete_one({"id": file_id})
            print(f"  Deleted {result.deleted_count} file from task_files (id: {file_id})")
        except Exception as e:
            print(f"  ❌ Failed to delete file: {e}")
            cleanup_success = False
    
    # Note: No DOKUMENTER task to delete since we use taskId='DOKUMENTER' sentinel
    
    # Verify no QAFIX remains
    try:
        # Small delay to ensure deletions are complete
        time.sleep(0.5)
        
        # Check both by name pattern and by specific IDs
        qafix_jobs = db.signering_jobber.count_documents({"signatarer.navn": {"$regex": "QAFIX", "$options": "i"}})
        qafix_files_by_name = db.task_files.count_documents({"name": {"$regex": "qafix", "$options": "i"}})
        
        # Also check if our specific IDs still exist
        if jobb_id:
            job_still_exists = db.signering_jobber.count_documents({"id": jobb_id})
            print(f"  Job {jobb_id} still exists: {job_still_exists}")
        if file_id:
            file_still_exists = db.task_files.count_documents({"id": file_id})
            print(f"  File {file_id} still exists: {file_still_exists}")
        
        print(f"  Verification: {qafix_jobs} QAFIX jobs (by name), {qafix_files_by_name} QAFIX files (by name)")
        
        if qafix_jobs == 0 and qafix_files_by_name == 0:
            log_test("B5: Cleanup", True, f"→ 0 QAFIX remains")
        else:
            # List remaining QAFIX files for debugging
            remaining_files = list(db.task_files.find({"name": {"$regex": "qafix", "$options": "i"}}, {"_id": 0, "id": 1, "name": 1}))
            print(f"  Remaining QAFIX files: {remaining_files}")
            log_test("B5: Cleanup", False, f"→ {qafix_jobs} jobs, {qafix_files_by_name} files remain")
    except Exception as e:
        print(f"  ❌ Verification failed: {e}")
        log_test("B5: Cleanup", False, f"→ verification exception: {e}")

    print()
    print("=" * 80)
    print("(C) GET /api/admin/signering/jobber (masked signerUrl/sid)")
    print("=" * 80)

    try:
        response = requests.get(
            f"{BASE_URL}/admin/signering/jobber?key={admin_token}",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            jobber = data.get("jobber", [])
            print(f"  Found {len(jobber)} signing jobs")
            
            # Check that signerUrl and sid are NOT present in signatarer
            has_leak = False
            for job in jobber:
                signatarer = job.get("signatarer", [])
                for sig in signatarer:
                    if "signerUrl" in sig or "sid" in sig:
                        has_leak = True
                        print(f"  ⚠️ LEAK: job {job.get('id')} has signerUrl or sid in signatarer")
                        break
                if has_leak:
                    break
            
            if not has_leak:
                log_test("C: GET jobber (masked)", True, f"→ 200, signerUrl/sid NOT present in signatarer")
            else:
                log_test("C: GET jobber (masked)", False, f"→ signerUrl or sid found in response (should be masked)")
        else:
            log_test("C: GET jobber (masked)", False, f"→ {response.status_code} {response.text}")
    except Exception as e:
        log_test("C: GET jobber (masked)", False, f"→ exception: {e}")

    print()
    print("=" * 80)
    print("(D) REGRESSION TESTS")
    print("=" * 80)

    # D1: GET /admin/signering/mine with auth
    try:
        response = requests.get(
            f"{BASE_URL}/admin/signering/mine?key={admin_token}",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == True:
                log_test("D1: GET /admin/signering/mine", True, f"→ 200 {data}")
            else:
                log_test("D1: GET /admin/signering/mine", False, f"→ unexpected response: {data}")
        else:
            log_test("D1: GET /admin/signering/mine", False, f"→ {response.status_code} {response.text}")
    except Exception as e:
        log_test("D1: GET /admin/signering/mine", False, f"→ exception: {e}")

    # D2: GET /admin/signering/jobber without auth (should be 401)
    try:
        response = requests.get(
            f"{BASE_URL}/admin/signering/jobber",
            timeout=10
        )
        if response.status_code == 401:
            log_test("D2: GET jobber without auth", True, f"→ 401 (correct)")
        else:
            log_test("D2: GET jobber without auth", False, f"→ {response.status_code} (should be 401)")
    except Exception as e:
        log_test("D2: GET jobber without auth", False, f"→ exception: {e}")

    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"Total: {tests_passed + tests_failed}")
    
    if tests_failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {tests_failed} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
