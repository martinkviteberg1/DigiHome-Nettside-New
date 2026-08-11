#!/usr/bin/env python3
"""
Backend test for FORTIDSMØTER (past meetings) feature.
Tests POST /api/admin/meetings with status:'avholdt' and regression tests.
"""

import requests
import sys
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://conversion-optimize-7.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test results
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(name, passed, message=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
        test_results.append(f"✅ {name}")
    else:
        tests_failed += 1
        print(f"❌ {name}: {message}")
        test_results.append(f"❌ {name}: {message}")

def test_section(name):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")

# Store created IDs for cleanup
created_meeting_ids = []
created_user_ids = []

try:
    # Connect to MongoDB
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    test_section("(A) POST /api/admin/meetings med status:'avholdt' (fortidsmøte)")
    
    # Test A: Create meeting with status:'avholdt', notify:true, no attendees
    print("\nTest A: POST meeting with status:'avholdt', notify:true, attendees:[]")
    try:
        response = requests.post(
            f"{API_BASE}/admin/meetings",
            params={"key": ADMIN_KEY},
            json={
                "title": "QA Fortid A",
                "type": "styremote",
                "datetime": "2026-01-10T12:00",
                "status": "avholdt",
                "notify": True,
                "attendees": []
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("meeting"):
                meeting = data["meeting"]
                created_meeting_ids.append(meeting["id"])
                
                # Check status is 'avholdt'
                if meeting.get("status") == "avholdt":
                    log_test("A1: Meeting created with status='avholdt'", True)
                else:
                    log_test("A1: Meeting created with status='avholdt'", False, f"status={meeting.get('status')}")
                
                # Check innkalt is 0 (no invitations sent for avholdt meetings)
                innkalt = data.get("innkalt", 0)
                if innkalt == 0:
                    log_test("A2: innkalt=0 (no invitations for avholdt meetings)", True)
                else:
                    log_test("A2: innkalt=0 (no invitations for avholdt meetings)", False, f"innkalt={innkalt}")
            else:
                log_test("A: POST meeting with status:'avholdt'", False, f"Missing ok or meeting in response: {data}")
        else:
            log_test("A: POST meeting with status:'avholdt'", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("A: POST meeting with status:'avholdt'", False, str(e))
    
    test_section("(B) POST med status:'avholdt' + deltaker med e-post")
    
    # Test B: Create QA person and meeting with attendee
    print("\nTest B: Create QA person and meeting with status:'avholdt', notify:true, attendee")
    try:
        # Create QA person
        person_response = requests.post(
            f"{API_BASE}/admin/users",
            params={"key": ADMIN_KEY},
            json={
                "name": "QA Fortid Person",
                "email": "qa-fortid@example.com",
                "role": "bruker",
                "invite": False
            },
            timeout=10
        )
        
        if person_response.status_code == 200:
            person_data = person_response.json()
            person_id = person_data.get("member", {}).get("id")
            if person_id:
                created_user_ids.append(person_id)
                log_test("B1: QA person created", True)
                
                # Create meeting with attendee
                meeting_response = requests.post(
                    f"{API_BASE}/admin/meetings",
                    params={"key": ADMIN_KEY},
                    json={
                        "title": "QA Fortid B",
                        "type": "ledermote",
                        "datetime": "2026-02-10T12:00",
                        "status": "avholdt",
                        "notify": True,
                        "attendees": [person_id]
                    },
                    timeout=10
                )
                
                if meeting_response.status_code == 200:
                    meeting_data = meeting_response.json()
                    if meeting_data.get("ok") and meeting_data.get("meeting"):
                        meeting = meeting_data["meeting"]
                        created_meeting_ids.append(meeting["id"])
                        
                        # Check status is 'avholdt'
                        if meeting.get("status") == "avholdt":
                            log_test("B2: Meeting with attendee created with status='avholdt'", True)
                        else:
                            log_test("B2: Meeting with attendee created with status='avholdt'", False, f"status={meeting.get('status')}")
                        
                        # Check innkalt is 0 (no invitations for avholdt meetings even with attendees)
                        innkalt = meeting_data.get("innkalt", 0)
                        if innkalt == 0:
                            log_test("B3: innkalt=0 (no invitations for avholdt meetings with attendees)", True)
                        else:
                            log_test("B3: innkalt=0 (no invitations for avholdt meetings with attendees)", False, f"innkalt={innkalt}")
                    else:
                        log_test("B: POST meeting with attendee", False, f"Missing ok or meeting: {meeting_data}")
                else:
                    log_test("B: POST meeting with attendee", False, f"HTTP {meeting_response.status_code}: {meeting_response.text[:200]}")
            else:
                log_test("B1: QA person created", False, "No person id in response")
        else:
            log_test("B1: QA person created", False, f"HTTP {person_response.status_code}: {person_response.text[:200]}")
    except Exception as e:
        log_test("B: POST meeting with attendee", False, str(e))
    
    test_section("(C) REGRESJON: POST uten status-felt + ugyldig status + GET + PUT")
    
    # Test C1: POST without status field (should default to 'planlagt')
    print("\nTest C1: POST meeting without status field (default to 'planlagt')")
    try:
        response = requests.post(
            f"{API_BASE}/admin/meetings",
            params={"key": ADMIN_KEY},
            json={
                "title": "QA Planlagt C",
                "type": "annet",
                "datetime": "2027-09-01T10:00",
                "notify": False
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("meeting"):
                meeting = data["meeting"]
                created_meeting_ids.append(meeting["id"])
                
                if meeting.get("status") == "planlagt":
                    log_test("C1: Meeting without status defaults to 'planlagt'", True)
                else:
                    log_test("C1: Meeting without status defaults to 'planlagt'", False, f"status={meeting.get('status')}")
            else:
                log_test("C1: POST without status", False, f"Missing ok or meeting: {data}")
        else:
            log_test("C1: POST without status", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("C1: POST without status", False, str(e))
    
    # Test C2: POST with invalid status (should default to 'planlagt')
    print("\nTest C2: POST meeting with invalid status:'tullball' (should default to 'planlagt')")
    try:
        response = requests.post(
            f"{API_BASE}/admin/meetings",
            params={"key": ADMIN_KEY},
            json={
                "title": "QA Tullstatus D",
                "type": "annet",
                "datetime": "2027-09-02T10:00",
                "status": "tullball",
                "notify": False
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("meeting"):
                meeting = data["meeting"]
                created_meeting_ids.append(meeting["id"])
                
                if meeting.get("status") == "planlagt":
                    log_test("C2: Meeting with invalid status defaults to 'planlagt'", True)
                else:
                    log_test("C2: Meeting with invalid status defaults to 'planlagt'", False, f"status={meeting.get('status')}")
            else:
                log_test("C2: POST with invalid status", False, f"Missing ok or meeting: {data}")
        else:
            log_test("C2: POST with invalid status", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("C2: POST with invalid status", False, str(e))
    
    # Test C3: GET /api/admin/meetings (should contain all QA meetings)
    print("\nTest C3: GET /api/admin/meetings (should contain all QA meetings)")
    try:
        response = requests.get(
            f"{API_BASE}/admin/meetings",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and "meetings" in data:
                meetings = data["meetings"]
                qa_meetings = [m for m in meetings if m.get("title", "").startswith("QA ")]
                
                if len(qa_meetings) >= 4:  # At least 4 QA meetings created
                    log_test("C3: GET /admin/meetings returns all QA meetings", True)
                else:
                    log_test("C3: GET /admin/meetings returns all QA meetings", False, f"Found {len(qa_meetings)} QA meetings, expected >= 4")
            else:
                log_test("C3: GET /admin/meetings", False, f"Missing ok or meetings: {data}")
        else:
            log_test("C3: GET /admin/meetings", False, f"HTTP {response.status_code}: {response.text[:200]}")
    except Exception as e:
        log_test("C3: GET /admin/meetings", False, str(e))
    
    # Test C4: PUT meeting to change status to 'avholdt'
    print("\nTest C4: PUT meeting to change status to 'avholdt'")
    if len(created_meeting_ids) >= 3:
        planlagt_meeting_id = created_meeting_ids[2]  # QA Planlagt C
        try:
            response = requests.put(
                f"{API_BASE}/admin/meetings/{planlagt_meeting_id}",
                params={"key": ADMIN_KEY},
                json={
                    "status": "avholdt"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    # Verify status was updated
                    get_response = requests.get(
                        f"{API_BASE}/admin/meetings",
                        params={"key": ADMIN_KEY},
                        timeout=10
                    )
                    
                    if get_response.status_code == 200:
                        get_data = get_response.json()
                        meetings = get_data.get("meetings", [])
                        updated_meeting = next((m for m in meetings if m.get("id") == planlagt_meeting_id), None)
                        
                        if updated_meeting and updated_meeting.get("status") == "avholdt":
                            log_test("C4: PUT meeting status to 'avholdt' successful", True)
                        else:
                            log_test("C4: PUT meeting status to 'avholdt' successful", False, f"Status not updated or meeting not found")
                    else:
                        log_test("C4: PUT meeting status verification", False, f"GET failed: HTTP {get_response.status_code}")
                else:
                    log_test("C4: PUT meeting status", False, f"Response not ok: {data}")
            else:
                log_test("C4: PUT meeting status", False, f"HTTP {response.status_code}: {response.text[:200]}")
        except Exception as e:
            log_test("C4: PUT meeting status", False, str(e))
    else:
        log_test("C4: PUT meeting status", False, "Not enough meetings created")
    
    test_section("(D) OBLIGATORISK OPPRYDDING")
    
    # Delete all QA meetings
    print("\nDeleting all QA meetings...")
    deleted_meetings = 0
    for meeting_id in created_meeting_ids:
        try:
            response = requests.delete(
                f"{API_BASE}/admin/meetings/{meeting_id}",
                params={"key": ADMIN_KEY},
                timeout=10
            )
            if response.status_code == 200:
                deleted_meetings += 1
        except Exception as e:
            print(f"Failed to delete meeting {meeting_id}: {e}")
    
    log_test(f"D1: Deleted {deleted_meetings} QA meetings", deleted_meetings == len(created_meeting_ids))
    
    # Delete all QA users
    print("\nDeleting all QA users...")
    deleted_users = 0
    for user_id in created_user_ids:
        try:
            response = requests.delete(
                f"{API_BASE}/admin/users/{user_id}",
                params={"key": ADMIN_KEY},
                timeout=10
            )
            if response.status_code == 200:
                deleted_users += 1
        except Exception as e:
            print(f"Failed to delete user {user_id}: {e}")
    
    log_test(f"D2: Deleted {deleted_users} QA users", deleted_users == len(created_user_ids))
    
    # Verify cleanup in MongoDB
    print("\nVerifying cleanup in MongoDB...")
    try:
        qa_meetings_count = db.meetings.count_documents({"title": {"$regex": "^QA "}})
        log_test("D3: MongoDB meetings collection has 0 QA documents", qa_meetings_count == 0, f"Found {qa_meetings_count} QA meetings")
        
        qa_users_count = db.admin_users.count_documents({"name": {"$regex": "^QA "}})
        log_test("D4: MongoDB admin_users collection has 0 QA documents", qa_users_count == 0, f"Found {qa_users_count} QA users")
    except Exception as e:
        log_test("D: MongoDB verification", False, str(e))
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"  TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total tests: {tests_passed + tests_failed}")
    print(f"Passed: {tests_passed}")
    print(f"Failed: {tests_failed}")
    print(f"Success rate: {100 * tests_passed / (tests_passed + tests_failed):.1f}%")
    
    if tests_failed > 0:
        print(f"\n❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print(f"\n✅ ALL TESTS PASSED")
        sys.exit(0)

except Exception as e:
    print(f"\n❌ FATAL ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    if mongo_client:
        mongo_client.close()
