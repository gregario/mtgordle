/**
 * MTGordle — Dark/Light Auto Theming tests (FA8)
 *
 * Covers:
 *   AC-FA8-001: Theme auto-detects from prefers-color-scheme media query
 *   AC-FA8-002: Dark mode has WCAG AA contrast ratios (>= 4.5:1 body text)
 *   AC-FA8-003: Light mode has WCAG AA contrast ratios (>= 4.5:1 body text)
 *   AC-FA8-004: Card frame uses themed tokens (renders correctly in both themes)
 *
 * Run with: node --test tests/theme-contrast.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GLOBALS_CSS = path.join(ROOT, 'src', 'app', 'globals.css');
const CARD_FRAME = path.join(ROOT, 'src', 'components', 'CardFrame.tsx');

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{1,2}/g);
  if (!m || m.length !== 3) throw new Error(`Bad hex: ${hex}`);
  return m.map((h) => parseInt(h, 16));
}

// WCAG 2.1 relative luminance
function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse a CSS block (e.g. `:root { ... }`) and extract `--var: value;`
 * Returns { '--color-bg': '#f5f0e8', ... }
 */
function parseCssBlock(css, blockSelectorRegex) {
  const match = css.match(blockSelectorRegex);
  if (!match) return null;
  const body = match[1];
  const tokens = {};
  const re = /(--[a-z0-9-]+):\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function readCss() {
  return fs.readFileSync(GLOBALS_CSS, 'utf8');
}

// ─── AC-FA8-001: prefers-color-scheme media query ───────────────────────────

describe('Theme auto-detection (AC-FA8-001)', () => {
  test('[AC-FA8-001] globals.css declares @media (prefers-color-scheme: dark)', () => {
    const css = readCss();
    assert.ok(
      /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/i.test(css),
      'globals.css must contain @media (prefers-color-scheme: dark) for auto theming'
    );
  });

  test('[AC-FA8-001] dark media query overrides :root CSS custom properties', () => {
    const css = readCss();
    // The dark block must target :root (or html) inside the media query
    const darkBlock = css.match(
      /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{\s*:root\s*\{/i
    );
    assert.ok(
      darkBlock,
      'dark @media block must override :root tokens so theme applies globally'
    );
  });
});

// ─── Light & Dark token extraction ──────────────────────────────────────────

function getLightTokens() {
  const css = readCss();
  // First `:root { ... }` outside of a media query
  // Strip the dark media block first to avoid matching the nested :root inside it
  const noDark = css.replace(
    /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[\s\S]*?\n\}/i,
    ''
  );
  return parseCssBlock(noDark, /:root\s*\{([\s\S]*?)\}/);
}

function getDarkTokens() {
  const css = readCss();
  const darkMatch = css.match(
    /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?)\n\}/i
  );
  if (!darkMatch) return null;
  return parseCssBlock(darkMatch[1], /:root\s*\{([\s\S]*?)\}/);
}

// ─── AC-FA8-003: Light mode WCAG AA contrast ───────────────────────────────

describe('Light mode contrast ratios (AC-FA8-003)', () => {
  const light = getLightTokens();

  test('[AC-FA8-003] light token block parses and contains required color tokens', () => {
    assert.ok(light, ':root light tokens must parse from globals.css');
    for (const k of ['--color-bg', '--color-surface', '--color-text', '--color-text-muted', '--color-border']) {
      assert.ok(light[k], `light theme missing token ${k}`);
    }
  });

  test('[AC-FA8-003] text on bg meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(light['--color-text'], light['--color-bg']);
    assert.ok(ratio >= 4.5, `text on bg contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-003] text on surface meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(light['--color-text'], light['--color-surface']);
    assert.ok(ratio >= 4.5, `text on surface contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-003] muted text on bg meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(light['--color-text-muted'], light['--color-bg']);
    assert.ok(ratio >= 4.5, `muted text on bg contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-003] muted text on surface meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(light['--color-text-muted'], light['--color-surface']);
    assert.ok(ratio >= 4.5, `muted text on surface contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });
});

// ─── AC-FA8-002: Dark mode WCAG AA contrast ────────────────────────────────

