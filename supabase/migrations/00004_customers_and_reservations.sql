-- =============================================
-- Migration 00004: Customers and Reservations (IDEMPOTENT)
-- =============================================

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  normalized_phone text NOT NULL,
  email text,
  cpf_last4 text,
  cpf_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_org_phone_unique UNIQUE (organization_id, normalized_phone)
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_table_id uuid NOT NULL REFERENCES event_tables(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_code text UNIQUE NOT NULL,
  status reservation_status DEFAULT 'pending',
  party_size integer NOT NULL,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  notes text,
  source text DEFAULT 'central_casarao',
  payment_status payment_status DEFAULT 'not_required',
  expires_at timestamptz,
  confirmed_at timestamptz,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CRITICAL: Unique partial index to prevent double-booking
-- Drop and recreate for idempotency
DROP INDEX IF EXISTS idx_reservations_active_table;
CREATE UNIQUE INDEX idx_reservations_active_table
  ON reservations (event_table_id)
  WHERE status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_organization ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_reservations_event_table ON reservations(event_table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Validate party_size <= table capacity
CREATE OR REPLACE FUNCTION validate_reservation_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity integer;
BEGIN
  SELECT COALESCE(et.capacity_override, vt.capacity)
  INTO v_capacity
  FROM event_tables et
  JOIN venue_tables vt ON vt.id = et.venue_table_id
  WHERE et.id = NEW.event_table_id;

  IF NEW.party_size > v_capacity THEN
    RAISE EXCEPTION 'O número de pessoas (%) excede a capacidade da mesa (%)', NEW.party_size, v_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_reservation_capacity ON reservations;
CREATE TRIGGER trg_validate_reservation_capacity
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION validate_reservation_capacity();

-- Trigger: Sync event_tables.status on reservation changes
CREATE OR REPLACE FUNCTION sync_event_table_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pending', 'confirmed', 'checked_in') THEN
      UPDATE event_tables
      SET status = CASE
        WHEN NEW.status = 'pending' THEN 'pending'::table_status
        WHEN NEW.status = 'confirmed' THEN 'reserved'::table_status
        WHEN NEW.status = 'checked_in' THEN 'occupied'::table_status
      END
      WHERE id = NEW.event_table_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('cancelled', 'no_show', 'expired') THEN
      IF NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE event_table_id = NEW.event_table_id
          AND id != NEW.id
          AND status IN ('pending', 'confirmed', 'checked_in')
      ) THEN
        UPDATE event_tables SET status = 'free'::table_status
        WHERE id = NEW.event_table_id;
      END IF;
    ELSIF NEW.status = 'confirmed' THEN
      UPDATE event_tables SET status = 'reserved'::table_status
      WHERE id = NEW.event_table_id;
    ELSIF NEW.status = 'checked_in' THEN
      UPDATE event_tables SET status = 'occupied'::table_status
      WHERE id = NEW.event_table_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_event_table_status ON reservations;
CREATE TRIGGER trg_sync_event_table_status
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION sync_event_table_status();
