'use client';

/**
 * GameBoard — main game screen component for MTGordle.
 *
 * Loads the correct daily card, manages round state, renders the
 * CardFrame with progressive clue reveals, guess input with fuzzy
 * autocomplete, and the round indicator.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Card, GameTier } from '@/types/card';
import { getPuzzleNumber, getCardIndex } from '@/config';
import { filterCardsByPool } from '@/lib/game-engine';
import CardFrame from '@/components/CardFrame';
import GuessInput from '@/components/GuessInput';
import { validateGuess } from '@/lib/guess-validator.mjs';

interface GameBoardProps {
  tier: GameTier;
  mode: 'daily' | 'practice';
}

export default function GameBoard({ tier, mode }: GameBoardProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [poolCards, setPoolCards] = useState<Card[]>([]);
  const [round, setRound] = useState(1);
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    async function loadCard() {
      try {
        const res = await fetch('/data/card-details.json');
        if (!res.ok) throw new Error(`Failed to load card data: ${res.status}`);
        const allCards: Card[] = await res.json();
        const filtered = filterCardsByPool(allCards, tier, mode);

        if (filtered.length === 0) {
          throw new Error(`No cards found for pool: ${tier}-${mode}`);
        }

        setPoolCards(filtered);

        let selectedCard: Card;
        if (mode === 'daily') {
          const pNum = getPuzzleNumber();
          const cIdx = getCardIndex(pNum);
          setPuzzleNumber(pNum);
          selectedCard = filtered[cIdx % filtered.length];
        } else {
          // Practice: random card
          const randomIdx = Math.floor(Math.random() * filtered.length);
          selectedCard = filtered[randomIdx];
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

  const handleGuess = useCallback((guessName: string) => {
    if (!card || round > 6) return;

    const result = validateGuess(guessName, card);
    setGuessResult(result.isCorrect ? 'correct' : 'wrong');

    if (result.isCorrect) {
      // Win — reveal all clues
      setRound(6);
    } else {
      // Wrong guess — advance to next round (reveal next clue)
      setRound(r => Math.min(r + 1, 6));
    }

    // Clear the result flash after a short delay
    setTimeout(() => setGuessResult(null), 1200);
  }, [card, round]);

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

      {/* ── Guess result feedback ─────────────────────────────────── */}
      {guessResult && (
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            textAlign: 'center',
            color: '#fff',
            backgroundColor: guessResult === 'correct' ? 'var(--color-correct)' : 'var(--color-wrong)',
            transition: 'opacity 0.3s ease',
          }}
        >
          {guessResult === 'correct' ? 'Correct!' : 'Wrong — next clue revealed'}
        </div>
      )}

      {/* ── Guess input ───────────────────────────────────────────── */}
      <GuessInput
        poolCards={poolCards}
        onGuess={handleGuess}
        disabled={round >= 6}
        placeholder={round >= 6 ? 'Game over' : 'Type a card name...'}
      />
    </div>
  );
}
