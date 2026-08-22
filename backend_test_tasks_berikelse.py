#!/usr/bin/env python3
"""
Backend test for DigiHome tasks-GET-berikelse (attachment enrichment).
Tests GET /api/admin/tasks with enriched attachment fields (signeringStatus, laast, versjon, arkiv).
"""

import requests
import sys
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_t1_get_tasks_with_enriched_attachments():
    """T1: GET /api/admin/tasks should return attachments with signeringStatus field"""
    print("\n=== T1: GET /api/admin/tasks with enriched attachments ===")
    
    try:
        response = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check if we have tasks
        if 'tasks' not in data or not isinstance(data['tasks'], list):
            print(f"❌ FAILED: Response doesn't contain 'tasks' array")
            return False
        
        print(f"✓ Found {len(data['tasks'])} tasks")
        
        # Look for attachments with signeringStatus
        found_signering_status = False
        found_laast = False
        found_versjon = False
        found_arkiv = False
        attachment_with_signering = None
        
        for task in data['tasks']:
            if 'attachments' in task and isinstance(task['attachments'], list):
                for att in task['attachments']:
                    # Check for signeringStatus
                    if 'signeringStatus' in att:
                        found_signering_status = True
                        attachment_with_signering = att
                        print(f"✓ Found attachment with signeringStatus: '{att.get('signeringStatus')}'")
                        print(f"  File name: {att.get('name', 'N/A')}")
                        
                        # Check if it's the expected test document
                        if att.get('name') == 'Testdokument for signering.pdf':
                            print(f"  ✓ Found expected 'Testdokument for signering.pdf'")
                            if att.get('signeringStatus') == 'I_GANG':
                                print(f"  ✓ signeringStatus is 'I_GANG' as expected")
                    
                    # Check for other enrichment fields
                    if 'laast' in att:
                        found_laast = True
                    if 'versjon' in att:
                        found_versjon = True
                    if 'arkiv' in att:
                        found_arkiv = True
        
        # Report findings
        print(f"\n--- Enrichment fields found ---")
        print(f"signeringStatus: {'✓ YES' if found_signering_status else '✗ NO'}")
        print(f"laast: {'✓ YES' if found_laast else '✗ NO'}")
        print(f"versjon: {'✓ YES' if found_versjon else '✗ NO'}")
        print(f"arkiv: {'✓ YES' if found_arkiv else '✗ NO'}")
        
        if not found_signering_status:
            print(f"\n❌ FAILED: No attachment with 'signeringStatus' field found")
            return False
        
        print(f"\n✓ T1 PASSED: At least one attachment has signeringStatus field")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_t2_regression_create_and_delete():
    """T2: Regression test - create and delete a task"""
    print("\n=== T2: Regression - Create and Delete Task ===")
    
    created_task_id = None
    
    try:
        # Step 1: Create task
        print("\nStep 1: Creating task...")
        create_payload = {
            "title": "QA Berikelse SLETTES",
            "actor": "QA"
        }
        
        response = requests.post(
            f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}",
            json=create_payload,
            timeout=30
        )
        print(f"Create status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print(f"❌ FAILED: Response ok is not true")
            print(f"Response: {data}")
            return False
        
        # Extract task ID
        if 'task' in data and 'id' in data['task']:
            created_task_id = data['task']['id']
        elif 'id' in data:
            created_task_id = data['id']
        else:
            print(f"❌ FAILED: Could not find task ID in response")
            print(f"Response: {data}")
            return False
        
        print(f"✓ Task created with ID: {created_task_id}")
        
        # Step 2: Verify task exists
        print(f"\nStep 2: Verifying task exists...")
        response = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=30)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Could not fetch tasks to verify")
            return False
        
        data = response.json()
        task_found = False
        
        if 'tasks' in data:
            for task in data['tasks']:
                if task.get('id') == created_task_id:
                    task_found = True
                    print(f"✓ Task found in list with title: '{task.get('title')}'")
                    break
        
        if not task_found:
            print(f"❌ FAILED: Created task not found in task list")
            return False
        
        # Step 3: Delete task
        print(f"\nStep 3: Deleting task...")
        response = requests.delete(
            f"{BASE_URL}/admin/tasks/{created_task_id}?key={ADMIN_KEY}",
            timeout=30
        )
        print(f"Delete status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        print(f"✓ Task deleted successfully")
        
        # Step 4: Verify task is gone
        print(f"\nStep 4: Verifying task is gone...")
        time.sleep(1)  # Brief wait to ensure deletion is processed
        
        response = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=30)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Could not fetch tasks to verify deletion")
            return False
        
        data = response.json()
        task_still_exists = False
        
        if 'tasks' in data:
            for task in data['tasks']:
                if task.get('id') == created_task_id:
                    task_still_exists = True
                    break
        
        if task_still_exists:
            print(f"❌ FAILED: Task still exists after deletion")
            return False
        
        print(f"✓ Task successfully removed from list")
        print(f"\n✓ T2 PASSED: Create and delete regression test successful")
        return True
        
    except Exception as e:
        print(f"❌ FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        
        # Cleanup attempt if task was created
        if created_task_id:
            print(f"\nAttempting cleanup of task {created_task_id}...")
            try:
                requests.delete(
                    f"{BASE_URL}/admin/tasks/{created_task_id}?key={ADMIN_KEY}",
                    timeout=30
                )
                print(f"✓ Cleanup successful")
            except:
                print(f"✗ Cleanup failed - manual cleanup may be needed")
        
        return False


def main():
    print("=" * 70)
    print("DigiHome Tasks-GET-Berikelse Backend Test")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    
    results = []
    
    # Run T1
    results.append(("T1: GET tasks with enriched attachments", test_t1_get_tasks_with_enriched_attachments()))
    
    # Run T2
    results.append(("T2: Regression - Create and Delete", test_t2_regression_create_and_delete()))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n✓ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n✗ {total - passed} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
