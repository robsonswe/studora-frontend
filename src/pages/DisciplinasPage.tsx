import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useStudora } from '@/context/StudoraContext';
import * as Types from '@/types';

type DisciplinaDto = Types.DisciplinaDto;

const DisciplinasPage = () => {
  const {
    disciplinas,
    loading: contextLoading,
    errors,
    refreshDisciplinas
  } = useStudora();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DisciplinaDto | null>(null);
  const [formData, setFormData] = useState<Omit<DisciplinaDto, 'id'>>({ nome: '' });
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);

    try {
      if (editingItem) {
        // Update existing
        await import('@/services/api').then(({ disciplinaService }) =>
          disciplinaService.update(editingItem.id!, { ...formData, id: editingItem.id })
        );
      } else {
        // Create new
        await import('@/services/api').then(({ disciplinaService }) =>
          disciplinaService.create(formData)
        );
      }

      // Refresh data from context
      await refreshDisciplinas();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar disciplina:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (item: DisciplinaDto) => {
    setEditingItem(item);
    setFormData({ nome: item.nome });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      setLocalLoading(true);
      try {
        await import('@/services/api').then(({ disciplinaService }) =>
          disciplinaService.delete(id)
        );

        // Refresh data from context
        await refreshDisciplinas();
      } catch (error) {
        console.error('Erro ao excluir disciplina:', error);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  if (contextLoading.disciplinas || localLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (errors.disciplinas) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Erro ao carregar disciplinas: {errors.disciplinas.message}
            </p>
            <button
              onClick={() => refreshDisciplinas()}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Disciplinas"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Nova Disciplina
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Disciplina' : 'Nova Disciplina'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={localLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={localLoading}
              >
                {localLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {disciplinas.map((disciplina) => (
            <li key={disciplina.id}>
              <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                <div className="text-sm font-medium text-indigo-600 truncate">
                  {disciplina.nome}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(disciplina)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={localLoading}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(disciplina.id!)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    disabled={localLoading}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DisciplinasPage;