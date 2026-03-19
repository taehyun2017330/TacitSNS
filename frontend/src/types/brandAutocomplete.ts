export interface Suggestion {
  text: string;
  type: 'continuation' | 'new_angle' | 'example' | 'sentence_end';
  targets?: string[];
  reasoning?: string;
}

export interface BrandContext {
  brandName: string;
  brandCategory: string;
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
