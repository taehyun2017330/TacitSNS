import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from openai import OpenAI

from api_models import PostGoalSuggestionResponse


MODEL_NAME = "gpt-4o-mini"

BUSINESS_GOAL_KEYWORDS: Dict[str, List[str]] = {
    "trust": ["trust", "credible", "credibility", "safe", "proof", "legit", "quality", "expert", "science"],
    "awareness": ["awareness", "notice", "discover", "introduction", "introduce", "visibility", "memorable", "first impression"],
    "educate": ["educate", "education", "teach", "explain", "understand", "instruction", "question", "how it works"],
    "engagement": ["engagement", "engage", "comment", "share", "react", "participate", "conversation", "interactive"],
    "sales": ["sales", "leads", "lead", "buy", "purchase", "offer", "order", "signup", "conversion", "booking"],
    "community": ["community", "loyalty", "loyal", "belonging", "member", "fans", "relationship", "repeat"],
}

REPO_ROOT = Path(__file__).resolve().parents[2]
FALLBACK_LIBRARY_PATH = REPO_ROOT / "frontend" / "src" / "data" / "postGoalFallbackLibrary.json"


@lru_cache(maxsize=1)
def load_fallback_library() -> Dict[str, List[Dict[str, Any]]]:
    with FALLBACK_LIBRARY_PATH.open("r", encoding="utf-8") as handle:
        loaded = json.load(handle)

    return {
        str(goal_id): [dict(item) for item in suggestions]
        for goal_id, suggestions in loaded.items()
        if isinstance(goal_id, str) and isinstance(suggestions, list)
    }


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def infer_business_goal_id(payload: Dict[str, Any]) -> str:
    fallback_library = load_fallback_library()
    explicit_id = str(payload.get("businessGoalId") or "").strip().lower()
    if explicit_id in fallback_library:
        return explicit_id

    source = " ".join(
        [
            str(payload.get("businessGoalTitle") or ""),
            str(payload.get("businessGoalDescription") or ""),
            str(payload.get("businessGoalRationale") or ""),
        ]
    ).lower()

    best_goal = "trust"
    best_score = -1
    for goal_id, keywords in BUSINESS_GOAL_KEYWORDS.items():
        score = sum(2 for keyword in keywords if keyword in source)
        if score > best_score:
            best_goal = goal_id
            best_score = score

    return best_goal


def build_fallback_suggestions(payload: Dict[str, Any]) -> PostGoalSuggestionResponse:
    fallback_library = load_fallback_library()
    goal_id = infer_business_goal_id(payload)
    return PostGoalSuggestionResponse(
        suggestions=fallback_library.get(goal_id, fallback_library["trust"]),
        source="fallback"
    )


async def generate_post_goal_suggestions(payload: Dict[str, Any]) -> PostGoalSuggestionResponse:
    fallback = build_fallback_suggestions(payload)

    prompt = f"""
You are suggesting post goals for a social media onboarding flow.

Brand name: {payload.get("brandName", "your brand")}
Industry: {payload.get("brandCategory", "business")}
Brand identity: {payload.get("brandIdentity", "")}
Brand narrative: {payload.get("brandNarrative", "")}

Chosen business goal:
- Title: {payload.get("businessGoalTitle", "")}
- Meaning: {payload.get("businessGoalDescription", "")}
- Why it fits: {payload.get("businessGoalRationale", "")}

Suggest 4 POST GOALS, not business goals.
- A business goal is why the brand is using social media.
- A post goal is a specific kind of image post to explore next.
- Make the post goals concrete enough that a novice can imagine a post direction.
- Stay grounded in the chosen business goal and brand narrative.
- Use only these taxonomy tags when relevant:
  Emotional, Functional, Educational, Brand resonance, Experiential, Current event,
  Personal brand posts, Employee, Brand community, Customer relationship,
  Cause-related brand posts, Sales promotion

Return strict JSON:
{{
  "suggestions": [
    {{
      "id": "short-slug",
      "title": "Post goal title",
      "description": "One short sentence describing what kind of image post this becomes.",
      "taxonomyTags": ["Tag A", "Tag B"],
      "assistantPrompt": "One sentence that later guides image generation."
    }}
  ]
}}
"""

    try:
        response = get_openai_client().chat.completions.create(
            model=MODEL_NAME,
            temperature=0.6,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Generate novice-friendly post-goal suggestions. Do not output business goals or generic marketing jargon.",
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
        if not isinstance(suggestions, list) or len(suggestions) == 0:
            return fallback

        sanitized = []
        for index, item in enumerate(suggestions[:4]):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "")).strip()
            if not title:
                continue
            sanitized.append(
                {
                    "id": str(item.get("id") or f"ai-post-goal-{index + 1}").strip(),
                    "title": title,
                    "description": str(item.get("description") or f"A post direction focused on {title.lower()}.").strip(),
                    "taxonomyTags": [str(tag).strip() for tag in item.get("taxonomyTags", []) if str(tag).strip()],
                    "assistantPrompt": str(item.get("assistantPrompt") or f"Create an image direction for {title}.").strip(),
                }
            )

        if not sanitized:
            return fallback

        return PostGoalSuggestionResponse(suggestions=sanitized, source="ai")
    except Exception as error:
        print(f"Post goal suggestion generation failed: {error}")
        return fallback


async def suggest_post_goals(
    brand_name: str,
    brand_category: str,
    brand_narrative: str,
    business_goal_id: str,
    business_goal_title: str,
    business_goal_description: str,
    business_goal_rationale: str = "",
    brand_identity: str = "",
) -> PostGoalSuggestionResponse:
    return await generate_post_goal_suggestions(
        {
            "brandName": brand_name,
            "brandCategory": brand_category,
            "brandNarrative": brand_narrative,
            "businessGoalId": business_goal_id,
            "businessGoalTitle": business_goal_title,
            "businessGoalDescription": business_goal_description,
            "businessGoalRationale": business_goal_rationale,
            "brandIdentity": brand_identity,
        }
    )
