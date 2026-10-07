"use client";

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-vermelho-brasa/10 border border-vermelho-brasa/30 flex items-center justify-center mb-5">
        <AlertTriangle className="w-8 h-8 text-vermelho-brasa" />
      </div>
      <h2 className="text-xl font-bold text-creme-gastronomico mb-2">
        Erro ao carregar os dados operacionais
      </h2>
      <p className="text-creme-gastronomico/60 text-sm max-w-md mb-6 leading-relaxed">
        A conexão com o banco falhou. Os dados exibidos NUNCA são substituídos por
        dados de demonstração — recarregue para tentar novamente.
      </p>
      {error?.digest && (
        <p className="text-[10px] text-creme-gastronomico/30 font-mono mb-4">ref: {error.digest}</p>
      )}
      <Button variant="premium" className="px-6 h-11 font-bold" onClick={() => reset()}>
        <RotateCcw className="w-4 h-4 mr-2" /> Recarregar
      </Button>
    </div>
  );
}
