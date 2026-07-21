#!/usr/bin/env python3
"""
SEO & AEO Module Testing Script
Tests the new SEO monitoring module with CRITICAL SAFETY RULES:
1. NEVER call POST /api/admin/seo/run with {type:'rank'} without "dry":true
2. NEVER call GET /api/cron/seo-weekly with valid token
3. AEO: run MAX ONCE with body {"type":"aeo","questions":["Hva er DigiHome i Bergen?"]}
4. Tech-audit: use {"type":"tech","limit":3}
5. Config test: PUT and then PUT back to original values
"""

import requests
import json
import sys
import time

# Configuration
BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 120  # 120s for AEO/tech tests

def test_auth():
    """Test 1: AUTH - All endpoints require authentication"""
    print("\n=== TEST 1: AUTH ===")
    tests_passed = 0
    tests_total = 5
    
    # 1.1: GET /api/admin/seo/overview without key → 401
    print("1.1: GET /api/admin/seo/overview without key → 401")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/overview", timeout=10)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            tests_passed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 1.2: GET /api/admin/seo/config without key → 401
    print("1.2: GET /api/admin/seo/config without key → 401")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/config", timeout=10)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            tests_passed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 1.3: POST /api/admin/seo/run without key → 401
    print("1.3: POST /api/admin/seo/run without key → 401")
    try:
        r = requests.post(f"{BASE_URL}/admin/seo/run", json={"type":"rank","dry":True}, timeout=10)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without key")
            tests_passed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 1.4: GET /api/cron/seo-weekly without token → 401
    print("1.4: GET /api/cron/seo-weekly without token → 401")
    try:
        r = requests.get(f"{BASE_URL}/cron/seo-weekly", timeout=10)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 without token")
            tests_passed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 1.5: GET /api/cron/seo-weekly with wrong token → 401
    print("1.5: GET /api/cron/seo-weekly with wrong token → 401")
    try:
        r = requests.get(f"{BASE_URL}/cron/seo-weekly?token=wrongtoken", timeout=10)
        if r.status_code == 401:
            print("✅ PASS: Returns 401 with wrong token")
            tests_passed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    print(f"\n✅ AUTH TESTS: {tests_passed}/{tests_total} passed")
    return tests_passed == tests_total

def test_config_get():
    """Test 2: GET /api/admin/seo/config"""
    print("\n=== TEST 2: GET CONFIG ===")
    print("2.1: GET /api/admin/seo/config?key=... → 200 with config")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok') and 'config' in data:
                config = data['config']
                keywords = config.get('keywords', [])
                aeoQuestions = config.get('aeoQuestions', [])
                competitors = config.get('competitors', [])
                
                print(f"✅ PASS: Returns 200 with config")
                print(f"   - keywords: {len(keywords)} items")
                print(f"   - aeoQuestions: {len(aeoQuestions)} items")
                print(f"   - competitors: {len(competitors)} items")
                
                if len(keywords) == 10 and len(aeoQuestions) == 6:
                    print(f"✅ PASS: Config has expected structure (10 keywords, 6 aeoQuestions)")
                    return True, config
                else:
                    print(f"⚠️  WARNING: Expected 10 keywords and 6 aeoQuestions, got {len(keywords)} and {len(aeoQuestions)}")
                    return True, config
            else:
                print(f"❌ FAIL: Response missing ok:true or config field")
                return False, None
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False, None

