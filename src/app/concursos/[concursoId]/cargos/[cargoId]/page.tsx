'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { concursoService, ApiError } from '@/services/api';
import { formatNivel, formatDateTime } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
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
  Link as LinkIcon,
  FileText,
  Archive,
  ClipboardList,
  Play,
  Check,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import SimuladoCargoModal from '@/components/concursos/SimuladoCargoModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PerformanceBadge = ({ acertadas, respondidas, className = "" }: { acertadas?: number | null, respondidas?: number | null, className?: string }) => {
  const acc = acertadas ?? 0;
  const res = respondidas ?? 0;

  if (res === 0) return (
    <span className={`text-[10px] font-medium text-slate-300 inline-flex items-center gap-1 ${className}`}>
      <Target className="w-2.5 h-2.5" /> Sem questões respondidas
    </span>
  );

  const rate = acc / res;
  const colorClass = rate >= 0.7 ? 'text-emerald-600' : rate >= 0.5 ? 'text-amber-600' : 'text-red-500';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${colorClass} ${className}`}>
      <Target className="w-2.5 h-2.5" />
      {acc}/{res} ({Math.round(rate * 100)}%)
    </span>
  );
};

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

  const [showSimuladoModal, setShowSimuladoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'conteudo' | 'analise' | 'provas'>('conteudo');
  const [searchTerm, setSearchTerm] = useState('');

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  usePageTitle(cargo ? `${cargo.cargoNome} — ${concurso?.instituicao.nome}` : undefined);

  const filteredTopicos = useMemo(() => {
    if (!cargo?.topicos) return [];
    
    const normSearch = normalize(searchTerm);
    if (!normSearch) return cargo.topicos;

    return cargo.topicos.map(secao => {
      const secaoMatch = normalize(secao.nome).includes(normSearch);
      
      const filteredDisciplinas = (secao.disciplinas || []).map(disc => {
        const discMatch = normalize(disc.nome).includes(normSearch);
        
        const filteredAssuntos = (disc.assuntos || []).filter(a => 
          discMatch || secaoMatch || normalize(a.nome).includes(normSearch)
        );

        if (filteredAssuntos.length > 0 || discMatch) {
          return { ...disc, assuntos: filteredAssuntos };
        }
        return null;
      }).filter(Boolean) as Types.ConcursoSecaoDisciplinaDto[];

      if (filteredDisciplinas.length > 0 || secaoMatch) {
        return { ...secao, disciplinas: filteredDisciplinas };
      }
      return null;
    }).filter(Boolean) as Types.ConcursoSecaoDto[];
  }, [cargo?.topicos, searchTerm]);

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

  const isValidUrl = (s: string) => {
    try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; }
  };

  const renderAssunto = (assunto: Types.ConcursoCargoSubtemaDto) => {
    const studied = (assunto.totalEstudos ?? 0) > 0;
    return (
      <div key={assunto.id} className="group rounded-lg border border-slate-100 bg-slate-50/20 hover:border-[oklch(85%_0.05_264)] hover:bg-white transition-all duration-200 p-3">
        <div className="flex items-start gap-2.5">
          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${studied ? 'bg-[oklch(75%_0.12_150)]' : 'bg-slate-200'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">{assunto.nome}</p>
            
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {/* Neste Edital Context */}
              <div className="flex items-center gap-1.5 bg-[oklch(97%_0.02_264)]/50 px-2 py-0.5 rounded border border-[oklch(85%_0.05_264)]/30">
                <span className="text-[9px] font-black uppercase tracking-tighter text-[oklch(45%_0.22_264)] opacity-70">Neste Edital:</span>
                <span className="text-[10px] font-bold text-[oklch(45%_0.22_264)] tabular-nums">
                  {assunto.questoesConcursoCargo?.totalQuestoes ?? 0} qst.
                </span>
                <div className="w-px h-2.5 bg-[oklch(85%_0.05_264)]/30 mx-0.5" />
                <PerformanceBadge 
                  acertadas={assunto.questoesConcursoCargo?.acertadas} 
                  respondidas={assunto.questoesConcursoCargo?.respondidas} 
                />
              </div>

              {/* Desempenho Geral */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Geral:</span>
                <PerformanceBadge 
                  acertadas={assunto.questaoStats?.total?.acertadas} 
                  respondidas={assunto.questaoStats?.total?.respondidas} 
                />
              </div>
              
              {(assunto.questaoStats?.total?.ultimaQuestao ?? null) && (
                <span className="text-[10px] font-medium text-slate-400 inline-flex items-center gap-1">
                  <BarChart2 className="w-2.5 h-2.5" /> Questão: {formatDateShort(assunto.questaoStats?.total?.ultimaQuestao ?? undefined)}
                </span>
              )}
              <span className={`text-[10px] font-medium inline-flex items-center gap-1 ${studied ? 'text-slate-400' : 'text-slate-300'}`}>
                <Clock className="w-2.5 h-2.5" /> Estudo: {formatDateShort(assunto.ultimoEstudo ?? undefined)}
              </span>
            </div>
          </div>
        </div>
        <StatsBreakdownPanel 
          stats={assunto.questaoStats} 
          highlights={highlights} 
          title="Desempenho no tópico" 
        />
      </div>
    );
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
      <div className="max-w-4xl mx-auto px-4">
        <Feedback
          type="error"
          title="Erro ao carregar edital"
          message={error || 'Concurso ou cargo não encontrado.'}
          onClose={() => router.push('/concursos')}
        />
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/concursos')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Voltar para Concursos
          </button>
        </div>
      </div>
    </div>
  );

  const concursoBreadcrumbLabel = `${concurso.instituicao.nome} - ${concurso.banca.sigla || concurso.banca.nome} - ${concurso.mes}/${concurso.ano}`;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Mapa do Edital"
        breadcrumbs={[
          { label: 'Concursos', href: '/concursos' },
          { label: concurso.instituicao.nome, href: `/concursos/${concurso.id}` },
          { label: cargo.cargoNome }
        ]}
      />

      {/* Concurso finalizado badge */}
      {concurso.finalizado && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg w-fit text-xs font-semibold text-slate-500">
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          Concurso encerrado — edital de referência
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">{concurso.banca.sigla || concurso.banca.nome}</p>
            <h1 className="text-base font-black text-slate-900 leading-tight tracking-tight">{concurso.instituicao.nome}</h1>
            <p className="text-sm font-semibold text-slate-400 tracking-tight">{concurso.instituicao.area}</p>
          </div>
          <button
            onClick={() => setShowSimuladoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
          >
            <ClipboardList className="w-4 h-4" />
            Gerar Simulado
          </button>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              {concurso.finalizado ? 'Prova Realizada' : 'Data da Prova'}
            </p>
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

      {/* Tabs navigation */}
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
          { (cargo.topicos?.length ?? 0) > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tight transition-colors ${
              activeTab === 'conteudo' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200 text-slate-500'
            }`}>
              {cargo.topicos?.length}
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

        <button
          onClick={() => setActiveTab('provas')}
          className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 group ${
            activeTab === 'provas'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ClipboardList className={`w-3.5 h-3.5 transition-colors ${
            activeTab === 'provas' ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'
          }`} />
          <span>Provas</span>
          { (cargo.provas?.length ?? 0) > 0 && (
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tight transition-colors ${
              activeTab === 'provas' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200 text-slate-500'
            }`}>
              {cargo.provas?.length}
            </span>
          )}
        </button>
      </nav>

      {/* Tab Content */}
      <div className="grid grid-cols-1 items-start gap-6">
        {activeTab === 'conteudo' ? (
          <div className="space-y-6">
            {/* Search and Filters bar */}
            {cargo.topicos && cargo.topicos.length > 0 && (
              <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Filtrar por disciplina, tema ou subtema..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  />
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {filteredTopicos.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4 border border-slate-100">
                    {searchTerm ? (
                      <SlidersHorizontal className="w-8 h-8 text-slate-300" />
                    ) : (
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {searchTerm ? 'Nenhum resultado' : 'Lista Vazia'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchTerm 
                      ? 'Não encontramos tópicos para sua pesquisa.' 
                      : 'Nenhum tópico cadastrado para este cargo.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Limpar pesquisa
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTopicos.map((secao) => (
                    <div className="py-2" key={secao.id}>
                      <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/50 border-y border-slate-100">
                         <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/50">
                           {secao.nome.toLowerCase().includes('básico') 
                              ? <ClipboardList className="w-4 h-4 text-indigo-500" />
                              : <Target className="w-4 h-4 text-amber-500" />}
                         </div>
                         <div className="flex-1">
                           <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                             {secao.nome}
                           </h3>
                           <div className="flex items-center gap-3 mt-0.5">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                               Peso: {secao.peso || 1} • {secao.numQuestoes || 0} questões
                             </span>
                           </div>
                         </div>
                         <PerformanceBadge 
                            acertadas={secao.questoesConcursoCargo?.acertadas} 
                            respondidas={secao.questoesConcursoCargo?.respondidas} 
                         />
                      </div>
                      
                      <div className="divide-y divide-slate-50">
                        {(secao.disciplinas || []).map(disc => (
                          <div key={disc.id}>
                            <div className="px-6 py-3 bg-white flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[oklch(45%_0.22_264)] bg-[oklch(97%_0.02_264)] px-3 py-1 rounded-full border border-[oklch(85%_0.05_264)]/50">{disc.nome}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {disc.numQuestoes || 0} questões
                                </span>
                              </div>
                              <PerformanceBadge 
                                acertadas={disc.questoesConcursoCargo?.acertadas} 
                                respondidas={disc.questoesConcursoCargo?.respondidas} 
                              />
                            </div>
                            
                            <div className="space-y-2 px-6 py-4 pl-10">
                              {(disc.assuntos || []).map(assunto => renderAssunto(assunto))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'analise' ? (
          <EditalAnalysisReport 
            topicos={cargo.topicos || []}
            dataProva={concurso.dataProva}
            inscrito={cargo.inscrito}
            finalizado={concurso.finalizado}
            banca={concurso.banca}
            instituicao={concurso.instituicao}
            areaInstituicao={concurso.instituicao?.area}
            cargoId={cargo.cargoId}
            cargoNome={cargo.cargoNome}
            areaCargo={cargo.area}
            nivel={cargo.nivel}
          />
        ) : (
          <div className="space-y-6">
            <div className="bg-[oklch(97%_0.02_264)]/50 border border-[oklch(90%_0.010_264)] rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-[oklch(90%_0.010_264)]/60">
                  <ClipboardList className="w-6 h-6 text-[oklch(45%_0.22_264)]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Provas Oficiais</h3>
                  <p className="text-xs font-semibold text-slate-500 tracking-tight">Pratique com a organização e sequência original da banca.</p>
                </div>
              </div>

              {cargo.provas && cargo.provas.length > 0 ? (
                <div className="grid gap-4">
                  {cargo.provas.map((prova) => (
                    <div 
                      key={prova.id} 
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-[oklch(90%_0.010_264)]/60 rounded-xl hover:border-[oklch(45%_0.22_264)]/30 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-10 h-10 rounded-full bg-[oklch(97%_0.02_264)] flex items-center justify-center text-[oklch(45%_0.22_264)] font-black text-xs border border-[oklch(90%_0.010_264)]/40">
                          {prova.nome.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-[oklch(45%_0.22_264)] transition-colors">{prova.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sequência Original</span>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-bold text-[oklch(73%_0.17_65)]">Oficial</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => router.push(`/provas/executar?provaId=${prova.id}`)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[oklch(45%_0.22_264)] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[oklch(35%_0.18_264)] shadow-sm hover:shadow-indigo-500/20 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Resolver agora
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 bg-white/50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-slate-50 rounded-full mb-3">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sem provas disponíveis</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Nenhuma prova oficial vinculada a este cargo.</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-[oklch(97%_0.02_65)]/40 border border-[oklch(90%_0.010_65)] rounded-2xl flex items-start gap-4">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5 text-[oklch(73%_0.17_65)]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-900 tracking-tight mb-1">Estratégia</h4>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">A prova original revela a distribuição real de pesos e a fadiga do dia do exame. Praticar com a sequência oficial expõe a cadência planejada pela banca, detalhe que simulados aleatórios não replicam.</p>
              </div>
            </div>
          </div>
        )}
        </div>

        <SimuladoCargoModal
        isOpen={showSimuladoModal}
        onClose={() => setShowSimuladoModal(false)}
        concurso={concurso!}
        cargo={cargo!}
        />
        </div>
        );
        }
