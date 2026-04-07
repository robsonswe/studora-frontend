import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import { subtemaService, temaService } from '@/services/api';
import * as Types from '@/types';

type SubtemaDto = Types.SubtemaSummaryDto;

const SubtemasPage = () => {
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SubtemaDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
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

  const loadSubtemas = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await subtemaService.getAll({ page, size: 20 });
      setSubtemas(data.content);
      setPagination(data);
      setCurrentPage(page);
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Erro ao carregar subtemas:', err);
      setError(err.message || 'Não foi possível carregar os subtemas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubtemas(0);
  }, [loadSubtemas]);

  const loadTemaOptions = async (inputValue: string) => {
    try {
      const data = await temaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(t => ({ 
        value: t.id, 
        label: `${t.disciplinaNome} - ${t.nome}` 
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
      setValue('tema', { value: detail.tema.id, label: `${detail.tema.disciplinaNome} - ${detail.tema.nome}` });
      setValue('nome', detail.nome);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do subtema:', err);
      alert(err.message || 'Erro ao carregar detalhes para edição.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este subtema? Todas as questões associadas poderão ser afetadas.')) {
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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Header
        title="Subtemas"
        actions={
          (!loading && !error && subtemas.length > 0) ? (
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

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Subtema' : 'Novo Subtema'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="tema" className="block text-sm font-medium text-gray-700 mb-1">
                  Tema
                </label>
                <AsyncSelect
                  id="tema"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadTemaOptions}
                  value={watchedFields.tema}
                  onChange={(val) => setValue('tema', val)}
                  placeholder="Busque por tema..."
                  isClearable
                  noOptionsMessage={() => "Nenhum tema encontrado"}
                  loadingMessage={() => "Carregando..."}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              <div className="sm:col-span-3">
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
                  className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border ${errors.nome ? 'border-red-300' : ''}`}
                />
                {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>}
              </div>
            </div>

            {submissionError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={localLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {localLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => loadSubtemas(currentPage)}
              className="text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 text-sm animate-pulse">Carregando subtemas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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
        ) : subtemas.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum subtema encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Comece criando um novo subtema para o sistema.</p>
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
        ) : (
          <ul className="divide-y divide-gray-200">
            {subtemas.map((subtema) => {
              return (
                <li key={subtema.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="text-sm font-medium text-indigo-600 truncate" title={subtema.nome}>
                        {subtema.nome}
                      </div>
                      <div className="text-sm text-gray-500 truncate" title={subtema.disciplinaNome ? `${subtema.disciplinaNome} - ${subtema.temaNome}` : (subtema.temaNome || 'N/A')}>
                        {subtema.disciplinaNome ? `${subtema.disciplinaNome} - ${subtema.temaNome}` : (subtema.temaNome || 'N/A')}
                      </div>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(subtema)}
                        disabled={localLoading}
                        className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(subtema.id!)}
                        disabled={localLoading}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
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
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => loadSubtemas(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === 0
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    &larr;
                  </button>

                  {/* Render page numbers */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    
                    if (totalPages > 0) {
                      pages.push(0);
                    }
                    
                    if (totalPages > 1) {
                      if (totalPages <= 5) {
                        for (let i = 1; i < totalPages - 1; i++) {
                          pages.push(i);
                        }
                      } else {
                        const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 4));
                        const endPage = Math.min(totalPages - 1, startPage + 2);
                        
                        for (let i = startPage; i <= endPage; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                      
                      if (totalPages > 1 && !pages.includes(totalPages - 1)) {
                        pages.push(totalPages - 1);
                      }
                    }
                    
                    pages.sort((a, b) => a - b);
                    
                    const elements = [];
                    for (let i = 0; i < pages.length; i++) {
                      const page = pages[i];
                      if (i > 0 && pages[i] - pages[i - 1] > 1) {
                        elements.push(
                          <span
                            key={`ellipsis-${pages[i - 1]}-${page}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                          >
                            ...
                          </span>
                        );
                      }
                      
                      elements.push(
                        <button
                          key={page}
                          onClick={() => loadSubtemas(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === page
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page + 1}
                        </button>
                      );
                    }
                    
                    return elements;
                  })()}

                  <button
                    onClick={() => loadSubtemas(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages - 1}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === pagination.totalPages - 1
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Próximo</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtemasPage;
