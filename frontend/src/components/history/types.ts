export type FeedbackType = 'yes' | 'no' | 'unsure' | null;

export interface FeedbackData {
  type: FeedbackType;
  reasons: string[];
  customNote?: string;
  reasonMeta?: Array<{
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: 'color' | 'background' | 'typography' | 'composition' | 'product' | 'lighting' | 'mood' | 'strategy' | 'execution' | 'other';
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: 'summarize' | 'probe' | 'clarify' | 'challenge';
    followUpStage?: 'micro' | 'macro';
  }>;
}

export interface SelectionMetadata {
  parentBatchId: string;
  selectedNodeId: string;
  indexInGrid?: number;
}

export interface PostGoalContextMetadata {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  imageTypeChips?: string[];
  directionAngles?: string[];
}

export interface FeedbackReasonOption {
  label: string;
  chipLabel?: string;
  systemInterpretation?: string;
  followUpFocus?: string;
  dimension?: 'color' | 'background' | 'typography' | 'composition' | 'product' | 'lighting' | 'mood' | 'strategy' | 'execution' | 'other';
  ambiguity?: 'low' | 'medium' | 'high';
  likelyFollowUp?: 'summarize' | 'probe' | 'clarify' | 'challenge';
  followUpStage?: 'micro' | 'macro';
}

export interface FeedbackReasonSuggestions {
  yes?: FeedbackReasonOption[];
  no?: FeedbackReasonOption[];
  unsure?: FeedbackReasonOption[];
}

export interface ImageDesignAnalysis {
  title?: string;
  summary?: string;
  supportsGoal?: string;
  differencesFromSiblings?: string[];
  designKeywords?: string[];
  feedbackSuggestions?: FeedbackReasonSuggestions;
  suggestedEdits?: string[];
}

export interface BatchAnalysis {
  overallDelta?: string;
  visible_changes?: string[];
  continuity?: string;
  keyword_shifts?: string[];
  bias_suggestions?: string[];
  feedback_trace?: string[];
}

export type ClarificationFamily = 'summarize' | 'probe' | 'clarify' | 'challenge';

export type ClarificationMove =
  | 'summarize'
  | 'probe'
  | 'clarify'
  | 'challenge'
  | 'goal_reframe';

export type ClarificationTriggerState = 'idle' | 'armed' | 'interrupt_now';

export type ClarificationUrgency = 'low' | 'medium' | 'high';

export type ClarificationSource = 'ai' | 'fallback_rules';

export type ClarificationScope = 'image' | 'post' | 'future_posts' | 'brand';

export type ClarificationDimension =
  | 'color'
  | 'background'
  | 'typography'
  | 'composition'
  | 'product'
  | 'lighting'
  | 'mood'
  | 'strategy'
  | 'execution'
  | 'other';

export type ClarificationInterpretation =
  | 'confirm'
  | 'mostly_right'
  | 'revise'
  | 'wrong_strategy'
  | 'wrong_execution'
  | 'goal_changed'
  | 'same_goal_wrong_execution'
  | 'still_not_wanted'
  | 'keep_goal'
  | 'revise_post_goal'
  | 'revisit_business_goal';

export interface ClarificationDraftGoalUpdate {
  id: string;
  target: 'post_goal' | 'business_goal';
  title: string;
  description: string;
  rationale?: string;
  whyThisDirectionFits?: string;
  directionAngles?: string[];
  imageTypeChips?: string[];
  createdAt: number;
}

export interface ClarificationEvaluationSnapshot {
  status: ClarificationTriggerState;
  family?: ClarificationFamily;
  move?: ClarificationMove;
  urgency?: ClarificationUrgency;
  triggerReason?: string;
  rationale?: string;
  focusDimension?: ClarificationDimension;
  sourceNodeIds?: string[];
  applyTarget?: 'next_generation' | 'goal_update';
  goalTarget?: 'post_goal' | 'business_goal';
  source?: ClarificationSource;
  createdAt: number;
}

export interface ClarificationInsight {
  id: string;
  family?: ClarificationFamily;
  move: ClarificationMove;
  summary: string;
  scope: ClarificationScope;
  dimension?: ClarificationDimension;
  interpretation?: ClarificationInterpretation;
  strength?: number;
  signalTags?: string[];
  sourceNodeIds?: string[];
  sourceBatchId?: string | null;
  source?: ClarificationSource;
  createdAt: number;
  active: boolean;
}

export interface ClarificationRecordSummary {
  id: string;
  family?: ClarificationFamily;
  move: ClarificationMove;
  prompt: string;
  answerLabel: string;
  summary: string;
  createdAt: number;
}

export interface ClarificationCycle {
  id: string;
  family: ClarificationFamily;
  move: ClarificationMove;
  source: ClarificationSource;
  status: 'asked' | 'answered' | 'skipped' | 'drafted' | 'applied' | 'dismissed';
  triggerReason?: string;
  urgency?: ClarificationUrgency;
  prompt: string;
  title?: string;
  subtitle?: string;
  originalFeedback?: string;
  summary?: string;
  answerLabel?: string;
  answerValues?: Record<string, string | string[] | number>;
  sourceNodeIds: string[];
  sourceBatchId?: string | null;
  appliedTarget?: 'next_generation' | 'goal_update';
  goalUpdate?: ClarificationDraftGoalUpdate | null;
  createdAt: number;
  answeredAt?: number;
  appliedAt?: number;
}

export interface ClarificationMemory {
  activeInsights: ClarificationInsight[];
  records: ClarificationRecordSummary[];
  cycles: ClarificationCycle[];
  latestEvaluation?: ClarificationEvaluationSnapshot | null;
}

export interface PostNodeMetadata {
  batchId: string;
  parentBatchId: string | null;
  selectedFromParent?: SelectionMetadata;
  editAction?: string;
  similarity?: number;
  direction?: string;
  directionAngle?: string;
  indexInBatch?: number;
  seededFromPreview?: boolean;
  postGoalContext?: PostGoalContextMetadata;
  batchAnalysis?: BatchAnalysis;
  clarificationSummaries?: string[];
}

export interface DeltaDetails {
  delta?: string;
  visible_changes?: string[];
  continuity?: string;
  keyword_shifts?: string[];
  bias_suggestions?: string[];
  feedback_trace?: string[];
}

export interface PostNode {
  id: string;
  imageUrl: string;
  keywords: string[];
  vibe: string;
  deltaFromParent?: string;
  deltaDetails?: DeltaDetails;
  analysis?: ImageDesignAnalysis;
  parentId: string | null;
  actionType: 'initial' | 'explore' | 'edit' | 'regenerate' | 'selection';
  timestamp: number;
  feedback?: FeedbackData;
  metadata?: PostNodeMetadata;
}

export interface Gen {
  id: string;
  actionType: PostNode['actionType'];
  timestamp: number;
  nodes: PostNode[];
  parentBatchId: string | null;
  selectedFromParent?: SelectionMetadata;
  deltaFromParent?: string;
  batchAnalysis?: BatchAnalysis;
  aggregateFeedback?: {
    likes: number;
    dislikes: number;
    unsure: number;
  };
}
