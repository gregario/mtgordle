'use client';

/**
 * GameBoard — main game screen component for MTGordle.
 *
 * Loads the correct daily card, manages round state, renders the
 * CardFrame with progressive clue reveals, guess input with fuzzy
 * autocomplete, and the round indicator.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, GameTier, RoundAction } from '@/types/card';
import { getPuzzleNumber, getCardIndex } from '@/config';
import { filterCardsByPool, canPass, applyPass, applyGuess, getRoundActions, isGameOver, getGameOutcome } from '@/lib/game-engine';
import type { GameOutcome } from '@/lib/game-engine';
import CardFrame from '@/components/CardFrame';
import GuessInput from '@/components/GuessInput';
import PostSolve from '@/components/PostSolve';
import { validateGuess } from '@/lib/guess-validator.mjs';

const ACTION_COLORS = { gray: '#9ca3af', red: 'var(--color-wrong)', green: 'var(--color-correct)' } as const;

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
  const [roundActions, setRoundActions] = useState<RoundAction[]>([]);
  const [solved, setSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);

  const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (gameOverTimeoutRef.current) clearTimeout(gameOverTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

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
    if (!card || gameOver) return;

    const result = validateGuess(guessName, card);
    setGuessResult(result.isCorrect ? 'correct' : 'wrong');

    const applied = applyGuess(round, roundActions, guessName, result.isCorrect);
    setRound(applied.nextRound);
    setRoundActions(applied.actions);

    if (result.isCorrect) {
      setSolved(true);
    }

    // Check if game is over after this action
    const over = isGameOver(applied.nextRound, applied.actions, result.isCorrect);
    if (over) {
      const gameOutcome = getGameOutcome(applied.actions);
      setOutcome(gameOutcome);
      // Delay transition so feedback flash is visible
      gameOverTimeoutRef.current = setTimeout(() => setGameOver(true), 1200);
    } else {
      // Clear the result flash after a short delay
      flashTimeoutRef.current = setTimeout(() => setGuessResult(null), 1200);
    }
  }, [card, round, roundActions, gameOver]);

  const handlePass = useCallback(() => {
    if (!canPass(round, solved)) return;

    const applied = applyPass(round, roundActions);
    setRound(applied.nextRound);
    setRoundActions(applied.actions);
  }, [round, roundActions, solved]);

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

  if (gameOver && outcome) {
    return (
      <PostSolve
        card={card}
        outcome={outcome}
        roundActions={roundActions}
        tierLabel={tierLabel}
        modeLabel={modeLabel}
        mode={mode}
        puzzleNumber={puzzleNumber ?? 0}
      />
    );
  }

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

      {/* ── Round indicator dots with action history (AC-FA1-021) ── */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'center',
        }}
      >
        {(() => {
          const indicators = getRoundActions(roundActions);
          return [1, 2, 3, 4, 5, 6].map((r) => {
            const action = indicators[r - 1];
            let bg: string;
            if (action) {
              bg = ACTION_COLORS[action.color];
            } else if (r === round) {
              bg = 'var(--color-accent)';
            } else {
              bg = 'var(--color-border)';
            }
            return (
              <div
                key={r}
                title={action ? action.type : r === round ? 'current' : ''}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: bg,
                  transition: 'background-color 0.2s ease',
                }}
              />
            );
          });
        })()}
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

      {/* ── Guess input + pass button (AC-FA1-017, AC-FA1-019) ──── */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start', width: '100%', maxWidth: '420px', justifyContent: 'center' }}>
        <GuessInput
          poolCards={poolCards}
          onGuess={handleGuess}
          disabled={gameOver || solved}
          placeholder={solved ? 'Solved!' : gameOver ? 'Game over' : 'Type a card name...'}
        />
        {canPass(round, solved) && (
          <button
            onClick={handlePass}
            aria-label="Pass this round"
            style={{
              padding: '12px 16px',
              fontSize: 'var(--font-size-base)',
              fontFamily: 'var(--font-family)',
              fontWeight: 600,
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s ease, color 0.15s ease',
            }}
          >
            Pass
          </button>
        )}
      </div>
    </div>
  );
}
