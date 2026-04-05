/**
 * MTGordle — localStorage Stats Engine tests
 *
 * Tests per-tier stats tracking: game recording, streak logic,
 * guess distribution, duplicate detection, and localStorage I/O.
 *
 * Run with: node --test tests/stats-engine.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultTierStats,
  getDefaultPlayerStats,
  recordGameResult,
  isDuplicateGame,
  loadStats,
  saveStats,
  STATS_STORAGE_KEY,
  STATS_SCHEMA_VERSION,
} from '../src/lib/stats-engine.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal in-memory localStorage mock */
function createMockStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  };
}

function makeResult(overrides = {}) {
  return {
    tier: 'simple',
    mode: 'daily',
    puzzleNumber: 1,
    solved: true,
    guessCount: 3,
    cluesUsed: 3,
    completedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Default stats
// ---------------------------------------------------------------------------

describe('getDefaultTierStats', () => {
  test('returns zeroed stats with null lastPlayedPuzzle', () => {
    const stats = getDefaultTierStats();
    assert.equal(stats.gamesPlayed, 0);
    assert.equal(stats.gamesWon, 0);
    assert.equal(stats.currentStreak, 0);
    assert.equal(stats.maxStreak, 0);
    assert.equal(stats.lastPlayedPuzzle, null);
    assert.deepEqual(stats.guessDistribution, {});
  });
});

describe('getDefaultPlayerStats', () => {
  test('returns default stats for both tiers', () => {
    const stats = getDefaultPlayerStats();
    assert.deepEqual(stats.simple, getDefaultTierStats());
    assert.deepEqual(stats.cryptic, getDefaultTierStats());
  });
});

// ---------------------------------------------------------------------------
// recordGameResult — basic recording
// ---------------------------------------------------------------------------

describe('recordGameResult — wins', () => {
  test('increments gamesPlayed and gamesWon on win', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ tier: 'simple', solved: true, guessCount: 2, puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.simple.gamesPlayed, 1);
    assert.equal(updated.simple.gamesWon, 1);
  });

  test('records guess distribution on win', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ tier: 'simple', solved: true, guessCount: 4, puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.simple.guessDistribution[4], 1);
  });

  test('accumulates guess distribution across multiple wins', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ guessCount: 3, puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ guessCount: 3, puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ guessCount: 5, puzzleNumber: 3 }));
    assert.equal(stats.simple.guessDistribution[3], 2);
    assert.equal(stats.simple.guessDistribution[5], 1);
  });

  test('updates lastPlayedPuzzle', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ puzzleNumber: 42 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.simple.lastPlayedPuzzle, 42);
  });
});

describe('recordGameResult — losses', () => {
  test('increments gamesPlayed but not gamesWon on loss', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ solved: false, puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.simple.gamesPlayed, 1);
    assert.equal(updated.simple.gamesWon, 0);
  });

  test('does not record guess distribution on loss', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ solved: false, guessCount: 6, puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.deepEqual(updated.simple.guessDistribution, {});
  });
});

// ---------------------------------------------------------------------------
// recordGameResult — per-tier isolation
// ---------------------------------------------------------------------------

describe('recordGameResult — per-tier isolation', () => {
  test('simple result only affects simple tier', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ tier: 'simple', puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.simple.gamesPlayed, 1);
    assert.equal(updated.cryptic.gamesPlayed, 0);
  });

  test('cryptic result only affects cryptic tier', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ tier: 'cryptic', puzzleNumber: 1 });
    const updated = recordGameResult(stats, result);
    assert.equal(updated.cryptic.gamesPlayed, 1);
    assert.equal(updated.simple.gamesPlayed, 0);
  });
});

// ---------------------------------------------------------------------------
// recordGameResult — streak logic
// ---------------------------------------------------------------------------

describe('recordGameResult — streaks', () => {
  test('win starts a streak at 1', () => {
    const stats = getDefaultPlayerStats();
    const updated = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    assert.equal(updated.simple.currentStreak, 1);
    assert.equal(updated.simple.maxStreak, 1);
  });

  test('consecutive wins increment streak', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3 }));
    assert.equal(stats.simple.currentStreak, 3);
    assert.equal(stats.simple.maxStreak, 3);
  });

  test('loss resets current streak to 0', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.currentStreak, 2);

    stats = recordGameResult(stats, makeResult({ solved: false, puzzleNumber: 3 }));
    assert.equal(stats.simple.currentStreak, 0);
  });

  test('loss does not decrease maxStreak', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.maxStreak, 2);

    stats = recordGameResult(stats, makeResult({ solved: false, puzzleNumber: 3 }));
    assert.equal(stats.simple.maxStreak, 2);
  });

  test('new streak after loss can exceed old maxStreak', () => {
    let stats = getDefaultPlayerStats();
    // Win 2, lose 1, win 3
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ solved: false, puzzleNumber: 3 }));
    assert.equal(stats.simple.maxStreak, 2);

    stats = recordGameResult(stats, makeResult({ puzzleNumber: 4 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 5 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 6 }));
    assert.equal(stats.simple.currentStreak, 3);
    assert.equal(stats.simple.maxStreak, 3);
  });
});

