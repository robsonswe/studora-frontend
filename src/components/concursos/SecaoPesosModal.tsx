'use client';

import React, { useState } from 'react';
import FormModal from '@/components/ui/FormModal';

interface CargoPeso {
  cargoId: number;
  label: string;
  peso: number;
  notaMinima: number;
}

interface SecaoPesosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pesos: { cargoId: number; peso: number; notaMinima: number }[]) => void;
  initialPesos: { cargoId: number; peso: number; notaMinima: number }[];
  availableCargos: { value: number; label: string }[];
}

export const SecaoPesosModal: React.FC<SecaoPesosModalProps> = ({ 
  isOpen, onClose, onSave, initialPesos, availableCargos 
}) => {
  const [pesos, setPesos] = useState<CargoPeso[]>([]);

  React.useEffect(() => {
    setPesos(availableCargos.map(cargo => {
      const existing = (initialPesos || []).find(p => p.cargoId === cargo.value);
      return {
        cargoId: cargo.value,
        label: cargo.label,
        peso: existing?.peso ?? 1,
        notaMinima: existing?.notaMinima ?? 0
      };
    }));
  }, [availableCargos, initialPesos]);

  const updatePeso = (cargoId: number, field: 'peso' | 'notaMinima', value: number) => {
    setPesos(pesos.map(p => p.cargoId === cargoId ? { ...p, [field]: value } : p));
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={() => onSave(pesos)}
      title="Configurar Pesos e Notas Mínimas"
      submitLabel="Salvar"
      size="lg"
    >
      <div className="space-y-4">
        <div className="space-y-2 max-h-[400px] overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50">
          {pesos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum cargo configurado</p>
          ) : (
            pesos.map(p => (
              <div key={p.cargoId} className="flex items-center gap-3 bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                <span className="text-xs font-bold text-gray-700 flex-1 truncate">{p.label.split(' - ')[0]}</span>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Peso</label>
                    <input
                      type="number"
                      step="0.1"
                      value={p.peso}
                      onChange={(e) => updatePeso(p.cargoId, 'peso', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Nota Mín.</label>
                    <input
                      type="number"
                      step="0.1"
                      value={p.notaMinima}
                      onChange={(e) => updatePeso(p.cargoId, 'notaMinima', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </FormModal>
  );
};
