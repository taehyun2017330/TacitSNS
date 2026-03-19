import { FeedbackData, Gen, PostNode } from './types';

export function getActionColor(actionType: string) {
  switch (actionType) {
    case 'initial':
      return '#3B82F6';
    case 'explore':
      return '#8B5CF6';
    case 'edit':
      return '#EC4899';
    case 'selection':
      return '#06B6D4';
    case 'regenerate':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
}

export function buildHistoryMap(nodes: Iterable<PostNode>): Map<string, Gen> {
  const batchMap = new Map<string, PostNode[]>();

  for (const node of nodes) {
    const batchId = node.metadata?.batchId || node.id;
    const batchNodes = batchMap.get(batchId) ?? [];
    batchNodes.push(node);
    batchMap.set(batchId, batchNodes);
  }

  const history = new Map<string, Gen>();

  batchMap.forEach((batchNodes, batchId) => {
    const sortedNodes = [...batchNodes].sort((a, b) => {
      const aIndex = a.metadata?.indexInBatch ?? 0;
      const bIndex = b.metadata?.indexInBatch ?? 0;
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.timestamp - b.timestamp;
    });

    const firstNode = sortedNodes[0];
    history.set(batchId, {
      id: batchId,
      actionType: firstNode.actionType,
      timestamp: firstNode.timestamp,
      nodes: sortedNodes,
      parentBatchId: firstNode.metadata?.parentBatchId || null,
      selectedFromParent: firstNode.metadata?.selectedFromParent,
      deltaFromParent: firstNode.deltaFromParent,
      aggregateFeedback: {
        likes: sortedNodes.filter(node => node.feedback?.type === 'yes').length,
        dislikes: sortedNodes.filter(node => node.feedback?.type === 'no').length,
        unsure: sortedNodes.filter(node => node.feedback?.type === 'unsure').length
      }
    });
  });

  return history;
}

export function getBatchNodes(nodes: Map<string, PostNode>, batchId: string): PostNode[] {
  return Array.from(nodes.values())
    .filter(node => node.metadata?.batchId === batchId)
    .sort((a, b) => {
      const aIndex = a.metadata?.indexInBatch ?? 0;
      const bIndex = b.metadata?.indexInBatch ?? 0;
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.timestamp - b.timestamp;
    });
}

export function createSelectionNode(params: {
  sourceNode: PostNode;
  feedback: FeedbackData;
  currentGridBatchId: string;
  selectedGridIndex: number | null;
}): PostNode {
  const { sourceNode, feedback, currentGridBatchId, selectedGridIndex } = params;
  const timestamp = Date.now();
  const selectionBatchId = `selection-${timestamp}-${sourceNode.id}`;

  return {
    id: selectionBatchId,
    imageUrl: sourceNode.imageUrl,
    keywords: sourceNode.keywords,
    vibe: sourceNode.vibe,
    parentId: sourceNode.id,
    actionType: 'selection',
    timestamp,
    feedback,
    metadata: {
      batchId: selectionBatchId,
      parentBatchId: currentGridBatchId,
      selectedFromParent: {
        parentBatchId: currentGridBatchId,
        selectedNodeId: sourceNode.id,
        indexInGrid: selectedGridIndex ?? undefined
      },
      indexInBatch: 0
    }
  };
}
