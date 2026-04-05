/**
 * Stats engine — localStorage-backed per-tier statistics for MTGordle.
 *
 * Pure functions for stat computation. localStorage I/O accepts a
 * storage parameter for testability (defaults to window.localStorage).
 */

export const STATS_STORAGE_KEY = 'mtgordle-stats';
export const STATS_SCHEMA_VERSION = '1.0';

/** @returns {import('../types/card').TierStats} */
export function getDefaultTierStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedPuzzle: null,
    guessDistribution: {},
  };
}

/** @returns {import('../types/card').PlayerStats} */
export function getDefaultPlayerStats() {
  return {
    _schema_version: STATS_SCHEMA_VERSION,
    simple: getDefaultTierStats(),
    cryptic: getDefaultTierStats(),
  };
}

/**
 * Record a completed game result. Returns new stats (does not mutate input).
 * Practice mode games are ignored — they don't contribute to stats.
 *
 * @param {import('../types/card').PlayerStats} stats
 * @param {import('../types/card').GameResult} result
 * @returns {import('../types/card').PlayerStats}
 */
export function recordGameResult(stats, result) {
  if (result.mode === 'practice') return stats;

  const tier = result.tier;
  const prev = stats[tier];

  const gamesPlayed = prev.gamesPlayed + 1;
  const gamesWon = prev.gamesWon + (result.solved ? 1 : 0);

  // Streak logic — reset on missed day (non-consecutive puzzle number) or loss
  const missedDay = prev.lastPlayedPuzzle !== null &&
    result.puzzleNumber !== prev.lastPlayedPuzzle + 1;
  let currentStreak;
  if (!result.solved) {
    currentStreak = 0;
  } else if (missedDay) {
    currentStreak = 1; // restart streak from this win
  } else {
    currentStreak = prev.currentStreak + 1;
  }
  const maxStreak = Math.max(prev.maxStreak, currentStreak);

  // Guess distribution — only record wins
  const guessDistribution = { ...prev.guessDistribution };
  if (result.solved) {
    const count = result.guessCount;
    guessDistribution[count] = (guessDistribution[count] || 0) + 1;
  }

  return {
    ...stats,
    [tier]: {
      gamesPlayed,
      gamesWon,
      currentStreak,
      maxStreak,
      lastPlayedPuzzle: result.puzzleNumber,
      guessDistribution,
    },
  };
}

/**
 * Calculate win percentage for a tier. Returns 0 when no games played.
 *
 * @param {import('../types/card').TierStats} tierStats
 * @returns {number} Integer 0-100
 */
export function getWinPercentage(tierStats) {
  if (tierStats.gamesPlayed === 0) return 0;
  return Math.round((tierStats.gamesWon / tierStats.gamesPlayed) * 100);
}

/**
 * Check if a daily puzzle has already been played for a given tier.
 *
 * @param {import('../types/card').PlayerStats} stats
 * @param {import('../types/card').GameTier} tier
 * @param {number} puzzleNumber
 * @returns {boolean}
 */
export function isDuplicateGame(stats, tier, puzzleNumber) {
  return stats[tier].lastPlayedPuzzle === puzzleNumber;
}

/**
 * Load stats from storage. Returns defaults if missing or corrupt.
 *
 * @param {Pick<Storage, 'getItem'>} [storage]
 * @returns {import('../types/card').PlayerStats}
 */
export function loadStats(storage) {
  try {
    const raw = storage.getItem(STATS_STORAGE_KEY);
    if (!raw) return getDefaultPlayerStats();
    const parsed = JSON.parse(raw);
    // Safe migration: unknown or missing schema version → drop and return defaults.
    // Keeps clients from choking on pre-versioned blobs or blobs written by a newer build.
    if (!parsed || parsed._schema_version !== STATS_SCHEMA_VERSION) {
      return getDefaultPlayerStats();
    }
    return parsed;
  } catch {
    return getDefaultPlayerStats();
  }
}

/**
 * Save stats to storage.
 *
 * @param {import('../types/card').PlayerStats} stats
 * @param {Pick<Storage, 'setItem'>} [storage]
 */
export function saveStats(stats, storage) {
  storage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

// ── Last-game-result storage (for restoring PostSolve on revisit) ────────

export const LAST_GAME_STORAGE_KEY = 'mtgordle-last-game';

/**
 * Save the most recent completed game per tier so revisits show the
 * completed state instead of starting a new puzzle.
 *
 * @param {string} tier — 'simple' | 'cryptic'
 * @param {object} result — { puzzleNumber, outcome, roundActions, cardOracleId }
 * @param {Pick<Storage, 'getItem' | 'setItem'>} storage
 */
export function saveLastGameResult(tier, result, storage) {
  let all = {};
  try {
    const raw = storage.getItem(LAST_GAME_STORAGE_KEY);
    if (raw) all = JSON.parse(raw) || {};
  } catch {}
  all[tier] = result;
  storage.setItem(LAST_GAME_STORAGE_KEY, JSON.stringify(all));
}

/**
 * Load the last completed game for a tier. Returns null if none or if the
 * stored puzzle doesn't match today's puzzle.
 *
 * @param {string} tier
 * @param {number} currentPuzzleNumber
 * @param {Pick<Storage, 'getItem'>} storage
 * @returns {object | null}
 */
export function loadLastGameResult(tier, currentPuzzleNumber, storage) {
  try {
    const raw = storage.getItem(LAST_GAME_STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    const entry = all?.[tier];
    if (!entry) return null;
    if (entry.puzzleNumber !== currentPuzzleNumber) return null;
    return entry;
  } catch {
    return null;
  }
}
