"""Brand narrative autocomplete service for the onboarding flow."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from openai import OpenAI

MODEL_CONFIG = {
    "checklist_analysis": {
        "model": "gpt-4.1",
        "temperature": 0.2,
    },
    "suggestion_completion": {
        "model": "gpt-4o",
        "temperature": 0.6,
    },
}

CHECKLIST_STEPS: List[Dict[str, Any]] = [
    {
        "id": "offer",
        "label": "What you sell",
        "hint": "Mention the product, service, or offer.",
        "keywords": [
            "sell",
            "sells",
            "offer",
            "offers",
            "product",
            "products",
            "service",
            "services",
            "care",
            "platform",
            "tool",
            "brand that",
        ],
        "starter_templates": [
            "{brandName} sells",
            "{brandName} offers",
            "{brandName} is a brand that offers",
        ],
        "continuation_templates": [
            "products for",
            "care designed for",
            "solutions focused on",
        ],
        "ending_templates": [
            "through gentle, effective products.",
            "through products built around clear customer needs.",
            "through practical products people can use every day.",
        ],
    },
    {
        "id": "audience",
        "label": "Who it is for",
        "hint": "Name the target customer or audience.",
        "keywords": [
            "for",
            "people",
            "customers",
            "customer",
            "audience",
            "clients",
            "those who",
            "designed for",
            "made for",
            "sensitive skin",
        ],
        "starter_templates": [
            "It is made for",
            "We serve",
            "Our customers are",
        ],
        "continuation_templates": [
            "for people with",
            "for customers who want",
            "for those looking for",
        ],
        "ending_templates": [
            "for people with specific everyday skin concerns.",
            "for customers who want gentle, reliable care.",
            "for people who need a softer approach.",
        ],
    },
    {
        "id": "emphasis",
        "label": "What you want to emphasize",
        "hint": "Call out the quality, difference, or result people should notice.",
        "keywords": [
            "quality",
            "difference",
            "different",
            "effective",
            "natural",
            "gentle",
            "safe",
            "trusted",
            "fda",
            "confirm",
            "result",
            "sets us apart",
            "stand out",
        ],
        "starter_templates": [
            "What sets us apart is",
            "We want to emphasize",
            "The main thing people should notice is",
        ],
        "continuation_templates": [
            "with a focus on",
            "while emphasizing",
            "by highlighting",
        ],
        "ending_templates": [
            "through FDA-confirmed natural ingredients.",
            "with a clear focus on gentle, effective care.",
            "by emphasizing trust, safety, and ingredient quality.",
        ],
    },
    {
        "id": "tone",
        "label": "How it should come across",
        "hint": "Describe the tone, personality, or feeling the brand should project.",
        "keywords": [
            "feel",
            "tone",
            "voice",
            "personality",
            "come across",
            "calm",
            "trustworthy",
            "premium",
            "approachable",
            "friendly",
            "credible",
        ],
        "starter_templates": [
            "The brand should feel",
            "Our tone should be",
            "We want to come across as",
        ],
        "continuation_templates": [
            "and should feel",
            "while coming across as",
            "with a tone that feels",
        ],
        "ending_templates": [
            "calm, trustworthy, and easy to understand.",
            "gentle, credible, and easy to trust.",
            "premium but still approachable.",
        ],
    },
]

CHECKLIST_IDS = {step["id"] for step in CHECKLIST_STEPS}
VALID_SUGGESTION_TYPES = {"continuation", "new_angle", "sentence_end"}


def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def ends_with_terminal_punctuation(text: str) -> bool:
    return text.rstrip().endswith((".", "!", "?"))


def normalize_whitespace(text: str) -> str:
    return " ".join(text.split())


def extract_current_fragment(text: str) -> str:
    stripped = text.rstrip()
    if not stripped:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", stripped)
    return parts[-1].strip() if parts else stripped


def starts_with_acronym(text: str) -> bool:
    first_token = (text.strip().split() or [""])[0]
    return len(first_token) > 1 and first_token.isupper()


def looks_like_new_sentence(text: str) -> bool:
    lowered = text.strip().lower()
    return lowered.startswith(("our ", "we ", "this brand ", "the brand ", "i ", "my "))


def normalize_suggestion_text(text: str, suggestion_type: str, current_text: str) -> str:
    cleaned = normalize_whitespace(text.strip())
    if not cleaned:
        return ""

    if not ends_with_terminal_punctuation(current_text) and suggestion_type != "new_angle":
        if cleaned[0].isalpha() and not starts_with_acronym(cleaned):
            cleaned = cleaned[0].lower() + cleaned[1:]

    return cleaned


def build_type_plan(
    has_terminal_punctuation: bool,
    recommended_action: str,
    fragment_word_count: int,
) -> List[str]:
    if has_terminal_punctuation:
        return ["new_angle", "new_angle", "continuation", "continuation"]

    if recommended_action == "finish_sentence":
        return ["continuation", "continuation", "sentence_end", "sentence_end"]

    if fragment_word_count >= 8:
        return ["continuation", "continuation", "continuation", "sentence_end"]

    return ["continuation", "continuation", "continuation", "continuation"]


def get_step(step_id: str) -> Dict[str, Any]:
    return next((step for step in CHECKLIST_STEPS if step["id"] == step_id), CHECKLIST_STEPS[0])


def get_active_step(covered: Dict[str, bool]) -> Dict[str, Any]:
    for step in CHECKLIST_STEPS:
        if not covered.get(step["id"], False):
            return step
    return CHECKLIST_STEPS[-1]


def expand_template(template: str, brand_name: str) -> str:
    return template.replace("{brandName}", brand_name.strip() or "This brand")


def slice_excerpt(text: str, start_index: int, end_index: int) -> str:
    boundary_chars = ".!?\n"
    start = start_index
    while start > 0 and text[start - 1] not in boundary_chars:
        start -= 1

    end = end_index
    while end < len(text) and text[end] not in boundary_chars:
        end += 1

    excerpt = normalize_whitespace(text[start:end].strip(" ,"))
    return excerpt[:140]


def find_evidence_excerpt(text: str, keywords: List[str]) -> str:
    lowered = text.lower()
    for keyword in keywords:
        match = re.search(re.escape(keyword.lower()), lowered)
        if match:
            return slice_excerpt(text, match.start(), match.end())
    return ""


def normalize_evidence(raw_evidence: Any, source_text: str, keywords: List[str]) -> str:
    if isinstance(raw_evidence, str):
        cleaned = normalize_whitespace(raw_evidence.strip().strip('"'))
        if cleaned and cleaned.lower() in normalize_whitespace(source_text).lower():
            return cleaned[:140]

    return find_evidence_excerpt(source_text, keywords)


def derive_overall_assessment(covered_count: int) -> tuple[str, str]:
    if covered_count >= len(CHECKLIST_STEPS):
        return "complete", "Complete"
    if covered_count >= 2:
        return "progressing", "Progressing"
    return "incomplete", "Starting"


def infer_fallback_analysis(current_text: str) -> Dict[str, Any]:
    covered: Dict[str, bool] = {}
    evidence: Dict[str, str] = {}

    for step in CHECKLIST_STEPS:
        excerpt = find_evidence_excerpt(current_text, step["keywords"])
        evidence[step["id"]] = excerpt
        covered[step["id"]] = bool(excerpt)

    active_step = get_active_step(covered)
    next_element = active_step["id"] if not all(covered.values()) else "none"

    fragment = extract_current_fragment(current_text)
    fragment_word_count = len(fragment.split()) if fragment else 0
    has_terminal_punctuation = ends_with_terminal_punctuation(current_text)

    if has_terminal_punctuation:
        sentence_state = "complete"
        recommended_action = "start_new_sentence"
    elif fragment_word_count >= 10 or current_text.rstrip().endswith(","):
        sentence_state = "developing"
        recommended_action = "finish_sentence"
    elif fragment_word_count >= 4:
        sentence_state = "developing"
        recommended_action = "continue_sentence"
    else:
        sentence_state = "fragment"
        recommended_action = "continue_sentence"

    covered_count = sum(1 for value in covered.values() if value)
    overall_status, overall_assessment = derive_overall_assessment(covered_count)

    if next_element != "none":
        status_message = f"Next, make {active_step['label'].lower()} clearer."
    elif recommended_action == "finish_sentence":
        status_message = "Finish this sentence with one concrete detail."
    elif recommended_action == "start_new_sentence":
        status_message = "You can start a new sentence or refine the tone."
    else:
        status_message = "Keep the narrative specific and concrete."

    return {
        "covered": covered,
        "evidence": evidence,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": status_message,
        "current_sentence_state": sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }


def build_blank_state_suggestions(brand_name: str) -> List[Dict[str, Any]]:
    display_name = brand_name.strip() or "This brand"
    return [
        {
            "text": f"{display_name} sells",
            "type": "continuation",
            "targets": ["offer"],
            "reasoning": "Start by naming the product, service, or offer.",
        },
        {
            "text": f"{display_name} offers",
            "type": "continuation",
            "targets": ["offer"],
            "reasoning": "Give a clear first description of what the brand offers.",
        },
        {
            "text": "products for",
            "type": "continuation",
            "targets": ["audience"],
            "reasoning": "After that, name who the offer is for.",
        },
        {
            "text": "with a focus on",
            "type": "continuation",
            "targets": ["emphasis"],
            "reasoning": "Then add what you want people to notice first.",
        },
    ]


def build_seed_suggestions(
    step: Dict[str, Any],
    brand_name: str,
    current_text: str,
    type_plan: List[str],
    allow_new_sentence: bool,
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []

    for index, suggestion_type in enumerate(type_plan[:2]):
        if suggestion_type == "new_angle" and allow_new_sentence:
            pool = step["starter_templates"]
        elif suggestion_type == "sentence_end":
            pool = step["ending_templates"]
        else:
            pool = step["continuation_templates"]

        template = pool[index % len(pool)]
        text = normalize_suggestion_text(expand_template(template, brand_name), suggestion_type, current_text)
        if not text:
            continue
        if not allow_new_sentence and suggestion_type != "new_angle" and looks_like_new_sentence(text):
            continue

        suggestions.append(
            {
                "text": text,
                "type": suggestion_type,
                "targets": [step["id"]],
                "reasoning": f"Help the writer cover '{step['label']}' next.",
            }
        )

    return suggestions


def sanitize_targets(raw_targets: Any, fallback_step_id: str) -> List[str]:
    cleaned = [target for target in raw_targets or [] if isinstance(target, str) and target in CHECKLIST_IDS]
    return cleaned[:2] if cleaned else [fallback_step_id]


def sanitize_suggestion_item(
    item: Dict[str, Any],
    current_text: str,
    suggestion_type: str,
    allow_new_sentence: bool,
    fallback_step_id: str,
) -> Optional[Dict[str, Any]]:
    text = normalize_suggestion_text(str(item.get("text", "")), suggestion_type, current_text)
    if not text:
        return None
    if not allow_new_sentence and suggestion_type != "new_angle" and looks_like_new_sentence(text):
        return None

    return {
        "text": text,
        "type": suggestion_type,
        "targets": sanitize_targets(item.get("targets"), fallback_step_id),
        "reasoning": str(item.get("reasoning", "")).strip(),
    }


def build_fallback_suggestions(
    step: Dict[str, Any],
    brand_name: str,
    current_text: str,
    type_plan: List[str],
    allow_new_sentence: bool,
) -> List[Dict[str, Any]]:
    suggestions = build_seed_suggestions(step, brand_name, current_text, type_plan, allow_new_sentence)
    pools = [
        step["continuation_templates"],
        step["continuation_templates"],
        step["ending_templates"],
        step["starter_templates"] if allow_new_sentence else step["ending_templates"],
    ]

    while len(suggestions) < 4:
        suggestion_type = type_plan[min(len(suggestions), len(type_plan) - 1)]
        pool = pools[min(len(suggestions), len(pools) - 1)]
        candidate = expand_template(pool[len(suggestions) % len(pool)], brand_name)
        text = normalize_suggestion_text(candidate, suggestion_type, current_text)
        if text and not any(existing["text"] == text for existing in suggestions):
            if allow_new_sentence or suggestion_type == "new_angle" or not looks_like_new_sentence(text):
                suggestions.append(
                    {
                        "text": text,
                        "type": suggestion_type,
                        "targets": [step["id"]],
                        "reasoning": f"Keep building the '{step['label']}' part of the narrative.",
                    }
                )
        else:
            break

    return suggestions[:4]


async def analyze_checklist_with_gpt(
    brand_name: str,
    brand_category: str,
    current_text: str,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> Dict[str, Any]:
    if not current_text.strip():
        return infer_fallback_analysis(current_text)

    model = model or MODEL_CONFIG["checklist_analysis"]["model"]
    temperature = temperature if temperature is not None else MODEL_CONFIG["checklist_analysis"]["temperature"]

    prompt = f"""You are the checklist-analysis model for a brand narrative onboarding flow.

