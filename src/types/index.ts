/**
 * @fileoverview API Response and Request Types based on the Studora API documentation (v1).
 * All types are synchronized with the backend schemas and business rules.
 */

/**
 * Nível de escolaridade exigido para o cargo.
 */
export const NivelCargo = {
  FUNDAMENTAL: 'FUNDAMENTAL',
  MEDIO: 'MEDIO',
  SUPERIOR: 'SUPERIOR',
} as const;
export type NivelCargo = typeof NivelCargo[keyof typeof NivelCargo];

/**
 * Estatísticas de respostas por nível de dificuldade.
 */
export interface DificuldadeStatDto {
  /** Total de questões respondidas neste nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  total: number;
  /** Total de questões acertadas neste nível de dificuldade. */
  corretas: number;
}

/**
 * DTO simplificado para listagem de disciplinas.
 */
export interface DisciplinaSummaryDto {
  /** ID único da disciplina. Example: 1 */
  id: number;
  /** Nome da disciplina. Example: "Direito Constitucional" */
  nome: string;
  /** Total de sessões de estudo realizadas para todos os subtemas desta disciplina. */
  totalEstudos: number;
  /** Data e hora do último estudo realizado entre todos os subtemas desta disciplina (ISO string). */
  ultimoEstudo?: string;
  /** Total de temas nesta disciplina. */
  totalTemas: number;
  /** Total de subtemas nesta disciplina. */
  totalSubtemas: number;
  /** Número de temas onde todos os subtemas possuem pelo menos uma sessão de estudo. */
  temasEstudados: number;
  /** Número de subtemas que possuem pelo menos uma sessão de estudo. */
  subtemasEstudados: number;
  /** Total de questões associadas a esta disciplina (somando temas/subtemas). */
  totalQuestoes: number;
  /** Total de questões que possuem pelo menos uma resposta. */
  questoesRespondidas: number;
  /** Total de questões que possuem pelo menos uma resposta correta. */
  questoesAcertadas: number;
  /** Tempo médio de resposta em segundos. */
  mediaTempoResposta?: number | null;
  /** Estatísticas de respostas por nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  dificuldadeRespostas: Record<string, DificuldadeStatDto>;
}

/**
 * DTO detalhado de Disciplina, incluindo seus temas.
 */
export interface DisciplinaDetailDto extends DisciplinaSummaryDto {
  /** Lista de temas associados a esta disciplina. */
  temas: TemaSummaryDto[];
}

/**
 * DTO simplificado para listagem de temas.
 */
export interface TemaSummaryDto {
  /** ID único do tema. Example: 1 */
  id: number;
  /** ID da disciplina à qual o tema pertence. Example: 1 */
  disciplinaId: number;
  /** Nome do tema. Example: "Direitos Fundamentais" */
  nome: string;
  /** Nome da disciplina (para evitar lookups). */
  disciplinaNome?: string;
  /** Total de sessões de estudo realizadas para todos os subtemas deste tema. */
  totalEstudos: number;
  /** Data e hora do último estudo realizado entre todos os subtemas deste tema (ISO string). */
  ultimoEstudo?: string;
  /** Total de subtemas neste tema. */
  totalSubtemas: number;
  /** Número de subtemas que possuem pelo menos uma sessão de estudo. */
  subtemasEstudados: number;
  /** Total de questões associadas a este tema (somando subtemas). */
  totalQuestoes: number;
  /** Total de questões que possuem pelo menos uma resposta. */
  questoesRespondidas: number;
  /** Total de questões que possuem pelo menos uma resposta correta. */
  questoesAcertadas: number;
  /** Tempo médio de resposta em segundos. */
  mediaTempoResposta?: number | null;
  /** Estatísticas de respostas por nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  dificuldadeRespostas: Record<string, DificuldadeStatDto>;
}

/**
 * DTO detalhado para visualização de um tema, incluindo disciplina e subtemas.
 */
export interface TemaDetailDto {
  /** ID único do tema. */
  id: number;
  /** Disciplina à qual o tema pertence. */
  disciplina: DisciplinaSummaryDto;
  /** Nome do tema. */
  nome: string;
  /** Lista de subtemas associados a este tema. */
  subtemas: SubtemaSummaryDto[];
  /** Total de sessões de estudo realizadas para todos os subtemas deste tema. */
  totalEstudos: number;
  /** Data e hora do último estudo realizado entre todos os subtemas deste tema (ISO string). */
  ultimoEstudo?: string;
  /** Total de subtemas neste tema. */
  totalSubtemas: number;
  /** Número de subtemas que possuem pelo menos uma sessão de estudo. */
  subtemasEstudados: number;
  /** Total de questões associadas a este tema (somando subtemas). */
  totalQuestoes: number;
  /** Total de questões que possuem pelo menos uma resposta. */
  questoesRespondidas: number;
  /** Total de questões que possuem pelo menos uma resposta correta. */
  questoesAcertadas: number;
  /** Tempo médio de resposta em segundos. */
  mediaTempoResposta?: number | null;
  /** Estatísticas de respostas por nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  dificuldadeRespostas: Record<string, DificuldadeStatDto>;
}

/**
 * DTO simplificado para listagem de subtemas.
 */
export interface SubtemaSummaryDto {
  /** ID único do subtema. Example: 1 */
  id: number;
  /** ID do tema ao qual o subtema pertence. Example: 1 */
  temaId: number;
  /** Nome do tema ao qual o subtema pertence. */
  temaNome?: string;
  /** ID da disciplina à qual o subtema pertence. */
  disciplinaId?: number;
  /** Nome da disciplina à qual o subtema pertence. */
  disciplinaNome?: string;
  /** Nome do subtema. Example: "Atos Administrativos" */
  nome: string;
  /** Total de sessões de estudo realizadas para este subtema. */
  totalEstudos: number;
  /** Data e hora do último estudo realizado (ISO string). */
  ultimoEstudo?: string;
  /** Total de questões associadas a este subtema. */
  totalQuestoes: number;
  /** Total de questões que possuem pelo menos uma resposta. */
  questoesRespondidas: number;
  /** Total de questões que possuem pelo menos uma resposta correta. */
  questoesAcertadas: number;
  /** Tempo médio de resposta em segundos. */
  mediaTempoResposta?: number | null;
  /** Estatísticas de respostas por nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  dificuldadeRespostas: Record<string, DificuldadeStatDto>;
}

/**
 * DTO detalhado para visualização de um subtema, incluindo o tema pai.
 */
export interface SubtemaDetailDto {
  /** ID único do subtema. */
  id: number;
  /** Tema ao qual o subtema pertence. */
  tema: TemaSummaryDto;
  /** Nome do subtema. */
  nome: string;
  /** Total de sessões de estudo realizadas para este subtema. */
  totalEstudos: number;
  /** Data e hora do último estudo realizado (ISO string). */
  ultimoEstudo?: string;
  /** Total de questões associadas a este subtema. */
  totalQuestoes: number;
  /** Total de questões que possuem pelo menos uma resposta. */
  questoesRespondidas: number;
  /** Total de questões que possuem pelo menos uma resposta correta. */
  questoesAcertadas: number;
  /** Tempo médio de resposta em segundos. */
  mediaTempoResposta?: number | null;
  /** Estatísticas de respostas por nível de dificuldade (considerando apenas a resposta mais recente por questão). */
  dificuldadeRespostas: Record<string, DificuldadeStatDto>;
}

/**
 * DTO que representa uma sessão de estudo de um subtema.
 */
export interface EstudoSubtemaDto {
  /** ID único da sessão de estudo. */
  id: number;
  /** ID do subtema estudado. */
  subtemaId: number;
  /** Data e hora em que o estudo foi realizado. */
  createdAt: string;
}

/**
 * DTO simplificado para listagem de bancas organizadoras.
 */
export interface BancaSummaryDto {
  /** ID único da banca. Example: 1 */
  id: number;
  /** Nome da banca organizadora. Example: "Cebraspe (CESPE)" */
  nome: string;
}

/**
 * DTO simplificado para listagem de instituições.
 */
export interface InstituicaoSummaryDto {
  /** ID único da instituição. Example: 1 */
  id: number;
  /** Nome da instituição. Example: "Tribunal de Justiça de São Paulo" */
  nome: string;
  /** Área de atuação da instituição. Example: "Judiciária" */
  area: string;
}

/**
 * DTO simplificado para listagem de cargos.
 */
export interface CargoSummaryDto {
  /** ID único do cargo. */
  id: number;
  /** Nome do cargo. Example: "Analista Judiciário" */
  nome: string;
  /** Nível de escolaridade exigido. */
  nivel: NivelCargo;
  /** Área de atuação do cargo. */
  area: string;
}

/**
 * DTO detalhado para visualização de um cargo.
 */
export interface CargoDetailDto extends CargoSummaryDto {}

/**
 * DTO com contexto do concurso para exibição em questões.
 */
export interface ConcursoQuestaoDto {
  /** ID do concurso. */
  id: number;
  /** Ano do concurso. */
  ano: number;
  /** ID da banca. */
  bancaId: number;
  /** Nome da banca. */
  bancaNome: string;
  /** ID da instituição. */
  instituicaoId: number;
  /** Nome da instituição. */
  instituicaoNome: string;
  /** Área da instituição. */
  instituicaoArea: string;
}

/**
 * DTO que representa a associação de um cargo a um concurso com status de inscrição.
 */
export interface ConcursoCargoSummaryDto {
  /** ID da associação concurso-cargo. */
  id: number;
  /** ID do cargo. */
  cargoId: number;
  /** Nome do cargo. */
  cargoNome: string;
  /** Nível de escolaridade do cargo. */
  nivel: NivelCargo;
  /** Área de atuação do cargo. */
  area: string;
  /** Indica se o usuário está inscrito para este cargo neste concurso. */
  inscrito: boolean;
  /** Subtemas associados a este cargo neste concurso. */
  topicos: SubtemaSummaryDto[];
}

/**
 * DTO simplificado para listagem de concursos.
 */
export interface ConcursoSummaryDto {
  /** ID único do concurso. */
  id: number;
  /** Instituição organizadora. */
  instituicao: InstituicaoSummaryDto;
  /** Banca organizadora. */
  banca: BancaSummaryDto;
  /** Ano de realização do concurso. Example: 2023 */
  ano: number;
  /** Mês de realização do concurso (1-12). Example: 5 */
  mes: number;
  /** Identificação do edital do concurso (opcional). */
  edital?: string;
  /** Lista de cargos associados ao concurso com status de inscrição. */
  cargos: ConcursoCargoSummaryDto[];
}

/**
 * DTO detalhado para visualização de um concurso, incluindo detalhes de instituição e banca.
 */
export interface ConcursoDetailDto extends ConcursoSummaryDto {}

/**
 * Request DTO para criação de um concurso.
 */
export interface ConcursoCreateRequest {
  /** ID da instituição organizadora. */
  instituicaoId: number;
  /** ID da banca organizadora. */
  bancaId: number;
  /** Ano de realização do concurso. */
  ano: number;
  /** Mês de realização do concurso (1-12). */
  mes: number;
  /** Identificação do edital do concurso. */
  edital?: string;
  /** Lista de IDs dos cargos associados ao concurso. */
  cargos: number[];
  /**
   * Mapa de subtemas para cargos. Cada chave é o subtemaId e o valor é um array de cargoIds
   * que devem ser associados a este subtema neste concurso.
   * Exemplo: { 12: [1, 2, 6], 5: [1, 2, 5] } — subtema 12 é associado aos cargos 1, 2 e 6.
   */
  topicos?: Record<number, number[]>;
}

/**
 * Request DTO para atualização de um concurso.
 */
export interface ConcursoUpdateRequest {
  /** ID da instituição organizadora. */
  instituicaoId: number;
  /** ID da banca organizadora. */
  bancaId: number;
  /** Ano de realização do concurso. */
  ano: number;
  /** Mês de realização do concurso (1-12). */
  mes: number;
  /** Identificação do edital do concurso. */
  edital?: string;
  /** Lista de IDs dos cargos associados ao concurso. */
  cargos: number[];
  /**
   * Mapa de subtemas para cargos. Cada chave é o subtemaId e o valor é um array de cargoIds
   * que devem ser associados a este subtema neste concurso.
   * Se omitido, os topicos existentes não são alterados.
   * Exemplo: { 12: [1, 2, 6], 5: [1, 2, 5] } — subtema 12 é associado aos cargos 1, 2 e 6.
   */
  topicos?: Record<number, number[]>;
}

/**
 * DTO com hierarquia do subtema para exibição em questões.
 */
export interface SubtemaQuestaoDto {
  /** ID do subtema. */
  id: number;
  /** Nome do subtema. */
  nome: string;
  /** ID do tema. */
  temaId: number;
  /** Nome do tema. */
  temaNome: string;
  /** ID da disciplina. */
  disciplinaId: number;
  /** Nome da disciplina. */
  disciplinaNome: string;
}

/**
 * DTO para representar uma alternativa de questão.
 */
export interface AlternativaDto {
  /** ID da alternativa (gerado automaticamente). */
  id?: number;
  /** ID da questão à qual a alternativa pertence. */
  questaoId?: number;
  /** Ordem da alternativa na lista (1..N). Example: 1 */
  ordem: number;
  /** Texto da alternativa. */
  texto: string;
  /** Indica se a alternativa é a correta. (Visível apenas se a questão foi respondida recentemente). */
  correta?: boolean;
  /** Justificativa da alternativa. (Visível apenas se a questão foi respondida recentemente). */
  justificativa?: string;
}

/**
 * Grau de dificuldade percebido pelo usuário na questão.
 */
export const Dificuldade = {
  FACIL: 'FACIL',
  MEDIA: 'MEDIA',
  DIFICIL: 'DIFICIL',
  CHUTE: 'CHUTE',
} as const;
export type Dificuldade = typeof Dificuldade[keyof typeof Dificuldade];

/**
 * DTO para resumo de resposta do usuário.
 */
export interface RespostaSummaryDto {
  /** ID único da resposta. */
  id: number;
  /** ID da questão respondida. */
  questaoId: number;
  /** ID da alternativa selecionada. */
  alternativaId: number;
  /** Indica se a resposta foi correta. */
  correta: boolean;
  /** Justificativa ou comentário da resposta (se disponível). */
  justificativa?: string;
  /** Grau de dificuldade percebido. */
  dificuldade: Dificuldade;
  /** Tempo levado para responder em segundos. Example: 45 */
  tempoRespostaSegundos: number;
  /** ID do simulado ao qual a resposta pertence (opcional). */
  simuladoId?: number;
  /** Data e hora em que a resposta foi registrada. */
  createdAt: string;
}

/**
 * DTO simplificado para listagem de questões.
 */
export interface QuestaoSummaryDto {
  /** ID único da questão. */
  id: number;
  /** Contexto do concurso. */
  concurso: ConcursoQuestaoDto;
  /** Texto do enunciado da questão. */
  enunciado: string;
  /** Indica se a questão foi anulada. */
  anulada: boolean;
  /** Indica se a questão está desatualizada. */
  desatualizada: boolean;
  /** Indica se a questão já foi respondida pelo usuário. */
  respondida: boolean;
  /** URL da imagem associada à questão (opcional). */
  imageUrl?: string;
  /** Subtemas associados à questão (hierarquia completa). */
  subtemas: SubtemaQuestaoDto[];
  /** Cargos associados à questão. */
  cargos: CargoSummaryDto[];
  /** Alternativas da questão. */
  alternativas: AlternativaDto[];
  /** Histórico recente de respostas para esta questão. */
  respostas?: RespostaSummaryDto[];
}

/**
 * DTO detalhado para visualização de uma questão, incluindo objetos aninhados.
 */
export interface QuestaoDetailDto {
  /** ID único da questão. */
  id: number;
  /** Contexto do concurso. */
  concurso: ConcursoQuestaoDto;
  /** Texto do enunciado. */
  enunciado: string;
  /** Indica se a questão foi anulada. */
  anulada: boolean;
  /** Indica se a questão está desatualizada. */
  desatualizada: boolean;
  /** Indica se a questão já foi respondida pelo usuário. */
  respondida: boolean;
  /** URL da imagem associada. */
  imageUrl?: string;
  /** Subtemas associados à questão (hierarquia completa). */
  subtemas: SubtemaQuestaoDto[];
  /** IDs dos subtemas para o formulário. */
  subtemaIds?: number[];
  /** Cargos associados à questão. */
  cargos: CargoSummaryDto[];
  /** IDs dos cargos para o formulário. */
  cargoIds?: number[];
  /** Alternativas da questão. */
  alternativas: AlternativaDto[];
  /** Resumo da resposta mais recente do usuário para esta questão. */
  resposta?: RespostaSummaryDto;
  /** Histórico completo de respostas recentes. */
  respostas?: RespostaSummaryDto[];
}

/**
 * DTO detalhado de resposta incluindo alternativas da questão com gabarito.
 */
export interface RespostaDetailDto extends RespostaSummaryDto {
  /** Lista de alternativas da questão para contexto, incluindo gabarito após a resposta. */
  alternativas: AlternativaDto[];
}

/**
 * Request DTO para criação de uma resposta (tentativa do usuário).
 */
export interface RespostaCreateRequest {
  /** ID da questão respondida. */
  questaoId: number;
  /** ID da alternativa selecionada como resposta. */
  alternativaId: number;
  /** Raciocínio ou comentário do usuário para esta tentativa. */
  justificativa: string;
  /** ID do grau de dificuldade percebido (1=Fácil, 2=Média, 3=Difícil, 4=Chute). */
  dificuldadeId: number;
  /** Duração da tentativa em segundos (opcional). */
  tempoRespostaSegundos?: number;
  /** ID do simulado ao qual esta resposta pertence (opcional). */
  simuladoId?: number;
}

/**
 * DTO de disciplina dentro de um simulado com quantidade.
 */
export interface DisciplinaSimuladoDto {
  /** ID da disciplina. */
  id: number;
  /** Nome da disciplina. */
  nome: string;
  /** Quantidade de questões. */
  quantidade: number;
}

/**
 * DTO de tema dentro de um simulado com quantidade.
 */
export interface TemaSimuladoDto {
  /** ID do tema. */
  id: number;
  /** Nome do tema. */
  nome: string;
  /** Nome da disciplina vinculada. */
  disciplinaNome: string;
  /** Quantidade de questões. */
  quantidade: number;
}

/**
 * DTO de subtema dentro de um simulado com quantidade.
 */
export interface SubtemaSimuladoDto {
  /** ID do subtema. */
  id: number;
  /** Nome do subtema. */
  nome: string;
  /** Nome do tema vinculado. */
  temaNome: string;
  /** Nome da disciplina vinculada. */
  disciplinaNome: string;
  /** Quantidade de questões. */
  quantidade: number;
}

/**
 * DTO detalhado para um simulado, incluindo suas questões.
 */
export interface SimuladoDetailDto {
  /** ID único do simulado. */
  id: number;
  /** Nome do simulado. Example: "Simulado PC-SP 2024" */
  nome: string;
  /** Data e hora de início (ISO string). */
  startedAt?: string;
  /** Data e hora de término (ISO string). */
  finishedAt?: string;
  /** Banca de preferência. */
  banca?: BancaSummaryDto;
  /** Cargo de preferência. */
  cargo?: CargoSummaryDto;
  /** Lista de áreas de preferência. */
  areas?: string[];
  /** Nível de escolaridade preferencial. */
  nivel?: NivelCargo;
  /** Se o simulado ignorou questões já respondidas. */
  ignorarRespondidas?: boolean;
  /** Seleção de questões por Disciplina. */
  disciplinas?: DisciplinaSimuladoDto[];
  /** Seleção de questões por Tema. */
  temas?: TemaSimuladoDto[];
  /** Seleção de questões por Subtema. */
  subtemas?: SubtemaSimuladoDto[];
  /** Lista de questões associadas ao simulado. */
  questoes: QuestaoSummaryDto[];
}

/**
 * DTO resumido para listagem de simulados.
 */
export interface SimuladoSummaryDto {
  /** ID único do simulado. */
  id: number;
  /** Nome do simulado. */
  nome: string;
  /** Data de início. */
  startedAt?: string;
  /** Data de término. */
  finishedAt?: string;
  /** Banca de preferência. */
  banca?: BancaSummaryDto;
  /** Cargo de preferência. */
  cargo?: CargoSummaryDto;
  /** Áreas de preferência. */
  areas?: string[];
  /** Nível de escolaridade. */
  nivel?: NivelCargo;
  /** Se ignorou questões já respondidas. */
  ignorarRespondidas?: boolean;
  /** Seleção de disciplinas. */
  disciplinas?: DisciplinaSimuladoDto[];
  /** Seleção de temas. */
  temas?: TemaSimuladoDto[];
  /** Seleção de subtemas. */
  subtemas?: SubtemaSimuladoDto[];
}

/**
 * Representa a seleção de um item (Disciplina, Tema ou Subtema) e sua quantidade em um simulado.
 */
export interface SimuladoItemSelectionDto {
  /** ID do item (Disciplina, Tema ou Subtema). */
  id: number;
  /** Quantidade de questões desejadas para este ID. Example: 10 */
  quantidade: number;
}

/**
 * Request DTO para geração de um novo simulado.
 */
export interface SimuladoGenerationRequest {
  /** Nome identificador do simulado. */
  nome: string;
  /** ID da banca de preferência (opcional). */
  bancaId?: number;
  /** ID do cargo de preferência (opcional). */
  cargoId?: number;
  /** Áreas de preferência (opcional). */
  areas?: string[];
  /** Nível de escolaridade (opcional). */
  nivel?: NivelCargo;
  /** Se verdadeiro, ignora questões que o usuário já respondeu. Padrão: false. */
  ignorarRespondidas?: boolean;
  /** Seleção de quantidades por Disciplina. */
  disciplinas?: SimuladoItemSelectionDto[];
  /** Seleção de quantidades por Tema. */
  temas?: SimuladoItemSelectionDto[];
  /** Seleção de quantidades por Subtema. */
  subtemas?: SimuladoItemSelectionDto[];
}

/**
 * Estrutura genérica para respostas paginadas do backend.
 * @template T O tipo do conteúdo paginado.
 */
export interface PageResponse<T> {
  /** Lista de itens da página atual. */
  content: T[];
  /** Número da página atual (0..N). */
  pageNumber: number;
  /** Tamanho da página (número de itens por página). */
  pageSize: number;
  /** Total de elementos em todas as págias. */
  totalElements: number;
  /** Total de páginas disponíveis. */
  totalPages: number;
  /** Indica se esta é a última página. */
  last: boolean;
}

/**
 * Estrutura genérica para respostas da API.
 * @template T O tipo do dado retornado.
 */
export interface ApiResponse<T> {
  /** Dados da resposta. */
  data: T;
  /** Código de status HTTP. */
  status: number;
  /** Mensagem opcional de retorno. */
  message?: string;
}

/**

 * Parâmetros padrão para paginação e ordenação em requisições GET.

 */

export interface PaginationParams {

