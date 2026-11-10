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

/** True once the slot's start time has passed: it can no longer be booked or opened. */
export function isSlotPast(date: string, time: string, now: Date = new Date()) {
  return slotStart(date, time).getTime() <= now.getTime();
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
