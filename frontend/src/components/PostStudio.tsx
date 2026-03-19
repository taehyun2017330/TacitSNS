import React, { useMemo, useState } from 'react';

import PostGrid from './PostGrid';
import PostSingleView from './PostSingleView';
import HistoryBoardModal from './history/HistoryBoardModal';
import { buildHistoryMap, createSelectionNode, getBatchNodes } from './history/historyUtils';
import { FeedbackData, Gen, PostNode } from './history/types';
import { requestPostGeneration } from './postStudio/api';
import type { EditOptions } from './postStudio/types';
import { buildFallbackDelta, createGeneratedNodes, createPlaceholderNodes, findNearestGridBatch } from './postStudio/utils';
import './PostStudio.css';

type ViewMode = 'grid' | 'single';

interface Props {
  brandName: string;
  brandCategory: string;
  brandContext: string;
  onBack: () => void;
  onFinalize: (postUrl: string, postData?: any) => void;
}

const PostStudio: React.FC<Props> = ({
  brandName,
  brandCategory,
  brandContext,
  onBack,
  onFinalize
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const [initialDirection, setInitialDirection] = useState('');
  const [showInitialInput, setShowInitialInput] = useState(true);
  const [similarityLevel, setSimilarityLevel] = useState(50);

  const [historyNodes, setHistoryNodes] = useState<Map<string, PostNode>>(new Map());
  const [currentGridPosts, setCurrentGridPosts] = useState<PostNode[]>([]);
  const [currentGridBatchId, setCurrentGridBatchId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostNode | null>(null);
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null);
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const history = useMemo(() => buildHistoryMap(historyNodes.values()), [historyNodes]);

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
    direction?: string
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
      const resolvedDirection = direction || initialDirection;
      const data = await requestPostGeneration({
        brandName,
        brandCategory,
        brandContext,
        parentNode,
        feedback,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        actionType,
        editOptions
      });
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        resolvedSimilarity,
        resolvedDirection
      );

      const newNodes = createGeneratedNodes({
        posts: data.posts || [],
        batchId,
        batchTime,
        parentNodeId,
        parentBatchId,
        actionType,
        fallbackDelta: data.delta || fallbackDelta,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        selectedGridIndex,
        parentNode,
        editOptions
      });

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
      const resolvedDirection = direction || initialDirection;
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        resolvedSimilarity,
        resolvedDirection
      );

      const placeholderNodes = createPlaceholderNodes({
        batchId,
        batchTime,
        parentNodeId,
        parentBatchId,
        actionType,
        fallbackDelta,
        similarity: resolvedSimilarity,
        direction: resolvedDirection,
        count: placeholderCount
      });

      upsertNodes(placeholderNodes);

      if (actionType === 'edit') {
        setSelectedPost(placeholderNodes[0] ?? null);
        setViewMode('single');
      } else {
        setCurrentGridPosts(placeholderNodes);
        setCurrentGridBatchId(batchId);
        setSelectedGridIndex(null);
        setSelectedPost(null);
        setViewMode('grid');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInitialGeneration = async () => {
    setShowInitialInput(false);
    await generatePosts('initial');
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
          ← {navigationStack.length === 0 && viewMode === 'grid' ? 'Back to Brand' : 'Back'}
        </button>

        <div className="post-studio-title-section">
          <div className="post-studio-title">Post Creative Studio</div>
          <div className="post-studio-subtitle">
            Generate and refine social media posts for {brandName}
          </div>
        </div>

        <div className="post-studio-right-actions">
          {!showInitialInput && viewMode === 'grid' && currentGridPosts.length > 0 && (
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

      {showInitialInput && (
        <div className="initial-input-card">
          <div className="initial-title">Let's create your social media posts</div>
          <div className="initial-subtitle">
            Describe the mood or style you're looking for
          </div>
          <textarea
            className="initial-textarea"
            placeholder="e.g., 'warm and authentic lifestyle shots' or 'minimal product-focused with lots of white space'"
            value={initialDirection}
            onChange={e => setInitialDirection(e.target.value)}
            rows={3}
          />

          <div className="similarity-control">
            <label className="similarity-label">
              Exploration Range: <span className="similarity-value">
                {similarityLevel < 30 ? 'Safe' : similarityLevel > 70 ? 'Adventurous' : 'Balanced'}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={similarityLevel}
              onChange={e => setSimilarityLevel(Number(e.target.value))}
              className="similarity-slider"
            />
            <div className="similarity-hints">
              <span>Similar</span>
              <span>Different</span>
            </div>
          </div>

          <button
            className="ui-btn ui-btn--primary ui-btn--hero primary studio-primary-cta"
            onClick={handleInitialGeneration}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate 4 Post Ideas'}
          </button>
        </div>
      )}

      {!showInitialInput && viewMode === 'grid' && (
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
