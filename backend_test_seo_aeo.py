#!/usr/bin/env python3
"""
Backend test for ORGANISK SEO + AEO (Organic SEO + Answer Engine Optimization)
Tests server-side rendering, metadata, JSON-LD, sitemap, robots.txt, llms.txt, 301 redirects
"""

import requests
import json
import sys
from urllib.parse import urljoin
from html.parser import HTMLParser
import re

BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Expected guide URLs (12 guides)
GUIDE_URLS = [
    "/guider/hva-koster-utleiemegler",
    "/guider/leie-ut-leilighet-bergen",
    "/guider/utleiemegler-vs-selvforvaltning",
    "/guider/depositum-regler",
    "/guider/depositumskonto",
    "/guider/leietaker-har-ikke-betalt-depositum",
    "/guider/depositum-tilbakebetaling",
    "/guider/skatt-pa-utleie",
    "/guider/fradrag-utleiebolig",
    "/guider/korttidsutleie-regler",
    "/guider/godkjent-utleiedel",
    "/guider/husleieokning"
]

# Expected 301 redirects (4 redirects)
REDIRECTS = [
    ("/nyheter/skatt-pa-utleieinntekt-2026", "/guider/skatt-pa-utleie"),
    ("/nyheter/hva-koster-utleiemegler-i-bergen-2026", "/guider/hva-koster-utleiemegler"),
    ("/nyheter/leie-ut-bolig-i-bergen-komplett-guide-2026", "/guider/leie-ut-leilighet-bergen"),
    ("/nyheter/selvforvaltning-eller-full-forvaltning", "/guider/utleiemegler-vs-selvforvaltning")
]

# Remaining news articles (2 articles)
REMAINING_NEWS = [
    "/nyheter/korttid-eller-langtid-velg-riktig-utleiemodell",
    "/nyheter/5-ting-som-gjor-at-boligen-leies-ut-raskere"
]

class JSONLDExtractor(HTMLParser):
    """Extract JSON-LD scripts from HTML"""
    def __init__(self):
        super().__init__()
        self.json_ld_scripts = []
        self.in_script = False
        self.script_content = []
        
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            attrs_dict = dict(attrs)
            if attrs_dict.get('type') == 'application/ld+json':
                self.in_script = True
                self.script_content = []
    
    def handle_endtag(self, tag):
        if tag == 'script' and self.in_script:
            self.in_script = False
            content = ''.join(self.script_content)
            try:
                self.json_ld_scripts.append(json.loads(content))
            except json.JSONDecodeError:
                pass
    
    def handle_data(self, data):
        if self.in_script:
            self.script_content.append(data)

