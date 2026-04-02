import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from openai import OpenAI
from pydantic import BaseModel, Field

from api_models import (
    PostGoalDirectionItem,
    PostGoalReferenceSuggestionResponse,
    PostGoalSuggestionItem,
    PostGoalSuggestionResponse,
)


MODEL_NAME = os.getenv("POST_GOAL_SUGGESTION_MODEL", "gpt-4o")

REPO_ROOT = Path(__file__).resolve().parents[2]
FALLBACK_LIBRARY_PATH = (
    REPO_ROOT / "frontend" / "src" / "data" / "postGoalFallbackLibrary.json"
)


class PostGoalSuggestionLLMResponse(BaseModel):
    suggestions: List[PostGoalSuggestionItem] = Field(default_factory=list)


class PostGoalReferenceLLMResponse(BaseModel):
    suggestion: PostGoalSuggestionItem


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


def clean_inline_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def strip_terminal_punctuation(value: str) -> str:
    return value.rstrip(" .!?")


def ensure_sentence(value: str) -> str:
    cleaned = clean_inline_text(value)
    if not cleaned:
        return ""
    if cleaned[-1] in ".!?":
        return cleaned
    return f"{cleaned}."


def lower_sentence_start(value: str) -> str:
    if not value:
        return value
    return value[0].lower() + value[1:]


def build_why_this_direction_fits(
    payload: Dict[str, Any],
    item: PostGoalSuggestionItem,
    directions: List[Dict[str, str]],
) -> str:
    explicit_reason = ensure_sentence(item.whyThisDirectionFits)
    if explicit_reason:
        return explicit_reason

    business_goal = clean_inline_text(payload.get("businessGoalTitle")) or "the business goal"
    preview_caption = strip_terminal_punctuation(clean_inline_text(item.previewCaption))
    description = strip_terminal_punctuation(clean_inline_text(item.description))
    primary_direction = clean_inline_text(directions[0]["chip"]) if directions else ""

    if preview_caption:
        return ensure_sentence(
            f"It turns {business_goal.lower()} into a clearer first post by using {lower_sentence_start(preview_caption)}"
        )

    if description:
        return ensure_sentence(
            f"It gives {business_goal.lower()} a more concrete visual route by focusing on {lower_sentence_start(description)}"
        )

    if primary_direction:
        return ensure_sentence(
            f"It gives {business_goal.lower()} a usable first post through a {primary_direction.lower()} direction people can grasp quickly"
        )

    return ensure_sentence(
        f"It gives {business_goal.lower()} a clearer visual route the brand can explore next"
    )


def build_fallback_suggestions(payload: Dict[str, Any]) -> PostGoalSuggestionResponse:
    fallback_library = load_fallback_library()
    goal_id = infer_business_goal_id(payload)
    return PostGoalSuggestionResponse(
        suggestions=fallback_library.get(goal_id, fallback_library["trust"]),
        source="fallback",
    )


def sanitize_post_goal_item(
    payload: Dict[str, Any],
    item: PostGoalSuggestionItem,
    index: int,
) -> Optional[Dict[str, Any]]:
    title = str(item.title or "").strip()
    if not title:
        return None

    directions = []
    for direction in item.directions[:4]:
        if isinstance(direction, PostGoalDirectionItem):
            chip = str(direction.chip or "").strip()
            angle = str(direction.angle or "").strip()
        else:
            chip = ""
            angle = ""
        if not chip and not angle:
            continue
        directions.append(
            {
                "chip": chip or angle,
                "angle": angle or chip,
            }
        )

    if not directions:
        fallback_chips = [str(chip).strip() for chip in item.imageTypeChips if str(chip).strip()][:4]
        fallback_angles = [str(angle).strip() for angle in item.directionAngles if str(angle).strip()][:4]
        max_length = max(len(fallback_chips), len(fallback_angles))
        for direction_index in range(max_length):
            chip = fallback_chips[direction_index] if direction_index < len(fallback_chips) else ""
            angle = fallback_angles[direction_index] if direction_index < len(fallback_angles) else ""
            if not chip and not angle:
                continue
            directions.append(
                {
                    "chip": chip or angle,
                    "angle": angle or chip,
                }
            )

    return {
        "id": str(item.id or f"ai-post-goal-{index + 1}").strip(),
        "title": title,
        "description": str(
            item.description
            or f"A post direction focused on {title.lower()}."
        ).strip(),
        "whyThisDirectionFits": build_why_this_direction_fits(
            payload,
            item,
            directions,
        ),
        "taxonomyTags": [
            str(tag).strip() for tag in item.taxonomyTags if str(tag).strip()
        ][:2],
        "directions": directions,
        "imageTypeChips": [direction["chip"] for direction in directions][:4],
        "directionAngles": [direction["angle"] for direction in directions][:4],
        "previewTitle": str(item.previewTitle or "").strip() or None,
        "previewCaption": str(item.previewCaption or "").strip() or None,
        "assistantPrompt": str(
            item.assistantPrompt
            or f"Create an image direction for {title}."
        ).strip(),
    }


