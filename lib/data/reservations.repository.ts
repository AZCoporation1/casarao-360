import { isSupabaseMode, DataSourceError } from './data-source';
import { mockReservations } from '@/lib/mock-data';
import type { Reservation } from '@/lib/types';

// =============================================
// Reservations Repository — Central Casarão 360
// Uses create_reservation_v2 as the single transactional core
// =============================================

export interface CreateAuthReservationInput {
  eventId: string;
  eventTableIds: string[];   // 1 or 2 table IDs
  partySize: number;
  authUserId: string;
  fullName?: string;
  phone?: string;
  cpf?: string;
  email?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  reservationCode?: string;
  tableCodes?: string[];
  error?: string;
  errorCode?: string;
  existingReservationId?: string;
}

// Map Supabase reservation status to app status
const statusMap: Record<string, Reservation['status']> = {
  pending: 'pendente',
  confirmed: 'confirmada',
  cancelled: 'cancelada',
  checked_in: 'confirmada',
  no_show: 'cancelada',
  expired: 'cancelada',
};

// Parse RPC error messages into user-friendly text
function parseReservationError(errorMsg: string): { error: string; errorCode?: string } {
  if (errorMsg.includes('não está mais disponível') || errorMsg.includes('já foi reservada'))
    return { error: 'Esta mesa já foi reservada por outra pessoa. Escolha outra mesa.', errorCode: 'table_taken' };
  if (errorMsg.includes('excede a capacidade'))
    return { error: 'O número de pessoas excede a capacidade das mesas selecionadas.', errorCode: 'capacity_exceeded' };
  if (errorMsg.includes('já possui uma reserva ativa'))
    return { error: 'Você já possui uma reserva ativa para este evento.', errorCode: 'active_reservation_exists' };
  if (errorMsg.includes('não podem ser combinadas'))
    return { error: 'Essas mesas não podem ser combinadas. Escolha mesas contíguas ou solicite via WhatsApp.', errorCode: 'join_denied' };
  if (errorMsg.includes('reserva personalizada') || errorMsg.includes('acima de'))
    return { error: 'Grupos desse tamanho devem solicitar reserva personalizada via WhatsApp.', errorCode: 'large_party' };
  return { error: 'Ocorreu um erro ao processar sua reserva. Tente novamente.' };
}

/**
 * Authenticated reservation flow.
 * Calls create_reservation_v2 with auth_user_id for customer identity.
 */
export async function createAuthenticatedReservation(input: CreateAuthReservationInput): Promise<ReservationResult> {
  if (!isSupabaseMode()) {
    return {
      success: true,
      reservationId: `res-${Date.now()}`,
      reservationCode: `MOCK-${Date.now()}`,
    };
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('create_reservation_v2', {
    p_event_id: input.eventId,
    p_event_table_ids: input.eventTableIds,
    p_party_size: input.partySize,
    p_auth_user_id: input.authUserId,
    p_full_name: input.fullName || null,
    p_phone: input.phone || null,
    p_cpf: input.cpf || null,
    p_email: input.email || null,
    p_notes: input.notes || null,
    p_idempotency_key: input.idempotencyKey || null,
  });

  if (error) {
    return { success: false, ...parseReservationError(error.message) };
  }

  const result = data as Record<string, unknown>;
  if (result.success === false) {
    return {
      success: false,
      error: (result.message as string) || 'Erro ao processar reserva.',
      errorCode: result.error as string,
      existingReservationId: result.existing_reservation_id as string,
    };
  }

  return {
    success: true,
    reservationId: result.reservation_id as string,
    reservationCode: result.reservation_code as string,
    tableCodes: result.table_codes as string[],
  };
}

export async function listReservations(eventId?: string): Promise<Reservation[]> {
  if (!isSupabaseMode()) {
    return eventId
      ? mockReservations.filter(r => r.eventId === eventId)
      : mockReservations;
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  let query = supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;

  if (error || !data) {
    // NUNCA cair para mock em modo supabase (handoff §92) — falha visível + retry
    throw new DataSourceError('Não foi possível carregar as reservas.', error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    tableId: r.event_table_id,
    customerName: r.customer_name_snapshot || '',
    customerPhone: r.customer_phone_snapshot || '',
    customerCpf: r.customer_name_snapshot ? '***.***.***-**' : '', // Always masked
    peopleCount: r.party_size,
    status: statusMap[r.status || 'pending'] || 'pendente',
    createdAt: r.created_at,
    observation: r.notes || undefined,
  }));
}

// Transições administrativas via RPC (00023): history + audit + liberação
// de allocations acontecem dentro da transação no banco.
export async function confirmReservation(reservationId: string): Promise<boolean> {
  if (!isSupabaseMode()) return true;

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('admin_confirm_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.error('Error confirming reservation:', error);
    return false;
  }
  if (data?.success === false) {
    console.error('admin_confirm_reservation rejected:', data.error, data.message);
    return false;
  }
  return true;
}

export async function cancelReservation(reservationId: string, reason?: string): Promise<boolean> {
  if (!isSupabaseMode()) return true;

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('admin_cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Error cancelling reservation:', error);
    return false;
  }
  if (data?.success === false) {
    console.error('admin_cancel_reservation rejected:', data.error, data.message);
    return false;
  }
  return true;
}
