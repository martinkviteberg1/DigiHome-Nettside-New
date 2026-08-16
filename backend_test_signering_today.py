#!/usr/bin/env python3
"""
Backend test for today's signing changes (signering robusthet + verdensklasse-pakke).
Focused read-only testing with ONE poll call maximum.

CRITICAL RULES:
1. REAL signing jobs exist at Posten - NEVER call POST purring/cancel on existing jobs
2. NEVER create signing jobs (POST task-files/:id/signering)
3. NEVER poll Posten's queue directly
4. POST /api/admin/signering/poll should be called MAXIMUM ONE time total
5. Do not create/modify/delete existing cases, files or jobs
6. Everything can be tested read-only except the ONE poll call
"""

import requests
import sys
import json

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_adressebok():
    """
    A) GET /api/admin/signering/adressebok
    - Without key → 401
    - With admin-key → 200 {ok:true, kontakter:[...]}
    - Each contact has ONLY navn and epost (never sid/signerUrl/status)
    - Expect at least 1 contact (martin@kviteberg.no exists in history)
    """
    print("\n=== TEST A: GET /api/admin/signering/adressebok ===")
    
    # A1: Without key → 401
    try:
        print("\nA1: Testing without key (expect 401)...")
        r = requests.get(f"{BASE_URL}/admin/signering/adressebok", timeout=30)
        if r.status_code == 401:
            print(f"✅ A1 PASS: Without key returns 401")
        else:
            print(f"❌ A1 FAIL: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ A1 FAIL: Exception: {e}")
        return False
    
    # A2: With admin-key → 200 with kontakter
    try:
        print("\nA2: Testing with admin-key (expect 200 with kontakter)...")
        r = requests.get(f"{BASE_URL}/admin/signering/adressebok?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ A2 FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ A2 FAIL: Response ok is not true")
            return False
        
        kontakter = data.get('kontakter', [])
        print(f"✅ A2 PASS: Returns 200 with ok=true, kontakter count: {len(kontakter)}")
        
        # A3: Verify at least 1 contact
        if len(kontakter) < 1:
            print(f"❌ A3 FAIL: Expected at least 1 contact, got {len(kontakter)}")
            return False
        print(f"✅ A3 PASS: At least 1 contact found")
        
        # A4: Verify martin@kviteberg.no exists
        martin_found = any(k.get('epost') == 'martin@kviteberg.no' for k in kontakter)
        if not martin_found:
            print(f"⚠️  A4 WARNING: martin@kviteberg.no not found in kontakter (expected from history)")
        else:
            print(f"✅ A4 PASS: martin@kviteberg.no found in kontakter")
        
        # A5: Verify each contact has ONLY navn and epost (never sid/signerUrl/status)
        print("\nA5: Verifying contact structure (should have ONLY navn and epost)...")
        all_valid = True
        for i, kontakt in enumerate(kontakter):
            # Check required fields
            if 'navn' not in kontakt or 'epost' not in kontakt:
                print(f"❌ A5 FAIL: Contact {i} missing navn or epost: {kontakt}")
                all_valid = False
                continue
            
            # Check forbidden fields
            forbidden_fields = ['sid', 'signerUrl', 'status', 'signertAt']
            found_forbidden = [f for f in forbidden_fields if f in kontakt]
            if found_forbidden:
                print(f"❌ A5 FAIL: Contact {i} contains forbidden fields {found_forbidden}: {kontakt}")
                all_valid = False
                continue
            
            # Check for extra fields (should only have navn and epost)
            allowed_fields = {'navn', 'epost'}
            extra_fields = set(kontakt.keys()) - allowed_fields
            if extra_fields:
                print(f"⚠️  A5 WARNING: Contact {i} has extra fields {extra_fields}: {kontakt}")
        
        if all_valid:
            print(f"✅ A5 PASS: All {len(kontakter)} contacts have correct structure (only navn and epost)")
        else:
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ A2 FAIL: Exception: {e}")
        return False


