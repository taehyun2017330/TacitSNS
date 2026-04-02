"""Brand narrative autocomplete service for the onboarding flow."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from openai import OpenAI

MODEL_CONFIG = {
    "checklist_analysis": {"model": "gpt-4o-mini", "temperature": 0.2},
    "starter_suggestions": {"model": "gpt-4o", "temperature": 0.6},
    "continuation_suggestions": {"model": "gpt-4o", "temperature": 0.55},
}

CHECKLIST_STEPS: List[Dict[str, str]] = [
    {
        "id": "offer",
        "label": "What you sell",
        "hint": "Mention the product, service, or offer.",
    },
    {
        "id": "audience",
        "label": "Who it is for",
        "hint": "Name the target customer or audience.",
    },
    {
        "id": "emphasis",
        "label": "What you want to emphasize",
        "hint": "Call out the quality, difference, or result people should notice.",
    },
    {
        "id": "tone",
        "label": "How it should come across",
        "hint": "Describe the tone, personality, or feeling the brand should project.",
    },
]

STARTER_FALLBACKS: Dict[str, List[str]] = {
    "offer": [
        "{brandName} sells",
        "{brandName} offers",
        "{brandName} provides",
        "{brandName} creates",
    ],
    "audience": [
        "It is for",
        "It is made for",
        "We serve",
        "It is designed for",
    ],
    "emphasis": [
        "What sets us apart is",
        "We want to emphasize",
        "The main thing people should notice is",
        "We stand out through",
    ],
    "tone": [
        "The brand should feel",
        "Our tone should be",
        "We want to come across as",
        "The brand should come across as",
    ],
}

CONTINUATION_FALLBACKS: Dict[str, List[Dict[str, str]]] = {
    "offer": [
        {"text": "hair care products", "type": "continuation"},
        {"text": "skincare products", "type": "continuation"},
        {"text": "natural care products", "type": "continuation"},
        {"text": "daily care solutions.", "type": "sentence_end"},
    ],
    "audience": [
        {"text": "for people who want", "type": "continuation"},
        {"text": "for customers with", "type": "continuation"},
        {"text": "for those looking for", "type": "continuation"},
        {"text": "for people with sensitive needs.", "type": "sentence_end"},
    ],
    "emphasis": [
        {"text": "with a focus on", "type": "continuation"},
        {"text": "while emphasizing", "type": "continuation"},
        {"text": "by highlighting", "type": "continuation"},
        {"text": "with a clear focus on quality.", "type": "sentence_end"},
    ],
    "tone": [
        {"text": "and should feel", "type": "continuation"},
        {"text": "while coming across as", "type": "continuation"},
        {"text": "with a tone that feels", "type": "continuation"},
        {"text": "calm, trustworthy, and reassuring.", "type": "sentence_end"},
    ],
}

VALID_SENTENCE_STATES = {"fragment", "developing", "complete"}
VALID_RECOMMENDED_ACTIONS = {
    "continue_sentence",
    "finish_sentence",
    "start_new_sentence",
}
VALID_CONTINUATION_TYPES = {"continuation", "sentence_end"}
AUTOCOMPLETE_SESSION_MEMORY: Dict[str, Dict[str, Any]] = {}
_OPENAI_CLIENT: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        _OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _OPENAI_CLIENT


def normalize_whitespace(text: str) -> str:
    return " ".join(text.split())


def strip_trailing_ellipsis(text: str) -> str:
    return re.sub(r"\s*(?:\.\.\.|…)+\s*$", "", text.strip())


def strip_trailing_terminal_punctuation(text: str) -> str:
    return re.sub(r"[.!?]+$", "", text.strip())


def ends_with_terminal_punctuation(text: str) -> bool:
    return text.rstrip().endswith((".", "!", "?"))


def extract_current_fragment(text: str) -> str:
    stripped = text.rstrip()
    if not stripped:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", stripped)
    return parts[-1].strip() if parts else stripped


def starts_with_acronym(text: str) -> bool:
    first_token = (text.strip().split() or [""])[0]
    return len(first_token) > 1 and first_token.isupper()


def get_step(step_id: str) -> Dict[str, str]:
    return next(
        (step for step in CHECKLIST_STEPS if step["id"] == step_id), CHECKLIST_STEPS[0]
    )


def get_next_uncovered_step(covered: Dict[str, bool]) -> str:
    for step in CHECKLIST_STEPS:
        if not covered.get(step["id"], False):
            return step["id"]
    return "none"


def derive_overall_assessment(covered_count: int) -> tuple[str, str]:
    if covered_count >= len(CHECKLIST_STEPS):
        return "complete", "Complete"
    if covered_count >= 2:
        return "progressing", "Progressing"
    return "incomplete", "Starting"


def build_status_message(next_element: str, recommended_action: str) -> str:
    if next_element != "none":
        return f"Next, make {get_step(next_element)['label'].lower()} clearer."
    if recommended_action == "finish_sentence":
        return "Finish this sentence with one concrete detail."
    if recommended_action == "start_new_sentence":
        return "You can start a new sentence or refine the tone."
    return "Keep the narrative specific and concrete."


def get_session_memory(session_id: str) -> Optional[Dict[str, Any]]:
    if not session_id or session_id == "default":
        return None
    return AUTOCOMPLETE_SESSION_MEMORY.get(session_id)


def clear_session_memory(session_id: str) -> None:
    if session_id and session_id != "default":
        AUTOCOMPLETE_SESSION_MEMORY.pop(session_id, None)


def build_previous_progress_lines(session_id: str) -> str:
    previous = get_session_memory(session_id)
    if not previous:
        return "No previous checklist state yet."

    lines: List[str] = []
    for step in CHECKLIST_STEPS:
        step_id = step["id"]
        status = (
            "covered" if (previous.get("covered") or {}).get(step_id) else "missing"
        )
        evidence = (previous.get("evidence") or {}).get(step_id, "")
        line = f"- {step['label']}: {status}"
        if evidence:
            line += f' | evidence: "{evidence}"'
        lines.append(line)
    return "\n".join(lines)


def merge_sticky_progress(
    session_id: str, current_text: str, analysis: Dict[str, Any]
) -> Dict[str, Any]:
    normalized_text = normalize_whitespace(current_text)
    if not normalized_text:
        clear_session_memory(session_id)
        return analysis

    previous = get_session_memory(session_id)
    if previous:
        previous_text = previous.get("text", "")
        previous_length = len(previous_text)
        current_length = len(normalized_text)
        allow_sticky = current_length >= max(20, int(previous_length * 0.7))

        if allow_sticky:
            for step in CHECKLIST_STEPS:
                step_id = step["id"]
                if analysis["covered"].get(step_id):
                    continue
                if (previous.get("covered") or {}).get(step_id):
                    analysis["covered"][step_id] = True
                    analysis["evidence"][step_id] = analysis["evidence"].get(
                        step_id
                    ) or (previous.get("evidence") or {}).get(step_id, "")

    covered_count = sum(1 for value in analysis["covered"].values() if value)
    analysis["overall_status"], analysis["overall_assessment"] = (
        derive_overall_assessment(covered_count)
    )
    analysis["next_element"] = get_next_uncovered_step(analysis["covered"])
    analysis["status_message"] = build_status_message(
        analysis["next_element"], analysis["recommended_action"]
    )

    if session_id and session_id != "default":
        AUTOCOMPLETE_SESSION_MEMORY[session_id] = {
            "text": normalized_text,
            "covered": dict(analysis["covered"]),
            "evidence": dict(analysis["evidence"]),
        }

    return analysis


def normalize_model_evidence(raw_evidence: Any, current_text: str) -> str:
    if not isinstance(raw_evidence, str):
        return ""
    cleaned = normalize_whitespace(raw_evidence.strip().strip('"'))
    normalized_current = normalize_whitespace(current_text).lower()
    if cleaned and cleaned.lower() in normalized_current:
        return cleaned[:140]
    return ""


def trim_evidence_excerpt(text: str) -> str:
    cleaned = normalize_whitespace(text.strip().strip(",;:"))
    return cleaned[:140]


def text_has_human_audience_markers(text: str) -> bool:
    lowered = text.lower()
    audience_terms = (
        "people",
        "person",
        "customers",
        "customer",
        "women",
        "woman",
        "men",
        "man",
        "parents",
        "professionals",
        "students",
        "teens",
        "adults",
        "kids",
        "children",
        "individuals",
        "those",
        "anyone",
        "users",
        "clients",
        "founders",
        "creators",
        "families",
        "mothers",
        "fathers",
    )
    if any(term in lowered for term in audience_terms):
        return True
    if re.search(r"\b\d{2}s\b", lowered):
        return True
    if re.search(r"\b(?:asian|korean|japanese|black|latina|latino|female|male)\b", lowered):
        return True
    return False


def find_explicit_offer_evidence(current_text: str) -> str:
    patterns = [
        r"\b(?:offers|sells|provides|creates|makes)\s+[^.!?]{0,100}",
        r"\b(?:brand|company|business)\s+that\s+(?:offers|sells|provides|creates)\s+[^.!?]{0,100}",
    ]

    for pattern in patterns:
        match = re.search(pattern, current_text, re.IGNORECASE)
        if match:
            return trim_evidence_excerpt(match.group(0))
    return ""


def find_explicit_audience_evidence(current_text: str) -> str:
    patterns = [
        r"\b(?:designed|made|built|created)\s+for\s+[^.!?]{0,120}",
        r"\bfor\s+[^.!?]{0,120}",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, current_text, re.IGNORECASE):
            excerpt = trim_evidence_excerpt(match.group(0))
            if text_has_human_audience_markers(excerpt):
                return excerpt

    who_match = re.search(
        r"\bwho\s+(?:want|wants|value|values|need|needs|prioritize|prioritizes|care about)\b[^.!?]{0,100}",
        current_text,
        re.IGNORECASE,
    )
    if who_match:
        return trim_evidence_excerpt(who_match.group(0))
    return ""


def find_explicit_emphasis_evidence(current_text: str) -> str:
    patterns = [
        r"\bwhat\s+sets\s+us\s+apart\s+is\s+[^.!?]{0,120}",
        r"\b(?:focus(?:ed)?\s+on|emphasiz(?:e|es|ing)|highlight(?:s|ing)?|prioritize(?:s|d)?|with\s+a\s+focus\s+on)\s+[^.!?]{0,120}",
    ]

    for pattern in patterns:
        match = re.search(pattern, current_text, re.IGNORECASE)
        if match:
            return trim_evidence_excerpt(match.group(0))

    quality_markers = (
        "luxurious",
        "natural",
        "gentle",
        "effective",
        "premium",
        "quality",
        "safe",
        "clear",
        "radiant",
        "trusted",
        "modern",
        "fda",
    )
    for sentence in re.split(r"(?<=[.!?])\s+", current_text):
        normalized_sentence = normalize_whitespace(sentence)
        lowered = normalized_sentence.lower()
        if any(marker in lowered for marker in quality_markers):
            return trim_evidence_excerpt(normalized_sentence)
    return ""


def find_explicit_tone_evidence(current_text: str) -> str:
    patterns = [
        r"\b(?:tone\s+should\s+be|brand\s+should\s+feel|brand\s+should\s+come\s+across(?:\s+as)?|should\s+feel|should\s+sound|should\s+come\s+across(?:\s+as)?)\s+[^.!?]{0,120}",
        r"\b(?:feel|feels|sound|sounds|come\s+across(?:\s+as)?)\s+(?:warm|calm|trustworthy|premium|friendly|playful|bold|luxurious|professional|reassuring|modern|approachable|confident|clean|elevated|credible|joyful|welcoming|sophisticated|soft)\b[^.!?]{0,80}",
    ]

    for pattern in patterns:
        match = re.search(pattern, current_text, re.IGNORECASE)
        if match:
            return trim_evidence_excerpt(match.group(0))
    return ""


def apply_explicit_coverage_overrides(
    current_text: str, covered: Dict[str, bool], evidence: Dict[str, str]
) -> None:
    explicit_offer = find_explicit_offer_evidence(current_text)
    if explicit_offer:
        covered["offer"] = True
        if not evidence.get("offer"):
            evidence["offer"] = explicit_offer

    explicit_audience = find_explicit_audience_evidence(current_text)
    if explicit_audience:
        covered["audience"] = True
        if not evidence.get("audience"):
            evidence["audience"] = explicit_audience

    explicit_emphasis = find_explicit_emphasis_evidence(current_text)
    if explicit_emphasis:
        covered["emphasis"] = True
        if not evidence.get("emphasis"):
            evidence["emphasis"] = explicit_emphasis

    explicit_tone = find_explicit_tone_evidence(current_text)
    if explicit_tone:
        covered["tone"] = True
        if not evidence.get("tone"):
            evidence["tone"] = explicit_tone


def fallback_analysis(current_text: str, session_id: str) -> Dict[str, Any]:
    previous = get_session_memory(session_id)
    if previous:
        covered = dict(previous.get("covered") or {})
        evidence = dict(previous.get("evidence") or {})
    else:
        covered = {step["id"]: False for step in CHECKLIST_STEPS}
        evidence = {step["id"]: "" for step in CHECKLIST_STEPS}

    current_sentence_state = (
        "complete"
        if ends_with_terminal_punctuation(current_text)
        else ("developing" if current_text.strip() else "fragment")
    )
    recommended_action = (
        "start_new_sentence"
        if current_sentence_state == "complete"
        else "continue_sentence"
    )
    covered_count = sum(1 for value in covered.values() if value)
    overall_status, overall_assessment = derive_overall_assessment(covered_count)
    next_element = get_next_uncovered_step(covered)

    return {
        "covered": covered,
        "evidence": evidence,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": build_status_message(next_element, recommended_action),
        "current_sentence_state": current_sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }


def build_local_incremental_analysis(
    current_text: str, session_id: str
) -> Dict[str, Any]:
    previous = get_session_memory(session_id)
    if previous:
        covered = dict(previous.get("covered") or {})
        evidence = dict(previous.get("evidence") or {})
    else:
        covered = {step["id"]: False for step in CHECKLIST_STEPS}
        evidence = {step["id"]: "" for step in CHECKLIST_STEPS}

    apply_explicit_coverage_overrides(current_text, covered, evidence)

    current_sentence_state = (
        "complete"
        if ends_with_terminal_punctuation(current_text)
        else ("developing" if current_text.strip() else "fragment")
    )
    current_fragment = extract_current_fragment(current_text)
    if current_sentence_state == "complete":
        recommended_action = "start_new_sentence"
    elif len(current_fragment.split()) >= 6:
        recommended_action = "finish_sentence"
    else:
        recommended_action = "continue_sentence"

    covered_count = sum(1 for value in covered.values() if value)
    overall_status, overall_assessment = derive_overall_assessment(covered_count)
    next_element = get_next_uncovered_step(covered)

    return {
        "covered": covered,
        "evidence": evidence,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": build_status_message(next_element, recommended_action),
        "current_sentence_state": current_sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }


def should_skip_checklist_model(
    session_id: str, current_text: str, local_analysis: Dict[str, Any]
) -> bool:
    previous = get_session_memory(session_id)
    if not previous:
        return False

    normalized_current = normalize_whitespace(current_text)
    previous_text = normalize_whitespace(str(previous.get("text", "")))
    if not normalized_current or not previous_text:
        return False

    if not normalized_current.startswith(previous_text):
        return False

    previous_covered = previous.get("covered") or {}
    previous_count = sum(1 for value in previous_covered.values() if value)
    local_count = sum(1 for value in local_analysis["covered"].values() if value)
    added_chars = max(0, len(normalized_current) - len(previous_text))

    if local_count > previous_count:
        return True

    previous_next = get_next_uncovered_step(previous_covered)
    if local_analysis["next_element"] != previous_next:
        return True

    if not ends_with_terminal_punctuation(current_text):
        return True

    return added_chars <= 32


def call_json_model(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    response = get_openai_client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content or "{}")


async def analyze_checklist_with_gpt(
    *,
    brand_name: str,
    brand_category: str,
    brand_identity: str,
    current_text: str,
    session_id: str,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> Dict[str, Any]:
    if not current_text.strip():
        clear_session_memory(session_id)
        return fallback_analysis(current_text, session_id)

    local_analysis = build_local_incremental_analysis(current_text, session_id)
    if should_skip_checklist_model(session_id, current_text, local_analysis):
        return merge_sticky_progress(session_id, current_text, local_analysis)

    model = model or MODEL_CONFIG["checklist_analysis"]["model"]
    temperature = (
        temperature
        if temperature is not None
        else MODEL_CONFIG["checklist_analysis"]["temperature"]
    )

    prompt = f"""You are checking whether a brand narrative draft covers 4 writing checkpoints.

