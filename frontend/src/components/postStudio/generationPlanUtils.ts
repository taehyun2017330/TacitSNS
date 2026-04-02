import type { FeedbackData, PostNode } from '../history/types';
import type {
  GenerationPlanEffectRow,
  GenerationPlanRouteCard,
  GenerationPlanSelectedAnchor,
  GenerationPlanSignalRow,
  PostGenerationPlanState
} from '../../types/postStudio';
import type { ClarificationQuestion } from './clarification/types';
import { buildIterativeDirectionAngles } from './utils';

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueTexts(values: string[]) {
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

function extractDirectionAnchor(direction: string) {
  const lines = String(direction ?? '')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);

  const labeledLine =
    lines.find(line => line.startsWith('What this post goal explores:')) ??
    lines.find(line => line.startsWith('Direction anchor:')) ??
    lines.find(line => line.startsWith('Post goal:')) ??
    '';

  if (!labeledLine) {
    return cleanText(direction).slice(0, 180);
  }

  return cleanText(labeledLine.replace(/^[^:]+:\s*/, ''));
}

function titleCaseWords(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function shortenSentence(input: string, maxLength = 140) {
  const cleaned = cleanText(input);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function inferRouteTitle(text: string, index: number) {
  const normalized = cleanText(text).toLowerCase();
  const titleMap: Array<[RegExp, string]> = [
    [/(process|craft|making|precision|clinical|scientific|lab)/, 'Process Proof'],
    [/(ingredient|texture|material|detail|macro)/, 'Ingredient Detail'],
    [/(human|routine|application|hands|lifestyle|use)/, 'Human Use'],
    [/(editorial|hero|still|product|composition|layout)/, 'Editorial Still'],
    [/(warm|calm|soft|trust|credible)/, 'Trust Signal']
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

  return words.length
    ? titleCaseWords(words.join(' '))
    : `Route ${index + 1}`;
}

function inferRouteChange(text: string) {
  const cleaned = cleanText(text)
    .replace(/^Create a visibly different route using\s*/i, '')
    .replace(/^Explore a variation that pushes\s*/i, '')
    .replace(/^Refine this direction while\s*/i, '')
    .replace(/^Use one post to\s*/i, '');

  return shortenSentence(cleaned, 138);
}

function inferEffectFromReason(reason: string, tone: GenerationPlanSignalRow['tone']) {
  const normalized = cleanText(reason).toLowerCase();

  if (/(text|typography|font|copy)/.test(normalized)) {
    return tone === 'like'
      ? 'keep the text treatment closer to this direction'
      : 'change the text treatment and hierarchy in the next set';
  }
  if (/(color|palette|tone|warm|cool)/.test(normalized)) {
    return tone === 'like'
      ? 'hold closer to this palette direction'
      : 'shift the palette and test a clearer alternative';
  }
  if (/(composition|layout|framing|crop|placement)/.test(normalized)) {
    return tone === 'like'
      ? 'keep this framing logic stronger in the next routes'
      : 'change the framing and composition in the next routes';
  }
  if (/(background|setting|scene|environment)/.test(normalized)) {
    return tone === 'like'
      ? 'preserve this environment style as the base'
      : 'change the environment and backdrop direction';
  }
  if (/(artificial|synthetic|natural|real|credible|trust)/.test(normalized)) {
    return tone === 'like'
      ? 'keep the image feeling believable and grounded'
      : 'push the next set toward a more natural and credible feel';
  }
  if (/(brand|on brand|premium|calm|clinical|editorial|promotional|sale)/.test(normalized)) {
    return tone === 'like'
      ? 'reinforce this brand tone in the next routes'
      : 'adjust the tone so the next set lands closer to the brand goal';
  }
  if (tone === 'like') {
    return 'keep this stronger in the next set';
  }
  if (tone === 'dislike') {
    return 'move away from this in the next set';
  }
  if (tone === 'unsure') {
    return 'test one clearer alternative here';
  }
  if (tone === 'note') {
    return 'carry this note into the next routes';
  }
  if (tone === 'clarification') {
    return 'treat this clarification as an active rule for the next generation';
  }
  if (tone === 'goal') {
    return 're-read the current goal before deciding the next batch';
  }
  return 'use this as the main anchor for the next batch';
}

function buildSelectedAnchor(anchorNode: PostNode | null): GenerationPlanSelectedAnchor {
  return {
    nodeId: anchorNode?.id ?? null,
    imageUrl: anchorNode?.imageUrl ?? null,
    title: cleanText(
      anchorNode?.analysis?.title ||
        anchorNode?.metadata?.directionAngle ||
        anchorNode?.analysis?.summary ||
        'Selected anchor'
    ),
    directionAngle: anchorNode?.metadata?.directionAngle ?? null
  };
}

function buildSignalRows(
  anchorNode: PostNode | null,
  summary: ReturnType<typeof summarizeBatchFeedback>,
  clarificationSummaries: string[]
): GenerationPlanSignalRow[] {
  const rows: GenerationPlanSignalRow[] = [];

  const anchorTitle = cleanText(
    anchorNode?.analysis?.title ||
      anchorNode?.metadata?.directionAngle ||
      anchorNode?.analysis?.summary ||
      ''
  );

  if (anchorTitle) {
    rows.push({
      id: 'brief-selected-anchor',
      tone: 'anchor',
      label: 'Selected anchor',
      source: anchorTitle
    });
  }

  const pushRows = (
    tone: GenerationPlanSignalRow['tone'],
    label: string,
    values: string[],
    prefix: string
  ) => {
    values
      .map(cleanText)
      .filter(Boolean)
      .slice(0, 2)
      .forEach((value, index) => {
        rows.push({
          id: `${prefix}-${index}`,
          tone,
          label,
          source: value
        });
      });
  };

  pushRows('like', 'Liked', summary.likes, 'signal-like');
  pushRows('dislike', 'Disliked', summary.dislikes, 'signal-dislike');
  pushRows('unsure', 'Unsure', summary.unsure, 'signal-unsure');
  pushRows('note', 'Note', summary.notes, 'signal-note');
  pushRows('clarification', 'Clarified', clarificationSummaries, 'signal-clarification');

  return rows;
}

function buildEffectRows(signalRows: GenerationPlanSignalRow[]): GenerationPlanEffectRow[] {
  return signalRows.map(row => ({
    id: `effect-${row.id}`,
    signalId: row.id,
    tone: row.tone,
    label: row.label,
    source: row.source,
    effect: inferEffectFromReason(row.source, row.tone)
  }));
}

function buildRouteCards(
  angles: string[],
  effectRows: GenerationPlanEffectRow[]
): GenerationPlanRouteCard[] {
  const fallbackRationale =
    effectRows[0]?.effect ?? 'Use the current feedback as the basis for the next route.';

  return angles.map((angle, index) => {
    const relatedEffect = effectRows[index % Math.max(effectRows.length, 1)];
    return {
      id: `route-${index}`,
      title: inferRouteTitle(angle, index),
      change: inferRouteChange(angle),
      rationale: shortenSentence(
        relatedEffect?.effect ?? fallbackRationale,
        110
      ),
      editableText: angle
    };
  });
}

function buildSystemReadText(
  anchorNode: PostNode | null,
  summary: ReturnType<typeof summarizeBatchFeedback>,
  clarificationSummaries: string[]
) {
  const anchorLabel = cleanText(
    anchorNode?.analysis?.title ||
      anchorNode?.metadata?.directionAngle ||
      'the selected direction'
  );
  const liked = summary.likes.slice(0, 2).map(cleanText).filter(Boolean);
  const disliked = summary.dislikes.slice(0, 2).map(cleanText).filter(Boolean);
  const clarified = clarificationSummaries.slice(0, 1).map(cleanText).filter(Boolean);

  if (clarified.length) {
    return clarified[0];
  }

  if (liked.length && disliked.length) {
    return `You are leaning toward ${joinHuman(liked).toLowerCase()} around ${anchorLabel.toLowerCase()}, while pulling away from ${joinHuman(disliked).toLowerCase()}.`;
  }
  if (liked.length) {
    return `You are favoring ${joinHuman(liked).toLowerCase()} with ${anchorLabel.toLowerCase()} as the strongest anchor.`;
  }
  if (disliked.length) {
    return `You are steering away from ${joinHuman(disliked).toLowerCase()}, so the next set should change direction while keeping the current goal intact.`;
  }

  return `The next set is still anchored in ${anchorLabel.toLowerCase()}, but it needs clearer feedback before the system narrows the direction.`;
}

function serializePlanUi(plan: Pick<
  PostGenerationPlanState,
  'anchorNodeId' | 'direction' | 'directionAngles' | 'similarity' | 'systemRead' | 'signalRows' | 'effectRows' | 'routeCards' | 'isSynthesizing' | 'selectedAnchor' | 'manualDirectionEdits' | 'questionGateState' | 'questionResolutionStatus' | 'tentativeRoutes'
>) {
  return JSON.stringify({
    anchorNodeId: plan.anchorNodeId,
    direction: plan.direction,
    directionAngles: plan.directionAngles,
    similarity: plan.similarity,
    selectedAnchor: plan.selectedAnchor,
    systemRead: plan.systemRead,
    signalRows: plan.signalRows,
    effectRows: plan.effectRows,
    routeCards: plan.routeCards,
    isSynthesizing: plan.isSynthesizing,
    manualDirectionEdits: plan.manualDirectionEdits,
    questionGateState: plan.questionGateState,
    questionResolutionStatus: plan.questionResolutionStatus,
    tentativeRoutes: plan.tentativeRoutes
  });
}

export function summarizeBatchFeedback(posts: PostNode[]) {
  const likes: string[] = [];
  const dislikes: string[] = [];
  const unsure: string[] = [];
  const notes: string[] = [];

  posts.forEach(post => {
    const feedback = post.feedback;
    if (!feedback?.type) {
      return;
    }

    if (feedback.type === 'yes') {
      likes.push(...feedback.reasons);
    } else if (feedback.type === 'no') {
      dislikes.push(...feedback.reasons);
    } else if (feedback.type === 'unsure') {
      unsure.push(...feedback.reasons);
    }

    if (feedback.customNote?.trim()) {
      notes.push(feedback.customNote.trim());
    }
  });

  return {
    likes: uniqueTexts(likes),
    dislikes: uniqueTexts(dislikes),
    unsure: uniqueTexts(unsure),
    notes: uniqueTexts(notes)
  };
}

export function buildAggregatePlanFeedback(posts: PostNode[]): FeedbackData {
  const summary = summarizeBatchFeedback(posts);
  const likeCount = summary.likes.length;
  const dislikeCount = summary.dislikes.length;
  const unsureCount = summary.unsure.length;

  return {
    type:
      likeCount > dislikeCount
        ? 'yes'
        : dislikeCount > 0
          ? 'no'
          : unsureCount > 0
            ? 'unsure'
            : null,
    reasons: [...summary.likes, ...summary.dislikes, ...summary.unsure],
    customNote: summary.notes.join(' | ')
  };
}

export function buildGenerationPlanState({
  posts,
  currentBatchId,
  anchorNodeId,
  direction,
  fallbackAngles,
  similarity,
  clarificationSummaries = [],
  isSynthesizing = false,
  reviewReadSentence,
  createdAt,
  manualDirectionEdits = false,
  questionGateState = 'clear',
  questionResolutionStatus = null,
  tentativeRoutes = false
}: {
  posts: PostNode[];
  currentBatchId: string | null;
  anchorNodeId?: string | null;
  direction: string;
  fallbackAngles: string[];
  similarity: number;
  clarificationSummaries?: string[];
  isSynthesizing?: boolean;
  reviewReadSentence?: string;
  createdAt?: number;
  manualDirectionEdits?: boolean;
  questionGateState?: PostGenerationPlanState['questionGateState'];
  questionResolutionStatus?: PostGenerationPlanState['questionResolutionStatus'];
  tentativeRoutes?: boolean;
}): PostGenerationPlanState {
  const anchorNode =
    (anchorNodeId ? posts.find(post => post.id === anchorNodeId) : null) ??
    posts[0] ??
    null;

  const feedbackSummary = summarizeBatchFeedback(posts);
  const anchorLabel = cleanText(
    anchorNode?.analysis?.title ||
      anchorNode?.metadata?.directionAngle ||
      anchorNode?.analysis?.summary ||
      ''
  );
  const liked = feedbackSummary.likes.slice(0, 2).map(cleanText).filter(Boolean);
  const disliked = feedbackSummary.dislikes.slice(0, 2).map(cleanText).filter(Boolean);
  const unresolved = feedbackSummary.unsure.slice(0, 1).map(cleanText).filter(Boolean);
  const notes = feedbackSummary.notes.slice(0, 1).map(cleanText).filter(Boolean);

  const directionParts = [
    extractDirectionAnchor(direction),
    anchorLabel ? `Keep the next batch anchored in ${anchorLabel.toLowerCase()}` : '',
    liked.length ? `Preserve ${joinHuman(liked).toLowerCase()}` : '',
    disliked.length ? `Move away from ${joinHuman(disliked).toLowerCase()}` : '',
    unresolved.length ? `Test a clearer alternative around ${joinHuman(unresolved).toLowerCase()}` : '',
    notes.length ? `Account for this note: ${notes[0]}` : ''
  ].filter(Boolean);

  const resolvedDirection = directionParts.join('. ');
  const directionAngles = buildIterativeDirectionAngles({
    posts,
    parentNode: anchorNode,
    direction: resolvedDirection,
    fallbackAngles
  });
  const selectedAnchor = buildSelectedAnchor(anchorNode);
  const signalRows = buildSignalRows(anchorNode, feedbackSummary, clarificationSummaries);
  const effectRows = buildEffectRows(signalRows);
  const routeCards = buildRouteCards(directionAngles, effectRows);

  return {
    sourceBatchId: currentBatchId,
    anchorNodeId: anchorNode?.id ?? null,
    direction: resolvedDirection,
    directionAngles,
    similarity,
    createdAt: createdAt ?? Date.now(),
    selectedAnchor,
    systemRead: clarificationSummaries[0] ?? reviewReadSentence ?? buildSystemReadText(anchorNode, feedbackSummary, clarificationSummaries),
    signalRows,
    effectRows,
    routeCards,
    isSynthesizing,
    manualDirectionEdits,
    questionGateState,
    questionResolutionStatus,
    tentativeRoutes
  };
}

export function updateGenerationPlanDirections(
  plan: PostGenerationPlanState,
  index: number,
  value: string
): PostGenerationPlanState {
  const nextAngles = [...plan.directionAngles];
  nextAngles[index] = value;
  const nextRouteCards = buildRouteCards(nextAngles, plan.effectRows ?? []);
  return {
    ...plan,
    directionAngles: nextAngles,
    routeCards: nextRouteCards,
    manualDirectionEdits: true
  };
}

export function setGenerationPlanSynthesizing(
  plan: PostGenerationPlanState | null,
  isSynthesizing: boolean
) {
  if (!plan) {
    return plan;
  }

  if (plan.isSynthesizing === isSynthesizing) {
    return plan;
  }

  return {
    ...plan,
    isSynthesizing
  };
}

export function generationPlanEquals(
  left: PostGenerationPlanState | null,
  right: PostGenerationPlanState | null
) {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return serializePlanUi(left) === serializePlanUi(right);
}

export function resolveQuestionAnchorTargetId(
  question: ClarificationQuestion | null,
  plan: PostGenerationPlanState | null
) {
  if (!question) {
    return null;
  }
  if (question.anchorTargetId) {
    return question.anchorTargetId;
  }
  if (question.move === 'goal_reframe') {
    return question.goalTarget === 'business_goal' ? 'brief-business-goal' : 'brief-post-goal';
  }
  if (question.move === 'challenge') {
    return 'brief-selected-anchor';
  }

  const signalRows = plan?.signalRows ?? [];
  const findByPrefix = (prefix: string) => signalRows.find(row => row.id.startsWith(prefix))?.id ?? null;

  if (question.move === 'probe') {
    return findByPrefix('signal-unsure') ?? findByPrefix('signal-dislike') ?? signalRows[0]?.id ?? 'system-read';
  }
  if (question.move === 'clarify') {
    return findByPrefix('signal-dislike') ?? findByPrefix('signal-unsure') ?? signalRows[0]?.id ?? 'system-read';
  }
  if (question.move === 'summarize') {
    return findByPrefix('signal-like') ?? signalRows[0]?.id ?? 'system-read';
  }

  return 'system-read';
}
