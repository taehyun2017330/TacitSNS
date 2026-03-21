import json
import os
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

FALLBACK_LIBRARY: Dict[str, List[Dict[str, Any]]] = {
    "trust": [
        {
            "id": "trust-quality-process",
            "title": "Show our quality or process",
            "description": "Use one image direction to make standards, materials, or expertise feel visibly credible.",
            "taxonomyTags": ["Functional", "Educational"],
            "assistantPrompt": "Create image directions that make quality, care, and credibility feel visible.",
        },
        {
            "id": "trust-founder-expert",
            "title": "Show the founder or expert behind the brand",
            "description": "Make trust easier by putting a believable human perspective behind the product or service.",
            "taxonomyTags": ["Employee", "Brand resonance"],
            "assistantPrompt": "Create a post direction centered on human expertise and trusted presence.",
        },
        {
            "id": "trust-customer-proof",
            "title": "Translate customer proof into an image post",
            "description": "Turn reviews, outcomes, or believable testimony into a calm proof-led direction.",
            "taxonomyTags": ["Customer relationship"],
            "assistantPrompt": "Create a post direction that shows customer proof and reassurance.",
        },
        {
            "id": "trust-brand-stance",
            "title": "State what the brand stands for",
            "description": "Use a brand-led image direction to make the promise and standards feel clear.",
            "taxonomyTags": ["Brand resonance"],
            "assistantPrompt": "Create an editorial post direction that communicates brand standards and point of view.",
        },
    ],
    "awareness": [
        {
            "id": "awareness-brand-personality",
            "title": "Introduce the brand personality",
            "description": "Create a memorable first-impression image direction that teaches the brand mood quickly.",
            "taxonomyTags": ["Brand resonance", "Emotional"],
            "assistantPrompt": "Create a visually memorable introduction to the brand personality.",
        },
        {
            "id": "awareness-timely-conversation",
            "title": "Join a timely conversation",
            "description": "Use a seasonal or cultural hook so the brand feels current and easier to notice.",
            "taxonomyTags": ["Current event"],
            "assistantPrompt": "Create an on-brand image direction tied to a timely cultural or seasonal moment.",
        },
        {
            "id": "awareness-product-experience",
            "title": "Show the product experience visually",
            "description": "Help someone imagine what it feels like to encounter the brand for the first time.",
            "taxonomyTags": ["Experiential"],
            "assistantPrompt": "Create an image direction that makes the experience of the brand easy to picture.",
        },
        {
            "id": "awareness-memorable-introduction",
            "title": "Create a memorable first-impression post",
            "description": "Package the brand in a high-impact visual that reads in a few seconds.",
            "taxonomyTags": ["Brand resonance", "Emotional"],
            "assistantPrompt": "Create a quick-reading, memorable introduction to the brand.",
        },
    ],
    "educate": [
        {
            "id": "educate-how-it-works",
            "title": "Explain how the offer works",
            "description": "Turn the product or service into an image direction that teaches something clearly.",
            "taxonomyTags": ["Functional", "Educational"],
            "assistantPrompt": "Create an image direction that explains how the offer works.",
        },
        {
            "id": "educate-why-different",
            "title": "Explain why this brand is different",
            "description": "Clarify the distinctive method, ingredient, expertise, or approach behind the brand.",
            "taxonomyTags": ["Educational", "Brand resonance"],
            "assistantPrompt": "Create a post direction that makes the differentiator easy to understand.",
        },
        {
            "id": "educate-common-question",
            "title": "Answer a common customer question",
            "description": "Use one post direction to address confusion or hesitation directly.",
            "taxonomyTags": ["Customer relationship", "Educational"],
            "assistantPrompt": "Create an image direction that answers a real customer question.",
        },
        {
            "id": "educate-use-case",
            "title": "Teach the best use case",
            "description": "Show when, how, or for whom the offer fits best.",
            "taxonomyTags": ["Educational", "Functional"],
            "assistantPrompt": "Create a practical, use-case-led post direction.",
        },
    ],
    "engagement": [
        {
            "id": "engagement-opinion-hook",
            "title": "Start a low-effort conversation",
            "description": "Create a simple question or reaction prompt that invites easy participation.",
            "taxonomyTags": ["Brand community", "Current event"],
            "assistantPrompt": "Create a post direction designed to spark quick audience reactions.",
        },
        {
            "id": "engagement-personal-angle",
            "title": "Tell a personal or behind-the-scenes story",
            "description": "Make the brand feel more relatable through a human or in-progress moment.",
            "taxonomyTags": ["Personal brand posts", "Employee"],
            "assistantPrompt": "Create a human, behind-the-scenes post direction.",
        },
        {
            "id": "engagement-community-prompt",
            "title": "Invite the audience into the brand world",
            "description": "Ask people for preferences, reactions, or participation in a light way.",
            "taxonomyTags": ["Brand community", "Customer relationship"],
            "assistantPrompt": "Create a welcoming audience-participation prompt.",
        },
        {
            "id": "engagement-playful-moment",
            "title": "Create a playful brand moment",
            "description": "Use humor or a lighter challenge to make the brand feel active and social.",
            "taxonomyTags": ["Emotional", "Current event"],
            "assistantPrompt": "Create a playful, low-friction image direction for engagement.",
        },
    ],
    "sales": [
        {
            "id": "sales-offer-highlight",
            "title": "Highlight the offer clearly",
            "description": "Use a direct image direction that makes the value and next step clear.",
            "taxonomyTags": ["Sales promotion"],
            "assistantPrompt": "Create a post direction that makes the offer easy to understand and act on.",
        },
        {
            "id": "sales-worth-buying",
            "title": "Explain why this is worth buying",
            "description": "Support conversion with image directions that balance desire and practical proof.",
            "taxonomyTags": ["Functional", "Sales promotion"],
            "assistantPrompt": "Create a post direction that makes the offer feel worth buying.",
        },
        {
            "id": "sales-result-experience",
            "title": "Show the result or experience",
            "description": "Center the end state or payoff people want rather than only the product.",
            "taxonomyTags": ["Experiential", "Functional"],
            "assistantPrompt": "Create a post direction focused on the desired outcome or experience.",
        },
        {
            "id": "sales-objection-answer",
            "title": "Answer a common buying objection",
            "description": "Reduce hesitation around trust, price, effort, or fit.",
            "taxonomyTags": ["Customer relationship", "Educational"],
            "assistantPrompt": "Create a post direction that calmly resolves a buying objection.",
        },
    ],
    "community": [
        {
            "id": "community-customer-spotlight",
            "title": "Spotlight a customer or community member",
            "description": "Celebrate a real person so the brand feels relational rather than transactional.",
            "taxonomyTags": ["Brand community", "Customer relationship"],
            "assistantPrompt": "Create a post direction centered on community recognition.",
        },
        {
            "id": "community-shared-values",
            "title": "Reinforce the values people join for",
            "description": "Show what people identify with when they stay connected to this brand.",
            "taxonomyTags": ["Brand resonance", "Cause-related brand posts"],
            "assistantPrompt": "Create a values-led post direction that deepens brand belonging.",
        },
        {
            "id": "community-returning-routine",
            "title": "Create a recurring ritual or series",
            "description": "Make the post feel like part of a repeatable pattern people can return to.",
            "taxonomyTags": ["Brand community", "Experiential"],
            "assistantPrompt": "Create a recurring-series post direction that builds familiarity.",
        },
        {
            "id": "community-feedback-loop",
            "title": "Invite customer input and feedback",
            "description": "Use the image direction to make the audience feel heard and included.",
            "taxonomyTags": ["Customer relationship", "Brand community"],
            "assistantPrompt": "Create a post direction that asks for customer input and participation.",
        },
    ],
}


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def infer_business_goal_id(payload: Dict[str, Any]) -> str:
    explicit_id = str(payload.get("businessGoalId") or "").strip().lower()
    if explicit_id in FALLBACK_LIBRARY:
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
    goal_id = infer_business_goal_id(payload)
    return PostGoalSuggestionResponse(suggestions=FALLBACK_LIBRARY.get(goal_id, FALLBACK_LIBRARY["trust"]), source="fallback")


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
