import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { formatNivel } from '@/utils/formatters';
import { useStudora } from '@/context/StudoraContext';
import { questaoService, concursoService, subtemaService, cargoService } from '@/services/api';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoSummaryDto;
type AlternativaDto = Types.AlternativaDto;

const QuestoesPage = () => {
  const { 
    loading: contextLoading,
    refreshQuestoes
  } = useStudora();

  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestaoDto | null>(null);
  const [availableCargos, setAvailableCargos] = useState<Types.CargoSummaryDto[]>([]); 
  const [localLoading, setLocalLoading] = useState(false);

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

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [alternativeErrors, setAlternativeErrors] = useState<string>('');

  useEffect(() => {
    loadQuestoes();
  }, []);

  const loadQuestoes = async () => {
    setLocalLoading(true);
    try {
      const data = await questaoService.getAll({ size: 100 });
      setQuestoes(data.content);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Update available cargos when concurso changes
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

      await loadQuestoes();
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
        setQuestoes(questoes.filter(q => q.id !== id));
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

  // Alternativas management
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

  if (contextLoading.all && questoes.length === 0) {
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
      </div>
    </div>
  );
};

export default QuestoesPage;