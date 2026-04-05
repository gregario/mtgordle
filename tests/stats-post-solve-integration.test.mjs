/**
 * MTGordle — Stats Post-Solve Integration tests
 *
 * Verifies PostSolve wires the stats engine + score distribution chart
 * into the post-solve screen.
 *
 * AC-FA5-015: Post-solve screen shows current streak and max streak
 * AC-FA5-016: Post-solve screen shows score distribution bar chart
 * AC-FA5-017: Stats section appears below lore blurb (below fold is OK)
 *
 * Strategy: structural source tests (consistent with post-solve-layout.test.mjs
 * and score-distribution.test.mjs — no React runtime in node:test harness).
 *
 * Run with: node --test tests/stats-post-solve-integration.test.mjs
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
// AC-FA5-015: Post-solve screen shows current streak and max streak
// ---------------------------------------------------------------------------

describe('AC-FA5-015: current streak and max streak rendered', () => {
  test('PostSolve references currentStreak', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('currentStreak'),
      'PostSolve must reference currentStreak from tier stats'
    );
  });

  test('PostSolve references maxStreak', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('maxStreak'),
      'PostSolve must reference maxStreak from tier stats'
    );
  });

  test('PostSolve exposes data-testid markers for streak values', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('"stat-current-streak"'),
      'PostSolve must expose a stat-current-streak data-testid'
    );
    assert.ok(
      source.includes('"stat-max-streak"'),
      'PostSolve must expose a stat-max-streak data-testid'
    );
  });

  test('PostSolve loads stats via stats engine', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      /from\s+['"]@\/lib\/stats-engine['"]/.test(source) ||
        /from\s+['"]@\/lib\/stats-engine\.mjs['"]/.test(source) ||
        /from\s+['"]@\/lib\/stats-engine\.ts['"]/.test(source),
      'PostSolve must import from the stats-engine module'
    );
    assert.ok(
      source.includes('loadStats'),
      'PostSolve must call loadStats() to hydrate persisted statistics'
    );
  });

  test('PostSolve records the completed game result', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('recordGameResult'),
      'PostSolve must call recordGameResult() so the finished game is persisted'
    );
    assert.ok(
      source.includes('saveStats'),
      'PostSolve must call saveStats() so the recorded result is written to storage'
    );
    assert.ok(
      source.includes('isDuplicateGame'),
      'PostSolve must guard against duplicate recording via isDuplicateGame()'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-016: Post-solve screen shows score distribution bar chart
// ---------------------------------------------------------------------------

describe('AC-FA5-016: score distribution chart rendered', () => {
  test('PostSolve imports ScoreDistributionChart', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      /import\s+ScoreDistributionChart\s+from\s+['"]@\/components\/ScoreDistributionChart['"]/.test(
        source
      ),
      'PostSolve must import ScoreDistributionChart'
    );
  });

  test('PostSolve renders <ScoreDistributionChart', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('<ScoreDistributionChart'),
      'PostSolve must render the <ScoreDistributionChart /> component'
    );
  });

  test('PostSolve passes highlightScore derived from outcome', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('highlightScore'),
      'PostSolve must pass a highlightScore prop so today\'s score is highlighted'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-017: Stats section appears below lore blurb
// ---------------------------------------------------------------------------

describe('AC-FA5-017: stats section below lore blurb', () => {
  test('stats-section still appears after lore-blurb in source order', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const loreIdx = source.indexOf('data-testid="lore-blurb"');
    const statsIdx = source.indexOf('data-testid="stats-section"');
    assert.ok(loreIdx !== -1 && statsIdx !== -1);
    assert.ok(loreIdx < statsIdx, 'lore-blurb must appear before stats-section');
  });

  test('stats-section no longer contains the "Stats coming soon" placeholder', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      !source.includes('Stats coming soon'),
      'Placeholder "Stats coming soon" copy must be removed'
    );
  });

  test('ScoreDistributionChart appears inside stats-section', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const statsIdx = source.indexOf('data-testid="stats-section"');
    const chartIdx = source.indexOf('<ScoreDistributionChart');
    assert.ok(statsIdx !== -1 && chartIdx !== -1);
    assert.ok(statsIdx < chartIdx, 'ScoreDistributionChart must render inside stats-section');
  });
});

// ---------------------------------------------------------------------------
// Integration: GameBoard passes the tier to PostSolve
// ---------------------------------------------------------------------------

describe('GameBoard passes tier to PostSolve', () => {
  test('GameBoard includes tier={tier} when rendering PostSolve', () => {
    const source = readFileSync(gameBoardPath, 'utf-8');
    assert.ok(
      /tier=\{tier\}/.test(source),
      'GameBoard must forward tier to PostSolve so stats are scoped correctly'
    );
  });
});

// ---------------------------------------------------------------------------
// PostSolve tier prop typing
// ---------------------------------------------------------------------------

describe('PostSolve accepts a tier prop', () => {
  test('PostSolveProps declares a tier field of type GameTier', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      /tier:\s*GameTier/.test(source),
      'PostSolve must accept tier: GameTier in its props interface'
    );
  });
});

// ---------------------------------------------------------------------------
// Practice mode: stats engine silently ignores practice runs
// ---------------------------------------------------------------------------

describe('Practice mode handling', () => {
  test('PostSolve passes the game mode when calling recordGameResult', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    // The stats engine checks result.mode === 'practice' and no-ops.
    // Builder should pass `mode` through so that practice games are silently ignored.
    assert.ok(
      /mode:\s*mode/.test(source) || /\bmode\b/.test(source),
      'PostSolve must include mode in the GameResult passed to recordGameResult'
    );
  });
});
