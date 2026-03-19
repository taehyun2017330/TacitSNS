import type { Gen, PostNode } from '../history/types';
import type { EditOptions, PostStudioActionType } from './types';

export function findNearestGridBatch(history: Map<string, Gen>, startingBatchId: string | null): string | null {
  let currentBatchId = startingBatchId;

  while (currentBatchId) {
    const generation = history.get(currentBatchId);
    if (!generation) {
      return null;
    }

    if (generation.nodes.length === 4) {
      return generation.id;
    }

    currentBatchId = generation.parentBatchId;
  }

  return null;
}

export function buildFallbackDelta(
  actionType: PostStudioActionType,
  editOptions?: EditOptions,
  similarity?: number,
  direction?: string
) {
  if (actionType === 'edit') {
    const edits = [
      ...(editOptions?.suggestedEdits ?? []),
      ...(editOptions?.customEdit ? [editOptions.customEdit] : [])
    ];
    return edits.length > 0 ? `Edited: ${edits.join(', ')}` : 'Edited image';
  }

  if (actionType === 'explore') {
    if (direction) {
      return `Explored "${direction}" direction`;
    }
    return `Explored variations (${similarity ?? 50}% similarity)`;
  }

  if (actionType === 'regenerate') {
    return 'Regenerated with new variations';
  }

  return 'Initial generation';
}

export function createGeneratedNodes({
  posts,
  batchId,
  batchTime,
  parentNodeId,
  parentBatchId,
  actionType,
  fallbackDelta,
  similarity,
  direction,
  selectedGridIndex,
  parentNode,
  editOptions
}: {
  posts: any[];
  batchId: string;
  batchTime: number;
  parentNodeId: string | null;
  parentBatchId: string | null;
  actionType: PostStudioActionType;
  fallbackDelta: string;
  similarity: number;
  direction: string;
  selectedGridIndex: number | null;
  parentNode: PostNode | null;
  editOptions?: EditOptions;
}): PostNode[] {
  return (posts || []).map((post: any, index: number) => ({
    id: `${batchId}-${index}`,
    imageUrl: post.imageUrl,
    keywords: post.keywords || [],
    vibe: post.vibe || post.metadata?.vibe || '',
    deltaFromParent: post.deltaFromParent || post.delta || fallbackDelta,
    deltaDetails: post.deltaDetails,
    parentId: parentNodeId,
    actionType,
    timestamp: batchTime,
    feedback: undefined,
    metadata: {
      batchId,
      parentBatchId,
      selectedFromParent:
        parentNode && parentBatchId
          ? {
              parentBatchId,
              selectedNodeId: parentNode.id,
              indexInGrid:
                selectedGridIndex ??
                parentNode.metadata?.selectedFromParent?.indexInGrid ??
                undefined
            }
          : undefined,
      editAction: editOptions?.customEdit,
      similarity,
      direction,
      indexInBatch: index
    }
  }));
}

export function createPlaceholderNodes({
  batchId,
  batchTime,
  parentNodeId,
  parentBatchId,
  actionType,
  fallbackDelta,
  similarity,
  direction,
  count
}: {
  batchId: string;
  batchTime: number;
  parentNodeId: string | null;
  parentBatchId: string | null;
  actionType: PostStudioActionType;
  fallbackDelta: string;
  similarity: number;
  direction: string;
  count: number;
}): PostNode[] {
  const placeholderColors = ['3B82F6', '10B981', 'F59E0B', 'EF4444'];
  const placeholderKeywords = [
    ['modern', 'clean', 'minimal'],
    ['fresh', 'vibrant', 'energetic'],
    ['warm', 'inviting', 'friendly'],
    ['bold', 'dynamic', 'attention']
  ];
  const placeholderVibes = [
    'Clean and professional',
    'Fresh and dynamic',
    'Warm and approachable',
    'Bold and eye-catching'
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: `${batchId}-${index}`,
    imageUrl: `https://via.placeholder.com/800x1000/${placeholderColors[index]}/ffffff?text=Post+${index + 1}`,
    keywords: placeholderKeywords[index] ?? placeholderKeywords[0],
    vibe: placeholderVibes[index] ?? placeholderVibes[0],
    deltaFromParent: fallbackDelta,
    parentId: parentNodeId,
    actionType,
    timestamp: batchTime,
    metadata: {
      batchId,
      parentBatchId,
      similarity,
      direction,
      indexInBatch: index
    }
  }));
}
