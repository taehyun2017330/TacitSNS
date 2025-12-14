from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class BrandBase(BaseModel):
    """Base brand model"""
    name: str
    category: str
    description: str
    target_audience: str
    major_strengths: List[str]
    main_products: List[str]
    brand_voice: str
    reference_images: List[str] = []
    logo_image: Optional[str] = None

class BrandCreate(BrandBase):
    """Model for creating a brand"""
    pass

class BrandUpdate(BaseModel):
    """Model for updating a brand"""
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    major_strengths: Optional[List[str]] = None
    main_products: Optional[List[str]] = None
    brand_voice: Optional[str] = None
    reference_images: Optional[List[str]] = None
    logo_image: Optional[str] = None

class Brand(BrandBase):
    """Brand model with all fields"""
    id: str
    user_id: str
    created_date: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
