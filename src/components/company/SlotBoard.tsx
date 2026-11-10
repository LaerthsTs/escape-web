'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import { useCompanyPath, uiLocale, localDateKey } from '@/lib/companyAuth';
import { friendlyError } from '@/lib/errors';
import { slotSortKey, isSlotPast, useNow } from '@/lib/slotTime';
import { useToast } from './Toast';
import {
  DoorOpen,
  Lock,
  Unlock,
  CalendarX,
  Clock,
  Plus,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/*
 * How availability works (mirrors convex/widget.ts getRoomAvailability and the
 * player booking page):
 *  - if a date has its own timeSlots rows, those are the slots for that date;
 *  - otherwise the room's defaultTimeSlots apply, all open;
 *  - a slot with available:false is closed; a slot with a booking is taken;
 *  - on a weekday outside room.operatingDays the room is closed all day;
 *  - once a slot's start time has passed it counts as closed (shown greyed,
 *    can't be toggled, and the player booking page no longer offers it).
 * Closing/opening means writing the date's slot list with setSlots. When the
 * result equals the defaults again we clear the date (empty list), so the room
 * keeps following its normal weekly schedule.
 */

export { slotSortKey };

export type Slot = {
  time: string;
  price: number;
  available: boolean;
  pricePerGroup?: { players: number; price: number }[];
};

const byTime = (a: { time: string }, b: { time: string }) => slotSortKey(a.time) - slotSortKey(b.time);

function normalize(rows: any[]): Slot[] {
  return rows.map((r) => ({
    time: r.time,
    price: r.price,
    available: r.available,
    ...(r.pricePerGroup ? { pricePerGroup: r.pricePerGroup } : {}),
  }));
}

export function effectiveSlots(room: any, custom: any[] | undefined | null): Slot[] {
  if (custom && custom.length > 0) return normalize(custom).sort(byTime);
  return ((room?.defaultTimeSlots || []) as { time: string; price: number }[])
    .filter((s) => s.time)
    .map((s) => ({ time: s.time, price: s.price, available: true }))
    .sort(byTime);
}

export function isClosedWeekday(room: any, date: string) {
  const dow = new Date(date + 'T00:00:00').getDay();
  return Array.isArray(room?.operatingDays) && !room.operatingDays.includes(dow);
}

function matchesDefaults(slots: Slot[], room: any) {
  const defaults = ((room?.defaultTimeSlots || []) as { time: string; price: number }[]).filter((s) => s.time);
  if (defaults.length === 0 || defaults.length !== slots.length) return false;
  return slots.every((s) => {
    const d = defaults.find((x) => x.time === s.time);
    return d && s.available && !s.pricePerGroup && d.price === s.price;
  });
}

/** What to send to setSlots: an empty list puts the date back on the default schedule. */
export function toSave(next: Slot[], room: any): Slot[] {
  return matchesDefaults(next, room) ? [] : next;
}

/** setSlots with an optimistic update, so a tap shows instantly. */
export function useSetSlots() {
  return useMutation(api.companies.setSlots).withOptimisticUpdate((store, args) => {
    store.setQuery(
      api.companies.getRoomSlots,
      { roomId: args.roomId, date: args.date },
      args.slots.map((s, i) => ({
        _id: `optimistic-${i}` as any,
        _creationTime: Date.now(),
        roomId: args.roomId,
        date: args.date,
        ...s,
      })) as any
    );
  });
}

export type SlotState = 'open' | 'closed' | 'booked' | 'past';

/** Everything one room needs for one day: slots, states and the open/close actions. */
export function useDaySlots(room: any, date: string, bookings: any[] | undefined, now: Date) {
  const { t } = useTranslation();
  const toast = useToast();
  const custom = useQuery(api.companies.getRoomSlots, { roomId: room._id, date });
  const setSlots = useSetSlots();
  const [busy, setBusy] = useState(false);

  const slots = useMemo(() => (custom === undefined ? null : effectiveSlots(room, custom)), [custom, room]);

  const booked = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of bookings || []) {
      if (b.roomId === room._id && b.date === date && b.status !== 'cancelled') m.set(b.time, b);
    }
    return m;
  }, [bookings, room._id, date]);

  const weekdayClosed = isClosedWeekday(room, date);

  const stateOf = (s: Slot): SlotState =>
    booked.has(s.time) ? 'booked' : isSlotPast(date, s.time, now) ? 'past' : s.available ? 'open' : 'closed';

  const save = async (next: Slot[], undoTo: Slot[] | null, message: string) => {
    setBusy(true);
    try {
      await setSlots({ roomId: room._id, date, slots: toSave(next, room) });
      toast({
        kind: 'success',
        message,
        action: undoTo
          ? { label: t('cx.slots.undo'), onClick: () => void save(undoTo, null, t('cx.slots.restored')) }
          : undefined,
      });
    } catch (err) {
      toast({ kind: 'error', message: friendlyError(err, t, 'cx.slots.save_failed') });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (time: string) => {
    if (!slots) return;
    const current = slots.find((s) => s.time === time);
    if (!current) return;
    const st = stateOf(current);
    if (st === 'booked' || st === 'past') return;
    const next = slots.map((s) => (s.time === time ? { ...s, available: !s.available } : s));
    void save(
      next,
      slots,
      t(current.available ? 'cx.slots.closed_one' : 'cx.slots.opened_one', { time, room: room.title })
    );
  };

  /** Open or close every free, not-yet-started time of the day. */
  const setAll = (open: boolean) => {
    if (!slots) return;
    const next = slots.map((s) => {
      const st = stateOf(s);
      return st === 'booked' || st === 'past' ? s : { ...s, available: open };
    });
    void save(next, slots, t(open ? 'cx.slots.opened_all' : 'cx.slots.closed_all', { room: room.title }));
  };

  const states = (slots || []).map(stateOf);
  const counts = {
    open: states.filter((s) => s === 'open').length,
    closed: states.filter((s) => s === 'closed').length,
    booked: booked.size,
    past: states.filter((s) => s === 'past').length,
  };

  // Bookings at times that are not in the slot list (custom times, blocks).
  const extraBooked = [...booked.values()].filter((b) => !slots?.some((s) => s.time === b.time)).sort(byTime);

  return { slots, booked, weekdayClosed, busy, stateOf, toggle, setAll, counts, extraBooked };
}

/** One time button. Open/closed toggle on tap; booked links to the booking; past is inert. */
export function SlotChip({
  slot,
  state,
  booking,
  date,
  onToggle,
  compact = false,
}: {
  slot: { time: string };
  state: SlotState;
  booking?: any;
  date: string;
  onToggle?: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const p = useCompanyPath();
  const size = compact ? 'min-h-11 px-1.5 py-1.5' : 'min-h-14 px-2 py-2';
  const timeCls = compact ? 'text-sm' : '';

  if (state === 'booked') {
    return (
      <Link
        href={p(`/company/bookings?date=${date}`)}
        title={t('cx.slots.booked_by', { name: booking?.playerName || '' })}
        className={`${size} rounded-xl border border-blue-500/30 bg-blue-500/10 flex flex-col items-center justify-center text-center hover:bg-blue-500/20 transition-colors`}
      >
        <span className={`font-bold text-blue-300 leading-tight ${timeCls}`}>{slot.time}</span>
        <span className="text-[10px] text-blue-300/80 truncate max-w-full flex items-center gap-0.5">
          <User className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">
            {booking?.source === 'external' ? t('cx.slots.blocked') : booking?.playerName || t('cx.slots.booked')}
          </span>
        </span>
      </Link>
    );
  }

  if (state === 'past') {
    return (
      <div
        title={t('cx.slots.past_title')}
        aria-disabled="true"
        className={`${size} rounded-xl border border-dashed border-white/10 bg-white/2 flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed`}
      >
        <span className={`font-semibold text-brand-text-secondary leading-tight ${timeCls}`}>{slot.time}</span>
        <span className="text-[10px] text-brand-text-secondary flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" /> {t('cx.slots.past')}
        </span>
      </div>
    );
  }

  const open = state === 'open';
  return (
    <button
      onClick={onToggle}
      aria-pressed={open}
      aria-label={t(open ? 'cx.slots.aria_close' : 'cx.slots.aria_open', { time: slot.time })}
      title={t(open ? 'cx.slots.aria_close' : 'cx.slots.aria_open', { time: slot.time })}
      className={`${size} w-full rounded-xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
        open
          ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
          : 'border-white/10 bg-brand-bg hover:border-white/25'
      }`}
    >
      <span
        className={`font-bold leading-tight ${timeCls} ${
          open ? 'text-emerald-300' : 'text-brand-text-secondary line-through decoration-1'
        }`}
      >
        {slot.time}
      </span>
      <span className={`text-[10px] flex items-center gap-0.5 ${open ? 'text-emerald-300/80' : 'text-brand-text-secondary'}`}>
        {open ? (
          t('cx.slots.open')
        ) : (
          <>
            <Lock className="w-2.5 h-2.5" /> {t('cx.slots.closed')}
          </>
        )}
      </span>
    </button>
  );
}

export function SlotLegend() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-text-secondary">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> {t('cx.slots.open')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-white/30" /> {t('cx.slots.closed')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> {t('cx.slots.booked')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full border border-dashed border-white/40" /> {t('cx.slots.legend_past')}
      </span>
    </div>
  );
}

function RoomThumb({ room }: { room: any }) {
  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-bg shrink-0 flex items-center justify-center">
      {room.image && !String(room.image).startsWith('/placeholder') ? (
        <img src={room.image} alt="" className="w-full h-full object-cover" />
      ) : (
        <DoorOpen className="w-5 h-5 text-brand-text-secondary/40" />
      )}
    </div>
  );
}

/** One room, one day: the "day view" row. */
export function RoomSlotRow({
  room,
  date,
  bookings,
  highlight = false,
}: {
  room: any;
  date: string;
  bookings: any[] | undefined;
  highlight?: boolean;
}) {
  const { t } = useTranslation();
  const p = useCompanyPath();
  const now = useNow();
  const { slots, booked, weekdayClosed, busy, stateOf, toggle, setAll, counts, extraBooked } = useDaySlots(
    room,
    date,
    bookings,
    now
  );

  return (
    <div
      className={`bg-brand-surface rounded-2xl border p-4 md:p-5 transition-colors ${
        highlight ? 'border-brand-red/40 ring-1 ring-brand-red/20' : 'border-white/5'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <RoomThumb room={room} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{room.title}</p>
          {slots && !weekdayClosed && slots.length > 0 && (
            <p className="text-xs text-brand-text-secondary">
              {t('cx.slots.summary', {
                open: String(counts.open),
                closed: String(counts.closed + counts.past),
                booked: String(counts.booked),
              })}
            </p>
          )}
        </div>
        {slots && !weekdayClosed && (
          <div className="flex gap-1.5 shrink-0">
            {counts.open > 0 && (
              <button
                onClick={() => setAll(false)}
                disabled={busy}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-300 text-brand-text-secondary transition-colors disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('cx.slots.close_day')}</span>
                <span className="sm:hidden">{t('cx.slots.close_short')}</span>
              </button>
            )}
            {counts.closed > 0 && (
              <button
                onClick={() => setAll(true)}
                disabled={busy}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-300 text-brand-text-secondary transition-colors disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('cx.slots.open_day')}</span>
                <span className="sm:hidden">{t('cx.slots.open_short')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {slots === null ? (
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : weekdayClosed ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-brand-text-secondary bg-brand-bg/60 rounded-xl px-3 py-2.5">
          <CalendarX className="w-4 h-4 shrink-0" />
          <span className="flex-1">{t('cx.slots.weekday_closed')}</span>
          <Link href={p(`/company/rooms/${room._id}/edit`)} className="text-brand-red-light hover:underline text-xs font-medium">
            {t('cx.slots.change_schedule')}
          </Link>
        </div>
      ) : slots.length === 0 && extraBooked.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-brand-text-secondary bg-brand-bg/60 rounded-xl px-3 py-2.5">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="flex-1">{t('cx.slots.no_times')}</span>
          <Link
            href={p(`/company/rooms/${room._id}/availability?date=${date}`)}
            className="inline-flex items-center gap-1 text-brand-red-light hover:underline text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> {t('cx.slots.add_times')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
          {slots.map((s) => (
            <SlotChip
              key={s.time}
              slot={s}
              state={stateOf(s)}
              booking={booked.get(s.time)}
              date={date}
              onToggle={() => toggle(s.time)}
            />
          ))}
          {extraBooked.map((b) => (
            <SlotChip key={`b-${b._id}`} slot={b} state="booked" booking={b} date={date} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Week calendar
// ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00');
  d.setTime(d.getTime() + n * DAY_MS);
  return localDateKey(d);
}

/** Monday of the week that contains `date`. */
export function mondayOf(date: string) {
  const dow = new Date(date + 'T12:00:00').getDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/** Bookings for 7 consecutive days (fixed number of queries, so hooks stay stable). */
function useWeekBookings(companyId: string | undefined, days: string[]) {
  const results: (any[] | undefined)[] = [];
  for (let i = 0; i < 7; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results.push(
      useQuery(api.companies.getBookingsByDate, companyId ? { companyId: companyId as any, date: days[i] } : 'skip')
    );
  }
  return results;
}

function DayCell({
  room,
  date,
  bookings,
  now,
  isToday,
}: {
  room: any;
  date: string;
  bookings: any[] | undefined;
  now: Date;
  isToday: boolean;
}) {
  const { t } = useTranslation();
  const { slots, booked, weekdayClosed, busy, stateOf, toggle, setAll, counts, extraBooked } = useDaySlots(
    room,
    date,
    bookings,
    now
  );

  return (
    <div
      className={`rounded-xl p-1.5 flex flex-col gap-1.5 min-h-24 ${
        isToday ? 'bg-brand-red/5 ring-1 ring-brand-red/25' : 'bg-brand-bg/50'
      }`}
    >
      {slots === null ? (
        [0, 1, 2].map((i) => <div key={i} className="h-11 rounded-xl bg-white/5 animate-pulse" />)
      ) : weekdayClosed ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[11px] text-brand-text-secondary py-3">
          <CalendarX className="w-4 h-4 mb-1 opacity-60" />
          {t('cx.cal.day_closed')}
        </div>
      ) : slots.length === 0 && extraBooked.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-brand-text-secondary py-3">—</div>
      ) : (
        <>
          {slots.map((s) => (
            <SlotChip
              key={s.time}
              slot={s}
              state={stateOf(s)}
              booking={booked.get(s.time)}
              date={date}
              onToggle={() => toggle(s.time)}
              compact
            />
          ))}
          {extraBooked.map((b) => (
            <SlotChip key={`b-${b._id}`} slot={b} state="booked" booking={b} date={date} compact />
          ))}
          {(counts.open > 0 || counts.closed > 0) && (
            <button
              onClick={() => setAll(counts.open === 0)}
              disabled={busy}
              className="mt-auto text-[10px] font-medium py-1 rounded-lg text-brand-text-secondary hover:text-white hover:bg-white/5 disabled:opacity-50"
            >
              {counts.open > 0 ? t('cx.cal.close_day') : t('cx.cal.open_day')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Week calendar of one room's slots (room tabs on top when there are several).
 * Tap a time to open/close it; past times grey out on their own.
 */
export function SlotWeekCalendar({
  rooms,
  companyId,
  initialRoomId,
}: {
  rooms: any[];
  companyId: string | undefined;
  initialRoomId?: string | null;
}) {
  const { t, language } = useTranslation();
  const p = useCompanyPath();
  const now = useNow();
  const today = localDateKey(now);
  const [weekStart, setWeekStart] = useState(() => mondayOf(localDateKey()));
  const [roomId, setRoomId] = useState<string | null>(initialRoomId || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const locale = uiLocale(language);

  useEffect(() => {
    if (initialRoomId) setRoomId(initialRoomId);
  }, [initialRoomId]);

  const room = rooms.find((r) => r._id === roomId) || rooms[0];
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekBookings = useWeekBookings(companyId, days);

  // On phones the week scrolls sideways: bring today into view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const col = el.querySelector<HTMLElement>('[data-today="true"]');
    el.scrollLeft = col ? Math.max(0, col.offsetLeft - 8) : 0;
  }, [weekStart, room?._id]);

  if (!room) return null;

  const first = new Date(days[0] + 'T12:00:00');
  const last = new Date(days[6] + 'T12:00:00');
  const rangeLabel =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()}–${last.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`
      : `${first.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  const isCurrentWeek = weekStart === mondayOf(today);

  return (
    <div className="bg-brand-surface rounded-2xl border border-white/5 p-3 md:p-5">
      {/* Room tabs */}
      {rooms.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-3 -mx-1 px-1">
          {rooms.map((r) => (
            <button
              key={r._id}
              onClick={() => setRoomId(r._id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                r._id === room._id ? 'bg-brand-red text-white' : 'bg-white/5 text-brand-text-secondary hover:text-white'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 rounded-lg hover:bg-white/5"
            aria-label={t('cx.slots.prev_week')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold min-w-0 capitalize">{rangeLabel}</span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 rounded-lg hover:bg-white/5"
            aria-label={t('cx.slots.next_week')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekStart(mondayOf(today))}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
            >
              {t('cx.cal.this_week')}
            </button>
          )}
          {rooms.length === 1 && <span className="hidden sm:block text-sm text-brand-text-secondary truncate max-w-48">{room.title}</span>}
        </div>
      </div>

      {/* Days */}
      <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 scroll-smooth">
        <div className="grid grid-cols-7 gap-1.5 min-w-[616px]">
          {days.map((d, i) => {
            const dt = new Date(d + 'T12:00:00');
            const isToday = d === today;
            const isPastDay = d < today;
            return (
              <div key={d} data-today={isToday ? 'true' : undefined} className={isPastDay ? 'opacity-60' : ''}>
                <Link
                  href={p(`/company/slots?date=${d}&view=day`)}
                  className={`block text-center rounded-lg py-1.5 mb-1.5 transition-colors ${
                    isToday ? 'bg-brand-red text-white' : 'hover:bg-white/5'
                  }`}
                >
                  <span className={`block text-[11px] uppercase tracking-wide ${isToday ? 'text-white/85' : 'text-brand-text-secondary'}`}>
                    {isToday ? t('cx.slots.today_short') : dt.toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <span className="block text-lg font-bold leading-tight">{dt.getDate()}</span>
                </Link>
                <DayCell room={room} date={d} bookings={weekBookings[i]} now={now} isToday={isToday} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <SlotLegend />
        <span className="text-xs text-brand-text-secondary">{t('cx.slots.hint')}</span>
      </div>
    </div>
  );
}
