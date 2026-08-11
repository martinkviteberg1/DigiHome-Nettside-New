#!/usr/bin/env python3
"""
Backend test for MØTER (meetings) module + MIN PROFIL (profile) endpoint.
Tests all meetings CRUD operations, aksjonspunkt, send-referat, recurrence, delete,
and the new profile endpoint for name/color/password changes.

CRITICAL EMAIL SAFETY:
- SendGrid is LIVE
- All QA persons use @example.com addresses (blocked by isUndeliverableTestAddress)
- Use notify:false on POST /admin/meetings and aksjonspunkt
- send-referat has NO notify flag - only call on QA meetings with @example.com attendees
- NEVER add owner account (martin@kviteberg.no) as attendee
- NEVER test profile route on owner account
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime, timedelta
from pymongo import MongoClient

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data
QA_PERSON_EMAIL = "qa-mote@example.com"
QA_BRUKER_EMAIL = "qa-mote-bruker@example.com"
QA_BRUKER_PASSWORD = "QaBruker123!"
QA_BRUKER_NEW_PASSWORD = "NyttQaPass123!"

async def main():
    print("=" * 80)
    print("MØTER + MIN PROFIL BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print()
    
    # MongoDB connection
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Track test data for cleanup
    test_data = {
        "meetings": [],
        "tasks": [],
        "users": [],
        "persons": [],
        "auth_tokens": []
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            # ================================================================
            # PRE-CLEANUP: Delete any existing QA data from previous runs
            # ================================================================
            print("\n" + "=" * 80)
            print("PRE-CLEANUP: Removing any existing QA data")
            print("=" * 80)
            
            # Delete QA users
            qa_users_deleted = db.admin_users.delete_many({"email": {"$regex": "^qa-mote"}})
            print(f"  ✓ Deleted {qa_users_deleted.deleted_count} existing QA users")
            
            # Delete QA meetings
            qa_meetings_deleted = db.meetings.delete_many({"title": {"$regex": "^QA "}})
            print(f"  ✓ Deleted {qa_meetings_deleted.deleted_count} existing QA meetings")
            
            # Delete QA tasks
            qa_tasks_deleted = db.tasks.delete_many({"title": {"$regex": "^QA "}})
            print(f"  ✓ Deleted {qa_tasks_deleted.deleted_count} existing QA tasks")
            
            # ================================================================
            # (A) AUTH ENFORCEMENT
            # ================================================================
            print("\n" + "=" * 80)
            print("(A) AUTH ENFORCEMENT")
            print("=" * 80)
            
            # Test 1: All meetings endpoints without key should return 401
            print("\n[A1] Testing meetings endpoints without key → 401")
            endpoints_to_test = [
                ("GET", f"{BASE_URL}/admin/meetings"),
                ("POST", f"{BASE_URL}/admin/meetings"),
                ("PUT", f"{BASE_URL}/admin/meetings/test-id"),
                ("POST", f"{BASE_URL}/admin/meetings/test-id/aksjonspunkt"),
                ("POST", f"{BASE_URL}/admin/meetings/test-id/send-referat"),
                ("DELETE", f"{BASE_URL}/admin/meetings/test-id"),
            ]
            
            for method, url in endpoints_to_test:
                if method == "GET":
                    async with session.get(url) as resp:
                        assert resp.status == 401, f"{method} {url} should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} → 401")
                elif method == "POST":
                    async with session.post(url, json={}) as resp:
                        assert resp.status == 401, f"{method} {url} should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} → 401")
                elif method == "PUT":
                    async with session.put(url, json={}) as resp:
                        assert resp.status == 401, f"{method} {url} should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} → 401")
                elif method == "DELETE":
                    async with session.delete(url) as resp:
                        assert resp.status == 401, f"{method} {url} should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} → 401")
            
            # Test 2: Create QA bruker with 'bruker' role
            print("\n[A2] Creating QA bruker with 'bruker' role")
            async with session.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "email": QA_BRUKER_EMAIL,
                    "name": "QA Møte Bruker",
                    "role": "bruker",
                    "password": QA_BRUKER_PASSWORD,
                    "invite": False
                }
            ) as resp:
                assert resp.status in [200, 201], f"Failed to create QA bruker: {resp.status}"
                data = await resp.json()
                qa_bruker_id = data["member"]["id"]
                test_data["users"].append(qa_bruker_id)
                print(f"  ✓ Created QA bruker: {qa_bruker_id}")
            
            # Test 3: Login as QA bruker
            print("\n[A3] Login as QA bruker")
            async with session.post(
                f"{BASE_URL}/admin/auth/login",
                json={"email": QA_BRUKER_EMAIL, "password": QA_BRUKER_PASSWORD}
            ) as resp:
                assert resp.status == 200, f"Failed to login as QA bruker: {resp.status}"
                data = await resp.json()
                qa_bruker_token = data["token"]
                print(f"  ✓ Logged in as QA bruker, got token")
            
            # Test 4: All meetings endpoints with bruker token should return 401 (admin-only)
            print("\n[A4] Testing meetings endpoints with bruker token → 401 (admin-only)")
            for method, url in endpoints_to_test:
                if method == "GET":
                    async with session.get(f"{url}?key={qa_bruker_token}") as resp:
                        assert resp.status == 401, f"{method} {url} with bruker token should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} with bruker token → 401")
                elif method == "POST":
                    async with session.post(f"{url}?key={qa_bruker_token}", json={}) as resp:
                        assert resp.status == 401, f"{method} {url} with bruker token should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} with bruker token → 401")
                elif method == "PUT":
                    async with session.put(f"{url}?key={qa_bruker_token}", json={}) as resp:
                        assert resp.status == 401, f"{method} {url} with bruker token should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} with bruker token → 401")
                elif method == "DELETE":
                    async with session.delete(f"{url}?key={qa_bruker_token}") as resp:
                        assert resp.status == 401, f"{method} {url} with bruker token should return 401, got {resp.status}"
                        print(f"  ✓ {method} {url} with bruker token → 401")
            
            # ================================================================
            # (B) CRUD OPERATIONS
            # ================================================================
            print("\n" + "=" * 80)
            print("(B) CRUD OPERATIONS")
            print("=" * 80)
            
            # Test 1: Create QA person (without password, invite:false)
            print("\n[B1] Creating QA person (no password, invite:false)")
            async with session.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "email": QA_PERSON_EMAIL,
                    "name": "QA Møte Person",
                    "role": "admin",
                    "invite": False
                }
            ) as resp:
                assert resp.status in [200, 201], f"Failed to create QA person: {resp.status}"
                data = await resp.json()
                qa_person_id = data["member"]["id"]
                test_data["persons"].append(qa_person_id)
                print(f"  ✓ Created QA person: {qa_person_id}")
            
            # Test 2: Create meeting with notify:false
            print("\n[B2] Creating meeting with notify:false")
            meeting_datetime = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT10:00")
            async with session.post(
                f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
                json={
                    "title": "QA Styremøte",
                    "type": "styremote",
                    "datetime": meeting_datetime,
                    "agenda": [
                        {"text": "Punkt 1: Godkjenning av innkalling"},
                        {"text": "Punkt 2: Økonomi"}
                    ],
                    "attendees": [qa_person_id],
                    "notify": False
                }
            ) as resp:
                assert resp.status == 200, f"Failed to create meeting: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert data["meeting"]["status"] == "planlagt"
                assert data["innkalt"] == 0, f"Expected innkalt=0 (notify:false), got {data['innkalt']}"
                meeting_id = data["meeting"]["id"]
                test_data["meetings"].append(meeting_id)
                print(f"  ✓ Created meeting: {meeting_id}")
                print(f"  ✓ Status: {data['meeting']['status']}")
                print(f"  ✓ Innkalt: {data['innkalt']} (notify:false)")
            
            # Test 3: POST without title should return 400
            print("\n[B3] POST without title → 400")
            async with session.post(
                f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
                json={"type": "styremote"}
            ) as resp:
                assert resp.status == 400, f"Expected 400, got {resp.status}"
                print(f"  ✓ POST without title → 400")
            
            # Test 4: GET meetings - verify meeting exists with members
            print("\n[B4] GET meetings - verify meeting exists")
            async with session.get(f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get meetings: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert "meetings" in data
                assert "members" in data
                found = False
                for m in data["meetings"]:
                    if m["id"] == meeting_id:
                        found = True
                        assert m["title"] == "QA Styremøte"
                        assert m["type"] == "styremote"
                        assert len(m["agenda"]) == 2
                        break
                assert found, f"Meeting {meeting_id} not found in GET response"
                print(f"  ✓ Meeting found in GET response")
                print(f"  ✓ Members array present: {len(data['members'])} members")
            
            # Test 5: PUT - update referat and vedtak
            print("\n[B5] PUT - update referat and vedtak")
            async with session.put(
                f"{BASE_URL}/admin/meetings/{meeting_id}?key={ADMIN_KEY}",
                json={
                    "referat": "QA-referat: Møtet ble gjennomført som planlagt.",
                    "vedtak": [
                        {"text": "QA-vedtak 1: Godkjent"},
                        {"text": "QA-vedtak 2: Utsatt til neste møte"}
                    ]
                }
            ) as resp:
                assert resp.status == 200, f"Failed to update meeting: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert data["meeting"]["referat"] == "QA-referat: Møtet ble gjennomført som planlagt."
                assert len(data["meeting"]["vedtak"]) == 2
                print(f"  ✓ Updated referat and vedtak")
            
            # Test 6: PUT with empty title should return 400
            print("\n[B6] PUT with empty title → 400")
            async with session.put(
                f"{BASE_URL}/admin/meetings/{meeting_id}?key={ADMIN_KEY}",
                json={"title": ""}
            ) as resp:
                assert resp.status == 400, f"Expected 400, got {resp.status}"
                print(f"  ✓ PUT with empty title → 400")
            
            # ================================================================
            # (C) AKSJONSPUNKT (task with meetingId backlink)
            # ================================================================
            print("\n" + "=" * 80)
            print("(C) AKSJONSPUNKT")
            print("=" * 80)
            
            # Test 1: Create aksjonspunkt with notify:false
            print("\n[C1] Creating aksjonspunkt with notify:false")
            async with session.post(
                f"{BASE_URL}/admin/meetings/{meeting_id}/aksjonspunkt?key={ADMIN_KEY}",
                json={
                    "title": "QA Aksjonspunkt",
                    "notify": False
                }
            ) as resp:
                assert resp.status == 200, f"Failed to create aksjonspunkt: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                task_id = data["task"]["id"]
                test_data["tasks"].append(task_id)
                assert data["task"]["meetingId"] == meeting_id, f"Expected meetingId={meeting_id}, got {data['task']['meetingId']}"
                assert "møte" in data["task"]["labels"], f"Expected 'møte' in labels, got {data['task']['labels']}"
                print(f"  ✓ Created aksjonspunkt: {task_id}")
                print(f"  ✓ meetingId: {data['task']['meetingId']}")
                print(f"  ✓ labels: {data['task']['labels']}")
            
            # Test 2: GET meetings - verify taskIds contains task.id
            print("\n[C2] GET meetings - verify taskIds contains task.id")
            async with session.get(f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get meetings: {resp.status}"
                data = await resp.json()
                found = False
                for m in data["meetings"]:
                    if m["id"] == meeting_id:
                        assert task_id in m["taskIds"], f"Expected task {task_id} in taskIds, got {m['taskIds']}"
                        found = True
                        break
                assert found, f"Meeting {meeting_id} not found"
                print(f"  ✓ taskIds contains {task_id}")
            
            # Test 3: GET /admin/tasks - verify task exists
            print("\n[C3] GET /admin/tasks - verify task exists")
            async with session.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get tasks: {resp.status}"
                data = await resp.json()
                found = False
                for t in data["tasks"]:
                    if t["id"] == task_id:
                        assert t["meetingId"] == meeting_id
                        assert "møte" in t["labels"]
                        found = True
                        break
                assert found, f"Task {task_id} not found in GET /admin/tasks"
                print(f"  ✓ Task found in GET /admin/tasks")
            
            # ================================================================
            # (D) SEND-REFERAT
            # ================================================================
            print("\n" + "=" * 80)
            print("(D) SEND-REFERAT")
            print("=" * 80)
            
            # Test 1: Create new meeting WITHOUT referat/vedtak
            print("\n[D1] Creating new meeting without referat/vedtak")
            meeting2_datetime = (datetime.now() + timedelta(days=31)).strftime("%Y-%m-%dT14:00")
            async with session.post(
                f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
                json={
                    "title": "QA Ledermøte",
                    "type": "ledermote",
                    "datetime": meeting2_datetime,
                    "attendees": [qa_person_id],
                    "notify": False
                }
            ) as resp:
                assert resp.status == 200, f"Failed to create meeting2: {resp.status}"
                data = await resp.json()
                meeting2_id = data["meeting"]["id"]
                test_data["meetings"].append(meeting2_id)
                print(f"  ✓ Created meeting2: {meeting2_id}")
            
            # Test 2: POST send-referat without referat/vedtak → 400
            print("\n[D2] POST send-referat without referat/vedtak → 400")
            async with session.post(
                f"{BASE_URL}/admin/meetings/{meeting2_id}/send-referat?key={ADMIN_KEY}"
            ) as resp:
                assert resp.status == 400, f"Expected 400, got {resp.status}"
                data = await resp.json()
                assert "referat" in data["error"].lower() or "vedtak" in data["error"].lower()
                print(f"  ✓ POST send-referat without referat/vedtak → 400")
            
            # Test 3: Create person WITHOUT email
            print("\n[D3] Creating person without email")
            async with session.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Person Uten Epost",
                    "role": "admin",
                    "invite": False
                }
            ) as resp:
                assert resp.status in [200, 201], f"Failed to create person without email: {resp.status}"
                data = await resp.json()
                person_no_email_id = data["member"]["id"]
                test_data["persons"].append(person_no_email_id)
                print(f"  ✓ Created person without email: {person_no_email_id}")
            
            # Test 4: Update meeting2 with referat but attendee WITHOUT email → 400
            print("\n[D4] Update meeting2 with referat, attendee without email")
            async with session.put(
                f"{BASE_URL}/admin/meetings/{meeting2_id}?key={ADMIN_KEY}",
                json={
                    "referat": "QA-referat for ledermøte",
                    "attendees": [person_no_email_id]
                }
            ) as resp:
                assert resp.status == 200, f"Failed to update meeting2: {resp.status}"
                print(f"  ✓ Updated meeting2 with referat and attendee without email")
            
            # Test 5: POST send-referat with attendee without email → 400
            print("\n[D5] POST send-referat with attendee without email → 400")
            async with session.post(
                f"{BASE_URL}/admin/meetings/{meeting2_id}/send-referat?key={ADMIN_KEY}"
            ) as resp:
                assert resp.status == 400, f"Expected 400, got {resp.status}"
                data = await resp.json()
                assert "e-post" in data["error"].lower()
                print(f"  ✓ POST send-referat with attendee without email → 400")
            
            # Test 6: Update meeting2 with attendee with @example.com email
            print("\n[D6] Update meeting2 with attendee with @example.com email")
            async with session.put(
                f"{BASE_URL}/admin/meetings/{meeting2_id}?key={ADMIN_KEY}",
                json={"attendees": [qa_person_id]}
            ) as resp:
                assert resp.status == 200, f"Failed to update meeting2: {resp.status}"
                print(f"  ✓ Updated meeting2 with attendee {qa_person_id} ({QA_PERSON_EMAIL})")
            
            # Test 7: POST send-referat with @example.com attendee → 200
            print("\n[D7] POST send-referat with @example.com attendee → 200")
            async with session.post(
                f"{BASE_URL}/admin/meetings/{meeting2_id}/send-referat?key={ADMIN_KEY}"
            ) as resp:
                assert resp.status == 200, f"Failed to send referat: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert data["sendt"] >= 1, f"Expected sendt>=1, got {data['sendt']}"
                print(f"  ✓ POST send-referat → 200, sendt={data['sendt']}")
            
            # Test 8: Verify meeting2 has referatSendtAt
            print("\n[D8] Verify meeting2 has referatSendtAt")
            async with session.get(f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get meetings: {resp.status}"
                data = await resp.json()
                found = False
                for m in data["meetings"]:
                    if m["id"] == meeting2_id:
                        assert "referatSendtAt" in m, f"Expected referatSendtAt in meeting2"
                        assert m["referatSendtAt"] is not None
                        found = True
                        break
                assert found, f"Meeting2 {meeting2_id} not found"
                print(f"  ✓ meeting2 has referatSendtAt: {m['referatSendtAt']}")
            
            # ================================================================
            # (E) RECURRENCE (gjentakelse)
            # ================================================================
            print("\n" + "=" * 80)
            print("(E) RECURRENCE")
            print("=" * 80)
            
            # Test 1: Create meeting with recurrence
            print("\n[E1] Creating meeting with recurrence:monthly")
            meeting3_datetime = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%dT09:00")
            async with session.post(
                f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}",
                json={
                    "title": "QA Månedlig Møte",
                    "type": "annet",
                    "datetime": meeting3_datetime,
                    "recurrence": "monthly",
                    "attendees": [qa_person_id],
                    "agenda": [{"text": "Månedlig gjennomgang"}],
                    "notify": False
                }
            ) as resp:
                assert resp.status == 200, f"Failed to create meeting3: {resp.status}"
                data = await resp.json()
                meeting3_id = data["meeting"]["id"]
                test_data["meetings"].append(meeting3_id)
                print(f"  ✓ Created meeting3: {meeting3_id}")
            
            # Test 2: PUT status:avholdt with recurrence → nesteMote created
            print("\n[E2] PUT status:avholdt with recurrence → nesteMote created")
            async with session.put(
                f"{BASE_URL}/admin/meetings/{meeting3_id}?key={ADMIN_KEY}",
                json={"status": "avholdt"}
            ) as resp:
                assert resp.status == 200, f"Failed to update meeting3: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert "nesteMote" in data, f"Expected nesteMote in response"
                assert data["nesteMote"] is not None, f"Expected nesteMote to be created"
                neste_mote_id = data["nesteMote"]["id"]
                test_data["meetings"].append(neste_mote_id)
                assert data["nesteMote"]["status"] == "planlagt"
                # Verify datetime is +1 month
                original_date = datetime.fromisoformat(meeting3_datetime.replace("Z", ""))
                neste_date = datetime.fromisoformat(data["nesteMote"]["datetime"].replace("Z", ""))
                # Allow some flexibility in month calculation (28-31 days)
                days_diff = (neste_date - original_date).days
                assert 28 <= days_diff <= 31, f"Expected ~30 days difference, got {days_diff}"
                # Verify agenda is reset (done:false)
                assert len(data["nesteMote"]["agenda"]) == 1
                assert data["nesteMote"]["agenda"][0]["done"] == False
                print(f"  ✓ nesteMote created: {neste_mote_id}")
                print(f"  ✓ nesteMote status: {data['nesteMote']['status']}")
                print(f"  ✓ nesteMote datetime: {data['nesteMote']['datetime']} (+{days_diff} days)")
                print(f"  ✓ agenda reset with done:false")
            
            # ================================================================
            # (F) DELETE
            # ================================================================
            print("\n" + "=" * 80)
            print("(F) DELETE")
            print("=" * 80)
            
            # Test 1: DELETE meeting
            print("\n[F1] DELETE meeting")
            async with session.delete(f"{BASE_URL}/admin/meetings/{meeting_id}?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to delete meeting: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                print(f"  ✓ Deleted meeting: {meeting_id}")
            
            # Test 2: Verify meeting is gone from GET
            print("\n[F2] Verify meeting is gone from GET")
            async with session.get(f"{BASE_URL}/admin/meetings?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get meetings: {resp.status}"
                data = await resp.json()
                found = False
                for m in data["meetings"]:
                    if m["id"] == meeting_id:
                        found = True
                        break
                assert not found, f"Meeting {meeting_id} should be deleted"
                print(f"  ✓ Meeting {meeting_id} not found in GET (deleted)")
            
            # Test 3: Verify task still exists (tasks preserved)
            print("\n[F3] Verify task still exists (tasks preserved)")
            async with session.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get tasks: {resp.status}"
                data = await resp.json()
                found = False
                for t in data["tasks"]:
                    if t["id"] == task_id:
                        found = True
                        break
                assert found, f"Task {task_id} should still exist after meeting deletion"
                print(f"  ✓ Task {task_id} still exists (preserved)")
            
            # ================================================================
            # (G) PROFILE (MIN PROFIL)
            # ================================================================
            print("\n" + "=" * 80)
            print("(G) PROFILE (MIN PROFIL)")
            print("=" * 80)
            
            # Test 1: PUT profile with name and color as QA bruker
            print("\n[G1] PUT profile with name and color as QA bruker")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={qa_bruker_token}",
                json={
                    "name": "QA Endret Navn",
                    "color": "#0EA5E9"
                }
            ) as resp:
                assert resp.status == 200, f"Failed to update profile: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                assert data["member"]["name"] == "QA Endret Navn"
                assert data["member"]["color"] == "#0EA5E9"
                print(f"  ✓ Updated name: {data['member']['name']}")
                print(f"  ✓ Updated color: {data['member']['color']}")
            
            # Test 2: PUT profile with password change
            print("\n[G2] PUT profile with password change")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={qa_bruker_token}",
                json={
                    "password": QA_BRUKER_NEW_PASSWORD,
                    "currentPassword": QA_BRUKER_PASSWORD
                }
            ) as resp:
                assert resp.status == 200, f"Failed to change password: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True
                print(f"  ✓ Password changed successfully")
            
            # Test 3: Login with new password → 200
            print("\n[G3] Login with new password → 200")
            async with session.post(
                f"{BASE_URL}/admin/auth/login",
                json={"email": QA_BRUKER_EMAIL, "password": QA_BRUKER_NEW_PASSWORD}
            ) as resp:
                assert resp.status == 200, f"Failed to login with new password: {resp.status}"
                data = await resp.json()
                new_token = data["token"]
                print(f"  ✓ Login with new password successful")
            
            # Test 4: Login with old password → 401
            print("\n[G4] Login with old password → 401")
            async with session.post(
                f"{BASE_URL}/admin/auth/login",
                json={"email": QA_BRUKER_EMAIL, "password": QA_BRUKER_PASSWORD}
            ) as resp:
                assert resp.status == 401, f"Expected 401 with old password, got {resp.status}"
                print(f"  ✓ Login with old password → 401")
            
            # Test 5: PUT profile with wrong currentPassword → 401
            print("\n[G5] PUT profile with wrong currentPassword → 401")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={new_token}",
                json={
                    "password": "AnotherPassword123!",
                    "currentPassword": "WrongPassword123!"
                }
            ) as resp:
                assert resp.status == 401, f"Expected 401 with wrong currentPassword, got {resp.status}"
                print(f"  ✓ PUT profile with wrong currentPassword → 401")
            
            # Test 6: PUT profile with password <8 chars → 400
            print("\n[G6] PUT profile with password <8 chars → 400")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={new_token}",
                json={
                    "password": "Short1!",
                    "currentPassword": QA_BRUKER_NEW_PASSWORD
                }
            ) as resp:
                assert resp.status == 400, f"Expected 400 with short password, got {resp.status}"
                print(f"  ✓ PUT profile with password <8 chars → 400")
            
            # Test 7: PUT profile with empty body → 400
            print("\n[G7] PUT profile with empty body → 400")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={new_token}",
                json={}
            ) as resp:
                assert resp.status == 400, f"Expected 400 with empty body, got {resp.status}"
                print(f"  ✓ PUT profile with empty body → 400")
            
            # Test 8: PUT profile with master key (not session) → 400
            print("\n[G8] PUT profile with master key (not session) → 400")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile?key={ADMIN_KEY}",
                json={"name": "Should Fail"}
            ) as resp:
                assert resp.status == 400, f"Expected 400 with master key, got {resp.status}"
                data = await resp.json()
                assert "masternøkkel" in data["error"].lower() or "personlig" in data["error"].lower()
                print(f"  ✓ PUT profile with master key → 400")
            
            # Test 9: PUT profile without auth → 401
            print("\n[G9] PUT profile without auth → 401")
            async with session.put(
                f"{BASE_URL}/admin/auth/profile",
                json={"name": "Should Fail"}
            ) as resp:
                assert resp.status == 401, f"Expected 401 without auth, got {resp.status}"
                print(f"  ✓ PUT profile without auth → 401")
            
            # ================================================================
            # (H) MANDATORY CLEANUP
            # ================================================================
            print("\n" + "=" * 80)
            print("(H) MANDATORY CLEANUP")
            print("=" * 80)
            
            # Delete all QA meetings
            print("\n[H1] Deleting all QA meetings")
            for meeting_id in test_data["meetings"]:
                try:
                    result = db.meetings.delete_one({"id": meeting_id})
                    if result.deleted_count > 0:
                        print(f"  ✓ Deleted meeting: {meeting_id}")
                except Exception as e:
                    print(f"  ⚠ Failed to delete meeting {meeting_id}: {e}")
            
            # Delete all QA tasks
            print("\n[H2] Deleting all QA tasks")
            for task_id in test_data["tasks"]:
                try:
                    result = db.tasks.delete_one({"id": task_id})
                    if result.deleted_count > 0:
                        print(f"  ✓ Deleted task: {task_id}")
                except Exception as e:
                    print(f"  ⚠ Failed to delete task {task_id}: {e}")
            
            # Delete all QA users/persons
            print("\n[H3] Deleting all QA users/persons")
            all_qa_users = test_data["users"] + test_data["persons"]
            for user_id in all_qa_users:
                try:
                    result = db.admin_users.delete_one({"id": user_id})
                    if result.deleted_count > 0:
                        print(f"  ✓ Deleted user: {user_id}")
                except Exception as e:
                    print(f"  ⚠ Failed to delete user {user_id}: {e}")
            
            # Delete auth_tokens for QA users
            print("\n[H4] Deleting auth_tokens for QA users")
            try:
                result = db.auth_tokens.delete_many({"userId": {"$in": all_qa_users}})
                print(f"  ✓ Deleted {result.deleted_count} auth_tokens")
            except Exception as e:
                print(f"  ⚠ Failed to delete auth_tokens: {e}")
            
            # Verify 0 QA data
            print("\n[H5] Verifying 0 QA data remains")
            
            # Check meetings
            qa_meetings = list(db.meetings.find({"title": {"$regex": "^QA "}}))
            assert len(qa_meetings) == 0, f"Found {len(qa_meetings)} QA meetings remaining"
            print(f"  ✓ 0 QA meetings in database")
            
            # Check tasks with meetingId or title starting with QA
            qa_tasks = list(db.tasks.find({"$or": [
                {"title": {"$regex": "^QA "}},
                {"meetingId": {"$exists": True, "$ne": None}}
            ]}))
            # Filter to only QA tasks (meetingId might exist for non-QA tasks)
            qa_tasks = [t for t in qa_tasks if t.get("title", "").startswith("QA ")]
            assert len(qa_tasks) == 0, f"Found {len(qa_tasks)} QA tasks remaining"
            print(f"  ✓ 0 QA tasks in database")
            
            # Check users
            qa_users = list(db.admin_users.find({"email": {"$regex": "^qa-mote"}}))
            assert len(qa_users) == 0, f"Found {len(qa_users)} QA users remaining"
            print(f"  ✓ 0 QA users in database")
            
            # Check auth_tokens
            qa_tokens = list(db.auth_tokens.find({"userId": {"$in": all_qa_users}}))
            assert len(qa_tokens) == 0, f"Found {len(qa_tokens)} QA auth_tokens remaining"
            print(f"  ✓ 0 QA auth_tokens in database")
            
            # ================================================================
            # (I) REGRESSION
            # ================================================================
            print("\n" + "=" * 80)
            print("(I) REGRESSION")
            print("=" * 80)
            
            # Test 1: Owner login → 200
            print("\n[I1] Owner login → 200")
            async with session.post(
                f"{BASE_URL}/admin/auth/login",
                json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}
            ) as resp:
                assert resp.status == 200, f"Failed to login as owner: {resp.status}"
                data = await resp.json()
                assert "token" in data
                print(f"  ✓ Owner login successful")
            
            # Test 2: GET /admin/tasks → 200
            print("\n[I2] GET /admin/tasks → 200")
            async with session.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}") as resp:
                assert resp.status == 200, f"Failed to get tasks: {resp.status}"
                data = await resp.json()
                assert "tasks" in data
                print(f"  ✓ GET /admin/tasks → 200, {len(data['tasks'])} tasks")
            
            # Test 3: POST /admin/auth/glemt with unknown QA email → 200 ok:true
            print("\n[I3] POST /admin/auth/glemt with unknown QA email → 200 ok:true")
            async with session.post(
                f"{BASE_URL}/admin/auth/glemt",
                json={"email": "ukjent-qa@example.com"}
            ) as resp:
                assert resp.status == 200, f"Failed to call glemt: {resp.status}"
                data = await resp.json()
                assert data["ok"] == True, f"Expected ok:true, got {data}"
                print(f"  ✓ POST /admin/auth/glemt with unknown QA email → 200 ok:true")
            
            print("\n" + "=" * 80)
            print("ALL TESTS PASSED ✓")
            print("=" * 80)
            
        except AssertionError as e:
            print(f"\n❌ TEST FAILED: {e}")
            raise
        except Exception as e:
            print(f"\n❌ UNEXPECTED ERROR: {e}")
            raise
        finally:
            mongo_client.close()

if __name__ == "__main__":
    asyncio.run(main())
