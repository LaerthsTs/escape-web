import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { SafeConvex } from '@/components/SafeConvex';

// Force all pages to be dynamically rendered (SSR on-demand)
// This prevents Convex hooks from failing during build-time pre-rendering
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#080505',
};

export const metadata: Metadata = {
  title: 'Discover & Book Escape Rooms Worldwide | UNLOCKED',
  description:
    'Find and book the best escape rooms near you. Browse by theme, difficulty & location. Instant online booking, player reviews & team leaderboards on UNLOCKED.',
  keywords: [
    'escape room',
    'book escape room',
    'escape rooms worldwide',
    'escape game',
    'team building activities',
    'puzzle rooms',
    'adventure games',
    'escape room near me',
    'online booking',
    'player reviews',
  ],
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://unlocked.gr',
  },
  openGraph: {
    title: 'Discover & Book Escape Rooms Worldwide | UNLOCKED',
    description:
      'Find and book the best escape rooms near you. Browse by theme, difficulty & location. Instant booking & player reviews.',
    type: 'website',
    url: 'https://unlocked.gr',
    siteName: 'UNLOCKED',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover & Book Escape Rooms Worldwide | UNLOCKED',
    description:
      'Find and book the best escape rooms near you. Browse by theme, difficulty & location on UNLOCKED.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'UNLOCKED',
    url: 'https://unlocked.gr',
    description:
      'Discover and book the best escape rooms around the world. Browse rooms by theme, difficulty and location with instant online booking.',
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Free to browse and book escape rooms',
    },
    creator: {
      '@type': 'Organization',
      name: 'UNLOCKED',
      url: 'https://unlocked.gr',
      logo: 'https://unlocked.gr/icon-512',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['English', 'Greek'],
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Athens',
        addressCountry: 'GR',
      },
    },
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Serif+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=Nosifer&family=Special+Elite&family=Cousine:wght@400;700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ConvexClientProvider>
          <I18nProvider>
            <AuthProvider>
              <LayoutShell>{children}</LayoutShell>
            </AuthProvider>
          </I18nProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
