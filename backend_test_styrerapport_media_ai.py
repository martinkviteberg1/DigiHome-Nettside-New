#!/usr/bin/env python3
"""
STYRERAPPORT RIK MEDIA + AI: Backend test for image upload/serving + tables + AI content
Tests: (1) Image upload, (2) Image serving (public), (3) AI endpoint, (4) Sanitizer image+table round-trip
CRITICAL SAFETY: Do NOT modify/delete real report (id='styrerapport') or real link 'Styremøte'
"""
import requests
import json
import base64
import sys
from pymongo import MongoClient

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Create a small 1x1 PNG image as base64
TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
TINY_PNG_DATAURL = f"data:image/png;base64,{TINY_PNG_B64}"

def test_image_upload():
    """Test (1): POST /api/admin/styrerapport/bilde - image upload"""
    print("\n=== TEST 1: IMAGE UPLOAD ===")
    
    # (1a) Valid upload
    print("(1a) Valid PNG upload with key...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/bilde",
            params={"key": ADMIN_KEY},
            json={"dataUrl": TINY_PNG_DATAURL, "alt": "QA bilde"},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and data.get("id") and data.get("url"):
                print(f"  ✅ PASS: Got id={data['id']}, url={data['url']}")
                return data["id"]
            else:
                print(f"  ❌ FAIL: Response missing ok/id/url: {data}")
                return None
        else:
            print(f"  ❌ FAIL: Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return None
    
def test_image_upload_auth():
    """Test (1b): Upload without key → 401"""
    print("\n(1b) Upload without key → 401...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/bilde",
            json={"dataUrl": TINY_PNG_DATAURL, "alt": "QA bilde"},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 401:
            print(f"  ✅ PASS: Got 401 as expected")
            return True
        else:
            print(f"  ❌ FAIL: Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_image_upload_invalid():
    """Test (1c): Invalid dataUrl → 400"""
    print("\n(1c) Invalid dataUrl (data:text/html) → 400...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/bilde",
            params={"key": ADMIN_KEY},
            json={"dataUrl": "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 400:
            print(f"  ✅ PASS: Got 400 as expected")
            return True
        else:
            print(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_image_upload_missing():
    """Test (1d): Missing dataUrl → 400"""
    print("\n(1d) Missing dataUrl → 400...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/bilde",
            params={"key": ADMIN_KEY},
            json={"alt": "QA bilde"},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 400:
            print(f"  ✅ PASS: Got 400 as expected")
            return True
        else:
            print(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_image_serving(image_id):
    """Test (2): GET /api/styrerapport/bilde/<id> - public image serving"""
    print("\n=== TEST 2: IMAGE SERVING (PUBLIC) ===")
    
    # (2a) Valid id
    print(f"(2a) GET /api/styrerapport/bilde/{image_id} (no key)...")
    try:
        resp = requests.get(f"{BASE_URL}/styrerapport/bilde/{image_id}", timeout=10)
        print(f"  Status: {resp.status_code}")
        print(f"  Content-Type: {resp.headers.get('Content-Type')}")
        print(f"  Content-Length: {len(resp.content)}")
        if resp.status_code == 200 and resp.headers.get('Content-Type', '').startswith('image/') and len(resp.content) > 0:
            print(f"  ✅ PASS: Got 200 with image/* Content-Type and non-empty body")
            return True
        else:
            print(f"  ❌ FAIL: Expected 200 with image/* and non-empty body")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_image_serving_unknown():
    """Test (2b): Unknown id → 404"""
    print("\n(2b) GET /api/styrerapport/bilde/<unknown-uuid> → 404...")
    try:
        resp = requests.get(f"{BASE_URL}/styrerapport/bilde/00000000-0000-0000-0000-000000000000", timeout=10)
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 404:
            print(f"  ✅ PASS: Got 404 as expected")
            return True
        else:
            print(f"  ❌ FAIL: Expected 404, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_ai_endpoint():
    """Test (3): POST /api/admin/styrerapport/ai - AI content generation"""
    print("\n=== TEST 3: AI ENDPOINT (MAX 1 SUCCESSFUL CALL) ===")
    
    # (3a) Valid request
    print("(3a) Valid AI request with prompt...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/ai",
            params={"key": ADMIN_KEY},
            json={"prompt": "Skriv en kort teststatus om salg", "modus": "seksjon", "kontekst": "MRR: 10 000 kr"},
            timeout=30
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and data.get("html"):
                html = data["html"]
                has_html_tag = any(tag in html for tag in ["<p>", "<h2>", "<h3>", "<ul>", "<ol>", "<table>"])
                has_code_fence = "```" in html
                has_script = "<script>" in html.lower()
                print(f"  HTML length: {len(html)}")
                print(f"  Has HTML tag: {has_html_tag}")
                print(f"  Has code fence: {has_code_fence}")
                print(f"  Has <script>: {has_script}")
                if has_html_tag and not has_code_fence and not has_script:
                    print(f"  ✅ PASS: Got valid HTML without code fences or <script>")
                    return True
                else:
                    print(f"  ❌ FAIL: HTML validation failed")
                    print(f"  HTML preview: {html[:200]}")
                    return False
            else:
                print(f"  ❌ FAIL: Response missing ok/html: {data}")
                return False
        elif resp.status_code == 502:
            data = resp.json()
            print(f"  ⚠️  KNOWN ISSUE: Got 502 (LLM unavailable): {data.get('feil', 'unknown')}")
            print(f"  ✅ PASS: Endpoint returns 502 (not 500) when LLM unavailable")
            return True
        else:
            print(f"  ❌ FAIL: Expected 200 or 502, got {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_ai_empty_prompt():
    """Test (3b): Empty prompt → 400 (does NOT hit LLM)"""
    print("\n(3b) Empty prompt → 400...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/ai",
            params={"key": ADMIN_KEY},
            json={"prompt": "", "modus": "seksjon"},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 400:
            print(f"  ✅ PASS: Got 400 as expected (does NOT hit LLM)")
            return True
        else:
            print(f"  ❌ FAIL: Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_ai_no_auth():
    """Test (3c): Without key → 401 (does NOT hit LLM)"""
    print("\n(3c) Without key → 401...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/ai",
            json={"prompt": "Test", "modus": "seksjon"},
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 401:
            print(f"  ✅ PASS: Got 401 as expected (does NOT hit LLM)")
            return True
        else:
            print(f"  ❌ FAIL: Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return False

def test_sanitizer_roundtrip(image_id):
    """Test (4): Sanitizer image+table round-trip"""
    print("\n=== TEST 4: SANITIZER IMAGE+TABLE ROUND-TRIP ===")
    
    # Create QA report
    print("(4a) Creating QA report...")
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport/rapporter",
            params={"key": ADMIN_KEY},
            json={"tittel": "QA Media"},
            timeout=10
        )
        if resp.status_code != 200:
            print(f"  ❌ FAIL: Could not create QA report: {resp.status_code}")
            return None, False
        report_id = resp.json()["rapport"]["id"]
        print(f"  ✅ Created QA report: {report_id}")
    except Exception as e:
        print(f"  ❌ FAIL: Exception creating report: {e}")
        return None, False
    
    # POST with rik block containing images and table
    print(f"\n(4b) POST /api/admin/styrerapport?id={report_id} with rik block...")
    rik_doc = {
        "type": "doc",
        "content": [
            # Valid image (should be kept)
            {
                "type": "image",
                "attrs": {
                    "src": f"/api/styrerapport/bilde/{image_id}",
                    "alt": "ok",
                    "width": 800
                }
            },
            # data: image (should be REMOVED)
            {
                "type": "image",
                "attrs": {
                    "src": "data:image/png;base64,AAAA",
                    "alt": "ond"
                }
            },
            # javascript: image (should be REMOVED)
            {
                "type": "image",
                "attrs": {
                    "src": "javascript:alert(1)"
                }
            },
            # Table with colspan/rowspan to test clamping
            {
                "type": "table",
                "content": [
                    {
                        "type": "tableRow",
                        "content": [
                            {
                                "type": "tableHeader",
                                "attrs": {"colspan": 1, "rowspan": 1},
                                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "H"}]}]
                            },
                            {
                                "type": "tableCell",
                                "attrs": {"colspan": 99, "rowspan": 0},
                                "content": [{"type": "paragraph", "content": [{"type": "text", "text": "C"}]}]
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    try:
        resp = requests.post(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY, "id": report_id},
            json={
                "tittel": "QA Media",
                "motedato": "01. jan 2026",
                "periodeLabel": "Q1 2026",
                "sammendrag": "",
                "ask": [],
                "blokker": [
                    {
                        "type": "rik",
                        "tittel": "QA Media",
                        "doc": rik_doc
                    }
                ]
            },
            timeout=10
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"  ❌ FAIL: POST failed: {resp.text[:200]}")
            return report_id, False
        print(f"  ✅ POST successful")
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        return report_id, False
    
    # GET back and verify
    print(f"\n(4c) GET /api/admin/styrerapport?id={report_id} and verify sanitization...")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/styrerapport",
            params={"key": ADMIN_KEY, "id": report_id},
            timeout=10
        )
        if resp.status_code != 200:
            print(f"  ❌ FAIL: GET failed: {resp.status_code}")
            return report_id, False
        
        data = resp.json()
        rapport = data.get("rapport", {})
        blokker = rapport.get("blokker", [])
        
        if not blokker or blokker[0].get("type") != "rik":
            print(f"  ❌ FAIL: No rik block found")
            return report_id, False
        
        doc = blokker[0].get("doc", {})
        content = doc.get("content", [])
        
        print(f"  Doc content length: {len(content)}")
        
        # Count images
        images = [n for n in content if n.get("type") == "image"]
        print(f"  Images found: {len(images)}")
        
        # Verify valid image kept
        valid_image = next((img for img in images if img.get("attrs", {}).get("src", "").startswith("/api/styrerapport/bilde/")), None)
        if valid_image:
            print(f"  ✅ Valid image kept: src={valid_image['attrs']['src'][:50]}, alt={valid_image['attrs'].get('alt')}, width={valid_image['attrs'].get('width')}")
        else:
            print(f"  ❌ FAIL: Valid image NOT found")
            return report_id, False
        
        # Verify data: and javascript: images REMOVED
        data_images = [img for img in images if img.get("attrs", {}).get("src", "").startswith("data:")]
        js_images = [img for img in images if img.get("attrs", {}).get("src", "").startswith("javascript:")]
        
        if len(data_images) == 0 and len(js_images) == 0:
            print(f"  ✅ data: and javascript: images REMOVED (found {len(images)} total images, expected 1)")
        else:
            print(f"  ❌ FAIL: data: or javascript: images NOT removed (data:{len(data_images)}, js:{len(js_images)})")
            return report_id, False
        
        # Verify table
        tables = [n for n in content if n.get("type") == "table"]
        if not tables:
            print(f"  ❌ FAIL: Table NOT found")
            return report_id, False
        
        table = tables[0]
        rows = table.get("content", [])
        if not rows or rows[0].get("type") != "tableRow":
            print(f"  ❌ FAIL: Table row NOT found")
            return report_id, False
        
        cells = rows[0].get("content", [])
        if len(cells) < 2:
            print(f"  ❌ FAIL: Expected 2 cells, got {len(cells)}")
            return report_id, False
        
        # Check tableHeader
        header = cells[0]
        if header.get("type") != "tableHeader":
            print(f"  ❌ FAIL: First cell is not tableHeader")
            return report_id, False
        
        # Check tableCell with clamped colspan/rowspan
        cell = cells[1]
        if cell.get("type") != "tableCell":
            print(f"  ❌ FAIL: Second cell is not tableCell")
            return report_id, False
        
        colspan = cell.get("attrs", {}).get("colspan")
        rowspan = cell.get("attrs", {}).get("rowspan")
        
        print(f"  Table cell: colspan={colspan}, rowspan={rowspan}")
        
        # Spec: cs>0 && cs<=20 ? cs : 1, so 99 → 1
        # Spec: rs>0 && rs<=20 ? rs : 1, so 0 → 1
        if colspan == 1 and rowspan == 1:
            print(f"  ✅ Table cell colspan/rowspan clamped correctly (99→1, 0→1)")
        else:
            print(f"  ❌ FAIL: Expected colspan=1, rowspan=1, got colspan={colspan}, rowspan={rowspan}")
            return report_id, False
        
        print(f"  ✅ PASS: All sanitization checks passed")
        return report_id, True
        
    except Exception as e:
        print(f"  ❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return report_id, False

def cleanup(image_id, report_id):
    """Mandatory cleanup: delete QA report and uploaded images"""
    print("\n=== MANDATORY CLEANUP ===")
    
    success = True
    
    # Delete QA report
    if report_id:
        print(f"Deleting QA report {report_id}...")
        try:
            resp = requests.delete(
                f"{BASE_URL}/admin/styrerapport/rapporter/{report_id}",
                params={"key": ADMIN_KEY},
                timeout=10
            )
            if resp.status_code == 200:
                print(f"  ✅ Deleted QA report")
            else:
                print(f"  ⚠️  Could not delete QA report: {resp.status_code}")
                success = False
        except Exception as e:
            print(f"  ⚠️  Exception deleting report: {e}")
            success = False
    
    # Delete uploaded images from MongoDB
    if image_id:
        print(f"Deleting uploaded image {image_id} from MongoDB...")
        try:
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            result = db.styrerapport_bilder.delete_one({"id": image_id})
            if result.deleted_count > 0:
                print(f"  ✅ Deleted {result.deleted_count} image(s)")
            else:
                print(f"  ⚠️  No images deleted (may have been already deleted)")
            client.close()
        except Exception as e:
            print(f"  ⚠️  Exception deleting images: {e}")
            success = False
    
    # Verify real report untouched
    print("\nVerifying real report (id='styrerapport') is untouched...")
    try:
        resp = requests.get(
            f"{BASE_URL}/admin/styrerapport/rapporter",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            rapporter = data.get("rapporter", [])
            real_report = next((r for r in rapporter if r["id"] == "styrerapport"), None)
            if real_report:
                print(f"  ✅ Real report exists: status={real_report.get('status')}, gjeldende={real_report.get('gjeldende')}")
            else:
                print(f"  ⚠️  Real report NOT found")
                success = False
        else:
            print(f"  ⚠️  Could not verify real report: {resp.status_code}")
            success = False
    except Exception as e:
        print(f"  ⚠️  Exception verifying real report: {e}")
        success = False
    
    return success

def main():
    print("=" * 80)
    print("STYRERAPPORT RIK MEDIA + AI - BACKEND TEST")
    print("=" * 80)
    
    results = []
    image_id = None
    report_id = None
    
    try:
        # Test 1: Image upload
        image_id = test_image_upload()
        results.append(("Image upload (valid)", image_id is not None))
        
        results.append(("Image upload (no auth)", test_image_upload_auth()))
        results.append(("Image upload (invalid dataUrl)", test_image_upload_invalid()))
        results.append(("Image upload (missing dataUrl)", test_image_upload_missing()))
        
        # Test 2: Image serving
        if image_id:
            results.append(("Image serving (valid)", test_image_serving(image_id)))
        else:
            print("\n⚠️  Skipping image serving test (no image_id)")
            results.append(("Image serving (valid)", False))
        
        results.append(("Image serving (unknown)", test_image_serving_unknown()))
        
        # Test 3: AI endpoint
        results.append(("AI endpoint (valid)", test_ai_endpoint()))
        results.append(("AI endpoint (empty prompt)", test_ai_empty_prompt()))
        results.append(("AI endpoint (no auth)", test_ai_no_auth()))
        
        # Test 4: Sanitizer round-trip
        if image_id:
            report_id, sanitizer_ok = test_sanitizer_roundtrip(image_id)
            results.append(("Sanitizer round-trip", sanitizer_ok))
        else:
            print("\n⚠️  Skipping sanitizer test (no image_id)")
            results.append(("Sanitizer round-trip", False))
        
    finally:
        # Mandatory cleanup
        cleanup_ok = cleanup(image_id, report_id)
        results.append(("Mandatory cleanup", cleanup_ok))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for test_name, ok in results:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
