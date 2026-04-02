import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, respostaService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade, formatDateTime } from '@/utils/formatters';
import * as Types from '@/types';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type QuestaoDto = Types.QuestaoDetailDto;
type RespostaDto = Types.RespostaDetailDto;

type PracticeMode = 'setup' | 'practice';

// ─── keyboard shortcut map: A=1, B=2, C=3, D=4, E=5 ───────────────────────
const KEY_TO_ORDEM: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5 };

const QuestaoPracticePage = () => {
  const [mode, setMode] = useState<PracticeMode>('setup');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const alt = displayAlternativas.find((a) => a.ordem === ordem);
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
      };

      const question = await questaoService.getRandom(params);
      const alternatives = [...question.alternativas].sort((a, b) => a.ordem - b.ordem);

      setCurrentQuestion(question);
      setDisplayAlternativas(alternatives);
      setMode('practice');
    } catch (err: any) {
      console.error('Erro ao buscar questão:', err);
      // If coming from practice mode, return to setup so the user isn't
      // stuck on the loading guard with a null question.
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
      const response = await respostaService.create({
        questaoId: currentQuestion.id,
        alternativaId: selectedAlternativa,
        justificativa,
        dificuldadeId: dificuldade,
        tempoRespostaSegundos: secondsElapsed,
      });

      setFeedback(response);
      setSessionTotal((t) => t + 1);
      if (response.correta) setSessionCorrect((c) => c + 1);

      if (response.alternativas) {
        const enrichedAlts = response.alternativas;
        setDisplayAlternativas((prev) =>
          prev.map((d) => enrichedAlts.find((a) => a.id === d.id) ?? d)
        );
      }

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
      const data = await temaService.getByDisciplina(watchedFields.selectedDisciplina.value);
      return [
        { value: 0, label: 'Todos os temas' },
        ...data.filter((t) => t.nome.toLowerCase().includes(inputValue.toLowerCase())).map((t) => ({ value: t.id, label: t.nome })),
      ];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getByTema(watchedFields.selectedTema.value);
      return [
        { value: 0, label: 'Todos os subtemas' },
        ...data.filter((s) => s.nome.toLowerCase().includes(inputValue.toLowerCase())).map((s) => ({ value: s.id, label: s.nome })),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP MODE
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <Header title="Bateria de Questões" subtitle="Configure os filtros e inicie sua prática." />

        <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

          {/* ── Content filters ─────────────────────────────────────────── */}
          <div className="mb-8">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Conteúdo</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Disciplina</label>
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
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tema</label>
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
                  placeholder="Todos"
                  isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0}
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Subtema</label>
                <AsyncSelect
                  key={`subtema-${watchedFields.selectedTema?.value}`}
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSubtemaOptions}
                  value={watchedFields.selectedSubtema}
                  onChange={(val) => setValue('selectedSubtema', val)}
                  placeholder="Todos"
                  isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0}
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>
            </div>
          </div>

          {/* ── Exam filters ─────────────────────────────────────────────── */}
          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Concurso</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Banca</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={watchedFields.selectedBanca}
                  onChange={(val) => setValue('selectedBanca', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Área da Instituição</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoAreaOptions}
                  value={watchedFields.selectedInstituicaoArea}
                  onChange={(val) => setValue('selectedInstituicaoArea', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Área do Cargo</label>
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoAreaOptions}
                  value={watchedFields.selectedCargoArea}
                  onChange={(val) => setValue('selectedCargoArea', val)}
                  placeholder="Todas"
                  isClearable={false}
                  styles={selectStyles}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nível</label>
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
                  placeholder="Todos"
                  styles={selectStyles}
                />
              </div>
            </div>
          </div>

                    {/* ── Justificativa notice ─────────────────────────────────────── */}
          <p className="mt-8 text-xs text-slate-400">
            Cada questão exige uma justificativa escrita antes de revelar o gabarito.
          </p>

          {/* ── Error ───────────────────────────────────────────────────── */}
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

          {/* ── CTA ─────────────────────────────────────────────────────── */}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING GUARD
  // ═══════════════════════════════════════════════════════════════════════════
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="h-10 w-10 rounded-full border-2 border-t-indigo-600 border-slate-200 animate-spin" />
      </div>
    );
  }

  const concurso = currentQuestion.concurso;
  const isVerifyDisabled = !selectedAlternativa || !justificativa.trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // PRACTICE MODE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Bateria de Questões" subtitle="Prática focada" />

      {/* ── Sticky bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          {/* Timer */}
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

          {/* Session tally */}
          {sessionTotal > 0 && (
            <span className="font-mono text-xs text-slate-400 tracking-tight hidden sm:block">
              {sessionTotal} {sessionTotal === 1 ? 'questão' : 'questões'} · {sessionAccuracy}% de acerto
            </span>
          )}

          {/* Active filters hint + change link */}
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

        {/* ── Error ─────────────────────────────────────────────────────── */}
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

        {/* ── Question card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {concurso?.bancaNome || 'Banca não especificada'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {concurso?.ano || '—'}
              </span>
              <span className="text-sm text-slate-600 truncate">
                {concurso?.instituicaoNome || 'Instituição não especificada'}
              </span>
              {currentQuestion.anulada && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ms-auto">
                  ANULADA
                </span>
              )}
              {currentQuestion.desatualizada && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ms-auto">
                  DESATUALIZADA
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500">
              {(currentQuestion.cargos || []).map((c) => `${c.nome} – ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
            </div>

            {/* Taxonomy */}
            {(currentQuestion.subtemas || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500 leading-relaxed">
                {(() => {
                  const grouped: Record<string, Record<string, string[]>> = {};
                  currentQuestion.subtemas.forEach((st) => {
                    if (!grouped[st.disciplinaNome]) grouped[st.disciplinaNome] = {};
                    if (!grouped[st.disciplinaNome][st.temaNome]) grouped[st.disciplinaNome][st.temaNome] = [];
                    grouped[st.disciplinaNome][st.temaNome].push(st.nome);
                  });
                  return Object.entries(grouped).map(([disc, temasMap]) => (
                    <span key={disc} className="block">
                      <span className="font-medium text-slate-600">{disc}:</span>{' '}
                      {Object.entries(temasMap)
                        .map(([tema, subs]) => `${tema} (${subs.join(', ')})`)
                        .join(' | ')}
                    </span>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-wrap break-words mb-8">
              {currentQuestion.enunciado}
            </p>

            {/* Image */}
            {currentQuestion.imageUrl && (
              <div className="mb-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2">
                <img src={currentQuestion.imageUrl} alt="Imagem da questão" className="max-w-full h-auto mx-auto rounded" />
              </div>
            )}

            {/* ── Alternatives ────────────────────────────────────────── */}
            <div className="space-y-2.5 mb-10" role="radiogroup" aria-label="Alternativas">
              {displayAlternativas.length > 0 ? (
                displayAlternativas.map((alternativa) => {
                  const isSelected = selectedAlternativa === alternativa.id;
                  const isCorrect = alternativa.correta;
                  const showFeedback = !!feedback;
                  const letter = String.fromCharCode(64 + alternativa.ordem);

                  let containerClass =
                    'group relative flex items-start p-4 cursor-pointer rounded-lg border transition-all duration-150 ';
                  let badgeClass =
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors flex-shrink-0 ';

                  if (showFeedback) {
                    if (isCorrect) {
                      containerClass += 'bg-emerald-50 border-emerald-300 ';
                      badgeClass += 'bg-emerald-500 text-white';
                    } else if (isSelected && !isCorrect) {
                      containerClass += 'bg-red-50 border-red-300 ';
                      badgeClass += 'bg-red-400 text-white';
                    } else {
                      containerClass += 'bg-slate-50 border-slate-100 opacity-50 ';
                      badgeClass += 'bg-slate-100 text-slate-400';
                    }
                  } else {
                    if (isSelected) {
                      containerClass += 'bg-indigo-50 border-indigo-500 shadow-sm ';
                      badgeClass += 'bg-indigo-600 text-white';
                    } else {
                      containerClass += 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 ';
                      badgeClass +=
                        'bg-white border border-slate-300 text-slate-500 group-hover:border-indigo-400 group-hover:text-indigo-500';
                    }
                  }

                  return (
                    <div
                      key={alternativa.id}
                      className={containerClass}
                      onClick={() => !showFeedback && setSelectedAlternativa(alternativa.id!)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={showFeedback ? -1 : 0}
                      onKeyDown={(e) => {
                        if (!showFeedback && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setSelectedAlternativa(alternativa.id!);
                        }
                      }}
                    >
                      <div className="flex items-start pt-0.5">
                        <span className={badgeClass}>{letter}</span>
                      </div>

                      <div className="ms-3.5 flex-1 min-w-0">
                        <div
                          className={`text-base break-words leading-relaxed ${
                            showFeedback && isCorrect ? 'font-medium text-emerald-900' : 'text-slate-700'
                          }`}
                        >
                          {alternativa.texto}
                        </div>

                        {showFeedback && (
                          <div className="mt-3">
                            {(isCorrect || (isSelected && !isCorrect)) && (
                              <div
                                className={`flex items-start text-sm p-3 rounded-lg ${
                                  isCorrect
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-red-50 text-red-800'
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 me-2 flex-shrink-0 mt-0.5 text-red-500" />
                                )}
                                <div>
                                  <strong className="block mb-1 text-xs uppercase tracking-wide">
                                    {isCorrect ? 'Gabarito' : 'Alternativa incorreta'}
                                  </strong>
                                  {alternativa.justificativa}
                                </div>
                              </div>
                            )}
                            {!isCorrect && !isSelected && alternativa.justificativa && (
                              <div className="text-sm text-slate-500 ps-3 border-l-2 border-slate-200 italic mt-1">
                                {alternativa.justificativa}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* "Sua resposta" marker — simplified */}
                      {showFeedback && isSelected && (
                        <span className="ms-3 flex-shrink-0 self-start mt-0.5 w-2 h-2 rounded-full bg-indigo-500" title="Sua resposta" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm italic">Esta questão não possui alternativas cadastradas.</p>
                </div>
              )}
            </div>

            {/* ── Keyboard shortcut hint ───────────────────────────────── */}
            {!feedback && (
              <p className="text-xs text-slate-400 mb-6 -mt-6">
                Atalho: pressione <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">A</kbd>–<kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px] font-mono border border-slate-200">E</kbd> para selecionar uma alternativa.
              </p>
            )}

            {/* ── Bottom panel ────────────────────────────────────────── */}
            <div className="border-t border-slate-100 pt-8">
              {!feedback ? (
                /* Pre-submit */
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Justificativa */}
                    <div>
                      <label htmlFor="justificativa" className="block text-xs font-medium text-slate-600 mb-1.5">
                        Justificativa <span className="text-indigo-500">*</span>
                      </label>
                      <textarea
                        id="justificativa"
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                        rows={4}
                        placeholder="Escreva o fundamento da sua resposta antes de verificar o gabarito."
                        maxLength={2000}
                        aria-required="true"
                      />
                      <div className="flex justify-between mt-1 items-center">
                        {selectedAlternativa && !justificativa.trim() ? (
                          <p className="text-xs text-indigo-600">Escreva a justificativa para habilitar.</p>
                        ) : (
                          <span />
                        )}
                        <span className="text-[11px] text-slate-400 font-mono ms-auto">
                          {justificativa.length}/2000
                        </span>
                      </div>
                    </div>

                    {/* Dificuldade */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Dificuldade percebida</label>
                      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Nível de dificuldade">
                        {[
                          { val: 1, label: 'Fácil', active: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300' },
                          { val: 2, label: 'Média', active: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300' },
                          { val: 3, label: 'Difícil', active: 'bg-orange-50 text-orange-700 border-orange-300 ring-1 ring-orange-300' },
                          { val: 4, label: 'Chute', active: 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-300' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setDificuldade(opt.val)}
                            aria-pressed={dificuldade === opt.val}
                            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                              dificuldade === opt.val
                                ? opt.active
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
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
                      disabled={isVerifyDisabled || verifying}
                      className={`inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold text-white transition-all ${
                        isVerifyDisabled || verifying
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                      }`}
                    >
                      {verifying ? (
                        <>
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Verificar resposta'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Post-submit */
                <div>
                  {/* ── Result summary line ──────────────────────────── */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className={`font-mono text-sm font-medium ${
                        feedback.correta ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {feedback.correta ? 'Correta.' : 'Ponto de Atenção.'}
                      {' · '}
                      {formatTime(feedback.tempoRespostaSegundos)}
                      {' · '}
                      {formatDificuldade(feedback.dificuldade)}
                    </span>

                    {sessionTotal > 0 && (
                      <span className="font-mono text-xs text-slate-400">
                        Sessão: {sessionTotal} {sessionTotal === 1 ? 'questão' : 'questões'} · {sessionAccuracy}% de acerto
                      </span>
                    )}
                  </div>

                  {/* ── User's justificativa ────────────────────────── */}
                  {feedback.justificativa && (
                    <div className="mb-6 ps-3 border-l-2 border-slate-200">
                      <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                        Minha justificativa
                      </span>
                      <p className="text-sm text-slate-600 italic">"{feedback.justificativa}"</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={fetchRandomQuestion}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Próxima questão
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