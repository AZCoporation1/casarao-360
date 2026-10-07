"use client";

import { useState, useEffect, useCallback } from 'react';
import { isMockMode } from '@/lib/data/data-source';
import { useDemoStore } from '@/lib/demo-store';
import { confirmReservationAction, cancelReservationAction } from '@/lib/actions/reservations.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Users, Loader2, RefreshCw } from 'lucide-react';
import { getBookingStateLabel } from '@/lib/booking-policy';
import { useRealtimeRefetch } from '@/lib/realtime/use-realtime-refetch';

// =============================================
// Admin Reservas — Dual Mode (Mock + Supabase)
// =============================================

interface AdminReservation {
  id: string;
  eventId: string;
  tableCode: string;
  sectorName: string;
  tableCapacity: number;
  customerName: string;
  customerPhone: string;
  reservationCode: string;
  partySize: number;
  status: 'pendente' | 'confirmada' | 'cancelada' | 'expirada';
  notes: string | null;
  createdAt: string;
  expiresAt?: string;
}

interface AdminEvent {
  id: string;
  title: string;
  eventDate: string;
  status: string;
}

const statusMap: Record<string, 'pendente' | 'confirmada' | 'cancelada' | 'expirada'> = {
  pending: 'pendente',
  confirmed: 'confirmada',
  cancelled: 'cancelada',
  checked_in: 'confirmada',
  no_show: 'cancelada',
  expired: 'expirada',
};

export default function AdminReservasPage() {
  const mockMode = isMockMode();
  return mockMode ? <MockReservasView /> : <SupabaseReservasView />;
}

