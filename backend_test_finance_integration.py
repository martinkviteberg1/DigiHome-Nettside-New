#!/usr/bin/env python3
"""
Backend test: Økonomi-integrasjon (ext-telling + plattform-CRM-kostnader).
Tests finance/resultat, finance/likviditet, finance/settings, usage/api, finance/prognose.
"""
import asyncio
import json
import sys
from playwright.async_api import async_playwright

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

async def run_tests():
    print("=" * 80)
    print("ØKONOMI-INTEGRASJON TESTING: ext-telling + plattform-CRM-kostnader")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        test_results = []
        
        # ===================================================================
        # TEST 1: GET /api/admin/finance/resultat
        # ===================================================================
        print("\n[TEST 1] GET /api/admin/finance/resultat")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/admin/finance/resultat?key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK: {data.get('ok')}")
                
                # Verify monthly fields
                monthly = data.get('monthly', {})
                ext_monthly = monthly.get('extMonthly')
                platform_monthly = monthly.get('platformMonthly')
                opex_total = monthly.get('opexTotal')
                
                print(f"  monthly.extMonthly: {ext_monthly} (expected >= 0, ~0.03)")
                print(f"  monthly.platformMonthly: {platform_monthly} (expected >= 0, ~2.75)")
                print(f"  monthly.opexTotal: {opex_total}")
                
                # Verify extMonthly is a number >= 0
                assert isinstance(ext_monthly, (int, float)), f"extMonthly should be number, got {type(ext_monthly)}"
                assert ext_monthly >= 0, f"extMonthly should be >= 0, got {ext_monthly}"
                print(f"  ✓ extMonthly is number >= 0")
                
                # Verify platformMonthly is a number >= 0
                assert isinstance(platform_monthly, (int, float)), f"platformMonthly should be number, got {type(platform_monthly)}"
                assert platform_monthly >= 0, f"platformMonthly should be >= 0, got {platform_monthly}"
                print(f"  ✓ platformMonthly is number >= 0")
                
                # Verify costBreakdown
                cost_breakdown = data.get('costBreakdown', [])
                print(f"  costBreakdown: {len(cost_breakdown)} categories")
                
                # Check if "Plattformdrift (CRM)" category exists
                platform_category = next((c for c in cost_breakdown if c.get('category') == 'Plattformdrift (CRM)'), None)
                if platform_monthly > 0:
                    assert platform_category is not None, "Plattformdrift (CRM) category should exist when platformMonthly > 0"
                    print(f"  ✓ costBreakdown contains 'Plattformdrift (CRM)' with amount {platform_category.get('amount')}")
                else:
                    print(f"  ℹ platformMonthly is 0, Plattformdrift (CRM) category may not exist")
                
                # Check if "API/LLM" category includes ext costs
                api_llm_category = next((c for c in cost_breakdown if c.get('category') == 'API/LLM'), None)
                if api_llm_category:
                    print(f"  ✓ costBreakdown contains 'API/LLM' with amount {api_llm_category.get('amount')}")
                
                # Verify opexTotal calculation (should include all auto costs)
                opex_manual = monthly.get('opexManual', 0)
                ad_spend = monthly.get('adSpendMonthly', 0)
                llm_monthly = monthly.get('llmMonthly', 0)
                expected_opex = opex_manual + ad_spend + llm_monthly + ext_monthly + platform_monthly
                # Allow 0.1 rounding tolerance
                assert abs(opex_total - expected_opex) <= 0.1, f"opexTotal {opex_total} != expected {expected_opex} (tolerance 0.1)"
                print(f"  ✓ opexTotal = opexManual + adSpend + llm + ext + platform (within 0.1 tolerance)")
                
                # Verify configured fields
                configured = data.get('configured', {})
                print(f"  configured.platform: {configured.get('platform')}")
                print(f"  configured.extMonthly: {configured.get('extMonthly')}")
                print(f"  configured.platformMonthly: {configured.get('platformMonthly')}")
                
                assert 'platform' in configured, "configured.platform should exist"
                assert 'extMonthly' in configured, "configured.extMonthly should exist"
                assert 'platformMonthly' in configured, "configured.platformMonthly should exist"
                print(f"  ✓ All configured fields present")
                
                test_results.append(("TEST 1: GET /api/admin/finance/resultat", "PASS", f"extMonthly={ext_monthly}, platformMonthly={platform_monthly}"))
            else:
                test_results.append(("TEST 1: GET /api/admin/finance/resultat", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 1 FAILED: {e}")
            test_results.append(("TEST 1: GET /api/admin/finance/resultat", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 2: GET /api/admin/finance/likviditet
        # ===================================================================
        print("\n[TEST 2] GET /api/admin/finance/likviditet?months=6")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/admin/finance/likviditet?months=6&key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK: {data.get('ok')}")
                
                # Verify autoCosts
                auto_costs = data.get('autoCosts', {})
                print(f"  autoCosts: {json.dumps(auto_costs, indent=2)}")
                
                assert 'adSpendMonthly' in auto_costs, "autoCosts should contain adSpendMonthly"
                assert 'llmMonthly' in auto_costs, "autoCosts should contain llmMonthly"
                assert 'extMonthly' in auto_costs, "autoCosts should contain extMonthly"
                assert 'platformMonthly' in auto_costs, "autoCosts should contain platformMonthly"
                print(f"  ✓ autoCosts contains all required fields")
                
                # Verify scenarios
                scenarios = data.get('scenarios', {})
                faktisk = scenarios.get('faktisk', [])
                forventet = scenarios.get('forventet', [])
                
                print(f"  scenarios.faktisk: {len(faktisk)} months")
                print(f"  scenarios.forventet: {len(forventet)} months")
                
                # Check first month costs include auto costs
                if faktisk:
                    first_month = faktisk[0]
                    costs = first_month.get('costs', 0)
                    print(f"  First month costs: {costs}")
                    
                    # Costs should be >= sum of auto costs (may include manual costs too)
                    min_expected = auto_costs.get('adSpendMonthly', 0) + auto_costs.get('llmMonthly', 0) + auto_costs.get('extMonthly', 0) + auto_costs.get('platformMonthly', 0)
                    assert costs >= min_expected - 0.1, f"First month costs {costs} should be >= auto costs {min_expected}"
                    print(f"  ✓ First month costs >= auto costs")
                
                test_results.append(("TEST 2: GET /api/admin/finance/likviditet", "PASS", f"autoCosts includes ext+platform"))
            else:
                test_results.append(("TEST 2: GET /api/admin/finance/likviditet", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 2 FAILED: {e}")
            test_results.append(("TEST 2: GET /api/admin/finance/likviditet", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 3a: POST /api/admin/finance/settings (disable both)
        # ===================================================================
        print("\n[TEST 3a] POST /api/admin/finance/settings (disable includeExt + includePlatform)")
        print("-" * 80)
        try:
            response = await page.request.post(
                f"{BASE_URL}/admin/finance/settings?key={ADMIN_KEY}",
                data=json.dumps({"includeExt": False, "includePlatform": False}),
                headers={"Content-Type": "application/json"}
            )
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK")
                
                # Response has {ok: true, settings: {...}}
                settings = data.get('settings', {})
                include_ext = settings.get('includeExt')
                include_platform = settings.get('includePlatform')
                
                print(f"  settings.includeExt: {include_ext}")
                print(f"  settings.includePlatform: {include_platform}")
                
                assert include_ext == False, f"includeExt should be False, got {include_ext}"
                assert include_platform == False, f"includePlatform should be False, got {include_platform}"
                print(f"  ✓ Both settings disabled")
                
                test_results.append(("TEST 3a: POST /api/admin/finance/settings (disable)", "PASS", "includeExt=False, includePlatform=False"))
            else:
                test_results.append(("TEST 3a: POST /api/admin/finance/settings (disable)", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 3a FAILED: {e}")
            test_results.append(("TEST 3a: POST /api/admin/finance/settings (disable)", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 3b: GET /api/admin/finance/resultat (verify disabled)
        # ===================================================================
        print("\n[TEST 3b] GET /api/admin/finance/resultat (verify extMonthly=0, platformMonthly=0)")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/admin/finance/resultat?key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                monthly = data.get('monthly', {})
                ext_monthly = monthly.get('extMonthly')
                platform_monthly = monthly.get('platformMonthly')
                
                print(f"  monthly.extMonthly: {ext_monthly} (expected 0)")
                print(f"  monthly.platformMonthly: {platform_monthly} (expected 0)")
                
                assert ext_monthly == 0, f"extMonthly should be 0 when disabled, got {ext_monthly}"
                assert platform_monthly == 0, f"platformMonthly should be 0 when disabled, got {platform_monthly}"
                print(f"  ✓ Both costs are 0 when disabled")
                
                # Verify costBreakdown does NOT contain "Plattformdrift (CRM)"
                cost_breakdown = data.get('costBreakdown', [])
                platform_category = next((c for c in cost_breakdown if c.get('category') == 'Plattformdrift (CRM)'), None)
                assert platform_category is None, "Plattformdrift (CRM) should not exist when disabled"
                print(f"  ✓ costBreakdown does NOT contain 'Plattformdrift (CRM)'")
                
                test_results.append(("TEST 3b: GET resultat (disabled)", "PASS", "extMonthly=0, platformMonthly=0"))
            else:
                test_results.append(("TEST 3b: GET resultat (disabled)", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 3b FAILED: {e}")
            test_results.append(("TEST 3b: GET resultat (disabled)", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 3c: POST /api/admin/finance/settings (re-enable both)
        # ===================================================================
        print("\n[TEST 3c] POST /api/admin/finance/settings (re-enable includeExt + includePlatform)")
        print("-" * 80)
        try:
            response = await page.request.post(
                f"{BASE_URL}/admin/finance/settings?key={ADMIN_KEY}",
                data=json.dumps({"includeExt": True, "includePlatform": True}),
                headers={"Content-Type": "application/json"}
            )
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                # Response has {ok: true, settings: {...}}
                settings = data.get('settings', {})
                include_ext = settings.get('includeExt')
                include_platform = settings.get('includePlatform')
                
                print(f"  settings.includeExt: {include_ext}")
                print(f"  settings.includePlatform: {include_platform}")
                
                assert include_ext == True, f"includeExt should be True, got {include_ext}"
                assert include_platform == True, f"includePlatform should be True, got {include_platform}"
                print(f"  ✓ Both settings re-enabled")
                
                # Verify resultat shows costs again
                response2 = await page.goto(f"{BASE_URL}/admin/finance/resultat?key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
                if response2.status == 200:
                    data2 = await response2.json()
                    monthly2 = data2.get('monthly', {})
                    platform_monthly2 = monthly2.get('platformMonthly', 0)
                    print(f"  GET resultat after re-enable: platformMonthly={platform_monthly2}")
                    assert platform_monthly2 > 0, f"platformMonthly should be > 0 after re-enable, got {platform_monthly2}"
                    print(f"  ✓ platformMonthly > 0 after re-enable")
                
                test_results.append(("TEST 3c: POST /api/admin/finance/settings (re-enable)", "PASS", "includeExt=True, includePlatform=True"))
            else:
                test_results.append(("TEST 3c: POST /api/admin/finance/settings (re-enable)", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 3c FAILED: {e}")
            test_results.append(("TEST 3c: POST /api/admin/finance/settings (re-enable)", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 4: GET /api/admin/usage/api
        # ===================================================================
        print("\n[TEST 4] GET /api/admin/usage/api?days=30")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/admin/usage/api?key={ADMIN_KEY}&days=30", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK: {data.get('ok')}")
                
                # Verify platform field
                platform = data.get('platform', {})
                platform_status = platform.get('status')
                print(f"  platform.status: {platform_status}")
                
                assert platform_status in ['ok', 'waiting', 'error'], f"platform.status should be ok/waiting/error, got {platform_status}"
                print(f"  ✓ platform.status is valid")
                
                if platform_status == 'ok':
                    # Verify platform.services
                    services = platform.get('services', [])
                    print(f"  platform.services: {len(services)} services")
                    
                    # Should have 3 services: twilio_sms, posten_esignering, keyhole_kredittsjekk
                    assert len(services) >= 3, f"platform.services should have >= 3 services, got {len(services)}"
                    print(f"  ✓ platform.services has >= 3 services")
                    
                    # Verify platform.llm.byFeature exists
                    llm = platform.get('llm', {})
                    by_feature = llm.get('byFeature')
                    print(f"  platform.llm.byFeature exists: {by_feature is not None}")
                    assert by_feature is not None, "platform.llm.byFeature should exist"
                    print(f"  ✓ platform.llm.byFeature exists")
                else:
                    print(f"  ℹ platform.status is '{platform_status}', services may not be available")
                
                # Verify other fields
                llm = data.get('llm', {})
                ext = data.get('ext', {})
                
                assert 'totals' in llm, "llm.totals should exist"
                assert 'services' in ext, "ext.services should exist"
                print(f"  ✓ llm.totals and ext.services exist")
                
                # Verify ext.services has 4 services
                ext_services = ext.get('services', [])
                print(f"  ext.services: {len(ext_services)} services")
                assert len(ext_services) == 4, f"ext.services should have 4 services, got {len(ext_services)}"
                print(f"  ✓ ext.services has 4 services")
                
                # Verify models and defaultModel
                models = data.get('models', [])
                default_model = data.get('defaultModel')
                print(f"  models: {len(models)} models")
                print(f"  defaultModel: {default_model}")
                
                assert len(models) == 8, f"models should have 8 models, got {len(models)}"
                assert default_model == 'gpt-4o-mini', f"defaultModel should be 'gpt-4o-mini', got {default_model}"
                print(f"  ✓ models has 8 models, defaultModel is 'gpt-4o-mini'")
                
                test_results.append(("TEST 4: GET /api/admin/usage/api", "PASS", f"platform.status={platform_status}"))
            else:
                test_results.append(("TEST 4: GET /api/admin/usage/api", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 4 FAILED: {e}")
            test_results.append(("TEST 4: GET /api/admin/usage/api", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 5: GET /api/admin/finance/prognose (or forecast)
        # ===================================================================
        print("\n[TEST 5] GET /api/admin/finance/forecast")
        print("-" * 80)
        try:
            # Try forecast endpoint first
            response = await page.goto(f"{BASE_URL}/admin/finance/forecast?key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK: {data.get('ok')}")
                print(f"  ✓ No 500 error")
                test_results.append(("TEST 5: GET /api/admin/finance/forecast", "PASS", "No 500 error"))
            elif status == 404:
                # Try prognose endpoint
                print(f"  forecast endpoint not found, trying prognose...")
                response = await page.goto(f"{BASE_URL}/admin/finance/prognose?key={ADMIN_KEY}", wait_until="networkidle", timeout=30000)
                status = response.status
                print(f"Status: {status}")
                
                if status == 200:
                    data = await response.json()
                    print(f"✓ Response OK: {data.get('ok')}")
                    print(f"  ✓ No 500 error")
                    test_results.append(("TEST 5: GET /api/admin/finance/prognose", "PASS", "No 500 error"))
                else:
                    test_results.append(("TEST 5: GET /api/admin/finance/prognose", "FAIL", f"Status {status}"))
            else:
                test_results.append(("TEST 5: GET /api/admin/finance/forecast", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 5 FAILED: {e}")
            test_results.append(("TEST 5: GET /api/admin/finance/forecast", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 6: Regression - GET /api/admin/kpi
        # ===================================================================
        print("\n[TEST 6] Regression: GET /api/admin/kpi?days=30")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/admin/kpi?key={ADMIN_KEY}&days=30", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                data = await response.json()
                print(f"✓ Response OK: {data.get('ok')}")
                test_results.append(("TEST 6: GET /api/admin/kpi", "PASS", "200 OK"))
            else:
                test_results.append(("TEST 6: GET /api/admin/kpi", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 6 FAILED: {e}")
            test_results.append(("TEST 6: GET /api/admin/kpi", "FAIL", str(e)))
        
        # ===================================================================
        # TEST 7: Regression - GET /api/health
        # ===================================================================
        print("\n[TEST 7] Regression: GET /api/health")
        print("-" * 80)
        try:
            response = await page.goto(f"{BASE_URL}/health", wait_until="networkidle", timeout=30000)
            status = response.status
            print(f"Status: {status}")
            
            if status == 200:
                print(f"✓ Response OK")
                test_results.append(("TEST 7: GET /api/health", "PASS", "200 OK"))
            else:
                test_results.append(("TEST 7: GET /api/health", "FAIL", f"Status {status}"))
                
        except Exception as e:
            print(f"✗ TEST 7 FAILED: {e}")
            test_results.append(("TEST 7: GET /api/health", "FAIL", str(e)))
        
        await browser.close()
        
        # ===================================================================
        # SUMMARY
        # ===================================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for _, result, _ in test_results if result == "PASS")
        failed = sum(1 for _, result, _ in test_results if result == "FAIL")
        
        for test_name, result, details in test_results:
            status_icon = "✅" if result == "PASS" else "❌"
            print(f"{status_icon} {test_name}: {result} - {details}")
        
        print(f"\nTotal: {passed}/{len(test_results)} tests passed")
        
        if failed > 0:
            print(f"\n❌ {failed} test(s) FAILED")
            sys.exit(1)
        else:
            print(f"\n✅ ALL TESTS PASSED")
            sys.exit(0)

if __name__ == "__main__":
    asyncio.run(run_tests())
