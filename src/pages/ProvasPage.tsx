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
  cargoService 
} from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  Search, 
  Filter, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Calendar,
  Building2,
  Briefcase
} from 'lucide-react';

type ConcursoDto = Types.ConcursoSummaryDto;

const ProvasPage = () => {
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

  const { setValue, watch, reset } = useForm({
    defaultValues: {
      selectedBanca: null as { value: number, label: string } | null,
      selectedInstituicao: null as { value: number, label: string } | null,
      selectedInstituicaoArea: null as { value: string, label: string } | null,
      selectedCargoArea: null as { value: string, label: string } | null,
      selectedCargoNivel: ''
    }
  });

  const watchedFields = watch();

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size: 20,
        bancaId: watchedFields.selectedBanca?.value || undefined,
        instituicaoId: watchedFields.selectedInstituicao?.value || undefined,
        instituicaoArea: watchedFields.selectedInstituicaoArea?.value || undefined,
        cargoArea: watchedFields.selectedCargoArea?.value || undefined,
        cargoNivel: watchedFields.selectedCargoNivel || undefined,
      };

      const data = await concursoService.getAll(params);
      setConcursos(data.content);
      setPagination(data);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
    } finally {
      setLoading(false);
    }
  }, [
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicao,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel
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
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  const handleStartProva = (concursoId: number, cargoId: number, instituicaoId: number) => {
    navigate(`/provas/executar?concursoId=${concursoId}&cargoId=${cargoId}&instituicaoId=${instituicaoId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Provas" actions={<div className="text-sm text-gray-500 font-medium">Selecione um concurso e cargo para começar</div>} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <Filter className="w-5 h-5 text-indigo-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Filtros de Provas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banca</label>
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instituição</label>
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nível</label>
              <Select 
                options={[
                  { value: '', label: 'Todos' }, 
                  { value: 'FUNDAMENTAL', label: 'Fundamental' }, 
                  { value: 'MEDIO', label: 'Médio' }, 
                  { value: 'SUPERIOR', label: 'Superior' }
                ]} 
                value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos' }} 
                onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')} 
                styles={selectStyles} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Instituição</label>
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Cargo</label>
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

          <div className="mt-6 flex justify-end">
            <button onClick={() => reset()} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {!loading && concursos.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum concurso encontrado com os filtros selecionados.</p>
            </div>
          )}

          {!loading && concursos.map((concurso) => (
            <div key={concurso.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-indigo-300 transition-colors">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {concurso.banca.nome}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        <Calendar className="w-3 h-3 mr-1" />
                        {concurso.ano}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Building2 className="w-3 h-3 mr-1" />
                        {concurso.instituicao.area}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{concurso.instituicao.nome}</h3>
                    
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargos Disponíveis</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {concurso.cargos.map((cargo) => (
                          <div key={cargo.id} className="group bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-lg p-3 transition-all cursor-pointer" onClick={() => handleStartProva(concurso.id, cargo.id, concurso.instituicao.id)}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-900">{cargo.nome}</p>
                                <div className="flex items-center mt-1 text-xs text-gray-500 group-hover:text-indigo-700">
                                  <Briefcase className="w-3 h-3 mr-1" />
                                  <span>{cargo.area}</span>
                                  <span className="mx-1">•</span>
                                  <span>{formatNivel(cargo.nivel)}</span>
                                </div>
                              </div>
                              <div className="ml-2 flex-shrink-0">
                                <button className="p-1.5 rounded-md bg-white border border-gray-200 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center mt-10">
             <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button onClick={() => loadConcursos(currentPage - 1)} disabled={currentPage === 0} className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button key={i} onClick={() => loadConcursos(i)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors ${currentPage === i ? 'z-10 bg-indigo-600 text-white ring-1 ring-inset ring-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => loadConcursos(currentPage + 1)} disabled={currentPage === pagination.totalPages - 1} className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
             </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvasPage;