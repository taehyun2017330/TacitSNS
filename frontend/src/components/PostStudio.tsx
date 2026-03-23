import React, { useEffect, useMemo, useState } from 'react';

import PostGrid from './PostGrid';
import PostSingleView from './PostSingleView';
import HistoryBoardModal from './history/HistoryBoardModal';
import { buildHistoryMap, createSelectionNode, getBatchNodes } from './history/historyUtils';
import { FeedbackData, Gen, PostGoalContextMetadata, PostNode } from './history/types';
import { requestPostGeneration } from './postStudio/api';
import type { EditOptions } from './postStudio/types';
import {
  buildFallbackDelta,
  buildInitialDirectionPlan,
  countGeneratedImages,
  createSeedPreviewNode,
  createGeneratedNodes,
  createPlaceholderNodes,
  findLatestGridBatchId,
  findNearestGridBatch,
  getLastGeneratedAt
} from './postStudio/utils';
import type { PostGoalReferenceAsset } from '../types/workspace';
import type { PostGoalStudioSession } from '../types/postStudio';
import './PostStudio.css';

type ViewMode = 'grid' | 'single';

interface Props {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  postGoalTaxonomyTags?: string[];
  postGoalImageTypeChips?: string[];
  postGoalDirectionAngles?: string[];
  postGoalPreviewImageUrl?: string;
  referenceAssets?: PostGoalReferenceAsset[];
  studioSession?: PostGoalStudioSession | null;
  onStudioSessionChange?: (session: PostGoalStudioSession) => void;
  onBack: () => void;
  onFinalize: (postUrl: string, postData?: any) => void;
}

