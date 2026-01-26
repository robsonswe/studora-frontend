// API Service for Studora Backend
import * as Types from '@/types';

type DisciplinaDto = Types.DisciplinaDto;
type ConcursoDto = Types.ConcursoDto;
type TemaDto = Types.TemaDto;
type SubtemaDto = Types.SubtemaDto;
type QuestaoDto = Types.QuestaoDto;
type AlternativaDto = Types.AlternativaDto;
type RespostaDto = Types.RespostaDto;
type ImagemDto = Types.ImagemDto;

const API_BASE_URL = 'http://localhost:4534/api';

// Custom error class for API errors
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

// Generic API call function
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
        errorMessage = errorDetails.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    // For DELETE requests, there might not be a response body
    if (response.status === 204 || endpoint.includes('DELETE')) {
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

// Disciplina API functions
export const disciplinaService = {
  getAll: (): Promise<DisciplinaDto[]> => apiCall('/disciplinas'),
  getById: (id: number): Promise<DisciplinaDto> => apiCall(`/disciplinas/${id}`),
  create: (data: Omit<DisciplinaDto, 'id'>): Promise<DisciplinaDto> => 
    apiCall('/disciplinas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: DisciplinaDto): Promise<DisciplinaDto> => 
    apiCall(`/disciplinas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/disciplinas/${id}`, { method: 'DELETE' }),
};

// Concurso API functions
export const concursoService = {
  getAll: (): Promise<ConcursoDto[]> => apiCall('/concursos'),
  getById: (id: number): Promise<ConcursoDto> => apiCall(`/concursos/${id}`),
  create: (data: Omit<ConcursoDto, 'id'>): Promise<ConcursoDto> => 
    apiCall('/concursos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ConcursoDto): Promise<ConcursoDto> => 
    apiCall(`/concursos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/concursos/${id}`, { method: 'DELETE' }),
};

// Tema API functions
export const temaService = {
  getAll: (): Promise<TemaDto[]> => apiCall('/temas'),
  getById: (id: number): Promise<TemaDto> => apiCall(`/temas/${id}`),
  create: (data: Omit<TemaDto, 'id'>): Promise<TemaDto> => 
    apiCall('/temas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: TemaDto): Promise<TemaDto> => 
    apiCall(`/temas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/temas/${id}`, { method: 'DELETE' }),
  getByDisciplina: (disciplinaId: number): Promise<TemaDto[]> => 
    apiCall(`/temas/disciplina/${disciplinaId}`),
};

// Subtema API functions
export const subtemaService = {
  getAll: (): Promise<SubtemaDto[]> => apiCall('/subtemas'),
  getById: (id: number): Promise<SubtemaDto> => apiCall(`/subtemas/${id}`),
  create: (data: Omit<SubtemaDto, 'id'>): Promise<SubtemaDto> => 
    apiCall('/subtemas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: SubtemaDto): Promise<SubtemaDto> => 
    apiCall(`/subtemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/subtemas/${id}`, { method: 'DELETE' }),
  getByTema: (temaId: number): Promise<SubtemaDto[]> => 
    apiCall(`/subtemas/tema/${temaId}`),
};

// Questao API functions
export const questaoService = {
  getAll: (): Promise<QuestaoDto[]> => apiCall('/questoes'),
  getById: (id: number): Promise<QuestaoDto> => apiCall(`/questoes/${id}`),
  create: (data: Omit<QuestaoDto, 'id'>): Promise<QuestaoDto> => 
    apiCall('/questoes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: QuestaoDto): Promise<QuestaoDto> => 
    apiCall(`/questoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/questoes/${id}`, { method: 'DELETE' }),
  getBySubtema: (subtemaId: number): Promise<QuestaoDto[]> => 
    apiCall(`/questoes/subtema/${subtemaId}`),
  getNaoAnuladas: (): Promise<QuestaoDto[]> => apiCall('/questoes/nao-anuladas'),
  getByConcurso: (concursoId: number): Promise<QuestaoDto[]> => 
    apiCall(`/questoes/concurso/${concursoId}`),
};

// Alternativa API functions
export const alternativaService = {
  getAll: (): Promise<AlternativaDto[]> => apiCall('/alternativas'),
  getById: (id: number): Promise<AlternativaDto> => apiCall(`/alternativas/${id}`),
  create: (data: Omit<AlternativaDto, 'id'>): Promise<AlternativaDto> => 
    apiCall('/alternativas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: AlternativaDto): Promise<AlternativaDto> => 
    apiCall(`/alternativas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/alternativas/${id}`, { method: 'DELETE' }),
  getByQuestao: (questaoId: number): Promise<AlternativaDto[]> => 
    apiCall(`/alternativas/questao/${questaoId}`),
  getCorretasByQuestao: (questaoId: number): Promise<AlternativaDto[]> => 
    apiCall(`/alternativas/questao/${questaoId}/corretas`),
};

// Resposta API functions
export const respostaService = {
  getAll: (): Promise<RespostaDto[]> => apiCall('/respostas'),
  getById: (id: number): Promise<RespostaDto> => apiCall(`/respostas/${id}`),
  create: (data: Omit<RespostaDto, 'id'>): Promise<RespostaDto> => 
    apiCall('/respostas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: RespostaDto): Promise<RespostaDto> => 
    apiCall(`/respostas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/respostas/${id}`, { method: 'DELETE' }),
  getByQuestao: (questaoId: number): Promise<RespostaDto[]> => 
    apiCall(`/respostas/questao/${questaoId}`),
  getByAlternativa: (alternativaId: number): Promise<RespostaDto[]> => 
    apiCall(`/respostas/alternativa/${alternativaId}`),
};

// Imagem API functions
export const imagemService = {
  getAll: (): Promise<ImagemDto[]> => apiCall('/imagens'),
  getById: (id: number): Promise<ImagemDto> => apiCall(`/imagens/${id}`),
  create: (data: Omit<ImagemDto, 'id'>): Promise<ImagemDto> => 
    apiCall('/imagens', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: ImagemDto): Promise<ImagemDto> => 
    apiCall(`/imagens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<void> => 
    apiCall(`/imagens/${id}`, { method: 'DELETE' }),
};