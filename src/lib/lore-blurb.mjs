/**
 * Lore blurb formatting and placeholder detection.
 *
 * Pure functions — no side effects, no DOM, testable with node:test.
 */

/**
 * Detect whether a lore_blurb is a build-time placeholder.
 * Placeholder pattern: "<Name> is a <TypeLine> from the world of Magic: The Gathering."
 *
 * @param {string} blurb - The lore_blurb value
 * @param {string} cardName - The card's name
 * @returns {boolean}
 */
export function isPlaceholderLore(blurb, cardName) {
  if (!blurb || blurb.trim().length === 0) return true;
  return blurb.includes('from the world of Magic: The Gathering');
}

/**
 * Split a lore blurb into paragraphs for rendering.
 * Handles single-line and multi-line (newline-delimited) blurbs.
 *
 * @param {string} blurb - The lore_blurb value
 * @returns {string[]} Array of non-empty trimmed paragraphs
 */
export function formatLoreBlurb(blurb) {
  if (!blurb) return [];
  return blurb
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Generate a generic lore message for cards with placeholder blurbs.
 * Uses the card's type line and set name to provide context.
 *
 * @param {{ name: string, type_line: string, set_name: string }} card
 * @returns {string}
 */
export function getGenericLoreMessage(card) {
  return `${card.type_line} \u00b7 First printed in ${card.set_name}`;
}
