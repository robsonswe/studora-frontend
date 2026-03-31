import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import {
  concursoService,
  bancaService,
  instituicaoService,
  cargoService,
  ApiError
} from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import {
  BookOpen,
  Link as LinkIcon,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';

type ConcursoDto = Types.ConcursoSummaryDto;

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const ConcursosPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [pagination, setPagination] = useState<Types.PageResponse<ConcursoDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { setValue, watch, reset } = useForm({
    defaultValues: {
      selectedBanca: null as { value: number, label: string } | null,
      selectedInstituicao: null as { value: number, label: string } | null,
      selectedCargoNivel: '',
      selectedInscrito: '',
      selectedInstituicaoArea: null as { value: string, label: string } | null,
      selectedCargoArea: null as { value: string, label: string } | null,
    }
  });

  const watchedFields = watch();

  const addToast = (type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, any> = {
        page,
        size: 20,
        bancaId: watchedFields.selectedBanca?.value || undefined,
        instituicaoId: watchedFields.selectedInstituicao?.value || undefined,
        instituicaoArea: watchedFields.selectedInstituicaoArea?.value || undefined,
        cargoArea: watchedFields.selectedCargoArea?.value || undefined,
        cargoNivel: watchedFields.selectedCargoNivel || undefined,
        inscrito: watchedFields.selectedInscrito ? watchedFields.selectedInscrito === 'true' : undefined,
      };

      const data = await concursoService.getAll(params);
      setConcursos(data.content);
      setPagination(data);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Verifique sua conexão com a internet e tente novamente.';
      setLoadError(errorMessage);
      addToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicao,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel,
    watchedFields.selectedInscrito
  ]);

  useEffect(() => {
    loadConcursos(0);
  }, [loadConcursos]);

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(b => ({ value: b.id, label: b.nome }));
  };

  const loadInstituicaoOptions = async (inputValue: string) => {
    const data = await instituicaoService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(i => ({ value: i.id, label: i.nome }));
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    return areas.map(area => ({ value: area, label: area }));
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    return areas.map(area => ({ value: area, label: area }));
  };

  const selectStyles = {
    control: (base: Record<string, unknown>) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  const handleStartProva = (concursoId: number, cargoId: number, instituicaoId: number) => {
    navigate(`/provas/executar?concursoId=${concursoId}&cargoId=${cargoId}&instituicaoId=${instituicaoId}`);
  };

  const handleToggleInscricao = async (concursoCargoId: number, cargoId: number) => {
    setToggleLoading(cargoId);
    try {
      await concursoService.toggleInscricao(concursoCargoId);
      await loadConcursos(currentPage);
      addToast('success', 'Inscrição atualizada!');
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Não foi possível atualizar. Tente novamente em instantes.';
      addToast('error', errorMessage);
    } finally {
      setToggleLoading(null);
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Header title="Concursos" actions={<div className="text-sm text-gray-500">Busque concursos por instituição, banca ou cargo</div>} />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm animate-slide-in ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-black/10 rounded p-0.5 transition-colors -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-700">Filtros</h2>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              {showAdvancedFilters ? 'Menos filtros' : 'Mais filtros'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Banca organizadora</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadBancaOptions}
                value={watchedFields.selectedBanca}
                onChange={(val) => setValue('selectedBanca', val)}
                isClearable
                placeholder="Todas as bancas"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Instituição</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadInstituicaoOptions}
                value={watchedFields.selectedInstituicao}
                onChange={(val) => setValue('selectedInstituicao', val)}
                isClearable
                placeholder="Todas as instituições"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Escolaridade</label>
              <Select
                options={[
                  { value: '', label: 'Todas' },
                  { value: 'FUNDAMENTAL', label: 'Fundamental' },
                  { value: 'MEDIO', label: 'Médio' },
                  { value: 'SUPERIOR', label: 'Superior' }
                ]}
                value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todas' }}
                onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Minha inscrição</label>
              <Select
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'true', label: 'Inscrito' },
                  { value: 'false', label: 'Não inscrito' }
                ]}
                value={watchedFields.selectedInscrito ? { value: watchedFields.selectedInscrito, label: watchedFields.selectedInscrito === 'true' ? 'Inscrito' : 'Não inscrito' } : { value: '', label: 'Todos' }}
                onChange={(opt) => setValue('selectedInscrito', opt?.value || '')}
                styles={selectStyles}
              />
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Área da instituição</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  isClearable
                  placeholder="Todas as áreas"
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Área do cargo</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  isClearable
                  placeholder="Todas as áreas"
                  styles={selectStyles}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button
              onClick={() => { reset(); setShowAdvancedFilters(false); }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          )}

          {loadError && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Não foi possível carregar os concursos</h3>
              <p className="text-gray-600 mb-5 text-sm max-w-sm mx-auto">{loadError}</p>
              <button
                onClick={() => loadConcursos(currentPage)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !loadError && concursos.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
              <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Nenhum concurso encontrado</h3>
              <p className="text-gray-600 mb-4 text-sm">Tente remover alguns filtros para ver mais resultados.</p>
              <button
                onClick={() => { reset(); setShowAdvancedFilters(false); }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}

          {!loading && concursos.map((concurso) => (
            <div key={concurso.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {concurso.banca.nome}
                  </span>
                  <span className="text-sm text-gray-600">{concurso.ano}</span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{concurso.instituicao.area}</span>
                  {concurso.edital && isValidUrl(concurso.edital) && (
                    <a
                      href={concurso.edital}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1.5 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Edital
                    </a>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900">{concurso.instituicao.nome}</h3>

                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Cargos disponíveis</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {concurso.cargos.map((cargo) => (
                      <div key={cargo.id} className="border border-gray-200 rounded-md p-3.5 hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{cargo.cargoNome}</p>
                            <p className="text-xs text-gray-500 mt-1">{cargo.area} • {formatNivel(cargo.nivel)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-gray-100">
                          {cargo.inscrito ? (
                            <span className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Inscrito
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Circle className="w-3.5 h-3.5" />
                              Não inscrito
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleInscricao(cargo.id, cargo.cargoId)}
                            disabled={toggleLoading === cargo.cargoId}
                            className={`text-xs font-medium transition-all ${
                              cargo.inscrito
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded'
                                : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {toggleLoading === cargo.cargoId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : cargo.inscrito ? (
                              'Cancelar'
                            ) : (
                              'Inscrever'
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => handleStartProva(concurso.id, cargo.cargoId, concurso.instituicao.id)}
                          className="w-full mt-3 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                        >
                          Fazer prova
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!loading && !loadError && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{(currentPage * pagination.pageSize) + 1}</span>–
              <span className="font-medium">{Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}</span> de{' '}
              <span className="font-medium">{pagination.totalElements}</span> concursos
            </p>
            <nav className="flex gap-2">
              <button
                onClick={() => loadConcursos(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                Página anterior
              </button>
              <button
                onClick={() => loadConcursos(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className="px-4 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                Próxima página
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConcursosPage;
