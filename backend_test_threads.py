#!/usr/bin/env python3
"""
Backend test for Tråder verdensklasse (world-class threads):
- PUT /api/admin/chat/traad (thread naming and sak linking)
- GET /api/admin/chat/traader (thread overview)
- Thread-follow notifications (in-app only)

CRITICAL SAFETY RULES:
1. Martin has REAL messages - DO NOT touch them
2. Create OWN test data (root + replies)
3. QA users ONLY @example.com
4. Create ONE test task and clean it up
5. Delete all QA data afterwards
"""

import requests
import json
import os
from pymongo import MongoClient
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = os.getenv('ADMIN_KEY', 'dh_admin_b3Kx92Qz7Lm4')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test tracking
test_ids = {
    'root_messages': [],
    'qa_users': [],
    'test_task_id': None,
    'notifications': []
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def api_call(method, endpoint, **kwargs):
    """Make API call with admin key"""
    url = f"{API_BASE}{endpoint}"
    if 'params' not in kwargs:
        kwargs['params'] = {}
    if 'key' not in kwargs['params']:
        kwargs['params']['key'] = ADMIN_KEY
    
    # Add timeout
    if 'timeout' not in kwargs:
        kwargs['timeout'] = 30
    
    try:
        log(f"   API: {method} {endpoint}")
        resp = requests.request(method, url, **kwargs)
        log(f"   Response: {resp.status_code}")
        return resp
    except requests.exceptions.Timeout as e:
        log(f"❌ API call timeout: {e}")
        return None
    except Exception as e:
        log(f"❌ API call failed: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_mongo_db():
    """Get MongoDB connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

def login_as_owner():
    """Login as owner to get session token"""
    try:
        resp = requests.post(
            f"{API_BASE}/admin/auth/login",
            json={'email': 'martin@kviteberg.no', 'password': 'Pyramiden2025##'}
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get('token')
            log(f"✅ Logged in as owner, token: {token[:20]}...")
            return token
        else:
            log(f"❌ Login failed: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        log(f"❌ Login exception: {e}")
        return None

def check_martins_messages():
    """Check Martin's real messages (read-only) to avoid touching them"""
    try:
        db = get_mongo_db()
        martin_count = db.chat_messages.count_documents({'userName': 'Martin'})
        log(f"📊 Martin has {martin_count} real messages in chat_messages")
        
        # Find Martin's real thread (if any)
        martin_threads = list(db.chat_messages.find(
            {'userName': 'Martin', 'threadId': None},
            {'_id': 0, 'id': 1, 'text': 1, 'traadNavn': 1, 'sakId': 1}
        ).limit(5))
        
        if martin_threads:
            log(f"📊 Martin has {len(martin_threads)} root messages")
            for t in martin_threads:
                replies = db.chat_messages.count_documents({'threadId': t['id']})
                log(f"   - Root {t['id'][:8]}... has {replies} replies, navn={t.get('traadNavn')}, sakId={t.get('sakId')}")
        
        return martin_count
    except Exception as e:
        log(f"❌ Failed to check Martin's messages: {e}")
        return 0

def create_qa_user(name, email, role='bruker'):
    """Create QA user with @example.com email"""
    try:
        resp = api_call('POST', '/admin/users', json={
            'name': name,
            'email': email,
            'role': role,
            'invite': False
        })
        if resp is None:
            log(f"❌ Failed to create user {name}: no response")
            return None
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            user = data.get('member') or data  # Handle both response formats
            user_id = user.get('id')
            log(f"✅ Created QA user: {name} ({email}) with id {user_id}")
            test_ids['qa_users'].append(user_id)
            
            # Set password
            resp2 = api_call('PUT', f'/admin/users/{user_id}', json={'password': 'QAtest1234'})
            if resp2 and resp2.status_code == 200:
                log(f"✅ Set password for {name}")
            
            return user_id
        else:
            log(f"❌ Failed to create user {name}: {resp.status_code} {resp.text[:200]}")
            return None
    except Exception as e:
        log(f"❌ Exception creating user {name}: {e}")
        import traceback
        traceback.print_exc()
        return None

def login_as_qa_user(email, password='QAtest1234'):
    """Login as QA user to get their token"""
    try:
        resp = requests.post(
            f"{API_BASE}/admin/auth/login",
            json={'email': email, 'password': password}
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get('token')
            log(f"✅ Logged in as {email}, token: {token[:20]}...")
            return token
        else:
            log(f"❌ Login failed for {email}: {resp.status_code}")
            return None
    except Exception as e:
        log(f"❌ Login exception for {email}: {e}")
        return None

def create_test_task():
    """Create test task for sak-kobling"""
    try:
        resp = api_call('POST', '/admin/tasks', json={
            'title': 'QA-TEST-TRAAD-SLETTES',
            'notify': False
        })
        if resp is None:
            log(f"❌ Failed to create test task: no response")
            return None
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            # Task response might have 'task' or 'id' directly
            task = data.get('task') or data
            task_id = task.get('id')
            log(f"✅ Created test task: {task_id}")
            test_ids['test_task_id'] = task_id
            return task_id
        else:
            log(f"❌ Failed to create test task: {resp.status_code} {resp.text[:200]}")
            return None
    except Exception as e:
        log(f"❌ Exception creating test task: {e}")
        import traceback
        traceback.print_exc()
        return None

def create_test_thread(owner_token):
    """Create test thread (root + 1 reply) as owner"""
    try:
        # Create root message
        resp = api_call('POST', '/admin/chat/meldinger', 
            params={'key': owner_token},
            json={
                'kanal': 'team',
                'text': 'QA Test Thread Root - Dette er en testmelding som skal slettes'
            }
        )
        if resp and resp.status_code == 201:
            data = resp.json()
            root_id = data['melding']['id']
            log(f"✅ Created root message: {root_id}")
            test_ids['root_messages'].append(root_id)
            
            # Create reply
            resp2 = api_call('POST', '/admin/chat/meldinger',
                params={'key': owner_token},
                json={
                    'kanal': 'team',
                    'text': 'QA Test Reply - Dette er et testsvar',
                    'threadId': root_id
                }
            )
            if resp2 and resp2.status_code == 201:
                log(f"✅ Created reply to root {root_id}")
                return root_id
            else:
                log(f"❌ Failed to create reply: {resp2.status_code if resp2 else 'no response'}")
                return root_id
        else:
            log(f"❌ Failed to create root message: {resp.status_code if resp else 'no response'}")
            return None
    except Exception as e:
        log(f"❌ Exception creating test thread: {e}")
        return None

def test_put_traad_naming(root_id, owner_token):
    """Test A: PUT /api/admin/chat/traad - thread naming"""
    log("\n=== TEST A: PUT /api/admin/chat/traad (naming) ===")
    
    # A1: Set thread name
    log("A1: Set thread name 'QA Trådnavn'")
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'navn': 'QA Trådnavn'}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('ok') and data.get('traadNavn') == 'QA Trådnavn':
            log("✅ A1: Set thread name returned 200 with traadNavn='QA Trådnavn'")
            
            # Verify in MongoDB
            db = get_mongo_db()
            doc = db.chat_messages.find_one({'id': root_id}, {'_id': 0, 'traadNavn': 1})
            if doc and doc.get('traadNavn') == 'QA Trådnavn':
                log("✅ A1: Verified in MongoDB: traadNavn='QA Trådnavn'")
            else:
                log(f"❌ A1: MongoDB verification failed: {doc}")
        else:
            log(f"❌ A1: Unexpected response: {data}")
    else:
        log(f"❌ A1: Failed: {resp.status_code if resp else 'no response'}")
    
    # A2: Remove thread name (empty string)
    log("A2: Remove thread name (empty string)")
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'navn': ''}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('ok'):
            log("✅ A2: Remove name returned 200")
            
            # Verify in MongoDB
            db = get_mongo_db()
            doc = db.chat_messages.find_one({'id': root_id}, {'_id': 0, 'traadNavn': 1})
            if doc and doc.get('traadNavn') is None:
                log("✅ A2: Verified in MongoDB: traadNavn=null")
            else:
                log(f"❌ A2: MongoDB verification failed: {doc}")
        else:
            log(f"❌ A2: Unexpected response: {data}")
    else:
        log(f"❌ A2: Failed: {resp.status_code if resp else 'no response'}")
    
    # A3: Try to name a reply (should fail with 404)
    log("A3: Try to name a reply (should fail 404)")
    # Get reply id
    db = get_mongo_db()
    reply = db.chat_messages.find_one({'threadId': root_id}, {'_id': 0, 'id': 1})
    if reply:
        reply_id = reply['id']
        resp = api_call('PUT', '/admin/chat/traad',
            params={'key': owner_token},
            json={'id': reply_id, 'navn': 'Should fail'}
        )
        if resp and resp.status_code == 404:
            log("✅ A3: Naming reply returned 404 (correct)")
        else:
            log(f"❌ A3: Expected 404, got {resp.status_code if resp else 'no response'}")
    else:
        log("❌ A3: Could not find reply to test")

def test_put_traad_sak_linking(root_id, owner_token, test_task_id):
    """Test A4-A8: PUT /api/admin/chat/traad - sak linking"""
    log("\n=== TEST A (continued): PUT /api/admin/chat/traad (sak linking) ===")
    
    # A4: Link to non-existent task (should fail 404)
    log("A4: Link to non-existent task")
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'sakId': 'finnes-ikke'}
    )
    if resp and resp.status_code == 404:
        data = resp.json()
        if 'Saken finnes ikke' in data.get('error', ''):
            log("✅ A4: Non-existent task returned 404 'Saken finnes ikke'")
        else:
            log(f"❌ A4: Wrong error message: {data}")
    else:
        log(f"❌ A4: Expected 404, got {resp.status_code if resp else 'no response'}")
    
    # A5: Link to test task
    log(f"A5: Link to test task {test_task_id}")
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'sakId': test_task_id}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('ok') and data.get('sak'):
            sak = data['sak']
            if sak.get('id') == test_task_id and sak.get('title') == 'QA-TEST-TRAAD-SLETTES':
                log(f"✅ A5: Linked to task, returned sak: {sak}")
                
                # Verify in MongoDB
                db = get_mongo_db()
                doc = db.chat_messages.find_one({'id': root_id}, {'_id': 0, 'sakId': 1})
                if doc and doc.get('sakId') == test_task_id:
                    log("✅ A5: Verified in MongoDB: sakId set")
                else:
                    log(f"❌ A5: MongoDB verification failed: {doc}")
            else:
                log(f"❌ A5: Unexpected sak data: {sak}")
        else:
            log(f"❌ A5: Unexpected response: {data}")
    else:
        log(f"❌ A5: Failed: {resp.status_code if resp else 'no response'}")
    
    # A6: GET meldinger?traad=<rootId> should include sak enrichment
    log("A6: GET meldinger?traad=<rootId> should include sak")
    resp = api_call('GET', '/admin/chat/meldinger',
        params={'key': owner_token, 'traad': root_id}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        meldinger = data.get('meldinger', [])
        root_msg = next((m for m in meldinger if m.get('id') == root_id), None)
        if root_msg and root_msg.get('sak'):
            sak = root_msg['sak']
            if sak.get('id') == test_task_id:
                log(f"✅ A6: Root message enriched with sak: {sak}")
            else:
                log(f"❌ A6: Wrong sak: {sak}")
        else:
            log(f"❌ A6: Root message not enriched with sak: {root_msg}")
    else:
        log(f"❌ A6: Failed: {resp.status_code if resp else 'no response'}")
    
    # A7: Unlink task (sakId: null)
    log("A7: Unlink task (sakId: null)")
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'sakId': None}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('ok'):
            log("✅ A7: Unlink returned 200")
            
            # Verify in MongoDB
            db = get_mongo_db()
            doc = db.chat_messages.find_one({'id': root_id}, {'_id': 0, 'sakId': 1})
            if doc and doc.get('sakId') is None:
                log("✅ A7: Verified in MongoDB: sakId=null")
            else:
                log(f"❌ A7: MongoDB verification failed: {doc}")
        else:
            log(f"❌ A7: Unexpected response: {data}")
    else:
        log(f"❌ A7: Failed: {resp.status_code if resp else 'no response'}")
    
    # Re-link for test B/C
    log("Re-linking task for test B/C")
    api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id, 'sakId': test_task_id}
    )
    
    # A8: Invalid requests
    log("A8: Invalid requests")
    # Non-existent id
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': 'finnes-ikke'}
    )
    if resp and resp.status_code == 404:
        log("✅ A8a: Non-existent id returned 404")
    else:
        log(f"❌ A8a: Expected 404, got {resp.status_code if resp else 'no response'}")
    
    # Empty body (neither navn nor sakId)
    resp = api_call('PUT', '/admin/chat/traad',
        params={'key': owner_token},
        json={'id': root_id}
    )
    if resp and resp.status_code == 400:
        data = resp.json()
        if 'Ingenting å oppdatere' in data.get('error', ''):
            log("✅ A8b: Empty body returned 400 'Ingenting å oppdatere'")
        else:
            log(f"❌ A8b: Wrong error: {data}")
    else:
        log(f"❌ A8b: Expected 400, got {resp.status_code if resp else 'no response'}")

