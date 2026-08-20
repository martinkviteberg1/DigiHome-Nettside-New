#!/usr/bin/env python3
"""
Backend test for signering/dokumentfikser (PDF worker + DOCX conversion + auto-archive).
Tests T1-T6 from review request.
"""

import requests
import base64
import time
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_pdf_worker():
    """T1: GET /api/pdf-worker → 200, Content-Type text/javascript, body > 1 MB and starts with '/**'"""
    print("\n=== T1: PDF WORKER ENDPOINT ===")
    try:
        url = f"{BASE_URL}/pdf-worker"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        print(f"Content-Length: {len(response.content)} bytes")
        
        # Verify status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify content type
        content_type = response.headers.get('Content-Type', '')
        assert 'text/javascript' in content_type or 'application/javascript' in content_type, \
            f"Expected text/javascript, got {content_type}"
        
        # Verify size > 1 MB
        size_mb = len(response.content) / (1024 * 1024)
        print(f"Size: {size_mb:.2f} MB")
        assert len(response.content) > 1024 * 1024, f"Expected > 1 MB, got {size_mb:.2f} MB"
        
        # Verify starts with '/**'
        body_start = response.text[:10]
        print(f"Body starts with: {repr(body_start)}")
        assert response.text.startswith('/**'), f"Expected to start with '/**', got {repr(body_start)}"
        
        print("✅ T1 PASSED: PDF worker endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ T1 FAILED: {e}")
        return False

def test_docx_conversion():
    """T2: DOCX upload + conversion"""
    print("\n=== T2: DOCX UPLOAD + CONVERSION ===")
    try:
        # Read the DOCX file
        docx_path = "/tmp/qa-konvertering.docx"
        print(f"Reading {docx_path}")
        
        with open(docx_path, 'rb') as f:
            docx_data = f.read()
        
        print(f"File size: {len(docx_data)} bytes")
        assert len(docx_data) == 17787, f"Expected 17787 bytes, got {len(docx_data)}"
        
        # Base64 encode
        b64_data = base64.b64encode(docx_data).decode('utf-8')
        print(f"Base64 encoded: {len(b64_data)} chars")
        
        # Upload via chunk endpoint
        timestamp = int(time.time())
        upload_id = f"qa-konv-{timestamp}"
        
        chunk_url = f"{BASE_URL}/admin/task-files/chunk?key={ADMIN_KEY}"
        chunk_body = {
            "uploadId": upload_id,
            "taskId": "DOKUMENTER",
            "index": 0,
            "total": 1,
            "data": b64_data,
            "name": "QA Konvertering SLETTES.docx",
            "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "actor": "QA"
        }
        
        print(f"POST {chunk_url}")
        print(f"Uploading chunk (uploadId: {upload_id})")
        
        response = requests.post(chunk_url, json=chunk_body, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('ok') == True, f"Expected ok:true, got {data}"
        assert data.get('complete') == True, f"Expected complete:true, got {data}"
        assert 'attachment' in data, f"Expected attachment in response, got {data}"
        
        file_id = data['attachment']['id']
        print(f"✅ File uploaded successfully, ID: {file_id}")
        
        # Convert to PDF
        convert_url = f"{BASE_URL}/admin/task-files/{file_id}/konverter-pdf?key={ADMIN_KEY}"
        convert_body = {"actor": "QA"}
        
        print(f"\nPOST {convert_url}")
        print("Converting DOCX to PDF...")
        
        response = requests.post(convert_url, json=convert_body, timeout=60)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get('ok') == True, f"Expected ok:true, got {data}"
        assert data.get('versjon') == 2, f"Expected versjon:2, got {data.get('versjon')}"
        assert 'QA Konvertering SLETTES.pdf' in data.get('name', ''), \
            f"Expected PDF name, got {data.get('name')}"
        
        print(f"✅ T2 PASSED: DOCX converted to PDF successfully (versjon: {data.get('versjon')}, name: {data.get('name')})")
        return file_id
        
    except Exception as e:
        print(f"❌ T2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_dokumentarkiv():
    """T3: GET /api/admin/dokumentarkiv → 200 with {filer:[...]}"""
    print("\n=== T3: DOKUMENTARKIV REGRESSION ===")
    try:
        url = f"{BASE_URL}/admin/dokumentarkiv?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'filer' in data, f"Expected 'filer' in response, got {data.keys()}"
        assert isinstance(data['filer'], list), f"Expected filer to be array, got {type(data['filer'])}"
        
        print(f"✅ T3 PASSED: Dokumentarkiv endpoint working (filer count: {len(data['filer'])})")
        return True
        
    except Exception as e:
        print(f"❌ T3 FAILED: {e}")
        return False

def test_signering_jobber():
    """T4: GET /api/admin/signering/jobber → 200 (regression)"""
    print("\n=== T4: SIGNERING JOBBER REGRESSION ===")
    try:
        url = f"{BASE_URL}/admin/signering/jobber?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Response keys: {data.keys()}")
        
        print(f"✅ T4 PASSED: Signering jobber endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ T4 FAILED: {e}")
        return False

def test_tasks():
    """T5: GET /api/admin/tasks → 200 with list"""
    print("\n=== T5: TASKS REGRESSION ===")
    try:
        url = f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'tasks' in data or 'ok' in data, f"Expected tasks or ok in response, got {data.keys()}"
        
        print(f"✅ T5 PASSED: Tasks endpoint working")
        return True
        
    except Exception as e:
        print(f"❌ T5 FAILED: {e}")
        return False

def test_cleanup(file_id):
    """T6: DELETE QA file and verify it's gone"""
    print("\n=== T6: CLEANUP ===")
    try:
        if not file_id:
            print("⚠️ No file ID to clean up (upload/conversion failed)")
            return True
        
        # Delete the file
        delete_url = f"{BASE_URL}/admin/task-files/{file_id}?key={ADMIN_KEY}"
        print(f"DELETE {delete_url}")
        
        response = requests.delete(delete_url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify it's gone by trying to get details
        details_url = f"{BASE_URL}/admin/task-files/{file_id}/detaljer?key={ADMIN_KEY}"
        print(f"\nGET {details_url} (should be 404)")
        
        response = requests.get(details_url, timeout=30)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 404, f"Expected 404 (file deleted), got {response.status_code}"
        
        print(f"✅ T6 PASSED: QA file deleted and verified gone")
        return True
        
    except Exception as e:
        print(f"❌ T6 FAILED: {e}")
        return False

def main():
    print("=" * 80)
    print("BACKEND TEST: Signering/Dokumentfikser")
    print("Base URL:", BASE_URL)
    print("=" * 80)
    
    results = []
    file_id = None
    
    # T1: PDF worker
    results.append(("T1: PDF Worker", test_pdf_worker()))
    
    # T2: DOCX conversion
    file_id = test_docx_conversion()
    results.append(("T2: DOCX Conversion", file_id is not None))
    
    # T3: Dokumentarkiv
    results.append(("T3: Dokumentarkiv", test_dokumentarkiv()))
    
    # T4: Signering jobber
    results.append(("T4: Signering Jobber", test_signering_jobber()))
    
    # T5: Tasks
    results.append(("T5: Tasks", test_tasks()))
    
    # T6: Cleanup
    results.append(("T6: Cleanup", test_cleanup(file_id)))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
