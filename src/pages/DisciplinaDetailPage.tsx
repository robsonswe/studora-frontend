import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, subtemaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import {
  ArrowLeft,
  Folder,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  X,
  AlertTriangle,
  Target
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

// ─── Helpers Components ─────────────────────────────────────────────────────

/**
 * Renderiza os indicadores de performance por nível de dificuldade
 * Incluindo o nível "CHUTE" (Guess)
 */
const DifficultyMiniBadges = ({ stats }: { stats: Record<string, Types.DificuldadeStatDto> }) => {
  const levels = [
    { key: 'FACIL', label: 'F', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'MEDIA', label: 'M', text: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'DIFICIL', label: 'D', text: 'text-rose-700', bg: 'bg-rose-50' },
    { key: 'CHUTE', label: 'C', text: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
  ];

  const activeStats = levels.filter(lvl => stats[lvl.key] && stats[lvl.key].total > 0);

  if (activeStats.length === 0) return null;

  return (
    <div className="flex gap-1">
      {activeStats.map((lvl) => {
        const data = stats[lvl.key];
        const acc = Math.round((data.corretas / data.total) * 100);
        return (
          <div 
            key={lvl.key} 
            title={`${lvl.key}: ${data.corretas}/${data.total} acertos`}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${lvl.bg} ${lvl.text} border border-black/5`}
          >
            <span className="opacity-70">{lvl.label}</span>
            <span>{acc}%</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Page Component ─────────────────────────────────────────────────────────
const DisciplinaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [disciplina, setDisciplina] = useState<Types.DisciplinaDetailDto | null>(null);
  const [temas, setTemas] = useState<TemaWithSubtemas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingEstudo, setAddingEstudo] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [expandedEstudos, setExpandedEstudos] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadDisciplina(parseInt(id));
  }, [id]);

  const loadDisciplina = async (disciplinaId: number) => {
    setLoading(true);
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
    } catch (err) {
      setError('Não foi possível carregar os dados da disciplina.');
    } finally {
      setLoading(false);
    }
  };

  const addEstudo = async (subtemaId: number) => {
    setAddingEstudo(subtemaId);
    setActionError(null);
    try {
      await subtemaService.addEstudo(subtemaId);
      setExpandedEstudos(null);
      await loadDisciplina(parseInt(id!));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao registrar estudo.');
    } finally {
      setAddingEstudo(null);
    }
  };

  const confirmDeleteEstudo = async () => {
    if (!deleteConfirmation) return;
    setAddingEstudo(deleteConfirmation.subtemaId);
    try {
      await subtemaService.deleteEstudo(deleteConfirmation.subtemaId, deleteConfirmation.estudoId);
      setExpandedEstudos(null);
      setDeleteConfirmation(null);
      await loadDisciplina(parseInt(id!));
    } catch (err) {
      setActionError('Erro ao excluir estudo.');
      setDeleteConfirmation(null);
    } finally {
      setAddingEstudo(null);
    }
  };

  const toggleEstudos = async (subtemaId: number) => {
    if (expandedEstudos === subtemaId) {
      setExpandedEstudos(null);
    } else {
      setExpandedEstudos(subtemaId);
      const allSubtemas = temas.flatMap(t => t.subtemas);
      const subtema = allSubtemas.find(s => s.id === subtemaId);
      if (subtema && !subtema.estudosLoaded) {
        const estudos = await subtemaService.getEstudos(subtemaId);
        setTemas(prev => prev.map(t => ({
          ...t,
          subtemas: t.subtemas.map(s => s.id === subtemaId ? { ...s, estudos, estudosLoaded: true } : s)
        })));
      }
    }
  };

  const calculateAccuracy = (respondidas: number, acertadas: number) => {
    return respondidas > 0 ? Math.round((acertadas / respondidas) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Sincronizando tópicos...</p>
        </div>
      </div>
    );
  }

  if (error || !disciplina) return null;

  const accuracy = calculateAccuracy(disciplina.questoesRespondidas, disciplina.questoesAcertadas);
  const studyProgress = disciplina.totalSubtemas > 0 
    ? Math.round((disciplina.subtemasEstudados / disciplina.totalSubtemas) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title={
          <button onClick={() => navigate('/disciplinas')} className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">{disciplina.nome}</span>
          </button>
        }
      />

      {/* Action Error Toast */}
      {actionError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmation(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Remover sessão?</h3>
            <p className="text-sm text-slate-500 mb-6">Esta ação removerá permanentemente o registro de estudo deste tópico.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmation(null)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={confirmDeleteEstudo} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Remover</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cobertura do Edital</h2>
              <span className="text-sm font-bold text-indigo-600">{studyProgress}%</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{disciplina.subtemasEstudados}/{disciplina.totalSubtemas}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Tópicos estudados</p>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${studyProgress}%` }} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precisão Geral</h2>
              <DifficultyMiniBadges stats={disciplina.dificuldadeRespostas} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{accuracy}%</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{disciplina.questoesRespondidas} questões resolvidas</p>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Tempo médio / Q.</span>
               <span className="text-xs font-bold text-slate-700">{disciplina.mediaTempoResposta ? `${Math.round(disciplina.mediaTempoResposta)}s` : '—'}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
             <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Última Atividade</h2>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Clock className="w-5 h-5" /></div>
               <div>
                 <p className="text-sm font-bold text-slate-900">{disciplina.ultimoEstudo ? new Date(disciplina.ultimoEstudo).toLocaleDateString('pt-BR') : 'Sem registros'}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase">Sessão de estudo</p>
               </div>
             </div>
             <div className="mt-4 text-[10px] text-slate-400 font-medium italic text-right">
               {disciplina.totalEstudos} sessões totais
             </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {temas.map((tema) => {
              const temaAcc = calculateAccuracy(tema.questoesRespondidas, tema.questoesAcertadas);
              return (
                <div key={tema.id} className="bg-white">
                  {/* Tema Row */}
                  <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-bold text-slate-800">{tema.nome}</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block">
                        <DifficultyMiniBadges stats={tema.dificuldadeRespostas} />
                      </div>
                      <div className="text-right border-l border-slate-200 pl-4">
                        <span className="text-xs font-bold text-slate-900 block">{temaAcc}%</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Precisão</span>
                      </div>
                    </div>
                  </div>

                  {/* Tópicos List */}
                  <ul className="divide-y divide-slate-50">
                    {tema.subtemas.map((subtema) => {
                      const subAcc = calculateAccuracy(subtema.questoesRespondidas, subtema.questoesAcertadas);
                      const isExpanded = expandedEstudos === subtema.id;

                      return (
                        <li key={subtema.id} className="p-6 hover:bg-slate-50/30 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-start gap-4">
                              <div className="mt-1">
                                {subtema.totalEstudos > 0 ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-800 mb-1">{subtema.nome}</h4>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  <span>{subtema.totalEstudos} estudos</span>
                                  {subtema.ultimoEstudo && <span>• Ativo em {new Date(subtema.ultimoEstudo).toLocaleDateString('pt-BR')}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-5 self-end sm:self-center">
                              <DifficultyMiniBadges stats={subtema.dificuldadeRespostas} />
                              <div className="text-right min-w-[60px]">
                                <span className={`text-xs font-bold ${subAcc >= 70 ? 'text-emerald-600' : 'text-slate-900'}`}>{subAcc}%</span>
                                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{subtema.questoesRespondidas} res.</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => addEstudo(subtema.id)}
                              disabled={addingEstudo === subtema.id}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              {addingEstudo === subtema.id ? <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Registrar Estudo
                            </button>
                            {subtema.totalEstudos > 0 && (
                              <button 
                                onClick={() => toggleEstudos(subtema.id)} 
                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                {isExpanded ? 'Ocultar Histórico' : 'Ver Histórico'}
                              </button>
                            )}
                          </div>

                          {/* Expanded History */}
                          {isExpanded && (
                            <div className="mt-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
                              {subtema.estudos?.map((estudo) => (
                                <div key={estudo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {new Date(estudo.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <button
                                    onClick={() => setDeleteConfirmation({ subtemaId: subtema.id, estudoId: estudo.id, subtemaNome: subtema.nome })}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisciplinaDetailPage;