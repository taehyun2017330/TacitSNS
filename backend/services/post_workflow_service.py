import json
from typing import Any, Dict, List, Optional

import openai

from api_models import (
    CaptionGenerationRequest,
    CaptionRequest,
    EditImageRequest,
    PostGenerationRequest,
)
from image_generation_final import (
    analyze_image,
    generate_image_async,
    generate_image_prompts,
    summarize_image_delta,
)


def normalize_exploration_level(request: PostGenerationRequest) -> float:
    raw_value = request.similarity if request.similarity is not None else request.explorationLevel
    if raw_value is None:
        return 0.5

    if raw_value > 1:
        raw_value = raw_value / 100

    return max(0.0, min(1.0, raw_value))


def build_action_prompt(base_prompt: str, request: PostGenerationRequest, variant_index: int) -> str:
    prompt = base_prompt
    action_type = request.actionType or "initial"

    if request.direction:
        prompt += f"\nCreative direction: {request.direction}"

    if request.parentKeywords:
        prompt += f"\nReference keywords: {', '.join(request.parentKeywords[:8])}"

    if action_type == "explore":
        prompt += """
\nUse the reference image as a starting point and deliberately evolve it.
Keep recognizable brand DNA while changing the visible execution in a meaningful way.
"""
    elif action_type == "regenerate":
        prompt += """
\nRegenerate this concept from the same creative seed.
Keep the overall idea but change the composition, subject pose, framing, and styling enough to feel like a new candidate.
"""
    elif action_type == "edit":
        edit_instructions = collect_edit_instructions(request.editOptions)
        prompt += """
\nThis is a targeted edit of the reference image, not a new concept.
Preserve everything that is not explicitly mentioned below.
"""
        if edit_instructions:
            prompt += f"\nRequested edits: {', '.join(edit_instructions)}"

    prompt += f"\nVariation slot: {variant_index + 1}"
    return prompt


def get_generation_variance(action_type: Optional[str], exploration_level: float) -> int:
    if action_type == "edit":
        return 18
    if action_type == "regenerate":
        return int(25 + (exploration_level * 35))
    if action_type == "explore":
        return int(20 + (exploration_level * 60))
    return int(40 + (exploration_level * 40))


def collect_edit_instructions(edit_options: Optional[Dict[str, Any]]) -> List[str]:
    if not edit_options:
        return []

    edit_instructions = list(edit_options.get("suggestedEdits", []))
    custom_edit = edit_options.get("customEdit")
    if custom_edit:
        edit_instructions.append(custom_edit)
    return edit_instructions


def extract_brand_description(brand_summary: Optional[str]) -> str:
    brand_description = brand_summary or "Brand"
    if " - " in brand_description and ":" in brand_description:
        parts = brand_description.split(":")
        return parts[1].strip() if len(parts) > 1 else brand_description
    return brand_description


def extract_brand_name(brand_summary: Optional[str]) -> str:
    if not brand_summary:
        return "Brand"

    if ":" in brand_summary:
        return brand_summary.split(":")[0].strip()
    if "-" in brand_summary:
        return brand_summary.split("-")[0].strip()
    return brand_summary.strip() or "Brand"


