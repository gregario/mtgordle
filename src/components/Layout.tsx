import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Base layout component.
 * Centered column, max-width 480px, auto horizontal margins, min-height 100dvh.
 * Used by all pages as the root content wrapper.
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div
      style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--spacing-md)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}
