"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart, ArrowUpRight, Users } from 'lucide-react';
import { useDemoStore } from '@/lib/demo-store';

export default function AdminRelatoriosPage() {
  const { state } = useDemoStore();
  
  if (!state.isInitialized) return <div className="text-white">Carregando Relatórios...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-verde-oliva" /> Visão de Crescimento
        </h1>
        <p className="text-creme-gastronomico/70 mt-2">
          Análise de desempenho e histórico de lotação para decisões estratégicas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-creme-gastronomico/70">Ocupação Média (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-verde-oliva flex items-end gap-2">
              88% <ArrowUpRight className="w-5 h-5 text-verde-oliva mb-1" />
            </div>
            <p className="text-xs text-creme-gastronomico/50 mt-1">+12% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-creme-gastronomico/70">Demanda Reprimida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ambar-premium flex items-end gap-2">
              142 <span className="text-sm font-normal text-creme-gastronomico/50 mb-1">pessoas</span>
            </div>
            <p className="text-xs text-creme-gastronomico/50 mt-1">Acumulado nas listas de espera</p>
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-creme-gastronomico/70">Taxa de Confirmação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-laranja-fogo">
              94%
            </div>
            <p className="text-xs text-creme-gastronomico/50 mt-1">Baixo índice de No-show</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-preto-carvao/80 border-marrom-madeira/50 mt-8">
        <CardHeader className="border-b border-marrom-madeira/20 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="w-5 h-5 text-creme-gastronomico" /> Histórico de Eventos Realizados (2026)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {state.events.filter(e => e.bookingState === 'completed').map(event => {
              // Mock occupancy for historical events (for demo purposes) - deterministic to pass purity rules
              const mockOccupancy = 80 + ((event.id.charCodeAt(0) || 0) % 21); // 80-100%
              return (
                <div key={event.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-creme-gastronomico">{event.title} ({event.weekday})</span>
                    <span className="text-verde-oliva font-bold">{mockOccupancy}% Lotação</span>
                  </div>
                  <div className="w-full bg-preto-carvao h-3 rounded-full overflow-hidden border border-marrom-madeira/30">
                    <div className="bg-verde-oliva h-full" style={{ width: `${mockOccupancy}%` }} />
                  </div>
                </div>
              );
            })}
            {state.events.filter(e => e.bookingState === 'completed').length === 0 && (
              <p className="text-creme-gastronomico/50 text-sm italic">Nenhum evento realizado ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
