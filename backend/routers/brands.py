from fastapi import APIRouter, HTTPException, Depends
from typing import List
from firebase_config import get_firestore_client
from dependencies.auth import get_current_user_id
from models.brand import Brand, BrandCreate, BrandUpdate
from datetime import datetime
import uuid

router = APIRouter()
db = get_firestore_client()

@router.post("/", response_model=Brand)
async def create_brand(brand_data: BrandCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new brand for the authenticated user"""
    brand_id = str(uuid.uuid4())

    brand_dict = brand_data.model_dump()
    brand_dict.update({
        "id": brand_id,
        "user_id": user_id,
        "created_date": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Save to Firestore
    db.collection('brands').document(brand_id).set(brand_dict)

    return Brand(**brand_dict)

@router.get("/", response_model=List[Brand])
async def get_user_brands(user_id: str = Depends(get_current_user_id)):
    """Get all brands for the authenticated user"""
    brands_ref = db.collection('brands').where('user_id', '==', user_id).stream()

    brands = []
    for doc in brands_ref:
        brand_data = doc.to_dict()
        brands.append(Brand(**brand_data))

    return brands

@router.get("/{brand_id}", response_model=Brand)
async def get_brand(brand_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific brand by ID"""
    brand_ref = db.collection('brands').document(brand_id)
    brand_doc = brand_ref.get()

    if not brand_doc.exists:
        raise HTTPException(status_code=404, detail="Brand not found")

    brand_data = brand_doc.to_dict()

    # Verify ownership
    if brand_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this brand")

    return Brand(**brand_data)

@router.put("/{brand_id}", response_model=Brand)
async def update_brand(brand_id: str, brand_update: BrandUpdate, user_id: str = Depends(get_current_user_id)):
    """Update a brand"""
    brand_ref = db.collection('brands').document(brand_id)
    brand_doc = brand_ref.get()

    if not brand_doc.exists:
        raise HTTPException(status_code=404, detail="Brand not found")

    brand_data = brand_doc.to_dict()

    # Verify ownership
    if brand_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this brand")

    # Update fields
    update_data = brand_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow().isoformat()

    brand_ref.update(update_data)

    # Get updated brand
    updated_doc = brand_ref.get()
    return Brand(**updated_doc.to_dict())

@router.delete("/{brand_id}")
async def delete_brand(brand_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a brand"""
    brand_ref = db.collection('brands').document(brand_id)
    brand_doc = brand_ref.get()

    if not brand_doc.exists:
        raise HTTPException(status_code=404, detail="Brand not found")

    brand_data = brand_doc.to_dict()

    # Verify ownership
    if brand_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this brand")

    brand_ref.delete()

    return {"message": "Brand deleted successfully"}
