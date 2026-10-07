# Release Readiness: Central Casarão 360

Este documento atesta a auditoria cirúrgica e técnica da plataforma Central Casarão 360 antes do seu release oficial para produção.

## 1. Escopo e Cenário

- **Projeto**: Central Casarão 360
- **Project Ref**: `bqdhvpvtzemjsbnbgryo`
- **Branch**: `sync-agenda-oficial-casarao-2026`
- **Ambiente**: Produção / Staging

O objetivo primário desta auditoria foi eliminar inconsistências herdadas de seeds de demonstração, corrigir gaps de segurança (Search Path Hijacking), implementar limpeza inteligente de reservas não pagas (pg_cron) e garantir 0 erros no build e linter.

## 2. Auditorias Realizadas

### 2.1 Consistência da Agenda & Seed Oficial
- **O que foi feito**: Criamos a migration `00012_release_agenda_consistency.sql` que realiza um UPSERT de 11 datas reais de 2026, sendo 3 já no status `completed` (eventos passados) e 8 em status variados (`announced`, `priority_only`, `open`). As datas legadas de demo foram configuradas como `draft`.
- **Validação**: O `seed.sql` foi atualizado para refletir 100% essas mesmas datas, bem como um layout de salão padrão com 54 mesas totais (192 assentos de capacidade), garantindo idoneidade.

### 2.2 Mapa e Capacidade do Salão
- **O que foi feito**: As mesas foram atualizadas no `seed.sql`. O projeto prevê capacidade de 192 lugares sem overlaps.
- **Validação**: Os `event_tables` inseridos via seed e os visualizados em `app/reservar/[eventoId]/page.tsx` batem.

### 2.3 Motor de Reservas e Expiração (`pg_cron`)
- **O que foi feito**: A criação da migration `00013_reservation_expiration_cron.sql`.
- **Implementação**: 
  - Adição da coluna `reservation_hold_minutes` em `organizations` (default: 20 min).
  - Adição da coluna `expires_at` em `reservations`.
  - Trigger `trg_set_reservation_expires_at` que auto-calcula e define `expires_at` toda vez que a reserva passa a `pending`.
  - Agendamento com `pg_cron` a cada 5 minutos (`expire-pending-reservations`) para expirar as reservas cujo `expires_at <= now()`, movendo para `cancelled` e liberando a mesa (`status = 'free'`).
- **Validação**: As funções rolam nativamente no banco. A interface do React foi ajustada para dizer "Solicitação de reserva recebida" durante o status `pending`.

### 2.4 Segurança, RLS e Security Definer
- **O que foi feito**: Criada a migration `00014_secure_rpc_and_admin.sql`.
- **Implementação**: Todas as funções RPC que usam `SECURITY DEFINER` (como `register_event_interest` e `expire_pending_reservations`) receberam a instrução `SET search_path = public`.
- **Por quê?**: Evitar ataques de *Search Path Hijacking*, uma falha de segurança comum no Postgres onde atores mal-intencionados injetam tabelas/schemas falsos no search path para enganar RPCs com altos privilégios.

### 2.5 Proteção do Admin (SSR)
- **O que foi feito**: Validação do `middleware.ts`.
- **Validação**: O middleware atual verifica ativamente o token na rede via `supabase.auth.getUser()`. Acessos não autenticados na rota `/admin/*` são redirecionados de forma segura (Server-Side) para `/login`. A página de `/login` atende aos requisitos de autenticação baseados em e-mail/senha nativos do Supabase.

### 2.6 Otimizações de Build (Next.js)
- **O que foi feito**: Executamos o Lint e Build completo.
- **Validação**: Todas as "impure functions" do React (ex: `Math.random` direto no escopo de render em `app/admin/relatorios/page.tsx`) foram convertidas para algoritmos determinísticos baseados em hash ou charCode.
- **Resultado**: `npm run lint` passou com 0 erros (apenas warnings de variáveis não utilizadas) e `npm run build` completou sem impeditivos.

### 2.7 Testes E2E Smoke (Playwright)
- **O que foi feito**: Configuração e instalação do `@playwright/test` rodando nas principais engines web.
- **Validação**: Foram criados os *Smoke Tests* em `tests/smoke.spec.ts` que checam:
  - Carregamento da página principal (Fallback).
  - Listagem de Agenda/Eventos.
  - Redirecionamento forçado do `/admin` para `/login` (Validação E2E do Middleware).

---

## 3. Deployment Flow & Orientações

1. **Database Migrations**: O desenvolvedor ou CI deverá rodar:
   ```bash
   npx supabase link --project-ref bqdhvpvtzemjsbnbgryo
   npx supabase db push
   ```
2. **Ambiente de Teste QA**: Se for validar via local `npm run dev`, lembre-se que o Supabase deve estar mockado (MOCK_MODE=true) ou apontando pro cloud com os tokens seguros.
3. **Produção (Vercel)**: Tudo está aderente às boas práticas do Next.js App Router (Purity, Server Actions, Middleware, Server Components). Pode-se aprovar a PR na Vercel e realizar o Deploy sem receio.

## 4. Conclusão da Auditoria
O sistema encontra-se robusto, seguro, imune a overbooking passivo (pg_cron expira reservas travadas), limpo (0 impure components) e fiel ao seed e layout comercial do ano de 2026.

Status da Release: **READY FOR DEPLOYMENT** 🚀
