'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Drawer from '@/components/ui/Drawer';
import { useForm } from 'react-hook-form';
import Select, { StylesConfig } from 'react-select';
import AsyncSelect from 'react-select/async';
import {
  concursoService,
  bancaService,
  instituicaoService,
  cargoService,
  ApiError
} from '@/services/api';
import { formatNivel, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  BookOpen,
  Link as LinkIcon,
  CheckCircle,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  Archive,
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/ToastContext';

type ConcursoDto = Types.ConcursoSummaryDto;

export default function ConcursosPage() {
  const router = useRouter();
  const { showToast } = useToast();
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

  usePageTitle('Concursos');

  type ConcursoParams = Types.PaginationParams & {
    bancaId?: number;
    instituicaoId?: number;
    instituicaoArea?: string;
    cargoArea?: string;
    cargoNivel?: string;
    inscrito?: boolean;
  };

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: ConcursoParams = {
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
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Verifique sua conexão com a internet e tente novamente.';
      setLoadError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicao,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel,
    watchedFields.selectedInscrito,
    showToast
  ]);

  useEffect(() => {
    loadConcursos(0);
  }, [loadConcursos]);

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(b => ({ value: b.id, label: b.sigla || b.nome }));
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

  const selectStyles: StylesConfig<any, false> = {
    control: (base, state) => ({
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
    menu: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '0.5rem',
      border: '1px solid #f1f5f9',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f5f7ff' : 'transparent',
      color: state.isSelected ? '#fff' : '#374151',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.875rem',
      '&:active': { backgroundColor: '#e0e7ff' }
    }),
    singleValue: (base) => ({ ...base, color: '#1f2937', fontWeight: '500' }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' })
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
      <PageHeader
        title="Explorar Concursos"
        actions={
          <div className="text-sm font-medium text-slate-500 max-w-xs text-right hidden sm:block leading-relaxed">
            Encontre editais, organize suas inscrições e pratique com provas anteriores.
          </div>
        }
      />

      {/* Mobile filter bar */}
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
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm mb-10 overflow-hidden transition-all duration-300 hover:border-indigo-100">
        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/20">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtros</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { reset(); setShowAdvancedFilters(false); }}
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

        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Banca Organizadora</label>
              <AsyncSelect
                instanceId="banca-select"
                cacheOptions
                defaultOptions
                loadOptions={loadBancaOptions}
                value={watchedFields.selectedBanca}
                onChange={(val) => setValue('selectedBanca', val)}
                isClearable
                placeholder="Pesquisar banca..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
              <AsyncSelect
                instanceId="instituicao-select"
                cacheOptions
                defaultOptions
                loadOptions={loadInstituicaoOptions}
                value={watchedFields.selectedInstituicao}
                onChange={(val) => setValue('selectedInstituicao', val)}
                isClearable
                placeholder="Pesquisar instituição..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
              <Select
                instanceId="nivel-select"
                options={[
                  { value: '', label: 'Todos os níveis' },
                  { value: 'FUNDAMENTAL', label: 'Fundamental' },
                  { value: 'MEDIO', label: 'Médio' },
                  { value: 'SUPERIOR', label: 'Superior' }
                ]}
                value={watchedFields.selectedCargoNivel
                  ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) }
                  : { value: '', label: 'Todos os níveis' }}
                onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Minhas Inscrições</label>
              <Select
                instanceId="inscrito-select"
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'true', label: 'Já inscrito' },
                  { value: 'false', label: 'Não inscrito' }
                ]}
                value={watchedFields.selectedInscrito
                  ? { value: watchedFields.selectedInscrito, label: watchedFields.selectedInscrito === 'true' ? 'Já inscrito' : 'Não inscrito' }
                  : { value: '', label: 'Todos' }}
                onChange={(opt) => setValue('selectedInscrito', opt?.value || '')}
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Área (Instituição)</label>
                <AsyncSelect
                  instanceId="instituicao-area-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  isClearable
                  placeholder="Filtrar por área..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Cargo)</label>
                <AsyncSelect
                  instanceId="cargo-area-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  isClearable
                  placeholder="Filtrar por área do cargo..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Drawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Todos os filtros"
        footer={
          <button
            onClick={() => setShowMobileFilters(false)}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm min-h-[48px]"
          >
            Aplicar filtros
          </button>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Banca Organizadora</label>
            <AsyncSelect instanceId="mobile-banca-select" cacheOptions defaultOptions loadOptions={loadBancaOptions} value={watchedFields.selectedBanca} onChange={(val) => setValue('selectedBanca', val)} isClearable placeholder="Pesquisar banca..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
            <AsyncSelect instanceId="mobile-instituicao-select" cacheOptions defaultOptions loadOptions={loadInstituicaoOptions} value={watchedFields.selectedInstituicao} onChange={(val) => setValue('selectedInstituicao', val)} isClearable placeholder="Pesquisar instituição..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
            <Select instanceId="mobile-nivel-select" options={[{ value: '', label: 'Todos os níveis' }, { value: 'FUNDAMENTAL', label: 'Fundamental' }, { value: 'MEDIO', label: 'Médio' }, { value: 'SUPERIOR', label: 'Superior' }]} value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos os níveis' }} onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')} styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Minhas Inscrições</label>
            <Select instanceId="mobile-inscrito-select" options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Já inscrito' }, { value: 'false', label: 'Não inscrito' }]} value={watchedFields.selectedInscrito ? { value: watchedFields.selectedInscrito, label: watchedFields.selectedInscrito === 'true' ? 'Já inscrito' : 'Não inscrito' } : { value: '', label: 'Todos' }} onChange={(opt) => setValue('selectedInscrito', opt?.value || '')} styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Área (Instituição)</label>
            <AsyncSelect instanceId="mobile-instituicao-area-select" cacheOptions defaultOptions loadOptions={loadInstituicaoAreaOptions} value={watchedFields.selectedInstituicaoArea} onChange={(val) => setValue('selectedInstituicaoArea', val)} isClearable placeholder="Filtrar por área..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Área (Cargo)</label>
            <AsyncSelect instanceId="mobile-cargo-area-select" cacheOptions defaultOptions loadOptions={loadCargoAreaOptions} value={watchedFields.selectedCargoArea} onChange={(val) => setValue('selectedCargoArea', val)} isClearable placeholder="Filtrar por área do cargo..." styles={selectStyles} menuPortalTarget={typeof document !== 'undefined' ? document.body : null} />
          </div>
        </div>
      </Drawer>

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-400 tracking-tight">Localizando concursos disponíveis...</p>
          </div>
        )}

        {loadError && !loading && (
          <div>
            <Feedback
              type="error"
              title="Erro ao carregar dados"
              message={loadError}
              onClose={() => loadConcursos(currentPage)}
            />
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => loadConcursos(currentPage)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {!loading && !loadError && concursos.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-16 text-center shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Nenhum concurso encontrado</h3>
            <p className="text-slate-400 mb-8 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Experimente remover alguns filtros ou utilizar termos mais genéricos.
            </p>
            <button
              onClick={() => { reset(); setShowAdvancedFilters(false); setShowMobileFilters(false); }}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors inline-flex items-center gap-2 active:scale-95"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}

        {!loading && !loadError && concursos.map((concurso) => {
          // Build area → Set<nivel> map from cargos
          const areaMap = concurso.cargos.reduce((acc, cargo) => {
            const area = cargo.area || 'Geral';
            if (!acc[area]) acc[area] = new Set<string>();
            acc[area].add(cargo.nivel);
            return acc;
          }, {} as Record<string, Set<string>>);

          const areas = Object.entries(areaMap);
          const inscritoCargo = concurso.cargos.find(c => c.inscrito);

          return (
            <div
              key={concurso.id}
              onClick={() => router.push(`/concursos/${concurso.id}`)}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:border-indigo-100/80 hover:shadow-md transition-all duration-200 group"
            >
              {/* Card header: banca + year + area + status */}
              <div className="px-5 py-3.5 sm:px-6 border-b border-slate-50 flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-50/60 text-indigo-600 border border-indigo-100/50">
                  {concurso.banca.sigla || concurso.banca.nome}
                </span>
                <span className="text-xs font-semibold text-slate-400">{concurso.ano}</span>
                <span className="w-1 h-1 rounded-full bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">{concurso.instituicao.area}</span>

                <div className="ml-auto flex items-center gap-2">
                  {concurso.finalizado && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                      <Archive className="w-2.5 h-2.5" />
                      Encerrado
                    </span>
                  )}
                  {inscritoCargo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50/60 border border-emerald-100/50 px-2 py-0.5 rounded">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Inscrito
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight mb-4 group-hover:text-indigo-900 transition-colors">
                  {concurso.instituicao.nome}
                </h3>

                {/* Areas + niveis — the key redesign */}
                {areas.length > 0 && (
                  <div className="space-y-2.5">
                    {areas.map(([area, niveis]) => {
                      const nivelList = Array.from(niveis).sort();
                      return (
                        <div key={area} className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-semibold text-slate-600 flex-1 min-w-0 truncate">
                            {area}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {nivelList.map(nivel => (
                              <span
                                key={nivel}
                                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100"
                              >
                                {formatNivel(nivel)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inscrito cargo detail — read only */}
                {inscritoCargo && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-slate-500">
                      <span className="text-slate-400 font-medium">Inscrito em: </span>
                      {inscritoCargo.cargoNome}
                    </p>
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 sm:px-6 bg-slate-50/40 border-t border-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 min-w-0">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    {concurso.dataProva
                      ? <span className="text-slate-500">{formatDateTime(concurso.dataProva)}</span>
                      : <span className="italic text-slate-300">Data a definir</span>
                    }
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                  <span className="flex-shrink-0">
                    {concurso.cargos.length} cargo{concurso.cargos.length !== 1 ? 's' : ''}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                  <span className="flex-shrink-0">
                    {areas.length} área{areas.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {concurso.edital && isValidUrl(concurso.edital) && (
                    <a
                      href={concurso.edital}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Edital
                    </a>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 group-hover:text-indigo-700 transition-colors inline-flex items-center gap-0.5">
                    Ver concurso
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {!loading && !loadError && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500 hidden sm:block font-medium">
            <span className="font-bold text-slate-700">{(currentPage * pagination.pageSize) + 1}</span>
            {' – '}
            <span className="font-bold text-slate-700">{Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}</span>
            {' de '}
            <span className="font-bold text-slate-700">{pagination.totalElements}</span>
            {' concursos'}
          </p>
          <nav className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => loadConcursos(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex-1 sm:flex-none px-5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 hover:border-slate-300 font-semibold text-slate-600 transition-all"
            >
              Anterior
            </button>
            <button
              onClick={() => loadConcursos(currentPage + 1)}
              disabled={currentPage === pagination.totalPages - 1}
              className="flex-1 sm:flex-none px-5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 hover:border-slate-300 font-semibold text-slate-600 transition-all"
            >
              Próxima
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}