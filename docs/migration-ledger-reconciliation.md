# Migration Ledger Reconciliation — Central Casarão 360

**Data original:** 2026-08-20 · **Atualizado:** 2026-09-01 (ver seção 6)
**Projeto:** xhemqctqilpfjycesusr
**Método de verificação:** Management API queries vs. local migration files

> **STATUS 2026-09-01: LEDGER CRIADO E RECONCILIADO.** As seções 1–5 abaixo
> descrevem o estado PRÉ-00018 e são mantidas como histórico. O estado vigente
> está na **seção 6**.

## 1. Estado Remoto Comprovado

### Tabelas (19)
ai_insights, audit_logs, customers, event_inventory_forecasts, event_tables,
events, inventory_categories, inventory_items, large_party_requests,
operational_alerts, organization_settings, organizations, profiles,
reservations, staff_assignments, venue_sectors, venue_tables, venues,
waitlist_entries

### Enums Remotos
- event_status: draft, scheduled, open, sold_out, completed, cancelled ✅
- payment_status: not_required, pending, paid, failed, refunded ✅
- reservation_status: pending, confirmed, checked_in, cancelled, no_show, expired ✅
- table_status: free, reserved, occupied, blocked, pending, waitlist ✅
- user_role: owner, admin, manager, staff, viewer ✅

### Extensions
- pgcrypto v1.3 (schema extensions) ✅
- uuid-ossp v1.1 ✅
- pg_cron: **NÃO INSTALADO** ❌

### RPCs (12)
add_to_waitlist, create_large_party_request, create_public_reservation,
expire_pending_reservations, get_event_metrics, get_executive_summary,
has_org_role, is_org_member, move_waitlist_to_reservation,
register_event_interest, sync_event_table_status, update_updated_at_column,
validate_reservation_capacity

### Triggers Remotos
| Trigger | Tabela | Timing | Event | Status |
|---------|--------|--------|-------|--------|
| trg_*_updated_at | ALL tables | BEFORE | UPDATE | ✅ Presente |
| trg_sync_event_table_status | reservations | AFTER | INSERT, UPDATE | ✅ Presente |
| trg_validate_reservation_capacity | reservations | BEFORE | INSERT, UPDATE | ✅ Presente |
| **trg_set_reservation_expires_at** | reservations | BEFORE | INSERT, UPDATE OF status | **❌ AUSENTE** |

## 2. Análise por Migration Local

| Arquivo | Status Cloud | Observação |
|---------|-------------|------------|
| 00001_extensions_and_enums.sql | ✅ Parcial | pgcrypto OK, pg_cron AUSENTE. Enums OK. |
| 00002_core_tables.sql | ✅ Aplicada | organizations, venues, venue_sectors, venue_tables, profiles OK |
| 00003_events_and_event_tables.sql | ✅ Aplicada | events, event_tables OK |
| 00004_customers_and_reservations.sql | ✅ Aplicada | customers, reservations OK |
| 00005_waitlist_and_alerts.sql | ✅ Aplicada | waitlist_entries, operational_alerts OK |
| 00006_inventory_staff_audit.sql | ✅ Aplicada | inventory_*, staff_assignments, audit_logs OK |
| 00007_views_and_rpcs.sql | ✅ Aplicada | RPCs presentes |
| 00008_rls_policies.sql | ✅ Aplicada | RLS habilitado |
| 00009_realtime.sql | ⚠️ Não verificável | Realtime publication |
| 00010_update_casarao_real_table_layout.sql | ✅ Aplicada | Layout 54 mesas OK |
| 00011_sync_official_agenda_2026.sql | ✅ Aplicada | 11 eventos OK |
| 00012_release_agenda_consistency.sql | ✅ Aplicada | |
| **00013_reservation_expiration_cron.sql** | **❌ PARCIAL** | `expire_pending_reservations()` RPC existe, mas: trigger `trg_set_reservation_expires_at` **AUSENTE**, pg_cron **NÃO INSTALADO**, `organizations.reservation_hold_minutes` **AUSENTE** |
| 00014_secure_rpc_and_admin.sql | ✅ Aplicada | |
| 00016_harden_security_definer.sql | ✅ Aplicada | |
| 00017_gate1_settings_and_leads.sql | ✅ Aplicada | organization_settings, large_party_requests OK |
| 20260708_official_agenda_schema.sql | ⚠️ Legado | Provavelmente substituída por 00011 |
| 20260708_official_agenda_seed.sql | ⚠️ Legado | Provavelmente substituída por 00011 |

## 3. Gaps Críticos

### 3.1 Trigger `set_reservation_expires_at` AUSENTE
**Impacto:** Reservas criadas NÃO recebem `expires_at` automaticamente.
A coluna `expires_at` existe mas fica NULL. O hold de 180min é decorativo.
**Fix:** Criar trigger no Cloud.

### 3.2 pg_cron NÃO instalado
**Impacto:** Nenhum job de expiração automática.
**Fix:** Instalar pg_cron e agendar job.

### 3.3 `organizations.reservation_hold_minutes` AUSENTE
**Impacto:** Trigger `set_reservation_expires_at` (quando criado) vai falhar ao tentar ler essa coluna.
**Decisão:** Usar `organization_settings.default_hold_duration_minutes` ao invés de `organizations.reservation_hold_minutes`. Atualizar trigger para ler de `organization_settings`.

### 3.4 Reserva CAS-13D017ED pendente
Reserva de teste (João Silva, I-05, Bom Jovi) com `expires_at=NULL`.
Precisa ser limpa ou expirada.

