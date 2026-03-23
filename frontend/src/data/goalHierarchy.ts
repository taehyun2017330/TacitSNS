import type { BrandData } from '../types/brand';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../types/workspace';
import postGoalFallbackLibrary from './postGoalFallbackLibrary.json';

type GoalDefinition = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  fallbackRationale: string;
};

type TaxonomyDefinition = {
  label: string;
  definition: string;
  themes: string[];
};

const BUSINESS_GOAL_LIBRARY: GoalDefinition[] = [
  {
    id: 'awareness',
    title: 'Increase awareness',
    description: 'Help more people notice the brand and remember what it stands for.',
    keywords: ['discover', 'noticed', 'awareness', 'launch', 'introduce', 'memorable', 'new', 'visibility'],
    fallbackRationale: 'The brand story needs a stronger first impression so new audiences understand what it is quickly.'
  },
  {
    id: 'trust',
    title: 'Build trust',
    description: 'Make the brand feel credible, safe, and worth believing in.',
    keywords: ['trust', 'safe', 'credible', 'science', 'proof', 'professional', 'legit', 'quality', 'expert'],
    fallbackRationale: 'The brand language suggests users need confidence before they act.'
  },
  {
    id: 'educate',
    title: 'Educate customers',
    description: 'Explain what the product does, how it works, and why it matters.',
    keywords: ['explain', 'understand', 'why', 'how', 'tips', 'learn', 'ingredient', 'process', 'sensitive', 'question'],
    fallbackRationale: 'The brand would benefit from clearer explanation and guidance so customers know how to evaluate it.'
  },
  {
    id: 'engagement',
    title: 'Drive engagement',
    description: 'Invite people to react, comment, share, and participate with the brand.',
    keywords: ['engage', 'share', 'comment', 'conversation', 'participate', 'interactive', 'talk', 'fun', 'viral'],
    fallbackRationale: 'The brand can use lighter conversational posts to increase interaction and signal relevance.'
  },
  {
    id: 'sales',
    title: 'Generate sales/leads',
    description: 'Move viewers toward inquiries, purchases, bookings, or signups.',
    keywords: ['buy', 'order', 'sales', 'lead', 'conversion', 'book', 'signup', 'dm', 'purchase', 'offer'],
    fallbackRationale: 'The brand positioning should eventually support clear action and conversion, not just aesthetics.'
  },
  {
    id: 'community',
    title: 'Strengthen community/loyalty',
    description: 'Reinforce belonging, repeat engagement, and longer-term attachment.',
    keywords: ['community', 'loyal', 'repeat', 'member', 'belong', 'loyalty', 'fans', 'relationship'],
    fallbackRationale: 'The brand story suggests value in making customers feel included and remembered over time.'
  }
];

export function getBusinessGoalLibrary() {
  return BUSINESS_GOAL_LIBRARY.map(goal => ({ ...goal }));
}

