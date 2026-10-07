import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getPublicReservationSettings } from '@/lib/whatsapp';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Music, MapPin, Clock, ArrowLeft, MessageCircle, AlertTriangle } from 'lucide-react';

function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Data não disponível';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(dateStr + 'T12:00:00'));
  } catch {
    return dateStr;
  }
}

export default async function ReservationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();
  const settings = await getPublicReservationSettings();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: customerData } = await supabaseAny
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!customerData) {
    redirect('/minha-conta');
  }

  // Get reservation (simple query to avoid nested RLS issues)
  const { data: res } = await supabaseAny
    .from('reservations')
    .select('*')
    .eq('id', id)
    .eq('customer_id', customerData.id)
    .single();

  if (!res) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-vermelho-brasa mx-auto" />
        <h1 className="text-2xl font-bold text-vermelho-brasa">Reserva não encontrada</h1>
        <p className="text-creme-gastronomico">Não encontramos a reserva solicitada ou você não tem permissão para vê-la.</p>
        <Button asChild variant="outline" className="border-ambar-premium text-ambar-premium hover:bg-ambar-premium/10">
          <Link href="/minha-conta/reservas">Voltar para minhas reservas</Link>
        </Button>
      </div>
    );
  }

  // Get event info separately
  let eventInfo: any = null;
  if (res.event_id) {
    const { data: ev } = await supabaseAny
      .from('events')
      .select('id, title, event_date, time_is_tbd')
      .eq('id', res.event_id)
      .single();
    eventInfo = ev;
  }

  // Get table allocations separately
  const { data: allocations } = await supabaseAny
    .from('reservation_tables')
    .select('venue_table_id')
    .eq('reservation_id', res.id);

  let tableCodes: string[] = [];
  let sectorNames: string[] = [];
  if (allocations && allocations.length > 0) {
    const vtIds = allocations.map((a: any) => a.venue_table_id);
    const { data: venueTables } = await supabaseAny
      .from('venue_tables')
      .select('code, venue_sector_id')
      .in('id', vtIds);
    
    if (venueTables) {
      tableCodes = venueTables.map((vt: any) => vt.code);
      const sectorIds = [...new Set(venueTables.map((vt: any) => vt.venue_sector_id))];
      if (sectorIds.length > 0) {
        const { data: sectors } = await supabaseAny
          .from('venue_sectors')
          .select('name')
          .in('id', sectorIds);
        sectorNames = (sectors || []).map((s: any) => s.name);
      }
    }
  }

  const isPending = res.status === 'pending';
  const isConfirmed = res.status === 'confirmed';
  const isCancelled = ['cancelled', 'expired', 'no_show'].includes(res.status);
  
  let headerTitle = '';
  let headerColor = '';
  
  if (isPending) {
    headerTitle = 'Solicitação de reserva recebida';
    headerColor = 'text-laranja-fogo';
  } else if (isConfirmed) {
    headerTitle = 'Reserva confirmada';
    headerColor = 'text-verde-oliva';
  } else if (isCancelled) {
    headerTitle = 'Reserva cancelada ou expirada';
    headerColor = 'text-vermelho-brasa';
  } else {
    headerTitle = 'Reserva concluída';
    headerColor = 'text-creme-gastronomico/70';
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <Link href="/minha-conta/reservas" className="inline-flex items-center text-sm text-creme-gastronomico/60 hover:text-ambar-premium transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para minhas reservas
      </Link>

      <div className="text-center space-y-3">
        <h1 className={`text-3xl font-bold ${headerColor}`}>{headerTitle}</h1>
        {isPending && (
          <p className="text-creme-gastronomico/70 max-w-lg mx-auto">
            Sua solicitação está sendo analisada pela nossa equipe. Em breve você receberá a confirmação por e-mail e WhatsApp.
          </p>
        )}
      </div>

      <Card className="bg-preto-carvao/80 border-marrom-madeira/50 overflow-hidden relative">
        <div className={`h-2 w-full ${isPending ? 'bg-laranja-fogo' : isConfirmed ? 'bg-verde-oliva' : 'bg-vermelho-brasa'}`} />
        
        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Code */}
          <div className="text-center border-b border-marrom-madeira/20 pb-8">
            <p className="text-sm uppercase tracking-widest text-creme-gastronomico/50 mb-2">Código da Reserva</p>
            <div className="text-4xl md:text-5xl font-mono font-bold text-ambar-premium tracking-wider bg-black/40 inline-block px-6 py-3 rounded-lg border border-ambar-premium/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              {res.reservation_code}
            </div>
          </div>

          {/* Event Info */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-creme-gastronomico">{eventInfo?.title || 'Evento'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-creme-gastronomico/80">
              <div className="flex flex-col gap-1">
                <span className="flex items-center text-sm text-creme-gastronomico/50"><Calendar className="w-4 h-4 mr-1.5" /> Data</span>
                <span className="font-medium">
                  {formatDateFull(eventInfo?.event_date)}
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="flex items-center text-sm text-creme-gastronomico/50"><Clock className="w-4 h-4 mr-1.5" /> Horário</span>
                <span className="font-medium">{eventInfo?.time_is_tbd ? 'A definir (consulte nossas redes)' : 'Abertura da casa: 20h'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="flex items-center text-sm text-creme-gastronomico/50"><MapPin className="w-4 h-4 mr-1.5" /> Local</span>
                <span className="font-medium">O Casarão</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="flex items-center text-sm text-creme-gastronomico/50"><Users className="w-4 h-4 mr-1.5" /> Pessoas</span>
                <span className="font-medium">{res.party_size}</span>
              </div>
            </div>
          </div>

          {/* Table Details */}
          <div className="bg-black/30 rounded-lg p-5 border border-marrom-madeira/30 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-creme-gastronomico/50 flex items-center gap-1.5">
                <Music className="w-4 h-4" /> Setor
              </p>
              <p className="text-lg font-medium text-creme-gastronomico">{sectorNames.length > 0 ? sectorNames.join(', ') : 'N/A'}</p>
            </div>
            
            <div className="space-y-1 md:text-right">
              <p className="text-sm text-creme-gastronomico/50">Mesas Reservadas</p>
              <p className="text-2xl font-bold text-ambar-premium">{tableCodes.length > 0 ? tableCodes.join(', ') : 'N/A'}</p>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button variant="outline" asChild className="w-full h-auto py-4 border-marrom-madeira hover:bg-marrom-madeira/20 text-creme-gastronomico flex-col gap-1">
          <Link href="/">
            <span className="block font-medium">Explorar outros eventos</span>
            <span className="text-xs text-creme-gastronomico/50">Ver a agenda completa</span>
          </Link>
        </Button>
        {settings.whatsappEnabled && settings.whatsappWaMeNumber ? (
          <Button variant="outline" asChild className="w-full h-auto py-4 border-verde-oliva/50 hover:bg-verde-oliva/10 text-verde-oliva flex-col gap-1">
            <a href={`https://wa.me/${settings.whatsappWaMeNumber}`} target="_blank" rel="noreferrer">
              <span className="block font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Suporte</span>
              <span className="text-xs opacity-70">Falar no WhatsApp</span>
            </a>
          </Button>
        ) : (
          <div className="w-full h-auto py-4 border border-marrom-madeira/30 rounded-md text-center text-creme-gastronomico/50 text-sm flex flex-col gap-1 items-center justify-center">
            <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Suporte</span>
            <span className="text-xs">Contato temporariamente indisponível</span>
          </div>
        )}
      </div>
    </div>
  );
}