def sanitize_post_goal_items(
    payload: Dict[str, Any],
    items: List[PostGoalSuggestionItem],
    limit: int = 4,
) -> List[Dict[str, Any]]:
    sanitized = []
    for index, item in enumerate(items[:limit]):
        sanitized_item = sanitize_post_goal_item(payload, item, index)
        if sanitized_item:
            sanitized.append(sanitized_item)
    return sanitized


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
- also provide 4 concise visual direction angles for the first 2x2 generation grid
- explain in 1 sentence why this post direction is a smart first route for this brand right now

Important:
- A post direction is broader than a single image, but concrete enough that the owner can immediately understand the idea
- The example image concept should be one strong first image for that direction
- The 4 directions should feel meaningfully different from one another
- Do not make the directions too abstract
- Do not make all 4 ideas variations of the same composition
- If the business sells a tangible product, at least 1 post goal should focus on the product
- Prefer the kinds of Instagram directions real owners actually make: product spotlight, founder or maker story, customer proof, how-it-works education, brand-world image, campaign hook, seasonal moment, community participation, cause/initiative post, offer/promo, and similar realistic feed directions when they fit
- The 4 direction angles should all fit the same post goal, but feel different from one another
- The first direction angle should align closely with the example image concept

Brand context:
- Brand name: {payload.get("brandName", "")}
- Industry/category: {payload.get("brandCategory", "")}
- Brand narrative: {payload.get("brandNarrative", "")}


Business goal:
- Title: {payload.get("businessGoalTitle", "")}
- Description: {payload.get("businessGoalDescription", "")}

After generating each post direction, also provide 4 short direction chips.
These should name 4 different image directions that still belong to this same post goal.
Important chip rules:
- chip 1 should match the example image concept shown on the left
- chips 2, 3, and 4 should be alternate image directions for the same post goal
- the 4 chips should correspond to direction angles 1 through 4 in the same order
- keep them short, concrete, and visually legible
- do not use generic labels like "brand post" or "marketing image"
Examples of chip style:
- product hero
- founder portrait
- in-use detail
- testimonial proof
- shelf lineup
- event moment

You may optionally add up to 2 taxonomy tags only as secondary labels if they fit naturally:
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
      "whyThisDirectionFits": "One concise sentence explaining why this post direction is strategically useful for this brand and business goal right now.",
      "directions": [
        {{
          "chip": "Direction chip 1",
          "angle": "Direction angle 1"
        }},
        {{
          "chip": "Direction chip 2",
          "angle": "Direction angle 2"
        }},
        {{
          "chip": "Direction chip 3",
          "angle": "Direction angle 3"
        }},
        {{
          "chip": "Direction chip 4",
          "angle": "Direction angle 4"
        }}
      ],
      "taxonomyTags": ["Tag A", "Tag B"],
      "previewTitle": "Short label for the first example image concept",
      "previewCaption": "One concise sentence describing the first example image concept.",
      "assistantPrompt": "A concise image-generation brief for that first example image, describing likely subject matter, composition, mood, and what should be emphasized."
    }}
  ]
}}
"""

    try:
        response = get_openai_client().beta.chat.completions.parse(
            model=MODEL_NAME,
            temperature=0.6,
            response_format=PostGoalSuggestionLLMResponse,
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
            max_tokens=1400,
        )

        parsed = response.choices[0].message.parsed
        suggestions = parsed.suggestions if parsed else []
        if len(suggestions) == 0:
            return fallback

        sanitized = sanitize_post_goal_items(payload, suggestions)
        if not sanitized:
            return fallback

        return PostGoalSuggestionResponse(suggestions=sanitized, source="ai")
    except Exception as error:
        print(f"Post goal suggestion generation failed: {error}")
        return fallback


async def generate_reference_post_goal_suggestion(
    payload: Dict[str, Any],
) -> PostGoalReferenceSuggestionResponse:
    prompt = f"""
