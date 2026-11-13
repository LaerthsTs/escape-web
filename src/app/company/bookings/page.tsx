'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useCompanyMutation, useCompanyQuery, useCompanyAuth, localDateKey } from '@/lib/companyAuth';
import { api } from '../../../../convex/_generated/api';
import { friendlyError } from '@/lib/errors';
import { statusLabel } from '@/lib/companyUi';
import { useToast } from '@/components/company/Toast';
import {
  CalendarToolbar,
  BookingCalendarGrid,
  viewDays,
  slotRange,
  bookingKind,
  bookingSourceLabel,
  CAL_VIEWS,
  type CalView,
  type FreeSlotClick,
} from '@/components/company/BookingCalendar';
import {
  X,
  Users,
  DollarSign,
  AlertCircle,
  Award,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Timer,
  CalendarClock,
  MessageSquare,
  Save,
  Pencil,
  Phone,
  Mail,
  Plus,
  Ban,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const VIEW_KEY = 'unlocked_bookings_view';

type SlotPrefill = { roomId: string; time: string; date: string; price?: number; pricePerGroup?: { players: number; price: number }[] };

export default function CompanyBookingsPage() {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const companyId = company?.id;

  const [anchor, setAnchor] = useState(localDateKey());
  const [view, setViewState] = useState<CalView>('day');

  // Deep links from the dashboard / slot board: /bookings?date=YYYY-MM-DD[&view=week]
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setAnchor(d);
    const v = params.get('view') as CalView | null;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {}
    const pick = (v && CAL_VIEWS.includes(v) ? v : null) || (saved && CAL_VIEWS.includes(saved as CalView) ? (saved as CalView) : null);
    if (pick) setViewState(pick);

    // From the dashboard calendar: open the booking, or a new booking for a free time.
    const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : localDateKey();
    const bookingId = params.get('booking');
    const roomId = params.get('room');
    const time = params.get('time');
    if (bookingId) {
      setSelected({ _id: bookingId });
    } else if (roomId && time && /^\d{2}:\d{2}$/.test(time)) {
      const price = Number(params.get('price'));
      setCreateFor({ roomId, time, date: day, price: Number.isFinite(price) && params.get('price') ? price : undefined });
    }
    if (bookingId || roomId) {
      // Drop the one-off params so a reload doesn't reopen the form.
      const clean = new URLSearchParams();
      if (d) clean.set('date', d);
      window.history.replaceState(null, '', `${window.location.pathname}${clean.toString() ? `?${clean}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setView = (v: CalView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const [createFor, setCreateFor] = useState<SlotPrefill | null>(null);
  const [blockFor, setBlockFor] = useState<SlotPrefill | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  const rooms = useCompanyQuery(
    api.companies.getRooms,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  // The list view shows one day; the calendar views load their own days.
  const listBookings = useCompanyQuery(
    api.companies.getBookingsByDate,
    companyId && view === 'list' ? { companyId: companyId as any, date: anchor } : 'skip'
  );

  const cancelBooking = useCompanyMutation(api.companies.adminCancelBooking);
  const completeBooking = useCompanyMutation(api.companies.adminCompleteBooking);
  const rescheduleBooking = useCompanyMutation(api.companies.adminRescheduleBooking);
  const submitPerformance = useCompanyMutation(api.badges.submitPerformance);

  const days = useMemo(() => viewDays(view, anchor), [view, anchor]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm(t('company.bookings.confirm_cancel'))) return false;
    try {
      await cancelBooking({ companyId: companyId as any, bookingId: bookingId as any });
      toast({ kind: 'success', message: t('cx.bookings.cancelled') });
      return true;
    } catch (err) {
      toast({ kind: 'error', message: friendlyError(err, t) });
      return false;
    }
  };

  const onFreeSlot = ({ room, date, slot }: FreeSlotClick) =>
    setCreateFor({ roomId: room._id, time: slot.time, date, price: slot.price, pricePerGroup: slot.pricePerGroup || room.pricePerGroup });

  const activeRooms = (rooms || []).filter((r: any) => r.isActive !== false);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{t('company.bookings.title')}</h1>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button
            onClick={() => setBlockFor({ roomId: activeRooms[0]?._id || '', time: '', date: anchor })}
            className="btn-ghost text-sm flex items-center justify-center gap-1.5"
          >
            <Ban className="w-4 h-4" /> {t('company.bookings.block_slot')}
          </button>
          <button
            onClick={() => setCreateFor({ roomId: activeRooms[0]?._id || '', time: '', date: anchor })}
            className="btn-primary text-sm flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {t('company.bookings.new_booking')}
          </button>
        </div>
      </div>

      <div className="bg-brand-surface rounded-2xl border border-white/5 p-3 md:p-5">
        <CalendarToolbar view={view} onView={setView} anchor={anchor} onAnchor={setAnchor} />

        {rooms === undefined ? (
          <div className="h-[50vh] rounded-xl bg-white/5 animate-pulse" />
        ) : view === 'list' ? (
          <BookingList bookings={listBookings} rooms={rooms} onOpen={setSelected} />
        ) : (
          <BookingCalendarGrid
            rooms={rooms}
            companyId={companyId}
            days={days}
            onFreeSlot={onFreeSlot}
            onBooking={setSelected}
          />
        )}
      </div>

      {selected && (
        <BookingDetailModal
          companyId={companyId!}
          initial={selected}
          rooms={rooms || []}
          onClose={() => setSelected(null)}
          onComplete={(b) => {
            setSelected(null);
            setShowCompleteModal(b);
          }}
          onReschedule={(b) => {
            setSelected(null);
            setShowRescheduleModal(b);
          }}
          onCancel={async (b) => {
            if (await handleCancel(b._id)) setSelected(null);
          }}
        />
      )}

      {createFor && rooms && (
        <CreateBookingModal
          companyId={companyId!}
          rooms={rooms || []}
          prefill={createFor}
          onClose={() => setCreateFor(null)}
          onBlockInstead={() => {
            setBlockFor(createFor);
            setCreateFor(null);
          }}
        />
      )}

      {blockFor && rooms && (
        <ExternalBlockModal
          companyId={companyId!}
          rooms={rooms || []}
          prefill={blockFor}
          onClose={() => setBlockFor(null)}
        />
      )}

      {showRescheduleModal && (
        <RescheduleBookingModal
          companyId={companyId!}
          booking={showRescheduleModal}
          rooms={rooms || []}
          rescheduleBooking={rescheduleBooking}
          onClose={() => setShowRescheduleModal(null)}
        />
      )}

      {showCompleteModal && (
        <CompleteBookingModal
          companyId={companyId!}
          booking={showCompleteModal}
          onClose={() => setShowCompleteModal(null)}
          completeBooking={completeBooking}
          submitPerformance={submitPerformance}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        status === 'cancelled'
          ? 'bg-red-500/10 text-red-400'
          : status === 'completed'
          ? 'bg-green-500/10 text-green-400'
          : status === 'pending_payment'
          ? 'bg-yellow-500/10 text-yellow-400'
          : 'bg-blue-500/10 text-blue-400'
      }`}
    >
      {statusLabel(t, status)}
    </span>
  );
}

function SourcePill({ booking }: { booking: any }) {
  const { t } = useTranslation();
  const kind = bookingKind(booking);
  const label = kind === 'external' || kind === 'manual' ? bookingSourceLabel(booking, t) : booking.source === 'external' ? bookingSourceLabel(booking, t) : t('company.bookings.unlocked_source');
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        kind === 'external' || kind === 'manual' ? 'bg-sky-500/10 text-sky-300' : 'bg-brand-red/10 text-brand-red-light'
      }`}
    >
      {label}
    </span>
  );
}

/** One day's bookings as cards (the "List" view). */
function BookingList({ bookings, rooms, onOpen }: { bookings: any[] | undefined; rooms: any[]; onOpen: (b: any) => void }) {
  const { t } = useTranslation();
  if (!bookings) {
    return <div className="text-center py-8 text-brand-text-secondary">{t('company.bookings.loading')}</div>;
  }
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-brand-text-secondary">
        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{t('company.bookings.no_bookings')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {bookings.map((booking: any) => {
        const room = rooms.find((r) => r._id === booking.roomId);
        return (
          <button
            key={booking._id}
            onClick={() => onOpen(booking)}
            className="w-full text-left p-4 rounded-xl border bg-brand-bg border-white/5 hover:border-brand-red/30 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg font-bold text-brand-red-light">{room ? slotRange(booking.time, room) : booking.time}</span>
                <span className="font-semibold truncate">{booking.roomTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <SourcePill booking={booking} />
                <StatusPill status={booking.status} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-text-secondary">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {booking.playerName}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {booking.players} {t('company.bookings.players_count')}
              </span>
              {booking.total > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> €{booking.total}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Booking details with notes and the complete / reschedule / cancel actions. */
function BookingDetailModal({
  companyId,
  initial,
  rooms,
  onClose,
  onComplete,
  onReschedule,
  onCancel,
}: {
  companyId: string;
  initial: any;
  rooms: any[];
  onClose: () => void;
  onComplete: (b: any) => void;
  onReschedule: (b: any) => void;
  onCancel: (b: any) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const updateNotes = useCompanyMutation(api.companies.updateBookingNotes);
  // Live copy, so a saved note or a status change shows straight away.
  const fresh = useCompanyQuery(api.companies.getBookingDetail, { bookingId: initial._id as any });
  const booking = { ...initial, ...(fresh || {}), playerName: fresh?.playerName || initial.playerName };
  const room = rooms.find((r) => r._id === booking.roomId);

  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const paymentLabel = (status?: string) => {
    if (!status) return t('company.bookings.na');
    const key = `cx.payment.${status}`;
    const tr = t(key);
    return tr === key ? status : tr;
  };

  const date = new Date(booking.date + 'T12:00:00');
  const dateLabel = `${date.getDate()} ${t(`common.month_${date.getMonth() + 1}`)} ${date.getFullYear()}`;

  // Opened from a link with only the id: wait for the booking to load.
  if (!initial.date && !fresh) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4" onClick={onClose}>
      <div
        className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {booking.roomImage && (
          <div className="h-24 overflow-hidden rounded-t-2xl">
            <img src={booking.roomImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-brand-text-secondary">{t('cx.bcal.details_title')}</p>
              <h2 className="text-lg font-bold truncate">{booking.playerName}</h2>
              <p className="text-sm text-brand-text-secondary">
                {booking.roomTitle} · {dateLabel} · {room ? slotRange(booking.time, room) : booking.time}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg shrink-0" aria-label={t('cx.common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <SourcePill booking={booking} />
            <StatusPill status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-brand-text-secondary">{t('company.bookings.booking_code')}</span>
              <p className="font-mono font-semibold">{booking.bookingCode}</p>
            </div>
            <div>
              <span className="text-brand-text-secondary">{t('company.bookings.payment')}</span>
              <p className="font-semibold">{paymentLabel(booking.paymentStatus)}</p>
            </div>
            <div>
              <span className="text-brand-text-secondary">{t('company.bookings.players')}</span>
              <p className="font-semibold">{booking.players || 0}</p>
            </div>
            <div>
              <span className="text-brand-text-secondary">{t('company.bookings.total_eur')}</span>
              <p className="font-semibold">€{booking.total || 0}</p>
            </div>
          </div>

          {(booking.playerPhone || booking.playerContact) && (
            <div className="flex flex-wrap gap-2">
              {booking.playerPhone && (
                <a
                  href={`tel:${booking.playerPhone}`}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10"
                >
                  <Phone className="w-3.5 h-3.5" /> {booking.playerPhone}
                </a>
              )}
              {booking.playerContact && String(booking.playerContact).includes('@') && (
                <a
                  href={`mailto:${booking.playerContact}`}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 max-w-full truncate"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{booking.playerContact}</span>
                </a>
              )}
            </div>
          )}

          {/* Internal note */}
          <div className="text-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-brand-text-secondary" />
              <span className="text-brand-text-secondary">{t('company.bookings.internal_note')}</span>
              {!editing && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setNoteText(booking.notes || '');
                  }}
                  className="ml-auto p-1.5 -m-1.5 text-brand-text-muted hover:text-white transition-colors"
                  aria-label={t('cx.bookings.edit_note')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editing ? (
              <div className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1 bg-brand-bg border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden resize-none"
                  placeholder={t('company.bookings.note_placeholder')}
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={async () => {
                      setSavingNote(true);
                      try {
                        await updateNotes({ companyId: companyId as any, bookingId: booking._id as any, notes: noteText });
                        setEditing(false);
                        toast({ kind: 'success', message: t('cx.bookings.note_saved') });
                      } catch (err) {
                        toast({ kind: 'error', message: friendlyError(err, t) });
                      }
                      setSavingNote(false);
                    }}
                    disabled={savingNote}
                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                    aria-label={t('cx.slots.extra_save')}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="p-2 rounded-lg bg-white/5 text-brand-text-secondary hover:bg-white/10 transition-colors"
                    aria-label={t('cx.common.cancel')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className={booking.notes ? 'text-white' : 'text-brand-text-muted italic'}>
                {booking.notes || t('company.bookings.no_note')}
              </p>
            )}
          </div>

          {booking.status === 'upcoming' && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onComplete(booking)}
                className="text-sm px-3 py-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              >
                {t('company.bookings.complete')}
              </button>
              <button
                onClick={() => onReschedule(booking)}
                className="text-sm px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                {t('company.bookings.reschedule')}
              </button>
              <button
                onClick={() => onCancel(booking)}
                className="text-sm px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                {t('company.bookings.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompleteBookingModal({
  companyId,
  booking,
  onClose,
  completeBooking,
  submitPerformance,
}: {
  companyId: string;
  booking: any;
  onClose: () => void;
  completeBooking: any;
  submitPerformance: any;
}) {
  const { t } = useTranslation();
  const [escaped, setEscaped] = useState(true);
  const [escapeTime, setEscapeTime] = useState('');
  const [hintsUsed, setHintsUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Mark booking as completed
      await completeBooking({
        companyId: companyId as any,
        bookingId: booking._id as any,
      });

      // 2. Submit performance data — badges are awarded automatically
      await submitPerformance({
        companyId: companyId as any,
        bookingId: booking._id as any,
        escaped,
        escapeTimeMinutes: escapeTime ? parseInt(escapeTime) : undefined,
        hintsUsed: hintsUsed !== '' ? parseInt(hintsUsed) : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(friendlyError(err, t, 'cx.bookings.complete_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-gold" />
            {t('company.bookings.complete_verify')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking summary */}
        <div className="bg-brand-bg rounded-xl p-3 mb-5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-brand-red-light">{booking.time}</span>
            <span className="font-medium">{booking.roomTitle}</span>
          </div>
          <div className="text-brand-text-muted flex items-center gap-3">
            <span>{booking.playerName}</span>
            <span>{booking.players} {t('company.bookings.players_count')}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Did they escape? */}
        <div className="mb-5">
          <label className="block text-sm text-brand-text-secondary mb-2">
            {t('company.bookings.did_escape')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEscaped(true)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                escaped
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-brand-bg border-white/10 text-brand-text-secondary hover:border-green-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('company.bookings.yes_escaped')}
            </button>
            <button
              type="button"
              onClick={() => setEscaped(false)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                !escaped
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-brand-bg border-white/10 text-brand-text-secondary hover:border-red-500/20'
              }`}
            >
              <XCircle className="w-4 h-4" />
              {t('company.bookings.no_escaped')}
            </button>
          </div>
        </div>

        {/* Escape time (only if escaped) */}
        {escaped && (
          <div className="mb-4">
            <label className="block text-sm text-brand-text-secondary mb-1.5 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              {t('company.bookings.escape_time')}
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="120"
                value={escapeTime}
                onChange={(e) => setEscapeTime(e.target.value)}
                placeholder={t('company.bookings.escape_time_placeholder')}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brand-text-muted">{t('cx.common.min')}</span>
            </div>
          </div>
        )}

        {/* Hints used */}
        <div className="mb-6">
          <label className="block text-sm text-brand-text-secondary mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            {t('company.bookings.hints_used')}
          </label>
          <input
            type="number"
            min="0"
            max="20"
            value={hintsUsed}
            onChange={(e) => setHintsUsed(e.target.value)}
            placeholder={t('company.bookings.hints_placeholder')}
            className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
          />
        </div>

        {/* Badge info note */}
        <div className="bg-brand-gold/5 border border-brand-gold/10 rounded-xl p-3 mb-5 text-xs text-brand-text-secondary flex items-start gap-2">
          <Award className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
          <span>{t('company.bookings.badge_auto_info')}</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full btn-primary py-3! flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t('company.bookings.complete_and_verify')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function RescheduleBookingModal({
  companyId,
  booking,
  rooms,
  rescheduleBooking,
  onClose,
}: {
  companyId: string;
  booking: any;
  rooms: any[];
  rescheduleBooking: any;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Find the room for this booking to get its slots
  const bookingRoom = rooms.find((r: any) => r._id === booking.roomId);

  // Fetch available slots for the selected date
  const slots = useQuery(
    api.companies.getRoomSlots,
    booking.roomId && newDate ? { roomId: booking.roomId as any, date: newDate } : 'skip'
  );

  const defaultSlots = bookingRoom?.defaultTimeSlots || [];

  const availableSlots = useMemo(() => {
    const sort = (a: any, b: any) => {
      const aIsMidnight = a.time.startsWith('00:') || a.time.startsWith('00.');
      const bIsMidnight = b.time.startsWith('00:') || b.time.startsWith('00.');
      if (aIsMidnight && !bIsMidnight) return 1;
      if (!aIsMidnight && bIsMidnight) return -1;
      return a.time.localeCompare(b.time);
    };
    if (slots && slots.length > 0) {
      return slots
        .filter((s: any) => s.available)
        .map((s: any) => ({ time: s.time, price: s.price }))
        .sort(sort);
    }
    if (defaultSlots.length > 0) {
      return [...defaultSlots].sort(sort);
    }
    return [];
  }, [slots, defaultSlots]);

  // Today's date  for the min attribute
  const today = localDateKey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setError('');
    setLoading(true);
    try {
      await rescheduleBooking({
        companyId: companyId as any,
        bookingId: booking._id as any,
        newDate,
        newTime,
      });
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, t, 'company.bookings.reschedule_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-400" />
            {t('company.bookings.reschedule_title')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current booking summary */}
        <div className="bg-brand-bg rounded-xl p-3 mb-5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-brand-red-light">{booking.time}</span>
            <span className="font-medium">{booking.roomTitle}</span>
          </div>
          <div className="text-brand-text-muted flex items-center gap-3">
            <span>{booking.playerName}</span>
            <span>{booking.date}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Date */}
          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">
              {t('company.bookings.new_date')}
            </label>
            <input
              type="date"
              value={newDate}
              min={today}
              onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden scheme-dark"
              required
            />
          </div>

          {/* New Time */}
          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">
              {t('company.bookings.new_time')}
            </label>
            {newDate && availableSlots.length > 0 ? (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {availableSlots.map((slot: any) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setNewTime(slot.time)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        newTime === slot.time
                          ? 'bg-brand-red border-brand-red text-white'
                          : 'bg-brand-bg border-white/10 text-brand-text-secondary hover:border-brand-red/40 hover:text-white'
                      }`}
                    >
                      <span>{slot.time}</span>
                      <span className="block text-[10px] opacity-60">€{slot.price}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-text-secondary mb-1">{t('company.bookings.custom_time')}</p>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-red focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
                  required
                />
                {newDate && (
                  <p className="text-xs text-brand-text-secondary mt-1">
                    {t('company.bookings.no_slots_manual')}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newDate || !newTime}
            className="w-full btn-primary py-3! flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                {t('company.bookings.reschedule_confirm')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

/** Price for a group: the slot's (or room's) group price when set, else per person. */
function suggestTotal(prefill: SlotPrefill, room: any, players: number) {
  const groups = prefill.pricePerGroup || room?.pricePerGroup;
  const match = Array.isArray(groups) ? groups.find((g: any) => g.players === players) : null;
  if (match) return match.price;
  const each = prefill.price ?? room?.price ?? 0;
  return Math.round(each * players * 100) / 100;
}

function CreateBookingModal({
  companyId,
  rooms,
  prefill,
  onClose,
  onBlockInstead,
}: {
  companyId: string;
  rooms: any[];
  prefill: SlotPrefill;
  onClose: () => void;
  onBlockInstead: () => void;
}) {
  const createBooking = useCompanyMutation(api.companies.createAdminBooking);
  const { t } = useTranslation();
  const date = prefill.date;
  const prefRoom = rooms.find((r) => r._id === prefill.roomId);
  const [form, setForm] = useState({
    roomId: prefill.roomId || rooms[0]?._id || '',
    time: prefill.time,
    players: 2,
    playerName: '',
    playerContact: '',
    playerPhone: '',
    notes: '',
    total: prefill.time ? suggestTotal(prefill, prefRoom, 2) : 0,
  });
  const [totalTouched, setTotalTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fromSlot = !!(prefill.roomId && prefill.time);
  const dt = new Date(date + 'T12:00:00');
  const dateLabel = `${dt.getDate()} ${t(`common.month_${dt.getMonth() + 1}`)} ${dt.getFullYear()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createBooking({
        companyId: companyId as any,
        roomId: form.roomId as any,
        date,
        time: form.time,
        players: form.players,
        playerName: form.playerName,
        playerContact: form.playerContact || undefined,
        playerPhone: form.playerPhone || undefined,
        notes: form.notes || undefined,
        total: form.total,
      });
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, t, 'company.bookings.failed_create'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{t('company.bookings.new_booking')}</h2>
            <p className="text-xs text-brand-text-secondary">
              {dateLabel}
              {fromSlot && prefRoom ? ` · ${prefRoom.title} · ${slotRange(prefill.time, prefRoom)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg" aria-label={t('cx.common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.room')}</label>
            <select
              value={form.roomId}
              onChange={(e) => {
                const room = rooms.find((r) => r._id === e.target.value);
                setForm({
                  ...form,
                  roomId: e.target.value,
                  total: totalTouched ? form.total : suggestTotal({ ...prefill, price: undefined, pricePerGroup: undefined }, room, form.players),
                });
              }}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
              required
            >
              <option value="">{t('company.bookings.select_room')}</option>
              {rooms.filter((r) => r.isActive !== false).map((r: any) => (
                <option key={r._id} value={r._id}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.time')}</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.players')}</label>
              <input
                type="number"
                min="1"
                value={form.players}
                onChange={(e) => {
                  const players = parseInt(e.target.value) || 1;
                  const room = rooms.find((r) => r._id === form.roomId);
                  const pf = form.roomId === prefill.roomId ? prefill : { ...prefill, price: undefined, pricePerGroup: undefined };
                  setForm({ ...form, players, total: totalTouched ? form.total : suggestTotal(pf, room, players) });
                }}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.total_eur')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total}
                onChange={(e) => {
                  setTotalTouched(true);
                  setForm({ ...form, total: parseFloat(e.target.value) || 0 });
                }}
                className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.player_name')}</label>
            <input
              type="text"
              value={form.playerName}
              onChange={(e) => setForm({ ...form, playerName: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
              placeholder={t('company.bookings.customer_name')}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.email')}</label>
            <input
              type="email"
              value={form.playerContact}
              onChange={(e) => setForm({ ...form, playerContact: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
              placeholder="player@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.phone')}</label>
            <input
              type="tel"
              value={form.playerPhone}
              onChange={(e) => setForm({ ...form, playerPhone: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
              placeholder="+30 6XX XXX XXXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.notes_optional')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden resize-none"
              placeholder={t('company.bookings.any_notes')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3! flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('company.bookings.create_booking')
            )}
          </button>
          <button
            type="button"
            onClick={onBlockInstead}
            className="w-full text-sm text-brand-text-secondary hover:text-white flex items-center justify-center gap-1.5 py-1"
          >
            <Ban className="w-3.5 h-3.5" /> {t('cx.bcal.block_instead')}
          </button>
        </form>
      </div>
    </div>
  );
}

function ExternalBlockModal({
  companyId,
  rooms,
  prefill,
  onClose,
}: {
  companyId: string;
  rooms: any[];
  prefill: SlotPrefill;
  onClose: () => void;
}) {
  const createBlock = useCompanyMutation(api.companies.createExternalBlock);
  const { t } = useTranslation();
  const date = prefill.date;
  const dt = new Date(date + 'T12:00:00');
  const dateLabel = `${dt.getDate()} ${t(`common.month_${dt.getMonth() + 1}`)} ${dt.getFullYear()}`;
  const [form, setForm] = useState({
    roomId: prefill.roomId || rooms[0]?._id || '',
    time: prefill.time,
    externalSource: 'phone',
    playerName: '',
    players: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch available slots for the selected room + date
  const slots = useQuery(
    api.companies.getRoomSlots,
    form.roomId ? { roomId: form.roomId as any, date } : 'skip'
  );

  // Get the selected room's default time slots as fallback
  const selectedRoom = rooms.find((r: any) => r._id === form.roomId);
  const defaultSlots = selectedRoom?.defaultTimeSlots || [];

  // Available slots: use fetched slots if they exist, otherwise show defaults
  const availableSlots = useMemo(() => {
    // Sort treating midnight (00:xx) as end-of-day
    const sort = (a: any, b: any) => {
      const aIsMidnight = a.time.startsWith('00:') || a.time.startsWith('00.');
      const bIsMidnight = b.time.startsWith('00:') || b.time.startsWith('00.');
      if (aIsMidnight && !bIsMidnight) return 1;
      if (!aIsMidnight && bIsMidnight) return -1;
      return a.time.localeCompare(b.time);
    };
    if (slots && slots.length > 0) {
      return slots
        .filter((s: any) => s.available)
        .map((s: any) => ({ time: s.time, price: s.price }))
        .sort(sort);
    }
    // Fallback to room's default operating slots
    if (defaultSlots.length > 0) {
      return [...defaultSlots].sort(sort);
    }
    return [];
  }, [slots, defaultSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createBlock({
        companyId: companyId as any,
        roomId: form.roomId as any,
        date,
        time: form.time,
        externalSource: form.externalSource,
        playerName: form.playerName || undefined,
        players: form.players || undefined,
        notes: form.notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, t, 'company.bookings.failed_block'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{t('company.bookings.block_external')}</h2>
            <p className="text-xs text-brand-text-secondary">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.room')}</label>
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
              required
            >
              <option value="">{t('company.bookings.select_room')}</option>
              {rooms.filter((r) => r.isActive !== false).map((r: any) => (
                <option key={r._id} value={r._id}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.time')}</label>
            {availableSlots.length > 0 ? (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {availableSlots.map((slot: any) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setForm({ ...form, time: slot.time })}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        form.time === slot.time
                          ? 'bg-brand-red border-brand-red text-white'
                          : 'bg-brand-bg border-white/10 text-brand-text-secondary hover:border-brand-red/40 hover:text-white'
                      }`}
                    >
                      <span>{slot.time}</span>
                      <span className="block text-[10px] opacity-60">€{slot.price}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-text-secondary mb-1">{t('company.bookings.custom_time')}</p>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-red focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
                  required
                />
                <p className="text-xs text-brand-text-secondary mt-1">
                  {t('company.bookings.no_slots_manual')}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.source')}</label>
            <select
              value={form.externalSource}
              onChange={(e) => setForm({ ...form, externalSource: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-brand-red focus:outline-hidden"
            >
              <option value="phone">{t('company.bookings.source_phone')}</option>
              <option value="walkin">{t('company.bookings.source_walkin')}</option>
              <option value="private_event">{t('company.bookings.source_private')}</option>
              <option value="other">{t('company.bookings.source_other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.customer_optional')}</label>
            <input
              type="text"
              value={form.playerName}
              onChange={(e) => setForm({ ...form, playerName: e.target.value })}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden"
              placeholder={t('company.bookings.customer_name')}
            />
          </div>

          <div>
            <label className="block text-sm text-brand-text-secondary mb-1.5">{t('company.bookings.notes_optional')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden resize-none"
              placeholder={t('company.bookings.additional_details')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3! flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('company.bookings.block_slot')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
