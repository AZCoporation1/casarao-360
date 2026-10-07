// =============================================
// WhatsApp Helper — Central Casarão 360
// Helper centralizado para URLs do WhatsApp
// =============================================

/**
 * DTO sanitizado com configurações públicas de reserva.
 * Não expor dados administrativos privados.
 */
export interface PublicReservationSettings {
  whatsappEnabled: boolean;
  whatsappPhone: string | null; // E.164 format; null quando indisponível
  whatsappWaMeNumber: string | null; // digits only for wa.me; null quando indisponível
  maxSelfServicePartySize: number;
  maxSelfServiceTables: number;
}

/**
 * Template params para mensagem WhatsApp
 */
interface WhatsAppMessageParams {
  eventTitle: string;
  eventDate: string; // formatted date string
  partySize: number;
  sector?: string;
  tableNumbers?: string;
  leadCode: string;
}

/**
 * Fallback quando as configurações não podem ser carregadas: WhatsApp fica
 * indisponível (sem número inventado — a UI esconde os CTAs) e os limites
 * de self-service usam os padrões de negócio. A fonte canônica do número
 * é organization_settings, lida via RPC sanitizada.
 */
const UNAVAILABLE_SETTINGS: PublicReservationSettings = {
  whatsappEnabled: false,
  whatsappPhone: null,
  whatsappWaMeNumber: null,
  maxSelfServicePartySize: 8,
  maxSelfServiceTables: 2,
};

/**
 * Fetch configurações públicas de reserva via RPC get_public_booking_settings
 * (SECURITY DEFINER, expõe apenas campos públicos). SERVER-SIDE ONLY —
 * chamar de Server Components / Server Actions.
 * Em falha, retorna WhatsApp indisponível (nunca um número fake).
 */
export async function getPublicReservationSettings(): Promise<PublicReservationSettings> {
  const { isMockMode } = await import('@/lib/data/data-source');
  if (isMockMode()) {
    // Dados de demonstração — apenas em modo mock (desenvolvimento)
    return {
      whatsappEnabled: true,
      whatsappPhone: '+5511996963139',
      whatsappWaMeNumber: '5511996963139',
      maxSelfServicePartySize: 8,
      maxSelfServiceTables: 2,
    };
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_public_booking_settings');

    if (error || !data) return UNAVAILABLE_SETTINGS;

    const phone: string | null = data.whatsapp_reservations_number_e164 || null;

    return {
      whatsappEnabled: (data.whatsapp_reservations_enabled ?? false) && !!phone,
      whatsappPhone: phone,
      whatsappWaMeNumber: phone ? phone.replace(/[^0-9]/g, '') : null,
      maxSelfServicePartySize: data.max_self_service_party_size ?? 8,
      maxSelfServiceTables: data.max_self_service_tables ?? 2,
    };
  } catch {
    return UNAVAILABLE_SETTINGS;
  }
}

/**
 * Constrói URL do WhatsApp com mensagem pré-preenchida.
 * NUNCA inclui CPF, IDs internos ou dados financeiros.
 */
export function buildWhatsAppReservationUrl(
  waMeNumber: string,
  params: WhatsAppMessageParams
): string {
  const message = [
    'Olá, O Casarão!',
    '',
    'Estou entrando em contato pelo Casarão 360 e gostaria de solicitar uma reserva personalizada.',
    '',
    `Evento: ${params.eventTitle}`,
    `Data: ${params.eventDate}`,
    `Quantidade de pessoas: ${params.partySize}`,
    `Setor de interesse: ${params.sector || 'A definir'}`,
    `Mesas de interesse: ${params.tableNumbers || 'A definir'}`,
    `Código da solicitação: ${params.leadCode}`,
    '',
    'Gostaria de verificar as melhores opções disponíveis para o meu grupo.',
  ].join('\n');

  return `https://wa.me/${waMeNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Formata data no padrão pt-BR a partir de ISO date string (YYYY-MM-DD)
 */
export function formatEventDatePtBR(isoDate: string): string {
  try {
    const date = new Date(isoDate + 'T12:00:00-03:00');
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoDate;
  }
}
