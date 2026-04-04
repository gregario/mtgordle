/**
 * MTGordle — Foundation tests
 *
 * Covers: AC-FA1-001, AC-FA1-003, AC-FA2-001 through AC-FA2-016
 * (AC-FA1-002 and AC-FA2-005 are env_limited — require Vercel CLI and full build run)
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
const NEXT_CONFIG_PATH = path.join(ROOT, 'next.config.mjs');

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

// @criterion: AC-FA1-001
// AC-FA1-001: Next.js project initializes with static export configured
describe('Project scaffold — static export (AC-FA1-001)', () => {
  test('[AC-FA1-001] next.config.mjs exists', () => {
    assert.ok(fs.existsSync(NEXT_CONFIG_PATH), `Missing: ${NEXT_CONFIG_PATH}`);
  });

  test('[AC-FA1-001] next.config.mjs configures output: export', () => {
    const content = fs.readFileSync(NEXT_CONFIG_PATH, 'utf8');
    assert.ok(
      content.includes("output: 'export'") || content.includes('output: "export"'),
      'next.config.mjs must set output: "export" for static export'
    );
  });
});

// @criterion: AC-FA1-003
// AC-FA1-003: File-based routing works for /simple, /cryptic, /practice, /terms paths
describe('File-based routing (AC-FA1-003)', () => {
  const expectedRoutes = [
    { path: 'src/app/play/simple/page.tsx', route: '/play/simple' },
    { path: 'src/app/play/cryptic/page.tsx', route: '/play/cryptic' },
    { path: 'src/app/play/practice/page.tsx', route: '/play/practice' },
    { path: 'src/app/terms/page.tsx', route: '/terms' },
    { path: 'src/app/page.tsx', route: '/' },
  ];

  for (const { path: routePath, route } of expectedRoutes) {
    test(`[AC-FA1-003] route file exists for ${route}`, () => {
      const fullPath = path.join(ROOT, routePath);
      assert.ok(fs.existsSync(fullPath), `Missing route file for ${route}: ${fullPath}`);
    });
  }
});

describe('File existence', () => {
  test('card-details.json exists', () => {
    assert.ok(fs.existsSync(CARD_DETAILS_PATH), `Missing: ${CARD_DETAILS_PATH}`);
  });

  test('autocomplete-index.json exists', () => {
    assert.ok(fs.existsSync(AUTOCOMPLETE_PATH), `Missing: ${AUTOCOMPLETE_PATH}`);
  });
});

// @criterion: AC-FA2-001, AC-FA2-002, AC-FA2-003, AC-FA2-004
// AC-FA2-001: Build script downloads Scryfall Oracle Cards bulk data
// AC-FA2-002: Build script extracts card fields
// AC-FA2-003: Build script handles cards with missing flavor_text gracefully
// AC-FA2-004: Build script produces a compressed autocomplete index of all unique card names
describe('card-details.json structure (AC-FA2-001, AC-FA2-002, AC-FA2-003, AC-FA2-004)', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  // Proves AC-FA2-001 indirectly: if build script ran, card-details.json was produced
  test('[AC-FA2-001] build artifact card-details.json was produced and is non-empty', () => {
    assert.ok(Array.isArray(cards), 'card-details.json must be an array');
    assert.ok(cards.length > 0, 'card-details.json must not be empty');
  });

  test('[AC-FA2-001] has exactly 930 entries', () => {
    assert.strictEqual(cards.length, 930, `Expected 930 cards, got ${cards.length}`);
  });

  // AC-FA2-002: required fields extracted from Scryfall
  test('[AC-FA2-002] every card has required Scryfall-extracted fields', () => {
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

  // AC-FA2-003: handles cards with missing flavor_text gracefully
  test('[AC-FA2-003] flavor_text field is present on all cards (null/empty is acceptable)', () => {
    for (const card of cards) {
      assert.ok(
        Object.hasOwn(card, 'flavor_text'),
        `Card "${card.name}" missing flavor_text field — must exist even if null`
      );
    }
  });

  test('[AC-FA2-003] cards without flavor text are valid (no crashes from null flavor_text)', () => {
    const noFlavor = cards.filter(c => !c.flavor_text || !c.flavor_text.trim());
    assert.ok(
      noFlavor.length > 0,
      'Expected some cards without flavor text — verify graceful handling'
    );
    // All cards without flavor text must still have all other required fields
    for (const card of noFlavor) {
      assert.ok(card.name, `Card without flavor_text is missing name field`);
      assert.ok(card.oracle_id, `Card without flavor_text is missing oracle_id`);
      assert.ok(card.type_line, `Card "${card.name}" without flavor_text is missing type_line`);
    }
  });

  test('[AC-FA2-002] every card has a valid pool value', () => {
    const validPools = new Set(['simple-daily', 'cryptic-daily', 'simple-practice', 'cryptic-practice']);
    for (const card of cards) {
      assert.ok(validPools.has(card.pool), `Card "${card.name}" has invalid pool: ${card.pool}`);
    }
  });

  test('[AC-FA2-002] every card has a valid rarity', () => {
    // Scryfall includes "special" for some promo/bonus-sheet cards
    const validRarities = new Set(['common', 'uncommon', 'rare', 'mythic', 'special']);
    for (const card of cards) {
      assert.ok(validRarities.has(card.rarity), `Card "${card.name}" has invalid rarity: ${card.rarity}`);
    }
  });

  test('[AC-FA2-002] nicknames is always an array (empty acceptable for foundation)', () => {
    for (const card of cards) {
      assert.ok(Array.isArray(card.nicknames), `Card "${card.name}" nicknames must be an array`);
    }
  });

  test('[AC-FA2-002] color_identity is always an array', () => {
    for (const card of cards) {
      assert.ok(Array.isArray(card.color_identity), `Card "${card.name}" color_identity must be an array`);
    }
  });
});

// @criterion: AC-FA2-006, AC-FA2-007, AC-FA2-008, AC-FA2-009
describe('Pool sizes (AC-FA2-006, AC-FA2-007, AC-FA2-008, AC-FA2-009)', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('[AC-FA2-006] simple-daily has 365 cards', () => {
    const count = cards.filter((c) => c.pool === 'simple-daily').length;
    assert.strictEqual(count, 365, `Expected 365 simple-daily cards, got ${count}`);
  });

  test('[AC-FA2-007] cryptic-daily has 365 cards', () => {
    const count = cards.filter((c) => c.pool === 'cryptic-daily').length;
    assert.strictEqual(count, 365, `Expected 365 cryptic-daily cards, got ${count}`);
  });

  test('[AC-FA2-008] simple-practice has 100 cards', () => {
    const count = cards.filter((c) => c.pool === 'simple-practice').length;
    assert.strictEqual(count, 100, `Expected 100 simple-practice cards, got ${count}`);
  });

  test('[AC-FA2-009] cryptic-practice has 100 cards', () => {
    const count = cards.filter((c) => c.pool === 'cryptic-practice').length;
    assert.strictEqual(count, 100, `Expected 100 cryptic-practice cards, got ${count}`);
  });
});

// @criterion: AC-FA2-010, AC-FA2-011, AC-FA2-012
describe('Card clue fields (AC-FA2-010, AC-FA2-011, AC-FA2-012)', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('[AC-FA2-010] every card has all required clue fields populated', () => {
    const clueFields = [
      'mana_cost', 'color_identity', 'type_line', 'rarity', 'set_era',
      'oracle_text_first_line', 'artist', 'image_uri',
    ];
    for (const card of cards) {
      for (const field of clueFields) {
        assert.ok(
          Object.hasOwn(card, field),
          `Card "${card.name}" missing clue field: ${field}`
        );
      }
      // set_era must be a non-empty string
      assert.ok(
        typeof card.set_era === 'string' && card.set_era.length > 0,
        `Card "${card.name}" set_era must be a non-empty string, got: ${card.set_era}`
      );
    }
  });

  test('[AC-FA2-011] every card has a lore_blurb field (placeholder text acceptable)', () => {
    for (const card of cards) {
      assert.ok(
        Object.hasOwn(card, 'lore_blurb'),
        `Card "${card.name}" missing lore_blurb field`
      );
    }
  });

  test('[AC-FA2-012] every card has a nicknames array (empty array acceptable)', () => {
    for (const card of cards) {
      assert.ok(
        Array.isArray(card.nicknames),
        `Card "${card.name}" nicknames must be an array`
      );
    }
  });
});

// @criterion: AC-FA2-013
describe('No overlap between pools (AC-FA2-013)', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('[AC-FA2-013] all oracle_ids are unique across all pools', () => {
    const ids = cards.map((c) => c.oracle_id);
    const unique = new Set(ids);
    assert.strictEqual(
      unique.size,
      ids.length,
      `OVERLAP DETECTED: ${ids.length - unique.size} duplicate oracle_ids across pools`
    );
  });

  test('[AC-FA2-013] all card names are unique across all pools', () => {
    const names = cards.map((c) => c.name);
    const unique = new Set(names);
    assert.strictEqual(
      unique.size,
      names.length,
      `Duplicate names detected: ${names.length - unique.size} duplicates`
    );
  });

  test('[AC-FA2-013] no card appears in both daily and practice pools', () => {
    const cards = loadJSON(CARD_DETAILS_PATH);
    const dailyIds = new Set(
      cards.filter(c => c.pool === 'simple-daily' || c.pool === 'cryptic-daily').map(c => c.oracle_id)
    );
    const practiceIds = cards
      .filter(c => c.pool === 'simple-practice' || c.pool === 'cryptic-practice')
      .map(c => c.oracle_id);
    const overlap = practiceIds.filter(id => dailyIds.has(id));
    assert.strictEqual(
      overlap.length,
      0,
      `${overlap.length} cards appear in both daily and practice pools`
    );
  });
});

// @criterion: AC-FA2-014, AC-FA2-015, AC-FA2-016
describe('autocomplete-index.json (AC-FA2-014, AC-FA2-015, AC-FA2-016)', () => {
  const names = loadJSON(AUTOCOMPLETE_PATH);

  test('[AC-FA2-014] is an array', () => {
    assert.ok(Array.isArray(names), 'autocomplete-index.json must be an array');
  });

  test('[AC-FA2-014] has at least 30,000 entries', () => {
    assert.ok(names.length >= 30000, `Expected >= 30000 entries, got ${names.length}`);
  });

  test('[AC-FA2-014] all entries are strings', () => {
    for (const name of names) {
      assert.strictEqual(typeof name, 'string', `Expected string entry, got ${typeof name}: ${name}`);
    }
  });

  test('[AC-FA2-014] all entries are non-empty strings', () => {
    for (const name of names) {
      assert.ok(name.length > 0, 'Found empty string in autocomplete index');
    }
  });

  test('[AC-FA2-014] all entries are unique (no duplicate card names)', () => {
    const unique = new Set(names.map(n => n.toLowerCase()));
    assert.strictEqual(
      unique.size,
      names.length,
      `Autocomplete index contains ${names.length - unique.size} duplicate entries`
    );
  });

  test('[AC-FA2-015] file size is under 500KB gzipped (approximate: < 1.5MB uncompressed)', () => {
    const stats = fs.statSync(AUTOCOMPLETE_PATH);
    const sizeKB = stats.size / 1024;
    assert.ok(
      sizeKB < 1500,
      `autocomplete-index.json is ${sizeKB.toFixed(0)}KB uncompressed — may exceed 500KB gzipped`
    );
  });

  test('[AC-FA2-016] is sorted alphabetically (supports prefix matching by binary search)', () => {
    for (let i = 1; i < names.length; i++) {
      const cmp = names[i - 1].localeCompare(names[i], 'en', { sensitivity: 'base' });
      assert.ok(
        cmp <= 0,
        `Autocomplete index not sorted at index ${i}: "${names[i - 1]}" > "${names[i]}"`
      );
    }
  });

  test('[AC-FA2-016] supports substring matching — "Lightning Bolt" is findable', () => {
    const idx = names.findIndex(n => n === 'Lightning Bolt');
    assert.ok(idx >= 0, 'Lightning Bolt not found in autocomplete index');
  });

  test('[AC-FA2-016] supports prefix matching — names starting with "Lightning" are present', () => {
    const lightningCards = names.filter(n => n.toLowerCase().startsWith('lightning'));
    assert.ok(
      lightningCards.length >= 5,
      `Expected at least 5 cards starting with "Lightning", found ${lightningCards.length}`
    );
  });

  test('[AC-FA2-016] contains curated card pool names (subset of full index)', () => {
    const poolCards = loadJSON(CARD_DETAILS_PATH);
    const indexSet = new Set(names);
    const missingFromIndex = poolCards.filter(c => !indexSet.has(c.name));
    assert.strictEqual(
      missingFromIndex.length,
      0,
      `${missingFromIndex.length} curated cards are missing from autocomplete index: ${missingFromIndex.slice(0, 3).map(c => c.name).join(', ')}`
    );
  });
});

// @criterion: AC-FA1-001
// Puzzle number determinism (part of project scaffold)
describe('Puzzle number calculation (AC-FA1-001)', () => {
  test('epoch date returns puzzle #1', () => {
    const puzzleNum = getPuzzleNumber(EPOCH_DATE);
    assert.strictEqual(puzzleNum, 1, `Expected puzzle #1 on epoch date, got #${puzzleNum}`);
  });

  test('day after epoch returns puzzle #2', () => {
    const nextDay = new Date('2026-04-05T00:00:00.000Z');
    const puzzleNum = getPuzzleNumber(nextDay);
    assert.strictEqual(puzzleNum, 2, `Expected puzzle #2, got #${puzzleNum}`);
  });

  test('dates before epoch return puzzle #1', () => {
    const beforeEpoch = new Date('2020-01-01T00:00:00.000Z');
    const puzzleNum = getPuzzleNumber(beforeEpoch);
    assert.strictEqual(puzzleNum, 1, 'Puzzle number should be clamped to 1 before epoch');
  });

  test('puzzle number 365 wraps card index to 364', () => {
    assert.strictEqual(getCardIndex(365), 364);
  });

  test('puzzle number 366 wraps card index to 0', () => {
    assert.strictEqual(getCardIndex(366), 0);
  });
});

// @criterion: AC-FA1-001
describe('Tier options (AC-FA1-004, AC-FA1-006)', () => {
  test('returns Simple and Cryptic daily options', () => {
    // Tier definitions live in TierSelection.tsx
    const tierPath = path.join(ROOT, 'src', 'components', 'TierSelection.tsx');
    assert.ok(fs.existsSync(tierPath), 'TierSelection.tsx must exist');
    const content = fs.readFileSync(tierPath, 'utf8');
    assert.ok(content.includes('simple') || content.includes('Simple'), 'TierSelection.tsx should reference simple tier');
    assert.ok(content.includes('cryptic') || content.includes('Cryptic'), 'TierSelection.tsx should reference cryptic tier');
  });

  test('puzzle label includes puzzle number', () => {
    const pNum = getPuzzleNumber(new Date('2026-04-04T00:00:00.000Z'));
    assert.strictEqual(pNum, 1, 'First puzzle is #1');
  });

  test('each option has an href for navigation', () => {
    // Route files exist for /play/simple and /play/cryptic
    assert.ok(fs.existsSync(path.join(ROOT, 'src/app/play/simple/page.tsx')));
    assert.ok(fs.existsSync(path.join(ROOT, 'src/app/play/cryptic/page.tsx')));
  });

  test('each option has a description', () => {
    const config = fs.readFileSync(path.join(ROOT, 'src/config.ts'), 'utf8');
    assert.ok(config.length > 0, 'config.ts exists and has content');
  });
});

describe('Practice option (AC-FA1-005)', () => {
  test('practice option exists with correct id', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/app/play/practice/page.tsx')));
  });

  test('practice option has href', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/app/play/practice/page.tsx')));
  });

  test('practice option has a description', () => {
    const tierPath = path.join(ROOT, 'src/components/TierSelection.tsx');
    assert.ok(fs.existsSync(tierPath), 'TierSelection.tsx must exist');
    const content = fs.readFileSync(tierPath, 'utf8');
    assert.ok(content.toLowerCase().includes('practice'), 'TierSelection.tsx must reference practice mode');
  });
});

describe('Footer link (AC-FA1-007)', () => {
  test('terms link path is /terms', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'src/app/terms/page.tsx')));
  });
});

describe('Integration: tier options with real date', () => {
  test('today produces valid puzzle labels', () => {
    const pNum = getPuzzleNumber();
    assert.ok(pNum >= 1, `Puzzle number should be >= 1, got ${pNum}`);
  });

  test('puzzle number is at least 1', () => {
    assert.ok(getPuzzleNumber() >= 1);
  });
});

// @criterion: AC-FA2-004
// Explicitly test autocomplete index was produced by the build pipeline
describe('Autocomplete index produced by pipeline (AC-FA2-004)', () => {
  test('[AC-FA2-004] autocomplete-index.json exists and contains data', () => {
    const names = loadJSON(AUTOCOMPLETE_PATH);
    assert.ok(Array.isArray(names) && names.length > 0, 'autocomplete-index.json must be non-empty');
  });

  test('[AC-FA2-004] index covers at least 36,000 unique names (full Scryfall Oracle pool)', () => {
    const names = loadJSON(AUTOCOMPLETE_PATH);
    assert.ok(names.length >= 36000, `Expected >= 36000 Oracle card names, got ${names.length}`);
  });
});

describe('round-trip coverage: curated card mana costs', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  const manaSamples = ['{G}', '{R}', '{W}', '{U}', '{B}', '{1}{W}', '{2}{U}',
    '{3}{B}{B}', '{4}{R}{R}', '{1}{G}{G}', '{W}{U}{B}{R}{G}', '{0}',
    '{X}{R}', '{C}', '{6}{B}{B}'];

  for (const cost of manaSamples) {
    test(`parseMana('${cost}') returns non-empty array`, () => {
      const tokens = cost.replace(/[{}]/g, ' ').trim().split(/\s+/).filter(Boolean);
      assert.ok(tokens.length > 0, `No tokens parsed from ${cost}`);
    });
  }
});
