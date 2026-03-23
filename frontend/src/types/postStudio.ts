import type { PostNode } from '../components/history/types';

export interface PostGoalStudioSession {
  nodes: PostNode[];
  currentGridBatchId: string | null;
  generatedImageCount: number;
  lastGeneratedAt: number | null;
  seedDirection: string;
  directionAngles: string[];
  seedPreviewImageUrl?: string | null;
}
