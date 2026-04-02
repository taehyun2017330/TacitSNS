import json
import os
from functools import lru_cache
from typing import Dict, List

from openai import OpenAI

from api_models import (
    ClarificationDraftGoalUpdateRequest,
    ClarificationDraftGoalUpdateResponse,
    ClarificationEvaluateRequest,
    ClarificationEvaluationResponse,
    ClarificationQuestionGenerationRequest,
    ClarificationQuestionGenerationResponse,
)


CLARIFICATION_CONTROLLER_MODEL = os.getenv("CLARIFICATION_CONTROLLER_MODEL", "gpt-4o")
CLARIFICATION_QUESTION_MODEL = os.getenv("CLARIFICATION_QUESTION_MODEL", "gpt-4o")
CLARIFICATION_GOAL_UPDATE_MODEL = os.getenv("CLARIFICATION_GOAL_UPDATE_MODEL", "gpt-4o")

ALLOWED_STATUSES = {"idle", "armed", "interrupt_now"}
ALLOWED_FAMILIES = {"summarize", "probe", "clarify", "challenge"}
ALLOWED_MOVES = {"summarize", "probe", "clarify", "challenge", "goal_reframe"}
ALLOWED_URGENCIES = {"low", "medium", "high"}
ALLOWED_PRESENTATIONS = {"corner-card", "anchored-sheet", "compare-popup"}
ALLOWED_STAGES = {"micro", "macro"}
ALLOWED_CONTROL_TEMPLATE_IDS = {
    "summary-confirm",
    "challenge-response",
    "clarify-interpretation",
    "clarify-scope",
    "goal-reframe",
    "probe",
    "note",
}
ALLOWED_APPLY_TARGETS = {"next_generation", "goal_update"}
ALLOWED_GOAL_TARGETS = {"post_goal", "business_goal"}
DIMENSION_ALIASES = {
    "goal_alignment": "strategy",
    "goal": "strategy",
    "brand": "strategy",
    "business_goal": "strategy",
    "post_goal": "strategy",
    "direction": "strategy",
    "product hero": "product",
    "hero": "product",
    "launch": "product",
    "premium": "mood",
}

VAGUE_TERMS = [
    "premium",
    "cleaner",
    "different",
    "color",
    "font",
    "text",
    "off",
    "better",
    "style",
    "vibe",
]

CHALLENGE_TERMS = [
    "goal changed",
    "different direction",
    "still don't want",
    "same goal",
]

STRATEGY_TERMS = [
    "wrong direction",
    "off-brand",
    "doesn't feel like us",
    "not our audience",
    "strategy",
    "too commercial",
]


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _clean_text(value: object) -> str:
    return " ".join(str(value or "").split()).strip()


def _ensure_sentence(value: str) -> str:
    cleaned = _clean_text(value)
    if not cleaned:
        return ""
    if cleaned[-1] in ".!?":
        return cleaned
    return f"{cleaned}."


def _normalize_family(value: str | None) -> str | None:
    cleaned = _clean_text(value).lower().replace("-", "_").replace(" ", "_")
    if cleaned in ALLOWED_FAMILIES:
        return cleaned
    return None


def _normalize_move(value: str | None) -> str | None:
    cleaned = _clean_text(value).lower().replace("-", "_").replace(" ", "_")
    if cleaned in ALLOWED_MOVES:
        return cleaned
    return None


def _normalize_status(value: str | None) -> str:
    cleaned = _clean_text(value).lower().replace("-", "_").replace(" ", "_")
    if cleaned in ALLOWED_STATUSES:
        return cleaned
    if "interrupt" in cleaned:
        return "interrupt_now"
    if cleaned in {"armed", "wait"}:
        return "armed"
    return "idle"


def _normalize_urgency(value: str | None) -> str:
    cleaned = _clean_text(value).lower()
    if cleaned in ALLOWED_URGENCIES:
        return cleaned
    if cleaned in {"immediate", "urgent", "critical"}:
        return "high"
    if cleaned in {"moderate", "med"}:
        return "medium"
    return "low"


def _normalize_apply_target(value: str | None, move: str | None) -> str:
    cleaned = _clean_text(value).lower().replace("-", "_").replace(" ", "_")
    if cleaned in ALLOWED_APPLY_TARGETS:
        return cleaned
    if move == "goal_reframe" or "goal" in cleaned:
        return "goal_update"
    return "next_generation"


