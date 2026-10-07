-- =============================================
-- Central Casarão 360 — Seed: Agenda Oficial 2026
-- UPSERT por slug — idempotente e seguro
-- =============================================

-- =============================================
-- PARTE 1: Inserir os 11 eventos oficiais
-- =============================================

INSERT INTO events (title, slug, description, artist_name, event_date, starts_at, status, capacity_override, time_is_tbd, agenda_source, public_visibility)
VALUES
  ('Roda de Viola', 'roda-de-viola-2026', 'Show Roda de Viola no Casarão.', 'Roda de Viola', '2026-06-04', '2026-06-04T21:00:00-03:00', 'completed', 192, true, 'official_agenda_2026', true),
  ('Virtude Zero', 'virtude-zero-2026', 'Show Virtude Zero no Casarão.', 'Virtude Zero', '2026-06-06', '2026-06-06T21:00:00-03:00', 'completed', 192, true, 'official_agenda_2026', true),
  ('The Beagles', 'the-beagles-2026', 'Show The Beagles no Casarão.', 'The Beagles', '2026-06-12', '2026-06-12T21:00:00-03:00', 'completed', 192, true, 'official_agenda_2026', true),
  ('Brega nas Estrelas', 'brega-nas-estrelas-2026', 'Show Brega nas Estrelas no Casarão.', 'Brega nas Estrelas', '2026-07-04', '2026-07-04T21:00:00-03:00', 'completed', 192, true, 'official_agenda_2026', true),
  ('Edu e Nando', 'edu-e-nando-2026', 'Show Edu e Nando no Casarão.', 'Edu e Nando', '2026-07-11', '2026-07-11T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Roupa Nova Cover', 'roupa-nova-cover-2026', 'Show Roupa Nova Cover no Casarão.', 'Roupa Nova Cover', '2026-08-15', '2026-08-15T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Bom Jovi Cover', 'bom-jovi-cover-2026', 'Show Bom Jovi Cover no Casarão.', 'Bom Jovi Cover', '2026-09-12', '2026-09-12T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Michael Jackson Cover', 'michael-jackson-cover-2026', 'Show Michael Jackson Cover no Casarão.', 'Michael Jackson Cover', '2026-10-10', '2026-10-10T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Sandro Saga', 'sandro-saga-2026', 'Show Sandro Saga no Casarão.', 'Sandro Saga', '2026-11-07', '2026-11-07T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Kaique e Cauã', 'kaique-e-caua-2026', 'Show Kaique e Cauã no Casarão.', 'Kaique e Cauã', '2026-11-21', '2026-11-21T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true),
  ('Som Rock', 'som-rock-2026', 'Show Som Rock no Casarão.', 'Som Rock', '2026-12-19', '2026-12-19T21:00:00-03:00', 'scheduled', 192, true, 'official_agenda_2026', true)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  artist_name = EXCLUDED.artist_name,
  event_date = EXCLUDED.event_date,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  capacity_override = EXCLUDED.capacity_override,
  time_is_tbd = EXCLUDED.time_is_tbd,
  agenda_source = EXCLUDED.agenda_source,
  public_visibility = EXCLUDED.public_visibility,
  updated_at = NOW();

-- =============================================
-- PARTE 2: Inserir 54 venue_tables (layout fixo do Casarão)
-- =============================================

-- Mesas internas de 4 lugares (I-01 a I-22)
INSERT INTO venue_tables (table_number, sector, capacity, x_position, y_position, features) VALUES
  ('I-01', 'PalcoPrincipal', 4, 18, 22, ARRAY['Próximo ao palco', 'Visão privilegiada']),
  ('I-02', 'PalcoPrincipal', 4, 30, 22, ARRAY['Próximo ao palco', 'Visão frontal']),
  ('I-03', 'PalcoPrincipal', 4, 42, 22, ARRAY['Próximo ao palco', 'Visão central']),
  ('I-04', 'PalcoPrincipal', 4, 54, 22, ARRAY['Próximo ao palco', 'Visão central']),
  ('I-05', 'PalcoPrincipal', 4, 66, 22, ARRAY['Próximo ao palco', 'Visão lateral']),
  ('I-06', 'VIP', 4, 78, 22, ARRAY['Área VIP', 'Próximo ao palco']),
  ('I-07', 'SalaoPrincipal', 4, 18, 36, ARRAY['Salão principal', 'Acesso fácil']),
  ('I-08', 'SalaoPrincipal', 4, 30, 36, ARRAY['Salão principal', 'Ambiente central']),
  ('I-09', 'SalaoPrincipal', 4, 42, 36, ARRAY['Salão principal', 'Ambiente central']),
  ('I-10', 'SalaoPrincipal', 4, 54, 36, ARRAY['Salão principal', 'Boa circulação']),
  ('I-11', 'VIP', 4, 66, 36, ARRAY['Área VIP', 'Atendimento exclusivo']),
  ('I-12', 'VIP', 4, 78, 36, ARRAY['Área VIP', 'Experiência premium']),
  ('I-13', 'SalaoPrincipal', 4, 22, 50, ARRAY['Salão principal', 'Ambiente agradável']),
  ('I-14', 'SalaoPrincipal', 4, 36, 50, ARRAY['Salão principal', 'Ambiente central']),
  ('I-15', 'SalaoPrincipal', 4, 50, 50, ARRAY['Salão principal', 'Posição central']),
  ('I-16', 'SalaoPrincipal', 4, 64, 50, ARRAY['Salão principal', 'Boa visibilidade']),
  ('I-17', 'VIP', 4, 78, 50, ARRAY['Área VIP', 'Ambiente reservado']),
  ('I-18', 'AreaFamilia', 4, 22, 64, ARRAY['Ideal para famílias', 'Mais tranquilo']),
  ('I-19', 'AreaFamilia', 4, 36, 64, ARRAY['Ideal para famílias', 'Ambiente reservado']),
  ('I-20', 'SalaoPrincipal', 4, 50, 64, ARRAY['Salão principal', 'Confortável']),
  ('I-21', 'SalaoPrincipal', 4, 64, 64, ARRAY['Salão principal', 'Acesso fácil']),
  ('I-22', 'SalaoPrincipal', 4, 78, 64, ARRAY['Salão principal', 'Boa circulação'])
ON CONFLICT (table_number) DO NOTHING;

-- Mesas internas de 2 lugares (D-01 a D-12)
INSERT INTO venue_tables (table_number, sector, capacity, x_position, y_position, features) VALUES
  ('D-01', 'AreaBar', 2, 8, 28, ARRAY['Próximo ao bar', 'Mesa íntima']),
  ('D-02', 'AreaBar', 2, 8, 40, ARRAY['Próximo ao bar', 'Descontraído']),
  ('D-03', 'AreaBar', 2, 8, 52, ARRAY['Próximo ao bar', 'Mesa romântica']),
  ('D-04', 'AreaBar', 2, 8, 64, ARRAY['Próximo ao bar', 'Reservado']),
  ('D-05', 'VIP', 2, 90, 28, ARRAY['Área VIP', 'Mesa exclusiva']),
  ('D-06', 'VIP', 2, 90, 40, ARRAY['Área VIP', 'Mesa exclusiva']),
  ('D-07', 'VIP', 2, 90, 52, ARRAY['Área VIP', 'Ambiente reservado']),
  ('D-08', 'AreaFamilia', 2, 18, 76, ARRAY['Mais tranquilo', 'Ideal para casais']),
  ('D-09', 'AreaFamilia', 2, 34, 76, ARRAY['Ambiente reservado', 'Mais tranquilo']),
  ('D-10', 'SalaoPrincipal', 2, 50, 76, ARRAY['Salão principal', 'Mesa compacta']),
  ('D-11', 'SalaoPrincipal', 2, 66, 76, ARRAY['Salão principal', 'Fácil acesso']),
  ('D-12', 'SalaoPrincipal', 2, 82, 76, ARRAY['Salão principal', 'Boa circulação'])
ON CONFLICT (table_number) DO NOTHING;

-- Mesas externas de 4 lugares (E-01 a E-20)
INSERT INTO venue_tables (table_number, sector, capacity, x_position, y_position, features) VALUES
  ('E-01', 'Externo', 4, 12, 12, ARRAY['Área externa', 'Vista privilegiada']),
  ('E-02', 'Externo', 4, 31, 12, ARRAY['Área externa', 'Vista privilegiada']),
  ('E-03', 'Externo', 4, 50, 12, ARRAY['Área externa', 'Vista privilegiada']),
  ('E-04', 'Externo', 4, 69, 12, ARRAY['Área externa', 'Vista privilegiada']),
  ('E-05', 'Externo', 4, 88, 12, ARRAY['Área externa', 'Vista privilegiada']),
  ('E-06', 'Externo', 4, 12, 37, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-07', 'Externo', 4, 31, 37, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-08', 'Externo', 4, 50, 37, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-09', 'Externo', 4, 69, 37, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-10', 'Externo', 4, 88, 37, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-11', 'Externo', 4, 12, 63, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-12', 'Externo', 4, 31, 63, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-13', 'Externo', 4, 50, 63, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-14', 'Externo', 4, 69, 63, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-15', 'Externo', 4, 88, 63, ARRAY['Área externa', 'Ideal para grupos']),
  ('E-16', 'Externo', 4, 12, 88, ARRAY['Área externa', 'Descontraída']),
  ('E-17', 'Externo', 4, 31, 88, ARRAY['Área externa', 'Descontraída']),
  ('E-18', 'Externo', 4, 50, 88, ARRAY['Área externa', 'Descontraída']),
  ('E-19', 'Externo', 4, 69, 88, ARRAY['Área externa', 'Descontraída']),
  ('E-20', 'Externo', 4, 88, 88, ARRAY['Área externa', 'Descontraída'])
ON CONFLICT (table_number) DO NOTHING;

-- =============================================
-- PARTE 3: Criar event_tables para cada evento oficial
-- =============================================
-- Associa cada venue_table a cada evento (54 event_tables por evento)

INSERT INTO event_tables (event_id, venue_table_id, table_number, sector, capacity, status, x_position, y_position, features)
SELECT
  e.id,
  vt.id,
  vt.table_number,
  vt.sector,
  vt.capacity,
  CASE WHEN e.status = 'completed' THEN 'free' ELSE 'free' END,
  vt.x_position,
  vt.y_position,
  vt.features
FROM events e
CROSS JOIN venue_tables vt
WHERE e.agenda_source = 'official_agenda_2026'
ON CONFLICT (event_id, venue_table_id) DO NOTHING;

-- =============================================
-- VALIDAÇÕES (executar manualmente)
-- =============================================
-- SELECT count(*) FROM events WHERE agenda_source = 'official_agenda_2026';  -- deve ser 11
-- SELECT count(*) FROM venue_tables;  -- deve ser 54
-- SELECT count(*) FROM event_tables WHERE event_id IN (SELECT id FROM events WHERE agenda_source = 'official_agenda_2026');  -- deve ser 594 (11 * 54)
-- SELECT sum(capacity) FROM venue_tables;  -- deve ser 192
