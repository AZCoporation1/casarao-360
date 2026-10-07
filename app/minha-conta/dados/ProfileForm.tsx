"use client";

import { useState, useTransition } from 'react';
import { updateCustomerProfileAction } from '@/lib/actions/customer-auth.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProfileForm({ 
  initialData 
}: { 
  initialData: { name: string; phone: string; email: string; cpf_last4: string } 
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateCustomerProfileAction({
        fullName: formData.get('name') as string || undefined,
        phone: formData.get('phone') as string || undefined,
        email: formData.get('email') as string || undefined,
      });
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
        router.refresh();
      }
    });
  }

  return (
    <Card className="bg-preto-carvao/80 border-marrom-madeira/50 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl text-creme-gastronomico">Informações Pessoais</CardTitle>
        <CardDescription className="text-creme-gastronomico/60">
          Atualize seus dados de contato para receber confirmações de reserva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
              message.type === 'success' 
                ? 'bg-verde-oliva/10 text-verde-oliva border border-verde-oliva/30' 
                : 'bg-vermelho-brasa/10 text-vermelho-brasa border border-vermelho-brasa/30'
            }`}>
              {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-creme-gastronomico/80">Nome Completo</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={initialData.name} 
              required
              className="w-full bg-black/40 border border-marrom-madeira/50 rounded-md px-3 py-2 text-creme-gastronomico focus:outline-none focus:border-ambar-premium transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-creme-gastronomico/80">E-mail</label>
            <input 
              type="email" 
              name="email" 
              defaultValue={initialData.email} 
              required
              className="w-full bg-black/40 border border-marrom-madeira/50 rounded-md px-3 py-2 text-creme-gastronomico focus:outline-none focus:border-ambar-premium transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-creme-gastronomico/80">WhatsApp</label>
            <input 
              type="tel" 
              name="phone" 
              defaultValue={initialData.phone} 
              required
              className="w-full bg-black/40 border border-marrom-madeira/50 rounded-md px-3 py-2 text-creme-gastronomico focus:outline-none focus:border-ambar-premium transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-creme-gastronomico/80">CPF</label>
            <input 
              type="text" 
              value={`***.***.**${initialData.cpf_last4}`} 
              disabled
              className="w-full bg-black/20 border border-marrom-madeira/20 rounded-md px-3 py-2 text-creme-gastronomico/50 cursor-not-allowed"
            />
            <p className="text-xs text-creme-gastronomico/40 mt-1">O CPF não pode ser alterado após o cadastro.</p>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-ambar-premium text-preto-carvao hover:bg-ambar-premium/90 w-full sm:w-auto"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
