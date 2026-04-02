import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  ClarificationEvaluationSnapshot,
  ClarificationMemory
} from '../../history/types';
import { getFeedbackReasonMeta } from '../feedbackOptions';
import { buildControlsFromTemplates } from './config';
import {
  requestClarificationEvaluation,
  requestClarificationQuestionPlan
} from './api';
import { decideClarificationQuestion } from './engine';
import { buildQuestionFromPlan } from './questionBuilder';
import {
  applyClarificationAnswer,
  attachDraftGoalUpdate,
  buildClarificationContextPayload,
  createEmptyClarificationMemory,
  getActiveClarificationSummaries,
  markGoalUpdateApplied,
  markGoalUpdateDismissed,
  setLatestEvaluation,
  startClarificationCycle
} from './memory';
import type {
  ClarificationDecision,
  ClarificationEvaluationRequestPayload,
  ClarificationPendingRequest,
  ClarificationQuestion,
  ClarificationTriggerContext
} from './types';

function buildFallbackEvaluation(
  decision: ClarificationDecision,
  stage: ClarificationTriggerContext['stage']
): ClarificationEvaluationSnapshot {
  const isAllowedStageMove = (move?: string | null) => {
    if (!move) {
      return false;
    }
    if (stage === 'micro') {
      return move === 'summarize' || move === 'probe' || move === 'clarify';
    }
    return move === 'summarize' || move === 'challenge' || move === 'goal_reframe';
  };

  const move = isAllowedStageMove(decision.question?.move) ? decision.question?.move : undefined;
  const family =
    move === 'goal_reframe'
      ? 'clarify'
      : decision.question?.family && isAllowedStageMove(decision.question.move)
        ? decision.question.family
        : undefined;

  return {
    status: move ? 'armed' : 'idle',
    family,
    move,
    urgency: move ? decision.question?.urgency ?? 'medium' : 'low',
    triggerReason: decision.reason,
    rationale: decision.reason,
    focusDimension: move ? decision.question?.focusDimension : undefined,
    sourceNodeIds: move ? decision.question?.sourceNodeIds ?? [] : [],
    applyTarget:
      move === 'goal_reframe'
        ? decision.question?.applyTarget ?? 'goal_update'
        : decision.question?.applyTarget ?? 'next_generation',
    goalTarget: move === 'goal_reframe' ? decision.question?.goalTarget : undefined,
    source: 'fallback_rules',
    createdAt: Date.now()
  };
}

function buildFeedbackSignals(triggerContext: ClarificationTriggerContext) {
  return triggerContext.posts
    .filter(post => post.feedback?.type)
    .map(post => {
      const storedReasonMeta =
        post.feedback?.reasonMeta?.length
          ? post.feedback.reasonMeta
          : triggerContext.reasonMetaByNodeId?.[post.id] ?? [];
      const reasonMeta = storedReasonMeta.length > 0
        ? storedReasonMeta
        : (post.feedback?.reasons ?? []).map(reason => getFeedbackReasonMeta(reason));

      return {
        nodeId: post.id,
        imageUrl: post.imageUrl,
        feedbackType: post.feedback?.type ?? 'unsure',
        reasons: post.feedback?.reasons ?? [],
        reasonMeta,
        customNote: post.feedback?.customNote ?? '',
        analysisTitle: post.analysis?.title ?? '',
        analysisSummary: post.analysis?.summary ?? '',
        analysisKeywords: post.analysis?.designKeywords ?? post.keywords ?? [],
        directionAngle: post.metadata?.directionAngle ?? null
      };
    });
}

function buildEvaluationPayload(
  triggerContext: ClarificationTriggerContext,
  memory: ClarificationMemory
): ClarificationEvaluationRequestPayload {
  const clarificationContext = buildClarificationContextPayload(memory);
  return {
    stage: triggerContext.stage,
    actionType: triggerContext.actionType,
    currentBatchId: triggerContext.posts[0]?.metadata?.batchId ?? null,
    selectedPostId: triggerContext.selectedPost?.id ?? null,
    primaryNodeId: triggerContext.primaryNodeId ?? triggerContext.selectedPost?.id ?? null,
    selectedReason: triggerContext.selectedReason,
    selectedReasonMeta: triggerContext.selectedReasonMeta,
    guidedSummary: triggerContext.guidedSummary,
    brandNarrative: triggerContext.brandNarrative,
    businessGoalTitle: triggerContext.businessGoalTitle,
    businessGoalDescription: triggerContext.businessGoalDescription,
    postGoalTitle: triggerContext.postGoalTitle,
    postGoalDescription: triggerContext.postGoalDescription,
    postGoalDirectionAngles: triggerContext.postGoalDirectionAngles ?? [],
    feedbackSignals: buildFeedbackSignals(triggerContext),
    activeInsights: clarificationContext.activeInsights,
    recentRecords: clarificationContext.recentRecords,
    recentCycles: clarificationContext.recentCycles ?? []
  };
}

