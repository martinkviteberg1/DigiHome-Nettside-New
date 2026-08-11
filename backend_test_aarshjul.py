#!/usr/bin/env python3
"""
Backend test for ÅRSHJUL endpoint (POST /api/admin/meetings/aarshjul)
Tests bulk meeting creation with idempotency, validation, auth, and notify.
"""

import requests
import os
import sys
from pymongo import MongoClient

# Load environment variables
def load_env():
    env = {}
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip().strip('"').strip("'")
                    env[key] = value
    except Exception as e:
        print(f"Warning: Could not load .env file: {e}")
    return env

env = load_env()
BASE_URL = env.get('NEXT_PUBLIC_BASE_URL', 'https://conversion-optimize-7.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = env.get('ADMIN_KEY', 'dh_admin_b3Kx92Qz7Lm4')
MONGO_URL = env.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = env.get('DB_NAME', 'your_database_name')

print(f"=== ÅRSHJUL ENDPOINT TESTING ===")
print(f"Base URL: {BASE_URL}")
print(f"API URL: {API_URL}")
print(f"Admin Key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
print()

# MongoDB connection
try:
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    print("✓ MongoDB connection established")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    sys.exit(1)

# Test counters
total_tests = 0
passed_tests = 0
failed_tests = 0

def test(name, condition, error_msg=""):
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    if condition:
        passed_tests += 1
        print(f"✓ {name}")
        return True
    else:
        failed_tests += 1
        print(f"✗ {name}")
        if error_msg:
            print(f"  Error: {error_msg}")
        return False

# Store created IDs for cleanup
qa_meeting_ids = []
qa_user_ids = []

print("\n=== (A) OPPRETTELSE (Creation with master key) ===")
try:
    # Create 2 meetings with agenda
    body = {
        "meetings": [
            {
                "title": "QA Årshjul Styremøte 1",
                "type": "styremote",
                "datetime": "2027-03-09T10:00",
                "agenda": [
                    {"text": "QA-punkt 1"},
                    {"text": "QA-punkt 2"}
                ],
                "attendees": []
            },
            {
                "title": "QA Årshjul GF",
                "type": "annet",
                "datetime": "2027-04-13T10:00",
                "agenda": []
            }
        ],
        "notify": False
    }
    
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json=body, timeout=10)
    test("POST /aarshjul returns 200", r.status_code == 200, f"Got {r.status_code}: {r.text[:200]}")
    
    if r.status_code == 200:
        data = r.json()
        test("Response has ok:true", data.get('ok') == True, f"Got {data}")
        test("Response has opprettet:2", data.get('opprettet') == 2, f"Got opprettet={data.get('opprettet')}")
        test("Response has hoppetOver:0", data.get('hoppetOver') == 0, f"Got hoppetOver={data.get('hoppetOver')}")
        test("Response has innkalt field", 'innkalt' in data, f"Missing innkalt field")
        test("Response has meetings array", isinstance(data.get('meetings'), list), f"Got {type(data.get('meetings'))}")
        test("meetings.length === 2", len(data.get('meetings', [])) == 2, f"Got {len(data.get('meetings', []))}")
        
        # Verify meeting structure
        if len(data.get('meetings', [])) >= 1:
            m1 = data['meetings'][0]
            qa_meeting_ids.append(m1.get('id'))
            test("Meeting 1 has uuid id", isinstance(m1.get('id'), str) and len(m1.get('id', '')) > 20, f"Got id={m1.get('id')}")
            test("Meeting 1 has status 'planlagt'", m1.get('status') == 'planlagt', f"Got status={m1.get('status')}")
            test("Meeting 1 has aarshjul:true", m1.get('aarshjul') == True, f"Got aarshjul={m1.get('aarshjul')}")
            test("Meeting 1 has agenda array", isinstance(m1.get('agenda'), list), f"Got {type(m1.get('agenda'))}")
            
            # Verify agenda items
            if isinstance(m1.get('agenda'), list) and len(m1.get('agenda', [])) >= 2:
                a1 = m1['agenda'][0]
                test("Agenda item 1 has id", 'id' in a1, f"Missing id in agenda item")
                test("Agenda item 1 has text", a1.get('text') == 'QA-punkt 1', f"Got text={a1.get('text')}")
                test("Agenda item 1 has done:false", a1.get('done') == False, f"Got done={a1.get('done')}")
        
        if len(data.get('meetings', [])) >= 2:
            m2 = data['meetings'][1]
            qa_meeting_ids.append(m2.get('id'))
            test("Meeting 2 has uuid id", isinstance(m2.get('id'), str) and len(m2.get('id', '')) > 20, f"Got id={m2.get('id')}")
        
        # Verify via GET /admin/meetings
        r2 = requests.get(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", timeout=10)
        if r2.status_code == 200:
            meetings_data = r2.json()
            all_meetings = meetings_data.get('meetings', [])
            qa_meetings = [m for m in all_meetings if m.get('title', '').startswith('QA Årshjul')]
            test("GET /admin/meetings shows 2 QA meetings", len(qa_meetings) == 2, f"Found {len(qa_meetings)} QA meetings")
        
except Exception as e:
    test("POST /aarshjul creation", False, str(e))

print("\n=== (B) IDEMPOTENS (Idempotency - duplicate prevention) ===")
try:
    # Run the EXACT same call again
    body = {
        "meetings": [
            {
                "title": "QA Årshjul Styremøte 1",
                "type": "styremote",
                "datetime": "2027-03-09T10:00",
                "agenda": [
                    {"text": "QA-punkt 1"},
                    {"text": "QA-punkt 2"}
                ],
                "attendees": []
            },
            {
                "title": "QA Årshjul GF",
                "type": "annet",
                "datetime": "2027-04-13T10:00",
                "agenda": []
            }
        ],
        "notify": False
    }
    
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json=body, timeout=10)
    test("POST /aarshjul (idempotent) returns 200", r.status_code == 200, f"Got {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        test("Idempotent: opprettet:0", data.get('opprettet') == 0, f"Got opprettet={data.get('opprettet')}")
        test("Idempotent: hoppetOver:2", data.get('hoppetOver') == 2, f"Got hoppetOver={data.get('hoppetOver')}")
        
        # Verify still only 2 QA meetings (no duplicates)
        r2 = requests.get(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", timeout=10)
        if r2.status_code == 200:
            meetings_data = r2.json()
            all_meetings = meetings_data.get('meetings', [])
            qa_meetings = [m for m in all_meetings if m.get('title', '').startswith('QA Årshjul')]
            test("GET /admin/meetings still shows only 2 QA meetings", len(qa_meetings) == 2, f"Found {len(qa_meetings)} QA meetings (expected 2, no duplicates)")
        
except Exception as e:
    test("POST /aarshjul idempotency", False, str(e))

print("\n=== (C) VALIDERING (Validation) ===")
try:
    # Empty meetings array
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json={"meetings": []}, timeout=10)
    test("Empty meetings array returns 400", r.status_code == 400, f"Got {r.status_code}")
    
    # Invalid rows (missing title, missing datetime, invalid datetime)
    body = {
        "meetings": [
            {"title": "", "datetime": "2027-05-01T10:00"},  # empty title
            {"title": "QA uten dato"},  # missing datetime
            {"title": "QA ugyldig dato", "datetime": "ikke-en-dato"}  # invalid datetime
        ],
        "notify": False
    }
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json=body, timeout=10)
    test("Invalid rows returns 200", r.status_code == 200, f"Got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        test("Invalid rows: opprettet:0", data.get('opprettet') == 0, f"Got opprettet={data.get('opprettet')}")
        test("Invalid rows: hoppetOver:3", data.get('hoppetOver') == 3, f"Got hoppetOver={data.get('hoppetOver')}")
    
    # Unknown type (should default to 'annet')
    body = {
        "meetings": [
            {"title": "QA Årshjul Tulletype", "type": "tullball", "datetime": "2027-05-11T10:00"}
        ],
        "notify": False
    }
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json=body, timeout=10)
    test("Unknown type returns 200", r.status_code == 200, f"Got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        test("Unknown type: opprettet:1", data.get('opprettet') == 1, f"Got opprettet={data.get('opprettet')}")
        if len(data.get('meetings', [])) >= 1:
            m = data['meetings'][0]
            qa_meeting_ids.append(m.get('id'))
            test("Unknown type defaults to 'annet'", m.get('type') == 'annet', f"Got type={m.get('type')}")
    
except Exception as e:
    test("Validation tests", False, str(e))

print("\n=== (D) AUTH (Authentication) ===")
try:
    # Without key
    body = {"meetings": [{"title": "QA Test", "datetime": "2027-06-01T10:00"}], "notify": False}
    r = requests.post(f"{API_URL}/admin/meetings/aarshjul", json=body, timeout=10)
    test("POST /aarshjul without key returns 401", r.status_code == 401, f"Got {r.status_code}")
    
    # Create QA user and get user token
    user_body = {
        "name": "QA Aarshjul Bruker",
        "email": "qa-aarshjul@example.com",
        "role": "bruker",
        "password": "QAaarshjul123!"
    }
    r = requests.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json=user_body, timeout=10)
    if r.status_code == 200:
        user_data = r.json()
        qa_user_ids.append(user_data.get('member', {}).get('id'))
        
        # Login to get user token
        login_body = {"email": "qa-aarshjul@example.com", "password": "QAaarshjul123!"}
        r2 = requests.post(f"{API_URL}/admin/auth/login", json=login_body, timeout=10)
        if r2.status_code == 200:
            login_data = r2.json()
            user_token = login_data.get('token')
            test("User login successful", user_token is not None, "No token returned")
            
            # Try to create meeting with user token
            r3 = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={user_token}", json=body, timeout=10)
            test("POST /aarshjul with user token returns 401", r3.status_code == 401, f"Got {r3.status_code}")
        else:
            test("User login", False, f"Login failed with {r2.status_code}")
    else:
        test("Create QA user", False, f"User creation failed with {r.status_code}")
    
except Exception as e:
    test("Auth tests", False, str(e))

print("\n=== (E) NOTIFY (Notification with @example.com) ===")
try:
    # Create QA person without password
    person_body = {
        "name": "QA Aarshjul Deltaker",
        "email": "qa-aarshjul-d@example.com",
        "role": "bruker"
    }
    r = requests.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json=person_body, timeout=10)
    test("Create QA person returns 200", r.status_code == 200, f"Got {r.status_code}")
    
    if r.status_code == 200:
        person_data = r.json()
        person_id = person_data.get('member', {}).get('id')
        qa_user_ids.append(person_id)
        test("QA person has id", person_id is not None, "No id returned")
        
        # Create meeting with notify:true and this person as attendee
        body = {
            "meetings": [
                {
                    "title": "QA Årshjul Notify",
                    "type": "styremote",
                    "datetime": "2027-06-08T10:00",
                    "attendees": [person_id]
                }
            ],
            "notify": True
        }
        r2 = requests.post(f"{API_URL}/admin/meetings/aarshjul?key={ADMIN_KEY}", json=body, timeout=10)
        test("POST /aarshjul with notify:true returns 200", r2.status_code == 200, f"Got {r2.status_code}")
        
        if r2.status_code == 200:
            data = r2.json()
            test("Notify response has innkalt field", 'innkalt' in data, "Missing innkalt field")
            # innkalt=0 is OK since @example.com is blocked before SendGrid
            # The point is that the call doesn't fail
            test("Notify call doesn't fail", data.get('ok') == True, f"Got ok={data.get('ok')}")
            if len(data.get('meetings', [])) >= 1:
                m = data['meetings'][0]
                qa_meeting_ids.append(m.get('id'))
                test("Notify meeting created", m.get('title') == 'QA Årshjul Notify', f"Got title={m.get('title')}")
                test("Notify meeting has attendee", len(m.get('attendees', [])) == 1, f"Got {len(m.get('attendees', []))} attendees")
    
