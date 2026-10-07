'use server';

import { z } from 'zod';
import { addToWaitlist, moveToReservation } from '@/lib/data/waitlist.repository';
import type { WaitlistResult } from '@/lib/data/waitlist.repository';

// =============================================
// Waitlist Server Actions
// =============================================

const addToWaitlistSchema = z.object({
  eventId: z.string().min(1),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  partySize: z.number().min(1).max(20),
  preferredSectorId: z.string().optional(),
  notes: z.string().optional(),
});

export async function addToWaitlistAction(input: {
  eventId: string;
  fullName: string;
  phone: string;
  cpf: string;
  partySize: number;
  preferredSectorId?: string;
  notes?: string;
}): Promise<WaitlistResult> {
  const validated = addToWaitlistSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map(e => e.message).join('. '),
    };
  }

  try {
    return await addToWaitlist(validated.data);
  } catch (err) {
    console.error('Error adding to waitlist:', err);
    return { success: false, error: 'Erro ao entrar na lista de espera.' };
  }
}

export async function moveToReservationAction(
  waitlistEntryId: string,
  eventTableId: string
): Promise<WaitlistResult> {
  if (!waitlistEntryId || !eventTableId) {
    return { success: false, error: 'Dados incompletos' };
  }

  try {
    return await moveToReservation(waitlistEntryId, eventTableId);
  } catch (err) {
    console.error('Error moving to reservation:', err);
    return { success: false, error: 'Erro ao converter lista de espera em reserva.' };
  }
}
