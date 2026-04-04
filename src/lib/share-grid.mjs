/**
 * Share grid generation — produces Wordle-style share text for MTGordle.
 *
 * Pure function, no side effects. Consumed by PostSolve component
 * and testable with Node test runner.
 */

/** Emoji approximation for each MTG colour in share text. */
const COLOUR_EMOJI = {
  W: '⚪',
  U: '🔵',
  B: '⚫',
  R: '🔴',
  G: '🟢',
};

/** Grid emoji for each action type. */
const GRID_EMOJI = {
  pass: '⬜',
  wrong: '🟥',
  correct: '🟩',
};

/**
 * Convert a color_identity array to an emoji string.
 * W=⚪  U=🔵  B=⚫  R=🔴  G=🟢  colorless=◇
 */
function colorIdentityToEmoji(colorIdentity) {
  if (!colorIdentity || colorIdentity.length === 0) return '◇';
  return colorIdentity.map(c => COLOUR_EMOJI[c] ?? '◇').join('');
}

/**
 * Convert round actions to emoji grid squares.
 * Green = correct, red = wrong, gray/white = pass.
 * Grid stops at the winning round (no trailing empty squares).
 */
function actionsToGrid(actions) {
  return actions.map(action => {
    if (action.type === 'pass') return GRID_EMOJI.pass;
    if (action.type === 'guess' && action.isCorrect) return GRID_EMOJI.correct;
    return GRID_EMOJI.wrong;
  }).join('');
}

/**
 * Strip protocol from a URL for cleaner share text display.
 */
function stripProtocol(url) {
  return url.replace(/^https?:\/\//, '');
}

/**
 * Generate the full share text for a completed MTGordle game.
 *
 * @param {object} opts
 * @param {number} opts.puzzleNumber - 1-based puzzle number
 * @param {string} opts.tier - Display tier name (e.g. 'Simple', 'Cryptic')
 * @param {string} opts.scoreDisplay - Score string (e.g. '3/6' or 'X/6')
 * @param {string[]} opts.colorIdentity - Card's color identity array
 * @param {Array<{type: string, name?: string, isCorrect?: boolean}>} opts.actions - Round actions
 * @param {string} [opts.baseUrl] - Optional base URL override
 * @returns {string} Multi-line share text
 */
export function generateShareText({
  puzzleNumber,
  tier,
  scoreDisplay,
  colorIdentity,
  actions,
  baseUrl = 'https://mtgordle.vercel.app',
}) {
  const header = `MTGordle #${puzzleNumber} (${tier}) ${scoreDisplay}`;
  const manaLine = colorIdentityToEmoji(colorIdentity);
  const gridLine = actionsToGrid(actions);
  const urlLine = stripProtocol(baseUrl);

  return [header, manaLine, gridLine, urlLine].join('\n');
}
