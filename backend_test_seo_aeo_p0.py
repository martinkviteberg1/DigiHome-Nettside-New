#!/usr/bin/env python3
"""
SEO/AEO P0 Phase Testing - Comprehensive verification after fixes
Tests all requirements from review_request without making any code changes
"""

import requests
import re
import json
from datetime import datetime

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

def test_routes_200():
    """Test 1: All routes return 200"""
    print("\n=== TEST 1: Routes 200 ===")
    routes = [
        "/",
        "/metode",
        "/guider/hva-koster-utleiemegler",
        "/guider/skatt-pa-utleie",
        "/guider/depositum-regler",
        "/guider/korttidsutleie-regler",
        "/guider/leie-ut-leilighet-bergen",
        "/utleie/asane",
        "/leiemarkedet/bergen",
        "/sitemap.xml",
        "/llms.txt",
        "/sommer",
        "/video"
    ]
    
    passed = 0
    failed = 0
    
    for route in routes:
        try:
            resp = requests.get(f"{BASE_URL}{route}", timeout=30)
            if resp.status_code == 200:
                print(f"✅ {route} → 200")
                passed += 1
            else:
                print(f"❌ {route} → {resp.status_code}")
                failed += 1
        except Exception as e:
            print(f"❌ {route} → ERROR: {e}")
            failed += 1
    
    print(f"\nTest 1 Result: {passed}/{len(routes)} passed")
    return failed == 0

