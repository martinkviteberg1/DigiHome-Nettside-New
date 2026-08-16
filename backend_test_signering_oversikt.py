#!/usr/bin/env python3
"""
Backend test for Signering-oversiktsmodul (Signing overview module)
Tests the NEW signering overview endpoints as requested in review_request.

CRITICAL SAFETY RULES:
1. There's a REAL active signing job (status I_GANG, job-id a89a6179..., with real signatar martin@kviteberg.no)
   - NEVER call POST /api/admin/signering/<id>/purring or /kanseller on THIS or any existing job
2. Do NOT create new signing jobs (POST /api/admin/task-files/:id/signering) - goes to Posten PRODUCTION API
3. Do NOT touch existing cases, leads or files
4. Create own QA data and DELETE ALL afterwards (mandatory cleanup)
5. Use only @example.com addresses if creating test users

Test plan:
A) GET /api/admin/signering/jobber - list all signing jobs
B) GET /api/admin/dokumenter - list frittstående documents
C) Frittstående opplasting (chunk with sentinel-taskId 'DOKUMENTER')
D) SIKKERHETSHERDING - non-admin should NOT reach frittstående documents
E) Purring/kanseller - ONLY error paths (no key → 401, unknown jobbId → 404)
F) REGRESJON - vanlig saksvedlegg still works
G) OBLIGATORISK OPPRYDDING
"""

import requests
import json
import base64
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_task_id = None
qa_file_id = None
qa_user_id = None
qa_user_token = None

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})
    return passed

