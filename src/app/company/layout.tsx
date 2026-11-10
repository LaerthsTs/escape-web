import type { Metadata } from 'next';
import { CompanyLayoutClient } from './CompanyShell';

export const metadata: Metadata = {
  title: { absolute: 'UNLOCKED Business' },
};

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <CompanyLayoutClient>{children}</CompanyLayoutClient>;
}
