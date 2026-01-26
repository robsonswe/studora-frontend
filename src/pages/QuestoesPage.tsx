import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { questaoService, temaService, subtemaService, concursoService, alternativaService, imagemService } from '@/services/api';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoDto;
type TemaDto = Types.TemaDto;
type SubtemaDto = Types.SubtemaDto;
type ConcursoDto = Types.ConcursoDto;
type AlternativaDto = Types.AlternativaDto;
type ImagemDto = Types.ImagemDto;

const QuestoesPage = () => {
  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [imagens, setImagens] = useState<ImagemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestaoDto | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      concursoId: 0,
      enunciado: '',
      anulada: false,
      subtemaIds: [] as number[],
    }
  });

  const watchedFields = watch();

  const [alternativas, setAlternativas] = useState<AlternativaDto[]>([]);
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
    Promise.all([
      loadQuestoes(),
      loadConcursos(),
      loadTemas(),
      loadSubtemas(),
      loadImagens()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const loadQuestoes = async () => {
    try {
      const data = await questaoService.getAll();
      setQuestoes(data);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
    }
  };

  const loadConcursos = async () => {
    try {
      const data = await concursoService.getAll();
      setConcursos(data);
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
    }
  };

  const loadTemas = async () => {
    try {
      const data = await temaService.getAll();
      setTemas(data);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
    }
  };

  const loadSubtemas = async () => {
    try {
      const data = await subtemaService.getAll();
      setSubtemas(data);
    } catch (error) {
      console.error('Erro ao carregar subtemas:', error);
    }
  };

  const loadImagens = async () => {
    try {
      const data = await imagemService.getAll();
      setImagens(data);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    }
  };

  const onSubmit = async (data: any) => {
    // Validation
    const errors: string[] = [];

    if (currentAlternativas.length < 2) {
      errors.push('A questão deve ter pelo menos 2 alternativas');
    }

    // Only validate correct alternative if the question is not marked as anulada
    if (!data.anulada) {
      const correctAlternativas = currentAlternativas.filter(a => a.correta);
      if (correctAlternativas.length === 0) {
        errors.push('Pelo menos uma alternativa deve ser marcada como correta');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear previous errors
    setValidationErrors([]);

    try {
      let savedQuestao: QuestaoDto;

      const formDataWithSubtemas = {
        ...data,
        subtemaIds: data.subtemaIds
      };

      if (editingItem) {
        // Update existing
        savedQuestao = await questaoService.update(editingItem.id!, { ...formDataWithSubtemas, id: editingItem.id });
        setQuestoes(questoes.map(q => q.id === savedQuestao.id ? savedQuestao : q));
      } else {
        // Create new
        savedQuestao = await questaoService.create(formDataWithSubtemas);
        setQuestoes([...questoes, savedQuestao]);
      }

      // Save alternatives if any
      if (currentAlternativas.length > 0) {
        // Assign order based on position in the array
        const alternativasWithOrder = currentAlternativas.map((alt, index) => ({
          ...alt,
          ordem: index + 1
        }));

        for (const alternativa of alternativasWithOrder) {
          if (alternativa.id) {
            // Update existing
            await alternativaService.update(alternativa.id, { ...alternativa, questaoId: savedQuestao.id! });
          } else {
            // Create new
            await alternativaService.create({ ...alternativa, questaoId: savedQuestao.id! });
          }
        }
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
    }
  };

  const handleEdit = async (item: QuestaoDto) => {
    setEditingItem(item);

    // Set form values using react-hook-form setValue
    setValue('concursoId', item.concursoId);
    setValue('enunciado', item.enunciado);
    setValue('anulada', item.anulada);
    setValue('subtemaIds', item.subtemaIds);

    // Load alternatives for this question
    try {
      const questaoAlternativas = await alternativaService.getByQuestao(item.id!);
      setCurrentAlternativas(questaoAlternativas);
    } catch (error) {
      console.error('Erro ao carregar alternativas:', error);
      setCurrentAlternativas([]);
    }

    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      try {
        await questaoService.delete(id);
        setQuestoes(questoes.filter(q => q.id !== id));
      } catch (error) {
        console.error('Erro ao excluir questão:', error);
      }
    }
  };

  const resetForm = () => {
    reset({
      concursoId: 0,
      enunciado: '',
      anulada: false,
      subtemaIds: []
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
  };

  // Alternativas management
  const adicionarAlternativa = () => {
    // Validate that the text field is filled before adding
    if (!novaAlternativa.texto.trim()) {
      setAlternativeErrors('O campo texto da alternativa é obrigatório');
      return;
    }

    setAlternativeErrors(''); // Clear error message
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

  const atualizarAlternativa = (index: number, campo: keyof AlternativaDto, valor: any) => {
    const novasAlternativas = [...currentAlternativas];
    (novasAlternativas[index] as any)[campo] = valor;
    setCurrentAlternativas(novasAlternativas);
  };

  // Reorder alternatives
  const moverAlternativaParaCima = (index: number) => {
    if (index === 0) return; // Already at the top

    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index - 1]] =
      [novasAlternativas[index - 1], novasAlternativas[index]];

    setCurrentAlternativas(novasAlternativas);
  };

  const moverAlternativaParaBaixo = (index: number) => {
    if (index === currentAlternativas.length - 1) return; // Already at the bottom

    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index + 1]] =
      [novasAlternativas[index + 1], novasAlternativas[index]];

    setCurrentAlternativas(novasAlternativas);
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

              <div className="sm:col-span-2">
                <label htmlFor="concursoId" className="block text-sm font-medium text-gray-700 mb-1">
                  Concurso
                </label>
                <Select
                  id="concursoId"
                  options={concursos.map(concurso => ({
                    value: concurso.id,
                    label: `${concurso.ano} - ${concurso.banca} - ${concurso.nome}`
                  }))}
                  value={{
                    value: watchedFields.concursoId,
                    label: concursos.find(c => c.id === watchedFields.concursoId)?.ano +
                           " - " +
                           concursos.find(c => c.id === watchedFields.concursoId)?.banca +
                           " - " +
                           concursos.find(c => c.id === watchedFields.concursoId)?.nome
                  } || null}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setValue('concursoId', selectedOption.value);
                    }
                  }}
                  placeholder="Selecione ou digite para pesquisar..."
                  isClearable
                  isSearchable
                />
                {errors.concursoId && <p className="mt-1 text-sm text-red-600">{errors.concursoId.message}</p>}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtemas
                </label>
                <Select
                  id="subtemaIds"
                  isMulti
                  options={subtemas.map(subtema => {
                    const tema = temas.find(t => t.id === subtema.temaId);
                    return {
                      value: subtema.id,
                      label: `${tema?.nome} - ${subtema.nome}`
                    };
                  })}
                  value={watchedFields.subtemaIds.map(id => {
                    const subtema = subtemas.find(s => s.id === id);
                    const tema = subtema ? temas.find(t => t.id === subtema.temaId) : null;
                    return {
                      value: id,
                      label: `${tema?.nome} - ${subtema?.nome}`
                    };
                  })}
                  onChange={(selectedOptions) => {
                    const selectedIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
                    setValue('subtemaIds', selectedIds);
                  }}
                  placeholder="Selecione os subtemas..."
                  isClearable
                  isSearchable
                />
              </div>

              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anulada"
                    {...register('anulada')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="anulada" className="ml-2 text-sm text-gray-700">
                    Questão anulada
                  </label>
                </div>
              </div>

              {/* Images for the question */}
              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Imagens da Questão</h4>
                <div className="border border-gray-200 rounded-md p-4">
                  <p className="text-sm text-gray-500">Funcionalidade para adicionar imagens à questão em desenvolvimento...</p>
                </div>
              </div>

              {/* Alternativas Section */}
              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Alternativas</h4>

                {/* Form to add new alternative */}
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
                    <label htmlFor="justificativa" className="block text-sm font-medium text-gray-700 mb-1">
                      Justificativa
                    </label>
                    <textarea
                      id="justificativa"
                      rows={2}
                      value={novaAlternativa.justificativa || ''}
                      onChange={(e) => setNovaAlternativa({...novaAlternativa, justificativa: e.target.value})}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                  </div>
                </div>

                {/* List of alternatives */}
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
                              index === 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700'
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
                              index === currentAlternativas.length - 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700'
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

              {/* Images for alternatives section */}
              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Imagens das Alternativas</h4>
                <div className="border border-gray-200 rounded-md p-4">
                  <p className="text-sm text-gray-500">Funcionalidade para adicionar imagens às alternativas em desenvolvimento...</p>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </p>
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
          {questoes.map((questao) => {
            const concurso = concursos.find(c => c.id === questao.concursoId);
            return (
              <li key={questao.id}>
                <div className="px-4 py-4 sm:px-6 flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-indigo-600 truncate max-w-2xl">
                      {questao.enunciado.substring(0, 100)}{questao.enunciado.length > 100 ? '...' : ''}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {concurso?.nome || 'Concurso não encontrado'}
                      {questao.anulada && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Anulada
                      </span>}
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

export default QuestoesPage;