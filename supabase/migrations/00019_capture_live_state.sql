-- =============================================
-- Migration 00019: Capture Live State (BASELINE)
-- Central Casarão 360
-- Capturado do banco vivo (xhemqctqilpfjycesusr) em 2026-09-01
-- =============================================
-- CONTEXTO:
--   A migration 00018 aplicou objetos via Management API e deixou partes
--   sem versionamento no repo ("RLS policies applied via Management API",
--   "create_reservation_v2 documented in scratch/" — scratch/ nunca existiu).
--   Este arquivo captura fielmente o que EXISTE no banco vivo mas não tinha
--   SQL no repositório:
--     (a) RLS policies de reservation_tables / reservation_status_history
--         + policies customer_read_own* de customers / reservations;
--     (b) os 96 seeds de table_join_rules (allowed=true), chaveados por
--         venue_tables.code (estáveis entre ambientes, não UUIDs).
--
-- STATUS: BASELINE — registrado no ledger (supabase_migrations.schema_migrations)
--   mas NÃO executado contra o projeto vivo (tudo aqui já existe lá).
--   Os guards idempotentes (DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING)
--   servem de rede de segurança para ambientes futuros (staging/local).
--
-- NOTAS DE ESTADO VIVO (2026-09-01):
--   * table_join_rules tem RLS HABILITADO e ZERO policies (acesso apenas via
--     service role e funções SECURITY DEFINER). Policy de staff é adicionada
--     em 00021.
--   * A versão de sync_event_table_status de 00004 (single-table) foi
--     SUPERADA no banco vivo por uma versão multi-mesa que lê
--     reservation_tables. A definição canônica está em 00020.
--   * validate_reservation_capacity vivo também difere de 00004 (valida
--     apenas party_size 1..8; a capacidade por mesa é validada dentro de
--     create_reservation_v2). Definição canônica em 00020.
--   * As funções vivas continham U+FFFD (mojibake) em strings acentuadas,
--     causado por aplicação de SQL via PowerShell com encoding errado.
--     Corrigido em 00020. REGRA: SQL só via Management API com body JSON UTF-8.
-- =============================================

-- ---------------------------------------------
-- (a) RLS POLICIES (transcritas de pg_policies em 2026-09-01)
-- ---------------------------------------------

-- customers: cliente autenticado lê o próprio registro
DROP POLICY IF EXISTS customer_read_own ON public.customers;
CREATE POLICY customer_read_own ON public.customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- reservations: cliente autenticado lê as próprias reservas
DROP POLICY IF EXISTS customer_read_own_reservations ON public.reservations;
CREATE POLICY customer_read_own_reservations ON public.reservations
  FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT customers.id FROM public.customers
    WHERE customers.auth_user_id = auth.uid()
  ));

-- reservation_tables: staff da organização gerencia allocations
DROP POLICY IF EXISTS admin_manage_allocations ON public.reservation_tables;
CREATE POLICY admin_manage_allocations ON public.reservation_tables
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = reservation_tables.organization_id
      AND p.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
  ));

-- reservation_tables: cliente autenticado lê allocations das próprias reservas
DROP POLICY IF EXISTS customer_read_own_allocations ON public.reservation_tables;
CREATE POLICY customer_read_own_allocations ON public.reservation_tables
  FOR SELECT TO authenticated
  USING (reservation_id IN (
    SELECT r.id FROM public.reservations r
    JOIN public.customers c ON c.id = r.customer_id
    WHERE c.auth_user_id = auth.uid()
  ));

-- reservation_status_history: staff da organização gerencia histórico
DROP POLICY IF EXISTS admin_manage_history ON public.reservation_status_history;
CREATE POLICY admin_manage_history ON public.reservation_status_history
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.reservations r ON r.organization_id = p.organization_id
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role])
      AND r.id = reservation_status_history.reservation_id
  ));

