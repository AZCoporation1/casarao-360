-- =============================================
-- Central Casarão 360 — Migration: Agenda Oficial 2026
-- Incremental, safe, non-destructive
-- =============================================
-- REGRAS:
--   NÃO usar DROP TABLE, DROP SCHEMA, DROP CASCADE
--   NÃO deletar dados existentes
--   UPSERT por slug para idempotência
--   Preservar reservas e clientes existentes
-- =============================================

-- 1. Garantir que a tabela events existe com as colunas necessárias
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  artist_name TEXT,
  event_date DATE NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  cover_image_url TEXT,
  capacity_override INT DEFAULT 192,
  highlights TEXT[] DEFAULT '{}',
  time_is_tbd BOOLEAN DEFAULT true,
  priority_booking_opens_on DATE,
  public_booking_opens_on DATE,
  agenda_source TEXT DEFAULT 'official_agenda_2026',
  public_visibility BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantir que a tabela venue_tables existe
CREATE TABLE IF NOT EXISTS venue_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT UNIQUE NOT NULL,
  sector TEXT NOT NULL,
  capacity INT NOT NULL CHECK (capacity IN (2, 4)),
  x_position NUMERIC,
  y_position NUMERIC,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Garantir que a tabela event_tables existe
CREATE TABLE IF NOT EXISTS event_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_table_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  sector TEXT NOT NULL,
  capacity INT NOT NULL CHECK (capacity IN (2, 4)),
  status TEXT NOT NULL DEFAULT 'free',
  x_position NUMERIC,
  y_position NUMERIC,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, venue_table_id)
);

-- 4. Garantir que a tabela reservations existe
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_table_id UUID NOT NULL REFERENCES event_tables(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  party_size INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reservation_code TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Garantir que a tabela event_interest existe (para "Quero ser avisado")
CREATE TABLE IF NOT EXISTS event_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Garantir que a tabela waitlist existe
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  party_size INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS Policies — Leitura anon para dados públicos
-- =============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Events: anon lê apenas públicos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_public_events') THEN
    CREATE POLICY anon_read_public_events ON events
      FOR SELECT TO anon
      USING (public_visibility = true);
  END IF;
END $$;

-- Event Tables: anon lê event_tables de eventos públicos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_event_tables') THEN
    CREATE POLICY anon_read_event_tables ON event_tables
      FOR SELECT TO anon
      USING (
        event_id IN (SELECT id FROM events WHERE public_visibility = true)
      );
  END IF;
END $$;

-- Venue Tables: anon pode ler (dados de layout, sem dados sensíveis)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_venue_tables') THEN
    CREATE POLICY anon_read_venue_tables ON venue_tables
      FOR SELECT TO anon
      USING (true);
  END IF;
END $$;

-- Reservations: anon pode INSERT (criar solicitação), mas NÃO ler
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_create_reservation') THEN
    CREATE POLICY anon_create_reservation ON reservations
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Event Interest: anon pode INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_create_interest') THEN
    CREATE POLICY anon_create_interest ON event_interest
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Waitlist: anon pode INSERT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_create_waitlist') THEN
    CREATE POLICY anon_create_waitlist ON waitlist
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated (admin) pode ler/escrever tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_full_events') THEN
    CREATE POLICY auth_full_events ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_full_event_tables') THEN
    CREATE POLICY auth_full_event_tables ON event_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_full_reservations') THEN
    CREATE POLICY auth_full_reservations ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_full_interest') THEN
    CREATE POLICY auth_full_interest ON event_interest FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_full_waitlist') THEN
    CREATE POLICY auth_full_waitlist ON waitlist FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
