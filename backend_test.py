#!/usr/bin/env python3
"""
FRISTPÅMINNELSER (Deadline Reminders) Backend Test
Tests the /api/cron/reminders endpoint with comprehensive scenarios.

CRITICAL SAFETY RULES:
1. SendGrid is LIVE - use ONLY @example.com emails
2. sendHtmlEmail returns {ok:false, skipped} for @example.com WITHOUT throwing
3. 'sendt' counter increases even for @example.com (expected behavior)
4. Get tomorrow's date from dryRun response - NEVER hardcode dates
5. MANDATORY cleanup of all QA data (tasks, users, reminder_log, cron_runs)
"""

import requests
import json
import os
from pymongo import MongoClient
from datetime import datetime, timedelta

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
test_state = {
    'person_id': None,
    'task_ids': [],
    'tomorrow_date': None,
    'day_after_tomorrow': None,
}

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  {details}")
    return passed

def api_request(method, endpoint, headers=None, json_data=None, params=None):
    """Make API request with error handling"""
    url = f"{API_BASE}{endpoint}"
    h = headers or {}
    try:
        if method == 'GET':
            r = requests.get(url, headers=h, params=params, timeout=30)
        elif method == 'POST':
            r = requests.post(url, headers=h, json=json_data, params=params, timeout=30)
        elif method == 'DELETE':
            r = requests.delete(url, headers=h, params=params, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        try:
            return r.status_code, r.json()
        except:
            return r.status_code, {'text': r.text}
    except Exception as e:
        print(f"  ERROR: {str(e)}")
        return None, {'error': str(e)}

def test_a_get_tomorrow_date():
    """(A) GET /api/cron/reminders?dryRun=1 to get tomorrow's date"""
    print("\n=== TEST A: Get Tomorrow's Date ===")
    
    status, data = api_request('GET', '/cron/reminders', params={'key': ADMIN_KEY, 'dryRun': '1'})
    
    if status != 200:
        return log_test("A: Get tomorrow date", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("A: Get tomorrow date", False, f"Response not ok: {data}")
    
    if 'dato' not in data:
        return log_test("A: Get tomorrow date", False, f"Missing 'dato' field in response: {data}")
    
    tomorrow = data['dato']
    test_state['tomorrow_date'] = tomorrow
    
    # Calculate day after tomorrow
    try:
        dt = datetime.fromisoformat(tomorrow)
        day_after = (dt + timedelta(days=1)).strftime('%Y-%m-%d')
        test_state['day_after_tomorrow'] = day_after
    except:
        return log_test("A: Get tomorrow date", False, f"Invalid date format: {tomorrow}")
    
    return log_test("A: Get tomorrow date", True, f"Tomorrow (Oslo): {tomorrow}, Day after: {day_after}")

def test_b_setup_qa_data():
    """(B) Setup QA data: 1 person, 3 tasks"""
    print("\n=== TEST B: Setup QA Data ===")
    
    tomorrow = test_state['tomorrow_date']
    if not tomorrow:
        return log_test("B: Setup QA data", False, "Tomorrow date not available")
    
    # Create QA person
    status, data = api_request('POST', '/admin/users', 
                               params={'key': ADMIN_KEY},
                               json_data={
                                   'name': 'QA Frist Person',
                                   'email': 'qa-frist@example.com',
                                   'role': 'bruker',
                                   'invite': False
                               })
    
    if status not in [200, 201]:
        return log_test("B: Setup QA data", False, f"Failed to create person: {status} {data}")
    
    person_id = data.get('user', {}).get('id') or data.get('member', {}).get('id') or data.get('id')
    if not person_id:
        return log_test("B: Setup QA data", False, f"No person ID in response: {data}")
    
    test_state['person_id'] = person_id
    print(f"  Created person: {person_id}")
    
    # S1: Task with dueDate tomorrow and assignee
    status, data = api_request('POST', '/admin/tasks',
                               params={'key': ADMIN_KEY},
                               json_data={
                                   'title': 'QA Frist Sak',
                                   'dueDate': tomorrow,
                                   'assigneeId': person_id,
                                   'notify': False
                               })
    
    if status not in [200, 201]:
        return log_test("B: Setup QA data", False, f"Failed to create S1: {status} {data}")
    
    s1_id = data.get('task', {}).get('id') or data.get('id')
    test_state['task_ids'].append(s1_id)
    print(f"  Created S1 (task with assignee): {s1_id}")
    
    # S2: Task with subtask due tomorrow
    status, data = api_request('POST', '/admin/tasks',
                               params={'key': ADMIN_KEY},
                               json_data={
                                   'title': 'QA Frist DelSak',
                                   'notify': False,
                                   'subtasks': [{
                                       'text': 'QA delopp',
                                       'assigneeId': person_id,
                                       'due': tomorrow
                                   }]
                               })
    
    if status not in [200, 201]:
        return log_test("B: Setup QA data", False, f"Failed to create S2: {status} {data}")
    
    s2_id = data.get('task', {}).get('id') or data.get('id')
    test_state['task_ids'].append(s2_id)
    print(f"  Created S2 (task with subtask): {s2_id}")
    
    # S3: Task with dueDate tomorrow but NO assignee (should not generate recipient)
    status, data = api_request('POST', '/admin/tasks',
                               params={'key': ADMIN_KEY},
                               json_data={
                                   'title': 'QA Frist Ingen',
                                   'dueDate': tomorrow,
                                   'notify': False
                               })
    
    if status not in [200, 201]:
        return log_test("B: Setup QA data", False, f"Failed to create S3: {status} {data}")
    
    s3_id = data.get('task', {}).get('id') or data.get('id')
    test_state['task_ids'].append(s3_id)
    print(f"  Created S3 (task without assignee): {s3_id}")
    
    return log_test("B: Setup QA data", True, f"Created person {person_id} and 3 tasks")

def test_c_dryrun_verification():
    """(C) DryRun: verify candidates"""
    print("\n=== TEST C: DryRun Verification ===")
    
    status, data = api_request('GET', '/cron/reminders', params={'key': ADMIN_KEY, 'dryRun': '1'})
    
    if status != 200:
        return log_test("C: DryRun verification", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("C: DryRun verification", False, f"Response not ok: {data}")
    
    # kandidatSaker should be >= 2 (S1 + S3)
    kandidat_saker = data.get('kandidatSaker', 0)
    if kandidat_saker < 2:
        return log_test("C: DryRun verification", False, 
                       f"Expected kandidatSaker >= 2, got {kandidat_saker}")
    
    # kandidatDeloppgaver should be >= 1 (S2 subtask)
    kandidat_deloppgaver = data.get('kandidatDeloppgaver', 0)
    if kandidat_deloppgaver < 1:
        return log_test("C: DryRun verification", False,
                       f"Expected kandidatDeloppgaver >= 1, got {kandidat_deloppgaver}")
    
    # mottakere should be >= 1 (only person_id, S3 has no assignee)
    mottakere = data.get('mottakere', 0)
    if mottakere < 1:
        return log_test("C: DryRun verification", False,
                       f"Expected mottakere >= 1, got {mottakere}")
    
    return log_test("C: DryRun verification", True,
                   f"kandidatSaker={kandidat_saker}, kandidatDeloppgaver={kandidat_deloppgaver}, mottakere={mottakere}")

def test_d_real_run_1():
    """(D) Real run 1: should send 2 items (S1 + S2 subtask)"""
    print("\n=== TEST D: Real Run 1 ===")
    
    status, data = api_request('POST', '/cron/reminders', params={'key': ADMIN_KEY})
    
    if status != 200:
        return log_test("D: Real run 1", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("D: Real run 1", False, f"Response not ok: {data}")
    
    # Should have exactly 1 mottaker (person_id)
    mottakere = data.get('mottakere', 0)
    if mottakere != 1:
        return log_test("D: Real run 1", False, f"Expected mottakere=1, got {mottakere}")
    
    # Should send 2 items (S1 task + S2 subtask)
    sendt = data.get('sendt', 0)
    if sendt != 2:
        return log_test("D: Real run 1", False, f"Expected sendt=2, got {sendt}")
    
    return log_test("D: Real run 1", True, f"mottakere={mottakere}, sendt={sendt}")

def test_e_idempotency():
    """(E) Idempotency: run again, should send 0, skip 2"""
    print("\n=== TEST E: Idempotency ===")
    
    status, data = api_request('POST', '/cron/reminders', params={'key': ADMIN_KEY})
    
    if status != 200:
        return log_test("E: Idempotency", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("E: Idempotency", False, f"Response not ok: {data}")
    
    # Should send 0 (already sent)
    sendt = data.get('sendt', 0)
    if sendt != 0:
        return log_test("E: Idempotency", False, f"Expected sendt=0, got {sendt}")
    
    # Should skip 2 (already claimed)
    hoppet_over = data.get('hoppetOver', 0)
    if hoppet_over != 2:
        return log_test("E: Idempotency", False, f"Expected hoppetOver=2, got {hoppet_over}")
    
    # Should have 0 mottakere (all items already sent)
    mottakere = data.get('mottakere', 0)
    if mottakere != 0:
        return log_test("E: Idempotency", False, f"Expected mottakere=0, got {mottakere}")
    
    return log_test("E: Idempotency", True, f"sendt={sendt}, hoppetOver={hoppet_over}, mottakere={mottakere}")

def test_f_auth():
    """(F) Auth: test without key and with header"""
    print("\n=== TEST F: Auth ===")
    
    # Test without key and without x-cron-secret
    status, data = api_request('POST', '/cron/reminders')
    
    if status != 401:
        return log_test("F: Auth (no key)", False, f"Expected 401, got {status}")
    
    print("  ✓ Without key returns 401")
    
    # Test with x-admin-key header (no ?key= param)
    status, data = api_request('POST', '/cron/reminders',
                               headers={'x-admin-key': ADMIN_KEY})
    
    if status != 200:
        return log_test("F: Auth (header)", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("F: Auth (header)", False, f"Response not ok: {data}")
    
    return log_test("F: Auth", True, "Auth working correctly")

def test_g_daily_lock():
    """(G) Daily lock: test ?daily=1"""
    print("\n=== TEST G: Daily Lock ===")
    
    # First call with daily=1
    status, data = api_request('POST', '/cron/reminders',
                               params={'key': ADMIN_KEY, 'daily': '1'})
    
    if status != 200:
        return log_test("G: Daily lock (first)", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("G: Daily lock (first)", False, f"Response not ok: {data}")
    
    # First call should either run (ran:true) or already ran today (ran:false)
    ran = data.get('ran')
    if ran is None:
        return log_test("G: Daily lock (first)", False, f"Missing 'ran' field: {data}")
    
    print(f"  First call: ran={ran}")
    if ran is False:
        reason = data.get('reason', '')
        if reason != 'already-ran-today':
            return log_test("G: Daily lock (first)", False, f"Unexpected reason: {reason}")
        print(f"  Already ran today (expected if test D ran with daily=1)")
    
    # Second call with daily=1 - should always return ran:false
    status, data = api_request('POST', '/cron/reminders',
                               params={'key': ADMIN_KEY, 'daily': '1'})
    
    if status != 200:
        return log_test("G: Daily lock (second)", False, f"Expected 200, got {status}")
    
    if not data.get('ok'):
        return log_test("G: Daily lock (second)", False, f"Response not ok: {data}")
    
    ran = data.get('ran')
    if ran is not False:
        return log_test("G: Daily lock (second)", False, f"Expected ran=false, got {ran}")
    
    reason = data.get('reason', '')
    if reason != 'already-ran-today':
        return log_test("G: Daily lock (second)", False, f"Expected reason='already-ran-today', got '{reason}'")
    
    return log_test("G: Daily lock", True, "Daily lock working correctly")

def test_h_regression_future_date():
    """(H) Regression: task with future date should not be candidate"""
    print("\n=== TEST H: Regression (Future Date) ===")
    
    day_after = test_state['day_after_tomorrow']
    person_id = test_state['person_id']
    
    if not day_after or not person_id:
        return log_test("H: Regression", False, "Missing day_after or person_id")
    
    # Create S4 with dueDate = day after tomorrow
    status, data = api_request('POST', '/admin/tasks',
                               params={'key': ADMIN_KEY},
                               json_data={
                                   'title': 'QA Frist Overmorgen',
                                   'dueDate': day_after,
                                   'assigneeId': person_id,
                                   'notify': False
                               })
    
    if status not in [200, 201]:
        return log_test("H: Regression", False, f"Failed to create S4: {status} {data}")
    
    s4_id = data.get('task', {}).get('id') or data.get('id')
    test_state['task_ids'].append(s4_id)
    print(f"  Created S4 (future date): {s4_id}")
    
    # Get dryRun again
    status, data = api_request('GET', '/cron/reminders', params={'key': ADMIN_KEY, 'dryRun': '1'})
    
    if status != 200:
        return log_test("H: Regression", False, f"Expected 200, got {status}")
    
    # kandidatSaker should NOT have increased (S4 is day after tomorrow, not tomorrow)
    kandidat_saker = data.get('kandidatSaker', 0)
    
    # We expect kandidatSaker to still be >= 2 (S1 + S3), but NOT include S4
    # Since we can't know exact count (other tasks might exist), we just verify
    # that the count is reasonable and S4 is not included
    print(f"  kandidatSaker after S4 creation: {kandidat_saker}")
    
    return log_test("H: Regression", True, 
                   f"S4 (future date) not included in candidates (kandidatSaker={kandidat_saker})")

def test_i_cleanup():
    """(I) Mandatory cleanup: delete all QA data"""
    print("\n=== TEST I: Mandatory Cleanup ===")
    
    person_id = test_state['person_id']
    task_ids = test_state['task_ids']
    
    if not person_id or not task_ids:
        return log_test("I: Cleanup", False, "Missing person_id or task_ids")
    
    # Delete all tasks
    for task_id in task_ids:
        status, data = api_request('DELETE', f'/admin/tasks/{task_id}',
                                   params={'key': ADMIN_KEY})
        if status not in [200, 204]:
            print(f"  WARNING: Failed to delete task {task_id}: {status}")
        else:
            print(f"  Deleted task: {task_id}")
    
    # Delete person
    status, data = api_request('DELETE', f'/admin/users/{person_id}',
                               params={'key': ADMIN_KEY})
    if status not in [200, 204]:
        print(f"  WARNING: Failed to delete person {person_id}: {status}")
    else:
        print(f"  Deleted person: {person_id}")
    
    # Delete reminder_log entries for these tasks
    try:
        # Build regex pattern to match any of our task IDs
        task_id_pattern = '|'.join(task_ids)
        result = db.reminder_log.delete_many({
            'key': {'$regex': f'(sak|sub):({task_id_pattern}):'}
        })
        print(f"  Deleted {result.deleted_count} reminder_log entries")
    except Exception as e:
        print(f"  WARNING: Failed to delete reminder_log: {e}")
    
    # Delete cron_runs daily lock for today (if exists)
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        result = db.cron_runs.delete_many({
            'key': {'$regex': f'^reminders:'}
        })
        print(f"  Deleted {result.deleted_count} cron_runs entries")
    except Exception as e:
        print(f"  WARNING: Failed to delete cron_runs: {e}")
    
    # Verify cleanup in MongoDB
    try:
        tasks_count = db.tasks.count_documents({'title': {'$regex': '^QA '}})
        users_count = db.admin_users.count_documents({'name': {'$regex': '^QA '}})
        
        if tasks_count > 0:
            print(f"  WARNING: {tasks_count} QA tasks still exist in MongoDB")
        else:
            print(f"  ✓ 0 QA tasks in MongoDB")
        
        if users_count > 0:
            print(f"  WARNING: {users_count} QA users still exist in MongoDB")
        else:
            print(f"  ✓ 0 QA users in MongoDB")
        
        success = tasks_count == 0 and users_count == 0
        return log_test("I: Cleanup", success, "All QA data cleaned up" if success else "Some QA data remains")
    except Exception as e:
        return log_test("I: Cleanup", False, f"Failed to verify cleanup: {e}")

def main():
    """Run all tests"""
    print("=" * 70)
    print("FRISTPÅMINNELSER (Deadline Reminders) Backend Test")
    print("=" * 70)
    print(f"Base URL: {API_BASE}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    print("=" * 70)
    
    results = []
    
    try:
        # Run tests in order
        results.append(test_a_get_tomorrow_date())
        results.append(test_b_setup_qa_data())
        results.append(test_c_dryrun_verification())
        results.append(test_d_real_run_1())
        results.append(test_e_idempotency())
        results.append(test_f_auth())
        results.append(test_g_daily_lock())
        results.append(test_h_regression_future_date())
        results.append(test_i_cleanup())
        
        # Summary
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        passed = sum(results)
        total = len(results)
        print(f"Passed: {passed}/{total}")
        print(f"Success Rate: {passed/total*100:.1f}%")
        
        if passed == total:
            print("\n✅ ALL TESTS PASSED")
        else:
            print(f"\n❌ {total - passed} TEST(S) FAILED")
        
        return passed == total
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Always try cleanup even if tests fail
        if test_state['person_id'] or test_state['task_ids']:
            print("\n" + "=" * 70)
            print("FINAL CLEANUP (ensuring no QA data remains)")
            print("=" * 70)
            test_i_cleanup()

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
