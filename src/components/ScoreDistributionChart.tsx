import type { TierStats } from '@/types/card';
import { computeDistributionRows } from '@/lib/score-distribution';

interface ScoreDistributionChartProps {
  tierStats: Pick<TierStats, 'guessDistribution' | 'gamesPlayed' | 'gamesWon'>;
  /** The label to highlight (e.g. "3" for a 3/6 win, "X" for a loss, or null for no highlight). */
  highlightScore: string | null;
}

export default function ScoreDistributionChart({
  tierStats,
  highlightScore,
}: ScoreDistributionChartProps) {
  const rows = computeDistributionRows({
    guessDistribution: tierStats.guessDistribution,
    gamesPlayed: tierStats.gamesPlayed,
    gamesWon: tierStats.gamesWon,
  });

  if (rows.isEmpty) {
    return (
      <div
        data-testid="score-distribution-chart"
        data-empty="true"
        style={{
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        No games played yet
      </div>
    );
  }

  return (
    <div
      data-testid="score-distribution-chart"
      role="img"
      aria-label="Personal score distribution"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xs)',
      }}
    >
      {rows.map((row) => {
        const highlighted = highlightScore === row.label;
        return (
          <div
            key={row.label}
            data-highlighted={highlighted ? 'true' : 'false'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <span
              style={{
                width: '1.25em',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--color-text-muted)',
              }}
            >
              {row.label}
            </span>
            <div
              style={{
                flex: 1,
                height: '1.25rem',
                background: 'transparent',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${Math.max(row.widthPercent, row.count > 0 ? 8 : 0)}%`,
                  height: '100%',
                  background: highlighted
                    ? 'var(--color-correct)'
                    : 'var(--color-pass)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 'var(--spacing-sm)',
                  color: '#fff',
                  fontWeight: 600,
                  minWidth: row.count > 0 ? '1.5rem' : 0,
                  transition: 'width 0.3s ease',
                }}
              >
                {row.count > 0 ? row.count : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
