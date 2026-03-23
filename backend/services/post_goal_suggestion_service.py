import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from openai import OpenAI

from api_models import PostGoalSuggestionResponse


MODEL_NAME = "gpt-4.1"

REPO_ROOT = Path(__file__).resolve().parents[2]
FALLBACK_LIBRARY_PATH = (
    REPO_ROOT / "frontend" / "src" / "data" / "postGoalFallbackLibrary.json"
)


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
    return "trust"


def build_fallback_suggestions(payload: Dict[str, Any]) -> PostGoalSuggestionResponse:
    fallback_library = load_fallback_library()
    goal_id = infer_business_goal_id(payload)
    return PostGoalSuggestionResponse(
        suggestions=fallback_library.get(goal_id, fallback_library["trust"]),
        source="fallback",
    )


async def generate_post_goal_suggestions(
    payload: Dict[str, Any],
) -> PostGoalSuggestionResponse:
    fallback = build_fallback_suggestions(payload)

    prompt = f"""
You are a senior social strategist and visual creative director helping a small business owner decide what to post on Instagram.

Your task:
Based on the brand context and business goal, generate 4 distinct post directions that this business would realistically want to create next.

For each post direction:
- make it feel like a type of post a real business owner would want in their feed
- make it strategically relevant to the business goal
- make it visually natural for the business category
- provide 1 specific example image concept that shows what this post direction could look like in practice

Important:
- A post direction is broader than a single image, but concrete enough that the owner can immediately understand the idea
- The example image concept should be one strong first image for that direction
- The 4 directions should feel meaningfully different from one another
- Do not force artificial diversity
- Do not use vague marketing filler
- Do not make the directions too abstract
- Do not make all 4 ideas variations of the same composition
- If the business sells a tangible product, at least 1 direction should visibly feature the product
- Prefer the kinds of Instagram directions real owners actually make: product spotlight, founder or maker story, customer proof, how-it-works education, brand-world image, campaign hook, seasonal moment, community participation, cause/initiative post, offer/promo, and similar realistic feed directions when they fit

Brand context:
- Brand name: {payload.get("brandName", "")}
- Industry/category: {payload.get("brandCategory", "")}
- Brand narrative: {payload.get("brandNarrative", "")}
- Brand identity: {payload.get("brandIdentity", "")}

Business goal:
- Title: {payload.get("businessGoalTitle", "")}
- Description: {payload.get("businessGoalDescription", "")}

You may add up to 2 taxonomy tags only after generating the idea, only if they fit naturally:
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
      "previewTitle": "Short label for the first example image concept",
      "previewCaption": "One concise sentence describing the first example image concept.",
      "assistantPrompt": "A concise image-generation brief for that first example image, describing likely subject matter, composition, mood, and what should be emphasized."
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
                    "content": "You are a senior social strategist and visual creative director. Recommend realistic Instagram post directions that feel concrete, tasteful, and usable by a real small business owner.",
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
                    "description": str(
                        item.get("description")
                        or f"A post direction focused on {title.lower()}."
                    ).strip(),
                    "taxonomyTags": [
                        str(tag).strip()
                        for tag in item.get("taxonomyTags", [])
                        if str(tag).strip()
                    ][:2],
                    "previewTitle": str(item.get("previewTitle") or "").strip() or None,
                    "previewCaption": str(item.get("previewCaption") or "").strip()
                    or None,
                    "assistantPrompt": str(
                        item.get("assistantPrompt")
                        or f"Create an image direction for {title}."
                    ).strip(),
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
