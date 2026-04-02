import { apiFetch } from '../../config/api';
import type { PostNode } from '../history/types';
import type { ClarificationContextPayload } from './clarification/types';
import type { EditOptions, PostStudioActionType } from './types';
import { logPostStudioDebug } from './debug';

interface ImageFeedbackPayload {
  image_id?: string;
  feedback_type: 'like' | 'dislike' | 'unsure';
  primary_reason?: string;
  image_summary?: string;
  direction_angle?: string;
  custom_note?: string;
  step_status: 'answered' | 'unresolved';
  micro_summary?: string;
}

export async function requestPostGeneration({
  brandName,
  brandCategory,
  brandContext,
  parentNode,
  similarity,
  direction,
  directionAngles,
  analysisDirectionAngles,
  seedImageUrls,
  imagesFeedback,
  clarificationContext,
  actionType,
  editOptions,
  numImages
}: {
  brandName: string;
  brandCategory: string;
  brandContext: string;
  parentNode: PostNode | null;
  similarity: number;
  direction: string;
  directionAngles?: string[];
  analysisDirectionAngles?: string[];
  seedImageUrls?: string[];
  imagesFeedback?: ImageFeedbackPayload[];
  clarificationContext?: ClarificationContextPayload | null;
  actionType: PostStudioActionType;
  editOptions?: EditOptions;
  numImages?: number;
}) {
  const requestBody = {
    brandSummary: `${brandName} - ${brandCategory}: ${brandContext}`,
    parentNodeId: parentNode?.id,
    parentImageUrl: parentNode?.imageUrl,
    parentKeywords: parentNode?.analysis?.designKeywords ?? parentNode?.keywords,
    seedImageUrls,
    imagesFeedback,
    clarificationContext,
    similarity,
    explorationLevel: similarity / 100,
    direction,
    directionAngles,
    analysisDirectionAngles,
    actionType,
    editOptions,
    numImages: numImages ?? (actionType === 'edit' ? 1 : 4)
  };

  logPostStudioDebug('requestPostGeneration', requestBody);

  const response = await apiFetch('/api/generate-post-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Failed to generate posts: ${response.status}`);
  }

  const json = await response.json();
  logPostStudioDebug('responsePostGeneration', {
    actionType,
    iteration: json.iteration,
    delta: json.delta,
    batchAnalysis: json.batchAnalysis,
    posts: json.posts?.map((post: any, index: number) => ({
      index,
      id: post.id,
      promptUsed: post.metadata?.prompt_used,
      keywords: post.keywords,
      analysis: post.analysis
    }))
  });
  return json;
}
