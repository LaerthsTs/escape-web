import type { Metadata } from 'next';
import { PhotosLayoutClient } from './PhotosShell';

export const metadata: Metadata = {
  title: { absolute: 'UNLOCKED Photos' },
};

export default function PhotosAppLayout({ children }: { children: React.ReactNode }) {
  return <PhotosLayoutClient>{children}</PhotosLayoutClient>;
}
