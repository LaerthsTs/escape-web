/** Small helpers shared by the company portal pages. */

export function statusLabel(t: (key: string) => string, status: string) {
  switch (status) {
    case 'upcoming':
      return t('company.bookings.status_upcoming');
    case 'completed':
      return t('company.bookings.status_completed');
    case 'cancelled':
      return t('company.bookings.status_cancelled');
    case 'pending_payment':
      return t('company.bookings.status_pending_payment');
    default:
      return status;
  }
}

/** localStorage flag set when the owner copies the booking-widget code. */
export const WIDGET_COPIED = 'unlocked_widget_copied';

export function setFlag(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {}
}

export function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
