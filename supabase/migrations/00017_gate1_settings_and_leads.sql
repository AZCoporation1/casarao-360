-- =============================================
-- GATE 1 — P0 Functional: organization_settings + large_party_requests
-- Applied: 2026-08-20 via Supabase Management API
-- Project: xhemqctqilpfjycesusr
-- =============================================

-- 1. Organization settings (centralized admin config)
CREATE TABLE IF NOT EXISTS public.organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  whatsapp_reservations_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_reservations_number_e164 TEXT NOT NULL DEFAULT '+5511996963139',
  whatsapp_reservations_message_template TEXT,
  max_self_service_party_size INT NOT NULL DEFAULT 8,
  max_self_service_tables INT NOT NULL DEFAULT 2,
  default_hold_duration_minutes INT NOT NULL DEFAULT 180,
  default_payment_mode TEXT NOT NULL DEFAULT 'manual_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_manage_org_settings ON public.organization_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.organization_id = organization_settings.organization_id
    AND p.role IN ('owner','admin','manager')
  )
);

CREATE POLICY anon_read_settings ON public.organization_settings
FOR SELECT USING (true);

-- Seed default settings
INSERT INTO public.organization_settings (
  organization_id,
  whatsapp_reservations_enabled,
  whatsapp_reservations_number_e164,
  max_self_service_party_size,
  max_self_service_tables,
  default_hold_duration_minutes,
  default_payment_mode
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  true, '+5511996963139', 8, 2, 180, 'manual_admin'
) ON CONFLICT (organization_id) DO NOTHING;


-- 2. Large party requests (WhatsApp leads for >8 people)
CREATE TABLE IF NOT EXISTS public.large_party_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  public_code TEXT NOT NULL UNIQUE,
  event_id UUID NOT NULL REFERENCES events(id),
  customer_id UUID REFERENCES customers(id),
  name TEXT,
  phone TEXT,
  normalized_phone TEXT,
  party_size INT NOT NULL CHECK (party_size > 0),
  sector_interest TEXT,
  table_interest JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'casarao_360_whatsapp',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','negotiating','converted','lost','archived')),
  assigned_to UUID REFERENCES profiles(id),
  converted_reservation_id UUID REFERENCES reservations(id),
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.large_party_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_manage_org_leads ON public.large_party_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.organization_id = large_party_requests.organization_id
    AND p.role IN ('owner','admin','manager')
  )
);


-- 3. RPC for creating large party requests (idempotent)
CREATE OR REPLACE FUNCTION public.create_large_party_request(
  p_event_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_party_size INT,
  p_sector_interest TEXT DEFAULT NULL,
  p_table_interest JSONB DEFAULT '[]'::jsonb,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_normalized_phone TEXT;
  v_lead_id UUID;
  v_public_code TEXT;
  v_existing_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, public_code INTO v_existing_id, v_public_code
    FROM large_party_requests
    WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'lead_id', v_existing_id, 'public_code', v_public_code, 'deduplicated', true);
    END IF;
  END IF;

  SELECT organization_id INTO v_org_id FROM events WHERE id = p_event_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Evento nao encontrado'; END IF;

  v_normalized_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  v_public_code := 'LPR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO large_party_requests (
    organization_id, public_code, event_id, name, phone,
    normalized_phone, party_size, sector_interest, table_interest,
    idempotency_key
  ) VALUES (
    v_org_id, v_public_code, p_event_id, p_name, p_phone,
    v_normalized_phone, p_party_size, p_sector_interest, p_table_interest,
    p_idempotency_key
  ) RETURNING id INTO v_lead_id;

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id, 'public_code', v_public_code, 'deduplicated', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_large_party_request TO anon, authenticated;


-- 4. Updated create_public_reservation with party_size limit
-- (reads max from organization_settings, defaults to 8)
-- Full function replacement with SET search_path = public
CREATE OR REPLACE FUNCTION public.create_public_reservation(
  p_event_id uuid, p_event_table_id uuid, p_full_name text,
  p_phone text, p_cpf text, p_party_size integer, p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_normalized_phone text;
  v_cpf_hash text;
  v_cpf_last4 text;
  v_customer_id uuid;
  v_org_id uuid;
  v_event_table record;
  v_table_capacity integer;
  v_reservation_code text;
  v_reservation_id uuid;
  v_max_party int;
BEGIN
  -- Check self-service party size limit
  SELECT COALESCE(os.max_self_service_party_size, 8) INTO v_max_party
  FROM events e
  LEFT JOIN organization_settings os ON os.organization_id = e.organization_id
  WHERE e.id = p_event_id;

  IF p_party_size > v_max_party THEN
    RAISE EXCEPTION 'Grupos acima de % pessoas devem solicitar reserva personalizada via WhatsApp.', v_max_party;
  END IF;

  SELECT e.organization_id INTO v_org_id FROM events e WHERE e.id = p_event_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Evento nao encontrado'; END IF;

  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  IF p_cpf IS NOT NULL AND length(p_cpf) > 0 THEN
    v_cpf_last4 := right(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 4);
    v_cpf_hash := encode(digest(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  END IF;

  SELECT et.*, COALESCE(et.capacity_override, vt.capacity) AS effective_capacity
  INTO v_event_table
  FROM event_tables et
  JOIN venue_tables vt ON vt.id = et.venue_table_id
  WHERE et.id = p_event_table_id
  FOR UPDATE;

  IF v_event_table IS NULL THEN RAISE EXCEPTION 'Mesa nao encontrada'; END IF;
  IF v_event_table.event_id != p_event_id THEN RAISE EXCEPTION 'Esta mesa nao pertence a este evento'; END IF;
  IF v_event_table.status != 'free' THEN RAISE EXCEPTION 'Esta mesa nao esta mais disponivel. Outra pessoa pode ter reservado antes.'; END IF;
  IF p_party_size > v_event_table.effective_capacity THEN
    RAISE EXCEPTION 'O numero de pessoas (%) excede a capacidade da mesa (%)', p_party_size, v_event_table.effective_capacity;
  END IF;

  INSERT INTO customers (organization_id, full_name, phone, normalized_phone, cpf_last4, cpf_hash)
  VALUES (v_org_id, p_full_name, p_phone, v_normalized_phone, v_cpf_last4, v_cpf_hash)
  ON CONFLICT (organization_id, normalized_phone)
  DO UPDATE SET full_name = EXCLUDED.full_name,
    cpf_last4 = COALESCE(EXCLUDED.cpf_last4, customers.cpf_last4),
    cpf_hash = COALESCE(EXCLUDED.cpf_hash, customers.cpf_hash),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  v_reservation_code := 'CAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO reservations (
    organization_id, event_id, event_table_id, customer_id,
    reservation_code, status, party_size,
    customer_name_snapshot, customer_phone_snapshot, notes, source
  ) VALUES (
    v_org_id, p_event_id, p_event_table_id, v_customer_id,
    v_reservation_code, 'pending', p_party_size,
    p_full_name, p_phone, p_notes, 'central_casarao'
  ) RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 'reservation_id', v_reservation_id,
    'reservation_code', v_reservation_code, 'status', 'pending',
    'customer_name', p_full_name, 'party_size', p_party_size,
    'table_code', (SELECT vt.code FROM venue_tables vt WHERE vt.id = v_event_table.venue_table_id)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta mesa ja foi reservada por outra pessoa. Tente outra mesa.';
  WHEN OTHERS THEN RAISE;
END;
$func$;
