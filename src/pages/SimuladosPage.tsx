import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { simuladoService, disciplinaService, temaService, subtemaService, bancaService, cargoService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import Select from 'react-select';

type SimuladoSummaryDto = Types.SimuladoSummaryDto;
type DisciplinaDto = Types.DisciplinaSummaryDto;
type TemaDto = Types.TemaSummaryDto;
type SubtemaDto = Types.SubtemaSummaryDto;
type BancaDto = Types.BancaSummaryDto;
type CargoDto = Types.CargoDetailDto;

const SimuladosPage = () => {
  const [simulados, setSimulados] = useState<SimuladoSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Filter and Options data
  const [disciplinas, setDisciplinas] = useState<DisciplinaDto[]>([]);
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [bancas, setBancas] = useState<BancaDto[]>([]);
  const [cargos, setCargos] = useState<CargoDto[]>([]);

  // Form State
  const [formData, setFormData] = useState<Types.SimuladoGenerationRequest>({
    nome: '',
    bancaId: undefined,
    cargoId: undefined,
    areas: [],
    nivel: undefined,
    ignorarRespondidas: false,
    disciplinas: [],
    temas: [],
    subtemas: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [simuladosRes, discRes, temasRes, subRes, bancaRes, cargoRes] = await Promise.all([
        simuladoService.getAll({ size: 1000 }).catch(() => ({ content: [] })),
        disciplinaService.getAll({ size: 1000 }),
        temaService.getAll({ size: 1000 }),
        subtemaService.getAll({ size: 1000 }),
        bancaService.getAll({ size: 1000 }),
        cargoService.getAll({ size: 1000 })
      ]);

      setSimulados(simuladosRes.content);
      setDisciplinas(discRes.content);
      setTemas(temasRes.content);
      setSubtemas(subRes.content);
      setBancas(bancaRes.content);
      setCargos(cargoRes.content);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setSubmissionError(null);

    // Basic validation
    if (formData.disciplinas?.length === 0 && formData.temas?.length === 0 && formData.subtemas?.length === 0) {
      setSubmissionError('Selecione pelo menos uma disciplina, tema ou subtema');
      setLocalLoading(false);
      return;
    }

    try {
      await simuladoService.gerar(formData);
      await loadData();
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao gerar simulado:', error);
      setSubmissionError(error.message || 'Erro inesperado ao gerar simulado');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este simulado? As respostas serão preservadas.')) {
      try {
        await simuladoService.delete(id);
        setSimulados(simulados.filter(s => s.id !== id));
      } catch (error: any) {
        console.error('Erro ao excluir simulado:', error);
        alert(error.message || 'Erro ao excluir simulado');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      bancaId: undefined,
      cargoId: undefined,
      areas: [],
      nivel: undefined,
      ignorarRespondidas: false,
      disciplinas: [],
      temas: [],
      subtemas: []
    });
    setSubmissionError(null);
  };

  const addItem = (type: 'disciplinas' | 'temas' | 'subtemas', id: number) => {
    const list = [...(formData[type] || [])];
    if (!list.find(item => item.id === id)) {
      list.push({ id, quantidade: 10 });
      setFormData({ ...formData, [type]: list });
    }
  };

  const removeItem = (type: 'disciplinas' | 'temas' | 'subtemas', id: number) => {
    const list = (formData[type] || []).filter(item => item.id !== id);
    setFormData({ ...formData, [type]: list });
  };

  const updateQuantity = (type: 'disciplinas' | 'temas' | 'subtemas', id: number, qty: number) => {
    const list = (formData[type] || []).map(item => 
      item.id === id ? { ...item, quantidade: qty } : item
    );
    setFormData({ ...formData, [type]: list });
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
        title="Simulados"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Gerar Novo Simulado
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Novo Simulado</h3>
          <form onSubmit={handleGenerate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Simulado</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  required
                  placeholder="Ex: Simulado PC-SP 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banca de Preferência</label>
                <Select
                  options={bancas.map(b => ({ value: b.id, label: b.nome }))}
                  onChange={opt => setFormData({ ...formData, bancaId: opt?.value })}
                  isClearable
                  placeholder="Selecione..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo de Preferência</label>
                <Select
                  options={cargos.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }))}
                  onChange={opt => setFormData({ ...formData, cargoId: opt?.value })}
                  isClearable
                  placeholder="Selecione..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                <select
                  value={formData.nivel || ''}
                  onChange={e => setFormData({ ...formData, nivel: e.target.value as Types.NivelCargo || undefined })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                >
                  <option value="">Todos</option>
                  <option value="FUNDAMENTAL">Fundamental</option>
                  <option value="MEDIO">Médio</option>
                  <option value="SUPERIOR">Superior</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="ignorar"
                  checked={formData.ignorarRespondidas}
                  onChange={e => setFormData({ ...formData, ignorarRespondidas: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="ignorar" className="ml-2 block text-sm text-gray-900">
                  Ignorar questões já respondidas
                </label>
              </div>
            </div>

            <div className="space-y-6 mb-6 border-t border-gray-100 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleção de Disciplinas</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <Select
                      options={disciplinas.map(d => ({ value: d.id, label: d.nome }))}
                      onChange={opt => opt && addItem('disciplinas', opt.value)}
                      placeholder="Adicionar disciplina..."
                      value={null}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {formData.disciplinas?.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{disciplinas.find(d => d.id === item.id)?.nome}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={e => updateQuantity('disciplinas', item.id, parseInt(e.target.value) || 1)}
                          className="w-16 p-1 border rounded text-sm"
                        />
                        <button type="button" onClick={() => removeItem('disciplinas', item.id)} className="text-red-500 hover:text-red-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar sections for Temas and Subtemas could be added here for full functionality */}
            </div>

            {submissionError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {localLoading ? 'Gerando...' : 'Gerar Simulado'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {simulados.length === 0 ? (
            <li className="px-4 py-10 text-center text-gray-500">Nenhum simulado gerado ainda.</li>
          ) : (
            simulados.map((s) => (
              <li key={s.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate">{s.nome}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {s.finishedAt ? `Finalizado em ${new Date(s.finishedAt).toLocaleDateString()}` : 
                       s.startedAt ? 'Em andamento' : 'Não iniciado'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => (window.location.href = `/simulados/${s.id}`)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default SimuladosPage;