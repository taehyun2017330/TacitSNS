import type { BrandData } from './brand';

export type AppStage = 'auth' | 'onboarding' | 'workspace' | 'studio';

export interface PrototypeUser {
  id: string;
  name: string;
  email: string;
}

export interface BusinessGoalOption {
  id: string;
  title: string;
  description: string;
  rationale: string;
  rank: number;
  isRecommended: boolean;
  isCustom?: boolean;
  normalizedFrom?: string;
  mappedGoalId?: string;
  mappedGoalTitle?: string;
}

export interface PostGoalSuggestion {
  id: string;
  title: string;
  description: string;
  taxonomyTags: string[];
  imageTypeChips?: string[];
  assistantPrompt: string;
  previewTitle?: string;
  previewCaption?: string;
  previewBackground?: string;
  previewImageUrl?: string;
  referenceAssets?: PostGoalReferenceAsset[];
  sourceLabel?: 'ai' | 'fallback' | 'custom';
}

export interface PostGoalReferenceAsset {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
}

export interface PostGoalFolder extends PostGoalSuggestion {
  businessGoalId: string;
  businessGoalTitle: string;
  createdAt: string;
  source: 'recommended' | 'custom';
}

export interface OnboardingResult {
  brand: BrandData;
  selectedBusinessGoals: BusinessGoalOption[];
  activeBusinessGoalId: string;
  postGoalFolders: PostGoalFolder[];
}

export interface WorkspaceSnapshot extends OnboardingResult {
  postGoalFolders: PostGoalFolder[];
}
