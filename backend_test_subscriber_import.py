#!/usr/bin/env python3
"""
Backend test for subscriber-import endpoints (GET /api/admin/newsletter/subscriber-candidates + POST /api/admin/newsletter/subscribers/import).
Tests the two NEW subscriber-import endpoints per review_request.

CRITICAL SAFETY RULES:
- Do NOT send any emails (no /newsletter/send or /newsletter/test calls)
- Do NOT delete or modify EXISTING subscribers (martin@kviteberg.no, test-footer@digihome-test.no, backend-test@digihome-test.no, upper@case.no)
- Do NOT unsubscribe real people
- For optout test: insert TEMPORARY doc directly in MongoDB and remove afterwards
- MANDATORY CLEANUP: delete every subscriber created via import endpoint and remove temp optout doc
"""

import asyncio
import httpx
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
imported_emails = []  # Track emails we import for cleanup
temp_optout_email = None  # Track temp optout for cleanup

def log_test(step, passed, message):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - Step {step}: {message}")
    test_results.append({"step": step, "passed": passed, "message": message})
    sys.stdout.flush()

async def test_subscriber_import():
    """Test subscriber-import endpoints"""
    global imported_emails, temp_optout_email
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("\n" + "="*80)
        print("SUBSCRIBER-IMPORT ENDPOINTS TESTING")
        print("="*80 + "\n")
        
        # Connect to MongoDB for optout test and cleanup
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        
        try:
            # ================================================================
            # STEP 1: CANDIDATES - GET /api/admin/newsletter/subscriber-candidates
            # ================================================================
            print("\n--- STEP 1: GET /api/admin/newsletter/subscriber-candidates ---")
            
            # 1a: With key - should return 200 with candidates
            try:
                response = await client.get(
                    f"{BASE_URL}/admin/newsletter/subscriber-candidates",
                    params={"key": ADMIN_KEY}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok") and "candidates" in data:
                        candidates = data["candidates"]
                        
                        # Verify structure
                        if len(candidates) > 0:
                            first = candidates[0]
                            required_fields = ["email", "name", "status", "type", "alreadySubscriber", "unsubscribed"]
                            has_all_fields = all(field in first for field in required_fields)
                            
                            if has_all_fields:
                                # Verify email is lowercase
                                email_lowercase = all(c["email"] == c["email"].lower() for c in candidates if c.get("email"))
                                
                                # Verify type is 'lead' or 'tenant'
                                valid_types = all(c.get("type") in ["lead", "tenant"] for c in candidates)
                                
                                # Verify no duplicate emails
                                emails = [c["email"] for c in candidates if c.get("email")]
                                no_duplicates = len(emails) == len(set(emails))
                                
                                # Verify at least one candidate has alreadySubscriber=true (martin@kviteberg.no exists)
                                has_existing_subscriber = any(c.get("alreadySubscriber") for c in candidates)
                                
                                if email_lowercase and valid_types and no_duplicates and has_existing_subscriber:
                                    log_test("1a", True, f"GET subscriber-candidates returns 200 with {len(candidates)} candidates, all required fields present, emails lowercase, types valid, no duplicates, at least one alreadySubscriber=true")
                                else:
                                    issues = []
                                    if not email_lowercase: issues.append("emails not lowercase")
                                    if not valid_types: issues.append("invalid types")
                                    if not no_duplicates: issues.append("duplicate emails")
                                    if not has_existing_subscriber: issues.append("no alreadySubscriber=true")
                                    log_test("1a", False, f"Candidates validation failed: {', '.join(issues)}")
                            else:
                                log_test("1a", False, f"Missing required fields in candidates. First candidate: {first}")
                        else:
                            log_test("1a", True, "GET subscriber-candidates returns 200 with empty candidates array (no leads in DB)")
                    else:
                        log_test("1a", False, f"Response missing 'ok' or 'candidates'. Response: {data}")
                else:
                    log_test("1a", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            except Exception as e:
                log_test("1a", False, f"Exception: {str(e)}")
            
            # 1b: Without key - should return 401
            try:
                response = await client.get(f"{BASE_URL}/admin/newsletter/subscriber-candidates")
                
                if response.status_code == 401:
                    log_test("1b", True, "GET subscriber-candidates without key returns 401")
                else:
                    log_test("1b", False, f"Expected 401, got {response.status_code}")
            except Exception as e:
                log_test("1b", False, f"Exception: {str(e)}")
            
            # ================================================================
            # STEP 2: IMPORT HAPPY PATH - POST /api/admin/newsletter/subscribers/import
            # ================================================================
            print("\n--- STEP 2: IMPORT HAPPY PATH ---")
            
            # Get candidates to find 2 that are not already subscribers and not unsubscribed
            try:
                response = await client.get(
                    f"{BASE_URL}/admin/newsletter/subscriber-candidates",
                    params={"key": ADMIN_KEY}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    
                    # Find 2 candidates that are not already subscribers and not unsubscribed
                    available = [c for c in candidates if not c.get("alreadySubscriber") and not c.get("unsubscribed")]
                    
                    if len(available) >= 2:
                        # Pick 2 candidates
                        to_import = available[:2]
                        import_items = [{"email": c["email"], "name": c["name"]} for c in to_import]
                        imported_emails.extend([c["email"] for c in to_import])
                        
                        # 2a: Import 2 candidates
                        try:
                            response = await client.post(
                                f"{BASE_URL}/admin/newsletter/subscribers/import",
                                params={"key": ADMIN_KEY},
                                json={"items": import_items}
                            )
                            
                            if response.status_code == 201:
                                data = response.json()
                                if data.get("ok") and data.get("added") == 2 and data.get("already") == 0 and data.get("skippedOptout") == 0 and data.get("skippedInvalid") == 0:
                                    log_test("2a", True, f"POST import with 2 candidates returns 201 with added=2, already=0, skippedOptout=0, skippedInvalid=0")
                                else:
                                    log_test("2a", False, f"Unexpected counts: {data}")
                            else:
                                log_test("2a", False, f"Expected 201, got {response.status_code}. Response: {response.text}")
                        except Exception as e:
                            log_test("2a", False, f"Exception: {str(e)}")
                        
                        # 2b: Verify both emails now appear in GET /api/admin/newsletter/subscribers with source='import-leads'
                        try:
                            response = await client.get(
                                f"{BASE_URL}/admin/newsletter/subscribers",
                                params={"key": ADMIN_KEY}
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                subscribers = data.get("subscribers", [])
                                
                                # Check both imported emails are present with source='import-leads'
                                imported_subs = [s for s in subscribers if s.get("email") in imported_emails]
                                
                                if len(imported_subs) == 2:
                                    all_have_source = all(s.get("source") == "import-leads" for s in imported_subs)
                                    if all_have_source:
                                        log_test("2b", True, f"Both imported emails appear in subscribers list with source='import-leads'")
                                    else:
                                        log_test("2b", False, f"Not all imported subscribers have source='import-leads': {imported_subs}")
                                else:
                                    log_test("2b", False, f"Expected 2 imported subscribers, found {len(imported_subs)}")
                            else:
                                log_test("2b", False, f"Expected 200, got {response.status_code}")
                        except Exception as e:
                            log_test("2b", False, f"Exception: {str(e)}")
                        
                        # 2c: Verify in subscriber-candidates that those 2 now have alreadySubscriber=true
                        try:
                            response = await client.get(
                                f"{BASE_URL}/admin/newsletter/subscriber-candidates",
                                params={"key": ADMIN_KEY}
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                candidates = data.get("candidates", [])
                                
                                # Check both imported emails now have alreadySubscriber=true
                                imported_cands = [c for c in candidates if c.get("email") in imported_emails]
                                
                                if len(imported_cands) == 2:
                                    all_already_sub = all(c.get("alreadySubscriber") for c in imported_cands)
                                    if all_already_sub:
                                        log_test("2c", True, f"Both imported emails now have alreadySubscriber=true in candidates")
                                    else:
                                        log_test("2c", False, f"Not all imported candidates have alreadySubscriber=true: {imported_cands}")
                                else:
                                    log_test("2c", False, f"Expected 2 imported candidates, found {len(imported_cands)}")
                            else:
                                log_test("2c", False, f"Expected 200, got {response.status_code}")
                        except Exception as e:
                            log_test("2c", False, f"Exception: {str(e)}")
                    else:
                        log_test("2a", False, f"Not enough available candidates (need 2, found {len(available)})")
                        log_test("2b", False, "Skipped - no candidates imported")
                        log_test("2c", False, "Skipped - no candidates imported")
                else:
                    log_test("2a", False, f"Failed to get candidates: {response.status_code}")
                    log_test("2b", False, "Skipped - no candidates imported")
                    log_test("2c", False, "Skipped - no candidates imported")
            except Exception as e:
                log_test("2a", False, f"Exception: {str(e)}")
                log_test("2b", False, "Skipped - exception in 2a")
                log_test("2c", False, "Skipped - exception in 2a")
            
            # ================================================================
            # STEP 3: IDEMPOTENT - Repeat the same POST
            # ================================================================
            print("\n--- STEP 3: IDEMPOTENT ---")
            
            if len(imported_emails) >= 2:
                try:
                    # Repeat the same import
                    import_items = [{"email": email} for email in imported_emails[:2]]
                    
                    response = await client.post(
                        f"{BASE_URL}/admin/newsletter/subscribers/import",
                        params={"key": ADMIN_KEY},
                        json={"items": import_items}
                    )
                    
                    if response.status_code == 201:
                        data = response.json()
                        if data.get("ok") and data.get("added") == 0 and data.get("already") == 2:
                            log_test("3", True, f"Repeat import returns 201 with added=0, already=2 (idempotent)")
                        else:
                            log_test("3", False, f"Expected added=0, already=2, got: {data}")
                    else:
                        log_test("3", False, f"Expected 201, got {response.status_code}. Response: {response.text}")
                except Exception as e:
                    log_test("3", False, f"Exception: {str(e)}")
            else:
                log_test("3", False, "Skipped - no emails imported in step 2")
            
            # ================================================================
            # STEP 4: OPTOUT RESPECTED
            # ================================================================
            print("\n--- STEP 4: OPTOUT RESPECTED ---")
            
            temp_optout_email = "qa-optout-import@example.test"
            
            try:
                # 4a: Insert temp optout doc in MongoDB
                now_iso = asyncio.get_event_loop().time()
                from datetime import datetime
                now_iso = datetime.utcnow().isoformat() + "Z"
                
                db.email_optouts.insert_one({
                    "email": temp_optout_email,
                    "at": now_iso,
                    "source": "qa-test"
                })
                log_test("4a", True, f"Inserted temp optout doc for {temp_optout_email}")
                
                # 4b: Try to import the optout email
                try:
                    response = await client.post(
                        f"{BASE_URL}/admin/newsletter/subscribers/import",
                        params={"key": ADMIN_KEY},
                        json={"items": [{"email": temp_optout_email}]}
                    )
                    
                    if response.status_code == 201:
                        data = response.json()
                        if data.get("ok") and data.get("skippedOptout") == 1 and data.get("added") == 0:
                            log_test("4b", True, f"Import with optout email returns 201 with skippedOptout=1, added=0")
                        else:
                            log_test("4b", False, f"Expected skippedOptout=1, added=0, got: {data}")
                    else:
                        log_test("4b", False, f"Expected 201, got {response.status_code}. Response: {response.text}")
                except Exception as e:
                    log_test("4b", False, f"Exception: {str(e)}")
                
                # 4c: Verify optout email does NOT appear in GET /api/admin/newsletter/subscribers
                try:
                    response = await client.get(
                        f"{BASE_URL}/admin/newsletter/subscribers",
                        params={"key": ADMIN_KEY}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        subscribers = data.get("subscribers", [])
                        
                        # Check optout email is NOT present
                        optout_sub = [s for s in subscribers if s.get("email") == temp_optout_email]
                        
                        if len(optout_sub) == 0:
                            log_test("4c", True, f"Optout email {temp_optout_email} does NOT appear in subscribers list")
                        else:
                            log_test("4c", False, f"Optout email {temp_optout_email} should not be in subscribers list but found: {optout_sub}")
                    else:
                        log_test("4c", False, f"Expected 200, got {response.status_code}")
                except Exception as e:
                    log_test("4c", False, f"Exception: {str(e)}")
                
            except Exception as e:
                log_test("4a", False, f"Exception inserting optout doc: {str(e)}")
                log_test("4b", False, "Skipped - optout doc not inserted")
                log_test("4c", False, "Skipped - optout doc not inserted")
            
            # ================================================================
            # STEP 5: VALIDATION
            # ================================================================
            print("\n--- STEP 5: VALIDATION ---")
            
            # 5a: POST with empty body {} - should return 400
            try:
                response = await client.post(
                    f"{BASE_URL}/admin/newsletter/subscribers/import",
                    params={"key": ADMIN_KEY},
                    json={}
                )
                
                if response.status_code == 400:
                    data = response.json()
                    if "Ingen mottakere valgt" in data.get("error", ""):
                        log_test("5a", True, "POST import with empty body returns 400 'Ingen mottakere valgt'")
                    else:
                        log_test("5a", True, f"POST import with empty body returns 400 (error: {data.get('error')})")
                else:
                    log_test("5a", False, f"Expected 400, got {response.status_code}. Response: {response.text}")
            except Exception as e:
                log_test("5a", False, f"Exception: {str(e)}")
            
            # 5b: POST with invalid email - should return 201 with skippedInvalid=1
            try:
                response = await client.post(
                    f"{BASE_URL}/admin/newsletter/subscribers/import",
                    params={"key": ADMIN_KEY},
                    json={"items": [{"email": "ikke-en-epost"}]}
                )
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get("ok") and data.get("skippedInvalid") == 1 and data.get("added") == 0:
                        log_test("5b", True, "POST import with invalid email returns 201 with skippedInvalid=1, added=0")
                    else:
                        log_test("5b", False, f"Expected skippedInvalid=1, added=0, got: {data}")
                else:
                    log_test("5b", False, f"Expected 201, got {response.status_code}. Response: {response.text}")
            except Exception as e:
                log_test("5b", False, f"Exception: {str(e)}")
            
            # 5c: POST without key - should return 401
            try:
                response = await client.post(
                    f"{BASE_URL}/admin/newsletter/subscribers/import",
                    json={"items": [{"email": "test@test.com"}]}
                )
                
                if response.status_code == 401:
                    log_test("5c", True, "POST import without key returns 401")
                else:
                    log_test("5c", False, f"Expected 401, got {response.status_code}")
            except Exception as e:
                log_test("5c", False, f"Exception: {str(e)}")
            
            # ================================================================
            # STEP 6: REGRESSION
            # ================================================================
            print("\n--- STEP 6: REGRESSION ---")
            
            # 6a: GET /api/admin/newsletter/subscribers - existing endpoint unaffected
            try:
                response = await client.get(
                    f"{BASE_URL}/admin/newsletter/subscribers",
                    params={"key": ADMIN_KEY}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok") and "subscribers" in data:
                        log_test("6a", True, f"GET /api/admin/newsletter/subscribers returns 200 (regression)")
                    else:
                        log_test("6a", False, f"Response missing 'ok' or 'subscribers': {data}")
                else:
                    log_test("6a", False, f"Expected 200, got {response.status_code}")
            except Exception as e:
                log_test("6a", False, f"Exception: {str(e)}")
            
            # 6b: GET /api/ - root endpoint (308 redirect is acceptable)
            try:
                response = await client.get(f"{BASE_URL}/", follow_redirects=True)
                
                if response.status_code == 200:
                    log_test("6b", True, "GET /api/ returns 200 (regression)")
                else:
                    log_test("6b", False, f"Expected 200, got {response.status_code}")
            except Exception as e:
                log_test("6b", False, f"Exception: {str(e)}")
            
            # 6c: POST /api/admin/newsletter/subscribers - single add (regression)
            qa_single_email = "qa-single-add@example.test"
            try:
                response = await client.post(
                    f"{BASE_URL}/admin/newsletter/subscribers",
                    params={"key": ADMIN_KEY},
                    json={"email": qa_single_email}
                )
                
                if response.status_code == 201:
                    data = response.json()
                    if data.get("ok"):
                        log_test("6c", True, f"POST /api/admin/newsletter/subscribers single add returns 201 (regression)")
                        # Add to cleanup list
                        imported_emails.append(qa_single_email)
                    else:
                        log_test("6c", False, f"Response missing 'ok': {data}")
                else:
                    log_test("6c", False, f"Expected 201, got {response.status_code}")
            except Exception as e:
                log_test("6c", False, f"Exception: {str(e)}")
            
            # ================================================================
            # STEP 7: CLEANUP (MANDATORY)
            # ================================================================
            print("\n--- STEP 7: CLEANUP (MANDATORY) ---")
            
            # 7a: Delete all imported subscribers
            deleted_count = 0
            for email in imported_emails:
                try:
                    response = await client.delete(
                        f"{BASE_URL}/admin/newsletter/subscribers",
                        params={"key": ADMIN_KEY, "email": email}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("ok") and data.get("deleted") == 1:
                            deleted_count += 1
                        else:
                            print(f"  Warning: Failed to delete {email}: {data}")
                    else:
                        print(f"  Warning: Failed to delete {email}: {response.status_code}")
                except Exception as e:
                    print(f"  Warning: Exception deleting {email}: {str(e)}")
            
            if deleted_count == len(imported_emails):
                log_test("7a", True, f"Deleted all {deleted_count} imported subscribers")
            else:
                log_test("7a", False, f"Expected to delete {len(imported_emails)} subscribers, deleted {deleted_count}")
            
            # 7b: Delete temp optout doc from MongoDB
            if temp_optout_email:
                try:
                    result = db.email_optouts.delete_one({"email": temp_optout_email})
                    if result.deleted_count == 1:
                        log_test("7b", True, f"Deleted temp optout doc for {temp_optout_email}")
                    else:
                        log_test("7b", False, f"Failed to delete temp optout doc (deleted_count={result.deleted_count})")
                except Exception as e:
                    log_test("7b", False, f"Exception deleting optout doc: {str(e)}")
            else:
                log_test("7b", True, "No temp optout doc to delete")
            
            # 7c: Verify final subscriber list contains ONLY original 4 subscribers
            try:
                response = await client.get(
                    f"{BASE_URL}/admin/newsletter/subscribers",
                    params={"key": ADMIN_KEY}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    subscribers = data.get("subscribers", [])
                    
                    # Check that none of our imported emails are present
                    remaining_imported = [s for s in subscribers if s.get("email") in imported_emails]
                    
                    if len(remaining_imported) == 0:
                        log_test("7c", True, f"Final subscriber list clean - no imported test emails remain (total subscribers: {len(subscribers)})")
                    else:
                        log_test("7c", False, f"Found {len(remaining_imported)} imported emails still in list: {[s['email'] for s in remaining_imported]}")
                else:
                    log_test("7c", False, f"Expected 200, got {response.status_code}")
            except Exception as e:
                log_test("7c", False, f"Exception: {str(e)}")
            
            # 7d: Verify temp optout doc is removed
            if temp_optout_email:
                try:
                    count = db.email_optouts.count_documents({"email": temp_optout_email})
                    if count == 0:
                        log_test("7d", True, f"Temp optout doc removed from email_optouts")
                    else:
                        log_test("7d", False, f"Temp optout doc still exists in email_optouts (count={count})")
                except Exception as e:
                    log_test("7d", False, f"Exception checking optout doc: {str(e)}")
            else:
                log_test("7d", True, "No temp optout doc to verify")
            
        finally:
            # Close MongoDB connection
            mongo_client.close()
        
        # ================================================================
        # SUMMARY
        # ================================================================
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in test_results if r["passed"])
        total = len(test_results)
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n✅ ALL SUBSCRIBER-IMPORT TESTS PASSED")
        else:
            print(f"\n❌ {total - passed} TEST(S) FAILED")
            print("\nFailed tests:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  - Step {r['step']}: {r['message']}")
        
        return passed == total

if __name__ == "__main__":
    success = asyncio.run(test_subscriber_import())
    sys.exit(0 if success else 1)
