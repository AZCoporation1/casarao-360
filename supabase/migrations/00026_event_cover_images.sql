-- =============================================
-- Migration 00026: Imagens ilustrativas dos eventos
-- Central Casarão 360 — 2026-09-23
-- =============================================
-- Série de pôsteres vetoriais da casa (public/eventos/<slug>.svg), gerados
-- por scripts/generate-event-posters.mjs: identidade §4 (noturno, brasa,
-- âmbar), um motivo temático por evento, SEM fotos/likeness de artistas
-- reais (eventos cover). events.cover_image_url já existia no schema (00003)
-- e o repositório já mapeava para imageUrl — este UPDATE só liga o dado.
-- Fallback do frontend: /eventos/placeholder.svg (fachada do Casarão).
-- Idempotente; eventos futuros criados com slug ganham pôster ao rodar o
-- gerador e repetir este UPDATE.

UPDATE public.events
SET cover_image_url = '/eventos/' || slug || '.svg', updated_at = now()
WHERE slug IS NOT NULL AND slug <> '';

INSERT INTO public.audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, after_data)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, NULL,
       'event_cover_images', 'events', NULL,
       jsonb_build_object('migration', '00026', 'pattern', '/eventos/<slug>.svg',
                          'events_updated', (SELECT count(*) FROM public.events WHERE cover_image_url LIKE '/eventos/%'));
