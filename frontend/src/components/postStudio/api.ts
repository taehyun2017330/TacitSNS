import { apiFetch } from '../../config/api';
import type { FeedbackData, PostNode } from '../history/types';
import type { EditOptions, PostStudioActionType } from './types';

export async function requestPostGeneration({
  brandName,
  brandCategory,
  brandContext,
  parentNode,
  feedback,
  similarity,
  direction,
  actionType,
  editOptions
}: {
  brandName: string;
  brandCategory: string;
  brandContext: string;
  parentNode: PostNode | null;
  feedback?: FeedbackData;
  similarity: number;
  direction: string;
  actionType: PostStudioActionType;
  editOptions?: EditOptions;
}) {
  const response = await apiFetch('/api/generate-post-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandSummary: `${brandName} - ${brandCategory}: ${brandContext}`,
      parentNodeId: parentNode?.id,
      parentImageUrl: parentNode?.imageUrl,
      parentKeywords: parentNode?.keywords,
      userFeedback: feedback
        ? {
            likes: feedback.type === 'yes' ? feedback.reasons : [],
            dislikes: feedback.type === 'no' ? feedback.reasons : [],
            unsure: feedback.type === 'unsure' ? feedback.reasons : []
          }
        : null,
      similarity,
      explorationLevel: similarity / 100,
      direction,
      actionType,
      editOptions,
      numImages: actionType === 'edit' ? 1 : 4
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate posts: ${response.status}`);
  }

  return response.json();
}