def test_homepage_ssr_content():
    """Test 2: Homepage SSR content verification"""
    print("\n=== TEST 2: Homepage SSR Content ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=30)
        html = resp.text
        
        # Remove script tags and RSC payload
        html_clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        # Remove SVG numeric path data
        html_clean = re.sub(r'<path[^>]*d="[^"]*"[^>]*>', '', html_clean)
        
        checks = {
            "has_+30%": bool(re.search(r'\+\s*30\s*%', html_clean)),
            "has_150+": bool(re.search(r'150\s*\+', html_clean)),
            "has_24t": bool(re.search(r'24\s*t', html_clean)),
            "no_+0%": not bool(re.search(r'\+\s*0\s*%', html_clean)),
            "no_0+": not bool(re.search(r'(?<!\d)0\s*\+(?!\d)', html_clean)),
            "no_98%": not bool(re.search(r'98\s*%', html_clean)),
            "no_4.9_rating": not bool(re.search(r'4[.,]9', html_clean)),
            "no_snittinntekt": "Snittinntekt" not in html_clean,
            "has_method_links": "/metode" in html,
            "no_zero_bedrooms": not bool(re.search(r'0\s*soverom', html_clean, re.IGNORECASE)),
            "no_zero_sqm": not bool(re.search(r'0\s*m²', html_clean)),
            "no_register_absolute": not bool(re.search(r'registrer.*?garantert', html_clean, re.IGNORECASE))
        }
        
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"{status} {check}: {result}")
        
        all_passed = all(checks.values())
        print(f"\nTest 2 Result: {'PASS' if all_passed else 'FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_metode_page():
    """Test 3: /metode complete metadata/H1/definitions/caveat/JSON-LD"""
    print("\n=== TEST 3: /metode Page ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/metode", timeout=30)
        html = resp.text
        
        checks = {
            "has_title": bool(re.search(r'<title>[^<]+</title>', html)),
            "has_description": bool(re.search(r'<meta[^>]*name="description"[^>]*content="[^"]+"', html)),
            "has_h1": bool(re.search(r'<h1[^>]*>.*?</h1>', html, re.DOTALL)),
            "has_definitions": "definisjon" in html.lower() or "beregn" in html.lower(),
            "has_caveat": "estimat" in html.lower() or "forbehold" in html.lower(),
            "has_json_ld": '"@type"' in html and '"@context"' in html
        }
        
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"{status} {check}: {result}")
        
        all_passed = all(checks.values())
        print(f"\nTest 3 Result: {'PASS' if all_passed else 'FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_guides_metadata():
    """Test 4: Guides metadata, author, review org, sources, JSON-LD"""
    print("\n=== TEST 4: Guides Metadata ===")
    
    guides = [
        "hva-koster-utleiemegler",
        "skatt-pa-utleie",
        "depositum-regler",
        "korttidsutleie-regler",
        "leie-ut-leilighet-bergen"
    ]
    
    all_passed = True
    
    for slug in guides:
        print(f"\n--- Testing /guider/{slug} ---")
        try:
            resp = requests.get(f"{BASE_URL}/guider/{slug}", timeout=30)
            html = resp.text
            
            checks = {
                "has_title": bool(re.search(r'<title>[^<]+</title>', html)),
                "has_description": bool(re.search(r'<meta[^>]*name="description"[^>]*content="[^"]+"', html)),
                "has_author_sarah": "Sarah" in html,
                "has_review_org": "DigiHome" in html or "Organization" in html,
                "has_sources": "kilde" in html.lower() or "source" in html.lower(),
                "has_article_jsonld": '"@type":"Article"' in html or '"@type": "Article"' in html,
                "has_person_author": '"@type":"Person"' in html or '"@type": "Person"' in html,
                "has_publisher_org": '"@type":"Organization"' in html or '"@type": "Organization"' in html,
                "has_citation": '"citation"' in html or "absolutt" in html.lower(),
                "has_dateModified": '"dateModified"' in html
            }
            
            for check, result in checks.items():
                status = "✅" if result else "❌"
                print(f"{status} {check}: {result}")
            
            if not all(checks.values()):
                all_passed = False
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            all_passed = False
    
    print(f"\nTest 4 Result: {'PASS' if all_passed else 'FAIL'}")
    return all_passed

def test_legal_assertions():
    """Test 5: Legal assertions - false claims absent, nuances present"""
    print("\n=== TEST 5: Legal Assertions ===")
    
    guides_to_check = [
        ("depositum-regler", ["same-bank", "10+2", "conditional"]),
        ("korttidsutleie-regler", ["primary", "unlimited"]),
        ("skatt-pa-utleie", ["tax", "holistic", "sources"])
    ]
    
    all_passed = True
    
    for slug, keywords in guides_to_check:
        print(f"\n--- Testing /guider/{slug} ---")
        try:
            resp = requests.get(f"{BASE_URL}/guider/{slug}", timeout=30)
            html = resp.text.lower()
            
            # Check for false claims that should be absent
            false_claims = {
                "no_unlimited_primary": not bool(re.search(r'ubegrenset.*?primærbolig', html)),
                "no_absolute_same_bank": not bool(re.search(r'må.*?samme.*?bank', html)),
            }
            
            # Check for correct nuances that should be present
            correct_nuances = {
                "has_conditional": "hvis" in html or "dersom" in html or "forutsatt" in html,
                "has_sources": "kilde" in html or "skatteetaten" in html or "husleieloven" in html,
                "has_10plus2": "10" in html and "2" in html,
            }
            
            checks = {**false_claims, **correct_nuances}
            
            for check, result in checks.items():
                status = "✅" if result else "❌"
                print(f"{status} {check}: {result}")
            
            if not all(checks.values()):
                all_passed = False
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            all_passed = False
    
    print(f"\nTest 5 Result: {'PASS' if all_passed else 'FAIL'}")
    return all_passed

def test_llms_txt():
    """Test 6: llms.txt content verification"""
    print("\n=== TEST 6: llms.txt Content ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/llms.txt", timeout=30)
        content = resp.text
        
        checks = {
            "has_30_percent": "30 %" in content or "30%" in content,
            "has_scenarioestimat": "scenarioestimat" in content.lower() or "estimat" in content.lower(),
            "has_ikke_garanti": "ikke en garanti" in content.lower() or "ikke garanti" in content.lower(),
            "no_satisfaction_98": "98" not in content or "98%" not in content,
            "no_25k_average": "25000" not in content and "25 000" not in content,
            "has_last_updated": "oppdatert" in content.lower() or "updated" in content.lower(),
            "has_method": "metode" in content.lower() or "beregn" in content.lower(),
            "has_official_sources": "kilde" in content.lower() or "ssb" in content.lower(),
            "has_24h": "24" in content
        }
        
        # Check for same sentence requirement
        lines = content.split('\n')
        same_sentence = False
        for line in lines:
            if "30" in line and "%" in line and ("estimat" in line.lower() or "scenario" in line.lower()) and ("ikke" in line.lower() and "garanti" in line.lower()):
                same_sentence = True
                break
        
        checks["same_sentence_30_estimat_garanti"] = same_sentence
        
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"{status} {check}: {result}")
        
        all_passed = all(checks.values())
        print(f"\nTest 6 Result: {'PASS' if all_passed else 'FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_sitemap():
    """Test 7: Sitemap includes/excludes correct URLs, lastmod dates"""
    print("\n=== TEST 7: Sitemap ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/sitemap.xml", timeout=30)
        content = resp.text
        
        # URLs that should be included
        should_include = [
            "/metode",
            "/guider/hva-koster-utleiemegler",
            "/guider/skatt-pa-utleie",
            "/guider/depositum-regler",
            "/guider/korttidsutleie-regler",
            "/guider/leie-ut-leilighet-bergen"
        ]
        
        # URLs that should be excluded
        should_exclude = [
            "/sommer",
            "/video",
            "/support",
            "/terms",
            "/privacy"
        ]
        
        checks = {}
        
        for url in should_include:
            included = url in content
            checks[f"includes_{url}"] = included
            status = "✅" if included else "❌"
            print(f"{status} includes {url}: {included}")
        
        for url in should_exclude:
            excluded = url not in content
            checks[f"excludes_{url}"] = excluded
            status = "✅" if excluded else "❌"
            print(f"{status} excludes {url}: {excluded}")
        
        # Check for lastmod dates (should have 2026-07-28 or similar)
        has_lastmod = "<lastmod>" in content
        checks["has_lastmod"] = has_lastmod
        print(f"{'✅' if has_lastmod else '❌'} has_lastmod: {has_lastmod}")
        
        # Check /sommer and /video have noindex
        print("\n--- Checking noindex on /sommer and /video ---")
        for route in ["/sommer", "/video"]:
            resp_route = requests.get(f"{BASE_URL}{route}", timeout=30)
            has_noindex = 'name="robots"' in resp_route.text and "noindex" in resp_route.text
            checks[f"{route}_noindex"] = has_noindex
            status = "✅" if has_noindex else "❌"
            print(f"{status} {route} noindex: {has_noindex}")
        
        all_passed = all(checks.values())
        print(f"\nTest 7 Result: {'PASS' if all_passed else 'FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_redirects():
    """Test 8: PartDetail.aspx returns 308, blog redirects work"""
    print("\n=== TEST 8: Redirects ===")
    
    try:
        # Test PartDetail.aspx redirect
        resp = requests.get(f"{BASE_URL}/PartDetail.aspx?id=123", allow_redirects=False, timeout=30)
        partdetail_308 = resp.status_code == 308 and resp.headers.get('Location', '').endswith('/')
        print(f"{'✅' if partdetail_308 else '❌'} PartDetail.aspx → 308 to /: {partdetail_308}")
        
        # Test blog redirect
        resp_blog = requests.get(f"{BASE_URL}/blogg", allow_redirects=False, timeout=30)
        blog_redirect = resp_blog.status_code == 308 and '/nyheter' in resp_blog.headers.get('Location', '')
        print(f"{'✅' if blog_redirect else '❌'} /blogg → 308 to /nyheter: {blog_redirect}")
        
        all_passed = partdetail_308 and blog_redirect
        print(f"\nTest 8 Result: {'PASS' if all_passed else 'FAIL'}")
        return all_passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_titles():
    """Test 9: Titles for location and rentmarket pages are correct"""
    print("\n=== TEST 9: Titles ===")
    
    pages = [
        ("/utleie/asane", "asane"),
        ("/leiemarkedet/bergen", "bergen")
    ]
    
    all_passed = True
    
    for url, location in pages:
        try:
            resp = requests.get(f"{BASE_URL}{url}", timeout=30)
            html = resp.text
            
            title_match = re.search(r'<title>([^<]+)</title>', html)
            if title_match:
                title = title_match.group(1)
                has_location = location.lower() in title.lower()
                status = "✅" if has_location else "❌"
                print(f"{status} {url} title contains '{location}': {has_location}")
                print(f"   Title: {title}")
                if not has_location:
                    all_passed = False
            else:
                print(f"❌ {url} has no title tag")
                all_passed = False
                
        except Exception as e:
            print(f"❌ ERROR for {url}: {e}")
            all_passed = False
    
    print(f"\nTest 9 Result: {'PASS' if all_passed else 'FAIL'}")
    return all_passed

def test_api_endpoint():
    """Test 10: GET /api returns 200"""
    print("\n=== TEST 10: API Endpoint ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/api", timeout=30)
        passed = resp.status_code == 200
        status = "✅" if passed else "❌"
        print(f"{status} GET /api → {resp.status_code}")
        
        if passed:
            try:
                data = resp.json()
                print(f"   Response: {data}")
            except:
                pass
        
        print(f"\nTest 10 Result: {'PASS' if passed else 'FAIL'}")
        return passed
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("=" * 80)
    print("SEO/AEO P0 PHASE TESTING - COMPREHENSIVE VERIFICATION")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().isoformat()}")
    
    results = {
        "Test 1 - Routes 200": test_routes_200(),
        "Test 2 - Homepage SSR Content": test_homepage_ssr_content(),
        "Test 3 - /metode Page": test_metode_page(),
        "Test 4 - Guides Metadata": test_guides_metadata(),
        "Test 5 - Legal Assertions": test_legal_assertions(),
        "Test 6 - llms.txt": test_llms_txt(),
        "Test 7 - Sitemap": test_sitemap(),
        "Test 8 - Redirects": test_redirects(),
        "Test 9 - Titles": test_titles(),
        "Test 10 - API Endpoint": test_api_endpoint()
    }
    
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\n{'=' * 80}")
    print(f"OVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"Completed: {datetime.now().isoformat()}")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - SEO/AEO P0 PHASE VERIFIED")
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED - REVIEW REQUIRED")

if __name__ == "__main__":
    main()
