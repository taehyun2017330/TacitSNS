import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryMap, getBatchNodes } from '../history/historyUtils';
import type {
  ClarificationDraftGoalUpdate,
  FeedbackData,
  Gen,
  PostGoalContextMetadata,
  PostNode
} from '../history/types';
import type {
  GenerationBrief,
  GuidedFeedbackSession,
  PostGoalStudioSession
} from '../../types/postStudio';
import { requestPostGeneration } from './api';
import { requestClarificationGoalDraft } from './clarification/api';
import { useDynamicClarification } from './clarification/useDynamicClarification';
import type {
  ClarificationPendingRequest,
  ClarificationTriggerContext
} from './clarification/types';
import { logPostStudioDebug, setPostStudioDebugState } from './debug';
import type { GuidedReasonOption } from './analysisUtils';
import { getFeedbackReasonMeta } from './feedbackOptions';
import {
  areAllPostsTriaged,
  buildExampleReasonOptions,
  buildGenerationBrief,
  buildGridCoachMessage,
  buildGuidedImageFeedback,
  buildGuidedFeedbackSession,
  buildGuidedSummary,
  shouldAskMicroClarification,
  summarizeClarificationAnswer,
  synthesizePreferenceSignals,
  updateGuidedStepFeedback
} from './guidedFeedbackUtils';
import type { EditOptions } from './types';
import {
  buildFallbackDelta,
  buildInitialDirectionPlan,
  buildIterativeDirectionAngles,
  countGeneratedImages,
  createGeneratedNodes,
  createPlaceholderNodes,
  createSeedPreviewNode,
  findLatestGridBatchId,
  findNearestGridBatch,
  getLastGeneratedAt
} from './utils';
import type { PostStudioProps, ViewMode } from './postStudio.types';

const DEFAULT_SIMILARITY = 50;
const EMPTY_STRING_ARRAY: string[] = [];

type ActiveClarificationTarget =
  | { stage: 'micro'; nodeId: string }
  | { stage: 'macro' }
  | null;

