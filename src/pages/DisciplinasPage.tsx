import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, analyticsService, ApiError } from '@/services/api';
import * as Types from '@/types';
import { BookOpen, AlertCircle, RotateCcw, Loader2, ChevronRight } from 'lucide-react';

// ─── Refined Categorical Palette ────────────────────────────────────────────
// Muted, elegant backgrounds with high-contrast deep foregrounds.
const HUE = [
  { bg: 'bg-indigo-50', fg: 'text-indigo-700', border: 'group-hover:border-indigo-200' },
  { bg: 'bg-emerald-50', fg: 'text-emerald-700', border: 'group-hover:border-emerald-200' },
  { bg: 'bg-rose-50', fg: 'text-rose-700', border: 'group-hover:border-rose-200' },
  { bg: 'bg-amber-50', fg: 'text-amber-800', border: 'group-hover:border-amber-200' },
  { bg: 'bg-sky-50', fg: 'text-sky-700', border: 'group-hover:border-sky-200' },
  { bg: 'bg-fuchsia-50', fg: 'text-fuchsia-700', border: 'group-hover:border-fuchsia-200' },
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

// ─── Skeleton Card ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden h-[216px]">
    <div className="p-5 flex-1 flex flex-col justify-center">
      <div className="w-10 h-10 rounded-md bg-slate-100 animate-pulse mb-4" />
      <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse mb-2" />
      <div className="h-3 w-1/2 bg-slate-50 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/50 divide-x divide-slate-100 h-[60px]">
      <div className="p-4 flex items-center justify-between">
        <div className="h-2 w-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-6 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="h-2 w-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-8 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
      <div className="h-2 w-16 bg-slate-200 rounded animate-pulse" />
      <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
const DisciplinasPage = () => {
  const navigate = useNavigate();

  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [masteryMap, setMasteryMap] = useState<Map<number, Types.AnalyticsTopicMasteryDto>>(new Map());
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
      const [listRes, masteryRes] = await Promise.allSettled([
        disciplinaService.getAll({ page: 0, size: 15 }),
        analyticsService.getDisciplinasMastery({ size: 1000 }),
      ]);

      if (listRes.status === 'rejected') {
        throw new Error(listRes.reason instanceof ApiError ? listRes.reason.message : 'Verifique sua conexão e tente novamente.');
      }

      setDisciplinas(listRes.value.content);
      setTotalPages(listRes.value.totalPages);
      setTotalElements(listRes.value.totalElements);
      setPage(0);

      if (masteryRes.status === 'fulfilled') {
        const map = new Map(masteryRes.value.content.map(m => [m.id, m]));
        setMasteryMap(map);
      }
    } catch (err: any) {
      setError(err.message);
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
            Selecione uma disciplina para gerenciar seus temas, registrar horas de estudo e analisar seu desempenho.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loadingInitial ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            disciplinas.map(d => {
              const hue = getHue(d.id);
              const mastery = masteryMap.get(d.id);
              const attempts = mastery?.totalAttempts || 0;
              const correct = mastery?.correctAttempts || 0;
              const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
              
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/disciplinas/${d.id}`)}
                  className={`group text-left bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden hover:shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${hue.border}`}
                >
                  <div className="p-5 flex-1">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-semibold mb-4 transition-colors ${hue.bg} ${hue.fg}`}>
                      {getInitials(d.nome)}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                      {d.nome}
                    </h3>
                  </div>

                  {/* Clean Metrics Footer */}
                  <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/50 divide-x divide-slate-100">
                    <div className="px-5 py-3.5 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-medium text-slate-500">Questões</span>
                      <span className="text-sm font-semibold text-slate-900">{attempts}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between items-center group-hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-medium text-slate-500">Acertos</span>
                      <span className={`text-sm font-semibold ${accuracy >= 70 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {attempts > 0 ? `${accuracy}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 group-hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="text-xs font-medium text-indigo-600">Ver detalhes</span>
                    <ChevronRight className="w-4 h-4 text-indigo-400" />
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-700 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-50"
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