import { Event, Table, Reservation, AiInsight, OperationalAlert } from './types';
import { generateDemoTables, CASARAO_LAYOUT } from './map/casarao-layout';
import { getEffectiveBookingState, type BookingState } from './booking-policy';
import { getWeekdayLabel } from './date-helpers';

// ---- Mesas reais do Casarão (54 mesas, 192 lugares) ----
export const mockTables: Table[] = generateDemoTables();

// ---- Agenda Oficial 2026 ----
interface OfficialEventDef {
  date: string;
  weekday: string;
  title: string;
  slug: string;
  statusExpected: 'completed' | 'scheduled';
}

const OFFICIAL_AGENDA_2026: OfficialEventDef[] = [
  { date: '2026-06-04', weekday: 'QUI', title: 'Roda de Viola', slug: 'roda-de-viola-2026', statusExpected: 'completed' },
  { date: '2026-06-06', weekday: 'SAB', title: 'Virtude Zero', slug: 'virtude-zero-2026', statusExpected: 'completed' },
  { date: '2026-06-12', weekday: 'SEX', title: 'The Beagles', slug: 'the-beagles-2026', statusExpected: 'completed' },
  { date: '2026-07-04', weekday: 'SAB', title: 'Brega nas Estrelas', slug: 'brega-nas-estrelas-2026', statusExpected: 'scheduled' },
  { date: '2026-07-11', weekday: 'SAB', title: 'Edu e Nando', slug: 'edu-e-nando-2026', statusExpected: 'scheduled' },
  { date: '2026-08-15', weekday: 'SAB', title: 'Roupa Nova Cover', slug: 'roupa-nova-cover-2026', statusExpected: 'scheduled' },
  { date: '2026-09-12', weekday: 'SAB', title: 'Bom Jovi Cover', slug: 'bom-jovi-cover-2026', statusExpected: 'scheduled' },
  { date: '2026-10-10', weekday: 'SAB', title: 'Michael Jackson Cover', slug: 'michael-jackson-cover-2026', statusExpected: 'scheduled' },
  { date: '2026-11-07', weekday: 'SAB', title: 'Sandro Saga', slug: 'sandro-saga-2026', statusExpected: 'scheduled' },
  { date: '2026-11-21', weekday: 'SAB', title: 'Kaique e Cauã', slug: 'kaique-e-caua-2026', statusExpected: 'scheduled' },
  { date: '2026-12-19', weekday: 'SAB', title: 'Som Rock', slug: 'som-rock-2026', statusExpected: 'scheduled' },
];

/**
 * Calculate booking opens dates: 8 months priority, 4 months public
 */
function calculateBookingDates(eventDate: string): { priority: string; public: string } {
  const [y, m, d] = eventDate.split('-').map(Number);
  const priorityDate = new Date(y, m - 1 - 8, d);
  const publicDate = new Date(y, m - 1 - 4, d);
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { priority: fmt(priorityDate), public: fmt(publicDate) };
}

function buildMockEvent(def: OfficialEventDef, index: number): Event {
  const bookingDates = calculateBookingDates(def.date);
  const freeTables = def.statusExpected === 'completed' ? 0 : mockTables.filter(t => t.status === 'livre').length;

  const bookingState: BookingState = getEffectiveBookingState({
    eventDate: def.date,
    status: def.statusExpected,
    priorityBookingOpensOn: bookingDates.priority,
    publicBookingOpensOn: bookingDates.public,
    availableTables: freeTables,
  });

  return {
    id: `evt-official-${String(index + 1).padStart(3, '0')}`,
    title: def.title,
    date: `${def.date}T00:00:00-03:00`,
    artist: def.title,
    attractions: [],
    capacity: CASARAO_LAYOUT.totalCapacity,
    availableTables: freeTables,
    imageUrl: '/placeholder-event.jpg',
    description: `Show ${def.title} no Casarão.`,
    // New fields
    slug: def.slug,
    eventDate: def.date,
    weekday: def.weekday,
    status: def.statusExpected,
    bookingState,
    timeTbd: true,
    priorityBookingOpensOn: bookingDates.priority,
    publicBookingOpensOn: bookingDates.public,
    agendaSource: 'official_agenda_2026',
  };
}

// ---- Eventos com agenda oficial 2026 ----
export const mockEvents: Event[] = OFFICIAL_AGENDA_2026.map((def, i) => buildMockEvent(def, i));

// Helper: only future/upcoming events
export const mockUpcomingEvents: Event[] = mockEvents.filter(e => e.bookingState !== 'completed');

// Helper: only completed events
export const mockCompletedEvents: Event[] = mockEvents.filter(e => e.bookingState === 'completed');

// ---- Reservas mockadas vinculadas ao primeiro evento futuro ----
const firstFutureEventId = mockUpcomingEvents[0]?.id || 'evt-official-004';

export const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    eventId: firstFutureEventId,
    tableId: 't-I-02',
    customerName: 'João Silva',
    customerPhone: '(11) 99999-9999',
    customerCpf: '***.456.789-**',
    peopleCount: 4,
    status: 'confirmada',
    createdAt: '2026-06-28T10:00:00Z'
  },
  {
    id: 'res-2',
    eventId: firstFutureEventId,
    tableId: 't-I-04',
    customerName: 'Maria Oliveira',
    customerPhone: '(11) 98888-8888',
    customerCpf: '***.765.432-**',
    peopleCount: 3,
    status: 'pendente',
    createdAt: '2026-07-01T15:00:00Z'
  },
  {
    id: 'res-3',
    eventId: firstFutureEventId,
    tableId: 't-I-06',
    customerName: 'Carlos Souza',
    customerPhone: '(11) 97777-7777',
    customerCpf: '***.123.456-**',
    peopleCount: 4,
    status: 'confirmada',
    createdAt: '2026-06-30T11:00:00Z'
  },
  {
    id: 'res-4',
    eventId: firstFutureEventId,
    tableId: 't-D-05',
    customerName: 'Ana Pereira',
    customerPhone: '(11) 96666-6666',
    customerCpf: '***.987.654-**',
    peopleCount: 2,
    status: 'confirmada',
    createdAt: '2026-07-02T09:00:00Z'
  },
  {
    id: 'res-5',
    eventId: firstFutureEventId,
    tableId: 't-E-03',
    customerName: 'Roberto Lima',
    customerPhone: '(11) 95555-5555',
    customerCpf: '***.321.654-**',
    peopleCount: 4,
    status: 'confirmada',
    createdAt: '2026-07-03T14:00:00Z'
  },
];

export const mockInsights: AiInsight[] = [
  {
    id: 'insight-1',
    title: 'Alta demanda esperada no final de semana',
    description: 'Com base no histórico recente e previsão do tempo, prevemos 20% mais movimento neste fim de semana. Reforce equipe e estoque.',
    impact: 'positive',
    actionable: true
  },
  {
    id: 'insight-2',
    title: 'Risco de gargalo no bar',
    description: 'O próximo evento possui um perfil de consumo alto. Reforce a equipe do bar com pelo menos 2 bartenders extras.',
    impact: 'negative',
    actionable: true
  },
  {
    id: 'insight-3',
    title: 'Área externa com alta procura',
    description: 'Nas últimas 48h, 65% das reservas foram para a área externa. Considere reforçar garçons nessa região.',
    impact: 'neutral',
    actionable: true
  }
];

export const mockAlerts: OperationalAlert[] = [
  {
    id: 'alert-1',
    type: 'atraso',
    message: 'Mesa I-04 (Maria Oliveira) atrasada em 20 min.',
    severity: 'medium',
    createdAt: new Date().toISOString(),
    read: false
  },
  {
    id: 'alert-2',
    type: 'estoque',
    message: 'Cerveja long neck abaixo do estoque mínimo.',
    severity: 'high',
    createdAt: new Date().toISOString(),
    read: false
  },
  {
    id: 'alert-3',
    type: 'ocupacao',
    message: 'Ocupação prevista para 85% no próximo evento. Prepare equipe extra.',
    severity: 'medium',
    createdAt: new Date().toISOString(),
    read: false
  }
];
