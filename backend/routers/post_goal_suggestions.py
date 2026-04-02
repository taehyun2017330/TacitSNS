from fastapi import APIRouter, HTTPException

from api_models import PostGoalReferenceSuggestionRequest, PostGoalSuggestionRequest
from services.post_goal_suggestion_service import suggest_post_goals, suggest_reference_post_goal

router = APIRouter(tags=["post-goal-suggestions"])


@router.post("/api/post-goal-suggestions")
async def post_goal_suggestions(request: PostGoalSuggestionRequest):
    return await suggest_post_goals(
        brand_name=request.brandName or "your brand",
        brand_category=request.brandCategory or "business",
        brand_narrative=request.brandNarrative,
        business_goal_id=request.businessGoalId,
        business_goal_title=request.businessGoalTitle,
        business_goal_description=request.businessGoalDescription,
        business_goal_rationale=request.businessGoalRationale,
        brand_identity=request.brandIdentity,
    )


@router.post("/api/post-goal-reference-suggestion")
async def post_goal_reference_suggestion(request: PostGoalReferenceSuggestionRequest):
    try:
        return await suggest_reference_post_goal(
            brand_name=request.brandName or "your brand",
            brand_category=request.brandCategory or "business",
            brand_narrative=request.brandNarrative,
            business_goal_id=request.businessGoalId or "",
            business_goal_title=request.businessGoalTitle,
            business_goal_description=request.businessGoalDescription,
            reference_image_url=request.referenceImageUrl,
            business_goal_rationale=request.businessGoalRationale,
            brand_identity=request.brandIdentity,
        )
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=str(error) or "Failed to generate a reference-based post goal suggestion.",
        ) from error
