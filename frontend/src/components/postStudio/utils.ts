import type { Gen, PostGoalContextMetadata, PostNode } from '../history/types';
import type { PostGoalFolder } from '../../types/workspace';
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

export function findLatestGridBatchId(nodes: Iterable<PostNode>): string | null {
  const batchMap = new Map<string, { timestamp: number; count: number }>();

  for (const node of nodes) {
    const batchId = node.metadata?.batchId;
    if (!batchId) {
      continue;
    }

    const current = batchMap.get(batchId);
    if (!current) {
      batchMap.set(batchId, { timestamp: node.timestamp, count: 1 });
      continue;
    }

    current.count += 1;
    if (node.timestamp > current.timestamp) {
      current.timestamp = node.timestamp;
    }
  }

  return Array.from(batchMap.entries())
    .filter(([, meta]) => meta.count === 4)
    .sort((left, right) => right[1].timestamp - left[1].timestamp)[0]?.[0] ?? null;
}

export function countGeneratedImages(nodes: Iterable<PostNode>): number {
  return Array.from(nodes).filter(node => node.actionType !== 'selection').length;
}

export function getLastGeneratedAt(nodes: Iterable<PostNode>): number | null {
  const timestamps = Array.from(nodes)
    .filter(node => node.actionType !== 'selection')
    .map(node => node.timestamp);

  if (timestamps.length === 0) {
    return null;
  }

  return Math.max(...timestamps);
}

export function buildInitialDirectionPlan({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoalTitle,
  folder
}: {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  folder: Pick<PostGoalFolder, 'title' | 'description' | 'taxonomyTags' | 'imageTypeChips' | 'directionAngles' | 'assistantPrompt'>;
}) {
  const savedDirectionAngles = folder.directionAngles?.filter(Boolean).slice(0, 4) ?? [];
  const commonThemes = folder.imageTypeChips?.slice(0, 6) ?? [];

  const goalDescription = folder.description.trim();
  const shortNarrative = brandNarrative?.trim().replace(/\s+/g, ' ').slice(0, 220) ?? '';
  const contextLabel = businessGoalTitle ? businessGoalTitle.toLowerCase() : 'the current business goal';

  const angleA = commonThemes[0] ?? 'visible brand action';
  const angleB = commonThemes[1] ?? 'a real-world moment';
  const angleC = commonThemes[2] ?? 'human presence';
  const angleD = commonThemes[3] ?? 'a memorable brand signal';

  const directionAngles = savedDirectionAngles.length === 4
    ? savedDirectionAngles
    : [
        `Hero-led Instagram composition showing ${folder.title.toLowerCase()} through ${angleA} in a clear, believable scene.`,
        `Documentary-style post centered on ${angleB} so the brand feels active, grounded, and credible.`,
        `Human-centered visual using ${angleC} to make ${contextLabel} feel emotionally legible.`,
        `Editorial social post translating ${goalDescription.toLowerCase()} through ${angleD} and a strong visual hierarchy.`
      ];

  const briefLines = [
    `Brand: ${brandName} (${brandCategory})`,
    brandIdentity ? `Brand identity: ${brandIdentity}` : null,
    shortNarrative ? `Brand narrative: ${shortNarrative}` : null,
    businessGoalTitle ? `Business goal: ${businessGoalTitle}` : null,
    `Post goal: ${folder.title}`,
    goalDescription ? `What this post goal explores: ${goalDescription}` : null,
    commonThemes.length ? `Image types that fit this direction: ${commonThemes.join(', ')}` : null,
    `Direction anchor: ${folder.assistantPrompt}`
  ].filter(Boolean);

  return {
    brief: `${briefLines.join('\n')}\nCreate four distinct but coherent Instagram-ready directions for this post goal.`,
    directionAngles,
    commonThemes
  };
}

export function createSeedPreviewNode({
  batchId,
  batchTime,
  imageUrl,
  direction,
  directionAngle,
  postGoalContext
}: {
  batchId: string;
  batchTime: number;
  imageUrl: string;
  direction: string;
  directionAngle?: string;
  postGoalContext: PostGoalContextMetadata;
}): PostNode {
  return {
    id: `${batchId}-0`,
    imageUrl,
    keywords: [],
    vibe: '',
    deltaFromParent: 'Seeded from the post-goal example image',
    parentId: null,
    actionType: 'initial',
    timestamp: batchTime,
    metadata: {
      batchId,
      parentBatchId: null,
      similarity: 50,
      direction,
      directionAngle,
      indexInBatch: 0,
      seededFromPreview: true,
      postGoalContext
    }
  };
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
  directionAngles,
  selectedGridIndex,
  parentNode,
  editOptions,
  indexOffset = 0,
  postGoalContext
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
  directionAngles?: string[];
  selectedGridIndex: number | null;
  parentNode: PostNode | null;
  editOptions?: EditOptions;
  indexOffset?: number;
  postGoalContext?: PostGoalContextMetadata;
}): PostNode[] {
  return (posts || []).map((post: any, index: number) => ({
    id: `${batchId}-${index + indexOffset}`,
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
      directionAngle: directionAngles?.[index + indexOffset],
      indexInBatch: index + indexOffset,
      postGoalContext
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
  directionAngles,
  indexOffset = 0,
  postGoalContext,
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
  directionAngles?: string[];
  indexOffset?: number;
  postGoalContext?: PostGoalContextMetadata;
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
    id: `${batchId}-${index + indexOffset}`,
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
      directionAngle: directionAngles?.[index + indexOffset],
      indexInBatch: index + indexOffset,
      postGoalContext
    }
  }));
}
