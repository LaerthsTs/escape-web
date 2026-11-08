'use client';

import Link from 'next/link';
import {
  Skull,
  Compass,
  Search as SearchIcon,
  Landmark,
  Cpu,
  Microscope,
  Ghost,
  Swords,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { StaggerContainer, StaggerItem } from '@/components/animations/AnimateIn';
import { HorrorHeading } from '@/components/horror/HorrorHeading';

const themes = [
  { key: 'theme.horror', value: 'Horror', icon: Skull, tint: 'rgba(200,16,27,0.55)' },
  { key: 'theme.adventure', value: 'Adventure', icon: Compass, tint: 'rgba(180,90,20,0.5)' },
  { key: 'theme.mystery', value: 'Mystery', icon: SearchIcon, tint: 'rgba(110,40,140,0.5)' },
  { key: 'theme.history', value: 'Historical', icon: Landmark, tint: 'rgba(150,110,30,0.5)' },
  { key: 'theme.scifi', value: 'Sci-Fi', icon: Cpu, tint: 'rgba(20,130,140,0.5)' },
  { key: 'theme.science', value: 'Science', icon: Microscope, tint: 'rgba(40,130,60,0.5)' },
  { key: 'theme.paranormal', value: 'Paranormal', icon: Ghost, tint: 'rgba(70,60,160,0.5)' },
  { key: 'theme.medieval', value: 'Medieval', icon: Swords, tint: 'rgba(160,60,20,0.5)' },
];

export function ThemesSection() {
  const { t } = useTranslation();
  return (
    <section className="relative py-24 md:py-32 bg-brand-dark overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_100%,rgba(92,0,8,0.35),transparent_70%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorrorHeading
          kicker={t('horror.enter')}
          title={t('themes.title')}
          highlight={t('themes.title_highlight')}
          subtitle={t('themes.subtitle')}
        />

        <StaggerContainer stagger={0.08} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-5">
          {themes.map((theme, i) => (
            <StaggerItem key={i} animation="scaleUp">
              <Link
                href={`/discover?theme=${encodeURIComponent(theme.value)}`}
                className="group relative block w-full overflow-hidden rounded-md border border-brand-border bg-black/70 p-6 md:p-8 transition-all duration-500 hover:-translate-y-1 hover:border-brand-red/60 hover:shadow-[0_20px_50px_-15px_rgba(200,16,27,0.6)]"
              >
                {/* Light rising from below on hover */}
                <span
                  className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out"
                  style={{ background: `radial-gradient(90% 80% at 50% 100%, ${theme.tint}, transparent 75%)` }}
                />
                {/* Crack that appears on hover */}
                <svg
                  aria-hidden
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1"
                  preserveAspectRatio="none"
                >
                  <path d="M100 8 L84 18 L88 26 L72 34 L76 42 L62 50" />
                  <path d="M84 18 L92 30" />
                </svg>
                {/* Numbered like evidence */}
                <span className="absolute top-2 left-3 font-type text-[10px] text-brand-text-muted tracking-widest">
                  #{String(i + 1).padStart(3, '0')}
                </span>

                <div className="relative z-10 flex flex-col items-center gap-3">
                  <theme.icon className="w-8 h-8 md:w-10 md:h-10 text-brand-text-secondary group-hover:text-brand-bone group-hover:animate-shake transition-colors duration-300 drop-shadow-[0_0_12px_rgba(200,16,27,0.0)] group-hover:drop-shadow-[0_0_14px_rgba(255,40,50,0.8)]" />
                  <span className="font-display text-base md:text-lg font-bold text-brand-text-secondary group-hover:text-brand-bone transition-colors">
                    {t(theme.key)}
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
