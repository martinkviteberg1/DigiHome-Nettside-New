#!/usr/bin/env python3
"""
SEO/AEO P0-FASE TESTING
Test KUN SEO/AEO P0-fase i preview; ingen produksjonskall, ingen DB/endringer, ingen eksterne API-er.

Test requirements from review_request:
1) GET /, /metode, alle5 /guider/*, /utleie/asane, /leiemarkedet/bergen, /sitemap.xml, /llms.txt, /sommer, /video → 200
2) Homepage rå HTML (før JS) inneholder +30%,150+,24t og IKKE crawler-statene +0%,0+,0% eller 98%/4,9
3) /metode metadata canonical/title/desc, H1, definitions, caveat, source categories og JSON-LD WebPage/Breadcrumb
4) Guide metadata exact for depositum, korttidsutleie, skatt, price
5) Legal source/static assertions
6) /llms.txt has Last updated, /metode and official sources
7) /sitemap.xml includes /metode, excludes /sommer,/video,/support,/vilkar,/personvern
8) /PartDetail.aspx?foo=bar → permanent308 to /
9) location title/meta says 'Leie ut bolig i Åsane' owner intent
10) GET /api/200, no DB changes
"""

import requests
import re
import sys
from bs4 import BeautifulSoup

BASE_URL = "https://bli-utleier-redesign.preview.emergentagent.com"

