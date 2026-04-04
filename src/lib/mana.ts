/**
 * Mana string utilities — foundation shared library
 *
 * Parses Scryfall mana cost notation (e.g. "{2}{U}{B}") into individual
 * symbol tokens and classifies them. Used by ManaSymbol component, share
 * grid generation, and anywhere else mana costs appear in the UI.
 */

/** The five MTG colours as a type. */
export type ManaColour = 'W' | 'U' | 'B' | 'R' | 'G';

/** All canonical mana token categories. */
export type ManaCategory =
  | ManaColour   // named colour
  | 'C'          // colorless
  | 'generic'    // numeric (0, 1, 2, …, 15, 16, …)
  | 'X'          // variable
  | 'hybrid'     // e.g. W/U
  | 'phyrexian'; // e.g. W/P

const COLOUR_SET = new Set<string>(['W', 'U', 'B', 'R', 'G']);

/**
 * Parse a Scryfall mana cost string into individual symbol tokens.
 *
 * @example
 * parseMana('{2}{U}{B}') // ['2', 'U', 'B']
 * parseMana('{W/U}')     // ['W/U']
 * parseMana('')          // []
 */
export function parseMana(manaCost: string | null | undefined): string[] {
  if (!manaCost) return [];
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1, -1));
}

/** Return true when the token is a numeric generic mana symbol. */
export function isGeneric(token: string): boolean {
  return /^\d+$/.test(token);
}

/** Return the canonical colour category for a mana token. */
export function tokenCategory(token: string): ManaCategory {
  if (COLOUR_SET.has(token)) return token as ManaColour;
  if (token === 'C') return 'C';
  if (token === 'X') return 'X';
  if (isGeneric(token)) return 'generic';
  // Phyrexian symbols contain a slash and a 'P' half (e.g. W/P)
  if (token.includes('/') && token.includes('P')) return 'phyrexian';
  if (token.includes('/')) return 'hybrid';
  return 'generic'; // fallback for anything unexpected
}

/**
 * Convert a color_identity array to an emoji approximation for share text.
 * W=⚪  U=🔵  B=⚫  R=🔴  G=🟢  multi=🟡  colorless=◇
 */
export function colorIdentityEmoji(colorIdentity: string[]): string {
  if (!colorIdentity || colorIdentity.length === 0) return '◇';
  if (colorIdentity.length > 1) {
    // Multi-colour: show individual pips or single gold pip
    return colorIdentity
      .map(c => COLOUR_EMOJI[c] ?? '◇')
      .join('');
  }
  return COLOUR_EMOJI[colorIdentity[0]] ?? '◇';
}

/** Emoji approximation for each colour in share text. */
export const COLOUR_EMOJI: Record<string, string> = {
  W: '⚪',
  U: '🔵',
  B: '⚫',
  R: '🔴',
  G: '🟢',
};
