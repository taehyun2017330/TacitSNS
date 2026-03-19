export interface EditOptions {
  suggestedEdits: string[];
  customEdit: string;
}

export type PostStudioActionType = 'initial' | 'explore' | 'edit' | 'regenerate';