// ==================== SUPABASE MODE ====================
function SupabaseReservasView() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

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

        // Auto-select first future event
        const today = new Date().toISOString().split('T')[0];
        const future = mapped.filter(e => e.eventDate >= today);
        if (future.length > 0) {
          setSelectedEventId(future[0].id);
        } else if (mapped.length > 0) {
          setSelectedEventId(mapped[mapped.length - 1].id);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        setActionError('Erro ao carregar eventos. Verifique se está logado.');
      }
      setIsLoading(false);
    }
    loadEvents();
  }, []);

  // Load reservations when event changes
  const loadReservations = useCallback(async () => {
    if (!selectedEventId) return;

    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, event_id, status, party_size,
          customer_name_snapshot, customer_phone_snapshot,
          reservation_code, notes, created_at, expires_at,
          customer:customers (full_name, phone),
          reservation_tables (
            allocation_status,
            venue_table:venue_tables (code, capacity, venue_sectors (name))
          )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: AdminReservation[] = (data || []).map((r: any) => {
        // Find the active/main reservation_table if possible, or just the first one
        const activeTable = r.reservation_tables?.find((rt: any) => rt.allocation_status === 'active' || rt.allocation_status === 'locked');
        const rt = activeTable || (r.reservation_tables?.length > 0 ? r.reservation_tables[0] : null);
        
        return {
          id: r.id,
          eventId: r.event_id,
          tableCode: rt?.venue_table?.code || '??',
          sectorName: rt?.venue_table?.venue_sectors?.name || 'N/A',
          tableCapacity: rt?.venue_table?.capacity || 0,
          customerName: r.customer?.full_name || r.customer_name_snapshot || 'N/A',
          customerPhone: r.customer?.phone || r.customer_phone_snapshot || 'N/A',
          reservationCode: r.reservation_code || '',
          partySize: r.party_size,
          status: statusMap[r.status || 'pending'] || 'pendente',
          notes: r.notes,
          createdAt: r.created_at,
          expiresAt: r.expires_at,
        };
      });

      setReservations(mapped);
    } catch (err) {
      console.error('Error loading reservations:', err);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Realtime (§69): mudanças em reservas OU mesas do evento → refetch
  useRealtimeRefetch(selectedEventId || null, ['reservations', 'event_tables'], loadReservations);

  const handleConfirm = async (id: string) => {
    setIsActing(id);
    setActionError('');
    const result = await confirmReservationAction(id);
    if (result.success) {
      await loadReservations();
    } else {
      setActionError(result.error || 'Erro ao confirmar.');
    }
    setIsActing(null);
  };

  const handleCancel = async (id: string) => {
    setIsActing(id);
    setActionError('');
    const result = await cancelReservationAction(id);
    if (result.success) {
      await loadReservations();
    } else {
      setActionError(result.error || 'Erro ao cancelar.');
    }
    setIsActing(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-creme-gastronomico py-12 justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-laranja-fogo" />
        <span>Carregando Central de Clientes...</span>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const pendentes = reservations.filter(r => r.status === 'pendente');
  const confirmadas = reservations.filter(r => r.status === 'confirmada');
  const canceladas = reservations.filter(r => r.status === 'cancelada');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Central de Reservas</h1>
          <p className="text-creme-gastronomico/70 mt-1">
            Gestão de reservas — dados em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadReservations} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>

          {events.length > 0 && (
            <div className="bg-preto-carvao/80 border border-marrom-madeira/50 rounded-lg p-3 flex items-center gap-4 min-w-[300px]">
              <div className="flex-1">
                <p className="text-xs text-creme-gastronomico/50 uppercase font-bold tracking-wider mb-1">Evento</p>
                <select
                  className="w-full bg-transparent text-creme-gastronomico font-bold text-lg outline-none border-b border-marrom-madeira/30 pb-1 cursor-pointer hover:border-laranja-fogo focus:border-laranja-fogo transition-colors"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map(evt => {
                    const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(evt.eventDate + 'T12:00:00'));
                    return (
                      <option key={evt.id} value={evt.id} className="bg-preto-carvao text-creme-gastronomico">
                        {dateStr} - {evt.title} {evt.status === 'completed' ? '(Realizado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <Badge variant="outline" className="shrink-0">
                {reservations.length} reserva{reservations.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-vermelho-brasa/10 border border-vermelho-brasa/30 text-vermelho-brasa p-3 rounded-lg text-sm flex items-center gap-2">
          <span>{actionError}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionError('')} className="ml-auto text-vermelho-brasa text-xs">Fechar</Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Pendentes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-laranja-fogo flex items-center gap-2">
            <Clock className="w-5 h-5" /> Aguardando Confirmação ({pendentes.length})
          </h2>
          {pendentes.map(res => (
            <Card key={res.id} className="bg-preto-carvao/80 border-laranja-fogo/30">
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-creme-gastronomico text-lg">{res.customerName}</h3>
                    <Badge className="bg-ambar-premium/20 text-ambar-premium border-none hover:bg-ambar-premium/30 uppercase text-[10px]">Pendente</Badge>
                  </div>
                  <p className="text-sm text-creme-gastronomico/70">{res.customerPhone}</p>
                  <div className="flex flex-wrap gap-3 mt-2 items-center">
                    <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80">
                      Mesa {res.tableCode} ({res.sectorName})
                    </Badge>
                    <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80">
                      <Users className="w-3 h-3 mr-1" /> {res.partySize} pessoa{res.partySize > 1 ? 's' : ''}
                    </Badge>
                    {res.reservationCode && (
                      <Badge variant="outline" className="border-ambar-premium/50 text-ambar-premium font-mono">
                        {res.reservationCode}
                      </Badge>
                    )}
                    {res.expiresAt && (
                      <HoldTimer expiresAt={res.expiresAt} />
                    )}
                    <span className="text-xs text-creme-gastronomico/40 flex items-center">
                      {new Date(res.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none border-verde-oliva text-verde-oliva hover:bg-verde-oliva/10"
                    onClick={() => handleConfirm(res.id)}
                    disabled={isActing === res.id}
                  >
                    {isActing === res.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 md:flex-none border-vermelho-brasa text-vermelho-brasa hover:bg-vermelho-brasa/10"
                    onClick={() => handleCancel(res.id)}
                    disabled={isActing === res.id}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendentes.length === 0 && (
            <p className="text-creme-gastronomico/50 text-sm italic">Nenhuma reserva aguardando confirmação para este evento.</p>
          )}
        </div>

        {/* Confirmadas */}
        <div className="space-y-4 mt-4">
          <h2 className="text-xl font-bold text-verde-oliva flex items-center gap-2">
            <Check className="w-5 h-5" /> Reservas Confirmadas ({confirmadas.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {confirmadas.map(res => (
              <Card key={res.id} className="bg-marrom-madeira/10 border-marrom-madeira/30">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-creme-gastronomico">{res.customerName}</h3>
                      <Badge className="bg-verde-oliva/20 text-verde-oliva border-none hover:bg-verde-oliva/30 uppercase text-[10px]">Confirmada</Badge>
                    </div>
                    <p className="text-xs text-creme-gastronomico/70 mt-1">Mesa {res.tableCode} | {res.partySize} pessoa{res.partySize > 1 ? 's' : ''} | {res.reservationCode}</p>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="text-vermelho-brasa hover:text-vermelho-brasa hover:bg-vermelho-brasa/10"
                    onClick={() => handleCancel(res.id)}
                    disabled={isActing === res.id}
                  >
                    {isActing === res.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {confirmadas.length === 0 && (
            <p className="text-creme-gastronomico/50 text-sm italic">Nenhuma reserva confirmada para este evento.</p>
          )}
        </div>

        {/* Canceladas */}
        {canceladas.length > 0 && (
          <div className="space-y-4 mt-4 opacity-60">
            <h2 className="text-lg font-bold text-creme-gastronomico/50 flex items-center gap-2">
              <X className="w-5 h-5" /> Canceladas ({canceladas.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {canceladas.map(res => (
                <Card key={res.id} className="bg-preto-carvao/40 border-marrom-madeira/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-creme-gastronomico/50 line-through">{res.customerName}</p>
                      <Badge className={res.status === 'expirada' ? 'bg-marrom-madeira/20 text-marrom-madeira border-none uppercase text-[10px]' : 'bg-vermelho-brasa/20 text-vermelho-brasa border-none uppercase text-[10px]'}>
                        {res.status === 'expirada' ? 'Expirada' : 'Cancelada'}
                      </Badge>
                    </div>
                    <p className="text-xs text-creme-gastronomico/30">Mesa {res.tableCode} | {res.partySize}p</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== MOCK MODE (fallback) ====================
function MockReservasView() {
  const { state, dispatch } = useDemoStore();
  const [selectedEventIdx, setSelectedEventIdx] = useState(0);

  if (!state.isInitialized) return <div className="text-white">Carregando Central de Clientes...</div>;

  const futureEvents = state.events.filter(e => e.bookingState !== 'completed');
  const currentEvent = futureEvents[selectedEventIdx] || futureEvents[0];
  const currentReservations = state.reservations.filter(r => currentEvent && r.eventId === currentEvent.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Central de Clientes</h1>
          <p className="text-creme-gastronomico/70 mt-1">Modo demonstração — dados locais.</p>
        </div>
        {futureEvents.length > 0 && (
          <div className="bg-preto-carvao/80 border border-marrom-madeira/50 rounded-lg p-3 flex items-center gap-4 min-w-[300px]">
            <div className="flex-1">
              <p className="text-xs text-creme-gastronomico/50 uppercase font-bold tracking-wider mb-1">Evento Ativo</p>
              <select
                className="w-full bg-transparent text-creme-gastronomico font-bold text-lg outline-none border-b border-marrom-madeira/30 pb-1"
                value={selectedEventIdx}
                onChange={(e) => setSelectedEventIdx(Number(e.target.value))}
              >
                {futureEvents.map((evt, idx) => (
                  <option key={evt.id} value={idx} className="bg-preto-carvao text-creme-gastronomico">
                    {evt.weekday} {evt.eventDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(evt.eventDate + 'T12:00:00')) : ''} - {evt.title}
                  </option>
                ))}
              </select>
            </div>
            <Badge variant="outline" className="shrink-0">
              {getBookingStateLabel(currentEvent?.bookingState || 'announced', currentEvent)}
            </Badge>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-laranja-fogo flex items-center gap-2">
            <Clock className="w-5 h-5" /> Aguardando Confirmação
          </h2>
          {currentReservations.filter(r => r.status === 'pendente').map(res => {
            const table = state.tables.find(t => t.id === res.tableId);
            return (
              <Card key={res.id} className="bg-preto-carvao/80 border-laranja-fogo/30">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-creme-gastronomico text-lg">{res.customerName}</h3>
                    <p className="text-sm text-creme-gastronomico/70">{res.customerPhone} | CPF: {res.customerCpf}</p>
                    <div className="flex gap-3 mt-2">
                      <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80">
                        Mesa {table?.number} ({table?.sector})
                      </Badge>
                      <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/80">
                        <Users className="w-3 h-3 mr-1" /> {res.peopleCount} pessoas
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none border-verde-oliva text-verde-oliva hover:bg-verde-oliva/10" onClick={() => dispatch({ type: 'UPDATE_RESERVATION_STATUS', payload: { id: res.id, status: 'confirmada' } })}>
                      <Check className="w-4 h-4 mr-2" /> Confirmar
                    </Button>
                    <Button variant="outline" className="flex-1 md:flex-none border-vermelho-brasa text-vermelho-brasa hover:bg-vermelho-brasa/10" onClick={() => dispatch({ type: 'UPDATE_RESERVATION_STATUS', payload: { id: res.id, status: 'cancelada' } })}>
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {currentReservations.filter(r => r.status === 'pendente').length === 0 && (
            <p className="text-creme-gastronomico/50 text-sm italic">Nenhuma reserva aguardando confirmação.</p>
          )}
        </div>
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-bold text-verde-oliva flex items-center gap-2">
            <Check className="w-5 h-5" /> Reservas Confirmadas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentReservations.filter(r => r.status === 'confirmada').map(res => {
              const table = state.tables.find(t => t.id === res.tableId);
              return (
                <Card key={res.id} className="bg-marrom-madeira/10 border-marrom-madeira/30">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-creme-gastronomico">{res.customerName}</h3>
                      <p className="text-xs text-creme-gastronomico/70">Mesa {table?.number} | {res.peopleCount} pessoas</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-vermelho-brasa hover:text-vermelho-brasa hover:bg-vermelho-brasa/10" onClick={() => dispatch({ type: 'UPDATE_RESERVATION_STATUS', payload: { id: res.id, status: 'cancelada' } })}>
                      Cancelar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        return 'Expirado';
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return `${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <Badge variant="outline" className={`border-ambar-premium/50 ${timeLeft === 'Expirado' ? 'text-vermelho-brasa' : 'text-ambar-premium'}`}>
      <Clock className="w-3 h-3 mr-1" /> {timeLeft === 'Expirado' ? 'Expirado' : `Expira em ${timeLeft}`}
    </Badge>
  );
}
