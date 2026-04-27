import * as Types from '@/types';

// ─── Strategy ────────────────────────────────────────────────────────────────

/**
 * Controls how the priority score weights are applied.
 *
 * - `balanced`   Default. Combines edital weight, performance gaps, staleness,
 *                and behavioural signals (chute rate, false security) in equal
 *                measure. Best general-purpose option.
 *
 * - `weaknesses` Amplifies performance penalties — topics where the user scores
 *                low get a disproportionately large slice. Staleness plays a
 *                smaller role. Good for targeted remediation sessions.
 *
 * - `revision`   Amplifies staleness penalties — topics the user hasn't touched
 *                recently get prioritised regardless of past performance. Ideal
 *                for spaced-repetition review cycles.
 *
 * - `edital`     Heavily weights topics by how many questions they historically
 *                contributed to this specific concurso+cargo. Other signals are
 *                still present but dampened. Best for mimicking the real exam
 *                distribution.
 */
export type SimuladoStrategy = 'balanced' | 'weaknesses' | 'revision' | 'edital';

// ─── Options ─────────────────────────────────────────────────────────────────

interface GeneratorOptions {
  /** Target total number of questions. Defaults to 60. */
  targetQuestions?: number;
  /** Whether to ignore already answered questions. Defaults to false. */
  ignorarRespondidas?: boolean;
  /** Distribution strategy. Defaults to 'balanced'. */
  strategy?: SimuladoStrategy;
}

// ─── Internal scoring types ───────────────────────────────────────────────────

interface ScoredTopico {
  id: number;
  nome: string;
  disciplina: string;
  /** Raw composite score before normalisation. */
  score: number;
  /** Human-readable rationale for the score breakdown. */
  rationale: ScoreRationale;
  /** Questions available in the bank for this subtema. */
  questoesDisponiveis: number;
}

export interface ScoreRationale {
  /** Score contributed by edital history (questoesConcursoCargo). */
  editalScore: number;
  /** Multiplier applied due to performance deficit (or boost for strength). */
  perfMultiplier: number;
  /** Multiplier applied due to staleness of practice. */
  stalenessMultiplier: number;
  /** Multiplier applied due to a high chute (guessing) rate. */
  chuteMultiplier: number;
  /** Multiplier applied due to false-security pattern (easy >> medium/hard). */
  falseSecurityMultiplier: number;
  /** The detected topic status used for the perf multiplier. */
  perfStatus:
    | 'not-started'
    | 'untested-theory'
    | 'critical-perf'
    | 'low-perf'
    | 'target-perf'
    | 'strong';
  /** Days since last question was answered. */
  daysSinceLastQuestion: number;
  /** Actual hit rate (null if no questions answered). */
  perfRate: number | null;
}

// ─── Preview output ───────────────────────────────────────────────────────────

export interface SubtemaPreviewEntry {
  id: number;
  nome: string;
  disciplina: string;
  quantidade: number;
  percentual: number;
  score: number;
  rationale: ScoreRationale;
}

export interface DisciplinaPreviewEntry {
  disciplina: string;
  quantidade: number;
  percentual: number;
  subtemas: SubtemaPreviewEntry[];
}

