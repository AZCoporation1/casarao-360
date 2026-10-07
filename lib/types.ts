import type { BookingState } from './booking-policy';

export type Event = {
  id: string;
  title: string;
  date: string;
  artist: string;
  attractions: string[];
  capacity: number;
  availableTables: number;
  imageUrl: string;
  description: string;
  // New fields for official agenda
  slug?: string;
  eventDate?: string;  // "2026-07-04" ISO date-only
  weekday?: string;    // "QUI", "SEX", "SAB"
  status?: 'draft' | 'scheduled' | 'open' | 'sold_out' | 'completed' | 'cancelled';
  bookingState?: BookingState;
  timeTbd?: boolean;
  priorityBookingOpensOn?: string | null;
  publicBookingOpensOn?: string | null;
  agendaSource?: string;
};

export type TableStatus = 'livre' | 'reservada' | 'ocupada' | 'bloqueada' | 'aguardando' | 'lista-espera';

export type Table = {
  id: string;
  number: string;
  sector: 'Entrada' | 'Palco' | 'Principal' | 'VIP' | 'Bar' | 'Banheiros' | 'ProximaPalco' | 'Familiar' | 'Externo' | 'PalcoPrincipal' | 'SalaoPrincipal' | 'AreaBar' | 'AreaFamilia';
  capacity: number;
  status: TableStatus;
  x: number;
  y: number;
  features?: string[]; // e.g. 'Próximo ao palco', 'Visão privilegiada', 'Ideal para família'
};

export type Reservation = {
  id: string;
  eventId: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerCpf: string;
  peopleCount: number;
  observation?: string;
  status: 'pendente' | 'confirmada' | 'cancelada';
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  totalReservations: number;
  noShows: number;
};

export type WaitlistEntry = {
  id: string;
  eventId: string;
  customerName: string;
  customerPhone: string;
  peopleCount: number;
  requestedAt: string;
};

export type OperationalAlert = {
  id: string;
  type: 'atraso' | 'ocupacao' | 'lista-espera' | 'estoque';
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  read: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: 'Bebidas' | 'Insumos' | 'Embalagens';
  quantity: number;
  unit: string;
  minQuantity: number;
  status: 'ok' | 'baixo' | 'zerado';
};

export type AiInsight = {
  id: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
};

export type ReportMetric = {
  id: string;
  label: string;
  value: string | number;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
};

export type EventInterestEntry = {
  id: string;
  eventId: string;
  fullName: string;
  phone: string;
  source: string;
  createdAt: string;
};
