from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BrandInfo(BaseModel):
    name: str
    category: str
    description: str
    images: List[str] = Field(default_factory=list)


class PostGenerationRequest(BaseModel):
    brandSummary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    parentNodeId: Optional[str] = None
    parentImageUrl: Optional[str] = None
    parentKeywords: List[str] = Field(default_factory=list)
    direction: Optional[str] = None
    iteration: int = 0
    userFeedback: Optional[Dict[str, Any]] = None
    imagesFeedback: Optional[List[Dict[str, Any]]] = None
    explorationLevel: float = 0.5
    similarity: Optional[float] = None
    actionType: Optional[str] = None
    editOptions: Optional[Dict[str, Any]] = None
    numImages: int = 4


class EditImageRequest(BaseModel):
    imageUrl: str
    suggestedEdits: List[str] = Field(default_factory=list)
    customEdit: str = ""
    brandSummary: str


class CaptionRequest(BaseModel):
    imageUrl: str
    keywords: List[str] = Field(default_factory=list)
    brandInfo: Dict[str, Any] = Field(default_factory=dict)
    tone: str = "casual"


class CaptionGenerationRequest(BaseModel):
    imageUrl: str
    brandSummary: str
    tone: List[str] = Field(default_factory=lambda: ["professional"])
    length: str = "medium"
    includeHashtags: bool = True
    includeEmojis: bool = False
    customDirection: str = ""


class SuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    currentText: str
    sessionId: Optional[str] = None
    modelConfig: Dict[str, Any] = Field(default_factory=dict)
    brandContext: Dict[str, Any] = Field(default_factory=dict)


class AnnotateRequest(BaseModel):
    brandName: Optional[str] = None
    brandCategory: Optional[str] = None
    sentenceText: Optional[str] = None
    modelConfig: Dict[str, Any] = Field(default_factory=dict)


class PostGoalSuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    brandIdentity: str = ""
    brandNarrative: str = ""
    businessGoalId: Optional[str] = None
    businessGoalTitle: str
    businessGoalDescription: str = ""
    businessGoalRationale: str = ""


class PostGoalSuggestionItem(BaseModel):
    id: str
    title: str
    description: str
    taxonomyTags: List[str] = Field(default_factory=list)
    assistantPrompt: str
    previewTitle: Optional[str] = None
    previewCaption: Optional[str] = None
    previewBackground: Optional[str] = None


class PostGoalSuggestionResponse(BaseModel):
    suggestions: List[PostGoalSuggestionItem] = Field(default_factory=list)
    source: str = "fallback"
