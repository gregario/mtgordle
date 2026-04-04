import Layout from '@/components/Layout';
import GameBoard from '@/components/GameBoard';
import Link from 'next/link';

export default function PracticeGamePage() {
  return (
    <Layout>
      <main style={{ padding: 'var(--spacing-md) 0 var(--spacing-xl)' }}>
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <Link
            href="/"
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            ← Back
          </Link>
        </div>
        <GameBoard tier="simple" mode="practice" />
      </main>
    </Layout>
  );
}