describe('Dark mode contrast ratios (AC-FA8-002)', () => {
  const dark = getDarkTokens();

  test('[AC-FA8-002] dark token block parses and contains required color tokens', () => {
    assert.ok(dark, 'dark @media :root tokens must parse from globals.css');
    for (const k of ['--color-bg', '--color-surface', '--color-text', '--color-text-muted', '--color-border']) {
      assert.ok(dark[k], `dark theme missing token ${k}`);
    }
  });

  test('[AC-FA8-002] text on bg meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(dark['--color-text'], dark['--color-bg']);
    assert.ok(ratio >= 4.5, `text on bg contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-002] text on surface meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(dark['--color-text'], dark['--color-surface']);
    assert.ok(ratio >= 4.5, `text on surface contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-002] muted text on bg meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(dark['--color-text-muted'], dark['--color-bg']);
    assert.ok(ratio >= 4.5, `muted text on bg contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-002] muted text on surface meets WCAG AA (>= 4.5:1)', () => {
    const ratio = contrastRatio(dark['--color-text-muted'], dark['--color-surface']);
    assert.ok(ratio >= 4.5, `muted text on surface contrast is ${ratio.toFixed(2)}:1, need >= 4.5:1`);
  });

  test('[AC-FA8-002] accent color meets WCAG AA for large text on bg (>= 3:1)', () => {
    const dark = getDarkTokens();
    const ratio = contrastRatio(dark['--color-accent'], dark['--color-bg']);
    assert.ok(ratio >= 3.0, `accent on bg contrast is ${ratio.toFixed(2)}:1, need >= 3:1 for large text/links`);
  });
});

// ─── AC-FA8-004: Card frame uses themed tokens ─────────────────────────────

describe('Card frame themes via tokens (AC-FA8-004)', () => {
  const cardFrameSrc = fs.readFileSync(CARD_FRAME, 'utf8');

  test('[AC-FA8-004] CardFrame.tsx uses --color-surface (theme-aware background)', () => {
    assert.ok(
      /var\(--color-surface\)/.test(cardFrameSrc),
      'CardFrame must use var(--color-surface) so background adapts to theme'
    );
  });

  test('[AC-FA8-004] CardFrame.tsx uses --color-text-muted (theme-aware muted text)', () => {
    assert.ok(
      /var\(--color-text-muted\)/.test(cardFrameSrc),
      'CardFrame must use var(--color-text-muted) so muted text adapts to theme'
    );
  });

  test('[AC-FA8-004] CardFrame.tsx uses --color-border (theme-aware borders)', () => {
    assert.ok(
      /var\(--color-border\)/.test(cardFrameSrc),
      'CardFrame must use var(--color-border) for at least one border so it adapts to theme'
    );
  });

  test('[AC-FA8-004] CardFrame.tsx uses --shadow-md (theme-aware shadow)', () => {
    assert.ok(
      /var\(--shadow-md\)/.test(cardFrameSrc),
      'CardFrame should use var(--shadow-md) so shadow strength adapts per theme'
    );
  });

  test('[AC-FA8-004] CardFrame.tsx does not hardcode raw hex colors for chrome', () => {
    // Card art border color is derived from MTG color identity (getCardBorderColor),
    // which is a design choice, not a theme token. But the *frame chrome* (background,
    // borders between regions, muted text) must route through CSS custom properties.
    // Guard: no #xxxxxx literals used as `backgroundColor` or `color` values in JSX.
    const backgroundHex = cardFrameSrc.match(/backgroundColor:\s*['"]#[0-9a-fA-F]{3,8}['"]/);
    assert.equal(
      backgroundHex,
      null,
      `CardFrame must not hardcode backgroundColor hex: ${backgroundHex?.[0] ?? ''}`
    );
    const colorHex = cardFrameSrc.match(/[^\-]color:\s*['"]#[0-9a-fA-F]{3,8}['"]/);
    assert.equal(
      colorHex,
      null,
      `CardFrame must not hardcode color hex: ${colorHex?.[0] ?? ''}`
    );
  });

  test('[AC-FA8-004] both themes define --shadow-md (card shadow adapts per theme)', () => {
    const light = getLightTokens();
    const dark = getDarkTokens();
    assert.ok(light['--shadow-md'], 'light theme must define --shadow-md');
    assert.ok(dark['--shadow-md'], 'dark theme must define --shadow-md');
    assert.notStrictEqual(
      light['--shadow-md'],
      dark['--shadow-md'],
      'light and dark --shadow-md should differ (stronger shadow on dark bg)'
    );
  });
});
