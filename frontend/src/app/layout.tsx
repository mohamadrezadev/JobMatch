import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pathly — AI Career Copilot',
  description:
    'Find the right job, understand your fit, close your skill gaps, and apply with confidence.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
