import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { disciplinaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import { BookOpen, AlertCircle, RotateCcw, Search, ChevronRight, ChevronLeft, X } from 'lucide-react';

// ─── Tonal Indigo Palette ───────────────────────────────────────────────────
const HUE = [
  { iconBg: 'bg-indigo-100', iconFg: 'text-indigo-800', bar: 'bg-indigo-500' },
  { iconBg: 'bg-indigo-50',  iconFg: 'text-indigo-600', bar: 'bg-indigo-600' },
  { iconBg: 'bg-amber-50',   iconFg: 'text-amber-800',  bar: 'bg-amber-500' },
  { iconBg: 'bg-indigo-100', iconFg: 'text-indigo-900', bar: 'bg-indigo-800' },
  { iconBg: 'bg-amber-100',  iconFg: 'text-amber-700',  bar: 'bg-amber-400' },
  { iconBg: 'bg-indigo-50',  iconFg: 'text-indigo-500', bar: 'bg-indigo-500' },
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

// ─── Pagination helpers ─────────────────────────────────────────────────────
function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i);

  const pages: (number | '...')[] = [0];

  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);

  if (start > 1) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push('...');

  pages.push(total - 1);
  return pages;
}

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
      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
      <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
    </div>

    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="h-2.5 w-10 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="flex flex-col items-center space-y-2 border-l border-slate-200 pl-4">
        <div className="h-2.5 w-16 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

// ─── Page ────────────────────────────────────────────────────────────────────
const DisciplinasPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPage = Number(searchParams.get('page')) || 0;
  const urlQuery = searchParams.get('q') || '';

  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local input value — only committed to URL on submit
  const [inputValue, setInputValue] = useState(urlQuery);

  // Sync input when URL query changes (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const submitSearch = () => {
    const next = new URLSearchParams(searchParams);
    if (inputValue) {
      next.set('q', inputValue);
    } else {
      next.delete('q');
    }
    next.set('page', '0');
    setSearchParams(next);
  };

  const clearSearch = () => {
    setInputValue('');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.set('page', '0');
    setSearchParams(next);
  };

  // Fetch whenever URL page or query changes
  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await disciplinaService.getAll({
          page: urlPage,
          size: 15,
          nome: urlQuery || undefined,
        });
        if (cancelled) return;
        setDisciplinas(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar disciplinas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [urlPage, urlQuery]);

  const currentPage = urlPage;
  const hasResults = disciplinas.length > 0;
  const isSearching = urlQuery.length > 0;
  const showToolbar = !loading && (hasResults || isSearching);

  const goToPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  const retry = () => {
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50 font-sans text-slate-800 antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">

        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between gap-4 mb-6">
            <form onSubmit={(e) => { e.preventDefault(); submitSearch(); }} className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Buscar disciplina..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full pl-4 pr-16 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-slate-400 text-slate-800"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-9 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
              {totalElements} {totalElements === 1 ? 'disciplina' : 'disciplinas'}
            </span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-8 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-medium text-rose-900 mb-1">Erro de conexão</p>
              <p className="text-rose-700 opacity-90">{error}</p>
            </div>
            <button onClick={retry} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-100/50 hover:bg-rose-100 rounded-md transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !hasResults && (
          <div className="py-20 px-6 text-center border border-slate-200 rounded-xl bg-white shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            {isSearching ? (
              <>
                <p className="text-base font-medium text-slate-900 mb-1">Nenhuma disciplina encontrada</p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Nenhuma disciplina corresponde a "<span className="font-medium">{urlQuery}</span>". Tente outro termo.
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-medium text-slate-900 mb-1">Sem disciplinas</p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">Sua lista de matérias aparecerá aqui.</p>
              </>
            )}
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            disciplinas.map(d => {
              const hue = getHue(d.id);
              const progress = d.totalSubtemas > 0 ? Math.round((d.subtemasEstudados / d.totalSubtemas) * 100) : 0;

              const accuracy = d.questoesRespondidas > 0 ? (d.questoesAcertadas / d.questoesRespondidas) * 100 : 0;
              const performanceColor = d.questoesRespondidas > 0
                ? (accuracy >= 70 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-600')
                : 'text-slate-300';

              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/disciplinas/${d.id}`)}
                  className="group flex flex-col text-left cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 outline-none"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ${hue.iconBg} ${hue.iconFg}`}>
                      {getInitials(d.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight mb-1">
                          {d.nome}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Topic Progress Bar */}
                  <div className="mb-5">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progresso do Edital</span>
                      <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${hue.bar}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Performance Block */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-auto group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                    <div className="grid grid-cols-[0.9fr_1.1fr] gap-0 divide-x divide-slate-200">

                      {/* Column 1: Questões */}
                      <div className="flex flex-col items-center text-center pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Questões</span>
                        {d.questoesRespondidas > 0 ? (
                          <div className={`text-sm font-bold font-mono tracking-tighter ${performanceColor}`}>
                            {d.questoesAcertadas}<span className="text-[10px] text-slate-400 mx-0.5">/</span>{d.questoesRespondidas}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-300 font-mono">—</span>
                        )}
                      </div>

                      {/* Column 2: Último Estudo */}
                      <div className="flex flex-col items-center text-center pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Último Estudo</span>
                        <div className="flex items-center">
                          {d.ultimoEstudo ? (
                            <span className="text-xs font-bold text-slate-700 leading-tight">
                              {formatRelativeTime(d.ultimoEstudo)}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 italic leading-tight">Não estudado</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1">
            {/* Prev */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-200 border border-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {buildPages(currentPage, totalPages).map((item, i) =>
              item === '...' ? (
                <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item)}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    item === currentPage
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:border-slate-200 border border-transparent'
                  }`}
                >
                  {item + 1}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-200 border border-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default DisciplinasPage;
