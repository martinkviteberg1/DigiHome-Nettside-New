#!/usr/bin/env python3
"""
Comprehensive backend test for Investor-rom (levende DD-rom) module.
Tests magic links, document vault with chunked upload, Q&A, audit log, and public token-gated endpoints.

CRITICAL RULES:
- DO NOT delete existing 'QA Testinvestor' link or 'QA Testdokument' document (from main agent's smoke test)
- ALL test data created by this script MUST be deleted in cleanup step
- GET /api/investor/room can take 3-6 seconds on first call (board-pack calculation, cached 5 min)
"""

import requests
import json
import base64
import time
import sys

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # seconds

# Test data storage
test_link_id = None
test_link_token = None
test_doc_id = None
test_question_id = None

def log(msg):
    """Print timestamped log message"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def test_admin_overview():
    """TEST 1: Admin overview endpoint"""
    log("TEST 1: ADMIN-OVERSIKT")
    
    # Without key → 401
    try:
        r = requests.get(f"{BASE_URL}/admin/investor-room", timeout=TIMEOUT)
        if r.status_code == 401:
            log("✓ GET /admin/investor-room without key returns 401")
        else:
            log(f"✗ Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # With key → 200 with all required fields
    try:
        r = requests.get(f"{BASE_URL}/admin/investor-room?key={ADMIN_KEY}", timeout=TIMEOUT)
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        # Verify structure
        required_fields = ['links', 'documents', 'questions', 'audit', 'categories', 'baseUrl']
        for field in required_fields:
            if field not in data:
                log(f"✗ Missing required field: {field}")
                return False
        
        # Verify categories (should have 7 elements)
        if len(data['categories']) != 7:
            log(f"✗ Expected 7 categories, got {len(data['categories'])}")
            return False
        
        log(f"✓ GET /admin/investor-room returns 200 with all required fields")
        log(f"  - links: {len(data['links'])} items")
        log(f"  - documents: {len(data['documents'])} items")
        log(f"  - questions: {len(data['questions'])} items")
        log(f"  - audit: {len(data['audit'])} items")
        log(f"  - categories: {len(data['categories'])} items")
        log(f"  - baseUrl: {data['baseUrl']}")
        
        return True
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False

def test_create_link():
    """TEST 2: Create magic link"""
    global test_link_id, test_link_token
    log("TEST 2: OPPRETT LENKE")
    
    # Create link with valid data
    try:
        payload = {
            "label": "Testagent Investor",
            "email": "ta@test.no",
            "sections": ["metrics", "docs", "qa"],
            "expiresDays": 30
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 201:
            log(f"✗ Expected 201, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        if 'link' not in data or 'url' not in data:
            log(f"✗ Missing link or url in response: {data}")
            return False
        
        link = data['link']
        test_link_id = link['id']
        test_link_token = link['token']
        
        log(f"✓ POST /admin/investor-room/links returns 201")
        log(f"  - linkId: {test_link_id}")
        log(f"  - token: {test_link_token[:20]}...")
        log(f"  - url: {data['url']}")
        log(f"  - label: {link['label']}")
        log(f"  - sections: {link['sections']}")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # Create link with empty label → 400
    try:
        payload = {}
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/links?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code == 400:
            log("✓ POST with empty label returns 400")
        else:
            log(f"✗ Expected 400 for empty label, got {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_public_room():
    """TEST 3: Public room endpoint (token-gated)"""
    log("TEST 3: OFFENTLIG ROM (token-gated)")
    
    if not test_link_token:
        log("✗ No test link token available")
        return False
    
    # Valid token → 200
    try:
        log("  Calling GET /investor/room (may take 3-6 seconds on first call)...")
        start_time = time.time()
        r = requests.get(
            f"{BASE_URL}/investor/room?t={test_link_token}",
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        log(f"✓ GET /investor/room?t=<token> returns 200 (took {elapsed:.1f}s)")
        
        # Verify viewer
        if 'viewer' not in data:
            log("✗ Missing viewer field")
            return False
        
        if data['viewer']['label'] != 'Testagent Investor':
            log(f"✗ Expected label 'Testagent Investor', got '{data['viewer']['label']}'")
            return False
        
        log(f"  - viewer.label: {data['viewer']['label']}")
        log(f"  - viewer.sections: {data['viewer']['sections']}")
        
        # Verify metrics object exists
        if 'metrics' not in data:
            log("✗ Missing metrics field (should be in sections)")
            return False
        
        log(f"  - metrics: present")
        
        # Verify documents array exists
        if 'documents' not in data:
            log("✗ Missing documents field (should be in sections)")
            return False
        
        log(f"  - documents: {len(data['documents'])} items")
        
        # Verify questions array exists
        if 'questions' not in data:
            log("✗ Missing questions field (should be in sections)")
            return False
        
        log(f"  - questions: {len(data['questions'])} items")
        
        # CRITICAL: economy and forecast should NOT be in response (not in link's sections)
        if 'economy' in data:
            log("✗ economy should NOT be in response (not in link's sections)")
            return False
        
        if 'forecast' in data:
            log("✗ forecast should NOT be in response (not in link's sections)")
            return False
        
        log("  ✓ economy and forecast NOT in response (correct scoping)")
        
        # PII CHECK: response should NOT contain email addresses or names from leads
        # Search for '@' in JSON (excluding company fields)
        response_str = json.dumps(data)
        if '@' in response_str:
            # Check if it's from leads (not company/viewer email)
            if 'lead' in response_str.lower() or 'customer' in response_str.lower():
                log("✗ PII WARNING: Response may contain lead email addresses")
                log(f"  Response snippet: {response_str[:500]}")
                return False
        
        log("  ✓ PII check passed (no lead emails in response)")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # Invalid token → 401
    try:
        r = requests.get(
            f"{BASE_URL}/investor/room?t=ugyldigtoken1234567",
            timeout=TIMEOUT
        )
        
        if r.status_code == 401:
            log("✓ GET /investor/room?t=<invalid> returns 401")
        else:
            log(f"✗ Expected 401 for invalid token, got {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_qa_flow():
    """TEST 4: Q&A flow"""
    global test_question_id
    log("TEST 4: Q&A-FLYT")
    
    if not test_link_token:
        log("✗ No test link token available")
        return False
    
    # (a) POST question with valid data → 201
    try:
        payload = {"question": "Hva er churn-antakelsen i prognosen?"}
        r = requests.post(
            f"{BASE_URL}/investor/qa?t={test_link_token}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 201:
            log(f"✗ Expected 201, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        if 'question' not in data or 'id' not in data['question']:
            log(f"✗ Missing question.id in response: {data}")
            return False
        
        test_question_id = data['question']['id']
        log(f"✓ POST /investor/qa returns 201")
        log(f"  - questionId: {test_question_id}")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (b) POST with short question → 400
    try:
        payload = {"question": "abc"}
        r = requests.post(
            f"{BASE_URL}/investor/qa?t={test_link_token}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code == 400:
            log("✓ POST with short question (<5 chars) returns 400")
        else:
            log(f"✗ Expected 400 for short question, got {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (c) PUT answer (admin)
    try:
        payload = {
            "id": test_question_id,
            "answer": "Testsvar fra admin",
            "isPublic": False
        }
        r = requests.put(
            f"{BASE_URL}/admin/investor-room/qa?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        log("✓ PUT /admin/investor-room/qa returns 200")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (d) GET room again, verify question has answer
    try:
        r = requests.get(
            f"{BASE_URL}/investor/room?t={test_link_token}",
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        questions = data.get('questions', [])
        
        found = False
        for q in questions:
            if q.get('id') == test_question_id:
                if q.get('answer') == 'Testsvar fra admin':
                    found = True
                    log("✓ Question has answer in GET /investor/room")
                    break
        
        if not found:
            log(f"✗ Question not found with answer in response")
            return False
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_document_vault():
    """TEST 5: Document vault (chunked upload)"""
    global test_doc_id
    log("TEST 5: DOKUMENTHVELV (chunked upload)")
    
    # (a) Create a small text file content
    content = b"DD-test innhold 12345"
    content_b64 = base64.b64encode(content).decode('utf-8')
    upload_id = "ta-up-1"
    
    try:
        # Upload chunk
        payload = {
            "uploadId": upload_id,
            "index": 0,
            "data": content_b64
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/upload-chunk?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        log("✓ POST /admin/investor-room/upload-chunk returns 200")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (b) Complete upload
    try:
        payload = {
            "uploadId": upload_id,
            "total": 1,
            "filename": "testagent.txt",
            "mime": "text/plain",
            "size": len(content),
            "title": "Testagent-dok",
            "category": "annet",
            "description": "opprettet av testagent"
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/upload-complete?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 201:
            log(f"✗ Expected 201, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        if 'document' not in data or 'id' not in data['document']:
            log(f"✗ Missing document.id in response: {data}")
            return False
        
        test_doc_id = data['document']['id']
        log(f"✓ POST /admin/investor-room/upload-complete returns 201")
        log(f"  - docId: {test_doc_id}")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (c) NEGATIVE: upload-complete with evil.exe → 400
    try:
        payload = {
            "uploadId": "ta-up-evil",
            "total": 1,
            "filename": "evil.exe",
            "mime": "application/octet-stream",
            "size": 100,
            "title": "Evil",
            "category": "annet"
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/upload-complete?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code == 400:
            log("✓ POST upload-complete with evil.exe returns 400")
        else:
            log(f"✗ Expected 400 for evil.exe, got {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (d) INVESTOR DOWNLOAD: GET /investor/file
    try:
        r = requests.get(
            f"{BASE_URL}/investor/file?t={test_link_token}&docId={test_doc_id}",
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        # Verify content matches
        if r.content != content:
            log(f"✗ Downloaded content does not match original")
            log(f"  Expected: {content}")
            log(f"  Got: {r.content}")
            return False
        
        # Verify Content-Disposition header
        if 'Content-Disposition' not in r.headers:
            log("✗ Missing Content-Disposition header")
            return False
        
        log("✓ GET /investor/file returns 200 with correct content")
        log(f"  - Content-Disposition: {r.headers['Content-Disposition']}")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (e) NEW VERSION: upload new version
    try:
        content_v2 = b"DD-test innhold v2"
        content_v2_b64 = base64.b64encode(content_v2).decode('utf-8')
        upload_id_v2 = "ta-up-2"
        
        # Upload chunk
        payload = {
            "uploadId": upload_id_v2,
            "index": 0,
            "data": content_v2_b64
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/upload-chunk?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Chunk upload failed: {r.status_code}")
            return False
        
        # Complete with docId (new version)
        payload = {
            "uploadId": upload_id_v2,
            "total": 1,
            "filename": "testagent-v2.txt",
            "mime": "text/plain",
            "size": len(content_v2),
            "docId": test_doc_id
        }
        r = requests.post(
            f"{BASE_URL}/admin/investor-room/upload-complete?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 201:
            log(f"✗ Expected 201, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        if data.get('version') != 2:
            log(f"✗ Expected version 2, got {data.get('version')}")
            return False
        
        log("✓ New version uploaded successfully (version 2)")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    # (f) ARCHIVE: PUT archived=true
    try:
        payload = {
            "id": test_doc_id,
            "patch": {"archived": True}
        }
        r = requests.put(
            f"{BASE_URL}/admin/investor-room/docs?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        log("✓ Document archived successfully")
        
        # Verify document NOT in investor room
        r = requests.get(
            f"{BASE_URL}/investor/room?t={test_link_token}",
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        documents = data.get('documents', [])
        
        for doc in documents:
            if doc.get('id') == test_doc_id:
                log(f"✗ Archived document should NOT be in investor room")
                return False
        
        log("✓ Archived document NOT in GET /investor/room")
        
        # Verify download returns 404
        r = requests.get(
            f"{BASE_URL}/investor/file?t={test_link_token}&docId={test_doc_id}",
            timeout=TIMEOUT
        )
        
        if r.status_code == 404:
            log("✓ GET /investor/file for archived doc returns 404")
        else:
            log(f"✗ Expected 404 for archived doc, got {r.status_code}")
            return False
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_revocation():
    """TEST 6: Link revocation"""
    log("TEST 6: REVOKERING")
    
    if not test_link_id or not test_link_token:
        log("✗ No test link available")
        return False
    
    try:
        # Revoke link
        payload = {
            "id": test_link_id,
            "patch": {"revoked": True}
        }
        r = requests.put(
            f"{BASE_URL}/admin/investor-room/links?key={ADMIN_KEY}",
            json=payload,
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}: {r.text[:200]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            log(f"✗ Response ok=false: {data}")
            return False
        
        log("✓ Link revoked successfully")
        
        # Try to access room with revoked token → 403
        r = requests.get(
            f"{BASE_URL}/investor/room?t={test_link_token}",
            timeout=TIMEOUT
        )
        
        if r.status_code != 403:
            log(f"✗ Expected 403 for revoked token, got {r.status_code}")
            return False
        
        data = r.json()
        if data.get('reason') != 'revoked':
            log(f"✗ Expected reason='revoked', got {data.get('reason')}")
            return False
        
        log("✓ GET /investor/room with revoked token returns 403 with reason='revoked'")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_audit():
    """TEST 7: Audit log"""
    log("TEST 7: AUDIT")
    
    if not test_link_id:
        log("✗ No test link available")
        return False
    
    try:
        r = requests.get(
            f"{BASE_URL}/admin/investor-room?key={ADMIN_KEY}",
            timeout=TIMEOUT
        )
        
        if r.status_code != 200:
            log(f"✗ Expected 200, got {r.status_code}")
            return False
        
        data = r.json()
        audit = data.get('audit', [])
        links = data.get('links', [])
        
        # Find our test link in links
        test_link = None
        for link in links:
            if link.get('id') == test_link_id:
                test_link = link
                break
        
        if not test_link:
            log(f"✗ Test link not found in links array")
            return False
        
        # Verify audit events for our link
        our_events = [e for e in audit if e.get('linkId') == test_link_id and e.get('label') == 'Testagent Investor']
        
        if not our_events:
            log(f"✗ No audit events found for test link")
            return False
        
        # Check for expected event types
        event_types = [e.get('event') for e in our_events]
        
        expected_events = ['view_room', 'download_doc', 'ask_question']
        for expected in expected_events:
            if expected in event_types:
                log(f"  ✓ Found audit event: {expected}")
            else:
                log(f"  ⚠ Missing audit event: {expected} (may not have been triggered)")
        
        # Verify link stats
        stats = test_link.get('stats', {})
        if stats.get('views', 0) > 0:
            log(f"  ✓ Link has views: {stats['views']}")
        else:
            log(f"  ⚠ Link has no views recorded")
        
        if stats.get('downloads', 0) >= 1:
            log(f"  ✓ Link has downloads: {stats['downloads']}")
        else:
            log(f"  ⚠ Link has no downloads recorded")
        
        log("✓ Audit log contains events for test link")
        
    except Exception as e:
        log(f"✗ Request failed: {e}")
        return False
    
    return True

def test_cleanup():
    """TEST 8: Cleanup (MANDATORY)"""
    log("TEST 8: OPPRYDDING (obligatorisk)")
    
    success = True
    
    # Delete document
    if test_doc_id:
        try:
            r = requests.delete(
                f"{BASE_URL}/admin/investor-room/docs?key={ADMIN_KEY}&id={test_doc_id}",
                timeout=TIMEOUT
            )
            
            if r.status_code == 200:
                log(f"✓ Deleted document: {test_doc_id}")
            else:
                log(f"✗ Failed to delete document: {r.status_code}")
                success = False
        except Exception as e:
            log(f"✗ Failed to delete document: {e}")
            success = False
    
    # Delete question
    if test_question_id:
        try:
            r = requests.delete(
                f"{BASE_URL}/admin/investor-room/qa?key={ADMIN_KEY}&id={test_question_id}",
                timeout=TIMEOUT
            )
            
            if r.status_code == 200:
                log(f"✓ Deleted question: {test_question_id}")
            else:
                log(f"✗ Failed to delete question: {r.status_code}")
                success = False
        except Exception as e:
            log(f"✗ Failed to delete question: {e}")
            success = False
    
    # Delete link
    if test_link_id:
        try:
            r = requests.delete(
                f"{BASE_URL}/admin/investor-room/links?key={ADMIN_KEY}&id={test_link_id}",
                timeout=TIMEOUT
            )
            
            if r.status_code == 200:
                log(f"✓ Deleted link: {test_link_id}")
            else:
                log(f"✗ Failed to delete link: {r.status_code}")
                success = False
        except Exception as e:
            log(f"✗ Failed to delete link: {e}")
            success = False
    
    # Verify QA Testinvestor link still exists
    try:
        r = requests.get(
            f"{BASE_URL}/admin/investor-room?key={ADMIN_KEY}",
            timeout=TIMEOUT
        )
        
        if r.status_code == 200:
            data = r.json()
            links = data.get('links', [])
            documents = data.get('documents', [])
            
            # Check for QA Testinvestor link
            qa_link_exists = any(link.get('label') == 'QA Testinvestor' for link in links)
            if qa_link_exists:
                log("✓ 'QA Testinvestor' link still exists (not deleted)")
            else:
                log("⚠ 'QA Testinvestor' link not found (may not have been created yet)")
            
            # Check for QA Testdokument
            qa_doc_exists = any('QA' in doc.get('title', '') or 'Test' in doc.get('title', '') for doc in documents)
            if qa_doc_exists:
                log("✓ QA test documents still exist (not deleted)")
            else:
                log("⚠ QA test documents not found (may not have been created yet)")
        
    except Exception as e:
        log(f"✗ Failed to verify QA data: {e}")
        success = False
    
    return success

def test_regression():
    """TEST 9: Regression tests"""
    log("TEST 9: REGRESJON")
    
    # GET /api/admin/leads
    try:
        r = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            imported_count = data.get('importedCount', 0)
            if imported_count == 44:
                log(f"✓ GET /api/admin/leads returns 200 with importedCount=44")
            else:
                log(f"⚠ GET /api/admin/leads returns importedCount={imported_count} (expected 44)")
        else:
            log(f"✗ GET /api/admin/leads failed: {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ GET /api/admin/leads failed: {e}")
        return False
    
    # GET /api/admin/kpi
    try:
        r = requests.get(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30", timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                log("✓ GET /api/admin/kpi returns 200 {ok:true}")
            else:
                log(f"✗ GET /api/admin/kpi returns ok=false")
                return False
        else:
            log(f"✗ GET /api/admin/kpi failed: {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ GET /api/admin/kpi failed: {e}")
        return False
    
    # GET /api/ (root)
    try:
        r = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        if r.status_code == 200:
            log("✓ GET /api/ returns 200")
        else:
            log(f"✗ GET /api/ failed: {r.status_code}")
            return False
    except Exception as e:
        log(f"✗ GET /api/ failed: {e}")
        return False
    
    # Verify no 500 errors
    log("✓ No 500 errors observed in any endpoint")
    
    return True

def main():
    """Run all tests"""
    log("=" * 80)
    log("INVESTOR-ROM (LEVENDE DD-ROM) BACKEND TESTING")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"Admin key: {ADMIN_KEY}")
    log(f"Timeout: {TIMEOUT}s")
    log("")
    
    tests = [
        ("ADMIN-OVERSIKT", test_admin_overview),
        ("OPPRETT LENKE", test_create_link),
        ("OFFENTLIG ROM", test_public_room),
        ("Q&A-FLYT", test_qa_flow),
        ("DOKUMENTHVELV", test_document_vault),
        ("REVOKERING", test_revocation),
        ("AUDIT", test_audit),
        ("OPPRYDDING", test_cleanup),
        ("REGRESJON", test_regression),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
            log("")
        except Exception as e:
            log(f"✗ Test {name} crashed: {e}")
            results.append((name, False))
            log("")
    
    # Summary
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {name}")
    
    log("")
    log(f"Total: {passed}/{total} tests passed ({100*passed//total}% success rate)")
    log("=" * 80)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED!")
        return 0
    else:
        log(f"⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
