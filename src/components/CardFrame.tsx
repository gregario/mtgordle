'use client';

/**
 * CardFrame — CSS card frame that progressively reveals clues.
 *
 * Maintains MTG card proportions (63:88 ratio) and fills regions as
 * the player progresses through rounds 1–6.
 *
 * Layout (top to bottom):
 * - Mana cost bar (round 1)
 * - Art region (round 6)
 * - Type line (round 2)
 * - Text box upper: rules text (round 4)
 * - Text box lower: flavor text / artist (round 5)
 * - Footer: rarity + set era (round 3)
 */

import React from 'react';
import type { Card } from '@/types/card';
import { ManaCost } from '@/components/ManaSymbol';
import { getVisibleClues, getCardBorderColor, getCardFrameGradient, getRound5Content } from '@/lib/game-engine';

interface CardFrameProps {
  card: Card;
  round: number; // 0-6
}

export default function CardFrame({ card, round }: CardFrameProps) {
  const visible = getVisibleClues(round);
  const borderColor = getCardBorderColor(card.color_identity);
  const emptyGradient = getCardFrameGradient(card.color_identity);
  const round5 = getRound5Content(card);

  return (
    <div
      className="card-frame"
      style={{
        width: '100%',
        maxWidth: '315px',
        aspectRatio: '63 / 88',
        margin: '0 auto',
        border: `3px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
      }}
    >
      {/* ── Mana cost bar (Round 1) ───────────────────────────────── */}
      <div
        style={{
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}44`,
          minHeight: '40px',
          background: visible.manaCost ? undefined : emptyGradient,
        }}
      >
        {visible.manaCost ? (
          <>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
              }}
            >
              {card.color_identity.length > 0
                ? card.color_identity.join(', ')
                : 'Colorless'}
            </span>
            <ManaCost cost={card.mana_cost} size={20} gap={2} />
          </>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            ?
          </span>
        )}
      </div>

      {/* ── Art region (Round 6) ──────────────────────────────────── */}
      <div
        style={{
          flex: '1 1 40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: visible.cardArt ? undefined : emptyGradient,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {visible.cardArt ? (
          <img
            src={card.art_crop_uri}
            alt={`Art for ${card.name}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span
            style={{
              color: `${borderColor}66`,
              fontSize: '2rem',
              fontWeight: 700,
              userSelect: 'none',
            }}
          >
            ?
          </span>
        )}
      </div>

      {/* ── Type line (Round 2) ───────────────────────────────────── */}
      <div
        style={{
          padding: '6px 10px',
          borderTop: `1px solid ${borderColor}44`,
          borderBottom: `1px solid ${borderColor}44`,
          minHeight: '30px',
          display: 'flex',
          alignItems: 'center',
          background: visible.typeLine ? undefined : emptyGradient,
        }}
      >
        {visible.typeLine ? (
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
            {card.type_line}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            ?
          </span>
        )}
      </div>

      {/* ── Text box (Rules text round 4, Flavor/artist round 5) ── */}
      <div
        style={{
          flex: '1 1 30%',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 10px',
          gap: '6px',
          overflow: 'auto',
        }}
      >
        {/* Rules text (round 4) */}
        <div
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'flex-start',
            background: visible.rulesText ? undefined : emptyGradient,
            borderRadius: 'var(--radius-sm)',
            padding: visible.rulesText ? '0' : '6px',
            minHeight: '2em',
          }}
        >
          {visible.rulesText ? (
            <span style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.4 }}>
              {card.oracle_text_first_line}
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              ?
            </span>
          )}
        </div>

        {/* Flavor text or artist (round 5) */}
        <div
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'flex-start',
            background: visible.flavorArtist ? undefined : emptyGradient,
            borderRadius: 'var(--radius-sm)',
            padding: visible.flavorArtist ? '0' : '6px',
            minHeight: '2em',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '6px',
          }}
        >
          {visible.flavorArtist ? (
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                fontStyle: round5.type === 'flavor' ? 'italic' : 'normal',
                color: round5.type === 'artist' ? 'var(--color-text-muted)' : undefined,
                lineHeight: 1.4,
              }}
            >
              {round5.text}
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              ?
            </span>
          )}
        </div>
      </div>

      {/* ── Footer: Rarity + Set Era (Round 3) ────────────────────── */}
      <div
        style={{
          padding: '6px 10px',
          borderTop: `1px solid ${borderColor}44`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '28px',
          background: visible.raritySetEra ? undefined : emptyGradient,
        }}
      >
        {visible.raritySetEra ? (
          <>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                fontWeight: 600,
              }}
            >
              {card.rarity}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {card.set_era}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            ?
          </span>
        )}
      </div>
    </div>
  );
}
