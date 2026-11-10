'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCompanyAuth } from '@/lib/companyAuth';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/components/company/Toast';
import {
  Camera,
  Plus,
  Loader2,
  DoorOpen,
  Trash2,
  ChevronRight,
  Mail,
  Eye,
  Download,
} from 'lucide-react';

export default function PhotosRoomsDashboard() {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const companyId = company?.id;

  const rooms = useQuery(
    api.companies.getRooms,
    companyId ? { companyId: companyId as any } : 'skip'
  );
  const stats = useQuery(
    api.standalonePhotos.getStats,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  const createRoom = useMutation(api.standalonePhotos.createSimpleRoom);
  const deleteRoom = useMutation(api.standalonePhotos.deleteSimpleRoom);

  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!companyId || !newRoomName.trim()) return;
    setCreating(true);
    try {
      await createRoom({ companyId: companyId as any, title: newRoomName.trim() });
      toast({ kind: 'success', message: t('ph.rooms.created', { title: newRoomName.trim() }) });
      setNewRoomName('');
      setShowCreate(false);
    } catch (err) {
      console.error('Create room failed:', err);
      toast({ kind: 'error', message: friendlyError(err, t) });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!companyId) return;
    if (!confirm(t('ph.rooms.delete_confirm', { title: room.title }))) return;
    try {
      await deleteRoom({ roomId: room._id as any, companyId: companyId as any });
      toast({ kind: 'success', message: t('cx.rooms.deleted', { title: room.title }) });
    } catch (err) {
      console.error('Delete room failed:', err);
      toast({ kind: 'error', message: friendlyError(err, t) });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Camera className="w-7 h-7 text-brand-red-light" />
            {t('ph.rooms.title')}
          </h1>
          <p className="text-brand-text-secondary text-sm mt-1">{t('ph.rooms.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('ph.rooms.new')}
        </button>
      </div>

      {/* Global stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-8">
          {[
            { icon: Camera, label: t('ph.stat.photos'), value: stats.totalPhotos, accent: 'text-brand-red-light' },
            { icon: Camera, label: t('ph.stat.today'), value: stats.todayPhotos, accent: 'text-blue-400' },
            { icon: Mail, label: t('ph.stat.emails'), value: stats.totalEmails, accent: 'text-green-400' },
            { icon: Eye, label: t('ph.stat.views'), value: stats.totalViews, accent: 'text-purple-400' },
            { icon: Download, label: t('ph.stat.downloads'), value: stats.totalDownloads, accent: 'text-yellow-400' },
          ].map((s) => (
            <div key={s.label} className="bg-brand-surface rounded-xl border border-white/5 p-3 md:p-4 text-center">
              <s.icon className={`w-5 h-5 ${s.accent} mx-auto mb-1`} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-brand-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create room inline form */}
      {showCreate && (
        <div className="bg-brand-surface rounded-2xl border border-white/5 p-5 md:p-6 mb-6">
          <h3 className="text-lg font-semibold mb-1">{t('ph.rooms.create_title')}</h3>
          <p className="text-xs text-brand-text-secondary mb-4">{t('ph.rooms.create_note')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder={t('ph.rooms.name_placeholder')}
              className="input-field flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={creating || !newRoomName.trim()}
                className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('ph.rooms.create')}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewRoomName(''); }}
                className="btn-ghost flex-1 sm:flex-none px-4"
              >
                {t('cx.common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rooms list */}
      {!rooms ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-brand-red-light animate-spin mx-auto" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 px-4 bg-brand-surface rounded-2xl border border-white/5">
          <DoorOpen className="w-16 h-16 text-brand-border mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('ph.rooms.empty_title')}</h3>
          <p className="text-brand-text-muted mb-6">{t('ph.rooms.empty_desc')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('ph.rooms.create_room')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: any) => (
            <div
              key={room._id}
              onClick={() => router.push(`/room/${room._id}`)}
              className="group bg-brand-surface rounded-2xl border border-white/5 hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden"
            >
              {/* Room image or placeholder */}
              <div className="aspect-video bg-brand-bg relative flex items-center justify-center">
                {room.image && !String(room.image).startsWith('/placeholder') ? (
                  <img src={room.image} alt={room.title} className="w-full h-full object-cover" />
                ) : (
                  <DoorOpen className="w-12 h-12 text-brand-border" />
                )}
                {/* Delete: only rooms created here; always visible on touch screens */}
                {room.photosOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room);
                    }}
                    aria-label={t('cx.rooms.delete')}
                    title={t('cx.rooms.delete')}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Room info */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg truncate">{room.title}</h3>
                  <ChevronRight className="w-5 h-5 text-brand-text-muted group-hover:text-brand-red-light transition-colors shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