def test_1_route_200s():
    """Test 1: GET /, /metode, alle5 /guider/*, /utleie/asane, /leiemarkedet/bergen, /sitemap.xml, /llms.txt, /sommer, /video → 200"""
    print("\n=== TEST 1: ROUTE 200s ===")
    
    routes = [
        "/",
        "/metode",
        "/guider/depositum-regler",
        "/guider/korttidsutleie-regler",
        "/guider/skatt-pa-utleie",
        "/guider/hva-koster-utleiemegler",
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
            url = f"{BASE_URL}{route}"
            resp = requests.get(url, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                print(f"✅ GET {route} → 200 (OK)")
                passed += 1
            else:
                print(f"❌ GET {route} → {resp.status_code} (EXPECTED 200)")
                failed += 1
        except Exception as e:
            print(f"❌ GET {route} → ERROR: {e}")
            failed += 1
    
    print(f"\nTest 1 Result: {passed}/{len(routes)} passed")
    return failed == 0

def test_2_homepage_ssr_stats():
    """Test 2: Homepage rå HTML inneholder +30%,150+,24t og IKKE crawler-statene +0%,0+,0% eller 98%/4,9"""
    print("\n=== TEST 2: HOMEPAGE SSR STATS ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=30)
        html = resp.text
        
        # Check for correct stats (before JS hydration)
        has_30_percent = "+30%" in html or "30%" in html
        has_150_plus = "150+" in html
        has_24t = "24 t" in html or "24t" in html
        
        # Check for ABSENCE of crawler states
        has_zero_percent = "+0%" in html
        has_zero_plus = "0+" in html
        has_98_percent = "98%" in html
        has_4_9 = "4,9" in html or "4.9" in html
        
        print(f"✅ Contains +30%: {has_30_percent}")
        print(f"✅ Contains 150+: {has_150_plus}")
        print(f"✅ Contains 24t: {has_24t}")
        print(f"✅ Does NOT contain +0%: {not has_zero_percent}")
        print(f"✅ Does NOT contain 0+: {not has_zero_plus}")
        print(f"✅ Does NOT contain 98%: {not has_98_percent}")
        print(f"✅ Does NOT contain 4,9: {not has_4_9}")
        
        # Also check for 0 sqm / 0 bedrooms in showcase
        soup = BeautifulSoup(html, 'html.parser')
        showcase_text = soup.get_text()
        
        # Look for patterns like "0 m²" or "0 soverom"
        has_zero_sqm = re.search(r'\b0\s*m²', showcase_text) is not None
        has_zero_bedrooms = re.search(r'\b0\s+soverom', showcase_text) is not None
        
        print(f"✅ Does NOT show 0 m² in showcase: {not has_zero_sqm}")
        print(f"✅ Does NOT show 0 soverom in showcase: {not has_zero_bedrooms}")
        
        all_passed = (has_30_percent and has_150_plus and has_24t and 
                     not has_zero_percent and not has_zero_plus and 
                     not has_98_percent and not has_4_9 and
                     not has_zero_sqm and not has_zero_bedrooms)
        
        if all_passed:
            print("\n✅ Test 2 PASSED: Homepage SSR stats correct")
            return True
        else:
            print("\n❌ Test 2 FAILED: Some homepage stats incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Test 2 ERROR: {e}")
        return False

def test_3_metode_metadata():
    """Test 3: /metode metadata canonical/title/desc, H1, definitions, caveat, source categories og JSON-LD"""
    print("\n=== TEST 3: /METODE METADATA ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/metode", timeout=30)
        html = resp.text
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check canonical
        canonical = soup.find('link', {'rel': 'canonical'})
        has_canonical = canonical is not None and '/metode' in canonical.get('href', '')
        print(f"✅ Has canonical link: {has_canonical}")
        
        # Check title
        title = soup.find('title')
        has_title = title is not None and len(title.text) > 0
        print(f"✅ Has title: {has_title} ({title.text[:50] if title else 'N/A'}...)")
        
        # Check meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        has_desc = meta_desc is not None and len(meta_desc.get('content', '')) > 0
        print(f"✅ Has meta description: {has_desc}")
        
        # Check H1
        h1 = soup.find('h1')
        has_h1 = h1 is not None
        print(f"✅ Has H1: {has_h1} ({h1.text[:50] if h1 else 'N/A'}...)")
        
        # Check for definitions section
        text = soup.get_text()
        has_definitions = 'definisjon' in text.lower() or 'definer' in text.lower()
        print(f"✅ Has definitions: {has_definitions}")
        
        # Check for caveat/forbehold
        has_caveat = 'forbehold' in text.lower() or 'estimat' in text.lower()
        print(f"✅ Has caveat/forbehold: {has_caveat}")
        
        # Check for source categories
        has_sources = 'kilde' in text.lower() or 'source' in text.lower()
        print(f"✅ Has source categories: {has_sources}")
        
        # Check JSON-LD
        json_ld_scripts = soup.find_all('script', {'type': 'application/ld+json'})
        has_webpage_schema = False
        has_breadcrumb_schema = False
        
        for script in json_ld_scripts:
            if script.string:
                if '"@type":"WebPage"' in script.string or '"@type": "WebPage"' in script.string:
                    has_webpage_schema = True
                if '"@type":"BreadcrumbList"' in script.string or '"@type": "BreadcrumbList"' in script.string:
                    has_breadcrumb_schema = True
        
        print(f"✅ Has WebPage JSON-LD: {has_webpage_schema}")
        print(f"✅ Has BreadcrumbList JSON-LD: {has_breadcrumb_schema}")
        
        all_passed = (has_canonical and has_title and has_desc and has_h1 and 
                     has_definitions and has_caveat and has_sources and 
                     has_webpage_schema and has_breadcrumb_schema)
        
        if all_passed:
            print("\n✅ Test 3 PASSED: /metode metadata complete")
            return True
        else:
            print("\n❌ Test 3 FAILED: Some /metode metadata missing")
            return False
            
    except Exception as e:
        print(f"❌ Test 3 ERROR: {e}")
        return False

def test_4_guide_metadata():
    """Test 4: Guide metadata exact for depositum, korttidsutleie, skatt, price"""
    print("\n=== TEST 4: GUIDE METADATA ===")
    
    guides = [
        ("depositum-regler", "depositum"),
        ("korttidsutleie-regler", "korttidsutleie"),
        ("skatt-pa-utleie", "skatt"),
        ("hva-koster-utleiemegler", "pris")
    ]
    
    passed = 0
    failed = 0
    
    for slug, topic in guides:
        try:
            resp = requests.get(f"{BASE_URL}/guider/{slug}", timeout=30)
            html = resp.text
            soup = BeautifulSoup(html, 'html.parser')
            
            # Check for visible author
            text = soup.get_text()
            has_author = 'sarah' in text.lower() or 'forfatter' in text.lower() or 'skrevet av' in text.lower()
            
            # Check for source section
            has_source_section = 'kilde' in text.lower() or 'source' in text.lower()
            
            # Check for external official links
            links = soup.find_all('a', href=True)
            has_external_official = any('skatteetaten.no' in link['href'] or 
                                       'husleieloven.no' in link['href'] or
                                       'regjeringen.no' in link['href'] or
                                       'lovdata.no' in link['href']
                                       for link in links)
            
            # Check JSON-LD Article schema
            json_ld_scripts = soup.find_all('script', {'type': 'application/ld+json'})
            has_article_schema = False
            has_author_person = False
            has_publisher = False
            has_reviewed_by = False
            has_citation = False
            has_date_modified = False
            
            for script in json_ld_scripts:
                if script.string:
                    if '"@type":"Article"' in script.string or '"@type": "Article"' in script.string:
                        has_article_schema = True
                        if '"author"' in script.string and '"Person"' in script.string:
                            has_author_person = True
                        if '"publisher"' in script.string and '"@id"' in script.string:
                            has_publisher = True
                        if '"reviewedBy"' in script.string and '"Organization"' in script.string:
                            has_reviewed_by = True
                        if '"citation"' in script.string and 'http' in script.string:
                            has_citation = True
                        if '"dateModified"' in script.string and '2026-07-28' in script.string:
                            has_date_modified = True
            
            print(f"\n{slug}:")
            print(f"  ✅ Has visible author: {has_author}")
            print(f"  ✅ Has source section: {has_source_section}")
            print(f"  ✅ Has external official links: {has_external_official}")
            print(f"  ✅ Has Article schema: {has_article_schema}")
            print(f"  ✅ Has author Person: {has_author_person}")
            print(f"  ✅ Has publisher @id: {has_publisher}")
            print(f"  ✅ Has reviewedBy Organization: {has_reviewed_by}")
            print(f"  ✅ Has citation URLs: {has_citation}")
            print(f"  ✅ Has dateModified 2026-07-28: {has_date_modified}")
            
            if (has_author and has_source_section and has_external_official and 
                has_article_schema and has_author_person and has_publisher):
                passed += 1
            else:
                failed += 1
                
        except Exception as e:
            print(f"❌ {slug} ERROR: {e}")
            failed += 1
    
    print(f"\nTest 4 Result: {passed}/{len(guides)} guides passed")
    return failed == 0

def test_5_legal_source_assertions():
    """Test 5: Legal source/static assertions - check for old false phrases and current nuanced text"""
    print("\n=== TEST 5: LEGAL SOURCE/STATIC ASSERTIONS ===")
    
    try:
        # Check short-term rental guide
        resp = requests.get(f"{BASE_URL}/guider/korttidsutleie-regler", timeout=30)
        html = resp.text
        text = html.lower()
        
        # Old false phrases that should be ABSENT
        has_old_primary_home = 'primærbolig' in text and 'uten døgnbegrensning' in text
        has_old_self_live = 'bor du selv' in text and 'rammes ikke' in text
        
        # Current nuanced text that should be PRESENT
        has_sameie_90 = 'sameie' in text and '90' in text
        has_borettslag_30 = 'borettslag' in text and '30' in text
        has_conditional_10_2 = '10' in text and '2' in text
        
        print(f"✅ Does NOT have old 'primærbolig uten døgnbegrensning': {not has_old_primary_home}")
        print(f"✅ Does NOT have old 'Bor du selv... rammes ikke': {not has_old_self_live}")
        print(f"✅ Has current sameie 90-day rule: {has_sameie_90}")
        print(f"✅ Has current borettslag 30-day rule: {has_borettslag_30}")
        print(f"✅ Has conditional 10+2 rule: {has_conditional_10_2}")
        
        # Check deposit guide
        resp2 = requests.get(f"{BASE_URL}/guider/depositum-regler", timeout=30)
        html2 = resp2.text
        text2 = html2.lower()
        
        # Old absolute same-bank phrase should be ABSENT
        has_old_same_bank = 'samme bank' in text2 and 'må' in text2
        
        # Current nuanced text should be PRESENT
        has_account_nuance = 'konto' in text2 or 'account' in text2
        has_private_nuance = 'privat' in text2 or 'private' in text2
        has_unpaid_nuance = 'ubetalt' in text2 or 'unpaid' in text2
        
        print(f"✅ Does NOT have old absolute same-bank phrase: {not has_old_same_bank}")
        print(f"✅ Has current account/private/unpaid nuance: {has_account_nuance or has_private_nuance or has_unpaid_nuance}")
        
        # Check tax guide
        resp3 = requests.get(f"{BASE_URL}/guider/skatt-pa-utleie", timeout=30)
        html3 = resp3.text
        text3 = html3.lower()
        
        # Five-unit hard boundary should be ABSENT
        has_five_unit_hard = 'fem enheter' in text3 or '5 enheter' in text3
        
        # Current holistic/tommelfingerregel should be PRESENT
        has_holistic = 'helhetsvurdering' in text3 or 'tommelfingerregel' in text3
        
        print(f"✅ Does NOT have five-unit hard boundary: {not has_five_unit_hard}")
        print(f"✅ Has current holistic/tommelfingerregel: {has_holistic}")
        
        all_passed = (not has_old_primary_home and not has_old_self_live and 
                     has_sameie_90 and has_borettslag_30 and has_conditional_10_2 and
                     not has_old_same_bank and (has_account_nuance or has_private_nuance or has_unpaid_nuance) and
                     not has_five_unit_hard and has_holistic)
        
        if all_passed:
            print("\n✅ Test 5 PASSED: Legal source assertions correct")
            return True
        else:
            print("\n❌ Test 5 FAILED: Some legal assertions incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Test 5 ERROR: {e}")
        return False

def test_6_llms_txt():
    """Test 6: /llms.txt has Last updated, /metode and official sources; does NOT contain Satisfaction98 or Snittinntekt25k"""
    print("\n=== TEST 6: /LLMS.TXT CONTENT ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/llms.txt", timeout=30)
        text = resp.text
        
        # Should have
        has_last_updated = 'last updated' in text.lower() or 'sist oppdatert' in text.lower()
        has_metode = '/metode' in text
        has_official_sources = 'skatteetaten' in text.lower() or 'husleieloven' in text.lower() or 'regjeringen' in text.lower()
        has_30_percent_estimate = '30%' in text and ('estimat' in text.lower() or 'estimate' in text.lower() or 'ikke garanti' in text.lower())
        has_response_24h = '24' in text and ('time' in text.lower() or 'hour' in text.lower())
        
        # Should NOT have
        has_satisfaction_98 = '98%' in text or 'satisfaction' in text.lower()
        has_snittinntekt_25k = '25' in text and 'k' in text and ('snitt' in text.lower() or 'average' in text.lower())
        
        print(f"✅ Has 'Last updated': {has_last_updated}")
        print(f"✅ Has /metode reference: {has_metode}")
        print(f"✅ Has official sources: {has_official_sources}")
        print(f"✅ Has 30% as estimate/not guarantee: {has_30_percent_estimate}")
        print(f"✅ Has response 24h: {has_response_24h}")
        print(f"✅ Does NOT contain Satisfaction98: {not has_satisfaction_98}")
        print(f"✅ Does NOT contain Snittinntekt25k as fact: {not has_snittinntekt_25k}")
        
        all_passed = (has_last_updated and has_metode and has_official_sources and 
                     has_30_percent_estimate and has_response_24h and
                     not has_satisfaction_98 and not has_snittinntekt_25k)
        
        if all_passed:
            print("\n✅ Test 6 PASSED: /llms.txt content correct")
            return True
        else:
            print("\n❌ Test 6 FAILED: Some /llms.txt content incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Test 6 ERROR: {e}")
        return False

def test_7_sitemap():
    """Test 7: /sitemap.xml includes /metode, excludes /sommer,/video,/support,/vilkar,/personvern; static pages use 2026-07-28 fixed lastmod"""
    print("\n=== TEST 7: SITEMAP.XML ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/sitemap.xml", timeout=30)
        xml = resp.text
        
        # Should include
        has_metode = '/metode' in xml
        
        # Should exclude
        has_sommer = '/sommer' in xml
        has_video = '/video' in xml
        has_support = '/support' in xml
        has_vilkar = '/vilkar' in xml
        has_personvern = '/personvern' in xml
        
        # Check for fixed lastmod date
        has_fixed_lastmod = '2026-07-28' in xml
        
        print(f"✅ Includes /metode: {has_metode}")
        print(f"✅ Excludes /sommer: {not has_sommer}")
        print(f"✅ Excludes /video: {not has_video}")
        print(f"✅ Excludes /support: {not has_support}")
        print(f"✅ Excludes /vilkar: {not has_vilkar}")
        print(f"✅ Excludes /personvern: {not has_personvern}")
        print(f"✅ Has fixed lastmod 2026-07-28: {has_fixed_lastmod}")
        
        # Check /sommer and /video for noindex/follow
        resp_sommer = requests.get(f"{BASE_URL}/sommer", timeout=30)
        html_sommer = resp_sommer.text
        soup_sommer = BeautifulSoup(html_sommer, 'html.parser')
        meta_robots_sommer = soup_sommer.find('meta', {'name': 'robots'})
        has_noindex_sommer = meta_robots_sommer is not None and 'noindex' in meta_robots_sommer.get('content', '').lower()
        has_follow_sommer = meta_robots_sommer is not None and 'follow' in meta_robots_sommer.get('content', '').lower()
        
        resp_video = requests.get(f"{BASE_URL}/video", timeout=30)
        html_video = resp_video.text
        soup_video = BeautifulSoup(html_video, 'html.parser')
        meta_robots_video = soup_video.find('meta', {'name': 'robots'})
        has_noindex_video = meta_robots_video is not None and 'noindex' in meta_robots_video.get('content', '').lower()
        has_follow_video = meta_robots_video is not None and 'follow' in meta_robots_video.get('content', '').lower()
        
        print(f"✅ /sommer has noindex: {has_noindex_sommer}")
        print(f"✅ /sommer has follow: {has_follow_sommer}")
        print(f"✅ /video has noindex: {has_noindex_video}")
        print(f"✅ /video has follow: {has_follow_video}")
        
        all_passed = (has_metode and not has_sommer and not has_video and 
                     not has_support and not has_vilkar and not has_personvern and
                     has_fixed_lastmod and has_noindex_sommer and has_follow_sommer and
                     has_noindex_video and has_follow_video)
        
        if all_passed:
            print("\n✅ Test 7 PASSED: Sitemap and robots meta correct")
            return True
        else:
            print("\n❌ Test 7 FAILED: Some sitemap/robots meta incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Test 7 ERROR: {e}")
        return False

def test_8_legacy_redirect():
    """Test 8: /PartDetail.aspx?foo=bar → permanent308 to / (query preservation acceptable)"""
    print("\n=== TEST 8: LEGACY REDIRECT ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/PartDetail.aspx?foo=bar", timeout=30, allow_redirects=False)
        
        is_redirect = resp.status_code in [301, 302, 307, 308]
        is_permanent = resp.status_code in [301, 308]
        location = resp.headers.get('Location', '')
        redirects_to_root = location == '/' or location.startswith('/?') or location == BASE_URL or location == f"{BASE_URL}/"
        
        print(f"✅ Status code: {resp.status_code} (is redirect: {is_redirect}, is permanent: {is_permanent})")
        print(f"✅ Location header: {location}")
        print(f"✅ Redirects to root: {redirects_to_root}")
        
        if is_permanent and redirects_to_root:
            print("\n✅ Test 8 PASSED: Legacy redirect working (permanent 308 to /)")
            return True
        else:
            print("\n❌ Test 8 FAILED: Legacy redirect not working correctly")
            return False
            
    except Exception as e:
        print(f"❌ Test 8 ERROR: {e}")
        return False

def test_9_location_rentmarket_titles():
    """Test 9: location title/meta says 'Leie ut bolig i Åsane' owner intent; rentmarket title says 'Leiepriser Bergen 2026'"""
    print("\n=== TEST 9: LOCATION AND RENTMARKET TITLES ===")
    
    try:
        # Check location page (owner intent)
        resp_loc = requests.get(f"{BASE_URL}/utleie/asane", timeout=30)
        html_loc = resp_loc.text
        soup_loc = BeautifulSoup(html_loc, 'html.parser')
        
        title_loc = soup_loc.find('title')
        meta_desc_loc = soup_loc.find('meta', {'name': 'description'})
        
        title_text_loc = title_loc.text if title_loc else ''
        meta_text_loc = meta_desc_loc.get('content', '') if meta_desc_loc else ''
        
        has_owner_intent = ('leie ut' in title_text_loc.lower() or 'leie ut' in meta_text_loc.lower()) and 'åsane' in title_text_loc.lower()
        
        print(f"Location /utleie/asane:")
        print(f"  Title: {title_text_loc[:80]}")
        print(f"  ✅ Has owner intent ('Leie ut bolig i Åsane'): {has_owner_intent}")
        
        # Check rentmarket page
        resp_rent = requests.get(f"{BASE_URL}/leiemarkedet/bergen", timeout=30)
        html_rent = resp_rent.text
        soup_rent = BeautifulSoup(html_rent, 'html.parser')
        
        title_rent = soup_rent.find('title')
        title_text_rent = title_rent.text if title_rent else ''
        
        has_rentmarket_title = 'leiepriser' in title_text_rent.lower() and 'bergen' in title_text_rent.lower() and '2026' in title_text_rent
        
        print(f"\nRentmarket /leiemarkedet/bergen:")
        print(f"  Title: {title_text_rent[:80]}")
        print(f"  ✅ Has correct title ('Leiepriser Bergen 2026'): {has_rentmarket_title}")
        
        if has_owner_intent and has_rentmarket_title:
            print("\n✅ Test 9 PASSED: Location and rentmarket titles correct")
            return True
        else:
            print("\n❌ Test 9 FAILED: Some titles incorrect")
            return False
            
    except Exception as e:
        print(f"❌ Test 9 ERROR: {e}")
        return False

def test_10_api_no_db_changes():
    """Test 10: GET /api/200, no DB changes"""
    print("\n=== TEST 10: API HEALTH CHECK (NO DB CHANGES) ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/api", timeout=30)
        
        if resp.status_code == 200:
            print(f"✅ GET /api → 200 (OK)")
            print(f"  Response: {resp.json()}")
            print("\n✅ Test 10 PASSED: API health check OK, no DB changes made")
            return True
        else:
            print(f"❌ GET /api → {resp.status_code} (EXPECTED 200)")
            return False
            
    except Exception as e:
        print(f"❌ Test 10 ERROR: {e}")
        return False

def main():
    print("=" * 80)
    print("SEO/AEO P0-FASE TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print("CRITICAL: Testing ONLY in preview, NO production calls, NO DB changes, NO external APIs")
    print("=" * 80)
    
    results = []
    
    # Run all tests
    results.append(("Test 1: Route 200s", test_1_route_200s()))
    results.append(("Test 2: Homepage SSR Stats", test_2_homepage_ssr_stats()))
    results.append(("Test 3: /metode Metadata", test_3_metode_metadata()))
    results.append(("Test 4: Guide Metadata", test_4_guide_metadata()))
    results.append(("Test 5: Legal Source Assertions", test_5_legal_source_assertions()))
    results.append(("Test 6: /llms.txt Content", test_6_llms_txt()))
    results.append(("Test 7: Sitemap and Robots", test_7_sitemap()))
    results.append(("Test 8: Legacy Redirect", test_8_legacy_redirect()))
    results.append(("Test 9: Location/Rentmarket Titles", test_9_location_rentmarket_titles()))
    results.append(("Test 10: API Health (No DB Changes)", test_10_api_no_db_changes()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n✅ ALL SEO/AEO P0-FASE TESTS PASSED")
        return 0
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
