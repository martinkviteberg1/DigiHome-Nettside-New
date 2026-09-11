#!/usr/bin/env python3
"""
Backend test for STYRERAPPORT RIK SEKSJON (Tiptap-doc sanitizer).
Tests the NEW 'rik' block type + server-side sanitizer in POST /api/admin/styrerapport.

CRITICAL: styrerapport document contains USER'S REAL CONTENT.
MANDATORY protocol:
  (0) BACKUP full rapport object BEFORE any POST
  (Z) RESTORE it EXACTLY afterwards (even on failure)
  Verify GET returns same blokker after restore
"""

import requests
import json
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Global backup storage
BACKUP_RAPPORT = None
BACKUP_FROM_MONGO = None

def print_test(msg):
    """Print test message"""
    print(f"\n{'='*80}")
    print(f"  {msg}")
    print('='*80)

def print_result(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    return passed

def backup_rapport():
    """(0) BACKUP: Save full rapport object before any POST"""
    global BACKUP_RAPPORT, BACKUP_FROM_MONGO
    
    print_test("STEP 0: MANDATORY BACKUP")
    
    try:
        # Backup via GET endpoint
        response = requests.get(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            BACKUP_RAPPORT = data.get('rapport')
            print(f"✅ Backed up rapport via GET endpoint")
            if BACKUP_RAPPORT:
                blokker_count = len(BACKUP_RAPPORT.get('blokker', []))
                rik_count = sum(1 for b in BACKUP_RAPPORT.get('blokker', []) if b.get('type') == 'rik')
                print(f"   - Total blokker: {blokker_count}")
                print(f"   - Rik blokker: {rik_count}")
                if rik_count > 0:
                    print(f"   - CRITICAL: Contains {rik_count} rik block(s) with user's real content")
            else:
                print(f"   - Rapport is null (no saved document)")
        else:
            print(f"❌ Failed to backup via GET: {response.status_code}")
            return False
        
        # Also backup directly from MongoDB as fallback
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        coll = db['styrerapport']
        BACKUP_FROM_MONGO = coll.find_one({'id': 'styrerapport'})
        if BACKUP_FROM_MONGO:
            # Remove MongoDB _id for clean restore
            BACKUP_FROM_MONGO.pop('_id', None)
            print(f"✅ Also backed up from MongoDB (fallback)")
        else:
            print(f"   - MongoDB document is null")
        client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ CRITICAL: Backup failed: {e}")
        return False

def restore_rapport():
    """(Z) RESTORE: Write backup back and verify"""
    global BACKUP_RAPPORT, BACKUP_FROM_MONGO
    
    print_test("STEP Z: MANDATORY RESTORE")
    
    try:
        if BACKUP_RAPPORT:
            # Restore via POST endpoint
            response = requests.post(
                f"{BASE_URL}/admin/styrerapport",
                params={"key": ADMIN_KEY},
                json=BACKUP_RAPPORT,
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"✅ Restored rapport via POST endpoint")
            else:
                print(f"❌ Failed to restore via POST: {response.status_code}")
                # Try MongoDB restore as fallback
                if BACKUP_FROM_MONGO:
                    print(f"   Attempting MongoDB fallback restore...")
                    client = MongoClient(MONGO_URL)
                    db = client[DB_NAME]
                    coll = db['styrerapport']
                    coll.replace_one({'id': 'styrerapport'}, BACKUP_FROM_MONGO, upsert=True)
                    client.close()
                    print(f"✅ Restored via MongoDB fallback")
        else:
            # Rapport was null, delete the document
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            coll = db['styrerapport']
            result = coll.delete_one({'id': 'styrerapport'})
            client.close()
            print(f"✅ Restored null state (deleted document, deleted_count={result.deleted_count})")
        
        # Verify restoration
        response = requests.get(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            restored = data.get('rapport')
            
            if BACKUP_RAPPORT is None and restored is None:
                print(f"✅ Verified: rapport is null (as expected)")
                return True
            elif BACKUP_RAPPORT and restored:
                # Compare blokker count and ids
                backup_blokker = BACKUP_RAPPORT.get('blokker', [])
                restored_blokker = restored.get('blokker', [])
                
                if len(backup_blokker) == len(restored_blokker):
                    print(f"✅ Verified: same blokker count ({len(backup_blokker)})")
                    
                    # Check ids match
                    backup_ids = [b.get('id') for b in backup_blokker]
                    restored_ids = [b.get('id') for b in restored_blokker]
                    if backup_ids == restored_ids:
                        print(f"✅ Verified: same blokker ids")
                    else:
                        print(f"⚠️  Warning: blokker ids differ")
                    
                    # Check rik blocks have doc
                    backup_rik = [b for b in backup_blokker if b.get('type') == 'rik']
                    restored_rik = [b for b in restored_blokker if b.get('type') == 'rik']
                    if len(backup_rik) == len(restored_rik):
                        print(f"✅ Verified: same rik block count ({len(backup_rik)})")
                        for i, (b, r) in enumerate(zip(backup_rik, restored_rik)):
                            if b.get('doc') and r.get('doc'):
                                print(f"   - Rik block {i+1}: has doc ✓")
                            else:
                                print(f"   - Rik block {i+1}: missing doc ⚠️")
                    else:
                        print(f"⚠️  Warning: rik block count differs")
                    
                    return True
                else:
                    print(f"❌ Verification failed: blokker count differs (backup={len(backup_blokker)}, restored={len(restored_blokker)})")
                    return False
            else:
                print(f"❌ Verification failed: restoration state mismatch")
                return False
        else:
            print(f"❌ Verification failed: GET returned {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ CRITICAL: Restore failed: {e}")
        return False

def test_t1_valid_rik():
    """T1: Valid rich doc roundtrip (including link attrs)"""
    print_test("T1: VALID RIK - roundtrip with all whitelisted nodes/marks")
    
    try:
        # Prepare test body with backup's metadata + test blokker
        body = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{
                'type': 'rik',
                'tittel': 'QA Rik',
                'kicker': 'Marked',
                'layout': 'magasin',
                'etter': 'nokkeltall',
                'doc': {
                    'type': 'doc',
                    'content': [
                        {
                            'type': 'heading',
                            'attrs': {'level': 2},
                            'content': [{'type': 'text', 'text': 'Tittel'}]
                        },
                        {
                            'type': 'paragraph',
                            'content': [
                                {'type': 'text', 'text': 'Fet', 'marks': [{'type': 'bold'}]},
                                {'type': 'text', 'text': ' og lenke ', 'marks': [{'type': 'link', 'attrs': {'href': 'https://digihome.no'}}]}
                            ]
                        },
                        {
                            'type': 'bulletList',
                            'content': [{
                                'type': 'listItem',
                                'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Punkt'}]}]
                            }]
                        },
                        {
                            'type': 'blockquote',
                            'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Sitat'}]}]
                        },
                        {
                            'type': 'callout',
                            'attrs': {'variant': 'vedtak'},
                            'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Vedtak'}]}]
                        },
                        {'type': 'horizontalRule'}
                    ]
                }
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body,
            timeout=30
        )
        
        if response.status_code != 200:
            return print_result("T1", False, f"POST returned {response.status_code}")
        
        data = response.json()
        if not data.get('ok'):
            return print_result("T1", False, "Response ok=false")
        
        rapport = data.get('rapport', {})
        blokker = rapport.get('blokker', [])
        
        if len(blokker) != 1:
            return print_result("T1", False, f"Expected 1 blokk, got {len(blokker)}")
        
        blokk = blokker[0]
        
        # Verify basic fields
        checks = []
        checks.append(('type', blokk.get('type') == 'rik', f"type={blokk.get('type')}"))
        checks.append(('kicker', blokk.get('kicker') == 'Marked', f"kicker={blokk.get('kicker')}"))
        checks.append(('layout', blokk.get('layout') == 'magasin', f"layout={blokk.get('layout')}"))
        checks.append(('etter', blokk.get('etter') == 'nokkeltall', f"etter={blokk.get('etter')}"))
        
        doc = blokk.get('doc', {})
        content = doc.get('content', [])
        
        checks.append(('doc.content length', len(content) == 6, f"content has {len(content)} nodes"))
        
        if len(content) >= 6:
            # Check heading
            h = content[0]
            checks.append(('heading.type', h.get('type') == 'heading', f"node[0].type={h.get('type')}"))
            checks.append(('heading.level', h.get('attrs', {}).get('level') == 2, f"level={h.get('attrs', {}).get('level')}"))
            
            # Check paragraph with marks
            p = content[1]
            checks.append(('paragraph.type', p.get('type') == 'paragraph', f"node[1].type={p.get('type')}"))
            p_content = p.get('content', [])
            if len(p_content) >= 2:
                # Check bold mark
                bold_text = p_content[0]
                bold_marks = bold_text.get('marks', [])
                checks.append(('bold mark kept', any(m.get('type') == 'bold' for m in bold_marks), f"bold marks={bold_marks}"))
                
                # Check link mark with attrs
                link_text = p_content[1]
                link_marks = link_text.get('marks', [])
                link_mark = next((m for m in link_marks if m.get('type') == 'link'), None)
                if link_mark:
                    attrs = link_mark.get('attrs', {})
                    checks.append(('link.href', attrs.get('href') == 'https://digihome.no', f"href={attrs.get('href')}"))
                    checks.append(('link.target', attrs.get('target') == '_blank', f"target={attrs.get('target')}"))
                    checks.append(('link.rel', 'noopener' in (attrs.get('rel') or ''), f"rel={attrs.get('rel')}"))
                else:
                    checks.append(('link mark', False, "link mark not found"))
            
            # Check callout
            callout = content[4]
            checks.append(('callout.type', callout.get('type') == 'callout', f"node[4].type={callout.get('type')}"))
            checks.append(('callout.variant', callout.get('attrs', {}).get('variant') == 'vedtak', f"variant={callout.get('attrs', {}).get('variant')}"))
            
            # Check horizontalRule
            hr = content[5]
            checks.append(('horizontalRule.type', hr.get('type') == 'horizontalRule', f"node[5].type={hr.get('type')}"))
            checks.append(('horizontalRule.no content', 'content' not in hr, f"has content={('content' in hr)}"))
        
        # Print all checks
        all_passed = True
        for name, passed, detail in checks:
            status = "✓" if passed else "✗"
            print(f"  {status} {name}: {detail}")
            if not passed:
                all_passed = False
        
        return print_result("T1", all_passed, "Valid rik doc roundtrip with all whitelisted nodes/marks")
        
    except Exception as e:
        return print_result("T1", False, f"Exception: {e}")

