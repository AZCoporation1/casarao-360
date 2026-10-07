-- =============================================
-- Migration 00012: Release Agenda Consistency
-- Central Casarão 360
-- =============================================

-- 1. Ocultar todos os eventos "fakes" e legados (adicionados equivocadamente em sessões passadas)
UPDATE events
SET
  public_visibility = false,
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"legacy_demo": true}'::jsonb,
  updated_at = now()
WHERE slug IN (
  'arraia-do-casarao-2026',
  'festival-inverno-2026',
  'sertanejo-universitario-04-07',
  'especial-de-rock-brasil-11-07',
  'pagode-de-mesa-18-07',
  'tributo-a-tim-maia-25-07',
  'forro-de-inverno-01-08',
  'baile-do-casarao-08-08',
  'roda-de-samba-raiz-15-08',
  'especial-anos-80-22-08',
  'acustico-mpb-29-08',
  'noite-latina-05-09',
  'flashback-90s-12-09'
);

-- 2. Garantir que os 11 eventos oficiais exatos da migração 00011 estejam com public_visibility = true
UPDATE events
SET public_visibility = true,
    metadata = metadata - 'legacy_demo',
    updated_at = now()
WHERE slug IN (
  'roda-de-viola-2026',
  'virtude-zero-2026',
  'the-beagles-2026',
  'brega-nas-estrelas-2026',
  'edu-e-nando-2026',
  'roupa-nova-cover-2026',
  'bom-jovi-cover-2026',
  'michael-jackson-cover-2026',
  'sandro-saga-2026',
  'kaique-e-caua-2026',
  'som-rock-2026'
);

-- 3. Gerar missing event_tables para a agenda oficial (se faltar algum)
INSERT INTO event_tables (event_id, venue_table_id, status, features)
SELECT e.id, vt.id, 'free', vt.features
FROM events e
CROSS JOIN venue_tables vt
WHERE e.slug IN (
  'roda-de-viola-2026', 'virtude-zero-2026', 'the-beagles-2026',
  'brega-nas-estrelas-2026', 'edu-e-nando-2026', 'roupa-nova-cover-2026',
  'bom-jovi-cover-2026', 'michael-jackson-cover-2026', 'sandro-saga-2026',
  'kaique-e-caua-2026', 'som-rock-2026'
)
  AND vt.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND NOT EXISTS (
    SELECT 1 FROM event_tables et
    WHERE et.event_id = e.id AND et.venue_table_id = vt.id
  );
