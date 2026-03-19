export interface PostNode {
  id: string;
  imageUrl: string;
  keywords: string[];
  vibe: string;
  deltaFromParent?: string;
  parentId: string | null;
  actionType: 'initial' | 'explore' | 'edit' | 'regenerate' | 'selection';
  timestamp: number;
  feedback?: {
    type: 'yes' | 'no' | 'unsure' | null;
    reasons: string[];
  };
  metadata?: {
    batchId: string;
    parentBatchId: string | null;
    selectedFromParent?: {
      parentBatchId: string;
      selectedNodeId: string;
      indexInGrid?: number;
    };
    editAction?: string;
    similarity?: number;
    direction?: string;
  };
}

export interface Gen {
  id: string;
  actionType: PostNode['actionType'];
  timestamp: number;
  nodes: PostNode[];
  parentBatchId: string | null;
  selectedFromParent?: {
    parentBatchId: string;
    selectedNodeId: string;
    indexInGrid?: number;
  };
  deltaFromParent?: string;
  aggregateFeedback?: {
    likes: number;
    dislikes: number;
    unsure: number;
  };
}
