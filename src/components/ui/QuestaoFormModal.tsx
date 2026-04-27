import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import AsyncSelect from 'react-select/async';
import Select from 'react-select/async';
import {
  XCircle,
  Plus,
  AlertCircle,
  Loader2
} from 'lucide-react';
import * as Types from '@/types';
import { formatNivel } from '@/utils/formatters';
import { concursoService, subtemaService } from '@/services/api';
import BaseModal from './BaseModal';

interface QuestaoFormData {
  concurso: { value: number; label: string } | null;
  enunciado: string;
  anulada: boolean;
  desatualizada: boolean;
  autoral: boolean;
  subtemas: { value: number; label: string }[];
  cargos: number[];
  imageUrl: string;
}

interface QuestaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  crudForm: UseFormReturn<QuestaoFormData>;
  editingItem: Types.QuestaoSummaryDto | null;
  formLoading: boolean;
  validationErrors: string[];
  currentAlternativas: Types.AlternativaDto[];
  novaAlternativa: Omit<Types.AlternativaDto, 'id' | 'questaoId'>;
  onNovaAlternativaChange: (alt: Omit<Types.AlternativaDto, 'id' | 'questaoId'>) => void;
  onAdicionarAlternativa: () => void;
  onRemoverAlternativa: (index: number) => void;
  onMoverAlternativaParaCima: (index: number) => void;
  onMoverAlternativaParaBaixo: (index: number) => void;
  alternativeErrors: string;
}

