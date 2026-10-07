"use client";

import { useState, useEffect, useCallback } from 'react';
import { isMockMode } from '@/lib/data/data-source';
import { useDemoStore } from '@/lib/demo-store';
import { listEventTablesClient } from '@/lib/data/tables.repository';
import { updateTableStatusAction } from '@/lib/actions/admin.actions';
import { VenueMap } from '@/components/map/VenueMap';
import { Table, TableStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { getSectorLabel } from '@/lib/map/casarao-layout';
import { useRealtimeRefetch } from '@/lib/realtime/use-realtime-refetch';

// =============================================
// Admin Mapa — Dual Mode (Mock + Supabase)
// =============================================

interface AdminEvent {
  id: string;
  title: string;
  eventDate: string;
  status: string;
}

interface LinkedReservation {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  status: string;
  reservationCode: string;
}

const appStatusMap: Record<string, TableStatus> = {
  free: 'livre',
  reserved: 'reservada',
  occupied: 'ocupada',
  blocked: 'bloqueada',
  pending: 'aguardando',
  waitlist: 'lista-espera',
};

const dbStatusMap: Record<TableStatus, string> = {
  livre: 'free',
  reservada: 'reserved',
  ocupada: 'occupied',
  bloqueada: 'blocked',
  aguardando: 'pending',
  'lista-espera': 'waitlist',
};

export default function AdminMapaPage() {
  const mockMode = isMockMode();
  return mockMode ? <MockMapaView /> : <SupabaseMapaView />;
}

// ==================== SUPABASE MODE ====================
function SupabaseMapaView() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservationsMap, setReservationsMap] = useState<Record<string, LinkedReservation>>({});
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Load events on mount
  useEffect(() => {
    async function loadEvents() {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase: any = getSupabaseBrowserClient();

        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_date, status')
          .neq('status', 'cancelled')
          .order('event_date', { ascending: true });

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: AdminEvent[] = (data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          eventDate: e.event_date,
          status: e.status,
        }));

        setEvents(mapped);

        const today = new Date().toISOString().split('T')[0];
        const future = mapped.filter(e => e.eventDate >= today);
        if (future.length > 0) {
          setSelectedEventId(future[0].id);
        } else if (mapped.length > 0) {
          setSelectedEventId(mapped[mapped.length - 1].id);
        }
      } catch (err) {
        console.error('Error loading events:', err);
      }
      setIsLoading(false);
    }
    loadEvents();
  }, []);

  // Load tables + reservations when event changes
  const loadEventData = useCallback(async () => {
    if (!selectedEventId) return;

    try {
      // Load tables via repository (reuses existing logic)
      const eventTables = await listEventTablesClient(selectedEventId);
      setTables(eventTables);

      // Load active reservations for this event via reservation_tables
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseBrowserClient();

      const { data: resData } = await supabase
        .from('reservation_tables')
        .select(`
          venue_table:venue_tables(code),
          allocation_status,
          reservation:reservations!inner (
            id, event_id, status, reservation_code, customer_name_snapshot, customer_phone_snapshot, party_size, customer:customers(full_name, phone)
          )
        `)
        .eq('reservations.event_id', selectedEventId)
        .in('allocation_status', ['active', 'locked']);

      const resMap: Record<string, LinkedReservation> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (resData || []).forEach((rt: any) => {
        const r = rt.reservation;
        if (!r || !rt.venue_table) return;
        if (r.status === 'cancelled' || r.status === 'expired' || r.status === 'no_show') return;
        
        resMap[rt.venue_table.code] = {
          id: r.id,
          customerName: r.customer?.full_name || r.customer_name_snapshot || 'N/A',
          customerPhone: r.customer?.phone || r.customer_phone_snapshot || 'N/A',
          partySize: r.party_size,
          status: r.status === 'confirmed' ? 'confirmada' : r.status === 'pending' ? 'pendente' : r.status,
          reservationCode: r.reservation_code || '',
        };
      });
      setReservationsMap(resMap);

      // Cross-reference allocations
      const finalTables = eventTables.map(t => {
        const r = resMap[t.number];
        if (r) {
          const merged = { ...t, reservationCode: r.reservationCode };
          if (r.status === 'pendente') return { ...merged, status: 'aguardando' as const };
          if (r.status === 'confirmada') return { ...merged, status: 'reservada' as const };
          return merged;
        }
        return t;
      });
      setTables(finalTables as Table[]);
    } catch (err) {
      console.error('Error loading event data:', err);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Realtime (§69): mudanças em mesas OU reservas do evento → refetch
  useRealtimeRefetch(selectedEventId || null, ['event_tables', 'reservations'], loadEventData);

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
  };

  const handleStatusChange = async (newStatus: TableStatus) => {
    if (!selectedTable) return;
    setIsChangingStatus(true);

    const dbStatus = dbStatusMap[newStatus];
    const result = await updateTableStatusAction(selectedTable.id, dbStatus);

    if (result.success) {
      // Update local state immediately
      setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: newStatus } : t));
      setSelectedTable({ ...selectedTable, status: newStatus });
    }
    setIsChangingStatus(false);
  };

  const linkedReservation = selectedTable ? reservationsMap[selectedTable.number] : null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-creme-gastronomico py-12 justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-laranja-fogo" />
        <span>Carregando Mapa Operacional...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Mapa Inteligente do Salão</h1>
          <p className="text-creme-gastronomico/70 mt-1">
            Gestão inteligente da operação — dados em tempo real do banco.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadEventData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>

          {events.length > 0 && (
            <div className="bg-preto-carvao/80 border border-marrom-madeira/50 rounded-lg p-3 flex items-center gap-4 min-w-[300px]">
              <div className="flex-1">
                <p className="text-xs text-creme-gastronomico/50 uppercase font-bold tracking-wider mb-1">Evento</p>
                <select
                  className="w-full bg-transparent text-creme-gastronomico font-bold text-lg outline-none border-b border-marrom-madeira/30 pb-1 cursor-pointer"
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setSelectedTable(null);
                  }}
                >
                  {events.map(evt => {
                    const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(evt.eventDate + 'T12:00:00'));
                    return (
                      <option key={evt.id} value={evt.id} className="bg-preto-carvao text-creme-gastronomico">
                        {dateStr} - {evt.title}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Badge variant="outline" className="shrink-0">
                {tables.filter(t => t.status === 'livre').length}/{tables.length} livres
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-preto-carvao/80 rounded-xl border border-marrom-madeira/30 p-2 shadow-inner h-full flex flex-col">
          <VenueMap
            tables={tables}
            onSelectTable={handleSelectTable}
            selectedTableId={selectedTable?.id}
            mode="admin"
          />
        </div>

        <div className="lg:col-span-1 flex flex-col h-full">
          {selectedTable ? (
            <Card className="flex-1 bg-preto-carvao border-marrom-madeira/50 overflow-y-auto">
              <CardHeader className="bg-marrom-madeira/20 border-b border-marrom-madeira/30">
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="text-laranja-fogo font-bold uppercase tracking-wider text-xs">Mesa {selectedTable.number}</CardDescription>
                    <CardTitle className="text-2xl text-creme-gastronomico">{getSectorLabel(selectedTable.sector)}</CardTitle>
                  </div>
                  <Badge variant={selectedTable.status === 'livre' ? 'success' : 'warning'}>
                    {selectedTable.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Forçar Status */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60">Forçar Status Operacional</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('livre')} disabled={isChangingStatus}
                      className={selectedTable.status === 'livre' ? 'bg-verde-oliva/20 border-verde-oliva text-verde-oliva' : ''}>
                      {isChangingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Livre'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('ocupada')} disabled={isChangingStatus}
                      className={selectedTable.status === 'ocupada' ? 'bg-vermelho-brasa/20 border-vermelho-brasa text-vermelho-brasa' : ''}>Ocupada</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('reservada')} disabled={isChangingStatus}
                      className={selectedTable.status === 'reservada' ? 'bg-ambar-premium/20 border-ambar-premium text-ambar-premium' : ''}>Reservada</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('bloqueada')} disabled={isChangingStatus}
                      className={selectedTable.status === 'bloqueada' ? 'bg-marrom-madeira/50 border-marrom-madeira text-creme-gastronomico' : ''}>Bloqueada</Button>
                  </div>
                </div>

                <hr className="border-marrom-madeira/30" />

                {/* Cliente Vinculado */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60">Cliente Vinculado</label>
                  {linkedReservation ? (
                    <div className="bg-marrom-madeira/10 p-3 rounded-lg border border-marrom-madeira/20">
                      <p className="font-bold text-creme-gastronomico">{linkedReservation.customerName}</p>
                      <p className="text-sm text-creme-gastronomico/70">{linkedReservation.customerPhone}</p>
                      <p className="text-sm text-creme-gastronomico/70 mt-2">
                        <span className="font-semibold text-ambar-premium">Pessoas:</span> {linkedReservation.partySize} / {selectedTable.capacity}
                      </p>
                      {linkedReservation.reservationCode && (
                        <p className="text-xs text-ambar-premium font-mono mt-1">{linkedReservation.reservationCode}</p>
                      )}
                      <Badge variant={linkedReservation.status === 'confirmada' ? 'success' : 'info'} className="mt-2">
                        Reserva {linkedReservation.status}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-sm text-creme-gastronomico/50 italic p-3 bg-preto-carvao/50 rounded-lg border border-dashed border-marrom-madeira/30 text-center">
                      Nenhuma reserva ou cliente vinculado.
                    </div>
                  )}
                </div>

                <hr className="border-marrom-madeira/30" />

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60">Atributos</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTable.features?.map(f => (
                      <Badge key={f} variant="outline" className="text-xs border-marrom-madeira/50">{f}</Badge>
                    ))}
                    <Badge variant="outline" className="text-xs border-marrom-madeira/50">Cap. {selectedTable.capacity} pessoas</Badge>
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-8 border-dashed border-marrom-madeira/50 bg-preto-carvao/20">
              <p className="text-creme-gastronomico/50 text-center">
                Selecione uma mesa no mapa para ver os detalhes da operação, cliente vinculado ou forçar um bloqueio de status.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MOCK MODE (fallback) ====================
function MockMapaView() {
  const { state, dispatch } = useDemoStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState(0);

  if (!state.isInitialized) return <div className="text-white">Carregando Mapa Operacional...</div>;

  const futureEvents = state.events.filter(e => e.bookingState !== 'completed');
  const currentEvent = futureEvents[selectedEventIdx] || futureEvents[0];

  const handleStatusChange = (newStatus: TableStatus) => {
    if (selectedTable) {
      dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { id: selectedTable.id, status: newStatus } });
      setSelectedTable({ ...selectedTable, status: newStatus });
    }
  };

  const reservation = selectedTable
    ? state.reservations.find(r => r.tableId === selectedTable.id && r.eventId === currentEvent?.id && r.status !== 'cancelada')
    : null;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Mapa Operacional</h1>
          <p className="text-creme-gastronomico/70 mt-1">Modo demonstração — dados locais.</p>
        </div>
        {futureEvents.length > 0 && (
          <div className="bg-preto-carvao/80 border border-marrom-madeira/50 rounded-lg p-3 flex items-center gap-4 min-w-[300px]">
            <div className="flex-1">
              <p className="text-xs text-creme-gastronomico/50 uppercase font-bold tracking-wider mb-1">Evento</p>
              <select className="w-full bg-transparent text-creme-gastronomico font-bold text-lg outline-none border-b border-marrom-madeira/30 pb-1"
                value={selectedEventIdx} onChange={(e) => { setSelectedEventIdx(Number(e.target.value)); setSelectedTable(null); }}>
                {futureEvents.map((evt, idx) => (
                  <option key={evt.id} value={idx} className="bg-preto-carvao text-creme-gastronomico">
                    {evt.weekday} {evt.eventDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(evt.eventDate + 'T12:00:00')) : ''} - {evt.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-preto-carvao/80 rounded-xl border border-marrom-madeira/30 p-2 shadow-inner h-full flex flex-col">
          <VenueMap tables={state.tables} onSelectTable={setSelectedTable} selectedTableId={selectedTable?.id} mode="admin" />
        </div>
        <div className="lg:col-span-1 flex flex-col h-full">
          {selectedTable ? (
            <Card className="flex-1 bg-preto-carvao border-marrom-madeira/50 overflow-y-auto">
              <CardHeader className="bg-marrom-madeira/20 border-b border-marrom-madeira/30">
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="text-laranja-fogo font-bold uppercase tracking-wider text-xs">Mesa {selectedTable.number}</CardDescription>
                    <CardTitle className="text-2xl text-creme-gastronomico">{getSectorLabel(selectedTable.sector)}</CardTitle>
                  </div>
                  <Badge variant={selectedTable.status === 'livre' ? 'success' : 'warning'}>{selectedTable.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60">Forçar Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('livre')} className={selectedTable.status === 'livre' ? 'bg-verde-oliva/20 border-verde-oliva text-verde-oliva' : ''}>Livre</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('ocupada')} className={selectedTable.status === 'ocupada' ? 'bg-vermelho-brasa/20 border-vermelho-brasa text-vermelho-brasa' : ''}>Ocupada</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('reservada')} className={selectedTable.status === 'reservada' ? 'bg-ambar-premium/20 border-ambar-premium text-ambar-premium' : ''}>Reservada</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange('bloqueada')} className={selectedTable.status === 'bloqueada' ? 'bg-marrom-madeira/50 border-marrom-madeira text-creme-gastronomico' : ''}>Bloqueada</Button>
                  </div>
                </div>
                <hr className="border-marrom-madeira/30" />
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60">Cliente Vinculado</label>
                  {reservation ? (
                    <div className="bg-marrom-madeira/10 p-3 rounded-lg border border-marrom-madeira/20">
                      <p className="font-bold text-creme-gastronomico">{reservation.customerName}</p>
                      <p className="text-sm text-creme-gastronomico/70">{reservation.customerPhone}</p>
                      <p className="text-sm text-creme-gastronomico/70 mt-2"><span className="font-semibold text-ambar-premium">Pessoas:</span> {reservation.peopleCount} / {selectedTable.capacity}</p>
                      <Badge variant={reservation.status === 'confirmada' ? 'success' : 'info'} className="mt-2">Reserva {reservation.status}</Badge>
                    </div>
                  ) : (
                    <div className="text-sm text-creme-gastronomico/50 italic p-3 bg-preto-carvao/50 rounded-lg border border-dashed border-marrom-madeira/30 text-center">Nenhuma reserva vinculada.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-8 border-dashed border-marrom-madeira/50 bg-preto-carvao/20">
              <p className="text-creme-gastronomico/50 text-center">Selecione uma mesa no mapa para ver os detalhes.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
