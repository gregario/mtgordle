import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the module under test — does not exist yet (TDD red)
import { generateShareText } from '../src/lib/share-grid.mjs';

// ---------------------------------------------------------------------------
// AC-FA4-006: Share text includes header:
//   'MTGordle #[number] ([tier]) [score]/6'
// ---------------------------------------------------------------------------
describe('AC-FA4-006: Share text header', () => {
  it('header line includes puzzle number, tier, and score', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong Card', isCorrect: false },
        { type: 'guess', name: 'Lightning Bolt', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[0], 'MTGordle #1 (Simple) 3/6');
  });

  it('header handles X/6 score for lost game', () => {
    const text = generateShareText({
      puzzleNumber: 42,
      tier: 'Cryptic',
      scoreDisplay: 'X/6',
      colorIdentity: ['B', 'R'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'A', isCorrect: false },
        { type: 'guess', name: 'B', isCorrect: false },
        { type: 'guess', name: 'C', isCorrect: false },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[0], 'MTGordle #42 (Cryptic) X/6');
  });

  it('header handles 1/6 score (first-round win)', () => {
    const text = generateShareText({
      puzzleNumber: 365,
      tier: 'Simple',
      scoreDisplay: '1/6',
      colorIdentity: ['W'],
      actions: [
        { type: 'guess', name: 'Swords to Plowshares', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[0], 'MTGordle #365 (Simple) 1/6');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-007: Second line shows mana pip emoji approximation of color identity
// ---------------------------------------------------------------------------
describe('AC-FA4-007: Mana pip emoji line', () => {
  it('single color U → 🔵', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[1], '🔵');
  });

  it('multicolor UW → 🔵⚪ (individual pips)', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '2/6',
      colorIdentity: ['U', 'W'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    // colorIdentityEmoji for ['U', 'W'] = '🔵⚪'
    assert.equal(lines[1], '🔵⚪');
  });

  it('colorless → ◇', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '4/6',
      colorIdentity: [],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[1], '◇');
  });

  it('all five colors → five individual emoji pips', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '6/6',
      colorIdentity: ['W', 'U', 'B', 'R', 'G'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[1], '⚪🔵⚫🔴🟢');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-008: Emoji grid: green = correct, red = wrong, gray = pass
// ---------------------------------------------------------------------------
describe('AC-FA4-008: Emoji grid squares', () => {
  it('pass → ⬜, wrong → 🟥, correct → 🟩', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong', isCorrect: false },
        { type: 'guess', name: 'Right', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[2], '⬜🟥🟩');
  });

  it('all passes then correct on round 6', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '6/6',
      colorIdentity: ['R'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[2], '⬜⬜⬜⬜⬜🟩');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-009: Grid stops at winning round (no unused squares)
// ---------------------------------------------------------------------------
describe('AC-FA4-009: Grid stops at winning round', () => {
  it('1/6 win shows single green square', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '1/6',
      colorIdentity: ['G'],
      actions: [
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[2], '🟩');
  });

  it('3/6 win shows exactly 3 squares', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong', isCorrect: false },
        { type: 'guess', name: 'Right', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    const grid = lines[2];
    // Each emoji is multi-byte. Count by splitting on emoji boundaries.
    const squares = [...grid];
    // ⬜🟥🟩 = 3 visible emoji
    assert.equal(squares.length, 3);
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-010: Failed game (X/6) shows all 6 squares
// ---------------------------------------------------------------------------
describe('AC-FA4-010: Failed game shows all 6 squares', () => {
  it('X/6 shows exactly 6 squares', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Cryptic',
      scoreDisplay: 'X/6',
      colorIdentity: ['B'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'A', isCorrect: false },
        { type: 'guess', name: 'B', isCorrect: false },
        { type: 'guess', name: 'C', isCorrect: false },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[2], '⬜⬜⬜🟥🟥🟥');
  });

  it('all wrong guesses shows 6 red squares', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Cryptic',
      scoreDisplay: 'X/6',
      colorIdentity: ['R'],
      actions: [
        { type: 'guess', name: 'A', isCorrect: false },
        { type: 'guess', name: 'B', isCorrect: false },
        { type: 'guess', name: 'C', isCorrect: false },
        { type: 'guess', name: 'D', isCorrect: false },
        { type: 'guess', name: 'E', isCorrect: false },
        { type: 'guess', name: 'F', isCorrect: false },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[2], '🟥🟥🟥🟥🟥🟥');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-011: Share text includes configurable URL on last line
// ---------------------------------------------------------------------------
describe('AC-FA4-011: Configurable URL on last line', () => {
  it('default URL is mtgordle.vercel.app', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '1/6',
      colorIdentity: ['W'],
      actions: [
        { type: 'guess', name: 'X', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines[lines.length - 1], 'mtgordle.vercel.app');
  });

  it('custom URL is used when provided', () => {
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '1/6',
      colorIdentity: ['W'],
      actions: [
        { type: 'guess', name: 'X', isCorrect: true },
      ],
      baseUrl: 'https://mtgordle.com',
    });
    const lines = text.split('\n');
    assert.equal(lines[lines.length - 1], 'mtgordle.com');
  });
});

// ---------------------------------------------------------------------------
// Integration: Full share text format
// ---------------------------------------------------------------------------
describe('Integration: full share text matches spec example', () => {
  it('matches the spec example format', () => {
    // Spec example:
    // MTGordle #1 (Simple) 3/6
    // 🔵⚪
    // ⬜🟥🟩
    // mtgordle.vercel.app
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U', 'W'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong', isCorrect: false },
        { type: 'guess', name: 'Right', isCorrect: true },
      ],
    });
    const expected = [
      'MTGordle #1 (Simple) 3/6',
      '🔵⚪',
      '⬜🟥🟩',
      'mtgordle.vercel.app',
    ].join('\n');
    assert.equal(text, expected);
  });

  it('4 lines total: header, mana, grid, url', () => {
    const text = generateShareText({
      puzzleNumber: 10,
      tier: 'Cryptic',
      scoreDisplay: '5/6',
      colorIdentity: ['B', 'G'],
      actions: [
        { type: 'pass' },
        { type: 'pass' },
        { type: 'guess', name: 'A', isCorrect: false },
        { type: 'pass' },
        { type: 'guess', name: 'B', isCorrect: true },
      ],
    });
    const lines = text.split('\n');
    assert.equal(lines.length, 4);
  });
});
