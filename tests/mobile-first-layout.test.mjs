/**
 * MTGordle — Mobile-First Responsive Layout tests (FA8)
 *
 * Covers:
 *   AC-FA8-010: Game screen works on 375px viewport width (iPhone SE)
 *   AC-FA8-011: Card frame is the primary visual element, centered, with guess input below
 *   AC-FA8-012: Guess input never moves position as clues are revealed
 *   AC-FA8-013: Post-solve screen scroll order: score → share → art → lore → stats
 *   AC-FA8-014: Desktop layout uses centered column (max-width ~480px) maintaining mobile feel
 *   AC-FA8-015: No horizontal scrolling at any viewport width
 *
 * These are static source-analysis tests — they lock in the layout contract so
 * future edits cannot silently break the mobile viewport.
 *
 * Run with: node --test tests/mobile-first-layout.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const APP_LAYOUT = fs.readFileSync(path.join(ROOT, 'src', 'app', 'layout.tsx'), 'utf8');
const LAYOUT_COMP = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Layout.tsx'), 'utf8');
const GLOBALS_CSS = fs.readFileSync(path.join(ROOT, 'src', 'app', 'globals.css'), 'utf8');
const GAME_BOARD = fs.readFileSync(path.join(ROOT, 'src', 'components', 'GameBoard.tsx'), 'utf8');
const POST_SOLVE = fs.readFileSync(path.join(ROOT, 'src', 'components', 'PostSolve.tsx'), 'utf8');
const CARD_FRAME = fs.readFileSync(path.join(ROOT, 'src', 'components', 'CardFrame.tsx'), 'utf8');
const GUESS_INPUT = fs.readFileSync(path.join(ROOT, 'src', 'components', 'GuessInput.tsx'), 'utf8');

// ─── AC-FA8-010 ─────────────────────────────────────────────────────────────
describe('AC-FA8-010: Game screen works on 375px viewport (iPhone SE)', () => {
  test('root layout exports a viewport config with width=device-width and initial-scale=1', () => {
    // Next.js 14 App Router expects a `viewport` export (or generateViewport).
    assert.match(
      APP_LAYOUT,
      /export\s+const\s+viewport\s*[:=]/,
      'src/app/layout.tsx must export a `viewport` config'
    );
    assert.match(
      APP_LAYOUT,
      /width:\s*['"]device-width['"]/,
      'viewport must set width: "device-width"'
    );
    assert.match(
      APP_LAYOUT,
      /initialScale:\s*1/,
      'viewport must set initialScale: 1'
    );
  });

  test('CardFrame max-width (315px) fits inside 375px viewport with padding room', () => {
    // Layout has 16px horizontal padding on each side → 375-32 = 343px content width.
    // CardFrame is capped at 315px with width:100%, so it scales down on 375px.
    const maxWidthMatch = CARD_FRAME.match(/maxWidth:\s*['"](\d+)px['"]/);
    assert.ok(maxWidthMatch, 'CardFrame should declare a numeric maxWidth');
    const maxW = parseInt(maxWidthMatch[1], 10);
    assert.ok(maxW <= 343, `CardFrame maxWidth (${maxW}px) must fit within 375px viewport minus layout padding`);
  });

  test('CardFrame and GuessInput use width:100% so they scale to viewport', () => {
    assert.match(CARD_FRAME, /width:\s*['"]100%['"]/, 'CardFrame must use width:100% so it scales');
    assert.match(GUESS_INPUT, /width:\s*['"]100%['"]/, 'GuessInput must use width:100% so it scales');
  });
});

// ─── AC-FA8-011 ─────────────────────────────────────────────────────────────
describe('AC-FA8-011: Card frame primary, centered, guess input below', () => {
  test('GameBoard renders CardFrame before GuessInput in source order', () => {
    const cardFrameIdx = GAME_BOARD.indexOf('<CardFrame');
    const guessInputIdx = GAME_BOARD.indexOf('<GuessInput');
    assert.ok(cardFrameIdx > 0, 'GameBoard must render <CardFrame>');
    assert.ok(guessInputIdx > 0, 'GameBoard must render <GuessInput>');
    assert.ok(
      cardFrameIdx < guessInputIdx,
      'CardFrame must appear before GuessInput in GameBoard JSX (primary element on top)'
    );
  });

  test('GameBoard root flex column is center-aligned', () => {
    // The outermost returned container uses flexDirection:column and alignItems:center.
    assert.match(
      GAME_BOARD,
      /flexDirection:\s*['"]column['"][^}]*alignItems:\s*['"]center['"]/s,
      'GameBoard root container must be column with alignItems:center'
    );
  });
});

// ─── AC-FA8-012 ─────────────────────────────────────────────────────────────
describe('AC-FA8-012: Guess input never moves position as clues are revealed', () => {
  test('Feedback flash area reserves space so it does not push guess input down', () => {
    // The feedback pill is conditionally rendered between dots and the guess input.
    // Without a reserved slot, toggling it would shift the guess input vertically.
    // We lock this with a data-testid marker and a minHeight.
    assert.match(
      GAME_BOARD,
      /data-testid=["']guess-feedback-slot["']/,
      'GameBoard must wrap feedback in a reserved slot with data-testid="guess-feedback-slot"'
    );
    assert.match(
      GAME_BOARD,
      /guess-feedback-slot[^]*?minHeight/,
      'guess-feedback-slot must declare a minHeight so guess input position is stable'
    );
  });

  test('CardFrame reserves vertical space across rounds (fixed aspect ratio)', () => {
    // Card frame uses the classic 63:88 ratio via aspect-ratio so its height
    // does not change as clue regions fill in.
    assert.match(
      CARD_FRAME,
      /aspectRatio:\s*['"]63\s*\/\s*88['"]/,
      'CardFrame must declare aspectRatio: "63 / 88" so total height is stable across rounds'
    );
  });
});

// ─── AC-FA8-013 ─────────────────────────────────────────────────────────────
describe('AC-FA8-013: Post-solve scroll order: score → share → art → lore → stats', () => {
  test('PostSolve renders testids in required order', () => {
    const order = ['score-display', 'share-button', 'card-art', 'lore-blurb', 'stats-section'];
    const positions = order.map((id) => ({
      id,
      idx: POST_SOLVE.indexOf(`data-testid="${id}"`),
    }));
    for (const { id, idx } of positions) {
      assert.ok(idx > 0, `PostSolve must render data-testid="${id}"`);
    }
    for (let i = 1; i < positions.length; i++) {
      assert.ok(
        positions[i - 1].idx < positions[i].idx,
        `${positions[i - 1].id} must appear before ${positions[i].id} in PostSolve source`
      );
    }
  });
});

// ─── AC-FA8-014 ─────────────────────────────────────────────────────────────
describe('AC-FA8-014: Desktop layout uses centered column (max-width ~480px)', () => {
  test('--max-width CSS token is around 480px', () => {
    const m = GLOBALS_CSS.match(/--max-width:\s*(\d+)px/);
    assert.ok(m, 'globals.css must define --max-width token');
    const px = parseInt(m[1], 10);
    assert.ok(px >= 420 && px <= 540, `--max-width (${px}px) must be ~480px for mobile feel on desktop`);
  });

  test('Layout component centers with auto horizontal margins', () => {
    assert.match(LAYOUT_COMP, /maxWidth:\s*['"]var\(--max-width\)['"]/, 'Layout must use --max-width token');
    assert.match(LAYOUT_COMP, /margin:\s*['"]0\s+auto['"]/, 'Layout must use margin: "0 auto" to center');
  });
});

// ─── AC-FA8-015 ─────────────────────────────────────────────────────────────
describe('AC-FA8-015: No horizontal scrolling at any viewport width', () => {
  test('body disables horizontal overflow', () => {
    // body { overflow-x: hidden } (or clip) prevents any accidental overflow
    // from causing horizontal scroll on narrow viewports.
    assert.match(
      GLOBALS_CSS,
      /body\s*\{[^}]*overflow-x:\s*(hidden|clip)/s,
      'globals.css body rule must set overflow-x: hidden (or clip)'
    );
  });

  test('global box-sizing is border-box so padding does not overflow width', () => {
    assert.match(
      GLOBALS_CSS,
      /box-sizing:\s*border-box/,
      'globals.css must apply box-sizing: border-box globally'
    );
  });

  test('img max-width:100% prevents card art overflow', () => {
    assert.match(
      GLOBALS_CSS,
      /img\s*\{[^}]*max-width:\s*100%/s,
      'globals.css img rule must cap max-width at 100%'
    );
  });
});
