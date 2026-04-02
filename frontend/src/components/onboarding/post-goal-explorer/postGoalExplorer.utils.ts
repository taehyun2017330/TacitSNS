import type { PostGoalReferenceAsset, PostGoalSuggestion } from '../../../types/workspace';

export const DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND =
  'linear-gradient(135deg, #233f3c 0%, #5d746d 42%, #d9c3ad 100%)';

export type PostGoalPreviewSlide = {
  id: string;
  format: string;
  kicker: string;
  headline: string;
  caption: string;
};

export type PostGoalPrimaryPreview = {
  id: string;
  kicker: string;
  headline: string;
  caption: string;
};

const TAXONOMY_PREVIEW_LIBRARY: Record<string, PostGoalPreviewSlide[]> = {
  Functional: [
    {
      id: 'functional-hero',
      format: 'Feed post',
      kicker: 'Feature-first',
      headline: 'Show the offer in one clear, concrete frame',
      caption: 'Lead with product, proof, or a quality cue someone can read in seconds.'
    },
    {
      id: 'functional-detail',
      format: 'Carousel cover',
      kicker: 'Proof detail',
      headline: 'Zoom into the material, process, or performance claim',
      caption: 'Use a close detail that makes the offer feel credible instead of generic.'
    }
  ],
  Educational: [
    {
      id: 'educational-how',
      format: 'Carousel',
      kicker: 'How it works',
      headline: 'Break the idea into a simple visual explanation',
      caption: 'Use step-by-step framing, a myth-vs-fact layout, or a quick answer to a customer question.'
    },
    {
      id: 'educational-use',
      format: 'Feed post',
      kicker: 'Use-case',
      headline: 'Teach the best time, person, or way to use it',
      caption: 'Help someone imagine when this product or service matters in real life.'
    }
  ],
  Emotional: [
    {
      id: 'emotional-mood',
      format: 'Feed post',
      kicker: 'Mood-led',
      headline: 'Let feeling and story lead the post',
      caption: 'Build the direction around inspiration, wonder, humor, or emotional tone.'
    },
    {
      id: 'emotional-hook',
      format: 'Story frame',
      kicker: 'Reaction hook',
      headline: 'Create a visual someone reacts to before they analyze it',
      caption: 'Use a strong visual mood or line of copy that lands instantly.'
    }
  ],
  'Brand resonance': [
    {
      id: 'resonance-manifesto',
      format: 'Feed post',
      kicker: 'Brand signal',
      headline: 'Say what the brand stands for in one memorable frame',
      caption: 'Use identity, promise, or signature visual language instead of pure explanation.'
    },
    {
      id: 'resonance-identity',
      format: 'Grid post',
      kicker: 'Identity system',
      headline: 'Make the brand feel distinct before it feels detailed',
      caption: 'Prioritize recognizable personality, symbols, or tone.'
    }
  ],
  Experiential: [
    {
      id: 'experiential-hero',
      format: 'Feed post',
      kicker: 'In-use moment',
      headline: 'Show what it feels like to encounter or use the brand',
      caption: 'Use atmosphere, hands, motion, or sensory cues so the post feels lived-in.'
    },
    {
      id: 'experiential-scene',
      format: 'Reel cover',
      kicker: 'Scene-setting',
      headline: 'Build a world around the product, not just a product cutout',
      caption: 'Stage a visual moment that lets someone imagine the brand in context.'
    }
  ],
  Employee: [
    {
      id: 'employee-portrait',
      format: 'Portrait post',
      kicker: 'Human voice',
      headline: 'Put the founder, maker, or expert perspective in the frame',
      caption: 'Use a portrait, quote, or workspace detail that makes the brand feel human and informed.'
    },
    {
      id: 'employee-process',
      format: 'Studio post',
      kicker: 'Behind the scenes',
      headline: 'Let people see the thinking or craft behind the offer',
      caption: 'Use an environment or process view instead of polished advertising alone.'
    }
  ],
  'Customer relationship': [
    {
      id: 'customer-proof',
      format: 'Testimonial post',
      kicker: 'Customer proof',
      headline: 'Anchor the direction in a believable customer result',
      caption: 'Use review-like framing, a quote, or a calm reassurance moment.'
    },
    {
      id: 'customer-objection',
      format: 'Answer post',
      kicker: 'Reassurance',
      headline: 'Answer the hesitation someone might have before acting',
      caption: 'Build confidence with a post that feels like an honest response.'
    }
  ],
  'Sales promotion': [
    {
      id: 'sales-offer',
      format: 'Offer post',
      kicker: 'Action-focused',
      headline: 'Make the offer and next step easy to understand',
      caption: 'Use clear hierarchy for promotion, price, timing, or CTA.'
    },
    {
      id: 'sales-value',
      format: 'Conversion post',
      kicker: 'Worth buying',
      headline: 'Show why this is worth acting on now',
      caption: 'Balance desirability with practical justification.'
    }
  ],
  'Current event': [
    {
      id: 'current-seasonal',
      format: 'Seasonal post',
      kicker: 'Timely hook',
      headline: 'Tie the brand to a moment people are already noticing',
      caption: 'Season, holiday, weather, or a timely cultural cue can make the post feel current.'
    },
    {
      id: 'current-cultural',
      format: 'Trend post',
      kicker: 'Conversation',
      headline: 'Join the conversation without losing the brand voice',
      caption: 'Use a current hook as an entry point, not as the whole idea.'
    }
  ],
  'Brand community': [
    {
      id: 'community-call',
      format: 'Community post',
      kicker: 'Participation',
      headline: 'Invite the audience into the brand world',
      caption: 'Prompt reactions, stories, or shared identity so the brand feels social, not broadcast-only.'
    },
    {
      id: 'community-spotlight',
      format: 'Spotlight post',
      kicker: 'Belonging',
      headline: 'Make the audience feel seen in the content itself',
      caption: 'Use a member, customer, or ritual to signal community.'
    }
  ],
  'Cause-related brand posts': [
    {
      id: 'cause-values',
      format: 'Values post',
      kicker: 'Values in action',
      headline: 'Show the cause or initiative the brand stands behind',
      caption: 'Use tangible action and community relevance rather than abstract virtue-signaling.'
    }
  ],
  'Personal brand posts': [
    {
      id: 'personal-story',
      format: 'Story-led post',
      kicker: 'Personal angle',
      headline: 'Use a lived anecdote or everyday context to make the brand feel relatable',
      caption: 'Ground the direction in a personal moment rather than a formal campaign frame.'
    }
  ]
};

