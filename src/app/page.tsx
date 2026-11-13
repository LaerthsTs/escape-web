import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedRooms } from '@/components/home/FeaturedRooms';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ThemesSection } from '@/components/home/ThemesSection';
import { DownloadCTA } from '@/components/home/DownloadCTA';
import { SEOContent } from '@/components/home/SEOContent';
import { SafeConvex } from '@/components/SafeConvex';

export default function Home() {
  return (
    <>
      <SafeConvex><HeroSection /></SafeConvex>
      <SafeConvex><FeaturedRooms /></SafeConvex>
      <ThemesSection />
      <HowItWorks />
      <DownloadCTA />
      {/* Long-form copy for search engines sits last, in small type */}
      <SEOContent />
    </>
  );
}
