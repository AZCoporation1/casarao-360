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
