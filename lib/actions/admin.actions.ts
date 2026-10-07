'use server';

import { isSupabaseMode } from '@/lib/data/data-source';

/**
 * Update event_table status from admin panel
 */
export async function updateTableStatusAction(
  eventTableId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseMode()) return { success: true };

  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await getSupabaseServerClient();

  const { error } = await supabase
    .from('event_tables')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', eventTableId);

  if (error) {
    console.error('Error updating table status:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
