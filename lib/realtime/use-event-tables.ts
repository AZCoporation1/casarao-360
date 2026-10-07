"use client";

// =============================================
// useEventTables — Realtime das mesas de um evento (handoff §69)
// Fetch inicial vem do servidor (prop); mudanças chegam via useRealtimeRefetch
// e disparam refetch da lista canônica (54 rows é barato). O banco permanece
// a fonte de verdade — nada de patch local especulativo.
// =============================================

import { useState, useCallback } from 'react';
import type { Table } from '@/lib/types';
import { isMockMode } from '@/lib/data/data-source';
import { listEventTablesClient } from '@/lib/data/tables.repository';
import { useRealtimeRefetch } from './use-realtime-refetch';

export function useEventTables(eventId: string, initialTables: Table[]) {
  const [tables, setTables] = useState<Table[]>(initialTables);

  const refetch = useCallback(async () => {
    if (isMockMode()) return;
    try {
      const fresh = await listEventTablesClient(eventId);
      setTables(fresh);
    } catch (err) {
      // Mantém o último estado conhecido; o polling/reconnect tenta de novo
      console.warn('[useEventTables] refetch falhou:', err);
    }
  }, [eventId]);

  useRealtimeRefetch(eventId, ['event_tables'], refetch);

  return { tables, setTables, refetch };
}
