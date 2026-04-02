import type {
  BatchAnalysis,
  FeedbackReasonOption,
  Gen,
  ImageDesignAnalysis,
  PostGoalContextMetadata,
  PostNode
} from '../history/types';
import type { PostGoalFolder } from '../../types/workspace';
import type { EditOptions, PostStudioActionType } from './types';

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function meaningfullyDistinctText(a?: string, b?: string) {
  const normalize = (value?: string) =>
    cleanText(value)
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) {
    return Boolean(left || right);
  }

  return left !== right;
}

function ensureSentence(value: string) {
  if (!value) {
    return '';
  }
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function titleFromAngle(directionAngle: string | undefined, index: number) {
  const cleaned = cleanText(directionAngle);
  if (!cleaned) {
    return `Option ${index + 1}`;
  }

  const words = cleaned
    .split(/[,.]/)[0]
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  return words.join(' ') || `Option ${index + 1}`;
}

function buildPlaceholderImageDataUrl(index: number) {
  const placeholderColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  const accent = placeholderColors[index % placeholderColors.length];
  const label = `Post ${index + 1}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" fill="none">
      <rect width="800" height="1000" fill="#F6F1E8"/>
      <rect x="48" y="48" width="704" height="904" rx="36" fill="white" stroke="#E8DDD0" stroke-width="3"/>
      <rect x="96" y="112" width="608" height="520" rx="28" fill="${accent}" fill-opacity="0.12"/>
      <rect x="128" y="688" width="270" height="24" rx="12" fill="#D7CCBE"/>
      <rect x="128" y="736" width="448" height="18" rx="9" fill="#E6DDD2"/>
      <rect x="128" y="776" width="364" height="18" rx="9" fill="#EDE6DD"/>
      <circle cx="666" cy="154" r="22" fill="${accent}" fill-opacity="0.24"/>
      <text x="128" y="192" fill="#3A3128" font-size="44" font-family="Helvetica, Arial, sans-serif" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildFallbackFeedbackSuggestions(directionAngle: string | undefined) {
  const title = titleFromAngle(directionAngle, 0).toLowerCase();
  return {
    yes: [
      { label: 'Clear direction', chipLabel: 'Clear direction' },
      { label: `Strong ${title}`, chipLabel: 'Strong direction' },
      { label: 'Feels usable', chipLabel: 'Feels usable' }
    ],
    no: [
      { label: 'Needs more distinction', chipLabel: 'Needs distinction' },
      { label: 'Focal point is unclear', chipLabel: 'Needs focus' },
      { label: 'Does not push far enough', chipLabel: 'Does not go far enough' }
    ],
    unsure: [
      { label: 'Promising but unresolved', chipLabel: 'Promising, but unresolved' },
      { label: 'Works but needs refinement', chipLabel: 'Needs refinement' }
    ]
  };
}

function normalizeFeedbackReasonOptions(
  entries: unknown,
  fallbackEntries: FeedbackReasonOption[],
  maxItems: number
): FeedbackReasonOption[] {
  if (!Array.isArray(entries)) {
    return fallbackEntries.slice(0, maxItems);
  }

  const normalized = entries
    .map((entry): FeedbackReasonOption | null => {
      if (typeof entry === 'string') {
        const label = cleanText(entry);
        return label ? { label, chipLabel: label } : null;
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const label = cleanText((entry as any).label);
      if (!label) {
        return null;
      }

      return {
        label,
        chipLabel: cleanText((entry as any).chipLabel) || label,
        systemInterpretation: cleanText((entry as any).systemInterpretation) || undefined,
        followUpFocus: cleanText((entry as any).followUpFocus) || undefined,
        dimension: cleanText((entry as any).dimension) as FeedbackReasonOption['dimension'] | undefined,
        ambiguity: cleanText((entry as any).ambiguity) as FeedbackReasonOption['ambiguity'] | undefined,
        likelyFollowUp: cleanText((entry as any).likelyFollowUp) as FeedbackReasonOption['likelyFollowUp'] | undefined,
        followUpStage: cleanText((entry as any).followUpStage) as FeedbackReasonOption['followUpStage'] | undefined
      };
    })
    .filter((entry): entry is FeedbackReasonOption => Boolean(entry))
    .slice(0, maxItems);

  return normalized.length > 0 ? normalized : fallbackEntries.slice(0, maxItems);
}

export function normalizeImageAnalysis(raw: any, index = 0, directionAngle?: string, direction?: string): ImageDesignAnalysis {
  const fallbackTitle = titleFromAngle(directionAngle, index);
  const summary =
    cleanText(raw?.summary) ||
    ensureSentence(directionAngle || `This option explores ${fallbackTitle.toLowerCase()} as a distinct route.`);
  const designKeywords = Array.isArray(raw?.designKeywords)
    ? raw.designKeywords.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 6)
    : [];
  const feedbackSuggestions = raw?.feedbackSuggestions ?? buildFallbackFeedbackSuggestions(directionAngle);
  const fallbackSuggestions = buildFallbackFeedbackSuggestions(directionAngle);

  return {
    title: cleanText(raw?.title) || fallbackTitle,
    summary,
    supportsGoal:
      cleanText(raw?.supportsGoal) ||
      ensureSentence(`It keeps the post goal visible through ${fallbackTitle.toLowerCase()}`),
    differencesFromSiblings:
      Array.isArray(raw?.differencesFromSiblings)
        ? raw.differencesFromSiblings.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 3)
        : [`Pushes ${fallbackTitle.toLowerCase()} more directly than the other options`],
    designKeywords: designKeywords.length > 0 ? designKeywords : [fallbackTitle.toLowerCase(), 'clear hierarchy', 'social-ready'],
    feedbackSuggestions: {
      yes: normalizeFeedbackReasonOptions(feedbackSuggestions?.yes, fallbackSuggestions.yes, 4),
      no: normalizeFeedbackReasonOptions(feedbackSuggestions?.no, fallbackSuggestions.no, 4),
      unsure: normalizeFeedbackReasonOptions(feedbackSuggestions?.unsure, fallbackSuggestions.unsure, 3)
    },
    suggestedEdits:
      Array.isArray(raw?.suggestedEdits)
        ? raw.suggestedEdits.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 4)
        : ['Tighten the focal point', 'Refine the crop', 'Clarify the main emphasis'],
    vibe: cleanText(raw?.vibe) || cleanText(direction) || 'focused'
  };
}

export function normalizeBatchAnalysis(raw: any): BatchAnalysis | undefined {
  if (!raw) {
    return undefined;
  }

  const visibleChanges = Array.isArray(raw.visible_changes)
    ? raw.visible_changes.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 4)
    : [];
  const keywordShifts = Array.isArray(raw.keyword_shifts)
    ? raw.keyword_shifts.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 4)
    : [];
  const biasSuggestions = Array.isArray(raw.bias_suggestions)
    ? raw.bias_suggestions.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 4)
    : [];
  const feedbackTrace = Array.isArray(raw.feedback_trace)
    ? raw.feedback_trace.map((entry: unknown) => cleanText(entry)).filter(Boolean).slice(0, 4)
    : [];

  return {
    overallDelta: cleanText(raw.overallDelta),
    visible_changes: visibleChanges,
    continuity: cleanText(raw.continuity),
    keyword_shifts: keywordShifts,
    bias_suggestions: biasSuggestions,
    feedback_trace: feedbackTrace
  };
}

function buildFallbackBatchAnalysis({
  direction,
  directionAngles,
  count,
  clarificationSummaries
}: {
  direction: string;
  directionAngles?: string[];
  count: number;
  clarificationSummaries?: string[];
}): BatchAnalysis {
  const angles = (directionAngles ?? []).slice(0, count).map(angle => cleanText(angle)).filter(Boolean);
  return {
    overallDelta: ensureSentence(direction || 'Opened a new set of visual variations'),
    visible_changes: angles.slice(0, 3),
    continuity: 'Keeps the same post goal while changing the execution.',
    keyword_shifts: angles.slice(0, 4).map(angle => titleFromAngle(angle, 0).toLowerCase()),
    bias_suggestions: angles.slice(0, 4).map(angle => `Lean further into ${titleFromAngle(angle, 0).toLowerCase()}`),
    feedback_trace: clarificationSummaries?.slice(0, 4) ?? []
  };
}

export function findNearestGridBatch(history: Map<string, Gen>, startingBatchId: string | null): string | null {
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

export function findLatestGridBatchId(nodes: Iterable<PostNode>): string | null {
  const batchMap = new Map<string, { timestamp: number; count: number }>();

  for (const node of nodes) {
    const batchId = node.metadata?.batchId;
    if (!batchId) {
      continue;
    }

    const current = batchMap.get(batchId);
    if (!current) {
      batchMap.set(batchId, { timestamp: node.timestamp, count: 1 });
      continue;
    }

    current.count += 1;
    if (node.timestamp > current.timestamp) {
      current.timestamp = node.timestamp;
    }
  }

  return Array.from(batchMap.entries())
    .filter(([, meta]) => meta.count === 4)
    .sort((left, right) => right[1].timestamp - left[1].timestamp)[0]?.[0] ?? null;
}

export function countGeneratedImages(nodes: Iterable<PostNode>): number {
  return Array.from(nodes).filter(node => node.actionType !== 'selection').length;
}

export function getLastGeneratedAt(nodes: Iterable<PostNode>): number | null {
  const timestamps = Array.from(nodes)
    .filter(node => node.actionType !== 'selection')
    .map(node => node.timestamp);

  if (timestamps.length === 0) {
    return null;
  }

  return Math.max(...timestamps);
}

export function buildInitialDirectionPlan({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  businessGoalTitle,
  folder
}: {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  folder: Pick<PostGoalFolder, 'title' | 'description' | 'taxonomyTags' | 'imageTypeChips' | 'directionAngles' | 'assistantPrompt'>;
}) {
  const savedDirectionAngles = folder.directionAngles?.filter(Boolean).slice(0, 4) ?? [];
  const commonThemes = folder.imageTypeChips?.slice(0, 6) ?? [];

  const goalDescription = folder.description.trim();
  const shortNarrative = brandNarrative?.trim().replace(/\s+/g, ' ').slice(0, 220) ?? '';
  const contextLabel = businessGoalTitle ? businessGoalTitle.toLowerCase() : 'the current business goal';

  const angleA = commonThemes[0] ?? 'visible brand action';
  const angleB = commonThemes[1] ?? 'a real-world moment';
  const angleC = commonThemes[2] ?? 'human presence';
  const angleD = commonThemes[3] ?? 'a memorable brand signal';

  const directionAngles = savedDirectionAngles.length === 4
    ? savedDirectionAngles
    : [
        `Hero-led Instagram composition showing ${folder.title.toLowerCase()} through ${angleA} in a clear, believable scene.`,
        `Documentary-style post centered on ${angleB} so the brand feels active, grounded, and credible.`,
        `Human-centered visual using ${angleC} to make ${contextLabel} feel emotionally legible.`,
        `Editorial social post translating ${goalDescription.toLowerCase()} through ${angleD} and a strong visual hierarchy.`
      ];

  const briefLines = [
    `Brand: ${brandName} (${brandCategory})`,
    brandIdentity ? `Brand identity: ${brandIdentity}` : null,
    shortNarrative ? `Brand narrative: ${shortNarrative}` : null,
    businessGoalTitle ? `Business goal: ${businessGoalTitle}` : null,
    `Post goal: ${folder.title}`,
    goalDescription ? `What this post goal explores: ${goalDescription}` : null,
    commonThemes.length ? `Image types that fit this direction: ${commonThemes.join(', ')}` : null,
    meaningfullyDistinctText(folder.assistantPrompt, goalDescription)
      ? `Direction anchor: ${folder.assistantPrompt}`
      : null
  ].filter(Boolean);

  return {
    brief: `${briefLines.join('\n')}\nCreate four distinct but coherent Instagram-ready directions for this post goal.`,
    directionAngles,
    commonThemes
  };
}

export function buildIterativeDirectionAngles({
  posts,
  parentNode,
  direction,
  fallbackAngles
}: {
  posts: PostNode[];
  parentNode: PostNode | null;
  direction?: string;
  fallbackAngles?: string[];
}) {
  const batchAnalysis = posts.find(post => post.metadata?.batchAnalysis)?.metadata?.batchAnalysis;
  const biasSuggestions = batchAnalysis?.bias_suggestions?.filter(Boolean).slice(0, 4) ?? [];
  const parentAnalysis = parentNode?.analysis;
  const parentAngle = parentNode?.metadata?.directionAngle;
  const siblingAnchors = posts
    .map(post => post.analysis?.title || post.metadata?.directionAngle || post.analysis?.summary || '')
    .map(value => cleanText(value))
    .filter(Boolean);

  const dynamicAngles = [
    cleanText(
      parentAnalysis?.summary ||
        parentAngle ||
        (direction
          ? `Refine this direction while changing the crop, layout, and focal hierarchy so it does not feel like a duplicate.`
          : '')
    ),
    ...biasSuggestions.map(suggestion =>
      `Explore a variation that pushes ${suggestion.toLowerCase()} while staying within the same post goal.`
    ),
    ...siblingAnchors.map(anchor =>
      `Create a visibly different route using ${anchor.toLowerCase()} with a new composition and styling logic.`
    )
  ]
    .map(value => cleanText(value))
    .filter(Boolean);

  const deduped: string[] = [];
  for (const value of dynamicAngles) {
    if (!deduped.includes(value)) {
      deduped.push(value);
    }
    if (deduped.length === 4) {
      break;
    }
  }

  if (deduped.length < 4) {
    for (const fallback of fallbackAngles ?? []) {
      const cleaned = cleanText(fallback);
      if (!cleaned || deduped.includes(cleaned)) {
        continue;
      }
      deduped.push(cleaned);
      if (deduped.length === 4) {
        break;
      }
    }
  }

  return deduped.slice(0, 4);
}

export function createSeedPreviewNode({
  batchId,
  batchTime,
  imageUrl,
  direction,
  directionAngle,
  analysis,
  batchAnalysis,
  postGoalContext
}: {
  batchId: string;
  batchTime: number;
  imageUrl: string;
  direction: string;
  directionAngle?: string;
  analysis?: ImageDesignAnalysis;
  batchAnalysis?: BatchAnalysis;
  postGoalContext: PostGoalContextMetadata;
}): PostNode {
  const normalizedAnalysis = analysis
    ? normalizeImageAnalysis(analysis, 0, directionAngle, direction)
    : undefined;

  return {
    id: `${batchId}-0`,
    imageUrl,
    keywords: normalizedAnalysis?.designKeywords ?? [],
    vibe: normalizedAnalysis?.vibe ?? '',
    analysis: normalizedAnalysis,
    deltaFromParent: 'Seeded from the post-goal example image',
    parentId: null,
    actionType: 'initial',
    timestamp: batchTime,
    metadata: {
      batchId,
      parentBatchId: null,
      similarity: 50,
      direction,
      directionAngle,
      indexInBatch: 0,
      seededFromPreview: true,
      batchAnalysis,
      postGoalContext
    }
  };
}

export function buildFallbackDelta(
  actionType: PostStudioActionType,
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

export function createGeneratedNodes({
  posts,
  batchId,
  batchTime,
  parentNodeId,
  parentBatchId,
  actionType,
  fallbackDelta,
  similarity,
  direction,
  directionAngles,
  selectedGridIndex,
  parentNode,
  editOptions,
  indexOffset = 0,
  batchAnalysis,
  postGoalContext,
  clarificationSummaries
}: {
  posts: any[];
  batchId: string;
  batchTime: number;
  parentNodeId: string | null;
  parentBatchId: string | null;
  actionType: PostStudioActionType;
  fallbackDelta: string;
  similarity: number;
  direction: string;
  directionAngles?: string[];
  selectedGridIndex: number | null;
  parentNode: PostNode | null;
  editOptions?: EditOptions;
  indexOffset?: number;
  batchAnalysis?: BatchAnalysis;
  postGoalContext?: PostGoalContextMetadata;
  clarificationSummaries?: string[];
}): PostNode[] {
  const normalizedBatchAnalysis = batchAnalysis ? normalizeBatchAnalysis(batchAnalysis) : undefined;
  const batchAnalysisWithClarification = normalizedBatchAnalysis
    ? {
        ...normalizedBatchAnalysis,
        feedback_trace: Array.from(
          new Set([
            ...(clarificationSummaries ?? []),
            ...(normalizedBatchAnalysis.feedback_trace ?? [])
          ])
        ).slice(0, 4)
      }
    : undefined;

  return (posts || []).map((post: any, index: number) => {
    const constDirectionAngle = directionAngles?.[index + indexOffset];
    const constAnalysis = normalizeImageAnalysis(
      post.analysis,
      index + indexOffset,
      constDirectionAngle,
      direction
    );

    return {
      id: `${batchId}-${index + indexOffset}`,
      imageUrl: post.imageUrl,
      keywords: constAnalysis.designKeywords ?? post.keywords ?? [],
      vibe: post.vibe || constAnalysis.vibe || post.metadata?.vibe || '',
      deltaFromParent: post.deltaFromParent || post.delta || fallbackDelta,
      deltaDetails: post.deltaDetails,
      analysis: constAnalysis,
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
        similarity,
        direction,
        directionAngle: constDirectionAngle,
        indexInBatch: index + indexOffset,
        batchAnalysis: batchAnalysisWithClarification,
        postGoalContext,
        clarificationSummaries
      }
    };
  });
}

export function createPlaceholderNodes({
  batchId,
  batchTime,
  parentNodeId,
  parentBatchId,
  actionType,
  fallbackDelta,
  similarity,
  direction,
  directionAngles,
  indexOffset = 0,
  postGoalContext,
  count,
  clarificationSummaries
}: {
  batchId: string;
  batchTime: number;
  parentNodeId: string | null;
  parentBatchId: string | null;
  actionType: PostStudioActionType;
  fallbackDelta: string;
  similarity: number;
  direction: string;
  directionAngles?: string[];
  indexOffset?: number;
  postGoalContext?: PostGoalContextMetadata;
  count: number;
  clarificationSummaries?: string[];
}): PostNode[] {
  const fallbackBatchAnalysis = buildFallbackBatchAnalysis({
    direction,
    directionAngles,
    count: count + indexOffset,
    clarificationSummaries
  });
  return Array.from({ length: count }, (_, index) => {
    const constDirectionAngle = directionAngles?.[index + indexOffset];
    const constAnalysis = normalizeImageAnalysis({}, index + indexOffset, constDirectionAngle, direction);

    return {
      id: `${batchId}-${index + indexOffset}`,
      imageUrl: buildPlaceholderImageDataUrl(index + indexOffset),
      keywords: constAnalysis.designKeywords ?? [],
      vibe: constAnalysis.vibe ?? '',
      analysis: constAnalysis,
      deltaFromParent: fallbackDelta,
      parentId: parentNodeId,
      actionType,
      timestamp: batchTime,
      metadata: {
        batchId,
        parentBatchId,
        similarity,
        direction,
        directionAngle: constDirectionAngle,
        indexInBatch: index + indexOffset,
        batchAnalysis: fallbackBatchAnalysis,
        postGoalContext,
        clarificationSummaries
      }
    };
  });
}
