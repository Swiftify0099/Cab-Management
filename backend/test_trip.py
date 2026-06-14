import asyncio
import httpx

async def run():
    print("Testing against 8009...")
    async with httpx.AsyncClient() as client:
        # Auth driver
        res = await client.post("http://localhost:8001/api/v1/auth/otp/verify", json={
            "phone": "+917777777777",
            "otp_code": "123456",
            "role": "driver"
        })
        token = res.json()["data"]["access_token"]
        
        # Create Trip
        dep_time = "2026-06-11T00:00:00Z"
        trip_res = await client.post("http://localhost:8001/api/v1/trips/", json={
            "pickup_lat": 28.7041,
            "pickup_lng": 77.1025,
            "destination_lat": 27.1767,
            "destination_lng": 78.0081,
            "departure_time": dep_time,
            "total_seats": 4,
            "vehicle_type": "sedan",
            "base_fare": 2000.0,
            "per_km_rate": 10.0,
            "non_stop": True
        }, headers={"Authorization": f"Bearer {token}"})
        
        print(trip_res.status_code)
        print(trip_res.text)

asyncio.run(run())
