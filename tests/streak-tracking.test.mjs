/**
 * MTGordle — Streak Tracking tests (AC-FA5-006 through AC-FA5-010)
 *
 * Tests streak logic (current, max, missed-day reset) and win percentage.
 *
 * Run with: node --test tests/streak-tracking.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultPlayerStats,
  recordGameResult,
  getWinPercentage,
} from '../src/lib/stats-engine.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// AC-FA5-006: Current streak increments on consecutive daily solves
// ---------------------------------------------------------------------------

describe('AC-FA5-006: streak increments on consecutive solves', () => {
  test('first win starts streak at 1', () => {
    const stats = getDefaultPlayerStats();
    const updated = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    assert.equal(updated.simple.currentStreak, 1);
  });

  test('consecutive puzzle numbers increment streak', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3 }));
    assert.equal(stats.simple.currentStreak, 3);
  });

  test('streak only counts solved games (X/6 does not increment)', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    assert.equal(stats.simple.currentStreak, 1);
    // Loss on next consecutive puzzle
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2, solved: false }));
    assert.equal(stats.simple.currentStreak, 0);
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-007: Current streak resets on missed day or X/6
// ---------------------------------------------------------------------------

describe('AC-FA5-007: streak resets on missed day or X/6', () => {
  test('X/6 result resets streak to 0', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.currentStreak, 2);
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3, solved: false }));
    assert.equal(stats.simple.currentStreak, 0);
  });

  test('missed day (non-consecutive puzzle number) resets streak', () => {
    let stats = getDefaultPlayerStats();
    // Win puzzle 1 and 2
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.currentStreak, 2);
    // Skip puzzle 3, play puzzle 4 — streak should reset then start fresh
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 4 }));
    assert.equal(stats.simple.currentStreak, 1);
  });

  test('missed multiple days resets streak', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    assert.equal(stats.simple.currentStreak, 1);
    // Skip 5 days
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 7 }));
    assert.equal(stats.simple.currentStreak, 1);
  });

  test('missed day + loss results in streak 0', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.currentStreak, 2);
    // Skip puzzle 3, lose puzzle 4
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 4, solved: false }));
    assert.equal(stats.simple.currentStreak, 0);
  });

  test('first game ever with high puzzle number starts streak at 1 (no missed day penalty)', () => {
    // lastPlayedPuzzle is null — no prior game, so no missed day
    const stats = getDefaultPlayerStats();
    const updated = recordGameResult(stats, makeResult({ puzzleNumber: 100 }));
    assert.equal(updated.simple.currentStreak, 1);
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-008: Max streak is the highest current streak ever
// ---------------------------------------------------------------------------

describe('AC-FA5-008: max streak tracking', () => {
  test('max streak equals current streak when only winning', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(stats.simple.maxStreak, 2);
  });

  test('max streak preserved after loss', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3, solved: false }));
    assert.equal(stats.simple.maxStreak, 2);
    assert.equal(stats.simple.currentStreak, 0);
  });

  test('max streak preserved after missed day', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3 }));
    assert.equal(stats.simple.maxStreak, 3);
    // Skip puzzle 4, win puzzle 5 — new streak is 1, max stays 3
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 5 }));
    assert.equal(stats.simple.currentStreak, 1);
    assert.equal(stats.simple.maxStreak, 3);
  });

  test('new streak can exceed old max', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3, solved: false }));
    assert.equal(stats.simple.maxStreak, 2);
    // New streak of 3
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 4 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 5 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 6 }));
    assert.equal(stats.simple.maxStreak, 3);
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-009: Win percentage = (games_won / games_played) * 100
// ---------------------------------------------------------------------------

describe('AC-FA5-009: win percentage', () => {
  test('returns 0 when no games played', () => {
    const stats = getDefaultPlayerStats();
    assert.equal(getWinPercentage(stats.simple), 0);
  });

  test('returns 100 when all games won', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    assert.equal(getWinPercentage(stats.simple), 100);
  });

  test('returns 50 when half games won', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2, solved: false }));
    assert.equal(getWinPercentage(stats.simple), 50);
  });

  test('returns rounded integer', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 3, solved: false }));
    // 2/3 = 66.666... → 67
    assert.equal(getWinPercentage(stats.simple), 67);
  });

  test('returns 0 when all games lost', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 1, solved: false }));
    stats = recordGameResult(stats, makeResult({ puzzleNumber: 2, solved: false }));
    assert.equal(getWinPercentage(stats.simple), 0);
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-010: Streak tracked per-tier
// ---------------------------------------------------------------------------

describe('AC-FA5-010: per-tier streak isolation', () => {
  test('simple streak independent of cryptic streak', () => {
    let stats = getDefaultPlayerStats();
    // Win 3 simple in a row
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 3 }));
    // Lose cryptic
    stats = recordGameResult(stats, makeResult({ tier: 'cryptic', puzzleNumber: 1, solved: false }));

    assert.equal(stats.simple.currentStreak, 3);
    assert.equal(stats.cryptic.currentStreak, 0);
  });

  test('win percentage independent per tier', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ tier: 'cryptic', puzzleNumber: 1, solved: false }));
    assert.equal(getWinPercentage(stats.simple), 100);
    assert.equal(getWinPercentage(stats.cryptic), 0);
  });

  test('missed day on one tier does not affect the other', () => {
    let stats = getDefaultPlayerStats();
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 2 }));
    stats = recordGameResult(stats, makeResult({ tier: 'cryptic', puzzleNumber: 1 }));
    stats = recordGameResult(stats, makeResult({ tier: 'cryptic', puzzleNumber: 2 }));
    // Skip simple puzzle 3, play simple puzzle 4
    stats = recordGameResult(stats, makeResult({ tier: 'simple', puzzleNumber: 4 }));
    // Cryptic plays consecutive puzzle 3
    stats = recordGameResult(stats, makeResult({ tier: 'cryptic', puzzleNumber: 3 }));

    assert.equal(stats.simple.currentStreak, 1); // reset due to missed day
    assert.equal(stats.cryptic.currentStreak, 3); // unaffected
  });
});
