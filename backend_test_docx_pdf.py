#!/usr/bin/env python3
"""
Backend test for DOCX→PDF conversion endpoint
Tests the NEW POST /api/admin/task-files/:id/konverter-pdf endpoint
"""

import asyncio
import base64
import io
import json
import os
import sys
import time
import zipfile
from datetime import datetime

import httpx
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "https://saker-hub.preview.emergentagent.com")
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "your_database_name")

# MongoDB client
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
test_state = {
    "uploaded_files": [],
    "created_tasks": [],
}


def generate_minimal_docx():
    """
    Generate a minimal valid DOCX file with Norwegian text (æøå).
    DOCX is a ZIP file with specific structure.
    """
    # Create in-memory ZIP
    docx_buffer = io.BytesIO()
    
    with zipfile.ZipFile(docx_buffer, 'w', zipfile.ZIP_DEFLATED) as docx:
        # [Content_Types].xml - required
        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
        docx.writestr('[Content_Types].xml', content_types)
        
        # _rels/.rels - required
        rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
        docx.writestr('_rels/.rels', rels)
        
        # word/document.xml - main content with Norwegian text
        document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>QA Testdokument for DOCX→PDF-konvertering</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Dette er en test med norske tegn: æøå ÆØÅ</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Dokumentet skal konverteres til PDF automatisk.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>'''
        docx.writestr('word/document.xml', document)
    
    docx_buffer.seek(0)
    return docx_buffer.getvalue()


def generate_corrupt_docx():
    """Generate invalid DOCX (random bytes with .docx name)"""
    return b'This is not a valid DOCX file, just random text to simulate corruption.'


async def upload_file_via_chunk(filename, file_bytes, file_type, task_id='DOKUMENTER'):
    """Upload a file via the chunk endpoint"""
    print(f"  → Uploading {filename} ({len(file_bytes)} bytes) to taskId={task_id}...")
    
    # Generate upload ID
    upload_id = f"qa-upload-{int(time.time() * 1000)}"
    data_b64 = base64.b64encode(file_bytes).decode('utf-8')
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_URL}/admin/task-files/chunk",
            params={"key": ADMIN_KEY},
            json={
                "taskId": task_id,
                "uploadId": upload_id,
                "index": 0,
                "total": 1,
                "name": filename,
                "type": file_type,
                "size": len(file_bytes),
                "data": data_b64,
            }
        )
        
        if response.status_code != 200:
            print(f"  ✗ Upload failed: {response.status_code} {response.text[:200]}")
            return None
        
        result = response.json()
        if not result.get("complete"):
            print(f"  ✗ Upload not complete: {result}")
            return None
        
        file_id = result.get("attachment", {}).get("id")
        if not file_id:
            print(f"  ✗ No file ID in response: {result}")
            return None
        
        print(f"  ✓ Uploaded successfully, file ID: {file_id}")
        test_state["uploaded_files"].append(file_id)
        return file_id


async def test_a_happy_path():
    """
    A) HAPPY PATH: Upload DOCX, convert to PDF, verify v2 is PDF, v1 in versions, check log
    """
    print("\n" + "="*80)
    print("TEST A: HAPPY PATH - Upload DOCX → Convert → Verify PDF v2")
    print("="*80)
    
    try:
        # A1: Generate and upload DOCX
        print("\n[A1] Generate and upload valid DOCX file...")
        docx_bytes = generate_minimal_docx()
        file_id = await upload_file_via_chunk(
            "qa-konvertering.docx",
            docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            task_id="DOKUMENTER"
        )
        
        if not file_id:
            print("✗ TEST A1 FAILED: Could not upload DOCX")
            return False
        
        print(f"✓ TEST A1 PASSED: DOCX uploaded with ID {file_id}")
        
        # A2: Convert to PDF
        print("\n[A2] Convert DOCX to PDF via POST /api/admin/task-files/:id/konverter-pdf...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{API_URL}/admin/task-files/{file_id}/konverter-pdf",
                params={"key": ADMIN_KEY},
                json={"actor": "QA TestAgent"}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST A2 FAILED: Conversion returned {response.status_code}: {response.text[:300]}")
                return False
            
            result = response.json()
            if not result.get("ok"):
                print(f"✗ TEST A2 FAILED: Conversion not ok: {result}")
                return False
            
            if result.get("versjon") != 2:
                print(f"✗ TEST A2 FAILED: Expected versjon=2, got {result.get('versjon')}")
                return False
            
            if not result.get("name", "").endswith(".pdf"):
                print(f"✗ TEST A2 FAILED: Expected name to end with .pdf, got {result.get('name')}")
                return False
            
            if result.get("size", 0) < 100:
                print(f"✗ TEST A2 FAILED: PDF size too small: {result.get('size')} bytes")
                return False
            
            print(f"✓ TEST A2 PASSED: Conversion successful → versjon={result['versjon']}, name={result['name']}, size={result['size']} bytes")
        
        # A3: Get detaljer and verify structure
        print("\n[A3] GET /api/admin/task-files/:id/detaljer to verify v2 is PDF and v1 is in versions...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/admin/task-files/{file_id}/detaljer",
                params={"key": ADMIN_KEY}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST A3 FAILED: Detaljer returned {response.status_code}")
                return False
            
            result = response.json()
            detaljer = result.get("detaljer", {})
            
            # Check current version is 2
            if detaljer.get("versjon") != 2:
                print(f"✗ TEST A3 FAILED: Expected versjon=2, got {detaljer.get('versjon')}")
                return False
            
            # Check name ends with .pdf
            if not detaljer.get("name", "").endswith(".pdf"):
                print(f"✗ TEST A3 FAILED: Expected name to end with .pdf, got {detaljer.get('name')}")
                return False
            
            # Check type is PDF
            if detaljer.get("type") != "application/pdf":
                print(f"✗ TEST A3 FAILED: Expected type=application/pdf, got {detaljer.get('type')}")
                return False
            
            # Check versjoner list has v1 with .docx name
            versjoner = detaljer.get("versjoner", [])
            if len(versjoner) != 1:
                print(f"✗ TEST A3 FAILED: Expected 1 version in history, got {len(versjoner)}")
                return False
            
            v1 = versjoner[0]
            if v1.get("versjon") != 1:
                print(f"✗ TEST A3 FAILED: Expected v1 in history, got v{v1.get('versjon')}")
                return False
            
            if not v1.get("name", "").endswith(".docx"):
                print(f"✗ TEST A3 FAILED: Expected v1 name to end with .docx, got {v1.get('name')}")
                return False
            
            print(f"✓ TEST A3 PASSED: Current version is v2 PDF, v1 DOCX preserved in versions")
        
        # A4: Download PDF and verify it starts with %PDF-
        print("\n[A4] GET /api/admin/task-files/:id?inline=1 to verify PDF content...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/admin/task-files/{file_id}",
                params={"key": ADMIN_KEY, "inline": "1"}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST A4 FAILED: Download returned {response.status_code}")
                return False
            
            content_type = response.headers.get("content-type", "")
            if "application/pdf" not in content_type:
                print(f"✗ TEST A4 FAILED: Expected Content-Type application/pdf, got {content_type}")
                return False
            
            pdf_bytes = response.content
            if not pdf_bytes.startswith(b'%PDF-'):
                print(f"✗ TEST A4 FAILED: PDF does not start with %PDF-, starts with {pdf_bytes[:10]}")
                return False
            
            print(f"✓ TEST A4 PASSED: Downloaded PDF is valid (starts with %PDF-, {len(pdf_bytes)} bytes)")
        
        # A5: Verify log entry
        print("\n[A5] Verify log entry 'Konvertert fra Word til PDF (automatisk)'...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/admin/task-files/{file_id}/detaljer",
                params={"key": ADMIN_KEY}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST A5 FAILED: Detaljer returned {response.status_code}")
                return False
            
            result = response.json()
            detaljer = result.get("detaljer", {})
            logg = detaljer.get("logg", [])
            
            found_log = False
            for entry in logg:
                if "Konvertert fra Word til PDF" in entry.get("tekst", ""):
                    found_log = True
                    print(f"  → Found log entry: {entry.get('tekst')}")
                    break
            
            if not found_log:
                print(f"✗ TEST A5 FAILED: Log entry not found. Log: {logg}")
                return False
            
            print(f"✓ TEST A5 PASSED: Log entry found")
        
        print("\n" + "="*80)
        print("✅ TEST A: HAPPY PATH - ALL 5 STEPS PASSED")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n✗ TEST A FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_b_validation_paths():
    """
    B) VALIDATION PATHS: Test all error conditions
    """
    print("\n" + "="*80)
    print("TEST B: VALIDATION PATHS")
    print("="*80)
    
    all_passed = True
    
    try:
        # B1: Without key → 401
        print("\n[B1] POST konverter-pdf without key → 401...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_URL}/admin/task-files/fake-id/konverter-pdf",
                json={"actor": "QA"}
            )
            
            if response.status_code != 401:
                print(f"✗ TEST B1 FAILED: Expected 401, got {response.status_code}")
                all_passed = False
            else:
                print(f"✓ TEST B1 PASSED: Without key returns 401")
        
        # B2: Unknown file ID → 404
        print("\n[B2] POST konverter-pdf with unknown file ID → 404...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_URL}/admin/task-files/unknown-file-id-12345/konverter-pdf",
                params={"key": ADMIN_KEY},
                json={"actor": "QA"}
            )
            
            if response.status_code != 404:
                print(f"✗ TEST B2 FAILED: Expected 404, got {response.status_code}")
                all_passed = False
            else:
                print(f"✓ TEST B2 PASSED: Unknown file ID returns 404")
        
        # B3: Convert PDF (not DOCX) → 400
        print("\n[B3] Upload PDF and try to convert it → 400...")
        pdf_bytes = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF'
        pdf_file_id = await upload_file_via_chunk(
            "qa-already-pdf.pdf",
            pdf_bytes,
            "application/pdf",
            task_id="DOKUMENTER"
        )
        
        if not pdf_file_id:
            print("✗ TEST B3 FAILED: Could not upload PDF")
            all_passed = False
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{API_URL}/admin/task-files/{pdf_file_id}/konverter-pdf",
                    params={"key": ADMIN_KEY},
                    json={"actor": "QA"}
                )
                
                if response.status_code != 400:
                    print(f"✗ TEST B3 FAILED: Expected 400, got {response.status_code}: {response.text[:200]}")
                    all_passed = False
                else:
                    result = response.json()
                    if "Word" not in result.get("error", ""):
                        print(f"✗ TEST B3 FAILED: Expected error about Word files, got: {result.get('error')}")
                        all_passed = False
                    else:
                        print(f"✓ TEST B3 PASSED: Converting PDF returns 400 with error: {result.get('error')}")
        
        # B4: Convert PNG → 400
        print("\n[B4] Upload PNG and try to convert it → 400...")
        # Minimal 1x1 PNG
        png_bytes = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        png_file_id = await upload_file_via_chunk(
            "qa-image.png",
            png_bytes,
            "image/png",
            task_id="DOKUMENTER"
        )
        
        if not png_file_id:
            print("✗ TEST B4 FAILED: Could not upload PNG")
            all_passed = False
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{API_URL}/admin/task-files/{png_file_id}/konverter-pdf",
                    params={"key": ADMIN_KEY},
                    json={"actor": "QA"}
                )
                
                if response.status_code != 400:
                    print(f"✗ TEST B4 FAILED: Expected 400, got {response.status_code}: {response.text[:200]}")
                    all_passed = False
                else:
                    result = response.json()
                    if "Word" not in result.get("error", ""):
                        print(f"✗ TEST B4 FAILED: Expected error about Word files, got: {result.get('error')}")
                        all_passed = False
                    else:
                        print(f"✓ TEST B4 PASSED: Converting PNG returns 400 with error: {result.get('error')}")
        
        # B5: Locked file → 400
        print("\n[B5] Set laast=true on DOCX file and try to convert → 400...")
        docx_bytes = generate_minimal_docx()
        locked_file_id = await upload_file_via_chunk(
            "qa-locked.docx",
            docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            task_id="DOKUMENTER"
        )
        
        if not locked_file_id:
            print("✗ TEST B5 FAILED: Could not upload DOCX")
            all_passed = False
        else:
            # Set laast=true directly in MongoDB
            db.task_files.update_one(
                {"id": locked_file_id},
                {"$set": {"laast": True}}
            )
            print(f"  → Set laast=true on file {locked_file_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{API_URL}/admin/task-files/{locked_file_id}/konverter-pdf",
                    params={"key": ADMIN_KEY},
                    json={"actor": "QA"}
                )
                
                if response.status_code != 400:
                    print(f"✗ TEST B5 FAILED: Expected 400, got {response.status_code}: {response.text[:200]}")
                    all_passed = False
                else:
                    result = response.json()
                    if "låst" not in result.get("error", "").lower():
                        print(f"✗ TEST B5 FAILED: Expected error about locked file, got: {result.get('error')}")
                        all_passed = False
                    else:
                        print(f"✓ TEST B5 PASSED: Locked file returns 400 with error: {result.get('error')}")
            
            # Unlock for cleanup
            db.task_files.update_one(
                {"id": locked_file_id},
                {"$set": {"laast": False}}
            )
        
        # B6: Active signing → 400
        print("\n[B6] Set signering.status='I_GANG' on DOCX file and try to convert → 400...")
        docx_bytes = generate_minimal_docx()
        signing_file_id = await upload_file_via_chunk(
            "qa-signing.docx",
            docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            task_id="DOKUMENTER"
        )
        
        if not signing_file_id:
            print("✗ TEST B6 FAILED: Could not upload DOCX")
            all_passed = False
        else:
            # Set signering.status='I_GANG' directly in MongoDB
            db.task_files.update_one(
                {"id": signing_file_id},
                {"$set": {"signering": {"status": "I_GANG"}}}
            )
            print(f"  → Set signering.status='I_GANG' on file {signing_file_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{API_URL}/admin/task-files/{signing_file_id}/konverter-pdf",
                    params={"key": ADMIN_KEY},
                    json={"actor": "QA"}
                )
                
                if response.status_code != 400:
                    print(f"✗ TEST B6 FAILED: Expected 400, got {response.status_code}: {response.text[:200]}")
                    all_passed = False
                else:
                    result = response.json()
                    if "pågår" not in result.get("error", "").lower():
                        print(f"✗ TEST B6 FAILED: Expected error about signing in progress, got: {result.get('error')}")
                        all_passed = False
                    else:
                        print(f"✓ TEST B6 PASSED: Active signing returns 400 with error: {result.get('error')}")
            
            # Remove signering for cleanup
            db.task_files.update_one(
                {"id": signing_file_id},
                {"$unset": {"signering": ""}}
            )
        
        # B7: Corrupt DOCX → 422
        print("\n[B7] Upload corrupt DOCX and try to convert → 422...")
        corrupt_bytes = generate_corrupt_docx()
        corrupt_file_id = await upload_file_via_chunk(
            "qa-corrupt.docx",
            corrupt_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            task_id="DOKUMENTER"
        )
        
        if not corrupt_file_id:
            print("✗ TEST B7 FAILED: Could not upload corrupt DOCX")
            all_passed = False
        else:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{API_URL}/admin/task-files/{corrupt_file_id}/konverter-pdf",
                    params={"key": ADMIN_KEY},
                    json={"actor": "QA"}
                )
                
                if response.status_code not in [400, 422]:
                    print(f"✗ TEST B7 FAILED: Expected 400 or 422, got {response.status_code}: {response.text[:200]}")
                    all_passed = False
                else:
                    result = response.json()
                    print(f"✓ TEST B7 PASSED: Corrupt DOCX returns {response.status_code} with error: {result.get('error')}")
                    
                    # Verify file still has versjon=1 (no new version created)
                    file_doc = db.task_files.find_one({"id": corrupt_file_id})
                    if file_doc and file_doc.get("versjon", 1) != 1:
                        print(f"✗ TEST B7 FAILED: File should still be v1, but is v{file_doc.get('versjon')}")
                        all_passed = False
                    else:
                        print(f"  → Verified: File still at versjon=1 (no new version created)")
        
        print("\n" + "="*80)
        if all_passed:
            print("✅ TEST B: VALIDATION PATHS - ALL 7 TESTS PASSED")
        else:
            print("❌ TEST B: VALIDATION PATHS - SOME TESTS FAILED")
        print("="*80)
        return all_passed
        
    except Exception as e:
        print(f"\n✗ TEST B FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_c_regression():
    """
    C) REGRESSION: Verify other endpoints still work
    """
    print("\n" + "="*80)
    print("TEST C: REGRESSION")
    print("="*80)
    
    all_passed = True
    
    try:
        # C1: GET /api/admin/dokumenter → 200
        print("\n[C1] GET /api/admin/dokumenter → 200...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/admin/dokumenter",
                params={"key": ADMIN_KEY}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST C1 FAILED: Expected 200, got {response.status_code}")
                all_passed = False
            else:
                result = response.json()
                if not result.get("ok"):
                    print(f"✗ TEST C1 FAILED: Response not ok: {result}")
                    all_passed = False
                else:
                    print(f"✓ TEST C1 PASSED: GET dokumenter returns 200 with {len(result.get('filer', []))} files")
        
        # C2: GET /api/admin/signering/jobber → 200
        print("\n[C2] GET /api/admin/signering/jobber → 200...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{API_URL}/admin/signering/jobber",
                params={"key": ADMIN_KEY}
            )
            
            if response.status_code != 200:
                print(f"✗ TEST C2 FAILED: Expected 200, got {response.status_code}")
                all_passed = False
            else:
                result = response.json()
                if not result.get("ok"):
                    print(f"✗ TEST C2 FAILED: Response not ok: {result}")
                    all_passed = False
                else:
                    jobber = result.get("jobber", [])
                    print(f"✓ TEST C2 PASSED: GET signering/jobber returns 200 with {len(jobber)} jobs")
                    
                    # Verify existing jobs are untouched
                    i_gang_count = sum(1 for j in jobber if j.get("status") == "I_GANG")
                    print(f"  → Found {i_gang_count} job(s) with status I_GANG (should be preserved)")
        
        print("\n" + "="*80)
        if all_passed:
            print("✅ TEST C: REGRESSION - ALL 2 TESTS PASSED")
        else:
            print("❌ TEST C: REGRESSION - SOME TESTS FAILED")
        print("="*80)
        return all_passed
        
    except Exception as e:
        print(f"\n✗ TEST C FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_d_cleanup():
    """
    D) MANDATORY CLEANUP: Delete all QA files and verify 0 QA files in MongoDB
    """
    print("\n" + "="*80)
    print("TEST D: MANDATORY CLEANUP")
    print("="*80)
    
    try:
        # D1: Delete all uploaded files
        print("\n[D1] Delete all QA files via DELETE /api/admin/task-files/:id...")
        deleted_count = 0
        for file_id in test_state["uploaded_files"]:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{API_URL}/admin/task-files/{file_id}",
                    params={"key": ADMIN_KEY}
                )
                
                if response.status_code == 200:
                    deleted_count += 1
                    print(f"  ✓ Deleted file {file_id}")
                else:
                    print(f"  ✗ Failed to delete file {file_id}: {response.status_code}")
        
        print(f"✓ TEST D1 PASSED: Deleted {deleted_count}/{len(test_state['uploaded_files'])} files")
        
        # D2: Verify 0 QA files in MongoDB task_files
        print("\n[D2] Verify 0 QA files in MongoDB task_files...")
        qa_files = list(db.task_files.find({
            "taskId": "DOKUMENTER",
            "name": {"$regex": "^qa-", "$options": "i"}
        }))
        
        if len(qa_files) > 0:
            print(f"✗ TEST D2 FAILED: Found {len(qa_files)} QA files in task_files:")
            for f in qa_files:
                print(f"  - {f.get('id')}: {f.get('name')}")
            return False
        else:
            print(f"✓ TEST D2 PASSED: 0 QA files in task_files")
        
        # D3: Verify 0 QA files in MongoDB task_file_versjoner
        print("\n[D3] Verify 0 QA files in MongoDB task_file_versjoner...")
        qa_versions = list(db.task_file_versjoner.find({
            "taskId": "DOKUMENTER",
            "name": {"$regex": "^qa-", "$options": "i"}
        }))
        
        if len(qa_versions) > 0:
            print(f"✗ TEST D3 FAILED: Found {len(qa_versions)} QA versions in task_file_versjoner:")
            for v in qa_versions:
                print(f"  - {v.get('id')}: {v.get('name')} (v{v.get('versjon')})")
            return False
        else:
            print(f"✓ TEST D3 PASSED: 0 QA versions in task_file_versjoner")
        
        print("\n" + "="*80)
        print("✅ TEST D: MANDATORY CLEANUP - ALL 3 TESTS PASSED")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n✗ TEST D FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("DOCX→PDF CONVERSION ENDPOINT TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}")
    print(f"DB: {DB_NAME}")
    print("="*80)
    
    results = {
        "A_happy_path": False,
        "B_validation": False,
        "C_regression": False,
        "D_cleanup": False,
    }
    
    # Run tests in sequence
    results["A_happy_path"] = await test_a_happy_path()
    results["B_validation"] = await test_b_validation_paths()
    results["C_regression"] = await test_c_regression()
    results["D_cleanup"] = await test_d_cleanup()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_flag in results.items():
        status = "✅ PASSED" if passed_flag else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} test groups passed ({passed*100//total}% success rate)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! DOCX→PDF conversion endpoint working perfectly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test group(s) failed. Please review the output above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
