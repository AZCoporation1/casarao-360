# Central Casarão 360

Central de previsibilidade, reservas, eventos e operação d'**O Casarão** (Eventos & Gastronomia).
Cliente, banco de dados e equipe administrativa olhando sempre para o mesmo evento, a mesma
reserva, as mesmas mesas e o mesmo estado operacional.

- **Produção:** https://casarao-360.vercel.app
- **Banco:** Supabase (projeto oficial `xhemqctqilpfjycesusr`)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + RLS + RPCs + Realtime + pg_cron) · Playwright · Vercel.

## Rodando em outro computador

1. **Clonar e instalar**
   ```bash
   git clone https://github.com/AZCoporation1/casarao-360.git
   cd casarao-360
   npm install
   npx playwright install chromium   # só se for rodar os testes E2E
   ```

2. **Variáveis de ambiente** — crie um arquivo `.env.local` na raiz (NUNCA commitar;
   `.env*` está no .gitignore). Os valores estão no painel do Supabase
   (Project Settings → API) e na Vercel (Project → Settings → Environment Variables):
   ```env
   NEXT_PUBLIC_DATA_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xhemqctqilpfjycesusr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key — só para scripts/E2E, nunca no frontend>

   # opcionais — testes E2E do painel administrativo
   E2E_ADMIN_EMAIL=<email da conta staff de QA>
   E2E_ADMIN_PASSWORD=<senha>
   ```
   > Sem `.env.local`, o app roda em **modo mock** (dados de demonstração, sem banco).
   > Em produção o modo mock é proibido e o app falha visível por design.

3. **Desenvolver**
   ```bash
   npm run dev        # http://localhost:3000
   npm run lint
   npm run typecheck
   npm run build
   npm run test:e2e   # Playwright — ATENÇÃO: roda contra o banco OFICIAL com
                      # dados taggeados @casarao360.test e limpeza automática
   ```

## Banco de dados — regras inegociáveis

- **Projeto oficial único:** `xhemqctqilpfjycesusr` (ver `supabase/config.toml`).
- Migrations ficam em `supabase/migrations/` e são aplicadas **via Management API**
  (body JSON UTF-8 montado por Node — nunca `supabase db push` cego, nunca pipe de
  SQL via PowerShell) e registradas em `supabase_migrations.schema_migrations`.
  Processo completo: [`docs/migration-ledger-reconciliation.md`](docs/migration-ledger-reconciliation.md).
- `reservations` é a entidade canônica; `create_reservation_v2` é o único motor
  transacional de reserva; join rules são **deny-by-default**.
- Nunca: bypass de RLS, service role no frontend, deletar reservas/logs, mock em produção.

## Geradores de assets

```bash
node scripts/generate-event-posters.mjs   # série vetorial (public/eventos/*.svg)
node scripts/generate-event-ads.mjs       # anúncios de show (public/eventos/ads/*.jpg)
```
Fotos oficiais de divulgação das bandas: colocar em `public/eventos/fotos/<slug>.jpg`
e regenerar os anúncios — **nunca** usar foto/likeness dos artistas originais em
eventos cover.

## Deploy

Deploy é manual via Vercel CLI (não há integração git→Vercel):
```bash
npx vercel --prod
```
Checklist e smoke de produção: [`docs/deploy-gate1.md`](docs/deploy-gate1.md).

## Documentação essencial

| Doc | Conteúdo |
|---|---|
| `docs/migration-ledger-reconciliation.md` | Estado do banco, ledger, regras de migration |
| `docs/table-inventory-reconciliation.md` | Plantas do salão (PHYSICAL_INTERNAL_V1 + legado) |
| `docs/deploy-gate1.md` | Checklist de deploy e smoke de produção |
| `docs/runbooks/admin-user-provisioning.md` | Criar usuários staff do painel ADM |
| `docs/referencias/mapa-salao-interno.png` | Planta física oficial do salão interno |

## Áreas do sistema

- **Cliente:** `/` · `/eventos` · `/reservar/[eventoId]` (mapa interativo, conta
  obrigatória com cadastro inline, até 2 mesas combináveis, hold de 3h) ·
  `/minha-conta/*`
- **Administrativo** (requer profile staff): `/login` → `/admin` · `/admin/reservas`
  (confirmar/cancelar via RPCs auditados) · `/admin/mapa` (realtime) · `/admin/leads`

## Segurança

Nunca commitar chaves, tokens ou `.env*`. Tokens da Management API do Supabase são
pessoais e rotacionáveis — gere em supabase.com/dashboard/account/tokens e revogue
os antigos.
