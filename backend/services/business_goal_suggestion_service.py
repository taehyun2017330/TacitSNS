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
    allowed_goals = "\n".join(
        f'- {goal["id"]}: {goal["title"]} — {goal["description"]}'
        for goal in BUSINESS_GOAL_LIBRARY
    )

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

Choose only from these allowed goal buckets:
{allowed_goals}

Requirements:
- Return exactly 3 distinct goals.
- Use only the allowed ids above.
- Keep the canonical goal title for each chosen id.
- Write one concise description for what success would look like for this brand in SNS marketing.
- Write one concise rationale for why this goal fits this specific brand narrative.
- Think one step ahead: the selected business goal should support concrete post-goal generation next.
- Avoid generic filler language.

Return strict JSON:
{{
  "suggestions": [
    {{
      "id": "trust",
      "description": "One concise sentence explaining the business outcome for this brand.",
      "rationale": "One concise sentence explaining why this goal fits the brand narrative."
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
    seen_ids = set()

    for item in suggestions:
        if not isinstance(item, dict):
            continue

        goal_id = str(item.get("id") or "").strip()
        goal_definition = allowed_by_id.get(goal_id)
        if not goal_definition or goal_id in seen_ids:
            continue

        description = str(item.get("description") or goal_definition["description"]).strip()
        rationale = str(item.get("rationale") or "").strip()
        if not rationale:
            continue

        sanitized.append(
            {
                "id": goal_id,
                "title": goal_definition["title"],
                "description": description,
                "rationale": rationale,
            }
        )
        seen_ids.add(goal_id)

    if len(sanitized) != 3:
        raise ValueError("Business goal suggestion generation returned an incomplete set")

    return BusinessGoalSuggestionResponse(
        suggestions=sanitized,
        source="ai",
        model=MODEL_NAME,
        prompt=prompt,
    )
