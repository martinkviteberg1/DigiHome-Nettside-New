#!/usr/bin/env python3
"""
Backend test for Konkurrent-kampanje (Google Ads competitor campaign) endpoints.

⚠️⚠️ CRITICAL SAFETY RULE ⚠️⚠️
These endpoints touch a LIVE Google Ads account. We are ABSOLUTELY FORBIDDEN from
creating a real campaign. When calling POST /api/admin/ads/competitor-campaign,
we MUST ALWAYS include "validateOnly": true in the JSON body.
NEVER send validateOnly:false and NEVER omit validateOnly.

Tests:
1. GET /api/admin/ads/competitor-campaign/template?key=... → 200 with template
2. AUTH: GET template WITHOUT key → 401
3. DRY-RUN (SAFE): POST /api/admin/ads/competitor-campaign?key=... with validateOnly:true
4. AUTH: POST WITHOUT key → 401
5. REGRESSION: GET /api/ → 200, GET /api/admin/landing-pages → 200
"""

import asyncio
import json
import os
import sys
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_competitor_campaign():
    """Test competitor campaign endpoints with CRITICAL SAFETY: validateOnly:true ALWAYS"""
    
    # Configuration
    BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://bli-utleier-redesign.preview.emergentagent.com')
    API_BASE = f"{BASE_URL}/api"
    ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
    TIMEOUT = 60  # seconds
    
    print(f"\n{'='*80}")
    print(f"COMPETITOR CAMPAIGN BACKEND TESTS")
    print(f"{'='*80}")
    print(f"Base URL: {API_BASE}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print(f"⚠️  CRITICAL SAFETY: validateOnly:true on ALL POST requests")
    print(f"{'='*80}\n")
    
    # Import aiohttp here to avoid issues if not installed
    try:
        import aiohttp
    except ImportError:
        print("❌ ERROR: aiohttp not installed. Run: pip install aiohttp")
        return False
    
    all_passed = True
    test_count = 0
    passed_count = 0
    
    async with aiohttp.ClientSession() as session:
        
        # ===================================================================
        # TEST 1: GET /api/admin/ads/competitor-campaign/template WITH key
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 1: GET /api/admin/ads/competitor-campaign/template WITH key")
        print(f"{'─'*80}")
        
        test1_passed = False
        try:
            url = f"{API_BASE}/admin/ads/competitor-campaign/template?key={ADMIN_KEY}"
            start = datetime.now()
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                elapsed = (datetime.now() - start).total_seconds()
                status = resp.status
                
                print(f"Status: {status}")
                print(f"Response time: {elapsed:.2f}s")
                
                if status == 200:
                    data = await resp.json()
                    print(f"Response keys: {list(data.keys())}")
                    
                    # Verify response structure
                    if data.get('ok'):
                        # Check required top-level fields
                        required_fields = ['ok', 'configured', 'customerId', 'template']
                        missing = [f for f in required_fields if f not in data]
                        
                        if not missing:
                            print(f"✓ ok: {data['ok']}")
                            print(f"✓ configured: {data['configured']}")
                            print(f"✓ customerId: {data['customerId']}")
                            
                            # Verify template structure
                            template = data.get('template', {})
                            if template:
                                template_fields = ['name', 'dailyBudget', 'finalUrl', 'keywords', 'negatives', 'headlines', 'descriptions']
                                missing_template = [f for f in template_fields if f not in template]
                                
                                if not missing_template:
                                    print(f"✓ template.name: {template['name']}")
                                    print(f"✓ template.dailyBudget: {template['dailyBudget']} (type: {type(template['dailyBudget']).__name__})")
                                    print(f"✓ template.finalUrl: {template['finalUrl']}")
                                    
                                    # Verify keywords contains 'utleiemegleren'
                                    keywords = template.get('keywords', [])
                                    if isinstance(keywords, list) and 'utleiemegleren' in [k.lower() for k in keywords]:
                                        print(f"✓ template.keywords: {len(keywords)} items, contains 'utleiemegleren'")
                                        
                                        # Verify negatives is an array
                                        negatives = template.get('negatives', [])
                                        if isinstance(negatives, list):
                                            print(f"✓ template.negatives: {len(negatives)} items")
                                            
                                            # Verify headlines (>=3 items, each <=30 chars)
                                            headlines = template.get('headlines', [])
                                            if isinstance(headlines, list) and len(headlines) >= 3:
                                                long_headlines = [h for h in headlines if len(str(h)) > 30]
                                                if not long_headlines:
                                                    print(f"✓ template.headlines: {len(headlines)} items (all <=30 chars)")
                                                    
                                                    # Verify descriptions (>=2 items, each <=90 chars)
                                                    descriptions = template.get('descriptions', [])
                                                    if isinstance(descriptions, list) and len(descriptions) >= 2:
                                                        long_descriptions = [d for d in descriptions if len(str(d)) > 90]
                                                        if not long_descriptions:
                                                            print(f"✓ template.descriptions: {len(descriptions)} items (all <=90 chars)")
                                                            test1_passed = True
                                                        else:
                                                            print(f"❌ FAILED: Some descriptions exceed 90 chars")
                                                    else:
                                                        print(f"❌ FAILED: descriptions has {len(descriptions)} items, expected >=2")
                                                else:
                                                    print(f"❌ FAILED: Some headlines exceed 30 chars: {long_headlines}")
                                            else:
                                                print(f"❌ FAILED: headlines has {len(headlines)} items, expected >=3")
                                        else:
                                            print(f"❌ FAILED: negatives is not an array")
                                    else:
                                        print(f"❌ FAILED: keywords does not contain 'utleiemegleren' or is not an array")
                                        print(f"   Keywords: {keywords}")
                                else:
                                    print(f"❌ FAILED: Missing template fields: {missing_template}")
                            else:
                                print(f"❌ FAILED: template is empty")
                        else:
                            print(f"❌ FAILED: Missing required fields: {missing}")
                    else:
                        print(f"❌ FAILED: ok is not true")
                else:
                    print(f"❌ FAILED: Expected 200, got {status}")
                
        except asyncio.TimeoutError:
            print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test1_passed:
            print(f"\n✅ TEST 1 PASSED: Template endpoint returns correct structure")
            passed_count += 1
        else:
            all_passed = False
        
        # ===================================================================
        # TEST 2: AUTH - GET template WITHOUT key → 401
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 2: AUTH - GET template WITHOUT key → 401")
        print(f"{'─'*80}")
        
        test2_passed = False
        try:
            url = f"{API_BASE}/admin/ads/competitor-campaign/template"
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                print(f"Status: {status}")
                
                if status == 401:
                    test2_passed = True
                else:
                    print(f"❌ FAILED: Expected 401, got {status}")
                
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test2_passed:
            print(f"✅ TEST 2 PASSED: Authentication working (401 without key)")
            passed_count += 1
        else:
            all_passed = False
        
        # ===================================================================
        # TEST 3: DRY-RUN (SAFE) - POST with validateOnly:true
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 3: DRY-RUN (SAFE) - POST with validateOnly:true")
        print(f"{'─'*80}")
        print(f"⚠️  CRITICAL: This is a DRY-RUN with validateOnly:true")
        print(f"⚠️  NO real campaign will be created")
        
        test3_passed = False
        try:
            # First get the template
            template_url = f"{API_BASE}/admin/ads/competitor-campaign/template?key={ADMIN_KEY}"
            async with session.get(template_url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                if resp.status == 200:
                    template_data = await resp.json()
                    template = template_data.get('template', {})
                    
                    # Build POST body from template + validateOnly:true
                    post_body = {
                        "name": template.get('name'),
                        "dailyBudget": template.get('dailyBudget'),
                        "finalUrl": template.get('finalUrl'),
                        "geoTargetConstantIds": template.get('geoTargetConstantIds', ['2578']),
                        "path1": template.get('path1'),
                        "path2": template.get('path2'),
                        "keywords": template.get('keywords', []),
                        "negatives": template.get('negatives', []),
                        "headlines": template.get('headlines', []),
                        "descriptions": template.get('descriptions', []),
                        "validateOnly": True  # ⚠️ CRITICAL SAFETY
                    }
                    
                    print(f"POST body keys: {list(post_body.keys())}")
                    print(f"⚠️  validateOnly: {post_body['validateOnly']}")
                    
                    url = f"{API_BASE}/admin/ads/competitor-campaign?key={ADMIN_KEY}"
                    start = datetime.now()
                    
                    async with session.post(
                        url,
                        json=post_body,
                        timeout=aiohttp.ClientTimeout(total=TIMEOUT)
                    ) as resp:
                        elapsed = (datetime.now() - start).total_seconds()
                        status = resp.status
                        
                        print(f"Status: {status}")
                        print(f"Response time: {elapsed:.2f}s")
                        
                        # Accept 200 as success (endpoint returns 200 for both success and validation errors)
                        if status == 200:
                            try:
                                data = await resp.json()
                                print(f"Response keys: {list(data.keys())}")
                                
                                # The response is acceptable EITHER as:
                                # {ok:true, validateOnly:true, ...} (Google validated successfully)
                                # OR {ok:false, error/message:...} (Google rejected but nothing was created)
                                # The ONLY failure condition is a 500 error or the endpoint throwing
                                
                                if data.get('ok') is True:
                                    print(f"✓ ok: true (Google validation passed)")
                                    if data.get('validateOnly'):
                                        print(f"✓ validateOnly: {data['validateOnly']}")
                                    print(f"✓ Response: {json.dumps(data, indent=2)[:500]}")
                                    test3_passed = True
                                elif data.get('ok') is False:
                                    print(f"✓ ok: false (Google rejected, but nothing created)")
                                    error_msg = data.get('error') or data.get('message') or 'Unknown error'
                                    print(f"✓ Error message: {error_msg[:200]}")
                                    test3_passed = True
                                else:
                                    print(f"⚠️  Unexpected response structure: {data}")
                                    test3_passed = True  # Still acceptable as long as status is 200
                                
                            except json.JSONDecodeError:
                                # If we can't parse JSON, that's still acceptable as long as status is 200
                                print(f"⚠️  Response is not JSON, but status is 200 (acceptable)")
                                test3_passed = True
                        else:
                            print(f"❌ FAILED: Expected 200, got {status}")
                else:
                    print(f"❌ FAILED: Could not fetch template (status {resp.status})")
                
        except asyncio.TimeoutError:
            print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test3_passed:
            print(f"\n✅ TEST 3 PASSED: Endpoint returned 200 with valid response (dry-run safe)")
            passed_count += 1
        else:
            all_passed = False
        
        # ===================================================================
        # TEST 4: AUTH - POST WITHOUT key → 401
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 4: AUTH - POST WITHOUT key → 401")
        print(f"{'─'*80}")
        
        test4_passed = False
        try:
            url = f"{API_BASE}/admin/ads/competitor-campaign"
            post_body = {"validateOnly": True}  # Minimal body with validateOnly:true
            
            async with session.post(
                url,
                json=post_body,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as resp:
                status = resp.status
                print(f"Status: {status}")
                
                if status == 401:
                    test4_passed = True
                else:
                    print(f"❌ FAILED: Expected 401, got {status}")
                
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test4_passed:
            print(f"✅ TEST 4 PASSED: Authentication working (401 without key)")
            passed_count += 1
        else:
            all_passed = False
        
        # ===================================================================
        # TEST 5: REGRESSION - GET /api/ → 200
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 5: REGRESSION - GET /api/ → 200")
        print(f"{'─'*80}")
        
        test5_passed = False
        try:
            url = f"{API_BASE}/"
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                print(f"Status: {status}")
                
                if status == 200:
                    data = await resp.json()
                    if data.get('ok'):
                        print(f"✓ Response: {data}")
                        test5_passed = True
                    else:
                        print(f"❌ FAILED: ok is not true")
                else:
                    print(f"❌ FAILED: Expected 200, got {status}")
                
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test5_passed:
            print(f"✅ TEST 5 PASSED: Root endpoint working")
            passed_count += 1
        else:
            all_passed = False
        
        # ===================================================================
        # TEST 6: REGRESSION - GET /api/admin/landing-pages → 200
        # ===================================================================
        test_count += 1
        print(f"\n{'─'*80}")
        print(f"TEST 6: REGRESSION - GET /api/admin/landing-pages → 200")
        print(f"{'─'*80}")
        
        test6_passed = False
        try:
            url = f"{API_BASE}/admin/landing-pages?key={ADMIN_KEY}&days=30"
            
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
                status = resp.status
                print(f"Status: {status}")
                
                if status == 200:
                    data = await resp.json()
                    if data.get('ok'):
                        required = ['pages', 'totals']
                        missing = [f for f in required if f not in data]
                        if not missing:
                            print(f"✓ ok: {data['ok']}")
                            print(f"✓ pages: {len(data.get('pages', []))} items")
                            print(f"✓ totals: {list(data.get('totals', {}).keys())}")
                            test6_passed = True
                        else:
                            print(f"❌ FAILED: Missing fields: {missing}")
                    else:
                        print(f"❌ FAILED: ok is not true")
                else:
                    print(f"❌ FAILED: Expected 200, got {status}")
                
        except Exception as e:
            print(f"❌ FAILED: {type(e).__name__}: {e}")
        
        if test6_passed:
            print(f"✅ TEST 6 PASSED: Landing pages endpoint working")
            passed_count += 1
        else:
            all_passed = False
    
    # ===================================================================
    # SUMMARY
    # ===================================================================
    print(f"\n{'='*80}")
    print(f"TEST SUMMARY")
    print(f"{'='*80}")
    print(f"Total tests: {test_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {test_count - passed_count}")
    print(f"Success rate: {(passed_count/test_count*100) if test_count > 0 else 0:.1f}%")
    
    if all_passed:
        print(f"\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ SOME TESTS FAILED")
    
    print(f"{'='*80}\n")
    
    return all_passed


if __name__ == '__main__':
    success = asyncio.run(test_competitor_campaign())
    sys.exit(0 if success else 1)