-- reservation_status_history: cliente autenticado lê histórico das próprias reservas
DROP POLICY IF EXISTS customer_read_own_history ON public.reservation_status_history;
CREATE POLICY customer_read_own_history ON public.reservation_status_history
  FOR SELECT TO authenticated
  USING (reservation_id IN (
    SELECT r.id FROM public.reservations r
    JOIN public.customers c ON c.id = r.customer_id
    WHERE c.auth_user_id = auth.uid()
  ));

-- ---------------------------------------------
-- (b) SEEDS DE TABLE_JOIN_RULES (96 pares, estado vivo 2026-09-01)
-- Todos allowed=true no estado capturado. A correção de negócio
-- (I-01+I-02 e pares mistos I×D → allowed=false) acontece em 00021.
-- O par é normalizado por UUID (constraint chk_normalized_pair:
-- table_a_id < table_b_id), por isso LEAST/GREATEST sobre os ids.
-- ---------------------------------------------

INSERT INTO public.table_join_rules
  (organization_id, map_version, table_a_id, table_b_id, allowed)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'LEGACY_OPERATIONAL_V1',
  LEAST(va.id, vb.id),
  GREATEST(va.id, vb.id),
  true
FROM (VALUES
  ('D-01','D-02'),('D-01','D-03'),('D-02','D-03'),('D-02','D-04'),('D-03','D-04'),
  ('D-05','D-06'),('D-05','D-07'),('D-06','D-07'),('D-08','D-09'),('D-10','D-11'),
  ('D-11','D-12'),
  ('E-01','E-02'),('E-01','E-06'),('E-02','E-03'),('E-02','E-07'),('E-03','E-04'),
  ('E-03','E-08'),('E-04','E-05'),('E-04','E-09'),('E-05','E-10'),('E-06','E-07'),
  ('E-07','E-08'),('E-08','E-09'),('E-09','E-10'),('E-11','E-12'),('E-11','E-16'),
  ('E-12','E-13'),('E-12','E-17'),('E-13','E-14'),('E-13','E-18'),('E-14','E-15'),
  ('E-14','E-19'),('E-15','E-20'),('E-16','E-17'),('E-17','E-18'),('E-18','E-19'),
  ('E-19','E-20'),
  ('I-01','I-02'),('I-01','I-03'),('I-02','I-03'),('I-02','I-04'),('I-03','I-04'),
  ('I-03','I-05'),('I-04','I-05'),('I-06','D-05'),('I-06','D-06'),('I-06','I-11'),
  ('I-06','I-12'),('I-07','I-08'),('I-07','I-09'),('I-07','I-13'),('I-07','I-14'),
  ('I-08','I-09'),('I-08','I-10'),('I-08','I-13'),('I-08','I-14'),('I-08','I-15'),
  ('I-09','I-10'),('I-09','I-13'),('I-09','I-14'),('I-09','I-15'),('I-10','I-14'),
  ('I-10','I-15'),('I-10','I-16'),('I-11','D-06'),('I-11','I-12'),('I-11','I-17'),
  ('I-12','D-05'),('I-12','D-06'),('I-12','D-07'),('I-12','I-17'),('I-13','I-14'),
  ('I-14','I-15'),('I-14','I-20'),('I-15','I-16'),('I-15','I-20'),('I-15','I-21'),
  ('I-16','I-20'),('I-16','I-21'),('I-16','I-22'),('I-17','D-06'),('I-17','D-07'),
  ('I-18','D-08'),('I-18','D-09'),('I-18','I-19'),('I-19','D-08'),('I-19','D-09'),
  ('I-20','D-10'),('I-20','D-11'),('I-20','I-21'),('I-21','D-10'),('I-21','D-11'),
  ('I-21','D-12'),('I-22','D-11'),('I-22','D-12')
) AS pairs(code_a, code_b)
JOIN public.venue_tables va ON va.code = pairs.code_a
JOIN public.venue_tables vb ON vb.code = pairs.code_b
ON CONFLICT (organization_id, map_version, table_a_id, table_b_id) DO NOTHING;
