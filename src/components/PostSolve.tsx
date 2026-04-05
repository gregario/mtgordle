'use client';

import { useState, useRef, useEffect } from 'react';
import type { Card, RoundAction, GameTier, PlayerStats } from '@/types/card';
import type { GameOutcome } from '@/lib/game-engine';
import { getRoundActions } from '@/lib/game-engine';
import { generateShareText } from '@/lib/share-grid';
import { BASE_URL } from '@/config';
import { isPlaceholderLore, formatLoreBlurb, getGenericLoreMessage } from '@/lib/lore-blurb.mjs';
import {
  loadStats,
  saveStats,
  recordGameResult,
  isDuplicateGame,
  getDefaultPlayerStats,
  getWinPercentage,
  saveLastGameResult,
} from '@/lib/stats-engine';
import ScoreDistributionChart from '@/components/ScoreDistributionChart';

const ACTION_COLORS = { gray: '#9ca3af', red: 'var(--color-wrong)', green: 'var(--color-correct)' } as const;

interface PostSolveProps {
  card: Card;
  outcome: GameOutcome;
  roundActions: RoundAction[];
  tier: GameTier;
  tierLabel: string;
  modeLabel: string;
  mode: 'daily' | 'practice';
  puzzleNumber: number;
  onPlayAgain?: () => void;
}

export default function PostSolve({
  card,
  outcome,
  roundActions,
  tier,
  tierLabel,
  modeLabel,
  mode,
  puzzleNumber,
  onPlayAgain,
}: PostSolveProps) {
  const indicators = getRoundActions(roundActions);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stats, setStats] = useState<PlayerStats>(() => getDefaultPlayerStats());

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  // Hydrate stats on mount and record this game's result (daily only).
  // recordGameResult is a no-op for practice mode, but we still load stats
  // so the chart and streaks reflect the player's accumulated history.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storage = window.localStorage;
    const loaded = loadStats(storage);
    const alreadyRecorded =
      mode === 'daily' && isDuplicateGame(loaded, tier, puzzleNumber);

    let next = loaded;
    if (!alreadyRecorded) {
      const guessCount = roundActions.filter((a) => a.type === 'guess').length;
      next = recordGameResult(loaded, {
        tier,
        mode,
        puzzleNumber,
        solved: outcome.won,
        guessCount,
        cluesUsed: roundActions.length,
        completedAt: Date.now(),
      });
      if (next !== loaded) {
        saveStats(next, storage);
      }
    }
    // Save last game result for daily mode so revisits show the completed state
    if (mode === 'daily') {
      saveLastGameResult(tier, {
        puzzleNumber,
        outcome,
        roundActions,
        cardOracleId: card.oracle_id,
      }, storage);
    }
    setStats(next);
  }, [tier, mode, puzzleNumber, outcome.won, roundActions, outcome, card.oracle_id]);

  const tierStats = stats[tier];
  const highlightScore = outcome.won && outcome.score !== null ? String(outcome.score) : 'X';
  const winPct = getWinPercentage(tierStats);

  const handleShare = () => {
    const shareText = generateShareText({
      puzzleNumber,
      tier: tierLabel,
      scoreDisplay: outcome.scoreDisplay,
      colorIdentity: card.color_identity,
      actions: roundActions,
      baseUrl: BASE_URL,
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopyToClipboard(shareText);
      });
    } else {
      fallbackCopyToClipboard(shareText);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed silently — no feedback
    }
    document.body.removeChild(textarea);
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
      {/* AC-FA6-009: Share button is NOT shown in practice mode */}
      {mode !== 'practice' && (
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
      )}

      {/* AC-FA6-008: Play Again button (practice mode only) */}
      {onPlayAgain && (
        <button
          data-testid="play-again-button"
          onClick={onPlayAgain}
          style={{
            padding: '12px 32px',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family)',
            fontWeight: 700,
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          Play Again
        </button>
      )}

      {/* AC-FA6-012: Back to Home link (practice mode only) */}
      {mode === 'practice' && (
        <a
          data-testid="back-to-home"
          href="/"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            textDecoration: 'underline',
          }}
        >
          Back to Home
        </a>
      )}

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

      {/* AC-FA7-001–004: Lore blurb with variable depth formatting */}
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
        {isPlaceholderLore(card.lore_blurb, card.name) ? (
          <p style={{ margin: 0, fontStyle: 'italic' }}>
            {getGenericLoreMessage({ name: card.name, type_line: card.type_line, set_name: card.set_name })}
          </p>
        ) : (
          formatLoreBlurb(card.lore_blurb).map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : '0.5em 0 0 0' }}>
              {para}
            </p>
          ))
        )}
      </div>

      {/* AC-FA4-005 + AC-FA5-015 + AC-FA5-016 + AC-FA5-017: Personal stats below lore */}
      <div
        data-testid="stats-section"
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: 'var(--spacing-md) 0',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 700,
            textAlign: 'center',
            margin: 0,
          }}
        >
          {tierLabel} Statistics
        </h3>

        {/* AC-FA5-015: current streak + max streak (plus played & win%) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--spacing-xs)',
            textAlign: 'center',
          }}
        >
          <StatTile
            testId="stat-games-played"
            value={tierStats.gamesPlayed}
            label="Played"
          />
          <StatTile
            testId="stat-win-percentage"
            value={winPct}
            label="Win %"
          />
          <StatTile
            testId="stat-current-streak"
            value={tierStats.currentStreak}
            label="Current"
          />
          <StatTile
            testId="stat-max-streak"
            value={tierStats.maxStreak}
            label="Max"
          />
        </div>

        {/* AC-FA5-016: score distribution bar chart */}
        <ScoreDistributionChart
          tierStats={tierStats}
          highlightScore={highlightScore}
        />
      </div>
    </div>
  );
}

interface StatTileProps {
  testId: string;
  value: number;
  label: string;
}

function StatTile({ testId, value, label }: StatTileProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        data-testid={testId}
        style={{
          fontSize: 'var(--font-size-xl, 1.75rem)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
    </div>
  );
}
