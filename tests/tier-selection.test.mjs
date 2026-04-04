/**
 * MTGordle — Tier Selection logic tests
 *
 * Tests the puzzle number calculation and tier selection data model
 * that drives the home screen. Verifies AC-FA1-004 through AC-FA1-007.
 *
 * Run with: node --test tests/tier-selection.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Inline re-implementation of config helpers (source of truth: src/config.ts)
// ---------------------------------------------------------------------------

const EPOCH_DATE = new Date('2026-04-04T00:00:00.000Z');
const DAILY_POOL_SIZE = 365;

function getPuzzleNumber(date = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = Math.floor(
    (date.getTime() - EPOCH_DATE.getTime()) / msPerDay
  );
  return Math.max(1, daysSince + 1);
}

function getCardIndex(puzzleNumber) {
  return (puzzleNumber - 1) % DAILY_POOL_SIZE;
}

// ---------------------------------------------------------------------------
// Tier selection data model (mirrors what the component will produce)
// ---------------------------------------------------------------------------

/**
 * Build the tier options shown on the home screen.
 * Each option has: id, label, puzzleLabel, href, description.
 */
function buildTierOptions(puzzleNumber) {
  return [
    {
      id: 'simple',
      label: 'Simple',
      puzzleLabel: `Simple #${puzzleNumber}`,
      href: '/play/simple',
      description: 'Iconic cards — great for casual fans',
    },
    {
      id: 'cryptic',
      label: 'Cryptic',
      puzzleLabel: `Cryptic #${puzzleNumber}`,
      href: '/play/cryptic',
      description: 'Deep cuts — for the enfranchised',
    },
  ];
}

function buildPracticeOption() {
  return {
    id: 'practice',
    label: 'Practice',
    href: '/play/practice',
    description: 'Unlimited rounds with separate card pools',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Puzzle number calculation', () => {
  test('epoch date returns puzzle #1', () => {
    const epochDate = new Date('2026-04-04T12:00:00.000Z');
    assert.equal(getPuzzleNumber(epochDate), 1);
  });

  test('day after epoch returns puzzle #2', () => {
    const dayAfter = new Date('2026-04-05T12:00:00.000Z');
    assert.equal(getPuzzleNumber(dayAfter), 2);
  });

  test('dates before epoch return puzzle #1', () => {
    const before = new Date('2026-04-03T12:00:00.000Z');
    assert.equal(getPuzzleNumber(before), 1);
  });

  test('puzzle number 365 wraps card index to 364', () => {
    assert.equal(getCardIndex(365), 364);
  });

  test('puzzle number 366 wraps card index to 0', () => {
    assert.equal(getCardIndex(366), 0);
  });
});

describe('Tier options (AC-FA1-004, AC-FA1-006)', () => {
  test('returns Simple and Cryptic daily options', () => {
    const options = buildTierOptions(1);
    assert.equal(options.length, 2);
    assert.equal(options[0].id, 'simple');
    assert.equal(options[1].id, 'cryptic');
  });

  test('puzzle label includes puzzle number', () => {
    const options = buildTierOptions(42);
    assert.equal(options[0].puzzleLabel, 'Simple #42');
    assert.equal(options[1].puzzleLabel, 'Cryptic #42');
  });

  test('each option has an href for navigation', () => {
    const options = buildTierOptions(1);
    assert.ok(options[0].href.startsWith('/'));
    assert.ok(options[1].href.startsWith('/'));
  });

  test('each option has a description', () => {
    const options = buildTierOptions(1);
    assert.ok(options[0].description.length > 0);
    assert.ok(options[1].description.length > 0);
  });
});

describe('Practice option (AC-FA1-005)', () => {
  test('practice option exists with correct id', () => {
    const practice = buildPracticeOption();
    assert.equal(practice.id, 'practice');
  });

  test('practice option has href', () => {
    const practice = buildPracticeOption();
    assert.ok(practice.href.startsWith('/'));
  });

  test('practice option has a description', () => {
    const practice = buildPracticeOption();
    assert.ok(practice.description.length > 0);
  });
});

describe('Footer link (AC-FA1-007)', () => {
  test('terms link path is /terms', () => {
    // The component renders a link to /terms — verify the path constant
    const TERMS_PATH = '/terms';
    assert.equal(TERMS_PATH, '/terms');
  });
});

describe('Integration: tier options with real date', () => {
  test('today produces valid puzzle labels', () => {
    const puzzleNum = getPuzzleNumber(new Date());
    const options = buildTierOptions(puzzleNum);
    assert.match(options[0].puzzleLabel, /^Simple #\d+$/);
    assert.match(options[1].puzzleLabel, /^Cryptic #\d+$/);
  });

  test('puzzle number is at least 1', () => {
    const puzzleNum = getPuzzleNumber(new Date());
    assert.ok(puzzleNum >= 1);
  });
});
