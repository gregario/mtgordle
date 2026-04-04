/**
 * MTGordle — Win/Lose Detection + Score Calculation tests
 *
 * Tests win detection, score calculation, wrong guess advancement,
 * and game-over state transitions.
 * Covers AC-FA1-022 through AC-FA1-026.
 *
 * Run with: node --test tests/win-lose-detection.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyGuess,
  applyPass,
  calculateScore,
  isGameOver,
  getGameOutcome,
} from '../src/lib/game-engine.ts';

import { validateGuess } from '../src/lib/guess-validator.mjs';

// ---------------------------------------------------------------------------
// AC-FA1-022: Correct guess is detected (case-insensitive exact match)
// ---------------------------------------------------------------------------

describe('AC-FA1-022: Correct guess detection', () => {
  const targetCard = {
    name: 'Lightning Bolt',
    nicknames: ['bolt'],
  };

  test('exact name match is correct', () => {
    const result = validateGuess('Lightning Bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('case-insensitive match is correct', () => {
    const result = validateGuess('lightning bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('mixed case match is correct', () => {
    const result = validateGuess('LIGHTNING BOLT', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('extra whitespace is normalized', () => {
    const result = validateGuess('  Lightning   Bolt  ', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('nickname match is correct', () => {
    const result = validateGuess('bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'nickname');
  });

  test('wrong guess is not correct', () => {
    const result = validateGuess('Doom Blade', targetCard);
    assert.equal(result.isCorrect, false);
    assert.equal(result.matchType, 'none');
  });

  test('empty guess is not correct', () => {
    const result = validateGuess('', targetCard);
    assert.equal(result.isCorrect, false);
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-023: Score is calculated as round number of correct guess (1/6–6/6)
// ---------------------------------------------------------------------------

describe('AC-FA1-023: Score calculation', () => {
  test('correct guess on round 1 scores 1', () => {
    const actions = [{ type: 'guess', name: 'Lightning Bolt', isCorrect: true }];
    assert.equal(calculateScore(actions), 1);
  });

  test('correct guess on round 3 (after 2 passes) scores 3', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    assert.equal(calculateScore(actions), 3);
  });

  test('correct guess on round 4 (after wrong + pass + wrong) scores 4', () => {
    const actions = [
      { type: 'guess', name: 'Doom Blade', isCorrect: false },
      { type: 'pass' },
      { type: 'guess', name: 'Dark Confidant', isCorrect: false },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    assert.equal(calculateScore(actions), 4);
  });

  test('correct guess on round 6 scores 6', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    assert.equal(calculateScore(actions), 6);
  });

  test('score equals the round number (1-indexed), not action count', () => {
    // Round 2: pass then correct guess
    const actions = [
      { type: 'pass' },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    assert.equal(calculateScore(actions), 2);
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-024: Failed game (wrong on round 6) scores as X/6
// ---------------------------------------------------------------------------

describe('AC-FA1-024: Failed game scores X/6', () => {
  test('all passes then wrong guess on round 6 returns null (X/6)', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Doom Blade', isCorrect: false },
    ];
    assert.equal(calculateScore(actions), null);
  });

  test('mixed actions ending in wrong guess on round 6 returns null', () => {
    const actions = [
      { type: 'guess', name: 'A', isCorrect: false },
      { type: 'pass' },
      { type: 'guess', name: 'B', isCorrect: false },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'C', isCorrect: false },
    ];
    assert.equal(calculateScore(actions), null);
  });

  test('no correct guess in actions returns null', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ];
    // All passes, no guess at all — edge case, still X/6
    assert.equal(calculateScore(actions), null);
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-025: Wrong guess on rounds 1-5 shows feedback, advances, reveals clue
// ---------------------------------------------------------------------------

describe('AC-FA1-025: Wrong guess advancement', () => {
  test('wrong guess on round 1 advances to round 2', () => {
    const result = applyGuess(1, [], 'Doom Blade', false);
    assert.equal(result.nextRound, 2);
    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].isCorrect, false);
  });

  test('wrong guess on round 5 advances to round 6', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ];
    const result = applyGuess(5, actions, 'Doom Blade', false);
    assert.equal(result.nextRound, 6);
  });

  test('wrong guess on round 6 stays at round 6', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ];
    const result = applyGuess(6, actions, 'Doom Blade', false);
    assert.equal(result.nextRound, 6);
    assert.equal(result.actions.length, 6);
  });

  test('wrong guess records the guessed name', () => {
    const result = applyGuess(1, [], 'Doom Blade', false);
    assert.equal(result.actions[0].name, 'Doom Blade');
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-026: Game state transitions to post-solve
// ---------------------------------------------------------------------------

describe('AC-FA1-026: Game-over detection', () => {
  test('isGameOver returns false at start', () => {
    assert.equal(isGameOver(1, [], false), false);
  });

  test('isGameOver returns true when solved', () => {
    assert.equal(isGameOver(6, [{ type: 'guess', name: 'X', isCorrect: true }], true), true);
  });

  test('isGameOver returns true after wrong guess on round 6 (6 actions taken)', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Wrong', isCorrect: false },
    ];
    assert.equal(isGameOver(6, actions, false), true);
  });

  test('isGameOver returns false mid-game with wrong guess', () => {
    const actions = [{ type: 'guess', name: 'Wrong', isCorrect: false }];
    assert.equal(isGameOver(2, actions, false), false);
  });

  test('isGameOver returns true after 6 passes (all rounds exhausted)', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ];
    // After 5 passes, we're on round 6. Then a guess or pass on round 6:
    assert.equal(isGameOver(6, [...actions, { type: 'guess', name: 'X', isCorrect: false }], false), true);
  });
});

describe('AC-FA1-026: getGameOutcome', () => {
  test('returns win with correct round on correct guess round 3', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    const outcome = getGameOutcome(actions);
    assert.equal(outcome.won, true);
    assert.equal(outcome.score, 3);
    assert.equal(outcome.scoreDisplay, '3/6');
  });

  test('returns loss on failed round 6', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'Wrong', isCorrect: false },
    ];
    const outcome = getGameOutcome(actions);
    assert.equal(outcome.won, false);
    assert.equal(outcome.score, null);
    assert.equal(outcome.scoreDisplay, 'X/6');
  });

  test('returns win on round 1 correct', () => {
    const actions = [
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    const outcome = getGameOutcome(actions);
    assert.equal(outcome.won, true);
    assert.equal(outcome.score, 1);
    assert.equal(outcome.scoreDisplay, '1/6');
  });

  test('returns win on round 6 correct', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'guess', name: 'X', isCorrect: true },
    ];
    const outcome = getGameOutcome(actions);
    assert.equal(outcome.won, true);
    assert.equal(outcome.score, 6);
    assert.equal(outcome.scoreDisplay, '6/6');
  });
});
