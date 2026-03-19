from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from firebase_config import get_firestore_client
from dependencies.auth import get_current_user_id
from datetime import datetime
import uuid

router = APIRouter()
db = get_firestore_client()

class UsernameLogin(BaseModel):
    """Simple username login for HCI study"""
    username: str

class UserProfile(BaseModel):
    """User profile response"""
    uid: str
    username: str
    created_at: str

@router.post("/login", response_model=UserProfile)
async def login_with_username(login_data: UsernameLogin):
    """
    Simple username-based login for HCI study.
    Creates a user document if it doesn't exist.
    Returns user profile.
    """
    username = login_data.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    # Generate a simple UID based on username (for HCI study)
    # In production, you'd use Firebase Auth properly
    user_id = f"user_{username.lower().replace(' ', '_')}"

    # Check if user exists in Firestore
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()

    if user_doc.exists:
        # User exists, return their profile
        user_data = user_doc.to_dict()
        return UserProfile(**user_data)
    else:
        # Create new user
        user_profile = {
            "uid": user_id,
            "username": username,
            "created_at": datetime.utcnow().isoformat()
        }
        user_ref.set(user_profile)
        return UserProfile(**user_profile)

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(user_id: str = Depends(get_current_user_id)):
    """Get current user's profile (protected route example)"""
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = user_doc.to_dict()
    return UserProfile(**user_data)
