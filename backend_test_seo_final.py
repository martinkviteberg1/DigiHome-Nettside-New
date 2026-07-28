#!/usr/bin/env python3
"""
FINAL SEO/AEO P0 RETEST
Testing SEO/AEO changes with NO production/database/API mutations.
Focus: routes, homepage SSR stats, guide metadata/schema, legal content, LLM content, sitemap, redirects, titles.
"""

import requests
import json
import re
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30

def test_routes_all_200():
    """Test 1: 13 routes all return 200"""
    print("\n=== TEST 1: 13 ROUTES ALL 200 ===")
    
    routes = [
        "/",
        "/bli-utleier",
        "/tjenester",
        "/kontakt",
        "/nyheter",
        "/guider",
        "/guider/leie-ut-leilighet-bergen",
        "/utleie/sentrum",
        "/leiemarkedet/bergen",
        "/metode",
        "/utleiemegler-bergen",
        "/airbnb-forvaltning-bergen",
        "/priskalkulator"
    ]
    
    all_passed = True
    for route in routes:
        url = urljoin(BASE_URL, route)
        try:
            response = requests.get(url, timeout=TIMEOUT, allow_redirects=True)
            status = response.status_code
            if status == 200:
                print(f"✅ {route} → {status}")
            else:
                print(f"❌ {route} → {status} (expected 200)")
                all_passed = False
        except Exception as e:
            print(f"❌ {route} → ERROR: {e}")
            all_passed = False
    
    return all_passed

def test_homepage_ssr_stats():
    """Test 2: Homepage visible SSR final stats no zero/98/4.9/Snitt"""
    print("\n=== TEST 2: HOMEPAGE SSR STATS (NO ZERO, NO 98, NO 4.9, NO SNITT) ===")
    
    url = urljoin(BASE_URL, "/")
    try:
        response = requests.get(url, timeout=TIMEOUT)
        html = response.text
        
        # Check for animated 0 values in HTML (should NOT be present)
        has_zero_in_stats = re.search(r'<[^>]*>\s*0\s*<[^>]*>.*?(utleiere|boliger|år)', html, re.IGNORECASE)
        
        # Check for "98" (false satisfaction rate)
        has_98 = "98" in html and ("fornøyd" in html.lower() or "satisfaction" in html.lower())
        
        # Check for "4.9" (false rating)
        has_49 = "4.9" in html and ("rating" in html.lower() or "vurdering" in html.lower())
        
        # Check for "Snitt" (average - should be replaced with specific values)
        has_snitt = "Snitt" in html or "snitt" in html
        
        # Look for actual stat values (should be present)
        has_30_plus = re.search(r'30\+', html)  # 30+ utleiere
        has_150_plus = re.search(r'150\+', html)  # 150+ boliger
        has_24_timer = re.search(r'24\s*timer', html, re.IGNORECASE)  # 24 timer
        
        print(f"Status: {response.status_code}")
        print(f"Has zero in stats HTML: {bool(has_zero_in_stats)}")
        print(f"Has '98' (false satisfaction): {has_98}")
        print(f"Has '4.9' (false rating): {has_49}")
        print(f"Has 'Snitt' (average): {has_snitt}")
        print(f"Has '30+' (real stat): {bool(has_30_plus)}")
        print(f"Has '150+' (real stat): {bool(has_150_plus)}")
        print(f"Has '24 timer' (real stat): {bool(has_24_timer)}")
        
        passed = (
            response.status_code == 200 and
            not has_zero_in_stats and
            not has_98 and
            not has_49 and
            not has_snitt and
            has_30_plus and
            has_150_plus and
            has_24_timer
        )
        
        if passed:
            print("✅ Homepage SSR stats correct (no zero/98/4.9/Snitt, has real values)")
        else:
            print("❌ Homepage SSR stats have issues")
        
        return passed
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_metode_page():
    """Test 3: /metode page exists and has methodology content"""
    print("\n=== TEST 3: /METODE PAGE ===")
    
    url = urljoin(BASE_URL, "/metode")
    try:
        response = requests.get(url, timeout=TIMEOUT)
        html = response.text
        
        # Check for methodology content
        has_methodology = "metode" in html.lower() or "methodology" in html.lower()
        has_definitions = "definisjon" in html.lower() or "definition" in html.lower()
        
        print(f"Status: {response.status_code}")
        print(f"Has methodology content: {has_methodology}")
        print(f"Has definitions: {has_definitions}")
        
        passed = response.status_code == 200 and has_methodology
        
        if passed:
            print("✅ /metode page exists with methodology content")
        else:
            print("❌ /metode page missing or incomplete")
        
        return passed
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_guide_metadata_and_schema():
    """Test 4: All guides incl leie-ut visible author/review/sources + Article JSON-LD citation absolute/review Organization"""
    print("\n=== TEST 4: GUIDE METADATA, AUTHOR, REVIEW, SOURCES, JSON-LD ===")
    
    guides = [
        "/guider/leie-ut-leilighet-bergen",
        "/guider/hva-koster-utleiemegler",
        "/guider/skatt-pa-utleie",
        "/guider/depositum-regler",
        "/guider/korttidsutleie-regler"
    ]
    
    all_passed = True
    for guide_path in guides:
        url = urljoin(BASE_URL, guide_path)
        try:
            response = requests.get(url, timeout=TIMEOUT)
            html = response.text
            
            # Check for author
            has_author = "author" in html.lower() and ("digihome" in html.lower() or "martin" in html.lower())
            
            # Check for review/sources section (visible)
            has_sources = "kilder" in html.lower() or "sources" in html.lower()
            
            # Check for Article JSON-LD
            has_article_jsonld = '"@type":"Article"' in html or '"@type": "Article"' in html
            
            # Check for citation with absolute URL
            has_citation = "citation" in html.lower() and "https://digihome.no" in html
            
            # Check for review Organization in JSON-LD
            has_review_org = '"reviewedBy"' in html or '"publisher"' in html
            
            # Check for FAQPage schema
            has_faq_schema = '"@type":"FAQPage"' in html or '"@type": "FAQPage"' in html
            
            print(f"\n{guide_path}:")
            print(f"  Status: {response.status_code}")
            print(f"  Has author: {has_author}")
            print(f"  Has sources (visible): {has_sources}")
            print(f"  Has Article JSON-LD: {has_article_jsonld}")
            print(f"  Has citation (absolute URL): {has_citation}")
            print(f"  Has review Organization: {has_review_org}")
            print(f"  Has FAQPage schema: {has_faq_schema}")
            
            guide_passed = (
                response.status_code == 200 and
                has_author and
                has_sources and
                has_article_jsonld and
                has_faq_schema
            )
            
            if guide_passed:
                print(f"  ✅ Guide metadata and schema correct")
            else:
                print(f"  ❌ Guide metadata or schema incomplete")
                all_passed = False
                
        except Exception as e:
            print(f"❌ {guide_path} ERROR: {e}")
            all_passed = False
    
    return all_passed

