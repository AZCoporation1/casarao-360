"use client";

// =============================================
// useRealtimeRefetch — assinatura realtime genérica por evento (handoff §69)
// Observa mudanças (postgres_changes) nas tabelas indicadas, filtradas por
// event_id, e dispara o REFETCH fornecido. O banco é a fonte de verdade —
// nunca aplicamos o payload do canal diretamente no estado.
// Resiliência: reconnect com backoff + polling fallback + refetch em
// visibilitychange/online.
// =============================================

import { useEffect, useRef } from 'react';
import { isMockMode } from '@/lib/data/data-source';

const POLL_INTERVAL_MS = 30_000;
const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

export function useRealtimeRefetch(
  eventId: string | null | undefined,
  watchTables: string[],
  refetch: () => void
) {
  const joinedRef = useRef(false);
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  const watchKey = watchTables.join(',');

  useEffect(() => {
    if (isMockMode() || !eventId) return;
    const tablesToWatch = watchKey.split(',').filter(Boolean);

    let disposed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RETRY_BASE_MS;

    async function subscribe() {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseBrowserClient();
      if (disposed) return;

      let ch = supabase.channel(`rt:${tablesToWatch.join('+')}:${eventId}`);
      for (const table of tablesToWatch) {
        ch = ch.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `event_id=eq.${eventId}` },
          () => { refetchRef.current(); }
        );
      }
      channel = ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          joinedRef.current = true;
          retryDelay = RETRY_BASE_MS;
          // Sincroniza o que perdemos enquanto o canal esteve fora
          refetchRef.current();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          joinedRef.current = false;
          if (!disposed) {
            try { supabase.removeChannel(channel); } catch { /* canal já removido */ }
            retryTimer = setTimeout(subscribe, retryDelay);
            retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
          }
        }
      });
    }

    subscribe();

    // Fallback: enquanto o canal não está joined, refetch periódico
    const pollTimer = setInterval(() => {
      if (!joinedRef.current) refetchRef.current();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchRef.current();
    };
    const onOnline = () => refetchRef.current();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      disposed = true;
      joinedRef.current = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      (async () => {
        try {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
          if (channel) getSupabaseBrowserClient().removeChannel(channel);
        } catch { /* cleanup best-effort */ }
      })();
    };
  }, [eventId, watchKey]);
}
