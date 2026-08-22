"""
Patch DriverTrustedContact model in all_models.py
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

models_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common\models\all_models.py"

with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

target = """    contact_relationship: Mapped[str] = mapped_column(String(50), default="Family", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])"""

replacement = """    relationship_type: Mapped[str] = mapped_column("relationship", String(50), default="Family", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relationship_type

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relationship_type = val

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])"""

if target in content:
    content = content.replace(target, replacement)
    with open(models_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("✓ Patched DriverTrustedContact model successfully!")
else:
    print("⚠️ Target block not found in all_models.py")
