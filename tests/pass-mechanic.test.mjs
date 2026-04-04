/**
 * MTGordle — Pass Mechanic tests
 *
 * Tests the pass button, round advancement on pass, and round history display.
 * Covers AC-FA1-017 through AC-FA1-021.
 *
 * These tests validate the game logic functions that power the pass mechanic.
 * UI rendering is tested via the exported logic; React component rendering
 * is validated by the build + manual QA.
 *
 * Run with: node --test tests/pass-mechanic.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Import game logic from the pass-mechanic module
// ---------------------------------------------------------------------------

// We test the pure logic functions that GameBoard consumes.
// These are extracted into game-engine.ts so they can be unit-tested
// without a React rendering environment.

import {
  canPass,
  applyPass,
  applyGuess,
  getRoundActions,
  getRoundActionDisplay,
} from '../src/lib/game-engine.ts';

// ---------------------------------------------------------------------------
// AC-FA1-017: Pass button is visible alongside the guess input on rounds 1-5
// ---------------------------------------------------------------------------

describe('AC-FA1-017: Pass button visibility (rounds 1-5)', () => {
  test('canPass returns true for rounds 1 through 5', () => {
    for (let round = 1; round <= 5; round++) {
      assert.equal(
        canPass(round, false),
        true,
        `canPass should be true for round ${round}`
      );
    }
  });

  test('canPass returns false for round 6', () => {
    assert.equal(canPass(6, false), false);
  });

  test('canPass returns false when game is solved', () => {
    assert.equal(canPass(3, true), false);
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-018: Clicking pass advances to the next round and reveals next clue
// ---------------------------------------------------------------------------

describe('AC-FA1-018: Pass advances round and reveals next clue', () => {
  test('applyPass on round 1 returns round 2 with pass action recorded', () => {
    const actions = [];
    const result = applyPass(1, actions);
    assert.equal(result.nextRound, 2);
    assert.equal(result.actions.length, 1);
    assert.deepEqual(result.actions[0], { type: 'pass' });
  });

  test('applyPass on round 5 returns round 6', () => {
    const actions = [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ];
    const result = applyPass(5, actions);
    assert.equal(result.nextRound, 6);
    assert.equal(result.actions.length, 5);
    assert.deepEqual(result.actions[4], { type: 'pass' });
  });

  test('consecutive passes advance through all rounds', () => {
    let round = 1;
    let actions = [];
    for (let i = 0; i < 5; i++) {
      const result = applyPass(round, actions);
      round = result.nextRound;
      actions = result.actions;
    }
    assert.equal(round, 6);
    assert.equal(actions.length, 5);
    assert.ok(actions.every(a => a.type === 'pass'));
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-019: Pass button is NOT shown on round 6
// ---------------------------------------------------------------------------

describe('AC-FA1-019: No pass on round 6', () => {
  test('canPass returns false on round 6 even if not solved', () => {
    assert.equal(canPass(6, false), false);
  });

  test('canPass returns false on round 7+ (safety)', () => {
    assert.equal(canPass(7, false), false);
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-020: Round indicator shows current round (e.g., "Round 3 of 6")
// ---------------------------------------------------------------------------

describe('AC-FA1-020: Round indicator', () => {
  test('getRoundActionDisplay returns correct format for each round', () => {
    for (let round = 1; round <= 6; round++) {
      const display = getRoundActionDisplay(round);
      assert.equal(display, `Round ${round} of 6`);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-FA1-021: Previous rounds show pass/wrong guess indicators
// ---------------------------------------------------------------------------

describe('AC-FA1-021: Round history indicators', () => {
  test('getRoundActions returns empty array at start', () => {
    const actions = getRoundActions([]);
    assert.equal(actions.length, 0);
  });

  test('getRoundActions returns pass indicator after a pass', () => {
    const actions = getRoundActions([{ type: 'pass' }]);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'pass');
    assert.equal(actions[0].color, 'gray');
  });

  test('getRoundActions returns wrong indicator after a wrong guess', () => {
    const actions = getRoundActions([
      { type: 'guess', name: 'Lightning Bolt', isCorrect: false },
    ]);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'wrong');
    assert.equal(actions[0].color, 'red');
  });

  test('getRoundActions returns correct indicator after a correct guess', () => {
    const actions = getRoundActions([
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ]);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'correct');
    assert.equal(actions[0].color, 'green');
  });

  test('mixed history: pass, wrong, pass, wrong, correct', () => {
    const history = [
      { type: 'pass' },
      { type: 'guess', name: 'Doom Blade', isCorrect: false },
      { type: 'pass' },
      { type: 'guess', name: 'Dark Confidant', isCorrect: false },
      { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
    ];
    const actions = getRoundActions(history);
    assert.equal(actions.length, 5);
    assert.equal(actions[0].type, 'pass');
    assert.equal(actions[0].color, 'gray');
    assert.equal(actions[1].type, 'wrong');
    assert.equal(actions[1].color, 'red');
    assert.equal(actions[2].type, 'pass');
    assert.equal(actions[2].color, 'gray');
    assert.equal(actions[3].type, 'wrong');
    assert.equal(actions[3].color, 'red');
    assert.equal(actions[4].type, 'correct');
    assert.equal(actions[4].color, 'green');
  });

  test('applyGuess records wrong guess action', () => {
    const actions = [];
    const result = applyGuess(1, actions, 'Doom Blade', false);
    assert.equal(result.nextRound, 2);
    assert.equal(result.actions.length, 1);
    assert.deepEqual(result.actions[0], {
      type: 'guess',
      name: 'Doom Blade',
      isCorrect: false,
    });
  });

  test('applyGuess records correct guess action and jumps to round 6', () => {
    const actions = [{ type: 'pass' }];
    const result = applyGuess(2, actions, 'Lightning Bolt', true);
    assert.equal(result.nextRound, 6);
    assert.equal(result.actions.length, 2);
    assert.deepEqual(result.actions[1], {
      type: 'guess',
      name: 'Lightning Bolt',
      isCorrect: true,
    });
  });
});
