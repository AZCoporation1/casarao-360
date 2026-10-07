"use client";

import { useState, useEffect } from 'react';
import { isMockMode } from '@/lib/data/data-source';
import { useDemoStore } from '@/lib/demo-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, TrendingUp, Sparkles, History, Loader2 } from 'lucide-react';
import Link from 'next/link';

// =============================================
// Admin Dashboard — Dual Mode (Mock + Supabase)
// =============================================

interface DashboardEvent {
  id: string;
  title: string;
  eventDate: string;
  status: string;
}

interface DashboardStats {
  totalEvents: number;
  futureEvents: number;
  completedEvents: number;
  totalTables: number;
  freeTables: number;
  pendingReservations: number;
  confirmedReservations: number;
  nextEventTitle: string;
  nextEventDate: string;
}

export default function AdminDashboard() {
  const mockMode = isMockMode();
  return mockMode ? <MockDashboard /> : <SupabaseDashboard />;
}

// ==================== SUPABASE MODE ====================
function SupabaseDashboard() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase: any = getSupabaseBrowserClient();

        // Fetch all events
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, event_date, status')
          .neq('status', 'cancelled')
          .order('event_date', { ascending: true });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allEvents: DashboardEvent[] = (eventsData || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          eventDate: e.event_date,
          status: e.status,
        }));

        setEvents(allEvents);

        const today = new Date().toISOString().split('T')[0];
        const future = allEvents.filter(e => e.eventDate >= today && e.status !== 'completed');
        const completed = allEvents.filter(e => e.status === 'completed');
        const nextEvent = future[0];

        // Count tables for next event
        let freeTables = 0;
        let totalTables = 0;
        let pendingRes = 0;
        let confirmedRes = 0;

        if (nextEvent) {
          const { count: freeCount } = await supabase
            .from('event_tables')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', nextEvent.id)
            .eq('status', 'free');

          const { count: totalCount } = await supabase
            .from('event_tables')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', nextEvent.id);

          const { count: pendCount } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', nextEvent.id)
            .eq('status', 'pending');

          const { count: confCount } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', nextEvent.id)
            .eq('status', 'confirmed');

          freeTables = freeCount || 0;
          totalTables = totalCount || 0;
          pendingRes = pendCount || 0;
          confirmedRes = confCount || 0;
        }

        setStats({
          totalEvents: allEvents.length,
          futureEvents: future.length,
          completedEvents: completed.length,
          totalTables,
          freeTables,
          pendingReservations: pendingRes,
          confirmedReservations: confirmedRes,
          nextEventTitle: nextEvent?.title || 'Nenhum',
          nextEventDate: nextEvent?.eventDate || '',
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
      setIsLoading(false);
    }
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-creme-gastronomico py-12 justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-laranja-fogo" />
        <span>Carregando Painel Executivo...</span>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const futureEvents = events.filter(e => e.eventDate >= today && e.status !== 'completed');
  const completedEvents = events.filter(e => e.status === 'completed');
  const occupancy = stats && stats.totalTables > 0 ? Math.round(((stats.totalTables - stats.freeTables) / stats.totalTables) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">{greeting}, Davi.</h1>
          <p className="text-creme-gastronomico/70 mt-1">
            O Casarão possui <strong className="text-laranja-fogo">{futureEvents.length} eventos futuros</strong> e <span className="text-creme-gastronomico/50">{completedEvents.length} realizados</span>.
          </p>
        </div>
        <Button variant="premium" asChild>
          <Link href="/admin/mapa">Abrir Mapa Operacional</Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ambar-premium" /> Próximo Evento
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg md:text-xl font-bold text-creme-gastronomico truncate" title={stats?.nextEventTitle}>
              {stats?.nextEventTitle}
            </div>
            <p className="text-[10px] md:text-xs text-creme-gastronomico/50 mt-0.5">
              {stats?.nextEventDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(stats.nextEventDate + 'T12:00:00')) : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="w-12 h-12 text-verde-oliva" />
          </div>
          <CardHeader className="pb-1.5 pt-4 px-4 relative z-10">
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-verde-oliva" /> Ocupação Prevista
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 relative z-10">
            <div className="text-2xl md:text-3xl font-bold text-creme-gastronomico">{occupancy}%</div>
            <div className="w-full bg-marrom-madeira/30 h-1.5 mt-1.5 rounded-full overflow-hidden">
              <div className="bg-verde-oliva h-full rounded-full transition-all duration-500" style={{ width: `${occupancy}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              Mesas Livres
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-verde-oliva">
              {stats?.freeTables}<span className="text-sm font-normal text-creme-gastronomico/40">/{stats?.totalTables}</span>
            </div>
            <p className="text-[10px] md:text-xs text-creme-gastronomico/50 mt-0.5">Para próximo evento</p>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-laranja-fogo" /> Reservas Pendentes
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-laranja-fogo">{stats?.pendingReservations || 0}</div>
            <p className="text-[10px] md:text-xs text-creme-gastronomico/50 mt-0.5">Aguardando confirmação</p>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50 col-span-2 md:col-span-1">
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              Confirmadas
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl md:text-3xl font-bold text-verde-oliva">{stats?.confirmedReservations || 0}</div>
            <p className="text-[10px] md:text-xs text-creme-gastronomico/50 mt-0.5">Reservas ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Events Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/30">
          <CardHeader>
            <CardTitle className="text-lg text-creme-gastronomico flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-laranja-fogo" /> Próximos Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {futureEvents.slice(0, 6).map(event => {
              const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(event.eventDate + 'T12:00:00'));
              return (
                <div key={event.id} className="flex items-center justify-between py-2 border-b border-marrom-madeira/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-ambar-premium bg-ambar-premium/10 px-2 py-1 rounded">{dateStr}</span>
                    <span className="text-sm text-creme-gastronomico font-medium">{event.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{event.status === 'scheduled' ? 'Agendado' : 'Aberto'}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/30">
          <CardHeader>
            <CardTitle className="text-lg text-creme-gastronomico flex items-center gap-2">
              <History className="w-5 h-5 text-creme-gastronomico/50" /> Eventos Realizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedEvents.length === 0 ? (
              <p className="text-sm text-creme-gastronomico/50">Nenhum evento realizado ainda.</p>
            ) : (
              completedEvents.map(event => {
                const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(event.eventDate + 'T12:00:00'));
                return (
                  <div key={event.id} className="flex items-center justify-between py-2 border-b border-marrom-madeira/20 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-creme-gastronomico/40 bg-marrom-madeira/10 px-2 py-1 rounded">{dateStr}</span>
                      <span className="text-sm text-creme-gastronomico/60">{event.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Realizado</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== MOCK MODE (fallback) ====================
function MockDashboard() {
  const { state } = useDemoStore();

  if (!state.isInitialized) return <div className="text-white">Carregando Painel Executivo...</div>;

  const futureEvents = state.events.filter(e => e.bookingState !== 'completed');
  const completedEvents = state.events.filter(e => e.bookingState === 'completed');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico">Bom dia, Davi.</h1>
        <p className="text-creme-gastronomico/70 mt-1">
          Modo demonstração — {futureEvents.length} eventos futuros, {completedEvents.length} realizados.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/30">
          <CardHeader><CardTitle className="text-lg text-creme-gastronomico">Próximos Shows</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {futureEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-marrom-madeira/20 last:border-0">
                <span className="text-sm text-creme-gastronomico">{event.title}</span>
                <Badge variant="outline" className="text-xs">{event.bookingState}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-preto-carvao/80 border-marrom-madeira/30">
          <CardHeader><CardTitle className="text-lg text-creme-gastronomico">Realizados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-marrom-madeira/20 last:border-0">
                <span className="text-sm text-creme-gastronomico/60">{event.title}</span>
                <Badge variant="outline" className="text-xs">Realizado</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Button variant="premium" asChild><Link href="/admin/mapa">Abrir Mapa</Link></Button>
    </div>
  );
}
