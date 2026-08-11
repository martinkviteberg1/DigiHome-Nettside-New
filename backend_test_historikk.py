#!/usr/bin/env python3
"""
Backend test for Historikk-modulen (imported leads).
Tests sync, list with effective fields, override validation, re-sync persistence, and cleanup.
"""
import asyncio
import aiohttp
import json
from typing import Dict, Any, List

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

class HistorikkTester:
    def __init__(self):
        self.session = None
        self.test_overrides = []  # Track test overrides for cleanup
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_sync_idempotent(self):
        """Test 1: SYNC IDEMPOTENT"""
        print("\n" + "="*80)
        print("TEST 1: SYNC IDEMPOTENT")
        print("="*80)
        
        try:
            # Test without key (should be 401)
            print("\n[1a] POST /api/admin/imported-leads/sync WITHOUT key (expect 401)...")
            async with self.session.post(f"{BASE_URL}/admin/imported-leads/sync", json={}) as resp:
                status = resp.status
                print(f"✓ Status: {status}")
                if status != 401:
                    print(f"❌ FAIL: Expected 401, got {status}")
                    return False
                print("✓ PASS: 401 without key")
            
            # Test with key (should be 200)
            print("\n[1b] POST /api/admin/imported-leads/sync WITH key (expect 200)...")
            async with self.session.post(f"{BASE_URL}/admin/imported-leads/sync?key={ADMIN_KEY}", json={}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                fetched = data.get('fetched', 0)
                inserted = data.get('inserted', 0)
                updated_tracked = data.get('updatedTracked', 0)
                
                print(f"✓ Fetched: {fetched} (expected ~74)")
                print(f"✓ Inserted: {inserted} (expected 0 for idempotent)")
                print(f"✓ UpdatedTracked: {updated_tracked}")
                
                if fetched < 50 or fetched > 100:
                    print(f"⚠ WARNING: Fetched count {fetched} outside expected range 50-100")
                
                if inserted != 0:
                    print(f"⚠ WARNING: Inserted {inserted}, expected 0 for idempotent sync")
                
                print("✓ PASS: Sync idempotent test passed")
                return True
                
        except Exception as e:
            print(f"❌ EXCEPTION in test_sync_idempotent: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_liste_effektive_felter(self):
        """Test 2: LISTE + EFFEKTIVE FELTER"""
        print("\n" + "="*80)
        print("TEST 2: LISTE + EFFEKTIVE FELTER")
        print("="*80)
        
        try:
            # Get full list
            print("\n[2a] GET /api/admin/imported-leads?list=1&limit=200...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=200") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                # Check required fields
                required_fields = ['total', 'won', 'wonValue', 'byStatus', 'byChannel', 'list']
                for field in required_fields:
                    if field not in data:
                        print(f"❌ FAIL: Missing required field '{field}'")
                        return False
                
                print(f"✓ Total: {data['total']}")
                print(f"✓ Won: {data['won']}")
                print(f"✓ WonValue: {data['wonValue']}")
                print(f"✓ List count: {len(data['list'])}")
                
                # Check list items have required fields
                if data['list']:
                    first_item = data['list'][0]
                    required_item_fields = ['id', 'eff_channel', 'eff_status']
                    for field in required_item_fields:
                        if field not in first_item:
                            print(f"❌ FAIL: List item missing required field '{field}'")
                            return False
                    print(f"✓ List items have required fields: {required_item_fields}")
                
                # Check byChannel contains meta with leads=1
                by_channel = data.get('byChannel', [])
                print(f"\n✓ byChannel: {json.dumps(by_channel, indent=2)}")
                
                meta_channel = next((c for c in by_channel if c.get('channel') == 'meta'), None)
                if not meta_channel:
                    print(f"❌ FAIL: byChannel does not contain 'meta'")
                    return False
                
                if meta_channel.get('leads') != 1:
                    print(f"❌ FAIL: meta channel has {meta_channel.get('leads')} leads, expected 1")
                    return False
                
                print(f"✓ PASS: byChannel contains meta with leads=1")
            
            # Filter by channel=meta
            print("\n[2b] GET /api/admin/imported-leads?list=1&channel=meta...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&channel=meta") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                list_items = data.get('list', [])
                print(f"✓ List count: {len(list_items)}")
                
                if len(list_items) != 1:
                    print(f"❌ FAIL: Expected exactly 1 element with channel=meta, got {len(list_items)}")
                    return False
                
                meta_item = list_items[0]
                print(f"✓ Meta item: {json.dumps(meta_item, indent=2)}")
                
                # Check override fields
                if meta_item.get('override', {}).get('channel') != 'meta':
                    print(f"❌ FAIL: override.channel is not 'meta'")
                    return False
                
                if meta_item.get('eff_won_value') != 15000:
                    print(f"❌ FAIL: eff_won_value is {meta_item.get('eff_won_value')}, expected 15000")
                    return False
                
                print(f"✓ PASS: Filter channel=meta returns 1 element with override.channel='meta' and eff_won_value=15000")
            
            # Filter by status=won
            print("\n[2c] GET /api/admin/imported-leads?list=1&status=won...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&status=won&limit=200") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                list_items = data.get('list', [])
                print(f"✓ List count: {len(list_items)}")
                
                # Check all items have eff_status='won'
                for item in list_items:
                    if item.get('eff_status') != 'won':
                        print(f"❌ FAIL: Item {item.get('id')} has eff_status={item.get('eff_status')}, expected 'won'")
                        return False
                
                print(f"✓ PASS: All {len(list_items)} items have eff_status='won'")
            
            # Search by name
            print("\n[2d] GET /api/admin/imported-leads?list=1&q=<name>...")
            # First get a name from the list
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=1") as resp:
                data = await resp.json()
                if data.get('list'):
                    search_name = data['list'][0].get('name', '').split()[0]  # First word of name
                    if search_name:
                        print(f"✓ Searching for: {search_name}")
                        async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&q={search_name}") as resp2:
                            status = resp2.status
                            data2 = await resp2.json()
                            print(f"✓ Status: {status}")
                            
                            if status != 200:
                                print(f"❌ FAIL: Expected 200, got {status}")
                                return False
                            
                            list_items = data2.get('list', [])
                            print(f"✓ Search results: {len(list_items)} items")
                            
                            if len(list_items) == 0:
                                print(f"⚠ WARNING: No search results for '{search_name}'")
                            else:
                                print(f"✓ PASS: Search returned {len(list_items)} results")
            
            print("\n✓ PASS: Liste + effektive felter test passed")
            return True
            
        except Exception as e:
            print(f"❌ EXCEPTION in test_liste_effektive_felter: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_override_validering(self):
        """Test 3: OVERRIDE-VALIDERING"""
        print("\n" + "="*80)
        print("TEST 3: OVERRIDE-VALIDERING")
        print("="*80)
        
        try:
            # Get elements with eff_channel='unknown'
            print("\n[3a] Finding elements with eff_channel='unknown'...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&channel=unknown&limit=10") as resp:
                data = await resp.json()
                unknown_items = data.get('list', [])
                print(f"✓ Found {len(unknown_items)} items with eff_channel='unknown'")
                
                if len(unknown_items) < 3:
                    print(f"❌ FAIL: Need at least 3 items with eff_channel='unknown', found {len(unknown_items)}")
                    return False
                
                test_id_1 = unknown_items[0]['id']
                test_id_2 = unknown_items[1]['id']
                test_id_3 = unknown_items[2]['id']
                
                print(f"✓ Test IDs: {test_id_1}, {test_id_2}, {test_id_3}")
                self.test_overrides = [test_id_1, test_id_2, test_id_3]
            
            # Test PUT without key (should be 401)
            print("\n[3b] PUT /api/admin/imported-leads WITHOUT key (expect 401)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads", json={"id": test_id_1, "patch": {"channel": "google"}}) as resp:
                status = resp.status
                print(f"✓ Status: {status}")
                if status != 401:
                    print(f"❌ FAIL: Expected 401, got {status}")
                    return False
                print("✓ PASS: 401 without key")
            
            # Test PUT without id/ids (should be 400)
            print("\n[3c] PUT /api/admin/imported-leads without id/ids (expect 400)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"patch": {"channel": "google"}}) as resp:
                status = resp.status
                print(f"✓ Status: {status}")
                if status != 400:
                    print(f"❌ FAIL: Expected 400, got {status}")
                    return False
                print("✓ PASS: 400 without id/ids")
            
            # Test PUT with invalid channel (should be 400)
            print("\n[3d] PUT /api/admin/imported-leads with invalid channel 'tullball' (expect 400)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"id": test_id_1, "patch": {"channel": "tullball"}}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                if status != 400:
                    print(f"❌ FAIL: Expected 400, got {status}")
                    return False
                print("✓ PASS: 400 with invalid channel")
            
            # Test PUT with negative won_value (should be 400)
            print("\n[3e] PUT /api/admin/imported-leads with negative won_value (expect 400)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"id": test_id_1, "patch": {"won_value": -5}}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                if status != 400:
                    print(f"❌ FAIL: Expected 400, got {status}")
                    return False
                print("✓ PASS: 400 with negative won_value")
            
            # Test valid PUT (single)
            print("\n[3f] PUT /api/admin/imported-leads with valid channel='google' (expect 200)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"id": test_id_1, "patch": {"channel": "google"}}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                if data.get('changed') != 1:
                    print(f"❌ FAIL: changed is {data.get('changed')}, expected 1")
                    return False
                
                print("✓ PASS: Valid PUT returned 200 with changed=1")
            
            # Verify eff_channel is now 'google'
            print("\n[3g] Verifying eff_channel is now 'google'...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=200") as resp:
                data = await resp.json()
                item = next((i for i in data.get('list', []) if i['id'] == test_id_1), None)
                if not item:
                    print(f"❌ FAIL: Could not find item {test_id_1} in list")
                    return False
                
                if item.get('eff_channel') != 'google':
                    print(f"❌ FAIL: eff_channel is {item.get('eff_channel')}, expected 'google'")
                    return False
                
                print(f"✓ PASS: eff_channel is now 'google'")
            
            # Test bulk PUT
            print("\n[3h] PUT /api/admin/imported-leads BULK with channel='finn' (expect 200)...")
            async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"ids": [test_id_2, test_id_3], "patch": {"channel": "finn"}}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                if data.get('changed') != 2:
                    print(f"❌ FAIL: changed is {data.get('changed')}, expected 2")
                    return False
                
                print("✓ PASS: Bulk PUT returned 200 with changed=2")
            
            print("\n✓ PASS: Override validering test passed")
            return True
            
        except Exception as e:
            print(f"❌ EXCEPTION in test_override_validering: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_resynk_persistens(self):
        """Test 4: RE-SYNK-PERSISTENS (CRITICAL)"""
        print("\n" + "="*80)
        print("TEST 4: RE-SYNK-PERSISTENS (CRITICAL)")
        print("="*80)
        
        try:
            # Run sync again
            print("\n[4a] POST /api/admin/imported-leads/sync (re-sync)...")
            async with self.session.post(f"{BASE_URL}/admin/imported-leads/sync?key={ADMIN_KEY}", json={}) as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                print(f"✓ Response: {json.dumps(data, indent=2)}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                print("✓ PASS: Re-sync completed")
            
            # Verify overrides still exist
            print("\n[4b] Verifying overrides survived re-sync...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=200") as resp:
                data = await resp.json()
                list_items = data.get('list', [])
                
                # Check test_id_1 still has channel='google'
                item1 = next((i for i in list_items if i['id'] == self.test_overrides[0]), None)
                if not item1:
                    print(f"❌ FAIL: Could not find item {self.test_overrides[0]} in list")
                    return False
                
                if item1.get('eff_channel') != 'google':
                    print(f"❌ FAIL: Item 1 eff_channel is {item1.get('eff_channel')}, expected 'google' (override lost!)")
                    return False
                
                print(f"✓ Item 1 ({self.test_overrides[0]}): eff_channel='google' (override survived)")
                
                # Check test_id_2 and test_id_3 still have channel='finn'
                item2 = next((i for i in list_items if i['id'] == self.test_overrides[1]), None)
                item3 = next((i for i in list_items if i['id'] == self.test_overrides[2]), None)
                
                if not item2 or not item3:
                    print(f"❌ FAIL: Could not find items {self.test_overrides[1]} or {self.test_overrides[2]} in list")
                    return False
                
                if item2.get('eff_channel') != 'finn':
                    print(f"❌ FAIL: Item 2 eff_channel is {item2.get('eff_channel')}, expected 'finn' (override lost!)")
                    return False
                
                if item3.get('eff_channel') != 'finn':
                    print(f"❌ FAIL: Item 3 eff_channel is {item3.get('eff_channel')}, expected 'finn' (override lost!)")
                    return False
                
                print(f"✓ Item 2 ({self.test_overrides[1]}): eff_channel='finn' (override survived)")
                print(f"✓ Item 3 ({self.test_overrides[2]}): eff_channel='finn' (override survived)")
            
            # Check meta override still exists
            print("\n[4c] Verifying main agent's meta override still exists...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&channel=meta") as resp:
                data = await resp.json()
                list_items = data.get('list', [])
                
                if len(list_items) != 1:
                    print(f"❌ FAIL: Expected 1 meta item, found {len(list_items)}")
                    return False
                
                meta_item = list_items[0]
                if meta_item.get('override', {}).get('channel') != 'meta':
                    print(f"❌ FAIL: meta override.channel is not 'meta'")
                    return False
                
                if meta_item.get('eff_won_value') != 15000:
                    print(f"❌ FAIL: meta eff_won_value is {meta_item.get('eff_won_value')}, expected 15000")
                    return False
                
                print(f"✓ Main agent's meta override (won_value=15000) survived re-sync")
            
            print("\n✓ PASS: RE-SYNK-PERSISTENS test passed (CRITICAL - all overrides survived)")
            return True
            
        except Exception as e:
            print(f"❌ EXCEPTION in test_resynk_persistens: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_opprydding(self):
        """Test 5: OPPRYDDING"""
        print("\n" + "="*80)
        print("TEST 5: OPPRYDDING")
        print("="*80)
        
        try:
            # Reset test overrides back to 'unknown'
            print("\n[5a] Resetting test overrides back to channel='unknown'...")
            
            for test_id in self.test_overrides:
                print(f"✓ Resetting {test_id}...")
                async with self.session.put(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}", json={"id": test_id, "patch": {"channel": "unknown"}}) as resp:
                    status = resp.status
                    data = await resp.json()
                    print(f"  Status: {status}, Changed: {data.get('changed')}")
                    
                    if status != 200:
                        print(f"❌ FAIL: Expected 200, got {status}")
                        return False
            
            print("✓ All test overrides reset to 'unknown'")
            
            # Verify only meta override remains
            print("\n[5b] Verifying only meta override remains...")
            async with self.session.get(f"{BASE_URL}/admin/imported-leads?key={ADMIN_KEY}&list=1&limit=200") as resp:
                data = await resp.json()
                by_channel = data.get('byChannel', [])
                
                print(f"✓ byChannel: {json.dumps(by_channel, indent=2)}")
                
                # Check meta channel has exactly 1 lead
                meta_channel = next((c for c in by_channel if c.get('channel') == 'meta'), None)
                if not meta_channel:
                    print(f"❌ FAIL: byChannel does not contain 'meta'")
                    return False
                
                if meta_channel.get('leads') != 1:
                    print(f"❌ FAIL: meta channel has {meta_channel.get('leads')} leads, expected 1")
                    return False
                
                print(f"✓ PASS: Only main agent's meta override remains (byChannel meta=1)")
            
            print("\n✓ PASS: Opprydding test passed")
            return True
            
        except Exception as e:
            print(f"❌ EXCEPTION in test_opprydding: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_regresjon(self):
        """Test 6: REGRESJON"""
        print("\n" + "="*80)
        print("TEST 6: REGRESJON")
        print("="*80)
        
        try:
            # Test GET /api/public/properties
            print("\n[6a] GET /api/public/properties (expect 200 with 3 properties)...")
            async with self.session.get(f"{BASE_URL}/public/properties") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                properties = data.get('properties', [])
                count = data.get('count', 0)
                print(f"✓ Properties count: {count}")
                
                if count != 3:
                    print(f"⚠ WARNING: Expected 3 properties, got {count}")
                else:
                    print(f"✓ PASS: 3 properties returned")
            
            # Test GET /api/admin/newsletter/audiences
            print("\n[6b] GET /api/admin/newsletter/audiences (expect 200)...")
            async with self.session.get(f"{BASE_URL}/admin/newsletter/audiences?key={ADMIN_KEY}") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                print(f"✓ PASS: Newsletter audiences endpoint working")
            
            # Test GET /api/
            print("\n[6c] GET /api/ (expect 200)...")
            async with self.session.get(f"{BASE_URL}/") as resp:
                status = resp.status
                data = await resp.json()
                print(f"✓ Status: {status}")
                
                if status not in [200, 201]:
                    print(f"❌ FAIL: Expected 200 or 201, got {status}")
                    return False
                
                if not data.get('ok'):
                    print(f"❌ FAIL: ok is not true")
                    return False
                
                print(f"✓ PASS: Root endpoint working")
            
            print("\n✓ PASS: Regresjon test passed")
            return True
            
        except Exception as e:
            print(f"❌ EXCEPTION in test_regresjon: {e}")
            import traceback
            traceback.print_exc()
            return False

async def main():
    print("="*80)
    print("HISTORIKK-MODULEN BACKEND TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    results = {}
    
    async with HistorikkTester() as tester:
        # Run all tests in sequence
        results['sync_idempotent'] = await tester.test_sync_idempotent()
        results['liste_effektive_felter'] = await tester.test_liste_effektive_felter()
        results['override_validering'] = await tester.test_override_validering()
        results['resynk_persistens'] = await tester.test_resynk_persistens()
        results['opprydding'] = await tester.test_opprydding()
        results['regresjon'] = await tester.test_regresjon()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n✅ ALL HISTORIKK-MODULEN TESTS PASSED")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
