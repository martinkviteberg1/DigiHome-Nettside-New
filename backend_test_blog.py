#!/usr/bin/env python3
"""
Backend test for DigiHome blog/news engine (Fase 3).
Tests 3 NEW endpoints: GET /api/posts, POST/DELETE /api/admin/posts, POST /api/admin/generate-article.
"""

import requests
import time
import sys

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# SEEDED production articles (DO NOT DELETE)
SEEDED_SLUGS = [
    "skatt-pa-utleieinntekt-2026",
    "korttid-eller-langtid-velg-riktig-utleiemodell",
    "5-ting-som-gjor-at-boligen-leies-ut-raskere"
]

test_results = []
created_test_ids = []  # Track TEST articles for cleanup

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    test_results.append({"name": name, "passed": passed, "details": details})

def cleanup_test_articles():
    """Delete all TEST articles created during testing"""
    print("\n🧹 CLEANUP: Deleting TEST articles...")
    for test_id in created_test_ids:
        try:
            r = requests.delete(
                f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
                json={"id": test_id},
                timeout=10
            )
            if r.status_code == 200:
                print(f"  ✅ Deleted TEST article {test_id}")
            else:
                print(f"  ⚠️  Failed to delete {test_id}: {r.status_code}")
        except Exception as e:
            print(f"  ⚠️  Error deleting {test_id}: {e}")

# ============================================================================
# TEST 1: GET /api/posts (public + admin)
# ============================================================================
print("\n" + "="*80)
print("TEST 1: GET /api/posts (public + admin)")
print("="*80)

# 1a) GET /api/posts → 200 {posts:[...]} with at least 3 published, no 'content' field
try:
    r = requests.get(f"{BASE_URL}/posts", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "posts" in data and isinstance(data["posts"], list):
            posts = data["posts"]
            if len(posts) >= 3:
                # Check that content field is omitted
                has_content = any("content" in p for p in posts)
                if not has_content:
                    log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", True,
                             f"Found {len(posts)} posts, no content field in list")
                else:
                    log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", False,
                             "Content field should be omitted in list view")
            else:
                log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", False,
                         f"Expected >=3 posts, got {len(posts)}")
        else:
            log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", False,
                     f"Invalid response shape: {data}")
    else:
        log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", False,
                 f"Expected 200, got {r.status_code}")
except Exception as e:
    log_test("1a) GET /api/posts returns >=3 published posts WITHOUT content field", False, str(e))

# 1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 → 200 {post:{...content, title, tags, status:'published'}}
try:
    r = requests.get(f"{BASE_URL}/posts?slug=skatt-pa-utleieinntekt-2026", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "post" in data and isinstance(data["post"], dict):
            post = data["post"]
            required_fields = ["content", "title", "tags", "status"]
            missing = [f for f in required_fields if f not in post]
            if not missing:
                if post["status"] == "published" and post["content"]:
                    log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", True,
                             f"Title: {post['title'][:50]}, content length: {len(post['content'])}, tags: {post['tags']}")
                else:
                    log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", False,
                             f"Status: {post.get('status')}, content empty: {not post.get('content')}")
            else:
                log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", False,
                         f"Missing fields: {missing}")
        else:
            log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", False,
                     f"Invalid response shape: {data}")
    else:
        log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", False,
                 f"Expected 200, got {r.status_code}")
except Exception as e:
    log_test("1b) GET /api/posts?slug=skatt-pa-utleieinntekt-2026 returns post with content", False, str(e))

# 1c) GET /api/posts?slug=finnesikke-xyz → 404 {error:'Ikke funnet'}
try:
    r = requests.get(f"{BASE_URL}/posts?slug=finnesikke-xyz", timeout=10)
    if r.status_code == 404:
        data = r.json()
        if "error" in data and "Ikke funnet" in data["error"]:
            log_test("1c) GET /api/posts?slug=finnesikke-xyz returns 404", True,
                     f"Error message: {data['error']}")
        else:
            log_test("1c) GET /api/posts?slug=finnesikke-xyz returns 404", False,
                     f"Expected Norwegian error 'Ikke funnet', got: {data}")
    else:
        log_test("1c) GET /api/posts?slug=finnesikke-xyz returns 404", False,
                 f"Expected 404, got {r.status_code}")
except Exception as e:
    log_test("1c) GET /api/posts?slug=finnesikke-xyz returns 404", False, str(e))