Your job is to judge whether the user's current draft clearly covers each required checklist item.
This is for a novice business owner writing a short brand narrative.

Checklist:
1. offer — what the brand sells
2. audience — who it is for
3. emphasis — what the brand wants people to notice
4. tone — how the brand should come across

Brand context:
- Brand name: {brand_name}
- Industry/category: {brand_category}

Current draft:
\"\"\"{current_text}\"\"\"

Rules:
- Only mark an item as covered if the draft already says it clearly.
- For each covered item, return a short exact excerpt copied from the draft.
- If an item is not clearly covered, set its evidence to an empty string.
- Be punctuation-sensitive. If the draft does not end with ., !, or ?, do not treat the current sentence as complete.
- If the draft ends with a comma, assume the writer is still in the same clause.
- The status message must be straightforward, concrete, and concise.
- Do not invent information that is not present in the draft.

Return strict JSON:
{{
  "covered": {{
    "offer": true,
    "audience": false,
    "emphasis": false,
    "tone": false
  }},
  "evidence": {{
    "offer": "exact excerpt from the draft or empty string",
    "audience": "",
    "emphasis": "",
    "tone": ""
  }},
  "statusMessage": "One concise sentence telling the writer what to do next.",
  "currentSentenceState": "fragment|developing|complete",
  "recommendedAction": "continue_sentence|finish_sentence|start_new_sentence",
  "nextElement": "offer|audience|emphasis|tone|none"
}}"""

    try:
        response = get_openai_client().chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Analyze brand narrative coverage against a fixed four-step checklist. Return only JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as exc:
        print(f"Checklist analysis error: {exc}")
        return infer_fallback_analysis(current_text)

    covered: Dict[str, bool] = {}
    evidence: Dict[str, str] = {}
    for step in CHECKLIST_STEPS:
        step_id = step["id"]
        covered[step_id] = bool((result.get("covered") or {}).get(step_id))
        evidence[step_id] = normalize_evidence((result.get("evidence") or {}).get(step_id), current_text, step["keywords"])
        if evidence[step_id]:
            covered[step_id] = True

    covered_count = sum(1 for value in covered.values() if value)
    overall_status, overall_assessment = derive_overall_assessment(covered_count)
    next_element = str(result.get("nextElement", "")).strip()
    if next_element not in CHECKLIST_IDS and next_element != "none":
        next_element = get_active_step(covered)["id"] if covered_count < len(CHECKLIST_STEPS) else "none"
    elif next_element == "none" and covered_count < len(CHECKLIST_STEPS):
        next_element = get_active_step(covered)["id"]

    current_sentence_state = str(result.get("currentSentenceState", "developing")).strip()
    if current_sentence_state not in {"fragment", "developing", "complete"}:
        current_sentence_state = infer_fallback_analysis(current_text)["current_sentence_state"]

    recommended_action = str(result.get("recommendedAction", "continue_sentence")).strip()
    if recommended_action not in {"continue_sentence", "finish_sentence", "start_new_sentence"}:
        recommended_action = infer_fallback_analysis(current_text)["recommended_action"]

    if not ends_with_terminal_punctuation(current_text) and current_sentence_state == "complete":
        current_sentence_state = "developing"
        if recommended_action == "start_new_sentence":
            recommended_action = "finish_sentence"

    status_message = normalize_whitespace(str(result.get("statusMessage", "")).strip())
    if not status_message:
        fallback = infer_fallback_analysis(current_text)
        status_message = fallback["status_message"]

    return {
        "covered": covered,
        "evidence": evidence,
        "overall_status": overall_status,
        "overall_assessment": overall_assessment,
        "status_message": status_message[:180],
        "current_sentence_state": current_sentence_state,
        "recommended_action": recommended_action,
        "next_element": next_element,
    }


async def generate_suggestions(
    brand_name: str,
    brand_category: str,
    current_text: str,
    brand_identity: str = "",
    session_id: str = "default",
    model_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    del brand_identity, session_id

    analysis_model = (model_config or {}).get("directionModel", MODEL_CONFIG["checklist_analysis"]["model"])
    analysis_temp = (model_config or {}).get("directionTemp", MODEL_CONFIG["checklist_analysis"]["temperature"])
    suggestion_model = (model_config or {}).get("suggestionModel", MODEL_CONFIG["suggestion_completion"]["model"])
    suggestion_temp = (model_config or {}).get("suggestionTemp", MODEL_CONFIG["suggestion_completion"]["temperature"])

    start_time = datetime.now()
    analysis = await analyze_checklist_with_gpt(
        brand_name=brand_name,
        brand_category=brand_category,
        current_text=current_text,
        model=analysis_model,
        temperature=analysis_temp,
    )

    covered = analysis["covered"]
    evidence = analysis["evidence"]
    active_step = get_step(analysis["next_element"]) if analysis["next_element"] != "none" else get_active_step(covered)

    if not current_text.strip():
        suggestions = build_blank_state_suggestions(brand_name)
        thinking = "Start with what the brand sells, then move through the checklist in order."
        elapsed = int((datetime.now() - start_time).total_seconds() * 1000)
    else:
        current_fragment = extract_current_fragment(current_text)
        fragment_word_count = len(current_fragment.split()) if current_fragment else 0
        has_terminal_punctuation = ends_with_terminal_punctuation(current_text)
        type_plan = build_type_plan(
            has_terminal_punctuation=has_terminal_punctuation,
            recommended_action=analysis["recommended_action"],
            fragment_word_count=fragment_word_count,
        )

        seed_suggestions = build_seed_suggestions(
            step=active_step,
            brand_name=brand_name,
            current_text=current_text,
            type_plan=type_plan,
            allow_new_sentence=has_terminal_punctuation,
        )

        progress_lines = "\n".join(
            f"- {step['label']}: {'covered' if covered.get(step['id']) else 'missing'}"
            + (f' | evidence: "{evidence.get(step["id"], "")}"' if evidence.get(step["id"]) else "")
            for step in CHECKLIST_STEPS
        )

        prompt = f"""You are the autocomplete model for a brand narrative onboarding step.

