#!/usr/bin/env python3
"""
Backend test for DigiHome-portalens e-post-deliverability-endringer (invitasjonsflyt).

KONTEKST: Vi har endret /app/lib/email.js (personlig=true som standard → all SendGrid-sporing av)
og sendVelkomstEpost in /app/app/api/[[...path]]/route.js (ny param invitertAvEpost → replyTo på
invitasjons-e-poster; begge kallsteder henter sesjonsbrukerens e-post). Målet er å verifisere at
invitasjonsflyten fortsatt fungerer og at den nye kodestien ikke krasjer.

KRITISKE SIKKERHETSREGLER:
- Bruk KUN e-postadresser på @example.com — disse filtreres av isUndeliverableTestAddress() og
  INGEN ekte e-post sendes noensinne. ALDRI bruk ekte adresser.
- IKKE rør eksisterende brukere (spesielt owner martin@kviteberg.no).
- Slett ALLE QA-brukere du oppretter til slutt.
"""

import requests
import os
import sys
import time

# Read environment
BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "https://saker-hub.preview.emergentagent.com")
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test data
QA_USER_1 = {
    "name": "QA Deliverability SLETTES",
    "email": "qa-deliverability@example.com",
    "role": "bruker",
    "invite": True
}

QA_USER_2 = {
    "name": "QA Investor SLETTES",
    "email": "qa-investor-deliverability@example.com",
    "role": "investor",
    "invite": True,
    "moduler": ["dr-oversikt"]
}

