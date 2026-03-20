import type { BrandData } from './brand';

export type AppStage = 'auth' | 'onboarding' | 'post-goals' | 'workspace' | 'studio';

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
  assistantPrompt: string;
  previewTitle?: string;
  previewCaption?: string;
  previewBackground?: string;
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
}

export interface WorkspaceSnapshot extends OnboardingResult {
  postGoalFolders: PostGoalFolder[];
}
