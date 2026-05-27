"""
Locust Load Tests — Phase 10.
Simulates realistic user behavior:
  - CustomerUser: Search trips, book seats, check wallet
  - DriverUser: Go online, update location
  - AdminUser: Check dashboard, list trips

Usage:
  locust -f locustfile.py --host=http://localhost:80 --users=100 --spawn-rate=10

Or headless:
  locust -f locustfile.py --host=http://localhost:80 --users=50 --spawn-rate=5
      --run-time=5m --headless --html=load_report.html
"""
import random
import json
from locust import HttpUser, task, between, constant_pacing

# ─── Shared test data ─────────────────────────────────────

CITIES = ["Pune", "Mumbai", "Nashik", "Aurangabad", "Nagpur", "Kolhapur"]

CUSTOMER_PHONES = [f"+9190000{i:05d}" for i in range(1, 101)]
DRIVER_PHONES = [f"+9191000{i:05d}" for i in range(1, 51)]

TEST_OTP = "123456"
ADMIN_CREDS = {"email": "admin@cabooking.com", "password": "123456"}


def get_random_cities():
    pickup, dest = random.sample(CITIES, 2)
    return pickup, dest


# ─── Customer User ────────────────────────────────────────

class CustomerUser(HttpUser):
    """
    Simulates a customer: search → view trip → book → check wallet.
    Wait between 1-3 seconds between tasks.
    """
    wait_time = between(1, 3)
    weight = 3  # 3x more customers than drivers

    def on_start(self):
        """Login as a random customer."""
        phone = random.choice(CUSTOMER_PHONES)
        self.client.post("/api/v1/auth/otp/send", json={"phone": phone})
        res = self.client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": TEST_OTP})
        if res.status_code == 200:
            data = res.json().get("data", {})
            self.token = data.get("access_token", "")
        else:
            self.token = ""
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(5)
    def search_trips(self):
        pickup, dest = get_random_cities()
        self.client.get(
            "/api/v1/trips/search",
            params={
                "pickup_city": pickup,
                "destination_city": dest,
                "departure_date": "2026-12-15",
                "seat_count": 1,
            },
            name="/api/v1/trips/search",
        )

    @task(2)
    def check_wallet(self):
        self.client.get("/api/v1/wallet", headers=self.headers, name="/api/v1/wallet")

    @task(1)
    def get_my_trips(self):
        self.client.get(
            "/api/v1/bookings/my",
            headers=self.headers,
            name="/api/v1/bookings/my",
        )

    @task(1)
    def get_my_parcels(self):
        self.client.get(
            "/api/v1/parcels/my",
            headers=self.headers,
            name="/api/v1/parcels/my",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="/health")


# ─── Driver User ──────────────────────────────────────────

class DriverUser(HttpUser):
    """
    Simulates a driver: go online, push GPS updates.
    """
    wait_time = between(5, 10)  # drivers update every 5-10s
    weight = 1

    def on_start(self):
        phone = random.choice(DRIVER_PHONES)
        self.client.post("/api/v1/auth/otp/send", json={"phone": phone})
        res = self.client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": TEST_OTP})
        if res.status_code == 200:
            self.token = res.json().get("data", {}).get("access_token", "")
        else:
            self.token = ""
        self.headers = {"Authorization": f"Bearer {self.token}"}
        # Go online
        self.client.post("/api/v1/drivers/online", headers=self.headers, name="/api/v1/drivers/online")

    @task(5)
    def update_location(self):
        """Simulate GPS update every few seconds."""
        lat = 18.52 + random.uniform(-0.1, 0.1)
        lng = 73.85 + random.uniform(-0.1, 0.1)
        self.client.post(
            "/api/v1/tracking/update",
            json={
                "latitude": lat,
                "longitude": lng,
                "speed_kmh": random.uniform(0, 80),
                "heading": random.uniform(0, 360),
            },
            headers=self.headers,
            name="/api/v1/tracking/update",
        )

    @task(1)
    def check_parcels(self):
        self.client.get(
            "/api/v1/parcels/driver/my-parcels",
            headers=self.headers,
            name="/api/v1/parcels/driver/my-parcels",
        )


# ─── Admin User ───────────────────────────────────────────

class AdminUser(HttpUser):
    """
    Simulates an admin checking dashboard stats.
    """
    wait_time = between(10, 30)
    weight = 1

    def on_start(self):
        res = self.client.post("/api/v1/admin/auth/login", json=ADMIN_CREDS)
        if res.status_code == 200:
            self.token = res.json().get("data", {}).get("access_token", "")
        else:
            self.token = ""
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def check_dashboard(self):
        self.client.get("/api/v1/admin/dashboard", headers=self.headers, name="/api/v1/admin/dashboard")

    @task(2)
    def check_fleet(self):
        self.client.get(
            "/api/v1/admin/fleet/online-drivers",
            headers=self.headers,
            name="/api/v1/admin/fleet/online-drivers",
        )

    @task(1)
    def list_trips(self):
        self.client.get(
            "/api/v1/admin/trips",
            headers=self.headers,
            params={"page": 1, "page_size": 20},
            name="/api/v1/admin/trips",
        )
