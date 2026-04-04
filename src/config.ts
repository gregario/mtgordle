export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://mtgordle.vercel.app';

/** Epoch date: puzzle #1 is this day */
export const EPOCH_DATE = new Date('2026-04-04T00:00:00.000Z');

/** Number of cards in each daily pool */
export const DAILY_POOL_SIZE = 365;

/**
 * Returns the 1-based puzzle number for the given date.
 * Puzzle #1 is on EPOCH_DATE.
 */
export function getPuzzleNumber(date: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = Math.floor(
    (date.getTime() - EPOCH_DATE.getTime()) / msPerDay
  );
  return Math.max(1, daysSince + 1);
}

/**
 * Returns the 0-based index into the daily card pool for the given puzzle number.
 * Wraps around after DAILY_POOL_SIZE days.
 */
export function getCardIndex(puzzleNumber: number): number {
  return (puzzleNumber - 1) % DAILY_POOL_SIZE;
}
