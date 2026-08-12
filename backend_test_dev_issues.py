#!/usr/bin/env python3
"""
Backend test for UTVIKLINGSSAKER KOMPLETT features:
- dev-products CRUD (GET/POST/PUT/DELETE /api/admin/dev-products)
- PUT /admin/tasks/:id development fields (taskType/productId/componentId)
- Insights dev-block (GET /api/admin/tasks/insights)
- POST /api/bridge/dev-issue (platform intake endpoint)
"""

import requests
import json
import sys
import time
from pymongo import MongoClient

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
BRIDGE_SECRET = "dhbridge_1b6d861334cad9ace784288a038f540f7f183cd7"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
qa_product_id = None
qa_task_id = None
qa_dev_issue_ids = []
qa_component_ids = []

def log(msg):
    print(f"[TEST] {msg}")

def test_a1_get_dev_products():
    """A1. GET /api/admin/dev-products?key=... → 200 with at least 4 products including 'Forvalter-plattformen'"""
    log("A1: GET dev-products list")
    try:
        r = requests.get(f"{BASE_URL}/admin/dev-products", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert "products" in data, f"Missing products field: {data}"
        products = data["products"]
        assert len(products) >= 4, f"Expected at least 4 products, got {len(products)}"
        
        # Verify structure
        for p in products:
            assert "id" in p, f"Product missing id: {p}"
            assert "name" in p, f"Product missing name: {p}"
            assert "color" in p, f"Product missing color: {p}"
            assert "components" in p, f"Product missing components: {p}"
        
        # Verify 'Forvalter-plattformen' exists
        forvalter = [p for p in products if "forvalter" in p["name"].lower()]
        assert len(forvalter) > 0, f"'Forvalter-plattformen' not found in products: {[p['name'] for p in products]}"
        
        # Verify it has 'Interessenter' component
        forvalter_prod = forvalter[0]
        interessenter = [c for c in forvalter_prod.get("components", []) if c.get("name") == "Interessenter"]
        assert len(interessenter) > 0, f"'Interessenter' component not found in Forvalter-plattformen: {forvalter_prod.get('components')}"
        
        log(f"✅ A1 PASS: Found {len(products)} products including 'Forvalter-plattformen' with 'Interessenter' component")
        return True
    except Exception as e:
        log(f"❌ A1 FAIL: {e}")
        return False

def test_a2_post_dev_product():
    """A2. POST /api/admin/dev-products {name:'QA Testprodukt', color:'#123abc'} → 200 with product"""
    global qa_product_id
    log("A2: POST create QA product")
    try:
        payload = {"name": "QA Testprodukt", "color": "#123abc"}
        r = requests.post(f"{BASE_URL}/admin/dev-products", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert "product" in data, f"Missing product field: {data}"
        
        product = data["product"]
        assert product.get("name") == "QA Testprodukt", f"Name mismatch: {product}"
        assert product.get("color") == "#123abc", f"Color mismatch: {product}"
        assert "id" in product, f"Missing id: {product}"
        assert product.get("components") == [], f"Expected empty components: {product}"
        
        qa_product_id = product["id"]
        log(f"✅ A2 PASS: Created QA product with id={qa_product_id}")
        return True
    except Exception as e:
        log(f"❌ A2 FAIL: {e}")
        return False

def test_a3_post_without_name():
    """A3. POST without name → 400"""
    log("A3: POST without name")
    try:
        payload = {"color": "#ff0000"}
        r = requests.post(f"{BASE_URL}/admin/dev-products", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        data = r.json()
        assert "error" in data, f"Expected error field: {data}"
        log(f"✅ A3 PASS: POST without name returns 400")
        return True
    except Exception as e:
        log(f"❌ A3 FAIL: {e}")
        return False

def test_a4_put_dev_product():
    """A4. PUT /api/admin/dev-products/<QA-id> with components → 200"""
    global qa_component_ids
    log("A4: PUT update QA product with components")
    try:
        assert qa_product_id, "QA product not created"
        payload = {
            "name": "QA Testprodukt v2",
            "color": "#ff0000",
            "components": [
                {"name": "QA Komp A"},
                {"name": "QA Komp B"}
            ]
        }
        r = requests.put(f"{BASE_URL}/admin/dev-products/{qa_product_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        
        product = data["product"]
        assert product.get("name") == "QA Testprodukt v2", f"Name not updated: {product}"
        assert product.get("color") == "#ff0000", f"Color not updated: {product}"
        assert len(product.get("components", [])) == 2, f"Expected 2 components: {product}"
        
        # Verify components have ids and names
        for comp in product["components"]:
            assert "id" in comp, f"Component missing id: {comp}"
            assert "name" in comp, f"Component missing name: {comp}"
            qa_component_ids.append(comp["id"])
        
        log(f"✅ A4 PASS: Updated QA product with 2 components (ids: {qa_component_ids})")
        return True
    except Exception as e:
        log(f"❌ A4 FAIL: {e}")
        return False

def test_a5_put_validation():
    """A5. PUT with empty name → 400, PUT with unknown id → 404"""
    log("A5: PUT validation tests")
    try:
        # Empty name
        payload = {"name": ""}
        r = requests.put(f"{BASE_URL}/admin/dev-products/{qa_product_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 for empty name, got {r.status_code}: {r.text}"
        
        # Unknown id
        payload = {"name": "Test"}
        r = requests.put(f"{BASE_URL}/admin/dev-products/finnes-ikke-123", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 404, f"Expected 404 for unknown id, got {r.status_code}: {r.text}"
        
        log(f"✅ A5 PASS: PUT validation working (empty name → 400, unknown id → 404)")
        return True
    except Exception as e:
        log(f"❌ A5 FAIL: {e}")
        return False

def test_a6_delete_in_use():
    """A6. DELETE on QA product while task uses it → 409, delete task then DELETE → 200"""
    log("A6: DELETE product in use")
    global qa_task_id, qa_product_id, qa_component_ids
    try:
        # First create a QA task using this product
        task_payload = {
            "title": "QA Devfelt Sak",
            "space": "utvikling",
            "notify": False,
            "productId": qa_product_id
        }
        r = requests.post(f"{BASE_URL}/admin/tasks", params={"key": ADMIN_KEY}, json=task_payload, timeout=10)
        assert r.status_code == 200, f"Failed to create task: {r.status_code}: {r.text}"
        task_data = r.json()
        qa_task_id = task_data["task"]["id"]
        log(f"  Created QA task {qa_task_id} using product {qa_product_id}")
        
        # Try to delete product while in use
        r = requests.delete(f"{BASE_URL}/admin/dev-products/{qa_product_id}", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 409, f"Expected 409 for product in use, got {r.status_code}: {r.text}"
        data = r.json()
        assert "error" in data, f"Expected error field: {data}"
        assert "brukes av" in data["error"].lower(), f"Expected 'brukes av' in error: {data}"
        log(f"  ✓ DELETE while in use returns 409")
        
        # Delete the task
        r = requests.delete(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Failed to delete task: {r.status_code}: {r.text}"
        log(f"  ✓ Deleted QA task {qa_task_id}")
        
        # Now delete product should work
        r = requests.delete(f"{BASE_URL}/admin/dev-products/{qa_product_id}", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200 after task deleted, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        log(f"  ✓ DELETE after task removed returns 200")
        
        # Recreate product for remaining tests
        payload = {"name": "QA Testprodukt v2", "color": "#ff0000"}
        r = requests.post(f"{BASE_URL}/admin/dev-products", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Failed to recreate product: {r.text}"
        qa_product_id = r.json()["product"]["id"]
        log(f"  ✓ Recreated QA product {qa_product_id}")
        
        # Add components back
        payload = {"components": [{"name": "QA Komp A"}, {"name": "QA Komp B"}]}
        r = requests.put(f"{BASE_URL}/admin/dev-products/{qa_product_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Failed to add components: {r.text}"
        qa_component_ids = [c["id"] for c in r.json()["product"]["components"]]
        log(f"  ✓ Added components back (ids: {qa_component_ids})")
        
        log(f"✅ A6 PASS: DELETE validation working (in use → 409, after cleanup → 200)")
        return True
    except Exception as e:
        log(f"❌ A6 FAIL: {e}")
        return False

def test_a7_get_without_key():
    """A7. GET without key → 401"""
    log("A7: GET without key")
    try:
        r = requests.get(f"{BASE_URL}/admin/dev-products", timeout=10)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        log(f"✅ A7 PASS: GET without key returns 401")
        return True
    except Exception as e:
        log(f"❌ A7 FAIL: {e}")
        return False

def test_b1_create_qa_task():
    """B1. Create QA task for development fields testing"""
    global qa_task_id
    log("B1: Create QA task for dev fields")
    try:
        payload = {
            "title": "QA Devfelt Sak",
            "space": "utvikling",
            "notify": False
        }
        r = requests.post(f"{BASE_URL}/admin/tasks", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        
        qa_task_id = data["task"]["id"]
        log(f"✅ B1 PASS: Created QA task {qa_task_id}")
        return True
    except Exception as e:
        log(f"❌ B1 FAIL: {e}")
        return False

def test_b2_put_tasktype():
    """B2. PUT {taskType:'feil', actor:'QA'} → 200; task.taskType==='feil'; activity contains 'Sakstype: feil'"""
    log("B2: PUT taskType='feil'")
    try:
        payload = {"taskType": "feil", "actor": "QA"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        
        task = data["task"]
        assert task.get("taskType") == "feil", f"taskType not set: {task.get('taskType')}"
        
        # Check activity log
        activity = task.get("activity", [])
        activity_texts = [a.get("text", "") for a in activity]
        assert any("Sakstype: feil" in text for text in activity_texts), f"Activity missing 'Sakstype: feil': {activity_texts}"
        
        log(f"✅ B2 PASS: taskType set to 'feil' with activity log")
        return True
    except Exception as e:
        log(f"❌ B2 FAIL: {e}")
        return False

def test_b3_put_invalid_tasktype():
    """B3. PUT {taskType:'ugyldig-type'} → 200 but taskType becomes null"""
    log("B3: PUT invalid taskType")
    try:
        payload = {"taskType": "ugyldig-type"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        task = data["task"]
        assert task.get("taskType") is None, f"Expected taskType=null for invalid type, got {task.get('taskType')}"
        
        # Check activity log
        activity = task.get("activity", [])
        activity_texts = [a.get("text", "") for a in activity]
        assert any("Sakstype fjernet" in text for text in activity_texts), f"Activity missing 'Sakstype fjernet': {activity_texts}"
        
        log(f"✅ B3 PASS: Invalid taskType becomes null with 'Sakstype fjernet' in activity")
        return True
    except Exception as e:
        log(f"❌ B3 FAIL: {e}")
        return False

def test_b4_put_productid():
    """B4. PUT {productId:'<QA-product-id>'} → 200; PUT {productId:'finnes-ikke'} → 400"""
    log("B4: PUT productId validation")
    try:
        # Valid product
        payload = {"productId": qa_product_id, "taskType": "feil"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200 for valid product, got {r.status_code}: {r.text}"
        data = r.json()
        task = data["task"]
        assert task.get("productId") == qa_product_id, f"productId not set: {task.get('productId')}"
        
        # Check activity log
        activity = task.get("activity", [])
        activity_texts = [a.get("text", "") for a in activity]
        assert any("Produkt: QA Testprodukt v2" in text for text in activity_texts), f"Activity missing product name: {activity_texts}"
        log(f"  ✓ Valid productId set with activity log")
        
        # Invalid product
        payload = {"productId": "finnes-ikke"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 for invalid product, got {r.status_code}: {r.text}"
        data = r.json()
        assert "error" in data, f"Expected error field: {data}"
        assert "ukjent produkt" in data["error"].lower(), f"Expected 'Ukjent produkt' in error: {data}"
        log(f"  ✓ Invalid productId returns 400 with 'Ukjent produkt'")
        
        log(f"✅ B4 PASS: productId validation working")
        return True
    except Exception as e:
        log(f"❌ B4 FAIL: {e}")
        return False

def test_b5_put_componentid():
    """B5. PUT {componentId:'<QA Komp A-id>'} → 200; PUT {componentId:'feil-komp-id'} → 400"""
    log("B5: PUT componentId validation")
    global qa_component_ids
    try:
        # Fetch current product to get component IDs (may have been recreated in A6)
        r = requests.get(f"{BASE_URL}/admin/dev-products", params={"key": ADMIN_KEY}, timeout=10)
        products = r.json()["products"]
        qa_products = [p for p in products if p["id"] == qa_product_id]
        assert len(qa_products) > 0, f"QA product {qa_product_id} not found in products list"
        qa_product = qa_products[0]
        qa_component_ids = [c["id"] for c in qa_product["components"]]
        assert len(qa_component_ids) >= 2, f"Expected at least 2 components, got {len(qa_component_ids)}"
        
        # Valid component
        comp_a_id = qa_component_ids[0]
        payload = {"componentId": comp_a_id}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200 for valid component, got {r.status_code}: {r.text}"
        data = r.json()
        task = data["task"]
        assert task.get("componentId") == comp_a_id, f"componentId not set: {task.get('componentId')}"
        
        # Check activity log
        activity = task.get("activity", [])
        activity_texts = [a.get("text", "") for a in activity]
        assert any("Komponent: QA Komp A" in text for text in activity_texts), f"Activity missing component name: {activity_texts}"
        log(f"  ✓ Valid componentId set with activity log")
        
        # Invalid component
        payload = {"componentId": "feil-komp-id"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 for invalid component, got {r.status_code}: {r.text}"
        data = r.json()
        assert "error" in data, f"Expected error field: {data}"
        assert "komponenten finnes ikke" in data["error"].lower(), f"Expected 'Komponenten finnes ikke' in error: {data}"
        log(f"  ✓ Invalid componentId returns 400")
        
        log(f"✅ B5 PASS: componentId validation working")
        return True
    except Exception as e:
        log(f"❌ B5 FAIL: {e}")
        return False

def test_b6_product_switch_resets_component():
    """B6. PUT {productId:null} → 200; verify BOTH productId===null AND componentId===null"""
    log("B6: Product switch resets component")
    try:
        payload = {"productId": None}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        task = data["task"]
        
        assert task.get("productId") is None, f"productId not null: {task.get('productId')}"
        assert task.get("componentId") is None, f"componentId not null (should be reset): {task.get('componentId')}"
        
        log(f"✅ B6 PASS: Product switch resets component (both null)")
        return True
    except Exception as e:
        log(f"❌ B6 FAIL: {e}")
        return False

def test_b7_regression():
    """B7. PUT {status:'doing'} and {priority:1} still work → 200"""
    log("B7: Regression test for status and priority")
    try:
        # Status
        payload = {"status": "doing"}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200 for status, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["task"]["status"] == "doing", f"Status not updated: {data['task']['status']}"
        log(f"  ✓ Status update working")
        
        # Priority
        payload = {"priority": 1}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200 for priority, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["task"]["priority"] == 1, f"Priority not updated: {data['task']['priority']}"
        log(f"  ✓ Priority update working")
        
        log(f"✅ B7 PASS: Regression tests passed")
        return True
    except Exception as e:
        log(f"❌ B7 FAIL: {e}")
        return False

def test_c1_insights_dev_block():
    """C1. GET /api/admin/tasks/insights with dev task → response has dev object"""
    log("C1: Insights dev-block")
    try:
        # First set task back to have taskType and productId
        payload = {"taskType": "feil", "productId": qa_product_id}
        r = requests.put(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, json=payload, timeout=10)
        assert r.status_code == 200, f"Failed to set task fields: {r.text}"
        log(f"  ✓ Set task to taskType='feil' and productId={qa_product_id}")
        
        # Get insights
        r = requests.get(f"{BASE_URL}/admin/tasks/insights", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        
        # Check dev block
        assert "dev" in data, f"Missing dev field: {data.keys()}"
        dev = data["dev"]
        assert dev is not None, f"dev should not be null when dev tasks exist"
        
        # Check typer
        assert "typer" in dev, f"Missing typer in dev: {dev}"
        typer = dev["typer"]
        assert "feil" in typer, f"Missing 'feil' in typer: {typer}"
        assert typer["feil"] >= 1, f"Expected feil >= 1, got {typer['feil']}"
        
        # Check perProduct
        assert "perProduct" in dev, f"Missing perProduct in dev: {dev}"
        per_product = dev["perProduct"]
        qa_product_row = [p for p in per_product if p.get("id") == qa_product_id]
        assert len(qa_product_row) > 0, f"QA product not in perProduct: {per_product}"
        
        qa_row = qa_product_row[0]
        assert qa_row.get("open") >= 1, f"Expected open >= 1 for QA product: {qa_row}"
        assert qa_row.get("feil") >= 1, f"Expected feil >= 1 for QA product: {qa_row}"
        
        log(f"✅ C1 PASS: Insights dev-block present with typer.feil={typer['feil']} and QA product row")
        return True
    except Exception as e:
        log(f"❌ C1 FAIL: {e}")
        return False

def test_c2_insights_dev_typer():
    """C2. Verify dev.typer has all keys feil/forbedring/funksjon/vedlikehold/uten"""
    log("C2: Insights dev.typer structure")
    try:
        r = requests.get(f"{BASE_URL}/admin/tasks/insights", params={"key": ADMIN_KEY}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        dev = data.get("dev")
        assert dev is not None, f"dev is null"
        
        typer = dev.get("typer", {})
        required_keys = ["feil", "forbedring", "funksjon", "vedlikehold", "uten"]
        for key in required_keys:
            assert key in typer, f"Missing key '{key}' in typer: {typer}"
            assert isinstance(typer[key], int) and typer[key] >= 0, f"Invalid value for {key}: {typer[key]}"
        
        log(f"✅ C2 PASS: dev.typer has all required keys with valid values")
        return True
    except Exception as e:
        log(f"❌ C2 FAIL: {e}")
        return False

def test_d1_dev_issue_discovery():
    """D1. GET /api/bridge/dev-issue (no auth) → 200 discovery JSON"""
    log("D1: GET dev-issue discovery")
    try:
        r = requests.get(f"{BASE_URL}/bridge/dev-issue", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert "service" in data, f"Missing service field: {data}"
        assert "method" in data, f"Missing method field: {data}"
        assert "auth" in data, f"Missing auth field: {data}"
        assert "fields" in data, f"Missing fields field: {data}"
        
        log(f"✅ D1 PASS: Discovery endpoint returns correct structure")
        return True
    except Exception as e:
        log(f"❌ D1 FAIL: {e}")
        return False

def test_d2_dev_issue_auth():
    """D2. POST without auth → 401, POST with wrong secret → 401"""
    log("D2: POST dev-issue auth validation")
    try:
        payload = {"title": "Test"}
        
        # No auth
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", json=payload, timeout=10)
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}: {r.text}"
        log(f"  ✓ No auth returns 401")
        
        # Wrong secret
        headers = {"x-bridge-secret": "wrong-secret"}
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 401, f"Expected 401 with wrong secret, got {r.status_code}: {r.text}"
        log(f"  ✓ Wrong secret returns 401")
        
        log(f"✅ D2 PASS: Auth validation working")
        return True
    except Exception as e:
        log(f"❌ D2 FAIL: {e}")
        return False

def test_d3_dev_issue_full_post():
    """D3. POST with full body → 201 with correct response"""
    log("D3: POST dev-issue with full body")
    try:
        headers = {"x-bridge-secret": BRIDGE_SECRET}
        payload = {
            "event_id": "qa-di-100",
            "title": "QA Innmeldt feil",
            "description": "QA-beskrivelse",
            "type": "bug",
            "severity": "kritisk",
            "reporter": {
                "name": "QA Reporter",
                "email": "qa-rep@example.com",
                "role": "forvalter"
            },
            "context": {
                "module": "QA-Testmodul",
                "route": "/qa",
                "url": "https://example.com/qa",
                "userAgent": "QA-UA",
                "viewport": "100x100"
            },
            "screenshots": [{
                "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                "name": "qa.png"
            }]
        }
        
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert "task_id" in data, f"Missing task_id: {data}"
        assert data.get("type") == "feil", f"Expected type='feil', got {data.get('type')}"
        assert data.get("priority") == 1, f"Expected priority=1, got {data.get('priority')}"
        assert data.get("component") == "QA-Testmodul", f"Expected component='QA-Testmodul', got {data.get('component')}"
        assert data.get("attachments") == 1, f"Expected attachments=1, got {data.get('attachments')}"
        
        qa_dev_issue_ids.append(data["task_id"])
        log(f"✅ D3 PASS: Created dev-issue task {data['task_id']} with type=feil, priority=1, component=QA-Testmodul, attachments=1")
        return True
    except Exception as e:
        log(f"❌ D3 FAIL: {e}")
        return False

def test_d4_dev_issue_mongodb_verification():
    """D4. Verify in MongoDB: task structure, component auto-created, attachments, notifications"""
    log("D4: MongoDB verification for dev-issue")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        task_id = qa_dev_issue_ids[0]
        
        # Get task
        task = db.tasks.find_one({"id": task_id}, {"_id": 0})
        assert task is not None, f"Task {task_id} not found in MongoDB"
        
        # Verify space
        assert task.get("space") == "utvikling", f"Expected space='utvikling', got {task.get('space')}"
        
        # Verify labels
        assert "innmeldt" in task.get("labels", []), f"Expected 'innmeldt' in labels: {task.get('labels')}"
        
        # Verify productId (Forvalter-plattformen)
        product_id = task.get("productId")
        assert product_id is not None, f"productId is null"
        product = db.dev_products.find_one({"id": product_id}, {"_id": 0})
        assert product is not None, f"Product {product_id} not found"
        assert "forvalter" in product.get("name", "").lower(), f"Expected Forvalter-plattformen, got {product.get('name')}"
        log(f"  ✓ Task linked to Forvalter-plattformen (id={product_id})")
        
        # Verify componentId (QA-Testmodul auto-created)
        component_id = task.get("componentId")
        assert component_id is not None, f"componentId is null"
        components = product.get("components", [])
        qa_comp = [c for c in components if c.get("name") == "QA-Testmodul"]
        assert len(qa_comp) > 0, f"QA-Testmodul not found in product components: {components}"
        assert qa_comp[0].get("id") == component_id, f"Component id mismatch"
        log(f"  ✓ Component 'QA-Testmodul' auto-created (id={component_id})")
        
        # Verify description contains context
        description = task.get("description", "")
        assert "QA Reporter" in description, f"Reporter name not in description"
        assert "QA-Testmodul" in description, f"Module not in description"
        assert "Meldt inn fra Forvalter-plattformen" in description, f"Source not in description"
        log(f"  ✓ Description contains reporter and context")
        
        # Verify attachments
        attachments = task.get("attachments", [])
        assert len(attachments) == 1, f"Expected 1 attachment, got {len(attachments)}"
        log(f"  ✓ Task has 1 attachment")
        
        # Verify task_files
        task_files = list(db.task_files.find({"taskId": task_id}, {"_id": 0}))
        assert len(task_files) == 1, f"Expected 1 task_file, got {len(task_files)}"
        log(f"  ✓ task_files has 1 document")
        
        # Verify notifications
        notifications = list(db.notifications.find({"taskId": task_id}, {"_id": 0}))
        assert len(notifications) >= 1, f"Expected at least 1 notification, got {len(notifications)}"
        innmeldt_notif = [n for n in notifications if n.get("type") == "innmeldt"]
        assert len(innmeldt_notif) >= 1, f"Expected at least 1 'innmeldt' notification, got {len(innmeldt_notif)}"
        log(f"  ✓ notifications has {len(notifications)} documents including 'innmeldt' type")
        
        log(f"✅ D4 PASS: MongoDB verification complete")
        return True
    except Exception as e:
        log(f"❌ D4 FAIL: {e}")
        return False

def test_d5_dev_issue_idempotency():
    """D5. POST same event_id → 200 {duplicate:true, same task_id}"""
    log("D5: Dev-issue idempotency")
    try:
        headers = {"x-bridge-secret": BRIDGE_SECRET}
        payload = {
            "event_id": "qa-di-100",
            "title": "QA Innmeldt feil",
            "type": "bug"
        }
        
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 200, f"Expected 200 for duplicate, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok:true, got {data}"
        assert data.get("duplicate") is True, f"Expected duplicate:true, got {data}"
        assert data.get("task_id") == qa_dev_issue_ids[0], f"Expected same task_id, got {data.get('task_id')}"
        
        # Verify no duplicate in MongoDB
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        count = db.tasks.count_documents({"inbound.eventId": "qa-di-100"})
        assert count == 1, f"Expected 1 task with event_id, got {count}"
        
        log(f"✅ D5 PASS: Idempotency working (duplicate:true, same task_id, no duplicate in DB)")
        return True
    except Exception as e:
        log(f"❌ D5 FAIL: {e}")
        return False

def test_d6_dev_issue_variations():
    """D6. POST without title → 400, POST with Bearer auth → works"""
    log("D6: Dev-issue variations")
    try:
        headers = {"x-bridge-secret": BRIDGE_SECRET}
        
        # Without title
        payload = {"type": "bug"}
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 without title, got {r.status_code}: {r.text}"
        log(f"  ✓ Without title returns 400")
        
        # With Authorization: Bearer
        headers = {"Authorization": f"Bearer {BRIDGE_SECRET}"}
        payload = {
            "event_id": "qa-di-101",
            "title": "QA Bearer-test",
            "type": "improvement",
            "severity": "lav"
        }
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 201, f"Expected 201 with Bearer auth, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("type") == "forbedring", f"Expected type='forbedring', got {data.get('type')}"
        assert data.get("priority") == 3, f"Expected priority=3, got {data.get('priority')}"
        assert data.get("component") is None, f"Expected component=null, got {data.get('component')}"
        assert data.get("attachments") == 0, f"Expected attachments=0, got {data.get('attachments')}"
        
        qa_dev_issue_ids.append(data["task_id"])
        log(f"  ✓ Bearer auth works, created task {data['task_id']} with type=forbedring, priority=3")
        
        log(f"✅ D6 PASS: Variations working")
        return True
    except Exception as e:
        log(f"❌ D6 FAIL: {e}")
        return False

def test_d7_dev_issue_invalid_screenshot():
    """D7. Invalid screenshot (dataUrl:'data:text/html;base64,...') → 201 with attachments:0"""
    log("D7: Dev-issue invalid screenshot")
    try:
        headers = {"x-bridge-secret": BRIDGE_SECRET}
        payload = {
            "event_id": "qa-di-102",
            "title": "QA Bilde-test",
            "screenshots": [{
                "dataUrl": "data:text/html;base64,PGI+"
            }]
        }
        
        r = requests.post(f"{BASE_URL}/bridge/dev-issue", headers=headers, json=payload, timeout=10)
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("attachments") == 0, f"Expected attachments=0 for invalid screenshot, got {data.get('attachments')}"
        
        qa_dev_issue_ids.append(data["task_id"])
        log(f"✅ D7 PASS: Invalid screenshot ignored silently (attachments=0)")
        return True
    except Exception as e:
        log(f"❌ D7 FAIL: {e}")
        return False

def test_e1_cleanup_tasks():
    """E1. Delete all QA tasks"""
    log("E1: Delete all QA tasks")
    try:
        # Delete QA Devfelt Sak
        if qa_task_id:
            r = requests.delete(f"{BASE_URL}/admin/tasks/{qa_task_id}", params={"key": ADMIN_KEY}, timeout=10)
            assert r.status_code == 200, f"Failed to delete task {qa_task_id}: {r.text}"
            log(f"  ✓ Deleted QA Devfelt Sak ({qa_task_id})")
        
        # Delete dev-issue tasks
        for task_id in qa_dev_issue_ids:
            r = requests.delete(f"{BASE_URL}/admin/tasks/{task_id}", params={"key": ADMIN_KEY}, timeout=10)
            assert r.status_code == 200, f"Failed to delete task {task_id}: {r.text}"
            log(f"  ✓ Deleted dev-issue task ({task_id})")
        
        log(f"✅ E1 PASS: Deleted {1 + len(qa_dev_issue_ids)} QA tasks")
        return True
    except Exception as e:
        log(f"❌ E1 FAIL: {e}")
        return False

def test_e2_cleanup_mongodb():
    """E2. MongoDB cleanup: task_files, notifications, QA product, QA-Testmodul component"""
    log("E2: MongoDB cleanup")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete task_files for QA tasks
        all_qa_task_ids = [qa_task_id] + qa_dev_issue_ids if qa_task_id else qa_dev_issue_ids
        result = db.task_files.delete_many({"taskId": {"$in": all_qa_task_ids}})
        log(f"  ✓ Deleted {result.deleted_count} task_files")
        
        # Delete notifications for QA tasks
        result = db.notifications.delete_many({"taskId": {"$in": all_qa_task_ids}})
        log(f"  ✓ Deleted {result.deleted_count} notifications")
        
        # Delete QA product
        if qa_product_id:
            result = db.dev_products.delete_one({"id": qa_product_id})
            log(f"  ✓ Deleted QA product ({result.deleted_count} doc)")
        
        # Remove QA-Testmodul component from Forvalter-plattformen
        result = db.dev_products.update_one(
            {"name": {"$regex": "forvalter", "$options": "i"}},
            {"$pull": {"components": {"name": "QA-Testmodul"}}}
        )
        log(f"  ✓ Removed QA-Testmodul component from Forvalter-plattformen ({result.modified_count} modified)")
        
        log(f"✅ E2 PASS: MongoDB cleanup complete")
        return True
    except Exception as e:
        log(f"❌ E2 FAIL: {e}")
        return False

def test_e3_verify_cleanup():
    """E3. Verify: 0 QA tasks, 0 QA products, Forvalter-plattformen has Interessenter but not QA-Testmodul"""
    log("E3: Verify cleanup")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Verify 0 tasks with title starting 'QA '
        count = db.tasks.count_documents({"title": {"$regex": "^QA ", "$options": "i"}})
        assert count == 0, f"Expected 0 QA tasks, found {count}"
        log(f"  ✓ 0 tasks with title starting 'QA '")
        
        # Verify 0 dev_products with name prefix 'QA '
        count = db.dev_products.count_documents({"name": {"$regex": "^QA ", "$options": "i"}})
        assert count == 0, f"Expected 0 QA products, found {count}"
        log(f"  ✓ 0 dev_products with name prefix 'QA '")
        
        # Verify Forvalter-plattformen has Interessenter but not QA-Testmodul
        forvalter = db.dev_products.find_one({"name": {"$regex": "forvalter", "$options": "i"}}, {"_id": 0})
        assert forvalter is not None, f"Forvalter-plattformen not found"
        
        components = forvalter.get("components", [])
        component_names = [c.get("name") for c in components]
        
        assert "Interessenter" in component_names, f"'Interessenter' component missing from Forvalter-plattformen: {component_names}"
        assert "QA-Testmodul" not in component_names, f"'QA-Testmodul' should be removed: {component_names}"
        log(f"  ✓ Forvalter-plattformen has 'Interessenter' but not 'QA-Testmodul'")
        
        # Verify 0 QA task_files
        count = db.task_files.count_documents({"name": {"$regex": "^qa", "$options": "i"}})
        log(f"  ✓ {count} QA task_files remaining (acceptable if 0)")
        
        # Verify 0 QA notifications
        count = db.notifications.count_documents({"text": {"$regex": "QA", "$options": "i"}})
        log(f"  ✓ {count} QA notifications remaining (acceptable if 0)")
        
        log(f"✅ E3 PASS: Cleanup verification complete")
        return True
    except Exception as e:
        log(f"❌ E3 FAIL: {e}")
        return False

def main():
    log("=" * 80)
    log("UTVIKLINGSSAKER KOMPLETT - Backend Test Suite")
    log("=" * 80)
    
    tests = [
        # A) DEV-PRODUCTS CRUD
        ("A1", test_a1_get_dev_products),
        ("A2", test_a2_post_dev_product),
        ("A3", test_a3_post_without_name),
        ("A4", test_a4_put_dev_product),
        ("A5", test_a5_put_validation),
        ("A6", test_a6_delete_in_use),
        ("A7", test_a7_get_without_key),
        
        # B) PUT /admin/tasks/:id DEVELOPMENT FIELDS
        ("B1", test_b1_create_qa_task),
        ("B2", test_b2_put_tasktype),
        ("B3", test_b3_put_invalid_tasktype),
        ("B4", test_b4_put_productid),
        ("B5", test_b5_put_componentid),
        ("B6", test_b6_product_switch_resets_component),
        ("B7", test_b7_regression),
        
        # C) INSIGHTS DEV-BLOCK
        ("C1", test_c1_insights_dev_block),
        ("C2", test_c2_insights_dev_typer),
        
        # D) POST /api/bridge/dev-issue
        ("D1", test_d1_dev_issue_discovery),
        ("D2", test_d2_dev_issue_auth),
        ("D3", test_d3_dev_issue_full_post),
        ("D4", test_d4_dev_issue_mongodb_verification),
        ("D5", test_d5_dev_issue_idempotency),
        ("D6", test_d6_dev_issue_variations),
        ("D7", test_d7_dev_issue_invalid_screenshot),
        
        # E) MANDATORY CLEANUP
        ("E1", test_e1_cleanup_tasks),
        ("E2", test_e2_cleanup_mongodb),
        ("E3", test_e3_verify_cleanup),
    ]
    
    passed = 0
    failed = 0
    
    for test_id, test_func in tests:
        log("")
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            log(f"❌ {test_id} EXCEPTION: {e}")
            failed += 1
    
    log("")
    log("=" * 80)
    log(f"RESULTS: {passed}/{len(tests)} tests passed, {failed} failed")
    log("=" * 80)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
