/**
 * MTGordle — Post-Solve Layout tests
 *
 * Verifies the PostSolve component structure and element ordering
 * for AC-FA4-001 through AC-FA4-005.
 *
 * Strategy: read PostSolve.tsx source and verify structural requirements
 * (element presence, ordering), plus test pure helper logic where applicable.
 *
 * Run with: node --test tests/post-solve-layout.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postSolvePath = resolve(__dirname, '../src/components/PostSolve.tsx');
const gameBoardPath = resolve(__dirname, '../src/components/GameBoard.tsx');

// ---------------------------------------------------------------------------
// Structural: PostSolve component exists
// ---------------------------------------------------------------------------

describe('PostSolve component existence', () => {
  test('src/components/PostSolve.tsx exists', () => {
    assert.ok(existsSync(postSolvePath), 'PostSolve.tsx must exist');
  });

  test('PostSolve is a default export function', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      /export\s+default\s+function\s+PostSolve/.test(source),
      'PostSolve must be a default exported function component'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-001: Score displayed prominently at top (e.g., '3/6')
// ---------------------------------------------------------------------------

describe('AC-FA4-001: Score displayed prominently at top', () => {
  test('PostSolve renders a score-display element', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('data-testid="score-display"'),
      'PostSolve must contain a score-display test ID'
    );
  });

  test('score-display renders scoreDisplay value', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('scoreDisplay'),
      'PostSolve must reference scoreDisplay (from outcome or props)'
    );
  });

  test('score-display appears before share button in source order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const scoreIdx = source.indexOf('data-testid="score-display"');
    const shareIdx = source.indexOf('data-testid="share-button"');
    assert.ok(scoreIdx !== -1, 'score-display element must exist');
    assert.ok(shareIdx !== -1, 'share-button element must exist');
    assert.ok(scoreIdx < shareIdx, 'score-display must appear before share-button in DOM order');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-002: Share button immediately below score, above fold on mobile
// ---------------------------------------------------------------------------

describe('AC-FA4-002: Share button below score, above fold', () => {
  test('PostSolve renders a share-button element', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('data-testid="share-button"'),
      'PostSolve must contain a share-button test ID'
    );
  });

  test('share-button appears before card-art in source order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const shareIdx = source.indexOf('data-testid="share-button"');
    const artIdx = source.indexOf('data-testid="card-art"');
    assert.ok(shareIdx !== -1, 'share-button element must exist');
    assert.ok(artIdx !== -1, 'card-art element must exist');
    assert.ok(shareIdx < artIdx, 'share-button must appear before card-art in DOM order');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-003: Card art displayed large below share button
// ---------------------------------------------------------------------------

describe('AC-FA4-003: Card art displayed large below share button', () => {
  test('PostSolve renders a card-art element', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('data-testid="card-art"'),
      'PostSolve must contain a card-art test ID'
    );
  });

  test('card-art contains an img element with card image_uri', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('<img') && source.includes('image_uri'),
      'PostSolve must render an <img> using card.image_uri'
    );
  });

  test('card-art appears before lore-blurb in source order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const artIdx = source.indexOf('data-testid="card-art"');
    const loreIdx = source.indexOf('data-testid="lore-blurb"');
    assert.ok(artIdx !== -1, 'card-art element must exist');
    assert.ok(loreIdx !== -1, 'lore-blurb element must exist');
    assert.ok(artIdx < loreIdx, 'card-art must appear before lore-blurb in DOM order');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-004: Lore blurb displayed below card art
// ---------------------------------------------------------------------------

describe('AC-FA4-004: Lore blurb displayed below card art', () => {
  test('PostSolve renders a lore-blurb element', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('data-testid="lore-blurb"'),
      'PostSolve must contain a lore-blurb test ID'
    );
  });

  test('lore-blurb references card.lore_blurb', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('lore_blurb'),
      'PostSolve must reference lore_blurb from card data'
    );
  });

  test('lore-blurb appears before stats-section in source order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const loreIdx = source.indexOf('data-testid="lore-blurb"');
    const statsIdx = source.indexOf('data-testid="stats-section"');
    assert.ok(loreIdx !== -1, 'lore-blurb element must exist');
    assert.ok(statsIdx !== -1, 'stats-section element must exist');
    assert.ok(loreIdx < statsIdx, 'lore-blurb must appear before stats-section in DOM order');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-005: Personal stats section below lore blurb
// ---------------------------------------------------------------------------

describe('AC-FA4-005: Stats section below lore blurb', () => {
  test('PostSolve renders a stats-section element', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('data-testid="stats-section"'),
      'PostSolve must contain a stats-section test ID'
    );
  });

  test('stats-section is the last major content section', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const statsIdx = source.indexOf('data-testid="stats-section"');
    // Ensure no other major data-testid sections appear after stats
    const afterStats = source.slice(statsIdx + 1);
    const majorSections = ['score-display', 'share-button', 'card-art', 'lore-blurb'];
    for (const section of majorSections) {
      assert.ok(
        !afterStats.includes(`data-testid="${section}"`),
        `${section} must not appear after stats-section`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: GameBoard uses PostSolve component
// ---------------------------------------------------------------------------

describe('GameBoard integration with PostSolve', () => {
  test('GameBoard imports PostSolve', () => {
    const source = readFileSync(gameBoardPath, 'utf-8');
    assert.ok(
      source.includes('PostSolve') && source.includes('import'),
      'GameBoard must import the PostSolve component'
    );
  });

  test('GameBoard renders PostSolve when game is over', () => {
    const source = readFileSync(gameBoardPath, 'utf-8');
    assert.ok(
      source.includes('<PostSolve'),
      'GameBoard must render <PostSolve when game is over'
    );
  });
});

// ---------------------------------------------------------------------------
// Full DOM order verification: score → share → art → lore → stats
// ---------------------------------------------------------------------------

describe('Complete layout order: score → share → art → lore → stats', () => {
  test('all 5 sections appear in correct order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const sections = [
      'data-testid="score-display"',
      'data-testid="share-button"',
      'data-testid="card-art"',
      'data-testid="lore-blurb"',
      'data-testid="stats-section"',
    ];
    const indices = sections.map(s => source.indexOf(s));
    for (const idx of indices) {
      assert.ok(idx !== -1, `Section not found in PostSolve`);
    }
    for (let i = 0; i < indices.length - 1; i++) {
      assert.ok(
        indices[i] < indices[i + 1],
        `Section ${sections[i]} (idx ${indices[i]}) must appear before ${sections[i + 1]} (idx ${indices[i + 1]})`
      );
    }
  });
});
