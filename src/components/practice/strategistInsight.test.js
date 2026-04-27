import { describe, expect, it } from 'bun:test';
import { getStrategistInsight } from './strategistInsight';

const buildResponse = (overrides = {}) => ({
  id: 1,
  questaoId: 10,
  alternativaId: 20,
  correta: true,
  dificuldade: 'DIFICIL',
  tempoRespostaSegundos: 60,
  alternativas: [],
  createdAt: '2026-04-27T00:00:00.000Z',
  ...overrides,
});

describe('getStrategistInsight', () => {
  it('returns the chute success message for a correct answer', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'CHUTE' }))
    ).toBe('Acerto no chute? Registre a dúvida e revise a fundamentação para consolidar este ponto.');
  });

  it('returns the chute failure message for an incorrect answer', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'CHUTE', correta: false }))
    ).toBe('O chute não converteu. Recomendada revisão teórica profunda deste tópico.');
  });

  it('returns the very-fast failure message', () => {
    expect(
      getStrategistInsight(buildResponse({ correta: false, dificuldade: 'MEDIA', tempoRespostaSegundos: 10 }))
    ).toBe('Atenção: Ritmo extremamente acelerado. Verifique se houve erro por falta de atenção na leitura.');
  });

  it('returns the fast failure message before the difficulty-specific branch', () => {
    expect(
      getStrategistInsight(buildResponse({ correta: false, dificuldade: 'FACIL', tempoRespostaSegundos: 20 }))
    ).toBe('Ritmo apressado. O tempo de resposta sugere leitura superficial das alternativas.');
  });

  it('returns the easy failure message when the answer is not fast', () => {
    expect(
      getStrategistInsight(buildResponse({ correta: false, dificuldade: 'FACIL', tempoRespostaSegundos: 35 }))
    ).toBe('Gap de percepção: Este tema exige maior rigor técnico do que o inicialmente previsto.');
  });

  it('returns the complex failure message for media and difficult answers under 45 seconds', () => {
    expect(
      getStrategistInsight(buildResponse({ correta: false, dificuldade: 'MEDIA', tempoRespostaSegundos: 40 }))
    ).toBe('Cuidado: Tópico complexo respondido com rapidez atípica. Revise as pegadinhas da banca.');
    expect(
      getStrategistInsight(buildResponse({ correta: false, dificuldade: 'DIFICIL', tempoRespostaSegundos: 40 }))
    ).toBe('Cuidado: Tópico complexo respondido com rapidez atípica. Revise as pegadinhas da banca.');
  });

  it('returns the fast-and-difficult success message before the generic DIFICIL branch', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'DIFICIL', tempoRespostaSegundos: 20 }))
    ).toBe('Ótimo desempenho! Resposta rápida e precisa em um tópico desafiador.');
  });

  it('returns the generic DIFICIL success message when not fast', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'DIFICIL', tempoRespostaSegundos: 60 }))
    ).toBe('Excelente! Você demonstrou domínio técnico em um tópico de alta complexidade.');
  });

  it('returns the slow success message for non-difficult answers', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'FACIL', tempoRespostaSegundos: 130 }))
    ).toBe('Bom acerto, mas atenção à eficiência: o tempo de resposta superou a margem ideal de 2 min.');
  });

  it('returns null when no branch matches', () => {
    expect(
      getStrategistInsight(buildResponse({ dificuldade: 'MEDIA', tempoRespostaSegundos: 60 }))
    ).toBeNull();
  });
});