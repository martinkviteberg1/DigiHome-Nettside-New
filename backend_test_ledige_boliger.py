#!/usr/bin/env python3
"""
Backend test for /ledige-boliger feature (public housing listings)
Tests all 8 scenarios from the review_request in order.
"""

import requests
import json
import re
import sys

# Configuration
BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
TIMEOUT = 30

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(scenario, test_name, passed, details=""):
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    message = f"{status} | Scenario {scenario} | {test_name}"
    if details:
        message += f" | {details}"
    print(message)
    test_results.append({"scenario": scenario, "test": test_name, "passed": passed, "details": details})
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def check_pii_in_html(html, property_area):
    """Check for PII leaks in HTML"""
    issues = []
    
    # Check for house number after street name (e.g., "Wernersholmvegen 14")
    if re.search(rf'{property_area}\s*\d', html):
        issues.append(f"Found house number after {property_area}")
    
    # Check for common owner/tenant name patterns (Norwegian names)
    # Look for patterns like "Eier: Name" or "Leietaker: Name"
    if re.search(r'(Eier|Leietaker|Owner|Tenant):\s*[A-ZÆØÅ][a-zæøå]+\s+[A-ZÆØÅ][a-zæøå]+', html):
        issues.append("Found potential owner/tenant name pattern")
    
    return issues

print("=" * 80)
print("BACKEND TEST: /ledige-boliger (Public Housing Listings)")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Admin Key: {ADMIN_KEY}")
print("CRITICAL: 0 properties are visible now, and MUST be 0 visible when finished.")
print("=" * 80)
print()

# ============================================================================
# SCENARIO 1: OFFENTLIG LISTE TOM (Public list empty)
# ============================================================================
print("SCENARIO 1: OFFENTLIG LISTE TOM (Public list empty)")
print("-" * 80)

try:
    response = requests.get(f"{API_BASE}/public/listings", timeout=TIMEOUT)
    
    # Check status code
    if response.status_code == 200:
        log_test(1, "Status code 200", True)
    else:
        log_test(1, "Status code 200", False, f"Got {response.status_code}")
    
    # Check response structure
    data = response.json()
    
    if data.get("ok") == True:
        log_test(1, "ok:true", True)
    else:
        log_test(1, "ok:true", False, f"Got ok={data.get('ok')}")
    
    if data.get("total") == 0:
        log_test(1, "total:0", True)
    else:
        log_test(1, "total:0", False, f"Got total={data.get('total')}")
    
    if data.get("listings") == []:
        log_test(1, "listings:[]", True)
    else:
        log_test(1, "listings:[]", False, f"Got {len(data.get('listings', []))} listings")
    
    # Check that candidates and readiness are NOT present
    if "candidates" not in data:
        log_test(1, "No 'candidates' key", True)
    else:
        log_test(1, "No 'candidates' key", False, "Found 'candidates' in response")
    
    if "readiness" not in data:
        log_test(1, "No 'readiness' key", True)
    else:
        log_test(1, "No 'readiness' key", False, "Found 'readiness' in response")
    
except Exception as e:
    log_test(1, "Request failed", False, str(e))

print()

# ============================================================================
# SCENARIO 2: PREVIEW KREVER AUTH (Preview requires auth)
# ============================================================================
print("SCENARIO 2: PREVIEW KREVER AUTH (Preview requires auth)")
print("-" * 80)

# Test without key
try:
    response = requests.get(f"{API_BASE}/public/listings?preview=1", timeout=TIMEOUT)
    
    if response.status_code == 401:
        log_test(2, "Without key returns 401", True)
    else:
        log_test(2, "Without key returns 401", False, f"Got {response.status_code}")
except Exception as e:
    log_test(2, "Without key returns 401", False, str(e))

