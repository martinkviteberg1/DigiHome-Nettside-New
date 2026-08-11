#!/usr/bin/env python3
"""
Backend test for markdown-to-email-HTML rendering endpoint.
Tests GET /api/admin/tasks/email-preview with various markdown inputs.
"""

import os
import sys
import urllib.parse
import requests

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://saker-hub.preview.emergentagent.com')
ADMIN_KEY = 'dh_admin_b3Kx92Qz7Lm4'
TIMEOUT = 30

def test_auth():
    """Test 1: AUTH - without key → 401; invalid key → 401; valid → 200 ok:true with html and plain fields"""
    print("\n=== TEST 1: AUTH ===")
    
    # 1a: Without key → 401
    print("1a) Testing without key...")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview", timeout=TIMEOUT)
        if r.status_code == 401:
            print("✅ Without key returns 401")
        else:
            print(f"❌ Without key returned {r.status_code}, expected 401")
            return False
    except Exception as e:
        print(f"❌ Without key test failed: {e}")
        return False
    
    # 1b: Invalid key → 401
    print("1b) Testing with invalid key...")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key=invalid_key_123", timeout=TIMEOUT)
        if r.status_code == 401:
            print("✅ Invalid key returns 401")
        else:
            print(f"❌ Invalid key returned {r.status_code}, expected 401")
            return False
    except Exception as e:
        print(f"❌ Invalid key test failed: {e}")
        return False
    
    # 1c: Valid key → 200 with ok:true, html, plain
    print("1c) Testing with valid key...")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md=test", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Valid key returned {r.status_code}, expected 200")
            return False
        
        data = r.json()
        if not data.get('ok'):
            print(f"❌ Response missing ok:true, got: {data}")
            return False
        if 'html' not in data:
            print(f"❌ Response missing 'html' field, got: {data}")
            return False
        if 'plain' not in data:
            print(f"❌ Response missing 'plain' field, got: {data}")
            return False
        
        print(f"✅ Valid key returns 200 with ok:true, html ({len(data['html'])} chars), plain ({len(data['plain'])} chars)")
        return True
    except Exception as e:
        print(f"❌ Valid key test failed: {e}")
        return False

def test_markdown_rendering():
    """Test 2: MARKDOWN RENDERING - verify proper HTML rendering of markdown"""
    print("\n=== TEST 2: MARKDOWN RENDERING ===")
    
    md = """## Mål
Oppgradere **fellesarealene** med:
- Ny belysning
- Maling av vegger

Se [avtale](https://example.com) for detaljer."""
    
    md_encoded = urllib.parse.quote(md)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        # Check for proper rendering
        checks = [
            ('<h2 style=', 'H2 heading with style'),
            ('font-weight:700', 'H2 has font-weight:700'),
            ('<strong style=', 'Strong tag with style'),
            ('fellesarealene', 'Strong text content'),
            ('<ul style=', 'UL with style'),
            ('<li style=', 'LI with style'),
            ('<a href="https://example.com" target="_blank" style="color:#7c3aed', 'Link with correct href, target, and color'),
        ]
        
        all_passed = True
        for check_str, desc in checks:
            if check_str in html:
                print(f"✅ {desc} found")
            else:
                print(f"❌ {desc} NOT found")
                all_passed = False
        
        # Check for NO raw markdown symbols
        raw_checks = [
            ('## ', 'raw ## heading marker'),
            ('**fellesarealene**', 'raw ** bold markers'),
            ('](', 'raw ]( link syntax'),
            ('- Ny belysning', 'raw - bullet marker at start of line'),
        ]
        
        for check_str, desc in raw_checks:
            if check_str not in html:
                print(f"✅ No {desc} in HTML")
            else:
                print(f"❌ Found {desc} in HTML (should be rendered)")
                all_passed = False
        
        if all_passed:
            print(f"✅ All markdown rendering checks passed")
        
        return all_passed
    except Exception as e:
        print(f"❌ Markdown rendering test failed: {e}")
        return False

def test_xss_security():
    """Test 3: XSS SECURITY - verify HTML escaping"""
    print("\n=== TEST 3: XSS SECURITY ===")
    
    md = "<script>alert(1)</script> og <img src=x onerror=alert(2)>"
    md_encoded = urllib.parse.quote(md)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        # Check that dangerous tags are NOT present as active markup
        # (they should be escaped as &lt; and &gt;)
        if '<script>' not in html and '<img src=x onerror=' not in html:
            print("✅ No active <script> or <img onerror=> tags in HTML")
        else:
            print(f"❌ Found active script tags or onerror attribute in HTML")
            return False
        
        # Check for escaped versions
        if '&lt;script&gt;' in html and '&lt;img' in html:
            print("✅ HTML tags are properly escaped (&lt;script&gt; and &lt;img found)")
            return True
        else:
            print(f"❌ HTML tags not properly escaped. HTML: {html[:200]}")
            return False
    except Exception as e:
        print(f"❌ XSS security test failed: {e}")
        return False

