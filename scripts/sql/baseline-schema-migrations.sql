-- =============================================
-- Baseline do migration ledger — Central Casarão 360
-- Aplicado via Management API em 2026-09-01 (projeto xhemqctqilpfjycesusr)
-- =============================================
-- CONTEXTO: o banco vivo foi construído inteiramente via SQL manual
-- (Management API / run_inserts*.ps1). O schema supabase_migrations
-- NÃO existia. Este script cria o ledger e registra como APLICADAS as
-- migrations 00001..00018 cujo estado foi verificado objeto a objeto
-- (docs/migration-ledger-reconciliation.md) + 00019 (baseline capturado,
-- não executado — já era o estado vivo).
--
-- REGRAS:
--  * 00015 NÃO existe (00015_qa_validation.sql foi deletada no commit
--    3b43359 antes de qualquer aplicação confiável) — o gap é registrado
--    aqui como comentário e no doc de reconciliação. NÃO inventar.
--  * 20260708_official_agenda_* são legadas/supersedidas por 00011 e
--    ficam FORA do ledger (movidas para supabase/legacy/).
--  * A partir de 00020, toda migration é registrada no ledger no momento
--    em que é aplicada via Management API.
-- =============================================

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('00001', 'extensions_and_enums'),
  ('00002', 'core_tables'),
  ('00003', 'events_and_event_tables'),
  ('00004', 'customers_and_reservations'),
  ('00005', 'waitlist_and_alerts'),
  ('00006', 'inventory_staff_audit'),
  ('00007', 'views_and_rpcs'),
  ('00008', 'rls_policies'),
  ('00009', 'realtime'),
  ('00010', 'update_casarao_real_table_layout'),
  ('00011', 'sync_official_agenda_2026'),
  ('00012', 'release_agenda_consistency'),
  ('00013', 'reservation_expiration_cron'),
  ('00014', 'secure_rpc_and_admin'),
  -- 00015: gap intencional (qa_validation deletada; nunca fez parte do estado vivo)
  ('00016', 'harden_security_definer'),
  ('00017', 'gate1_settings_and_leads'),
  ('00018', 'gate1_final'),
  ('00019', 'capture_live_state')
ON CONFLICT (version) DO NOTHING;
