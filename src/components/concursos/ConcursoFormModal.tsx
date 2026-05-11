'use client';

import { useState, useEffect } from 'react';
import { concursoService } from '@/services/api';
import FormModal from '@/components/ui/FormModal';
import { Feedback } from '@/components/ui/Feedback';
import SubtemaPickerModal from '@/components/concursos/SubtemaPickerModal';
import CopySubtemasModal from '@/components/concursos/CopySubtemasModal';
import AsyncSelect from 'react-select/async';
import { formatNivel, utcToLocalInputValue, formatPeso } from '@/utils/formatters';
import type { CSSProperties } from 'react';
import * as Types from '@/types';
import {
  FileText,
  Plus,
  Pencil,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  X,
  Target,
  ExternalLink,
  Copy,
} from 'lucide-react';

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
  subtemas: { 
    value: number; 
    label: string;
    disciplina?: { id: number; nome: string };
    tema?: { id: number; nome: string };
  }[];
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

interface FormData {
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
}

interface ConcursoFormModalProps {
  isOpen: boolean;
  editingItem: ConcursoDto | null;
  loading: boolean;
  validationErrors: string[];
  formData: FormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormDataChange: (updates: Partial<FormData>) => void;
}

export default function ConcursoFormModal({
  isOpen,
  editingItem,
  loading,
  validationErrors,
  formData,
  onClose,
  onSubmit,
  onFormDataChange,
}: ConcursoFormModalProps) {
  const [formTab, setFormTab] = useState<'dados' | 'provas' | 'conteudo'>('dados');
  const [editingProvaId, setEditingProvaId] = useState<string | null>(null);
  const [editingProvaValue, setEditingProvaValue] = useState('');
  
  const [subtemaPickerOpen, setSubtemaPickerOpen] = useState(false);
  const [copySubtemasOpen, setCopySubtemasOpen] = useState(false);
  const [pickingSubtemasFor, setPickingSubtemasFor] = useState<{ cargoId: number, secaoId: string, discId: string } | null>(null);
  const [copyingSubtemasFor, setCopyingSubtemasFor] = useState<{ cargoId: number, secaoId: string, discId: string } | null>(null);
  const [selectedCargoIdConteudo, setSelectedCargoIdConteudo] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormTab('dados');
      setEditingProvaId(null);
      setSelectedCargoIdConteudo(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.cargos.length > 0) {
      if (!selectedCargoIdConteudo || !formData.cargos.some(c => c.value === selectedCargoIdConteudo)) {
        setSelectedCargoIdConteudo(formData.cargos[0].value);
      }
    } else {
      setSelectedCargoIdConteudo(null);
    }
  }, [formData.cargos, selectedCargoIdConteudo]);

  const loadInstituicaoOptions = async (inputValue: string) => {
    try {
      const { instituicaoService } = await import('@/services/api');
      const data = await instituicaoService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(i => ({ value: i.id, label: i.nome }));
    } catch (err) {
      console.warn('Erro ao carregar instituições:', err);
      return [];
    }
  };

  const loadBancaOptions = async (inputValue: string) => {
    try {
      const { bancaService } = await import('@/services/api');
      const data = await bancaService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(b => ({ value: b.id, label: b.sigla || b.nome }));
    } catch (err) {
      console.warn('Erro ao carregar bancas:', err);
      return [];
    }
  };

  const loadCargoOptions = async (inputValue: string) => {
    try {
      const { cargoService } = await import('@/services/api');
      const data = await cargoService.getAll({ nome: inputValue, size: 20 });
      return data.content.map(c => ({ value: c.id, label: `${c.nome} - ${c.area} (${formatNivel(c.nivel)})` }));
    } catch (err) {
      console.warn('Erro ao carregar cargos:', err);
      return [];
    }
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
    
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => s.id === secaoId ? { ...s, disciplinas: [...s.disciplinas, newDisc] } : s) }
          : cs
      )
    });
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
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => {
              if (s.id !== secaoId) return s;
              const remainingDiscs = s.disciplinas.filter(d => d.id !== discId);
              const updatedSecao = { ...s, disciplinas: remainingDiscs };
              return { ...updatedSecao, ...calculateSecaoMetrics(updatedSecao) };
            }) }
          : cs
      )
    });
  };

  const updateDisciplinaInSecao = (cargoId: number, secaoId: string, discId: string, updates: Partial<DisciplinaEntry>) => {
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.map(s => {
              if (s.id !== secaoId) return s;
              const updatedDiscs = s.disciplinas.map(d => d.id === discId ? { ...d, ...updates } : d);
              const updatedSecao = { ...s, disciplinas: updatedDiscs };
              return { ...updatedSecao, ...calculateSecaoMetrics(updatedSecao) };
            }) }
          : cs
      )
    });
  };

  const addProva = (cargoId: number | null = null) => {
    const newProva: ProvaEntry = {
      id: `local-${Math.random().toString(36).substring(2, 9)}`,
      nome: 'Nova Prova',
      cargoId,
    };
    onFormDataChange({ provas: [...formData.provas, newProva] });
  };

  const removeProva = (provaId: string) => {
    onFormDataChange({ provas: formData.provas.filter(p => p.id !== provaId) });
  };

  const updateProva = (provaId: string, updates: Partial<ProvaEntry>) => {
    onFormDataChange({ provas: formData.provas.map(p => p.id === provaId ? { ...p, ...updates } : p) });
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
    
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: [...cs.secoes, newSecao] }
          : cs
      )
    });
  };

  const removeSecaoFromCargo = (cargoId: number, secaoId: string) => {
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => 
        cs.cargoId === cargoId 
          ? { ...cs, secoes: cs.secoes.filter(s => s.id !== secaoId) }
          : cs
      )
    });
  };

  const moveSecaoUp = (cargoId: number, secaoId: string) => {
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        const idx = cs.secoes.findIndex(s => s.id === secaoId);
        if (idx <= 0) return cs;
        const newSecoes = [...cs.secoes];
        [newSecoes[idx - 1], newSecoes[idx]] = [newSecoes[idx], newSecoes[idx - 1]];
        newSecoes.forEach((s, i) => s.ordem = i);
        return { ...cs, secoes: newSecoes };
      })
    });
  };

  const moveSecaoDown = (cargoId: number, secaoId: string) => {
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        const idx = cs.secoes.findIndex(s => s.id === secaoId);
        if (idx < 0 || idx >= cs.secoes.length - 1) return cs;
        const newSecoes = [...cs.secoes];
        [newSecoes[idx], newSecoes[idx + 1]] = [newSecoes[idx + 1], newSecoes[idx]];
        newSecoes.forEach((s, i) => s.ordem = i);
        return { ...cs, secoes: newSecoes };
      })
    });
  };

  const updateSecaoInCargo = (cargoId: number, secaoId: string, updates: Partial<SecaoEntry>) => {
    onFormDataChange({
      cargoSecoes: formData.cargoSecoes.map(cs => {
        if (cs.cargoId !== cargoId) return cs;
        return {
          ...cs,
          secoes: cs.secoes.map(s => {
            if (s.id !== secaoId) return s;
            const hasValues = s.disciplinas.some(d => d.numQuestoes !== null || d.peso !== null || d.notaMinima !== null);
            if (hasValues) {
              return { ...s, nome: updates.nome ?? s.nome };
            }
            return { ...s, ...updates };
          })
        };
      })
    });
  };

  const handleCargoChange = (opts: readonly { value: number; label: string }[] | null) => {
    const newCargos = opts ? [...opts] : [];
    const newCargoIds = newCargos.map((c) => c.value);
    
    const currentCargoIds = formData.cargos.map(c => c.value);
    const removedCargoIds = currentCargoIds.filter(id => !newCargoIds.includes(id));
    const addedCargoIds = newCargoIds.filter(id => !currentCargoIds.includes(id));
    
    const newProvas = addedCargoIds.map(cargoId => ({
      id: `local-${Math.random().toString(36).substring(2, 9)}`,
      nome: 'Prova Objetiva',
      cargoId,
    }));
    
    const updatedCargoSecoes = formData.cargoSecoes
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
    
    const updatedProvas = formData.provas
      .filter(p => p.cargoId === null || newCargoIds.includes(p.cargoId))
      .map(p => {
        if (p.cargoId && removedCargoIds.includes(p.cargoId)) {
          return { ...p, cargoId: null };
        }
        return p;
      })
      .concat(newProvas);
    
    onFormDataChange({
      cargos: newCargos,
      cargoSecoes: updatedCargoSecoes,
      provas: updatedProvas
    });
  };

  

  const selectStyles: Record<string, (base: CSSProperties) => CSSProperties> = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    control: (base) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', '&:hover': { borderColor: '#6b7280' }, padding: '2px' }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
    singleValue: (base) => ({ ...base, color: '#111827', fontSize: '0.875rem', fontWeight: '500' })
  };

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSubmit}
        title={editingItem ? 'Editar Concurso' : 'Nova Prova / Edital'}
        loading={loading}
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
                  onChange={(val) => onFormDataChange({ instituicao: val })}
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
                  onChange={(val) => onFormDataChange({ banca: val })}
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
                    onChange={(e) => onFormDataChange({ ano: parseInt(e.target.value) || new Date().getFullYear() })}
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
                    onChange={(e) => onFormDataChange({ mes: parseInt(e.target.value) || 1 })}
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
                  onChange={(e) => onFormDataChange({ dataProva: e.target.value })}
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-2.5 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.finalizado}
                      onChange={(e) => onFormDataChange({ finalizado: e.target.checked })}
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
                    onChange={(e) => onFormDataChange({ edital: e.target.value })}
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
                                              value={formatPeso(secao.peso)}
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
            {formData.cargos.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cargo selecionado</p>
                <p className="text-xs text-slate-400 mt-1">Selecione cargos na aba Dados Gerais para definir o conteúdo.</p>
              </div>
            ) : (
              <>
                <div className="flex overflow-x-auto p-1.5 mb-6 gap-2 flex-nowrap bg-slate-100/70 border border-slate-200/80 rounded-xl shadow-inner">
                  {formData.cargos.map((cargo) => (
                    <button
                      key={cargo.value}
                      type="button"
                      onClick={() => setSelectedCargoIdConteudo(cargo.value)}
                      className={`flex-none px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                        selectedCargoIdConteudo === cargo.value
                          ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 ring-1 ring-slate-900/5'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                      }`}
                    >
                      {cargo.label.split(' - ')[0]}
                    </button>
                  ))}
                </div>

                <div className="space-y-8">
                  {formData.cargoSecoes
                    .filter((cs) => cs.cargoId === selectedCargoIdConteudo)
                    .map((cargoSec) => {
                    return (
                      <div key={cargoSec.cargoId} className="space-y-4">
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
                                            value={disc.peso !== null ? formatPeso(disc.peso) : ''}
                                            onChange={(e) => updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { peso: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                            className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                                            placeholder="-"
                                          />
                                        </div>
                                        <div className="w-20">
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nota Min.</label>
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
                                          <div className="flex items-center gap-2">
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
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCopyingSubtemasFor({ cargoId: cargoSec.cargoId, secaoId: secao.id, discId: disc.id });
                                                setCopySubtemasOpen(true);
                                              }}
                                              className="inline-flex items-center px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                                            >
                                              <Copy className="w-3 h-3 mr-1" /> Copiar Subtemas
                                            </button>
                                          </div>                                          </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                          {disc.subtemas.length === 0 ? (
                                            <p className="text-[10px] italic text-slate-400 col-span-full">Nenhum subtema vinculado</p>
                                          ) : (
                                            [...disc.subtemas].sort((a, b) => {
                                              const aDisc = a.disciplina?.nome || '';
                                              const aTema = a.tema?.nome || '';
                                              const aSub = a.label.split(' - ').pop() || a.label;
                                              const bDisc = b.disciplina?.nome || '';
                                              const bTema = b.tema?.nome || '';
                                              const bSub = b.label.split(' - ').pop() || b.label;
                                              return aDisc.localeCompare(bDisc) || aTema.localeCompare(bTema) || aSub.localeCompare(bSub);
                                            }).map((st) => {
                                              let subtemaName = st.label;
                                              let disciplinaNome = st.disciplina?.nome;
                                              let temaNome = st.tema?.nome;
                                              
                                              // When disciplina/tema are available, extract just the subtema name from label
                                              if (disciplinaNome && temaNome && st.label.includes(' - ')) {
                                                const parts = st.label.split(' - ');
                                                subtemaName = parts.pop() || '';
                                              }
                                              // Fallback: parse from label if disciplina/tema not available
                                              else if (st.label.includes(' - ')) {
                                                const parts = st.label.split(' - ');
                                                subtemaName = parts.pop() || '';
                                                temaNome = parts.pop() || '';
                                                disciplinaNome = parts.join(' - ') || '';
                                              }
                                              
                                              return (
                                                <div key={st.value} className="flex items-start justify-between gap-3 p-2.5 pr-1.5 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                                  <div className="flex flex-col gap-0.5 overflow-hidden">
                                                    {disciplinaNome && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate" title={disciplinaNome}>{disciplinaNome}</span>}
                                                    {temaNome && <span className="text-[10px] font-semibold text-slate-500 leading-tight truncate" title={temaNome}>{temaNome}</span>}
                                                    <span className="text-xs font-black text-slate-700 leading-tight" title={subtemaName}>{subtemaName}</span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updated = disc.subtemas.filter(s => s.value !== st.value);
                                                      updateDisciplinaInSecao(cargoSec.cargoId, secao.id, disc.id, { subtemas: updated });
                                                    }}
                                                    className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors mt-0.5 flex-shrink-0"
                                                    title="Remover subtema"
                                                  >
                                                    <X className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              );
                                            })
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
              </>
            )}
          </div>
        </div>

      </FormModal>

      <SubtemaPickerModal
        isOpen={subtemaPickerOpen}
        onClose={() => {
          setSubtemaPickerOpen(false);
          setPickingSubtemasFor(null);
        }}
        onConfirm={(selected) => {
          if (pickingSubtemasFor) {
            const { cargoId, secaoId, discId } = pickingSubtemasFor;
            const newSubtemas = selected.map(s => ({ 
              value: s.subtemaId, 
              label: s.label ?? '',
              disciplina: s.disciplina ? { id: s.disciplina.id, nome: s.disciplina.nome } : undefined,
              tema: s.tema ? { id: s.tema.id, nome: s.tema.nome } : undefined,
            }));
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
            label: st.label,
            disciplina: st.disciplina ? { id: st.disciplina.id, nome: st.disciplina.nome } : undefined,
            tema: st.tema ? { id: st.tema.id, nome: st.tema.nome } : undefined,
          }));
        })()}
      />
      <CopySubtemasModal
        isOpen={copySubtemasOpen}
        onClose={() => {
          setCopySubtemasOpen(false);
          setCopyingSubtemasFor(null);
        }}
        onConfirm={(subtemas) => {
          if (copyingSubtemasFor) {
            updateDisciplinaInSecao(copyingSubtemasFor.cargoId, copyingSubtemasFor.secaoId, copyingSubtemasFor.discId, { subtemas });
          }
          setCopySubtemasOpen(false);
          setCopyingSubtemasFor(null);
        }}
        cargoSecoes={formData.cargoSecoes}
        currentCargoId={copyingSubtemasFor?.cargoId ?? 0}
        currentDiscId={copyingSubtemasFor?.discId ?? ''}
      />
    </>
  );
}