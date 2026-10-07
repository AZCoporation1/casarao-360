-- =============================================
-- Migration 00007: Views and RPCs
-- =============================================

-- =============================================
-- Helper Functions for RLS
-- =============================================

CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = p_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_org_role(p_org_id uuid, p_roles user_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = p_org_id
      AND role = ANY(p_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- View: event_metrics_view
-- =============================================

CREATE OR REPLACE VIEW event_metrics_view AS
SELECT
  e.id AS event_id,
  e.title,
  e.event_date,
  COUNT(et.id) AS total_tables,
  COUNT(et.id) FILTER (WHERE et.status = 'free') AS free_tables,
  COUNT(et.id) FILTER (WHERE et.status = 'pending') AS pending_tables,
  COUNT(et.id) FILTER (WHERE et.status = 'reserved') AS reserved_tables,
  COUNT(et.id) FILTER (WHERE et.status = 'occupied') AS occupied_tables,
  COUNT(et.id) FILTER (WHERE et.status = 'blocked') AS blocked_tables,
  COALESCE(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) AS total_capacity,
  COALESCE(
    SUM(COALESCE(et.capacity_override, vt.capacity))
    FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
    0
  ) AS reserved_capacity,
  CASE
    WHEN COALESCE(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(
        SUM(COALESCE(et.capacity_override, vt.capacity))
        FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
        0
      )::numeric /
      NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0)) * 100,
      1
    )
  END AS occupancy_percentage,
  (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status = 'pending') AS pending_reservations,
  (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS confirmed_reservations,
  (SELECT COUNT(*) FROM waitlist_entries w WHERE w.event_id = e.id AND w.status IN ('waiting', 'notified')) AS waitlist_count,
  CASE
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.9 THEN 'critical'
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.75 THEN 'high'
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.5 THEN 'medium'
    ELSE 'low'
  END AS operational_pressure,
  CASE
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.9 THEN 'Lotação Máxima'
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.75 THEN 'Alta Demanda'
    WHEN COALESCE(
      SUM(COALESCE(et.capacity_override, vt.capacity))
      FILTER (WHERE et.status IN ('reserved', 'occupied', 'pending')),
      0
    )::numeric / NULLIF(SUM(COALESCE(et.capacity_override, vt.capacity)), 0) > 0.5 THEN 'Demanda Moderada'
    ELSE 'Disponível'
  END AS forecast_label
FROM events e
LEFT JOIN event_tables et ON et.event_id = e.id
LEFT JOIN venue_tables vt ON vt.id = et.venue_table_id
GROUP BY e.id, e.title, e.event_date;

-- =============================================
-- RPC: get_event_metrics
-- =============================================

CREATE OR REPLACE FUNCTION get_event_metrics(p_event_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'event_id', event_id,
    'title', title,
    'event_date', event_date,
    'total_tables', total_tables,
    'free_tables', free_tables,
    'pending_tables', pending_tables,
    'reserved_tables', reserved_tables,
    'occupied_tables', occupied_tables,
    'blocked_tables', blocked_tables,
    'total_capacity', total_capacity,
    'reserved_capacity', reserved_capacity,
    'occupancy_percentage', occupancy_percentage,
    'pending_reservations', pending_reservations,
    'confirmed_reservations', confirmed_reservations,
    'waitlist_count', waitlist_count,
    'operational_pressure', operational_pressure,
    'forecast_label', forecast_label
  ) INTO v_result
  FROM event_metrics_view
  WHERE event_id = p_event_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- RPC: get_executive_summary
-- =============================================

CREATE OR REPLACE FUNCTION get_executive_summary(p_organization_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_next_event record;
  v_metrics jsonb;
  v_alerts_count integer;
  v_waitlist_total integer;
BEGIN
  -- Find next upcoming event
  SELECT e.id, e.title, e.event_date, e.starts_at
  INTO v_next_event
  FROM events e
  WHERE e.organization_id = p_organization_id
    AND e.event_date >= CURRENT_DATE
    AND e.status IN ('scheduled', 'open')
  ORDER BY e.event_date ASC, e.starts_at ASC
  LIMIT 1;

  -- Get metrics for next event
  IF v_next_event.id IS NOT NULL THEN
    v_metrics := get_event_metrics(v_next_event.id);
  ELSE
    v_metrics := '{}'::jsonb;
  END IF;

  -- Count unresolved alerts
  SELECT COUNT(*) INTO v_alerts_count
  FROM operational_alerts
  WHERE organization_id = p_organization_id
    AND is_resolved = false;

  -- Count total waitlist
  SELECT COUNT(*) INTO v_waitlist_total
  FROM waitlist_entries w
  JOIN events e ON e.id = w.event_id
  WHERE w.organization_id = p_organization_id
    AND w.status IN ('waiting', 'notified')
    AND e.event_date >= CURRENT_DATE;

  RETURN jsonb_build_object(
    'next_event', CASE
      WHEN v_next_event.id IS NOT NULL THEN jsonb_build_object(
        'id', v_next_event.id,
        'title', v_next_event.title,
        'event_date', v_next_event.event_date,
        'starts_at', v_next_event.starts_at
      )
      ELSE NULL
    END,
    'metrics', v_metrics,
    'unresolved_alerts', v_alerts_count,
    'total_waitlist', v_waitlist_total
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- RPC: create_public_reservation (transactional, race-condition safe)
-- =============================================

CREATE OR REPLACE FUNCTION create_public_reservation(
  p_event_id uuid,
  p_event_table_id uuid,
  p_full_name text,
  p_phone text,
  p_cpf text,
  p_party_size integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
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
BEGIN
  -- 1. Get organization from event
  SELECT e.organization_id INTO v_org_id
  FROM events e WHERE e.id = p_event_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  -- 2. Normalize phone (remove non-digits)
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- 3. CPF handling (hash + last 4)
  IF p_cpf IS NOT NULL AND length(p_cpf) > 0 THEN
    v_cpf_last4 := right(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 4);
    v_cpf_hash := encode(digest(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  END IF;

  -- 4. Lock the event_table row to prevent race condition
  SELECT et.*, COALESCE(et.capacity_override, vt.capacity) AS effective_capacity
  INTO v_event_table
  FROM event_tables et
  JOIN venue_tables vt ON vt.id = et.venue_table_id
  WHERE et.id = p_event_table_id
  FOR UPDATE;

  IF v_event_table IS NULL THEN
    RAISE EXCEPTION 'Mesa não encontrada';
  END IF;

  -- 5. Verify table belongs to event
  IF v_event_table.event_id != p_event_id THEN
    RAISE EXCEPTION 'Esta mesa não pertence a este evento';
  END IF;

  -- 6. Verify table is free
  IF v_event_table.status != 'free' THEN
    RAISE EXCEPTION 'Esta mesa não está mais disponível. Outra pessoa pode ter reservado antes.';
  END IF;

  -- 7. Verify capacity
  IF p_party_size > v_event_table.effective_capacity THEN
    RAISE EXCEPTION 'O número de pessoas (%) excede a capacidade da mesa (%)',
      p_party_size, v_event_table.effective_capacity;
  END IF;

  -- 8. Create or update customer (upsert by phone)
  INSERT INTO customers (organization_id, full_name, phone, normalized_phone, cpf_last4, cpf_hash)
  VALUES (v_org_id, p_full_name, p_phone, v_normalized_phone, v_cpf_last4, v_cpf_hash)
  ON CONFLICT (organization_id, normalized_phone)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    cpf_last4 = COALESCE(EXCLUDED.cpf_last4, customers.cpf_last4),
    cpf_hash = COALESCE(EXCLUDED.cpf_hash, customers.cpf_hash),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  -- 9. Generate unique reservation code
  v_reservation_code := 'CAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  -- 10. Create reservation (trigger will update event_table status)
  INSERT INTO reservations (
    organization_id, event_id, event_table_id, customer_id,
    reservation_code, status, party_size,
    customer_name_snapshot, customer_phone_snapshot,
    notes, source
  ) VALUES (
    v_org_id, p_event_id, p_event_table_id, v_customer_id,
    v_reservation_code, 'pending', p_party_size,
    p_full_name, p_phone,
    p_notes, 'central_casarao'
  ) RETURNING id INTO v_reservation_id;

  -- 11. Return safe data (no sensitive info)
  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'reservation_code', v_reservation_code,
    'status', 'pending',
    'customer_name', p_full_name,
    'party_size', p_party_size,
    'table_code', (SELECT vt.code FROM venue_tables vt WHERE vt.id = v_event_table.venue_table_id)
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Esta mesa já foi reservada por outra pessoa. Tente outra mesa.';
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: add_to_waitlist
-- =============================================

CREATE OR REPLACE FUNCTION add_to_waitlist(
  p_event_id uuid,
  p_full_name text,
  p_phone text,
  p_cpf text,
  p_party_size integer,
  p_preferred_sector_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_normalized_phone text;
  v_cpf_hash text;
  v_cpf_last4 text;
  v_customer_id uuid;
  v_org_id uuid;
  v_priority integer;
  v_entry_id uuid;
BEGIN
  -- Get organization from event
  SELECT e.organization_id INTO v_org_id
  FROM events e WHERE e.id = p_event_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  -- Normalize phone
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- CPF handling
  IF p_cpf IS NOT NULL AND length(p_cpf) > 0 THEN
    v_cpf_last4 := right(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 4);
    v_cpf_hash := encode(digest(regexp_replace(p_cpf, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  END IF;

  -- Create or update customer
  INSERT INTO customers (organization_id, full_name, phone, normalized_phone, cpf_last4, cpf_hash)
  VALUES (v_org_id, p_full_name, p_phone, v_normalized_phone, v_cpf_last4, v_cpf_hash)
  ON CONFLICT (organization_id, normalized_phone)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now()
  RETURNING id INTO v_customer_id;

  -- Calculate priority (next in line)
  SELECT COALESCE(MAX(priority), 0) + 1 INTO v_priority
  FROM waitlist_entries
  WHERE event_id = p_event_id AND status IN ('waiting', 'notified');

  -- Insert waitlist entry
  INSERT INTO waitlist_entries (
    organization_id, event_id, customer_id,
    party_size, preferred_sector_id, status, priority, notes
  ) VALUES (
    v_org_id, p_event_id, v_customer_id,
    p_party_size, p_preferred_sector_id, 'waiting', v_priority, p_notes
  ) RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'waitlist_entry_id', v_entry_id,
    'position', v_priority,
    'customer_name', p_full_name,
    'party_size', p_party_size
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já está na lista de espera para este evento.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: move_waitlist_to_reservation
-- =============================================

CREATE OR REPLACE FUNCTION move_waitlist_to_reservation(
  p_waitlist_entry_id uuid,
  p_event_table_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_entry record;
  v_customer record;
  v_result jsonb;
BEGIN
  -- Get waitlist entry
  SELECT * INTO v_entry
  FROM waitlist_entries
  WHERE id = p_waitlist_entry_id AND status IN ('waiting', 'notified')
  FOR UPDATE;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Entrada na lista de espera não encontrada ou já processada';
  END IF;

  -- Get customer data
  SELECT * INTO v_customer
  FROM customers WHERE id = v_entry.customer_id;

  -- Create reservation via the public reservation RPC
  v_result := create_public_reservation(
    v_entry.event_id,
    p_event_table_id,
    v_customer.full_name,
    v_customer.phone,
    NULL, -- CPF already stored
    v_entry.party_size,
    v_entry.notes
  );

  -- Update waitlist entry status
  UPDATE waitlist_entries
  SET
    status = 'converted',
    converted_reservation_id = (v_result->>'reservation_id')::uuid,
    updated_at = now()
  WHERE id = p_waitlist_entry_id;

  RETURN v_result || jsonb_build_object('converted_from_waitlist', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
