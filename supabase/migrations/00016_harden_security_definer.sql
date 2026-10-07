-- =============================================
-- Migration 00016: Harden Security Definer
-- =============================================

-- 1. Hardened register_event_interest
CREATE OR REPLACE FUNCTION public.register_event_interest(
  p_event_id uuid,
  p_full_name text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_normalized_phone text;
  v_event_exists boolean;
  v_entry_id uuid;
BEGIN
  -- Validate event exists and is not completed
  SELECT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_event_id AND status != 'completed'
  ) INTO v_event_exists;

  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'Evento não encontrado ou já realizado.';
  END IF;

  -- Validate inputs
  IF p_full_name IS NULL OR public.length(public.trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nome completo é obrigatório (mínimo 2 caracteres).';
  END IF;

  IF p_phone IS NULL OR public.length(p_phone) < 8 THEN
    RAISE EXCEPTION 'Telefone é obrigatório (mínimo 8 dígitos).';
  END IF;

  -- Normalize phone
  v_normalized_phone := public.regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Insert interest entry (idempotent)
  INSERT INTO public.event_interest_entries (event_id, full_name, phone, normalized_phone, source)
  VALUES (p_event_id, public.trim(p_full_name), p_phone, v_normalized_phone, 'website')
  ON CONFLICT (event_id, normalized_phone)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone
  RETURNING id INTO v_entry_id;

  RETURN public.jsonb_build_object(
    'success', true,
    'interest_id', v_entry_id,
    'message', 'Interesse registrado! Você será avisado quando as reservas abrirem.'
  );
END;
$$;

-- 2. Hardened expire_pending_reservations
CREATE OR REPLACE FUNCTION public.expire_pending_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  -- Cancel reservations that have passed their expires_at
  WITH expired AS (
    UPDATE public.reservations r
    SET 
      status = 'cancelled',
      updated_at = public.now()
    WHERE r.status = 'pending'
      AND r.expires_at <= public.now()
    RETURNING r.id, r.event_table_id
  ),
  freed_tables AS (
    UPDATE public.event_tables et
    SET 
      status = 'free',
      updated_at = public.now()
    FROM expired e
    WHERE et.id = e.event_table_id
    RETURNING et.id
  )
  SELECT count(*) INTO v_expired_count FROM expired;
  
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expiradas % reservas pendentes', v_expired_count;
  END IF;
END;
$$;

-- REVOKE EXECUTE ON ALL PUBLIC FUNCTIONS FROM public (safety baseline)
REVOKE EXECUTE ON FUNCTION public.expire_pending_reservations() FROM public;
REVOKE EXECUTE ON FUNCTION public.expire_pending_reservations() FROM anon;
-- (Only anon needs register_event_interest to capture leads)
GRANT EXECUTE ON FUNCTION public.register_event_interest(uuid, text, text) TO anon;
