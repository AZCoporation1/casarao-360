import { Navbar } from '@/components/layout/Navbar';
import { getEventById } from '@/lib/data/events.repository';
import { listEventTables, getAllowedJoinPairs } from '@/lib/data/tables.repository';
import { getPublicReservationSettings } from '@/lib/whatsapp';
import { getBookingDraft } from '@/lib/booking-draft';
import { ReservationClient } from './ReservationClient';
import { Button } from '@/components/ui/button';
import { CalendarOff } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export interface ReservationAuthContext {
  userId: string;
  email: string;
  name: string;
  phone: string;
  cpfMasked: string;
}

// Auth derivado NO SERVIDOR (fonte de verdade §43/§114) — o cliente não
// depende de getUser() no browser para saber quem está reservando.
async function getReservationAuthContext(): Promise<ReservationAuthContext | null> {
  const { isMockMode } = await import('@/lib/data/data-source');
  if (isMockMode()) return null;
  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cust } = await (supabase as any)
      .from('customers')
      .select('full_name, phone, email, cpf_last4')
      .eq('auth_user_id', user.id)
      .single();

    return {
      userId: user.id,
      email: cust?.email || user.email || '',
      name: cust?.full_name || user.user_metadata?.full_name || '',
      phone: cust?.phone || '',
      cpfMasked: cust?.cpf_last4 ? `***.***.*${cust.cpf_last4}` : '',
    };
  } catch {
    return null;
  }
}

export default async function ReservationPage({
  params 
}: { 
  params: Promise<{ eventoId: string }> 
}) {
  const { eventoId } = await params;

  const [event, tables, settings, allowedPairs, draft, initialAuth] = await Promise.all([
    getEventById(eventoId),
    listEventTables(eventoId),
    getPublicReservationSettings(),
    getAllowedJoinPairs(eventoId),
    getBookingDraft(),
    getReservationAuthContext(),
  ]);

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col bg-preto-carvao">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-marrom-madeira/20 flex items-center justify-center mb-6">
            <CalendarOff className="w-10 h-10 text-creme-gastronomico/50" />
          </div>
          <h1 className="text-3xl font-bold text-creme-gastronomico mb-3">Evento Não Encontrado</h1>
          <p className="text-creme-gastronomico/70 mb-8 max-w-md">
            O evento solicitado não foi encontrado ou não está mais disponível.
          </p>
          <Button variant="premium" className="font-bold px-6" asChild>
            <Link href="/eventos">Ver Programação Completa</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-preto-carvao">
      <Navbar />
      <ReservationClient
        eventoId={eventoId}
        event={event}
        initialTables={tables}
        settings={settings}
        allowedPairs={allowedPairs}
        initialDraft={draft && draft.eventId === eventoId ? draft : null}
        initialAuth={initialAuth}
      />
    </div>
  );
}
