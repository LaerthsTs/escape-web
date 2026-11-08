'use client';

import { Star, Clock, Users, Zap, DoorOpen, BadgeCheck, Skull, Flame } from 'lucide-react';
import { HorrorHeading } from '@/components/horror/HorrorHeading';
import { useSafeQuery } from '@/lib/useSafeQuery';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { AnimateIn, StaggerContainer, StaggerItem } from '@/components/animations/AnimateIn';

interface RoomCardProps {
  id?: string;
  title: string;
  theme: string;
  rating: number;
  reviews: number;
  duration: string;
  difficulty: number;
  maxDifficulty: number;
  players: string;
  price: number;
  image: string;
  isNew?: boolean;
  isTrending?: boolean;
  isEarlyAccessPartner?: boolean;
  companyName?: string;
}

const sampleRooms: RoomCardProps[] = [
  {
    title: 'The Haunted Mansion',
    theme: 'Horror',
    rating: 4.8,
    reviews: 142,
    duration: '60 min',
    difficulty: 4,
    maxDifficulty: 5,
    players: '2-6',
    price: 25,
    image: '',
    isTrending: true,
  },
  {
    title: 'Prison Break',
    theme: 'Adventure',
    rating: 4.9,
    reviews: 203,
    duration: '75 min',
    difficulty: 5,
    maxDifficulty: 5,
    players: '3-8',
    price: 30,
    image: '',
    isNew: true,
  },
  {
    title: 'The Da Vinci Code',
    theme: 'Mystery',
    rating: 4.7,
    reviews: 98,
    duration: '60 min',
    difficulty: 3,
    maxDifficulty: 5,
    players: '2-5',
    price: 22,
    image: '',
  },
  {
    title: 'Zombie Apocalypse',
    theme: 'Horror',
    rating: 4.6,
    reviews: 167,
    duration: '60 min',
    difficulty: 4,
    maxDifficulty: 5,
    players: '4-8',
    price: 28,
    image: '',
    isTrending: true,
  },
  {
    title: 'Egyptian Tomb',
    theme: 'History',
    rating: 4.9,
    reviews: 256,
    duration: '90 min',
    difficulty: 5,
    maxDifficulty: 5,
    players: '2-6',
    price: 35,
    image: '',
    isNew: true,
  },
  {
    title: 'Cyber Heist',
    theme: 'Sci-Fi',
    rating: 4.5,
    reviews: 78,
    duration: '60 min',
    difficulty: 3,
    maxDifficulty: 5,
    players: '2-4',
    price: 20,
    image: '',
  },
];

function DifficultyDots({ level, max }: { level: number; max: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Skull
          key={i}
          className={`w-3.5 h-3.5 ${
            i < level ? 'text-brand-red-light drop-shadow-[0_0_4px_rgba(255,40,50,0.8)]' : 'text-brand-border'
          }`}
        />
      ))}
    </div>
  );
}