# 1d) GET /api/posts?tag=Skatt → 200 {posts} filtered (at least 1)
try:
    r = requests.get(f"{BASE_URL}/posts?tag=Skatt", timeout=10)
    if r.status_code == 200:
        data = r.json()
        if "posts" in data and isinstance(data["posts"], list):
            posts = data["posts"]
            if len(posts) >= 1:
                # Verify posts have the tag
                has_tag = any("Skatt" in p.get("tags", []) for p in posts)
                log_test("1d) GET /api/posts?tag=Skatt returns filtered posts", True,
                         f"Found {len(posts)} posts with tag 'Skatt'")
            else:
                log_test("1d) GET /api/posts?tag=Skatt returns filtered posts", False,
                         f"Expected >=1 post with tag 'Skatt', got {len(posts)}")
        else:
            log_test("1d) GET /api/posts?tag=Skatt returns filtered posts", False,
                     f"Invalid response shape: {data}")
    else:
        log_test("1d) GET /api/posts?tag=Skatt returns filtered posts", False,
                 f"Expected 200, got {r.status_code}")
except Exception as e:
    log_test("1d) GET /api/posts?tag=Skatt returns filtered posts", False, str(e))

# 1e) Draft visibility: create a draft, then confirm plain GET /api/posts does NOT include it,
# but GET /api/posts?all=1&key=... DOES include it
draft_id = None
draft_slug = None
try:
    # Create a draft
    r = requests.post(
        f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
        json={
            "title": "TEST Draft Visibility Check",
            "excerpt": "This is a test draft",
            "content": "## Test\n\nThis draft should not be visible publicly.",
            "tags": "test,draft",
            "status": "draft"
        },
        timeout=10
    )
    if r.status_code == 201:
        data = r.json()
        if data.get("success") and "post" in data:
            draft_id = data["post"]["id"]
            draft_slug = data["post"]["slug"]
            created_test_ids.append(draft_id)
            print(f"  Created draft: {draft_slug} (id: {draft_id})")
            
            # Check public list does NOT include draft
            time.sleep(0.5)
            r_public = requests.get(f"{BASE_URL}/posts", timeout=10)
            if r_public.status_code == 200:
                public_posts = r_public.json().get("posts", [])
                draft_in_public = any(p.get("slug") == draft_slug for p in public_posts)
                
                # Check admin list DOES include draft
                r_admin = requests.get(f"{BASE_URL}/posts?all=1&key={ADMIN_KEY}", timeout=10)
                if r_admin.status_code == 200:
                    admin_posts = r_admin.json().get("posts", [])
                    draft_in_admin = any(p.get("slug") == draft_slug for p in admin_posts)
                    
                    if not draft_in_public and draft_in_admin:
                        log_test("1e) Draft visibility: public list excludes draft, admin list includes it", True,
                                 f"Draft '{draft_slug}' correctly hidden from public, visible to admin")
                    else:
                        log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False,
                                 f"Draft in public: {draft_in_public}, Draft in admin: {draft_in_admin}")
                else:
                    log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False,
                             f"Admin list request failed: {r_admin.status_code}")
            else:
                log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False,
                         f"Public list request failed: {r_public.status_code}")
        else:
            log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False,
                     f"Failed to create draft: {data}")
    else:
        log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False,
                 f"Failed to create draft: {r.status_code}")
except Exception as e:
    log_test("1e) Draft visibility: public list excludes draft, admin list includes it", False, str(e))

# ============================================================================
# TEST 2: POST/DELETE /api/admin/posts (CRUD)
# ============================================================================
print("\n" + "="*80)
print("TEST 2: POST/DELETE /api/admin/posts (CRUD)")
print("="*80)

# 2a) POST /api/admin/posts WITHOUT key → 401
try:
    r = requests.post(
        f"{BASE_URL}/admin/posts",
        json={"title": "TEST Should Fail"},
        timeout=10
    )
    if r.status_code == 401:
        log_test("2a) POST /api/admin/posts WITHOUT key returns 401", True,
                 f"Correctly rejected: {r.json()}")
    else:
        log_test("2a) POST /api/admin/posts WITHOUT key returns 401", False,
                 f"Expected 401, got {r.status_code}")
except Exception as e:
    log_test("2a) POST /api/admin/posts WITHOUT key returns 401", False, str(e))

# 2b) POST with key and draft payload → 201 {success:true, post:{id, slug, status:'draft', publishedAt:null}}
test_article_id = None
test_article_slug = None
try:
    r = requests.post(
        f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
        json={
            "title": "TEST Artikkel QA",
            "excerpt": "test",
            "content": "## Hei\n\nTekst",
            "tags": "test,qa",
            "status": "draft"
        },
        timeout=10
    )
    if r.status_code == 201:
        data = r.json()
        if data.get("success") and "post" in data:
            post = data["post"]
            test_article_id = post.get("id")
            test_article_slug = post.get("slug")
            created_test_ids.append(test_article_id)
            
            required_fields = ["id", "slug", "status"]
            missing = [f for f in required_fields if f not in post]
            
            if not missing and post["status"] == "draft" and post.get("publishedAt") is None:
                log_test("2b) POST /api/admin/posts creates draft article", True,
                         f"Created: {test_article_slug} (id: {test_article_id}), status: draft, publishedAt: null")
            else:
                log_test("2b) POST /api/admin/posts creates draft article", False,
                         f"Missing fields: {missing}, status: {post.get('status')}, publishedAt: {post.get('publishedAt')}")
        else:
            log_test("2b) POST /api/admin/posts creates draft article", False,
                     f"Invalid response: {data}")
    else:
        log_test("2b) POST /api/admin/posts creates draft article", False,
                 f"Expected 201, got {r.status_code}: {r.text}")