function isEvaluationFresh(evaluation?: ClarificationEvaluationSnapshot | null) {
  if (!evaluation) {
    return false;
  }

  return Date.now() - evaluation.createdAt < 30_000;
}

function isQuestionAllowedForStage(
  question: ClarificationQuestion | null | undefined,
  stage: ClarificationTriggerContext['stage']
) {
  if (!question?.move) {
    return false;
  }

  if (stage === 'micro') {
    return question.move === 'summarize' || question.move === 'probe' || question.move === 'clarify';
  }

  return (
    question.move === 'summarize' ||
    question.move === 'challenge' ||
    question.move === 'goal_reframe'
  );
}

function buildForcedMicroPrompt(
  focusDimension: NonNullable<ClarificationTriggerContext['selectedReasonMeta']>['dimension'],
  move: ClarificationQuestion['move'],
  selectedReason?: string,
  noteText?: string
) {
  const normalizedReason = String(selectedReason ?? '').toLowerCase();
  const normalizedNote = String(noteText ?? '').toLowerCase();

  if (move === 'clarify') {
    return 'Do you mean the direction itself is wrong, or just how this version executed it?';
  }

  if (move === 'summarize') {
    return 'Should I lock this in as the main thing you are reacting to in this image?';
  }

  switch (focusDimension) {
    case 'color':
      if (normalizedNote.includes('background')) {
        return 'You mentioned color in the background. What exactly is off there?';
      }
      if (normalizedNote.includes('text')) {
        return 'You mentioned the text color. What exactly is the issue there?';
      }
      if (normalizedReason.includes('palette') || normalizedReason.includes('color')) {
        return 'You mentioned color. Which color issue do you mean most?';
      }
      return 'You mentioned color. Which part of the color treatment is off?';
    case 'typography':
      return 'You mentioned type or text. What feels off about it?';
    case 'composition':
      return 'You mentioned the composition. What part feels most off?';
    case 'background':
      return 'You mentioned the background. What is the issue there?';
    case 'mood':
      return 'When you describe the feel this way, what visual shift do you mean most?';
    case 'product':
      return 'You are reacting to the product treatment. What should change most there?';
    default:
      return 'What part of this image needs to change most?';
  }
}

function buildForcedMicroQuestion(
  triggerContext: ClarificationTriggerContext
): ClarificationQuestion | null {
  if (triggerContext.stage !== 'micro' || !triggerContext.selectedReason) {
    return null;
  }

  const selectedReasonMeta = triggerContext.selectedReasonMeta;
  if (!selectedReasonMeta || selectedReasonMeta.followUpStage === 'macro') {
    return null;
  }

  const shouldForce =
    selectedReasonMeta.ambiguity === 'high' ||
    selectedReasonMeta.likelyFollowUp === 'probe' ||
    selectedReasonMeta.likelyFollowUp === 'clarify' ||
    selectedReasonMeta.dimension === 'strategy';

  if (!shouldForce) {
    return null;
  }

  const move: ClarificationQuestion['move'] =
    selectedReasonMeta.dimension === 'strategy' || selectedReasonMeta.likelyFollowUp === 'clarify'
      ? 'clarify'
      : selectedReasonMeta.likelyFollowUp === 'summarize'
        ? 'summarize'
        : 'probe';
  const family: ClarificationQuestion['family'] =
    move === 'goal_reframe' ? 'clarify' : move;
  const focusDimension = selectedReasonMeta.dimension ?? 'composition';
  const sourceNodeId = triggerContext.primaryNodeId ?? triggerContext.selectedPost?.id ?? 'current';
  const sourceBatchId = triggerContext.posts[0]?.metadata?.batchId ?? null;
  const selectedPost = triggerContext.selectedPost;
  const noteText = selectedPost?.feedback?.customNote ?? '';

  return {
    id: `forced-${move}:${sourceBatchId ?? 'current'}:${sourceNodeId}`,
    stage: 'micro',
    family,
    move,
    source: 'fallback_rules',
    urgency: selectedReasonMeta.ambiguity === 'high' ? 'high' : 'medium',
    presentation: 'anchored-sheet',
    triggerReason:
      move === 'clarify' ? 'strategy-scope-check' : move === 'summarize' ? 'check-the-read' : 'image-level-ambiguity',
    title:
      move === 'clarify'
        ? 'Clarify the scope'
        : move === 'summarize'
          ? 'Check the read'
          : 'Pin this down',
    subtitle: 'Image-specific follow-up',
    prompt: buildForcedMicroPrompt(
      focusDimension,
      move,
      triggerContext.selectedReason,
      noteText
    ),
    sourceBatchId,
    sourceNodeIds: [sourceNodeId],
    focusDimension,
    originalFeedback: triggerContext.selectedReason,
    evidenceImages: selectedPost?.imageUrl
      ? [{
          id: selectedPost.id,
          imageUrl: selectedPost.imageUrl,
          label: 'Current image',
          description: selectedPost.analysis?.title || selectedPost.analysis?.summary
        }]
      : [],
    controls: buildControlsFromTemplates(
      move === 'clarify'
        ? ['clarify-interpretation', 'clarify-scope', 'note']
        : move === 'summarize'
          ? ['summary-confirm', 'note']
          : ['probe'],
      family,
      focusDimension
    ),
    applyTarget: 'next_generation'
  };
}

