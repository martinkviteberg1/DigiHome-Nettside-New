#!/usr/bin/env python3
"""
Backend test for NYE signering endpoints (GET /admin/signering/mine + poll health in /jobber).
CRITICAL SAFETY RULES:
- NEVER create real Posten signing jobs (NEVER call POST /admin/task-files/:id/signering)
- NEVER delete/modify the 3 EXISTING signering_jobber docs (1 FULLFORT, 2 KANSELLERT)
- Synthetic test jobs inserted DIRECTLY in MongoDB with id prefix 'qafix-'
- QA users ONLY @example.com (SendGrid is live, @example.com doesn't send)
- DO NOT call POST /admin/signering/poll or /cron/signering (polls real Posten API)
"""

import requests
import sys
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def main():
    print("=" * 80)
    print("BACKEND TEST: NYE SIGNERING ENDPOINTS")
    print("=" * 80)
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # ===== BASELINE VERIFICATION =====
        print("\n[BASELINE] Verifying existing signering_jobber count...")
        baseline_count = db.signering_jobber.count_documents({})
        print(f"✓ Baseline signering_jobber count: {baseline_count}")
        if baseline_count != 3:
            print(f"⚠️  WARNING: Expected 3 existing jobs, found {baseline_count}")
        
        # Get existing job IDs to verify they're not touched
        existing_job_ids = [doc['id'] for doc in db.signering_jobber.find({}, {'id': 1, '_id': 0})]
        print(f"✓ Existing job IDs: {existing_job_ids}")
        
        # ===== TEST A: GET /admin/signering/mine WITHOUT TOKEN → 401 =====
        print("\n[A] Testing GET /admin/signering/mine without token...")
        try:
            resp = requests.get(f"{BASE_URL}/admin/signering/mine")
            if resp.status_code == 401:
                print("✅ A: Returns 401 without token")
            else:
                print(f"❌ A: Expected 401, got {resp.status_code}")
                return False
        except Exception as e:
            print(f"❌ A: Request failed: {e}")
            return False
        
        # ===== SETUP: CREATE QA USER =====
        print("\n[SETUP] Creating QA user...")
        qa_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        qa_email = f"qa-sign-{qa_timestamp}@example.com"
        qa_user_id = str(uuid.uuid4())
        qa_password = "QAtest1234"
        
        # Create user via POST /admin/users
        user_payload = {
            "name": f"QA Sign Person {qa_timestamp}",
            "email": qa_email,
            "role": "bruker",
            "invite": False
        }
        resp = requests.post(f"{BASE_URL}/admin/users?key={ADMIN_KEY}", json=user_payload)
        if resp.status_code not in [200, 201]:
            print(f"❌ SETUP: Failed to create user: {resp.status_code} {resp.text}")
            return False
        
        qa_user_id = resp.json().get('member', {}).get('id') or resp.json().get('user', {}).get('id')
        print(f"✓ Created QA user: {qa_email} (id: {qa_user_id})")
        
        # Set password
        pwd_payload = {"password": qa_password}
        resp = requests.put(f"{BASE_URL}/admin/users/{qa_user_id}?key={ADMIN_KEY}", json=pwd_payload)
        if resp.status_code != 200:
            print(f"❌ SETUP: Failed to set password: {resp.status_code}")
            return False
        print(f"✓ Set password for QA user")
        
        # Login as QA user
        login_payload = {"email": qa_email, "password": qa_password}
        resp = requests.post(f"{BASE_URL}/admin/auth/login", json=login_payload)
        if resp.status_code != 200:
            print(f"❌ SETUP: Failed to login: {resp.status_code} {resp.text}")
            return False
        
        qa_token = resp.json().get('token')
        if not qa_token:
            print(f"❌ SETUP: No token in login response")
            return False
        print(f"✓ Logged in as QA user, got token")
        
        # ===== TEST B: HAPPY PATH - JOB WITH QA USER VENTER (paaTur=true) =====
        print("\n[B] Testing job with QA user VENTER (paaTur=true)...")
        now_iso = datetime.now(timezone.utc).isoformat()
        
        job_b = {
            "id": "qafix-mine-1",
            "flyt": "direkte",
            "filId": "qafix-fil-1",
            "taskId": "DOKUMENTER",
            "filNavn": "QA Test Document.pdf",
            "postenJobId": "qafix-posten-1",
            "status": "I_GANG",
            "tittel": "QAFIX Test A",
            "melding": "Vennligst signer dette dokumentet",
            "av": "Test Agent",
            "dagerFrist": 10,
            "signatarer": [
                {
                    "navn": "Annen Person",
                    "epost": "annen@example.com",
                    "sid": "sid-annen",
                    "status": "SIGNERT",
                    "rekkefolge": 0,
                    "signertAt": now_iso
                },
                {
                    "navn": "QA Sign Person",
                    "epost": qa_email,
                    "sid": "sid-qa-1",
                    "status": "VENTER",
                    "rekkefolge": 1
                }
            ],
            "opprettet": now_iso,
            "oppdatert": now_iso
        }
        
        db.signering_jobber.insert_one(job_b)
        print(f"✓ Inserted job qafix-mine-1 into MongoDB")
        
        # GET mine as QA user
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ B: GET mine failed: {resp.status_code} {resp.text}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ B: Response not ok: {data}")
            return False
        
        ventende = data.get('ventende', [])
        if len(ventende) != 1:
            print(f"❌ B: Expected 1 ventende, got {len(ventende)}")
            return False
        
        v = ventende[0]
        checks = [
            (v.get('jobbId') == 'qafix-mine-1', f"jobbId: {v.get('jobbId')}"),
            (v.get('tittel') == 'QAFIX Test A', f"tittel: {v.get('tittel')}"),
            (v.get('filNavn') == 'QA Test Document.pdf', f"filNavn: {v.get('filNavn')}"),
            (v.get('paaTur') == True, f"paaTur: {v.get('paaTur')}"),
            (v.get('lenke') == '/signering/dokument/qafix-mine-1/sid-qa-1', f"lenke: {v.get('lenke')}"),
            (v.get('signert') == 1, f"signert: {v.get('signert')}"),
            (v.get('antall') == 2, f"antall: {v.get('antall')}"),
            ('sid' not in str(v) or 'sid-qa-1' not in str(v).replace('/signering/dokument/qafix-mine-1/sid-qa-1', ''), "sid not leaked outside lenke")
        ]
        
        all_ok = True
        for check, desc in checks:
            if not check:
                print(f"❌ B: Check failed: {desc}")
                all_ok = False
        
        if all_ok:
            print("✅ B: Job with QA user VENTER (paaTur=true) working correctly")
        else:
            return False
        
        # ===== TEST C: SEQUENTIAL - QA USER NOT ON TURN (paaTur=false) =====
        print("\n[C] Testing sequential job where QA user is NOT on turn (paaTur=false)...")
        
        job_c = {
            "id": "qafix-mine-2",
            "flyt": "direkte",
            "filId": "qafix-fil-2",
            "taskId": "DOKUMENTER",
            "filNavn": "QA Sequential.pdf",
            "postenJobId": "qafix-posten-2",
            "status": "I_GANG",
            "tittel": "QAFIX Sequential Test",
            "melding": "Sequential signing",
            "av": "Test Agent",
            "dagerFrist": 10,
            "signatarer": [
                {
                    "navn": "First Person",
                    "epost": "first@example.com",
                    "sid": "sid-first",
                    "status": "VENTER",
                    "rekkefolge": 0
                },
                {
                    "navn": "QA Sign Person",
                    "epost": qa_email,
                    "sid": "sid-qa-2",
                    "status": "VENTER",
                    "rekkefolge": 1
                }
            ],
            "opprettet": now_iso,
            "oppdatert": now_iso
        }
        
        db.signering_jobber.insert_one(job_c)
        print(f"✓ Inserted job qafix-mine-2 into MongoDB")
        
        # GET mine as QA user
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ C: GET mine failed: {resp.status_code}")
            return False
        
        data = resp.json()
        ventende = data.get('ventende', [])
        
        # Should have 2 jobs now (qafix-mine-1 and qafix-mine-2)
        if len(ventende) != 2:
            print(f"❌ C: Expected 2 ventende, got {len(ventende)}")
            return False
        
        # Find qafix-mine-2
        job_c_data = next((v for v in ventende if v.get('jobbId') == 'qafix-mine-2'), None)
        if not job_c_data:
            print(f"❌ C: qafix-mine-2 not found in ventende")
            return False
        
        if job_c_data.get('paaTur') != False:
            print(f"❌ C: Expected paaTur=false, got {job_c_data.get('paaTur')}")
            return False
        
        print("✅ C: Sequential job where QA user NOT on turn (paaTur=false) working correctly")
        
        # ===== TEST D: JOB WHERE QA USER HAS SIGNERT → NOT IN VENTENDE =====
        print("\n[D] Testing job where QA user has SIGNERT status (should NOT be in ventende)...")
        
        job_d = {
            "id": "qafix-mine-3",
            "flyt": "direkte",
            "filId": "qafix-fil-3",
            "taskId": "DOKUMENTER",
            "filNavn": "QA Already Signed.pdf",
            "postenJobId": "qafix-posten-3",
            "status": "I_GANG",
            "tittel": "QAFIX Already Signed",
            "melding": "Already signed",
            "av": "Test Agent",
            "dagerFrist": 10,
            "signatarer": [
                {
                    "navn": "QA Sign Person",
                    "epost": qa_email,
                    "sid": "sid-qa-3",
                    "status": "SIGNERT",
                    "rekkefolge": 0,
                    "signertAt": now_iso
                },
                {
                    "navn": "Next Person",
                    "epost": "next@example.com",
                    "sid": "sid-next",
                    "status": "VENTER",
                    "rekkefolge": 1
                }
            ],
            "opprettet": now_iso,
            "oppdatert": now_iso
        }
        
        db.signering_jobber.insert_one(job_d)
        print(f"✓ Inserted job qafix-mine-3 into MongoDB")
        
        # GET mine as QA user
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ D: GET mine failed: {resp.status_code}")
            return False
        
        data = resp.json()
        ventende = data.get('ventende', [])
        
        # Should still have 2 jobs (qafix-mine-1 and qafix-mine-2), NOT qafix-mine-3
        job_d_in_list = any(v.get('jobbId') == 'qafix-mine-3' for v in ventende)
        if job_d_in_list:
            print(f"❌ D: qafix-mine-3 should NOT be in ventende (QA user already SIGNERT)")
            return False
        
        print("✅ D: Job where QA user has SIGNERT status correctly NOT in ventende")
        
        # ===== TEST E: PORTAL JOB (no sid) → lenke=null =====
        print("\n[E] Testing portal job (flyt='portal', no sid) → lenke should be null...")
        
        job_e = {
            "id": "qafix-mine-4",
            "flyt": "portal",  # Portal flow
            "filId": "qafix-fil-4",
            "taskId": "DOKUMENTER",
            "filNavn": "QA Portal.pdf",
            "postenJobId": "qafix-posten-4",
            "status": "I_GANG",
            "tittel": "QAFIX Portal Job",
            "melding": "Portal signing",
            "av": "Test Agent",
            "dagerFrist": 10,
            "signatarer": [
                {
                    "navn": "QA Sign Person",
                    "epost": qa_email,
                    # NO sid for portal jobs
                    "status": "VENTER",
                    "rekkefolge": 0
                }
            ],
            "opprettet": now_iso,
            "oppdatert": now_iso
        }
        
        db.signering_jobber.insert_one(job_e)
        print(f"✓ Inserted job qafix-mine-4 into MongoDB")
        
        # GET mine as QA user
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ E: GET mine failed: {resp.status_code}")
            return False
        
        data = resp.json()
        ventende = data.get('ventende', [])
        
        # Find qafix-mine-4
        job_e_data = next((v for v in ventende if v.get('jobbId') == 'qafix-mine-4'), None)
        if not job_e_data:
            print(f"❌ E: qafix-mine-4 not found in ventende")
            return False
        
        if job_e_data.get('lenke') is not None:
            print(f"❌ E: Expected lenke=null for portal job, got {job_e_data.get('lenke')}")
            return False
        
        print("✅ E: Portal job (no sid) correctly has lenke=null")
        
        # ===== TEST F: JOB WITH STATUS FULLFORT → NOT IN VENTENDE =====
        print("\n[F] Testing job with status FULLFORT (should NOT be in ventende)...")
        
        job_f = {
            "id": "qafix-mine-5",
            "flyt": "direkte",
            "filId": "qafix-fil-5",
            "taskId": "DOKUMENTER",
            "filNavn": "QA Completed.pdf",
            "postenJobId": "qafix-posten-5",
            "status": "FULLFORT",  # Completed
            "tittel": "QAFIX Completed Job",
            "melding": "Completed",
            "av": "Test Agent",
            "dagerFrist": 10,
            "signatarer": [
                {
                    "navn": "QA Sign Person",
                    "epost": qa_email,
                    "sid": "sid-qa-5",
                    "status": "VENTER",  # Still VENTER but job is FULLFORT
                    "rekkefolge": 0
                }
            ],
            "opprettet": now_iso,
            "oppdatert": now_iso
        }
        
        db.signering_jobber.insert_one(job_f)
        print(f"✓ Inserted job qafix-mine-5 into MongoDB")
        
        # GET mine as QA user
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ F: GET mine failed: {resp.status_code}")
            return False
        
        data = resp.json()
        ventende = data.get('ventende', [])
        
        # Should NOT include qafix-mine-5 (status is FULLFORT, not I_GANG)
        job_f_in_list = any(v.get('jobbId') == 'qafix-mine-5' for v in ventende)
        if job_f_in_list:
            print(f"❌ F: qafix-mine-5 should NOT be in ventende (status is FULLFORT)")
            return False
        
        print("✅ F: Job with status FULLFORT correctly NOT in ventende")
        
        # ===== TEST G: VERIFY NO sid/signerUrl LEAKED IN VENTENDE =====
        print("\n[G] Verifying NO sid/signerUrl leaked in ventende response...")
        
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={qa_token}")
        if resp.status_code != 200:
            print(f"❌ G: GET mine failed: {resp.status_code}")
            return False
        
        data = resp.json()
        ventende = data.get('ventende', [])
        
        # Check that no ventende item has 'sid' or 'signerUrl' fields (except in lenke path)
        for v in ventende:
            # Remove lenke from check (it contains sid in path)
            v_copy = {k: val for k, val in v.items() if k != 'lenke'}
            v_str = str(v_copy)
            
            # Check for sid patterns (but not in lenke)
            if 'sid-' in v_str or 'signerUrl' in v_str:
                print(f"❌ G: Found sid/signerUrl in ventende item: {v_copy}")
                return False
        
        print("✅ G: NO sid/signerUrl leaked in ventende response (only in lenke path)")
        
        # ===== TEST H: GET /admin/signering/jobber AS OWNER → poll object present =====
        print("\n[H] Testing GET /admin/signering/jobber as owner (poll object)...")
        
        resp = requests.get(f"{BASE_URL}/admin/signering/jobber?key={ADMIN_KEY}")
        if resp.status_code != 200:
            print(f"❌ H: GET jobber failed: {resp.status_code} {resp.text}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ H: Response not ok: {data}")
            return False
        
        # Check poll object
        poll = data.get('poll')
        if poll is None:
            print(f"❌ H: poll object missing in response")
            return False
        
        # poll should have 'sist' and 'neste' keys (can be null)
        if 'sist' not in poll or 'neste' not in poll:
            print(f"❌ H: poll object missing sist/neste keys: {poll}")
            return False
        
        print(f"✓ poll object present: sist={poll.get('sist')}, neste={poll.get('neste')}")
        
        # Check jobber array
        jobber = data.get('jobber', [])
        if not isinstance(jobber, list):
            print(f"❌ H: jobber is not a list")
            return False
        
        print(f"✓ jobber array has {len(jobber)} jobs")
        
        # Verify NO sid/signerUrl in jobber signatarer
        for job in jobber:
            signatarer = job.get('signatarer', [])
            for sig in signatarer:
                if 'sid' in sig or 'signerUrl' in sig:
                    print(f"❌ H: Found sid/signerUrl in jobber signatarer: {sig}")
                    return False
        
        print("✅ H: GET /admin/signering/jobber returns poll object and jobber without sid/signerUrl")
        
        # ===== TEST I: GET /admin/signering/mine AS OWNER (no ventende) =====
        print("\n[I] Testing GET /admin/signering/mine as owner (should have no ventende)...")
        
        # Login as owner
        owner_login = {"email": "martin@kviteberg.no", "password": "Pyramiden2025##"}
        resp = requests.post(f"{BASE_URL}/admin/auth/login", json=owner_login)
        if resp.status_code != 200:
            print(f"❌ I: Owner login failed: {resp.status_code}")
            return False
        
        owner_token = resp.json().get('token')
        
        # GET mine as owner
        resp = requests.get(f"{BASE_URL}/admin/signering/mine?key={owner_token}")
        if resp.status_code != 200:
            print(f"❌ I: GET mine as owner failed: {resp.status_code}")
            return False
        
        data = resp.json()
        if not data.get('ok'):
            print(f"❌ I: Response not ok: {data}")
            return False
        
        ventende = data.get('ventende', [])
        # Owner should have no ventende (no I_GANG jobs with owner's email)
        # Note: This assumes owner (martin@kviteberg.no) has no real I_GANG jobs waiting
        print(f"✓ Owner has {len(ventende)} ventende jobs")
        print("✅ I: GET /admin/signering/mine as owner returns 200 with ventende array")
        
        # ===== CLEANUP =====
        print("\n[CLEANUP] Deleting all QA data...")
        
        # Delete QA jobs from signering_jobber
        result = db.signering_jobber.delete_many({"id": {"$regex": "^qafix-"}})
        print(f"✓ Deleted {result.deleted_count} qafix jobs from signering_jobber")
        
        # Delete QA user
        resp = requests.delete(f"{BASE_URL}/admin/users/{qa_user_id}?key={ADMIN_KEY}")
        if resp.status_code == 200:
            print(f"✓ Deleted QA user {qa_email}")
        else:
            print(f"⚠️  Failed to delete QA user: {resp.status_code}")
        
        # Verify baseline restored
        final_count = db.signering_jobber.count_documents({})
        if final_count != baseline_count:
            print(f"❌ CLEANUP: signering_jobber count mismatch: expected {baseline_count}, got {final_count}")
            return False
        
        # Verify no qafix documents remain
        qafix_count = db.signering_jobber.count_documents({"id": {"$regex": "^qafix-"}})
        if qafix_count != 0:
            print(f"❌ CLEANUP: Found {qafix_count} qafix documents remaining")
            return False
        
        # Verify existing jobs unchanged
        final_job_ids = [doc['id'] for doc in db.signering_jobber.find({}, {'id': 1, '_id': 0})]
        if set(final_job_ids) != set(existing_job_ids):
            print(f"❌ CLEANUP: Existing job IDs changed!")
            print(f"   Before: {existing_job_ids}")
            print(f"   After: {final_job_ids}")
            return False
        
        # Verify no QA users remain
        qa_user_count = db.admin_users.count_documents({"email": {"$regex": "@example.com$"}})
        if qa_user_count != 0:
            print(f"⚠️  WARNING: Found {qa_user_count} @example.com users remaining")
        
        print(f"✓ Baseline restored: {final_count} signering_jobber")
        print(f"✓ No qafix documents remain")
        print(f"✓ Existing job IDs unchanged: {existing_job_ids}")
        
        print("\n" + "=" * 80)
        print("✅ ALL 9 TESTS PASSED")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
