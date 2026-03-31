import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { simuladoService, disciplinaService, temaService, subtemaService, bancaService, cargoService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import Select from 'react-select';
import { 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  Play, 
  ChevronRight,
  X,
  BookOpen,
  Tag,
  Tags,
  AlertCircle,
  ClipboardList
} from 'lucide-react';

type SimuladoSummaryDto = Types.SimuladoSummaryDto;

const SimuladosPage = () => {
  const navigate = useNavigate();
  const [simulados, setSimulados] = useState<SimuladoSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Filter and Options data
  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [temas, setTemas] = useState<Types.TemaSummaryDto[]>([]);
  const [subtemas, setSubtemas] = useState<Types.SubtemaSummaryDto[]>([]);
  const [bancas, setBancas] = useState<Types.BancaSummaryDto[]>([]);
  const [cargos, setCargos] = useState<Types.CargoDetailDto[]>([]);

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

  const [pagination, setPagination] = useState<Types.PageResponse<SimuladoSummaryDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    loadData(0);
  }, []);

  const loadData = async (page: number = 0) => {
    setLoading(true);
    if (page !== currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
      const simuladosRes = await simuladoService.getAll({ page, size: 20 }).catch(() => ({ content: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: 20, last: true }));

      setSimulados(simuladosRes.content);
      setPagination(simuladosRes);
      setCurrentPage(page);
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
      await loadData(0);
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
        await loadData(currentPage);
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

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  if (loading && !showForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Meus Simulados"
        actions={
          <button
            onClick={async () => {
              setShowForm(true);
              try {
                const [discRes, temasRes, subRes, bancaRes, cargoRes] = await Promise.all([
                  disciplinaService.getAll({ size: 1000 }),
                  temaService.getAll({ size: 1000 }),
                  subtemaService.getAll({ size: 1000 }),
                  bancaService.getAll({ size: 1000 }),
                  cargoService.getAll({ size: 1000 })
                ]);

                setDisciplinas(discRes.content);
                setTemas(temasRes.content);
                setSubtemas(subRes.content);
                setBancas(bancaRes.content);
                setCargos(cargoRes.content);
              } catch (error) {
                console.error('Erro ao carregar opções do formulário:', error);
              }
            }}
            className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Gerar Novo Simulado
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-indigo-600" />
              Novo Simulado Personalizado
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleGenerate} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Simulado</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg p-3 border transition-all"
                  required
                  placeholder="Ex: Simulado PC-SP 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banca de Preferência</label>
                <Select
                  options={bancas.map(b => ({ value: b.id, label: b.nome }))}
                  onChange={opt => setFormData({ ...formData, bancaId: opt?.value })}
                  isClearable
                  placeholder="Qualquer banca..."
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cargo de Preferência</label>
                <Select
                  options={cargos.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }))}
                  onChange={opt => setFormData({ ...formData, cargoId: opt?.value })}
                  isClearable
                  placeholder="Qualquer cargo..."
                  styles={selectStyles}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nível</label>
                <select
                  value={formData.nivel || ''}
                  onChange={e => setFormData({ ...formData, nivel: e.target.value as Types.NivelCargo || undefined })}
                  className="shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg p-2.5 border transition-all"
                >
                  <option value="">Todos os níveis</option>
                  <option value="FUNDAMENTAL">Fundamental</option>
                  <option value="MEDIO">Médio</option>
                  <option value="SUPERIOR">Superior</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ignorarRespondidas}
                    onChange={e => setFormData({ ...formData, ignorarRespondidas: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Ignorar respondidas</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Disciplinas */}
              <div className="space-y-4">
                <div className="flex items-center text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
                  <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> Disciplinas
                </div>
                <Select
                  options={disciplinas.map(d => ({ value: d.id, label: d.nome }))}
                  onChange={opt => opt && addItem('disciplinas', opt.value)}
                  placeholder="Adicionar..."
                  value={null}
                  styles={selectStyles}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.disciplinas?.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-900 truncate flex-1">{disciplinas.find(d => d.id === item.id)?.nome}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={e => updateQuantity('disciplinas', item.id, parseInt(e.target.value) || 1)}
                          className="w-12 p-1 border border-indigo-200 rounded text-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        />
                        <button type="button" onClick={() => removeItem('disciplinas', item.id)} className="text-indigo-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temas */}
              <div className="space-y-4">
                <div className="flex items-center text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
                  <Tag className="w-4 h-4 mr-2 text-indigo-500" /> Temas
                </div>
                <Select
                  options={temas.map(t => ({ value: t.id, label: `${t.disciplinaNome} - ${t.nome}` }))}
                  onChange={opt => opt && addItem('temas', opt.value)}
                  placeholder="Adicionar..."
                  value={null}
                  styles={selectStyles}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.temas?.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-900 truncate flex-1">{temas.find(t => t.id === item.id)?.nome}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={e => updateQuantity('temas', item.id, parseInt(e.target.value) || 1)}
                          className="w-12 p-1 border border-indigo-200 rounded text-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        />
                        <button type="button" onClick={() => removeItem('temas', item.id)} className="text-indigo-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtemas */}
              <div className="space-y-4">
                <div className="flex items-center text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">
                  <Tags className="w-4 h-4 mr-2 text-indigo-500" /> Subtemas
                </div>
                <Select
                  options={subtemas.map(s => ({ value: s.id, label: `${s.disciplinaNome} - ${s.temaNome} - ${s.nome}` }))}
                  onChange={opt => opt && addItem('subtemas', opt.value)}
                  placeholder="Adicionar..."
                  value={null}
                  styles={selectStyles}
                />
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.subtemas?.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                      <span className="text-xs font-bold text-indigo-900 truncate flex-1">{subtemas.find(s => s.id === item.id)?.nome}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={e => updateQuantity('subtemas', item.id, parseInt(e.target.value) || 1)}
                          className="w-12 p-1 border border-indigo-200 rounded text-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        />
                        <button type="button" onClick={() => removeItem('subtemas', item.id)} className="text-indigo-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {submissionError && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <p className="text-sm text-red-700 font-medium">{submissionError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="px-8 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {localLoading ? 'Gerando...' : 'Criar Simulado'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-2xl border border-gray-200">
        <ul className="divide-y divide-gray-100">
          {simulados.length === 0 ? (
            <li className="px-4 py-16 text-center text-gray-500">
              <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum simulado ainda</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Você ainda não gerou simulados personalizados. Comece criando um para testar seus conhecimentos!
              </p>
              {!showForm && (
                <button onClick={() => setShowForm(true)} className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md">
                  <Plus className="w-5 h-5 mr-2" /> Gerar Meu Primeiro Simulado
                </button>
              )}
            </li>
          ) : (
            simulados.map((s) => (
              <li key={s.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <div className={`p-1.5 rounded-md mr-3 ${s.finishedAt ? 'bg-green-100 text-green-600' : s.startedAt ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                        {s.finishedAt ? <CheckCircle className="w-4 h-4" /> : s.startedAt ? <Clock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </div>
                      <h4 className="text-base font-bold text-gray-800 truncate">{s.nome}</h4>
                    </div>
                    <div className="pl-10 text-xs text-gray-500 space-y-1 mt-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {s.banca && <span className="font-medium text-gray-600">Banca: <span className="font-bold text-gray-800">{s.banca.nome}</span></span>}
                        {s.cargo && <span className="font-medium text-gray-600">Cargo: <span className="font-bold text-gray-800">{s.cargo.nome}</span></span>}
                        {s.nivel && <span className="font-medium text-gray-600">Nível: <span className="font-bold text-gray-800">{s.nivel}</span></span>}
                      </div>
                      {s.disciplinas && s.disciplinas.length > 0 && (
                        <p className="leading-tight">
                          <span className="font-medium">Disciplinas:</span> {s.disciplinas.map(d => d.nome).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                    {s.finishedAt ? (
                      <button onClick={() => navigate(`/simulados/${s.id}`)} className="text-indigo-600 bg-indigo-50 text-sm font-bold flex items-center hover:bg-indigo-100 transition-all px-4 py-2 rounded-lg">
                        Ver Resultados
                      </button>
                    ) : s.startedAt ? (
                      <button onClick={() => navigate(`/simulados/${s.id}`)} className="text-yellow-700 bg-yellow-50 text-sm font-bold flex items-center hover:bg-yellow-100 transition-all px-4 py-2 rounded-lg">
                        Continuar
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try { await simuladoService.iniciar(s.id); navigate(`/simulados/${s.id}`); } catch (error) { alert('Erro ao iniciar simulado: ' + (error as Error).message); }
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all"
                      >
                        Iniciar
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center py-4 border-t border-gray-100">
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm bg-white border border-gray-200 overflow-hidden" aria-label="Pagination">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 0}
                className="relative inline-flex items-center px-3 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              {[...Array(pagination.totalPages)].map((_, page) => (
                <button
                  key={page}
                  onClick={() => loadData(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-bold transition-all ${
                    currentPage === page ? 'z-10 bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => loadData(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className="relative inline-flex items-center px-3 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimuladosPage;