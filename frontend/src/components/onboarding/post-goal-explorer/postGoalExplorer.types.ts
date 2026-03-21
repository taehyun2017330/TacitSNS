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
};

export interface PostGoalExplorerSharedProps {
  selectedFolderTitles: Set<string>;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
}