const DEFAULT_PREVIEW_SLIDES: PostGoalPreviewSlide[] = [
  {
    id: 'default-editorial',
    format: 'Feed post',
    kicker: 'Editorial hero',
    headline: 'Lead with one clear post idea someone can grasp immediately',
    caption: 'Use a strong visual hierarchy so the direction feels specific without feeling final.'
  },
  {
    id: 'default-context',
    format: 'Carousel cover',
    kicker: 'Context frame',
    headline: 'Show the brand in a believable scene or context',
    caption: 'Use setting, hands, atmosphere, or an object pairing to make the direction feel lived-in.'
  },
  {
    id: 'default-text',
    format: 'Text-led post',
    kicker: 'Message frame',
    headline: 'Use short copy when the direction needs a clearer point of view',
    caption: 'A strong line can make the visual direction easier to imagine and compare.'
  },
  {
    id: 'default-detail',
    format: 'Detail post',
    kicker: 'Close crop',
    headline: 'Zoom into one proof point instead of explaining everything',
    caption: 'Tight framing helps the post direction feel concrete and memorable.'
  }
];

export function buildPreviewSlides(goal: PostGoalSuggestion): PostGoalPreviewSlide[] {
  const seen = new Set<string>();
  const slides: PostGoalPreviewSlide[] = [];

  goal.taxonomyTags.forEach(tag => {
    (TAXONOMY_PREVIEW_LIBRARY[tag] ?? []).forEach(slide => {
      if (!seen.has(slide.id) && slides.length < 4) {
        seen.add(slide.id);
        slides.push(slide);
      }
    });
  });

  if (!seen.has('goal-preview')) {
    slides.unshift({
      id: 'goal-preview',
      format: goal.taxonomyTags.length > 1 ? 'Suggested direction' : 'Post direction',
      kicker: goal.previewTitle || goal.title,
      headline: goal.title,
      caption: goal.previewCaption || goal.description
    });
  }

  DEFAULT_PREVIEW_SLIDES.forEach(slide => {
    if (!seen.has(slide.id) && slides.length < 4) {
      seen.add(slide.id);
      slides.push(slide);
    }
  });

  return slides.slice(0, 4);
}

