export type FeedbackType = 'yes' | 'no' | 'unsure' | null;

export interface FeedbackData {
  type: FeedbackType;
  reasons: string[];
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
}

export interface DeltaDetails {
  delta?: string;
  visible_changes?: string[];
  continuity?: string;
}

export interface PostNode {
  id: string;
  imageUrl: string;
  keywords: string[];
  vibe: string;
  deltaFromParent?: string;
  deltaDetails?: DeltaDetails;
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
  aggregateFeedback?: {
    likes: number;
    dislikes: number;
    unsure: number;
  };
}
