import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// AC-FA8-016: Inbound link from share text lands on the game, not the post-solve
// ---------------------------------------------------------------------------
// Share text embeds the base URL (e.g. "mtgordle.vercel.app"). When a visitor
// clicks that link, they arrive at "/" — the HomePage. The HomePage must
// render the tier selection (game start), never the post-solve screen.
// ---------------------------------------------------------------------------
describe('AC-FA8-016: Inbound link lands on the game, not the post-solve', () => {
  it('HomePage renders TierSelection', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      src.includes('TierSelection'),
      'HomePage (src/app/page.tsx) must render TierSelection'
    );
    assert.ok(
      src.includes('<TierSelection'),
      'HomePage must mount TierSelection as a JSX element'
    );
  });

  it('HomePage does not render PostSolve', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      !src.includes('PostSolve'),
      'HomePage must NOT import or render PostSolve — that would spoil inbound visitors'
    );
  });

  it('HomePage does not render GameBoard directly (no auto-start into a game)', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      !src.includes('GameBoard'),
      'HomePage must NOT render GameBoard — the tier selection page is the landing surface'
    );
  });

  it('HomePage has no client-side redirect to post-solve', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      !src.includes('redirect(') && !src.includes("router.push('/play") &&
        !src.includes('router.replace'),
      'HomePage must not redirect the visitor — they should see the tier selection'
    );
    // Confirm no next/navigation redirect import
    assert.ok(
      !/from\s+['"]next\/navigation['"]/.test(src),
      'HomePage should not import navigation helpers for auto-redirects'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA8-017: Visitor who hasn't played today's puzzle sees tier selection
//             or game start.
// ---------------------------------------------------------------------------
// The HomePage renders unconditionally — it does not read localStorage or
// completion state before deciding what to render. Every inbound visitor sees
// the tier selection, regardless of whether they've played today.
// ---------------------------------------------------------------------------
describe('AC-FA8-017: Visitor sees tier selection / game start', () => {
  it('TierSelection exposes daily puzzle entry points', () => {
    const src = readFileSync(join(root, 'src/components/TierSelection.tsx'), 'utf8');
    assert.ok(
      src.includes("href: '/play/simple'"),
      'TierSelection must offer a link to /play/simple'
    );
    assert.ok(
      src.includes("href: '/play/cryptic'"),
      'TierSelection must offer a link to /play/cryptic'
    );
  });

  it('HomePage does not gate rendering on completion state', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    // No conditional rendering based on stats / completion / localStorage
    assert.ok(
      !src.includes('localStorage') &&
        !src.includes('isGameCompleted') &&
        !src.includes('loadStats'),
      'HomePage must not branch on completion state — always show tier selection'
    );
  });

  it('TierSelection shows the daily puzzle number on mount (game start surface)', () => {
    const src = readFileSync(join(root, 'src/components/TierSelection.tsx'), 'utf8');
    assert.ok(
      src.includes('getPuzzleNumber'),
      'TierSelection must surface the current puzzle number'
    );
    assert.ok(
      src.includes("aria-label=\"Daily puzzles\"") ||
        src.includes("aria-label='Daily puzzles'"),
      'TierSelection must expose a Daily puzzles region as the game-start surface'
    );
  });
});

// ---------------------------------------------------------------------------
// AC-FA8-018: No puzzle answer is exposed in URL parameters or page source.
// ---------------------------------------------------------------------------
// The share URL is the bare base domain — no puzzle ID, no answer, no query.
// The HomePage source does not import the card data or game engine, so the
// rendered HTML/JS on "/" cannot leak the day's answer.
// ---------------------------------------------------------------------------
describe('AC-FA8-018: No puzzle answer exposed in URL or page source', () => {
  it('share text URL line is the bare base domain (no query string)', async () => {
    const { generateShareText } = await import('../src/lib/share-grid.mjs');
    const text = generateShareText({
      puzzleNumber: 42,
      tier: 'Simple',
      scoreDisplay: '3/6',
      colorIdentity: ['U'],
      actions: [
        { type: 'pass' },
        { type: 'guess', name: 'Wrong Guess', isCorrect: false },
        { type: 'guess', name: 'Black Lotus', isCorrect: true },
      ],
      baseUrl: 'https://mtgordle.vercel.app',
    });
    const lines = text.split('\n');
    const urlLine = lines[lines.length - 1];
    assert.equal(urlLine, 'mtgordle.vercel.app', 'URL line must be the bare domain');
    assert.ok(!urlLine.includes('?'), 'URL line must contain no query string');
    assert.ok(!urlLine.includes('#'), 'URL line must contain no fragment');
    assert.ok(
      !urlLine.toLowerCase().includes('lotus'),
      'URL line must not contain the answer name'
    );
  });

  it('share text does not embed the correct-guess card name as a URL path', async () => {
    const { generateShareText } = await import('../src/lib/share-grid.mjs');
    const text = generateShareText({
      puzzleNumber: 1,
      tier: 'Cryptic',
      scoreDisplay: '2/6',
      colorIdentity: ['B'],
      actions: [
        { type: 'guess', name: 'Wrong Card', isCorrect: false },
        { type: 'guess', name: 'Sol Ring', isCorrect: true },
      ],
      baseUrl: 'https://mtgordle.vercel.app',
    });
    // The URL line must not be extended with path segments or query params
    // that encode the answer.
    assert.ok(
      !text.toLowerCase().includes('sol+ring') && !text.toLowerCase().includes('sol%20ring'),
      'Share text must not url-encode the answer'
    );
    assert.ok(
      !text.includes('?answer=') && !text.includes('?card=') && !text.includes('?puzzle='),
      'Share text must not embed the answer in query params'
    );
    // The only line containing the answer name is the implicit "guess" action,
    // which share-grid does NOT render. Confirm the card name never reaches
    // the share text output.
    assert.ok(
      !text.includes('Sol Ring'),
      'Share text must not expose the winning guess name anywhere'
    );
  });

  it('share URL line strips protocol (no auth tokens, no credentials in URL)', async () => {
    const { generateShareText } = await import('../src/lib/share-grid.mjs');
    const text = generateShareText({
      puzzleNumber: 7,
      tier: 'Simple',
      scoreDisplay: 'X/6',
      colorIdentity: ['R'],
      actions: [{ type: 'pass' }],
      baseUrl: 'https://mtgordle.vercel.app',
    });
    const lines = text.split('\n');
    const urlLine = lines[lines.length - 1];
    assert.ok(!urlLine.startsWith('http'), 'URL line must have protocol stripped');
    assert.ok(!urlLine.includes('@'), 'URL line must not carry credentials');
  });

  it('HomePage source does not import card data', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      !src.includes('cards.json') &&
        !src.includes('autocomplete-index') &&
        !src.includes("from '@/lib/game-engine'") &&
        !src.includes("from '@/data"),
      'HomePage must not import puzzle/card data — that would leak the answer into the / page bundle'
    );
  });

  it('HomePage source does not call the daily-card selector', () => {
    const src = readFileSync(join(root, 'src/app/page.tsx'), 'utf8');
    assert.ok(
      !src.includes('selectDailyCard') &&
        !src.includes('getCardIndex') &&
        !src.includes('getDailyCard'),
      'HomePage must not resolve the day\'s card — answer resolution belongs in /play/*'
    );
  });

  it('Share URL generation uses BASE_URL only — no answer-bearing parameters', () => {
    const src = readFileSync(join(root, 'src/lib/share-grid.mjs'), 'utf8');
    // The baseUrl is embedded verbatim via stripProtocol. Confirm no template
    // appends puzzle-identifying query params.
    assert.ok(
      !src.includes('?puzzle=') &&
        !src.includes('?answer=') &&
        !src.includes('?card=') &&
        !src.includes('?id='),
      'share-grid.mjs must not append identifying query params to the share URL'
    );
  });

  it('PostSolve passes only BASE_URL (no answer) as baseUrl to generateShareText', () => {
    const src = readFileSync(join(root, 'src/components/PostSolve.tsx'), 'utf8');
    // Look for the generateShareText call and confirm baseUrl is BASE_URL, not
    // something like `${BASE_URL}?answer=${card.name}`.
    const match = src.match(/baseUrl:\s*([^,}\n]+)/);
    assert.ok(match, 'PostSolve must pass baseUrl to generateShareText');
    const baseUrlExpr = match[1].trim();
    assert.equal(
      baseUrlExpr,
      'BASE_URL',
      `baseUrl must be exactly BASE_URL, got: ${baseUrlExpr}`
    );
  });
});
