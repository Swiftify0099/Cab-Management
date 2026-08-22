"""
Fix relationship arguments in all_models.py
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

models_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common\models\all_models.py"

with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# Replace missing target argument in relationships
replacements = [
    ('driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])', 'driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])'),
    ('ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])', 'ride_request: Mapped["RideRequest"] = relationship("RideRequest", foreign_keys=[ride_id])'),
    ('ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])', 'ride_request: Mapped[Optional["RideRequest"]] = relationship("RideRequest", foreign_keys=[ride_id])'),
]

for target, repl in replacements:
    if target in content:
        content = content.replace(target, repl)
        print(f"✓ Replaced: {target[:40]}...")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Finished fixing relationships in all_models.py!")
