'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueries } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCompanyQuery, useCompanyPath, localDateKey } from '@/lib/companyAuth';
import { useTranslation } from '@/lib/i18n';
import { slotSortKey, useNow } from '@/lib/slotTime';
import { useDaySlots, effectiveSlots, addDays, mondayOf, type Slot, type SlotState } from './SlotBoard';
import { ChevronLeft, ChevronRight, X, Check, Clock, CheckCircle2, CalendarX, DoorOpen, Plus } from 'lucide-react';

/*
 * Bookings calendar: one column per room (per day in the multi-day views),
 * hours down the side, every time slot drawn as a block at its start time with
 * a height that matches the room's game duration.
 *
 *  green  = free slot (tap to book it, ✕ closes it)
 *  blue   = booked by a player (app or the company's website widget)
 *  navy   = external block or manual booking, source in brackets
 *  red    = closed slot (✓ opens it again)
 *  amber  = waiting for online payment
 *  grey   = start time has passed
 *
 * Slot rules (defaults vs per-date rows, cutoff, closed weekdays) come from
 * useDaySlots in SlotBoard, so this view and the Slots page always agree.
 */

export type CalView = 'day' | '2days' | '3days' | 'week' | 'list';
export const CAL_VIEWS: CalView[] = ['day', '2days', '3days', 'week', 'list'];

const VIEW_DAYS: Record<CalView, number> = { day: 1, '2days': 2, '3days': 3, week: 7, list: 1 };

const HOUR_PX = 64;
const PX_PER_MIN = HOUR_PX / 60;
const AXIS_W = 44;
const DEFAULT_RANGE: [number, number] = [17 * 60, 25 * 60]; // 17:00 to 01:00

