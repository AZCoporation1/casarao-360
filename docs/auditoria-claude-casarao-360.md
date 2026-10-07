# Auditoria Completa — Central Casarão 360
**Data:** 17/06/2026  
**Branch:** `auditoria-claude-casarao-real-map`  
**Build:** ✅ Passa (Next.js 16.2.7 Turbopack)

---

## 1. Resumo Executivo

Auditoria técnica completa do sistema Central Casarão 360, com foco na atualização da capacidade real do Casarão (54 mesas, 192 lugares) e correção de inconsistências identificadas na base de código.

**Capacidade oficial do Casarão:**
| Área | Mesas | Lugares por mesa | Total |
|------|-------|-----------------|-------|
| Salão Interno (4 lug.) | 22 | 4 | 88 |
| Salão Interno (2 lug.) | 12 | 2 | 24 |
| Área Externa (4 lug.) | 20 | 4 | 80 |
| **TOTAL** | **54** | — | **192** |

---

## 2. Status Antes da Auditoria

### ✅ Correto
- Arquitetura Next.js App Router com separação client/server
- Branding premium com cores oficiais do Casarão
- Montserrat como fonte principal
- UI Library (Button, Card, Badge, Input) com variantes premium
- Modo híbrido mock/supabase funcional
- Camada de repositories para abstração de dados
- Server actions com validação Zod
- Segurança: .env* no .gitignore, service role isolado, server-only imports
- 9 migrations modulares no Supabase
- Admin com 7 seções funcionais
- Fluxo de reserva com validação e feedback

### 🔴 Problemas Críticos (CORRIGIDOS)
1. **Mock data com apenas 12 mesas** → Atualizado para 54
2. **Capacidades incorretas** (mesas 6, 8, 10 lug.) → Corrigido para 2 e 4
3. **Evento capacity = 250/300** → Corrigido para 192
4. **Seed SQL com 12 venue_tables** → Migration incremental criada
5. **Setores faltantes** (Externo, Família) → Adicionados ao tipo e mapeamento
6. **Nomenclatura errada** ("1","2","3") → Atualizada para I-XX, D-XX, E-XX
7. **VenueMap sem separação interno/externo** → Redesenhado
8. **VenueMap sem distinção visual 2/4 lugares** → Implementado
9. **Tipo Table.sector incompleto** → Expandido
10. **Sem validação de layout** → layout-validator.ts criado

### 🟡 Problemas Médios (CORRIGIDOS)
1. sectorMap em tables.repository.ts → Atualizado com todos os setores
2. metrics.repository.ts mock → Valores atualizados para refletir 54/192
3. Eventos mock com datas passadas → Datas futuras (julho 2026)
4. Admin reservas expondo CPF → CPFs pré-mascarados no mock
5. Export const dynamic entre imports → Reordenado
6. Font-family Montserrat não explícito no CSS → Adicionado

### 🟢 Problemas Baixos (PARCIALMENTE CORRIGIDOS)
1. `getWaitlistCount` aceitava `any[]` → Tipado
2. Relatórios com dados hardcoded → Documentado como pendência
3. Sem indicação de setores na legenda → Legenda com setores no VenueMap
4. Loading states sem skeleton → Documentado como pendência futura

---

## 3. Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `lib/map/casarao-layout.ts` | Configuração oficial com 54 mesas, posições X/Y, setores, features |
| `lib/map/layout-validator.ts` | Validador de colisões, overlap, limites, contagens |
| `supabase/migrations/00010_update_casarao_real_table_layout.sql` | Migration incremental UPSERT para 54 mesas |
| `docs/auditoria-claude-casarao-360.md` | Este relatório |

## 4. Arquivos Alterados

| Arquivo | O que mudou |
|---------|------------|
| `lib/types.ts` | Novos setores no tipo Table.sector |
| `lib/mock-data.ts` | 54 mesas, 3 eventos com cap. 192, 5 reservas reais, CPFs mascarados |
| `lib/metrics.ts` | Capacidade 192, funções extras, PRESSURE_LABELS |
| `lib/data/tables.repository.ts` | sectorMap expandido com todos os setores |
| `lib/data/metrics.repository.ts` | Mock values atualizados |
| `components/map/VenueMap.tsx` | Mapa redesenhado com interno/externo, zoom, filtros, tamanhos distintos |
| `app/admin/page.tsx` | KPIs reais (X/54, 192 lugares, pressão em pt-BR) |
| `app/admin/mapa/page.tsx` | getSectorLabel para nomes legíveis |
| `app/admin/eventos/page.tsx` | Capacidade 192 |
| `app/reservar/[eventoId]/page.tsx` | getSectorLabel, import organizado |
| `app/page.tsx` | Export order corrigido |
| `app/eventos/page.tsx` | Export order corrigido |
| `app/globals.css` | font-family Montserrat explícito |

