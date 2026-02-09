import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  disciplinaService,
  concursoService,
  temaService,
  subtemaService,
  questaoService,
  respostaService,
  bancaService,
  instituicaoService,
  cargoService,
  simuladoService,
  ApiError
} from '../services/api';
import * as Types from '../types';

interface StudoraContextType {
  disciplinas: Types.DisciplinaSummaryDto[];
  concursos: Types.ConcursoSummaryDto[];
  temas: Types.TemaSummaryDto[];
  subtemas: Types.SubtemaSummaryDto[];
  questoes: Types.QuestaoSummaryDto[];
  respostas: Types.RespostaSummaryDto[];
  bancas: Types.BancaSummaryDto[];
  instituicoes: Types.InstituicaoSummaryDto[];
  cargos: Types.CargoDetailDto[];
  loading: {
    disciplinas: boolean;
    concursos: boolean;
    temas: boolean;
    subtemas: boolean;
    questoes: boolean;
    respostas: boolean;
    bancas: boolean;
    instituicoes: boolean;
    cargos: boolean;
    all: boolean;
  };
  errors: {
    disciplinas?: ApiError;
    concursos?: ApiError;
    temas?: ApiError;
    subtemas?: ApiError;
    questoes?: ApiError;
    respostas?: ApiError;
    bancas?: ApiError;
    instituicoes?: ApiError;
    cargos?: ApiError;
  };
  refreshDisciplinas: () => Promise<void>;
  refreshConcursos: () => Promise<void>;
  refreshTemas: () => Promise<void>;
  refreshSubtemas: () => Promise<void>;
  refreshQuestoes: () => Promise<void>;
  refreshRespostas: () => Promise<void>;
  refreshBancas: () => Promise<void>;
  refreshInstituicoes: () => Promise<void>;
  refreshCargos: () => Promise<void>;
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
  const [disciplinas, setDisciplinas] = useState<Types.DisciplinaSummaryDto[]>([]);
  const [concursos, setConcursos] = useState<Types.ConcursoSummaryDto[]>([]);
  const [temas, setTemas] = useState<Types.TemaSummaryDto[]>([]);
  const [subtemas, setSubtemas] = useState<Types.SubtemaSummaryDto[]>([]);
  const [questoes, setQuestoes] = useState<Types.QuestaoSummaryDto[]>([]);
  const [respostas, setRespostas] = useState<Types.RespostaSummaryDto[]>([]);
  const [bancas, setBancas] = useState<Types.BancaSummaryDto[]>([]);
  const [instituicoes, setInstituicoes] = useState<Types.InstituicaoSummaryDto[]>([]);
  const [cargos, setCargos] = useState<Types.CargoDetailDto[]>([]);
  
  const [loading, setLoading] = useState({
    disciplinas: false,
    concursos: false,
    temas: false,
    subtemas: false,
    questoes: false,
    respostas: false,
    bancas: false,
    instituicoes: false,
    cargos: false,
    all: true
  });
  
  const [errors, setErrors] = useState({
    disciplinas: undefined,
    concursos: undefined,
    temas: undefined,
    subtemas: undefined,
    questoes: undefined,
    respostas: undefined,
    bancas: undefined,
    instituicoes: undefined,
    cargos: undefined
  } as any);

  const updateLoadingState = (entity: keyof typeof loading, isLoading: boolean) => {
    setLoading(prev => {
      const newState = { ...prev, [entity]: isLoading };
      const { all, ...rest } = newState;
      newState.all = Object.values(rest).some(val => val === true);
      return newState;
    });
  };

  const setError = (entity: string, error?: ApiError) => {
    setErrors(prev => ({
      ...prev,
      [entity]: error
    }));
  };

  const refreshDisciplinas = async () => {
    updateLoadingState('disciplinas', true);
    try {
      const data = await disciplinaService.getAll({ size: 1000 });
      setDisciplinas(data.content);
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
      const data = await concursoService.getAll({ size: 1000 });
      setConcursos(data.content);
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
      const data = await temaService.getAll({ size: 1000 });
      setTemas(data.content);
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
      const data = await subtemaService.getAll({ size: 1000 });
      setSubtemas(data.content);
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
      const data = await questaoService.getAll({ size: 1000 });
      setQuestoes(data.content);
      setError('questoes', undefined);
    } catch (error) {
      console.error('Erro ao carregar questoes:', error);
      setError('questoes', error as ApiError);
    } finally {
      updateLoadingState('questoes', false);
    }
  };

  const refreshRespostas = async () => {
    updateLoadingState('respostas', true);
    try {
      const data = await respostaService.getAll({ size: 1000 });
      setRespostas(data.content);
      setError('respostas', undefined);
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      setError('respostas', error as ApiError);
    } finally {
      updateLoadingState('respostas', false);
    }
  };

  const refreshBancas = async () => {
    updateLoadingState('bancas', true);
    try {
      const data = await bancaService.getAll({ size: 1000 });
      setBancas(data.content);
      setError('bancas', undefined);
    } catch (error) {
      console.error('Erro ao carregar bancas:', error);
      setError('bancas', error as ApiError);
    } finally {
      updateLoadingState('bancas', false);
    }
  };

  const refreshInstituicoes = async () => {
    updateLoadingState('instituicoes', true);
    try {
      const data = await instituicaoService.getAll({ size: 1000 });
      setInstituicoes(data.content);
      setError('instituicoes', undefined);
    } catch (error) {
      console.error('Erro ao carregar instituições:', error);
      setError('instituicoes', error as ApiError);
    } finally {
      updateLoadingState('instituicoes', false);
    }
  };

  const refreshCargos = async () => {
    updateLoadingState('cargos', true);
    try {
      const data = await cargoService.getAll({ size: 1000 });
      setCargos(data.content);
      setError('cargos', undefined);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      setError('cargos', error as ApiError);
    } finally {
      updateLoadingState('cargos', false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(prev => ({...prev, all: true}));
      // Only fetch basic taxonomy/structure if needed, or leave empty for pages to fetch
      await Promise.all([
        refreshDisciplinas(),
        refreshBancas(),
        refreshInstituicoes(),
        refreshCargos()
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
    respostas,
    bancas,
    instituicoes,
    cargos,
    loading,
    errors,
    refreshDisciplinas,
    refreshConcursos,
    refreshTemas,
    refreshSubtemas,
    refreshQuestoes,
    refreshRespostas,
    refreshBancas,
    refreshInstituicoes,
    refreshCargos,
  };

  return (
    <StudoraContext.Provider value={value}>
      {children}
    </StudoraContext.Provider>
  );
};