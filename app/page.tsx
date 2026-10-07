export const dynamic = 'force-dynamic';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listPublicEvents } from '@/lib/data/events.repository';
import { getBookingStateLabel, getBookingCTAText, canPublicReserve, canRegisterInterest } from '@/lib/booking-policy';
import { Calendar, MapPin, Users, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function Home() {
  const events = await listPublicEvents();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-1">
        <section className="relative w-full py-24 lg:py-32 xl:py-48 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-preto-carvao/90">
            <div className="absolute inset-0 bg-gradient-to-b from-marrom-madeira/20 via-preto-carvao to-preto-carvao" />
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-8">
            <Badge variant="premium" className="mb-4 text-sm px-4 py-1">Exclusividade e Previsibilidade</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-creme-gastronomico max-w-4xl">
              Vivencie momentos únicos no <span className="text-transparent bg-clip-text bg-gradient-to-r from-ambar-premium to-laranja-fogo">Casarão</span>
            </h1>
            <p className="text-lg md:text-xl text-creme-gastronomico/80 max-w-2xl leading-relaxed">
              O ambiente mais sofisticado da região, agora com um sistema de reservas premium. Garanta sua mesa antecipadamente para nossos próximos shows e eventos gastronômicos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button size="lg" variant="premium" asChild className="w-full sm:w-auto">
                <Link href="/eventos">Explorar Programação e Experiências</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-16 lg:py-24 bg-preto-carvao relative">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-creme-gastronomico mb-4">Próximas Experiências</h2>
                <p className="text-creme-gastronomico/70 max-w-2xl">
                  Nossa agenda é concorrida. Reserve sua experiência no Casarão com antecedência e garanta os melhores lugares para você e seus convidados.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/eventos" className="flex items-center gap-2">
                  Ver agenda completa <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.slice(0, 6).map((event) => {
                const bookingState = event.bookingState || 'announced';
                const ctaText = getBookingCTAText(bookingState);
                const isReservable = canPublicReserve(bookingState);
                const showInterest = canRegisterInterest(bookingState);

                return (
                  <Card key={event.id} className="group overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-laranja-fogo/10 hover:border-laranja-fogo/30">
                    <div className="relative aspect-video w-full overflow-hidden bg-marrom-madeira/20">
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
                    </div>
                    <CardHeader className="relative z-20 -mt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <CardTitle className="mb-2 group-hover:text-laranja-fogo transition-colors">{event.title}</CardTitle>
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
                          <span>{getBookingStateLabel(bookingState, event)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant={isReservable ? "default" : showInterest ? "outline" : "secondary"}
                        className="w-full h-12"
                        asChild={isReservable || showInterest}
                      >
                        {isReservable ? (
                          <Link href={`/reservar/${event.id}`}>{ctaText}</Link>
                        ) : showInterest ? (
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
          </div>
        </section>
      </main>
    </div>
  );
}
