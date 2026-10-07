-- =============================================
-- Migration 00020: Reaplicar funções com UTF-8 correto
-- Central Casarão 360
-- Autorada em 2026-09-01 a partir de pg_get_functiondef do banco vivo
-- =============================================
-- CAUSA RAIZ: SQL histórico foi aplicado via PowerShell com encoding ANSI,
--   gravando U+FFFD no lugar de caracteres acentuados nas strings de erro
--   ('n�o' em vez de 'não'). Afetadas (verificado via chr(65533) em prosrc):
--     create_reservation_v2, validate_reservation_capacity, register_event_interest.
--
-- ESTA MIGRATION:
--   1. Re-aplica as 3 funções afetadas com strings corrigidas — SEMÂNTICA
--      BYTE-A-BYTE IDÊNTICA à versão viva fora das strings de mensagem.
--   2. Torna canônica no repo a versão MULTI-MESA de sync_event_table_status
--      (viva desde o Gate 1 final; supera a versão single-table de 00004).
--      Sem mojibake, mas sem fonte no repo até aqui.
--
-- DÉBITO CONHECIDO (NÃO tratado aqui — Gate 1.5):
--   A idempotência de create_reservation_v2 usa `notes LIKE '%idempotency:KEY%'`.
--   Correção futura: coluna reservations.idempotency_key + índice único parcial.
--
-- REGRA DE APLICAÇÃO: somente via Management API com body JSON UTF-8.
--   NUNCA via pipe de arquivo no PowerShell.
-- =============================================

-- ---------------------------------------------
-- 1. create_reservation_v2 — motor transacional único de reserva
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

  -- 7. Validate join rules (if 2 tables)
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
        AND table_a_id = v_pair_a AND table_b_id = v_pair_b
        AND map_version = 'LEGACY_OPERATIONAL_V1';

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
-- 2. sync_event_table_status — versão MULTI-MESA (canônica, supera 00004)
-- Sincroniza TODAS as mesas de reservation_tables + a legada event_table_id.
-- Ao liberar, preserva mesas que ainda pertencem a outra reserva ativa.
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_event_table_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pending', 'confirmed', 'checked_in') THEN
      UPDATE event_tables
      SET status = CASE
        WHEN NEW.status = 'pending' THEN 'pending'::table_status
        WHEN NEW.status = 'confirmed' THEN 'reserved'::table_status
        WHEN NEW.status = 'checked_in' THEN 'occupied'::table_status
      END
      WHERE id IN (
        SELECT event_table_id FROM reservation_tables WHERE reservation_id = NEW.id
        UNION
        SELECT NEW.event_table_id
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('cancelled', 'no_show', 'expired') THEN
      UPDATE event_tables SET status = 'free'::table_status
      WHERE id IN (
        SELECT event_table_id FROM reservation_tables WHERE reservation_id = NEW.id
        UNION
        SELECT NEW.event_table_id
      )
      AND id NOT IN (
        SELECT rt.event_table_id
        FROM reservation_tables rt
        JOIN reservations r ON r.id = rt.reservation_id
        WHERE r.id != NEW.id AND r.status IN ('pending', 'confirmed', 'checked_in')
      );
    ELSIF NEW.status = 'confirmed' THEN
      UPDATE event_tables SET status = 'reserved'::table_status
      WHERE id IN (
        SELECT event_table_id FROM reservation_tables WHERE reservation_id = NEW.id
        UNION
        SELECT NEW.event_table_id
      );
    ELSIF NEW.status = 'checked_in' THEN
      UPDATE event_tables SET status = 'occupied'::table_status
      WHERE id IN (
        SELECT event_table_id FROM reservation_tables WHERE reservation_id = NEW.id
        UNION
        SELECT NEW.event_table_id
      );
    ELSIF NEW.status = 'pending' THEN
      UPDATE event_tables SET status = 'pending'::table_status
      WHERE id IN (
        SELECT event_table_id FROM reservation_tables WHERE reservation_id = NEW.id
        UNION
        SELECT NEW.event_table_id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------
-- 3. validate_reservation_capacity — versão viva (party_size 1..8;
-- a capacidade por mesa é validada dentro de create_reservation_v2)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.party_size < 1 OR NEW.party_size > 8 THEN
    RAISE EXCEPTION 'O número de pessoas (%) excede o limite máximo permitido (8)', NEW.party_size;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------
-- 4. register_event_interest — string corrigida
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.register_event_interest(p_event_id uuid, p_full_name text, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_event RECORD;
  v_result JSON;
BEGIN
  SELECT id, title INTO v_event
  FROM public.events WHERE id = p_event_id AND public_visibility = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Evento não encontrado.');
  END IF;

  INSERT INTO public.waitlist_entries (event_id, full_name, phone, type, status)
  VALUES (p_event_id, p_full_name, p_phone, 'interest', 'active')
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Interesse registrado com sucesso.');
END;
$function$;
