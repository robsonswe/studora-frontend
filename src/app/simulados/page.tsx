'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { simuladoService, disciplinaService, temaService, subtemaService, bancaService, cargoService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import AsyncSelect from 'react-select/async';
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
  ClipboardList,
  ChevronLeft,
  Settings2,
  Info
} from 'lucide-react';

// Extended type to accommodate possible performance fields
interface SimuladoSummaryWithStats extends Types.SimuladoSummaryDto {
  questoesRespondidas?: number;
  questoesAcertadas?: number;
}

const AccuracyPill = ({ accuracy, size = 'md' }: { accuracy: number, size?: 'sm' | 'md' | 'lg' }) => {
  const colorClass = accuracy >= 70 ? 'text-sage-700' : accuracy >= 50 ? 'text-amber-800' : 'text-terracotta-700';
  const bgClass = accuracy >= 70 ? 'bg-sage-50' : accuracy >= 50 ? 'bg-amber-50' : 'bg-terracotta-50';
  const sizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  
  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded-lg border border-current/10 ${bgClass} ${colorClass}`}>
      <span className={`font-mono font-bold tracking-tight tabular-nums ${sizeClasses[size]}`}>
        {accuracy}%
      </span>
    </div>
  );
};

export default function SimuladosPage() {
  const router = useRouter();
  const [simulados, setSimulados] = useState<SimuladoSummaryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [localLoading, setLocalLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filter and Options data
  const [cachedBancas, setCachedBancas] = useState<Types.BancaSummaryDto[]>([]);
  const [cachedCargos, setCachedCargos] = useState<Types.CargoDetailDto[]>([]);

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

  const [pagination, setPagination] = useState<Types.PageResponse<SimuladoSummaryWithStats>>({
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
      const simuladosRes = await simuladoService.getAll({ page, size: 20 }).catch(() => ({ 
        content: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: 20, last: true 
      }));

      setSimulados(simuladosRes.content);
      setPagination(simuladosRes);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalQuestionsPreview = useMemo(() => {
    const dCount = (formData.disciplinas || []).reduce((acc, d) => acc + d.quantidade, 0);
    const tCount = (formData.temas || []).reduce((acc, t) => acc + t.quantidade, 0);
    const sCount = (formData.subtemas || []).reduce((acc, s) => acc + s.quantidade, 0);
    return dCount + tCount + sCount;
  }, [formData.disciplinas, formData.temas, formData.subtemas]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep === 1) {
      if (!formData.nome.trim()) {
        setSubmissionError('O nome do simulado é obrigatório para registro.');
        return;
      }
      if (totalQuestionsPreview === 0) {
        setSubmissionError('Selecione ao menos um conteúdo programático.');
        return;
      }
      setFormStep(2);
      setSubmissionError(null);
      return;
    }

    setLocalLoading(true);
    setSubmissionError(null);

    try {
      await simuladoService.gerar(formData);
      await loadData(0);
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao gerar simulado:', error);
      setSubmissionError(error.message || 'Falha na geração do simulado. Verifique os parâmetros.');
    } finally {
      setLocalLoading(false);
    }
  };

  const confirmDelete = async (id: number) => {
    try {
      await simuladoService.delete(id);
      setDeletingId(null);
      await loadData(currentPage);
    } catch (error: any) {
      console.error('Erro ao excluir simulado:', error);
      alert('Erro na exclusão do registro.');
      setDeletingId(null);
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
    setFormStep(1);
    setSubmissionError(null);
  };

  const addItem = (type: 'disciplinas' | 'temas' | 'subtemas', id: number, label?: string) => {
    const list = [...(formData[type] || [])];
    if (!list.find(item => item.id === id)) {
      list.push({ id, quantidade: 10, _label: label } as any);
      setFormData({ ...formData, [type]: list });
    }
  };

  const removeItem = (type: 'disciplinas' | 'temas' | 'subtemas', id: number) => {
    const list = (formData[type] || []).filter(item => item.id !== id);
    setFormData({ ...formData, [type]: list });
  };

  const updateQuantity = (type: 'disciplinas' | 'temas' | 'subtemas', id: number, qty: number) => {
    const sanitizedQty = Math.min(Math.max(1, qty), 50);
    const list = (formData[type] || []).map(item => 
      item.id === id ? { ...item, quantidade: sanitizedQty } : item
    );
    setFormData({ ...formData, [type]: list });
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    try {
      const data = await disciplinaService.getAll({ nome: inputValue || undefined, size: 20, metrics: 'summary' });
      return data.content.map(d => ({ value: d.id, label: d.nome }));
    } catch { return []; }
  };

  const loadTemaOptions = async (inputValue: string) => {
    try {
      const data = await temaService.getAll({ nome: inputValue || undefined, size: 20, metrics: 'summary' });
      return data.content.map(t => ({ value: t.id, label: `${t.disciplina?.nome || ''} - ${t.nome}` }));
    } catch { return []; }
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    try {
      const data = await subtemaService.getAll({ nome: inputValue || undefined, size: 20, metrics: 'summary' });
      return data.content.map(s => ({ value: s.id, label: `${s.disciplina?.nome || ''} - ${s.tema?.nome || ''} - ${s.nome}` }));
    } catch { return []; }
  };

  const selectedDisciplinaIds = new Set((formData.disciplinas || []).map(d => d.id));
  const selectedTemaIds = new Set((formData.temas || []).map(t => t.id));
  const selectedSubtemaIds = new Set((formData.subtemas || []).map((s: any) => s.id));

  const loadBancaOptions = async (inputValue: string) => {
    try {
      const data = await bancaService.getAll({ nome: inputValue || undefined, size: 20 });
      setCachedBancas(data.content);
      return data.content.map(b => ({ value: b.id, label: b.nome }));
    } catch { return []; }
  };

  const loadCargoOptions = async (inputValue: string) => {
    try {
      const data = await cargoService.getAll({ nome: inputValue || undefined, size: 20 });
      setCachedCargos(data.content);
      return data.content.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }));
    } catch { return []; }
  };

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.75rem', padding: '2px' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  const buildPages = (current: number, total: number) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: (number | string)[] = [0];
    if (current > 2) pages.push('...');
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 3) pages.push('...');
    pages.push(total - 1);
    return pages;
  };

  if (loading && !showForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Simulados"
        actions={
          <button
            onClick={() => {
              setShowForm(true);
              resetForm();
            }}
            className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Gerar Simulado
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-xl rounded-2xl border border-slate-200 overflow-hidden animate-enter-1">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                Novo Simulado
              </h3>
              <p className="text-xs text-slate-500 font-medium">Passo {formStep} de 2: {formStep === 1 ? 'Definição do Conteúdo' : 'Filtros Avançados'}</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleGenerate} className="p-6">
            {formStep === 1 ? (
              <div className="space-y-8">
                <div className="max-w-xl">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Simulado</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-200 rounded-xl p-3 border transition-all"
                    required
                    placeholder="Ex: Simulado PC-SP 2024"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Disciplinas */}
                  <div className="space-y-4">
                    <div className="flex items-center text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> Disciplinas
                    </div>
                    <AsyncSelect
                      instanceId="disciplina-select"
                      cacheOptions
                      defaultOptions
                      loadOptions={loadDisciplinaOptions}
                      filterOption={(opt) => !selectedDisciplinaIds.has(Number(opt.value))}
                      onChange={opt => opt && addItem('disciplinas', Number(opt.value), opt.label)}
                      placeholder="Adicionar..."
                      value={null}
                      styles={selectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhuma encontrada"}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                      {formData.disciplinas?.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 group">
                          <span className="text-xs font-bold text-slate-700 truncate flex-1 pr-2">{(item as any)._label || `Disc. #${item.id}`}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={item.quantidade}
                              onChange={e => updateQuantity('disciplinas', item.id, parseInt(e.target.value) || 1)}
                              className="w-12 p-1 border border-slate-200 rounded-lg text-xs font-mono font-bold tabular-nums focus:ring-indigo-500 focus:border-indigo-500 bg-white text-center"
                            />
                            <button type="button" onClick={() => removeItem('disciplinas', item.id)} className="text-slate-400 hover:text-terracotta-500 transition-colors p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Temas */}
                  <div className="space-y-4">
                    <div className="flex items-center text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <Tag className="w-4 h-4 mr-2 text-indigo-500" /> Temas
                    </div>
                    <AsyncSelect
                      instanceId="tema-select"
                      cacheOptions
                      defaultOptions
                      loadOptions={loadTemaOptions}
                      filterOption={(opt) => !selectedTemaIds.has(Number(opt.value))}
                      onChange={opt => opt && addItem('temas', Number(opt.value), opt.label)}
                      placeholder="Adicionar..."
                      value={null}
                      styles={selectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhum encontrado"}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                      {formData.temas?.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 truncate flex-1 pr-2">{(item as any)._label || `Tema #${item.id}`}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={item.quantidade}
                              onChange={e => updateQuantity('temas', item.id, parseInt(e.target.value) || 1)}
                              className="w-12 p-1 border border-slate-200 rounded-lg text-xs font-mono font-bold tabular-nums focus:ring-indigo-500 focus:border-indigo-500 bg-white text-center"
                            />
                            <button type="button" onClick={() => removeItem('temas', item.id)} className="text-slate-400 hover:text-terracotta-500 transition-colors p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subtemas */}
                  <div className="space-y-4">
                    <div className="flex items-center text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <Tags className="w-4 h-4 mr-2 text-indigo-500" /> Subtemas
                    </div>
                    <AsyncSelect
                      instanceId="subtema-select"
                      cacheOptions
                      defaultOptions
                      loadOptions={loadSubtemaOptions}
                      filterOption={(opt) => !selectedSubtemaIds.has(Number(opt.value))}
                      onChange={opt => opt && addItem('subtemas', Number(opt.value), opt.label)}
                      placeholder="Adicionar..."
                      value={null}
                      styles={selectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhum encontrado"}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                      {formData.subtemas?.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 truncate flex-1 pr-2">{(item as any)._label || `Subtema #${item.id}`}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={item.quantidade}
                              onChange={e => updateQuantity('subtemas', item.id, parseInt(e.target.value) || 1)}
                              className="w-12 p-1 border border-slate-200 rounded-lg text-xs font-mono font-bold tabular-nums focus:ring-indigo-500 focus:border-indigo-500 bg-white text-center"
                            />
                            <button type="button" onClick={() => removeItem('subtemas', item.id)} className="text-slate-400 hover:text-terracotta-500 transition-colors p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900">Total planejado: <span className="text-lg font-mono font-bold tabular-nums">{totalQuestionsPreview}</span> questões</p>
                    <p className="text-xs text-indigo-600 font-medium">As quantidades podem ser ajustadas individualmente até o limite de 50 por tópico.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-enter-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Banca de Preferência</label>
                    <AsyncSelect
                      instanceId="banca-select"
                      cacheOptions
                      defaultOptions
                      loadOptions={loadBancaOptions}
                      onChange={opt => setFormData({ ...formData, bancaId: opt?.value })}
                      isClearable
                      placeholder="Qualquer banca..."
                      styles={selectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhuma encontrada"}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                    <p className="mt-1.5 text-[10px] text-slate-400 font-medium flex items-center"><Info className="w-3 h-3 mr-1" /> Priorização baseada na banca selecionada nos tópicos do simulado.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cargo de Preferência</label>
                    <AsyncSelect
                      instanceId="cargo-select"
                      cacheOptions
                      defaultOptions
                      loadOptions={loadCargoOptions}
                      onChange={opt => setFormData({ ...formData, cargoId: opt?.value })}
                      isClearable
                      placeholder="Qualquer cargo..."
                      styles={selectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhum encontrado"}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nível de Escolaridade</label>
                    <select
                      value={formData.nivel || ''}
                      onChange={e => setFormData({ ...formData, nivel: e.target.value as Types.NivelCargo || undefined })}
                      className="shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-200 rounded-xl p-3 border transition-all appearance-none bg-white"
                    >
                      <option value="">Todos os níveis</option>
                      <option value="FUNDAMENTAL">Fundamental</option>
                      <option value="MEDIO">Médio</option>
                      <option value="SUPERIOR">Superior</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.ignorarRespondidas}
                        onChange={e => setFormData({ ...formData, ignorarRespondidas: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-3 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Ignorar questões já respondidas</span>
                    </label>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                  <Settings2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Estes filtros estratégicos são opcionais. Caso omitidos, o sistema priorizará a diversidade de questões nos tópicos selecionados.
                  </p>
                </div>
              </div>
            )}

            {submissionError && (
              <div className="mt-6 bg-terracotta-50 border-l-4 border-terracotta-500 p-4 rounded-r-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-terracotta-500 mr-3" />
                  <p className="text-sm text-terracotta-700 font-bold">{submissionError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between space-x-4 border-t border-slate-100 mt-8 pt-6">
              {formStep === 2 ? (
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="px-6 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
              )}
              
              <button
                type="submit"
                disabled={localLoading}
                className="px-8 py-2.5 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center"
              >
                {formStep === 1 ? (
                  <>Próximo: Filtros <ChevronRight className="w-4 h-4 ml-2" /></>
                ) : (
                  localLoading ? 'Gerando...' : 'Confirmar Geração'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-3xl border border-slate-200">
        <ul className="divide-y divide-slate-100">
          {simulados.length === 0 ? (
            <li className="px-4 py-20 text-center text-slate-500 animate-enter-1">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Histórico de simulados vazio</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">
                Gere seu primeiro simulado personalizado para iniciar a medição de desempenho estratégico.
              </p>
              {!showForm && (
                <button onClick={() => setShowForm(true)} className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-100">
                  <Plus className="w-5 h-5 mr-2" /> Iniciar Primeiro Simulado
                </button>
              )}
            </li>
          ) : (
            simulados.map((s, idx) => {
              const isFinished = !!s.finishedAt;
              const isStarted = !!s.startedAt && !isFinished;
              const totalPlanned = [...(s.disciplinas || []), ...(s.temas || []), ...(s.subtemas || [])].reduce((acc, curr) => acc + (curr.quantidade || 0), 0);
              const accuracy = (s.questoesRespondidas ?? 0) > 0 ? Math.round(((s.questoesAcertadas ?? 0) / (s.questoesRespondidas ?? 0)) * 100) : null;

              return (
                <li key={s.id} className={`group px-4 py-5 sm:px-6 transition-all border-l-[4px] animate-enter-${Math.min(idx + 1, 5)} ${
                  isFinished ? 'border-sage-500 bg-sage-50/20' : 
                  isStarted ? 'border-amber-500 bg-amber-50/20' : 
                  'border-transparent hover:bg-slate-50/80'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1.5">
                        <h4 className="text-lg font-bold text-slate-800 truncate tracking-tight">{s.nome}</h4>
                        {isFinished && accuracy !== null && (
                          <div className="ml-4 flex items-center gap-2">
                            <AccuracyPill accuracy={accuracy} size="sm" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Taxa de acerto</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          {isFinished ? (
                            <span className="text-sage-700 font-bold bg-sage-100/50 px-2 py-0.5 rounded-full flex items-center border border-sage-200/50">
                              <CheckCircle className="w-3 h-3 mr-1" /> Concluído
                            </span>
                          ) : isStarted ? (
                            <span className="text-amber-800 font-bold bg-amber-100/50 px-2 py-0.5 rounded-full flex items-center border border-amber-200/50">
                              <Clock className="w-3 h-3 mr-1" /> Em andamento
                            </span>
                          ) : (
                            <span className="text-indigo-700 font-bold bg-indigo-100/50 px-2 py-0.5 rounded-full flex items-center border border-indigo-200/50">
                              <Play className="w-3 h-3 mr-1" /> Não iniciado
                            </span>
                          )}
                          
                          {isFinished && (
                            <span className="font-mono font-bold text-slate-700 flex items-center tabular-nums">
                              <Info className="w-3 h-3 mr-1 text-slate-300" />
                              {s.questoesAcertadas ?? 0}/{s.questoesRespondidas ?? totalPlanned} questões
                            </span>
                          )}
                          
                          {!isFinished && (
                            <span className="font-mono font-bold text-slate-700 flex items-center tabular-nums">
                              <ClipboardList className="w-3 h-3 mr-1 text-slate-300" />
                              {totalPlanned} questões
                            </span>
                          )}

                          {s.banca && <span className="text-slate-400">Banca: <span className="font-bold text-slate-700">{s.banca.nome}</span></span>}
                          {s.cargo && <span className="text-slate-400">Cargo: <span className="font-bold text-slate-700">{s.cargo.nome}</span></span>}
                        </div>
                        
                        {(s.disciplinas && s.disciplinas.length > 0) && (
                          <p className="line-clamp-1 opacity-80 text-slate-400">
                            <span className="font-bold text-slate-500">Disciplinas:</span> {s.disciplinas.map(d => d.nome).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                      {deletingId === s.id ? (
                        <div className="flex items-center gap-2 bg-terracotta-50 p-1 rounded-xl border border-terracotta-100 animate-in slide-in-from-right-2">
                          <span className="text-[10px] font-bold text-terracotta-700 px-2 uppercase">Excluir?</span>
                          <button onClick={() => confirmDelete(s.id)} className="bg-terracotta-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-terracotta-600 shadow-sm transition-all">Sim</button>
                          <button onClick={() => setDeletingId(null)} className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">Não</button>
                        </div>
                      ) : (
                        <>
                          {isFinished ? (
                            <Link href={`/simulados/${s.id}`} className="text-indigo-600 bg-white border border-slate-200 shadow-sm text-xs font-bold flex items-center hover:bg-indigo-50 hover:border-indigo-100 transition-all px-4 py-2.5 rounded-xl">
                              Resultados <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          ) : isStarted ? (
                            <Link href={`/simulados/${s.id}`} className="text-amber-800 bg-amber-100 text-xs font-bold flex items-center hover:bg-amber-200 transition-all px-4 py-2.5 rounded-xl shadow-sm">
                              Continuar <Play className="w-4 h-4 ml-1 fill-current" />
                            </Link>
                          ) : (
                            <button
                              onClick={async () => {
                                try { await simuladoService.iniciar(s.id); router.push(`/simulados/${s.id}`); } catch (error) { alert('Erro ao iniciar simulado: ' + (error as Error).message); }
                              }}
                              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center"
                            >
                              Iniciar <Play className="w-4 h-4 ml-2 fill-white" />
                            </button>
                          )}
                          <button onClick={() => setDeletingId(s.id)} className="p-2.5 text-slate-400 hover:text-terracotta-500 hover:bg-terracotta-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center py-6 border-t border-slate-50 bg-slate-50/50">
            <nav className="isolate inline-flex -space-x-px rounded-2xl shadow-sm bg-white border border-slate-200 overflow-hidden p-1 gap-1" aria-label="Pagination">
              <button
                onClick={() => loadData(currentPage - 1)}
                disabled={currentPage === 0}
                className="relative inline-flex items-center p-2 rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {buildPages(currentPage, pagination.totalPages).map((page, idx) => (
                typeof page === 'string' ? (
                  <span key={`ell-${idx}`} className="px-3 py-2 text-slate-400 text-sm font-bold flex items-center">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => loadData(page)}
                    className={`relative inline-flex items-center px-4 py-2 rounded-xl text-sm font-mono font-bold tabular-nums transition-all ${
                      currentPage === page ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page + 1}
                  </button>
                )
              ))}

              <button
                onClick={() => loadData(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className="relative inline-flex items-center p-2 rounded-xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
