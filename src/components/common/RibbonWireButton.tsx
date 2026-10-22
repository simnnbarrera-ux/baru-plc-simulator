import React, { useState } from 'react';
import { WireType } from '../../types/circuit';

interface Props {
  wire: {
    id: WireType;
    label: string;
    color: string;
    desc: string;
    standard: string;
    voltage: string;
  };
  isSelected?: boolean;
  onClick: () => void;
}

export const RibbonWireButton: React.FC<Props> = ({
  wire,
  isSelected,
  onClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: Math.max(10, Math.min(window.innerWidth - 280, rect.left + rect.width / 2 - 130)),
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
        className={`flex flex-col items-center justify-between p-2 rounded-lg border min-w-[105px] max-w-[130px] h-[72px] transition-all bg-white shadow-xs group ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/25 bg-blue-50/50 shadow-sm'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
        }`}
      >
        {/* Muestra gráfica del cable */}
        <div className="flex items-center justify-center gap-1.5 w-full pt-0.5">
          <div
            className="w-12 h-3 rounded-full border border-black/20 shadow-inner group-hover:scale-105 transition-transform"
            style={{ backgroundColor: wire.color }}
          />
        </div>

        {/* Nombre completo */}
        <div className="w-full text-center px-0.5">
          <span className="text-[11px] font-bold text-slate-800 leading-tight block">
            {wire.label}
          </span>
          <span className="text-[9.5px] font-medium text-slate-500 block">
            {wire.desc}
          </span>
        </div>
      </button>

      {/* Tooltip enriquecido para cables */}
      {showTooltip && (
        <div
          className="fixed z-50 w-64 p-3 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 pointer-events-none transition-opacity animate-in fade-in duration-150"
          style={{ top: `${coords.y}px`, left: `${coords.x}px` }}
        >
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
            <div
              className="w-4 h-4 rounded-full border border-black/20"
              style={{ backgroundColor: wire.color }}
            />
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Conductor Eléctrico
              </div>
              <div className="text-xs font-bold text-slate-900">
                {wire.label} ({wire.desc})
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 leading-relaxed mb-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Normativa:</span>
              <span className="font-semibold text-slate-700">{wire.standard}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nivel de tensión:</span>
              <span className="font-semibold text-slate-700">{wire.voltage}</span>
            </div>
          </div>

          <div className="text-[10px] text-blue-600 font-semibold pt-1 border-t border-slate-100 text-right">
            Clic para trazar cables con este conductor
          </div>
        </div>
      )}
    </div>
  );
};