def _normalize_goal_target(value: str | None) -> str | None:
    cleaned = _clean_text(value).lower().replace("-", "_").replace(" ", "_")
    if cleaned in ALLOWED_GOAL_TARGETS:
        return cleaned
    if "business" in cleaned:
        return "business_goal"
    if "post" in cleaned or "goaltitle" in cleaned:
        return "post_goal"
    return None


def _normalize_dimension(value: str | None) -> str | None:
    cleaned = _clean_text(value).lower()
    if not cleaned:
        return None
    mapped = DIMENSION_ALIASES.get(cleaned, cleaned)
    allowed = {
        "color",
        "background",
        "typography",
        "composition",
        "product",
        "lighting",
        "mood",
        "strategy",
        "execution",
        "other",
    }
    return mapped if mapped in allowed else "other"


def _normalize_stage(value: str | None) -> str:
    cleaned = _clean_text(value).lower()
    if cleaned in ALLOWED_STAGES:
        return cleaned
    return "macro"


def _sanitize_evaluation(
    evaluation: ClarificationEvaluationResponse,
    stage: str,
) -> ClarificationEvaluationResponse:
    normalized_move = _normalize_move(evaluation.move)
    normalized_family = _normalize_family(evaluation.family)
    if normalized_move == "goal_reframe":
        normalized_family = "clarify"
    elif not normalized_family and normalized_move in ALLOWED_FAMILIES:
        normalized_family = normalized_move

    evaluation.status = _normalize_status(evaluation.status)
    evaluation.move = normalized_move
    evaluation.family = normalized_family
    evaluation.urgency = _normalize_urgency(evaluation.urgency)
    evaluation.applyTarget = _normalize_apply_target(evaluation.applyTarget, normalized_move)
    evaluation.goalTarget = _normalize_goal_target(evaluation.goalTarget)
    evaluation.focusDimension = _normalize_dimension(evaluation.focusDimension)
    if stage == "micro" and normalized_move not in {"summarize", "probe", "clarify"}:
        evaluation.status = "idle"
        evaluation.move = None
        evaluation.family = None
        evaluation.applyTarget = "next_generation"
        evaluation.goalTarget = None
    if stage == "macro" and normalized_move not in {"summarize", "challenge", "goal_reframe"}:
        evaluation.status = "idle"
        evaluation.move = None
        evaluation.family = None
        evaluation.applyTarget = "next_generation"
        evaluation.goalTarget = None
    if evaluation.move != "goal_reframe":
        evaluation.goalTarget = None
    return evaluation


def _sanitize_question(
    question: ClarificationQuestionGenerationResponse,
    stage: str,
) -> ClarificationQuestionGenerationResponse:
    normalized_move = _normalize_move(question.move) or "clarify"
    normalized_family = _normalize_family(question.family)
    if normalized_move == "goal_reframe":
        normalized_family = "clarify"
    elif not normalized_family and normalized_move in ALLOWED_FAMILIES:
        normalized_family = normalized_move

    question.move = normalized_move
    question.family = normalized_family or "clarify"
    question.urgency = _normalize_urgency(question.urgency)
    question.applyTarget = _normalize_apply_target(question.applyTarget, normalized_move)
    question.goalTarget = _normalize_goal_target(question.goalTarget)
    question.focusDimension = _normalize_dimension(question.focusDimension)
    if stage == "micro" and normalized_move not in {"summarize", "probe", "clarify"}:
        normalized_move = "clarify"
        question.move = "clarify"
        question.family = "clarify"
        question.applyTarget = "next_generation"
        question.goalTarget = None
    if stage == "macro" and normalized_move not in {"summarize", "challenge", "goal_reframe"}:
        normalized_move = "summarize"
        question.move = "summarize"
        question.family = "summarize"
        question.applyTarget = "next_generation"
        question.goalTarget = None
    if question.presentation not in ALLOWED_PRESENTATIONS:
        question.presentation = (
            "anchored-sheet"
            if stage == "micro"
            else "corner-card"
            if normalized_move == "summarize"
            else "compare-popup"
            if normalized_move == "challenge"
            else "anchored-sheet"
        )
    question.controlTemplateIds = [
        template_id
        for template_id in question.controlTemplateIds
        if template_id in ALLOWED_CONTROL_TEMPLATE_IDS
    ] or _default_template_ids(normalized_move)
    question.stage = stage
    if normalized_move != "goal_reframe":
        question.goalTarget = None
    return question


def _sanitize_goal_update(
    draft: ClarificationDraftGoalUpdateResponse,
    request: ClarificationDraftGoalUpdateRequest,
) -> ClarificationDraftGoalUpdateResponse:
    draft.target = _normalize_goal_target(draft.target) or request.target
    if draft.target == "business_goal":
        draft.directionAngles = []
        draft.imageTypeChips = []
    elif not draft.directionAngles:
        draft.directionAngles = request.postGoalDirectionAngles[:4]
    return draft


def _feedback_texts(request: ClarificationEvaluateRequest) -> List[str]:
    texts: List[str] = []
    for signal in request.feedbackSignals:
        texts.extend(signal.reasons)
        if signal.customNote:
            texts.append(signal.customNote)
    return [_clean_text(entry).lower() for entry in texts if _clean_text(entry)]


def _fallback_evaluate(request: ClarificationEvaluateRequest) -> ClarificationEvaluationResponse:
    stage = _normalize_stage(request.stage)
    texts = _feedback_texts(request)
    positive_count = sum(1 for signal in request.feedbackSignals if signal.feedbackType == "yes")
    negative_count = sum(1 for signal in request.feedbackSignals if signal.feedbackType == "no")
    source_node_ids = [signal.nodeId for signal in request.feedbackSignals[:4]]
    goal_text = _clean_text(
        " | ".join(
            [
                request.businessGoalTitle,
                request.businessGoalDescription,
                request.postGoalTitle,
                request.postGoalDescription,
                *request.postGoalDirectionAngles,
            ]
        )
    ).lower()

    if not texts:
        return ClarificationEvaluationResponse(status="idle", source="fallback_rules")

    if stage == "micro":
        selected_reason = _clean_text(request.selectedReason).lower()
        selected_meta = request.selectedReasonMeta or {}
        ambiguity = _clean_text(selected_meta.get("ambiguity")).lower()
        dimension = _clean_text(selected_meta.get("dimension")).lower()
        follow_up_stage = _normalize_stage(selected_meta.get("followUpStage"))
        likely_follow_up = _normalize_move(selected_meta.get("likelyFollowUp"))
        follow_up_focus = _ensure_sentence(_clean_text(selected_meta.get("followUpFocus")))
        system_interpretation = _ensure_sentence(
            _clean_text(selected_meta.get("systemInterpretation"))
        )
        source_node_ids = [request.primaryNodeId] if request.primaryNodeId else source_node_ids[:1]

        if not selected_reason:
            return ClarificationEvaluationResponse(status="idle", source="fallback_rules")

        if follow_up_stage == "macro":
            return ClarificationEvaluationResponse(status="idle", source="fallback_rules")

        if likely_follow_up in {"summarize", "probe", "clarify"}:
            return ClarificationEvaluationResponse(
                status="armed",
                family=likely_follow_up,
                move=likely_follow_up,
                urgency="high" if ambiguity == "high" else "medium",
                triggerReason="model-linked-follow-up",
                rationale=follow_up_focus
                or system_interpretation
                or "The selected critique was marked as worth one image-level follow-up.",
                focusDimension=_normalize_dimension(dimension),
                sourceNodeIds=source_node_ids,
                source="fallback_rules",
            )

        if dimension == "strategy":
            return ClarificationEvaluationResponse(
                status="armed",
                family="clarify",
                move="clarify",
                urgency="medium",
                triggerReason="strategy-scope-check",
                rationale="The selected reason sounds broad enough that the system should clarify whether it is about direction or execution.",
                sourceNodeIds=source_node_ids,
                source="fallback_rules",
            )

        if ambiguity == "high" or any(term in selected_reason for term in VAGUE_TERMS):
            return ClarificationEvaluationResponse(
                status="armed",
                family="probe",
                move="probe",
                urgency="medium",
                triggerReason="image-level-ambiguity",
                rationale="The user gave a meaningful reason, but it still needs one image-specific follow-up.",
                sourceNodeIds=source_node_ids,
                source="fallback_rules",
            )

        return ClarificationEvaluationResponse(status="idle", source="fallback_rules")

    macro_reason_signals = []
    for signal in request.feedbackSignals:
        for meta in signal.reasonMeta:
            if _normalize_stage(meta.get("followUpStage")) == "macro":
                macro_reason_signals.append((signal, meta))

    if stage == "macro" and macro_reason_signals:
        source_signals = [signal for signal, _meta in macro_reason_signals[:4]]
        source_node_ids = [signal.nodeId for signal in source_signals]
        primary_meta = macro_reason_signals[0][1]
        likely_follow_up = _normalize_move(primary_meta.get("likelyFollowUp"))
        ambiguity = _clean_text(primary_meta.get("ambiguity")).lower()
        focus_dimension = _normalize_dimension(primary_meta.get("dimension"))
        follow_up_focus = _ensure_sentence(_clean_text(primary_meta.get("followUpFocus")))
        system_interpretation = _ensure_sentence(
            _clean_text(primary_meta.get("systemInterpretation"))
        )
        move = (
            likely_follow_up
            if likely_follow_up in {"summarize", "challenge", "goal_reframe"}
            else "challenge"
            if focus_dimension == "strategy"
            else "summarize"
        )

        return ClarificationEvaluationResponse(
            status="interrupt_now" if move == "challenge" or ambiguity == "high" else "armed",
            family="clarify" if move == "goal_reframe" else move,
            move=move,
            urgency="high" if ambiguity == "high" or move == "challenge" else "medium",
            triggerReason="model-linked-macro-follow-up",
            rationale=follow_up_focus
            or system_interpretation
            or "One of the selected critiques points to a set-level tradeoff or goal question.",
            focusDimension=focus_dimension,
            sourceNodeIds=source_node_ids,
            applyTarget="goal_update" if move == "goal_reframe" else "next_generation",
            goalTarget="post_goal" if move == "goal_reframe" else None,
            source="fallback_rules",
        )

    if any(term in text for text in texts for term in CHALLENGE_TERMS):
        return ClarificationEvaluationResponse(
            status="interrupt_now",
            family="challenge",
            move="challenge",
            urgency="high",
            triggerReason="contradiction-detected",
            rationale="Recent feedback sounds inconsistent with earlier stated intent.",
            sourceNodeIds=source_node_ids,
            source="fallback_rules",
        )

    if positive_count >= 2 and negative_count >= 1:
        return ClarificationEvaluationResponse(
            status="armed",
            family="summarize",
            move="summarize",
            urgency="medium",
            triggerReason="stable-pattern",
            rationale="The system sees a stable preference pattern worth confirming.",
            sourceNodeIds=source_node_ids,
            source="fallback_rules",
        )

    if any(term in text for text in texts for term in STRATEGY_TERMS):
        if stage == "macro":
            return ClarificationEvaluationResponse(
                status="interrupt_now",
                family="challenge",
                move="challenge",
                urgency="high",
                triggerReason="strategy-level-tension",
                rationale="The pattern of feedback suggests a mismatch between the current direction and the broader intent.",
                sourceNodeIds=source_node_ids,
                source="fallback_rules",
            )
        return ClarificationEvaluationResponse(
            status="interrupt_now",
            family="clarify",
            move="clarify",
            urgency="high",
            triggerReason="scope-ambiguity",
            rationale="Feedback sounds like it may refer to strategy rather than execution only.",
            sourceNodeIds=source_node_ids,
            applyTarget="next_generation",
            source="fallback_rules",
        )

    if any(term in text for text in texts for term in VAGUE_TERMS):
        if stage == "macro":
            return ClarificationEvaluationResponse(
                status="armed",
                family="summarize",
                move="summarize",
                urgency="medium",
                triggerReason="set-level-ambiguity",
                rationale="The set still contains uncertainty worth reflecting back before the next generation.",
                sourceNodeIds=source_node_ids,
                source="fallback_rules",
            )
        return ClarificationEvaluationResponse(
            status="armed",
            family="probe",
            move="probe",
            urgency="medium",
            triggerReason="vague-feedback",
            rationale="The feedback is meaningful but under-specified.",
            sourceNodeIds=source_node_ids,
            source="fallback_rules",
        )

    preferred_tags = {
        token
        for token in ["premium", "dark", "clean", "natural", "calm", "lifestyle", "hero", "detail", "ingredient"]
        if any(token in text for text in texts)
    }
    goal_tags = {
        token
        for token in ["premium", "bright", "hero", "lifestyle", "detail", "ingredient", "product", "launch", "urban"]
        if token in goal_text
    }
    drifting_tags = preferred_tags - goal_tags

    if len(drifting_tags) >= 2 and positive_count >= 2:
        return ClarificationEvaluationResponse(
            status="interrupt_now",
            family="clarify",
            move="goal_reframe",
            urgency="high",
            triggerReason="goal-drift-detected",
            rationale="Recent preferred cues are drifting away from the current goal framing.",
            sourceNodeIds=source_node_ids,
            applyTarget="goal_update",
            goalTarget="post_goal",
            source="fallback_rules",
        )

    return ClarificationEvaluationResponse(status="idle", source="fallback_rules")


def _default_template_ids(move: str) -> List[str]:
    if move == "summarize":
        return ["summary-confirm", "note"]
    if move == "probe":
        return ["probe", "note"]
    if move == "challenge":
        return ["challenge-response", "note"]
    if move == "goal_reframe":
        return ["goal-reframe", "note"]
    return ["clarify-interpretation", "clarify-scope", "note"]


def _fallback_question(request: ClarificationQuestionGenerationRequest) -> ClarificationQuestionGenerationResponse:
    stage = _normalize_stage(request.stage)
    evaluation = request.evaluation
    source_signals = [
        signal for signal in request.feedbackSignals if signal.nodeId in set(evaluation.sourceNodeIds or [])
    ] or request.feedbackSignals[:2]
    selected_meta = request.selectedReasonMeta or {}
    selected_focus = _ensure_sentence(_clean_text(selected_meta.get("followUpFocus")))
    selected_interpretation = _ensure_sentence(
        _clean_text(selected_meta.get("systemInterpretation"))
    )
    selected_reason = _clean_text(request.selectedReason)
    original_feedback = " | ".join(
        [
            _clean_text(text)
            for signal in source_signals
            for text in [*signal.reasons, signal.customNote]
            if _clean_text(text)
        ][:3]
    )

    if stage == "micro":
        if evaluation.move == "probe":
            prompt = (
                selected_focus
                or (
                    f'You chose "{selected_reason}". What specifically should I tune here?'
                    if selected_reason
                    else "What part of this image are you reacting to most?"
                )
            )
            title = "Pin this down"
            subtitle = "Image-specific follow-up"
        elif evaluation.move == "summarize":
            prompt = (
                f"Should I read this as: {selected_interpretation[:-1].lower()}?"
                if selected_interpretation
                else "Should I keep reading this as the main thing that is working in this image?"
            )
            title = "Check the read"
            subtitle = "Image-specific follow-up"
        else:
            prompt = (
                selected_focus
                or "Do you mean the direction itself is wrong, or just this execution?"
            )
            title = "Clarify the scope"
            subtitle = "Image-specific follow-up"
    elif evaluation.move == "summarize":
        prompt = "You consistently favored the more credible, restrained directions in this set. Is that the right read?"
        title = "Check the read"
        subtitle = "Summary interruption"
    elif evaluation.move == "probe":
        prompt = "What part of this image direction needs to change most?"
        title = "Need more detail"
        subtitle = "Probe interruption"
    elif evaluation.move == "challenge":
        prompt = "Your recent choices suggest a shift in taste. Has your goal changed, or were the earlier examples just wrong?"
        title = "Noticed a change"
        subtitle = "Challenge interruption"
    elif evaluation.move == "goal_reframe":
        target_label = "post goal" if evaluation.goalTarget != "business_goal" else "business goal"
        prompt = f"Your recent choices are steering away from the current direction. Should I update this {target_label}?"
        title = "Check the goal fit"
        subtitle = "Clarify interruption"
    else:
        prompt = "Should I treat this as a strategy issue or an execution issue, and how broadly should it apply?"
        title = "Clarifying scope"
        subtitle = "Clarify interruption"

    presentation = (
        "anchored-sheet"
        if stage == "micro"
        else "corner-card"
        if evaluation.move == "summarize"
        else "compare-popup"
        if evaluation.move == "challenge"
        else "anchored-sheet"
    )

    return ClarificationQuestionGenerationResponse(
        id=f"{evaluation.move or 'clarify'}:{request.currentBatchId or 'current'}",
        stage=stage,
        family=evaluation.family or "clarify",
        move=evaluation.move or "clarify",
        source="fallback_rules",
        urgency=evaluation.urgency or "medium",
        triggerReason=evaluation.triggerReason or "",
        title=title,
        subtitle=subtitle,
        prompt=prompt,
        sourceBatchId=request.currentBatchId,
        sourceNodeIds=evaluation.sourceNodeIds or [signal.nodeId for signal in source_signals],
        focusDimension=evaluation.focusDimension,
        originalFeedback=original_feedback,
        summaryCandidate=prompt if evaluation.move == "summarize" else "",
        evidenceRefs=[
            {
                "nodeId": signal.nodeId,
                "label": "Recent choice" if index == 0 else f"Reference {index + 1}",
                "description": _clean_text(signal.analysisTitle or signal.analysisSummary),
            }
            for index, signal in enumerate(source_signals[:3])
        ],
        controlTemplateIds=_default_template_ids(evaluation.move or "clarify"),
        applyTarget=evaluation.applyTarget or "next_generation",
        goalTarget=evaluation.goalTarget,
        presentation=presentation,
    )


def _fallback_goal_update(request: ClarificationDraftGoalUpdateRequest) -> ClarificationDraftGoalUpdateResponse:
    target = request.target
    answer_note = _clean_text(request.answerValues.get("goal-reframe-note") or request.answerValues.get("clarify-note") or "")
    insight = _clean_text(request.activeInsights[0].summary) if request.activeInsights else ""

    if target == "business_goal":
        title = _clean_text(request.businessGoalTitle) or "Refined business goal"
        description = _ensure_sentence(answer_note or insight or request.businessGoalDescription or "Refine the campaign objective to better match the current preferred direction")
        rationale = _ensure_sentence(f"This update reflects a repeated preference shift observed during exploration")
        return ClarificationDraftGoalUpdateResponse(
            id=f"goal-update-{request.target}",
            target=target,
            title=title,
            description=description,
            rationale=rationale,
            triggerReason="fallback-goal-draft",
        )

    title = _clean_text(request.postGoalTitle) or "Refined post goal"
    description = _ensure_sentence(answer_note or insight or request.postGoalDescription or "Refine this post direction to match the preferred visual cues")
    direction_angles = request.postGoalDirectionAngles[:4] or [
        "Hero-led product spotlight with calmer, more premium styling",
        "In-use scene with more believable context and restrained palette",
        "Detail-first composition that emphasizes tactile quality",
        "Editorial product scene with stronger credibility cues",
    ]
    image_type_chips = [angle.split()[0].lower() if angle else f"route {index + 1}" for index, angle in enumerate(direction_angles[:4])]
    return ClarificationDraftGoalUpdateResponse(
        id=f"goal-update-{request.target}",
        target=target,
        title=title,
        description=description,
        rationale=_ensure_sentence("This rewrite reflects the clarified direction emerging from recent choices"),
        whyThisDirectionFits=_ensure_sentence("It aligns the post goal with the cues the user has repeatedly favored"),
        directionAngles=direction_angles[:4],
        imageTypeChips=image_type_chips[:4],
        triggerReason="fallback-goal-draft",
    )


