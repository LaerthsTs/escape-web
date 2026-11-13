'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useConvex } from 'convex/react';
import { useCompanyQuery, useCompanyAuth, useCompanyPath, uiLocale, localDateKey } from '@/lib/companyAuth';
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { useToast } from '@/components/company/Toast';
import {
  RoomSlotRow,
  SlotWeekCalendar,
  SlotLegend,
  effectiveSlots,
  isClosedWeekday,
  toSave,
  useSetSlots,
} from '@/components/company/SlotBoard';
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Lock,
  DoorOpen,
  Plus,
  X,
  Loader2,
  Info,
  CalendarDays,
  LayoutGrid,
  List,
} from 'lucide-react';

type View = 'week' | 'day';
const VIEW_KEY = 'unlocked_slots_view';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00');
  d.setTime(d.getTime() + n * DAY_MS);
  return localDateKey(d);
}

export default function SlotsPage() {
  return (
    <Suspense fallback={null}>
      <SlotsBoard />
    </Suspense>
  );
}

function SlotsBoard() {
  const { t, language } = useTranslation();
  const { company } = useCompanyAuth();
  const p = useCompanyPath();
  const searchParams = useSearchParams();
  const companyId = company?.id;
  const today = localDateKey();

  const [date, setDate] = useState(today);
  const [stripStart, setStripStart] = useState(today);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [view, setViewState] = useState<View>('week');
  const highlightRoom = searchParams.get('room');
  const stripRef = useRef<HTMLDivElement>(null);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  useEffect(() => {
    let v: View | null = null;
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'week' || saved === 'day') v = saved;
    } catch {}
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setDate(d);
      setStripStart(d < today ? d : today);
      v = 'day';
    }
    const qv = searchParams.get('view');
    if (qv === 'week' || qv === 'day') v = qv;
    else if (searchParams.get('room')) v = 'week';
    if (v) setViewState(v);
  }, [searchParams, today]);

  const rooms = useCompanyQuery(api.companies.getRooms, companyId ? { companyId: companyId as any } : 'skip');
  const bookings = useCompanyQuery(
    api.companies.getBookingsByDate,
    companyId ? { companyId: companyId as any, date } : 'skip'
  );

  const bookableRooms = useMemo(
    () => (rooms || []).filter((r: any) => !r.photosOnly && r.isActive !== false),
    [rooms]
  );
  const inactiveCount = (rooms || []).filter((r: any) => !r.photosOnly && r.isActive === false).length;

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(stripStart, i)), [stripStart]);
  const locale = uiLocale(language);

  const pickDate = (d: string) => {
    setDate(d);
    if (d < stripStart || d > addDays(stripStart, 13)) setStripStart(d);
  };

  const longDate = new Date(date + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('cx.slots.title')}</h1>
          <p className="text-brand-text-secondary mt-1 text-sm">
            {view === 'week' ? t('cx.cal.subtitle') : t('cx.slots.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-brand-surface border border-white/5 rounded-xl p-1" role="tablist">
            {([
              { v: 'week', label: t('cx.cal.view_week'), Icon: LayoutGrid },
              { v: 'day', label: t('cx.cal.view_day'), Icon: List },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? 'bg-brand-red text-white' : 'text-brand-text-secondary hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRangeOpen(true)}
            disabled={bookableRooms.length === 0}
            title={t('cx.slots.range_button')}
            className="btn-ghost text-sm flex items-center justify-center gap-2 py-2! px-3! disabled:opacity-50"
          >
            <CalendarRange className="w-4 h-4" />
            <span className="hidden sm:inline">{t('cx.slots.range_button')}</span>
          </button>
        </div>
      </div>

      {view === 'day' && (
      <>
      {/* Date strip */}
      <div className="bg-brand-surface rounded-2xl border border-white/5 p-3 mb-4 sticky top-14 md:top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStripStart(addDays(stripStart, -7))}
            className="p-2 rounded-lg hover:bg-white/5 shrink-0"
            aria-label={t('cx.slots.prev_week')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div ref={stripRef} className="flex-1 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
            {days.map((d) => {
              const dt = new Date(d + 'T12:00:00');
              const selected = d === date;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`shrink-0 w-14 py-2 rounded-xl flex flex-col items-center transition-all ${
                    selected
                      ? 'bg-brand-red text-white'
                      : isToday
                      ? 'bg-brand-red/15 text-brand-red-light'
                      : 'hover:bg-white/5 text-brand-text-secondary'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wide">
                    {isToday ? t('cx.slots.today_short') : dt.toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold leading-tight">{dt.getDate()}</span>
                  <span className="text-[10px] opacity-70">{dt.toLocaleDateString(locale, { month: 'short' })}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStripStart(addDays(stripStart, 7))}
            className="p-2 rounded-lg hover:bg-white/5 shrink-0"
            aria-label={t('cx.slots.next_week')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1">
          <p className="text-sm font-semibold capitalize">{longDate}</p>
          <div className="flex items-center gap-2">
            {date !== today && (
              <button
                onClick={() => {
                  setDate(today);
                  setStripStart(today);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                {t('cx.slots.today')}
              </button>
            )}
            <label className="relative text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> {t('cx.slots.other_date')}
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && pickDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer scheme-dark"
                aria-label={t('cx.slots.other_date')}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-secondary mb-4 px-1">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> {t('cx.slots.hint')}
        </span>
        <SlotLegend />
      </div>
      </>
      )}

      {/* Rooms */}
      {rooms === undefined ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-brand-surface border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : bookableRooms.length === 0 ? (
        <div className="text-center py-16 bg-brand-surface rounded-2xl border border-white/5">
          <DoorOpen className="w-12 h-12 mx-auto mb-3 text-brand-text-secondary/30" />
          <p className="font-semibold mb-1">{t('cx.slots.no_rooms_title')}</p>
          <p className="text-sm text-brand-text-secondary mb-5">{t('cx.slots.no_rooms_desc')}</p>
          <Link href={p('/company/rooms/new')} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> {t('company.dashboard.add_room')}
          </Link>
        </div>
      ) : view === 'week' ? (
        <div className="space-y-3">
          <SlotWeekCalendar rooms={bookableRooms} companyId={companyId} initialRoomId={highlightRoom} />
          {inactiveCount > 0 && (
            <p className="text-xs text-brand-text-secondary px-1">
              {t('cx.slots.inactive_hidden', { count: String(inactiveCount) })}{' '}
              <Link href={p('/company/rooms')} className="text-brand-red-light hover:underline">
                {t('company.nav.rooms')}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookableRooms.map((room: any) => (
            <RoomSlotRow
              key={room._id}
              room={room}
              date={date}
              bookings={bookings}
              highlight={highlightRoom === room._id}
            />
          ))}
          {inactiveCount > 0 && (
            <p className="text-xs text-brand-text-secondary px-1">
              {t('cx.slots.inactive_hidden', { count: String(inactiveCount) })}{' '}
              <Link href={p('/company/rooms')} className="text-brand-red-light hover:underline">
                {t('company.nav.rooms')}
              </Link>
            </p>
          )}
        </div>
      )}

      {rangeOpen && (
        <RangeModal
          rooms={bookableRooms}
          initialDate={date}
          onClose={() => setRangeOpen(false)}
        />
      )}
    </div>
  );
}

function RangeModal({
  rooms,
  initialDate,
  onClose,
}: {
  rooms: any[];
  initialDate: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const convex = useConvex();
  const setSlots = useSetSlots();
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [mode, setMode] = useState<'close' | 'open'>('close');
  const [selected, setSelected] = useState<string[]>(rooms.map((r) => r._id));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const dayCount = from && to && to >= from ? Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / DAY_MS) + 1 : 0;
  const tooLong = dayCount > 92;

  const run = async () => {
    setError('');
    if (!dayCount) return setError(t('cx.range.bad_dates'));
    if (tooLong) return setError(t('cx.range.too_long'));
    if (selected.length === 0) return setError(t('cx.range.pick_room'));
    setRunning(true);
    let changed = 0;
    let done = 0;
    const total = dayCount * selected.length;
    try {
      for (let i = 0; i < dayCount; i++) {
        const date = addDays(from, i);
        for (const roomId of selected) {
          const room = rooms.find((r) => r._id === roomId);
          done++;
          setProgress(t('cx.range.progress', { done: String(done), total: String(total) }));
          if (!room || isClosedWeekday(room, date)) continue;
          const custom = await convex.query(api.companies.getRoomSlots, { roomId: room._id, date });
          const current = effectiveSlots(room, custom);
          const next = current.map((s) => ({ ...s, available: mode === 'open' }));
          const diff = current.filter((s, idx) => s.available !== next[idx].available).length;
          if (diff === 0) continue;
          await setSlots({ roomId: room._id, date, slots: toSave(next, room) });
          changed += diff;
        }
      }
      toast({
        kind: 'success',
        message: t(mode === 'close' ? 'cx.range.done_closed' : 'cx.range.done_opened', {
          count: String(changed),
          days: String(dayCount),
        }),
        duration: 5000,
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, t, 'cx.slots.save_failed'));
    } finally {
      setRunning(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:px-4" onClick={running ? undefined : onClose}>
      <div
        className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-brand-red-light" /> {t('cx.range.title')}
          </h2>
          <button onClick={onClose} disabled={running} className="p-1 hover:bg-white/5 rounded-lg" aria-label={t('cx.common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-brand-text-secondary mb-5">{t('cx.range.desc')}</p>

        {/* Mode */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['close', 'open'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                mode === m
                  ? m === 'close'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'border-white/10 text-brand-text-secondary hover:border-white/20'
              }`}
            >
              {t(m === 'close' ? 'cx.range.mode_close' : 'cx.range.mode_open')}
            </button>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="block text-sm text-brand-text-secondary mb-1.5">{t('cx.range.from')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                if (to < e.target.value) setTo(e.target.value);
              }}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-brand-red focus:outline-hidden scheme-dark"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-brand-text-secondary mb-1.5">{t('cx.range.to')}</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-brand-red focus:outline-hidden scheme-dark"
            />
          </label>
        </div>

        {/* Rooms */}
        {rooms.length > 1 && (
          <div className="mb-4">
            <span className="block text-sm text-brand-text-secondary mb-1.5">{t('cx.range.rooms')}</span>
            <div className="space-y-1.5">
              {rooms.map((r) => (
                <label key={r._id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-bg border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(r._id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, r._id] : prev.filter((id) => id !== r._id)))
                    }
                    className="accent-brand-red w-4 h-4"
                  />
                  <span className="text-sm truncate">{r.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {mode === 'close' && (
          <p className="text-xs text-brand-text-secondary bg-brand-bg/60 rounded-xl px-3 py-2 mb-4">
            {t('cx.range.bookings_kept')}
          </p>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">{error}</div>
        )}

        <button
          onClick={run}
          disabled={running}
          className="w-full btn-primary py-3! flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {progress}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {t(mode === 'close' ? 'cx.range.submit_close' : 'cx.range.submit_open', {
                days: String(dayCount || 0),
              })}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
