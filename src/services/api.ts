/**
 * @fileoverview API Service for Studora Backend (v1).
 * Provides methods to interact with all backend endpoints including Questions, Simulations, and Taxonomy.
 */
import * as Types from '@/types';

const API_BASE_URL = 'http://localhost:4534/api/v1';

/**
 * Custom error class for API errors.
 * Parses RFC 7807 Problem Details and validation errors.
 */
export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper to build query string from object.
 * @param params Object containing key-value pairs for query parameters.
 * @returns Formatted query string starting with '?'.
 */
 
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return '';
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle array values as comma-separated strings for Spring Boot
      const formattedValue = Array.isArray(value) ? value.join(',') : value;
      return `${encodeURIComponent(key)}=${encodeURIComponent(formattedValue)}`;
    })
    .join('&');
  return query ? `?${query}` : '';
};

/**
 * Generic API call function.
 * @template T The expected return type.
 * @param endpoint The API endpoint relative to the base URL.
 * @param options Fetch options (method, body, headers).
 * @returns Promise resolving to the parsed JSON response.
 * @throws {ApiError} If the response is not OK or if a network error occurs.
 */
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`;
      let errorDetails;

      try {
        errorDetails = await response.json();
        // Handle RFC 7807 Problem Detail format
        if (errorDetails.detail) {
          errorMessage = errorDetails.detail;
        } else if (errorDetails.title) {
          errorMessage = errorDetails.title;
        }

        // Handle validation errors (400 Bad Request)
        if (response.status === 400 && errorDetails.errors) {
          const validationMsgs = Object.entries(errorDetails.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(', ');
          if (validationMsgs) {
            errorMessage = `${errorDetails.detail || 'Validation error'}: ${validationMsgs}`;
          }
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    // For DELETE requests, there might not be a response body
    if (response.status === 204) {
      return {} as T;
    }

    // Handle empty responses (PATCH/PUT/POST with 200 and no body)
    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      return {} as T;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError) {
      // Network error
      throw new ApiError('Network error. Please check your connection.', 0);
    }

    throw new ApiError('An unexpected error occurred', 500);
  }
};

/**
 * Endpoints para gerenciamento de disciplinas.
 */
export const disciplinaService = {
  /**
   * Obter todas as disciplinas.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'lean' | 'summary' | 'full' }): Promise<Types.PageResponse<Types.DisciplinaSummaryDto>> =>
    apiCall(`/disciplinas${buildQueryString(params)}`),

  /**
   * Obter disciplina por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.DisciplinaDetailDto> =>
    apiCall(`/disciplinas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Obter a hierarquia completa de uma disciplina (disciplina → temas → subtemas).
   * Substitui o padrão N+1 de chamadas separadas por tema/subtema.
   * @param metrics Nível de métricas. Padrão: 'full'.
   */
  getCompleto: (id: number, metrics?: 'lean' | 'full'): Promise<Types.DisciplinaDetailDto> =>
    apiCall(`/disciplinas/${id}/completo${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar nova disciplina.
   */
  create: (data: Types.DisciplinaCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/disciplinas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar disciplina.
   */
  update: (id: number, data: Types.DisciplinaUpdateRequest): Promise<void> =>
    apiCall(`/disciplinas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir disciplina.
   * @throws {ApiError} 409 if there are associated themes.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/disciplinas/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de temas.
 */
export const temaService = {
  /**
   * Obter todos os temas.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { 
    nome?: string; 
    disciplinaIds?: number | number[] | string;
    metrics?: 'lean' | 'summary' | 'full' 
  }): Promise<Types.PageResponse<Types.TemaSummaryDto>> =>
    apiCall(`/temas${buildQueryString(params)}`),

  /**
   * Obter tema por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.TemaDetailDto> =>
    apiCall(`/temas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo tema.
   */
  create: (data: Types.TemaCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/temas', { method: 'POST', body: JSON.stringify(data) }),


  /**
   * Atualizar tema.
   */
  update: (id: number, data: Types.TemaUpdateRequest): Promise<void> =>
    apiCall(`/temas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir tema.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/temas/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de subtemas.
 */
export const subtemaService = {
  /**
   * Obter todos os subtemas.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { 
    nome?: string; 
    temaIds?: number | number[] | string;
    disciplinaIds?: number | number[] | string;
    metrics?: 'lean' | 'summary' | 'full' 
  }): Promise<Types.PageResponse<Types.SubtemaSummaryDto>> =>
    apiCall(`/subtemas${buildQueryString(params)}`),

  /**
   * Obter subtema por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.SubtemaDetailDto> =>
    apiCall(`/subtemas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo subtema.
   */
  create: (data: Types.SubtemaCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/subtemas', { method: 'POST', body: JSON.stringify(data) }),


  /**
   * Atualizar subtema.
   */
  update: (id: number, data: Types.SubtemaUpdateRequest): Promise<void> =>
    apiCall(`/subtemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir subtema.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/subtemas/${id}`, { method: 'DELETE' }),

  /**
   * Adicionar uma sessão de estudo para o subtema.
   */
  addEstudo: (id: number): Promise<Types.PostResponseDto> =>
    apiCall(`/subtemas/${id}/estudos`, { method: 'POST' }),

  /**
   * Listar sessões de estudo de um subtema.
   */
  getEstudos: (id: number): Promise<Types.EstudoSubtemaDto[]> =>
    apiCall(`/subtemas/${id}/estudos`),

  /**
   * Excluir uma sessão de estudo específica.
   */
  deleteEstudo: (subtemaId: number, estudoId: number): Promise<void> =>
    apiCall(`/subtemas/${subtemaId}/estudos/${estudoId}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de concursos.
 */
export const concursoService = {
  /**
   * Obter todos os concursos.
   */
  getAll: (params?: Types.PaginationParams & {
    bancaId?: number;
    instituicaoId?: number;
    cargoId?: number;
    instituicaoArea?: string;
    cargoArea?: string;
    cargoNivel?: string;
    inscrito?: boolean;
    finalizado?: boolean;
  }): Promise<Types.PageResponse<Types.ConcursoSummaryDto>> =>
    apiCall(`/concursos${buildQueryString(params)}`),

  /**
   * Obter concurso por ID.
   * @param metrics Nível de métricas para os topicos nos cargos: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.ConcursoDetailDto> =>
    apiCall(`/concursos/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo concurso.
   */
  create: (data: Types.ConcursoCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/concursos', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar concurso.
   */
  update: (id: number, data: Types.ConcursoUpdateRequest): Promise<void> =>
    apiCall(`/concursos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir concurso.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/concursos/${id}`, { method: 'DELETE' }),

  /**
   * Alternar status de inscrição em um cargo de um concurso.
   */
  toggleInscricao: (concursoCargoId: number): Promise<void> =>
    apiCall(`/concursos/cargos/${concursoCargoId}/inscricao`, { method: 'PATCH' }),

  /**
   * Alternar status de finalizado de um concurso.
   */
  toggleFinalizado: (id: number): Promise<void> =>
    apiCall(`/concursos/${id}/finalizado`, { method: 'PATCH' }),
};

/**
 * Endpoints para gerenciamento de bancas organizadoras.
 */
export const bancaService = {
  /**
   * Obter todas as bancas.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'lean' | 'summary' | 'full' }): Promise<Types.PageResponse<Types.BancaSummaryDto>> =>
    apiCall(`/bancas${buildQueryString(params)}`),

  /**
   * Obter banca por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.BancaDetailDto> =>
    apiCall(`/bancas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar nova banca.
   */
  create: (data: Types.BancaCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/bancas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar banca.
   */
  update: (id: number, data: Types.BancaUpdateRequest): Promise<void> =>
    apiCall(`/bancas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir banca.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/bancas/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de instituições.
 */
export const instituicaoService = {
  /**
   * Obter todas as instituições.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'lean' | 'summary' | 'full' }): Promise<Types.PageResponse<Types.InstituicaoSummaryDto>> =>
    apiCall(`/instituicoes${buildQueryString(params)}`),

  /**
   * Obter instituição por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.InstituicaoDetailDto> =>
    apiCall(`/instituicoes/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Obter todas as áreas de instituições.
   */
  getAreas: (search?: string): Promise<string[]> =>
    apiCall(`/instituicoes/areas${buildQueryString({ search })}`),

  /**
   * Criar nova instituição.
   */
  create: (data: Types.InstituicaoCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/instituicoes', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar instituição.
   */
  update: (id: number, data: Types.InstituicaoUpdateRequest): Promise<void> =>
    apiCall(`/instituicoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir instituição.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/instituicoes/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de cargos.
 */
export const cargoService = {
  /**
   * Obter todos os cargos.
   * @param metrics Nível de métricas: 'lean', 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'lean' | 'summary' | 'full' }): Promise<Types.PageResponse<Types.CargoSummaryDto>> =>
    apiCall(`/cargos${buildQueryString(params)}`),

  /**
   * Obter cargo por ID.
   * @param metrics Nível de métricas: 'lean', 'full'. Padrão: lean.
   */
  getById: (id: number, metrics?: 'lean' | 'full'): Promise<Types.CargoDetailDto> =>
    apiCall(`/cargos/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Obter todas as áreas de cargos.
   */
  getAreas: (search?: string): Promise<string[]> =>
    apiCall(`/cargos/areas${buildQueryString({ search })}`),

  /**
   * Criar novo cargo.
   */
  create: (data: Types.CargoCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/cargos', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar cargo.
   */
  update: (id: number, data: Types.CargoUpdateRequest): Promise<void> =>
    apiCall(`/cargos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir cargo.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/cargos/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de questões.
 */
export const questaoService = {
  /**
   * Obter questões com filtros.
   */
  getAll: (params?: Types.PaginationParams & {
    bancaId?: number;
    instituicaoId?: number;
    concursoId?: number;
    cargoId?: number;
    disciplinaId?: number;
    temaId?: number;
    subtemaId?: number;
    instituicaoArea?: string;
    cargoArea?: string;
    cargoNivel?: string;
    anulada?: boolean;
    desatualizada?: boolean;
    autoral?: boolean;
    admin?: boolean;
  }): Promise<Types.PageResponse<Types.QuestaoSummaryDto>> =>
    apiCall(`/questoes${buildQueryString(params)}`),

  /**
   * Obter questão por ID.
   */
  getById: (id: number, admin: boolean = false): Promise<Types.QuestaoDetailDto> =>
    apiCall(`/questoes/${id}${buildQueryString({ admin })}`),

  /**
   * Obter uma questão aleatória com base em filtros.
   */
  getRandom: (params?: {
    bancaId?: number;
    instituicaoId?: number;
    cargoId?: number;
    disciplinaId?: number;
    temaId?: number;
    subtemaId?: number;
    instituicaoArea?: string;
    cargoArea?: string;
    cargoNivel?: string;
    anulada?: boolean;
    /** Se verdadeiro, questões autorais são incluídas na seleção aleatória. Padrão: false. */
    includeAutoral?: boolean;
  }): Promise<Types.QuestaoDetailDto> =>
    apiCall(`/questoes/random${buildQueryString(params)}`),
  
  /**
   * Criar nova questão.
   */
  create: (data: Types.QuestaoCreateRequest): Promise<Types.PostResponseDto> =>
    apiCall('/questoes', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar questão.
   */
  update: (id: number, data: Types.QuestaoUpdateRequest): Promise<void> =>
    apiCall(`/questoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  /**
   * Excluir questão.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/questoes/${id}`, { method: 'DELETE' }),
  
  /**
   * Alternar status de desatualizada.
   */
  toggleDesatualizada: (id: number): Promise<void> => 
    apiCall(`/questoes/${id}/desatualizada`, { method: 'PATCH' }),
};

/**
 * Endpoints para gerenciamento de respostas dos usuários.
 */
export const respostaService = {
  /**
   * Obter todas as respostas do usuário.
   */
  getAll: (params?: Types.PaginationParams): Promise<Types.PageResponse<Types.RespostaSummaryDto>> => 
    apiCall(`/respostas${buildQueryString(params)}`),
  
  /**
   * Obter resposta por ID.
   */
  getById: (id: number): Promise<Types.RespostaDetailDto> => 
    apiCall(`/respostas/${id}`),
  
  /**
   * Obter respostas por questão.
   */
  getByQuestao: (questaoId: number): Promise<Types.RespostaSummaryDto[]> => 
    apiCall(`/respostas/questao/${questaoId}`),
  
  /**
   * Criar nova resposta (registrar tentativa).
   */
  create: (data: Types.RespostaCreateRequest): Promise<Types.RespostaDetailDto> =>
    apiCall('/respostas', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Excluir resposta.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/respostas/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para geração e execução de simulados.
 */
export const simuladoService = {
  /**
   * Listar simulados do usuário.
   */
  getAll: (params?: Types.PaginationParams): Promise<Types.PageResponse<Types.SimuladoSummaryDto>> => 
    apiCall(`/simulados${buildQueryString(params)}`),
  
  /**
   * Obter detalhes de um simulado, incluindo questões.
   */
  getById: (id: number): Promise<Types.SimuladoDetailDto> => 
    apiCall(`/simulados/${id}`),
  
  /**
   * Gerar um novo simulado.
   */
  gerar: (data: Types.SimuladoGenerationRequest): Promise<Types.PostResponseDto> =>
    apiCall('/simulados/gerar', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Registrar início do simulado.
   */
  iniciar: (id: number): Promise<Types.SimuladoDetailDto> =>
    apiCall(`/simulados/${id}/iniciar`, { method: 'PATCH' }),

  /**
   * Registrar término do simulado.
   */
  finalizar: (id: number): Promise<Types.SimuladoDetailDto> =>
    apiCall(`/simulados/${id}/finalizar`, { method: 'PATCH' }),
  
  /**
   * Excluir um simulado.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/simulados/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para análise de desempenho e progresso.
 */
export const analyticsService = {
  /**
   * Obter métricas de consistência diária.
   */
  getConsistencia: (days: number = 30): Promise<Types.AnalyticsConsistenciaDto[]> => 
    apiCall(`/analytics/consistencia${buildQueryString({ days })}`),

  /**
   * Obter domínio por disciplinas.
   */
  getDisciplinasMastery: (params?: Types.PaginationParams & {
    minMastery?: number;
    maxMastery?: number;
  }): Promise<Types.PageResponse<Types.AnalyticsTopicMasteryDto>> => 
    apiCall(`/analytics/disciplinas${buildQueryString(params)}`),

  /**
   * Obter detalhes de domínio de uma disciplina (incluindo temas e subtemas).
   */
  getDisciplinaMasteryDetail: (id: number): Promise<Types.AnalyticsTopicMasteryDto> => 
    apiCall(`/analytics/disciplinas/${id}`),

  /**
   * Obter evolução temporal (snapshots semanais).
   */
  getEvolucao: (): Promise<Types.AnalyticsEvolucaoDto[]> => 
    apiCall('/analytics/evolucao'),

  /**
   * Obter taxa de aprendizado (questões repetidas).
   */
  getTaxaAprendizado: (): Promise<Types.AnalyticsLearningRateDto> => 
    apiCall('/analytics/taxa-aprendizado'),
};

/**
 * Endpoints para monitoramento e operação do sistema.
 */
export const operationalService = {
  /**
   * Verificar saúde do sistema.
   */
  health: (): Promise<{ status: string, message: string }> => 
    apiCall('/health'),
};
