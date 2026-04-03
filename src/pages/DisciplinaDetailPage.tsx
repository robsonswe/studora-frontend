import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, subtemaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import {
  ArrowLeft,
  Folder,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  X,
  AlertCircle,
  ChevronDown,
  Info
} from 'lucide-react';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface SubtemaWithEstudos extends Types.SubtemaSummaryDto {
  estudos?: Types.EstudoSubtemaDto[];
  estudosLoaded?: boolean;
}

interface TemaWithSubtemas extends Types.TemaSummaryDto {
  subtemas: SubtemaWithEstudos[];
  subtemasLoaded: boolean;
}

interface DeleteConfirmation {
  subtemaId: number;
  estudoId: number;
  subtemaNome: string;
}

// ─── Helper Components ─────────────────────────────────────────────────────

const DifficultyMiniBadges = ({
  stats,
}: {
  stats: Record<string, Types.DificuldadeStatDto>;
}) => {
  const levels =[
    {
      key: 'FACIL',
      label: 'Fácil',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      key: 'MEDIA',
      label: 'Médio',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      key: 'DIFICIL',
      label: 'Difícil',
      text: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    },
    {
      key: 'CHUTE',
      label: 'Chute',
      text: 'text-fuchsia-700',
      bg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200',
    },
  ];

  const activeStats = levels.filter(
    (lvl) => stats && stats[lvl.key] && stats[lvl.key].total > 0
  );

  if (activeStats.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {activeStats.map((lvl) => {
        const data = stats[lvl.key];
        const acc = Math.round((data.corretas / data.total) * 100);
        return (
          <div
            key={lvl.key}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${lvl.bg} ${lvl.text} border ${lvl.border}`}
          >
            <span>{lvl.label}</span>
            <span className="font-mono tabular-nums">{acc}%</span>
          </div>
        );
      })}
    </div>
  );
};

const AccuracyPill = ({
  accuracy,
  size = 'md',
}: {
  accuracy: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const colorClass =
    accuracy >= 70
      ? 'text-emerald-600'
      : accuracy >= 50
        ? 'text-amber-500'
        : 'text-rose-600';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <span
      className={`font-mono font-bold tracking-tight ${colorClass} ${sizeClasses[size]}`}
    >
      {accuracy}%
    </span>
  );
};

const SubtemaRow = ({
  subtema,
  onAddEstudo,
  onOpenHistory,
  isAdding,
  isLoadingHistory,
}: {
  subtema: SubtemaWithEstudos;
  onAddEstudo: (id: number) => void;
  onOpenHistory: (subtema: SubtemaWithEstudos) => void;
  isAdding: boolean;
  isLoadingHistory: boolean;
}) => {
  const accuracy =
    subtema.questoesRespondidas > 0
      ? Math.round(
          (subtema.questoesAcertadas / subtema.questoesRespondidas) * 100
        )
      : 0;
  const hasStats = subtema.questoesRespondidas > 0;
  const isStudied = subtema.totalEstudos > 0;
  const hasHistory = isStudied;

  return (
    <div className="group px-4 py-4 hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          {isStudied ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
          )}
        </div>
        <h4 className="flex-1 min-w-0 text-sm font-medium text-slate-800 leading-snug">
          {subtema.nome}
        </h4>
      </div>

      <div className="ml-7 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Questões - Desempenho</span>
              {hasStats ? (
                <span className={`font-semibold tabular-nums text-sm ${
                  accuracy >= 70 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {accuracy}% <span className="text-slate-400 font-normal text-xs">({subtema.questoesAcertadas}/{subtema.questoesRespondidas})</span>
                </span>
              ) : (
                <span className="font-semibold text-slate-400">—</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Questões - Tempo Médio</span>
              <span className="font-semibold text-slate-700 tabular-nums">
                {subtema.mediaTempoResposta ? `${Math.round(subtema.mediaTempoResposta)}s` : '—'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Último Estudo</span>
              <span className={`font-semibold ${subtema.ultimoEstudo ? 'text-slate-700' : 'text-slate-400'}`}>
                {subtema.ultimoEstudo 
                  ? new Date(subtema.ultimoEstudo).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Última Questão</span>
              <span className={`font-semibold ${subtema.ultimaQuestao ? 'text-slate-700' : 'text-slate-400'}`}>
                {subtema.ultimaQuestao 
                  ? new Date(subtema.ultimaQuestao).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-medium block">Questões - Dificuldade</span>
              {hasStats && Object.keys(subtema.dificuldadeRespostas || {}).length > 0 ? (
                <DifficultyMiniBadges stats={subtema.dificuldadeRespostas} />
              ) : (
                <span className="font-semibold text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:w-44">
          <button
            onClick={() => onAddEstudo(subtema.id)}
            disabled={isAdding}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isAdding ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Registrar estudo
          </button>

          {hasHistory && (
            <button
              onClick={() => onOpenHistory(subtema)}
              disabled={isLoadingHistory}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingHistory ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              Ver histórico ({subtema.totalEstudos})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────
const DisciplinaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [disciplina, setDisciplina] = useState<Types.DisciplinaDetailDto | null>(null);
  const [temas, setTemas] = useState<TemaWithSubtemas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTemas, setExpandedTemas] = useState<number[]>([]);
  const [addingEstudo, setAddingEstudo] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<SubtemaWithEstudos | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);

  useEffect(() => {
    if (id) loadDisciplina(parseInt(id));
  }, [id]);

  const loadDisciplina = async (disciplinaId: number, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const disciplinaData = await disciplinaService.getById(disciplinaId);
      setDisciplina(disciplinaData);
      
      const temasWithSubtemas = await Promise.all(
        disciplinaData.temas.map(async (t) => {
          const subtemas = await subtemaService.getByTema(t.id);
          return {
            ...t,
            subtemas: subtemas.map(s => ({ ...s })),
            subtemasLoaded: true,
          };
        })
      );
      setTemas(temasWithSubtemas);

      if (showSpinner && temasWithSubtemas.length > 0) {
        setExpandedTemas([temasWithSubtemas[0].id]);
      }
    } catch (err) {
      setError('Não foi possível carregar os dados da disciplina.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const calculateAccuracy = (respondidas: number, acertadas: number) => {
    return respondidas > 0 ? Math.round((acertadas / respondidas) * 100) : 0;
  };

  const toggleTema = (temaId: number) => {
    setExpandedTemas(prev => 
      prev.includes(temaId) 
        ? prev.filter(id => id !== temaId) 
        : [...prev, temaId]
    );
  };

  const handleAddEstudo = async (subtemaId: number) => {
    setAddingEstudo(subtemaId);
    setActionError(null);
    try {
      await subtemaService.addEstudo(subtemaId);
      await loadDisciplina(parseInt(id!), false);
      if (historyModal && historyModal.id === subtemaId) {
        setHistoryModal(null);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao registrar estudo.');
    } finally {
      setAddingEstudo(null);
    }
  };

  const handleDeleteEstudo = (subtemaId: number, estudoId: number) => {
    const subtema = temas.flatMap((t) => t.subtemas).find((s) => s.id === subtemaId);
    if (subtema) {
      setDeleteConfirmation({ subtemaId, estudoId, subtemaNome: subtema.nome });
    }
  };

  const handleOpenHistory = async (subtema: SubtemaWithEstudos) => {
    if (!subtema.estudosLoaded) {
      setLoadingHistory(subtema.id);
      try {
        const estudos = await subtemaService.getEstudos(subtema.id);
        const subtemaUpdated = { ...subtema, estudos, estudosLoaded: true };
        setTemas(prev => prev.map(t => ({
          ...t,
          subtemas: t.subtemas.map(s => s.id === subtema.id ? subtemaUpdated : s)
        })));
        setHistoryModal(subtemaUpdated);
      } catch (err) {
        setActionError('Erro ao carregar histórico.');
      } finally {
        setLoadingHistory(null);
      }
    } else {
      setHistoryModal(subtema);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    setAddingEstudo(deleteConfirmation.subtemaId);
    try {
      await subtemaService.deleteEstudo(deleteConfirmation.subtemaId, deleteConfirmation.estudoId);
      setDeleteConfirmation(null);
      setHistoryModal(null);
      await loadDisciplina(parseInt(id!), false);
    } catch (err) {
      setActionError('Erro ao excluir estudo.');
      setDeleteConfirmation(null);
    } finally {
      setAddingEstudo(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-medium">Sincronizando tópicos...</p>
        </div>
      </div>
    );
  }

  if (error || !disciplina) return null;

  const hasTemas = temas.length > 0;
  const accuracy = calculateAccuracy(disciplina.questoesRespondidas, disciplina.questoesAcertadas);
  const studyProgress = disciplina.totalSubtemas > 0 
    ? Math.round((disciplina.subtemasEstudados / disciplina.totalSubtemas) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800 antialiased">
      <Header
        title={
          <button onClick={() => navigate('/disciplinas')} className="flex items-center gap-2 text-slate-800 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">{disciplina.nome}</span>
          </button>
        }
      />

      {/* Action Error Toast */}
      {actionError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteConfirmation(null)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remover sessão?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">Esta ação removerá permanentemente o registro de estudo deste tópico.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmation(null)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors flex justify-center items-center">
                {addingEstudo === deleteConfirmation.subtemaId ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setHistoryModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setHistoryModal(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100 p-1"><X className="w-5 h-5" /></button>
            <div className="mb-5 pr-8">
              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">Histórico de Estudos</h3>
              <p className="text-sm text-slate-500 leading-snug">{historyModal.nome}</p>
            </div>
            {historyModal.estudos && historyModal.estudos.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {historyModal.estudos.map((estudo) => (
                  <div key={estudo.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                    <div className="flex items-center gap-2.5 text-slate-600 font-medium">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(estudo.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button onClick={() => handleDeleteEstudo(historyModal.id, estudo.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">Nenhum estudo registrado</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* DASHBOARD STRIP: Only shown if Temas exist */}
        {hasTemas ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-8 flex flex-col md:flex-row gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="flex-1 md:pr-6 flex flex-col justify-center">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Tópicos estudados</h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-mono font-bold tracking-tight text-slate-900">{disciplina.subtemasEstudados}/{disciplina.totalSubtemas}</span>
                <span className="text-sm font-bold text-indigo-600 font-mono">({studyProgress}%)</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-auto">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${studyProgress}%` }} />
              </div>
            </div>

            <div className="flex-[1.5] md:px-6 pt-6 md:pt-0 flex flex-col justify-center">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Desempenho Geral</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <AccuracyPill accuracy={accuracy} size="lg" />
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded tabular-nums">{disciplina.questoesRespondidas}</span> respondidas
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded tabular-nums">{disciplina.mediaTempoResposta ? `${Math.round(disciplina.mediaTempoResposta)}s` : '—'}</span> por questão
                  </span>
                </div>
                <DifficultyMiniBadges stats={disciplina.dificuldadeRespostas} />
              </div>
            </div>

            <div className="flex-1 md:pl-6 pt-6 md:pt-0 flex flex-col justify-center">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Última Atividade</h2>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {disciplina.ultimoEstudo ? new Date(disciplina.ultimoEstudo).toLocaleDateString('pt-BR') : 'Nenhuma atividade'}
              </span>
            </div>
          </div>
        ) : (
          /* NO TEMAS EMPTY STATE */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm mb-8 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
               <Info className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Estrutura em atualização</h3>
             <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
               A disciplina <strong className="text-slate-700">{disciplina.nome}</strong> ainda não possui temas associados. 
               Volte mais tarde para conferir novas atualizações no conteúdo programático.
             </p>
          </div>
        )}

        {/* ACCORDION CONTAINER */}
        {hasTemas && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {temas.map((tema) => {
                const isExpanded = expandedTemas.includes(tema.id);
                const hasSubtemas = tema.subtemas.length > 0;
                const temaAcc = calculateAccuracy(tema.questoesRespondidas, tema.questoesAcertadas);
                const temaProgress = tema.totalSubtemas > 0 ? Math.round((tema.subtemasEstudados / tema.totalSubtemas) * 100) : 0;

                return (
                  <div key={tema.id} className="bg-white">
                    <button onClick={() => toggleTema(tema.id)} className="w-full px-5 py-4 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
                      <div className="flex items-center gap-3 pr-4">
                        <Folder className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                        <span className="text-sm font-bold text-slate-800 text-left">{tema.nome}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {hasSubtemas && (
                          <div className="flex items-center gap-2 hidden sm:flex">
                            <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">{tema.subtemasEstudados}/{tema.totalSubtemas}</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${temaProgress}%` }} />
                            </div>
                          </div>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-1 fade-in duration-200">
                        {hasSubtemas ? (
                          <>
                            <div className="px-5 py-3 bg-slate-50/30 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-slate-400" /><span><strong className="text-slate-700">{tema.questoesAcertadas}</strong>/{tema.questoesRespondidas} questões</span></div>
                                {tema.mediaTempoResposta && <div className="flex items-center gap-1.5 hidden sm:flex"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>{Math.round(tema.mediaTempoResposta)}s média</span></div>}
                              </div>
                              <DifficultyMiniBadges stats={tema.dificuldadeRespostas} />
                            </div>
                            <div className="divide-y divide-slate-50">
                              {tema.subtemas.map((subtema) => (
                                <SubtemaRow key={subtema.id} subtema={subtema} onAddEstudo={handleAddEstudo} onOpenHistory={handleOpenHistory} isAdding={addingEstudo === subtema.id} isLoadingHistory={loadingHistory === subtema.id} />
                              ))}
                            </div>
                          </>
                        ) : (
                          /* NO SUBTEMAS EMPTY STATE */
                          <div className="px-5 py-10 text-center bg-slate-50/20">
                            <p className="text-sm text-slate-500 italic max-w-sm mx-auto">
                              O tema <strong className="text-slate-700">{tema.nome}</strong> ainda não possui tópicos associados. Volte mais tarde para conferir novas atualizações.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisciplinaDetailPage;