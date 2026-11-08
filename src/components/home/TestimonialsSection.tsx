'use client';

import { Skull } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { StaggerContainer, StaggerItem } from '@/components/animations/AnimateIn';
import { HorrorHeading } from '@/components/horror/HorrorHeading';

export function TestimonialsSection() {
  const { t } = useTranslation();

  const testimonials = [
    { name: t('testimonials.t1.name'), avatar: 'MK', role: t('testimonials.t1.role'), rating: 5, text: t('testimonials.t1.text') },
    { name: t('testimonials.t2.name'), avatar: 'DP', role: t('testimonials.t2.role'), rating: 5, text: t('testimonials.t2.text') },
    { name: t('testimonials.t3.name'), avatar: 'SL', role: t('testimonials.t3.role'), rating: 5, text: t('testimonials.t3.text') },
  ];
  const tilts = [-1.6, 1.1, -0.8];

  return (
    <section className="relative py-24 md:py-32 bg-brand-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorrorHeading
          kicker={t('horror.watching')}
          title={t('testimonials.title')}
          highlight={t('testimonials.title_highlight')}
          subtitle={t('testimonials.subtitle')}
        />

        <StaggerContainer stagger={0.18} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {testimonials.map((item, i) => (
            <StaggerItem key={i} animation="fadeUp">
              {/* A case file pinned to the wall */}
              <div
                className="group relative p-6 md:p-8 pt-10 rounded-sm border border-[#3a2a22] transition-[rotate,translate] duration-500 hover:rotate-0! hover:-translate-y-1"
                style={{
                  rotate: `${tilts[i]}deg`,
                  background:
                    'linear-gradient(180deg, #1a1411 0%, #120d0b 100%), repeating-linear-gradient(0deg, transparent 0 27px, rgba(255,255,255,0.03) 27px 28px)',
                  backgroundBlendMode: 'normal',
                  boxShadow: '0 25px 50px -20px rgba(0,0,0,0.9), inset 0 0 50px rgba(0,0,0,0.7)',
                }}
              >
                {/* Tape */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 rotate-[-3deg] bg-[#d8ccb4]/20 border-y border-[#d8ccb4]/10 backdrop-blur-[1px]" />
                {/* Blood smear */}
                <div className="absolute -right-2 bottom-6 w-16 h-16 rounded-full bg-[radial-gradient(circle,rgba(143,6,16,0.45),transparent_65%)] blur-[2px]" />

                <div className="flex items-center justify-between mb-5">
                  <span className="horror-label">
                    {t('horror.case_file')} #{String(13 + i * 7).padStart(4, '0')}
                  </span>
                  {/* Stamp */}
                  <span className="font-type text-[11px] tracking-[0.2em] text-brand-red border-2 border-brand-red/70 px-2 py-0.5 rotate-[-8deg] opacity-80 group-hover:opacity-100 transition-opacity">
                    {t('horror.survivor')}
                  </span>
                </div>

                <div className="flex gap-1 mb-4">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Skull key={j} className="w-4 h-4 text-brand-red" />
                  ))}
                </div>

                <p className="font-type text-brand-text-secondary text-sm leading-7 mb-6">
                  &ldquo;{item.text}&rdquo;
                </p>

                <div className="flex items-center gap-3 border-t border-dashed border-[#3a2a22] pt-4">
                  <div className="w-10 h-10 rounded-sm bg-black border border-brand-red/40 grayscale flex items-center justify-center text-brand-red-light text-sm font-bold">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-bone">{item.name}</p>
                    <p className="text-xs text-brand-text-muted">{item.role}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
