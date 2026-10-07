-- =============================================
-- CONSOLIDATED MIGRATION - Central Casar�o 360
-- Execute this in Supabase Dashboard > SQL Editor
-- Generated: 2026-06-11 12:52:20
-- =============================================


-- >>>>>>>>>> 00001_extensions_and_enums.sql >>>>>>>>>>
-- =============================================
-- Migration 00001: Extensions and Enums (IDEMPOTENT)
-- Central Casarão 360 — Fase 4
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS (with DO block for idempotency)
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner','admin','manager','staff','viewer');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('draft','scheduled','open','sold_out','completed','cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
    CREATE TYPE table_status AS ENUM ('free','reserved','occupied','blocked','pending','waitlist');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE reservation_status AS ENUM ('pending','confirmed','checked_in','cancelled','no_show','expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitlist_status') THEN
    CREATE TYPE waitlist_status AS ENUM ('waiting','notified','converted','expired','cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE alert_severity AS ENUM ('low','medium','high','critical');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'insight_impact') THEN
    CREATE TYPE insight_impact AS ENUM ('low','medium','high','critical');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('not_required','pending','paid','failed','refunded');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_unit') THEN
    CREATE TYPE inventory_unit AS ENUM ('unit','kg','g','l','ml','box','pack');
  END IF;
END $$;

-- <<<<<<<<<< END 00001_extensions_and_enums.sql <<<<<<<<<<

-- >>>>>>>>>> 00002_core_tables.sql >>>>>>>>>>
-- =============================================
-- Migration 00002: Core Tables (IDEMPOTENT)
-- organizations, profiles, venues, venue_sectors, venue_tables
-- =============================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  full_name text,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Venues
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text,
  city text,
  state text,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Venue Sectors
CREATE TABLE IF NOT EXISTS venue_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text,
  color text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Venue Tables
CREATE TABLE IF NOT EXISTS venue_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES venue_sectors(id) ON DELETE SET NULL,
  code text NOT NULL,
  label text,
  capacity integer NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric,
  height numeric,
  shape text DEFAULT 'round',
  rotation numeric DEFAULT 0,
  default_status table_status DEFAULT 'free',
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_tables_venue_code_unique UNIQUE (venue_id, code)
);

