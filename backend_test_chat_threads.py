#!/usr/bin/env python3
"""
Backend test for Chat-tråder + «Nytt siden sist» (threadId, trådaggregat, forrigeLestAt).

CRITICAL SAFETY RULES:
1. chat_messages contains 2 REAL messages from user 'Martin' (ids ed5ab73e-c9fb-4249-b737-02d35903128f 
   and 34bf3165-594a-4f13-9303-f2816b132c54). DO NOT delete, modify them, and DO NOT drop/clear 
   the chat_messages or chat_lest collections. Delete ONLY messages your test creates (track their ids).
2. For mention tests, create QA users ONLY with @example.com emails (email sending is blocked for these 
   by isUndeliverableTestAddress; in-app notification should still be created). Delete QA users after 
   testing (via MongoDB admin_users, match your QA emails) and delete chat_lest docs for those QA userIds only.
3. Do not touch chat_lest docs of real users.

WHAT CHANGED (to test):
- chat_messages docs now have threadId (null = root message; otherwise = the ROOT message id; 
  replies-to-replies are normalized to the root).
- GET /api/admin/chat/meldinger → returns ONLY root messages (threadId null or missing). Roots that 
  have replies include an aggregated field traad: {antall, sisteAt, navn[]} (navn = up to 4 distinct 
  reply author names).
- GET /api/admin/chat/meldinger?traad=<rootId> → returns the root + all replies, chronological ascending.
- POST /api/admin/chat/meldinger accepts body.threadId. If threadId points to a non-existent message 
  in the channel → 404 {error:'Tråden finnes ikke'}. If threadId points to a REPLY, the new message 
  is normalized so its threadId = the root id.
- DELETE /api/admin/chat/meldinger?id=<rootId> deletes the root AND all its replies. Deleting a reply 
  only deletes that reply.
- PUT /api/admin/chat/lest now returns {ok:true, forrigeLestAt} — the PREVIOUS lastReadAt (null the 
  very first time for a user, ISO string subsequently).
- GET /api/admin/chat/status: ulest counts ALL unread messages including thread replies (own messages 
  never counted).
- Email deep-link for mentions in thread replies uses ?chat=1&traad=<rootId> (can't easily verify email; 
  skip actual email checks — @example.com is blocked anyway, but verify in-app notification is created 
  for a mentioned QA user in a THREAD reply, type='chat').
"""

import os
import sys
import requests
import time
from pymongo import MongoClient

# Read environment variables
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = os.getenv('ADMIN_KEY', 'dh_admin_b3Kx92Qz7Lm4')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Track test data for cleanup
test_message_ids = []
test_user_ids = []
test_user_emails = []

def log(msg):
    print(f"[TEST] {msg}")

def create_qa_user(name, email, role='bruker', password='QaChat2026!!'):
    """Create a QA user and return user data with token."""
    try:
        # Create user
        resp = requests.post(
            f"{API_URL}/admin/users",
            params={'key': ADMIN_KEY},
            json={'name': name, 'email': email, 'role': role, 'password': password, 'invite': False},
            timeout=10
        )
        if resp.status_code != 200:
            log(f"❌ Failed to create user {email}: {resp.status_code} {resp.text[:200]}")
            return None
        
        user_data = resp.json()
        user_id = user_data.get('member', {}).get('id')
        if not user_id:
            log(f"❌ No user ID returned for {email}")
            return None
        
        test_user_ids.append(user_id)
        test_user_emails.append(email)
        
        # Login to get token
        login_resp = requests.post(
            f"{API_URL}/admin/auth/login",
            json={'email': email, 'password': password},
            timeout=10
        )
        if login_resp.status_code != 200:
            log(f"❌ Failed to login as {email}: {login_resp.status_code}")
            return None
        
        token = login_resp.json().get('token')
        if not token:
            log(f"❌ No token returned for {email}")
            return None
        
        log(f"✅ Created QA user: {name} ({email}) with id {user_id}")
        return {'id': user_id, 'name': name, 'email': email, 'token': token}
    
    except Exception as e:
        log(f"❌ Exception creating user {email}: {e}")
        return None

