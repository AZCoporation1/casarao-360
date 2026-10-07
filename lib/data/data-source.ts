// =============================================
// Data Source — Central Casarão 360
// Chooses between mock and supabase repositories
// =============================================

export type DataMode = 'mock' | 'supabase';

/**
 * Falha real de acesso a dados em modo supabase. NUNCA mascarar com dados
 * mock (handoff §92) — as rotas capturam via error boundary e oferecem retry.
 */
export class DataSourceError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DataSourceError';
    this.cause = cause;
  }
}

export function getDataMode(): DataMode {
  const mode = (process.env.NEXT_PUBLIC_DATA_MODE || '').trim();
  if (mode === 'supabase') return 'supabase';
  // Produção NUNCA roda em mock — falhar alto em vez de inventar dados (§92)
  if (process.env.NODE_ENV === 'production') {
    throw new DataSourceError(
      'Configuração inválida: NEXT_PUBLIC_DATA_MODE precisa ser "supabase" em produção. Fallback mock é proibido.'
    );
  }
  return 'mock';
}

export function isSupabaseMode(): boolean {
  return getDataMode() === 'supabase';
}

export function isMockMode(): boolean {
  return getDataMode() === 'mock';
}