const POST_TAXONOMY_LIBRARY: Record<string, TaxonomyDefinition> = {
  Emotional: {
    label: 'Emotional',
    definition: 'Evokes feeling through mood, story, humor, or emotional language.',
    themes: ['emotional storytelling', 'light humor', 'wonder', 'feeling-led framing']
  },
  Functional: {
    label: 'Functional',
    definition: 'Highlights concrete product or service attributes such as performance, quality, design, or claims.',
    themes: ['feature claims', 'quality cues', 'reviews', 'proof of performance']
  },
  Educational: {
    label: 'Educational',
    definition: 'Helps people understand how something works or learn something useful around the brand.',
    themes: ['tips', 'instructions', 'how it works', 'informative breakdowns']
  },
  'Brand resonance': {
    label: 'Brand resonance',
    definition: 'Directs attention to the brand promise, identity, personality, or what the brand stands for.',
    themes: ['brand identity', 'personality', 'promise', 'brand image']
  },
  Experiential: {
    label: 'Experiential',
    definition: 'Focuses on the sensory or lived experience of the brand in use.',
    themes: ['in-use moments', 'sensory appeal', 'atmosphere', 'events']
  },
  'Current event': {
    label: 'Current event',
    definition: 'Uses a timely cultural, seasonal, or conversational hook to make the post feel current.',
    themes: ['seasonal hooks', 'holidays', 'cultural moments', 'timely trends']
  },
  'Personal brand posts': {
    label: 'Personal brand posts',
    definition: 'Centers personal stories, preferences, anecdotes, or personally meaningful everyday context.',
    themes: ['personal perspective', 'everyday preferences', 'lived moments', 'human context']
  },
  Employee: {
    label: 'Employee',
    definition: 'Uses employee or founder perspective to make expertise, worldview, or human presence visible.',
    themes: ['founder stories', 'expert voice', 'team perspective', 'behind the scenes']
  },
  'Brand community': {
    label: 'Brand community',
    definition: 'Builds belonging and participation around the brand’s audience or community.',
    themes: ['audience participation', 'member identity', 'UGC', 'community prompts']
  },
  'Customer relationship': {
    label: 'Customer relationship',
    definition: 'Asks for or presents customer feedback, proof, service, or customer experience.',
    themes: ['testimonials', 'reviews', 'feedback', 'customer stories']
  },
  'Cause-related brand posts': {
    label: 'Cause-related brand posts',
    definition: 'Highlights social causes or initiatives the brand supports.',
    themes: ['social causes', 'initiatives', 'values in action', 'community support']
  },
  'Sales promotion': {
    label: 'Sales promotion',
    definition: 'Encourages action toward a buying decision using clear transactional or offer-driven framing.',
    themes: ['discounts', 'offers', 'availability', 'competitions']
  }
};

type SharedPostGoalFallback = Pick<PostGoalSuggestion, 'id' | 'title' | 'description' | 'taxonomyTags' | 'assistantPrompt'>;

const POST_GOAL_LIBRARY = postGoalFallbackLibrary as Record<string, SharedPostGoalFallback[]>;

