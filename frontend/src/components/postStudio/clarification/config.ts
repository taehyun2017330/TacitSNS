import type {
  ClarificationChoiceControl,
  ClarificationControl,
  ClarificationControlTemplateId,
  ClarificationDimension,
  ClarificationFamily,
  ClarificationQuestion
} from './types';

function makeChoiceControl(
  id: string,
  label: string,
  selectionMode: 'single' | 'multiple',
  appearance: ClarificationChoiceControl['appearance'],
  options: ClarificationChoiceControl['options'],
  required = true
): ClarificationChoiceControl {
  return {
    id,
    kind: 'choice',
    label,
    selectionMode,
    appearance,
    options,
    required
  };
}

export const SUMMARIZE_CONFIRM_CONTROL = makeChoiceControl(
  'summary-response',
  'Does this match what you mean?',
  'single',
  'cards',
  [
    {
      id: 'confirm',
      label: 'Yes, that’s right',
      description: 'Use this understanding to guide the next images.'
    },
    {
      id: 'mostly_right',
      label: 'Mostly right',
      description: 'Keep the direction, but let me refine the nuance.'
    },
    {
      id: 'revise',
      label: 'No, revise that',
      description: 'This reading is off and needs correction.'
    }
  ]
);

export const CLARIFY_INTERPRETATION_CONTROL = makeChoiceControl(
  'interpretation',
  'What’s the issue?',
  'single',
  'cards',
  [
    {
      id: 'wrong_strategy',
      label: 'Wrong strategy direction',
      description: 'The overall route is not what I want.'
    },
    {
      id: 'wrong_execution',
      label: 'Right strategy, wrong execution',
      description: 'The route is fine, but this version misses it.'
    }
  ]
);

export const CLARIFY_SCOPE_CONTROL = makeChoiceControl(
  'scope',
  'Apply this feedback to',
  'single',
  'cards',
  [
    {
      id: 'image',
      label: 'This image only',
      description: 'Narrow correction for this one option.',
      visual: { kind: 'icon', value: 'target' }
    },
    {
      id: 'post',
      label: 'This post',
      description: 'Apply to all variations in this post goal.',
      visual: { kind: 'icon', value: 'scope' }
    },
    {
      id: 'future_posts',
      label: 'Future posts',
      description: 'Carry this into later generations in this campaign.',
      visual: { kind: 'icon', value: 'compare' }
    },
    {
      id: 'brand',
      label: 'Whole brand',
      description: 'Treat this as a brand-level preference going forward.',
      visual: { kind: 'icon', value: 'tune' }
    }
  ]
);

export const CHALLENGE_RESPONSE_CONTROL = makeChoiceControl(
  'challenge-response',
  'Help us understand the shift',
  'single',
  'cards',
  [
    {
      id: 'goal_changed',
      label: 'My goal changed',
      description: 'What I want now is genuinely different.'
    },
    {
      id: 'same_goal_wrong_execution',
      label: 'Same goal, wrong earlier execution',
      description: 'The earlier examples expressed it badly.'
    },
    {
      id: 'still_not_wanted',
      label: 'Still don’t want that direction',
      description: 'Recent choices do not mean I want the opposite.'
    }
  ]
);

export const GOAL_REFRAME_CONTROL = makeChoiceControl(
  'goal-commit',
  'What should change?',
  'single',
  'cards',
  [
    {
      id: 'keep_goal',
      label: 'Keep the current goal',
      description: 'Stay within this goal and just refine execution.'
    },
    {
      id: 'revise_post_goal',
      label: 'Revise this post goal',
      description: 'The visual direction has shifted enough to update this post.'
    },
    {
      id: 'revisit_business_goal',
      label: 'Revisit the business goal',
      description: 'We are steering toward a different campaign objective.'
    }
  ]
);

