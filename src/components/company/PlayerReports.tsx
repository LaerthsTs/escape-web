'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { AlertTriangle, Flag, Check, ShieldAlert, CalendarX } from 'lucide-react';
import { LATE_CANCEL_LOOKBACK_DAYS } from '../../../convex/cancelRules';
import { api } from '../../../convex/_generated/api';
import { useCompanyMutation, useCompanyQuery } from '@/lib/companyAuth';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { useToast } from './Toast';
import { PLAYER_REPORT_CATEGORIES, type PlayerReportCategory } from '../../../convex/reportRules';

/*
 * Business ↔ player reports in the company portal.
 *  • ReportPlayerSection: report the player of a booking (24h after the game, fixed categories).
 *  • PlayerFlagCard: what other businesses reported about the player of an upcoming booking.
 *  • BookingFlagsProvider / useBookingFlag: flags for the calendar blocks.
 * The reporting business is never shown; the server only returns categories,
 * counts and the player's replies.
 */

export type BookingFlag = {
  bookingId: string;
  count: number;
  categories: Partial<Record<PlayerReportCategory, number>>;
  replies: string[];
  gamesRemaining: number;
  /** Set when the player is over the late-cancellation threshold (cancellations.ts). */
  lateCancels?: { count: number; reasons: Partial<Record<string, number>> };
};

/** Flags for a set of bookings (only upcoming bookings by UNLOCKED players are sent). */
export function useBookingFlags(bookings: any[] | undefined): Map<string, BookingFlag> {
  const ids = useMemo(
    () =>
      (bookings || [])
        .filter((b) => b && b.userId && (b.status === 'upcoming' || b.status === 'pending_payment'))
        .map((b) => String(b._id))
        .sort(),
    [bookings]
  );
  const flags = useCompanyQuery(api.reports.flagsForBookings, ids.length ? { bookingIds: ids as any } : 'skip');
  const cancelFlags = useCompanyQuery(api.cancellations.flagsForBookings, ids.length ? { bookingIds: ids as any } : 'skip');
  return useMemo(() => {
    const map = new Map<string, BookingFlag>((flags || []).map((f) => [String(f.bookingId), f as BookingFlag]));
    for (const c of cancelFlags || []) {
      const key = String(c.bookingId);
      const base = map.get(key) ?? { bookingId: key, count: 0, categories: {}, replies: [], gamesRemaining: 0 };
      map.set(key, { ...base, lateCancels: { count: c.count, reasons: c.reasons } });
    }
    return map;
  }, [flags, cancelFlags]);
}

const FlagContext = createContext<Map<string, BookingFlag>>(new Map());

export function BookingFlagsProvider({ bookings, children }: { bookings: any[]; children: React.ReactNode }) {
  const flags = useBookingFlags(bookings);
  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}

export function useBookingFlag(bookingId: string | undefined): BookingFlag | undefined {
  const flags = useContext(FlagContext);
  return bookingId ? flags.get(String(bookingId)) : undefined;
}

export function FlagIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  const { t } = useTranslation();
  return <AlertTriangle className={`${className} text-amber-400 shrink-0`} aria-label={t('reports.flag.short')} />;
}

/** Warning card shown on an upcoming booking whose player has active reports or late cancellations. */
export function PlayerFlagCard({ flag }: { flag: BookingFlag }) {
  if (flag.count === 0) return flag.lateCancels ? <LateCancelFlagCard lateCancels={flag.lateCancels} /> : null;
  return (
    <>
      <ReportsFlagCard flag={flag} />
      {flag.lateCancels && <LateCancelFlagCard lateCancels={flag.lateCancels} />}
    </>
  );
}

