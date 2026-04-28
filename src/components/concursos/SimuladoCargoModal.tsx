'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale,
  Target,
  RefreshCcw,
  FileText,
  Star,
  Clock,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import * as Types from '@/types';
import { simuladoService } from '@/services/api';
import {
  generateSimuladoFromCargo,
  generateSimuladoPreview,
  type SimuladoPreview,
  type SimuladoStrategy,
  type ScoreRationale,
} from '@/utils/simuladoGenerator';
import BaseModal from '@/components/ui/BaseModal';
import { formatNivel } from '@/utils/formatters';
import { useToast } from '@/components/ui/ToastContext';

// ─── Strategy Definitions ────────────────────────────────────────────────────

const STRATEGIES = [
  {
    id: 'balanced' as const,
    label: 'Equilibrado',
    icon: Scale,
    desc: 'Combina peso do edital, desempenho e tempo sem praticar.',
  },
  {
    id: 'weaknesses' as const,
    label: 'Pontos Cegos',
    icon: Target,
    desc: 'Amplifica tópicos com baixa taxa de acerto.',
  },
  {
    id: 'revision' as const,
    label: 'Revisão Espaçada',
    icon: RefreshCcw,
    desc: 'Prioriza tópicos sem prática recente.',
  },
  {
    id: 'edital' as const,
    label: 'Peso do Edital',
    icon: FileText,
    desc: 'Segue a frequência histórica desta banca.',
  },
] as const;

// ─── Rationale Tag Helpers ───────────────────────────────────────────────────

function getRationaleTag(rationale: ScoreRationale): { label: string; icon: typeof Target } | null {
  if (rationale.perfStatus === 'critical-perf') return { label: 'Acerto < 45%', icon: Target };
  if (rationale.perfStatus === 'low-perf') return { label: 'Acerto < 65%', icon: Target };
  if (rationale.perfStatus === 'not-started') return { label: 'Não iniciado', icon: Star };
  if (rationale.perfStatus === 'untested-theory') return { label: 'Sem questões', icon: Star };
  if (rationale.daysSinceLastQuestion > 30) return { label: `${rationale.daysSinceLastQuestion}d sem prática`, icon: Clock };
  if (rationale.editalScore > 10) return { label: 'Alta incidência', icon: FileText };
  return null;
}

// ─── Volume Presets ──────────────────────────────────────────────────────────

