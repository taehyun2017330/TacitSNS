import type { FeedbackType } from '../history/types';
import type { ClarificationDimension, ClarificationFamily } from './clarification/types';

export interface FeedbackReasonMeta {
  label: string;
  chipLabel?: string;
  systemInterpretation?: string;
  followUpFocus?: string;
  dimension?: ClarificationDimension;
  ambiguity?: 'low' | 'medium' | 'high';
  likelyFollowUp?: ClarificationFamily;
  followUpStage?: 'micro' | 'macro';
}

export const FEEDBACK_REASON_OPTIONS: Record<Exclude<FeedbackType, null>, string[]> = {
  no: [
    'Palette feels off',
    'Layout feels off',
    'Text treatment is off',
    'Wrong overall direction',
    'Too promotional for this goal',
    'Feels too artificial',
  ],
  unsure: [
    'Promising, but palette needs work',
    'Promising, but layout needs work',
    'Direction seems right, execution is off',
    'Not sure it fits the goal yet',
    'Needs a clearer focal point'
  ],
  yes: [
    'Palette feels right',
    'Layout works',
    'Feels credible',
    'Product focus works',
    'Closer to the direction I want',
    'Fits the goal better'
  ]
};

const FEEDBACK_REASON_META: Record<string, FeedbackReasonMeta> = {
  'Palette feels off': {
    label: 'Palette feels off',
    chipLabel: 'Palette feels off',
    dimension: 'color',
    ambiguity: 'high',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Layout feels off': {
    label: 'Layout feels off',
    chipLabel: 'Layout feels off',
    dimension: 'composition',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Text treatment is off': {
    label: 'Text treatment is off',
    chipLabel: 'Text treatment is off',
    dimension: 'typography',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Wrong overall direction': {
    label: 'Wrong overall direction',
    chipLabel: 'Wrong direction',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'clarify',
    followUpStage: 'micro'
  },
  'Too promotional for this goal': {
    label: 'Too promotional for this goal',
    chipLabel: 'Too promotional',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'challenge',
    followUpStage: 'macro'
  },
  'Promising, but palette needs work': {
    label: 'Promising, but palette needs work',
    chipLabel: 'Palette needs work',
    dimension: 'color',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Promising, but layout needs work': {
    label: 'Promising, but layout needs work',
    chipLabel: 'Layout needs work',
    dimension: 'composition',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Direction seems right, execution is off': {
    label: 'Direction seems right, execution is off',
    chipLabel: 'Right direction, weak execution',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'clarify',
    followUpStage: 'micro'
  },
  'Not sure it fits the goal yet': {
    label: 'Not sure it fits the goal yet',
    chipLabel: 'Not sure it fits yet',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'challenge',
    followUpStage: 'macro'
  },
  'Needs a clearer focal point': {
    label: 'Needs a clearer focal point',
    chipLabel: 'Needs a clearer focal point',
    dimension: 'composition',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Palette feels right': {
    label: 'Palette feels right',
    chipLabel: 'Palette works',
    dimension: 'color',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Layout works': {
    label: 'Layout works',
    chipLabel: 'Layout works',
    dimension: 'composition',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Feels credible': {
    label: 'Feels credible',
    chipLabel: 'Feels credible',
    dimension: 'mood',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Product focus works': {
    label: 'Product focus works',
    chipLabel: 'Product focus works',
    dimension: 'product',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Closer to the direction I want': {
    label: 'Closer to the direction I want',
    chipLabel: 'Closer to what I want',
    dimension: 'strategy',
    ambiguity: 'medium',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Fits the goal better': {
    label: 'Fits the goal better',
    chipLabel: 'Fits the goal better',
    dimension: 'strategy',
    ambiguity: 'medium',
    likelyFollowUp: 'challenge',
    followUpStage: 'macro'
  },
  "Don't like the text": {
    label: "Don't like the text",
    chipLabel: 'Text feels off',
    dimension: 'typography',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  "Don't like the colors": {
    label: "Don't like the colors",
    chipLabel: 'Color feels off',
    dimension: 'color',
    ambiguity: 'high',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  "Don't like the composition": {
    label: "Don't like the composition",
    chipLabel: 'Layout feels off',
    dimension: 'composition',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  "Doesn't feel on-brand": {
    label: "Doesn't feel on-brand",
    chipLabel: 'Doesn’t feel on-brand',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'clarify',
    followUpStage: 'micro'
  },
  'Feels too artificial': {
    label: 'Feels too artificial',
    chipLabel: 'Feels too artificial',
    dimension: 'mood',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Feels too promotional': {
    label: 'Feels too promotional',
    chipLabel: 'Feels too promotional',
    dimension: 'strategy',
    ambiguity: 'medium',
    likelyFollowUp: 'clarify',
    followUpStage: 'micro'
  },
  'Not clear enough': {
    label: 'Not clear enough',
    chipLabel: 'Not clear enough',
    dimension: 'execution',
    ambiguity: 'high',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Needs a stronger focal point': {
    label: 'Needs a stronger focal point',
    chipLabel: 'Needs a stronger focal point',
    dimension: 'composition',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Not sure about the styling': {
    label: 'Not sure about the styling',
    chipLabel: 'Not sure about the styling',
    dimension: 'mood',
    ambiguity: 'medium',
    likelyFollowUp: 'probe',
    followUpStage: 'micro'
  },
  'Needs another direction': {
    label: 'Needs another direction',
    chipLabel: 'Needs another direction',
    dimension: 'strategy',
    ambiguity: 'high',
    likelyFollowUp: 'clarify',
    followUpStage: 'micro'
  },
  'Like the composition': {
    label: 'Like the composition',
    chipLabel: 'Layout works',
    dimension: 'composition',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Like the color mood': {
    label: 'Like the color mood',
    chipLabel: 'Palette works',
    dimension: 'color',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Feels on-brand': {
    label: 'Feels on-brand',
    chipLabel: 'Feels on-brand',
    dimension: 'strategy',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  },
  'Looks usable': {
    label: 'Looks usable',
    chipLabel: 'Looks usable',
    dimension: 'execution',
    ambiguity: 'low',
    likelyFollowUp: 'summarize',
    followUpStage: 'micro'
  }
};

function inferReasonMetaFromLabel(label: string): FeedbackReasonMeta {
  const lowered = label.toLowerCase();

  const hasAny = (...tokens: string[]) => tokens.some(token => lowered.includes(token));

  let dimension: ClarificationDimension = 'other';
  let likelyFollowUp: ClarificationFamily | undefined;
  let ambiguity: 'low' | 'medium' | 'high' = 'medium';

  if (hasAny('color', 'palette', 'tone', 'blue', 'red', 'warm', 'cool')) {
    dimension = 'color';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('text', 'type', 'typography', 'font', 'headline', 'copy')) {
    dimension = 'typography';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('composition', 'crop', 'framing', 'layout', 'focal', 'balance')) {
    dimension = 'composition';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('background', 'setting', 'scene', 'environment')) {
    dimension = 'background';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('product', 'ingredient', 'application', 'texture', 'detail')) {
    dimension = 'product';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('light', 'lighting', 'shadow', 'contrast')) {
    dimension = 'lighting';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('mood', 'feel', 'cold', 'warmth', 'artificial', 'calm', 'energy', 'premium')) {
    dimension = 'mood';
    likelyFollowUp = 'probe';
    ambiguity = 'medium';
  } else if (hasAny('brand', 'direction', 'strategy', 'promotional', 'credible', 'trust', 'goal')) {
    dimension = 'strategy';
    likelyFollowUp = 'clarify';
    ambiguity = 'high';
  } else if (hasAny('execution', 'sharp', 'clear', 'usable', 'refine', 'refinement')) {
    dimension = 'execution';
    likelyFollowUp = 'summarize';
    ambiguity = 'low';
  }

  if (hasAny('too close', 'more distinct', 'far enough', 'another direction')) {
    dimension = 'strategy';
    likelyFollowUp = 'clarify';
    ambiguity = 'high';
  } else if (hasAny('fits the goal', 'for this goal', 'goal yet')) {
    dimension = 'strategy';
    likelyFollowUp = 'challenge';
    ambiguity = 'high';
  } else if (hasAny('not sure', 'unclear', 'promising', 'unresolved')) {
    ambiguity = 'high';
    if (!likelyFollowUp) {
      likelyFollowUp = 'probe';
    }
  } else if (hasAny('strong', 'clear', 'works', 'usable', 'on-brand')) {
    ambiguity = 'low';
    if (!likelyFollowUp) {
      likelyFollowUp = 'summarize';
    }
  }

  return {
    label,
    chipLabel: label,
    systemInterpretation: undefined,
    followUpFocus: undefined,
    dimension,
    ambiguity,
    likelyFollowUp,
    followUpStage: likelyFollowUp === 'challenge' ? 'macro' : 'micro'
  };
}

export function getFeedbackReasonMeta(label: string): FeedbackReasonMeta {
  return FEEDBACK_REASON_META[label] ?? inferReasonMetaFromLabel(label);
}
