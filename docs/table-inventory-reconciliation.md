# Table Inventory Reconciliation — Central Casarão 360

**Data:** 2026-08-20
**Versão:** LEGACY_OPERATIONAL_V1 (congelada)

## Inventário Atual em Produção

| Setor | Código(s) | Qtd | Capacidade | Uso Histórico | Status |
|-------|-----------|-----|-----------|---------------|--------|
| Palco Principal | I-01, I-02, I-03, I-04, I-05 | 5 | 4 cada | I-04, I-05, I-09 com reservas | Ativo |
| Área VIP | D-05, D-06, D-07, I-06, I-11, I-12, I-17 | 7 | 2-4 misto | Nenhuma reserva | Ativo |
| Área Principal | D-10, D-11, D-12, I-07-I-10, I-13-I-16, I-20-I-22 | 14 | 4 | I-09 com reserva | Ativo |
| Área Família | D-08, D-09, I-18, I-19 | 4 | 4 | Nenhuma reserva | Ativo |
| Bar | D-01, D-02, D-03, D-04 | 4 | 2 | Nenhuma reserva | Ativo |
| Área Externa | E-01 a E-20 | 20 | 4 | Nenhuma reserva | Ativo |
| **TOTAL** | | **54** | **192 lugares** | | |

## Informação Posterior dos Proprietários

| Área | Numeração | Qtd | Observação |
|------|-----------|-----|-----------|
| Internas | 01–25 | 25 | Sem correspondência com I-/D- |
| Externas | 29–50 | 22 | Sem correspondência com E- |
| **Indefinidas** | **26, 27, 28** | **?** | NÃO inventadas |
| **Total aparente** | | **47** | **Pendente reconciliação** |

## Decisão

1. **LEGACY_OPERATIONAL_V1** permanece ativa e congelada
2. Nova planta **PHYSICAL_RECONCILIATION_DRAFT** será criada quando proprietários confirmarem layout final
3. Mesas 26-28 NÃO serão inventadas
4. Reservas existentes mantêm vínculo com IDs originais
5. Nenhuma conversão de código será feita automaticamente

## Pendências

- [ ] Reunião com proprietários para confirmar correspondência I-/D- → 01-25
- [ ] Confirmar se mesas 26-28 existem fisicamente
- [ ] Definir correspondência E- → 29-50
- [ ] Criar nova versão de planta após confirmação

---

## PHYSICAL_INTERNAL_V1 — 2026-09-01 (planta interna real, fornecida pelo proprietário)

O proprietário forneceu o "MAPA DO SALÃO" oficial da parte interna, resolvendo
o conflito documentado acima PARA O SALÃO INTERNO. Migration `00024`.

**Layout físico:** Palco no topo (centro-direita) · Entrada no canto superior
esquerdo · Balcão de Pagamento ao lado da entrada · Bar na parede inferior ·
Janelas na parede direita · 5 fileiras (F1–F5).

**Mesas internas (21 mesas / 70 lugares):**

| Fileira | Mesas (esq→dir) | Capacidades |
|---|---|---|
| F1 | 01 · 02 | 4 · 4 (frente do palco, afastadas) |
| F2 | 12 · 11 · 10 · 09 · 08 | 2 · 4 · 4 · 4 · 2 |
| F3 | 17 · 16 · 15 · 14 · 13 | 4 · 2 · 4 · 2 · 4 |
| F4 | 22 · 21 · 20 · 19 · 18 | 2 · 4 · 4 · 4 · 2 |
| F5 | 26 · 25 · 24 · 23 | 4 · 4 · 4 · 2 |

- Códigos **03–07 não existem** na planta (numeração com lacuna intencional do proprietário).
- Vermelhas = 4 lugares (14 mesas); verdes = 2 lugares (7 mesas).
- **Join rules** (deny-by-default): permitidas apenas vermelha+vermelha adjacentes
  na mesma fileira (10+11, 09+10, 20+21, 19+20, 25+26, 24+25); **01+02 negada
  explícita** (§34, agora confirmado fisicamente); pares mistos e entre fileiras
  ausentes até aprovação do proprietário.

**Aplicação:** eventos FUTUROS usam a planta nova; eventos REALIZADOS permanecem
na LEGACY_OPERATIONAL_V1 (event_tables intactos). As 34 mesas internas legadas
(I-01..I-22, D-01..D-12) ficaram `is_active=false` em venue_tables; no Bom Jovi,
3 event_tables legadas referenciadas por reservas expiradas (I-05, I-06, I-12)
foram mantidas com `event_tables.is_active=false` + `blocked` por integridade.

**Pendência:** planta EXTERNA continua LEGACY (E-01..E-20, 20×4 = 80 lugares)
até o proprietário fornecer o mapa externo (numeração 29–50 mencionada
historicamente segue não confirmada). Total atual por evento futuro:
21 internas + 20 externas = 41 mesas / 150 lugares.
