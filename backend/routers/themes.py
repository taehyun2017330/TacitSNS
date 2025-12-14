from fastapi import APIRouter, HTTPException, Depends
from typing import List
from firebase_config import get_firestore_client
from dependencies.auth import get_current_user_id
from models.theme import Theme, ThemeCreate, ThemeUpdate
from datetime import datetime
import uuid

router = APIRouter()
db = get_firestore_client()

@router.post("/", response_model=Theme)
async def create_theme(theme_data: ThemeCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new theme for a brand"""
    # Verify brand ownership
    brand_ref = db.collection('brands').document(theme_data.brand_id)
    brand_doc = brand_ref.get()

    if not brand_doc.exists:
        raise HTTPException(status_code=404, detail="Brand not found")

    brand = brand_doc.to_dict()
    if brand.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to create theme for this brand")

    theme_id = str(uuid.uuid4())

    theme_dict = theme_data.model_dump()
    theme_dict.update({
        "id": theme_id,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Save to Firestore
    db.collection('themes').document(theme_id).set(theme_dict)

    return Theme(**theme_dict)

@router.get("/", response_model=List[Theme])
async def get_user_themes(brand_id: str = None, user_id: str = Depends(get_current_user_id)):
    """Get all themes for the authenticated user, optionally filtered by brand"""
    themes_ref = db.collection('themes').where('user_id', '==', user_id)

    if brand_id:
        themes_ref = themes_ref.where('brand_id', '==', brand_id)

    themes_docs = themes_ref.stream()

    themes = []
    for doc in themes_docs:
        theme_data = doc.to_dict()
        themes.append(Theme(**theme_data))

    return themes

@router.get("/{theme_id}", response_model=Theme)
async def get_theme(theme_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a specific theme by ID"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this theme")

    return Theme(**theme_data)

@router.put("/{theme_id}", response_model=Theme)
async def update_theme(theme_id: str, theme_update: ThemeUpdate, user_id: str = Depends(get_current_user_id)):
    """Update a theme"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this theme")

    # Update fields
    update_data = theme_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow().isoformat()

    theme_ref.update(update_data)

    # Get updated theme
    updated_doc = theme_ref.get()
    return Theme(**updated_doc.to_dict())

@router.delete("/{theme_id}")
async def delete_theme(theme_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a theme"""
    theme_ref = db.collection('themes').document(theme_id)
    theme_doc = theme_ref.get()

    if not theme_doc.exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    theme_data = theme_doc.to_dict()

    # Verify ownership
    if theme_data.get('user_id') != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this theme")

    theme_ref.delete()

    return {"message": "Theme deleted successfully"}
