export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAllPublicEvents } from '@/lib/data/events.repository';
import { getBookingStateLabel, getBookingCTAText, getBookingStateBadgeVariant, canPublicReserve, canRegisterInterest, canJoinWaitlist } from '@/lib/booking-policy';
import { Calendar, MapPin, Users, Clock, History, Sparkles, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';

export default async function EventosPage() {
  let allEvents: Event[];
  let fetchError = false;

  try {
    allEvents = await listAllPublicEvents();
  } catch {
    allEvents = [];
    fetchError = true;
  }

  // Separate upcoming and completed
  const upcomingEvents = allEvents.filter(e => e.bookingState !== 'completed');
  const completedEvents = allEvents.filter(e => e.bookingState === 'completed');

  return (
    <div className="flex min-h-screen flex-col bg-preto-carvao">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-creme-gastronomico mb-4">Programação e Experiências</h1>
          <p className="text-xl text-creme-gastronomico/70 max-w-3xl">
            Escolha o seu próximo evento no Casarão. Cada noite é única, e nossas mesas são limitadas para garantir o seu conforto e atendimento premium.
          </p>
        </div>

        {/* Error State */}
        {fetchError && allEvents.length === 0 && (
          <section className="mb-16">
            <Card className="border-marrom-madeira/30 bg-preto-carvao/60 max-w-2xl mx-auto">
              <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-marrom-madeira/20 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-ambar-premium" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-creme-gastronomico mb-3">Não foi possível carregar a programação agora</h3>
                  <p className="text-creme-gastronomico/60 text-base leading-relaxed max-w-md mx-auto">
                    Estamos trabalhando para restabelecer o acesso. Tente novamente em instantes.
                  </p>
                </div>
                <Button variant="outline" asChild className="mt-4">
                  <Link href="/eventos">Tentar novamente</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Empty State — no events at all (shouldn't happen with mock fallback) */}
        {!fetchError && allEvents.length === 0 && (
          <section className="mb-16">
            <Card className="border-marrom-madeira/30 bg-preto-carvao/60 max-w-2xl mx-auto">
              <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-marrom-madeira/20 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-ambar-premium" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-creme-gastronomico mb-3">Programação em breve</h3>
                  <p className="text-creme-gastronomico/60 text-base leading-relaxed max-w-md mx-auto">
                    Estamos preparando experiências incríveis para você. Fique de olho!
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Próximos Shows */}
        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-6 h-6 text-laranja-fogo" />
              <h2 className="text-2xl md:text-3xl font-bold text-creme-gastronomico">Próximas Experiências</h2>
              <Badge variant="premium" className="ml-2">{upcomingEvents.length} eventos</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => {
                const bookingState = event.bookingState || 'announced';
                const ctaText = getBookingCTAText(bookingState);
                const isReservable = canPublicReserve(bookingState);
                const showInterest = canRegisterInterest(bookingState);
                const showWaitlist = canJoinWaitlist(bookingState);

                return (
                  <Card key={event.id} className="group overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-laranja-fogo/10 hover:border-laranja-fogo/30 bg-preto-carvao/80">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-marrom-madeira/20">
                      <Image
                        src={event.imageUrl}
                        alt={`Arte do evento ${event.title}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-preto-carvao to-transparent z-10" />
                      <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap">
                        <Badge variant="info" className="bg-preto-carvao/80 backdrop-blur-sm border-marrom-madeira">
                          <Calendar className="w-3 h-3 mr-2" />
                          {event.weekday} · {event.eventDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(event.eventDate + 'T12:00:00')) : ''}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 z-20">
                        <Badge variant={getBookingStateBadgeVariant(bookingState) as 'default'} className="backdrop-blur-sm text-xs">
                          {getBookingStateLabel(bookingState, event)}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="relative z-20 -mt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <CardTitle className="mb-2 group-hover:text-laranja-fogo transition-colors text-2xl">{event.title}</CardTitle>
                          <CardDescription className="text-base text-creme-gastronomico/90 font-medium flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-ambar-premium" />
                            {event.timeTbd ? 'Horário em breve' : event.date}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex flex-col gap-3 text-sm text-creme-gastronomico/70 mt-2">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-ambar-premium shrink-0" />
                          <span>O Casarão - Salão Principal</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-ambar-premium shrink-0" />
                          <span>{event.availableTables > 0 ? `${event.availableTables} mesas disponíveis` : 'Consulte disponibilidade'}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-marrom-madeira/20">
                      <Button
                        variant={isReservable ? "premium" : showWaitlist ? "outline" : showInterest ? "outline" : "secondary"}
                        className="w-full h-12 text-base font-bold tracking-wide"
                        asChild={isReservable || showInterest || showWaitlist}
                      >
                        {isReservable || showInterest || showWaitlist ? (
                          <Link href={`/reservar/${event.id}`}>{ctaText}</Link>
                        ) : (
                          <span>{ctaText}</span>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Eventos Realizados */}
        {completedEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <History className="w-6 h-6 text-creme-gastronomico/50" />
              <h2 className="text-2xl md:text-3xl font-bold text-creme-gastronomico/70">Experiências Realizadas</h2>
              <Badge variant="outline" className="ml-2">{completedEvents.length}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden flex flex-col bg-preto-carvao/40 border-marrom-madeira/20 opacity-75">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-marrom-madeira/10">
                    <Image
                      src={event.imageUrl}
                      alt={`Arte do evento ${event.title}`}
                      fill
                      unoptimized
                      className="object-cover grayscale-[0.5] opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-preto-carvao to-transparent z-10" />
                    <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-preto-carvao/80 backdrop-blur-sm border-marrom-madeira/50">
                        <Calendar className="w-3 h-3 mr-2" />
                        {event.weekday} · {event.eventDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(event.eventDate + 'T12:00:00')) : ''}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 z-20">
                      <Badge variant="outline" className="backdrop-blur-sm text-xs">Evento realizado</Badge>
                    </div>
                  </div>
                  <CardHeader className="relative z-20 -mt-6">
                    <CardTitle className="mb-2 text-creme-gastronomico/70 text-xl">{event.title}</CardTitle>
                  </CardHeader>
                  <CardFooter className="pt-2 border-t border-marrom-madeira/10">
                    <Button variant="secondary" className="w-full h-10 text-sm" disabled>
                      Evento realizado
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
