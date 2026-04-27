'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FormModal from '@/components/ui/FormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { bancaService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Building,
  Gavel,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Fingerprint,
  Search,
  XCircle
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/ToastContext';

type BancaDto = Types.BancaSummaryDto;

function BancasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlPage = Number(searchParams?.get('page')) || 0;
  const urlNome = searchParams?.get('nome') || '';

  const [bancas, setBancas] = useState<BancaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BancaDto | null>(null);
  const [formData, setFormData] = useState<{ nome: string }>({ nome: '' });
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [filterNome, setFilterNome] = useState(urlNome);
  const [filterInput, setFilterInput] = useState(urlNome);
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

  usePageTitle('Bancas', 'Admin');

  const [pagination, setPagination] = useState<Types.PageResponse<any>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  const loadBancas = useCallback(async (page: number = 0, nome?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await bancaService.getAll({ page, size: 20, nome: nome || undefined });
      setBancas(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar bancas:', err);
      setError(err.message || 'Não foi possível carregar as bancas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlNome !== filterNome) setFilterNome(urlNome);
    if (urlNome !== filterInput) setFilterInput(urlNome);
  }, [urlNome]);

  useEffect(() => {
    loadBancas(urlPage, urlNome);
  }, [urlPage, urlNome, loadBancas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    setLocalLoading(true);
    setSubmissionError(null);

    try {
      const payload = {
        nome: formData.nome.trim()
      };

      if (editingItem) {
        await bancaService.update(editingItem.id, payload);
        showToast('Banca atualizada com sucesso', 'success');
        loadBancas(currentPage, urlNome);
      } else {
        await bancaService.create(payload);
        showToast('Banca criada com sucesso', 'success');
        loadBancas(0, undefined);
      }
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar banca:', err);
      setSubmissionError(err.message || 'Erro inesperado ao salvar banca. Verifique sua conexão.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (item: BancaDto) => {
    setEditingItem(item);
    setFormData({ nome: item.nome });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Banca',
      message: 'Tem certeza que deseja excluir esta banca? Concursos e questões associadas poderão ser afetados e esta ação não pode ser desfeita.',
      itemId: id,
      type: 'danger',
      alertOnly: false
    });
  };

  const onConfirmDelete = async () => {
    if (!confirmModal.itemId) return;
    
    setLocalLoading(true);
    try {
      await bancaService.delete(confirmModal.itemId);
      showToast('Banca excluída com sucesso', 'success');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      loadBancas(currentPage, urlNome);
    } catch (err: any) {
      console.error('Erro ao excluir banca:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Não foi possível excluir',
        message: err.message || 'Esta banca não pode ser removida pois está sendo utilizada em outras partes do sistema.',
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '' });
    setEditingItem(null);
    setModalOpen(false);
    setSubmissionError(null);
  };

  const openNewForm = () => {
    setFormData({ nome: '' });
    setEditingItem(null);
    setSubmissionError(null);
    setModalOpen(true);
  };

  const updateFilters = (nome?: string, page: number = 0) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    if (nome) params.set('nome', nome); else params.delete('nome');
    router.push(`/admin/bancas?${params.toString()}`);
  };

  const handleFilterSubmit = () => {
    setFilterNome(filterInput);
    updateFilters(filterInput, 0);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFilterSubmit();
    }
  };

  const handleFilterClear = () => {
    window.location.href = '/admin/bancas';
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Bancas"
        breadcrumbs={[{ label: 'Bancas' }]}
        actions={
          (!loading && !error) ? (
            <button
              onClick={openNewForm}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Nova Banca
            </button>
          ) : null
        }
      />

      {(!loading && !error && (bancas.length > 0 || urlNome)) && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
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
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {urlNome && (
              <button
                onClick={handleFilterClear}
                className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2.5 border border-slate-200 shadow-sm text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <XCircle className="h-4 w-4 mr-2 text-slate-400" />
                Limpar busca
              </button>
            )}
            <button
              onClick={handleFilterSubmit}
              className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
        onSubmit={handleSubmit}
        title={editingItem ? 'Editar Banca' : 'Nova Banca'}
        loading={localLoading}
        submitLabel={editingItem ? 'Atualizar' : 'Salvar'}
      >
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
            <p className="text-gray-500 text-sm animate-pulse">Carregando bancas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Feedback type="error" title="Erro ao carregar dados" message={error} className="max-w-md mx-auto" />
            <div className="mt-6">
              <button
                onClick={() => loadBancas(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : bancas.length === 0 && !urlNome ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Gavel className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma banca encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">Comece criando uma nova banca examinadora.</p>
          </div>
        ) : bancas.length === 0 && urlNome ? (
          <div className="flex flex-col justify-center items-center h-48 text-center px-4">
            <Search className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros para encontrar o que procura.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {bancas.map((banca) => (
              <li key={banca.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-indigo-600 truncate" title={banca.nome}>
                      {banca.nome}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(banca)}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(banca.id)}
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
                onClick={() => updateFilters(urlNome, currentPage - 1)}
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
                onClick={() => updateFilters(urlNome, currentPage + 1)}
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
                  Mostrando <span className="font-medium font-mono tabular-nums">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium font-mono tabular-nums">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium font-mono tabular-nums">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateFilters(urlNome, currentPage - 1)}
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
                  onClick={() => updateFilters(urlNome, currentPage + 1)}
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

export default function BancasPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>}>
      <BancasContent />
    </Suspense>
  );
}
