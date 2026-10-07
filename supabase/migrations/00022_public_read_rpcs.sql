-- =============================================
-- Migration 00022: RPC pública sanitizada de pares combináveis
-- Central Casarão 360 — 2026-09-01
-- =============================================
-- OBJETIVO: dar ao mapa público o caminho de leitura anon-safe dos pares de
-- mesas combináveis do evento, para renderizar o estado "não combinável"
-- (roxo) ANTES do submit — sem expor a tabela table_join_rules (RLS: só
-- staff) e sem PII. O servidor (create_reservation_v2) continua sendo a
-- autoridade deny-by-default; esta RPC é UX preventiva.
--
-- Retorna pares de event_tables.id (não venue_tables) — casa direto com o
-- Table.id usado pelo cliente, sem mapeamento adicional.
--
-- Também garante (idempotente) event_tables e reservations na publication
-- supabase_realtime — já presentes no banco vivo em 2026-09-01; o guard
-- existe para paridade em ambientes futuros.
-- =============================================

CREATE OR REPLACE FUNCTION public.get_allowed_join_pairs(p_event_id uuid)
RETURNS TABLE (event_table_a_id uuid, event_table_b_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT eta.id, etb.id
  FROM table_join_rules r
  JOIN events e         ON e.id = p_event_id
  JOIN event_tables eta ON eta.event_id = e.id AND eta.venue_table_id = r.table_a_id
  JOIN event_tables etb ON etb.event_id = e.id AND etb.venue_table_id = r.table_b_id
  WHERE r.allowed = true
    AND r.organization_id = e.organization_id
    AND r.map_version = 'LEGACY_OPERATIONAL_V1';
$$;

REVOKE EXECUTE ON FUNCTION public.get_allowed_join_pairs(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_allowed_join_pairs(uuid) TO anon, authenticated;

-- Realtime publication (idempotente; já presente no banco vivo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'event_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_tables;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  END IF;
END $$;