Your job is to help a small business owner keep writing the next few words.

Brand context:
- Brand name: {brand_name}
- Industry/category: {brand_category}

Current draft:
\"\"\"{current_text}\"\"\"

Current sentence or clause:
\"\"\"{current_fragment}\"\"\"

Checklist progress:
{progress_lines}

Current checklist item to focus on:
- {active_step["label"]}: {active_step["hint"]}

Current sentence state: {analysis["current_sentence_state"]}
Recommended action: {analysis["recommended_action"]}

Helpful patterns for the current checklist item:
- sentence starters: {", ".join(expand_template(template, brand_name) for template in active_step["starter_templates"])}
- continuations: {", ".join(active_step["continuation_templates"])}
- endings: {", ".join(active_step["ending_templates"])}

Rules:
- Return exactly 4 suggestions.
- Suggestions 1 and 2 should directly help with the current checklist item before moving on.
- Use straightforward, concrete language.
- Keep suggestions short, usually 2 to 10 words.
- If the draft does not end with ., !, or ?, every suggestion must fit directly after a single space.
- If the draft ends with a comma, stay inside the same clause.
- Do not start a fresh sentence unless the draft ends with ., !, or ?.
- If the current sentence is unfinished, prioritize continuing or landing that sentence before changing topics.
- Avoid abstract mission statements, vague values language, and generic marketing filler.
- Targets must only use these ids: offer, audience, emphasis, tone.

