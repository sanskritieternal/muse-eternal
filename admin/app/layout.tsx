import type { ReactNode } from 'react';
import LogoutButton from '@/components/LogoutButton';

export const metadata = {
  description: 'Staff admin for the muse-eternal Sanatan Dharma platform',
  title: 'muse-eternal admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: '1px solid #ccc',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
          }}
        >
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <strong>muse-eternal admin</strong>
            <a href="/glossary">Glossary</a>
          </nav>
          <LogoutButton />
        </header>
        <main style={{ margin: '0 auto', maxWidth: '900px', padding: '1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
