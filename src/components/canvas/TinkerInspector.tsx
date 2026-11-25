import React from 'react';
import { RotateCw, Trash2, X, Cpu, SlidersHorizontal } from 'lucide-react';
import { PlacedComponent, WireSegment } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../../core/components/catalog';

interface Props {
  selectedComponent: PlacedComponent | null;
  selectedWire: WireSegment | null;
  isSimRunning: boolean;
  onUpdateComponent: (updated: PlacedComponent) => void;
  onRotateComponent: (compId: string) => void;
  onDeleteSelection: () => void;
  onClearSelection: () => void;
  onOpenDetailedModal: (comp: PlacedComponent) => void;
}

const PLC_QUICK_ADDRESSES = [
  { value: '', label: 'Sin vínculo directo (solo cableado)' },
  { value: '%I0.0', label: '%I0.0 — Entrada DI .0 (Marcha)' },
  { value: '%I0.1', label: '%I0.1 — Entrada DI .1 (Paro)' },
  { value: '%I0.2', label: '%I0.2 — Entrada DI .2 (Térmico / Aux)' },
  { value: '%I0.3', label: '%I0.3 — Entrada DI .3 (Sensor a0)' },
  { value: '%I0.4', label: '%I0.4 — Entrada DI .4 (Sensor a1)' },
  { value: '%Q0.0', label: '%Q0.0 — Salida DQ .0 (Motor -KM1)' },
  { value: '%Q0.1', label: '%Q0.1 — Salida DQ .1 (Piloto -H1)' },
  { value: '%Q0.2', label: '%Q0.2 — Salida DQ .2 (Avance A+ / Y1)' },
  { value: '%Q0.3', label: '%Q0.3 — Salida DQ .3 (Retorno A- / Y2)' }
];

export const TinkerInspector: React.FC<Props> = ({
  selectedComponent,
  selectedWire,
  isSimRunning,
  onUpdateComponent,
  onRotateComponent,
  onDeleteSelection,
  onClearSelection,
  onOpenDetailedModal
}) => {
  if (!selectedComponent && !selectedWire) return null;

  if (selectedWire && !selectedComponent) {
    return (
      <div className="absolute bottom-4 left-4 z-30 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3.5 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-900">Conductor Eléctrico</div>
          <button onClick={onClearSelection} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[11px] text-slate-500 mb-3 font-mono">
          Tipo: <span className="font-bold text-slate-800">{selectedWire.wireType}</span> • ({selectedWire.fromX},{selectedWire.fromY}) → ({selectedWire.toX},{selectedWire.toY})
        </div>
        <button
          onClick={onDeleteSelection}
          disabled={isSimRunning}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Cable</span>
        </button>
      </div>
    );
  }

  if (!selectedComponent) return null;

  const def = COMPONENT_CATALOG.find(c => c.type === selectedComponent.type);

  return (
    <div className="absolute bottom-4 left-4 z-30 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3.5 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div>
          <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 mb-1">
            {def?.category || 'componente'}
          </span>
          <h4 className="text-xs font-bold text-slate-900 leading-tight">{def?.name || selectedComponent.type}</h4>
        </div>
        <button onClick={onClearSelection} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Campos rápidos */}
      <div className="mt-2.5 space-y-2.5 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Etiqueta CADe_SIMU (Tag)</label>
          <input
            type="text"
            value={selectedComponent.tag}
            disabled={isSimRunning}
            onChange={(e) =>
              onUpdateComponent({ ...selectedComponent, tag: e.target.value.toUpperCase() })
            }
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
          />
        </div>

        {/* Vínculo Directo TIA Portal (%I / %Q) */}
        <div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
            <Cpu className="w-3 h-3 text-emerald-600" />
            <span>Vínculo Rápido PLC TIA (Quick-Link)</span>
          </label>
          <select
            value={selectedComponent.plcAddress || ''}
            disabled={isSimRunning}
            onChange={(e) =>
              onUpdateComponent({ ...selectedComponent, plcAddress: e.target.value || undefined })
            }
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-sky-500 disabled:opacity-60"
          >
            {PLC_QUICK_ADDRESSES.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {def?.hasTimer && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tiempo Temporizador (seg)</label>
            <input
              type="number"
              min={0.5}
              max={600}
              step={0.5}
              disabled={isSimRunning}
              value={selectedComponent.timerValue ?? def.defaultTimeSeconds ?? 5}
              onChange={(e) =>
                onUpdateComponent({ ...selectedComponent, timerValue: parseFloat(e.target.value) || 1 })
              }
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
        <button
          onClick={() => onRotateComponent(selectedComponent.id)}
          disabled={isSimRunning}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rotar</span>
        </button>
        <button
          onClick={() => onOpenDetailedModal(selectedComponent)}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          title="Edición avanzada"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDeleteSelection}
          disabled={isSimRunning}
          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-40 cursor-pointer"
          title="Eliminar componente"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
