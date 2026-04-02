import json
import os
from typing import Any, Dict, List, Optional

import openai
from dotenv import load_dotenv

from api_models import GeneratedBatchAnalysis

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
POST_IMAGE_ANALYSIS_MODEL = os.getenv("POST_IMAGE_ANALYSIS_MODEL", "gpt-4o")


def _create_openai_client():
    return openai.OpenAI()


def _fallback_delta_summary(
    action_type: Optional[str],
    direction: Optional[str],
    edit_instructions: Optional[List[str]],
    similarity: Optional[float],
) -> Dict[str, Any]:
    if edit_instructions:
        summary = f"Edited: {', '.join(edit_instructions[:2])}"
    elif direction:
        summary = f'Explored "{direction}" direction'
    elif action_type == "regenerate":
        summary = "Regenerated with a refreshed composition"
    elif action_type == "explore":
        if similarity is not None:
            summary = f"Explored variations at {int(similarity)}% similarity"
        else:
            summary = "Explored new visual variations"
    else:
        summary = "Refined the previous concept"

    return {
        "delta": summary,
        "visible_changes": [],
        "continuity": "Keeps the same overall concept",
    }


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def _ensure_sentence(value: str) -> str:
    cleaned = _clean_text(value)
    if not cleaned:
        return ""
    if cleaned[-1] in ".!?":
        return cleaned
    return f"{cleaned}."


def _title_from_direction(angle: str, index: int) -> str:
    cleaned = _clean_text(angle)
    if not cleaned:
        return f"Option {index + 1}"

    lowered = cleaned.lower()
    for token in [
        "showing ",
        "with ",
        "using ",
        "through ",
        "centered on ",
        "featuring ",
    ]:
        if token in lowered:
            cleaned = cleaned[lowered.index(token) + len(token) :]
            break

    cleaned = cleaned.split(".")[0].split(",")[0].strip(" -")
    words = [word for word in cleaned.split() if word]
    if not words:
        return f"Option {index + 1}"
    return " ".join(words[:4]).title()


def _extract_visual_keywords(
    angle: str, direction: Optional[str], index: int
) -> List[str]:
    text = _clean_text(f"{angle} {direction or ''}").lower()
    keyword_bank = [
        ("product", "product focus"),
        ("hero", "hero framing"),
        ("close", "tight crop"),
        ("detail", "detail emphasis"),
        ("texture", "texture-first"),
        ("ingredient", "ingredient storytelling"),
        ("lifestyle", "lifestyle context"),
        ("editorial", "editorial styling"),
        ("portrait", "human presence"),
        ("founder", "founder-led"),
        ("community", "community energy"),
        ("warm", "warm lighting"),
        ("soft", "soft palette"),
        ("premium", "premium finish"),
        ("minimal", "minimal composition"),
        ("clean", "clean layout"),
        ("bold", "bold contrast"),
        ("shelf", "shelf display"),
        ("in-use", "in-use moment"),
        ("moment", "moment-led scene"),
    ]

    extracted = [label for token, label in keyword_bank if token in text]
    fallback = [
        "clear focal point",
        "social-ready framing",
        "brand-led styling",
        "distinct composition",
        f"variation {index + 1}",
    ]

    combined: List[str] = []
    for value in extracted + fallback:
        if value not in combined:
            combined.append(value)
        if len(combined) == 5:
            break
    return combined