except Exception as e:
    test("Notify tests", False, str(e))

print("\n=== (F) REGRESJON (Regression - single meeting endpoint) ===")
try:
    # Test single meeting creation still works
    body = {
        "title": "QA Regresjon Enkeltmøte",
        "type": "ledermote",
        "datetime": "2027-08-10T10:00",
        "notify": False
    }
    r = requests.post(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", json=body, timeout=10)
    test("POST /admin/meetings (single) returns 200", r.status_code == 200, f"Got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        if data.get('meeting', {}).get('id'):
            qa_meeting_ids.append(data['meeting']['id'])
    
    # Test GET /admin/meetings still works
    r2 = requests.get(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", timeout=10)
    test("GET /admin/meetings returns 200", r2.status_code == 200, f"Got {r2.status_code}")
    
except Exception as e:
    test("Regression tests", False, str(e))

print("\n=== (G) OBLIGATORISK OPPRYDDING (Mandatory cleanup) ===")
try:
    # Delete all QA meetings
    deleted_meetings = 0
    for meeting_id in qa_meeting_ids:
        if meeting_id:
            r = requests.delete(f"{API_URL}/admin/meetings/{meeting_id}?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                deleted_meetings += 1
    test(f"Deleted {deleted_meetings} QA meetings", deleted_meetings == len([m for m in qa_meeting_ids if m]), f"Expected {len([m for m in qa_meeting_ids if m])}, deleted {deleted_meetings}")
    
    # Delete all QA users
    deleted_users = 0
    for user_id in qa_user_ids:
        if user_id:
            r = requests.delete(f"{API_URL}/admin/users/{user_id}?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                deleted_users += 1
    test(f"Deleted {deleted_users} QA users", deleted_users == len([u for u in qa_user_ids if u]), f"Expected {len([u for u in qa_user_ids if u])}, deleted {deleted_users}")
    
    # Verify in MongoDB that no QA data remains
    meetings_coll = db['meetings']
    qa_meetings_count = meetings_coll.count_documents({"title": {"$regex": "^QA "}})
    test("MongoDB: 0 QA meetings remain", qa_meetings_count == 0, f"Found {qa_meetings_count} QA meetings in MongoDB")
    
    users_coll = db['admin_users']
    qa_users_count = users_coll.count_documents({"name": {"$regex": "^QA "}})
    test("MongoDB: 0 QA users remain", qa_users_count == 0, f"Found {qa_users_count} QA users in MongoDB")
    
    print(f"\n✓ Cleanup complete: verified 0 QA data in MongoDB")
    
except Exception as e:
    test("Cleanup", False, str(e))

# Summary
print("\n" + "="*60)
print(f"ÅRSHJUL ENDPOINT TEST SUMMARY")
print("="*60)
print(f"Total tests: {total_tests}")
print(f"Passed: {passed_tests} ✓")
print(f"Failed: {failed_tests} ✗")
print(f"Success rate: {(passed_tests/total_tests*100) if total_tests > 0 else 0:.1f}%")
print("="*60)

if failed_tests == 0:
    print("\n✅ ALL TESTS PASSED - ÅRSHJUL endpoint working perfectly!")
    sys.exit(0)
else:
    print(f"\n❌ {failed_tests} TEST(S) FAILED")
    sys.exit(1)
