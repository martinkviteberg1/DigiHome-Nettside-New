#!/usr/bin/env python3
"""
Backend test for MØTETILGANG + VERV access model in DigiHome Admin.

Tests the new meeting access control system where:
1. admin_users have tittel (verv/title) and moteTilgang[] (meeting types)
2. GET /admin/meetings filters for non-admin users
3. GET /admin/meetings/:id/protokoll allows users with read access
4. POST/PUT/DELETE meetings are admin-only

CRITICAL EMAIL SAFETY:
- SendGrid is LIVE
- Use ONLY @example.com addresses (blocked by isUndeliverableTestAddress)
- Use notify:false on POST /admin/meetings
- NEVER call send-referat with success expectation (only 401 test with user token)
"""

import asyncio
import httpx
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://conversion-optimize-7.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test data
QA_PERSON_A = {
    "name": "QA Tilgang A",
    "email": "qa-tilgang-a@example.com",
    "role": "bruker",
    "password": "QAtilgang123!",
    "tittel": "Styremedlem",
    "moteTilgang": ["styremote"]
}

QA_PERSON_B = {
    "name": "QA Tilgang B",
    "email": "qa-tilgang-b@example.com",
    "role": "bruker",
    "password": "QAtilgang123!"
    # No moteTilgang
}

QA_PERSON_C = {
    "name": "QA Verv C",
    "email": "qa-verv-c@example.com",
    "role": "bruker",
    "tittel": "Daglig leder",
    "moteTilgang": ["styremote", "ledermote", "ugyldig-type"]  # Invalid type should be filtered
}

# Test state
test_state = {
    "person_a_id": None,
    "person_b_id": None,
    "person_c_id": None,
    "token_a": None,
    "token_b": None,
    "meeting_m1_id": None,
    "meeting_m2_id": None,
    "meeting_m3_id": None,
}

