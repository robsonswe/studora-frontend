import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { concursoService, ApiError } from '@/services/api';
import { formatNivel } from '@/utils/formatters';
import * as Types from '@/types';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  BarChart2,
  Calendar,
  ChevronRight,
  Link as LinkIcon,
  Sparkles,
  Zap,
  ShieldAlert,
  Activity,
  FlaskConical,
  Timer,
  Layers,
  Eye,
  Brain,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightSeverity = 'critical' | 'attention' | 'strength';
type ActionLabel =
  | 'Bateria de questões'
  | 'Revisão teórica'
  | 'Revisão programada'
  | 'Simulado'
  | 'Manter cadência'
  | 'Ampliar cobertura';

interface SubInsight {
  icon: React.ReactNode;
  text: string;
}

interface EditalInsight {
  severity: InsightSeverity;
  disciplina: string;
  message: string;
  detail: string;
  subInsights?: SubInsight[];
  action?: ActionLabel;
  urgency: number;
}

interface MacroPattern {
  type: 'warning' | 'info' | 'positive' | 'neutral';
  title: string;
  detail: string;
  icon: React.ReactNode;
}

interface DiffAgg {
  total: number;
  corretas: number;
}

interface DisciplineStats {
  nome: string;
  topicos: Types.SubtemaSummaryDto[];
  totalTopicos: number;
  estudados: number;
  totalQuestoes: number;
  questoesRespondidas: number;
  questoesAcertadas: number;
  totalEstudos: number;
  coverageRate: number;
  bankCoverageRate: number;
  performanceRate: number | null;
  daysSinceLastStudy: number;
  daysSinceLastQuestion: number;
  avgTempoResposta: number | null;
  dificuldade: Record<string, DiffAgg>;
}

interface EditalAnalysis {
  summary: {
    totalTopicos: number;
    totalEstudados: number;
    totalQuestoes: number;
    coverageRate: number;
    totalRespondidas: number;
    totalAcertadas: number;
    performanceRate: number | null;
    bankCoverageRate: number;
    globalAvgTempo: number | null;
  };
  disciplineStats: DisciplineStats[];
  insights: EditalInsight[];
  macroPatterns: MacroPattern[];
  recommendations: { label: string; action: ActionLabel | null; urgency: number }[];
}

// ─── Analysis Engine ──────────────────────────────────────────────────────────

