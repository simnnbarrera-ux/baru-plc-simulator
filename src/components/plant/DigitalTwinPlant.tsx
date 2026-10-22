import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Sliders, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Activity,
  Layers,
  ChevronRight,
  PackageCheck
} from 'lucide-react';

interface Props {
  simulationState: SimulationState;
  onPressButton: (buttonTag: string, isPressed: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DigitalTwinPlant: React.FC<Props> = ({
  simulationState,
  onPressButton,
  isOpen,
  onClose
}) => {
  // Posición de la caja en la cinta (0 a 100%)
  const [boxPos, setBoxPos] = useState<number>(10);
  const [processedBoxes, setProcessedBoxes] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [plantMode, setPlantMode] = useState<'conveyor' | 'tank'>('conveyor');
  const [tankLevel, setTankLevel] = useState<number>(25); // % nivel de agua
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Verificar si el motor o contactor -KM1 está activo en la simulación
  const isMotorRunning = simulationState.activeCoils.has('-KM1') || 
    Array.from(simulationState.motorStates.values()).some(m => m.rpm > 100);

  const isAlarmActive = simulationState.pilotLights.get('pilot_run')?.color === 'red' ||
    simulationState.activeCoils.has('-F1') ||
    simulationState.activeCoils.has('ALARM');

  // Animación del proceso físico a 60 fps
  useEffect(() => {
    if (!isMotorRunning) return;

    const interval = setInterval(() => {
      // Mover caja en cinta transportadora
      setBoxPos(prev => {
        const next = prev + 0.45;
        // Sensor óptico en el 65% de la cinta
        const inSensorRange = next >= 60 && next <= 70;
        setSensorActive(inSensorRange);

        if (next >= 95) {
          setProcessedBoxes(b => b + 1);
          return 5; // Reaparece nueva caja
        }
        return next;
      });

      // Llenado de tanque si el modo es tanque
      setTankLevel(prev => {
        if (prev >= 95) return 95;
        return prev + 0.3;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isMotorRunning]);

  if (!isOpen) return null;

  return (
    <div className={`absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-200 ${
      isMinimized ? 'w-72 shadow-lg' : 'w-96'
    }`}>
      {/* Cabecera del Gemelo Digital */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isMotorRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
          <h3 className="text-xs font-bold font-sans tracking-wide">
            Planta 2D {isMinimized && (isMotorRunning ? '• EN MARCHA' : '• PARADO')}
          </h3>
          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-400/30">
            {plantMode === 'conveyor' ? 'CINTA' : 'TANQUE'}
          </span>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {!isMinimized && (
            <button
              onClick={() => setPlantMode(plantMode === 'conveyor' ? 'tank' : 'conveyor')}
              title="Alternar Proceso Industrial (Cinta / Tanque)"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              {plantMode === 'conveyor' ? 'Tanque' : 'Cinta'}
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expandir panel de planta" : "Minimizar panel"}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors text-xs font-mono font-bold"
          >
            {isMinimized ? "□" : "—"}
          </button>
          <button
            onClick={onClose}
            title="Cerrar panel de planta"
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>

      {/* ÁREA DE ANIMACIÓN GRÁFICA VECTORIAL 2D */}
      <div className="relative h-48 bg-gradient-to-b from-slate-100 to-slate-200 border-b border-slate-300 overflow-hidden flex items-center justify-center p-2">
        {plantMode === 'conveyor' ? (
          <svg className="w-full h-full" viewBox="0 0 360 170">
            {/* Fondo de nave industrial con vigas */}
            <line x1="0" y1="35" x2="360" y2="35" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6 4" />
            <line x1="120" y1="0" x2="120" y2="120" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="240" y1="0" x2="240" y2="120" stroke="#cbd5e1" strokeWidth="1" />

            {/* Baliza luminosa industrial de 3 colores */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="12" height="36" rx="2" fill="#1e293b" />
              {/* Luz Roja */}
              <circle cx="6" cy="6" r="4" fill={!isMotorRunning ? "#ef4444" : "#450a0a"} className={!isMotorRunning ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" : ""} />
              {/* Luz Ámbar */}
              <circle cx="6" cy="18" r="4" fill={sensorActive ? "#f59e0b" : "#451a03"} className={sensorActive ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse" : ""} />
              {/* Luz Verde */}
              <circle cx="6" cy="30" r="4" fill={isMotorRunning ? "#10b981" : "#064e3b"} className={isMotorRunning ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]" : ""} />
              <line x1="6" y1="36" x2="6" y2="55" stroke="#475569" strokeWidth="2" />
            </g>

            {/* Estructura de la cinta transportadora */}
            <rect x="30" y="110" width="300" height="12" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
            
            {/* Rodillos giratorios */}
            {[50, 100, 150, 200, 250, 300].map((rx, idx) => (
              <g key={idx}>
                <circle cx={rx} cy="116" r="6" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                <line
                  x1={rx - 4}
                  y1="116"
                  x2={rx + 4}
                  y2="116"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className={isMotorRunning ? "origin-center animate-spin" : ""}
                />
              </g>
            ))}

            {/* Patas de soporte de la mesa */}
            <line x1="50" y1="122" x2="50" y2="160" stroke="#475569" strokeWidth="3" />
            <line x1="180" y1="122" x2="180" y2="160" stroke="#475569" strokeWidth="3" />
            <line x1="310" y1="122" x2="310" y2="160" stroke="#475569" strokeWidth="3" />
            <line x1="30" y1="160" x2="330" y2="160" stroke="#94a3b8" strokeWidth="2" />

            {/* Motor trifásico acoplado (-KM1) */}
            <g transform="translate(305, 78)">
              <rect x="0" y="0" width="30" height="32" rx="3" fill={isMotorRunning ? "#0284c7" : "#475569"} stroke="#0f172a" strokeWidth="1.5" className="transition-colors" />
              <circle cx="15" cy="16" r="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
              <text x="15" y="19" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">M</text>
              {isMotorRunning && (
                <circle cx="15" cy="16" r="12" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" className="animate-spin" />
              )}
              <text x="15" y="42" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0369a1">-KM1</text>
            </g>

            {/* Sensor fotoeléctrico réflex */}
            <g transform="translate(220, 68)">
              <rect x="0" y="0" width="8" height="24" rx="1" fill="#0f172a" />
              <circle cx="4" cy="6" r="2.5" fill={sensorActive ? "#f59e0b" : "#475569"} />
              <line x1="4" y1="24" x2="4" y2="42" stroke="#64748b" strokeWidth="1.5" />
              {/* Haz de luz de detección */}
              <line
                x1="4"
                y1="6"
                x2="4"
                y2="40"
                stroke={sensorActive ? "#f59e0b" : "#ef4444"}
                strokeWidth="1.5"
                strokeDasharray="2 2"
                strokeOpacity={sensorActive ? 1 : 0.4}
              />
              <text x="4" y="-2" textAnchor="middle" fontSize="7" fontWeight="bold" fill={sensorActive ? "#d97706" : "#64748b"}>B1</text>
            </g>

            {/* Caja industrial desplazándose por la cinta */}
            <g transform={`translate(${40 + (boxPos * 2.5)}, 82)`}>
              <rect x="0" y="0" width="28" height="26" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
              <line x1="0" y1="13" x2="28" y2="13" stroke="#92400e" strokeWidth="1" strokeDasharray="2 2" />
              <rect x="7" y="6" width="14" height="6" fill="#fef3c7" rx="1" />
              <text x="14" y="11" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#78350f">BARU</text>
            </g>
          </svg>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 360 170">
            {/* Tanque de Almacenamiento con nivel dinámico */}
            <g transform="translate(110, 20)">
              {/* Contenedor transparente */}
              <rect x="0" y="0" width="140" height="120" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
              {/* Agua con altura animada */}
              <rect
                x="2"
                y={118 - (tankLevel * 1.15)}
                width="136"
                height={tankLevel * 1.15}
                rx="6"
                fill="#38bdf8"
                fillOpacity={0.7}
                className="transition-all duration-300"
              />
              {/* Marcas de nivel */}
              <line x1="125" y1="30" x2="135" y2="30" stroke="#0f172a" strokeWidth="1" />
              <text x="110" y="33" fontSize="8" fill="#475569" fontWeight="bold">MAX</text>
              <line x1="125" y1="90" x2="135" y2="90" stroke="#0f172a" strokeWidth="1" />
              <text x="110" y="93" fontSize="8" fill="#475569" fontWeight="bold">MIN</text>
              <text x="70" y="65" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0369a1" fontFamily="monospace">
                {Math.round(tankLevel)}%
              </text>
            </g>

            {/* Bomba de impulsión accionada por KM1 */}
            <g transform="translate(28, 75)">
              <circle cx="25" cy="25" r="22" fill={isMotorRunning ? "#0284c7" : "#64748b"} stroke="#0f172a" strokeWidth="2" />
              <text x="25" y="29" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">BOMBA</text>
              {isMotorRunning && (
                <circle cx="25" cy="25" r="28" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 4" className="animate-spin" />
              )}
            </g>
          </svg>
        )}
      </div>

      {/* PANEL DE MANDO Y ESTADO DEL GEMELO DIGITAL */}
      <div className="p-3 bg-slate-50 space-y-2.5">
        {/* Fila de telemetría de planta */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-semibold">Motor (-KM1)</div>
            <div className={`text-xs font-mono font-bold ${isMotorRunning ? "text-emerald-600" : "text-slate-400"}`}>
              {isMotorRunning ? "MARCHA" : "PARADO"}
            </div>
          </div>

          <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-semibold">Sensor B1</div>
            <div className={`text-xs font-mono font-bold ${sensorActive ? "text-amber-600" : "text-slate-400"}`}>
              {sensorActive ? "DETECTADO" : "LIBRE"}
            </div>
          </div>

          <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-semibold">Piezas OK</div>
            <div className="text-xs font-mono font-bold text-blue-700">
              {processedBoxes}
            </div>
          </div>
        </div>

        {/* Botonera de control directo de planta */}
        <div className="pt-1 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onMouseDown={() => onPressButton('btn_start', true)}
            onMouseUp={() => onPressButton('btn_start', false)}
            title="Pulsar Marcha en Cuadro de Planta (-S1)"
            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>I (Marcha)</span>
          </button>

          <button
            onMouseDown={() => onPressButton('btn_stop', true)}
            onMouseUp={() => onPressButton('btn_stop', false)}
            title="Pulsar Parada en Cuadro de Planta (-S2)"
            className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>O (Parada)</span>
          </button>

          <button
            onClick={() => { setBoxPos(5); setProcessedBoxes(0); setTankLevel(15); }}
            title="Reiniciar Posición de Planta"
            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-medium text-center">
          Sincronizado bidireccionalmente con el esquema eléctrico y PLC
        </div>
      </div>
      </>
      )}
    </div>
  );
};
