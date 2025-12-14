from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class User(BaseModel):
    """User model for Firestore"""
    uid: str
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserCreate(BaseModel):
    """Model for creating a new user"""
    email: EmailStr
    password: str
    display_name: Optional[str] = None

class UserUpdate(BaseModel):
    """Model for updating user information"""
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

class UserResponse(BaseModel):
    """Model for user API responses"""
    uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
