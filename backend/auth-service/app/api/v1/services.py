"""
Service Catalog API Router.
Endpoint: /api/v1/services
"""
from typing import List
from fastapi import APIRouter, status
from app.schemas.customer_home import ServiceCatalogItem
from app.services.customer_home_service import get_service_catalog

router = APIRouter()


@router.get(
    "/catalog",
    response_model=List[ServiceCatalogItem],
    status_code=status.HTTP_200_OK,
    summary="Get multi-service catalog and availability",
)
async def get_catalog():
    return await get_service_catalog()
