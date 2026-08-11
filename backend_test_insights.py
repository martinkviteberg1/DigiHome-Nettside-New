#!/usr/bin/env python3
"""
Backend test for DigiHome Saksinnsikt endpoint
Tests GET /api/admin/tasks/insights
"""

import requests
import json
import time
from datetime import datetime
from pymongo import MongoClient
import os

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

print("=" * 80)
print("SAKSINNSIKT ENDPOINT TESTING")
print("=" * 80)
print(f"Base URL: {API_BASE}")
print(f"Admin key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# Track test results
test_results = []

def test_result(test_name, passed, details=""):
    """Record test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": test_name, "passed": passed, "details": details})
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    print()

# ============================================================================
# TEST 1: AUTH - Without key → 401
# ============================================================================
print("TEST 1: AUTH - Without key → 401")
try:
    response = requests.get(f"{API_BASE}/admin/tasks/insights", timeout=10)
    if response.status_code == 401:
        data = response.json()
        if data.get('error') == 'Uautorisert':
            test_result("AUTH: Without key returns 401 with correct error", True, f"Status: {response.status_code}, Error: {data.get('error')}")
        else:
            test_result("AUTH: Without key returns 401 with correct error", False, f"Wrong error message: {data.get('error')}")
    else:
        test_result("AUTH: Without key returns 401", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    test_result("AUTH: Without key returns 401", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 2: AUTH - With invalid key → 401
# ============================================================================
print("TEST 2: AUTH - With invalid key → 401")
try:
    response = requests.get(f"{API_BASE}/admin/tasks/insights?key=invalid_key_123", timeout=10)
    if response.status_code == 401:
        data = response.json()
        test_result("AUTH: Invalid key returns 401", True, f"Status: {response.status_code}, Error: {data.get('error')}")
    else:
        test_result("AUTH: Invalid key returns 401", False, f"Expected 401, got {response.status_code}")
except Exception as e:
    test_result("AUTH: Invalid key returns 401", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 3: AUTH - With valid key → 200 ok:true
# ============================================================================
print("TEST 3: AUTH - With valid key → 200 ok:true")
try:
    response = requests.get(f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}", timeout=10)
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') == True:
            test_result("AUTH: Valid key returns 200 with ok:true", True, f"Status: {response.status_code}")
        else:
            test_result("AUTH: Valid key returns 200 with ok:true", False, f"ok field is {data.get('ok')}")
    else:
        test_result("AUTH: Valid key returns 200", False, f"Expected 200, got {response.status_code}: {response.text}")
except Exception as e:
    test_result("AUTH: Valid key returns 200", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: RESPONSE STRUCTURE - All required fields present
# ============================================================================
print("TEST 4: RESPONSE STRUCTURE - All required fields present")
try:
    response = requests.get(f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}", timeout=10)
    data = response.json()
    
    # Check top-level fields
    required_top = ['ok', 'today', 'kpi', 'status', 'priority', 'throughput', 'perPerson', 'perProject', 'oldest']
    missing_top = [f for f in required_top if f not in data]
    
    # Check kpi fields
    required_kpi = ['open', 'overdue', 'overdueRatio', 'done7', 'done30', 'created7', 'created30', 'leadMedianDays', 'leadCount']
    missing_kpi = [f for f in required_kpi if f not in data.get('kpi', {})]
    
    # Check status fields
    required_status = ['inbox', 'doing', 'waiting']
    missing_status = [f for f in required_status if f not in data.get('status', {})]
    
    # Check priority fields
    required_priority = ['p1', 'p2', 'p3']
    missing_priority = [f for f in required_priority if f not in data.get('priority', {})]
    
    if not missing_top and not missing_kpi and not missing_status and not missing_priority:
        test_result("STRUCTURE: All required fields present", True, f"today={data['today']}, kpi.open={data['kpi']['open']}")
        
        # Store data for later tests
        insights_data = data
    else:
        missing = []
        if missing_top: missing.append(f"Top: {missing_top}")
        if missing_kpi: missing.append(f"KPI: {missing_kpi}")
        if missing_status: missing.append(f"Status: {missing_status}")
        if missing_priority: missing.append(f"Priority: {missing_priority}")
        test_result("STRUCTURE: All required fields present", False, f"Missing fields: {', '.join(missing)}")
        insights_data = None
except Exception as e:
    test_result("STRUCTURE: All required fields present", False, f"Exception: {str(e)}")
    insights_data = None

# ============================================================================
# TEST 5: CONSISTENCY - kpi.open === status.inbox + status.doing + status.waiting
# ============================================================================
print("TEST 5: CONSISTENCY - kpi.open === status sum")
if insights_data:
    try:
        kpi_open = insights_data['kpi']['open']
        status_sum = insights_data['status']['inbox'] + insights_data['status']['doing'] + insights_data['status']['waiting']
        
        if kpi_open == status_sum:
            test_result("CONSISTENCY: kpi.open === status sum", True, f"{kpi_open} === {status_sum}")
        else:
            test_result("CONSISTENCY: kpi.open === status sum", False, f"{kpi_open} !== {status_sum}")
    except Exception as e:
        test_result("CONSISTENCY: kpi.open === status sum", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: kpi.open === status sum", False, "No data from previous test")

# ============================================================================
# TEST 6: CONSISTENCY - kpi.open === priority sum
# ============================================================================
print("TEST 6: CONSISTENCY - kpi.open === priority sum")
if insights_data:
    try:
        kpi_open = insights_data['kpi']['open']
        priority_sum = insights_data['priority']['p1'] + insights_data['priority']['p2'] + insights_data['priority']['p3']
        
        if kpi_open == priority_sum:
            test_result("CONSISTENCY: kpi.open === priority sum", True, f"{kpi_open} === {priority_sum}")
        else:
            test_result("CONSISTENCY: kpi.open === priority sum", False, f"{kpi_open} !== {priority_sum}")
    except Exception as e:
        test_result("CONSISTENCY: kpi.open === priority sum", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: kpi.open === priority sum", False, "No data from previous test")

# ============================================================================
# TEST 7: CONSISTENCY - overdueRatio calculation
# ============================================================================
print("TEST 7: CONSISTENCY - overdueRatio calculation")
if insights_data:
    try:
        kpi_open = insights_data['kpi']['open']
        kpi_overdue = insights_data['kpi']['overdue']
        kpi_ratio = insights_data['kpi']['overdueRatio']
        
        expected_ratio = round((kpi_overdue / kpi_open) * 100) if kpi_open > 0 else 0
        
        if kpi_ratio == expected_ratio:
            test_result("CONSISTENCY: overdueRatio correct", True, f"{kpi_ratio}% === round({kpi_overdue}/{kpi_open}*100) = {expected_ratio}%")
        else:
            test_result("CONSISTENCY: overdueRatio correct", False, f"{kpi_ratio}% !== {expected_ratio}%")
    except Exception as e:
        test_result("CONSISTENCY: overdueRatio correct", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: overdueRatio correct", False, "No data from previous test")

# ============================================================================
# TEST 8: CONSISTENCY - throughput array length === 8
# ============================================================================
print("TEST 8: CONSISTENCY - throughput array length === 8")
if insights_data:
    try:
        throughput = insights_data['throughput']
        
        if len(throughput) == 8:
            # Check each item has required fields
            all_valid = all('label' in item and 'created' in item and 'done' in item for item in throughput)
            if all_valid:
                # Check all values are integers >= 0
                all_ints = all(isinstance(item['created'], int) and isinstance(item['done'], int) and 
                              item['created'] >= 0 and item['done'] >= 0 for item in throughput)
                if all_ints:
                    test_result("CONSISTENCY: throughput array valid", True, f"8 items, first label={throughput[0]['label']}, last label={throughput[7]['label']}")
                else:
                    test_result("CONSISTENCY: throughput array valid", False, "Some values are not integers >= 0")
            else:
                test_result("CONSISTENCY: throughput array valid", False, "Some items missing required fields")
        else:
            test_result("CONSISTENCY: throughput array valid", False, f"Expected 8 items, got {len(throughput)}")
    except Exception as e:
        test_result("CONSISTENCY: throughput array valid", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: throughput array valid", False, "No data from previous test")

# ============================================================================
# TEST 9: CONSISTENCY - perPerson calculations
# ============================================================================
print("TEST 9: CONSISTENCY - perPerson calculations")
if insights_data:
    try:
        per_person = insights_data['perPerson']
        kpi_open = insights_data['kpi']['open']
        
        # Check each person: open === doing + waiting + inbox
        person_checks = []
        for person in per_person:
            person_open = person['open']
            person_sum = person['doing'] + person['waiting'] + person['inbox']
            if person_open != person_sum:
                person_checks.append(f"{person['name']}: {person_open} !== {person_sum}")
        
        # Check sum of all perPerson.open === kpi.open
        total_person_open = sum(p['open'] for p in per_person)
        
        # Check if 'Ikke tildelt' exists when there are unassigned open tasks
        has_unassigned = any(p['id'] is None and p['name'] == 'Ikke tildelt' for p in per_person)
        
        if not person_checks and total_person_open == kpi_open:
            test_result("CONSISTENCY: perPerson calculations", True, 
                       f"All persons valid, sum={total_person_open}, has_unassigned={has_unassigned}")
        else:
            details = []
            if person_checks:
                details.append(f"Person mismatches: {'; '.join(person_checks)}")
            if total_person_open != kpi_open:
                details.append(f"Sum mismatch: {total_person_open} !== {kpi_open}")
            test_result("CONSISTENCY: perPerson calculations", False, '; '.join(details))
    except Exception as e:
        test_result("CONSISTENCY: perPerson calculations", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: perPerson calculations", False, "No data from previous test")

# ============================================================================
# TEST 10: CONSISTENCY - perProject calculations
# ============================================================================
print("TEST 10: CONSISTENCY - perProject calculations")
if insights_data:
    try:
        per_project = insights_data['perProject']
        kpi_open = insights_data['kpi']['open']
        
        # Check each project: total === open + done
        project_checks = []
        for project in per_project:
            project_total = project['total']
            project_sum = project['open'] + project['done']
            if project_total != project_sum:
                project_checks.append(f"{project['name']}: {project_total} !== {project_sum}")
        
        # Check sum of all perProject.open === kpi.open
        total_project_open = sum(p['open'] for p in per_project)
        
        if not project_checks and total_project_open == kpi_open:
            test_result("CONSISTENCY: perProject calculations", True, 
                       f"All projects valid, sum open={total_project_open}")
        else:
            details = []
            if project_checks:
                details.append(f"Project mismatches: {'; '.join(project_checks)}")
            if total_project_open != kpi_open:
                details.append(f"Sum mismatch: {total_project_open} !== {kpi_open}")
            test_result("CONSISTENCY: perProject calculations", False, '; '.join(details))
    except Exception as e:
        test_result("CONSISTENCY: perProject calculations", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: perProject calculations", False, "No data from previous test")

# ============================================================================
# TEST 11: CONSISTENCY - oldest array validation
# ============================================================================
print("TEST 11: CONSISTENCY - oldest array validation")
if insights_data:
    try:
        oldest = insights_data['oldest']
        
        # Check max 6 elements
        if len(oldest) <= 6:
            # Check all have status !== 'done'
            all_not_done = all(item['status'] != 'done' for item in oldest)
            
            # Check all have ageDays >= 0
            all_age_valid = all(isinstance(item['ageDays'], int) and item['ageDays'] >= 0 for item in oldest)
            
            # Check sorted by age (oldest first - ascending ageDays)
            if len(oldest) > 1:
                is_sorted = all(oldest[i]['ageDays'] <= oldest[i+1]['ageDays'] for i in range(len(oldest)-1))
            else:
                is_sorted = True
            
            if all_not_done and all_age_valid:
                test_result("CONSISTENCY: oldest array valid", True, 
                           f"{len(oldest)} items, all not done, all ages valid, sorted={is_sorted}")
            else:
                details = []
                if not all_not_done:
                    details.append("Some items have status='done'")
                if not all_age_valid:
                    details.append("Some ageDays invalid")
                test_result("CONSISTENCY: oldest array valid", False, '; '.join(details))
        else:
            test_result("CONSISTENCY: oldest array valid", False, f"Expected max 6 items, got {len(oldest)}")
    except Exception as e:
        test_result("CONSISTENCY: oldest array valid", False, f"Exception: {str(e)}")
else:
    test_result("CONSISTENCY: oldest array valid", False, "No data from previous test")

# ============================================================================
# TEST 12: FUNCTIONAL EFFECT - Create test task and verify metrics change
# ============================================================================
print("TEST 12: FUNCTIONAL EFFECT - Create test task and verify metrics change")
try:
    # Get baseline metrics
    response = requests.get(f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}", timeout=10)
    baseline = response.json()
    baseline_open = baseline['kpi']['open']
    baseline_p3 = baseline['priority']['p3']
    
    print(f"  Baseline: kpi.open={baseline_open}, priority.p3={baseline_p3}")
    
    # Create test task
    test_task_data = {
        "title": "TESTSAK innsikt - slett meg",
        "status": "inbox",
        "priority": 3,
        "notify": False,
        "actor": "TestAgent"
    }
    
    response = requests.post(f"{API_BASE}/admin/tasks?key={ADMIN_KEY}", 
                            json=test_task_data, timeout=10)
    
    if response.status_code in [200, 201]:
        task_data = response.json()
        test_task_id = task_data.get('task', {}).get('id')
        print(f"  Created test task: {test_task_id}")
        
        # Wait a moment for consistency
        time.sleep(1)
        
        # Get updated metrics
        response = requests.get(f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}", timeout=10)
        after_create = response.json()
        after_open = after_create['kpi']['open']
        after_p3 = after_create['priority']['p3']
        
        print(f"  After create: kpi.open={after_open}, priority.p3={after_p3}")
        
        if after_open == baseline_open + 1 and after_p3 == baseline_p3 + 1:
            test_result("FUNCTIONAL: Create task increases metrics", True, 
                       f"open: {baseline_open}→{after_open}, p3: {baseline_p3}→{after_p3}")
            
            # Now mark as done
            update_data = {
                "status": "done",
                "actor": "TestAgent"
            }
            
            response = requests.put(f"{API_BASE}/admin/tasks/{test_task_id}?key={ADMIN_KEY}", 
                                   json=update_data, timeout=10)
            
            if response.status_code == 200:
                print(f"  Marked task as done")
                
                # Wait a moment
                time.sleep(1)
                
                # Get final metrics
                response = requests.get(f"{API_BASE}/admin/tasks/insights?key={ADMIN_KEY}", timeout=10)
                after_done = response.json()
                final_open = after_done['kpi']['open']
                final_done7 = after_done['kpi']['done7']
                
                print(f"  After done: kpi.open={final_open}, kpi.done7={final_done7}")
                
                if final_open == baseline_open and final_done7 >= baseline['kpi']['done7'] + 1:
                    test_result("FUNCTIONAL: Mark done decreases open and increases done7", True, 
                               f"open: {after_open}→{final_open}, done7 increased")
                    
                    # CLEANUP: Delete test task directly in MongoDB
                    print(f"  Cleaning up: deleting test task {test_task_id} from MongoDB")
                    result = db.tasks.delete_one({"id": test_task_id})
                    if result.deleted_count == 1:
                        print(f"  ✓ Test task deleted from MongoDB")
                    else:
                        print(f"  ⚠ Warning: Could not delete test task from MongoDB")
                else:
                    test_result("FUNCTIONAL: Mark done decreases open and increases done7", False, 
                               f"open: {after_open}→{final_open} (expected {baseline_open}), done7 change unclear")
            else:
                test_result("FUNCTIONAL: Mark done decreases open and increases done7", False, 
                           f"Failed to mark task as done: {response.status_code}")
        else:
            test_result("FUNCTIONAL: Create task increases metrics", False, 
                       f"open: {baseline_open}→{after_open} (expected +1), p3: {baseline_p3}→{after_p3} (expected +1)")
    else:
        test_result("FUNCTIONAL: Create task increases metrics", False, 
                   f"Failed to create task: {response.status_code}: {response.text}")
except Exception as e:
    test_result("FUNCTIONAL: Create task increases metrics", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 13: REGRESSION - GET /api/admin/tasks still works
# ============================================================================
print("TEST 13: REGRESSION - GET /api/admin/tasks still works")
try:
    response = requests.get(f"{API_BASE}/admin/tasks?key={ADMIN_KEY}", timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('ok') == True and 'tasks' in data and 'members' in data and 'projects' in data:
            tasks = data['tasks']
            
            # Check that the 4 demo tasks exist and are untouched
            demo_tasks = [
                "Oppgradere fellesareal Storgata 4",
                "Bestille elektriker til belysning",
                "Innhente tilbud fra tre malere",
                "Signere fornyet leieavtale Damsgårdsveien 12"
            ]
            
            found_demo = [title for title in demo_tasks if any(t['title'] == title for t in tasks)]
            
            if len(found_demo) == 4:
                test_result("REGRESSION: GET /admin/tasks works and 4 demo tasks exist", True, 
                           f"Found all 4 demo tasks: {', '.join(found_demo)}")
            else:
                test_result("REGRESSION: GET /admin/tasks works and 4 demo tasks exist", False, 
                           f"Only found {len(found_demo)}/4 demo tasks: {found_demo}")
        else:
            test_result("REGRESSION: GET /admin/tasks works", False, 
                       f"Missing required fields in response")
    else:
        test_result("REGRESSION: GET /admin/tasks works", False, 
                   f"Expected 200, got {response.status_code}")
except Exception as e:
    test_result("REGRESSION: GET /admin/tasks works", False, f"Exception: {str(e)}")

# ============================================================================
# SUMMARY
# ============================================================================
print()
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed = sum(1 for t in test_results if t['passed'])
total = len(test_results)
pass_rate = (passed / total * 100) if total > 0 else 0

print(f"Total tests: {total}")
print(f"Passed: {passed}")
print(f"Failed: {total - passed}")
print(f"Pass rate: {pass_rate:.1f}%")
print()

if total - passed > 0:
    print("FAILED TESTS:")
    for t in test_results:
        if not t['passed']:
            print(f"  ❌ {t['name']}")
            if t['details']:
                print(f"     {t['details']}")
    print()

print("=" * 80)
print(f"SAKSINNSIKT ENDPOINT TESTING COMPLETE")
print("=" * 80)