def test_images():
    """Test 4: IMAGES - internal images → placeholder, external images → rendered"""
    print("\n=== TEST 4: IMAGES ===")
    
    # Test 4a: Internal image
    print("4a) Testing internal image...")
    md_internal = "![skisse](/api/admin/tasks/image/abc)"
    md_encoded = urllib.parse.quote(md_internal)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        if 'Bilde — åpne saken i admin' in html and '<img src="/api' not in html:
            print("✅ Internal image replaced with placeholder text")
        else:
            print(f"❌ Internal image not properly handled. HTML: {html[:300]}")
            return False
    except Exception as e:
        print(f"❌ Internal image test failed: {e}")
        return False
    
    # Test 4b: External image
    print("4b) Testing external image...")
    md_external = "![foto](https://images.unsplash.com/foto.jpg)"
    md_encoded = urllib.parse.quote(md_external)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        if '<img src="https://images.unsplash.com/foto.jpg"' in html and 'style=' in html:
            print("✅ External image rendered with img tag and style")
            return True
        else:
            print(f"❌ External image not properly rendered. HTML: {html[:300]}")
            return False
    except Exception as e:
        print(f"❌ External image test failed: {e}")
        return False

def test_dangerous_links():
    """Test 5: DANGEROUS LINKS - javascript: links should be neutralized"""
    print("\n=== TEST 5: DANGEROUS LINKS ===")
    
    md = "[klikk](javascript:alert(1))"
    md_encoded = urllib.parse.quote(md)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        if 'javascript:' not in html:
            print("✅ javascript: protocol not present in href")
            return True
        else:
            print(f"❌ Found javascript: in HTML (security risk). HTML: {html[:300]}")
            return False
    except Exception as e:
        print(f"❌ Dangerous links test failed: {e}")
        return False

def test_truncation():
    """Test 6: TRUNCATION - long text should be truncated with indicator"""
    print("\n=== TEST 6: TRUNCATION ===")
    
    md = 'A' * 1500
    md_encoded = urllib.parse.quote(md)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        html = data.get('html', '')
        
        if 'forkortet' in html:
            print("✅ Long text truncated with 'forkortet' indicator")
            return True
        else:
            print(f"❌ Truncation indicator not found. HTML length: {len(html)}")
            return False
    except Exception as e:
        print(f"❌ Truncation test failed: {e}")
        return False

def test_plain_excerpt():
    """Test 7: PLAIN EXCERPT - verify plain text output without markdown symbols"""
    print("\n=== TEST 7: PLAIN EXCERPT ===")
    
    md = """## Mål
Oppgradere **fellesarealene** med:
- Ny belysning
- Maling av vegger

Se [avtale](https://example.com) for detaljer."""
    
    md_encoded = urllib.parse.quote(md)
    
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/email-preview?key={ADMIN_KEY}&md={md_encoded}", timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"❌ Request failed with status {r.status_code}")
            return False
        
        data = r.json()
        plain = data.get('plain', '')
        
        # Check that markdown symbols are removed
        if '##' not in plain and '**' not in plain and '](' not in plain:
            print("✅ Plain text has no markdown symbols (##, **, ]()")
        else:
            print(f"❌ Plain text contains markdown symbols. Plain: {plain}")
            return False
        
        # Check max length (~183 chars)
        if len(plain) <= 183:
            print(f"✅ Plain text length ({len(plain)} chars) within limit (~183)")
        else:
            print(f"❌ Plain text too long ({len(plain)} chars), expected max ~183")
            return False
        
        # Check for expected content
        if 'Mål' in plain and 'fellesarealene' in plain and 'avtale' in plain:
            print(f"✅ Plain text contains expected content: '{plain}'")
            return True
        else:
            print(f"❌ Plain text missing expected content. Plain: {plain}")
            return False
    except Exception as e:
        print(f"❌ Plain excerpt test failed: {e}")
        return False

def test_regression():
    """Test 8: REGRESSION - verify other endpoints still work"""
    print("\n=== TEST 8: REGRESSION ===")
    
    # Test 8a: GET /api/admin/tasks
    print("8a) Testing GET /api/admin/tasks...")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks?key={ADMIN_KEY}", timeout=TIMEOUT)
        if r.status_code == 200 and r.json().get('ok'):
            print("✅ GET /api/admin/tasks returns 200 ok:true")
        else:
            print(f"❌ GET /api/admin/tasks failed: {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ GET /api/admin/tasks failed: {e}")
        return False
    
    # Test 8b: GET /api/admin/tasks/insights
    print("8b) Testing GET /api/admin/tasks/insights...")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/tasks/insights?key={ADMIN_KEY}", timeout=TIMEOUT)
        if r.status_code == 200 and r.json().get('ok'):
            print("✅ GET /api/admin/tasks/insights returns 200 ok:true")
            return True
        else:
            print(f"❌ GET /api/admin/tasks/insights failed: {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ GET /api/admin/tasks/insights failed: {e}")
        return False

def main():
    print("=" * 80)
    print("MARKDOWN-TO-EMAIL-HTML RENDERING BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Timeout: {TIMEOUT}s")
    
    results = []
    
    # Run all tests
    results.append(("AUTH", test_auth()))
    results.append(("MARKDOWN RENDERING", test_markdown_rendering()))
    results.append(("XSS SECURITY", test_xss_security()))
    results.append(("IMAGES", test_images()))
    results.append(("DANGEROUS LINKS", test_dangerous_links()))
    results.append(("TRUNCATION", test_truncation()))
    results.append(("PLAIN EXCERPT", test_plain_excerpt()))
    results.append(("REGRESSION", test_regression()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}% success rate)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
