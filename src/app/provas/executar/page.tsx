'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { QuestionCard } from '@/components/practice/QuestionCard';
import { questaoService, respostaService, concursoService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/ToastContext';

function ProvaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  
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

  usePageTitle(concurso ? `Prova - ${concurso.instituicao.nome}` : 'Prova');

  // Timer State
  const [questionTimer, setQuestionTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Derived State helpers ---

  const currentQuestion = useMemo(() => {
    return questoes[currentQuestionIndex];
  }, [questoes, currentQuestionIndex]);

  const currentResponse = useMemo(() => {
    if (!currentQuestion?.respostas) return null;
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
      
      const sortedQuestoes = [...questoesRes.content].sort((a, b) => {
        const discA = a.subtemas?.[0]?.disciplina?.nome || 'Outros';
        const discB = b.subtemas?.[0]?.disciplina?.nome || 'Outros';
        if (discA !== discB) return discA.localeCompare(discB);
        return a.id - b.id;
      });

      setQuestoes(sortedQuestoes);
      
      if (sortedQuestoes.length === 0) {
        setError('Nenhuma questão encontrada para este cargo neste concurso.');
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar dados da prova:', err);
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados da prova';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (isVerifyDisabled || !currentQuestion) return;

    try {
      setProcessingAnswer(true);
      
      // Registrar resposta (backend retorna void)
      await respostaService.create({
        questaoId: currentQuestion.id,
        alternativaId: selectedAlternativa,
        justificativa: justificativa,
        dificuldadeId: dificuldade,
        tempoRespostaSegundos: questionTimer
      });

      // Re-fetch individual question to get correctness and gabarito
      const updatedQuestion = await questaoService.getById(currentQuestion.id);
      
      const updatedQuestions = questoes.map(q => {
        if (q.id === currentQuestion.id) {
          return {
            ...q,
            ...updatedQuestion,
            respondida: true
          };
        }
        return q;
      });

      setQuestoes(updatedQuestions);
    } catch (err) {
      console.error('Erro ao verificar resposta:', err);
      showToast('Erro ao enviar resposta. Tente novamente.', 'error');
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
    if (!q.respondida) return 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300';
    return resp?.correta ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-red-100 text-red-700 border border-red-300';
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (error || questoes.length === 0 || !currentQuestion) return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Feedback
        type="error"
        title="Erro na Prova"
        message={error || (questoes.length === 0 ? 'Nenhuma questão encontrada para este cargo neste concurso.' : 'Prova não encontrada')}
        onClose={() => router.push('/concursos')}
      />
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => router.push('/concursos')}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Voltar para lista de concursos
        </button>
      </div>
    </div>
  );

  const cargo = concurso?.cargos.find(c => c.cargoId === cargoId);
  const progressPercentage = (stats.total > 0) ? (stats.answered / stats.total) * 100 : 0;
  const displayAlternativas = [...currentQuestion.alternativas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <PageHeader
        title={`Prova: ${concurso?.instituicao.nome} (${concurso?.ano})`}
        subtitle={cargo ? `${cargo.cargoNome} - ${cargo.area} (${formatNivel(cargo.nivel)})` : "Execução de Prova"}
      />

      {/* Sticky Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full bg-slate-100 h-1">
          <div className="h-1 transition-all duration-500 ease-out bg-indigo-600" style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex justify-between items-center">
           <div className="flex items-center space-x-3 text-sm text-slate-600 font-medium">
              <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-900 border border-slate-200">Questão {currentQuestionIndex + 1}</span>
              <span className="text-slate-400">/</span><span>{stats.total}</span>
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
            <QuestionCard
              concurso={concurso ? { 
                ...concurso, 
                bancaId: concurso.banca.id,
                bancaNome: concurso.banca.nome, 
                instituicaoId: concurso.instituicao.id,
                instituicaoNome: concurso.instituicao.nome, 
                instituicaoArea: concurso.instituicao.area 
              } : undefined}
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
                  {stats.answered}/{stats.total} · {Math.round((stats.correct / (stats.answered || 1)) * 100)}% acerto
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
                    disabled={currentQuestionIndex === questoes.length - 1}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              }
            />
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white shadow-sm rounded-xl p-5 border border-slate-200 sticky top-24">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                Navegação por Disciplina
              </h4>
              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {(() => {
                  const groups: { name: string, indices: number[] }[] = [];
                  questoes.forEach((q, index) => {
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
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 mr-2"></span>Pendente</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></span>Atual</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProvaDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ProvaContent />
    </Suspense>
  );
}
