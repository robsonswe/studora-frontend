import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { cargoService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';

type CargoDto = Types.CargoDetailDto;
const NivelCargo = Types.NivelCargo;

const CargosPage = () => {
  const [cargos, setCargos] = useState<CargoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CargoDto | null>(null);
  const [formData, setFormData] = useState<Omit<CargoDto, 'id'>>({ 
    nome: '', 
    nivel: NivelCargo.SUPERIOR, 
    area: '' 
  });
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    loadCargos();
  }, []);

  const loadCargos = async () => {
    try {
      const data = await cargoService.getAll({ size: 1000 });
      setCargos(data.content);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setSubmissionError(null);

    try {
      if (editingItem) {
        await cargoService.update(editingItem.id, formData);
      } else {
        await cargoService.create(formData);
      }

      await loadCargos();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar cargo:', error);
      setSubmissionError(error.message || 'Erro inesperado ao salvar cargo');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (item: CargoDto) => {
    setEditingItem(item);
    setFormData({ nome: item.nome, nivel: item.nivel, area: item.area });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cargo?')) {
      setLocalLoading(true);
      try {
        await cargoService.delete(id);
        await loadCargos();
      } catch (error: any) {
        console.error('Erro ao excluir cargo:', error);
        alert(error.message || 'Erro ao excluir cargo');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', nivel: NivelCargo.SUPERIOR, area: '' });
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
        title="Cargos"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Novo Cargo
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Cargo' : 'Novo Cargo'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="mb-4">
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
                  Nível
                </label>
                <select
                  id="nivel"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: e.target.value as Types.NivelCargo })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                >
                  <option value={NivelCargo.FUNDAMENTAL}>Fundamental</option>
                  <option value={NivelCargo.MEDIO}>Médio</option>
                  <option value={NivelCargo.SUPERIOR}>Superior</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                  placeholder="Ex: TI, Jurídica, Administrativa"
                />
              </div>
            </div>

            {submissionError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}

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
                {localLoading ? 'Salvando...' : editingItem ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {cargos.map((cargo) => (
            <li key={cargo.id}>
              <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-indigo-600 truncate">
                    {cargo.nome}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatNivel(cargo.nivel)} - {cargo.area}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(cargo)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={localLoading}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cargo.id)}
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

export default CargosPage;