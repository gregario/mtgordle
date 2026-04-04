/**
 * Game engine — clue progression logic for the 6-round MTGordle game.
 *
 * Pure functions with no side effects. React components consume these
 * to determine what to reveal at each round.
 */

import type { Card, GameTier, RoundAction } from '@/types/card';

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

// ---------------------------------------------------------------------------
// Pass mechanic — round advancement and history tracking
// ---------------------------------------------------------------------------

const TOTAL_ROUNDS = 6;

/**
 * Whether the player can pass on the current round.
 * Pass is allowed on rounds 1-5 when the game is not yet solved.
 */
export function canPass(round: number, solved: boolean): boolean {
  return !solved && round >= 1 && round < TOTAL_ROUNDS;
}

/**
 * Apply a pass action: record it and advance to the next round.
 */
export function applyPass(
  round: number,
  actions: RoundAction[],
): { nextRound: number; actions: RoundAction[] } {
  const newActions = [...actions, { type: 'pass' as const }];
  return { nextRound: Math.min(round + 1, TOTAL_ROUNDS), actions: newActions };
}

/**
 * Apply a guess action: record it and advance round.
 * Correct guess jumps to round 6 (all clues revealed).
 * Wrong guess advances by 1.
 */
export function applyGuess(
  round: number,
  actions: RoundAction[],
  name: string,
  isCorrect: boolean,
): { nextRound: number; actions: RoundAction[] } {
  const newActions = [...actions, { type: 'guess' as const, name, isCorrect }];
  const nextRound = isCorrect ? TOTAL_ROUNDS : Math.min(round + 1, TOTAL_ROUNDS);
  return { nextRound, actions: newActions };
}

/** Display indicator for a round action. */
export interface RoundActionIndicator {
  type: 'pass' | 'wrong' | 'correct';
  color: 'gray' | 'red' | 'green';
}

/**
 * Convert raw round actions into display indicators for the round history.
 * Pass → gray, wrong guess → red, correct guess → green.
 */
export function getRoundActions(actions: RoundAction[]): RoundActionIndicator[] {
  return actions.map((action): RoundActionIndicator => {
    if (action.type === 'pass') {
      return { type: 'pass', color: 'gray' };
    }
    if (action.isCorrect) {
      return { type: 'correct', color: 'green' };
    }
    return { type: 'wrong', color: 'red' };
  });
}

/**
 * Format the round indicator text.
 */
export function getRoundActionDisplay(round: number): string {
  return `Round ${round} of ${TOTAL_ROUNDS}`;
}

// ---------------------------------------------------------------------------
// Win/lose detection — score calculation and game-over state
// ---------------------------------------------------------------------------

/**
 * Game outcome with score and display string.
 */
export interface GameOutcome {
  won: boolean;
  score: number | null;    // 1-6 if won, null if lost
  scoreDisplay: string;    // "3/6" or "X/6"
}

/**
 * Calculate the score from round actions.
 * Score = the round number (1-indexed) of the correct guess.
 * Returns null if no correct guess was made (X/6).
 */
export function calculateScore(actions: RoundAction[]): number | null {
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.type === 'guess' && action.isCorrect) {
      return i + 1; // 1-indexed round number
    }
  }
  return null;
}

/**
 * Whether the game is over: either solved or all 6 rounds exhausted.
 */
export function isGameOver(round: number, actions: RoundAction[], solved: boolean): boolean {
  if (solved) return true;
  // Game ends when we're on round 6 and have taken 6 actions (round 6 action completed)
  if (round >= TOTAL_ROUNDS && actions.length >= TOTAL_ROUNDS) return true;
  return false;
}

/**
 * Derive the full game outcome from round actions.
 */
export function getGameOutcome(actions: RoundAction[]): GameOutcome {
  const score = calculateScore(actions);
  if (score !== null) {
    return { won: true, score, scoreDisplay: `${score}/6` };
  }
  return { won: false, score: null, scoreDisplay: 'X/6' };
}
