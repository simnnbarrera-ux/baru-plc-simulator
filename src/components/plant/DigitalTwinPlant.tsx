import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Cpu
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
  // Posición de la caja en la cinta (5 a 95%)
  const [boxPos, setBoxPos] = useState<number>(10);
  const [processedBoxes, setProcessedBoxes] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [plantMode, setPlantMode] = useState<'conveyor' | 'tank'>('conveyor');
  const [tankLevel, setTankLevel] = useState<number>(25); // % nivel de agua
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const startTimerRef = useRef<any>(null);
  const stopTimerRef = useRef<any>(null);

  // El motor/planta está en marcha si el modo es running y el contactor KM1 o motor está activo
  const isMotorRunning = simulationState.mode === 'running' && (
    simulationState.activeCoils.has('-KM1') || 
    simulationState.activeCoils.has('-KM2') ||
    Array.from(simulationState.motorStates.values()).some(m => m.rpm > 40 && m.targetRpm > 0)
  );

  // Animación del proceso físico a ~40 fps
  useEffect(() => {
    if (!isMotorRunning) return;

    const interval = setInterval(() => {
      // Mover caja en cinta transportadora
      setBoxPos(prev => {
        const next = prev + 0.5;
        // Sensor óptico réflex ubicado en el ~65% de la cinta
        const inSensorRange = next >= 58 && next <= 72;
        setSensorActive(inSensorRange);

        if (next >= 95) {
          setProcessedBoxes(b => b + 1);
          return 5; // Reaparece nueva caja en el inicio
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

  // Manejadores robustos de pulsadores de marcha y parada
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

  if (!isOpen) return null;

  // Coordenadas calculadas para la posición de la caja
  // La cinta va de x=55 a x=295 (recorrido total de 240px)
  const boxX = 55 + ((boxPos - 5) / 90) * 220;

  return (
    <div className={`absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-200 ${
      isMinimized ? 'w-72 shadow-lg' : 'w-[400px]'
    }`}>
      {/* Cabecera del Gemelo Digital */}
      <div 
        className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white cursor-pointer" 
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isMotorRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
          <h3 className="text-xs font-bold font-sans tracking-wide flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Planta 2D {isMinimized && (isMotorRunning ? '• EN MARCHA' : '• PARADO')}</span>
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
        <div className="relative h-48 bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200 border-b border-slate-300 overflow-hidden flex items-center justify-center p-2">
          {plantMode === 'conveyor' ? (
            <svg className="w-full h-full" viewBox="0 0 360 170">
              <defs>
                {/* Gradiente para la viga estructural */}
                <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                {/* Gradiente para el motor eléctrico */}
                <linearGradient id="motorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isMotorRunning ? "#0284c7" : "#64748b"} />
                  <stop offset="100%" stopColor={isMotorRunning ? "#0369a1" : "#334155"} />
                </linearGradient>
              </defs>

              {/* Fondo de nave industrial con líneas arquitectónicas sutiles */}
              <line x1="0" y1="28" x2="360" y2="28" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="12" y1="0" x2="12" y2="156" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="348" y1="0" x2="348" y2="156" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Suelo de taller industrial con cota de nivel */}
              <line x1="20" y1="156" x2="345" y2="156" stroke="#94a3b8" strokeWidth="2" />
              <line x1="20" y1="160" x2="345" y2="160" stroke="#cbd5e1" strokeWidth="1" />

              {/* Baliza luminosa industrial (Andon Tower) */}
              <g transform="translate(24, 20)">
                {/* Mástil */}
                <line x1="6" y1="36" x2="6" y2="136" stroke="#475569" strokeWidth="2" />
                {/* Carcasa */}
                <rect x="0" y="0" width="12" height="36" rx="2" fill="#0f172a" />
                {/* Luz Roja (Parada) */}
                <circle 
                  cx="6" 
                  cy="6" 
                  r="4" 
                  fill={!isMotorRunning ? "#ef4444" : "#450a0a"} 
                  className={!isMotorRunning ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" : ""} 
                />
                {/* Luz Ámbar (Sensor detectado) */}
                <circle 
                  cx="6" 
                  cy="18" 
                  r="4" 
                  fill={sensorActive ? "#f59e0b" : "#451a03"} 
                  className={sensorActive ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" : ""} 
                />
                {/* Luz Verde (Marcha) */}
                <circle 
                  cx="6" 
                  cy="30" 
                  r="4" 
                  fill={isMotorRunning ? "#10b981" : "#064e3b"} 
                  className={isMotorRunning ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]" : ""} 
                />
              </g>

              {/* Patas y soporte de la mesa de transporte */}
              {/* Pata izquierda */}
              <rect x="73" y="112" width="6" height="44" fill="#334155" rx="1" />
              <rect x="68" y="152" width="16" height="4" fill="#1e293b" rx="1" />
              {/* Pata central */}
              <rect x="172" y="112" width="6" height="44" fill="#334155" rx="1" />
              <rect x="167" y="152" width="16" height="4" fill="#1e293b" rx="1" />
              {/* Pata derecha */}
              <rect x="272" y="112" width="6" height="44" fill="#334155" rx="1" />
              <rect x="267" y="152" width="16" height="4" fill="#1e293b" rx="1" />
              {/* Arriostramiento diagonal estructural */}
              <line x1="76" y1="140" x2="172" y2="122" stroke="#64748b" strokeWidth="1.5" />
              <line x1="178" y1="122" x2="272" y2="140" stroke="#64748b" strokeWidth="1.5" />

              {/* Chasis / bastidor de la cinta */}
              <rect x="46" y="106" width="258" height="10" rx="2" fill="url(#frameGrad)" stroke="#0f172a" strokeWidth="1" />

              {/* Banda de goma continua de la cinta transportadora */}
              <path
                d="M 55,102 L 295,102 A 9,9 0 0,1 295,120 L 55,120 A 9,9 0 0,1 55,102 Z"
                fill="#1e293b"
                stroke="#0f172a"
                strokeWidth="2"
              />

              {/* Rodillos giratorios intermedios - Con rotación matemática exacta en (0,0) */}
              {[85, 125, 165, 205, 245].map((rx) => (
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
                    <line x1="-4" y1="0" x2="4" y2="0" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="0" y1="-4" x2="0" y2="4" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                </g>
              ))}

              {/* Tambor motriz derecho (Drive Drum) */}
              <g transform="translate(295, 111)">
                <circle cx="0" cy="0" r="8" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />
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
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="0" y1="-5" x2="0" y2="5" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>

              {/* Tambor tensor izquierdo (Idler Drum) */}
              <g transform="translate(55, 111)">
                <circle cx="0" cy="0" r="8" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />
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
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="0" y1="-5" x2="0" y2="5" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </g>

              {/* Sensor fotoeléctrico réflex B1 */}
              <g transform="translate(200, 56)">
                {/* Soporte de montaje vertical */}
                <line x1="4" y1="0" x2="4" y2="12" stroke="#64748b" strokeWidth="2" />
                {/* Carcasa del sensor */}
                <rect x="0" y="12" width="8" height="18" rx="1.5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                {/* LED indicador de estado */}
                <circle cx="4" cy="18" r="2" fill={sensorActive ? "#f59e0b" : "#475569"} />
                {/* Haz de luz de detección hacia la cinta o la caja */}
                <line
                  x1="4"
                  y1="30"
                  x2="4"
                  y2={sensorActive ? 46 : 46}
                  stroke={sensorActive ? "#f59e0b" : "#ef4444"}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  strokeOpacity={sensorActive ? 1 : 0.45}
                />
                <text x="4" y="-2" textAnchor="middle" fontSize="7" fontWeight="bold" fill={sensorActive ? "#d97706" : "#64748b"}>
                  -B1
                </text>
              </g>

              {/* Caja industrial desplazándose sobre la superficie superior de la cinta (y=102) */}
              <g transform={`translate(${boxX}, 76)`}>
                {/* Sombra de apoyo */}
                <rect x="1" y="24" width="26" height="2" fill="#0f172a" opacity="0.25" rx="1" />
                {/* Caja de cartón corrugado */}
                <rect x="0" y="0" width="28" height="25" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
                {/* Cinta adhesiva central */}
                <line x1="0" y1="12" x2="28" y2="12" stroke="#92400e" strokeWidth="1.2" strokeDasharray="3 2" />
                {/* Etiqueta de expedición */}
                <rect x="6" y="5" width="16" height="6" fill="#fef3c7" rx="1" stroke="#b45309" strokeWidth="0.5" />
                <text x="14" y="10" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#78350f">
                  BARU
                </text>
              </g>

              {/* Motor trifásico -KM1 acoplado mecánicamente al tambor motriz */}
              <g transform="translate(305, 78)">
                {/* Carcasa y aletas del motor */}
                <rect x="0" y="0" width="34" height="28" rx="2.5" fill="url(#motorGrad)" stroke="#0f172a" strokeWidth="1.5" />
                {/* Aletas de refrigeración */}
                <line x1="5" y1="7" x2="29" y2="7" stroke="#0f172a" strokeWidth="0.8" opacity="0.6" />
                <line x1="5" y1="14" x2="29" y2="14" stroke="#0f172a" strokeWidth="0.8" opacity="0.6" />
                <line x1="5" y1="21" x2="29" y2="21" stroke="#0f172a" strokeWidth="0.8" opacity="0.6" />
                {/* Caja de bornes superior */}
                <rect x="9" y="-5" width="16" height="5" rx="1" fill="#0f172a" />
                {/* Escudo del eje y rodamiento */}
                <g transform="translate(17, 14)">
                  <circle cx="0" cy="0" r="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                  <text x="0" y="2.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0f172a">
                    M
                  </text>
                  {isMotorRunning && (
                    <g>
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 0 0"
                        to="360 0 0"
                        dur="0.6s"
                        repeatCount="indefinite"
                      />
                      <circle cx="0" cy="0" r="11" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>
                  )}
                </g>
                {/* Etiqueta del contactor asociado */}
                <text x="17" y="38" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                  -KM1
                </text>
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
                  fillOpacity={0.75}
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
              <g transform="translate(55, 105)">
                <circle cx="0" cy="0" r="22" fill={isMotorRunning ? "#0284c7" : "#64748b"} stroke="#0f172a" strokeWidth="2" />
                <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">
                  BOMBA
                </text>
                {isMotorRunning && (
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 0 0"
                      to="360 0 0"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                    <circle cx="0" cy="0" r="26" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 4" />
                  </g>
                )}
                <text x="0" y="36" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                  -KM1
                </text>
              </g>

              {/* Tubería que conecta la bomba al tanque */}
              <path
                d="M 77,105 L 110,105"
                stroke="#64748b"
                strokeWidth="6"
                fill="none"
              />
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
              <div className="text-[10px] text-slate-500 font-semibold">Sensor -B1</div>
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
              onClick={handleStartClick}
              onMouseDown={() => handleStartPress(true)}
              onMouseUp={() => handleStartPress(false)}
              onMouseLeave={() => handleStartPress(false)}
              onTouchStart={() => handleStartPress(true)}
              onTouchEnd={() => handleStartPress(false)}
              title="Pulsar Marcha en Cuadro de Planta (-S1)"
              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>I (Marcha)</span>
            </button>

            <button
              onClick={handleStopClick}
              onMouseDown={() => handleStopPress(true)}
              onMouseUp={() => handleStopPress(false)}
              onMouseLeave={() => handleStopPress(false)}
              onTouchStart={() => handleStopPress(true)}
              onTouchEnd={() => handleStopPress(false)}
              title="Pulsar Parada en Cuadro de Planta (-S0 / -S2)"
              className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>O (Parada)</span>
            </button>

            <button
              onClick={() => { setBoxPos(5); setProcessedBoxes(0); setTankLevel(15); }}
              title="Reiniciar Posición de Planta"
              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
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
