import type { PostGoalContextMetadata } from '../history/types';
import type { PostGoalStudioSession } from '../../types/postStudio';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import { requestPostGeneration } from './api';
import {
  buildFallbackDelta,
  buildInitialDirectionPlan,
  countGeneratedImages,
  createGeneratedNodes,
  createPlaceholderNodes,
  createSeedPreviewNode,
  getLastGeneratedAt
} from './utils';

const DEFAULT_SIMILARITY = 50;

function createEmptyClarificationMemory() {
  return {
    activeInsights: [],
    records: [],
    cycles: [],
    latestEvaluation: null
  };
}

function buildBootstrapContext({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoal,
  folder
}: {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoal: BusinessGoalOption | null;
  folder: PostGoalFolder;
}) {
  const initialDirectionPlan = buildInitialDirectionPlan({
    brandName,
    brandCategory,
    brandIdentity,
    brandNarrative,
    businessGoalTitle: businessGoal?.title,
    folder
  });

  const postGoalContext: PostGoalContextMetadata = {
    brandName,
    brandCategory,
    brandIdentity,
    brandNarrative,
    businessGoalTitle: businessGoal?.title,
    postGoalTitle: folder.title,
    postGoalDescription: folder.description,
    imageTypeChips: folder.imageTypeChips,
    directionAngles: folder.directionAngles
  };

  const brandContext = [
    brandIdentity,
    brandNarrative,
    businessGoal?.title ? `Business goal: ${businessGoal.title}` : '',
    businessGoal?.description ? `Business goal description: ${businessGoal.description}` : '',
    folder.title ? `Post goal: ${folder.title}` : '',
    folder.description ? `Post goal description: ${folder.description}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return {
    initialDirectionPlan,
    postGoalContext,
    brandContext
  };
}

export function createPendingStudioSession({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoal,
  folder
}: {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoal: BusinessGoalOption | null;
  folder: PostGoalFolder;
}): PostGoalStudioSession {
  const { initialDirectionPlan } = buildBootstrapContext({
    brandName,
    brandCategory,
    brandIdentity,
    brandNarrative,
    businessGoal,
    folder
  });

  return {
    nodes: [],
    currentGridBatchId: null,
    currentViewMode: 'grid',
    selectedPostId: null,
    selectedGridIndex: null,
    bootstrapStatus: 'generating',
    bootstrapError: null,
    generatedImageCount: 0,
    lastGeneratedAt: null,
    seedDirection: initialDirectionPlan.brief,
    directionAngles: initialDirectionPlan.directionAngles,
    seedPreviewImageUrl: folder.previewImageUrl ?? null,
    guidedSession: null,
    generationBrief: null,
    clarificationMemory: createEmptyClarificationMemory(),
    pendingGoalDraft: null,
    pendingGoalDraftCycleId: null
  };
}

export async function bootstrapInitialStudioSession({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoal,
  folder
}: {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoal: BusinessGoalOption | null;
  folder: PostGoalFolder;
}): Promise<PostGoalStudioSession> {
  const { initialDirectionPlan, postGoalContext, brandContext } = buildBootstrapContext({
    brandName,
    brandCategory,
    brandIdentity,
    brandNarrative,
    businessGoal,
    folder
  });

  const batchTime = Date.now();
  const batchId = `initial-${batchTime}`;
  const shouldSeedPreview = Boolean(folder.previewImageUrl);
  const requestDirectionAngles = shouldSeedPreview
    ? initialDirectionPlan.directionAngles.slice(1)
    : initialDirectionPlan.directionAngles;
  const requestImageCount = shouldSeedPreview ? 3 : 4;

  try {
    const data = await requestPostGeneration({
      brandName,
      brandCategory,
      brandContext,
      parentNode: null,
      similarity: DEFAULT_SIMILARITY,
      direction: initialDirectionPlan.brief,
      directionAngles: requestDirectionAngles,
      analysisDirectionAngles: initialDirectionPlan.directionAngles,
      seedImageUrls: shouldSeedPreview && folder.previewImageUrl ? [folder.previewImageUrl] : [],
      imagesFeedback: [],
      clarificationContext: null,
      actionType: 'initial',
      numImages: requestImageCount
    });

    const fallbackDelta = buildFallbackDelta('initial', undefined, DEFAULT_SIMILARITY, initialDirectionPlan.brief);
    const seedNode =
      shouldSeedPreview && folder.previewImageUrl
        ? createSeedPreviewNode({
            batchId,
            batchTime,
            imageUrl: folder.previewImageUrl,
            direction: initialDirectionPlan.brief,
            directionAngle: initialDirectionPlan.directionAngles[0],
            analysis: data.batchAnalysis?.images?.[0],
            batchAnalysis: data.batchAnalysis,
            postGoalContext
          })
        : null;

    const generatedNodes = createGeneratedNodes({
      posts: data.posts || [],
      batchId,
      batchTime,
      parentNodeId: null,
      parentBatchId: null,
      actionType: 'initial',
      fallbackDelta,
      similarity: DEFAULT_SIMILARITY,
      direction: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      selectedGridIndex: null,
      parentNode: null,
      indexOffset: seedNode ? 1 : 0,
      batchAnalysis: data.batchAnalysis,
      postGoalContext
    });

    const nodes = seedNode ? [seedNode, ...generatedNodes] : generatedNodes;

    return {
      nodes,
      currentGridBatchId: batchId,
      currentViewMode: 'grid',
      selectedPostId: null,
      selectedGridIndex: null,
      bootstrapStatus: 'ready',
      bootstrapError: null,
      generatedImageCount: countGeneratedImages(nodes),
      lastGeneratedAt: getLastGeneratedAt(nodes),
      seedDirection: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      seedPreviewImageUrl: folder.previewImageUrl ?? null,
      guidedSession: null,
      generationBrief: null,
      clarificationMemory: createEmptyClarificationMemory(),
      pendingGoalDraft: null,
      pendingGoalDraftCycleId: null
    };
  } catch (error: any) {
    const fallbackDelta = buildFallbackDelta('initial', undefined, DEFAULT_SIMILARITY, initialDirectionPlan.brief);
    const seedNode =
      shouldSeedPreview && folder.previewImageUrl
        ? createSeedPreviewNode({
            batchId,
            batchTime,
            imageUrl: folder.previewImageUrl,
            direction: initialDirectionPlan.brief,
            directionAngle: initialDirectionPlan.directionAngles[0],
            postGoalContext
          })
        : null;
    const placeholderNodes = createPlaceholderNodes({
      batchId,
      batchTime,
      parentNodeId: null,
      parentBatchId: null,
      actionType: 'initial',
      fallbackDelta,
      similarity: DEFAULT_SIMILARITY,
      direction: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      indexOffset: seedNode ? 1 : 0,
      postGoalContext,
      count: seedNode ? 3 : 4
    });
    const nodes = seedNode ? [seedNode, ...placeholderNodes] : placeholderNodes;

    return {
      nodes,
      currentGridBatchId: batchId,
      currentViewMode: 'grid',
      selectedPostId: null,
      selectedGridIndex: null,
      bootstrapStatus: 'error',
      bootstrapError: error?.message || 'Failed to prepare the first direction',
      generatedImageCount: countGeneratedImages(nodes),
      lastGeneratedAt: getLastGeneratedAt(nodes),
      seedDirection: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      seedPreviewImageUrl: folder.previewImageUrl ?? null,
      guidedSession: null,
      generationBrief: null,
      clarificationMemory: createEmptyClarificationMemory(),
      pendingGoalDraft: null,
      pendingGoalDraftCycleId: null
    };
  }
}
