import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { concursoService } from '@/services/api';
import * as Types from '@/types';

type ConcursoDto = Types.ConcursoDto;

const ConcursosPage = () => {
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ConcursoDto | null>(null);
  const [formData, setFormData] = useState<Omit<ConcursoDto, 'id'>>({
    nome: '',
    banca: '',
    ano: new Date().getFullYear(),
    cargo: '',
    nivel: '',
    area: ''
  });

  useEffect(() => {
    loadConcursos();
  }, []);

  const loadConcursos = async () => {
    try {
      const data = await concursoService.getAll();
      setConcursos(data);
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        // Update existing
        const updated = await concursoService.update(editingItem.id!, { ...formData, id: editingItem.id });
        setConcursos(concursos.map(c => c.id === updated.id ? updated : c));
      } else {
        // Create new
        const created = await concursoService.create(formData);
        setConcursos([...concursos, created]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar concurso:', error);
    }
  };

  const handleEdit = (item: ConcursoDto) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      banca: item.banca,
      ano: item.ano,
      cargo: item.cargo || '',
      nivel: item.nivel || '',
      area: item.area || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este concurso?')) {
      try {
        await concursoService.delete(id);
        setConcursos(concursos.filter(c => c.id !== id));
      } catch (error) {
        console.error('Erro ao excluir concurso:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      banca: '',
      ano: new Date().getFullYear(),
      cargo: '',
      nivel: '',
      area: ''
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
        title="Concursos" 
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Novo Concurso
          </button>
        } 
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? 'Editar Concurso' : 'Novo Concurso'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-3">
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
              
              <div className="sm:col-span-2">
                <label htmlFor="banca" className="block text-sm font-medium text-gray-700 mb-1">
                  Banca
                </label>
                <input
                  type="text"
                  id="banca"
                  value={formData.banca}
                  onChange={(e) => setFormData({...formData, banca: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
              </div>
              
              <div className="sm:col-span-1">
                <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-1">
                  Ano
                </label>
                <input
                  type="number"
                  id="ano"
                  value={formData.ano}
                  onChange={(e) => setFormData({...formData, ano: parseInt(e.target.value) || new Date().getFullYear()})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="nivel" className="block text-sm font-medium text-gray-700 mb-1">
                  Nível
                </label>
                <input
                  type="text"
                  id="nivel"
                  value={formData.nivel}
                  onChange={(e) => setFormData({...formData, nivel: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
              
              <div className="sm:col-span-1">
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
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
          {concursos.map((concurso) => (
            <li key={concurso.id}>
              <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-indigo-600 truncate">
                    {concurso.nome}
                  </div>
                  <div className="text-sm text-gray-500">
                    {concurso.banca} - {concurso.ano}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(concurso)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(concurso.id!)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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

export default ConcursosPage;