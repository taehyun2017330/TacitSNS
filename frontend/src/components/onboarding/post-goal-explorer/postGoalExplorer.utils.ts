import type { PostGoalReferenceAsset, PostGoalSuggestion } from '../../../types/workspace';

export function buildExampleLabels(goal: PostGoalSuggestion) {
  const joinedTags = goal.taxonomyTags.join(' ').toLowerCase();

  if (joinedTags.includes('functional')) {
    return ['Hero product', 'Process close-up', 'Feature explainer', 'Proof layout'];
  }
  if (joinedTags.includes('educational')) {
    return ['Step-by-step', 'Myth vs fact', 'Ingredient focus', 'How it works'];
  }
  if (joinedTags.includes('employee')) {
    return ['Founder portrait', 'Desk vignette', 'Quote frame', 'Team detail'];
  }
  if (joinedTags.includes('customer relationship')) {
    return ['Testimonial card', 'Customer quote', 'Before / after', 'Result snapshot'];
  }
  if (joinedTags.includes('sales promotion')) {
    return ['Offer highlight', 'Price frame', 'CTA variant', 'Promo detail'];
  }
  if (joinedTags.includes('current event')) {
    return ['Seasonal version', 'Timely hook', 'Event visual', 'Trend angle'];
  }
  if (joinedTags.includes('experiential')) {
    return ['Lifestyle scene', 'In-use moment', 'Atmosphere shot', 'Detail crop'];
  }

  return ['Editorial hero', 'Close crop', 'Text-led variant', 'Context frame'];
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
