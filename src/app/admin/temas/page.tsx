'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FormModal from '@/components/ui/FormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useForm } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import { temaService, disciplinaService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  BookOpen,
  Search,
  XCircle
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/ToastContext';

type TemaDto = Types.TemaSummaryDto;

function TemasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlPage = Number(searchParams?.get('page')) || 0;
  const urlNome = searchParams?.get('nome') || '';
  const urlDisciplinaId = Number(searchParams?.get('disciplinaId')) || null;

  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TemaDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  const [filterNome, setFilterNome] = useState(urlNome);
  const [filterInput, setFilterInput] = useState(urlNome);
  const [filterDisciplina, setFilterDisciplina] = useState<{ value: number, label: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemId: number | null;
    type: 'danger' | 'info';
    alertOnly?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemId: null,
    type: 'danger'
  });

  const [pagination, setPagination] = useState<Types.PageResponse<TemaDto>>({
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
      disciplina: null as { value: number, label: string } | null,
      nome: ''
    }
  });

  const watchedFields = watch();

  usePageTitle('Temas', 'Admin');

  const loadTemas = useCallback(async (page: number = 0, nome?: string, discId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await temaService.getAll({
        page,
        size: 20,
        nome: nome || undefined,
        disciplinaIds: discId || undefined
      });
      setTemas(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar temas:', err);
      setError(err.message || 'Não foi possível carregar os temas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFilterNome(urlNome);
    setFilterInput(urlNome);
  }, [urlNome]);

  useEffect(() => {
    if (urlDisciplinaId) {
      if (!filterDisciplina || filterDisciplina.value !== urlDisciplinaId) {
        disciplinaService.getById(urlDisciplinaId).then(d => {
          setFilterDisciplina({ value: d.id, label: d.nome });
        }).catch(() => {});
      }
    } else {
      setFilterDisciplina(null);
    }
  }, [urlDisciplinaId]);

  useEffect(() => {
    loadTemas(urlPage, urlNome, urlDisciplinaId || undefined);
  }, [urlPage, urlNome, urlDisciplinaId, loadTemas]);

  const loadDisciplinaOptions = async (inputValue: string) => {
    try {
      const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(d => ({ value: d.id, label: d.nome }));
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
      return [];
    }
  };

  const onSubmit = async (data: any) => {
    setSubmissionError(null);
    if (!data.disciplina) {
      setSubmissionError('Selecione uma disciplina');
      return;
    }

    setLocalLoading(true);
    try {
      const payload = {
        disciplinaId: data.disciplina.value,
        nome: data.nome.trim()
      };

      if (editingItem) {
        await temaService.update(editingItem.id, payload);
        showToast('Tema atualizado com sucesso', 'success');
        loadTemas(currentPage, urlNome, urlDisciplinaId ?? undefined);
      } else {
        await temaService.create(payload);
        showToast('Tema criado com sucesso', 'success');
        loadTemas(0, undefined, urlDisciplinaId ?? undefined);
      }

      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar tema:', err);
      setSubmissionError(err.message || 'Erro inesperado ao salvar tema. Verifique sua conexão.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: TemaDto) => {
    setLocalLoading(true);
    setSubmissionError(null);
    try {
      const detail = await temaService.getById(item.id);
      setEditingItem(item);
      setValue('disciplina', { value: detail.disciplina.id, label: detail.disciplina.nome });
      setValue('nome', detail.nome);
      setModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do tema:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Erro ao carregar',
        message: err.message || 'Não foi possível carregar os detalhes para edição. Verifique sua conexão.',
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Tema',
      message: 'Tem certeza que deseja excluir este tema? Todas os subtemas e questões associadas poderão ser afetados e esta ação não pode ser desfeita.',
      itemId: id,
      type: 'danger',
      alertOnly: false
    });
  };

  const onConfirmDelete = async () => {
    if (!confirmModal.itemId) return;
    
    setLocalLoading(true);
    try {
      await temaService.delete(confirmModal.itemId);
      showToast('Tema excluído com sucesso', 'success');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      loadTemas(currentPage, urlNome, urlDisciplinaId ?? undefined);
    } catch (err: any) {
      console.error('Erro ao excluir tema:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Não foi possível excluir',
        message: err.message || 'Este tema não pode ser removida pois está sendo utilizada em outras partes do sistema.',
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const resetForm = () => {
    reset({
      disciplina: null,
      nome: ''
    });
    setEditingItem(null);
    setModalOpen(false);
    setSubmissionError(null);
  };

  const openNewForm = () => {
    reset({
      disciplina: null,
      nome: ''
    });
    setEditingItem(null);
    setSubmissionError(null);
    setModalOpen(true);
  };

  const updateFilters = (nome?: string, discId?: number | null, page: number = 0) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    if (nome) params.set('nome', nome); else params.delete('nome');
    if (discId) params.set('disciplinaId', String(discId)); else params.delete('disciplinaId');
    router.push(`/admin/temas?${params.toString()}`);
  };

  const handleFilterSubmit = () => {
    setFilterNome(filterInput);
    updateFilters(filterInput, filterDisciplina?.value, 0);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFilterSubmit();
    }
  };

  const handleFilterClear = () => {
    window.location.href = '/admin/temas';
  };

  const selectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any, state: any) => ({ 
      ...base, 
      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0', 
      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none', 
      '&:hover': { borderColor: state.isFocused ? '#6366f1' : '#cbd5e1', backgroundColor: '#f8fafc' }, 
      padding: '2px', 
      borderRadius: '0.5rem', 
      backgroundColor: 'rgba(248, 250, 252, 0.5)',
      transition: 'all 0.2s ease'
    }),
    placeholder: (base: any) => ({ ...base, color: '#94a3b8', fontSize: '0.875rem' }),
    singleValue: (base: any) => ({ ...base, color: '#1e293b', fontSize: '0.875rem' }),
    input: (base: any) => ({ ...base, color: '#1e293b', fontSize: '0.875rem' })
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Temas"
        breadcrumbs={[{ label: 'Temas' }]}
        actions={
          (!loading && !error) ? (
            <button
              onClick={openNewForm}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Novo Tema
            </button>
          ) : null
        } 
      />

      {(!loading && !error && (temas.length > 0 || filterNome || filterDisciplina)) && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Nome</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                onKeyDown={handleFilterKeyDown}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-slate-50/50 hover:bg-slate-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Disciplina</label>
            <AsyncSelect
              instanceId="filter-disciplina-select"
              cacheOptions
              defaultOptions
              loadOptions={loadDisciplinaOptions}
              value={filterDisciplina}
              onChange={(val) => setFilterDisciplina(val)}
              placeholder="Buscar por disciplina..."
              isClearable
              styles={selectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {(filterNome || filterDisciplina) && (
              <button
                onClick={handleFilterClear}
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2.5 border border-slate-200 shadow-sm text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <XCircle className="h-4 w-4 mr-2 text-slate-400" />
                Limpar busca
              </button>
            )}
            <button
              onClick={handleFilterSubmit}
              className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </button>
          </div>
        </div>
      </div>
      )}

      <FormModal
        isOpen={modalOpen}
        onClose={resetForm}
        onSubmit={handleSubmit(onSubmit)}
        title={editingItem ? 'Editar Tema' : 'Novo Tema'}
        loading={localLoading}
        submitLabel={editingItem ? 'Atualizar' : 'Salvar'}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <AsyncSelect
              id="disciplina"
              instanceId="disciplina-select"
              cacheOptions
              defaultOptions
              loadOptions={loadDisciplinaOptions}
              value={watchedFields.disciplina}
              onChange={(val) => setValue('disciplina', val)}
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
          <Feedback type="error" message={submissionError} className="mt-4" />
        )}
      </FormModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.alertOnly ? () => setConfirmModal(prev => ({ ...prev, isOpen: false })) : onConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={localLoading}
        alertOnly={confirmModal.alertOnly}
        confirmLabel={confirmModal.alertOnly ? 'Ok, entendi' : 'Confirmar Exclusão'}
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
            <p className="text-gray-500 text-sm animate-pulse">Carregando temas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Feedback type="error" title="Erro ao carregar dados" message={error} className="max-w-md mx-auto" />
            <div className="mt-6">
              <button
                onClick={() => updateFilters(urlNome, urlDisciplinaId, urlPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : temas.length === 0 && !urlNome && !urlDisciplinaId ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum tema encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Crie o primeiro tema para começar.</p>
          </div>
        ) : temas.length === 0 && (urlNome || urlDisciplinaId) ? (
          <div className="flex flex-col justify-center items-center h-48 text-center px-4">
            <Search className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros para encontrar o que procura.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {temas.map((tema) => (
              <li key={tema.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 text-sans">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-indigo-600 truncate mb-1" title={tema.nome}>
                      {tema.nome}
                    </div>
                    <div className="text-xs text-gray-500 font-sans">
                      {tema.disciplina?.nome || 'N/A'}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(tema)}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(tema.id!)}
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
                  onClick={() => updateFilters(urlNome, urlDisciplinaId, currentPage - 1)}
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
                  onClick={() => updateFilters(urlNome, urlDisciplinaId, currentPage + 1)}
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
                    onClick={() => updateFilters(urlNome, urlDisciplinaId, currentPage - 1)}
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
                    onClick={() => updateFilters(urlNome, urlDisciplinaId, currentPage + 1)}
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

export default function TemasPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>}>
      <TemasContent />
    </Suspense>
  );
}