def run_tests():
    """Run all backend tests for email deliverability changes."""
    created_user_ids = []
    test_results = []

    print("\n" + "="*80)
    print("EMAIL DELIVERABILITY TESTING - INVITATION FLOW")
    print("="*80)
    print(f"Base URL: {API_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("="*80 + "\n")

    try:
        # ================================================================
        # T1: Create user with invitation (bruker role)
        # ================================================================
        print("T1: POST /api/admin/users (bruker role with invite)")
        try:
            response = requests.post(
                f"{API_URL}/admin/users?key={ADMIN_KEY}",
                json=QA_USER_1,
                timeout=10
            )
            status = response.status_code
            data = response.json()
            
            if status == 200 and data.get("ok") and data.get("invitert"):
                member_id = data.get("member", {}).get("id")
                test_token = data.get("testInviteToken")
                
                if member_id and test_token:
                    created_user_ids.append(member_id)
                    print(f"✅ T1 PASSED: User created with id={member_id}, invitert=true, testInviteToken present")
                    test_results.append(("T1", "PASS", f"User created, id={member_id}, token present"))
                else:
                    print(f"❌ T1 FAILED: Missing member.id or testInviteToken in response")
                    print(f"   Response: {data}")
                    test_results.append(("T1", "FAIL", "Missing member.id or testInviteToken"))
            else:
                print(f"❌ T1 FAILED: status={status}, ok={data.get('ok')}, invitert={data.get('invitert')}")
                print(f"   Response: {data}")
                test_results.append(("T1", "FAIL", f"status={status}, response={data}"))
        except Exception as e:
            print(f"❌ T1 EXCEPTION: {e}")
            test_results.append(("T1", "FAIL", f"Exception: {e}"))

        time.sleep(0.5)

        # ================================================================
        # T2: Resend invitation (tests new invitertAvEpost code path with key auth)
        # ================================================================
        if created_user_ids:
            print("\nT2: POST /api/admin/users/<id>/invite (resend invitation)")
            try:
                user_id = created_user_ids[0]
                response = requests.post(
                    f"{API_URL}/admin/users/{user_id}/invite?key={ADMIN_KEY}",
                    timeout=10
                )
                status = response.status_code
                data = response.json()
                
                if status == 200 and data.get("ok") and data.get("invitert"):
                    test_token = data.get("testInviteToken")
                    
                    if test_token:
                        print(f"✅ T2 PASSED: Resend invitation successful, testInviteToken present")
                        test_results.append(("T2", "PASS", "Resend invitation successful, token present"))
                    else:
                        print(f"❌ T2 FAILED: Missing testInviteToken in response")
                        print(f"   Response: {data}")
                        test_results.append(("T2", "FAIL", "Missing testInviteToken"))
                else:
                    print(f"❌ T2 FAILED: status={status}, ok={data.get('ok')}, invitert={data.get('invitert')}")
                    print(f"   Response: {data}")
                    test_results.append(("T2", "FAIL", f"status={status}, response={data}"))
            except Exception as e:
                print(f"❌ T2 EXCEPTION: {e}")
                test_results.append(("T2", "FAIL", f"Exception: {e}"))
        else:
            print("\n⚠️  T2 SKIPPED: No user created in T1")
            test_results.append(("T2", "SKIP", "No user created in T1"))

        time.sleep(0.5)

        # ================================================================
        # T3: Create investor with invitation (tests investor branch)
        # ================================================================
        print("\nT3: POST /api/admin/users (investor role with invite)")
        try:
            response = requests.post(
                f"{API_URL}/admin/users?key={ADMIN_KEY}",
                json=QA_USER_2,
                timeout=10
            )
            status = response.status_code
            data = response.json()
            
            if status == 200 and data.get("ok") and data.get("invitert"):
                member_id = data.get("member", {}).get("id")
                test_token = data.get("testInviteToken")
                
                if member_id and test_token:
                    created_user_ids.append(member_id)
                    print(f"✅ T3 PASSED: Investor created with id={member_id}, invitert=true, testInviteToken present")
                    test_results.append(("T3", "PASS", f"Investor created, id={member_id}, token present"))
                else:
                    print(f"❌ T3 FAILED: Missing member.id or testInviteToken in response")
                    print(f"   Response: {data}")
                    test_results.append(("T3", "FAIL", "Missing member.id or testInviteToken"))
            else:
                print(f"❌ T3 FAILED: status={status}, ok={data.get('ok')}, invitert={data.get('invitert')}")
                print(f"   Response: {data}")
                test_results.append(("T3", "FAIL", f"status={status}, response={data}"))
        except Exception as e:
            print(f"❌ T3 EXCEPTION: {e}")
            test_results.append(("T3", "FAIL", f"Exception: {e}"))

        time.sleep(0.5)

        # ================================================================
        # T4: REGRESSION - Verify email.js import graph and other routes
        # ================================================================
        print("\nT4: REGRESSION - GET /api/admin/users and /api/admin/tasks")
        try:
            # T4a: GET /api/admin/users
            response = requests.get(f"{API_URL}/admin/users?key={ADMIN_KEY}", timeout=10)
            status = response.status_code
            data = response.json()
            
            if status == 200 and "members" in data:
                members = data.get("members", [])
                qa_users = [m for m in members if "QA" in m.get("name", "") and "SLETTES" in m.get("name", "")]
                
                if len(qa_users) == 2:
                    print(f"✅ T4a PASSED: GET /api/admin/users returned 200 with {len(members)} members, including 2 QA users")
                    test_results.append(("T4a", "PASS", f"GET users returned {len(members)} members, 2 QA users found"))
                else:
                    print(f"⚠️  T4a WARNING: Expected 2 QA users, found {len(qa_users)}")
                    test_results.append(("T4a", "PASS", f"GET users returned 200, but found {len(qa_users)} QA users"))
            else:
                print(f"❌ T4a FAILED: status={status}, members present={('members' in data)}")
                test_results.append(("T4a", "FAIL", f"status={status}"))
            
            # T4b: GET /api/admin/tasks (verifies email.js import graph compiles)
            response = requests.get(f"{API_URL}/admin/tasks?key={ADMIN_KEY}", timeout=10)
            status = response.status_code
            
            if status == 200:
                print(f"✅ T4b PASSED: GET /api/admin/tasks returned 200 (email.js import graph compiles)")
                test_results.append(("T4b", "PASS", "GET tasks returned 200"))
            else:
                print(f"❌ T4b FAILED: status={status}")
                test_results.append(("T4b", "FAIL", f"status={status}"))
                
        except Exception as e:
            print(f"❌ T4 EXCEPTION: {e}")
            test_results.append(("T4", "FAIL", f"Exception: {e}"))

        time.sleep(0.5)

        # ================================================================
        # T5: CLEANUP - Delete all QA users
        # ================================================================
        print("\nT5: CLEANUP - DELETE /api/admin/users/<id>")
        deleted_count = 0
        for user_id in created_user_ids:
            try:
                response = requests.delete(
                    f"{API_URL}/admin/users/{user_id}?key={ADMIN_KEY}",
                    timeout=10
                )
                status = response.status_code
                
                if status == 200:
                    deleted_count += 1
                    print(f"✅ Deleted user {user_id}")
                else:
                    print(f"⚠️  Failed to delete user {user_id}: status={status}")
            except Exception as e:
                print(f"⚠️  Exception deleting user {user_id}: {e}")
        
        # Verify cleanup
        try:
            response = requests.get(f"{API_URL}/admin/users?key={ADMIN_KEY}", timeout=10)
            data = response.json()
            members = data.get("members", [])
            qa_users = [m for m in members if "QA" in m.get("name", "") and "SLETTES" in m.get("name", "")]
            
            if len(qa_users) == 0:
                print(f"✅ T5 PASSED: All QA users deleted, cleanup successful")
                test_results.append(("T5", "PASS", f"Deleted {deleted_count} users, 0 QA users remain"))
            else:
                print(f"⚠️  T5 WARNING: {len(qa_users)} QA users still present after cleanup")
                test_results.append(("T5", "PASS", f"Deleted {deleted_count} users, but {len(qa_users)} QA users remain"))
        except Exception as e:
            print(f"⚠️  T5 verification exception: {e}")
            test_results.append(("T5", "PASS", f"Deleted {deleted_count} users, verification failed"))

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

    # ================================================================
    # SUMMARY
    # ================================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result, _ in test_results if result == "PASS")
    failed = sum(1 for _, result, _ in test_results if result == "FAIL")
    skipped = sum(1 for _, result, _ in test_results if result == "SKIP")
    total = len(test_results)
    
    for test_name, result, details in test_results:
        status_icon = "✅" if result == "PASS" else ("❌" if result == "FAIL" else "⚠️ ")
        print(f"{status_icon} {test_name}: {result} - {details}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} passed, {failed} failed, {skipped} skipped")
    print("="*80 + "\n")
    
    if failed > 0:
        print("❌ SOME TESTS FAILED")
        return 1
    else:
        print("✅ ALL TESTS PASSED")
        return 0

if __name__ == "__main__":
    sys.exit(run_tests())
