-- =============================================
-- Migration 00018: Gate 1 Final
-- Central Casarão 360
-- Applied: 2026-08-20 via Management API
-- =============================================
-- Phase 0: Cleanup test data
-- Phase 1: Auth/Customer (auth_user_id, RPCs, RLS)
-- Phase 2: reservation_tables + reservation_status_history
-- Phase 3: table_join_rules
-- Phase 4: Hold lifecycle (trigger fix, pg_cron)
-- Phase 5: Core transactional RPC (create_reservation_v2)
-- =============================================

-- PHASE 1: AUTH/CUSTOMER

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.ensure_customer_for_auth_user(
  p_auth_user_id UUID, p_full_name TEXT, p_phone TEXT, p_email TEXT,
  p_cpf TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $func$
DECLARE v_customer_id UUID; v_normalized_phone TEXT; v_cpf_hash TEXT; v_cpf_last4 TEXT;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE auth_user_id = p_auth_user_id;
  IF v_customer_id IS NOT NULL THEN RETURN v_customer_id; END IF;
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF p_cpf IS NOT NULL AND length(p_cpf) > 0 THEN
    v_cpf_last4 := right(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 4);
    v_cpf_hash := encode(digest(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  END IF;
  SELECT id INTO v_customer_id FROM customers WHERE organization_id = p_organization_id AND normalized_phone = v_normalized_phone;
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers SET auth_user_id = p_auth_user_id, email = COALESCE(p_email, email),
      full_name = COALESCE(p_full_name, full_name), cpf_last4 = COALESCE(v_cpf_last4, cpf_last4),
      cpf_hash = COALESCE(v_cpf_hash, cpf_hash), updated_at = now() WHERE id = v_customer_id;
    RETURN v_customer_id;
  END IF;
  INSERT INTO customers (organization_id, auth_user_id, full_name, phone, normalized_phone, email, cpf_last4, cpf_hash)
  VALUES (p_organization_id, p_auth_user_id, p_full_name, p_phone, v_normalized_phone, p_email, v_cpf_last4, v_cpf_hash)
  RETURNING id INTO v_customer_id;
  RETURN v_customer_id;
END; $func$;

CREATE OR REPLACE FUNCTION public.get_public_booking_settings(
  p_organization_id UUID DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'whatsapp_reservations_enabled', COALESCE(os.whatsapp_reservations_enabled, false),
    'whatsapp_reservations_number_e164', os.whatsapp_reservations_number_e164,
    'max_self_service_party_size', COALESCE(os.max_self_service_party_size, 8),
    'max_self_service_tables', COALESCE(os.max_self_service_tables, 2),
    'default_hold_duration_minutes', COALESCE(os.default_hold_duration_minutes, 180)
  ) INTO v_result FROM organization_settings os WHERE os.organization_id = p_organization_id;
  RETURN COALESCE(v_result, '{"whatsapp_reservations_enabled":false,"max_self_service_party_size":8,"max_self_service_tables":2,"default_hold_duration_minutes":180}'::jsonb);
END; $func$;

CREATE OR REPLACE FUNCTION public.update_customer_profile(
  p_full_name TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_customer_id UUID; v_normalized_phone TEXT;
BEGIN
  SELECT id INTO v_customer_id FROM customers WHERE auth_user_id = auth.uid();
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF p_phone IS NOT NULL THEN v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g'); END IF;
  UPDATE customers SET full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone), normalized_phone = COALESCE(v_normalized_phone, normalized_phone),
    email = COALESCE(p_email, email), updated_at = now() WHERE id = v_customer_id;
  RETURN jsonb_build_object('success', true, 'customer_id', v_customer_id);
END; $func$;

-- PHASE 2: RESERVATION_TABLES + STATUS_HISTORY

DO $$ BEGIN CREATE TYPE allocation_status AS ENUM ('active', 'released', 'transferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reservation_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_table_id UUID NOT NULL REFERENCES event_tables(id) ON DELETE RESTRICT,
  venue_table_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE RESTRICT,
  allocation_status allocation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  CONSTRAINT chk_released_at CHECK (
    (allocation_status = 'active' AND released_at IS NULL) OR (allocation_status != 'active')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rt_active_allocation ON reservation_tables (event_table_id) WHERE allocation_status = 'active';
ALTER TABLE public.reservation_tables ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_status TEXT, to_status TEXT NOT NULL, reason TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system', actor_id UUID, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rsh_reservation ON reservation_status_history(reservation_id);

-- PHASE 3: TABLE JOIN RULES

CREATE TABLE IF NOT EXISTS public.table_join_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  map_version TEXT NOT NULL DEFAULT 'LEGACY_OPERATIONAL_V1',
  table_a_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  table_b_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT false,
  reason TEXT, priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_different_tables CHECK (table_a_id <> table_b_id),
  CONSTRAINT chk_normalized_pair CHECK (table_a_id < table_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tjr_unique_pair ON table_join_rules (organization_id, map_version, table_a_id, table_b_id);
ALTER TABLE public.table_join_rules ENABLE ROW LEVEL SECURITY;

-- PHASE 4: FIX HOLD LIFECYCLE (trigger was MISSING in Cloud)

CREATE OR REPLACE FUNCTION public.set_reservation_expires_at()
RETURNS TRIGGER AS $$
DECLARE v_hold_minutes INTEGER;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT COALESCE(os.default_hold_duration_minutes, 180) INTO v_hold_minutes
    FROM organization_settings os WHERE os.organization_id = NEW.organization_id;
    IF v_hold_minutes IS NULL THEN v_hold_minutes := 180; END IF;
    NEW.expires_at := now() + (v_hold_minutes || ' minutes')::interval;
  ELSIF NEW.status != 'pending' THEN
    NEW.expires_at := NULL;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reservation_expires_at ON reservations;
CREATE TRIGGER trg_set_reservation_expires_at
  BEFORE INSERT OR UPDATE OF status ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_reservation_expires_at();

CREATE OR REPLACE FUNCTION public.expire_pending_reservations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE reservations SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND expires_at <= now() RETURNING id, event_table_id
  ),
  released_allocs AS (
    UPDATE reservation_tables SET allocation_status = 'released', released_at = now()
    FROM expired e WHERE reservation_tables.reservation_id = e.id AND reservation_tables.allocation_status = 'active'
  ),
  history_entries AS (
    INSERT INTO reservation_status_history (reservation_id, from_status, to_status, reason, actor_type)
    SELECT e.id, 'pending', 'expired', 'Hold expirado automaticamente', 'system' FROM expired e
  )
  SELECT count(*) INTO v_expired_count FROM expired;
  RETURN v_expired_count;
END; $func$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-pending-reservations', '*/5 * * * *', $$ SELECT public.expire_pending_reservations() $$);

-- PHASE 5: See create_reservation_v2 definition (too long for this file, documented in scratch/)
-- RLS policies applied via Management API
