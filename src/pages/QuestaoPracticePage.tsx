import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade } from '@/utils/formatters';
import * as Types from '@/types';

type QuestaoDto = Types.QuestaoDetailDto;
type RespostaDto = Types.RespostaDetailDto;

type PracticeMode = 'setup' | 'practice';

const QuestaoPracticePage = () => {
  const [mode, setMode] = useState<PracticeMode>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Question State
  const [currentQuestion, setCurrentQuestion] = useState<QuestaoDto | null>(null);
  const [selectedAlternativa, setSelectedAlternativa] = useState<number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [dificuldade, setDificuldade] = useState(2);
  
  // Feedback State
  const [feedback, setFeedback] = useState<RespostaDto | null>(null);
  const [displayAlternativas, setDisplayAlternativas] = useState<Types.AlternativaDto[]>([]);

  // Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter Form
  const { setValue, watch, getValues } = useForm({
    defaultValues: {
      selectedDisciplina: { value: 0, label: 'Todas as disciplinas' } as { value: number, label: string } | null,
      selectedTema: { value: 0, label: 'Todos os temas' } as { value: number, label: string } | null,
      selectedSubtema: { value: 0, label: 'Todos os subtemas' } as { value: number, label: string } | null,
      selectedBanca: { value: 0, label: 'Todas as bancas' } as { value: number, label: string } | null,
      selectedInstituicaoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoNivel: ''
    }
  });

  const watchedFields = watch();

  // --- Timer Logic ---
  useEffect(() => {
    if (mode === 'practice' && currentQuestion && !feedback) {
      setSecondsElapsed(0);
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, currentQuestion, feedback]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Fetch Logic ---
  const fetchRandomQuestion = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    setSelectedAlternativa(null);
    setJustificativa('');
    setDificuldade(2);
    setCurrentQuestion(null);

    try {
      const filters = getValues();
      const params: any = {
        disciplinaId: (filters.selectedDisciplina && filters.selectedDisciplina.value !== 0) ? filters.selectedDisciplina.value : undefined,
        temaId: (filters.selectedTema && filters.selectedTema.value !== 0) ? filters.selectedTema.value : undefined,
        subtemaId: (filters.selectedSubtema && filters.selectedSubtema.value !== 0) ? filters.selectedSubtema.value : undefined,
        bancaId: (filters.selectedBanca && filters.selectedBanca.value !== 0) ? filters.selectedBanca.value : undefined,
        instituicaoArea: (filters.selectedInstituicaoArea && filters.selectedInstituicaoArea.value !== '') ? filters.selectedInstituicaoArea.value : undefined,
        cargoArea: (filters.selectedCargoArea && filters.selectedCargoArea.value !== '') ? filters.selectedCargoArea.value : undefined,
        cargoNivel: filters.selectedCargoNivel || undefined,
        anulada: false 
      };

      const question = await questaoService.getRandom(params);
      const alternatives = [...question.alternativas].sort((a, b) => a.ordem - b.ordem);
      
      setCurrentQuestion(question);
      setDisplayAlternativas(alternatives);
      setMode('practice');
    } catch (err: any) {
      console.error('Erro ao buscar questão:', err);
      setError(err.message || 'Não foi possível encontrar uma questão com os filtros selecionados.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!currentQuestion || !selectedAlternativa) return;

    if (!justificativa.trim()) {
      alert('Por favor, preencha a justificativa antes de verificar a resposta.');
      return;
    }

    try {
      const response = await respostaService.create({
        questaoId: currentQuestion.id,
        alternativaId: selectedAlternativa,
        justificativa: justificativa,
        dificuldadeId: dificuldade,
        tempoRespostaSegundos: secondsElapsed
      });

      setFeedback(response);
      
      if (response.alternativas) {
        const enrichedAlts = response.alternativas;
        const newDisplay = displayAlternativas.map(displayed => {
          const enriched = enrichedAlts.find(a => a.id === displayed.id);
          return enriched || displayed;
        });
        setDisplayAlternativas(newDisplay);
      }

      if (timerRef.current) clearInterval(timerRef.current);

    } catch (err) {
      console.error('Erro ao verificar resposta:', err);
      alert('Erro ao enviar resposta. Tente novamente.');
    }
  };

  // --- Filter Options Loaders ---
  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    const options = data.content.map(b => ({ value: b.id, label: b.nome }));
    return [{ value: 0, label: 'Todas as bancas' }, ...options];
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    const options = data.content.map(d => ({ value: d.id, label: d.nome }));
    return [{ value: 0, label: 'Todas as disciplinas' }, ...options];
  };

  const loadTemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) {
      const data = await temaService.getByDisciplina(watchedFields.selectedDisciplina.value);
      const options = data
        .map(t => ({ value: t.id, label: t.nome }))
        .filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
      return [{ value: 0, label: 'Todos os temas' }, ...options];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getByTema(watchedFields.selectedTema.value);
      const options = data
        .map(s => ({ value: s.id, label: s.nome }))
        .filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
      return [{ value: 0, label: 'Todos os subtemas' }, ...options];
    }
    return [{ value: 0, label: 'Todos os subtemas' }];
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    const options = areas.map(area => ({ value: area, label: area }));
    return [{ value: '', label: 'Todas as áreas' }, ...options];
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    const options = areas.map(area => ({ value: area, label: area }));
    return [{ value: '', label: 'Todas as áreas' }, ...options];
  };

  // --- Render Setup Mode ---
  if (mode === 'setup') {
    return (
      <div>
        <Header title="Praticar Questões" />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6 border-b pb-2">Selecione seus filtros</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadDisciplinaOptions}
                  value={watchedFields.selectedDisciplina}
                  onChange={(val) => {
                    setValue('selectedDisciplina', val);
                    setValue('selectedTema', { value: 0, label: 'Todos os temas' });
                    setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                  }}
                  placeholder="Busque..."
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                <AsyncSelect
                  key={`tema-${watchedFields.selectedDisciplina?.value}`}
                  cacheOptions
                  defaultOptions
                  loadOptions={loadTemaOptions}
                  value={watchedFields.selectedTema}
                  onChange={(val) => {
                    setValue('selectedTema', val);
                    setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                  }}
                  placeholder="Busque..."
                  isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0}
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtema</label>
                <AsyncSelect
                  key={`subtema-${watchedFields.selectedTema?.value}`}
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  value={watchedFields.selectedSubtema}
                  onChange={(val) => setValue('selectedSubtema', val)}
                  placeholder="Busque..."
                  isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0}
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banca</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={watchedFields.selectedBanca}
                  onChange={(val) => setValue('selectedBanca', val)}
                  placeholder="Busque..."
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área da Instituição</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  placeholder="Busque..."
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área do Cargo</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  placeholder="Busque..."
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível do Cargo</label>
                <Select
                  options={[
                    { value: '', label: 'Todos os níveis' },
                    { value: 'FUNDAMENTAL', label: 'Fundamental' },
                    { value: 'MEDIO', label: 'Médio' },
                    { value: 'SUPERIOR', label: 'Superior' },
                  ]}
                  value={
                    watchedFields.selectedCargoNivel
                      ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) }
                      : { value: '', label: 'Todos os níveis' }
                  }
                  onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                  placeholder="Selecione..."
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={fetchRandomQuestion}
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Iniciar Prática'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Practice Mode ---
  if (!currentQuestion) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const concurso = currentQuestion.concurso;

  return (
    <div>
      <Header title="Praticar Questões" />
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white shadow rounded-lg p-4 mb-4 flex justify-between items-center sticky top-4 z-10 border-l-4 border-indigo-500">
          <div className="text-gray-700 font-medium">
            Tempo: <span className="text-indigo-600 font-bold font-mono text-xl ml-2">{formatTime(secondsElapsed)}</span>
          </div>
          <button
            onClick={() => setMode('setup')}
            className="text-sm text-gray-500 hover:text-indigo-600 underline"
          >
            Alterar Filtros
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                  {concurso ? `${concurso.ano} - ${concurso.instituicaoNome} - ${concurso.bancaNome}` : `Questão ${currentQuestion.id}`}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Cargos: {(currentQuestion.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
                </p>
              </div>
              <div className="flex space-x-2">
                {currentQuestion.anulada && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Anulada
                  </span>
                )}
                {currentQuestion.desatualizada && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Desatualizada
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="prose max-w-none text-gray-800 mb-6">
              {currentQuestion.imageUrl && (
                <div className="mb-4">
                  <img src={currentQuestion.imageUrl} alt="Imagem da questão" className="max-w-full h-auto rounded shadow-sm" />
                </div>
              )}
              <p className="whitespace-pre-line leading-relaxed text-lg">{currentQuestion.enunciado}</p>
            </div>

            <div className="text-xs text-gray-400 mb-6 border-t pt-2">
              {(() => {
                const grouped: Record<string, Record<string, string[]>> = {};
                (currentQuestion.subtemas || []).forEach(st => {
                  if (!grouped[st.disciplinaNome]) grouped[st.disciplinaNome] = {};
                  if (!grouped[st.disciplinaNome][st.temaNome]) grouped[st.disciplinaNome][st.temaNome] = [];
                  grouped[st.disciplinaNome][st.temaNome].push(st.nome);
                });
                return Object.entries(grouped).map(([disc, temasMap]) => {
                  const temasStr = Object.entries(temasMap).map(([tema, subtemaNomes]) => {
                    return `${tema} (${subtemaNomes.join(', ')})`;
                  }).join(' | ');
                  return `${disc}: ${temasStr}`;
                }).join('; ');
              })()}
            </div>

            <div className="space-y-3">
              {displayAlternativas.map((alternativa) => {
                const isSelected = selectedAlternativa === alternativa.id;
                const isCorrect = alternativa.correta;
                const showFeedback = !!feedback;
                
                let containerClass = "relative flex items-start p-4 cursor-pointer rounded-lg border transition-all duration-200 ";
                
                if (showFeedback) {
                  if (isCorrect) {
                    containerClass += "bg-green-50 border-green-500 shadow-sm";
                  } else if (isSelected && !isCorrect) {
                    containerClass += "bg-red-50 border-red-500 shadow-sm";
                  } else {
                    containerClass += "bg-white border-gray-200 opacity-60";
                  }
                } else {
                  if (isSelected) {
                    containerClass += "bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500";
                  } else {
                    containerClass += "bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400";
                  }
                }

                return (
                  <div 
                    key={alternativa.id} 
                    className={containerClass}
                    onClick={() => !showFeedback && setSelectedAlternativa(alternativa.id!)}
                  >
                    <div className="flex items-center h-5">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                        showFeedback
                          ? isCorrect 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : isSelected 
                              ? 'bg-red-500 border-red-500 text-white' 
                              : 'border-gray-300'
                          : isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-gray-400 text-gray-500'
                      }`}>
                        {String.fromCharCode(64 + alternativa.ordem)}
                      </div>
                    </div>
                    <div className="ml-3 text-base text-gray-700 w-full">
                      <span className={showFeedback && isCorrect ? 'font-semibold text-green-900' : ''}>
                        {alternativa.texto}
                      </span>
                      
                      {showFeedback && (
                        <div className="mt-2">
                          {(isCorrect || (isSelected && !isCorrect)) && (
                            <div className={`text-sm rounded p-2 ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              <strong>{isCorrect ? 'Correta!' : 'Incorreta.'}</strong> 
                              {alternativa.justificativa && <span className="ml-1">{alternativa.justificativa}</span>}
                            </div>
                          )}
                          {!isCorrect && !isSelected && alternativa.justificativa && (
                            <div className="text-sm text-gray-500 mt-1 pl-1 border-l-2 border-gray-300">
                              {alternativa.justificativa}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t pt-6">
              {!feedback ? (
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Justificativa
                      </label>
                      <textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        className="w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Por que você escolheu esta alternativa?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Dificuldade
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 1, label: 'Fácil', color: 'bg-green-100 text-green-800 border-green-200' },
                          { val: 2, label: 'Média', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                          { val: 3, label: 'Difícil', color: 'bg-orange-100 text-orange-800 border-orange-200' },
                          { val: 4, label: 'Chute', color: 'bg-red-100 text-red-800 border-red-200' }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setDificuldade(opt.val)}
                            className={`px-3 py-2 text-sm font-medium rounded-md border ${
                              dificuldade === opt.val 
                                ? `ring-2 ring-offset-1 ring-indigo-500 ${opt.color}` 
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleVerify}
                      disabled={!selectedAlternativa}
                      className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        !selectedAlternativa ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      Verificar Resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100 mb-6">
                    <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-3">Resumo da Tentativa</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border border-indigo-100">
                        <span className="block text-gray-500 text-xs uppercase">Tempo</span>
                        <span className="font-mono font-medium text-gray-900">{formatTime(feedback.tempoRespostaSegundos)}</span>
                      </div>
                      <div className="bg-white p-3 rounded border border-indigo-100">
                        <span className="block text-gray-500 text-xs uppercase">Dificuldade</span>
                        <span className="font-medium text-gray-900">{formatDificuldade(feedback.dificuldade)}</span>
                      </div>
                      <div className="bg-white p-3 rounded border border-indigo-100">
                        <span className="block text-gray-500 text-xs uppercase">Resultado</span>
                        <span className={`font-bold ${feedback.correta ? 'text-green-600' : 'text-red-600'}`}>
                          {feedback.correta ? 'ACERTOU' : 'ERROU'}
                        </span>
                      </div>
                    </div>
                    {feedback.justificativa && (
                      <div className="mt-4 bg-white p-3 rounded border border-indigo-100">
                        <span className="block text-gray-500 text-xs uppercase mb-1">Minha Justificativa</span>
                        <p className="text-gray-800">{feedback.justificativa}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setMode('setup')}
                      className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                    >
                      &larr; Voltar aos Filtros
                    </button>
                    <button
                      onClick={fetchRandomQuestion}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Próxima Questão &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestaoPracticePage;