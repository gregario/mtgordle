/**
 * MTGordle — Clue Progression Engine tests
 *
 * Tests the 6-round clue progression logic: card loading, clue reveal
 * sequence, and game state management.
 *
 * Run with: node --test tests/clue-engine.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CARD_DETAILS_PATH = path.join(ROOT, 'public', 'data', 'card-details.json');

function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// ─── Mirror config.ts logic ─────────────────────────────────────────────────
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

// ─── Card Loading ────────────────────────────────────────────────────────────

describe('Card Loading', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);

  test('AC-FA1-008: loads correct daily card for simple tier and date', () => {
    const simpleCards = cards.filter(c => c.pool === 'simple-daily');
    assert.equal(simpleCards.length, 365, 'Simple daily pool should have 365 cards');

    // Puzzle #1 on epoch date
    const puzzleNum = getPuzzleNumber(new Date('2026-04-04T12:00:00Z'));
    assert.equal(puzzleNum, 1);
    const cardIdx = getCardIndex(puzzleNum);
    assert.equal(cardIdx, 0);
    const card = simpleCards[cardIdx];
    assert.ok(card, 'Card at index 0 should exist');
    assert.ok(card.name, 'Card should have a name');
  });

  test('AC-FA1-008: loads correct daily card for cryptic tier and date', () => {
    const crypticCards = cards.filter(c => c.pool === 'cryptic-daily');
    assert.equal(crypticCards.length, 365, 'Cryptic daily pool should have 365 cards');

    const puzzleNum = getPuzzleNumber(new Date('2026-04-05T12:00:00Z'));
    assert.equal(puzzleNum, 2);
    const cardIdx = getCardIndex(puzzleNum);
    assert.equal(cardIdx, 1);
    const card = crypticCards[cardIdx];
    assert.ok(card, 'Card at index 1 should exist');
  });

  test('card index wraps after 365 days', () => {
    const puzzleNum = getPuzzleNumber(new Date('2027-04-04T12:00:00Z'));
    // 365 days later → puzzle #366
    assert.equal(puzzleNum, 366);
    const cardIdx = getCardIndex(puzzleNum);
    assert.equal(cardIdx, 0, 'Should wrap back to index 0');
  });
});

// ─── Clue Reveal Sequence ────────────────────────────────────────────────────

describe('Clue Reveal Sequence', () => {
  const cards = loadJSON(CARD_DETAILS_PATH);
  const testCard = cards.find(c => c.pool === 'simple-daily' && c.mana_cost);

  test('AC-FA1-009: round 1 provides mana cost and color identity', () => {
    assert.ok(testCard.mana_cost, 'Test card should have mana_cost');
    assert.ok(Array.isArray(testCard.color_identity), 'Should have color_identity array');
  });

  test('AC-FA1-010: round 2 provides type line', () => {
    assert.ok(testCard.type_line, 'Test card should have type_line');
    assert.ok(testCard.type_line.length > 0, 'type_line should not be empty');
  });

  test('AC-FA1-011: round 3 provides rarity and set era', () => {
    assert.ok(testCard.rarity, 'Test card should have rarity');
    assert.ok(testCard.set_era, 'Test card should have set_era');
  });

  test('AC-FA1-012: round 4 provides rules text first line', () => {
    assert.ok(testCard.oracle_text_first_line !== undefined, 'Test card should have oracle_text_first_line');
  });

  test('AC-FA1-013: round 5 provides flavor text or artist', () => {
    // Every card must have at least one of flavor_text or artist
    const hasFlavor = testCard.flavor_text !== null && testCard.flavor_text !== undefined;
    const hasArtist = testCard.artist !== null && testCard.artist !== undefined;
    assert.ok(hasFlavor || hasArtist, 'Card must have flavor_text or artist for round 5');
  });

  test('AC-FA1-014: round 6 provides image URI', () => {
    assert.ok(testCard.image_uri, 'Test card should have image_uri');
    assert.ok(testCard.image_uri.startsWith('https://'), 'image_uri should be HTTPS');
  });

  test('all simple-daily cards have required clue fields', () => {
    const simpleCards = cards.filter(c => c.pool === 'simple-daily');
    for (const card of simpleCards) {
      assert.ok(card.name, `Card missing name: ${card.oracle_id}`);
      // mana_cost can be empty string for lands
      assert.ok(card.color_identity !== undefined, `Card missing color_identity: ${card.name}`);
      assert.ok(card.type_line, `Card missing type_line: ${card.name}`);
      assert.ok(card.rarity, `Card missing rarity: ${card.name}`);
      assert.ok(card.set_era, `Card missing set_era: ${card.name}`);
      assert.ok(card.oracle_text_first_line !== undefined, `Card missing oracle_text_first_line: ${card.name}`);
      assert.ok(card.artist, `Card missing artist: ${card.name}`);
      assert.ok(card.image_uri, `Card missing image_uri: ${card.name}`);
    }
  });

  test('all cryptic-daily cards have required clue fields', () => {
    const crypticCards = cards.filter(c => c.pool === 'cryptic-daily');
    for (const card of crypticCards) {
      assert.ok(card.name, `Card missing name: ${card.oracle_id}`);
      assert.ok(card.color_identity !== undefined, `Card missing color_identity: ${card.name}`);
      assert.ok(card.type_line, `Card missing type_line: ${card.name}`);
      assert.ok(card.rarity, `Card missing rarity: ${card.name}`);
      assert.ok(card.set_era, `Card missing set_era: ${card.name}`);
      assert.ok(card.oracle_text_first_line !== undefined, `Card missing oracle_text_first_line: ${card.name}`);
      assert.ok(card.artist, `Card missing artist: ${card.name}`);
      assert.ok(card.image_uri, `Card missing image_uri: ${card.name}`);
    }
  });
});

// ─── Clue Visibility Logic ──────────────────────────────────────────────────

describe('Clue Visibility Logic', () => {
  // These test the getVisibleClues helper logic

  test('round 0 (not started) shows no clues', () => {
    const visible = getVisibleClues(0);
    assert.deepEqual(visible, {
      manaCost: false,
      colorIdentity: false,
      typeLine: false,
      raritySetEra: false,
      rulesText: false,
      flavorArtist: false,
      cardArt: false,
    });
  });

  test('round 1 shows mana cost and color identity only', () => {
    const visible = getVisibleClues(1);
    assert.equal(visible.manaCost, true);
    assert.equal(visible.colorIdentity, true);
    assert.equal(visible.typeLine, false);
    assert.equal(visible.raritySetEra, false);
    assert.equal(visible.rulesText, false);
    assert.equal(visible.flavorArtist, false);
    assert.equal(visible.cardArt, false);
  });

  test('round 2 adds type line', () => {
    const visible = getVisibleClues(2);
    assert.equal(visible.manaCost, true);
    assert.equal(visible.colorIdentity, true);
    assert.equal(visible.typeLine, true);
    assert.equal(visible.raritySetEra, false);
  });

  test('round 3 adds rarity and set era', () => {
    const visible = getVisibleClues(3);
    assert.equal(visible.typeLine, true);
    assert.equal(visible.raritySetEra, true);
    assert.equal(visible.rulesText, false);
  });

  test('round 4 adds rules text', () => {
    const visible = getVisibleClues(4);
    assert.equal(visible.raritySetEra, true);
    assert.equal(visible.rulesText, true);
    assert.equal(visible.flavorArtist, false);
  });

  test('round 5 adds flavor text / artist', () => {
    const visible = getVisibleClues(5);
    assert.equal(visible.rulesText, true);
    assert.equal(visible.flavorArtist, true);
    assert.equal(visible.cardArt, false);
  });

  test('round 6 adds card art', () => {
    const visible = getVisibleClues(6);
    assert.equal(visible.flavorArtist, true);
    assert.equal(visible.cardArt, true);
  });

  test('all clues visible at round 6', () => {
    const visible = getVisibleClues(6);
    for (const [key, val] of Object.entries(visible)) {
      assert.equal(val, true, `${key} should be visible at round 6`);
    }
  });
});

// ─── Color Identity to Border Color ─────────────────────────────────────────

describe('Color Identity Border', () => {
  test('mono blue returns blue border', () => {
    const color = getCardBorderColor(['U']);
    assert.equal(color, '#0e68ab');
  });

  test('colorless returns gray border', () => {
    const color = getCardBorderColor([]);
    assert.equal(color, '#a0a0a0');
  });

  test('multicolor returns gold border', () => {
    const color = getCardBorderColor(['W', 'U']);
    assert.equal(color, '#c9a84c');
  });

  test('mono white returns white border', () => {
    const color = getCardBorderColor(['W']);
    assert.equal(color, '#f9f6ee');
  });

  test('mono black returns black border', () => {
    const color = getCardBorderColor(['B']);
    assert.equal(color, '#1a1a1a');
  });

  test('mono red returns red border', () => {
    const color = getCardBorderColor(['R']);
    assert.equal(color, '#d3202a');
  });

  test('mono green returns green border', () => {
    const color = getCardBorderColor(['G']);
    assert.equal(color, '#00733e');
  });
});

// ─── Helper: getVisibleClues (will be implemented in src/lib/game-engine.ts)
function getVisibleClues(round) {
  return {
    manaCost: round >= 1,
    colorIdentity: round >= 1,
    typeLine: round >= 2,
    raritySetEra: round >= 3,
    rulesText: round >= 4,
    flavorArtist: round >= 5,
    cardArt: round >= 6,
  };
}

// ─── Helper: getCardBorderColor (will be in src/lib/game-engine.ts)
const COLOR_MAP = {
  W: '#f9f6ee',
  U: '#0e68ab',
  B: '#1a1a1a',
  R: '#d3202a',
  G: '#00733e',
};

function getCardBorderColor(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) return '#a0a0a0';
  if (colorIdentity.length > 1) return '#c9a84c'; // gold for multicolor
  return COLOR_MAP[colorIdentity[0]] ?? '#a0a0a0';
}
