/**
 * MTGordle — Practice Mode Flow tests (story: practice-mode-flow)
 *
 * Covers: AC-FA6-004, AC-FA6-005, AC-FA6-006, AC-FA6-007, AC-FA6-008
 *
 * Strategy: structural source analysis (mirrors post-solve-layout test style).
 * Verifies that GameBoard and PostSolve wire up the practice flow correctly —
 * random card selection from the practice pool, shared game mechanic with
 * daily mode, a visible practice label, and a Play Again button that resets
 * the game for unlimited practice rounds.
 *
 * Run with: node --test tests/practice-mode-flow.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gameBoardPath = resolve(__dirname, '../src/components/GameBoard.tsx');
const postSolvePath = resolve(__dirname, '../src/components/PostSolve.tsx');
const gameEnginePath = resolve(__dirname, '../src/lib/game-engine.ts');

const gameBoardSrc = readFileSync(gameBoardPath, 'utf-8');
const postSolveSrc = readFileSync(postSolvePath, 'utf-8');
const gameEngineSrc = readFileSync(gameEnginePath, 'utf-8');

// ---------------------------------------------------------------------------
// AC-FA6-004: Practice mode selects a random card from the chosen tier's practice pool
// ---------------------------------------------------------------------------

describe("AC-FA6-004: Practice mode selects random card from tier's practice pool", () => {
  test('filterCardsByPool restricts to `${tier}-practice` pool in practice mode', () => {
    assert.ok(
      /filterCardsByPool.*tier.*mode/s.test(gameEngineSrc) &&
        gameEngineSrc.includes('`${tier}-${mode}`'),
      'filterCardsByPool must build the pool key from tier+mode'
    );
  });

  test('GameBoard calls filterCardsByPool with tier + mode', () => {
    assert.ok(
      /filterCardsByPool\(\s*allCards\s*,\s*tier\s*,\s*mode\s*\)/.test(gameBoardSrc),
      'GameBoard must pass tier and mode to filterCardsByPool'
    );
  });

  test('GameBoard picks a random index from the filtered practice pool', () => {
    assert.ok(
      /mode\s*===\s*['"]practice['"]/.test(gameBoardSrc) &&
        /Math\.floor\(\s*Math\.random\(\)\s*\*\s*filtered\.length\s*\)/.test(gameBoardSrc),
      'GameBoard must select a random card when mode === "practice"'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-005: Game mechanic identical to daily (6 rounds, guess or pass, score)
// ---------------------------------------------------------------------------

describe('AC-FA6-005: Practice mechanic identical to daily (6 rounds, guess/pass, score)', () => {
  test('GameBoard uses the same engine functions for both daily and practice', () => {
    // applyGuess, applyPass, canPass, isGameOver, getGameOutcome all used unconditionally
    for (const fn of ['applyGuess', 'applyPass', 'canPass', 'isGameOver', 'getGameOutcome']) {
      assert.ok(
        gameBoardSrc.includes(fn),
        `GameBoard must use ${fn} (shared mechanic across modes)`
      );
    }
  });

  test('Round count is 6 for all modes', () => {
    assert.ok(
      /Round\s*\{round\}\s*of\s*6/.test(gameBoardSrc),
      'GameBoard must display "Round N of 6" regardless of mode'
    );
  });

  test('handleGuess and handlePass have no mode-specific branching', () => {
    // Extract the two handlers and ensure they do NOT reference `mode`
    const guessMatch = gameBoardSrc.match(/handleGuess\s*=\s*useCallback\([\s\S]*?\[[^\]]*\]\);/);
    const passMatch = gameBoardSrc.match(/handlePass\s*=\s*useCallback\([\s\S]*?\[[^\]]*\]\);/);
    assert.ok(guessMatch, 'handleGuess must exist');
    assert.ok(passMatch, 'handlePass must exist');
    assert.ok(
      !/\bmode\b/.test(guessMatch[0]),
      'handleGuess must not branch on mode (same mechanic for daily & practice)'
    );
    assert.ok(
      !/\bmode\b/.test(passMatch[0]),
      'handlePass must not branch on mode (same mechanic for daily & practice)'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-006: Player can play unlimited practice games
// ---------------------------------------------------------------------------

describe('AC-FA6-006: Player can play unlimited practice games', () => {
  test('GameBoard exposes a reset handler for starting a new practice game', () => {
    assert.ok(
      /handlePlayAgain/.test(gameBoardSrc),
      'GameBoard must define a handlePlayAgain handler'
    );
  });

  test('handlePlayAgain resets round, actions, solved, gameOver, and outcome', () => {
    // Grab from the handlePlayAgain declaration up to the next useCallback declaration
    // (or end of file). Robust against any bracket/paren content inside the body.
    const start = gameBoardSrc.indexOf('handlePlayAgain');
    assert.ok(start >= 0, 'handlePlayAgain must be declared');
    const rest = gameBoardSrc.slice(start);
    const nextHandler = rest.slice(1).search(/\bconst\s+\w+\s*=\s*useCallback/);
    const body = nextHandler > 0 ? rest.slice(0, nextHandler + 1) : rest;
    for (const reset of [
      'setRound(1)',
      'setRoundActions([])',
      'setSolved(false)',
      'setGameOver(false)',
      'setOutcome(null)',
    ]) {
      assert.ok(
        body.includes(reset),
        `handlePlayAgain must call ${reset}`
      );
    }
  });

  test('GameBoard load effect depends on a reset key so it re-runs on play again', () => {
    // The load useEffect's dep array should include a value that changes on play again
    assert.ok(
      /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?loadCard\(\);?\s*\}\s*,\s*\[[^\]]*resetKey[^\]]*\]\)/.test(
        gameBoardSrc
      ),
      'GameBoard load effect must include resetKey in its dep array'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-007: Practice mode clearly labeled so player knows it's not the daily puzzle
// ---------------------------------------------------------------------------

describe("AC-FA6-007: Practice mode clearly labeled", () => {
  test('GameBoard renders a "Practice" label when mode === "practice"', () => {
    assert.ok(
      /mode\s*===\s*['"]practice['"]\s*\?\s*['"]Practice['"]/.test(gameBoardSrc),
      'GameBoard must display "Practice" (not a puzzle number) in practice mode'
    );
  });

  test('Practice label is rendered in the header alongside the tier', () => {
    // modeLabel is shown in h2 next to tierLabel
    assert.ok(
      /\{tierLabel\}\s*\{modeLabel\}/.test(gameBoardSrc),
      'Header must render `{tierLabel} {modeLabel}` so "Simple Practice" / "Cryptic Practice" is visible'
    );
  });

  test('PostSolve also renders the practice label in its header', () => {
    assert.ok(
      /\{tierLabel\}\s*\{modeLabel\}/.test(postSolveSrc),
      'PostSolve header must render `{tierLabel} {modeLabel}`'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA6-008: 'Play again' button appears on practice post-solve
// ---------------------------------------------------------------------------

describe("AC-FA6-008: Play Again button on practice post-solve", () => {
  test('PostSolve accepts an onPlayAgain callback prop', () => {
    assert.ok(
      /onPlayAgain\?:\s*\(\)\s*=>\s*void/.test(postSolveSrc),
      'PostSolve must declare an optional onPlayAgain: () => void prop'
    );
  });

  test('PostSolve renders a play-again button testid when onPlayAgain is provided', () => {
    assert.ok(
      postSolveSrc.includes('data-testid="play-again-button"'),
      'PostSolve must render a button with data-testid="play-again-button"'
    );
    assert.ok(
      /onPlayAgain\s*&&/.test(postSolveSrc),
      'play-again-button must be conditional on onPlayAgain being provided'
    );
  });

  test('play-again-button wires onClick to onPlayAgain', () => {
    const btnMatch = postSolveSrc.match(
      /data-testid="play-again-button"[\s\S]{0,400}?onClick=\{([^}]+)\}/
    );
    // Could also appear in reverse order (onClick before testid)
    const reverseMatch = postSolveSrc.match(
      /onClick=\{onPlayAgain\}[\s\S]{0,400}?data-testid="play-again-button"/
    );
    assert.ok(
      (btnMatch && btnMatch[1].includes('onPlayAgain')) || reverseMatch,
      'play-again-button onClick must invoke onPlayAgain'
    );
  });

  test('GameBoard passes onPlayAgain to PostSolve only in practice mode', () => {
    assert.ok(
      /onPlayAgain=\{\s*mode\s*===\s*['"]practice['"]\s*\?\s*handlePlayAgain\s*:\s*undefined\s*\}/.test(
        gameBoardSrc
      ) ||
        /mode\s*===\s*['"]practice['"]\s*&&[\s\S]{0,60}?onPlayAgain/.test(gameBoardSrc),
      'GameBoard must pass onPlayAgain=handlePlayAgain only when mode === "practice"'
    );
  });
});
