"""Autocomplete router for the active prototype path."""

from fastapi import APIRouter

from api_models import AnnotateRequest, SuggestionRequest
from services.autocomplete_service import annotate_text as annotate_text_service
from services.autocomplete_service import generate_suggestions

router = APIRouter()

@router.post("/api/suggestions")
async def get_suggestions(request: SuggestionRequest):
    brand_name = request.brandName or request.brandContext.get("brandName", "your brand")
    brand_category = request.brandCategory or request.brandContext.get("brandCategory", "business")
    session_id = request.sessionId or "default"

    return await generate_suggestions(
        brand_name=brand_name,
        brand_category=brand_category,
        current_text=request.currentText,
        session_id=session_id,
        model_config=request.modelConfig,
    )

@router.post("/api/annotate")
async def annotate_text(request: AnnotateRequest):
    return await annotate_text_service(request.sentenceText or "")
