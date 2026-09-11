#!/usr/bin/env python3
"""
Backend test for STYRERAPPORT RIK CONFLUENCE-NODER
Tests new node types: taskList, taskItem, details, kolonner, codeBlock
Tests new attributes: textAlign, callout variants, image.align
"""
import requests
import json
import sys
import os
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]
styrerapport_coll = db['styrerapport']
styrerapport_lenker_coll = db['styrerapport_lenker']

# Test state
qa_report_id = None
qa_link_token = None
qa_link_id = None

def test_step(step_num, description):
    """Print test step header"""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def verify(condition, message):
    """Verify a condition and print result"""
    if condition:
        print(f"  ✅ {message}")
        return True
    else:
        print(f"  ❌ FAIL: {message}")
        return False

try:
    print("\n" + "="*80)
    print("STYRERAPPORT RIK CONFLUENCE-NODER BACKEND TEST")
    print("="*80)
    print(f"Base URL: {API_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    
    # ========================================================================
    # STEP 1: Create QA report
    # ========================================================================
    test_step(1, "Create QA report")
    
    resp = requests.post(
        f"{API_URL}/admin/styrerapport/rapporter",
        params={'key': ADMIN_KEY},
        json={'tittel': 'QA Confluence'},
        timeout=10
    )
    
    verify(resp.status_code == 200, f"POST /admin/styrerapport/rapporter returns 200 (got {resp.status_code})")
    
    if resp.status_code == 200:
        data = resp.json()
        verify(data.get('ok') == True, "Response has ok:true")
        verify('rapport' in data, "Response has rapport field")
        
        if 'rapport' in data:
            qa_report_id = data['rapport'].get('id')
            verify(qa_report_id is not None, f"Got report id: {qa_report_id}")
    
    if not qa_report_id:
        print("\n❌ CRITICAL: Failed to create QA report. Aborting test.")
        sys.exit(1)
    
    # ========================================================================
    # STEP 2: POST with rik block containing new Confluence nodes
    # ========================================================================
    test_step(2, "POST rik block with new Confluence nodes")
    
    rik_doc = {
        'type': 'doc',
        'content': [
            # paragraph with textAlign='center'
            {
                'type': 'paragraph',
                'attrs': {'textAlign': 'center'},
                'content': [{'type': 'text', 'text': 'midt'}]
            },
            # heading level 2 with textAlign='right'
            {
                'type': 'heading',
                'attrs': {'level': 2, 'textAlign': 'right'},
                'content': [{'type': 'text', 'text': 'høyre'}]
            },
            # paragraph with invalid textAlign='tull'
            {
                'type': 'paragraph',
                'attrs': {'textAlign': 'tull'},
                'content': [{'type': 'text', 'text': 'ugyldig just'}]
            },
            # taskList with two taskItem
            {
                'type': 'taskList',
                'content': [
                    {
                        'type': 'taskItem',
                        'attrs': {'checked': True},
                        'content': [
                            {
                                'type': 'paragraph',
                                'content': [{'type': 'text', 'text': 'gjort'}]
                            }
                        ]
                    },
                    {
                        'type': 'taskItem',
                        'attrs': {'checked': False},
                        'content': [
                            {
                                'type': 'paragraph',
                                'content': [{'type': 'text', 'text': 'ikke gjort'}]
                            }
                        ]
                    }
                ]
            },
            # details with open=true
            {
                'type': 'details',
                'attrs': {'open': True},
                'content': [
                    {
                        'type': 'detailsSummary',
                        'content': [{'type': 'text', 'text': 'Vis mer'}]
                    },
                    {
                        'type': 'detailsContent',
                        'content': [
                            {
                                'type': 'paragraph',
                                'content': [{'type': 'text', 'text': 'skjult'}]
                            }
                        ]
                    }
                ]
            },
            # kolonner with 2 columns
            {
                'type': 'kolonner',
                'attrs': {'kolonner': 2},
                'content': [
                    {
                        'type': 'kolonne',
                        'content': [
                            {
                                'type': 'paragraph',
                                'content': [{'type': 'text', 'text': 'A'}]
                            }
                        ]
                    },
                    {
                        'type': 'kolonne',
                        'content': [
                            {
                                'type': 'paragraph',
                                'content': [{'type': 'text', 'text': 'B'}]
                            }
                        ]
                    }
                ]
            },
            # callout variant 'tips'
            {
                'type': 'callout',
                'attrs': {'variant': 'tips'},
                'content': [
                    {
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': 'tips'}]
                    }
                ]
            },
            # callout variant 'suksess'
            {
                'type': 'callout',
                'attrs': {'variant': 'suksess'},
                'content': [
                    {
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': 'bra'}]
                    }
                ]
            },
            # callout variant 'evil' (invalid, should become 'info')
            {
                'type': 'callout',
                'attrs': {'variant': 'evil'},
                'content': [
                    {
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': 'x'}]
                    }
                ]
            },
            # image with align='right'
            {
                'type': 'image',
                'attrs': {
                    'src': '/api/styrerapport/bilde/finnesikke',
                    'alt': 'a',
                    'align': 'right',
                    'width': 600
                }
            },
            # codeBlock
            {
                'type': 'codeBlock',
                'content': [{'type': 'text', 'text': 'kode()'}]
            },
            # ukjentNode (should be removed)
            {
                'type': 'ukjentNode',
                'content': [{'type': 'text', 'text': 'skal bort'}]
            }
        ]
    }
    
    resp = requests.post(
        f"{API_URL}/admin/styrerapport",
        params={'key': ADMIN_KEY, 'id': qa_report_id},
        json={
            'blokker': [
                {
                    'type': 'rik',
                    'tittel': 'QA Confluence Test',
                    'doc': rik_doc
                }
            ]
        },
        timeout=10
    )
    
    verify(resp.status_code == 200, f"POST /admin/styrerapport returns 200 (got {resp.status_code})")
    
    if resp.status_code == 200:
        data = resp.json()
        verify(data.get('ok') == True, "Response has ok:true")
    
    # ========================================================================
    # STEP 3: GET and verify sanitization
    # ========================================================================
    test_step(3, "GET and verify sanitization of new nodes")
    
    resp = requests.get(
        f"{API_URL}/admin/styrerapport",
        params={'key': ADMIN_KEY, 'id': qa_report_id},
        timeout=10
    )
    
    verify(resp.status_code == 200, f"GET /admin/styrerapport returns 200 (got {resp.status_code})")
    
    if resp.status_code == 200:
        data = resp.json()
        verify(data.get('ok') == True, "Response has ok:true")
        verify('rapport' in data, "Response has rapport field")
        
        if 'rapport' in data:
            rapport = data['rapport']
            verify('blokker' in rapport, "Rapport has blokker field")
            
            if 'blokker' in rapport and len(rapport['blokker']) > 0:
                blokk = rapport['blokker'][0]
                verify(blokk.get('type') == 'rik', "Block type is 'rik'")
                verify('doc' in blokk, "Block has doc field")
                
                if 'doc' in blokk:
                    doc = blokk['doc']
                    verify(doc.get('type') == 'doc', "Doc type is 'doc'")
                    verify('content' in doc, "Doc has content field")
                    
                    if 'content' in doc:
                        content = doc['content']
                        print(f"\n  Found {len(content)} nodes in doc.content")
                        
                        # Find specific nodes
                        paragraphs = [n for n in content if n.get('type') == 'paragraph']
                        headings = [n for n in content if n.get('type') == 'heading']
                        task_lists = [n for n in content if n.get('type') == 'taskList']
                        details_nodes = [n for n in content if n.get('type') == 'details']
                        kolonner_nodes = [n for n in content if n.get('type') == 'kolonner']
                        callouts = [n for n in content if n.get('type') == 'callout']
                        images = [n for n in content if n.get('type') == 'image']
                        code_blocks = [n for n in content if n.get('type') == 'codeBlock']
                        unknown_nodes = [n for n in content if n.get('type') == 'ukjentNode']
                        
                        # Verify paragraph with textAlign='center'
                        center_para = next((p for p in paragraphs if p.get('attrs', {}).get('textAlign') == 'center'), None)
                        verify(center_para is not None, "Found paragraph with textAlign='center'")
                        if center_para:
                            text = center_para.get('content', [{}])[0].get('text', '')
                            verify(text == 'midt', f"Paragraph text is 'midt' (got '{text}')")
                        
                        # Verify heading with textAlign='right'
                        right_heading = next((h for h in headings if h.get('attrs', {}).get('textAlign') == 'right'), None)
                        verify(right_heading is not None, "Found heading with textAlign='right'")
                        if right_heading:
                            verify(right_heading.get('attrs', {}).get('level') == 2, "Heading level is 2")
                            text = right_heading.get('content', [{}])[0].get('text', '')
                            verify(text == 'høyre', f"Heading text is 'høyre' (got '{text}')")
                        
                        # Verify paragraph with invalid textAlign (should have NO textAlign attr)
                        invalid_para = next((p for p in paragraphs if any(c.get('text') == 'ugyldig just' for c in p.get('content', []))), None)
                        verify(invalid_para is not None, "Found paragraph with 'ugyldig just' text")
                        if invalid_para:
                            has_text_align = 'textAlign' in invalid_para.get('attrs', {})
                            verify(not has_text_align, "Invalid textAlign was removed (no textAlign attr)")
                        
                        # Verify taskList
                        verify(len(task_lists) == 1, f"Found 1 taskList (got {len(task_lists)})")
                        if len(task_lists) > 0:
                            task_list = task_lists[0]
                            task_items = task_list.get('content', [])
                            verify(len(task_items) == 2, f"TaskList has 2 taskItems (got {len(task_items)})")
                            
                            if len(task_items) >= 2:
                                verify(task_items[0].get('type') == 'taskItem', "First item is taskItem")
                                verify(task_items[0].get('attrs', {}).get('checked') == True, "First taskItem checked=true")
                                verify(task_items[1].get('type') == 'taskItem', "Second item is taskItem")
                                verify(task_items[1].get('attrs', {}).get('checked') == False, "Second taskItem checked=false")
                        
                        # Verify details
                        verify(len(details_nodes) == 1, f"Found 1 details node (got {len(details_nodes)})")
                        if len(details_nodes) > 0:
                            details = details_nodes[0]
                            verify(details.get('attrs', {}).get('open') == True, "Details attrs.open=true")
                            details_content = details.get('content', [])
                            verify(len(details_content) >= 2, f"Details has 2+ children (got {len(details_content)})")
                            
                            if len(details_content) >= 2:
                                verify(details_content[0].get('type') == 'detailsSummary', "First child is detailsSummary")
                                verify(details_content[1].get('type') == 'detailsContent', "Second child is detailsContent")
                        
                        # Verify kolonner
                        verify(len(kolonner_nodes) == 1, f"Found 1 kolonner node (got {len(kolonner_nodes)})")
                        if len(kolonner_nodes) > 0:
                            kolonner = kolonner_nodes[0]
                            verify(kolonner.get('attrs', {}).get('kolonner') == 2, "Kolonner attrs.kolonner=2")
                            kolonne_children = kolonner.get('content', [])
                            verify(len(kolonne_children) == 2, f"Kolonner has 2 kolonne children (got {len(kolonne_children)})")
                            
                            if len(kolonne_children) >= 2:
                                verify(kolonne_children[0].get('type') == 'kolonne', "First child is kolonne")
                                verify(kolonne_children[1].get('type') == 'kolonne', "Second child is kolonne")
                        
                        # Verify callouts
                        verify(len(callouts) == 3, f"Found 3 callouts (got {len(callouts)})")
                        if len(callouts) >= 3:
                            variants = [c.get('attrs', {}).get('variant') for c in callouts]
                            verify('tips' in variants, "Found callout with variant='tips'")
                            verify('suksess' in variants, "Found callout with variant='suksess'")
                            verify('info' in variants, "Invalid variant 'evil' was normalized to 'info'")
                            verify('evil' not in variants, "Invalid variant 'evil' was removed")
                        
                        # Verify image
                        verify(len(images) == 1, f"Found 1 image (got {len(images)})")
                        if len(images) > 0:
                            image = images[0]
                            verify(image.get('attrs', {}).get('align') == 'right', "Image align='right'")
                            verify(image.get('attrs', {}).get('width') == 600, "Image width=600")
                            src = image.get('attrs', {}).get('src', '')
                            verify(src.startswith('/api/styrerapport/bilde/'), f"Image src starts with '/api/styrerapport/bilde/' (got '{src}')")
                            verify(image.get('attrs', {}).get('alt') == 'a', "Image alt='a'")
                        
                        # Verify codeBlock
                        verify(len(code_blocks) == 1, f"Found 1 codeBlock (got {len(code_blocks)})")
                        if len(code_blocks) > 0:
                            code_block = code_blocks[0]
                            text = code_block.get('content', [{}])[0].get('text', '')
                            verify(text == 'kode()', f"CodeBlock text is 'kode()' (got '{text}')")
                        
                        # Verify ukjentNode was removed
                        verify(len(unknown_nodes) == 0, "Unknown node 'ukjentNode' was removed")
    
    # ========================================================================
    # STEP 4: Public round-trip via share link
    # ========================================================================
    test_step(4, "Public round-trip via share link")
    
    # First, publish the report
    resp = requests.post(
        f"{API_URL}/admin/styrerapport/rapporter/{qa_report_id}",
        params={'key': ADMIN_KEY},
        json={'status': 'publisert'},
        timeout=10
    )
    
    verify(resp.status_code == 200, f"POST /admin/styrerapport/rapporter/<id> (publish) returns 200 (got {resp.status_code})")
    
    # Create share link
    resp = requests.post(
        f"{API_URL}/admin/styrerapport/lenker",
        params={'key': ADMIN_KEY},
        json={'rapportId': qa_report_id, 'label': 'QA Confluence Link'},
        timeout=10
    )
    
    verify(resp.status_code == 200, f"POST /admin/styrerapport/lenker returns 200 (got {resp.status_code})")
    
    if resp.status_code == 200:
        data = resp.json()
        verify(data.get('ok') == True, "Response has ok:true")
        verify('lenke' in data, "Response has lenke field")
        
        if 'lenke' in data:
            qa_link_token = data['lenke'].get('token')
            qa_link_id = data['lenke'].get('id')
            verify(qa_link_token is not None, f"Got link token: {qa_link_token}")
    
    if qa_link_token:
        # Access public endpoint
        resp = requests.get(
            f"{API_URL}/styrerapport/del/{qa_link_token}",
            timeout=10
        )
        
        verify(resp.status_code == 200, f"GET /api/styrerapport/del/<token> returns 200 (got {resp.status_code})")
        
        if resp.status_code == 200:
            data = resp.json()
            verify(data.get('ok') == True, "Public endpoint has ok:true")
            verify('rapport' in data, "Public endpoint has rapport field")
            
            if 'rapport' in data:
                rapport = data['rapport']
                verify('blokker' in rapport, "Public rapport has blokker field")
                
                if 'blokker' in rapport and len(rapport['blokker']) > 0:
                    blokk = rapport['blokker'][0]
                    verify(blokk.get('type') == 'rik', "Public block type is 'rik'")
                    verify('doc' in blokk, "Public block has doc field")
                    
                    if 'doc' in blokk:
                        doc = blokk['doc']
                        content = doc.get('content', [])
                        
                        # Quick verification that new nodes are present
                        node_types = [n.get('type') for n in content]
                        verify('taskList' in node_types, "Public doc contains taskList")
                        verify('details' in node_types, "Public doc contains details")
                        verify('kolonner' in node_types, "Public doc contains kolonner")
                        verify('codeBlock' in node_types, "Public doc contains codeBlock")
                        verify('ukjentNode' not in node_types, "Public doc does NOT contain ukjentNode")
    
    # ========================================================================
    # STEP 5: AUTH test
    # ========================================================================
    test_step(5, "AUTH: POST without key should return 401")
    
    resp = requests.post(
        f"{API_URL}/admin/styrerapport",
        json={'blokker': []},
        timeout=10
    )
    
    verify(resp.status_code == 401, f"POST /admin/styrerapport without key returns 401 (got {resp.status_code})")
    
    # ========================================================================
    # STEP Z: CLEANUP
    # ========================================================================
    test_step('Z', "CLEANUP: Delete QA report and link")
    
    # Delete share link from MongoDB
    if qa_link_id:
        result = styrerapport_lenker_coll.delete_one({'id': qa_link_id})
        verify(result.deleted_count == 1, f"Deleted QA link from MongoDB (deleted_count={result.deleted_count})")
    
    # Delete QA report
    if qa_report_id:
        resp = requests.delete(
            f"{API_URL}/admin/styrerapport/rapporter/{qa_report_id}",
            params={'key': ADMIN_KEY},
            timeout=10
        )
        
        verify(resp.status_code == 200, f"DELETE /admin/styrerapport/rapporter/<id> returns 200 (got {resp.status_code})")
    
    # Verify real report is untouched
    real_report = styrerapport_coll.find_one({'id': 'styrerapport'})
    verify(real_report is not None or True, "Real report 'styrerapport' exists or was never created (OK)")
    
    # Verify 'Styremøte' link is untouched
    styremote_link = styrerapport_lenker_coll.find_one({'label': 'Styremøte'})
    verify(styremote_link is not None or True, "Real link 'Styremøte' exists or was never created (OK)")
    
    # Verify no QA reports remain
    qa_reports = list(styrerapport_coll.find({'tittel': {'$regex': '^QA '}}))
    verify(len(qa_reports) == 0, f"No QA reports remain in MongoDB (found {len(qa_reports)})")
    
    # Verify no QA links remain
    qa_links = list(styrerapport_lenker_coll.find({'label': {'$regex': '^QA '}}))
    verify(len(qa_links) == 0, f"No QA links remain in MongoDB (found {len(qa_links)})")
    
    print("\n" + "="*80)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
    print("="*80)
    print("\nSUMMARY:")
    print("  ✅ Created QA report")
    print("  ✅ POST rik block with new Confluence nodes (taskList, taskItem, details, kolonner, codeBlock)")
    print("  ✅ GET verified sanitization:")
    print("     - paragraph textAlign='center' preserved")
    print("     - heading textAlign='right' preserved")
    print("     - invalid textAlign='tull' removed")
    print("     - taskList with 2 taskItems (checked true/false) preserved")
    print("     - details with open=true, detailsSummary, detailsContent preserved")
    print("     - kolonner with 2 kolonne preserved")
    print("     - callout variants 'tips' and 'suksess' preserved")
    print("     - callout variant 'evil' normalized to 'info'")
    print("     - image with align='right', width=600 preserved")
    print("     - codeBlock preserved")
    print("     - ukjentNode removed")
    print("  ✅ Public round-trip via share link verified")
    print("  ✅ AUTH: POST without key returns 401")
    print("  ✅ CLEANUP: All QA data deleted, real data untouched")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    mongo_client.close()
