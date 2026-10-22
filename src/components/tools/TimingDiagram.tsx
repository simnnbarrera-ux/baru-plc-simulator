import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { Activity, Play, Pause, Trash2, X, Download } from 'lucide-react';

interface Props {
  simulationState: SimulationState;
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
  isOpen,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, setHistory] = useState<SignalSample[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const maxSamples = 200;

  // Registrar muestras cada 50ms cuando la simulación está activa
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      const isKm1Active = simulationState.activeCoils.has('-KM1');
      const isTimerActive = Array.from(simulationState.timerStates.values()).some(t => t.isActive);
      const motorRpm = Array.from(simulationState.motorStates.values())[0]?.rpm ?? (isKm1Active ? 1450 : 0);
      
      const newSample: SignalSample = {
        time: Date.now(),
        s1: simulationState.activeCoils.has('btn_start') ? 1 : 0,
        s2: simulationState.activeCoils.has('btn_stop') ? 1 : 0,
        km1: isKm1Active ? 1 : 0,
        timer: isTimerActive ? 1 : 0,
        motorRpm: motorRpm > 100 ? 1 : 0
      };

      setHistory(prev => {
        const next = [...prev, newSample];
        if (next.length > maxSamples) next.shift();
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, simulationState]);

  // Dibujar las ondas digitales en el canvas HTML5
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fondo técnico cuadriculado
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const channels = [
      { name: 'Pulsador -S1 (Marcha)', key: 's1' as const, color: '#10b981', y: 35 },
      { name: 'Pulsador -S2 (Parada)', key: 's2' as const, color: '#f43f5e', y: 70 },
      { name: 'Contactor -KM1', key: 'km1' as const, color: '#38bdf8', y: 105 },
      { name: 'Temporizador TON', key: 'timer' as const, color: '#fbbf24', y: 140 },
      { name: 'Motor Giro (RPM)', key: 'motorRpm' as const, color: '#a855f7', y: 175 }
    ];

    channels.forEach(ch => {
      // Línea base del canal
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(140, ch.y);
      ctx.lineTo(width, ch.y);
      ctx.stroke();

      // Etiqueta del canal
      ctx.fillStyle = ch.color;
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(ch.name, 10, ch.y - 4);

      // Trazo de la señal digital (0 o 1)
      if (history.length > 1) {
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = (width - 150) / maxSamples;

        history.forEach((sample, i) => {
          const val = sample[ch.key];
          const px = 150 + i * stepX;
          const py = val === 1 ? ch.y - 18 : ch.y;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            const prevVal = history[i - 1][ch.key];
            const prevPy = prevVal === 1 ? ch.y - 18 : ch.y;
            // Flanco vertical si hay cambio de estado
            if (val !== prevVal) {
              ctx.lineTo(px, prevPy);
            }
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
      }
    });

    // Cursor de tiempo actual
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width - 5, 0);
    ctx.lineTo(width - 5, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [isOpen, history]);

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
            50ms Sampling • 5 Canales Digitales
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
            onClick={() => setHistory([])}
            title="Borrar captura"
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

      {/* Pantalla gráfica del osciloscopio */}
      <div className="mt-2 rounded border border-slate-800 overflow-hidden bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={195}
          className="w-full h-48 block"
        />
      </div>
    </div>
  );
};
