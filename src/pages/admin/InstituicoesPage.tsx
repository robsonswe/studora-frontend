import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { instituicaoService } from '@/services/api';
import * as Types from '@/types';

type InstituicaoDto = Types.InstituicaoSummaryDto;

const InstituicoesPage = () => {
  const [instituicoes, setInstituicoes] = useState<InstituicaoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InstituicaoDto | null>(null);
  const [formData, setFormData] = useState<{ nome: string, area: string }>({ nome: '', area: '' });
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const [pagination, setPagination] = useState<Types.PageResponse<InstituicaoDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  const loadInstituicoes = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await instituicaoService.getAll({ page, size: 20 });
      setInstituicoes(data.content);
      setPagination(data);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Erro ao carregar instituições:', err);
      setError(err.message || 'Não foi possível carregar as instituições. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstituicoes(0);
  }, [loadInstituicoes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setSubmissionError(null);

    try {
      const payload = {
        nome: formData.nome.trim(),
        area: formData.area.trim()
      };

      if (editingItem) {
        await instituicaoService.update(editingItem.id, payload);
      } else {
        await instituicaoService.create(payload);
      }

      await loadInstituicoes(currentPage);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar instituição:', err);
      setSubmissionError(err.message || 'Erro inesperado ao salvar instituição. Verifique sua conexão.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (item: InstituicaoDto) => {
    setEditingItem(item);
    setFormData({ nome: item.nome, area: item.area });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta instituição? Concursos e questões associadas poderão ser afetados.')) {
      setLocalLoading(true);
      try {
        await instituicaoService.delete(id);
        await loadInstituicoes(currentPage);
      } catch (err: any) {
        console.error('Erro ao excluir instituição:', err);
        alert(err.message || 'Erro ao excluir instituição. O item pode estar sendo usado por outras entidades.');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', area: '' });
    setEditingItem(null);
    setShowForm(false);
    setSubmissionError(null);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Header
        title="Instituições"
        actions={
          (!loading && !error && instituicoes.length > 0) ? (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Nova Instituição
            </button>
          ) : null
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Instituição' : 'Nova Instituição'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="nome"
                  autoComplete="off"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                  maxLength={255}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  id="area"
                  autoComplete="off"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                  placeholder="Ex: Policial, Fiscal, Judiciária"
                  maxLength={255}
                />
              </div>
            </div>

            {submissionError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-500 text-sm animate-pulse">Carregando instituições...</p>
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
                onClick={() => loadInstituicoes(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : instituicoes.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma instituição encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">Comece criando uma nova instituição para o sistema.</p>
            {!showForm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Nova Instituição
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {instituicoes.map((inst) => (
              <li key={inst.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-sm font-medium text-indigo-600 truncate" title={inst.nome}>
                      {inst.nome}
                    </div>
                    <div className="text-sm text-gray-500 truncate" title={inst.area}>
                      {inst.area}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(inst)}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id)}
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
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => loadInstituicoes(currentPage - 1)}
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
                onClick={() => loadInstituicoes(currentPage + 1)}
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
                    onClick={() => loadInstituicoes(currentPage - 1)}
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
                          onClick={() => loadInstituicoes(page)}
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
                    onClick={() => loadInstituicoes(currentPage + 1)}
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

export default InstituicoesPage;
