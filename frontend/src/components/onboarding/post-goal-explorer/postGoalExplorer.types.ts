import type {
  PostGoalFolder,
  PostGoalReferenceAsset,
  PostGoalSuggestion
} from '../../../types/workspace';

export type PostGoalComposerState = {
  mode: 'custom' | 'edit';
  inputMethod: 'reference' | 'text' | null;
  seed?: PostGoalSuggestion;
  title: string;
  description: string;
  rationale: string;
  referenceAssets: PostGoalReferenceAsset[];
  isGeneratingReferenceDraft?: boolean;
  referenceGenerationError?: string;
  lastReferenceDraftAssetId?: string | null;
};

export interface PostGoalExplorerSharedProps {
  selectedFolderIds: Set<string>;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
}
