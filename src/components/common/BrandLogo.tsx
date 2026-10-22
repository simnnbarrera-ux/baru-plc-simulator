import React from 'react';

interface Props {
  className?: string;
  collapsed?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', collapsed = false }) => {
  return (
    <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
      {/* Emblema Vectorial de Alta Definición */}
      <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 shadow-sm shadow-blue-500/30 p-1 border border-blue-400/40">
        <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
          {/* Circuito impreso base */}
          <path
            d="M 4 8 L 10 8 L 14 14 L 20 14"
            stroke="#93c5fd"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 24 20 L 18 20 L 14 14 L 8 14"
            stroke="#60a5fa"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Nodos de soldadura de control */}
          <circle cx="4" cy="8" r="2" fill="#38bdf8" />
          <circle cx="24" cy="20" r="2" fill="#38bdf8" />
          {/* Microchip central / Rayo dinámico */}
          <polygon
            points="14,4 10,13 15,13 13,24 19,12 14,12"
            fill="#ffffff"
            className="drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]"
          />
        </svg>
      </div>

      {/* Tipografía de Marca */}
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-tight text-slate-900 font-sans">
              BARU
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
              PLC
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5 font-sans">
            SIMULATOR
          </span>
        </div>
      )}
    </div>
  );
};
