from pydantic import BaseModel

class User(BaseModel):
    """User model for HCI study - simple username-based auth"""
    uid: str
    username: str
    created_at: str

class UserResponse(BaseModel):
    """Model for user API responses"""
    uid: str
    username: str
    created_at: str