Brand context:
- Brand name: {brand_name}
- Industry/category: {brand_category}
- Brand identity draft: {brand_identity or "Not provided"}

Current draft:
\"\"\"{current_text}\"\"\"

Previous sticky checklist state from this session:
{build_previous_progress_lines(session_id)}

Checkpoint definitions:
1. offer — what the brand sells
2. audience — who it is for
3. emphasis — what the brand wants people to notice
4. tone — how the brand should come across

Rules:
- Be lenient. If a checkpoint is reasonably clear inside a longer sentence, mark it covered.
- Keep earlier covered checkpoints stable while the writer adds more detail, unless the draft clearly removes them.
- Only return evidence that actually appears in the current draft.
- For emphasis it can just be any feature that they have mentioned.
- If the draft does not end with ., !, or ?, do not treat the current sentence as complete.
- If the draft ends with a comma, assume the writer is still in the same clause.

Return strict JSON:
{{
  "covered": {{
    "offer": true,
    "audience": false,
    "emphasis": false,
    "tone": false
  }},
  "evidence": {{
    "offer": "exact excerpt from the current draft or empty string",
    "audience": "",
    "emphasis": "",
    "tone": ""
  }},
  "currentSentenceState": "fragment|developing|complete",
  "recommendedAction": "continue_sentence|finish_sentence|start_new_sentence"
}}"""

    try:
        result = call_json_model(
            system_prompt="Judge checklist coverage for a brand narrative. Return only JSON.",
            user_prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=500,
        )
    except Exception as exc:
        print(f"Checklist analysis error: {exc}")
        return merge_sticky_progress(
            session_id, current_text, fallback_analysis(current_text, session_id)
        )

    covered: Dict[str, bool] = {}
    evidence: Dict[str, str] = {}
    for step in CHECKLIST_STEPS:
        step_id = step["id"]
        step_covered = bool((result.get("covered") or {}).get(step_id))
        covered[step_id] = step_covered
        evidence[step_id] = (
            normalize_model_evidence(
                (result.get("evidence") or {}).get(step_id), current_text
            )
            if step_covered
            else ""
        )

    apply_explicit_coverage_overrides(current_text, covered, evidence)

    current_sentence_state = str(
        result.get("currentSentenceState", "developing")
    ).strip()
    if current_sentence_state not in VALID_SENTENCE_STATES:
        current_sentence_state = (
            "complete" if ends_with_terminal_punctuation(current_text) else "developing"
        )

    recommended_action = str(
        result.get("recommendedAction", "continue_sentence")
    ).strip()
    if recommended_action not in VALID_RECOMMENDED_ACTIONS:
        recommended_action = (
            "start_new_sentence"
            if ends_with_terminal_punctuation(current_text)
            else "continue_sentence"
        )

    if (
        not ends_with_terminal_punctuation(current_text)
        and current_sentence_state == "complete"
    ):
        current_sentence_state = "developing"
        if recommended_action == "start_new_sentence":
            recommended_action = "continue_sentence"

    covered_count = sum(1 for value in covered.values() if value)
    overall_status, overall_assessment = derive_overall_assessment(covered_count)
    next_element = get_next_uncovered_step(covered)

    analysis = {
        "covered": covered,
        "evidence": evidence,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": build_status_message(next_element, recommended_action),
        "current_sentence_state": current_sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }
    return merge_sticky_progress(session_id, current_text, analysis)


def choose_suggestion_mode(current_text: str) -> str:
    if not current_text.strip():
        return "starter"
    if ends_with_terminal_punctuation(current_text):
        return "starter"
    return "continuation"


def clean_suggestion_text(text: str, *, allow_new_sentence: bool) -> str:
    cleaned = normalize_whitespace(strip_trailing_ellipsis(text))
    if not cleaned:
        return ""

    if allow_new_sentence:
        return strip_trailing_terminal_punctuation(cleaned)

    if cleaned[0].isalpha() and not starts_with_acronym(cleaned):
        cleaned = cleaned[0].lower() + cleaned[1:]
    return cleaned


def enforce_offer_brand_prefix(text: str, brand_name: str) -> str:
    resolved_brand = brand_name.strip() or "This brand"
    cleaned = text.strip()
    if not cleaned:
        return ""
    if cleaned.lower().startswith(resolved_brand.lower()):
        return cleaned
    cleaned = re.sub(
        r"^(?:the brand|this brand|our brand)\s+", "", cleaned, flags=re.IGNORECASE
    )
    if cleaned and cleaned[0].isalpha() and not starts_with_acronym(cleaned):
        cleaned = cleaned[0].lower() + cleaned[1:]
    return f"{resolved_brand} {cleaned}"


def build_fallback_starter_suggestions(
    step_id: str, brand_name: str
) -> List[Dict[str, Any]]:
    resolved_brand = brand_name.strip() or "This brand"
    suggestions = []
    for item in STARTER_FALLBACKS.get(step_id, []):
        text = item.replace("{brandName}", resolved_brand)
        suggestions.append(
            {
                "text": text,
                "type": "new_angle",
                "targets": [step_id],
                "reasoning": f"Start the next sentence by covering '{get_step(step_id)['label']}'.",
            }
        )
    return suggestions


def build_fallback_continuation_suggestions(step_id: str) -> List[Dict[str, Any]]:
    suggestions = []
    for item in CONTINUATION_FALLBACKS.get(step_id, []):
        suggestions.append(
            {
                "text": item["text"],
                "type": item["type"],
                "targets": [],
                "reasoning": "",
            }
        )
    return suggestions


def merge_unique_suggestions(
    primary: List[Dict[str, Any]], secondary: List[Dict[str, Any]], limit: int = 4
) -> List[Dict[str, Any]]:
    seen = {item["text"] for item in primary}
    merged = list(primary)
    for item in secondary:
        if not item.get("text") or item["text"] in seen:
            continue
        merged.append(item)
        seen.add(item["text"])
        if len(merged) >= limit:
            break
    return merged[:limit]


async def generate_starter_suggestions_with_gpt(
    *,
    brand_name: str,
    brand_category: str,
    brand_identity: str,
    current_text: str,
    active_step: Dict[str, str],
    analysis: Dict[str, Any],
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> tuple[List[Dict[str, Any]], str]:
    model = model or MODEL_CONFIG["starter_suggestions"]["model"]
    temperature = (
        temperature
        if temperature is not None
        else MODEL_CONFIG["starter_suggestions"]["temperature"]
    )

    prompt = f"""You are writing sentence starters for a brand narrative.

