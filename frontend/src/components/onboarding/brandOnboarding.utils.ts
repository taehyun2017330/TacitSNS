import type { BrandData } from '../../types/brand';

export function deriveIdentityFromNarrative(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const [firstSentence] = trimmed.split(/(?<=[.!?])\s+/);
  return (firstSentence || trimmed).trim();
}

export function buildGoalSourceSignature(brandData: BrandData) {
  return [
    brandData.name.trim(),
    brandData.category.trim(),
    brandData.identity.trim(),
    brandData.description.trim()
  ].join('||');
}

export function canGenerateGoals(brandData: BrandData) {
  return Boolean(
    brandData.name.trim() &&
      brandData.category.trim() &&
      brandData.description.trim().length > 36
  );
}

export function canContinue(brandData: BrandData, selectedGoalId: string | null) {
  return canGenerateGoals(brandData) && Boolean(selectedGoalId);
}

export function summarizeNarrative(text: string, maxLength = 180) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'Add a fuller brand narrative so the system can interpret the direction well.';
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}
