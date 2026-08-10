#!/usr/bin/env python3
"""
Backend test for DigiHome internal case management system ("Saker").
Tests Next.js API routes under /api/admin/tasks* and /api/admin/task-members*.

CRITICAL SAFETY RULES:
1. SendGrid is LIVE - always send "notify": false when POST/PUT tasks with assigneeId
2. DO NOT test success path on /remind (sends real email) - test ONLY error paths (400)
3. DO NOT touch other collections/endpoints
4. DO NOT run any scripts in /app/scripts
5. Clean up: delete ALL cases and persons created during test
"""

import requests
import json
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test data storage
created_members = []
created_tasks = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")

def test_auth():
    """A) Auth: Test authentication on all endpoints"""
    print("\n=== A) AUTH TESTS ===")
    
    # Test GET /admin/tasks without key
    try:
        r = requests.get(f"{BASE_URL}/admin/tasks", timeout=10)
        passed = r.status_code == 401
        log_test("GET /admin/tasks without key returns 401", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("GET /admin/tasks without key returns 401", False, f"Error: {e}")
    
    # Test GET /admin/tasks with key
    try:
        r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=10)
        passed = r.status_code == 200 and r.json().get('ok') == True
        data = r.json()
        has_tasks = 'tasks' in data
        has_members = 'members' in data
        has_today = 'today' in data
        log_test("GET /admin/tasks with key returns 200", passed and has_tasks and has_members and has_today, 
                f"Status: {r.status_code}, ok: {data.get('ok')}, has tasks: {has_tasks}, has members: {has_members}, has today: {has_today}")
    except Exception as e:
        log_test("GET /admin/tasks with key returns 200", False, f"Error: {e}")

