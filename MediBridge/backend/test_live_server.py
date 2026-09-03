"""
Live HTTP end-to-end sanity check running against actual Flask server on localhost port 5055.
"""

import sys
import os
import time
import requests
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROUTES_DIR = os.path.join(BASE_DIR, "routes")
if ROUTES_DIR not in sys.path:
    sys.path.insert(0, ROUTES_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db

SERVER_URL = "http://127.0.0.1:5055"

def run_live_tests():
    print(f"Checking server liveness at {SERVER_URL}...")
    
    # 1. Health check or index
    try:
        r = requests.get(f"{SERVER_URL}/")
        print(f"GET / -> Status: {r.status_code}")
    except Exception as e:
        print(f"Could not connect to {SERVER_URL}: {e}")
        return False

    # 2. Register test patient
    run_id = str(uuid.uuid4())[:8]
    p_email = f"live_patient_{run_id}@example.com"
    p_pass = "LivePass123!"

    reg_payload = {
        "name": f"Live Patient {run_id}",
        "email": p_email,
        "password": p_pass,
        "role": "patient",
        "age": 30,
        "gender": "Male",
        "phone": "+91 9111122222",
        "address": "42 Live Street, Bangalore"
    }

    r_reg = requests.post(f"{SERVER_URL}/api/auth/register", json=reg_payload)
    print(f"POST /api/auth/register -> Status: {r_reg.status_code}")
    assert r_reg.status_code == 201, f"Registration failed: {r_reg.text}"
    p_id = r_reg.json()["user"]["id"]

    # 3. Login
    r_login = requests.post(f"{SERVER_URL}/api/auth/login", json={"email": p_email, "password": p_pass})
    print(f"POST /api/auth/login -> Status: {r_login.status_code}")
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token = r_login.json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 4. Get patient profile
    r_me = requests.get(f"{SERVER_URL}/api/patients/me", headers=headers)
    print(f"GET /api/patients/me -> Status: {r_me.status_code}")
    assert r_me.status_code == 200
    pt_data = r_me.json()["patient"]
    assert pt_data["email"] == p_email
    assert pt_data["age"] == 30

    # 5. List doctors
    r_docs = requests.get(f"{SERVER_URL}/api/patients/doctors", headers=headers)
    print(f"GET /api/patients/doctors -> Status: {r_docs.status_code}, Doctors count: {len(r_docs.json().get('doctors', []))}")
    assert r_docs.status_code == 200

    # Clean up test user
    db.execute("DELETE FROM patients WHERE id = ?", (p_id,))
    db.execute("DELETE FROM users WHERE id = ?", (p_id,))
    print("Live HTTP Endpoints Test PASSED!")
    return True

if __name__ == "__main__":
    run_live_tests()
