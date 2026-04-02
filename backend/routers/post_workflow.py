from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from api_models import (
    CaptionGenerationRequest,
    CaptionRequest,
    ClarificationDraftGoalUpdateRequest,
    ClarificationEvaluateRequest,
    ClarificationQuestionGenerationRequest,
    EditImageRequest,
    PostGenerationRequest,
)
from services.clarification_service import (
    draft_goal_update,
    evaluate_clarification,
    generate_clarification_question,
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


@router.post("/api/clarification/evaluate")
async def evaluate_clarification_endpoint(request: ClarificationEvaluateRequest):
    try:
        return await evaluate_clarification(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/clarification/question")
async def generate_clarification_question_endpoint(
    request: ClarificationQuestionGenerationRequest,
):
    try:
        return await generate_clarification_question(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/clarification/draft-goal-update")
async def draft_goal_update_endpoint(request: ClarificationDraftGoalUpdateRequest):
    try:
        return await draft_goal_update(request)
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
