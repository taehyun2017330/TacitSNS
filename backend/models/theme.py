from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PostData(BaseModel):
    """Post data model"""
    id: str
    theme_id: str
    image_url: str
    caption: str
    hashtags: List[str]
    post_type: str
    selected: bool = False
    scheduled_time: Optional[str] = None
    status: Optional[str] = 'draft'  # draft, scheduled, published

class ThemeBase(BaseModel):
    """Base theme model"""
    brand_id: str
    name: str
    posts_count: int
    mood: str
    colors: List[str]
    imagery: str
    tone: str
    caption_length: str
    use_emojis: bool
    use_hashtags: bool

class ThemeCreate(ThemeBase):
    """Model for creating a theme"""
    posts: List[PostData] = []

class ThemeUpdate(BaseModel):
    """Model for updating a theme"""
    name: Optional[str] = None
    posts_count: Optional[int] = None
    mood: Optional[str] = None
    colors: Optional[List[str]] = None
    imagery: Optional[str] = None
    tone: Optional[str] = None
    caption_length: Optional[str] = None
    use_emojis: Optional[bool] = None
    use_hashtags: Optional[bool] = None
    posts: Optional[List[PostData]] = None

class Theme(ThemeBase):
    """Theme model with all fields"""
    id: str
    user_id: str
    posts: List[PostData] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
