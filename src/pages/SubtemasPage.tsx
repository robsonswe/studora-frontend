import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { subtemaService, temaService } from '@/services/api';
import * as Types from '@/types';

type SubtemaDto = Types.SubtemaDto;
type TemaDto = Types.TemaDto;

const SubtemasPage = () => {
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SubtemaDto | null>(null);
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      temaId: 0,
      nome: ''
    }
  });

  const watchedFields = watch();

  useEffect(() => {
    Promise.all([
      loadSubtemas(),
      loadTemas()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const loadSubtemas = async () => {
    try {
      const data = await subtemaService.getAll();
      setSubtemas(data);
    } catch (error) {
      console.error('Erro ao carregar subtemas:', error);
    }
  };

  const loadTemas = async () => {
    try {
      const data = await temaService.getAll();
      setTemas(data);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingItem) {
        // Update existing
        const updated = await subtemaService.update(editingItem.id!, { ...data, id: editingItem.id });
        setSubtemas(subtemas.map(s => s.id === updated.id ? updated : s));
      } else {
        // Create new
        const created = await subtemaService.create(data);
        setSubtemas([...subtemas, created]);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar subtema:', error);
    }
  };

  const handleEdit = (item: SubtemaDto) => {
    setEditingItem(item);
    setValue('temaId', item.temaId);
    setValue('nome', item.nome);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este subtema?')) {
      try {
        await subtemaService.delete(id);
        setSubtemas(subtemas.filter(s => s.id !== id));
      } catch (error) {
        console.error('Erro ao excluir subtema:', error);
      }
    }
  };

  const resetForm = () => {
    reset({
      temaId: 0,
      nome: ''
    });
    setEditingItem(null);
    setShowForm(false);
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
        title="Subtemas"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Novo Subtema
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Subtema' : 'Novo Subtema'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="temaId" className="block text-sm font-medium text-gray-700 mb-1">
                  Tema
                </label>
                <Select
                  id="temaId"
                  options={temas.map(tema => ({
                    value: tema.id,
                    label: tema.nome
                  }))}
                  value={{
                    value: watchedFields.temaId,
                    label: temas.find(t => t.id === watchedFields.temaId)?.nome
                  } || null}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setValue('temaId', selectedOption.value);
                    }
                  }}
                  placeholder="Selecione ou digite para pesquisar..."
                  isClearable
                  isSearchable
                />
                {errors.temaId && <p className="mt-1 text-sm text-red-600">{errors.temaId.message}</p>}
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {subtemas.map((subtema) => {
            const tema = temas.find(t => t.id === subtema.temaId);
            return (
              <li key={subtema.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate">
                      {subtema.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tema?.nome || 'Tema não encontrado'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(subtema)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(subtema.id!)}
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

export default SubtemasPage;