'use server';

import { registerInterest } from '@/lib/data/interest.repository';

interface RegisterInterestInput {
  eventId: string;
  fullName: string;
  phone: string;
}

export async function registerInterestAction(input: RegisterInterestInput) {
  // Validate inputs
  if (!input.eventId || typeof input.eventId !== 'string') {
    return { success: false, error: 'Evento inválido.' };
  }
  if (!input.fullName || input.fullName.trim().length < 2) {
    return { success: false, error: 'Nome completo é obrigatório (mínimo 2 caracteres).' };
  }
  if (!input.phone || input.phone.replace(/\D/g, '').length < 8) {
    return { success: false, error: 'Telefone é obrigatório (mínimo 8 dígitos).' };
  }

  try {
    const result = await registerInterest(
      input.eventId,
      input.fullName.trim(),
      input.phone.trim()
    );
    return result;
  } catch (err) {
    console.error('Error in registerInterestAction:', err);
    return { success: false, error: 'Erro ao processar sua solicitação. Tente novamente.' };
  }
}
