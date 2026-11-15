'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useAuth } from '@/lib/auth';

/** What a player sees after scanning the room's end-of-game QR. */
export default function ClaimGamePage() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const preview = useQuery(api.games.previewClaim, { token });
  const claim = useMutation(api.games.claimSeat);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'joined' | 'already_in' | null>(null);
  const [error, setError] = useState('');

  const join = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const r = await claim({ token, sessionToken: user.sessionToken });
      setResult(r.result);
    } catch (err: any) {
      setError(typeof err?.data === 'string' ? err.data : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode;

  if (preview === undefined || isLoading) {
    body = <p className="text-brand-text-muted">Φόρτωση…</p>;
  } else if (preview.state === 'invalid') {
    body = (
      <>
        <h1 className="font-display text-2xl font-bold mb-2">Μη έγκυρο QR</h1>
        <p className="text-brand-text-muted">Αυτός ο σύνδεσμος δεν αντιστοιχεί σε κάποιο παιχνίδι.</p>
      </>
    );
  } else if (result) {
    body = (
      <>
        <h1 className="font-display text-2xl font-bold mb-2">
          {result === 'joined' ? 'Το παιχνίδι μπήκε στο προφίλ σου!' : 'Είσαι ήδη μέσα σε αυτό το παιχνίδι'}
        </h1>
        <p className="text-brand-text-muted mb-6">{preview.roomName}</p>
        <Link href="/profile" className="btn-primary inline-block px-6 py-3">
          Δες το προφίλ μου
        </Link>
      </>
    );
  } else if (preview.state === 'expired') {
    body = (
      <>
        <h1 className="font-display text-2xl font-bold mb-2">Το QR έληξε</h1>
        <p className="text-brand-text-muted">
          Ισχύει μόνο για 30 λεπτά μετά το παιχνίδι. Ζήτα από την εταιρεία να βγάλει νέο.
        </p>
      </>
    );
  } else if (preview.state === 'full') {
    body = (
      <>
        <h1 className="font-display text-2xl font-bold mb-2">Όλες οι θέσεις έχουν πιαστεί</h1>
        <p className="text-brand-text-muted">Όλοι οι παίκτες αυτού του παιχνιδιού έχουν ήδη μπει.</p>
      </>
    );
  } else {
    body = (
      <>
        <p className="font-type text-[12px] tracking-[0.35em] text-brand-red-light mb-3">ΕΠΙΒΕΒΑΙΩΣΗ ΠΑΙΧΝΙΔΙΟΥ</p>
        <h1 className="font-display text-2xl font-bold mb-1">{preview.roomName}</h1>
        <p className="text-brand-text-muted mb-1">
          {preview.date} · {preview.time}
        </p>
        <p className="text-sm text-brand-text-muted mb-6">
          Ελεύθερες θέσεις: <span className="text-white font-semibold">{preview.seatsLeft}</span>
        </p>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {isAuthenticated ? (
          <button onClick={join} disabled={busy} className="btn-primary w-full py-3 disabled:opacity-50">
            {busy ? 'Μια στιγμή…' : 'Πρόσθεσε το παιχνίδι στο προφίλ μου'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-brand-text-muted">Συνδέσου για να μπει το παιχνίδι στο προφίλ σου.</p>
            <Link href="/login" className="btn-primary block w-full py-3">
              Σύνδεση
            </Link>
            <Link href="/signup" className="block text-sm text-brand-text-secondary hover:text-white">
              Δεν έχω λογαριασμό
            </Link>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-brand-surface p-8 text-center">{body}</div>
    </div>
  );
}