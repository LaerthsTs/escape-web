import type { Metadata } from 'next';
import { safeNext } from '@/lib/previewGate';
import { ComingSoon } from './ComingSoon';

export const metadata: Metadata = {
  title: 'Coming soon | UNLOCKED',
  robots: { index: false, follow: false },
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return <ComingSoon next={safeNext(next)} error={error === '1'} />;
}
