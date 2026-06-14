import asyncio
import httpx
import socketio
import json
import uuid
import datetime

BASE_URL = "http://localhost:8001/api/v1"
WS_URL = "http://localhost:8010"

DRIVER_PHONE = "+917777777777"
CUSTOMER_PHONE = "+918888888888"
OTP = "123456"

async def auth_user(client: httpx.AsyncClient, phone: str, role: str):
    verify_resp = await client.post(f"{BASE_URL}/auth/otp/verify", json={
        "phone": phone,
        "otp_code": OTP,
        "role": role
    })
    assert verify_resp.status_code == 200, f"Failed to verify OTP for {phone}: {verify_resp.text}"
    data = verify_resp.json()
    if not data.get("success"):
        print(f"Failed to auth {role}:", data)
    user_id = data["data"].get("user", {}).get("id") or data["data"].get("user_id")
    return data["data"]["access_token"], user_id

async def run_e2e():
    async with httpx.AsyncClient() as http_client:
        print("1. Authenticating Driver & Customer...")
        driver_token, driver_id = await auth_user(http_client, DRIVER_PHONE, "driver")
        customer_token, customer_id = await auth_user(http_client, CUSTOMER_PHONE, "customer")
        
        driver_headers = {"Authorization": f"Bearer {driver_token}"}
        customer_headers = {"Authorization": f"Bearer {customer_token}"}
        
        print("2. Driver creating and publishing a Trip...")
        dep_time = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        trip_res = await http_client.post(f"{BASE_URL}/trips/", json={
            "pickup_lat": 28.7041,
            "pickup_lng": 77.1025,
            "destination_lat": 27.1767,
            "destination_lng": 78.0081,
            "departure_time": dep_time,
            "total_seats": 4,
            "vehicle_type": "sedan",
            "base_fare": 2000.0,
            "per_km_rate": 10.0
        }, headers={"Authorization": f"Bearer {driver_token}"})
        if trip_res.status_code != 201:
            print(f"TRIP CREATION FAILED. Status: {trip_res.status_code}")
            print(f"Body: {trip_res.text}")
            raise AssertionError("Create trip failed")
        trip_id = trip_res.json()["data"]["id"]
        
        pub_res = await http_client.post(f"{BASE_URL}/trips/{trip_id}/publish", headers=driver_headers)
        assert pub_res.status_code == 200, f"Publish trip failed: {pub_res.text}"
        print(f"   Trip {trip_id} created and published.")

        print("3. Connecting Driver to WebSocket...")
        sio_driver = socketio.AsyncClient()
        events_received = []
        
        @sio_driver.on("NEW_PENDING_CUSTOMER")
        async def on_new_customer(data):
            print(f"   [WS Driver] Received NEW_PENDING_CUSTOMER: {data}")
            events_received.append("NEW_PENDING_CUSTOMER")

        @sio_driver.on("INCOMING_TRIP_REQUEST")
        async def on_incoming_request(data):
            print(f"   [WS Driver] Received INCOMING_TRIP_REQUEST (Siren should trigger): {data}")
            events_received.append("INCOMING_TRIP_REQUEST")

        await sio_driver.connect(WS_URL, auth={"token": driver_token})
        # Join driver scan room
        await sio_driver.emit("join_driver_scan", {"trip_id": trip_id})

        print("4. Customer connects to WebSocket & searches for Trips...")
        sio_customer = socketio.AsyncClient()
        await sio_customer.connect(WS_URL, auth={"token": customer_token})

        search_res = await http_client.post(f"{BASE_URL}/trips/search", json={
            "from_lat": 18.5204,
            "from_lng": 73.8567,
            "to_lat": 19.0760,
            "to_lng": 72.8777,
            "departure_date": dep_time
        }, headers=customer_headers)
        assert search_res.status_code == 200, f"Search failed: {search_res.text}"
        found_trips = search_res.json()["data"]
        print(f"   Customer found {len(found_trips)} trips. Driver trip in results: {any(t['id'] == trip_id for t in found_trips)}")
        
        print("5. Customer creates a Pending Booking (to test NEW_PENDING_CUSTOMER event)...")
        pb_res = await http_client.post(f"{BASE_URL}/bookings/pending", json={
            "pickup_address": "Pune",
            "pickup_lat": 18.5204,
            "pickup_lng": 73.8567,
            "destination_address": "Mumbai",
            "destination_lat": 19.0760,
            "destination_lng": 72.8777,
            "travel_date": (datetime.datetime.utcnow().date()).isoformat(),
            "from_time": "10:00",
            "to_time": "12:00",
            "seats_required": 1
        }, headers=customer_headers)
        assert pb_res.status_code == 201, f"Pending booking failed: {pb_res.text}"
        
        await asyncio.sleep(2) # Wait for background matching & WS emit
        
        print("6. Customer Books the Trip (to test INCOMING_TRIP_REQUEST)...")
        book_res = await http_client.post(f"{BASE_URL}/bookings/", json={
            "trip_id": trip_id,
            "seat_count": 1
        }, headers=customer_headers)
        assert book_res.status_code == 201, f"Booking failed: {book_res.text}"
        
        await asyncio.sleep(2) # Wait for WS emit
        
        print("   Events Received by Driver:")
        print("   ", events_received)
        
        if "INCOMING_TRIP_REQUEST" in events_received:
            print("✅ End-to-End WebSocket notification successful (Siren triggered for driver).")
        else:
            print("❌ INCOMING_TRIP_REQUEST NOT received by driver!")
            
        await sio_driver.disconnect()
        await sio_customer.disconnect()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(run_e2e())