You are a senior social strategist and visual creative director helping a small business owner turn a reference image into a realistic Instagram post direction.

Your task:
Study the uploaded reference image together with the brand context and business goal.
Generate exactly 1 post goal that this brand could realistically add to its feed exploration next.

For the post goal:
- make it feel like a direction a real business owner would actually post
- keep it strategically relevant to the business goal
- let the uploaded image act as the first example exploration for this post goal
- generate 4 direction chips and 4 matching direction angles for how this same post goal could branch into the first 2x2 studio grid
- make sure chip 1 and direction angle 1 align closely with the uploaded image
- make chips 2, 3, and 4 distinct alternate directions inside the same post goal
- explain in 1 sentence why this is a smart post goal for this brand right now

Important:
- do not describe the uploaded image mechanically; convert it into a usable post-goal template
- do not output a generic fallback marketing idea
- do not make the 4 directions feel like the same shot with tiny wording changes
- if the brand sells a tangible product, keep the direction grounded in what a product post could realistically look like

Brand context:
- Brand name: {payload.get("brandName", "")}
- Industry/category: {payload.get("brandCategory", "")}
- Brand narrative: {payload.get("brandNarrative", "")}

Business goal:
- Title: {payload.get("businessGoalTitle", "")}
- Description: {payload.get("businessGoalDescription", "")}

Return strict JSON:
{{
  "suggestion": {{
    "id": "short-slug",
    "title": "Post goal title",
    "description": "One short sentence describing what kind of image post this becomes.",
    "whyThisDirectionFits": "One concise sentence explaining why this post direction is strategically useful for this brand and business goal right now.",
    "directions": [
      {{
        "chip": "Direction chip 1",
        "angle": "Direction angle 1"
      }},
      {{
        "chip": "Direction chip 2",
        "angle": "Direction angle 2"
      }},
      {{
        "chip": "Direction chip 3",
        "angle": "Direction angle 3"
      }},
      {{
        "chip": "Direction chip 4",
        "angle": "Direction angle 4"
      }}
    ],
    "previewTitle": "Short label for the uploaded image as the first example concept",
    "previewCaption": "One concise sentence describing why the uploaded image works as the first example inside this post goal.",
    "assistantPrompt": "A concise image-generation brief for direction 1 that reflects the uploaded image's subject matter, composition, mood, and emphasis."
  }}
}}
"""

    response = get_openai_client().beta.chat.completions.parse(
        model=MODEL_NAME,
        temperature=0.45,
        response_format=PostGoalReferenceLLMResponse,
        messages=[
            {
                "role": "system",
                "content": "You are a senior social strategist and visual creative director. Turn a reference image into one realistic Instagram post-goal draft with four distinct visual directions.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": str(payload.get("referenceImageUrl", "")).strip()},
                    },
                ],
            },
        ],
        max_tokens=900,
    )

    parsed = response.choices[0].message.parsed
    if not parsed or not parsed.suggestion:
        raise ValueError("Reference post goal generation returned no suggestion")

    sanitized = sanitize_post_goal_item(payload, parsed.suggestion, 0)
    if not sanitized:
        raise ValueError("Reference post goal generation returned an empty suggestion")

    if len(sanitized["directions"]) < 4:
        raise ValueError("Reference post goal generation returned incomplete directions")

    return PostGoalReferenceSuggestionResponse(
        suggestion=PostGoalSuggestionItem(**sanitized),
        source="ai",
    )


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


async def suggest_reference_post_goal(
    brand_name: str,
    brand_category: str,
    brand_narrative: str,
    business_goal_id: str,
    business_goal_title: str,
    business_goal_description: str,
    reference_image_url: str,
    business_goal_rationale: str = "",
    brand_identity: str = "",
) -> PostGoalReferenceSuggestionResponse:
    return await generate_reference_post_goal_suggestion(
        {
            "brandName": brand_name,
            "brandCategory": brand_category,
            "brandNarrative": brand_narrative,
            "businessGoalId": business_goal_id,
            "businessGoalTitle": business_goal_title,
            "businessGoalDescription": business_goal_description,
            "businessGoalRationale": business_goal_rationale,
            "brandIdentity": brand_identity,
            "referenceImageUrl": reference_image_url,
        }
    )
