from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from api_models import (
    CaptionGenerationRequest,
    CaptionRequest,
    EditImageRequest,
    PostGenerationRequest,
)
from services.post_workflow_service import (
    edit_image,
    generate_captions,
    generate_captions_old,
    generate_post_images,
    summarize_persona,
)

router = APIRouter()


@router.post("/api/generate-post-images")
async def generate_post_images_endpoint(request: PostGenerationRequest):
    try:
        return await generate_post_images(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/edit-image")
async def edit_image_endpoint(request: EditImageRequest):
    if not request.suggestedEdits and not request.customEdit:
        raise HTTPException(status_code=400, detail="No edit instructions provided")

    try:
        return await edit_image(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/generate-captions")
async def generate_captions_endpoint(request: CaptionGenerationRequest):
    return await generate_captions(request)


@router.post("/api/generate-captions-old")
async def generate_captions_old_endpoint(request: CaptionRequest):
    return generate_captions_old(request)


@router.post("/api/summarize-persona")
async def summarize_persona_endpoint(history: Dict[str, Any]):
    return summarize_persona(history)
