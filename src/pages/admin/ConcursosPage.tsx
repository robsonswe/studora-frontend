import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { concursoService, bancaService, instituicaoService, cargoService, subtemaService } from '@/services/api';
import * as Types from '@/types';
import AsyncSelect from 'react-select/async';
import { formatNivel, formatDateTime, utcToLocalInputValue, localInputValueToUtc } from '@/utils/formatters';

type ConcursoDto = Types.ConcursoSummaryDto;

interface TopicoEntry {
  subtemaId: number;
  subtemaLabel: string;
  disciplinaId: number;
  disciplinaNome: string;
  temaId: number;
  temaNome: string;
  cargoIds: number[];
}

// Grouped structure for rendering the picked topicos list
interface TopicosByDisciplina {
  disciplinaId: number;
  disciplinaNome: string;
  temas: {
    temaId: number;
    temaNome: string;
    topicos: TopicoEntry[];
  }[];
}

const groupTopicos = (topicos: TopicoEntry[]): TopicosByDisciplina[] => {
  const disciplinaMap = new Map<number, TopicosByDisciplina>();

  for (const t of topicos) {
    if (!disciplinaMap.has(t.disciplinaId)) {
      disciplinaMap.set(t.disciplinaId, {
        disciplinaId: t.disciplinaId,
        disciplinaNome: t.disciplinaNome,
        temas: [],
      });
    }
    const disciplinaGroup = disciplinaMap.get(t.disciplinaId)!;

    let temaGroup = disciplinaGroup.temas.find(tg => tg.temaId === t.temaId);
    if (!temaGroup) {
      temaGroup = { temaId: t.temaId, temaNome: t.temaNome, topicos: [] };
      disciplinaGroup.temas.push(temaGroup);
    }

    temaGroup.topicos.push(t);
  }

  return Array.from(disciplinaMap.values());
};

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
    dataProva: '',
    cargos: [] as { value: number, label: string }[],
    topicos: [] as TopicoEntry[]
  });

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

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    try {
      const data = await concursoService.getAll({ page, size: 20 });
      setConcursos(data.content);
      setPagination(data);
      setCurrentPage(page);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConcursos(0);
  }, [loadConcursos]);

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

  // No filtering here — cacheOptions is restored; filterOption handles exclusion at render time
  const loadSubtemaOptions = async (inputValue: string) => {
    const data = await subtemaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(s => ({
      value: s.id,
      label: s.disciplinaNome ? `${s.disciplinaNome} - ${s.temaNome} - ${s.nome}` : s.nome,
      // carry grouping metadata so addTopico doesn't need a separate fetch
      disciplinaId: s.disciplinaId ?? 0,
      disciplinaNome: s.disciplinaNome ?? '',
      temaId: s.temaId,
      temaNome: s.temaNome ?? '',
    }));
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
          disciplinaId: opt.disciplinaId,
          disciplinaNome: opt.disciplinaNome,
          temaId: opt.temaId,
          temaNome: opt.temaNome,
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
        edital: formData.edital,
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
      
      // Invert topicos from { cargo → [subtemas] } to { subtema → [cargos] }
      const topicoMap = new Map<number, TopicoEntry>();
      detail.cargos.forEach(cargo => {
        (cargo.topicos || []).forEach(topico => {
          if (!topicoMap.has(topico.id)) {
            topicoMap.set(topico.id, {
              subtemaId: topico.id,
              subtemaLabel: topico.disciplinaNome
                ? `${topico.disciplinaNome} - ${topico.temaNome} - ${topico.nome}`
                : topico.nome,
              disciplinaId: topico.disciplinaId ?? 0,
              disciplinaNome: topico.disciplinaNome ?? '',
              temaId: topico.temaId,
              temaNome: topico.temaNome ?? '',
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
        await loadConcursos(currentPage);
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
      dataProva: '',
      cargos: [],
      topicos: []
    });
    setEditingItem(null);
    setShowForm(false);
    setValidationErrors([]);
  };

  if (loading && concursos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const selectedSubtemaIds = new Set(formData.topicos.map((t: TopicoEntry) => t.subtemaId));
  const groupedTopicos = groupTopicos(formData.topicos);

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
                  type="url"
                  id="edital"
                  value={formData.edital}
                  onChange={(e) => setFormData({...formData, edital: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="dataProva" className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Prova
                </label>
                <input
                  type="datetime-local"
                  id="dataProva"
                  value={formData.dataProva}
                  onChange={(e) => setFormData({...formData, dataProva: e.target.value})}
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
                  onChange={handleCargoChange}
                  placeholder="Busque por cargos..."
                />
              </div>
            </div>

            {formData.cargos.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tópicos (Subtemas)
                </label>
                <p className="text-xs text-gray-500 mb-3">Vincule subtemas aos cargos deste concurso.</p>

                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  filterOption={(opt) => !selectedSubtemaIds.has(opt.value)}
                  value={null}
                  onChange={(opt: any) => { if (opt) addTopico(opt); }}
                  placeholder="Busque um subtema para adicionar..."
                />

                {formData.topicos.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {groupedTopicos.map((disciplinaGroup) => (
                      <div key={disciplinaGroup.disciplinaId} className="border border-gray-200 rounded-lg overflow-hidden">

                        {/* Disciplina header */}
                        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
                          <span className="text-sm font-semibold text-indigo-800">
                            {disciplinaGroup.disciplinaNome || 'Sem disciplina'}
                          </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {disciplinaGroup.temas.map((temaGroup) => (
                            <div key={temaGroup.temaId}>

                              {/* Tema sub-header */}
                              <div className="bg-gray-50 px-4 py-1.5">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  {temaGroup.temaNome || 'Sem tema'}
                                </span>
                              </div>

                              {/* Subtemas */}
                              <div className="divide-y divide-gray-50">
                                {temaGroup.topicos.map((topico) => (
                                  <div key={topico.subtemaId} className="px-4 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {topico.subtemaLabel.split(' - ').pop()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeTopico(topico.subtemaId)}
                                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      {formData.cargos.map((cargo: any) => (
                                        <label key={cargo.value} className="inline-flex items-center text-sm text-gray-700">
                                          <input
                                            type="checkbox"
                                            checked={topico.cargoIds.includes(cargo.value)}
                                            onChange={() => toggleTopicoCargo(topico.subtemaId, cargo.value)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-1.5"
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
                    {concurso.dataProva && (
                      <div className="text-xs text-gray-400">
                        Data da Prova: {formatDateTime(concurso.dataProva)}
                      </div>
                    )}
                    <div className="text-xs text-indigo-400 mt-1">
                      Cargos: {(concurso.cargos || []).map(c => `${c.cargoNome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
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
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
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
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => loadConcursos(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === 0
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    &larr;
                  </button>

                  {/* Render page numbers */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    
                    if (totalPages > 0) {
                      pages.push(0);
                    }
                    
                    if (totalPages > 1) {
                      if (totalPages <= 5) {
                        for (let i = 1; i < totalPages - 1; i++) {
                          pages.push(i);
                        }
                      } else {
                        const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 4));
                        const endPage = Math.min(totalPages - 1, startPage + 2);
                        
                        for (let i = startPage; i <= endPage; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }
                      }
                      
                      if (totalPages > 1 && !pages.includes(totalPages - 1)) {
                        pages.push(totalPages - 1);
                      }
                    }
                    
                    pages.sort((a, b) => a - b);
                    
                    const elements = [];
                    for (let i = 0; i < pages.length; i++) {
                      const page = pages[i];
                      if (i > 0 && pages[i] - pages[i - 1] > 1) {
                        elements.push(
                          <span
                            key={`ellipsis-${pages[i - 1]}-${page}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                          >
                            ...
                          </span>
                        );
                      }
                      
                      elements.push(
                        <button
                          key={page}
                          onClick={() => loadConcursos(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === page
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page + 1}
                        </button>
                      );
                    }
                    
                    return elements;
                  })()}

                  <button
                    onClick={() => loadConcursos(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages - 1}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === pagination.totalPages - 1
                        ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                        : 'bg-white text-gray-900 hover:text-gray-600'
                    }`}
                  >
                    <span className="sr-only">Próximo</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConcursosPage;