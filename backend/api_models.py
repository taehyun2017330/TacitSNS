from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BrandInfo(BaseModel):
    name: str
    category: str
    description: str
    images: List[str] = Field(default_factory=list)


class PostGenerationRequest(BaseModel):
    brandSummary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    parentNodeId: Optional[str] = None
    parentImageUrl: Optional[str] = None
    parentKeywords: List[str] = Field(default_factory=list)
    seedImageUrls: List[str] = Field(default_factory=list)
    direction: Optional[str] = None
    directionAngles: List[str] = Field(default_factory=list)
    analysisDirectionAngles: List[str] = Field(default_factory=list)
    iteration: int = 0
    userFeedback: Optional[Dict[str, Any]] = None
    imagesFeedback: Optional[List[Dict[str, Any]]] = None
    clarificationContext: Optional[Dict[str, Any]] = None
    explorationLevel: float = 0.5
    similarity: Optional[float] = None
    actionType: Optional[str] = None
    editOptions: Optional[Dict[str, Any]] = None
    numImages: int = 4


class ClarificationInsightPayload(BaseModel):
    id: str = ""
    family: Optional[str] = None
    move: str = ""
    summary: str = ""
    scope: str = "post"
    dimension: Optional[str] = None
    interpretation: Optional[str] = None
    strength: Optional[float] = None
    signalTags: List[str] = Field(default_factory=list)


class ClarificationRecordPayload(BaseModel):
    id: str = ""
    family: Optional[str] = None
    move: str = ""
    summary: str = ""
    answerLabel: str = ""


class ClarificationCyclePayload(BaseModel):
    id: str = ""
    family: Optional[str] = None
    move: str = ""
    status: str = ""
    prompt: str = ""
    summary: str = ""
    answerLabel: str = ""
    goalUpdateTarget: Optional[str] = None


class ClarificationFeedbackSignalRequest(BaseModel):
    nodeId: str
    imageUrl: Optional[str] = None
    feedbackType: str
    reasons: List[str] = Field(default_factory=list)
    reasonMeta: List[Dict[str, Any]] = Field(default_factory=list)
    customNote: str = ""
    analysisTitle: str = ""
    analysisSummary: str = ""
    analysisKeywords: List[str] = Field(default_factory=list)
    directionAngle: Optional[str] = None


class ClarificationGuidedSummaryPayload(BaseModel):
    likedNodeIds: List[str] = Field(default_factory=list)
    dislikedNodeIds: List[str] = Field(default_factory=list)
    unsureNodeIds: List[str] = Field(default_factory=list)
    keepSignals: List[str] = Field(default_factory=list)
    avoidSignals: List[str] = Field(default_factory=list)
    unresolvedSignals: List[str] = Field(default_factory=list)


class ClarificationEvaluateRequest(BaseModel):
    stage: str = "macro"
    actionType: str
    currentBatchId: Optional[str] = None
    selectedPostId: Optional[str] = None
    primaryNodeId: Optional[str] = None
    selectedReason: Optional[str] = None
    selectedReasonMeta: Dict[str, Any] = Field(default_factory=dict)
    guidedSummary: Optional[ClarificationGuidedSummaryPayload] = None
    brandNarrative: str = ""
    businessGoalTitle: str = ""
    businessGoalDescription: str = ""
    postGoalTitle: str = ""
    postGoalDescription: str = ""
    postGoalDirectionAngles: List[str] = Field(default_factory=list)
    feedbackSignals: List[ClarificationFeedbackSignalRequest] = Field(default_factory=list)
    activeInsights: List[ClarificationInsightPayload] = Field(default_factory=list)
    recentRecords: List[ClarificationRecordPayload] = Field(default_factory=list)
    recentCycles: List[ClarificationCyclePayload] = Field(default_factory=list)


