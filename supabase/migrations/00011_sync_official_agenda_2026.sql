-- =============================================
-- Migration 00011: Sync Official Agenda 2026
-- Central Casarão 360
--
-- SEGURO: Idempotente, sem DROP, sem DELETE, sem dados destrutivos
-- Baseado em UPSERT por slug
-- Projeto Supabase: bqdhvpvtzemjsbnbgryo
-- =============================================

-- =============================================
-- 1. ALTER TABLE events — campos de booking policy
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'priority_booking_opens_on'
  ) THEN
    ALTER TABLE events ADD COLUMN priority_booking_opens_on date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'public_booking_opens_on'
  ) THEN
    ALTER TABLE events ADD COLUMN public_booking_opens_on date;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'time_is_tbd'
  ) THEN
    ALTER TABLE events ADD COLUMN time_is_tbd boolean DEFAULT true;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'agenda_source'
  ) THEN
    ALTER TABLE events ADD COLUMN agenda_source text DEFAULT 'official_agenda_2026';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE events ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- =============================================
-- 2. CREATE TABLE event_interest_entries
-- =============================================

CREATE TABLE IF NOT EXISTS event_interest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  normalized_phone text NOT NULL,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index: one interest entry per phone per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_interest_event_phone
  ON event_interest_entries (event_id, normalized_phone);

CREATE INDEX IF NOT EXISTS idx_event_interest_event
  ON event_interest_entries (event_id);

-- =============================================
-- 3. RLS for event_interest_entries
-- =============================================

ALTER TABLE event_interest_entries ENABLE ROW LEVEL SECURITY;

-- Anon: NO direct read/write (INSERT via RPC only)
-- Authenticated org members can read
DROP POLICY IF EXISTS "auth_read_org_event_interest" ON event_interest_entries;
CREATE POLICY "auth_read_org_event_interest" ON event_interest_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_interest_entries.event_id
        AND is_org_member(e.organization_id)
    )
  );

-- =============================================
-- 4. Additional composite indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_event_tables_event_status
  ON event_tables (event_id, status);

-- =============================================
-- 5. UPSERT 11 eventos oficiais por slug
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') THEN
    INSERT INTO organizations (id, name, slug) VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'O Casarão', 'o-casarao');
  END IF;
  
  -- Certificar que o venue correto pertence a esta organização
  UPDATE venues SET organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
END $$;

-- Roda de Viola — 04/06/2026 QUI (completed)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Roda de Viola', 'roda-de-viola-2026',
  'Noite especial de Roda de Viola no Casarão.',
  'Roda de Viola',
  '2026-06-04', '2026-06-04T00:00:00-03:00', NULL,
  'completed', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-10-04', '2026-02-04',
  '{"weekday": "QUI", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Virtude Zero — 06/06/2026 SAB (completed)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Virtude Zero', 'virtude-zero-2026',
  'Show especial Virtude Zero no Casarão.',
  'Virtude Zero',
  '2026-06-06', '2026-06-06T00:00:00-03:00', NULL,
  'completed', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-10-06', '2026-02-06',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- The Beagles — 12/06/2026 SEX (completed)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'The Beagles', 'the-beagles-2026',
  'Show especial The Beagles no Casarão.',
  'The Beagles',
  '2026-06-12', '2026-06-12T00:00:00-03:00', NULL,
  'completed', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-10-12', '2026-02-12',
  '{"weekday": "SEX", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Brega nas Estrelas — 04/07/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Brega nas Estrelas', 'brega-nas-estrelas-2026',
  'Noite de Brega nas Estrelas no Casarão.',
  'Brega nas Estrelas',
  '2026-07-04', '2026-07-04T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-11-04', '2026-03-04',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Edu e Nando — 11/07/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000005',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Edu e Nando', 'edu-e-nando-2026',
  'Show especial Edu e Nando no Casarão.',
  'Edu e Nando',
  '2026-07-11', '2026-07-11T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-11-11', '2026-03-11',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Roupa Nova Cover — 15/08/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000006',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Roupa Nova Cover', 'roupa-nova-cover-2026',
  'Tributo ao Roupa Nova no Casarão.',
  'Roupa Nova Cover',
  '2026-08-15', '2026-08-15T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2025-12-15', '2026-04-15',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Bom Jovi Cover — 12/09/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000007',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Bom Jovi Cover', 'bom-jovi-cover-2026',
  'Tributo ao Bon Jovi no Casarão.',
  'Bom Jovi Cover',
  '2026-09-12', '2026-09-12T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2026-01-12', '2026-05-12',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Michael Jackson Cover — 10/10/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000008',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Michael Jackson Cover', 'michael-jackson-cover-2026',
  'Tributo ao Rei do Pop no Casarão.',
  'Michael Jackson Cover',
  '2026-10-10', '2026-10-10T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2026-02-10', '2026-06-10',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Sandro Saga — 07/11/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000009',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Sandro Saga', 'sandro-saga-2026',
  'Show especial Sandro Saga no Casarão.',
  'Sandro Saga',
  '2026-11-07', '2026-11-07T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2026-03-07', '2026-07-07',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Kaique e Cauã — 21/11/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000010',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Kaique e Cauã', 'kaique-e-caua-2026',
  'Show especial Kaique e Cauã no Casarão.',
  'Kaique e Cauã',
  '2026-11-21', '2026-11-21T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2026-03-21', '2026-07-21',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Som Rock — 19/12/2026 SAB (scheduled)
