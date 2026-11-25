import React, { useId } from 'react';

interface Props {
  className?: string;
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<Props> = ({
  className = '',
  collapsed = false,
  size = 'sm',
  theme = 'light',
}) => {
  const uid = useId().replace(/:/g, '');
  const isHero = size === 'hero';
  const isLg = size === 'lg';
  const isMd = size === 'md';
  const isDarkTheme = theme === 'dark';

  // Dimensiones del contenedor del emblema según tamaño
  const emblemContainerClass = isHero
    ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-2 border-cyan-400/60 shadow-[0_0_40px_-8px_rgba(34,211,238,0.55)]'
    : isLg
      ? 'w-12 h-12 rounded-xl p-1.5 border-cyan-400/50 shadow-lg shadow-cyan-950/50'
      : isMd
        ? 'w-9 h-9 rounded-lg p-1 border-cyan-500/50 shadow-md shadow-cyan-900/30'
        : 'w-8 h-8 rounded-lg p-1 border-cyan-500/50 shadow-sm shadow-cyan-900/30';

  const gapClass = isHero ? 'gap-4 sm:gap-5' : isLg ? 'gap-3' : 'gap-2.5';

  // Tipografía adaptada a tema claro / oscuro
  const primaryTextColor = isDarkTheme ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex items-center ${gapClass} select-none shrink-0 ${className}`}>
      {/* Emblema Vectorial PLC Industrial de Alta Definición */}
      <div
        className={`relative flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 border group cursor-default transition-transform duration-300 hover:scale-105 ${emblemContainerClass}`}
      >
        {/* Halo luminoso exterior */}
        {isHero ? (
          <>
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-cyan-500/30 via-sky-400/20 to-indigo-500/30 blur-xl opacity-80 pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-sm pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 rounded-lg bg-cyan-500/10 blur-sm pointer-events-none" />
        )}

        {isHero || isLg ? (
          /* Emblema CPU/PLC Ultra-Detallado (Hero & Large) */
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="w-full h-full relative z-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`chassis-${uid}`} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="45%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>
              <linearGradient id={`bevel-${uid}`} x1="8" y1="7" x2="56" y2="57" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id={`pin-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id={`oled-${uid}`} x1="12" y1="22" x2="52" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#050914" />
                <stop offset="100%" stopColor="#0b1528" />
              </linearGradient>
              <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Arreglo superior de pines y bornas de entrada digital I0.0 - I0.5 */}
            {[11, 18.5, 26, 33.5, 41, 48.5].map((x) => (
              <g key={`top-pin-${x}`}>
                <rect x={x} y="2" width="4.5" height="5" rx="0.9" fill={`url(#pin-${uid})`} />
                <rect x={x + 1} y="2.5" width="2.5" height="1.2" rx="0.4" fill="#e0f2fe" fillOpacity="0.75" />
              </g>
            ))}

            {/* Chasis principal con bisel metálico multicapa */}
            <rect
              x="6"
              y="7"
              width="52"
              height="50"
              rx="6"
              fill={`url(#chassis-${uid})`}
              stroke={`url(#bevel-${uid})`}
              strokeWidth="1.6"
            />
            <rect
              x="8.5"
              y="9.5"
              width="47"
              height="45"
              rx="4.2"
              stroke="#475569"
              strokeOpacity="0.45"
              strokeWidth="0.75"
            />