export function buildPrimaryPreview(goal: PostGoalSuggestion): PostGoalPrimaryPreview {
  if (goal.previewTitle || goal.previewCaption) {
    return {
      id: `${goal.id}-cover`,
      kicker: goal.previewTitle || goal.title,
      headline: goal.previewTitle || goal.title,
      caption: goal.previewCaption || goal.description
    };
  }

  const taxonomySlide = goal.taxonomyTags
    .flatMap(tag => TAXONOMY_PREVIEW_LIBRARY[tag] ?? [])
    .find(Boolean);

  const fallbackSlide = DEFAULT_PREVIEW_SLIDES[0];
  const baseSlide = taxonomySlide ?? fallbackSlide;

  return {
    id: `${goal.id}-cover`,
    kicker: goal.previewTitle || goal.title,
    headline: baseSlide?.headline || goal.title,
    caption: baseSlide?.caption || goal.previewCaption || goal.description
  };
}

function parseHexColors(background: string) {
  return Array.from(background.matchAll(/#([0-9a-fA-F]{6})/g)).map(match => match[1]);
}

function getLuminance(hex: string) {
  const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(channel =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function getPreviewTextTone(background: string) {
  const colors = parseHexColors(background);

  if (colors.length === 0) {
    return 'light';
  }

  const averageLuminance =
    colors.reduce((total, color) => total + getLuminance(color), 0) / colors.length;

  return averageLuminance > 0.46 ? 'dark' : 'light';
}

function getContrastRatio(firstLuminance: number, secondLuminance: number) {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function detectImageTextTone(imageUrl: string): Promise<'light' | 'dark'> {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve('light');
          return;
        }

        canvas.width = 24;
        canvas.height = 24;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let totalLuminance = 0;
        let sampledPixels = 0;
        const lowerBandStartRow = Math.floor(canvas.height * (2 / 3));
        const lightTextLuminance = getLuminance('fffdf8');
        const darkTextLuminance = getLuminance('1f2423');

        for (let index = 0; index < data.length; index += 4) {
          const pixelIndex = index / 4;
          const y = Math.floor(pixelIndex / canvas.width);
          if (y < lowerBandStartRow) {
            continue;
          }

          const alpha = data[index + 3] / 255;
          if (alpha < 0.08) {
            continue;
          }

          const red = data[index] / 255;
          const green = data[index + 1] / 255;
          const blue = data[index + 2] / 255;
          const linear = [red, green, blue].map(channel =>
            channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
          );

          totalLuminance += 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
          sampledPixels += 1;
        }

        if (sampledPixels === 0) {
          resolve('light');
          return;
        }

        const averageLuminance = totalLuminance / sampledPixels;
        const lightContrast = getContrastRatio(averageLuminance, lightTextLuminance);
        const darkContrast = getContrastRatio(averageLuminance, darkTextLuminance);

        resolve(darkContrast > lightContrast ? 'dark' : 'light');
      } catch {
        resolve('light');
      }
    };

    image.onerror = () => resolve('light');
    image.src = imageUrl;
  });
}

export async function createReferenceAssetFromFile(file: File): Promise<PostGoalReferenceAsset> {
  const dataUrl = await resizeImageFile(file);

  return {
    id: `reference-${Date.now()}-${file.name}`,
    name: file.name,
    dataUrl,
    mimeType: 'image/jpeg'
  };
}

function resizeImageFile(file: File, maxDimension = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas not supported'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = String(reader.result || '');
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
