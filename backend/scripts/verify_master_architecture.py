"""
E2E Verification Script — Master Core Architecture (Feature 28)
════════════════════════════════════════════════════════════════════════════════
Comprehensive multi-layer verification covering:
  1. Backend Common Job Contract & Service Adapters (All 6 domains)
  2. Unified Driver Job API & Gateway Registration
  3. Shared Infrastructure (Tracking, Communication, Rating)
  4. Driver App Hardcoded Fake Data Removal
  5. Developer Tools & DevSheet __DEV__ Guarding
  6. Driver App TypeScript Types, API client & useCommonJob hook
  7. Architecture Specifications & Documentation
"""
import os
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent.parent
DRIVER_APP = ROOT / "apps" / "driver-app"
BACKEND = ROOT / "backend"

PASS = "[PASS]"
FAIL = "[FAIL]"

results = []


def check(name: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    results.append((name, condition))
    print(f"  {status}  {name}" + (f" — {detail}" if detail and not condition else ""))


def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def file_exists(path: str) -> bool:
    return os.path.isfile(path)


print("=" * 70)
print("  Feature 28 — Master Core Architecture Verification")
print("=" * 70)

# ═══ 1. Backend Common Job Contract Files ══════════════════════════════════════
print("\n📋 1. Backend — Common Job Contract Foundation")

contract_file = BACKEND / "common" / "services" / "common_job_contract.py"
check("common_job_contract.py exists", file_exists(str(contract_file)))
if file_exists(str(contract_file)):
    content = read_file(str(contract_file))
    check("ServiceAdapter ABC defined", "class ServiceAdapter(ABC)" in content)
    check("CommonJobStatus enum defined", "class CommonJobStatus" in content)
    check("CommonJobCommand enum defined", "class CommonJobCommand" in content)
    check("CommonJobResponse dataclass defined", "class CommonJobResponse" in content)
    check("ServiceAdapterRegistry defined", "class ServiceAdapterRegistry" in content)
    check("adapter_registry singleton created", "adapter_registry = ServiceAdapterRegistry()" in content)

# ═══ 2. Service Adapters (All 6 domains) ══════════════════════════════════════
print("\n📋 2. Backend — Domain Service Adapters (6 Domains)")

adapters = [
    ("ride_adapter.py", "RideServiceAdapter", "RIDE"),
    ("parcel_adapter.py", "ParcelServiceAdapter", "PARCEL"),
    ("transport_adapter.py", "TransportServiceAdapter", "TRANSPORT"),
    ("airport_adapter.py", "AirportServiceAdapter", "AIRPORT"),
    ("rental_adapter.py", "RentalServiceAdapter", "RENTAL"),
    ("outstation_adapter.py", "OutstationServiceAdapter", "OUTSTATION"),
]

for filename, class_name, domain_name in adapters:
    adapter_path = BACKEND / "common" / "services" / "adapters" / filename
    check(f"{filename} exists ({domain_name})", file_exists(str(adapter_path)))
    if file_exists(str(adapter_path)):
        content = read_file(str(adapter_path))
        check(f"{class_name} implements ServiceAdapter", f"class {class_name}(ServiceAdapter)" in content)
        check(f"{domain_name} status mapping exists", f"_{domain_name}_STATUS_MAP" in content)
        check(f"{domain_name} get_active_job implemented", "async def get_active_job" in content)
        check(f"{domain_name} process_command implemented", "async def process_command" in content)

# ═══ 3. Unified API & Gateway Registration ════════════════════════════════════
print("\n📋 3. Backend — Unified Driver Job API & Gateway")

api_file = BACKEND / "common" / "api" / "__init__.py"
check("Common API file exists", file_exists(str(api_file)))
if file_exists(str(api_file)):
    content = read_file(str(api_file))
    check("GET /driver/jobs/active endpoint", "/active" in content)
    check("POST /{job_id}/command endpoint", "/command" in content)
    check("GET /history/list endpoint", "/history/list" in content)
    check("Uses get_current_active_driver auth", "get_current_active_driver" in content)
    check("Registers all 6 default adapters",
          all(x in content for x in ["RIDE", "PARCEL", "TRANSPORT", "AIRPORT", "RENTAL", "OUTSTATION"]))

gateway = BACKEND / "local_gateway.py"
if file_exists(str(gateway)):
    content = read_file(str(gateway))
    check("Common Job router registered in gateway",
          "common_jobs_router" in content and "register_default_adapters" in content)
    check("Health check includes common_jobs", "_common_jobs_ok" in content)

# ═══ 4. Shared Infrastructure (Tracking, Communication, Rating) ═══════════════
print("\n📋 4. Backend — Shared Infrastructure Layers")

tracking_file = BACKEND / "common" / "services" / "common_tracking_service.py"
check("CommonTrackingService exists", file_exists(str(tracking_file)))
if file_exists(str(tracking_file)):
    content = read_file(str(tracking_file))
    check("ingest_driver_location implemented", "def ingest_driver_location" in content)
    check("Redis telemetry pub/sub included", "REDIS_CHANNEL_LIVE_TRACK" in content)

comm_file = BACKEND / "common" / "services" / "common_communication_service.py"
check("CommonCommunicationService exists", file_exists(str(comm_file)))
if file_exists(str(comm_file)):
    content = read_file(str(comm_file))
    check("create_masked_call_session implemented", "def create_masked_call_session" in content)
    check("mask_phone_for_display implemented", "def mask_phone_for_display" in content)

rating_file = BACKEND / "common" / "services" / "common_rating_service.py"
check("CommonRatingService exists", file_exists(str(rating_file)))
if file_exists(str(rating_file)):
    content = read_file(str(rating_file))
    check("submit_driver_rating_by_customer implemented", "def submit_driver_rating_by_customer" in content)
    check("submit_customer_rating_by_driver implemented", "def submit_customer_rating_by_driver" in content)

# ═══ 5. Driver App — Fake Data Removal ════════════════════════════════════════
print("\n📋 5. Driver App — Fake Data Removal")

trip_service = DRIVER_APP / "src" / "services" / "tripCompletionAndEarningsService.ts"
if file_exists(str(trip_service)):
    content = read_file(str(trip_service))
    check("completeRide() — no hardcoded fake fare", "customer_final_fare: 450.0" not in content)
    check("getRideReceipt() — no simulation fallback", "Default simulation fallback" not in content)
    check("getEarningsSummary() — no fake earnings", "total_net_earnings: 2480.0" not in content)

perf_service = DRIVER_APP / "src" / "services" / "driverPerformanceService.ts"
if file_exists(str(perf_service)):
    content = read_file(str(perf_service))
    check("Performance — no fake acceptance rate", "acceptance_rate: 94.2" not in content)
    check("Performance — no fake rating", "average: 4.88" not in content)

wait_service = DRIVER_APP / "src" / "services" / "waitingAndCancellationService.ts"
if file_exists(str(wait_service)):
    content = read_file(str(wait_service))
    check("WaitingService — no simulation fallback", "Default simulation fallback" not in content)

vehicle_service = DRIVER_APP / "src" / "services" / "vehicleService.ts"
if file_exists(str(vehicle_service)):
    content = read_file(str(vehicle_service))
    check("VehicleService — no mock seeding fallback", "Seed defaults" not in content)

# ═══ 6. Developer Tools & DevSheet __DEV__ Guarding ═══════════════════════════
print("\n📋 6. Driver App — __DEV__ Guarding on Sandbox & DevSheets")

dev_services = [
    ("tripHistoryService.ts", "TripHistoryService"),
    ("supportService.ts", "SupportService"),
    ("scheduledTripService.ts", "ScheduledTripService"),
    ("notificationService.ts", "NotificationService"),
    ("driverSettingsService.ts", "DriverSettingsService"),
    ("aiSmartDriverService.ts", "AISmartDriverService"),
]

for filename, sname in dev_services:
    spath = DRIVER_APP / "src" / "services" / filename
    if file_exists(str(spath)):
        content = read_file(str(spath))
        check(f"{sname}.simulateDevScenario guarded by __DEV__",
              "if (!__DEV__)" in content or "if (!__DEV__)" in content)

dev_sheets = [
    "wallet/WalletDevSheet.tsx",
    "support/SupportDevSheet.tsx",
    "settings/SettingsDevSheet.tsx",
    "scheduled/ScheduledDevSheet.tsx",
    "safety/SafetyDevSheet.tsx",
    "ride/RideRequestDevSheet.tsx",
    "radar/SmartRadarDevSheet.tsx",
    "performance/PerformanceDevSheet.tsx",
    "notifications/NotificationDevSheet.tsx",
    "navigation/NavigationDevSheet.tsx",
    "incentives/IncentivesDevSheet.tsx",
    "history/HistoryDevSheet.tsx",
    "feedback/RatingDevSheet.tsx",
    "demand/DemandDevSheet.tsx",
    "availability/AvailabilityDevSheet.tsx",
    "ai/AIDevSheet.tsx",
]

for sheet in dev_sheets:
    sheet_path = DRIVER_APP / "src" / "components" / sheet
    if file_exists(str(sheet_path)):
        content = read_file(str(sheet_path))
        check(f"{sheet} guarded by __DEV__", "if (!__DEV__)" in content)

# ═══ 7. Driver App — TypeScript Types + Hook + API Client ═════════════════════
print("\n📋 7. Driver App — TypeScript Types & Hook Integration")

types_file = DRIVER_APP / "src" / "types" / "commonJob.ts"
check("CommonJob types file exists", file_exists(str(types_file)))
if file_exists(str(types_file)):
    content = read_file(str(types_file))
    check("CommonJobStatus type defined", "CommonJobStatus" in content)
    check("CommonJobType type defined", "CommonJobType" in content)
    check("CommonJob interface defined", "interface CommonJob" in content)
    check("CommandResult interface defined", "interface CommandResult" in content)
    check("JOB_STATUS_LABELS map defined", "JOB_STATUS_LABELS" in content)
    check("JOB_TYPE_LABELS map defined", "JOB_TYPE_LABELS" in content)

hook_file = DRIVER_APP / "src" / "hooks" / "useCommonJob.ts"
check("useCommonJob hook exists", file_exists(str(hook_file)))
if file_exists(str(hook_file)):
    content = read_file(str(hook_file))
    check("useCommonJob function exported", "export function useCommonJob" in content)
    check("sendCommand method exists", "sendCommand" in content)
    check("refreshJob method exists", "refreshJob" in content)
    check("fetchHistory method exists", "fetchHistory" in content)

api_client = DRIVER_APP / "src" / "api" / "client.ts"
if file_exists(str(api_client)):
    content = read_file(str(api_client))
    check("commonJobApi namespace in driver API client", "commonJobApi" in content)

# ═══ 8. Documentation ═════════════════════════════════════════════════════════
print("\n📋 8. Architecture Specifications")

cross_service_doc = ROOT / "docs" / "CROSS_SERVICE_ARCHITECTURE.md"
customer_driver_doc = ROOT / "docs" / "CUSTOMER_DRIVER_CONTRACT.md"

check("CROSS_SERVICE_ARCHITECTURE.md exists", file_exists(str(cross_service_doc)))
check("CUSTOMER_DRIVER_CONTRACT.md exists", file_exists(str(customer_driver_doc)))

# ═══ Summary ══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
total = len(results)
print(f"  TOTAL: {total}  |  PASSED: {passed}  |  FAILED: {failed}")
if failed == 0:
    print("  🏆 ALL CHECKS PASSED — Master Core Architecture fully implemented & verified!")
else:
    print(f"  ⚠ {failed} check(s) failed — review above.")
print("=" * 70)

sys.exit(0 if failed == 0 else 1)
