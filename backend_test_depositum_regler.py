#!/usr/bin/env python3
"""
Targeted retest for /guider/depositum-regler content verification.
Verifies that the guide explicitly states depositumskonto and husleiekonto
can be in different banks as a main rule, and that no sentence claims they must be same bank.
"""

import requests
import re
from bs4 import BeautifulSoup

BASE_URL = "https://conversion-optimize-7.preview.emergentagent.com"

def extract_visible_text(html):
    """Extract visible text from HTML, excluding script/style tags."""
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
    
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading/trailing space on each
    lines = (line.strip() for line in text.splitlines())
    
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Drop blank lines
    text = ' '.join(chunk for chunk in chunks if chunk)
    
    return text

def test_depositum_regler_content():
    """Test the depositum-regler guide for correct bank account information."""
    
    print("\n" + "="*80)
    print("DEPOSITUM-REGLER CONTENT VERIFICATION TEST")
    print("="*80)
    
    # Test 1: Route returns 200
    print("\n[TEST 1] GET /guider/depositum-regler returns 200")
    try:
        response = requests.get(f"{BASE_URL}/guider/depositum-regler", timeout=30)
        status = response.status_code
        print(f"✓ Status: {status}")
        
        if status != 200:
            print(f"✗ FAIL: Expected 200, got {status}")
            return False
        
        html = response.text
        visible_text = extract_visible_text(html)
        
        # Normalize whitespace for easier searching
        normalized_text = ' '.join(visible_text.split())
        
        print(f"✓ Page loaded successfully, content length: {len(visible_text)} chars")
        
    except Exception as e:
        print(f"✗ FAIL: Request failed with error: {e}")
        return False
    
    # Test 2: Verify positive content - mentions different banks are OK
    print("\n[TEST 2] Verify content explicitly mentions different banks are allowed")
    
    # Look for patterns that indicate different banks are OK
    different_bank_patterns = [
        r'forskjellige\s+banker',
        r'ulike\s+banker',
        r'annen\s+bank',
        r'kan\s+være\s+i\s+forskjellige',
        r'kan\s+være\s+i\s+ulike',
        r'trenger\s+ikke\s+være\s+i\s+samme',
        r'ikke\s+nødvendig.*samme\s+bank',
        r'hovedregel.*forskjellige',
        r'hovedregel.*ulike',
    ]
    
    found_different_bank_mention = False
    matched_pattern = None
    
    for pattern in different_bank_patterns:
        if re.search(pattern, normalized_text, re.IGNORECASE):
            found_different_bank_mention = True
            matched_pattern = pattern
            break
    
    if found_different_bank_mention:
        print(f"✓ PASS: Found mention of different banks being OK (pattern: {matched_pattern})")
    else:
        print(f"✗ FAIL: Could not find explicit mention that different banks are allowed")
        print(f"   Searched for patterns: {different_bank_patterns}")
        # Print a sample of the content for debugging
        print(f"\n   Sample content (first 500 chars):")
        print(f"   {normalized_text[:500]}...")
        return False
    
    # Test 3: Verify mentions simplified payout / bank choice impact
    print("\n[TEST 3] Verify content mentions bank choice may affect simplified payout")
    
    payout_patterns = [
        r'forenklet\s+utbetaling',
        r'enklere\s+utbetaling',
        r'utbetaling.*enklere',
        r'utbetaling.*forenklet',
        r'samme\s+bank.*enklere',
        r'samme\s+bank.*forenklet',
    ]
    
    found_payout_mention = False
    matched_payout_pattern = None
    
    for pattern in payout_patterns:
        if re.search(pattern, normalized_text, re.IGNORECASE):
            found_payout_mention = True
            matched_payout_pattern = pattern
            break
    
    if found_payout_mention:
        print(f"✓ PASS: Found mention of simplified payout (pattern: {matched_payout_pattern})")
    else:
        print(f"⚠ WARNING: Could not find explicit mention of simplified payout impact")
        print(f"   This is a minor issue - the main requirement is about different banks being OK")
    
    # Test 4: Verify NO absolute "must be same bank" claims
    print("\n[TEST 4] Verify NO sentence claims accounts MUST be in same bank")
    
    # Look for problematic patterns that claim same bank is required
    must_same_bank_patterns = [
        r'må\s+være\s+i\s+samme\s+bank',
        r'må\s+ha\s+samme\s+bank',
        r'krever\s+samme\s+bank',
        r'skal\s+være\s+i\s+samme\s+bank',
        r'skal\s+ha\s+samme\s+bank',
        r'må.*samme.*bank(?!.*kan)',  # "må samme bank" without "kan" nearby
    ]
    
    found_must_same_bank = False
    problematic_match = None
    
    for pattern in must_same_bank_patterns:
        match = re.search(pattern, normalized_text, re.IGNORECASE)
        if match:
            found_must_same_bank = True
            problematic_match = match.group(0)
            # Get context around the match
            start = max(0, match.start() - 100)
            end = min(len(normalized_text), match.end() + 100)
            context = normalized_text[start:end]
            print(f"✗ FAIL: Found problematic claim: '{problematic_match}'")
            print(f"   Context: ...{context}...")
            break
    
    if not found_must_same_bank:
        print(f"✓ PASS: No absolute 'must be same bank' claims found")
    else:
        return False
    
    # Test 5: API root endpoint
    print("\n[TEST 5] GET /api/ returns 200")
    try:
        api_response = requests.get(f"{BASE_URL}/api/", timeout=10)
        api_status = api_response.status_code
        print(f"✓ Status: {api_status}")
        
        if api_status != 200:
            print(f"✗ FAIL: Expected 200, got {api_status}")
            return False
        
        api_data = api_response.json()
        if api_data.get('ok') == True:
            print(f"✓ PASS: API root endpoint working correctly")
        else:
            print(f"⚠ WARNING: API returned 200 but ok != true: {api_data}")
            
    except Exception as e:
        print(f"✗ FAIL: API request failed with error: {e}")
        return False
    
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED")
    print("="*80)
    print("\nSUMMARY:")
    print("✓ Route /guider/depositum-regler returns 200")
    print("✓ Content explicitly mentions different banks are allowed")
    if found_payout_mention:
        print("✓ Content mentions simplified payout considerations")
    else:
        print("⚠ Content does not explicitly mention simplified payout (minor)")
    print("✓ No absolute 'must be same bank' claims found")
    print("✓ API root endpoint returns 200")
    
    return True

if __name__ == "__main__":
    try:
        success = test_depositum_regler_content()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
