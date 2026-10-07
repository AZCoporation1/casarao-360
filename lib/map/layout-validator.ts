// =============================================
// Layout Validator — Central Casarão 360
// Valida posições de mesas no mapa para evitar
// sobreposições e garantir integridade visual
// =============================================

import type { Table } from '@/lib/types';
import { CASARAO_LAYOUT } from './casarao-layout';

export interface ValidationIssue {
  type: 'overlap' | 'out_of_bounds' | 'too_close' | 'collision_with_fixture' | 'count_mismatch';
  severity: 'error' | 'warning';
  message: string;
  tableIds?: string[];
}

export interface LayoutValidationReport {
  valid: boolean;
  totalTables: number;
  totalCapacity: number;
  internalFourTop: number;
  internalTwoTop: number;
  externalFourTop: number;
  issues: ValidationIssue[];
  sectorCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

// ---- Fixtures (áreas fixas do mapa que mesas não podem sobrepor) ----
// Coordenadas em % relativas ao container
const FIXTURES = {
  // O palco ocupa a parte superior central
  stage: { x: 25, y: 0, width: 50, height: 14 },
  // O bar ocupa a lateral esquerda inferior (na planta interna)
  // bar: { x: 0, y: 75, width: 15, height: 20 },
  // Entrada na parte inferior central
  // entrance: { x: 35, y: 85, width: 30, height: 15 },
};

// ---- Dimensões estimadas de mesas em % ----
const TABLE_SIZE = {
  fourTop: { width: 8, height: 8 },
  twoTop: { width: 6, height: 6 },
};

function getTableSize(capacity: number) {
  return capacity <= 2 ? TABLE_SIZE.twoTop : TABLE_SIZE.fourTop;
}

function tablesOverlap(a: Table, b: Table): boolean {
  const sizeA = getTableSize(a.capacity);
  const sizeB = getTableSize(b.capacity);

  const halfAW = sizeA.width / 2;
  const halfAH = sizeA.height / 2;
  const halfBW = sizeB.width / 2;
  const halfBH = sizeB.height / 2;

  return (
    a.x - halfAW < b.x + halfBW &&
    a.x + halfAW > b.x - halfBW &&
    a.y - halfAH < b.y + halfBH &&
    a.y + halfAH > b.y - halfBH
  );
}

function isOutOfBounds(table: Table): boolean {
  const size = getTableSize(table.capacity);
  const half = size.width / 2;

  return (
    table.x - half < 0 ||
    table.x + half > 100 ||
    table.y - size.height / 2 < 0 ||
    table.y + size.height / 2 > 100
  );
}

function collidesWithFixture(table: Table): string | null {
  const size = getTableSize(table.capacity);
  const halfW = size.width / 2;
  const halfH = size.height / 2;

  for (const [name, fixture] of Object.entries(FIXTURES)) {
    if (
      table.x - halfW < fixture.x + fixture.width &&
      table.x + halfW > fixture.x &&
      table.y - halfH < fixture.y + fixture.height &&
      table.y + halfH > fixture.y
    ) {
      return name;
    }
  }
  return null;
}

function distanceBetween(a: Table, b: Table): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---- Main validation function ----
export function validateLayout(tables: Table[]): LayoutValidationReport {
  const issues: ValidationIssue[] = [];

  // Count types
  const internalFourTop = tables.filter(t => !t.number.startsWith('E-') && t.capacity === 4).length;
  const internalTwoTop = tables.filter(t => t.number.startsWith('D-') && t.capacity === 2).length;
  const externalFourTop = tables.filter(t => t.number.startsWith('E-') && t.capacity === 4).length;
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  // Sector counts
  const sectorCounts: Record<string, number> = {};
  tables.forEach(t => {
    sectorCounts[t.sector] = (sectorCounts[t.sector] || 0) + 1;
  });

  // Status counts
  const statusCounts: Record<string, number> = {};
  tables.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  // ---- Validate counts ----
  if (tables.length !== CASARAO_LAYOUT.totalTables) {
    issues.push({
      type: 'count_mismatch',
      severity: 'error',
      message: `Total de mesas: ${tables.length}, esperado: ${CASARAO_LAYOUT.totalTables}`,
    });
  }

  if (totalCapacity !== CASARAO_LAYOUT.totalCapacity) {
    issues.push({
      type: 'count_mismatch',
      severity: 'error',
      message: `Capacidade total: ${totalCapacity}, esperado: ${CASARAO_LAYOUT.totalCapacity}`,
    });
  }

  if (internalFourTop !== CASARAO_LAYOUT.internalFourTopTables) {
    issues.push({
      type: 'count_mismatch',
      severity: 'error',
      message: `Mesas internas 4 lugares: ${internalFourTop}, esperado: ${CASARAO_LAYOUT.internalFourTopTables}`,
    });
  }

  if (internalTwoTop !== CASARAO_LAYOUT.internalTwoTopTables) {
    issues.push({
      type: 'count_mismatch',
      severity: 'error',
      message: `Mesas internas 2 lugares: ${internalTwoTop}, esperado: ${CASARAO_LAYOUT.internalTwoTopTables}`,
    });
  }

  if (externalFourTop !== CASARAO_LAYOUT.outdoorFourTopTables) {
    issues.push({
      type: 'count_mismatch',
      severity: 'error',
      message: `Mesas externas 4 lugares: ${externalFourTop}, esperado: ${CASARAO_LAYOUT.outdoorFourTopTables}`,
    });
  }

  // ---- Validate positions ----
  // Only check overlaps within same area (internal vs external)
  const internalTables = tables.filter(t => !t.number.startsWith('E-'));
  const externalTables = tables.filter(t => t.number.startsWith('E-'));

  function checkOverlapsInGroup(group: Table[], groupName: string) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (tablesOverlap(group[i], group[j])) {
          issues.push({
            type: 'overlap',
            severity: 'error',
            message: `Sobreposição em ${groupName}: ${group[i].number} e ${group[j].number}`,
            tableIds: [group[i].id, group[j].id],
          });
        }

        const dist = distanceBetween(group[i], group[j]);
        if (dist < 5 && dist > 0) {
          issues.push({
            type: 'too_close',
            severity: 'warning',
            message: `Mesas muito próximas em ${groupName}: ${group[i].number} e ${group[j].number} (${dist.toFixed(1)}%)`,
            tableIds: [group[i].id, group[j].id],
          });
        }
      }
    }
  }

  checkOverlapsInGroup(internalTables, 'Salão Interno');
  checkOverlapsInGroup(externalTables, 'Área Externa');

  // Check out of bounds
  tables.forEach(table => {
    if (isOutOfBounds(table)) {
      issues.push({
        type: 'out_of_bounds',
        severity: 'error',
        message: `Mesa ${table.number} fora dos limites do mapa (x:${table.x}, y:${table.y})`,
        tableIds: [table.id],
      });
    }
  });

  // Check fixture collisions (only for internal tables)
  internalTables.forEach(table => {
    const fixture = collidesWithFixture(table);
    if (fixture) {
      issues.push({
        type: 'collision_with_fixture',
        severity: 'error',
        message: `Mesa ${table.number} colide com ${fixture} (x:${table.x}, y:${table.y})`,
        tableIds: [table.id],
      });
    }
  });

  // Check for missing features
  tables.forEach(table => {
    if (!table.features || table.features.length === 0) {
      issues.push({
        type: 'count_mismatch',
        severity: 'warning',
        message: `Mesa ${table.number} sem features definidas`,
        tableIds: [table.id],
      });
    }
  });

  const valid = issues.filter(i => i.severity === 'error').length === 0;

  return {
    valid,
    totalTables: tables.length,
    totalCapacity,
    internalFourTop,
    internalTwoTop,
    externalFourTop,
    issues,
    sectorCounts,
    statusCounts,
  };
}

// ---- Console report for dev mode ----
export function printLayoutReport(report: LayoutValidationReport): void {
  console.group('🗺️ Casarão Layout Validation Report');
  console.log(`Status: ${report.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
  console.log(`Total: ${report.totalTables} mesas | ${report.totalCapacity} lugares`);
  console.log(`Internas 4 lug: ${report.internalFourTop} | Internas 2 lug: ${report.internalTwoTop} | Externas 4 lug: ${report.externalFourTop}`);
  console.log('Setores:', report.sectorCounts);
  console.log('Status:', report.statusCounts);

  if (report.issues.length > 0) {
    console.group(`⚠️ ${report.issues.length} issues encontrados:`);
    report.issues.forEach(issue => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} [${issue.type}] ${issue.message}`);
    });
    console.groupEnd();
  }
  console.groupEnd();
}