const daysSince = (dateStr?: string): number => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const sToMin = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}min${Math.round(s % 60) > 0 ? `${Math.round(s % 60)}s` : ''}`;

const analyzeEdital = (topicos: Types.SubtemaSummaryDto[]): EditalAnalysis => {
  // ── Group by disciplina ────────────────────────────────────────────────────
  const byDisciplina = new Map<string, Types.SubtemaSummaryDto[]>();
  topicos.forEach(t => {
    const disc = t.disciplinaNome || 'Geral';
    if (!byDisciplina.has(disc)) byDisciplina.set(disc, []);
    byDisciplina.get(disc)!.push(t);
  });

  // ── Compute discipline stats ───────────────────────────────────────────────
  const disciplineStats: DisciplineStats[] = [];

  byDisciplina.forEach((tops, nome) => {
    const estudados = tops.filter(t => t.totalEstudos > 0).length;
    const totalEstudos = tops.reduce((s, t) => s + t.totalEstudos, 0);
    const totalQuestoes = tops.reduce((s, t) => s + t.totalQuestoes, 0);
    const questoesRespondidas = tops.reduce((s, t) => s + t.questoesRespondidas, 0);
    const questoesAcertadas = tops.reduce((s, t) => s + t.questoesAcertadas, 0);

    const daysStudyArr = tops.map(t => daysSince(t.ultimoEstudo)).filter(d => d !== Infinity);
    const daysQuestArr = tops.map(t => daysSince(t.ultimaQuestao)).filter(d => d !== Infinity);

    const tempos = tops
      .filter(t => t.mediaTempoResposta != null && t.mediaTempoResposta! > 0)
      .map(t => t.mediaTempoResposta!);
    const avgTempoResposta = tempos.length > 0
      ? tempos.reduce((s, v) => s + v, 0) / tempos.length
      : null;

    const dificuldade: Record<string, DiffAgg> = {};
    tops.forEach(t => {
      if (!t.dificuldadeRespostas) return;
      Object.entries(t.dificuldadeRespostas).forEach(([key, val]) => {
        if (!dificuldade[key]) dificuldade[key] = { total: 0, corretas: 0 };
        dificuldade[key].total += val.total;
        dificuldade[key].corretas += val.corretas;
      });
    });

    disciplineStats.push({
      nome,
      topicos: tops,
      totalTopicos: tops.length,
      estudados,
      totalQuestoes,
      questoesRespondidas,
      questoesAcertadas,
      totalEstudos,
      coverageRate: tops.length > 0 ? estudados / tops.length : 0,
      bankCoverageRate: totalQuestoes > 0 ? questoesRespondidas / totalQuestoes : 0,
      performanceRate: questoesRespondidas > 0 ? questoesAcertadas / questoesRespondidas : null,
      daysSinceLastStudy: daysStudyArr.length > 0 ? Math.min(...daysStudyArr) : Infinity,
      daysSinceLastQuestion: daysQuestArr.length > 0 ? Math.min(...daysQuestArr) : Infinity,
      avgTempoResposta,
      dificuldade,
    });
  });

  disciplineStats.sort((a, b) => b.totalTopicos - a.totalTopicos);

  // ── Per-discipline insights ────────────────────────────────────────────────
  const insights: EditalInsight[] = [];

  disciplineStats.forEach(disc => {
    const diffRate = (key: string): number | null => {
      const d = disc.dificuldade[key];
      return d && d.total > 0 ? d.corretas / d.total : null;
    };

    const facilRate   = diffRate('FACIL');
    const mediaRate   = diffRate('MEDIA');
    const dificilRate = diffRate('DIFICIL');
    const chuteTotal  = disc.dificuldade['CHUTE']?.total ?? 0;
    const chuteRate   = disc.questoesRespondidas > 0 ? chuteTotal / disc.questoesRespondidas : 0;
    const diffLine = [
      facilRate  !== null ? `Fácil: ${pct(facilRate)}`   : null,
      mediaRate  !== null ? `Médio: ${pct(mediaRate)}`    : null,
      dificilRate !== null ? `Difícil: ${pct(dificilRate)}` : null,
    ].filter(Boolean).join(' · ');

    // ── CRITICAL: Never started ──────────────────────────────────────────────
    if (disc.estudados === 0 && disc.questoesRespondidas === 0) {
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: 'Não iniciada',
        detail: `${disc.totalTopicos} tópico${disc.totalTopicos !== 1 ? 's' : ''} sem estudo ou questões respondidas.`,
        subInsights: disc.totalQuestoes > 0
          ? [{ icon: <FlaskConical className="w-3 h-3" />, text: `${disc.totalQuestoes} questões disponíveis no banco — ainda não exploradas.` }]
          : [],
        action: 'Revisão teórica',
        urgency: 10,
      });
      return;
    }

    // ── CRITICAL: Abandoned (started, then dropped >60d) ──────────────────────
    if (disc.estudados > 0 && disc.daysSinceLastStudy > 60 && disc.daysSinceLastQuestion > 60) {
      const sub: SubInsight[] = [];
      if (disc.performanceRate !== null)
        sub.push({ icon: <Target className="w-3 h-3" />, text: `Última taxa de acerto registrada: ${pct(disc.performanceRate)}.` });
      sub.push({ icon: <Clock className="w-3 h-3" />, text: `Sem atividade há ${Math.min(disc.daysSinceLastStudy, disc.daysSinceLastQuestion)}d. Alto risco de esquecimento.` });
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: `Disciplina interrompida há mais de ${Math.min(disc.daysSinceLastStudy, disc.daysSinceLastQuestion)}d`,
        detail: 'Conteúdo anteriormente iniciado mas sem nenhuma atividade recente.',
        subInsights: sub,
        action: 'Bateria de questões',
        urgency: 9,
      });
      return;
    }

    // ── CRITICAL: Very low performance (with sample ≥5) ───────────────────────
    if (disc.performanceRate !== null && disc.performanceRate < 0.45 && disc.questoesRespondidas >= 5) {
      const sub: SubInsight[] = [];
      if (diffLine)
        sub.push({ icon: <BarChart2 className="w-3 h-3" />, text: diffLine });
      if (chuteRate > 0.15)
        sub.push({ icon: <Zap className="w-3 h-3" />, text: `${pct(chuteRate)} das respostas em modo chute — insegurança conceitual.` });
      if (disc.totalEstudos < 3 && disc.questoesRespondidas > 5)
        sub.push({ icon: <Brain className="w-3 h-3" />, text: 'Pouca base teórica registrada. Revise o conteúdo antes de novas questões.' });
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: `Taxa de acerto crítica: ${pct(disc.performanceRate)}`,
        detail: `${disc.questoesAcertadas} de ${disc.questoesRespondidas} corretas. Revisão da base teórica antes de nova bateria.`,
        subInsights: sub,
        action: 'Revisão teórica',
        urgency: 9,
      });
      return;
    }

    // ── CRITICAL: High chute rate + weak performance ──────────────────────────
    if (chuteRate > 0.25 && disc.performanceRate !== null && disc.performanceRate < 0.6 && disc.questoesRespondidas >= 4) {
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: `Padrão de chute: ${pct(chuteRate)} das respostas`,
        detail: 'Indica insegurança estrutural no conteúdo — não apenas dificuldade pontual.',
        subInsights: [
          { icon: <Target className="w-3 h-3" />, text: `Taxa de acerto geral: ${pct(disc.performanceRate)}.` },
          { icon: <Brain className="w-3 h-3" />, text: 'Resolver questões comentadas para mapear lacunas específicas.' },
        ],
        action: 'Revisão teórica',
        urgency: 8,
      });
      return;
    }

    // ── CRITICAL: High study volume, zero practice ────────────────────────────
    if (disc.totalEstudos >= 5 && disc.questoesRespondidas <= 2 && disc.coverageRate > 0.3) {
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: 'Estudo sem prática — teoria não testada',
        detail: `${disc.totalEstudos} sessões registradas, apenas ${disc.questoesRespondidas} questão${disc.questoesRespondidas !== 1 ? 'ões' : ''} respondida${disc.questoesRespondidas !== 1 ? 's' : ''}.`,
        subInsights: disc.totalQuestoes > 0
          ? [{ icon: <FlaskConical className="w-3 h-3" />, text: `${disc.totalQuestoes} questões disponíveis ainda não exploradas.` }]
          : [],
        action: 'Bateria de questões',
        urgency: 8,
      });
      return;
    }

    // ── CRITICAL: Low coverage + poor performance ─────────────────────────────
    if (disc.coverageRate < 0.4 && disc.performanceRate !== null && disc.performanceRate < 0.55) {
      const nao = disc.totalTopicos - disc.estudados;
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: 'Cobertura e desempenho insuficientes',
        detail: `${nao} tópico${nao !== 1 ? 's' : ''} não estudado${nao !== 1 ? 's' : ''}. Taxa de acerto: ${pct(disc.performanceRate)}.`,
        subInsights: [
          { icon: <Layers className="w-3 h-3" />, text: `Cobertura atual: ${pct(disc.coverageRate)} dos tópicos do edital.` },
        ],
        action: 'Revisão teórica',
        urgency: 8,
      });
      return;
    }

    // ── ATTENTION: False security (good on FACIL, weak on MEDIA/DIFICIL) ──────
    const hasFalseSecurity =
      facilRate !== null && facilRate >= 0.7 &&
      ((mediaRate !== null && mediaRate < 0.5) || (dificilRate !== null && dificilRate < 0.45));

    if (hasFalseSecurity && disc.performanceRate !== null) {
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Falsa segurança: ${pct(disc.performanceRate)} geral, mas fraco em médio/difícil`,
        detail: 'Taxa geral inflada por questões fáceis. Lacunas em níveis mais exigentes.',
        subInsights: [
          { icon: <BarChart2 className="w-3 h-3" />, text: diffLine || '—' },
          { icon: <Eye className="w-3 h-3" />, text: 'Priorize questões de nível médio e difícil para calibrar com a prova real.' },
        ],
        action: 'Bateria de questões',
        urgency: 7,
      });
      return;
    }

    // ── ATTENTION: Practicing without recent theory ───────────────────────────
    const practicingWithoutStudy =
      disc.daysSinceLastQuestion < 14 &&
      (disc.daysSinceLastStudy > 45 || disc.daysSinceLastStudy === Infinity) &&
      disc.questoesRespondidas >= 3;

    if (practicingWithoutStudy) {
      const sub: SubInsight[] = [
        { icon: <Clock className="w-3 h-3" />, text: `Última questão há ${disc.daysSinceLastQuestion}d. Último estudo teórico: ${disc.daysSinceLastStudy === Infinity ? 'nunca registrado' : `há ${disc.daysSinceLastStudy}d`}.` },
      ];
      if (disc.performanceRate !== null && disc.performanceRate < 0.65)
        sub.push({ icon: <Brain className="w-3 h-3" />, text: 'Performance abaixo de 65% sugere que a base teórica não está consolidada.' });
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: 'Praticando sem embasamento teórico atualizado',
        detail: 'Resolvendo questões sem revisão de conteúdo. Risco de fixar erros por memorização.',
        subInsights: sub,
        action: 'Revisão teórica',
        urgency: 6,
      });
      return;
    }

    // ── ATTENTION: Good performance but content is going stale ────────────────
    if (
      disc.performanceRate !== null &&
      disc.performanceRate >= 0.65 &&
      disc.daysSinceLastStudy > 30 &&
      disc.daysSinceLastStudy !== Infinity
    ) {
      const days = disc.daysSinceLastStudy;
      const sub: SubInsight[] = [
        { icon: <Activity className="w-3 h-3" />, text: `Performance: ${pct(disc.performanceRate)} — sólida, mas retenção decai sem revisão.` },
      ];
      if (disc.bankCoverageRate < 0.5 && disc.totalQuestoes > 0)
        sub.push({ icon: <FlaskConical className="w-3 h-3" />, text: `${pct(1 - disc.bankCoverageRate)} do banco de questões ainda inexplorado — revisão via prática é eficiente.` });
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Revisão necessária — sem estudo há ${days}d`,
        detail: 'Conteúdo bem dominado, mas o intervalo compromete a retenção de longo prazo.',
        subInsights: sub,
        action: 'Revisão programada',
        urgency: days > 45 ? 6 : 5,
      });
      return;
    }

    // ── ATTENTION: Partial coverage ───────────────────────────────────────────
    if (disc.coverageRate >= 0.3 && disc.coverageRate < 0.75) {
      const nao = disc.totalTopicos - disc.estudados;
      const sub: SubInsight[] = [
        { icon: <Layers className="w-3 h-3" />, text: `${nao} tópico${nao !== 1 ? 's' : ''} não coberto${nao !== 1 ? 's' : ''} de ${disc.totalTopicos} no edital.` },
      ];
      if (disc.performanceRate !== null)
        sub.push({ icon: <Target className="w-3 h-3" />, text: `Taxa de acerto nos tópicos estudados: ${pct(disc.performanceRate)}.` });
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Cobertura parcial: ${pct(disc.coverageRate)} dos tópicos`,
        detail: 'Ampliar cobertura antes da prova reduz o risco de questões em tópicos não estudados.',
        subInsights: sub,
        action: 'Ampliar cobertura',
        urgency: 5,
      });
      return;
    }

    // ── ATTENTION: Slow response time ─────────────────────────────────────────
    if (disc.avgTempoResposta !== null && disc.avgTempoResposta > 100 && disc.questoesRespondidas >= 5) {
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Tempo de resposta elevado: ${sToMin(disc.avgTempoResposta)}/questão`,
        detail: 'Mesmo com bom desempenho, lentidão compromete a gestão do tempo na prova real.',
        subInsights: [
          { icon: <Timer className="w-3 h-3" />, text: `Tempo médio: ${sToMin(disc.avgTempoResposta)} por questão. Ideal: <90s.` },
          { icon: <Target className="w-3 h-3" />, text: `Taxa de acerto: ${disc.performanceRate !== null ? pct(disc.performanceRate) : '—'}.` },
        ],
        action: 'Simulado',
        urgency: 4,
      });
      return;
    }

    // ── ATTENTION: No recent practice ─────────────────────────────────────────
    if (disc.daysSinceLastQuestion > 21 && disc.daysSinceLastQuestion !== Infinity && disc.performanceRate !== null) {
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Sem prática há ${disc.daysSinceLastQuestion}d`,
        detail: 'Retome a resolução de questões para manter o ritmo e consolidar a retenção.',
        subInsights: disc.totalQuestoes > 0 && disc.bankCoverageRate < 0.6
          ? [{ icon: <FlaskConical className="w-3 h-3" />, text: `${pct(1 - disc.bankCoverageRate)} do banco de questões ainda não explorado.` }]
          : [],
        action: 'Bateria de questões',
        urgency: 4,
      });
      return;
    }

    // ── STRENGTH: Well covered + good performance ─────────────────────────────
    if (disc.coverageRate >= 0.75) {
      const sub: SubInsight[] = [];
      if (diffLine)
        sub.push({ icon: <BarChart2 className="w-3 h-3" />, text: diffLine });
      if (disc.bankCoverageRate > 0.8 && disc.totalQuestoes > 0)
        sub.push({ icon: <FlaskConical className="w-3 h-3" />, text: `${pct(disc.bankCoverageRate)} do banco explorado. Considere provas de outras bancas.` });
      if (disc.avgTempoResposta !== null && disc.avgTempoResposta < 60 && disc.questoesRespondidas >= 5)
        sub.push({ icon: <Timer className="w-3 h-3" />, text: `Ritmo ágil: ${sToMin(disc.avgTempoResposta)}/questão.` });

      const perfStr = disc.performanceRate !== null ? `${pct(disc.performanceRate)} de acertos` : 'cobertura completa';
      insights.push({
        severity: 'strength',
        disciplina: disc.nome,
        message: `Sólido: ${perfStr}`,
        detail: `${pct(disc.coverageRate)} dos tópicos cobertos.${disc.daysSinceLastStudy < 14 ? ' Revisão recente.' : ''}`,
        subInsights: sub.length > 0 ? sub : undefined,
        action: disc.daysSinceLastStudy > 30 ? 'Revisão programada' : 'Manter cadência',
        urgency: 1,
      });
    }
  });

  // Sort by severity, then urgency
  const sevOrder = { critical: 0, attention: 1, strength: 2 };
  insights.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || b.urgency - a.urgency);

  // ── Macro patterns ─────────────────────────────────────────────────────────
  const macroPatterns: MacroPattern[] = [];

  const totalTopicos = topicos.length;
  const totalEstudados = topicos.filter(t => t.totalEstudos > 0).length;
  const totalQuestoes = topicos.reduce((s, t) => s + t.totalQuestoes, 0);
  const totalRespondidas = topicos.reduce((s, t) => s + t.questoesRespondidas, 0);
  const totalAcertadas = topicos.reduce((s, t) => s + t.questoesAcertadas, 0);
  const globalBankRate = totalQuestoes > 0 ? totalRespondidas / totalQuestoes : 0;
  const globalPerf = totalRespondidas > 0 ? totalAcertadas / totalRespondidas : null;

  const discsNeverStarted = disciplineStats.filter(d => d.estudados === 0 && d.questoesRespondidas === 0);
  const discsActive = disciplineStats.filter(d => d.daysSinceLastStudy < 14 || d.daysSinceLastQuestion < 14);
  const discsStale = disciplineStats.filter(d => d.daysSinceLastStudy > 30 && d.daysSinceLastStudy !== Infinity && d.estudados > 0);
  const discsPracticingWithoutStudy = disciplineStats.filter(d =>
    d.daysSinceLastQuestion < 14 && (d.daysSinceLastStudy > 45 || d.daysSinceLastStudy === Infinity) && d.questoesRespondidas >= 3
  );
  const discsStudyingWithoutPractice = disciplineStats.filter(d =>
    d.totalEstudos >= 4 && d.questoesRespondidas <= 2 && d.coverageRate > 0.25
  );
  const discsChuteHeavy = disciplineStats.filter(d => {
    const ct = d.dificuldade['CHUTE']?.total ?? 0;
    return d.questoesRespondidas > 0 && ct / d.questoesRespondidas > 0.2;
  });

  if (discsNeverStarted.length >= 2) {
    macroPatterns.push({
      type: 'warning',
      icon: <ShieldAlert className="w-4 h-4" />,
      title: `${discsNeverStarted.length} disciplina${discsNeverStarted.length !== 1 ? 's' : ''} sem nenhuma atividade`,
      detail: `${discsNeverStarted.map(d => d.nome).join(', ')} — lacunas totais no conteúdo programático.`,
    });
  }

  if (discsStudyingWithoutPractice.length >= 2) {
    macroPatterns.push({
      type: 'warning',
      icon: <Brain className="w-4 h-4" />,
      title: 'Ciclo desequilibrado: teoria sem prática',
      detail: `${discsStudyingWithoutPractice.length} disciplina${discsStudyingWithoutPractice.length !== 1 ? 's' : ''} com alto volume teórico e baixíssima resolução de questões.`,
    });
  }

  if (discsPracticingWithoutStudy.length >= 2) {
    macroPatterns.push({
      type: 'warning',
      icon: <Zap className="w-4 h-4" />,
      title: 'Praticando sem base teórica atualizada',
      detail: `${discsPracticingWithoutStudy.length} disciplina${discsPracticingWithoutStudy.length !== 1 ? 's' : ''} com questões recentes mas sem estudo teórico há mais de 45 dias.`,
    });
  }

  if (discsChuteHeavy.length >= 2) {
    macroPatterns.push({
      type: 'warning',
      icon: <FlaskConical className="w-4 h-4" />,
      title: 'Padrão de chute em múltiplas disciplinas',
      detail: 'Alta taxa de respostas no modo chute indica insegurança conceitual generalizada, não apenas dificuldade pontual.',
    });
  }

  if (discsStale.length >= 3 && discsActive.length < 2) {
    macroPatterns.push({
      type: 'warning',
      icon: <Clock className="w-4 h-4" />,
      title: 'Ciclo de estudos paralisado',
      detail: `${discsStale.length} disciplina${discsStale.length !== 1 ? 's' : ''} sem atividade há mais de 30 dias. Retome o ciclo de revisões.`,
    });
  }

  if (globalBankRate < 0.25 && totalQuestoes >= 20) {
    macroPatterns.push({
      type: 'info',
      icon: <FlaskConical className="w-4 h-4" />,
      title: `Banco de questões subexplorado: ${pct(globalBankRate)} utilizado`,
      detail: `${totalQuestoes - totalRespondidas} questões disponíveis não respondidas. Resolver mais questões é o principal alavancador de desempenho.`,
    });
  }

  if (discsActive.length >= Math.ceil(disciplineStats.length * 0.6) && discsNeverStarted.length === 0) {
    macroPatterns.push({
      type: 'positive',
      icon: <Activity className="w-4 h-4" />,
      title: 'Ciclo de estudos ativo',
      detail: `${discsActive.length} de ${disciplineStats.length} disciplinas com atividade recente. Consistência é o maior diferencial.`,
    });
  }

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const strengthCount = insights.filter(i => i.severity === 'strength').length;

  if (criticalCount === 0 && strengthCount >= Math.ceil(disciplineStats.length * 0.6) && disciplineStats.length >= 2) {
    macroPatterns.push({
      type: 'positive',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Prontidão para simulado',
      detail: 'Nenhum ponto crítico detectado. Boa fase para um simulado completo para calibrar desempenho geral.',
    });
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations: { label: string; action: ActionLabel | null; urgency: number }[] = [];

  const criticalInsights = insights.filter(i => i.severity === 'critical');
  const attentionInsights = insights.filter(i => i.severity === 'attention');
  const strengthInsights = insights.filter(i => i.severity === 'strength');

  const notStarted  = criticalInsights.filter(i => i.message === 'Não iniciada');
  const lowPerf     = criticalInsights.filter(i => i.message.includes('Taxa de acerto crítica'));
  const abandoned   = criticalInsights.filter(i => i.message.includes('interrompida'));
  const studyNoPrac = criticalInsights.filter(i => i.message.includes('sem prática'));
  const chuteIssues = criticalInsights.filter(i => i.message.includes('chute'));

  if (notStarted.length > 0)
    recommendations.push({ label: `Iniciar estudos: ${notStarted.map(i => i.disciplina).join(', ')}. Base teórica antes de questões.`, action: 'Revisão teórica', urgency: 10 });
  if (lowPerf.length > 0)
    recommendations.push({ label: `Revisão intensiva: ${lowPerf.map(i => i.disciplina).join(', ')}. Teoria + bateria comentada.`, action: 'Revisão teórica', urgency: 9 });
  if (abandoned.length > 0)
    recommendations.push({ label: `Retomar: ${abandoned.map(i => i.disciplina).join(', ')} — conteúdo iniciado e interrompido.`, action: 'Bateria de questões', urgency: 8 });
  if (chuteIssues.length > 0)
    recommendations.push({ label: `Reforço conceitual: ${chuteIssues.map(i => i.disciplina).join(', ')}. Questões comentadas para mapear lacunas.`, action: 'Bateria de questões', urgency: 8 });
  if (studyNoPrac.length > 0)
    recommendations.push({ label: `Consolidar o que foi estudado: ${studyNoPrac.map(i => i.disciplina).join(', ')}.`, action: 'Bateria de questões', urgency: 7 });

  const falseSec = attentionInsights.filter(i => i.message.includes('Falsa segurança'));
  if (falseSec.length > 0)
    recommendations.push({ label: `Aprofundar em questões médias/difíceis: ${falseSec.map(i => i.disciplina).join(', ')}.`, action: 'Bateria de questões', urgency: 7 });

  const staleGood = attentionInsights.filter(i => i.message.includes('Revisão necessária'));
  if (staleGood.length > 0)
    recommendations.push({ label: `Revisão programada: ${staleGood.map(i => i.disciplina).join(', ')} — boa performance, mas conteúdo envelhecendo.`, action: 'Revisão programada', urgency: 5 });

  const partialCov = attentionInsights.filter(i => i.message.includes('Cobertura parcial'));
  if (partialCov.length > 0)
    recommendations.push({ label: `Ampliar cobertura: ${partialCov.map(i => i.disciplina).join(', ')}.`, action: 'Ampliar cobertura', urgency: 5 });

  if (criticalCount === 0 && attentionInsights.length <= 1 && strengthInsights.length > 0)
    recommendations.push({ label: 'Consolidar com simulado completo para calibrar desempenho geral.', action: 'Simulado', urgency: 4 });

  if (recommendations.length === 0)
    recommendations.push({ label: 'Manter cadência de estudos e revisões periódicas.', action: 'Manter cadência', urgency: 1 });

  recommendations.sort((a, b) => b.urgency - a.urgency);

  // Global avg tempo
  const temposGlobal = topicos.filter(t => t.mediaTempoResposta != null && t.mediaTempoResposta! > 0).map(t => t.mediaTempoResposta!);
  const globalAvgTempo = temposGlobal.length > 0 ? temposGlobal.reduce((s, v) => s + v, 0) / temposGlobal.length : null;

  return {
    summary: {
      totalTopicos, totalEstudados, totalQuestoes,
      coverageRate: totalTopicos > 0 ? totalEstudados / totalTopicos : 0,
      totalRespondidas, totalAcertadas,
      performanceRate: globalPerf,
      bankCoverageRate: globalBankRate,
      globalAvgTempo,
    },
    disciplineStats,
    insights,
    macroPatterns,
    recommendations,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr));
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return 'Nunca';
  const d = daysSince(dateStr);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Ontem';
  if (d < 7) return `${d}d atrás`;
  return formatDate(dateStr);
};