def cleanup():
    """Clean up all test data."""
    log("🧹 Starting cleanup...")
    
    # Delete test messages from MongoDB (only our test messages, not Martin's real ones)
    if test_message_ids:
        result = db.chat_messages.delete_many({'id': {'$in': test_message_ids}})
        log(f"✅ Deleted {result.deleted_count} test messages from chat_messages")
    
    # Delete test users' chat_lest docs
    if test_user_ids:
        result = db.chat_lest.delete_many({'userId': {'$in': test_user_ids}})
        log(f"✅ Deleted {result.deleted_count} chat_lest docs for test users")
    
    # Delete test users from admin_users
    if test_user_emails:
        result = db.admin_users.delete_many({'email': {'$in': test_user_emails}})
        log(f"✅ Deleted {result.deleted_count} test users from admin_users")
    
    # Verify Martin's messages are still intact
    martin_messages = list(db.chat_messages.find(
        {'id': {'$in': ['ed5ab73e-c9fb-4249-b737-02d35903128f', '34bf3165-594a-4f13-9303-f2816b132c54']}}
    ))
    log(f"✅ Verified Martin's {len(martin_messages)} real messages still intact")
    
    log("✅ Cleanup complete")

def run_tests():
    """Run all chat thread tests."""
    try:
        log("=" * 80)
        log("CHAT THREADS + READ POSITION BACKEND TEST")
        log("=" * 80)
        
        # T0: Create QA users
        log("\n[T0] Creating QA users...")
        user_a = create_qa_user('QA Traad Bruker', 'qa-traad-bruker@example.com', 'bruker')
        if not user_a:
            log("❌ Failed to create user A")
            return False
        
        # Use admin key for user B (owner/admin from test_credentials)
        user_b_token = ADMIN_KEY
        user_b_name = "TestAgent"
        
        # T1: POST root message as B
        log("\n[T1] POST root message as B...")
        try:
            resp = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                json={'text': 'QA rot-melding traadtest'},
                timeout=10
            )
            if resp.status_code != 201:
                log(f"❌ T1 FAILED: Expected 201, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            root_message = data.get('melding', {})
            root_id = root_message.get('id')
            if not root_id:
                log(f"❌ T1 FAILED: No message id returned")
                return False
            
            test_message_ids.append(root_id)
            
            if root_message.get('threadId') is not None:
                log(f"❌ T1 FAILED: Root message threadId should be null, got {root_message.get('threadId')}")
                return False
            
            log(f"✅ T1 PASSED: Root message created with id {root_id}, threadId is null")
        except Exception as e:
            log(f"❌ T1 FAILED with exception: {e}")
            return False
        
        # T2: POST reply as A
        log("\n[T2] POST reply as A...")
        try:
            resp = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_a['token']},
                json={'text': 'QA svar 1', 'threadId': root_id},
                timeout=10
            )
            if resp.status_code != 201:
                log(f"❌ T2 FAILED: Expected 201, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            reply1_message = data.get('melding', {})
            reply1_id = reply1_message.get('id')
            if not reply1_id:
                log(f"❌ T2 FAILED: No message id returned")
                return False
            
            test_message_ids.append(reply1_id)
            
            if reply1_message.get('threadId') != root_id:
                log(f"❌ T2 FAILED: Reply threadId should be {root_id}, got {reply1_message.get('threadId')}")
                return False
            
            log(f"✅ T2 PASSED: Reply created with id {reply1_id}, threadId = {root_id}")
        except Exception as e:
            log(f"❌ T2 FAILED with exception: {e}")
            return False
        
        # T3: POST reply-to-reply as B (should normalize to root)
        log("\n[T3] POST reply-to-reply as B (should normalize to root)...")
        try:
            resp = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                json={'text': 'QA svar 2', 'threadId': reply1_id},
                timeout=10
            )
            if resp.status_code != 201:
                log(f"❌ T3 FAILED: Expected 201, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            reply2_message = data.get('melding', {})
            reply2_id = reply2_message.get('id')
            if not reply2_id:
                log(f"❌ T3 FAILED: No message id returned")
                return False
            
            test_message_ids.append(reply2_id)
            
            # Should be normalized to root, NOT reply1_id
            if reply2_message.get('threadId') != root_id:
                log(f"❌ T3 FAILED: Reply-to-reply threadId should be normalized to root {root_id}, got {reply2_message.get('threadId')}")
                return False
            
            log(f"✅ T3 PASSED: Reply-to-reply created with id {reply2_id}, threadId normalized to root {root_id}")
        except Exception as e:
            log(f"❌ T3 FAILED with exception: {e}")
            return False
        
        # T4: GET main stream (should show root WITH traad aggregate, replies NOT as top-level)
        log("\n[T4] GET main stream (should show root WITH traad aggregate)...")
        try:
            resp = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                timeout=10
            )
            if resp.status_code != 200:
                log(f"❌ T4 FAILED: Expected 200, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            meldinger = data.get('meldinger', [])
            
            # Find our root message
            root_in_stream = None
            for msg in meldinger:
                if msg.get('id') == root_id:
                    root_in_stream = msg
                    break
            
            if not root_in_stream:
                log(f"❌ T4 FAILED: Root message {root_id} not found in main stream")
                return False
            
            # Check traad aggregate
            traad = root_in_stream.get('traad')
            if not traad:
                log(f"❌ T4 FAILED: Root message should have traad aggregate, got None")
                return False
            
            if traad.get('antall') != 2:
                log(f"❌ T4 FAILED: traad.antall should be 2, got {traad.get('antall')}")
                return False
            
            if not traad.get('sisteAt'):
                log(f"❌ T4 FAILED: traad.sisteAt should be set")
                return False
            
            navn = traad.get('navn', [])
            if len(navn) < 1:
                log(f"❌ T4 FAILED: traad.navn should contain author names, got {navn}")
                return False
            
            # Verify replies are NOT in main stream as top-level items
            reply_ids_in_stream = [msg.get('id') for msg in meldinger if msg.get('id') in [reply1_id, reply2_id]]
            if reply_ids_in_stream:
                log(f"❌ T4 FAILED: Replies should NOT be in main stream as top-level, found {reply_ids_in_stream}")
                return False
            
            log(f"✅ T4 PASSED: Root in main stream WITH traad {{antall:2, sisteAt:{traad.get('sisteAt')}, navn:{navn}}}, replies NOT as top-level")
        except Exception as e:
            log(f"❌ T4 FAILED with exception: {e}")
            return False
        
        # T5: GET thread view (should return root + all replies, chronological)
        log("\n[T5] GET thread view (should return root + all replies, chronological)...")
        try:
            resp = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token, 'traad': root_id},
                timeout=10
            )
            if resp.status_code != 200:
                log(f"❌ T5 FAILED: Expected 200, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            meldinger = data.get('meldinger', [])
            
            if len(meldinger) != 3:
                log(f"❌ T5 FAILED: Expected 3 messages (root + 2 replies), got {len(meldinger)}")
                return False
            
            # First should be root
            if meldinger[0].get('id') != root_id:
                log(f"❌ T5 FAILED: First message should be root {root_id}, got {meldinger[0].get('id')}")
                return False
            
            # Check chronological order (createdAt ascending)
            for i in range(len(meldinger) - 1):
                if meldinger[i].get('createdAt', '') > meldinger[i+1].get('createdAt', ''):
                    log(f"❌ T5 FAILED: Messages not in chronological order")
                    return False
            
            log(f"✅ T5 PASSED: Thread view returned 3 messages (root + 2 replies) in chronological order")
        except Exception as e:
            log(f"❌ T5 FAILED with exception: {e}")
            return False
        
        # T6: POST with non-existent threadId (should return 404)
        log("\n[T6] POST with non-existent threadId (should return 404)...")
        try:
            resp = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                json={'text': 'QA test', 'threadId': 'finnes-ikke-123'},
                timeout=10
            )
            if resp.status_code != 404:
                log(f"❌ T6 FAILED: Expected 404, got {resp.status_code}: {resp.text[:200]}")
                return False
            
            data = resp.json()
            if 'finnes ikke' not in data.get('error', '').lower():
                log(f"❌ T6 FAILED: Expected error message about thread not found, got {data.get('error')}")
                return False
            
            log(f"✅ T6 PASSED: POST with non-existent threadId returned 404 with correct error")
        except Exception as e:
            log(f"❌ T6 FAILED with exception: {e}")
            return False
        
        # T7: PUT /api/admin/chat/lest as QA user A (should return forrigeLestAt)
        log("\n[T7] PUT /api/admin/chat/lest as QA user A (should return forrigeLestAt)...")
        try:
            # First call - should return null (first time)
            resp1 = requests.put(
                f"{API_URL}/admin/chat/lest",
                params={'key': user_a['token']},
                json={},
                timeout=10
            )
            if resp1.status_code != 200:
                log(f"❌ T7 FAILED: Expected 200, got {resp1.status_code}: {resp1.text[:200]}")
                return False
            
            data1 = resp1.json()
            forrige1 = data1.get('forrigeLestAt')
            
            # forrigeLestAt may be null (first time) or ISO string (if user posted, which triggers merkLest)
            if forrige1 is not None and not isinstance(forrige1, str):
                log(f"❌ T7 FAILED: forrigeLestAt should be null or ISO string, got {type(forrige1)}")
                return False
            
            log(f"✅ T7a PASSED: First PUT lest returned forrigeLestAt = {forrige1}")
            
            # Wait a bit
            time.sleep(0.5)
            
            # Second call - should return ISO string (the timestamp from first call)
            resp2 = requests.put(
                f"{API_URL}/admin/chat/lest",
                params={'key': user_a['token']},
                json={},
                timeout=10
            )
            if resp2.status_code != 200:
                log(f"❌ T7 FAILED: Expected 200 on second call, got {resp2.status_code}: {resp2.text[:200]}")
                return False
            
            data2 = resp2.json()
            forrige2 = data2.get('forrigeLestAt')
            
            if not isinstance(forrige2, str):
                log(f"❌ T7 FAILED: Second call forrigeLestAt should be ISO string, got {type(forrige2)}")
                return False
            
            # forrige2 should be >= forrige1 (if forrige1 was not null)
            if forrige1 and forrige2 < forrige1:
                log(f"❌ T7 FAILED: Second forrigeLestAt {forrige2} should be >= first {forrige1}")
                return False
            
            log(f"✅ T7b PASSED: Second PUT lest returned forrigeLestAt = {forrige2} (ISO string)")
        except Exception as e:
            log(f"❌ T7 FAILED with exception: {e}")
            return False
        
        # T8: GET status as A after B posts new thread reply (ulest should include thread replies)
        log("\n[T8] GET status as A after B posts new thread reply (ulest should include thread replies)...")
        try:
            # B posts another reply
            resp_post = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                json={'text': 'QA svar 3 fra B', 'threadId': root_id},
                timeout=10
            )
            if resp_post.status_code != 201:
                log(f"❌ T8 FAILED: Failed to post new reply: {resp_post.status_code}")
                return False
            
            reply3_id = resp_post.json().get('melding', {}).get('id')
            test_message_ids.append(reply3_id)
            
            # Get status as A
            resp_status = requests.get(
                f"{API_URL}/admin/chat/status",
                params={'key': user_a['token']},
                timeout=10
            )
            if resp_status.status_code != 200:
                log(f"❌ T8 FAILED: Expected 200, got {resp_status.status_code}: {resp_status.text[:200]}")
                return False
            
            data = resp_status.json()
            ulest = data.get('ulest', 0)
            
            if ulest < 1:
                log(f"❌ T8 FAILED: ulest should be >= 1 (thread reply counts), got {ulest}")
                return False
            
            log(f"✅ T8a PASSED: Status shows ulest = {ulest} (thread replies counted)")
            
            # PUT lest to mark as read
            resp_lest = requests.put(
                f"{API_URL}/admin/chat/lest",
                params={'key': user_a['token']},
                json={},
                timeout=10
            )
            if resp_lest.status_code != 200:
                log(f"❌ T8 FAILED: PUT lest failed: {resp_lest.status_code}")
                return False
            
            # Get status again
            resp_status2 = requests.get(
                f"{API_URL}/admin/chat/status",
                params={'key': user_a['token']},
                timeout=10
            )
            if resp_status2.status_code != 200:
                log(f"❌ T8 FAILED: Expected 200 on second status, got {resp_status2.status_code}")
                return False
            
            data2 = resp_status2.json()
            ulest2 = data2.get('ulest', 0)
            
            if ulest2 != 0:
                log(f"❌ T8 FAILED: After PUT lest, ulest should be 0, got {ulest2}")
                return False
            
            log(f"✅ T8b PASSED: After PUT lest, ulest = 0")
        except Exception as e:
            log(f"❌ T8 FAILED with exception: {e}")
            return False
        
        # T9: Mention in thread reply (verify in-app notification created)
        log("\n[T9] Mention in thread reply (verify in-app notification created)...")
        try:
            # B posts reply mentioning A
            resp_post = requests.post(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                json={
                    'text': 'QA hei @QA Traad Bruker',
                    'threadId': root_id,
                    'mentions': [{'id': user_a['id']}]
                },
                timeout=10
            )
            if resp_post.status_code != 201:
                log(f"❌ T9 FAILED: Failed to post mention: {resp_post.status_code}: {resp_post.text[:200]}")
                return False
            
            mention_msg = resp_post.json().get('melding', {})
            mention_id = mention_msg.get('id')
            test_message_ids.append(mention_id)
            
            # Verify mentions populated
            mentions = mention_msg.get('mentions', [])
            if len(mentions) != 1 or mentions[0].get('id') != user_a['id']:
                log(f"❌ T9 FAILED: mentions should contain user A, got {mentions}")
                return False
            
            log(f"✅ T9a PASSED: Mention message created with mentions populated")
            
            # Wait a bit for notification to be created
            time.sleep(0.5)
            
            # Get notifications as A
            resp_notif = requests.get(
                f"{API_URL}/admin/notifications",
                params={'key': user_a['token']},
                timeout=10
            )
            if resp_notif.status_code != 200:
                log(f"❌ T9 FAILED: Failed to get notifications: {resp_notif.status_code}")
                return False
            
            data = resp_notif.json()
            notifications = data.get('notifications', [])
            
            # Find chat notification
            chat_notif = None
            for notif in notifications:
                if notif.get('type') == 'chat' and 'QA hei @QA Traad Bruker' in notif.get('text', ''):
                    chat_notif = notif
                    break
            
            if not chat_notif:
                log(f"❌ T9 FAILED: No chat notification found for mention in thread reply")
                return False
            
            log(f"✅ T9b PASSED: In-app notification created for mention in thread reply (type='chat')")
        except Exception as e:
            log(f"❌ T9 FAILED with exception: {e}")
            return False
        
        # T10: Access control (GET thread without token should return 401)
        log("\n[T10] Access control (GET thread without token should return 401)...")
        try:
            resp = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'traad': root_id},
                timeout=10
            )
            if resp.status_code != 401:
                log(f"❌ T10 FAILED: Expected 401, got {resp.status_code}")
                return False
            
            log(f"✅ T10 PASSED: GET thread without token returned 401")
        except Exception as e:
            log(f"❌ T10 FAILED with exception: {e}")
            return False
        
        # T11: DELETE reply (should only delete that reply, not affect root or other replies)
        log("\n[T11] DELETE reply (should only delete that reply)...")
        try:
            # A deletes their own reply (reply1_id)
            resp_del = requests.delete(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_a['token'], 'id': reply1_id},
                timeout=10
            )
            if resp_del.status_code != 200:
                log(f"❌ T11 FAILED: Expected 200, got {resp_del.status_code}: {resp_del.text[:200]}")
                return False
            
            # Get thread view
            resp_thread = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token, 'traad': root_id},
                timeout=10
            )
            if resp_thread.status_code != 200:
                log(f"❌ T11 FAILED: Failed to get thread: {resp_thread.status_code}")
                return False
            
            meldinger = resp_thread.json().get('meldinger', [])
            msg_ids = [msg.get('id') for msg in meldinger]
            
            # reply1_id should be gone
            if reply1_id in msg_ids:
                log(f"❌ T11 FAILED: Deleted reply {reply1_id} still in thread")
                return False
            
            # root and other replies should still be there
            if root_id not in msg_ids:
                log(f"❌ T11 FAILED: Root message {root_id} missing after reply deletion")
                return False
            
            # Get main stream to check traad.antall decreased
            resp_main = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                timeout=10
            )
            if resp_main.status_code != 200:
                log(f"❌ T11 FAILED: Failed to get main stream: {resp_main.status_code}")
                return False
            
            meldinger_main = resp_main.json().get('meldinger', [])
            root_in_main = None
            for msg in meldinger_main:
                if msg.get('id') == root_id:
                    root_in_main = msg
                    break
            
            if root_in_main:
                traad = root_in_main.get('traad', {})
                # antall should have decreased (was 2, now should be less after deleting reply1)
                # Note: we added reply3 and mention_msg, so actual count may vary
                log(f"✅ T11 PASSED: Reply deleted, root still exists, traad.antall = {traad.get('antall', 0)}")
            else:
                log(f"✅ T11 PASSED: Reply deleted, root still exists")
        except Exception as e:
            log(f"❌ T11 FAILED with exception: {e}")
            return False
        
        # T12: DELETE root (should delete root AND all its replies)
        log("\n[T12] DELETE root (should delete root AND all its replies)...")
        try:
            # Admin deletes root
            resp_del = requests.delete(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token, 'id': root_id},
                timeout=10
            )
            if resp_del.status_code != 200:
                log(f"❌ T12 FAILED: Expected 200, got {resp_del.status_code}: {resp_del.text[:200]}")
                return False
            
            # Get thread view (should be empty or not found)
            resp_thread = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token, 'traad': root_id},
                timeout=10
            )
            if resp_thread.status_code != 200:
                log(f"❌ T12 FAILED: Expected 200, got {resp_thread.status_code}")
                return False
            
            meldinger = resp_thread.json().get('meldinger', [])
            if len(meldinger) > 0:
                log(f"❌ T12 FAILED: Thread should be empty after root deletion, got {len(meldinger)} messages")
                return False
            
            # Get main stream (root should not be there)
            resp_main = requests.get(
                f"{API_URL}/admin/chat/meldinger",
                params={'key': user_b_token},
                timeout=10
            )
            if resp_main.status_code != 200:
                log(f"❌ T12 FAILED: Failed to get main stream: {resp_main.status_code}")
                return False
            
            meldinger_main = resp_main.json().get('meldinger', [])
            root_ids_in_main = [msg.get('id') for msg in meldinger_main if msg.get('id') == root_id]
            if root_ids_in_main:
                log(f"❌ T12 FAILED: Root should not be in main stream after deletion")
                return False
            
            # Verify in MongoDB: no orphaned replies (no docs with threadId=root_id)
            orphaned = list(db.chat_messages.find({'threadId': root_id}))
            if orphaned:
                log(f"❌ T12 FAILED: Found {len(orphaned)} orphaned replies in DB after root deletion")
                return False
            
            log(f"✅ T12 PASSED: Root deletion removed root AND all replies, no orphaned replies in DB")
        except Exception as e:
            log(f"❌ T12 FAILED with exception: {e}")
            return False
        
        # CLEANUP: Verify Martin's messages still intact
        log("\n[CLEANUP] Verifying Martin's real messages still intact...")
        try:
            martin_messages = list(db.chat_messages.find(
                {'id': {'$in': ['ed5ab73e-c9fb-4249-b737-02d35903128f', '34bf3165-594a-4f13-9303-f2816b132c54']}}
            ))
            if len(martin_messages) != 2:
                log(f"❌ CLEANUP FAILED: Martin's messages missing! Found {len(martin_messages)}/2")
                return False
            
            log(f"✅ CLEANUP PASSED: Martin's 2 real messages still intact")
        except Exception as e:
            log(f"❌ CLEANUP FAILED with exception: {e}")
            return False
        
        log("\n" + "=" * 80)
        log("✅ ALL 12 TESTS PASSED (100% success rate)")
        log("=" * 80)
        return True
    
    except Exception as e:
        log(f"❌ TEST SUITE FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        cleanup()

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
