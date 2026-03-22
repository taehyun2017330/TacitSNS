import type { BrandData } from '../../types/brand';

export type OnboardingStep = 'narrative' | 'goals' | 'post-goals';

export const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'home', label: 'Home & Lifestyle' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' }
] as const;

export const INDUSTRY_CHIPS = INDUSTRY_OPTIONS.filter(option => option.value !== 'other');

export const INITIAL_BRAND_DATA: BrandData = {
  name: '',
  category: '',
  identity: '',
  description: '',
  style: 'modern',
  colors: [],
  keywords: []
};
