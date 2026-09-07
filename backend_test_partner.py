#!/usr/bin/env python3
"""
Backend test for Partner functionality in budget API.
Tests partner driver configuration for both digihome and tech companies.

Test plan (from main agent):
(A) DIGIHOME: Create plan with partner enabled, verify all fields
(B) Same plan PUT without partner field - verify partner.paa becomes false
(C) PUT with edge cases - comma in honorarPct, varighetMnd:0, fraMnd:0, andelNyePct:150
(D) Status changes - vedtatt then utkast
(E) XLSX export - verify 200, content-type, body size > 5KB
(F) TECH: Create plan with partner.gjelder fields
(G) GET /planer?selskap=tech - verify tech summary fields
(H) Cleanup - DELETE both QA plans

CRITICAL SAFETY:
- Do NOT delete or modify existing budget plans
- Only create/modify/delete plans we create ("QA Partner DH", "QA Partner Tech")
"""

import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
ADMIN_KEY = os.getenv('ADMIN_KEY', 'dh_admin_b3Kx92Qz7Lm4')
TIMEOUT = 90

def test_partner_functionality():
    """Test partner functionality in budget API"""
    
    print("\n" + "="*80)
    print("PARTNER FUNCTIONALITY IN BUDGET API TEST")
    print("="*80)
    
    # Track created plans for cleanup
    created_plan_ids = []
    qa_dh_id = None
    qa_tech_id = None
    
    try:
        # ============================================================
        # TEST A: DIGIHOME - Create plan with partner enabled
        # ============================================================
        print("\n[TEST A] DIGIHOME - Create plan 'QA Partner DH' with partner enabled")
        
        print("  → PUT /api/admin/budsjett/plan (create 'QA Partner DH' with partner)")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'navn': 'QA Partner DH',
                'selskap': 'digihome',
                'type': 'modell',
                'startYm': '2027-01',
                'antallMnd': 12,
                'drivere': {
                    'nyePerMnd': 2,
                    'partner': {
                        'paa': True,
                        'fastPerMnd': 12000,
                        'honorarPct': 8,
                        'varighetMnd': 12,
                        'andelNyePct': 100,
                        'fraMnd': 1
                    }
                }
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert 'id' in data, "Expected id in response"
        
        qa_dh_id = data['id']
        created_plan_ids.append(qa_dh_id)
        
        print(f"  ✓ Created QA Partner DH plan: id={qa_dh_id}")
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan['drivere']['partner']['paa'] == True, f"Expected partner.paa=true, got {plan['drivere']['partner']['paa']}"
        assert plan['drivere']['partner']['fastPerMnd'] == 12000, f"Expected fastPerMnd=12000, got {plan['drivere']['partner']['fastPerMnd']}"
        assert plan['drivere']['partner']['honorarPct'] == 8, f"Expected honorarPct=8, got {plan['drivere']['partner']['honorarPct']}"
        assert plan['drivere']['partner']['varighetMnd'] == 12, f"Expected varighetMnd=12, got {plan['drivere']['partner']['varighetMnd']}"
        assert plan['drivere']['partner']['andelNyePct'] == 100, f"Expected andelNyePct=100, got {plan['drivere']['partner']['andelNyePct']}"
        assert plan['drivere']['partner']['fraMnd'] == 1, f"Expected fraMnd=1, got {plan['drivere']['partner']['fraMnd']}"
        
        print(f"  ✓ GET plan verified: partner.paa=true, fastPerMnd=12000, honorarPct=8, varighetMnd=12, andelNyePct=100, fraMnd=1")
        
        # Check if modellSammendrag exists in GET /planer
        print(f"  → GET /api/admin/budsjett/planer (check for modellSammendrag)")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/planer?key={ADMIN_KEY}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        planer_data = r.json()
        qa_dh_in_list = None
        for p in planer_data.get('planer', []):
            if p['id'] == qa_dh_id:
                qa_dh_in_list = p
                break
        
        assert qa_dh_in_list is not None, "QA Partner DH not found in planer list"
        
        if 'modellSammendrag' in qa_dh_in_list:
            print(f"  ✓ modellSammendrag exists with fields: {list(qa_dh_in_list['modellSammendrag'].keys())}")
            # Just verify it has numeric values, not specific values
            for key, val in qa_dh_in_list['modellSammendrag'].items():
                assert isinstance(val, (int, float)), f"modellSammendrag.{key} should be numeric, got {type(val)}"
            print(f"  ✓ All modellSammendrag fields are numeric")
        else:
            print(f"  ℹ️  modellSammendrag not present in list (optional)")
        
        print("✅ TEST A PASSED: QA Partner DH plan created with partner enabled")
        
        # ============================================================
        # TEST B: Same plan PUT without partner field
        # ============================================================
        print("\n[TEST B] PUT same plan without partner field - verify partner.paa becomes false")
        
        print(f"  → PUT /api/admin/budsjett/plan (update with drivere without partner)")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'id': qa_dh_id,
                'navn': 'QA Partner DH',
                'selskap': 'digihome',
                'type': 'modell',
                'startYm': '2027-01',
                'antallMnd': 12,
                'drivere': {
                    'nyePerMnd': 2
                    # No partner field
                }
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan['drivere']['partner']['paa'] == False, f"Expected partner.paa=false, got {plan['drivere']['partner']['paa']}"
        
        print(f"  ✓ partner.paa is now false (omitted partner field = disabled)")
        
        print("✅ TEST B PASSED: Omitting partner field disables partner")
        
        # ============================================================
        # TEST C: PUT with edge cases - normalization
        # ============================================================
        print("\n[TEST C] PUT with edge cases - comma in honorarPct, varighetMnd:0, fraMnd:0, andelNyePct:150")
        
        print(f"  → PUT /api/admin/budsjett/plan (edge cases)")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'id': qa_dh_id,
                'navn': 'QA Partner DH',
                'selskap': 'digihome',
                'type': 'modell',
                'startYm': '2027-01',
                'antallMnd': 12,
                'drivere': {
                    'nyePerMnd': 2,
                    'partner': {
                        'paa': True,
                        'fastPerMnd': 12000,
                        'honorarPct': '8,5',  # Comma instead of dot
                        'varighetMnd': 0,      # 0 = lifetime
                        'fraMnd': 0,           # Should be clamped to min 1
                        'andelNyePct': 150     # Should be clamped to max 100
                    }
                }
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        partner = plan['drivere']['partner']
        
        # Verify normalization
        assert partner['honorarPct'] == 8.5, f"Expected honorarPct=8.5 (comma parsed), got {partner['honorarPct']}"
        assert partner['varighetMnd'] == 0, f"Expected varighetMnd=0 (lifetime), got {partner['varighetMnd']}"
        assert partner['fraMnd'] == 1, f"Expected fraMnd=1 (clamped from 0), got {partner['fraMnd']}"
        assert partner['andelNyePct'] == 100, f"Expected andelNyePct=100 (clamped from 150), got {partner['andelNyePct']}"
        
        print(f"  ✓ honorarPct=8.5 (comma parsed)")
        print(f"  ✓ varighetMnd=0 (lifetime)")
        print(f"  ✓ fraMnd=1 (clamped from 0 to min 1)")
        print(f"  ✓ andelNyePct=100 (clamped from 150 to max 100)")
        
        print("✅ TEST C PASSED: Edge cases normalized correctly")
        
        # ============================================================
        # TEST D: Status changes
        # ============================================================
        print("\n[TEST D] Status changes - vedtatt then utkast")
        
        print(f"  → PUT /api/admin/budsjett/plan (status='vedtatt')")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'id': qa_dh_id,
                'navn': 'QA Partner DH',
                'selskap': 'digihome',
                'type': 'modell',
                'startYm': '2027-01',
                'antallMnd': 12,
                'status': 'vedtatt'
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan.get('status') == 'vedtatt', f"Expected status='vedtatt', got {plan.get('status')}"
        print(f"  ✓ status='vedtatt'")
        
        # Change to utkast
        print(f"  → PUT /api/admin/budsjett/plan (status='utkast')")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'id': qa_dh_id,
                'navn': 'QA Partner DH',
                'selskap': 'digihome',
                'type': 'modell',
                'startYm': '2027-01',
                'antallMnd': 12,
                'status': 'utkast'
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan.get('status') == 'utkast', f"Expected status='utkast', got {plan.get('status')}"
        print(f"  ✓ status='utkast'")
        
        print("✅ TEST D PASSED: Status changes working")
        
        # ============================================================
        # TEST E: XLSX export
        # ============================================================
        print("\n[TEST E] XLSX export for QA Partner DH plan")
        
        print(f"  → GET /api/admin/budsjett/plan/xlsx?id={qa_dh_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan/xlsx?key={ADMIN_KEY}&id={qa_dh_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify content-type
        content_type = r.headers.get('content-type', '')
        assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type, \
            f"Expected xlsx content-type, got {content_type}"
        print(f"  ✓ Content-Type: {content_type}")
        
        # Verify body size > 5KB
        body_size = len(r.content)
        assert body_size > 5000, f"Expected body size > 5000 bytes, got {body_size}"
        print(f"  ✓ Body size: {body_size} bytes (> 5000)")
        
        print("✅ TEST E PASSED: XLSX export working")
        
        # ============================================================
        # TEST F: TECH plan with partner.gjelder fields
        # ============================================================
        print("\n[TEST F] TECH - Create plan 'QA Partner Tech' with partner.gjelder")
        
        print("  → PUT /api/admin/budsjett/plan (create 'QA Partner Tech')")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'navn': 'QA Partner Tech',
                'selskap': 'tech',
                'startYm': '2027-01',
                'antallMnd': 12,
                'tech': {
                    'partner': {
                        'paa': True,
                        'fastPerMnd': 12000,
                        'honorarPct': 8,
                        'varighetMnd': 12,
                        'gjelder': {
                            'huseier': True,
                            'bedrift': False,
                            'forvaltning': True
                        }
                    },
                    'kost': {
                        'markedsforingFast': 10000
                    }
                }
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get('ok') == True, "Expected ok:true"
        assert 'id' in data, "Expected id in response"
        
        qa_tech_id = data['id']
        created_plan_ids.append(qa_tech_id)
        
        print(f"  ✓ Created QA Partner Tech plan: id={qa_tech_id}")
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_tech_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_tech_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan['tech']['partner']['paa'] == True, f"Expected tech.partner.paa=true, got {plan['tech']['partner']['paa']}"
        assert plan['tech']['partner']['gjelder']['bedrift'] == False, f"Expected gjelder.bedrift=false, got {plan['tech']['partner']['gjelder']['bedrift']}"
        assert plan['tech']['partner']['gjelder']['huseier'] == True, f"Expected gjelder.huseier=true, got {plan['tech']['partner']['gjelder']['huseier']}"
        assert plan['tech']['partner']['gjelder']['forvaltning'] == True, f"Expected gjelder.forvaltning=true, got {plan['tech']['partner']['gjelder']['forvaltning']}"
        assert plan['tech']['kost']['markedsforingFast'] == 10000, f"Expected markedsforingFast=10000, got {plan['tech']['kost']['markedsforingFast']}"
        
        print(f"  ✓ tech.partner.paa=true")
        print(f"  ✓ tech.partner.gjelder.bedrift=false")
        print(f"  ✓ tech.partner.gjelder.huseier=true")
        print(f"  ✓ tech.partner.gjelder.forvaltning=true")
        print(f"  ✓ tech.kost.markedsforingFast=10000")
        
        # PUT same plan without partner - verify partner.paa becomes false
        print(f"  → PUT /api/admin/budsjett/plan (update tech without partner)")
        r = requests.put(
            f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}",
            json={
                'id': qa_tech_id,
                'navn': 'QA Partner Tech',
                'selskap': 'tech',
                'startYm': '2027-01',
                'antallMnd': 12,
                'tech': {
                    'huseier': {
                        'organiskPerMnd': 3
                    }
                    # No partner field
                }
            },
            timeout=TIMEOUT
        )
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Verify with GET
        print(f"  → GET /api/admin/budsjett/plan?id={qa_tech_id}")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={qa_tech_id}", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        plan = r.json()['plan']
        assert plan['tech']['partner']['paa'] == False, f"Expected tech.partner.paa=false, got {plan['tech']['partner']['paa']}"
        
        print(f"  ✓ tech.partner.paa is now false (omitted partner field = disabled)")
        
        print("✅ TEST F PASSED: QA Partner Tech plan created and partner toggle working")
        
        # ============================================================
        # TEST G: GET /planer?selskap=tech - verify tech summary fields
        # ============================================================
        print("\n[TEST G] GET /api/admin/budsjett/planer?selskap=tech - verify tech summary")
        
        print(f"  → GET /api/admin/budsjett/planer?selskap=tech")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/planer?key={ADMIN_KEY}&selskap=tech", timeout=TIMEOUT)
        print(f"  ← {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        planer = r.json()['planer']
        
        # Find QA Partner Tech in the list
        qa_tech_in_list = None
        for plan in planer:
            if plan['id'] == qa_tech_id:
                qa_tech_in_list = plan
                break
        
        assert qa_tech_in_list is not None, "QA Partner Tech not found in planer list"
        
        # Verify tech summary fields
        assert 'tech' in qa_tech_in_list, "Expected 'tech' object in plan"
        tech_summary = qa_tech_in_list['tech']
        
        assert 'arrExit' in tech_summary, "Expected tech.arrExit"
        assert 'kapitalbehov' in tech_summary, "Expected tech.kapitalbehov"
        
        assert isinstance(tech_summary['arrExit'], (int, float)), "arrExit should be number"
        assert isinstance(tech_summary['kapitalbehov'], (int, float)), "kapitalbehov should be number"
        
        print(f"  ✓ QA Partner Tech in list has tech summary fields:")
        print(f"    - arrExit: {tech_summary['arrExit']}")
        print(f"    - kapitalbehov: {tech_summary['kapitalbehov']}")
        
        print("✅ TEST G PASSED: Tech plans have summary fields in list")
        
        # ============================================================
        # TEST H: CLEANUP - Delete both QA plans
        # ============================================================
        print("\n[TEST H] CLEANUP - Delete both QA plans")
        
        for plan_id in created_plan_ids:
            print(f"  → DELETE /api/admin/budsjett/plan?id={plan_id}")
            r = requests.delete(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_id}", timeout=TIMEOUT)
            print(f"  ← {r.status_code}")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}"
            print(f"  ✓ Deleted plan {plan_id}")
        
        # Verify plans are gone
        print(f"  → GET /api/admin/budsjett/planer (verify cleanup)")
        r = requests.get(f"{BASE_URL}/api/admin/budsjett/planer?key={ADMIN_KEY}", timeout=TIMEOUT)
        planer = r.json()['planer']
        
        remaining_qa_plans = [p for p in planer if p['id'] in created_plan_ids]
        assert len(remaining_qa_plans) == 0, f"Found {len(remaining_qa_plans)} QA plans still in list"
        print(f"  ✓ All QA plans deleted (verified 0 remain)")
        
        print("✅ TEST H PASSED: Cleanup successful")
        
        print("\n" + "="*80)
        print("✅ ALL 8 TESTS PASSED - PARTNER FUNCTIONALITY WORKING PERFECTLY")
        print("="*80)
        print("\nSUMMARY:")
        print("  ✅ (A) DIGIHOME plan with partner enabled - all fields verified")
        print("  ✅ (B) Omitting partner field disables partner (paa=false)")
        print("  ✅ (C) Edge cases normalized: comma→dot, varighetMnd:0, fraMnd clamped to 1, andelNyePct clamped to 100")
        print("  ✅ (D) Status changes working: vedtatt → utkast")
        print("  ✅ (E) XLSX export working: correct content-type, body > 5KB")
        print("  ✅ (F) TECH plan with partner.gjelder fields working")
        print("  ✅ (G) Tech summary fields present in list (arrExit, kapitalbehov)")
        print("  ✅ (H) Cleanup successful - both QA plans deleted")
        print("\nCRITICAL OBSERVATIONS:")
        print(f"  • Partner toggle: paa:true enables partner, omitting partner field disables it")
        print(f"  • Normalization: honorarPct comma→dot, varighetMnd:0 allowed (lifetime), fraMnd min 1, andelNyePct max 100")
        print(f"  • DIGIHOME: partner in drivere.partner")
        print(f"  • TECH: partner in tech.partner with gjelder.{{huseier, bedrift, forvaltning}}")
        print(f"  • XLSX export: returns valid spreadsheet > 5KB")
        print(f"  • Tech summary: plans with selskap='tech' have tech.{{arrExit, kapitalbehov}}")
        print("\nCLEANUP: All QA plans deleted, existing plans preserved")
        
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        
        # Attempt cleanup on failure
        if created_plan_ids:
            print("\n[CLEANUP ON FAILURE] Attempting to delete test plans")
            for plan_id in created_plan_ids:
                try:
                    r = requests.delete(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_id}", timeout=TIMEOUT)
                    print(f"  → Deleted plan {plan_id}: {r.status_code}")
                except Exception as cleanup_error:
                    print(f"  → Failed to delete plan {plan_id}: {cleanup_error}")
        
        return False
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        # Attempt cleanup on error
        if created_plan_ids:
            print("\n[CLEANUP ON ERROR] Attempting to delete test plans")
            for plan_id in created_plan_ids:
                try:
                    r = requests.delete(f"{BASE_URL}/api/admin/budsjett/plan?key={ADMIN_KEY}&id={plan_id}", timeout=TIMEOUT)
                    print(f"  → Deleted plan {plan_id}: {r.status_code}")
                except Exception as cleanup_error:
                    print(f"  → Failed to delete plan {plan_id}: {cleanup_error}")
        
        return False

if __name__ == '__main__':
    success = test_partner_functionality()
    sys.exit(0 if success else 1)
