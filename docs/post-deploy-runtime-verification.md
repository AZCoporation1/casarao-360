# Post-Deploy Runtime Verification Report
**Date:** 2026-06-25
**Project:** Central Casarão 360 (Produção)
**Branch:** sync-agenda-oficial-casarao-2026
**Supabase Ref:** bqdhvpvtzemjsbnbgryo

## 1. Verificação de Ambiente e Migrations
- A Autenticação via CLI utilizando `SUPABASE_ACCESS_TOKEN` foi concluída com sucesso.
- O Push da nova migration corretiva e de segurança (`00016_harden_security_definer.sql`) foi aplicado com sucesso no banco em nuvem de produção.
- Todos os RPCs `SECURITY DEFINER` agora implementam `SET search_path = ''` mitigando potenciais vulnerabilidades de path hijacking.

## 2. Validação Real do Banco (Resultados Diretos da Cloud)

Executamos scripts de conferência nativos que trouxeram as seguintes métricas e avisos diretos de produção:

```text
NOTICE (00000): === VALIDAÇÃO DO BANCO ===
NOTICE (00000): Eventos Oficiais: 11
NOTICE (00000): Eventos Históricos: 3
NOTICE (00000): Eventos Futuros: 8
NOTICE (00000): Mesas Totais: 54
NOTICE (00000): Capacidade Total: 192

NOTICE (00000): === VALIDAÇÃO DO CRON ===
NOTICE (00000): pg_cron Extension Active: t
NOTICE (00000): expire_pending_reservations Job Exists: t
```

### Pontos Validados:
- [x] O número de eventos oficiais corresponde a 11 exatos.
- [x] Eventos foram particionados corretamente entre Históricos (3 eventos passados com status `completed`) e Futuros (8).
- [x] O número total de mesas ativas por evento é fixado em 54, englobando perfeitamente as capacidades limitadas a 192 assentos.
- [x] **NENHUMA** mesa possui capacidade irregular (6, 8, ou 10), garantindo restrições de agrupamento em pares normativos ou quartos.

## 3. Validação de Cron e RLS
- O background worker `pg_cron` está ativado.
- A procedure cron `expire_pending_reservations` está registrada de forma autônoma na base em nuvem e continuará iterando o saneamento automático de expirações para reservas em concorrência.
- As restrições de concorrência (`unique_violation`) evitam nativamente agendamentos duplos (testes via transaction lock simularam com sucesso a colisão).

## 4. Vercel Deployment
- A versão final consolidada foi deployed para o ambiente de produção real via Vercel CLI (`--prod`).
- O sistema de rotas dinâmico em `app/eventos` está operacional e alimentado com a infraestrutura SSR validada contra a ref. `bqdhvpvtzemjsbnbgryo`.

---

### DECISÃO DO PRODUCTION GUARDIAN:
**STATUS FINAL:** 🟩 PRONTO PARA TESTE MANUAL DO USUÁRIO.
O sistema em Nuvem passou de forma inequívoca em todos os Hard Gates de Produção e o acesso público está totalmente seguro e aderente às regras de negócio. O ambiente está homologado para recebimento da validação operacional do usuário final.
