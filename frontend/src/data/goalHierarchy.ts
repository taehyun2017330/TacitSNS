import type { BrandData } from '../types/brand';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../types/workspace';

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

const POST_TAXONOMY_LIBRARY: Record<string, TaxonomyDefinition> = {
  Emotional: {
    label: 'Emotional',
    definition: 'Evokes feeling through mood, story, humor, or emotional language.',
    themes: ['inspiring stories', 'humor', 'wonder', 'emotion-led framing']
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
    themes: ['personal anecdotes', 'preferences', 'future plans', 'friendship or family cues']
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

const POST_GOAL_LIBRARY: Record<string, PostGoalSuggestion[]> = {
  trust: [
    {
      id: 'trust-quality-process',
      title: 'Show our quality or process',
      description: 'Make the product or service feel credible by showing how care, expertise, or standards appear in the work.',
      taxonomyTags: ['Functional', 'Educational'],
      assistantPrompt: 'Focus on quality signals, process details, and evidence that makes the brand feel credible.'
    },
    {
      id: 'trust-founder-expert',
      title: 'Introduce the founder or expert perspective',
      description: 'Use a human expert voice so customers understand who is behind the brand and why they should trust it.',
      taxonomyTags: ['Employee', 'Brand resonance'],
      assistantPrompt: 'Center the founder, practitioner, or expert so the post feels human, informed, and trustworthy.'
    },
    {
      id: 'trust-customer-proof',
      title: 'Share customer proof',
      description: 'Translate social proof into a clean post that shows real outcomes or believable customer experiences.',
      taxonomyTags: ['Customer relationship'],
      assistantPrompt: 'Create a post anchored in customer proof, testimony, or review-like reassurance.'
    },
    {
      id: 'trust-brand-stance',
      title: 'Communicate what our brand stands for',
      description: 'Clarify the promise, standards, or values the brand wants to be known for.',
      taxonomyTags: ['Brand resonance'],
      assistantPrompt: 'Show the brand promise clearly so viewers understand its point of view and standards.'
    }
  ],
  awareness: [
    {
      id: 'awareness-brand-personality',
      title: 'Introduce the brand personality',
      description: 'Create a first impression post that quickly teaches the mood, aesthetic, and voice of the brand.',
      taxonomyTags: ['Brand resonance', 'Emotional'],
      assistantPrompt: 'Prioritize memorable brand personality and visual identity over detailed product explanation.'
    },
    {
      id: 'awareness-timely-conversation',
      title: 'Join a timely conversation',
      description: 'Use a relevant seasonal or cultural hook to make the brand feel current and easy to notice.',
      taxonomyTags: ['Current event'],
      assistantPrompt: 'Tie the brand to a timely conversation while still keeping the visual language on brand.'
    },
    {
      id: 'awareness-product-experience',
      title: 'Show the product experience visually',
      description: 'Let people imagine what it feels like to encounter or use the brand for the first time.',
      taxonomyTags: ['Experiential'],
      assistantPrompt: 'Make the experience of the product or service instantly legible and attractive.'
    },
    {
      id: 'awareness-memorable-introduction',
      title: 'Create a memorable first-impression post',
      description: 'Package the brand as a clear, high-impact introduction someone can understand in a few seconds.',
      taxonomyTags: ['Brand resonance', 'Emotional'],
      assistantPrompt: 'Design for recognition and first-impression clarity more than depth.'
    }
  ],
  educate: [
    {
      id: 'educate-how-it-works',
      title: 'Explain how our offer works',
      description: 'Break down the product, service, or process in a way a first-time viewer can understand quickly.',
      taxonomyTags: ['Functional', 'Educational'],
      assistantPrompt: 'Use clear visual explanation so viewers understand what the offer is and how it works.'
    },
    {
      id: 'educate-why-different',
      title: 'Explain why we are different',
      description: 'Clarify the unique value, ingredients, method, or expertise that makes the brand distinct.',
      taxonomyTags: ['Educational', 'Brand resonance'],
      assistantPrompt: 'Turn differentiation into something understandable, not just a claim.'
    },
    {
      id: 'educate-common-question',
      title: 'Answer a common customer question',
      description: 'Use the post to address confusion, hesitation, or a recurring product question.',
      taxonomyTags: ['Customer relationship', 'Educational'],
      assistantPrompt: 'Treat the post like an answer to a real customer question or objection.'
    },
    {
      id: 'educate-use-case',
      title: 'Teach the best use case',
      description: 'Show when, how, or for whom the product or service is most useful.',
      taxonomyTags: ['Educational', 'Functional'],
      assistantPrompt: 'Focus on practical guidance that helps people imagine the right use case.'
    }
  ],
  engagement: [
    {
      id: 'engagement-opinion-hook',
      title: 'Start a low-effort conversation',
      description: 'Use a simple opinion prompt, comparison, or visual question to invite interaction.',
      taxonomyTags: ['Brand community', 'Current event'],
      assistantPrompt: 'Create something people can react to quickly without needing deep context.'
    },
    {
      id: 'engagement-personal-angle',
      title: 'Tell a personal or behind-the-scenes story',
      description: 'Make the brand feel easier to relate to through a human anecdote or process moment.',
      taxonomyTags: ['Personal brand posts', 'Employee'],
      assistantPrompt: 'Lean into human relatability and a conversational tone rather than polished selling.'
    },
    {
      id: 'engagement-community-prompt',
      title: 'Invite the audience into the brand world',
      description: 'Ask for reactions, preferences, or participation so the brand feels more social and open.',
      taxonomyTags: ['Brand community', 'Customer relationship'],
      assistantPrompt: 'Prompt audience participation and make engagement feel welcome and easy.'
    },
    {
      id: 'engagement-playful-moment',
      title: 'Create a playful moment around the brand',
      description: 'Use humor, a quick challenge, or a light prompt to make the brand feel active and approachable.',
      taxonomyTags: ['Emotional', 'Current event'],
      assistantPrompt: 'Favor approachable, reactive energy over polish-heavy messaging.'
    }
  ],
  sales: [
    {
      id: 'sales-offer-highlight',
      title: 'Highlight the offer clearly',
      description: 'Present the product, service, or promotion so viewers can understand the value and next step immediately.',
      taxonomyTags: ['Sales promotion'],
      assistantPrompt: 'Make the offer legible, concrete, and easy to act on.'
    },
    {
      id: 'sales-worth-buying',
      title: 'Explain why this is worth buying',
      description: 'Support conversion with clear reasons, quality cues, or benefit framing.',
      taxonomyTags: ['Functional', 'Sales promotion'],
      assistantPrompt: 'Balance desirability and practical justification so the post supports buying decisions.'
    },
    {
      id: 'sales-result-experience',
      title: 'Show the result or experience',
      description: 'Help the audience imagine the payoff, transformation, or end state they want.',
      taxonomyTags: ['Experiential', 'Functional'],
      assistantPrompt: 'Center the outcome people want rather than only the product itself.'
    },
    {
      id: 'sales-objection-answer',
      title: 'Answer a common buying objection',
      description: 'Use the post to reduce hesitation around price, trust, effort, or fit.',
      taxonomyTags: ['Customer relationship', 'Educational'],
      assistantPrompt: 'Address a real barrier to purchase and make the answer feel calm and credible.'
    }
  ],
  community: [
    {
      id: 'community-customer-spotlight',
      title: 'Spotlight a customer or community member',
      description: 'Celebrate real people so the brand feels relational and not purely transactional.',
      taxonomyTags: ['Brand community', 'Customer relationship'],
      assistantPrompt: 'Make the post feel like community recognition rather than self-promotion.'
    },
    {
      id: 'community-shared-values',
      title: 'Reinforce the values people join for',
      description: 'Show what people identify with when they stay connected to the brand over time.',
      taxonomyTags: ['Brand resonance', 'Cause-related brand posts'],
      assistantPrompt: 'Emphasize shared values and emotional loyalty cues.'
    },
    {
      id: 'community-returning-routine',
      title: 'Create a recurring ritual or series',
      description: 'Frame the post as part of a repeatable format that customers can look forward to.',
      taxonomyTags: ['Brand community', 'Experiential'],
      assistantPrompt: 'Design the post like part of an ongoing brand ritual or familiar series.'
    },
    {
      id: 'community-feedback-loop',
      title: 'Invite customer input and feedback',
      description: 'Make the audience feel heard by explicitly asking for preferences, stories, or reactions.',
      taxonomyTags: ['Customer relationship', 'Brand community'],
      assistantPrompt: 'Use the post to deepen the relationship through feedback and participation.'
    }
  ]
};

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

const DEFAULT_GOAL_ORDER = ['trust', 'awareness', 'sales'] as const;

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
  return (POST_GOAL_LIBRARY[businessGoalId] ?? []).map(goal => ({
    ...goal,
    ...POST_GOAL_PREVIEWS[goal.id]
  }));
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
  suggestion: Pick<PostGoalSuggestion, 'title' | 'description' | 'taxonomyTags' | 'assistantPrompt' | 'previewTitle' | 'previewCaption' | 'previewBackground'>,
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
    businessGoalId: businessGoal.id,
    businessGoalTitle: businessGoal.title,
    createdAt,
    source
  };
}