export default function QuestaoFormModal({
  isOpen,
  onClose,
  onSubmit,
  crudForm,
  editingItem,
  formLoading,
  validationErrors,
  currentAlternativas,
  novaAlternativa,
  onNovaAlternativaChange,
  onAdicionarAlternativa,
  onRemoverAlternativa,
  onMoverAlternativaParaCima,
  onMoverAlternativaParaBaixo,
  alternativeErrors
}: QuestaoFormModalProps) {
  const [availableCargos, setAvailableCargos] = useState<Types.CargoSummaryDto[]>([]);
  const [activeTab, setActiveTab] = useState<'dados' | 'alternativas'>('dados');
  const crudWatchedFields = crudForm.watch();


  // Error indicators for mobile tabs
  const hasDadosErrors = validationErrors.length > 0 || Object.keys(crudForm.formState.errors).length > 0;
  const hasAlternativasErrors = currentAlternativas.length < 2 || 
                                (currentAlternativas.filter(a => a.correta).length !== 1 && !crudWatchedFields.anulada);

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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      className="lg:h-[min(88vh,680px)] flex flex-col"
      preventBackdropClick={formLoading}
    >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-indigo-100/60 bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
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
            onClick={onClose}
            title="Fechar"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors duration-150"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* ── Mobile Tabs ── */}
        <div className="flex lg:hidden border-b border-indigo-100/60 bg-white shadow-sm flex-shrink-0 relative">
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all relative flex items-center justify-center gap-2 ${
              activeTab === 'dados' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Questão
            {hasDadosErrors && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 shadow-sm shadow-terracotta-200" />}
            {activeTab === 'dados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 animate-in fade-in slide-in-from-bottom-1 duration-200" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alternativas')}
            className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all relative flex items-center justify-center gap-2 ${
              activeTab === 'alternativas' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Alternativas
            {hasAlternativasErrors && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 shadow-sm shadow-terracotta-200" />}
            {activeTab === 'alternativas' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 animate-in fade-in slide-in-from-bottom-1 duration-200" />}
          </button>
        </div>


        {/* ── Two-panel body ── */}
        <form
          id="questao-crud-form"
          onSubmit={crudForm.handleSubmit(onSubmit)}
          className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden scroll-smooth"
        >
          {/* ── LEFT: metadata fields ── */}
          <div className={`flex-shrink-0 flex-col w-full lg:w-[46%] border-b lg:border-b-0 lg:border-r border-slate-100 lg:overflow-y-auto bg-slate-50/40 ${activeTab === 'dados' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="flex-1 px-5 py-5 space-y-6">

              {/* Enunciado */}
              <div>
                <label htmlFor="crud-enunciado" className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600/70 uppercase tracking-widest mb-1.5">
                  Enunciado
                  <span className="text-terracotta-400 font-black">*</span>
                </label>
                <textarea
                  id="crud-enunciado"
                  rows={5}
                  autoFocus
                  {...crudForm.register('enunciado', { required: 'O enunciado é obrigatório.' })}
                  className="block w-full text-sm border border-slate-200 bg-white rounded-xl p-3.5 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all duration-150 leading-relaxed shadow-sm"
                  placeholder="Digite o enunciado da questão…"
                />
                {crudForm.formState.errors.enunciado && (
                  <p className="mt-1.5 text-[11px] text-terracotta-500 font-medium">{crudForm.formState.errors.enunciado.message}</p>
                )}
              </div>

              {/* Flags & Content Group */}
              <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100/50 space-y-6">
                <div>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3 leading-none">Status da Questão</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-3">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        id="crud-autoral"
                        {...crudForm.register('autoral')}
                        disabled={!!editingItem}
                        className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-400 disabled:opacity-40 transition-colors"
                      />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors tracking-tight">
                        Questão Autoral
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
                      <span className={`text-xs transition-colors tracking-tight ${crudWatchedFields.anulada ? 'text-amber-600 font-semibold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        Questão Anulada
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        id="crud-desatualizada"
                        {...crudForm.register('desatualizada')}
                        className="h-3.5 w-3.5 text-amber-500 border-slate-300 rounded focus:ring-amber-400 transition-colors"
                      />
                      <span className={`text-xs transition-colors tracking-tight ${crudWatchedFields.desatualizada ? 'text-amber-600 font-semibold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        Questão Desatualizada
                      </span>
                    </label>
                  </div>
                </div>

                {/* Origem (conditional on non-autoral) */}
                {!crudWatchedFields.autoral && (
                  <div className="space-y-4 pt-1">
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
                  </div>
                )}
              </div>

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
          <div className={`flex-col flex-1 min-w-0 bg-white lg:overflow-y-auto ${activeTab === 'alternativas' ? 'flex' : 'hidden lg:flex'}`}>

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

              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={novaAlternativa.texto}
                    onChange={(e) => onNovaAlternativaChange({...novaAlternativa, texto: e.target.value})}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdicionarAlternativa(); } }}
                    className={`flex-1 text-sm border rounded-lg px-2.5 py-[7px] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow duration-150 ${
                      alternativeErrors ? 'border-red-300 bg-red-50 placeholder-red-300' : 'border-slate-200 placeholder-slate-300'
                    }`}
                    placeholder="Texto da alternativa… (Enter para adicionar)"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer whitespace-nowrap px-1 hover:text-slate-700 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={novaAlternativa.correta}
                      onChange={(e) => onNovaAlternativaChange({...novaAlternativa, correta: e.target.checked})}
                      className="h-3.5 w-3.5 text-green-600 border-slate-300 rounded focus:ring-green-400"
                    />
                    Correta
                  </label>
                </div>

                {alternativeErrors && (
                  <p className="text-[11px] text-red-500 font-medium">{alternativeErrors}</p>
                )}

                <textarea
                  rows={2}
                  value={novaAlternativa.justificativa || ''}
                  onChange={(e) => onNovaAlternativaChange({...novaAlternativa, justificativa: e.target.value})}
                  className="block w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-shadow duration-150"
                  placeholder="Justificativa da alternativa — por que está correta ou errada (opcional)…"
                />

                <button
                  type="button"
                  onClick={onAdicionarAlternativa}
                  title="Adicionar alternativa"
                  className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150 w-full sm:w-max ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Alternative list — only this region scrolls on desktop */}
            <div className="flex-1 lg:overflow-y-auto px-5 py-6 space-y-4">
              {currentAlternativas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-1.5">
                  <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Nenhuma alternativa</p>
                  <p className="text-[11px] text-slate-400">Adicione pelo menos 2 alternativas.</p>
                </div>
              ) : (
                currentAlternativas.map((alt, index) => (
                  <div
                    key={index}
                    className={`group flex items-start gap-2.5 px-3 py-3 rounded-lg border transition-all duration-150 ${
                      alt.correta
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-bold mt-0.5 transition-colors ${
                      alt.correta ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
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
                        onClick={() => onMoverAlternativaParaCima(index)}
                        disabled={index === 0}
                        title="Mover para cima"
                        className={`p-1 rounded transition-colors ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoverAlternativaParaBaixo(index)}
                        disabled={index === currentAlternativas.length - 1}
                        title="Mover para baixo"
                        className={`p-1 rounded transition-colors ${index === currentAlternativas.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoverAlternativa(index)}
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
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <p className={`text-[11px] font-mono font-bold tabular-nums transition-colors text-center sm:text-left ${
            currentAlternativas.length < 2
              ? 'text-amber-600'
              : currentAlternativas.filter(a => a.correta).length !== 1 && !crudWatchedFields.anulada
                ? 'text-amber-600'
                : 'text-emerald-600'
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
              onClick={onClose}
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

    </BaseModal>
  );
}
