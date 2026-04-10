'use client';

import { useState, useMemo } from 'react';
import * as Types from '@/types';
import { formatNivel } from '@/utils/formatters';
import { BarChart3, ChevronDown, Star } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Each dimension we can display, with its label and data extraction logic. */
interface Dimension {
  key: string;
  label: string;
  slices: SliceEntry[];
}

interface SliceEntry {
  key: string;
  label: string;
  slice: Types.StatSliceDto;
  highlighted: boolean;
}

/**
 * Map of dimension key → slice key(s) to visually highlight.
 * For ID-keyed dimensions (porBanca, porCargo, porInstituicao), use the numeric ID as string.
 * For string-keyed dimensions (porNivel, porAreaCargo, porAreaInstituicao), use the string key.
 *
 * Example: { porCargo: '1', porNivel: 'SUPERIOR', porBanca: '3' }
 */
export type HighlightMap = Partial<Record<string, string | string[]>>;

export interface StatsBreakdownPanelProps {
  stats: Types.QuestaoStatsDto | undefined | null;
  /** Compact mode hides the toggle header and always shows content inline. */
  compact?: boolean;
  /** Default open state for collapsible mode. */
  defaultOpen?: boolean;
  /** Keys to highlight in each dimension. Highlighted rows get a visual accent. */
  highlights?: HighlightMap;
  /** Label for the accordion toggle */
  title?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isHighlighted(dimKey: string, sliceKey: string, highlights?: HighlightMap): boolean {
  if (!highlights) return false;
  const val = highlights[dimKey];
  if (!val) return false;
  if (Array.isArray(val)) return val.includes(sliceKey);
  return val === sliceKey;
}

function extractDimensions(stats: Types.QuestaoStatsDto, highlights?: HighlightMap): Dimension[] {
  const dims: Dimension[] = [];

  const addDimension = (
    key: string,
    label: string,
    record: Record<string | number, Types.StatSliceDto> | undefined,
    labelFn?: (k: string, slice: Types.StatSliceDto) => string
  ) => {
    if (!record) return;
    const entries = Object.entries(record);
    const slices = entries
      .map(([k, slice]) => ({
        key: k,
        label: labelFn ? labelFn(k, slice) : (slice.nome ?? k),
        slice,
        highlighted: isHighlighted(key, k, highlights),
      }))
      .filter(s => (s.slice.respondidas ?? 0) > 0 || (s.slice.totalQuestoes ?? 0) > 0);
    if (slices.length > 0) dims.push({ key, label, slices });
  };

  addDimension('porNivel', 'Nível', stats.porNivel, (k) => formatNivel(k) || k);
  addDimension('porBanca', 'Banca', stats.porBanca);
  addDimension('porInstituicao', 'Instituição', stats.porInstituicao);
  addDimension('porAreaInstituicao', 'Área (Inst.)', stats.porAreaInstituicao);
  addDimension('porCargo', 'Cargo', stats.porCargo);
  addDimension('porAreaCargo', 'Área (Cargo)', stats.porAreaCargo);

  return dims;
}

function accuracyColor(acc: number): string {
  if (acc >= 70) return 'text-emerald-600';
  if (acc >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function barColor(acc: number): string {
  if (acc >= 70) return 'bg-emerald-500';
  if (acc >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

// ─── Slice Row ──────────────────────────────────────────────────────────────

const SliceRow = ({ entry }: { entry: SliceEntry }) => {
  const { slice, label, highlighted } = entry;
  const respondidas = slice.respondidas ?? 0;
  const acertadas = slice.acertadas ?? 0;
  const totalQuestoes = slice.totalQuestoes ?? 0;
  const acc = respondidas > 0 ? Math.round((acertadas / respondidas) * 100) : 0;
  const coverage = totalQuestoes > 0 ? Math.round((respondidas / totalQuestoes) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 py-1.5 rounded-md px-1.5 -mx-1.5 transition-colors ${
      highlighted
        ? 'bg-indigo-50/70 ring-1 ring-indigo-200/60'
        : ''
    }`}>
      {/* Label & Indicator */}
      <div className="w-32 flex-shrink-0 flex items-center min-w-0">
        <div className="w-5 flex-shrink-0 flex justify-center mr-1">
          {highlighted && <Star className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
        </div>
        <span className={`text-xs font-medium truncate ${
          highlighted ? 'text-indigo-700 font-semibold' : 'text-slate-700'
        }`} title={label}>
          {label}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
          {/* Coverage layer (faint, full bank) */}
          {totalQuestoes > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-slate-200/60 rounded-full"
              style={{ width: `${coverage}%` }}
            />
          )}
          {/* Accuracy layer */}
          {respondidas > 0 && (
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor(acc)}`}
              style={{ width: `${(acertadas / (totalQuestoes || respondidas)) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Accuracy pill */}
      <span className={`text-[11px] font-mono font-bold tabular-nums w-10 text-right flex-shrink-0 ${
        respondidas > 0 ? accuracyColor(acc) : 'text-slate-300'
      }`}>
        {respondidas > 0 ? `${acc}%` : '—'}
      </span>

      {/* Counts */}
      <div className="w-24 text-right flex-shrink-0 flex items-center justify-end gap-1" title={totalQuestoes > 0 ? `De ${totalQuestoes} questões no banco` : undefined}>
        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
          {acertadas}/{respondidas}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">acertos</span>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function StatsBreakdownPanel({
  stats,
  compact = false,
  defaultOpen = false,
  highlights,
  title,
}: StatsBreakdownPanelProps) {
  const [activeDimension, setActiveDimension] = useState<string | null>(null);

  const dimensions = useMemo(() => {
    if (!stats) return [];
    return extractDimensions(stats, highlights);
  }, [stats, highlights]);

  // Auto-select first dimension
  const activeKey = activeDimension ?? dimensions[0]?.key ?? null;
  const activeDim = dimensions.find(d => d.key === activeKey);

  // Count if any dimension has highlights
  const hasHighlights = highlights && Object.keys(highlights).length > 0;
  const activeDimHasHighlight = activeDim?.slices.some(s => s.highlighted) ?? false;

  if (dimensions.length === 0) return null;

  const content = (
    <div className="space-y-3">
      {/* Dimension pills */}
      <div className="flex gap-1.5 flex-wrap">
        {dimensions.map(dim => {
          const dimHasHighlight = dim.slices.some(s => s.highlighted);
          return (
            <button
              key={dim.key}
              onClick={() => setActiveDimension(dim.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                dim.key === activeKey
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : dimHasHighlight
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {dim.label}
            </button>
          );
        })}
      </div>

      {/* Slice rows — highlighted entries sort to top */}
      {activeDim && (
        <div className="space-y-0.5">
          {activeDim.slices
            .sort((a, b) => {
              // Highlighted first, then by respondidas
              if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
              return (b.slice.respondidas ?? 0) - (a.slice.respondidas ?? 0);
            })
            .map(entry => (
              <SliceRow key={entry.key} entry={entry} />
            ))}
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className="mt-2">{content}</div>;
  }

  return (
    <details
      className="mt-3 group/details border border-slate-100 rounded-lg bg-white/50"
      open={defaultOpen}
    >
      <summary className="flex items-center justify-between p-3 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none hover:bg-slate-50/70 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2 opacity-80 group-hover/details:opacity-100 transition-opacity">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest group-hover/details:text-indigo-700 transition-colors">
            {title || 'Desempenho por dimensão'}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover/details:text-indigo-500 group-open/details:rotate-180 transition-all" />
      </summary>
      <div className="px-3 pb-3 border-t border-slate-100/60 pt-3">
        {content}
      </div>
    </details>
  );
}
