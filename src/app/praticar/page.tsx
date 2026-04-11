'use client';

import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { QuestionCard } from '@/components/practice/QuestionCard';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Play,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type QuestaoDto = Types.QuestaoDetailDto;
type RespostaDto = Types.RespostaDetailDto;

type PracticeMode = 'setup' | 'practice';

// ─── keyboard shortcut map: A=1, B=2, C=3, D=4, E=5 ───────────────────────
const KEY_TO_ORDEM: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5 };

export default function QuestaoPracticePage() {
  const [mode, setMode] = useState<PracticeMode>('setup');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeAutoral, setIncludeAutoral] = useState(false);

  usePageTitle('Praticar');

  // Question State
  const [currentQuestion, setCurrentQuestion] = useState<QuestaoDto | null>(null);
  const [selectedAlternativa, setSelectedAlternativa] = useState<number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [dificuldade, setDificuldade] = useState(2);

  // Feedback State
  const [feedback, setFeedback] = useState<RespostaDto | null>(null);
  const [displayAlternativas, setDisplayAlternativas] = useState<Types.AlternativaDto[]>([]);

  // Session Stats
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter Form
  const { setValue, watch, getValues } = useForm({
    defaultValues: {
      selectedDisciplina: { value: 0, label: 'Todas as disciplinas' } as { value: number; label: string } | null,
      selectedTema: { value: 0, label: 'Todos os temas' } as { value: number; label: string } | null,
      selectedSubtema: { value: 0, label: 'Todos os subtemas' } as { value: number; label: string } | null,
      selectedBanca: { value: 0, label: 'Todas as bancas' } as { value: number; label: string } | null,
      selectedInstituicaoArea: { value: '', label: 'Todas as áreas' } as { value: string; label: string } | null,
      selectedCargoArea: { value: '', label: 'Todas as áreas' } as { value: string; label: string } | null,
      selectedCargoNivel: '',
    },
  });

  const watchedFields = watch();

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'practice' && currentQuestion && !feedback) {
      setSecondsElapsed(0);
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, currentQuestion, feedback]);

  // ─── Keyboard shortcuts (A–E) during practice ────────────────────────────
  useEffect(() => {
    if (mode !== 'practice' || feedback) return;

    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      const ordem = KEY_TO_ORDEM[e.key.toLowerCase()];
      if (!ordem) return;

      const alt = displayAlternativas.find((a: Types.AlternativaDto) => a.ordem === ordem);
      if (alt?.id) {
        setSelectedAlternativa(alt.id);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, feedback, displayAlternativas]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchRandomQuestion = async () => {
    const wasInPractice = mode === 'practice';
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
        disciplinaId: filters.selectedDisciplina?.value !== 0 ? filters.selectedDisciplina?.value : undefined,
        temaId: filters.selectedTema?.value !== 0 ? filters.selectedTema?.value : undefined,
        subtemaId: filters.selectedSubtema?.value !== 0 ? filters.selectedSubtema?.value : undefined,
        bancaId: filters.selectedBanca?.value !== 0 ? filters.selectedBanca?.value : undefined,
        instituicaoArea: filters.selectedInstituicaoArea?.value !== '' ? filters.selectedInstituicaoArea?.value : undefined,
        cargoArea: filters.selectedCargoArea?.value !== '' ? filters.selectedCargoArea?.value : undefined,
        cargoNivel: filters.selectedCargoNivel || undefined,
        anulada: false,
        includeAutoral: includeAutoral || undefined,
      };

      const question = await questaoService.getRandom(params);
      const alternatives = [...question.alternativas].sort((a, b) => a.ordem - b.ordem);

      setCurrentQuestion(question);
      setDisplayAlternativas(alternatives);
      setMode('practice');
    } catch (err: any) {
      console.error('Erro ao buscar questão:', err);
      if (wasInPractice) setMode('setup');
      setError(
        err.message ||
        (wasInPractice
          ? 'Sem mais questões disponíveis para estes filtros. Ajuste os filtros e tente novamente.'
          : 'Nenhuma questão encontrada com os filtros selecionados.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!currentQuestion || !selectedAlternativa || !justificativa.trim()) return;

    setVerifying(true);
    try {
      // Registrar resposta (backend retorna void)
      await respostaService.create({
        questaoId: currentQuestion.id,
        alternativaId: selectedAlternativa,
        justificativa,
        dificuldadeId: dificuldade,
        tempoRespostaSegundos: secondsElapsed,
      });

      // Re-fetch question to get correctness and gabarito (Next.js requirement since create returns void)
      const updatedQuestion = await questaoService.getById(currentQuestion.id);
      
      // The feedback is the most recent response in the array (or the single .resposta object)
      const respFeedback = updatedQuestion.resposta || updatedQuestion.respostas?.[0] || null;

      if (!respFeedback) {
        throw new Error('Não foi possível obter o feedback da resposta.');
      }

      // Cast to RespostaDto (RespostaDetailDto) as we now have both the summary and alternatives
      const fullFeedback: RespostaDto = {
        ...respFeedback,
        alternativas: updatedQuestion.alternativas
      };

      setFeedback(fullFeedback);
      setSessionTotal((t) => t + 1);
      if (fullFeedback.correta) setSessionCorrect((c) => c + 1);

      // Update alternatives with gabarito info
      const enrichedAlts = updatedQuestion.alternativas;
      setDisplayAlternativas((prev) =>
        prev.map((d) => enrichedAlts.find((a: Types.AlternativaDto) => a.id === d.id) ?? d)
      );

      setCurrentQuestion(updatedQuestion);

      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      console.error('Erro ao verificar resposta:', err);
      setError(err.message || 'Erro ao enviar resposta. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  // ─── Filter Option Loaders ────────────────────────────────────────────────
  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as bancas' }, ...data.content.map((b) => ({ value: b.id, label: b.nome }))];
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as disciplinas' }, ...data.content.map((d) => ({ value: d.id, label: d.nome }))];
  };

  const loadTemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) {
      const data = await temaService.getAll({ 
        disciplinaIds: watchedFields.selectedDisciplina.value, 
        nome: inputValue,
        size: 50 
      });
      return [
        { value: 0, label: 'Todos os temas' },
        ...data.content.map((t) => ({ value: t.id, label: t.nome })),
      ];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getAll({ 
        temaIds: watchedFields.selectedTema.value, 
        nome: inputValue,
        size: 50 
      });
      return [
        { value: 0, label: 'Todos os subtemas' },
        ...data.content.map((s) => ({ value: s.id, label: s.nome })),
      ];
    }
    return [{ value: 0, label: 'Todos os subtemas' }];
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map((a) => ({ value: a, label: a }))];
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map((a) => ({ value: a, label: a }))];
  };

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderColor: '#e2e8f0',
      boxShadow: 'none',
      borderRadius: '0.5rem',
      paddingTop: '2px',
      paddingBottom: '2px',
      '&:hover': { borderColor: '#6366f1' },
    }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#94a3b8' }),
  };

  // ─── Computed active-filter summary for sticky bar ───────────────────────
  const activeFilters: string[] = [];
  if (watchedFields.selectedDisciplina?.value) activeFilters.push(watchedFields.selectedDisciplina.label);
  if (watchedFields.selectedTema?.value) activeFilters.push(watchedFields.selectedTema.label);
  if (watchedFields.selectedSubtema?.value) activeFilters.push(watchedFields.selectedSubtema.label);
  if (watchedFields.selectedBanca?.value) activeFilters.push(watchedFields.selectedBanca.label);
  if (watchedFields.selectedInstituicaoArea?.value) activeFilters.push(watchedFields.selectedInstituicaoArea.label);
  if (watchedFields.selectedCargoArea?.value) activeFilters.push(watchedFields.selectedCargoArea.label);
  if (watchedFields.selectedCargoNivel) activeFilters.push(formatNivel(watchedFields.selectedCargoNivel));

  // ─── Session accuracy ─────────────────────────────────────────────────────
  const sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : null;

  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <PageHeader title="Bateria de Questões" subtitle="Configure os filtros e inicie sua prática." />

        <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Conteúdo</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Disciplina</label>
                <AsyncSelect
                  instanceId="disciplina-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadDisciplinaOptions}
                  value={watchedFields.selectedDisciplina}
                  onChange={(val) => {
                    setValue('selectedDisciplina', val);
                    setValue('selectedTema', { value: 0, label: 'Todos os temas' });
                    setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                  }}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tema</label>
                <AsyncSelect
                  key={`tema-${watchedFields.selectedDisciplina?.value}`}
                  instanceId="tema-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadTemaOptions}
                  value={watchedFields.selectedTema}
                  onChange={(val) => {
                    setValue('selectedTema', val);
                    setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' });
                  }}
                  placeholder="Todos"
                  isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0}
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Subtema</label>
                <AsyncSelect
                  key={`subtema-${watchedFields.selectedTema?.value}`}
                  instanceId="subtema-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  value={watchedFields.selectedSubtema}
                  onChange={(val) => setValue('selectedSubtema', val)}
                  placeholder="Todos"
                  isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0}
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Concurso</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Banca</label>
                <AsyncSelect
                  instanceId="banca-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={watchedFields.selectedBanca}
                  onChange={(val) => setValue('selectedBanca', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Área da Instituição</label>
                <AsyncSelect
                  instanceId="instituicao-area-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Área do Cargo</label>
                <AsyncSelect
                  instanceId="cargo-area-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nível</label>
                <Select
                  instanceId="nivel-select"
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
                  placeholder="Todos"
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <label className="relative inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={includeAutoral}
                onChange={e => setIncludeAutoral(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">Incluir questões autorais</span>
            </label>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Cada questão exige uma justificativa escrita antes de revelar o gabarito.
          </p>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
              <AlertCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-600 underline hover:text-red-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-end">
            <button
              onClick={fetchRandomQuestion}
              disabled={loading}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Buscando questão...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar prática
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="h-10 w-10 rounded-full border-2 border-t-indigo-600 border-slate-200 animate-spin" />
      </div>
    );
  }

  const concurso = currentQuestion.concurso;
  const isVerifyDisabled = !selectedAlternativa || !justificativa.trim();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <PageHeader title="Bateria de Questões" subtitle="Prática focada" />

      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-1.5"
            role="timer"
            aria-label={`Tempo decorrido: ${formatTime(secondsElapsed)}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="font-mono text-sm font-medium text-slate-700 tracking-tight" aria-live="off">
              {formatTime(secondsElapsed)}
            </span>
          </div>

          {sessionTotal > 0 && (
            <span className="font-mono text-xs text-slate-400 tracking-tight hidden sm:block">
              {sessionTotal} {sessionTotal === 1 ? 'questão' : 'questões'} · {sessionAccuracy}% de acerto
            </span>
          )}

          <button
            onClick={() => setMode('setup')}
            className="text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 ms-auto"
          >
            {activeFilters.length > 0
              ? activeFilters.slice(0, 2).join(' · ') + (activeFilters.length > 2 ? ` +${activeFilters.length - 2}` : '')
              : 'Todos os filtros'}
            <span className="text-slate-300 mx-1">·</span>
            <span className="text-indigo-600">Alterar</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start text-sm">
            <AlertCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {error}
              <button onClick={() => setError(null)} className="ms-3 text-xs text-red-600 underline hover:text-red-800">
                Fechar
              </button>
            </div>
          </div>
        )}

        <QuestionCard
          concurso={concurso ?? undefined}
          cargos={currentQuestion.cargos}
          enunciado={currentQuestion.enunciado}
          imageUrl={currentQuestion.imageUrl}
          subtemas={currentQuestion.subtemas}
          alternativas={displayAlternativas}
          selectedAlternativa={selectedAlternativa}
          justificativa={justificativa}
          dificuldade={dificuldade}
          feedback={feedback}
          processingAnswer={verifying}
          isVerifyDisabled={isVerifyDisabled || verifying}
          anulada={currentQuestion.anulada}
          desatualizada={currentQuestion.desatualizada}
          autoral={currentQuestion.autoral}
          onAlternativaSelect={(id) => setSelectedAlternativa(id)}
          onJustificativaChange={(v) => setJustificativa(v)}
          onDificuldadeChange={(v) => setDificuldade(v)}
          onVerify={handleVerify}
          statsSummary={
            sessionTotal > 0 && (
              <span className="font-mono text-xs text-slate-400">
                Sessão: {sessionTotal} {sessionTotal === 1 ? 'questão' : 'questões'} · {sessionAccuracy}% de acerto
              </span>
            )
          }
          postSubmit={
            <div className="flex justify-end">
              <button
                onClick={fetchRandomQuestion}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Próxima questão
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
