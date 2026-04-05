/**
 * MTGordle — Score Distribution pure helper
 *
 * Computes rows for the post-solve personal score-distribution bar chart.
 * Consumes per-tier stats and produces seven rows (1/6..6/6 and X/6) with
 * proportional bar widths.
 */

const LABELS = ['1', '2', '3', '4', '5', '6', 'X'];

/**
 * @param {{ guessDistribution: Record<number, number>, gamesPlayed: number, gamesWon: number }} input
 */
export function computeDistributionRows({ guessDistribution, gamesPlayed, gamesWon }) {
  const losses = Math.max(0, gamesPlayed - gamesWon);
  const counts = LABELS.map((label) => {
    if (label === 'X') return losses;
    return guessDistribution[Number(label)] || 0;
  });

  const max = counts.reduce((m, c) => (c > m ? c : m), 0);
  const rows = LABELS.map((label, i) => ({
    label,
    count: counts[i],
    widthPercent: max === 0 ? 0 : Math.round((counts[i] / max) * 100),
  }));

  // Return an array-like object: arrays with an `isEmpty` flag attached.
  // This keeps call sites ergonomic (rows.map, rows.find) while surfacing
  // the empty-state signal without a wrapper shape.
  Object.defineProperty(rows, 'isEmpty', {
    value: gamesPlayed === 0,
    enumerable: false,
  });
  return rows;
}
