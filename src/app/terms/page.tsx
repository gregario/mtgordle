import Layout from '@/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <header style={{ padding: 'var(--spacing-xl) 0 var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>Terms &amp; Legal</h1>
      </header>

      <main>
        <section style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
            Fan-Made Game — Not Affiliated with Wizards of the Coast
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
            MTGordle is an unofficial fan-made game. It is not produced by, endorsed by, or
            affiliated with Wizards of the Coast LLC or Hasbro, Inc.
          </p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
            Magic: The Gathering, the mana symbols, card names, card art, flavor text, and all
            related intellectual property are trademarks and/or copyrights of Wizards of the Coast
            LLC. Card images and data are sourced from{' '}
            <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer">
              Scryfall
            </a>{' '}
            under their{' '}
            <a
              href="https://scryfall.com/docs/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              bulk data API
            </a>
            .
          </p>
        </section>

        <section style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
            No Affiliation with Wordle
          </h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            MTGordle is inspired by Wordle (The New York Times Company) but is not affiliated with
            or endorsed by The New York Times Company. &quot;Wordle&quot; is a trademark of The New
            York Times Company.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
            Privacy
          </h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            MTGordle stores all game state locally in your browser&apos;s localStorage. No personal
            data is collected or transmitted to any server. No cookies are used beyond what your
            browser may set automatically.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
            Disclaimer
          </h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This game is provided &quot;as is&quot; without warranty of any kind. The puzzle
            schedule and card pool may change at any time.
          </p>
        </section>
      </main>
    </Layout>
  );
}
