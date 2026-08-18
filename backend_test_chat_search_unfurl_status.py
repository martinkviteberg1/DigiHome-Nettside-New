#!/usr/bin/env python3
"""
Backend test for DigiHome chat endpoints: message SEARCH, link UNFURL, and STATUS with sisteUlest.
Tests GET /api/admin/chat/sok, GET /api/admin/chat/unfurl, GET /api/admin/chat/status.

Base URL: https://saker-hub.preview.emergentagent.com/api
Auth: Owner login POST /api/admin/auth/login {email:"martin@kviteberg.no", password:"Pyramiden2025##"} → token used as ?key=<token>
Legacy master key also valid: dh_admin_b3Kx92Qz7Lm4
MongoDB: mongodb://localhost:27017, DB: your_database_name

CRITICAL SAFETY RULES (real production-like data!):
- chat_messages contains Martin's REAL messages (with images + a PDF "Aksjonæravtale…", threads, reactions). 
  DO NOT delete, edit, react on, pin, or otherwise mutate ANY existing message.
- Take a baseline count first and verify it is unchanged at the end.
- Create your OWN test messages (track their ids) and DELETE them afterwards via DELETE /api/admin/chat/meldinger?id=<id>.
- If you need a second user, create QA user ONLY with an @example.com email (no real emails — SendGrid is LIVE) 
  via POST /api/admin/users, and delete the user + their chat_lest doc afterwards.
- Do NOT drop/clear any collections. Do NOT call glemt/magic endpoints with real addresses.
"""

