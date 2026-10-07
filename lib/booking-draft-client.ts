// Booking Draft — Client-side reader
// Reads the booking draft cookie from the browser (document.cookie).
// Server-side operations use lib/booking-draft.ts instead.

import type { BookingDraft } from './booking-draft';

const COOKIE_NAME = 'casarao_booking_draft';

export function getBookingDraftClient(): BookingDraft | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as BookingDraft;
  } catch {
    return null;
  }
}