-- Indexes (IF NOT EXISTS not available for indexes, use DO blocks)
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_venues_organization ON venues(organization_id);
CREATE INDEX IF NOT EXISTS idx_venue_sectors_venue ON venue_sectors(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_tables_venue ON venue_tables(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_tables_sector ON venue_tables(sector_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (drop and recreate for idempotency)
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_venues_updated_at ON venues;
CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_venue_sectors_updated_at ON venue_sectors;
CREATE TRIGGER trg_venue_sectors_updated_at
  BEFORE UPDATE ON venue_sectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_venue_tables_updated_at ON venue_tables;
CREATE TRIGGER trg_venue_tables_updated_at
  BEFORE UPDATE ON venue_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- <<<<<<<<<< END 00002_core_tables.sql <<<<<<<<<<

-- >>>>>>>>>> 00003_events_and_event_tables.sql >>>>>>>>>>
-- =============================================
-- Migration 00003: Events and Event Tables (IDEMPOTENT)
-- =============================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  artist_name text,
  event_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status event_status DEFAULT 'scheduled',
  cover_image_url text,
  capacity_override integer,
  reservation_opens_at timestamptz,
  reservation_closes_at timestamptz,
  public_visibility boolean DEFAULT true,
  highlights text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_table_id uuid NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  status table_status DEFAULT 'free',
  capacity_override integer,
  price_cents integer DEFAULT 0,
  experience_label text,
  experience_description text,
  features text[] DEFAULT '{}',
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_tables_event_venue_table_unique UNIQUE (event_id, venue_table_id)
);

CREATE INDEX IF NOT EXISTS idx_events_organization ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_event_tables_event ON event_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tables_venue_table ON event_tables(venue_table_id);
CREATE INDEX IF NOT EXISTS idx_event_tables_status ON event_tables(status);

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_event_tables_updated_at ON event_tables;
CREATE TRIGGER trg_event_tables_updated_at
  BEFORE UPDATE ON event_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- <<<<<<<<<< END 00003_events_and_event_tables.sql <<<<<<<<<<

-- >>>>>>>>>> 00004_customers_and_reservations.sql >>>>>>>>>>
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

-- <<<<<<<<<< END 00004_customers_and_reservations.sql <<<<<<<<<<

-- >>>>>>>>>> 00005_waitlist_and_alerts.sql >>>>>>>>>>
-- =============================================
-- Migration 00005: Waitlist, Alerts, AI Insights (IDEMPOTENT)
-- =============================================

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  party_size integer NOT NULL,
  preferred_sector_id uuid REFERENCES venue_sectors(id) ON DELETE SET NULL,
  status waitlist_status DEFAULT 'waiting',
  priority integer NOT NULL DEFAULT 0,
  notes text,
  notified_at timestamptz,
  expires_at timestamptz,
  converted_reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS idx_waitlist_active_customer_event;
CREATE UNIQUE INDEX idx_waitlist_active_customer_event
  ON waitlist_entries (event_id, customer_id)
  WHERE status IN ('waiting', 'notified');

CREATE TABLE IF NOT EXISTS operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity alert_severity DEFAULT 'medium',
  source text,
  recommendation text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  impact insight_impact DEFAULT 'medium',
  source text,
  recommendation text,
  metadata jsonb DEFAULT '{}',
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlist_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer ON waitlist_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_alerts_organization ON operational_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_event ON operational_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON operational_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_insights_organization ON ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_insights_event ON ai_insights(event_id);

DROP TRIGGER IF EXISTS trg_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER trg_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_operational_alerts_updated_at ON operational_alerts;
CREATE TRIGGER trg_operational_alerts_updated_at
  BEFORE UPDATE ON operational_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_insights_updated_at ON ai_insights;
CREATE TRIGGER trg_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- <<<<<<<<<< END 00005_waitlist_and_alerts.sql <<<<<<<<<<

-- >>>>>>>>>> 00006_inventory_staff_audit.sql >>>>>>>>>>
-- =============================================
-- Migration 00006: Inventory, Staff, Audit (IDEMPOTENT)
-- =============================================

CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit inventory_unit NOT NULL,
  current_quantity numeric DEFAULT 0,
  minimum_quantity numeric DEFAULT 0,
  is_critical boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_inventory_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  recommended_quantity numeric,
  estimated_consumption numeric,
  alert_level alert_severity DEFAULT 'medium',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  role text NOT NULL,
  shift_start timestamptz,
  shift_end timestamptz,
  status text DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_org ON inventory_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_forecasts_event ON event_inventory_forecasts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_forecasts_item ON event_inventory_forecasts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_event ON staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

DROP TRIGGER IF EXISTS trg_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER trg_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_event_inventory_forecasts_updated_at ON event_inventory_forecasts;
CREATE TRIGGER trg_event_inventory_forecasts_updated_at
  BEFORE UPDATE ON event_inventory_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_staff_assignments_updated_at ON staff_assignments;
CREATE TRIGGER trg_staff_assignments_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- <<<<<<<<<< END 00006_inventory_staff_audit.sql <<<<<<<<<<

-- >>>>>>>>>> 00007_views_and_rpcs.sql >>>>>>>>>>
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

-- <<<<<<<<<< END 00007_views_and_rpcs.sql <<<<<<<<<<

-- >>>>>>>>>> 00008_rls_policies.sql >>>>>>>>>>
-- =============================================
-- Migration 00008: Row Level Security Policies (IDEMPOTENT)
-- Uses DROP POLICY IF EXISTS before CREATE for safe re-application
-- =============================================

-- Enable RLS on ALL tables (safe to re-run)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PUBLIC / ANON policies
-- =============================================

DROP POLICY IF EXISTS "anon_read_public_events" ON events;
CREATE POLICY "anon_read_public_events" ON events
  FOR SELECT TO anon
  USING (public_visibility = true AND status IN ('scheduled', 'open'));

DROP POLICY IF EXISTS "anon_read_venue_sectors" ON venue_sectors;
CREATE POLICY "anon_read_venue_sectors" ON venue_sectors
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      JOIN events e ON e.venue_id = v.id
      WHERE v.id = venue_sectors.venue_id
        AND e.public_visibility = true
        AND e.status IN ('scheduled', 'open')
    )
  );

DROP POLICY IF EXISTS "anon_read_venue_tables" ON venue_tables;
CREATE POLICY "anon_read_venue_tables" ON venue_tables
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.venue_id = venue_tables.venue_id
        AND e.public_visibility = true
        AND e.status IN ('scheduled', 'open')
    )
  );

DROP POLICY IF EXISTS "anon_read_event_tables" ON event_tables;
CREATE POLICY "anon_read_event_tables" ON event_tables
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tables.event_id
        AND e.public_visibility = true
        AND e.status IN ('scheduled', 'open')
    )
  );

DROP POLICY IF EXISTS "anon_read_venues" ON venues;
CREATE POLICY "anon_read_venues" ON venues
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.venue_id = venues.id
        AND e.public_visibility = true
        AND e.status IN ('scheduled', 'open')
    )
  );

DROP POLICY IF EXISTS "anon_read_organizations" ON organizations;
CREATE POLICY "anon_read_organizations" ON organizations
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- AUTHENTICATED user policies
-- =============================================

