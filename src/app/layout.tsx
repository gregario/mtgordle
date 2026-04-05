import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'MTGordle — Daily Magic: The Gathering Card Guessing Game',
  description:
    'Guess the daily Magic: The Gathering card from progressive clues. Two tiers: Simple (iconic cards) and Cryptic (deep cuts).',
  keywords: ['MTG', 'Magic the Gathering', 'Wordle', 'card game', 'daily puzzle'],
  openGraph: {
    title: 'MTGordle',
    description: 'Daily MTG card guessing game',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
