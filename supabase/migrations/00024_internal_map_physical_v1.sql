-- =============================================
-- Migration 00024: PHYSICAL_INTERNAL_V1 — planta interna real do salão
-- Central Casarão 360 — 2026-09-01
-- =============================================
-- CONTEXTO: o proprietário forneceu o mapa físico real do salão interno
-- ("MAPA DO SALÃO"): Palco no topo, Entrada no canto superior esquerdo,
-- Balcão de Pagamento ao lado da entrada, Bar na parede inferior, janelas à
-- direita, 5 fileiras (F1–F5) e mesas numeradas 01, 02 e 08–26:
--   * 14 mesas VERMELHAS de 4 lugares: 01 02 09 10 11 13 15 17 19 20 21 24 25 26
--   * 7 mesas VERDES de 2 lugares:     08 12 14 16 18 22 23
--   * Total interno: 21 mesas / 70 lugares (códigos 03–07 NÃO existem na planta)
--   * F1: 01 02 · F2: 12 11 10 09 08 · F3: 17 16 15 14 13 · F4: 22 21 20 19 18 · F5: 26 25 24 23
--
-- PRINCÍPIOS (handoff §21/§22/§50/§53):
--   * NADA destrutivo para histórico: eventos realizados continuam apontando
--     para a planta antiga (seus event_tables ficam intactos);
--   * eventos FUTUROS (status 'scheduled') passam a usar a planta nova;
--   * event_tables antigos de eventos futuros SEM referência são removidos;
--     os referenciados por reservas históricas (Bom Jovi: I-05, I-06, I-12 —
--     reservas expiradas) são mantidos com is_active=false + blocked;
--   * a parte EXTERNA (E-01..E-20) permanece inalterada (planta externa nova
--     ainda não fornecida pelo proprietário).
--
-- JOIN RULES (deny-by-default §33; decisões já aprovadas §30/§34):
--   * permitidas: pares vermelha+vermelha ADJACENTES NA MESMA FILEIRA:
--     10+11, 09+10 (F2) · 20+21, 19+20 (F4) · 25+26, 24+25 (F5)
--     (F3 não tem vermelhas adjacentes — 16 e 14 separam 17/15/13);
--   * negada explícita: 01+02 (§34 — frente do palco, agora confirmado na
--     planta física: são as duas mesas isoladas diante do palco);
--   * pares mistos vermelha×verde e pares entre fileiras: AUSENTES
--     (= negados) até aprovação explícita do proprietário.
--
-- FUNÇÕES: create_reservation_v2 e get_allowed_join_pairs deixam de filtrar
-- por map_version fixo ('LEGACY_OPERATIONAL_V1') — cada par de venue_tables
-- pertence a exatamente UMA geração de planta (ids são únicos), então o
-- filtro por organização+par é suficiente e as duas gerações convivem.
-- =============================================

-- ---------------------------------------------
-- 1. event_tables.is_active — esconde mesas de plantas substituídas sem
-- apagar histórico (FKs de reservas históricas permanecem íntegros)
-- ---------------------------------------------
ALTER TABLE public.event_tables ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ---------------------------------------------
-- 2. Novas venue_tables (planta física interna)
-- Setores: 01/02 = Palco Principal; demais = Área Principal.
-- x/y em % do canvas interno; fileira em label + features (tooltip).
-- ---------------------------------------------
INSERT INTO public.venue_tables (venue_id, sector_id, code, label, capacity, x, y, shape, rotation, default_status, features, is_active)
SELECT
  'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
  CASE WHEN t.fileira = 'F1'
    THEN 'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid  -- Palco Principal
    ELSE 'c3d4e5f6-a7b8-9012-cdef-123456789013'::uuid  -- Área Principal
  END,
  t.code, t.fileira, t.capacity, t.x, t.y, 'round', 0, 'free',
  ARRAY['Fileira ' || t.fileira], true
FROM (VALUES
  ('01', 4, 37, 26, 'F1'),
  ('02', 4, 83, 26, 'F1'),
  ('12', 2, 31, 41, 'F2'),
  ('11', 4, 44, 41, 'F2'),
  ('10', 4, 56, 41, 'F2'),
  ('09', 4, 70, 41, 'F2'),
  ('08', 2, 82, 41, 'F2'),
  ('17', 4, 31, 55, 'F3'),
  ('16', 2, 44, 55, 'F3'),
  ('15', 4, 56, 55, 'F3'),
  ('14', 2, 70, 55, 'F3'),
  ('13', 4, 82, 55, 'F3'),
  ('22', 2, 31, 69, 'F4'),
  ('21', 4, 44, 69, 'F4'),
  ('20', 4, 56, 69, 'F4'),
  ('19', 4, 70, 69, 'F4'),
  ('18', 2, 82, 69, 'F4'),
  ('26', 4, 34, 83, 'F5'),
  ('25', 4, 49, 83, 'F5'),
  ('24', 4, 65, 83, 'F5'),
  ('23', 2, 82, 83, 'F5')
) AS t(code, capacity, x, y, fileira)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venue_tables vt
  WHERE vt.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid AND vt.code = t.code
);

