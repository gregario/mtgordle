/**
 * MTGordle — Guess Input logic tests
 *
 * Tests the guess validation and autocomplete integration logic
 * for the fuzzy-autocomplete story.
 *
 * Run with: node --test tests/guess-input.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Load data files
// ---------------------------------------------------------------------------

const autocompleteIndex = JSON.parse(
  readFileSync('public/data/autocomplete-index.json', 'utf-8')
);

const cardData = JSON.parse(
  readFileSync('public/data/card-details.json', 'utf-8')
);

// ---------------------------------------------------------------------------
// Import modules
// ---------------------------------------------------------------------------

import { createSearchEngine } from '../src/lib/fuzzy-search.mjs';
import { validateGuess, normalizeCardName } from '../src/lib/guess-validator.mjs';

// ---------------------------------------------------------------------------
// Guess validation
// ---------------------------------------------------------------------------

describe('normalizeCardName', () => {
  test('lowercases the name', () => {
    assert.equal(normalizeCardName('Lightning Bolt'), 'lightning bolt');
  });

  test('trims whitespace', () => {
    assert.equal(normalizeCardName('  Lightning Bolt  '), 'lightning bolt');
  });

  test('collapses multiple spaces', () => {
    assert.equal(normalizeCardName('Lightning  Bolt'), 'lightning bolt');
  });

  test('handles empty string', () => {
    assert.equal(normalizeCardName(''), '');
  });
});

describe('validateGuess', () => {
  const targetCard = {
    name: 'Lightning Bolt',
    nicknames: ['bolt'],
  };

  test('exact name match is correct', () => {
    const result = validateGuess('Lightning Bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('case-insensitive match is correct', () => {
    const result = validateGuess('lightning bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'exact');
  });

  test('match with extra whitespace is correct', () => {
    const result = validateGuess('  Lightning  Bolt  ', targetCard);
    assert.equal(result.isCorrect, true);
  });

  test('wrong guess is incorrect', () => {
    const result = validateGuess('Counterspell', targetCard);
    assert.equal(result.isCorrect, false);
    assert.equal(result.matchType, 'none');
  });

  test('partial name is incorrect', () => {
    const result = validateGuess('Lightning', targetCard);
    assert.equal(result.isCorrect, false);
  });

  test('empty guess is incorrect', () => {
    const result = validateGuess('', targetCard);
    assert.equal(result.isCorrect, false);
  });

  test('nickname match is correct', () => {
    const result = validateGuess('bolt', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'nickname');
  });

  test('nickname match is case-insensitive', () => {
    const result = validateGuess('BOLT', targetCard);
    assert.equal(result.isCorrect, true);
    assert.equal(result.matchType, 'nickname');
  });

  test('card with no nicknames only matches by name', () => {
    const noNickCard = { name: 'Serra Angel', nicknames: [] };
    const result = validateGuess('Serra Angel', noNickCard);
    assert.equal(result.isCorrect, true);

    const wrongResult = validateGuess('serra', noNickCard);
    assert.equal(wrongResult.isCorrect, false);
  });

  test('result includes the guessed name', () => {
    const result = validateGuess('Lightning Bolt', targetCard);
    assert.equal(result.guessedName, 'Lightning Bolt');
  });
});

// ---------------------------------------------------------------------------
// Search + Validation integration
// ---------------------------------------------------------------------------

describe('Search + Validation integration', () => {
  const engine = createSearchEngine(autocompleteIndex, []);

  test('searching and validating a correct guess flow', () => {
    // User types, gets results, picks one
    const results = engine.search('Lightning Bolt');
    assert.ok(results.length > 0, 'should find results');

    const picked = results.find(r => r.name === 'Lightning Bolt');
    assert.ok(picked, 'Lightning Bolt should be in results');

    // Validate the pick against the target
    const target = { name: 'Lightning Bolt', nicknames: [] };
    const validation = validateGuess(picked.name, target);
    assert.equal(validation.isCorrect, true);
  });

  test('searching and validating a wrong guess flow', () => {
    const results = engine.search('Counterspell');
    assert.ok(results.length > 0);

    const picked = results.find(r => r.name === 'Counterspell');
    assert.ok(picked);

    const target = { name: 'Lightning Bolt', nicknames: [] };
    const validation = validateGuess(picked.name, target);
    assert.equal(validation.isCorrect, false);
  });

  test('all 930 curated card names are findable in the autocomplete index', () => {
    const notFound = [];
    for (const card of cardData) {
      const results = engine.search(card.name);
      if (!results.some(r => r.name === card.name)) {
        notFound.push(card.name);
      }
    }
    assert.equal(
      notFound.length,
      0,
      `${notFound.length} curated cards not found in autocomplete: ${notFound.slice(0, 5).join(', ')}`
    );
  });
});

// ---------------------------------------------------------------------------
// Edge cases for guess submission
// ---------------------------------------------------------------------------

describe('Guess submission edge cases', () => {
  test('validateGuess handles card names with special characters', () => {
    const card = { name: "Niv-Mizzet, Parun", nicknames: [] };
    const result = validateGuess("Niv-Mizzet, Parun", card);
    assert.equal(result.isCorrect, true);
  });

  test('validateGuess handles split cards (// notation)', () => {
    // Some card names have // for double-faced or split cards
    const card = { name: "Fire // Ice", nicknames: ['fire ice'] };
    const result = validateGuess("Fire // Ice", card);
    assert.equal(result.isCorrect, true);
  });

  test('validateGuess returns consistent result shape', () => {
    const card = { name: 'Sol Ring', nicknames: [] };
    const result = validateGuess('anything', card);
    assert.ok('isCorrect' in result, 'should have isCorrect');
    assert.ok('matchType' in result, 'should have matchType');
    assert.ok('guessedName' in result, 'should have guessedName');
  });
});
