import { Event, Table, Reservation } from './types';
import { CASARAO_LAYOUT } from './map/casarao-layout';

// ---- Total capacity reference ----
const TOTAL_CAPACITY = CASARAO_LAYOUT.totalCapacity; // 192
const TOTAL_TABLES = CASARAO_LAYOUT.totalTables; // 54

export function getEventOccupancy(tables: Table[], eventId: string): number {
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0) || TOTAL_CAPACITY;
  const occupiedCapacity = tables
    .filter(t => t.status === 'ocupada' || t.status === 'reservada' || t.status === 'aguardando')
    .reduce((acc, t) => acc + t.capacity, 0);
  
  return totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0;
}

export function getAvailableTables(tables: Table[]): number {
  return tables.filter(t => t.status === 'livre').length;
}

export function getReservedTables(tables: Table[]): number {
  return tables.filter(t => t.status === 'reservada').length;
}

export function getOccupiedTables(tables: Table[]): number {
  return tables.filter(t => t.status === 'ocupada').length;
}

export function getPendingReservations(reservations: Reservation[]): number {
  return reservations.filter(r => r.status === 'pendente').length;
}

export function getWaitlistCount(waitlist: { id: string }[]): number {
  return waitlist.length;
}

export function getTotalCapacity(tables: Table[]): number {
  return tables.reduce((acc, t) => acc + t.capacity, 0);
}

export function getOccupiedCapacity(tables: Table[]): number {
  return tables
    .filter(t => t.status === 'ocupada' || t.status === 'reservada' || t.status === 'aguardando')
    .reduce((acc, t) => acc + t.capacity, 0);
}

export function getOperationalPressure(tables: Table[], reservations: Reservation[]): 'low' | 'medium' | 'high' | 'critical' {
  const occupancy = getEventOccupancy(tables, 'global');
  const pending = getPendingReservations(reservations);
  
  if (occupancy > 90 || pending > 20) return 'critical';
  if (occupancy > 75 || pending > 10) return 'high';
  if (occupancy > 50) return 'medium';
  return 'low';
}

export const PRESSURE_LABELS: Record<string, string> = {
  low: 'Tranquilo',
  medium: 'Moderada',
  high: 'Alta',
  critical: 'Crítica',
};

export function getExecutiveSummary(tables: Table[], reservations: Reservation[], events: Event[]) {
  const nextEvent = events.length > 0 ? events[0] : null;
  const occupancy = getEventOccupancy(tables, nextEvent?.id || '');
  const pressure = getOperationalPressure(tables, reservations);
  
  return {
    nextEventTitle: nextEvent?.title || 'Nenhum evento',
    nextEventDate: nextEvent?.date || '',
    occupancy,
    availableTables: getAvailableTables(tables),
    totalTables: tables.length || TOTAL_TABLES,
    totalCapacity: getTotalCapacity(tables) || TOTAL_CAPACITY,
    occupiedCapacity: getOccupiedCapacity(tables),
    reservedTables: getReservedTables(tables),
    occupiedTables: getOccupiedTables(tables),
    pendingReservations: getPendingReservations(reservations),
    pressure,
    pressureLabel: PRESSURE_LABELS[pressure] || pressure,
  };
}
