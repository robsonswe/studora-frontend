import type { RespostaSummaryDto } from '@/types';

export const getStrategistInsight = (fb: RespostaSummaryDto): string | null => {
  const isFast = fb.tempoRespostaSegundos < 30;
  const isVeryFast = fb.tempoRespostaSegundos < 15;
  const isSlow = fb.tempoRespostaSegundos > 120;
  const isCorrect = fb.correta;
  const dif = fb.dificuldade;
  const isFacil = dif === 'FACIL';
  const isMedia = dif === 'MEDIA';
  const isDificil = dif === 'DIFICIL';
  const isChute = dif === 'CHUTE';

  if (isChute) {
    return isCorrect
      ? 'Acerto no chute? Registre a dúvida e revise a fundamentação para consolidar este ponto.'
      : 'O chute não converteu. Recomendada revisão teórica profunda deste tópico.';
  }

  if (!isCorrect) {
    if (isVeryFast) return 'Atenção: Ritmo extremamente acelerado. Verifique se houve erro por falta de atenção na leitura.';
    if (isFast) return 'Ritmo apressado. O tempo de resposta sugere leitura superficial das alternativas.';
    if (isFacil) return 'Gap de percepção: Este tema exige maior rigor técnico do que o inicialmente previsto.';
    if ((isMedia || isDificil) && fb.tempoRespostaSegundos < 45) {
      return 'Cuidado: Tópico complexo respondido com rapidez atípica. Revise as pegadinhas da banca.';
    }
  } else {
    if (isFast && (isMedia || isDificil)) return 'Ótimo desempenho! Resposta rápida e precisa em um tópico desafiador.';
    if (isDificil) return 'Excelente! Você demonstrou domínio técnico em um tópico de alta complexidade.';
    if (isSlow) return 'Bom acerto, mas atenção à eficiência: o tempo de resposta superou a margem ideal de 2 min.';
  }

  return null;
};