import json
import os
from typing import Any, Dict, List

from openai import OpenAI

from api_models import BusinessGoalSuggestionResponse


MODEL_NAME = "gpt-4o"

BUSINESS_GOAL_LIBRARY: List[Dict[str, str]] = [
    {
        "id": "awareness",
        "title": "Increase awareness",
        "description": "Help more people notice the brand and remember what it stands for.",
    },
    {
        "id": "trust",
        "title": "Build trust",
        "description": "Make the brand feel credible, safe, and worth believing in.",
    },
    {
        "id": "educate",
        "title": "Educate customers",
        "description": "Explain what the product does, how it works, and why it matters.",
    },
    {
        "id": "engagement",
        "title": "Drive engagement",
        "description": "Invite people to react, comment, share, and participate with the brand.",
    },
    {
        "id": "sales",
        "title": "Generate sales/leads",
        "description": "Move viewers toward inquiries, purchases, bookings, or signups.",
    },
    {
        "id": "community",
        "title": "Strengthen community/loyalty",
        "description": "Reinforce belonging, repeat engagement, and longer-term attachment.",
    },
]


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def build_business_goal_prompt(payload: Dict[str, Any]) -> str:
    shared_goal_ids = ", ".join(goal["id"] for goal in BUSINESS_GOAL_LIBRARY)

    return f"""
You are a senior business design manager for a novice-friendly social media planning tool.

Your task is to recommend exactly 3 BUSINESS GOALS for this brand.

A business goal is the broader outcome the brand wants SNS marketing to support.
The next step after this will be POST GOALS: specific kinds of posts and image directions.
Choose goals that will naturally lead into strong post-goal exploration later.

Brand name: {payload.get("brandName", "your brand")}
Industry: {payload.get("brandCategory", "business")}
Brand identity: {payload.get("brandIdentity", "")}
Brand narrative: {payload.get("brandNarrative", "")}

Requirements:
- Return exactly 3 distinct goals.
- Infer the actual business goals from the brand narrative. Do not just repeat generic bucket labels unless they are truly the clearest wording.
- Each goal title should sound like a meaningful strategy direction a business owner would understand immediately.
- Write one concise description for what success would look like for this brand in SNS marketing.
- Write one concise rationale for why this goal fits this specific brand narrative.
- Think one step ahead: the selected business goal should support concrete post-goal generation next.
- Also include a hidden internal mapping field named "closestSharedGoalId" so the next post-goal step can continue smoothly.
- "closestSharedGoalId" must be one of: {shared_goal_ids}
- Avoid generic filler language.

Return strict JSON:
{{
  "suggestions": [
    {{
      "id": "build-premium-trust",
      "title": "Build premium trust",
      "description": "One concise sentence explaining the business outcome for this brand.",
      "rationale": "One concise sentence explaining why this goal fits the brand narrative.",
      "closestSharedGoalId": "trust"
    }}
  ]
}}
""".strip()


async def suggest_business_goals(payload: Dict[str, Any]) -> BusinessGoalSuggestionResponse:
    prompt = build_business_goal_prompt(payload)

    response = get_openai_client().chat.completions.create(
        model=MODEL_NAME,
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "Recommend business goals for social media strategy. Stay strategic, concrete, and novice-friendly.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        max_tokens=900,
    )

    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)
    suggestions = parsed.get("suggestions") or []
    if not isinstance(suggestions, list):
        suggestions = []

    allowed_by_id = {goal["id"]: goal for goal in BUSINESS_GOAL_LIBRARY}
    sanitized = []
    seen_titles = set()

    for item in suggestions:
        if not isinstance(item, dict):
            continue

        title = str(item.get("title") or "").strip()
        if not title:
            continue

        normalized_title = title.lower()
        if normalized_title in seen_titles:
            continue

        description = str(item.get("description") or "").strip()
        rationale = str(item.get("rationale") or "").strip()
        shared_goal_id = str(item.get("closestSharedGoalId") or "").strip()
        if not description or not rationale or shared_goal_id not in allowed_by_id:
            continue

        goal_id = str(item.get("id") or "").strip()
        if not goal_id:
            goal_id = title.lower().replace("'", "").replace("&", "and")
            goal_id = "-".join(part for part in goal_id.split() if part)
            goal_id = "".join(character for character in goal_id if character.isalnum() or character == "-").strip("-")
            if not goal_id:
                goal_id = f"business-goal-{len(sanitized) + 1}"

        sanitized.append(
            {
                "id": goal_id,
                "title": title,
                "description": description,
                "rationale": rationale,
                "closestSharedGoalId": shared_goal_id,
            }
        )
        seen_titles.add(normalized_title)

    if len(sanitized) != 3:
        raise ValueError("Business goal suggestion generation returned an incomplete set")

    return BusinessGoalSuggestionResponse(
        suggestions=sanitized,
        source="ai",
        model=MODEL_NAME,
    )