def _fallback_feedback_suggestions(
    angle: str,
    action_type: str,
    design_keywords: List[str],
) -> Dict[str, List[Dict[str, Any]]]:
    anchor = _title_from_direction(angle, 0).lower()
    top_keyword = design_keywords[0] if design_keywords else "the direction"

    def _suggestion(
        label: str,
        *,
        chip_label: Optional[str] = None,
        system_interpretation: str = "",
        follow_up_focus: str = "",
        dimension: Optional[str] = None,
        ambiguity: str = "medium",
        likely_follow_up: Optional[str] = None,
        follow_up_stage: Optional[str] = None,
    ) -> Dict[str, Any]:
        return {
            "label": label,
            "chipLabel": chip_label or label,
            "systemInterpretation": system_interpretation,
            "followUpFocus": follow_up_focus,
            "dimension": dimension,
            "ambiguity": ambiguity,
            "likelyFollowUp": likely_follow_up,
            "followUpStage": follow_up_stage,
        }

    return {
        "yes": [
            _suggestion(
                f"Strong {anchor} route",
                chip_label="Strong direction",
                system_interpretation="The user is affirming the overall image direction, not just one local detail.",
                follow_up_focus="Check whether this should be treated as a stable direction preference for the next round.",
                dimension="strategy",
                ambiguity="medium",
                likely_follow_up="summarize",
                follow_up_stage="micro",
            ),
            _suggestion(
                f"Clear {top_keyword}",
                chip_label="Clear focal point",
                system_interpretation="The user is responding to the visual emphasis and hierarchy.",
                follow_up_focus="Clarify whether the strength is coming from composition, product focus, or clarity.",
                dimension="composition",
                ambiguity="low",
                likely_follow_up="summarize",
                follow_up_stage="micro",
            ),
            _suggestion(
                "Feels usable for social",
                chip_label="Feels usable",
                system_interpretation="The user sees this as workable in a real social media context.",
                follow_up_focus="Confirm whether usability or broader brand fit is the key reason.",
                dimension="execution",
                ambiguity="low",
                likely_follow_up="summarize",
                follow_up_stage="micro",
            ),
        ],
        "no": [
            _suggestion(
                "Too close to the other options",
                chip_label="Too similar",
                system_interpretation="The user wants more separation from the other candidates.",
                follow_up_focus="Clarify whether the image needs a different direction or just a stronger execution shift.",
                dimension="strategy",
                ambiguity="high",
                likely_follow_up="clarify",
                follow_up_stage="micro",
            ),
            _suggestion(
                "Needs a clearer focal point",
                chip_label="Needs focus",
                system_interpretation="The user is reacting to hierarchy, crop, or where the eye lands first.",
                follow_up_focus="Ask what part of the composition is making the image feel unresolved.",
                dimension="composition",
                ambiguity="medium",
                likely_follow_up="probe",
                follow_up_stage="micro",
            ),
            _suggestion(
                (
                    "Does not push the direction far enough"
                    if action_type != "edit"
                    else "Edit did not go far enough"
                ),
                chip_label="Does not go far enough",
                system_interpretation="The user is reacting to how far the variation moved from the prior state.",
                follow_up_focus="Clarify whether they want a broader strategy shift or a stronger local edit.",
                dimension="strategy",
                ambiguity="high",
                likely_follow_up="clarify",
                follow_up_stage="micro",
            ),
        ],
        "unsure": [
            _suggestion(
                "Promising but needs refinement",
                chip_label="Promising, but unresolved",
                system_interpretation="The user sees potential but still needs one more concrete adjustment.",
                follow_up_focus="Probe which local visual dimension is still blocking confidence.",
                dimension="execution",
                ambiguity="high",
                likely_follow_up="probe",
                follow_up_stage="micro",
            ),
            _suggestion(
                "Direction works but execution could sharpen",
                chip_label="Right direction, weak execution",
                system_interpretation="The user accepts the overall route but not this specific execution.",
                follow_up_focus="Clarify whether the problem is composition, palette, typography, or background treatment.",
                dimension="strategy",
                ambiguity="high",
                likely_follow_up="clarify",
                follow_up_stage="micro",
            ),
        ],
    }


