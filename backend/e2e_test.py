import asyncio
import httpx
import uuid
import time
import os

BASE_URL = "http://127.0.0.1:8008/api/v1"
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "StrongPassword123!"

async def run_tests():
    print(f"--- STARTING E2E TEST SUITE ---")
    
    # 1. Registration
    print(f"[1] Testing Registration for {TEST_EMAIL}...")
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        resp = await client.post(f"{BASE_URL}/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "E2E Test User",
            "role": "farmer",
            "region": "North",
            "preferences": "{}"
        })
        latency = time.time() - start_time
        print(f"    Register Status: {resp.status_code} (Latency: {latency:.3f}s)")
        if resp.status_code != 201:
            print(f"    Error: {resp.text}")
            return
        
        # 2. Login
        print(f"[2] Testing Login...")
        start_time = time.time()
        resp = await client.post(f"{BASE_URL}/auth/login/access-token", data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        latency = time.time() - start_time
        print(f"    Login Status: {resp.status_code} (Latency: {latency:.3f}s)")
        if resp.status_code != 200:
            print(f"    Error: {resp.text}")
            return
            
        token = resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Fetch User Profile
        print(f"[3] Fetching Own Profile...")
        start_time = time.time()
        resp = await client.get(f"{BASE_URL}/auth/me", headers=headers)
        latency = time.time() - start_time
        print(f"    Profile Status: {resp.status_code} (Latency: {latency:.3f}s)")
        
        # 4. Image Upload Pipeline
        print(f"[4] Testing Image Upload / Detection...")
        # create a dummy image
        with open("test_image.jpg", "wb") as f:
            f.write(os.urandom(1024 * 10)) # 10kb random bytes
            
        with open("test_image.jpg", "rb") as f:
            files = {"file": ("test_image.jpg", f, "image/jpeg")}
            start_time = time.time()
            resp = await client.post(f"{BASE_URL}/detection/analyze", files=files, headers=headers)
            latency = time.time() - start_time
            print(f"    Detection Status: {resp.status_code} (Latency: {latency:.3f}s)")
            if resp.status_code == 200:
                print(f"    Detection Result: {resp.json().get('detected_disease')} / {resp.json().get('severity')}")
            else:
                 print(f"    Detection Error: {resp.text}")
                 
        # 5. Fetch Detection History
        print(f"[5] Fetching Detection History...")
        start_time = time.time()
        resp = await client.get(f"{BASE_URL}/detection/history", headers=headers)
        latency = time.time() - start_time
        print(f"    History Status: {resp.status_code} (Latency: {latency:.3f}s)")
        
        if resp.status_code == 200:
             history = resp.json()
             if len(history) > 0:
                 print(f"    Found {len(history)} items in history.")
             else:
                 print("    ERROR: Hit history but no items found!")

    print("--- E2E TEST SUITE FINISHED ---")

if __name__ == "__main__":
    asyncio.run(run_tests())
