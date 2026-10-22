import React from 'react';
import { SimulationState } from '../../types/simulation';

interface Props {
  coordX: number;
  coordY: number;
  simulationState: SimulationState;
  componentCount: number;
  wireCount: number;
  activeTool: string | null;
}

export const StatusBar: React.FC<Props> = ({
  coordX,
  coordY,
  simulationState,
  componentCount,
  wireCount,
  activeTool
}) => {
  const isSimulating = simulationState.mode === 'running';

  return (
    <div className="flex items-center justify-between h-7 bg-[#e2e8f0] border-t border-[#cbd5e1] px-3 text-[11px] font-mono text-slate-700 select-none shadow-xs">
      {/* Coordenadas del cursor y medidas reales */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-white/70 px-2 py-0.5 rounded border border-slate-300">
          <span className="text-slate-400 font-semibold">X:</span>
          <span className="text-slate-900 font-bold w-7 text-right">{coordX}</span>
          <span className="text-slate-400 font-semibold ml-1">Y:</span>
          <span className="text-slate-900 font-bold w-7 text-right">{coordY}</span>
          <span className="text-[10px] text-slate-500 font-medium ml-1">({coordX * 5}mm, {coordY * 5}mm)</span>
        </div>

        <div className="h-3.5 w-px bg-slate-300" />

        {/* Herramienta activa */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Modo activo:</span>
          <span className="font-bold text-blue-700 capitalize bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {activeTool === 'wire' ? 'Cableado' : activeTool === 'select' ? 'Selección' : activeTool || 'Selección'}
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-300" />

        {/* Estadísticas de elementos en plano */}
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span><strong className="text-slate-900">{componentCount}</strong> componentes</span>
          <span>•</span>
          <span><strong className="text-slate-900">{wireCount}</strong> conductores</span>
        </div>
      </div>

      {/* Estado del motor de simulación */}
      <div className="flex items-center gap-4">
        {isSimulating ? (
          <div className="flex items-center gap-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-800 font-bold text-[10.5px]">SIMULACIÓN ACTIVA</span>
            <span className="text-emerald-600 text-[10px]">• 30 Hz</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Modo Edición CAD</span>
          </div>
        )}

        <div className="h-3.5 w-px bg-slate-300" />

        <div className="text-[10px] text-slate-500">
          DIN A4 (1200×860) • Paso 20px
        </div>
      </div>
    </div>
  );
};