async def evaluate_clarification(request: ClarificationEvaluateRequest) -> ClarificationEvaluationResponse:
    stage = _normalize_stage(request.stage)
    if not request.feedbackSignals:
        return ClarificationEvaluationResponse(status="idle", source="fallback_rules")

    prompt = f"""
You are the clarification controller for an interactive creative direction studio.

Your job:
- inspect the current feedback and prior clarification memory
- decide whether the system should ask a clarification question at this stage
- if stage=micro, stay image-local and only ask if one follow-up would materially sharpen the next generation
- if stage=macro, reason across the set and decide whether there is contradiction, goal drift, or an unresolved tradeoff

Rules:
- status must be one of: idle, armed, interrupt_now
- family must be one of: summarize, probe, clarify, challenge
- move must be one of: summarize, probe, clarify, challenge, goal_reframe
- stage is {stage}
- selectedReasonMeta and feedbackSignals[].reasonMeta are model-generated critique annotations; treat them as the preferred map of what each critique means and what kind of follow-up it merits
- if stage=micro, allowed moves are summarize, probe, clarify
- if stage=macro, allowed moves are summarize, challenge, goal_reframe
- only use move=goal_reframe when the system should ask whether to update the post goal or business goal
- if move=goal_reframe, family must still be clarify and applyTarget must be goal_update
- use interrupt_now for contradictions, severe ambiguity, or repeated goal drift
- use armed when a question would help but can wait until generation/regeneration
- use idle when current feedback is not specific enough yet
- sourceNodeIds should point to the 1-4 most relevant feedback signals

Context JSON:
{json.dumps(request.model_dump(), ensure_ascii=False, indent=2)}
"""

    try:
        response = get_openai_client().beta.chat.completions.parse(
            model=CLARIFICATION_CONTROLLER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format=ClarificationEvaluationResponse,
        )
        parsed = response.choices[0].message.parsed
        if not parsed:
            raise ValueError("No clarification evaluation returned")
        parsed.source = "ai"
        return _sanitize_evaluation(parsed, stage)
    except Exception:
        return _sanitize_evaluation(_fallback_evaluate(request), stage)


