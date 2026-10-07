# Deploy Gate 1 — Central Casarão 360

**Data:** 2026-09-01 · **Branch:** casarao-360-master-evolution · **Vercel:** casarao-360 (deploy via `npx vercel --prod`; não há remote git)

## Pré-deploy (verificado em 2026-09-01)

- [x] Env de Production na Vercel: `NEXT_PUBLIC_SUPABASE_URL` (projeto oficial xhemqctqilpfjycesusr), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DATA_MODE=supabase`, `SUPABASE_SERVICE_ROLE_KEY` (todas Sensitive — o pull retorna vazio; valor de DATA_MODE comprovado por comportamento: reservas reais chegam ao banco via site).
- [x] `.env.vercel` NÃO rastreado pelo git (`.env*` no .gitignore).
- [x] `npm run typecheck` limpo.
- [x] `npm run build` limpo.
- [x] E2E `npx playwright test`: **11/11 PASS** (smoke 6 + fluxo cliente 3 + ADM 2) contra o Supabase oficial, com limpeza automática (global-teardown, domínio `@casarao360.test`).
- [x] Migrations 00019–00023 aplicadas e registradas em `supabase_migrations.schema_migrations`.
- [x] Zero mojibake em `pg_proc.prosrc` (check `chr(65533)`).
- [x] Conta QA staff (`qa.staff@casarao360.test`, role manager) criada para E2E; credenciais só em `.env.local` (`E2E_ADMIN_*`). A conta do Davi (owner) intocada.

## IMPORTANTE — fail-loud de dados

A partir deste deploy, produção SEM `NEXT_PUBLIC_DATA_MODE=supabase` **quebra
visivelmente** (guard em `lib/data/data-source.ts`) em vez de cair para dados
mock (§92). Se a homepage exibir erro de configuração após um deploy, conferir
as envs na Vercel ANTES de qualquer rollback de código.

## Smoke de produção (§123) — executar após cada deploy

1. `https://casarao-360.vercel.app/` carrega; agenda lista Bom Jovi 12/09.
2. `/reservar/<bom-jovi>`: mapa com 54 mesas; estado real (mesas da reserva `CAS-D5B259CF` em amarelo enquanto pendente).
3. Selecionar 1 mesa → formulário exige conta (Criar conta / Já tenho conta) — SEM reserva anônima.
4. Selecionar 2ª mesa compatível → funciona; mesas não combináveis ficam roxas; 3º clique bloqueia com CTA WhatsApp.
5. 9 pessoas → fluxo WhatsApp com código de solicitação (lead em `/admin/leads`).
6. Reserva completa (usuário de teste próprio) → redirect para `/minha-conta/reservas/<id>` com código; depois CANCELAR via ADM e conferir mesa liberada.
7. `/login` com credenciais QA staff → `/admin`; `/admin/reservas` mostra a reserva; realtime: reservar em outra aba/navegador → painel atualiza sozinho.
8. Login de cliente em `/login` → recusado; cliente logado em `/admin` → redirect `/minha-conta?erro=acesso`.
9. Expiração: reserva de teste com hold vencido some do mapa em ≤5 min (pg_cron `*/5`).

## Rollback

- Vercel → Deployments → promote do deployment anterior (instantâneo).
- Banco: migrations 00020–00023 são aditivas (funções/policies/flips); rollback de
  código NÃO exige rollback de banco. Flips de join rules revertem com UPDATE
  (`allowed=true`) se o proprietário decidir.

## Pós-lançamento (pendências conhecidas)

- Mover E2E para projeto/branch de staging (hoje roda contra produção com dados taggeados).
- Criar conta staff definitiva do Davi no novo fluxo se desejar trocar a atual (runbook `docs/runbooks/admin-user-provisioning.md`).
- Confirmação de email segue desativada (`mailer_autoconfirm=true`) — hardening futuro (handoff §40).
- Idempotência por coluna dedicada (Gate 1.5). Validação da lista de join rules pelo Davi.
