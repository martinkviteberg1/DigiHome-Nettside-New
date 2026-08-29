#!/usr/bin/env python3
"""
Backend test for Annonsør-parser v2: privat-telefon fra FINNs serialiserte data
Test plan T1-T3 (ONLY reading + ONE idempotent POST)
"""
import asyncio
import aiohttp
import sys

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

async def test_annonsor_v2():
    """Test Annonsør-parser v2 implementation"""
    print("=" * 80)
    print("ANNONSØR-PARSER V2 TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print()
    
    async with aiohttp.ClientSession() as session:
        tests_passed = 0
        tests_failed = 0
        
        # ═══════════════════════════════════════════════════════════════════
        # T1: GET /api/admin/salgsradar/leads - verify all leads have v=2
        # ═══════════════════════════════════════════════════════════════════
        print("─" * 80)
        print("T1: GET /api/admin/salgsradar/leads - verify parser v2 data")
        print("─" * 80)
        try:
            async with session.get(
                f"{BASE_URL}/admin/salgsradar/leads",
                params={"key": ADMIN_KEY}
            ) as resp:
                if resp.status != 200:
                    print(f"❌ T1 FAILED: Expected 200, got {resp.status}")
                    tests_failed += 1
                else:
                    data = await resp.json()
                    if not data.get("ok"):
                        print(f"❌ T1 FAILED: Response not ok: {data}")
                        tests_failed += 1
                    else:
                        leads = data.get("leads", [])
                        print(f"✓ GET /admin/salgsradar/leads returned 200 with {len(leads)} leads")
                        
                        # Check all leads have annonsor.v == 2
                        all_v2 = True
                        for lead in leads:
                            annonsor = lead.get("annonsor", {})
                            if annonsor.get("v") != 2:
                                print(f"❌ Lead '{lead.get('adresse', lead.get('id'))}' has annonsor.v={annonsor.get('v')} (expected 2)")
                                all_v2 = False
                        
                        if all_v2:
                            print(f"✓ All {len(leads)} leads have annonsor.v == 2")
                        else:
                            print(f"❌ T1 FAILED: Not all leads have annonsor.v == 2")
                            tests_failed += 1
                            return
                        
                        # Find 'Strandgaten 222' lead
                        strandgaten_lead = None
                        for lead in leads:
                            if "Strandgaten 222" in lead.get("adresse", ""):
                                strandgaten_lead = lead
                                break
                        
                        if not strandgaten_lead:
                            print("❌ T1 FAILED: Could not find lead with address 'Strandgaten 222'")
                            tests_failed += 1
                            return
                        
                        print(f"✓ Found lead 'Strandgaten 222'")
                        
                        # Verify Strandgaten 222 has correct data
                        annonsor = strandgaten_lead.get("annonsor", {})
                        kontakt_tlf = strandgaten_lead.get("kontaktTlf", "")
                        
                        # Check type='privat'
                        if annonsor.get("type") != "privat":
                            print(f"❌ T1 FAILED: Strandgaten 222 annonsor.type={annonsor.get('type')} (expected 'privat')")
                            tests_failed += 1
                            return
                        print(f"✓ Strandgaten 222 has annonsor.type='privat'")
                        
                        # Check kontaktTlf='92072453'
                        if kontakt_tlf != "92072453":
                            print(f"❌ T1 FAILED: Strandgaten 222 kontaktTlf='{kontakt_tlf}' (expected '92072453')")
                            tests_failed += 1
                            return
                        print(f"✓ Strandgaten 222 has kontaktTlf='92072453'")
                        
                        # Check annonsor.kontakter[0].telefon='92072453'
                        kontakter = annonsor.get("kontakter", [])
                        if not kontakter:
                            print(f"❌ T1 FAILED: Strandgaten 222 annonsor.kontakter is empty")
                            tests_failed += 1
                            return
                        
                        if kontakter[0].get("telefon") != "92072453":
                            print(f"❌ T1 FAILED: Strandgaten 222 annonsor.kontakter[0].telefon='{kontakter[0].get('telefon')}' (expected '92072453')")
                            tests_failed += 1
                            return
                        print(f"✓ Strandgaten 222 has annonsor.kontakter[0].telefon='92072453'")
                        
                        # Find 'Johannes Bruns gate 1' lead
                        johannes_lead = None
                        for lead in leads:
                            if "Johannes Bruns gate 1" in lead.get("adresse", ""):
                                johannes_lead = lead
                                break
                        
                        if not johannes_lead:
                            print("❌ T1 FAILED: Could not find lead with address 'Johannes Bruns gate 1'")
                            tests_failed += 1
                            return
                        
                        print(f"✓ Found lead 'Johannes Bruns gate 1'")
                        
                        # Verify Johannes Bruns gate 1 has correct data
                        annonsor_jb = johannes_lead.get("annonsor", {})
                        kontakt_epost = johannes_lead.get("kontaktEpost", "")
                        
                        # Check type='utleiemegleren'
                        if annonsor_jb.get("type") != "utleiemegleren":
                            print(f"❌ T1 FAILED: Johannes Bruns gate 1 annonsor.type={annonsor_jb.get('type')} (expected 'utleiemegleren')")
                            tests_failed += 1
                            return
                        print(f"✓ Johannes Bruns gate 1 has annonsor.type='utleiemegleren'")
                        
                        # Check kontaktEpost contains 'utleiemegleren.no'
                        if "utleiemegleren.no" not in kontakt_epost:
                            print(f"❌ T1 FAILED: Johannes Bruns gate 1 kontaktEpost='{kontakt_epost}' does not contain 'utleiemegleren.no'")
                            tests_failed += 1
                            return
                        print(f"✓ Johannes Bruns gate 1 has kontaktEpost containing 'utleiemegleren.no'")
                        
                        print("✅ T1 PASSED: All verifications successful")
                        tests_passed += 1
        except Exception as e:
            print(f"❌ T1 FAILED with exception: {e}")
            tests_failed += 1
            import traceback
            traceback.print_exc()
        
        # ═══════════════════════════════════════════════════════════════════
        # T2: POST /api/admin/salgsradar/berik-annonsor - idempotent (all v2)
        # ═══════════════════════════════════════════════════════════════════
        print()
        print("─" * 80)
        print("T2: POST /api/admin/salgsradar/berik-annonsor - verify idempotency")
        print("─" * 80)
        try:
            async with session.post(
                f"{BASE_URL}/admin/salgsradar/berik-annonsor",
                params={"key": ADMIN_KEY}
            ) as resp:
                if resp.status != 200:
                    print(f"❌ T2 FAILED: Expected 200, got {resp.status}")
                    tests_failed += 1
                else:
                    data = await resp.json()
                    if not data.get("ok"):
                        print(f"❌ T2 FAILED: Response not ok: {data}")
                        tests_failed += 1
                    else:
                        sjekket = data.get("sjekket", -1)
                        oppdatert = data.get("oppdatert", -1)
                        feilet = data.get("feilet", -1)
                        
                        print(f"✓ POST /admin/salgsradar/berik-annonsor returned 200")
                        print(f"  Response: {data}")
                        
                        # Verify all counts are 0 (all already v2, no external FINN calls)
                        if sjekket != 0:
                            print(f"❌ T2 FAILED: sjekket={sjekket} (expected 0, all leads already v2)")
                            tests_failed += 1
                        elif oppdatert != 0:
                            print(f"❌ T2 FAILED: oppdatert={oppdatert} (expected 0, all leads already v2)")
                            tests_failed += 1
                        elif feilet != 0:
                            print(f"❌ T2 FAILED: feilet={feilet} (expected 0, all leads already v2)")
                            tests_failed += 1
                        else:
                            print(f"✓ All counts are 0 (sjekket=0, oppdatert=0, feilet=0)")
                            print(f"✓ Idempotency verified: all leads already v2, no external FINN calls made")
                            print("✅ T2 PASSED")
                            tests_passed += 1
        except Exception as e:
            print(f"❌ T2 FAILED with exception: {e}")
            tests_failed += 1
            import traceback
            traceback.print_exc()
        
        # ═══════════════════════════════════════════════════════════════════
        # T3: GET /api/admin/salgsradar/meg - regression test
        # ═══════════════════════════════════════════════════════════════════
        print()
        print("─" * 80)
        print("T3: GET /api/admin/salgsradar/meg - regression test")
        print("─" * 80)
        try:
            async with session.get(
                f"{BASE_URL}/admin/salgsradar/meg",
                params={"key": ADMIN_KEY}
            ) as resp:
                if resp.status != 200:
                    print(f"❌ T3 FAILED: Expected 200, got {resp.status}")
                    tests_failed += 1
                else:
                    data = await resp.json()
                    if not data.get("ok"):
                        print(f"❌ T3 FAILED: Response not ok: {data}")
                        tests_failed += 1
                    else:
                        aktor = data.get("aktor", {})
                        er_leder = aktor.get("erLeder", False)
                        
                        print(f"✓ GET /admin/salgsradar/meg returned 200")
                        print(f"  Aktor: {aktor.get('navn', 'N/A')}")
                        
                        if not er_leder:
                            print(f"❌ T3 FAILED: aktor.erLeder={er_leder} (expected true)")
                            tests_failed += 1
                        else:
                            print(f"✓ aktor.erLeder=true")
                            print("✅ T3 PASSED: Regression test successful")
                            tests_passed += 1
        except Exception as e:
            print(f"❌ T3 FAILED with exception: {e}")
            tests_failed += 1
            import traceback
            traceback.print_exc()
        
        # ═══════════════════════════════════════════════════════════════════
        # SUMMARY
        # ═══════════════════════════════════════════════════════════════════
        print()
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Tests passed: {tests_passed}/3")
        print(f"Tests failed: {tests_failed}/3")
        
        if tests_failed == 0:
            print()
            print("✅ ALL 3 TESTS PASSED (100% success rate)")
            print()
            print("ANNONSØR-PARSER V2 WORKING PERFECTLY:")
            print("  • All leads have annonsor.v=2 (parser version 2)")
            print("  • Strandgaten 222 (private): type='privat', kontaktTlf='92072453',")
            print("    annonsor.kontakter[0].telefon='92072453' (private phone from serialized data)")
            print("  • Johannes Bruns gate 1: type='utleiemegleren', kontaktEpost contains")
            print("    'utleiemegleren.no' (company profile data)")
            print("  • berik-annonsor idempotent: sjekket=0, oppdatert=0, feilet=0")
            print("    (all already v2, no external FINN calls)")
            print("  • Regression: /meg endpoint returns aktor.erLeder=true")
            print()
            print("CRITICAL SAFETY RULES FOLLOWED:")
            print("  • ONLY reading + ONE idempotent POST (no modifications)")
            print("  • Did NOT modify the 3 real leads")
            print("  • Did NOT call /hent (external FINN API)")
            print()
            return 0
        else:
            print()
            print(f"❌ {tests_failed} TEST(S) FAILED")
            print()
            return 1

if __name__ == "__main__":
    exit_code = asyncio.run(test_annonsor_v2())
    sys.exit(exit_code)