async def generate_clarification_question(
    request: ClarificationQuestionGenerationRequest,
) -> ClarificationQuestionGenerationResponse:
    stage = _normalize_stage(request.stage)
    if request.evaluation.status == "idle" or not request.evaluation.move:
        raise ValueError("Question generation requested without an active evaluation")

    prompt = f"""
You are an expert design strategist interrupting a creative exploration at the right moment.

Turn the evaluation below into one strong, evidence-backed clarification question.

Question stage: {stage}

Allowed presentation values:
- corner-card
- anchored-sheet
- compare-popup

Allowed control template ids:
- summary-confirm
- challenge-response
- clarify-interpretation
- clarify-scope
- goal-reframe
- probe
- note

Rules:
- keep the wording natural, specific, and expert-like
- make the prompt reference the actual situation, not generic methodology
- selectedReasonMeta and feedbackSignals[].reasonMeta contain model-generated interpretation and follow-up intent; use them to ground the wording and scope of the question
- if stage=micro, keep the question image-specific and do not challenge the overall goal
- if stage=macro, do not ask image-local probe questions
- if move=goal_reframe, frame it as a clarify question about updating the goal
- use corner-card for summarize, compare-popup for challenge, anchored-sheet otherwise
- choose only from the allowed control template ids
- include 1-3 evidenceRefs using node ids from the provided feedbackSignals
- do not invent unsupported UI controls

Context JSON:
{json.dumps(request.model_dump(), ensure_ascii=False, indent=2)}
"""

    try:
        response = get_openai_client().beta.chat.completions.parse(
            model=CLARIFICATION_QUESTION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format=ClarificationQuestionGenerationResponse,
        )
        parsed = response.choices[0].message.parsed
        if not parsed:
            raise ValueError("No clarification question returned")
        parsed.source = "ai"
        return _sanitize_question(parsed, stage)
    except Exception:
        return _sanitize_question(_fallback_question(request), stage)


async def draft_goal_update(
    request: ClarificationDraftGoalUpdateRequest,
) -> ClarificationDraftGoalUpdateResponse:
    prompt = f"""
You are revising creative goals inside a social-media exploration tool.

Create a compact goal rewrite that reflects the clarified user preference.

Rules:
- target is either post_goal or business_goal
- if target=post_goal:
  - rewrite the post goal title, description, rationale, whyThisDirectionFits
  - provide 4 distinct directionAngles
  - provide 4 short imageTypeChips aligned to those directionAngles
- if target=business_goal:
  - rewrite only the business goal title, description, and rationale
  - directionAngles and imageTypeChips should be empty
- do not mention the software or clarification process
- keep the rewrite concise, strategic, and realistic for a brand owner

Context JSON:
{json.dumps(request.model_dump(), ensure_ascii=False, indent=2)}
"""

    try:
        response = get_openai_client().beta.chat.completions.parse(
            model=CLARIFICATION_GOAL_UPDATE_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format=ClarificationDraftGoalUpdateResponse,
        )
        parsed = response.choices[0].message.parsed
        if not parsed:
            raise ValueError("No goal draft returned")
        return _sanitize_goal_update(parsed, request)
    except Exception:
        return _fallback_goal_update(request)