export function useDynamicClarification() {
  const [memory, setMemory] = useState<ClarificationMemory>(createEmptyClarificationMemory());
  const [pendingQuestion, setPendingQuestion] = useState<ClarificationQuestion | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ClarificationPendingRequest | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const evaluateRunIdRef = useRef(0);

  const hydrateMemory = useCallback((
    nextMemory?: ClarificationMemory | null,
    nextPendingQuestion?: ClarificationQuestion | null,
    nextPendingRequest?: ClarificationPendingRequest | null
  ) => {
    setMemory(nextMemory ?? createEmptyClarificationMemory());
    setPendingQuestion(nextPendingQuestion ?? null);
    setPendingRequest(nextPendingRequest ?? null);
  }, []);

  const evaluateClarification = useCallback(async (
    triggerContext: ClarificationTriggerContext
  ) => {
    const runId = ++evaluateRunIdRef.current;
    const payload = buildEvaluationPayload(triggerContext, memory);
    setIsEvaluating(true);

    try {
      const evaluation = await requestClarificationEvaluation(payload);
      if (evaluateRunIdRef.current !== runId) {
        return evaluation;
      }

      setMemory(prev => setLatestEvaluation(prev, evaluation));
      return evaluation;
    } catch {
      const fallbackDecision = decideClarificationQuestion({
        ...triggerContext,
        memory
      });
      const fallbackEvaluation = fallbackDecision.evaluation ?? buildFallbackEvaluation(
        fallbackDecision,
        triggerContext.stage
      );
      if (evaluateRunIdRef.current === runId) {
        setMemory(prev => setLatestEvaluation(prev, fallbackEvaluation));
      }
      return fallbackEvaluation;
    } finally {
      if (evaluateRunIdRef.current === runId) {
        setIsEvaluating(false);
      }
    }
  }, [memory]);

  const requestClarification = useCallback(async (
    triggerContext: ClarificationTriggerContext,
    request: ClarificationPendingRequest
  ): Promise<ClarificationDecision> => {
    const payload = buildEvaluationPayload(triggerContext, memory);
    const fallbackDecision = decideClarificationQuestion({
      ...triggerContext,
      memory
    });
    const forcedMicroQuestion = buildForcedMicroQuestion(triggerContext);
    let evaluation: ClarificationEvaluationSnapshot | null = null;

    try {
      evaluation = await requestClarificationEvaluation(payload);
      setMemory(prev => setLatestEvaluation(prev, evaluation));
    } catch {
      evaluation = fallbackDecision.evaluation ?? buildFallbackEvaluation(fallbackDecision, triggerContext.stage);
      setMemory(prev => setLatestEvaluation(prev, evaluation));
    }

    const fallbackQuestion = isQuestionAllowedForStage(fallbackDecision.question, triggerContext.stage)
      ? fallbackDecision.question
      : null;
    let question = fallbackQuestion;

    if (evaluation.status !== 'idle' && evaluation.move) {
      try {
        const plan = await requestClarificationQuestionPlan({
          evaluation,
          ...payload
        });
        const nextQuestion = buildQuestionFromPlan(plan, triggerContext);
        question = isQuestionAllowedForStage(nextQuestion, triggerContext.stage) ? nextQuestion : null;
      } catch {
        question = fallbackQuestion;
      }
    }

    if (
      !question &&
      forcedMicroQuestion &&
      isQuestionAllowedForStage(forcedMicroQuestion, triggerContext.stage)
    ) {
      question = forcedMicroQuestion;
    }

    if (!question) {
      return {
        ...fallbackDecision,
        evaluation
      };
    }

    setMemory(prev => startClarificationCycle(prev, question));
    setPendingQuestion(question);
    setPendingRequest(request);

    return {
      question,
      reason: question.triggerReason ?? fallbackDecision.reason,
      diagnostics: fallbackDecision.diagnostics,
      evaluation
    };
  }, [memory]);

  const presentQuestion = useCallback((
    question: ClarificationQuestion,
    request: ClarificationPendingRequest,
    evaluation?: ClarificationEvaluationSnapshot | null
  ) => {
    setMemory(prev => startClarificationCycle(
      evaluation ? setLatestEvaluation(prev, evaluation) : prev,
      question
    ));
    setPendingQuestion(question);
    setPendingRequest(request);
  }, []);

  const dismissPendingQuestion = useCallback(() => {
    setPendingQuestion(null);
    setPendingRequest(null);
  }, []);

  const clearPrefetchedClarification = useCallback(() => {
  }, []);

  const submitAnswer = useCallback((answer: Parameters<typeof applyClarificationAnswer>[2]) => {
    if (!pendingQuestion) {
      return {
        pendingRequest: null,
        clarificationContext: buildClarificationContextPayload(memory),
        clarificationSummaries: getActiveClarificationSummaries(memory),
        updatedMemory: memory,
        cycle: null
      };
    }

    const next = applyClarificationAnswer(memory, pendingQuestion, answer);
    setMemory(next.memory);
    setPendingQuestion(null);
    const nextRequest = pendingRequest;
    setPendingRequest(null);

    return {
      pendingRequest: nextRequest,
      clarificationContext: buildClarificationContextPayload(next.memory),
      clarificationSummaries: getActiveClarificationSummaries(next.memory),
      updatedMemory: next.memory,
      cycle: next.cycle
    };
  }, [memory, pendingQuestion, pendingRequest]);

  const skipQuestion = useCallback(() => {
    if (!pendingQuestion) {
      return {
        pendingRequest: null,
        clarificationContext: buildClarificationContextPayload(memory),
        clarificationSummaries: getActiveClarificationSummaries(memory),
        updatedMemory: memory,
        cycle: null
      };
    }

    return submitAnswer({
      questionId: pendingQuestion.id,
      family: pendingQuestion.family,
      move: pendingQuestion.move,
      values: {},
      skipped: true,
      answeredAt: Date.now()
    });
  }, [memory, pendingQuestion, submitAnswer]);

  const computedClarificationContext = useMemo(
    () => buildClarificationContextPayload(memory),
    [memory]
  );
  const computedClarificationSummaries = useMemo(
    () => getActiveClarificationSummaries(memory),
    [memory]
  );

  return {
    memory,
    pendingQuestion,
    pendingRequest,
    isEvaluating,
    hydrateMemory,
    evaluateClarification,
    requestClarification,
    presentQuestion,
    dismissPendingQuestion,
    clearPrefetchedClarification,
    submitAnswer,
    skipQuestion,
    attachGoalDraft: (cycleId: string, draft: Parameters<typeof attachDraftGoalUpdate>[2]) =>
      setMemory(prev => attachDraftGoalUpdate(prev, cycleId, draft)),
    applyGoalDraft: (cycleId: string, draft?: Parameters<typeof markGoalUpdateApplied>[2]) =>
      setMemory(prev => markGoalUpdateApplied(prev, cycleId, draft)),
    dismissGoalDraft: (cycleId: string) =>
      setMemory(prev => markGoalUpdateDismissed(prev, cycleId)),
    clarificationContext: computedClarificationContext,
    clarificationSummaries: computedClarificationSummaries
  };
}
