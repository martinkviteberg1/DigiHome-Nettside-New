#!/usr/bin/env python3
"""
Debug test to see what's actually being returned
"""

import requests
import json

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# Create a simple DH plan with new fields
dh_plan_body = {
    "navn": "QA v3 Debug",
    "selskap": "digihome",
    "type": "modell",
    "startYm": "2026-08",
    "antallMnd": 36,
    "drivere": {
        "nyePerMnd": 2,
        "organiskAndelPct": 30,
        "kostTrinn": {
            "adminFast": [
                {"fraMnd": 6, "belop": 13000}
            ]
        },
        "grunnleggere": {
            "paa": True,
            "paslagPct": 35,
            "personer": [
                {
                    "navn": "Sarah",
                    "rolle": "drift",
                    "andelPct": 70,
                    "trinn": [
                        {"fraMnd": 3, "brutto": 30000}
                    ]
                }
            ]
        },
        "skatt": {
            "paa": True,
            "satsPct": 22,
            "konsernbidrag": True
        }
    }
}

print("Creating DH plan...")
resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=dh_plan_body)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Response: {json.dumps(data, indent=2)}")

plan_id = data.get("id")

if plan_id:
    print(f"\nGetting plan {plan_id}...")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    plan = resp.json()
    
    print("\n=== FULL PLAN RESPONSE ===")
    print(json.dumps(plan, indent=2))
    
    print("\n=== DRIVERE SECTION ===")
    drivere = plan.get("drivere", {})
    print(json.dumps(drivere, indent=2))
    
    # Cleanup
    print(f"\nDeleting plan {plan_id}...")
    requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={plan_id}&key={ADMIN_KEY}")
    print("Deleted")