def test_config_put(original_config):
    """Test 3: PUT /api/admin/seo/config - MUST restore original config"""
    print("\n=== TEST 3: PUT CONFIG (WITH MANDATORY CLEANUP) ===")
    
    # 3.1: PUT with test config
    print("3.1: PUT /api/admin/seo/config with test data")
    test_config = {
        "keywords": ["test søkeord en", "test søkeord to"],
        "aeoQuestions": ["Testspørsmål?"]
    }
    try:
        r = requests.put(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", json=test_config, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok') and 'config' in data:
                config = data['config']
                if len(config.get('keywords', [])) == 2:
                    print(f"✅ PASS: Config updated, keywords has 2 elements")
                else:
                    print(f"❌ FAIL: Expected 2 keywords, got {len(config.get('keywords', []))}")
                    return False
            else:
                print(f"❌ FAIL: Response missing ok:true or config field")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False
    
    # 3.2: Verify GET reflects change
    print("3.2: Verify GET reflects change")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            config = data.get('config', {})
            if len(config.get('keywords', [])) == 2:
                print(f"✅ PASS: GET reflects change (2 keywords)")
            else:
                print(f"❌ FAIL: GET does not reflect change")
                return False
        else:
            print(f"❌ FAIL: GET failed with {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False
    
    # 3.3: MANDATORY CLEANUP - PUT back original config
    print("3.3: MANDATORY CLEANUP - PUT back original config")
    try:
        r = requests.put(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", json=original_config, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                print(f"✅ PASS: Original config restored")
            else:
                print(f"❌ FAIL: Failed to restore original config")
                return False
        else:
            print(f"❌ FAIL: PUT failed with {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False
    
    # 3.4: Verify restoration
    print("3.4: Verify restoration with GET")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/config?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            config = data.get('config', {})
            keywords_count = len(config.get('keywords', []))
            aeo_count = len(config.get('aeoQuestions', []))
            
            if keywords_count == len(original_config.get('keywords', [])) and aeo_count == len(original_config.get('aeoQuestions', [])):
                print(f"✅ PASS: Config fully restored ({keywords_count} keywords, {aeo_count} aeoQuestions)")
                return True
            else:
                print(f"❌ FAIL: Config not fully restored (expected {len(original_config.get('keywords', []))} keywords and {len(original_config.get('aeoQuestions', []))} aeoQuestions, got {keywords_count} and {aeo_count})")
                return False
        else:
            print(f"❌ FAIL: GET failed with {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_rank_dry():
    """Test 4: POST /api/admin/seo/run with type:rank and dry:true"""
    print("\n=== TEST 4: RANK DRY RUN (SAFE - NO SERPAPI CALLS) ===")
    print("4.1: POST /api/admin/seo/run {type:'rank', dry:true}")
    try:
        r = requests.post(f"{BASE_URL}/admin/seo/run?key={ADMIN_KEY}", 
                         json={"type":"rank","dry":True}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok') and data.get('dry') and 'wouldUseSearches' in data:
                searches = data.get('wouldUseSearches')
                print(f"✅ PASS: Returns 200 with dry:true and wouldUseSearches:{searches}")
                if searches == 10:
                    print(f"✅ PASS: wouldUseSearches=10 (matches config keyword count)")
                else:
                    print(f"⚠️  WARNING: wouldUseSearches={searches} (expected 10 after config reset)")
                return True
            else:
                print(f"❌ FAIL: Response missing required fields")
                print(f"   Response: {data}")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_tech_audit():
    """Test 5: POST /api/admin/seo/run with type:tech and limit:3"""
    print("\n=== TEST 5: TECH AUDIT (limit:3) ===")
    print("5.1: POST /api/admin/seo/run {type:'tech', limit:3}")
    print("   (This crawls 3 pages on prod digihome.no, may take 10-30s)")
    try:
        start_time = time.time()
        r = requests.post(f"{BASE_URL}/admin/seo/run?key={ADMIN_KEY}", 
                         json={"type":"tech","limit":3}, timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                avgScore = data.get('avgScore')
                pageCount = data.get('pageCount')
                totals = data.get('totals', {})
                pages = data.get('pages', [])
                
                print(f"✅ PASS: Returns 200 with ok:true (took {elapsed:.1f}s)")
                print(f"   - avgScore: {avgScore} (0-100)")
                print(f"   - pageCount: {pageCount}")
                print(f"   - totals: error={totals.get('error')}, warn={totals.get('warn')}, info={totals.get('info')}")
                print(f"   - pages: {len(pages)} items")
                
                # Sanity checks
                sanity_ok = True
                if not (0 <= avgScore <= 100):
                    print(f"❌ FAIL: avgScore {avgScore} not in range 0-100")
                    sanity_ok = False
                
                if pageCount != 3:
                    print(f"⚠️  WARNING: pageCount={pageCount}, expected 3")
                
                if len(pages) != pageCount:
                    print(f"❌ FAIL: pages array length {len(pages)} != pageCount {pageCount}")
                    sanity_ok = False
                
                # Check page structure
                for i, page in enumerate(pages[:3]):
                    url = page.get('url', '')
                    score = page.get('score')
                    issues = page.get('issues', [])
                    metrics = page.get('metrics', {})
                    
                    if not url.startswith('https://digihome.no'):
                        print(f"❌ FAIL: Page {i+1} url '{url}' does not start with https://digihome.no")
                        sanity_ok = False
                    
                    if not (0 <= score <= 100):
                        print(f"❌ FAIL: Page {i+1} score {score} not in range 0-100")
                        sanity_ok = False
                    
                    print(f"   Page {i+1}: {url} (score={score}, issues={len(issues)})")
                
                if sanity_ok:
                    print(f"✅ PASS: All sanity checks passed")
                    return True
                else:
                    return False
            else:
                print(f"❌ FAIL: Response missing ok:true")
                print(f"   Response: {data}")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            try:
                print(f"   Response: {r.json()}")
            except:
                pass
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_aeo():
    """Test 6: POST /api/admin/seo/run with type:aeo (MAX 1 CALL)"""
    print("\n=== TEST 6: AEO CHECK (MAX 1 CALL - COSTS OPENAI TOKENS) ===")
    print("6.1: POST /api/admin/seo/run {type:'aeo', questions:['Hva er DigiHome i Bergen?']}")
    print("   (This makes OpenAI API calls, may take 30-60s)")
    try:
        start_time = time.time()
        r = requests.post(f"{BASE_URL}/admin/seo/run?key={ADMIN_KEY}", 
                         json={"type":"aeo","questions":["Hva er DigiHome i Bergen?"]}, 
                         timeout=TIMEOUT)
        elapsed = time.time() - start_time
        
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                runId = data.get('runId')
                summary = data.get('summary', {})
                results = data.get('results', [])
                
                print(f"✅ PASS: Returns 200 with ok:true (took {elapsed:.1f}s)")
                print(f"   - runId: {runId}")
                print(f"   - summary.questions: {summary.get('questions')}")
                print(f"   - summary.modelMentionRate: {summary.get('modelMentionRate')}%")
                print(f"   - summary.webMentionRate: {summary.get('webMentionRate')}")
                print(f"   - results: {len(results)} items")
                
                # Sanity checks
                sanity_ok = True
                if summary.get('questions') != 1:
                    print(f"❌ FAIL: Expected 1 question, got {summary.get('questions')}")
                    sanity_ok = False
                
                if len(results) != 1:
                    print(f"❌ FAIL: Expected 1 result, got {len(results)}")
                    sanity_ok = False
                
                # Check result structure
                if len(results) > 0:
                    result = results[0]
                    question = result.get('question')
                    model = result.get('model', {})
                    web = result.get('web', {})
                    
                    print(f"   Result:")
                    print(f"     - question: {question}")
                    print(f"     - model.mentions: {model.get('mentions')}")
                    print(f"     - model.competitors: {model.get('competitors')}")
                    print(f"     - model.snippet: {model.get('snippet', '')[:100]}...")
                    print(f"     - web.available: {web.get('available')}")
                    
                    if web.get('available'):
                        print(f"     - web.mentions: {web.get('mentions')}")
                        print(f"     - web.cited: {web.get('cited')}")
                        print(f"     - web.citations: {len(web.get('citations', []))} items")
                        print(f"✅ PASS: Web search available (gpt-4o-search-preview working)")
                    else:
                        error = web.get('error', '')
                        print(f"     - web.error: {error}")
                        print(f"⚠️  NOTE: Web search not available (gpt-4o-search-preview may not be available on this key)")
                        print(f"         This is acceptable per test requirements")
                
                if sanity_ok:
                    print(f"✅ PASS: All sanity checks passed")
                    return True
                else:
                    return False
            else:
                print(f"❌ FAIL: Response missing ok:true")
                print(f"   Response: {data}")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            try:
                print(f"   Response: {r.json()}")
            except:
                pass
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_overview():
    """Test 7: GET /api/admin/seo/overview"""
    print("\n=== TEST 7: GET OVERVIEW ===")
    print("7.1: GET /api/admin/seo/overview?key=...")
    try:
        r = requests.get(f"{BASE_URL}/admin/seo/overview?key={ADMIN_KEY}", timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                config = data.get('config', {})
                rank = data.get('rank', {})
                aeo = data.get('aeo', {})
                tech = data.get('tech', {})
                techHistory = data.get('techHistory', [])
                quota = data.get('quota', {})
                
                print(f"✅ PASS: Returns 200 with ok:true")
                print(f"   - config: {len(config.get('keywords', []))} keywords, {len(config.get('aeoQuestions', []))} aeoQuestions")
                print(f"   - rank.checkedAt: {rank.get('checkedAt')}")
                print(f"   - rank.runCount: {rank.get('runCount')}")
                print(f"   - rank.keywords: {len(rank.get('keywords', []))} items")
                print(f"   - aeo.checkedAt: {aeo.get('checkedAt')}")
                print(f"   - aeo.results: {len(aeo.get('results', []))} items")
                print(f"   - tech.avgScore: {tech.get('avgScore') if tech else 'null'}")
                print(f"   - tech.pageCount: {tech.get('pageCount') if tech else 'null'}")
                print(f"   - techHistory: {len(techHistory)} items")
                print(f"   - quota.serpUsed30d: {quota.get('serpUsed30d')}")
                print(f"   - quota.serpMonthlyLimit: {quota.get('serpMonthlyLimit')}")
                print(f"   - quota.nextRankCost: {quota.get('nextRankCost')}")
                
                # Sanity checks
                sanity_ok = True
                
                # Check rank structure
                if rank.get('runCount', 0) >= 1:
                    keywords = rank.get('keywords', [])
                    if len(keywords) == 10:
                        print(f"✅ PASS: rank.keywords has 10 elements (from today's real run)")
                        
                        # Check keyword structure
                        for kw in keywords[:3]:
                            keyword = kw.get('keyword')
                            position = kw.get('position')
                            top = kw.get('top', [])
                            aiPresent = kw.get('aiPresent')
                            aiCited = kw.get('aiCited')
                            
                            print(f"     Keyword: {keyword}, position: {position}, top: {len(top)} items, aiPresent: {aiPresent}, aiCited: {aiCited}")
                            
                            if position is not None and not isinstance(position, (int, float)):
                                print(f"❌ FAIL: position should be null or number, got {type(position)}")
                                sanity_ok = False
                    else:
                        print(f"⚠️  WARNING: Expected 10 keywords, got {len(keywords)}")
                else:
                    print(f"⚠️  NOTE: No rank runs yet (runCount={rank.get('runCount', 0)})")
                
                # Check quota
                if not isinstance(quota.get('serpUsed30d'), (int, float)):
                    print(f"❌ FAIL: quota.serpUsed30d should be number, got {type(quota.get('serpUsed30d'))}")
                    sanity_ok = False
                
                if quota.get('serpMonthlyLimit') != 100:
                    print(f"⚠️  WARNING: Expected serpMonthlyLimit=100, got {quota.get('serpMonthlyLimit')}")
                
                if quota.get('nextRankCost') != 10:
                    print(f"⚠️  WARNING: Expected nextRankCost=10, got {quota.get('nextRankCost')}")
                
                if sanity_ok:
                    print(f"✅ PASS: All sanity checks passed")
                    return True
                else:
                    return False
            else:
                print(f"❌ FAIL: Response missing ok:true")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_invalid_type():
    """Test 8: POST /api/admin/seo/run with invalid type"""
    print("\n=== TEST 8: INVALID TYPE ===")
    print("8.1: POST /api/admin/seo/run {type:'ukjent'} → 400")
    try:
        r = requests.post(f"{BASE_URL}/admin/seo/run?key={ADMIN_KEY}", 
                         json={"type":"ukjent"}, timeout=10)
        if r.status_code == 400:
            data = r.json()
            error = data.get('error', '')
            if 'rank' in error.lower() or 'aeo' in error.lower() or 'tech' in error.lower():
                print(f"✅ PASS: Returns 400 with error about 'rank|aeo|tech'")
                print(f"   Error: {error}")
                return True
            else:
                print(f"❌ FAIL: Error message does not mention valid types")
                print(f"   Error: {error}")
                return False
        else:
            print(f"❌ FAIL: Expected 400, got {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: {e}")
        return False

def test_regression():
    """Test 9: REGRESSION - Existing endpoints still work"""
    print("\n=== TEST 9: REGRESSION ===")
    tests_passed = 0
    tests_total = 5
    
    # 9.1: GET /api/ → 200
    print("9.1: GET /api/ → 200")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('ok'):
                print(f"✅ PASS: Returns 200 with ok:true")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Response missing ok:true")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 9.2: GET /api/admin/leads?key=... → 200
    print("9.2: GET /api/admin/leads?key=... → 200")
    try:
        r = requests.get(f"{BASE_URL}/admin/leads?key={ADMIN_KEY}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            if 'leads' in data or 'tenants' in data:
                print(f"✅ PASS: Returns 200 with leads/tenants data")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Response missing leads/tenants")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 9.3: GET {base}/utleiemegler-bergen → 200 with title and FAQPage
    print("9.3: GET https://bli-utleier-redesign.preview.emergentagent.com/utleiemegler-bergen → 200")
    try:
        r = requests.get("https://bli-utleier-redesign.preview.emergentagent.com/utleiemegler-bergen", timeout=10)
        if r.status_code == 200:
            html = r.text
            if '<title>Utleiemegler i Bergen' in html and '"@type":"FAQPage"' in html:
                print(f"✅ PASS: Returns 200 with correct title and FAQPage schema")
                tests_passed += 1
            else:
                has_title = '<title>Utleiemegler i Bergen' in html
                has_faq = '"@type":"FAQPage"' in html
                print(f"❌ FAIL: Missing expected content (title={has_title}, FAQPage={has_faq})")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 9.4: GET {base}/airbnb-forvaltning-bergen → 200 with FAQPage
    print("9.4: GET https://bli-utleier-redesign.preview.emergentagent.com/airbnb-forvaltning-bergen → 200")
    try:
        r = requests.get("https://bli-utleier-redesign.preview.emergentagent.com/airbnb-forvaltning-bergen", timeout=10)
        if r.status_code == 200:
            html = r.text
            if '"@type":"FAQPage"' in html:
                print(f"✅ PASS: Returns 200 with FAQPage schema")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Missing FAQPage schema")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    # 9.5: GET {base}/sitemap.xml contains both pages
    print("9.5: GET https://bli-utleier-redesign.preview.emergentagent.com/sitemap.xml → contains both pages")
    try:
        r = requests.get("https://bli-utleier-redesign.preview.emergentagent.com/sitemap.xml", timeout=10)
        if r.status_code == 200:
            xml = r.text
            has_utleiemegler = 'utleiemegler-bergen' in xml
            has_airbnb = 'airbnb-forvaltning-bergen' in xml
            if has_utleiemegler and has_airbnb:
                print(f"✅ PASS: Sitemap contains both utleiemegler-bergen and airbnb-forvaltning-bergen")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Sitemap missing pages (utleiemegler={has_utleiemegler}, airbnb={has_airbnb})")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: {e}")
    
    print(f"\n✅ REGRESSION TESTS: {tests_passed}/{tests_total} passed")
    return tests_passed == tests_total

def main():
    print("=" * 80)
    print("SEO & AEO MODULE TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin Key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    print("\nCRITICAL SAFETY RULES:")
    print("1. NEVER call POST /api/admin/seo/run with {type:'rank'} without dry:true")
    print("2. NEVER call GET /api/cron/seo-weekly with valid token")
    print("3. AEO: run MAX ONCE with 1 question")
    print("4. Tech-audit: use limit:3")
    print("5. Config: PUT and then PUT back to original")
    print("=" * 80)
    
    all_passed = True
    
    # Test 1: AUTH
    if not test_auth():
        all_passed = False
    
    # Test 2: GET CONFIG (save original for cleanup)
    config_ok, original_config = test_config_get()
    if not config_ok:
        all_passed = False
        print("\n❌ CRITICAL: Cannot proceed without original config")
        sys.exit(1)
    
    # Test 3: PUT CONFIG (with mandatory cleanup)
    if not test_config_put(original_config):
        all_passed = False
    
    # Test 4: RANK DRY RUN (safe - no SerpApi calls)
    if not test_rank_dry():
        all_passed = False
    
    # Test 5: TECH AUDIT (limit:3)
    if not test_tech_audit():
        all_passed = False
    
    # Test 6: AEO CHECK (MAX 1 CALL)
    if not test_aeo():
        all_passed = False
    
    # Test 7: GET OVERVIEW
    if not test_overview():
        all_passed = False
    
    # Test 8: INVALID TYPE
    if not test_invalid_type():
        all_passed = False
    
    # Test 9: REGRESSION
    if not test_regression():
        all_passed = False
    
    print("\n" + "=" * 80)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 80)
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
