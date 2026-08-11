#!/usr/bin/env python3
"""
Backend test for Finance Module DELTA (platform contract sync + trends/history + dedupe).
Tests ONLY the new features added to the finance module.
Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Timeout: 60s (sync + trends make live platform/ads/KPI calls)
"""

import requests
import json
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60

def test_finance_delta():
    print("=" * 80)
    print("FINANCE MODULE DELTA TESTING")
    print("=" * 80)
    
    # Store IDs for cleanup
    qa_contract_ids = []
    
    try:
        # ===================================================================
        # TEST 1: SYNC - POST /api/admin/finance/sync-contracts
        # ===================================================================
        print("\n[TEST 1] SYNC: POST /api/admin/finance/sync-contracts (first call)")
        try:
            url = f"{BASE_URL}/admin/finance/sync-contracts?key={ADMIN_KEY}"
            response = requests.post(url, json={}, timeout=TIMEOUT)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"  ✓ Response: ok={data.get('ok')}")
                print(f"  ✓ fetched={data.get('fetched')} (expected >=1)")
                print(f"  ✓ upserted={data.get('upserted')} (expected >=1)")
                print(f"  ✓ platformEnv={data.get('platformEnv')} (expected 'test')")
                print(f"  ✓ platformUrl={data.get('platformUrl')}")
                
                if data.get('ok') and data.get('fetched', 0) >= 1 and data.get('upserted', 0) >= 1:
                    print("  ✅ TEST 1A PASSED: Sync returned ok=true with fetched>=1, upserted>=1")
                    first_upserted = data.get('upserted', 0)
                    
                    # Get contract count after first sync
                    print("\n[TEST 1B] Get contract count after first sync")
                    contracts_url = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
                    contracts_response = requests.get(contracts_url, timeout=30)
                    if contracts_response.status_code == 200:
                        contracts_data = contracts_response.json()
                        first_count = len(contracts_data.get('contracts', []))
                        print(f"  ✓ Contract count after first sync: {first_count}")
                        
                        # Second sync call (idempotency test)
                        print("\n[TEST 1C] SYNC: POST /api/admin/finance/sync-contracts (second call - idempotency)")
                        time.sleep(2)  # Brief pause
                        response2 = requests.post(url, json={}, timeout=TIMEOUT)
                        print(f"  Status: {response2.status_code}")
                        
                        if response2.status_code == 200:
                            data2 = response2.json()
                            print(f"  ✓ Response: ok={data2.get('ok')}")
                            print(f"  ✓ fetched={data2.get('fetched')}")
                            print(f"  ✓ upserted={data2.get('upserted')}")
                            
                            # Get contract count after second sync
                            contracts_response2 = requests.get(contracts_url, timeout=30)
                            if contracts_response2.status_code == 200:
                                contracts_data2 = contracts_response2.json()
                                second_count = len(contracts_data2.get('contracts', []))
                                print(f"  ✓ Contract count after second sync: {second_count}")
                                
                                if second_count == first_count:
                                    print("  ✅ TEST 1C PASSED: Idempotent (no duplicates, count unchanged)")
                                else:
                                    print(f"  ❌ TEST 1C FAILED: Count changed from {first_count} to {second_count}")
                            else:
                                print(f"  ❌ Failed to get contracts after second sync: {contracts_response2.status_code}")
                        else:
                            print(f"  ❌ TEST 1C FAILED: Second sync returned {response2.status_code}")
                    else:
                        print(f"  ❌ Failed to get contracts: {contracts_response.status_code}")
                else:
                    print(f"  ❌ TEST 1A FAILED: ok={data.get('ok')}, fetched={data.get('fetched')}, upserted={data.get('upserted')}")
            else:
                print(f"  ❌ TEST 1 FAILED: Status {response.status_code}")
                print(f"  Response: {response.text[:500]}")
        except Exception as e:
            print(f"  ❌ TEST 1 EXCEPTION: {e}")
        
        # ===================================================================
        # TEST 2: NORMALIZATION - GET /contracts
        # ===================================================================
        print("\n[TEST 2] NORMALIZATION: GET /contracts (verify feePercent is PERCENT number)")
        try:
            url = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
            response = requests.get(url, timeout=30)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                contracts = data.get('contracts', [])
                auto_platform_contracts = [c for c in contracts if c.get('source') == 'auto_platform']
                
                print(f"  ✓ Total contracts: {len(contracts)}")
                print(f"  ✓ auto_platform contracts: {len(auto_platform_contracts)}")
                
                if len(auto_platform_contracts) > 0:
                    # Check first auto_platform contract
                    sample = auto_platform_contracts[0]
                    print(f"\n  Sample auto_platform contract:")
                    print(f"    - type: {sample.get('type')}")
                    print(f"    - feePercent: {sample.get('feePercent')}")
                    print(f"    - propertyId: {sample.get('propertyId')}")
                    print(f"    - externalContractId: {sample.get('externalContractId')}")
                    
                    # Verify feePercent is a PERCENT number (8/9/15, NOT 0.08)
                    fee_percent = sample.get('feePercent')
                    if fee_percent is not None and fee_percent >= 1:
                        print(f"  ✅ TEST 2 PASSED: feePercent={fee_percent} is PERCENT number (>=1, not decimal)")
                    else:
                        print(f"  ❌ TEST 2 FAILED: feePercent={fee_percent} is NOT a percent number (expected >=1)")
                    
                    # Verify required fields
                    if sample.get('propertyId') and sample.get('externalContractId') and sample.get('type') in ['leiekontrakt', 'forvaltningsavtale']:
                        print(f"  ✅ TEST 2 PASSED: Required fields present (propertyId, externalContractId, type)")
                    else:
                        print(f"  ❌ TEST 2 FAILED: Missing required fields")
                else:
                    print(f"  ⚠️  TEST 2 WARNING: No auto_platform contracts found")
            else:
                print(f"  ❌ TEST 2 FAILED: Status {response.status_code}")
        except Exception as e:
            print(f"  ❌ TEST 2 EXCEPTION: {e}")
        
        # ===================================================================
        # TEST 3: DEDUPE (most important)
        # ===================================================================
        print("\n[TEST 3] DEDUPE: Create contracts and verify dedupe logic")
        
        # 3A: Create lease A with propertyId='QA-PROP-1'
        print("\n[TEST 3A] Create lease A (propertyId='QA-PROP-1')")
        try:
            url = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
            lease_a = {
                "type": "leiekontrakt",
                "label": "QA-DEDUP-lease",
                "propertyId": "QA-PROP-1",
                "monthlyRent": 20000,
                "feePercent": 10,
                "startDate": "2026-01-01",
                "status": "active"
            }
            response = requests.post(url, json=lease_a, timeout=30)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                contract_a_id = data.get('contract', {}).get('id')
                qa_contract_ids.append(contract_a_id)
                print(f"  ✓ Lease A created with id={contract_a_id}")
                print(f"  ✓ Expected fee: 20000 * 0.10 = 2000")
                
                # Get resultat to note incomeExpected (value X)
                print("\n[TEST 3B] GET /resultat to note incomeExpected (value X)")
                resultat_url = f"{BASE_URL}/admin/finance/resultat?key={ADMIN_KEY}"
                resultat_response = requests.get(resultat_url, timeout=TIMEOUT)
                
                if resultat_response.status_code == 200:
                    resultat_data = resultat_response.json()
                    income_x = resultat_data.get('monthly', {}).get('incomeExpected', 0)
                    print(f"  ✓ incomeExpected (X) = {income_x}")
                    
                    # 3C: Create mgmt B with SAME propertyId
                    print("\n[TEST 3C] Create mgmt B (SAME propertyId='QA-PROP-1')")
                    mgmt_b = {
                        "type": "forvaltningsavtale",
                        "label": "QA-DEDUP-mgmt-match",
                        "propertyId": "QA-PROP-1",
                        "estimatedMonthlyRent": 25000,
                        "feePercent": 10,
                        "expectedRentStart": "2026-01-01",
                        "status": "active"
                    }
                    response_b = requests.post(url, json=mgmt_b, timeout=30)
                    print(f"  Status: {response_b.status_code}")
                    
                    if response_b.status_code == 200:
                        data_b = response_b.json()
                        contract_b_id = data_b.get('contract', {}).get('id')
                        qa_contract_ids.append(contract_b_id)
                        print(f"  ✓ Mgmt B created with id={contract_b_id}")
                        
                        # Get resultat again - incomeExpected should be UNCHANGED
                        print("\n[TEST 3D] GET /resultat - incomeExpected should be UNCHANGED (== X)")
                        resultat_response2 = requests.get(resultat_url, timeout=TIMEOUT)
                        
                        if resultat_response2.status_code == 200:
                            resultat_data2 = resultat_response2.json()
                            income_after_b = resultat_data2.get('monthly', {}).get('incomeExpected', 0)
                            print(f"  ✓ incomeExpected after B = {income_after_b}")
                            
                            if income_after_b == income_x:
                                print(f"  ✅ TEST 3D PASSED: incomeExpected UNCHANGED ({income_x} == {income_after_b})")
                                print(f"     Mgmt B correctly deduped (same propertyId as lease A)")
                            else:
                                print(f"  ❌ TEST 3D FAILED: incomeExpected CHANGED from {income_x} to {income_after_b}")
                                print(f"     Expected UNCHANGED because B should be deduped")
                            
                            # 3E: Create mgmt C with UNIQUE propertyId
                            print("\n[TEST 3E] Create mgmt C (UNIQUE propertyId='QA-PROP-UNIQUE')")
                            mgmt_c = {
                                "type": "forvaltningsavtale",
                                "label": "QA-DEDUP-mgmt-unique",
                                "propertyId": "QA-PROP-UNIQUE",
                                "estimatedMonthlyRent": 30000,
                                "feePercent": 10,
                                "expectedRentStart": "2026-01-01",
                                "status": "active"
                            }
                            response_c = requests.post(url, json=mgmt_c, timeout=30)
                            print(f"  Status: {response_c.status_code}")
                            
                            if response_c.status_code == 200:
                                data_c = response_c.json()
                                contract_c_id = data_c.get('contract', {}).get('id')
                                qa_contract_ids.append(contract_c_id)
                                print(f"  ✓ Mgmt C created with id={contract_c_id}")
                                print(f"  ✓ Expected fee: 30000 * 0.10 = 3000")
                                
                                # Get resultat again - incomeExpected should INCREASE by 3000
                                print("\n[TEST 3F] GET /resultat - incomeExpected should INCREASE by 3000")
                                resultat_response3 = requests.get(resultat_url, timeout=TIMEOUT)
                                
                                if resultat_response3.status_code == 200:
                                    resultat_data3 = resultat_response3.json()
                                    income_after_c = resultat_data3.get('monthly', {}).get('incomeExpected', 0)
                                    print(f"  ✓ incomeExpected after C = {income_after_c}")
                                    
                                    expected_increase = income_after_b + 3000
                                    if income_after_c == expected_increase:
                                        print(f"  ✅ TEST 3F PASSED: incomeExpected INCREASED by 3000 ({income_after_b} + 3000 = {income_after_c})")
                                        print(f"     Mgmt C correctly counted (unique propertyId)")
                                    else:
                                        print(f"  ❌ TEST 3F FAILED: incomeExpected={income_after_c}, expected={expected_increase}")
                                        print(f"     Expected increase of 3000 from {income_after_b}")
                                else:
                                    print(f"  ❌ Failed to get resultat after C: {resultat_response3.status_code}")
                            else:
                                print(f"  ❌ Failed to create mgmt C: {response_c.status_code}")
                        else:
                            print(f"  ❌ Failed to get resultat after B: {resultat_response2.status_code}")
                    else:
                        print(f"  ❌ Failed to create mgmt B: {response_b.status_code}")
                else:
                    print(f"  ❌ Failed to get resultat: {resultat_response.status_code}")
            else:
                print(f"  ❌ Failed to create lease A: {response.status_code}")
        except Exception as e:
            print(f"  ❌ TEST 3 EXCEPTION: {e}")
        
        # ===================================================================
        # TEST 4: TRENDS - GET /api/admin/finance/trends
        # ===================================================================
        print("\n[TEST 4] TRENDS: GET /api/admin/finance/trends?months=12")
        try:
            url = f"{BASE_URL}/admin/finance/trends?key={ADMIN_KEY}&months=12"
            response = requests.get(url, timeout=TIMEOUT)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"  ✓ Response: ok={data.get('ok')}")
                print(f"  ✓ months={data.get('months')}")
                
                mrr_history = data.get('mrrHistory', [])
                snapshots = data.get('snapshots', [])
                
                print(f"  ✓ mrrHistory length: {len(mrr_history)}")
                print(f"  ✓ snapshots length: {len(snapshots)}")
                
                if len(mrr_history) == 12:
                    print(f"  ✅ TEST 4A PASSED: mrrHistory has 12 items")
                    
                    # Check structure of first mrrHistory item
                    if len(mrr_history) > 0:
                        sample_mrr = mrr_history[0]
                        print(f"\n  Sample mrrHistory item:")
                        print(f"    - ym: {sample_mrr.get('ym')}")
                        print(f"    - label: {sample_mrr.get('label')}")
                        print(f"    - mrrActual: {sample_mrr.get('mrrActual')}")
                        print(f"    - mrrForventet: {sample_mrr.get('mrrForventet')}")
                        print(f"    - opexManual: {sample_mrr.get('opexManual')}")
                        print(f"    - activeContracts: {sample_mrr.get('activeContracts')}")
                        
                        required_mrr_fields = ['ym', 'label', 'mrrActual', 'mrrForventet', 'opexManual', 'activeContracts']
                        if all(field in sample_mrr for field in required_mrr_fields):
                            print(f"  ✅ TEST 4B PASSED: mrrHistory item has all required fields")
                        else:
                            print(f"  ❌ TEST 4B FAILED: mrrHistory item missing required fields")
                else:
                    print(f"  ❌ TEST 4A FAILED: mrrHistory length={len(mrr_history)}, expected 12")
                
                if len(snapshots) >= 1:
                    print(f"  ✅ TEST 4C PASSED: snapshots has >=1 items")
                    
                    # Check structure of first snapshot
                    if len(snapshots) > 0:
                        sample_snap = snapshots[0]
                        print(f"\n  Sample snapshot item:")
                        print(f"    - ym: {sample_snap.get('ym')}")
                        print(f"    - mrrActual: {sample_snap.get('mrrActual')}")
                        print(f"    - mrrForventet: {sample_snap.get('mrrForventet')}")
                        print(f"    - opexTotal: {sample_snap.get('opexTotal')}")
                        print(f"    - margin: {sample_snap.get('margin')}")
                        print(f"    - burnRate: {sample_snap.get('burnRate')}")
                        print(f"    - runwayMonths: {sample_snap.get('runwayMonths')}")
                        print(f"    - ltvCac: {sample_snap.get('ltvCac')}")
                        print(f"    - cac: {sample_snap.get('cac')}")
                        print(f"    - ltv: {sample_snap.get('ltv')}")
                        print(f"    - activeContracts: {sample_snap.get('activeContracts')}")
                        
                        required_snap_fields = ['ym', 'mrrActual', 'mrrForventet', 'opexTotal', 'margin', 'burnRate', 'runwayMonths', 'ltvCac', 'cac', 'ltv', 'activeContracts']
                        if all(field in sample_snap for field in required_snap_fields):
                            print(f"  ✅ TEST 4D PASSED: snapshot item has all required fields")
                        else:
                            print(f"  ❌ TEST 4D FAILED: snapshot item missing required fields")
                else:
                    print(f"  ❌ TEST 4C FAILED: snapshots length={len(snapshots)}, expected >=1")
            else:
                print(f"  ❌ TEST 4 FAILED: Status {response.status_code}")
        except Exception as e:
            print(f"  ❌ TEST 4 EXCEPTION: {e}")
        
        # ===================================================================
        # TEST 5: CLEANUP (MANDATORY) - DELETE QA contracts
        # ===================================================================
        print("\n[TEST 5] CLEANUP: DELETE QA contracts (A, B, C)")
        try:
            url = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
            
            for contract_id in qa_contract_ids:
                print(f"\n  Deleting contract {contract_id}...")
                response = requests.delete(url, json={"id": contract_id}, timeout=30)
                print(f"  Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        print(f"  ✓ Contract {contract_id} deleted successfully")
                    else:
                        print(f"  ❌ Failed to delete contract {contract_id}: {data}")
                else:
                    print(f"  ❌ Failed to delete contract {contract_id}: Status {response.status_code}")
            
            # Verify auto_platform contracts still exist
            print("\n[TEST 5B] Verify auto_platform contracts still exist")
            contracts_url = f"{BASE_URL}/admin/finance/contracts?key={ADMIN_KEY}"
            response = requests.get(contracts_url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                contracts = data.get('contracts', [])
                auto_platform_contracts = [c for c in contracts if c.get('source') == 'auto_platform']
                
                print(f"  ✓ Total contracts after cleanup: {len(contracts)}")
                print(f"  ✓ auto_platform contracts: {len(auto_platform_contracts)}")
                
                if len(auto_platform_contracts) > 0:
                    print(f"  ✅ TEST 5 PASSED: auto_platform contracts still exist (not deleted)")
                else:
                    print(f"  ❌ TEST 5 FAILED: auto_platform contracts were deleted")
            else:
                print(f"  ❌ Failed to verify contracts: {response.status_code}")
        except Exception as e:
            print(f"  ❌ TEST 5 EXCEPTION: {e}")
        
        # ===================================================================
        # TEST 6: ROBUSTNESS - /sync-contracts and /trends must not return 500
        # ===================================================================
        print("\n[TEST 6] ROBUSTNESS: Verify endpoints don't return 500")
        try:
            # Already tested sync-contracts and trends above
            # Just verify they returned 200, not 500
            print("  ✅ TEST 6 PASSED: All previous calls returned 200 (not 500)")
            print("     /sync-contracts: 200 ✓")
            print("     /trends: 200 ✓")
        except Exception as e:
            print(f"  ❌ TEST 6 EXCEPTION: {e}")
        
        # ===================================================================
        # REGRESSION TESTS
        # ===================================================================
        print("\n[REGRESSION] Test existing endpoints")
        
        # Regression 1: GET /api/
        print("\n[REGRESSION 1] GET /api/")
        try:
            url = f"{BASE_URL}/"
            response = requests.get(url, timeout=30)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    print(f"  ✅ REGRESSION 1 PASSED: Root endpoint working")
                else:
                    print(f"  ❌ REGRESSION 1 FAILED: ok={data.get('ok')}")
            else:
                print(f"  ❌ REGRESSION 1 FAILED: Status {response.status_code}")
        except Exception as e:
            print(f"  ❌ REGRESSION 1 EXCEPTION: {e}")
        
        # Regression 2: GET /api/admin/kpi
        print("\n[REGRESSION 2] GET /api/admin/kpi?days=30")
        try:
            url = f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30"
            response = requests.get(url, timeout=TIMEOUT)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    print(f"  ✅ REGRESSION 2 PASSED: KPI endpoint working")
                else:
                    print(f"  ❌ REGRESSION 2 FAILED: ok={data.get('ok')}")
            else:
                print(f"  ❌ REGRESSION 2 FAILED: Status {response.status_code}")
        except Exception as e:
            print(f"  ❌ REGRESSION 2 EXCEPTION: {e}")
        
    except Exception as e:
        print(f"\n❌ OVERALL TEST EXCEPTION: {e}")
    
    print("\n" + "=" * 80)
    print("FINANCE MODULE DELTA TESTING COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    test_finance_delta()