Return strict JSON:
{{
  "thinking": "One short sentence about what the writer should do next.",
  "suggestions": [
    {{
      "text": "suggestion text",
      "type": "continuation|new_angle|sentence_end",
      "targets": ["offer"],
      "reasoning": "One short reason."
    }}
  ]
}}"""

        try:
            response = get_openai_client().chat.completions.create(
                model=suggestion_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Write short, concrete autocomplete suggestions for a brand narrative. Return only JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=suggestion_temp,
                max_tokens=400,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            thinking = normalize_whitespace(str(result.get("thinking", "")).strip()) or analysis["status_message"]
            suggestions = list(seed_suggestions)

            for raw_item in result.get("suggestions", []):
                if len(suggestions) >= 4:
                    break
                planned_type = type_plan[min(len(suggestions), len(type_plan) - 1)]
                raw_type = str((raw_item or {}).get("type", planned_type)).strip()
                suggestion_type = raw_type if raw_type in VALID_SUGGESTION_TYPES else planned_type
                if not has_terminal_punctuation and suggestion_type == "new_angle":
                    suggestion_type = planned_type if planned_type != "new_angle" else "continuation"

                cleaned_item = sanitize_suggestion_item(
                    item=raw_item or {},
                    current_text=current_text,
                    suggestion_type=suggestion_type,
                    allow_new_sentence=has_terminal_punctuation,
                    fallback_step_id=active_step["id"],
                )
                if not cleaned_item:
                    continue
                if any(existing["text"] == cleaned_item["text"] for existing in suggestions):
                    continue
                suggestions.append(cleaned_item)

            if len(suggestions) < 4:
                suggestions = build_fallback_suggestions(
                    step=active_step,
                    brand_name=brand_name,
                    current_text=current_text,
                    type_plan=type_plan,
                    allow_new_sentence=has_terminal_punctuation,
                )

        except Exception as exc:
            print(f"Suggestion generation error: {exc}")
            thinking = analysis["status_message"]
            suggestions = build_fallback_suggestions(
                step=active_step,
                brand_name=brand_name,
                current_text=current_text,
                type_plan=type_plan,
                allow_new_sentence=has_terminal_punctuation,
            )

        elapsed = int((datetime.now() - start_time).total_seconds() * 1000)

    progress_count = sum(1 for value in covered.values() if value)

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
                "hint": active_step["hint"] if analysis["next_element"] != "none" else "You have covered the core narrative pieces.",
            },
        },
        "debug": {
            "thinking": thinking,
            "elapsed": elapsed,
        },
    }
