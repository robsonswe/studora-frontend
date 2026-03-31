import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { simuladoService, respostaService } from '@/services/api';
import { formatDificuldade, formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  HelpCircle,
  Award,
  FileText,
  User
} from 'lucide-react';

const SimuladoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = Number(id);
  
  // Data State
  const [simulado, setSimulado] = useState<Types.SimuladoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startAttemptedRef = useRef(false);
  
  // Question State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAlternativa, setSelectedAlternativa] = useState<number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [dificuldade, setDificuldade] = useState(2);
  const [processingAnswer, setProcessingAnswer] = useState(false);

  // Timer State
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results Modal
  const [showResultsModal, setShowResultsModal] = useState(false);

  // --- Derived State helpers ---

  const isFinished = useMemo(() => {
    return !!simulado?.finishedAt;
  }, [simulado]);

  const currentQuestion = useMemo(() => {
    return simulado?.questoes[currentQuestionIndex];
  }, [simulado, currentQuestionIndex]);

  const currentResponse = useMemo(() => {
    if (!currentQuestion?.respostas) return null;
    return currentQuestion.respostas.find(r => r.simuladoId === numericId) || null;
  }, [currentQuestion, numericId]);

  const stats = useMemo(() => {
    if (!simulado?.questoes) return { total: 0, answered: 0, correct: 0 };
    let answered = 0;
    let correct = 0;
    simulado.questoes.forEach(q => {
      const resp = q.respostas?.find(r => r.simuladoId === numericId);
      if (resp) {
        answered++;
        if (resp.correta) correct++;
      }
    });
    return { total: simulado.questoes.length, answered, correct };
  }, [simulado, numericId]);

  // Validation Logic
  const isVerifyDisabled = !selectedAlternativa || !justificativa.trim() || processingAnswer;

  // --- Effects ---

  useEffect(() => {
    loadSimulado();
  }, [numericId]);

  useEffect(() => {
    const autoStart = async () => {
      if (simulado && !simulado.startedAt && !startAttemptedRef.current) {
        startAttemptedRef.current = true;
        try {
          const updatedSimulado = await simuladoService.iniciar(numericId);
          
          // Sort questions by discipline name and then by ID
          if (updatedSimulado.questoes) {
            updatedSimulado.questoes.sort((a, b) => {
              const discA = a.subtemas?.[0]?.disciplinaNome || 'Outros';
              const discB = b.subtemas?.[0]?.disciplinaNome || 'Outros';
              if (discA !== discB) return discA.localeCompare(discB);
              return a.id - b.id;
            });
          }

          setSimulado(updatedSimulado);
        } catch (err) {
          console.error('Erro ao iniciar simulado automaticamente:', err);
        }
      }
    };
    autoStart();
  }, [simulado, numericId]);

  useEffect(() => {
    if (currentQuestion) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (currentResponse) {
        setSelectedAlternativa(currentResponse.alternativaId);
        setJustificativa(currentResponse.justificativa || '');
        setDificuldade(
          currentResponse.dificuldade === 'FACIL' ? 1 : 
          currentResponse.dificuldade === 'MEDIA' ? 2 : 
          currentResponse.dificuldade === 'DIFICIL' ? 3 : 4
        );
      } else {
        setSelectedAlternativa(null);
        setJustificativa('');
        setDificuldade(2);
        setQuestionTimer(0);
      }
    }
  }, [currentQuestionIndex, currentResponse]);

  useEffect(() => {
    if (simulado && !isFinished && !currentResponse && !processingAnswer) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [simulado, isFinished, currentResponse, processingAnswer]);

  // --- Actions ---

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadSimulado = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await simuladoService.getById(numericId);
      
      // Sort questions by discipline name and then by ID
      if (data.questoes) {
        data.questoes.sort((a, b) => {
          const discA = a.subtemas?.[0]?.disciplinaNome || 'Outros';
          const discB = b.subtemas?.[0]?.disciplinaNome || 'Outros';
          if (discA !== discB) return discA.localeCompare(discB);
          return a.id - b.id;
        });
      }

      setSimulado(data);
    } catch (err: any) {
      console.error('Erro ao carregar simulado:', err);
      setError(err.message || 'Erro ao carregar simulado');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifyDisabled || !currentQuestion) return;

    try {
      setProcessingAnswer(true);
      const response = await respostaService.create({
        questaoId: currentQuestion.id,
        alternativaId: selectedAlternativa,
        justificativa: justificativa,
        dificuldadeId: dificuldade,
        tempoRespostaSegundos: questionTimer,
        simuladoId: simulado!.id
      });

      const updatedQuestions = simulado!.questoes.map(q => {
        if (q.id === currentQuestion.id) {
          return {
            ...q,
            alternativas: response.alternativas || q.alternativas,
            respostas: [...(q.respostas || []), response],
            respondida: true
          };
        }
        return q;
      });

      const allAnswered = updatedQuestions.every(q => 
        q.respostas?.some(r => r.simuladoId === numericId)
      );

      if (allAnswered) {
        try {
          const finishedSimulado = await simuladoService.finalizar(numericId);
          setSimulado(prev => prev ? ({
             ...prev,
             ...finishedSimulado,
             questoes: updatedQuestions
          }) : null);
          setShowResultsModal(true);
        } catch (finishErr) {
           setSimulado(prev => prev ? ({ ...prev, questoes: updatedQuestions, finishedAt: new Date().toISOString() }) : null);
           setShowResultsModal(true);
        }
      } else {
        setSimulado({ ...simulado!, questoes: updatedQuestions });
      }
    } catch (err) {
      console.error('Erro ao verificar resposta:', err);
      alert('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setProcessingAnswer(false);
    }
  };

  const handleNavigation = (direction: 'next' | 'prev') => {
    if (!simulado) return;
    if (direction === 'next' && currentQuestionIndex < simulado.questoes.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getQuestionStatusColor = (index: number) => {
    const q = simulado?.questoes[index];
    if (!q) return '';
    const isActive = index === currentQuestionIndex;
    const resp = q.respostas?.find(r => r.simuladoId === numericId);
    if (isActive) return 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1';
    if (!resp) return 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300';
    return resp.correta ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300';
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error || !simulado || !simulado.questoes || !currentQuestion) return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex"><AlertTriangle className="h-6 w-6 text-red-500 mr-3" /><p className="text-red-700 font-medium">{error || 'Simulado não encontrado'}</p></div>
        <button onClick={() => navigate('/simulados')} className="mt-4 text-sm text-red-600 font-semibold hover:underline">Voltar para lista</button>
      </div>
    </div>
  );

  const concurso = currentQuestion.concurso;
  const progressPercentage = (stats.answered / stats.total) * 100;
  const displayAlternativas = [...currentQuestion.alternativas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title={simulado.nome} subtitle={isFinished ? "Simulado Finalizado" : "Em Andamento"} />
      
      {/* Sticky Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm transition-all">
        <div className="w-full bg-gray-100 h-1.5">
          <div className={`h-1.5 transition-all duration-500 ease-out ${isFinished ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
           <div className="flex items-center space-x-3 text-sm text-gray-600 font-medium">
              <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-900 border border-gray-200">Questão {currentQuestionIndex + 1}</span>
              <span className="text-gray-400">/</span><span>{stats.total}</span>
           </div>
           <div className="flex items-center space-x-4">
              {isFinished && <span className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-semibold border border-green-100"><Award className="w-4 h-4 mr-2" />Nota: {Math.round((stats.correct / stats.total) * 100)}%</span>}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isFinished ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}><Clock className="w-4 h-4" /><span className="font-mono font-bold text-lg">{isFinished ? (currentResponse ? formatTime(currentResponse.tempoRespostaSegundos) : '--:--') : formatTime(questionTimer)}</span></div>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{concurso?.bancaNome}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">{concurso?.ano}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">{concurso?.instituicaoNome}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{(currentQuestion.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {currentQuestion.anulada && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Anulada</span>}
                  {currentQuestion.desatualizada && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Desatualizada</span>}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="prose prose-indigo max-w-none text-gray-800 mb-6 font-sans leading-relaxed text-lg"><p className="whitespace-pre-line">{currentQuestion.enunciado}</p></div>
                {currentQuestion.imageUrl && <div className="mb-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2"><img src={currentQuestion.imageUrl} alt="Imagem" className="max-w-full h-auto mx-auto rounded" /></div>}

                <div className="flex items-start space-x-2 text-xs text-gray-500 mb-8 p-3 bg-gray-50 rounded-lg border border-gray-100">
                   <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                   <div className="leading-relaxed">
                      {(() => {
                        const grouped: Record<string, Record<string, string[]>> = {};
                        (currentQuestion.subtemas || []).forEach(st => {
                          if (!grouped[st.disciplinaNome]) grouped[st.disciplinaNome] = {};
                          if (!grouped[st.disciplinaNome][st.temaNome]) grouped[st.disciplinaNome][st.temaNome] = [];
                          grouped[st.disciplinaNome][st.temaNome].push(st.nome);
                        });
                        return Object.entries(grouped).map(([disc, temasMap]) => (
                          <span key={disc} className="block mb-1 last:mb-0"><span className="font-semibold text-gray-700">{disc}:</span> {Object.entries(temasMap).map(([tema, subtemaNomes]) => `${tema} (${subtemaNomes.join(', ')})`).join(' | ')}</span>
                        ));
                      })()}
                   </div>
                </div>

                <div className="space-y-3">
                  {displayAlternativas.map((alternativa) => {
                    const isSelected = selectedAlternativa === alternativa.id;
                    const isCorrectAnswer = alternativa.correta === true; 
                    const showFeedback = !!currentResponse;
                    let baseClass = "group relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 ";
                    let badgeClass = "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ";
                    if (showFeedback) {
                      if (isCorrectAnswer) { baseClass += "bg-green-50 border-green-500 shadow-sm z-10 "; badgeClass += "bg-green-500 text-white"; }
                      else if (isSelected && !isCorrectAnswer) { baseClass += "bg-red-50 border-red-500 shadow-sm z-10 "; badgeClass += "bg-red-500 text-white"; }
                      else { baseClass += "bg-white border-gray-100 opacity-60 grayscale-[0.5] "; badgeClass += "bg-gray-100 text-gray-400"; }
                    } else {
                      if (isSelected) { baseClass += "bg-indigo-50 border-indigo-600 shadow-md transform scale-[1.01] "; badgeClass += "bg-indigo-600 text-white"; }
                      else { baseClass += "bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50 "; badgeClass += "bg-white border-2 border-gray-300 text-gray-500 group-hover:border-indigo-400 group-hover:text-indigo-500"; }
                    }
                    return (
                      <div key={alternativa.id} className={baseClass} onClick={() => !showFeedback && setSelectedAlternativa(alternativa.id!)}>
                        <div className="flex-shrink-0 flex items-center pt-0.5"><span className={badgeClass}>{String.fromCharCode(64 + alternativa.ordem)}</span></div>
                        <div className="ml-4 flex-1">
                          <div className={`text-base ${showFeedback && isCorrectAnswer ? 'font-medium text-green-900' : 'text-gray-700'}`}>{alternativa.texto}</div>
                          {showFeedback && (
                            <div className="animate-fade-in mt-3">
                              {(isCorrectAnswer || (isSelected && !isCorrectAnswer)) && (
                                <div className={`flex items-start text-sm p-3 rounded-lg ${isCorrectAnswer ? 'bg-green-100/50 text-green-800' : 'bg-red-100/50 text-red-800'}`}>
                                  {isCorrectAnswer ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                                  <div><strong className="block mb-1">{isCorrectAnswer ? 'Gabarito' : 'Incorreta'}</strong>{alternativa.justificativa}</div>
                                </div>
                              )}
                              {!isCorrectAnswer && !isSelected && alternativa.justificativa && (<div className="text-sm text-gray-500 mt-1 pl-3 border-l-2 border-gray-200 italic">{alternativa.justificativa}</div>)}
                            </div>
                          )}
                        </div>
                        {showFeedback && isSelected && (
                          <div className="absolute top-2 right-2">
                            <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase flex items-center shadow-sm">
                              <User className="w-2 h-2 mr-1" /> Sua Resposta
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-5 border-t border-gray-200">
                {!currentResponse ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center mb-2">
                           <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Justificativa Obrigatória</label>
                        </div>
                        <textarea
                          value={justificativa}
                          onChange={(e) => setJustificativa(e.target.value)}
                          className="w-full shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-lg p-4 bg-white transition-all"
                          rows={3}
                          placeholder="Descreva seu raciocínio para habilitar a resposta..."
                        />
                        {!justificativa.trim() && selectedAlternativa && (
                          <p className="mt-2 text-xs text-indigo-600 italic font-medium animate-pulse">* Escreva a justificativa para responder.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dificuldade Percebida</label>
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
                              className={`px-3 py-2.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                                dificuldade === opt.val 
                                  ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-offset-1 ring-indigo-400 shadow-sm` 
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleVerify}
                        disabled={isVerifyDisabled}
                        className={`inline-flex items-center px-10 py-3 border border-transparent text-base font-bold rounded-xl shadow-sm text-white transition-all ${isVerifyDisabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                        {processingAnswer ? 'Enviando...' : 'Responder'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm w-full sm:w-auto">
                        <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center">
                           <span className="text-gray-500 mr-2 uppercase text-xs font-bold">Sua Resposta:</span>
                           {currentResponse.correta ? <span className="text-green-600 font-bold flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Correta</span> : <span className="text-red-600 font-bold flex items-center"><XCircle className="w-4 h-4 mr-1"/> Incorreta</span>}
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center">
                           <span className="text-gray-500 mr-2 uppercase text-xs font-bold">Dificuldade:</span>
                           <span className="text-gray-800 font-medium">{formatDificuldade(currentResponse.dificuldade)}</span>
                        </div>
                     </div>
                     <div className="flex space-x-3 w-full sm:w-auto justify-end">
                        <button onClick={() => handleNavigation('prev')} disabled={currentQuestionIndex === 0} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</button>
                        <button onClick={() => handleNavigation('next')} disabled={currentQuestionIndex === simulado!.questoes.length - 1} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Próxima <ChevronRight className="w-4 h-4 ml-1" /></button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200 sticky top-24">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center justify-between">
                <span>Navegação</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isFinished ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'}`}>{isFinished ? 'Finalizado' : 'Em Progresso'}</span>
              </h4>
              <div className="space-y-6 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                {(() => {
                  const groups: { name: string, indices: number[] }[] = [];
                  simulado.questoes.forEach((q, index) => {
                    const discName = q.subtemas?.[0]?.disciplinaNome || 'Outros';
                    let group = groups.find(g => g.name === discName);
                    if (!group) {
                      group = { name: discName, indices: [] };
                      groups.push(group);
                    }
                    group.indices.push(index);
                  });

                  return groups.map(group => (
                    <div key={group.name} className="space-y-2">
                      <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1 mb-2 truncate" title={group.name}>
                        {group.name}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {group.indices.map((index) => (
                          <button 
                            key={index} 
                            onClick={() => setCurrentQuestionIndex(index)} 
                            className={`h-10 w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all ${getQuestionStatusColor(index)}`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-2"></span>Acertou</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></span>Errou</div>
                {!isFinished && <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300 mr-2"></span>Pendente</div>}
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></span>Atual</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {showResultsModal && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0" onClick={() => setShowResultsModal(false)}>
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-sm transition-all sm:my-8 sm:w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-8">
                  <div className="sm:flex sm:items-start justify-center">
                    <div className="mt-3 text-center sm:mt-0 sm:text-center w-full">
                      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6 ring-8 ring-green-50"><Award className="h-10 w-10 text-green-600" /></div>
                      <h3 className="text-2xl leading-6 font-bold text-gray-900 mb-2">Simulado Finalizado.</h3>
                      <p className="text-gray-500 text-sm mb-6">Você respondeu a todas as questões.</p>
                      <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4 mb-4">
                           <div><span className="block text-green-600 text-xs uppercase font-bold tracking-wider">Acertos</span><span className="block text-4xl font-extrabold text-green-700">{stats.correct}</span></div>
                           <div><span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Total</span><span className="block text-4xl font-extrabold text-gray-800">{stats.total}</span></div>
                        </div>
                        <div>
                           <div className="flex justify-between text-sm text-gray-600 mb-1 font-medium"><span>Aproveitamento</span><span className="text-indigo-600 font-mono">{Math.round((stats.correct / stats.total) * 100)}%</span></div>
                           <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden"><div className={`h-full rounded-full ${(stats.correct / stats.total) >= 0.7 ? 'bg-green-500' : (stats.correct / stats.total) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(stats.correct / stats.total) * 100}%` }}></div></div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-3">
                        <button type="button" className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700" onClick={() => navigate('/simulados')}>Sair para Meus Simulados</button>
                        <button type="button" className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50" onClick={() => setShowResultsModal(false)}>Revisar Gabarito</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimuladoDetailPage;