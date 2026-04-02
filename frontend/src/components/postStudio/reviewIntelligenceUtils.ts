import type {
  ClarificationQuestion,
} from './clarification/types';
import type {
  FeedbackData,
  PostNode,
} from '../history/types';
import type {
  GenerationPlanSelectedAnchor,
  PrefetchedClarificationState,
  ReviewReadState,
  ReviewSnapshot,
} from '../../types/postStudio';
import { buildAggregatePlanFeedback, summarizeBatchFeedback } from './generationPlanUtils';

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function humanizeList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? '';
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function truncate(value: string, maxLength = 64) {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildSelectedAnchorSummary(anchorNode: PostNode | null): GenerationPlanSelectedAnchor {
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

export function buildReviewSnapshotSignature(
  posts: PostNode[],
  anchorNodeId: string | null
) {
  return posts
    .map((post, index) => {
      const feedback = post.feedback;
      return [
        index,
        post.id,
        post.id === anchorNodeId ? 'anchor' : '',
        feedback?.type ?? '',
        (feedback?.reasons ?? []).join(','),
        feedback?.customNote ?? ''
      ].join(':');
    })
    .join('|');
}

export function buildReviewSnapshot(
  posts: PostNode[],
  sourceBatchId: string | null,
  anchorNodeId: string | null
): ReviewSnapshot {
  const anchorNode =
    (anchorNodeId ? posts.find(post => post.id === anchorNodeId) : null) ??
    posts[0] ??
    null;
  const summary = summarizeBatchFeedback(posts);
  const feedbackByNodeId: Record<string, FeedbackData | null> = {};

  posts.forEach(post => {
    feedbackByNodeId[post.id] = post.feedback?.type ? post.feedback : null;
  });

  return {
    sourceBatchId,
    anchorNodeId: anchorNode?.id ?? null,
    selectedAnchor: buildSelectedAnchorSummary(anchorNode),
    aggregateFeedback: buildAggregatePlanFeedback(posts),
    feedbackByNodeId,
    summary,
    snapshotSignature: buildReviewSnapshotSignature(posts, anchorNode?.id ?? null),
    createdAt: Date.now()
  };
}

function buildEvidenceTokens(
  anchorNode: PostNode | null,
  summary: ReturnType<typeof summarizeBatchFeedback>
) {
  const tokens: string[] = [];

  if (anchorNode) {
    const anchorLabel = cleanText(
      anchorNode.analysis?.title ||
        anchorNode.metadata?.directionAngle ||
        anchorNode.analysis?.summary
    );
    if (anchorLabel) {
      tokens.push(`Anchor: ${truncate(anchorLabel, 48)}`);
    }
  }

  const pushToken = (label: string, values: string[], maxCount = 1) => {
    const cleaned = values.map(cleanText).filter(Boolean).slice(0, maxCount);
    if (cleaned.length) {
      tokens.push(`${label}: ${truncate(humanizeList(cleaned), 44)}`);
    }
  };

  pushToken('Liked', summary.likes);
  pushToken('Disliked', summary.dislikes);
  pushToken('Unsure', summary.unsure);
  pushToken('Note', summary.notes);

  return tokens.slice(0, 3);
}

function buildLocalSentence(
  anchorNode: PostNode | null,
  summary: ReturnType<typeof summarizeBatchFeedback>
) {
  const anchorLabel = cleanText(
    anchorNode?.analysis?.title ||
      anchorNode?.metadata?.directionAngle ||
      anchorNode?.analysis?.summary ||
      'the current direction'
  ).toLowerCase();

  if (
    summary.likes.length === 0 &&
    summary.dislikes.length === 0 &&
    summary.unsure.length === 0 &&
    summary.notes.length === 0
  ) {
    return 'Add reactions and short notes so the studio can read what to preserve, change, or clarify next.';
  }

  if (summary.likes.length > 0 && summary.dislikes.length > 0) {
    return `You are leaning toward ${humanizeList(summary.likes.slice(0, 2)).toLowerCase()} around ${anchorLabel}, while moving away from ${humanizeList(summary.dislikes.slice(0, 2)).toLowerCase()}.`;
  }

  if (summary.likes.length > 0) {
    return `You are favoring ${humanizeList(summary.likes.slice(0, 2)).toLowerCase()} with ${anchorLabel} as the strongest anchor so far.`;
  }

  if (summary.dislikes.length > 0) {
    return `You are steering away from ${humanizeList(summary.dislikes.slice(0, 2)).toLowerCase()}, so the next set should shift while staying grounded in the current goal.`;
  }

  if (summary.unsure.length > 0) {
    return `You have a promising direction around ${anchorLabel}, but something still feels unresolved and may need one clarification before generating again.`;
  }

  return `The studio has enough feedback around ${anchorLabel} to start shaping the next set.`;
}

function buildAiSentence(
  localRead: ReviewReadState,
  prefetchedClarification: PrefetchedClarificationState | null
) {
  if (!prefetchedClarification?.question) {
    return localRead.sentence;
  }

  const prompt = cleanText(prefetchedClarification.question.prompt);
  if (prefetchedClarification.question.move === 'goal_reframe') {
    return 'Your recent choices are pulling away from the current goal, and the studio has one goal-fit clarification before the next generation.';
  }

  if (prefetchedClarification.question.move === 'challenge') {
    return 'Your recent choices conflict with earlier confirmed preferences, so the studio has one contradiction check before generating again.';
  }

  if (prefetchedClarification.question.family === 'probe') {
    return 'The studio has enough direction to move forward, but one visual detail still needs clarification before it locks the next routes.';
  }

  if (prefetchedClarification.question.family === 'clarify') {
    return 'The studio sees a likely shift in direction or scope and has one clarification ready for the next step.';
  }

  if (prefetchedClarification.question.family === 'summarize') {
    return prompt || 'The studio sees a stable pattern and has one quick read to confirm before generating again.';
  }

  return localRead.sentence;
}

export function buildReviewReadState({
  posts,
  anchorNodeId,
  prefetchedClarification
}: {
  posts: PostNode[];
  anchorNodeId: string | null;
  prefetchedClarification?: PrefetchedClarificationState | null;
}): ReviewReadState {
  const anchorNode =
    (anchorNodeId ? posts.find(post => post.id === anchorNodeId) : null) ??
    posts[0] ??
    null;
  const summary = summarizeBatchFeedback(posts);
  const evidenceTokens = buildEvidenceTokens(anchorNode, summary);
  const localRead: ReviewReadState = {
    status:
      summary.likes.length === 0 &&
      summary.dislikes.length === 0 &&
      summary.unsure.length === 0 &&
      summary.notes.length === 0
        ? 'observing'
        : 'ready',
    source: 'local',
    sentence: buildLocalSentence(anchorNode, summary),
    evidenceTokens,
    pendingFamily: null,
    updatedAt: Date.now()
  };

  if (!prefetchedClarification?.question) {
    return localRead;
  }

  return {
    ...localRead,
    status: 'needs_clarification',
    source: 'ai',
    sentence: buildAiSentence(localRead, prefetchedClarification),
    pendingFamily: prefetchedClarification.question.family,
    updatedAt: Date.now()
  };
}

export function reviewReadEquals(
  left: ReviewReadState | null | undefined,
  right: ReviewReadState | null | undefined
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.status === right.status &&
    left.source === right.source &&
    left.sentence === right.sentence &&
    left.pendingFamily === right.pendingFamily &&
    left.evidenceTokens.length === right.evidenceTokens.length &&
    left.evidenceTokens.every((token, index) => token === right.evidenceTokens[index])
  );
}

export function questionMatchesSnapshot(
  prefetchedClarification: PrefetchedClarificationState | null | undefined,
  snapshotSignature: string | null | undefined
) {
  return Boolean(
    prefetchedClarification &&
      snapshotSignature &&
      prefetchedClarification.snapshotSignature === snapshotSignature
  );
}

export function buildQuestionImpactText(
  question: ClarificationQuestion,
  effectRows: Array<{ effect: string }> = []
) {
  if (question.move === 'goal_reframe') {
    return question.goalTarget === 'business_goal'
      ? 'This answer will decide whether the business goal itself should change before the next generation.'
      : 'This answer will decide whether the post goal should be rewritten before the next generation.';
  }

  if (effectRows.length > 0) {
    return `This answer will change the next set by helping the studio ${effectRows
      .slice(0, 2)
      .map(row => cleanText(row.effect))
      .filter(Boolean)
      .join(' and ')}.`;
  }

  if (question.family === 'summarize') {
    return 'This answer will confirm what the studio should preserve in the next routes.';
  }

  if (question.family === 'probe') {
    return 'This answer will sharpen one under-specified visual change before the next set is generated.';
  }

  if (question.family === 'clarify') {
    return 'This answer will decide how broadly the studio should apply this change in the next generation.';
  }

  return 'This answer will change how the next set is interpreted and generated.';
}
