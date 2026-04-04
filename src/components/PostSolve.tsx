'use client';

import { useState } from 'react';
import type { Card, RoundAction } from '@/types/card';
import type { GameOutcome } from '@/lib/game-engine';
import { getRoundActions } from '@/lib/game-engine';
import { generateShareText } from '@/lib/share-grid';

const ACTION_COLORS = { gray: '#9ca3af', red: 'var(--color-wrong)', green: 'var(--color-correct)' } as const;

interface PostSolveProps {
  card: Card;
  outcome: GameOutcome;
  roundActions: RoundAction[];
  tierLabel: string;
  modeLabel: string;
  mode: 'daily' | 'practice';
  puzzleNumber: number;
}

export default function PostSolve({ card, outcome, roundActions, tierLabel, modeLabel, mode, puzzleNumber }: PostSolveProps) {
  const indicators = getRoundActions(roundActions);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareText = generateShareText({
      puzzleNumber,
      tier: tierLabel,
      scoreDisplay: outcome.scoreDisplay,
      colorIdentity: card.color_identity,
      actions: roundActions,
    });
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      data-testid="post-solve"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: 'var(--font-size-xl, 2rem)',
          fontWeight: 700,
        }}
      >
        {tierLabel} {modeLabel}
      </h2>

      {/* AC-FA4-001: Score displayed prominently at top */}
      <div
        data-testid="score-display"
        style={{
          fontSize: '3rem',
          fontWeight: 800,
          color: outcome.won ? 'var(--color-correct)' : 'var(--color-wrong)',
        }}
      >
        {outcome.scoreDisplay}
      </div>

      <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
        {outcome.won ? 'You got it!' : 'Better luck next time'}
      </p>
      <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-muted)' }}>
        The answer was <strong>{card.name}</strong>
      </p>

      {/* Round history dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {indicators.map((action, i) => (
          <div
            key={i}
            title={action.type}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: ACTION_COLORS[action.color],
            }}
          />
        ))}
      </div>

      {/* AC-FA4-002: Share button immediately below score, above fold */}
      <button
        data-testid="share-button"
        onClick={handleShare}
        style={{
          padding: '12px 32px',
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family)',
          fontWeight: 700,
          backgroundColor: 'var(--color-accent, #6366f1)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '300px',
        }}
      >
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* AC-FA4-003: Card art displayed large below share button */}
      <div
        data-testid="card-art"
        style={{ maxWidth: '300px', width: '100%' }}
      >
        <img
          src={card.image_uri}
          alt={card.name}
          style={{ width: '100%', borderRadius: 'var(--radius-lg, 12px)' }}
        />
      </div>

      {/* AC-FA4-004: Lore blurb displayed below card art */}
      <div
        data-testid="lore-blurb"
        style={{
          maxWidth: '380px',
          width: '100%',
          textAlign: 'left',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
        }}
      >
        {card.lore_blurb}
      </div>

      {/* AC-FA4-005: Personal stats section below lore blurb */}
      <div
        data-testid="stats-section"
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: 'var(--spacing-md) 0',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <p>Stats coming soon</p>
      </div>
    </div>
  );
}
