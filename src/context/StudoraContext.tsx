import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  disciplinaService,
  concursoService,
  temaService,
  subtemaService,
  questaoService,
  alternativaService,
  respostaService,
  imagemService,
  ApiError
} from '../services/api';
import * as Types from '../types';

type DisciplinaDto = Types.DisciplinaDto;
type ConcursoDto = Types.ConcursoDto;
type TemaDto = Types.TemaDto;
type SubtemaDto = Types.SubtemaDto;
type QuestaoDto = Types.QuestaoDto;
type AlternativaDto = Types.AlternativaDto;
type RespostaDto = Types.RespostaDto;
type ImagemDto = Types.ImagemDto;

interface StudoraContextType {
  disciplinas: DisciplinaDto[];
  concursos: ConcursoDto[];
  temas: TemaDto[];
  subtemas: SubtemaDto[];
  questoes: QuestaoDto[];
  alternativas: AlternativaDto[];
  respostas: RespostaDto[];
  imagens: ImagemDto[];
  loading: {
    disciplinas: boolean;
    concursos: boolean;
    temas: boolean;
    subtemas: boolean;
    questoes: boolean;
    alternativas: boolean;
    respostas: boolean;
    imagens: boolean;
    all: boolean;
  };
  errors: {
    disciplinas?: ApiError;
    concursos?: ApiError;
    temas?: ApiError;
    subtemas?: ApiError;
    questoes?: ApiError;
    alternativas?: ApiError;
    respostas?: ApiError;
    imagens?: ApiError;
  };
  refreshDisciplinas: () => Promise<void>;
  refreshConcursos: () => Promise<void>;
  refreshTemas: () => Promise<void>;
  refreshSubtemas: () => Promise<void>;
  refreshQuestoes: () => Promise<void>;
  refreshAlternativas: () => Promise<void>;
  refreshRespostas: () => Promise<void>;
  refreshImagens: () => Promise<void>;
}

const StudoraContext = createContext<StudoraContextType | undefined>(undefined);

export const useStudora = () => {
  const context = useContext(StudoraContext);
  if (!context) {
    throw new Error('useStudora must be used within a StudoraProvider');
  }
  return context;
};

interface StudoraProviderProps {
  children: ReactNode;
}

export const StudoraProvider = ({ children }: StudoraProviderProps) => {
  const [disciplinas, setDisciplinas] = useState<DisciplinaDto[]>([]);
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [temas, setTemas] = useState<TemaDto[]>([]);
  const [subtemas, setSubtemas] = useState<SubtemaDto[]>([]);
  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [alternativas, setAlternativas] = useState<AlternativaDto[]>([]);
  const [respostas, setRespostas] = useState<RespostaDto[]>([]);
  const [imagens, setImagens] = useState<ImagemDto[]>([]);
  const [loading, setLoading] = useState({
    disciplinas: false,
    concursos: false,
    temas: false,
    subtemas: false,
    questoes: false,
    alternativas: false,
    respostas: false,
    imagens: false,
    all: true
  });
  const [errors, setErrors] = useState({
    disciplinas: undefined,
    concursos: undefined,
    temas: undefined,
    subtemas: undefined,
    questoes: undefined,
    alternativas: undefined,
    respostas: undefined,
    imagens: undefined
  } as {
    disciplinas?: ApiError;
    concursos?: ApiError;
    temas?: ApiError;
    subtemas?: ApiError;
    questoes?: ApiError;
    alternativas?: ApiError;
    respostas?: ApiError;
    imagens?: ApiError;
  });

  const updateLoadingState = (entity: keyof typeof loading, isLoading: boolean) => {
    setLoading(prev => ({
      ...prev,
      [entity]: isLoading,
      all: Object.values({...prev, [entity]: isLoading}).some(val => val === true)
    }));
  };

  const setError = (entity: keyof typeof errors, error?: ApiError) => {
    setErrors(prev => ({
      ...prev,
      [entity]: error
    }));
  };

  const refreshDisciplinas = async () => {
    updateLoadingState('disciplinas', true);
    try {
      const data = await disciplinaService.getAll();
      setDisciplinas(data);
      setError('disciplinas', undefined);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      setError('disciplinas', error as ApiError);
    } finally {
      updateLoadingState('disciplinas', false);
    }
  };

  const refreshConcursos = async () => {
    updateLoadingState('concursos', true);
    try {
      const data = await concursoService.getAll();
      setConcursos(data);
      setError('concursos', undefined);
    } catch (error) {
      console.error('Erro ao carregar concursos:', error);
      setError('concursos', error as ApiError);
    } finally {
      updateLoadingState('concursos', false);
    }
  };

  const refreshTemas = async () => {
    updateLoadingState('temas', true);
    try {
      const data = await temaService.getAll();
      setTemas(data);
      setError('temas', undefined);
    } catch (error) {
      console.error('Erro ao carregar temas:', error);
      setError('temas', error as ApiError);
    } finally {
      updateLoadingState('temas', false);
    }
  };

  const refreshSubtemas = async () => {
    updateLoadingState('subtemas', true);
    try {
      const data = await subtemaService.getAll();
      setSubtemas(data);
      setError('subtemas', undefined);
    } catch (error) {
      console.error('Erro ao carregar subtemas:', error);
      setError('subtemas', error as ApiError);
    } finally {
      updateLoadingState('subtemas', false);
    }
  };

  const refreshQuestoes = async () => {
    updateLoadingState('questoes', true);
    try {
      const data = await questaoService.getAll();
      setQuestoes(data);
      setError('questoes', undefined);
    } catch (error) {
      console.error('Erro ao carregar questoes:', error);
      setError('questoes', error as ApiError);
    } finally {
      updateLoadingState('questoes', false);
    }
  };

  const refreshAlternativas = async () => {
    updateLoadingState('alternativas', true);
    try {
      const data = await alternativaService.getAll();
      setAlternativas(data);
      setError('alternativas', undefined);
    } catch (error) {
      console.error('Erro ao carregar alternativas:', error);
      setError('alternativas', error as ApiError);
    } finally {
      updateLoadingState('alternativas', false);
    }
  };

  const refreshRespostas = async () => {
    updateLoadingState('respostas', true);
    try {
      const data = await respostaService.getAll();
      setRespostas(data);
      setError('respostas', undefined);
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      setError('respostas', error as ApiError);
    } finally {
      updateLoadingState('respostas', false);
    }
  };

  const refreshImagens = async () => {
    updateLoadingState('imagens', true);
    try {
      const data = await imagemService.getAll();
      setImagens(data);
      setError('imagens', undefined);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      setError('imagens', error as ApiError);
    } finally {
      updateLoadingState('imagens', false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(prev => ({...prev, all: true}));
      await Promise.all([
        refreshDisciplinas(),
        refreshConcursos(),
        refreshTemas(),
        refreshSubtemas(),
        refreshQuestoes(),
        refreshAlternativas(),
        refreshRespostas(),
        refreshImagens(),
      ]);
      setLoading(prev => ({...prev, all: false}));
    };

    loadData();
  }, []);

  const value = {
    disciplinas,
    concursos,
    temas,
    subtemas,
    questoes,
    alternativas,
    respostas,
    imagens,
    loading,
    errors,
    refreshDisciplinas,
    refreshConcursos,
    refreshTemas,
    refreshSubtemas,
    refreshQuestoes,
    refreshAlternativas,
    refreshRespostas,
    refreshImagens,
  };

  return (
    <StudoraContext.Provider value={value}>
      {children}
    </StudoraContext.Provider>
  );
};