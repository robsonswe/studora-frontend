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
      let errorMessage = `HTTP error! Status: ${response.status}`;
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

    return response.json();
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
   * Retorna uma página com todas as disciplinas cadastradas.
   */
  getAll: (params?: Types.PaginationParams): Promise<Types.PageResponse<Types.DisciplinaSummaryDto>> => 
    apiCall(`/disciplinas${buildQueryString(params)}`),
  
  /**
   * Obter disciplina por ID.
   * Retorna uma disciplina específica com base no ID fornecido.
   */
  getById: (id: number): Promise<Types.DisciplinaDetailDto> => 
    apiCall(`/disciplinas/${id}`),
  
  /**
   * Criar nova disciplina.
   */
  create: (data: { nome: string }): Promise<Types.DisciplinaSummaryDto> => 
    apiCall('/disciplinas', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar disciplina.
   */
  update: (id: number, data: { nome: string }): Promise<Types.DisciplinaDetailDto> => 
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
   */
  getAll: (params?: Types.PaginationParams & { nome?: string }): Promise<Types.PageResponse<Types.TemaSummaryDto>> => 
    apiCall(`/temas${buildQueryString(params)}`),
  
  /**
   * Obter tema por ID.
   */
  getById: (id: number): Promise<Types.TemaDetailDto> => 
    apiCall(`/temas/${id}`),
  
  /**
   * Obter temas por disciplina.
   */
  getByDisciplina: (disciplinaId: number): Promise<Types.TemaSummaryDto[]> => 
    apiCall(`/temas/disciplina/${disciplinaId}`),
  
  /**
   * Criar novo tema.
   */
  create: (data: { nome: string, disciplinaId: number }): Promise<Types.TemaSummaryDto> => 
    apiCall('/temas', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar tema.
   */
  update: (id: number, data: { nome: string, disciplinaId: number }): Promise<Types.TemaDetailDto> => 
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
   */
  getAll: (params?: Types.PaginationParams & { nome?: string }): Promise<Types.PageResponse<Types.SubtemaSummaryDto>> => 
    apiCall(`/subtemas${buildQueryString(params)}`),
  
  /**
   * Obter subtema por ID.
   */
  getById: (id: number): Promise<Types.SubtemaDetailDto> => 
    apiCall(`/subtemas/${id}`),
  
  /**
   * Obter subtemas por tema.
   */
  getByTema: (temaId: number): Promise<Types.SubtemaSummaryDto[]> => 
    apiCall(`/subtemas/tema/${temaId}`),
  
  /**
   * Criar novo subtema.
   */
  create: (data: { nome: string, temaId: number }): Promise<Types.SubtemaSummaryDto> => 
    apiCall('/subtemas', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar subtema.
   */
  update: (id: number, data: { nome: string, temaId: number }): Promise<Types.SubtemaDetailDto> => 
    apiCall(`/subtemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  /**
   * Excluir subtema.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/subtemas/${id}`, { method: 'DELETE' }),
};

/**
 * Endpoints para gerenciamento de concursos.
 */
export const concursoService = {
  /**
   * Obter todos os concursos.
   */
  getAll: (params?: Types.PaginationParams): Promise<Types.PageResponse<Types.ConcursoSummaryDto>> => 
    apiCall(`/concursos${buildQueryString(params)}`),
  
  /**
   * Obter concurso por ID.
   */
  getById: (id: number): Promise<Types.ConcursoDetailDto> => 
    apiCall(`/concursos/${id}`),
  
  /**
   * Criar novo concurso.
   */
  create: (data: Omit<Types.ConcursoSummaryDto, 'id'>): Promise<Types.ConcursoDetailDto> => 
    apiCall('/concursos', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar concurso.
   */
  update: (id: number, data: Omit<Types.ConcursoSummaryDto, 'id'>): Promise<Types.ConcursoDetailDto> => 
    apiCall(`/concursos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  /**
   * Excluir concurso.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/concursos/${id}`, { method: 'DELETE' }),
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
  getById: (id: number): Promise<Types.BancaSummaryDto> => 
    apiCall(`/bancas/${id}`),
  
  /**
   * Criar nova banca.
   */
  create: (data: { nome: string }): Promise<Types.BancaSummaryDto> => 
    apiCall('/bancas', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar banca.
   */
  update: (id: number, data: { nome: string }): Promise<Types.BancaSummaryDto> => 
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
  getById: (id: number): Promise<Types.InstituicaoSummaryDto> => 
    apiCall(`/instituicoes/${id}`),
  
  /**
   * Obter todas as áreas de instituições.
   */
  getAreas: (search?: string): Promise<string[]> => 
    apiCall(`/instituicoes/areas${buildQueryString({ search })}`),
  
  /**
   * Criar nova instituição.
   */
  create: (data: { nome: string, area: string }): Promise<Types.InstituicaoSummaryDto> => 
    apiCall('/instituicoes', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar instituição.
   */
  update: (id: number, data: { nome: string, area: string }): Promise<Types.InstituicaoSummaryDto> => 
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
   * Criar novo cargo.
   */
  create: (data: Omit<Types.CargoDetailDto, 'id'>): Promise<Types.CargoDetailDto> => 
    apiCall('/cargos', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar cargo.
   */
  update: (id: number, data: Omit<Types.CargoDetailDto, 'id'>): Promise<Types.CargoDetailDto> => 
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
   * Requer pelo menos 2 alternativas e 1 subtema.
   */
  create: (data: any): Promise<Types.QuestaoDetailDto> => 
    apiCall('/questoes', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Atualizar questão.
   */
  update: (id: number, data: any): Promise<Types.QuestaoDetailDto> => 
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
  getById: (id: number): Promise<Types.RespostaSummaryDto> => 
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
   * Gerar um novo simulado com base em preferências e pesos.
   */
  gerar: (data: Types.SimuladoGenerationRequest): Promise<Types.SimuladoDetailDto> => 
    apiCall('/simulados/gerar', { method: 'POST', body: JSON.stringify(data) }),
  
  /**
   * Registrar início do simulado (timestamp de início).
   */
  iniciar: (id: number): Promise<Types.SimuladoDetailDto> => 
    apiCall(`/simulados/${id}/iniciar`, { method: 'PATCH' }),
  
  /**
   * Registrar término do simulado.
   * @throws {ApiError} 422 if there are unanswered questions.
   */
  finalizar: (id: number): Promise<Types.SimuladoDetailDto> => 
    apiCall(`/simulados/${id}/finalizar`, { method: 'PATCH' }),
  
  /**
   * Excluir um simulado. Respostas são preservadas mas desvinculadas.
   */
  delete: (id: number): Promise<void> => 
    apiCall(`/simulados/${id}`, { method: 'DELETE' }),
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