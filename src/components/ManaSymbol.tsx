'use client';

/**
 * ManaSymbol — renders a single MTG mana symbol as an inline SVG circle.
 *
 * Foundation shared component. Used in:
 * - Round 1 clue (mana cost / color identity reveal)
 * - Card frame decorations
 * - Post-solve share grid (via colorIdentityEmoji utility)
 *
 * Symbols are rendered as coloured circles with text labels, matching the
 * visual convention of MTG mana symbols without requiring any external font
 * or asset. Visual refinement happens in the visual-polish-theming milestone.
 *
 * Usage:
 *   <ManaSymbol token="U" size={24} />
 *   <ManaCost cost="{2}{U}{B}" size={20} />
 */

import React from 'react';
import { parseMana, tokenCategory } from '@/lib/mana';

// ─── Token appearance ─────────────────────────────────────────────────────────

interface SymbolStyle {
  fill: string;
  stroke: string;
  textFill: string;
  label: (token: string) => string;
}

const SYMBOL_STYLES: Record<string, SymbolStyle> = {
  W: { fill: '#f9f6ee', stroke: '#c8c4b0', textFill: '#4a4530', label: () => 'W' },
  U: { fill: '#0e68ab', stroke: '#0a4d80', textFill: '#ffffff', label: () => 'U' },
  B: { fill: '#1a1a1a', stroke: '#444444', textFill: '#ffffff', label: () => 'B' },
  R: { fill: '#d3202a', stroke: '#a01018', textFill: '#ffffff', label: () => 'R' },
  G: { fill: '#00733e', stroke: '#005530', textFill: '#ffffff', label: () => 'G' },
  C: { fill: '#c0c0c0', stroke: '#999999', textFill: '#333333', label: () => 'C' },
  X: { fill: '#888888', stroke: '#666666', textFill: '#ffffff', label: () => 'X' },
};

const GENERIC_STYLE: SymbolStyle = {
  fill: '#c8a85a',
  stroke: '#9a7e3a',
  textFill: '#3a2e10',
  label: (token) => token,
};

const HYBRID_STYLE: SymbolStyle = {
  fill: '#d4a843',
  stroke: '#9a7e3a',
  textFill: '#3a2e10',
  label: (token) => {
    // {W/U} → show both sides split by /
    const parts = token.split('/');
    return parts[0] + '/' + parts[1];
  },
};

const PHYREXIAN_STYLE: SymbolStyle = {
  fill: '#6b0f1a',
  stroke: '#4a0a12',
  textFill: '#ffffff',
  label: (token) => {
    const parts = token.split('/');
    return parts[0] + 'φ';
  },
};

function getStyle(token: string): SymbolStyle {
  if (SYMBOL_STYLES[token]) return SYMBOL_STYLES[token];
  const cat = tokenCategory(token);
  if (cat === 'generic') return GENERIC_STYLE;
  if (cat === 'hybrid') return HYBRID_STYLE;
  if (cat === 'phyrexian') return PHYREXIAN_STYLE;
  return GENERIC_STYLE;
}

// ─── Components ──────────────────────────────────────────────────────────────

interface ManaSymbolProps {
  /** A single mana token, e.g. 'U', '2', 'W/U' */
  token: string;
  /** Diameter in pixels (default: 24) */
  size?: number;
  className?: string;
}

/**
 * Renders a single mana symbol as an SVG circle.
 */
export function ManaSymbol({ token, size = 24, className }: ManaSymbolProps) {
  const style = getStyle(token);
  const r = size / 2;
  const label = style.label(token);
  // Scale font to fit: longer labels get smaller text
  const fontSize = label.length > 2 ? size * 0.28 : size * 0.38;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Mana symbol: ${token}`}
      role="img"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={size > 16 ? 1.5 : 1}
      />
      <text
        x={r}
        y={r + fontSize * 0.38}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill={style.textFill}
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>
    </svg>
  );
}

interface ManaCostProps {
  /**
   * Scryfall mana cost string, e.g. '{2}{U}{B}'.
   * Pass null/undefined for colorless/no cost.
   */
  cost: string | null | undefined;
  /** Symbol diameter in pixels (default: 24) */
  size?: number;
  /** Gap between symbols in pixels (default: 2) */
  gap?: number;
  className?: string;
}

/**
 * Renders a full mana cost string as a row of ManaSymbol SVGs.
 *
 * @example
 * <ManaCost cost="{2}{U}{B}" size={20} />
 */
export function ManaCost({ cost, size = 24, gap = 2, className }: ManaCostProps) {
  const tokens = parseMana(cost);
  if (tokens.length === 0) return null;

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap }}
      aria-label={`Mana cost: ${cost}`}
    >
      {tokens.map((token, i) => (
        <ManaSymbol key={`${token}-${i}`} token={token} size={size} />
      ))}
    </span>
  );
}
