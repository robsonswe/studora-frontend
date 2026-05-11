import { useState, useMemo } from 'react';
import FormModal from '@/components/ui/FormModal';
import { ChevronRight, Search, Target, BookOpen, Layers } from 'lucide-react';

interface Subtema {
  value: number;
  label: string;
  disciplina?: { id: number; nome: string };
  tema?: { id: number; nome: string };
}

interface DisciplinaEntry {
  id: string;
  nome: string;
  subtemas: Subtema[];
}

interface SecaoEntry {
  id: string;
  nome: string;
  disciplinas: DisciplinaEntry[];
}

interface CargoWithSecoes {
  cargoId: number;
  cargoNome: string;
  secoes: SecaoEntry[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subtemas: Subtema[]) => void;
  cargoSecoes: CargoWithSecoes[];
  currentCargoId: number;
  currentDiscId: string;
}

export default function CopySubtemasModal({ isOpen, onClose, onConfirm, cargoSecoes, currentCargoId, currentDiscId }: Props) {
  const [selectedSource, setSelectedSource] = useState<{ disciplina: DisciplinaEntry } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const availableOptions = useMemo(() => {
    return cargoSecoes
      .filter(cs => cs.cargoId !== currentCargoId)
      .map(cs => {
        const filteredSecoes = cs.secoes.map(s => ({
          ...s,
          disciplinas: s.disciplinas.filter(d => 
            d.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cs.cargoNome.toLowerCase().includes(searchTerm.toLowerCase())
          )
        })).filter(s => s.disciplinas.length > 0);

        return {
          ...cs,
          secoes: filteredSecoes
        };
      })
      .filter(cs => cs.secoes.length > 0);
  }, [cargoSecoes, currentCargoId, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSource) {
      onConfirm(selectedSource.disciplina.subtemas);
    }
  };

  return (
    <FormModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onSubmit={handleSubmit}
      title="Copiar Conteúdo de outro Cargo"
      submitLabel="Confirmar Cópia"
      size="2xl"
      footerExtra={selectedSource && (
        <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
          <Target className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Origem: {selectedSource.disciplina.nome}</span>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Search Header */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Filtrar Cargos ou Disciplinas</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: Português, Analista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm pl-10"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-6">
          {availableOptions.length === 0 ? (
            <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum resultado encontrado</p>
            </div>
          ) : (
            availableOptions.map(cs => (
              <div key={cs.cargoId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-900">{cs.cargoNome}</span>
                </div>

                <div className="p-5 space-y-6">
                  {cs.secoes.map(s => (
                    <div key={s.id} className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{s.nome}</label>
                      <div className="grid grid-cols-1 gap-2">
                        {s.disciplinas.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedSource({ disciplina: d })}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
                              selectedSource?.disciplina.id === d.id 
                                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-md ${selectedSource?.disciplina.id === d.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <div className={`text-sm font-bold ${selectedSource?.disciplina.id === d.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {d.nome}
                                </div>
                                <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                  {d.subtemas.length} subtemas vinculados
                                </div>
                              </div>
                            </div>
                            <div className={`transition-all ${selectedSource?.disciplina.id === d.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                              <ChevronRight className="w-4 h-4 text-indigo-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </FormModal>
  );
}