const POST_GOAL_PREVIEWS: Record<string, Pick<PostGoalSuggestion, 'previewTitle' | 'previewCaption' | 'previewBackground'>> = {
  'trust-quality-process': {
    previewTitle: 'Materials, hands, proof',
    previewCaption: 'Close, credible details with process cues and restrained text.',
    previewBackground: 'linear-gradient(135deg, #cbbca8 0%, #f4eadc 52%, #8ea39a 100%)'
  },
  'trust-founder-expert': {
    previewTitle: 'Founder portrait',
    previewCaption: 'An expert-centered frame with human presence and calm authority.',
    previewBackground: 'linear-gradient(135deg, #8f6b57 0%, #dcc5b1 48%, #f5ede2 100%)'
  },
  'trust-customer-proof': {
    previewTitle: 'Review + result',
    previewCaption: 'Proof-led composition with a testimonial feel and outcome cues.',
    previewBackground: 'linear-gradient(135deg, #9bb0a6 0%, #f5ede2 42%, #d8c2ae 100%)'
  },
  'trust-brand-stance': {
    previewTitle: 'Quiet brand manifesto',
    previewCaption: 'Clear statement, generous space, strong editorial confidence.',
    previewBackground: 'linear-gradient(135deg, #233f3c 0%, #5d746d 42%, #efe5d8 100%)'
  },
  'awareness-brand-personality': {
    previewTitle: 'Signature mood',
    previewCaption: 'Distinctive brand texture and memorable tone over explanation.',
    previewBackground: 'linear-gradient(135deg, #886650 0%, #dfc2a4 54%, #f7efe3 100%)'
  },
  'awareness-timely-conversation': {
    previewTitle: 'Seasonal hook',
    previewCaption: 'Time-sensitive framing that keeps the brand visually recognizable.',
    previewBackground: 'linear-gradient(135deg, #d3a774 0%, #f6ead7 48%, #97aa9d 100%)'
  },
  'awareness-product-experience': {
    previewTitle: 'In-use moment',
    previewCaption: 'Sensory or lifestyle-led composition that makes the experience easy to picture.',
    previewBackground: 'linear-gradient(135deg, #8ea39a 0%, #e7dbcc 45%, #f8f2ea 100%)'
  },
  'awareness-memorable-introduction': {
    previewTitle: 'First impression post',
    previewCaption: 'Brand-forward image for recognition, mood, and quick understanding.',
    previewBackground: 'linear-gradient(135deg, #35514d 0%, #71887f 44%, #f1e5d5 100%)'
  },
  'educate-how-it-works': {
    previewTitle: 'Explainer layout',
    previewCaption: 'Clear steps, labeled objects, and a teaching-oriented frame.',
    previewBackground: 'linear-gradient(135deg, #bda48a 0%, #f6ecdf 44%, #7b958b 100%)'
  },
  'educate-why-different': {
    previewTitle: 'Why it is different',
    previewCaption: 'A side-by-side or ingredient-led frame that clarifies differentiation.',
    previewBackground: 'linear-gradient(135deg, #7b958b 0%, #efe4d7 45%, #d4bca5 100%)'
  },
  'educate-common-question': {
    previewTitle: 'Question answered',
    previewCaption: 'One concern, one calm answer, presented with visual clarity.',
    previewBackground: 'linear-gradient(135deg, #a58064 0%, #f5eadf 50%, #8fa59e 100%)'
  },
  'educate-use-case': {
    previewTitle: 'Best use case',
    previewCaption: 'A practical, context-rich frame showing when the offer fits best.',
    previewBackground: 'linear-gradient(135deg, #8fa59e 0%, #f7efe5 48%, #ceb59e 100%)'
  },
  'engagement-opinion-hook': {
    previewTitle: 'Quick reaction prompt',
    previewCaption: 'A playful but controlled question designed for easy audience response.',
    previewBackground: 'linear-gradient(135deg, #ddbb91 0%, #fff5ea 52%, #8ea39a 100%)'
  },
  'engagement-personal-angle': {
    previewTitle: 'Behind the scenes',
    previewCaption: 'Human, close, and conversational rather than polished sales-first.',
    previewBackground: 'linear-gradient(135deg, #8d6f5b 0%, #edd9c6 50%, #f8f3ec 100%)'
  },
  'engagement-community-prompt': {
    previewTitle: 'Audience invitation',
    previewCaption: 'An open prompt that makes participation feel easy and welcome.',
    previewBackground: 'linear-gradient(135deg, #6b877f 0%, #f2e5d8 48%, #d4b18c 100%)'
  },
  'engagement-playful-moment': {
    previewTitle: 'Playful brand moment',
    previewCaption: 'Lighter, more energetic framing that still stays visually clean.',
    previewBackground: 'linear-gradient(135deg, #d8a36f 0%, #f5e4cf 45%, #7f978e 100%)'
  },
  'sales-offer-highlight': {
    previewTitle: 'Offer-first frame',
    previewCaption: 'Clear product, concise value cue, and easy action-oriented hierarchy.',
    previewBackground: 'linear-gradient(135deg, #29504b 0%, #708980 44%, #f3e3d1 100%)'
  },
  'sales-worth-buying': {
    previewTitle: 'Reason to buy',
    previewCaption: 'Balance aspiration and practical proof in one conversion-friendly image.',
    previewBackground: 'linear-gradient(135deg, #9eb2a7 0%, #f8f2ea 42%, #caa787 100%)'
  },
  'sales-result-experience': {
    previewTitle: 'Desired outcome',
    previewCaption: 'Show the end state people want, not only the object itself.',
    previewBackground: 'linear-gradient(135deg, #d1b18f 0%, #f7eee3 48%, #8ea39a 100%)'
  },
  'sales-objection-answer': {
    previewTitle: 'Calm objection handling',
    previewCaption: 'Reduce hesitation with reassuring composition and concrete cues.',
    previewBackground: 'linear-gradient(135deg, #8a9f95 0%, #efe1d3 48%, #b28a69 100%)'
  },
  'community-customer-spotlight': {
    previewTitle: 'Community spotlight',
    previewCaption: 'Recognition-led post with warmth, names, and human belonging cues.',
    previewBackground: 'linear-gradient(135deg, #8d6d58 0%, #ebd4bf 45%, #f8f2ea 100%)'
  },
  'community-shared-values': {
    previewTitle: 'Shared values',
    previewCaption: 'Editorial statement framing for brand values and community alignment.',
    previewBackground: 'linear-gradient(135deg, #274440 0%, #6f877f 45%, #efe2d2 100%)'
  },
  'community-returning-routine': {
    previewTitle: 'Recurring ritual',
    previewCaption: 'Series-ready composition that feels consistent and recognizable.',
    previewBackground: 'linear-gradient(135deg, #d5b28b 0%, #f7eee2 45%, #8ca198 100%)'
  },
  'community-feedback-loop': {
    previewTitle: 'Feedback invitation',
    previewCaption: 'Ask for reactions in a way that feels relational, not needy.',
    previewBackground: 'linear-gradient(135deg, #98aca0 0%, #f5ede2 44%, #b89476 100%)'
  }
};

