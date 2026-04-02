import type {
  ClarificationDimension,
  ClarificationDraftGoalUpdate,
  ClarificationEvaluationSnapshot,
  ClarificationInsight,
  ClarificationMemory,
  ClarificationScope
} from '../../history/types';
import { findOptionById } from './engine';
import type {
  ClarificationAnswer,
  ClarificationContextPayload,
  ClarificationQuestion
} from './types';

const SIGNAL_TAG_KEYWORDS: Record<string, string[]> = {
  bright: ['bright', 'energetic', 'vibrant'],
  dark: ['dark', 'deeper', 'restrained'],
  clean: ['clean', 'minimal', 'simple'],
  busy: ['busy', 'cluttered'],
  premium: ['premium', 'luxury', 'editorial'],
  promotional: ['commercial', 'sale', 'discount', 'promotional'],
  natural: ['natural', 'organic', 'real'],
  synthetic: ['synthetic', 'ai', 'fake', 'neon'],
  warm: ['warm', 'soft'],
  cool: ['cool', 'fresh'],
  readable: ['readable', 'text-ready'],
};

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value: unknown) {
  return cleanText(value).toLowerCase();
}

function inferTags(text: string): string[] {
  const normalized = lower(text);
  return Object.entries(SIGNAL_TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)))
    .map(([tag]) => tag);
}

function mapScope(value: string | string[] | number | undefined): ClarificationScope {
  if (value === 'image' || value === 'post' || value === 'future_posts' || value === 'brand') {
    return value;
  }

  return 'post';
}

function getAnswerNote(answer: ClarificationAnswer) {
  return cleanText(
    answer.values['summary-note'] ||
      answer.values['probe-note'] ||
      answer.values['clarify-note'] ||
      answer.values['challenge-note'] ||
      answer.values['goal-reframe-note'] ||
      answer.values['commit-note'] ||
      answer.values['note']
  );
}

function mapDimension(
  question: ClarificationQuestion,
  answer: ClarificationAnswer
): ClarificationDimension | undefined {
  if (question.focusDimension && question.focusDimension !== 'other') {
    return question.focusDimension;
  }

  const probeChoice =
    typeof answer.values['probe-choice'] === 'string' ? answer.values['probe-choice'] : '';
  if (probeChoice.includes('color')) {
    return 'color';
  }
  if (probeChoice.includes('typography') || probeChoice.includes('font') || probeChoice.includes('text')) {
    return 'typography';
  }
  if (probeChoice.includes('background')) {
    return 'background';
  }
  if (probeChoice.includes('composition') || probeChoice.includes('layout') || probeChoice.includes('crop')) {
    return 'composition';
  }
  if (probeChoice.includes('product')) {
    return 'product';
  }
  if (probeChoice.includes('light')) {
    return 'lighting';
  }

  return question.focusDimension;
}

function summarizeAnswerLabel(question: ClarificationQuestion, answer: ClarificationAnswer) {
  const responseValue =
    typeof answer.values['summary-response'] === 'string'
      ? answer.values['summary-response']
      : typeof answer.values['challenge-response'] === 'string'
        ? answer.values['challenge-response']
        : typeof answer.values['goal-commit'] === 'string'
          ? answer.values['goal-commit']
          : typeof answer.values['interpretation'] === 'string'
            ? answer.values['interpretation']
            : typeof answer.values['probe-choice'] === 'string'
              ? answer.values['probe-choice']
              : '';

  if (!responseValue) {
    return answer.skipped ? 'Skipped' : 'Answered';
  }

  return (
    findOptionById(question, 'summary-response', responseValue)?.label ||
    findOptionById(question, 'challenge-response', responseValue)?.label ||
    findOptionById(question, 'goal-commit', responseValue)?.label ||
    findOptionById(question, 'interpretation', responseValue)?.label ||
    findOptionById(question, 'probe-choice', responseValue)?.label ||
    responseValue
  );
}

function buildInsightSummary(question: ClarificationQuestion, answer: ClarificationAnswer) {
  const note = getAnswerNote(answer);

  if (question.move === 'summarize') {
    const response = answer.values['summary-response'];
    if (response === 'confirm') {
      return cleanText(question.summaryCandidate || question.prompt);
    }
    if (response === 'mostly_right') {
      return note
        ? `Mostly right: ${note}`
        : 'Keep the same direction, but refine the nuance.';
    }
    return note
      ? `Revise the system read: ${note}`
      : 'Revise the current understanding before generating more images.';
  }

  if (question.move === 'probe') {
    const choiceId =
      typeof answer.values['probe-choice'] === 'string' ? answer.values['probe-choice'] : '';
    const choice = findOptionById(question, 'probe-choice', choiceId);
    const base = choice
      ? `Lean toward ${choice.label.toLowerCase()}`
      : 'Refine this visual aspect';
    return note ? `${base}: ${note}` : base;
  }

  if (question.move === 'clarify') {
    const interpretation = answer.values['interpretation'];
    const scope = mapScope(answer.values['scope']);
    if (interpretation === 'wrong_strategy') {
      return note
        ? `Change the strategy at the ${scope} level: ${note}`
        : `Treat this as a strategy issue at the ${scope} level.`;
    }
    return note
      ? `Keep the direction, but change the execution at the ${scope} level: ${note}`
      : `Keep the direction, but change the execution at the ${scope} level.`;
  }

  if (question.move === 'challenge') {
    const response = answer.values['challenge-response'];
    if (response === 'goal_changed') {
      return note ? `The goal changed: ${note}` : 'The goal changed. Follow the recent choices more closely.';
    }
    if (response === 'same_goal_wrong_execution') {
      return note
        ? `Same goal, wrong earlier execution: ${note}`
        : 'The goal stayed the same, but earlier executions expressed it badly.';
    }
    return note
      ? `Still do not infer the opposite direction: ${note}`
      : 'Do not infer the opposite direction from recent choices.';
  }

  if (question.move === 'goal_reframe') {
    const response = answer.values['goal-commit'];
    if (response === 'keep_goal') {
      return note
        ? `Keep the current goal and refine execution: ${note}`
        : 'Keep the current goal and refine the execution within it.';
    }
    if (response === 'revise_post_goal') {
      return note
        ? `Revise the post goal: ${note}`
        : 'Revise the post goal to better match the current preferences.';
    }
    return note
      ? `Revisit the business goal: ${note}`
      : 'Revisit the business goal because the exploration is moving elsewhere.';
  }

  return note || cleanText(question.prompt);
}

function buildInsight(question: ClarificationQuestion, answer: ClarificationAnswer): ClarificationInsight | null {
  if (answer.skipped) {
    return null;
  }

  const summary = buildInsightSummary(question, answer);
  const strength =
    typeof answer.values['probe-strength'] === 'number'
      ? answer.values['probe-strength']
      : question.move === 'summarize'
        ? 68
        : 74;
  const dimension = mapDimension(question, answer);
  const goalCommitChoice =
    typeof answer.values['goal-commit'] === 'string' ? answer.values['goal-commit'] : '';
  const scope =
    goalCommitChoice === 'revisit_business_goal'
      ? 'future_posts'
      : goalCommitChoice === 'revise_post_goal'
        ? 'post'
        : mapScope(answer.values['scope']);
  const signalTags = Array.from(
    new Set(
      [
        summary,
        answer.values['goal-commit'],
        answer.values['probe-choice'],
        getAnswerNote(answer),
      ]
        .map(cleanText)
        .filter(Boolean)
        .flatMap(inferTags)
    )
  );

  return {
    id: `clarify-insight-${answer.answeredAt}`,
    family: question.family,
    move: question.move,
    summary,
    scope,
    dimension,
    interpretation:
      (answer.values['summary-response'] as ClarificationInsight['interpretation']) ||
      (answer.values['interpretation'] as ClarificationInsight['interpretation']) ||
      (answer.values['challenge-response'] as ClarificationInsight['interpretation']) ||
      (answer.values['goal-commit'] as ClarificationInsight['interpretation']) ||
      undefined,
    strength,
    signalTags,
    sourceNodeIds: question.sourceNodeIds,
    sourceBatchId: question.sourceBatchId,
    source: question.source,
    createdAt: answer.answeredAt,
    active: true
  };
}

function shouldSupersede(existing: ClarificationInsight, next: ClarificationInsight) {
  if (!existing.active) {
    return false;
  }

  if (next.move === 'challenge' || next.move === 'goal_reframe') {
    return true;
  }

  if (existing.dimension && next.dimension && existing.dimension === next.dimension) {
    return true;
  }

  if (existing.scope === next.scope && existing.move === next.move) {
    return true;
  }

  return false;
}

function upsertCycle(memory: ClarificationMemory, update: ClarificationMemory['cycles'][number]) {
  const existingIndex = memory.cycles.findIndex(cycle => cycle.id === update.id);
  if (existingIndex === -1) {
    return [update, ...memory.cycles].slice(0, 40);
  }

  const next = [...memory.cycles];
  next[existingIndex] = {
    ...next[existingIndex],
    ...update
  };
  return next;
}

export function createEmptyClarificationMemory(): ClarificationMemory {
  return {
    activeInsights: [],
    records: [],
    cycles: [],
    latestEvaluation: null
  };
}

export function startClarificationCycle(
  memory: ClarificationMemory,
  question: ClarificationQuestion
): ClarificationMemory {
  return {
    ...memory,
    cycles: upsertCycle(memory, {
      id: question.id,
      family: question.family,
      move: question.move,
      source: question.source,
      status: 'asked',
      triggerReason: question.triggerReason,
      urgency: question.urgency,
      prompt: question.prompt,
      title: question.title,
      subtitle: question.subtitle,
      originalFeedback: question.originalFeedback,
      sourceNodeIds: question.sourceNodeIds,
      sourceBatchId: question.sourceBatchId,
      appliedTarget: question.applyTarget,
      createdAt: Date.now()
    })
  };
}

