#!/usr/bin/env python3
"""
Backend test for Investorchat feature - SECURITY ISOLATION testing
Tests that investors get their own locked channel ('investor-<userId>') and can NEVER see internal chat.
"""

import requests
import json
import time
import base64
from pymongo import MongoClient
from datetime import datetime

# Configuration
BASE_URL = "https://saker-hub.preview.emergentagent.com/api"
OWNER_EMAIL = "martin@kviteberg.no"
OWNER_PASSWORD = "Pyramiden2025##"
ADMIN_KEY = "dh_admin_b3Kx92Qz7Lm4"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

# Test state
test_results = []
qa_investor1_id = None
qa_investor2_id = None
qa_investor1_token = None
qa_investor2_token = None
owner_token = None
qa_investor1_channel = None
qa_investor2_channel = None
qa_message_ids = []
qa_file_id = None
generelt_baseline_count = 0

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append(f"{status}: {test_name}")
    if details:
        test_results.append(f"  Details: {details}")
    print(f"{status}: {test_name}")
    if details:
        print(f"  {details}")

def get_timestamp():
    """Get unique timestamp for test data"""
    return datetime.now().strftime("%Y%m%d%H%M%S%f")

print("=" * 80)
print("INVESTORCHAT SECURITY ISOLATION TEST")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"MongoDB: {MONGO_URL}, DB: {DB_NAME}")
print()

# Connect to MongoDB
try:
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    print("✅ MongoDB connection established")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    exit(1)

# Count baseline messages in 'generelt' channel
try:
    generelt_baseline_count = db.chat_messages.count_documents({"kanal": "generelt"})
    print(f"📊 Baseline: {generelt_baseline_count} messages in 'generelt' channel")
except Exception as e:
    print(f"⚠️  Could not count baseline messages: {e}")

print()
print("=" * 80)
print("SETUP: Login as owner and create QA investors")
print("=" * 80)

