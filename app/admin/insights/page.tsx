"use client";

import { useDemoStore } from '@/lib/demo-store';
import { generateInsights } from '@/lib/insight-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminInsightsPage() {
  const { state } = useDemoStore();
  const [resolved, setResolved] = useState<string[]>([]);

  if (!state.isInitialized) return <div className="text-white">Carregando Assistente...</div>;

  const rawInsights = generateInsights(state.tables, state.reservations, state.waitlist.length);
  const insights = rawInsights.filter(i => !resolved.includes(i.id));

  const handleResolve = (id: string) => {
    setResolved(prev => [...prev, id]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico flex items-center gap-3">
          <Lightbulb className="w-8 h-8 text-ambar-premium" /> Assistente de Previsibilidade
        </h1>
        <p className="text-creme-gastronomico/70 mt-2">
          Análise inteligente baseada nos dados operacionais em tempo real para ajudar na tomada de decisão.
        </p>
      </div>

      <div className="space-y-4 pt-4">
        {insights.length === 0 ? (
          <Card className="bg-preto-carvao border-dashed border-marrom-madeira/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-verde-oliva mb-4" />
              <h3 className="text-xl font-bold text-creme-gastronomico">Tudo em ordem</h3>
              <p className="text-creme-gastronomico/70 mt-2 max-w-md">
                Todas as recomendações operacionais foram resolvidas. O Casarão está operando com previsibilidade máxima no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          insights.map(insight => (
            <Card key={insight.id} className="bg-preto-carvao/80 border-marrom-madeira/50 overflow-hidden relative">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.impact === 'positive' ? 'bg-verde-oliva' : insight.impact === 'negative' ? 'bg-vermelho-brasa' : 'bg-ambar-premium'}`} />
              <CardContent className="p-6 pl-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-marrom-madeira/50 text-creme-gastronomico/60">Insight Operacional</Badge>
                    <h3 className="text-lg font-bold text-creme-gastronomico">{insight.title}</h3>
                  </div>
                  <p className="text-creme-gastronomico/80 leading-relaxed max-w-2xl">
                    {insight.description}
                  </p>
                </div>
                {insight.actionable && (
                  <Button 
                    variant="outline" 
                    className="shrink-0 border-marrom-madeira/50 hover:bg-marrom-madeira/20"
                    onClick={() => handleResolve(insight.id)}
                  >
                    Marcar como Resolvido
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