Brand context:
- Brand name: {brand_name}
- Industry/category: {brand_category}
- Brand identity draft: {brand_identity or "Not provided"}

Current draft:
\"\"\"{current_text}\"\"\"

Current next checkpoint:
- {active_step["label"]}: {active_step["hint"]}

Checklist progress:
{json.dumps(analysis["covered"])}

Rules:
- Return exactly 4 sentence starters.
- Every suggestion must help with the current next checkpoint only.
- Keep them short, concrete, and straightforward.
- Do not return complete sentences.
- Do not end them with punctuation.
- Do not use ellipses.
- If the current next checkpoint is "What you sell", every suggestion must begin with "{brand_name.strip() or 'This brand'}".

Return strict JSON:
{{
  "thinking": "One short sentence about what the writer should cover next.",
  "suggestions": ["starter 1", "starter 2", "starter 3", "starter 4"]
}}"""

    suggestions: List[Dict[str, Any]] = []
    thinking = analysis["status_message"]
    try:
        result = call_json_model(
            system_prompt="Write short, concrete sentence starters for a brand narrative. Return only JSON.",
            user_prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=350,
        )
        thinking = (
            normalize_whitespace(str(result.get("thinking", "")).strip())
            or analysis["status_message"]
        )
        for raw in result.get("suggestions") or []:
            text = clean_suggestion_text(str(raw), allow_new_sentence=True)
            if active_step["id"] == "offer":
                text = enforce_offer_brand_prefix(text, brand_name)
                text = strip_trailing_terminal_punctuation(text)
            if not text:
                continue
            if any(existing["text"] == text for existing in suggestions):
                continue
            suggestions.append(
                {
                    "text": text,
                    "type": "new_angle",
                    "targets": [active_step["id"]],
                    "reasoning": f"Start the next sentence by covering '{active_step['label']}'.",
                }
            )
            if len(suggestions) >= 4:
                break
    except Exception as exc:
        print(f"Starter suggestion error: {exc}")

    fallback = build_fallback_starter_suggestions(active_step["id"], brand_name)
    return merge_unique_suggestions(suggestions, fallback), thinking


async def generate_continuation_suggestions_with_gpt(
    *,
    brand_name: str,
    brand_category: str,
    brand_identity: str,
    current_text: str,
    active_step: Dict[str, str],
    analysis: Dict[str, Any],
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> tuple[List[Dict[str, Any]], str]:
    model = model or MODEL_CONFIG["continuation_suggestions"]["model"]
    temperature = (
        temperature
        if temperature is not None
        else MODEL_CONFIG["continuation_suggestions"]["temperature"]
    )

    current_fragment = extract_current_fragment(current_text)
    prompt = f"""You are continuing the sentence a user is currently typing in a brand narrative.

Brand context:
- Brand name: {brand_name}
- Industry/category: {brand_category}
- Brand identity draft: {brand_identity or "Not provided"}

Current draft:
\"\"\"{current_text}\"\"\"

Current sentence fragment:
\"\"\"{current_fragment}\"\"\"

Next checkpoint after this sentence:
- {active_step["label"]}: {active_step["hint"]}

Rules:
- Return exactly 4 suggestions.
- These suggestions should continue the current sentence naturally.
- Do not start a fresh sentence.
- Keep the language straightforward, concrete, concise, and not wordy.
- One or two suggestions may help cleanly finish the sentence.
- Do not use ellipses.

Return strict JSON:
{{
  "thinking": "One short sentence about how the current sentence should continue.",
  "suggestions": [
    {{
      "text": "suggestion text",
      "type": "continuation|sentence_end"
    }}
  ]
}}"""

    suggestions: List[Dict[str, Any]] = []
    thinking = analysis["status_message"]
    try:
        result = call_json_model(
            system_prompt="Write short, concrete sentence continuations for a brand narrative. Return only JSON.",
            user_prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=400,
        )
        thinking = (
            normalize_whitespace(str(result.get("thinking", "")).strip())
            or analysis["status_message"]
        )
        for raw in result.get("suggestions") or []:
            if isinstance(raw, str):
                text = raw
                suggestion_type = "continuation"
            else:
                text = str((raw or {}).get("text", "")).strip()
                suggestion_type = str((raw or {}).get("type", "continuation")).strip()
            if suggestion_type not in VALID_CONTINUATION_TYPES:
                suggestion_type = "continuation"
            text = clean_suggestion_text(text, allow_new_sentence=False)
            if not text or text.strip().lower().startswith(
                ("our ", "we ", "the brand ", "this brand ")
            ):
                continue
            if any(existing["text"] == text for existing in suggestions):
                continue
            suggestions.append(
                {
                    "text": text,
                    "type": suggestion_type,
                    "targets": [],
                    "reasoning": "",
                }
            )
            if len(suggestions) >= 4:
                break
    except Exception as exc:
        print(f"Continuation suggestion error: {exc}")

    fallback = build_fallback_continuation_suggestions(active_step["id"])
    return merge_unique_suggestions(suggestions, fallback), thinking


async def generate_suggestions(
    brand_name: str,
    brand_category: str,
    current_text: str,
    brand_identity: str = "",
    session_id: str = "default",
    model_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    analysis_model = (model_config or {}).get(
        "directionModel", MODEL_CONFIG["checklist_analysis"]["model"]
    )
    analysis_temp = (model_config or {}).get(
        "directionTemp", MODEL_CONFIG["checklist_analysis"]["temperature"]
    )
    suggestion_model = (model_config or {}).get(
        "suggestionModel", MODEL_CONFIG["starter_suggestions"]["model"]
    )
    suggestion_temp = (model_config or {}).get(
        "suggestionTemp", MODEL_CONFIG["starter_suggestions"]["temperature"]
    )

    start_time = datetime.now()
    analysis = await analyze_checklist_with_gpt(
        brand_name=brand_name,
        brand_category=brand_category,
        brand_identity=brand_identity,
        current_text=current_text,
        session_id=session_id,
        model=analysis_model,
        temperature=analysis_temp,
    )

    active_step = (
        get_step(analysis["next_element"])
        if analysis["next_element"] != "none"
        else get_step("tone")
    )
    mode = choose_suggestion_mode(current_text)

    if mode == "starter":
        suggestions, thinking = await generate_starter_suggestions_with_gpt(
            brand_name=brand_name,
            brand_category=brand_category,
            brand_identity=brand_identity,
            current_text=current_text,
            active_step=active_step,
            analysis=analysis,
            model=suggestion_model,
            temperature=suggestion_temp,
        )
    else:
        suggestions, thinking = await generate_continuation_suggestions_with_gpt(
            brand_name=brand_name,
            brand_category=brand_category,
            brand_identity=brand_identity,
            current_text=current_text,
            active_step=active_step,
            analysis=analysis,
            model=suggestion_model,
            temperature=suggestion_temp,
        )

    covered = analysis["covered"]
    evidence = analysis["evidence"]
    progress_count = sum(1 for value in covered.values() if value)
    elapsed = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        "status": "success",
        "suggestions": suggestions[:4],
        "brandStatus": {
            "satisfied": analysis["overall_status"] == "complete",
            "overallAssessment": analysis["overall_assessment"],
            "statusMessage": analysis["status_message"],
            "sentenceEnded": ends_with_terminal_punctuation(current_text),
            "currentSentenceState": analysis["current_sentence_state"],
            "recommendedAction": analysis["recommended_action"],
            "nextElement": analysis["next_element"],
        },
        "progress": {
            "covered": progress_count,
            "total": len(CHECKLIST_STEPS),
            "percentage": int((progress_count / len(CHECKLIST_STEPS)) * 100),
            "activeKey": analysis["next_element"],
            "allElements": [
                {
                    "key": step["id"],
                    "title": step["label"],
                    "description": step["hint"],
                    "covered": covered.get(step["id"], False),
                    "evidence": evidence.get(step["id"], ""),
                    "order": index + 1,
                }
                for index, step in enumerate(CHECKLIST_STEPS)
            ],
            "recommendation": {
                "hint": (
                    active_step["hint"]
                    if analysis["next_element"] != "none"
                    else "You have covered the core narrative pieces."
                ),
            },
        },
        "debug": {
            "thinking": thinking,
            "elapsed": elapsed,
            "mode": mode,
        },
    }