def _fallback_image_analysis(
    *,
    index: int,
    angle: str,
    direction: Optional[str],
    action_type: str,
) -> Dict[str, Any]:
    title = _title_from_direction(angle or direction or "", index)
    design_keywords = _extract_visual_keywords(angle, direction, index)
    summary = _ensure_sentence(
        angle
        or f"This option explores {title.lower()} as a concrete social media direction."
    )
    supports_goal = _ensure_sentence(
        f"It supports the post goal by making {title.lower()} the clearest visual distinction in this set"
    )
    differences = [
        f"Pushes {design_keywords[0]} harder than the surrounding options",
        "Keeps the composition visibly distinct inside the set",
    ]
    suggested_edits = [
        "Tighten the focal point",
        "Refine the lighting hierarchy",
        "Clarify the product or subject emphasis",
    ]
    return {
        "index": index + 1,
        "title": title,
        "summary": summary,
        "supportsGoal": supports_goal,
        "differencesFromSiblings": differences,
        "designKeywords": design_keywords,
        "feedbackSuggestions": _fallback_feedback_suggestions(
            angle or title, action_type, design_keywords
        ),
        "suggestedEdits": suggested_edits,
        "vibe": title.lower(),
    }


def _normalize_generation_batch_analysis(
    payload: Dict[str, Any],
    *,
    candidate_count: int,
    action_type: str,
    direction: Optional[str],
    direction_angles: Optional[List[str]],
    user_feedback: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    def _normalize_feedback_reason_entries(
        entries: Any,
        fallback_entries: List[Dict[str, Any]],
        max_items: int,
    ) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        if isinstance(entries, list):
            for entry in entries:
                if isinstance(entry, dict):
                    label = _clean_text(entry.get("label"))
                    if not label:
                        continue
                    normalized.append(
                        {
                            "label": label,
                            "chipLabel": _clean_text(entry.get("chipLabel")) or label,
                            "systemInterpretation": _clean_text(entry.get("systemInterpretation")),
                            "followUpFocus": _clean_text(entry.get("followUpFocus")),
                            "dimension": _clean_text(entry.get("dimension")) or None,
                            "ambiguity": _clean_text(entry.get("ambiguity")) or "medium",
                            "likelyFollowUp": _clean_text(entry.get("likelyFollowUp")) or None,
                            "followUpStage": _clean_text(entry.get("followUpStage")) or None,
                        }
                    )
                else:
                    label = _clean_text(entry)
                    if not label:
                        continue
                    normalized.append({"label": label, "chipLabel": label})
                if len(normalized) >= max_items:
                    break
        return normalized[:max_items] or fallback_entries[:max_items]

    raw_images = payload.get("images", []) if isinstance(payload, dict) else []
    normalized_images: Dict[int, Dict[str, Any]] = {}
    direction_angles = direction_angles or []

    for position, item in enumerate(raw_images):
        if not isinstance(item, dict):
            continue

        raw_index = item.get("index", position + 1)
        try:
            normalized_index = max(0, min(candidate_count - 1, int(raw_index) - 1))
        except Exception:
            normalized_index = position

        angle = (
            direction_angles[normalized_index]
            if normalized_index < len(direction_angles)
            else ""
        )
        fallback = _fallback_image_analysis(
            index=normalized_index,
            angle=angle,
            direction=direction,
            action_type=action_type,
        )
        normalized_images[normalized_index] = {
            "title": _clean_text(item.get("title")) or fallback["title"],
            "summary": _ensure_sentence(item.get("summary")) or fallback["summary"],
            "supportsGoal": _ensure_sentence(item.get("supportsGoal"))
            or fallback["supportsGoal"],
            "differencesFromSiblings": [
                _clean_text(entry)
                for entry in item.get("differencesFromSiblings", [])
                if _clean_text(entry)
            ][:3]
            or fallback["differencesFromSiblings"],
            "designKeywords": [
                _clean_text(entry)
                for entry in item.get("designKeywords", [])
                if _clean_text(entry)
            ][:6]
            or fallback["designKeywords"],
            "feedbackSuggestions": {
                "yes": _normalize_feedback_reason_entries(
                    item.get("feedbackSuggestions", {}).get("yes", []),
                    fallback["feedbackSuggestions"]["yes"],
                    4,
                ),
                "no": _normalize_feedback_reason_entries(
                    item.get("feedbackSuggestions", {}).get("no", []),
                    fallback["feedbackSuggestions"]["no"],
                    4,
                ),
                "unsure": _normalize_feedback_reason_entries(
                    item.get("feedbackSuggestions", {}).get("unsure", []),
                    fallback["feedbackSuggestions"]["unsure"],
                    3,
                ),
            },
            "suggestedEdits": [
                _clean_text(entry)
                for entry in item.get("suggestedEdits", [])
                if _clean_text(entry)
            ][:4]
            or fallback["suggestedEdits"],
            "vibe": _clean_text(item.get("vibe")) or fallback["vibe"],
        }

    images: List[Dict[str, Any]] = []
    for index in range(candidate_count):
        if index in normalized_images:
            images.append(normalized_images[index])
            continue
        angle = direction_angles[index] if index < len(direction_angles) else ""
        images.append(
            _fallback_image_analysis(
                index=index,
                angle=angle,
                direction=direction,
                action_type=action_type,
            )
        )

    feedback_chunks = []
    if user_feedback:
        for label, values in (
            ("likes", user_feedback.get("likes", [])),
            ("dislikes", user_feedback.get("dislikes", [])),
            ("unsure", user_feedback.get("unsure", [])),
        ):
            cleaned_values = [
                _clean_text(value) for value in values if _clean_text(value)
            ]
            if cleaned_values:
                feedback_chunks.append(f"{label}: {', '.join(cleaned_values[:4])}")

    overall_delta = _ensure_sentence(payload.get("overallDelta")) or _ensure_sentence(
        _fallback_delta_summary(action_type, direction, None, None)["delta"]
    )
    continuity = (
        _ensure_sentence(payload.get("continuity"))
        or "Keeps the same post goal while changing the visible execution."
    )
    visible_changes = [
        _clean_text(entry)
        for entry in payload.get("visible_changes", [])
        if _clean_text(entry)
    ][:4] or [image["title"] for image in images[:3]]
    keyword_shifts = [
        _clean_text(entry)
        for entry in payload.get("keyword_shifts", [])
        if _clean_text(entry)
    ][:4] or [
        keyword for image in images[:2] for keyword in image["designKeywords"][:2]
    ][
        :4
    ]
    bias_suggestions = [
        _clean_text(entry)
        for entry in payload.get("bias_suggestions", [])
        if _clean_text(entry)
    ][:4] or [
        f"Lean further into {images[0]['designKeywords'][0]}",
        f"Pull back from {images[-1]['designKeywords'][0]}",
    ]
    feedback_trace = [
        _clean_text(entry)
        for entry in payload.get("feedback_trace", [])
        if _clean_text(entry)
    ][:4] or feedback_chunks

    return {
        "overallDelta": overall_delta,
        "visible_changes": visible_changes,
        "continuity": continuity,
        "keyword_shifts": keyword_shifts,
        "bias_suggestions": bias_suggestions,
        "feedback_trace": feedback_trace,
        "images": images,
    }


def _fallback_generation_batch_analysis(
    *,
    candidate_count: int,
    action_type: str,
    direction: Optional[str],
    direction_angles: Optional[List[str]],
    user_feedback: Optional[Dict[str, Any]],
    clarification_context: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    payload = _normalize_generation_batch_analysis(
        {},
        candidate_count=candidate_count,
        action_type=action_type,
        direction=direction,
        direction_angles=direction_angles,
        user_feedback=user_feedback,
    )
    clarification_lines = [
        _clean_text(entry.get("summary"))
        for entry in (clarification_context or {}).get("activeInsights", [])[:2]
        if _clean_text(entry.get("summary"))
    ]
    if clarification_lines:
        payload["feedback_trace"] = [*clarification_lines, *payload.get("feedback_trace", [])][:4]
    return payload


def analyze_generation_batch(
    *,
    candidate_images: List[str],
    brand_context: str = "",
    action_type: str,
    direction: Optional[str] = None,
    direction_angles: Optional[List[str]] = None,
    prompt_batch: Optional[List[str]] = None,
    parent_image: Optional[str] = None,
    edit_instructions: Optional[List[str]] = None,
    similarity: Optional[float] = None,
    user_feedback: Optional[Dict[str, Any]] = None,
    clarification_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    if not candidate_images:
        return _fallback_generation_batch_analysis(
            candidate_count=0,
            action_type=action_type,
            direction=direction,
            direction_angles=direction_angles,
            user_feedback=user_feedback,
            clarification_context=clarification_context,
        )

    try:
        client = _create_openai_client()
        direction_lines = (
            "\n".join(
                f"- Candidate {index + 1}: {_clean_text(angle)}"
                for index, angle in enumerate(
                    (direction_angles or [])[: len(candidate_images)]
                )
                if _clean_text(angle)
            )
            or "- No explicit direction angles were provided."
        )
        prompt_lines = (
            "\n".join(
                f"- Prompt {index + 1}: {_clean_text(prompt)}"
                for index, prompt in enumerate(
                    (prompt_batch or [])[: len(candidate_images)]
                )
                if _clean_text(prompt)
            )
            or "- Prompt details unavailable."
        )
        feedback_lines = (
            "\n".join(
                f"- {label}: {', '.join([_clean_text(value) for value in values if _clean_text(value)][:4])}"
                for label, values in (
                    ("Likes", (user_feedback or {}).get("likes", [])),
                    ("Dislikes", (user_feedback or {}).get("dislikes", [])),
                    ("Unsure", (user_feedback or {}).get("unsure", [])),
                )
                if values
            )
            or "- No prior feedback yet."
        )
        clarification_lines = (
            "\n".join(
                f"- {_clean_text(entry.get('summary'))}"
                for entry in (clarification_context or {}).get("activeInsights", [])[:4]
                if _clean_text(entry.get("summary"))
            )
            or "- No clarification records yet."
        )
        edit_text = (
            ", ".join(
                [
                    _clean_text(value)
                    for value in (edit_instructions or [])
                    if _clean_text(value)
                ]
            )
            or "None"
        )
        similarity_text = similarity if similarity is not None else "N/A"

        content: List[Dict[str, Any]] = [
            {
                "type": "text",
                "text": f"""You are a senior social media designer reviewing one generation of candidate images.

Analyze the candidate images as a set.
- explain how each candidate is visually different from the others
- explain how the set as a whole differs from the parent/reference image when one is provided
- Talk about its design qualities, as a designer, different shots, different styles
- keep the language concrete, design-aware, and useful for future iteration
- focus on visible qualities such as composition, product visibility, camera distance, palette, lighting, styling, human presence, texture, and how usable the image is for a social media post

Context:
- Brand context: {brand_context or "N/A"}
- Action type: {action_type}
- Requested direction: {direction or "N/A"}
- Requested edits: {edit_text}
- Similarity target: {similarity_text}

Current candidate intentions:
{direction_lines}

Generation prompts:
{prompt_lines}

Feedback from the previous round:
{feedback_lines}

Clarified user intent:
{clarification_lines}

Return structured output:
- overallDelta: how this generation overall changed relative to the prior state or, if initial, what range the set opens up
- visible_changes: 3-4 concise changes visible across the set
- continuity: what stayed aligned with the post goal or brand
- keyword_shifts: 3-4 short phrases describing what visual qualities shifted in this generation
- bias_suggestions: 3-4 concise directions for biasing the next batch
- feedback_trace: 2-4 short lines describing how prior feedback appears to have influenced the set
- images: one entry per candidate image in the same order they appear

For each image entry:
- index: 1-based position of the candidate
- title: 2-5 words
- summary: one concise sentence about what this option emphasizes
- supportsGoal: one concise sentence about how it serves the post goal
- differencesFromSiblings: 2-3 short lines about how it differs from the other candidates
- designKeywords: 4-6 short designer-style phrases
- feedbackSuggestions:
  - yes/no/unsure: arrays of structured reason objects
  - each reason object must include:
    - label: concise critique phrasing
    - chipLabel: short chip copy for UI
    - systemInterpretation: what this critique likely means
    - followUpFocus: what the system should clarify if it asks a follow-up
    - dimension: one of color, background, typography, composition, product, lighting, mood, strategy, execution, other
    - ambiguity: low, medium, or high
    - likelyFollowUp: summarize, probe, clarify, or challenge
    - followUpStage: micro or macro
  - use micro for image-local critiques and macro for goal / direction / contradiction critiques
- suggestedEdits: 3-4 specific next edits
- vibe: 1-3 words
""",
            }
        ]

        if parent_image:
            content.extend(
                [
                    {"type": "text", "text": "Parent/reference image:"},
                    {"type": "image_url", "image_url": {"url": parent_image}},
                ]
            )

        for index, image in enumerate(candidate_images):
            content.extend(
                [
                    {"type": "text", "text": f"Candidate image {index + 1}:"},
                    {"type": "image_url", "image_url": {"url": image}},
                ]
            )

        response = client.beta.chat.completions.parse(
            model=POST_IMAGE_ANALYSIS_MODEL,
            messages=[{"role": "user", "content": content}],
            response_format=GeneratedBatchAnalysis,
            max_tokens=2500,
        )

        parsed = response.choices[0].message.parsed
        if not parsed:
            raise ValueError("No parsed generation analysis returned")

        return _normalize_generation_batch_analysis(
            parsed.model_dump(),
            candidate_count=len(candidate_images),
            action_type=action_type,
            direction=direction,
            direction_angles=direction_angles,
            user_feedback=user_feedback,
        )
    except Exception as e:
        print(f"Batch analysis error: {e}")
        return _fallback_generation_batch_analysis(
            candidate_count=len(candidate_images),
            action_type=action_type,
            direction=direction,
            direction_angles=direction_angles,
            user_feedback=user_feedback,
            clarification_context=clarification_context,
        )


def analyze_image(image_data: str, brand_context: str = "") -> Dict:
    try:
        client = _create_openai_client()
        image_url = image_data

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Analyze this marketing image. Extract what you see.
Return JSON:
- keywords: 8-10 words describing visual elements
- description: 20-30 word description
- vibe: one word feeling
Context: {brand_context}""",
                        },
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=200,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Analysis error: {e}")
        return {
            "keywords": ["marketing", "visual", "content", "social", "media"],
            "description": "Marketing visual content for social media",
            "vibe": "professional",
        }


def summarize_image_delta(
    parent_image: str,
    child_image: str,
    action_type: str,
    brand_context: str = "",
    direction: Optional[str] = None,
    edit_instructions: Optional[List[str]] = None,
    similarity: Optional[float] = None,
) -> Dict[str, Any]:
    if not parent_image or not child_image:
        return _fallback_delta_summary(
            action_type, direction, edit_instructions, similarity
        )

    try:
        client = _create_openai_client()
        edit_instruction_text = ", ".join(edit_instructions or []) or "None provided"

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""Compare these two marketing images.

The first image is the parent/reference.
The second image is the newly generated result.

Task:
- Focus only on visible changes between the two images
- Ignore imagined intent that is not actually visible
- Keep the main delta short and specific
- Mention what stayed consistent in the continuity field

Context:
- Action type: {action_type}
- Brand context: {brand_context or "N/A"}
- Exploration direction: {direction or "N/A"}
- Requested edits: {edit_instruction_text}
- Similarity target: {similarity if similarity is not None else "N/A"}

Return JSON with:
- delta: short sentence, max 18 words
- visible_changes: array of up to 3 brief bullets
- continuity: short sentence
""",
                        },
                        {"type": "image_url", "image_url": {"url": parent_image}},
                        {"type": "image_url", "image_url": {"url": child_image}},
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=250,
        )

        payload = json.loads(response.choices[0].message.content)
        delta = payload.get("delta", "").strip()

        if not delta:
            return _fallback_delta_summary(
                action_type, direction, edit_instructions, similarity
            )

        return {
            "delta": delta,
            "visible_changes": payload.get("visible_changes", [])[:3],
            "continuity": payload.get("continuity", "").strip(),
        }
    except Exception as e:
        print(f"Delta analysis error: {e}")
        return _fallback_delta_summary(
            action_type, direction, edit_instructions, similarity
        )
