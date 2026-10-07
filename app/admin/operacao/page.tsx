"use client";

import { useDemoStore } from '@/lib/demo-store';
import { getEventOccupancy } from '@/lib/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Users, Wine, AlertTriangle } from 'lucide-react';

export default function AdminOperacaoPage() {
  const { state } = useDemoStore();

  if (!state.isInitialized) return <div className="text-white">Carregando Base Operacional...</div>;

  const nextEvent = state.events[0];
  const occupancy = getEventOccupancy(state.tables, nextEvent?.id || '');

  // Simulação de estimativa operacional baseada na ocupação
  const staffNeeded = Math.ceil(occupancy / 10) + 2; // ex: 80% = 10 pessoas
  const securityNeeded = Math.ceil(occupancy / 20) + 1; 
  const beerNeeded = Math.ceil((occupancy * 3.5) / 10) * 10; // ex: 80% = ~280 long necks

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-marrom-madeira" /> Base Operacional
        </h1>
        <p className="text-creme-gastronomico/70 mt-2">
          Estimativas e preparativos para o próximo evento com base no volume de reservas.
        </p>
      </div>

      {nextEvent && (
        <Card className="bg-marrom-madeira/10 border-marrom-madeira/30 mb-8">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-creme-gastronomico/50">Evento Alvo</span>
              <p className="font-bold text-creme-gastronomico text-lg">{nextEvent.title}</p>
            </div>
            <Badge variant="premium">Lotação Prevista: {occupancy}%</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Equipe */}
        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="border-b border-marrom-madeira/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-verde-oliva" /> Equipe Recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Atendimento (Garçons)</span>
              <span className="font-bold text-verde-oliva text-lg">{staffNeeded}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Segurança / Recepção</span>
              <span className="font-bold text-verde-oliva text-lg">{securityNeeded}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Bar / Bartenders</span>
              <span className="font-bold text-verde-oliva text-lg">3</span>
            </div>
          </CardContent>
        </Card>

        {/* Estoque / Insumos */}
        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="border-b border-marrom-madeira/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wine className="w-5 h-5 text-ambar-premium" /> Estimativa de Insumos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Cerveja Long Neck</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-ambar-premium text-lg">{beerNeeded} un.</span>
                {occupancy > 80 && <AlertTriangle className="w-4 h-4 text-vermelho-brasa" />}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Gin & Destilados</span>
              <span className="font-bold text-ambar-premium text-lg">12 gfs.</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-preto-carvao rounded-lg border border-marrom-madeira/20">
              <span className="text-creme-gastronomico">Insumos Cozinha (Porções)</span>
              <span className="font-bold text-ambar-premium text-lg">Alta</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
