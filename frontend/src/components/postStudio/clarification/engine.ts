import type { ClarificationMemory, ClarificationMove, PostNode } from '../../history/types';
import {
  CHALLENGE_RESPONSE_CONTROL,
  CLARIFY_INTERPRETATION_CONTROL,
  CLARIFY_SCOPE_CONTROL,
  GOAL_REFRAME_CONTROL,
  SUMMARIZE_CONFIRM_CONTROL,
  createProbeControlsForDimension
} from './config';
import type {
  ClarificationAlignmentAssessment,
  ClarificationDecision,
  ClarificationDiagnostics,
  ClarificationDimension,
  ClarificationEvidenceImage,
  ClarificationGoalProfile,
  ClarificationOption,
  ClarificationQuestion,
  ClarificationSignal,
  ClarificationTriggerContext
} from './types';

const DIMENSION_KEYWORDS: Record<ClarificationDimension, string[]> = {
  color: ['color', 'palette', 'tone', 'blue', 'bright', 'dark', 'warm', 'cool', 'contrast'],
  background: ['background', 'backdrop', 'setting', 'environment', 'urban', 'city', 'neon', 'scene'],
  typography: ['font', 'text', 'type', 'typography', 'headline', 'copy', 'lettering'],
  composition: ['composition', 'layout', 'crop', 'framing', 'close', 'busy', 'focal', 'placement'],
  product: ['product', 'bottle', 'packaging', 'ingredient', 'texture', 'hero'],
  lighting: ['light', 'lighting', 'shadow', 'glow', 'mood lighting'],
  mood: ['premium', 'calm', 'energetic', 'synthetic', 'natural', 'warm', 'credible', 'restrained'],
  strategy: ['direction', 'strategy', 'off-brand', 'commercial', 'sale', 'audience', 'goal'],
  execution: ['execution', 'version', 'render', 'this one'],
  other: []
};

const SIGNAL_TAG_KEYWORDS: Record<string, string[]> = {
  bright: ['bright', 'vibrant', 'energetic', 'pop'],
  dark: ['dark', 'deeper', 'restrained', 'credible'],
  clean: ['clean', 'minimal', 'simple', 'refined'],
  busy: ['busy', 'cluttered', 'too much'],
  premium: ['premium', 'luxury', 'editorial'],
  promotional: ['commercial', 'discount', 'sale', 'promotional'],
  natural: ['natural', 'organic', 'real', 'grounded'],
  synthetic: ['synthetic', 'ai', 'fake', 'neon'],
  warm: ['warm', 'soft', 'gentle'],
  cool: ['cool', 'fresh', 'crisp'],
  readable: ['readable', 'clear text', 'text-ready'],
  'text-heavy': ['hard to add text', 'text feels off', 'font'],
  hero: ['hero', 'spotlight', 'showcase', 'launch', 'first impression', 'product hero'],
  lifestyle: ['lifestyle', 'in-use', 'moment', 'daily routine', 'real-life'],
  detail: ['detail', 'close-up', 'macro', 'texture'],
  ingredient: ['ingredient', 'formula', 'botanical', 'extract'],
  credibility: ['credible', 'science-backed', 'clinical', 'trust', 'reliable'],
  awareness: ['launch', 'introduce', 'awareness', 'spotlight'],
  urban: ['urban', 'city', 'street', 'neon'],
  calm: ['calm', 'gentle', 'soft', 'restrained']
};

const TAG_OPPOSITES: Record<string, string[]> = {
  bright: ['dark', 'restrained'],
  dark: ['bright', 'energetic'],
  clean: ['busy'],
  busy: ['clean', 'minimal'],
  premium: ['promotional'],
  promotional: ['premium', 'restrained'],
  natural: ['synthetic'],
  synthetic: ['natural'],
  warm: ['cool'],
  cool: ['warm'],
  hero: ['lifestyle'],
  lifestyle: ['hero'],
  urban: ['natural', 'calm']
};

const STRATEGY_TERMS = [
  'wrong direction',
  "doesn't feel like us",
  'too commercial',
  'off-brand',
  'not our audience',
  'not this direction',
  'strategy'
];

const VAGUE_TERMS = [
  'premium',
  'different',
  'cleaner',
  'better',
  'color',
  'font',
  'text',
  'something',
  'off',
  'style',
  'vibe'
];

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value: string) {
  return cleanText(value).toLowerCase();
}

function findDimensions(text: string): ClarificationDimension[] {
  const normalized = lower(text);
  const matches = Object.entries(DIMENSION_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)))
    .map(([dimension]) => dimension as ClarificationDimension);

  return matches.length > 0 ? matches : ['other'];
}

function findSignalTags(text: string): string[] {
  const normalized = lower(text);
  return Object.entries(SIGNAL_TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)))
    .map(([tag]) => tag);
}

function feedbackIntensity(type: ClarificationSignal['feedbackType']) {
  if (type === 'no') {
    return 80;
  }

  if (type === 'unsure') {
    return 58;
  }

  if (type === 'yes') {
    return 65;
  }

  return 40;
}

function collectSignals(posts: PostNode[]): ClarificationSignal[] {
  return posts
    .filter(post => post.feedback?.type)
    .map(post => {
      const feedback = post.feedback!;
      const texts = [...feedback.reasons];
      if (feedback.customNote) {
        texts.push(feedback.customNote);
      }

      const analysisKeywords = post.analysis?.designKeywords ?? [];
      const analysisTexts = [
        post.analysis?.title ?? '',
        post.analysis?.summary ?? '',
        post.analysis?.supportsGoal ?? '',
        ...analysisKeywords
      ].filter(Boolean);
      const shouldIncludePlannedAngle = Boolean(post.metadata?.seededFromPreview) || analysisTexts.length === 0;
      const contextTexts = [
        ...texts,
        ...(shouldIncludePlannedAngle ? [post.metadata?.directionAngle ?? ''] : []),
        ...analysisTexts
      ].filter(Boolean);
      const combinedText = contextTexts.join(' | ');

      return {
        nodeId: post.id,
        batchId: post.metadata?.batchId ?? null,
        feedbackType: feedback.type,
        texts,
        combinedText,
        dimensions: findDimensions(combinedText),
        tags: findSignalTags(combinedText),
        intensity: feedbackIntensity(feedback.type),
        directionAngle: post.metadata?.directionAngle ?? null,
        analysisKeywords,
        sourcePost: post
      };
    });
}

function buildEvidenceImages(
  posts: PostNode[],
  nodeIds: string[],
  labelPrefix = 'Current image',
  historyNodes?: Map<string, PostNode>
): ClarificationEvidenceImage[] {
  return nodeIds
    .map(nodeId => posts.find(post => post.id === nodeId) ?? historyNodes?.get(nodeId))
    .filter((post): post is PostNode => Boolean(post))
    .slice(0, 3)
    .map((post, index) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      label: index === 0 ? labelPrefix : `${labelPrefix} ${index + 1}`,
      description: post.analysis?.title || post.analysis?.summary
    }));
}

function createQuestionId(move: ClarificationMove, nodeId?: string, sourceBatchId?: string | null) {
  return [move, sourceBatchId ?? 'batch', nodeId ?? 'current'].join(':');
}

function uniqueTopTags(signals: ClarificationSignal[], type: ClarificationSignal['feedbackType']) {
  const counts = new Map<string, number>();

  signals
    .filter(signal => signal.feedbackType === type)
    .forEach(signal => {
      signal.tags.forEach(tag => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 1)
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag)
    .slice(0, 4);
}

function buildGoalProfile(context: ClarificationTriggerContext): ClarificationGoalProfile {
  const sourceTexts = [
    context.brandNarrative,
    context.businessGoalTitle,
    context.businessGoalDescription,
    context.postGoalTitle,
    context.postGoalDescription,
    ...(context.postGoalDirectionAngles ?? []),
    context.direction
  ]
    .map(cleanText)
    .filter(Boolean);
  const joined = sourceTexts.join(' | ');
  const tags = Array.from(new Set(findSignalTags(joined)));
  const dimensions = Array.from(new Set(sourceTexts.flatMap(text => findDimensions(text))));
  const summaryParts = [context.postGoalTitle, context.businessGoalTitle].map(cleanText).filter(Boolean);

  return {
    sourceTexts,
    tags,
    dimensions,
    summary: summaryParts.join(' -> ') || 'Current goal'
  };
}

function buildAlignmentAssessment(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  goalProfile: ClarificationGoalProfile
): ClarificationAlignmentAssessment {
  const positiveTags = uniqueTopTags(signals, 'yes');
  const avoidedTags = uniqueTopTags(signals, 'no');
  const insightTags = Array.from(
    new Set(
      context.memory.activeInsights
        .filter(insight => insight.active)
        .flatMap(insight => insight.signalTags ?? [])
    )
  );
  const preferredTags = Array.from(new Set([...positiveTags, ...insightTags])).slice(0, 6);
  const goalTags = goalProfile.tags;
  const matchingTags = preferredTags.filter(tag => goalTags.includes(tag));
  const driftingTags = preferredTags.filter(tag => !goalTags.includes(tag));
  const opposingGoalTags = goalTags.filter(goalTag =>
    preferredTags.some(preferredTag => (TAG_OPPOSITES[goalTag] ?? []).includes(preferredTag))
  );

  const rationale: string[] = [];
  let driftScore = 0;

  if (preferredTags.length >= 2 && goalTags.length > 0 && matchingTags.length === 0) {
    driftScore += 34;
    rationale.push('recent positive signals do not overlap with the current goal tags');
  }

  if (opposingGoalTags.length > 0) {
    driftScore += 38;
    rationale.push(`recent preferences oppose goal cues like ${opposingGoalTags.join(', ')}`);
  }

  if (avoidedTags.some(tag => goalTags.includes(tag))) {
    driftScore += 18;
    rationale.push('the user is rejecting cues that are embedded in the current goal');
  }

  if (
    context.memory.activeInsights.some(
      insight => insight.active && (insight.move === 'challenge' || insight.interpretation === 'goal_changed')
    )
  ) {
    driftScore += 20;
    rationale.push('earlier clarifications already suggested a goal shift');
  }

  if (
    context.postGoalDirectionAngles?.length &&
    driftingTags.length > 0 &&
    !context.postGoalDirectionAngles.some(angle =>
      driftingTags.some(tag => lower(angle).includes(tag))
    )
  ) {
    driftScore += 12;
    rationale.push('preferred cues are not represented in the current post-goal directions');
  }

  return {
    preferredTags,
    avoidedTags,
    goalTags,
    matchingTags,
    driftingTags,
    opposingGoalTags,
    driftScore,
    shouldReframe: driftScore >= 52 && preferredTags.length > 0,
    rationale
  };
}

function buildDiagnostics(context: ClarificationTriggerContext, signals: ClarificationSignal[]): ClarificationDiagnostics {
  const goalProfile = buildGoalProfile(context);
  const alignment = buildAlignmentAssessment(context, signals, goalProfile);

  return {
    signals,
    goalProfile,
    alignment
  };
}

function hasSimilarActiveSummary(memory: ClarificationMemory, summary: string) {
  const normalized = lower(summary);
  return memory.activeInsights.some(insight => insight.active && lower(insight.summary) === normalized);
}

function findChallengeDecision(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  diagnostics: ClarificationDiagnostics
): ClarificationDecision {
  if (context.memory.activeInsights.length === 0) {
    return { question: null, diagnostics };
  }

  const currentPositiveTags = new Set(
    signals.filter(signal => signal.feedbackType === 'yes').flatMap(signal => signal.tags)
  );

  if (currentPositiveTags.size === 0) {
    return { question: null, diagnostics };
  }

  const conflictingInsight = context.memory.activeInsights.find(insight => {
    if (!insight.active) {
      return false;
    }

    return (insight.signalTags ?? []).some(tag =>
      (TAG_OPPOSITES[tag] ?? []).some(opposite => currentPositiveTags.has(opposite))
    );
  });

  if (!conflictingInsight) {
    return { question: null, diagnostics };
  }

  const recentPositiveNodes = signals
    .filter(signal => signal.feedbackType === 'yes')
    .map(signal => signal.nodeId)
    .slice(0, 3);

  const earlierEvidence = buildEvidenceImages(
    context.posts,
    conflictingInsight.sourceNodeIds ?? [],
    'Earlier preference',
    context.historyNodes
  );
  const currentEvidence = buildEvidenceImages(context.posts, recentPositiveNodes, 'Recent choice');

  const question: ClarificationQuestion = {
    id: createQuestionId('challenge', recentPositiveNodes[0], context.posts[0]?.metadata?.batchId ?? null),
    family: 'challenge',
    move: 'challenge',
    source: 'fallback_rules',
    urgency: 'high',
    presentation: 'compare-popup',
    triggerReason: 'contradiction-detected',
    title: 'Noticed a change',
    subtitle: 'Challenge interruption',
    prompt: `${conflictingInsight.summary} Your recent choices suggest a different direction. Has your goal changed?`,
    sourceBatchId: context.posts[0]?.metadata?.batchId ?? null,
    sourceNodeIds: [...(conflictingInsight.sourceNodeIds ?? []), ...recentPositiveNodes],
    evidenceImages: [...earlierEvidence, ...currentEvidence].slice(0, 6),
    controls: [
      CHALLENGE_RESPONSE_CONTROL,
      {
        id: 'challenge-note',
        kind: 'text',
        label: 'Additional context',
        placeholder: 'Anything else that changed?',
        optional: true
      }
    ]
  };

  return { question, reason: 'contradiction-detected', diagnostics };
}

function buildGoalFitPrompt(context: ClarificationTriggerContext, diagnostics: ClarificationDiagnostics) {
  const goalLabel = cleanText(context.postGoalTitle) || cleanText(context.businessGoalTitle) || 'the current goal';
  const preferred = diagnostics.alignment.preferredTags.slice(0, 2).join(', ');
  const goal = diagnostics.alignment.goalTags.slice(0, 2).join(', ');

  if (preferred && goal) {
    return `Your recent choices are steering this exploration toward ${preferred}, while ${goalLabel} is still framed around ${goal}. Should I keep the goal as-is, revise this post goal, or revisit the business goal?`;
  }

  return `Your recent choices are pulling this exploration away from ${goalLabel}. Should I keep the goal as-is, revise this post goal, or revisit the business goal?`;
}

function findGoalReframeDecision(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  diagnostics: ClarificationDiagnostics
): ClarificationDecision {
  const positiveSignals = signals.filter(signal => signal.feedbackType === 'yes');
  if (
    positiveSignals.length === 0 ||
    !diagnostics.alignment.shouldReframe ||
    (positiveSignals.length < 2 && diagnostics.alignment.preferredTags.length < 2)
  ) {
    return { question: null, diagnostics };
  }

  if (context.memory.activeInsights.some(insight => insight.active && insight.move === 'goal_reframe')) {
    return { question: null, diagnostics };
  }

  const summaryCandidate = buildGoalFitPrompt(context, diagnostics);
  if (hasSimilarActiveSummary(context.memory, summaryCandidate)) {
    return { question: null, diagnostics };
  }

  const sourceNodeIds = positiveSignals.map(signal => signal.nodeId).slice(0, 3);
  const targetGoal =
    diagnostics.alignment.driftScore >= 72 && cleanText(context.businessGoalTitle)
      ? 'business_goal'
      : 'post_goal';
  const question: ClarificationQuestion = {
    id: createQuestionId('goal_reframe', sourceNodeIds[0], context.posts[0]?.metadata?.batchId ?? null),
    family: 'clarify',
    move: 'goal_reframe',
    source: 'fallback_rules',
    urgency: 'high',
    presentation: 'anchored-sheet',
    triggerReason: 'goal-drift-detected',
    title: 'Check the goal fit',
    subtitle: 'Clarify interruption',
    prompt: summaryCandidate,
    sourceBatchId: context.posts[0]?.metadata?.batchId ?? null,
    sourceNodeIds,
    summaryCandidate,
    evidenceImages: buildEvidenceImages(context.posts, sourceNodeIds, 'Recent choice', context.historyNodes),
    applyTarget: 'goal_update',
    goalTarget: targetGoal,
    controls: [
      GOAL_REFRAME_CONTROL,
      {
        id: 'goal-reframe-note',
        kind: 'text',
        label: 'Optional guidance',
        placeholder: 'What should the next images optimize for instead?',
        optional: true
      }
    ]
  };

  return { question, reason: 'goal-drift-detected', diagnostics };
}

function findClarifyDecision(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  diagnostics: ClarificationDiagnostics
): ClarificationDecision {
  const candidate = signals.find(signal =>
    signal.feedbackType !== 'yes' &&
    signal.texts.some(text => STRATEGY_TERMS.some(term => lower(text).includes(term)))
  );

  if (!candidate) {
    return { question: null, diagnostics };
  }

  const question: ClarificationQuestion = {
    id: createQuestionId('clarify', candidate.nodeId, candidate.batchId),
    family: 'clarify',
    move: 'clarify',
    source: 'fallback_rules',
    urgency: 'high',
    presentation: 'anchored-sheet',
    triggerReason: 'scope-ambiguity',
    title: 'Clarifying scope',
    subtitle: 'Clarify interruption',
    prompt: 'Should I treat this as a problem with the direction itself, or just how this version executed it?',
    sourceBatchId: candidate.batchId ?? null,
    sourceNodeIds: [candidate.nodeId],
    originalFeedback: candidate.combinedText,
    focusDimension: candidate.dimensions[0],
    evidenceImages: buildEvidenceImages(context.posts, [candidate.nodeId], 'Current image', context.historyNodes),
    controls: [
      CLARIFY_INTERPRETATION_CONTROL,
      CLARIFY_SCOPE_CONTROL,
      {
        id: 'clarify-note',
        kind: 'text',
        label: 'Optional detail',
        placeholder: 'Describe what should change...',
        optional: true
      }
    ]
  };

  return { question, reason: 'scope-ambiguity', diagnostics };
}

function inferProbeDimension(signal: ClarificationSignal): ClarificationDimension {
  if (signal.dimensions.includes('other')) {
    if (signal.tags.includes('premium') || signal.tags.includes('bright') || signal.tags.includes('dark')) {
      return 'mood';
    }
    return 'composition';
  }

  return signal.dimensions[0];
}

function getProbePrompt(dimension: ClarificationDimension) {
  switch (dimension) {
    case 'color':
      return 'You mentioned color. Which direction should the palette move?';
    case 'typography':
      return 'You mentioned the type or text feel. What kind of treatment are you after?';
    case 'composition':
      return 'What part of the composition feels most off here?';
    case 'background':
      return 'What kind of environment or backdrop would make this feel more right?';
    case 'mood':
      return 'When you say this should feel more premium or more natural, what does that mean visually?';
    default:
      return 'What part of this image needs to change most?';
  }
}

function findProbeDecision(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  diagnostics: ClarificationDiagnostics
): ClarificationDecision {
  const candidate = signals.find(signal =>
    signal.texts.some(text => VAGUE_TERMS.some(term => lower(text).includes(term)))
  );

  if (!candidate) {
    return { question: null, diagnostics };
  }

  const focusDimension = inferProbeDimension(candidate);
  const question: ClarificationQuestion = {
    id: createQuestionId('probe', candidate.nodeId, candidate.batchId),
    family: 'probe',
    move: 'probe',
    source: 'fallback_rules',
    urgency: 'medium',
    presentation: 'anchored-sheet',
    triggerReason: 'vague-feedback',
    title: 'Need more detail',
    subtitle: 'Probe interruption',
    prompt: getProbePrompt(focusDimension),
    sourceBatchId: candidate.batchId ?? null,
    sourceNodeIds: [candidate.nodeId],
    focusDimension,
    originalFeedback: candidate.combinedText,
    evidenceImages: buildEvidenceImages(context.posts, [candidate.nodeId], 'Current image', context.historyNodes),
    controls: createProbeControlsForDimension(focusDimension)
  };

  return { question, reason: 'vague-feedback', diagnostics };
}

function buildSummaryCandidate(positiveTags: string[], negativeTags: string[]) {
  if (positiveTags.length > 0 && negativeTags.length > 0) {
    return `You keep favoring ${positiveTags.join(', ')} images over ${negativeTags.join(', ')} ones.`;
  }

  if (positiveTags.length > 0) {
    return `You consistently favor ${positiveTags.join(', ')} images in this post direction.`;
  }

  if (negativeTags.length > 0) {
    return `You consistently push away from ${negativeTags.join(', ')} images in this post direction.`;
  }

  return '';
}

function findSummarizeDecision(
  context: ClarificationTriggerContext,
  signals: ClarificationSignal[],
  diagnostics: ClarificationDiagnostics
): ClarificationDecision {
  const positiveTags = uniqueTopTags(signals, 'yes');
  const negativeTags = uniqueTopTags(signals, 'no');
  const summaryCandidate = buildSummaryCandidate(positiveTags, negativeTags);

  if (!summaryCandidate || hasSimilarActiveSummary(context.memory, summaryCandidate)) {
    return { question: null, diagnostics };
  }

  const sourceNodeIds = signals
    .filter(signal => signal.feedbackType === 'yes' || signal.feedbackType === 'no')
    .map(signal => signal.nodeId)
    .slice(0, 3);

  const question: ClarificationQuestion = {
    id: createQuestionId('summarize', sourceNodeIds[0], context.posts[0]?.metadata?.batchId ?? null),
    family: 'summarize',
    move: 'summarize',
    source: 'fallback_rules',
    urgency: 'medium',
    presentation: 'corner-card',
    triggerReason: 'stable-pattern',
    title: 'Check the read',
    subtitle: 'Summary interruption',
    prompt: summaryCandidate,
    sourceBatchId: context.posts[0]?.metadata?.batchId ?? null,
    sourceNodeIds,
    summaryCandidate,
    controls: [
      SUMMARIZE_CONFIRM_CONTROL,
      {
        id: 'summary-note',
        kind: 'text',
        label: 'Anything to revise?',
        placeholder: 'Add what the system is missing...',
        optional: true
      }
    ]
  };

  return { question, reason: 'stable-pattern', diagnostics };
}

export function decideClarificationQuestion(context: ClarificationTriggerContext): ClarificationDecision {
  const signals = collectSignals(context.posts);
  const diagnostics = buildDiagnostics(context, signals);

  if (signals.length === 0) {
    return { question: null, diagnostics, reason: 'no-feedback' };
  }

  const decisions = [
    findChallengeDecision(context, signals, diagnostics),
    findGoalReframeDecision(context, signals, diagnostics),
    findClarifyDecision(context, signals, diagnostics),
    findProbeDecision(context, signals, diagnostics),
    findSummarizeDecision(context, signals, diagnostics)
  ];

  return decisions.find(decision => Boolean(decision.question)) ?? {
    question: null,
    diagnostics,
    reason: 'no-trigger'
  };
}

export function findOptionById(question: ClarificationQuestion, controlId: string, optionId: string): ClarificationOption | undefined {
  const control = question.controls.find(entry => entry.id === controlId);
  if (!control || control.kind !== 'choice') {
    return undefined;
  }

  return control.options.find(option => option.id === optionId);
}