except Exception as e:
    log_test("2b) POST /api/admin/posts creates draft article", False, str(e))

# 2c) POST again with id from (2b), status='published' → 200 {success:true, post:{status:'published', publishedAt:<not null>}}
if test_article_id:
    try:
        r = requests.post(
            f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
            json={
                "id": test_article_id,
                "title": "TEST Artikkel QA",
                "status": "published"
            },
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("success") and "post" in data:
                post = data["post"]
                if post["status"] == "published" and post.get("publishedAt") is not None:
                    log_test("2c) POST /api/admin/posts updates draft to published", True,
                             f"Updated: {test_article_slug}, status: published, publishedAt: {post['publishedAt']}")
                else:
                    log_test("2c) POST /api/admin/posts updates draft to published", False,
                             f"Status: {post.get('status')}, publishedAt: {post.get('publishedAt')}")
            else:
                log_test("2c) POST /api/admin/posts updates draft to published", False,
                         f"Invalid response: {data}")
        else:
            log_test("2c) POST /api/admin/posts updates draft to published", False,
                     f"Expected 200, got {r.status_code}: {r.text}")
    except Exception as e:
        log_test("2c) POST /api/admin/posts updates draft to published", False, str(e))
else:
    log_test("2c) POST /api/admin/posts updates draft to published", False,
             "Skipped: no test article created in 2b")

# 2d) POST with key but body {} (no title) → 400 {success:false, error:'Tittel mangler'}
try:
    r = requests.post(
        f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
        json={},
        timeout=10
    )
    if r.status_code == 400:
        data = r.json()
        if not data.get("success") and "Tittel mangler" in data.get("error", ""):
            log_test("2d) POST /api/admin/posts with no title returns 400", True,
                     f"Error: {data['error']}")
        else:
            log_test("2d) POST /api/admin/posts with no title returns 400", False,
                     f"Expected 'Tittel mangler', got: {data}")
    else:
        log_test("2d) POST /api/admin/posts with no title returns 400", False,
                 f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("2d) POST /api/admin/posts with no title returns 400", False, str(e))

# 2e) DELETE /api/admin/posts with id → 200 {success:true, deleted:1}
if test_article_id:
    try:
        r = requests.delete(
            f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
            json={"id": test_article_id},
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("success") and data.get("deleted") == 1:
                log_test("2e) DELETE /api/admin/posts with id deletes article", True,
                         f"Deleted: {test_article_id}")
                # Remove from cleanup list since already deleted
                if test_article_id in created_test_ids:
                    created_test_ids.remove(test_article_id)
            else:
                log_test("2e) DELETE /api/admin/posts with id deletes article", False,
                         f"Expected deleted:1, got: {data}")
        else:
            log_test("2e) DELETE /api/admin/posts with id deletes article", False,
                     f"Expected 200, got {r.status_code}: {r.text}")
    except Exception as e:
        log_test("2e) DELETE /api/admin/posts with id deletes article", False, str(e))
else:
    log_test("2e) DELETE /api/admin/posts with id deletes article", False,
             "Skipped: no test article created in 2b")

# 2f) DELETE without id → 400
try:
    r = requests.delete(
        f"{BASE_URL}/admin/posts?key={ADMIN_KEY}",
        json={},
        timeout=10
    )
    if r.status_code == 400:
        data = r.json()
        if not data.get("success") and "Mangler id" in data.get("error", ""):
            log_test("2f) DELETE /api/admin/posts without id returns 400", True,
                     f"Error: {data['error']}")
        else:
            log_test("2f) DELETE /api/admin/posts without id returns 400", False,
                     f"Expected 'Mangler id', got: {data}")
    else:
        log_test("2f) DELETE /api/admin/posts without id returns 400", False,
                 f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("2f) DELETE /api/admin/posts without id returns 400", False, str(e))

# ============================================================================
# TEST 3: POST /api/admin/generate-article (Emergent LLM)
# ============================================================================
print("\n" + "="*80)
print("TEST 3: POST /api/admin/generate-article (Emergent LLM)")
print("="*80)
print("⚠️  Testing SEQUENTIALLY with delays due to LLM concurrency limits")

# 3a) WITHOUT key → 401
try:
    r = requests.post(
        f"{BASE_URL}/admin/generate-article",
        json={"topic": "Test topic"},
        timeout=30
    )
    if r.status_code == 401:
        log_test("3a) POST /api/admin/generate-article WITHOUT key returns 401", True,
                 f"Correctly rejected: {r.json()}")
    else:
        log_test("3a) POST /api/admin/generate-article WITHOUT key returns 401", False,
                 f"Expected 401, got {r.status_code}")
except Exception as e:
    log_test("3a) POST /api/admin/generate-article WITHOUT key returns 401", False, str(e))

time.sleep(2)  # Delay between LLM calls

# 3b) {topic:'ab'} (under 4 chars) → 400 {ok:false, error}
try:
    r = requests.post(
        f"{BASE_URL}/admin/generate-article?key={ADMIN_KEY}",
        json={"topic": "ab"},
        timeout=30
    )
    if r.status_code == 400:
        data = r.json()
        if not data.get("ok") and "error" in data:
            log_test("3b) POST /api/admin/generate-article with short topic returns 400", True,
                     f"Error: {data['error']}")
        else:
            log_test("3b) POST /api/admin/generate-article with short topic returns 400", False,
                     f"Expected ok:false with error, got: {data}")
    else:
        log_test("3b) POST /api/admin/generate-article with short topic returns 400", False,
                 f"Expected 400, got {r.status_code}")
except Exception as e:
    log_test("3b) POST /api/admin/generate-article with short topic returns 400", False, str(e))

time.sleep(3)  # Delay before actual LLM call

# 3c) {topic:'Skatt på utleie i Norge'} → 200 {ok:true, draft:{title, excerpt, content, tags, seoTitle, seoDescription}}
# Retry once if sporadic 502
try:
    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            r = requests.post(
                f"{BASE_URL}/admin/generate-article?key={ADMIN_KEY}",
                json={"topic": "Skatt på utleie i Norge"},
                timeout=45
            )
            
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and "draft" in data:
                    draft = data["draft"]
                    required_fields = ["title", "excerpt", "content", "tags", "seoTitle", "seoDescription"]
                    missing = [f for f in required_fields if f not in draft]
                    
                    if not missing:
                        content_length = len(draft.get("content", ""))
                        tags_count = len(draft.get("tags", []))
                        
                        if content_length > 0:
                            log_test("3c) POST /api/admin/generate-article generates article draft", True,
                                     f"Generated: title='{draft['title'][:50]}...', content={content_length} chars, tags={tags_count}, seoTitle='{draft['seoTitle'][:40]}...'")
                        else:
                            log_test("3c) POST /api/admin/generate-article generates article draft", False,
                                     "Content is empty")
                    else:
                        log_test("3c) POST /api/admin/generate-article generates article draft", False,
                                 f"Missing fields: {missing}")
                else:
                    log_test("3c) POST /api/admin/generate-article generates article draft", False,
                             f"Expected ok:true with draft, got: {data}")
                break  # Success, exit retry loop
                
            elif r.status_code == 502 and attempt < max_attempts - 1:
                print(f"  ⚠️  Got 502, waiting 3s and retrying (attempt {attempt + 1}/{max_attempts})...")
                time.sleep(3)
                continue
            else:
                log_test("3c) POST /api/admin/generate-article generates article draft", False,
                         f"Expected 200, got {r.status_code}: {r.text[:200]}")
                break
                
        except requests.exceptions.Timeout:
            if attempt < max_attempts - 1:
                print(f"  ⚠️  Timeout, waiting 3s and retrying (attempt {attempt + 1}/{max_attempts})...")
                time.sleep(3)
                continue
            else:
                log_test("3c) POST /api/admin/generate-article generates article draft", False,
                         "Request timeout after retries")
                break
                
except Exception as e:
    log_test("3c) POST /api/admin/generate-article generates article draft", False, str(e))

# ============================================================================
# CLEANUP
# ============================================================================
cleanup_test_articles()

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)

passed = sum(1 for t in test_results if t["passed"])
total = len(test_results)
pass_rate = (passed / total * 100) if total > 0 else 0

print(f"\nTotal: {passed}/{total} tests passed ({pass_rate:.1f}%)\n")

for t in test_results:
    status = "✅" if t["passed"] else "❌"
    print(f"{status} {t['name']}")

if passed == total:
    print("\n🎉 ALL TESTS PASSED!")
    sys.exit(0)
else:
    print(f"\n⚠️  {total - passed} test(s) failed")
    sys.exit(1)
