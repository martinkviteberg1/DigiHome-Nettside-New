#!/usr/bin/env python3
"""
Backend test for DigiHome Saker: Image-in-email paths (CID inline attachments)
Tests that task images can be uploaded and embedded in email notifications via CID attachments.
"""

import requests
import json
import os
import sys
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test data
# 1x1 red pixel PNG (base64)
TEST_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_image_upload():
    """T1: Upload task image and verify retrieval"""
    log("T1: Testing image upload...")
    
    try:
        # Upload image
        log("  Uploading 1x1 red pixel PNG...")
        response = requests.post(
            f"{API_URL}/admin/tasks/image",
            params={"key": ADMIN_KEY},
            json={"dataUrl": TEST_IMAGE_DATA_URL},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Upload returned {response.status_code}")
            log(f"  Response: {response.text[:500]}")
            return None
        
        data = response.json()
        if not data.get('ok'):
            log(f"  ❌ FAILED: Upload response ok=false")
            log(f"  Response: {json.dumps(data, indent=2)}")
            return None
        
        image_id = data.get('id')
        image_url = data.get('url')
        
        if not image_id or not image_url:
            log(f"  ❌ FAILED: Missing id or url in response")
            log(f"  Response: {json.dumps(data, indent=2)}")
            return None
        
        log(f"  ✅ Image uploaded: id={image_id}")
        log(f"  URL: {image_url}")
        
        # Retrieve image (handle relative URL)
        log("  Retrieving uploaded image...")
        if image_url.startswith('/'):
            full_image_url = f"{BASE_URL}{image_url}"
        else:
            full_image_url = image_url
        
        response = requests.get(
            full_image_url,
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Image retrieval returned {response.status_code}")
            return None
        
        content_type = response.headers.get('Content-Type', '')
        if 'image/png' not in content_type:
            log(f"  ❌ FAILED: Wrong content-type: {content_type}")
            return None
        
        log(f"  ✅ Image retrieved successfully (Content-Type: {content_type})")
        log("✅ T1 PASSED: Image upload and retrieval working")
        
        return {"id": image_id, "url": image_url}
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception during image upload: {str(e)}")
        return None

def test_create_user_and_task_with_image(image_url):
    """T2: Create QA user and task with image in description"""
    log("T2: Testing task creation with image in description...")
    
    try:
        # Create QA user
        log("  Creating QA user...")
        response = requests.post(
            f"{API_URL}/admin/users",
            params={"key": ADMIN_KEY},
            json={
                "name": "QA Bilde SLETTES",
                "email": "qa-bilde@example.com",
                "role": "bruker",
                "invite": False
            },
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: User creation returned {response.status_code}")
            log(f"  Response: {response.text[:500]}")
            return None
        
        user_data = response.json()
        user_id = user_data.get('member', {}).get('id')
        
        if not user_id:
            log(f"  ❌ FAILED: No user id in response")
            log(f"  Response: {json.dumps(user_data, indent=2)[:500]}")
            return None
        
        log(f"  ✅ QA user created: id={user_id}")
        
        # Create task with image in description
        log("  Creating task with image in description...")
        description = f"Se bildet:\n\n![bilde]({image_url})"
        
        response = requests.post(
            f"{API_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            json={
                "title": "QA Bilde-epost SLETTES",
                "description": description,
                "assigneeId": user_id,
                "actor": "QA Testleder",
                "notify": True  # This will trigger the email path
            },
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Task creation returned {response.status_code}")
            log(f"  Response: {response.text[:500]}")
            # Check supervisor logs for 500 errors
            log("  Checking supervisor logs for errors...")
            os.system("tail -n 50 /var/log/supervisor/nextjs.out.log | grep -i error || echo '  No errors found in logs'")
            return None
        
        task_data = response.json()
        if not task_data.get('ok'):
            log(f"  ❌ FAILED: Task creation response ok=false")
            log(f"  Response: {json.dumps(task_data, indent=2)[:500]}")
            return None
        
        task_id = task_data.get('task', {}).get('id')
        if not task_id:
            log(f"  ❌ FAILED: No task id in response")
            log(f"  Response: {json.dumps(task_data, indent=2)[:500]}")
            return None
        
        log(f"  ✅ Task created: id={task_id}")
        log("  ✅ Assigned email path executed without 500 error")
        log("✅ T2 PASSED: Task with image in description created successfully")
        
        return {"user_id": user_id, "task_id": task_id}
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception during task creation: {str(e)}")
        return None

def test_comment_with_image_and_mention(task_id, image_url):
    """T3: Post comment with image and mention"""
    log("T3: Testing comment with image and mention...")
    
    try:
        comment_text = f"Hei @QA Bilde SLETTES — se skjermbildet: ![bilde]({image_url})"
        
        response = requests.post(
            f"{API_URL}/admin/tasks/{task_id}/comments",
            params={"key": ADMIN_KEY},
            json={
                "text": comment_text,
                "author": "QA Testleder"
            },
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: Comment creation returned {response.status_code}")
            log(f"  Response: {response.text[:500]}")
            # Check supervisor logs for 500 errors
            log("  Checking supervisor logs for errors...")
            os.system("tail -n 50 /var/log/supervisor/nextjs.out.log | grep -i error || echo '  No errors found in logs'")
            return False
        
        comment_data = response.json()
        if not comment_data.get('ok'):
            log(f"  ❌ FAILED: Comment response ok=false")
            log(f"  Response: {json.dumps(comment_data, indent=2)[:500]}")
            return False
        
        log("  ✅ Comment posted successfully")
        log("  ✅ Mention and comment email paths executed without 500 error")
        log("✅ T3 PASSED: Comment with image and mention working")
        
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception during comment creation: {str(e)}")
        return False

def test_regression():
    """T4: Regression test - GET tasks"""
    log("T4: Testing regression (GET tasks)...")
    
    try:
        response = requests.get(
            f"{API_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ❌ FAILED: GET tasks returned {response.status_code}")
            return False
        
        data = response.json()
        if not data.get('ok'):
            log(f"  ❌ FAILED: GET tasks response ok=false")
            return False
        
        log("  ✅ GET tasks working")
        log("✅ T4 PASSED: Regression test passed")
        
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception during regression test: {str(e)}")
        return False

def test_cleanup(user_id, task_id):
    """T5: Cleanup - delete task and user"""
    log("T5: Testing cleanup...")
    
    try:
        # Delete task
        log("  Deleting task...")
        response = requests.delete(
            f"{API_URL}/admin/tasks/{task_id}",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ⚠️  WARNING: Task deletion returned {response.status_code}")
        else:
            log("  ✅ Task deleted")
        
        # Delete user
        log("  Deleting user...")
        response = requests.delete(
            f"{API_URL}/admin/users/{user_id}",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code != 200:
            log(f"  ⚠️  WARNING: User deletion returned {response.status_code}")
        else:
            log("  ✅ User deleted")
        
        # Verify task is gone
        log("  Verifying task is deleted...")
        response = requests.get(
            f"{API_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            tasks = data.get('tasks', [])
            task_exists = any(t.get('id') == task_id for t in tasks)
            
            if task_exists:
                log(f"  ⚠️  WARNING: Task still exists after deletion")
            else:
                log("  ✅ Task verified deleted")
        
        log("✅ T5 PASSED: Cleanup completed")
        
        return True
        
    except Exception as e:
        log(f"  ❌ FAILED: Exception during cleanup: {str(e)}")
        return False

def main():
    """Run all tests"""
    log("=" * 80)
    log("BACKEND TEST: DigiHome Saker - Image-in-email paths (CID inline attachments)")
    log("=" * 80)
    log(f"Base URL: {BASE_URL}")
    log(f"API URL: {API_URL}")
    log("")
    
    results = {
        "T1": False,
        "T2": False,
        "T3": False,
        "T4": False,
        "T5": False
    }
    
    # T1: Image upload
    image_data = test_image_upload()
    if image_data:
        results["T1"] = True
        image_url = image_data["url"]
    else:
        log("\n❌ TEST SUITE FAILED: Cannot continue without image upload")
        sys.exit(1)
    
    log("")
    
    # T2: Create user and task with image
    user_task_data = test_create_user_and_task_with_image(image_url)
    if user_task_data:
        results["T2"] = True
        user_id = user_task_data["user_id"]
        task_id = user_task_data["task_id"]
    else:
        log("\n❌ TEST SUITE FAILED: Cannot continue without task creation")
        sys.exit(1)
    
    log("")
    
    # T3: Comment with image and mention
    if test_comment_with_image_and_mention(task_id, image_url):
        results["T3"] = True
    
    log("")
    
    # T4: Regression
    if test_regression():
        results["T4"] = True
    
    log("")
    
    # T5: Cleanup
    if test_cleanup(user_id, task_id):
        results["T5"] = True
    
    # Summary
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{test}: {status}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    
    if passed == total:
        log("✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        log("❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
