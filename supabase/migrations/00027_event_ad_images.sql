-- =============================================
-- Migration 00027: Anúncios cinematográficos dos eventos
-- Central Casarão 360 — 2026-09-23
-- =============================================
-- Evolução do 00026: cover_image_url passa dos pôsteres vetoriais para os
-- ANÚNCIOS em formato de show (public/eventos/ads/<slug>.jpg, 1600×1000,
-- gerados por scripts/generate-event-ads.mjs): cena de palco cinematográfica
-- com o artista em SILHUETA contra-luz (sem rosto/likeness de artista real —
-- eventos cover) + tipografia da casa (O CASARÃO APRESENTA · título · data ·
-- RESERVE SUA MESA).
--
-- Fotos oficiais de divulgação das bandas (quando a casa tiver o material
-- autorizado): colocar em public/eventos/fotos/<slug>.jpg e regenerar — o
-- compositor usa a foto como fundo com o grade da marca automaticamente.
-- Os SVGs de 00026 permanecem como série secundária; o fallback do frontend
-- segue /eventos/placeholder.svg.

UPDATE public.events
SET cover_image_url = '/eventos/ads/' || slug || '.jpg', updated_at = now()
WHERE slug IS NOT NULL AND slug <> '';

INSERT INTO public.audit_logs (organization_id, actor_profile_id, action, entity_type, entity_id, after_data)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, NULL,
       'event_ad_images', 'events', NULL,
       jsonb_build_object('migration', '00027', 'pattern', '/eventos/ads/<slug>.jpg',
                          'events_updated', (SELECT count(*) FROM public.events WHERE cover_image_url LIKE '/eventos/ads/%'));