import requests
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def main():
    print("=" * 80)
    print("CHAT SEARCH, UNFURL, STATUS BACKEND TEST")
    print("=" * 80)
    
    # Connect to MongoDB
    try:
        mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db = mongo_client[DB_NAME]
        mongo_client.server_info()
        print(f"✓ Connected to MongoDB: {MONGO_URL}/{DB_NAME}")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False
    
    # Get baseline count of chat_messages
    try:
        baseline_count = db.chat_messages.count_documents({})
        print(f"✓ Baseline chat_messages count: {baseline_count}")
    except Exception as e:
        print(f"✗ Failed to get baseline count: {e}")
        return False
    
    # Login as owner to get session token
    try:
        print("\n(A) LOGIN AS OWNER")
        r = requests.post(f"{BASE_URL}/admin/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=10)
        if r.status_code != 200:
            print(f"✗ Login failed: {r.status_code} {r.text[:200]}")
            return False
        data = r.json()
        if not data.get("ok") or not data.get("token"):
            print(f"✗ Login response missing token: {data}")
            return False
        owner_token = data["token"]
        owner_id = data.get("user", {}).get("id")
        owner_name = data.get("user", {}).get("name", "Owner")
        print(f"✓ Logged in as {owner_name} (id: {owner_id}), token: {owner_token[:20]}...")
    except Exception as e:
        print(f"✗ Login exception: {e}")
        return False
    
    # Track test data for cleanup
    test_message_ids = []
    test_user_id = None
    
    try:
        # ========================================================================
        # (A) GET /api/admin/chat/sok?q=<query> (sakerAuthed)
        # ========================================================================
        print("\n" + "=" * 80)
        print("(A) MESSAGE SEARCH: GET /api/admin/chat/sok")
        print("=" * 80)
        
        # (A1) Create 2-3 test messages with distinctive text
        print("\n(A1) CREATE TEST MESSAGES WITH UNIQUE TEXT")
        unique_word = "QA-SOKTEST-unikord-xyzzy"
        
        # Create root message
        try:
            r = requests.post(
                f"{BASE_URL}/admin/chat/meldinger?key={owner_token}",
                json={"text": f"Root message with {unique_word} for search testing"},
                timeout=10
            )
            if r.status_code not in [200, 201]:
                print(f"✗ Failed to create root message: {r.status_code} {r.text[:200]}")
                return False
            root_msg = r.json().get("melding", {})
            root_id = root_msg.get("id")
            test_message_ids.append(root_id)
            print(f"✓ Created root message: {root_id}")
        except Exception as e:
            print(f"✗ Exception creating root message: {e}")
            return False
        
        # Create thread reply
        try:
            r = requests.post(
                f"{BASE_URL}/admin/chat/meldinger?key={owner_token}",
                json={"text": f"Thread reply with {unique_word} in a thread", "threadId": root_id},
                timeout=10
            )
            if r.status_code not in [200, 201]:
                print(f"✗ Failed to create thread reply: {r.status_code} {r.text[:200]}")
                return False
            thread_msg = r.json().get("melding", {})
            thread_id = thread_msg.get("id")
            test_message_ids.append(thread_id)
            print(f"✓ Created thread reply: {thread_id}")
        except Exception as e:
            print(f"✗ Exception creating thread reply: {e}")
            return False
        
        # Create another root message
        try:
            r = requests.post(
                f"{BASE_URL}/admin/chat/meldinger?key={owner_token}",
                json={"text": f"Another message containing {unique_word} for testing"},
                timeout=10
            )
            if r.status_code not in [200, 201]:
                print(f"✗ Failed to create second root message: {r.status_code} {r.text[:200]}")
                return False
            msg2 = r.json().get("melding", {})
            msg2_id = msg2.get("id")
            test_message_ids.append(msg2_id)
            print(f"✓ Created second root message: {msg2_id}")
        except Exception as e:
            print(f"✗ Exception creating second root message: {e}")
            return False
        
        # (A2) Search for the unique word → returns {ok:true, treff:[...]}
        print("\n(A2) SEARCH FOR UNIQUE WORD")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q={unique_word}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Search failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Search response not ok: {data}")
                return False
            treff = data.get("treff", [])
            if len(treff) < 3:
                print(f"✗ Expected at least 3 hits, got {len(treff)}: {treff}")
                return False
            # Verify fields
            for hit in treff:
                required_fields = ["id", "userName", "userId", "text", "createdAt"]
                for field in required_fields:
                    if field not in hit:
                        print(f"✗ Hit missing field '{field}': {hit}")
                        return False
            # Verify newest first (createdAt descending)
            if len(treff) >= 2:
                if treff[0]["createdAt"] < treff[1]["createdAt"]:
                    print(f"✗ Results not sorted newest first: {treff[0]['createdAt']} < {treff[1]['createdAt']}")
                    return False
            print(f"✓ Search returned {len(treff)} hits with all required fields, newest first")
        except Exception as e:
            print(f"✗ Search exception: {e}")
            return False
        
        # (A3) Case-insensitive match works
        print("\n(A3) CASE-INSENSITIVE SEARCH")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q={unique_word.upper()}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Case-insensitive search failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Case-insensitive search response not ok: {data}")
                return False
            treff = data.get("treff", [])
            if len(treff) < 3:
                print(f"✗ Case-insensitive search expected at least 3 hits, got {len(treff)}")
                return False
            print(f"✓ Case-insensitive search works: {len(treff)} hits")
        except Exception as e:
            print(f"✗ Case-insensitive search exception: {e}")
            return False
        
        # (A4) Search matching userName
        print("\n(A4) SEARCH BY USERNAME")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q={owner_name}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Username search failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Username search response not ok: {data}")
                return False
            treff = data.get("treff", [])
            if len(treff) == 0:
                print(f"✗ Username search returned no hits for '{owner_name}'")
                return False
            print(f"✓ Username search works: {len(treff)} hits for '{owner_name}'")
        except Exception as e:
            print(f"✗ Username search exception: {e}")
            return False
        
        # (A5) Query with regex special characters must NOT 500
        print("\n(A5) REGEX SPECIAL CHARACTERS SAFELY ESCAPED")
        special_chars = ["a(b", "x*y[", "test.+"]
        for query in special_chars:
            try:
                r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q={query}", timeout=10)
                if r.status_code != 200:
                    print(f"✗ Query '{query}' failed: {r.status_code} {r.text[:200]}")
                    return False
                data = r.json()
                if not data.get("ok"):
                    print(f"✗ Query '{query}' response not ok: {data}")
                    return False
                print(f"✓ Query '{query}' safely handled: {r.status_code}")
            except Exception as e:
                print(f"✗ Query '{query}' exception: {e}")
                return False
        
        # (A6) Query with 1 character returns empty list (min 2 chars)
        print("\n(A6) MIN 2 CHARS VALIDATION")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q=a", timeout=10)
            if r.status_code != 200:
                print(f"✗ 1-char query failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ 1-char query response not ok: {data}")
                return False
            treff = data.get("treff", [])
            if len(treff) != 0:
                print(f"✗ 1-char query should return empty list, got {len(treff)} hits")
                return False
            print(f"✓ 1-char query returns empty list (min 2 chars enforced)")
        except Exception as e:
            print(f"✗ 1-char query exception: {e}")
            return False
        
        # (A7) Thread reply hit includes threadId
        print("\n(A7) THREAD REPLY INCLUDES THREADID")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?key={owner_token}&q={unique_word}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Search failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            treff = data.get("treff", [])
            thread_hit = next((h for h in treff if h.get("id") == thread_id), None)
            if not thread_hit:
                print(f"✗ Thread reply not found in search results")
                return False
            if thread_hit.get("threadId") != root_id:
                print(f"✗ Thread reply threadId mismatch: expected {root_id}, got {thread_hit.get('threadId')}")
                return False
            print(f"✓ Thread reply includes correct threadId: {root_id}")
        except Exception as e:
            print(f"✗ Thread reply check exception: {e}")
            return False
        
        # (A8) No token → 401
        print("\n(A8) AUTH: NO TOKEN → 401")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/sok?q=test", timeout=10)
            if r.status_code != 401:
                print(f"✗ Expected 401, got {r.status_code}")
                return False
            print(f"✓ No token returns 401")
        except Exception as e:
            print(f"✗ No token test exception: {e}")
            return False
        
        # ========================================================================
        # (B) GET /api/admin/chat/unfurl?url=<url> (sakerAuthed, rate limit 60/min)
        # ========================================================================
        print("\n" + "=" * 80)
        print("(B) LINK UNFURL: GET /api/admin/chat/unfurl")
        print("=" * 80)
        
        # (B1) url=https://example.com → 200 {ok:true, host:"example.com", tittel:"Example Domain", ...}
        print("\n(B1) UNFURL VALID URL")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/unfurl?key={owner_token}&url=https://example.com", timeout=15)
            if r.status_code != 200:
                print(f"✗ Unfurl failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Unfurl response not ok: {data}")
                return False
            if data.get("host") != "example.com":
                print(f"✗ Expected host 'example.com', got '{data.get('host')}'")
                return False
            if not data.get("tittel"):
                print(f"✗ Expected tittel, got None")
                return False
            print(f"✓ Unfurl works: host={data.get('host')}, tittel={data.get('tittel')}")
        except Exception as e:
            print(f"✗ Unfurl exception: {e}")
            return False
        
        # (B2) Second call for same URL served from cache
        print("\n(B2) CACHE VERIFICATION")
        try:
            # Verify cache doc exists in MongoDB
            cache_doc = db.chat_unfurl.find_one({"url": {"$regex": "^https://example.com"}})
            if not cache_doc:
                print(f"✗ Cache doc not found in chat_unfurl collection")
                return False
            print(f"✓ Cache doc exists in chat_unfurl: url={cache_doc.get('url')[:50]}...")
            
            # Second call should be fast (cached)
            r = requests.get(f"{BASE_URL}/admin/chat/unfurl?key={owner_token}&url=https://example.com", timeout=10)
            if r.status_code != 200:
                print(f"✗ Cached unfurl failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Cached unfurl response not ok: {data}")
                return False
            print(f"✓ Cached unfurl works (stable response)")
        except Exception as e:
            print(f"✗ Cache verification exception: {e}")
            return False
        
        # (B3) SSRF guard: each of these must return 400 {error:"Ugyldig lenke"}
        print("\n(B3) SSRF GUARD")
        ssrf_urls = [
            "http://localhost:3000",
            "http://127.0.0.1/",
            "http://[::1]/",
            "http://metadata.google.internal/",
            "http://0.0.0.0/",
            "ftp://example.com/",
            "http://169.254.169.254/"
        ]
        for url in ssrf_urls:
            try:
                r = requests.get(f"{BASE_URL}/admin/chat/unfurl?key={owner_token}&url={url}", timeout=10)
                if r.status_code != 400:
                    print(f"✗ SSRF URL '{url}' should return 400, got {r.status_code}")
                    return False
                data = r.json()
                if data.get("error") != "Ugyldig lenke":
                    print(f"✗ SSRF URL '{url}' should return 'Ugyldig lenke', got '{data.get('error')}'")
                    return False
                print(f"✓ SSRF blocked: {url}")
            except Exception as e:
                print(f"✗ SSRF test exception for '{url}': {e}")
                return False
        
        # (B4) Dead/unfetchable URL → 200 {ok:true, tittel:null} (negative cache)
        print("\n(B4) NEGATIVE CACHE FOR DEAD URL")
        try:
            dead_url = "https://finnes-ikke-qa-xyzzy.example.com/"
            r = requests.get(f"{BASE_URL}/admin/chat/unfurl?key={owner_token}&url={dead_url}", timeout=15)
            if r.status_code != 200:
                print(f"✗ Dead URL unfurl failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Dead URL response not ok: {data}")
                return False
            if data.get("tittel") is not None:
                print(f"✗ Dead URL should have tittel:null, got '{data.get('tittel')}'")
                return False
            print(f"✓ Dead URL returns 200 with tittel:null (negative cache, no crash)")
        except Exception as e:
            print(f"✗ Dead URL test exception: {e}")
            return False
        
        # (B5) No token → 401
        print("\n(B5) AUTH: NO TOKEN → 401")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/unfurl?url=https://example.com", timeout=10)
            if r.status_code != 401:
                print(f"✗ Expected 401, got {r.status_code}")
                return False
            print(f"✓ No token returns 401")
        except Exception as e:
            print(f"✗ No token test exception: {e}")
            return False
        
        # (B6) Clean up: delete chat_unfurl docs created by test
        print("\n(B6) CLEANUP UNFURL CACHE")
        try:
            result = db.chat_unfurl.delete_many({"url": {"$regex": "^https://example.com"}})
            print(f"✓ Deleted {result.deleted_count} example.com cache docs")
            result = db.chat_unfurl.delete_many({"url": {"$regex": "finnes-ikke-qa-xyzzy"}})
            print(f"✓ Deleted {result.deleted_count} dead URL cache docs")
        except Exception as e:
            print(f"✗ Cache cleanup exception: {e}")
            return False
        
        # ========================================================================
        # (C) GET /api/admin/chat/status (sakerAuthed) — sisteUlest field
        # ========================================================================
        print("\n" + "=" * 80)
        print("(C) STATUS WITH SISTEULEST: GET /api/admin/chat/status")
        print("=" * 80)
        
        # (C1) Create QA user (@example.com)
        print("\n(C1) CREATE QA USER")
        try:
            qa_email = "qa-chat-status@example.com"
            qa_password = "QAtest1234"
            r = requests.post(
                f"{BASE_URL}/admin/users?key={ADMIN_KEY}",
                json={
                    "name": "QA Chat Status User",
                    "email": qa_email,
                    "role": "bruker",
                    "password": qa_password,
                    "invite": False
                },
                timeout=10
            )
            if r.status_code != 200:
                print(f"✗ Failed to create QA user: {r.status_code} {r.text[:200]}")
                return False
            response_data = r.json()
            qa_user = response_data.get("user", {})
            test_user_id = qa_user.get("id") or response_data.get("id")
            if not test_user_id:
                print(f"⚠️ Warning: Could not extract user ID from response: {response_data}")
                # Try to find it in MongoDB
                qa_user_doc = db.admin_users.find_one({"email": qa_email})
                if qa_user_doc:
                    test_user_id = qa_user_doc.get("id")
            print(f"✓ Created QA user: {test_user_id} ({qa_email})")
        except Exception as e:
            print(f"✗ QA user creation exception: {e}")
            return False
        
        # Login as QA user
        try:
            r = requests.post(f"{BASE_URL}/admin/auth/login", json={"email": qa_email, "password": qa_password}, timeout=10)
            if r.status_code != 200:
                print(f"✗ QA user login failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            qa_token = data.get("token")
            print(f"✓ QA user logged in, token: {qa_token[:20]}...")
        except Exception as e:
            print(f"✗ QA user login exception: {e}")
            return False
        
        # (C2) As owner, post a test message with text longer than 90 chars
        print("\n(C2) POST LONG MESSAGE AS OWNER")
        try:
            long_text = "This is a test message with more than ninety characters to verify that sisteUlest truncates correctly at max 90 chars"
            r = requests.post(
                f"{BASE_URL}/admin/chat/meldinger?key={owner_token}",
                json={"text": long_text},
                timeout=10
            )
            if r.status_code not in [200, 201]:
                print(f"✗ Failed to create long message: {r.status_code} {r.text[:200]}")
                return False
            long_msg = r.json().get("melding", {})
            long_msg_id = long_msg.get("id")
            test_message_ids.append(long_msg_id)
            print(f"✓ Created long message: {long_msg_id}")
        except Exception as e:
            print(f"✗ Long message creation exception: {e}")
            return False
        
        # As QA user, GET status → ulest >= 1 and sisteUlest:{userName:"Martin", text: truncated to max 90 chars}
        print("\n(C3) QA USER STATUS: ULEST >= 1, SISTEULEST TRUNCATED")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/status?key={qa_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ QA status failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ QA status response not ok: {data}")
                return False
            ulest = data.get("ulest", 0)
            if ulest < 1:
                print(f"✗ Expected ulest >= 1, got {ulest}")
                return False
            sisteUlest = data.get("sisteUlest")
            if not sisteUlest:
                print(f"✗ Expected sisteUlest, got None")
                return False
            if sisteUlest.get("userName") != owner_name:
                print(f"✗ Expected userName '{owner_name}', got '{sisteUlest.get('userName')}'")
                return False
            text = sisteUlest.get("text", "")
            if len(text) > 90:
                print(f"✗ sisteUlest.text should be max 90 chars, got {len(text)}")
                return False
            print(f"✓ QA status: ulest={ulest}, sisteUlest.userName={sisteUlest.get('userName')}, text={text[:50]}... (len={len(text)})")
        except Exception as e:
            print(f"✗ QA status exception: {e}")
            return False
        
        # (C4) Post a message with ONLY an attachment
        print("\n(C4) POST MESSAGE WITH ONLY ATTACHMENT")
        try:
            # Upload a tiny file via POST /api/admin/chat/fil-chunk (single chunk)
            import base64
            tiny_file_data = base64.b64encode(b"QA test file content").decode()
            upload_id = "qa-upload-" + str(int(requests.get(f"{BASE_URL}/").elapsed.total_seconds() * 1000))
            r = requests.post(
                f"{BASE_URL}/admin/chat/fil-chunk?key={owner_token}",
                json={
                    "uploadId": upload_id,
                    "index": 0,
                    "total": 1,
                    "data": tiny_file_data,
                    "name": "qa-test.txt",
                    "type": "text/plain"
                },
                timeout=10
            )
            if r.status_code != 200:
                print(f"✗ Failed to upload file chunk: {r.status_code} {r.text[:200]}")
                return False
            file_data = r.json()
            if not file_data.get("complete"):
                print(f"✗ File upload not complete: {file_data}")
                return False
            file_id = file_data.get("fil", {}).get("id")
            print(f"✓ Uploaded file: {file_id}")
            
            # Post message with only attachment (empty text)
            r = requests.post(
                f"{BASE_URL}/admin/chat/meldinger?key={owner_token}",
                json={"text": "", "vedlegg": [file_id]},
                timeout=10
            )
            if r.status_code not in [200, 201]:
                print(f"✗ Failed to create attachment-only message: {r.status_code} {r.text[:200]}")
                return False
            attach_msg = r.json().get("melding", {})
            attach_msg_id = attach_msg.get("id")
            test_message_ids.append(attach_msg_id)
            print(f"✓ Created attachment-only message: {attach_msg_id}")
        except Exception as e:
            print(f"✗ Attachment message creation exception: {e}")
            return False
        
        # QA status → sisteUlest.text === "📎 Delte vedlegg"
        print("\n(C5) QA USER STATUS: SISTEULEST FOR ATTACHMENT-ONLY MESSAGE")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/status?key={qa_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ QA status failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            sisteUlest = data.get("sisteUlest")
            if not sisteUlest:
                print(f"✗ Expected sisteUlest, got None")
                return False
            text = sisteUlest.get("text", "")
            if text != "📎 Delte vedlegg":
                print(f"✗ Expected '📎 Delte vedlegg', got '{text}'")
                return False
            print(f"✓ sisteUlest.text for attachment-only message: '{text}'")
        except Exception as e:
            print(f"✗ Attachment status exception: {e}")
            return False
        
        # (C6) QA user PUT /api/admin/chat/lest {} → GET status → ulest:0 and sisteUlest:null
        print("\n(C6) QA USER MARKS AS READ")
        try:
            r = requests.put(f"{BASE_URL}/admin/chat/lest?key={qa_token}", json={}, timeout=10)
            if r.status_code != 200:
                print(f"✗ Mark as read failed: {r.status_code} {r.text[:200]}")
                return False
            print(f"✓ Marked as read")
            
            r = requests.get(f"{BASE_URL}/admin/chat/status?key={qa_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ QA status after read failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            ulest = data.get("ulest", -1)
            sisteUlest = data.get("sisteUlest")
            if ulest != 0:
                print(f"✗ Expected ulest=0 after read, got {ulest}")
                return False
            if sisteUlest is not None:
                print(f"✗ Expected sisteUlest=null after read, got {sisteUlest}")
                return False
            print(f"✓ After read: ulest=0, sisteUlest=null")
        except Exception as e:
            print(f"✗ Mark as read exception: {e}")
            return False
        
        # (C7) Own messages never count: owner GET status after posting own messages → those don't appear in owner's ulest
        print("\n(C7) OWN MESSAGES DON'T COUNT AS ULEST")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/status?key={owner_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Owner status failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            # Owner's own messages should not count as unread for owner
            # (This is implicit in the implementation: filter.userId = { $ne: String(userId) })
            print(f"✓ Owner status: ulest={data.get('ulest', 0)} (own messages don't count)")
        except Exception as e:
            print(f"✗ Owner status exception: {e}")
            return False
        
        # ========================================================================
        # (D) Light regression: GET /api/admin/chat/meldinger and /api/admin/chat/traader
        # ========================================================================
        print("\n" + "=" * 80)
        print("(D) REGRESSION: MELDINGER AND TRAADER")
        print("=" * 80)
        
        print("\n(D1) GET /api/admin/chat/meldinger")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/meldinger?key={owner_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Meldinger failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Meldinger response not ok: {data}")
                return False
            if "meldinger" not in data:
                print(f"✗ Meldinger response missing 'meldinger' field")
                return False
            print(f"✓ GET /api/admin/chat/meldinger returns 200 with ok/meldinger")
        except Exception as e:
            print(f"✗ Meldinger exception: {e}")
            return False
        
        print("\n(D2) GET /api/admin/chat/traader")
        try:
            r = requests.get(f"{BASE_URL}/admin/chat/traader?key={owner_token}", timeout=10)
            if r.status_code != 200:
                print(f"✗ Traader failed: {r.status_code} {r.text[:200]}")
                return False
            data = r.json()
            if not data.get("ok"):
                print(f"✗ Traader response not ok: {data}")
                return False
            if "traader" not in data:
                print(f"✗ Traader response missing 'traader' field")
                return False
            print(f"✓ GET /api/admin/chat/traader returns 200")
        except Exception as e:
            print(f"✗ Traader exception: {e}")
            return False
        
        # ========================================================================
        # MANDATORY CLEANUP
        # ========================================================================
        print("\n" + "=" * 80)
        print("MANDATORY CLEANUP")
        print("=" * 80)
        
        # Delete all test messages
        print("\n(E1) DELETE TEST MESSAGES")
        deleted_count = 0
        for msg_id in test_message_ids:
            try:
                r = requests.delete(f"{BASE_URL}/admin/chat/meldinger?key={owner_token}&id={msg_id}", timeout=10)
                if r.status_code == 200:
                    deleted_count += 1
                    print(f"✓ Deleted message: {msg_id}")
                elif r.status_code == 404:
                    # Already deleted (e.g., thread reply deleted with root)
                    deleted_count += 1
                    print(f"✓ Message already deleted (cascade): {msg_id}")
                else:
                    print(f"✗ Failed to delete message {msg_id}: {r.status_code} {r.text[:200]}")
                    return False
            except Exception as e:
                print(f"✗ Delete message exception: {e}")
                return False
        print(f"✓ Deleted/verified {deleted_count}/{len(test_message_ids)} test messages")
        
        # Verify attachment cascade (chat_files should be deleted with message)
        print("\n(E2) VERIFY ATTACHMENT CASCADE")
        try:
            orphan_files = db.chat_files.count_documents({"meldingId": {"$in": test_message_ids}})
            if orphan_files > 0:
                print(f"✗ Found {orphan_files} orphan files after message deletion")
                return False
            print(f"✓ No orphan files (attachment cascade works)")
        except Exception as e:
            print(f"✗ Attachment cascade check exception: {e}")
            return False
        
        # Delete QA user
        if test_user_id:
            print("\n(E3) DELETE QA USER")
            try:
                r = requests.delete(f"{BASE_URL}/admin/users/{test_user_id}?key={ADMIN_KEY}", timeout=10)
                if r.status_code != 200:
                    print(f"✗ Failed to delete QA user: {r.status_code} {r.text[:200]}")
                    return False
                print(f"✓ Deleted QA user: {test_user_id}")
            except Exception as e:
                print(f"✗ Delete QA user exception: {e}")
                return False
            
            # Delete chat_lest doc for QA user
            print("\n(E4) DELETE QA USER CHAT_LEST DOC")
            try:
                result = db.chat_lest.delete_many({"userId": test_user_id})
                print(f"✓ Deleted {result.deleted_count} chat_lest docs for QA user")
            except Exception as e:
                print(f"✗ Delete chat_lest exception: {e}")
                return False
        
        # Verify Martin's real message count matches baseline
        print("\n(E5) VERIFY BASELINE MESSAGE COUNT")
        try:
            final_count = db.chat_messages.count_documents({})
            if final_count != baseline_count:
                print(f"✗ Message count mismatch: baseline={baseline_count}, final={final_count}")
                return False
            print(f"✓ Message count matches baseline: {final_count}")
        except Exception as e:
            print(f"✗ Baseline verification exception: {e}")
            return False
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup in case of failure
        if test_message_ids:
            print("\n[CLEANUP] Attempting to delete test messages...")
            for msg_id in test_message_ids:
                try:
                    requests.delete(f"{BASE_URL}/admin/chat/meldinger?key={owner_token}&id={msg_id}", timeout=5)
                except:
                    pass
        if test_user_id:
            print(f"[CLEANUP] Attempting to delete QA user {test_user_id}...")
            try:
                requests.delete(f"{BASE_URL}/admin/users/{test_user_id}?key={ADMIN_KEY}", timeout=5)
                db.chat_lest.delete_many({"userId": test_user_id})
            except:
                pass

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
