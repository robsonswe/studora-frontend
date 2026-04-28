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
  Trash2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Hash,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react';
import { Feedback } from '@/components/ui/Feedback';
import SubtemaPickerModal from '@/components/concursos/SubtemaPickerModal';
import { useToast } from '@/components/ui/ToastContext';
import type { CSSProperties } from 'react';

type ConcursoDto = Types.ConcursoSummaryDto;

interface TopicoEntry {
  subtemaId: number;
  subtemaLabel: string;
  disciplina?: Types.DisciplinaReferenceDto;
  tema?: Types.TemaReferenceDto;
  cargoIds: number[];
}

interface TopicosByDisciplina {
  disciplina?: Types.DisciplinaReferenceDto;
  temas: {
    tema?: Types.TemaReferenceDto;
    topicos: TopicoEntry[];
  }[];
}

const groupTopicos = (topicos: TopicoEntry[]): TopicosByDisciplina[] => {
  const disciplinaMap = new Map<string, TopicosByDisciplina>();

  for (const t of topicos) {
    const discKey = String(t.disciplina?.id ?? 0);
    if (!disciplinaMap.has(discKey)) {
      disciplinaMap.set(discKey, {
        disciplina: t.disciplina,
        temas: [],
      });
    }
    const disciplinaGroup = disciplinaMap.get(discKey)!;

    const temaKey = String(t.tema?.id ?? 0);
    let temaGroup = disciplinaGroup.temas.find(tg => String(tg.tema?.id ?? 0) === temaKey);
    if (!temaGroup) {
      temaGroup = { tema: t.tema, topicos: [] };
      disciplinaGroup.temas.push(temaGroup);
    }

    temaGroup.topicos.push(t);
  }

  return Array.from(disciplinaMap.values());
};

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
  const [formTab, setFormTab] = useState<'dados' | 'conteudo'>('dados');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<{
    instituicao: { value: number, label: string } | null;
    banca: { value: number, label: string } | null;
    ano: number;
    mes: number;
    edital: string;
    dataProva: string;
    finalizado: boolean;
    cargos: { value: number, label: string }[];
    topicos: TopicoEntry[]
  }>({
    instituicao: null as { value: number, label: string } | null,
    banca: null as { value: number, label: string } | null,
    ano: 2024,
    mes: 1,
    edital: '',
    dataProva: '',
    finalizado: false,
    cargos: [] as { value: number, label: string }[],
    topicos: [] as TopicoEntry[]
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

  const addTopico = (opt: { value: number, label: string, disciplina?: Types.DisciplinaReferenceDto, tema?: Types.TemaReferenceDto }) => {
    if (formData.topicos.find((t: TopicoEntry) => t.subtemaId === opt.value)) return;
    const cargoIds = formData.cargos.map((c: { value: number }) => c.value);
    setFormData((prev) => ({
      ...prev,
      topicos: [
        ...prev.topicos,
        {
          subtemaId: opt.value,
          subtemaLabel: opt.label,
          disciplina: opt.disciplina,
          tema: opt.tema,
          cargoIds,
        },
      ],
    }));
  };

  const removeTopico = (subtemaId: number) => {
    setFormData((prev) => ({
      ...prev,
      topicos: prev.topicos.filter((t: TopicoEntry) => t.subtemaId !== subtemaId)
    }));
  };

  const toggleTopicoCargo = (subtemaId: number, cargoId: number) => {
    setFormData((prev) => ({
      ...prev,
      topicos: prev.topicos.map((t: TopicoEntry) => {
        if (t.subtemaId !== subtemaId) return t;
        const newCargoIds = t.cargoIds.includes(cargoId)
          ? t.cargoIds.filter(id => id !== cargoId)
          : [...t.cargoIds, cargoId];
        return { ...t, cargoIds: newCargoIds };
      })
    }));
  };

  const handleCargoChange = (opts: readonly { value: number; label: string }[] | null) => {
    const newCargos = opts ? [...opts] : [];
    const newCargoIds = newCargos.map((c) => c.value);
    setFormData((prev) => ({
      ...prev,
      cargos: newCargos,
      topicos: prev.topicos.map((t: TopicoEntry) => ({
        ...t,
        cargoIds: t.cargoIds.filter((id: number) => newCargoIds.includes(id))
      }))
    }));
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

    formData.topicos.forEach((t: TopicoEntry) => {
      if (t.cargoIds.length === 0) errors.push(`O tópico "${t.subtemaLabel}" deve estar vinculado a pelo menos um cargo`);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLocalLoading(true);
    try {
      const payload: Types.ConcursoCreateRequest = {
        instituicaoId: formData.instituicao!.value,
        bancaId: formData.banca!.value,
        ano: formData.ano,
        mes: formData.mes,
        edital: formData.edital.trim(),
        dataProva: localInputValueToUtc(formData.dataProva) ?? undefined,
        finalizado: formData.finalizado,
        cargos: formData.cargos.map((c: { value: number }) => c.value),
        topicos: formData.topicos.reduce((acc: Record<number, number[]>, t: TopicoEntry) => {
          acc[t.subtemaId] = t.cargoIds;
          return acc;
        }, {})
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
      
      const topicoMap = new Map<number, TopicoEntry>();
      detail.cargos.forEach(cargo => {
        (cargo.topicos || []).forEach(topico => {
          if (!topicoMap.has(topico.id)) {
            topicoMap.set(topico.id, {
              subtemaId: topico.id,
              subtemaLabel: topico.disciplina?.nome
                ? `${topico.disciplina.nome} - ${topico.tema?.nome} - ${topico.nome}`
                : topico.nome,
              disciplina: topico.disciplina,
              tema: topico.tema,
              cargoIds: [],
            });
          }
          topicoMap.get(topico.id)!.cargoIds.push(cargo.cargoId);
        });
      });

      setFormData({
        instituicao: { value: detail.instituicao.id, label: detail.instituicao.nome },
        banca: { value: detail.banca.id, label: detail.banca.nome },
        ano: detail.ano,
        mes: detail.mes,
        edital: detail.edital || '',
        dataProva: utcToLocalInputValue(detail.dataProva),
        finalizado: detail.finalizado,
        cargos: detail.cargos.map(c => ({ value: c.cargoId, label: `${c.cargoNome} - ${c.area} (${formatNivel(c.nivel)})` })),
        topicos: Array.from(topicoMap.values()),
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
      topicos: []
    });
    setEditingItem(null);
    setModalOpen(false);
    setValidationErrors([]);
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

  const selectedSubtemaIds = new Set(formData.topicos.map((t: TopicoEntry) => t.subtemaId));
  const groupedTopicos = groupTopicos(formData.topicos);

  const [topicoSearch, setTopicoSearch] = useState('');

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredTopicos = groupedTopicos.map(discGroup => {
    const discMatch = normalize(discGroup.disciplina?.nome || '').includes(normalize(topicoSearch));
    
    const filteredTemas = discGroup.temas.map(temaGroup => {
      const temaMatch = normalize(temaGroup.tema?.nome || '').includes(normalize(topicoSearch));
      const filteredSubtemas = temaGroup.topicos.filter(t => 
        discMatch || temaMatch || normalize(t.subtemaLabel).includes(normalize(topicoSearch))
      );
      
      return filteredSubtemas.length > 0 ? { ...temaGroup, topicos: filteredSubtemas } : null;
    }).filter(Boolean) as typeof discGroup.temas;

    return filteredTemas.length > 0 ? { ...discGroup, temas: filteredTemas } : null;
  }).filter(Boolean) as typeof groupedTopicos;

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
            placeholder="Filtrar tópicos..."
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
        <button
          type="button"
          onClick={() => setSubtemaPickerOpen(true)}
          className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Adicionar Subtemas
        </button>
      </div>
    </div>

    {formData.topicos.length > 0 ? (
      <div className="space-y-4">
        {filteredTopicos.map((disciplinaGroup) => {
          const discId = `disc-${disciplinaGroup.disciplina?.id ?? 0}`;
          const isDiscExpanded = expandedSections[discId];
          const totalSubtemas = disciplinaGroup.temas.reduce((acc, t) => acc + t.topicos.length, 0);

          return (
            <div key={discId} className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-sm">
              {/* Disciplina Row */}
              <button
                type="button"
                onClick={() => toggleSection(discId)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[oklch(98%_0.005_264)]/40 hover:bg-[oklch(97%_0.02_264)] transition-all duration-300 group cursor-pointer"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <div className="flex items-center gap-4">
                  <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform duration-500 ${isDiscExpanded ? 'rotate-90 text-[oklch(45%_0.22_264)]' : ''}`} 
                    style={{ transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.25, 1)' }}
                  />
                  <span className="text-sm font-bold text-[oklch(25%_0.015_264)] tracking-tight uppercase">
                    {disciplinaGroup.disciplina?.nome || 'Conhecimentos Gerais'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-mono font-bold text-slate-400 tabular-nums bg-slate-100/60 px-2 py-1 rounded border border-slate-200/30">
                    {totalSubtemas} {totalSubtemas === 1 ? 'TÓPICO' : 'TÓPICOS'}
                  </span>
                </div>
              </button>

              {/* Tema List */}
              {isDiscExpanded && (
                <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300" style={{ animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  {disciplinaGroup.temas.map((temaGroup) => {
                    const temaId = `tema-${temaGroup.tema?.id ?? 0}-${disciplinaGroup.disciplina?.id ?? 0}`;
                    const isTemaExpanded = expandedSections[temaId];

                    return (
                      <div key={temaId} className="group/tema border-b border-slate-50 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggleSection(temaId)}
                          className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-[oklch(97%_0.02_264)]/50 transition-all cursor-pointer ${
                            isTemaExpanded ? 'bg-[oklch(97%_0.02_264)]/40' : ''
                          }`}
                          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                        >
                          <div className="flex items-center gap-3 pl-4 border-l border-slate-100 group-hover/tema:border-[oklch(85%_0.05_264)] transition-colors">
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${
                              isTemaExpanded ? 'rotate-90 text-[oklch(73%_0.17_65)]' : 'text-slate-300'
                            }`} style={{ transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.25, 1)' }} />
                            <span className={`text-[11px] font-bold uppercase tracking-wide text-left ${
                              isTemaExpanded ? 'text-[oklch(25%_0.015_264)]' : 'text-slate-500'
                            }`}>
                              {temaGroup.tema?.nome || 'Tópicos Gerais'}
                            </span>
                          </div>
                        </button>

                        {/* Subtema Strategy Grid */}
                        {isTemaExpanded && (
                          <div className="px-6 pb-6 pt-2 space-y-4 bg-[oklch(98%_0.005_264)]/20 animate-in fade-in duration-300">
                            {temaGroup.topicos.map((topico) => (
                              <div key={topico.subtemaId} className="pl-11 relative">
                                {/* Visual Thread */}
                                <div className="absolute left-7 top-0 bottom-0 w-px bg-slate-200/40" />
                                <div className="absolute left-7 top-4 w-3 h-px bg-slate-200/40" />

                                <div className="bg-white border border-slate-200/60 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                                  <div className="px-4 py-2.5 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex flex-col text-left">
                                      <span className="text-[13px] font-bold text-[oklch(35%_0.015_264)] tracking-tight leading-tight">
                                        {topico.subtemaLabel.split(' - ').pop()}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-[0.05em]">ID #{topico.subtemaId}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTopico(topico.subtemaId)}
                                      className="p-1.5 text-slate-300 hover:text-[oklch(65%_0.16_25)] hover:bg-[oklch(95%_0.03_25)] rounded-md transition-all"
                                      title="Remover"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  <div className="p-3">
                                    <div className="flex justify-start mb-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allCargoIds = formData.cargos.map(c => c.value);
                                          setFormData(prev => ({
                                            ...prev,
                                            topicos: prev.topicos.map(t => 
                                              t.subtemaId === topico.subtemaId ? { ...t, cargoIds: allCargoIds } : t
                                            )
                                          }));
                                        }}
                                        className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1.5 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50"
                                        title="Selecionar todos os cargos"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Selecionar todos os cargos
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {formData.cargos.map((cargo) => {
                                        const [cargoNome, cargoAreaPart] = cargo.label.split(' - ');
                                        const cargoArea = cargoAreaPart?.split(' (')[0] || '';
                                        
                                        return (
                                          <label 
                                            key={cargo.value} 
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                                              topico.cargoIds.includes(cargo.value)
                                                ? 'bg-indigo-50/60 border-indigo-200 shadow-sm'
                                                : 'bg-white border-slate-100 hover:border-slate-200'
                                            }`}
                                          >
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                              <input
                                                type="checkbox"
                                                checked={topico.cargoIds.includes(cargo.value)}
                                                onChange={() => toggleTopicoCargo(topico.subtemaId, cargo.value)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                                              />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <span className={`text-[10px] font-bold uppercase tracking-tight leading-none truncate ${
                                                topico.cargoIds.includes(cargo.value) ? 'text-indigo-900' : 'text-slate-600'
                                              }`}>
                                                {cargoNome}
                                              </span>
                                              {cargoArea && (
                                                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-1 truncate">
                                                  {cargoArea}
                                                </span>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredTopicos.length === 0 && topicoSearch && (
          <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum tópico encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar o termo da sua pesquisa.</p>
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
          <Hash className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Lista Vazia</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px] text-center leading-relaxed">
          Selecione os subtemas que compõem este edital para vincular aos cargos.
        </p>
      </div>
    )}
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
        onClose={() => setSubtemaPickerOpen(false)}
        onConfirm={(selected) => {
          const newTopicos = selected
            .filter(s => !selectedSubtemaIds.has(s.subtemaId))
            .map(s => {
              return {
                subtemaId: s.subtemaId,
                subtemaLabel: s.label || `Subtema ${s.subtemaId}`,
                disciplina: s.disciplina,
                tema: s.tema,
                cargoIds: s.cargoIds,
              };
            });
            
          setFormData(prev => ({
            ...prev,
            topicos: [...prev.topicos, ...newTopicos],
          }));
          
          setSubtemaPickerOpen(false); 
        }}
        initiallySelected={formData.topicos.map(t => ({ 
          subtemaId: t.subtemaId, 
          label: t.subtemaLabel,
          disciplina: t.disciplina,
          tema: t.tema,
          cargoIds: t.cargoIds 
        }))}
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
