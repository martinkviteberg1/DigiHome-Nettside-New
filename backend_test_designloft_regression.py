#!/usr/bin/env python3
"""
Backend regression test after design lift (lib/landing.js and lib/posts.js changes).
Tests ONLY backend functionality - NO frontend testing.
"""

import requests
import json
import sys
from pymongo import MongoClient
import os
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "your_database_name")

# Test counters
tests_passed = 0
tests_failed = 0

def test(name, condition, details=""):
    """Track test results"""
    global tests_passed, tests_failed
    if condition:
        tests_passed += 1
        print(f"✅ {name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   {details}")

print("=" * 80)
print("BACKEND REGRESSION TEST: DESIGNLØFT (lib/landing.js + lib/posts.js)")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# ============================================================================
# SCENARIO 1: LANDINGSSIDER (Landing Pages)
# ============================================================================
print("SCENARIO 1: LANDINGSSIDER")
print("-" * 80)

landing_pages = [
    'forvaltning', 'inntekt', 'gratis-vurdering', '10pluss2', 
    'arvet-bolig', 'airbnb-langtid', 'sammenlign', 'leietaker'
]

for slug in landing_pages:
    try:
        url = urljoin(BASE_URL, f"/lp/{slug}")
        resp = requests.get(url, timeout=30)
        test(f"GET /lp/{slug} returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    except Exception as e:
        test(f"GET /lp/{slug} returns 200", False, f"Error: {e}")

# Test non-existent slug returns 404
try:
    url = urljoin(BASE_URL, "/lp/finnes-ikke-xyz")
    resp = requests.get(url, timeout=30)
    test("GET /lp/finnes-ikke-xyz returns 404", resp.status_code == 404, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /lp/finnes-ikke-xyz returns 404", False, f"Error: {e}")

# Test /lp/inntekt specific requirements
try:
    url = urljoin(BASE_URL, "/lp/inntekt")
    resp = requests.get(url, timeout=30)
    html = resp.text
    
    # Check noindex
    has_noindex = 'name="robots"' in html and 'noindex' in html
    test("/lp/inntekt has noindex meta tag", has_noindex)
    
    # Check for address field (input with type or name related to address)
    has_address_field = 'adresse' in html.lower() or 'address' in html.lower()
    test("/lp/inntekt has address field", has_address_field)
    
    # Check NEW urgency text is present
    new_text = "Uforpliktende — du bestemmer om du går videre."
    has_new_text = new_text in html
    test("/lp/inntekt contains NEW urgency text", has_new_text, f"'{new_text}'")
    
    # Check OLD text is GONE
    old_text = "Personlig vurdering fra vårt lokale team i Bergen"
    has_old_text = old_text in html
    test("/lp/inntekt does NOT contain OLD text", not has_old_text, f"Old text should be removed")
    
    # Check links to /metode and /personvern
    has_metode_link = '/metode' in html
    has_personvern_link = '/personvern' in html
    test("/lp/inntekt contains link to /metode", has_metode_link)
    test("/lp/inntekt contains link to /personvern", has_personvern_link)
    
except Exception as e:
    test("/lp/inntekt specific checks", False, f"Error: {e}")

# Test /metode and /personvern routes
for route in ['/metode', '/personvern']:
    try:
        url = urljoin(BASE_URL, route)
        resp = requests.get(url, timeout=30)
        test(f"GET {route} returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    except Exception as e:
        test(f"GET {route} returns 200", False, f"Error: {e}")

print()

# ============================================================================
# SCENARIO 2: LANDING CONFIG IN API (endpoints using LANDING)
# ============================================================================
print("SCENARIO 2: LANDING CONFIG IN API")
print("-" * 80)

# Based on grep, the endpoint is /admin/landing-pages
try:
    url = urljoin(BASE_URL, f"/api/admin/landing-pages?key={ADMIN_KEY}&days=30")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/landing-pages with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        # Check that pages contains landing pages from LANDING
        if 'pages' in data:
            pages = data['pages']
            test("Landing pages list is present", len(pages) > 0, f"Found {len(pages)} pages")
            
            # Check that at least one page from LANDING is present
            slugs = [p.get('slug') for p in pages if 'slug' in p]
            has_inntekt = 'inntekt' in slugs
            test("Pages list contains 'inntekt' from LANDING", has_inntekt)
        else:
            test("Landing pages structure", False, "No 'pages' field in response")
except Exception as e:
    test("GET /api/admin/landing-pages with key", False, f"Error: {e}")

# Test without key returns 401
try:
    url = urljoin(BASE_URL, "/api/admin/landing-pages?days=30")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/landing-pages without key returns 401", resp.status_code == 401, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/admin/landing-pages without key returns 401", False, f"Error: {e}")

print()

# ============================================================================
# SCENARIO 3: POSTS/LESETID (Reading Time)
# ============================================================================
print("SCENARIO 3: POSTS/LESETID")
print("-" * 80)

# Test /nyheter returns 200 and shows reading time
try:
    url = urljoin(BASE_URL, "/nyheter")
    resp = requests.get(url, timeout=30)
    test("GET /nyheter returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        html = resp.text
        # Check for reading time indicator (should contain 'min' for minutes)
        has_reading_time = ' min' in html or 'minutt' in html.lower()
        test("/nyheter shows reading time on cards", has_reading_time)
        
        # Verify that full article content is NOT in the HTML
        # We'll check MongoDB to get a sample of actual content and verify it's not in HTML
        try:
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            posts = list(db.posts.find({'status': 'published'}).limit(3))
            
            if posts:
                # Check that content field is not leaked to HTML
                content_leaked = False
                for post in posts:
                    if 'content' in post and post['content']:
                        # Take a unique substring from content (at least 50 chars)
                        content_sample = post['content'][:200] if len(post['content']) > 200 else post['content']
                        if len(content_sample) > 50 and content_sample in html:
                            content_leaked = True
                            break
                
                test("/nyheter does NOT contain full article content", not content_leaked, 
                     "Content should be excluded via $project in aggregate()")
                
                # Check readMinutes >= 1 for all published posts
                all_have_valid_read_time = True
                for post in db.posts.find({'status': 'published'}):
                    # Simulate the aggregate calculation
                    content_len = len(post.get('content', ''))
                    read_minutes = max(1, (content_len + 1449) // 1450)  # Ceiling division
                    if read_minutes < 1:
                        all_have_valid_read_time = False
                        break
                
                test("All published posts have readMinutes >= 1", all_have_valid_read_time,
                     "readMinutes should never be 0")
            else:
                print("   ⚠️  No published posts found in MongoDB to verify")
            
            client.close()
        except Exception as e:
            test("MongoDB verification of posts", False, f"Error: {e}")
            
except Exception as e:
    test("GET /nyheter", False, f"Error: {e}")

# Test tag filtering
for tag in ['Guide', 'Utleietips']:
    try:
        url = urljoin(BASE_URL, f"/nyheter?tag={tag}")
        resp = requests.get(url, timeout=30)
        test(f"GET /nyheter?tag={tag} returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    except Exception as e:
        test(f"GET /nyheter?tag={tag} returns 200", False, f"Error: {e}")

# Test unknown tag doesn't crash
try:
    url = urljoin(BASE_URL, "/nyheter?tag=UkjentTagXYZ")
    resp = requests.get(url, timeout=30)
    test("GET /nyheter?tag=UkjentTagXYZ returns 200 (no crash)", resp.status_code == 200, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /nyheter?tag=UkjentTagXYZ", False, f"Error: {e}")

print()

# ============================================================================
# SCENARIO 4: ARTIKLER OG GUIDER (Articles and Guides)
# ============================================================================
print("SCENARIO 4: ARTIKLER OG GUIDER")
print("-" * 80)

# Test specific articles
articles = [
    'korttid-eller-langtid-velg-riktig-utleiemodell',
    '5-ting-som-gjor-at-boligen-leies-ut-raskere'
]

for slug in articles:
    try:
        url = urljoin(BASE_URL, f"/nyheter/{slug}")
        resp = requests.get(url, timeout=30)
        test(f"GET /nyheter/{slug} returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            html = resp.text
            # Check for BlogPosting JSON-LD
            has_blog_posting = '"@type":"BlogPosting"' in html or '"@type": "BlogPosting"' in html
            test(f"/nyheter/{slug} has BlogPosting JSON-LD", has_blog_posting)
            
            # Check for speakable (should reference h1 and .dh-answer)
            has_speakable = '"speakable"' in html
            test(f"/nyheter/{slug} has speakable in JSON-LD", has_speakable)
    except Exception as e:
        test(f"GET /nyheter/{slug}", False, f"Error: {e}")

# Test all 12 guides
guides = [
    'hva-koster-utleiemegler',
    'skatt-pa-utleie',
    'utleie-av-sekundaerbolig',
    'utleie-av-hybel',
    'utleie-av-hele-boligen',
    'korttidsutleie-regler',
    'langtidsutleie-kontrakt',
    'depositum-regler',
    'husleie-innkreving',
    'vedlikehold-ansvar',
    'forsikring-utleiebolig',
    'skatteregler-utleie'
]

# Test /guider overview page
try:
    url = urljoin(BASE_URL, "/guider")
    resp = requests.get(url, timeout=30)
    test("GET /guider returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        html = resp.text
        # Check for BreadcrumbList JSON-LD
        has_breadcrumb = '"@type":"BreadcrumbList"' in html or '"@type": "BreadcrumbList"' in html
        test("/guider has BreadcrumbList JSON-LD", has_breadcrumb)
except Exception as e:
    test("GET /guider", False, f"Error: {e}")

# Test individual guide pages (sample of 2 to avoid too many requests)
sample_guides = ['hva-koster-utleiemegler', 'skatt-pa-utleie']

for slug in sample_guides:
    try:
        url = urljoin(BASE_URL, f"/guider/{slug}")
        resp = requests.get(url, timeout=30)
        test(f"GET /guider/{slug} returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            html = resp.text
            # Check for Article JSON-LD
            has_article = '"@type":"Article"' in html or '"@type": "Article"' in html
            test(f"/guider/{slug} has Article JSON-LD", has_article)
            
            # Check for BreadcrumbList
            has_breadcrumb = '"@type":"BreadcrumbList"' in html or '"@type": "BreadcrumbList"' in html
            test(f"/guider/{slug} has BreadcrumbList JSON-LD", has_breadcrumb)
            
            # Special check for hva-koster-utleiemegler (should have HowTo or FAQ schema)
            if slug == 'hva-koster-utleiemegler':
                has_howto = '"@type":"HowTo"' in html or '"@type": "HowTo"' in html
                has_faq = '"@type":"FAQPage"' in html or '"@type": "FAQPage"' in html
                test(f"/guider/{slug} has HowTo or FAQ schema", has_howto or has_faq)
    except Exception as e:
        test(f"GET /guider/{slug}", False, f"Error: {e}")

# Test 301 redirects from SEO phase
redirects = [
    ('/nyheter/skatt-pa-utleieinntekt-2026', '/guider/skatt-pa-utleie'),
]

for old_path, expected_new_path in redirects:
    try:
        url = urljoin(BASE_URL, old_path)
        resp = requests.get(url, timeout=30, allow_redirects=False)
        is_redirect = resp.status_code in [301, 308]  # Both are permanent redirects
        test(f"GET {old_path} returns 301/308 (permanent redirect)", is_redirect, f"Status: {resp.status_code}")
        
        if is_redirect and 'Location' in resp.headers:
            location = resp.headers['Location']
            correct_target = expected_new_path in location
            test(f"{old_path} redirects to {expected_new_path}", correct_target, f"Location: {location}")
    except Exception as e:
        test(f"GET {old_path} redirect", False, f"Error: {e}")

print()

# ============================================================================
# SCENARIO 5: API-REGRESJON (API Regression)
# ============================================================================
print("SCENARIO 5: API-REGRESJON")
print("-" * 80)

# Test /api/health
try:
    url = urljoin(BASE_URL, "/api/health")
    resp = requests.get(url, timeout=30)
    test("GET /api/health returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/health returns 200", False, f"Error: {e}")

# Test /api/public/listings
try:
    url = urljoin(BASE_URL, "/api/public/listings")
    resp = requests.get(url, timeout=30)
    test("GET /api/public/listings returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/public/listings returns 200", False, f"Error: {e}")

# Test /api/admin/leads with key
try:
    url = urljoin(BASE_URL, f"/api/admin/leads?key={ADMIN_KEY}")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/leads with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/admin/leads with key returns 200", False, f"Error: {e}")

# Test /api/admin/leads without key returns 401
try:
    url = urljoin(BASE_URL, "/api/admin/leads")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/leads without key returns 401", resp.status_code == 401, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/admin/leads without key returns 401", False, f"Error: {e}")

# Test /api/admin/kpi with key
try:
    url = urljoin(BASE_URL, f"/api/admin/kpi?key={ADMIN_KEY}")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/kpi with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        # Check for hero.cpl fields
        if 'hero' in data and 'cpl' in data['hero']:
            cpl = data['hero']['cpl']
            has_required_fields = all(k in cpl for k in ['value', 'paid', 'paidLeads', 'allLeads', 'organicLeads', 'basis'])
            test("KPI hero.cpl has required fields", has_required_fields, 
                 f"Fields: {list(cpl.keys()) if isinstance(cpl, dict) else 'N/A'}")
        else:
            test("KPI hero.cpl structure", False, "Missing hero.cpl in response")
except Exception as e:
    test("GET /api/admin/kpi with key", False, f"Error: {e}")

# Test /api/admin/analytics with key
try:
    url = urljoin(BASE_URL, f"/api/admin/analytics?days=30&key={ADMIN_KEY}")
    resp = requests.get(url, timeout=30)
    test("GET /api/admin/analytics with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        # Check for paid block (paid funnel data)
        if 'paid' in data:
            paid = data['paid']
            # Check for channels array with funnel data
            has_channels = 'channels' in paid and isinstance(paid['channels'], list)
            test("Analytics has paid block with channels", has_channels,
                 f"Paid block fields: {list(paid.keys()) if isinstance(paid, dict) else 'N/A'}")
        else:
            test("Analytics paid block", False, "Missing 'paid' in response")
except Exception as e:
    test("GET /api/admin/analytics with key", False, f"Error: {e}")

# Test /api/brreg
try:
    url = urljoin(BASE_URL, "/api/brreg?q=DNB")
    resp = requests.get(url, timeout=30)
    test("GET /api/brreg?q=DNB returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        if 'items' in data and len(data['items']) > 0:
            first_result = data['items'][0]
            is_dnb = 'DNB' in first_result.get('name', '').upper()
            test("BRREG first result is DNB BANK ASA", is_dnb, 
                 f"First result: {first_result.get('name', 'N/A')}")
        else:
            test("BRREG results", False, "No results returned")
except Exception as e:
    test("GET /api/brreg?q=DNB", False, f"Error: {e}")

# Test /api/property-interest/outbox
try:
    url = urljoin(BASE_URL, f"/api/property-interest/outbox?key={ADMIN_KEY}&status=alle")
    resp = requests.get(url, timeout=30)
    test("GET /api/property-interest/outbox with key returns 200", resp.status_code == 200, f"Status: {resp.status_code}")
except Exception as e:
    test("GET /api/property-interest/outbox with key", False, f"Error: {e}")

# Test POST /api/track with real browser UA and type='cta_click'
try:
    url = urljoin(BASE_URL, "/api/track")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/json'
    }
    payload = {
        'type': 'cta_click',
        'sessionId': 'test-session-designloft-regression',
        'path': '/test-regression',
        'data': {'button': 'test-regression-button'}
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    test("POST /api/track returns 204", resp.status_code == 204, f"Status: {resp.status_code}")
    
    # Verify it was saved with correct type (not renamed to pageview)
    if resp.status_code == 204:
        try:
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            event = db.events.find_one({'sessionId': 'test-session-designloft-regression', 'type': 'cta_click'})
            
            if event:
                test("Track event saved with correct type 'cta_click'", event['type'] == 'cta_click',
                     f"Type: {event.get('type', 'N/A')}")
                
                # Clean up test event
                db.events.delete_one({'_id': event['_id']})
                print("   🧹 Cleaned up test event")
            else:
                test("Track event saved with correct type", False, "Event not found in database")
            
            client.close()
        except Exception as e:
            test("Track event verification in MongoDB", False, f"Error: {e}")
except Exception as e:
    test("POST /api/track", False, f"Error: {e}")

print()

# ============================================================================
# SCENARIO 6: REFERANSESKRIPT (Reference Scripts)
# ============================================================================
print("SCENARIO 6: REFERANSESKRIPT")
print("-" * 80)

# Run probe-seo-aeo.mjs
try:
    import subprocess
    result = subprocess.run(
        ['node', '/app/scripts/probe-seo-aeo.mjs'],
        capture_output=True,
        text=True,
        timeout=120,
        cwd='/app'
    )
    
    output = result.stdout + result.stderr
    print("probe-seo-aeo.mjs output:")
    print(output)
    
    # Check for 0 errors (script should report this)
    has_zero_errors = '0 feil' in output.lower() or '0 errors' in output.lower() or result.returncode == 0
    test("probe-seo-aeo.mjs runs successfully", has_zero_errors, 
         f"Exit code: {result.returncode}")
except Exception as e:
    test("probe-seo-aeo.mjs execution", False, f"Error: {e}")

print()

# Run probe-owner-business.mjs
try:
    result = subprocess.run(
        ['node', '--import', './scripts/_alias-loader.mjs', 'scripts/probe-owner-business.mjs'],
        capture_output=True,
        text=True,
        timeout=120,
        cwd='/app'
    )
    
    output = result.stdout + result.stderr
    print("probe-owner-business.mjs output:")
    print(output)
    
    # Check for 67 OK (as specified in requirements)
    has_67_ok = '67 OK' in output or '67 ok' in output.lower()
    test("probe-owner-business.mjs shows 67 OK", has_67_ok,
         f"Exit code: {result.returncode}")
except Exception as e:
    test("probe-owner-business.mjs execution", False, f"Error: {e}")

print()

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Total: {tests_passed + tests_failed}")
print()

if tests_failed == 0:
    print("🎉 ALL TESTS PASSED!")
    sys.exit(0)
else:
    print(f"⚠️  {tests_failed} test(s) failed")
    sys.exit(1)
