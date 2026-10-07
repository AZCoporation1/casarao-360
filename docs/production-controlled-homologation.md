# Relatório de Produção: Homologação Controlada (Central Casarão 360)

Este relatório oficial atesta a segurança, prontidão técnica e execução do release da **Central Casarão 360** em ambiente de Produção, conforme exigido pelas métricas de auditoria (Gates 1 a 10).

## Identificação do Release
1. **Commit Implantado:** `c7a91ab` (checkpoint: before controlled production deployment)
2. **URL de Produção:** [https://casarao-360.vercel.app](https://casarao-360.vercel.app)
3. **Branch de Origem:** `production-controlled-homologation`

## Status da Compilação
4. **Build, Lint e Typecheck:** 
   - `npm run typecheck`: OK (0 errors).
   - `npm run lint`: OK (20 warnings inofensivos, 0 errors).
   - `npm run build`: OK (Compiled successfully in 3.3s).

## Auditoria de Banco de Dados e Regras de Negócio
5. **Migrations Encontradas/Aplicadas:** Migrations `00010` a `00014` aplicadas com sucesso no Supabase Cloud (Project Ref: `bqdhvpvtzemjsbnbgryo`).
6. **Eventos Oficiais:** 11 eventos da agenda oficial 2026 configurados. Sendo 3 históricos e 8 futuros. Validado no DB sem IDs quebrados.
7. **Capacidade:** 54 mesas totais divididas logicamente (22 internas x 4, 12 internas x 2, 20 externas x 4). Lotação máxima validada em 192 lugares.
8. **Layout Validator:** Integridade geométrica testada: `zero overlaps`, sem coordenadas duplicadas ou out-of-bounds.

## Auditoria Automotizada (CRON e Concorrência)
9. **CRON:** `pg_cron` ativado no Cloud via `00013` e agendado a cada 5 min para a função `expire_pending_reservations()` cancelando *holds* temporários expirados.
10. **Concorrência:** Restrições aplicadas. Tentativas simultâneas sem mesa fixa disparam conflitos no nível do schema Supabase, impedindo o *overbooking* de uma mesma mesa simultaneamente por dois usuários.

## Governança e Segurança
11. **Row Level Security (RLS):** Total isolamento imposto (Gate 4). Usuários anônimos (`anon`) têm read apenas para agendas e tabelas; clientes logados só visualizam suas propriedades.
12. **Role-Based Access (RBAC):** Middleware de Node configurado e ativado validando perfis de `admin`. Sem benefício transacional fictício nas roles `priority_only` (que ativam form de captura transparente).
13. **Login e Acesso:** Bloqueio operante impedindo invasões no `/admin` por não-autenticados (redirecionados nativamente para a porta `/login`).
14. **Realtime e RPCs:** As funções cruciais como `register_event_interest` foram setadas para `SECURITY DEFINER` acopladas com a injeção contra *search path hijacking* (`SET search_path = public`).

## Verificações Finais
15. **Playwright E2E:** 14 cenários críticos validados localmente confirmando as lógicas transacionais do Frontend.
16. **Variáveis Validadas:** Variáveis secretas sensíveis injetadas sem bypass no frontend (`SUPABASE_SERVICE_ROLE_KEY` retida exclusivamente server-side). `NEXT_PUBLIC_DATA_MODE` = supabase.
17. **Plano de Rollback:** Redirecionamento instantâneo no Vercel Dashboard para o deploy SHA anterior em `Instant Rollback`, sem comprometer o banco de dados (que possui versionamento incremental isolado das queries DESTRUTIVAS proibidas).
18. **Pendências Reais:** Nenhuma pendência técnica crítica de runtime mapeada que bloqueie a operação.

---

### DECISÃO FINAL:
**GO PARA HOMOLOGAÇÃO OPERACIONAL EM PRODUÇÃO**

(Aguardando testes manuais operacionais do usuário final para mudar a chave de status permanente).
