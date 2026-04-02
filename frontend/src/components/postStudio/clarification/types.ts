import type {
  ClarificationCycle,
  ClarificationDimension,
  ClarificationDraftGoalUpdate,
  ClarificationEvaluationSnapshot,
  ClarificationFamily,
  ClarificationInterpretation,
  ClarificationMemory,
  ClarificationMove,
  ClarificationScope,
  ClarificationSource,
  ClarificationUrgency,
  FeedbackData,
  PostNode
} from '../../history/types';
import type { PostStudioActionType } from '../types';

export type ClarificationPresentation = 'corner-card' | 'anchored-sheet' | 'compare-popup';

export type ClarificationApplyTarget = 'next_generation' | 'goal_update';

export type ClarificationStage = 'micro' | 'macro';

export type ClarificationControlTemplateId =
  | 'summary-confirm'
  | 'challenge-response'
  | 'clarify-interpretation'
  | 'clarify-scope'
  | 'goal-reframe'
  | 'probe'
  | 'note';

export type ClarificationOptionVisual =
  | {
      kind: 'swatch';
      value: string;
    }
  | {
      kind: 'specimen';
      text: string;
      tone?: 'clean' | 'editorial' | 'bold' | 'neutral';
    }
  | {
      kind: 'icon';
      value: 'scope' | 'target' | 'compare' | 'tune';
    };

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
  visual?: ClarificationOptionVisual;
}

export interface ClarificationChoiceControl {
  id: string;
  kind: 'choice';
  label: string;
  selectionMode: 'single' | 'multiple';
  appearance?: 'chips' | 'cards' | 'swatches' | 'specimens';
  options: ClarificationOption[];
  required?: boolean;
  maxSelections?: number;
}

export interface ClarificationScaleControl {
  id: string;
  kind: 'scale';
  label: string;
  min: number;
  max: number;
  step?: number;
  minLabel: string;
  maxLabel: string;
  defaultValue?: number;
}

export interface ClarificationTextControl {
  id: string;
  kind: 'text';
  label: string;
  placeholder: string;
  multiline?: boolean;
  optional?: boolean;
}

export type ClarificationControl =
  | ClarificationChoiceControl
  | ClarificationScaleControl
  | ClarificationTextControl;

export interface ClarificationEvidenceImage {
  id: string;
  imageUrl: string;
  label: string;
  description?: string;
}

export interface ClarificationQuestion {
  id: string;
  stage?: ClarificationStage;
  family: ClarificationFamily;
  move: ClarificationMove;
  source: ClarificationSource;
  urgency: ClarificationUrgency;
  presentation: ClarificationPresentation;
  triggerReason?: string;
  title: string;
  subtitle: string;
  prompt: string;
  sourceBatchId?: string | null;
  sourceNodeIds: string[];
  focusDimension?: ClarificationDimension;
  anchorTargetId?: string;
  originalFeedback?: string;
  summaryCandidate?: string;
  evidenceImages?: ClarificationEvidenceImage[];
  controls: ClarificationControl[];
  applyTarget?: ClarificationApplyTarget;
  goalTarget?: 'post_goal' | 'business_goal';
}

export interface ClarificationAnswer {
  questionId: string;
  family: ClarificationFamily;
  move: ClarificationMove;
  values: Record<string, string | string[] | number>;
  skipped?: boolean;
  answeredAt: number;
}

export interface ClarificationSignal {
  nodeId: string;
  batchId?: string | null;
  feedbackType: FeedbackData['type'];
  texts: string[];
  combinedText: string;
  dimensions: ClarificationDimension[];
  tags: string[];
  intensity: number;
  directionAngle?: string | null;
  analysisKeywords?: string[];
  sourcePost: PostNode;
}

export interface ClarificationGoalProfile {
  sourceTexts: string[];
  tags: string[];
  dimensions: ClarificationDimension[];
  summary: string;
}

export interface ClarificationAlignmentAssessment {
  preferredTags: string[];
  avoidedTags: string[];
  goalTags: string[];
  matchingTags: string[];
  driftingTags: string[];
  opposingGoalTags: string[];
  driftScore: number;
  shouldReframe: boolean;
  rationale: string[];
}

export interface ClarificationDiagnostics {
  signals: ClarificationSignal[];
  goalProfile: ClarificationGoalProfile;
  alignment: ClarificationAlignmentAssessment;
}

export interface ClarificationDecision {
  question: ClarificationQuestion | null;
  reason?: string;
  diagnostics?: ClarificationDiagnostics;
  evaluation?: ClarificationEvaluationSnapshot | null;
}

export interface ClarificationTriggerContext {
  stage: ClarificationStage;
  actionType: Extract<PostStudioActionType, 'explore' | 'regenerate'>;
  posts: PostNode[];
  historyNodes?: Map<string, PostNode>;
  selectedPost?: PostNode | null;
  selectedGridIndex?: number | null;
  primaryNodeId?: string | null;
  selectedReason?: string;
  selectedReasonMeta?: {
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: ClarificationDimension;
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: ClarificationFamily;
    followUpStage?: 'micro' | 'macro';
  };
  reasonMetaByNodeId?: Record<string, Array<{
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: ClarificationDimension;
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: ClarificationFamily;
    followUpStage?: 'micro' | 'macro';
  }>>;
  guidedSummary?: {
    likedNodeIds: string[];
    dislikedNodeIds: string[];
    unsureNodeIds: string[];
    keepSignals: string[];
    avoidSignals: string[];
    unresolvedSignals: string[];
  };
  memory: ClarificationMemory;
  direction?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  businessGoalDescription?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  postGoalDirectionAngles?: string[];
}

