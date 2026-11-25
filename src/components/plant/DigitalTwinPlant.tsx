import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { CircuitDocument } from '../../types/circuit';
import { Play, Square, RotateCcw, Cpu } from 'lucide-react';

interface Props {
  simulationState: SimulationState;
  document?: CircuitDocument;
  onPressButton: (buttonTag: string, isPressed: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  embeddedMode?: boolean;
}

type PlantMode = 'conveyor' | 'tank' | 'pneumatic';

export const DigitalTwinPlant: React.FC<Props> = ({
  simulationState,
  document,
  onPressButton,
  isOpen,
  onClose,
  embeddedMode = false
}) => {
  const [boxPos, setBoxPos] = useState<number>(10);
  const [processedBoxes, setProcessedBoxes] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [plantMode, setPlantMode] = useState<PlantMode>('conveyor');
  const [tankLevel, setTankLevel] = useState<number>(25);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [pneumaticCycles, setPneumaticCycles] = useState<number>(0);
  const wasAtEndRef = useRef<boolean>(false);

  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detectar modo neumático o tanque cuando cambia el circuito cargado
  useEffect(() => {
    if (!document) return;
    const hasCylinder = document.components.some(c => c.type === 'pneumatic_cylinder_da');
    const titleLower = (document.titleBlock?.title || '').toLowerCase();
    if (hasCylinder) {
      setPlantMode('pneumatic');
    } else if (titleLower.includes('tanque') || titleLower.includes('bomba')) {
      setPlantMode('tank');
    } else {
      setPlantMode('conveyor');
    }
  }, [document?.titleBlock?.title, document?.components.length]);

  const isMotorRunning =
    simulationState.mode === 'running' &&
    (simulationState.activeCoils.has('-KM1') ||
      simulationState.activeCoils.has('-KM2') ||
      simulationState.activeCoils.has('PLC:%Q0.0') ||
      Array.from(simulationState.motorStates.values()).some(m => m.rpm > 40 && m.targetRpm > 0));

  // Estado del primer cilindro neumático (si existe en circuito o demo)
  const firstPneumaticEntry = simulationState.pneumaticStates
    ? Array.from(simulationState.pneumaticStates.values())[0]
    : undefined;
  const pistonPos = firstPneumaticEntry?.position ?? 0;
  const reedA0 = firstPneumaticEntry ? firstPneumaticEntry.atStart : true;
  const reedA1 = firstPneumaticEntry ? firstPneumaticEntry.atEnd : false;
  const y1Active =
    simulationState.mode === 'running' &&
    (simulationState.activeCoils.has('Y1') ||
      simulationState.activeCoils.has('-A:Y1') ||
      simulationState.activeCoils.has('PLC:%Q0.2'));
  const y2Active =
    simulationState.mode === 'running' &&
    (simulationState.activeCoils.has('Y2') ||
      simulationState.activeCoils.has('-A:Y2') ||
      simulationState.activeCoils.has('PLC:%Q0.3'));

  useEffect(() => {
    if (reedA1 && !wasAtEndRef.current) {
      wasAtEndRef.current = true;
      setPneumaticCycles(c => c + 1);
    } else if (!reedA1 && reedA0) {
      wasAtEndRef.current = false;
    }
  }, [reedA1, reedA0]);

  // Animación del proceso físico (cinta / tanque) a ~40 fps
  useEffect(() => {
    if (!isMotorRunning) return;

    const interval = setInterval(() => {
      setBoxPos(prev => {
        const next = prev + 0.5;
        const inSensorRange = next >= 58 && next <= 72;
        setSensorActive(inSensorRange);
        if (next >= 95) {
          setProcessedBoxes(b => b + 1);
          return 5;
        }
        return next;
      });

      setTankLevel(prev => {
        if (prev >= 95) return 95;
        return prev + 0.3;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isMotorRunning]);

  const handleStartPress = (isPressed: boolean) => {
    if (isPressed) {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      onPressButton('btn_start', true);
    } else {
      startTimerRef.current = setTimeout(() => {
        onPressButton('btn_start', false);
      }, 250);
    }
  };

  const handleStartClick = () => {
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    onPressButton('btn_start', true);
    startTimerRef.current = setTimeout(() => {
      onPressButton('btn_start', false);
    }, 300);
  };

  const handleStopPress = (isPressed: boolean) => {
    if (isPressed) {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      onPressButton('btn_stop', true);
    } else {
      stopTimerRef.current = setTimeout(() => {
        onPressButton('btn_stop', false);
      }, 250);
    }
  };

  const handleStopClick = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    onPressButton('btn_stop', true);
    stopTimerRef.current = setTimeout(() => {
      onPressButton('btn_stop', false);
    }, 350);
  };

  if (!isOpen && !embeddedMode) return null;

  const boxX = 55 + ((boxPos - 5) / 90) * 220;
  const rodExtendPx = Math.round(pistonPos * 92);

  const wrapperClass = embeddedMode
    ? 'w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 select-none'
    : `absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-200 ${
        isMinimized ? 'w-72 shadow-lg' : 'w-[420px]'
      }`;

  const plantBadge =
    plantMode === 'conveyor' ? 'CINTA' : plantMode === 'tank' ? 'TANQUE' : 'NEUMÁTICA';

  return (
    <div className={wrapperClass}>
      {/* Cabecera */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white cursor-pointer"
        onClick={() => !embeddedMode && isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isMotorRunning || y1Active || y2Active ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'
            }`}
          />
          <h3 className="text-xs font-bold font-sans tracking-wide flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Gemelo Digital Planta 2D{' '}
              {!embeddedMode && isMinimized && (isMotorRunning ? '• EN MARCHA' : '• PARADO')}
            </span>
          </h3>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 font-bold">
            {plantBadge}
          </span>
        </div>

        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {(!isMinimized || embeddedMode) && (
            <div className="flex items-center bg-slate-700/80 rounded-lg p-0.5 text-[10px] font-bold">
              {(['conveyor', 'tank', 'pneumatic'] as PlantMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setPlantMode(m)}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    plantMode === m ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {m === 'conveyor' ? 'Cinta' : m === 'tank' ? 'Tanque' : 'Neumática'}
                </button>
              ))}
            </div>
          )}
          {!embeddedMode && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 text-xs font-mono font-bold cursor-pointer"
              >
                {isMinimized ? '□' : '—'}
              </button>
              <button
                onClick={onClose}
                title="Cerrar"
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {(!isMinimized || embeddedMode) && (
        <>
          {/* Área SVG 2D */}
          <div
            className={`relative bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200 border-b border-slate-200 overflow-hidden flex items-center justify-center p-3 ${
              embeddedMode ? 'h-80' : 'h-48'
            }`}
          >
            {plantMode === 'conveyor' && (
              <svg className="w-full h-full" viewBox="0 0 360 170">
                <defs>
                  <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="motorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isMotorRunning ? '#0284c7' : '#64748b'} />
                    <stop offset="100%" stopColor={isMotorRunning ? '#0369a1' : '#334155'} />
                  </linearGradient>
                </defs>

                <line x1="0" y1="28" x2="360" y2="28" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="20" y1="156" x2="345" y2="156" stroke="#94a3b8" strokeWidth="2" />

                {/* Baliza */}
                <g transform="translate(24, 20)">
                  <line x1="6" y1="36" x2="6" y2="136" stroke="#475569" strokeWidth="2" />
                  <rect x="0" y="0" width="12" height="36" rx="2" fill="#0f172a" />
                  <circle cx="6" cy="6" r="4" fill={!isMotorRunning ? '#ef4444' : '#450a0a'} />
                  <circle cx="6" cy="18" r="4" fill={sensorActive ? '#f59e0b' : '#451a03'} />
                  <circle cx="6" cy="30" r="4" fill={isMotorRunning ? '#10b981' : '#064e3b'} />
                </g>

                {/* Patas */}
                <rect x="73" y="112" width="6" height="44" fill="#334155" rx="1" />
                <rect x="172" y="112" width="6" height="44" fill="#334155" rx="1" />
                <rect x="272" y="112" width="6" height="44" fill="#334155" rx="1" />

                {/* Banda */}
                <rect x="46" y="106" width="258" height="10" rx="2" fill="url(#frameGrad)" stroke="#0f172a" strokeWidth="1" />
                <path
                  d="M 55,102 L 295,102 A 9,9 0 0,1 295,120 L 55,120 A 9,9 0 0,1 55,102 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {[55, 85, 125, 165, 205, 245, 295].map(rx => (
                  <g key={rx} transform={`translate(${rx}, 111)`}>
                    <circle cx="0" cy="0" r="6" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                    <g>
                      {isMotorRunning && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 0 0"
                          to="360 0 0"
                          dur="0.6s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-4" y1="0" x2="4" y2="0" stroke="#0f172a" strokeWidth="1.2" />
                      <line x1="0" y1="-4" x2="0" y2="4" stroke="#0f172a" strokeWidth="1.2" />
                    </g>
                  </g>
                ))}

                {/* Sensor B1 */}
                <g transform="translate(200, 56)">
                  <line x1="4" y1="0" x2="4" y2="12" stroke="#64748b" strokeWidth="2" />
                  <rect x="0" y="12" width="8" height="18" rx="1.5" fill="#0f172a" />
                  <circle cx="4" cy="18" r="2" fill={sensorActive ? '#f59e0b' : '#475569'} />
                  <line
                    x1="4"
                    y1="30"
                    x2="4"
                    y2="46"
                    stroke={sensorActive ? '#f59e0b' : '#ef4444'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text x="4" y="-2" textAnchor="middle" fontSize="7" fontWeight="bold" fill={sensorActive ? '#d97706' : '#64748b'}>
                    -B1
                  </text>
                </g>

                {/* Caja */}
                <g transform={`translate(${boxX}, 76)`}>
                  <rect x="0" y="0" width="28" height="25" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
                  <rect x="6" y="5" width="16" height="6" fill="#fef3c7" rx="1" />
                  <text x="14" y="10" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#78350f">
                    BARU
                  </text>
                </g>

                {/* Motor */}
                <g transform="translate(305, 78)">
                  <rect x="0" y="0" width="34" height="28" rx="2.5" fill="url(#motorGrad)" stroke="#0f172a" strokeWidth="1.5" />
                  <g transform="translate(17, 14)">
                    <circle cx="0" cy="0" r="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                    <text x="0" y="2.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">
                      M
                    </text>
                  </g>
                  <text x="17" y="38" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                    -KM1
                  </text>
                </g>
              </svg>
            )}

            {plantMode === 'tank' && (
              <svg className="w-full h-full" viewBox="0 0 360 170">
                <g transform="translate(110, 20)">
                  <rect x="0" y="0" width="140" height="120" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
                  <rect
                    x="2"
                    y={118 - tankLevel * 1.15}
                    width="136"
                    height={tankLevel * 1.15}
                    rx="6"
                    fill="#38bdf8"
                    fillOpacity={0.75}
                    className="transition-all duration-300"
                  />
                  <line x1="125" y1="30" x2="135" y2="30" stroke="#0f172a" strokeWidth="1" />
                  <text x="110" y="33" fontSize="8" fill="#475569" fontWeight="bold">MAX</text>
                  <line x1="125" y1="90" x2="135" y2="90" stroke="#0f172a" strokeWidth="1" />
                  <text x="110" y="93" fontSize="8" fill="#475569" fontWeight="bold">MIN</text>
                  <text x="70" y="65" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0369a1" fontFamily="monospace">
                    {Math.round(tankLevel)}%
                  </text>
                </g>
                <g transform="translate(55, 105)">
                  <circle cx="0" cy="0" r="22" fill={isMotorRunning ? '#0284c7' : '#64748b'} stroke="#0f172a" strokeWidth="2" />
                  <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">
                    BOMBA
                  </text>
                  <text x="0" y="36" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                    -KM1
                  </text>
                </g>
                <path d="M 77,105 L 110,105" stroke="#64748b" strokeWidth="6" fill="none" />
              </svg>
            )}

            {plantMode === 'pneumatic' && (
              <svg className="w-full h-full" viewBox="0 0 360 170">
                {/* Banco neumático */}
                <line x1="20" y1="145" x2="340" y2="145" stroke="#94a3b8" strokeWidth="2" />

                {/* Unidad FRL de aire comprimido */}
                <g transform="translate(26, 75)">
                  <rect x="0" y="0" width="26" height="44" rx="4" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="13" cy="14" r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                  <line x1="13" y1="14" x2="17" y2="10" stroke="#dc2626" strokeWidth="1.5" />
                  <text x="13" y="35" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0369a1">
                    6 BAR
                  </text>
                </g>

                {/* Tuberías aire Y1 / Y2 */}
                <path
                  d="M 52,96 L 78,96 L 78,56 L 106,56"
                  fill="none"
                  stroke={y1Active ? '#0284c7' : '#94a3b8'}
                  strokeWidth="2.5"
                />
                <path
                  d="M 52,108 L 88,108 L 88,68 L 194,68"
                  fill="none"
                  stroke={y2Active ? '#f59e0b' : '#94a3b8'}
                  strokeWidth="2.5"
                />

                {/* Cilindro Doble Efecto */}
                <g transform="translate(100, 38)">
                  {/* Cuerpo camisa aluminio */}
                  <rect x="0" y="10" width="102" height="36" rx="3" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
                  {/* Cámara izquierda presurizada */}
                  <rect
                    x="4"
                    y="14"
                    width={Math.max(4, rodExtendPx * 0.85)}
                    height="28"
                    fill={y1Active ? '#38bdf8' : '#e2e8f0'}
                    fillOpacity="0.55"
                  />
                  {/* Émbolo interno */}
                  <rect
                    x={6 + rodExtendPx * 0.85}
                    y="12"
                    width="10"
                    height="32"
                    fill="#334155"
                  />
                  {/* Vástago cromado saliendo */}
                  <rect
                    x={16 + rodExtendPx * 0.85}
                    y="23"
                    width={96}
                    height="10"
                    rx="1.5"
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                  {/* Empujador / Pieza de trabajo */}
                  <rect
                    x={110 + rodExtendPx * 0.85}
                    y="17"
                    width="14"
                    height="22"
                    rx="2"
                    fill="#0284c7"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />

                  {/* Sensores Reed Magnéticos a0 y a1 */}
                  <g transform="translate(6, -2)">
                    <rect x="0" y="0" width="14" height="10" rx="2" fill={reedA0 ? '#10b981' : '#475569'} />
                    <text x="7" y="-3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={reedA0 ? '#059669' : '#64748b'}>
                      a0
                    </text>
                  </g>
                  <g transform="translate(82, -2)">
                    <rect x="0" y="0" width="14" height="10" rx="2" fill={reedA1 ? '#10b981' : '#475569'} />
                    <text x="7" y="-3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={reedA1 ? '#059669' : '#64748b'}>
                      a1
                    </text>
                  </g>
                </g>

                {/* Bloque Válvula 5/2 Biestable */}
                <g transform="translate(105, 104)">
                  <rect x="0" y="0" width="88" height="28" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                  <rect x="4" y="4" width="18" height="20" rx="2" fill={y1Active ? '#0284c7' : '#334155'} />
                  <text x="13" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">Y1</text>
                  <text x="44" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#cbd5e1">5/2</text>
                  <rect x="66" y="4" width="18" height="20" rx="2" fill={y2Active ? '#f59e0b' : '#334155'} />
                  <text x="75" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">Y2</text>
                </g>

                {/* Tope de pieza derecha */}
                <rect x="305" y="48" width="14" height="96" rx="2" fill="#475569" />
              </svg>
            )}
          </div>

          {/* Telemetría y Controles */}
          <div className="p-3.5 bg-slate-50 space-y-3">
            {plantMode === 'pneumatic' ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Vástago A</div>
                  <div className="text-xs font-mono font-bold text-sky-700">
                    {Math.round(pistonPos * 100)}%
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Finales a0 / a1</div>
                  <div className="text-xs font-mono font-bold text-emerald-700">
                    {reedA0 ? 'a0=ON' : 'a0=0'} / {reedA1 ? 'a1=ON' : 'a1=0'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Bobinas 5/2</div>
                  <div className="text-xs font-mono font-bold text-amber-700">
                    Y1:{y1Active ? '1' : '0'} Y2:{y2Active ? '1' : '0'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Ciclos A+/A-</div>
                  <div className="text-xs font-mono font-bold text-slate-900">{pneumaticCycles}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Motor (-KM1)</div>
                  <div className={`text-xs font-mono font-bold ${isMotorRunning ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isMotorRunning ? 'MARCHA' : 'PARADO'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Sensor -B1</div>
                  <div className={`text-xs font-mono font-bold ${sensorActive ? 'text-amber-600' : 'text-slate-400'}`}>
                    {sensorActive ? 'DETECTADO' : 'LIBRE'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Piezas OK</div>
                  <div className="text-xs font-mono font-bold text-sky-700">{processedBoxes}</div>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-slate-200 flex items-center gap-2">
              <button
                onClick={handleStartClick}
                onMouseDown={() => handleStartPress(true)}
                onMouseUp={() => handleStartPress(false)}
                onMouseLeave={() => handleStartPress(false)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>I — Marcha (-S1)</span>
              </button>

              <button
                onClick={handleStopClick}
                onMouseDown={() => handleStopPress(true)}
                onMouseUp={() => handleStopPress(false)}
                onMouseLeave={() => handleStopPress(false)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>O — Paro (-S0)</span>
              </button>

              <button
                onClick={() => {
                  setBoxPos(5);
                  setProcessedBoxes(0);
                  setTankLevel(20);
                  setPneumaticCycles(0);
                }}
                title="Reiniciar Contadores"
                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