-- ---------------------------------------------
-- 3. Planta interna antiga (I-*/D-*) sai de circulação (não é apagada)
-- ---------------------------------------------
UPDATE public.venue_tables
SET is_active = false, updated_at = now()
WHERE (code LIKE 'I-%' OR code LIKE 'D-%') AND is_active = true;

-- ---------------------------------------------
-- 4. Eventos FUTUROS migram para a planta nova
-- ---------------------------------------------
-- 4a. Remove as mesas internas antigas SEM nenhuma referência de reserva
DELETE FROM public.event_tables et
USING public.events e, public.venue_tables vt
WHERE e.id = et.event_id
  AND vt.id = et.venue_table_id
  AND e.status = 'scheduled'
  AND (vt.code LIKE 'I-%' OR vt.code LIKE 'D-%')
  AND NOT EXISTS (SELECT 1 FROM public.reservation_tables rt WHERE rt.event_table_id = et.id)
  AND NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.event_table_id = et.id);

-- 4b. As restantes (referenciadas por reservas históricas/expiradas) ficam
-- inativas e bloqueadas — invisíveis no mapa, íntegras para o histórico
UPDATE public.event_tables et
SET is_active = false,
    status = 'blocked',
    blocked_reason = 'Planta interna substituída por PHYSICAL_INTERNAL_V1 (2026-09-01); linha mantida por integridade do histórico de reservas',
    updated_at = now()
FROM public.events e, public.venue_tables vt
WHERE e.id = et.event_id
  AND vt.id = et.venue_table_id
  AND e.status = 'scheduled'
  AND (vt.code LIKE 'I-%' OR vt.code LIKE 'D-%')
  AND et.is_active = true;

-- 4c. Cria as mesas da planta nova para cada evento futuro
INSERT INTO public.event_tables (event_id, venue_table_id, status)
SELECT e.id, vt.id, 'free'::table_status
FROM public.events e
CROSS JOIN public.venue_tables vt
WHERE e.status = 'scheduled'
  AND vt.code ~ '^[0-9]+$'
  AND vt.is_active
  AND NOT EXISTS (
    SELECT 1 FROM public.event_tables x
    WHERE x.event_id = e.id AND x.venue_table_id = vt.id
  );

-- ---------------------------------------------
-- 5. Join rules da planta nova (PHYSICAL_INTERNAL_V1)
-- ---------------------------------------------
INSERT INTO public.table_join_rules (organization_id, map_version, table_a_id, table_b_id, allowed, reason)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'PHYSICAL_INTERNAL_V1',
  LEAST(va.id, vb.id),
  GREATEST(va.id, vb.id),
  p.allowed,
  p.reason
FROM (VALUES
  ('10', '11', true,  'Vermelhas adjacentes na fileira F2'),
  ('09', '10', true,  'Vermelhas adjacentes na fileira F2'),
  ('20', '21', true,  'Vermelhas adjacentes na fileira F4'),
  ('19', '20', true,  'Vermelhas adjacentes na fileira F4'),
  ('25', '26', true,  'Vermelhas adjacentes na fileira F5'),
  ('24', '25', true,  'Vermelhas adjacentes na fileira F5'),
  ('01', '02', false, 'Proibido pelo handoff §34 — mesas em frente ao palco não podem ser unidas (confirmado na planta física)')
) AS p(code_a, code_b, allowed, reason)
JOIN public.venue_tables va ON va.code = p.code_a AND va.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid
JOIN public.venue_tables vb ON vb.code = p.code_b AND vb.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid
ON CONFLICT (organization_id, map_version, table_a_id, table_b_id) DO NOTHING;

-- ---------------------------------------------
-- 6. get_allowed_join_pairs — sem filtro de map_version + só mesas ativas
-- ---------------------------------------------
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
  JOIN event_tables eta ON eta.event_id = e.id AND eta.venue_table_id = r.table_a_id AND eta.is_active
  JOIN event_tables etb ON etb.event_id = e.id AND etb.venue_table_id = r.table_b_id AND etb.is_active
  WHERE r.allowed = true
    AND r.organization_id = e.organization_id;
$$;

