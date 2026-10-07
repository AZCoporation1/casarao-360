import { isSupabaseMode } from './data-source';
import type { EventInterestEntry } from '@/lib/types';

// =============================================
// Interest Repository — Pre-opening interest registration
// =============================================

/**
 * Register interest in an event (before reservations open).
 * Uses RPC for anon-safe insert via SECURITY DEFINER.
 */
export async function registerInterest(
  eventId: string,
  fullName: string,
  phone: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isSupabaseMode()) {
    // Mock mode: simulate success
    return {
      success: true,
      message: 'Interesse registrado! Você será avisado quando as reservas abrirem.',
    };
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('register_event_interest', {
    p_event_id: eventId,
    p_full_name: fullName,
    p_phone: phone,
  });

  if (error) {
    console.error('Error registering interest:', error);
    return { success: false, error: error.message || 'Erro ao registrar interesse.' };
  }

  return {
    success: data?.success || true,
    message: data?.message || 'Interesse registrado!',
  };
}

/**
 * List interest entries for an event (admin only).
 */
export async function listEventInterests(eventId: string): Promise<EventInterestEntry[]> {
  if (!isSupabaseMode()) {
    return []; // Mock: no interest entries
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('event_interest_entries')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching interests:', error);
    return [];
  }

  return data.map((entry: Record<string, unknown>) => ({
    id: entry.id as string,
    eventId: entry.event_id as string,
    fullName: entry.full_name as string,
    phone: entry.phone as string,
    source: (entry.source as string) || 'website',
    createdAt: entry.created_at as string,
  }));
}
