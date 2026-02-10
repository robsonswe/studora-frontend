import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { questaoService, respostaService, concursoService } from '@/services/api';
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

const ProvaDetailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const concursoId = Number(searchParams.get('concursoId'));
  const cargoId = Number(searchParams.get('cargoId'));
  const instituicaoId = Number(searchParams.get('instituicaoId'));

  // Data State
  const [questoes, setQuestoes] = useState<Types.QuestaoSummaryDto[]>([]);
  const [concurso, setConcurso] = useState<Types.ConcursoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Question State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAlternativa, setSelectedAlternativa] = useState<number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [dificuldade, setDificuldade] = useState(2);
  const [processingAnswer, setProcessingAnswer] = useState(false);

  // Timer State
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Results Modal - REMOVED for Prova as it's just an organization of questions

  // --- Derived State helpers ---

  const currentQuestion = useMemo(() => {
    return questoes[currentQuestionIndex];
  }, [questoes, currentQuestionIndex]);

  const currentResponse = useMemo(() => {
    if (!currentQuestion?.respostas) return null;
    // For Prova (not Simulado), we look for the most recent response in the array
    return currentQuestion.respostas[currentQuestion.respostas.length - 1] || null;
  }, [currentQuestion]);

  const stats = useMemo(() => {
    if (!questoes) return { total: 0, answered: 0, correct: 0 };
    let answered = 0;
    let correct = 0;
    questoes.forEach(q => {
      if (q.respondida) {
        answered++;
        const resp = q.respostas?.[q.respostas.length - 1];
        if (resp?.correta) correct++;
      }
    });
    return { total: questoes.length, answered, correct };
  }, [questoes]);

  // Validation Logic
  const isVerifyDisabled = !selectedAlternativa || !justificativa.trim() || processingAnswer;

  // --- Effects ---

  useEffect(() => {
    loadData();
  }, [concursoId, cargoId, instituicaoId]);

  useEffect(() => {
    if (currentQuestion) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (currentQuestion.respondida && currentQuestion.respostas && currentQuestion.respostas.length > 0) {
        const lastResp = currentQuestion.respostas[currentQuestion.respostas.length - 1];
        setSelectedAlternativa(lastResp.alternativaId);
        setJustificativa(lastResp.justificativa || '');
        setDificuldade(
          lastResp.dificuldade === 'FACIL' ? 1 : 
          lastResp.dificuldade === 'MEDIA' ? 2 : 
          lastResp.dificuldade === 'DIFICIL' ? 3 : 4
        );
      } else {
        setSelectedAlternativa(null);
        setJustificativa('');
        setDificuldade(2);
        setQuestionTimer(0);
      }
    }
  }, [currentQuestionIndex, currentQuestion]);

  useEffect(() => {
    if (questoes.length > 0 && !currentResponse && !processingAnswer) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQuestionTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [questoes, currentResponse, processingAnswer]);

  // --- Actions ---

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    if (!concursoId || !cargoId || !instituicaoId) {
      setError('Parâmetros inválidos');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [concursoRes, questoesRes] = await Promise.all([
        concursoService.getById(concursoId),
        questaoService.getAll({
          concursoId,
          cargoId,
          instituicaoId,
          size: 1000 // Big size to return all
        })
      ]);

      setConcurso(concursoRes);
      
      // Sort questions by discipline name and then by ID
      const sortedQuestoes = [...questoesRes.content].sort((a, b) => {
        const discA = a.subtemas?.[0]?.disciplinaNome || 'Outros';
        const discB = b.subtemas?.[0]?.disciplinaNome || 'Outros';
        if (discA !== discB) return discA.localeCompare(discB);
        return a.id - b.id;
      });

      setQuestoes(sortedQuestoes);
      
      if (sortedQuestoes.length === 0) {
        setError('Nenhuma questão encontrada para este cargo neste concurso.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados da prova:', err);
      setError(err.message || 'Erro ao carregar dados da prova');
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
        tempoRespostaSegundos: questionTimer
      });

      const updatedQuestions = questoes.map(q => {
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

      setQuestoes(updatedQuestions);
    } catch (err) {
      console.error('Erro ao verificar resposta:', err);
      alert('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setProcessingAnswer(false);
    }
  };

  const handleNavigation = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentQuestionIndex < questoes.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const getQuestionStatusColor = (index: number) => {
    const q = questoes[index];
    if (!q) return '';
    const isActive = index === currentQuestionIndex;
    const resp = q.respostas?.[q.respostas.length - 1];
    if (isActive) return 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1';
    if (!q.respondida) return 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300';
    return resp?.correta ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300';
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error || questoes.length === 0 || !currentQuestion) return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex"><AlertTriangle className="h-6 w-6 text-red-500 mr-3" /><p className="text-red-700 font-medium">{error || 'Prova não encontrada'}</p></div>
        <button onClick={() => navigate('/provas')} className="mt-4 text-sm text-red-600 font-semibold hover:underline">Voltar para lista</button>
      </div>
    </div>
  );

  const cargo = concurso?.cargos.find(c => c.id === cargoId);
  const progressPercentage = (stats.answered / stats.total) * 100;
  const displayAlternativas = [...currentQuestion.alternativas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header 
        title={`Prova: ${concurso?.instituicao.nome} (${concurso?.ano})`} 
        subtitle={cargo ? `${cargo.nome} - ${cargo.area} (${formatNivel(cargo.nivel)})` : "Execução de Prova"} 
      />
      
      {/* Sticky Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm transition-all">
        <div className="w-full bg-gray-100 h-1.5">
          <div className="h-1.5 transition-all duration-500 ease-out bg-indigo-600" style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
           <div className="flex items-center space-x-3 text-sm text-gray-600 font-medium">
              <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-900 border border-gray-200">Questão {currentQuestionIndex + 1}</span>
              <span className="text-gray-400">/</span><span>{stats.total}</span>
           </div>
           <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-100">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-lg">{currentResponse ? formatTime(currentResponse.tempoRespostaSegundos) : formatTime(questionTimer)}</span>
              </div>
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{concurso?.banca.nome}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">{concurso?.ano}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">{concurso?.instituicao.nome}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{(currentQuestion.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  {currentQuestion.anulada && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Anulada</span>}
                  {currentQuestion.desatualizada && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Desatualizada</span>}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="prose prose-indigo max-w-none text-gray-800 mb-6 font-serif leading-relaxed text-lg"><p className="whitespace-pre-line">{currentQuestion.enunciado}</p></div>
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
                        className={`inline-flex items-center px-10 py-3 border border-transparent text-base font-bold rounded-xl shadow-lg text-white transition-all ${isVerifyDisabled ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0'}`}
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
                        <button onClick={() => handleNavigation('next')} disabled={currentQuestionIndex === questoes.length - 1} className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">Próxima <ChevronRight className="w-4 h-4 ml-1" /></button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-200 sticky top-24">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
                Navegação por Disciplina
              </h4>
              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {(() => {
                  const groups: { name: string, indices: number[] }[] = [];
                  questoes.forEach((q, index) => {
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
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300 mr-2"></span>Pendente</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></span>Atual</div>
              </div>
            </div>
          </div>
        </div>
            </div>
          </div>
        );
      };
      
      export default ProvaDetailPage;
      