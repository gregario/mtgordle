'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPuzzleNumber } from '@/config';

interface TierOption {
  id: string;
  label: string;
  puzzleLabel: string;
  href: string;
  description: string;
}

function buildTierOptions(puzzleNumber: number): TierOption[] {
  return [
    {
      id: 'simple',
      label: 'Simple',
      puzzleLabel: `Simple #${puzzleNumber}`,
      href: '/play/simple',
      description: 'Iconic cards — great for casual fans',
    },
    {
      id: 'cryptic',
      label: 'Cryptic',
      puzzleLabel: `Cryptic #${puzzleNumber}`,
      href: '/play/cryptic',
      description: 'Deep cuts — for the enfranchised',
    },
  ];
}

export default function TierSelection() {
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);

  useEffect(() => {
    setPuzzleNumber(getPuzzleNumber());
  }, []);

  // Avoid hydration mismatch — render placeholder until client mounts
  if (puzzleNumber === null) {
    return null;
  }

  const dailyOptions = buildTierOptions(puzzleNumber);

  return (
    <>
      <section aria-label="Daily puzzles" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          Today&apos;s Puzzles
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {dailyOptions.map((option) => (
            <Link
              key={option.id}
              href={option.href}
              style={{
                display: 'block',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: 'var(--shadow-sm)',
                transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                  }}
                >
                  {option.puzzleLabel}
                </span>
              </div>
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-muted)',
                  marginTop: 'var(--spacing-xs)',
                }}
              >
                {option.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Practice mode" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link
          href="/play/practice"
          style={{
            display: 'block',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            color: 'inherit',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
            Practice
          </span>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            Unlimited rounds with separate card pools
          </p>
        </Link>
      </section>
    </>
  );
}
