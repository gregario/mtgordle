/**
 * Game engine — clue progression logic for the 6-round MTGordle game.
 *
 * Pure functions with no side effects. React components consume these
 * to determine what to reveal at each round.
 */

import type { Card, GameTier } from '@/types/card';

/** Which clue regions are visible at a given round (1-6). Round 0 = nothing. */
export interface ClueVisibility {
  manaCost: boolean;
  colorIdentity: boolean;
  typeLine: boolean;
  raritySetEra: boolean;
  rulesText: boolean;
  flavorArtist: boolean;
  cardArt: boolean;
}

/**
 * Determine which clues are visible at the given round number.
 *
 * Round 1: mana cost + color identity
 * Round 2: + type line
 * Round 3: + rarity + set era
 * Round 4: + rules text (first line)
 * Round 5: + flavor text (or artist if no flavor)
 * Round 6: + card art image
 */
export function getVisibleClues(round: number): ClueVisibility {
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

/** Map of MTG color identity to border/frame color. */
const COLOR_BORDER_MAP: Record<string, string> = {
  W: '#f9f6ee',
  U: '#0e68ab',
  B: '#1a1a1a',
  R: '#d3202a',
  G: '#00733e',
};

const COLORLESS_BORDER = '#a0a0a0';
const GOLD_BORDER = '#c9a84c';

/**
 * Get the card border/frame color based on color identity.
 * Mono-color: that color's border.
 * Multi-color: gold.
 * Colorless: gray.
 */
export function getCardBorderColor(colorIdentity: string[]): string {
  if (!colorIdentity || colorIdentity.length === 0) return COLORLESS_BORDER;
  if (colorIdentity.length > 1) return GOLD_BORDER;
  return COLOR_BORDER_MAP[colorIdentity[0]] ?? COLORLESS_BORDER;
}

/**
 * Get the card frame gradient for empty clue regions.
 * Uses the card's color identity to tint the empty state.
 */
export function getCardFrameGradient(colorIdentity: string[]): string {
  const borderColor = getCardBorderColor(colorIdentity);
  return `linear-gradient(135deg, ${borderColor}22, ${borderColor}11)`;
}

/**
 * Get the round 5 reveal content: flavor text if available, otherwise artist.
 */
export function getRound5Content(card: Card): { type: 'flavor' | 'artist'; text: string } {
  if (card.flavor_text) {
    return { type: 'flavor', text: card.flavor_text };
  }
  return { type: 'artist', text: `Art by ${card.artist}` };
}

/** Load cards for a given pool from the card details data. */
export function filterCardsByPool(cards: Card[], tier: GameTier, mode: 'daily' | 'practice'): Card[] {
  const pool = `${tier}-${mode}` as Card['pool'];
  return cards.filter(c => c.pool === pool);
}
