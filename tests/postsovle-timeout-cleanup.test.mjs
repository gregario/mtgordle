import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const postSolveSource = readFileSync(
  resolve('src/components/PostSolve.tsx'),
  'utf-8'
);

describe('[fix-postsovle-settimeout-cleanup] PostSolve.tsx setTimeout cleanup', () => {
  it('[AC-FIX-PS-001] declares a useRef for the setCopied timeout ID', () => {
    // Must import useRef from react
    assert.match(postSolveSource, /useRef/);
    // Must declare a ref with the correct type signature
    assert.match(
      postSolveSource,
      /useRef<ReturnType<typeof setTimeout> \| null>\(null\)/
    );
  });

  it('[AC-FIX-PS-002] both setTimeout calls store their return value in the ref', () => {
    // Find all setTimeout(() => setCopied(false), 2000) calls
    const setTimeoutCalls = postSolveSource.match(
      /setTimeout\(\s*\(\)\s*=>\s*setCopied\(false\)\s*,\s*2000\s*\)/g
    );
    assert.ok(setTimeoutCalls, 'Should have setTimeout(() => setCopied(false), 2000) calls');
    assert.equal(setTimeoutCalls.length, 2, 'Should have exactly 2 setCopied setTimeout calls');

    // Each setTimeout call should be assigned to a ref's .current
    const refAssignments = postSolveSource.match(
      /\.current\s*=\s*setTimeout\(\s*\(\)\s*=>\s*setCopied\(false\)\s*,\s*2000\s*\)/g
    );
    assert.ok(refAssignments, 'setTimeout calls should be assigned to ref.current');
    assert.equal(refAssignments.length, 2, 'Both setTimeout calls should store ID in ref.current');
  });

  it('[AC-FIX-PS-003] useEffect cleanup calls clearTimeout on the timeout ref', () => {
    // Must have a useEffect with cleanup
    assert.match(postSolveSource, /useEffect/);
    // Must call clearTimeout in the cleanup
    assert.match(postSolveSource, /clearTimeout/);
    // The clearTimeout should reference the ref's .current
    assert.match(postSolveSource, /clearTimeout\([a-zA-Z]+Ref\.current\)/);
  });

  it('[AC-FIX-PS-004] no untracked setTimeout calls (all stored in refs)', () => {
    // Every setTimeout in the file should be preceded by a ref.current assignment
    const allSetTimeouts = postSolveSource.match(/setTimeout\(/g);
    const refSetTimeouts = postSolveSource.match(/\.current\s*=\s*setTimeout\(/g);
    assert.ok(allSetTimeouts, 'Should have setTimeout calls');
    assert.ok(refSetTimeouts, 'Should have ref-tracked setTimeout calls');
    assert.equal(
      allSetTimeouts.length,
      refSetTimeouts.length,
      'Every setTimeout must be stored in a ref (no untracked setTimeout calls)'
    );
  });
});
