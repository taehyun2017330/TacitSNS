import type { BatchAnalysis, FeedbackReasonOption, FeedbackType, ImageDesignAnalysis, PostNode } from '../history/types';
import {
  FEEDBACK_REASON_OPTIONS,
  getFeedbackReasonMeta,
  type FeedbackReasonMeta
} from './feedbackOptions';

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueTexts(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function normalizeReasonSuggestionEntries(entries: FeedbackReasonOption[] | undefined) {
  return Array.isArray(entries)
    ? entries
        .map(entry => {
          const label = cleanText(entry?.label);
          if (!label) {
            return null;
          }

          return {
            label,
            chipLabel: cleanText(entry?.chipLabel) || label,
            systemInterpretation: cleanText(entry?.systemInterpretation) || undefined,
            followUpFocus: cleanText(entry?.followUpFocus) || undefined,
            dimension: entry?.dimension,
            ambiguity: entry?.ambiguity,
            likelyFollowUp: entry?.likelyFollowUp,
            followUpStage: entry?.followUpStage
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [];
}

export function formatDisplayLabel(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) return cleaned;

  const letters = cleaned.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return cleaned;

  const uppercaseCount = (letters.match(/[A-Z]/g) ?? []).length;
  if (uppercaseCount / letters.length > 0.6) {
    const lowered = cleaned.toLowerCase();
    return lowered.charAt(0).toUpperCase() + lowered.slice(1);
  }

  return cleaned;
}

export function getPostAnalysis(post: PostNode): ImageDesignAnalysis | undefined {
  return post.analysis;
}

export function getFeedbackReasonOptions(post: PostNode, type: FeedbackType): string[] {
  if (!type) {
    return [];
  }

  const dynamicSuggestions = normalizeReasonSuggestionEntries(post.analysis?.feedbackSuggestions?.[type])
    .map(entry => entry.label);

  if (dynamicSuggestions.length > 0) {
    const fallbackOptions = FEEDBACK_REASON_OPTIONS[type] ?? [];
    return Array.from(new Set([...dynamicSuggestions, ...fallbackOptions])).slice(0, 6);
  }

  return FEEDBACK_REASON_OPTIONS[type] ?? [];
}

export interface GuidedReasonOption extends FeedbackReasonMeta {
  label: string;
  chipLabel: string;
}

function scoreGuidedReasonOption(
  option: GuidedReasonOption,
  type: FeedbackType,
  fallbackSet: Set<string>
) {
  let score = fallbackSet.has(option.label) ? 24 : 0;

  if (option.followUpStage === 'macro') {
    score += 18;
  }

  if (option.likelyFollowUp === 'probe' || option.likelyFollowUp === 'clarify') {
    score += 16;
  } else if (option.likelyFollowUp === 'summarize') {
    score += 10;
  }

  if (option.ambiguity === 'high') {
    score += 9;
  } else if (option.ambiguity === 'medium') {
    score += 5;
  }

  if (type === 'yes' && option.likelyFollowUp === 'summarize') {
    score += 5;
  }

  if ((type === 'no' || type === 'unsure') && option.followUpStage === 'micro') {
    score += 4;
  }

  score -= option.chipLabel.length * 0.02;
  return score;
}

export function getGuidedReasonOptions(post: PostNode, type: FeedbackType): GuidedReasonOption[] {
  if (!type) {
    return [];
  }

  const dynamicSuggestions = normalizeReasonSuggestionEntries(post.analysis?.feedbackSuggestions?.[type]);
  const fallbackOptions = FEEDBACK_REASON_OPTIONS[type] ?? [];
  const fallbackSet = new Set(fallbackOptions);
  const dynamicByLabel = new Map(dynamicSuggestions.map(entry => [entry.label, entry]));
  const candidates = uniqueTexts([...fallbackOptions, ...dynamicSuggestions.map(entry => entry.label)]).map(label => {
    const meta = {
      ...getFeedbackReasonMeta(label),
      ...(dynamicByLabel.get(label) ?? {})
    };
    return {
      ...meta,
      label,
      chipLabel: meta.chipLabel ?? formatDisplayLabel(label)
    };
  });

  const ranked = [...candidates].sort((left, right) => (
    scoreGuidedReasonOption(right, type, fallbackSet) - scoreGuidedReasonOption(left, type, fallbackSet)
  ));

  const selected: GuidedReasonOption[] = [];
  const pushOption = (option?: GuidedReasonOption) => {
    if (!option || selected.some(entry => entry.label === option.label) || selected.length >= 5) {
      return;
    }
    selected.push(option);
  };

  pushOption(ranked.find(option => option.followUpStage === 'micro' && (
    option.likelyFollowUp === 'probe' || option.likelyFollowUp === 'clarify'
  )));
  pushOption(ranked.find(option => option.followUpStage === 'macro'));

  ranked.forEach(pushOption);

  return selected.slice(0, 5).map(option => ({
    ...option,
    chipLabel: option.chipLabel ?? formatDisplayLabel(option.label)
  }));
}

export function getSuggestedEdits(post: PostNode): string[] {
  const analysisEdits = post.analysis?.suggestedEdits?.filter(Boolean);
  if (analysisEdits && analysisEdits.length > 0) {
    return analysisEdits;
  }

  return [
    'Tighten the focal point',
    'Simplify the supporting elements',
    'Clarify the product or subject emphasis',
    'Refine the light and contrast',
  ];
}

export function getBatchAnalysis(posts: PostNode[]): BatchAnalysis | undefined {
  return posts.find(post => post.metadata?.batchAnalysis)?.metadata?.batchAnalysis;
}

export function getBatchBiasSuggestions(posts: PostNode[]): string[] {
  const analysis = getBatchAnalysis(posts);
  const biasSuggestions = analysis?.bias_suggestions?.filter(Boolean) ?? [];
  if (biasSuggestions.length > 0) {
    return biasSuggestions.slice(0, 4);
  }

  const fallback = posts
    .flatMap(post => post.analysis?.designKeywords ?? [])
    .map(cleanText)
    .filter(Boolean);

  return Array.from(new Set(fallback)).slice(0, 4).map(keyword => `Push further into ${keyword}`);
}

export function getBatchDeltaSummary(posts: PostNode[]): string {
  const analysis = getBatchAnalysis(posts);
  return cleanText(analysis?.overallDelta) || cleanText(posts[0]?.deltaFromParent) || 'New image set';
}

export function getBatchKeywordShiftSummary(posts: PostNode[]): string[] {
  const analysis = getBatchAnalysis(posts);
  const shifts = analysis?.keyword_shifts?.map(cleanText).filter(Boolean) ?? [];
  if (shifts.length > 0) {
    return shifts.slice(0, 4);
  }

  return posts
    .flatMap(post => post.analysis?.designKeywords ?? [])
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 4);
}

export function getTraceEdgeLabel(batchAnalysis?: BatchAnalysis, fallbackDelta?: string) {
  const delta = cleanText(batchAnalysis?.overallDelta) || cleanText(fallbackDelta);
  const shifts = batchAnalysis?.keyword_shifts?.map(cleanText).filter(Boolean).slice(0, 2) ?? [];
  if (!delta && shifts.length === 0) {
    return '';
  }
  if (!delta) {
    return shifts.join(' · ');
  }
  if (shifts.length === 0) {
    return `Δ: ${delta}`;
  }
  return `Δ: ${delta} · ${shifts.join(' · ')}`;
}
