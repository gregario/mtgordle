import Link from 'next/link';
import Layout from '@/components/Layout';
import TierSelection from '@/components/TierSelection';

export default function HomePage() {
  return (
    <Layout>
      <header style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-accent)' }}>
          MTGordle
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--spacing-sm)' }}>
          Name the card as the clues build up
        </p>
      </header>

      <main style={{ padding: '0 var(--spacing-md)', flex: 1 }}>
        <TierSelection />
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: 'var(--spacing-lg) 0',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'auto',
        }}
      >
        <Link
          href="/terms"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          Terms &amp; Legal
        </Link>
      </footer>
    </Layout>
  );
}
