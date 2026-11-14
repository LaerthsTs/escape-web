'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../../convex/_generated/api';
import { useCompanyMutation, useCompanyQuery } from '@/lib/companyAuth';

/**
 * End-of-game QR for a finished booking. Live: shows how many players have
 * scanned it, and counts down the 30 minutes it stays valid.
 */
export function GameQr({ bookingId }: { bookingId: string }) {
  const game = useCompanyQuery(api.games.getGameForBooking, { bookingId: bookingId as any });
  const reopen = useCompanyMutation(api.games.completeGame);
  const [qr, setQr] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const token = game?.claimToken;
  const link = token && typeof window !== 'undefined' ? `${window.location.origin}/g/${token}` : '';

  useEffect(() => {
    if (!link) return;
    let alive = true;
    QRCode.toDataURL(link, { margin: 2, width: 320 }).then((d) => {
      if (alive) setQr(d);
    });
    return () => {
      alive = false;
    };
  }, [link]);

  if (game === undefined) {
    return <p className="text-sm text-brand-text-muted">Φόρτωση…</p>;
  }
  if (game === null) {
    return <p className="text-sm text-brand-text-muted">Το παιχνίδι δεν έχει ολοκληρωθεί ακόμα.</p>;
  }

  const msLeft = game.claimExpiresAt - now;
  const expired = msLeft <= 0;
  const full = game.seatsClaimed >= game.seatsTotal;
  const mm = String(Math.max(0, Math.floor(msLeft / 60000))).padStart(2, '0');
  const ss = String(Math.max(0, Math.floor((msLeft % 60000) / 1000))).padStart(2, '0');

  const handleReopen = async () => {
    setBusy(true);
    try {
      await reopen({ bookingId: bookingId as any, actualPlayers: game.seatsTotal } as any);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="rounded-xl bg-white p-2">
        {qr && !expired && !full ? (
          <img src={qr} alt="QR" width={240} height={240} />
        ) : (
          <div className="flex h-60 w-60 items-center justify-center px-4 text-sm font-medium text-black">
            {full ? 'Όλοι οι παίκτες μπήκαν' : 'Το QR έληξε'}
          </div>
        )}
      </div>

      <div className="text-sm">
        <span className="font-bold text-brand-red-light">
          {game.seatsClaimed}/{game.seatsTotal}
        </span>{' '}
        <span className="text-brand-text-muted">παίκτες έχουν μπει</span>
      </div>

      {!expired && !full && (
        <div className="text-xs text-brand-text-muted">
          Ισχύει για ακόμα <span className="font-mono text-white">{mm}:{ss}</span>
        </div>
      )}

      {(expired || full) && !full && (
        <button
          onClick={handleReopen}
          disabled={busy}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-brand-red disabled:opacity-50"
        >
          Νέο QR για 30 λεπτά
        </button>
      )}

      {link && <p className="max-w-xs break-all text-[10px] text-brand-text-muted">{link}</p>}
    </div>
  );
}