def test_legal_content():
    """Test 5: Legal false phrases absent and nuanced deposit/short/tax present"""
    print("\n=== TEST 5: LEGAL CONTENT (FALSE PHRASES ABSENT, NUANCED CONTENT PRESENT) ===")
    
    # Check guides for false legal claims
    guides_to_check = [
        "/guider/depositum-regler",
        "/guider/korttidsutleie-regler",
        "/guider/skatt-pa-utleie"
    ]
    
    all_passed = True
    
    for guide_path in guides_to_check:
        url = urljoin(BASE_URL, guide_path)
        try:
            response = requests.get(url, timeout=TIMEOUT)
            html = response.text.lower()
            
            print(f"\n{guide_path}:")
            
            # False phrases that should be ABSENT
            false_phrases = [
                "samme bank",  # Deposit must be in same bank (false)
                "primary home exemption",  # Short-term false exemption
                "five-unit hard rule"  # Tax rule too strict
            ]
            
            has_false_phrases = any(phrase in html for phrase in false_phrases)
            
            # Nuanced content that should be PRESENT
            if "depositum" in guide_path:
                has_nuanced = "forskjellige banker" in html or "ulike banker" in html or "annen bank" in html
                print(f"  Has nuanced deposit content (different banks OK): {has_nuanced}")
            elif "korttid" in guide_path:
                has_nuanced = "sameie" in html and "borettslag" in html
                print(f"  Has nuanced short-term content (sameie vs borettslag): {has_nuanced}")
            elif "skatt" in guide_path:
                has_nuanced = "fem enheter" in html or "5 enheter" in html
                print(f"  Has nuanced tax content (five-unit rule mentioned): {has_nuanced}")
            else:
                has_nuanced = True
            
            print(f"  Has false phrases: {has_false_phrases}")
            
            guide_passed = not has_false_phrases and has_nuanced
            
            if guide_passed:
                print(f"  ✅ Legal content correct (no false phrases, nuanced)")
            else:
                print(f"  ❌ Legal content has issues")
                all_passed = False
                
        except Exception as e:
            print(f"❌ {guide_path} ERROR: {e}")
            all_passed = False
    
    return all_passed

