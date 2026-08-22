"""
Patch destination_mode_service.py to set default None for address/coords
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

service_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services\destination_mode_service.py"

with open(service_file, "r", encoding="utf-8") as f:
    content = f.read()

target = """    async def set_destination_mode(
        self,
        driver_id: uuid.UUID,
        destination_address: Optional[str],
        destination_lat: Optional[float],
        destination_lng: Optional[float],
        preference_mode: str = "balanced",
        max_rides: int = 2,
        turn_off: bool = False,
    ) -> Dict[str, Any]:"""

replacement = """    async def set_destination_mode(
        self,
        driver_id: uuid.UUID,
        destination_address: Optional[str] = None,
        destination_lat: Optional[float] = None,
        destination_lng: Optional[float] = None,
        preference_mode: str = "balanced",
        max_rides: int = 2,
        turn_off: bool = False,
    ) -> Dict[str, Any]:"""

content = content.replace(target, replacement)

with open(service_file, "w", encoding="utf-8") as f:
    f.write(content)

print("✓ Updated set_destination_mode with optional defaults!")