## 4. Estratégia

1. **NÃO executar `supabase db push`** — não há migration history confiável
2. Criar `00018_gate1_final.sql` como migration canônica do Gate 1 Final
3. Aplicar SQL individualmente via Management API
4. Após aplicação, criar baseline schema dump como referência futura
5. Migrations 20260708_* ficam como `archive/` (não-autoritativas)
6. A partir de 00018, migration tracking começa confiável

## 5. Limpeza Necessária

- [x] Limpar reserva de teste CAS-13D017ED — *não existe mais no banco (verificado 2026-09-01)*
- [ ] Limpar customer de teste (João Silva, 11944589961) — *ainda existe; decisão de remoção pendente (dado não referenciado por reserva ativa)*
- [x] Resetar mesa I-05 do Bom Jovi para free — *free (verificado 2026-09-01)*

---

## 6. RECONCILIAÇÃO 2026-09-01 — LEDGER CRIADO (estado vigente)

### 6.1 O que foi encontrado na auditoria

- `supabase_migrations.schema_migrations` **não existia** no banco.
- O Gate 1 Final (00018) foi aplicado via Management API, mas deixou **sem fonte no repo**:
  `create_reservation_v2` (o motor transacional inteiro — o `scratch/` referenciado
  em 00018:171 nunca existiu), a versão multi-mesa de `sync_event_table_status`,
  as RLS policies de `reservation_tables`/`reservation_status_history` + as policies
  `customer_read_own*`, e os 96 seeds de `table_join_rules`.
- **Mojibake UTF-8** (U+FFFD) nas strings de 3 funções vivas — `create_reservation_v2`,
  `validate_reservation_capacity`, `register_event_interest` — causado por aplicação
  de SQL via PowerShell com encoding ANSI (`run_inserts*.ps1`).
- `supabase/.temp/` apontava para o projeto **PROIBIDO** `bqdhvpvtzemjsbnbgryo`.
- `table_join_rules` está com RLS habilitado e **zero policies** (acesso só via
  service role / SECURITY DEFINER). Policy de staff será adicionada em 00021.
- Os gaps 3.1–3.3 (trigger expires_at, pg_cron, hold em organization_settings)
  **já haviam sido corrigidos** pelo 00018: trigger presente, pg_cron instalado e
  job `expire-pending-reservations` ativo (`*/5 * * * *`), hold lido de
  `organization_settings.default_hold_duration_minutes` (180).

### 6.2 O que foi feito

| Item | Detalhe |
|---|---|
| `00019_capture_live_state.sql` | **Baseline capturado** do vivo (RLS policies + 96 seeds de join rules por `venue_tables.code`). Registrado no ledger, **NÃO executado** (tudo já existia; guards idempotentes como rede de segurança para ambientes futuros). |
| `00020_reapply_functions_utf8.sql` | **Executado** via Management API. Re-aplica as 3 funções com UTF-8 correto (semântica idêntica) e torna canônica no repo a versão multi-mesa de `sync_event_table_status`. Verificação pós-apply: `count(*) WHERE position(chr(65533) in prosrc)>0` = **0**. |
| Ledger criado | `scripts/sql/baseline-schema-migrations.sql` aplicado: versões 00001–00014, 00016–00020 registradas. **00015 é gap intencional** (00015_qa_validation.sql deletada no commit 3b43359 — não inventar). |
| `20260708_official_agenda_*` | Movidas para `supabase/legacy/` (supersedidas por 00011; fora do ledger). |
| `supabase/.temp/` | Deletado (ref proibida). Já estava no .gitignore. |
| `supabase/config.toml` | Criado com `project_id = "xhemqctqilpfjycesusr"` — único projeto autorizado. |
| Smoke funcional | Reserva QA criada via `create_reservation_v2` no Bom Jovi (I-01): pending + `expires_at` +180min + allocation `active` + history + mesa `pending`; cancelada e removida; mesa voltou a `free`; cron ativo. |

### 6.3 Regras permanentes

1. SQL **somente** via Management API (`POST /v1/projects/xhemqctqilpfjycesusr/database/query`)
   com body **JSON UTF-8** montado por ferramenta que garanta encoding (ex.: Node
   `JSON.stringify` de arquivo lido como utf8). **NUNCA** pipe de SQL via PowerShell.
2. Toda migration: autorada no repo (UTF-8 sem BOM) → aplicada via API → registrada
   no ledger na mesma sessão.
3. `supabase db push` continua proibido até haver paridade comprovada repo↔banco
   testada em ambiente descartável.
4. Verificação anti-mojibake após qualquer apply de função:
   `SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND position(chr(65533) in prosrc)>0` deve retornar 0.

### 6.4 Débito conhecido

- Idempotência de `create_reservation_v2` via `notes LIKE '%idempotency:KEY%'` —
  substituir por coluna `reservations.idempotency_key` + índice único parcial (Gate 1.5).
- `validate_reservation_capacity` vivo valida apenas `party_size` 1..8 hardcoded
  (a capacidade real por mesa é validada dentro do motor) — considerar ler de
  `organization_settings` no futuro.
- Customer de teste João Silva (11944589961) permanece no banco (ver seção 5).

### 6.5 Observação de produção

Durante a reconciliação (2026-09-01 ~14:51 UTC) uma reserva REAL foi criada pelo
site: `CAS-D5B259CF`, 8 pessoas, mesas I-06+I-12 (par I×I permitido), hold até
17:51 UTC. Produção está recebendo tráfego — janelas de mudança no banco devem
continuar curtas e atômicas.
