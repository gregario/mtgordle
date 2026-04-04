'use client';

/**
 * GameBoard — main game screen component for MTGordle.
 *
 * Loads the correct daily card, manages round state, renders the
 * CardFrame with progressive clue reveals, and shows the round indicator.
 *
 * This story implements the clue-progression-engine only (no guess input,
 * no pass mechanic, no win/lose detection — those are separate stories).
 * For now, a "Next Clue" button advances rounds for testing.
 */

import React, { useState, useEffect } from 'react';
import type { Card, GameTier } from '@/types/card';
import { getPuzzleNumber, getCardIndex } from '@/config';
import { filterCardsByPool } from '@/lib/game-engine';
import CardFrame from '@/components/CardFrame';

interface GameBoardProps {
  tier: GameTier;
  mode: 'daily' | 'practice';
}

export default function GameBoard({ tier, mode }: GameBoardProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [round, setRound] = useState(1);
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCard() {
      try {
        const res = await fetch('/data/card-details.json');
        if (!res.ok) throw new Error(`Failed to load card data: ${res.status}`);
        const allCards: Card[] = await res.json();
        const poolCards = filterCardsByPool(allCards, tier, mode);

        if (poolCards.length === 0) {
          throw new Error(`No cards found for pool: ${tier}-${mode}`);
        }

        let selectedCard: Card;
        if (mode === 'daily') {
          const pNum = getPuzzleNumber();
          const cIdx = getCardIndex(pNum);
          setPuzzleNumber(pNum);
          selectedCard = poolCards[cIdx % poolCards.length];
        } else {
          // Practice: random card
          const randomIdx = Math.floor(Math.random() * poolCards.length);
          selectedCard = poolCards[randomIdx];
          setPuzzleNumber(-1);
        }

        setCard(selectedCard);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }
    loadCard();
  }, [tier, mode]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading puzzle...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
        <p style={{ color: 'var(--color-wrong)' }}>{error ?? 'Failed to load card'}</p>
      </div>
    );
  }

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const modeLabel = mode === 'practice' ? 'Practice' : `#${puzzleNumber}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 600,
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          {tierLabel} {modeLabel}
        </h2>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          Round {round} of 6
        </p>
      </div>

      {/* ── Card frame ─────────────────────────────────────────── */}
      <CardFrame card={card} round={round} />

      {/* ── Round indicator dots ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((r) => (
          <div
            key={r}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: r <= round ? 'var(--color-accent)' : 'var(--color-border)',
              transition: 'background-color 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* ── Temporary: advance round button (will be replaced by guess/pass) ─ */}
      {round < 6 && (
        <button
          onClick={() => setRound(r => Math.min(r + 1, 6))}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Next Clue →
        </button>
      )}
    </div>
  );
}