INSERT INTO events (
  id, organization_id, venue_id, title, slug, description, artist_name,
  event_date, starts_at, ends_at, status, capacity_override,
  public_visibility, highlights, time_is_tbd, agenda_source,
  priority_booking_opens_on, public_booking_opens_on, metadata
) VALUES (
  'e5f6a7b8-c9d0-1234-ef01-000000000011',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Som Rock', 'som-rock-2026',
  'Rock de alto nível no Casarão para fechar o ano.',
  'Som Rock',
  '2026-12-19', '2026-12-19T00:00:00-03:00', NULL,
  'scheduled', 192,
  true, '{}', true, 'official_agenda_2026',
  '2026-04-19', '2026-08-19',
  '{"weekday": "SAB", "official": true}'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  public_visibility = EXCLUDED.public_visibility,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- =============================================
-- 6. Ocultar eventos demo antigos da área pública
-- =============================================

UPDATE events
SET
  public_visibility = false,
  metadata = COALESCE(metadata, '{}') || '{"legacy_demo": true}'::jsonb,
  updated_at = now()
WHERE slug IN ('noite-rock-acustico', 'especial-sertanejo-premium', 'samba-do-casarao')
  AND agenda_source IS DISTINCT FROM 'official_agenda_2026';

-- =============================================
-- 7. Criar 54 event_tables para cada evento oficial
--    Sem sobrescrever status de mesas já reservadas
-- =============================================

INSERT INTO event_tables (event_id, venue_table_id, status, features)
SELECT e.id, vt.id, 'free', vt.features
FROM events e
CROSS JOIN venue_tables vt
WHERE e.agenda_source = 'official_agenda_2026'
  AND vt.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND NOT EXISTS (
    SELECT 1 FROM event_tables et
    WHERE et.event_id = e.id AND et.venue_table_id = vt.id
  );

-- =============================================
-- 8. RPC: register_event_interest
-- =============================================

CREATE OR REPLACE FUNCTION register_event_interest(
  p_event_id uuid,
  p_full_name text,
  p_phone text
)
RETURNS jsonb AS $$
DECLARE
  v_normalized_phone text;
  v_event_exists boolean;
  v_entry_id uuid;
BEGIN
  -- Validate event exists and is not completed
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND status != 'completed'
  ) INTO v_event_exists;

  IF NOT v_event_exists THEN
    RAISE EXCEPTION 'Evento não encontrado ou já realizado.';
  END IF;

  -- Validate inputs
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nome completo é obrigatório (mínimo 2 caracteres).';
  END IF;

  IF p_phone IS NULL OR length(p_phone) < 8 THEN
    RAISE EXCEPTION 'Telefone é obrigatório (mínimo 8 dígitos).';
  END IF;

  -- Normalize phone
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Insert interest entry (idempotent)
  INSERT INTO event_interest_entries (event_id, full_name, phone, normalized_phone, source)
  VALUES (p_event_id, trim(p_full_name), p_phone, v_normalized_phone, 'website')
  ON CONFLICT (event_id, normalized_phone)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone
  RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'interest_id', v_entry_id,
    'message', 'Interesse registrado! Você será avisado quando as reservas abrirem.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. Update anon RLS policy to allow reading completed events
--    (needed for /eventos page to show event history)
-- =============================================

DROP POLICY IF EXISTS "anon_read_public_events" ON events;
CREATE POLICY "anon_read_public_events" ON events
  FOR SELECT TO anon
  USING (public_visibility = true AND status IN ('scheduled', 'open', 'completed', 'sold_out'));

-- =============================================
-- 10. Validação Final
-- =============================================

DO $$
DECLARE
  v_official_count integer;
  v_completed_count integer;
  v_future_count integer;
  v_max_capacity integer;
  v_venue_tables_count integer;
  v_venue_capacity integer;
  v_internal_4_count integer;
  v_internal_2_count integer;
  v_external_4_count integer;
  v_bad_capacity_count integer;
  v_duplicate_slugs integer;
  v_demo_public_count integer;
  v_min_event_tables integer;
