import { isSupabaseMode, DataSourceError } from './data-source';
import { mockTables } from '@/lib/mock-data';
import type { Table, TableStatus } from '@/lib/types';

// =============================================
// Tables Repository
// =============================================

// Map Supabase table_status to app TableStatus
const statusMap: Record<string, TableStatus> = {
  free: 'livre',
  reserved: 'reservada',
  occupied: 'ocupada',
  blocked: 'bloqueada',
  pending: 'aguardando',
  waitlist: 'lista-espera',
};

// Map app sector names to match existing types
const sectorMap: Record<string, Table['sector']> = {
  'Palco Principal': 'PalcoPrincipal',
  'Área Principal': 'SalaoPrincipal',
  'Salão Principal': 'SalaoPrincipal',
  'Área VIP': 'VIP',
  'Bar': 'AreaBar',
  'Área do Bar': 'AreaBar',
  'Entrada': 'Entrada',
  'Mesas Familiares': 'AreaFamilia',
  'Área Família': 'AreaFamilia',
  'Área Externa': 'Externo',
  'Externo': 'Externo',
};

interface SupabaseEventTableJoined {
  id: string;
  event_id: string;
  venue_table_id: string;
  status: string;
  capacity_override: number | null;
  features: string[];
  venue_tables: {
    id: string;
    code: string;
    label: string | null;
    capacity: number;
    x: number;
    y: number;
    features: string[];
    sector_id: string | null;
    venue_sectors: {
      name: string;
    } | null;
  };
}

// Shared query string for consistency
const EVENT_TABLES_SELECT = `
  id,
  event_id,
  venue_table_id,
  status,
  capacity_override,
  is_active,
  features,
  venue_tables (
    id,
    code,
    label,
    capacity,
    x,
    y,
    features,
    sector_id,
    venue_sectors (
      name
    )
  )
`;

function toAppTable(et: SupabaseEventTableJoined): Table {
  const vt = et.venue_tables;
  const sectorName = vt.venue_sectors?.name || 'Principal';
  return {
    id: et.id,
    number: vt.code,
    sector: sectorMap[sectorName] || 'Principal',
    capacity: et.capacity_override || vt.capacity,
    status: statusMap[et.status] || 'livre',
    x: Number(vt.x),
    y: Number(vt.y),
    features: et.features.length > 0 ? et.features : vt.features,
  };
}

// Server-side: uses server client (for Server Components / Server Actions)
export async function listEventTables(eventId: string): Promise<Table[]> {
  if (!isSupabaseMode()) {
    return mockTables;
  }

  // Dynamic import to avoid bundling server-only code in client bundle
  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('event_tables')
    .select(EVENT_TABLES_SELECT)
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (error || !data) {
    // Mapa vazio mentiria sobre disponibilidade — falhar visível (handoff §92/§93)
    throw new DataSourceError('Não foi possível carregar as mesas do evento.', error);
  }

  return (data as unknown as SupabaseEventTableJoined[]).map(toAppTable);
}

// Server-side: pares de mesas combináveis do evento (RPC sanitizada anon-safe).
// Retorna pares de event_tables.id — casa com Table.id do cliente.
export async function getAllowedJoinPairs(eventId: string): Promise<[string, string][]> {
  if (!isSupabaseMode()) {
    return [];
  }

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_allowed_join_pairs', { p_event_id: eventId });

  if (error || !data) {
    console.error('Error fetching allowed join pairs:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(row => [row.event_table_a_id as string, row.event_table_b_id as string]);
}

// Client-side: uses browser client (for Client Components)
export async function listEventTablesClient(eventId: string): Promise<Table[]> {
  if (!isSupabaseMode()) {
    return mockTables;
  }

  // Dynamic import to avoid bundling browser client in server bundle
  const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('event_tables')
    .select(EVENT_TABLES_SELECT)
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (error || !data) {
    // Mapa vazio mentiria sobre disponibilidade — falhar visível (handoff §92/§93)
    throw new DataSourceError('Não foi possível carregar as mesas do evento.', error);
  }

  return (data as unknown as SupabaseEventTableJoined[]).map(toAppTable);
}
