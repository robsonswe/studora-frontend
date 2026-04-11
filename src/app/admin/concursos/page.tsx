'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { concursoService, bancaService, instituicaoService, cargoService, subtemaService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import AsyncSelect from 'react-select/async';
import { formatNivel, formatDateTime, utcToLocalInputValue, localInputValueToUtc } from '@/utils/formatters';
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';

type ConcursoDto = Types.ConcursoSummaryDto;

interface TopicoEntry {
  subtemaId: number;
  subtemaLabel: string;
  disciplina?: Types.DisciplinaReferenceDto;
  tema?: Types.TemaReferenceDto;
  cargoIds: number[];
}

interface TopicosByDisciplina {
  disciplina?: Types.DisciplinaReferenceDto;
  temas: {
    tema?: Types.TemaReferenceDto;
    topicos: TopicoEntry[];
  }[];
}

const groupTopicos = (topicos: TopicoEntry[]): TopicosByDisciplina[] => {
  const disciplinaMap = new Map<string, TopicosByDisciplina>();

  for (const t of topicos) {
    const discKey = String(t.disciplina?.id ?? 0);
    if (!disciplinaMap.has(discKey)) {
      disciplinaMap.set(discKey, {
        disciplina: t.disciplina,
        temas: [],
      });
    }
    const disciplinaGroup = disciplinaMap.get(discKey)!;

    const temaKey = String(t.tema?.id ?? 0);
    let temaGroup = disciplinaGroup.temas.find(tg => String(tg.tema?.id ?? 0) === temaKey);
    if (!temaGroup) {
      temaGroup = { tema: t.tema, topicos: [] };
      disciplinaGroup.temas.push(temaGroup);
    }

    temaGroup.topicos.push(t);
  }

  return Array.from(disciplinaMap.values());
};