async def generate_post_images(request: PostGenerationRequest) -> Dict[str, Any]:
    brand_description = extract_brand_description(request.brandSummary)
    exploration_level = normalize_exploration_level(request)
    prompts = generate_image_prompts(
        brand_description=brand_description,
        images_feedback=request.imagesFeedback,
        exploration_level=exploration_level,
        direction_angles=request.directionAngles,
    )

    num_to_generate = 1 if request.actionType == "edit" else request.numImages or 4
    prompt_batch = [
        build_action_prompt(prompt, request, index)
        for index, prompt in enumerate(prompts[:num_to_generate])
    ]
    variance = get_generation_variance(request.actionType, exploration_level)
    brand_name = extract_brand_name(request.brandSummary)
    edit_instructions = collect_edit_instructions(request.editOptions)

    image_urls = await _generate_image_batch(
        prompt_batch=prompt_batch,
        brand_name=brand_name,
        variance=variance,
        reference_image=request.parentImageUrl,
    )

    posts: List[Dict[str, Any]] = []
    delta_candidates: List[str] = []
    iteration = request.iteration or 0

    for index, image_url in enumerate(image_urls):
        analysis = analyze_image(image_url, brand_description)
        delta_summary = None

        if request.parentImageUrl:
            delta_summary = summarize_image_delta(
                parent_image=request.parentImageUrl,
                child_image=image_url,
                action_type=request.actionType or "explore",
                brand_context=brand_description,
                direction=request.direction,
                edit_instructions=edit_instructions,
                similarity=request.similarity if request.similarity is not None else request.explorationLevel,
            )
            if delta_summary.get("delta"):
                delta_candidates.append(delta_summary["delta"])

        posts.append(
            {
                "id": f"post_{iteration}_{index}",
                "imageUrl": image_url,
                "keywords": analysis.get("keywords", [])[:8],
                "description": analysis.get("description", ""),
                "vibe": analysis.get("vibe", ""),
                "deltaFromParent": delta_summary.get("delta") if delta_summary else None,
                "deltaDetails": delta_summary,
                "metadata": {
                    "iteration": iteration,
                    "variant": index,
                    "vibe": analysis.get("vibe", ""),
                    "prompt_used": prompt_batch[index],
                    "exploration_level": exploration_level,
                },
            }
        )

    return {
        "posts": posts,
        "delta": build_batch_delta(
            request=request,
            exploration_level=exploration_level,
            delta_candidates=delta_candidates,
            edit_instructions=edit_instructions,
        ),
        "iteration": iteration,
    }


async def _generate_image_batch(
    prompt_batch: List[str],
    brand_name: str,
    variance: int,
    reference_image: Optional[str],
) -> List[str]:
    import asyncio

    tasks = [
        generate_image_async(
            prompt,
            brand_name,
            variance=variance,
            reference_image=reference_image,
        )
        for prompt in prompt_batch
    ]

    return await asyncio.gather(*tasks)


def build_batch_delta(
    request: PostGenerationRequest,
    exploration_level: float,
    delta_candidates: List[str],
    edit_instructions: List[str],
) -> Optional[str]:
    if request.actionType == "edit" and edit_instructions:
        return f"Edited: {', '.join(edit_instructions[:2])}"
    if request.direction:
        return f'Explored "{request.direction}" direction'
    if delta_candidates:
        return delta_candidates[0]
    if request.imagesFeedback:
        liked = sum(1 for feedback in request.imagesFeedback if feedback.get("feedback_type") == "like")
        return f"Based on feedback ({liked}/4 liked) | Exploration: {int(exploration_level * 100)}%"
    if request.actionType == "regenerate":
        return "Regenerated a fresh set of variations"
    return None


async def edit_image(request: EditImageRequest) -> Dict[str, Any]:
    edit_instructions = list(request.suggestedEdits)
    if request.customEdit:
        edit_instructions.append(request.customEdit)

    edit_prompt = f"""Modify this marketing image with these changes:
{', '.join(edit_instructions)}

Brand: {request.brandSummary}
Keep the core concept but apply these specific edits."""

    edited_image = await generate_image_async(
        edit_prompt,
        extract_brand_name(request.brandSummary),
        variance=30,
    )
    analysis = analyze_image(edited_image, request.brandSummary)

    return {
        "imageUrl": edited_image,
        "keywords": analysis.get("keywords", []),
        "vibe": analysis.get("vibe", ""),
        "description": analysis.get("description", ""),
        "editApplied": edit_instructions,
    }


async def generate_captions(request: CaptionGenerationRequest) -> Dict[str, Any]:
    image_analysis = analyze_image(request.imageUrl, request.brandSummary)
    keywords = image_analysis.get("keywords", [])
    description = image_analysis.get("description", "")
    vibe = image_analysis.get("vibe", "")

    tone_str = ", ".join(request.tone) if request.tone else "professional"
    length_map = {
        "short": "1-2 lines (under 50 characters)",
        "medium": "3-4 lines (50-150 characters)",
        "long": "5+ lines (150-280 characters)",
    }

    prompt = f"""Generate 4 different Instagram captions for this marketing post.

Image description: {description}
Image vibe: {vibe}
Keywords from image: {', '.join(keywords)}
Brand: {request.brandSummary}

Requirements:
- Tone: {tone_str}
- Length: {length_map.get(request.length, length_map['medium'])}
- Include hashtags: {request.includeHashtags}
- Include emojis: {request.includeEmojis}
- Custom direction: {request.customDirection if request.customDirection else 'None'}

Generate 4 unique captions that would work well for this specific image and brand.
Return as a JSON object with a captions array."""

    try:
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=500,
            temperature=0.8,
        )
        captions_data = json.loads(response.choices[0].message.content)
        captions = extract_caption_list(captions_data)
    except Exception:
        captions = []

    if not captions:
        brand_name = extract_brand_name(request.brandSummary)
        hashtag_list = [f"#{keyword.replace(' ', '').replace('-', '')}" for keyword in keywords[:3]]
        hashtags = " ".join(hashtag_list) if request.includeHashtags else ""
        emoji = "✨" if request.includeEmojis else ""

        captions = [
            f"Discover something amazing today {emoji} {hashtags}".strip(),
            f"Your new favorite is here {emoji} #{brand_name} {hashtags}".strip(),
            f"Experience excellence like never before {emoji} {hashtags}".strip(),
            f"Join us on this journey {emoji} #{brand_name} {hashtags}".strip(),
        ]

    return {
        "captions": captions[:4],
        "imageAnalysis": {
            "keywords": keywords,
            "vibe": vibe,
            "description": description,
        },
    }


