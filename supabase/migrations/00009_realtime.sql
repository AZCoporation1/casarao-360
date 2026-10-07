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
