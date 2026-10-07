"use client";

import { useDemoStore } from '@/lib/demo-store';
import { getEventOccupancy } from '@/lib/metrics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, ChevronRight, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { getBookingStateLabel, getBookingStateBadgeVariant } from '@/lib/booking-policy';

export default function AdminEventosPage() {
  const { state } = useDemoStore();

  if (!state.isInitialized) return <div className="text-white">Carregando Agenda de Eventos...</div>;

  const futureEvents = state.events.filter(e => e.bookingState !== 'completed');
  const completedEvents = state.events.filter(e => e.bookingState === 'completed');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-creme-gastronomico">Agenda de Eventos</h1>
          <p className="text-creme-gastronomico/70 mt-1">
            {state.events.length} eventos na agenda oficial • {futureEvents.length} futuros • {completedEvents.length} realizados
          </p>
        </div>
      </div>

      {/* Future Events */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-creme-gastronomico flex items-center gap-2">
          <Clock className="w-5 h-5 text-laranja-fogo" /> Próximos ({futureEvents.length})
        </h2>
        {futureEvents.map((event, idx) => {
          const occupancy = getEventOccupancy(state.tables, event.id);
          const statusVariant = occupancy > 90 ? 'danger' : occupancy > 70 ? 'warning' : 'success';
          const bookingState = event.bookingState || 'announced';
          const dateStr = event.eventDate
            ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(event.eventDate + 'T12:00:00'))
            : '';
          
          return (
            <Card key={event.id} className="bg-preto-carvao/80 border-marrom-madeira/50 hover:border-marrom-madeira transition-colors">
              <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="hidden md:flex w-16 h-16 rounded-xl bg-marrom-madeira/20 items-center justify-center border border-marrom-madeira/30 shrink-0 flex-col">
                    <span className="text-xs text-creme-gastronomico/50 font-bold">{event.weekday}</span>
                    <span className="text-lg text-laranja-fogo font-bold">{dateStr}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-creme-gastronomico flex items-center gap-2 flex-wrap">
                      {event.title}
                      {idx === 0 && <Badge variant="premium" className="text-[10px] py-0 px-2 h-5">Próximo</Badge>}
                      <Badge variant={getBookingStateBadgeVariant(bookingState) as 'default'} className="text-[10px] py-0 px-2 h-5">
                        {getBookingStateLabel(bookingState, event)}
                      </Badge>
                    </h2>
                    <p className="text-sm text-creme-gastronomico/70 mb-2">
                      {event.weekday} · {dateStr} · {event.timeTbd ? 'Horário em breve' : ''}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-creme-gastronomico/60">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Cap. 192 lugares</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Lotação Prevista: {occupancy}%</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-2 shrink-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-creme-gastronomico/70">Ocupação do Salão</span>
                    <span className="font-bold text-creme-gastronomico">{occupancy}%</span>
                  </div>
                  <div className="w-full bg-preto-carvao h-2 rounded-full overflow-hidden border border-marrom-madeira/30">
                    <div 
                      className={`h-full ${statusVariant === 'danger' ? 'bg-vermelho-brasa' : statusVariant === 'warning' ? 'bg-ambar-premium' : 'bg-verde-oliva'}`}
                      style={{ width: `${occupancy}%` }} 
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" asChild className="w-full md:w-auto text-xs">
                      <Link href="/admin/mapa">Ver Operação <ChevronRight className="w-3 h-3 ml-1" /></Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completed Events */}
      {completedEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-creme-gastronomico/70 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-creme-gastronomico/40" /> Realizados ({completedEvents.length})
          </h2>
          {completedEvents.map(event => {
            const dateStr = event.eventDate
              ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(event.eventDate + 'T12:00:00'))
              : '';

            return (
              <Card key={event.id} className="bg-preto-carvao/40 border-marrom-madeira/20 opacity-70">
                <CardContent className="p-4 md:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex w-12 h-12 rounded-lg bg-marrom-madeira/10 items-center justify-center border border-marrom-madeira/20 shrink-0 flex-col">
                      <span className="text-xs text-creme-gastronomico/40 font-bold">{event.weekday}</span>
                      <span className="text-sm text-creme-gastronomico/40 font-bold">{dateStr}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-creme-gastronomico/60">{event.title}</h3>
                      <p className="text-xs text-creme-gastronomico/40">{event.weekday} · {dateStr}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Realizado</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
