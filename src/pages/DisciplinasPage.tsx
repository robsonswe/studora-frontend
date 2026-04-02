import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import { BookOpen, AlertCircle, RotateCcw, Loader2, ChevronRight, Clock, CheckCircle2, Target } from 'lucide-react';

// ─── Refined Categorical Palette ────────────────────────────────────────────
const HUE = [
  { iconBg: 'bg-indigo-100', iconFg: 'text-indigo-700', bar: 'bg-indigo-500' },
  { iconBg: 'bg-emerald-100', iconFg: 'text-emerald-700', bar: 'bg-emerald-500' },
  { iconBg: 'bg-rose-100', iconFg: 'text-rose-700', bar: 'bg-rose-500' },
  { iconBg: 'bg-amber-100', iconFg: 'text-amber-800', bar: 'bg-amber-500' },
  { iconBg: 'bg-sky-100', iconFg: 'text-sky-700', bar: 'bg-sky-500' },
  { iconBg: 'bg-fuchsia-100', iconFg: 'text-fuchsia-700', bar: 'bg-fuchsia-500' },
] as const;

function getHue(id: number) {
  return HUE[id % HUE.length];
}

const getInitials = (nome: string): string => {
  const skip = new Set(['de', 'da', 'do', 'das', 'dos', 'na', 'no', 'e', 'a', 'o', 'em', 'para']);
  const words = nome.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const sig = words.filter(w => !skip.has(w.toLowerCase()));
  const pool = sig.length >= 2 ? sig : words;
  return (pool[0][0] + pool[pool.length - 1][0]).toUpperCase();
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  if (diffHours < 24) return `Há ${diffHours} h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
};

// ─── Skeleton Card ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-50 rounded animate-pulse" />
      </div>
    </div>

    <div className="space-y-2 mb-6">
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
    </div>

    {/* Skeleton for Performance Block */}
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5">
      <div className="h-4 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
      <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
        <div>
          <div className="h-3 w-20 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-6 w-12 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-2.5 w-full bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="pl-4">
          <div className="h-3 w-24 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-6 w-12 bg-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-2.5 w-full bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>

    <div className="pt-4 border-t border-slate-100 flex justify-between">
      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
      <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
const DisciplinasPage = () => {
  const navigate = useNavigate();

  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoadingInitial(true);
    setError(null);
    try {
      const res = await disciplinaService.getAll({ page: 0, size: 15 });
      setDisciplinas(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      setPage(0);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Verifique sua conexão e tente novamente.');
    } finally {
      setLoadingInitial(false);
    }
  };

  const loadMore = async () => {
    if (page >= totalPages - 1 || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await disciplinaService.getAll({ page: nextPage, size: 15 });
      setDisciplinas(prev => [...prev, ...res.content]);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more disciplines', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = page < totalPages - 1;

  return (
    <div className="min-h-screen pb-24 bg-slate-50 font-sans text-slate-900 antialiased">
      <Header
        title="Disciplinas"
        actions={
          !loadingInitial && totalElements > 0 && (
            <span className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-full">
              {totalElements} cadastradas
            </span>
          )
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* ── Page Headline ──────────────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">
            Suas disciplinas
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Selecione uma disciplina para gerenciar seus tópicos, registrar sessões de estudo e acompanhar seu desempenho nas questões.
          </p>
        </div>

        {/* ── Error Banner ───────────────────────────────────────────────── */}
        {error && (
          <div className="mb-8 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-medium text-rose-900 mb-1">Não foi possível carregar as disciplinas</p>
              <p className="text-rose-700 opacity-90">{error}</p>
            </div>
            <button
              onClick={loadInitial}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-100/50 hover:bg-rose-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!loadingInitial && !error && disciplinas.length === 0 && (
          <div className="py-20 px-6 text-center border border-slate-200 rounded-xl bg-white shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-base font-medium text-slate-900 mb-1">Sem disciplinas</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              As disciplinas que você está estudando aparecerão aqui.
            </p>
          </div>
        )}

        {/* ── Cards Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingInitial ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            disciplinas.map(d => {
              const hue = getHue(d.id);
              const respondidas = d.questoesRespondidas;
              const acertadas = d.questoesAcertadas;
              const accuracy = respondidas > 0 ? Math.round((acertadas / respondidas) * 100) : 0;
              const progress = d.totalSubtemas > 0 ? Math.round((d.subtemasEstudados / d.totalSubtemas) * 100) : 0;
              
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/disciplinas/${d.id}`)}
                  className="group flex flex-col text-left bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ${hue.iconBg} ${hue.iconFg}`}>
                      {getInitials(d.nome)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-1">
                        {d.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        {d.ultimoEstudo ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Último estudo: {formatRelativeTime(d.ultimoEstudo)}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Nenhum estudo registrado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso de Tópicos */}
                  <div className="mb-5">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        Tópicos estudados
                        <span className="text-slate-400 font-normal ml-1">({d.subtemasEstudados}/{d.totalSubtemas})</span>
                      </span>
                      {progress === 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span className="text-sm font-bold text-slate-900">{progress}%</span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${hue.bar}`} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>

                  {/* Bloco Unificado e Informativo de Desempenho */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/60 transition-colors">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-700">Desempenho nas questões</span>
                    </div>
                    
                    {respondidas > 0 ? (
                      <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200/80">
                        {/* Coluna 1: Precisão */}
                        <div>
                          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Taxa de acertos</div>
                          <div className="flex items-baseline mb-1">
                            <span className={`text-xl font-bold tracking-tight ${accuracy >= 70 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {accuracy}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">
                            <strong className="font-semibold text-slate-700">{acertadas}</strong> corretas de <strong className="font-semibold text-slate-700">{respondidas}</strong> respondidas
                          </p>
                        </div>

                        {/* Coluna 2: Velocidade */}
                        <div className="pl-4">
                          <div className="text-[11px] font-medium text-slate-500 mb-0.5">Ritmo de resolução</div>
                          <div className="flex items-baseline mb-1">
                            <span className="text-xl font-bold tracking-tight text-slate-900">
                              {d.mediaTempoResposta ? `${Math.round(d.mediaTempoResposta)}s` : '—'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">
                            Tempo médio gasto por questão
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2.5 text-center bg-white/60 rounded-lg border border-slate-100 border-dashed">
                        <p className="text-xs font-medium text-slate-600 mb-0.5">Sem histórico de questões</p>
                        <p className="text-[10px] text-slate-400">Pratique para visualizar suas métricas</p>
                      </div>
                    )}
                  </div>

                  {/* Rodapé de Ação Invisível que surge/escurece no hover */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium text-slate-500">
                      Ver painel completo
                    </span>
                    <div className="flex items-center text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                      Acessar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {!loadingInitial && hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-indigo-700 bg-white border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Carregando...
                </>
              ) : (
                'Carregar mais disciplinas'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisciplinasPage;