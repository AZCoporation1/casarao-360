// =============================================
// Booking Policy Engine — Central Casarão 360
// Determines the effective booking state for each event
// Isomorphic: works on server + client
// =============================================

import { isEventPast, getTodayLocal, formatDateShort } from './date-helpers';

export type BookingState = 'completed' | 'announced' | 'priority_only' | 'public_open' | 'sold_out' | 'closed';

export interface BookingPolicyEvent {
  eventDate: string;             // "2026-07-04" ISO date
  status: string;                // event_status enum
  priorityBookingOpensOn?: string | null;  // "2025-11-04"
  publicBookingOpensOn?: string | null;    // "2026-03-04"
  availableTables: number;
}

/**
 * Determine the effective booking state for an event.
 * Pure function — no side effects, no DB calls.
 */
export function getEffectiveBookingState(
  event: BookingPolicyEvent,
  timezone: string = 'America/Sao_Paulo'
): BookingState {
  const today = getTodayLocal(timezone);

  // 1. Event cancelled/closed
  if (event.status === 'cancelled') return 'closed';

  // 2. Event completed or date in the past
  if (event.status === 'completed' || isEventPast(event.eventDate, timezone)) {
    return 'completed';
  }

  // 3. Before priority booking window
  if (event.priorityBookingOpensOn && today < event.priorityBookingOpensOn) {
    return 'announced';
  }

  // 4. After priority but before public opening
  if (event.publicBookingOpensOn && today < event.publicBookingOpensOn) {
    return 'priority_only';
  }

  // 5. After public opening — check availability
  if (event.availableTables <= 0) {
    return 'sold_out';
  }

  // 6. Public open
  return 'public_open';
}

/**
 * Human-friendly label for each booking state.
 * No technical jargon — ready for public-facing UI.
 */
export function getBookingStateLabel(
  state: BookingState,
  event?: { publicBookingOpensOn?: string | null },
  timezone: string = 'America/Sao_Paulo'
): string {
  switch (state) {
    case 'completed':
      return 'Evento realizado';
    case 'announced':
      return 'Agenda confirmada';
    case 'priority_only': {
      if (event?.publicBookingOpensOn) {
        const formattedDate = formatDateShort(event.publicBookingOpensOn, timezone);
        return `Reservas gerais abrem em ${formattedDate}`;
      }
      return 'Reservas em breve';
    }
    case 'public_open':
      return 'Garanta sua experiência';
    case 'sold_out':
      return 'Entrar na lista de espera';
    case 'closed':
      return 'Evento encerrado';
    default:
      return '';
  }
}

/**
 * Get the appropriate CTA text for event cards.
 */
export function getBookingCTAText(state: BookingState): string {
  switch (state) {
    case 'completed':
      return 'Evento realizado';
    case 'announced':
      return 'Quero ser avisado';
    case 'priority_only':
      return 'Quero ser avisado';
    case 'public_open':
      return 'Garanta sua experiência';
    case 'sold_out':
      return 'Entrar na lista de espera';
    case 'closed':
      return 'Evento encerrado';
    default:
      return '';
  }
}

/**
 * Check if an event allows public reservation.
 */
export function canPublicReserve(state: BookingState): boolean {
  return state === 'public_open';
}

/**
 * Check if an event shows interest registration (pre-opening).
 */
export function canRegisterInterest(state: BookingState): boolean {
  return state === 'announced' || state === 'priority_only';
}

/**
 * Check if an event shows waitlist option.
 */
export function canJoinWaitlist(state: BookingState): boolean {
  return state === 'sold_out';
}

/**
 * Get badge variant for booking state.
 */
export function getBookingStateBadgeVariant(state: BookingState): string {
  switch (state) {
    case 'completed': return 'secondary';
    case 'announced': return 'info';
    case 'priority_only': return 'warning';
    case 'public_open': return 'success';
    case 'sold_out': return 'destructive';
    case 'closed': return 'secondary';
    default: return 'default';
  }
}