  /** Número da página (inicia em 0). */

  page?: number;

  /** Quantidade de itens por página. */

  size?: number;

  /** Campo para ordenação. */

  sort?: string;

  /** Direção da ordenação. */

  direction?: 'ASC' | 'DESC';

}



/**

 * DTO para métricas de consistência diária.

 */

export interface AnalyticsConsistenciaDto {

  date: string;

  totalAnswered: number;

  totalCorrect: number;

  totalTimeSeconds: number;

  activeStreak: number;

}



/**



 * DTO para domínio por tópico (Disciplina, Tema ou Subtema).



 */



export interface AnalyticsTopicMasteryDto {



  id: number;



  nome: string;



  totalAttempts: number;



  correctAttempts: number;



  avgTimeSeconds: number;



  masteryScore: number;



  difficultyStats: Record<string, { total: number; correct: number }>;



}







/**

 * DTO detalhado para domínio de uma disciplina com hierarquia.

 */

export interface AnalyticsTopicMasteryDetailDto extends AnalyticsTopicMasteryDto {

  children: AnalyticsTopicMasteryDto[];

}



/**

 * DTO para evolução temporal.

 */

export interface AnalyticsEvolucaoDto {

  period: string;

  overallAccuracy: number;

  avgResponseTime: number;

  difficultyDistribution: Record<string, number>;

}



/**

 * DTO para taxa de aprendizado em questões repetidas.

 */

export interface AnalyticsLearningRateDto {

  totalRepeatedQuestions: number;

  recoveryRate: number;

  retentionRate: number;

  data: {

    attemptNumber: number;

    accuracy: number;

  }[];

}
