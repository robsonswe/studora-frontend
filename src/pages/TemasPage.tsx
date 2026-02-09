import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import { temaService, disciplinaService } from '@/services/api';
import * as Types from '@/types';

type TemaDto = Types.TemaSummaryDto;

const TemasPage = () => {
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TemaDto | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      disciplina: null as { value: number, label: string } | null,
      nome: ''
    }
  });

  const watchedFields = watch();

  useEffect(() => {
    loadTemas();
  }, []);

  const loadTemas = async () => {
    setLoading(true);
    try {
      const data = await temaService.getAll({ size: 1000 });
      setTemas(data.content);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(d => ({ value: d.id, label: d.nome }));
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
        nome: data.nome
      };

      if (editingItem) {
        await temaService.update(editingItem.id, payload);
      } else {
        await temaService.create(payload);
      }

      await loadTemas();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar tema:', error);
      setSubmissionError(error.message || 'Erro inesperado ao salvar tema');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: TemaDto) => {
    setLocalLoading(true);
    try {
      const detail = await temaService.getById(item.id);
      setEditingItem(item);
      setValue('disciplina', { value: detail.disciplina.id, label: detail.disciplina.nome });
      setValue('nome', detail.nome);
      setShowForm(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do tema:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este tema?')) {
      setLocalLoading(true);
      try {
        await temaService.delete(id);
        setTemas(temas.filter(t => t.id !== id));
      } catch (error: any) {
        console.error('Erro ao excluir tema:', error);
        alert(error.message || 'Erro ao excluir tema');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    reset({
      disciplina: null,
      nome: ''
    });
    setEditingItem(null);
    setShowForm(false);
    setSubmissionError(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Temas" 
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Novo Tema
          </button>
        } 
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Tema' : 'Novo Tema'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="disciplina" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <AsyncSelect
                  id="disciplina"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadDisciplinaOptions}
                  value={watchedFields.disciplina}
                  onChange={(val) => setValue('disciplina', val)}
                  placeholder="Busque por disciplina..."
                  isClearable
                />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="nome"
                  {...register('nome', { required: 'Nome é obrigatório' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>}
              </div>
            </div>

            {submissionError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {localLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {temas.map((tema) => {
            return (
              <li key={tema.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate">
                      {tema.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tema.disciplinaNome || 'N/A'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(tema)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(tema.id!)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default TemasPage;