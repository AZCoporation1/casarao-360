// =============================================
// Casarão Real Layout Configuration
// Central Casarão 360 — Configuração oficial
// =============================================

import type { Table } from '@/lib/types';

// ---- Constantes oficiais do Casarão ----
export const CASARAO_LAYOUT = {
  internalFourTopTables: 22,
  internalTwoTopTables: 12,
  outdoorFourTopTables: 20,
  totalTables: 54,
  totalCapacity: 192,
  internalCapacity: 112,  // 22*4 + 12*2
  outdoorCapacity: 80,    // 20*4
  internalTables: 34,
  outdoorTables: 20,
} as const;

// ---- Setores ----
export const SECTORS = {
  PALCO_PRINCIPAL: 'PalcoPrincipal',
  SALAO_PRINCIPAL: 'SalaoPrincipal',
  AREA_VIP: 'VIP',
  AREA_FAMILIA: 'AreaFamilia',
  AREA_BAR: 'AreaBar',
  EXTERNO: 'Externo',
} as const;

// ---- Geração de mesas internas de 4 lugares (I-01 a I-22) ----
function generateInternalFourTopTables(): Table[] {
  const tables: Table[] = [];

  // Fileira 1 — Próximo ao palco (I-01 a I-06) — y ~22%
  const row1 = [
    { id: 'I-01', x: 18, y: 22, sector: SECTORS.PALCO_PRINCIPAL, features: ['Próximo ao palco', 'Visão privilegiada', 'Experiência premium'] },
    { id: 'I-02', x: 30, y: 22, sector: SECTORS.PALCO_PRINCIPAL, features: ['Próximo ao palco', 'Visão frontal', 'Experiência premium'] },
    { id: 'I-03', x: 42, y: 22, sector: SECTORS.PALCO_PRINCIPAL, features: ['Próximo ao palco', 'Visão central'] },
    { id: 'I-04', x: 54, y: 22, sector: SECTORS.PALCO_PRINCIPAL, features: ['Próximo ao palco', 'Visão central'] },
    { id: 'I-05', x: 66, y: 22, sector: SECTORS.PALCO_PRINCIPAL, features: ['Próximo ao palco', 'Visão lateral'] },
    { id: 'I-06', x: 78, y: 22, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Próximo ao palco', 'Atendimento exclusivo'] },
  ];

  // Fileira 2 — Salão central (I-07 a I-12) — y ~36%
  const row2 = [
    { id: 'I-07', x: 18, y: 36, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Acesso fácil'] },
    { id: 'I-08', x: 30, y: 36, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Ambiente central'] },
    { id: 'I-09', x: 42, y: 36, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Ambiente central'] },
    { id: 'I-10', x: 54, y: 36, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Boa circulação'] },
    { id: 'I-11', x: 66, y: 36, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Atendimento exclusivo'] },
    { id: 'I-12', x: 78, y: 36, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Atendimento exclusivo', 'Experiência premium'] },
  ];

  // Fileira 3 — Salão meio (I-13 a I-17) — y ~50%
  const row3 = [
    { id: 'I-13', x: 22, y: 50, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Ambiente agradável'] },
    { id: 'I-14', x: 36, y: 50, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Ambiente central'] },
    { id: 'I-15', x: 50, y: 50, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Posição central'] },
    { id: 'I-16', x: 64, y: 50, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Boa visibilidade'] },
    { id: 'I-17', x: 78, y: 50, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Ambiente reservado'] },
  ];

  // Fileira 4 — Fundo/Família (I-18 a I-22) — y ~64%
  const row4 = [
    { id: 'I-18', x: 22, y: 64, sector: SECTORS.AREA_FAMILIA, features: ['Ideal para famílias', 'Ambiente mais reservado', 'Mais tranquilo'] },
    { id: 'I-19', x: 36, y: 64, sector: SECTORS.AREA_FAMILIA, features: ['Ideal para famílias', 'Ambiente mais reservado'] },
    { id: 'I-20', x: 50, y: 64, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Ambiente confortável'] },
    { id: 'I-21', x: 64, y: 64, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Acesso fácil'] },
    { id: 'I-22', x: 78, y: 64, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Próximo à circulação'] },
  ];

  [...row1, ...row2, ...row3, ...row4].forEach(t => {
    tables.push({
      id: `t-${t.id}`,
      number: t.id,
      sector: t.sector as Table['sector'],
      capacity: 4,
      status: 'livre',
      x: t.x,
      y: t.y,
      features: t.features,
    });
  });

  return tables;
}

// ---- Geração de mesas internas de 2 lugares (D-01 a D-12) ----
function generateInternalTwoTopTables(): Table[] {
  const tables: Table[] = [];

  // Mesas de 2 lugares ficam nas bordas e laterais
  const positions = [
    // Lateral esquerda (próximo ao bar)
    { id: 'D-01', x: 8,  y: 28, sector: SECTORS.AREA_BAR, features: ['Próximo ao bar', 'Fácil acesso', 'Mesa íntima'] },
    { id: 'D-02', x: 8,  y: 40, sector: SECTORS.AREA_BAR, features: ['Próximo ao bar', 'Ambiente descontraído'] },
    { id: 'D-03', x: 8,  y: 52, sector: SECTORS.AREA_BAR, features: ['Próximo ao bar', 'Mesa romântica'] },
    { id: 'D-04', x: 8,  y: 64, sector: SECTORS.AREA_BAR, features: ['Próximo ao bar', 'Ambiente reservado'] },
    // Lateral direita (VIP)
    { id: 'D-05', x: 90, y: 28, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Mesa exclusiva', 'Atendimento diferenciado'] },
    { id: 'D-06', x: 90, y: 40, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Mesa exclusiva'] },
    { id: 'D-07', x: 90, y: 52, sector: SECTORS.AREA_VIP, features: ['Área VIP', 'Ambiente reservado'] },
    // Fundo do salão
    { id: 'D-08', x: 18, y: 76, sector: SECTORS.AREA_FAMILIA, features: ['Mais tranquilo', 'Ideal para casais'] },
    { id: 'D-09', x: 34, y: 76, sector: SECTORS.AREA_FAMILIA, features: ['Ambiente mais reservado', 'Mais tranquilo'] },
    { id: 'D-10', x: 50, y: 76, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Mesa compacta'] },
    { id: 'D-11', x: 66, y: 76, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Fácil acesso'] },
    { id: 'D-12', x: 82, y: 76, sector: SECTORS.SALAO_PRINCIPAL, features: ['Salão principal', 'Próximo à circulação'] },
  ];

  positions.forEach(t => {
    tables.push({
      id: `t-${t.id}`,
      number: t.id,
      sector: t.sector as Table['sector'],
      capacity: 2,
      status: 'livre',
      x: t.x,
      y: t.y,
      features: t.features,
    });
  });

  return tables;
}

// ---- Geração de mesas externas de 4 lugares (E-01 a E-20) ----
function generateExternalFourTopTables(): Table[] {
  const tables: Table[] = [];

  // Grid 5x4 na área externa
  const cols = 5;
  const rows = 4;
  const startX = 12;
  const endX = 88;
  const startY = 12;
  const endY = 88;
  const spacingX = (endX - startX) / (cols - 1);
  const spacingY = (endY - startY) / (rows - 1);

  let idx = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const num = String(idx).padStart(2, '0');
      tables.push({
        id: `t-E-${num}`,
        number: `E-${num}`,
        sector: 'Externo',
        capacity: 4,
        status: 'livre',
        x: Math.round(startX + col * spacingX),
        y: Math.round(startY + row * spacingY),
        features: ['Área externa', 'Ambiente aberto', idx <= 5 ? 'Vista privilegiada' : 'Ideal para grupos', 'Experiência descontraída'],
      });
      idx++;
    }
  }

  return tables;
}

// ---- Gerar todas as 54 mesas ----
export function generateAllTables(): Table[] {
  return [
    ...generateInternalFourTopTables(),
    ...generateInternalTwoTopTables(),
    ...generateExternalFourTopTables(),
  ];
}

// ---- Gerar mesas apenas internas ----
export function generateInternalTables(): Table[] {
  return [
    ...generateInternalFourTopTables(),
    ...generateInternalTwoTopTables(),
  ];
}

// ---- Gerar mesas apenas externas ----
export function generateExternalTables(): Table[] {
  return generateExternalFourTopTables();
}

// ---- Status variados para demo realista ----
export function generateDemoTables(): Table[] {
  const tables = generateAllTables();

  // Aplicar status variados para demo mais realista
  const statusOverrides: Record<string, Table['status']> = {
    't-I-01': 'ocupada',
    't-I-02': 'reservada',
    't-I-04': 'aguardando',
    't-I-06': 'reservada',
    't-I-11': 'reservada',
    't-I-12': 'ocupada',
    't-D-05': 'reservada',
    't-D-06': 'bloqueada',
    't-I-15': 'ocupada',
    't-I-18': 'reservada',
    't-E-03': 'reservada',
    't-E-08': 'ocupada',
    't-E-12': 'aguardando',
    't-E-15': 'reservada',
  };

  return tables.map(t => ({
    ...t,
    status: statusOverrides[t.id] || t.status,
  }));
}

// ---- Sector labels para display ----
export const SECTOR_LABELS: Record<string, string> = {
  PalcoPrincipal: 'Palco Principal',
  SalaoPrincipal: 'Salão Principal',
  VIP: 'Área VIP',
  AreaFamilia: 'Área Família',
  AreaBar: 'Área do Bar',
  Externo: 'Área Externa',
  Entrada: 'Entrada',
  Principal: 'Salão Principal',
  ProximaPalco: 'Próximo ao Palco',
  Familiar: 'Área Família',
  Bar: 'Bar',
};

export function getSectorLabel(sector: string): string {
  return SECTOR_LABELS[sector] || sector;
}
