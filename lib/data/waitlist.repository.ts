import { isSupabaseMode } from './data-source';

// =============================================
// Waitlist Repository
// =============================================

export interface AddToWaitlistInput {
  eventId: string;
  fullName: string;
  phone: string;
  cpf: string;
  partySize: number;
  preferredSectorId?: string;
  notes?: string;
}

export interface WaitlistResult {
  success: boolean;
  entryId?: string;
  position?: number;
  error?: string;
}

export interface WaitlistEntry {
  id: string;
  eventId: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  position: number;
  status: string;
  createdAt: string;
}

export async function addToWaitlist(input: AddToWaitlistInput): Promise<WaitlistResult> {
  if (!isSupabaseMode()) {
    return {
      success: true,
      entryId: `wl-${Date.now()}`,
      position: 1,
    };
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('add_to_waitlist', {
    p_event_id: input.eventId,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_cpf: input.cpf,
    p_party_size: input.partySize,
    p_preferred_sector_id: input.preferredSectorId || null,
    p_notes: input.notes || null,
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes('já está na lista')
        ? 'Você já está na lista de espera para este evento.'
        : 'Ocorreu um erro. Tente novamente.',
    };
  }

  const result = data as Record<string, unknown>;
  return {
    success: true,
    entryId: result.waitlist_entry_id as string,
    position: result.position as number,
  };
}

export async function listWaitlist(eventId: string): Promise<WaitlistEntry[]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select(`
      id,
      event_id,
      party_size,
      priority,
      status,
      notes,
      created_at,
      customers (
        full_name,
        phone
      )
    `)
    .eq('event_id', eventId)
    .in('status', ['waiting', 'notified'])
    .order('priority', { ascending: true });

  if (error || !data) {
    console.error('Error fetching waitlist:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((entry: any) => {
    const customer = entry.customers as { full_name: string; phone: string } | null;
    return {
      id: entry.id,
      eventId: entry.event_id,
      customerName: customer?.full_name || 'Cliente',
      customerPhone: customer?.phone || '',
      partySize: entry.party_size,
      position: entry.priority,
      status: entry.status || 'waiting',
      createdAt: entry.created_at,
    };
  });
}

export async function moveToReservation(
  waitlistEntryId: string,
  eventTableId: string
): Promise<WaitlistResult> {
  if (!isSupabaseMode()) {
    return { success: true };
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('move_waitlist_to_reservation', {
    p_waitlist_entry_id: waitlistEntryId,
    p_event_table_id: eventTableId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
