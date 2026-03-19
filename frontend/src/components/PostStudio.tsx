import React, { useMemo, useState } from 'react';
import PostGrid from './PostGrid';
import PostSingleView from './PostSingleView';
import HistoryBoardModal from './history/HistoryBoardModal';
import { buildHistoryMap, createSelectionNode, getBatchNodes } from './history/historyUtils';
import { FeedbackData, Gen, PostNode } from './history/types';
import './PostStudio.css';

interface EditOptions {
  suggestedEdits: string[];
  customEdit: string;
}

type ViewMode = 'grid' | 'single';

interface Props {
  brandName: string;
  brandCategory: string;
  brandContext: string;
  onBack: () => void;
  onFinalize: (postUrl: string, postData?: any) => void;
}

function findNearestGridBatch(history: Map<string, Gen>, startingBatchId: string | null): string | null {
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

function buildFallbackDelta(
  actionType: 'initial' | 'explore' | 'edit' | 'regenerate',
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
      const response = await fetch('http://localhost:8001/api/generate-post-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandSummary: `${brandName} - ${brandCategory}: ${brandContext}`,
          parentNodeId: parentNode?.id,
          parentImageUrl: parentNode?.imageUrl,
          parentKeywords: parentNode?.keywords,
          userFeedback: feedback ? {
            likes: feedback.type === 'yes' ? feedback.reasons : [],
            dislikes: feedback.type === 'no' ? feedback.reasons : [],
            unsure: feedback.type === 'unsure' ? feedback.reasons : []
          } : null,
          similarity: similarity ?? similarityLevel,
          explorationLevel: (similarity ?? similarityLevel) / 100,
          direction: direction || initialDirection,
          actionType,
          editOptions,
          numImages: actionType === 'edit' ? 1 : 4
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate posts: ${response.status}`);
      }

      const data = await response.json();
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        similarity ?? similarityLevel,
        direction || initialDirection
      );

      const newNodes: PostNode[] = (data.posts || []).map((post: any, index: number) => ({
        id: `${batchId}-${index}`,
        imageUrl: post.imageUrl,
        keywords: post.keywords || [],
        vibe: post.vibe || post.metadata?.vibe || '',
        deltaFromParent: post.deltaFromParent || data.delta || fallbackDelta,
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
          similarity: similarity ?? similarityLevel,
          direction: direction || initialDirection,
          indexInBatch: index
        }
      }));

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
      const placeholderCount = actionType === 'edit' ? 1 : 4;
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        similarity ?? similarityLevel,
        direction || initialDirection
      );

      const placeholderNodes: PostNode[] = Array.from({ length: placeholderCount }, (_, index) => ({
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
          similarity: similarity ?? similarityLevel,
          direction: direction || initialDirection,
          indexInBatch: index
        }
      }));

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
          className="back-button"
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
              className="secondary regenerate-btn"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              Regenerate
            </button>
          )}
          {selectedPost && viewMode === 'single' && (
            <button
              className="primary finalize-btn"
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
            className="primary"
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