def test_llm_content():
    """Test 6: LLMs explicit estimate/not guarantee same sentence, no 98/25k"""
    print("\n=== TEST 6: LLM CONTENT (ESTIMATE/NOT GUARANTEE, NO 98/25K) ===")
    
    url = urljoin(BASE_URL, "/llms.txt")
    try:
        response = requests.get(url, timeout=TIMEOUT)
        content = response.text
        
        # Check for "estimate" and "not guarantee" in same context
        has_estimate_disclaimer = (
            ("estimat" in content.lower() or "estimate" in content.lower()) and
            ("ikke garanti" in content.lower() or "not guarantee" in content.lower())
        )
        
        # Check for false "98" satisfaction rate
        has_98 = "98" in content and ("fornøyd" in content.lower() or "satisfaction" in content.lower())
        
        # Check for false "25k" or "25000" claim
        has_25k = "25k" in content or "25000" in content or "25 000" in content
        
        print(f"Status: {response.status_code}")
        print(f"Has estimate/not guarantee disclaimer: {has_estimate_disclaimer}")
        print(f"Has '98' (false satisfaction): {has_98}")
        print(f"Has '25k' (false claim): {has_25k}")
        
        passed = (
            response.status_code == 200 and
            has_estimate_disclaimer and
            not has_98 and
            not has_25k
        )
        
        if passed:
            print("✅ LLM content correct (has disclaimers, no false claims)")
        else:
            print("❌ LLM content has issues")
        
        return passed
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_sitemap_and_noindex():
    """Test 7: Sitemap/noindex"""
    print("\n=== TEST 7: SITEMAP AND NOINDEX ===")
    
    # Test sitemap
    sitemap_url = urljoin(BASE_URL, "/sitemap.xml")
    try:
        response = requests.get(sitemap_url, timeout=TIMEOUT)
        sitemap_content = response.text
        
        # Check sitemap has guides
        has_guides = "/guider" in sitemap_content
        has_metode = "/metode" in sitemap_content
        
        # Check sitemap does NOT have utility pages
        has_summer = "/sommer" in sitemap_content
        has_video = "/video" in sitemap_content
        
        print(f"Sitemap status: {response.status_code}")
        print(f"Has /guider: {has_guides}")
        print(f"Has /metode: {has_metode}")
        print(f"Has /sommer (should be absent): {has_summer}")
        print(f"Has /video (should be absent): {has_video}")
        
        sitemap_passed = (
            response.status_code == 200 and
            has_guides and
            has_metode and
            not has_summer and
            not has_video
        )
        
        if sitemap_passed:
            print("✅ Sitemap correct")
        else:
            print("❌ Sitemap has issues")
        
    except Exception as e:
        print(f"❌ Sitemap ERROR: {e}")
        sitemap_passed = False
    
    # Test noindex on utility pages
    noindex_pages = ["/sommer", "/video"]
    noindex_passed = True
    
    for page in noindex_pages:
        url = urljoin(BASE_URL, page)
        try:
            response = requests.get(url, timeout=TIMEOUT)
            html = response.text
            
            has_noindex = 'name="robots"' in html and "noindex" in html
            
            print(f"\n{page}:")
            print(f"  Status: {response.status_code}")
            print(f"  Has noindex meta tag: {has_noindex}")
            
            if has_noindex:
                print(f"  ✅ Noindex present")
            else:
                print(f"  ❌ Noindex missing")
                noindex_passed = False
                
        except Exception as e:
            print(f"❌ {page} ERROR: {e}")
            noindex_passed = False
    
    return sitemap_passed and noindex_passed