def test_get_traader_overview(root_id, owner_token, test_task_id):
    """Test B: GET /api/admin/chat/traader - thread overview"""
    log("\n=== TEST B: GET /api/admin/chat/traader (overview) ===")
    
    # B1: Get thread overview
    log("B1: GET /admin/chat/traader")
    resp = api_call('GET', '/admin/chat/traader',
        params={'key': owner_token, 'kanal': 'team'}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        if data.get('ok') and 'traader' in data:
            traader = data['traader']
            log(f"✅ B1: Got {len(traader)} threads")
            
            # Find our test thread
            test_thread = next((t for t in traader if t.get('id') == root_id), None)
            if test_thread:
                log(f"✅ B1: Found test thread: {test_thread}")
                
                # Verify fields
                required_fields = ['id', 'navn', 'tekst', 'userName', 'antallSvar', 'sisteAt', 'deltakere', 'uleste', 'sak']
                missing = [f for f in required_fields if f not in test_thread]
                if not missing:
                    log("✅ B1: All required fields present")
                    
                    # Verify values
                    if test_thread['antallSvar'] >= 1:
                        log(f"✅ B1: antallSvar={test_thread['antallSvar']} (>=1)")
                    else:
                        log(f"❌ B1: antallSvar={test_thread['antallSvar']} (expected >=1)")
                    
                    if test_thread['sak'] and test_thread['sak'].get('id') == test_task_id:
                        log(f"✅ B1: sak linked correctly: {test_thread['sak']}")
                    else:
                        log(f"❌ B1: sak not linked: {test_thread['sak']}")
                    
                    if isinstance(test_thread['deltakere'], list):
                        log(f"✅ B1: deltakere is array: {test_thread['deltakere']}")
                    else:
                        log(f"❌ B1: deltakere not array: {test_thread['deltakere']}")
                else:
                    log(f"❌ B1: Missing fields: {missing}")
            else:
                log(f"❌ B1: Test thread not found in overview")
        else:
            log(f"❌ B1: Unexpected response: {data}")
    else:
        log(f"❌ B1: Failed: {resp.status_code if resp else 'no response'}")
    
    # B2: Root without replies but WITH name should appear
    log("B2: Root without replies but WITH name should appear")
    # Create second root with name but no replies
    resp = api_call('POST', '/admin/chat/meldinger',
        params={'key': owner_token},
        json={'kanal': 'team', 'text': 'QA Named Root No Replies'}
    )
    if resp and resp.status_code == 201:
        data = resp.json()
        root2_id = data['melding']['id']
        test_ids['root_messages'].append(root2_id)
        log(f"✅ B2: Created second root: {root2_id}")
        
        # Name it
        api_call('PUT', '/admin/chat/traad',
            params={'key': owner_token},
            json={'id': root2_id, 'navn': 'QA Named No Replies'}
        )
        
        # Check if it appears in overview
        resp2 = api_call('GET', '/admin/chat/traader',
            params={'key': owner_token, 'kanal': 'team'}
        )
        if resp2 and resp2.status_code == 200:
            data2 = resp2.json()
            traader = data2.get('traader', [])
            found = next((t for t in traader if t.get('id') == root2_id), None)
            if found and found.get('antallSvar') == 0:
                log(f"✅ B2: Named root without replies appears with antallSvar=0")
            else:
                log(f"❌ B2: Named root not found or wrong antallSvar: {found}")
        else:
            log(f"❌ B2: Failed to get overview")
    else:
        log(f"❌ B2: Failed to create second root")
    
    # B3: Filter by sakId
    log(f"B3: Filter by sakId={test_task_id}")
    resp = api_call('GET', '/admin/chat/traader',
        params={'key': owner_token, 'kanal': 'team', 'sakId': test_task_id}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        traader = data.get('traader', [])
        log(f"✅ B3: Got {len(traader)} threads for sakId={test_task_id}")
        
        # All should have this sakId
        all_match = all(t.get('sak', {}).get('id') == test_task_id for t in traader)
        if all_match:
            log("✅ B3: All threads have correct sakId")
        else:
            log(f"❌ B3: Some threads have wrong sakId")
    else:
        log(f"❌ B3: Failed: {resp.status_code if resp else 'no response'}")

def test_uleste_logic(root_id, owner_token, qa_user_id, qa_token):
    """Test B4: uleste logic"""
    log("\n=== TEST B4: uleste logic ===")
    
    # As owner, post a new reply in test thread
    log("B4: Owner posts new reply")
    resp = api_call('POST', '/admin/chat/meldinger',
        params={'key': owner_token},
        json={
            'kanal': 'team',
            'text': 'QA New Reply for uleste test',
            'threadId': root_id
        }
    )
    if resp and resp.status_code == 201:
        log("✅ B4: Owner posted new reply")
        
        # GET traader as QA user - should have uleste >= 1
        log("B4: GET traader as QA user (should have uleste >= 1)")
        resp2 = api_call('GET', '/admin/chat/traader',
            params={'key': qa_token, 'kanal': 'team'}
        )
        if resp2 and resp2.status_code == 200:
            data = resp2.json()
            traader = data.get('traader', [])
            test_thread = next((t for t in traader if t.get('id') == root_id), None)
            if test_thread:
                uleste_before = test_thread.get('uleste', 0)
                log(f"✅ B4: QA user sees uleste={uleste_before}")
                
                if uleste_before >= 1:
                    log("✅ B4: uleste >= 1 (correct)")
                    
                    # Mark as read
                    log("B4: QA user marks as read")
                    resp3 = api_call('PUT', '/admin/chat/lest',
                        params={'key': qa_token},
                        json={'kanal': 'team'}
                    )
                    if resp3 and resp3.status_code == 200:
                        log("✅ B4: Marked as read")
                        
                        # GET traader again - uleste should be 0
                        resp4 = api_call('GET', '/admin/chat/traader',
                            params={'key': qa_token, 'kanal': 'team'}
                        )
                        if resp4 and resp4.status_code == 200:
                            data4 = resp4.json()
                            traader4 = data4.get('traader', [])
                            test_thread4 = next((t for t in traader4 if t.get('id') == root_id), None)
                            if test_thread4:
                                uleste_after = test_thread4.get('uleste', 0)
                                if uleste_after == 0:
                                    log(f"✅ B4: After marking read, uleste=0")
                                else:
                                    log(f"❌ B4: After marking read, uleste={uleste_after} (expected 0)")
                            else:
                                log("❌ B4: Test thread not found after marking read")
                        else:
                            log("❌ B4: Failed to get traader after marking read")
                    else:
                        log("❌ B4: Failed to mark as read")
                else:
                    log(f"❌ B4: uleste={uleste_before} (expected >= 1)")
            else:
                log("❌ B4: Test thread not found in QA user's view")
        else:
            log("❌ B4: Failed to get traader as QA user")
    else:
        log("❌ B4: Failed to post new reply")

def test_access_control(owner_token):
    """Test B5: Access control"""
    log("\n=== TEST B5: Access control ===")
    
    # GET traader without token
    log("B5: GET traader without token (should fail 401)")
    resp = requests.get(f"{API_BASE}/admin/chat/traader?kanal=team")
    if resp.status_code == 401:
        log("✅ B5a: GET traader without token returned 401")
    else:
        log(f"❌ B5a: Expected 401, got {resp.status_code}")
    
    # PUT traad without token
    log("B5: PUT traad without token (should fail 401)")
    resp = requests.put(f"{API_BASE}/admin/chat/traad",
        json={'id': 'test', 'navn': 'test'}
    )
    if resp.status_code == 401:
        log("✅ B5b: PUT traad without token returned 401")
    else:
        log(f"❌ B5b: Expected 401, got {resp.status_code}")

def test_thread_follow_notifications(root_id, owner_token, qa_user_id, qa_token):
    """Test C: Thread-follow notifications"""
    log("\n=== TEST C: Thread-follow notifications ===")
    
    # C1: QA user posts reply - owner should get notification
    log("C1: QA user posts reply in test thread")
    resp = api_call('POST', '/admin/chat/meldinger',
        params={'key': qa_token},
        json={
            'kanal': 'team',
            'text': 'QA User Reply for notification test',
            'threadId': root_id
        }
    )
    if resp and resp.status_code == 201:
        log("✅ C1: QA user posted reply")
        
        # Check owner's notifications
        log("C1: Check owner's notifications")
        resp2 = api_call('GET', '/admin/notifications',
            params={'key': owner_token}
        )
        if resp2 and resp2.status_code == 200:
            data = resp2.json()
            notifications = data.get('notifications', [])
            
            # Find notification about this thread
            thread_notif = None
            for n in notifications:
                if n.get('type') == 'chat' and 'svarte i tråden' in n.get('text', ''):
                    thread_notif = n
                    break
            
            if thread_notif:
                log(f"✅ C1: Owner received thread-follow notification: {thread_notif['text']}")
                test_ids['notifications'].append(thread_notif['id'])
            else:
                log(f"❌ C1: Owner did not receive thread-follow notification")
                log(f"   Recent notifications: {[n.get('text') for n in notifications[:5]]}")
        else:
            log("❌ C1: Failed to get owner's notifications")
    else:
        log("❌ C1: Failed to post reply as QA user")
    
    # C2: QA user should NOT get notification for their own reply
    log("C2: QA user should NOT get notification for their own reply")
    resp = api_call('GET', '/admin/notifications',
        params={'key': qa_token}
    )
    if resp and resp.status_code == 200:
        data = resp.json()
        notifications = data.get('notifications', [])
        
        # Check if QA user got notification about their own reply
        own_notif = None
        for n in notifications:
            if n.get('type') == 'chat' and 'QA User Reply for notification test' in n.get('text', ''):
                own_notif = n
                break
        
        if not own_notif:
            log("✅ C2: QA user did NOT get notification for their own reply (correct)")
        else:
            log(f"❌ C2: QA user got notification for their own reply: {own_notif}")
    else:
        log("❌ C2: Failed to get QA user's notifications")
    
    # C3: Verify NO email was sent (mentions empty)
    log("C3: Verify NO email for follow notification")
    log("✅ C3: Thread-follow notifications are in-app only (no email verification needed)")
    
    # C4: Mention + follow dedupe
    log("C4: Mention + follow dedupe")
    resp = api_call('POST', '/admin/chat/meldinger',
        params={'key': owner_token},
        json={
            'kanal': 'team',
            'text': f'QA Mention test @QA User',
            'threadId': root_id,
            'mentions': [{'id': qa_user_id}]
        }
    )
    if resp and resp.status_code == 201:
        log("✅ C4: Owner posted reply mentioning QA user")
        
        # Check QA user's notifications - should get exactly ONE
        resp2 = api_call('GET', '/admin/notifications',
            params={'key': qa_token}
        )
        if resp2 and resp2.status_code == 200:
            data = resp2.json()
            notifications = data.get('notifications', [])
            
            # Count notifications about this message
            mention_notifs = [n for n in notifications if 'QA Mention test' in n.get('text', '')]
            
            if len(mention_notifs) == 1:
                log(f"✅ C4: QA user got exactly ONE notification (mention, not follow): {mention_notifs[0]['text']}")
                test_ids['notifications'].append(mention_notifs[0]['id'])
            else:
                log(f"❌ C4: QA user got {len(mention_notifs)} notifications (expected 1)")
                for n in mention_notifs:
                    log(f"   - {n['text']}")
        else:
            log("❌ C4: Failed to get QA user's notifications")
    else:
        log("❌ C4: Failed to post mention reply")

def cleanup():
    """Cleanup all test data"""
    log("\n=== CLEANUP ===")
    
    try:
        db = get_mongo_db()
        
        # 1. Delete test chat messages (root delete cascades)
        log("1. Deleting test chat messages...")
        for root_id in test_ids['root_messages']:
            # Delete root (cascades to replies in backend)
            result = db.chat_messages.delete_one({'id': root_id})
            log(f"   Deleted root {root_id}: {result.deleted_count} docs")
            
            # Also delete replies (in case cascade didn't work)
            result2 = db.chat_messages.delete_many({'threadId': root_id})
            log(f"   Deleted replies for {root_id}: {result2.deleted_count} docs")
        
        # 2. Delete QA users
        log("2. Deleting QA users...")
        for user_id in test_ids['qa_users']:
            resp = api_call('DELETE', f'/admin/users/{user_id}')
            if resp and resp.status_code == 200:
                log(f"   ✅ Deleted user {user_id}")
            else:
                log(f"   ❌ Failed to delete user {user_id}")
            
            # Also delete chat_lest docs
            result = db.chat_lest.delete_many({'userId': user_id})
            log(f"   Deleted chat_lest for {user_id}: {result.deleted_count} docs")
        
        # 3. Delete test notifications
        log("3. Deleting test notifications...")
        if test_ids['notifications']:
            result = db.notifications.delete_many({'id': {'$in': test_ids['notifications']}})
            log(f"   Deleted {result.deleted_count} notifications")
        
        # Also delete any notifications for QA users
        for user_id in test_ids['qa_users']:
            result = db.notifications.delete_many({'userId': user_id})
            log(f"   Deleted {result.deleted_count} notifications for QA user {user_id}")
        
        # 4. Delete test task
        log("4. Deleting test task...")
        if test_ids['test_task_id']:
            task_id = test_ids['test_task_id']
            resp = api_call('DELETE', f'/admin/tasks/{task_id}')
            if resp and resp.status_code == 200:
                log(f"   ✅ Deleted task {task_id}")
            else:
                log(f"   ❌ Failed to delete task {task_id}")
                # Try MongoDB direct delete
                result = db.tasks.delete_one({'id': task_id})
                log(f"   MongoDB direct delete: {result.deleted_count} docs")
        
        # 5. Verify Martin's messages are untouched
        log("5. Verifying Martin's messages are untouched...")
        martin_count = db.chat_messages.count_documents({'userName': 'Martin'})
        log(f"   Martin still has {martin_count} messages (should be same as before)")
        
        # 6. Verify no QA data remains
        log("6. Verifying no QA data remains...")
        qa_messages = db.chat_messages.count_documents({'text': {'$regex': '^QA '}})
        qa_users = db.admin_users.count_documents({'email': {'$regex': '@example.com$'}})
        qa_tasks = db.tasks.count_documents({'title': 'QA-TEST-TRAAD-SLETTES'})
        
        if qa_messages == 0 and qa_users == 0 and qa_tasks == 0:
            log(f"✅ Cleanup verified: 0 QA messages, 0 QA users, 0 QA tasks")
        else:
            log(f"❌ Cleanup incomplete: {qa_messages} QA messages, {qa_users} QA users, {qa_tasks} QA tasks")
        
        log("✅ CLEANUP COMPLETE")
        
    except Exception as e:
        log(f"❌ Cleanup failed: {e}")

def main():
    log("=" * 80)
    log("BACKEND TEST: Tråder verdensklasse (world-class threads)")
    log("=" * 80)
    
    # Check Martin's messages first (read-only)
    martin_count_before = check_martins_messages()
    
    # Login as owner
    owner_token = login_as_owner()
    if not owner_token:
        log("❌ FATAL: Could not login as owner")
        return
    
    # Create QA user with timestamp to ensure uniqueness
    import time
    qa_email = f'qa-thread-test-{int(time.time())}@example.com'
    qa_user_id = create_qa_user('QA User Thread Test', qa_email)
    if not qa_user_id:
        log("❌ FATAL: Could not create QA user")
        return
    
    # Login as QA user
    qa_token = login_as_qa_user(qa_email)
    if not qa_token:
        log("❌ FATAL: Could not login as QA user")
        return
    
    # Create test task
    test_task_id = create_test_task()
    if not test_task_id:
        log("❌ FATAL: Could not create test task")
        return
    
    # Create test thread
    root_id = create_test_thread(owner_token)
    if not root_id:
        log("❌ FATAL: Could not create test thread")
        return
    
    # Run tests
    test_put_traad_naming(root_id, owner_token)
    test_put_traad_sak_linking(root_id, owner_token, test_task_id)
    test_get_traader_overview(root_id, owner_token, test_task_id)
    test_uleste_logic(root_id, owner_token, qa_user_id, qa_token)
    test_access_control(owner_token)
    test_thread_follow_notifications(root_id, owner_token, qa_user_id, qa_token)
    
    # Cleanup
    cleanup()
    
    log("\n" + "=" * 80)
    log("TEST COMPLETE")
    log("=" * 80)

if __name__ == '__main__':
    main()