export function setLatestEvaluation(
  memory: ClarificationMemory,
  evaluation?: ClarificationEvaluationSnapshot | null
): ClarificationMemory {
  return {
    ...memory,
    latestEvaluation: evaluation ?? null
  };
}

export function attachDraftGoalUpdate(
  memory: ClarificationMemory,
  cycleId: string,
  goalUpdate: ClarificationDraftGoalUpdate
): ClarificationMemory {
  const cycle = memory.cycles.find(entry => entry.id === cycleId);
  if (!cycle) {
    return memory;
  }

  return {
    ...memory,
    cycles: upsertCycle(memory, {
      ...cycle,
      status: 'drafted',
      goalUpdate,
      appliedTarget: 'goal_update'
    })
  };
}

export function markGoalUpdateApplied(
  memory: ClarificationMemory,
  cycleId: string,
  goalUpdate?: ClarificationDraftGoalUpdate | null
): ClarificationMemory {
  const cycle = memory.cycles.find(entry => entry.id === cycleId);
  if (!cycle) {
    return memory;
  }

  return {
    ...memory,
    cycles: upsertCycle(memory, {
      ...cycle,
      status: 'applied',
      goalUpdate: goalUpdate ?? cycle.goalUpdate ?? null,
      appliedTarget: 'goal_update',
      appliedAt: Date.now()
    })
  };
}

export function markGoalUpdateDismissed(
  memory: ClarificationMemory,
  cycleId: string
): ClarificationMemory {
  const cycle = memory.cycles.find(entry => entry.id === cycleId);
  if (!cycle) {
    return memory;
  }

  return {
    ...memory,
    cycles: upsertCycle(memory, {
      ...cycle,
      status: 'dismissed'
    })
  };
}

export function applyClarificationAnswer(
  memory: ClarificationMemory,
  question: ClarificationQuestion,
  answer: ClarificationAnswer
) {
  const insight = buildInsight(question, answer);
  const nextActiveInsights = memory.activeInsights.map(existing =>
    insight && shouldSupersede(existing, insight)
      ? { ...existing, active: false }
      : existing
  );

  if (insight) {
    nextActiveInsights.unshift(insight);
  }

  const answerLabel = summarizeAnswerLabel(question, answer);
  const summary = insight?.summary || getAnswerNote(answer) || question.prompt;
  const existingCycle = memory.cycles.find(entry => entry.id === question.id);
  const cycle = {
    id: question.id,
    family: question.family,
    move: question.move,
    source: question.source,
    status: answer.skipped ? 'skipped' : 'answered',
    triggerReason: question.triggerReason,
    urgency: question.urgency,
    prompt: question.prompt,
    title: question.title,
    subtitle: question.subtitle,
    originalFeedback: question.originalFeedback,
    summary,
    answerLabel,
    answerValues: answer.values,
    sourceNodeIds: question.sourceNodeIds,
    sourceBatchId: question.sourceBatchId,
    appliedTarget: question.applyTarget,
    goalUpdate: existingCycle?.goalUpdate ?? null,
    createdAt: existingCycle?.createdAt ?? answer.answeredAt,
    answeredAt: answer.answeredAt
  } as const;

  return {
    memory: {
      activeInsights: nextActiveInsights.slice(0, 12),
      records: [
        {
          id: `${question.id}-record-${answer.answeredAt}`,
          family: question.family,
          move: question.move,
          prompt: question.prompt,
          answerLabel,
          summary,
          createdAt: answer.answeredAt
        },
        ...memory.records
      ].slice(0, 30),
      cycles: upsertCycle(memory, cycle),
      latestEvaluation: memory.latestEvaluation ?? null
    } satisfies ClarificationMemory,
    insight,
    cycle
  };
}

export function buildClarificationContextPayload(
  memory: ClarificationMemory
): ClarificationContextPayload {
  return {
    activeInsights: memory.activeInsights
      .filter(insight => insight.active)
      .slice(0, 6)
      .map(insight => ({
        id: insight.id,
        family: insight.family,
        move: insight.move,
        summary: insight.summary,
        scope: insight.scope,
        dimension: insight.dimension,
        interpretation: insight.interpretation,
        strength: insight.strength,
        signalTags: insight.signalTags
      })),
    recentRecords: memory.records.slice(0, 6).map(record => ({
      id: record.id,
      family: record.family,
      move: record.move,
      summary: record.summary,
      answerLabel: record.answerLabel
    })),
    recentCycles: memory.cycles.slice(0, 8).map(cycle => ({
      id: cycle.id,
      family: cycle.family,
      move: cycle.move,
      status: cycle.status,
      summary: cycle.summary || cycle.prompt,
      answerLabel: cycle.answerLabel,
      goalUpdateTarget: cycle.goalUpdate?.target
    }))
  };
}

export function getActiveClarificationSummaries(memory: ClarificationMemory) {
  return memory.activeInsights
    .filter(insight => insight.active)
    .slice(0, 4)
    .map(insight => insight.summary);
}