// ─── UI Components ────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<ActionLabel, string> = {
  'Bateria de questões':  'text-indigo-500 bg-indigo-50 border-indigo-100',
  'Revisão teórica':      'text-amber-600  bg-amber-50  border-amber-100',
  'Revisão programada':   'text-sky-600    bg-sky-50    border-sky-100',
  'Simulado':             'text-violet-600 bg-violet-50 border-violet-100',
  'Manter cadência':      'text-emerald-600 bg-emerald-50 border-emerald-100',
  'Ampliar cobertura':    'text-orange-600 bg-orange-50 border-orange-100',
};

const InsightCard = ({ insight }: { insight: EditalInsight }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMore = insight.subInsights && insight.subInsights.length > 0;

  const cfg = {
    critical:  { border: 'border-red-100',     bg: 'bg-red-50/40',     dot: 'bg-red-400',     badge: 'text-red-600   bg-red-50   border-red-100',   label: 'Crítico' },
    attention: { border: 'border-amber-100',   bg: 'bg-amber-50/30',   dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 border-amber-100', label: 'Atenção' },
    strength:  { border: 'border-emerald-100', bg: 'bg-emerald-50/20', dot: 'bg-emerald-400', badge: 'text-emerald-700 bg-emerald-50 border-emerald-100', label: 'Sólido' },
  }[insight.severity];

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3.5`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{insight.disciplina}</span>
            <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
            {insight.action && (
              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_STYLES[insight.action]}`}>
                → {insight.action}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-700 leading-snug">{insight.message}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{insight.detail}</p>

          {hasMore && (
            <>
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: expanded ? `${insight.subInsights!.length * 44}px` : '0' }}
              >
                <ul className="mt-2 space-y-1.5 pt-2 border-t border-slate-200/60">
                  {insight.subInsights!.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                      <span className="flex-shrink-0 mt-0.5 opacity-40">{s.icon}</span>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {expanded ? 'Ocultar ↑' : 'Detalhes ↓'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MacroPatternChip = ({ pattern }: { pattern: MacroPattern }) => {
  const [open, setOpen] = useState(false);
  const cfg = {
    warning:  { border: 'border-red-100',     bg: 'bg-red-50/40',     text: 'text-red-600',     icon: 'text-red-400' },
    info:     { border: 'border-indigo-100',  bg: 'bg-indigo-50/30',  text: 'text-indigo-600',  icon: 'text-indigo-400' },
    positive: { border: 'border-emerald-100', bg: 'bg-emerald-50/30', text: 'text-emerald-700', icon: 'text-emerald-400' },
    neutral:  { border: 'border-slate-100',   bg: 'bg-slate-50',      text: 'text-slate-600',   icon: 'text-slate-400' },
  }[pattern.type];

  return (
    <button
      onClick={() => setOpen(!open)}
      className={`w-full text-left rounded-lg border ${cfg.border} ${cfg.bg} px-3.5 py-3 transition-all hover:opacity-90`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`flex-shrink-0 mt-0.5 ${cfg.icon}`}>{pattern.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold ${cfg.text} leading-snug`}>{pattern.title}</p>
          <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: open ? '80px' : '0' }}>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{pattern.detail}</p>
          </div>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-300 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
};

const SummaryBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => (
  <div>
    <div className="flex justify-between items-baseline mb-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[11px] font-bold text-slate-600">{value}/{total}</span>
    </div>
    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%' }}
      />
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const ConcursoCargoDetailPage = () => {
  const { concursoId, cargoId } = useParams<{ concursoId: string; cargoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concurso, setConcurso] = useState<Types.ConcursoDetailDto | null>(null);
  const [cargo, setCargo] = useState<Types.ConcursoCargoSummaryDto | null>(null);

  const groupedTopicos = useMemo(() => {
    if (!cargo?.topicos) return {};
    const g: Record<string, Record<string, Types.SubtemaSummaryDto[]>> = {};
    cargo.topicos.forEach(t => {
      const disc = t.disciplinaNome || 'Outras Disciplinas';
      const tema = t.temaNome || 'Geral';
      if (!g[disc]) g[disc] = {};
      if (!g[disc][tema]) g[disc][tema] = [];
      g[disc][tema].push(t);
    });
    return g;
  }, [cargo]);

  const analysis = useMemo<EditalAnalysis | null>(
    () => (!cargo?.topicos || cargo.topicos.length === 0 ? null : analyzeEdital(cargo.topicos)),
    [cargo]
  );

  useEffect(() => {
    const load = async () => {
      if (!concursoId || !cargoId) return;
      setLoading(true); setError(null);
      try {
        const data = await concursoService.getById(Number(concursoId));
        setConcurso(data);
        const found = data.cargos.find(c => c.cargoId === Number(cargoId));
        if (!found) setError('Cargo não encontrado neste concurso.');
        else setCargo(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados.');
      } finally { setLoading(false); }
    };
    load();
  }, [concursoId, cargoId]);

  const isValidUrl = (s: string) => {
    try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; }
  };

  if (loading) return (
    <div className="space-y-8 pb-20">
      <Header title="Mapa do Edital" />
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 tracking-tight">Carregando edital...</p>
      </div>
    </div>
  );

  if (error || !concurso || !cargo) return (
    <div className="space-y-8 pb-20">
      <Header title="Mapa do Edital" />
      <div className="bg-white border border-red-100 rounded-xl p-10 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">{error || 'Concurso não encontrado.'}</p>
        <button onClick={() => navigate('/concursos')} className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Voltar para Concursos</button>
      </div>
    </div>
  );

  const criticalInsights  = analysis?.insights.filter(i => i.severity === 'critical')  ?? [];
  const attentionInsights = analysis?.insights.filter(i => i.severity === 'attention') ?? [];
  const strengthInsights  = analysis?.insights.filter(i => i.severity === 'strength')  ?? [];

  return (
    <div className="space-y-8 pb-20">
      <Header
        title="Mapa do Edital"
        actions={
          <button onClick={() => navigate('/concursos')} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Concursos
          </button>
        }
      />

      {/* Identity strip */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100/60">{concurso.banca.nome}</span>
            <span className="text-xs font-semibold text-slate-400 tracking-tight">{concurso.ano}</span>
            {concurso.edital && isValidUrl(concurso.edital) && (
              <a href={concurso.edital} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors ml-auto">
                <LinkIcon className="w-3.5 h-3.5" /> Visualizar Edital
              </a>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">{concurso.instituicao.nome}</h1>
          <p className="text-sm font-semibold text-slate-400 tracking-tight">{concurso.instituicao.area}</p>
        </div>
        <div className="px-6 py-4 sm:px-8 sm:py-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cargo</p>
            <p className="text-sm font-bold text-slate-800 leading-snug">{cargo.cargoNome}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nível</p>
            <p className="text-sm font-bold text-slate-800">{formatNivel(cargo.nivel)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Área do Cargo</p>
            <p className="text-sm font-bold text-slate-800">{cargo.area || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Data da Prova</p>
            <p className="text-sm font-semibold text-slate-400 italic inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-300" /> A definir
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT: Conteúdo Programático */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Conteúdo Programático</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {cargo.topicos.length} tópico{cargo.topicos.length !== 1 ? 's' : ''} identificados
                </p>
              </div>
              <BookOpen className="w-4 h-4 text-slate-300" />
            </div>

            <div className="divide-y divide-slate-50">
              {Object.keys(groupedTopicos).length === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum tópico cadastrado para este cargo.</p>
                </div>
              ) : Object.entries(groupedTopicos).map(([disciplina, temas]) => (
                <div key={disciplina}>
                  <div className="px-6 py-3 bg-slate-50/50 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500 bg-white px-3 py-1 rounded-full border border-indigo-100/60">{disciplina}</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {Object.entries(temas).map(([tema, subtopicos]) => (
                    <div key={tema} className="px-6 py-4">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <ChevronRight className="w-3 h-3 text-slate-300" /> {tema}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {subtopicos.map(topico => {
                          const studied = topico.totalEstudos > 0;
                          const hasQ = topico.questoesRespondidas > 0;
                          const perfRate = hasQ ? topico.questoesAcertadas / topico.questoesRespondidas : null;
                          return (
                            <div key={topico.id} className="group rounded-lg border border-slate-100 bg-slate-50/20 hover:border-indigo-100 hover:bg-white transition-all duration-200 p-3">
                              <div className="flex items-start gap-2.5">
                                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${studied ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">{topico.nome}</p>
                                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                    {hasQ ? (
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${perfRate! >= 0.7 ? 'text-emerald-600' : perfRate! >= 0.5 ? 'text-amber-600' : 'text-red-500'}`}>
                                        <Target className="w-2.5 h-2.5" />
                                        {topico.questoesAcertadas}/{topico.questoesRespondidas} acertos ({Math.round(perfRate! * 100)}%)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-slate-300 inline-flex items-center gap-1">
                                        <Target className="w-2.5 h-2.5" /> Sem questões respondidas
                                      </span>
                                    )}
                                    {topico.ultimaQuestao && (
                                      <span className="text-[10px] font-medium text-slate-400 inline-flex items-center gap-1">
                                        <BarChart2 className="w-2.5 h-2.5" /> Questão: {formatDateShort(topico.ultimaQuestao)}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-medium inline-flex items-center gap-1 ${studied ? 'text-slate-400' : 'text-slate-300'}`}>
                                      <Clock className="w-2.5 h-2.5" /> Estudo: {formatDateShort(topico.ultimoEstudo)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Análise do Edital */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          {!analysis ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
              <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">Nenhum tópico disponível para análise.</p>
            </div>
          ) : (
            <>
              {/* Macro patterns */}
              {analysis.macroPatterns.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Padrões Detectados</h2>
                    <Activity className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="p-4 space-y-2">
                    {analysis.macroPatterns.map((p, i) => <MacroPatternChip key={i} pattern={p} />)}
                  </div>
                </div>
              )}

              {/* Diagnostic summary */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Diagnóstico Geral</h2>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="p-5">
                  {/* Big 3 numbers */}
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="text-center">
                      <p className="text-2xl font-black tracking-tight leading-none" style={{
                        color: analysis.summary.coverageRate >= 0.75 ? 'oklch(52% 0.14 150)' : analysis.summary.coverageRate >= 0.4 ? 'oklch(58% 0.16 65)' : 'oklch(55% 0.18 25)'
                      }}>{Math.round(analysis.summary.coverageRate * 100)}%</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Cobertura</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                      {analysis.summary.performanceRate !== null ? (
                        <>
                          <p className="text-2xl font-black tracking-tight leading-none" style={{
                            color: analysis.summary.performanceRate >= 0.7 ? 'oklch(52% 0.14 150)' : analysis.summary.performanceRate >= 0.5 ? 'oklch(58% 0.16 65)' : 'oklch(55% 0.18 25)'
                          }}>{Math.round(analysis.summary.performanceRate * 100)}%</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Acertos</p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-black text-slate-200 tracking-tight leading-none">—</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Acertos</p>
                        </>
                      )}
                    </div>
                    <div className="text-center">
                      {analysis.summary.globalAvgTempo !== null ? (
                        <>
                          <p className="text-xl font-black tracking-tight leading-none text-slate-700">{sToMin(analysis.summary.globalAvgTempo)}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Tempo médio</p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-black leading-none" style={{
                            color: criticalInsights.length === 0 ? 'oklch(52% 0.14 150)' : criticalInsights.length <= 2 ? 'oklch(58% 0.16 65)' : 'oklch(55% 0.18 25)'
                          }}>{criticalInsights.length === 0 ? '✓' : criticalInsights.length}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{criticalInsights.length === 0 ? 'Saúde OK' : 'Críticos'}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <SummaryBar
                      label="Tópicos estudados"
                      value={analysis.summary.totalEstudados}
                      total={analysis.summary.totalTopicos}
                      color={analysis.summary.coverageRate >= 0.7 ? 'bg-emerald-400' : analysis.summary.coverageRate >= 0.4 ? 'bg-amber-400' : 'bg-red-400'}
                    />
                    {analysis.summary.totalQuestoes > 0 && (
                      <SummaryBar
                        label="Questões do banco"
                        value={analysis.summary.totalRespondidas}
                        total={analysis.summary.totalQuestoes}
                        color={analysis.summary.bankCoverageRate >= 0.6 ? 'bg-emerald-400' : analysis.summary.bankCoverageRate >= 0.3 ? 'bg-indigo-400' : 'bg-slate-300'}
                      />
                    )}
                    {analysis.summary.totalRespondidas > 0 && (
                      <SummaryBar
                        label="Taxa de acerto"
                        value={analysis.summary.totalAcertadas}
                        total={analysis.summary.totalRespondidas}
                        color={(analysis.summary.performanceRate ?? 0) >= 0.7 ? 'bg-emerald-400' : (analysis.summary.performanceRate ?? 0) >= 0.5 ? 'bg-amber-400' : 'bg-red-400'}
                      />
                    )}
                  </div>

                  {/* Severity count strip */}
                  {(criticalInsights.length + attentionInsights.length + strengthInsights.length) > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className={`text-base font-black ${criticalInsights.length > 0 ? 'text-red-500' : 'text-slate-200'}`}>{criticalInsights.length}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Críticos</p>
                      </div>
                      <div className="border-x border-slate-100">
                        <p className={`text-base font-black ${attentionInsights.length > 0 ? 'text-amber-500' : 'text-slate-200'}`}>{attentionInsights.length}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Atenção</p>
                      </div>
                      <div>
                        <p className={`text-base font-black ${strengthInsights.length > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{strengthInsights.length}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sólidos</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Critical */}
              {criticalInsights.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-red-50 bg-red-50/30 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-red-500">Pontos Críticos · {criticalInsights.length}</h3>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {criticalInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                </div>
              )}

              {/* Attention */}
              {attentionInsights.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-amber-50 bg-amber-50/30 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600">Áreas de Atenção · {attentionInsights.length}</h3>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {attentionInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                </div>
              )}

              {/* Strength */}
              {strengthInsights.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-emerald-50 bg-emerald-50/20 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Pontos Fortes · {strengthInsights.length}</h3>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {strengthInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="bg-white border border-indigo-100/60 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-indigo-50 bg-indigo-50/30 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Próximas Recomendações</h3>
                  </div>
                  <div className="p-4">
                    <ol className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-black text-indigo-500 mt-0.5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-600 leading-relaxed">{rec.label}</p>
                            {rec.action && (
                              <span className={`mt-1 inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${ACTION_STYLES[rec.action]}`}>
                                → {rec.action}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick action */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <button
              onClick={() => navigate(`/provas/executar?concursoId=${concurso.id}&cargoId=${cargo.cargoId}&instituicaoId=${concurso.instituicao.id}`)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm hover:shadow-indigo-200/50 active:scale-[0.98] border border-indigo-700/10"
            >
              Resolver Prova
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcursoCargoDetailPage;