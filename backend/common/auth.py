"""
Re-export module for common.middleware.auth
Provides backwards compatibility for imports from `common.auth`.
"""
from common.middleware.auth import (
    AuthenticatedUser,
    TokenData,
    bearer_scheme,
    get_current_user,
    get_current_user_optional,
    get_current_active_customer,
    get_current_active_driver,
    get_current_admin,
    get_current_super_admin,
    require_profile_complete,
    require_role,
)

__all__ = [
    "AuthenticatedUser",
    "TokenData",
    "bearer_scheme",
    "get_current_user",
    "get_current_user_optional",
    "get_current_active_customer",
    "get_current_active_driver",
    "get_current_admin",
    "get_current_super_admin",
    "require_profile_complete",
    "require_role",
]
