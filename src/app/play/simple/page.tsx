import Layout from '@/components/Layout';
import Link from 'next/link';

export default function SimpleGamePage() {
  return (
    <Layout>
      <main style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-md)' }}>
          Simple — Daily Puzzle
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          Game board coming soon.
        </p>
        <Link href="/" style={{ color: 'var(--color-accent)' }}>
          ← Back to Home
        </Link>
      </main>
    </Layout>
  );
}