def test_scenario_a():
    """A) All 12 guide URLs respond 200 through public base"""
    print("\n=== SCENARIO A: All 12 guide URLs respond 200 ===")
    passed = 0
    failed = 0
    
    for guide_url in GUIDE_URLS:
        try:
            url = urljoin(BASE_URL, guide_url)
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                print(f"✅ {guide_url} → 200")
                passed += 1
            else:
                print(f"❌ {guide_url} → {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"❌ {guide_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario A: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_b():
    """B) NO unrendered markup in HTML: search for '](' and '**' in body text"""
    print("\n=== SCENARIO B: NO unrendered markup in HTML ===")
    passed = 0
    failed = 0
    
    for guide_url in GUIDE_URLS:
        try:
            url = urljoin(BASE_URL, guide_url)
            response = requests.get(url, timeout=30)
            html = response.text
            
            # Check for unrendered markdown link syntax ](
            if '](' in html:
                # Check if it's in actual content (not in script tags)
                # Simple heuristic: if it appears outside <script> tags
                body_start = html.find('<body')
                body_end = html.find('</body>')
                if body_start != -1 and body_end != -1:
                    body_html = html[body_start:body_end]
                    # Remove script tags
                    body_no_scripts = re.sub(r'<script[^>]*>.*?</script>', '', body_html, flags=re.DOTALL)
                    if '](' in body_no_scripts:
                        print(f"❌ {guide_url} → Found unrendered '](' in body")
                        failed += 1
                        continue
            
            # Check for unrendered markdown bold syntax **
            if '**' in html:
                body_start = html.find('<body')
                body_end = html.find('</body>')
                if body_start != -1 and body_end != -1:
                    body_html = html[body_start:body_end]
                    body_no_scripts = re.sub(r'<script[^>]*>.*?</script>', '', body_html, flags=re.DOTALL)
                    if '**' in body_no_scripts:
                        print(f"❌ {guide_url} → Found unrendered '**' in body")
                        failed += 1
                        continue
            
            print(f"✅ {guide_url} → No unrendered markup")
            passed += 1
            
        except Exception as e:
            print(f"❌ {guide_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario B: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_c():
    """C) JSON-LD per guide: parse all <script type="application/ld+json">"""
    print("\n=== SCENARIO C: JSON-LD structure per guide ===")
    passed = 0
    failed = 0
    
    for guide_url in GUIDE_URLS:
        try:
            url = urljoin(BASE_URL, guide_url)
            response = requests.get(url, timeout=30)
            html = response.text
            
            parser = JSONLDExtractor()
            parser.feed(html)
            json_ld_scripts = parser.json_ld_scripts
            
            if not json_ld_scripts:
                print(f"❌ {guide_url} → No JSON-LD found")
                failed += 1
                continue
            
            # Check for required schemas
            has_article = False
            has_breadcrumb = False
            has_faq = False
            
            for schema in json_ld_scripts:
                schema_type = schema.get('@type', '')
                
                if schema_type == 'Article':
                    has_article = True
                    # Verify Article fields
                    required_fields = ['headline', 'description', 'datePublished', 'dateModified', 'author', 'publisher', 'speakable', 'wordCount', 'keywords', 'about', 'citation', 'inLanguage']
                    missing = [f for f in required_fields if f not in schema]
                    if missing:
                        print(f"❌ {guide_url} → Article missing fields: {missing}")
                        failed += 1
                        continue
                    
                    # Check wordCount >= 700
                    if schema.get('wordCount', 0) < 700:
                        print(f"❌ {guide_url} → wordCount {schema.get('wordCount')} < 700")
                        failed += 1
                        continue
                    
                    # Check speakable has @type=SpeakableSpecification
                    speakable = schema.get('speakable', {})
                    if speakable.get('@type') != 'SpeakableSpecification':
                        print(f"❌ {guide_url} → speakable missing @type=SpeakableSpecification")
                        failed += 1
                        continue
                    
                    # Check citation has >= 2 URLs
                    citation = schema.get('citation', [])
                    if len(citation) < 2:
                        print(f"❌ {guide_url} → citation has {len(citation)} URLs, need >= 2")
                        failed += 1
                        continue
                    
                    # Check inLanguage='nb-NO'
                    if schema.get('inLanguage') != 'nb-NO':
                        print(f"❌ {guide_url} → inLanguage is {schema.get('inLanguage')}, expected 'nb-NO'")
                        failed += 1
                        continue
                    
                    # Check datePublished <= dateModified
                    date_pub = schema.get('datePublished', '')
                    date_mod = schema.get('dateModified', '')
                    if date_pub > date_mod:
                        print(f"❌ {guide_url} → datePublished > dateModified")
                        failed += 1
                        continue
                    
                    # Check no unrendered markup in JSON-LD
                    schema_str = json.dumps(schema)
                    if '](' in schema_str or '**' in schema_str:
                        print(f"❌ {guide_url} → JSON-LD contains unrendered markup '](' or '**'")
                        failed += 1
                        continue
                
                elif schema_type == 'BreadcrumbList':
                    has_breadcrumb = True
                    # Check 3 levels
                    items = schema.get('itemListElement', [])
                    if len(items) < 3:
                        print(f"❌ {guide_url} → BreadcrumbList has {len(items)} levels, need 3")
                        failed += 1
                        continue
                
                elif schema_type == 'FAQPage':
                    has_faq = True
                    # Check >= 4 questions
                    main_entity = schema.get('mainEntity', [])
                    if len(main_entity) < 4:
                        print(f"❌ {guide_url} → FAQPage has {len(main_entity)} questions, need >= 4")
                        failed += 1
                        continue
            
            if not has_article:
                print(f"❌ {guide_url} → Missing Article schema")
                failed += 1
                continue
            
            if not has_breadcrumb:
                print(f"❌ {guide_url} → Missing BreadcrumbList schema")
                failed += 1
                continue
            
            if not has_faq:
                print(f"❌ {guide_url} → Missing FAQPage schema")
                failed += 1
                continue
            
            print(f"✅ {guide_url} → All JSON-LD schemas valid")
            passed += 1
            
        except Exception as e:
            print(f"❌ {guide_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario C: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_d():
    """D) HowTo ONLY on /guider/leie-ut-leilighet-bergen with exactly 5 steps"""
    print("\n=== SCENARIO D: HowTo schema ===")
    passed = 0
    failed = 0
    
    # Check leie-ut-leilighet-bergen HAS HowTo
    try:
        url = urljoin(BASE_URL, "/guider/leie-ut-leilighet-bergen")
        response = requests.get(url, timeout=30)
        html = response.text
        
        parser = JSONLDExtractor()
        parser.feed(html)
        json_ld_scripts = parser.json_ld_scripts
        
        has_howto = False
        for schema in json_ld_scripts:
            if schema.get('@type') == 'HowTo':
                has_howto = True
                steps = schema.get('step', [])
                if len(steps) != 5:
                    print(f"❌ /guider/leie-ut-leilighet-bergen → HowTo has {len(steps)} steps, expected 5")
                    failed += 1
                else:
                    # Check each step name is visible in HTML
                    all_visible = True
                    for step in steps:
                        step_name = step.get('name', '')
                        if step_name and step_name not in html:
                            print(f"❌ /guider/leie-ut-leilighet-bergen → Step '{step_name}' not visible in HTML")
                            all_visible = False
                    
                    if all_visible:
                        print(f"✅ /guider/leie-ut-leilighet-bergen → HowTo with 5 steps, all visible")
                        passed += 1
                    else:
                        failed += 1
                break
        
        if not has_howto:
            print(f"❌ /guider/leie-ut-leilighet-bergen → Missing HowTo schema")
            failed += 1
    except Exception as e:
        print(f"❌ /guider/leie-ut-leilighet-bergen → ERROR: {e}")
        failed += 1
    
    # Check other 11 guides do NOT have HowTo
    other_guides = [g for g in GUIDE_URLS if g != "/guider/leie-ut-leilighet-bergen"]
    for guide_url in other_guides:
        try:
            url = urljoin(BASE_URL, guide_url)
            response = requests.get(url, timeout=30)
            html = response.text
            
            parser = JSONLDExtractor()
            parser.feed(html)
            json_ld_scripts = parser.json_ld_scripts
            
            has_howto = any(schema.get('@type') == 'HowTo' for schema in json_ld_scripts)
            if has_howto:
                print(f"❌ {guide_url} → Should NOT have HowTo schema")
                failed += 1
            else:
                print(f"✅ {guide_url} → Correctly has no HowTo")
                passed += 1
        except Exception as e:
            print(f"❌ {guide_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario D: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_e():
    """E) FAQ with links on depositum-tilbakebetaling and husleieokning"""
    print("\n=== SCENARIO E: FAQ with links ===")
    passed = 0
    failed = 0
    
    guides_with_links = [
        "/guider/depositum-tilbakebetaling",
        "/guider/husleieokning"
    ]
    
    for guide_url in guides_with_links:
        try:
            url = urljoin(BASE_URL, guide_url)
            response = requests.get(url, timeout=30)
            html = response.text
            
            parser = JSONLDExtractor()
            parser.feed(html)
            json_ld_scripts = parser.json_ld_scripts
            
            faq_found = False
            for schema in json_ld_scripts:
                if schema.get('@type') == 'FAQPage':
                    faq_found = True
                    main_entity = schema.get('mainEntity', [])
                    
                    has_link_in_answer = False
                    question_is_plain_text = True
                    
                    for qa in main_entity:
                        question_name = qa.get('name', '')
                        answer_text = qa.get('acceptedAnswer', {}).get('text', '')
                        
                        # Check Question.name is plain text (no markup)
                        if '<' in question_name or '>' in question_name:
                            print(f"❌ {guide_url} → Question.name contains markup: {question_name[:50]}")
                            question_is_plain_text = False
                        
                        # Check Answer.text contains <a href="https://digihome.no/guider/...">
                        if '<a href="https://digihome.no/guider/' in answer_text:
                            has_link_in_answer = True
                    
                    if not has_link_in_answer:
                        print(f"❌ {guide_url} → No <a href> links in FAQ Answer.text")
                        failed += 1
                    elif not question_is_plain_text:
                        failed += 1
                    else:
                        # Check visible HTML also has <a> tag
                        if '<a' in html and 'href' in html:
                            print(f"✅ {guide_url} → FAQ with links in JSON-LD and HTML")
                            passed += 1
                        else:
                            print(f"❌ {guide_url} → FAQ links in JSON-LD but not visible in HTML")
                            failed += 1
                    break
            
            if not faq_found:
                print(f"❌ {guide_url} → No FAQPage found")
                failed += 1
                
        except Exception as e:
            print(f"❌ {guide_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario E: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_f():
    """F) 301 consolidation - 4 redirects with status 301 or 308"""
    print("\n=== SCENARIO F: 301 consolidation ===")
    passed = 0
    failed = 0
    
    for source, target in REDIRECTS:
        try:
            url = urljoin(BASE_URL, source)
            response = requests.get(url, allow_redirects=False, timeout=30)
            
            if response.status_code in [301, 308]:
                location = response.headers.get('Location', '')
                expected_target = urljoin(BASE_URL, target)
                
                # Normalize URLs for comparison
                if location.endswith('/'):
                    location = location[:-1]
                if expected_target.endswith('/'):
                    expected_target = expected_target[:-1]
                
                if location == expected_target or location == target:
                    print(f"✅ {source} → {response.status_code} → {target}")
                    passed += 1
                else:
                    print(f"❌ {source} → {response.status_code} but Location={location}, expected {target}")
                    failed += 1
            else:
                print(f"❌ {source} → {response.status_code}, expected 301 or 308")
                failed += 1
                
        except Exception as e:
            print(f"❌ {source} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario F: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_g():
    """G) /sitemap.xml contains all 12 guides, 2 remaining news, NO redirected slugs, NO duplicates"""
    print("\n=== SCENARIO G: /sitemap.xml ===")
    
    try:
        url = urljoin(BASE_URL, "/sitemap.xml")
        response = requests.get(url, timeout=30)
        sitemap_xml = response.text
        
        # Check all 12 guides are present
        guides_found = 0
        for guide_url in GUIDE_URLS:
            if guide_url in sitemap_xml:
                guides_found += 1
            else:
                print(f"❌ Sitemap missing guide: {guide_url}")
        
        # Check 2 remaining news articles are present
        news_found = 0
        for news_url in REMAINING_NEWS:
            if news_url in sitemap_xml:
                news_found += 1
            else:
                print(f"❌ Sitemap missing news: {news_url}")
        
        # Check NO redirected slugs are present
        redirected_found = 0
        for source, _ in REDIRECTS:
            if source in sitemap_xml:
                print(f"❌ Sitemap contains redirected URL: {source}")
                redirected_found += 1
        
        # Check for duplicates
        urls = re.findall(r'<loc>(.*?)</loc>', sitemap_xml)
        duplicates = [url for url in urls if urls.count(url) > 1]
        unique_duplicates = list(set(duplicates))
        
        if unique_duplicates:
            print(f"❌ Sitemap has duplicate URLs: {unique_duplicates}")
        
        print(f"\nSitemap: {guides_found}/12 guides, {news_found}/2 news, {redirected_found} redirected (should be 0), {len(unique_duplicates)} duplicates (should be 0)")
        
        success = (guides_found == 12 and news_found == 2 and redirected_found == 0 and len(unique_duplicates) == 0)
        if success:
            print("✅ Sitemap structure correct")
        
        return success
        
    except Exception as e:
        print(f"❌ Sitemap ERROR: {e}")
        return False

def test_scenario_h():
    """H) /robots.txt and /llms.txt"""
    print("\n=== SCENARIO H: /robots.txt and /llms.txt ===")
    passed = 0
    failed = 0
    
    # Check robots.txt
    try:
        url = urljoin(BASE_URL, "/robots.txt")
        response = requests.get(url, timeout=30)
        robots_txt = response.text
        
        required_bots = ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'OAI-SearchBot']
        has_all_bots = all(bot in robots_txt for bot in required_bots)
        has_sitemap = 'sitemap' in robots_txt.lower()
        
        if has_all_bots and has_sitemap:
            print(f"✅ /robots.txt has all required bots and sitemap reference")
            passed += 1
        else:
            print(f"❌ /robots.txt missing bots or sitemap")
            failed += 1
    except Exception as e:
        print(f"❌ /robots.txt ERROR: {e}")
        failed += 1
    
    # Check llms.txt
    try:
        url = urljoin(BASE_URL, "/llms.txt")
        response = requests.get(url, timeout=30)
        llms_txt = response.text
        
        # Check all 12 guides are present
        guides_found = sum(1 for guide_url in GUIDE_URLS if guide_url in llms_txt)
        
        # Check "Direkte svar" section
        has_direkte_svar = 'Direkte svar' in llms_txt
        
        if guides_found == 12 and has_direkte_svar:
            print(f"✅ /llms.txt has all 12 guides and 'Direkte svar' section")
            passed += 1
        else:
            print(f"❌ /llms.txt has {guides_found}/12 guides, direkte_svar={has_direkte_svar}")
            failed += 1
    except Exception as e:
        print(f"❌ /llms.txt ERROR: {e}")
        failed += 1
    
    print(f"\nScenario H: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_i():
    """I) Hub pages: /guider and /nyheter"""
    print("\n=== SCENARIO I: Hub pages ===")
    passed = 0
    failed = 0
    
    # Check /guider
    try:
        url = urljoin(BASE_URL, "/guider")
        response = requests.get(url, timeout=30)
        html = response.text
        
        parser = JSONLDExtractor()
        parser.feed(html)
        json_ld_scripts = parser.json_ld_scripts
        
        has_collection = False
        for schema in json_ld_scripts:
            if schema.get('@type') == 'CollectionPage':
                has_collection = True
                main_entity = schema.get('mainEntity', {})
                num_items = main_entity.get('numberOfItems', 0)
                
                if num_items == 12:
                    # Check all 12 guides are linked in HTML
                    guides_linked = sum(1 for guide_url in GUIDE_URLS if guide_url in html)
                    if guides_linked == 12:
                        print(f"✅ /guider → CollectionPage with 12 items, all linked")
                        passed += 1
                    else:
                        print(f"❌ /guider → Only {guides_linked}/12 guides linked in HTML")
                        failed += 1
                else:
                    print(f"❌ /guider → numberOfItems={num_items}, expected 12")
                    failed += 1
                break
        
        if not has_collection:
            print(f"❌ /guider → Missing CollectionPage schema")
            failed += 1
    except Exception as e:
        print(f"❌ /guider ERROR: {e}")
        failed += 1
    
    # Check /nyheter
    try:
        url = urljoin(BASE_URL, "/nyheter")
        response = requests.get(url, timeout=30)
        html = response.text
        
        parser = JSONLDExtractor()
        parser.feed(html)
        json_ld_scripts = parser.json_ld_scripts
        
        has_collection_or_itemlist = False
        for schema in json_ld_scripts:
            if schema.get('@type') in ['CollectionPage', 'ItemList']:
                has_collection_or_itemlist = True
                break
        
        # Check title contains "Nyheter og innsikt om utleie i Bergen"
        has_correct_title = 'Nyheter og innsikt om utleie i Bergen' in html
        
        # Check NO links to redirected slugs
        redirected_linked = sum(1 for source, _ in REDIRECTS if source in html)
        
        if has_collection_or_itemlist and has_correct_title and redirected_linked == 0:
            print(f"✅ /nyheter → CollectionPage/ItemList, correct title, no redirected links")
            passed += 1
        else:
            print(f"❌ /nyheter → schema={has_collection_or_itemlist}, title={has_correct_title}, redirected_links={redirected_linked}")
            failed += 1
    except Exception as e:
        print(f"❌ /nyheter ERROR: {e}")
        failed += 1
    
    print(f"\nScenario I: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_j():
    """J) Title checks on specific pages"""
    print("\n=== SCENARIO J: Title checks ===")
    passed = 0
    failed = 0
    
    title_checks = [
        ("/utleiemegler-bergen", "Utleiemegler i Bergen: pris fra 5 %"),
        ("/leiemarkedet/bergen", "Leiepriser i Bergen"),
        ("/utleie/asane", "Leie ut bolig i Åsane")
    ]
    
    for path, expected_text in title_checks:
        try:
            url = urljoin(BASE_URL, path)
            response = requests.get(url, timeout=30)
            html = response.text
            
            if expected_text in html:
                print(f"✅ {path} → Contains '{expected_text}'")
                passed += 1
            else:
                print(f"❌ {path} → Missing '{expected_text}'")
                failed += 1
        except Exception as e:
            print(f"❌ {path} → ERROR: {e}")
            failed += 1
    
    # Check other utleie pages respond 200
    other_pages = ["/utleie/bergen", "/utleie/sentrum", "/utleie/fana"]
    for path in other_pages:
        try:
            url = urljoin(BASE_URL, path)
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                print(f"✅ {path} → 200")
                passed += 1
            else:
                print(f"❌ {path} → {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"❌ {path} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario J: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_k():
    """K) Article template on remaining news articles"""
    print("\n=== SCENARIO K: Article template ===")
    passed = 0
    failed = 0
    
    for news_url in REMAINING_NEWS:
        try:
            url = urljoin(BASE_URL, news_url)
            response = requests.get(url, timeout=30)
            html = response.text
            
            if response.status_code != 200:
                print(f"❌ {news_url} → {response.status_code}")
                failed += 1
                continue
            
            parser = JSONLDExtractor()
            parser.feed(html)
            json_ld_scripts = parser.json_ld_scripts
            
            has_blog_posting = False
            for schema in json_ld_scripts:
                # Check if BlogPosting is directly in schema or in @graph array
                if schema.get('@type') == 'BlogPosting':
                    has_blog_posting = True
                elif '@graph' in schema:
                    for item in schema['@graph']:
                        if item.get('@type') == 'BlogPosting':
                            schema = item  # Use the BlogPosting from @graph
                            has_blog_posting = True
                            break
                
                if has_blog_posting:
                    
                    # Check speakable
                    if 'speakable' not in schema:
                        print(f"❌ {news_url} → BlogPosting missing speakable")
                        failed += 1
                        break
                    
                    # Check wordCount > 0
                    word_count = schema.get('wordCount', 0)
                    if word_count <= 0:
                        print(f"❌ {news_url} → BlogPosting wordCount={word_count}")
                        failed += 1
                        break
                    
                    # Check class dh-answer in HTML
                    if 'dh-answer' not in html:
                        print(f"❌ {news_url} → Missing class 'dh-answer' in HTML")
                        failed += 1
                        break
                    
                    # Check at least 3 links to /guider/
                    guide_links = html.count('/guider/')
                    if guide_links < 3:
                        print(f"❌ {news_url} → Only {guide_links} links to /guider/, need >= 3")
                        failed += 1
                        break
                    
                    print(f"✅ {news_url} → BlogPosting with speakable, wordCount={word_count}, dh-answer class, {guide_links} guide links")
                    passed += 1
                    break
            
            if not has_blog_posting:
                print(f"❌ {news_url} → Missing BlogPosting schema")
                failed += 1
                
        except Exception as e:
            print(f"❌ {news_url} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario K: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_l():
    """L) REGRESSION - API should be untouched"""
    print("\n=== SCENARIO L: API Regression ===")
    passed = 0
    failed = 0
    
    api_tests = [
        ("/api/health", 200, None),
        ("/api/public/listings", 200, None),
        (f"/api/admin/properties?key={ADMIN_KEY}", 200, {"total": 22}),
        (f"/api/admin/notify-status?key={ADMIN_KEY}", 200, None),
        ("/api/admin/notify-status", 401, None),  # Without key
        (f"/api/property-interest/outbox?key={ADMIN_KEY}&status=alle", 200, None),
        ("/api/brreg?q=DNB", 200, None)
    ]
    
    for path, expected_status, expected_data in api_tests:
        try:
            url = urljoin(BASE_URL, path)
            response = requests.get(url, timeout=30)
            
            if response.status_code == expected_status:
                if expected_data:
                    data = response.json()
                    match = all(data.get(k) == v for k, v in expected_data.items())
                    if match:
                        print(f"✅ {path.split('?')[0]} → {expected_status} with expected data")
                        passed += 1
                    else:
                        print(f"❌ {path.split('?')[0]} → {expected_status} but data mismatch")
                        failed += 1
                else:
                    print(f"✅ {path.split('?')[0]} → {expected_status}")
                    passed += 1
            else:
                print(f"❌ {path.split('?')[0]} → {response.status_code}, expected {expected_status}")
                failed += 1
        except Exception as e:
            print(f"❌ {path.split('?')[0]} → ERROR: {e}")
            failed += 1
    
    print(f"\nScenario L: {passed} passed, {failed} failed")
    return failed == 0

def test_scenario_m():
    """M) REGRESSION - Pages should respond 200"""
    print("\n=== SCENARIO M: Page Regression ===")
    passed = 0
    failed = 0
    
    pages = [
        "/",
        "/tjenester",
        "/forvaltning",
        "/bli-utleier",
        "/bli-utleier/start",
        "/bli-leietaker",
        "/ledige-boliger",
        "/priskalkulator",
        "/radgivning",
        "/om-oss",
        "/kontakt",
        "/metode",
        "/utleie",
        "/leiemarkedet",
        "/airbnb-forvaltning-bergen",
        "/lp/gratis-vurdering",
        "/admin"
    ]
    
    for path in pages:
        try:
            url = urljoin(BASE_URL, path)
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                print(f"✅ {path} → 200")
                passed += 1
            else:
                print(f"❌ {path} → {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"❌ {path} → ERROR: {e}")
            failed += 1
    
    # Note: /nyhetsbrev gives 404 - this is EXPECTED (route never existed)
    print(f"\nNote: /nyhetsbrev gives 404 - this is EXPECTED (route never existed)")
    
    print(f"\nScenario M: {passed} passed, {failed} failed")
    return failed == 0

def main():
    print("=" * 80)
    print("BACKEND TEST: ORGANISK SEO + AEO")
    print("Base URL:", BASE_URL)
    print("=" * 80)
    
    results = {}
    
    # Run all scenarios
    results['A'] = test_scenario_a()
    results['B'] = test_scenario_b()
    results['C'] = test_scenario_c()
    results['D'] = test_scenario_d()
    results['E'] = test_scenario_e()
    results['F'] = test_scenario_f()
    results['G'] = test_scenario_g()
    results['H'] = test_scenario_h()
    results['I'] = test_scenario_i()
    results['J'] = test_scenario_j()
    results['K'] = test_scenario_k()
    results['L'] = test_scenario_l()
    results['M'] = test_scenario_m()
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for v in results.values() if v)
    failed = len(results) - passed
    
    for scenario, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"Scenario {scenario}: {status}")
    
    print(f"\nTotal: {passed}/{len(results)} scenarios passed")
    
    if failed == 0:
        print("\n✅ ALL TESTS PASSED")
        return 0
    else:
        print(f"\n❌ {failed} TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
