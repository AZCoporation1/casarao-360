import { AiInsight, Table, Reservation } from './types';
import { getEventOccupancy, getPendingReservations } from './metrics';

export function generateInsights(tables: Table[], reservations: Reservation[], waitlistCount: number): AiInsight[] {
  const insights: AiInsight[] = [];
  const occupancy = getEventOccupancy(tables, 'global');
  const pending = getPendingReservations(reservations);
  
  if (occupancy > 90) {
    insights.push({
      id: `ai-${Date.now()}-1`,
      title: 'Alta demanda esperada',
      description: `Este evento está com ${occupancy}% de ocupação e tendência de lotação máxima. Recomendado acionar equipe extra de garçons e segurança.`,
      impact: 'positive',
      actionable: true
    });
  }

  if (pending > 0) {
    insights.push({
      id: `ai-${Date.now()}-2`,
      title: 'Reservas paradas',
      description: `Existem ${pending} reservas aguardando confirmação. Recomendado acionar lembrete automático via WhatsApp para garantir presença.`,
      impact: 'negative',
      actionable: true
    });
  }

  if (waitlistCount > 10) {
    insights.push({
      id: `ai-${Date.now()}-3`,
      title: 'Demanda reprimida detectada',
      description: `A lista de espera possui ${waitlistCount} pessoas. Há demanda reprimida suficiente para abrir um lote extra ou promover o próximo evento.`,
      impact: 'positive',
      actionable: true
    });
  }

  const blockedPremium = tables.filter(t => t.status === 'bloqueada' && (t.sector === 'VIP' || t.sector === 'PalcoPrincipal'));
  if (blockedPremium.length > 0) {
    insights.push({
      id: `ai-${Date.now()}-4`,
      title: 'Mesas Premium bloqueadas',
      description: `Há ${blockedPremium.length} mesa(s) bloqueada(s) em setor premium. Revise se devem continuar indisponíveis para não perder receita.`,
      impact: 'neutral',
      actionable: true
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: `ai-${Date.now()}-0`,
      title: 'Operação dentro da normalidade',
      description: 'Nenhum gargalo detectado. O evento segue com previsibilidade saudável.',
      impact: 'neutral',
      actionable: false
    });
  }

  return insights;
}