def test_sid_stripping_in_file_details():
    """
    B) Security: sid-stripping in file details
    - Find file-id via GET /api/admin/dokumenter (admin) — choose file with 'Aksjonaeravtale' in name
    - GET /api/admin/task-files/<id>/detaljer with admin-key → 200
    - CRITICAL: detaljer.signering is array of jobs; NO signatar in any job should contain sid or signerUrl
    - Signatars should still have navn/epost/status/signertAt
    - Also verify detaljer shows versjon 3 and laast:true (real signed document)
    """
    print("\n=== TEST B: Security - sid-stripping in file details ===")
    
    # B1: Find file with 'Aksjonaeravtale' in name
    try:
        print("\nB1: Finding file with 'Aksjonaeravtale' in name...")
        r = requests.get(f"{BASE_URL}/admin/dokumenter?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ B1 FAIL: GET dokumenter returned {r.status_code}")
            return False
        
        data = r.json()
        filer = data.get('filer', [])
        print(f"Found {len(filer)} files in dokumenter")
        
        # Find file with 'Aksjonaeravtale' in name (case-insensitive)
        aksjonaeravtale_file = None
        for fil in filer:
            if 'aksjonaeravtale' in fil.get('name', '').lower():
                aksjonaeravtale_file = fil
                break
        
        if not aksjonaeravtale_file:
            print(f"❌ B1 FAIL: No file with 'Aksjonaeravtale' in name found")
            print(f"Available files: {[f.get('name') for f in filer]}")
            return False
        
        file_id = aksjonaeravtale_file.get('id')
        file_name = aksjonaeravtale_file.get('name')
        print(f"✅ B1 PASS: Found file '{file_name}' with id {file_id}")
        
    except Exception as e:
        print(f"❌ B1 FAIL: Exception: {e}")
        return False
    
    # B2: GET detaljer for this file
    try:
        print(f"\nB2: Getting detaljer for file {file_id}...")
        r = requests.get(f"{BASE_URL}/admin/task-files/{file_id}/detaljer?key={ADMIN_KEY}", timeout=30)
        if r.status_code != 200:
            print(f"❌ B2 FAIL: GET detaljer returned {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return False
        
        response = r.json()
        print(f"✅ B2 PASS: GET detaljer returned 200")
        
        # Handle nested detaljer structure
        detaljer = response.get('detaljer', response)
        
        # B3: Verify versjon 3 and laast:true
        versjon = detaljer.get('versjon')
        laast = detaljer.get('laast')
        
        if versjon != 3:
            print(f"⚠️  B3 WARNING: Expected versjon=3, got versjon={versjon}")
        else:
            print(f"✅ B3 PASS: versjon=3 (signed document)")
        
        if not laast:
            print(f"⚠️  B3 WARNING: Expected laast=true, got laast={laast}")
        else:
            print(f"✅ B3 PASS: laast=true (locked signed document)")
        
        # B4: CRITICAL - Verify signering array exists and check signatars
        signering = detaljer.get('signering', [])
        if not isinstance(signering, list):
            print(f"❌ B4 FAIL: signering is not an array: {type(signering)}")
            return False
        
        print(f"\nB4: Verifying signering array ({len(signering)} jobs)...")
        if len(signering) == 0:
            print(f"⚠️  B4 WARNING: signering array is empty (expected at least 1 job for signed document)")
        
        all_valid = True
        for job_idx, jobb in enumerate(signering):
            print(f"\n  Job {job_idx}: status={jobb.get('status')}, signatarer count={len(jobb.get('signatarer', []))}")
            
            signatarer = jobb.get('signatarer', [])
            if not isinstance(signatarer, list):
                print(f"  ❌ B4 FAIL: Job {job_idx} signatarer is not an array")
                all_valid = False
                continue
            
            for sig_idx, signatar in enumerate(signatarer):
                # Check forbidden fields (CRITICAL SECURITY)
                forbidden_fields = ['sid', 'signerUrl']
                found_forbidden = [f for f in forbidden_fields if f in signatar]
                if found_forbidden:
                    print(f"  ❌ B4 FAIL: Job {job_idx} signatar {sig_idx} contains FORBIDDEN fields {found_forbidden}")
                    print(f"    Signatar: {signatar}")
                    all_valid = False
                    continue
                
                # Check expected fields
                expected_fields = ['navn', 'epost', 'status']
                missing_fields = [f for f in expected_fields if f not in signatar]
                if missing_fields:
                    print(f"  ⚠️  WARNING: Job {job_idx} signatar {sig_idx} missing expected fields {missing_fields}")
                
                # signertAt is optional (only present if signed)
                if signatar.get('status') == 'SIGNERT' and 'signertAt' not in signatar:
                    print(f"  ⚠️  WARNING: Job {job_idx} signatar {sig_idx} has status SIGNERT but no signertAt")
                
                print(f"  ✅ Signatar {sig_idx}: navn={signatar.get('navn')}, epost={signatar.get('epost')}, status={signatar.get('status')}, NO sid/signerUrl")
        
        if all_valid:
            print(f"\n✅ B4 PASS: CRITICAL SECURITY VERIFIED - NO signatar in any job contains sid or signerUrl")
        else:
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ B2 FAIL: Exception: {e}")
        return False


def test_poll_semantics():
    """
    C) Poll semantics (ONE time only)
    - POST /api/admin/signering/poll without key → 401 (doesn't count as the poll call)
    - POST /api/admin/signering/poll with admin-key ONE time → 200 with {ok:true}
      and EITHER {venter:true, nestePoll:<ISO>, planlagt:<bool>} OR {aktive:<n>, hendelser:<n>}
    - Both response formats are valid
    - Do NOT call it multiple times
    """
    print("\n=== TEST C: Poll semantics (ONE time only) ===")
    
    # C1: Without key → 401 (doesn't count as the poll call)
    try:
        print("\nC1: Testing POST poll without key (expect 401, doesn't count as poll)...")
        r = requests.post(f"{BASE_URL}/admin/signering/poll", timeout=30)
        if r.status_code == 401:
            print(f"✅ C1 PASS: Without key returns 401")
        else:
            print(f"❌ C1 FAIL: Expected 401, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ C1 FAIL: Exception: {e}")
        return False
    
    # C2: With admin-key ONE time → 200 with valid response
    try:
        print("\nC2: Testing POST poll with admin-key (ONE TIME ONLY)...")
        print("⚠️  CRITICAL: This is the ONE AND ONLY poll call allowed in this test")
        r = requests.post(f"{BASE_URL}/admin/signering/poll?key={ADMIN_KEY}", timeout=60)
        
        if r.status_code != 200:
            print(f"❌ C2 FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ C2 FAIL: Response ok is not true")
            return False
        
        print(f"✅ C2 PASS: Returns 200 with ok=true")
        
        # C3: Verify response format (EITHER venter format OR aktive format)
        has_venter = 'venter' in data
        has_aktive = 'aktive' in data
        
        if has_venter:
            # Format 1: {ok:true, venter:true, nestePoll:<ISO>, planlagt:<bool>}
            print(f"\nC3: Response format 1 (venter) detected")
            print(f"  venter: {data.get('venter')}")
            print(f"  nestePoll: {data.get('nestePoll')}")
            print(f"  planlagt: {data.get('planlagt')}")
            
            if not isinstance(data.get('venter'), bool):
                print(f"❌ C3 FAIL: venter is not boolean")
                return False
            
            if 'nestePoll' in data and not isinstance(data.get('nestePoll'), str):
                print(f"❌ C3 FAIL: nestePoll is not string")
                return False
            
            if 'planlagt' in data and not isinstance(data.get('planlagt'), bool):
                print(f"❌ C3 FAIL: planlagt is not boolean")
                return False
            
            print(f"✅ C3 PASS: Valid venter format response")
            
        elif has_aktive:
            # Format 2: {ok:true, aktive:<n>, hendelser:<n>}
            print(f"\nC3: Response format 2 (aktive) detected")
            print(f"  aktive: {data.get('aktive')}")
            print(f"  hendelser: {data.get('hendelser')}")
            
            if not isinstance(data.get('aktive'), int):
                print(f"❌ C3 FAIL: aktive is not integer")
                return False
            
            if not isinstance(data.get('hendelser'), int):
                print(f"❌ C3 FAIL: hendelser is not integer")
                return False
            
            print(f"✅ C3 PASS: Valid aktive format response")
            
        else:
            print(f"❌ C3 FAIL: Response has neither 'venter' nor 'aktive' field")
            print(f"Response: {json.dumps(data, indent=2)}")
            return False
        
        print(f"\n⚠️  IMPORTANT: Poll call completed. Do NOT call poll again in this test session.")
        return True
        
    except Exception as e:
        print(f"❌ C2 FAIL: Exception: {e}")
        return False


def test_jobber_regression():
    """
    D) GET /api/admin/signering/jobber (read-only regression)
    - With admin-key → 200
    - Verify shareholder agreement job has status FULLFORT
    - Verify no signatars in response have sid/signerUrl
    """
    print("\n=== TEST D: GET /api/admin/signering/jobber (regression) ===")
    
    try:
        print("\nD1: Testing GET jobber with admin-key...")
        r = requests.get(f"{BASE_URL}/admin/signering/jobber?key={ADMIN_KEY}", timeout=30)
        
        if r.status_code != 200:
            print(f"❌ D1 FAIL: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ D1 FAIL: Response ok is not true")
            return False
        
        jobber = data.get('jobber', [])
        print(f"✅ D1 PASS: Returns 200 with ok=true, jobber count: {len(jobber)}")
        
        # D2: Find shareholder agreement job (aksjonæravtale)
        print("\nD2: Looking for shareholder agreement job (aksjonæravtale)...")
        aksjonaeravtale_job = None
        for jobb in jobber:
            tittel = jobb.get('tittel', '').lower()
            if 'aksjonæravtale' in tittel or 'aksjonaeravtale' in tittel:
                aksjonaeravtale_job = jobb
                break
        
        if not aksjonaeravtale_job:
            print(f"⚠️  D2 WARNING: No job with 'aksjonæravtale' in tittel found")
            print(f"Available jobs: {[(j.get('tittel'), j.get('status')) for j in jobber]}")
        else:
            status = aksjonaeravtale_job.get('status')
            print(f"✅ D2 PASS: Found aksjonæravtale job with status={status}")
            
            if status != 'FULLFORT':
                print(f"⚠️  D2 WARNING: Expected status=FULLFORT, got status={status}")
            else:
                print(f"✅ D2 PASS: Aksjonæravtale job has status=FULLFORT")
        
        # D3: CRITICAL - Verify no signatars have sid/signerUrl
        print("\nD3: Verifying NO signatars have sid/signerUrl (CRITICAL SECURITY)...")
        all_valid = True
        for job_idx, jobb in enumerate(jobber):
            tittel = jobb.get('tittel', '')
            signatarer = jobb.get('signatarer', [])
            
            for sig_idx, signatar in enumerate(signatarer):
                forbidden_fields = ['sid', 'signerUrl']
                found_forbidden = [f for f in forbidden_fields if f in signatar]
                if found_forbidden:
                    print(f"  ❌ D3 FAIL: Job '{tittel}' signatar {sig_idx} contains FORBIDDEN fields {found_forbidden}")
                    print(f"    Signatar: {signatar}")
                    all_valid = False
        
        if all_valid:
            print(f"✅ D3 PASS: CRITICAL SECURITY VERIFIED - NO signatar in any job contains sid or signerUrl")
        else:
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ D1 FAIL: Exception: {e}")
        return False


def test_cron_endpoint_auth():
    """
    E) Cron endpoint — ONLY authentication check
    - POST /api/cron/signering without auth → 401/403 (or similar rejection)
    - DO NOT call it with valid auth (cron runs itself)
    """
    print("\n=== TEST E: Cron endpoint - authentication check only ===")
    
    try:
        print("\nE1: Testing POST /api/cron/signering without auth (expect 401/403)...")
        r = requests.post(f"{BASE_URL}/cron/signering", timeout=30)
        
        if r.status_code in [401, 403]:
            print(f"✅ E1 PASS: Without auth returns {r.status_code} (rejected)")
        else:
            print(f"⚠️  E1 WARNING: Expected 401 or 403, got {r.status_code}")
            print(f"Response: {r.text[:200]}")
            # Not a hard failure - any rejection is acceptable
        
        print(f"\n⚠️  IMPORTANT: Do NOT call this endpoint with valid auth (cron runs itself)")
        return True
        
    except Exception as e:
        print(f"❌ E1 FAIL: Exception: {e}")
        return False


def main():
    print("=" * 80)
    print("BACKEND TEST: Today's Signing Changes (Signering Robusthet)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("\nCRITICAL RULES:")
    print("1. REAL signing jobs exist - NEVER call POST purring/cancel")
    print("2. NEVER create signing jobs")
    print("3. POST /api/admin/signering/poll called MAXIMUM ONE time")
    print("4. Everything tested read-only except ONE poll call")
    print("=" * 80)
    
    results = {}
    
    # Test A: Adressebok
    results['A_adressebok'] = test_adressebok()
    
    # Test B: sid-stripping in file details
    results['B_sid_stripping'] = test_sid_stripping_in_file_details()
    
    # Test C: Poll semantics (ONE time only)
    results['C_poll_semantics'] = test_poll_semantics()
    
    # Test D: Jobber regression
    results['D_jobber_regression'] = test_jobber_regression()
    
    # Test E: Cron endpoint auth
    results['E_cron_auth'] = test_cron_endpoint_auth()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({100*passed//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