function createNoteControl(family: ClarificationFamily): ClarificationControl {
  const placeholders: Record<ClarificationFamily, { label: string; placeholder: string }> = {
    summarize: {
      label: 'Anything to revise?',
      placeholder: 'Add what the system is missing...'
    },
    probe: {
      label: 'Anything more specific?',
      placeholder: 'Add what detail should change...'
    },
    clarify: {
      label: 'Optional detail',
      placeholder: 'Describe what should change...'
    },
    challenge: {
      label: 'Additional context',
      placeholder: 'Anything else that changed?'
    }
  };

  const config = placeholders[family];
  return {
    id: `${family}-note`,
    kind: 'text',
    label: config.label,
    placeholder: config.placeholder,
    optional: true
  };
}

export function createProbeControlsForDimension(dimension: ClarificationDimension) {
  const aspectControl = makeChoiceControl(
    'probe-choice',
    getProbeChoiceLabel(dimension),
    'single',
    dimension === 'color' ? 'swatches' : dimension === 'typography' ? 'specimens' : 'cards',
    getProbeOptions(dimension)
  );

  return [
    aspectControl,
    {
      id: 'probe-strength',
      kind: 'scale' as const,
      label: 'How significant is this?',
      min: 0,
      max: 100,
      step: 10,
      minLabel: 'Minor',
      maxLabel: 'Critical',
      defaultValue: 60
    },
    {
      id: 'probe-note',
      kind: 'text' as const,
      label: 'Anything more specific?',
      placeholder: getProbePlaceholder(dimension),
      optional: true
    }
  ];
}

export function buildControlsFromTemplates(
  templateIds: ClarificationControlTemplateId[],
  family: ClarificationFamily,
  focusDimension?: ClarificationDimension
): ClarificationControl[] {
  const controls: ClarificationControl[] = [];

  templateIds.forEach(templateId => {
    if (templateId === 'summary-confirm') {
      controls.push(SUMMARIZE_CONFIRM_CONTROL);
      return;
    }

    if (templateId === 'challenge-response') {
      controls.push(CHALLENGE_RESPONSE_CONTROL);
      return;
    }

    if (templateId === 'clarify-interpretation') {
      controls.push(CLARIFY_INTERPRETATION_CONTROL);
      return;
    }

    if (templateId === 'clarify-scope') {
      controls.push(CLARIFY_SCOPE_CONTROL);
      return;
    }

    if (templateId === 'goal-reframe') {
      controls.push(GOAL_REFRAME_CONTROL);
      return;
    }

    if (templateId === 'probe') {
      controls.push(...createProbeControlsForDimension(focusDimension ?? 'composition'));
      return;
    }

    if (templateId === 'note') {
      controls.push(createNoteControl(family));
    }
  });

  return controls;
}

export function getDefaultPresentation(question: Pick<ClarificationQuestion, 'family' | 'move'>) {
  if (question.family === 'summarize') {
    return 'corner-card' as const;
  }

  if (question.family === 'challenge') {
    return 'compare-popup' as const;
  }

  return 'anchored-sheet' as const;
}

