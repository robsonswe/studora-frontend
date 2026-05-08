'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import FormModal from '@/components/ui/FormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { concursoService, bancaService, instituicaoService, cargoService, subtemaService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import AsyncSelect from 'react-select/async';
import { formatNivel, formatDateTime, utcToLocalInputValue, localInputValueToUtc } from '@/utils/formatters';
import {
  FileText,
  Plus,
  Pencil,
  Check,
  Trash2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Hash,
  SlidersHorizontal,
  X,
  Target,
  BookOpen,
  ClipboardList
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import SubtemaPickerModal from '@/components/concursos/SubtemaPickerModal';
import { useToast } from '@/components/ui/ToastContext';
import type { CSSProperties } from 'react';

type ConcursoDto = Types.ConcursoSummaryDto;


interface SecaoEntry {
  id: string;
  nome: string;
  ordem: number;
  numQuestoes: number;
  peso: number;
  notaMinima: number;
  disciplinas: DisciplinaEntry[];
}

interface DisciplinaEntry {
  id: string;
  nome: string;
  peso: number | null;
  numQuestoes: number | null;
  notaMinima: number | null;
  subtemas: { value: number, label: string }[];
}

interface CargoWithSecoes {
  cargoId: number;
  cargoNome: string;
  secoes: SecaoEntry[];
}

interface ProvaEntry {
  id: string;
  nome: string;
  cargoId: number | null;
}


function ConcursosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // ─── Read filter state from URL ───────────────────────────────────────────
  const urlPage = Number(searchParams?.get('page')) || 0;
  const urlBancaId = Number(searchParams?.get('bancaId')) || 0;
  const urlBancaLabel = searchParams?.get('bancaLabel') || '';
  const urlInstituicaoId = Number(searchParams?.get('instituicaoId')) || 0;
  const urlInstituicaoLabel = searchParams?.get('instituicaoLabel') || '';
  const urlCargoNivel = searchParams?.get('cargoNivel') || '';
  const urlInstituicaoArea = searchParams?.get('instituicaoArea') || '';
  const urlCargoArea = searchParams?.get('cargoArea') || '';
  const urlFinalizado = searchParams?.get('finalizado') || '';
  const urlShowAdvanced = searchParams?.get('advanced') === '1';

  // ─── Derived select values from URL ──────────────────────────────────────
  const selectedBanca = urlBancaId ? { value: urlBancaId, label: urlBancaLabel } : null;
  const selectedInstituicao = urlInstituicaoId ? { value: urlInstituicaoId, label: urlInstituicaoLabel } : null;
  const selectedInstituicaoArea = urlInstituicaoArea ? { value: urlInstituicaoArea, label: urlInstituicaoArea } : null;
  const selectedCargoArea = urlCargoArea ? { value: urlCargoArea, label: urlCargoArea } : null;

  // ─── Local filter state (updated by selectors, applied on button click) ───
  const [localBanca, setLocalBanca] = useState<{ value: number, label: string } | null>(selectedBanca);
  const [localInstituicao, setLocalInstituicao] = useState<{ value: number, label: string } | null>(selectedInstituicao);
  const [localCargoNivel, setLocalCargoNivel] = useState<string>(urlCargoNivel);
  const [localFinalizado, setLocalFinalizado] = useState<string>(urlFinalizado);
  const [localInstituicaoArea, setLocalInstituicaoArea] = useState<{ value: string, label: string } | null>(selectedInstituicaoArea);
  const [localCargoArea, setLocalCargoArea] = useState<{ value: string, label: string } | null>(selectedCargoArea);

  // ─── Page state ───────────────────────────────────────────────────────────
  const [concursos, setConcursos] = useState<ConcursoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subtemaPickerOpen, setSubtemaPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConcursoDto | null>(null);
  const [editingProvaId, setEditingProvaId] = useState<string | null>(null);
  const [editingProvaValue, setEditingProvaValue] = useState('');
  const [formTab, setFormTab] = useState<'dados' | 'provas' | 'conteudo'>('dados');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [pickingSubtemasFor, setPickingSubtemasFor] = useState<{ cargoId: number, secaoId: string, discId: string } | null>(null);

  const [formData, setFormData] = useState<{
    instituicao: { value: number, label: string } | null;
    banca: { value: number, label: string } | null;
    ano: number;
    mes: number;
    edital: string;
    dataProva: string;
    finalizado: boolean;
    cargos: { value: number, label: string }[];
    cargoSecoes: CargoWithSecoes[];
    provas: ProvaEntry[];
    topicos: { id: number; nome: string }[];
  }>({
    instituicao: null as { value: number, label: string } | null,
    banca: null as { value: number, label: string } | null,
    ano: 2024,
    mes: 1,
    edital: '',
    dataProva: '',
    finalizado: false,
    cargos: [] as { value: number, label: string }[],
    cargoSecoes: [] as CargoWithSecoes[],
    provas: [] as ProvaEntry[],
    topicos: []
  });

  // Set current date only on mount to avoid hydration mismatch
  useEffect(() => {
    if (!editingItem && !modalOpen) {
setFormData((prev) => ({
        ...prev,
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1
      }));
    }
  }, [editingItem, modalOpen]);

  const [localLoading, setLocalLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [pagination, setPagination] = useState<Types.PageResponse<ConcursoDto>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemId: number | null;
    type: 'danger' | 'info';
    alertOnly?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemId: null,
    type: 'danger'
  });

  usePageTitle('Concursos', 'Admin');

  // ─── URL param helpers ────────────────────────────────────────────────────

  const updateFilters = useCallback((overrides: Record<string, string | number | null>, page = 0) => {
    const current = new URLSearchParams(searchParams?.toString());
    const next = new URLSearchParams();
    next.set('page', String(page));
    // Keep advanced panel state
    if (current.get('advanced')) next.set('advanced', current.get('advanced')!);
    // Merge current + overrides, dropping nulls/empty
    const merged = { ...Object.fromEntries(current.entries()), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (k === 'page' || k === 'advanced') continue;
      if (v !== null && v !== '' && v !== 0 && v !== undefined) {
        next.set(k, String(v));
      }
    }
    router.push(`/admin/concursos?${next.toString()}`);
  }, [searchParams, router]);

  const clearAllFilters = useCallback(() => {
    window.location.href = '/admin/concursos';
  }, []);

  const applyFilters = useCallback(() => {
    const filters: Record<string, string | number | null> = {};
    if (localBanca) {
      filters.bancaId = localBanca.value;
      filters.bancaLabel = localBanca.label;
    }
    if (localInstituicao) {
      filters.instituicaoId = localInstituicao.value;
      filters.instituicaoLabel = localInstituicao.label;
    }
    if (localCargoNivel) {
      filters.cargoNivel = localCargoNivel;
    }
    if (localFinalizado) {
      filters.finalizado = localFinalizado;
    }
    if (localInstituicaoArea) {
      filters.instituicaoArea = String(localInstituicaoArea.value);
    }
    if (localCargoArea) {
      filters.cargoArea = String(localCargoArea.value);
    }
    updateFilters(filters, 0);
  }, [localBanca, localInstituicao, localCargoNivel, localFinalizado, localInstituicaoArea, localCargoArea, updateFilters]);

  const toggleAdvanced = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    if (urlShowAdvanced) {
      params.delete('advanced');
    } else {
      params.set('advanced', '1');
    }
    router.push(`/admin/concursos?${params.toString()}`);
  }, [searchParams, router, urlShowAdvanced]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const loadConcursos = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params: Types.PaginationParams & Record<string, unknown> = {
        page,
        size: 20,
        bancaId: urlBancaId || undefined,
        instituicaoId: urlInstituicaoId || undefined,
        instituicaoArea: urlInstituicaoArea || undefined,
        cargoArea: urlCargoArea || undefined,
        cargoNivel: urlCargoNivel || undefined,
        finalizado: urlFinalizado !== '' ? urlFinalizado === 'true' : undefined,
      };

      const data = await concursoService.getAll(params);
      setConcursos(data.content);
      setPagination(data);
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os concursos. Por favor, tente novamente.';
      console.error('Erro ao carregar concursos:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    urlBancaId,
    urlInstituicaoId,
    urlInstituicaoArea,
    urlCargoArea,
    urlCargoNivel,
    urlFinalizado,
  ]);

  useEffect(() => {
    loadConcursos(urlPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    urlPage,
    urlBancaId,
    urlInstituicaoId,
    urlInstituicaoArea,
    urlCargoArea,
    urlCargoNivel,
    urlFinalizado,
  ]);

  // ─── Async option loaders ─────────────────────────────────────────────────

   const loadInstituicaoOptions = async (inputValue: string) => {
     try {
       const data = await instituicaoService.getAll({ nome: inputValue, size: 20 });
       return data.content.map(i => ({ value: i.id, label: i.nome }));
     } catch (err: unknown) {
       console.warn('Erro ao carregar instituições:', err);
       return [];
     }
   };

   const loadBancaOptions = async (inputValue: string) => {
     try {
       const data = await bancaService.getAll({ nome: inputValue, size: 20 });
       return data.content.map(b => ({ value: b.id, label: b.sigla || b.nome }));
     } catch (err: unknown) {
       console.warn('Erro ao carregar bancas:', err);
       return [];
     }
   };

  const loadCargoOptions = async (inputValue: string) => {
    try {
      const data = await cargoService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }));
} catch (err: unknown) {
      console.warn('Erro ao carregar cargos:', err);
      return [];
    }
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    try {
      const areas = await instituicaoService.getAreas(inputValue);
      return areas.map(area => ({ value: area, label: area }));
} catch (err: unknown) {
      console.warn('Erro ao carregar áreas de instituição:', err);
      return [];
    }
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    try {
      const areas = await cargoService.getAreas(inputValue);
      return areas.map(area => ({ value: area, label: area }));
} catch (err: unknown) {
      console.warn('Erro ao carregar áreas de cargo:', err);
      return [];
    }
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    try {
      const data = await subtemaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(s => ({
        value: s.id,
        label: s.disciplina?.nome ? `${s.disciplina.nome} - ${s.tema?.nome} - ${s.nome}` : s.nome,
        disciplina: s.disciplina,
        tema: s.tema,
      }));
} catch (err: unknown) {
      console.warn('Erro ao carregar subtemas:', err);
      return [];
    }
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────

   const toggleSection = (id: string) => {
     setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
   };

  const addDisciplinaToSecao = (cargoId: number, secaoId: string) => {
    const newDisc: DisciplinaEntry = {
      id: `local-${Math.random().toString(36).substring(2, 9)}`,
      nome: 'Nova Disciplina',
      peso: null,
      numQuestoes: null,
      notaMinima: null,
      subtemas: []
    };
    
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => s.id === secaoId ? { ...s, disciplinas: [...s.disciplinas, newDisc] } : s) }
          : cs
      )
    }));
  };

  const calculateSecaoMetrics = (secao: SecaoEntry): Partial<SecaoEntry> => {
    const hasValues = secao.disciplinas.some(d => d.numQuestoes !== null || d.peso !== null || d.notaMinima !== null);
    
    if (!hasValues) {
      return { numQuestoes: 1, peso: 1, notaMinima: 0 };
    }

    return {
      numQuestoes: Math.max(1, secao.disciplinas.reduce((acc, d) => acc + (d.numQuestoes || 0), 0)),
      peso: Math.max(1, secao.disciplinas.reduce((acc, d) => acc + (d.peso || 0), 0)),
      notaMinima: Math.max(0, secao.disciplinas.reduce((acc, d) => acc + (d.notaMinima || 0), 0))
    };
  };

  const removeDisciplinaFromSecao = (cargoId: number, secaoId: string, discId: string) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => {
              if (s.id !== secaoId) return s;
              const remainingDiscs = s.disciplinas.filter(d => d.id !== discId);
              const updatedSecao = { ...s, disciplinas: remainingDiscs };
              return { ...updatedSecao, ...calculateSecaoMetrics(updatedSecao) };
            }) }
          : cs
      )
    }));
  };

  const updateDisciplinaInSecao = (cargoId: number, secaoId: string, discId: string, updates: Partial<DisciplinaEntry>) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => {
              if (s.id !== secaoId) return s;
              const updatedDiscs = s.disciplinas.map(d => d.id === discId ? { ...d, ...updates } : d);
              const updatedSecao = { ...s, disciplinas: updatedDiscs };
              return { ...updatedSecao, ...calculateSecaoMetrics(updatedSecao) };
            }) }
          : cs
      )
    }));
  };

  const addProva = (cargoId: number | null = null) => {
    const newProva: ProvaEntry = {
      id: `local-${Math.random().toString(36).substring(2, 9)}`,
      nome: 'Nova Prova',
      cargoId,
    };
    setFormData(prev => ({ ...prev, provas: [...prev.provas, newProva] }));
  };

  const removeProva = (provaId: string) => {
    setFormData(prev => ({
      ...prev,
      provas: prev.provas.filter(p => p.id !== provaId)
    }));
  };

  const updateProva = (provaId: string, updates: Partial<ProvaEntry>) => {
    setFormData(prev => ({
      ...prev,
      provas: prev.provas.map(p => p.id === provaId ? { ...p, ...updates } : p)
    }));
  };

  const addSecaoToCargo = (cargoId: number) => {
    const cargoSecoes = formData.cargoSecoes.find(cs => cs.cargoId === cargoId);
    const newSecao: SecaoEntry = {
      id: `local-${Math.random().toString(36).substring(2, 9)}`,
      nome: 'Nova Seção',
      ordem: cargoSecoes?.secoes.length || 0,
      numQuestoes: 1,
      peso: 1,
      notaMinima: 0,
      disciplinas: []
    };
    
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: [...cs.secoes, newSecao] }
          : cs
      )
    }));
  };

  const removeSecaoFromCargo = (cargoId: number, secaoId: string) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.filter(s => s.id !== secaoId) }
          : cs
      )
    }));
  };

  const moveSecaoUp = (cargoId: number, secaoId: string) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        const idx = cs.secoes.findIndex(s => s.id === secaoId);
        if (idx <= 0) return cs;
        const newSecoes = [...cs.secoes];
        [newSecoes[idx - 1], newSecoes[idx]] = [newSecoes[idx], newSecoes[idx - 1]];
        newSecoes.forEach((s, i) => s.ordem = i);
        return { ...cs, secoes: newSecoes };
      })
    }));
  };

  const moveSecaoDown = (cargoId: number, secaoId: string) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        const idx = cs.secoes.findIndex(s => s.id === secaoId);
        if (idx < 0 || idx >= cs.secoes.length - 1) return cs;
        const newSecoes = [...cs.secoes];
        [newSecoes[idx], newSecoes[idx + 1]] = [newSecoes[idx + 1], newSecoes[idx]];
        newSecoes.forEach((s, i) => s.ordem = i);
        return { ...cs, secoes: newSecoes };
      })
    }));
  };

  const updateSecaoInCargo = (cargoId: number, secaoId: string, updates: Partial<SecaoEntry>) => {
    setFormData(prev => ({
      ...prev,
      cargoSecoes: prev.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        return {
          ...cs,
          secoes: cs.secoes.map(s => {
            if (s.id !== secaoId) return s;
            // If computed, only allow name changes
            const hasValues = s.disciplinas.some(d => d.numQuestoes !== null || d.peso !== null || d.notaMinima !== null);
            if (hasValues) {
              return { ...s, nome: updates.nome ?? s.nome };
            }
            return { ...s, ...updates };
          })
        };
      })
    }));
  };

  const handleCargoChange = (opts: readonly { value: number; label: string }[] | null) => {
    const newCargos = opts ? [...opts] : [];
    const newCargoIds = newCargos.map((c) => c.value);
    
    const currentCargoIds = formData.cargos.map(c => c.value);
    const removedCargoIds = currentCargoIds.filter(id => !newCargoIds.includes(id));
    const addedCargoIds = newCargoIds.filter(id => !currentCargoIds.includes(id));
    
    setFormData((prev) => {
      const newProvas = addedCargoIds.map(cargoId => ({
        id: `local-${Math.random().toString(36).substring(2, 9)}`,
        nome: 'Prova Objetiva',
        cargoId,
      }));
      
      const updatedCargoSecoes = prev.cargoSecoes
        .filter(cs => newCargoIds.includes(cs.cargoId))
        .concat(
          addedCargoIds.map(cargoId => {
            const cargo = newCargos.find(c => c.value === cargoId);
            const secaoId = `local-${Math.random().toString(36).substring(2, 9)}`;
            return {
              cargoId,
              cargoNome: cargo?.label.split(' - ')[0] || '',
              secoes: [{
                id: secaoId,
                nome: 'Conhecimentos Gerais',
                ordem: 0,
                numQuestoes: 0,
                peso: 1,
                notaMinima: 0,
                disciplinas: [{
                  id: `local-${Math.random().toString(36).substring(2, 9)}`,
                  nome: 'Conteúdo Geral',
                  peso: 1,
                  numQuestoes: 30,
                  notaMinima: 0,
                  subtemas: []
                }]
              }]
            };
          })
        );
      
      const updatedProvas = prev.provas
        .filter(p => p.cargoId === null || newCargoIds.includes(p.cargoId))
        .map(p => {
          if (p.cargoId && removedCargoIds.includes(p.cargoId)) {
            return { ...p, cargoId: null };
          }
          return p;
        })
        .concat(newProvas);
      
      return {
        ...prev,
        cargos: newCargos,
        cargoSecoes: updatedCargoSecoes,
        provas: updatedProvas
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const isValidUrl = (url: string): boolean => {
      try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

const errors: string[] = [];
if (!formData.instituicao) errors.push('Selecione uma instituição');
if (!formData.banca) errors.push('Selecione uma banca');
if (formData.ano < 1900 || formData.ano > 2100) errors.push('Ano deve ser entre 1900 e 2100');
if (formData.mes < 1 || formData.mes > 12) errors.push('Mês deve ser entre 1 e 12');
if (formData.cargos.length === 0) errors.push('Selecione pelo menos um cargo');
if (formData.edital && !isValidUrl(formData.edital)) errors.push('O edital deve ser um link válido (http:// ou https://)');

// Validate metrics and subtema rules
for (const cs of formData.cargoSecoes) {
  const usedSubtemas = new Set<number>();
  for (const secao of cs.secoes) {
    if (secao.disciplinas.length === 0) {
      errors.push(`A seção '${secao.nome}' deve ter pelo menos uma disciplina.`);
    }
    for (const disc of secao.disciplinas) {
      const anyFilled = disc.numQuestoes !== null || disc.peso !== null || disc.notaMinima !== null;
      const allFilled = disc.numQuestoes !== null && disc.peso !== null && disc.notaMinima !== null;

      if (anyFilled && !allFilled) {
         errors.push(`Inconsistência na disciplina '${disc.nome}': Se definir uma métrica, deve definir todas.`);
      } else if (anyFilled && (disc.numQuestoes! < 1 || disc.peso! < 1.0 || disc.notaMinima! < 0)) {
         errors.push(`Inconsistência na disciplina '${disc.nome}': Valores devem respeitar os mínimos (questões >= 1, peso >= 1.0, nota >= 0).`);
      }

      if (disc.subtemas.length === 0) {
        errors.push(`A disciplina '${disc.nome}' deve ter pelo menos um subtema associado.`);
      }

      for (const st of disc.subtemas) {
        if (usedSubtemas.has(st.value)) {
          errors.push(`O subtema '${st.label}' já está associado a outra disciplina deste cargo.`);
        }
        usedSubtemas.add(st.value);
      }
    }
  }
}

if (errors.length > 0) {
  setValidationErrors(errors);
  return;
}
    setLocalLoading(true);
    try {
      const payload: any = {
        instituicaoId: formData.instituicao!.value,
        bancaId: formData.banca!.value,
        ano: formData.ano,
        mes: formData.mes,
        edital: formData.edital.trim(),
        dataProva: localInputValueToUtc(formData.dataProva) ?? undefined,
        finalizado: formData.finalizado,
        cargos: formData.cargos.map((c: { value: number }) => c.value),
        provas: formData.provas.map(p => {
          const provaId = p.id.startsWith('local-') ? null : Number(p.id);
          const secoesForCargo = formData.cargoSecoes.find(cs => cs.cargoId === p.cargoId)?.secoes || [];
          return {
            id: provaId,
            nome: p.nome,
            cargoId: p.cargoId,
            secoes: secoesForCargo.map((s, i) => {
              const calculatedOrdem = i + 1;
              return {
                id: provaId === null ? null : (s.id.startsWith('local-') ? null : Number(s.id)),
                nome: s.nome,
                ordem: calculatedOrdem,
                disciplinas: s.disciplinas.map(d => ({
                  id: provaId === null ? null : (d.id.startsWith('local-') ? null : Number(d.id)),
                  nome: d.nome,
                  peso: d.peso,
                  numQuestoes: d.numQuestoes,
                  notaMinima: d.notaMinima,
                  subtemaIds: d.subtemas.map(st => st.value)
                }))
              };
            })
          };
        })
      };

      if (editingItem) {
        await concursoService.update(editingItem.id, payload);
      } else {
        await concursoService.create(payload);
        showToast('Concurso criado com sucesso', 'success');
      }
      
      await loadConcursos(currentPage);
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao salvar concurso. Verifique sua conexão.';
      console.error('Erro ao salvar concurso:', err);
      setValidationErrors([message]);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleToggleFinalizado = async (id: number) => {
    setLocalLoading(true);
    try {
      await concursoService.toggleFinalizado(id);
      showToast('Status do concurso alterado', 'info');
      await loadConcursos(currentPage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível alterar o status do concurso.';
      console.error('Erro ao alternar status finalizado:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Erro',
        message: message,
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

const handleEdit = async (item: ConcursoDto) => {
    setLocalLoading(true);
    setValidationErrors([]);
    try {
      const detail = await concursoService.getById(item.id);
      setEditingItem(item);
      
      const localProvas: ProvaEntry[] = [];
      (detail.cargos || []).forEach(c => {
        (c.provas || []).forEach(p => {
          localProvas.push({
            id: String(p.id),
            nome: p.nome,
            cargoId: c.cargoId,
          });
        });
      });

      const localCargoSecoes: CargoWithSecoes[] = (detail.cargos || []).map(c => ({
        cargoId: c.cargoId,
        cargoNome: c.cargoNome,
        secoes: (c.topicos || [])
          .map(s => ({
            id: String(s.id),
            nome: s.nome,
            ordem: Math.max(0, (s.ordem ?? 1) - 1),
            numQuestoes: s.numQuestoes ?? 1,
            peso: s.peso ?? 1,
            notaMinima: s.notaMinima ?? 0,
            disciplinas: (s.disciplinas || []).map(d => ({
              id: String(d.id),
              nome: d.nome,
              peso: d.peso ?? 1,
              numQuestoes: d.numQuestoes ?? 0,
              notaMinima: d.notaMinima ?? 0,
              subtemas: (d.assuntos || []).map(a => ({ value: a.id, label: a.nome }))
            }))
          }))
          .sort((a, b) => a.ordem - b.ordem)
      }));

setFormData({
        instituicao: { value: detail.instituicao.id, label: detail.instituicao.nome },
        banca: { value: detail.banca.id, label: detail.banca.nome },
        ano: detail.ano,
        mes: detail.mes,
        edital: detail.edital || '',
        dataProva: utcToLocalInputValue(detail.dataProva),
        finalizado: detail.finalizado,
        cargos: detail.cargos.map(c => ({ value: c.cargoId, label: `${c.cargoNome} - ${c.area} (${formatNivel(c.nivel)})` })),
        cargoSecoes: localCargoSecoes,
        provas: localProvas,
        topicos: []
      });

      setModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do concurso para edição. Verifique sua conexão.';
      console.error('Erro ao carregar detalhes para edição:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Erro ao carregar',
        message: message,
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Concurso',
      message: 'Tem certeza que deseja excluir este concurso? Todas as questões e simulados associados serão afetados e esta ação não pode ser desfeita.',
      itemId: id,
      type: 'danger',
      alertOnly: false
    });
  };

  const onConfirmDelete = async () => {
    if (!confirmModal.itemId) return;
    
    setLocalLoading(true);
    try {
      await concursoService.delete(confirmModal.itemId);
      showToast('Concurso excluído com sucesso', 'success');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      await loadConcursos(currentPage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Este concurso não pode ser removido pois está sendo utilizado em outras partes do sistema.';
      console.error('Erro ao excluir concurso:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Não foi possível excluir',
        message: message,
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setLocalLoading(false);
    }
  };

const resetForm = () => {
    setFormData({
      instituicao: null,
      banca: null,
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      edital: '',
      dataProva: '',
      finalizado: false,
      cargos: [],
      cargoSecoes: [],
      provas: [],
      topicos: []
    });
    setEditingItem(null);
setModalOpen(false);
    setValidationErrors([]);
    setFormTab('dados');
  };

  const openNewForm = () => {
    setFormData({
      instituicao: null,
      banca: null,
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      edital: '',
      dataProva: '',
      finalizado: false,
      cargos: [],
      cargoSecoes: [],
      provas: [],
      topicos: []
    });
    setEditingItem(null);
    setValidationErrors([]);
    setModalOpen(true);
  };

  const hasActiveFilters = !!(
    urlBancaId ||
    urlInstituicaoId ||
    urlCargoNivel ||
    urlInstituicaoArea ||
    urlCargoArea ||
    urlFinalizado !== ''
  );

  const [topicoSearch, setTopicoSearch] = useState('');
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredCargoSecoes = formData.cargoSecoes.map(cs => {
    const normSearch = normalize(topicoSearch);
    if (!normSearch) return cs;
    
    const filteredSecoes = cs.secoes.filter(s => 
      normalize(s.nome).includes(normSearch) || 
      s.disciplinas.some(d => normalize(d.nome).includes(normSearch))
    );
    
    return { ...cs, secoes: filteredSecoes };
  });

  const selectStyles: Record<string, (base: CSSProperties) => CSSProperties> = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    control: (base) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6b7280' }, padding: '2px' }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base) => ({ ...base, color: '#111827', fontSize: '0.875rem', fontWeight: '500' })
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans">
      <PageHeader
        title="Concursos"
        subtitle="Gerenciamento de editais e provas"
        breadcrumbs={[{ label: 'Concursos' }]}
        actions={
          (!loading && !error) ? (
            <button
              onClick={openNewForm}
              disabled={localLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Concurso
            </button>
          ) : null
        }
      />

      {!loading && !error && (concursos.length > 0 || hasActiveFilters) && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-50 bg-slate-50/20">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Filtros
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-400 hover:text-indigo-600 font-bold transition-colors active:scale-95 tracking-tight px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Limpar filtros
              </button>
              <button
                onClick={toggleAdvanced}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50/30 px-3 py-2 rounded-lg transition-all border border-indigo-100/30 hover:bg-indigo-50 active:scale-95 tracking-tight"
              >
                {urlShowAdvanced ? 'Filtros básicos' : 'Mais opções'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Banca Organizadora</label>
              <AsyncSelect
                instanceId="filter-banca-select"
                cacheOptions
                defaultOptions
                loadOptions={loadBancaOptions}
                value={localBanca}
                onChange={(val) => setLocalBanca(val)}
                isClearable
                placeholder="Pesquisar banca..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Instituição</label>
              <AsyncSelect
                instanceId="filter-instituicao-select"
                cacheOptions
                defaultOptions
                loadOptions={loadInstituicaoOptions}
                value={localInstituicao}
                onChange={(val) => setLocalInstituicao(val)}
                isClearable
                placeholder="Pesquisar instituição..."
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nível de Escolaridade</label>
              <select
                value={localCargoNivel}
                onChange={(e) => setLocalCargoNivel(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="">Todos os níveis</option>
                <option value="FUNDAMENTAL">Fundamental</option>
                <option value="MEDIO">Médio</option>
                <option value="SUPERIOR">Superior</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select
                value={localFinalizado}
                onChange={(e) => setLocalFinalizado(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="">Todos os status</option>
                <option value="true">Finalizado</option>
                <option value="false">Em andamento</option>
              </select>
            </div>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              urlShowAdvanced ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Instituição)</label>
                  <AsyncSelect
                    instanceId="filter-instituicao-area-select"
                    cacheOptions
                    defaultOptions
                    loadOptions={loadInstituicaoAreaOptions}
                    value={localInstituicaoArea}
                    onChange={(val) => setLocalInstituicaoArea(val)}
                    isClearable
                    placeholder="Filtrar por área..."
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Área de Atuação (Cargo)</label>
                  <AsyncSelect
                    instanceId="filter-cargo-area-select"
                    cacheOptions
                    defaultOptions
                    loadOptions={loadCargoAreaOptions}
                    value={localCargoArea}
                    onChange={(val) => setLocalCargoArea(val)}
                    isClearable
                    placeholder="Filtrar por área do cargo..."
                    styles={selectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Limpar filtros
            </button>
            <button
              onClick={applyFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>
      )}

      <FormModal
        isOpen={modalOpen}
        onClose={resetForm}
        onSubmit={handleSubmit}
        title={editingItem ? 'Editar Concurso' : 'Nova Prova / Edital'}
        loading={localLoading}
        submitLabel={editingItem ? 'Atualizar' : 'Salvar Prova'}
        size="5xl"
        footerExtra={validationErrors.length > 0 ? (
          <Feedback 
            type="error" 
            message={validationErrors} 
            className="w-full"
          />
        ) : null}
      >
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setFormTab('dados')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              formTab === 'dados' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dados Gerais
          </button>
          <button
            type="button"
            onClick={() => setFormTab('provas')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              formTab === 'provas' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Provas & Estrutura
          </button>
          <button
            type="button"
            onClick={() => setFormTab('conteudo')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              formTab === 'conteudo' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Conteúdo Programático
          </button>
        </div>

        {formTab === 'dados' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instituição</label>
                <AsyncSelect
                  instanceId="form-instituicao-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadInstituicaoOptions}
                  value={formData.instituicao}
                  onChange={(val) => setFormData((prev) => ({ ...prev, instituicao: val }))}
                  placeholder="Pesquisar..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banca Organizadora</label>
                <AsyncSelect
                  instanceId="form-banca-select"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadBancaOptions}
                  value={formData.banca}
                  onChange={(val) => setFormData((prev) => ({ ...prev, banca: val }))}
                  placeholder="Pesquisar..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ano" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Ano
                  </label>
                  <input
                    type="number"
                    id="ano"
                    min="1900"
                    max="2100"
                    value={formData.ano}
                    onChange={(e) => setFormData({...formData, ano: parseInt(e.target.value) || new Date().getFullYear()})}
                    className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="mes" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Mês
                  </label>
                  <select
                    id="mes"
                    value={formData.mes}
                    onChange={(e) => setFormData({...formData, mes: parseInt(e.target.value) || 1})}
                    className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dataProva" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Data de Aplicação
                </label>
                <input
                  type="datetime-local"
                  id="dataProva"
                  value={formData.dataProva}
                  onChange={(e) => setFormData({...formData, dataProva: e.target.value})}
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-2.5 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.finalizado}
                      onChange={(e) => setFormData({...formData, finalizado: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 transition-colors">Concurso Finalizado</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label htmlFor="edital" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Link do Edital / Detalhes
                </label>
                <div className="relative">
                  <input
                    type="url"
                    id="edital"
                    autoComplete="off"
                    value={formData.edital}
                    onChange={(e) => setFormData({...formData, edital: e.target.value})}
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm pl-10"
                    placeholder="https://..."
                  />
                  <ExternalLink className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label htmlFor="cargos" className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Cargos Vinculados
                </label>
                <AsyncSelect
                  id="cargos"
                  instanceId="cargos-select"
                  isMulti
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCargoOptions}
                  value={formData.cargos}
                  onChange={handleCargoChange}
                  placeholder="Pesquise cargos..."
                  styles={selectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>
          </div>
        ) : null}

        {formTab === 'provas' ? (
          <div className="space-y-6">
            {formData.cargoSecoes.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cargo selecionado</p>
                <p className="text-xs text-slate-400 mt-1">Selecione cargos na aba Dados Gerais para definir a estrutura.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.cargoSecoes.map((cargoSec) => {
const cargo = formData.cargos.find(c => c.value === cargoSec.cargoId);
                   
                  return (
                    <div key={cargoSec.cargoId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{cargo?.label.split(' - ')[0] || `Cargo ${cargoSec.cargoId}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addProva(cargoSec.cargoId)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Prova
                          </button>
                          <button
                            type="button"
                            onClick={() => addSecaoToCargo(cargoSec.cargoId)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Seção
                          </button>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provas</label>
                          </div>
                          {formData.provas.filter(p => p.cargoId === cargoSec.cargoId).length === 0 ? (
                            <div className="flex items-center gap-2 py-2 border-b border-slate-100">
                              <div className="p-1.5 bg-slate-100 rounded">
                                <FileText className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="text-xs text-slate-400 italic">Nenhuma prova vinculada</span>
                            </div>
                          ) : (
                            <div className="space-y-2 pb-4 border-b border-slate-100">
                              {formData.provas.filter(p => p.cargoId === cargoSec.cargoId).map((prova) => {
                                const provasCount = formData.provas.filter(p => p.cargoId === cargoSec.cargoId).length;
                                return (
                                <div key={prova.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-2">
                                  {editingProvaId === prova.id ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingProvaValue}
                                        onChange={(e) => setEditingProvaValue(e.target.value)}
                                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateProva(prova.id, { nome: editingProvaValue.trim() || prova.nome });
                                            setEditingProvaId(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingProvaId(null);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateProva(prova.id, { nome: editingProvaValue.trim() || prova.nome });
                                          setEditingProvaId(null);
                                        }}
                                        className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors"
                                        title="Salvar"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm font-bold text-slate-900">{prova.nome}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingProvaId(prova.id);
                                          setEditingProvaValue(prova.nome);
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Editar nome"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeProva(prova.id)}
                                    disabled={provasCount <= 1}
                                    className={`p-1 transition-colors ${provasCount <= 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );})}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Seções do Edital</label>
                          {cargoSec.secoes.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Nenhuma seção definida</p>
                          ) : (
                            <div className="space-y-2">
                              {cargoSec.secoes.map((secao) => {
                                const secoesCount = cargoSec.secoes.length;
                                return (
                                <div key={secao.id} className="flex items-stretch gap-2 p-3 bg-slate-50/30 border border-slate-100 rounded-lg group">
                                  <div className="flex flex-col items-center justify-between w-8 py-1">
                                    <button
                                      type="button"
                                      onClick={() => moveSecaoUp(cargoSec.cargoId, secao.id)}
                                      disabled={secao.ordem === 0}
                                      className={`p-0.5 rounded hover:bg-slate-200 ${secao.ordem === 0 ? 'text-slate-200' : 'text-slate-500'}`}
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-600">{secao.ordem + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => moveSecaoDown(cargoSec.cargoId, secao.id)}
                                      disabled={secao.ordem >= cargoSec.secoes.length - 1}
                                      className={`p-0.5 rounded hover:bg-slate-200 ${secao.ordem >= cargoSec.secoes.length - 1 ? 'text-slate-200' : 'text-slate-500'}`}
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="flex flex-col justify-center">
                                      <label className="text-[9px] text-slate-400 font-medium">Seção</label>
                                      <input
                                        type="text"
                                        value={secao.nome}
                                        onChange={(e) => updateSecaoInCargo(cargoSec.cargoId, secao.id, { nome: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                        placeholder="Nome"
                                      />
                                    </div>
                                    {(() => {
                                      const isComputed = secao.disciplinas.some(d => d.numQuestoes !== null || d.peso !== null || d.notaMinima !== null);
                                      const inputClass = `w-full border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-indigo-500 ${isComputed ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-700'}`;
                                      
                                      return (
                                        <>
                                          <div className="flex flex-col justify-center">
                                            <label className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                              Questões {isComputed && <span className="text-[7px] bg-indigo-100 text-indigo-600 px-1 rounded">AUTO</span>}
                                            </label>
                                            <input
                                              type="number"
                                              min="1"
                                              value={secao.numQuestoes}
                                              readOnly={isComputed}
                                              tabIndex={isComputed ? -1 : 0}
                                              onChange={(e) => updateSecaoInCargo(cargoSec.cargoId, secao.id, { numQuestoes: parseInt(e.target.value) || 1 })}
                                              className={inputClass}
                                              placeholder="1"
                                            />
                                          </div>
                                          <div className="flex flex-col justify-center">
                                            <label className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                              Peso {isComputed && <span className="text-[7px] bg-indigo-100 text-indigo-600 px-1 rounded">AUTO</span>}
                                            </label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={secao.peso}
                                              readOnly={isComputed}
                                              tabIndex={isComputed ? -1 : 0}
                                              onChange={(e) => updateSecaoInCargo(cargoSec.cargoId, secao.id, { peso: parseFloat(e.target.value) || 1 })}
                                              className={inputClass}
                                              placeholder="1"
                                            />
                                          </div>
                                          <div className="flex flex-col justify-center">
                                            <label className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                              Nota Mínima {isComputed && <span className="text-[7px] bg-indigo-100 text-indigo-600 px-1 rounded">AUTO</span>}
                                            </label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={secao.notaMinima}
                                              readOnly={isComputed}
                                              tabIndex={isComputed ? -1 : 0}
                                              onChange={(e) => updateSecaoInCargo(cargoSec.cargoId, secao.id, { notaMinima: parseFloat(e.target.value) || 0 })}
                                              className={inputClass}
                                              placeholder="0"
                                            />
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSecaoFromCargo(cargoSec.cargoId, secao.id)}
                                    disabled={secoesCount <= 1}
                                    className={`p-1 transition-colors ${secoesCount <= 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );})}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

      <div className={formTab === 'conteudo' ? 'block' : 'hidden'}>
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Hash className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Conteúdo Programático</h4>
                <p className="text-[11px] text-slate-500 font-medium">Gerencie a taxonomia e vinculação por cargo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Filtrar seções/disciplinas..."
                  value={topicoSearch}
                  onChange={(e) => setTopicoSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {topicoSearch && (
                  <button 
                    onClick={() => setTopicoSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {filteredCargoSecoes.map((cargoSec) => {
              const cargo = formData.cargos.find(c => c.value === cargoSec.cargoId);
              return (
                <div key={cargoSec.cargoId} className="space-y-4">
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-100/50 rounded-lg border border-slate-200/50">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">
                      Cargo: {cargo?.label.split(' - ')[0] || `ID ${cargoSec.cargoId}`}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {cargoSec.secoes.map((secao) => (
                      <div key={secao.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500">
                              {secao.ordem + 1}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">{secao.nome}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addDisciplinaToSecao(cargoSec.cargoId, secao.id)}
                            className="inline-flex items-center px-3 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-indigo-100"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Disciplina
                          </button>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {(() => {
                            const filledDiscs = secao.disciplinas.filter(d => d.numQuestoes !== null || d.peso !== null || d.notaMinima !== null);
                            const isInconsistent = filledDiscs.length > 0 && filledDiscs.length < secao.disciplinas.length;
                            
                            if (isInconsistent) {
                              return (
                                <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                                    Atenção: Defina as métricas para TODAS as disciplinas desta seção (ou para nenhuma).
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {secao.disciplinas.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma disciplina cadastrada</p>
                            </div>
                          ) : (
                            secao.disciplinas.map((disc) => (
                              <div key={disc.id} className="p-5 space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nome da Disciplina (no Edital)</label>
                                    <input
                                      type="text"
                                      value={disc.nome}
                                      onChange={(e) => updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { nome: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                      placeholder="Ex: Língua Portuguesa"
                                    />
                                  </div>
                                  <div className="w-20">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Questões</label>
                                    <input
                                      type="number"
                                      value={disc.numQuestoes ?? ''}
                                      onChange={(e) => updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { numQuestoes: e.target.value === '' ? null : parseInt(e.target.value) })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                      placeholder="-"
                                    />
                                  </div>
                                  <div className="w-16">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Peso</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={disc.peso ?? ''}
                                      onChange={(e) => updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { peso: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                      placeholder="-"
                                    />
                                  </div>
                                  <div className="w-20">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Mínima</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={disc.notaMinima ?? ''}
                                      onChange={(e) => updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { notaMinima: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                      placeholder="-"
                                    />
                                  </div>
                                  <div className="flex items-end pb-0.5">
                                    <button
                                      type="button"
                                      onClick={() => removeDisciplinaFromSecao(cargoSec.cargoId, secao.id, disc.id)}
                                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="pl-6 border-l-2 border-indigo-50 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Assuntos / Subtemas</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPickingSubtemasFor({ cargoId: cargoSec.cargoId, secaoId: secao.id, discId: disc.id });
                                        setSubtemaPickerOpen(true);
                                      }}
                                      className="inline-flex items-center px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white bg-indigo-500 rounded hover:bg-indigo-600 transition-colors"
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Selecionar Subtemas
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {disc.subtemas.length === 0 ? (
                                      <p className="text-[10px] italic text-slate-400">Nenhum subtema vinculado</p>
                                    ) : (
                                      disc.subtemas.map((st) => (
                                        <div key={st.value} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                          <span className="text-[10px] font-bold text-slate-600">{st.label.split(' - ').pop()}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = disc.subtemas.filter(s => s.value !== st.value);
                                              updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { subtemas: updated });
                                            }}
                                            className="p-0.5 text-slate-300 hover:text-red-500 rounded group-hover:bg-slate-50 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      </FormModal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.alertOnly ? () => setConfirmModal(prev => ({ ...prev, isOpen: false })) : onConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={localLoading}
        alertOnly={confirmModal.alertOnly}
        confirmLabel={confirmModal.alertOnly ? 'Ok, entendi' : 'Confirmar Exclusão'}
      />

      <SubtemaPickerModal
        isOpen={subtemaPickerOpen}
        onClose={() => {
          setSubtemaPickerOpen(false);
          setPickingSubtemasFor(null);
        }}
        onConfirm={(selected) => {
          if (pickingSubtemasFor) {
            const { cargoId, secaoId, discId } = pickingSubtemasFor;
            const newSubtemas = selected.map(s => ({ value: s.subtemaId, label: s.label ?? '' }));
            updateDisciplinaInSecao(cargoId, secaoId, discId, { subtemas: newSubtemas });
          }
          setSubtemaPickerOpen(false);
          setPickingSubtemasFor(null);
        }}
        initiallySelected={(() => {
          if (!pickingSubtemasFor) return [];
          const { cargoId, secaoId, discId } = pickingSubtemasFor;
          const cargo = formData.cargoSecoes.find(cs => cs.cargoId === cargoId);
          const secao = cargo?.secoes.find(s => s.id === secaoId);
          const disc = secao?.disciplinas.find(d => d.id === discId);
          return (disc?.subtemas || []).map(st => ({
            subtemaId: st.value,
            label: st.label
          }));
        })()}
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-500" />
            <p className="text-gray-500 text-sm animate-pulse">Sincronizando base de concursos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao carregar dados</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => loadConcursos(currentPage)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-sans"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : concursos.length === 0 && !hasActiveFilters ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum concurso encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Comece criando um novo concurso para o sistema.</p>
          </div>
        ) : concursos.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-48 text-center px-4">
            <SlidersHorizontal className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros para encontrar o que procura.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 font-sans">
            {concursos.map((concurso) => (
              <li key={concurso.id} className="hover:bg-gray-50 transition-colors duration-150">
                <div className="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="text-sm font-medium text-indigo-600 truncate" title={concurso.instituicao.nome}>
                      {concurso.instituicao.nome}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <span className="font-mono tabular-nums text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">ID #{concurso.id}</span>
                      <span className="truncate">{concurso.banca.sigla || concurso.banca.nome} · <span className="font-mono tabular-nums">{concurso.mes.toString().padStart(2, '0')}/{concurso.ano}</span></span>
                      {concurso.finalizado && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700">
                          Finalizado
                        </span>
                      )}
                    </div>
                    {concurso.dataProva && (
                      <div className="text-xs text-gray-400 mt-1">
                        <span className="font-bold text-gray-300 mr-1">PROVA:</span>
                        <span className="font-mono tabular-nums">{formatDateTime(concurso.dataProva)}</span>
                      </div>
                    )}
                    <div className="text-xs text-indigo-400 mt-1 truncate" title={(concurso.cargos || []).map(c => `${c.cargoNome} (${formatNivel(c.nivel)})`).join(' · ')}>
                      <span className="font-bold text-indigo-300 mr-1 uppercase">Cargos:</span>
                      {(concurso.cargos || []).map(c => `${c.cargoNome} (${formatNivel(c.nivel)})`).join(' · ')}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(concurso)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(concurso.id!)}
                      disabled={localLoading}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 font-sans focus:outline-none">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => updateFilters({}, currentPage - 1)}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === 0
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => updateFilters({}, currentPage + 1)}
                disabled={currentPage === pagination.totalPages - 1}
                className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  currentPage === pagination.totalPages - 1
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between font-sans">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium font-mono tabular-nums">{currentPage * pagination.pageSize + 1}</span> até{' '}
                  <span className="font-medium font-mono tabular-nums">
                    {Math.min((currentPage + 1) * pagination.pageSize, pagination.totalElements)}
                  </span>{' '}
                  de <span className="font-medium font-mono tabular-nums">{pagination.totalElements}</span> resultados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateFilters({}, currentPage - 1)}
                  disabled={currentPage === 0}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === 0
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-sm font-mono font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded tabular-nums">
                  {currentPage + 1} / {pagination.totalPages}
                </div>
                <button
                  onClick={() => updateFilters({}, currentPage + 1)}
                  disabled={currentPage === pagination.totalPages - 1}
                  className={`p-1 rounded border transition-colors ${
                    currentPage === pagination.totalPages - 1
                      ? 'cursor-not-allowed text-gray-300 border-gray-200'
                      : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConcursosAdminPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>}>
      <ConcursosContent />
    </Suspense>
  );
}
