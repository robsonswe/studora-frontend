// API Response Types based on the Studora API documentation

export interface TemaDto {
  id?: number;
  disciplinaId: number;
  nome: string;
}

export interface SubtemaDto {
  id?: number;
  temaId: number;
  nome: string;
}

export interface QuestaoDto {
  id?: number;
  concursoId: number;
  enunciado: string;
  anulada: boolean;
  subtemaIds: number[];
}

export interface AlternativaDto {
  id?: number;
  questaoId: number;
  ordem: number;
  texto: string;
  correta: boolean;
  justificativa?: string;
}

export interface RespostaDto {
  id?: number;
  questaoId: number;
  alternativaId: number;
  respondidaEm?: string; // ISO date string
}

export interface ConcursoDto {
  id?: number;
  nome: string;
  banca: string;
  ano: number;
  cargo?: string;
  nivel?: string;
  area?: string;
}

export interface DisciplinaDto {
  id?: number;
  nome: string;
}

export interface ImagemDto {
  id?: number;
  url: string;
  descricao?: string;
}

// UI State Types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}