/** The dates a view shows for an anchor date. The week view starts on Monday. */
export function viewDays(view: CalView, anchor: string): string[] {
  const n = VIEW_DAYS[view];
  const start = view === 'week' ? mondayOf(anchor) : anchor;
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

/** How far ‹ and › move. */
export function viewStep(view: CalView) {
  return VIEW_DAYS[view];
}

/** "HH:MM" from a slotSortKey style minute count (wraps past midnight). */
function fmtKey(key: number) {
  const m = ((key % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function roomDuration(room: any) {
  const d = Number(room?.duration);
  return Number.isFinite(d) && d > 0 ? d : 60;
}

export function slotRange(time: string, room: any) {
  const start = slotSortKey(time);
  return `${time} - ${fmtKey(start + roomDuration(room))}`;
}

export type BookingKind = 'online' | 'external' | 'manual' | 'pending';

/** Who made a booking, which decides its colour. */
export function bookingKind(b: any): BookingKind {
  if (b.status === 'pending_payment') return 'pending';
  if (b.source === 'external') {
    // The company's own website widget books real customers: same as the app.
    if (String(b.bookingCode || '').startsWith('WEB-') || b.externalSource === 'Website Widget') return 'online';
    return 'external';
  }
  return b.userId ? 'online' : 'manual';
}

/** Readable source for external blocks and manual bookings. */
export function bookingSourceLabel(b: any, t: (k: string) => string): string {
  const kind = bookingKind(b);
  if (kind === 'manual') return t('cx.bcal.manual');
  const raw = String(b.externalSource || '');
  const key = raw.toLowerCase().replace(/[\s-]+/g, '');
  const map: Record<string, string> = {
    escapeall: 'company.bookings.source_escapeall',
    phone: 'company.bookings.source_phone',
    walkin: 'company.bookings.source_walkin',
    private_event: 'company.bookings.source_private',
    privateevent: 'company.bookings.source_private',
    other: 'company.bookings.source_other',
    websitewidget: 'cx.bcal.website',
  };
  if (map[key]) return t(map[key]);
  if (b.source === 'external') return raw || t('company.bookings.external');
  return 'UNLOCKED';
}

// ─────────────────────────────────────────────────────────────
// Toolbar
// ─────────────────────────────────────────────────────────────

export function CalendarToolbar({
  view,
  onView,
  anchor,
  onAnchor,
  views = CAL_VIEWS,
}: {
  view: CalView;
  onView: (v: CalView) => void;
  anchor: string;
  onAnchor: (d: string) => void;
  views?: CalView[];
}) {
  const { t } = useTranslation();
  const today = localDateKey();
  const days = viewDays(view, anchor);
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => t(`common.day_${d}`));
  const month = (d: Date) => t(`common.month_${d.getMonth() + 1}`);

  const first = new Date(days[0] + 'T12:00:00');
  const last = new Date(days[days.length - 1] + 'T12:00:00');
  const dayLabel = (d: Date) => `${d.getDate()} ${DAYS[d.getDay()]}`;
  let title: string;
  if (days.length === 1) {
    title = `${dayLabel(first)}, ${month(first)} ${first.getFullYear()}`;
  } else if (first.getMonth() === last.getMonth()) {
    title = `${t('cx.bcal.range', { from: dayLabel(first), to: dayLabel(last) })}, ${month(first)} ${first.getFullYear()}`;
  } else {
    title = `${t('cx.bcal.range', {
      from: `${dayLabel(first)} ${month(first)}`,
      to: `${dayLabel(last)} ${month(last)}`,
    })} ${last.getFullYear()}`;
  }

  const includesToday = days.includes(today);
  const step = viewStep(view);
  const label: Record<CalView, string> = {
    day: t('cx.bcal.view_day'),
    '2days': t('cx.bcal.view_2days'),
    '3days': t('cx.bcal.view_3days'),
    week: t('cx.bcal.view_week'),
    list: t('cx.bcal.view_list'),
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
      <div className="flex items-center gap-1.5 lg:flex-1">
        <button
          onClick={() => onAnchor(addDays(anchor, -step))}
          aria-label={t('cx.bcal.prev')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAnchor(addDays(anchor, step))}
          aria-label={t('cx.bcal.next')}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAnchor(today)}
          disabled={includesToday && anchor === today}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 disabled:opacity-40"
        >
          {t('cx.bcal.today')}
        </button>
        <input
          type="date"
          value={anchor}
          onChange={(e) => e.target.value && onAnchor(e.target.value)}
          aria-label={t('cx.bcal.pick_date')}
          className="ml-auto lg:ml-1 bg-brand-bg border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white scheme-dark focus:border-brand-red focus:outline-hidden"
        />
      </div>
      <h2 className="text-center font-bold text-lg lg:flex-1">{title}</h2>
      <div className="lg:flex-1 flex lg:justify-end">
        <div className="flex w-full lg:w-auto rounded-lg bg-white/5 p-0.5 overflow-x-auto [scrollbar-width:none]">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              aria-pressed={view === v}
              className={`flex-1 lg:flex-none shrink-0 whitespace-nowrap px-1.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                view === v ? 'bg-brand-red text-white' : 'text-brand-text-secondary hover:text-white'
              }`}
            >
              {label[v]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grid
// ─────────────────────────────────────────────────────────────

/** Bookings for up to 7 days (fixed number of hooks; unused ones skip). */
function useDaysBookings(companyId: string | undefined, days: string[]) {
  const out: (any[] | undefined)[] = [];
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    out.push(useCompanyQuery(api.companies.getBookingsByDate, companyId && d ? { companyId: companyId as any, date: d } : 'skip'));
  }
  return out.slice(0, days.length);
}

export type FreeSlotClick = { room: any; date: string; slot: Slot };

export function BookingCalendarGrid({
  rooms,
  companyId,
  days,
  onFreeSlot,
  onBooking,
  maxHeight = 'max-h-[75vh]',
}: {
  rooms: any[];
  companyId: string | undefined;
  days: string[];
  onFreeSlot: (s: FreeSlotClick) => void;
  onBooking: (b: any) => void;
  maxHeight?: string;
}) {
  const { t } = useTranslation();
  const p = useCompanyPath();
  const now = useNow();
  const today = localDateKey(now);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bookingsByDay = useDaysBookings(companyId, days);

  const live = (b: any) => b.status !== 'cancelled';

  // Active bookable rooms, plus any other room that still has bookings on screen.
  const shownRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          (r.isActive !== false && !r.photosOnly) ||
          bookingsByDay.some((list) => (list || []).some((b) => b.roomId === r._id && live(b)))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, JSON.stringify(bookingsByDay.map((l) => (l || []).map((b) => b._id)))]
  );

  // Each room/day's own slot rows, only to size the hour axis. useDaySlots
  // subscribes to the same queries; the Convex client shares them.
  const slotQueries = useMemo(() => {
    const q: Record<string, { query: typeof api.companies.getRoomSlots; args: { roomId: any; date: string } }> = {};
    for (const r of shownRooms) for (const d of days) q[`${r._id}|${d}`] = { query: api.companies.getRoomSlots, args: { roomId: r._id, date: d } };
    return q;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownRooms.map((r) => r._id).join(','), days.join(',')]);
  const slotRows = useQueries(slotQueries);

  const [rangeStart, rangeEnd] = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    const take = (time: string, room: any) => {
      if (!time) return;
      const k = slotSortKey(time);
      lo = Math.min(lo, k);
      hi = Math.max(hi, k + roomDuration(room));
    };
    for (const r of shownRooms) {
      for (const d of days) {
        const rows = slotRows[`${r._id}|${d}`];
        const list = rows instanceof Error ? undefined : (rows as any[] | undefined);
        for (const s of effectiveSlots(r, list)) take(s.time, r);
      }
    }
    for (const list of bookingsByDay) {
      for (const b of list || []) {
        if (!live(b)) continue;
        take(b.time, shownRooms.find((r) => r._id === b.roomId));
      }
    }
    if (!Number.isFinite(lo)) return DEFAULT_RANGE;
    return [Math.floor(lo / 60) * 60, Math.ceil(hi / 60) * 60] as [number, number];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotRows, bookingsByDay, shownRooms, days]);

  const height = (rangeEnd - rangeStart) * PX_PER_MIN;
  const hours: number[] = [];
  for (let k = rangeStart; k < rangeEnd; k += 60) hours.push(k);

  const multiDay = days.length > 1;
  const cols = shownRooms.length * days.length;
  const colMin = multiDay ? (days.length >= 7 ? 108 : 128) : 150;
  const template = `${AXIS_W}px repeat(${cols}, minmax(${colMin}px, 1fr))`;
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => t(`common.day_${d}`));

  // Start the multi-day views scrolled to today when it is on screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const col = el.querySelector<HTMLElement>('[data-today-col="true"]');
    el.scrollLeft = multiDay && col ? Math.max(0, col.offsetLeft - AXIS_W) : 0;
    el.scrollTop = 0;
  }, [days.join(','), multiDay]);

  if (rooms.length === 0) {
    return (
      <div className="text-center py-14 text-brand-text-secondary">
        <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="mb-3">{t('cx.bcal.no_rooms')}</p>
        <Link href={p('/company/rooms/new')} className="inline-flex items-center gap-1.5 btn-primary text-sm">
          <Plus className="w-4 h-4" /> {t('cx.bcal.add_room')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className={`relative overflow-auto ${maxHeight} rounded-xl border border-white/10 bg-brand-bg/60 overscroll-x-contain [overflow-anchor:none]`}
      >
        <div style={{ minWidth: AXIS_W + cols * colMin }}>
          {/* Header: day labels (multi-day) and room names, stuck to the top */}
          <div className="sticky top-0 z-20 bg-brand-surface border-b border-white/10" style={{ display: 'grid', gridTemplateColumns: template }}>
            <div className="sticky left-0 z-30 bg-brand-surface" style={{ gridRow: multiDay ? 'span 2' : undefined }} />
            {multiDay &&
              days.map((d, di) => {
                const dt = new Date(d + 'T12:00:00');
                const isToday = d === today;
                return (
                  <div
                    key={d}
                    data-today-col={isToday ? 'true' : undefined}
                    className={`text-center text-xs font-semibold py-1.5 ${di > 0 ? 'border-l border-white/20' : ''} ${
                      isToday ? 'bg-brand-red/20 text-white' : 'text-brand-text-secondary'
                    }`}
                    style={{ gridColumn: `span ${shownRooms.length}` }}
                  >
                    {isToday ? `${t('cx.bcal.today')} · ` : ''}
                    {DAYS[dt.getDay()]} {dt.getDate()}/{dt.getMonth() + 1}
                  </div>
                );
              })}
            {days.map((d, di) =>
              shownRooms.map((r, ri) => (
                <div
                  key={`${d}|${r._id}`}
                  title={r.title}
                  className={`px-2 py-2 text-center text-xs sm:text-sm font-semibold truncate ${
                    ri === 0 && di > 0 ? 'border-l border-white/20' : ri > 0 ? 'border-l border-white/5' : ''
                  } ${r.isActive === false ? 'text-brand-text-secondary' : ''}`}
                >
                  {r.title}
                </div>
              ))
            )}
          </div>

          {/* Body: hour axis + one column per room and day */}
          <div style={{ display: 'grid', gridTemplateColumns: template }}>
            <div className="sticky left-0 z-10 bg-brand-surface border-r border-white/10 relative" style={{ height }}>
              {hours.map((k) => (
                <div
                  key={k}
                  className="absolute left-0 right-0 pr-1.5 text-right text-[11px] text-brand-text-secondary -translate-y-1/2 first:translate-y-0"
                  style={{ top: (k - rangeStart) * PX_PER_MIN }}
                >
                  {fmtKey(k).slice(0, 2)}
                </div>
              ))}
            </div>
            {days.map((d, di) =>
              shownRooms.map((r, ri) => (
                <RoomDayColumn
                  key={`${d}|${r._id}`}
                  room={r}
                  date={d}
                  bookings={bookingsByDay[di]}
                  now={now}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  dayEdge={ri === 0 && di > 0}
                  onFreeSlot={onFreeSlot}
                  onBooking={onBooking}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <CalendarLegend />
    </div>
  );
}

function RoomDayColumn({
  room,
  date,
  bookings,
  now,
  rangeStart,
  rangeEnd,
  dayEdge,
  onFreeSlot,
  onBooking,
}: {
  room: any;
  date: string;
  bookings: any[] | undefined;
  now: Date;
  rangeStart: number;
  rangeEnd: number;
  dayEdge: boolean;
  onFreeSlot: (s: FreeSlotClick) => void;
  onBooking: (b: any) => void;
}) {
  const { t } = useTranslation();
  const { slots, booked, weekdayClosed, busy, stateOf, toggle, extraBooked } = useDaySlots(room, date, bookings, now);
  const height = (rangeEnd - rangeStart) * PX_PER_MIN;
  const duration = roomDuration(room);

  const pos = (time: string) => {
    const top = (slotSortKey(time) - rangeStart) * PX_PER_MIN;
    return { top: top + 1, height: Math.max(duration * PX_PER_MIN - 3, 18) };
  };

  // Red line at the current time, in the column's own day (late slots belong to the evening before).
  const midnight = new Date(date + 'T00:00:00').getTime();
  const nowKey = (now.getTime() - midnight) / 60000;
  const showNow = nowKey >= rangeStart && nowKey <= rangeEnd;

  return (
    <div
      className={`relative ${dayEdge ? 'border-l border-white/20' : 'border-l border-white/5'}`}
      style={{
        height,
        backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.07) 0, rgba(255,255,255,0.07) 1px, transparent 1px, transparent ${HOUR_PX / 2}px, rgba(255,255,255,0.025) ${HOUR_PX / 2}px, rgba(255,255,255,0.025) ${HOUR_PX / 2 + 1}px, transparent ${HOUR_PX / 2 + 1}px, transparent ${HOUR_PX}px)`,
      }}
    >
      {slots === null && <div className="absolute inset-1 rounded-lg bg-white/5 animate-pulse" />}

      {weekdayClosed && (
        <div
          className="absolute inset-0 flex items-start justify-center pt-3 text-[11px] font-medium text-brand-text-secondary"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 8px, transparent 8px 16px)' }}
        >
          <span className="flex items-center gap-1 bg-brand-bg/80 rounded-md px-2 py-1">
            <CalendarX className="w-3.5 h-3.5" /> {t('cx.bcal.day_closed')}
          </span>
        </div>
      )}

      {slots &&
        !weekdayClosed &&
        slots.map((s) => {
          const state = stateOf(s);
          const booking = booked.get(s.time);
          return booking ? (
            <BookingBlock key={s.time} booking={booking} room={room} style={pos(s.time)} past={state === 'past'} onClick={() => onBooking(booking)} />
          ) : (
            <SlotBlock
              key={s.time}
              slot={s}
              state={state}
              room={room}
              busy={busy}
              style={pos(s.time)}
              onBook={() => onFreeSlot({ room, date, slot: s })}
              onToggle={() => toggle(s.time)}
            />
          );
        })}

      {/* Bookings at times outside the slot list (custom times, closed weekdays) */}
      {(weekdayClosed ? [...booked.values()] : extraBooked).map((b) => (
        <BookingBlock key={b._id} booking={b} room={room} style={pos(b.time)} past={false} onClick={() => onBooking(b)} />
      ))}

      {showNow && (
        <div className="pointer-events-none absolute left-0 right-0 z-[5] h-0.5 bg-brand-red shadow-[0_0_6px_rgba(220,38,38,0.8)]" style={{ top: (nowKey - rangeStart) * PX_PER_MIN }} />
      )}
    </div>
  );
}

function SlotBlock({
  slot,
  state,
  room,
  busy,
  style,
  onBook,
  onToggle,
}: {
  slot: Slot;
  state: SlotState;
  room: any;
  busy: boolean;
  style: { top: number; height: number };
  onBook: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const range = slotRange(slot.time, room);
  const box = 'absolute left-1 right-1 rounded-md border text-left overflow-hidden';

  if (state === 'past') {
    return (
      <div
        className={`${box} border-dashed border-white/10 bg-white/2 text-brand-text-secondary/70 px-1.5 py-1`}
        style={style}
        title={t('cx.slots.past_title')}
      >
        <span className="text-[11px] font-medium">{range}</span>
      </div>
    );
  }

  if (state === 'closed') {
    return (
      <div className={`${box} border-red-500/50 bg-red-500/20 text-red-100 flex items-start gap-1 px-1.5 py-1`} style={style}>
        <button
          onClick={onToggle}
          disabled={busy}
          title={t('cx.bcal.open_slot', { time: slot.time })}
          aria-label={t('cx.bcal.open_slot', { time: slot.time })}
          className="shrink-0 -m-1 p-1 rounded text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold leading-tight">{range}</span>
          {style.height > 34 && <span className="block text-[10px] opacity-80 leading-tight">{t('cx.bcal.legend_closed')}</span>}
        </div>
      </div>
    );
  }

  // open or cutoff: still free, the company can add a booking.
  const cutoff = state === 'cutoff';
  return (
    <div
      className={`${box} border-emerald-500/45 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 transition-colors`}
      style={style}
    >
      <button
        onClick={onBook}
        className="absolute inset-0 w-full h-full flex flex-col items-start justify-start text-left px-1.5 py-1 pl-6"
        title={t(cutoff ? 'cx.slots.cutoff_title' : 'cx.bcal.new_booking_at', { time: slot.time })}
        aria-label={t('cx.bcal.new_booking_at', { time: slot.time })}
      >
        <span className="flex items-center gap-1 text-[11px] font-semibold leading-tight">
          {range}
          {cutoff && <Clock className="w-3 h-3 opacity-80 shrink-0" />}
        </span>
        {style.height > 34 && <span className="block text-[10px] opacity-75 leading-tight">€{slot.price}</span>}
      </button>
      {!cutoff && (
        <button
          onClick={onToggle}
          disabled={busy}
          title={t('cx.bcal.close_slot', { time: slot.time })}
          aria-label={t('cx.bcal.close_slot', { time: slot.time })}
          className="absolute left-0.5 top-0.5 p-1 rounded text-red-400 hover:bg-red-500/20 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

const KIND_CLS: Record<BookingKind, string> = {
  online: 'border-blue-400/70 bg-blue-600/75 text-white hover:bg-blue-600',
  external: 'border-sky-800 bg-sky-950 text-sky-50 hover:bg-[#0b3a55]',
  manual: 'border-sky-800 bg-sky-950 text-sky-50 hover:bg-[#0b3a55]',
  pending: 'border-amber-400/60 border-dashed bg-amber-500/20 text-amber-100 hover:bg-amber-500/30',
};

function BookingBlock({
  booking,
  room,
  style,
  past,
  onClick,
}: {
  booking: any;
  room: any;
  style: { top: number; height: number };
  past: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const kind = bookingKind(booking);
  const name = booking.playerName || '';
  const source = kind === 'external' || kind === 'manual' ? bookingSourceLabel(booking, t) : '';
  const completed = booking.status === 'completed';
  return (
    <button
      onClick={onClick}
      className={`absolute left-1 right-1 z-[2] flex flex-col items-start justify-start rounded-md border text-left overflow-hidden px-1.5 py-1 shadow-sm transition-colors ${KIND_CLS[kind]} ${
        past && !completed ? 'opacity-80' : ''
      }`}
      style={style}
      title={`${slotRange(booking.time, room)} ${name}${source ? ` (${source})` : ''}`}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold opacity-90 leading-tight">
        {slotRange(booking.time, room)}
        {completed && <CheckCircle2 className="w-3 h-3 shrink-0" />}
        {kind === 'pending' && <Clock className="w-3 h-3 shrink-0" />}
      </span>
      <span className="block max-w-full text-xs font-bold leading-tight truncate">
        {name}
        {source && <span className="font-normal italic opacity-80"> ({source})</span>}
      </span>
      {style.height > 48 && booking.players > 0 && (
        <span className="block text-[10px] opacity-75 leading-tight">
          {booking.players} {t('company.bookings.players_count')}
        </span>
      )}
    </button>
  );
}

export function CalendarLegend() {
  const { t } = useTranslation();
  const item = (cls: string, label: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm border ${cls}`} /> {label}
    </span>
  );
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-secondary">
        {item('border-emerald-500/45 bg-emerald-500/15', t('cx.bcal.legend_free'))}
        {item('border-blue-400/70 bg-blue-600/75', t('cx.bcal.legend_booked'))}
        {item('border-sky-800 bg-sky-950', t('cx.bcal.legend_external'))}
        {item('border-red-500/50 bg-red-500/20', t('cx.bcal.legend_closed'))}
        {item('border-amber-400/60 border-dashed bg-amber-500/20', t('cx.bcal.legend_pending'))}
        {item('border-white/10 border-dashed bg-white/2', t('cx.bcal.legend_past'))}
      </div>
      <span className="text-xs text-brand-text-secondary">{t('cx.bcal.hint')}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard card
// ─────────────────────────────────────────────────────────────

const DASH_VIEWS: CalView[] = ['day', '2days', '3days', 'week'];
const DASH_VIEW_KEY = 'unlocked_dashboard_cal_view';

/**
 * The bookings calendar on the dashboard. Opening/closing a slot works in
 * place; a tap on a free time or a booking goes to the Bookings page, which
 * opens the matching form there (?room=&time= or ?booking=).
 */
export function DashboardBookingCalendar({ rooms, companyId }: { rooms: any[]; companyId: string | undefined }) {
  const router = useRouter();
  const p = useCompanyPath();
  const [anchor, setAnchor] = useState(() => localDateKey());
  const [view, setViewState] = useState<CalView>('day');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASH_VIEW_KEY) as CalView | null;
      if (saved && DASH_VIEWS.includes(saved)) setViewState(saved);
    } catch {}
  }, []);

  const setView = (v: CalView) => {
    setViewState(v);
    try {
      localStorage.setItem(DASH_VIEW_KEY, v);
    } catch {}
  };

  const days = useMemo(() => viewDays(view, anchor), [view, anchor]);

  return (
    <div className="bg-brand-surface rounded-2xl border border-white/5 p-3 md:p-5">
      <CalendarToolbar view={view} onView={setView} anchor={anchor} onAnchor={setAnchor} views={DASH_VIEWS} />
      <BookingCalendarGrid
        rooms={rooms}
        companyId={companyId}
        days={days}
        maxHeight="max-h-[60vh]"
        onFreeSlot={({ room, date, slot }) =>
          router.push(
            p(`/company/bookings?date=${date}&room=${room._id}&time=${encodeURIComponent(slot.time)}&price=${slot.price}`)
          )
        }
        onBooking={(b) => router.push(p(`/company/bookings?date=${b.date}&booking=${b._id}`))}
      />
    </div>
  );
}
