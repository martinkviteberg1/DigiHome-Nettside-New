#!/usr/bin/env python3
"""
Backend test for LEIEFORHOLD & INNTEKTER module
Tests the new lease-income endpoints with modulAuthed('leieforhold') auth.
"""

import requests
import time
import sys
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test credentials
QA_USER_EMAIL = "qa-lf@example.com"
QA_USER_PASSWORD = "QaTest12345!"
QA_USER_NAME = "QA Leieforhold"

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def test_leieforhold():
    """Test the Leieforhold & Inntekter module"""
    
    log("=" * 80)
    log("LEIEFORHOLD & INNTEKTER MODULE TEST")
    log("=" * 80)
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    qa_user_id = None
    qa_user_token = None
    
    try:
        # ===================================================================
        # TEST 1: GET /api/admin/leieforhold with admin key (env=test default)
        # ===================================================================
        log("\n[TEST 1] GET /api/admin/leieforhold with admin key (env=test)")
        
        resp = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            params={"key": ADMIN_KEY},
            timeout=60
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert data.get("ok") == True, f"Expected ok:true, got {data.get('ok')}"
        assert "source" in data, "Missing 'source' field"
        assert data["source"] in ["lease-income", "contracts-fallback"], f"Invalid source: {data['source']}"
        assert "env" in data, "Missing 'env' field"
        assert "rows" in data, "Missing 'rows' field"
        assert "totals" in data, "Missing 'totals' field"
        assert isinstance(data["rows"], list), "rows must be an array"
        
        log(f"✅ Response structure valid: source={data['source']}, env={data['env']}, rows={len(data['rows'])}")
        
        # Verify totals structure
        totals = data["totals"]
        required_totals = [
            "actual_rent", "expected_rent", "pending_rent", "estimate_rent",
            "leased", "future", "signing", "vacant",
            "fee", "net", "count", "occupancy_pct"
        ]
        for field in required_totals:
            assert field in totals, f"Missing totals field: {field}"
        
        log(f"✅ Totals structure valid: {list(totals.keys())}")
        
        # Verify row schema (if rows exist)
        if len(data["rows"]) > 0:
            row = data["rows"][0]
            required_row_fields = [
                "unit_room", "address", "unit_type", "owner_name", "tenant_name",
                "status_label", "group", "advertised", "move_in_date",
                "monthly_rent", "fee_percent", "fee_amount", "net_to_owner",
                "deposit", "income_type", "service_level", "vat_inclusive"
            ]
            for field in required_row_fields:
                assert field in row, f"Missing row field: {field}"
            
            # Verify group values
            assert row["group"] in ["leased", "future", "signing", "vacant"], f"Invalid group: {row['group']}"
            
            log(f"✅ Row schema valid: {list(row.keys())[:5]}...")
        
        # Verify consistency checks
        assert totals["count"] == len(data["rows"]), \
            f"totals.count ({totals['count']}) != rows.length ({len(data['rows'])})"
        log(f"✅ Consistency: totals.count === rows.length ({totals['count']})")
        
        # Verify occupancy_pct calculation
        if totals["count"] > 0:
            expected_occupancy = round((totals["leased"] / totals["count"]) * 100)
            assert totals["occupancy_pct"] == expected_occupancy, \
                f"occupancy_pct ({totals['occupancy_pct']}) != round(leased/count*100) ({expected_occupancy})"
            log(f"✅ Consistency: occupancy_pct === round(leased/count*100) ({totals['occupancy_pct']}%)")
        
        # Verify fee/net summation (only for leased rows, ±1 per row tolerance)
        leased_rows = [r for r in data["rows"] if r["group"] == "leased"]
        if leased_rows:
            sum_fee = sum(r["fee_amount"] for r in leased_rows)
            sum_net = sum(r["net_to_owner"] for r in leased_rows)
            sum_rent = sum(r["monthly_rent"] for r in leased_rows)
            
            tolerance = len(leased_rows)  # ±1 per row
            assert abs(totals["fee"] - sum_fee) <= tolerance, \
                f"totals.fee ({totals['fee']}) != sum(fee_amount) ({sum_fee}) ±{tolerance}"
            assert abs(totals["net"] - sum_net) <= tolerance, \
                f"totals.net ({totals['net']}) != sum(net_to_owner) ({sum_net}) ±{tolerance}"
            assert abs(totals["actual_rent"] - sum_rent) <= tolerance, \
                f"totals.actual_rent ({totals['actual_rent']}) != sum(monthly_rent) ({sum_rent}) ±{tolerance}"
            
            log(f"✅ Consistency: fee/net/actual_rent sums match (±{tolerance} tolerance)")
        
        # Verify sorting (group order: leased→future→signing→vacant, then monthly_rent desc within group)
        if len(data["rows"]) > 1:
            group_order = {"leased": 0, "future": 1, "signing": 2, "vacant": 3}
            for i in range(len(data["rows"]) - 1):
                curr = data["rows"][i]
                next_row = data["rows"][i + 1]
                curr_order = group_order.get(curr["group"], 9)
                next_order = group_order.get(next_row["group"], 9)
                
                if curr_order == next_order:
                    # Same group: should be sorted by monthly_rent descending
                    assert curr["monthly_rent"] >= next_row["monthly_rent"], \
                        f"Row {i} rent ({curr['monthly_rent']}) < row {i+1} rent ({next_row['monthly_rent']}) in same group"
                else:
                    # Different groups: should be in correct order
                    assert curr_order < next_order, \
                        f"Row {i} group ({curr['group']}) should come before row {i+1} group ({next_row['group']})"
            
            log(f"✅ Rows sorted correctly: group order + monthly_rent desc within group")
        
        log("✅ TEST 1 PASSED: GET /api/admin/leieforhold with admin key")
        
        # ===================================================================
        # TEST 2: GET /api/admin/leieforhold?env=prod (can take 10-25s)
        # ===================================================================
        log("\n[TEST 2] GET /api/admin/leieforhold?env=prod (may take 10-25s)")
        
        resp = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            params={"key": ADMIN_KEY, "env": "prod"},
            timeout=60
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Expected ok:true, got {data.get('ok')}"
        assert data.get("env") == "prod", f"Expected env:'prod', got {data.get('env')}"
        
        log(f"✅ TEST 2 PASSED: env=prod returns env:'prod' (source={data['source']}, rows={len(data['rows'])})")
        
        # ===================================================================
        # TEST 3: GET /api/admin/leieforhold/xlsx?env=prod
        # ===================================================================
        log("\n[TEST 3] GET /api/admin/leieforhold/xlsx?env=prod")
        
        resp = requests.get(
            f"{BASE_URL}/admin/leieforhold/xlsx",
            params={"key": ADMIN_KEY, "env": "prod"},
            timeout=60
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in resp.headers.get("Content-Type", ""), \
            f"Expected Excel Content-Type, got {resp.headers.get('Content-Type')}"
        assert "digihome-leieforhold-inntekter.xlsx" in resp.headers.get("Content-Disposition", ""), \
            f"Expected filename in Content-Disposition, got {resp.headers.get('Content-Disposition')}"
        assert len(resp.content) > 5000, f"Expected body > 5000 bytes, got {len(resp.content)}"
        
        log(f"✅ TEST 3 PASSED: XLSX download OK ({len(resp.content)} bytes)")
        
        # ===================================================================
        # TEST 4: GET /api/admin/leieforhold/csv?env=prod
        # ===================================================================
        log("\n[TEST 4] GET /api/admin/leieforhold/csv?env=prod")
        
        resp = requests.get(
            f"{BASE_URL}/admin/leieforhold/csv",
            params={"key": ADMIN_KEY, "env": "prod"},
            timeout=60
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert "text/csv" in resp.headers.get("Content-Type", ""), \
            f"Expected CSV Content-Type, got {resp.headers.get('Content-Type')}"
        assert len(resp.text) > 0, "Expected non-empty CSV body"
        assert "\n" in resp.text, "Expected CSV to contain newlines (header row)"
        
        log(f"✅ TEST 4 PASSED: CSV download OK ({len(resp.text)} chars)")
        
        # ===================================================================
        # TEST 5a: No key → 401 for all endpoints
        # ===================================================================
        log("\n[TEST 5a] No key → 401 for all endpoints")
        
        for endpoint in ["/admin/leieforhold", "/admin/leieforhold/xlsx", "/admin/leieforhold/csv"]:
            resp = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            assert resp.status_code == 401, f"Expected 401 for {endpoint} without key, got {resp.status_code}"
        
        log("✅ TEST 5a PASSED: All endpoints return 401 without key")
        
        # ===================================================================
        # TEST 5b: Create QA user (role:bruker, no groups)
        # ===================================================================
        log("\n[TEST 5b] Create QA user (role:bruker, no groups)")
        
        resp = requests.post(
            f"{BASE_URL}/admin/users",
            params={"key": ADMIN_KEY},
            json={
                "name": QA_USER_NAME,
                "email": QA_USER_EMAIL,
                "role": "bruker",
                "password": QA_USER_PASSWORD,
                "invite": False
            },
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        user_data = resp.json()
        qa_user_id = user_data.get("member", {}).get("id") or user_data.get("id")
        assert qa_user_id, f"Expected user id in response, got: {user_data}"
        
        log(f"✅ QA user created: id={qa_user_id}")
        
        # Login as QA user
        resp = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": QA_USER_EMAIL, "password": QA_USER_PASSWORD},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        login_data = resp.json()
        qa_user_token = login_data.get("token")
        assert qa_user_token, "Expected token in login response"
        
        log(f"✅ QA user logged in: token={qa_user_token[:20]}...")
        
        # ===================================================================
        # TEST 5c: With bruker token and NO moduler → 401
        # ===================================================================
        log("\n[TEST 5c] With bruker token and NO moduler → 401")
        
        for endpoint in ["/admin/leieforhold", "/admin/leieforhold/xlsx", "/admin/leieforhold/csv"]:
            resp = requests.get(
                f"{BASE_URL}{endpoint}",
                params={"key": qa_user_token},
                timeout=10
            )
            assert resp.status_code == 401, \
                f"Expected 401 for {endpoint} with bruker token (no moduler), got {resp.status_code}"
        
        log("✅ TEST 5c PASSED: All endpoints return 401 for bruker without 'leieforhold' module")
        
        # ===================================================================
        # TEST 5d: Grant module: PUT /api/admin/users/:id {moduler:['leieforhold']}
        # ===================================================================
        log("\n[TEST 5d] Grant 'leieforhold' module to QA user")
        
        resp = requests.put(
            f"{BASE_URL}/admin/users/{qa_user_id}",
            params={"key": ADMIN_KEY},
            json={"moduler": ["leieforhold"]},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        log("✅ Module granted via PUT")
        
        # Verify module was NOT filtered out (MODUL_NOKLER includes 'leieforhold')
        # GET /admin/users/:id doesn't exist, so we list all users and find ours
        resp = requests.get(
            f"{BASE_URL}/admin/users",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        users_data = resp.json()
        users = users_data.get("members", [])
        qa_user = next((u for u in users if u.get("id") == qa_user_id), None)
        assert qa_user, f"QA user {qa_user_id} not found in users list"
        
        moduler = qa_user.get("moduler", [])
        assert "leieforhold" in moduler, \
            f"Expected 'leieforhold' in moduler, got {moduler} (MODUL_NOKLER regression!)"
        
        log(f"✅ TEST 5d PASSED: 'leieforhold' module persisted (moduler={moduler})")
        
        # ===================================================================
        # TEST 5e: With bruker token again → 200 now
        # ===================================================================
        log("\n[TEST 5e] With bruker token (with 'leieforhold' module) → 200")
        
        resp = requests.get(
            f"{BASE_URL}/admin/leieforhold",
            params={"key": qa_user_token},
            timeout=60
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Expected ok:true, got {data.get('ok')}"
        
        log(f"✅ TEST 5e PASSED: Bruker with 'leieforhold' module can access endpoint")
        
        # ===================================================================
        # TEST 6: REGRESSION - admin login
        # ===================================================================
        log("\n[TEST 6] REGRESSION: admin login")
        
        resp = requests.post(
            f"{BASE_URL}/admin/auth/login",
            json={"email": "martin@kviteberg.no", "password": "Pyramiden2025##"},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        login_data = resp.json()
        assert "token" in login_data, "Expected token in login response"
        
        log("✅ TEST 6 PASSED: Admin login works")
        
        # ===================================================================
        # TEST 7: REGRESSION - GET /api/admin/tasks
        # ===================================================================
        log("\n[TEST 7] REGRESSION: GET /api/admin/tasks")
        
        resp = requests.get(
            f"{BASE_URL}/admin/tasks",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Expected ok:true, got {data.get('ok')}"
        
        log("✅ TEST 7 PASSED: GET /api/admin/tasks works")
        
        # ===================================================================
        # TEST 8: REGRESSION - GET /api/admin/kpi
        # ===================================================================
        log("\n[TEST 8] REGRESSION: GET /api/admin/kpi")
        
        resp = requests.get(
            f"{BASE_URL}/admin/kpi",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, f"Expected ok:true, got {data.get('ok')}"
        
        log("✅ TEST 8 PASSED: GET /api/admin/kpi works")
        
        log("\n" + "=" * 80)
        log("ALL TESTS PASSED (8/8)")
        log("=" * 80)
        
        return True
        
    except AssertionError as e:
        log(f"\n❌ TEST FAILED: {e}")
        return False
        
    except Exception as e:
        log(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # ===================================================================
        # MANDATORY CLEANUP
        # ===================================================================
        log("\n" + "=" * 80)
        log("MANDATORY CLEANUP")
        log("=" * 80)
        
        if qa_user_id:
            try:
                log(f"Deleting QA user: {qa_user_id}")
                resp = requests.delete(
                    f"{BASE_URL}/admin/users/{qa_user_id}",
                    params={"key": ADMIN_KEY},
                    timeout=10
                )
                if resp.status_code == 200:
                    log(f"✅ QA user deleted via API")
                else:
                    log(f"⚠️ API delete returned {resp.status_code}, trying MongoDB...")
                    result = db.admin_users.delete_one({"id": qa_user_id})
                    log(f"✅ Deleted {result.deleted_count} user(s) from MongoDB")
            except Exception as e:
                log(f"⚠️ Error deleting QA user: {e}")
        
        # Verify cleanup
        try:
            count = db.admin_users.count_documents({"email": QA_USER_EMAIL})
            if count == 0:
                log(f"✅ Verified: 0 users with email {QA_USER_EMAIL} in MongoDB")
            else:
                log(f"⚠️ WARNING: {count} user(s) with email {QA_USER_EMAIL} still in MongoDB")
        except Exception as e:
            log(f"⚠️ Error verifying cleanup: {e}")
        
        client.close()

if __name__ == "__main__":
    success = test_leieforhold()
    sys.exit(0 if success else 1)