// ---------------------------------------------------------------------------
// recordGameResult — practice mode ignored
// ---------------------------------------------------------------------------

describe('recordGameResult — practice mode', () => {
  test('practice games are not recorded', () => {
    const stats = getDefaultPlayerStats();
    const result = makeResult({ mode: 'practice', puzzleNumber: -1 });
    const updated = recordGameResult(stats, result);
    assert.deepEqual(updated, stats);
  });
});

// ---------------------------------------------------------------------------
// isDuplicateGame
// ---------------------------------------------------------------------------

describe('isDuplicateGame', () => {
  test('returns false for fresh stats', () => {
    const stats = getDefaultPlayerStats();
    assert.equal(isDuplicateGame(stats, 'simple', 1), false);
  });

  test('returns true if puzzleNumber matches lastPlayedPuzzle', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 5 }));
    assert.equal(isDuplicateGame(stats, 'simple', 5), true);
  });

  test('returns false for different puzzleNumber', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 5 }));
    assert.equal(isDuplicateGame(stats, 'simple', 6), false);
  });

  test('checks correct tier', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 5 }));
    // Simple tier played puzzle 5, cryptic tier has not
    assert.equal(isDuplicateGame(stats, 'cryptic', 5), false);
  });
});

// ---------------------------------------------------------------------------
// localStorage I/O — loadStats / saveStats
// ---------------------------------------------------------------------------

describe('loadStats', () => {
  test('returns defaults when storage is empty', () => {
    const storage = createMockStorage();
    const stats = loadStats(storage);
    assert.deepEqual(stats, getDefaultPlayerStats());
  });

  test('returns defaults when storage has invalid JSON', () => {
    const storage = createMockStorage();
    storage.setItem(STATS_STORAGE_KEY, 'not json');
    const stats = loadStats(storage);
    assert.deepEqual(stats, getDefaultPlayerStats());
  });

  test('loads previously saved stats', () => {
    const storage = createMockStorage();
    const original = getDefaultPlayerStats();
    const updated = recordGameResult(original, makeResult({ tier: 'simple', puzzleNumber: 1 }));
    saveStats(updated, storage);

    const loaded = loadStats(storage);
    assert.equal(loaded.simple.gamesPlayed, 1);
    assert.equal(loaded.simple.gamesWon, 1);
    assert.equal(loaded.simple.currentStreak, 1);
  });
});

describe('saveStats', () => {
  test('persists stats to storage under the correct key', () => {
    const storage = createMockStorage();
    const stats = getDefaultPlayerStats();
    saveStats(stats, storage);
    const raw = storage.getItem(STATS_STORAGE_KEY);
    assert.ok(raw !== null);
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, stats);
  });
});

// ---------------------------------------------------------------------------
// Schema version (AC-FIX-STATS-SV-001..005)
// ---------------------------------------------------------------------------

describe('schema version', () => {
  test('STATS_SCHEMA_VERSION is exported as "1.0"', () => {
    assert.equal(STATS_SCHEMA_VERSION, '1.0');
  });

  test('getDefaultPlayerStats includes _schema_version: "1.0" at top level', () => {
    const defaults = getDefaultPlayerStats();
    assert.equal(defaults._schema_version, '1.0');
  });

  test('saveStats persists _schema_version to storage', () => {
    const storage = createMockStorage();
    saveStats(getDefaultPlayerStats(), storage);
    const raw = storage.getItem(STATS_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    assert.equal(parsed._schema_version, '1.0');
  });

  test('loadStats falls back to defaults when stored blob is missing _schema_version (legacy)', () => {
    const storage = createMockStorage();
    const legacyBlob = {
      simple: { ...getDefaultTierStats(), gamesPlayed: 42, gamesWon: 30 },
      cryptic: getDefaultTierStats(),
    };
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(legacyBlob));

    const loaded = loadStats(storage);
    assert.deepEqual(loaded, getDefaultPlayerStats());
    assert.equal(loaded.simple.gamesPlayed, 0);
  });

  test('loadStats falls back to defaults when _schema_version is unknown/future', () => {
    const storage = createMockStorage();
    const futureBlob = {
      _schema_version: '9.9',
      simple: { ...getDefaultTierStats(), gamesPlayed: 7 },
      cryptic: getDefaultTierStats(),
    };
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(futureBlob));

    const loaded = loadStats(storage);
    assert.deepEqual(loaded, getDefaultPlayerStats());
  });

  test('loadStats preserves stored data when _schema_version matches current version', () => {
    const storage = createMockStorage();
    const original = getDefaultPlayerStats();
    const updated = recordGameResult(original, makeResult({ tier: 'simple', puzzleNumber: 1 }));
    saveStats(updated, storage);

    const loaded = loadStats(storage);
    assert.equal(loaded._schema_version, '1.0');
    assert.equal(loaded.simple.gamesPlayed, 1);
    assert.equal(loaded.simple.gamesWon, 1);
    assert.equal(loaded.simple.currentStreak, 1);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('immutability', () => {
  test('recordGameResult does not mutate input stats', () => {
    const stats = getDefaultPlayerStats();
    const frozen = JSON.parse(JSON.stringify(stats));
    recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    assert.deepEqual(stats, frozen);
  });
});
