import React, { useState } from 'react';
import {
  MousePointer,
  Spline,
  RotateCw,
  Undo2,
  Redo2,
  Trash2,
  Maximize2,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { WireType } from '../../types/circuit';

interface Props {
  activeTool: string | null;
  selectedWireType: WireType | null;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  isDrawerOpen: boolean;
  isSimRunning: boolean;
  onSetTool: (tool: string | null) => void;
  onSelectWireType: (wt: WireType) => void;
  onRotateSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onFitScreen: () => void;
  onToggleDrawer: () => void;
}

const WIRE_COLORS: Array<{ type: WireType; label: string; color: string }> = [
  { type: 'phase1', label: 'Fase L1 (Marrón)', color: '#b45309' },
  { type: 'phase2', label: 'Fase L2 (Negro)', color: '#3f3f46' },
  { type: 'phase3', label: 'Fase L3 (Gris)', color: '#71717a' },
  { type: 'neutral', label: 'Neutro N (Azul)', color: '#2563eb' },
  { type: 'pe', label: 'Tierra PE (Verde)', color: '#16a34a' },
  { type: 'dc_pos', label: '+24V / Mando (Rojo)', color: '#dc2626' },
  { type: 'dc_neg', label: '0V DC (Oscuro)', color: '#0f172a' }
];

export const TinkerFloatingBar: React.FC<Props> = ({
  activeTool,
  selectedWireType,
  canUndo,
  canRedo,
  hasSelection,
  isDrawerOpen,
  isSimRunning,
  onSetTool,
  onSelectWireType,
  onRotateSelected,
  onUndo,
  onRedo,
  onDelete,
  onFitScreen,
  onToggleDrawer
}) => {
  const [showColors, setShowColors] = useState(false);
  const currentWire = WIRE_COLORS.find(w => w.type === (selectedWireType || 'phase1')) || WIRE_COLORS[0];

  return (
    <div className="absolute top-3 left-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-lg border border-slate-200/90 select-none">
      {/* Seleccionar */}
      <button
        onClick={() => {
          onSetTool('select');
          setShowColors(false);
        }}
        title="Seleccionar / Arrastrar (Esc)"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
          activeTool === 'select'
            ? 'bg-sky-600 text-white shadow-2xs'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <MousePointer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Mover</span>
      </button>

      {/* Cablear + Selector de color estilo Tinkercad */}
      <div className="relative flex items-center">
        <button
          onClick={() => {
            onSetTool('wire');
            onSelectWireType(selectedWireType || 'phase1');
            setShowColors(!showColors);
          }}
          disabled={isSimRunning}
          title="Trazar cable entre bornes (W)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
            activeTool === 'wire'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Spline className="w-3.5 h-3.5" />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
            style={{ backgroundColor: currentWire.color }}
          />
          <span className="hidden sm:inline">Cable</span>
        </button>

        {showColors && activeTool === 'wire' && !isSimRunning && (
          <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex flex-col gap-1 w-48 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5">
              Color de conductor
            </div>
            {WIRE_COLORS.map(wc => (
              <button
                key={wc.type}
                onClick={() => {
                  onSelectWireType(wc.type);
                  onSetTool('wire');
                  setShowColors(false);
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  selectedWireType === wc.type ? 'bg-sky-50 text-sky-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-3 h-3 rounded-full shrink-0 border border-slate-300" style={{ backgroundColor: wc.color }} />
                <span className="truncate">{wc.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Rotar */}
      <button
        onClick={onRotateSelected}
        disabled={!hasSelection || isSimRunning}
        title="Rotar 90° (R)"
        className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
      >
        <RotateCw className="w-4 h-4" />
      </button>

      {/* Deshacer / Rehacer */}
      <button
        onClick={onUndo}
        disabled={!canUndo || isSimRunning}
        title="Deshacer (Ctrl+Z)"
        className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo || isSimRunning}
        title="Rehacer (Ctrl+Y)"
        className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Borrar */}
      <button
        onClick={onDelete}
        disabled={!hasSelection || isSimRunning}
        title="Eliminar seleccionado (Supr)"
        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 disabled:opacity-35 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Encuadrar */}
      <button
        onClick={onFitScreen}
        title="Ajustar circuito a la pantalla (F)"
        className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Abrir/Cerrar Drawer de Componentes */}
      <button
        onClick={onToggleDrawer}
        title={isDrawerOpen ? 'Ocultar catálogo de componentes' : 'Mostrar catálogo de componentes'}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
          isDrawerOpen ? 'bg-slate-100 text-slate-800' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
        }`}
      >
        {isDrawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">Componentes</span>
      </button>
    </div>
  );
};