const PostStudio: React.FC<Props> = ({
  brandName,
  brandCategory,
  brandIdentity = '',
  brandNarrative = '',
  businessGoalTitle,
  postGoalTitle,
  postGoalDescription,
  postGoalTaxonomyTags = [],
  postGoalImageTypeChips = [],
  postGoalDirectionAngles = [],
  postGoalPreviewImageUrl,
  referenceAssets = [],
  studioSession = null,
  onStudioSessionChange,
  onBack,
  onFinalize
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [similarityLevel, setSimilarityLevel] = useState(50);

  const [historyNodes, setHistoryNodes] = useState<Map<string, PostNode>>(new Map());
  const [currentGridPosts, setCurrentGridPosts] = useState<PostNode[]>([]);
  const [currentGridBatchId, setCurrentGridBatchId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostNode | null>(null);
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null);
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const history = useMemo(() => buildHistoryMap(historyNodes.values()), [historyNodes]);
  const postGoalContext = useMemo<PostGoalContextMetadata>(
    () => ({
      brandName,
      brandCategory,
      brandIdentity,
      brandNarrative,
      businessGoalTitle,
      postGoalTitle,
      postGoalDescription,
      imageTypeChips: postGoalImageTypeChips,
      directionAngles: postGoalDirectionAngles
    }),
    [
      brandCategory,
      brandIdentity,
      brandName,
      brandNarrative,
      businessGoalTitle,
      postGoalDescription,
      postGoalImageTypeChips,
      postGoalDirectionAngles,
      postGoalTitle
    ]
  );
  const brandContext = useMemo(
    () =>
      [
        brandIdentity,
        brandNarrative,
        businessGoalTitle ? `Business goal: ${businessGoalTitle}` : '',
        postGoalTitle ? `Post goal: ${postGoalTitle}` : '',
        postGoalDescription ? `Post goal description: ${postGoalDescription}` : ''
      ]
        .filter(Boolean)
        .join(' '),
    [brandIdentity, brandNarrative, businessGoalTitle, postGoalDescription, postGoalTitle]
  );
  const initialDirectionPlan = useMemo(
    () =>
      buildInitialDirectionPlan({
        brandName,
        brandCategory,
        brandIdentity,
        brandNarrative,
        businessGoalTitle,
        folder: {
          title: postGoalTitle || 'Post goal',
          description: postGoalDescription || 'Create one clear visual direction for this post goal.',
          taxonomyTags: postGoalTaxonomyTags,
          imageTypeChips: postGoalImageTypeChips,
          directionAngles: postGoalDirectionAngles,
          assistantPrompt: [
            postGoalDescription,
            businessGoalTitle ? `Support ${businessGoalTitle.toLowerCase()}.` : ''
          ]
            .filter(Boolean)
            .join(' ')
        }
      }),
    [
      brandCategory,
      brandIdentity,
      brandName,
      brandNarrative,
      businessGoalTitle,
      postGoalDescription,
      postGoalDirectionAngles,
      postGoalImageTypeChips,
      postGoalTaxonomyTags,
      postGoalTitle
    ]
  );
  const generatedImageCount = studioSession?.generatedImageCount ?? countGeneratedImages(historyNodes.values());

  useEffect(() => {
    const restoredNodes = new Map((studioSession?.nodes ?? []).map(node => [node.id, node]));
    const restoredGridBatchId =
      studioSession?.currentGridBatchId && getBatchNodes(restoredNodes, studioSession.currentGridBatchId).length > 0
        ? studioSession.currentGridBatchId
        : findLatestGridBatchId(restoredNodes.values());

    setHistoryNodes(restoredNodes);
    setCurrentGridBatchId(restoredGridBatchId);
    setCurrentGridPosts(restoredGridBatchId ? getBatchNodes(restoredNodes, restoredGridBatchId) : []);
    setSelectedPost(null);
    setSelectedGridIndex(null);
    setNavigationStack([]);
    setViewMode('grid');
    setError('');
  }, [postGoalTitle, studioSession?.currentGridBatchId, studioSession?.lastGeneratedAt]);

  useEffect(() => {
    if (historyNodes.size === 0 && currentGridBatchId === null && !isGenerating) {
      void generatePosts(
        'initial',
        null,
        undefined,
        undefined,
        similarityLevel,
        initialDirectionPlan.brief,
        initialDirectionPlan.directionAngles
      );
    }
  }, [currentGridBatchId, historyNodes.size, initialDirectionPlan.brief, initialDirectionPlan.directionAngles, isGenerating, similarityLevel]);

  useEffect(() => {
    if (!onStudioSessionChange || historyNodes.size === 0) {
      return;
    }

    onStudioSessionChange({
      nodes: Array.from(historyNodes.values()),
      currentGridBatchId,
      generatedImageCount: countGeneratedImages(historyNodes.values()),
      lastGeneratedAt: getLastGeneratedAt(historyNodes.values()),
      seedDirection: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      seedPreviewImageUrl: postGoalPreviewImageUrl ?? null
    });
  }, [currentGridBatchId, historyNodes, initialDirectionPlan.brief, initialDirectionPlan.directionAngles, onStudioSessionChange, postGoalPreviewImageUrl]);

  const upsertNodes = (nodes: PostNode[]) => {
    setHistoryNodes(prev => {
      const next = new Map(prev);
      nodes.forEach(node => next.set(node.id, node));
      return next;
    });
  };

  const applyBatchFeedback = (batchFeedback: Record<string, FeedbackData | null>) => {
    return currentGridPosts.map(post => {
      if (!(post.id in batchFeedback)) {
        return post;
      }

      const feedback = batchFeedback[post.id];
      return {
        ...post,
        feedback: feedback?.type ? feedback : undefined
      };
    });
  };

  const generatePosts = async (
    actionType: 'initial' | 'explore' | 'edit' | 'regenerate',
    parentNodeId: string | null = null,
    feedback?: FeedbackData,
    editOptions?: EditOptions,
    similarity?: number,
    direction?: string,
    directionAngles: string[] = []
  ) => {
    setIsGenerating(true);
    setError('');

    const batchTime = Date.now();
    const batchId = `${actionType}-${batchTime}`;
    const parentNode = parentNodeId ? historyNodes.get(parentNodeId) ?? null : null;
    const parentBatchId =
      actionType === 'initial'
        ? null
        : parentNode?.metadata?.batchId ?? currentGridBatchId ?? null;

    try {
      const resolvedSimilarity = similarity ?? similarityLevel;
      const resolvedDirection = direction || initialDirectionPlan.brief;
      const shouldSeedPreview =
        actionType === 'initial' &&
        !parentNodeId &&
        Boolean(postGoalPreviewImageUrl) &&
        historyNodes.size === 0 &&
        currentGridBatchId === null;
      const requestDirectionAngles =
        actionType === 'initial' && shouldSeedPreview
          ? directionAngles.slice(1)
          : actionType === 'initial'
            ? directionAngles
            : [];
      const requestImageCount =
        actionType === 'edit'
          ? 1
          : shouldSeedPreview
            ? 3
            : 4;
      const data = await requestPostGeneration({
        brandName,
        brandCategory,
        brandContext,
        parentNode,
        feedback,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        directionAngles: requestDirectionAngles,
        actionType,
        editOptions,
        numImages: requestImageCount
      });
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        resolvedSimilarity,
        resolvedDirection
      );

      const seedNode =
        shouldSeedPreview && postGoalPreviewImageUrl
          ? createSeedPreviewNode({
              batchId,
              batchTime,
              imageUrl: postGoalPreviewImageUrl,
              direction: resolvedDirection,
              directionAngle: initialDirectionPlan.directionAngles[0],
              postGoalContext
            })
          : null;

      const generatedNodes = createGeneratedNodes({
        posts: data.posts || [],
        batchId,
        batchTime,
        parentNodeId,
        parentBatchId,
        actionType,
        fallbackDelta: data.delta || fallbackDelta,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        directionAngles: initialDirectionPlan.directionAngles,
        selectedGridIndex,
        parentNode,
        editOptions,
        indexOffset: seedNode ? 1 : 0,
        postGoalContext
      });
      const newNodes = seedNode ? [seedNode, ...generatedNodes] : generatedNodes;

      upsertNodes(newNodes);

      if (actionType === 'edit') {
        setSelectedPost(newNodes[0] ?? null);
        setViewMode('single');
      } else {
        setCurrentGridPosts(newNodes);
        setCurrentGridBatchId(batchId);
        setSelectedGridIndex(null);
        setSelectedPost(null);
        setViewMode('grid');
      }
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to generate posts');

      const placeholderCount = actionType === 'edit' ? 1 : 4;
      const resolvedSimilarity = similarity ?? similarityLevel;
      const resolvedDirection = direction || initialDirectionPlan.brief;
      const shouldSeedPreview =
        actionType === 'initial' &&
        !parentNodeId &&
        Boolean(postGoalPreviewImageUrl) &&
        historyNodes.size === 0 &&
        currentGridBatchId === null;
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        resolvedSimilarity,
        resolvedDirection
      );

      const seedNode =
        shouldSeedPreview && postGoalPreviewImageUrl
          ? createSeedPreviewNode({
              batchId,
              batchTime,
              imageUrl: postGoalPreviewImageUrl,
              direction: resolvedDirection,
              directionAngle: initialDirectionPlan.directionAngles[0],
              postGoalContext
            })
          : null;

      const placeholderNodes = createPlaceholderNodes({
        batchId,
        batchTime,
        parentNodeId,
        parentBatchId,
        actionType,
        fallbackDelta,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        directionAngles: initialDirectionPlan.directionAngles,
        indexOffset: seedNode ? 1 : 0,
        postGoalContext,
        count: seedNode ? Math.max(0, placeholderCount - 1) : placeholderCount
      });
      const fallbackNodes = seedNode ? [seedNode, ...placeholderNodes] : placeholderNodes;

      upsertNodes(fallbackNodes);

      if (actionType === 'edit') {
        setSelectedPost(fallbackNodes[0] ?? null);
        setViewMode('single');
      } else {
        setCurrentGridPosts(fallbackNodes);
        setCurrentGridBatchId(batchId);
        setSelectedGridIndex(null);
        setSelectedPost(null);
        setViewMode('grid');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentGridBatchId || currentGridPosts.length === 0) {
      return;
    }

    setNavigationStack(prev => [...prev, currentGridBatchId]);
    const parentNodeId = currentGridPosts[0]?.id ?? null;
    await generatePosts('regenerate', parentNodeId, undefined, undefined, similarityLevel);
  };

  const handleSelectPost = (
    post: PostNode,
    feedback: FeedbackData,
    batchFeedback: Record<string, FeedbackData | null>
  ) => {
    const updatedBatch = applyBatchFeedback(batchFeedback);
    const updatedSourceNode =
      updatedBatch.find(currentPost => currentPost.id === post.id) ?? { ...post, feedback };
    const gridIndex = currentGridPosts.findIndex(currentPost => currentPost.id === post.id);
    const selectionNode = currentGridBatchId
      ? createSelectionNode({
          sourceNode: updatedSourceNode,
          feedback,
          currentGridBatchId,
          selectedGridIndex: gridIndex >= 0 ? gridIndex : null
        })
      : {
          ...updatedSourceNode,
          actionType: 'selection' as const
        };

    upsertNodes([...updatedBatch, selectionNode]);
    setCurrentGridPosts(updatedBatch);
    setSelectedPost(selectionNode);
    setSelectedGridIndex(gridIndex >= 0 ? gridIndex : null);
    setViewMode('single');
  };

  const handleExplore = async (
    post: PostNode,
    feedback: FeedbackData,
    similarity: number,
    batchFeedback: Record<string, FeedbackData | null>,
    direction?: string
  ) => {
    const updatedBatch = applyBatchFeedback(batchFeedback);
    upsertNodes(updatedBatch);
    setCurrentGridPosts(updatedBatch);

    if (currentGridBatchId) {
      setNavigationStack(prev => [...prev, currentGridBatchId]);
    }

    const gridIndex = currentGridPosts.findIndex(currentPost => currentPost.id === post.id);
    setSelectedGridIndex(gridIndex >= 0 ? gridIndex : null);
    await generatePosts('explore', post.id, feedback, undefined, similarity, direction);
  };

  const handleEdit = async (editOptions: EditOptions) => {
    if (!selectedPost) {
      return;
    }

    await generatePosts('edit', selectedPost.id, selectedPost.feedback, editOptions);
  };

  const handleBack = () => {
    if (viewMode === 'single') {
      setSelectedPost(null);
      setViewMode('grid');
      return;
    }

    if (navigationStack.length > 0) {
      const previousBatchId = navigationStack[navigationStack.length - 1];
      const previousBatchNodes = getBatchNodes(historyNodes, previousBatchId);

      if (previousBatchNodes.length > 0) {
        setCurrentGridPosts(previousBatchNodes);
        setCurrentGridBatchId(previousBatchId);
        setNavigationStack(prev => prev.slice(0, -1));
        return;
      }
    }

    onBack();
  };

  const handleFinalize = () => {
    if (!selectedPost) {
      return;
    }

    onFinalize(selectedPost.imageUrl, {
      finalPost: selectedPost,
      tree: Array.from(historyNodes.entries()),
      variations: Array.from(historyNodes.values())
    });
  };

  const focusGeneration = (generation: Gen) => {
    if (generation.nodes.length === 4) {
      setCurrentGridPosts(generation.nodes);
      setCurrentGridBatchId(generation.id);
      setSelectedPost(null);
      setViewMode('grid');
    } else {
      const nearestGridBatchId = findNearestGridBatch(history, generation.parentBatchId);
      if (nearestGridBatchId) {
        setCurrentGridPosts(getBatchNodes(historyNodes, nearestGridBatchId));
        setCurrentGridBatchId(nearestGridBatchId);
      }
      setSelectedPost(generation.nodes[0] ?? null);
      setViewMode('single');
    }

    setShowHistoryModal(false);
  };

  const focusNode = (node: PostNode) => {
    const nodeBatchId = node.metadata?.batchId ?? null;
    const batchNodes = nodeBatchId ? getBatchNodes(historyNodes, nodeBatchId) : [];

    if (batchNodes.length === 4) {
      setCurrentGridPosts(batchNodes);
      setCurrentGridBatchId(nodeBatchId);
    } else {
      const nearestGridBatchId = findNearestGridBatch(history, node.metadata?.parentBatchId ?? null);
      if (nearestGridBatchId) {
        setCurrentGridPosts(getBatchNodes(historyNodes, nearestGridBatchId));
        setCurrentGridBatchId(nearestGridBatchId);
      }
    }

    setSelectedPost(node);
    setViewMode('single');
    setShowHistoryModal(false);
  };

  return (
    <div className="post-studio">
      <div className="post-studio-header">
        <button
          className="ui-btn ui-btn--secondary back-button"
          onClick={handleBack}
          disabled={isGenerating}
        >
          ← {navigationStack.length === 0 && viewMode === 'grid' ? 'Back to Workspace' : 'Back'}
        </button>

        <div className="post-studio-title-section">
          <div className="post-studio-title">Post Creative Studio</div>
          <div className="post-studio-subtitle">
            {postGoalTitle
              ? `${postGoalTitle} for ${brandName}`
              : `Generate and refine social media posts for ${brandName}`}
          </div>
          {(businessGoalTitle || postGoalDescription) && (
            <div className="post-studio-context-line">
              {businessGoalTitle && <span>Business goal: {businessGoalTitle}</span>}
              {postGoalDescription && <span>{postGoalDescription}</span>}
            </div>
          )}
          <div className="post-studio-breadcrumb">
            Goal hierarchy: {businessGoalTitle || 'Business goal'} → {postGoalTitle || 'Post goal'} → Visual strategies
          </div>
        </div>

        <div className="post-studio-right-actions">
          <div className="post-studio-session-indicator">
            {generatedImageCount > 0 ? `${generatedImageCount} image${generatedImageCount === 1 ? '' : 's'} generated` : 'New'}
          </div>
          {viewMode === 'grid' && currentGridPosts.length > 0 && (
            <button
              className="ui-btn ui-btn--secondary secondary regenerate-btn"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              Regenerate
            </button>
          )}
          {selectedPost && viewMode === 'single' && (
            <button
              className="ui-btn ui-btn--primary primary finalize-btn"
              onClick={handleFinalize}
            >
              Use This Post
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {viewMode === 'grid' && (
        <PostGrid
          posts={currentGridPosts}
          onSelect={handleSelectPost}
          onExplore={handleExplore}
          isGenerating={isGenerating}
          traceCount={history.size}
          onTraceClick={() => setShowHistoryModal(true)}
          traceDisabled={history.size === 0}
        />
      )}

      {viewMode === 'single' && selectedPost && (
        <PostSingleView
          post={selectedPost}
          onEdit={handleEdit}
          onFinalize={handleFinalize}
          onBack={() => {
            setSelectedPost(null);
            setViewMode('grid');
          }}
          isGenerating={isGenerating}
        />
      )}

      <HistoryBoardModal
        isOpen={showHistoryModal}
        history={history}
        onClose={() => setShowHistoryModal(false)}
        onSelectGeneration={focusGeneration}
        onSelectNode={focusNode}
      />
    </div>
  );
};

export default PostStudio;
