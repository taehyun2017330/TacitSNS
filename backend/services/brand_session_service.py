from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException

from api_models import BrandInfo


_current_brand: Dict[str, Any] = {}


def create_or_update_current_brand(brand_info: BrandInfo) -> Dict[str, Any]:
    _current_brand.update(
        {
            "name": brand_info.name,
            "category": brand_info.category,
            "description": brand_info.description,
            "images": brand_info.images,
            "created_at": datetime.now().isoformat(),
        }
    )
    return _current_brand


def get_current_brand() -> Dict[str, Any]:
    if not _current_brand:
        raise HTTPException(status_code=404, detail="No brand currently set")
    return _current_brand
