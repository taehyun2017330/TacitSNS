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
You are an expert social media strategist and visual design director helping a novice brand owner decide what kinds of posts to explore next.

Your job is to propose 4 post goals that feel specific, visually actionable, and strategically grounded in the brand context below.

Brand name: {payload.get("brandName", "your brand")}
Industry: {payload.get("brandCategory", "business")}
Brand identity: {payload.get("brandIdentity", "")}
Brand narrative: {payload.get("brandNarrative", "")}

Chosen business goal:
- Title: {payload.get("businessGoalTitle", "")}
- Meaning: {payload.get("businessGoalDescription", "")}
- Why it fits: {payload.get("businessGoalRationale", "")}

Create 4 POST GOALS.
A post goal is a concrete image direction the user could explore next, not a broad business objective.
Each one should sound like a plausible folder the user would click into to generate images.

Use this taxonomy as inspiration when shaping the suggestions. You may combine multiple categories when appropriate.

- Emotional brand posts: evoke emotion through emotionally worded framing, inspiring stories, humor, jokes, or trivia.
- Functional brand posts: highlight product or service performance, quality, affordability, design, style, reviews, awards, or green credentials.
- Educational brand posts: teach people something through tips, instructions, tutorials, blog-style information, outside articles, or expert explanations.
- Brand resonance: reinforce the brand promise and identity through brand image, personality, associations, branded products, slogans, symbols, celebrities, or brand history.
- Experiential brand posts: emphasize sensory qualities, physical action, lived use, events, performances, or pleasurable experiences around the brand.
- Current event: connect the brand to seasons, weather, holidays, anniversaries, sports, film, TV, or other timely cultural moments.
- Personal brand posts: connect to personal preferences, anecdotes, family, friendship, future plans, or personally meaningful situations.
- Employee brand posts: spotlight employees, founders, makers, experts, philosophies, hobbies, or behind-the-scenes perspectives.
- Brand community: reinforce participation, membership, fan identity, user-generated content, or community recognition.
- Customer relationship: invite feedback, reviews, testimony, service, needs, expectations, or customer conversation.
- Cause-related brand posts: highlight social causes, initiatives, programs, or values the brand supports.
- Sales promotion: encourage buying action with offers, discounts, launches, free samples, contests, or product competition.

Requirements:
- Stay grounded in the chosen business goal and brand narrative.
- Make each post goal concrete enough that a novice can imagine the image.
- Vary the set. Do not return 4 versions of the same idea.
- Use only taxonomy tags from this list:
  Emotional, Functional, Educational, Brand resonance, Experiential, Current event,
  Personal brand posts, Employee, Brand community, Customer relationship,
  Cause-related brand posts, Sales promotion
- Think like a strategist and an art director at the same time:
  each suggestion should imply what the image would show, not just what it would communicate.
- The assistantPrompt should read like a concise image-generation brief:
  mention likely subject matter, composition focus, mood, and what should be visually emphasized.
- If the brand appears to sell a tangible product or a visually identifiable offering, at least 1 suggestion should be product-centered or product-visible.
- If the narrative emphasizes representation, diversity, community, trust, care, quality, ingredients, or performance, reflect that in at least one suggestion where relevant.
- Avoid generic marketing filler such as "engaging content", "boost visibility", or "connect with audiences".

Return strict JSON:
{{
  "suggestions": [
    {{
      "id": "short-slug",
      "title": "Post goal title",
      "description": "One short sentence describing what kind of image post this becomes.",
      "taxonomyTags": ["Tag A", "Tag B"],
      "assistantPrompt": "A concise image-generation brief for this direction."
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
                    "content": "You are a senior social strategist and visual design lead. Recommend image-led post goals that are concrete, tasteful, and strategically grounded.",
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