function LateCancelFlagCard({ lateCancels }: { lateCancels: NonNullable<BookingFlag['lateCancels']> }) {
  const { t } = useTranslation();
  const reasons = Object.entries(lateCancels.reasons).filter(([, n]) => n);
  return (
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 font-semibold text-orange-300">
        <CalendarX className="w-4 h-4 shrink-0" />
        {t('cancel.flag.title', { count: String(lateCancels.count), days: String(LATE_CANCEL_LOOKBACK_DAYS) })}
      </div>
      {reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {reasons.map(([r, n]) => (
            <li key={r} className="text-xs px-2 py-1 rounded-full bg-orange-500/15 text-orange-200">
              {t(r === 'none' ? 'cancel.reason.none' : `cancel.reason.${r}`)}
              {n! > 1 ? ` ×${n}` : ''}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-brand-text-muted">{t('cancel.flag.note')}</p>
    </div>
  );
}

function ReportsFlagCard({ flag }: { flag: BookingFlag }) {
  const { t } = useTranslation();
  const cats = PLAYER_REPORT_CATEGORIES.filter((c) => flag.categories[c]);
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 font-semibold text-amber-300">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        {t(flag.count === 1 ? 'reports.flag.title_one' : 'reports.flag.title_many', { count: String(flag.count) })}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <li key={c} className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-200">
            {t(`reports.cat.${c}`)}
            {flag.categories[c]! > 1 ? ` ×${flag.categories[c]}` : ''}
          </li>
        ))}
      </ul>
      {flag.replies.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-brand-text-secondary">{t('reports.flag.player_replied')}</p>
          {flag.replies.map((r, i) => (
            <p key={i} className="text-xs italic text-white/90 border-l-2 border-amber-500/40 pl-2 whitespace-pre-wrap break-words">
              {r}
            </p>
          ))}
        </div>
      )}
      <p className="text-[11px] text-brand-text-muted">{t('reports.flag.note')}</p>
    </div>
  );
}

/** Report action on a booking. Hidden when the booking can't be reported at all. */
export function ReportPlayerSection({ booking }: { booking: any }) {
  const { t } = useTranslation();
  const toast = useToast();
  const status = useCompanyQuery(api.reports.companyReportStatus, booking?._id ? { bookingId: booking._id as any } : 'skip');
  const reportPlayer = useCompanyMutation(api.reports.reportPlayer);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PlayerReportCategory[]>([]);
  const [saving, setSaving] = useState(false);

  if (!status) return null;

  if (status.existing) {
    return (
      <div className="rounded-xl bg-white/5 p-3 text-sm">
        <p className="flex items-center gap-1.5 font-semibold">
          <Flag className="w-3.5 h-3.5 text-brand-red-light" />
          {status.existing.voided ? t('reports.company.voided') : t('reports.company.reported')}
        </p>
        <p className="text-xs text-brand-text-secondary mt-1">
          {status.existing.categories.map((c) => t(`reports.cat.${c}`)).join(' · ')}
        </p>
      </div>
    );
  }
  // Nothing to show before the game starts, for walk-ins, or for cancelled bookings.
  if (status.block === 'no_player' || status.block === 'not_started' || status.block === 'cancelled') return null;
  if (status.block === 'window_closed') {
    return <p className="text-xs text-brand-text-muted">{t('reports.company.window_closed')}</p>;
  }

  const deadline = new Date(status.deadline);
  const deadlineLabel = deadline.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-text-secondary hover:text-white transition-colors flex items-center justify-center gap-1.5"
      >
        <Flag className="w-3.5 h-3.5" />
        {t('reports.company.button')}
        <span className="text-[11px] text-brand-text-muted">· {t('reports.company.until', { time: deadlineLabel })}</span>
      </button>
    );
  }

  const toggle = (c: PlayerReportCategory) =>
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div className="rounded-xl border border-white/10 bg-brand-bg p-3 space-y-3">
      <div>
        <p className="font-semibold text-sm">{t('reports.company.title')}</p>
        <p className="text-xs text-brand-text-secondary mt-0.5">{t('reports.company.help')}</p>
      </div>
      <div className="space-y-1.5">
        {PLAYER_REPORT_CATEGORIES.map((c) => {
          const on = picked.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={on}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
                on ? 'border-brand-red bg-brand-red/10 text-white' : 'border-white/10 hover:border-white/20 text-brand-text-secondary'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-brand-red border-brand-red' : 'border-white/30'}`}>
                {on && <Check className="w-3 h-3" />}
              </span>
              {t(`reports.cat.${c}`)}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-brand-text-muted">{t('reports.company.privacy')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setPicked([]);
          }}
          className="text-sm px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10"
        >
          {t('cx.common.cancel')}
        </button>
        <button
          disabled={saving || picked.length === 0}
          onClick={async () => {
            if (!confirm(t('reports.company.confirm'))) return;
            setSaving(true);
            try {
              await reportPlayer({ bookingId: booking._id as any, categories: picked });
              toast({ kind: 'success', message: t('reports.company.sent') });
              setOpen(false);
            } catch (err) {
              toast({ kind: 'error', message: friendlyError(err, t) });
            }
            setSaving(false);
          }}
          className="text-sm px-3 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red/90 text-white disabled:opacity-40"
        >
          {t('reports.company.submit')}
        </button>
      </div>
    </div>
  );
}
