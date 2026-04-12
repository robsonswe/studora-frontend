'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import QuestaoFormModal from '@/components/ui/QuestaoFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { questaoService, concursoService, instituicaoService, cargoService, bancaService, disciplinaService, temaService, subtemaService } from '@/services/api';
import { formatNivel, formatDificuldade, formatDateTime } from '@/utils/formatters';
import { usePageTitle } from '@/hooks/usePageTitle';
import * as Types from '@/types';
import {
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  Tag,
  Eye,
  EyeOff,
  User,
  Plus,
  Pencil,
  AlertCircle,
  Loader2
} from 'lucide-react';

type QuestaoDto = Types.QuestaoDetailDto;

export default function SearchBrowsePage() {
  const [adminMode, setAdminMode] = useState(false);
  const { setValue, watch, reset } = useForm({
    defaultValues: {
      selectedDisciplina: { value: 0, label: 'Todas as disciplinas' } as { value: number, label: string } | null,
      selectedTema: { value: 0, label: 'Todos os temas' } as { value: number, label: string } | null,
      selectedSubtema: { value: 0, label: 'Todos os subtemas' } as { value: number, label: string } | null,
      selectedBanca: { value: 0, label: 'Todas as bancas' } as { value: number, label: string } | null,
      selectedInstituicaoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoArea: { value: '', label: 'Todas as áreas' } as { value: string, label: string } | null,
      selectedCargoNivel: '',
      selectedAutoral: 'all' as 'all' | 'only' | 'exclude'
    }
  });

  const watchedFields = watch();

  const [questoes, setQuestoes] = useState<QuestaoDto[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [pagination, setPagination] = useState<Types.PageResponse<any>>({
    content: [],
    pageNumber: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    last: true
  });
  const [currentPage, setCurrentPage] = useState(0);

  // CRUD state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Types.QuestaoSummaryDto | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [alternativeErrors, setAlternativeErrors] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  const [currentAlternativas, setCurrentAlternativas] = useState<Types.AlternativaDto[]>([]);
  const [novaAlternativa, setNovaAlternativa] = useState<Omit<Types.AlternativaDto, 'id' | 'questaoId'>>({
    ordem: 0,
    texto: '',
    correta: false,
    justificativa: ''
  });

  const crudForm = useForm({
    defaultValues: {
      concurso: null as { value: number, label: string } | null,
      enunciado: '',
      anulada: false,
      desatualizada: false,
      autoral: false,
      subtemas: [] as { value: number, label: string }[],
      cargos: [] as number[],
      imageUrl: ''
    }
  });
  const crudWatchedFields = crudForm.watch();

  // ─── CRUD Functions ───────────────────────────────────────────────────────────

  const handleQuestaoSubmit = async (data: any) => {
    const errs: string[] = [];

    if (currentAlternativas.length < 2) {
      errs.push('A questão deve ter pelo menos 2 alternativas');
    }

    if (!data.anulada) {
      const correctAlternativas = currentAlternativas.filter(a => a.correta);
      if (correctAlternativas.length === 0) {
        errs.push('Pelo menos uma alternativa deve ser marcada como correta');
      } else if (correctAlternativas.length > 1) {
        errs.push('Apenas uma alternativa pode ser marcada como correta (questão não anulada)');
      }
    }

    if (!data.autoral && data.cargos.length === 0) {
      errs.push('A questão deve estar associada a pelo menos um cargo');
    }

    if (!data.autoral && !data.concurso) {
      errs.push('A questão deve estar vinculada a um concurso (ou marcar como autoral)');
    }

    if (data.subtemas.length === 0) {
      errs.push('A questão deve estar associada a pelo menos um subtema');
    }

    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    setValidationErrors([]);
    setFormLoading(true);

    try {
      const payload: any = {
        enunciado: data.enunciado,
        anulada: data.anulada,
        desatualizada: data.desatualizada,
        imageUrl: data.imageUrl,
        subtemaIds: data.subtemas.map((s: any) => s.value),
        autoral: data.autoral,
        alternativas: currentAlternativas.map((alt, index) => ({
          ...alt,
          correta: !!alt.correta,
          justificativa: alt.justificativa || '',
          ordem: index + 1
        }))
      };

      if (!data.autoral) {
        payload.concursoId = data.concurso.value;
        payload.cargos = data.cargos;
      }

      if (editingItem) {
        await questaoService.update(editingItem.id, payload);
      } else {
        await questaoService.create(payload);
      }

      await filterQuestoes(currentPage);
      resetQuestaoForm();
    } catch (err: any) {
      console.error('Erro ao salvar questão:', err);
      setValidationErrors([err.message || 'Erro inesperado ao salvar questão. Verifique sua conexão.']);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditQuestao = async (id: number) => {
    setFormLoading(true);
    setValidationErrors([]);
    try {
      const detail = await questaoService.getById(id, true);
      setEditingItem(detail);

      if (detail.concurso) {
        const concursoLabel = `${detail.concurso.ano} - ${detail.concurso.instituicaoNome} - ${detail.concurso.bancaNome}`;
        crudForm.setValue('concurso', { value: detail.concurso.id, label: concursoLabel });
      }
      crudForm.setValue('enunciado', detail.enunciado);
      crudForm.setValue('anulada', detail.anulada);
      crudForm.setValue('desatualizada', detail.desatualizada);
      crudForm.setValue('autoral', detail.autoral || false);

      crudForm.setValue('subtemas', (detail.subtemas || []).map(s => ({
        value: s.id,
        label: s.disciplina?.nome ? `${s.disciplina.nome} - ${s.tema?.nome} - ${s.nome}` : s.nome
      })));

      crudForm.setValue('cargos', detail.cargoIds || detail.cargos.map(c => c.id));
      crudForm.setValue('imageUrl', detail.imageUrl || '');

      setCurrentAlternativas([...detail.alternativas].sort((a, b) => a.ordem - b.ordem));
      setShowForm(true);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da questão:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Erro ao carregar',
        message: err.message || 'Não foi possível carregar os detalhes da questão para edição.',
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteQuestao = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Questão',
      message: 'Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita e removerá permanentemente todos os gabaritos e estatísticas associados.',
      itemId: id,
      type: 'danger',
      alertOnly: false
    });
  };

  const onConfirmDelete = async () => {
    if (!confirmModal.itemId) return;
    
    setFormLoading(true);
    try {
      await questaoService.delete(confirmModal.itemId);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      await filterQuestoes(currentPage);
    } catch (err: any) {
      console.error('Erro ao excluir questão:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Não foi possível excluir',
        message: err.message || 'Erro ao excluir questão. O item pode estar sendo usado por outras entidades do sistema.',
        itemId: null,
        type: 'danger',
        alertOnly: true
      });
    } finally {
      setFormLoading(false);
    }
  };

  const resetQuestaoForm = () => {
    crudForm.reset({
      concurso: null,
      enunciado: '',
      anulada: false,
      desatualizada: false,
      autoral: false,
      subtemas: [],
      cargos: [],
      imageUrl: ''
    });
    setCurrentAlternativas([]);
    setNovaAlternativa({
      ordem: 0,
      texto: '',
      correta: false,
      justificativa: ''
    });
    setEditingItem(null);
    setShowForm(false);
    setValidationErrors([]);
    setAlternativeErrors('');
  };

  const loadConcursoOptions = async (inputValue: string) => {
    const data = await concursoService.getAll({ size: 50 });
    return data.content.map(c => ({
      value: c.id,
      label: `${c.mes}/${c.ano} - ${c.instituicao.nome} - ${c.banca.nome}`
    })).filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()));
  };

  // ─── Filter Option Loaders ───────────────────────────────────────────────────

  usePageTitle('Questões', 'Admin');

  const filterQuestoes = useCallback(async (page: number = 0) => {
    setLocalLoading(true);
    setFetchError(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
      const params: any = {
        page: page,
        size: 20,
        admin: adminMode,
        disciplinaId: (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) ? watchedFields.selectedDisciplina.value : undefined,
        temaId: (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) ? watchedFields.selectedTema.value : undefined,
        subtemaId: (watchedFields.selectedSubtema && watchedFields.selectedSubtema.value !== 0) ? watchedFields.selectedSubtema.value : undefined,
        bancaId: (watchedFields.selectedBanca && watchedFields.selectedBanca.value !== 0) ? watchedFields.selectedBanca.value : undefined,
        instituicaoArea: (watchedFields.selectedInstituicaoArea && watchedFields.selectedInstituicaoArea.value !== '') ? watchedFields.selectedInstituicaoArea.value : undefined,
        cargoArea: (watchedFields.selectedCargoArea && watchedFields.selectedCargoArea.value !== '') ? watchedFields.selectedCargoArea.value : undefined,
        cargoNivel: watchedFields.selectedCargoNivel || undefined,
        autoral: watchedFields.selectedAutoral === 'only' ? true : watchedFields.selectedAutoral === 'exclude' ? false : undefined,
      };

      const data = await questaoService.getAll(params);
      setQuestoes(data.content as any);
      setPagination(data);
      setCurrentPage(page);
      setFetchError(null);
    } catch (error) {
      console.error('Erro ao filtrar questões:', error);
      setFetchError('Não foi possível carregar as questões. Por favor, tente novamente.');
    } finally {
      setLocalLoading(false);
    }
  }, [
    adminMode,
    watchedFields.selectedDisciplina,
    watchedFields.selectedTema,
    watchedFields.selectedSubtema,
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel,
    watchedFields.selectedAutoral
  ]);

  useEffect(() => {
    filterQuestoes(0);
  }, [filterQuestoes]);

  const loadBancaOptions = async (inputValue: string) => {
    const data = await bancaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as bancas' }, ...data.content.map(b => ({ value: b.id, label: b.nome }))];
  };

  const loadDisciplinaOptions = async (inputValue: string) => {
    const data = await disciplinaService.getAll({ nome: inputValue, size: 20 });
    return [{ value: 0, label: 'Todas as disciplinas' }, ...data.content.map(d => ({ value: d.id, label: d.nome }))];
  };

  const loadTemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) {
      const data = await temaService.getAll({ 
        disciplinaIds: watchedFields.selectedDisciplina.value,
        nome: inputValue,
        size: 100 
      });
      return [{ value: 0, label: 'Todos os temas' }, ...data.content.map(t => ({ value: t.id, label: t.nome }))];
    }
    return [{ value: 0, label: 'Todos os temas' }];
  };

  const loadSubtemaOptions = async (inputValue: string) => {
    if (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) {
      const data = await subtemaService.getAll({ 
        temaIds: watchedFields.selectedTema.value,
        nome: inputValue,
        size: 100 
      });
      return [{ value: 0, label: 'Todos os subtemas' }, ...data.content.map(s => ({ value: s.id, label: s.nome }))];
    }
    return [{ value: 0, label: 'Todos os subtemas' }];
  };

  const loadInstituicaoAreaOptions = async (inputValue: string) => {
    const areas = await instituicaoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map(area => ({ value: area, label: area }))];
  };

  const loadCargoAreaOptions = async (inputValue: string) => {
    const areas = await cargoService.getAreas(inputValue);
    return [{ value: '', label: 'Todas as áreas' }, ...areas.map(area => ({ value: area, label: area }))];
  };

  const adicionarAlternativa = () => {
    if (!novaAlternativa.texto.trim()) {
      setAlternativeErrors('O campo texto da alternativa é obrigatório');
      return;
    }
    setAlternativeErrors('');
    const nova = {
      ...novaAlternativa,
      ordem: currentAlternativas.length + 1
    };
    setCurrentAlternativas([...currentAlternativas, nova as Types.AlternativaDto]);
    setNovaAlternativa({
      ordem: 0,
      texto: '',
      correta: false,
      justificativa: ''
    });
  };

  const removerAlternativa = (index: number) => {
    const novasAlternativas = [...currentAlternativas];
    novasAlternativas.splice(index, 1);
    setCurrentAlternativas(novasAlternativas);
  };

  const moverAlternativaParaCima = (index: number) => {
    if (index === 0) return;
    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index - 1]] = [novasAlternativas[index - 1], novasAlternativas[index]];
    setCurrentAlternativas(novasAlternativas);
  };

  const moverAlternativaParaBaixo = (index: number) => {
    if (index === currentAlternativas.length - 1) return;
    const novasAlternativas = [...currentAlternativas];
    [novasAlternativas[index], novasAlternativas[index + 1]] = [novasAlternativas[index + 1], novasAlternativas[index]];
    setCurrentAlternativas(novasAlternativas);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (watchedFields.selectedDisciplina && watchedFields.selectedDisciplina.value !== 0) ||
      (watchedFields.selectedTema && watchedFields.selectedTema.value !== 0) ||
      (watchedFields.selectedSubtema && watchedFields.selectedSubtema.value !== 0) ||
      (watchedFields.selectedBanca && watchedFields.selectedBanca.value !== 0) ||
      (watchedFields.selectedInstituicaoArea && watchedFields.selectedInstituicaoArea.value !== '') ||
      (watchedFields.selectedCargoArea && watchedFields.selectedCargoArea.value !== '') ||
      watchedFields.selectedCargoNivel ||
      (watchedFields.selectedAutoral && watchedFields.selectedAutoral !== 'all')
    );
  }, [
    watchedFields.selectedDisciplina,
    watchedFields.selectedTema,
    watchedFields.selectedSubtema,
    watchedFields.selectedBanca,
    watchedFields.selectedInstituicaoArea,
    watchedFields.selectedCargoArea,
    watchedFields.selectedCargoNivel,
    watchedFields.selectedAutoral
  ]);

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <PageHeader
        title="Questões"
        subtitle={!fetchError && !localLoading && !hasActiveFilters && questoes.length === 0 ? undefined : "Encontre questões por filtros"}
        breadcrumbs={[{ label: 'Questões' }]}
        actions={
          (!fetchError && !localLoading && (questoes.length > 0 || hasActiveFilters)) ? (
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={() => { resetQuestaoForm(); setShowForm(true); }}
                disabled={formLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Questão
              </button>
            )}
            <button
              onClick={() => setAdminMode(!adminMode)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                adminMode
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {adminMode ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              Modo Spoiler: {adminMode ? 'ON' : 'OFF'}
            </button>
          </div>
          ) : null
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Error State ── */}
        {fetchError ? (
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao carregar dados</h3>
            <p className="mt-1 text-sm text-gray-500">{fetchError}</p>
            <div className="mt-6">
              <button
                onClick={() => filterQuestoes(0)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : localLoading ? (
          /* ── Initial Loading ── */
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : questoes.length === 0 && !hasActiveFilters ? (
          /* ── Empty, no filters: onboard ── */
          <div className="flex flex-col justify-center items-center h-64 text-center px-4">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma questão encontrada</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">Crie a primeira questão para começar.</p>
            <button
              onClick={() => { resetQuestaoForm(); setShowForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Questão
            </button>
          </div>
        ) : (
          /* ── Filters + Results (or empty with filters) ── */
          <>
            {/* Filters Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                  <Filter className="w-5 h-5 text-indigo-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Filtros de Pesquisa</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Disciplina</label>
              <AsyncSelect 
                instanceId="disciplina-select"
                cacheOptions 
                defaultOptions 
                loadOptions={loadDisciplinaOptions} 
                value={watchedFields.selectedDisciplina} 
                onChange={(val) => { setValue('selectedDisciplina', val); setValue('selectedTema', { value: 0, label: 'Todos os temas' }); }} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tema</label>
              <AsyncSelect 
                instanceId="tema-select"
                key={`tema-${watchedFields.selectedDisciplina?.value}`} 
                cacheOptions 
                defaultOptions 
                loadOptions={loadTemaOptions} 
                value={watchedFields.selectedTema} 
                onChange={(val) => { setValue('selectedTema', val); setValue('selectedSubtema', { value: 0, label: 'Todos os subtemas' }); }} 
                isDisabled={!watchedFields.selectedDisciplina || watchedFields.selectedDisciplina.value === 0} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtema</label>
              <AsyncSelect 
                instanceId="subtema-select"
                key={`subtema-${watchedFields.selectedTema?.value}`} 
                cacheOptions 
                defaultOptions 
                loadOptions={loadSubtemaOptions} 
                value={watchedFields.selectedSubtema} 
                onChange={(val) => setValue('selectedSubtema', val)} 
                isDisabled={!watchedFields.selectedTema || watchedFields.selectedTema.value === 0} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Banca</label>
              <AsyncSelect 
                instanceId="banca-select"
                cacheOptions 
                defaultOptions 
                loadOptions={loadBancaOptions} 
                value={watchedFields.selectedBanca} 
                onChange={(val) => setValue('selectedBanca', val)} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Instituição</label>
              <AsyncSelect 
                instanceId="instituicao-area-select"
                cacheOptions 
                defaultOptions 
                loadOptions={loadInstituicaoAreaOptions} 
                value={watchedFields.selectedInstituicaoArea} 
                onChange={(val) => setValue('selectedInstituicaoArea', val)} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Área Cargo</label>
              <AsyncSelect 
                instanceId="cargo-area-select"
                cacheOptions 
                defaultOptions 
                loadOptions={loadCargoAreaOptions} 
                value={watchedFields.selectedCargoArea} 
                onChange={(val) => setValue('selectedCargoArea', val)} 
                styles={selectStyles} 
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nível</label>
              <Select
                instanceId="nivel-select"
                options={[{ value: '', label: 'Todos' }, { value: 'FUNDAMENTAL', label: 'Fundamental' }, { value: 'MEDIO', label: 'Médio' }, { value: 'SUPERIOR', label: 'Superior' }]}
                value={watchedFields.selectedCargoNivel ? { value: watchedFields.selectedCargoNivel, label: formatNivel(watchedFields.selectedCargoNivel) } : { value: '', label: 'Todos' }}
                onChange={(opt) => setValue('selectedCargoNivel', opt?.value || '')}
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Questões Autorais</label>
              <Select
                instanceId="autoral-select"
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'only', label: 'Apenas autorais' },
                  { value: 'exclude', label: 'Excluir autorais' }
                ]}
                value={{ value: watchedFields.selectedAutoral, label: watchedFields.selectedAutoral === 'all' ? 'Todas' : watchedFields.selectedAutoral === 'only' ? 'Apenas autorais' : 'Excluir autorais' }}
                onChange={(opt) => setValue('selectedAutoral', (opt?.value as 'all' | 'only' | 'exclude') || 'all')}
                styles={selectStyles}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => reset()} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Results List */}
        {questoes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Tente ajustar os filtros para encontrar questões ou crie uma nova questão.
            </p>
            <button
              onClick={() => { resetQuestaoForm(); setShowForm(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Questão
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questoes.map((questao) => {
              const concurso = questao.concurso;
              const displayAlts = [...questao.alternativas].sort((a, b) => a.ordem - b.ordem);
              const latestResposta = questao.respostas && questao.respostas.length > 0 
                ? [...questao.respostas].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0]
                : null;
              
              const shouldShowGabarito = adminMode || questao.respondida;

              return (
                <div key={questao.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Metadata Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {concurso ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-100 tracking-widest">
                                {concurso.bancaNome}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200 font-mono tabular-nums">
                                {concurso.ano}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 ml-1">
                                {concurso.instituicaoNome}
                              </span>
                            </>
                          ) : questao.autoral ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 tracking-widest">
                              Questão Autoral
                            </span>
                          ) : null}
                        </div>
                        {!questao.autoral && (
                          <div className="text-xs text-gray-500 leading-relaxed">
                            {(questao.cargos || []).map(c => `${c.nome} - ${c.area} (${formatNivel(c.nivel)})`).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                         <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono tabular-nums">ID #{questao.id}</span>
                         <button
                          onClick={() => handleEditQuestao(questao.id)}
                          disabled={formLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-indigo-200 text-xs font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteQuestao(questao.id)}
                          disabled={formLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-red-200 text-xs font-medium rounded-md text-red-600 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 mt-1 border-t border-gray-200/60">
                       <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-gray-600 leading-relaxed font-sans">
                            {(() => {
                              const grouped: Record<string, Record<string, string[]>> = {};
                              (questao.subtemas || []).forEach(st => {
                                const discNome = st.disciplina?.nome || 'Sem disciplina';
                                const temaNome = st.tema?.nome || 'Sem tema';
                                if (!grouped[discNome]) grouped[discNome] = {};
                                if (!grouped[discNome][temaNome]) grouped[discNome][temaNome] = [];
                                grouped[discNome][temaNome].push(st.nome);
                              });
                              return Object.entries(grouped).map(([disc, temasMap]) => (
                                <span key={disc} className="block mb-0.5">
                                  <span className="font-bold text-gray-800 uppercase text-[10px] tracking-tight">{disc}:</span> {Object.entries(temasMap).map(([tema, subtemaNomes]) => `${tema} (${subtemaNomes.join(', ')})`).join(' | ')}
                                </span>
                              ));
                            })()}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Question Content */}
                    <div className="prose prose-indigo max-w-none text-gray-800 mb-6 font-sans leading-relaxed text-lg">
                       <p className="whitespace-pre-line">{questao.enunciado}</p>
                    </div>
                    
                    {questao.imageUrl && (
                      <div className="mb-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-2 text-center">
                        <img src={questao.imageUrl} alt="Imagem" className="max-w-full h-auto inline-block rounded" />
                      </div>
                    )}
                    
                    {/* Alternatives */}
                    <div className="space-y-3">
                      {displayAlts.map((alternativa) => {
                        const isCorrect = alternativa.correta;
                        const isUserChoice = latestResposta?.alternativaId === alternativa.id;
                        
                        let baseClass = "relative flex items-start p-4 rounded-xl border-2 transition-all duration-200 ";
                        let badgeClass = "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold font-mono tabular-nums ";

                        if (shouldShowGabarito) {
                          if (isCorrect) { 
                            baseClass += "bg-green-50 border-green-500 "; 
                            badgeClass += "bg-green-500 text-white"; 
                          } else if (isUserChoice) { 
                            baseClass += "bg-red-50 border-red-500 "; 
                            badgeClass += "bg-red-500 text-white"; 
                          } else { 
                            baseClass += "bg-white border-gray-100 opacity-60 "; 
                            badgeClass += "bg-gray-100 text-gray-400"; 
                          }
                        } else {
                          baseClass += "bg-white border-gray-200 "; 
                          badgeClass += "bg-white border-2 border-gray-300 text-gray-500";
                        }

                        return (
                          <div key={alternativa.id} className={baseClass}>
                            <div className="flex-shrink-0 pt-0.5">
                              <span className={badgeClass}>{String.fromCharCode(64 + alternativa.ordem)}</span>
                            </div>
                            <div className="ml-4 flex-1">
                              <span className={`text-base font-sans ${shouldShowGabarito && isCorrect ? 'font-bold text-green-900' : 'text-gray-700'}`}>
                                {alternativa.texto}
                              </span>
                              {shouldShowGabarito && alternativa.justificativa && (
                                  <div className="mt-3">
                                    {isCorrect ? (
                                      <div className="flex items-start text-sm p-3 rounded-lg bg-green-100/50 text-green-800 font-sans">
                                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                        <div><strong className="block mb-1 uppercase text-xs tracking-widest font-black">Gabarito</strong>{alternativa.justificativa}</div>
                                      </div>
                                    ) : isUserChoice ? (
                                      <div className="flex items-start text-sm p-3 rounded-lg bg-red-100/50 text-red-800 font-sans">
                                        <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                        <div><strong className="block mb-1 uppercase text-xs tracking-widest font-black">Sua Escolha</strong>{alternativa.justificativa}</div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 mt-1 pl-3 border-l-2 border-gray-200 italic font-sans font-medium">
                                        {alternativa.justificativa}
                                      </div>
                                    )}
                                  </div>
                              )}
                            </div>
                            {isUserChoice && (
                              <div className="absolute top-2 right-2">
                                <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase flex items-center shadow-sm tracking-widest">
                                  <User className="w-2 h-2 mr-1" /> Sua Resposta
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Response Info Footer */}
                    {latestResposta && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 font-sans">
                           <div className="mb-4 pb-4 border-b border-gray-200">
                               <span className="text-xs font-black text-gray-400 uppercase block mb-2 tracking-widest">Última Justificativa do Usuário</span>
                               <p className="text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-200 italic shadow-sm">"{latestResposta.justificativa}"</p>
                           </div>
                           <div className="flex flex-wrap gap-6">
                              <div className="flex items-center text-xs text-gray-600 font-medium">
                                <Award className="w-4 h-4 mr-2 text-indigo-400" />
                                <span className="font-bold mr-1 uppercase text-[10px] tracking-tight">Dificuldade:</span> {formatDificuldade(latestResposta.dificuldade)}
                              </div>
                              <div className="flex items-center text-xs text-gray-600 font-medium">
                                <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                                <span className="font-bold mr-1 uppercase text-[10px] tracking-tight text-gray-500">Data:</span> <span className="font-mono tabular-nums">{formatDateTime(latestResposta.createdAt)}</span>
                              </div>
                              {latestResposta.simuladoId && (
                                <div className="flex items-center text-xs text-indigo-600 font-black uppercase tracking-widest">
                                  <Tag className="w-3.5 h-3.5 mr-1" /> Simulado
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center mt-12 font-sans">
             <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm border border-gray-200 bg-white overflow-hidden">
                  <button onClick={() => filterQuestoes(currentPage - 1)} disabled={currentPage === 0} className="relative inline-flex items-center px-4 py-3 text-gray-400 hover:bg-gray-50 disabled:opacity-30 border-r border-gray-200 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                  <div className="flex items-center px-6 py-2 bg-gray-50/50 border-r border-gray-200 text-sm font-mono font-medium text-gray-900 tabular-nums">
                    {currentPage + 1} / {pagination.totalPages}
                  </div>
                  <button onClick={() => filterQuestoes(currentPage + 1)} disabled={currentPage === pagination.totalPages - 1} className="relative inline-flex items-center px-4 py-3 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"><ChevronRight className="h-5 w-5" /></button>
             </nav>
          </div>
        )}
          </>
        )}
      </div>

      {/* CRUD Form Modal */}
      <QuestaoFormModal
        isOpen={showForm}
        onClose={resetQuestaoForm}
        onSubmit={handleQuestaoSubmit}
        crudForm={crudForm}
        editingItem={editingItem}
        formLoading={formLoading}
        validationErrors={validationErrors}
        currentAlternativas={currentAlternativas}
        novaAlternativa={novaAlternativa}
        onNovaAlternativaChange={setNovaAlternativa}
        onAdicionarAlternativa={adicionarAlternativa}
        onRemoverAlternativa={removerAlternativa}
        onMoverAlternativaParaCima={moverAlternativaParaCima}
        onMoverAlternativaParaBaixo={moverAlternativaParaBaixo}
        alternativeErrors={alternativeErrors}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.alertOnly ? () => setConfirmModal(prev => ({ ...prev, isOpen: false })) : onConfirmDelete}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={formLoading}
        alertOnly={confirmModal.alertOnly}
        confirmLabel={confirmModal.alertOnly ? 'Ok, entendi' : 'Confirmar Exclusão'}
      />
    </div>
  );
}