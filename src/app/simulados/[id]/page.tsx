'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { QuestionCard } from '@/components/practice/QuestionCard';
import { simuladoService, respostaService } from '@/services/api';
import { formatDificuldade, formatNivel } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react';

export default function SimuladoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const numericId = Number(id);
  
  // Data State
  const [simulado, setSimulado] = useState<Types.SimuladoDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startAttemptedRef = useRef(false);

  const simuladoTitle = simulado?.nome
    ? (simulado.nome.toLowerCase().includes('simulado') ? simulado.nome : `Simulado ${simulado.nome}`)
    : undefined;
  usePageTitle(simuladoTitle);
  
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
    if (numericId) {
      loadSimulado();
    }
  }, [numericId]);

  useEffect(() => {
    const autoStart = async () => {
      if (simulado && !simulado.startedAt && !startAttemptedRef.current) {
        startAttemptedRef.current = true;
        try {
          const updatedSimulado = await simuladoService.iniciar(numericId);
          
          // Sort questions by discipline name and then by ID
          if (updatedSimulado.questoes) {
            updatedSimulado.questoes.sort((a: any, b: any) => {
              const discA = a.subtemas?.[0]?.disciplina?.nome || 'Outros';
              const discB = b.subtemas?.[0]?.disciplina?.nome || 'Outros';
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
        data.questoes.sort((a: any, b: any) => {
          const discA = a.subtemas?.[0]?.disciplina?.nome || 'Outros';
          const discB = b.subtemas?.[0]?.disciplina?.nome || 'Outros';
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
    if (!resp) return 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300';
    return resp.correta ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-red-100 text-red-700 border border-red-300';
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error || !simulado || !simulado.questoes || !currentQuestion) return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
        <div className="flex"><AlertTriangle className="h-6 w-6 text-red-500 mr-3" /><p className="text-red-700 font-medium">{error || 'Simulado não encontrado'}</p></div>
        <button onClick={() => router.push('/simulados')} className="mt-4 text-sm text-red-600 font-semibold hover:underline">Voltar para lista</button>
      </div>
    </div>
  );

  const concurso = currentQuestion.concurso;
  const progressPercentage = (stats.answered / stats.total) * 100;
  const displayAlternativas = [...currentQuestion.alternativas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title={simulado.nome}
        subtitle={isFinished ? "Simulado Finalizado" : "Em Andamento"}
        breadcrumbs={[
          { label: 'Simulados', href: '/simulados' },
          { label: simuladoTitle }
        ]}
      />

      {/* Sticky Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full bg-slate-100 h-1">
          <div className={`h-1 transition-all duration-500 ease-out ${isFinished ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex justify-between items-center">
           <div className="flex items-center space-x-3 text-sm text-slate-600 font-medium">
              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-900 border border-slate-200">Questão {currentQuestionIndex + 1}</span>
              <span className="text-slate-400">/</span><span>{stats.total}</span>
           </div>
           <div className="flex items-center space-x-4">
              {isFinished && <span className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-sm font-semibold border border-emerald-100"><Award className="w-4 h-4 mr-2" />Nota: {Math.round((stats.correct / stats.total) * 100)}%</span>}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isFinished ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}><Clock className="w-4 h-4" /><span className="font-mono font-bold text-lg">{isFinished ? (currentResponse ? formatTime(currentResponse.tempoRespostaSegundos) : '--:--') : formatTime(questionTimer)}</span></div>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <QuestionCard
              concurso={concurso}
              cargos={currentQuestion.cargos}
              enunciado={currentQuestion.enunciado}
              imageUrl={currentQuestion.imageUrl}
              subtemas={currentQuestion.subtemas}
              alternativas={displayAlternativas}
              selectedAlternativa={selectedAlternativa}
              justificativa={justificativa}
              dificuldade={dificuldade}
              feedback={currentResponse}
              processingAnswer={processingAnswer}
              isVerifyDisabled={isVerifyDisabled}
              anulada={currentQuestion.anulada}
              desatualizada={currentQuestion.desatualizada}
              autoral={currentQuestion.autoral}
              onAlternativaSelect={(id) => setSelectedAlternativa(id)}
              onJustificativaChange={(v) => setJustificativa(v)}
              onDificuldadeChange={(v) => setDificuldade(v)}
              onVerify={handleVerify}
              statsSummary={
                <span className="font-mono text-xs text-slate-400">
                  {stats.answered}/{stats.total} · {Math.round((stats.correct / stats.total) * 100)}% acerto
                </span>
              }
              postSubmit={
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleNavigation('prev')}
                    disabled={currentQuestionIndex === 0}
                    className="inline-flex items-center px-4 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </button>
                  <button
                    onClick={() => handleNavigation('next')}
                    disabled={currentQuestionIndex === simulado!.questoes.length - 1}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              }
            />
          </div>

          {/* Sidebar Navigation */}
          <div className="lg:col-span-4">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-slate-200 sticky top-24">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center justify-between">
                <span>Navegação</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isFinished ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>{isFinished ? 'Finalizado' : 'Em Progresso'}</span>
              </h4>
              <div className="space-y-6 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                {(() => {
                  const groups: { name: string, indices: number[] }[] = [];
                  simulado.questoes.forEach((q, index) => {
                    const discName = q.subtemas?.[0]?.disciplina?.nome || 'Outros';
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
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 mr-2"></span>Acertou</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></span>Errou</div>
                {!isFinished && <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 mr-2"></span>Pendente</div>}
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
                        <button type="button" className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700" onClick={() => router.push('/simulados')}>Sair para Meus Simulados</button>
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
}
