import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { temaService, disciplinaService } from '@/services/api';
import * as Types from '@/types';

type TemaDto = Types.TemaDto;
type DisciplinaDto = Types.DisciplinaDto;

const TemasPage = () => {
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TemaDto | null>(null);
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      disciplinaId: 0,
      nome: ''
    }
  });

  const watchedFields = watch();

  useEffect(() => {
    Promise.all([
      loadTemas(),
      loadDisciplinas()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const loadTemas = async () => {
    try {
      const data = await temaService.getAll();
      setTemas(data);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    }
  };

  const loadDisciplinas = async () => {
    try {
      const data = await disciplinaService.getAll();
      setDisciplinas(data);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingItem) {
        // Update existing
        const updated = await temaService.update(editingItem.id!, { ...data, id: editingItem.id });
        setTemas(temas.map(t => t.id === updated.id ? updated : t));
      } else {
        // Create new
        const created = await temaService.create(data);
        setTemas([...temas, created]);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };

  const handleEdit = (item: TemaDto) => {
    setEditingItem(item);
    setValue('disciplinaId', item.disciplinaId);
    setValue('nome', item.nome);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este tema?')) {
      try {
        await temaService.delete(id);
        setTemas(temas.filter(t => t.id !== id));
      } catch (error) {
        console.error('Erro ao excluir tema:', error);
      }
    }
  };

  const resetForm = () => {
    reset({
      disciplinaId: 0,
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
                <label htmlFor="disciplinaId" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <Select
                  id="disciplinaId"
                  options={disciplinas.map(disciplina => ({
                    value: disciplina.id,
                    label: disciplina.nome
                  }))}
                  value={{
                    value: watchedFields.disciplinaId,
                    label: disciplinas.find(d => d.id === watchedFields.disciplinaId)?.nome
                  } || null}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setValue('disciplinaId', selectedOption.value);
                    }
                  }}
                  placeholder="Selecione ou digite para pesquisar..."
                  isClearable
                  isSearchable
                />
                {errors.disciplinaId && <p className="mt-1 text-sm text-red-600">{errors.disciplinaId.message}</p>}
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
          {temas.map((tema) => {
            const disciplina = disciplinas.find(d => d.id === tema.disciplinaId);
            return (
              <li key={tema.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate">
                      {tema.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      {disciplina?.nome || 'Disciplina não encontrada'}
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