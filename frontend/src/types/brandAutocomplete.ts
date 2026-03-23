export interface Suggestion {
  text: string;
  type: 'continuation' | 'new_angle' | 'example' | 'sentence_end';
  targets?: string[];
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
}

export interface ModelConfig {
  directionModel: string;
  suggestionModel: string;
  directionTemp: number;
  suggestionTemp: number;
}

export interface SentenceSegment {
  text: string;
  targets: string[];
}

export interface SentenceAnnotation {
  segments: SentenceSegment[];
  sentenceTargets: string[];
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
  progress?: any;
  annotation?: {
    sentenceIndex: number;
    segments: SentenceSegment[];
    sentenceTargets: string[];
  };
}
