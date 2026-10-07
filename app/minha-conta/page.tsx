import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Ticket, User as UserIcon, ArrowRight, Music } from 'lucide-react';

function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Data não disponível';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(dateStr + 'T12:00:00'));
  } catch {
    return dateStr;
  }
}

export default async function MinhaContaDashboard() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: customerData } = await supabaseAny
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  const customerName = customerData?.full_name?.split(' ')[0] || 'Cliente';

  // Get active reservations (simple flat query to avoid nested RLS issues)
  const customerId = customerData?.id;
  let activeReservations: any[] = [];
  let nextReservation: any = null;

  if (customerId) {
    const { data: reservations } = await supabaseAny
      .from('reservations')
      .select('id, status, party_size, reservation_code, event_id')
      .eq('customer_id', customerId)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });

    const today = new Date().toISOString().split('T')[0];

    // Enrich with event data
    for (const r of (reservations || [])) {
      let eventInfo = null;
      if (r.event_id) {
        const { data: ev } = await supabaseAny
          .from('events')
          .select('id, title, event_date')
          .eq('id', r.event_id)
          .single();
        eventInfo = ev;
      }

      // Get table codes
      const { data: allocations } = await supabaseAny
        .from('reservation_tables')
        .select('venue_table_id')
        .eq('reservation_id', r.id);

      let tableCodes: string[] = [];
      if (allocations && allocations.length > 0) {
        const vtIds = allocations.map((a: any) => a.venue_table_id);
        const { data: vt } = await supabaseAny
          .from('venue_tables')
          .select('code')
          .in('id', vtIds);
        tableCodes = (vt || []).map((v: any) => v.code);
      }

      if (eventInfo && eventInfo.event_date >= today) {
        activeReservations.push({
          ...r,
          event: eventInfo,
          tableCodes,
        });
      }
    }

    activeReservations.sort((a, b) => (a.event?.event_date || '').localeCompare(b.event?.event_date || ''));
    nextReservation = activeReservations[0] || null;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico">{greeting}, {customerName}!</h1>
        <p className="text-creme-gastronomico/70 mt-1">
          Bem-vindo(a) à sua área exclusiva d&apos;O Casarão.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/50 md:col-span-2 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-ambar-premium flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Próximo Evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextReservation ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-creme-gastronomico">{nextReservation.event?.title}</h2>
                  <p className="text-creme-gastronomico/70">
                    {formatDateFull(nextReservation.event?.event_date)}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="bg-black/30 border border-marrom-madeira/30 rounded px-3 py-1.5">
                    <span className="text-xs text-creme-gastronomico/50 block uppercase">Código</span>
                    <span className="text-sm font-mono text-ambar-premium font-bold">{nextReservation.reservation_code}</span>
                  </div>
                  <div className="bg-black/30 border border-marrom-madeira/30 rounded px-3 py-1.5">
                    <span className="text-xs text-creme-gastronomico/50 block uppercase">Mesas</span>
                    <span className="text-sm text-creme-gastronomico font-medium">
                      {nextReservation.tableCodes?.join(', ') || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-black/30 border border-marrom-madeira/30 rounded px-3 py-1.5">
                    <span className="text-xs text-creme-gastronomico/50 block uppercase">Pessoas</span>
                    <span className="text-sm text-creme-gastronomico font-medium">{nextReservation.party_size}</span>
                  </div>
                </div>
                
                <Button variant="outline" asChild className="w-full sm:w-auto border-ambar-premium text-ambar-premium hover:bg-ambar-premium/10 mt-2">
                  <Link href={`/minha-conta/reservas/${nextReservation.id}`}>Ver Detalhes</Link>
                </Button>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-marrom-madeira/20 flex items-center justify-center text-creme-gastronomico/40">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-creme-gastronomico">Nenhuma reserva futura</h3>
                  <p className="text-sm text-creme-gastronomico/60 max-w-md mx-auto">Você ainda não tem reservas confirmadas para os próximos eventos.</p>
                </div>
                <Button variant="default" asChild className="bg-ambar-premium text-preto-carvao hover:bg-ambar-premium/90">
                  <Link href="/">Explorar Eventos</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-preto-carvao/80 border-marrom-madeira/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-creme-gastronomico/60 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-creme-gastronomico/60" /> Resumo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-creme-gastronomico mb-1">{activeReservations.length}</div>
            <p className="text-sm text-creme-gastronomico/60 mb-6">Reservas ativas</p>
            
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-between border-marrom-madeira/30 hover:bg-marrom-madeira/20 text-creme-gastronomico">
                <Link href="/minha-conta/reservas">
                  Ver minhas reservas <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-between border-marrom-madeira/30 hover:bg-marrom-madeira/20 text-creme-gastronomico">
                <Link href="/minha-conta/dados">
                  Meus dados <UserIcon className="w-4 h-4 ml-2 opacity-50" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
