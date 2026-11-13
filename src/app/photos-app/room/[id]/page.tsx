'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCompanyQuery, useCompanyAuth } from '@/lib/companyAuth';
import { api } from '../../../../../convex/_generated/api';
import { Loader2 } from 'lucide-react';
import PhotosTool from '@/components/photos/PhotosTool';
import { useTranslation } from '@/lib/i18n';

export default function RoomPhotosPage() {
  const params = useParams();
  const router = useRouter();
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const roomId = params.id as string;
  const companyId = company?.id;

  const rooms = useCompanyQuery(
    api.companies.getRooms,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  const room = rooms?.find((r: any) => r._id === roomId);

  // Loading
  if (!rooms) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red-light animate-spin" />
      </div>
    );
  }

  // Room not found or not owned
  if (!room) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-brand-text-muted">{t('ph.room_not_found')}</p>
        <button onClick={() => router.push('/')} className="btn-primary">
          {t('ph.back_to_rooms')}
        </button>
      </div>
    );
  }

  return <PhotosTool roomId={roomId} roomTitle={room.title} />;
}
