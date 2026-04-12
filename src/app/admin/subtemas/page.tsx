'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { useForm } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import { subtemaService, temaService, disciplinaService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import { 
  Tags, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Tag,
  Search
} from 'lucide-react';

type SubtemaDto = Types.SubtemaSummaryDto;

export default function SubtemasPage() {
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SubtemaDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  const [filterNome, setFilterNome] = useState('');
  const [filterInput, setFilterInput] = useState('');
  const [filterDisciplina, setFilterDisciplina] = useState<{ value: number, label: string } | null>(null);
  const [filterTema, setFilterTema] = useState<{ value: number, label: string } | null>(null);

  const [pagination, setPagination] = useState<Types.PageResponse<SubtemaDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      tema: null as { value: number, label: string } | null,
      nome: ''
    }
  });

  const watchedFields = watch();

  usePageTitle('Subtemas', 'Admin');

  const loadSubtemas = useCallback(async (page: number = 0, nome?: string, discId?: number, temaId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await subtemaService.getAll({
        page,
        size: 20,
        nome: nome || undefined,
        disciplinaIds: discId || undefined,
        temaIds: temaId || undefined
      });
      setSubtemas(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar subtemas:', err);
      setError(err.message || 'Não foi possível carregar os subtemas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSubtemas(0);
  }, [loadSubtemas]);

  useEffect(() => {
    setFilterTema(null);
  }, [filterDisciplina]);

  const loadDisciplinaOptions = async (inputValue: string) => {
    try {
      const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(d => ({ value: d.id, label: d.nome }));
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
      return [];
    }
  };

  const loadFilterTemaOptions = async (inputValue: string) => {
    try {
      const params: any = { nome: inputValue, size: 50 };
      if (filterDisciplina) {
        params.disciplinaIds = filterDisciplina.value;
      }
      const data = await temaService.getAll(params);
      return data.content.map(t => ({ 
        value: t.id, 
        label: filterDisciplina ? t.nome : `${t.disciplina?.nome || 'Sem Disciplina'} - ${t.nome}` 
      }));
    } catch (err) {
      console.error('Erro ao carregar temas:', err);
      return [];
    }
  };

  const loadTemaOptions = async (inputValue: string) => {
    try {
      const data = await temaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(t => ({ 
        value: t.id, 
        label: `${t.disciplina?.nome || 'Sem Disciplina'} - ${t.nome}` 
      }));
    } catch (err) {
      console.error('Erro ao carregar temas:', err);
      return [];
    }
  };

  const onSubmit = async (data: any) => {
    setSubmissionError(null);
    if (!data.tema) {
      setSubmissionError('Selecione um tema');
      return;
    }

    setLocalLoading(true);
    try {
      const payload = {
        temaId: data.tema.value,
        nome: data.nome.trim()
      };

      if (editingItem) {
        await subtemaService.update(editingItem.id, payload);
      } else {
        await subtemaService.create(payload);
      }

      await loadSubtemas(currentPage);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar subtema:', err);
      setSubmissionError(err.message || 'Erro inesperado ao salvar subtema. Verifique sua conexão.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: SubtemaDto) => {
    setLocalLoading(true);
    setSubmissionError(null);
    try {
      const detail = await subtemaService.getById(item.id);
      setEditingItem(item);
      setValue('tema', { 
        value: detail.tema.id, 
        label: `${detail.disciplina.nome} - ${detail.tema.nome}` 
      });
      setValue('nome', detail.nome);
      setShowForm(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do subtema:', err);
      alert(err.message || 'Erro ao carregar detalhes para edição.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (typeof window !== 'undefined' && window.confirm('Tem certeza que deseja excluir este subtema? Todas as questões associadas poderão ser afetadas.')) {
      setLocalLoading(true);
      try {
        await subtemaService.delete(id);
        await loadSubtemas(currentPage);
      } catch (err: any) {
        console.error('Erro ao excluir subtema:', err);
        alert(err.message || 'Erro ao excluir subtema. O item pode estar sendo usado por outras entidades.');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    reset({
      tema: null,
      nome: ''
    });
    setEditingItem(null);
    setShowForm(false);
    setSubmissionError(null);
  };

  const handleFilterSubmit = () => {
    setFilterNome(filterInput);
    loadSubtemas(0, filterInput, filterDisciplina?.value, filterTema?.value);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFilterSubmit();
    }
  };

  const handleFilterClear = () => {
    setFilterInput('');
    setFilterNome('');
    setFilterDisciplina(null);
    setFilterTema(null);
    loadSubtemas(0);
  };

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, padding: '2px' }),
    placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base: any) => ({ ...base, color: '#111827', fontSize: '0.875rem', fontWeight: '500' })
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Subtemas"
        breadcrumbs={[{ label: 'Subtemas' }]}
        actions={
          (!loading && !error) ? (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Novo Subtema
            </button>
          ) : null
        }
      />

      {(!loading && !error && (subtemas.length > 0 || filterNome || filterDisciplina || filterTema)) && (
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar..."
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                onKeyDown={handleFilterKeyDown}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina</label>
            <AsyncSelect
              instanceId="filter-disciplina-select"
              cacheOptions
              defaultOptions
              loadOptions={loadDisciplinaOptions}
              value={filterDisciplina}
              onChange={(val) => setFilterDisciplina(val)}
              placeholder="Filtrar por disciplina..."
              isClearable
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tema</label>
            <AsyncSelect
              key={`filter-tema-${filterDisciplina?.value}`}
              instanceId="filter-tema-select"
              cacheOptions
              defaultOptions
              loadOptions={loadFilterTemaOptions}
              value={filterTema}
              onChange={(val) => setFilterTema(val)}
              placeholder="Filtrar por tema..."
              isClearable
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleFilterSubmit}
              className="inline-flex items-center px-4 py-[9px] border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Buscar
            </button>
            {(filterNome || filterDisciplina || filterTema) && (
              <button
                onClick={handleFilterClear}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Subtema' : 'Novo Subtema'}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label htmlFor="tema" className="block text-sm font-medium text-gray-700 mb-1">
                  Tema
                </label>
                <AsyncSelect
                  id="tema"
                  instanceId="tema-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadTemaOptions}
                  value={watchedFields.tema}
                  onChange={(val) => setValue('tema', val)}
                  placeholder="Selecione..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="nome"
                  autoComplete="off"
                  {...register('nome', { 
                    required: 'Nome é obrigatório',
                    maxLength: { value: 255, message: 'Nome muito longo' }
                  })}
                  className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border ${errors.nome ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.nome && <p className="mt-1 text-xs text-red-600 font-bold">{errors.nome.message}</p>}
              </div>
            </div>

            {submissionError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={localLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Salvando...
                  </>
                ) : editingItem ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
            <p className="text-gray-500 text-sm animate-pulse">Carregando subtemas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao carregar dados</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => loadSubtemas(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : subtemas.length === 0 && !filterNome && !filterDisciplina && !filterTema ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Tags className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum subtema encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Crie o primeiro subtema para começar.</p>
            {!showForm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Novo Subtema
                </button>
              </div>
            )}
          </div>
        ) : subtemas.length === 0 && (filterNome || filterDisciplina || filterTema) ? (
          <div className="flex flex-col justify-center items-center h-48 text-center px-4">
            <Search className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros para encontrar o que procura.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {subtemas.map((subtema) => (
              <li key={subtema.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 text-sans">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-indigo-600 truncate mb-1" title={subtema.nome}>
                      {subtema.nome}
                    </div>
                    <div className="text-xs text-gray-500 font-sans">
                      {subtema.tema?.nome || 'N/A'} • {subtema.disciplina?.nome || 'N/A'}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(subtema)}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(subtema.id!)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden font-sans">
              <button
                onClick={() => loadSubtemas(currentPage - 1)}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === 0
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => loadSubtemas(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === pagination.totalPages - 1
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-sans">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium font-mono tabular-nums">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium font-mono tabular-nums">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium font-mono tabular-nums">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadSubtemas(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === 0
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-sm font-mono font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded tabular-nums">
                  {currentPage + 1} / {pagination.totalPages}
                </div>
                <button
                  onClick={() => loadSubtemas(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages - 1}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === pagination.totalPages - 1
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