            {/* Micro-tornillos industriales en las 4 esquinas */}
            {[
              [11.5, 12.5],
              [52.5, 12.5],
              [11.5, 51.5],
              [52.5, 51.5],
            ].map(([cx, cy], idx) => (
              <g key={`screw-${idx}`}>
                <circle cx={cx} cy={cy} r="1.7" fill="#0f172a" stroke="#64748b" strokeWidth="0.7" />
                <line
                  x1={cx - 0.9}
                  y1={cy - 0.5}
                  x2={cx + 0.9}
                  y2={cy + 0.5}
                  stroke="#94a3b8"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* Pistas PCB de bus lógico de alta densidad */}
            <path
              d="M 11 19 L 19 19 L 22 22.5 L 28 22.5 M 53 19 L 45 19 L 42 22.5 L 36 22.5"
              stroke="#0284c7"
              strokeOpacity="0.6"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d="M 11 47 L 18 47 L 21 43.5 L 27 43.5 M 53 47 L 46 47 L 43 43.5 L 37 43.5"
              stroke="#0284c7"
              strokeOpacity="0.6"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="11" cy="19" r="1" fill="#38bdf8" fillOpacity="0.7" />
            <circle cx="53" cy="19" r="1" fill="#38bdf8" fillOpacity="0.7" />
            <circle cx="11" cy="47" r="1" fill="#38bdf8" fillOpacity="0.7" />
            <circle cx="53" cy="47" r="1" fill="#38bdf8" fillOpacity="0.7" />

            {/* Indicadores LED de diagnóstico con halo (PWR, RUN, COM) */}
            {/* PWR Verde */}
            <circle cx="19" cy="15" r="3.4" fill="#22c55e" fillOpacity="0.2" />
            <circle cx="19" cy="15" r="1.8" fill="#22c55e" filter={`url(#glow-${uid})`} />
            <circle cx="18.5" cy="14.5" r="0.6" fill="#dcfce7" />
            {/* RUN Cian */}
            <circle cx="28" cy="15" r="3.4" fill="#38bdf8" fillOpacity="0.22" />
            <circle cx="28" cy="15" r="1.8" fill="#38bdf8" filter={`url(#glow-${uid})`} />
            <circle cx="27.5" cy="14.5" r="0.6" fill="#e0f2fe" />
            {/* COM Ámbar */}
            <circle cx="37" cy="15" r="3.4" fill="#f59e0b" fillOpacity="0.18" />
            <circle cx="37" cy="15" r="1.8" fill="#f59e0b" />
            <circle cx="36.5" cy="14.5" r="0.6" fill="#fef3c7" />

            {/* Etiqueta micro S7-CPU */}
            <rect x="42.5" y="13" width="7.5" height="4" rx="1" fill="#0f172a" stroke="#334155" strokeWidth="0.6" />
            <line x1="44.2" y1="15" x2="48.3" y2="15" stroke="#38bdf8" strokeWidth="0.9" strokeLinecap="round" />

            {/* Ventana OLED del núcleo CPU con rejilla y pulso eléctrico cian */}
            <rect
              x="12.5"
              y="22.5"
              width="39"
              height="19.5"
              rx="3.2"
              fill={`url(#oled-${uid})`}
              stroke="#0ea5e9"
              strokeOpacity="0.75"
              strokeWidth="1"
            />
            {/* Líneas sutiles de retícula OLED */}
            <line x1="13" y1="32.25" x2="51" y2="32.25" stroke="#0c4a6e" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
            <line x1="32" y1="23" x2="32" y2="41.5" stroke="#0c4a6e" strokeWidth="0.5" strokeDasharray="1.5 1.5" />

            {/* Pulso de onda eléctrica cian brillante */}
            <path
              d="M 15.5 32.5 L 22.5 32.5 L 25.5 26 L 29.5 38.5 L 33.5 25 L 37 35.5 L 39.5 32.5 L 48.5 32.5"
              stroke="#22d3ee"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${uid})`}
            />
            {/* Nodo de pico eléctrico */}
            <circle cx="33.5" cy="25" r="1.8" fill="#ffffff" filter={`url(#glow-${uid})`} />

            {/* Micro-puerto Profinet / Bus inferior interno */}
            <rect x="25" y="45.5" width="14" height="5" rx="1" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
            <line x1="28" y1="47.5" x2="28" y2="49" stroke="#f59e0b" strokeWidth="0.9" />
            <line x1="30.7" y1="47.5" x2="30.7" y2="49" stroke="#f59e0b" strokeWidth="0.9" />
            <line x1="33.3" y1="47.5" x2="33.3" y2="49" stroke="#f59e0b" strokeWidth="0.9" />
            <line x1="36" y1="47.5" x2="36" y2="49" stroke="#f59e0b" strokeWidth="0.9" />

            {/* Arreglo inferior de pines y bornas de salida Q0.0 - Q0.5 */}
            {[11, 18.5, 26, 33.5, 41, 48.5].map((x) => (
              <g key={`bot-pin-${x}`}>
                <rect x={x} y="57" width="4.5" height="5" rx="0.9" fill={`url(#pin-${uid})`} />
                <rect x={x + 1} y="59.8" width="2.5" height="1.2" rx="0.4" fill="#082f49" fillOpacity="0.65" />
              </g>
            ))}
          </svg>
        ) : (
          /* Emblema Compacto de Alta Nitidez (sm & md para TinkerHeader / Navbar) */
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
        )}
      </div>

      {/* Tipografía de Marca */}
      {!collapsed && (
        isHero ? (
          <div className="flex flex-col items-start gap-1.5 leading-none">
            <span className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(34,211,238,0.2)]">
              BARU STUDIO
            </span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold font-mono tracking-[0.14em] uppercase bg-slate-900/90 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              CADe_SIMU V4.2 · SIEMENS TIA S7-1200
            </span>
          </div>
        ) : isLg ? (
          <div className="flex flex-col items-start gap-1 leading-none">
            <span className={`font-display text-xl font-extrabold tracking-tight ${primaryTextColor}`}>
              BARU STUDIO
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white shadow-sm">
              CADe_SIMU · TIA S7-1200
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`text-[15px] font-black tracking-tight font-sans ${primaryTextColor}`}>
              BARU
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold font-mono tracking-wider uppercase bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white shadow-sm">
              PLC SIMULATOR
            </span>
          </div>
        )
      )}
    </div>
  );
};
