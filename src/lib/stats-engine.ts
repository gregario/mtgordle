/**
 * Typed re-export of stats-engine.mjs for use in React components.
 */

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
} from './stats-engine.mjs';