-- ---------------------------------------------
-- 7. create_reservation_v2 — mesmas responsabilidades; mudanças pontuais:
--    (a) join-rule lookup por organização+par (sem map_version fixo);
--    (b) mesa inativa é rejeitada explicitamente.
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.create_reservation_v2(
  p_event_id uuid,
  p_event_table_ids uuid[],
  p_party_size integer,
  p_auth_user_id uuid DEFAULT NULL::uuid,
  p_full_name text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_cpf text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_org_id UUID;
  v_customer_id UUID;
  v_reservation_id UUID;
  v_reservation_code TEXT;
  v_max_party INT;
  v_max_tables INT;
  v_table_count INT;
  v_total_capacity INT := 0;
  v_event_table RECORD;
  v_normalized_phone TEXT;
  v_cpf_hash TEXT;
  v_cpf_last4 TEXT;
  v_existing_reservation_id UUID;
  v_table_id UUID;
  v_table_codes TEXT[] := '{}';
BEGIN
  -- 0. Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_reservation_id FROM reservations
    WHERE notes LIKE '%idempotency:' || p_idempotency_key || '%'
      AND status IN ('pending','confirmed','checked_in');
    IF v_reservation_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id, 'idempotent', true);
    END IF;
  END IF;

  -- 1. Get org from event
  SELECT e.organization_id INTO v_org_id FROM events e WHERE e.id = p_event_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Evento não encontrado'; END IF;

  -- 2. Get limits
  SELECT COALESCE(os.max_self_service_party_size, 8),
         COALESCE(os.max_self_service_tables, 2)
  INTO v_max_party, v_max_tables
  FROM organization_settings os WHERE os.organization_id = v_org_id;
  v_max_party := COALESCE(v_max_party, 8);
  v_max_tables := COALESCE(v_max_tables, 2);

  -- 3. Validate party size
  IF p_party_size < 1 OR p_party_size > v_max_party THEN
    RAISE EXCEPTION 'Grupos acima de % pessoas devem solicitar reserva personalizada via WhatsApp.', v_max_party;
  END IF;

  -- 4. Validate table count
  v_table_count := array_length(p_event_table_ids, 1);
  IF v_table_count IS NULL OR v_table_count < 1 OR v_table_count > v_max_tables THEN
    RAISE EXCEPTION 'Selecione de 1 a % mesas.', v_max_tables;
  END IF;

  -- 5. Resolve customer
  IF p_auth_user_id IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM customers WHERE auth_user_id = p_auth_user_id;
    IF v_customer_id IS NULL AND p_full_name IS NOT NULL AND p_phone IS NOT NULL THEN
      v_customer_id := ensure_customer_for_auth_user(p_auth_user_id, p_full_name, p_phone, p_email, p_cpf, v_org_id);
    END IF;
  ELSE
    -- Anonymous / direct form flow
    v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF p_cpf IS NOT NULL AND length(p_cpf) > 0 THEN
      v_cpf_last4 := right(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 4);
      v_cpf_hash := encode(digest(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 'sha256'), 'hex');
    END IF;
    INSERT INTO customers (organization_id, full_name, phone, normalized_phone, email, cpf_last4, cpf_hash)
    VALUES (v_org_id, p_full_name, p_phone, v_normalized_phone, p_email, v_cpf_last4, v_cpf_hash)
    ON CONFLICT (organization_id, normalized_phone)
    DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
      email = COALESCE(EXCLUDED.email, customers.email),
      cpf_last4 = COALESCE(EXCLUDED.cpf_last4, customers.cpf_last4),
      cpf_hash = COALESCE(EXCLUDED.cpf_hash, customers.cpf_hash),
      updated_at = now()
    RETURNING id INTO v_customer_id;
  END IF;

  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Não foi possível identificar o cliente'; END IF;

  -- 6. Check existing active reservation for this customer+event
  SELECT id INTO v_existing_reservation_id
  FROM reservations
  WHERE customer_id = v_customer_id AND event_id = p_event_id
    AND status IN ('pending','confirmed','checked_in');

  IF v_existing_reservation_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'active_reservation_exists',
      'existing_reservation_id', v_existing_reservation_id,
      'message', 'Você já possui uma reserva ativa para este evento.'
    );
  END IF;

  -- 7. Validate join rules (if 2 tables) — por organização+par; cada par de
  -- venue_tables pertence a exatamente uma geração de planta
  IF v_table_count = 2 THEN
    DECLARE
      v_vt_a UUID;
      v_vt_b UUID;
      v_pair_a UUID;
      v_pair_b UUID;
      v_join_allowed BOOLEAN;
    BEGIN
      SELECT et.venue_table_id INTO v_vt_a FROM event_tables et WHERE et.id = p_event_table_ids[1];
      SELECT et.venue_table_id INTO v_vt_b FROM event_tables et WHERE et.id = p_event_table_ids[2];
      IF v_vt_a < v_vt_b THEN v_pair_a := v_vt_a; v_pair_b := v_vt_b;
      ELSE v_pair_a := v_vt_b; v_pair_b := v_vt_a; END IF;

      SELECT allowed INTO v_join_allowed
      FROM table_join_rules
      WHERE organization_id = v_org_id
        AND table_a_id = v_pair_a AND table_b_id = v_pair_b;

      IF v_join_allowed IS NULL OR v_join_allowed = false THEN
        RAISE EXCEPTION 'Essas mesas não podem ser combinadas. Escolha mesas contíguas.';
      END IF;
    END;
  END IF;

  -- 8. Lock and validate each table
  FOREACH v_table_id IN ARRAY p_event_table_ids LOOP
    SELECT et.*, COALESCE(et.capacity_override, vt.capacity) AS effective_capacity, vt.code
    INTO v_event_table
    FROM event_tables et
    JOIN venue_tables vt ON vt.id = et.venue_table_id
    WHERE et.id = v_table_id
    FOR UPDATE;

    IF v_event_table IS NULL THEN RAISE EXCEPTION 'Mesa não encontrada: %', v_table_id; END IF;
    IF v_event_table.event_id != p_event_id THEN RAISE EXCEPTION 'Mesa não pertence ao evento'; END IF;
    IF v_event_table.is_active = false THEN
      RAISE EXCEPTION 'Mesa % não está mais disponível', v_event_table.code;
    END IF;
    IF v_event_table.status != 'free' THEN
      RAISE EXCEPTION 'Mesa % não está mais disponível', v_event_table.code;
    END IF;

    v_total_capacity := v_total_capacity + v_event_table.effective_capacity;
    v_table_codes := array_append(v_table_codes, v_event_table.code);
  END LOOP;

  -- 9. Validate capacity
  IF p_party_size > v_total_capacity THEN
    RAISE EXCEPTION 'O número de pessoas (%) excede a capacidade total das mesas (%)', p_party_size, v_total_capacity;
  END IF;

  -- 10. Generate reservation code
  v_reservation_code := 'CAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  -- 11. Create reservation (first table for legacy compat)
  INSERT INTO reservations (
    organization_id, event_id, event_table_id, customer_id,
    reservation_code, status, party_size,
    customer_name_snapshot, customer_phone_snapshot,
    notes, source
  ) VALUES (
    v_org_id, p_event_id, p_event_table_ids[1], v_customer_id,
    v_reservation_code, 'pending', p_party_size,
    COALESCE(p_full_name, (SELECT full_name FROM customers WHERE id = v_customer_id)),
    COALESCE(p_phone, (SELECT phone FROM customers WHERE id = v_customer_id)),
    CASE WHEN p_idempotency_key IS NOT NULL THEN 'idempotency:' || p_idempotency_key ELSE p_notes END,
    'central_casarao'
  ) RETURNING id INTO v_reservation_id;

  -- 12. Create allocations in reservation_tables and sync status
  FOREACH v_table_id IN ARRAY p_event_table_ids LOOP
    INSERT INTO reservation_tables (
      reservation_id, organization_id, event_id, event_table_id,
      venue_table_id, allocation_status
    )
    SELECT v_reservation_id, v_org_id, p_event_id, v_table_id,
           et.venue_table_id, 'active'
    FROM event_tables et WHERE et.id = v_table_id;

    -- Directly sync event_tables status to pending
    UPDATE event_tables SET status = 'pending'::table_status WHERE id = v_table_id;
  END LOOP;

  -- 13. Status history
  INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason, actor_type, actor_id)
  VALUES (v_reservation_id, NULL, 'pending', 'Reserva criada via self-service', 'customer', v_customer_id);

  -- 14. Return result
  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'reservation_code', v_reservation_code,
    'status', 'pending',
    'customer_name', COALESCE(p_full_name, (SELECT full_name FROM customers WHERE id = v_customer_id)),
    'party_size', p_party_size,
    'table_codes', v_table_codes,
    'table_count', v_table_count
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Uma dessas mesas já foi reservada. Tente outras mesas.';
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- ---------------------------------------------
-- 8. Auditoria
-- ---------------------------------------------
INSERT INTO public.audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, after_data)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  NULL,
  'internal_map_physical_v1',
  'venue_tables',
  NULL,
  jsonb_build_object(
    'migration', '00024',
    'map_version', 'PHYSICAL_INTERNAL_V1',
    'internal_tables', 21,
    'internal_seats', 70,
    'four_seaters', 14,
    'two_seaters', 7,
    'legacy_internal_deactivated', true,
    'external_unchanged', 'E-01..E-20 (planta externa nova ainda não fornecida)',
    'join_rules', jsonb_build_object('allowed', 6, 'denied_explicit', '01+02', 'pending', 'validação do proprietário para pares adicionais')
  )
);