def create_small_pdf():
    """Create a minimal valid PDF for testing"""
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(QA Test) Tj
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
<< /Size 5 /Root 1 0 R >>
startxref
410
%%EOF
"""
    return base64.b64encode(pdf_content).decode('utf-8')

def main():
    print("=" * 80)
    print("SIGNERING-OVERSIKTSMODUL BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("=" * 80)
    
    try:
        # Connect to MongoDB
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        print(f"✓ Connected to MongoDB: {DB_NAME}")
        
        # ============================================================
        # A) GET /api/admin/signering/jobber
        # ============================================================
        print("\n" + "=" * 80)
        print("(A) GET /api/admin/signering/jobber - LIST ALL SIGNING JOBS")
        print("=" * 80)
        
        # A1: Without key → 401
        print("\n(A1) GET /api/admin/signering/jobber without key → 401")
        resp = requests.get(f"{BASE_URL}/admin/signering/jobber")
        log_test("A1: GET jobber without key returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # A2: With admin key → 200 with jobs array
        print("\n(A2) GET /api/admin/signering/jobber with admin key → 200")
        resp = requests.get(f"{BASE_URL}/admin/signering/jobber", params={"key": ADMIN_KEY})
        log_test("A2: GET jobber with key returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            log_test("A2: Response has ok:true", data.get("ok") == True)
            log_test("A2: Response has jobber array", isinstance(data.get("jobber"), list))
            
            jobber = data.get("jobber", [])
            print(f"   Found {len(jobber)} signing jobs")
            
            # Verify at least 2 existing jobs (one I_GANG, one KANSELLERT as mentioned in review_request)
            log_test("A2: At least 2 existing jobs", len(jobber) >= 2, f"found {len(jobber)} jobs")
            
            # Verify structure of jobs
            if len(jobber) > 0:
                job = jobber[0]
                required_fields = ["id", "status", "tittel", "opprettet"]
                has_all_fields = all(field in job for field in required_fields)
                log_test("A2: Job has required fields (id/status/tittel/opprettet)", has_all_fields)
                
                # Verify signatarer array exists
                log_test("A2: Job has signatarer array", isinstance(job.get("signatarer"), list))
                
                # CRITICAL SECURITY: signatarer should NEVER contain sid or signerUrl in list response
                if isinstance(job.get("signatarer"), list) and len(job.get("signatarer", [])) > 0:
                    signatar = job["signatarer"][0]
                    has_sid = "sid" in signatar
                    has_signerUrl = "signerUrl" in signatar
                    log_test("A2: SECURITY - signatar does NOT contain 'sid'", not has_sid, f"sid present: {has_sid}")
                    log_test("A2: SECURITY - signatar does NOT contain 'signerUrl'", not has_signerUrl, f"signerUrl present: {has_signerUrl}")
                
                # Verify sakTittel field (null for frittstående, string for case-linked)
                has_sakTittel = "sakTittel" in job
                log_test("A2: Job has sakTittel field", has_sakTittel)
                
                # Verify fil object structure
                if "fil" in job and job["fil"] is not None:
                    fil = job["fil"]
                    fil_fields = ["id", "name", "type", "size"]
                    has_fil_fields = all(field in fil for field in fil_fields)
                    log_test("A2: fil object has required fields (id/name/type/size)", has_fil_fields)
                    
                    # CRITICAL: fil should NEVER contain 'data' field
                    has_data = "data" in fil
                    log_test("A2: SECURITY - fil does NOT contain 'data' field", not has_data, f"data present: {has_data}")
        
        # ============================================================
        # B) GET /api/admin/dokumenter
        # ============================================================
        print("\n" + "=" * 80)
        print("(B) GET /api/admin/dokumenter - LIST FRITTSTÅENDE DOCUMENTS")
        print("=" * 80)
        
        # B1: Without key → 401
        print("\n(B1) GET /api/admin/dokumenter without key → 401")
        resp = requests.get(f"{BASE_URL}/admin/dokumenter")
        log_test("B1: GET dokumenter without key returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # B2: With admin key → 200 with files array
        print("\n(B2) GET /api/admin/dokumenter with admin key → 200")
        resp = requests.get(f"{BASE_URL}/admin/dokumenter", params={"key": ADMIN_KEY})
        log_test("B2: GET dokumenter with key returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            log_test("B2: Response has ok:true", data.get("ok") == True)
            log_test("B2: Response has filer array", isinstance(data.get("filer"), list))
            
            filer = data.get("filer", [])
            print(f"   Found {len(filer)} frittstående documents")
            
            # Verify files do NOT contain data/logg/delinger fields
            if len(filer) > 0:
                fil = filer[0]
                has_data = "data" in fil
                has_logg = "logg" in fil
                has_delinger = "delinger" in fil
                log_test("B2: SECURITY - file does NOT contain 'data' field", not has_data)
                log_test("B2: SECURITY - file does NOT contain 'logg' field", not has_logg)
                log_test("B2: SECURITY - file does NOT contain 'delinger' field", not has_delinger)
        
        # ============================================================
        # C) Frittstående opplasting (chunk with sentinel-taskId 'DOKUMENTER')
        # ============================================================
        print("\n" + "=" * 80)
        print("(C) FRITTSTÅENDE OPPLASTING (chunk with taskId='DOKUMENTER')")
        print("=" * 80)
        
        # C1: As ADMIN - upload frittstående document
        print("\n(C1) POST /api/admin/task-files/chunk as ADMIN with taskId='DOKUMENTER'")
        import uuid
        upload_id = str(uuid.uuid4())
        pdf_data = create_small_pdf()
        
        chunk_payload = {
            "uploadId": upload_id,
            "taskId": "DOKUMENTER",
            "index": 0,
            "total": 1,
            "data": pdf_data,
            "name": "qa-frittstaende.pdf",
            "type": "application/pdf",
            "actor": "QA"
        }
        
        resp = requests.post(
            f"{BASE_URL}/admin/task-files/chunk",
            params={"key": ADMIN_KEY},
            json=chunk_payload
        )
        log_test("C1: POST chunk with taskId='DOKUMENTER' returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            log_test("C1: Response has ok:true", data.get("ok") == True)
            log_test("C1: Response has complete:true", data.get("complete") == True)
            log_test("C1: Response has attachment object", "attachment" in data)
            
            if "attachment" in data:
                global qa_file_id
                qa_file_id = data["attachment"].get("id")
                print(f"   Created frittstående file with id: {qa_file_id}")
        
        # C2: Verify file appears in GET /api/admin/dokumenter
        print("\n(C2) Verify file appears in GET /api/admin/dokumenter")
        resp = requests.get(f"{BASE_URL}/admin/dokumenter", params={"key": ADMIN_KEY})
        if resp.status_code == 200:
            data = resp.json()
            filer = data.get("filer", [])
            qa_file_found = any(f.get("id") == qa_file_id for f in filer)
            log_test("C2: QA file appears in dokumenter list", qa_file_found)
        
        # C3: GET /api/admin/task-files/:id/detaljer with admin key → 200
        print("\n(C3) GET /api/admin/task-files/:id/detaljer with admin key")
        if qa_file_id:
            resp = requests.get(
                f"{BASE_URL}/admin/task-files/{qa_file_id}/detaljer",
                params={"key": ADMIN_KEY}
            )
            log_test("C3: GET detaljer returns 200", resp.status_code == 200, f"status={resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                log_test("C3: Response has versjon field", "versjon" in data)
                log_test("C3: versjon=1", data.get("versjon") == 1)
                
                # CRITICAL: detaljer should NOT contain 'data' field
                has_data = "data" in data
                log_test("C3: SECURITY - detaljer does NOT contain 'data' field", not has_data)
        
        # C4: GET /api/admin/task-files/:id?inline=1 with admin key → 200 PDF bytes
        print("\n(C4) GET /api/admin/task-files/:id?inline=1 with admin key → PDF bytes")
        if qa_file_id:
            resp = requests.get(
                f"{BASE_URL}/admin/task-files/{qa_file_id}",
                params={"key": ADMIN_KEY, "inline": "1"}
            )
            log_test("C4: GET file with inline=1 returns 200", resp.status_code == 200, f"status={resp.status_code}")
            
            if resp.status_code == 200:
                is_pdf = resp.content.startswith(b'%PDF')
                log_test("C4: Response is PDF bytes", is_pdf)
        
        # ============================================================
        # D) SIKKERHETSHERDING - non-admin should NOT reach frittstående documents
        # ============================================================
        print("\n" + "=" * 80)
        print("(D) SIKKERHETSHERDING - NON-ADMIN SHOULD NOT ACCESS FRITTSTÅENDE")
        print("=" * 80)
        
        # D1: Create QA bruker (role:'bruker')
        print("\n(D1) Create QA bruker (role:'bruker')")
        user_payload = {
            "name": "QA Sign",
            "email": "qa-sign@example.com",
            "role": "bruker",
            "password": "QaSign12345!"
        }
        resp = requests.post(
            f"{BASE_URL}/admin/users",
            params={"key": ADMIN_KEY},
            json=user_payload
        )
        log_test("D1: POST /admin/users returns 200/201", resp.status_code in [200, 201], f"status={resp.status_code}")
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            global qa_user_id
            qa_user_id = data.get("user", {}).get("id") or data.get("id")
            print(f"   Created QA user with id: {qa_user_id}")
        
        # D2: Login as QA bruker
        print("\n(D2) Login as QA bruker")
        login_payload = {
            "email": "qa-sign@example.com",
            "password": "QaSign12345!"
        }
        resp = requests.post(f"{BASE_URL}/admin/auth/login", json=login_payload)
        log_test("D2: POST /admin/auth/login returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            global qa_user_token
            qa_user_token = data.get("token")
            print(f"   Got user token: {qa_user_token[:20]}...")
        
        # D3: With BRUKER token - POST chunk with taskId='DOKUMENTER' → 404 'Saken finnes ikke'
        print("\n(D3) POST chunk with taskId='DOKUMENTER' as BRUKER → 404")
        if qa_user_token:
            upload_id2 = str(uuid.uuid4())
            chunk_payload2 = {
                "uploadId": upload_id2,
                "taskId": "DOKUMENTER",
                "index": 0,
                "total": 1,
                "data": pdf_data,
                "name": "qa-bruker-attempt.pdf",
                "type": "application/pdf",
                "actor": "QA Bruker"
            }
            
            resp = requests.post(
                f"{BASE_URL}/admin/task-files/chunk",
                params={"key": qa_user_token},
                json=chunk_payload2
            )
            log_test("D3: POST chunk as bruker returns 404", resp.status_code == 404, f"status={resp.status_code}")
            
            if resp.status_code == 404:
                data = resp.json()
                error_msg = data.get("error", "").lower()
                has_correct_error = "saken" in error_msg or "finnes ikke" in error_msg
                log_test("D3: Error message mentions 'Saken finnes ikke'", has_correct_error, f"error='{data.get('error')}'")
        
        # D4: With BRUKER token - GET /api/admin/task-files/:id → 404
        print("\n(D4) GET /api/admin/task-files/:id as BRUKER → 404")
        if qa_user_token and qa_file_id:
            resp = requests.get(
                f"{BASE_URL}/admin/task-files/{qa_file_id}",
                params={"key": qa_user_token}
            )
            log_test("D4: GET file as bruker returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # D5: With BRUKER token - GET /api/admin/task-files/:id/detaljer → 404
        print("\n(D5) GET /api/admin/task-files/:id/detaljer as BRUKER → 404")
        if qa_user_token and qa_file_id:
            resp = requests.get(
                f"{BASE_URL}/admin/task-files/{qa_file_id}/detaljer",
                params={"key": qa_user_token}
            )
            log_test("D5: GET detaljer as bruker returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # D6: With BRUKER token - DELETE /api/admin/task-files/:id → 404
        print("\n(D6) DELETE /api/admin/task-files/:id as BRUKER → 404")
        if qa_user_token and qa_file_id:
            resp = requests.delete(
                f"{BASE_URL}/admin/task-files/{qa_file_id}",
                params={"key": qa_user_token}
            )
            log_test("D6: DELETE file as bruker returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # D7: With BRUKER token - POST deling → 404
        print("\n(D7) POST /api/admin/task-files/:id/deling as BRUKER → 404")
        if qa_user_token and qa_file_id:
            resp = requests.post(
                f"{BASE_URL}/admin/task-files/{qa_file_id}/deling",
                params={"key": qa_user_token},
                json={"dager": 7}
            )
            log_test("D7: POST deling as bruker returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # D8: With BRUKER token - GET /api/admin/signering/jobber → 401
        print("\n(D8) GET /api/admin/signering/jobber as BRUKER → 401")
        if qa_user_token:
            resp = requests.get(
                f"{BASE_URL}/admin/signering/jobber",
                params={"key": qa_user_token}
            )
            log_test("D8: GET jobber as bruker returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # D9: With BRUKER token - GET /api/admin/dokumenter → 401
        print("\n(D9) GET /api/admin/dokumenter as BRUKER → 401")
        if qa_user_token:
            resp = requests.get(
                f"{BASE_URL}/admin/dokumenter",
                params={"key": qa_user_token}
            )
            log_test("D9: GET dokumenter as bruker returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # ============================================================
        # E) Purring/kanseller - ONLY error paths
        # ============================================================
        print("\n" + "=" * 80)
        print("(E) PURRING/KANSELLER - ONLY ERROR PATHS (NO REAL CALLS)")
        print("=" * 80)
        
        # E1: POST purring with unknown jobbId → 404
        print("\n(E1) POST /api/admin/signering/finnes-ikke-123/purring with admin key → 404")
        resp = requests.post(
            f"{BASE_URL}/admin/signering/finnes-ikke-123/purring",
            params={"key": ADMIN_KEY}
        )
        log_test("E1: POST purring with unknown jobbId returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # E2: POST purring without key → 401
        print("\n(E2) POST /api/admin/signering/finnes-ikke-123/purring without key → 401")
        resp = requests.post(f"{BASE_URL}/admin/signering/finnes-ikke-123/purring")
        log_test("E2: POST purring without key returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # E3: POST kanseller with unknown jobbId → 404
        print("\n(E3) POST /api/admin/signering/finnes-ikke-123/kanseller with admin key → 404")
        resp = requests.post(
            f"{BASE_URL}/admin/signering/finnes-ikke-123/kanseller",
            params={"key": ADMIN_KEY}
        )
        log_test("E3: POST kanseller with unknown jobbId returns 404", resp.status_code == 404, f"status={resp.status_code}")
        
        # E4: POST kanseller without key → 401
        print("\n(E4) POST /api/admin/signering/finnes-ikke-123/kanseller without key → 401")
        resp = requests.post(f"{BASE_URL}/admin/signering/finnes-ikke-123/kanseller")
        log_test("E4: POST kanseller without key returns 401", resp.status_code == 401, f"status={resp.status_code}")
        
        # ============================================================
        # F) REGRESJON - vanlig saksvedlegg still works
        # ============================================================
        print("\n" + "=" * 80)
        print("(F) REGRESJON - VANLIG SAKSVEDLEGG STILL WORKS")
        print("=" * 80)
        
        # F1: Create QA task
        print("\n(F1) Create QA task")
        task_payload = {
            "title": "QA Signering Regresjon",
            "notify": False
        }
        resp = requests.post(
            f"{BASE_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            json=task_payload
        )
        log_test("F1: POST /admin/tasks returns 200/201", resp.status_code in [200, 201], f"status={resp.status_code}")
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            global qa_task_id
            qa_task_id = data.get("task", {}).get("id") or data.get("id")
            print(f"   Created QA task with id: {qa_task_id}")
        
        # F2: Upload attachment to task
        print("\n(F2) Upload attachment to QA task")
        if qa_task_id:
            upload_id3 = str(uuid.uuid4())
            chunk_payload3 = {
                "uploadId": upload_id3,
                "taskId": qa_task_id,
                "index": 0,
                "total": 1,
                "data": pdf_data,
                "name": "qa-saksvedlegg.pdf",
                "type": "application/pdf",
                "actor": "QA"
            }
            
            resp = requests.post(
                f"{BASE_URL}/admin/task-files/chunk",
                params={"key": ADMIN_KEY},
                json=chunk_payload3
            )
            log_test("F2: POST chunk to task returns 200", resp.status_code == 200, f"status={resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                log_test("F2: Response has complete:true", data.get("complete") == True)
                log_test("F2: task.attachments updated", "task" in data and "attachments" in data.get("task", {}))
        
        # F3: GET /api/admin/task-files/:id/detaljer works
        print("\n(F3) GET /api/admin/task-files/:id/detaljer for task attachment")
        if qa_task_id:
            # Get task to find attachment id
            resp = requests.get(f"{BASE_URL}/admin/tasks", params={"key": ADMIN_KEY})
            if resp.status_code == 200:
                data = resp.json()
                tasks = data.get("tasks", [])
                qa_task = next((t for t in tasks if t.get("id") == qa_task_id), None)
                if qa_task and qa_task.get("attachments"):
                    attachment_id = qa_task["attachments"][0].get("id")
                    
                    resp = requests.get(
                        f"{BASE_URL}/admin/task-files/{attachment_id}/detaljer",
                        params={"key": ADMIN_KEY}
                    )
                    log_test("F3: GET detaljer for task attachment returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        # F4: Delete task (cascade removes task_files)
        print("\n(F4) Delete QA task (cascade removes task_files)")
        if qa_task_id:
            resp = requests.delete(
                f"{BASE_URL}/admin/tasks/{qa_task_id}",
                params={"key": ADMIN_KEY}
            )
            log_test("F4: DELETE task returns 200", resp.status_code == 200, f"status={resp.status_code}")
            
            # Verify cascade delete in MongoDB
            time.sleep(1)  # Give MongoDB a moment
            task_files_count = db.task_files.count_documents({"taskId": qa_task_id})
            log_test("F4: Cascade delete - task_files removed", task_files_count == 0, f"found {task_files_count} task_files")
        
        # ============================================================
        # G) OBLIGATORISK OPPRYDDING
        # ============================================================
        print("\n" + "=" * 80)
        print("(G) OBLIGATORISK OPPRYDDING (MANDATORY CLEANUP)")
        print("=" * 80)
        
        # G1: Delete frittstående QA file
        print("\n(G1) Delete frittstående QA file")
        if qa_file_id:
            resp = requests.delete(
                f"{BASE_URL}/admin/task-files/{qa_file_id}",
                params={"key": ADMIN_KEY}
            )
            log_test("G1: DELETE frittstående file returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        # G2: Delete QA user
        print("\n(G2) Delete QA user")
        if qa_user_id:
            resp = requests.delete(
                f"{BASE_URL}/admin/users/{qa_user_id}",
                params={"key": ADMIN_KEY}
            )
            log_test("G2: DELETE user returns 200", resp.status_code == 200, f"status={resp.status_code}")
        
        # G3: Verify cleanup in MongoDB
        print("\n(G3) Verify cleanup in MongoDB")
        
        # Verify 0 QA documents with taskId='DOKUMENTER' and name starting with 'qa-'
        qa_docs_count = db.task_files.count_documents({
            "taskId": "DOKUMENTER",
            "name": {"$regex": "^qa-"}
        })
        log_test("G3: 0 QA documents with taskId='DOKUMENTER'", qa_docs_count == 0, f"found {qa_docs_count} docs")
        
        # Verify QA user deleted
        qa_user_count = db.admin_users.count_documents({"email": "qa-sign@example.com"})
        log_test("G3: QA user deleted", qa_user_count == 0, f"found {qa_user_count} users")
        
        # G4: Verify existing signing jobs are untouched
        print("\n(G4) Verify existing signing jobs are untouched")
        resp = requests.get(f"{BASE_URL}/admin/signering/jobber", params={"key": ADMIN_KEY})
        if resp.status_code == 200:
            data = resp.json()
            jobber = data.get("jobber", [])
            
            # Look for the mentioned jobs (one I_GANG, one KANSELLERT)
            i_gang_jobs = [j for j in jobber if j.get("status") == "I_GANG"]
            kansellert_jobs = [j for j in jobber if j.get("status") == "KANSELLERT"]
            
            log_test("G4: At least 1 job with status I_GANG exists", len(i_gang_jobs) >= 1, f"found {len(i_gang_jobs)}")
            log_test("G4: At least 1 job with status KANSELLERT exists", len(kansellert_jobs) >= 1, f"found {len(kansellert_jobs)}")
            
            print(f"   Verified: {len(i_gang_jobs)} I_GANG jobs, {len(kansellert_jobs)} KANSELLERT jobs")
        
        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(test_results)
        passed_tests = sum(1 for t in test_results if t["passed"])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\nFailed tests:")
            for t in test_results:
                if not t["passed"]:
                    print(f"  ❌ {t['test']}: {t['details']}")
        
        print("\n" + "=" * 80)
        if failed_tests == 0:
            print("✅ ALL TESTS PASSED")
        else:
            print(f"❌ {failed_tests} TEST(S) FAILED")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()

if __name__ == "__main__":
    main()
