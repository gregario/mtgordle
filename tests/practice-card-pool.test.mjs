/**
 * MTGordle — Practice Card Pool tests (story: practice-card-pool)
 *
 * Covers: AC-FA6-001, AC-FA6-002, AC-FA6-003
 *
 * Run with: node --test tests/practice-card-pool.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARD_DETAILS_PATH = path.join(ROOT, 'public', 'data', 'card-details.json');

const cards = JSON.parse(fs.readFileSync(CARD_DETAILS_PATH, 'utf8'));

function idsByPool(pool) {
  return cards.filter((c) => c.pool === pool).map((c) => c.oracle_id);
}

// @criterion: AC-FA6-001
describe('AC-FA6-001: Simple practice pool (100 cards, disjoint from Simple daily)', () => {
  test('simple-practice contains exactly 100 cards', () => {
    const count = idsByPool('simple-practice').length;
    assert.strictEqual(count, 100, `Expected 100 simple-practice cards, got ${count}`);
  });

  test('no simple-practice card appears in simple-daily', () => {
    const dailyIds = new Set(idsByPool('simple-daily'));
    const overlap = idsByPool('simple-practice').filter((id) => dailyIds.has(id));
    assert.strictEqual(
      overlap.length,
      0,
      `${overlap.length} cards appear in both simple-daily and simple-practice`
    );
  });
});

// @criterion: AC-FA6-002
describe('AC-FA6-002: Cryptic practice pool (100 cards, disjoint from Cryptic daily)', () => {
  test('cryptic-practice contains exactly 100 cards', () => {
    const count = idsByPool('cryptic-practice').length;
    assert.strictEqual(count, 100, `Expected 100 cryptic-practice cards, got ${count}`);
  });

  test('no cryptic-practice card appears in cryptic-daily', () => {
    const dailyIds = new Set(idsByPool('cryptic-daily'));
    const overlap = idsByPool('cryptic-practice').filter((id) => dailyIds.has(id));
    assert.strictEqual(
      overlap.length,
      0,
      `${overlap.length} cards appear in both cryptic-daily and cryptic-practice`
    );
  });
});

// @criterion: AC-FA6-003
describe('AC-FA6-003: Practice pools are included in the static card-details JSON', () => {
  test('card-details.json contains simple-practice entries', () => {
    const count = idsByPool('simple-practice').length;
    assert.ok(count > 0, 'card-details.json must include simple-practice cards');
  });

  test('card-details.json contains cryptic-practice entries', () => {
    const count = idsByPool('cryptic-practice').length;
    assert.ok(count > 0, 'card-details.json must include cryptic-practice cards');
  });

  test('practice cards share the same required structure as daily cards', () => {
    const required = [
      'oracle_id',
      'name',
      'pool',
      'mana_cost',
      'color_identity',
      'type_line',
      'rarity',
      'set_era',
      'oracle_text_first_line',
      'artist',
      'image_uri',
      'lore_blurb',
      'nicknames',
    ];
    const practice = cards.filter(
      (c) => c.pool === 'simple-practice' || c.pool === 'cryptic-practice'
    );
    for (const card of practice) {
      for (const field of required) {
        assert.ok(
          Object.hasOwn(card, field),
          `Practice card "${card.name}" missing required field: ${field}`
        );
      }
    }
  });
});