const VOLUME_PRESETS = [
  { value: 20, label: '20' },
  { value: 40, label: '40' },
  { value: 60, label: '60' },
  { value: 80, label: '80' },
  { value: 100, label: '100' },
  { value: 120, label: '120' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface SimuladoCargoModalProps {
  isOpen: boolean;
  onClose: () => void;
  concurso: Types.ConcursoDetailDto;
  cargo: Types.ConcursoCargoSummaryDto;
}

export default function SimuladoCargoModal({
  isOpen,
  onClose,
  concurso,
  cargo,
}: SimuladoCargoModalProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [generatingSimulado, setGeneratingSimulado] = useState(false);
  const [targetQuestions, setTargetQuestions] = useState(60);
  const [strategy, setStrategy] = useState<SimuladoStrategy>('balanced');
  const [ignorarRespondidas, setIgnorarRespondidas] = useState(true);
  const [simuladoPreview, setSimuladoPreview] = useState<SimuladoPreview | null>(null);

  // Generate preview when modal opens or settings change
  useEffect(() => {
    if (!isOpen || !concurso || !cargo) return;
    const preview = generateSimuladoPreview(concurso, cargo, {
      targetQuestions, strategy, ignorarRespondidas,
    });
    setSimuladoPreview(preview);
  }, [isOpen, targetQuestions, strategy, ignorarRespondidas, concurso, cargo]);

  const handleGenerateSimulado = async () => {
    if (!concurso || !cargo) return;
    setGeneratingSimulado(true);
    try {
      const request = generateSimuladoFromCargo(concurso, cargo, {
        targetQuestions, strategy, ignorarRespondidas,
      });
      await simuladoService.gerar(request);
      router.push('/simulados');
      showToast('Simulado gerado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar simulado:', err);
      showToast('Erro ao gerar simulado. Tente novamente.', 'error');
    } finally {
      setGeneratingSimulado(false);
      onClose();
    }
  };

  // Derived data
  const topPriorities = useMemo(() => {
    if (!simuladoPreview) return [];
    return simuladoPreview.distribution
      .flatMap(d => d.subtemas)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [simuladoPreview]);

  const maxDisciplinaQtd = useMemo(() => {
    if (!simuladoPreview) return 1;
    return Math.max(...simuladoPreview.distribution.map(d => d.quantidade), 1);
  }, [simuladoPreview]);

  if (!simuladoPreview) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      preventBackdropClick={generatingSimulado}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Gerar Simulado</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">{simuladoPreview.nome}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={generatingSimulado}
          className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Body ───────────────────────────────────────────────────── */}
      <div className="overflow-y-auto max-h-[min(72vh,640px)]">
        <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* ─── Left: Configuration ──────────────────────────────── */}
          <div className="lg:col-span-3 p-8 space-y-8">

            {/* Strategy */}
            <section>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Estratégia
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {STRATEGIES.map((s) => {
                  const active = strategy === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategy(s.id)}
                      className={`text-left px-3.5 py-3 rounded-xl border transition-all duration-150 ${active
                          ? 'border-indigo-200 bg-indigo-50/40'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <s.icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold tracking-tight ${active ? 'text-indigo-900' : 'text-slate-600'}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-snug ${active ? 'text-indigo-600/80' : 'text-slate-400'}`}>
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Volume */}
            <section>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Questões
              </h3>
              <div className="flex items-center gap-1.5">
                {VOLUME_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTargetQuestions(preset.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold tabular-nums transition-all duration-150 ${targetQuestions === preset.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Toggle */}
            <section className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700">Ignorar já respondidas</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Apenas questões inéditas.</p>
              </div>
              <button
                type="button"
                onClick={() => setIgnorarRespondidas(!ignorarRespondidas)}
                className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${ignorarRespondidas ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
              >
                <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${ignorarRespondidas ? 'left-[22px]' : 'left-[3px]'
                  }`} />
              </button>
            </section>

            {/* Distribution */}
            <section>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                Distribuição por Disciplina
              </h3>
              <div className="space-y-3">
                {simuladoPreview.distribution.map((item) => (
                  <div key={item.disciplina} className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-600 w-[140px] truncate shrink-0">
                      {item.disciplina}
                    </span>
                    <div className="flex-1 h-[6px] bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-indigo-500/70 rounded-sm transition-all duration-500"
                        style={{ width: `${(item.quantidade / maxDisciplinaQtd) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums w-8 text-right shrink-0">
                      {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ─── Right: Insights ──────────────────────────────────── */}
          <div className="lg:col-span-2 p-8 bg-slate-50/40">
            {/* Summary stats */}
            <div className="flex gap-6 mb-8">
              <div>
                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">{simuladoPreview.totalQuestoes}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Questões</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">{simuladoPreview.totalSubtemas}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Tópicos</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">{simuladoPreview.distribution.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Disciplinas</p>
              </div>
            </div>

            {/* Prioridades */}
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Top Prioridades
            </h3>
            <div className="space-y-1">
              {topPriorities.map((sub, idx) => {
                const tag = getRationaleTag(sub.rationale);
                return (
                  <div key={sub.id} className="py-2.5 group">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold text-slate-300 tabular-nums mt-0.5 w-4 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 leading-snug truncate">
                          {sub.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {sub.disciplina}
                          </span>
                          {tag && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-500 uppercase tracking-tight shrink-0">
                              <tag.icon className="w-2.5 h-2.5" />
                              {tag.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 tabular-nums shrink-0">
                        {sub.quantidade} qst
                      </span>
                    </div>
                    {idx < topPriorities.length - 1 && (
                      <div className="border-b border-slate-100 mt-2.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Context metadata */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Banca</span>
                <span className="text-[10px] font-bold text-slate-600">{concurso.banca.sigla || concurso.banca.nome}</span>              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Nível</span>
                <span className="text-[10px] font-bold text-slate-600">{formatNivel(cargo.nivel)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Estratégia</span>
                <span className="text-[10px] font-bold text-slate-600">
                  {STRATEGIES.find(s => s.id === strategy)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-slate-100 bg-white">
        <button
          type="button"
          onClick={onClose}
          disabled={generatingSimulado}
          className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGenerateSimulado}
          disabled={generatingSimulado}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-colors duration-150 disabled:opacity-50 shadow-sm"
        >
          {generatingSimulado ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              Gerar Simulado
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </BaseModal>
  );
}
