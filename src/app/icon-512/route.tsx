import { ImageResponse } from 'next/og';
import { BrandIconTile } from '@/lib/brandIcon';

export async function GET() {
  return new ImageResponse(<BrandIconTile size={512} />, { width: 512, height: 512 });
}
