import React, { useState } from 'react';
import { PlacedComponent } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../../core/components/catalog';
import { X, Check } from 'lucide-react';

interface Props {
  component: PlacedComponent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: PlacedComponent) => void;
}

export const ComponentEditModal: React.FC<Props> = ({
  component,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const def = COMPONENT_CATALOG.find(c => c.type === component.type);
  const [tag, setTag] = useState<string>(component.tag);
  const [timerValue, setTimerValue] = useState<number>(component.timerValue ?? def?.defaultTimeSeconds ?? 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...component,
      tag: tag.trim().toUpperCase(),
      timerValue
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-industrial-900 border border-industrial-700 rounded-lg shadow-2xl p-5 text-industrial-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
          <div>
            <h3 className="text-sm font-bold text-cyan-400">Propiedades del Componente</h3>
            <p className="text-xs text-industrial-400">{def?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-industrial-400 hover:text-industrial-200 hover:bg-industrial-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-industrial-300">
              Etiqueta de Referencia (Tag):
            </label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value)}
              required
              className="w-full px-3 py-2 bg-industrial-950 border border-industrial-700 rounded font-mono text-cyan-400 focus:outline-none focus:border-cyan-400"
              placeholder="-KM1, -S1, -Q1..."
            />
            <p className="text-[11px] text-industrial-500 mt-1">
              Las bobinas y contactos con el mismo Tag se accionarán de manera conjunta.
            </p>
          </div>

          {def?.hasTimer && (
            <div>
              <label className="block font-semibold mb-1 text-industrial-300">
                Tiempo de Retardo (Segundos):
              </label>
              <input
                type="number"
                min="0.1"
                max="3600"
                step="0.5"
                value={timerValue}
                onChange={e => setTimerValue(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-industrial-950 border border-industrial-700 rounded font-mono text-cyan-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-industrial-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-industrial-800 text-industrial-300 hover:bg-industrial-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-500 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
