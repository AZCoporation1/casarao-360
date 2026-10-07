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