def test_t2_dangerous_stripped():
    """T2: Dangerous/unknown stripped + defaults"""
    print_test("T2: DANGEROUS/UNKNOWN STRIPPED - sanitizer removes unsafe content")
    
    try:
        body = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{
                'type': 'rik',
                'tittel': 'QA Farlig',
                'layout': 'ukjent',  # Should default to 'standard'
                'etter': 'tull',     # Should default to 'slutt'
                'doc': {
                    'type': 'doc',
                    'content': [
                        {
                            'type': 'paragraph',
                            'content': [
                                {'type': 'text', 'text': 'js', 'marks': [{'type': 'link', 'attrs': {'href': 'javascript:alert(1)'}}]},
                                {'type': 'text', 'text': 'data', 'marks': [{'type': 'link', 'attrs': {'href': 'data:text/html,x'}}]},
                                {'type': 'text', 'text': 'ok', 'marks': [{'type': 'link', 'attrs': {'href': 'mailto:a@b.no'}}, {'type': 'ukjentMark'}]}
                            ]
                        },
                        {'type': 'image', 'attrs': {'src': 'https://x/y.png'}},
                        {'type': 'script', 'content': [{'type': 'text', 'text': 'x'}]},
                        {'type': 'heading', 'attrs': {'level': 1}, 'content': [{'type': 'text', 'text': 'H1'}]},
                        {'type': 'callout', 'attrs': {'variant': 'evil'}, 'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'c'}]}]},
                        {'type': 'iframe'}
                    ]
                }
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body,
            timeout=30
        )
        
        if response.status_code != 200:
            return print_result("T2", False, f"POST returned {response.status_code} (should be 200, no 500)")
        
        data = response.json()
        rapport = data.get('rapport', {})
        blokker = rapport.get('blokker', [])
        blokk = blokker[0]
        
        checks = []
        
        # Check defaults
        checks.append(('layout default', blokk.get('layout') == 'standard', f"layout={blokk.get('layout')}"))
        checks.append(('etter default', blokk.get('etter') == 'slutt', f"etter={blokk.get('etter')}"))
        
        doc = blokk.get('doc', {})
        content = doc.get('content', [])
        
        # Find paragraph with text nodes
        para = next((n for n in content if n.get('type') == 'paragraph'), None)
        if para:
            para_content = para.get('content', [])
            
            # Check 'js' text has NO marks (javascript: link dropped)
            js_text = next((t for t in para_content if t.get('text') == 'js'), None)
            if js_text:
                js_marks = js_text.get('marks', [])
                checks.append(('js text no marks', len(js_marks) == 0, f"js marks={js_marks}"))
            
            # Check 'data' text has NO marks (data: link dropped)
            data_text = next((t for t in para_content if t.get('text') == 'data'), None)
            if data_text:
                data_marks = data_text.get('marks', [])
                checks.append(('data text no marks', len(data_marks) == 0, f"data marks={data_marks}"))
            
            # Check 'ok' text has exactly ONE mark (mailto: link kept, ukjentMark stripped)
            ok_text = next((t for t in para_content if t.get('text') == 'ok'), None)
            if ok_text:
                ok_marks = ok_text.get('marks', [])
                checks.append(('ok text 1 mark', len(ok_marks) == 1, f"ok marks count={len(ok_marks)}"))
                if len(ok_marks) == 1:
                    link_mark = ok_marks[0]
                    checks.append(('ok link type', link_mark.get('type') == 'link', f"mark type={link_mark.get('type')}"))
                    checks.append(('ok link href', link_mark.get('attrs', {}).get('href') == 'mailto:a@b.no', f"href={link_mark.get('attrs', {}).get('href')}"))
        
        # Check dangerous nodes are stripped
        node_types = [n.get('type') for n in content]
        checks.append(('no image', 'image' not in node_types, f"node types={node_types}"))
        checks.append(('no script', 'script' not in node_types, f"node types={node_types}"))
        checks.append(('no iframe', 'iframe' not in node_types, f"node types={node_types}"))
        
        # Check heading level coerced to 2
        heading = next((n for n in content if n.get('type') == 'heading'), None)
        if heading:
            checks.append(('heading level coerced', heading.get('attrs', {}).get('level') == 2, f"level={heading.get('attrs', {}).get('level')}"))
        
        # Check callout variant coerced to 'info'
        callout = next((n for n in content if n.get('type') == 'callout'), None)
        if callout:
            checks.append(('callout variant coerced', callout.get('attrs', {}).get('variant') == 'info', f"variant={callout.get('attrs', {}).get('variant')}"))
        
        # Print all checks
        all_passed = True
        for name, passed, detail in checks:
            status = "✓" if passed else "✗"
            print(f"  {status} {name}: {detail}")
            if not passed:
                all_passed = False
        
        return print_result("T2", all_passed, "Dangerous/unknown content stripped, defaults applied, no 500")
        
    except Exception as e:
        return print_result("T2", False, f"Exception: {e}")

def test_t3_defaults_empty():
    """T3: Defaults/empty doc"""
    print_test("T3: DEFAULTS/EMPTY - empty doc gets default paragraph")
    
    try:
        # Test 1: rik block without doc/kicker/layout/etter
        body1 = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{'type': 'rik', 'tittel': 'QA Tom'}]
        }
        
        response1 = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body1,
            timeout=30
        )
        
        if response1.status_code != 200:
            return print_result("T3", False, f"POST 1 returned {response1.status_code}")
        
        data1 = response1.json()
        blokk1 = data1.get('rapport', {}).get('blokker', [])[0]
        doc1 = blokk1.get('doc', {})
        
        checks = []
        checks.append(('doc.type', doc1.get('type') == 'doc', f"doc.type={doc1.get('type')}"))
        checks.append(('doc.content[0].type', doc1.get('content', [{}])[0].get('type') == 'paragraph', f"content[0]={doc1.get('content', [{}])[0]}"))
        checks.append(('kicker empty', blokk1.get('kicker') == '', f"kicker={blokk1.get('kicker')}"))
        checks.append(('layout default', blokk1.get('layout') == 'standard', f"layout={blokk1.get('layout')}"))
        checks.append(('etter default', blokk1.get('etter') == 'slutt', f"etter={blokk1.get('etter')}"))
        
        # Test 2: doc that is not type 'doc'
        body2 = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{'type': 'rik', 'tittel': 'QA Tom 2', 'doc': {'type': 'paragraph'}}]
        }
        
        response2 = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body2,
            timeout=30
        )
        
        if response2.status_code != 200:
            return print_result("T3", False, f"POST 2 returned {response2.status_code}")
        
        data2 = response2.json()
        blokk2 = data2.get('rapport', {}).get('blokker', [])[0]
        doc2 = blokk2.get('doc', {})
        
        checks.append(('invalid doc.type', doc2.get('type') == 'doc', f"doc.type={doc2.get('type')}"))
        checks.append(('invalid doc.content[0]', doc2.get('content', [{}])[0].get('type') == 'paragraph', f"content[0]={doc2.get('content', [{}])[0]}"))
        
        # Print all checks
        all_passed = True
        for name, passed, detail in checks:
            status = "✓" if passed else "✗"
            print(f"  {status} {name}: {detail}")
            if not passed:
                all_passed = False
        
        return print_result("T3", all_passed, "Empty/invalid doc gets default {type:'doc',content:[{type:'paragraph'}]}")
        
    except Exception as e:
        return print_result("T3", False, f"Exception: {e}")

