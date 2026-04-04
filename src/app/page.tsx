import Layout from '@/components/Layout';

export default function HomePage() {
  return (
    <Layout>
      <header style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--color-accent)' }}>
          MTGordle
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--spacing-sm)' }}>
          Daily Magic: The Gathering card guessing game
        </p>
      </header>

      <main style={{ padding: 'var(--spacing-md)' }}>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Coming soon — guess the daily card from progressive clues.
        </p>
      </main>
    </Layout>
  );
}
