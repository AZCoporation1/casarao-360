# Database Baseline Reconciliation — Central Casarão 360

**Data:** 2026-08-20
**Project Ref:** `xhemqctqilpfjycesusr`
**Branch:** `casarao-360-master-evolution`
**SHA Base:** `94ad168`

## Estado da Migration History

| Item | Estado |
|------|--------|
| `supabase_migrations.schema_migrations` | **NÃO EXISTE** |
| Banco criado via | SQL manual (scripts `run_inserts.ps1`, `run_inserts2.ps1`) |
| Migration tracking | Inexistente |

**Conclusão:** O banco foi criado inteiramente via SQL manual usando a Management API do Supabase.

## Tabelas Existentes (19 após GATE 1)

| Tabela | Existe Remoto | Dados | Ação |
|--------|:---:|---|---|
| organizations | ✅ | 1 row | Manter |
| profiles | ✅ | 1 row | Manter |
| venues | ✅ | 1 row | Manter |
| venue_sectors | ✅ | 6 setores | Manter |
| venue_tables | ✅ | 54 mesas | Manter (LEGACY_V1) |
| events | ✅ | 11 eventos | Manter |
| event_tables | ✅ | 594 (11x54) | Manter |
| customers | ✅ | 3 (QA) | Manter + classificar |
| reservations | ✅ | 3 (QA) | Manter + classificar |
| waitlist_entries | ✅ | 0 | Manter |
| operational_alerts | ✅ | 0 | Manter |
| ai_insights | ✅ | 0 | Manter |
| inventory_categories | ✅ | 0 | Manter |
| inventory_items | ✅ | 0 | Manter |
| event_inventory_forecasts | ✅ | 0 | Manter |
| staff_assignments | ✅ | 0 | Manter |
| audit_logs | ✅ | 0 | Manter |
| organization_settings | ✅ | 1 row | **NOVO (GATE 1)** |
| large_party_requests | ✅ | 0 | **NOVO (GATE 1)** |

## Decisão: reservations como Entidade Canônica

reservations será evoluída. NÃO criar bookings paralela.
Para multimesa: criar reservation_tables como filha.
Para pagamentos: criar payments referenciando reservations.id.

## Inventário de Mesas — LEGACY_OPERATIONAL_V1

54 mesas, 192 lugares. Manter ativa até reconciliação dos proprietários (mesas 26-28 indefinidas).
