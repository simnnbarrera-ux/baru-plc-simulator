import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationState } from '../../types/simulation';
import { CircuitDocument } from '../../types/circuit';
import { Activity, Play, Pause, Trash2, X } from 'lucide-react';

interface Props {
  simulationState: SimulationState;
  document?: CircuitDocument;
  isOpen: boolean;
  onClose: () => void;
}

interface SignalSample {
  time: number;
  s1: number;       // Marcha
  s2: number;       // Parada
  km1: number;      // Contactor KM1
  timer: number;    // Temporizador
  motorRpm: number; // RPM motor
}

export const TimingDiagram: React.FC<Props> = ({
  simulationState,
  document,
  isOpen,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<SignalSample[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 900, height: 210 });
  const maxSamples = 160; // 160 muestras a 50ms = 8 segundos de visualización continua

  // Auto-ajuste de tamaño reactivo al contenedor con soporte HiDPI / Retina
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(400, Math.floor(rect.width));
      const h = Math.max(160, Math.floor(rect.height || 210));
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      setDimensions({ width: w, height: h });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Capturar una muestra actual del estado de los dispositivos y pulsadores
  const getCurrentSample = useCallback((): SignalSample => {
    const isKm1Active = simulationState.activeCoils.has('-KM1') || 
                        simulationState.activeCoils.has('KM1') ||
                        simulationState.activeCoils.has('-KM2');
    const isTimerActive = Array.from(simulationState.timerStates.values()).some(t => t.isActive || t.isComplete);
    const motorObj = Array.from(simulationState.motorStates.values())[0];
    const motorRpm = motorObj?.rpm ?? (isKm1Active ? 1450 : 0);

    // Acceder al estado físico de los pulsadores en el plano esquemático
    const s1Comp = document?.components.find(c => 
      c.id === 'btn_start' || 
      c.tag === '-S1' || 
      (c.type === 'button_no' && c.tag.includes('1'))
    );
    const s2Comp = document?.components.find(c => 
      c.id === 'btn_stop' || 
      c.tag === '-S2' || 
      (c.type === 'button_nc' && c.tag.includes('2'))
    );

    return {
      time: Date.now(),
      s1: s1Comp?.state?.isActuated ? 1 : 0,
      s2: s2Comp?.state?.isActuated ? 1 : 0,
      km1: isKm1Active ? 1 : 0,
      timer: isTimerActive ? 1 : 0,
      motorRpm: motorRpm
    };
  }, [simulationState, document]);

  // Inicializar el buffer completo al abrir para que las ondas abarquen TODO el ancho desde el primer frame
  useEffect(() => {
    if (!isOpen) return;
    setHistory(prev => {
      if (prev.length === 0) {
        const init = getCurrentSample();
        return Array(maxSamples).fill(init);
      }
      return prev;
    });
  }, [isOpen, getCurrentSample]);

  // Muestreo continuo a 50ms (20 Hz)
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      const sample = getCurrentSample();
      setHistory(prev => {
        if (prev.length === 0) {
          return Array(maxSamples).fill(sample);
        }
        return [...prev.slice(1), sample];
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, getCurrentSample]);

  // Dibujar osciloscopio en el canvas HTML5
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fondo técnico oscuro
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    const plotLeft = 195;
    const plotRight = width - 15;
    const plotWidth = Math.max(100, plotRight - plotLeft);

    // Canales a visualizar
    const channels = [
      { name: 'Pulsador -S1', desc: 'Marcha NA', key: 's1' as const, color: '#10b981', fillColor: 'rgba(16, 185, 129, 0.15)', isAnalog: false },
      { name: 'Pulsador -S2', desc: 'Parada NC', key: 's2' as const, color: '#f43f5e', fillColor: 'rgba(244, 63, 94, 0.15)', isAnalog: false },
      { name: 'Contactor -KM1', desc: 'Bobina Línea', key: 'km1' as const, color: '#38bdf8', fillColor: 'rgba(56, 189, 248, 0.18)', isAnalog: false },
      { name: 'Temporizador', desc: 'TON Relé (KT1)', key: 'timer' as const, color: '#fbbf24', fillColor: 'rgba(251, 191, 36, 0.18)', isAnalog: false },
      { name: 'Motor Trifásico', desc: 'Velocidad Angular', key: 'motorRpm' as const, color: '#a855f7', fillColor: 'rgba(168, 85, 247, 0.20)', isAnalog: true }
    ];

    const numChannels = channels.length;
    const channelHeight = Math.floor((height - 24) / numChannels);
    const waveH = Math.max(12, Math.floor(channelHeight * 0.58));

    // Cuadrícula vertical de tiempo
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const timeSteps = 8;
    for (let s = 0; s <= timeSteps; s++) {
      const gx = plotLeft + (s / timeSteps) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height - 20);
      ctx.stroke();

      // Etiquetas de tiempo (-7.0s ... 0.0s)
      const secAgo = ((timeSteps - s) * (maxSamples * 0.05 / timeSteps)).toFixed(1);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const labelText = s === timeSteps ? '0.0s (Ahora)' : `-${secAgo}s`;
      ctx.fillText(labelText, gx, height - 6);
    }

    // Línea divisoria vertical entre columna de etiquetas y zona gráfica
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotLeft, 0);
    ctx.lineTo(plotLeft, height);
    ctx.stroke();

    // Fondo de la columna de etiquetas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, plotLeft, height);

    // Dibujar cada canal
    channels.forEach((ch, idx) => {
      const topY = 6 + idx * channelHeight;
      const baseY = topY + waveH + 6;

      // Línea divisoria horizontal inferior del canal
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, topY + channelHeight);
      ctx.lineTo(width, topY + channelHeight);
      ctx.stroke();

      // Línea base del canal (0 lógico o 0 RPM)
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(plotLeft, baseY);
      ctx.lineTo(plotRight, baseY);
      ctx.stroke();

      // Línea punteada superior (1 lógico o 100%)
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, baseY - waveH);
      ctx.lineTo(plotRight, baseY - waveH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Valor actual (última muestra)
      const lastSample = history[history.length - 1];
      const currentVal = lastSample ? lastSample[ch.key] : 0;

      // Etiqueta del canal en columna izquierda
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillStyle = ch.color;
      ctx.fillText(ch.name, 12, topY + 14);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(ch.desc, 12, topY + 26);

      // Badge de estado en tiempo real
      ctx.textAlign = 'right';
      if (ch.isAnalog) {
        const rpm = Math.round(currentVal);
        ctx.fillStyle = rpm > 50 ? '#38bdf8' : '#64748b';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`${rpm} RPM`, plotLeft - 10, topY + 20);
      } else {
        const isHigh = currentVal === 1;
        ctx.fillStyle = isHigh ? '#4ade80' : '#475569';
        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        ctx.fillText(isHigh ? '1 [ALTO]' : '0 [BAJO]', plotLeft - 10, topY + 20);
      }

      // Dibujar forma de onda
      if (history.length > 1) {
        const sampleCount = history.length;

        // Trazado de línea y polígono de relleno
        ctx.beginPath();
        const firstVal = history[0][ch.key];
        const firstNorm = ch.isAnalog ? Math.min(1, firstVal / 1500) : firstVal;
        const firstPy = baseY - firstNorm * waveH;
        ctx.moveTo(plotLeft, firstPy);

        history.forEach((sample, i) => {
          const val = sample[ch.key];
          const normVal = ch.isAnalog ? Math.min(1, val / 1500) : val;
          const px = plotLeft + (i / (sampleCount - 1)) * plotWidth;
          const py = baseY - normVal * waveH;

          if (i > 0 && !ch.isAnalog) {
            const prevVal = history[i - 1][ch.key];
            const prevPy = baseY - prevVal * waveH;
            if (val !== prevVal) {
              ctx.lineTo(px, prevPy); // Flanco vertical instantáneo
            }
          }
          ctx.lineTo(px, py);
        });

        // Trazar línea de señal
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Relleno bajo la curva para efecto oscilloscope profesional
        ctx.lineTo(plotRight, baseY);
        ctx.lineTo(plotLeft, baseY);
        ctx.closePath();
        ctx.fillStyle = ch.fillColor;
        ctx.fill();
      }
    });

    // Cursor / Marcador de tiempo actual
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotRight, 0);
    ctx.lineTo(plotRight, height - 20);
    ctx.stroke();

    ctx.restore();
  }, [isOpen, history, dimensions]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-7 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t-2 border-blue-600 shadow-2xl p-2.5 text-white select-none animate-in slide-in-from-bottom-5 duration-200">
      {/* Barra superior del analizador */}
      <div className="flex items-center justify-between pb-2 px-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold font-sans tracking-wide">
            Analizador Lógico & Cronograma de Señales
          </h4>
          <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
            50ms Sampling • 5 Canales en Tiempo Real
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
          </button>

          <button
            onClick={() => setHistory(Array(maxSamples).fill(getCurrentSample()))}
            title="Reiniciar captura a tiempo cero"
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pantalla gráfica del osciloscopio que abarca el 100% del ancho del panel */}
      <div ref={containerRef} className="mt-2 rounded border border-slate-800 overflow-hidden bg-slate-950 h-56 relative w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
