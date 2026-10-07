import { isSupabaseMode, DataSourceError } from './data-source';
import { mockEvents, mockUpcomingEvents, mockCompletedEvents } from '@/lib/mock-data';
import type { Event } from '@/lib/types';
import { getEffectiveBookingState, type BookingState } from '@/lib/booking-policy';
import { getWeekdayLabel } from '@/lib/date-helpers';

// =============================================
// Events Repository — Central Casarão 360
// Robustified: no restrictive status filter on public queries
// Booking-policy engine determines effective state
// =============================================

// Types for Supabase event shape (extended with booking policy fields)
export interface SupabaseEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  artist_name: string | null;
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  cover_image_url: string | null;
  capacity_override: number | null;
  highlights: string[];
  time_is_tbd?: boolean;
  priority_booking_opens_on?: string | null;
  public_booking_opens_on?: string | null;
  agenda_source?: string | null;
  public_visibility?: boolean;
  metadata?: Record<string, unknown> | null;
}

// Convert Supabase event to app Event type
function toAppEvent(e: SupabaseEvent, availableTables: number = 0): Event {
  const eventDate = e.event_date; // "2026-07-04"
  const weekday = getWeekdayLabel(eventDate);

  const bookingState: BookingState = getEffectiveBookingState({
    eventDate,
    status: e.status || 'scheduled',
    priorityBookingOpensOn: e.priority_booking_opens_on,
    publicBookingOpensOn: e.public_booking_opens_on,
    availableTables,
  });

  return {
    id: e.id,
    title: e.title,
    date: e.starts_at,
    artist: e.artist_name || e.title,
    attractions: e.highlights || [],
    capacity: e.capacity_override || 192,
    availableTables,
    imageUrl: e.cover_image_url || '/eventos/placeholder.svg',
    description: e.description || '',
    // New fields
    slug: e.slug,
    eventDate,
    weekday,
    status: (e.status as Event['status']) || 'scheduled',
    bookingState,
    timeTbd: e.time_is_tbd ?? true,
    priorityBookingOpensOn: e.priority_booking_opens_on,
    publicBookingOpensOn: e.public_booking_opens_on,
    agendaSource: e.agenda_source || undefined,
  };
}

/**
 * Safely count free tables for an event.
 * Returns 0 if the query fails (event_tables might not exist yet).
 */
async function countFreeTables(supabase: ReturnType<typeof Object>, eventId: string): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from('event_tables')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'free');

    if (error) {
      // event_tables may not exist or RLS may block — not fatal
      console.warn('[events.repository] event_tables count failed for', eventId, ':', error.message);
      return 0;
    }
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * List only upcoming public events (for home page).
 * Excludes completed events via booking-policy (not SQL filter).
 */
export async function listPublicEvents(): Promise<Event[]> {
  if (!isSupabaseMode()) {
    return mockUpcomingEvents;
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    // Fetch ALL public events — let booking-policy determine state
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('public_visibility', true)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true });

    if (error) {
      // Erro real ≠ agenda vazia — não esconder bug de query com empty state (§93)
      throw new DataSourceError('Não foi possível carregar a programação.', error);
    }
    if (!events || events.length === 0) {
      return [];
    }

    // Get available tables count for each event
    const eventsWithTables = await Promise.all(
      events.map(async (event: SupabaseEvent) => {
        const freeCount = await countFreeTables(supabase, event.id);
        return toAppEvent(event, freeCount);
      })
    );

    // Filter to only upcoming (non-completed) events
    return eventsWithTables.filter(e => e.bookingState !== 'completed');
  } catch (err) {
    if (err instanceof DataSourceError) throw err;
    console.error('[events.repository] Unexpected error in listPublicEvents:', err);
    throw new DataSourceError('Não foi possível carregar a programação.', err);
  }
}

/**
 * List all events including completed (for /eventos page and admin).
 * No restrictive status filter — booking-policy determines the state.
 */
export async function listAllPublicEvents(): Promise<Event[]> {
  if (!isSupabaseMode()) {
    return mockEvents;
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    // Fetch ALL public events without restrictive status filter
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('public_visibility', true)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: true });

    if (error) {
      // Erro real ≠ agenda vazia — não esconder bug de query com empty state (§93)
      throw new DataSourceError('Não foi possível carregar a programação.', error);
    }
    if (!events || events.length === 0) {
      return [];
    }

    const eventsWithTables = await Promise.all(
      events.map(async (event: SupabaseEvent) => {
        const freeCount = await countFreeTables(supabase, event.id);
        return toAppEvent(event, freeCount);
      })
    );

    return eventsWithTables;
  } catch (err) {
    if (err instanceof DataSourceError) throw err;
    console.error('[events.repository] Unexpected error in listAllPublicEvents:', err);
    throw new DataSourceError('Não foi possível carregar a programação.', err);
  }
}

/**
 * List only completed events (for history section).
 */
export async function listCompletedEvents(): Promise<Event[]> {
  if (!isSupabaseMode()) {
    return mockCompletedEvents;
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('public_visibility', true)
      .neq('status', 'cancelled')
      .order('event_date', { ascending: false });

    if (error || !events) {
      throw new DataSourceError('Não foi possível carregar os eventos realizados.', error);
    }

    // Let booking-policy filter completed ones
    return (events as SupabaseEvent[])
      .map(e => toAppEvent(e, 0))
      .filter(e => e.bookingState === 'completed');
  } catch (err) {
    console.error('[events.repository] Unexpected error in listCompletedEvents:', err);
    return [];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  if (!isSupabaseMode()) {
    return mockEvents.find(e => e.id === id) || null;
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !event) return null;

    const freeCount = await countFreeTables(supabase, id);
    return toAppEvent(event as SupabaseEvent, freeCount);
  } catch {
    return null;
  }
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  if (!isSupabaseMode()) {
    return mockEvents.find(e => e.slug === slug) || null;
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !event) return null;

    const freeCount = await countFreeTables(supabase, event.id);
    return toAppEvent(event as SupabaseEvent, freeCount);
  } catch {
    return null;
  }
}
