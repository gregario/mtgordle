/**
 * MTGordle — Practice Mode UI tests (story: practice-mode-ui)
 *
 * Covers: AC-FA6-009, AC-FA6-010, AC-FA6-011, AC-FA6-012
 *
 * Strategy: structural source analysis (mirrors practice-mode-flow test style).
 * Verifies that PostSolve correctly distinguishes practice mode from daily:
 * - hides the Share button in practice
 * - preserves card art + lore blurb in practice
 * - shows a 'Back to Home' link in practice
 * And that stats-engine silently drops practice results (no stats contribution).
 *
 * Run with: node --test tests/practice-mode-ui.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postSolvePath = resolve(__dirname, '../src/components/PostSolve.tsx');
const statsEnginePath = resolve(__dirname, '../src/lib/stats-engine.mjs');

const postSolveSrc = readFileSync(postSolvePath, 'utf-8');
const statsEngineSrc = readFileSync(statsEnginePath, 'utf-8');

// ---------------------------------------------------------------------------
// AC-FA6-009: Share button is NOT shown on practice post-solve screen
// ---------------------------------------------------------------------------

describe('AC-FA6-009: Share button hidden in practice mode', () => {
  test('share-button render is gated on mode !== "practice"', () => {
    // Find the block that renders the share-button testid
    const shareBlockMatch = postSolveSrc.match(
      /\{[^{}]*mode[^{}]*!==[^{}]*['"]practice['"][^{}]*&&[\s\S]*?data-testid=["']share-button["'][\s\S]*?\}\s*(?:\{|<\/|$)/
    );
    assert.ok(
      shareBlockMatch,
      'Share button must be wrapped in a {mode !== "practice" && ...} conditional'
    );
  });

  test('share-button is NOT unconditionally rendered', () => {
    // Count share-button testid occurrences — must appear, but only in guarded context
    const shareMatches = postSolveSrc.match(/data-testid=["']share-button["']/g) || [];
    assert.equal(
      shareMatches.length,
      1,
      'share-button should appear exactly once in the source'
    );
    // Confirm it's downstream of a practice guard
    const idx = postSolveSrc.indexOf('data-testid="share-button"');
    const before = postSolveSrc.slice(0, idx);
    const lastGuard = before.lastIndexOf("!== 'practice'");
    const lastOpenBrace = before.lastIndexOf('{');
    assert.ok(
      lastGuard > -1 && lastGuard > lastOpenBrace - 200,
      'share-button must sit inside a practice-mode guard'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-010: Practice results do NOT affect daily stats or streaks
// ---------------------------------------------------------------------------

describe('AC-FA6-010: Practice results do not affect stats', () => {
  test('recordGameResult short-circuits on practice mode', () => {
    assert.ok(
      /result\.mode\s*===\s*['"]practice['"]\s*\)\s*return\s+stats/.test(statsEngineSrc),
      'recordGameResult must return stats unchanged when mode is "practice"'
    );
  });

  test('PostSolve passes mode through to recordGameResult', () => {
    assert.ok(
      /recordGameResult\s*\([\s\S]*?mode[\s\S]*?\)/.test(postSolveSrc),
      'PostSolve must include mode in the recordGameResult payload'
    );
  });

  test('isDuplicateGame guard is gated on daily mode', () => {
    assert.ok(
      /mode\s*===\s*['"]daily['"][\s\S]{0,80}isDuplicateGame/.test(postSolveSrc),
      'isDuplicateGame must only be checked for daily mode (practice should be recordable but no-op)'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-011: Practice post-solve still shows card art and lore blurb
// ---------------------------------------------------------------------------

describe('AC-FA6-011: Card art and lore blurb shown in practice mode', () => {
  test('card-art is rendered unconditionally (not gated on mode)', () => {
    const idx = postSolveSrc.indexOf('data-testid="card-art"');
    assert.ok(idx > -1, 'card-art testid must be present');
    // Walk back to the enclosing brace — ensure no practice guard wraps it
    const before = postSolveSrc.slice(Math.max(0, idx - 300), idx);
    assert.ok(
      !/mode\s*===\s*['"]practice['"]\s*&&\s*$/s.test(before) &&
        !/mode\s*!==\s*['"]practice['"]\s*&&\s*$/s.test(before),
      'card-art must not be guarded by a mode check'
    );
  });

  test('lore-blurb is rendered unconditionally', () => {
    const idx = postSolveSrc.indexOf('data-testid="lore-blurb"');
    assert.ok(idx > -1, 'lore-blurb testid must be present');
    const before = postSolveSrc.slice(Math.max(0, idx - 300), idx);
    assert.ok(
      !/mode\s*===\s*['"]practice['"]\s*&&\s*$/s.test(before) &&
        !/mode\s*!==\s*['"]practice['"]\s*&&\s*$/s.test(before),
      'lore-blurb must not be guarded by a mode check'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-012: Practice mode has a 'Back to Home' link to return to tier selection
// ---------------------------------------------------------------------------

describe('AC-FA6-012: Back to Home link in practice mode', () => {
  test('back-to-home link is rendered with href="/"', () => {
    assert.ok(
      /data-testid=["']back-to-home["'][\s\S]*?href=["']\/["']/.test(postSolveSrc) ||
        /href=["']\/["'][\s\S]*?data-testid=["']back-to-home["']/.test(postSolveSrc),
      'Back to Home link must exist with testid "back-to-home" and href="/"'
    );
  });

  test('back-to-home is gated on practice mode only', () => {
    const idx = postSolveSrc.indexOf('data-testid="back-to-home"');
    assert.ok(idx > -1, 'back-to-home testid must exist');
    const before = postSolveSrc.slice(Math.max(0, idx - 300), idx);
    assert.ok(
      /mode\s*===\s*['"]practice['"]\s*&&/.test(before),
      'back-to-home must be inside a {mode === "practice" && ...} guard'
    );
  });

  test('back-to-home link contains "Home" label text', () => {
    const linkBlock = postSolveSrc.match(
      /data-testid=["']back-to-home["'][\s\S]{0,300}/
    );
    assert.ok(linkBlock, 'back-to-home block must exist');
    assert.match(
      linkBlock[0],
      /Home/,
      'link text should include "Home" so the user knows where it goes'
    );
  });
});