export default function ConcursosAdminPage() {
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ConcursoDto | null>(null);
  
  const [formData, setFormData] = useState<any>({
    instituicao: null as { value: number, label: string } | null,
    banca: null as { value: number, label: string } | null,
    ano: 2024,
    mes: 1,
    edital: '',
    dataProva: '',
    cargos: [] as { value: number, label: string }[],
    topicos: [] as TopicoEntry[]
  });

  // Set current date only on mount to avoid hydration mismatch
  useEffect(() => {
    if (!editingItem && !showForm) {
      setFormData((prev: any) => ({
        ...prev,
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1
      }));
    }
  }, [editingItem, showForm]);

  const [localLoading, setLocalLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [pagination, setPagination] = useState<Types.PageResponse<ConcursoDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  usePageTitle('Concursos', 'Admin');

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await concursoService.getAll({ page, size: 20 });
      setConcursos(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar concursos:', err);
      setError(err.message || 'Não foi possível carregar os concursos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConcursos(0);
  }, [loadConcursos]);

  const loadInstituicaoOptions = async (inputValue: string) => {
    try {
      const data = await instituicaoService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(i => ({ value: i.id, label: i.nome }));
    } catch (err) {
      console.error('Erro ao carregar instituições:', err);
      return [];
    }
  };

  const loadBancaOptions = async (inputValue: string) => {
    try {
      const data = await bancaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(b => ({ value: b.id, label: b.nome }));
    } catch (err) {
      console.error('Erro ao carregar bancas:', err);
      return [];
    }
  };

  const loadCargoOptions = async (inputValue: string) => {
    try {
      const data = await cargoService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }));
    } catch (err) {
      console.error('Erro ao carregar cargos:', err);
      return [];
    }
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    try {
      const data = await subtemaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(s => ({
        value: s.id,
        label: s.disciplina?.nome ? `${s.disciplina.nome} - ${s.tema?.nome} - ${s.nome}` : s.nome,
        disciplina: s.disciplina,
        tema: s.tema,
      }));
    } catch (err) {
      console.error('Erro ao carregar subtemas:', err);
      return [];
    }
  };

  const addTopico = (opt: any) => {
    if (formData.topicos.find((t: TopicoEntry) => t.subtemaId === opt.value)) return;
    const cargoIds = formData.cargos.map((c: any) => c.value);
    setFormData((prev: any) => ({
      ...prev,
      topicos: [
        ...prev.topicos,
        {
          subtemaId: opt.value,
          subtemaLabel: opt.label,
          disciplina: opt.disciplina,
          tema: opt.tema,
          cargoIds,
        },
      ],
    }));
  };

  const removeTopico = (subtemaId: number) => {
    setFormData((prev: any) => ({
      ...prev,
      topicos: prev.topicos.filter((t: TopicoEntry) => t.subtemaId !== subtemaId)
    }));
  };

  const toggleTopicoCargo = (subtemaId: number, cargoId: number) => {
    setFormData((prev: any) => ({
      ...prev,
      topicos: prev.topicos
        .map((t: TopicoEntry) => {
          if (t.subtemaId !== subtemaId) return t;
          const newCargoIds = t.cargoIds.includes(cargoId)
            ? t.cargoIds.filter(id => id !== cargoId)
            : [...t.cargoIds, cargoId];
          return { ...t, cargoIds: newCargoIds };
        })
        .filter((t: TopicoEntry) => t.cargoIds.length > 0)
    }));
  };

  const handleCargoChange = (opts: any) => {
    const newCargos = opts || [];
    const newCargoIds = newCargos.map((c: any) => c.value);
    setFormData((prev: any) => ({
      ...prev,
      cargos: newCargos,
      topicos: prev.topicos
        .map((t: TopicoEntry) => ({
          ...t,
          cargoIds: t.cargoIds.filter((id: number) => newCargoIds.includes(id))
        }))
        .filter((t: TopicoEntry) => t.cargoIds.length > 0)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const isValidUrl = (url: string): boolean => {
      try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    const errors: string[] = [];
    if (!formData.instituicao) errors.push('Selecione uma instituição');
    if (!formData.banca) errors.push('Selecione uma banca');
    if (formData.ano < 1900 || formData.ano > 2100) errors.push('Ano deve ser entre 1900 e 2100');
    if (formData.mes < 1 || formData.mes > 12) errors.push('Mês deve ser entre 1 e 12');
    if (formData.cargos.length === 0) errors.push('Selecione pelo menos um cargo');
    if (formData.edital && !isValidUrl(formData.edital)) errors.push('O edital deve ser um link válido (http:// ou https://)');

    formData.topicos.forEach((t: TopicoEntry) => {
      if (t.cargoIds.length === 0) errors.push(`O tópico "${t.subtemaLabel}" deve estar vinculado a pelo menos um cargo`);
    });

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
        edital: formData.edital.trim(),
        dataProva: localInputValueToUtc(formData.dataProva) ?? undefined,
        cargos: formData.cargos.map((c: any) => c.value),
        topicos: formData.topicos.reduce((acc: Record<number, number[]>, t: TopicoEntry) => {
          acc[t.subtemaId] = t.cargoIds;
          return acc;
        }, {})
      };

      if (editingItem) {
        await concursoService.update(editingItem.id, payload);
      } else {
        await concursoService.create(payload);
      }
      
      await loadConcursos(currentPage);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar concurso:', err);
      setValidationErrors([err.message || 'Erro inesperado ao salvar concurso. Verifique sua conexão.']);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: ConcursoDto) => {
    setLocalLoading(true);
    setValidationErrors([]);
    try {
      const detail = await concursoService.getById(item.id);
      setEditingItem(item);
      
      const topicoMap = new Map<number, TopicoEntry>();
      detail.cargos.forEach(cargo => {
        (cargo.topicos || []).forEach(topico => {
          if (!topicoMap.has(topico.id)) {
            topicoMap.set(topico.id, {
              subtemaId: topico.id,
              subtemaLabel: topico.disciplina?.nome
                ? `${topico.disciplina.nome} - ${topico.tema?.nome} - ${topico.nome}`
                : topico.nome,
              disciplina: topico.disciplina,
              tema: topico.tema,
              cargoIds: [],
            });
          }
          topicoMap.get(topico.id)!.cargoIds.push(cargo.cargoId);
        });
      });

      setFormData({
        instituicao: { value: detail.instituicao.id, label: detail.instituicao.nome },
        banca: { value: detail.banca.id, label: detail.banca.nome },
        ano: detail.ano,
        mes: detail.mes,
        edital: detail.edital || '',
        dataProva: utcToLocalInputValue(detail.dataProva),
        cargos: detail.cargos.map(c => ({ value: c.cargoId, label: `${c.cargoNome} - ${c.area} (${formatNivel(c.nivel)})` })),
        topicos: Array.from(topicoMap.values()),
      });

      setShowForm(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes para edição:', err);
      alert(err.message || 'Erro ao carregar detalhes para edição.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (typeof window !== 'undefined' && window.confirm('Tem certeza que deseja excluir este concurso? Todas as questões e simulados associados serão afetados.')) {
      setLocalLoading(true);
      try {
        await concursoService.delete(id);
        await loadConcursos(currentPage);
      } catch (err: any) {
        console.error('Erro ao excluir concurso:', err);
        alert(err.message || 'Erro ao excluir concurso. O item pode estar sendo usado por outras entidades.');
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
      dataProva: '',
      cargos: [],
      topicos: []
    });
    setEditingItem(null);
    setShowForm(false);
    setValidationErrors([]);
  };

  const selectedSubtemaIds = new Set(formData.topicos.map((t: TopicoEntry) => t.subtemaId));
  const groupedTopicos = groupTopicos(formData.topicos);

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, padding: '2px' }),
    placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base: any) => ({ ...base, color: '#111827', fontSize: '0.875rem', fontWeight: '500' })
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Concursos"
        subtitle="Gerenciamento de editais e provas"
        breadcrumbs={[{ label: 'Concursos' }]}
        actions={
          (!loading && !error && (concursos.length > 0 || showForm)) ? (
            <button
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              disabled={localLoading}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-bold transition-all ${
                showForm 
                  ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' 
                  : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
              }`}
            >
              {showForm ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Novo Concurso</>}
            </button>
          ) : null
        } 
      />

      {showForm && (
        <div className="bg-white shadow-xl rounded-xl p-8 mb-8 border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg mr-3">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {editingItem ? 'Editar Concurso' : 'Nova Prova / Edital'}
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="instituicao" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Instituição
                </label>
                <AsyncSelect
                  id="instituicao"
                  instanceId="instituicao-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoOptions}
                  value={formData.instituicao}
                  onChange={(val) => setFormData({...formData, instituicao: val})}
                  placeholder="Selecione o órgão..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="banca" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Banca Examinadora
                </label>
                <AsyncSelect
                  id="banca"
                  instanceId="banca-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={formData.banca}
                  onChange={(val) => setFormData({...formData, banca: val})}
                  placeholder="Selecione a banca..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="ano" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Ano
                </label>
                <input
                  type="number"
                  id="ano"
                  value={formData.ano}
                  onChange={(e) => setFormData({...formData, ano: parseInt(e.target.value) || new Date().getFullYear()})}
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="mes" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Mês do Edital
                </label>
                <input
                  type="number"
                  id="mes"
                  min="1"
                  max="12"
                  value={formData.mes}
                  onChange={(e) => setFormData({...formData, mes: parseInt(e.target.value) || 1})}
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  required
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="dataProva" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Data de Aplicação
                </label>
                <input
                  type="datetime-local"
                  id="dataProva"
                  value={formData.dataProva}
                  onChange={(e) => setFormData({...formData, dataProva: e.target.value})}
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="edital" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Link do Edital / Detalhes
                </label>
                <div className="relative">
                  <input
                    type="url"
                    id="edital"
                    autoComplete="off"
                    value={formData.edital}
                    onChange={(e) => setFormData({...formData, edital: e.target.value})}
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm pl-10"
                    placeholder="https://..."
                  />
                  <ExternalLink className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="cargos" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Cargos Vinculados
                </label>
                <AsyncSelect
                  id="cargos"
                  instanceId="cargos-select"
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoOptions}
                  value={formData.cargos}
                  onChange={handleCargoChange}
                  placeholder="Pesquise cargos..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>

            {formData.cargos.length > 0 && (
              <div className="mt-10 border-t border-gray-100 pt-8">
                <div className="flex items-center mb-4">
                  <Hash className="w-5 h-5 text-indigo-500 mr-2" />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conteúdo Programático (Edital)</h4>
                </div>
                <p className="text-xs text-gray-400 mb-6 font-medium">Selecione os subtemas que serão cobrados e vincule-os aos cargos específicos.</p>

                <AsyncSelect
                  instanceId="subtema-add-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  filterOption={(opt) => !selectedSubtemaIds.has(opt.value)}
                  value={null}
                  onChange={(opt: any) => { if (opt) addTopico(opt); }}
                  placeholder="Adicionar subtema ao edital..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />

                {formData.topicos.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-6">
                    {groupedTopicos.map((disciplinaGroup) => (
                      <div key={disciplinaGroup.disciplina?.id ?? 0} className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-100/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                            {disciplinaGroup.disciplina?.nome || 'Sem disciplina'}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {disciplinaGroup.temas.map((temaGroup) => (
                            <div key={temaGroup.tema?.id ?? 0}>
                              <div className="bg-white/40 px-5 py-2">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                                  Tema: {temaGroup.tema?.nome || 'Sem tema'}
                                </span>
                              </div>

                              <div className="bg-white divide-y divide-gray-50">
                                {temaGroup.topicos.map((topico) => (
                                  <div key={topico.subtemaId} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-bold text-gray-800">
                                        {topico.subtemaLabel.split(' - ').pop()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeTopico(topico.subtemaId)}
                                        className="text-[10px] font-black text-red-400 hover:text-red-700 uppercase tracking-widest bg-red-50 px-2 py-1 rounded transition-all"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                      {formData.cargos.map((cargo: any) => (
                                        <label key={cargo.value} className="inline-flex items-center text-[11px] font-bold text-gray-500 uppercase cursor-pointer hover:text-indigo-600 transition-all">
                                          <input
                                            type="checkbox"
                                            checked={topico.cargoIds.includes(cargo.value)}
                                            onChange={() => toggleTopicoCargo(topico.subtemaId, cargo.value)}
                                            className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                                          />
                                          {cargo.label.split(' - ')[0]}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mt-8 bg-red-50 border-l-4 border-red-400 p-5 rounded-lg shadow-sm">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />
                  <div>
                    <h5 className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-2">Erros de validação</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {validationErrors.map((error, index) => <li key={index} className="text-sm text-red-700 font-medium">{error}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-end space-x-4 border-t border-gray-100 pt-8">
              <button
                type="button"
                onClick={resetForm}
                disabled={localLoading}
                className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="px-10 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all min-w-[140px] flex justify-center items-center"
              >
                {localLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Prova'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
            <p className="text-gray-500 text-sm animate-pulse">Sincronizando base de concursos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao carregar dados</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => loadConcursos(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-sans"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : concursos.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum concurso encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Comece criando um novo concurso para o sistema.</p>
            {!showForm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-sans"
                >
                  Novo Concurso
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 font-sans">
            {concursos.map((concurso) => (
              <li key={concurso.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-sm font-medium text-indigo-600 truncate" title={concurso.instituicao.nome}>
                      {concurso.instituicao.nome}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <span className="font-mono tabular-nums text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">ID #{concurso.id}</span>
                      <span className="truncate">{concurso.banca.nome} · <span className="font-mono tabular-nums">{concurso.mes.toString().padStart(2, '0')}/{concurso.ano}</span></span>
                    </div>
                    {concurso.dataProva && (
                      <div className="text-xs text-gray-400 mt-1">
                        <span className="font-bold text-gray-300 mr-1">PROVA:</span>
                        <span className="font-mono tabular-nums">{formatDateTime(concurso.dataProva)}</span>
                      </div>
                    )}
                    <div className="text-xs text-indigo-400 mt-1 truncate" title={(concurso.cargos || []).map(c => `${c.cargoNome} (${formatNivel(c.nivel)})`).join(' · ')}>
                      <span className="font-bold text-indigo-300 mr-1 uppercase">Cargos:</span>
                      {(concurso.cargos || []).map(c => `${c.cargoNome} (${formatNivel(c.nivel)})`).join(' · ')}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(concurso)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(concurso.id!)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 font-sans focus:outline-none">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => loadConcursos(currentPage - 1)}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === 0
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => loadConcursos(currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === pagination.totalPages - 1
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-sans">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium font-mono tabular-nums">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium font-mono tabular-nums">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium font-mono tabular-nums">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadConcursos(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === 0
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-sm font-mono font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded tabular-nums">
                  {currentPage + 1} / {pagination.totalPages}
                </div>
                <button
                  onClick={() => loadConcursos(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages - 1}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === pagination.totalPages - 1
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