def extract_caption_list(captions_data: Any) -> List[str]:
    if isinstance(captions_data, dict):
        captions = captions_data.get("captions", [])
        if captions:
            return captions
        return captions_data.get("results", captions_data.get("options", []))
    if isinstance(captions_data, list):
        return captions_data
    return []


def generate_captions_old(request: CaptionRequest) -> Dict[str, Any]:
    keywords = request.keywords
    tone = request.tone
    brand_name = request.brandInfo.get("name", "YourBrand") if request.brandInfo else "YourBrand"

    caption_templates = {
        "casual": [
            f"Just dropped something special for you! 🎉 #{brand_name}",
            f"Vibes on point today ✨ Check this out! #{brand_name}",
            f"Your daily dose of awesome 💫 #{brand_name}",
            f"Can't keep calm about this one! 🔥 #{brand_name}",
        ],
        "professional": [
            f"Introducing our latest innovation. Learn more at {brand_name}.",
            f"Excellence meets innovation. Discover what's new at {brand_name}.",
            f"Setting new standards in the industry. #{brand_name}",
            f"Transforming the way you work. Experience {brand_name}.",
        ],
        "playful": [
            f"Plot twist: This is amazing! 🎨 #{brand_name}",
            f"Warning: May cause extreme happiness! 😄 #{brand_name}",
            f"Spoiler alert: You're going to love this! 🌈 #{brand_name}",
            f"Breaking: Fun levels off the charts! 🚀 #{brand_name}",
        ],
    }

    base_captions = caption_templates.get(tone, caption_templates["casual"])
    hashtags = [f"#{keyword.replace(' ', '').replace('-', '')}" for keyword in keywords[:3]]

    captions = []
    for index, base_caption in enumerate(base_captions):
        caption = base_caption
        if index < 2:
            caption += " " + " ".join(hashtags)

        captions.append(
            {
                "text": caption,
                "tone": tone,
                "hashtags": hashtags if index < 2 else [],
                "length": len(caption),
            }
        )

    return {"captions": captions, "recommendedIndex": 0}


def summarize_persona(history: Dict[str, Any]) -> Dict[str, Any]:
    nodes = history.get("nodes", {})
    edges = history.get("edges", [])

    if not nodes:
        return {
            "summary": "No exploration history yet",
            "preferences": [],
            "patterns": [],
        }

    keywords_frequency: Dict[str, int] = {}
    directions_used: List[str] = []

    for node_data in nodes.values():
        if "posts" not in node_data:
            continue
        for post in node_data["posts"]:
            for keyword in post.get("keywords", []):
                keywords_frequency[keyword] = keywords_frequency.get(keyword, 0) + 1

    for edge in edges:
        if "data" in edge and "direction" in edge["data"]:
            directions_used.append(edge["data"]["direction"])

    top_keywords = sorted(keywords_frequency.items(), key=lambda item: item[1], reverse=True)[:5]
    preferences = [keyword for keyword, _ in top_keywords]
    patterns = list(set(directions_used))[:3] if directions_used else ["exploratory"]

    summary = f"Your style leans toward {', '.join(preferences[:3]) if preferences else 'varied content'}. "
    summary += f"You tend to explore {', '.join(patterns) if patterns else 'different directions'}."

    return {
        "summary": summary,
        "preferences": preferences,
        "patterns": patterns,
        "topKeywords": dict(top_keywords),
        "explorationCount": len(nodes),
        "directionCount": len(set(directions_used)),
    }
