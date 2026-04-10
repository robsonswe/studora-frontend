import React, { useState, useMemo } from 'react';
import * as Types from '@/types';
import { formatNivel } from '@/utils/formatters';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  Sparkles,
  Zap,
  ShieldAlert,
  Activity,
  FlaskConical,
  Timer,
  Layers,
  Eye,
  Brain,
  Calendar,
  Building,
  GraduationCap,
  Briefcase
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

interface DifficultyAggregate {
  key: string;
  label: string;
  total: number;
  corretas: number;
}

interface PriorityTopic {
  nome: string;
  disciplina: string;
  tema: string;
  reason: string;
  reasonType: 'not-started' | 'low-perf' | 'stale' | 'no-practice';
  urgency: number;
  questoesDisponiveis: number;
  perfRate: number | null;
  daysSinceStudy: number;
  daysSinceQuestion: number;
}

// ─── Novas Interfaces de Contexto ──────────────────────────────────────────────

interface EditalContext {
  banca?: Types.BancaSummaryDto;
  instituicao?: Types.InstituicaoSummaryDto;
  areaInstituicao?: string;
  cargoId?: number | string;
  cargoNome?: string;
  areaCargo?: string;
  nivel?: Types.NivelCargo;
}

interface ContextDimStat {
  label: string;
  total: number;
  corretas: number;
  perf: number | null;
}

interface ContextStats {
  banca: ContextDimStat;
  nivel: ContextDimStat;
  areaInst: ContextDimStat;
  areaCargo: ContextDimStat;
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
    daysUntilProva: number | null;
  };
  disciplineStats: DisciplineStats[];
  insights: EditalInsight[];
  macroPatterns: MacroPattern[];
  recommendations: { label: string; action: ActionLabel | null; urgency: number }[];
  difficultyAggregate: DifficultyAggregate[];
  priorityTopics: PriorityTopic[];
  contextStats?: ContextStats;
  context?: EditalContext;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditalAnalysisReportProps {
  topicos: Types.SubtemaSummaryDto[];
  dataProva?: string;
  inscrito?: boolean;
  banca?: Types.BancaSummaryDto;
  instituicao?: Types.InstituicaoSummaryDto;
  areaInstituicao?: string;
  cargoId?: number | string;
  cargoNome?: string;
  areaCargo?: string;
  nivel?: Types.NivelCargo;
}

// ─── Helpers & Analysis Engine ────────────────────────────────────────────────

const daysSince = (dateStr?: string): number => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

