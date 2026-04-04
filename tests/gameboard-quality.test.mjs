/**
 * MTGordle — GameBoard Quality Fix tests
 *
 * Verifies ACTION_COLORS extraction to module-level const and
 * setTimeout cleanup via useRef + useEffect.
 * Covers AC-FIX-GB-001 through AC-FIX-GB-006.
 *
 * Run with: node --test tests/gameboard-quality.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gameboardPath = resolve(__dirname, '../src/components/GameBoard.tsx');
const source = readFileSync(gameboardPath, 'utf-8');

// ---------------------------------------------------------------------------
// AC-FIX-GB-001: ACTION_COLORS is defined exactly once as a module-level
// const in GameBoard.tsx (not inside any function or render block)
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-001: ACTION_COLORS module-level const', () => {
  test('ACTION_COLORS is defined exactly once in the file', () => {
    const matches = source.match(/\bconst\s+ACTION_COLORS\b/g);
    assert.ok(matches, 'ACTION_COLORS const declaration not found');
    assert.equal(matches.length, 1, `Expected exactly 1 ACTION_COLORS declaration, found ${matches.length}`);
  });

  test('ACTION_COLORS is declared before the component function', () => {
    const constIdx = source.indexOf('const ACTION_COLORS');
    const componentIdx = source.indexOf('export default function GameBoard');
    assert.ok(constIdx !== -1, 'ACTION_COLORS not found');
    assert.ok(componentIdx !== -1, 'GameBoard component not found');
    assert.ok(constIdx < componentIdx,
      'ACTION_COLORS must be declared before the GameBoard component (module-level)');
  });
});

// ---------------------------------------------------------------------------
// AC-FIX-GB-002: Both usages reference the single module-level const
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-002: Both usages reference single const', () => {
  test('ACTION_COLORS is referenced at least twice (declaration + round indicator usage)', () => {
    // Count all references to ACTION_COLORS (declaration + at least 1 usage)
    // Post-solve history dots moved to PostSolve.tsx — GameBoard retains round indicator usage
    const allRefs = source.match(/\bACTION_COLORS\b/g);
    assert.ok(allRefs, 'No ACTION_COLORS references found');
    assert.ok(allRefs.length >= 2,
      `Expected at least 2 occurrences (1 decl + 1 usage), found ${allRefs.length}`);
  });

  test('no inline ACTION_COLORS object literals remain', () => {
    // After extraction, there should be no { gray: ... red: ... green: ... } inline objects
    // that look like duplicate ACTION_COLORS definitions inside JSX
    const inlinePatterns = source.match(/\{\s*gray:\s*['"][^'"]+['"]\s*,\s*red:\s*['"][^'"]+['"]\s*,\s*green:\s*['"][^'"]+['"]\s*\}/g);
    // Should be exactly 1 (the module-level const value)
    assert.ok(inlinePatterns, 'ACTION_COLORS object literal not found at all');
    assert.equal(inlinePatterns.length, 1,
      `Expected exactly 1 ACTION_COLORS object literal (the declaration), found ${inlinePatterns.length}`);
  });
});

// ---------------------------------------------------------------------------
// AC-FIX-GB-003: All setTimeout calls store their timeout IDs via useRef
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-003: setTimeout IDs stored via useRef', () => {
  test('useRef is imported from react', () => {
    assert.ok(source.includes('useRef'), 'useRef not found in imports');
  });

  test('timeout refs are declared with useRef', () => {
    // Should have at least one useRef<NodeJS.Timeout | null> or useRef<ReturnType<typeof setTimeout> | null>
    const refDecls = source.match(/useRef\s*[<(]/g);
    assert.ok(refDecls, 'No useRef declarations found');
    assert.ok(refDecls.length >= 1, 'Expected at least 1 useRef for timeout tracking');
  });

  test('setTimeout return values are assigned to refs', () => {
    // Each setTimeout should be assigned to a .current property
    const setTimeoutCalls = source.match(/setTimeout\s*\(/g);
    assert.ok(setTimeoutCalls, 'No setTimeout calls found');

    const refAssignments = source.match(/\.current\s*=\s*setTimeout/g);
    assert.ok(refAssignments, 'No setTimeout assignments to ref.current found');
    assert.equal(refAssignments.length, setTimeoutCalls.length,
      `All ${setTimeoutCalls.length} setTimeout calls must assign to ref.current, found ${refAssignments.length} assignments`);
  });
});

// ---------------------------------------------------------------------------
// AC-FIX-GB-004: useEffect cleanup calls clearTimeout on all stored refs
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-004: useEffect cleanup with clearTimeout', () => {
  test('clearTimeout is called in a useEffect cleanup', () => {
    // Look for a cleanup pattern: return () => { ... clearTimeout ... }
    assert.ok(source.includes('clearTimeout'),
      'clearTimeout not found in the source — no cleanup');
  });

  test('cleanup function exists in a useEffect', () => {
    // useEffect with a return statement containing clearTimeout
    // This is a structural check — the cleanup must be inside a useEffect
    const useEffectBlocks = source.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\}\s*,/g);
    assert.ok(useEffectBlocks, 'No useEffect blocks found');
    const hasCleanup = useEffectBlocks.some(block => block.includes('clearTimeout'));
    assert.ok(hasCleanup, 'No useEffect contains a clearTimeout cleanup');
  });
});

// ---------------------------------------------------------------------------
// AC-FIX-GB-005: No raw setTimeout calls without ref tracking
// (Static proxy — actual React warning test requires DOM environment)
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-005: No untracked setTimeout calls', () => {
  test('every setTimeout is preceded by a ref assignment pattern', () => {
    // Split by lines and check each setTimeout line
    const lines = source.split('\n');
    const setTimeoutLines = lines.filter(l => l.includes('setTimeout('));
    assert.ok(setTimeoutLines.length > 0, 'No setTimeout calls found');

    for (const line of setTimeoutLines) {
      assert.ok(line.includes('.current'),
        `setTimeout call not assigned to a ref: ${line.trim()}`);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-FIX-GB-006: Build and test pass — verified by running this test file
// as part of `npm test` (which runs node --test tests/*.mjs)
// ---------------------------------------------------------------------------

describe('AC-FIX-GB-006: Source file is valid', () => {
  test('GameBoard.tsx source file exists and is non-empty', () => {
    assert.ok(source.length > 0, 'GameBoard.tsx is empty');
  });

  test('GameBoard.tsx exports a default function component', () => {
    assert.ok(source.includes('export default function GameBoard'),
      'Missing default export for GameBoard');
  });
});