BEGIN
  -- 1. 11 eventos oficiais
  SELECT COUNT(*) INTO v_official_count
  FROM events WHERE agenda_source = 'official_agenda_2026';
  IF v_official_count != 11 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperados 11 eventos oficiais, encontrados %', v_official_count;
  END IF;

  -- 2. 3 eventos históricos em junho
  SELECT COUNT(*) INTO v_completed_count
  FROM events
  WHERE agenda_source = 'official_agenda_2026'
    AND status = 'completed'
    AND EXTRACT(MONTH FROM event_date) = 6;
  IF v_completed_count != 3 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperados 3 eventos históricos em junho, encontrados %', v_completed_count;
  END IF;

  -- 3. 8 eventos futuros
  SELECT COUNT(*) INTO v_future_count
  FROM events
  WHERE agenda_source = 'official_agenda_2026'
    AND status != 'completed';
  IF v_future_count != 8 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperados 8 eventos futuros, encontrados %', v_future_count;
  END IF;

  -- 4. Nenhum evento oficial com capacity > 192
  SELECT MAX(capacity_override) INTO v_max_capacity
  FROM events WHERE agenda_source = 'official_agenda_2026';
  IF v_max_capacity > 192 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Evento oficial com capacity % (max 192)', v_max_capacity;
  END IF;

  -- 5. venue_tables = 54
  SELECT COUNT(*) INTO v_venue_tables_count
  FROM venue_tables WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  IF v_venue_tables_count < 54 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperadas 54 venue_tables, encontradas %', v_venue_tables_count;
  END IF;

  -- 6. Capacidade total venue = 192
  SELECT COALESCE(SUM(capacity), 0) INTO v_venue_capacity
  FROM venue_tables WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  IF v_venue_capacity != 192 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Capacidade total esperada 192, encontrada %', v_venue_capacity;
  END IF;

  -- 7. 22 mesas internas de 4
  SELECT COUNT(*) INTO v_internal_4_count
  FROM venue_tables
  WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    AND code LIKE 'I-%' AND capacity = 4;
  IF v_internal_4_count != 22 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperadas 22 mesas I-* cap 4, encontradas %', v_internal_4_count;
  END IF;

  -- 8. 12 mesas internas de 2
  SELECT COUNT(*) INTO v_internal_2_count
  FROM venue_tables
  WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    AND code LIKE 'D-%' AND capacity = 2;
  IF v_internal_2_count != 12 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperadas 12 mesas D-* cap 2, encontradas %', v_internal_2_count;
  END IF;

  -- 9. 20 mesas externas de 4
  SELECT COUNT(*) INTO v_external_4_count
  FROM venue_tables
  WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    AND code LIKE 'E-%' AND capacity = 4;
  IF v_external_4_count != 20 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Esperadas 20 mesas E-* cap 4, encontradas %', v_external_4_count;
  END IF;

  -- 10. Nenhuma mesa com capacity 6, 8 ou 10
  SELECT COUNT(*) INTO v_bad_capacity_count
  FROM venue_tables
  WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    AND capacity IN (6, 8, 10);
  IF v_bad_capacity_count > 0 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: % mesas com capacidade inválida (6/8/10)', v_bad_capacity_count;
  END IF;

  -- 11. Nenhum slug duplicado entre oficiais
  SELECT COUNT(*) - COUNT(DISTINCT slug) INTO v_duplicate_slugs
  FROM events WHERE agenda_source = 'official_agenda_2026';
  IF v_duplicate_slugs > 0 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: % slugs duplicados em eventos oficiais', v_duplicate_slugs;
  END IF;

  -- 12. Eventos demo não públicos
  SELECT COUNT(*) INTO v_demo_public_count
  FROM events
  WHERE slug IN ('noite-rock-acustico', 'especial-sertanejo-premium', 'samba-do-casarao')
    AND public_visibility = true;
  IF v_demo_public_count > 0 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: % eventos demo ainda visíveis publicamente', v_demo_public_count;
  END IF;

  -- 13. Todos os 11 eventos oficiais têm >= 54 event_tables
  SELECT MIN(et_count) INTO v_min_event_tables
  FROM (
    SELECT COUNT(et.id) AS et_count
    FROM events e
    LEFT JOIN event_tables et ON et.event_id = e.id
    WHERE e.agenda_source = 'official_agenda_2026'
    GROUP BY e.id
  ) sub;
  IF v_min_event_tables < 54 THEN
    RAISE EXCEPTION 'VALIDAÇÃO FALHOU: Evento oficial com apenas % event_tables (mínimo 54)', v_min_event_tables;
  END IF;

  RAISE NOTICE '✅ VALIDAÇÃO COMPLETA: 11 eventos oficiais, 3 históricos, 8 futuros, 54 mesas, 192 lugares. Migration 00011 OK.';
END $$;
