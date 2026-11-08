import { ImageResponse } from 'next/og';
import { BrandIconTile } from '@/lib/brandIcon';

export async function GET() {
  return new ImageResponse(<BrandIconTile size={192} />, { width: 192, height: 192 });
}
