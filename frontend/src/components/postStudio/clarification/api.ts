import { apiFetch } from '../../../config/api';
import type {
  ClarificationDraftGoalUpdatePayload,
  ClarificationDraftGoalUpdateRequestPayload,
  ClarificationEvaluationRequestPayload,
  ClarificationQuestionGenerationRequestPayload,
  ClarificationQuestionPlanPayload
} from './types';
import type { ClarificationEvaluationSnapshot } from '../../history/types';

function withCreatedAt<T extends { createdAt?: number }>(payload: T): T {
  return {
    ...payload,
    createdAt: payload.createdAt ?? Date.now()
  };
}

export async function requestClarificationEvaluation(
  payload: ClarificationEvaluationRequestPayload
): Promise<ClarificationEvaluationSnapshot> {
  const response = await apiFetch('/api/clarification/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to evaluate clarification: ${response.status}`);
  }

  const json = await response.json();
  return withCreatedAt(json);
}

export async function requestClarificationQuestionPlan(
  payload: ClarificationQuestionGenerationRequestPayload
): Promise<ClarificationQuestionPlanPayload> {
  const response = await apiFetch('/api/clarification/question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to generate clarification question: ${response.status}`);
  }

  return response.json();
}

export async function requestClarificationGoalDraft(
  payload: ClarificationDraftGoalUpdateRequestPayload
): Promise<ClarificationDraftGoalUpdatePayload> {
  const response = await apiFetch('/api/clarification/draft-goal-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to draft goal update: ${response.status}`);
  }

  const json = await response.json();
  return withCreatedAt(json);
}
