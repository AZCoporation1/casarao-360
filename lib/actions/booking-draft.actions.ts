'use server';
import { saveBookingDraft, clearBookingDraft, getBookingDraft } from '@/lib/booking-draft';
import type { BookingDraft } from '@/lib/booking-draft';

export async function saveBookingDraftAction(draft: BookingDraft) {
  await saveBookingDraft(draft);
  return { success: true };
}

export async function clearBookingDraftAction() {
  await clearBookingDraft();
  return { success: true };
}

export async function getBookingDraftAction() {
  return await getBookingDraft();
}
