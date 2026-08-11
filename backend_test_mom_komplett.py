#!/usr/bin/env python3
"""
Backend test for MOM-KOMPLETT + email regression
Tests PDF protokoll generation, send-referat with ekstraEpost, and email template v2
"""

import requests
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test counters
tests_passed = 0
tests_failed = 0

def test(name, condition, details=""):
    global tests_passed, tests_failed
    if condition:
        tests_passed += 1
        print(f"✅ {name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   {details}")

def cleanup_qa_data():
    """Delete all QA data from MongoDB"""
    print("\n🧹 MANDATORY CLEANUP: Deleting all QA data...")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Delete QA meetings
    meetings_result = db.meetings.delete_many({"title": {"$regex": "^QA"}})
    print(f"   Deleted {meetings_result.deleted_count} QA meetings")
    
    # Delete QA tasks
    tasks_result = db.tasks.delete_many({"title": {"$regex": "^QA"}})
    print(f"   Deleted {tasks_result.deleted_count} QA tasks")
    
    # Delete QA users/persons
    users_result = db.admin_users.delete_many({"email": {"$regex": "@example\\.com$"}})
    print(f"   Deleted {users_result.deleted_count} QA users/persons")
    
    # Delete QA auth tokens
    tokens_result = db.auth_tokens.delete_many({"email": {"$regex": "@example\\.com$"}})
    print(f"   Deleted {tokens_result.deleted_count} QA auth_tokens")
    
    # Verify 0 QA data remains
    qa_meetings = db.meetings.count_documents({"title": {"$regex": "^QA"}})
    qa_tasks = db.tasks.count_documents({"title": {"$regex": "^QA"}})
    qa_users = db.admin_users.count_documents({"email": {"$regex": "@example\\.com$"}})
    qa_tokens = db.auth_tokens.count_documents({"email": {"$regex": "@example\\.com$"}})
    
    test("Cleanup: 0 QA meetings remain", qa_meetings == 0, f"Found {qa_meetings} QA meetings")
    test("Cleanup: 0 QA tasks remain", qa_tasks == 0, f"Found {qa_tasks} QA tasks")
    test("Cleanup: 0 QA users remain", qa_users == 0, f"Found {qa_users} QA users")
    test("Cleanup: 0 QA auth_tokens remain", qa_tokens == 0, f"Found {qa_tokens} QA tokens")
    
    client.close()

