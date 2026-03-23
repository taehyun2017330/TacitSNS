import json
import os
from typing import Any, Dict

from openai import OpenAI

from api_models import BusinessGoalSuggestionResponse


MODEL_NAME = "gpt-4o"


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def normalize_business_goal_description(text: str) -> str:
    normalized = text.strip()
    for prefix in (
        "success is ",
        "success means ",
        "success looks like ",
        "the goal is to ",
        "this goal is to ",
    ):
        if normalized.lower().startswith(prefix):
            normalized = normalized[len(prefix):].strip()
            if normalized:
                normalized = normalized[0].upper() + normalized[1:]
            break

    return normalized


def build_business_goal_prompt(payload: Dict[str, Any]) -> str:
    return f"""
You are a senior business design manager for a novice-friendly social media planning tool.

Your task is to recommend exactly 3 BUSINESS GOALS for this brand.

Think in terms of realistic reasons a brand would invest in SNS marketing right now.
These should feel like believable strategic aims, not abstract ideals.
The next step after this will be POST GOALS: specific kinds of posts and image directions.
Choose goals that will naturally lead into strong post-goal exploration later.

Brand name: {payload.get("brandName", "your brand")}
Industry: {payload.get("brandCategory", "business")}
Brand identity: {payload.get("brandIdentity", "")}
Brand narrative: {payload.get("brandNarrative", "")}

Requirements:
- Return exactly 3 distinct goals.
- Infer the actual business goals from the brand narrative.
- Each goal title should sound like a realistic reason this brand would use SNS marketing right now.
- Prefer goals with managerial realism such as launching or spotlighting a product, building a clearer brand image, driving trial or purchase, earning trust, explaining differentiation, growing a recognizable audience, or strengthening community around a specific point of view.
- Avoid vague value statements that sound admirable but not operational, such as "Celebrate Diversity in Beauty" or "Foster an Authentic Community", unless the brand context makes that the clearest business aim and you phrase it as an actionable strategic goal.
- Write one concise description for what success would look like for this brand in SNS marketing.
- Write one concise rationale for why this goal fits this specific brand narrative.
- Think one step ahead: the selected business goal should support concrete post-goal generation next.
- Avoid generic filler language.

Return strict JSON:
{{
  "suggestions": [
    {{
      "id": "build-premium-trust",
      "title": "Build premium trust",
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
        if not description or not rationale:
            continue
        description = normalize_business_goal_description(description)
        if not description:
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
