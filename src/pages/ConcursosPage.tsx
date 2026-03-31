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
  SlidersHorizontal,
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
      ...base,
      borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
      boxShadow: 'none',
      '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#d1d5db' },
      borderRadius: '0.5rem',
      backgroundColor: '#fff',
      fontSize: '0.875rem',
      minHeight: '42px',
      transition: 'all 0.2s ease'
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '0.5rem',
      border: '1px border-gray-100'
    }),
    option: (base: Record<string, unknown>, state: { isFocused: boolean, isSelected: boolean }) => ({
      ...base,
      backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f5f7ff' : 'transparent',
      color: state.isSelected ? '#fff' : '#374151',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.875rem',
      '&:active': { backgroundColor: '#e0e7ff' }
    }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: '#1f2937', fontWeight: '500' }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' })
  };

  const handleStartProva = (concursoId: number, cargoId: number, instituicaoId: number) => {
    navigate(`/provas/executar?concursoId=${concursoId}&cargoId=${cargoId}&instituicaoId=${instituicaoId}`);
  };

  const handleToggleInscricao = async (concursoCargoId: number, cargoId: number) => {
    setToggleLoading(cargoId);
    try {
      await concursoService.toggleInscricao(concursoCargoId);
      await loadConcursos(currentPage);
      addToast('success', 'Preferências de inscrição atualizadas com sucesso.');
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Ocorreu um erro ao atualizar sua inscrição. Por favor, tente novamente.';
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

  const getActiveFilterLabels = () => {
    const labels: string[] = [];
    if (watchedFields.selectedBanca) labels.push(watchedFields.selectedBanca.label);
    if (watchedFields.selectedInstituicao) labels.push(watchedFields.selectedInstituicao.label);
    if (watchedFields.selectedCargoNivel) labels.push(formatNivel(watchedFields.selectedCargoNivel));
    if (watchedFields.selectedInscrito === 'true') labels.push('Inscrito');
    if (watchedFields.selectedInscrito === 'false') labels.push('Não inscrito');
    if (watchedFields.selectedInstituicaoArea) labels.push(watchedFields.selectedInstituicaoArea.label);
    if (watchedFields.selectedCargoArea) labels.push(watchedFields.selectedCargoArea.label);
    return labels;
  };

  const activeFilterLabels = getActiveFilterLabels();

  return (
    <div className="space-y-8 pb-20">
      <Header 
        title="Explorar Concursos" 
        actions={
          <div className="text-sm font-medium text-slate-500 max-w-xs text-right hidden sm:block leading-relaxed">
            Encontre editais, organize suas inscrições e pratique com provas anteriores.
          </div>
        } 
      />

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
            <p className="text-sm font-semibold flex-1 leading-relaxed tracking-tight">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:bg-black/10 rounded p-0.5 transition-colors -mt-1 -mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile filter summary bar */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-indigo-600 shadow-sm active:scale-95 transition-all hover:border-indigo-200 min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
          {activeFilterLabels.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 no-scrollbar">
              {activeFilterLabels.map((label) => (
                <span key={label} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 whitespace-nowrap flex-shrink-0">
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-medium">Todos os concursos</p>
          )}
        </div>
        {activeFilterLabels.length > 0 && (
          <button
            onClick={() => { reset(); setShowAdvancedFilters(false); setShowMobileFilters(false); }}
            className="text-xs text-slate-400 hover:text-indigo-600 font-bold transition-colors active:scale-95 tracking-tight mt-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Desktop filter card */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm mb-10 overflow-hidden animate-fade-in-up transition-all duration-300 hover:border-indigo-100">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-50 bg-slate-50/20">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Filtros
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { reset(); setShowAdvancedFilters(false); setShowMobileFilters(false); }}
                className="text-xs text-slate-400 hover:text-indigo-600 font-bold transition-colors active:scale-95 tracking-tight px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Limpar filtros
              </button>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50/30 px-3 py-2 rounded-lg transition-all border border-indigo-100/30 hover:bg-indigo-50 active:scale-95 tracking-tight"
              >
                {showAdvancedFilters ? 'Filtros básicos' : 'Mais opções'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Banca Organizadora</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadBancaOptions}
                value={watchedFields.selectedBanca}
                onChange={(val) => setValue('selectedBanca', val)}
                isClearable
                placeholder="Pesquisar banca..."
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
              <AsyncSelect
                cacheOptions
                defaultOptions
                loadOptions={loadInstituicaoOptions}
                value={watchedFields.selectedInstituicao}
                onChange={(val) => setValue('selectedInstituicao', val)}
                isClearable
                placeholder="Pesquisar instituição..."
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
              <Select
                options={[
                  { value: '', label: 'Todos os níveis' },
                  { value: 'FUNDAMENTAL', label: 'Fundamental' },
                  { value: 'MEDIO', label: 'Médio' },
                  { value: 'SUPERIOR', label: 'Superior' }
                ]}
                value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos os níveis' }}
                onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Minhas Inscrições</label>
              <Select
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'true', label: 'Já inscrito' },
                  { value: 'false', label: 'Não inscrito' }
                ]}
                value={watchedFields.selectedInscrito ? { value: watchedFields.selectedInscrito, label: watchedFields.selectedInscrito === 'true' ? 'Já inscrito' : 'Não inscrito' } : { value: '', label: 'Todos' }}
                onChange={(opt) => setValue('selectedInscrito', opt?.value || '')}
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showAdvancedFilters ? 'grid-rows-[1fr] opacity-100 mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-slate-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Instituição)</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadInstituicaoAreaOptions}
                    value={watchedFields.selectedInstituicaoArea}
                    onChange={(val) => setValue('selectedInstituicaoArea', val)}
                    isClearable
                    placeholder="Filtrar por área..."
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Cargo)</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadCargoAreaOptions}
                    value={watchedFields.selectedCargoArea}
                    onChange={(val) => setValue('selectedCargoArea', val)}
                    isClearable
                    placeholder="Filtrar por área do cargo..."
                    styles={selectStyles}
                    menuPortalTarget={document.body}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-55 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up" style={{ margin: 0 }}>
            <div className="shrink-0 bg-white px-5 pt-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Todos os filtros</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 -mr-2 rounded-lg hover:bg-slate-100 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Banca Organizadora</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={watchedFields.selectedBanca}
                  onChange={(val) => setValue('selectedBanca', val)}
                  isClearable
                  placeholder="Pesquisar banca..."
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoOptions}
                  value={watchedFields.selectedInstituicao}
                  onChange={(val) => setValue('selectedInstituicao', val)}
                  isClearable
                  placeholder="Pesquisar instituição..."
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
                <Select
                  options={[
                    { value: '', label: 'Todos os níveis' },
                    { value: 'FUNDAMENTAL', label: 'Fundamental' },
                    { value: 'MEDIO', label: 'Médio' },
                    { value: 'SUPERIOR', label: 'Superior' }
                  ]}
                  value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos os níveis' }}
                  onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Minhas Inscrições</label>
                <Select
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'true', label: 'Já inscrito' },
                    { value: 'false', label: 'Não inscrito' }
                  ]}
                  value={watchedFields.selectedInscrito ? { value: watchedFields.selectedInscrito, label: watchedFields.selectedInscrito === 'true' ? 'Já inscrito' : 'Não inscrito' } : { value: '', label: 'Todos' }}
                  onChange={(opt) => setValue('selectedInscrito', opt?.value || '')}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Instituição)</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  isClearable
                  placeholder="Filtrar por área..."
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Cargo)</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  isClearable
                  placeholder="Filtrar por área do cargo..."
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm min-h-[48px]"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Results */}
        <div className="space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-in fade-in duration-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
              <p className="text-sm font-semibold text-slate-500 tracking-tight">Localizando concursos disponíveis...</p>
            </div>
          )}

          {loadError && !loading && (
            <div className="bg-white border border-red-100 rounded-xl p-6 sm:p-10 text-center shadow-sm animate-in zoom-in-95 duration-300">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Ops! Não conseguimos carregar os dados</h3>
              <p className="text-slate-500 mb-6 text-sm font-medium leading-relaxed max-w-sm mx-auto">{loadError}</p>
              <button
                onClick={() => loadConcursos(currentPage)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !loadError && concursos.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-8 sm:p-16 text-center shadow-sm animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Nenhum concurso corresponde à sua busca</h3>
              <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed max-w-xs mx-auto">Experimente remover alguns filtros ou utilizar termos mais genéricos.</p>
              <button
                onClick={() => { reset(); setShowAdvancedFilters(false); setShowMobileFilters(false); }}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors inline-flex items-center gap-2 active:scale-95"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}

          {!loading && concursos.map((concurso, concursoIndex) => (
            <div 
              key={concurso.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100/80 animate-fade-in-up group"
              style={{ animationDelay: `${concursoIndex * 50}ms` }}
            >
          <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-50/50 text-indigo-600 border border-indigo-100/40">
                    {concurso.banca.nome}
                  </span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 tracking-tight">
                    <span>{concurso.ano}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>{concurso.instituicao.area}</span>
                  </div>
                  {concurso.edital && isValidUrl(concurso.edital) && (
                    <a
                      href={concurso.edital}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-bold inline-flex items-center gap-1.5 transition-all sm:ml-auto active:scale-95 tracking-tight group/link"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-400 group-hover/link:text-indigo-600 transition-colors" />
                      Visualizar Edital
                    </a>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 lg:mb-8 tracking-tight group-hover:text-indigo-900 transition-colors leading-tight">{concurso.instituicao.nome}</h3>

                <div className="space-y-0 border-t border-gray-100 -mx-4 sm:-mx-6 lg:-mx-8">
                  {concurso.cargos.map((cargo, index) => {
                    const isInscribedInAny = concurso.cargos.some(c => c.inscrito);
                    
                    return (
                      <div
                        key={cargo.id}
                        className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 hover:bg-indigo-50/10 transition-colors ${
                          index !== concurso.cargos.length - 1 ? 'border-b border-slate-50' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                            <p className="text-base font-bold text-slate-800 tracking-tight leading-snug">{cargo.cargoNome}</p>
                            {cargo.inscrito ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/50 animate-in zoom-in-95 duration-300">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Inscrito
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 tracking-tight">
                            <span className="text-slate-400/70">{cargo.area}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span>{formatNivel(cargo.nivel)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                          {/* Only show button if: 
                              1. This cargo is already inscribed (to allow removal)
                              2. NO cargo in this concurso is inscribed (to allow new inscription)
                          */}
                          {(cargo.inscrito || !isInscribedInAny) && (
                            <button
                              onClick={() => handleToggleInscricao(cargo.id, cargo.cargoId)}
                              disabled={toggleLoading === cargo.cargoId}
                              className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 sm:py-2 rounded-lg transition-all border text-center ${
                                cargo.inscrito
                                  ? 'text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-red-500 hover:border-red-100'
                                  : 'text-indigo-500 border-indigo-100/60 hover:bg-indigo-50 hover:text-indigo-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                            >
                              {toggleLoading === cargo.cargoId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : cargo.inscrito ? (
                                'Remover Inscrição'
                              ) : (
                                'Marcar Inscrição'
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleStartProva(concurso.id, cargo.cargoId, concurso.instituicao.id)}
                            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-2.5 sm:py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-indigo-200/50 active:scale-95 border border-indigo-700/10"
                          >
                            Resolver Prova
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!loading && !loadError && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 hidden sm:block">
              <span className="font-medium">{(currentPage * pagination.pageSize) + 1}</span>–
              <span className="font-medium">{Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}</span> de{' '}
              <span className="font-medium">{pagination.totalElements}</span> concursos
            </p>
            <nav className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => loadConcursos(currentPage - 1)}
                disabled={currentPage === 0}
                className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                Anterior
              </button>
              <button
                onClick={() => loadConcursos(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className="flex-1 sm:flex-none px-4 py-2 text-sm rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-300 font-medium text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
              >
                Próxima
              </button>
            </nav>
          </div>
        )}
    </div>
  );
};

export default ConcursosPage;
