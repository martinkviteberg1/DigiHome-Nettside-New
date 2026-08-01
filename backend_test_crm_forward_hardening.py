#!/usr/bin/env python3
"""
CRM-Forward Hardening Test — Produksjonsbug: Odin/Mussie false-positive recovery

Tests the new CRM-forward hardening that prevents legacy false-positive forwarded=true
status when leads are missing from the app CRM. This simulates the Odin/Mussie case
where forwarded=true was set on the marketing site but platform_id was null.

CRITICAL SAFETY RULES:
1. Do NOT call production endpoints (digihome.no/app.digihome.no)
2. Do NOT send real emails/CAPI
3. Do NOT call public POST /api/leads or /api/tenants
4. Use preview/local API with admin key
5. Create QA tenant DIRECTLY in MongoDB
6. MANDATORY cleanup: delete all QA documents
7. Verify baseline counts before and after
"""

import requests
import json
import time
from pymongo import MongoClient

# Configuration from /app/.env and /app/memory/test_credentials.md
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test data prefix for easy identification and cleanup
QA_PREFIX = "qa-receipt-"

def print_test(msg):
    print(f"\n{'='*80}\n{msg}\n{'='*80}")

def print_result(test_name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# ============================================================================
# STEP 1: Baseline counts (do not modify existing documents)
# ============================================================================
print_test("STEP 1: Take baseline counts")

baseline_leads = db.leads.count_documents({})
baseline_tenant_leads = db.tenant_leads.count_documents({})
baseline_imported_leads = db.imported_leads.count_documents({})

print(f"Baseline counts:")
print(f"  leads: {baseline_leads}")
print(f"  tenant_leads: {baseline_tenant_leads}")
print(f"  imported_leads: {baseline_imported_leads}")

print_result("Baseline counts captured", True, 
             f"leads={baseline_leads}, tenant_leads={baseline_tenant_leads}, imported_leads={baseline_imported_leads}")

# ============================================================================
# STEP 2: Create QA tenant simulating Odin/Mussie legacy false-positive
# ============================================================================
print_test("STEP 2: Create QA tenant DIRECTLY in MongoDB (simulates legacy false-positive)")

qa_tenant_id = f"{QA_PREFIX}odin-mussie-sim"
qa_tenant = {
    "id": qa_tenant_id,
    "name": "QA Receipt Test (Odin/Mussie Simulation)",
    "email": "qa-receipt-test@example.test",
    "phone": "+4799999999",
    "preferred_area": "Bergen sentrum",
    "bedrooms": 2,
    "budget_max": 15000,
    "status": "new",
    "source": "qa-test",
    "lead_type": "leietaker",
    "createdAt": "2026-01-15T10:00:00.000Z",
    # Legacy false-positive state (Odin/Mussie case):
    "forwarded": True,  # ❌ FALSE POSITIVE
    "platform_id": None,  # ❌ Missing CRM ID
    "forward_verified": False,
    "next_retry_at": None,
    "self_service": False,
    "forward_attempts": 0,
}

# Insert directly into MongoDB
result = db.tenant_leads.insert_one(qa_tenant)
print(f"Inserted QA tenant: {qa_tenant_id}")
print(f"  forwarded: True (legacy false-positive)")
print(f"  platform_id: None (missing in CRM)")
print(f"  forward_verified: False")

print_result("QA tenant created", result.inserted_id is not None, 
             f"id={qa_tenant_id}, forwarded=True (false-positive), platform_id=None")

# ============================================================================
# STEP 3: Call POST /api/admin/forward (expect self-loop detection)
# ============================================================================
print_test("STEP 3: POST /api/admin/forward (expect self-loop to be blocked)")

response = requests.post(
    f"{BASE_URL}/admin/forward",
    params={"key": ADMIN_KEY},
    json={},
    timeout=30
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Verify response
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
data = response.json()
assert data.get("success") == True, "Expected success=true"

print_result("POST /admin/forward", response.status_code == 200, 
             f"success={data.get('success')}, results={data.get('results')}")

# Wait a moment for the forward to complete
time.sleep(2)

# Verify QA tenant state after forward attempt
tenant_after_forward = db.tenant_leads.find_one({"id": qa_tenant_id})
print(f"\nQA tenant state after forward:")
print(f"  forwarded: {tenant_after_forward.get('forwarded')}")
print(f"  forward_verified: {tenant_after_forward.get('forward_verified')}")
print(f"  platform_id: {tenant_after_forward.get('platform_id')}")
print(f"  forward_error: {tenant_after_forward.get('forward_error')}")
print(f"  forward_target_env: {tenant_after_forward.get('forward_target_env')}")
print(f"  forward_target_url: {tenant_after_forward.get('forward_target_url')}")
print(f"  forward_attempts: {tenant_after_forward.get('forward_attempts')}")
print(f"  next_retry_at: {tenant_after_forward.get('next_retry_at')}")

# CRITICAL VERIFICATION: Legacy false-positive should be caught
# Expected: forwarded=False, forward_verified=False, platform_id=None, 
# forward_error mentions self-loop, next_retry_at set for retry
assert tenant_after_forward.get('forwarded') == False, \
    f"Expected forwarded=False (self-loop blocked), got {tenant_after_forward.get('forwarded')}"
assert tenant_after_forward.get('forward_verified') == False, \
    f"Expected forward_verified=False, got {tenant_after_forward.get('forward_verified')}"
assert tenant_after_forward.get('platform_id') is None, \
    f"Expected platform_id=None, got {tenant_after_forward.get('platform_id')}"
assert tenant_after_forward.get('forward_error') is not None, \
    "Expected forward_error to be set"
assert 'selv-loop' in tenant_after_forward.get('forward_error', '').lower(), \
    f"Expected forward_error to mention 'selv-loop', got: {tenant_after_forward.get('forward_error')}"
assert tenant_after_forward.get('forward_target_env') == 'test', \
    f"Expected forward_target_env='test', got {tenant_after_forward.get('forward_target_env')}"
assert tenant_after_forward.get('forward_target_url') is not None, \
    "Expected forward_target_url to be set"
assert tenant_after_forward.get('forward_attempts', 0) >= 1, \
    f"Expected forward_attempts >= 1, got {tenant_after_forward.get('forward_attempts')}"
assert tenant_after_forward.get('next_retry_at') is not None, \
    "Expected next_retry_at to be set for retry scheduling"

print_result("Self-loop detection", True, 
             "Legacy false-positive caught: forwarded=False, error mentions 'selv-loop', retry scheduled")

# ============================================================================
# STEP 4: Reset QA tenant and test manual resend
# ============================================================================
print_test("STEP 4: Reset QA tenant and call POST /api/admin/leads/resend")

# Reset to legacy false-positive state
db.tenant_leads.update_one(
    {"id": qa_tenant_id},
    {"$set": {
        "forwarded": True,
        "platform_id": None,
        "next_retry_at": None,
        "forward_attempts": 0,
    }}
)
print(f"Reset QA tenant to legacy state: forwarded=True, platform_id=None")

# Call manual resend
response = requests.post(
    f"{BASE_URL}/admin/leads/resend",
    params={"key": ADMIN_KEY},
    json={"id": qa_tenant_id, "type": "tenant"},
    timeout=30
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Verify response
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
data = response.json()
assert data.get("ok") == True, "Expected ok=true"
assert data.get("forwarded") == False, \
    f"Expected forwarded=False (self-loop), got {data.get('forwarded')}"
assert data.get("verified") == False, \
    f"Expected verified=False, got {data.get('verified')}"
assert data.get("platform_id") is None, \
    f"Expected platform_id=None, got {data.get('platform_id')}"
assert data.get("target_env") == 'test', \
    f"Expected target_env='test', got {data.get('target_env')}"
assert data.get("target_url") is not None, \
    "Expected target_url to be set"
assert data.get("error") is not None, \
    "Expected error to be set"
assert 'selv-loop' in data.get("error", "").lower(), \
    f"Expected error to mention 'selv-loop', got: {data.get('error')}"

print_result("Manual resend", True, 
             "Resend doesn't lie about delivery: forwarded=False, verified=False, error mentions 'selv-loop'")

# ============================================================================
# STEP 5: Verify CSV export contains diagnostic fields
# ============================================================================
print_test("STEP 5: GET /api/admin/leads/export?type=tenant (verify CSV headers)")

response = requests.get(
    f"{BASE_URL}/admin/leads/export",
    params={"key": ADMIN_KEY, "type": "tenant"},
    timeout=30
)

print(f"Status: {response.status_code}")
assert response.status_code == 200, f"Expected 200, got {response.status_code}"

# Verify Content-Type
content_type = response.headers.get('Content-Type', '')
assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"

# Verify Content-Disposition
content_disposition = response.headers.get('Content-Disposition', '')
assert 'attachment' in content_disposition, f"Expected attachment, got {content_disposition}"
assert 'digihome-leietakere' in content_disposition, \
    f"Expected filename with 'digihome-leietakere', got {content_disposition}"

# Parse CSV
csv_text = response.text
lines = csv_text.strip().split('\n')
assert len(lines) >= 1, "Expected at least header row"

header = lines[0].replace('\ufeff', '')  # Remove BOM
print(f"CSV header: {header}")

# Verify required diagnostic fields in header
required_fields = [
    'forward_verified',
    'platform_id',
    'forward_target_env',
    'forward_target_url',
    'forward_http_status',
    'forward_attempts',
    'forwarded_at',
    'forward_last_attempt_at',
    'forward_error',
]

for field in required_fields:
    assert field in header, f"Expected '{field}' in CSV header, got: {header}"

print_result("CSV export headers", True, 
             f"All {len(required_fields)} diagnostic fields present in CSV header")

# Verify QA tenant is in CSV
qa_found = False
for line in lines[1:]:  # Skip header
    if qa_tenant_id in line or 'qa-receipt-test@example.test' in line:
        qa_found = True
        print(f"\nQA tenant found in CSV:")
        print(f"  {line[:200]}...")  # Print first 200 chars
        break

assert qa_found, "Expected QA tenant to be present in CSV export"
print_result("QA tenant in CSV", qa_found, "QA tenant with diagnostic fields found in export")

# ============================================================================
# STEP 6: Verify GET /api/admin/leads contains audit fields
# ============================================================================
print_test("STEP 6: GET /api/admin/leads (verify QA tenant has audit fields)")

response = requests.get(
    f"{BASE_URL}/admin/leads",
    params={"key": ADMIN_KEY},
    timeout=30
)

print(f"Status: {response.status_code}")
assert response.status_code == 200, f"Expected 200, got {response.status_code}"

data = response.json()
assert "tenants" in data, "Expected 'tenants' array in response"

# Find QA tenant
qa_tenant_in_list = None
for tenant in data["tenants"]:
    if tenant.get("id") == qa_tenant_id:
        qa_tenant_in_list = tenant
        break

assert qa_tenant_in_list is not None, f"Expected QA tenant {qa_tenant_id} in tenants list"

print(f"QA tenant in GET /api/admin/leads:")
print(f"  forwarded: {qa_tenant_in_list.get('forwarded')}")
print(f"  forward_verified: {qa_tenant_in_list.get('forward_verified')}")
print(f"  platform_id: {qa_tenant_in_list.get('platform_id')}")
print(f"  forward_error: {qa_tenant_in_list.get('forward_error')}")
print(f"  forward_target_env: {qa_tenant_in_list.get('forward_target_env')}")

# Verify audit fields are present
assert 'forward_verified' in qa_tenant_in_list, "Expected forward_verified field"
assert 'forward_target_env' in qa_tenant_in_list, "Expected forward_target_env field"
assert 'forward_error' in qa_tenant_in_list, "Expected forward_error field"

print_result("GET /api/admin/leads audit fields", True, 
             "QA tenant contains all audit fields")

# Test auth without key
response_no_auth = requests.get(f"{BASE_URL}/admin/leads", timeout=10)
assert response_no_auth.status_code == 401, \
    f"Expected 401 without key, got {response_no_auth.status_code}"
print_result("Auth without key", response_no_auth.status_code == 401, "Returns 401 as expected")

# ============================================================================
# STEP 7: Static/regression tests
# ============================================================================
print_test("STEP 7: Static/regression tests")

# Test GET /api/
response = requests.get(f"{BASE_URL}/", timeout=10)
assert response.status_code == 200, f"Expected 200, got {response.status_code}"
data = response.json()
assert data.get("ok") == True, "Expected ok=true"
print_result("GET /api/", response.status_code == 200, "Health check OK")

# Verify route.js doesn't mark normal forward ok without concrete ID
# (source inspection acceptable per review request)
print("\nSource inspection: Verifying forwardToDigiHome requires platform_id...")
with open('/app/app/api/[[...path]]/route.js', 'r') as f:
    route_content = f.read()
    
# Check for the critical validation
assert 'if (!id) {' in route_content, "Expected ID validation in forwardToDigiHome"
assert 'levering er ikke verifisert' in route_content, \
    "Expected 'levering er ikke verifisert' error message"
assert 'ok: false' in route_content, "Expected ok:false when ID is missing"

print_result("Source inspection", True, 
             "forwardToDigiHome requires platform_id for verified delivery")

# ============================================================================
# STEP 8: MANDATORY cleanup
# ============================================================================
print_test("STEP 8: MANDATORY cleanup - delete QA document")

# Delete QA tenant
delete_result = db.tenant_leads.delete_one({"id": qa_tenant_id})
print(f"Deleted QA tenant: {delete_result.deleted_count} document(s)")
assert delete_result.deleted_count == 1, \
    f"Expected to delete 1 document, deleted {delete_result.deleted_count}"

# Verify no qa-receipt-* documents remain
remaining_qa = db.tenant_leads.count_documents({"id": {"$regex": f"^{QA_PREFIX}"}})
assert remaining_qa == 0, f"Expected 0 QA documents, found {remaining_qa}"
print(f"Verified: No qa-receipt-* documents remain")

# Verify baseline counts restored
final_leads = db.leads.count_documents({})
final_tenant_leads = db.tenant_leads.count_documents({})
final_imported_leads = db.imported_leads.count_documents({})

print(f"\nFinal counts:")
print(f"  leads: {final_leads} (baseline: {baseline_leads})")
print(f"  tenant_leads: {final_tenant_leads} (baseline: {baseline_tenant_leads})")
print(f"  imported_leads: {final_imported_leads} (baseline: {baseline_imported_leads})")

assert final_leads == baseline_leads, \
    f"leads count mismatch: expected {baseline_leads}, got {final_leads}"
assert final_tenant_leads == baseline_tenant_leads, \
    f"tenant_leads count mismatch: expected {baseline_tenant_leads}, got {final_tenant_leads}"
assert final_imported_leads == baseline_imported_leads, \
    f"imported_leads count mismatch: expected {baseline_imported_leads}, got {final_imported_leads}"

print_result("Cleanup complete", True, 
             f"Baseline counts exactly restored: {baseline_leads}/{baseline_tenant_leads}/{baseline_imported_leads}")

# ============================================================================
# SUMMARY
# ============================================================================
print_test("TEST SUMMARY")

print("""
✅ ALL 8 TESTS PASSED (100% success rate)

CRM-FORWARD HARDENING VERIFICATION COMPLETE:

1. ✅ Baseline counts captured (no existing documents modified)
2. ✅ QA tenant created simulating Odin/Mussie legacy false-positive
3. ✅ POST /admin/forward detects self-loop and blocks false-positive
   - forwarded changed from True → False
   - forward_verified = False
   - platform_id remains None
   - forward_error mentions 'selv-loop'
   - next_retry_at scheduled for retry
   - forward_attempts incremented
4. ✅ POST /admin/leads/resend doesn't lie about delivery
   - Returns forwarded=False, verified=False
   - Returns error mentioning 'selv-loop'
   - Provides full diagnostic info (target_env, target_url, etc.)
5. ✅ CSV export contains all diagnostic fields
   - forward_verified, platform_id, forward_target_env, forward_target_url
   - forward_http_status, forward_attempts, forwarded_at, forward_last_attempt_at
   - forward_error
6. ✅ GET /api/admin/leads contains audit fields
   - Auth without key returns 401
7. ✅ Static/regression tests passed
   - GET /api/ returns 200
   - Source inspection confirms platform_id requirement
8. ✅ MANDATORY cleanup completed
   - QA document deleted
   - No qa-receipt-* documents remain
   - Baseline counts exactly restored

CRITICAL FINDINGS:
- Legacy false-positive (forwarded=true without platform_id) is now caught
- Self-loop detection prevents marketing site from forwarding to itself
- Retry scheduling ensures failed forwards are retried with backoff
- Full audit trail available in CSV export and admin API
- Manual resend provides honest delivery status

PRODUCTION REPAIR NOTE:
Actual production repair of Odin/Mussie requires redeploy. This preview test
verifies the hardened logic works correctly.

Base URL: {BASE_URL}
Admin key: {ADMIN_KEY}
MongoDB: {MONGO_URL}/{DB_NAME}
""".format(BASE_URL=BASE_URL, ADMIN_KEY=ADMIN_KEY, MONGO_URL=MONGO_URL, DB_NAME=DB_NAME))

print("="*80)
print("CRM-FORWARD HARDENING TEST COMPLETE")
print("="*80)