const daysUntil = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const sToMin = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}min${Math.round(s % 60) > 0 ? `${Math.round(s % 60)}s` : ''}`;

const analyzeEdital = (topicos: Types.SubtemaSummaryDto[], dataProva?: string, inscrito?: boolean, context?: EditalContext): EditalAnalysis => {
  
  // ── Global Stats ───────────────────────────────────────────────────────────
  const totalTopicos = topicos.length;
  const totalEstudados = topicos.filter(t => (t.totalEstudos ?? 0) > 0).length;
  const totalQuestoes = topicos.reduce((s, t) => s + (t.questaoStats?.total?.totalQuestoes ?? 0), 0);
  const totalRespondidas = topicos.reduce((s, t) => s + (t.questaoStats?.total?.respondidas ?? 0), 0);
  const totalAcertadas = topicos.reduce((s, t) => s + (t.questaoStats?.total?.acertadas ?? 0), 0);
  const globalBankRate = totalQuestoes > 0 ? totalRespondidas / totalQuestoes : 0;
  const globalPerf = totalRespondidas > 0 ? totalAcertadas / totalRespondidas : null;

  // ── Compute context stats ──────────────────────────────────────────────────
  let bancaTotal = 0, bancaCertas = 0;
  let nivelTotal = 0, nivelCertas = 0;
  let areaInstTotal = 0, areaInstCertas = 0;
  let areaCargoTotal = 0, areaCargoCertas = 0;

  if (context) {
    topicos.forEach(t => {
      const qStats = t.questaoStats;
      if (!qStats) return;

      if (context.banca?.id && qStats.porBanca?.[context.banca.id]) {
        bancaTotal += qStats.porBanca[context.banca.id].respondidas ?? 0;
        bancaCertas += qStats.porBanca[context.banca.id].acertadas ?? 0;
      }
      if (context.nivel && qStats.porNivel?.[context.nivel]) {
        nivelTotal += qStats.porNivel[context.nivel].respondidas ?? 0;
        nivelCertas += qStats.porNivel[context.nivel].acertadas ?? 0;
      }
      if (context.areaInstituicao && qStats.porAreaInstituicao?.[context.areaInstituicao]) {
        areaInstTotal += qStats.porAreaInstituicao[context.areaInstituicao].respondidas ?? 0;
        areaInstCertas += qStats.porAreaInstituicao[context.areaInstituicao].acertadas ?? 0;
      }
      if (context.areaCargo && qStats.porAreaCargo?.[context.areaCargo]) {
        areaCargoTotal += qStats.porAreaCargo[context.areaCargo].respondidas ?? 0;
        areaCargoCertas += qStats.porAreaCargo[context.areaCargo].acertadas ?? 0;
      }
    });
  }

  const contextStats: ContextStats = {
    banca: { label: context?.banca?.nome || 'Banca', total: bancaTotal, corretas: bancaCertas, perf: bancaTotal > 0 ? bancaCertas / bancaTotal : null },
    nivel: { label: context?.nivel ? formatNivel(context.nivel) : 'Nível', total: nivelTotal, corretas: nivelCertas, perf: nivelTotal > 0 ? nivelCertas / nivelTotal : null },
    areaInst: { label: context?.areaInstituicao || 'Área (Inst.)', total: areaInstTotal, corretas: areaInstCertas, perf: areaInstTotal > 0 ? areaInstCertas / areaInstTotal : null },
    areaCargo: { label: context?.areaCargo || 'Área (Cargo)', total: areaCargoTotal, corretas: areaCargoCertas, perf: areaCargoTotal > 0 ? areaCargoCertas / areaCargoTotal : null },
  };

  // ── Group by disciplina ────────────────────────────────────────────────────
  const byDisciplina = new Map<string, Types.SubtemaSummaryDto[]>();
  topicos.forEach(t => {
    const disc = t.disciplina?.nome || 'Geral';
    if (!byDisciplina.has(disc)) byDisciplina.set(disc, []);
    byDisciplina.get(disc)!.push(t);
  });

  // ── Compute discipline stats ───────────────────────────────────────────────
  const disciplineStats: DisciplineStats[] = [];

  byDisciplina.forEach((tops, nome) => {
    const estudados = tops.filter(t => (t.totalEstudos ?? 0) > 0).length;
    const discTotalEstudos = tops.reduce((s, t) => s + (t.totalEstudos ?? 0), 0);
    const discTotalQuestoes = tops.reduce((s, t) => s + (t.questaoStats?.total?.totalQuestoes ?? 0), 0);
    const questoesRespondidas = tops.reduce((s, t) => s + (t.questaoStats?.total?.respondidas ?? 0), 0);
    const questoesAcertadas = tops.reduce((s, t) => s + (t.questaoStats?.total?.acertadas ?? 0), 0);

    const daysStudyArr = tops.map(t => daysSince(t.ultimoEstudo ?? undefined)).filter(d => d !== Infinity);
    const daysQuestArr = tops.map(t => daysSince(t.questaoStats?.total.ultimaQuestao ?? undefined)).filter(d => d !== Infinity);

    const tempos = tops
      .filter(t => t.questaoStats?.total?.mediaTempoResposta != null && t.questaoStats?.total?.mediaTempoResposta! > 0)
      .map(t => t.questaoStats?.total?.mediaTempoResposta!);
    const avgTempoResposta = tempos.length > 0
      ? tempos.reduce((s, v) => s + v, 0) / tempos.length
      : null;

    const dificuldade: Record<string, DiffAgg> = {};
    tops.forEach(t => {
      if (!t.questaoStats?.total?.dificuldade) return;
      Object.entries(t.questaoStats?.total?.dificuldade).forEach(([key, val]) => {
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
      totalQuestoes: discTotalQuestoes,
      questoesRespondidas,
      questoesAcertadas,
      totalEstudos: discTotalEstudos,
      coverageRate: tops.length > 0 ? estudados / tops.length : 0,
      bankCoverageRate: discTotalQuestoes > 0 ? questoesRespondidas / discTotalQuestoes : 0,
      performanceRate: questoesRespondidas > 0 ? questoesAcertadas / questoesRespondidas : null,
      daysSinceLastStudy: daysStudyArr.length > 0 ? Math.min(...daysStudyArr) : Infinity,
      daysSinceLastQuestion: daysQuestArr.length > 0 ? Math.min(...daysQuestArr) : Infinity,
      avgTempoResposta,
      dificuldade,
    });
  });

  disciplineStats.sort((a, b) => b.totalTopicos - a.totalTopicos);

  // ── Insights ───────────────────────────────────────────────────────────────
  const insights: EditalInsight[] = [];

  // Context-specific Insights
  if (context?.banca && contextStats.banca.perf !== null && globalPerf !== null) {
    const bPerf = contextStats.banca.perf;
    const diff = bPerf - globalPerf;
    const isRelevantSample = contextStats.banca.total >= 10;

    if (isRelevantSample && diff <= -0.1) {
      insights.push({
        severity: 'attention',
        disciplina: 'Perfil da Prova',
        message: `Dificuldade com a banca ${context.banca.nome}`,
        detail: `Seu desempenho na banca (${pct(bPerf)}) é notavelmente menor que sua média geral (${pct(globalPerf)}).`,
        subInsights: [
          { icon: <Target className="w-3 h-3" />, text: `${contextStats.banca.corretas} acertos em ${contextStats.banca.total} questões específicas da banca.` },
          { icon: <Zap className="w-3 h-3" />, text: 'Priorize questões dessa banca para se adaptar ao seu estilo e pegadinhas.' }
        ],
        action: 'Bateria de questões',
        urgency: 8,
      });
    } else if (isRelevantSample && bPerf >= 0.7 && diff >= -0.05) {
      insights.push({
        severity: 'strength',
        disciplina: 'Perfil da Prova',
        message: `Forte alinhamento com a banca ${context.banca.nome}`,
        detail: `Excelente aproveitamento (${pct(bPerf)}) nas questões que simulam o formato oficial da prova.`,
        subInsights: [
          { icon: <Building className="w-3 h-3" />, text: `${contextStats.banca.corretas} acertos em ${contextStats.banca.total} questões.` }
        ],
        action: 'Manter cadência',
        urgency: 2,
      });
    }
  }

  if (context?.banca && contextStats.banca.total < 5 && totalRespondidas >= 30) {
    insights.push({
      severity: 'attention',
      disciplina: 'Perfil da Prova',
      message: `Baixa experiência com a banca ${context.banca.nome}`,
      detail: `Você tem ${totalRespondidas} questões resolvidas, mas quase nenhuma desta banca específica.`,
      subInsights: [
        { icon: <FlaskConical className="w-3 h-3" />, text: 'É crucial resolver questões da banca para entender como ela cobra o conteúdo.' }
      ],
      action: 'Bateria de questões',
      urgency: 7,
    });
  }

  if (context?.areaInstituicao && contextStats.areaInst.perf !== null && contextStats.areaInst.total >= 15) {
    if (contextStats.areaInst.perf >= 0.75) {
      insights.push({
        severity: 'strength',
        disciplina: 'Perfil da Prova',
        message: `Domínio histórico na área ${context.areaInstituicao}`,
        detail: `Acertos consistentes (${pct(contextStats.areaInst.perf)}) em provas dessa área.`,
        urgency: 1,
      });
    } else if (contextStats.areaInst.perf < 0.55) {
      insights.push({
        severity: 'attention',
        disciplina: 'Perfil da Prova',
        message: `Atenção à profundidade cobrada na área ${context.areaInstituicao}`,
        detail: `Desempenho abaixo do ideal (${pct(contextStats.areaInst.perf)}) em questões contextualizadas para essa área.`,
        action: 'Ampliar cobertura',
        urgency: 6,
      });
    }
  }

  if (context?.nivel && contextStats.nivel.perf !== null && contextStats.nivel.total >= 15) {
    if (contextStats.nivel.perf < 0.55) {
      insights.push({
        severity: 'attention',
        disciplina: 'Perfil da Prova',
        message: `Dificuldade no nível ${formatNivel(context.nivel)}`,
        detail: `Acertos em ${pct(contextStats.nivel.perf)}, sugerindo dificuldade com o aprofundamento exigido neste nível.`,
        action: 'Revisão teórica',
        urgency: 7,
      });
    }
  }

  // Per-discipline insights
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
      mediaRate  !== null ? `Média: ${pct(mediaRate)}`    : null,
      dificilRate !== null ? `Difícil: ${pct(dificilRate)}` : null,
    ].filter(Boolean).join(' · ');

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

    if (disc.performanceRate !== null && disc.performanceRate < 0.45 && disc.questoesRespondidas >= 5) {
      const sub: SubInsight[] = [];
      if (diffLine)
        sub.push({ icon: <BarChart2 className="w-3 h-3" />, text: diffLine });
      if (chuteRate > 0.15)
        sub.push({ icon: <Zap className="w-3 h-3" />, text: `${pct(chuteRate)} das respostas foram no "Chute" — indício de falta de conhecimento.`, });
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

    if (chuteRate > 0.25 && disc.performanceRate !== null && disc.performanceRate < 0.6 && disc.questoesRespondidas >= 4) {
      insights.push({
        severity: 'critical',
        disciplina: disc.nome,
        message: `Excesso de "Chutes": ${pct(chuteRate)} das respostas`,
        detail: 'Você precisou adivinhar a resposta com frequência. Retorne à teoria para construir maior segurança antes da prática.',
        subInsights: [
          { icon: <Target className="w-3 h-3" />, text: `Taxa de acerto geral: ${pct(disc.performanceRate)}.` },
          { icon: <Brain className="w-3 h-3" />, text: 'Resolver questões com gabarito comentado pode ajudar a mapear as lacunas.' },
        ],
        action: 'Revisão teórica',
        urgency: 8,
      });
      return;
    }

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

    const hasFalseSecurity =
      facilRate !== null && facilRate >= 0.7 &&
      ((mediaRate !== null && mediaRate < 0.5) || (dificilRate !== null && dificilRate < 0.45));

    if (hasFalseSecurity && disc.performanceRate !== null) {
      insights.push({
        severity: 'attention',
        disciplina: disc.nome,
        message: `Inconsistência na confiança: ${pct(disc.performanceRate)} geral`,
        detail: 'Você acerta o que julga fácil, mas tem queda brusca de acertos nas questões que considera médias ou difíceis.',
        subInsights: [
          { icon: <BarChart2 className="w-3 h-3" />, text: diffLine || '—' },
          { icon: <Eye className="w-3 h-3" />, text: 'Você precisa se desafiar mais. Priorize filtros de questões médias e difíceis.' },
        ],
        action: 'Bateria de questões',
        urgency: 7,
      });
      return;
    }

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

  // Context Macro Patterns
  if (context?.banca && contextStats.banca.total === 0 && totalRespondidas >= 15) {
    macroPatterns.push({
      type: 'warning',
      icon: <Building className="w-4 h-4" />,
      title: `Nenhuma questão da banca ${context.banca.nome} resolvida`,
      detail: `Você está estudando os tópicos do edital sem praticar o estilo da banca oficial.`,
    });
  }

  if (context?.banca && contextStats.banca.total >= 20 && (contextStats.banca.perf ?? 0) >= 0.75) {
    macroPatterns.push({
      type: 'positive',
      icon: <Building className="w-4 h-4" />,
      title: `Alto rendimento na banca ${context.banca.nome}`,
      detail: `Você tem ${pct(contextStats.banca.perf!)} de acerto nas questões com o estilo oficial da prova.`,
    });
  }

  if (context?.nivel && contextStats.nivel.total >= 20 && (contextStats.nivel.perf ?? 0) < 0.5 && globalPerf && globalPerf > 0.6) {
    macroPatterns.push({
      type: 'warning',
      icon: <GraduationCap className="w-4 h-4" />,
      title: `Atenção à exigência do nível ${formatNivel(context.nivel)}`,
      detail: `Seu desempenho geral é ${pct(globalPerf)}, mas cai para ${pct(contextStats.nivel.perf!)} neste nível de prova.`,
    });
  }

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
      title: 'Uso frequente do "Chute" em várias disciplinas',
      detail: 'Você está recorrendo à adivinhação constantemente. Isso reflete uma base teórica frágil que precisa ser reforçada antes de mais prática.',
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
  const chuteIssues = criticalInsights.filter(i => i.message.includes('Chutes"'));

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

  const falseSec = attentionInsights.filter(i => i.message.includes('Inconsistência'));
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
  const temposGlobal = topicos.filter(t => t.questaoStats?.total?.mediaTempoResposta != null && t.questaoStats?.total?.mediaTempoResposta! > 0).map(t => t.questaoStats?.total?.mediaTempoResposta!);
  const globalAvgTempo = temposGlobal.length > 0 ? temposGlobal.reduce((s, v) => s + v, 0) / temposGlobal.length : null;

  // ── Prova-specific logic ─────────────────────────────────────────────────
  const daysToProva = daysUntil(dataProva);

  if (inscrito && dataProva && daysToProva !== null) {
    if (daysToProva < 0) {
      macroPatterns.unshift({
        type: 'neutral',
        icon: <Calendar className="w-4 h-4" />,
        title: 'Prova já realizada',
        detail: 'Análise baseada em dados históricos da prova.',
      });
    } else if (daysToProva === 0) {
      macroPatterns.unshift({
        type: 'warning',
        icon: <Calendar className="w-4 h-4" />,
        title: 'Prova é HOJE',
        detail: 'Revisão leve, hidrate-se e descanse antes da prova.',
      });
      insights.filter(i => i.severity === 'critical').forEach(i => { i.urgency = Math.min(i.urgency + 3, 10); });
    } else if (daysToProva <= 3) {
      macroPatterns.unshift({
        type: 'warning',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d`,
        detail: 'Reta final — revise apenas pontos críticos.',
      });
      insights.filter(i => i.severity === 'critical').forEach(i => { i.urgency = Math.min(i.urgency + 2, 10); });
    } else if (daysToProva <= 7) {
      macroPatterns.unshift({
        type: 'warning',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d — esta semana`,
        detail: 'Foque em revisão e questões de alto rendimento.',
      });
      insights.filter(i => i.severity === 'critical').forEach(i => { i.urgency = Math.min(i.urgency + 1, 10); });
    } else if (daysToProva <= 30) {
      macroPatterns.unshift({
        type: 'info',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d`,
        detail: 'Último mês — intensifique questões e revise pontos fracos.',
      });
    } else if (daysToProva <= 90) {
      macroPatterns.unshift({
        type: 'info',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d`,
        detail: 'Bom momento para consolidar base teórica e ampliar cobertura.',
      });
    } else {
      macroPatterns.unshift({
        type: 'positive',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d — longo prazo`,
        detail: 'Use the time for deep study and consistent cadence.',
      });
    }
  } else if (!inscrito && dataProva && daysToProva !== null) {
    if (daysToProva < 0) {
      macroPatterns.unshift({
        type: 'neutral',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova realizada em ${Math.abs(daysToProva)}d atrás`,
        detail: 'Inscrição encerrada. Concurso já realizado.',
      });
    } else if (daysToProva === 0) {
      macroPatterns.unshift({
        type: 'warning',
        icon: <Calendar className="w-4 h-4" />,
        title: 'Prova é HOJE — inscrição não realizada',
        detail: 'Você não está inscrito. Fique atento a próximas turmas.',
      });
    } else if (daysToProva <= 3) {
      macroPatterns.unshift({
        type: 'warning',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d — inscrição pendente`,
        detail: 'Prazo de inscrição pode encerrar. Verifique o edital.',
      });
    } else if (daysToProva <= 30) {
      macroPatterns.unshift({
        type: 'info',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d`,
        detail: 'Verifique se a inscrição está dentro do prazo.',
      });
    } else {
      macroPatterns.unshift({
        type: 'info',
        icon: <Calendar className="w-4 h-4" />,
        title: `Prova em ${daysToProva}d`,
        detail: 'Ainda há tempo para se inscrever e iniciar preparação.',
      });
    }
  } else if (!dataProva) {
    if (inscrito) {
      macroPatterns.unshift({
        type: 'neutral',
        icon: <Calendar className="w-4 h-4" />,
        title: 'Data da prova a definir',
        detail: 'Continue a preparação enquanto aguarda o calendário.',
      });
    }
  }

  // ── Difficulty aggregate (global) ──────────────────────────────────────
  const diffMap: Record<string, { total: number; corretas: number }> = {};
  topicos.forEach(t => {
    if (!t.questaoStats?.total?.dificuldade) return;
    Object.entries(t.questaoStats.total.dificuldade).forEach(([key, val]) => {
      if (!diffMap[key]) diffMap[key] = { total: 0, corretas: 0 };
      diffMap[key].total += val.total;
      diffMap[key].corretas += val.corretas;
    });
  });
  const diffLabelMap: Record<string, string> = { FACIL: 'Fácil', MEDIA: 'Média', DIFICIL: 'Difícil', CHUTE: 'Chute' };
  const diffOrder = ['FACIL', 'MEDIA', 'DIFICIL', 'CHUTE'];
  const difficultyAggregate: DifficultyAggregate[] = diffOrder
    .filter(k => diffMap[k] && diffMap[k].total > 0)
    .map(k => ({ key: k, label: diffLabelMap[k] ?? k, ...diffMap[k] }));

  // ── Priority topics ─────────────────────────────────────────────────────
  const priorityTopics: PriorityTopic[] = [];
  topicos.forEach(t => {
    const studied = (t.totalEstudos ?? 0) > 0;
    const respondidas = t.questaoStats?.total?.respondidas ?? 0;
    const acertadas  = t.questaoStats?.total?.acertadas ?? 0;
    const totalQ     = t.questaoStats?.total?.totalQuestoes ?? 0;
    const perfRate   = respondidas > 0 ? acertadas / respondidas : null;
    const dStu = daysSince(t.ultimoEstudo ?? undefined);
    const dQue = daysSince(t.questaoStats?.total?.ultimaQuestao ?? undefined);

    let reason = '';
    let reasonType: PriorityTopic['reasonType'] = 'not-started';
    let urgency = 0;

    if (!studied && respondidas === 0) {
      reason = totalQ > 0 ? `Não iniciado — ${totalQ} questões disponíveis` : 'Não iniciado';
      reasonType = 'not-started';
      urgency = totalQ > 0 ? 9 : 7;
    } else if (perfRate !== null && perfRate < 0.45 && respondidas >= 3) {
      reason = `Acerto baixo: ${pct(perfRate)}`;
      reasonType = 'low-perf';
      urgency = 8;
    } else if (studied && dStu > 45 && dQue > 45) {
      reason = `Sem atividade há ${Math.min(dStu, dQue)}d`;
      reasonType = 'stale';
      urgency = 5;
    } else if (studied && respondidas === 0 && totalQ > 0) {
      reason = `Estudado mas sem questões — ${totalQ} disponíveis`;
      reasonType = 'no-practice';
      urgency = 6;
    }

    if (urgency > 0) {
      priorityTopics.push({
        nome: t.nome,
        disciplina: t.disciplina?.nome ?? 'Geral',
        tema: t.tema?.nome ?? 'Geral',
        reason,
        reasonType,
        urgency,
        questoesDisponiveis: totalQ,
        perfRate,
        daysSinceStudy: dStu,
        daysSinceQuestion: dQue,
      });
    }
  });
  priorityTopics.sort((a, b) => b.urgency - a.urgency);

  return {
    summary: {
      totalTopicos, totalEstudados, totalQuestoes,
      coverageRate: totalTopicos > 0 ? totalEstudados / totalTopicos : 0,
      totalRespondidas, totalAcertadas,
      performanceRate: globalPerf,
      bankCoverageRate: globalBankRate,
      globalAvgTempo,
      daysUntilProva: daysToProva,
    },
    disciplineStats,
    insights,
    macroPatterns,
    recommendations,
    difficultyAggregate,
    priorityTopics,
    contextStats,
    context,
  };
};

// ─── UI Mini-Components ───────────────────────────────────────────────────────

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

// ─── New Panel: Context Stats ────────────────────────────────────────────────

const ContextStatsPanel = ({ stats, context }: { stats: ContextStats; context: EditalContext }) => {
  const metrics = [
    { key: 'banca', icon: <Building className="w-4 h-4" />, title: 'Banca Organizadora', value: context.banca?.nome, data: stats.banca },
    { key: 'nivel', icon: <GraduationCap className="w-4 h-4" />, title: 'Nível da Prova', value: context.nivel ? formatNivel(context.nivel) : '', data: stats.nivel },
    { key: 'areaInst', icon: <Briefcase className="w-4 h-4" />, title: 'Área da Instituição', value: context.areaInstituicao, data: stats.areaInst },
    { key: 'areaCargo', icon: <Layers className="w-4 h-4" />, title: 'Área do Cargo', value: context.areaCargo, data: stats.areaCargo },
  ].filter(m => !!m.value);

  if (metrics.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Alinhamento ao Perfil da Prova</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Seu histórico nas dimensões específicas deste edital
          </p>
        </div>
        <Target className="w-4 h-4 text-slate-300" />
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map(m => {
          const hasData = m.data.total > 0;
          const perf = m.data.perf;
          const accStr = perf !== null ? Math.round(perf * 100) + '%' : '—';
          
          return (
            <div key={m.key} className="flex flex-col border border-slate-100 rounded-lg p-3 bg-slate-50/50">
              <div className="flex items-start gap-2.5 mb-2">
                <div className="p-1.5 bg-white rounded shadow-sm text-slate-400 border border-slate-100">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{m.title}</p>
                  <p className="text-xs font-bold text-slate-700 truncate" title={m.value}>{m.value}</p>
                </div>
              </div>

              {hasData ? (
                <div className="mt-auto">
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-slate-500">{m.data.corretas} / {m.data.total} acertos</span>
                    <span className={`text-sm font-black tabular-nums ${
                      perf! >= 0.7 ? 'text-emerald-600' : perf! >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                    }`}>{accStr}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        perf! >= 0.7 ? 'bg-emerald-400' : perf! >= 0.5 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${perf! * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-2">
                  <p className="text-[10px] font-medium text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded-md">
                    Sem questões respondidas
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── New Panel: Mapa de Disciplinas ──────────────────────────────────────────

const DiscMap = ({ disciplineStats }: { disciplineStats: DisciplineStats[] }) => {
  const sorted = [...disciplineStats].sort((a, b) => {
    const scoreA = a.estudados === 0 ? -2 : a.coverageRate;
    const scoreB = b.estudados === 0 ? -2 : b.coverageRate;
    return scoreA - scoreB;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Mapa de Disciplinas</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{disciplineStats.length} disciplina{disciplineStats.length !== 1 ? 's' : ''} no edital</p>
        </div>
        <Layers className="w-4 h-4 text-slate-300" />
      </div>
      <div className="divide-y divide-slate-50">
        {sorted.map(disc => {
          const acc = disc.performanceRate !== null ? Math.round(disc.performanceRate * 100) : null;
          const cov = Math.round(disc.coverageRate * 100);
          const neverStarted = disc.estudados === 0 && disc.questoesRespondidas === 0;
          const lastActivity = Math.min(disc.daysSinceLastStudy, disc.daysSinceLastQuestion);
          const activityLabel = lastActivity === Infinity ? 'Nunca' : lastActivity === 0 ? 'Hoje' : lastActivity === 1 ? 'Ontem' : `${lastActivity}d`;
          const activityColor = lastActivity <= 7 ? 'text-emerald-600' : lastActivity <= 30 ? 'text-amber-600' : 'text-rose-500';

          return (
            <div key={disc.nome} className={`px-5 py-3.5 ${neverStarted ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  neverStarted ? 'bg-red-400' :
                  cov >= 75 ? 'bg-emerald-400' :
                  cov >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{disc.nome}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {acc !== null ? (
                        <span className={`text-[10px] font-mono font-black tabular-nums ${
                          acc >= 70 ? 'text-emerald-600' : acc >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>{acc}%</span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-300">—%</span>
                      )}
                      <span className={`text-[9px] font-bold ${activityColor}`}>{activityLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cov >= 75 ? 'bg-emerald-400' : cov >= 40 ? 'bg-amber-400' : neverStarted ? 'bg-slate-200' : 'bg-rose-400'
                        }`}
                        style={{ width: `${cov}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 tabular-nums flex-shrink-0 w-16 text-right">
                      {disc.estudados}/{disc.totalTopicos} tóp.
                    </span>
                  </div>
                  {!neverStarted && (
                    <div className="mt-1.5 flex gap-3 flex-wrap">
                      {disc.questoesRespondidas > 0 && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          <span className="font-bold text-slate-500">{disc.questoesRespondidas}</span> questões respondidas
                        </span>
                      )}
                      {disc.avgTempoResposta !== null && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          <span className="font-bold text-slate-500">{sToMin(disc.avgTempoResposta)}</span>/questão
                        </span>
                      )}
                      {disc.totalQuestoes > 0 && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          banco: <span className="font-bold text-slate-500">{Math.round(disc.bankCoverageRate * 100)}%</span>
                        </span>
                      )}
                    </div>
                  )}
                  {neverStarted && (
                    <p className="mt-1 text-[9px] font-bold text-red-400 uppercase tracking-widest">Não iniciada{disc.totalQuestoes > 0 ? ` · ${disc.totalQuestoes} questões no banco` : ''}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── New Panel: Análise de Dificuldade ───────────────────────────────────────

const DifficultyPanel = ({ difficultyAggregate }: { difficultyAggregate: DifficultyAggregate[] }) => {
  if (difficultyAggregate.length === 0) return null;

  const maxTotal = Math.max(...difficultyAggregate.map(d => d.total), 1);
  const diffColors: Record<string, { bar: string; text: string; bg: string; border: string }> = {
    FACIL:   { bar: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
    MEDIA:   { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-100' },
    DIFICIL: { bar: 'bg-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-100' },
    CHUTE:   { bar: 'bg-slate-300',   text: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-200' },
  };
  const totalAnswered = difficultyAggregate.reduce((s, d) => s + d.total, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Dificuldade Percebida (Autoavaliação)</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Desempenho baseado na dificuldade que você sentiu ao responder
          </p>
        </div>
        <BarChart2 className="w-4 h-4 text-slate-300" />
      </div>
      <div className="p-4 space-y-3">
        {difficultyAggregate.map(d => {
          const cfg = diffColors[d.key] ?? diffColors['MEDIA'];
          const acc = d.total > 0 ? Math.round((d.corretas / d.total) * 100) : 0;
          const share = Math.round((d.total / totalAnswered) * 100);
          const barW = Math.round((d.total / maxTotal) * 100);
          return (
            <div key={d.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {d.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{d.total} respostas · {share}% do total</span>
                </div>
                <span className={`text-[11px] font-mono font-black tabular-nums ${
                  acc >= 70 ? 'text-emerald-600' : acc >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>{acc}% acertos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full relative">
                    <div className={`absolute inset-y-0 left-0 rounded-full opacity-20 ${cfg.bar}`} style={{ width: `${barW}%` }} />
                    <div className={`absolute inset-y-0 left-0 rounded-full ${cfg.bar}`} style={{ width: `${(d.corretas / (d.total || 1)) * barW}%` }} />
                  </div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono tabular-nums flex-shrink-0 w-16 text-right">{d.corretas}/{d.total} certas</span>
              </div>
            </div>
          );
        })}

        {(() => {
          const chute = difficultyAggregate.find(d => d.key === 'CHUTE');
          const dificil = difficultyAggregate.find(d => d.key === 'DIFICIL');
          const facil = difficultyAggregate.find(d => d.key === 'FACIL');
          const chuteRate = chute && totalAnswered > 0 ? chute.total / totalAnswered : 0;
          const dificilAcc = dificil && dificil.total > 0 ? dificil.corretas / dificil.total : null;
          const facilAcc = facil && facil.total > 0 ? facil.corretas / facil.total : null;

          const notes: string[] = [];
          if (chuteRate > 0.2) notes.push(`${Math.round(chuteRate * 100)}% das respostas foram marcadas como "Chute" — indicando falta de domínio ou esquecimento da matéria.`);
          if (dificilAcc !== null && dificilAcc < 0.4) notes.push('Baixo acerto nas questões que você sentiu maior "Dificuldade". Natural, mas exige aprofundamento ou leitura das resoluções.');
          if (facilAcc !== null && facilAcc < 0.6) notes.push('Taxa de acerto baixa nas questões que você julgou "Fáceis". Cuidado com pegadinhas da banca ou leitura desatenta.');
          if (dificilAcc !== null && dificilAcc >= 0.7) notes.push('Excelente acerto nas questões que você considerou "Difíceis" — seu raciocínio lógico está superando sua própria insegurança.');

          if (notes.length === 0) return null;
          return (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {notes.map((n, i) => (
                <p key={i} className="text-[10px] text-slate-500 leading-relaxed">• {n}</p>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ─── New Panel: Tópicos Prioritários ─────────────────────────────────────────

const PriorityTopicsPanel = ({ topics }: { topics: PriorityTopic[] }) => {
  const [showAll, setShowAll] = useState(false);
  if (topics.length === 0) return null;

  const displayed = showAll ? topics : topics.slice(0, 6);

  const typeConfig: Record<PriorityTopic['reasonType'], { icon: React.ReactNode; color: string }> = {
    'not-started': { icon: <AlertCircle className="w-3 h-3" />, color: 'text-red-500' },
    'low-perf':    { icon: <Target className="w-3 h-3" />,      color: 'text-rose-500' },
    'stale':       { icon: <Clock className="w-3 h-3" />,        color: 'text-amber-500' },
    'no-practice': { icon: <FlaskConical className="w-3 h-3" />, color: 'text-indigo-500' },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Tópicos Prioritários</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            {topics.length} tópico{topics.length !== 1 ? 's' : ''} requer{topics.length === 1 ? '' : 'em'} atenção
          </p>
        </div>
        <Zap className="w-4 h-4 text-slate-300" />
      </div>
      <div className="divide-y divide-slate-50">
        {displayed.map((t, i) => {
          const cfg = typeConfig[t.reasonType];
          return (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-snug truncate">{t.nome}</p>
                <p className="text-[9px] font-semibold text-slate-400 truncate">{t.disciplina} · {t.tema}</p>
                <div className={`mt-1 flex items-center gap-1 ${cfg.color}`}>
                  {cfg.icon}
                  <span className="text-[10px] font-semibold">{t.reason}</span>
                </div>
              </div>
              {t.perfRate !== null && (
                <span className={`flex-shrink-0 text-[10px] font-mono font-black tabular-nums mt-0.5 ${
                  t.perfRate >= 0.7 ? 'text-emerald-600' : t.perfRate >= 0.5 ? 'text-amber-600' : 'text-rose-600'
                }`}>{Math.round(t.perfRate * 100)}%</span>
              )}
            </div>
          );
        })}
      </div>
      {topics.length > 6 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            {showAll ? `Mostrar menos ↑` : `Ver mais ${topics.length - 6} tópicos ↓`}
          </button>
        </div>
      )}
    </div>
  );
};

const EditalAnalysisReport: React.FC<EditalAnalysisReportProps> = ({ 
  topicos, 
  dataProva, 
  inscrito, 
  banca, 
  instituicao,
  areaInstituicao,
  cargoId,
  cargoNome,
  areaCargo,
  nivel
}) => {
  const analysis = useMemo<EditalAnalysis | null>(
    () => {
      if (!topicos || topicos.length === 0) return null;
      const ctx: EditalContext = { banca, instituicao, areaInstituicao, cargoId, cargoNome, areaCargo, nivel };
      return analyzeEdital(topicos, dataProva, inscrito, ctx);
    },
    [topicos, dataProva, inscrito, banca, instituicao, areaInstituicao, cargoId, cargoNome, areaCargo, nivel]
  );

  if (!analysis) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-400">Nenhum tópico disponível para análise.</p>
      </div>
    );
  }

  const criticalInsights  = analysis.insights.filter(i => i.severity === 'critical');
  const attentionInsights = analysis.insights.filter(i => i.severity === 'attention');
  const strengthInsights  = analysis.insights.filter(i => i.severity === 'strength');

  return (
    <>
      {/* Macro patterns */}
      {analysis.macroPatterns.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Diagnóstico Geral</h2>
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="p-5">
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

      {/* Context Stats Panel */}
      {analysis.contextStats && analysis.context && (
        <div className="mb-6">
          <ContextStatsPanel stats={analysis.contextStats} context={analysis.context} />
        </div>
      )}

      {/* Discipline map */}
      {analysis.disciplineStats.length > 0 && (
        <div className="mb-6">
          <DiscMap disciplineStats={analysis.disciplineStats} />
        </div>
      )}

      {/* Difficulty breakdown */}
      <div className="mb-6">
        <DifficultyPanel difficultyAggregate={analysis.difficultyAggregate} />
      </div>

      {/* Priority topics */}
      {analysis.priorityTopics.length > 0 && (
        <div className="mb-6">
          <PriorityTopicsPanel topics={analysis.priorityTopics} />
        </div>
      )}

      {/* Critical */}
      {criticalInsights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
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
  );
};

export default EditalAnalysisReport;
