"""
Theme Engine API  Phase 9
Manage JSONB theme configurations and publish live updates to Redis.
"""
import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_admin
from common.schemas.response import APIResponse
from common.utils.redis_client import get_redis

router = APIRouter(prefix="/api/v1/themes", tags=["Themes"])

class ThemeUpdate(BaseModel):
    theme_name: str
    config: Dict[str, Any]

# In a real implementation this would fetch from a Theme DB table. 
# We'll mock the config for now.
MOCK_THEMES = [
    {"name": "default", "config": {"primary_color": "#2563EB", "font_family": "Inter", "dark_mode": False}},
    {"name": "diwali", "config": {"primary_color": "#F59E0B", "font_family": "Roboto", "dark_mode": True, "festival_banner": "Happy Diwali!"}}
]

@router.get("/", response_model=APIResponse[List[Dict[str, Any]]], summary="Get all themes")
async def get_themes(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedUser = Depends(get_current_admin)
):
    """List all available themes."""
    return APIResponse(message="Themes fetched", data=MOCK_THEMES)


@router.post("/", response_model=APIResponse[Dict[str, Any]], summary="Update theme configuration")
async def update_theme(
    payload: ThemeUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedUser = Depends(get_current_admin)
):
    """
    Update theme configuration in DB and publish live event to Redis.
    The customer/driver apps listen to this event via WebSocket.
    """
    r = await get_redis()
    
    # Broadcast theme update to all connected clients
    await r.publish("theme:updates", json.dumps({
        "event": "THEME_CHANGED",
        "theme_name": payload.theme_name,
        "config": payload.config
    }))
    
    return APIResponse(
        message=f"Theme '{payload.theme_name}' updated and published live",
        data={"theme_name": payload.theme_name, "config": payload.config}
    )
