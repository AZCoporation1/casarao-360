'use server';

import { z } from 'zod';
import { confirmReservation, cancelReservation, createAuthenticatedReservation } from '@/lib/data/reservations.repository';
import type { ReservationResult } from '@/lib/data/reservations.repository';
import { isMockMode } from '@/lib/data/data-source';

// =============================================
// Reservation Server Actions — Gate 1
// Conta OBRIGATÓRIA: toda reserva é autenticada e o auth_user_id é SEMPRE
// derivado da sessão no servidor (nunca aceito do payload do cliente).
// =============================================

const tableSelectionSchema = z.object({
  eventId: z.string().min(1, 'Evento é obrigatório'),
  eventTableIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos 1 mesa').max(2, 'Máximo 2 mesas permitidas'),
  partySize: z.number().min(1, 'Mínimo 1 pessoa').max(8, 'Máximo 8 pessoas para reserva self-service'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const signUpAndReserveSchema = tableSelectionSchema.extend({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const signInAndReserveSchema = tableSelectionSchema.extend({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
});

export interface AuthReservationResult extends ReservationResult {
  /** true quando a conta foi criada mas o projeto exige confirmação de email
   * antes de existir sessão — a reserva foi criada mesmo assim. */
  needsEmailConfirmation?: boolean;
}

async function getSessionUser() {
  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const authReservationSchema = tableSelectionSchema.extend({
  // Campos de perfil opcionais — usados apenas quando o usuário autenticado
  // ainda não tem customer completo (ensure/merge acontece no motor).
  fullName: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
});

/**
 * Reserva para usuário JÁ AUTENTICADO. Identidade vem da sessão.
 */
export async function createAuthReservationAction(input: {
  eventId: string;
  eventTableIds: string[];
  partySize: number;
  fullName?: string;
  phone?: string;
  cpf?: string;
  notes?: string;
  idempotencyKey?: string;
}): Promise<AuthReservationResult> {
  const validated = authReservationSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues.map(e => e.message).join('. ') };
  }

  if (isMockMode()) {
    return { success: true, reservationId: `res-${Date.now()}`, reservationCode: `MOCK-${Date.now()}` };
  }

  try {
    const { user } = await getSessionUser();
    if (!user) {
      return { success: false, error: 'É necessário entrar na sua conta para reservar.', errorCode: 'auth_required' };
    }

    return await createAuthenticatedReservation({
      ...validated.data,
      authUserId: user.id,
      email: user.email ?? undefined,
    });
  } catch (err) {
    console.error('Error creating authenticated reservation:', err);
    return { success: false, error: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

/**
 * Cadastro rápido inline + reserva em um passo (página de reserva).
 * signUp → ensure_customer_for_auth_user → create_reservation_v2.
 */
export async function signUpAndReserveAction(input: {
  eventId: string;
  eventTableIds: string[];
  partySize: number;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
  notes?: string;
  idempotencyKey?: string;
}): Promise<AuthReservationResult> {
  const validated = signUpAndReserveSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues.map(e => e.message).join('. ') };
  }

  if (isMockMode()) {
    return { success: true, reservationId: `res-${Date.now()}`, reservationCode: `MOCK-${Date.now()}` };
  }

  const { eventId, eventTableIds, partySize, fullName, email, phone, cpf, password, notes, idempotencyKey } = validated.data;

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, cpf } },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return {
          success: false,
          error: 'Este e-mail já possui conta. Entre com sua senha para concluir a reserva.',
          errorCode: 'email_already_registered',
        };
      }
      return { success: false, error: error.message };
    }
    if (!data.user) {
      return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
    }

    // Vincula/cria o customer (idempotente; faz merge por telefone normalizado)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc('ensure_customer_for_auth_user', {
      p_auth_user_id: data.user.id,
      p_full_name: fullName,
      p_phone: phone,
      p_email: email,
      p_cpf: cpf,
    });
    if (rpcError) {
      return { success: false, error: 'Erro ao vincular perfil de cliente: ' + rpcError.message };
    }

    const result = await createAuthenticatedReservation({
      eventId,
      eventTableIds,
      partySize,
      authUserId: data.user.id,
      fullName,
      phone,
      cpf,
      email,
      notes,
      idempotencyKey,
    });

    return { ...result, needsEmailConfirmation: !data.session };
  } catch (err) {
    console.error('Error in signUpAndReserve:', err);
    return { success: false, error: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

/**
 * Login inline + reserva em um passo (página de reserva).
 */
export async function signInAndReserveAction(input: {
  eventId: string;
  eventTableIds: string[];
  partySize: number;
  email: string;
  password: string;
  notes?: string;
  idempotencyKey?: string;
}): Promise<AuthReservationResult> {
  const validated = signInAndReserveSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues.map(e => e.message).join('. ') };
  }

  if (isMockMode()) {
    return { success: true, reservationId: `res-${Date.now()}`, reservationCode: `MOCK-${Date.now()}` };
  }

  const { eventId, eventTableIds, partySize, email, password, notes, idempotencyKey } = validated.data;

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return {
        success: false,
        error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        errorCode: 'invalid_credentials',
      };
    }

    return await createAuthenticatedReservation({
      eventId,
      eventTableIds,
      partySize,
      authUserId: data.user.id,
      email,
      notes,
      idempotencyKey,
    });
  } catch (err) {
    console.error('Error in signInAndReserve:', err);
    return { success: false, error: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function confirmReservationAction(reservationId: string): Promise<{ success: boolean; error?: string }> {
  if (!reservationId) {
    return { success: false, error: 'ID da reserva é obrigatório' };
  }

  try {
    const result = await confirmReservation(reservationId);
    return { success: result };
  } catch (err) {
    console.error('Error confirming reservation:', err);
    return { success: false, error: 'Erro ao confirmar reserva.' };
  }
}

export async function cancelReservationAction(
  reservationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!reservationId) {
    return { success: false, error: 'ID da reserva é obrigatório' };
  }

  try {
    const result = await cancelReservation(reservationId, reason);
    return { success: result };
  } catch (err) {
    console.error('Error cancelling reservation:', err);
    return { success: false, error: 'Erro ao cancelar reserva.' };
  }
}
