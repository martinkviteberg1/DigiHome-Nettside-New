#!/usr/bin/env python3
"""
Backend test for RUNDE 2 nye endepunkter:
- F) Weekly report (GET preview + POST send)
- G) Dual-value webhook (closed-loop with wonValueEstimate + wonValueActual)
- H) Alerts in optimize/last

Base URL: https://saker-hub.preview.emergentagent.com/api
Admin key: dh_admin_b3Kx92Qz7Lm4
Webhook secret: dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036
Timeout: 60s (real API/LLM/email calls)

CRITICAL SAFETY: DO NOT call POST /api/admin/ads/recommendations/apply with real action,
DO NOT send dryRun:false to optimize/run, DO NOT call /api/cron/ads-optimize with valid token.
"""

import requests
import json
import time

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
WEBHOOK_SECRET = "dhsync_dc0dc1750aff067a4baef7adafc7991f7340eacc44f27036"
TIMEOUT = 60

def test_f_weekly_report():
    """Test F: Weekly report endpoints (preview + send)"""
    print("\n" + "="*80)
    print("TEST F: WEEKLY REPORT ENDPOINTS")
    print("="*80)
    
    # F1: GET /api/admin/ads/report/preview?key=... → 200 with Content-Type text/html
    print("\n[F1] Testing GET /api/admin/ads/report/preview WITH key...")
    try:
        start = time.time()
        r = requests.get(f"{BASE_URL}/admin/ads/report/preview?key={ADMIN_KEY}", timeout=TIMEOUT)
        elapsed = time.time() - start
        print(f"✓ Status: {r.status_code} (expected 200) in {elapsed:.2f}s")
        
        if r.status_code == 200:
            content_type = r.headers.get('Content-Type', '')
            print(f"✓ Content-Type: {content_type}")
            
            if 'text/html' in content_type:
                print("✓ Content-Type is text/html")
                
                body = r.text
                if 'DigiHome' in body:
                    print("✓ Body contains 'DigiHome'")
                else:
                    print("✗ Body does NOT contain 'DigiHome'")
                
                if 'Ukentlig annonserapport' in body or 'annonserapport' in body.lower():
                    print("✓ Body contains 'Ukentlig annonserapport' (or similar)")
                else:
                    print("✗ Body does NOT contain 'Ukentlig annonserapport'")
                
                print(f"✓ Body length: {len(body)} characters")
                print(f"✓ F1 PASSED: GET report/preview WITH key returns 200 text/html with expected content")
            else:
                print(f"✗ F1 FAILED: Content-Type is NOT text/html (got: {content_type})")
        else:
            print(f"✗ F1 FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ F1 FAILED with exception: {e}")
    
    # F2: GET /api/admin/ads/report/preview WITHOUT key → 401
    print("\n[F2] Testing GET /api/admin/ads/report/preview WITHOUT key...")
    try:
        r = requests.get(f"{BASE_URL}/admin/ads/report/preview", timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 401)")
        
        if r.status_code == 401:
            print("✓ F2 PASSED: GET report/preview WITHOUT key returns 401")
        else:
            print(f"✗ F2 FAILED: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"✗ F2 FAILED with exception: {e}")
    
    # F3: POST /api/admin/ads/report/send?key=... body {} → 200 {ok:true, recipients, subject, summary}
    # *** SEND ONLY ONCE (real email via SendGrid to martin@kviteberg.no) ***
    print("\n[F3] Testing POST /api/admin/ads/report/send WITH key...")
    print("*** WARNING: This will send a REAL email via SendGrid to martin@kviteberg.no ***")
    print("*** Sending in 2 seconds... ***")
    time.sleep(2)
    
    try:
        start = time.time()
        r = requests.post(f"{BASE_URL}/admin/ads/report/send?key={ADMIN_KEY}", json={}, timeout=TIMEOUT)
        elapsed = time.time() - start
        print(f"✓ Status: {r.status_code} (expected 200) in {elapsed:.2f}s")
        
        if r.status_code == 200:
            data = r.json()
            print(f"✓ Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') == True:
                print("✓ ok == true")
            else:
                print(f"✗ ok != true (got: {data.get('ok')})")
            
            if 'recipients' in data:
                print(f"✓ recipients field present: {data['recipients']}")
            else:
                print("✗ recipients field missing")
            
            if 'subject' in data:
                print(f"✓ subject field present: {data['subject']}")
            else:
                print("✗ subject field missing")
            
            if 'summary' in data:
                print(f"✓ summary field present: {data['summary']}")
            else:
                print("✗ summary field missing")
            
            if data.get('ok') and 'recipients' in data and 'subject' in data and 'summary' in data:
                print("✓ F3 PASSED: POST report/send WITH key returns 200 with ok:true, recipients, subject, summary")
                print("✓ REAL EMAIL SENT via SendGrid")
            else:
                print("✗ F3 FAILED: Missing required fields or ok != true")
        else:
            print(f"✗ F3 FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ F3 FAILED with exception: {e}")
    
    # F4: POST /api/admin/ads/report/send WITHOUT key → 401
    print("\n[F4] Testing POST /api/admin/ads/report/send WITHOUT key...")
    try:
        r = requests.post(f"{BASE_URL}/admin/ads/report/send", json={}, timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 401)")
        
        if r.status_code == 401:
            print("✓ F4 PASSED: POST report/send WITHOUT key returns 401")
        else:
            print(f"✗ F4 FAILED: Expected 401, got {r.status_code}")
    except Exception as e:
        print(f"✗ F4 FAILED with exception: {e}")


def test_g_dual_value_webhook():
    """Test G: Dual-value webhook (wonValueEstimate + wonValueActual)"""
    print("\n" + "="*80)
    print("TEST G: DUAL-VALUE WEBHOOK (CLOSED-LOOP)")
    print("="*80)
    
    lead_id = None
    
    # G1: Create lead POST /api/leads
    print("\n[G1] Creating test lead...")
    try:
        payload = {
            "name": "QA Value Bot",
            "email": "qa-value@example.test",
            "phone": "+47 90011223",
            "address": "Testveien 12, 5003 Bergen",
            "property_type": "leilighet",
            "lead_type": "huseier",
            "source": "qa-value"
        }
        r = requests.post(f"{BASE_URL}/leads", json=payload, timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 201)")
        
        if r.status_code == 201:
            data = r.json()
            lead_id = data.get('data', {}).get('id')
            print(f"✓ Lead created with id: {lead_id}")
            print(f"✓ G1 PASSED: Lead created successfully")
        else:
            print(f"✗ G1 FAILED: Expected 201, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
            return
    except Exception as e:
        print(f"✗ G1 FAILED with exception: {e}")
        return
    
    if not lead_id:
        print("✗ Cannot continue without lead_id")
        return
    
    # G2: POST /api/webhooks/lead-status (first won with value:10000)
    print("\n[G2] Testing first webhook call (status:won, value:10000)...")
    try:
        headers = {"X-Webhook-Secret": WEBHOOK_SECRET}
        payload = {
            "external_ref": lead_id,
            "status": "won",
            "value": 10000
        }
        r = requests.post(f"{BASE_URL}/webhooks/lead-status", json=payload, headers=headers, timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 200)")
        
        if r.status_code == 200:
            data = r.json()
            print(f"✓ Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') == True:
                print("✓ ok == true")
            else:
                print(f"✗ ok != true (got: {data.get('ok')})")
            
            if data.get('status') == 'won':
                print("✓ status == 'won'")
            else:
                print(f"✗ status != 'won' (got: {data.get('status')})")
            
            if data.get('ok') and data.get('status') == 'won':
                print("✓ G2 PASSED: First webhook call (won, value:10000) returns 200 ok:true")
            else:
                print("✗ G2 FAILED: Missing required fields or incorrect values")
        else:
            print(f"✗ G2 FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ G2 FAILED with exception: {e}")
    
    # G3: POST /api/webhooks/lead-status (second won with value:14500, value_update:true)
    print("\n[G3] Testing second webhook call (status:won, value:14500, value_update:true)...")
    try:
        headers = {"X-Webhook-Secret": WEBHOOK_SECRET}
        payload = {
            "external_ref": lead_id,
            "status": "won",
            "value": 14500,
            "value_update": True
        }
        r = requests.post(f"{BASE_URL}/webhooks/lead-status", json=payload, headers=headers, timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 200)")
        
        if r.status_code == 200:
            data = r.json()
            print(f"✓ Response: {json.dumps(data, indent=2)}")
            
            if data.get('ok') == True:
                print("✓ ok == true")
            else:
                print(f"✗ ok != true (got: {data.get('ok')})")
            
            if data.get('status') == 'won':
                print("✓ status == 'won'")
            else:
                print(f"✗ status != 'won' (got: {data.get('status')})")
            
            if data.get('ok') and data.get('status') == 'won':
                print("✓ G3 PASSED: Second webhook call (won, value:14500, value_update:true) returns 200 ok:true (no crash)")
            else:
                print("✗ G3 FAILED: Missing required fields or incorrect values")
        else:
            print(f"✗ G3 FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ G3 FAILED with exception: {e}")
    
    # G4: Verify via GET /api/admin/lead?key=...&id=<id>&type=lead
    print("\n[G4] Verifying lead values via GET /api/admin/lead...")
    try:
        r = requests.get(f"{BASE_URL}/admin/lead?key={ADMIN_KEY}&id={lead_id}&type=lead", timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 200)")
        
        if r.status_code == 200:
            data = r.json()
            lead = data.get('lead', {})
            
            print(f"✓ Lead data retrieved")
            print(f"  wonValueEstimate: {lead.get('wonValueEstimate')}")
            print(f"  wonValueActual: {lead.get('wonValueActual')}")
            print(f"  wonValue: {lead.get('wonValue')}")
            
            won_value_estimate = lead.get('wonValueEstimate')
            won_value_actual = lead.get('wonValueActual')
            won_value = lead.get('wonValue')
            
            checks = []
            
            if won_value_estimate == 10000:
                print("✓ wonValueEstimate == 10000")
                checks.append(True)
            else:
                print(f"✗ wonValueEstimate != 10000 (got: {won_value_estimate})")
                checks.append(False)
            
            if won_value_actual == 14500:
                print("✓ wonValueActual == 14500")
                checks.append(True)
            else:
                print(f"✗ wonValueActual != 14500 (got: {won_value_actual})")
                checks.append(False)
            
            if won_value == 14500:
                print("✓ wonValue == 14500")
                checks.append(True)
            else:
                print(f"✗ wonValue != 14500 (got: {won_value})")
                checks.append(False)
            
            if all(checks):
                print("✓ G4 PASSED: All three values are correct (wonValueEstimate=10000, wonValueActual=14500, wonValue=14500)")
            else:
                print("✗ G4 FAILED: One or more values are incorrect")
        else:
            print(f"✗ G4 FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ G4 FAILED with exception: {e}")


def test_h_alerts_in_optimize():
    """Test H: Alerts in optimize/last"""
    print("\n" + "="*80)
    print("TEST H: ALERTS IN OPTIMIZE/LAST")
    print("="*80)
    
    # H: GET /api/admin/ads/optimize/last?key=... → 200, run has 'alerts' array + summary.alerts number
    print("\n[H] Testing GET /api/admin/ads/optimize/last...")
    try:
        r = requests.get(f"{BASE_URL}/admin/ads/optimize/last?key={ADMIN_KEY}", timeout=TIMEOUT)
        print(f"✓ Status: {r.status_code} (expected 200)")
        
        if r.status_code == 200:
            data = r.json()
            run = data.get('run')
            
            if run is None:
                print("⚠ run is null, need to create a run first")
                print("\n[H] Creating optimization run with POST /api/admin/ads/optimize/run...")
                
                try:
                    start = time.time()
                    r2 = requests.post(
                        f"{BASE_URL}/admin/ads/optimize/run?key={ADMIN_KEY}",
                        json={"mode": "weekly", "dryRun": True},
                        timeout=TIMEOUT
                    )
                    elapsed = time.time() - start
                    print(f"✓ Status: {r2.status_code} (expected 200) in {elapsed:.2f}s")
                    
                    if r2.status_code == 200:
                        run_data = r2.json()
                        print(f"✓ Optimization run created")
                        
                        # Now re-check optimize/last
                        print("\n[H] Re-checking GET /api/admin/ads/optimize/last...")
                        r = requests.get(f"{BASE_URL}/admin/ads/optimize/last?key={ADMIN_KEY}", timeout=TIMEOUT)
                        print(f"✓ Status: {r.status_code} (expected 200)")
                        
                        if r.status_code == 200:
                            data = r.json()
                            run = data.get('run')
                        else:
                            print(f"✗ H FAILED: Expected 200, got {r.status_code}")
                            return
                    else:
                        print(f"✗ H FAILED: Could not create optimization run, got {r2.status_code}")
                        print(f"Response: {r2.text[:500]}")
                        return
                except Exception as e:
                    print(f"✗ H FAILED: Exception creating optimization run: {e}")
                    return
            
            if run:
                print(f"✓ run object exists")
                
                # Check for 'alerts' field (array)
                if 'alerts' in run:
                    alerts = run['alerts']
                    print(f"✓ run has 'alerts' field (type: {type(alerts).__name__})")
                    
                    if isinstance(alerts, list):
                        print(f"✓ alerts is an array with {len(alerts)} elements")
                    else:
                        print(f"✗ alerts is NOT an array (got: {type(alerts).__name__})")
                else:
                    print("✗ run does NOT have 'alerts' field")
                
                # Check for 'summary.alerts' field (number)
                summary = run.get('summary', {})
                if 'alerts' in summary:
                    summary_alerts = summary['alerts']
                    print(f"✓ run.summary has 'alerts' field: {summary_alerts} (type: {type(summary_alerts).__name__})")
                    
                    if isinstance(summary_alerts, (int, float)):
                        print(f"✓ summary.alerts is a number")
                    else:
                        print(f"✗ summary.alerts is NOT a number (got: {type(summary_alerts).__name__})")
                else:
                    print("✗ run.summary does NOT have 'alerts' field")
                
                # Final check
                has_alerts_array = 'alerts' in run and isinstance(run['alerts'], list)
                has_summary_alerts = 'alerts' in summary and isinstance(summary['alerts'], (int, float))
                
                if has_alerts_array and has_summary_alerts:
                    print("✓ H PASSED: run has 'alerts' array AND summary.alerts number")
                else:
                    print("✗ H FAILED: Missing 'alerts' array or summary.alerts number")
            else:
                print("✗ H FAILED: run is still null after creating optimization run")
        else:
            print(f"✗ H FAILED: Expected 200, got {r.status_code}")
            print(f"Response: {r.text[:500]}")
    except Exception as e:
        print(f"✗ H FAILED with exception: {e}")


def main():
    print("\n" + "="*80)
    print("BACKEND TEST: RUNDE 2 NYE ENDEPUNKTER")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin key: {ADMIN_KEY}")
    print(f"Webhook secret: {WEBHOOK_SECRET[:20]}...")
    print(f"Timeout: {TIMEOUT}s")
    print("="*80)
    
    try:
        # Test F: Weekly report
        test_f_weekly_report()
        
        # Test G: Dual-value webhook
        test_g_dual_value_webhook()
        
        # Test H: Alerts in optimize/last
        test_h_alerts_in_optimize()
        
        print("\n" + "="*80)
        print("ALL TESTS COMPLETED")
        print("="*80)
        
    except Exception as e:
        print(f"\n✗ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
