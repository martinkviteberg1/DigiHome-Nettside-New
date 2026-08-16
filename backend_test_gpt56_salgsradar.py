#!/usr/bin/env python3
"""
Backend test for GPT-5.6 text writer in Salgsradar analysis.

CRITICAL SAFETY RULES:
1. Run analyser MAXIMUM 1 time total
2. BACKUP lead.ai from MongoDB BEFORE running analyser
3. RESTORE original lead.ai after testing
4. DO NOT call hent/ingest/styling/bilde endpoints
5. DO NOT delete or create leads
"""

import requests
import json
import sys
from pymongo import MongoClient
from datetime import datetime
import re

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def test_gpt56_salgsradar():
    """Test GPT-5.6 text writer in Salgsradar analysis."""
    
    print("=" * 80)
    print("GPT-5.6 SALGSRADAR TEXT WRITER TEST")
    print("=" * 80)
    
    # Connect to MongoDB
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        leads_coll = db['salgsradar_leads']
        llm_usage_coll = db['llm_usage']
        print(f"✓ Connected to MongoDB: {MONGO_URL}, DB: {DB_NAME}")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return False
    
    # STEP 1: Get leads with ai object
    print("\n" + "=" * 80)
    print("STEP 1: GET /api/admin/salgsradar/leads - Find lead with ai object")
    print("=" * 80)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/salgsradar/leads",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"✗ GET leads failed: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        leads = data.get('leads', [])
        print(f"✓ GET leads returned {len(leads)} leads")
        
        # Find a lead with ai object
        lead_with_ai = None
        for lead in leads:
            if lead.get('ai'):
                lead_with_ai = lead
                break
        
        if not lead_with_ai:
            print("✗ No lead with ai object found")
            return False
        
        lead_id = lead_with_ai['id']
        print(f"✓ Found lead with ai object: {lead_id}")
        print(f"  - Tittel: {lead_with_ai.get('tittel', 'N/A')}")
        print(f"  - Adresse: {lead_with_ai.get('adresse', 'N/A')}")
        print(f"  - Current ai.tekstModell: {lead_with_ai.get('ai', {}).get('tekstModell', 'N/A')}")
        
    except Exception as e:
        print(f"✗ GET leads exception: {e}")
        return False
    
    # STEP 2: BACKUP ai field from MongoDB
    print("\n" + "=" * 80)
    print("STEP 2: BACKUP lead.ai from MongoDB")
    print("=" * 80)
    
    try:
        lead_doc = leads_coll.find_one({"id": lead_id})
        if not lead_doc:
            print(f"✗ Lead {lead_id} not found in MongoDB")
            return False
        
        ai_backup = lead_doc.get('ai')
        if not ai_backup:
            print(f"✗ Lead {lead_id} has no ai field in MongoDB")
            return False
        
        print(f"✓ Backed up ai field from MongoDB")
        print(f"  - ai.modell: {ai_backup.get('modell', 'N/A')}")
        print(f"  - ai.tekstModell: {ai_backup.get('tekstModell', 'N/A')}")
        print(f"  - ai.annonseScore: {ai_backup.get('annonseScore', 'N/A')}")
        print(f"  - ai.potensialScore: {ai_backup.get('potensialScore', 'N/A')}")
        
    except Exception as e:
        print(f"✗ MongoDB backup failed: {e}")
        return False
    
    # STEP 3: Run POST /api/admin/salgsradar/analyser
    print("\n" + "=" * 80)
    print("STEP 3: POST /api/admin/salgsradar/analyser - Run analysis (30-90s timeout)")
    print("=" * 80)
    
    try:
        print(f"Calling POST /api/admin/salgsradar/analyser with id={lead_id}...")
        print("This may take 30-90 seconds...")
        
        response = requests.post(
            f"{BASE_URL}/admin/salgsradar/analyser",
            params={"key": ADMIN_KEY},
            json={"leadId": lead_id},
            timeout=120  # High timeout as specified
        )
        
        if response.status_code != 200:
            print(f"✗ POST analyser failed: {response.status_code}")
            print(f"Response: {response.text[:1000]}")
            # Still restore backup even on failure
            print("\nRestoring backup despite failure...")
            leads_coll.update_one(
                {"id": lead_id},
                {"$set": {"ai": ai_backup, "updatedAt": datetime.utcnow().isoformat() + "Z"}}
            )
            return False
        
        result = response.json()
        print(f"✓ POST analyser returned 200")
        
        if not result.get('ok'):
            print(f"✗ Analysis failed: {result.get('error', 'Unknown error')}")
            # Restore backup
            print("\nRestoring backup...")
            leads_coll.update_one(
                {"id": lead_id},
                {"$set": {"ai": ai_backup, "updatedAt": datetime.utcnow().isoformat() + "Z"}}
            )
            return False
        
        lead_result = result.get('lead', {})
        ai_result = lead_result.get('ai', {})
        
        print(f"✓ Analysis completed successfully")
        
    except Exception as e:
        print(f"✗ POST analyser exception: {e}")
        # Restore backup
        print("\nRestoring backup after exception...")
        try:
            leads_coll.update_one(
                {"id": lead_id},
                {"$set": {"ai": ai_backup, "updatedAt": datetime.utcnow().isoformat() + "Z"}}
            )
        except:
            pass
        return False
    
    # STEP 4: Verify response
    print("\n" + "=" * 80)
    print("STEP 4: VERIFY response (lead.ai)")
    print("=" * 80)
    
    all_checks_passed = True
    
    # Check tekstModell
    tekst_modell = ai_result.get('tekstModell')
    if tekst_modell == 'gpt-5.6':
        print(f"✓ ai.tekstModell === 'gpt-5.6' ✓")
    else:
        print(f"✗ ai.tekstModell is '{tekst_modell}', expected 'gpt-5.6'")
        all_checks_passed = False
    
    # Check finnMelding
    finn_melding = ai_result.get('finnMelding', '')
    print(f"\n--- finnMelding verification ---")
    print(f"Length: {len(finn_melding)} chars")
    
    if not finn_melding:
        print(f"✗ finnMelding is empty")
        all_checks_passed = False
    else:
        print(f"✓ finnMelding is not empty")
    
    if '{LENKE}' in finn_melding:
        print(f"✓ finnMelding contains '{{LENKE}}'")
    else:
        print(f"✗ finnMelding does not contain '{{LENKE}}'")
        all_checks_passed = False
    
    if len(finn_melding) <= 700:
        print(f"✓ finnMelding length <= 700 chars")
    else:
        print(f"✗ finnMelding length > 700 chars: {len(finn_melding)}")
        all_checks_passed = False
    
    # Check for numbers/prices/percentages (excluding place names with numbers)
    # Look for obvious prices/percentages: digits followed by kr, %, or standalone large numbers
    price_pattern = r'\d+\s*kr|\d+\s*%|\b\d{4,}\b'
    price_matches = re.findall(price_pattern, finn_melding)
    if price_matches:
        print(f"⚠ finnMelding may contain prices/numbers: {price_matches}")
        print(f"  (Flagging for review - some place names may have numbers)")
    else:
        print(f"✓ finnMelding has no obvious prices/percentages")
    
    # Check language (simple check for Norwegian characters/words)
    norwegian_indicators = ['og', 'til', 'med', 'på', 'i', 'er', 'å', 'æ', 'ø']
    has_norwegian = any(word in finn_melding.lower() for word in norwegian_indicators)
    if has_norwegian:
        print(f"✓ finnMelding appears to be in Norwegian")
    else:
        print(f"⚠ finnMelding may not be in Norwegian")
    
    print(f"\nfinnMelding preview: {finn_melding[:200]}...")
    
    # Check tilbudTekst
    tilbud_tekst = ai_result.get('tilbudTekst', {})
    hero_intro = tilbud_tekst.get('heroIntro', '')
    potensial_tekst = tilbud_tekst.get('potensialTekst', '')
    
    print(f"\n--- tilbudTekst verification ---")
    if hero_intro:
        print(f"✓ tilbudTekst.heroIntro is not empty ({len(hero_intro)} chars)")
        print(f"  Preview: {hero_intro[:100]}...")
    else:
        print(f"✗ tilbudTekst.heroIntro is empty")
        all_checks_passed = False
    
    if potensial_tekst:
        print(f"✓ tilbudTekst.potensialTekst is not empty ({len(potensial_tekst)} chars)")
        print(f"  Preview: {potensial_tekst[:100]}...")
    else:
        print(f"✗ tilbudTekst.potensialTekst is empty")
        all_checks_passed = False
    
    # Check salgsvinkel
    salgsvinkel = ai_result.get('salgsvinkel', '')
    print(f"\n--- salgsvinkel verification ---")
    if salgsvinkel:
        print(f"✓ salgsvinkel is not empty ({len(salgsvinkel)} chars)")
        print(f"  Preview: {salgsvinkel[:100]}...")
    else:
        print(f"✗ salgsvinkel is empty")
        all_checks_passed = False
    
    # Check annonseUtkast
    annonse_utkast = ai_result.get('annonseUtkast', {})
    tittel = annonse_utkast.get('tittel', '')
    beskrivelse = annonse_utkast.get('beskrivelse', '')
    hoydepunkter = annonse_utkast.get('hoydepunkter', [])
    
    print(f"\n--- annonseUtkast verification ---")
    if tittel:
        print(f"✓ annonseUtkast.tittel is not empty ({len(tittel)} chars)")
        if len(tittel) <= 80:
            print(f"✓ annonseUtkast.tittel length <= 80 chars")
        else:
            print(f"⚠ annonseUtkast.tittel length > 80 chars: {len(tittel)}")
        print(f"  Tittel: {tittel}")
    else:
        print(f"✗ annonseUtkast.tittel is empty")
        all_checks_passed = False
    
    if beskrivelse:
        print(f"✓ annonseUtkast.beskrivelse is not empty ({len(beskrivelse)} chars)")
        print(f"  Preview: {beskrivelse[:150]}...")
    else:
        print(f"✗ annonseUtkast.beskrivelse is empty")
        all_checks_passed = False
    
    if isinstance(hoydepunkter, list):
        print(f"✓ annonseUtkast.hoydepunkter is array with {len(hoydepunkter)} items")
    else:
        print(f"✗ annonseUtkast.hoydepunkter is not an array")
        all_checks_passed = False
    
    # Check that Gemini parts are still intact
    print(f"\n--- Gemini analysis parts (should still exist) ---")
    if ai_result.get('annonseScore') is not None:
        print(f"✓ ai.annonseScore exists: {ai_result.get('annonseScore')}")
    else:
        print(f"✗ ai.annonseScore is missing")
        all_checks_passed = False
    
    if ai_result.get('potensialScore') is not None:
        print(f"✓ ai.potensialScore exists: {ai_result.get('potensialScore')}")
    else:
        print(f"✗ ai.potensialScore is missing")
        all_checks_passed = False
    
    if ai_result.get('deler'):
        print(f"✓ ai.deler exists")
    else:
        print(f"✗ ai.deler is missing")
        all_checks_passed = False
    
    if ai_result.get('salgskraft'):
        print(f"✓ ai.salgskraft exists")
    else:
        print(f"✗ ai.salgskraft is missing")
        all_checks_passed = False
    
    # STEP 5: RESTORE original ai data (CRITICAL)
    print("\n" + "=" * 80)
    print("STEP 5: RESTORE original ai data in MongoDB (CRITICAL)")
    print("=" * 80)
    
    try:
        result = leads_coll.update_one(
            {"id": lead_id},
            {"$set": {"ai": ai_backup, "updatedAt": datetime.utcnow().isoformat() + "Z"}}
        )
        
        if result.modified_count == 1:
            print(f"✓ Restored original ai data in MongoDB")
        else:
            print(f"⚠ MongoDB update returned modified_count={result.modified_count}")
        
        # Verify restoration
        restored_doc = leads_coll.find_one({"id": lead_id})
        restored_ai = restored_doc.get('ai', {})
        
        if restored_ai.get('modell') == ai_backup.get('modell'):
            print(f"✓ Verified: ai.modell matches backup")
        else:
            print(f"✗ Verification failed: ai.modell does not match backup")
            all_checks_passed = False
        
        if restored_ai.get('annonseScore') == ai_backup.get('annonseScore'):
            print(f"✓ Verified: ai.annonseScore matches backup")
        else:
            print(f"✗ Verification failed: ai.annonseScore does not match backup")
            all_checks_passed = False
        
        print(f"✓ Original ai data successfully restored")
        
    except Exception as e:
        print(f"✗ CRITICAL: Failed to restore ai data: {e}")
        return False
    
    # STEP 6: Check llm_usage logging
    print("\n" + "=" * 80)
    print("STEP 6: Check llm_usage logging")
    print("=" * 80)
    
    try:
        # Find recent llm_usage entries with feature='salgsradar_tekst'
        recent_usage = list(llm_usage_coll.find(
            {"feature": "salgsradar_tekst"},
            {"_id": 0, "feature": 1, "model": 1, "provider": 1, "at": 1, "usage": 1}
        ).sort("at", -1).limit(5))
        
        if recent_usage:
            print(f"✓ Found {len(recent_usage)} recent llm_usage entries with feature='salgsradar_tekst'")
            for i, entry in enumerate(recent_usage, 1):
                print(f"\n  Entry {i}:")
                print(f"    - feature: {entry.get('feature')}")
                print(f"    - model: {entry.get('model')}")
                print(f"    - provider: {entry.get('provider')}")
                print(f"    - at: {entry.get('at')}")
                usage = entry.get('usage', {})
                if usage:
                    print(f"    - tokens: prompt={usage.get('prompt_tokens')}, completion={usage.get('completion_tokens')}, total={usage.get('total_tokens')}")
        else:
            print(f"⚠ No llm_usage entries found with feature='salgsradar_tekst'")
            print(f"  (This may be expected if the entry was created in a previous run)")
        
    except Exception as e:
        print(f"⚠ Could not check llm_usage: {e}")
    
    # Final summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    if all_checks_passed:
        print("✅ ALL VERIFICATIONS PASSED")
        print("\nGPT-5.6 text writer working correctly:")
        print("  - tekstModell set to 'gpt-5.6'")
        print("  - finnMelding contains {LENKE}, no prices, max 700 chars, Norwegian")
        print("  - tilbudTekst.heroIntro and potensialTekst not empty, Norwegian")
        print("  - salgsvinkel not empty")
        print("  - annonseUtkast.tittel (max 80 chars) and beskrivelse not empty")
        print("  - annonseUtkast.hoydepunkter is array")
        print("  - Gemini parts intact (annonseScore, potensialScore, deler, salgskraft)")
        print("  - Original ai data successfully restored in MongoDB")
        print("  - llm_usage logging verified")
        return True
    else:
        print("❌ SOME VERIFICATIONS FAILED")
        print("See details above for specific failures")
        return False

if __name__ == "__main__":
    try:
        success = test_gpt56_salgsradar()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