function stringArrayEquals(left: string[] = [], right: string[] = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeReasonMetaEntries(entries?: FeedbackData['reasonMeta'] | null) {
  return (entries ?? [])
    .map(entry => {
      const label = cleanText(entry?.label);
      if (!label) {
        return null;
      }

      return {
        label,
        chipLabel: cleanText(entry?.chipLabel) || undefined,
        systemInterpretation: cleanText(entry?.systemInterpretation) || undefined,
        followUpFocus: cleanText(entry?.followUpFocus) || undefined,
        dimension: entry?.dimension,
        ambiguity: entry?.ambiguity,
        likelyFollowUp: entry?.likelyFollowUp,
        followUpStage: entry?.followUpStage
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

function feedbackEquals(left?: FeedbackData | null, right?: FeedbackData | null) {
  const leftType = left?.type ?? null;
  const rightType = right?.type ?? null;
  if (leftType !== rightType) {
    return false;
  }

  const leftReasons = left?.reasons ?? [];
  const rightReasons = right?.reasons ?? [];
  if (
    leftReasons.length !== rightReasons.length ||
    leftReasons.some((reason, index) => reason !== rightReasons[index])
  ) {
    return false;
  }

  const leftReasonMeta = normalizeReasonMetaEntries(left?.reasonMeta);
  const rightReasonMeta = normalizeReasonMetaEntries(right?.reasonMeta);
  if (JSON.stringify(leftReasonMeta) !== JSON.stringify(rightReasonMeta)) {
    return false;
  }

  return (left?.customNote ?? '') === (right?.customNote ?? '');
}

function applyBatchFeedback(
  posts: PostNode[],
  batchFeedback: Record<string, FeedbackData | null>
) {
  return posts.map(post => {
    if (!(post.id in batchFeedback)) {
      return post;
    }

    const feedback = batchFeedback[post.id];
    return {
      ...post,
      feedback: feedback?.type ? feedback : undefined
    };
  });
}

function batchFeedbackMatchesPosts(
  posts: PostNode[],
  batchFeedback: Record<string, FeedbackData | null>
) {
  return posts.every(post => {
    const incoming = post.id in batchFeedback ? batchFeedback[post.id] : undefined;
    const normalizedIncoming = incoming?.type ? incoming : null;
    const normalizedExisting = post.feedback?.type ? post.feedback : null;
    return feedbackEquals(normalizedExisting, normalizedIncoming);
  });
}

function shouldCheckMacroClarification(session: GuidedFeedbackSession | null) {
  if (!session) {
    return false;
  }

  const likedCount = session.steps.filter(step => step.stance === 'like').length;
  const dislikedCount = session.steps.filter(step => step.stance === 'dislike').length;
  const unresolvedCount = session.steps.filter(step => step.status === 'unresolved').length;
  const hasMacroSignal = session.steps.some(step => step.reasonMeta?.followUpStage === 'macro');

  return unresolvedCount > 0 || hasMacroSignal || (likedCount > 0 && dislikedCount > 0);
}

export function usePostStudioController({
  brandName,
  brandCategory,
  brandIdentity = '',
  brandNarrative = '',
  businessGoalTitle,
  businessGoalDescription,
  postGoalTitle,
  postGoalDescription,
  postGoalWhyThisDirectionFits,
  postGoalTaxonomyTags = EMPTY_STRING_ARRAY,
  postGoalImageTypeChips = EMPTY_STRING_ARRAY,
  postGoalDirectionAngles = EMPTY_STRING_ARRAY,
  postGoalPreviewImageUrl,
  studioSession = null,
  onStudioSessionChange,
  onApplyGoalUpdate,
  onBack,
  onFinalize
}: PostStudioProps) {
  const postGoalDirectionAnglesSignature = JSON.stringify(postGoalDirectionAngles);
  const postGoalImageTypeChipsSignature = JSON.stringify(postGoalImageTypeChips);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [historyNodes, setHistoryNodes] = useState<Map<string, PostNode>>(new Map());
  const [currentGridPosts, setCurrentGridPosts] = useState<PostNode[]>([]);
  const [currentGridBatchId, setCurrentGridBatchId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostNode | null>(null);
  const [selectedGridIndex, setSelectedGridIndex] = useState<number | null>(null);
  const [guidedSession, setGuidedSession] = useState<GuidedFeedbackSession | null>(null);
  const [generationBrief, setGenerationBrief] = useState<GenerationBrief | null>(null);
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeClarificationTarget, setActiveClarificationTarget] =
    useState<ActiveClarificationTarget>(null);
  const [liveBusinessGoal, setLiveBusinessGoal] = useState({
    title: businessGoalTitle ?? '',
    description: businessGoalDescription ?? ''
  });
  const [livePostGoal, setLivePostGoal] = useState({
    title: postGoalTitle ?? '',
    description: postGoalDescription ?? '',
    whyThisDirectionFits: postGoalWhyThisDirectionFits ?? '',
    directionAngles: [...postGoalDirectionAngles],
    imageTypeChips: [...postGoalImageTypeChips]
  });
  const [pendingGoalDraft, setPendingGoalDraft] = useState<ClarificationDraftGoalUpdate | null>(null);
  const [pendingGoalDraftCycleId, setPendingGoalDraftCycleId] = useState<string | null>(null);
  const lastSyncedSessionSignatureRef = useRef('');
  const lastHydratedSessionSignatureRef = useRef('');
  const hydratedStudioSourceKeyRef = useRef('');
  const currentGridPostsRef = useRef<PostNode[]>([]);
  const clarificationRequestRunRef = useRef(0);
  const guidedNoteProbeTimeoutsRef = useRef<Record<string, ReturnType<typeof window.setTimeout>>>({});

  const {
    memory: clarificationMemory,
    pendingQuestion,
    isEvaluating,
    hydrateMemory,
    requestClarification,
    dismissPendingQuestion,
    submitAnswer,
    skipQuestion,
    attachGoalDraft,
    applyGoalDraft,
    dismissGoalDraft,
    clarificationContext,
    clarificationSummaries
  } = useDynamicClarification();

  useEffect(() => {
    const nextState = {
      title: businessGoalTitle ?? '',
      description: businessGoalDescription ?? ''
    };
    setLiveBusinessGoal(prev =>
      prev.title === nextState.title && prev.description === nextState.description
        ? prev
        : nextState
    );
  }, [businessGoalDescription, businessGoalTitle]);

  useEffect(() => {
    const nextState = {
      title: postGoalTitle ?? '',
      description: postGoalDescription ?? '',
      whyThisDirectionFits: postGoalWhyThisDirectionFits ?? '',
      directionAngles: JSON.parse(postGoalDirectionAnglesSignature) as string[],
      imageTypeChips: JSON.parse(postGoalImageTypeChipsSignature) as string[]
    };
    setLivePostGoal(prev =>
      prev.title === nextState.title &&
      prev.description === nextState.description &&
      prev.whyThisDirectionFits === nextState.whyThisDirectionFits &&
      stringArrayEquals(prev.directionAngles, nextState.directionAngles) &&
      stringArrayEquals(prev.imageTypeChips, nextState.imageTypeChips)
        ? prev
        : nextState
    );
  }, [
    postGoalDescription,
    postGoalDirectionAnglesSignature,
    postGoalImageTypeChipsSignature,
    postGoalTitle,
    postGoalWhyThisDirectionFits
  ]);

  const studioSessionSignature = useMemo(
    () => (studioSession ? JSON.stringify(studioSession) : ''),
    [studioSession]
  );
  const studioSourceKey = useMemo(
    () => [brandName, businessGoalTitle ?? '', postGoalTitle ?? ''].join('::'),
    [brandName, businessGoalTitle, postGoalTitle]
  );

  useEffect(() => {
    currentGridPostsRef.current = currentGridPosts;
  }, [currentGridPosts]);

  useEffect(() => () => {
    Object.values(guidedNoteProbeTimeoutsRef.current).forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    guidedNoteProbeTimeoutsRef.current = {};
  }, []);

  const history = useMemo(() => buildHistoryMap(historyNodes.values()), [historyNodes]);
  const postGoalContext = useMemo<PostGoalContextMetadata>(
    () => ({
      brandName,
      brandCategory,
      brandIdentity,
      brandNarrative,
      businessGoalTitle: liveBusinessGoal.title,
      postGoalTitle: livePostGoal.title,
      postGoalDescription: livePostGoal.description,
      imageTypeChips: livePostGoal.imageTypeChips,
      directionAngles: livePostGoal.directionAngles
    }),
    [
      brandCategory,
      brandIdentity,
      brandName,
      brandNarrative,
      liveBusinessGoal.title,
      livePostGoal.description,
      livePostGoal.directionAngles,
      livePostGoal.imageTypeChips,
      livePostGoal.title
    ]
  );

  const brandContext = useMemo(
    () =>
      [
        brandIdentity,
        brandNarrative,
        liveBusinessGoal.title ? `Business goal: ${liveBusinessGoal.title}` : '',
        liveBusinessGoal.description ? `Business goal description: ${liveBusinessGoal.description}` : '',
        livePostGoal.title ? `Post goal: ${livePostGoal.title}` : '',
        livePostGoal.description ? `Post goal description: ${livePostGoal.description}` : ''
      ]
        .filter(Boolean)
        .join(' '),
    [
      brandIdentity,
      brandNarrative,
      liveBusinessGoal.description,
      liveBusinessGoal.title,
      livePostGoal.description,
      livePostGoal.title
    ]
  );

  const initialDirectionPlan = useMemo(
    () =>
      buildInitialDirectionPlan({
        brandName,
        brandCategory,
        brandIdentity,
        brandNarrative,
        businessGoalTitle: liveBusinessGoal.title,
        folder: {
          title: livePostGoal.title || 'Post goal',
          description: livePostGoal.description || 'Create one clear visual direction for this post goal.',
          taxonomyTags: postGoalTaxonomyTags,
          imageTypeChips: livePostGoal.imageTypeChips,
          directionAngles: livePostGoal.directionAngles,
          assistantPrompt: [
            livePostGoal.description,
            liveBusinessGoal.title ? `Support ${liveBusinessGoal.title.toLowerCase()}.` : ''
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
      postGoalTaxonomyTags,
      liveBusinessGoal.title,
      livePostGoal.description,
      livePostGoal.directionAngles,
      livePostGoal.imageTypeChips,
      livePostGoal.title
    ]
  );

  const generatedImageCount = studioSession?.generatedImageCount ?? countGeneratedImages(historyNodes.values());
  const sessionBootstrapPending = studioSession?.bootstrapStatus === 'generating';
  const resolvedIsGenerating = isGenerating || (sessionBootstrapPending && historyNodes.size === 0);
  const guidedCoachMessage = useMemo(
    () => buildGridCoachMessage(currentGridPosts),
    [currentGridPosts]
  );

  const resetGuidedState = useCallback(() => {
    setGuidedSession(null);
    setGenerationBrief(null);
    setPendingGoalDraft(null);
    setPendingGoalDraftCycleId(null);
    setActiveClarificationTarget(null);
    dismissPendingQuestion();
  }, [dismissPendingQuestion]);

  useEffect(() => {
    const isSameStudioSource = hydratedStudioSourceKeyRef.current === studioSourceKey;
    if (!studioSessionSignature) {
      if (!isSameStudioSource) {
        hydratedStudioSourceKeyRef.current = studioSourceKey;
        lastHydratedSessionSignatureRef.current = '';
      }
      return;
    }

    if (isSameStudioSource && historyNodes.size > 0) {
      return;
    }

    if (isSameStudioSource && lastHydratedSessionSignatureRef.current === studioSessionSignature) {
      return;
    }

    const restoredNodes = new Map((studioSession?.nodes ?? []).map(node => [node.id, node]));
    const restoredHistory = buildHistoryMap(restoredNodes.values());
    const restoredGridBatchId =
      studioSession?.currentGridBatchId && getBatchNodes(restoredNodes, studioSession.currentGridBatchId).length > 0
        ? studioSession.currentGridBatchId
        : findLatestGridBatchId(restoredNodes.values());
    const restoredGridPosts = restoredGridBatchId ? getBatchNodes(restoredNodes, restoredGridBatchId) : [];
    const restoredSelectedPost =
      studioSession?.selectedPostId ? restoredNodes.get(studioSession.selectedPostId) ?? null : null;
    const restoredViewMode: ViewMode =
      studioSession?.currentViewMode === 'single' && restoredSelectedPost
        ? 'single'
        : studioSession?.currentViewMode === 'guided' && studioSession?.guidedSession
          ? 'guided'
          : studioSession?.currentViewMode === 'brief' && studioSession?.generationBrief
            ? 'brief'
            : 'grid';
    const fallbackGridBatchId =
      restoredGridBatchId ??
      (restoredSelectedPost
        ? findNearestGridBatch(
            restoredHistory,
            restoredSelectedPost.metadata?.batchId ?? restoredSelectedPost.metadata?.parentBatchId ?? null
          )
        : null);
    const fallbackGridPosts = fallbackGridBatchId ? getBatchNodes(restoredNodes, fallbackGridBatchId) : [];

    setHistoryNodes(restoredNodes);
    setCurrentGridBatchId(fallbackGridBatchId);
    setCurrentGridPosts(restoredGridPosts.length > 0 ? restoredGridPosts : fallbackGridPosts);
    setSelectedPost(restoredViewMode === 'single' ? restoredSelectedPost : null);
    setSelectedGridIndex(studioSession?.selectedGridIndex ?? null);
    setGuidedSession(studioSession?.guidedSession ?? null);
    setGenerationBrief(studioSession?.generationBrief ?? null);
    setNavigationStack([]);
    setViewMode(restoredViewMode);
    setError('');
    setActiveClarificationTarget(null);
    hydrateMemory(
      studioSession?.clarificationMemory
        ? {
            ...studioSession.clarificationMemory,
            latestEvaluation: null
          }
        : null,
      null,
      null
    );
    setPendingGoalDraft(studioSession?.pendingGoalDraft ?? null);
    setPendingGoalDraftCycleId(studioSession?.pendingGoalDraftCycleId ?? null);
    hydratedStudioSourceKeyRef.current = studioSourceKey;
    lastSyncedSessionSignatureRef.current = studioSessionSignature;
    lastHydratedSessionSignatureRef.current = studioSessionSignature;
  }, [
    historyNodes.size,
    hydrateMemory,
    studioSession,
    studioSessionSignature,
    studioSourceKey
  ]);

  const upsertNodes = (nodes: PostNode[]) => {
    setHistoryNodes(prev => {
      const next = new Map(prev);
      nodes.forEach(node => next.set(node.id, node));
      return next;
    });
  };

  const sessionHasNodes = (studioSession?.nodes?.length ?? 0) > 0;

  useEffect(() => {
    if (
      historyNodes.size === 0 &&
      currentGridBatchId === null &&
      !isGenerating &&
      !sessionHasNodes &&
      !sessionBootstrapPending
    ) {
      void generatePosts(
        'initial',
        null,
        undefined,
        DEFAULT_SIMILARITY,
        initialDirectionPlan.brief,
        initialDirectionPlan.directionAngles
      );
    }
  }, [
    currentGridBatchId,
    historyNodes.size,
    initialDirectionPlan.brief,
    initialDirectionPlan.directionAngles,
    isGenerating,
    sessionBootstrapPending,
    sessionHasNodes
  ]);

  useEffect(() => {
    if (!onStudioSessionChange || historyNodes.size === 0) {
      return;
    }

    const nextSession: PostGoalStudioSession = {
      nodes: Array.from(historyNodes.values()),
      currentGridBatchId,
      currentViewMode: viewMode,
      selectedPostId: selectedPost?.id ?? null,
      selectedGridIndex,
      generatedImageCount: countGeneratedImages(historyNodes.values()),
      lastGeneratedAt: getLastGeneratedAt(historyNodes.values()),
      seedDirection: initialDirectionPlan.brief,
      directionAngles: initialDirectionPlan.directionAngles,
      seedPreviewImageUrl: postGoalPreviewImageUrl ?? null,
      guidedSession,
      generationBrief,
      clarificationMemory: {
        ...clarificationMemory,
        latestEvaluation: null
      },
      pendingGoalDraft,
      pendingGoalDraftCycleId
    };
    const signature = JSON.stringify(nextSession);

    if (lastSyncedSessionSignatureRef.current === signature) {
      return;
    }

    lastSyncedSessionSignatureRef.current = signature;
    onStudioSessionChange(nextSession);
  }, [
    clarificationMemory,
    currentGridBatchId,
    generationBrief,
    guidedSession,
    historyNodes,
    initialDirectionPlan.brief,
    initialDirectionPlan.directionAngles,
    onStudioSessionChange,
    pendingGoalDraft,
    pendingGoalDraftCycleId,
    postGoalPreviewImageUrl,
    selectedGridIndex,
    selectedPost,
    viewMode
  ]);

  const updateNodeFeedbackState = useCallback((nodeId: string, feedback: FeedbackData) => {
    const normalizedFeedback = feedback.type ? feedback : undefined;
    const nextGridPosts = currentGridPostsRef.current.map(node => (
      node.id === nodeId ? { ...node, feedback: normalizedFeedback } : node
    ));

    currentGridPostsRef.current = nextGridPosts;

    setHistoryNodes(prev => {
      const next = new Map(prev);
      const existingNode = next.get(nodeId);
      if (existingNode) {
        next.set(nodeId, {
          ...existingNode,
          feedback: normalizedFeedback
        });
      }
      return next;
    });

    setCurrentGridPosts(nextGridPosts);

    setSelectedPost(prev => (prev?.id === nodeId ? { ...prev, feedback: normalizedFeedback } : prev));
  }, []);

  const buildClarificationTriggerContext = useCallback(({
    stage,
    posts,
    selectedPost,
    actionType = 'explore',
    direction,
    selectedReason,
    selectedReasonMeta,
    sessionState
  }: {
    stage: 'micro' | 'macro';
    posts: PostNode[];
    selectedPost: PostNode | null;
    actionType?: 'explore' | 'regenerate';
    direction?: string;
    selectedReason?: string;
    selectedReasonMeta?: ClarificationTriggerContext['selectedReasonMeta'];
    sessionState?: GuidedFeedbackSession | null;
  }): ClarificationTriggerContext => ({
    stage,
    actionType,
    posts,
    historyNodes,
    selectedPost,
    selectedGridIndex:
      selectedPost ? posts.findIndex(post => post.id === selectedPost.id) : null,
    primaryNodeId: selectedPost?.id ?? null,
    selectedReason,
    selectedReasonMeta,
    reasonMetaByNodeId: sessionState
      ? Object.fromEntries(
          sessionState.steps
            .map(step => [step.nodeId, step.reasonMeta ? [step.reasonMeta] : []] as const)
            .filter(([, reasonMeta]) => reasonMeta.length > 0)
        )
      : undefined,
    guidedSummary: sessionState ? buildGuidedSummary(sessionState) : undefined,
    memory: clarificationMemory,
    direction,
    brandNarrative,
    businessGoalTitle: liveBusinessGoal.title,
    businessGoalDescription: liveBusinessGoal.description,
    postGoalTitle: livePostGoal.title,
    postGoalDescription: livePostGoal.description,
    postGoalDirectionAngles: livePostGoal.directionAngles
  }), [
    brandNarrative,
    clarificationMemory,
    historyNodes,
    liveBusinessGoal.description,
    liveBusinessGoal.title,
    livePostGoal.description,
    livePostGoal.directionAngles,
    livePostGoal.title
  ]);

  const buildBriefForSession = useCallback((
    sessionState: GuidedFeedbackSession,
    clarificationSummariesOverride = clarificationSummaries,
    similarityOverride?: number,
    overrides?: {
      fallbackDirection?: string;
      fallbackAngles?: string[];
      postGoalTitle?: string;
    }
  ) => {
    const signals = synthesizePreferenceSignals(
      sessionState,
      currentGridPostsRef.current,
      clarificationSummariesOverride
    );
    const normalizedSession: GuidedFeedbackSession = {
      ...sessionState,
      synthesizedPreferences: signals,
      updatedAt: Date.now()
    };
    const brief = buildGenerationBrief({
      posts: currentGridPostsRef.current,
      session: normalizedSession,
      clarificationSummaries: clarificationSummariesOverride,
      fallbackDirection: overrides?.fallbackDirection ?? initialDirectionPlan.brief,
      fallbackAngles: overrides?.fallbackAngles ?? initialDirectionPlan.directionAngles,
      postGoalTitle: overrides?.postGoalTitle ?? livePostGoal.title,
      similarity:
        similarityOverride ??
        normalizedSession.draftBrief?.similarity ??
        generationBrief?.similarity ??
        DEFAULT_SIMILARITY
    });

    return {
      session: {
        ...normalizedSession,
        draftBrief: brief
      },
      brief
    };
  }, [
    clarificationSummaries,
    generationBrief?.similarity,
    initialDirectionPlan.brief,
    initialDirectionPlan.directionAngles,
    livePostGoal.title
  ]);

  const maybeRequestMacroClarification = useCallback(async (
    sessionState: GuidedFeedbackSession,
    brief: GenerationBrief
  ) => {
    if (!shouldCheckMacroClarification(sessionState) || currentGridPostsRef.current.length === 0) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
      setGuidedSession(current => (
        current
          ? {
              ...current,
              macroQuestion: null,
              updatedAt: Date.now()
            }
          : current
      ));
      return;
    }

    const anchorPost =
      currentGridPostsRef.current.find(post => post.id === brief.anchorNodeId) ??
      currentGridPostsRef.current[0] ??
      null;
    if (!anchorPost) {
      return;
    }

    const requestId = ++clarificationRequestRunRef.current;
    const request: ClarificationPendingRequest = {
      actionType: 'explore',
      parentNodeId: brief.anchorNodeId,
      similarity: brief.similarity,
      direction: brief.direction,
      directionAngles: brief.directionAngles,
      feedbackSourcePosts: currentGridPostsRef.current,
      pushBatchId: currentGridBatchId,
      autoExecute: false
    };

    setActiveClarificationTarget({ stage: 'macro' });

    const decision = await requestClarification(
      buildClarificationTriggerContext({
        stage: 'macro',
        posts: currentGridPostsRef.current,
        selectedPost: anchorPost,
        direction: brief.direction,
        sessionState
      }),
      request
    );

    if (clarificationRequestRunRef.current !== requestId) {
      return;
    }

    const nextQuestion = decision.question ?? null;
    if (!nextQuestion) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
      setGuidedSession(current => (
        current
          ? {
              ...current,
              macroQuestion: null,
              updatedAt: Date.now()
            }
          : current
      ));
      return;
    }

    setGuidedSession(current => (
      current
        ? {
            ...current,
            macroQuestion: nextQuestion,
            updatedAt: Date.now()
          }
        : current
    ));
  }, [
    buildClarificationTriggerContext,
    currentGridBatchId,
    dismissPendingQuestion,
    requestClarification
  ]);

  const updateGuidedStep = useCallback((
    nodeId: string,
    updater: (step: GuidedFeedbackSession['steps'][number]) => GuidedFeedbackSession['steps'][number]
  ) => {
    if (!guidedSession) {
      return null;
    }

    const nextSession: GuidedFeedbackSession = {
      ...guidedSession,
      steps: guidedSession.steps.map(step => (step.nodeId === nodeId ? updater(step) : step)),
      updatedAt: Date.now()
    };
    setGuidedSession(nextSession);
    return nextSession;
  }, [guidedSession]);

  const requestMicroClarification = useCallback(async (
    sessionState: GuidedFeedbackSession,
    nodeId: string
  ) => {
    const step = sessionState.steps.find(entry => entry.nodeId === nodeId);
    const post = currentGridPostsRef.current.find(entry => entry.id === nodeId) ?? null;
    if (!step || !post || !step.primaryReasonLabel) {
      return;
    }

    const reasonMeta = step.reasonMeta ?? getFeedbackReasonMeta(step.primaryReasonLabel);
    if (reasonMeta?.followUpStage === 'macro') {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
      setGuidedSession(current => (
        current
          ? {
              ...current,
              steps: current.steps.map(entry =>
                entry.nodeId === nodeId
                  ? {
                      ...entry,
                      microQuestion: null,
                      microAnswer: null
                    }
                  : entry
              ),
              updatedAt: Date.now()
            }
          : current
      ));
      return;
    }

    const requestId = ++clarificationRequestRunRef.current;
    const request: ClarificationPendingRequest = {
      actionType: 'explore',
      parentNodeId: nodeId,
      similarity: generationBrief?.similarity ?? DEFAULT_SIMILARITY,
      direction: generationBrief?.direction ?? initialDirectionPlan.brief,
      directionAngles: generationBrief?.directionAngles ?? initialDirectionPlan.directionAngles,
      feedbackSourcePosts: currentGridPostsRef.current,
      pushBatchId: currentGridBatchId,
      autoExecute: false
    };

    setActiveClarificationTarget({ stage: 'micro', nodeId });

    const decision = await requestClarification(
      buildClarificationTriggerContext({
        stage: 'micro',
        posts: currentGridPostsRef.current,
        selectedPost: post,
        direction: request.direction,
        selectedReason: step.primaryReasonLabel,
        selectedReasonMeta: reasonMeta,
        sessionState
      }),
      request
    );

    if (clarificationRequestRunRef.current !== requestId) {
      return;
    }

    const nextQuestion = shouldAskMicroClarification(step, decision.question ?? null)
      ? decision.question ?? null
      : null;

    if (!nextQuestion) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
    }

    setGuidedSession(current => (
      current
        ? {
            ...current,
            steps: current.steps.map(entry =>
              entry.nodeId === nodeId
                ? {
                    ...entry,
                    microQuestion: nextQuestion,
                    microAnswer: null
                  }
                : entry
            ),
            updatedAt: Date.now()
          }
        : current
    ));
  }, [
    buildClarificationTriggerContext,
    currentGridBatchId,
    dismissPendingQuestion,
    generationBrief?.direction,
    generationBrief?.directionAngles,
    generationBrief?.similarity,
    initialDirectionPlan.brief,
    initialDirectionPlan.directionAngles,
    requestClarification
  ]);

  const generatePosts = async (
    actionType: 'initial' | 'explore' | 'edit' | 'regenerate',
    parentNodeId: string | null = null,
    editOptions?: EditOptions,
    similarity?: number,
    direction?: string,
    directionAngles: string[] = [],
    feedbackSourcePosts?: PostNode[],
    clarificationContextOverride = clarificationContext,
    clarificationSummariesOverride = clarificationSummaries,
    guidedSessionOverride: GuidedFeedbackSession | null = guidedSession
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
      const resolvedSimilarity = similarity ?? DEFAULT_SIMILARITY;
      const normalizedSimilarity = resolvedSimilarity > 1 ? resolvedSimilarity : DEFAULT_SIMILARITY;
      const resolvedDirection = direction || initialDirectionPlan.brief;
      const sourcePosts = feedbackSourcePosts ?? currentGridPostsRef.current;
      const resolvedDirectionAngles =
        directionAngles.length > 0
          ? directionAngles
          : actionType === 'initial'
            ? initialDirectionPlan.directionAngles
            : buildIterativeDirectionAngles({
                posts: sourcePosts,
                parentNode,
                direction: resolvedDirection,
                fallbackAngles: initialDirectionPlan.directionAngles
              });
      const shouldSeedPreview =
        actionType === 'initial' &&
        !parentNodeId &&
        Boolean(postGoalPreviewImageUrl) &&
        historyNodes.size === 0 &&
        currentGridBatchId === null;
      const requestDirectionAngles =
        actionType === 'initial' && shouldSeedPreview
          ? resolvedDirectionAngles.slice(1)
          : resolvedDirectionAngles;
      const requestImageCount =
        actionType === 'edit'
          ? 1
          : shouldSeedPreview
            ? 3
            : 4;
      const imagesFeedback =
        guidedSessionOverride && sourcePosts.length > 0
          ? buildGuidedImageFeedback(sourcePosts, guidedSessionOverride)
          : sourcePosts
              .filter(post => post.feedback?.type)
              .map(post => ({
                image_id: post.id,
                feedback_type:
                  post.feedback?.type === 'yes'
                    ? 'like'
                    : post.feedback?.type === 'no'
                      ? 'dislike'
                      : 'unsure',
                primary_reason: post.feedback?.reasons?.[0],
                custom_note: post.feedback?.customNote,
                step_status: post.feedback?.reasons?.[0] ? 'answered' : 'unresolved',
                direction_angle: post.metadata?.directionAngle ?? undefined,
                image_summary: post.analysis?.summary ?? post.analysis?.title ?? undefined
              }));

      logPostStudioDebug('generatePosts:derivedInputs', {
        actionType,
        batchId,
        parentNodeId,
        resolvedSimilarity: normalizedSimilarity,
        normalizedExplorationLevel: normalizedSimilarity / 100,
        resolvedDirection,
        resolvedDirectionAngles,
        requestDirectionAngles,
        generationBrief: {
          brandName,
          brandCategory,
          brandIdentity,
          brandNarrative,
          businessGoalTitle: liveBusinessGoal.title,
          businessGoalDescription: liveBusinessGoal.description,
          postGoalTitle: livePostGoal.title,
          postGoalDescription: livePostGoal.description,
          postGoalWhyThisDirectionFits: livePostGoal.whyThisDirectionFits,
          directionAnchor: resolvedDirection
        },
        shouldSeedPreview,
        requestImageCount,
        parentKeywords: parentNode?.analysis?.designKeywords ?? parentNode?.keywords ?? [],
        imagesFeedback,
        clarificationContext: clarificationContextOverride
      });

      const data = await requestPostGeneration({
        brandName,
        brandCategory,
        brandContext,
        parentNode,
        similarity: normalizedSimilarity,
        direction: resolvedDirection,
        directionAngles: requestDirectionAngles,
        analysisDirectionAngles: resolvedDirectionAngles,
        seedImageUrls: shouldSeedPreview && postGoalPreviewImageUrl ? [postGoalPreviewImageUrl] : [],
        imagesFeedback,
        clarificationContext: clarificationContextOverride,
        actionType,
        editOptions,
        numImages: requestImageCount
      });

      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        normalizedSimilarity,
        resolvedDirection
      );

      const seedNode =
        shouldSeedPreview && postGoalPreviewImageUrl
          ? createSeedPreviewNode({
              batchId,
              batchTime,
              imageUrl: postGoalPreviewImageUrl,
              direction: resolvedDirection,
              directionAngle: resolvedDirectionAngles[0],
              analysis: data.batchAnalysis?.images?.[0],
              batchAnalysis: data.batchAnalysis,
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
        similarity: normalizedSimilarity,
        direction: resolvedDirection,
        directionAngles: resolvedDirectionAngles,
        selectedGridIndex,
        parentNode,
        editOptions,
        indexOffset: seedNode ? 1 : 0,
        batchAnalysis: data.batchAnalysis,
        postGoalContext,
        clarificationSummaries: clarificationSummariesOverride
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
        resetGuidedState();
        setViewMode('grid');
      }
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to generate posts');

      const placeholderCount = actionType === 'edit' ? 1 : 4;
      const resolvedSimilarity = similarity ?? DEFAULT_SIMILARITY;
      const normalizedSimilarity = resolvedSimilarity > 1 ? resolvedSimilarity : DEFAULT_SIMILARITY;
      const resolvedDirection = direction || initialDirectionPlan.brief;
      const sourcePosts = feedbackSourcePosts ?? currentGridPostsRef.current;
      const resolvedDirectionAngles =
        directionAngles.length > 0
          ? directionAngles
          : actionType === 'initial'
            ? initialDirectionPlan.directionAngles
            : buildIterativeDirectionAngles({
                posts: sourcePosts,
                parentNode,
                direction: resolvedDirection,
                fallbackAngles: initialDirectionPlan.directionAngles
              });
      const shouldSeedPreview =
        actionType === 'initial' &&
        !parentNodeId &&
        Boolean(postGoalPreviewImageUrl) &&
        historyNodes.size === 0 &&
        currentGridBatchId === null;
      const fallbackDelta = buildFallbackDelta(
        actionType,
        editOptions,
        normalizedSimilarity,
        resolvedDirection
      );

      const seedNode =
        shouldSeedPreview && postGoalPreviewImageUrl
          ? createSeedPreviewNode({
              batchId,
              batchTime,
              imageUrl: postGoalPreviewImageUrl,
              direction: resolvedDirection,
              directionAngle: resolvedDirectionAngles[0],
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
        similarity: normalizedSimilarity,
        direction: resolvedDirection,
        directionAngles: resolvedDirectionAngles,
        indexOffset: seedNode ? 1 : 0,
        postGoalContext,
        clarificationSummaries: clarificationSummariesOverride,
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
        resetGuidedState();
        setViewMode('grid');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const buildGoalDraftPayload = (
    target: 'post_goal' | 'business_goal',
    answer: Parameters<typeof submitAnswer>[0],
    feedbackPosts: PostNode[],
    clarificationPayload = clarificationContext
  ) => ({
    target,
    family: answer.family,
    move: answer.move,
    brandNarrative,
    businessGoalTitle: liveBusinessGoal.title,
    businessGoalDescription: liveBusinessGoal.description,
    postGoalTitle: livePostGoal.title,
    postGoalDescription: livePostGoal.description,
    postGoalDirectionAngles: livePostGoal.directionAngles,
    answerLabel:
      typeof answer.values['goal-commit'] === 'string'
        ? String(answer.values['goal-commit'])
        : '',
    answerValues: answer.values,
    activeInsights: clarificationPayload.activeInsights,
    recentRecords: clarificationPayload.recentRecords,
    recentCycles: clarificationPayload.recentCycles ?? [],
    feedbackSignals: feedbackPosts
      .filter(post => post.feedback?.type)
      .map(post => ({
        nodeId: post.id,
        imageUrl: post.imageUrl,
        feedbackType: post.feedback?.type ?? 'unsure',
        reasons: post.feedback?.reasons ?? [],
        reasonMeta: post.feedback?.reasonMeta ?? [],
        customNote: post.feedback?.customNote ?? '',
        analysisTitle: post.analysis?.title ?? '',
        analysisSummary: post.analysis?.summary ?? '',
        analysisKeywords: post.analysis?.designKeywords ?? post.keywords ?? [],
        directionAngle: post.metadata?.directionAngle ?? null
      }))
  });

  const handleClarificationSubmit = async (answer: Parameters<typeof submitAnswer>[0]) => {
    const result = submitAnswer(answer);
    logPostStudioDebug('clarification:answerSubmitted', {
      answer,
      result,
      activeClarificationTarget
    });

    if (activeClarificationTarget?.stage === 'micro' && guidedSession) {
      const nextSession = {
        ...guidedSession,
        steps: guidedSession.steps.map(step =>
          step.nodeId === activeClarificationTarget.nodeId
            ? {
                ...step,
                microAnswer: answer,
                completedAt: Date.now()
              }
            : step
        ),
        updatedAt: Date.now()
      };
      setGuidedSession(nextSession);
    }

    if (activeClarificationTarget?.stage === 'macro' && guidedSession) {
      const { session: nextSession, brief } = buildBriefForSession(
        {
          ...guidedSession,
          macroAnswer: answer,
          updatedAt: Date.now()
        },
        result.clarificationSummaries
      );
      setGuidedSession(nextSession);
      setGenerationBrief(brief);
    }

    setActiveClarificationTarget(null);

    const goalCommitChoice =
      typeof answer.values['goal-commit'] === 'string' ? answer.values['goal-commit'] : '';
    const shouldDraftGoalUpdate =
      result.cycle?.move === 'goal_reframe' &&
      (goalCommitChoice === 'revise_post_goal' || goalCommitChoice === 'revisit_business_goal');

    if (shouldDraftGoalUpdate && result.cycle) {
      const target =
        goalCommitChoice === 'revisit_business_goal' ? 'business_goal' : 'post_goal';

      try {
        const draft = await requestClarificationGoalDraft(
          buildGoalDraftPayload(
            target,
            answer,
            currentGridPostsRef.current,
            result.clarificationContext
          )
        );
        attachGoalDraft(result.cycle.id, draft);
        setPendingGoalDraft(draft);
        setPendingGoalDraftCycleId(result.cycle.id);
        return;
      } catch (draftError: any) {
        setError(draftError?.message || 'Failed to draft a goal update');
      }
    }
  };

  const handleClarificationSkip = () => {
    const skippedAnswer =
      pendingQuestion
        ? {
            questionId: pendingQuestion.id,
            family: pendingQuestion.family,
            move: pendingQuestion.move,
            values: {},
            skipped: true,
            answeredAt: Date.now()
          }
        : null;
    const result = skipQuestion();
    logPostStudioDebug('clarification:questionSkipped', {
      result,
      activeClarificationTarget
    });

    if (!skippedAnswer) {
      setActiveClarificationTarget(null);
      return;
    }

    if (activeClarificationTarget?.stage === 'micro' && guidedSession) {
      setGuidedSession({
        ...guidedSession,
        steps: guidedSession.steps.map(step =>
          step.nodeId === activeClarificationTarget.nodeId
            ? {
                ...step,
                microAnswer: skippedAnswer,
                completedAt: Date.now()
              }
            : step
        ),
        updatedAt: Date.now()
      });
    }

    if (activeClarificationTarget?.stage === 'macro' && guidedSession) {
      const { session: nextSession, brief } = buildBriefForSession(
        {
          ...guidedSession,
          macroAnswer: skippedAnswer,
          updatedAt: Date.now()
        },
        result.clarificationSummaries
      );
      setGuidedSession(nextSession);
      setGenerationBrief(brief);
    }

    setActiveClarificationTarget(null);
  };

  const handleGridBatchFeedbackChange = useCallback((batchFeedback: Record<string, FeedbackData | null>) => {
    if (batchFeedbackMatchesPosts(currentGridPostsRef.current, batchFeedback)) {
      return;
    }

    const updatedBatch = applyBatchFeedback(currentGridPostsRef.current, batchFeedback);
    upsertNodes(updatedBatch);
    setCurrentGridPosts(updatedBatch);
  }, []);

  const handleInspectPost = (
    post: PostNode,
    feedback: FeedbackData,
    batchFeedback: Record<string, FeedbackData | null>
  ) => {
    const updatedBatch = applyBatchFeedback(currentGridPostsRef.current, batchFeedback);
    const updatedSourceNode =
      updatedBatch.find(currentPost => currentPost.id === post.id) ?? { ...post, feedback };
    const gridIndex = currentGridPosts.findIndex(currentPost => currentPost.id === post.id);

    upsertNodes(updatedBatch);
    setCurrentGridPosts(updatedBatch);
    setSelectedPost(updatedSourceNode);
    setSelectedGridIndex(gridIndex >= 0 ? gridIndex : null);
    setViewMode('single');
  };

  const handleStartGuidedFeedback = async (
    batchFeedback: Record<string, FeedbackData | null>
  ) => {
    const updatedBatch = applyBatchFeedback(currentGridPostsRef.current, batchFeedback);
    upsertNodes(updatedBatch);
    setCurrentGridPosts(updatedBatch);

    if (!areAllPostsTriaged(updatedBatch)) {
      return;
    }

    resetGuidedState();
    const nextSession = buildGuidedFeedbackSession(updatedBatch, currentGridBatchId);
    setGuidedSession(nextSession);
    setSelectedPost(null);
    setViewMode('guided');
  };

  const handleGuidedBackToGrid = () => {
    resetGuidedState();
    setViewMode('grid');
  };

  const handleGuidedPrevStep = () => {
    if (!guidedSession) {
      return;
    }

    setGuidedSession({
      ...guidedSession,
      currentImageIndex: Math.max(0, guidedSession.currentImageIndex - 1),
      updatedAt: Date.now()
    });
  };

  const handleGuidedCustomNoteChange = (nodeId: string, value: string) => {
    const nextSession = updateGuidedStep(nodeId, step => ({
      ...step,
      customNote: value
    }));
    if (!nextSession) {
      return;
    }

    const step = nextSession.steps.find(entry => entry.nodeId === nodeId);
    if (!step) {
      return;
    }

    updateNodeFeedbackState(nodeId, updateGuidedStepFeedback(step));

    const existingTimeout = guidedNoteProbeTimeoutsRef.current[nodeId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
    }

    const trimmedValue = value.trim();
    const shouldProbeFromNote = Boolean(
      trimmedValue.length >= 12 &&
      step.primaryReasonLabel &&
      step.status !== 'unresolved' &&
      !step.microAnswer &&
      !step.microQuestion &&
      step.reasonMeta?.followUpStage !== 'macro'
    );

    if (!shouldProbeFromNote) {
      return;
    }

    guidedNoteProbeTimeoutsRef.current[nodeId] = window.setTimeout(() => {
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
      void requestMicroClarification(nextSession, nodeId);
    }, 700);
  };

  const handleGuidedHardToAnswer = (nodeId: string) => {
    const existingTimeout = guidedNoteProbeTimeoutsRef.current[nodeId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
    }

    const post = currentGridPostsRef.current.find(entry => entry.id === nodeId) ?? null;
    if (!post) {
      return;
    }

    if (activeClarificationTarget?.stage === 'micro' && activeClarificationTarget.nodeId === nodeId) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
    }

    const nextSession = updateGuidedStep(nodeId, step => ({
      ...step,
      status: 'pending',
      primaryReasonId: undefined,
      primaryReasonLabel: undefined,
      reasonMeta: undefined,
      hardToAnswerChosen: true,
      exampleReasonOptions: buildExampleReasonOptions(post, step.stance, livePostGoal.title),
      microQuestion: null,
      microAnswer: null,
      completedAt: null
    }));

    if (!nextSession) {
      return;
    }

    const step = nextSession.steps.find(entry => entry.nodeId === nodeId);
    if (!step) {
      return;
    }

    updateNodeFeedbackState(nodeId, updateGuidedStepFeedback(step));
  };

  const handleGuidedKeepUnresolved = (nodeId: string) => {
    const existingTimeout = guidedNoteProbeTimeoutsRef.current[nodeId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
    }

    if (activeClarificationTarget?.stage === 'micro' && activeClarificationTarget.nodeId === nodeId) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
    }

    const nextSession = updateGuidedStep(nodeId, step => ({
      ...step,
      status: 'unresolved',
      primaryReasonId: undefined,
      primaryReasonLabel: undefined,
      reasonMeta: undefined,
      microQuestion: null,
      microAnswer: null,
      completedAt: Date.now()
    }));

    if (!nextSession) {
      return;
    }

    const step = nextSession.steps.find(entry => entry.nodeId === nodeId);
    if (!step) {
      return;
    }

    updateNodeFeedbackState(nodeId, updateGuidedStepFeedback(step));
  };

  const handleGuidedReasonSelect = async (nodeId: string, reason: GuidedReasonOption) => {
    const existingTimeout = guidedNoteProbeTimeoutsRef.current[nodeId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
    }

    if (activeClarificationTarget?.stage === 'micro' && activeClarificationTarget.nodeId === nodeId) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
    }

    const nextSession = updateGuidedStep(nodeId, step => ({
      ...step,
      status: 'answered',
      primaryReasonId: reason.label,
      primaryReasonLabel: reason.label,
      reasonMeta: {
        label: reason.label,
        chipLabel: reason.chipLabel,
        systemInterpretation: reason.systemInterpretation,
        followUpFocus: reason.followUpFocus,
        dimension: reason.dimension,
        ambiguity: reason.ambiguity,
        likelyFollowUp: reason.likelyFollowUp,
        followUpStage: reason.followUpStage
      },
      hardToAnswerChosen: false,
      microQuestion: null,
      microAnswer: null,
      completedAt: Date.now()
    }));

    if (!nextSession) {
      return;
    }

    const step = nextSession.steps.find(entry => entry.nodeId === nodeId);
    if (!step) {
      return;
    }

    updateNodeFeedbackState(nodeId, updateGuidedStepFeedback(step));
    await requestMicroClarification(nextSession, nodeId);
  };

  const handleGuidedExampleSelect = async (nodeId: string, reason: string) => {
    const existingTimeout = guidedNoteProbeTimeoutsRef.current[nodeId];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete guidedNoteProbeTimeoutsRef.current[nodeId];
    }

    if (activeClarificationTarget?.stage === 'micro' && activeClarificationTarget.nodeId === nodeId) {
      dismissPendingQuestion();
      setActiveClarificationTarget(null);
    }

    const nextSession = updateGuidedStep(nodeId, step => ({
      ...step,
      status: 'answered',
      primaryReasonId: reason,
      primaryReasonLabel: reason,
      reasonMeta: {
        ...getFeedbackReasonMeta(reason),
        label: reason
      },
      hardToAnswerChosen: false,
      microQuestion: null,
      microAnswer: null,
      completedAt: Date.now()
    }));

    if (!nextSession) {
      return;
    }

    const step = nextSession.steps.find(entry => entry.nodeId === nodeId);
    if (!step) {
      return;
    }

    updateNodeFeedbackState(nodeId, updateGuidedStepFeedback(step));
    await requestMicroClarification(nextSession, nodeId);
  };

  const handleGuidedNextStep = async () => {
    if (!guidedSession) {
      return;
    }

    const activeStep = guidedSession.steps[guidedSession.currentImageIndex];
    if (!activeStep) {
      return;
    }

    const canAdvance = Boolean(
      activeStep.status === 'unresolved' ||
      (
        activeStep.primaryReasonLabel &&
        (!activeStep.microQuestion || Boolean(activeStep.microAnswer))
      )
    );

    if (!canAdvance) {
      return;
    }

    if (guidedSession.currentImageIndex < guidedSession.steps.length - 1) {
      setGuidedSession({
        ...guidedSession,
        currentImageIndex: guidedSession.currentImageIndex + 1,
        updatedAt: Date.now()
      });
      return;
    }

    const { session: nextSession, brief } = buildBriefForSession(guidedSession);
    setGuidedSession(nextSession);
    setGenerationBrief(brief);
    setViewMode('brief');
    await maybeRequestMacroClarification(nextSession, brief);
  };

  const handleGenerationBriefRouteChange = (index: number, value: string) => {
    setGenerationBrief(prev => {
      if (!prev) {
        return prev;
      }

      const nextRouteCards = prev.routeCards.map((route, routeIndex) =>
        routeIndex === index
          ? {
              ...route,
              editableText: value,
              change: cleanText(value) || route.change
            }
          : route
      );
      const nextBrief = {
        ...prev,
        directionAngles: prev.directionAngles.map((angle, angleIndex) => (
          angleIndex === index ? value : angle
        )),
        routeCards: nextRouteCards
      };

      setGuidedSession(current => (
        current
          ? {
              ...current,
              draftBrief: nextBrief,
              updatedAt: Date.now()
            }
          : current
      ));

      return nextBrief;
    });
  };

  const handleGenerationBriefSimilarityChange = (value: number) => {
    setGenerationBrief(prev => {
      if (!prev) {
        return prev;
      }

      const nextBrief = {
        ...prev,
        similarity: value
      };
      setGuidedSession(current => (
        current
          ? {
              ...current,
              draftBrief: nextBrief,
              updatedAt: Date.now()
            }
          : current
      ));
      return nextBrief;
    });
  };

  const handleGenerateFromBrief = async () => {
    if (!generationBrief || currentGridPosts.length === 0 || pendingQuestion || pendingGoalDraft) {
      return;
    }

    if (currentGridBatchId) {
      setNavigationStack(prev => [...prev, currentGridBatchId]);
    }

    await generatePosts(
      'explore',
      generationBrief.anchorNodeId,
      undefined,
      generationBrief.similarity,
      generationBrief.direction,
      generationBrief.routeCards.map(route => route.editableText),
      currentGridPosts,
      clarificationContext,
      clarificationSummaries,
      guidedSession
    );
  };

  const handleRegenerateFromBrief = async () => {
    if (!generationBrief || currentGridPosts.length === 0 || pendingQuestion || pendingGoalDraft) {
      return;
    }

    if (currentGridBatchId) {
      setNavigationStack(prev => [...prev, currentGridBatchId]);
    }

    await generatePosts(
      'regenerate',
      generationBrief.anchorNodeId ?? currentGridPosts[0]?.id ?? null,
      undefined,
      generationBrief.similarity,
      generationBrief.direction,
      generationBrief.routeCards.map(route => route.editableText),
      currentGridPosts,
      clarificationContext,
      clarificationSummaries,
      guidedSession
    );
  };

  const handleEdit = async (editOptions: EditOptions) => {
    if (!selectedPost) {
      return;
    }

    await generatePosts('edit', selectedPost.id, editOptions);
  };

  const handleSelectedPostFeedbackChange = (feedback: FeedbackData) => {
    if (!selectedPost) {
      return;
    }

    updateNodeFeedbackState(selectedPost.id, feedback);
  };

  const handleGoalDraftApply = async (draft: ClarificationDraftGoalUpdate) => {
    const nextBusinessGoal =
      draft.target === 'business_goal'
        ? {
            title: draft.title,
            description: draft.description
          }
        : liveBusinessGoal;
    const nextPostGoal =
      draft.target === 'post_goal'
        ? {
            title: draft.title,
            description: draft.description,
            whyThisDirectionFits: draft.whyThisDirectionFits ?? livePostGoal.whyThisDirectionFits,
            directionAngles:
              draft.directionAngles?.length ? draft.directionAngles : livePostGoal.directionAngles,
            imageTypeChips:
              draft.imageTypeChips?.length ? draft.imageTypeChips : livePostGoal.imageTypeChips
          }
        : livePostGoal;

    if (draft.target === 'business_goal') {
      setLiveBusinessGoal(nextBusinessGoal);
    } else {
      setLivePostGoal(nextPostGoal);
    }

    onApplyGoalUpdate?.(draft);

    if (pendingGoalDraftCycleId) {
      applyGoalDraft(pendingGoalDraftCycleId, draft);
    }

    setPendingGoalDraft(null);
    setPendingGoalDraftCycleId(null);

    if (guidedSession) {
      const nextDirectionPlan = buildInitialDirectionPlan({
        brandName,
        brandCategory,
        brandIdentity,
        brandNarrative,
        businessGoalTitle: nextBusinessGoal.title,
        folder: {
          title: nextPostGoal.title || 'Post goal',
          description: nextPostGoal.description || 'Create one clear visual direction for this post goal.',
          taxonomyTags: postGoalTaxonomyTags,
          imageTypeChips: nextPostGoal.imageTypeChips,
          directionAngles: nextPostGoal.directionAngles,
          assistantPrompt: [
            nextPostGoal.description,
            nextBusinessGoal.title ? `Support ${nextBusinessGoal.title.toLowerCase()}.` : ''
          ]
            .filter(Boolean)
            .join(' ')
        }
      });
      const { session: nextSession, brief } = buildBriefForSession(
        guidedSession,
        clarificationSummaries,
        undefined,
        {
          fallbackDirection: nextDirectionPlan.brief,
          fallbackAngles: nextDirectionPlan.directionAngles,
          postGoalTitle: nextPostGoal.title
        }
      );
      setGuidedSession(nextSession);
      setGenerationBrief(brief);
    }
  };

  const handleGoalDraftDismiss = () => {
    if (pendingGoalDraftCycleId) {
      dismissGoalDraft(pendingGoalDraftCycleId);
    }

    setPendingGoalDraft(null);
    setPendingGoalDraftCycleId(null);
  };

  const handleBack = () => {
    if (viewMode === 'single') {
      setSelectedPost(null);
      setViewMode(generationBrief ? 'brief' : guidedSession ? 'guided' : 'grid');
      return;
    }

    if (viewMode === 'brief') {
      setViewMode('guided');
      return;
    }

    if (viewMode === 'guided') {
      handleGuidedBackToGrid();
      return;
    }

    if (navigationStack.length > 0) {
      const previousBatchId = navigationStack[navigationStack.length - 1];
      const previousBatchNodes = getBatchNodes(historyNodes, previousBatchId);

      if (previousBatchNodes.length > 0) {
        setCurrentGridPosts(previousBatchNodes);
        setCurrentGridBatchId(previousBatchId);
        setSelectedPost(null);
        resetGuidedState();
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
    resetGuidedState();
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
    resetGuidedState();
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

  useEffect(() => {
    setPostStudioDebugState('clarification:status', {
      currentGridBatchId,
      viewMode,
      isGenerating: resolvedIsGenerating,
      isEvaluating,
      activeClarificationTarget,
      pendingQuestion: pendingQuestion
        ? {
            id: pendingQuestion.id,
            stage: pendingQuestion.stage,
            move: pendingQuestion.move,
            family: pendingQuestion.family,
            title: pendingQuestion.title,
            prompt: pendingQuestion.prompt,
            sourceNodeIds: pendingQuestion.sourceNodeIds
          }
        : null,
      pendingGoalDraft: pendingGoalDraft
        ? {
            cycleId: pendingGoalDraftCycleId,
            target: pendingGoalDraft.target,
            title: pendingGoalDraft.title,
            description: pendingGoalDraft.description
          }
        : null,
      guidedSession: guidedSession
        ? {
            currentImageIndex: guidedSession.currentImageIndex,
            steps: guidedSession.steps.map(step => ({
              nodeId: step.nodeId,
              stance: step.stance,
              status: step.status,
              primaryReasonLabel: step.primaryReasonLabel,
              microQuestionId: step.microQuestion?.id ?? null,
              microSummary: summarizeClarificationAnswer(step.microAnswer)
            })),
            macroQuestion: guidedSession.macroQuestion?.prompt ?? null,
            macroSummary: summarizeClarificationAnswer(guidedSession.macroAnswer)
          }
        : null,
      generationBrief,
      activeInsights: clarificationMemory.activeInsights
        .filter(insight => insight.active)
        .slice(0, 6)
        .map(insight => ({
          id: insight.id,
          move: insight.move,
          scope: insight.scope,
          dimension: insight.dimension,
          summary: insight.summary,
          strength: insight.strength,
          tags: insight.signalTags
        })),
      currentBatchPosts: currentGridPosts.map((post, index) => ({
        id: post.id,
        index,
        directionAngle: post.metadata?.directionAngle ?? null,
        analysisTitle: post.analysis?.title ?? '',
        analysisSummary: post.analysis?.summary ?? '',
        feedbackType: post.feedback?.type ?? null,
        feedbackReasons: post.feedback?.reasons ?? []
      }))
    });
  }, [
    activeClarificationTarget,
    clarificationMemory.activeInsights,
    currentGridBatchId,
    currentGridPosts,
    generationBrief,
    guidedSession,
    resolvedIsGenerating,
    isEvaluating,
    pendingGoalDraft,
    pendingGoalDraftCycleId,
    pendingQuestion,
    viewMode
  ]);

  return {
    viewMode,
    isRailOpen,
    isGenerating: resolvedIsGenerating,
    isEvaluating,
    error,
    history,
    currentGridPosts,
    guidedCoachMessage,
    guidedSession,
    generationBrief,
    selectedPost,
    showHistoryModal,
    generatedImageCount,
    clarificationMemory,
    pendingQuestion,
    pendingGoalDraft,
    liveBusinessGoal,
    livePostGoal,
    setIsRailOpen,
    setShowHistoryModal,
    handleBack,
    handleGridBatchFeedbackChange,
    handleInspectPost,
    handleStartGuidedFeedback,
    handleGuidedBackToGrid,
    handleGuidedPrevStep,
    handleGuidedNextStep,
    handleGuidedReasonSelect,
    handleGuidedCustomNoteChange,
    handleGuidedHardToAnswer,
    handleGuidedExampleSelect,
    handleGuidedKeepUnresolved,
    handleGenerationBriefRouteChange,
    handleGenerationBriefSimilarityChange,
    handleGenerateFromBrief,
    handleRegenerateFromBrief,
    handleEdit,
    handleSelectedPostFeedbackChange,
    handleClarificationSubmit,
    handleClarificationSkip,
    handleGoalDraftApply,
    handleGoalDraftDismiss,
    handleFinalize,
    focusGeneration,
    focusNode
  };
}
