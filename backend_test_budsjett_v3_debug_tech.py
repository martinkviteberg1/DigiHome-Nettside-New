#!/usr/bin/env python3
"""
Debug tech plan response
"""

import requests
import json

BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"

# First create a DH plan to link to
dh_plan_body = {
    "navn": "QA v3 Debug DH",
    "selskap": "digihome",
    "type": "modell",
    "startYm": "2026-08",
    "antallMnd": 36,
    "drivere": {"nyePerMnd": 2}
}

print("Creating DH plan...")
resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=dh_plan_body)
dh_id = resp.json().get("id")
print(f"DH plan id: {dh_id}")

# Create a tech plan
tech_plan_body = {
    "navn": "QA v3 Debug Tech",
    "selskap": "tech",
    "startYm": "2026-08",
    "antallMnd": 36,
    "kobletPlanId": dh_id,
    "tech": {
        "huseier": {
            "modus": "kunder",
            "kunderPlan": [
                {"fraMnd": 1, "nyePerMnd": 2},
                {"fraMnd": 13, "nyePerMnd": 5.5}
            ],
            "organiskPerMnd": 0
        },
        "kostTrinn": {
            "utviklingFast": [
                {"fraMnd": 6, "belop": 35000}
            ]
        },
        "grunnleggere": {
            "paa": True,
            "paslagPct": 35,
            "personer": [
                {
                    "navn": "Martin",
                    "rolle": "rd",
                    "andelPct": 80,
                    "trinn": [
                        {"fraMnd": 1, "brutto": 30000}
                    ]
                }
            ]
        }
    }
}

print("\nCreating Tech plan...")
resp = requests.put(f"{BASE_URL}/admin/budsjett/plan?key={ADMIN_KEY}", json=tech_plan_body)
print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Response: {json.dumps(data, indent=2)}")

tech_id = data.get("id")

if tech_id:
    print(f"\nGetting tech plan {tech_id}...")
    resp = requests.get(f"{BASE_URL}/admin/budsjett/plan?id={tech_id}&key={ADMIN_KEY}")
    print(f"Status: {resp.status_code}")
    result = resp.json()
    
    print("\n=== FULL TECH PLAN RESPONSE ===")
    print(json.dumps(result, indent=2)[:3000])  # First 3000 chars
    
    plan = result.get("plan", {})
    tech = plan.get("tech", {})
    
    print("\n=== TECH SECTION ===")
    print(json.dumps(tech, indent=2))
    
    # Cleanup
    print(f"\nDeleting plans...")
    requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={tech_id}&key={ADMIN_KEY}")
    requests.delete(f"{BASE_URL}/admin/budsjett/plan?id={dh_id}&key={ADMIN_KEY}")
    print("Deleted")
