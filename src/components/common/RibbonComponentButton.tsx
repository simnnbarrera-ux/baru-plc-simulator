import React, { useState } from 'react';
import { ComponentDefinition } from '../../types/circuit';
import { ComponentIcon } from './ComponentIcon';

interface Props {
  component: ComponentDefinition;
  isSelected?: boolean;
  onClick: () => void;
}

export const RibbonComponentButton: React.FC<Props> = ({
  component,
  isSelected,
  onClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: Math.max(10, Math.min(window.innerWidth - 300, rect.left + rect.width / 2 - 140)),
      y: rect.bottom + 8
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex flex-col items-center justify-between p-2 rounded-lg border min-w-[110px] max-w-[140px] h-[72px] transition-all bg-white shadow-xs group ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/25 bg-blue-50/50 shadow-sm'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 hover:shadow-xs'
        }`}
      >
        {/* Fila superior: Ícono vectorial + Tag */}
        <div className="flex items-center justify-center gap-1.5 w-full">
          <div className="p-0.5 rounded bg-slate-50 border border-slate-200 group-hover:scale-105 transition-transform flex items-center justify-center">
            <ComponentIcon type={component.type} size={24} />
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            {component.defaultTag}
          </span>
        </div>

        {/* Fila inferior: Nombre completo sin truncar feo */}
        <div className="w-full text-center px-0.5">
          <span className="text-[10.5px] font-semibold text-slate-800 leading-tight line-clamp-2 text-center block" title={component.name}>
            {component.name}
          </span>
        </div>
      </button>

      {/* Tooltip informativo flotante enriquecido con portal fijo */}
      {showTooltip && (
        <div
          className="fixed z-50 w-72 p-3 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 pointer-events-none transition-opacity animate-in fade-in duration-150"
          style={{ top: `${coords.y}px`, left: `${coords.x}px` }}
        >
          {/* Cabecera del tooltip con ícono y categoría */}
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
            <div className="p-1 rounded bg-blue-50 border border-blue-200">
              <ComponentIcon type={component.type} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                {component.category}
              </div>
              <div className="text-xs font-bold text-slate-900 leading-snug">
                {component.name}
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
              {component.defaultTag}
            </span>
          </div>

          {/* Descripción técnica detallada */}
          <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
            {component.description}
          </p>

          {/* Información de bornes / terminales */}
          {component.pins && component.pins.length > 0 && (
            <div className="bg-slate-50 rounded p-1.5 mb-2 border border-slate-200/80">
              <div className="text-[10px] font-semibold text-slate-500 mb-1">
                Terminales / Bornes:
              </div>
              <div className="flex flex-wrap gap-1">
                {component.pins.map(p => (
                  <span
                    key={p.id}
                    className="text-[9.5px] font-mono font-medium bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs"
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pie del tooltip con sugerencia de uso */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100">
            <span>Dim: {component.width}×{component.height}</span>
            <span className="text-blue-600 font-semibold">Clic para insertar</span>
          </div>
        </div>
      )}
    </div>
  );
};
