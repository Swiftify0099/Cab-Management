"""
Auth Service startup tasks  seeding and directory creation.
"""
import logging
import os

import structlog
from sqlalchemy import select

from common.database import AsyncSessionLocal
from common.models.all_models import (
    AdminProfile,
    Theme,
    User,
    UserRole,
)
from common.utils.security import hash_password

from app.core.config import auth_settings

logger = structlog.get_logger(__name__)


async def create_upload_dirs() -> None:
    """Ensure all required upload directories exist."""
    dirs = [
        auth_settings.LOCAL_UPLOAD_DIR,
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "profiles"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "documents"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "vehicles"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "parcels"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "hotels"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "banners"),
        os.path.join(auth_settings.LOCAL_UPLOAD_DIR, "themes"),
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    logger.info(" Upload directories created.")


async def seed_admin_user() -> None:
    """Create default super admin if not exists."""
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == auth_settings.ADMIN_DEFAULT_EMAIL)
        )
        if result.scalar_one_or_none():
            logger.info("Admin user already exists  skipping seed.")
            return

        # Create admin user
        admin_user = User(
            phone="0000000000",
            email=auth_settings.ADMIN_DEFAULT_EMAIL,
            role=UserRole.SUPER_ADMIN,
            is_verified=True,
            is_active=True,
            is_profile_complete=True,
        )
        session.add(admin_user)
        await session.flush()

        # Create admin profile
        admin_profile = AdminProfile(
            user_id=admin_user.id,
            full_name="Super Administrator",
            password_hash=hash_password(auth_settings.ADMIN_DEFAULT_PASSWORD),
            role=UserRole.SUPER_ADMIN,
            must_change_password=auth_settings.ADMIN_FORCE_PASSWORD_CHANGE,
            permissions={
                "all": True,
            },
        )
        session.add(admin_profile)
        await session.commit()

        logger.info(
            "[OK] Default admin created.",
            email=auth_settings.ADMIN_DEFAULT_EMAIL,
            password="[DEFAULT  must change]",
        )


async def seed_default_themes() -> None:
    """Seed 10 built-in themes if they don't exist."""
    default_themes = [
        {
            "name": "default",
            "display_name": "Default Blue",
            "is_active": True,
            "is_festival": False,
            "config": {
                "primary": "#2563EB",
                "secondary": "#7C3AED",
                "background": "#F8FAFC",
                "surface": "#FFFFFF",
                "text": "#0F172A",
                "accent": "#F59E0B",
                "error": "#EF4444",
                "success": "#22C55E",
                "mode": "light",
            },
        },
        {
            "name": "dark",
            "display_name": "Dark Mode",
            "is_active": False,
            "is_festival": False,
            "config": {
                "primary": "#60A5FA",
                "secondary": "#A78BFA",
                "background": "#0F172A",
                "surface": "#1E293B",
                "text": "#F8FAFC",
                "accent": "#FBBF24",
                "error": "#F87171",
                "success": "#4ADE80",
                "mode": "dark",
            },
        },
        {
            "name": "glassmorphism",
            "display_name": "Glassmorphism",
            "is_active": False,
            "is_festival": False,
            "config": {
                "primary": "#6366F1",
                "secondary": "#8B5CF6",
                "background": "#0F0C29",
                "surface": "rgba(255,255,255,0.1)",
                "text": "#FFFFFF",
                "accent": "#EC4899",
                "blur": "20px",
                "mode": "glass",
            },
        },
        {
            "name": "diwali",
            "display_name": " Diwali",
            "is_active": False,
            "is_festival": True,
            "config": {
                "primary": "#F59E0B",
                "secondary": "#DC2626",
                "background": "#1C0A00",
                "surface": "#2D1500",
                "text": "#FDE68A",
                "accent": "#EF4444",
                "mode": "dark",
            },
        },
        {
            "name": "holi",
            "display_name": " Holi",
            "is_active": False,
            "is_festival": True,
            "config": {
                "primary": "#EC4899",
                "secondary": "#F59E0B",
                "background": "#FEFCE8",
                "surface": "#FFF7ED",
                "text": "#1F2937",
                "accent": "#10B981",
                "mode": "light",
            },
        },
        {
            "name": "eid",
            "display_name": " Eid",
            "is_active": False,
            "is_festival": True,
            "config": {
                "primary": "#059669",
                "secondary": "#D97706",
                "background": "#F0FDF4",
                "surface": "#ECFDF5",
                "text": "#064E3B",
                "accent": "#D97706",
                "mode": "light",
            },
        },
        {
            "name": "christmas",
            "display_name": " Christmas",
            "is_active": False,
            "is_festival": True,
            "config": {
                "primary": "#DC2626",
                "secondary": "#16A34A",
                "background": "#FFF1F2",
                "surface": "#FFFFFF",
                "text": "#1F2937",
                "accent": "#D97706",
                "mode": "light",
            },
        },
        {
            "name": "premium",
            "display_name": " Premium Gold",
            "is_active": False,
            "is_festival": False,
            "config": {
                "primary": "#D97706",
                "secondary": "#92400E",
                "background": "#0C0A09",
                "surface": "#1C1917",
                "text": "#FEF3C7",
                "accent": "#FCD34D",
                "mode": "dark",
            },
        },
        {
            "name": "neon",
            "display_name": " Neon",
            "is_active": False,
            "is_festival": False,
            "config": {
                "primary": "#22D3EE",
                "secondary": "#A855F7",
                "background": "#000000",
                "surface": "#0A0A0A",
                "text": "#FFFFFF",
                "accent": "#4ADE80",
                "mode": "dark",
            },
        },
        {
            "name": "minimal",
            "display_name": "Minimal White",
            "is_active": False,
            "is_festival": False,
            "config": {
                "primary": "#111827",
                "secondary": "#374151",
                "background": "#FFFFFF",
                "surface": "#F9FAFB",
                "text": "#111827",
                "accent": "#6B7280",
                "mode": "light",
            },
        },
    ]

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Theme).limit(1))
        if result.scalar_one_or_none():
            logger.info("Themes already seeded  skipping.")
            return

        for theme_data in default_themes:
            theme = Theme(**theme_data)
            session.add(theme)

        await session.commit()
        logger.info(f"[OK] Seeded {len(default_themes)} default themes.")