export interface SimuladoPreview {
  nome: string;
  strategy: SimuladoStrategy;
  totalQuestoes: number;
  totalSubtemas: number;
  distribution: DisciplinaPreviewEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateBR = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const daysSince = (dateStr?: string | null): number => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

// ─── Core scoring engine ──────────────────────────────────────────────────────

/**
 * Computes a composite priority score for a single subtema.
 *
 * The score is the product of several independent signal multipliers applied
 * on top of a base value derived from how heavily this topic has appeared in
 * the actual exam (edital weight). Each multiplier is designed to mirror the
 * diagnostic logic in `EditalAnalysisReport`.
 *
 * @param topico  The subtema to score.
 * @param strategy  The active distribution strategy.
 * @returns  A `ScoredTopico` including raw score and full rationale.
 */
function scoreTopico(
  topico: Types.SubtemaSummaryDto,
  strategy: SimuladoStrategy,
): ScoredTopico {
  const respondidas = topico.questaoStats?.total?.respondidas ?? 0;
  const acertadas = topico.questaoStats?.total?.acertadas ?? 0;
  const totalQuestoes = topico.questaoStats?.total?.totalQuestoes ?? 0;
  const totalEstudos = topico.totalEstudos ?? 0;
  const editalHistorico = topico.questoesConcursoCargo?.totalQuestoes ?? 0;
  const ultimaQuestao = topico.questaoStats?.total?.ultimaQuestao;

  const perfRate = respondidas > 0 ? acertadas / respondidas : null;
  const daysSinceQuestion = daysSince(ultimaQuestao);

  // ── 1. Base score (edital importance) ────────────────────────────────────
  // Always at least 1 so topics with no edital history still get questions.
  // The `edital` strategy triples the weight of this signal.
  const editalScore = strategy === 'edital'
    ? 1 + editalHistorico * 3
    : 1 + editalHistorico;

  // ── 2. Performance multiplier ─────────────────────────────────────────────
  // Mirrors the critical/attention/strength classification in EditalAnalysisReport.
  let perfMultiplier: number;
  let perfStatus: ScoreRationale['perfStatus'];

  const neverStarted = totalEstudos === 0 && respondidas === 0;
  const studiedButUntested = totalEstudos > 0 && respondidas === 0;

  if (neverStarted) {
    // Highest priority gap — topic has been completely ignored.
    perfStatus = 'not-started';
    perfMultiplier = 1.8;
  } else if (studiedButUntested) {
    // Theory exists but was never validated with questions.
    perfStatus = 'untested-theory';
    perfMultiplier = 1.4;
  } else if (perfRate !== null && perfRate < 0.45) {
    // Critical performance — below the "passing zone" for concursos.
    perfStatus = 'critical-perf';
    perfMultiplier = 2.0;
  } else if (perfRate !== null && perfRate < 0.65) {
    // Below the comfortable target threshold.
    perfStatus = 'low-perf';
    perfMultiplier = 1.5;
  } else if (perfRate !== null && perfRate >= 0.80) {
    // Strong domain — needs maintenance, not remediation.
    perfStatus = 'strong';
    perfMultiplier = 0.75;
  } else {
    // Adequate performance (0.65–0.80).
    perfStatus = 'target-perf';
    perfMultiplier = 1.0;
  }

  // Strategy modifier for performance
  if (strategy === 'weaknesses') {
    // Square the deviation from 1.0 to amplify weak-topic preference.
    perfMultiplier = perfMultiplier >= 1.0
      ? 1 + (perfMultiplier - 1) * 2.0
      : 1 - (1 - perfMultiplier) * 0.5;
  } else if (strategy === 'revision') {
    // Performance still matters, but at half strength in revision mode.
    perfMultiplier = 1 + (perfMultiplier - 1) * 0.5;
  } else if (strategy === 'edital') {
    // Edital mode: performance signal is muted to 30% of its normal effect.
    perfMultiplier = 1 + (perfMultiplier - 1) * 0.3;
  }

  // ── 3. Staleness multiplier ───────────────────────────────────────────────
  // Mirrors the "Sem prática há Xd" and "Revisão necessária" insights.
  // Based on spaced-repetition principles: longer gaps → higher priority.
  let stalenessMultiplier: number;

  if (respondidas === 0) {
    // No questions answered yet — staleness is N/A; perf signal already covers this.
    stalenessMultiplier = 1.0;
  } else if (daysSinceQuestion > 60) {
    stalenessMultiplier = 1.5;
  } else if (daysSinceQuestion > 30) {
    stalenessMultiplier = 1.3;
  } else if (daysSinceQuestion > 14) {
    stalenessMultiplier = 1.1;
  } else if (daysSinceQuestion < 7) {
    // Very recent practice — already fresh, lower priority.
    stalenessMultiplier = 0.85;
  } else {
    stalenessMultiplier = 1.0;
  }

  // Strategy modifier for staleness
  if (strategy === 'revision') {
    // Revision mode amplifies the staleness signal significantly.
    stalenessMultiplier = 1 + (stalenessMultiplier - 1) * 2.5;
  } else if (strategy === 'weaknesses') {
    // Weaknesses mode doesn't care much about when it was last practised.
    stalenessMultiplier = 1 + (stalenessMultiplier - 1) * 0.4;
  } else if (strategy === 'edital') {
    stalenessMultiplier = 1 + (stalenessMultiplier - 1) * 0.6;
  }

  // ── 4. Chute (guessing) rate multiplier ──────────────────────────────────
  // Mirrors the "Excesso de Chutes" critical insight. High chute rate means
  // the user lacks genuine understanding and needs more reinforcement.
  const chuteTotal = topico.questaoStats?.total?.dificuldade?.['CHUTE']?.total ?? 0;
  const chuteRate = respondidas > 0 ? chuteTotal / respondidas : 0;

  let chuteMultiplier = 1.0;
  if (chuteRate > 0.30) {
    chuteMultiplier = 1.35;
  } else if (chuteRate > 0.20) {
    chuteMultiplier = 1.2;
  }

  if (strategy === 'edital') {
    chuteMultiplier = 1 + (chuteMultiplier - 1) * 0.4;
  }

  // ── 5. False-security multiplier ─────────────────────────────────────────
  // Mirrors the "Inconsistência na confiança" attention insight. The user
  // aces easy questions but struggles on medium/hard ones, suggesting shallow
  // understanding that a simulado should expose.
  const facilRate = (() => {
    const d = topico.questaoStats?.total?.dificuldade?.['FACIL'];
    return d && d.total > 0 ? d.corretas / d.total : null;
  })();
  const mediaRate = (() => {
    const d = topico.questaoStats?.total?.dificuldade?.['MEDIA'];
    return d && d.total > 0 ? d.corretas / d.total : null;
  })();
  const dificilRate = (() => {
    const d = topico.questaoStats?.total?.dificuldade?.['DIFICIL'];
    return d && d.total > 0 ? d.corretas / d.total : null;
  })();

  const hasFalseSecurity =
    facilRate !== null &&
    facilRate >= 0.70 &&
    ((mediaRate !== null && mediaRate < 0.50) ||
      (dificilRate !== null && dificilRate < 0.45));

  const falseSecurityMultiplier = hasFalseSecurity ? 1.2 : 1.0;

  // ── Composite score ───────────────────────────────────────────────────────
  const score =
    editalScore *
    perfMultiplier *
    stalenessMultiplier *
    chuteMultiplier *
    falseSecurityMultiplier;

  return {
    id: topico.id,
    nome: topico.nome,
    disciplina: topico.disciplina?.nome ?? 'Geral',
    score,
    questoesDisponiveis: totalQuestoes,
    rationale: {
      editalScore,
      perfMultiplier,
      stalenessMultiplier,
      chuteMultiplier,
      falseSecurityMultiplier,
      perfStatus,
      daysSinceLastQuestion: daysSinceQuestion === Infinity ? -1 : daysSinceQuestion,
      perfRate,
    },
  };
}

// ─── Distribution ─────────────────────────────────────────────────────────────

/**
 * Distributes `targetQuestions` across scored subtemas proportionally, then
 * applies rounding corrections so the total exactly hits the target.
 */
function distributeQuestions(
  scored: ScoredTopico[],
  targetQuestions: number,
): Array<{ id: number; quantidade: number }> {
  if (scored.length === 0) return [];

  const totalScore = scored.reduce((s, t) => s + t.score, 0);

  // Initial proportional allocation (floored)
  const allocations = scored.map(t => ({
    id: t.id,
    exact: totalScore > 0 ? (t.score / totalScore) * targetQuestions : targetQuestions / scored.length,
    quantidade: 0,
  }));

  allocations.forEach(a => { a.quantidade = Math.max(1, Math.floor(a.exact)); });

  // Distribute remaining budget to topics with largest fractional remainder
  const allocated = allocations.reduce((s, a) => s + a.quantidade, 0);
  const remaining = targetQuestions - allocated;

  if (remaining > 0) {
    allocations
      .map((a, i) => ({ i, frac: a.exact - Math.floor(a.exact) }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, remaining)
      .forEach(({ i }) => { allocations[i].quantidade++; });
  } else if (remaining < 0) {
    // Over-allocated (due to Math.max(1, …) floors): trim from lowest-scored topics
    allocations
      .map((a, i) => ({ i, score: scored[i].score }))
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.abs(remaining))
      .forEach(({ i }) => {
        if (allocations[i].quantidade > 1) allocations[i].quantidade--;
      });
  }

  return allocations.map(a => ({ id: a.id, quantidade: a.quantidade }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a `SimuladoGenerationRequest` from a concurso+cargo pair using a
 * performance-aware, multi-signal priority scoring algorithm.
 *
 * **Scoring signals (in order of expressiveness):**
 * 1. **Edital weight** — how many questions this subtema historically had in this
 *    concurso+cargo. Topics that appear more on the actual exam get more questions.
 * 2. **Performance deficit** — topics where the user scores low (or hasn't started)
 *    get a large boost. Topics already mastered (≥80%) get a mild reduction.
 * 3. **Staleness** — topics not practised recently are boosted via spaced-repetition
 *    logic. Topics answered in the last week are gently deprioritised.
 * 4. **Chute (guessing) rate** — topics the user frequently guesses on indicate
 *    fragile understanding and get extra exposure.
 * 5. **False security** — topics where easy questions are aced but medium/hard ones
 *    are failed signal shallow learning and get a small boost.
 *
 * The `strategy` option shifts the relative weight of these signals without
 * discarding any of them entirely.
 */
export function generateSimuladoFromCargo(
  concurso: Types.ConcursoDetailDto,
  cargo: Types.ConcursoCargoSummaryDto,
  options: GeneratorOptions = {},
): Types.SimuladoGenerationRequest {
  const {
    targetQuestions = 60,
    ignorarRespondidas = false,
    strategy = 'balanced',
  } = options;

  const topicos = cargo.topicos ?? [];

  // Score every subtema
  const scored = topicos.map(t => scoreTopico(t, strategy));

  // Distribute
  const distribution = distributeQuestions(scored, targetQuestions);

  // Map back to the DTO shape
  const subtemas: Types.SimuladoItemSelectionDto[] = distribution.map(d => ({
    id: d.id,
    quantidade: d.quantidade,
  }));

  return {
    nome: `Simulado ${cargo.cargoNome} - ${cargo.area} - ${concurso.instituicao.nome} - ${formatDateBR(new Date())}`,
    bancaId: concurso.banca?.id,
    cargoId: cargo.cargoId,
    nivel: cargo.nivel,
    areas: concurso.instituicao?.area ? [concurso.instituicao.area] : [],
    ignorarRespondidas,
    includeAutoral: false,
    disciplinas: [],
    temas: [],
    subtemas,
  };
}

/**
 * Returns a detailed human-readable breakdown of how questions would be
 * distributed, including per-subtema scores and rationale.
 *
 * Useful for previewing in the UI before committing to a simulado.
 */
export function generateSimuladoPreview(
  concurso: Types.ConcursoDetailDto,
  cargo: Types.ConcursoCargoSummaryDto,
  options: GeneratorOptions = {},
): SimuladoPreview {
  const {
    targetQuestions = 60,
    ignorarRespondidas = false,
    strategy = 'balanced',
  } = options;

  const topicos = cargo.topicos ?? [];
  const scored = topicos.map(t => scoreTopico(t, strategy));
  const distribution = distributeQuestions(scored, targetQuestions);
  const totalAllocated = distribution.reduce((s, d) => s + d.quantidade, 0);

  // Build per-subtema preview entries
  const subtemaMap = new Map(scored.map(s => [s.id, s]));
  const subtemaEntries: SubtemaPreviewEntry[] = distribution.map(d => {
    const sc = subtemaMap.get(d.id)!;
    return {
      id: d.id,
      nome: sc.nome,
      disciplina: sc.disciplina,
      quantidade: d.quantidade,
      percentual: totalAllocated > 0 ? d.quantidade / totalAllocated : 0,
      score: sc.score,
      rationale: sc.rationale,
    };
  });

  // Group by disciplina
  const byDisc = new Map<string, SubtemaPreviewEntry[]>();
  subtemaEntries.forEach(e => {
    if (!byDisc.has(e.disciplina)) byDisc.set(e.disciplina, []);
    byDisc.get(e.disciplina)!.push(e);
  });

  const distribution_: DisciplinaPreviewEntry[] = Array.from(byDisc.entries())
    .map(([disciplina, subs]) => {
      const qtd = subs.reduce((s, e) => s + e.quantidade, 0);
      return {
        disciplina,
        quantidade: qtd,
        percentual: totalAllocated > 0 ? qtd / totalAllocated : 0,
        subtemas: subs.sort((a, b) => b.quantidade - a.quantidade),
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);

  return {
    nome: `Simulado ${cargo.cargoNome} - ${cargo.area} - ${concurso.instituicao.nome} - ${formatDateBR(new Date())}`,
    strategy,
    totalQuestoes: totalAllocated,
    totalSubtemas: subtemaEntries.length,
    distribution: distribution_,
  };
}