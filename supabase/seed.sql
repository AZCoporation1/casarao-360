-- =============================================
-- Seed Data — Central Casarão 360
-- Layout real: 54 mesas, 192 lugares
-- Dados fictícios para desenvolvimento e demo
-- =============================================

-- 1. Organization
INSERT INTO organizations (id, name, slug) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'O Casarão', 'o-casarao')
ON CONFLICT (id) DO NOTHING;

-- 2. Venue (capacidade atualizada para 192)
INSERT INTO venues (id, organization_id, name, description, address, city, state, capacity) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Salão Principal O Casarão',
   'O ambiente mais sofisticado da região para shows e eventos gastronômicos.',
   'Rua Principal, 100 - Centro', 'Cidade', 'SP', 192)
ON CONFLICT (id) DO UPDATE SET capacity = 192;

-- 3. Venue Sectors (8 setores)
INSERT INTO venue_sectors (id, venue_id, name, description, type, color, sort_order) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Palco Principal', 'Área próxima ao palco com visão privilegiada', 'stage', '#F97316', 1),
  ('c3d4e5f6-a7b8-9012-cdef-123456789013', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Salão Principal', 'Ambiente central com fácil acesso', 'main', '#F8E7C9', 2),
  ('c3d4e5f6-a7b8-9012-cdef-123456789014', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área VIP', 'Área premium com atendimento exclusivo', 'vip', '#F59E0B', 3),
  ('c3d4e5f6-a7b8-9012-cdef-123456789015', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bar', 'Próximo ao bar com ambiente descontraído', 'bar', '#3F6B2F', 4),
  ('c3d4e5f6-a7b8-9012-cdef-123456789016', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Entrada', 'Área de recepção e entrada', 'entrance', '#4A2414', 5),
  ('c3d4e5f6-a7b8-9012-cdef-123456789017', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Mesas Familiares', 'Área ideal para famílias e grupos maiores', 'family', '#B32616', 6),
  ('c3d4e5f6-a7b8-9012-cdef-123456789018', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área Externa', 'Pátio externo com ambiente aberto e mesas ao ar livre', 'outdoor', '#3F6B2F', 7),
  ('c3d4e5f6-a7b8-9012-cdef-123456789019', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área Família', 'Setor familiar com ambiente mais tranquilo', 'family_area', '#F8E7C9', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Venue Tables — 54 mesas reais do Casarão
-- ========== Mesas Internas 4 Lugares (I-01 a I-22) ==========
INSERT INTO venue_tables (id, venue_id, sector_id, code, label, capacity, x, y, shape, features) VALUES
  -- Fileira 1 — Próximo ao palco
  ('d4e5f6a7-b8c9-0123-def0-100000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'I-01', 'Mesa I-01', 4, 18, 22, 'round', '{"Próximo ao palco", "Visão privilegiada", "Experiência premium"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'I-02', 'Mesa I-02', 4, 30, 22, 'round', '{"Próximo ao palco", "Visão frontal", "Experiência premium"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'I-03', 'Mesa I-03', 4, 42, 22, 'round', '{"Próximo ao palco", "Visão central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000004', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'I-04', 'Mesa I-04', 4, 54, 22, 'round', '{"Próximo ao palco", "Visão central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000005', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012',
   'I-05', 'Mesa I-05', 4, 66, 22, 'round', '{"Próximo ao palco", "Visão lateral"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000006', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'I-06', 'Mesa I-06', 4, 78, 22, 'round', '{"Área VIP", "Próximo ao palco", "Atendimento exclusivo"}'),
  -- Fileira 2 — Salão central
  ('d4e5f6a7-b8c9-0123-def0-100000000007', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-07', 'Mesa I-07', 4, 18, 36, 'round', '{"Salão principal", "Acesso fácil"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000008', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-08', 'Mesa I-08', 4, 30, 36, 'round', '{"Salão principal", "Ambiente central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000009', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-09', 'Mesa I-09', 4, 42, 36, 'round', '{"Salão principal", "Ambiente central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000010', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-10', 'Mesa I-10', 4, 54, 36, 'round', '{"Salão principal", "Boa circulação"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000011', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'I-11', 'Mesa I-11', 4, 66, 36, 'round', '{"Área VIP", "Atendimento exclusivo"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'I-12', 'Mesa I-12', 4, 78, 36, 'round', '{"Área VIP", "Atendimento exclusivo", "Experiência premium"}'),
  -- Fileira 3 — Salão meio
  ('d4e5f6a7-b8c9-0123-def0-100000000013', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-13', 'Mesa I-13', 4, 22, 50, 'round', '{"Salão principal", "Ambiente agradável"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000014', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-14', 'Mesa I-14', 4, 36, 50, 'round', '{"Salão principal", "Ambiente central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000015', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-15', 'Mesa I-15', 4, 50, 50, 'round', '{"Salão principal", "Posição central"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000016', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-16', 'Mesa I-16', 4, 64, 50, 'round', '{"Salão principal", "Boa visibilidade"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000017', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'I-17', 'Mesa I-17', 4, 78, 50, 'round', '{"Área VIP", "Ambiente reservado"}'),
  -- Fileira 4 — Fundo/Família
  ('d4e5f6a7-b8c9-0123-def0-100000000018', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789019',
   'I-18', 'Mesa I-18', 4, 22, 64, 'round', '{"Ideal para famílias", "Ambiente mais reservado", "Mais tranquilo"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000019', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789019',
   'I-19', 'Mesa I-19', 4, 36, 64, 'round', '{"Ideal para famílias", "Ambiente mais reservado"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000020', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-20', 'Mesa I-20', 4, 50, 64, 'round', '{"Salão principal", "Ambiente confortável"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000021', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-21', 'Mesa I-21', 4, 64, 64, 'round', '{"Salão principal", "Acesso fácil"}'),
  ('d4e5f6a7-b8c9-0123-def0-100000000022', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'I-22', 'Mesa I-22', 4, 78, 64, 'round', '{"Salão principal", "Próximo à circulação"}')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, label = EXCLUDED.label, capacity = EXCLUDED.capacity,
  x = EXCLUDED.x, y = EXCLUDED.y, features = EXCLUDED.features, sector_id = EXCLUDED.sector_id;

-- ========== Mesas Internas 2 Lugares (D-01 a D-12) ==========
INSERT INTO venue_tables (id, venue_id, sector_id, code, label, capacity, x, y, shape, features) VALUES
  ('d4e5f6a7-b8c9-0123-def0-200000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-01', 'Mesa D-01', 2, 8, 28, 'round', '{"Próximo ao bar", "Fácil acesso", "Mesa íntima"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-02', 'Mesa D-02', 2, 8, 40, 'round', '{"Próximo ao bar", "Ambiente descontraído"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-03', 'Mesa D-03', 2, 8, 52, 'round', '{"Próximo ao bar", "Mesa romântica"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000004', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-04', 'Mesa D-04', 2, 8, 64, 'round', '{"Próximo ao bar", "Ambiente reservado"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000005', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-05', 'Mesa D-05', 2, 90, 28, 'round', '{"Área VIP", "Mesa exclusiva", "Atendimento diferenciado"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000006', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-06', 'Mesa D-06', 2, 90, 40, 'round', '{"Área VIP", "Mesa exclusiva"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000007', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-07', 'Mesa D-07', 2, 90, 52, 'round', '{"Área VIP", "Ambiente reservado"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000008', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789019',
   'D-08', 'Mesa D-08', 2, 18, 76, 'round', '{"Mais tranquilo", "Ideal para casais"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000009', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789019',
   'D-09', 'Mesa D-09', 2, 34, 76, 'round', '{"Ambiente mais reservado", "Mais tranquilo"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000010', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'D-10', 'Mesa D-10', 2, 50, 76, 'round', '{"Salão principal", "Mesa compacta"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000011', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'D-11', 'Mesa D-11', 2, 66, 76, 'round', '{"Salão principal", "Fácil acesso"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789013',
   'D-12', 'Mesa D-12', 2, 82, 76, 'round', '{"Salão principal", "Próximo à circulação"}')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, label = EXCLUDED.label, capacity = EXCLUDED.capacity,
  x = EXCLUDED.x, y = EXCLUDED.y, features = EXCLUDED.features, sector_id = EXCLUDED.sector_id;

-- ========== Mesas Externas 4 Lugares (E-01 a E-20) ==========
INSERT INTO venue_tables (id, venue_id, sector_id, code, label, capacity, x, y, shape, features) VALUES
  ('d4e5f6a7-b8c9-0123-def0-300000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-01', 'Mesa E-01', 4, 12, 12, 'round', '{"Área externa", "Ambiente aberto", "Vista privilegiada", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-02', 'Mesa E-02', 4, 31, 12, 'round', '{"Área externa", "Ambiente aberto", "Vista privilegiada", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-03', 'Mesa E-03', 4, 50, 12, 'round', '{"Área externa", "Ambiente aberto", "Vista privilegiada", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000004', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-04', 'Mesa E-04', 4, 69, 12, 'round', '{"Área externa", "Ambiente aberto", "Vista privilegiada", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000005', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-05', 'Mesa E-05', 4, 88, 12, 'round', '{"Área externa", "Ambiente aberto", "Vista privilegiada", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000006', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-06', 'Mesa E-06', 4, 12, 37, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000007', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-07', 'Mesa E-07', 4, 31, 37, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000008', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-08', 'Mesa E-08', 4, 50, 37, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000009', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-09', 'Mesa E-09', 4, 69, 37, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000010', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-10', 'Mesa E-10', 4, 88, 37, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000011', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-11', 'Mesa E-11', 4, 12, 63, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-12', 'Mesa E-12', 4, 31, 63, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000013', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-13', 'Mesa E-13', 4, 50, 63, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000014', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-14', 'Mesa E-14', 4, 69, 63, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000015', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-15', 'Mesa E-15', 4, 88, 63, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000016', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-16', 'Mesa E-16', 4, 12, 88, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000017', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-17', 'Mesa E-17', 4, 31, 88, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000018', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-18', 'Mesa E-18', 4, 50, 88, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000019', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-19', 'Mesa E-19', 4, 69, 88, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}'),
  ('d4e5f6a7-b8c9-0123-def0-300000000020', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789018',
   'E-20', 'Mesa E-20', 4, 88, 88, 'round', '{"Área externa", "Ambiente aberto", "Ideal para grupos", "Experiência descontraída"}')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, label = EXCLUDED.label, capacity = EXCLUDED.capacity,
  x = EXCLUDED.x, y = EXCLUDED.y, features = EXCLUDED.features, sector_id = EXCLUDED.sector_id;

-- 5. Events (11 eventos oficiais de 2026)
INSERT INTO events (id, organization_id, venue_id, title, slug, description, artist_name, event_date, starts_at, ends_at, status, public_visibility, time_is_tbd, capacity_override, priority_booking_opens_on, public_booking_opens_on, agenda_source, metadata) VALUES
  -- Históricos (realizados)
  ('e5f6a7b8-c9d0-1234-ef01-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Roda de Viola', 'roda-de-viola-2026', 'Noite especial de Roda de Viola no Casarão.', 'Roda de Viola', '2026-06-04', '2026-06-04T20:00:00-03:00', NULL, 'completed', true, false, 192, NULL, NULL, 'official_agenda_2026', '{"weekday": "QUI", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Virtude Zero', 'virtude-zero-2026', 'Show especial Virtude Zero no Casarão.', 'Virtude Zero', '2026-06-06', '2026-06-06T20:00:00-03:00', NULL, 'completed', true, false, 192, NULL, NULL, 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'The Beagles', 'the-beagles-2026', 'Show especial The Beagles no Casarão.', 'The Beagles', '2026-06-12', '2026-06-12T20:00:00-03:00', NULL, 'completed', true, false, 192, NULL, NULL, 'official_agenda_2026', '{"weekday": "SEX", "official": true}'),

  -- Futuros (Agendados)
  ('e5f6a7b8-c9d0-1234-ef01-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Brega nas Estrelas', 'brega-nas-estrelas-2026', 'Noite de Brega nas Estrelas no Casarão.', 'Brega nas Estrelas', '2026-07-04', '2026-07-04T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-06-15T00:00:00-03:00', '2026-06-20T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Edu e Nando', 'edu-e-nando-2026', 'Show especial Edu e Nando no Casarão.', 'Edu e Nando', '2026-07-11', '2026-07-11T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-06-25T00:00:00-03:00', '2026-06-30T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Roupa Nova Cover', 'roupa-nova-cover-2026', 'Tributo ao Roupa Nova no Casarão.', 'Roupa Nova Cover', '2026-08-15', '2026-08-15T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-07-30T00:00:00-03:00', '2026-08-04T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Bom Jovi Cover', 'bom-jovi-cover-2026', 'Tributo ao Bon Jovi no Casarão.', 'Bom Jovi Cover', '2026-09-12', '2026-09-12T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-08-27T00:00:00-03:00', '2026-09-01T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Michael Jackson Cover', 'michael-jackson-cover-2026', 'Tributo ao Rei do Pop no Casarão.', 'Michael Jackson Cover', '2026-10-10', '2026-10-10T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-09-20T00:00:00-03:00', '2026-09-25T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Sandro Saga', 'sandro-saga-2026', 'Show especial Sandro Saga no Casarão.', 'Sandro Saga', '2026-11-07', '2026-11-07T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-10-20T00:00:00-03:00', '2026-10-25T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Kaique e Cauã', 'kaique-e-caua-2026', 'Show especial Kaique e Cauã no Casarão.', 'Kaique e Cauã', '2026-11-21', '2026-11-21T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-11-05T00:00:00-03:00', '2026-11-10T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}'),
  ('e5f6a7b8-c9d0-1234-ef01-000000000011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Som Rock', 'som-rock-2026', 'Rock de alto nível no Casarão para fechar o ano.', 'Som Rock', '2026-12-19', '2026-12-19T20:00:00-03:00', NULL, 'scheduled', true, true, 192, '2026-11-30T00:00:00-03:00', '2026-12-05T00:00:00-03:00', 'official_agenda_2026', '{"weekday": "SAB", "official": true}')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, event_date = EXCLUDED.event_date, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
  time_is_tbd = EXCLUDED.time_is_tbd, priority_booking_opens_on = EXCLUDED.priority_booking_opens_on,
  public_booking_opens_on = EXCLUDED.public_booking_opens_on, agenda_source = EXCLUDED.agenda_source, metadata = EXCLUDED.metadata;

-- 6. Event Tables — todas as 54 mesas para cada evento
-- Gera automaticamente para todos os venue_tables x eventos
INSERT INTO event_tables (event_id, venue_table_id, status, features)
SELECT e.id, vt.id, 'free', vt.features
FROM events e
CROSS JOIN venue_tables vt
WHERE e.organization_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND vt.venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND NOT EXISTS (
    SELECT 1 FROM event_tables et WHERE et.event_id = e.id AND et.venue_table_id = vt.id
  );

-- 7. Atualizar status de event_tables do evento 4 (primeiro futuro) para demo realista
UPDATE event_tables SET status = 'occupied' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000001';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000002';
UPDATE event_tables SET status = 'pending' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000004';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000006';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000011';
UPDATE event_tables SET status = 'occupied' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000012';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-200000000005';
UPDATE event_tables SET status = 'blocked' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-200000000006';
UPDATE event_tables SET status = 'occupied' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000015';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000018';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-300000000003';
UPDATE event_tables SET status = 'occupied' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-300000000008';
UPDATE event_tables SET status = 'pending' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-300000000012';
UPDATE event_tables SET status = 'reserved' WHERE event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004' AND venue_table_id = 'd4e5f6a7-b8c9-0123-def0-300000000015';

-- 8. Customers (fictional, CPF hashed)
INSERT INTO customers (id, organization_id, full_name, phone, normalized_phone, cpf_last4, cpf_hash) VALUES
  ('a0b1c2d3-e4f5-6789-0abc-def012345001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'João Silva', '(11) 99999-9999', '11999999999', '7890',
   encode(digest('12345678900', 'sha256'), 'hex')),
  ('a0b1c2d3-e4f5-6789-0abc-def012345002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Maria Oliveira', '(11) 98888-8888', '11988888888', '4321',
   encode(digest('09876543211', 'sha256'), 'hex')),
  ('a0b1c2d3-e4f5-6789-0abc-def012345003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Carlos Souza', '(11) 97777-7777', '11977777777', '5678', NULL),
  ('a0b1c2d3-e4f5-6789-0abc-def012345004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Ana Pereira', '(11) 96666-6666', '11966666666', '9012', NULL),
  ('a0b1c2d3-e4f5-6789-0abc-def012345005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Roberto Lima', '(11) 95555-5555', '11955555555', '3456', NULL)
ON CONFLICT (id) DO NOTHING;

-- 9. Reservations (vinculadas a event_tables reais)
-- NOTA: event_table IDs são gerados automaticamente no passo 6, então usamos subquery
INSERT INTO reservations (id, organization_id, event_id, event_table_id, customer_id, reservation_code, status, party_size, customer_name_snapshot, customer_phone_snapshot)
SELECT 
  'b1c2d3e4-f5a6-7890-1bcd-ef0123456001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'e5f6a7b8-c9d0-1234-ef01-000000000004',
  et.id,
  'a0b1c2d3-e4f5-6789-0abc-def012345001',
  'CAS-A1B2C3D4', 'confirmed', 4,
  'João Silva', '(11) 99999-9999'
FROM event_tables et
WHERE et.event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004'
  AND et.venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000002'
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, organization_id, event_id, event_table_id, customer_id, reservation_code, status, party_size, customer_name_snapshot, customer_phone_snapshot)
SELECT 
  'b1c2d3e4-f5a6-7890-1bcd-ef0123456002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'e5f6a7b8-c9d0-1234-ef01-000000000004',
  et.id,
  'a0b1c2d3-e4f5-6789-0abc-def012345002',
  'CAS-E5F6A7B8', 'pending', 3,
  'Maria Oliveira', '(11) 98888-8888'
FROM event_tables et
WHERE et.event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004'
  AND et.venue_table_id = 'd4e5f6a7-b8c9-0123-def0-100000000004'
ON CONFLICT (id) DO NOTHING;

-- 10. Waitlist Entries
INSERT INTO waitlist_entries (organization_id, event_id, customer_id, party_size, preferred_sector_id, status, priority, notes)
SELECT 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e5f6a7b8-c9d0-1234-ef01-000000000004',
  'a0b1c2d3-e4f5-6789-0abc-def012345003', 4,
  'c3d4e5f6-a7b8-9012-cdef-123456789014', 'waiting', 1,
  'Prefere área VIP se possível'
WHERE NOT EXISTS (
  SELECT 1 FROM waitlist_entries WHERE customer_id = 'a0b1c2d3-e4f5-6789-0abc-def012345003' AND event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004'
);

INSERT INTO waitlist_entries (organization_id, event_id, customer_id, party_size, status, priority)
SELECT 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e5f6a7b8-c9d0-1234-ef01-000000000004',
  'a0b1c2d3-e4f5-6789-0abc-def012345004', 2, 'waiting', 2
WHERE NOT EXISTS (
  SELECT 1 FROM waitlist_entries WHERE customer_id = 'a0b1c2d3-e4f5-6789-0abc-def012345004' AND event_id = 'e5f6a7b8-c9d0-1234-ef01-000000000004'
);

-- 11. Operational Alerts
INSERT INTO operational_alerts (organization_id, event_id, title, description, severity, source, recommendation)
SELECT * FROM (VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Reserva pendente há 20 minutos',
   'Mesa I-04 (Maria Oliveira) com reserva pendente há mais de 20 minutos sem confirmação.',
   'medium'::text, 'reservation_monitor'::text, 'Enviar lembrete via WhatsApp ou ligar para o cliente.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, NULL::uuid,
   'Estoque de cerveja abaixo do mínimo',
   'Cerveja long neck está abaixo do estoque mínimo configurado (50 unidades restantes).',
   'high'::text, 'inventory_monitor'::text, 'Realizar pedido de reposição urgente para o fornecedor.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Alta ocupação prevista',
   'Ocupação prevista para 85% no próximo evento. Prepare equipe extra de garçons e segurança.',
   'medium'::text, 'forecast_engine'::text, 'Escalar 2 garçons extras e 1 segurança adicional.')
) AS v(org_id, event_id, title, description, severity, source, recommendation)
WHERE NOT EXISTS (
  SELECT 1 FROM operational_alerts WHERE title = v.title AND organization_id = v.org_id
);

-- 12. AI Insights
INSERT INTO ai_insights (organization_id, event_id, title, description, impact, source, recommendation)
SELECT * FROM (VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Alta demanda esperada no final de semana',
   'Com base no histórico recente e previsão do tempo, prevemos 20% mais movimento neste fim de semana.',
   'high'::text, 'forecast_engine'::text, 'Reforçar equipe de atendimento e segurança para o evento.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000005'::uuid,
   'Risco de gargalo no bar',
   'O evento "Edu e Nando" possui um perfil de consumo alto. Reforce a equipe do bar.',
   'medium'::text, 'forecast_engine'::text, 'Escalar 2 bartenders adicionais e preparar estoque extra de destilados.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Área externa com alta procura',
   'Nas últimas 48h, 65% das reservas foram para a área externa. Considere reforçar garçons nessa região.',
   'medium'::text, 'analytics_engine'::text, 'Realocar 1 garçom da área interna para a externa.')
) AS v(org_id, event_id, title, description, impact, source, recommendation)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_insights WHERE title = v.title AND organization_id = v.org_id
);

-- 13. Inventory Categories
INSERT INTO inventory_categories (id, organization_id, name) VALUES
  ('ca100000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bebidas'),
  ('ca100000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Insumos'),
  ('ca100000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Embalagens')
ON CONFLICT (id) DO NOTHING;

-- 14. Inventory Items
INSERT INTO inventory_items (id, organization_id, category_id, name, unit, current_quantity, minimum_quantity, is_critical) VALUES
  ('11e00000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca100000-0000-0000-0000-000000000001',
   'Cerveja Long Neck', 'unit', 50, 100, true),
  ('11e00000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca100000-0000-0000-0000-000000000001',
   'Gin Importado', 'l', 8, 5, false),
  ('11e00000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca100000-0000-0000-0000-000000000002',
   'Limão Tahiti', 'kg', 15, 10, false),
  ('11e00000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ca100000-0000-0000-0000-000000000002',
   'Carne para Porções', 'kg', 25, 20, true)
ON CONFLICT (id) DO NOTHING;

-- 15. Staff Assignments
INSERT INTO staff_assignments (organization_id, event_id, staff_name, role, shift_start, shift_end, status)
SELECT * FROM (VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Pedro Lima', 'Garçom', '2026-07-04T19:00:00-03:00'::timestamptz, '2026-07-05T03:00:00-03:00'::timestamptz, 'scheduled'::text),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Fernanda Costa', 'Bartender', '2026-07-04T19:00:00-03:00'::timestamptz, '2026-07-05T03:00:00-03:00'::timestamptz, 'scheduled'::text),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'e5f6a7b8-c9d0-1234-ef01-000000000004'::uuid,
   'Ricardo Santos', 'Segurança', '2026-07-04T18:00:00-03:00'::timestamptz, '2026-07-05T04:00:00-03:00'::timestamptz, 'scheduled'::text)
) AS v(org_id, event_id, staff_name, role, shift_start, shift_end, status)
WHERE NOT EXISTS (
  SELECT 1 FROM staff_assignments WHERE staff_name = v.staff_name AND event_id = v.event_id
);
