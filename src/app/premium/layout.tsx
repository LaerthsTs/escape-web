import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UNLOCKED Premium for Escape Room Players',
  description:
    'Early access to new escape rooms, a Premium badge, member prices on merch, free shipping on UNLOCKED Official orders and early merch drops.',
  alternates: { canonical: 'https://unlocked.gr/premium' },
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