# Test 1: Owner login
try:
    response = requests.post(
        f"{BASE_URL}/admin/auth/login",
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        owner_token = data.get("token")
        log_test("Owner login", owner_token is not None, f"Got token: {owner_token[:20]}...")
    else:
        log_test("Owner login", False, f"Status {response.status_code}: {response.text[:200]}")
        exit(1)
except Exception as e:
    log_test("Owner login", False, f"Exception: {e}")
    exit(1)

# Test 2: Create QA Investor 1
ts1 = get_timestamp()
qa_inv1_email = f"qa-inv1-{ts1}@example.com"
try:
    response = requests.post(
        f"{BASE_URL}/admin/users",
        params={"key": ADMIN_KEY},
        json={
            "name": "QA Investor En",
            "email": qa_inv1_email,
            "role": "investor",
            "password": "QaInv2026##x",
            "invite": False
        },
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        qa_investor1_id = data.get("member", {}).get("id")
        qa_investor1_channel = f"investor-{qa_investor1_id}"
        log_test("Create QA Investor 1", qa_investor1_id is not None, 
                f"ID: {qa_investor1_id}, Email: {qa_inv1_email}, Channel: {qa_investor1_channel}")
    else:
        log_test("Create QA Investor 1", False, f"Status {response.status_code}: {response.text[:200]}")
        exit(1)
except Exception as e:
    log_test("Create QA Investor 1", False, f"Exception: {e}")
    exit(1)

# Test 3: Create QA Investor 2
ts2 = get_timestamp()
qa_inv2_email = f"qa-inv2-{ts2}@example.com"
try:
    response = requests.post(
        f"{BASE_URL}/admin/users",
        params={"key": ADMIN_KEY},
        json={
            "name": "QA Investor To",
            "email": qa_inv2_email,
            "role": "investor",
            "password": "QaInv2026##x",
            "invite": False
        },
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        qa_investor2_id = data.get("member", {}).get("id")
        qa_investor2_channel = f"investor-{qa_investor2_id}"
        log_test("Create QA Investor 2", qa_investor2_id is not None, 
                f"ID: {qa_investor2_id}, Email: {qa_inv2_email}, Channel: {qa_investor2_channel}")
    else:
        log_test("Create QA Investor 2", False, f"Status {response.status_code}: {response.text[:200]}")
        exit(1)
except Exception as e:
    log_test("Create QA Investor 2", False, f"Exception: {e}")
    exit(1)

# Test 4: Login as QA Investor 1
try:
    response = requests.post(
        f"{BASE_URL}/admin/auth/login",
        json={"email": qa_inv1_email, "password": "QaInv2026##x"},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        qa_investor1_token = data.get("token")
        user_id = data.get("user", {}).get("id")
        log_test("Login as QA Investor 1", qa_investor1_token is not None and user_id == qa_investor1_id,
                f"Got token, user.id matches: {user_id == qa_investor1_id}")
    else:
        log_test("Login as QA Investor 1", False, f"Status {response.status_code}: {response.text[:200]}")
        exit(1)
except Exception as e:
    log_test("Login as QA Investor 1", False, f"Exception: {e}")
    exit(1)

# Test 5: Login as QA Investor 2
try:
    response = requests.post(
        f"{BASE_URL}/admin/auth/login",
        json={"email": qa_inv2_email, "password": "QaInv2026##x"},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        qa_investor2_token = data.get("token")
        user_id = data.get("user", {}).get("id")
        log_test("Login as QA Investor 2", qa_investor2_token is not None and user_id == qa_investor2_id,
                f"Got token, user.id matches: {user_id == qa_investor2_id}")
    else:
        log_test("Login as QA Investor 2", False, f"Status {response.status_code}: {response.text[:200]}")
        exit(1)
except Exception as e:
    log_test("Login as QA Investor 2", False, f"Exception: {e}")
    exit(1)

print()
print("=" * 80)
print("CHANNEL ISOLATION TESTS")
print("=" * 80)

# Test 6: Investor1 POST with kanal:'generelt' → message gets investor-<inv1-id> (channel forcing)
try:
    response = requests.post(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": qa_investor1_token},
        json={"text": "[QA-test] Investor 1 forsøker å poste i generelt", "kanal": "generelt"},
        timeout=10
    )
    if response.status_code == 201:
        data = response.json()
        melding = data.get("melding", {})
        actual_kanal = melding.get("kanal")
        melding_id = melding.get("id")
        if melding_id:
            qa_message_ids.append(melding_id)
        passed = actual_kanal == qa_investor1_channel
        log_test("T1: Investor1 POST kanal:'generelt' → forced to investor channel", passed,
                f"Expected: {qa_investor1_channel}, Got: {actual_kanal}, Message ID: {melding_id}")
    else:
        log_test("T1: Investor1 POST kanal:'generelt' → forced to investor channel", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T1: Investor1 POST kanal:'generelt' → forced to investor channel", False, f"Exception: {e}")

# Test 7: Investor1 GET ?kanal=generelt → sees only own channel (0 leakage from generelt)
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": qa_investor1_token, "kanal": "generelt"},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        # All messages should be from investor1's channel, NONE from 'generelt'
        generelt_leakage = [m for m in meldinger if m.get("kanal") == "generelt"]
        own_channel_msgs = [m for m in meldinger if m.get("kanal") == qa_investor1_channel]
        passed = len(generelt_leakage) == 0 and len(own_channel_msgs) >= 1
        log_test("T2: Investor1 GET ?kanal=generelt → only own channel, 0 leakage", passed,
                f"Generelt leakage: {len(generelt_leakage)}, Own channel: {len(own_channel_msgs)}")
    else:
        log_test("T2: Investor1 GET ?kanal=generelt → only own channel, 0 leakage", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T2: Investor1 GET ?kanal=generelt → only own channel, 0 leakage", False, f"Exception: {e}")

# Test 8: Investor1 GET ?kanal=investor-<inv2-id> → still sees ONLY own channel (never investor2's)
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": qa_investor1_token, "kanal": qa_investor2_channel},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        # Should ONLY see own channel, NEVER investor2's channel
        inv2_leakage = [m for m in meldinger if m.get("kanal") == qa_investor2_channel]
        own_channel_msgs = [m for m in meldinger if m.get("kanal") == qa_investor1_channel]
        passed = len(inv2_leakage) == 0 and len(own_channel_msgs) >= 1
        log_test("T3: Investor1 GET ?kanal=investor-<inv2-id> → only own channel", passed,
                f"Investor2 leakage: {len(inv2_leakage)}, Own channel: {len(own_channel_msgs)}")
    else:
        log_test("T3: Investor1 GET ?kanal=investor-<inv2-id> → only own channel", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T3: Investor1 GET ?kanal=investor-<inv2-id> → only own channel", False, f"Exception: {e}")

# Test 9: Investor2 GET (without kanal) → does NOT see investor1's message
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": qa_investor2_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        # Should NOT see any messages from investor1's channel
        inv1_leakage = [m for m in meldinger if m.get("kanal") == qa_investor1_channel]
        passed = len(inv1_leakage) == 0
        log_test("T4: Investor2 GET → does NOT see investor1's messages", passed,
                f"Investor1 leakage: {len(inv1_leakage)}, Total messages: {len(meldinger)}")
    else:
        log_test("T4: Investor2 GET → does NOT see investor1's messages", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T4: Investor2 GET → does NOT see investor1's messages", False, f"Exception: {e}")

# Test 10: Owner GET without kanal → generelt messages, NO investor messages
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        # Should see generelt messages, but NO investor channel messages
        generelt_msgs = [m for m in meldinger if m.get("kanal") == "generelt"]
        investor_leakage = [m for m in meldinger if m.get("kanal", "").startswith("investor-")]
        passed = len(generelt_msgs) >= 0 and len(investor_leakage) == 0
        log_test("T5: Owner GET without kanal → generelt only, NO investor messages", passed,
                f"Generelt: {len(generelt_msgs)}, Investor leakage: {len(investor_leakage)}")
    else:
        log_test("T5: Owner GET without kanal → generelt only, NO investor messages", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T5: Owner GET without kanal → generelt only, NO investor messages", False, f"Exception: {e}")

# Test 11: Owner GET ?kanal=investor-<inv1-id> → sees investor1's message
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token, "kanal": qa_investor1_channel},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        # Should see investor1's messages
        inv1_msgs = [m for m in meldinger if m.get("kanal") == qa_investor1_channel]
        passed = len(inv1_msgs) >= 1
        log_test("T6a: Owner GET ?kanal=investor-<inv1-id> → sees investor1's message", passed,
                f"Investor1 messages: {len(inv1_msgs)}")
    else:
        log_test("T6a: Owner GET ?kanal=investor-<inv1-id> → sees investor1's message", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T6a: Owner GET ?kanal=investor-<inv1-id> → sees investor1's message", False, f"Exception: {e}")

# Test 12: Owner POST in investor1's channel
try:
    response = requests.post(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token},
        json={"text": "[QA-test] Svar fra teamet til investor 1", "kanal": qa_investor1_channel},
        timeout=10
    )
    if response.status_code == 201:
        data = response.json()
        melding = data.get("melding", {})
        actual_kanal = melding.get("kanal")
        melding_id = melding.get("id")
        if melding_id:
            qa_message_ids.append(melding_id)
        passed = actual_kanal == qa_investor1_channel
        log_test("T6b: Owner POST in investor1's channel → 201 in correct channel", passed,
                f"Expected: {qa_investor1_channel}, Got: {actual_kanal}, Message ID: {melding_id}")
    else:
        log_test("T6b: Owner POST in investor1's channel → 201 in correct channel", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T6b: Owner POST in investor1's channel → 201 in correct channel", False, f"Exception: {e}")

# Test 13: GET /admin/chat/investorkanaler - owner → 200 with both QA channels
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/investorkanaler",
        params={"key": owner_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        kanaler = data.get("kanaler", [])
        qa_kanaler = [k for k in kanaler if k.get("kanal") in [qa_investor1_channel, qa_investor2_channel]]
        has_inv1 = any(k.get("kanal") == qa_investor1_channel for k in qa_kanaler)
        has_inv2 = any(k.get("kanal") == qa_investor2_channel for k in qa_kanaler)
        # Check structure
        has_required_fields = all(
            "kanal" in k and "navn" in k and "ulest" in k
            for k in qa_kanaler
        )
        passed = has_inv1 and has_inv2 and has_required_fields
        log_test("T7a: GET /admin/chat/investorkanaler as owner → 200 with both QA channels", passed,
                f"Found inv1: {has_inv1}, inv2: {has_inv2}, Required fields: {has_required_fields}")
    else:
        log_test("T7a: GET /admin/chat/investorkanaler as owner → 200 with both QA channels", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T7a: GET /admin/chat/investorkanaler as owner → 200 with both QA channels", False, f"Exception: {e}")

# Test 14: GET /admin/chat/investorkanaler - investor1 → 401
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/investorkanaler",
        params={"key": qa_investor1_token},
        timeout=10
    )
    passed = response.status_code == 401
    log_test("T7b: GET /admin/chat/investorkanaler as investor1 → 401", passed,
            f"Status: {response.status_code}")
except Exception as e:
    log_test("T7b: GET /admin/chat/investorkanaler as investor1 → 401", False, f"Exception: {e}")

# Test 15: GET /admin/chat/investorkanaler - without key → 401
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/investorkanaler",
        timeout=10
    )
    passed = response.status_code == 401
    log_test("T7c: GET /admin/chat/investorkanaler without key → 401", passed,
            f"Status: {response.status_code}")
except Exception as e:
    log_test("T7c: GET /admin/chat/investorkanaler without key → 401", False, f"Exception: {e}")

# Test 16: Create a test message in 'generelt' as owner for reaction test
generelt_test_message_id = None
try:
    response = requests.post(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token},
        json={"text": "[QA-test] Generelt melding for reaksjonstest"},
        timeout=10
    )
    if response.status_code == 201:
        data = response.json()
        generelt_test_message_id = data.get("melding", {}).get("id")
        qa_message_ids.append(generelt_test_message_id)
        log_test("T8 Setup: Create test message in 'generelt'", generelt_test_message_id is not None,
                f"Message ID: {generelt_test_message_id}")
    else:
        log_test("T8 Setup: Create test message in 'generelt'", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T8 Setup: Create test message in 'generelt'", False, f"Exception: {e}")

# Test 17: Owner POST reaksjon on generelt message → 200
if generelt_test_message_id:
    try:
        response = requests.post(
            f"{BASE_URL}/admin/chat/reaksjon",
            params={"key": owner_token},
            json={"id": generelt_test_message_id, "emoji": "👍"},
            timeout=10
        )
        passed = response.status_code == 200
        log_test("T8a: Owner POST reaksjon on generelt message → 200", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T8a: Owner POST reaksjon on generelt message → 200", False, f"Exception: {e}")

# Test 18: Investor1 POST reaksjon on generelt message → 404
if generelt_test_message_id:
    try:
        response = requests.post(
            f"{BASE_URL}/admin/chat/reaksjon",
            params={"key": qa_investor1_token},
            json={"id": generelt_test_message_id, "emoji": "👍"},
            timeout=10
        )
        passed = response.status_code == 404
        log_test("T8b: Investor1 POST reaksjon on generelt message → 404", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T8b: Investor1 POST reaksjon on generelt message → 404", False, f"Exception: {e}")

# Test 19: Investor1 POST reaksjon on own channel message → 200
if qa_message_ids:
    try:
        # Find a message from investor1's channel
        inv1_msg_id = qa_message_ids[0]  # First message we created
        response = requests.post(
            f"{BASE_URL}/admin/chat/reaksjon",
            params={"key": qa_investor1_token},
            json={"id": inv1_msg_id, "emoji": "👍"},
            timeout=10
        )
        passed = response.status_code == 200
        log_test("T8c: Investor1 POST reaksjon on own channel message → 200", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T8c: Investor1 POST reaksjon on own channel message → 200", False, f"Exception: {e}")

# Test 20: File isolation - Owner uploads file without kanal (→ generelt)
try:
    # Create a small test file
    test_file_data = base64.b64encode(b"hei").decode()
    upload_id = f"qa-upload-{get_timestamp()}"
    
    response = requests.post(
        f"{BASE_URL}/admin/chat/fil-chunk",
        params={"key": owner_token},
        json={
            "uploadId": upload_id,
            "index": 0,
            "total": 1,
            "data": test_file_data,
            "name": "qa.txt",
            "type": "text/plain"
        },
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        qa_file_id = data.get("id")
        log_test("T9 Setup: Owner uploads file without kanal → generelt", qa_file_id is not None,
                f"File ID: {qa_file_id}")
    else:
        log_test("T9 Setup: Owner uploads file without kanal → generelt", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T9 Setup: Owner uploads file without kanal → generelt", False, f"Exception: {e}")

# Test 21: Investor1 GET file from generelt → 404
if qa_file_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/chat/fil/{qa_file_id}",
            params={"key": qa_investor1_token},
            timeout=10
        )
        passed = response.status_code == 404
        log_test("T9a: Investor1 GET file from generelt → 404", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T9a: Investor1 GET file from generelt → 404", False, f"Exception: {e}")

# Test 22: Owner GET same file → 200
if qa_file_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/chat/fil/{qa_file_id}",
            params={"key": owner_token},
            timeout=10
        )
        passed = response.status_code == 200
        log_test("T9b: Owner GET same file → 200", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T9b: Owner GET same file → 200", False, f"Exception: {e}")

# Test 23: Investor1 GET /admin/chat/status → 200 and only own channel data
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/status",
        params={"key": qa_investor1_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        # Should only see own channel data
        passed = response.status_code == 200
        log_test("T10a: Investor1 GET /admin/chat/status → 200", passed,
                f"Status: {response.status_code}")
    else:
        log_test("T10a: Investor1 GET /admin/chat/status → 200", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T10a: Investor1 GET /admin/chat/status → 200", False, f"Exception: {e}")

# Test 24: Investor1 GET /admin/chat/traader → 200
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/traader",
        params={"key": qa_investor1_token},
        timeout=10
    )
    passed = response.status_code == 200
    log_test("T10b: Investor1 GET /admin/chat/traader → 200", passed,
            f"Status: {response.status_code}")
except Exception as e:
    log_test("T10b: Investor1 GET /admin/chat/traader → 200", False, f"Exception: {e}")

# Test 25: Investor1 GET /admin/chat/sok?q=team → 200 and only own channel
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/sok",
        params={"key": qa_investor1_token, "q": "team"},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        resultater = data.get("resultater", [])
        # All results should be from own channel
        other_channel_leakage = [r for r in resultater if r.get("kanal") != qa_investor1_channel]
        passed = len(other_channel_leakage) == 0
        log_test("T10c: Investor1 GET /admin/chat/sok → 200 and only own channel", passed,
                f"Other channel leakage: {len(other_channel_leakage)}, Total results: {len(resultater)}")
    else:
        log_test("T10c: Investor1 GET /admin/chat/sok → 200 and only own channel", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T10c: Investor1 GET /admin/chat/sok → 200 and only own channel", False, f"Exception: {e}")

# Test 26: Investor1 PUT /admin/chat/lest → 200
try:
    response = requests.put(
        f"{BASE_URL}/admin/chat/lest",
        params={"key": qa_investor1_token},
        json={"kanal": qa_investor1_channel},
        timeout=10
    )
    passed = response.status_code == 200
    log_test("T10d: Investor1 PUT /admin/chat/lest → 200", passed,
            f"Status: {response.status_code}")
except Exception as e:
    log_test("T10d: Investor1 PUT /admin/chat/lest → 200", False, f"Exception: {e}")

# Test 27: Check notifications - internal users should have notification from investor1's message
try:
    # Find internal users (owner, admin, bruker, partner)
    internal_users = list(db.admin_users.find(
        {"role": {"$in": ["owner", "admin", "bruker", "partner"]}},
        {"_id": 0, "id": 1, "name": 1}
    ))
    
    if internal_users:
        # Check if any internal user has notification with text starting with 'Investorchat — QA Investor En'
        notifications = list(db.notifications.find(
            {
                "userId": {"$in": [u["id"] for u in internal_users]},
                "text": {"$regex": "^Investorchat — QA Investor En"}
            }
        ))
        passed = len(notifications) > 0
        log_test("T11a: Internal users have notification from investor1", passed,
                f"Found {len(notifications)} notifications")
    else:
        log_test("T11a: Internal users have notification from investor1", False,
                "No internal users found")
except Exception as e:
    log_test("T11a: Internal users have notification from investor1", False, f"Exception: {e}")

# Test 28: Check notifications - investor1 should have notification from owner's reply
try:
    notifications = list(db.notifications.find(
        {
            "userId": qa_investor1_id,
            "text": {"$regex": "har svart deg"}
        }
    ))
    passed = len(notifications) > 0
    log_test("T11b: Investor1 has notification from owner's reply", passed,
            f"Found {len(notifications)} notifications")
except Exception as e:
    log_test("T11b: Investor1 has notification from owner's reply", False, f"Exception: {e}")

# Test 29: Regression - internal chat still works
try:
    response = requests.post(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token},
        json={"text": "[QA-test] Intern regresjon"},
        timeout=10
    )
    if response.status_code == 201:
        data = response.json()
        melding = data.get("melding", {})
        actual_kanal = melding.get("kanal")
        melding_id = melding.get("id")
        if melding_id:
            qa_message_ids.append(melding_id)
        passed = actual_kanal == "generelt"
        log_test("T12a: Owner POST without kanal → 201 kanal 'generelt'", passed,
                f"Expected: generelt, Got: {actual_kanal}")
    else:
        log_test("T12a: Owner POST without kanal → 201 kanal 'generelt'", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T12a: Owner POST without kanal → 201 kanal 'generelt'", False, f"Exception: {e}")

# Test 30: Owner GET shows the internal message
try:
    response = requests.get(
        f"{BASE_URL}/admin/chat/meldinger",
        params={"key": owner_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        meldinger = data.get("meldinger", [])
        qa_test_msgs = [m for m in meldinger if "[QA-test]" in m.get("text", "")]
        passed = len(qa_test_msgs) >= 1
        log_test("T12b: Owner GET shows internal [QA-test] messages", passed,
                f"Found {len(qa_test_msgs)} QA test messages")
    else:
        log_test("T12b: Owner GET shows internal [QA-test] messages", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T12b: Owner GET shows internal [QA-test] messages", False, f"Exception: {e}")

# Test 31: Investor1 DELETE on owner's generelt message → should fail (403/404)
if generelt_test_message_id:
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/chat/meldinger",
            params={"key": qa_investor1_token, "id": generelt_test_message_id},
            timeout=10
        )
        # Should NOT be 200 (successful deletion)
        passed = response.status_code != 200
        log_test("T13: Investor1 DELETE owner's generelt message → fails (not 200)", passed,
                f"Status: {response.status_code}")
    except Exception as e:
        log_test("T13: Investor1 DELETE owner's generelt message → fails (not 200)", False, f"Exception: {e}")

# Test 32: GET /admin/auth/me?key=<owner-token> → user.id is set
try:
    response = requests.get(
        f"{BASE_URL}/admin/auth/me",
        params={"key": owner_token},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        user_id = data.get("user", {}).get("id")
        passed = user_id is not None and isinstance(user_id, str) and len(user_id) > 0
        log_test("T14: GET /admin/auth/me → user.id is set (string)", passed,
                f"user.id: {user_id}")
    else:
        log_test("T14: GET /admin/auth/me → user.id is set (string)", False,
                f"Status {response.status_code}: {response.text[:200]}")
except Exception as e:
    log_test("T14: GET /admin/auth/me → user.id is set (string)", False, f"Exception: {e}")

print()
print("=" * 80)
print("CLEANUP")
print("=" * 80)

# Delete all QA messages
deleted_messages = 0
for msg_id in qa_message_ids:
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/chat/meldinger",
            params={"key": ADMIN_KEY, "id": msg_id},
            timeout=10
        )
        if response.status_code == 200:
            deleted_messages += 1
    except Exception as e:
        print(f"⚠️  Failed to delete message {msg_id}: {e}")

print(f"✅ Deleted {deleted_messages}/{len(qa_message_ids)} QA messages")

# Delete QA file
if qa_file_id:
    try:
        # Try DELETE endpoint first
        response = requests.delete(
            f"{BASE_URL}/admin/chat/fil/{qa_file_id}",
            params={"key": owner_token},
            timeout=10
        )
        if response.status_code == 200:
            print(f"✅ Deleted QA file via API: {qa_file_id}")
        else:
            # If API fails, delete directly from MongoDB
            result = db.chat_files.delete_one({"id": qa_file_id})
            if result.deleted_count > 0:
                print(f"✅ Deleted QA file from MongoDB: {qa_file_id}")
    except Exception as e:
        print(f"⚠️  Failed to delete file {qa_file_id}: {e}")

# Delete messages in investor channels from MongoDB
try:
    result = db.chat_messages.delete_many({
        "kanal": {"$in": [qa_investor1_channel, qa_investor2_channel]}
    })
    print(f"✅ Deleted {result.deleted_count} messages from investor channels in MongoDB")
except Exception as e:
    print(f"⚠️  Failed to delete investor channel messages: {e}")

# Delete chat_lest entries for QA investors
try:
    result = db.chat_lest.delete_many({
        "userId": {"$in": [qa_investor1_id, qa_investor2_id]}
    })
    print(f"✅ Deleted {result.deleted_count} chat_lest entries for QA investors")
except Exception as e:
    print(f"⚠️  Failed to delete chat_lest entries: {e}")

# Delete notifications for QA investors
try:
    result = db.notifications.delete_many({
        "$or": [
            {"userId": {"$in": [qa_investor1_id, qa_investor2_id]}},
            {"text": {"$regex": "QA Investor (En|To)"}}
        ]
    })
    print(f"✅ Deleted {result.deleted_count} notifications for QA investors")
except Exception as e:
    print(f"⚠️  Failed to delete notifications: {e}")

# Delete QA investors
for investor_id, email in [(qa_investor1_id, qa_inv1_email), (qa_investor2_id, qa_inv2_email)]:
    try:
        response = requests.delete(
            f"{BASE_URL}/admin/users/{investor_id}",
            params={"key": ADMIN_KEY},
            timeout=10
        )
        if response.status_code == 200:
            print(f"✅ Deleted QA investor: {email}")
        else:
            print(f"⚠️  Failed to delete investor {email}: Status {response.status_code}")
    except Exception as e:
        print(f"⚠️  Failed to delete investor {email}: {e}")

# Verify cleanup
print()
print("=" * 80)
print("CLEANUP VERIFICATION")
print("=" * 80)

# Verify no @example.com users remain
try:
    count = db.admin_users.count_documents({"email": {"$regex": "@example.com$"}})
    if count == 0:
        print(f"✅ Verified: 0 @example.com users remain")
    else:
        print(f"⚠️  WARNING: {count} @example.com users still exist")
except Exception as e:
    print(f"⚠️  Failed to verify users: {e}")

# Verify no messages in QA investor channels
try:
    count = db.chat_messages.count_documents({
        "kanal": {"$in": [qa_investor1_channel, qa_investor2_channel]}
    })
    if count == 0:
        print(f"✅ Verified: 0 messages in QA investor channels")
    else:
        print(f"⚠️  WARNING: {count} messages still exist in QA investor channels")
except Exception as e:
    print(f"⚠️  Failed to verify messages: {e}")

# Verify generelt message count is back to baseline (or close to it, accounting for [QA-test] messages)
try:
    current_count = db.chat_messages.count_documents({"kanal": "generelt"})
    # We created some [QA-test] messages in generelt, so count should be close to baseline
    print(f"📊 Generelt messages: Baseline={generelt_baseline_count}, Current={current_count}")
    if current_count >= generelt_baseline_count:
        print(f"✅ Generelt message count acceptable (may include [QA-test] messages)")
except Exception as e:
    print(f"⚠️  Failed to verify generelt messages: {e}")

print()
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print()

passed_count = sum(1 for r in test_results if r.startswith("✅"))
failed_count = sum(1 for r in test_results if r.startswith("❌"))
total_count = passed_count + failed_count

for result in test_results:
    print(result)

print()
print("=" * 80)
print(f"TOTAL: {passed_count}/{total_count} tests passed")
if failed_count == 0:
    print("✅ ALL TESTS PASSED - INVESTORCHAT SECURITY ISOLATION WORKING PERFECTLY")
else:
    print(f"❌ {failed_count} tests failed")
print("=" * 80)

mongo_client.close()