function getProbeOptions(dimension: ClarificationDimension) {
  switch (dimension) {
    case 'color':
      return [
        {
          id: 'background-tone',
          label: 'Background tone',
          description: 'The backdrop color feels wrong.',
          tags: ['background', 'palette', 'tone'],
          visual: { kind: 'swatch', value: 'linear-gradient(135deg, #e7d8c8 0%, #b99f89 100%)' }
        },
        {
          id: 'accent-color',
          label: 'Accent color',
          description: 'The highlight or pop color is off.',
          tags: ['accent', 'highlight', 'contrast'],
          visual: { kind: 'swatch', value: 'linear-gradient(135deg, #efb37f 0%, #d96f68 100%)' }
        },
        {
          id: 'text-color',
          label: 'Text color',
          description: 'The copy color is making it harder to read or trust.',
          tags: ['text', 'copy', 'readability'],
          visual: { kind: 'swatch', value: 'linear-gradient(135deg, #45413c 0%, #96897a 100%)' }
        },
        {
          id: 'overall-palette',
          label: 'Overall palette',
          description: 'The whole color direction needs to shift.',
          tags: ['palette', 'overall', 'direction'],
          visual: { kind: 'swatch', value: 'linear-gradient(135deg, #d7d6d1 0%, #7e8a8a 100%)' }
        }
      ];
    case 'typography':
      return [
        {
          id: 'cleaner-type',
          label: 'Cleaner type',
          description: 'Reduce noise and make it easier to read.',
          tags: ['clean', 'readable', 'minimal'],
          visual: { kind: 'specimen', text: '25% OFF', tone: 'clean' }
        },
        {
          id: 'less-text',
          label: 'Less text',
          description: 'There is simply too much copy competing here.',
          tags: ['less', 'copy', 'density'],
          visual: { kind: 'specimen', text: '25% OFF', tone: 'neutral' }
        },
        {
          id: 'stronger-hierarchy',
          label: 'Stronger hierarchy',
          description: 'The type needs clearer emphasis and ordering.',
          tags: ['hierarchy', 'emphasis', 'structure'],
          visual: { kind: 'specimen', text: '25% OFF', tone: 'bold' }
        },
        {
          id: 'more-premium-type',
          label: 'More premium',
          description: 'The type should feel more styled and credible.',
          tags: ['premium', 'editorial', 'styled'],
          visual: { kind: 'specimen', text: '25% OFF', tone: 'editorial' }
        }
      ];
    case 'composition':
      return [
        {
          id: 'focal-point',
          label: 'Focal point',
          description: 'The eye does not land where it should.',
          tags: ['focus', 'hierarchy', 'attention']
        },
        {
          id: 'crop-framing',
          label: 'Crop or framing',
          description: 'The framing feels awkward or too distant.',
          tags: ['crop', 'framing', 'distance']
        },
        {
          id: 'balance-layout',
          label: 'Balance or layout',
          description: 'The overall arrangement feels off.',
          tags: ['balance', 'layout', 'structure']
        },
        {
          id: 'too-busy',
          label: 'Too busy',
          description: 'There is too much going on at once.',
          tags: ['busy', 'density', 'clutter']
        }
      ];
    case 'background':
      return [
        {
          id: 'simpler-background',
          label: 'Simpler background',
          description: 'Less clutter, less synthetic scene build.',
          tags: ['simple', 'clean', 'natural']
        },
        {
          id: 'more-natural-setting',
          label: 'More natural setting',
          description: 'Ground it in a believable environment.',
          tags: ['natural', 'organic', 'real']
        },
        {
          id: 'more-editorial-set',
          label: 'More editorial set',
          description: 'Intentional backdrop with styled restraint.',
          tags: ['editorial', 'premium', 'set-design']
        },
        {
          id: 'less-urban-neon',
          label: 'Less urban / neon',
          description: 'Reduce city-night styling and synthetic glow.',
          tags: ['calm', 'restrained', 'non-neon']
        }
      ];
    default:
      return [
        {
          id: 'color_palette',
          label: 'Color palette',
          description: 'The palette needs to shift.',
          tags: ['color']
        },
        {
          id: 'background_style',
          label: 'Background style',
          description: 'The setting or backdrop is off.',
          tags: ['background']
        },
        {
          id: 'typography',
          label: 'Typography',
          description: 'The text treatment is the problem.',
          tags: ['typography']
        },
        {
          id: 'overall_composition',
          label: 'Overall composition',
          description: 'The layout or focal point feels wrong.',
          tags: ['composition']
        }
      ];
  }
}

function getProbeChoiceLabel(dimension: ClarificationDimension) {
  switch (dimension) {
    case 'color':
      return 'Which color issue do you mean most?';
    case 'typography':
      return 'What feels off about the type?';
    case 'composition':
      return 'What part feels most off?';
    case 'background':
      return 'What is the background issue?';
    default:
      return 'What part of the image is the issue?';
  }
}

function getProbePlaceholder(dimension: ClarificationDimension) {
  switch (dimension) {
    case 'color':
      return 'Add which color or color shift you mean...';
    case 'typography':
      return 'Add what text treatment you want instead...';
    case 'composition':
      return 'Add what should move, crop, or simplify...';
    case 'background':
      return 'Describe the environment or backdrop you want...';
    default:
      return 'Add anything more specific...';
  }
}
