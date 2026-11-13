'use client';

import { HorrorHeading } from '@/components/horror/HorrorHeading';
import { useSafeQuery } from '@/lib/useSafeQuery';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { RoomCard, toRoomCardData, type RoomCardData } from '@/components/rooms/RoomCard';
import { AnimateIn, StaggerContainer, StaggerItem } from '@/components/animations/AnimateIn';

const sampleRooms: RoomCardData[] = [
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

export function FeaturedRooms() {
  const { t } = useTranslation();
  const convexRooms = useSafeQuery<any[]>(api.rooms.list);

  // Map Convex rooms to our card format, fallback to sample data
  // EA partner rooms get priority (Featured Spotlight benefit)
  const rooms: RoomCardData[] =
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
          .map(toRoomCardData)
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
        {/* Flex, not grid: a last row that isn't full sits centred instead of leaving a hole */}
        <StaggerContainer stagger={0.1} className="flex flex-wrap justify-center gap-6 md:gap-8">
          {rooms.map((room, i) => (
            <StaggerItem
              key={room.id ?? i}
              animation="fadeUp"
              className="w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(50%-1rem)] lg:w-[calc((100%-4rem)/3)]"
            >
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
