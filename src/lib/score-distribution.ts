/**
 * Typed re-export of score-distribution.mjs for use in React components.
 */

import type { TierStats } from '@/types/card';

export interface DistributionRow {
  label: string;
  count: number;
  widthPercent: number;
}

export type DistributionRows = readonly DistributionRow[] & { readonly isEmpty: boolean };

export interface ComputeDistributionInput {
  guessDistribution: TierStats['guessDistribution'];
  gamesPlayed: number;
  gamesWon: number;
}

import { computeDistributionRows as computeDistributionRowsImpl } from './score-distribution.mjs';

export const computeDistributionRows = computeDistributionRowsImpl as unknown as (
  input: ComputeDistributionInput,
) => DistributionRows;
