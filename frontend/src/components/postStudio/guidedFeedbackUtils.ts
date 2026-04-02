import type { ClarificationAnswer, ClarificationQuestion } from './clarification/types';
import type { FeedbackData, FeedbackType, PostNode } from '../history/types';
import type {
  GenerationBrief,
  GenerationPlanRouteCard,
  GuidedFeedbackAnchor,
  GuidedFeedbackSession,
  GuidedImageStep,
  PreferenceSignal
} from '../../types/postStudio';
import { formatDisplayLabel, getBatchBiasSuggestions, getFeedbackReasonOptions } from './analysisUtils';
import { getFeedbackReasonMeta } from './feedbackOptions';
import { buildIterativeDirectionAngles } from './utils';

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueTexts(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function joinHuman(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? '';
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function shortenSentence(input: string, maxLength = 144) {
  const cleaned = cleanText(input);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function titleCaseWords(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferRouteTitle(text: string, index: number) {
  const normalized = cleanText(text).toLowerCase();
  const titleMap: Array<[RegExp, string]> = [
    [/(premium|restrained|editorial|calm)/, 'Refined Editorial'],
    [/(energy|bold|social|native|lively)/, 'Social Energy'],
    [/(product|hero|detail|ingredient|texture)/, 'Product Focus'],
    [/(layout|hierarchy|composition|focal)/, 'Composition Study'],
    [/(palette|color|dark|bright|tone)/, 'Palette Route']
  ];

  const match = titleMap.find(([pattern]) => pattern.test(normalized));
  if (match) {
    return match[1];
  }

  const words = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3);

  return words.length ? titleCaseWords(words.join(' ')) : `Route ${index + 1}`;
}

function inferRouteChange(text: string) {
  return shortenSentence(
    cleanText(text)
      .replace(/^create a visibly different route using\s*/i, '')
      .replace(/^explore a variation that pushes\s*/i, '')
      .replace(/^refine this direction while\s*/i, '')
      .replace(/^use one post to\s*/i, ''),
    120
  );
}

function summarizeAnswerValue(value: string | string[] | number | undefined) {
  if (Array.isArray(value)) {
    return uniqueTexts(value).join(', ');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return cleanText(value);
}

export function summarizeClarificationAnswer(answer?: ClarificationAnswer | null) {
  if (!answer || answer.skipped) {
    return '';
  }

  const values = Object.values(answer.values)
    .map(value => summarizeAnswerValue(value))
    .filter(Boolean);

  return uniqueTexts(values).slice(0, 2).join(' · ');
}

export function feedbackTypeToGuidedStance(
  type: FeedbackType
): GuidedImageStep['stance'] | null {
  if (type === 'yes') {
    return 'like';
  }
  if (type === 'no') {
    return 'dislike';
  }
  if (type === 'unsure') {
    return 'unsure';
  }
  return null;
}

export function guidedStanceToFeedbackType(
  stance: GuidedImageStep['stance']
): Exclude<FeedbackType, null> {
  if (stance === 'like') {
    return 'yes';
  }
  if (stance === 'dislike') {
    return 'no';
  }
  return 'unsure';
}

export function getGuidedPrompt(stance: GuidedImageStep['stance']) {
  if (stance === 'like') {
    return 'What is working here?';
  }
  if (stance === 'dislike') {
    return 'What feels most off?';
  }
  return 'What would make this stronger?';
}

export function areAllPostsTriaged(posts: PostNode[]) {
  return posts.length > 0 && posts.every(post => Boolean(post.feedback?.type));
}

export function buildGridCoachMessage(posts: PostNode[]) {
  const triagedCount = posts.filter(post => post.feedback?.type).length;
  if (triagedCount === 0) {
    return 'Start with quick reactions only: Like, Dislike, or Unsure.';
  }
  if (triagedCount < posts.length) {
    return `${posts.length - triagedCount} more quick reactions, then I’ll guide the critique one image at a time.`;
  }
  return 'The quick sort is done. Next I’ll help unpack what each reaction means.';
}

export function buildGuidedFeedbackSession(
  posts: PostNode[],
  sourceBatchId: string | null
): GuidedFeedbackSession {
  const createdAt = Date.now();
  return {
    sourceBatchId,
    imageOrder: posts.map(post => post.id),
    currentImageIndex: 0,
    steps: posts.map(post => ({
      nodeId: post.id,
      stance: feedbackTypeToGuidedStance(post.feedback?.type) ?? 'unsure',
      prompt: getGuidedPrompt(feedbackTypeToGuidedStance(post.feedback?.type) ?? 'unsure'),
      status: 'pending',
      primaryReasonId: post.feedback?.reasons?.[0],
      primaryReasonLabel: post.feedback?.reasons?.[0],
      reasonMeta:
        post.feedback?.reasonMeta?.[0] ??
        (post.feedback?.reasons?.[0] ? getFeedbackReasonMeta(post.feedback.reasons[0]) : undefined),
      customNote: post.feedback?.customNote ?? '',
      hardToAnswerChosen: false,
      exampleReasonOptions: [],
      microQuestion: null,
      microAnswer: null,
      completedAt: null
    })),
    macroQuestion: null,
    macroAnswer: null,
    synthesizedPreferences: [],
    draftBrief: null,
    createdAt,
    updatedAt: createdAt
  };
}

export function buildExampleReasonOptions(
  post: PostNode,
  stance: GuidedImageStep['stance'],
  postGoalTitle?: string
) {
  const feedbackType = guidedStanceToFeedbackType(stance);
  const feedbackOptions = getFeedbackReasonOptions(post, feedbackType)
    .map(formatDisplayLabel)
    .slice(0, 2);
  const siblingDifference = post.analysis?.differencesFromSiblings?.[0]
    ? shortenSentence(post.analysis.differencesFromSiblings[0], 72)
    : '';
  const keywordSeed = uniqueTexts(post.analysis?.designKeywords ?? post.keywords ?? [])
    .slice(0, 2)
    .map(keyword => `It may be more about the ${keyword.toLowerCase()} direction`);
  const angleSeed = post.metadata?.directionAngle
    ? [`It may be the ${formatDisplayLabel(post.metadata.directionAngle).toLowerCase()} route, not the execution`]
    : [];
  const goalSeed = postGoalTitle
    ? [`It may need to support ${postGoalTitle.toLowerCase()} more directly`]
    : [];

  return uniqueTexts([
    ...feedbackOptions,
    siblingDifference ? `It may be about ${siblingDifference.charAt(0).toLowerCase()}${siblingDifference.slice(1)}` : '',
    ...keywordSeed,
    ...angleSeed,
    ...goalSeed
  ]).slice(0, 4);
}

function normalizeSignalLabel(label: string) {
  return shortenSentence(formatDisplayLabel(label), 92);
}

function buildAnswerSignalKind(step: GuidedImageStep): PreferenceSignal['kind'] {
  if (step.stance === 'like') {
    return 'keep';
  }
  if (step.stance === 'dislike') {
    return 'avoid';
  }
  return 'tradeoff';
}

function buildSignalFromStep(step: GuidedImageStep): PreferenceSignal[] {
  const signals: PreferenceSignal[] = [];

  if (step.primaryReasonLabel) {
    signals.push({
      id: `reason:${step.nodeId}`,
      kind: buildAnswerSignalKind(step),
      label: normalizeSignalLabel(step.primaryReasonLabel),
      sourceNodeIds: [step.nodeId],
      dimension: step.reasonMeta?.dimension,
      confidence: step.stance === 'unsure' ? 0.58 : 0.82,
      source: 'reason'
    });
  }

  const microSummary = summarizeClarificationAnswer(step.microAnswer);
  if (microSummary) {
    signals.push({
      id: `micro:${step.nodeId}`,
      kind: buildAnswerSignalKind(step),
      label: normalizeSignalLabel(microSummary),
      sourceNodeIds: [step.nodeId],
      dimension: step.reasonMeta?.dimension,
      confidence: step.stance === 'unsure' ? 0.52 : 0.74,
      source: 'micro'
    });
  }

  if (step.status === 'unresolved') {
    signals.push({
      id: `unresolved:${step.nodeId}`,
      kind: step.stance === 'unsure' ? 'open_question' : 'tradeoff',
      label: normalizeSignalLabel(
        step.exampleReasonOptions?.[0]
          ? `Still unresolved: ${step.exampleReasonOptions[0]}`
          : step.stance === 'like'
            ? 'Still unresolved: what exactly is working'
            : step.stance === 'dislike'
              ? 'Still unresolved: what exactly feels off'
              : 'Still unresolved: what would make this stronger'
      ),
      sourceNodeIds: [step.nodeId],
      dimension: step.reasonMeta?.dimension,
      confidence: 0.35,
      source: 'reason'
    });
  }

  return signals;
}

export function buildGuidedSummary(session: GuidedFeedbackSession) {
  const likedNodeIds: string[] = [];
  const dislikedNodeIds: string[] = [];
  const unsureNodeIds: string[] = [];
  const keepSignals: string[] = [];
  const avoidSignals: string[] = [];
  const unresolvedSignals: string[] = [];

  session.steps.forEach(step => {
    if (step.stance === 'like') {
      likedNodeIds.push(step.nodeId);
    } else if (step.stance === 'dislike') {
      dislikedNodeIds.push(step.nodeId);
    } else {
      unsureNodeIds.push(step.nodeId);
    }

    if (step.stance === 'like' && step.primaryReasonLabel) {
      keepSignals.push(step.primaryReasonLabel);
    }
    if (step.stance === 'dislike' && step.primaryReasonLabel) {
      avoidSignals.push(step.primaryReasonLabel);
    }
    if (step.status === 'unresolved') {
      if (step.primaryReasonLabel) {
        unresolvedSignals.push(step.primaryReasonLabel);
      } else if (step.exampleReasonOptions?.[0]) {
        unresolvedSignals.push(step.exampleReasonOptions[0]);
      }
    } else if (step.reasonMeta?.followUpStage === 'macro' && step.primaryReasonLabel) {
      unresolvedSignals.push(step.primaryReasonLabel);
    }
  });

  return {
    likedNodeIds,
    dislikedNodeIds,
    unsureNodeIds,
    keepSignals: uniqueTexts(keepSignals),
    avoidSignals: uniqueTexts(avoidSignals),
    unresolvedSignals: uniqueTexts(unresolvedSignals)
  };
}

export function synthesizePreferenceSignals(
  session: GuidedFeedbackSession,
  posts: PostNode[],
  clarificationSummaries: string[] = []
) {
  const rawSignals = session.steps.flatMap(buildSignalFromStep);
  const memorySignals = clarificationSummaries.slice(0, 2).map((summary, index) => ({
    id: `memory:${index}`,
    kind: /\bavoid|not\b/i.test(summary) ? 'avoid' : 'keep',
    label: normalizeSignalLabel(summary),
    sourceNodeIds: [],
    confidence: 0.62,
    source: 'memory' as const
  }));
  const macroSummary = summarizeClarificationAnswer(session.macroAnswer);
  const macroSignals = macroSummary
    ? [{
        id: 'macro:0',
        kind: session.macroQuestion?.move === 'challenge' || session.macroQuestion?.move === 'goal_reframe'
          ? 'tradeoff'
          : 'keep',
        label: normalizeSignalLabel(macroSummary),
        sourceNodeIds: session.macroQuestion?.sourceNodeIds ?? posts.map(post => post.id),
        confidence: 0.72,
        source: 'macro' as const
      }]
    : [];

  const deduped = new Map<string, PreferenceSignal>();
  [...rawSignals, ...memorySignals, ...macroSignals].forEach(signal => {
    const key = `${signal.kind}:${signal.label.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, signal);
    }
  });

  return Array.from(deduped.values());
}

function pickAnchor(
  posts: PostNode[],
  session: GuidedFeedbackSession
): GuidedFeedbackAnchor {
  const postIndex = new Map(posts.map(post => [post.id, post]));
  const preferredStep =
    session.steps.find(step => step.stance === 'like' && step.status === 'answered') ??
    session.steps.find(step => step.stance === 'like') ??
    session.steps[0] ??
    null;
  const anchorPost = preferredStep ? postIndex.get(preferredStep.nodeId) ?? null : posts[0] ?? null;

  return {
    nodeId: anchorPost?.id ?? null,
    imageUrl: anchorPost?.imageUrl ?? null,
    title: formatDisplayLabel(
      anchorPost?.analysis?.title ||
      anchorPost?.metadata?.directionAngle ||
      anchorPost?.analysis?.summary ||
      'Current anchor'
    ),
    directionAngle: anchorPost?.metadata?.directionAngle ?? null
  };
}

function buildSystemSummary(
  keep: string[],
  avoid: string[],
  openTradeoff: string | undefined
) {
  const parts: string[] = [];
  if (keep.length) {
    parts.push(`You’re leaning toward ${joinHuman(keep.slice(0, 3)).toLowerCase()}`);
  }
  if (avoid.length) {
    parts.push(`pulling away from ${joinHuman(avoid.slice(0, 3)).toLowerCase()}`);
  }
  if (openTradeoff) {
    parts.push(`and the main open tradeoff is ${openTradeoff.toLowerCase()}`);
  }

  if (parts.length === 0) {
    return 'Your reactions are still loose, so the next round should explore without overcommitting.';
  }

  return `${parts.join(', ')}.`;
}

function buildDirectionSummary(
  keep: string[],
  avoid: string[],
  nextExploration: string[],
  openTradeoff: string | undefined,
  postGoalTitle?: string
) {
  return [
    postGoalTitle ? `Keep this aligned to ${postGoalTitle.toLowerCase()}.` : '',
    keep.length ? `Keep ${joinHuman(keep.slice(0, 4)).toLowerCase()}.` : '',
    avoid.length ? `Avoid ${joinHuman(avoid.slice(0, 4)).toLowerCase()}.` : '',
    openTradeoff ? `Treat this as an open tradeoff: ${openTradeoff.toLowerCase()}.` : '',
    nextExploration.length ? `Next exploration: ${joinHuman(nextExploration.slice(0, 3)).toLowerCase()}.` : ''
  ].filter(Boolean).join(' ');
}

function buildRouteCards(
  angles: string[],
  keep: string[],
  avoid: string[],
  openTradeoff: string | undefined
): GenerationPlanRouteCard[] {
  const rationaleSeed = [
    keep.length ? `Keep ${joinHuman(keep.slice(0, 2)).toLowerCase()}` : '',
    avoid.length ? `avoid ${joinHuman(avoid.slice(0, 2)).toLowerCase()}` : '',
    openTradeoff ? `resolve ${openTradeoff.toLowerCase()}` : ''
  ].filter(Boolean).join(' while ');

  return angles.map((angle, index) => ({
    id: `brief-route-${index}`,
    title: inferRouteTitle(angle, index),
    change: inferRouteChange(angle),
    rationale: shortenSentence(rationaleSeed || 'Carry the strongest preference signals into the next route.', 110),
    editableText: angle
  }));
}

export function buildGenerationBrief({
  posts,
  session,
  clarificationSummaries = [],
  fallbackDirection,
  fallbackAngles,
  postGoalTitle,
  similarity = 50
}: {
  posts: PostNode[];
  session: GuidedFeedbackSession;
  clarificationSummaries?: string[];
  fallbackDirection: string;
  fallbackAngles: string[];
  postGoalTitle?: string;
  similarity?: number;
}): GenerationBrief {
  const signals = synthesizePreferenceSignals(session, posts, clarificationSummaries);
  const keep = uniqueTexts(
    signals.filter(signal => signal.kind === 'keep').map(signal => signal.label)
  ).slice(0, 4);
  const avoid = uniqueTexts(
    signals.filter(signal => signal.kind === 'avoid').map(signal => signal.label)
  ).slice(0, 4);
  const openTradeoff = uniqueTexts(
    signals
      .filter(signal => signal.kind === 'tradeoff' || signal.kind === 'open_question')
      .map(signal => signal.label)
  )[0];
  const nextExploration = uniqueTexts([
    ...getBatchBiasSuggestions(posts),
    ...signals
      .filter(signal => signal.kind === 'tradeoff' || signal.kind === 'open_question')
      .map(signal => signal.label)
  ]).slice(0, 4);
  const anchor = pickAnchor(posts, session);
  const anchorPost = posts.find(post => post.id === anchor.nodeId) ?? posts[0] ?? null;
  const systemSummary = buildSystemSummary(keep, avoid, openTradeoff);
  const direction = buildDirectionSummary(
    keep,
    avoid,
    nextExploration,
    openTradeoff,
    postGoalTitle
  ) || fallbackDirection;
  const directionAngles = buildIterativeDirectionAngles({
    posts,
    parentNode: anchorPost,
    direction,
    fallbackAngles
  });

  return {
    sourceBatchId: session.sourceBatchId,
    anchorNodeId: anchor.nodeId,
    anchor,
    keep,
    avoid,
    openTradeoff,
    nextExploration,
    systemSummary,
    direction,
    directionAngles,
    routeCards: buildRouteCards(directionAngles, keep, avoid, openTradeoff),
    similarity,
    createdAt: Date.now()
  };
}

export function buildGuidedImageFeedback(
  posts: PostNode[],
  session: GuidedFeedbackSession
) {
  const stepsById = new Map(session.steps.map(step => [step.nodeId, step]));
  return posts
    .map(post => {
      const step = stepsById.get(post.id);
      if (!step) {
        return null;
      }

      return {
        image_id: post.id,
        feedback_type: step.stance,
        primary_reason: step.primaryReasonLabel,
        custom_note: cleanText(step.customNote),
        step_status: step.status === 'unresolved' ? 'unresolved' : 'answered',
        micro_summary: summarizeClarificationAnswer(step.microAnswer) || undefined,
        direction_angle: post.metadata?.directionAngle ?? undefined,
        image_summary: post.analysis?.summary ?? post.analysis?.title ?? undefined
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export function updateGuidedStepFeedback(step: GuidedImageStep): FeedbackData {
  const reason = cleanText(step.primaryReasonLabel);
  return {
    type: guidedStanceToFeedbackType(step.stance),
    reasons: reason ? [reason] : [],
    customNote: cleanText(step.customNote),
    reasonMeta: step.reasonMeta && reason
      ? [{
          label: reason,
          chipLabel: step.reasonMeta.chipLabel,
          systemInterpretation: step.reasonMeta.systemInterpretation,
          followUpFocus: step.reasonMeta.followUpFocus,
          dimension: step.reasonMeta.dimension,
          ambiguity: step.reasonMeta.ambiguity,
          likelyFollowUp: step.reasonMeta.likelyFollowUp,
          followUpStage: step.reasonMeta.followUpStage
        }]
      : []
  };
}

export function shouldAskMicroClarification(
  step: GuidedImageStep,
  question: ClarificationQuestion | null
) {
  if (step.reasonMeta?.followUpStage === 'macro') {
    return false;
  }

  if (!question) {
    return false;
  }

  if (step.reasonMeta?.ambiguity === 'high') {
    return true;
  }

  if (step.reasonMeta?.dimension === 'strategy') {
    return true;
  }

  return question.move === 'probe' || question.move === 'clarify' || question.move === 'summarize';
}
