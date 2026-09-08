import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prialto Finance',
  description: 'Internal finance visibility — Salesforce, QuickBooks & Time Doctor in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