def test_task_members():
    """B) Personer (task-members): CRUD operations"""
    print("\n=== B) TASK-MEMBERS TESTS ===")
    
    # POST create member 1
    try:
        payload = {"name": "Testperson QA"}
        r = requests.post(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 200 or r.status_code == 201
        data = r.json()
        if passed and data.get('ok') and 'member' in data:
            member = data['member']
            created_members.append(member['id'])
            has_id = 'id' in member
            has_name = member.get('name') == "Testperson QA"
            has_email = 'email' in member
            has_color = 'color' in member and member['color'].startswith('#')
            has_created = 'createdAt' in member
            log_test("POST /task-members creates member with auto-assigned color", 
                    has_id and has_name and has_email and has_color and has_created,
                    f"ID: {member.get('id')}, name: {member.get('name')}, color: {member.get('color')}")
        else:
            log_test("POST /task-members creates member", False, f"Status: {r.status_code}, response: {data}")
    except Exception as e:
        log_test("POST /task-members creates member", False, f"Error: {e}")
    
    # POST with empty name
    try:
        payload = {"name": ""}
        r = requests.post(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 400
        log_test("POST /task-members with empty name returns 400", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("POST /task-members with empty name returns 400", False, f"Error: {e}")
    
    # POST create member 2 with email
    try:
        payload = {"name": "Testperson QA2", "email": "QA2@Example.COM"}
        r = requests.post(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 200 or r.status_code == 201
        data = r.json()
        if passed and data.get('ok') and 'member' in data:
            member = data['member']
            created_members.append(member['id'])
            email_normalized = member.get('email') == "qa2@example.com"
            log_test("POST /task-members normalizes email to lowercase", email_normalized,
                    f"Email: {member.get('email')}")
        else:
            log_test("POST /task-members with email", False, f"Status: {r.status_code}")
    except Exception as e:
        log_test("POST /task-members with email", False, f"Error: {e}")
    
    # PUT update member
    if len(created_members) > 0:
        try:
            member_id = created_members[0]
            payload = {"name": "Nytt Navn", "email": "ny@example.com"}
            r = requests.put(f"{BASE_URL}/admin/task-members/{member_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'member' in data:
                member = data['member']
                name_updated = member.get('name') == "Nytt Navn"
                email_updated = member.get('email') == "ny@example.com"
                log_test("PUT /task-members/{id} updates member", name_updated and email_updated,
                        f"Name: {member.get('name')}, Email: {member.get('email')}")
            else:
                log_test("PUT /task-members/{id} updates member", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /task-members/{id} updates member", False, f"Error: {e}")
    
    # PUT with unknown id
    try:
        payload = {"name": "Test"}
        r = requests.put(f"{BASE_URL}/admin/task-members/unknown-id-xyz?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 404
        log_test("PUT /task-members with unknown id returns 404", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("PUT /task-members with unknown id returns 404", False, f"Error: {e}")
    
    # GET all members
    try:
        r = requests.get(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", timeout=10)
        passed = r.status_code == 200
        data = r.json()
        if passed:
            members = data.get('members', [])
            found_qa = any(m.get('name') == "Nytt Navn" for m in members)
            found_qa2 = any(m.get('name') == "Testperson QA2" for m in members)
            log_test("GET /task-members returns both test persons", found_qa and found_qa2,
                    f"Total members: {len(members)}, Found QA: {found_qa}, Found QA2: {found_qa2}")
        else:
            log_test("GET /task-members", False, f"Status: {r.status_code}")
    except Exception as e:
        log_test("GET /task-members", False, f"Error: {e}")

def test_tasks():
    """C) Saker (tasks): CRUD operations with activity tracking"""
    print("\n=== C) TASKS TESTS ===")
    
    # POST create task with all fields
    if len(created_members) > 0:
        try:
            person1_id = created_members[0]
            payload = {
                "title": "QA-sak 1",
                "description": "test",
                "priority": 1,
                "assigneeId": person1_id,
                "dueDate": "2026-01-01",
                "notify": False,  # CRITICAL: prevent email
                "actor": "QA-agent"
            }
            r = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200 or r.status_code == 201
            data = r.json()
            if passed and data.get('ok') and 'task' in data:
                task = data['task']
                created_tasks.append(task['id'])
                has_id = 'id' in task
                has_status = task.get('status') == 'inbox'
                has_activity = 'activity' in task and len(task['activity']) > 0
                has_completed_null = task.get('completedAt') is None
                emailed_false = task.get('emailed') == False
                log_test("POST /tasks creates task with default status inbox and activity", 
                        has_id and has_status and has_activity and has_completed_null and emailed_false,
                        f"ID: {task.get('id')}, status: {task.get('status')}, activity count: {len(task.get('activity', []))}, emailed: {task.get('emailed')}")
            else:
                log_test("POST /tasks creates task", False, f"Status: {r.status_code}, response: {data}")
        except Exception as e:
            log_test("POST /tasks creates task", False, f"Error: {e}")
    
    # POST without title
    try:
        payload = {"description": "test"}
        r = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 400
        log_test("POST /tasks without title returns 400", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("POST /tasks without title returns 400", False, f"Error: {e}")
    
    # POST with invalid dueDate
    try:
        payload = {
            "title": "QA-sak invalid date",
            "dueDate": "01.01.2026",  # Invalid format
            "actor": "QA-agent"
        }
        r = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 200 or r.status_code == 201
        data = r.json()
        if passed and 'task' in data:
            task = data['task']
            created_tasks.append(task['id'])
            due_date_null = task.get('dueDate') is None
            log_test("POST /tasks with invalid dueDate creates task with dueDate null", due_date_null,
                    f"dueDate: {task.get('dueDate')}")
        else:
            log_test("POST /tasks with invalid dueDate", False, f"Status: {r.status_code}")
    except Exception as e:
        log_test("POST /tasks with invalid dueDate", False, f"Error: {e}")
    
    # PUT update status to doing
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"status": "doing", "actor": "QA-agent"}
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                status_updated = task.get('status') == 'doing'
                has_activity = len(task.get('activity', [])) > 1
                log_test("PUT /tasks/{id} updates status and adds activity", status_updated and has_activity,
                        f"Status: {task.get('status')}, activity count: {len(task.get('activity', []))}")
            else:
                log_test("PUT /tasks/{id} updates status", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} updates status", False, f"Error: {e}")
    
    # PUT status to done (sets completedAt)
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"status": "done", "actor": "QA-agent"}
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                completed_set = task.get('completedAt') is not None
                log_test("PUT /tasks/{id} status=done sets completedAt", completed_set,
                        f"completedAt: {task.get('completedAt')}")
            else:
                log_test("PUT /tasks/{id} status=done", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} status=done", False, f"Error: {e}")
    
    # PUT status back to waiting (clears completedAt)
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"status": "waiting", "actor": "QA-agent"}
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                completed_null = task.get('completedAt') is None
                log_test("PUT /tasks/{id} status=waiting clears completedAt", completed_null,
                        f"completedAt: {task.get('completedAt')}")
            else:
                log_test("PUT /tasks/{id} status=waiting", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} status=waiting", False, f"Error: {e}")
    
    # PUT update priority
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"priority": 3, "actor": "QA-agent"}
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                priority_updated = task.get('priority') == 3
                log_test("PUT /tasks/{id} updates priority and adds activity", priority_updated,
                        f"Priority: {task.get('priority')}")
            else:
                log_test("PUT /tasks/{id} updates priority", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} updates priority", False, f"Error: {e}")
    
    # PUT remove dueDate
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"dueDate": None, "actor": "QA-agent"}
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                due_date_null = task.get('dueDate') is None
                log_test("PUT /tasks/{id} dueDate=null removes due date and adds activity", due_date_null,
                        f"dueDate: {task.get('dueDate')}")
            else:
                log_test("PUT /tasks/{id} dueDate=null", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} dueDate=null", False, f"Error: {e}")
    
    # PUT change assignee
    if len(created_tasks) > 0 and len(created_members) > 1:
        try:
            task_id = created_tasks[0]
            person2_id = created_members[1]
            payload = {"assigneeId": person2_id, "notify": False, "actor": "QA-agent"}  # CRITICAL: notify=false
            r = requests.put(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed and 'task' in data:
                task = data['task']
                assignee_updated = task.get('assigneeId') == person2_id
                emailed_false = task.get('emailed') == False
                log_test("PUT /tasks/{id} changes assignee and adds activity (emailed=false)", 
                        assignee_updated and emailed_false,
                        f"assigneeId: {task.get('assigneeId')}, emailed: {task.get('emailed')}")
            else:
                log_test("PUT /tasks/{id} changes assignee", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("PUT /tasks/{id} changes assignee", False, f"Error: {e}")
    
    # PUT with unknown id
    try:
        payload = {"status": "done"}
        r = requests.put(f"{BASE_URL}/admin/tasks/unknown-id-xyz?key={ADMIN_KEY}", json=payload, timeout=10)
        passed = r.status_code == 404
        log_test("PUT /tasks with unknown id returns 404", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("PUT /tasks with unknown id returns 404", False, f"Error: {e}")

def test_comments():
    """D) Kommentarer: Add comments to tasks"""
    print("\n=== D) COMMENTS TESTS ===")
    
    # POST add comment
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"text": "QA-kommentar", "author": "QA-agent"}
            r = requests.post(f"{BASE_URL}/admin/tasks/{task_id}/comments?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 200 or r.status_code == 201
            data = r.json()
            if passed and data.get('ok') and 'comment' in data:
                comment = data['comment']
                has_id = 'id' in comment
                has_author = comment.get('author') == "QA-agent"
                has_text = comment.get('text') == "QA-kommentar"
                has_at = 'at' in comment
                log_test("POST /tasks/{id}/comments adds comment", 
                        has_id and has_author and has_text and has_at,
                        f"Comment ID: {comment.get('id')}, author: {comment.get('author')}")
            else:
                log_test("POST /tasks/{id}/comments adds comment", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("POST /tasks/{id}/comments adds comment", False, f"Error: {e}")
    
    # POST with empty text
    if len(created_tasks) > 0:
        try:
            task_id = created_tasks[0]
            payload = {"text": "", "author": "QA-agent"}
            r = requests.post(f"{BASE_URL}/admin/tasks/{task_id}/comments?key={ADMIN_KEY}", json=payload, timeout=10)
            passed = r.status_code == 400
            log_test("POST /tasks/{id}/comments with empty text returns 400", passed, f"Status: {r.status_code}")
        except Exception as e:
            log_test("POST /tasks/{id}/comments with empty text returns 400", False, f"Error: {e}")
    
    # GET tasks and verify comment is included
    if len(created_tasks) > 0:
        try:
            r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=10)
            passed = r.status_code == 200
            data = r.json()
            if passed:
                tasks = data.get('tasks', [])
                task_id = created_tasks[0]
                task = next((t for t in tasks if t.get('id') == task_id), None)
                if task:
                    has_comments = 'comments' in task and len(task['comments']) > 0
                    comment_text = task['comments'][0].get('text') if has_comments else None
                    log_test("GET /tasks includes comment in task", 
                            has_comments and comment_text == "QA-kommentar",
                            f"Comments count: {len(task.get('comments', []))}, text: {comment_text}")
                else:
                    log_test("GET /tasks includes comment", False, "Task not found")
            else:
                log_test("GET /tasks includes comment", False, f"Status: {r.status_code}")
        except Exception as e:
            log_test("GET /tasks includes comment", False, f"Error: {e}")

def test_summary():
    """E) Summary: Badge endpoint with counts"""
    print("\n=== E) SUMMARY TESTS ===")
    
    # Create tasks with different due dates for summary test
    try:
        # Get today's date from the API
        r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=10)
        today = r.json().get('today', '2026-06-01')
        
        # Task with past due date
        payload1 = {
            "title": "QA-sak overdue",
            "dueDate": "2026-01-01",  # Past date
            "status": "inbox",
            "actor": "QA-agent"
        }
        r1 = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload1, timeout=10)
        if r1.status_code in [200, 201]:
            task1 = r1.json().get('task', {})
            created_tasks.append(task1.get('id'))
        
        # Task with today's due date
        payload2 = {
            "title": "QA-sak today",
            "dueDate": today,
            "status": "inbox",
            "actor": "QA-agent"
        }
        r2 = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload2, timeout=10)
        if r2.status_code in [200, 201]:
            task2 = r2.json().get('task', {})
            created_tasks.append(task2.get('id'))
        
        log_test("Created test tasks for summary", True, f"Today: {today}")
    except Exception as e:
        log_test("Created test tasks for summary", False, f"Error: {e}")
    
    # GET summary
    try:
        r = requests.get(f"{BASE_URL}/admin/tasks/summary?key={ADMIN_KEY}", timeout=10)
        passed = r.status_code == 200
        data = r.json()
        if passed and data.get('ok'):
            has_open = 'open' in data
            has_overdue = 'overdue' in data
            has_due_today = 'dueToday' in data
            open_count = data.get('open', 0)
            overdue_count = data.get('overdue', 0)
            due_today_count = data.get('dueToday', 0)
            log_test("GET /tasks/summary returns badge counts", 
                    has_open and has_overdue and has_due_today,
                    f"open: {open_count}, overdue: {overdue_count}, dueToday: {due_today_count}")
        else:
            log_test("GET /tasks/summary", False, f"Status: {r.status_code}")
    except Exception as e:
        log_test("GET /tasks/summary", False, f"Error: {e}")

def test_remind_errors():
    """F) Remind: Test ONLY error paths (DO NOT send real emails)"""
    print("\n=== F) REMIND ERROR TESTS ===")
    
    # Create task without assignee
    try:
        payload = {
            "title": "QA-sak no assignee",
            "description": "test",
            "actor": "QA-agent"
        }
        r = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload, timeout=10)
        if r.status_code in [200, 201]:
            task = r.json().get('task', {})
            task_id = task.get('id')
            created_tasks.append(task_id)
            
            # POST remind on task without assignee
            r2 = requests.post(f"{BASE_URL}/admin/tasks/{task_id}/remind?key={ADMIN_KEY}", json={}, timeout=10)
            passed = r2.status_code == 400
            error_msg = r2.json().get('error', '') if r2.status_code == 400 else ''
            has_correct_error = 'ingen ansvarlig' in error_msg.lower() or 'no assignee' in error_msg.lower()
            log_test("POST /tasks/{id}/remind without assignee returns 400", passed and has_correct_error,
                    f"Status: {r2.status_code}, error: {error_msg}")
        else:
            log_test("POST /tasks/{id}/remind without assignee", False, f"Failed to create task: {r.status_code}")
    except Exception as e:
        log_test("POST /tasks/{id}/remind without assignee", False, f"Error: {e}")
    
    # Create task with assignee but no email
    if len(created_members) > 0:
        try:
            # Find or create a member without email
            member_no_email_id = None
            r = requests.get(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                members = r.json().get('members', [])
                for m in members:
                    if not m.get('email') or m.get('email') == '':
                        member_no_email_id = m.get('id')
                        break
            
            if not member_no_email_id:
                # Create member without email
                payload_member = {"name": "QA No Email"}
                r_member = requests.post(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", json=payload_member, timeout=10)
                if r_member.status_code in [200, 201]:
                    member = r_member.json().get('member', {})
                    member_no_email_id = member.get('id')
                    created_members.append(member_no_email_id)
            
            if member_no_email_id:
                # Create task with this assignee
                payload_task = {
                    "title": "QA-sak assignee no email",
                    "assigneeId": member_no_email_id,
                    "notify": False,
                    "actor": "QA-agent"
                }
                r_task = requests.post(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", json=payload_task, timeout=10)
                if r_task.status_code in [200, 201]:
                    task = r_task.json().get('task', {})
                    task_id = task.get('id')
                    created_tasks.append(task_id)
                    
                    # POST remind on task with assignee without email
                    r_remind = requests.post(f"{BASE_URL}/admin/tasks/{task_id}/remind?key={ADMIN_KEY}", json={}, timeout=10)
                    passed = r_remind.status_code == 400
                    error_msg = r_remind.json().get('error', '') if r_remind.status_code == 400 else ''
                    has_correct_error = 'mangler e-post' in error_msg.lower() or 'no email' in error_msg.lower()
                    log_test("POST /tasks/{id}/remind with assignee without email returns 400", passed and has_correct_error,
                            f"Status: {r_remind.status_code}, error: {error_msg}")
                else:
                    log_test("POST /tasks/{id}/remind with assignee without email", False, f"Failed to create task: {r_task.status_code}")
            else:
                log_test("POST /tasks/{id}/remind with assignee without email", False, "Could not create member without email")
        except Exception as e:
            log_test("POST /tasks/{id}/remind with assignee without email", False, f"Error: {e}")
    
    # POST remind with unknown task id
    try:
        r = requests.post(f"{BASE_URL}/admin/tasks/unknown-id-xyz/remind?key={ADMIN_KEY}", json={}, timeout=10)
        passed = r.status_code == 404
        log_test("POST /tasks/{unknown-id}/remind returns 404", passed, f"Status: {r.status_code}")
    except Exception as e:
        log_test("POST /tasks/{unknown-id}/remind returns 404", False, f"Error: {e}")

def test_cleanup():
    """G) Cleanup: Delete all test data"""
    print("\n=== G) CLEANUP ===")
    
    # Delete all created tasks
    deleted_tasks = 0
    for task_id in created_tasks:
        try:
            r = requests.delete(f"{BASE_URL}/admin/tasks/{task_id}?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                deleted_tasks += 1
        except Exception as e:
            print(f"  Error deleting task {task_id}: {e}")
    
    log_test(f"Deleted {deleted_tasks}/{len(created_tasks)} tasks", deleted_tasks == len(created_tasks))
    
    # Verify tasks are deleted
    try:
        r = requests.get(f"{BASE_URL}/admin/tasks?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            tasks = r.json().get('tasks', [])
            remaining_qa_tasks = [t for t in tasks if 'QA' in t.get('title', '')]
            log_test("Verified all QA tasks deleted", len(remaining_qa_tasks) == 0,
                    f"Remaining QA tasks: {len(remaining_qa_tasks)}")
    except Exception as e:
        log_test("Verified tasks deleted", False, f"Error: {e}")
    
    # Delete all created members
    deleted_members = 0
    for member_id in created_members:
        try:
            r = requests.delete(f"{BASE_URL}/admin/task-members/{member_id}?key={ADMIN_KEY}", timeout=10)
            if r.status_code == 200:
                deleted_members += 1
        except Exception as e:
            print(f"  Error deleting member {member_id}: {e}")
    
    log_test(f"Deleted {deleted_members}/{len(created_members)} members", deleted_members == len(created_members))
    
    # Verify members are deleted
    try:
        r = requests.get(f"{BASE_URL}/admin/task-members?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            members = r.json().get('members', [])
            remaining_qa_members = [m for m in members if 'QA' in m.get('name', '') or 'Testperson' in m.get('name', '')]
            log_test("Verified all QA members deleted", len(remaining_qa_members) == 0,
                    f"Remaining QA members: {len(remaining_qa_members)}")
    except Exception as e:
        log_test("Verified members deleted", False, f"Error: {e}")

def main():
    """Run all tests"""
    print("=" * 80)
    print("BACKEND TEST: DigiHome Internal Case Management System (Saker)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print("=" * 80)
    
    try:
        test_auth()
        test_task_members()
        test_tasks()
        test_comments()
        test_summary()
        test_remind_errors()
        test_cleanup()
        
        print("\n" + "=" * 80)
        print("ALL TESTS COMPLETED")
        print("=" * 80)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        print("\nAttempting cleanup...")
        test_cleanup()

if __name__ == "__main__":
    main()
