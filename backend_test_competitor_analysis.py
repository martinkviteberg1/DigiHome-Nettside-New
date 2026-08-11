#!/usr/bin/env python3
"""
Backend test for Konkurrentanalyse (Google Ads Competitor Analysis) endpoint.
Tests the READ-ONLY competitor analysis endpoint that uses Google Keyword Planner.
"""

import asyncio
import aiohttp
import sys
import os
from datetime import datetime

# Base URL from .env: NEXT_PUBLIC_BASE_URL + /api
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 60  # First call may take ~2s (live Google API)

async def test_competitor_analysis():
    """Test the competitor analysis endpoint comprehensively."""
    
    print("=" * 80)
    print("BACKEND TEST: Konkurrentanalyse (Google Ads Competitor Analysis)")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 80)
    print()
    
    timeout = aiohttp.ClientTimeout(total=TIMEOUT)
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        
        # ===================================================================
        # TEST 1: GET with competitor=Utleiemegleren (main test)
        # ===================================================================
        print("TEST 1: GET /api/admin/ads/competitor-analysis?key=...&competitor=Utleiemegleren")
        print("-" * 80)
        
        try:
            url = f"{BASE_URL}/admin/ads/competitor-analysis?key={ADMIN_KEY}&competitor=Utleiemegleren"
            start = asyncio.get_event_loop().time()
            
            async with session.get(url) as resp:
                elapsed = asyncio.get_event_loop().time() - start
                status = resp.status
                
                print(f"Status: {status}")
                print(f"Response time: {elapsed:.2f}s")
                
                if status != 200:
                    text = await resp.text()
                    print(f"❌ FAILED: Expected 200, got {status}")
                    print(f"Response: {text[:500]}")
                    return False
                
                data = await resp.json()
                print(f"✓ Status 200 OK")
                
                # Verify top-level structure
                required_fields = ['ok', 'configured', 'competitor', 'transparency', 'keywords', 'aggregates']
                for field in required_fields:
                    if field not in data:
                        print(f"❌ FAILED: Missing required field '{field}'")
                        return False
                    print(f"✓ Field '{field}' present")
                
                # Verify ok=true
                if data.get('ok') != True:
                    print(f"❌ FAILED: Expected ok=true, got {data.get('ok')}")
                    return False
                print(f"✓ ok=true")
                
                # Verify competitor
                if data.get('competitor') != 'Utleiemegleren':
                    print(f"❌ FAILED: Expected competitor='Utleiemegleren', got '{data.get('competitor')}'")
                    return False
                print(f"✓ competitor='Utleiemegleren'")
                
                # Verify configured (should be true in this env)
                configured = data.get('configured')
                print(f"✓ configured={configured}")
                
                # Verify transparency structure
                transparency = data.get('transparency', {})
                if not isinstance(transparency, dict):
                    print(f"❌ FAILED: transparency should be a dict, got {type(transparency)}")
                    return False
                
                search_url = transparency.get('searchUrl', '')
                if not isinstance(search_url, str):
                    print(f"❌ FAILED: transparency.searchUrl should be a string, got {type(search_url)}")
                    return False
                
                if 'adstransparency.google.com' not in search_url:
                    print(f"❌ FAILED: transparency.searchUrl should contain 'adstransparency.google.com', got '{search_url}'")
                    return False
                print(f"✓ transparency.searchUrl contains 'adstransparency.google.com'")
                
                if 'Utleiemegleren' not in search_url:
                    print(f"❌ FAILED: transparency.searchUrl should contain 'Utleiemegleren', got '{search_url}'")
                    return False
                print(f"✓ transparency.searchUrl contains 'Utleiemegleren'")
                
                # Verify keywords structure
                keywords = data.get('keywords', {})
                if not isinstance(keywords, dict):
                    print(f"❌ FAILED: keywords should be a dict, got {type(keywords)}")
                    return False
                
                if 'brand' not in keywords or 'category' not in keywords:
                    print(f"❌ FAILED: keywords should have 'brand' and 'category' keys")
                    return False
                
                brand = keywords.get('brand', [])
                category = keywords.get('category', [])
                
                if not isinstance(brand, list):
                    print(f"❌ FAILED: keywords.brand should be an array, got {type(brand)}")
                    return False
                print(f"✓ keywords.brand is array with {len(brand)} items")
                
                if not isinstance(category, list):
                    print(f"❌ FAILED: keywords.category should be an array, got {type(category)}")
                    return False
                print(f"✓ keywords.category is array with {len(category)} items")
                
                # If configured, verify keyword structure and aggregates
                if configured:
                    # Verify keywords.brand is non-empty
                    if len(brand) == 0:
                        print(f"❌ FAILED: When configured=true, keywords.brand should be non-empty")
                        return False
                    print(f"✓ keywords.brand is non-empty ({len(brand)} items)")
                    
                    # Verify keyword item structure
                    if len(brand) > 0:
                        sample = brand[0]
                        required_kw_fields = ['text', 'avgMonthlySearches', 'competition', 'lowBid', 'highBid']
                        for field in required_kw_fields:
                            if field not in sample:
                                print(f"❌ FAILED: Keyword item missing field '{field}'")
                                return False
                        
                        if not isinstance(sample['text'], str):
                            print(f"❌ FAILED: Keyword 'text' should be string, got {type(sample['text'])}")
                            return False
                        
                        if not isinstance(sample['avgMonthlySearches'], (int, float)):
                            print(f"❌ FAILED: Keyword 'avgMonthlySearches' should be number, got {type(sample['avgMonthlySearches'])}")
                            return False
                        
                        if not isinstance(sample['competition'], str):
                            print(f"❌ FAILED: Keyword 'competition' should be string, got {type(sample['competition'])}")
                            return False
                        
                        print(f"✓ Keyword item structure correct: text='{sample['text']}', avgMonthlySearches={sample['avgMonthlySearches']}, competition='{sample['competition']}'")
                    
                    # Verify aggregates (should be non-null when configured)
                    aggregates = data.get('aggregates')
                    if aggregates is None:
                        print(f"❌ FAILED: When configured=true, aggregates should be a non-null object, got null")
                        return False
                    
                    if not isinstance(aggregates, dict):
                        print(f"❌ FAILED: aggregates should be an object, got {type(aggregates)}")
                        return False
                    print(f"✓ aggregates is a non-null object")
                    
                    # Verify aggregates structure
                    required_agg_fields = ['brandVolume', 'categoryVolume', 'totalKeywords', 'competition']
                    for field in required_agg_fields:
                        if field not in aggregates:
                            print(f"❌ FAILED: aggregates missing field '{field}'")
                            return False
                    
                    if not isinstance(aggregates['brandVolume'], (int, float)):
                        print(f"❌ FAILED: aggregates.brandVolume should be number, got {type(aggregates['brandVolume'])}")
                        return False
                    
                    if not isinstance(aggregates['categoryVolume'], (int, float)):
                        print(f"❌ FAILED: aggregates.categoryVolume should be number, got {type(aggregates['categoryVolume'])}")
                        return False
                    
                    if not isinstance(aggregates['totalKeywords'], (int, float)):
                        print(f"❌ FAILED: aggregates.totalKeywords should be number, got {type(aggregates['totalKeywords'])}")
                        return False
                    
                    competition = aggregates.get('competition', {})
                    if not isinstance(competition, dict):
                        print(f"❌ FAILED: aggregates.competition should be object, got {type(competition)}")
                        return False
                    
                    print(f"✓ aggregates structure correct: brandVolume={aggregates['brandVolume']}, categoryVolume={aggregates['categoryVolume']}, totalKeywords={aggregates['totalKeywords']}")
                    print(f"✓ aggregates.competition: {competition}")
                else:
                    # If not configured, aggregates may be null
                    print(f"✓ configured=false, aggregates may be null (got {data.get('aggregates')})")
                
                print(f"✅ TEST 1 PASSED")
                print()
                
        except asyncio.TimeoutError:
            print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
            return False
        except Exception as e:
            print(f"❌ FAILED: Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        # ===================================================================
        # TEST 2: AUTH - GET without key (should return 401)
        # ===================================================================
        print("TEST 2: AUTH - GET /api/admin/ads/competitor-analysis WITHOUT key")
        print("-" * 80)
        
        try:
            url = f"{BASE_URL}/admin/ads/competitor-analysis?competitor=Utleiemegleren"
            
            async with session.get(url) as resp:
                status = resp.status
                
                print(f"Status: {status}")
                
                if status != 401:
                    text = await resp.text()
                    print(f"❌ FAILED: Expected 401, got {status}")
                    print(f"Response: {text[:500]}")
                    return False
                
                print(f"✓ Status 401 (Unauthorized)")
                print(f"✅ TEST 2 PASSED")
                print()
                
        except Exception as e:
            print(f"❌ FAILED: Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        # ===================================================================
        # TEST 3: DEFAULT competitor (no &competitor param)
        # ===================================================================
        print("TEST 3: DEFAULT competitor - GET /api/admin/ads/competitor-analysis?key=... (no &competitor)")
        print("-" * 80)
        
        try:
            url = f"{BASE_URL}/admin/ads/competitor-analysis?key={ADMIN_KEY}"
            start = asyncio.get_event_loop().time()
            
            async with session.get(url) as resp:
                elapsed = asyncio.get_event_loop().time() - start
                status = resp.status
                
                print(f"Status: {status}")
                print(f"Response time: {elapsed:.2f}s")
                
                if status != 200:
                    text = await resp.text()
                    print(f"❌ FAILED: Expected 200, got {status}")
                    print(f"Response: {text[:500]}")
                    return False
                
                data = await resp.json()
                print(f"✓ Status 200 OK")
                
                # Verify competitor defaults to "Utleiemegleren"
                competitor = data.get('competitor')
                if competitor != 'Utleiemegleren':
                    print(f"❌ FAILED: Expected default competitor='Utleiemegleren', got '{competitor}'")
                    return False
                
                print(f"✓ Default competitor='Utleiemegleren'")
                print(f"✅ TEST 3 PASSED")
                print()
                
        except asyncio.TimeoutError:
            print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
            return False
        except Exception as e:
            print(f"❌ FAILED: Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        # ===================================================================
        # TEST 4: ROBUSTNESS - nonsense competitor (should never return 500)
        # ===================================================================
        print("TEST 4: ROBUSTNESS - GET /api/admin/ads/competitor-analysis?key=...&competitor=zzzqqq")
        print("-" * 80)
        
        try:
            url = f"{BASE_URL}/admin/ads/competitor-analysis?key={ADMIN_KEY}&competitor=zzzqqq"
            start = asyncio.get_event_loop().time()
            
            async with session.get(url) as resp:
                elapsed = asyncio.get_event_loop().time() - start
                status = resp.status
                
                print(f"Status: {status}")
                print(f"Response time: {elapsed:.2f}s")
                
                if status == 500:
                    text = await resp.text()
                    print(f"❌ FAILED: Endpoint returned 500 (should never return 500)")
                    print(f"Response: {text[:500]}")
                    return False
                
                if status != 200:
                    text = await resp.text()
                    print(f"❌ FAILED: Expected 200, got {status}")
                    print(f"Response: {text[:500]}")
                    return False
                
                data = await resp.json()
                print(f"✓ Status 200 OK (never 500)")
                
                # Verify basic structure
                if data.get('ok') != True:
                    print(f"❌ FAILED: Expected ok=true, got {data.get('ok')}")
                    return False
                print(f"✓ ok=true")
                
                if data.get('competitor') != 'zzzqqq':
                    print(f"❌ FAILED: Expected competitor='zzzqqq', got '{data.get('competitor')}'")
                    return False
                print(f"✓ competitor='zzzqqq'")
                
                # Verify transparency.searchUrl is present
                transparency = data.get('transparency', {})
                search_url = transparency.get('searchUrl', '')
                if not search_url:
                    print(f"❌ FAILED: transparency.searchUrl should be present even for nonsense competitor")
                    return False
                print(f"✓ transparency.searchUrl present: {search_url}")
                
                # Keywords may be empty arrays, that's fine
                keywords = data.get('keywords', {})
                brand = keywords.get('brand', [])
                category = keywords.get('category', [])
                print(f"✓ keywords.brand: {len(brand)} items (may be empty)")
                print(f"✓ keywords.category: {len(category)} items (may be empty)")
                
                print(f"✅ TEST 4 PASSED")
                print()
                
        except asyncio.TimeoutError:
            print(f"❌ FAILED: Request timed out after {TIMEOUT}s")
            return False
        except Exception as e:
            print(f"❌ FAILED: Exception: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    return True


async def main():
    """Main test runner."""
    try:
        success = await test_competitor_analysis()
        
        print("=" * 80)
        if success:
            print("✅ ALL TESTS PASSED (4/4)")
            print("=" * 80)
            print()
            print("SUMMARY:")
            print("  ✓ Test 1: GET with competitor=Utleiemegleren → 200 with correct structure")
            print("  ✓ Test 2: AUTH - GET without key → 401")
            print("  ✓ Test 3: DEFAULT competitor - GET without &competitor → 200 with competitor='Utleiemegleren'")
            print("  ✓ Test 4: ROBUSTNESS - GET with nonsense competitor → 200 (never 500)")
            print()
            print("Konkurrentanalyse endpoint working PERFECTLY:")
            print("  - READ-ONLY endpoint (Google Keyword Planner ideas, no mutations)")
            print("  - Returns correct structure with transparency, keywords, aggregates")
            print("  - Authentication working (401 without key)")
            print("  - Default competitor working ('Utleiemegleren')")
            print("  - Robust error handling (never returns 500)")
            print()
            sys.exit(0)
        else:
            print("❌ SOME TESTS FAILED")
            print("=" * 80)
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
