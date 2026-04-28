'use client';

import { useState, useEffect, useCallback } from 'react';
import FormModal from '@/components/ui/FormModal';
import { subtemaService, temaService, disciplinaService, ApiError } from '@/services/api';
import * as Types from '@/types';
import {
  Loader2,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { StylesConfig } from 'react-select';

interface SubtemaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedSubtemas: { 
    subtemaId: number; 
    label?: string; 
    disciplina?: Types.DisciplinaReferenceDto;
    tema?: Types.TemaReferenceDto;
    cargoIds: number[]; 
  }[]) => void;
  initiallySelected: { 
    subtemaId: number; 
    label?: string; 
    disciplina?: Types.DisciplinaReferenceDto;
    tema?: Types.TemaReferenceDto;
    cargoIds?: number[]; 
  }[];
}

interface SubtemaOption {
  id: number;
  nome: string;
  disciplina?: Types.DisciplinaReferenceDto;
  tema?: Types.TemaReferenceDto;
}

interface TemaSelectOption {
  value: number;
  label: string;
  disciplina?: Types.DisciplinaReferenceDto;
}

const selectStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#d1d5db' },
    borderRadius: '0.5rem',
    backgroundColor: '#f9fafb',
    fontSize: '0.875rem',
    minHeight: '42px',
    padding: '2px 0',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    padding: '0.5rem',
    zIndex: 10050,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 10050,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f5f7ff' : 'transparent',
    color: state.isSelected ? '#fff' : '#374151',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  }),
  singleValue: (base) => ({ ...base, color: '#1f2937', fontWeight: '500' }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
};