export interface ClarificationContextPayload {
  activeInsights: Array<{
    id: string;
    family?: ClarificationFamily;
    move: ClarificationMove;
    summary: string;
    scope: ClarificationScope;
    dimension?: ClarificationDimension;
    interpretation?: ClarificationInterpretation;
    strength?: number;
    signalTags?: string[];
  }>;
  recentRecords: Array<{
    id: string;
    family?: ClarificationFamily;
    move: ClarificationMove;
    summary: string;
    answerLabel: string;
  }>;
  recentCycles?: Array<{
    id: string;
    family?: ClarificationFamily;
    move: ClarificationMove;
    status: ClarificationCycle['status'];
    summary: string;
    answerLabel?: string;
    goalUpdateTarget?: 'post_goal' | 'business_goal';
  }>;
}

export interface ClarificationPendingRequest {
  actionType: Extract<PostStudioActionType, 'explore' | 'regenerate'>;
  parentNodeId: string | null;
  feedback?: FeedbackData;
  similarity?: number;
  direction?: string;
  directionAngles?: string[];
  feedbackSourcePosts?: PostNode[];
  pushBatchId?: string | null;
  autoExecute?: boolean;
}

export interface ClarificationFeedbackSignalPayload {
  nodeId: string;
  imageUrl?: string | null;
  feedbackType: 'yes' | 'no' | 'unsure';
  reasons: string[];
  reasonMeta?: Array<{
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: ClarificationDimension;
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: ClarificationFamily;
    followUpStage?: 'micro' | 'macro';
  }>;
  customNote?: string;
  analysisTitle?: string;
  analysisSummary?: string;
  analysisKeywords?: string[];
  directionAngle?: string | null;
}

export interface ClarificationEvaluationRequestPayload {
  stage: ClarificationStage;
  actionType: Extract<PostStudioActionType, 'explore' | 'regenerate'>;
  currentBatchId?: string | null;
  selectedPostId?: string | null;
  primaryNodeId?: string | null;
  selectedReason?: string;
  selectedReasonMeta?: {
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: ClarificationDimension;
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: ClarificationFamily;
    followUpStage?: 'micro' | 'macro';
  };
  guidedSummary?: {
    likedNodeIds: string[];
    dislikedNodeIds: string[];
    unsureNodeIds: string[];
    keepSignals: string[];
    avoidSignals: string[];
    unresolvedSignals: string[];
  };
  brandNarrative?: string;
  businessGoalTitle?: string;
  businessGoalDescription?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  postGoalDirectionAngles?: string[];
  feedbackSignals: ClarificationFeedbackSignalPayload[];
  activeInsights: ClarificationContextPayload['activeInsights'];
  recentRecords: ClarificationContextPayload['recentRecords'];
  recentCycles: NonNullable<ClarificationContextPayload['recentCycles']>;
}

export interface ClarificationQuestionPlanPayload {
  id?: string;
  stage?: ClarificationStage;
  family: ClarificationFamily;
  move: ClarificationMove;
  source: ClarificationSource;
  urgency: ClarificationUrgency;
  triggerReason?: string;
  title: string;
  subtitle: string;
  prompt: string;
  sourceBatchId?: string | null;
  sourceNodeIds: string[];
  focusDimension?: ClarificationDimension;
  anchorTargetId?: string;
  originalFeedback?: string;
  summaryCandidate?: string;
  evidenceRefs?: Array<{
    nodeId: string;
    label: string;
    description?: string;
  }>;
  controlTemplateIds: ClarificationControlTemplateId[];
  applyTarget?: ClarificationApplyTarget;
  goalTarget?: 'post_goal' | 'business_goal';
  presentation?: ClarificationPresentation;
}

export interface ClarificationQuestionGenerationRequestPayload
  extends ClarificationEvaluationRequestPayload {
  evaluation: ClarificationEvaluationSnapshot;
}

export interface ClarificationDraftGoalUpdatePayload extends ClarificationDraftGoalUpdate {
  triggerReason?: string;
}

export interface ClarificationDraftGoalUpdateRequestPayload {
  target: 'post_goal' | 'business_goal';
  family: ClarificationFamily;
  move: ClarificationMove;
  brandNarrative?: string;
  businessGoalTitle?: string;
  businessGoalDescription?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  postGoalDirectionAngles?: string[];
  answerLabel?: string;
  answerValues: Record<string, string | string[] | number>;
  activeInsights: ClarificationContextPayload['activeInsights'];
  recentRecords: ClarificationContextPayload['recentRecords'];
  recentCycles: NonNullable<ClarificationContextPayload['recentCycles']>;
  feedbackSignals: ClarificationFeedbackSignalPayload[];
}

export interface ClarificationPendingGoalDraft {
  cycleId: string;
  draft: ClarificationDraftGoalUpdate;
  pendingRequest: ClarificationPendingRequest | null;
}
