import { buildControlsFromTemplates, getDefaultPresentation } from './config';
import type {
  ClarificationQuestion,
  ClarificationQuestionPlanPayload,
  ClarificationTriggerContext
} from './types';

export function buildQuestionFromPlan(
  plan: ClarificationQuestionPlanPayload,
  triggerContext: ClarificationTriggerContext
): ClarificationQuestion {
  const imageIndex = new Map(
    [
      ...triggerContext.posts,
      ...(triggerContext.historyNodes ? Array.from(triggerContext.historyNodes.values()) : [])
    ].map(post => [post.id, post])
  );
  const evidenceImages =
    plan.evidenceRefs?.map(ref => {
      const post = imageIndex.get(ref.nodeId);
      if (!post?.imageUrl) {
        return null;
      }
      return {
        id: ref.nodeId,
        imageUrl: post.imageUrl,
        label: ref.label,
        description: ref.description
      };
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) ?? [];

  return {
    id: plan.id ?? `${plan.move}:${triggerContext.posts[0]?.metadata?.batchId ?? 'current'}`,
    stage: plan.stage ?? triggerContext.stage,
    family: plan.family,
    move: plan.move,
    source: plan.source,
    urgency: plan.urgency,
    presentation: plan.presentation ?? getDefaultPresentation(plan),
    triggerReason: plan.triggerReason,
    title: plan.title,
    subtitle: plan.subtitle,
    prompt: plan.prompt,
    sourceBatchId: plan.sourceBatchId ?? triggerContext.posts[0]?.metadata?.batchId ?? null,
    sourceNodeIds: plan.sourceNodeIds,
    focusDimension: plan.focusDimension,
    anchorTargetId: plan.anchorTargetId,
    originalFeedback: plan.originalFeedback,
    summaryCandidate: plan.summaryCandidate,
    evidenceImages,
    controls: buildControlsFromTemplates(
      plan.controlTemplateIds,
      plan.family,
      plan.focusDimension
    ),
    applyTarget: plan.applyTarget,
    goalTarget: plan.goalTarget
  };
}

function questionsAreCompatible(
  left: ClarificationQuestion,
  right: ClarificationQuestion
) {
  return (
    left.family === right.family &&
    left.move === right.move &&
    left.controls.length === right.controls.length
  );
}

export function mergeQuestionCopy(
  existing: ClarificationQuestion | null,
  next: ClarificationQuestion
) {
  if (!existing || !questionsAreCompatible(existing, next)) {
    return existing;
  }

  return {
    ...existing,
    title: next.title,
    subtitle: next.subtitle,
    prompt: next.prompt,
    triggerReason: next.triggerReason,
    sourceBatchId: next.sourceBatchId,
    sourceNodeIds: next.sourceNodeIds,
    focusDimension: next.focusDimension,
    anchorTargetId: next.anchorTargetId,
    originalFeedback: next.originalFeedback,
    summaryCandidate: next.summaryCandidate,
    evidenceImages: next.evidenceImages,
    applyTarget: next.applyTarget,
    goalTarget: next.goalTarget,
    presentation: next.presentation
  };
}
