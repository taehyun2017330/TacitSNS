import type { PostGoalReferenceAsset } from '../../types/workspace';
import type { PostGoalStudioSession } from '../../types/postStudio';
import type { ClarificationDraftGoalUpdate } from '../history/types';

export type ViewMode = 'grid' | 'guided' | 'brief' | 'single';

export interface PostStudioProps {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  businessGoalDescription?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  postGoalWhyThisDirectionFits?: string;
  postGoalTaxonomyTags?: string[];
  postGoalImageTypeChips?: string[];
  postGoalDirectionAngles?: string[];
  postGoalPreviewImageUrl?: string;
  referenceAssets?: PostGoalReferenceAsset[];
  studioSession?: PostGoalStudioSession | null;
  onStudioSessionChange?: (session: PostGoalStudioSession) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onApplyGoalUpdate?: (draft: ClarificationDraftGoalUpdate) => void;
  onBack: () => void;
  onFinalize: (postUrl: string, postData?: any) => void;
}
