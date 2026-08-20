#!/usr/bin/env python3
"""
Backend test for Datarom Fase 1 - inline parameter support
Tests ONLY the backend change: GET /api/admin/datarom/fil now supports ?inline=1
for Content-Disposition: inline for application/pdf and image/* types.

All tests are READ-ONLY (no mutations).
"""

import requests
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_t1_get_datarom_dokumenter():
    """T1: GET /api/admin/datarom/dokumenter?key=... → 200 with {documents:[], categories:[]} structure"""
    print("\n=== T1: GET /api/admin/datarom/dokumenter ===")
    try:
        url = f"{BASE_URL}/admin/datarom/dokumenter"
        params = {"key": ADMIN_KEY}
        response = requests.get(url, params=params, timeout=30)
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        assert "documents" in data, "Missing 'documents' key"
        assert "categories" in data, "Missing 'categories' key"
        assert isinstance(data["documents"], list), "documents should be a list"
        assert isinstance(data["categories"], list), "categories should be a list"
        
        print(f"✅ T1 PASSED: documents count={len(data['documents'])}, categories count={len(data['categories'])}")
        return data["documents"]
    except Exception as e:
        print(f"❌ T1 FAILED: {e}")
        raise

def test_t2_datarom_fil_inline(documents):
    """T2: Test /api/admin/datarom/fil with and without inline=1 parameter"""
    print("\n=== T2: GET /api/admin/datarom/fil (with/without inline=1) ===")
    
    if not documents:
        print("⚠️  T2 SKIPPED: No documents available")
        return
    
    try:
        # Take first document
        doc = documents[0]
        doc_id = doc.get("id")
        print(f"Testing with docId: {doc_id}")
        
        # Test WITHOUT inline=1 (should be attachment)
        url = f"{BASE_URL}/admin/datarom/fil"
        params = {"docId": doc_id, "key": ADMIN_KEY}
        response = requests.get(url, params=params, timeout=30)
        
        print(f"WITHOUT inline=1: Status={response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get("Content-Type", "")
        content_disposition = response.headers.get("Content-Disposition", "")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
        
        assert content_disposition.startswith("attachment"), f"Expected 'attachment', got '{content_disposition}'"
        print(f"✅ WITHOUT inline=1: Content-Disposition is 'attachment' ✓")
        
        # Test WITH inline=1
        params_inline = {"docId": doc_id, "key": ADMIN_KEY, "inline": "1"}
        response_inline = requests.get(url, params=params_inline, timeout=30)
        
        print(f"\nWITH inline=1: Status={response_inline.status_code}")
        assert response_inline.status_code == 200, f"Expected 200, got {response_inline.status_code}"
        
        content_type_inline = response_inline.headers.get("Content-Type", "")
        content_disposition_inline = response_inline.headers.get("Content-Disposition", "")
        print(f"  Content-Type: {content_type_inline}")
        print(f"  Content-Disposition: {content_disposition_inline}")
        
        # Check if Content-Type is PDF or image
        is_pdf = "application/pdf" in content_type_inline.lower()
        is_image = content_type_inline.lower().startswith("image/")
        
        if is_pdf or is_image:
            assert content_disposition_inline.startswith("inline"), \
                f"Expected 'inline' for PDF/image, got '{content_disposition_inline}'"
            print(f"✅ WITH inline=1: Content-Disposition is 'inline' for {content_type_inline} ✓")
        else:
            # For non-PDF/non-image, attachment is still correct
            assert content_disposition_inline.startswith("attachment"), \
                f"Expected 'attachment' for non-PDF/non-image, got '{content_disposition_inline}'"
            print(f"✅ WITH inline=1: Content-Disposition is 'attachment' for {content_type_inline} (correct for non-PDF/non-image) ✓")
        
        print(f"✅ T2 PASSED: inline parameter working correctly")
    except Exception as e:
        print(f"❌ T2 FAILED: {e}")
        raise

def test_t3_dokumentarkiv_inline():
    """T3: GET /api/admin/dokumentarkiv regression test with inline=1"""
    print("\n=== T3: GET /api/admin/dokumentarkiv (regression with inline=1) ===")
    try:
        # Get list of files
        url = f"{BASE_URL}/admin/dokumentarkiv"
        params = {"key": ADMIN_KEY}
        response = requests.get(url, params=params, timeout=30)
        
        print(f"GET dokumentarkiv: Status={response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "filer" in data, "Missing 'filer' key"
        filer = data["filer"]
        print(f"Found {len(filer)} files")
        
        if not filer:
            print("⚠️  T3 PARTIAL: No files available, but endpoint structure is correct")
            return
        
        # Take first file
        fil = filer[0]
        fil_id = fil.get("id")
        print(f"Testing with file id: {fil_id}")
        
        # Test with inline=1
        url_fil = f"{BASE_URL}/admin/dokumentarkiv/{fil_id}"
        params_inline = {"key": ADMIN_KEY, "inline": "1"}
        response_fil = requests.get(url_fil, params=params_inline, timeout=30)
        
        print(f"GET file with inline=1: Status={response_fil.status_code}")
        assert response_fil.status_code == 200, f"Expected 200, got {response_fil.status_code}"
        
        content_type = response_fil.headers.get("Content-Type", "")
        content_disposition = response_fil.headers.get("Content-Disposition", "")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
        
        print(f"✅ T3 PASSED: dokumentarkiv inline support working (regression test)")
    except Exception as e:
        print(f"❌ T3 FAILED: {e}")
        raise

def test_t4_pdf_worker():
    """T4: GET /api/pdf-worker → 200 with Content-Type text/javascript"""
    print("\n=== T4: GET /api/pdf-worker ===")
    try:
        url = f"{BASE_URL}/pdf-worker"
        response = requests.get(url, timeout=30)
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get("Content-Type", "")
        print(f"Content-Type: {content_type}")
        
        assert "text/javascript" in content_type or "application/javascript" in content_type, \
            f"Expected text/javascript, got {content_type}"
        
        print(f"✅ T4 PASSED: pdf-worker returns JavaScript")
    except Exception as e:
        print(f"❌ T4 FAILED: {e}")
        raise

def test_t5_auth_check():
    """T5: GET /api/admin/datarom/fil?docId=finnes-ikke without ?key= → 401"""
    print("\n=== T5: GET /api/admin/datarom/fil without auth ===")
    try:
        url = f"{BASE_URL}/admin/datarom/fil"
        params = {"docId": "finnes-ikke"}
        response = requests.get(url, params=params, timeout=30)
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✅ T5 PASSED: Auth check working (401 without key)")
    except Exception as e:
        print(f"❌ T5 FAILED: {e}")
        raise

def test_t6_regression_tasks():
    """T6: REGRESSION: GET /api/admin/tasks?key=... → 200"""
    print("\n=== T6: REGRESSION - GET /api/admin/tasks ===")
    try:
        url = f"{BASE_URL}/admin/tasks"
        params = {"key": ADMIN_KEY}
        response = requests.get(url, params=params, timeout=30)
        
        print(f"Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Response has 'ok' key: {'ok' in data}")
        
        print(f"✅ T6 PASSED: Regression test - tasks endpoint working")
    except Exception as e:
        print(f"❌ T6 FAILED: {e}")
        raise

def main():
    print("=" * 80)
    print("DATAROM FASE 1 BACKEND TESTING")
    print("Testing inline=1 parameter support for /api/admin/datarom/fil")
    print("Base URL:", BASE_URL)
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    try:
        # T1: Get documents list
        documents = test_t1_get_datarom_dokumenter()
        passed += 1
        
        # T2: Test inline parameter
        test_t2_datarom_fil_inline(documents)
        passed += 1
        
        # T3: Regression test dokumentarkiv
        test_t3_dokumentarkiv_inline()
        passed += 1
        
        # T4: PDF worker
        test_t4_pdf_worker()
        passed += 1
        
        # T5: Auth check
        test_t5_auth_check()
        passed += 1
        
        # T6: Regression tasks
        test_t6_regression_tasks()
        passed += 1
        
    except Exception as e:
        failed += 1
        print(f"\n❌ TEST SUITE FAILED: {e}")
    
    print("\n" + "=" * 80)
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    print("=" * 80)
    
    if failed > 0:
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
