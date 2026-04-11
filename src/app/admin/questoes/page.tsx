'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
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
  const [availableCargos, setAvailableCargos] = useState<Types.CargoSummaryDto[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [alternativeErrors, setAlternativeErrors] = useState<string>('');

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

  useEffect(() => {
    if (crudWatchedFields.concurso?.value) {
      concursoService.getById(crudWatchedFields.concurso.value)
        .then(detail => {
          setAvailableCargos(detail.cargos.map(c => ({ id: c.cargoId, nome: c.cargoNome, nivel: c.nivel, area: c.area })));
        })
        .catch(console.error);
    } else {
      setAvailableCargos([]);
    }
  }, [crudWatchedFields.concurso?.value]);

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
      alert(err.message || 'Erro ao carregar detalhes para edição.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteQuestao = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
      setFormLoading(true);
      try {
        await questaoService.delete(id);
        await filterQuestoes(currentPage);
      } catch (err: any) {
        console.error('Erro ao excluir questão:', err);
        alert(err.message || 'Erro ao excluir questão. O item pode estar sendo usado por outras entidades.');
      } finally {
        setFormLoading(false);
      }
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

  const loadCrudSubtemaOptions = async (inputValue: string) => {
    const data = await subtemaService.getAll({ nome: inputValue, size: 20 });
    return data.content.map(s => ({
      value: s.id,
      label: s.disciplina?.nome ? `${s.disciplina.nome} - ${s.tema?.nome} - ${s.nome}` : s.nome
    }));
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

  // ─── Filter Option Loaders ───────────────────────────────────────────────────

  usePageTitle('Questões', 'Admin');

  const filterQuestoes = useCallback(async (page: number = 0) => {
    setLocalLoading(true);
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
    } catch (error) {
      console.error('Erro ao filtrar questões:', error);
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

  const selectStyles = {
    control: (base: any) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6366f1' }, borderRadius: '0.5rem' }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' })
  };

  // Styles for Selects rendered inside the modal.
  // menuPortal MUST override zIndex so portalled menus render above z-50 modal layer.
  const crudSelectStyles = {
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    control: (base: any) => ({
      ...base,
      borderColor: '#e5e7eb',
      boxShadow: 'none',
      '&:hover': { borderColor: '#6366f1' },
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      minHeight: '38px',
    }),
    singleValue: (base: any) => ({ ...base, color: '#374151', fontSize: '0.875rem' }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.875rem', color: '#9ca3af' }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#eef2ff' : 'white',
      color: state.isSelected ? 'white' : '#374151',
    }),
    multiValue: (base: any) => ({ ...base, backgroundColor: '#eef2ff', borderRadius: '0.25rem' }),
    multiValueLabel: (base: any) => ({ ...base, color: '#4338ca', fontSize: '0.8rem', fontWeight: 600 }),
    multiValueRemove: (base: any) => ({ ...base, color: '#6366f1', ':hover': { backgroundColor: '#c7d2fe', color: '#312e81' } }),
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <PageHeader
        title="Questões"
        subtitle="Encontre questões por filtros"
        breadcrumbs={[{ label: 'Questões' }]}
        actions={
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
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filters Card */}
        {!localLoading && (
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
        )}

        {/* Results List */}
        {localLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : questoes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma questão encontrada</h3>
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
      </div>

      {/* CRUD Form Modal — two-panel layout */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) resetQuestaoForm(); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col animate-in fade-in slide-in-from-top-3 duration-200 overflow-hidden"
            style={{ height: 'min(88vh, 680px)' }}
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-indigo-100/60 bg-white">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                  {editingItem ? 'Editar Questão' : 'Nova Questão'}
                </h3>
                {editingItem && (
                  <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded tabular-nums">
                    ID #{editingItem.id}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={resetQuestaoForm}
                title="Fechar"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors duration-150"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* ── Two-panel body ── */}
            <form
              id="questao-crud-form"
              onSubmit={crudForm.handleSubmit(handleQuestaoSubmit)}
              className="flex flex-1 min-h-0"
            >
              {/* ── LEFT: metadata fields ── */}
              <div className="flex flex-col w-[46%] border-r border-slate-100 overflow-y-auto bg-slate-50/40">
                <div className="flex-1 px-5 py-5 space-y-5">

                  {/* Enunciado */}
                  <div>
                    <label htmlFor="crud-enunciado" className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                      Enunciado
                      <span className="text-red-400 font-black">*</span>
                    </label>
                    <textarea
                      id="crud-enunciado"
                      rows={5}
                      autoFocus
                      {...crudForm.register('enunciado', { required: 'O enunciado é obrigatório.' })}
                      className="block w-full text-sm border border-slate-200 bg-white rounded-lg p-2.5 text-gray-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-shadow duration-150 leading-relaxed"
                      placeholder="Digite o enunciado da questão…"
                    />
                    {crudForm.formState.errors.enunciado && (
                      <p className="mt-1.5 text-[11px] text-red-500 font-medium">{crudForm.formState.errors.enunciado.message}</p>
                    )}
                  </div>

                  {/* Flags */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2 py-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        id="crud-autoral"
                        {...crudForm.register('autoral')}
                        disabled={!!editingItem}
                        className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-400 disabled:opacity-40 transition-colors"
                      />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                        Autoral
                      </span>
                      {editingItem && (
                        <span className="text-[10px] text-slate-400 italic">— não editável</span>
                      )}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        id="crud-anulada"
                        {...crudForm.register('anulada')}
                        className="h-3.5 w-3.5 text-amber-500 border-slate-300 rounded focus:ring-amber-400 transition-colors"
                      />
                      <span className={`text-xs transition-colors ${crudWatchedFields.anulada ? 'text-amber-600 font-semibold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        Anulada
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        id="crud-desatualizada"
                        {...crudForm.register('desatualizada')}
                        className="h-3.5 w-3.5 text-amber-500 border-slate-300 rounded focus:ring-amber-400 transition-colors"
                      />
                      <span className={`text-xs transition-colors ${crudWatchedFields.desatualizada ? 'text-amber-600 font-semibold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        Desatualizada
                      </span>
                    </label>
                  </div>

                  {/* Origem (conditional on non-autoral) */}
                  {!crudWatchedFields.autoral && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                          Concurso
                        </label>
                        <AsyncSelect
                          id="crud-concurso"
                          instanceId="crud-concurso-select"
                          cacheOptions
                          defaultOptions
                          loadOptions={loadConcursoOptions}
                          value={crudWatchedFields.concurso}
                          onChange={(val) => { crudForm.setValue('concurso', val); crudForm.setValue('cargos', []); }}
                          placeholder="Busque pelo ano, instituição ou banca…"
                          styles={crudSelectStyles}
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                          Cargos
                        </label>
                        <Select
                          id="crud-cargos"
                          instanceId="crud-cargos-select"
                          isMulti
                          options={availableCargos.map(c => ({ value: c.id, label: `${c.nome} — ${c.area} (${formatNivel(c.nivel)})` }))}
                          value={crudWatchedFields.cargos.map(id => {
                            const cargo = availableCargos.find(c => c.id === id);
                            return { value: id, label: cargo ? `${cargo.nome} — ${cargo.area} (${formatNivel(cargo.nivel)})` : `Cargo ID: ${id}` };
                          })}
                          onChange={(sel) => crudForm.setValue('cargos', sel ? sel.map(o => o.value) : [])}
                          placeholder={crudWatchedFields.concurso ? 'Selecione um ou mais cargos…' : 'Selecione um concurso primeiro'}
                          isDisabled={!crudWatchedFields.concurso}
                          styles={crudSelectStyles}
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        />
                      </div>
                    </>
                  )}

                  {/* Subtemas */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                      Subtemas
                      <span className="text-red-400 font-black">*</span>
                    </label>
                    <AsyncSelect
                      id="crud-subtemas"
                      instanceId="crud-subtemas-select"
                      isMulti
                      cacheOptions
                      defaultOptions
                      loadOptions={loadCrudSubtemaOptions}
                      value={crudWatchedFields.subtemas}
                      onChange={(val) => crudForm.setValue('subtemas', val as any)}
                      placeholder="Busque por disciplina, tema ou subtema…"
                      styles={crudSelectStyles}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                  </div>

                  {/* URL da imagem */}
                  <div>
                    <label htmlFor="crud-imageUrl" className="block text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                      Imagem <span className="normal-case font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      id="crud-imageUrl"
                      {...crudForm.register('imageUrl')}
                      className="block w-full text-sm border border-slate-200 bg-white rounded-lg px-2.5 py-2 text-gray-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow duration-150"
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                  </div>

                  {/* Validation errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <ul className="space-y-0.5">
                        {validationErrors.map((err, i) => (
                          <li key={i} className="text-xs text-red-600">· {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: alternativas ── */}
              <div className="flex flex-col flex-1 min-w-0 bg-white">

                {/* Add new alternative */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest">
                      Alternativas
                    </p>
                    {currentAlternativas.length > 0 && (
                      <span className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded transition-colors ${
                        currentAlternativas.length >= 2 && currentAlternativas.filter(a => a.correta).length === 1
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {currentAlternativas.length} alt · {currentAlternativas.filter(a => a.correta).length} correta
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaAlternativa.texto}
                      onChange={(e) => setNovaAlternativa({...novaAlternativa, texto: e.target.value})}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarAlternativa(); } }}
                      className={`flex-1 text-sm border rounded-lg px-2.5 py-[7px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow duration-150 ${
                        alternativeErrors ? 'border-red-300 bg-red-50 placeholder-red-300' : 'border-slate-200 placeholder-slate-300'
                      }`}
                      placeholder="Texto da alternativa… (Enter para adicionar)"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer whitespace-nowrap px-1 hover:text-slate-700 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={novaAlternativa.correta}
                        onChange={(e) => setNovaAlternativa({...novaAlternativa, correta: e.target.checked})}
                        className="h-3.5 w-3.5 text-green-600 border-slate-300 rounded focus:ring-green-400"
                      />
                      Correta
                    </label>
                    <button
                      type="button"
                      onClick={adicionarAlternativa}
                      title="Adicionar alternativa"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-[7px] text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {alternativeErrors && (
                    <p className="text-[11px] text-red-500 font-medium">{alternativeErrors}</p>
                  )}

                  <textarea
                    rows={2}
                    value={novaAlternativa.justificativa || ''}
                    onChange={(e) => setNovaAlternativa({...novaAlternativa, justificativa: e.target.value})}
                    className="block w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-shadow duration-150"
                    placeholder="Justificativa da alternativa — por que está correta ou errada (opcional)…"
                  />
                </div>

                {/* Alternative list — only this region scrolls */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {currentAlternativas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-1">
                      <p className="text-xs text-slate-300 font-semibold">Nenhuma alternativa adicionada.</p>
                      <p className="text-[11px] text-slate-300">São necessárias pelo menos 2 para salvar.</p>
                    </div>
                  ) : (
                    currentAlternativas.map((alt, index) => (
                      <div
                        key={index}
                        className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 ${
                          alt.correta
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20'
                        }`}
                      >
                        <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black font-mono mt-0.5 transition-colors ${
                          alt.correta ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug transition-colors ${alt.correta ? 'text-green-900 font-medium' : 'text-gray-700'}`}>
                            {alt.texto}
                          </p>
                          {alt.justificativa && (
                            <p className="text-[11px] text-slate-400 mt-0.5 italic truncate">{alt.justificativa}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaCima(index)}
                            disabled={index === 0}
                            title="Mover para cima"
                            className={`p-1 rounded transition-colors ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moverAlternativaParaBaixo(index)}
                            disabled={index === currentAlternativas.length - 1}
                            title="Mover para baixo"
                            className={`p-1 rounded transition-colors ${index === currentAlternativas.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removerAlternativa(index)}
                            title="Remover alternativa"
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </form>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
              <p className={`text-[11px] font-medium tabular-nums transition-colors ${
                currentAlternativas.length < 2
                  ? 'text-amber-500'
                  : currentAlternativas.filter(a => a.correta).length !== 1 && !crudWatchedFields.anulada
                    ? 'text-amber-500'
                    : 'text-green-600'
              }`}>
                {currentAlternativas.length < 2
                  ? `Adicione pelo menos ${2 - currentAlternativas.length} alternativa${2 - currentAlternativas.length > 1 ? 's' : ''} para continuar`
                  : crudWatchedFields.anulada
                    ? `${currentAlternativas.length} alternativas · questão anulada`
                    : currentAlternativas.filter(a => a.correta).length === 0
                      ? 'Marque a alternativa correta antes de salvar'
                      : currentAlternativas.filter(a => a.correta).length > 1
                        ? 'Apenas uma alternativa pode ser marcada como correta'
                        : `${currentAlternativas.length} alternativas · gabarito definido`
                }
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetQuestaoForm}
                  disabled={formLoading}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="questao-crud-form"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors duration-150 shadow-sm shadow-indigo-200"
                >
                  {formLoading
                    ? (<><Loader2 className="animate-spin w-3.5 h-3.5" /> Salvando…</>)
                    : (editingItem ? 'Atualizar Questão' : 'Salvar Questão')
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}