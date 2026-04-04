import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// AC-FA4-012: Share button copies the share text to clipboard
// ---------------------------------------------------------------------------
describe('AC-FA4-012: Share button copies share text to clipboard', () => {
  it('PostSolve component calls navigator.clipboard.writeText with generated share text', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    // PostSolve must call navigator.clipboard.writeText
    assert.ok(
      src.includes('navigator.clipboard.writeText'),
      'PostSolve.tsx must call navigator.clipboard.writeText()'
    );
  });

  it('PostSolve passes share text from generateShareText to clipboard', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    // Must import generateShareText
    assert.ok(
      src.includes('generateShareText'),
      'PostSolve.tsx must use generateShareText()'
    );
    // Must pass the result to clipboard
    assert.ok(
      src.includes('navigator.clipboard.writeText(shareText)') ||
      src.includes('navigator.clipboard.writeText(text)') ||
      // Fallback pattern: writeToClipboard or copyToClipboard wrapper
      src.includes('copyToClipboard(shareText)') ||
      src.includes('writeToClipboard(shareText)'),
      'PostSolve.tsx must pass generated share text to clipboard API'
    );
  });

  it('share-grid generateShareText produces valid share text for clipboard', async () => {
    // Verify generateShareText is importable and produces string output
    // (This also ensures the share-grid module is functional)
    const { generateShareText } = await import('../src/lib/share-grid.mjs');
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong', isCorrect: false },
        { type: 'guess', name: 'Right', isCorrect: true },
      ],
    });
    assert.equal(typeof text, 'string');
    assert.ok(text.length > 0, 'Share text must not be empty');
    assert.ok(text.includes('MTGordle'), 'Share text must include MTGordle header');
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-013: Visual confirmation shown after copy (button text → 'Copied!')
// ---------------------------------------------------------------------------
describe('AC-FA4-013: Visual confirmation after copy', () => {
  it('PostSolve has a share button with data-testid', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    assert.ok(
      src.includes('data-testid="share-button"'),
      'PostSolve.tsx must have a share button with data-testid="share-button"'
    );
  });

  it('PostSolve manages a copied state for visual feedback', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    assert.ok(
      src.includes('setCopied(true)'),
      'PostSolve.tsx must set copied state to true on successful copy'
    );
  });

  it('share button shows "Copied!" text after copy', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    assert.ok(
      src.includes("'Copied!'") || src.includes('"Copied!"') || src.includes('`Copied!`'),
      'PostSolve.tsx must display "Copied!" text after copy'
    );
  });

  it('copied state resets after a timeout', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    assert.ok(
      src.includes('setCopied(false)'),
      'PostSolve.tsx must reset copied state after a timeout'
    );
    assert.ok(
      src.includes('setTimeout'),
      'PostSolve.tsx must use setTimeout to reset copied state'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA4-014: Base URL read from a single config constant
// ---------------------------------------------------------------------------
describe('AC-FA4-014: Base URL from single config constant', () => {
  it('config.ts exports a BASE_URL constant', () => {
    const src = readFileSync(join(root, 'src/config.ts'), 'utf8');
    assert.ok(
      src.includes('export const BASE_URL'),
      'config.ts must export a BASE_URL constant'
    );
  });

  it('BASE_URL reads from NEXT_PUBLIC_BASE_URL env var with fallback', () => {
    const src = readFileSync(join(root, 'src/config.ts'), 'utf8');
    assert.ok(
      src.includes('NEXT_PUBLIC_BASE_URL'),
      'config.ts BASE_URL must read from NEXT_PUBLIC_BASE_URL env var'
    );
  });

  it('PostSolve imports BASE_URL from config and passes it to generateShareText', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    // Must import BASE_URL from config
    assert.ok(
      src.includes('BASE_URL') && (src.includes("from '@/config'") || src.includes('from "../config"') || src.includes("from '../../config'")),
      'PostSolve.tsx must import BASE_URL from config module'
    );
    // Must pass baseUrl to generateShareText
    assert.ok(
      src.includes('baseUrl') && src.includes('BASE_URL'),
      'PostSolve.tsx must pass BASE_URL as baseUrl to generateShareText'
    );
  });

  it('share-grid generateShareText accepts baseUrl parameter', () => {
    const src = readFileSync(join(root, 'src/lib/share-grid.mjs'), 'utf8');
    assert.ok(
      src.includes('baseUrl'),
      'share-grid.mjs generateShareText must accept a baseUrl parameter'
    );
  });

  it('generateShareText uses provided baseUrl in output', async () => {
    const { generateShareText } = await import('../src/lib/share-grid.mjs');
    const customUrl = 'https://custom-domain.com';
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Simple',
      scoreDisplay: '1/6',
      colorIdentity: ['W'],
      actions: [{ type: 'guess', name: 'X', isCorrect: true }],
      baseUrl: customUrl,
    });
    const lines = text.split('\n');
    assert.equal(lines[lines.length - 1], 'custom-domain.com');
  });
});

// ---------------------------------------------------------------------------
// Integration: clipboard fallback for older browsers
// ---------------------------------------------------------------------------
describe('Clipboard fallback for older browsers', () => {
  it('PostSolve has a fallback mechanism when navigator.clipboard is unavailable', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    // Should handle the case where clipboard API is not available
    // Either by checking navigator.clipboard existence or try/catch
    const hasFallback =
      src.includes('document.execCommand') ||
      src.includes('catch') ||
      src.includes('navigator.clipboard &&') ||
      src.includes('navigator?.clipboard');
    assert.ok(
      hasFallback,
      'PostSolve.tsx must handle clipboard API unavailability (fallback or error handling)'
    );
  });
});
