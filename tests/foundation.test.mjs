/**
 * MTGordle — Foundation tests
 *
 * Run with: node --test tests/foundation.test.mjs
 * (Or: npm test)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CARD_DETAILS_PATH = path.join(ROOT, 'public', 'data', 'card-details.json');
const AUTOCOMPLETE_PATH = path.join(ROOT, 'public', 'data', 'autocomplete-index.json');

// ─── Helper ──────────────────────────────────────────────────────────────────
function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// ─── Puzzle number logic (mirrors src/config.ts) ──────────────────────────────
const EPOCH_DATE = new Date('2026-04-04T00:00:00.000Z');
const DAILY_POOL_SIZE = 365;

function getPuzzleNumber(date = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = Math.floor((date.getTime() - EPOCH_DATE.getTime()) / msPerDay);
  return Math.max(1, daysSince + 1);
}

function getCardIndex(puzzleNumber) {
  return (puzzleNumber - 1) % DAILY_POOL_SIZE;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('File existence', () => {
  test('card-details.json exists', () => {
    assert.ok(fs.existsSync(CARD_DETAILS_PATH), `Missing: ${CARD_DETAILS_PATH}`);
  });

  test('autocomplete-index.json exists', () => {
    assert.ok(fs.existsSync(AUTOCOMPLETE_PATH), `Missing: ${AUTOCOMPLETE_PATH}`);
  });
});

describe('card-details.json structure', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('is an array', () => {
    assert.ok(Array.isArray(cards), 'card-details.json must be an array');
  });

  test('has exactly 930 entries', () => {
    assert.strictEqual(cards.length, 930, `Expected 930 cards, got ${cards.length}`);
  });

  test('every card has required fields', () => {
    const required = [
      'oracle_id', 'name', 'mana_cost', 'color_identity', 'type_line',
      'oracle_text', 'oracle_text_first_line', 'rarity', 'set', 'set_name',
      'artist', 'image_uri', 'art_crop_uri', 'set_era', 'lore_blurb',
      'nicknames', 'pool',
    ];
    for (const card of cards) {
      for (const field of required) {
        assert.ok(
          Object.hasOwn(card, field),
          `Card "${card.name ?? card.oracle_id}" missing field: ${field}`
        );
      }
    }
  });

  test('every card has a valid pool value', () => {
    const validPools = new Set(['simple-daily', 'cryptic-daily', 'simple-practice', 'cryptic-practice']);
    for (const card of cards) {
      assert.ok(validPools.has(card.pool), `Card "${card.name}" has invalid pool: ${card.pool}`);
    }
  });

  test('every card has a valid rarity', () => {
    // Scryfall includes "special" for some promo/bonus-sheet cards
    const validRarities = new Set(['common', 'uncommon', 'rare', 'mythic', 'special']);
    for (const card of cards) {
      assert.ok(validRarities.has(card.rarity), `Card "${card.name}" has invalid rarity: ${card.rarity}`);
    }
  });

  test('nicknames is always an array', () => {
    for (const card of cards) {
      assert.ok(Array.isArray(card.nicknames), `Card "${card.name}" nicknames must be an array`);
    }
  });

  test('color_identity is always an array', () => {
    for (const card of cards) {
      assert.ok(Array.isArray(card.color_identity), `Card "${card.name}" color_identity must be an array`);
    }
  });
});

describe('Pool sizes', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('simple-daily has 365 cards', () => {
    const count = cards.filter((c) => c.pool === 'simple-daily').length;
    assert.strictEqual(count, 365, `Expected 365 simple-daily cards, got ${count}`);
  });

  test('cryptic-daily has 365 cards', () => {
    const count = cards.filter((c) => c.pool === 'cryptic-daily').length;
    assert.strictEqual(count, 365, `Expected 365 cryptic-daily cards, got ${count}`);
  });

  test('simple-practice has 100 cards', () => {
    const count = cards.filter((c) => c.pool === 'simple-practice').length;
    assert.strictEqual(count, 100, `Expected 100 simple-practice cards, got ${count}`);
  });

  test('cryptic-practice has 100 cards', () => {
    const count = cards.filter((c) => c.pool === 'cryptic-practice').length;
    assert.strictEqual(count, 100, `Expected 100 cryptic-practice cards, got ${count}`);
  });
});

describe('No overlap between pools', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('all oracle_ids are unique across all pools', () => {
    const ids = cards.map((c) => c.oracle_id);
    const unique = new Set(ids);
    assert.strictEqual(
      unique.size,
      ids.length,
      `OVERLAP DETECTED: ${ids.length - unique.size} duplicate oracle_ids across pools`
    );
  });

  test('all card names are unique across all pools', () => {
    const names = cards.map((c) => c.name);
    const unique = new Set(names);
    // Names should also be unique since oracle_ids are unique
    assert.strictEqual(
      unique.size,
      names.length,
      `Duplicate names detected: ${names.length - unique.size} duplicates`
    );
  });
});

describe('autocomplete-index.json', () => {
  const names = loadJSON(AUTOCOMPLETE_PATH);

  test('is an array', () => {
    assert.ok(Array.isArray(names), 'autocomplete-index.json must be an array');
  });

  test('has at least 30,000 entries', () => {
    assert.ok(names.length >= 30000, `Expected >= 30000 entries, got ${names.length}`);
  });

  test('all entries are strings', () => {
    for (const name of names) {
      assert.strictEqual(typeof name, 'string', `Expected string entry, got ${typeof name}: ${name}`);
    }
  });

  test('all entries are non-empty strings', () => {
    for (const name of names) {
      assert.ok(name.length > 0, 'Found empty string in autocomplete index');
    }
  });

  test('is sorted alphabetically (locale-aware, case-insensitive)', () => {
    for (let i = 1; i < names.length; i++) {
      const cmp = names[i - 1].localeCompare(names[i], 'en', { sensitivity: 'base' });
      assert.ok(
        cmp <= 0,
        `Autocomplete index not sorted at index ${i}: "${names[i - 1]}" > "${names[i]}"`
      );
    }
  });

  test('file size is under 500KB gzipped (approximate: < 1.5MB uncompressed)', () => {
    const stats = fs.statSync(AUTOCOMPLETE_PATH);
    const sizeKB = stats.size / 1024;
    // Gzip typically achieves ~50% compression on JSON; 500KB gzipped ≈ 1000KB uncompressed
    // Using 1500KB as a safe upper bound
    assert.ok(
      sizeKB < 1500,
      `autocomplete-index.json is ${sizeKB.toFixed(0)}KB uncompressed — may exceed 500KB gzipped`
    );
  });
});

describe('Puzzle number determinism', () => {
  test('epoch date returns puzzle number 1', () => {
    const puzzleNum = getPuzzleNumber(EPOCH_DATE);
    assert.strictEqual(puzzleNum, 1, `Expected puzzle #1 on epoch date, got #${puzzleNum}`);
  });

  test('day after epoch returns puzzle number 2', () => {
    const nextDay = new Date('2026-04-05T00:00:00.000Z');
    const puzzleNum = getPuzzleNumber(nextDay);
    assert.strictEqual(puzzleNum, 2, `Expected puzzle #2, got #${puzzleNum}`);
  });

  test('365 days after epoch returns puzzle number 365', () => {
    const day365 = new Date(EPOCH_DATE.getTime() + 364 * 24 * 60 * 60 * 1000);
    const puzzleNum = getPuzzleNumber(day365);
    assert.strictEqual(puzzleNum, 365);
  });

  test('366 days after epoch returns puzzle number 366', () => {
    const day366 = new Date(EPOCH_DATE.getTime() + 365 * 24 * 60 * 60 * 1000);
    const puzzleNum = getPuzzleNumber(day366);
    assert.strictEqual(puzzleNum, 366);
  });

  test('date before epoch returns puzzle number 1 (clamped)', () => {
    const beforeEpoch = new Date('2020-01-01T00:00:00.000Z');
    const puzzleNum = getPuzzleNumber(beforeEpoch);
    assert.strictEqual(puzzleNum, 1, 'Puzzle number should be clamped to 1 before epoch');
  });

  test('same date always returns same puzzle number (deterministic)', () => {
    const date = new Date('2026-08-15T00:00:00.000Z');
    assert.strictEqual(getPuzzleNumber(date), getPuzzleNumber(date));
    // Also verify the specific value
    const expected = Math.floor((date.getTime() - EPOCH_DATE.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    assert.strictEqual(getPuzzleNumber(date), expected);
  });
});

describe('Card index function', () => {
  test('puzzle #1 returns card index 0', () => {
    assert.strictEqual(getCardIndex(1), 0);
  });

  test('puzzle #365 returns card index 364', () => {
    assert.strictEqual(getCardIndex(365), 364);
  });

  test('puzzle #366 wraps to card index 0', () => {
    assert.strictEqual(getCardIndex(366), 0);
  });

  test('puzzle #730 wraps to card index 364', () => {
    assert.strictEqual(getCardIndex(730), 364);
  });

  test('card index is always in range [0, 364]', () => {
    for (let p = 1; p <= 1000; p++) {
      const idx = getCardIndex(p);
      assert.ok(idx >= 0 && idx < 365, `Card index ${idx} out of range for puzzle #${p}`);
    }
  });
});
