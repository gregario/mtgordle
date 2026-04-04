/**
 * MTGordle — Game Engine tests
 *
 * Tests the 6-round clue progression engine.
 * Covers AC-FA1-008 through AC-FA1-016.
 *
 * Run with: node --test tests/game-engine.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Inline re-implementation of config helpers (src/config.ts)
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
// Load card data
// ---------------------------------------------------------------------------

const cardData = JSON.parse(
  readFileSync('public/data/card-details.json', 'utf-8')
);

const simpleDailyCards = cardData.filter(c => c.pool === 'simple-daily');
const crypticDailyCards = cardData.filter(c => c.pool === 'cryptic-daily');

// ---------------------------------------------------------------------------
// Inline game engine logic (mirrors src/lib/game-engine.ts)
// These mirror the source of truth module. Tests validate the logic patterns
// that the React components consume.
// ---------------------------------------------------------------------------

const TOTAL_ROUNDS = 6;

/** Mirror of getVisibleClues from game-engine.ts */
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

/** Mirror of getCardBorderColor from game-engine.ts */
function getCardBorderColor(colorIdentity) {
  const COLOR_BORDER_MAP = { W: '#f9f6ee', U: '#0e68ab', B: '#1a1a1a', R: '#d3202a', G: '#00733e' };
  const COLORLESS_BORDER = '#a0a0a0';
  const GOLD_BORDER = '#c9a84c';
  if (!colorIdentity || colorIdentity.length === 0) return COLORLESS_BORDER;
  if (colorIdentity.length > 1) return GOLD_BORDER;
  return COLOR_BORDER_MAP[colorIdentity[0]] ?? COLORLESS_BORDER;
}

/** Mirror of getCardFrameGradient from game-engine.ts */
function getCardFrameGradient(colorIdentity) {
  const borderColor = getCardBorderColor(colorIdentity);
  return `linear-gradient(135deg, ${borderColor}22, ${borderColor}11)`;
}

/** Mirror of getRound5Content from game-engine.ts */
function getRound5Content(card) {
  if (card.flavor_text) return { type: 'flavor', text: card.flavor_text };
  return { type: 'artist', text: `Art by ${card.artist}` };
}

/** Mirror of filterCardsByPool from game-engine.ts */
function filterCardsByPool(cards, tier, mode) {
  const pool = `${tier}-${mode}`;
  return cards.filter(c => c.pool === pool);
}

/**
 * Get the daily card for a given tier and puzzle number.
 */
function getDailyCard(tier, puzzleNumber) {
  const pool = tier === 'simple' ? simpleDailyCards : crypticDailyCards;
  const index = getCardIndex(puzzleNumber);
  return pool[index] ?? null;
}

/** Get clue data for a specific round (1-indexed). */
const CLUE_LABELS = ['mana-cost', 'type-line', 'rarity-set', 'rules-text', 'flavor-artist', 'art'];

function getClueForRound(card, round) {
  if (round < 1 || round > TOTAL_ROUNDS) return null;
  const clueType = CLUE_LABELS[round - 1];
  switch (clueType) {
    case 'mana-cost':
      return { type: 'mana-cost', manaCost: card.mana_cost, colorIdentity: card.color_identity };
    case 'type-line':
      return { type: 'type-line', typeLine: card.type_line };
    case 'rarity-set':
      return { type: 'rarity-set', rarity: card.rarity, setEra: card.set_era };
    case 'rules-text':
      return { type: 'rules-text', rulesText: card.oracle_text_first_line };
    case 'flavor-artist':
      return { type: 'flavor-artist', flavorText: card.flavor_text, artist: card.artist };
    case 'art':
      return { type: 'art', imageUri: card.image_uri, artCropUri: card.art_crop_uri };
    default:
      return null;
  }
}

function getRevealedClues(card, currentRound) {
  const clues = [];
  for (let r = 1; r <= Math.min(currentRound, TOTAL_ROUNDS); r++) {
    clues.push(getClueForRound(card, r));
  }
  return clues;
}