def test_t4_size_depth_caps():
    """T4: Size/depth caps (no 500)"""
    print_test("T4: SIZE/DEPTH CAPS - text capped at 5000 chars, deep nesting dropped")
    
    try:
        # Test 1: Text capped at 5000 chars
        body1 = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{
                'type': 'rik',
                'tittel': 'QA Stor',
                'doc': {
                    'type': 'doc',
                    'content': [{
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': 'A' * 20000}]
                    }]
                }
            }]
        }
        
        response1 = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body1,
            timeout=30
        )
        
        if response1.status_code != 200:
            return print_result("T4", False, f"POST 1 returned {response1.status_code} (should be 200, no 500)")
        
        data1 = response1.json()
        blokk1 = data1.get('rapport', {}).get('blokker', [])[0]
        doc1 = blokk1.get('doc', {})
        text_node = doc1.get('content', [{}])[0].get('content', [{}])[0]
        text_len = len(text_node.get('text', ''))
        
        checks = []
        checks.append(('text capped at 5000', text_len == 5000, f"text length={text_len}"))
        
        # Test 2: Deep nesting (20 levels of blockquote)
        def make_nested_blockquote(depth):
            if depth == 0:
                return {'type': 'paragraph', 'content': [{'type': 'text', 'text': f'Level {depth}'}]}
            return {
                'type': 'blockquote',
                'content': [make_nested_blockquote(depth - 1)]
            }
        
        body2 = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [{
                'type': 'rik',
                'tittel': 'QA Dyp',
                'doc': {
                    'type': 'doc',
                    'content': [make_nested_blockquote(20)]
                }
            }]
        }
        
        response2 = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body2,
            timeout=30
        )
        
        if response2.status_code != 200:
            return print_result("T4", False, f"POST 2 returned {response2.status_code} (should be 200, no 500)")
        
        data2 = response2.json()
        blokk2 = data2.get('rapport', {}).get('blokker', [])[0]
        doc2 = blokk2.get('doc', {})
        
        # Count actual depth
        def count_depth(node):
            if not isinstance(node, dict) or 'content' not in node:
                return 0
            content = node.get('content', [])
            if not content:
                return 0
            return 1 + max((count_depth(c) for c in content), default=0)
        
        actual_depth = count_depth(doc2)
        checks.append(('depth capped', actual_depth <= 15, f"actual depth={actual_depth} (max 14+1 for doc)"))
        
        # Print all checks
        all_passed = True
        for name, passed, detail in checks:
            status = "✓" if passed else "✗"
            print(f"  {status} {name}: {detail}")
            if not passed:
                all_passed = False
        
        return print_result("T4", all_passed, "Size/depth caps working, no 500 errors")
        
    except Exception as e:
        return print_result("T4", False, f"Exception: {e}")

