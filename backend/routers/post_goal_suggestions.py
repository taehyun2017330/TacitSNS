from fastapi import APIRouter

from api_models import PostGoalSuggestionRequest
from services.post_goal_suggestion_service import suggest_post_goals

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
    )