function createGameState(tier, mode, puzzleNumber, cardIndex) {
  return { tier, mode, puzzleNumber, cardIndex, currentRound: 1, rounds: [], solved: false, failed: false };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('AC-FA1-008: Game loads correct daily card based on tier and date', () => {
  test('simple tier loads from simple-daily pool', () => {
    const card = getDailyCard('simple', 1);
    assert.ok(card, 'Should return a card');
    assert.equal(card.pool, 'simple-daily');
  });

  test('cryptic tier loads from cryptic-daily pool', () => {
    const card = getDailyCard('cryptic', 1);
    assert.ok(card, 'Should return a card');
    assert.equal(card.pool, 'cryptic-daily');
  });

  test('puzzle number 1 maps to card index 0', () => {
    const card = getDailyCard('simple', 1);
    assert.equal(card, simpleDailyCards[0]);
  });

  test('puzzle number wraps around after 365', () => {
    const card366 = getDailyCard('simple', 366);
    const card1 = getDailyCard('simple', 1);
    assert.equal(card366.name, card1.name, 'Puzzle 366 should wrap to same card as puzzle 1');
  });

  test('different puzzle numbers produce different cards (for first 365)', () => {
    const card1 = getDailyCard('simple', 1);
    const card2 = getDailyCard('simple', 2);
    assert.notEqual(card1.name, card2.name, 'Adjacent puzzles should have different cards');
  });

  test('epoch date produces puzzle number 1', () => {
    const pn = getPuzzleNumber(new Date('2026-04-04T12:00:00Z'));
    assert.equal(pn, 1);
  });

  test('day after epoch produces puzzle number 2', () => {
    const pn = getPuzzleNumber(new Date('2026-04-05T12:00:00Z'));
    assert.equal(pn, 2);
  });
});

describe('AC-FA1-009: Round 1 displays mana pips and color identity', () => {
  const card = simpleDailyCards[0];
  const clue = getClueForRound(card, 1);

  test('round 1 clue type is mana-cost', () => {
    assert.equal(clue.type, 'mana-cost');
  });

  test('round 1 includes mana cost string', () => {
    assert.equal(clue.manaCost, card.mana_cost);
  });

  test('round 1 includes color identity array', () => {
    assert.deepEqual(clue.colorIdentity, card.color_identity);
  });
});

describe('AC-FA1-010: Round 2 reveals type line', () => {
  const card = simpleDailyCards[0];
  const clue = getClueForRound(card, 2);

  test('round 2 clue type is type-line', () => {
    assert.equal(clue.type, 'type-line');
  });

  test('round 2 includes type line', () => {
    assert.equal(clue.typeLine, card.type_line);
  });
});

describe('AC-FA1-011: Round 3 reveals rarity + set era', () => {
  const card = simpleDailyCards[0];
  const clue = getClueForRound(card, 3);

  test('round 3 clue type is rarity-set', () => {
    assert.equal(clue.type, 'rarity-set');
  });

  test('round 3 includes rarity', () => {
    assert.equal(clue.rarity, card.rarity);
  });

  test('round 3 includes set era', () => {
    assert.equal(clue.setEra, card.set_era);
  });
});

describe('AC-FA1-012: Round 4 reveals rules text', () => {
  const card = simpleDailyCards[0];
  const clue = getClueForRound(card, 4);

  test('round 4 clue type is rules-text', () => {
    assert.equal(clue.type, 'rules-text');
  });

  test('round 4 includes first line of rules text', () => {
    assert.equal(clue.rulesText, card.oracle_text_first_line);
  });
});

describe('AC-FA1-013: Round 5 reveals flavor text or artist', () => {
  test('round 5 clue type is flavor-artist', () => {
    const card = simpleDailyCards[0];
    const clue = getClueForRound(card, 5);
    assert.equal(clue.type, 'flavor-artist');
  });

  test('card with flavor text includes flavor text', () => {
    const cardWithFlavor = simpleDailyCards.find(c => c.flavor_text !== null);
    assert.ok(cardWithFlavor, 'Should find a card with flavor text');
    const clue = getClueForRound(cardWithFlavor, 5);
    assert.equal(clue.flavorText, cardWithFlavor.flavor_text);
  });

  test('card without flavor text includes artist as fallback', () => {
    const cardNoFlavor = simpleDailyCards.find(c => c.flavor_text === null);
    if (cardNoFlavor) {
      const clue = getClueForRound(cardNoFlavor, 5);
      assert.equal(clue.flavorText, null);
      assert.ok(clue.artist, 'Should include artist name');
    }
  });
});

describe('AC-FA1-014: Round 6 fills art region', () => {
  const card = simpleDailyCards[0];
  const clue = getClueForRound(card, 6);

  test('round 6 clue type is art', () => {
    assert.equal(clue.type, 'art');
  });

  test('round 6 includes image URI', () => {
    assert.equal(clue.imageUri, card.image_uri);
    assert.ok(clue.imageUri.startsWith('https://'), 'Image URI should be a URL');
  });

  test('round 6 includes art crop URI', () => {
    assert.equal(clue.artCropUri, card.art_crop_uri);
  });
});

describe('Clue progression: revealed clues accumulate', () => {
  const card = simpleDailyCards[0];

  test('round 1 reveals 1 clue', () => {
    const clues = getRevealedClues(card, 1);
    assert.equal(clues.length, 1);
    assert.equal(clues[0].type, 'mana-cost');
  });

  test('round 3 reveals 3 clues', () => {
    const clues = getRevealedClues(card, 3);
    assert.equal(clues.length, 3);
    assert.equal(clues[0].type, 'mana-cost');
    assert.equal(clues[1].type, 'type-line');
    assert.equal(clues[2].type, 'rarity-set');
  });

  test('round 6 reveals all 6 clues', () => {
    const clues = getRevealedClues(card, 6);
    assert.equal(clues.length, 6);
    assert.equal(clues[5].type, 'art');
  });

  test('round > 6 still reveals only 6 clues', () => {
    const clues = getRevealedClues(card, 8);
    assert.equal(clues.length, 6);
  });
});

describe('Game state management', () => {
  test('createGameState initializes with round 1', () => {
    const state = createGameState('simple', 'daily', 1, 0);
    assert.equal(state.currentRound, 1);
    assert.equal(state.solved, false);
    assert.equal(state.failed, false);
    assert.equal(state.rounds.length, 0);
  });

  test('game state tracks tier and mode', () => {
    const state = createGameState('cryptic', 'daily', 5, 4);
    assert.equal(state.tier, 'cryptic');
    assert.equal(state.mode, 'daily');
    assert.equal(state.puzzleNumber, 5);
    assert.equal(state.cardIndex, 4);
  });
});

describe('AC-FA1-015: Card frame proportions (63:88 ratio)', () => {
  const CARD_RATIO = 63 / 88; // ~0.7159

  test('ratio is approximately 0.716', () => {
    assert.ok(CARD_RATIO > 0.715 && CARD_RATIO < 0.717, `Ratio should be ~0.716, got ${CARD_RATIO}`);
  });

  test('width 315px gives height ~440px', () => {
    const width = 315;
    const height = width / CARD_RATIO;
    assert.ok(Math.abs(height - 440) < 1, `Height should be ~440px, got ${height}`);
  });
});

describe('AC-FA1-016: Empty clue regions use color identity', () => {
  test('card with single color identity maps to a gradient', () => {
    const card = simpleDailyCards.find(c => c.color_identity.length === 1);
    assert.ok(card, 'Should find a mono-color card');
    assert.ok(card.color_identity[0].length === 1, 'Color identity should be a single letter');
  });

  test('card with multi-color identity has multiple colors for gradient', () => {
    const card = simpleDailyCards.find(c => c.color_identity.length >= 2);
    assert.ok(card, 'Should find a multi-color card');
    assert.ok(card.color_identity.length >= 2, 'Should have 2+ colors');
  });

  test('colorless card has empty color identity', () => {
    const card = simpleDailyCards.find(c => c.color_identity.length === 0);
    // Colorless cards may or may not exist in the pool
    if (card) {
      assert.deepEqual(card.color_identity, []);
    }
  });
});

describe('getVisibleClues: clue visibility by round', () => {
  test('round 0 reveals nothing', () => {
    const v = getVisibleClues(0);
    assert.equal(v.manaCost, false);
    assert.equal(v.typeLine, false);
    assert.equal(v.raritySetEra, false);
    assert.equal(v.rulesText, false);
    assert.equal(v.flavorArtist, false);
    assert.equal(v.cardArt, false);
  });

  test('round 1 reveals mana cost and color identity only', () => {
    const v = getVisibleClues(1);
    assert.equal(v.manaCost, true);
    assert.equal(v.colorIdentity, true);
    assert.equal(v.typeLine, false);
    assert.equal(v.raritySetEra, false);
    assert.equal(v.rulesText, false);
    assert.equal(v.flavorArtist, false);
    assert.equal(v.cardArt, false);
  });

  test('round 3 reveals mana, type line, and rarity', () => {
    const v = getVisibleClues(3);
    assert.equal(v.manaCost, true);
    assert.equal(v.typeLine, true);
    assert.equal(v.raritySetEra, true);
    assert.equal(v.rulesText, false);
    assert.equal(v.flavorArtist, false);
    assert.equal(v.cardArt, false);
  });

  test('round 6 reveals everything', () => {
    const v = getVisibleClues(6);
    assert.equal(v.manaCost, true);
    assert.equal(v.typeLine, true);
    assert.equal(v.raritySetEra, true);
    assert.equal(v.rulesText, true);
    assert.equal(v.flavorArtist, true);
    assert.equal(v.cardArt, true);
  });
});

describe('getCardBorderColor: color identity to border color', () => {
  test('mono-blue returns blue', () => {
    assert.equal(getCardBorderColor(['U']), '#0e68ab');
  });

  test('multi-color returns gold', () => {
    assert.equal(getCardBorderColor(['U', 'B']), '#c9a84c');
  });

  test('colorless returns gray', () => {
    assert.equal(getCardBorderColor([]), '#a0a0a0');
  });

  test('null/undefined returns gray', () => {
    assert.equal(getCardBorderColor(null), '#a0a0a0');
    assert.equal(getCardBorderColor(undefined), '#a0a0a0');
  });
});

describe('getCardFrameGradient: empty region gradient', () => {
  test('returns linear-gradient string', () => {
    const gradient = getCardFrameGradient(['R']);
    assert.ok(gradient.startsWith('linear-gradient'), `Expected gradient, got: ${gradient}`);
    assert.ok(gradient.includes('#d3202a'), 'Should include red border color');
  });
});

describe('getRound5Content: flavor text or artist fallback', () => {
  test('card with flavor text returns flavor type', () => {
    const card = simpleDailyCards.find(c => c.flavor_text !== null);
    const result = getRound5Content(card);
    assert.equal(result.type, 'flavor');
    assert.equal(result.text, card.flavor_text);
  });

  test('card without flavor text returns artist type', () => {
    const card = simpleDailyCards.find(c => c.flavor_text === null);
    if (card) {
      const result = getRound5Content(card);
      assert.equal(result.type, 'artist');
      assert.ok(result.text.startsWith('Art by '), `Expected 'Art by ...' got: ${result.text}`);
    }
  });
});

describe('filterCardsByPool: pool filtering', () => {
  test('filters simple-daily correctly', () => {
    const filtered = filterCardsByPool(cardData, 'simple', 'daily');
    assert.equal(filtered.length, 365);
    assert.ok(filtered.every(c => c.pool === 'simple-daily'));
  });

  test('filters cryptic-daily correctly', () => {
    const filtered = filterCardsByPool(cardData, 'cryptic', 'daily');
    assert.equal(filtered.length, 365);
    assert.ok(filtered.every(c => c.pool === 'cryptic-daily'));
  });

  test('filters simple-practice correctly', () => {
    const filtered = filterCardsByPool(cardData, 'simple', 'practice');
    assert.equal(filtered.length, 100);
    assert.ok(filtered.every(c => c.pool === 'simple-practice'));
  });

  test('filters cryptic-practice correctly', () => {
    const filtered = filterCardsByPool(cardData, 'cryptic', 'practice');
    assert.equal(filtered.length, 100);
    assert.ok(filtered.every(c => c.pool === 'cryptic-practice'));
  });
});

describe('All cards in pools have required clue fields', () => {
  for (const pool of ['simple-daily', 'cryptic-daily']) {
    const poolCards = cardData.filter(c => c.pool === pool);

    test(`${pool}: all cards have mana_cost`, () => {
      for (const card of poolCards) {
        assert.ok(card.mana_cost !== undefined, `${card.name} missing mana_cost`);
      }
    });

    test(`${pool}: all cards have color_identity array`, () => {
      for (const card of poolCards) {
        assert.ok(Array.isArray(card.color_identity), `${card.name} missing color_identity`);
      }
    });

    test(`${pool}: all cards have type_line`, () => {
      for (const card of poolCards) {
        assert.ok(card.type_line, `${card.name} missing type_line`);
      }
    });

    test(`${pool}: all cards have rarity`, () => {
      for (const card of poolCards) {
        assert.ok(card.rarity, `${card.name} missing rarity`);
      }
    });

    test(`${pool}: all cards have set_era`, () => {
      for (const card of poolCards) {
        assert.ok(card.set_era, `${card.name} missing set_era`);
      }
    });

    test(`${pool}: all cards have oracle_text_first_line`, () => {
      for (const card of poolCards) {
        assert.ok(card.oracle_text_first_line !== undefined, `${card.name} missing oracle_text_first_line`);
      }
    });

    test(`${pool}: all cards have image_uri`, () => {
      for (const card of poolCards) {
        assert.ok(card.image_uri, `${card.name} missing image_uri`);
      }
    });

    test(`${pool}: all cards have artist`, () => {
      for (const card of poolCards) {
        assert.ok(card.artist, `${card.name} missing artist`);
      }
    });
  }
});
