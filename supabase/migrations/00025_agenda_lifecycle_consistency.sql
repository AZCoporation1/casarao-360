-- =============================================
-- Migration 00025: Consistência de lifecycle da agenda
-- Central Casarão 360 — 2026-09-23
-- =============================================
-- Bom Jovi Cover (12/09/2026) foi realizado mas seguia status='scheduled'.
-- Mesma correção que o Gate 0.5 aplicou a Roupa Nova Cover (handoff §95),
-- agora de forma GENÉRICA e idempotente: qualquer evento com data passada
-- (fuso oficial America/Sao_Paulo, §16) e ainda 'scheduled' vira 'completed'.
-- O estado efetivo de booking já era calculado pela data (§17) — o site
-- exibia "Evento Realizado"; isto alinha o lifecycle PERSISTIDO.
-- Nenhuma reserva é alterada (mudam de estado, nunca somem — §50).

UPDATE public.events
SET status = 'completed', updated_at = now()
WHERE status = 'scheduled'
  AND event_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date;

INSERT INTO public.audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, after_data)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, NULL,
       'agenda_lifecycle_consistency', 'events', NULL,
       jsonb_build_object('migration', '00025', 'rule', 'event_date < hoje (America/Sao_Paulo) e scheduled => completed');
