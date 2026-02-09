import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  Play, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Award,
  HelpCircle,
  Tag,
  FileText
} from 'lucide-react';

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
    if (!currentQuestion || !selectedAlternativa || !justificativa.trim()) return;

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

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderColor: '#e5e7eb',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#6366f1'
      },
      paddingTop: '2px',
      paddingBottom: '2px',
      borderRadius: '0.5rem',
    }),
    placeholder: (base: any) => ({
      ...base,
      fontSize: '0.875rem',
      color: '#9ca3af',
    })
  };

  // --- Render Setup Mode ---
  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header title="Praticar Questões" subtitle="Configure sua sessão de estudos" />
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center text-white">
                <Filter className="w-5 h-5 mr-2" />
                <h2 className="text-lg font-bold">Filtros da Sessão</h2>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Disciplina</label>
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
                    placeholder="Selecione..."
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tema</label>
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
                    placeholder="Selecione..."
                    isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0}
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtema</label>
                  <AsyncSelect
                    key={`subtema-${watchedFields.selectedTema?.value}`}
                    cacheOptions
                    defaultOptions
                    loadOptions={loadSubtemaOptions}
                    value={watchedFields.selectedSubtema}
                    onChange={(val) => setValue('selectedSubtema', val)}
                    placeholder="Selecione..."
                    isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0}
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banca</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadBancaOptions}
                    value={watchedFields.selectedBanca}
                    onChange={(val) => setValue('selectedBanca', val)}
                    placeholder="Todas..."
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Instituição</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadInstituicaoAreaOptions}
                    value={watchedFields.selectedInstituicaoArea}
                    onChange={(val) => setValue('selectedInstituicaoArea', val)}
                    placeholder="Todas..."
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Cargo</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadCargoAreaOptions}
                    value={watchedFields.selectedCargoArea}
                    onChange={(val) => setValue('selectedCargoArea', val)}
                    placeholder="Todas..."
                    isClearable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nível</label>
                  <Select
                    options={[
                      { value: '', label: 'Todos' },
                      { value: 'FUNDAMENTAL', label: 'Fundamental' },
                      { value: 'MEDIO', label: 'Médio' },
                      { value: 'SUPERIOR', label: 'Superior' },
                    ]}
                    value={
                      watchedFields.selectedCargoNivel
                        ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) }
                        : { value: '', label: 'Todos' }
                    }
                    onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                    placeholder="Selecione..."
                    styles={selectStyles}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={fetchRandomQuestion}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transform transition-all hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Buscando Questão...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2 fill-current" />
                      Iniciar Prática
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Practice Mode ---
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const concurso = currentQuestion.concurso;
  const isVerifyDisabled = !selectedAlternativa || !justificativa.trim();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Praticar Questões" subtitle="Modo de Estudo Focado" />
      
      {/* Sticky Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{formatTime(secondsElapsed)}</span>
          </div>
          
          <button
            onClick={() => setMode('setup')}
            className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center transition-colors"
          >
            <Filter className="w-4 h-4 mr-1" />
            Alterar Filtros
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          
          {/* Card Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {concurso?.bancaNome || 'Banca'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    {concurso?.ano || 'Ano'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 ml-1">
                    {concurso?.instituicaoNome}
                  </span>
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                   {(currentQuestion.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
                </div>
              </div>

              <div className="flex space-x-2 flex-shrink-0">
                {currentQuestion.anulada && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    ANULADA
                  </span>
                )}
                {currentQuestion.desatualizada && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                    DESATUALIZADA
                  </span>
                )}
                {!currentQuestion.anulada && !currentQuestion.desatualizada && (
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    #{currentQuestion.id}
                  </span>
                )}
              </div>
            </div>

            {/* Taxonomy/Topics */}
            <div className="pt-3 mt-1 border-t border-gray-200/60">
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs leading-relaxed text-gray-600">
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
                        
                        return (
                           <span key={disc} className="block mb-0.5 last:mb-0">
                             <span className="font-semibold text-gray-700">{disc}:</span> {temasStr}
                           </span>
                        );
                      });
                    })()}
                  </div>
                </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Body */}
            <div className="prose prose-indigo max-w-none text-gray-800 mb-8 font-serif leading-relaxed text-lg">
               <p className="whitespace-pre-line">{currentQuestion.enunciado}</p>
            </div>

            {/* Image */}
            {currentQuestion.imageUrl && (
              <div className="mb-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2">
                <img src={currentQuestion.imageUrl} alt="Imagem da questão" className="max-w-full h-auto mx-auto rounded" />
              </div>
            )}

            {/* Alternatives */}
            <div className="space-y-3 mb-8">
              {displayAlternativas.map((alternativa) => {
                const isSelected = selectedAlternativa === alternativa.id;
                const isCorrect = alternativa.correta;
                const showFeedback = !!feedback;
                
                let containerClass = "group relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ";
                let badgeClass = "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ";
                
                if (showFeedback) {
                  if (isCorrect) {
                    containerClass += "bg-green-50 border-green-500 shadow-sm z-10 ";
                    badgeClass += "bg-green-500 text-white";
                  } else if (isSelected && !isCorrect) {
                    containerClass += "bg-red-50 border-red-500 shadow-sm z-10 ";
                    badgeClass += "bg-red-500 text-white";
                  } else {
                    containerClass += "bg-white border-gray-100 opacity-60 grayscale-[0.5] ";
                    badgeClass += "bg-gray-100 text-gray-400";
                  }
                } else {
                  if (isSelected) {
                    containerClass += "bg-indigo-50 border-indigo-600 shadow-md transform scale-[1.01] ";
                    badgeClass += "bg-indigo-600 text-white";
                  } else {
                    containerClass += "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50 ";
                    badgeClass += "bg-white border-2 border-gray-300 text-gray-500 group-hover:border-indigo-400 group-hover:text-indigo-500";
                  }
                }

                return (
                  <div 
                    key={alternativa.id} 
                    className={containerClass}
                    onClick={() => !showFeedback && setSelectedAlternativa(alternativa.id!)}
                  >
                    <div className="flex-shrink-0 flex items-center pt-0.5">
                      <span className={badgeClass}>
                        {String.fromCharCode(64 + alternativa.ordem)}
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className={`text-base ${showFeedback && isCorrect ? 'font-medium text-green-900' : 'text-gray-700'}`}>
                        {alternativa.texto}
                      </div>
                      
                      {showFeedback && (
                        <div className="mt-3 animate-fade-in">
                          {(isCorrect || (isSelected && !isCorrect)) && (
                            <div className={`flex items-start text-sm p-3 rounded-lg mb-2 ${isCorrect ? 'bg-green-100/50 text-green-800' : 'bg-red-100/50 text-red-800'}`}>
                              {isCorrect ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                              <div>
                                <strong className="block mb-1">{isCorrect ? 'Gabarito' : 'Incorreta'}</strong>
                                {alternativa.justificativa}
                              </div>
                            </div>
                          )}
                          {!isCorrect && !isSelected && alternativa.justificativa && (
                            <div className="text-sm text-gray-500 mt-1 pl-3 border-l-2 border-gray-300 italic">
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

            <div className="mt-8 border-t border-gray-100 pt-8">
              {!feedback ? (
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 animate-fade-in">
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Justificativa obrigatória
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Por que você escolheu esta alternativa?
                      </label>
                      <textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        className="w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm border-gray-300 rounded-lg p-3 bg-white"
                        rows={3}
                        placeholder="Descreva seu raciocínio aqui..."
                      />
                      {!justificativa.trim() && selectedAlternativa && (
                        <p className="mt-2 text-xs text-indigo-600 font-medium italic animate-pulse">
                          * Escreva uma justificativa para habilitar o botão.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Dificuldade percebida
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: 1, label: 'Fácil', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                          { val: 2, label: 'Média', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                          { val: 3, label: 'Difícil', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                          { val: 4, label: 'Chute', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setDificuldade(opt.val)}
                            className={`px-3 py-2 text-sm font-bold uppercase rounded-lg border transition-all ${
                              dificuldade === opt.val 
                                ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-offset-1 ring-indigo-400` 
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
                      disabled={isVerifyDisabled}
                      className={`inline-flex items-center px-8 py-3 border border-transparent text-base font-bold rounded-lg shadow-sm text-white transition-all ${
                        isVerifyDisabled 
                          ? 'bg-gray-300 cursor-not-allowed opacity-60' 
                          : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      Verificar Resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                       <h4 className="font-bold text-gray-700 flex items-center">
                          <Award className="w-5 h-5 mr-2 text-indigo-500" />
                          Resumo do Resultado
                       </h4>
                       <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${feedback.correta ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {feedback.correta ? 'Acertou!' : 'Errou'}
                       </span>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
                           <div>
                              <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Tempo</span>
                              <span className="font-mono text-lg font-medium text-gray-900">{formatTime(feedback.tempoRespostaSegundos)}</span>
                           </div>
                           <div>
                              <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Dificuldade</span>
                              <span className="text-lg font-medium text-gray-900">{formatDificuldade(feedback.dificuldade)}</span>
                           </div>
                           <div>
                              <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Data</span>
                              <span className="text-lg font-medium text-gray-900">{formatDateTime(new Date().toISOString())}</span>
                           </div>
                        </div>
                        
                        {feedback.justificativa && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                             <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Minha Justificativa</span>
                             <p className="text-gray-700 italic bg-gray-50 p-3 rounded-lg border border-gray-100">"{feedback.justificativa}"</p>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={fetchRandomQuestion}
                      className="inline-flex items-center px-8 py-3 border border-transparent text-base font-bold rounded-lg shadow-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all hover:-translate-y-0.5"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Próxima Questão
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