export default function SubtemaPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initiallySelected,
}: SubtemaPickerModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subtemas, setSubtemas] = useState<SubtemaOption[]>([]);
  
  // Guardamos a disciplina e o tema no Map para repassar no confirm
  const [selectedMap, setSelectedMap] = useState<Map<number, { 
    id: number; 
    nome: string; 
    disciplina?: Types.DisciplinaReferenceDto;
    tema?: Types.TemaReferenceDto;
  }>>(new Map());

  const [filterNome, setFilterNome] = useState('');
  const [debouncedFilterNome, setDebouncedFilterNome] = useState('');
  const [filterDisciplina, setFilterDisciplina] = useState<{ value: number; label: string } | null>(null);
  const [filterTema, setFilterTema] = useState<TemaSelectOption | null>(null);

  const [pagination, setPagination] = useState<{
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  }>({
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
  });
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (isOpen && initiallySelected) {
      const map = new Map();
      initiallySelected.forEach(s => {
        map.set(s.subtemaId, { 
          id: s.subtemaId, 
          nome: s.label || `Subtema ${s.subtemaId}`,
          disciplina: s.disciplina,
          tema: s.tema,
        });
      });
      setSelectedMap(map);
    }
  }, [isOpen, initiallySelected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedFilterNome !== filterNome) {
        setDebouncedFilterNome(filterNome);
        setCurrentPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filterNome, debouncedFilterNome]);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        size: 20,
        nome: debouncedFilterNome || undefined,
        disciplinaIds: filterDisciplina?.value || undefined,
        temaIds: filterTema?.value || undefined,
      };
      const data = await subtemaService.getAll(params);
      setSubtemas(data.content);
      setPagination({
        pageNumber: data.pageNumber,
        pageSize: data.pageSize,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar subtemas');
    } finally {
      setLoading(false);
    }
  }, [isOpen, currentPage, debouncedFilterNome, filterDisciplina, filterTema]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDisciplinaOptions = async (inputValue: string) => {
    try {
      const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(d => ({ value: d.id, label: d.nome }));
    } catch {
      return [];
    }
  };

  const loadTemaOptions = async (inputValue: string) => {
    try {
      const params: Types.PaginationParams & { nome?: string; disciplinaIds?: number } = {
        nome: inputValue,
        size: 50,
      };
      if (filterDisciplina) {
        params.disciplinaIds = filterDisciplina.value;
      }
      const data = await temaService.getAll(params);
      return data.content.map(t => ({
        value: t.id,
        label: filterDisciplina ? t.nome : `${t.disciplina?.nome || 'Sem Disciplina'} - ${t.nome}`,
        disciplina: t.disciplina,
      }));
    } catch {
      return [];
    }
  };

  const handleDisciplinaChange = (val: { value: number; label: string } | null) => {
    setFilterDisciplina(val);
    setFilterTema(null);
    setCurrentPage(0);
  };

  const handleTemaChange = (val: TemaSelectOption | null) => {
    setFilterTema(val);
    if (val?.disciplina && !filterDisciplina) {
      setFilterDisciplina({
        value: val.disciplina.id,
        label: val.disciplina.nome,
      });
    }
    setCurrentPage(0);
  };

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterNome(e.target.value);
  };

  const toggleSubtema = (subtema: SubtemaOption) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(subtema.id)) {
        next.delete(subtema.id);
      } else {
        const label = subtema.disciplina?.nome
          ? `${subtema.disciplina.nome} - ${subtema.tema?.nome} - ${subtema.nome}`
          : subtema.nome;
        next.set(subtema.id, { 
          id: subtema.id, 
          nome: label,
          disciplina: subtema.disciplina,
          tema: subtema.tema
        });
      }
      return next;
    });
  };

  const handleSelectAllMatching = async () => {
    if (!filterDisciplina && !filterTema) return;
    setLoading(true);
    try {
      const params = {
        page: 0,
        size: 2000, 
        nome: debouncedFilterNome || undefined,
        disciplinaIds: filterDisciplina?.value || undefined,
        temaIds: filterTema?.value || undefined,
      };
      const data = await subtemaService.getAll(params);
      setSelectedMap(prev => {
        const next = new Map(prev);
        data.content.forEach(s => {
          const label = s.disciplina?.nome
            ? `${s.disciplina.nome} - ${s.tema?.nome} - ${s.nome}`
            : s.nome;
          next.set(s.id, { 
            id: s.id, 
            nome: label,
            disciplina: s.disciplina,
            tema: s.tema
          });
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao selecionar todos os subtemas');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilterNome('');
    setDebouncedFilterNome('');
    setFilterDisciplina(null);
    setFilterTema(null);
    setCurrentPage(0);
  };

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setSaving(true);
    const selected = Array.from(selectedMap.values()).map(item => ({
      subtemaId: item.id,
      label: item.nome,
      disciplina: item.disciplina,
      tema: item.tema,
      cargoIds: [],
    }));
    onConfirm(selected);
    setSaving(false);
  };

  const handleClose = () => {
    handleClearFilters();
    onClose();
  };

  const totalSelected = selectedMap.size;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleConfirm}
      title="Selecionar Subtemas"
      loading={saving}
      submitLabel="Confirmar"
      size="2xl"
      footerExtra={
        <div className="flex items-center justify-between w-full text-xs font-semibold text-slate-500">
          <span>{totalSelected} selecionado{totalSelected !== 1 ? 's' : ''}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <AsyncSelect
              instanceId="picker-disciplina"
              cacheOptions
              defaultOptions
              loadOptions={loadDisciplinaOptions}
              value={filterDisciplina}
              onChange={handleDisciplinaChange}
              isClearable
              placeholder="Disciplina..."
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <div className="relative">
            <AsyncSelect
              key={`picker-tema-${filterDisciplina?.value}`}
              instanceId="picker-tema"
              cacheOptions
              defaultOptions
              loadOptions={loadTemaOptions}
              value={filterTema}
              onChange={handleTemaChange}
              isClearable
              placeholder="Tema..."
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <div className="relative">
            <input
              type="text"
              value={filterNome}
              onChange={handleNomeChange}
              placeholder="Filtrar por nome..."
              className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            {totalSelected > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md">
                <Check className="w-3.5 h-3.5" />
                {totalSelected} selecionado{totalSelected !== 1 ? 's' : ''}
              </div>
            )}
            
            {(filterDisciplina || filterTema) && (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                disabled={loading}
                className="text-[11px] font-semibold text-indigo-600 border border-indigo-200 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                Selecionar resultados da busca
              </button>
            )}

            {totalSelected > 0 && (
              <button
                type="button"
                onClick={() => setSelectedMap(new Map())}
                className="text-[11px] font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors"
              >
                Desmarcar todos
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-medium text-slate-400 hover:text-indigo-600 ml-auto whitespace-nowrap"
          >
            Limpar filtros
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto min-h-[120px] relative">
          {loading && subtemas.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10 py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 text-sm">{error}</div>
          ) : subtemas.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum subtema encontrado</div>
          ) : (
            <div className={`divide-y divide-gray-100 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {subtemas.map(subtema => {
                const isSelected = selectedMap.has(subtema.id);
                return (
                  <label
                    key={subtema.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSubtema(subtema)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {subtema.nome}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {subtema.disciplina?.nome} {subtema.tema && `· ${subtema.tema.nome}`}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {pagination.totalPages > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-4">
            <p className="text-xs text-gray-500">
              {pagination.pageNumber * pagination.pageSize + 1}-
              {Math.min((pagination.pageNumber + 1) * pagination.pageSize, pagination.totalElements)} de {' '}
              {pagination.totalElements}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={pagination.pageNumber === 0 || loading}
                className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages - 1, p + 1))}
                disabled={pagination.pageNumber >= pagination.totalPages - 1 || loading}
                className="p-1.5 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
