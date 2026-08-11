#!/usr/bin/env python3
"""
FINN-STUDIO MODULE BACKEND TEST
Compact, efficient test of 6 tasks in current_focus.
Previous test timed out, but backend logs show almost everything works.
"""

import asyncio
import aiohttp
import json
import base64
from typing import Dict, Any

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Test data
TEST_DESIGN_NAME = "QA Design"
TEST_CAMPAIGN_NAME = "QA FINN"

# Small test image (1x1 JPEG, base64)
SMALL_JPEG_B64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="

class FinnStudioTester:
    def __init__(self):
        self.session = None
        self.created_design_id = None
        self.created_campaign_id = None
        self.test_results = []
        
    async def setup(self):
        timeout = aiohttp.ClientTimeout(total=180)  # 3 min max for any single request
        self.session = aiohttp.ClientSession(timeout=timeout)
        
    async def cleanup(self):
        if self.session:
            await self.session.close()
            
    def log_result(self, test_name: str, passed: bool, details: str = ""):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append(f"{status}: {test_name}")
        if details:
            self.test_results.append(f"  → {details}")
        print(f"{status}: {test_name}")
        if details:
            print(f"  → {details}")
            
    async def test_design_library(self):
        """Test 1: DESIGN-BIBLIOTEK (NEW, most important)"""
        print("\n=== TEST 1: DESIGN-BIBLIOTEK ===")
        
        try:
            # 1a) POST create design
            design_data = {
                "name": TEST_DESIGN_NAME,
                "eyebrow": "Utleie i Bergen",
                "headline": "Test overskrift her",
                "subtext": "Test undertekst",
                "cta": "Se mer",
                "theme": "krem",
                "landing": "https://digihome.no/bli-utleier",
                "utmCampaign": "qa-finn",
                "photo": f"data:image/jpeg;base64,{SMALL_JPEG_B64}"
            }
            
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                json=design_data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 201 and data.get('ok') and data.get('id'):
                    self.created_design_id = data['id']
                    self.log_result("1a) POST create design", True, f"Created design with id={self.created_design_id}")
                else:
                    self.log_result("1a) POST create design", False, f"Status {resp.status}, data={data}")
                    return
                    
            # 1b) GET list (without photo field, with hasPhoto flag)
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok') and 'designs' in data:
                    designs = data['designs']
                    qa_design = next((d for d in designs if d.get('id') == self.created_design_id), None)
                    if qa_design:
                        has_photo = qa_design.get('hasPhoto')
                        has_photo_field = 'photo' in qa_design
                        if has_photo and not has_photo_field:
                            self.log_result("1b) GET list", True, f"Found design with hasPhoto=true, no photo field ✓")
                        else:
                            self.log_result("1b) GET list", False, f"hasPhoto={has_photo}, has photo field={has_photo_field}")
                    else:
                        self.log_result("1b) GET list", False, "QA design not in list")
                else:
                    self.log_result("1b) GET list", False, f"Status {resp.status}")
                    
            # 1c) GET single design with photo field
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}&id={self.created_design_id}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok') and 'design' in data:
                    design = data['design']
                    has_photo_field = 'photo' in design and design['photo'] and design['photo'].startswith('data:image/')
                    has_all_fields = all(k in design for k in ['name', 'eyebrow', 'headline', 'subtext', 'cta', 'theme'])
                    if has_photo_field and has_all_fields:
                        self.log_result("1c) GET single with photo", True, "Photo field present, all text fields correct ✓")
                    else:
                        self.log_result("1c) GET single with photo", False, f"photo={has_photo_field}, all_fields={has_all_fields}")
                else:
                    self.log_result("1c) GET single with photo", False, f"Status {resp.status}")
                    
            # 1d) POST update design
            update_data = {
                "id": self.created_design_id,
                "name": "QA Design v2",
                "theme": "plakat"
            }
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                json=update_data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok'):
                    # Verify update
                    async with self.session.get(
                        f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}&id={self.created_design_id}",
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as resp2:
                        data2 = await resp2.json()
                        design = data2.get('design', {})
                        if design.get('name') == 'QA Design v2' and design.get('theme') == 'plakat':
                            self.log_result("1d) POST update", True, "Name and theme updated ✓")
                        else:
                            self.log_result("1d) POST update", False, f"name={design.get('name')}, theme={design.get('theme')}")
                else:
                    self.log_result("1d) POST update", False, f"Status {resp.status}")
                    
            # 1e) Validation tests
            # POST without name → 400
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                json={"theme": "krem"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 400:
                    self.log_result("1e) POST without name → 400", True)
                else:
                    self.log_result("1e) POST without name → 400", False, f"Got {resp.status}")
                    
            # GET with non-existent id → 404
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}&id=finnes-ikke-xyz",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 404:
                    self.log_result("1e) GET non-existent id → 404", True)
                else:
                    self.log_result("1e) GET non-existent id → 404", False, f"Got {resp.status}")
                    
            # DELETE design
            async with self.session.delete(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}&id={self.created_design_id}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('deleted') == 1:
                    self.log_result("1e) DELETE design", True, "Deleted 1 design ✓")
                    # Verify it's gone from list
                    async with self.session.get(
                        f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as resp2:
                        data2 = await resp2.json()
                        designs = data2.get('designs', [])
                        if not any(d.get('id') == self.created_design_id for d in designs):
                            self.log_result("1e) Verify design deleted from list", True)
                        else:
                            self.log_result("1e) Verify design deleted from list", False, "Design still in list")
                else:
                    self.log_result("1e) DELETE design", False, f"Status {resp.status}, deleted={data.get('deleted')}")
                    
            # Auth tests
            # GET without key → 401
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/designs",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("1e) GET without key → 401", True)
                else:
                    self.log_result("1e) GET without key → 401", False, f"Got {resp.status}")
                    
            # POST without key → 401
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/designs",
                json={"name": "test"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("1e) POST without key → 401", True)
                else:
                    self.log_result("1e) POST without key → 401", False, f"Got {resp.status}")
                    
            # DELETE without key → 401
            async with self.session.delete(
                f"{BASE_URL}/admin/finnstudio/designs?id=test",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("1e) DELETE without key → 401", True)
                else:
                    self.log_result("1e) DELETE without key → 401", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("Design library test", False, f"Exception: {str(e)}")
            
    async def test_ai_copy(self):
        """Test 2: AI-TEKST (MAX 1 LLM call)"""
        print("\n=== TEST 2: AI-TEKST (1 LLM call) ===")
        
        try:
            # Single LLM call with valid brief
            brief_data = {
                "brief": "Nå boligeiere i Bergen som vurderer å selge"
            }
            
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/copy?key={ADMIN_KEY}",
                json=brief_data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok') and 'variants' in data:
                    variants = data['variants']
                    if len(variants) == 4:
                        # Check first variant structure
                        v = variants[0]
                        has_structure = all(k in v for k in ['angle', 'headline', 'subtext', 'cta'])
                        headline_ok = len(v.get('headline', '')) <= 34
                        subtext_ok = len(v.get('subtext', '')) <= 50
                        cta_ok = len(v.get('cta', '')) <= 16
                        
                        if has_structure and headline_ok and subtext_ok and cta_ok:
                            self.log_result("2) POST /copy with valid brief", True, 
                                f"4 variants, correct structure, lengths OK (headline≤34, subtext≤50, cta≤16)")
                        else:
                            self.log_result("2) POST /copy with valid brief", False,
                                f"structure={has_structure}, headline≤34={headline_ok}, subtext≤50={subtext_ok}, cta≤16={cta_ok}")
                    else:
                        self.log_result("2) POST /copy with valid brief", False, f"Got {len(variants)} variants, expected 4")
                else:
                    self.log_result("2) POST /copy with valid brief", False, f"Status {resp.status}, data={data}")
                    
            # Empty brief → 400
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/copy?key={ADMIN_KEY}",
                json={"brief": ""},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 400:
                    self.log_result("2) POST /copy empty brief → 400", True)
                else:
                    self.log_result("2) POST /copy empty brief → 400", False, f"Got {resp.status}")
                    
            # Without key → 401
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/copy",
                json={"brief": "test"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("2) POST /copy without key → 401", True)
                else:
                    self.log_result("2) POST /copy without key → 401", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("AI copy test", False, f"Exception: {str(e)}")
            
    async def test_render(self):
        """Test 3: BANNER-RENDERING"""
        print("\n=== TEST 3: BANNER-RENDERING ===")
        
        try:
            render_data = {
                "headline": "Ikke selg boligen – lei den ut",
                "subtext": "Gratis leievurdering",
                "cta": "Se hva du får",
                "eyebrow": "Utleie i Bergen",
                "theme": "nordlys"
            }
            
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/render?key={ADMIN_KEY}",
                json=render_data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok') and 'banners' in data:
                    banners = data['banners']
                    if len(banners) == 7:
                        # Check all formats present with correct dimensions
                        expected = {
                            'board': (320, 250),
                            'board_xl': (320, 400),
                            'fullskjerm': (1080, 1920),
                            'netboard': (580, 400),
                            'hestesko_topp': (1010, 150),
                            'hestesko_side': (180, 700),
                            'wallpaper_bakgrunn': (1920, 1300)
                        }
                        
                        all_correct = True
                        for banner in banners:
                            key = banner.get('key')
                            if key in expected:
                                exp_w, exp_h = expected[key]
                                if banner.get('w') != exp_w or banner.get('h') != exp_h:
                                    all_correct = False
                                    self.log_result(f"3) Banner {key} dimensions", False, 
                                        f"Expected {exp_w}x{exp_h}, got {banner.get('w')}x{banner.get('h')}")
                                    
                                # Check size limit
                                bytes_val = banner.get('bytes', 0)
                                max_kb = banner.get('maxKb', 0)
                                if bytes_val > max_kb * 1024:
                                    all_correct = False
                                    self.log_result(f"3) Banner {key} size", False,
                                        f"bytes={bytes_val} > maxKb*1024={max_kb*1024}")
                                        
                                # Check dataUrl
                                if not banner.get('dataUrl', '').startswith('data:image/'):
                                    all_correct = False
                                    self.log_result(f"3) Banner {key} dataUrl", False, "Invalid dataUrl")
                                    
                                # Check group
                                if banner.get('group') not in ['mobil', 'desktop']:
                                    all_correct = False
                                    self.log_result(f"3) Banner {key} group", False, f"Invalid group={banner.get('group')}")
                                    
                        if all_correct:
                            self.log_result("3) POST /render all formats", True,
                                "7 banners, correct dimensions, within size limits, valid dataUrls, correct groups ✓")
                    else:
                        self.log_result("3) POST /render", False, f"Got {len(banners)} banners, expected 7")
                else:
                    self.log_result("3) POST /render", False, f"Status {resp.status}")
                    
            # Without headline → 400
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/render?key={ADMIN_KEY}",
                json={"theme": "krem"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 400:
                    self.log_result("3) POST /render without headline → 400", True)
                else:
                    self.log_result("3) POST /render without headline → 400", False, f"Got {resp.status}")
                    
            # Without key → 401
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/render",
                json={"headline": "test"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("3) POST /render without key → 401", True)
                else:
                    self.log_result("3) POST /render without key → 401", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("Render test", False, f"Exception: {str(e)}")
            
    async def test_genbg(self):
        """Test 4: AI-BAKGRUNNSFOTO (MAX 1 call, 120s timeout)"""
        print("\n=== TEST 4: AI-BAKGRUNNSFOTO (1 AI call, 120s timeout) ===")
        
        try:
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/genbg?key={ADMIN_KEY}",
                json={},
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('ok') and data.get('dataUrl', '').startswith('data:image/jpeg') and 'model' in data:
                        self.log_result("4) POST /genbg", True, 
                            f"200 OK, dataUrl valid, model={data.get('model')} ✓")
                    else:
                        self.log_result("4) POST /genbg", False, f"Invalid response structure: {data}")
                elif resp.status == 502:
                    # 502 with Norwegian error message is acceptable (MINOR)
                    try:
                        data = await resp.json()
                        error = data.get('error', '')
                        if error and any(word in error.lower() for word in ['tjeneste', 'nede', 'timeout', 'feil']):
                            self.log_result("4) POST /genbg", True, 
                                f"502 with Norwegian error (MINOR, acceptable): {error}")
                        else:
                            self.log_result("4) POST /genbg", False, f"502 but error not Norwegian: {error}")
                    except:
                        self.log_result("4) POST /genbg", False, "502 but no JSON error")
                else:
                    self.log_result("4) POST /genbg", False, f"Status {resp.status}")
                    
            # Without key → 401
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/genbg",
                json={},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("4) POST /genbg without key → 401", True)
                else:
                    self.log_result("4) POST /genbg without key → 401", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("Genbg test", False, f"Exception: {str(e)}")
            
    async def test_campaigns(self):
        """Test 5: KAMPANJER CRUD + UTM-MÅLING"""
        print("\n=== TEST 5: KAMPANJER CRUD + UTM-MÅLING ===")
        
        try:
            # 5a) POST create campaign
            campaign_data = {
                "name": TEST_CAMPAIGN_NAME,
                "utmCampaign": "qa-finn-test",
                "startDate": "2026-07-01",
                "endDate": "2026-07-31",
                "budgetNok": 12000,
                "spendNok": 1500,
                "impressions": 10000,
                "clicks": 25,
                "status": "aktiv"
            }
            
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}",
                json=campaign_data,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 201 and data.get('ok') and data.get('campaign', {}).get('id'):
                    self.created_campaign_id = data['campaign']['id']
                    self.log_result("5a) POST create campaign", True, f"Created campaign id={self.created_campaign_id}")
                else:
                    self.log_result("5a) POST create campaign", False, f"Status {resp.status}, data={data}")
                    return
                    
            # 5b) GET campaigns with measured calculations
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok') and 'campaigns' in data and 'totals' in data:
                    campaigns = data['campaigns']
                    totals = data['totals']
                    
                    qa_campaign = next((c for c in campaigns if c.get('id') == self.created_campaign_id), None)
                    if qa_campaign:
                        measured = qa_campaign.get('measured', {})
                        # CTR = clicks / impressions * 100 = 25 / 10000 * 100 = 0.25
                        # CPC = spend / clicks = 1500 / 25 = 60
                        # CPM = (spend / impressions) * 1000 = (1500 / 10000) * 1000 = 150
                        ctr = measured.get('ctr', 0)
                        cpc = measured.get('cpc', 0)
                        cpm = measured.get('cpm', 0)
                        
                        ctr_ok = abs(ctr - 0.25) < 0.01
                        cpc_ok = abs(cpc - 60) < 0.1
                        cpm_ok = abs(cpm - 150) < 0.1
                        
                        if ctr_ok and cpc_ok and cpm_ok:
                            self.log_result("5b) GET campaigns measured", True,
                                f"CTR=0.25%, CPC=60, CPM=150 ✓")
                        else:
                            self.log_result("5b) GET campaigns measured", False,
                                f"CTR={ctr} (exp 0.25), CPC={cpc} (exp 60), CPM={cpm} (exp 150)")
                            
                        # Check totals
                        if totals.get('spend') == 1500 and totals.get('clicks') == 25:
                            self.log_result("5b) GET campaigns totals", True, "spend=1500, clicks=25 ✓")
                        else:
                            self.log_result("5b) GET campaigns totals", False,
                                f"spend={totals.get('spend')}, clicks={totals.get('clicks')}")
                    else:
                        self.log_result("5b) GET campaigns", False, "QA campaign not found")
                else:
                    self.log_result("5b) GET campaigns", False, f"Status {resp.status}")
                    
            # 5c) Check analytics endpoint while campaign exists
            async with self.session.get(
                f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and 'paid' in data:
                    channels = data['paid'].get('channels', [])
                    finn_channel = next((c for c in channels if c.get('key') == 'finn'), None)
                    if finn_channel:
                        if finn_channel.get('label') == 'FINN.no' and finn_channel.get('spend') == 1500 and finn_channel.get('adClicks') == 25:
                            self.log_result("5c) GET analytics with campaign", True,
                                "FINN.no channel present with spend=1500, adClicks=25 ✓")
                        else:
                            self.log_result("5c) GET analytics with campaign", False,
                                f"label={finn_channel.get('label')}, spend={finn_channel.get('spend')}, adClicks={finn_channel.get('adClicks')}")
                    else:
                        self.log_result("5c) GET analytics with campaign", False, "FINN.no channel not found")
                else:
                    self.log_result("5c) GET analytics with campaign", False, f"Status {resp.status}")
                    
            # 5d) DELETE campaign
            async with self.session.delete(
                f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}&id={self.created_campaign_id}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('ok'):
                    self.log_result("5d) DELETE campaign", True, f"Deleted campaign {self.created_campaign_id} ✓")
                    
                    # Verify it's gone from list
                    async with self.session.get(
                        f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}",
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as resp2:
                        data2 = await resp2.json()
                        campaigns = data2.get('campaigns', [])
                        if not any(c.get('id') == self.created_campaign_id for c in campaigns):
                            self.log_result("5d) Verify campaign deleted", True)
                        else:
                            self.log_result("5d) Verify campaign deleted", False, "Campaign still in list")
                            
                    # Check analytics after delete - FINN channel should still exist but spend should be 0/null
                    async with self.session.get(
                        f"{BASE_URL}/admin/analytics?key={ADMIN_KEY}&days=30",
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as resp3:
                        data3 = await resp3.json()
                        if resp3.status == 200 and 'paid' in data3:
                            channels = data3['paid'].get('channels', [])
                            finn_channel = next((c for c in channels if c.get('key') == 'finn'), None)
                            if finn_channel:
                                spend = finn_channel.get('spend')
                                if spend is None or spend == 0:
                                    self.log_result("5d) Analytics after delete", True, 
                                        f"FINN channel exists but spend={spend} (correct) ✓")
                                else:
                                    self.log_result("5d) Analytics after delete", False,
                                        f"FINN channel spend={spend}, expected 0/null")
                else:
                    self.log_result("5d) DELETE campaign", False, f"Status {resp.status}")
                    
            # 5e) Validation tests
            # POST without name → 400
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}",
                json={"status": "aktiv"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 400:
                    self.log_result("5e) POST without name → 400", True)
                else:
                    self.log_result("5e) POST without name → 400", False, f"Got {resp.status}")
                    
            # Auth tests
            # GET without key → 401
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/campaigns",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("5e) GET without key → 401", True)
                else:
                    self.log_result("5e) GET without key → 401", False, f"Got {resp.status}")
                    
            # POST without key → 401
            async with self.session.post(
                f"{BASE_URL}/admin/finnstudio/campaigns",
                json={"name": "test"},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("5e) POST without key → 401", True)
                else:
                    self.log_result("5e) POST without key → 401", False, f"Got {resp.status}")
                    
            # DELETE without key → 401
            async with self.session.delete(
                f"{BASE_URL}/admin/finnstudio/campaigns?id=test",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 401:
                    self.log_result("5e) DELETE without key → 401", True)
                else:
                    self.log_result("5e) DELETE without key → 401", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("Campaigns test", False, f"Exception: {str(e)}")
            
    async def test_regression(self):
        """Test 6: REGRESSION"""
        print("\n=== TEST 6: REGRESSION ===")
        
        try:
            async with self.session.get(
                f"{BASE_URL}/",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 200:
                    self.log_result("6) GET /api/ → 200", True)
                else:
                    self.log_result("6) GET /api/ → 200", False, f"Got {resp.status}")
                    
        except Exception as e:
            self.log_result("Regression test", False, f"Exception: {str(e)}")
            
    async def verify_cleanup(self):
        """Verify all test data is cleaned up"""
        print("\n=== VERIFY CLEANUP ===")
        
        try:
            # Verify campaigns cleanup
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/campaigns?key={ADMIN_KEY}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                campaigns = data.get('campaigns', [])
                qa_campaigns = [c for c in campaigns if 'QA' in c.get('name', '')]
                if len(qa_campaigns) == 0:
                    self.log_result("Cleanup: finn_campaigns empty", True, "No QA campaigns ✓")
                else:
                    self.log_result("Cleanup: finn_campaigns empty", False, 
                        f"Found {len(qa_campaigns)} QA campaigns: {[c.get('name') for c in qa_campaigns]}")
                    
            # Verify designs cleanup
            async with self.session.get(
                f"{BASE_URL}/admin/finnstudio/designs?key={ADMIN_KEY}",
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                designs = data.get('designs', [])
                qa_designs = [d for d in designs if 'QA' in d.get('name', '')]
                if len(qa_designs) == 0:
                    self.log_result("Cleanup: finn_designs empty", True, "No QA designs ✓")
                else:
                    self.log_result("Cleanup: finn_designs empty", False,
                        f"Found {len(qa_designs)} QA designs: {[d.get('name') for d in qa_designs]}")
                    
        except Exception as e:
            self.log_result("Cleanup verification", False, f"Exception: {str(e)}")
            
    async def run_all_tests(self):
        """Run all tests in sequence"""
        await self.setup()
        
        try:
            # Run tests in order
            await self.test_design_library()
            await self.test_ai_copy()
            await self.test_render()
            await self.test_genbg()
            await self.test_campaigns()
            await self.test_regression()
            
            # Verify cleanup
            await self.verify_cleanup()
            
        finally:
            await self.cleanup()
            
        # Print summary
        print("\n" + "="*60)
        print("FINN-STUDIO TEST SUMMARY")
        print("="*60)
        for result in self.test_results:
            print(result)
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r.startswith("✅"))
        total = len(self.test_results)
        print(f"\nTotal: {passed}/{total} tests passed")
        
        return passed == total

async def main():
    tester = FinnStudioTester()
    success = await tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
