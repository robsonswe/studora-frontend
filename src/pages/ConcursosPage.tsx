import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { concursoService, bancaService, instituicaoService, cargoService } from '@/services/api';
import * as Types from '@/types';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { formatNivel } from '@/utils/formatters';

type ConcursoDto = Types.ConcursoSummaryDto;

const ConcursosPage = () => {
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ConcursoDto | null>(null);
  
  const [formData, setFormData] = useState<any>({
    instituicao: null as { value: number, label: string } | null,
    banca: null as { value: number, label: string } | null,
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    edital: '',
    cargos: [] as { value: number, label: string }[]
  });

  const [localLoading, setLocalLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadConcursos();
  }, []);

  const loadConcursos = async () => {
    setLoading(true);
    try {
      const data = await concursoService.getAll({ size: 1000 });
      setConcursos(data.content);
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstituicaoOptions = async (inputValue: string) => {
    const data = await instituicaoService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(i => ({ value: i.id, label: i.nome }));
  };

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(b => ({ value: b.id, label: b.nome }));
  };

  const loadCargoOptions = async (inputValue: string) => {
    const data = await cargoService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    
    const errors: string[] = [];
    if (!formData.instituicao) errors.push('Selecione uma instituição');
    if (!formData.banca) errors.push('Selecione uma banca');
    if (formData.ano < 1900 || formData.ano > 2100) errors.push('Ano deve ser entre 1900 e 2100');
    if (formData.mes < 1 || formData.mes > 12) errors.push('Mês deve ser entre 1 e 12');
    if (formData.cargos.length === 0) errors.push('Selecione pelo menos um cargo');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLocalLoading(true);
    try {
      const payload: any = {
        instituicaoId: formData.instituicao.value,
        bancaId: formData.banca.value,
        ano: formData.ano,
        mes: formData.mes,
        edital: formData.edital,
        cargos: formData.cargos.map((c: any) => c.value)
      };

      if (editingItem) {
        await concursoService.update(editingItem.id, payload);
      } else {
        await concursoService.create(payload);
      }
      
      await loadConcursos();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar concurso:', error);
      setValidationErrors([error.message || 'Erro inesperado ao salvar concurso']);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: ConcursoDto) => {
    setLocalLoading(true);
    try {
      const detail = await concursoService.getById(item.id);
      setEditingItem(item);
      
      setFormData({
        instituicao: { value: detail.instituicao.id, label: detail.instituicao.nome },
        banca: { value: detail.banca.id, label: detail.banca.nome },
        ano: detail.ano,
        mes: detail.mes,
        edital: detail.edital || '',
        cargos: detail.cargos.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }))
      });

      setShowForm(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes para edição:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este concurso?')) {
      setLocalLoading(true);
      try {
        await concursoService.delete(id);
        setConcursos(concursos.filter(c => c.id !== id));
      } catch (error) {
        console.error('Erro ao excluir concurso:', error);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      instituicao: null,
      banca: null,
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      edital: '',
      cargos: []
    });
    setEditingItem(null);
    setShowForm(false);
    setValidationErrors([]);
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
                <label htmlFor="instituicao" className="block text-sm font-medium text-gray-700 mb-1">
                  Instituição
                </label>
                <AsyncSelect
                  id="instituicao"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoOptions}
                  value={formData.instituicao}
                  onChange={(val) => setFormData({...formData, instituicao: val})}
                  placeholder="Busque..."
                />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="banca" className="block text-sm font-medium text-gray-700 mb-1">
                  Banca
                </label>
                <AsyncSelect
                  id="banca"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={formData.banca}
                  onChange={(val) => setFormData({...formData, banca: val})}
                  placeholder="Busque..."
                />
              </div>
              
              <div className="sm:col-span-2">
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

              <div className="sm:col-span-2">
                <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">
                  Mês
                </label>
                <input
                  type="number"
                  id="mes"
                  min="1"
                  max="12"
                  value={formData.mes}
                  onChange={(e) => setFormData({...formData, mes: parseInt(e.target.value) || 1})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="edital" className="block text-sm font-medium text-gray-700 mb-1">
                  Edital (Link ou Identificação)
                </label>
                <input
                  type="text"
                  id="edital"
                  value={formData.edital}
                  onChange={(e) => setFormData({...formData, edital: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="cargos" className="block text-sm font-medium text-gray-700 mb-1">
                  Cargos
                </label>
                <AsyncSelect
                  id="cargos"
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoOptions}
                  value={formData.cargos}
                  onChange={(opts) => setFormData({...formData, cargos: opts || []})}
                  placeholder="Busque por cargos..."
                />
              </div>
            </div>
            
            {validationErrors.length > 0 && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <div className="text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {validationErrors.map((error, index) => <li key={index}>{error}</li>)}
                      </ul>
                    </div>
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
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {localLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {concursos.map((concurso) => {
            return (
              <li key={concurso.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate">
                      {concurso.instituicao.nome}
                    </div>
                    <div className="text-sm text-gray-500">
                      {concurso.banca.nome} - {concurso.mes}/{concurso.ano}
                    </div>
                    {concurso.edital && (
                      <div className="text-xs text-gray-400">
                        Edital: {concurso.edital}
                      </div>
                    )}
                    <div className="text-xs text-indigo-400 mt-1">
                      Cargos: {(concurso.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
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

export default ConcursosPage;