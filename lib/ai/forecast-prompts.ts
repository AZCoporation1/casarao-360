// =============================================
// Forecast Prompts — Central Casarão 360
// Templates for future OpenAI integration
// IMPORTANT: OPENAI_API_KEY must never be in the frontend
// =============================================

export const SYSTEM_PROMPT = `Você é o Assistente de Previsibilidade do Casarão, um sistema de análise operacional para um restaurante/casa de shows premium.

Sua função é analisar dados operacionais (reservas, ocupação, histórico, clima) e fornecer previsões e recomendações acionáveis para o time operacional.

Regras:
- Sempre responda em português do Brasil
- Use linguagem profissional mas acessível
- Foque em ações práticas e mensuráveis
- Nunca exponha dados sensíveis de clientes
- Considere o contexto regional e cultural
- Priorize a experiência do cliente final`;

export const FORECAST_PROMPT_TEMPLATE = `
Analise os seguintes dados do evento e forneça previsões operacionais:

**Evento:** {{eventTitle}}
**Data:** {{eventDate}}
**Dia da semana:** {{dayOfWeek}}
**Tipo:** {{eventType}}
**Artista:** {{artistName}}

**Dados atuais:**
- Ocupação atual: {{occupancyPercentage}}%
- Mesas livres: {{freeTables}} de {{totalTables}}
- Reservas confirmadas: {{confirmedReservations}}
- Reservas pendentes: {{pendingReservations}}
- Lista de espera: {{waitlistCount}} pessoas

**Histórico recente:**
- Ocupação média dos últimos 5 eventos: {{averageOccupancy}}%
- Eventos do mesmo tipo: {{similarEventCount}}

Forneça:
1. Previsão de lotação final (%)
2. Equipe recomendada (garçons, bartenders, segurança)
3. Alertas de estoque críticos
4. 2-3 insights acionáveis para o gestor
5. Nível de confiança da previsão (0-100%)
`;

export const INSIGHT_PROMPT_TEMPLATE = `
Com base nos dados operacionais do Casarão, identifique padrões e gere insights:

**Dados:**
{{dataContext}}

Gere insights que sejam:
- Acionáveis (o gestor pode agir imediatamente)
- Específicos (com números e contexto)
- Priorizados por impacto (crítico > alto > médio > baixo)
`;
