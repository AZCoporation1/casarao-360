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
