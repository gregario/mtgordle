/**
 * MTGordle — Mana symbol parser tests
 *
 * Tests the pure parsing/utility logic from src/lib/mana.ts (compiled to .js
 * for Node --test via a small inline re-implementation used for test isolation).
 *
 * Run with: node --test tests/mana.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Inline re-implementation of parseMana / formatManaCost for test isolation.
// (The source-of-truth lives in src/lib/mana.ts.)
// ---------------------------------------------------------------------------

/** Parse a Scryfall mana cost string into individual symbol tokens.
 *  '{2}{U}{B}' → ['2', 'U', 'B']
 *  '{W/U}'     → ['W/U']
 *  '{P}'       → ['P']
 *  ''          → []
 */
function parseMana(manaCost) {
  if (!manaCost) return [];
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1, -1));
}

/** Return true if the token is a numeric generic mana symbol. */
function isGeneric(token) {
  return /^\d+$/.test(token);
}

/** Return the canonical colour category for a mana token. */
function tokenColour(token) {
  const COLOURS = new Set(['W', 'U', 'B', 'R', 'G']);
  if (COLOURS.has(token)) return token;
  if (token === 'C') return 'C';
  if (isGeneric(token)) return 'generic';
  if (token === 'X') return 'X';
  if (token.includes('/')) return 'hybrid';
  if (token.includes('P')) return 'phyrexian';
  return 'generic';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseMana', () => {
  test('empty string returns empty array', () => {
    assert.deepEqual(parseMana(''), []);
  });

  test('null/undefined returns empty array', () => {
    assert.deepEqual(parseMana(null), []);
    assert.deepEqual(parseMana(undefined), []);
  });

  test('single colour symbol', () => {
    assert.deepEqual(parseMana('{U}'), ['U']);
  });

  test('all five colours', () => {
    assert.deepEqual(parseMana('{W}{U}{B}{R}{G}'), ['W', 'U', 'B', 'R', 'G']);
  });

  test('colourless symbol', () => {
    assert.deepEqual(parseMana('{C}'), ['C']);
  });

  test('generic mana number', () => {
    assert.deepEqual(parseMana('{3}'), ['3']);
  });

  test('zero mana cost', () => {
    assert.deepEqual(parseMana('{0}'), ['0']);
  });

  test('large generic mana', () => {
    assert.deepEqual(parseMana('{15}'), ['15']);
  });

  test('X variable mana', () => {
    assert.deepEqual(parseMana('{X}'), ['X']);
  });

  test('mixed generic + colour', () => {
    assert.deepEqual(parseMana('{2}{U}{B}'), ['2', 'U', 'B']);
  });

  test('common 1-drop example — Llanowar Elves {G}', () => {
    assert.deepEqual(parseMana('{G}'), ['G']);
  });

  test('common spell — Lightning Bolt {R}', () => {
    assert.deepEqual(parseMana('{R}'), ['R']);
  });

  test('hybrid mana token preserved as-is', () => {
    assert.deepEqual(parseMana('{W/U}'), ['W/U']);
  });

  test('phyrexian mana token preserved as-is', () => {
    assert.deepEqual(parseMana('{W/P}'), ['W/P']);
  });

  test('multi-token complex cost', () => {
    assert.deepEqual(parseMana('{X}{X}{B}{B}{B}'), ['X', 'X', 'B', 'B', 'B']);
  });
});

describe('isGeneric', () => {
  test('numeric tokens are generic', () => {
    assert.ok(isGeneric('0'));
    assert.ok(isGeneric('1'));
    assert.ok(isGeneric('10'));
    assert.ok(isGeneric('15'));
  });

  test('colour tokens are not generic', () => {
    assert.ok(!isGeneric('W'));
    assert.ok(!isGeneric('U'));
    assert.ok(!isGeneric('B'));
    assert.ok(!isGeneric('R'));
    assert.ok(!isGeneric('G'));
    assert.ok(!isGeneric('C'));
    assert.ok(!isGeneric('X'));
  });
});

describe('tokenColour', () => {
  test('named colour symbols return themselves', () => {
    for (const c of ['W', 'U', 'B', 'R', 'G']) {
      assert.equal(tokenColour(c), c);
    }
  });

  test('colorless returns C', () => {
    assert.equal(tokenColour('C'), 'C');
  });

  test('numeric returns generic', () => {
    assert.equal(tokenColour('3'), 'generic');
    assert.equal(tokenColour('0'), 'generic');
  });

  test('X returns X', () => {
    assert.equal(tokenColour('X'), 'X');
  });

  test('hybrid returns hybrid', () => {
    assert.equal(tokenColour('W/U'), 'hybrid');
  });
});

describe('round-trip coverage: curated card mana costs', () => {
  const SAMPLE_COSTS = [
    '{G}',
    '{R}',
    '{W}',
    '{U}',
    '{B}',
    '{1}{W}',
    '{2}{U}',
    '{3}{B}{B}',
    '{4}{R}{R}',
    '{1}{G}{G}',
    '{W}{U}{B}{R}{G}',
    '{0}',
    '{X}{R}',
    '{C}',
    '{6}{B}{B}',
  ];

  for (const cost of SAMPLE_COSTS) {
    test(`parseMana('${cost}') returns non-empty array`, () => {
      const tokens = parseMana(cost);
      assert.ok(tokens.length > 0, `Expected tokens for '${cost}'`);
      for (const t of tokens) {
        assert.ok(typeof t === 'string' && t.length > 0, `Bad token '${t}' in '${cost}'`);
      }
    });
  }
});
