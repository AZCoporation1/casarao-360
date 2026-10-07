import { isSupabaseMode, DataSourceError } from './data-source';
import { mockAlerts } from '@/lib/mock-data';
import type { OperationalAlert } from '@/lib/types';

// =============================================
// Alerts Repository
// =============================================

export async function listAlerts(): Promise<OperationalAlert[]> {
  if (!isSupabaseMode()) {
    return mockAlerts;
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('operational_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    // NUNCA cair para mock em modo supabase (handoff §92)
    throw new DataSourceError('Não foi possível carregar os alertas operacionais.', error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((a: any) => ({
    id: a.id,
    type: (a.source || 'ocupacao') as OperationalAlert['type'],
    message: a.description || a.title,
    severity: (a.severity || 'medium') as OperationalAlert['severity'],
    createdAt: a.created_at,
    read: a.is_resolved || false,
  }));
}

export async function resolveAlert(alertId: string): Promise<boolean> {
  if (!isSupabaseMode()) return true;

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { error } = await supabase
    .from('operational_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', alertId);

  return !error;
}