---

## 5. Validação do Mapa

| Critério | Status |
|----------|--------|
| Total venue_tables = 54 | ✅ |
| Mesas internas 4 lugares = 22 | ✅ |
| Mesas internas 2 lugares = 12 | ✅ |
| Mesas externas 4 lugares = 20 | ✅ |
| Capacidade total = 192 | ✅ |
| Nenhum x/y duplicado | ✅ |
| Nenhuma sobreposição detectada | ✅ |
| Nenhum elemento fora do container | ✅ |
| Todas as mesas aparecem no mapa | ✅ |
| Todas as mesas têm sector | ✅ |
| Todas as mesas têm features | ✅ |
| Todas as mesas têm status | ✅ |
| Separação visual interno/externo | ✅ |
| Mesas 2 lugares menores | ✅ |
| Zoom funcional | ✅ |
| Filtro por área | ✅ |

---

## 6. Validação do Fluxo de Reserva

| Critério | Status |
|----------|--------|
| Evento existe no mock | ✅ |
| Mesa existe e pertence ao evento | ✅ |
| Mesa está livre | ✅ Validado |
| Capacidade respeitada (people <= capacity) | ✅ |
| Formulário validado (nome, tel, cpf obrigatórios) | ✅ |
| Reserva criada no demo store | ✅ |
| Mesa muda status para 'aguardando' | ✅ |
| Admin reflete mudança | ✅ |
| Erro amigável se mesa não disponível | ✅ |
| CPF mascarado na confirmação | ✅ |

---

## 7. Validação do Admin

| Critério | Status |
|----------|--------|
| KPI Mesas Livres mostra X/54 | ✅ |
| KPI Capacidade mostra 192 | ✅ |
| KPI Ocupação % correto | ✅ |
| KPI Pressão em pt-BR | ✅ |
| Mapa mostra 54 mesas | ✅ |
| Setor exibido como texto legível | ✅ |
| Insights funcionam | ✅ |
| Operação calcula equipe/estoque | ✅ |
| Central de clientes mostra reservas | ✅ |

---

## 8. Resultado do Build

```
✓ Compiled successfully in 5.0s
✓ TypeScript OK (4.5s)
✓ 10 pages generated
```

---

## 9. Segurança

| Critério | Status |
|----------|--------|
| .env* no .gitignore | ✅ |
| Nenhum token no código | ✅ |
| service role isolado em admin.ts | ✅ |
| server-only import no admin.ts | ✅ |
| RLS configurado nas migrations | ✅ |
| CPF mascarado no mock | ✅ |
| Nenhum SQL destrutivo | ✅ |

---

## 10. Modo Mock vs Supabase

| Modo | Status |
|------|--------|
| `NEXT_PUBLIC_DATA_MODE=mock` | ✅ Funciona com 54 mesas |
| `NEXT_PUBLIC_DATA_MODE=supabase` | ⚠️ Migration precisa ser aplicada |
| Fallback mock quando Supabase falha | ✅ |

---

## 11. Pendências Reais

| # | Pendência | Prioridade |
|---|-----------|-----------|
| 1 | Aplicar migration 00010 no Supabase real | Alta (após aprovação do Davi) |
| 2 | Atualizar seed.sql completo com 54 mesas | Média (para reset de demo) |
| 3 | Relatórios com dados dinâmicos vs hardcoded | Baixa |
| 4 | Skeleton loading states | Baixa |
| 5 | Lista de espera funcional end-to-end | Média |
| 6 | Realtime subscription para atualização automática | Média |
| 7 | Autenticação admin com Supabase Auth | Alta (produção) |
| 8 | Testes automatizados (Playwright/Vitest) | Média |

---

## 12. Próximos Passos Recomendados

1. **Aplicar migration** no Supabase real e testar modo `supabase`
2. **Deploy staging** na Vercel para validação visual
3. **Implementar lista de espera** funcional com RPC
4. **Adicionar Realtime** para mapa operacional ao vivo
5. **Autenticação** para proteger o admin
6. **Testes E2E** para fluxo de reserva completo
7. **Planta real** quando Davi fornecer layout físico exato
