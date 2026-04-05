/**
 * MTGordle — Score Distribution Chart tests
 *
 * Verifies computeDistributionRows() pure logic (AC-FA5-011, AC-FA5-012, AC-FA5-014)
 * and structural requirements of ScoreDistributionChart.tsx (AC-FA5-013, AC-FA5-014).
 *
 * Run with: node --test tests/score-distribution.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDistributionRows } from '../src/lib/score-distribution.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const chartPath = resolve(__dirname, '../src/components/ScoreDistributionChart.tsx');

// ---------------------------------------------------------------------------
// AC-FA5-011: Bar chart shows distribution of scores (1/6 through 6/6 and X/6)
// ---------------------------------------------------------------------------

describe('AC-FA5-011: seven rows (1-6 and X) in order', () => {
  test('computeDistributionRows returns 7 rows with labels 1,2,3,4,5,6,X in order', () => {
    const rows = computeDistributionRows({ guessDistribution: {}, gamesPlayed: 0, gamesWon: 0 });
    assert.equal(rows.length, 7);
    assert.deepEqual(rows.map((r) => r.label), ['1', '2', '3', '4', '5', '6', 'X']);
  });

  test('counts for 1-6 come from guessDistribution', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 1: 2, 3: 5, 6: 1 },
      gamesPlayed: 8,
      gamesWon: 8,
    });
    assert.equal(rows.find((r) => r.label === '1').count, 2);
    assert.equal(rows.find((r) => r.label === '2').count, 0);
    assert.equal(rows.find((r) => r.label === '3').count, 5);
    assert.equal(rows.find((r) => r.label === '4').count, 0);
    assert.equal(rows.find((r) => r.label === '5').count, 0);
    assert.equal(rows.find((r) => r.label === '6').count, 1);
  });

  test('X row count equals gamesPlayed - gamesWon (losses)', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 3: 4 },
      gamesPlayed: 7,
      gamesWon: 4,
    });
    assert.equal(rows.find((r) => r.label === 'X').count, 3);
  });

  test('X count is never negative when data is consistent', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 2: 5 },
      gamesPlayed: 5,
      gamesWon: 5,
    });
    assert.equal(rows.find((r) => r.label === 'X').count, 0);
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-012: Bars are proportional to count (longest bar = most common score)
// ---------------------------------------------------------------------------

describe('AC-FA5-012: bar widths proportional to counts', () => {
  test('longest bar has widthPercent 100, others scaled proportionally', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 1: 1, 2: 2, 3: 4 },
      gamesPlayed: 7,
      gamesWon: 7,
    });
    assert.equal(rows.find((r) => r.label === '3').widthPercent, 100);
    assert.equal(rows.find((r) => r.label === '2').widthPercent, 50);
    assert.equal(rows.find((r) => r.label === '1').widthPercent, 25);
    assert.equal(rows.find((r) => r.label === '4').widthPercent, 0);
  });

  test('X bar participates in scaling when losses are highest', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 3: 1 },
      gamesPlayed: 5,
      gamesWon: 1,
    });
    // 4 losses is the max
    assert.equal(rows.find((r) => r.label === 'X').widthPercent, 100);
    assert.equal(rows.find((r) => r.label === '3').widthPercent, 25);
  });

  test('widthPercent is always in [0, 100]', () => {
    const rows = computeDistributionRows({
      guessDistribution: { 1: 3, 2: 1, 4: 7, 6: 2 },
      gamesPlayed: 15,
      gamesWon: 13,
    });
    for (const row of rows) {
      assert.ok(row.widthPercent >= 0 && row.widthPercent <= 100, `${row.label} width out of range: ${row.widthPercent}`);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-014: Chart renders correctly with 0 games played (empty state)
// ---------------------------------------------------------------------------

describe('AC-FA5-014: empty state — zero games', () => {
  test('all counts are 0 and all widths are 0 when gamesPlayed is 0', () => {
    const rows = computeDistributionRows({ guessDistribution: {}, gamesPlayed: 0, gamesWon: 0 });
    for (const row of rows) {
      assert.equal(row.count, 0);
      assert.equal(row.widthPercent, 0);
    }
  });

  test('isEmpty flag on result indicates no games played', () => {
    const result = computeDistributionRows({ guessDistribution: {}, gamesPlayed: 0, gamesWon: 0 });
    assert.equal(result.isEmpty, true);
  });

  test('isEmpty false once any game is played', () => {
    const result = computeDistributionRows({ guessDistribution: {}, gamesPlayed: 1, gamesWon: 0 });
    assert.equal(result.isEmpty, false);
  });
});

// ---------------------------------------------------------------------------
// Structural: ScoreDistributionChart component
// ---------------------------------------------------------------------------

describe('ScoreDistributionChart component existence', () => {
  test('src/components/ScoreDistributionChart.tsx exists', () => {
    assert.ok(existsSync(chartPath), 'ScoreDistributionChart.tsx must exist');
  });

  test('component is a default export function', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(
      /export\s+default\s+function\s+ScoreDistributionChart/.test(source),
      'ScoreDistributionChart must be a default-exported function component'
    );
  });

  test('component accepts tierStats and highlightScore props', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(/tierStats/.test(source), 'component should consume tierStats prop');
    assert.ok(/highlightScore/.test(source), 'component should consume highlightScore prop');
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-013: Today's score is highlighted in the chart
// ---------------------------------------------------------------------------

describe("AC-FA5-013: today's score highlighting", () => {
  test('component renders a data-highlighted attribute for rows', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(
      /data-highlighted/.test(source),
      'component should set data-highlighted on rows for styling the active score'
    );
  });

  test('component compares highlightScore against row label', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(
      /highlightScore/.test(source) && /label/.test(source),
      'component should compare highlightScore to the row label to decide the highlighted row'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA5-014 (structural): empty state rendering
// ---------------------------------------------------------------------------

describe('AC-FA5-014: empty state UI', () => {
  test('component renders an empty state when isEmpty is true', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(
      /isEmpty/.test(source),
      'component should branch on isEmpty to render an empty-state message'
    );
  });

  test('component has data-testid score-distribution-chart', () => {
    const source = readFileSync(chartPath, 'utf-8');
    assert.ok(
      /data-testid="score-distribution-chart"/.test(source),
      'component should expose a stable test id'
    );
  });
});
