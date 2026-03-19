import type { BrandData } from '../types/brand';
import type { BusinessGoalOption, PostGoalFolder, PostGoalSuggestion } from '../types/workspace';

type GoalDefinition = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  fallbackRationale: string;
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

export function normalizeBusinessGoalInput(input: string): BusinessGoalOption {
  const trimmed = input.trim();
  const lowered = trimmed.toLowerCase();
  const matchedGoal = BUSINESS_GOAL_LIBRARY
    .map(goal => ({
      goal,
      score: scoreGoal(goal, lowered) + (goal.title.toLowerCase().includes(lowered) ? 3 : 0)
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (matchedGoal && matchedGoal.score > 0) {
    return {
      id: matchedGoal.goal.id,
      title: matchedGoal.goal.title,
      description: matchedGoal.goal.description,
      rationale: `Normalized from "${trimmed}" so the system can reuse a stable business-goal bucket.`,
      rank: 0,
      isRecommended: true,
      normalizedFrom: trimmed
    };
  }

  return {
    id: `custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'goal'}`,
    title: trimmed,
    description: 'Custom business goal supplied by the user.',
    rationale: 'Kept as a custom goal because it did not clearly map onto one of the broad system goals.',
    rank: 0,
    isRecommended: false,
    isCustom: true
  };
}

export function getPostGoalSuggestionsForBusinessGoal(businessGoalId: string) {
  return POST_GOAL_LIBRARY[businessGoalId] ?? [];
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
  suggestion: Pick<PostGoalSuggestion, 'title' | 'description' | 'taxonomyTags' | 'assistantPrompt'>,
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
    businessGoalId: businessGoal.id,
    businessGoalTitle: businessGoal.title,
    createdAt,
    source
  };
}
