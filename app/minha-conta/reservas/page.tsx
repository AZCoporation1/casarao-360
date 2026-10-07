import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Music, AlertTriangle } from 'lucide-react';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Data não disponível';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(dateStr + 'T12:00:00'));
  } catch {
    return dateStr;
  }
}

export default async function MinhasReservasPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Get customer
  const { data: customerData, error: customerError } = await supabaseAny
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (customerError || !customerData) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <h1 className="text-3xl font-bold text-creme-gastronomico">Minhas Reservas</h1>
        <Card className="bg-preto-carvao/80 border-marrom-madeira/30">
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-12 h-12 text-ambar-premium" />
            <p className="text-creme-gastronomico/80">
              Perfil de cliente não encontrado. Faça sua primeira reserva para criar seu perfil automaticamente.
            </p>
            <Link href="/eventos" className="text-ambar-premium hover:underline font-medium">
              Ver Eventos &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get reservations - use simple query first, then enrich
  const { data: reservations, error: resError } = await supabaseAny
    .from('reservations')
    .select(`
      id, status, party_size, reservation_code, created_at, event_id
    `)
    .eq('customer_id', customerData.id)
    .order('created_at', { ascending: false });

  if (resError) {
    console.error('Error loading reservations:', resError);
  }

  // Enrich with event data and allocation data separately to avoid nested RLS issues
  const allReservations = [];
  for (const r of (reservations || [])) {
    // Get event info
    let eventInfo = null;
    if (r.event_id) {
      const { data: ev } = await supabaseAny
        .from('events')
        .select('id, title, event_date')
        .eq('id', r.event_id)
        .single();
      eventInfo = ev;
    }

    // Get table allocations
    const { data: allocations } = await supabaseAny
      .from('reservation_tables')
      .select('venue_table_id')
      .eq('reservation_id', r.id);

    // Get venue table codes
    let tableCodes: string[] = [];
    if (allocations && allocations.length > 0) {
      const vtIds = allocations.map((a: any) => a.venue_table_id);
      const { data: venueTables } = await supabaseAny
        .from('venue_tables')
        .select('code')
        .in('id', vtIds);
      tableCodes = (venueTables || []).map((vt: any) => vt.code);
    }

    allReservations.push({
      ...r,
      event: eventInfo,
      tableCodes,
    });
  }
  
  const ativas = allReservations.filter((r: any) => ['pending', 'confirmed'].includes(r.status));
  const anteriores = allReservations.filter((r: any) => !['pending', 'confirmed'].includes(r.status));

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-laranja-fogo text-laranja-fogo">Pendente</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-verde-oliva text-verde-oliva">Confirmada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-vermelho-brasa text-vermelho-brasa">Cancelada</Badge>;
      case 'expired':
        return <Badge variant="outline" className="border-gray-500 text-gray-400">Expirada</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-500 text-gray-400">Encerrada</Badge>;
    }
  };

  const ReservationCard = ({ res }: { res: any }) => {
    const codes = res.tableCodes?.length > 0 ? res.tableCodes.join(', ') : 'N/A';
    
    return (
      <Link href={`/minha-conta/reservas/${res.id}`} className="block group">
        <Card className="bg-preto-carvao/80 border-marrom-madeira/30 group-hover:border-ambar-premium/50 transition-colors">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={res.status} />
                <span className="text-xs text-creme-gastronomico/50 font-mono">{res.reservation_code}</span>
              </div>
              <h3 className="text-lg font-bold text-creme-gastronomico group-hover:text-ambar-premium transition-colors">
                {res.event?.title || 'Evento'}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-creme-gastronomico/70">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(res.event?.event_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {res.party_size} pessoa{res.party_size > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Music className="w-4 h-4" />
                  Mesa(s): {codes}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 mt-2 md:mt-0">
              <span className="text-ambar-premium text-sm font-medium group-hover:underline">Ver detalhes &rarr;</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico">Minhas Reservas</h1>
        <p className="text-creme-gastronomico/70 mt-1">
          Acompanhe o status e o histórico das suas reservas.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-medium text-creme-gastronomico border-b border-marrom-madeira/30 pb-2">
          Ativas
        </h2>
        {ativas.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {ativas.map((r: any) => <ReservationCard key={r.id} res={r} />)}
          </div>
        ) : (
          <p className="text-creme-gastronomico/50 text-sm italic py-4">Você não tem reservas ativas no momento.</p>
        )}
      </div>

      {anteriores.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-medium text-creme-gastronomico border-b border-marrom-madeira/30 pb-2">
            Histórico
          </h2>
          <div className="grid grid-cols-1 gap-4 opacity-75">
            {anteriores.map((r: any) => <ReservationCard key={r.id} res={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
