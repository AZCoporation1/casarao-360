"use client";

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReservarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-preto-carvao px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-vermelho-brasa/10 border border-vermelho-brasa/30 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-vermelho-brasa" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-creme-gastronomico mb-3">
        Não foi possível carregar o mapa de mesas
      </h1>
      <p className="text-creme-gastronomico/60 text-sm max-w-md mb-8 leading-relaxed">
        Ocorreu um erro ao buscar a disponibilidade das mesas. Nenhuma informação
        incorreta foi exibida — tente novamente em instantes.
      </p>
      {error?.digest && (
        <p className="text-[10px] text-creme-gastronomico/30 font-mono mb-6">ref: {error.digest}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="premium" className="px-8 h-12 font-bold" onClick={() => reset()}>
          <RotateCcw className="w-4 h-4 mr-2" /> Tentar novamente
        </Button>
        <Button variant="outline" className="px-8 h-12 border-marrom-madeira/40" asChild>
          <Link href="/eventos">Ver Programação</Link>
        </Button>
      </div>
    </main>
  );
}
