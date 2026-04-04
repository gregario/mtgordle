/**
 * MTGordle — Lore Blurb Display tests
 *
 * Verifies lore blurb formatting logic for AC-FA7-001 through AC-FA7-004.
 *
 * Strategy: test pure formatting functions (Node-testable) + source-analysis
 * for PostSolve integration.
 *
 * Run with: node --test tests/lore-blurb.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postSolvePath = resolve(__dirname, '../src/components/PostSolve.tsx');
const loreBlurbPath = resolve(__dirname, '../src/lib/lore-blurb.mjs');

// ---------------------------------------------------------------------------
// Module existence
// ---------------------------------------------------------------------------

describe('Lore blurb module existence', () => {
  test('src/lib/lore-blurb.mjs exists', () => {
    assert.ok(existsSync(loreBlurbPath), 'lore-blurb.mjs must exist');
  });
});

// We import dynamically so the existence test above fails cleanly if missing
const { isPlaceholderLore, formatLoreBlurb, getGenericLoreMessage } = await import(
  resolve(__dirname, '../src/lib/lore-blurb.mjs')
);

// ---------------------------------------------------------------------------
// AC-FA7-004: Placeholder lore detection
// ---------------------------------------------------------------------------

describe('AC-FA7-004: isPlaceholderLore detects placeholder blurbs', () => {
  test('detects standard placeholder pattern', () => {
    assert.equal(
      isPlaceholderLore('Lightning Bolt is a Instant from the world of Magic: The Gathering.', 'Lightning Bolt'),
      true
    );
  });

  test('detects placeholder with "a" article for creature types', () => {
    assert.equal(
      isPlaceholderLore(
        'Professional Face-Breaker is a Creature — Human Warrior from the world of Magic: The Gathering.',
        'Professional Face-Breaker'
      ),
      true
    );
  });

  test('detects placeholder with "an" article', () => {
    assert.equal(
      isPlaceholderLore(
        "Skrelv's Hive is a Enchantment from the world of Magic: The Gathering.",
        "Skrelv's Hive"
      ),
      true
    );
  });

  test('real flavor text is NOT a placeholder', () => {
    assert.equal(
      isPlaceholderLore('Few things are truly "lost" at sea.', 'Treasure Cruise'),
      false
    );
  });

  test('real multi-line lore is NOT a placeholder', () => {
    assert.equal(
      isPlaceholderLore(
        '"The enemy has many spies and many ways of hearing."\n—Gandalf',
        'Mirkwood Bats'
      ),
      false
    );
  });

  test('empty string is a placeholder', () => {
    assert.equal(isPlaceholderLore('', 'Some Card'), true);
  });
});

// ---------------------------------------------------------------------------
// AC-FA7-004: Generic lore message for placeholder cards
// ---------------------------------------------------------------------------

describe('AC-FA7-004: getGenericLoreMessage produces fallback text', () => {
  test('includes card type line', () => {
    const msg = getGenericLoreMessage({
      name: 'Lightning Bolt',
      type_line: 'Instant',
      set_name: 'Alpha',
    });
    assert.ok(msg.includes('Instant'), 'generic message must include type_line');
  });

  test('includes set name', () => {
    const msg = getGenericLoreMessage({
      name: 'Lightning Bolt',
      type_line: 'Instant',
      set_name: 'Alpha',
    });
    assert.ok(msg.includes('Alpha'), 'generic message must include set_name');
  });

  test('does not reproduce the placeholder pattern', () => {
    const msg = getGenericLoreMessage({
      name: 'Lightning Bolt',
      type_line: 'Instant',
      set_name: 'Alpha',
    });
    assert.ok(
      !msg.includes('from the world of Magic: The Gathering'),
      'generic message must NOT reproduce the placeholder pattern'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA7-002: Short blurbs render inline (formatLoreBlurb)
// ---------------------------------------------------------------------------

describe('AC-FA7-002: formatLoreBlurb handles short blurbs', () => {
  test('short one-liner returns single paragraph array', () => {
    const result = formatLoreBlurb('Few things are truly "lost" at sea.');
    assert.equal(result.length, 1, 'short blurb should produce exactly 1 paragraph');
    assert.equal(result[0], 'Few things are truly "lost" at sea.');
  });

  test('trims whitespace', () => {
    const result = formatLoreBlurb('  Some short blurb  ');
    assert.equal(result[0], 'Some short blurb');
  });
});

// ---------------------------------------------------------------------------
// AC-FA7-003: Long/multi-paragraph blurbs format properly
// ---------------------------------------------------------------------------

describe('AC-FA7-003: formatLoreBlurb handles multi-paragraph blurbs', () => {
  test('splits on newline delimiter', () => {
    const result = formatLoreBlurb('"The enemy has many spies."\n—Gandalf');
    assert.equal(result.length, 2, 'newline-delimited blurb should produce 2 paragraphs');
    assert.equal(result[0], '"The enemy has many spies."');
    assert.equal(result[1], '—Gandalf');
  });

  test('filters out empty lines from multiple newlines', () => {
    const result = formatLoreBlurb('Line one.\n\nLine two.');
    assert.equal(result.length, 2, 'double-newline should still produce 2 non-empty paragraphs');
  });

  test('long single paragraph stays as one entry', () => {
    const longText = 'A'.repeat(300);
    const result = formatLoreBlurb(longText);
    assert.equal(result.length, 1);
    assert.equal(result[0].length, 300);
  });
});

// ---------------------------------------------------------------------------
// AC-FA7-001: PostSolve integration — lore blurb between card art and stats
// ---------------------------------------------------------------------------

describe('AC-FA7-001: PostSolve uses lore blurb formatting', () => {
  test('PostSolve imports from lore-blurb module', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    assert.ok(
      source.includes('lore-blurb'),
      'PostSolve must import from lore-blurb module'
    );
  });

  test('PostSolve calls isPlaceholderLore or formatLoreBlurb', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const usesLoreLogic =
      source.includes('isPlaceholderLore') ||
      source.includes('formatLoreBlurb') ||
      source.includes('getGenericLoreMessage');
    assert.ok(usesLoreLogic, 'PostSolve must use lore blurb formatting functions');
  });

  test('lore-blurb section is between card-art and stats-section', () => {
    const source = readFileSync(postSolvePath, 'utf-8');
    const artIdx = source.indexOf('data-testid="card-art"');
    const loreIdx = source.indexOf('data-testid="lore-blurb"');
    const statsIdx = source.indexOf('data-testid="stats-section"');
    assert.ok(artIdx < loreIdx, 'lore-blurb must appear after card-art');
    assert.ok(loreIdx < statsIdx, 'lore-blurb must appear before stats-section');
  });
});

// ---------------------------------------------------------------------------
// Data validation: check actual card-details.json
// ---------------------------------------------------------------------------

describe('Data: lore_blurb field coverage', () => {
  const dataPath = resolve(__dirname, '../public/data/card-details.json');
  const cards = JSON.parse(readFileSync(dataPath, 'utf-8'));

  test('all 930 cards have a lore_blurb string', () => {
    for (const card of cards) {
      assert.equal(typeof card.lore_blurb, 'string', `${card.name} must have a lore_blurb string`);
      assert.ok(card.lore_blurb.length > 0, `${card.name} must have non-empty lore_blurb`);
    }
  });

  test('placeholder cards produce valid generic messages', () => {
    const placeholders = cards.filter(c => isPlaceholderLore(c.lore_blurb, c.name));
    assert.ok(placeholders.length > 0, 'at least some cards should have placeholder lore');
    for (const card of placeholders) {
      const msg = getGenericLoreMessage({ name: card.name, type_line: card.type_line, set_name: card.set_name });
      assert.ok(msg.length > 0, `generic message for ${card.name} must be non-empty`);
    }
  });

  test('non-placeholder cards produce valid formatted paragraphs', () => {
    const nonPlaceholders = cards.filter(c => !isPlaceholderLore(c.lore_blurb, c.name));
    assert.ok(nonPlaceholders.length > 0, 'at least some cards should have real lore');
    for (const card of nonPlaceholders) {
      const paras = formatLoreBlurb(card.lore_blurb);
      assert.ok(paras.length >= 1, `${card.name} lore must produce at least 1 paragraph`);
      for (const p of paras) {
        assert.ok(p.trim().length > 0, `${card.name} paragraph must not be empty after trim`);
      }
    }
  });
});
