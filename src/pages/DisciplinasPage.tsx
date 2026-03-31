import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { disciplinaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import {
  Folder,
  ChevronRight,
  AlertCircle,
  Target,
  X
} from 'lucide-react';

const DisciplinasPage = () => {
  const navigate = useNavigate();
  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDisciplinas();
  }, []);

  const loadDisciplinas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await disciplinaService.getAll({ size: 100 });
      setDisciplinas(data.content);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Verifique sua conexão com a internet e tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-label="Carregando disciplinas">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 font-medium">Carregando disciplinas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Header
        title="Disciplinas"
        actions={
          <div className="text-sm text-gray-500">
            {disciplinas.length} {disciplinas.length === 1 ? 'disciplina' : 'disciplinas'}
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg shadow-lg p-4 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 hover:bg-red-100 rounded p-1 transition-colors"
              aria-label="Fechar alerta de erro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {disciplinas.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="p-3 bg-gray-50 rounded-full inline-block mb-4">
              <Folder className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Nenhuma disciplina encontrada</h3>
            <p className="text-gray-500 text-sm mb-6">
              {error 
                ? 'Não foi possível carregar as disciplinas.' 
                : 'As disciplinas cadastradas aparecerão aqui.'}
            </p>
            {error && (
              <button
                onClick={loadDisciplinas}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {disciplinas.map((disciplina) => (
              <button
                key={disciplina.id}
                onClick={() => navigate(`/disciplinas/${disciplina.id}`)}
                className="group bg-white border border-gray-200 rounded-lg p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={`Ver detalhes de ${disciplina.nome}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Folder className="w-6 h-6 text-indigo-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </div>

                <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[2.5rem]">
                  {disciplina.nome}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Target className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Ver tópicos</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisciplinasPage;
