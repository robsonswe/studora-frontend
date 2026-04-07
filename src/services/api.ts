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
  public details?: any;

  constructor(message: string, status: number, details?: any) {
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
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
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
      } catch (e) {
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
   * @param metrics Nível de métricas: 'summary' (progresso+acurácia), 'full' (+tempo+dificuldade). Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'summary' | 'full' }): Promise<Types.PageResponse<Types.DisciplinaSummaryDto>> =>
    apiCall(`/disciplinas${buildQueryString(params)}`),

  /**
   * Obter disciplina por ID.
   * @param metrics Nível de métricas: 'full' para todas as métricas. Padrão: lean.
   */
  getById: (id: number, metrics?: 'full'): Promise<Types.DisciplinaDetailDto> =>
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
   * Retorna 201 sem body. Re-fetch via GET com metrics apropriado.
   */
  create: (data: { nome: string }): Promise<void> =>
    apiCall('/disciplinas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar disciplina.
   * Retorna 200 sem body. Re-fetch via GET com metrics apropriado.
   */
  update: (id: number, data: { nome: string }): Promise<void> =>
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
   * @param metrics Nível de métricas: 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'summary' | 'full' }): Promise<Types.PageResponse<Types.TemaSummaryDto>> =>
    apiCall(`/temas${buildQueryString(params)}`),

  /**
   * Obter tema por ID.
   * @param metrics Nível de métricas: 'full' para todas as métricas. Padrão: lean.
   */
  getById: (id: number, metrics?: 'full'): Promise<Types.TemaDetailDto> =>
    apiCall(`/temas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Obter temas por disciplina.
   * @param metrics Nível de métricas. Padrão: lean.
   */
  getByDisciplina: (disciplinaId: number, metrics?: 'summary' | 'full'): Promise<Types.TemaSummaryDto[]> =>
    apiCall(`/temas/disciplina/${disciplinaId}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo tema. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: { nome: string, disciplinaId: number }): Promise<void> =>
    apiCall('/temas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar tema. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: { nome: string, disciplinaId: number }): Promise<void> =>
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
   * @param metrics Nível de métricas: 'summary', 'full'. Padrão: lean.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string; metrics?: 'summary' | 'full' }): Promise<Types.PageResponse<Types.SubtemaSummaryDto>> =>
    apiCall(`/subtemas${buildQueryString(params)}`),

  /**
   * Obter subtema por ID.
   * @param metrics Nível de métricas: 'full' para todas as métricas. Padrão: lean.
   */
  getById: (id: number, metrics?: 'full'): Promise<Types.SubtemaDetailDto> =>
    apiCall(`/subtemas/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Obter subtemas por tema.
   * @param metrics Nível de métricas. Padrão: lean.
   */
  getByTema: (temaId: number, metrics?: 'summary' | 'full'): Promise<Types.SubtemaSummaryDto[]> =>
    apiCall(`/subtemas/tema/${temaId}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo subtema. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: { nome: string, temaId: number }): Promise<void> =>
    apiCall('/subtemas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar subtema. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: { nome: string, temaId: number }): Promise<void> =>
    apiCall(`/subtemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Excluir subtema.
   */
  delete: (id: number): Promise<void> =>
    apiCall(`/subtemas/${id}`, { method: 'DELETE' }),

  /**
   * Adicionar uma sessão de estudo para o subtema.
   */
  addEstudo: (id: number): Promise<Types.EstudoSubtemaDto> =>
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
  }): Promise<Types.PageResponse<Types.ConcursoSummaryDto>> =>
    apiCall(`/concursos${buildQueryString(params)}`),

  /**
   * Obter concurso por ID.
   * @param metrics Nível de métricas para os topicos nos cargos: 'full' para métricas. Padrão: lean.
   */
  getById: (id: number, metrics?: 'full'): Promise<Types.ConcursoDetailDto> =>
    apiCall(`/concursos/${id}${buildQueryString(metrics ? { metrics } : undefined)}`),

  /**
   * Criar novo concurso. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: Types.ConcursoCreateRequest): Promise<void> =>
    apiCall('/concursos', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar concurso. Retorna 200 sem body. Re-fetch via GET.
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
   * Retorna 200 sem body. Re-fetch via GET.
   */
  toggleInscricao: (concursoCargoId: number): Promise<void> =>
    apiCall(`/concursos/cargos/${concursoCargoId}/inscricao`, { method: 'PATCH' }),
};

/**
 * Endpoints para gerenciamento de bancas organizadoras.
 */
export const bancaService = {
  /**
   * Obter todas as bancas.
   */
  getAll: (params?: Types.PaginationParams & { nome?: string }): Promise<Types.PageResponse<Types.BancaSummaryDto>> =>
    apiCall(`/bancas${buildQueryString(params)}`),

  /**
   * Obter banca por ID.
   */
  getById: (id: number): Promise<Types.BancaDetailDto> =>
    apiCall(`/bancas/${id}`),

  /**
   * Criar nova banca. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: { nome: string }): Promise<void> =>
    apiCall('/bancas', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar banca. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: { nome: string }): Promise<void> =>
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
   */
  getAll: (params?: Types.PaginationParams & { nome?: string }): Promise<Types.PageResponse<Types.InstituicaoSummaryDto>> =>
    apiCall(`/instituicoes${buildQueryString(params)}`),

  /**
   * Obter instituição por ID.
   */
  getById: (id: number): Promise<Types.InstituicaoDetailDto> =>
    apiCall(`/instituicoes/${id}`),

  /**
   * Obter todas as áreas de instituições.
   */
  getAreas: (search?: string): Promise<string[]> =>
    apiCall(`/instituicoes/areas${buildQueryString({ search })}`),

  /**
   * Criar nova instituição. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: { nome: string, area: string }): Promise<void> =>
    apiCall('/instituicoes', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar instituição. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: { nome: string, area: string }): Promise<void> =>
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
   */
  getAll: (params?: Types.PaginationParams & { nome?: string }): Promise<Types.PageResponse<Types.CargoDetailDto>> =>
    apiCall(`/cargos${buildQueryString(params)}`),

  /**
   * Obter cargo por ID.
   */
  getById: (id: number): Promise<Types.CargoDetailDto> =>
    apiCall(`/cargos/${id}`),

  /**
   * Obter todas as áreas de cargos.
   */
  getAreas: (search?: string): Promise<string[]> =>
    apiCall(`/cargos/areas${buildQueryString({ search })}`),

  /**
   * Criar novo cargo. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: Omit<Types.CargoDetailDto, 'id'>): Promise<void> =>
    apiCall('/cargos', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar cargo. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: Omit<Types.CargoDetailDto, 'id'>): Promise<void> =>
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
   * Retorna uma página de questões com gabaritos ocultos ou visíveis dependendo do histórico do usuário.
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
    admin?: boolean;
  }): Promise<Types.PageResponse<Types.QuestaoSummaryDto>> => 
    apiCall(`/questoes${buildQueryString(params)}`),
  
  /**
   * Obter questão por ID.
   * O gabarito é visível apenas se a questão tiver sido respondida nos últimos 30 dias,
   * a menos que o parâmetro 'admin' seja verdadeiro.
   * @param id ID da questão.
   * @param admin Se verdadeiro, força a visibilidade de todos os campos (gabarito).
   */
  getById: (id: number, admin: boolean = false): Promise<Types.QuestaoDetailDto> => 
    apiCall(`/questoes/${id}${buildQueryString({ admin })}`),
  
  /**
   * Obter uma questão aleatória com base em filtros.
   * Questões respondidas recentemente são excluídas da seleção.
   */
  getRandom: (params?: {
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
  }): Promise<Types.QuestaoDetailDto> => 
    apiCall(`/questoes/random${buildQueryString(params)}`),
  
  /**
   * Criar nova questão.
   * Requer pelo menos 2 alternativas e 1 subtema. Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: any): Promise<void> =>
    apiCall('/questoes', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Atualizar questão. Retorna 200 sem body. Re-fetch via GET.
   */
  update: (id: number, data: any): Promise<void> =>
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
   * Criar nova resposta (registrar tentativa). Retorna 201 sem body. Re-fetch via GET.
   */
  create: (data: Types.RespostaCreateRequest): Promise<void> =>
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
   * Gerar um novo simulado com base em preferências e pesos. Retorna 201 sem body. Re-fetch via GET.
   */
  gerar: (data: Types.SimuladoGenerationRequest): Promise<void> =>
    apiCall('/simulados/gerar', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Registrar início do simulado (timestamp de início). Retorna 200 sem body. Re-fetch via GET.
   */
  iniciar: (id: number): Promise<void> =>
    apiCall(`/simulados/${id}/iniciar`, { method: 'PATCH' }),

  /**
   * Registrar término do simulado. Retorna 200 sem body. Re-fetch via GET.
   * @throws {ApiError} 422 if there are unanswered questions.
   */
  finalizar: (id: number): Promise<void> =>
    apiCall(`/simulados/${id}/finalizar`, { method: 'PATCH' }),
  
  /**
   * Excluir um simulado. Respostas são preservadas mas desvinculadas.
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