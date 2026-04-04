/**
 * TypeScript re-export of share-grid.mjs for Next.js/React consumption.
 * Core logic lives in share-grid.mjs for dual-environment compatibility
 * (Node test runner + bundler).
 */

import type { RoundAction } from '@/types/card';

// @ts-expect-error — .mjs import handled by bundler
export { generateShareText } from './share-grid.mjs';

export interface ShareTextOptions {
  puzzleNumber: number;
  tier: string;
  scoreDisplay: string;
  colorIdentity: string[];
  actions: RoundAction[];
  baseUrl?: string;
}

export declare function generateShareText(opts: ShareTextOptions): string;
