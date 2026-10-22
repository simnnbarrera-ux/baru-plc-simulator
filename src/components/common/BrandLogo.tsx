import React from 'react';

interface Props {
  className?: string;
  collapsed?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ className = '', collapsed = false }) => {
  return (
    <div className={`flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      {/* Emblema Vectorial PLC Industrial de Alta Definición */}
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 p-1 border border-cyan-500/50 shadow-sm shadow-cyan-900/30 group cursor-default transition-transform hover:scale-105">
        {/* Halo sutil de fondo */}
        <div className="absolute inset-0 rounded-lg bg-cyan-500/10 blur-xs pointer-events-none" />

        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full relative z-10" xmlns="http://www.w3.org/2000/svg">
          {/* Bornas de conexión superiores (I/O digitales) */}
          <rect x="7" y="1.5" width="3" height="2" rx="0.5" fill="#38bdf8" />
          <rect x="14.5" y="1.5" width="3" height="2" rx="0.5" fill="#38bdf8" />
          <rect x="22" y="1.5" width="3" height="2" rx="0.5" fill="#38bdf8" />

          {/* Chasis del módulo CPU */}
          <rect
            x="3"
            y="3.5"
            width="26"
            height="25"
            rx="3"
            fill="#1e293b"
            stroke="#0ea5e9"
            strokeWidth="1.2"
          />

          {/* Pistas de bus lógico interno */}
          <path
            d="M 6 9.5 L 11 9.5 L 13 12.5 L 19 12.5"
            stroke="#0284c7"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <path
            d="M 26 22.5 L 21 22.5 L 19 19.5 L 13 19.5"
            stroke="#0284c7"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Indicadores LED industriales (PWR: verde, RUN: cian, FLT/COM: ámbar) */}
          <circle cx="7" cy="8" r="1.3" fill="#22c55e" />
          <circle cx="7" cy="8" r="2.2" stroke="#22c55e" strokeWidth="0.5" strokeOpacity="0.4" />
          <circle cx="11.5" cy="8" r="1.3" fill="#38bdf8" />
          <circle cx="16" cy="8" r="1.3" fill="#f59e0b" />

          {/* Núcleo CPU / Ventana de visualización con pulso de onda eléctrica */}
          <rect x="6.5" y="11.5" width="19" height="9" rx="2" fill="#090d16" stroke="#0369a1" strokeWidth="0.8" />
          <path
            d="M 8.5 16 L 11.5 16 L 13 13.5 L 15 18.5 L 17 14 L 18.5 16 L 23.5 16"
            stroke="#38bdf8"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="1.1" fill="#ffffff" className="drop-shadow-[0_0_2px_rgba(56,189,248,0.9)]" />

          {/* Bornas de conexión inferiores (Salidas de Relé/Transistor) */}
          <rect x="7" y="28.5" width="3" height="2" rx="0.5" fill="#38bdf8" />
          <rect x="14.5" y="28.5" width="3" height="2" rx="0.5" fill="#38bdf8" />
          <rect x="22" y="28.5" width="3" height="2" rx="0.5" fill="#38bdf8" />
        </svg>
      </div>

      {/* Tipografía de Marca */}
      {!collapsed && (
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[15px] font-black tracking-tight text-slate-900 font-sans">
            BARU
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold font-mono tracking-wider uppercase bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white shadow-2xs">
            PLC SIMULATOR
          </span>
        </div>
      )}
    </div>
  );
};
