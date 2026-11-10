'use client';

import { useEffect, useState } from 'react';

/**
 * Slot times are "HH:MM" on a "YYYY-MM-DD" date. Times before 06:00 belong to
 * the late-night end of that day (a 00:30 slot on Friday starts on Saturday
 * 00:30), matching how the booking pages sort them.
 */
export function slotSortKey(time: string) {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return ((h < 6 ? h + 24 : h) || 0) * 60 + (m || 0);
}

/** Local start moment of a slot. */
export function slotStart(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map((n) => parseInt(n, 10));
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const start = new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
  if ((h || 0) < 6) start.setDate(start.getDate() + 1);
  return start;
}

/** True once the slot's start time has passed: it can no longer be played. */
export function isSlotPast(date: string, time: string, now: Date = new Date()) {
  return slotStart(date, time).getTime() <= now.getTime();
}

/**
 * A free slot stops taking bookings this long before it starts, so staff don't
 * come in for a single late booking. Exception: when the slot right before it is
 * booked, staff are already on site and it stays open until it starts.
 */
export const SLOT_CUTOFF_MS = 60 * 60 * 1000;

/** The time that comes right before `time` on the day, among `times`, or null. */
export function previousSlotTime(time: string, times: Iterable<string>): string | null {
  const key = slotSortKey(time);
  let best: string | null = null;
  for (const t of times) {
    const k = slotSortKey(t);
    if (k < key && (best === null || k > slotSortKey(best))) best = t;
  }
  return best;
}

/** Moment a free slot stops taking bookings (see SLOT_CUTOFF_MS). */
export function slotBookingDeadline(
  date: string,
  time: string,
  allTimes: Iterable<string>,
  bookedTimes: Set<string>
): Date {
  const start = slotStart(date, time);
  const prev = previousSlotTime(time, allTimes);
  if (prev && bookedTimes.has(prev)) return start;
  return new Date(start.getTime() - SLOT_CUTOFF_MS);
}

/**
 * Why a free slot can't be booked any more, or null when it still can:
 * 'past' once it has started, 'cutoff' inside the last hour when the slot
 * before it isn't booked.
 */
export function slotClosedReason(
  date: string,
  time: string,
  allTimes: Iterable<string>,
  bookedTimes: Set<string>,
  now: Date = new Date()
): 'past' | 'cutoff' | null {
  if (isSlotPast(date, time, now)) return 'past';
  if (slotBookingDeadline(date, time, allTimes, bookedTimes).getTime() <= now.getTime()) return 'cutoff';
  return null;
}

/** Current time, refreshed every `intervalMs` so past slots grey out on their own. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
