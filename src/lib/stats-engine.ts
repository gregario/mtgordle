/**
 * Typed re-export of stats-engine.mjs for use in React components.
 */
import type { RoundAction, GameTier } from '@/types/card';
import type { GameOutcome } from '@/lib/game-engine';

export {
  STATS_STORAGE_KEY,
  STATS_SCHEMA_VERSION,
  getDefaultTierStats,
  getDefaultPlayerStats,
  recordGameResult,
  getWinPercentage,
  isDuplicateGame,
  loadStats,
  saveStats,
  LAST_GAME_STORAGE_KEY,
} from './stats-engine.mjs';

export interface LastGameResult {
  puzzleNumber: number;
  outcome: GameOutcome;
  roundActions: RoundAction[];
  cardOracleId: string;
}

// Typed wrappers for the last-game-result helpers
import {
  saveLastGameResult as _saveLastGameResult,
  loadLastGameResult as _loadLastGameResult,
} from './stats-engine.mjs';

export function saveLastGameResult(
  tier: GameTier,
  result: LastGameResult,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): void {
  _saveLastGameResult(tier, result, storage);
}

export function loadLastGameResult(
  tier: GameTier,
  currentPuzzleNumber: number,
  storage: Pick<Storage, 'getItem'>,
): LastGameResult | null {
  return _loadLastGameResult(tier, currentPuzzleNumber, storage) as LastGameResult | null;
}
