'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ShieldAlert, X, ImagePlus, Lock } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { convertToWebFormat } from '@/lib/imageUtils';
import { ROOM_REPORT_MAX_PHOTOS, ROOM_REPORT_MIN_CHARS, ROOM_REPORT_MAX_CHARS } from '../../../convex/reportRules';

type Kind = 'safety' | 'behaviour';

/**
 * A player reports a room they played (safety issue or inappropriate
 * behaviour). Goes only to the UNLOCKED team; the business never sees who sent it.
 */
export function RoomReportModal({
  sessionToken,
  booking,
  onClose,
  onSent,
}: {
  sessionToken: string;
  booking: { _id: string; room?: { title?: string } | null; date: string; time: string };
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.reports.generateRoomReportUploadUrl);
  const submit = useMutation(api.reports.submitRoomReport);

  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const room = ROOM_REPORT_MAX_PHOTOS - photos.length;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)).slice(0, room);
    const next: { file: File; preview: string }[] = [];
    for (const f of picked) {
      const file = await convertToWebFormat(f);
      if (file.size > 10 * 1024 * 1024) {
        setError(t('reports.err.photo'));
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos((p) => [...p, ...next]);
  };

  const send = async () => {
    if (!kind) return;
    setSending(true);
    setError(null);
    try {
      const ids: string[] = [];
      for (const p of photos) {
        const url = await generateUploadUrl({ sessionToken });
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': p.file.type }, body: p.file });
        if (!res.ok) throw new Error(t('reports.err.upload'));
        const { storageId } = await res.json();
        ids.push(storageId);
      }
      await submit({
        sessionToken,
        bookingId: booking._id as any,
        kind,
        description: text,
        photoStorageIds: ids as any,
      });
      onSent();
    } catch (err) {
      setError(friendlyError(err, t));
    }
    setSending(false);
  };

  const tooShort = text.trim().length < ROOM_REPORT_MIN_CHARS;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 sm:px-4" onClick={onClose}>
      <div
        className="glass bg-brand-bg rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-report-title"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="room-report-title" className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand-red-light shrink-0" />
                {t('reports.room.title')}
              </h2>
              <p className="text-sm text-brand-text-secondary truncate">
                {booking.room?.title} · {booking.date} · {booking.time}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg shrink-0" aria-label={t('reports.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('reports.room.kind_label')}</p>
            {(['safety', 'behaviour'] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  kind === k ? 'border-brand-red bg-brand-red/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="block text-sm font-semibold">{t(`reports.room.kind_${k}`)}</span>
                <span className="block text-xs text-brand-text-secondary">{t(`reports.room.kind_${k}_hint`)}</span>
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="room-report-text" className="text-sm font-medium">
              {t('reports.room.describe')}
            </label>
            <textarea
              id="room-report-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, ROOM_REPORT_MAX_CHARS))}
              rows={5}
              className="mt-1.5 w-full bg-brand-surface border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden resize-y"
              placeholder={t('reports.room.describe_placeholder')}
            />
            <p className="text-[11px] text-brand-text-muted text-right">
              {text.length}/{ROOM_REPORT_MAX_CHARS}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">
              {t('reports.room.photos', { max: String(ROOM_REPORT_MAX_PHOTOS) })}
            </p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70"
                    aria-label={t('reports.room.remove_photo')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < ROOM_REPORT_MAX_PHOTOS && (
                <label className="w-20 h-20 rounded-lg border border-dashed border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer text-brand-text-secondary">
                  <ImagePlus className="w-6 h-6" />
                  <span className="sr-only">{t('reports.room.add_photo')}</span>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <p className="text-xs text-brand-text-secondary flex gap-2 bg-white/5 rounded-xl p-3">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            {t('reports.room.privacy')}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={send}
            disabled={!kind || tooShort || sending}
            className="btn-primary w-full disabled:opacity-40"
          >
            {sending ? t('reports.sending') : t('reports.room.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
