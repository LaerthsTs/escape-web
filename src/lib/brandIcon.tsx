/**
 * The eye-in-the-keyhole mark as a square app icon, for next/og ImageResponse
 * (favicon, Apple touch icon, PWA icons). Same shapes as
 * src/components/brand/EyeKeyhole.tsx, on the brand red tile.
 */
export const BRAND_ICON_BG = '#c8101b';

export function BrandIconTile({ size }: { size: number }) {
  const glyph = Math.round(size * 0.8);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.21),
        background: BRAND_ICON_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={glyph} height={glyph} viewBox="9 9.5 30 30">
        <circle cx="24" cy="19" r="9" fill="#0a0000" />
        <path d="M20 25 L16.5 39 H31.5 L28 25 Z" fill="#0a0000" />
        <path d="M17 19 Q24 12.5 31 19 Q24 25.5 17 19 Z" fill="#ece2d6" />
        <circle cx="24" cy="19" r="2.8" fill="#ff2a36" />
        <ellipse cx="24" cy="19" rx="0.9" ry="2.3" fill="#0a0000" />
      </svg>
    </div>
  );
}
