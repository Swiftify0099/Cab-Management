models_path = r"d:\cub\Cab-Management\backend\common\models\all_models.py"
with open(models_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the Feature 1 models section with the safe attribute names
old_section = """# ============================================================
# FEATURE 1: FAMILY / SHARED ACCOUNT & CUSTOMER SAFETY
# ============================================================

class FamilyAccount(Base, UUIDMixin, TimestampMixin):
    \"\"\"Family Group owned by an organizer.\"\"\"
    __tablename__ = "family_accounts"

    organizer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    family_name: Mapped[str] = mapped_column(String(100), nullable=False, default="My Family")
    is_shared_payment_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    shared_payment_method: Mapped[Optional[str]] = mapped_column(String(50), default="wallet")
    monthly_spending_limit: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    organizer: Mapped["User"] = orm_relationship("User", foreign_keys=[organizer_id])
    members: Mapped[List["FamilyMember"]] = orm_relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base, UUIDMixin, TimestampMixin):
    \"\"\"Family Member with explicit granular permissions.\"\"\"
    __tablename__ = "family_members"

    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Family Member", nullable=False)
    role: Mapped[FamilyRole] = mapped_column(Enum(FamilyRole), default=FamilyRole.MEMBER, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, INVITED, SUSPENDED
    can_use_shared_payment: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_book_rides: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_track_trips: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val

    # Relationships
    family: Mapped["FamilyAccount"] = orm_relationship("FamilyAccount", back_populates="members")
    user: Mapped[Optional["User"]] = orm_relationship("User", foreign_keys=[user_id])


class FamilyInvitation(Base, UUIDMixin, TimestampMixin):
    \"\"\"Invitations sent to join a family account.\"\"\"
    __tablename__ = "family_invitations"

    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_phone: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    invited_name: Mapped[str] = mapped_column(String(100), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Family Member", nullable=False)
    invite_code: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING, ACCEPTED, REJECTED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val


class CustomerEmergencyContact(Base, UUIDMixin, TimestampMixin):
    \"\"\"Normalized multi-contact safety registry for customer SOS and live sharing.\"\"\"
    __tablename__ = "customer_emergency_contacts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Friend", nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_share_rides: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val

    user: Mapped["User"] = orm_relationship("User", foreign_keys=[user_id])


class CustomerAppSetting(Base, UUIDMixin, TimestampMixin):
    \"\"\"Granular persistent settings and privacy preferences for customers.\"\"\"
    __tablename__ = "customer_app_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    notifications_ride_updates: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_driver_arrival: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_promotions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_security_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_location_sharing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_family_trip_tracking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_personalized_ads: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = orm_relationship("User", foreign_keys=[user_id])"""

import re
# Replace whatever is between FEATURE 1 and the next section header or Driver
pattern = r"# ============================================================\s*# FEATURE 1: FAMILY / SHARED ACCOUNT & CUSTOMER SAFETY\s*# ============================================================.*?class CustomerAppSetting\(Base, UUIDMixin, TimestampMixin\):.*?\n\n"
content = re.sub(pattern, old_section + "\n\n", content, flags=re.DOTALL)

with open(models_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated all_models.py with clean relationship definitions!")
