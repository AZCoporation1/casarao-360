import { isSupabaseMode, DataSourceError } from './data-source';
import { mockInsights } from '@/lib/mock-data';
import type { AiInsight } from '@/lib/types';

// =============================================
// Metrics Repository
// =============================================

// Default organization ID for demo (matches seed data)
const DEFAULT_ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export interface EventMetrics {
  eventId: string;
  title: string;
  totalTables: number;
  freeTables: number;
  pendingTables: number;
  reservedTables: number;
  occupiedTables: number;
  blockedTables: number;
  totalCapacity: number;
  reservedCapacity: number;
  occupancyPercentage: number;
  pendingReservations: number;
  confirmedReservations: number;
  waitlistCount: number;
  operationalPressure: string;
  forecastLabel: string;
}

export interface ExecutiveSummary {
  nextEventTitle: string;
  nextEventDate: string;
  occupancy: number;
  availableTables: number;
  pendingReservations: number;
  pressure: string;
  unresolvedAlerts: number;
  totalWaitlist: number;
}

export async function getEventMetrics(eventId: string): Promise<EventMetrics | null> {
  if (!isSupabaseMode()) {
    return null; // Mock mode uses local calculation
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_event_metrics', {
    p_event_id: eventId,
  });

  if (error || !data) {
    console.error('Error fetching event metrics:', error);
    return null;
  }

  const d = data as Record<string, unknown>;
  return {
    eventId: d.event_id as string,
    title: d.title as string,
    totalTables: Number(d.total_tables) || 0,
    freeTables: Number(d.free_tables) || 0,
    pendingTables: Number(d.pending_tables) || 0,
    reservedTables: Number(d.reserved_tables) || 0,
    occupiedTables: Number(d.occupied_tables) || 0,
    blockedTables: Number(d.blocked_tables) || 0,
    totalCapacity: Number(d.total_capacity) || 0,
    reservedCapacity: Number(d.reserved_capacity) || 0,
    occupancyPercentage: Number(d.occupancy_percentage) || 0,
    pendingReservations: Number(d.pending_reservations) || 0,
    confirmedReservations: Number(d.confirmed_reservations) || 0,
    waitlistCount: Number(d.waitlist_count) || 0,
    operationalPressure: (d.operational_pressure as string) || 'low',
    forecastLabel: (d.forecast_label as string) || 'Disponível',
  };
}

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  if (!isSupabaseMode()) {
    // Mock mode: return from existing metrics with real capacity
    return {
      nextEventTitle: 'Noite de Rock Acústico',
      nextEventDate: '2026-07-10T20:00:00Z',
      occupancy: 26,
      availableTables: 40,
      pendingReservations: 1,
      pressure: 'low',
      unresolvedAlerts: 3,
      totalWaitlist: 2,
    };
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_executive_summary', {
    p_organization_id: DEFAULT_ORG_ID,
  });

  if (error || !data) {
    console.error('Error fetching executive summary:', error);
    return {
      nextEventTitle: 'Nenhum evento',
      nextEventDate: '',
      occupancy: 0,
      availableTables: 0,
      pendingReservations: 0,
      pressure: 'low',
      unresolvedAlerts: 0,
      totalWaitlist: 0,
    };
  }

  const d = data as Record<string, unknown>;
  const nextEvent = d.next_event as Record<string, unknown> | null;
  const metrics = d.metrics as Record<string, unknown> | null;

  return {
    nextEventTitle: nextEvent?.title as string || 'Nenhum evento',
    nextEventDate: nextEvent?.starts_at as string || '',
    occupancy: Number(metrics?.occupancy_percentage) || 0,
    availableTables: Number(metrics?.free_tables) || 0,
    pendingReservations: Number(metrics?.pending_reservations) || 0,
    pressure: (metrics?.operational_pressure as string) || 'low',
    unresolvedAlerts: Number(d.unresolved_alerts) || 0,
    totalWaitlist: Number(d.total_waitlist) || 0,
  };
}

export async function listInsights(): Promise<AiInsight[]> {
  if (!isSupabaseMode()) {
    return mockInsights;
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });

  if (error || !data) {
    // NUNCA cair para mock em modo supabase (handoff §92)
    throw new DataSourceError('Não foi possível carregar os insights.', error);
  }

  const impactMap: Record<string, AiInsight['impact']> = {
    low: 'neutral',
    medium: 'neutral',
    high: 'positive',
    critical: 'negative',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((i: any) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    impact: impactMap[i.impact || 'medium'] || 'neutral',
    actionable: true,
  }));
}
