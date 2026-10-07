"use client";

import { useState, useMemo, useCallback, memo } from 'react';
import { Table, TableStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Users, Star, ZoomIn, ZoomOut, Maximize2, TreePine, Check } from 'lucide-react';

interface VenueMapProps {
  tables: Table[];
  onSelectTable: (table: Table) => void;
  selectedTableId?: string;
  selectedTableIds?: string[];
  /** Mesas livres NÃO combináveis com a seleção atual (estado roxo, contextual de UI — não é status do banco) */
  incompatibleTableIds?: string[];
  mode?: 'client' | 'admin';
}

// Cores por STATUS (handoff §59): verde livre · âmbar hold · vermelho
// confirmada · cinza bloqueada · roxo incompatível (contextual). A cor NUNCA
// comunica capacidade — capacidade vem do formato da mesa + badge + aria.
const statusSurface: Record<TableStatus, string> = {
  livre: 'bg-verde-oliva border-verde-oliva/60 text-white',
  aguardando: 'bg-ambar-premium border-ambar-premium/70 text-preto-carvao animate-pulse shadow-[0_0_14px_rgba(245,158,11,0.5)]',
  reservada: 'bg-vermelho-brasa border-red-300/60 text-white shadow-[0_0_10px_rgba(179,38,22,0.45)]',
  ocupada: 'bg-[#7c1b10] border-vermelho-brasa/60 text-white/90',
  bloqueada: 'bg-preto-carvao border-marrom-madeira text-marrom-madeira/90 opacity-80',
  'lista-espera': 'bg-indigo-900 border-indigo-700 text-white',
};

const statusLabels: Record<TableStatus, string> = {
  livre: 'Disponível',
  reservada: 'Reservada',
  ocupada: 'Ocupada',
  bloqueada: 'Bloqueada',
  aguardando: 'Aguardando',
  'lista-espera': 'Lista de Espera',
};

// Encosto de cadeira (madeira) — 2 por lado nas mesas de 4, 1 nas de 2
function ChairRow({ count, side }: { count: number; side: 'top' | 'bottom' }) {
  return (
    <span className={cn('flex justify-center gap-[4px]', side === 'top' ? 'mb-[2px]' : 'mt-[2px]')} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-[3px] w-2 md:h-[4px] md:w-2.5 bg-[#7a4a26] border border-[#a06a38]/50',
            side === 'top' ? 'rounded-t-sm' : 'rounded-b-sm'
          )}
        />
      ))}
    </span>
  );
}