def test_t5_mixed_roundtrip():
    """T5: Mixed tall/rik/liste roundtrip via GET and public GET"""
    print_test("T5: MIXED ROUNDTRIP - tall/rik/liste via GET and public share link")
    
    try:
        # POST mixed blokker
        body = {
            'tittel': BACKUP_RAPPORT.get('tittel', 'Styrerapport') if BACKUP_RAPPORT else 'Styrerapport',
            'motedato': BACKUP_RAPPORT.get('motedato', '') if BACKUP_RAPPORT else '',
            'periodeLabel': BACKUP_RAPPORT.get('periodeLabel', '') if BACKUP_RAPPORT else '',
            'sammendrag': BACKUP_RAPPORT.get('sammendrag', '') if BACKUP_RAPPORT else '',
            'ask': BACKUP_RAPPORT.get('ask', []) if BACKUP_RAPPORT else [],
            'blokker': [
                {
                    'type': 'tall',
                    'tittel': 'KPI',
                    'tall': [{'etikett': 'A', 'verdi': '1'}]
                },
                {
                    'type': 'rik',
                    'tittel': 'QA Rik 2',
                    'doc': {
                        'type': 'doc',
                        'content': [{
                            'type': 'paragraph',
                            'content': [{'type': 'text', 'text': 'hei'}]
                        }]
                    }
                },
                {
                    'type': 'liste',
                    'tittel': 'L',
                    'punkter': ['x']
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            json=body,
            timeout=30
        )
        
        if response.status_code != 200:
            return print_result("T5", False, f"POST returned {response.status_code}")
        
        data = response.json()
        post_blokker = data.get('rapport', {}).get('blokker', [])
        
        checks = []
        checks.append(('POST 3 blokker', len(post_blokker) == 3, f"blokker count={len(post_blokker)}"))
        
        if len(post_blokker) == 3:
            checks.append(('blokk[0] tall', post_blokker[0].get('type') == 'tall', f"type={post_blokker[0].get('type')}"))
            checks.append(('blokk[1] rik', post_blokker[1].get('type') == 'rik', f"type={post_blokker[1].get('type')}"))
            checks.append(('blokk[2] liste', post_blokker[2].get('type') == 'liste', f"type={post_blokker[2].get('type')}"))
            checks.append(('rik has doc', 'doc' in post_blokker[1], f"rik keys={list(post_blokker[1].keys())}"))
        
        # GET admin endpoint
        get_response = requests.get(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if get_response.status_code != 200:
            return print_result("T5", False, f"GET returned {get_response.status_code}")
        
        get_data = get_response.json()
        get_blokker = get_data.get('rapport', {}).get('blokker', [])
        
        checks.append(('GET 3 blokker', len(get_blokker) == 3, f"blokker count={len(get_blokker)}"))
        if len(get_blokker) == 3:
            checks.append(('GET rik has doc', 'doc' in get_blokker[1], f"rik keys={list(get_blokker[1].keys())}"))
        
        # Get or create a share link for public GET test
        links_response = requests.get(
            f"{BASE_URL}/admin/styrerapport/lenker",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        token = None
        temp_link_id = None
        
        if links_response.status_code == 200:
            links_data = links_response.json()
            lenker = links_data.get('lenker', [])
            active_link = next((l for l in lenker if l.get('aktiv')), None)
            
            if active_link:
                token = active_link.get('token')
                print(f"  Using existing active link: {token}")
            else:
                # Create temporary link
                create_response = requests.post(
                    f"{BASE_URL}/admin/styrerapport/lenker",
                    params={"key": ADMIN_KEY},
                    json={'label': 'QA Temp Link', 'utloperDager': 1, 'inkluderRegnskap': False},
                    timeout=30
                )
                if create_response.status_code == 200:
                    create_data = create_response.json()
                    token = create_data.get('lenke', {}).get('token')
                    temp_link_id = create_data.get('lenke', {}).get('id')
                    print(f"  Created temporary link: {token}")
        
        if token:
            # Public GET
            public_response = requests.get(
                f"{BASE_URL}/styrerapport/del/{token}",
                timeout=30
            )
            
            if public_response.status_code != 200:
                checks.append(('PUBLIC GET', False, f"returned {public_response.status_code}"))
            else:
                public_data = public_response.json()
                public_blokker = public_data.get('rapport', {}).get('blokker', [])
                
                checks.append(('PUBLIC GET 3 blokker', len(public_blokker) == 3, f"blokker count={len(public_blokker)}"))
                if len(public_blokker) == 3:
                    checks.append(('PUBLIC rik has doc', 'doc' in public_blokker[1], f"rik keys={list(public_blokker[1].keys())}"))
            
            # Delete temporary link if created
            if temp_link_id:
                requests.delete(
                    f"{BASE_URL}/admin/styrerapport/lenker/{temp_link_id}",
                    params={"key": ADMIN_KEY},
                    timeout=30
                )
                print(f"  Deleted temporary link: {temp_link_id}")
        else:
            checks.append(('PUBLIC GET', False, "Could not get/create share link"))
        
        # Print all checks
        all_passed = True
        for name, passed, detail in checks:
            status = "✓" if passed else "✗"
            print(f"  {status} {name}: {detail}")
            if not passed:
                all_passed = False
        
        return print_result("T5", all_passed, "Mixed blokker roundtrip via GET and public share link")
        
    except Exception as e:
        return print_result("T5", False, f"Exception: {e}")

def test_t6_auth():
    """T6: Auth - 401 without key"""
    print_test("T6: AUTH - POST without key returns 401")
    
    try:
        body = {
            'tittel': 'Test',
            'blokker': []
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            json=body,
            timeout=30
        )
        
        passed = response.status_code == 401
        return print_result("T6", passed, f"POST without key returned {response.status_code}")
        
    except Exception as e:
        return print_result("T6", False, f"Exception: {e}")

def main():
    """Main test runner"""
    print("\n" + "="*80)
    print("  STYRERAPPORT RIK SEKSJON - Backend Test")
    print("  Testing NEW 'rik' block type + server-side sanitizer")
    print("="*80)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    
    results = []
    
    try:
        # STEP 0: MANDATORY BACKUP
        if not backup_rapport():
            print("\n❌ CRITICAL: Backup failed. Aborting tests.")
            sys.exit(1)
        
        # Run tests
        results.append(("T1: Valid rik", test_t1_valid_rik()))
        results.append(("T2: Dangerous stripped", test_t2_dangerous_stripped()))
        results.append(("T3: Defaults/empty", test_t3_defaults_empty()))
        results.append(("T4: Size/depth caps", test_t4_size_depth_caps()))
        results.append(("T5: Mixed roundtrip", test_t5_mixed_roundtrip()))
        results.append(("T6: Auth", test_t6_auth()))
        
    finally:
        # STEP Z: MANDATORY RESTORE (always run, even on failure)
        if not restore_rapport():
            print("\n❌ CRITICAL: Restore failed. Manual intervention required!")
            sys.exit(1)
    
    # Summary
    print("\n" + "="*80)
    print("  TEST SUMMARY")
    print("="*80)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed ({100*passed_count//total_count}% success rate)")
    
    if passed_count == total_count:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ {total_count - passed_count} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