DROP POLICY IF EXISTS "auth_read_own_profile" ON profiles;
CREATE POLICY "auth_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "auth_update_own_profile" ON profiles;
CREATE POLICY "auth_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "auth_read_own_organization" ON organizations;
CREATE POLICY "auth_read_own_organization" ON organizations
  FOR SELECT TO authenticated
  USING (is_org_member(id));

DROP POLICY IF EXISTS "auth_read_org_venues" ON venues;
CREATE POLICY "auth_read_org_venues" ON venues
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "auth_manage_org_venues" ON venues;
CREATE POLICY "auth_manage_org_venues" ON venues
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_venue_sectors" ON venue_sectors;
CREATE POLICY "auth_read_org_venue_sectors" ON venue_sectors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_sectors.venue_id
        AND is_org_member(v.organization_id)
    )
  );

DROP POLICY IF EXISTS "auth_read_org_venue_tables" ON venue_tables;
CREATE POLICY "auth_read_org_venue_tables" ON venue_tables
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_tables.venue_id
        AND is_org_member(v.organization_id)
    )
  );

DROP POLICY IF EXISTS "auth_read_org_events" ON events;
CREATE POLICY "auth_read_org_events" ON events
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "auth_manage_org_events" ON events;
CREATE POLICY "auth_manage_org_events" ON events
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_event_tables" ON event_tables;
CREATE POLICY "auth_read_org_event_tables" ON event_tables
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tables.event_id
        AND is_org_member(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "auth_manage_org_event_tables" ON event_tables;
CREATE POLICY "auth_manage_org_event_tables" ON event_tables
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tables.event_id
        AND has_org_role(e.organization_id, ARRAY['owner', 'admin', 'manager']::user_role[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tables.event_id
        AND has_org_role(e.organization_id, ARRAY['owner', 'admin', 'manager']::user_role[])
    )
  );

DROP POLICY IF EXISTS "auth_read_org_customers" ON customers;
CREATE POLICY "auth_read_org_customers" ON customers
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_customers" ON customers;
CREATE POLICY "auth_manage_org_customers" ON customers
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_reservations" ON reservations;
CREATE POLICY "auth_read_org_reservations" ON reservations
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_reservations" ON reservations;
CREATE POLICY "auth_manage_org_reservations" ON reservations
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_waitlist" ON waitlist_entries;
CREATE POLICY "auth_read_org_waitlist" ON waitlist_entries
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_waitlist" ON waitlist_entries;
CREATE POLICY "auth_manage_org_waitlist" ON waitlist_entries
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_alerts" ON operational_alerts;
CREATE POLICY "auth_read_org_alerts" ON operational_alerts
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_alerts" ON operational_alerts;
CREATE POLICY "auth_manage_org_alerts" ON operational_alerts
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_insights" ON ai_insights;
CREATE POLICY "auth_read_org_insights" ON ai_insights
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_insights" ON ai_insights;
CREATE POLICY "auth_manage_org_insights" ON ai_insights
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_inventory_categories" ON inventory_categories;
CREATE POLICY "auth_read_org_inventory_categories" ON inventory_categories
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_inventory_categories" ON inventory_categories;
CREATE POLICY "auth_manage_org_inventory_categories" ON inventory_categories
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_inventory_items" ON inventory_items;
CREATE POLICY "auth_read_org_inventory_items" ON inventory_items
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_inventory_items" ON inventory_items;
CREATE POLICY "auth_manage_org_inventory_items" ON inventory_items
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_forecasts" ON event_inventory_forecasts;
CREATE POLICY "auth_read_org_forecasts" ON event_inventory_forecasts
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_forecasts" ON event_inventory_forecasts;
CREATE POLICY "auth_manage_org_forecasts" ON event_inventory_forecasts
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_staff" ON staff_assignments;
CREATE POLICY "auth_read_org_staff" ON staff_assignments
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager', 'staff']::user_role[]));

DROP POLICY IF EXISTS "auth_manage_org_staff" ON staff_assignments;
CREATE POLICY "auth_manage_org_staff" ON staff_assignments
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_audit_logs" ON audit_logs;
CREATE POLICY "auth_read_org_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner', 'admin']::user_role[]));

DROP POLICY IF EXISTS "auth_read_org_profiles" ON profiles;
CREATE POLICY "auth_read_org_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_org_member(organization_id)
  );

-- <<<<<<<<<< END 00008_rls_policies.sql <<<<<<<<<<

-- >>>>>>>>>> 00009_realtime.sql >>>>>>>>>>
-- =============================================
-- Migration 00009: Realtime Publication (IDEMPOTENT)
-- =============================================

-- Safe: if table is already in publication, the DO block catches the error
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE event_tables;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE waitlist_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE operational_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- <<<<<<<<<< END 00009_realtime.sql <<<<<<<<<<
