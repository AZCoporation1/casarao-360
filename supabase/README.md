# Supabase — Central Casarão 360

## Estrutura

```
supabase/
├── migrations/
│   ├── 00001_extensions_and_enums.sql    # Extensões e enums
│   ├── 00002_core_tables.sql             # organizations, profiles, venues, sectors, tables
│   ├── 00003_events_and_event_tables.sql # events, event_tables
│   ├── 00004_customers_and_reservations.sql # customers, reservations + triggers
│   ├── 00005_waitlist_and_alerts.sql     # waitlist, alerts, insights
│   ├── 00006_inventory_staff_audit.sql   # inventory, staff, audit_logs
│   ├── 00007_views_and_rpcs.sql          # views, RPCs, helper functions
│   ├── 00008_rls_policies.sql            # Row Level Security
│   └── 00009_realtime.sql                # Realtime publication
├── seed.sql                               # Dados fictícios do Casarão
└── README.md                              # Este arquivo
```

## Como aplicar migrations

### Via Supabase Dashboard (SQL Editor)
1. Acesse o Dashboard do seu projeto Supabase
2. Vá em **SQL Editor**
3. Execute cada arquivo de migration **na ordem numérica** (00001 → 00009)
4. Por último, execute o `seed.sql`

### Via Supabase CLI
```bash
npx supabase db push
npx supabase db reset # Inclui seed
```

## Tabelas Criadas

| # | Tabela | Descrição |
|---|--------|-----------|
| 1 | organizations | Multi-empresa (futuro) |
| 2 | profiles | Perfis vinculados a auth.users |
| 3 | venues | Espaços físicos |
| 4 | venue_sectors | Setores do salão |
| 5 | venue_tables | Mesas físicas com posições x/y |
| 6 | events | Eventos com agenda |
| 7 | event_tables | Status de mesa por evento |
| 8 | customers | Clientes (CPF seguro) |
| 9 | reservations | Reservas com anti-duplicidade |
| 10 | waitlist_entries | Lista de espera |
| 11 | operational_alerts | Alertas operacionais |
| 12 | ai_insights | Insights (IA futura) |
| 13 | inventory_categories | Categorias de estoque |
| 14 | inventory_items | Itens de estoque |
| 15 | event_inventory_forecasts | Previsão de consumo |
| 16 | staff_assignments | Escalação de equipe |
| 17 | audit_logs | Log de auditoria |

## RPCs Disponíveis

- `get_event_metrics(p_event_id)` — Métricas completas de um evento
- `get_executive_summary(p_organization_id)` — Resumo executivo
- `create_public_reservation(...)` — Criação segura de reserva (transacional)
- `add_to_waitlist(...)` — Entrada na lista de espera
- `move_waitlist_to_reservation(...)` — Converter waitlist em reserva

## RLS

RLS está ativo em **todas** as 17 tabelas. Políticas:
- **anon**: leitura de eventos públicos, setores e mesas
- **authenticated**: acesso baseado em role dentro da organização
- **service_role**: acesso total (apenas server-side)
