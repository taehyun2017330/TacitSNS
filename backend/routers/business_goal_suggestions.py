from fastapi import APIRouter

from api_models import BusinessGoalSuggestionRequest
from services.business_goal_suggestion_service import suggest_business_goals

router = APIRouter(tags=["business-goal-suggestions"])


@router.post("/api/business-goal-suggestions")
async def business_goal_suggestions(request: BusinessGoalSuggestionRequest):
    return await suggest_business_goals(
        {
            "brandName": request.brandName or "your brand",
            "brandCategory": request.brandCategory or "business",
            "brandIdentity": request.brandIdentity,
            "brandNarrative": request.brandNarrative,
        }
    )
