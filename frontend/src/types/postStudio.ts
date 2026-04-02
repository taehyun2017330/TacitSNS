import type {
  ClarificationDraftGoalUpdate,
  ClarificationDimension,
  ClarificationMemory,
  PostNode
} from '../components/history/types';
import type {
  ClarificationAnswer,
  ClarificationQuestion
} from '../components/postStudio/clarification/types';

export interface GenerationPlanRouteCard {
  id: string;
  title: string;
  change: string;
  rationale: string;
  editableText: string;
}

export interface GuidedFeedbackAnchor {
  nodeId: string | null;
  imageUrl?: string | null;
  title: string;
  directionAngle?: string | null;
}

export interface GenerationPlanSelectedAnchor extends GuidedFeedbackAnchor {}

export interface GenerationPlanSignalRow {
  id: string;
  tone: 'anchor' | 'like' | 'dislike' | 'unsure' | 'note' | 'clarification' | 'goal';
  label: string;
  source: string;
}

export interface GenerationPlanEffectRow {
  id: string;
  signalId: string;
  tone: 'anchor' | 'like' | 'dislike' | 'unsure' | 'note' | 'clarification' | 'goal';
  label: string;
  source: string;
  effect: string;
}

export type GuidedImageStepStatus = 'pending' | 'answered' | 'unresolved';

export interface GuidedImageStep {
  nodeId: string;
  stance: 'like' | 'dislike' | 'unsure';
  prompt: string;
  status: GuidedImageStepStatus;
  primaryReasonId?: string;
  primaryReasonLabel?: string;
  reasonMeta?: {
    label: string;
    chipLabel?: string;
    systemInterpretation?: string;
    followUpFocus?: string;
    dimension?: ClarificationDimension;
    ambiguity?: 'low' | 'medium' | 'high';
    likelyFollowUp?: 'summarize' | 'probe' | 'clarify' | 'challenge';
    followUpStage?: 'micro' | 'macro';
  };
  customNote?: string;
  hardToAnswerChosen?: boolean;
  exampleReasonOptions?: string[];
  microQuestion?: ClarificationQuestion | null;
  microAnswer?: ClarificationAnswer | null;
  completedAt?: number | null;
}

export interface PreferenceSignal {
  id: string;
  kind: 'keep' | 'avoid' | 'tradeoff' | 'open_question';
  label: string;
  sourceNodeIds: string[];
  dimension?: ClarificationDimension;
  confidence: number;
  source: 'stance' | 'reason' | 'micro' | 'macro' | 'memory';
}

export interface GenerationBrief {
  sourceBatchId: string | null;
  anchorNodeId: string | null;
  anchor?: GuidedFeedbackAnchor;
  keep: string[];
  avoid: string[];
  openTradeoff?: string;
  nextExploration: string[];
  systemSummary: string;
  direction: string;
  directionAngles: string[];
  routeCards: GenerationPlanRouteCard[];
  similarity: number;
  createdAt: number;
}

export interface GuidedFeedbackSession {
  sourceBatchId: string | null;
  imageOrder: string[];
  currentImageIndex: number;
  steps: GuidedImageStep[];
  macroQuestion?: ClarificationQuestion | null;
  macroAnswer?: ClarificationAnswer | null;
  synthesizedPreferences: PreferenceSignal[];
  draftBrief?: GenerationBrief | null;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewReadState {
  status: 'observing' | 'ready' | 'needs_clarification';
  source: 'local' | 'ai';
  sentence: string;
  evidenceTokens: string[];
  pendingFamily?: 'summarize' | 'probe' | 'clarify' | 'challenge' | null;
  updatedAt: number;
}

export interface ReviewSnapshotSummary {
  likes: string[];
  dislikes: string[];
  unsure: string[];
  notes: string[];
}

export interface ReviewSnapshot {
  sourceBatchId: string | null;
  anchorNodeId: string | null;
  selectedAnchor: GuidedFeedbackAnchor;
  aggregateFeedback: {
    type: 'yes' | 'no' | 'unsure' | null;
    reasons: string[];
    customNote?: string;
  };
  feedbackByNodeId: Record<string, {
    type: 'yes' | 'no' | 'unsure' | null;
    reasons: string[];
    customNote?: string;
  } | null>;
  summary: ReviewSnapshotSummary;
  snapshotSignature: string;
  createdAt: number;
}

export interface PrefetchedClarificationState {
  snapshotSignature: string;
  evaluation: any;
  question: ClarificationQuestion | null;
  createdAt: number;
}

export interface PostGenerationPlanState {
  sourceBatchId: string | null;
  anchorNodeId: string | null;
  direction: string;
  directionAngles: string[];
  similarity: number;
  createdAt: number;
  selectedAnchor?: GenerationPlanSelectedAnchor;
  systemRead?: string;
  signalRows?: GenerationPlanSignalRow[];
  effectRows?: GenerationPlanEffectRow[];
  routeCards?: GenerationPlanRouteCard[];
  isSynthesizing?: boolean;
  manualDirectionEdits?: boolean;
  questionGateState?: 'clear' | 'needs_answer' | 'resolved';
  questionResolutionStatus?: 'unresolved' | 'answered' | 'skipped' | null;
  tentativeRoutes?: boolean;
}

export interface PostGoalStudioSession {
  nodes: PostNode[];
  currentGridBatchId: string | null;
  currentViewMode?: 'grid' | 'guided' | 'brief' | 'single';
  selectedPostId?: string | null;
  selectedGridIndex?: number | null;
  bootstrapStatus?: 'idle' | 'generating' | 'ready' | 'error';
  bootstrapError?: string | null;
  generatedImageCount: number;
  lastGeneratedAt: number | null;
  seedDirection: string;
  directionAngles: string[];
  seedPreviewImageUrl?: string | null;
  guidedSession?: GuidedFeedbackSession | null;
  generationBrief?: GenerationBrief | null;
  clarificationMemory?: ClarificationMemory;
  pendingGoalDraft?: ClarificationDraftGoalUpdate | null;
  pendingGoalDraftCycleId?: string | null;
}
