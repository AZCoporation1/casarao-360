'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';

interface CreateLargePartyInput {
  eventId: string;
  name: string;
  phone: string;
  partySize: number;
  sectorInterest?: string;
  tableInterest?: string[];
  idempotencyKey?: string;
}

export async function createLargePartyRequestAction(input: CreateLargePartyInput): Promise<{
  success: boolean;
  publicCode?: string;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('create_large_party_request', {
      p_event_id: input.eventId,
      p_name: input.name,
      p_phone: input.phone,
      p_party_size: input.partySize,
      p_sector_interest: input.sectorInterest || null,
      p_table_interest: JSON.stringify(input.tableInterest || []),
      p_idempotency_key: input.idempotencyKey || null,
    });

    if (error) {
      console.error('[large-party] RPC error:', error.message);
      return { success: false, error: 'Erro ao registrar solicitação. Tente novamente.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;

    if (result?.success) {
      return {
        success: true,
        publicCode: result.public_code,
      };
    }

    return { success: false, error: 'Resposta inesperada do servidor.' };
  } catch (err) {
    console.error('[large-party] action error:', err);
    return { success: false, error: 'Erro interno. Tente novamente.' };
  }
}
