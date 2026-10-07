// Booking Draft — Server-side operations
// This module handles saving/reading booking draft cookies on the SERVER.
// For CLIENT-side reading, use getBookingDraftClient() which reads from document.cookie.
import { cookies } from 'next/headers';

export interface BookingDraft {
  eventId: string;
  partySize: number;
  selectedTableIds: string[];
  returnUrl?: string;
  eventName?: string; // To show in the UI like 'Complete sua reserva para Bom Jovi Cover'
}

const COOKIE_NAME = 'casarao_booking_draft';

export async function saveBookingDraft(draft: BookingDraft) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(draft), {
    httpOnly: false, // Needs to be readable by client for redirect detection
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}

export async function getBookingDraft(): Promise<BookingDraft | null> {
  const cookieStore = await cookies();
  const draftStr = cookieStore.get(COOKIE_NAME)?.value;
  if (!draftStr) return null;
  try {
    return JSON.parse(draftStr) as BookingDraft;
  } catch {
    return null;
  }
}

export async function clearBookingDraft() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
