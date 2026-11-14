'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { CANCEL_NOTE_MAX_CHARS, type CancelReason } from '../../convex/cancelRules';

/**
 * Cancel a booking with a reason (required) and an optional note.
 * Used by players (tickets page) and businesses (bookings page); the caller
 * passes the reasons that side may pick and any late-cancellation warning.
 */
export function CancelReasonDialog({
  title,
  reasons,
  warning,
  reasonHint,
  onConfirm,
  onClose,
}: {
  title: string;
  reasons: readonly CancelReason[];
  /** Shown above the reasons, e.g. the late-cancellation warning. */
  warning?: ReactNode;
  /** Extra line shown under the picked reason. */
  reasonHint?: (reason: CancelReason) => ReactNode;
  onConfirm: (reason: CancelReason, note: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason, note);
    } catch (err) {
      setError(friendlyError(err, t));
      setSaving(false);
    }
  };

  const hint = reason && reasonHint ? reasonHint(reason) : null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 sm:px-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-brand-surface rounded-t-2xl sm:rounded-2xl border border-white/5 p-5 w-full sm:max-w-md max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reason-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="cancel-reason-title" className="text-lg font-bold">
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 hover:bg-white/5 rounded-lg"
            aria-label={t('cancel.dialog.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {warning && (
          <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">{warning}</div>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm text-brand-text-secondary mb-2">{t('cancel.dialog.pick_reason')}</legend>
          {reasons.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                reason === r ? 'border-brand-red bg-brand-red/10' : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-brand-red"
              />
              {t(`cancel.reason.${r}`)}
            </label>
          ))}
        </fieldset>

        {hint && <p className="text-xs text-amber-300">{hint}</p>}

        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, CANCEL_NOTE_MAX_CHARS))}
            rows={2}
            placeholder={t('cancel.dialog.note_placeholder')}
            className="w-full bg-brand-bg border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-red focus:outline-hidden resize-y"
          />
          <p className="text-[11px] text-brand-text-muted text-right">
            {note.length}/{CANCEL_NOTE_MAX_CHARS}
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            {t('cancel.dialog.keep')}
          </button>
          <button
            onClick={submit}
            disabled={!reason || saving}
            className="text-sm px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-40"
          >
            {saving ? t('cancel.dialog.cancelling') : t('cancel.dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
