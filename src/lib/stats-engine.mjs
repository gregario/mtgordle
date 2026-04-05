/**
 * Stats engine — localStorage-backed per-tier statistics for MTGordle.
 *
 * Pure functions for stat computation. localStorage I/O accepts a
 * storage parameter for testability (defaults to window.localStorage).
 */

export const STATS_STORAGE_KEY = 'mtgordle-stats';

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
    return JSON.parse(raw);
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
