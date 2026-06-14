import asyncio
import httpx
import socketio

async def run():
    print("Testing socket connection...")
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8001/api/v1/auth/otp/verify", json={
            "phone": "+917777777777",
            "otp_code": "123456",
            "role": "driver"
        })
        token = res.json()["data"]["access_token"]
        print("Got token")
        
        sio = socketio.AsyncClient(logger=True, engineio_logger=True)
        try:
            await sio.connect("http://localhost:8010", auth={"token": token})
            print("Connected!")
            await sio.disconnect()
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(run())