const TAXONOMY_PREVIEW_BACKGROUNDS: Record<string, string> = {
  Functional: 'linear-gradient(135deg, #bda48a 0%, #f6ecdf 44%, #7b958b 100%)',
  Educational: 'linear-gradient(135deg, #8fa59e 0%, #f7efe5 48%, #ceb59e 100%)',
  Emotional: 'linear-gradient(135deg, #886650 0%, #dfc2a4 54%, #f7efe3 100%)',
  'Brand resonance': 'linear-gradient(135deg, #35514d 0%, #71887f 44%, #f1e5d5 100%)',
  Experiential: 'linear-gradient(135deg, #8ea39a 0%, #e7dbcc 45%, #f8f2ea 100%)',
  'Current event': 'linear-gradient(135deg, #d3a774 0%, #f6ead7 48%, #97aa9d 100%)',
  'Personal brand posts': 'linear-gradient(135deg, #8d6f5b 0%, #edd9c6 50%, #f8f3ec 100%)',
  Employee: 'linear-gradient(135deg, #8f6b57 0%, #dcc5b1 48%, #f5ede2 100%)',
  'Brand community': 'linear-gradient(135deg, #6b877f 0%, #f2e5d8 48%, #d4b18c 100%)',
  'Customer relationship': 'linear-gradient(135deg, #9bb0a6 0%, #f5ede2 42%, #d8c2ae 100%)',
  'Cause-related brand posts': 'linear-gradient(135deg, #274440 0%, #6f877f 45%, #efe2d2 100%)',
  'Sales promotion': 'linear-gradient(135deg, #29504b 0%, #708980 44%, #f3e3d1 100%)',
  Custom: 'linear-gradient(135deg, #35514d 0%, #8ca198 42%, #f1e5d5 100%)'
};

const DEFAULT_GOAL_ORDER = ['trust', 'awareness', 'sales'] as const;
const DEFAULT_POST_GOAL_KEY = 'trust';

function scoreGoal(definition: GoalDefinition, text: string) {
  const lowered = text.toLowerCase();
  return definition.keywords.reduce((total, keyword) => {
    if (lowered.includes(keyword)) {
      return total + 2;
    }
    return total;
  }, 0);
}

