#!/usr/bin/env python3
"""
Backend test for lead attribution with raw click IDs (gclid, gbraid, wbraid, fbclid, msclkid).
Tests the sanitizeAttribution() extension in app/api/[[...path]]/route.js.

Base URL: https://hero-premiere-4.preview.emergentagent.com/api
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BASE_URL = "https://hero-premiere-4.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

async def test_attribution_with_click_ids():
    """Test POST /api/leads with attribution containing gclid and gbraid"""
    print("\n=== TEST 1: POST /api/leads with gclid and gbraid ===")
    
    async with aiohttp.ClientSession() as session:
        payload = {
            "name": "QA Test Bot",
            "email": "qa-bot@example.test",
            "phone": "+47 00000000",
            "address": "Testveien 1",
            "property_type": "leilighet",
            "lead_type": "huseier",
            "source": "qa-attr-test",
            "attribution": {
                "source": "google",
                "medium": "cpc",
                "campaign": "qa",
                "gclid": "QA_GCLID_123",
                "gbraid": "QA_GBRAID_456",
                "utm_term": "x"
            }
        }
        
        try:
            async with session.post(f"{BASE_URL}/leads", json=payload) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify status code
                if status != 201:
                    print(f"❌ FAILED: Expected status 201, got {status}")
                    return False
                
                # Verify success field
                if not data.get("success"):
                    print(f"❌ FAILED: Expected success=true, got {data.get('success')}")
                    return False
                
                # Verify lead object exists
                lead = data.get("lead")
                if not lead:
                    print(f"❌ FAILED: No lead object in response")
                    return False
                
                # Verify attribution exists
                attribution = lead.get("attribution")
                if not attribution:
                    print(f"❌ FAILED: No attribution object in lead")
                    return False
                
                # Verify gclid is preserved
                if attribution.get("gclid") != "QA_GCLID_123":
                    print(f"❌ FAILED: Expected gclid='QA_GCLID_123', got '{attribution.get('gclid')}'")
                    return False
                
                # Verify gbraid is preserved
                if attribution.get("gbraid") != "QA_GBRAID_456":
                    print(f"❌ FAILED: Expected gbraid='QA_GBRAID_456', got '{attribution.get('gbraid')}'")
                    return False
                
                # Verify source/medium/campaign are preserved
                if attribution.get("source") != "google":
                    print(f"❌ FAILED: Expected source='google', got '{attribution.get('source')}'")
                    return False
                
                if attribution.get("medium") != "cpc":
                    print(f"❌ FAILED: Expected medium='cpc', got '{attribution.get('medium')}'")
                    return False
                
                if attribution.get("campaign") != "qa":
                    print(f"❌ FAILED: Expected campaign='qa', got '{attribution.get('campaign')}'")
                    return False
                
                print("✅ PASSED: Lead created with gclid and gbraid preserved correctly")
                print(f"   - gclid: {attribution.get('gclid')}")
                print(f"   - gbraid: {attribution.get('gbraid')}")
                print(f"   - source: {attribution.get('source')}")
                print(f"   - medium: {attribution.get('medium')}")
                print(f"   - campaign: {attribution.get('campaign')}")
                return True
                
        except Exception as e:
            print(f"❌ FAILED: Exception occurred: {str(e)}")
            return False


async def test_attribution_without_click_ids():
    """Test POST /api/leads with attribution WITHOUT click IDs"""
    print("\n=== TEST 2: POST /api/leads with attribution WITHOUT click IDs ===")
    
    async with aiohttp.ClientSession() as session:
        payload = {
            "name": "QA Test Bot 2",
            "email": "qa-bot2@example.test",
            "phone": "+47 00000000",
            "lead_type": "huseier",
            "source": "qa-attr-test",
            "attribution": {
                "source": "direct"
            }
        }
        
        try:
            async with session.post(f"{BASE_URL}/leads", json=payload) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify status code
                if status != 201:
                    print(f"❌ FAILED: Expected status 201, got {status}")
                    return False
                
                # Verify success field
                if not data.get("success"):
                    print(f"❌ FAILED: Expected success=true, got {data.get('success')}")
                    return False
                
                # Verify lead object exists
                lead = data.get("lead")
                if not lead:
                    print(f"❌ FAILED: No lead object in response")
                    return False
                
                # Verify attribution exists
                attribution = lead.get("attribution")
                if not attribution:
                    print(f"❌ FAILED: No attribution object in lead")
                    return False
                
                # Verify gclid is undefined/omitted (should not be present or should be empty string)
                gclid = attribution.get("gclid")
                if gclid is not None and gclid != "":
                    print(f"❌ FAILED: Expected gclid to be undefined/omitted, got '{gclid}'")
                    return False
                
                # Verify other click IDs are also undefined/omitted
                for click_id in ["gbraid", "wbraid", "fbclid", "msclkid"]:
                    value = attribution.get(click_id)
                    if value is not None and value != "":
                        print(f"❌ FAILED: Expected {click_id} to be undefined/omitted, got '{value}'")
                        return False
                
                print("✅ PASSED: Lead created without click IDs (no crash, no 500)")
                print(f"   - gclid: {attribution.get('gclid', 'undefined')}")
                print(f"   - source: {attribution.get('source')}")
                return True
                
        except Exception as e:
            print(f"❌ FAILED: Exception occurred: {str(e)}")
            return False


async def test_empty_body():
    """Test POST /api/leads with empty body"""
    print("\n=== TEST 3: POST /api/leads with empty body ===")
    
    async with aiohttp.ClientSession() as session:
        payload = {}
        
        try:
            async with session.post(f"{BASE_URL}/leads", json=payload) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify status code
                if status != 400:
                    print(f"❌ FAILED: Expected status 400, got {status}")
                    return False
                
                # Verify success field is false
                if data.get("success") != False:
                    print(f"❌ FAILED: Expected success=false, got {data.get('success')}")
                    return False
                
                print("✅ PASSED: Empty body returns 400 with success=false")
                return True
                
        except Exception as e:
            print(f"❌ FAILED: Exception occurred: {str(e)}")
            return False


async def test_get_leads():
    """Test GET /api/leads?key=dh_admin_b3Kx92Qz7Lm4"""
    print("\n=== TEST 4: GET /api/leads?key=dh_admin_b3Kx92Qz7Lm4 ===")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/leads?key={ADMIN_KEY}") as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                
                # Verify status code
                if status != 200:
                    print(f"❌ FAILED: Expected status 200, got {status}")
                    return False
                
                # Verify it's an array
                if not isinstance(data, list):
                    print(f"❌ FAILED: Expected array, got {type(data)}")
                    return False
                
                print(f"Response: Array with {len(data)} leads")
                
                # Verify no MongoDB _id fields
                for lead in data:
                    if "_id" in lead:
                        print(f"❌ FAILED: Found MongoDB _id field in lead")
                        return False
                
                # Verify newest first (if we have multiple leads)
                if len(data) >= 2:
                    first_date = datetime.fromisoformat(data[0]["createdAt"].replace("Z", "+00:00"))
                    second_date = datetime.fromisoformat(data[1]["createdAt"].replace("Z", "+00:00"))
                    if first_date < second_date:
                        print(f"❌ FAILED: Leads not sorted newest first")
                        return False
                
                # Find our test leads and verify attribution
                test_lead_1 = None
                test_lead_2 = None
                for lead in data:
                    if lead.get("email") == "qa-bot@example.test":
                        test_lead_1 = lead
                    elif lead.get("email") == "qa-bot2@example.test":
                        test_lead_2 = lead
                
                if test_lead_1:
                    print(f"\n   Found test lead 1 (qa-bot@example.test):")
                    attribution = test_lead_1.get("attribution", {})
                    print(f"   - gclid: {attribution.get('gclid')}")
                    print(f"   - gbraid: {attribution.get('gbraid')}")
                    
                    if attribution.get("gclid") != "QA_GCLID_123":
                        print(f"   ⚠️  WARNING: gclid not preserved in stored lead")
                    if attribution.get("gbraid") != "QA_GBRAID_456":
                        print(f"   ⚠️  WARNING: gbraid not preserved in stored lead")
                
                if test_lead_2:
                    print(f"\n   Found test lead 2 (qa-bot2@example.test):")
                    attribution = test_lead_2.get("attribution", {})
                    print(f"   - gclid: {attribution.get('gclid', 'undefined')}")
                    print(f"   - source: {attribution.get('source')}")
                
                print("\n✅ PASSED: GET /api/leads returns array (newest first), no _id fields")
                return True
                
        except Exception as e:
            print(f"❌ FAILED: Exception occurred: {str(e)}")
            return False


async def test_health_endpoint():
    """Test GET /api/ (regression)"""
    print("\n=== TEST 5: GET /api/ (regression) ===")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/") as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"Status: {status}")
                print(f"Response: {json.dumps(data, indent=2)}")
                
                # Verify status code
                if status != 200:
                    print(f"❌ FAILED: Expected status 200, got {status}")
                    return False
                
                # Verify ok field
                if not data.get("ok"):
                    print(f"❌ FAILED: Expected ok=true, got {data.get('ok')}")
                    return False
                
                print("✅ PASSED: Health endpoint returns 200 with ok=true")
                return True
                
        except Exception as e:
            print(f"❌ FAILED: Exception occurred: {str(e)}")
            return False


async def main():
    print("=" * 80)
    print("BACKEND TEST: Lead Attribution with Raw Click IDs")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing sanitizeAttribution() extension for gclid/gbraid/wbraid/fbclid/msclkid")
    print("=" * 80)
    
    results = []
    
    # Run tests sequentially
    results.append(await test_attribution_with_click_ids())
    await asyncio.sleep(0.5)
    
    results.append(await test_attribution_without_click_ids())
    await asyncio.sleep(0.5)
    
    results.append(await test_empty_body())
    await asyncio.sleep(0.5)
    
    results.append(await test_get_leads())
    await asyncio.sleep(0.5)
    
    results.append(await test_health_endpoint())
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
    
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
