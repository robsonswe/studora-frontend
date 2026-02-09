/**
 * Formata o nível do cargo para exibição (Title Case).
 * @param nivel O nível em formato uppercase (ex: SUPERIOR, MEDIO, FUNDAMENTAL)
 * @returns O nível formatado para exibição (ex: Superior, Médio, Fundamental)
 */
export const formatNivel = (nivel: string | undefined | null): string => {
  if (!nivel) return '';
  
  const map: Record<string, string> = {
    'FUNDAMENTAL': 'Fundamental',
    'MEDIO': 'Médio',
    'SUPERIOR': 'Superior'
  };

  return map[nivel] || nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
};

/**
 * Formata a dificuldade para exibição.
 * @param dificuldade A dificuldade em formato uppercase (ex: FACIL, MEDIA, DIFICIL, CHUTE)
 * @returns A dificuldade formatada para exibição (ex: Fácil, Média, Difícil, Chute)
 */
export const formatDificuldade = (dificuldade: string | undefined | null): string => {
  if (!dificuldade) return '';
  
  const map: Record<string, string> = {
    'FACIL': 'Fácil',
    'MEDIA': 'Média',
    'DIFICIL': 'Difícil',
    'CHUTE': 'Chute'
  };

  return map[dificuldade] || dificuldade.charAt(0).toUpperCase() + dificuldade.slice(1).toLowerCase();
};

/**
 * Formata uma data/string ISO para o formato dd/mm/yyyy hh:mm:ss.
 * @param dateStr A data em formato string ou objeto Date
 * @returns A data formatada
 */
export const formatDateTime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return 'N/A';
  
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  if (isNaN(date.getTime())) return 'N/A';

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};
