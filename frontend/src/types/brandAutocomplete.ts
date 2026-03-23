export type ChecklistKey = 'offer' | 'audience' | 'emphasis' | 'tone';

export interface Suggestion {
  text: string;
  type: 'continuation' | 'new_angle' | 'example' | 'sentence_end';
  targets?: ChecklistKey[];
  reasoning?: string;
}

export interface BrandContext {
  brandName: string;
  brandCategory: string;
  brandIdentity?: string;
}

export interface BrandStatus {
  satisfied: boolean;
  overallAssessment: string;
  statusMessage: string;
  sentenceEnded: boolean;
  currentSentenceState?: 'fragment' | 'developing' | 'complete';
  recommendedAction?: 'continue_sentence' | 'finish_sentence' | 'start_new_sentence';
  nextElement?: ChecklistKey | 'none';
}

export interface ModelConfig {
  directionModel: string;
  suggestionModel: string;
  directionTemp: number;
  suggestionTemp: number;
}

export interface ChecklistProgressItem {
  key: ChecklistKey;
  title: string;
  description: string;
  covered: boolean;
  evidence?: string;
  order: number;
}

export interface NarrativeProgress {
  covered: number;
  total: number;
  percentage: number;
  activeKey: ChecklistKey | 'none';
  allElements: ChecklistProgressItem[];
  recommendation?: {
    hint: string;
  } | null;
}

export interface TooltipPart {
  text: string;
  color?: string;
}

export interface BrandAutocompleteResponse {
  suggestions?: Suggestion[];
  brandStatus?: BrandStatus;
  debug?: {
    thinking: string;
    elapsed: number;
  };
  progress?: NarrativeProgress;
}
