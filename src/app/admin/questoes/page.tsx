'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { formatNivel } from '@/utils/formatters';
import { questaoService, concursoService, subtemaService } from '@/services/api';
import * as Types from '@/types';
import { 
  Loader2, 
  AlertCircle, 
  Tag, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

type QuestaoDto = Types.QuestaoSummaryDto;
type AlternativaDto = Types.AlternativaDto;

export default function QuestoesPage() {
  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestaoDto | null>(null);
  const [availableCargos, setAvailableCargos] = useState<Types.CargoSummaryDto[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const [pagination, setPagination] = useState<Types.PageResponse<QuestaoDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      concurso: null as { value: number, label: string } | null,
      enunciado: '',
      anulada: false,
      desatualizada: false,
      subtemas: [] as { value: number, label: string }[],
      cargos: [] as number[],
      imageUrl: ''
    }
  });

  const watchedFields = watch();

  const [currentAlternativas, setCurrentAlternativas] = useState<AlternativaDto[]>([]);
  const [novaAlternativa, setNovaAlternativa] = useState<Omit<AlternativaDto, 'id' | 'questaoId'>>({
    ordem: 0,
    texto: '',
    correta: false,
    justificativa: ''
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [alternativeErrors, setAlternativeErrors] = useState<string>('');

  const loadQuestoes = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await questaoService.getAll({ page, size: 20 });
      setQuestoes(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar questões:', err);
      setError(err.message || 'Não foi possível carregar as questões. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestoes(0);
  }, [loadQuestoes]);

  useEffect(() => {
    if (watchedFields.concurso?.value) {
      concursoService.getById(watchedFields.concurso.value)
        .then(detail => {
          setAvailableCargos(detail.cargos.map(c => ({ id: c.cargoId, nome: c.cargoNome, nivel: c.nivel, area: c.area })));
        })
        .catch(console.error);
    } else {
      setAvailableCargos([]);
    }
  }, [watchedFields.concurso?.value]);

  const onSubmit = async (data: any) => {
    const errors: string[] = [];

    if (currentAlternativas.length < 2) {
      errors.push('A questão deve ter pelo menos 2 alternativas');
    }

    if (!data.anulada) {
      const correctAlternativas = currentAlternativas.filter(a => a.correta);
      if (correctAlternativas.length === 0) {
        errors.push('Pelo menos uma alternativa deve ser marcada como correta');
      } else if (correctAlternativas.length > 1) {
        errors.push('Apenas uma alternativa pode ser marcada como correta (questão não anulada)');
      }
    }
    
    if (data.cargos.length === 0) {
      errors.push('A questão deve estar associada a pelo menos um cargo');
    }

    if (data.subtemas.length === 0) {
      errors.push('A questão deve estar associada a pelo menos um subtema');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setLocalLoading(true);

    try {
      const payload = {
        concursoId: data.concurso.value,
        enunciado: data.enunciado,
        anulada: data.anulada,
        desatualizada: data.desatualizada,
        imageUrl: data.imageUrl,
        subtemaIds: data.subtemas.map((s: any) => s.value),
        cargos: data.cargos,
        alternativas: currentAlternativas.map((alt, index) => ({
          ...alt,
          ordem: index + 1
        }))
      };

      if (editingItem) {
        await questaoService.update(editingItem.id, payload);
      } else {
        await questaoService.create(payload);
      }

      await loadQuestoes(currentPage);
      resetForm();
    } catch (err: any) {
      console.error('Erro ao salvar questão:', err);
      setValidationErrors([err.message || 'Erro inesperado ao salvar questão. Verifique sua conexão.']);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: QuestaoDto) => {
    setLocalLoading(true);
    setValidationErrors([]);
    try {
      const detail = await questaoService.getById(item.id, true);
      setEditingItem(item);

      const concursoLabel = `${detail.concurso.ano} - ${detail.concurso.instituicaoNome} - ${detail.concurso.bancaNome}`;
      setValue('concurso', { value: detail.concurso.id, label: concursoLabel });
      setValue('enunciado', detail.enunciado);
      setValue('anulada', detail.anulada);
      setValue('desatualizada', detail.desatualizada);

      setValue('subtemas', (detail.subtemas || []).map(s => ({
        value: s.id,
        label: s.disciplinaNome ? `${s.disciplinaNome} - ${s.temaNome} - ${s.nome}` : s.nome
      })));

      setValue('cargos', detail.cargoIds || detail.cargos.map(c => c.id));
      setValue('imageUrl', detail.imageUrl || '');

      setCurrentAlternativas([...detail.alternativas].sort((a, b) => a.ordem - b.ordem));
      setShowForm(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da questão:', err);
      alert(err.message || 'Erro ao carregar detalhes para edição.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
      setLocalLoading(true);
      try {
        await questaoService.delete(id);
        await loadQuestoes(currentPage);
      } catch (err: any) {
        console.error('Erro ao excluir questão:', err);
        alert(err.message || 'Erro ao excluir questão. O item pode estar sendo usado por outras entidades.');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const resetForm = () => {
    reset({
      concurso: null,
      enunciado: '',
      anulada: false,
      desatualizada: false,
      subtemas: [],
      cargos: [],
      imageUrl: ''
    });
    setCurrentAlternativas([]);
    setNovaAlternativa({
      ordem: 0,
      texto: '',
      correta: false,
      justificativa: ''
    });
    setEditingItem(null);
    setShowForm(false);
    setValidationErrors([]);
  };

  const loadConcursoOptions = async (inputValue: string) => {
    const data = await concursoService.getAll({ size: 50 });
    return data.content.map(c => ({
      value: c.id,
      label: `${c.mes}/${c.ano} - ${c.instituicao.nome} - ${c.banca.nome}`
    })).filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    const data = await subtemaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(s => ({ 
      value: s.id, 
      label: s.disciplinaNome ? `${s.disciplinaNome} - ${s.temaNome} - ${s.nome}` : s.nome 
    }));
  };

  const adicionarAlternativa = () => {
    if (!novaAlternativa.texto.trim()) {
      setAlternativeErrors('O campo texto da alternativa é obrigatório');
      return;
    }

    setAlternativeErrors(''); 
    const nova = {
      ...novaAlternativa,
      ordem: currentAlternativas.length + 1
    };
    setCurrentAlternativas([...currentAlternativas, nova as AlternativaDto]);
    setNovaAlternativa({
      ordem: 0,
      texto: '',
      correta: false,
      justificativa: ''
    });
  };

  const removerAlternativa = (index: number) => {
    const novasAlternativas = [...currentAlternativas];
    novasAlternativas.splice(index, 1);
    setCurrentAlternativas(novasAlternativas);
  };

  const moverAlternativaParaCima = (index: number) => {
    if (index === 0) return;
    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index - 1]] = [novasAlternativas[index - 1], novasAlternativas[index]];
    setCurrentAlternativas(novasAlternativas);
  };

  const moverAlternativaParaBaixo = (index: number) => {
    if (index === currentAlternativas.length - 1) return;
    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index + 1]] = [novasAlternativas[index + 1], novasAlternativas[index]];
    setCurrentAlternativas(novasAlternativas);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Questões"
        actions={
          (!loading && !error && (questoes.length > 0 || showForm)) ? (
            <button
              onClick={() => {
                if (showForm) {
                   resetForm();
                } else {
                   setShowForm(true);
                }
              }}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {showForm ? 'Cancelar' : 'Nova Questão'}
            </button>
          ) : null
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingItem ? 'Editar Questão' : 'Nova Questão'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="enunciado" className="block text-sm font-medium text-gray-700 mb-1">
                  Enunciado
                </label>
                <textarea
                  id="enunciado"
                  rows={4}
                  {...register('enunciado', { required: 'Enunciado é obrigatório' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
                {errors.enunciado && <p className="mt-1 text-sm text-red-600">{errors.enunciado.message}</p>}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="concurso" className="block text-sm font-medium text-gray-700 mb-1">
                  Concurso
                </label>
                <AsyncSelect
                  id="concurso"
                  instanceId="concurso-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadConcursoOptions}
                  value={watchedFields.concurso}
                  onChange={(val) => {
                    setValue('concurso', val);
                    setValue('cargos', []);
                  }}
                  placeholder="Busque por concurso..."
                  className="text-sm"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargos do Concurso
                </label>
                <Select
                  id="cargos"
                  instanceId="cargos-select"
                  isMulti
                  options={availableCargos.map(c => ({
                    value: c.id,
                    label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`
                  }))}
                  value={watchedFields.cargos.map(id => {
                    const cargo = availableCargos.find(c => c.id === id);
                    return {
                      value: id,
                      label: cargo ? `${cargo.nome} - ${cargo.area} (${formatNivel(cargo.nivel)})` : `Cargo ID: ${id}`
                    };
                  })}
                  onChange={(selectedOptions) => {
                    setValue('cargos', selectedOptions ? selectedOptions.map(o => o.value) : []);
                  }}
                  placeholder="Selecione os cargos..."
                  isDisabled={!watchedFields.concurso}
                  className="text-sm"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtemas
                </label>
                <AsyncSelect
                  id="subtemas"
                  instanceId="subtemas-select"
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  value={watchedFields.subtemas}
                  onChange={(val) => setValue('subtemas', val as any)}
                  placeholder="Busque por subtemas..."
                  className="text-sm"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL da Imagem
                </label>
                <input
                  type="text"
                  id="imageUrl"
                  {...register('imageUrl')}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>

              <div className="sm:col-span-3">
                <div className="flex items-center space-x-4 h-full pt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="anulada"
                      {...register('anulada')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="anulada" className="ml-2 text-sm text-gray-700">
                      Anulada
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="desatualizada"
                      {...register('desatualizada')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="desatualizada" className="ml-2 text-sm text-gray-700">
                      Desatualizada
                    </label>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6 border-t border-gray-100 pt-6">
                <h4 className="text-md font-bold text-gray-900 mb-4">Alternativas</h4>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
                  <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-12">
                    <div className="sm:col-span-8">
                      <label htmlFor="texto" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Texto da Alternativa
                      </label>
                      <input
                        type="text"
                        id="texto"
                        value={novaAlternativa.texto}
                        onChange={(e) => setNovaAlternativa({...novaAlternativa, texto: e.target.value})}
                        className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border ${
                          alternativeErrors ? 'border-red-500' : ''
                        }`}
                        placeholder="Ex: Todas as alternativas estão corretas."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center pt-6">
                        <input
                          type="checkbox"
                          id="correta"
                          checked={novaAlternativa.correta}
                          onChange={(e) => setNovaAlternativa({...novaAlternativa, correta: e.target.checked})}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="correta" className="ml-2 text-sm text-gray-700">
                          Correta
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={adicionarAlternativa}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {alternativeErrors && (
                    <div className="mt-2 text-sm text-red-600">
                      {alternativeErrors}
                    </div>
                  )}

                  <div className="mt-4">
                    <label htmlFor="justificativa_alt" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Justificativa (Explicação)
                    </label>
                    <textarea
                      id="justificativa_alt"
                      rows={2}
                      value={novaAlternativa.justificativa || ''}
                      onChange={(e) => setNovaAlternativa({...novaAlternativa, justificativa: e.target.value})}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Explique por que esta alternativa é a correta ou por que está errada."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {currentAlternativas.map((alternativa, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-12 items-center">
                        <div className="sm:col-span-1">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <div className="sm:col-span-6">
                          <div className="text-gray-900 font-medium">{alternativa.texto}</div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            alternativa.correta 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {alternativa.correta ? 'Correta' : 'Incorreta'}
                          </div>
                        </div>
                        <div className="sm:col-span-3 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaCima(index)}
                            disabled={index === 0}
                            className={`p-1.5 rounded-md transition-colors ${
                              index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600'
                            }`}
                            title="Mover para cima"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaBaixo(index)}
                            disabled={index === currentAlternativas.length - 1}
                            className={`p-1.5 rounded-md transition-colors ${
                              index === currentAlternativas.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600'
                            }`}
                            title="Mover para baixo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removerAlternativa(index)}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Remover alternativa"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {alternativa.justificativa && (
                        <div className="mt-3 pl-12">
                          <div className="text-sm text-gray-600 bg-slate-50 p-3 rounded-md border-l-4 border-indigo-200">
                            <span className="font-bold text-indigo-700 block mb-1">Explicação:</span> 
                            {alternativa.justificativa}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm text-red-800 font-bold">
                      Por favor, corrija os erros abaixo:
                    </div>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-red-700">
                      {validationErrors.map((error, index) => <li key={index}>{error}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end space-x-3 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={resetForm}
                disabled={localLoading}
                className="inline-flex items-center px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={localLoading}
                className="inline-flex items-center px-8 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                {localLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </>
                ) : editingItem ? 'Atualizar Questão' : 'Salvar Questão'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded shadow-sm flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => loadQuestoes(currentPage)}
            className="text-sm font-bold text-red-700 hover:text-red-800 underline uppercase tracking-tight"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-80 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 text-sm font-medium animate-pulse">Carregando acervo de questões...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col justify-center items-center h-80 text-center px-4 bg-slate-50/50">
             <div className="bg-red-100 p-3 rounded-full mb-4">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
             </div>
             <h3 className="text-lg font-bold text-gray-900">Erro técnico detectado</h3>
             <p className="mt-1 text-sm text-gray-500 max-w-xs">{error}</p>
             <button
               onClick={() => loadQuestoes(currentPage)}
               className="mt-6 inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
             >
               Recarregar Página
             </button>
           </div>
        ) : questoes.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-80 text-center px-4 bg-slate-50/50">
            <div className="bg-slate-200 p-4 rounded-full mb-4">
              <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhuma questão no sistema</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-xs">O banco de dados está vazio ou os filtros ocultaram os resultados.</p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-6 inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
              >
                Cadastrar Primeira Questão
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {questoes.map((questao) => (
              <li key={questao.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-start gap-6 font-sans">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 leading-snug line-clamp-3 mb-2" title={questao.enunciado}>
                      {questao.enunciado}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded tabular-nums">ID #{questao.id}</span>
                      {questao.anulada && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">Anulada</span>}
                      {questao.desatualizada && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Desatualizada</span>}
                      <span className="text-xs text-gray-500">
                        <span className="font-bold text-gray-400 mr-1 uppercase">Cargos:</span>
                        <span className="truncate">
                          {(questao.cargos || []).map(cargo => `${cargo.nome} (${formatNivel(cargo.nivel)})`).join(' · ')}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="hidden lg:flex flex-col flex-shrink-0 w-64 text-right">
                    <div className="text-xs font-bold text-indigo-600 truncate uppercase tracking-tight">
                      {questao.concurso?.instituicaoNome || 'Sem Instituição'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                      <span className="font-mono tabular-nums">{questao.concurso ? questao.concurso.ano : '—'}</span> · {questao.concurso?.bancaNome || 'Banca pendente'}
                    </div>
                  </div>

                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(questao)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(questao.id!)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 font-sans">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => loadQuestoes(currentPage - 1)}
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
                onClick={() => loadQuestoes(currentPage + 1)}
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
                  onClick={() => loadQuestoes(currentPage - 1)}
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
                  onClick={() => loadQuestoes(currentPage + 1)}
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