class ClarificationEvaluationResponse(BaseModel):
    status: str = "idle"
    family: Optional[str] = None
    move: Optional[str] = None
    urgency: str = "low"
    triggerReason: str = ""
    rationale: str = ""
    focusDimension: Optional[str] = None
    sourceNodeIds: List[str] = Field(default_factory=list)
    applyTarget: str = "next_generation"
    goalTarget: Optional[str] = None
    source: str = "ai"


class ClarificationEvidenceRef(BaseModel):
    nodeId: str
    label: str
    description: str = ""


class ClarificationQuestionGenerationRequest(BaseModel):
    evaluation: ClarificationEvaluationResponse
    stage: str = "macro"
    actionType: str
    currentBatchId: Optional[str] = None
    selectedPostId: Optional[str] = None
    primaryNodeId: Optional[str] = None
    selectedReason: Optional[str] = None
    selectedReasonMeta: Dict[str, Any] = Field(default_factory=dict)
    guidedSummary: Optional[ClarificationGuidedSummaryPayload] = None
    brandNarrative: str = ""
    businessGoalTitle: str = ""
    businessGoalDescription: str = ""
    postGoalTitle: str = ""
    postGoalDescription: str = ""
    postGoalDirectionAngles: List[str] = Field(default_factory=list)
    feedbackSignals: List[ClarificationFeedbackSignalRequest] = Field(default_factory=list)
    activeInsights: List[ClarificationInsightPayload] = Field(default_factory=list)
    recentRecords: List[ClarificationRecordPayload] = Field(default_factory=list)
    recentCycles: List[ClarificationCyclePayload] = Field(default_factory=list)


class ClarificationQuestionGenerationResponse(BaseModel):
    id: Optional[str] = None
    stage: Optional[str] = None
    family: str
    move: str
    source: str = "ai"
    urgency: str = "medium"
    triggerReason: str = ""
    title: str
    subtitle: str
    prompt: str
    sourceBatchId: Optional[str] = None
    sourceNodeIds: List[str] = Field(default_factory=list)
    focusDimension: Optional[str] = None
    originalFeedback: str = ""
    summaryCandidate: str = ""
    evidenceRefs: List[ClarificationEvidenceRef] = Field(default_factory=list)
    controlTemplateIds: List[str] = Field(default_factory=list)
    applyTarget: str = "next_generation"
    goalTarget: Optional[str] = None
    presentation: Optional[str] = None


class ClarificationDraftGoalUpdateRequest(BaseModel):
    target: str
    family: str = "clarify"
    move: str = "goal_reframe"
    brandNarrative: str = ""
    businessGoalTitle: str = ""
    businessGoalDescription: str = ""
    postGoalTitle: str = ""
    postGoalDescription: str = ""
    postGoalDirectionAngles: List[str] = Field(default_factory=list)
    answerLabel: str = ""
    answerValues: Dict[str, Any] = Field(default_factory=dict)
    activeInsights: List[ClarificationInsightPayload] = Field(default_factory=list)
    recentRecords: List[ClarificationRecordPayload] = Field(default_factory=list)
    recentCycles: List[ClarificationCyclePayload] = Field(default_factory=list)
    feedbackSignals: List[ClarificationFeedbackSignalRequest] = Field(default_factory=list)


class ClarificationDraftGoalUpdateResponse(BaseModel):
    id: str
    target: str
    title: str
    description: str
    rationale: str = ""
    whyThisDirectionFits: str = ""
    directionAngles: List[str] = Field(default_factory=list)
    imageTypeChips: List[str] = Field(default_factory=list)
    triggerReason: str = ""


class EditImageRequest(BaseModel):
    imageUrl: str
    suggestedEdits: List[str] = Field(default_factory=list)
    customEdit: str = ""
    brandSummary: str


class CaptionRequest(BaseModel):
    imageUrl: str
    keywords: List[str] = Field(default_factory=list)
    brandInfo: Dict[str, Any] = Field(default_factory=dict)
    tone: str = "casual"


class CaptionGenerationRequest(BaseModel):
    imageUrl: str
    brandSummary: str
    tone: List[str] = Field(default_factory=lambda: ["professional"])
    length: str = "medium"
    includeHashtags: bool = True
    includeEmojis: bool = False
    customDirection: str = ""


class SuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    brandIdentity: Optional[str] = ""
    currentText: str
    sessionId: Optional[str] = None
    modelConfig: Dict[str, Any] = Field(default_factory=dict)
    brandContext: Dict[str, Any] = Field(default_factory=dict)


class FeedbackReasonSuggestion(BaseModel):
    label: str
    chipLabel: str = ""
    systemInterpretation: str = ""
    followUpFocus: str = ""
    dimension: Optional[str] = None
    ambiguity: str = "medium"
    likelyFollowUp: Optional[str] = None
    followUpStage: Optional[str] = None


class FeedbackReasonSuggestions(BaseModel):
    yes: List[FeedbackReasonSuggestion] = Field(default_factory=list)
    no: List[FeedbackReasonSuggestion] = Field(default_factory=list)
    unsure: List[FeedbackReasonSuggestion] = Field(default_factory=list)


class GeneratedImageAnalysis(BaseModel):
    index: int
    title: str = ""
    summary: str = ""
    supportsGoal: str = ""
    differencesFromSiblings: List[str] = Field(default_factory=list)
    designKeywords: List[str] = Field(default_factory=list)
    feedbackSuggestions: FeedbackReasonSuggestions = Field(default_factory=FeedbackReasonSuggestions)
    suggestedEdits: List[str] = Field(default_factory=list)
    vibe: str = ""


class GeneratedBatchAnalysis(BaseModel):
    overallDelta: str = ""
    visible_changes: List[str] = Field(default_factory=list)
    continuity: str = ""
    keyword_shifts: List[str] = Field(default_factory=list)
    bias_suggestions: List[str] = Field(default_factory=list)
    feedback_trace: List[str] = Field(default_factory=list)
    images: List[GeneratedImageAnalysis] = Field(default_factory=list)


class PostGoalSuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    brandIdentity: str = ""
    brandNarrative: str = ""
    businessGoalId: Optional[str] = None
    businessGoalTitle: str
    businessGoalDescription: str = ""
    businessGoalRationale: str = ""


class PostGoalReferenceSuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    brandIdentity: str = ""
    brandNarrative: str = ""
    businessGoalId: Optional[str] = None
    businessGoalTitle: str
    businessGoalDescription: str = ""
    businessGoalRationale: str = ""
    referenceImageUrl: str


class PostGoalDirectionItem(BaseModel):
    chip: str
    angle: str


class PostGoalSuggestionItem(BaseModel):
    id: str
    title: str
    description: str
    whyThisDirectionFits: str = ""
    taxonomyTags: List[str] = Field(default_factory=list)
    directions: List[PostGoalDirectionItem] = Field(default_factory=list)
    imageTypeChips: List[str] = Field(default_factory=list)
    directionAngles: List[str] = Field(default_factory=list)
    assistantPrompt: str
    previewTitle: Optional[str] = None
    previewCaption: Optional[str] = None
    previewBackground: Optional[str] = None


class PostGoalSuggestionResponse(BaseModel):
    suggestions: List[PostGoalSuggestionItem] = Field(default_factory=list)
    source: str = "fallback"


class PostGoalReferenceSuggestionResponse(BaseModel):
    suggestion: Optional[PostGoalSuggestionItem] = None
    source: str = "ai"


class BusinessGoalSuggestionRequest(BaseModel):
    brandName: Optional[str] = "your brand"
    brandCategory: Optional[str] = "business"
    brandIdentity: str = ""
    brandNarrative: str = ""


class BusinessGoalSuggestionItem(BaseModel):
    id: str
    title: str
    description: str
    rationale: str


class BusinessGoalSuggestionResponse(BaseModel):
    suggestions: List[BusinessGoalSuggestionItem] = Field(default_factory=list)
    source: str = "ai"
    model: Optional[str] = None