function buildGoalRationale(definition: GoalDefinition, text: string) {
  const lowered = text.toLowerCase();
  const matchingKeywords = definition.keywords.filter(keyword => lowered.includes(keyword)).slice(0, 2);
  if (matchingKeywords.length === 0) {
    return definition.fallbackRationale;
  }

  return `Because the brand description emphasizes ${matchingKeywords.map(keyword => `"${keyword}"`).join(' and ')}, this goal is likely to matter early.`;
}

export function inferBusinessGoalOptions(brand: Pick<BrandData, 'description' | 'identity' | 'category' | 'name'>): BusinessGoalOption[] {
  const sourceText = [brand.identity, brand.description, brand.category, brand.name].join(' ').trim();

  const scored = BUSINESS_GOAL_LIBRARY.map(goal => ({
    goal,
    score: scoreGoal(goal, sourceText)
  })).sort((a, b) => b.score - a.score || BUSINESS_GOAL_LIBRARY.findIndex(item => item.id === a.goal.id) - BUSINESS_GOAL_LIBRARY.findIndex(item => item.id === b.goal.id));

  const topGoalIds = new Set(
    scored.some(item => item.score > 0)
      ? scored.slice(0, 3).map(item => item.goal.id)
      : DEFAULT_GOAL_ORDER
  );

  return BUSINESS_GOAL_LIBRARY.map((goal, index) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    rationale: buildGoalRationale(goal, sourceText),
    rank: topGoalIds.has(goal.id)
      ? Array.from(topGoalIds).indexOf(goal.id) + 1
      : index + 4,
    isRecommended: topGoalIds.has(goal.id)
  })).sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return a.rank - b.rank;
  });
}

export function suggestBusinessGoalAutocomplete(input: string) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return BUSINESS_GOAL_LIBRARY.slice(0, 4).map(goal => goal.title);
  }

  return BUSINESS_GOAL_LIBRARY
    .filter(goal =>
      goal.title.toLowerCase().includes(trimmed) ||
      goal.description.toLowerCase().includes(trimmed) ||
      goal.keywords.some(keyword => keyword.includes(trimmed))
    )
    .slice(0, 4)
    .map(goal => goal.title);
}