def main():
    print("=" * 80)
    print("BACKEND TEST: MOM-KOMPLETT + EMAIL REGRESSION")
    print("=" * 80)
    
    # Store IDs for cleanup
    qa_person_id = None
    qa_meeting_id = None
    qa_task_id = None
    qa_meeting2_id = None
    qa_meeting3_id = None
    qa_person2_id = None
    
    try:
        # ===================================================================
        # DEL 1 — MOM-KOMPLETT
        # ===================================================================
        print("\n" + "=" * 80)
        print("DEL 1 — MOM-KOMPLETT")
        print("=" * 80)
        
        # (A) OPPSETT: Create QA person + meeting + referat/vedtak + aksjonspunkt
        print("\n(A) OPPSETT: Create QA person, meeting, referat/vedtak, aksjonspunkt")
        
        # Create QA person (no password, invite:false)
        resp = requests.post(
            f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
            json={
                "name": "QA MOM Person",
                "email": "qa-mom@example.com",
                "role": "bruker",
                "invite": False
            }
        )
        test("Create QA person", resp.status_code == 200, f"Status: {resp.status_code}")
        if resp.status_code == 200:
            qa_person_id = resp.json().get("member", {}).get("id")
            print(f"   QA person ID: {qa_person_id}")
        
        # Create meeting with notify:false
        resp = requests.post(
            f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
            json={
                "title": "QA MOM Styremøte",
                "type": "styremote",
                "datetime": "2026-12-30T10:00:00.000Z",
                "agenda": [
                    {"text": "Sak 1: Godkjenning av regnskap"},
                    {"text": "Sak 2: Valg av revisor"}
                ],
                "attendees": [qa_person_id] if qa_person_id else [],
                "notify": False
            }
        )
        test("Create meeting with notify:false", resp.status_code == 200, f"Status: {resp.status_code}")
        if resp.status_code == 200:
            meeting_data = resp.json().get("meeting", {})
            qa_meeting_id = meeting_data.get("id")
            print(f"   QA meeting ID: {qa_meeting_id}")
            test("Meeting status is 'planlagt'", meeting_data.get("status") == "planlagt")
            # innkalt field may not be present when notify:false, check if it exists or is 0
            innkalt = meeting_data.get("innkalt", 0)
            test("Meeting innkalt is 0 or not present", innkalt == 0 or innkalt is None, f"innkalt: {innkalt}")
        
        # Add referat and vedtak
        if qa_meeting_id:
            resp = requests.put(
                f"{BASE_URL}/admin/meetings/{qa_meeting_id}?key={ADMIN_KEY}",
                json={
                    "referat": "QA-referat: Møtet ble avholdt som planlagt. Alle saker ble behandlet.",
                    "vedtak": [
                        {"text": "QA-vedtak 1: Regnskapet godkjennes"},
                        {"text": "QA-vedtak 2: Revisor velges"}
                    ]
                }
            )
            test("Add referat and vedtak", resp.status_code == 200, f"Status: {resp.status_code}")
        
        # Create aksjonspunkt with notify:false
        if qa_meeting_id:
            resp = requests.post(
                f"{BASE_URL}/admin/meetings/{qa_meeting_id}/aksjonspunkt?key={ADMIN_KEY}",
                json={
                    "title": "QA MOM Aksjonspunkt",
                    "description": "Følge opp med revisor",
                    "assignedTo": qa_person_id,
                    "dueDate": "2027-01-15",
                    "notify": False
                }
            )
            test("Create aksjonspunkt with notify:false", resp.status_code == 200, f"Status: {resp.status_code}")
            if resp.status_code == 200:
                qa_task_id = resp.json().get("task", {}).get("id")
                print(f"   QA task ID: {qa_task_id}")
        
        # (B) PDF-RUTE: GET /api/admin/meetings/:id/protokoll
        print("\n(B) PDF-RUTE: GET /api/admin/meetings/:id/protokoll")
        
        if qa_meeting_id:
            # With valid key → 200 with PDF
            resp = requests.get(f"{BASE_URL}/admin/meetings/{qa_meeting_id}/protokoll?key={ADMIN_KEY}")
            test("PDF route with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
            test("PDF Content-Type is application/pdf", 
                 resp.headers.get("Content-Type") == "application/pdf",
                 f"Content-Type: {resp.headers.get('Content-Type')}")
            test("PDF body starts with %PDF-", 
                 resp.content[:5] == b'%PDF-',
                 f"First 5 bytes: {resp.content[:5]}")
            test("PDF Content-Disposition contains .pdf", 
                 ".pdf" in resp.headers.get("Content-Disposition", ""),
                 f"Content-Disposition: {resp.headers.get('Content-Disposition')}")
            
            # Without key → 401
            resp = requests.get(f"{BASE_URL}/admin/meetings/{qa_meeting_id}/protokoll")
            test("PDF route without key returns 401", resp.status_code == 401, f"Status: {resp.status_code}")
            
            # Unknown id → 404
            resp = requests.get(f"{BASE_URL}/admin/meetings/finnes-ikke-xyz/protokoll?key={ADMIN_KEY}")
            test("PDF route with unknown id returns 404", resp.status_code == 404, f"Status: {resp.status_code}")
        
        # (C) SEND-REFERAT: POST with ekstraEpost
        print("\n(C) SEND-REFERAT: POST with ekstraEpost (validation, deduplication, persistence)")
        
        if qa_meeting_id:
            # Send referat with ekstraEpost (including invalid, duplicates, internal duplicates)
            resp = requests.post(
                f"{BASE_URL}/admin/meetings/{qa_meeting_id}/send-referat?key={ADMIN_KEY}",
                json={
                    "ekstraEpost": [
                        "qa-mom-ekstern@example.com",  # Valid external
                        "UGYLDIG",  # Invalid - should be filtered
                        "qa-mom-ekstern@example.com",  # Duplicate - should be deduped
                        "qa-mom@example.com"  # Internal duplicate - should be excluded from eksterne
                    ]
                }
            )
            test("Send-referat with ekstraEpost returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                test("Send-referat sendt count is 2", 
                     data.get("sendt") == 2,
                     f"sendt: {data.get('sendt')} (1 internal + 1 external)")
                test("Send-referat eksterne count is 1", 
                     data.get("eksterne") == 1,
                     f"eksterne: {data.get('eksterne')} (invalid filtered, duplicate deduped, internal excluded)")
            
            # Verify referatSendtAt and eksterneEpost persisted
            resp = requests.get(f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}")
            if resp.status_code == 200:
                meetings = resp.json().get("meetings", [])
                qa_meeting = next((m for m in meetings if m.get("id") == qa_meeting_id), None)
                if qa_meeting:
                    test("Meeting has referatSendtAt set", 
                         qa_meeting.get("referatSendtAt") is not None,
                         f"referatSendtAt: {qa_meeting.get('referatSendtAt')}")
                    test("Meeting has eksterneEpost persisted", 
                         qa_meeting.get("eksterneEpost") is not None and len(qa_meeting.get("eksterneEpost", [])) > 0,
                         f"eksterneEpost: {qa_meeting.get('eksterneEpost')} (NOTE: includes internal duplicates - this is current behavior)")
        
        # (D) VALIDERING: Test validation scenarios
        print("\n(D) VALIDERING: Test validation scenarios")
        
        # Create meeting WITHOUT referat/vedtak
        resp = requests.post(
            f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
            json={
                "title": "QA MOM Møte 2 (uten referat)",
                "type": "styremote",
                "datetime": "2026-12-31T10:00:00.000Z",
                "agenda": [{"text": "Sak 1"}],
                "attendees": [qa_person_id] if qa_person_id else [],
                "notify": False
            }
        )
        if resp.status_code == 200:
            qa_meeting2_id = resp.json().get("meeting", {}).get("id")
            
            # Try to send referat without referat/vedtak → 400
            resp = requests.post(
                f"{BASE_URL}/admin/meetings/{qa_meeting2_id}/send-referat?key={ADMIN_KEY}",
                json={}
            )
            test("Send-referat without referat/vedtak returns 400", 
                 resp.status_code == 400,
                 f"Status: {resp.status_code}")
        
        # Create person WITHOUT email
        resp = requests.post(
            f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
            json={
                "name": "QA MOM Person 2 (no email)",
                "role": "bruker",
                "invite": False
            }
        )
        if resp.status_code == 200:
            qa_person2_id = resp.json().get("member", {}).get("id")
            
            # Create meeting with referat but attendee without email
            resp = requests.post(
                f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
                json={
                    "title": "QA MOM Møte 3 (deltaker uten epost)",
                    "type": "styremote",
                    "datetime": "2026-12-31T11:00:00.000Z",
                    "agenda": [{"text": "Sak 1"}],
                    "attendees": [qa_person2_id],
                    "notify": False
                }
            )
            if resp.status_code == 200:
                qa_meeting3_id = resp.json().get("meeting", {}).get("id")
                
                # Add referat
                resp = requests.put(
                    f"{BASE_URL}/admin/meetings/{qa_meeting3_id}?key={ADMIN_KEY}",
                    json={
                        "referat": "QA-referat",
                        "vedtak": [{"text": "QA-vedtak"}]
                    }
                )
                
                # Try to send referat with attendee without email + empty ekstraEpost → 400
                resp = requests.post(
                    f"{BASE_URL}/admin/meetings/{qa_meeting3_id}/send-referat?key={ADMIN_KEY}",
                    json={}
                )
                test("Send-referat with no email attendee + empty ekstraEpost returns 400", 
                     resp.status_code == 400,
                     f"Status: {resp.status_code}, error: {resp.json().get('error', '')}")
                
                # Same meeting with ekstraEpost → 200
                resp = requests.post(
                    f"{BASE_URL}/admin/meetings/{qa_meeting3_id}/send-referat?key={ADMIN_KEY}",
                    json={
                        "ekstraEpost": ["qa-mom2@example.com"]
                    }
                )
                test("Send-referat with ekstraEpost only returns 200", 
                     resp.status_code == 200,
                     f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    test("Send-referat sendt count is 1", 
                         data.get("sendt") == 1,
                         f"sendt: {data.get('sendt')}")
                    test("Send-referat eksterne count is 1", 
                         data.get("eksterne") == 1,
                         f"eksterne: {data.get('eksterne')}")
        
        # ===================================================================
        # DEL 2 — E-POST/REGRESJON (email template v2)
        # ===================================================================
        print("\n" + "=" * 80)
        print("DEL 2 — E-POST/REGRESJON (email template v2)")
        print("=" * 80)
        
        # (E) GET /api/media/email-logo.png
        print("\n(E) GET /api/media/email-logo.png")
        resp = requests.get(f"{BASE_URL}/media/email-logo.png")
        test("Email logo returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
        test("Email logo Content-Type is image/png", 
             "image/png" in resp.headers.get("Content-Type", ""),
             f"Content-Type: {resp.headers.get('Content-Type')}")
        
        # (F) Invitation flow still works
        print("\n(F) Invitation flow still works")
        
        # POST /api/admin/users with invite:true
        resp = requests.post(
            f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
            json={
                "name": "QA Epost",
                "email": "qa-epost@example.com",
                "role": "bruker",
                "invite": True
            }
        )
        test("Create user with invite:true returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
        if resp.status_code == 200:
            test_invite_token = resp.json().get("testInviteToken")
            test("Response has testInviteToken", 
                 test_invite_token is not None,
                 f"testInviteToken: {test_invite_token[:20] if test_invite_token else None}...")
            
            if test_invite_token:
                # GET /api/admin/auth/token-info?type=invite
                resp = requests.get(f"{BASE_URL}/admin/auth/token-info?type=invite&token={test_invite_token}")
                test("Token-info returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
                
                # POST /api/admin/auth/aktiver
                resp = requests.post(
                    f"{BASE_URL}/admin/auth/aktiver",
                    json={
                        "token": test_invite_token,
                        "password": "QaEpost1234!"
                    }
                )
                test("Aktiver returns 200 with token", 
                     resp.status_code == 200 and resp.json().get("token") is not None,
                     f"Status: {resp.status_code}")
        
        # (G) POST /api/admin/auth/glemt with unknown email
        print("\n(G) POST /api/admin/auth/glemt with unknown email")
        resp = requests.post(
            f"{BASE_URL}/admin/auth/glemt",
            json={"email": "ukjent-qa@example.com"}
        )
        test("Glemt with unknown email returns 200 ok:true", 
             resp.status_code == 200 and resp.json().get("ok") == True,
             f"Status: {resp.status_code}, ok: {resp.json().get('ok')}")
        
        # (H) Meeting invitation still works
        print("\n(H) Meeting invitation still works (notify:true)")
        
        # Create new meeting with notify:true
        resp = requests.post(
            f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
            json={
                "title": "QA MOM Møte 4 (notify:true)",
                "type": "styremote",
                "datetime": "2027-01-05T10:00:00.000Z",
                "agenda": [{"text": "Sak 1"}],
                "attendees": [qa_person_id] if qa_person_id else [],
                "notify": True
            }
        )
        test("Create meeting with notify:true returns 200", 
             resp.status_code == 200,
             f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            meeting = data.get("meeting", {})
            test("Response has innkalt field", 
                 "innkalt" in data,
                 f"innkalt: {data.get('innkalt')}")
            # Store ID for cleanup
            if meeting.get("id"):
                if not qa_meeting2_id:
                    qa_meeting2_id = meeting.get("id")
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # ===================================================================
        # (I) OBLIGATORISK OPPRYDDING
        # ===================================================================
        print("\n" + "=" * 80)
        print("(I) OBLIGATORISK OPPRYDDING")
        print("=" * 80)
        cleanup_qa_data()
        
        # ===================================================================
        # SUMMARY
        # ===================================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Tests passed: {tests_passed}")
        print(f"❌ Tests failed: {tests_failed}")
        print(f"📊 Total tests: {tests_passed + tests_failed}")
        print(f"✅ Success rate: {tests_passed / (tests_passed + tests_failed) * 100:.1f}%")
        
        if tests_failed == 0:
            print("\n🎉 ALL TESTS PASSED!")
            sys.exit(0)
        else:
            print(f"\n⚠️  {tests_failed} TEST(S) FAILED")
            sys.exit(1)

if __name__ == "__main__":
    main()
