
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

def login(email, password):
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return None
    return res.json()['token']

def set_availability(token, start, end, duration, status='free'):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "start": start,
        "end": end,
        "durationMinutes": duration,
        "status": status
    }
    res = requests.post(f"{BASE_URL}/practitioner/availability", json=payload, headers=headers)
    print(f"Set Availability ({status}): {res.status_code}")
    print(res.text)

def get_appointments(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/appointments", headers=headers)
    if res.status_code != 200:
        print(f"Get Appointments failed: {res.text}")
        return []
    return res.json()

def main():
    print("--- 1. Login ---")
    token = login("dr@hcbs.com", "password123") # Assuming default seeded user
    if not token:
        # Try signing up if login fails (maybe DB was wiped)
        print("Login failed, trying signup...")
        res = requests.post(f"{BASE_URL}/auth/signup", json={
             "type": "practitioner",
             "email": "dr_test@hcbs.com",
             "password": "password123",
             "firstName": "Test",
             "lastName": "Doc",
             "specialty": "General"
        })
        if res.status_code == 201:
            token = res.json()['token']
        else:
             # Try login with test user
             token = login("dr_test@hcbs.com", "password123")
    
    if not token:
        print("Could not get token.")
        return

    print(f"Token obtained.")

    # Dates
    now = datetime.now()
    tomo_start = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    tomo_end = (now + timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0)
    
    pto_start = (now + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
    pto_end = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)

    print("\n--- 2. Set General Availability (9-11 AM, 30 mins) ---")
    set_availability(token, tomo_start.isoformat(), tomo_end.isoformat(), 30, 'free')

    print("\n--- 3. Set PTO (12-2 PM) ---")
    set_availability(token, pto_start.isoformat(), pto_end.isoformat(), 0, 'busy')

    print("\n--- 4. Verify Slots ---")
    slots = get_appointments(token)
    
    print(f"Total Items: {len(slots)}")
    for item in slots:
        status = item.get('status')
        start = item.get('start')
        print(f" - {start} : {status}")

    # Verification Logic
    available_count = sum(1 for s in slots if s.get('status') in ['available', 'free'])
    pto_count = sum(1 for s in slots if s.get('status') in ['pto', 'busy']) # AppointmentController maps them to 'pto' or 'available'
    
    # Note: Backend maps status='busy' + comment='PTO' -> 'pto'.
    # Backend maps status='free' -> 'available'
    
    print(f"\nAvailable Slots (Expected ~4): {available_count}")
    print(f"PTO Slots (Expected ~1): {pto_count}")

if __name__ == "__main__":
    main()