export function normalizeBusinessGoalInput(
  input: string,
  overrides?: Partial<Pick<BusinessGoalOption, 'description' | 'rationale'>>
): BusinessGoalOption {
  const trimmed = input.trim();
  const lowered = trimmed.toLowerCase();
  const matchedGoal = BUSINESS_GOAL_LIBRARY
    .map(goal => ({
      goal,
      score: scoreGoal(goal, lowered) + (goal.title.toLowerCase().includes(lowered) ? 3 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (matchedGoal && matchedGoal.score > 0) {
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || matchedGoal.goal.id;
    return {
      id: `custom-${slug}`,
      title: trimmed,
      description: overrides?.description?.trim() || `Use social content to support this broader business intention: ${trimmed}.`,
      rationale: overrides?.rationale?.trim() || `Interpreted as "${matchedGoal.goal.title}" under the hood so the system can suggest relevant post goals next.`,
      rank: 0,
      isRecommended: false,
      isCustom: true,
      normalizedFrom: trimmed,
      mappedGoalId: matchedGoal.goal.id,
      mappedGoalTitle: matchedGoal.goal.title
    };
  }

  return {
    id: `custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'goal'}`,
    title: trimmed,
    description: overrides?.description?.trim() || `Use social content to support this broader business intention: ${trimmed}.`,
    rationale: overrides?.rationale?.trim() || `Added directly by the user because it does not cleanly fit one of the shared SNS marketing goal buckets.`,
    rank: 0,
    isRecommended: false,
    isCustom: true
  };
}

export function getPostGoalSuggestionsForBusinessGoal(businessGoalId: string) {
  const resolvedKey = POST_GOAL_LIBRARY[businessGoalId] ? businessGoalId : DEFAULT_POST_GOAL_KEY;
  return (POST_GOAL_LIBRARY[resolvedKey] ?? []).map(goal => normalizePostGoalSuggestion(goal));
}

export function resolvePostGoalSuggestionKey(
  businessGoal: Pick<BusinessGoalOption, 'id' | 'title' | 'description' | 'mappedGoalId'>
) {
  const explicitCandidates = [businessGoal.mappedGoalId, businessGoal.id].filter(Boolean) as string[];
  for (const candidate of explicitCandidates) {
    if (POST_GOAL_LIBRARY[candidate]) {
      return candidate;
    }
  }

  const normalizedGoal = normalizeBusinessGoalInput(`${businessGoal.title} ${businessGoal.description}`);
  const inferredCandidates = [normalizedGoal.mappedGoalId, normalizedGoal.id].filter(Boolean) as string[];
  for (const candidate of inferredCandidates) {
    if (POST_GOAL_LIBRARY[candidate]) {
      return candidate;
    }
  }

  return DEFAULT_POST_GOAL_KEY;
}

export function normalizePostGoalSuggestion(
  suggestion: Pick<PostGoalSuggestion, 'id' | 'title' | 'description' | 'taxonomyTags' | 'assistantPrompt' | 'previewTitle' | 'previewCaption' | 'previewBackground' | 'referenceAssets' | 'sourceLabel'>,
  fallbackIndex = 0
): PostGoalSuggestion {
  const firstTag = suggestion.taxonomyTags[0] ?? 'Custom';
  const derivedId =
    suggestion.id?.trim() ||
    suggestion.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
    `post-goal-${fallbackIndex + 1}`;

  const preview = POST_GOAL_PREVIEWS[derivedId];

  return {
    ...suggestion,
    id: derivedId,
    previewTitle: suggestion.previewTitle || preview?.previewTitle || suggestion.title,
    previewCaption: suggestion.previewCaption || preview?.previewCaption || suggestion.description,
    previewBackground:
      suggestion.previewBackground ||
      preview?.previewBackground ||
      TAXONOMY_PREVIEW_BACKGROUNDS[firstTag] ||
      TAXONOMY_PREVIEW_BACKGROUNDS.Custom
  };
}

export function getTaxonomyDefinitions(tags: string[]) {
  return tags
    .map(tag => POST_TAXONOMY_LIBRARY[tag])
    .filter((definition): definition is TaxonomyDefinition => Boolean(definition));
}

export function suggestPostGoalAutocomplete(input: string, businessGoalId: string) {
  const source = getPostGoalSuggestionsForBusinessGoal(businessGoalId);
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return source.slice(0, 4);
  }

  return source.filter(goal =>
    goal.title.toLowerCase().includes(trimmed) ||
    goal.description.toLowerCase().includes(trimmed) ||
    goal.taxonomyTags.some(tag => tag.toLowerCase().includes(trimmed))
  ).slice(0, 4);
}

export function createPostGoalFolder(
  suggestion: Pick<PostGoalSuggestion, 'title' | 'description' | 'taxonomyTags' | 'assistantPrompt' | 'previewTitle' | 'previewCaption' | 'previewBackground' | 'referenceAssets'>,
  businessGoal: Pick<BusinessGoalOption, 'id' | 'title'>,
  source: PostGoalFolder['source']
): PostGoalFolder {
  const slug = suggestion.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const createdAt = new Date().toISOString();

  return {
    id: `${businessGoal.id}-${slug}-${createdAt}`,
    title: suggestion.title,
    description: suggestion.description,
    taxonomyTags: suggestion.taxonomyTags,
    assistantPrompt: suggestion.assistantPrompt,
    previewTitle: suggestion.previewTitle,
    previewCaption: suggestion.previewCaption,
    previewBackground: suggestion.previewBackground,
    referenceAssets: suggestion.referenceAssets,
    businessGoalId: businessGoal.id,
    businessGoalTitle: businessGoal.title,
    createdAt,
    source
  };
}