function RoomCard({ room }: { room: RoomCardProps }) {
  const { t } = useTranslation();
  const themeColors: Record<string, string> = {
    Horror: 'border-red-700/60 text-red-400',
    Adventure: 'border-amber-800/60 text-amber-400',
    Mystery: 'border-purple-800/60 text-purple-400',
    History: 'border-yellow-800/60 text-yellow-400',
    'Sci-Fi': 'border-cyan-800/60 text-cyan-400',
  };

  const Wrapper = room.id
    ? ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <Link href={`/rooms/${room.id}`} className={className}>{children}</Link>
      )
    : ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className}>{children}</div>
      );

  return (
    <Wrapper className="card-hover group cursor-pointer block">
      {/* Image */}
      <div className="relative h-52 bg-[radial-gradient(80%_70%_at_50%_60%,#2a1010,#0a0505)] overflow-hidden">
        {room.image ? (
          <img
            src={room.image}
            alt={room.title}
            className="w-full h-full object-cover grayscale-[85%] contrast-125 brightness-75 group-hover:grayscale-0 group-hover:brightness-90 group-hover:scale-110 transition-all duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <DoorOpen className="w-16 h-16 text-brand-border/60 group-hover:text-brand-red/60 group-hover:animate-shake transition-colors duration-500" />
          </div>
        )}
        {/* Blood wash that seeps in on hover */}
        <div className="absolute inset-0 z-10 bg-brand-red mix-blend-multiply opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
        {/* VHS scanlines */}
        <div className="absolute inset-0 z-10 opacity-20 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.8)_0_1px,transparent_1px_3px)]" />
        <div className="absolute inset-0 bg-linear-to-t from-brand-card via-brand-card/30 to-transparent z-10" />

        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          {room.isEarlyAccessPartner && (
            <span className="bg-emerald-700/90 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-sm flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" /> {t('badge.early_access')}
            </span>
          )}
          {room.isNew && (
            <span className="bg-brand-red text-brand-bone text-xs font-bold px-2.5 py-1 rounded-sm flex items-center gap-1 shadow-[0_0_14px_rgba(255,40,50,0.6)]">
              <Zap className="w-3 h-3" /> {t('featured.new')}
            </span>
          )}
          {room.isTrending && (
            <span className="bg-black/80 border border-brand-gold/60 text-brand-gold text-xs font-bold px-2.5 py-1 rounded-sm flex items-center gap-1">
              <Flame className="w-3 h-3 animate-flicker-fast" /> {t('featured.trending')}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="absolute top-3 right-3 z-20">
          <span className="bg-black/80 backdrop-blur-xs text-brand-bone text-sm font-bold px-3 py-1.5 rounded-sm border border-brand-red/40 font-type">
            €{room.price}
            <span className="text-brand-text-muted font-normal text-xs">{t('featured.per_person')}</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Theme tag */}
        <span
          className={`inline-block font-type text-[11px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-sm border mb-3 ${
            themeColors[room.theme] || 'border-brand-border text-brand-text-secondary'
          }`}
        >
          {room.theme}
        </span>

        <h3 className="text-xl font-display font-bold mb-2 text-brand-bone group-hover:text-brand-red-light group-hover:text-blood-glow transition-colors">
          {room.title}
        </h3>

        {room.companyName && (
          <div className="flex items-center gap-1 text-xs text-brand-text-muted mb-2">
            {room.isEarlyAccessPartner && <BadgeCheck className="w-3 h-3 text-emerald-400" />}
            <span>{room.companyName}</span>
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
          <span className="text-sm font-medium">{room.rating}</span>
          <span className="text-sm text-brand-text-muted">({room.reviews} {t('featured.reviews')})</span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-text-secondary">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {room.duration}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {room.players}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">{t('featured.difficulty')}</span>
            <DifficultyDots level={room.difficulty} max={room.maxDifficulty} />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export function FeaturedRooms() {
  const { t } = useTranslation();
  const convexRooms = useSafeQuery<any[]>(api.rooms.list);

  // Map Convex rooms to our card format, fallback to sample data
  // EA partner rooms get priority (Featured Spotlight benefit)
  const rooms: RoomCardProps[] =
    convexRooms && convexRooms.length > 0
      ? [...convexRooms]
          .sort((a: any, b: any) => {
            // EA partner rooms first
            const aEA = a.isEarlyAccessPartner ? 1 : 0;
            const bEA = b.isEarlyAccessPartner ? 1 : 0;
            if (aEA !== bEA) return bEA - aEA;
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
          .slice(0, 6)
          .map((r: any) => ({
            id: r._id,
            title: r.title || 'Untitled Room',
            theme: r.theme || 'Mystery',
            rating: r.rating ?? 0,
            reviews: r.reviews ?? 0,
            duration: typeof r.duration === 'number' ? `${r.duration} min` : r.duration || '60 min',
            difficulty: r.difficulty ?? 3,
            maxDifficulty: r.maxDifficulty ?? 5,
            players: r.players || '2-6',
            price: r.price ?? 0,
            image: r.image || '',
            isNew: r.isNew,
            isTrending: r.isTrending,
            isEarlyAccessPartner: r.isEarlyAccessPartner,
            companyName: r.companyName,
          }))
      : sampleRooms;

  return (
    <section id="rooms" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <HorrorHeading
          kicker={t('horror.featured_tag')}
          title={t('featured.title')}
          highlight={t('featured.title_highlight')}
          subtitle={t('featured.subtitle')}
        />

        {/* Grid */}
        <StaggerContainer stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {rooms.map((room, i) => (
            <StaggerItem key={i} animation="fadeUp">
              <RoomCard room={room} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* CTA */}
        <AnimateIn animation="fadeUp" delay={0.4} className="text-center mt-12">
          <Link href="/discover" className="btn-outline inline-block">{t('featured.view_all')}</Link>
        </AnimateIn>
      </div>
    </section>
  );
}
