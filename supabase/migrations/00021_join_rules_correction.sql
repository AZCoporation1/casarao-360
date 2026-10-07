-- =============================================
-- Migration 00021: Correção de negócio das table_join_rules
-- Central Casarão 360 — 2026-09-01
-- =============================================
-- CONTEXTO: os 96 seeds do Gate 1 Final marcaram TODOS os pares como
-- allowed=true, violando duas regras explícitas do handoff:
--   §34 — mesas 01 e 02 (frente do palco) NÃO podem ser unidas → I-01+I-02;
--   §30 — combinações automáticas usando mesas D-XX (capacidade 2)
--         ficam NEGADAS até aprovação explícita → todos os pares mistos I×D.
--
-- DECISÃO (usuário, 2026-09-01): manter os demais seeds permitidos e
-- bloquear apenas os proibidos, até validação da lista completa pelo Davi.
--
-- ESTRATÉGIA: FLIP (allowed=false + reason), não DELETE — deny-by-default
-- trata linha false e linha ausente da mesma forma, mas a linha com reason
-- documenta a intenção e torna a decisão do proprietário reversível com um
-- único UPDATE.
--
-- Pares mistos I×D no estado capturado (19): I-06+D-05, I-06+D-06, I-11+D-06,
-- I-12+D-05, I-12+D-06, I-12+D-07, I-17+D-06, I-17+D-07, I-18+D-08, I-18+D-09,
-- I-19+D-08, I-19+D-09, I-20+D-10, I-20+D-11, I-21+D-10, I-21+D-11, I-21+D-12,
-- I-22+D-11, I-22+D-12. Total esperado de flips: 19 + 1 (I-01+I-02) = 20.
-- =============================================

-- 1. Bloquear I-01+I-02 (handoff §34)
UPDATE public.table_join_rules t
SET allowed = false,
    reason = 'Proibido pelo handoff do produto (mesas 01 e 02 em frente ao palco não podem ser unidas)',
    updated_at = now()
FROM public.venue_tables a, public.venue_tables b
WHERE t.table_a_id = LEAST(a.id, b.id)
  AND t.table_b_id = GREATEST(a.id, b.id)
  AND t.map_version = 'LEGACY_OPERATIONAL_V1'
  AND a.code = 'I-01' AND b.code = 'I-02';

-- 2. Bloquear todos os pares mistos I×D (handoff §30)
UPDATE public.table_join_rules t
SET allowed = false,
    reason = 'Par misto I×D (mesa de 2 lugares) — negado até aprovação explícita do proprietário',
    updated_at = now()
FROM public.venue_tables a, public.venue_tables b
WHERE t.table_a_id = a.id
  AND t.table_b_id = b.id
  AND t.map_version = 'LEGACY_OPERATIONAL_V1'
  AND t.allowed = true
  AND ((a.code LIKE 'I-%' AND b.code LIKE 'D-%')
    OR (a.code LIKE 'D-%' AND b.code LIKE 'I-%'));

-- 3. RLS de table_join_rules (estava habilitado com ZERO policies — ver 00019):
-- staff da organização gerencia; leitura pública de pares fica por RPC
-- SECURITY DEFINER sanitizada (get_allowed_join_pairs, migration 00022).
DROP POLICY IF EXISTS admin_manage_join_rules ON public.table_join_rules;
CREATE POLICY admin_manage_join_rules ON public.table_join_rules
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role]))
  WITH CHECK (has_org_role(organization_id, ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role]));

-- 4. Auditoria
INSERT INTO public.audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, after_data)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  NULL,
  'join_rules_correction',
  'table_join_rules',
  NULL,
  jsonb_build_object(
    'migration', '00021',
    'flipped_to_denied', (SELECT count(*) FROM public.table_join_rules WHERE allowed = false),
    'still_allowed', (SELECT count(*) FROM public.table_join_rules WHERE allowed = true),
    'basis', 'handoff §30 (pares I×D) e §34 (I-01+I-02); decisão do usuário 2026-09-01',
    'pending', 'validação da lista completa pelo proprietário (Davi)'
  );
