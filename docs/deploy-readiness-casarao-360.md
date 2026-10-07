# Deploy Readiness — Central Casarão 360

**Data:** 17/06/2026 22:14  
**Branch:** `final-supabase-deploy-readiness`  
**Supabase Project:** `xhemqctqilpfjycesusr` (reservas de eventos)  
**Região:** us-east-1  
**Status do Projeto:** ACTIVE_HEALTHY  

---

## 1. Conexão Supabase

| Item | Resultado |
|------|-----------|
| API Management conecta | ✅ |
| Project ref validado | ✅ `xhemqctqilpfjycesusr` |
| Nome do projeto | "reservas de eventos" |
| Database PostgreSQL 17 | ✅ v17.6.1.127 |
| Status | ACTIVE_HEALTHY |

**Nota:** Projeto `bqdhvpvtzemjsbnbgryo` ("Casarão demo protótipo") também existe na conta mas é um projeto separado. O `.env.local` e MCP estão configurados para `xhemqctqilpfjycesusr`.

---

## 2. Migration 00010 — Resultado

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| venue_tables | 12 | **54** | ✅ |
| capacity total | 60 | **192** | ✅ |
| I-XX (4 lug.) | 0 | **22** | ✅ |
| D-XX (2 lug.) | 0 | **12** | ✅ |
| E-XX (4 lug.) | 0 | **20** | ✅ |
| venue capacity | 250 | **192** | ✅ |
| event_tables | 36 (12×3) | **162** (54×3) | ✅ |
| mesas cap 6/8/10 | 3 | **0** | ✅ |
| events | 3 | 3 | ✅ |

---

## 3. Schema Auditado

### Tabelas (18)
```
ai_insights, audit_logs, customers, event_inventory_forecasts,
event_metrics_view, event_tables, events, inventory_categories,
inventory_items, operational_alerts, organizations, profiles,
reservations, staff_assignments, venue_sectors, venue_tables,
venues, waitlist_entries
```

### RPCs/Functions (10)
```
add_to_waitlist, create_public_reservation, get_event_metrics,
get_executive_summary, has_org_role, is_org_member,
move_waitlist_to_reservation, sync_event_table_status,
update_updated_at_column, validate_reservation_capacity
```

### RLS Policies (37 em 17 tabelas)
| Tabela | Policies |
|--------|----------|
| events | 3 |
| event_tables | 3 |
| venues | 3 |
| profiles | 3 |
| organizations | 2 |
| customers | 2 |
| reservations | 2 |
| waitlist_entries | 2 |
| operational_alerts | 2 |
| ai_insights | 2 |
| venue_sectors | 2 |
| venue_tables | 2 |
| inventory_categories | 2 |
| inventory_items | 2 |
| event_inventory_forecasts | 2 |
| staff_assignments | 2 |
| audit_logs | 1 |

### Realtime (5 tabelas)
```
event_tables, reservations, waitlist_entries,
operational_alerts, ai_insights
```

---

## 4. Build Frontend

```
✓ Compiled successfully in 3.6s
✓ TypeScript OK (3.0s)
✓ 10 pages generated
```

---

## 5. Checklist de Deploy

| Item | Status |
|------|--------|
| [x] Migration 00010 aplicada no Supabase real | ✅ |
| [x] venue_tables = 54 | ✅ |
| [x] capacity total = 192 | ✅ |
| [x] event_tables = 54 por evento (162 total) | ✅ |
| [x] nenhum evento com capacity > 192 | ✅ |
| [x] nenhuma mesa capacity 6/8/10 | ✅ |
| [x] RPCs existem (10) | ✅ |
| [x] RLS ativo (17 tabelas, 37 policies) | ✅ |
| [x] Realtime ativo (5 tabelas) | ✅ |
| [x] NEXT_PUBLIC_DATA_MODE=mock funciona | ✅ |
| [x] npm run build passa | ✅ |
| [x] nenhum segredo exposto no código | ✅ |
| [ ] Admin protegido (Supabase Auth) | ⚠️ PENDENTE |
| [ ] Testes E2E de reserva | ⚠️ PENDENTE |
| [ ] Deploy Vercel staging | ⚠️ PENDENTE |

---

## 6. Decisão Final

### 🟡 PRONTO PARA STAGING

O sistema está pronto para deploy em ambiente de staging. As seguintes pendências impedem deploy oficial em produção:

1. **Admin Auth** — `/admin` precisa de proteção com Supabase Auth antes de ir público
2. **Testes E2E** — Fluxo de reserva real precisa ser testado end-to-end no staging
3. **Validação visual** — Mapa com 54 mesas precisa validação visual pelo Davi

### Recomendações Imediatas
1. Deploy staging na Vercel com variáveis de ambiente
2. Implementar middleware.ts para proteger /admin
3. Rodar testes de reserva no staging
4. **ROTACIONAR TOKEN SUPABASE** usado nesta sessão

---

## 7. Segurança Pós-Execução

> [!CAUTION]
> O token Supabase (`sbp_...`) foi usado nesta sessão para executar queries via Management API. 
> **Recomendação: ROTACIONAR este token imediatamente** em https://supabase.com/dashboard/account/tokens
