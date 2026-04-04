/**
 * Guess validation logic for MTGordle.
 *
 * Pure functions — no side effects, no React, no DOM.
 * Exported as .mjs so Node.js test runner can import directly.
 */

/**
 * Normalize a card name for comparison: lowercase, trim, collapse whitespace.
 * @param {string} name
 * @returns {string}
 */
export function normalizeCardName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * @typedef {{ isCorrect: boolean; matchType: 'exact' | 'nickname' | 'none'; guessedName: string }} GuessResult
 */

/**
 * Validate a guess against the target card.
 *
 * @param {string} guess - The player's guess (card name string)
 * @param {{ name: string; nicknames: string[] }} targetCard - The target card
 * @returns {GuessResult}
 */
export function validateGuess(guess, targetCard) {
  const guessedName = guess;
  const normalizedGuess = normalizeCardName(guess);
  const normalizedTarget = normalizeCardName(targetCard.name);

  // Empty guess is always wrong
  if (!normalizedGuess) {
    return { isCorrect: false, matchType: 'none', guessedName };
  }

  // Exact name match (case-insensitive, whitespace-normalized)
  if (normalizedGuess === normalizedTarget) {
    return { isCorrect: true, matchType: 'exact', guessedName };
  }

  // Nickname match
  if (targetCard.nicknames && targetCard.nicknames.length > 0) {
    for (const nick of targetCard.nicknames) {
      if (normalizeCardName(nick) === normalizedGuess) {
        return { isCorrect: true, matchType: 'nickname', guessedName };
      }
    }
  }

  return { isCorrect: false, matchType: 'none', guessedName };
}
