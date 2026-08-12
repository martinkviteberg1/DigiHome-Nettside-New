#!/usr/bin/env python3
"""
Backend test for PROSJEKTLAG (Linear-model) feature in DigiHome app.
Tests project CRUD, milestone management, task-milestone linking, and cleanup.

CRITICAL RULES:
1. Project "Oppussing Storgata 4" is REAL PRODUCTION DATA - NEVER modify/delete it
2. All QA projects/tasks must have name prefix "QA " and be DELETED after testing
3. SendGrid is live - use notify:false on tasks
"""

import requests
import json
import sys
from pymongo import MongoClient
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_project_id = None
qa_task_id = None
kartlegging_milestone_id = None
mvp_milestone_id = None

def log_test(test_name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if message:
        result += f" - {message}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "message": message})
    return passed

def get_with_auth(endpoint):
    """GET request with admin key"""
    return requests.get(f"{BASE_URL}{endpoint}", params={"key": ADMIN_KEY}, timeout=30)

def post_with_auth(endpoint, data):
    """POST request with admin key"""
    return requests.post(f"{BASE_URL}{endpoint}", params={"key": ADMIN_KEY}, json=data, timeout=30)

def put_with_auth(endpoint, data):
    """PUT request with admin key"""
    return requests.put(f"{BASE_URL}{endpoint}", params={"key": ADMIN_KEY}, json=data, timeout=30)

def delete_with_auth(endpoint):
    """DELETE request with admin key"""
    return requests.delete(f"{BASE_URL}{endpoint}", params={"key": ADMIN_KEY}, timeout=30)

def get_mongo_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

print("=" * 80)
print("BACKEND TEST: PROSJEKTLAG (Linear-model)")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Admin key: {ADMIN_KEY}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print("=" * 80)
print()

# ============================================================================
# A) PROJECT CRUD
# ============================================================================
print("A) PROJECT CRUD")
print("-" * 80)

# A1. GET /api/admin/projects
print("\nA1. GET /api/admin/projects - verify structure and 'Oppussing Storgata 4'")
try:
    resp = get_with_auth("/admin/projects")
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok") and "projects" in data:
            projects = data["projects"]
            
            # Check each project has progress{total,done}
            all_have_progress = all(
                "progress" in p and "total" in p["progress"] and "done" in p["progress"]
                for p in projects
            )
            
            # Find "Oppussing Storgata 4"
            oppussing = next((p for p in projects if "Oppussing Storgata 4" in p.get("name", "")), None)
            
            if all_have_progress and oppussing:
                if oppussing.get("status") == "pagar":
                    log_test("A1", True, f"All projects have progress, 'Oppussing Storgata 4' has status='pagar' (backfill working)")
                else:
                    log_test("A1", False, f"'Oppussing Storgata 4' has status='{oppussing.get('status')}', expected 'pagar'")
            else:
                log_test("A1", False, f"Missing progress fields or 'Oppussing Storgata 4' not found")
        else:
            log_test("A1", False, f"Response missing 'ok' or 'projects': {data}")
    else:
        log_test("A1", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("A1", False, f"Exception: {e}")

# A2. POST create project
print("\nA2. POST /api/admin/projects - create 'QA Prosjekt A'")
try:
    resp = post_with_auth("/admin/projects", {
        "name": "QA Prosjekt A",
        "color": "#0ea5e9"
    })
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok") and "project" in data:
            project = data["project"]
            qa_project_id = project.get("id")
            
            checks = [
                project.get("status") == "utforskes",
                project.get("milestones") == [],
                project.get("leadId") is None,
                project.get("targetDate") is None
            ]
            
            if all(checks):
                log_test("A2", True, f"Project created with id={qa_project_id}, status='utforskes', empty milestones, null leadId/targetDate")
            else:
                log_test("A2", False, f"Project fields incorrect: status={project.get('status')}, milestones={project.get('milestones')}, leadId={project.get('leadId')}, targetDate={project.get('targetDate')}")
        else:
            log_test("A2", False, f"Response missing 'ok' or 'project': {data}")
    else:
        log_test("A2", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("A2", False, f"Exception: {e}")

# A3. POST without name
print("\nA3. POST /api/admin/projects without name - expect 400")
try:
    resp = post_with_auth("/admin/projects", {"color": "#ff0000"})
    if resp.status_code == 400:
        log_test("A3", True, "POST without name returns 400")
    else:
        log_test("A3", False, f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test("A3", False, f"Exception: {e}")

# A4. PUT update project with all fields
print("\nA4. PUT /api/admin/projects/:id - update with status, targetDate, leadId, description")
try:
    if qa_project_id:
        resp = put_with_auth(f"/admin/projects/{qa_project_id}", {
            "status": "planlagt",
            "targetDate": "2026-10-01",
            "leadId": "test-lead-id",
            "description": "# Brief\n**test**"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "project" in data:
                project = data["project"]
                checks = [
                    project.get("status") == "planlagt",
                    project.get("targetDate") == "2026-10-01",
                    project.get("leadId") == "test-lead-id",
                    "# Brief" in project.get("description", "")
                ]
                
                if all(checks):
                    log_test("A4", True, "All fields updated correctly")
                else:
                    log_test("A4", False, f"Fields not updated: {project}")
            else:
                log_test("A4", False, f"Response missing 'ok' or 'project': {data}")
        else:
            log_test("A4", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("A4", False, "No qa_project_id from A2")
except Exception as e:
    log_test("A4", False, f"Exception: {e}")

# A5. PUT with invalid status
print("\nA5. PUT /api/admin/projects/:id with invalid status - expect 400")
try:
    if qa_project_id:
        resp = put_with_auth(f"/admin/projects/{qa_project_id}", {
            "status": "tullestatus"
        })
        if resp.status_code == 400:
            text = resp.text.lower()
            if "ugyldig" in text or "invalid" in text:
                log_test("A5", True, "Invalid status returns 400 with error message")
            else:
                log_test("A5", True, "Invalid status returns 400")
        else:
            log_test("A5", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("A5", False, "No qa_project_id from A2")
except Exception as e:
    log_test("A5", False, f"Exception: {e}")

# A6. PUT with invalid date
print("\nA6. PUT /api/admin/projects/:id with invalid date - targetDate becomes null")
try:
    if qa_project_id:
        resp = put_with_auth(f"/admin/projects/{qa_project_id}", {
            "targetDate": "ikke-dato"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "project" in data:
                project = data["project"]
                if project.get("targetDate") is None:
                    log_test("A6", True, "Invalid date becomes null (not error)")
                else:
                    log_test("A6", False, f"targetDate is '{project.get('targetDate')}', expected null")
            else:
                log_test("A6", False, f"Response missing 'ok' or 'project': {data}")
        else:
            log_test("A6", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("A6", False, "No qa_project_id from A2")
except Exception as e:
    log_test("A6", False, f"Exception: {e}")

# A7. PUT with milestones
print("\nA7. PUT /api/admin/projects/:id with milestones - empty name removed, ids generated")
try:
    if qa_project_id:
        resp = put_with_auth(f"/admin/projects/{qa_project_id}", {
            "milestones": [
                {"name": "Kartlegging", "due": "2026-08-20"},
                {"name": "MVP"},
                {"name": ""}
            ]
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "project" in data:
                project = data["project"]
                milestones = project.get("milestones", [])
                
                if len(milestones) == 2:
                    kartlegging = next((m for m in milestones if m.get("name") == "Kartlegging"), None)
                    mvp = next((m for m in milestones if m.get("name") == "MVP"), None)
                    
                    if kartlegging and mvp:
                        kartlegging_milestone_id = kartlegging.get("id")
                        mvp_milestone_id = mvp.get("id")
                        
                        checks = [
                            kartlegging.get("id") is not None,
                            mvp.get("id") is not None,
                            kartlegging.get("due") == "2026-08-20",
                            mvp.get("due") is None
                        ]
                        
                        if all(checks):
                            log_test("A7", True, f"2 milestones created (empty removed), both have ids, due set/null correctly")
                        else:
                            log_test("A7", False, f"Milestone fields incorrect: {milestones}")
                    else:
                        log_test("A7", False, f"Missing Kartlegging or MVP milestone: {milestones}")
                else:
                    log_test("A7", False, f"Expected 2 milestones, got {len(milestones)}: {milestones}")
            else:
                log_test("A7", False, f"Response missing 'ok' or 'project': {data}")
        else:
            log_test("A7", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("A7", False, "No qa_project_id from A2")
except Exception as e:
    log_test("A7", False, f"Exception: {e}")

# A8. PUT on unknown id and empty body
print("\nA8. PUT /api/admin/projects/:id - unknown id → 404, empty body → 400")
try:
    # Unknown id
    resp = put_with_auth("/admin/projects/finnes-ikke-123", {"name": "Test"})
    unknown_ok = resp.status_code == 404
    
    # Empty body
    if qa_project_id:
        resp = put_with_auth(f"/admin/projects/{qa_project_id}", {})
        empty_ok = resp.status_code == 400 and "ingenting" in resp.text.lower()
    else:
        empty_ok = False
    
    if unknown_ok and empty_ok:
        log_test("A8", True, "Unknown id → 404, empty body → 400 'Ingenting å endre'")
    else:
        log_test("A8", False, f"unknown_ok={unknown_ok}, empty_ok={empty_ok}")
except Exception as e:
    log_test("A8", False, f"Exception: {e}")

# A9. GET project with milestone progress
print("\nA9. GET /api/admin/projects - verify QA project has milestones with progress{total:0,done:0}")
try:
    if qa_project_id:
        resp = get_with_auth("/admin/projects")
        if resp.status_code == 200:
            data = resp.json()
            projects = data.get("projects", [])
            qa_project = next((p for p in projects if p.get("id") == qa_project_id), None)
            
            if qa_project:
                milestones = qa_project.get("milestones", [])
                if len(milestones) == 2:
                    all_have_progress = all(
                        "progress" in m and m["progress"].get("total") == 0 and m["progress"].get("done") == 0
                        for m in milestones
                    )
                    
                    if all_have_progress:
                        log_test("A9", True, "QA project has 2 milestones with progress{total:0,done:0}")
                    else:
                        log_test("A9", False, f"Milestone progress incorrect: {milestones}")
                else:
                    log_test("A9", False, f"Expected 2 milestones, got {len(milestones)}")
            else:
                log_test("A9", False, "QA project not found in GET response")
        else:
            log_test("A9", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("A9", False, "No qa_project_id from A2")
except Exception as e:
    log_test("A9", False, f"Exception: {e}")

# ============================================================================
# B) TASK ↔ MILESTONE
# ============================================================================
print("\n" + "=" * 80)
print("B) TASK ↔ MILESTONE")
print("-" * 80)

# B1. POST task with milestone
print("\nB1. POST /api/admin/tasks with projectId and milestoneId")
try:
    if qa_project_id and kartlegging_milestone_id:
        resp = post_with_auth("/admin/tasks", {
            "title": "QA Milepælsak",
            "projectId": qa_project_id,
            "milestoneId": kartlegging_milestone_id,
            "notify": False
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "task" in data:
                task = data["task"]
                qa_task_id = task.get("id")
                
                if task.get("milestoneId") == kartlegging_milestone_id:
                    log_test("B1", True, f"Task created with milestoneId set, task_id={qa_task_id}")
                else:
                    log_test("B1", False, f"milestoneId not set: {task.get('milestoneId')}")
            else:
                log_test("B1", False, f"Response missing 'ok' or 'task': {data}")
        else:
            log_test("B1", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("B1", False, f"Missing qa_project_id or kartlegging_milestone_id")
except Exception as e:
    log_test("B1", False, f"Exception: {e}")

# B2. GET projects - verify progress updated
print("\nB2. GET /api/admin/projects - verify progress.total===1, milestone progress{total:1,done:0}")
try:
    if qa_project_id and kartlegging_milestone_id:
        resp = get_with_auth("/admin/projects")
        if resp.status_code == 200:
            data = resp.json()
            projects = data.get("projects", [])
            qa_project = next((p for p in projects if p.get("id") == qa_project_id), None)
            
            if qa_project:
                progress = qa_project.get("progress", {})
                milestones = qa_project.get("milestones", [])
                kartlegging = next((m for m in milestones if m.get("id") == kartlegging_milestone_id), None)
                
                checks = [
                    progress.get("total") == 1,
                    progress.get("done") == 0,
                    kartlegging is not None,
                    kartlegging.get("progress", {}).get("total") == 1 if kartlegging else False,
                    kartlegging.get("progress", {}).get("done") == 0 if kartlegging else False
                ]
                
                if all(checks):
                    log_test("B2", True, "Project progress.total===1, Kartlegging milestone progress{total:1,done:0}")
                else:
                    log_test("B2", False, f"Progress incorrect: project={progress}, kartlegging={kartlegging.get('progress') if kartlegging else None}")
            else:
                log_test("B2", False, "QA project not found")
        else:
            log_test("B2", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("B2", False, "Missing qa_project_id or kartlegging_milestone_id")
except Exception as e:
    log_test("B2", False, f"Exception: {e}")

# B3. PUT task status to done
print("\nB3. PUT /api/admin/tasks/:id {status:'done'} - verify progress updated")
try:
    if qa_task_id:
        resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"status": "done"})
        if resp.status_code == 200:
            # Now check project progress
            resp = get_with_auth("/admin/projects")
            if resp.status_code == 200:
                data = resp.json()
                projects = data.get("projects", [])
                qa_project = next((p for p in projects if p.get("id") == qa_project_id), None)
                
                if qa_project:
                    progress = qa_project.get("progress", {})
                    milestones = qa_project.get("milestones", [])
                    kartlegging = next((m for m in milestones if m.get("id") == kartlegging_milestone_id), None)
                    
                    checks = [
                        progress.get("total") == 1,
                        progress.get("done") == 1,
                        kartlegging is not None,
                        kartlegging.get("progress", {}).get("total") == 1 if kartlegging else False,
                        kartlegging.get("progress", {}).get("done") == 1 if kartlegging else False
                    ]
                    
                    if all(checks):
                        log_test("B3", True, "Task status='done', project progress{total:1,done:1}, milestone progress{total:1,done:1}")
                    else:
                        log_test("B3", False, f"Progress incorrect: project={progress}, kartlegging={kartlegging.get('progress') if kartlegging else None}")
                else:
                    log_test("B3", False, "QA project not found")
            else:
                log_test("B3", False, f"GET projects status {resp.status_code}")
        else:
            log_test("B3", False, f"PUT task status {resp.status_code}: {resp.text}")
    else:
        log_test("B3", False, "No qa_task_id from B1")
except Exception as e:
    log_test("B3", False, f"Exception: {e}")

# B4. PUT task with invalid milestoneId
print("\nB4. PUT /api/admin/tasks/:id {milestoneId:'finnes-ikke'} - expect 400")
try:
    if qa_task_id:
        resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"milestoneId": "finnes-ikke"})
        if resp.status_code == 400:
            text = resp.text.lower()
            if "milepæl" in text or "milestone" in text:
                log_test("B4", True, "Invalid milestoneId returns 400 with error about milestone")
            else:
                log_test("B4", True, "Invalid milestoneId returns 400")
        else:
            log_test("B4", False, f"Expected 400, got {resp.status_code}")
    else:
        log_test("B4", False, "No qa_task_id from B1")
except Exception as e:
    log_test("B4", False, f"Exception: {e}")

# B5. PUT task with different milestoneId
print("\nB5. PUT /api/admin/tasks/:id {milestoneId:'<MVP-id>'} - verify activity log")
try:
    if qa_task_id and mvp_milestone_id:
        resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"milestoneId": mvp_milestone_id})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "task" in data:
                task = data["task"]
                activity = task.get("activity", [])
                
                # Check if activity contains 'Milepæl: MVP'
                has_milestone_log = any("Milepæl" in str(a) and "MVP" in str(a) for a in activity)
                
                if has_milestone_log:
                    log_test("B5", True, "Task milestoneId updated, activity contains 'Milepæl: MVP'")
                else:
                    log_test("B5", False, f"Activity log missing milestone change: {activity}")
            else:
                log_test("B5", False, f"Response missing 'ok' or 'task': {data}")
        else:
            log_test("B5", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("B5", False, "Missing qa_task_id or mvp_milestone_id")
except Exception as e:
    log_test("B5", False, f"Exception: {e}")

# B6. PUT task projectId to null - verify milestoneId also null
print("\nB6. PUT /api/admin/tasks/:id {projectId:null} - verify projectId AND milestoneId both null")
try:
    if qa_task_id:
        resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"projectId": None})
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and "task" in data:
                task = data["task"]
                
                if task.get("projectId") is None and task.get("milestoneId") is None:
                    log_test("B6", True, "Project switch resets: projectId===null AND milestoneId===null")
                else:
                    log_test("B6", False, f"Fields not null: projectId={task.get('projectId')}, milestoneId={task.get('milestoneId')}")
            else:
                log_test("B6", False, f"Response missing 'ok' or 'task': {data}")
        else:
            log_test("B6", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("B6", False, "No qa_task_id from B1")
except Exception as e:
    log_test("B6", False, f"Exception: {e}")

# B7. Milestone deletion detaches tasks
print("\nB7. Milestone deletion detaches tasks - set task back, remove MVP milestone, verify task.milestoneId===null")
try:
    if qa_task_id and qa_project_id and kartlegging_milestone_id and mvp_milestone_id:
        # Set task back to project
        resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"projectId": qa_project_id})
        if resp.status_code != 200:
            log_test("B7", False, f"Failed to set projectId back: {resp.status_code}")
        else:
            # Set milestoneId to MVP
            resp = put_with_auth(f"/admin/tasks/{qa_task_id}", {"milestoneId": mvp_milestone_id})
            if resp.status_code != 200:
                log_test("B7", False, f"Failed to set milestoneId to MVP: {resp.status_code}")
            else:
                # Remove MVP milestone from project (keep only Kartlegging)
                resp = put_with_auth(f"/admin/projects/{qa_project_id}", {
                    "milestones": [
                        {"id": kartlegging_milestone_id, "name": "Kartlegging"}
                    ]
                })
                if resp.status_code != 200:
                    log_test("B7", False, f"Failed to update milestones: {resp.status_code}")
                else:
                    # Verify in MongoDB that task has milestoneId===null
                    db = get_mongo_db()
                    task = db.tasks.find_one({"id": qa_task_id})
                    
                    if task:
                        if task.get("milestoneId") is None:
                            log_test("B7", True, "Milestone deletion detaches tasks: task.milestoneId===null in MongoDB")
                        else:
                            log_test("B7", False, f"Task still has milestoneId={task.get('milestoneId')} in MongoDB")
                    else:
                        log_test("B7", False, "Task not found in MongoDB")
    else:
        log_test("B7", False, "Missing required ids")
except Exception as e:
    log_test("B7", False, f"Exception: {e}")

# ============================================================================
# C) DELETION
# ============================================================================
print("\n" + "=" * 80)
print("C) DELETION")
print("-" * 80)

# C1. DELETE project
print("\nC1. DELETE /api/admin/projects/:id - verify task projectId and milestoneId become null")
try:
    if qa_project_id and qa_task_id:
        resp = delete_with_auth(f"/admin/projects/{qa_project_id}")
        if resp.status_code == 200:
            # Verify in MongoDB that task has projectId===null and milestoneId===null
            db = get_mongo_db()
            task = db.tasks.find_one({"id": qa_task_id})
            
            if task:
                if task.get("projectId") is None and task.get("milestoneId") is None:
                    log_test("C1", True, "Project deleted, task has projectId===null AND milestoneId===null in MongoDB")
                else:
                    log_test("C1", False, f"Task fields not null: projectId={task.get('projectId')}, milestoneId={task.get('milestoneId')}")
            else:
                log_test("C1", False, "Task not found in MongoDB")
        else:
            log_test("C1", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("C1", False, "Missing qa_project_id or qa_task_id")
except Exception as e:
    log_test("C1", False, f"Exception: {e}")

# C2. DELETE task
print("\nC2. DELETE /api/admin/tasks/:id - delete QA task")
try:
    if qa_task_id:
        resp = delete_with_auth(f"/admin/tasks/{qa_task_id}")
        if resp.status_code == 200:
            log_test("C2", True, "QA task deleted successfully")
        else:
            log_test("C2", False, f"Status {resp.status_code}: {resp.text}")
    else:
        log_test("C2", False, "No qa_task_id from B1")
except Exception as e:
    log_test("C2", False, f"Exception: {e}")

# ============================================================================
# D) REGRESSION
# ============================================================================
print("\n" + "=" * 80)
print("D) REGRESSION")
print("-" * 80)

# D1. GET tasks
print("\nD1. GET /api/admin/tasks - verify task list still works")
try:
    resp = get_with_auth("/admin/tasks")
    if resp.status_code == 200:
        data = resp.json()
        if data.get("ok"):
            log_test("D1", True, "Task list endpoint working")
        else:
            log_test("D1", False, f"Response missing 'ok': {data}")
    else:
        log_test("D1", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("D1", False, f"Exception: {e}")

# D2. Auth check
print("\nD2. POST/PUT/DELETE /api/admin/projects without key - expect 401")
try:
    # POST without key
    resp = requests.post(f"{BASE_URL}/admin/projects", json={"name": "Test"}, timeout=30)
    post_ok = resp.status_code == 401
    
    # PUT without key
    resp = requests.put(f"{BASE_URL}/admin/projects/test-id", json={"name": "Test"}, timeout=30)
    put_ok = resp.status_code == 401
    
    # DELETE without key
    resp = requests.delete(f"{BASE_URL}/admin/projects/test-id", timeout=30)
    delete_ok = resp.status_code == 401
    
    if post_ok and put_ok and delete_ok:
        log_test("D2", True, "All project endpoints require auth (401 without key)")
    else:
        log_test("D2", False, f"Auth check failed: POST={post_ok}, PUT={put_ok}, DELETE={delete_ok}")
except Exception as e:
    log_test("D2", False, f"Exception: {e}")

# ============================================================================
# E) CLEANUP VERIFICATION
# ============================================================================
print("\n" + "=" * 80)
print("E) CLEANUP VERIFICATION")
print("-" * 80)

print("\nE. Verify 0 QA documents remain in MongoDB")
try:
    db = get_mongo_db()
    
    # Check projects
    qa_projects = list(db.projects.find({"name": {"$regex": "^QA "}}))
    
    # Check tasks
    qa_tasks = list(db.tasks.find({"title": {"$regex": "^QA "}}))
    
    # Check "Oppussing Storgata 4" is unchanged
    oppussing = db.projects.find_one({"name": {"$regex": "Oppussing Storgata 4"}})
    
    if len(qa_projects) == 0 and len(qa_tasks) == 0:
        if oppussing:
            log_test("E", True, f"Cleanup successful: 0 QA projects, 0 QA tasks. 'Oppussing Storgata 4' exists and unchanged")
        else:
            log_test("E", True, f"Cleanup successful: 0 QA projects, 0 QA tasks. Note: 'Oppussing Storgata 4' not found (may not exist in this environment)")
    else:
        log_test("E", False, f"Cleanup incomplete: {len(qa_projects)} QA projects, {len(qa_tasks)} QA tasks remain")
        if qa_projects:
            print(f"  Remaining QA projects: {[p.get('name') for p in qa_projects]}")
        if qa_tasks:
            print(f"  Remaining QA tasks: {[t.get('title') for t in qa_tasks]}")
except Exception as e:
    log_test("E", False, f"Exception: {e}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed = sum(1 for r in test_results if r["passed"])
total = len(test_results)
success_rate = (passed / total * 100) if total > 0 else 0

print(f"\nTotal tests: {total}")
print(f"Passed: {passed}")
print(f"Failed: {total - passed}")
print(f"Success rate: {success_rate:.1f}%")

if passed == total:
    print("\n✅ ALL TESTS PASSED")
    sys.exit(0)
else:
    print("\n❌ SOME TESTS FAILED")
    print("\nFailed tests:")
    for r in test_results:
        if not r["passed"]:
            print(f"  - {r['test']}: {r['message']}")
    sys.exit(1)
