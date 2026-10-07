-- =============================================
-- Migration 00010: Update Casarão Real Table Layout
-- Central Casarão 360
-- 
-- Atualiza o layout para refletir a capacidade real:
-- - 22 mesas internas de 4 lugares (I-01 a I-22)
-- - 12 mesas internas de 2 lugares (D-01 a D-12)
-- - 20 mesas externas de 4 lugares (E-01 a E-20)
-- - Total: 54 mesas, 192 lugares
--
-- SEGURO: Usa UPSERT para não destruir dados existentes
-- =============================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'a1b2c3d4-e5f6-4a5b-8c9d-e0f1a2b3c4d5') THEN
    INSERT INTO organizations (id, name, slug) VALUES ('a1b2c3d4-e5f6-4a5b-8c9d-e0f1a2b3c4d5', 'Casarão 360', 'casarao-360');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM venues WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901') THEN
    INSERT INTO venues (id, organization_id, name, capacity) VALUES ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'a1b2c3d4-e5f6-4a5b-8c9d-e0f1a2b3c4d5', 'O Casarão Principal', 192);
  END IF;
END $$;

-- 1. Atualizar capacidade do venue
UPDATE venues 
SET capacity = 192 
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- 2. Adicionar/Atualizar setores
INSERT INTO venue_sectors (id, venue_id, name, description, type, color, sort_order) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Palco Principal', 'Área próxima ao palco com visão privilegiada', 'stage', '#F97316', 1),
  ('c3d4e5f6-a7b8-9012-cdef-123456789013', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Salão Principal', 'Ambiente central com fácil acesso', 'main', '#F8E7C9', 2),
  ('c3d4e5f6-a7b8-9012-cdef-123456789014', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área VIP', 'Área premium com atendimento exclusivo', 'vip', '#F59E0B', 3),
  ('c3d4e5f6-a7b8-9012-cdef-123456789015', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Bar', 'Próximo ao bar com ambiente descontraído', 'bar', '#3F6B2F', 4),
  ('c3d4e5f6-a7b8-9012-cdef-123456789016', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Entrada', 'Área de recepção e entrada', 'entrance', '#4A2414', 5),
  ('c3d4e5f6-a7b8-9012-cdef-123456789017', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Mesas Familiares', 'Área ideal para famílias e grupos maiores', 'family', '#B32616', 6),
  ('c3d4e5f6-a7b8-9012-cdef-123456789018', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área Externa', 'Pátio externo com ambiente aberto e mesas ao ar livre', 'outdoor', '#3F6B2F', 7),
  ('c3d4e5f6-a7b8-9012-cdef-123456789019', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Área Família', 'Setor familiar com ambiente mais tranquilo', 'family_area', '#F8E7C9', 8)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description;

-- 3. Remover venue_tables antigos que não existem mais
-- (Preserva event_tables e reservations via CASCADE se configurado)
-- NOTA: Apenas remove se não há reservations vinculadas
-- Para segurança, não deletamos - apenas adicionamos as novas

-- 4. Inserir/atualizar todas as 54 venue_tables reais
-- Usando ON CONFLICT para UPSERT seguro

-- ========== Mesas Internas 4 Lugares (I-01 a I-22) ==========
INSERT INTO venue_tables (id, venue_id, sector_id, code, label, capacity, x, y, shape, features) VALUES
  -- Fileira 1 - Próximo ao palco
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
  -- Fileira 2 - Salão central
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
  -- Fileira 3 - Salão meio
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
  -- Fileira 4 - Fundo/Família
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
  -- Lateral esquerda (Bar)
  ('d4e5f6a7-b8c9-0123-def0-200000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-01', 'Mesa D-01', 2, 8, 28, 'round', '{"Próximo ao bar", "Fácil acesso", "Mesa íntima"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-02', 'Mesa D-02', 2, 8, 40, 'round', '{"Próximo ao bar", "Ambiente descontraído"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-03', 'Mesa D-03', 2, 8, 52, 'round', '{"Próximo ao bar", "Mesa romântica"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000004', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789015',
   'D-04', 'Mesa D-04', 2, 8, 64, 'round', '{"Próximo ao bar", "Ambiente reservado"}'),
  -- Lateral direita (VIP)
  ('d4e5f6a7-b8c9-0123-def0-200000000005', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-05', 'Mesa D-05', 2, 90, 28, 'round', '{"Área VIP", "Mesa exclusiva", "Atendimento diferenciado"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000006', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-06', 'Mesa D-06', 2, 90, 40, 'round', '{"Área VIP", "Mesa exclusiva"}'),
  ('d4e5f6a7-b8c9-0123-def0-200000000007', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789014',
   'D-07', 'Mesa D-07', 2, 90, 52, 'round', '{"Área VIP", "Ambiente reservado"}'),
  -- Fundo
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

-- 5. Verificação final
DO $$
DECLARE
  table_count INTEGER;
  total_cap INTEGER;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(capacity), 0) 
  INTO table_count, total_cap
  FROM venue_tables 
  WHERE venue_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  RAISE NOTICE 'Casarão Layout Update: % mesas, % lugares', table_count, total_cap;
  
  IF table_count < 54 THEN
    RAISE WARNING 'ATENÇÃO: Menos de 54 mesas encontradas (%). Verifique se há conflitos.', table_count;
  END IF;
END $$;