# Test with key
try:
    response = requests.get(f"{API_BASE}/public/listings?preview=1&key={ADMIN_KEY}", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(2, "With key returns 200", True)
    else:
        log_test(2, "With key returns 200", False, f"Got {response.status_code}")
    
    data = response.json()
    
    # Check for candidates
    if "candidates" in data:
        candidates = data.get("candidates", [])
        log_test(2, "Has 'candidates' key", True, f"Found {len(candidates)} candidate(s)")
        
        # Check candidate structure (expected 1: Wernersholmvegen)
        if len(candidates) >= 1:
            candidate = candidates[0]
            
            # Check required fields
            required_fields = ["slug", "title", "images", "rentBand"]
            has_all_required = all(field in candidate for field in required_fields)
            if has_all_required:
                log_test(2, "Candidate has required fields", True, f"slug, title, images, rentBand")
            else:
                missing = [f for f in required_fields if f not in candidate]
                log_test(2, "Candidate has required fields", False, f"Missing: {missing}")
            
            # Check that PII fields are NOT present
            pii_fields = ["ownerName", "tenantName", "fullAddress", "rentAmount", "postalCode", "finnkode"]
            has_no_pii = all(field not in candidate for field in pii_fields)
            if has_no_pii:
                log_test(2, "Candidate has no PII fields", True)
            else:
                found_pii = [f for f in pii_fields if f in candidate]
                log_test(2, "Candidate has no PII fields", False, f"Found: {found_pii}")
    else:
        log_test(2, "Has 'candidates' key", False, "Not found in response")
    
    # Check for readiness
    if "readiness" in data:
        readiness = data.get("readiness", {})
        log_test(2, "Has 'readiness' key", True)
        
        # Check readiness structure
        if readiness.get("total") == 22:
            log_test(2, "readiness.total:22", True)
        else:
            log_test(2, "readiness.total:22", False, f"Got {readiness.get('total')}")
        
        if readiness.get("published") == 0:
            log_test(2, "readiness.published:0", True)
        else:
            log_test(2, "readiness.published:0", False, f"Got {readiness.get('published')}")
        
        # Check ready array (expected 1 element)
        ready = readiness.get("ready", [])
        if len(ready) == 1:
            log_test(2, "readiness.ready has 1 element", True)
        else:
            log_test(2, "readiness.ready has 1 element", False, f"Got {len(ready)} elements")
        
        # Check almost array (expected ~10 elements)
        almost = readiness.get("almost", [])
        if len(almost) >= 5:  # At least 5 elements
            log_test(2, "readiness.almost has elements", True, f"Found {len(almost)} elements")
            
            # Check structure of first almost element
            if len(almost) > 0:
                first_almost = almost[0]
                if "blocking" in first_almost and "platformBlockers" in first_almost:
                    log_test(2, "almost element has blocking and platformBlockers", True)
                else:
                    log_test(2, "almost element has blocking and platformBlockers", False)
        else:
            log_test(2, "readiness.almost has elements", False, f"Got {len(almost)} elements")
    else:
        log_test(2, "Has 'readiness' key", False, "Not found in response")
    
except Exception as e:
    log_test(2, "Request with key failed", False, str(e))

print()

# ============================================================================
# SCENARIO 3: PUBLISER MIDLERTIDIG (Publish temporarily)
# ============================================================================
print("SCENARIO 3: PUBLISER MIDLERTIDIG (Publish temporarily)")
print("-" * 80)

wernersholm_id = None
wernersholm_slug = None

# Find Wernersholmvegen property
try:
    response = requests.get(f"{API_BASE}/admin/properties?key={ADMIN_KEY}", timeout=TIMEOUT)
    
    if response.status_code == 200:
        data = response.json()
        properties = data.get("properties", [])
        
        # Find Wernersholmvegen
        for prop in properties:
            if "Wernersholmvegen" in prop.get("area", ""):
                wernersholm_id = prop.get("id")
                log_test(3, "Found Wernersholmvegen property", True, f"ID: {wernersholm_id}")
                break
        
        if not wernersholm_id:
            log_test(3, "Found Wernersholmvegen property", False, "Not found in properties list")
    else:
        log_test(3, "GET admin/properties", False, f"Status {response.status_code}")
except Exception as e:
    log_test(3, "GET admin/properties", False, str(e))

# Set visible=true
if wernersholm_id:
    try:
        response = requests.put(
            f"{API_BASE}/admin/properties/visibility?key={ADMIN_KEY}",
            json={"id": wernersholm_id, "visible": True},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            log_test(3, "PUT visibility visible:true", True)
        else:
            log_test(3, "PUT visibility visible:true", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(3, "PUT visibility visible:true", False, str(e))
    
    # Check public listings now has 1 property
    try:
        response = requests.get(f"{API_BASE}/public/listings", timeout=TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("total") == 1:
                log_test(3, "Public listings total:1", True)
                
                # Check slug ends with 8 hex chars from property ID
                listings = data.get("listings", [])
                if len(listings) > 0:
                    wernersholm_slug = listings[0].get("slug")
                    property_id_hex = wernersholm_id.replace("-", "")[:8]
                    
                    if wernersholm_slug and wernersholm_slug.endswith(property_id_hex):
                        log_test(3, "Slug ends with 8 hex chars from ID", True, f"Slug: {wernersholm_slug}")
                    else:
                        log_test(3, "Slug ends with 8 hex chars from ID", False, f"Slug: {wernersholm_slug}, Expected suffix: {property_id_hex}")
            else:
                log_test(3, "Public listings total:1", False, f"Got total={data.get('total')}")
        else:
            log_test(3, "GET public/listings", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(3, "GET public/listings", False, str(e))
    
    # Check HTML page /ledige-boliger
    try:
        response = requests.get(f"{BASE_URL}/ledige-boliger", timeout=TIMEOUT)
        
        if response.status_code == 200:
            html = response.text
            log_test(3, "GET /ledige-boliger returns 200", True)
            
            # Check for listing link
            if wernersholm_slug and f"/ledige-boliger/{wernersholm_slug}" in html:
                log_test(3, "HTML contains listing link", True)
            else:
                log_test(3, "HTML contains listing link", False, f"Link not found for slug {wernersholm_slug}")
            
            # Check for ItemList schema
            if "ItemList" in html:
                log_test(3, "HTML contains ItemList schema", True)
            else:
                log_test(3, "HTML contains ItemList schema", False)
        else:
            log_test(3, "GET /ledige-boliger returns 200", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(3, "GET /ledige-boliger", False, str(e))
    
    # Check HTML page /ledige-boliger/[slug]
    if wernersholm_slug:
        try:
            response = requests.get(f"{BASE_URL}/ledige-boliger/{wernersholm_slug}", timeout=TIMEOUT)
            
            if response.status_code == 200:
                html = response.text
                log_test(3, f"GET /ledige-boliger/{wernersholm_slug} returns 200", True)
                
                # Check for RealEstateListing schema
                if "RealEstateListing" in html:
                    log_test(3, "HTML contains RealEstateListing schema", True)
                else:
                    log_test(3, "HTML contains RealEstateListing schema", False)
                
                # Check for UnitPriceSpecification schema
                if "UnitPriceSpecification" in html:
                    log_test(3, "HTML contains UnitPriceSpecification schema", True)
                else:
                    log_test(3, "HTML contains UnitPriceSpecification schema", False)
                
                # Check for canonical link
                if '<link rel="canonical"' in html:
                    log_test(3, "HTML contains canonical link", True)
                else:
                    log_test(3, "HTML contains canonical link", False)
                
                # Check for test IDs
                if 'data-testid="listing-interest-form"' in html:
                    log_test(3, "HTML contains listing-interest-form testid", True)
                else:
                    log_test(3, "HTML contains listing-interest-form testid", False)
                
                if 'data-testid="listing-platform-link"' in html:
                    log_test(3, "HTML contains listing-platform-link testid", True)
                else:
                    log_test(3, "HTML contains listing-platform-link testid", False)
                
                if 'data-testid="listing-finn-link"' in html:
                    log_test(3, "HTML contains listing-finn-link testid", True)
                else:
                    log_test(3, "HTML contains listing-finn-link testid", False)
                
                # Check for PII leaks
                pii_issues = check_pii_in_html(html, "Wernersholmvegen")
                if not pii_issues:
                    log_test(3, "No PII leaks in HTML", True)
                else:
                    log_test(3, "No PII leaks in HTML", False, f"Issues: {', '.join(pii_issues)}")
                
                # Check for price interval (16 000–18 000 expected)
                if "16 000" in html or "16000" in html:
                    log_test(3, "HTML contains expected price interval", True, "Found 16 000")
                else:
                    log_test(3, "HTML contains expected price interval", False, "Price not found")
            else:
                log_test(3, f"GET /ledige-boliger/{wernersholm_slug} returns 200", False, f"Status {response.status_code}")
        except Exception as e:
            log_test(3, f"GET /ledige-boliger/{wernersholm_slug}", False, str(e))

print()

# ============================================================================
# SCENARIO 4: SKJUL IGJEN (Hide again - MANDATORY)
# ============================================================================
print("SCENARIO 4: SKJUL IGJEN (Hide again - MANDATORY)")
print("-" * 80)

if wernersholm_id:
    try:
        response = requests.put(
            f"{API_BASE}/admin/properties/visibility?key={ADMIN_KEY}",
            json={"id": wernersholm_id, "visible": False},
            timeout=TIMEOUT
        )
        
        if response.status_code == 200:
            log_test(4, "PUT visibility visible:false", True)
        else:
            log_test(4, "PUT visibility visible:false", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(4, "PUT visibility visible:false", False, str(e))
    
    # Verify public listings is empty again
    try:
        response = requests.get(f"{API_BASE}/public/listings", timeout=TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("total") == 0:
                log_test(4, "Public listings total:0 after hiding", True)
            else:
                log_test(4, "Public listings total:0 after hiding", False, f"Got total={data.get('total')}")
        else:
            log_test(4, "GET public/listings", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(4, "GET public/listings", False, str(e))
    
    # Check /ledige-boliger shows empty state
    try:
        response = requests.get(f"{BASE_URL}/ledige-boliger", timeout=TIMEOUT)
        
        if response.status_code == 200:
            html = response.text
            
            # Check for empty state message
            if "Ingen ledige boliger akkurat nå" in html or "ingen ledige" in html.lower():
                log_test(4, "HTML shows empty state", True)
            else:
                log_test(4, "HTML shows empty state", False, "Empty state message not found")
        else:
            log_test(4, "GET /ledige-boliger", False, f"Status {response.status_code}")
    except Exception as e:
        log_test(4, "GET /ledige-boliger", False, str(e))

print()

# ============================================================================
# SCENARIO 5: UKJENT SLUG (Unknown slug)
# ============================================================================
print("SCENARIO 5: UKJENT SLUG (Unknown slug)")
print("-" * 80)

try:
    response = requests.get(f"{BASE_URL}/ledige-boliger/leilighet-tull-deadbeef", timeout=TIMEOUT)
    
    # Status 200 in dev mode is expected (Next.js quirk)
    if response.status_code == 200:
        html = response.text
        log_test(5, "GET unknown slug returns 200 (dev mode)", True)
        
        # Check for noindex meta tag
        if '<meta name="robots" content="noindex' in html:
            log_test(5, "HTML contains noindex meta tag", True)
        else:
            log_test(5, "HTML contains noindex meta tag", False)
    else:
        log_test(5, "GET unknown slug", False, f"Status {response.status_code}")
except Exception as e:
    log_test(5, "GET unknown slug", False, str(e))

print()

# ============================================================================
# SCENARIO 6: SITEMAP
# ============================================================================
print("SCENARIO 6: SITEMAP")
print("-" * 80)

try:
    response = requests.get(f"{BASE_URL}/sitemap.xml", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(6, "GET /sitemap.xml returns 200", True)
        
        xml = response.text
        
        # Check for /ledige-boliger in sitemap
        if "/ledige-boliger" in xml:
            log_test(6, "Sitemap contains /ledige-boliger", True)
        else:
            log_test(6, "Sitemap contains /ledige-boliger", False)
    else:
        log_test(6, "GET /sitemap.xml returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(6, "GET /sitemap.xml", False, str(e))

print()

# ============================================================================
# SCENARIO 7: SYNKEDE PLATTFORMFELT (Synced platform fields)
# ============================================================================
print("SCENARIO 7: SYNKEDE PLATTFORMFELT (Synced platform fields)")
print("-" * 80)

try:
    response = requests.get(f"{API_BASE}/admin/properties?key={ADMIN_KEY}", timeout=TIMEOUT)
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get("total") == 22:
            log_test(7, "Total properties is 22", True)
        else:
            log_test(7, "Total properties is 22", False, f"Got {data.get('total')}")
        
        properties = data.get("properties", [])
        
        # Check all 22 have publicUrl
        all_have_public_url = all(prop.get("publicUrl") for prop in properties)
        if all_have_public_url:
            log_test(7, "All 22 have publicUrl", True)
        else:
            missing = sum(1 for prop in properties if not prop.get("publicUrl"))
            log_test(7, "All 22 have publicUrl", False, f"{missing} properties missing publicUrl")
        
        # Check exactly 2 have finnUrl with finnVerified:true and finnOrigin:'manual_ad'
        finn_verified = [prop for prop in properties if prop.get("finnUrl") and prop.get("finnVerified") == True]
        if len(finn_verified) == 2:
            log_test(7, "Exactly 2 have finnUrl with finnVerified:true", True)
            
            # Check finnOrigin
            all_manual_ad = all(prop.get("finnOrigin") == "manual_ad" for prop in finn_verified)
            if all_manual_ad:
                log_test(7, "Both have finnOrigin:'manual_ad'", True)
            else:
                log_test(7, "Both have finnOrigin:'manual_ad'", False)
        else:
            log_test(7, "Exactly 2 have finnUrl with finnVerified:true", False, f"Found {len(finn_verified)}")
        
        # Check 13 have monthlyRentBand
        with_rent_band = [prop for prop in properties if prop.get("monthlyRentBand")]
        if len(with_rent_band) == 13:
            log_test(7, "13 properties have monthlyRentBand", True)
        else:
            log_test(7, "13 properties have monthlyRentBand", False, f"Found {len(with_rent_band)}")
        
        # Check rentBandSource is NOT 'finn'
        finn_source = [prop for prop in with_rent_band if prop.get("rentBandSource") == "finn"]
        if len(finn_source) == 0:
            log_test(7, "No properties have rentBandSource:'finn'", True)
        else:
            log_test(7, "No properties have rentBandSource:'finn'", False, f"Found {len(finn_source)}")
        
        # Check rentBandSource values
        valid_sources = {"plattform", "plattform-belop", "plattform-estimat"}
        all_valid_sources = all(prop.get("rentBandSource") in valid_sources for prop in with_rent_band)
        if all_valid_sources:
            log_test(7, "All rentBandSource values are valid", True)
        else:
            invalid = [prop.get("rentBandSource") for prop in with_rent_band if prop.get("rentBandSource") not in valid_sources]
            log_test(7, "All rentBandSource values are valid", False, f"Invalid: {invalid}")
        
        # Check price interval calculation for 'plattform-belop' and 'plattform-estimat'
        calculated_sources = [prop for prop in with_rent_band if prop.get("rentBandSource") in ["plattform-belop", "plattform-estimat"]]
        interval_correct = True
        for prop in calculated_sources:
            rent_amount = prop.get("rentAmount")
            rent_band = prop.get("monthlyRentBand", "")
            
            if rent_amount:
                # Expected lower bound: round down to nearest 2000
                expected_lower = (rent_amount // 2000) * 2000
                
                # Check if rent_band starts with expected_lower
                if not rent_band.startswith(str(expected_lower)):
                    interval_correct = False
                    break
        
        if interval_correct:
            log_test(7, "Price intervals calculated correctly", True)
        else:
            log_test(7, "Price intervals calculated correctly", False)
        
        # Check all 22 have platformBlockers (array) and platformReadiness (object or null)
        all_have_blockers = all(isinstance(prop.get("platformBlockers"), list) for prop in properties)
        if all_have_blockers:
            log_test(7, "All 22 have platformBlockers array", True)
        else:
            log_test(7, "All 22 have platformBlockers array", False)
        
        all_have_readiness = all(
            prop.get("platformReadiness") is None or isinstance(prop.get("platformReadiness"), dict)
            for prop in properties
        )
        if all_have_readiness:
            log_test(7, "All 22 have platformReadiness (object or null)", True)
        else:
            log_test(7, "All 22 have platformReadiness (object or null)", False)
    else:
        log_test(7, "GET admin/properties", False, f"Status {response.status_code}")
except Exception as e:
    log_test(7, "GET admin/properties", False, str(e))

print()

# ============================================================================
# SCENARIO 8: REGRESJON (Regression)
# ============================================================================
print("SCENARIO 8: REGRESJON (Regression)")
print("-" * 80)

# Test GET /api/public/properties
try:
    response = requests.get(f"{API_BASE}/public/properties?limit=24", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(8, "GET /api/public/properties returns 200", True)
        
        data = response.json()
        properties = data.get("properties", [])
        
        if len(properties) == 0:
            log_test(8, "public/properties returns 0 properties", True)
        else:
            log_test(8, "public/properties returns 0 properties", False, f"Got {len(properties)}")
        
        # Check that new admin fields are NOT present
        if len(properties) > 0:
            prop = properties[0]
            admin_fields = ["listingTitle", "listingTitleSource", "finnTitle", "editorialTitle", 
                          "rentBandSource", "platformBlockers", "platformReadiness", 
                          "finnVerified", "finnUrl", "publicUrl"]
            has_admin_fields = any(field in prop for field in admin_fields)
            
            if not has_admin_fields:
                log_test(8, "public/properties has no admin fields", True)
            else:
                found = [f for f in admin_fields if f in prop]
                log_test(8, "public/properties has no admin fields", False, f"Found: {found}")
    else:
        log_test(8, "GET /api/public/properties returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(8, "GET /api/public/properties", False, str(e))

# Test GET /api/admin/kpi
try:
    response = requests.get(f"{API_BASE}/admin/kpi?key={ADMIN_KEY}&days=30", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(8, "GET /api/admin/kpi returns 200", True)
    else:
        log_test(8, "GET /api/admin/kpi returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(8, "GET /api/admin/kpi", False, str(e))

# Test GET /api/admin/kpi/drill
try:
    response = requests.get(f"{API_BASE}/admin/kpi/drill?key={ADMIN_KEY}&metric=mrr_actual&days=90", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(8, "GET /api/admin/kpi/drill returns 200", True)
    else:
        log_test(8, "GET /api/admin/kpi/drill returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(8, "GET /api/admin/kpi/drill", False, str(e))

# Test GET /api/
try:
    response = requests.get(f"{API_BASE}/", timeout=TIMEOUT)
    
    if response.status_code == 200:
        log_test(8, "GET /api/ returns 200", True)
    else:
        log_test(8, "GET /api/ returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(8, "GET /api/", False, str(e))

# Test GET /api/newsletter/property-interest/lookup
try:
    response = requests.get(
        f"{API_BASE}/newsletter/property-interest/lookup?property=6189812a-ae20-4d07-98f6-7764845291bb",
        timeout=TIMEOUT
    )
    
    if response.status_code == 200:
        log_test(8, "GET property-interest/lookup returns 200", True)
        
        data = response.json()
        
        # Check no PII and no new admin fields
        if isinstance(data, dict):
            admin_fields = ["listingTitle", "listingTitleSource", "finnTitle", "editorialTitle", 
                          "rentBandSource", "platformBlockers", "platformReadiness", 
                          "finnVerified", "finnUrl", "publicUrl"]
            has_admin_fields = any(field in data for field in admin_fields)
            
            if not has_admin_fields:
                log_test(8, "property-interest/lookup has no admin fields", True)
            else:
                found = [f for f in admin_fields if f in data]
                log_test(8, "property-interest/lookup has no admin fields", False, f"Found: {found}")
    else:
        log_test(8, "GET property-interest/lookup returns 200", False, f"Status {response.status_code}")
except Exception as e:
    log_test(8, "GET property-interest/lookup", False, str(e))

print()

# ============================================================================
# FINAL VERIFICATION: 0 properties visible
# ============================================================================
print("=" * 80)
print("FINAL VERIFICATION: 0 properties visible (MANDATORY)")
print("=" * 80)

try:
    response = requests.get(f"{API_BASE}/public/listings", timeout=TIMEOUT)
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get("total") == 0:
            log_test("FINAL", "0 properties visible", True, "✅ CLEANUP SUCCESSFUL")
        else:
            log_test("FINAL", "0 properties visible", False, f"❌ CLEANUP FAILED: {data.get('total')} properties still visible")
    else:
        log_test("FINAL", "0 properties visible", False, f"Status {response.status_code}")
except Exception as e:
    log_test("FINAL", "0 properties visible", False, str(e))

print()

# ============================================================================
# SUMMARY
# ============================================================================
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Success rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
print("=" * 80)

# Exit with appropriate code
sys.exit(0 if tests_failed == 0 else 1)