// ---- Table Node (memoized) ----
// Mesa com o formato do salão real: tampo retangular + cadeiras, cor = status.
const TableNode = memo(function TableNode({
  table,
  isSelected,
  isIncompatible,
  isJoinHint,
  index,
  onClick,
  mode,
}: {
  table: Table;
  isSelected: boolean;
  isIncompatible: boolean;
  isJoinHint: boolean;
  index: number;
  onClick: () => void;
  mode: 'client' | 'admin';
}) {
  const isSelectable = (table.status === 'livre' && !isIncompatible) || mode === 'admin';
  const isSmall = table.capacity <= 2;
  const statusText = isIncompatible ? 'Não combinável com a mesa selecionada' : statusLabels[table.status];
  const chairsPerSide = isSmall ? 1 : 2;

  return (
    <button
      disabled={!isSelectable && table.status !== 'lista-espera'}
      aria-disabled={!isSelectable && table.status !== 'lista-espera'}
      aria-label={`Mesa ${table.number} — ${statusText} — ${table.capacity} lugares`}
      onClick={onClick}
      style={{ left: `${table.x}%`, top: `${table.y}%` }}
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 z-10 group',
        isSelected && 'z-20',
        isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'
      )}
      title={`Mesa ${table.number} — ${statusText} — ${table.capacity} lugares`}
    >
      <span
        className="flex flex-col items-center animate-table-pop"
        style={{ animationDelay: `${Math.min(index * 18, 560)}ms` }}
      >
        <ChairRow count={chairsPerSide} side="top" />

        {/* Tampo — cor comunica STATUS; forma comunica capacidade */}
        <span
          className={cn(
            'relative flex flex-col items-center justify-center rounded-md border-2 transition-all duration-200 shadow-md leading-none',
            isSmall ? 'w-8 h-6 md:w-11 md:h-8' : 'w-12 h-7 md:w-16 md:h-9',
            isIncompatible
              ? 'bg-purple-900 border-purple-500 text-purple-200 opacity-90'
              : statusSurface[table.status],
            isSelected && 'ring-2 ring-creme-gastronomico animate-selected-glow scale-110',
            !isSelected && isJoinHint && 'animate-join-hint',
            isSelectable && !isSelected && 'group-hover:scale-110 group-hover:brightness-110 group-hover:shadow-lg'
          )}
        >
          <span className={cn('font-bold flex items-center gap-[2px]', isSmall ? 'text-[9px] md:text-[11px]' : 'text-[10px] md:text-sm')}>
            {table.status === 'reservada' && !isIncompatible && <Check className={cn(isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5')} />}
            {table.number}
          </span>
          <span className={cn('font-medium opacity-80 flex items-center gap-px', isSmall ? 'text-[6px] md:text-[8px]' : 'text-[7px] md:text-[9px]')}>
            <Users className={cn(isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
            {table.capacity}
          </span>
        </span>

        <ChairRow count={chairsPerSide} side="bottom" />
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-preto-carvao border border-marrom-madeira text-creme-gastronomico rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-xl z-50 flex flex-col items-center">
        <span className="font-bold text-xs">Mesa {table.number}</span>
        <span className="text-[10px] text-creme-gastronomico/70">{statusText} • {table.capacity} lug.</span>
        {table.features && table.features.length > 0 && (
          <span className="text-[9px] text-ambar-premium/80 mt-0.5">{table.features[0]}</span>
        )}
        {isJoinHint && !isSelected && (
          <span className="text-[9px] text-verde-oliva mt-0.5 font-semibold">Combinável com a sua seleção</span>
        )}
        {(table as Table & { reservationCode?: string }).reservationCode && (
          <span className="text-[10px] text-laranja-fogo font-mono mt-1 px-1.5 py-0.5 bg-laranja-fogo/10 rounded border border-laranja-fogo/20">{(table as Table & { reservationCode?: string }).reservationCode}</span>
        )}
      </div>
    </button>
  );
});

// ---- Main VenueMap ----
export function VenueMap({ tables, onSelectTable, selectedTableId, selectedTableIds, incompatibleTableIds, mode = 'client' }: VenueMapProps) {
  const [zoom, setZoom] = useState(1);
  const [activeArea, setActiveArea] = useState<'all' | 'interno' | 'externo'>('all');

  const selectedIds = useMemo(() => {
    if (selectedTableIds && selectedTableIds.length > 0) return selectedTableIds;
    if (selectedTableId) return [selectedTableId];
    return [];
  }, [selectedTableIds, selectedTableId]);

  const incompatibleIds = useMemo(() => new Set(incompatibleTableIds ?? []), [incompatibleTableIds]);

  // Combináveis com a seleção atual: com exatamente 1 mesa selecionada, as
  // livres fora do conjunto incompatível "respiram" convidando o 2º clique.
  const joinHintIds = useMemo(() => {
    if (mode !== 'client' || selectedIds.length !== 1 || incompatibleTableIds === undefined) {
      return new Set<string>();
    }
    return new Set(
      tables
        .filter(t => t.status === 'livre' && !incompatibleIds.has(t.id) && !selectedIds.includes(t.id))
        .map(t => t.id)
    );
  }, [mode, selectedIds, incompatibleTableIds, incompatibleIds, tables]);

  // Separate internal and external tables
  const { internalTables, externalTables } = useMemo(() => ({
    internalTables: tables.filter(t => !t.number.startsWith('E-')),
    externalTables: tables.filter(t => t.number.startsWith('E-')),
  }), [tables]);

  // Stats
  const stats = useMemo(() => {
    const displayed = activeArea === 'interno' ? internalTables
      : activeArea === 'externo' ? externalTables
      : tables;
    return {
      total: displayed.length,
      livres: displayed.filter(t => t.status === 'livre').length,
      capacidade: displayed.reduce((s, t) => s + t.capacity, 0),
    };
  }, [tables, internalTables, externalTables, activeArea]);

  const handleSelect = useCallback((table: Table) => {
    onSelectTable(table);
  }, [onSelectTable]);

  const showInternal = activeArea === 'all' || activeArea === 'interno';
  const showExternal = activeArea === 'all' || activeArea === 'externo';

  return (
    <div className="w-full space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveArea('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
              activeArea === 'all'
                ? "bg-laranja-fogo text-preto-carvao"
                : "bg-marrom-madeira/20 text-creme-gastronomico/70 hover:bg-marrom-madeira/30"
            )}
          >
            Tudo ({tables.length})
          </button>
          <button
            onClick={() => setActiveArea('interno')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
              activeArea === 'interno'
                ? "bg-laranja-fogo text-preto-carvao"
                : "bg-marrom-madeira/20 text-creme-gastronomico/70 hover:bg-marrom-madeira/30"
            )}
          >
            Interno ({internalTables.length})
          </button>
          <button
            onClick={() => setActiveArea('externo')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
              activeArea === 'externo'
                ? "bg-laranja-fogo text-preto-carvao"
                : "bg-marrom-madeira/20 text-creme-gastronomico/70 hover:bg-marrom-madeira/30"
            )}
          >
            Externo ({externalTables.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-creme-gastronomico/60 font-medium">
          <span>{stats.livres} livres</span>
          <span className="text-marrom-madeira">•</span>
          <span>{stats.capacidade} lugares</span>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 ml-2 bg-marrom-madeira/20 rounded-md px-1">
            <button aria-label="Diminuir zoom" onClick={() => setZoom(z => Math.max(0.7, z - 0.15))} className="p-1 hover:text-creme-gastronomico transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button aria-label="Restaurar zoom" onClick={() => setZoom(1)} className="p-1 hover:text-creme-gastronomico transition-colors">
              <Maximize2 className="w-3 h-3" />
            </button>
            <button aria-label="Aumentar zoom" onClick={() => setZoom(z => Math.min(1.6, z + 0.15))} className="p-1 hover:text-creme-gastronomico transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="overflow-auto rounded-xl border border-marrom-madeira/30 bg-preto-carvao shadow-2xl">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}
          className="transition-transform duration-200"
        >
          {/* Internal Salon — espelho da planta física real (PHYSICAL_INTERNAL_V1):
              Palco no topo, Entrada no canto superior esquerdo, Balcão de
              Pagamento ao lado, fileiras F1–F5, Bar na parede inferior e
              janelas à direita */}
          {showInternal && (
            <div className="relative w-full aspect-[4/5] sm:aspect-[5/4] md:aspect-[16/10] p-2 md:p-4">
              {/* Floor texture */}
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-marrom-madeira via-preto-carvao to-preto-carvao pointer-events-none" />

              {/* Palco — topo, centro-direita como na planta real */}
              <div className="absolute top-0 left-[34%] right-[6%] h-[13%] bg-gradient-to-b from-marrom-madeira/30 to-marrom-madeira/10 border-b-[3px] border-laranja-fogo/50 rounded-b-xl flex items-center justify-center backdrop-blur-sm z-[5] animate-stage-glow">
                <span className="text-creme-gastronomico/70 font-bold uppercase tracking-[0.25em] flex items-center gap-1.5 text-[10px] md:text-xs">
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-laranja-fogo animate-pulse" /> Palco <Star className="w-3 h-3 md:w-4 md:h-4 text-laranja-fogo animate-pulse" style={{ animationDelay: '1s' }} />
                </span>
              </div>

              {/* Entrada — canto superior esquerdo */}
              <div className="absolute top-0 left-0 w-[13%] h-[12%] bg-marrom-madeira/10 border-r-2 border-b-2 border-marrom-madeira/40 rounded-br-xl flex items-center justify-center z-[5]">
                <span className="text-creme-gastronomico/50 font-bold uppercase tracking-wider text-[8px] md:text-[10px] text-center leading-tight">Entrada</span>
              </div>

              {/* Balcão de Pagamento — ao lado da entrada */}
              <div className="absolute top-[2%] left-[15%] w-[16%] h-[10%] bg-ambar-premium/10 border border-ambar-premium/30 rounded-lg flex items-center justify-center z-[5]">
                <span className="text-ambar-premium/60 font-bold uppercase tracking-wider text-[7px] md:text-[9px] text-center leading-tight px-1">Balcão de<br className="md:hidden" /> Pagamento</span>
              </div>

              {/* Janelas — parede direita com reflexo sutil */}
              <div className="absolute top-[16%] right-0 w-[2.5%] h-[70%] border-l-2 border-dashed border-creme-gastronomico/15 bg-gradient-to-b from-creme-gastronomico/[0.06] via-creme-gastronomico/[0.02] to-creme-gastronomico/[0.06] rounded-l-sm z-[4]" title="Janelas" />

              {/* Fileiras F1–F5 — rótulos à esquerda, como na planta */}
              {[
                { label: 'F1', y: 26 },
                { label: 'F2', y: 41 },
                { label: 'F3', y: 55 },
                { label: 'F4', y: 69 },
                { label: 'F5', y: 83 },
              ].map(f => (
                <div
                  key={f.label}
                  style={{ top: `${f.y}%` }}
                  className="absolute left-[17%] -translate-y-1/2 z-[5] px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-marrom-madeira/40 bg-preto-carvao/70 text-creme-gastronomico/50 font-bold text-[8px] md:text-[10px] tracking-wider"
                  aria-hidden="true"
                >
                  {f.label}
                </div>
              ))}

              {/* Bar — parede inferior, largura do salão como na planta */}
              <div className="absolute bottom-0 left-[16%] right-[10%] h-[7%] bg-gradient-to-t from-marrom-madeira/30 to-marrom-madeira/10 border-t-[3px] border-ambar-premium/40 rounded-t-xl flex items-center justify-center z-[5]">
                <span className="text-creme-gastronomico/60 font-bold uppercase tracking-[0.3em] text-[9px] md:text-xs">Bar</span>
              </div>

              {/* Section label (desktop; no mobile a aba "Interno" já informa) */}
              <div className="absolute top-2 right-2 md:top-3 md:right-3 z-20 hidden md:block">
                <span className="text-[9px] md:text-[10px] bg-marrom-madeira/30 text-creme-gastronomico/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  Salão Interno • {internalTables.length} mesas
                </span>
              </div>

              {/* Render internal tables */}
              {internalTables.map((table, i) => (
                <TableNode
                  key={table.id}
                  table={table}
                  index={i}
                  isSelected={selectedIds.includes(table.id)}
                  isIncompatible={incompatibleIds.has(table.id)}
                  isJoinHint={joinHintIds.has(table.id)}
                  onClick={() => handleSelect(table)}
                  mode={mode}
                />
              ))}
            </div>
          )}

          {/* Separator */}
          {showInternal && showExternal && (
            <div className="flex items-center gap-3 px-4 py-2 bg-verde-oliva/5 border-y border-verde-oliva/20">
              <TreePine className="w-4 h-4 text-verde-oliva/50" />
              <div className="flex-1 h-px bg-verde-oliva/20" />
              <span className="text-[10px] md:text-xs font-bold text-verde-oliva/50 uppercase tracking-widest">Área Externa</span>
              <div className="flex-1 h-px bg-verde-oliva/20" />
              <TreePine className="w-4 h-4 text-verde-oliva/50" />
            </div>
          )}

          {/* External Area */}
          {showExternal && (
            <div className="relative w-full aspect-[5/2] md:aspect-[16/5] p-2 md:p-4 bg-verde-oliva/[0.03]">
              {/* Section label */}
              <div className="absolute top-2 right-2 md:top-3 md:right-3 z-20">
                <span className="text-[9px] md:text-[10px] bg-verde-oliva/20 text-verde-oliva/70 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  Área Externa • {externalTables.length} mesas
                </span>
              </div>

              {/* Render external tables */}
              {externalTables.map((table, i) => (
                <TableNode
                  key={table.id}
                  table={table}
                  index={i}
                  isSelected={selectedIds.includes(table.id)}
                  isIncompatible={incompatibleIds.has(table.id)}
                  isJoinHint={joinHintIds.has(table.id)}
                  onClick={() => handleSelect(table)}
                  mode={mode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legenda — status (cor) + capacidade (forma), §59 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        <span className="text-[10px] font-bold text-creme-gastronomico/40 uppercase tracking-wider mr-1">Status:</span>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-verde-oliva" /><span className="text-[10px] text-creme-gastronomico/60">Livre</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-ambar-premium" /><span className="text-[10px] text-creme-gastronomico/60">Aguardando pagamento</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-vermelho-brasa" /><span className="text-[10px] text-creme-gastronomico/60">Reservada</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-preto-carvao border border-marrom-madeira" /><span className="text-[10px] text-creme-gastronomico/60">Bloqueada</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-900 border border-purple-500" /><span className="text-[10px] text-creme-gastronomico/60">Não combinável</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-verde-oliva ring-2 ring-verde-oliva/40" /><span className="text-[10px] text-creme-gastronomico/60">Combinável com a seleção</span></div>
        <div className="text-marrom-madeira/30 hidden md:block">|</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-2.5 rounded-sm border-2 border-creme-gastronomico/30" /><span className="text-[10px] text-creme-gastronomico/60">4 lugares</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm border-2 border-creme-gastronomico/30" /><span className="text-[10px] text-creme-gastronomico/60">2 lugares</span></div>
      </div>
    </div>
  );
}
