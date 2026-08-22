"""
Fix relationship shadowing in all_models.py
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

models_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common\models\all_models.py"

with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# At top of file, import relationship as orm_relationship
if "from sqlalchemy.orm import Mapped, mapped_column, relationship" in content:
    content = content.replace(
        "from sqlalchemy.orm import Mapped, mapped_column, relationship",
        "from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship, relationship"
    )

# Replace the relationship calls in Feature 22 models
content = content.replace(
    'driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])',
    'driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])'
)
content = content.replace(
    'ride_request: Mapped["RideRequest"] = relationship("RideRequest", foreign_keys=[ride_id])',
    'ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])'
)
content = content.replace(
    'ride_request: Mapped[Optional["RideRequest"]] = relationship("RideRequest", foreign_keys=[ride_id])',
    'ride_request: Mapped[Optional["RideRequest"]] = orm_relationship("RideRequest", foreign_keys=[ride_id])'
)

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("✓ Fixed relationship shadowing with orm_relationship in all_models.py!")
