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
