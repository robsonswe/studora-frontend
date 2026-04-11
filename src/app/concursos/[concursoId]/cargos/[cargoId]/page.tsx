'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { concursoService, ApiError } from '@/services/api';
import { formatNivel, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';
import EditalAnalysisReport from '@/components/concursos/EditalAnalysisReport';
import StatsBreakdownPanel, { type HighlightMap } from '@/components/ui/StatsBreakdownPanel';
import {
  AlertCircle,
  Loader2,
  Clock,
  Target,
  BookOpen,
  BarChart2,
  BarChart3,
  Calendar,
  ChevronRight,
  ChevronDown,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysSince = (dateStr?: string): number => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return 'Nunca';
  const d = daysSince(dateStr);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  if (d < 7) return `${d}d atrás`;
  return formatDate(dateStr);
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConcursoCargoDetailPage() {
  const params = useParams();
  const concursoId = params.concursoId as string;
  const cargoId = params.cargoId as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concurso, setConcurso] = useState<Types.ConcursoDetailDto | null>(null);
  const [cargo, setCargo] = useState<Types.ConcursoCargoSummaryDto | null>(null);

  const groupedTopicos = useMemo(() => {
    if (!cargo?.topicos) return {};
    const g: Record<string, Record<string, Types.SubtemaSummaryDto[]>> = {};
    cargo.topicos.forEach(t => {
      const disc = t.disciplina?.nome || 'Outras Disciplinas';
      const tema = t.tema?.nome || 'Geral';
      if (!g[disc]) g[disc] = {};
      if (!g[disc][tema]) g[disc][tema] = [];
      g[disc][tema].push(t);
    });
    return g;
  }, [cargo]);

  const highlights = useMemo<HighlightMap>(() => {
    if (!concurso || !cargo) return {};
    return {
      porBanca: concurso.banca?.id?.toString(),
      porInstituicao: concurso.instituicao?.id?.toString(),
      porAreaInstituicao: concurso.instituicao?.area,
      porCargo: cargo.cargoId?.toString(),
      porAreaCargo: cargo.area,
      porNivel: cargo.nivel,
    };
  }, [concurso, cargo]);

  useEffect(() => {
    const load = async () => {
      if (!concursoId || !cargoId) return;
      setLoading(true); setError(null);
      try {
        const data = await concursoService.getById(Number(concursoId), 'full');
        setConcurso(data);
        const found = data.cargos.find(c => c.cargoId === Number(cargoId));
        if (!found) setError('Cargo não encontrado neste concurso.');
        else setCargo(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados.');
      } finally { setLoading(false); }
    };
    load();
  }, [concursoId, cargoId]);

  const [activeTab, setActiveTab] = useState<'conteudo' | 'analise'>('conteudo');

  const isValidUrl = (s: string) => {
    try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; }
  };

  if (loading) return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Mapa do Edital"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: 'Carregando...' }
        ]}
      />
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 tracking-tight">Carregando edital...</p>
      </div>
    </div>
  );

  if (error || !concurso || !cargo) return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Mapa do Edital"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: 'Erro ao carregar' }
        ]}
      />
      <div className="bg-white border border-red-100 rounded-xl p-10 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">{error || 'Concurso não encontrado.'}</p>
        <button onClick={() => router.push('/concursos')} className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Voltar para Concursos</button>
      </div>
    </div>
  );

  const concursoBreadcrumbLabel = `${concurso.instituicao.nome} - ${concurso.banca.nome} - ${concurso.mes}/${concurso.ano}`;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Mapa do Edital"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: concursoBreadcrumbLabel, href: '/concursos' },
          { label: cargo.cargoNome }
        ]}
      />

      {/* Identity strip */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100/60">{concurso.banca.nome}</span>
            <span className="text-xs font-semibold text-slate-400 tracking-tight">{concurso.ano}</span>
            <div className="ml-auto flex items-center gap-4">
              {concurso.edital && isValidUrl(concurso.edital) && (
                <a href={concurso.edital} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                  <LinkIcon className="w-3.5 h-3.5" /> Visualizar Edital
                </a>
              )}
              <button
                onClick={() => router.push(`/provas/executar?concursoId=${concurso.id}&cargoId=${cargo.cargoId}&instituicaoId=${concurso.instituicao.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Resolver Prova
              </button>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">{concurso.instituicao.nome}</h1>
          <p className="text-sm font-semibold text-slate-400 tracking-tight">{concurso.instituicao.area}</p>
        </div>
        <div className="px-6 py-4 sm:px-8 sm:py-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cargo</p>
            <p className="text-sm font-bold text-slate-800 leading-snug">{cargo.cargoNome}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nível</p>
            <p className="text-sm font-bold text-slate-800">{formatNivel(cargo.nivel)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Área do Cargo</p>
            <p className="text-sm font-bold text-slate-800">{cargo.area || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Data da Prova</p>
            {concurso?.dataProva ? (
              <p className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatDateTime(concurso.dataProva)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-slate-400 italic inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-300" /> A definir
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation - Refined Segmented Control */}
      <nav className="flex items-center gap-1 p-1 bg-slate-100/40 rounded-xl w-fit border border-slate-200/50 mb-6">
        <button
          onClick={() => setActiveTab('conteudo')}
          className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 group ${
            activeTab === 'conteudo'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 transition-colors ${
            activeTab === 'conteudo' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'
          }`} />
          <span>Conteúdo Programático</span>
          {cargo.topicos.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tight transition-colors ${
              activeTab === 'conteudo' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200 text-slate-500'
            }`}>
              {cargo.topicos.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('analise')}
          className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 group ${
            activeTab === 'analise'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BarChart3 className={`w-3.5 h-3.5 transition-colors ${
            activeTab === 'analise' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'
          }`} />
          <span>Análise do Edital</span>
        </button>
      </nav>

      {/* Tab Content */}
      <div className="grid grid-cols-1 items-start gap-6">
        {activeTab === 'conteudo' ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden pt-4">
            <div className="divide-y divide-slate-50">
              {Object.keys(groupedTopicos).length === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum tópico cadastrado para este cargo.</p>
                </div>
              ) : Object.entries(groupedTopicos).map(([disciplina, temas]) => (
                <div key={disciplina}>
                  <div className="px-6 py-3 bg-slate-50/50 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500 bg-white px-3 py-1 rounded-full border border-indigo-100/60">{disciplina}</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {Object.entries(temas).map(([tema, subtopicos]) => (
                    <div key={tema} className="px-6 py-4">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <ChevronRight className="w-3 h-3 text-slate-300" /> {tema}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {subtopicos.map(topico => {
                          const studied = (topico.totalEstudos ?? 0) > 0;
                          const hasQ = (topico.questaoStats?.total?.respondidas ?? 0) > 0;
                          const perfRate = hasQ ? (topico.questaoStats?.total?.acertadas ?? 0) / (topico.questaoStats?.total?.respondidas ?? 0) : null;
                          return (
                            <div key={topico.id} className="group rounded-lg border border-slate-100 bg-slate-50/20 hover:border-indigo-100 hover:bg-white transition-all duration-200 p-3">
                              <div className="flex items-start gap-2.5">
                                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${studied ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">{topico.nome}</p>
                                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                    {hasQ ? (
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${perfRate! >= 0.7 ? 'text-emerald-600' : perfRate! >= 0.5 ? 'text-amber-600' : 'text-red-500'}`}>
                                        <Target className="w-2.5 h-2.5" />
                                        {topico.questaoStats?.total?.acertadas}/{topico.questaoStats?.total?.respondidas} acertos ({Math.round(perfRate! * 100)}%)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-slate-300 inline-flex items-center gap-1">
                                        <Target className="w-2.5 h-2.5" /> Sem questões respondidas
                                      </span>
                                    )}
                                    {(topico.questaoStats?.total?.ultimaQuestao ?? null) && (
                                      <span className="text-[10px] font-medium text-slate-400 inline-flex items-center gap-1">
                                        <BarChart2 className="w-2.5 h-2.5" /> Questão: {formatDateShort(topico.questaoStats?.total?.ultimaQuestao!)}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-medium inline-flex items-center gap-1 ${studied ? 'text-slate-400' : 'text-slate-300'}`}>
                                      <Clock className="w-2.5 h-2.5" /> Estudo: {formatDateShort(topico.ultimoEstudo ?? undefined)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <StatsBreakdownPanel 
                                stats={topico.questaoStats} 
                                highlights={highlights} 
                                title="Desempenho no tópico" 
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EditalAnalysisReport 
            topicos={cargo.topicos || []}
            dataProva={concurso.dataProva}
            inscrito={cargo.inscrito}
            banca={concurso.banca}
            instituicao={concurso.instituicao}
            areaInstituicao={concurso.instituicao?.area}
            cargoId={cargo.cargoId}
            cargoNome={cargo.cargoNome}
            areaCargo={cargo.area}
            nivel={cargo.nivel}
          />
        )}
      </div>
    </div>
  );
}
