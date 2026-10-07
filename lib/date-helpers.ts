// =============================================
// Date Helpers — Central Casarão 360
// Timezone-safe date utilities for America/Sao_Paulo
// =============================================

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Parse a date string (YYYY-MM-DD) into a Date object
 * in the specified timezone, avoiding UTC shift.
 */
export function parseLocalDate(dateStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  // Create date at noon to avoid any DST edge cases
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date;
}

/**
 * Format a date as "DD/MM" in the specified timezone.
 */
export function formatDateShort(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? parseLocalDate(date, timezone) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
  }).format(d);
}

/**
 * Format a date as "DD/MM/YYYY" in the specified timezone.
 */
export function formatDateFull(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? parseLocalDate(date, timezone) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: timezone,
  }).format(d);
}

/**
 * Get the weekday label in PT-BR short form: "QUI", "SEX", "SAB", "DOM", etc.
 */
export function getWeekdayLabel(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? parseLocalDate(date, timezone) : date;
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    timeZone: timezone,
  }).format(d);
  // "qui." → "QUI", "sáb." → "SAB", etc.
  return weekday.replace('.', '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if an event date is in the past (comparing date-only, not time).
 */
export function isEventPast(eventDate: string, timezone: string = DEFAULT_TIMEZONE): boolean {
  const now = new Date();
  const nowLocal = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(now); // "2026-06-25"
  return eventDate < nowLocal;
}

/**
 * Get today's date as YYYY-MM-DD in the specified timezone.
 */
export function getTodayLocal(timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(new Date());
}

/**
 * Format a date with month name: "04 de junho"
 */
export function formatDateLong(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? parseLocalDate(date, timezone) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: timezone,
  }).format(d);
}