async def run_tests():
    """Run all tests for MØTETILGANG + VERV."""
    print("=" * 80)
    print("TESTING: MØTETILGANG + VERV ACCESS MODEL")
    print("=" * 80)
    print(f"Base URL: {API_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # (A) SETUP
            print("=" * 80)
            print("(A) SETUP: Create QA persons and meetings")
            print("=" * 80)
            await test_a_setup(client)
            
            # (B) FILTERING
            print("\n" + "=" * 80)
            print("(B) FILTERING: GET /admin/meetings with different tokens")
            print("=" * 80)
            await test_b_filtering(client)
            
            # (C) WRITE PROTECTION
            print("\n" + "=" * 80)
            print("(C) WRITE PROTECTION: User token should get 401 on all write operations")
            print("=" * 80)
            await test_c_write_protection(client)
            
            # (D) PROTOCOL READ ACCESS
            print("\n" + "=" * 80)
            print("(D) PROTOCOL READ ACCESS: GET /admin/meetings/:id/protokoll")
            print("=" * 80)
            await test_d_protocol_access(client)
            
            # (E) USER FIELDS
            print("\n" + "=" * 80)
            print("(E) USER FIELDS: tittel and moteTilgang validation")
            print("=" * 80)
            await test_e_user_fields(client)
            
            # (F) REGRESSION
            print("\n" + "=" * 80)
            print("(F) REGRESSION: Existing endpoints still work")
            print("=" * 80)
            await test_f_regression(client)
            
            # (G) MANDATORY CLEANUP
            print("\n" + "=" * 80)
            print("(G) MANDATORY CLEANUP: Delete all QA data")
            print("=" * 80)
            await test_g_cleanup(client)
            
            print("\n" + "=" * 80)
            print("✅ ALL TESTS PASSED")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ TEST FAILED: {e}")
            raise

async def test_a_setup(client):
    """(A) SETUP: Create QA persons and meetings."""
    print("\n(A1) Create QA person A with moteTilgang=['styremote']")
    resp = await client.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json=QA_PERSON_A)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    test_state["person_a_id"] = data["member"]["id"]
    print(f"✓ Person A created with id: {test_state['person_a_id']}")
    
    print("\n(A2) Create QA person B without moteTilgang")
    resp = await client.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json=QA_PERSON_B)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    test_state["person_b_id"] = data["member"]["id"]
    print(f"✓ Person B created with id: {test_state['person_b_id']}")
    
    print("\n(A3) Login person A to get token")
    resp = await client.post(f"{API_URL}/admin/auth/login", json={
        "email": QA_PERSON_A["email"],
        "password": QA_PERSON_A["password"]
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, f"Expected token in response, got {data}"
    test_state["token_a"] = data["token"]
    print(f"✓ Person A logged in, token: {test_state['token_a'][:20]}...")
    
    print("\n(A4) Login person B to get token")
    resp = await client.post(f"{API_URL}/admin/auth/login", json={
        "email": QA_PERSON_B["email"],
        "password": QA_PERSON_B["password"]
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, f"Expected token in response, got {data}"
    test_state["token_b"] = data["token"]
    print(f"✓ Person B logged in, token: {test_state['token_b'][:20]}...")
    
    print("\n(A5) Create meeting M1 (type: styremote, no attendees)")
    resp = await client.post(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", json={
        "title": "QA Styremøte X",
        "type": "styremote",
        "datetime": "2026-12-30T10:00",
        "attendees": [],
        "notify": False
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    test_state["meeting_m1_id"] = data["meeting"]["id"]
    print(f"✓ Meeting M1 created with id: {test_state['meeting_m1_id']}")
    
    print("\n(A6) Create meeting M2 (type: ledermote, attendees: [B])")
    resp = await client.post(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", json={
        "title": "QA Ledermøte X",
        "type": "ledermote",
        "datetime": "2026-12-30T11:00",
        "attendees": [test_state["person_b_id"]],
        "notify": False
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    test_state["meeting_m2_id"] = data["meeting"]["id"]
    print(f"✓ Meeting M2 created with id: {test_state['meeting_m2_id']}")
    
    print("\n(A7) Create meeting M3 (type: annet, no attendees)")
    resp = await client.post(f"{API_URL}/admin/meetings?key={ADMIN_KEY}", json={
        "title": "QA Annet X",
        "type": "annet",
        "datetime": "2026-12-30T12:00",
        "attendees": [],
        "notify": False
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    test_state["meeting_m3_id"] = data["meeting"]["id"]
    print(f"✓ Meeting M3 created with id: {test_state['meeting_m3_id']}")

async def test_b_filtering(client):
    """(B) FILTERING: GET /admin/meetings with different tokens."""
    print("\n(B1) GET /admin/meetings with person A token (has moteTilgang=['styremote'])")
    resp = await client.get(f"{API_URL}/admin/meetings?key={test_state['token_a']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    meetings = data["meetings"]
    meeting_ids = [m["id"] for m in meetings]
    print(f"✓ Person A sees {len(meetings)} meetings: {meeting_ids}")
    
    # Person A should see M1 (type access: styremote)
    assert test_state["meeting_m1_id"] in meeting_ids, f"Person A should see M1 (styremote), but got {meeting_ids}"
    print(f"✓ Person A sees M1 (type access: styremote)")
    
    # Person A should NOT see M2 (ledermote, not attendee, no type access)
    assert test_state["meeting_m2_id"] not in meeting_ids, f"Person A should NOT see M2 (ledermote), but got {meeting_ids}"
    print(f"✓ Person A does NOT see M2 (ledermote, no access)")
    
    # Person A should NOT see M3 (annet, not attendee, no type access)
    assert test_state["meeting_m3_id"] not in meeting_ids, f"Person A should NOT see M3 (annet), but got {meeting_ids}"
    print(f"✓ Person A does NOT see M3 (annet, no access)")
    
    print("\n(B2) GET /admin/meetings with person B token (no moteTilgang, but attendee of M2)")
    resp = await client.get(f"{API_URL}/admin/meetings?key={test_state['token_b']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    meetings = data["meetings"]
    meeting_ids = [m["id"] for m in meetings]
    print(f"✓ Person B sees {len(meetings)} meetings: {meeting_ids}")
    
    # Person B should see M2 (attendee)
    assert test_state["meeting_m2_id"] in meeting_ids, f"Person B should see M2 (attendee), but got {meeting_ids}"
    print(f"✓ Person B sees M2 (attendee)")
    
    # Person B should NOT see M1 (styremote, not attendee, no type access)
    assert test_state["meeting_m1_id"] not in meeting_ids, f"Person B should NOT see M1 (styremote), but got {meeting_ids}"
    print(f"✓ Person B does NOT see M1 (styremote, no access)")
    
    # Person B should NOT see M3 (annet, not attendee, no type access)
    assert test_state["meeting_m3_id"] not in meeting_ids, f"Person B should NOT see M3 (annet), but got {meeting_ids}"
    print(f"✓ Person B does NOT see M3 (annet, no access)")
    
    print("\n(B3) GET /admin/meetings with master key (admin sees all)")
    resp = await client.get(f"{API_URL}/admin/meetings?key={ADMIN_KEY}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    meetings = data["meetings"]
    meeting_ids = [m["id"] for m in meetings]
    print(f"✓ Admin sees {len(meetings)} meetings (including all QA meetings)")
    
    # Admin should see all 3 QA meetings
    assert test_state["meeting_m1_id"] in meeting_ids, f"Admin should see M1, but got {meeting_ids}"
    assert test_state["meeting_m2_id"] in meeting_ids, f"Admin should see M2, but got {meeting_ids}"
    assert test_state["meeting_m3_id"] in meeting_ids, f"Admin should see M3, but got {meeting_ids}"
    print(f"✓ Admin sees all 3 QA meetings (M1, M2, M3)")

async def test_c_write_protection(client):
    """(C) WRITE PROTECTION: User token should get 401 on all write operations."""
    print("\n(C1) POST /admin/meetings with person A token (expect 401)")
    resp = await client.post(f"{API_URL}/admin/meetings?key={test_state['token_a']}", json={
        "title": "QA hack",
        "type": "styremote",
        "notify": False
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ POST /admin/meetings with user token returns 401")
    
    print("\n(C2) PUT /admin/meetings/:id with person A token (expect 401)")
    resp = await client.put(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}?key={test_state['token_a']}", json={
        "title": "hacket"
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ PUT /admin/meetings/:id with user token returns 401")
    
    print("\n(C3) DELETE /admin/meetings/:id with person A token (expect 401)")
    resp = await client.delete(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}?key={test_state['token_a']}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ DELETE /admin/meetings/:id with user token returns 401")
    
    print("\n(C4) POST /admin/meetings/:id/aksjonspunkt with person A token (expect 401)")
    resp = await client.post(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}/aksjonspunkt?key={test_state['token_a']}", json={
        "title": "QA hack-aksjon",
        "notify": False
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ POST /admin/meetings/:id/aksjonspunkt with user token returns 401")
    
    print("\n(C5) POST /admin/meetings/:id/send-referat with person A token (expect 401)")
    resp = await client.post(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}/send-referat?key={test_state['token_a']}", json={})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ POST /admin/meetings/:id/send-referat with user token returns 401")
    
    print("\n(C6) Verify M1 still exists with unchanged title (using master key)")
    resp = await client.get(f"{API_URL}/admin/meetings?key={ADMIN_KEY}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    meetings = data["meetings"]
    m1 = next((m for m in meetings if m["id"] == test_state["meeting_m1_id"]), None)
    assert m1 is not None, f"M1 should still exist, but not found in {[m['id'] for m in meetings]}"
    assert m1["title"] == "QA Styremøte X", f"M1 title should be unchanged, but got {m1['title']}"
    print(f"✓ M1 still exists with unchanged title: '{m1['title']}'")

async def test_d_protocol_access(client):
    """(D) PROTOCOL READ ACCESS: GET /admin/meetings/:id/protokoll."""
    print("\n(D1) GET /admin/meetings/:id/protokoll for M1 with person A token (has type access)")
    resp = await client.get(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}/protokoll?key={test_state['token_a']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert resp.headers["content-type"] == "application/pdf", f"Expected application/pdf, got {resp.headers['content-type']}"
    body = resp.content
    assert body.startswith(b"%PDF-"), f"Expected PDF body to start with %PDF-, got {body[:10]}"
    print(f"✓ Person A can access M1 protokoll (type access: styremote), Content-Type: application/pdf, body starts with %PDF-")
    
    print("\n(D2) GET /admin/meetings/:id/protokoll for M1 with person B token (no access, expect 401)")
    resp = await client.get(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}/protokoll?key={test_state['token_b']}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ Person B cannot access M1 protokoll (no access), returns 401")
    
    print("\n(D3) GET /admin/meetings/:id/protokoll for M2 with person B token (attendee)")
    resp = await client.get(f"{API_URL}/admin/meetings/{test_state['meeting_m2_id']}/protokoll?key={test_state['token_b']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert resp.headers["content-type"] == "application/pdf", f"Expected application/pdf, got {resp.headers['content-type']}"
    body = resp.content
    assert body.startswith(b"%PDF-"), f"Expected PDF body to start with %PDF-, got {body[:10]}"
    print(f"✓ Person B can access M2 protokoll (attendee), Content-Type: application/pdf, body starts with %PDF-")
    
    print("\n(D4) GET /admin/meetings/:id/protokoll for M2 with person A token (no access, expect 401)")
    resp = await client.get(f"{API_URL}/admin/meetings/{test_state['meeting_m2_id']}/protokoll?key={test_state['token_a']}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ Person A cannot access M2 protokoll (no access), returns 401")
    
    print("\n(D5) GET /admin/meetings/:id/protokoll without key (expect 401)")
    resp = await client.get(f"{API_URL}/admin/meetings/{test_state['meeting_m1_id']}/protokoll")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ GET protokoll without key returns 401")

async def test_e_user_fields(client):
    """(E) USER FIELDS: tittel and moteTilgang validation."""
    print("\n(E1) POST /admin/users with tittel and moteTilgang (including invalid type)")
    resp = await client.post(f"{API_URL}/admin/users?key={ADMIN_KEY}", json=QA_PERSON_C)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    member = data["member"]
    test_state["person_c_id"] = member["id"]
    print(f"✓ Person C created with id: {test_state['person_c_id']}")
    
    # Verify tittel
    assert member["tittel"] == "Daglig leder", f"Expected tittel='Daglig leder', got {member.get('tittel')}"
    print(f"✓ Person C has tittel: '{member['tittel']}'")
    
    # Verify moteTilgang (invalid type should be filtered)
    assert "moteTilgang" in member, f"Expected moteTilgang in member, got {member.keys()}"
    mote_tilgang = member["moteTilgang"]
    assert isinstance(mote_tilgang, list), f"Expected moteTilgang to be list, got {type(mote_tilgang)}"
    assert "styremote" in mote_tilgang, f"Expected 'styremote' in moteTilgang, got {mote_tilgang}"
    assert "ledermote" in mote_tilgang, f"Expected 'ledermote' in moteTilgang, got {mote_tilgang}"
    assert "ugyldig-type" not in mote_tilgang, f"Expected 'ugyldig-type' to be filtered out, but got {mote_tilgang}"
    print(f"✓ Person C has moteTilgang: {mote_tilgang} (invalid type 'ugyldig-type' filtered out)")
    
    print("\n(E2) PUT /admin/users/:id to update tittel and moteTilgang")
    resp = await client.put(f"{API_URL}/admin/users/{test_state['person_c_id']}?key={ADMIN_KEY}", json={
        "tittel": "Styreleder",
        "moteTilgang": ["annet"]
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    print(f"✓ Person C updated")
    
    print("\n(E3) GET /admin/users to verify all members have tittel and moteTilgang fields")
    resp = await client.get(f"{API_URL}/admin/users?key={ADMIN_KEY}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    members = data["members"]
    
    # Find person C
    person_c = next((m for m in members if m["id"] == test_state["person_c_id"]), None)
    assert person_c is not None, f"Person C not found in members"
    assert person_c["tittel"] == "Styreleder", f"Expected tittel='Styreleder', got {person_c.get('tittel')}"
    assert person_c["moteTilgang"] == ["annet"], f"Expected moteTilgang=['annet'], got {person_c.get('moteTilgang')}"
    print(f"✓ Person C has updated tittel: '{person_c['tittel']}' and moteTilgang: {person_c['moteTilgang']}")
    
    # Verify all members have the fields
    for member in members:
        assert "tittel" in member, f"Member {member['id']} missing tittel field"
        assert "moteTilgang" in member, f"Member {member['id']} missing moteTilgang field"
    print(f"✓ All {len(members)} members have tittel and moteTilgang fields")
    
    print("\n(E4) PUT /admin/users/:id with person A token (bruker role, expect 401)")
    resp = await client.put(f"{API_URL}/admin/users/{test_state['person_c_id']}?key={test_state['token_a']}", json={
        "tittel": "hack"
    })
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ PUT /admin/users/:id with bruker token returns 401 (admin-only)")

async def test_f_regression(client):
    """(F) REGRESSION: Existing endpoints still work."""
    print("\n(F1) GET /admin/tasks with person A token (bruker has task access)")
    resp = await client.get(f"{API_URL}/admin/tasks?key={test_state['token_a']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["ok"] is True, f"Expected ok:true, got {data}"
    print(f"✓ GET /admin/tasks with bruker token returns 200 (bruker has task access)")
    
    print("\n(F2) GET /admin/meetings without key (expect 401)")
    resp = await client.get(f"{API_URL}/admin/meetings")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print(f"✓ GET /admin/meetings without key returns 401")
    
    print("\n(F3) Owner login from test_credentials.md")
    resp = await client.post(f"{API_URL}/admin/auth/login", json={
        "email": "martin@kviteberg.no",
        "password": "Pyramiden2025##"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "token" in data, f"Expected token in response, got {data}"
    print(f"✓ Owner login successful")

async def test_g_cleanup(client):
    """(G) MANDATORY CLEANUP: Delete all QA data."""
    print("\n(G1) Delete QA meetings (M1, M2, M3)")
    for meeting_id in [test_state["meeting_m1_id"], test_state["meeting_m2_id"], test_state["meeting_m3_id"]]:
        resp = await client.delete(f"{API_URL}/admin/meetings/{meeting_id}?key={ADMIN_KEY}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"✓ Deleted meeting {meeting_id}")
    
    print("\n(G2) Delete QA persons (A, B, C)")
    for person_id in [test_state["person_a_id"], test_state["person_b_id"], test_state["person_c_id"]]:
        resp = await client.delete(f"{API_URL}/admin/users/{person_id}?key={ADMIN_KEY}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"✓ Deleted person {person_id}")
    
    print("\n(G3) Verify 0 QA data in MongoDB")
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    
    # Check admin_users
    qa_users = list(db.admin_users.find({"name": {"$regex": "^QA "}}))
    assert len(qa_users) == 0, f"Expected 0 QA users, but found {len(qa_users)}: {[u['name'] for u in qa_users]}"
    print(f"✓ admin_users: 0 QA users (verified via MongoDB)")
    
    # Check meetings
    qa_meetings = list(db.meetings.find({"title": {"$regex": "^QA "}}))
    assert len(qa_meetings) == 0, f"Expected 0 QA meetings, but found {len(qa_meetings)}: {[m['title'] for m in qa_meetings]}"
    print(f"✓ meetings: 0 QA meetings (verified via MongoDB)")
    
    mongo_client.close()
    print(f"✓ All QA data cleaned up successfully")

if __name__ == "__main__":
    asyncio.run(run_tests())