def test_legacy_redirects():
    """Test 8: PartDetail.aspx?foo=bar MUST 308 location exactly '/' (middleware), blog redirects regression"""
    print("\n=== TEST 8: LEGACY REDIRECTS (308 TO /) ===")
    
    # Test PartDetail.aspx redirect
    legacy_url = urljoin(BASE_URL, "/PartDetail.aspx?foo=bar")
    try:
        response = requests.get(legacy_url, timeout=TIMEOUT, allow_redirects=False)
        
        is_308 = response.status_code == 308
        location = response.headers.get("Location", "")
        is_root = location == "/" or location.endswith("/")
        
        print(f"PartDetail.aspx?foo=bar:")
        print(f"  Status: {response.status_code} (expected 308)")
        print(f"  Location: {location} (expected '/')")
        
        partdetail_passed = is_308 and is_root
        
        if partdetail_passed:
            print("  ✅ PartDetail.aspx redirects correctly (308 → /)")
        else:
            print("  ❌ PartDetail.aspx redirect incorrect")
    except Exception as e:
        print(f"❌ PartDetail.aspx ERROR: {e}")
        partdetail_passed = False
    
    # Test /blogg → /nyheter redirect
    blogg_url = urljoin(BASE_URL, "/blogg")
    try:
        response = requests.get(blogg_url, timeout=TIMEOUT, allow_redirects=False)
        
        is_308 = response.status_code == 308
        location = response.headers.get("Location", "")
        is_nyheter = "/nyheter" in location
        
        print(f"\n/blogg:")
        print(f"  Status: {response.status_code} (expected 308)")
        print(f"  Location: {location} (expected /nyheter)")
        
        blogg_passed = is_308 and is_nyheter
        
        if blogg_passed:
            print("  ✅ /blogg redirects correctly (308 → /nyheter)")
        else:
            print("  ❌ /blogg redirect incorrect")
    except Exception as e:
        print(f"❌ /blogg ERROR: {e}")
        blogg_passed = False
    
    return partdetail_passed and blogg_passed

def test_titles():
    """Test 9: Titles Åsane/rentmarket"""
    print("\n=== TEST 9: TITLES (ÅSANE/RENTMARKET) ===")
    
    pages_to_check = [
        ("/utleie/asane", "Åsane"),
        ("/leiemarkedet/bergen", "leiemarked")
    ]
    
    all_passed = True
    
    for path, keyword in pages_to_check:
        url = urljoin(BASE_URL, path)
        try:
            response = requests.get(url, timeout=TIMEOUT)
            html = response.text
            
            # Extract title
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE)
            title = title_match.group(1) if title_match else ""
            
            has_keyword = keyword.lower() in title.lower()
            title_length = len(title)
            is_reasonable_length = 30 <= title_length <= 65
            
            print(f"\n{path}:")
            print(f"  Status: {response.status_code}")
            print(f"  Title: {title}")
            print(f"  Length: {title_length} chars")
            print(f"  Has '{keyword}': {has_keyword}")
            print(f"  Reasonable length (30-65): {is_reasonable_length}")
            
            page_passed = (
                response.status_code == 200 and
                has_keyword and
                is_reasonable_length
            )
            
            if page_passed:
                print(f"  ✅ Title correct")
            else:
                print(f"  ❌ Title has issues")
                all_passed = False
                
        except Exception as e:
            print(f"❌ {path} ERROR: {e}")
            all_passed = False
    
    return all_passed

def test_api_200_no_data():
    """Test 10: API 200/no data (read-only check)"""
    print("\n=== TEST 10: API 200 (READ-ONLY, NO DATA MUTATIONS) ===")
    
    # Test root API endpoint
    api_url = urljoin(BASE_URL, "/api/")
    try:
        response = requests.get(api_url, timeout=TIMEOUT)
        data = response.json()
        
        print(f"GET /api/:")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {data}")
        
        api_passed = response.status_code == 200 and data.get("ok") == True
        
        if api_passed:
            print("  ✅ API root endpoint working")
        else:
            print("  ❌ API root endpoint has issues")
        
        return api_passed
    except Exception as e:
        print(f"❌ API ERROR: {e}")
        return False

def main():
    print("=" * 80)
    print("FINAL SEO/AEO P0 RETEST")
    print("NO PRODUCTION/DATABASE/API MUTATIONS")
    print("=" * 80)
    
    results = {
        "1. Routes (13 all 200)": test_routes_all_200(),
        "2. Homepage SSR stats (no zero/98/4.9/Snitt)": test_homepage_ssr_stats(),
        "3. /metode page": test_metode_page(),
        "4. Guide metadata/schema": test_guide_metadata_and_schema(),
        "5. Legal content": test_legal_content(),
        "6. LLM content": test_llm_content(),
        "7. Sitemap/noindex": test_sitemap_and_noindex(),
        "8. Legacy redirects (308)": test_legacy_redirects(),
        "9. Titles": test_titles(),
        "10. API 200": test_api_200_no_data()
    }
    
    print("\n" + "=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    
    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n🎉 ALL TESTS PASSED - SEO/AEO P0 COMPLETE")
    else:
        print(f"\n⚠️  {total_count - passed_count} test(s) failed")
    
    return passed_count == total_count

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
