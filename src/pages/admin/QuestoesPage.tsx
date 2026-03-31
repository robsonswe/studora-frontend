import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { formatNivel } from '@/utils/formatters';
import { questaoService, concursoService, subtemaService } from '@/services/api';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoSummaryDto;
type AlternativaDto = Types.AlternativaDto;

const QuestoesPage = () => {
  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestaoDto | null>(null);
  const [availableCargos, setAvailableCargos] = useState<Types.CargoSummaryDto[]>([]); 
  const [localLoading, setLocalLoading] = useState(false);
  const [loading, setLoading] = useState(true);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await questaoService.getAll({ page, size: 20 });
      setQuestoes(data.content);
      setPagination(data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
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
          setAvailableCargos(detail.cargos);
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
    } catch (error: any) {
      console.error('Erro ao salvar questão:', error);
      setValidationErrors([error.message || 'Erro inesperado ao salvar questão']);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = async (item: QuestaoDto) => {
    setLocalLoading(true);
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
        label: `${s.disciplinaNome} - ${s.temaNome} - ${s.nome}`
      })));
      
      setValue('cargos', detail.cargoIds || detail.cargos.map(c => c.id));
      setValue('imageUrl', detail.imageUrl || '');

      setCurrentAlternativas([...detail.alternativas].sort((a, b) => a.ordem - b.ordem));
      setShowForm(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes da questão:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      setLocalLoading(true);
      try {
        await questaoService.delete(id);
        await loadQuestoes(currentPage);
      } catch (error) {
        console.error('Erro ao excluir questão:', error);
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

  if (loading && questoes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Questões"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Nova Questão
          </button>
        }
      />

      {showForm && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
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
                  cacheOptions
                  defaultOptions
                  loadOptions={loadConcursoOptions}
                  value={watchedFields.concurso}
                  onChange={(val) => {
                    setValue('concurso', val);
                    setValue('cargos', []);
                  }}
                  placeholder="Busque por concurso..."
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargos do Concurso
                </label>
                <Select
                  id="cargos"
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
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtemas
                </label>
                <AsyncSelect
                  id="subtemas"
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  value={watchedFields.subtemas}
                  onChange={(val) => setValue('subtemas', val as any)}
                  placeholder="Busque por subtemas..."
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
                <div className="flex items-center space-x-4">
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

              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Alternativas</h4>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-12">
                    <div className="sm:col-span-8">
                      <label htmlFor="texto" className="block text-sm font-medium text-gray-700 mb-1">
                        Texto
                      </label>
                      <input
                        type="text"
                        id="texto"
                        value={novaAlternativa.texto}
                        onChange={(e) => setNovaAlternativa({...novaAlternativa, texto: e.target.value})}
                        className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border ${
                          alternativeErrors ? 'border-red-500' : ''
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center pt-5">
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
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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

                  <div className="mt-3">
                    <label htmlFor="justificativa_alt" className="block text-sm font-medium text-gray-700 mb-1">
                      Justificativa
                    </label>
                    <textarea
                      id="justificativa_alt"
                      rows={2}
                      value={novaAlternativa.justificativa || ''}
                      onChange={(e) => setNovaAlternativa({...novaAlternativa, justificativa: e.target.value})}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {currentAlternativas.map((alternativa, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-md p-4">
                      <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-12">
                        <div className="sm:col-span-1">
                          <span className="font-medium">#{index + 1}</span>
                        </div>
                        <div className="sm:col-span-6">
                          <div>{alternativa.texto}</div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alternativa.correta ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alternativa.correta ? 'Correta' : 'Incorreta'}
                          </div>
                        </div>
                        <div className="sm:col-span-3 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaCima(index)}
                            disabled={index === 0}
                            className={`inline-flex items-center p-1 border border-transparent rounded-md ${
                              index === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaBaixo(index)}
                            disabled={index === currentAlternativas.length - 1}
                            className={`inline-flex items-center p-1 border border-transparent rounded-md ${
                              index === currentAlternativas.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removerAlternativa(index)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      {alternativa.justificativa && (
                        <div className="mt-2 pl-4">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Justificativa:</span> {alternativa.justificativa}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {localLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {questoes.map((questao) => (
            <li key={questao.id}>
              <div className="px-4 py-4 sm:px-6 flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-indigo-600 truncate max-w-2xl">
                    {questao.enunciado.substring(0, 100)}{questao.enunciado.length > 100 ? '...' : ''}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {questao.concurso ? `${questao.concurso.ano} - ${questao.concurso.instituicaoNome} - ${questao.concurso.bancaNome}` : `Questão ${questao.id}`}
                    {questao.anulada && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Anulada</span>}
                    {questao.desatualizada && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Desatualizada</span>}
                  </div>
                  <div className="text-xs text-indigo-400 mt-1">
                    Cargos: {(questao.cargos || []).map(cargo => `${cargo.nome} - ${cargo.area} (${formatNivel(cargo.nivel)})`).join(', ')}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(questao)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(questao.id!)}
                    disabled={localLoading}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
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
                    onClick={() => loadQuestoes(currentPage - 1)}
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
                          onClick={() => loadQuestoes(page)}
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
                    onClick={() => loadQuestoes(currentPage + 1)}
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

export default QuestoesPage;
