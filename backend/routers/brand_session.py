from fastapi import APIRouter

from api_models import BrandInfo
from services.brand_session_service import create_or_update_current_brand, get_current_brand

router = APIRouter(tags=["brand"])


@router.post("/brand/create")
async def create_brand(brand_info: BrandInfo):
    brand = create_or_update_current_brand(brand_info)
    return {"message": "Brand created successfully", "brand": brand}


@router.get("/brand/current")
async def current_brand():
    return get_current_brand()
