import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, temaService, subtemaService, ApiError } from '@/services/api';
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
  AlertTriangle
} from 'lucide-react';

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

const DisciplinaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [disciplina, setDisciplina] = useState<Types.DisciplinaSummaryDto | null>(null);
  const [temas, setTemas] = useState<TemaWithSubtemas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingEstudo, setAddingEstudo] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [expandedEstudos, setExpandedEstudos] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDisciplina(parseInt(id));
    }
  }, [id]);

  const loadDisciplina = async (disciplinaId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [disciplinaData, temasData] = await Promise.all([
        disciplinaService.getById(disciplinaId),
        temaService.getByDisciplina(disciplinaId),
      ]);

      setDisciplina(disciplinaData);
      
      // Load all subtemas for all temas
      const temasWithSubtemas = await Promise.all(
        temasData.map(async (t) => {
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

  const loadEstudos = async (subtemaId: number) => {
    try {
      return await subtemaService.getEstudos(subtemaId);
    } catch (err) {
      console.error('Erro ao carregar estudos:', err);
      return [];
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
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Não foi possível adicionar estudo. Tente novamente.';
      setActionError(errorMessage);
    } finally {
      setAddingEstudo(null);
    }
  };

  const requestDeleteEstudo = (subtemaId: number, estudoId: number, subtemaNome: string) => {
    setDeleteConfirmation({ subtemaId, estudoId, subtemaNome });
  };

  const confirmDeleteEstudo = async () => {
    if (!deleteConfirmation) return;
    
    setAddingEstudo(deleteConfirmation.subtemaId);
    setActionError(null);
    try {
      await subtemaService.deleteEstudo(deleteConfirmation.subtemaId, deleteConfirmation.estudoId);
      setExpandedEstudos(null);
      setDeleteConfirmation(null);
      await loadDisciplina(parseInt(id!));
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Não foi possível excluir estudo. Tente novamente.';
      setActionError(errorMessage);
      setDeleteConfirmation(null);
    } finally {
      setAddingEstudo(null);
    }
  };

  const cancelDeleteEstudo = () => {
    setDeleteConfirmation(null);
  };

  const toggleEstudos = async (subtemaId: number) => {
    if (expandedEstudos === subtemaId) {
      setExpandedEstudos(null);
    } else {
      setExpandedEstudos(subtemaId);
      
      const allSubtemas = temas.flatMap(t => t.subtemas);
      const subtema = allSubtemas.find(s => s.id === subtemaId);
      
      if (subtema && !subtema.estudosLoaded) {
        const estudos = await loadEstudos(subtemaId);
        setTemas((prev) => {
          return prev.map((t) => ({
            ...t,
            subtemas: t.subtemas.map((s) => 
              s.id === subtemaId 
                ? { ...s, estudos, estudosLoaded: true }
                : s
            ),
          }));
        });
      }
    }
  };

  const getEmptyEstudosMessage = (subtema: SubtemaWithEstudos) => {
    if (!subtema.estudosLoaded) {
      return 'Carregando...';
    }
    if (subtema.estudos && subtema.estudos.length === 0) {
      return 'Nenhuma sessão registrada';
    }
    return null;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    if (diffHours < 24) return `${diffHours} h atrás`;
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  // Calculate progress
  const totalSubtemas = temas.reduce((acc, t) => acc + t.subtemas.length, 0);
  const subtemasComEstudos = temas.reduce((acc, t) => 
    acc + t.subtemas.filter(s => s.totalEstudos > 0).length, 0
  );
  const progressPercentage = totalSubtemas > 0 ? Math.round((subtemasComEstudos / totalSubtemas) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-label="Carregando disciplina">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 font-medium">Carregando disciplina...</p>
        </div>
      </div>
    );
  }

  if (error || !disciplina) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4 text-sm">{error || 'Disciplina não encontrada'}</p>
          <button
            onClick={() => navigate('/disciplinas')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            Voltar para disciplinas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Header
        title={
          <button
            onClick={() => navigate('/disciplinas')}
            className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {disciplina.nome}
          </button>
        }
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={cancelDeleteEstudo}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-sm max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 id="modal-title" className="text-base font-semibold text-gray-900">Excluir esta sessão de estudo?</h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Esta ação não pode ser desfeita. A sessão será removida permanentemente do seu histórico em{' '}
              <span className="font-medium text-gray-900">"{deleteConfirmation.subtemaNome}"</span>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelDeleteEstudo}
                disabled={addingEstudo !== null}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteEstudo}
                disabled={addingEstudo !== null}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                {addingEstudo === deleteConfirmation.subtemaId ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Excluindo...
                  </span>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Error Alert */}
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg shadow-sm p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium flex-1">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="flex-shrink-0 hover:bg-red-100 rounded p-1 transition-colors"
              aria-label="Fechar alerta de erro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Progresso na disciplina</h2>
            <span className="text-sm font-bold font-mono text-indigo-600">{progressPercentage}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <span className="font-medium text-gray-700">{subtemasComEstudos}</span> de{' '}
            <span className="font-medium text-gray-700">{totalSubtemas}</span> subtemas com pelo menos uma sessão de estudo
          </p>
        </div>

        {/* Temas e Subtemas */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {temas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-3 bg-gray-50 rounded-full inline-block mb-4">
                <Folder className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Nenhum tema encontrado</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Esta disciplina ainda não possui temas cadastrados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {temas.map((tema) => (
                <div key={tema.id}>
                  {/* Tema Header */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                    <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900">{tema.nome}</h3>
                  </div>

                  {/* Subtemas */}
                  {tema.subtemas.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-gray-500">
                      Nenhum subtema cadastrado para este tema.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {tema.subtemas.map((subtema) => {
                        const hasEstudos = subtema.totalEstudos > 0;
                        const isExpanded = expandedEstudos === subtema.id;

                        return (
                          <li key={subtema.id} className="group/subtema px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start gap-3">
                              {hasEstudos ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{subtema.nome}</p>

                                {hasEstudos && (
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{formatRelativeTime(subtema.ultimoEstudo!)}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{subtema.totalEstudos} {subtema.totalEstudos === 1 ? 'estudo' : 'estudos'}</span>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-3">
                                  <button
                                    onClick={() => addEstudo(subtema.id)}
                                    disabled={addingEstudo === subtema.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    {addingEstudo === subtema.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                    Registrar estudo
                                  </button>

                                  {hasEstudos && (
                                    <button
                                      onClick={() => toggleEstudos(subtema.id)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                    >
                                      {isExpanded ? 'Ocultar' : 'Ver'} histórico ({subtema.totalEstudos})
                                    </button>
                                  )}
                                </div>

                                {/* Estudos List */}
                                {isExpanded && (
                                  <div className="mt-4">
                                    {subtema.estudos && subtema.estudos.length > 0 ? (
                                      <div className="space-y-2.5">
                                        {subtema.estudos.map((estudo) => (
                                          <div
                                            key={estudo.id}
                                            className="group/estudo flex items-center justify-between text-xs py-2 px-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover/estudo:text-gray-500 transition-colors" />
                                              <span className="text-gray-600">{formatDateTime(estudo.createdAt)}</span>
                                            </div>
                                            <button
                                              onClick={() => requestDeleteEstudo(subtema.id, estudo.id, subtema.nome)}
                                              disabled={addingEstudo !== null}
                                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                              aria-label={`Excluir sessão de ${formatDateTime(estudo.createdAt)}`}
                                            >
                                              {addingEstudo === subtema.id ? (
                                                <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                              ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 py-3 px-3 bg-gray-50 rounded border border-gray-100">
                                        {getEmptyEstudosMessage(subtema)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisciplinaDetailPage;
