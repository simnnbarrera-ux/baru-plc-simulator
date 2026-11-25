import React, { useEffect, useRef, useState } from 'react';
import { ElectricalMeasurement, SimulationState } from '../../types/simulation';
import {
  AlertTriangle,
  Crosshair,
  Play,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { soundEffects } from '../../core/simulation/soundEffects';

interface Props {
  simulationState: SimulationState;
  isOpen: boolean;
  onClose: () => void;
  activeFaults?: Set<string>;
  measurement: ElectricalMeasurement | null;
  isProbeActive: boolean;
  onToggleProbe: () => void;
  onStartSimulation?: () => void;
}

const getPotentialBadgeStyle = (potential: string, isEnergized: boolean): string => {
  if (potential === '+24V') {
    return 'bg-rose-500/20 text-rose-300 border-rose-400/50';
  }
  if (potential.startsWith('L1') || potential === 'L1-L2-L3') {
    return 'bg-amber-500/20 text-amber-300 border-amber-400/50';
  }
  if (potential.startsWith('L2')) {
    return 'bg-orange-500/20 text-orange-300 border-orange-400/50';
  }
  if (potential.startsWith('L3')) {
    return 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50';
  }
  if (potential === 'N' || potential === '0V') {
    return 'bg-sky-500/20 text-sky-300 border-sky-400/40';
  }
  if (potential === 'PE') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
  }
  if (potential === 'Neumático') {
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40';
  }
  return isEnergized
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
    : 'bg-slate-800 text-slate-400 border-slate-700';
};

const getTargetTypeBadge = (targetType: ElectricalMeasurement['targetType']): string => {
  if (targetType === 'wire') return 'CABLE';
  if (targetType === 'pin') return 'BORNE';
  return 'COMP.';
};

const formatPower = (powerW: number): { value: string; unit: string } => {
  if (powerW >= 1000) {
    return { value: (powerW / 1000).toFixed(2), unit: 'kW' };
  }
  return { value: powerW.toFixed(1), unit: 'W' };
};

export const VirtualMultimeter: React.FC<Props> = ({
  simulationState,
  isOpen,
  onClose,
  activeFaults = new Set(),
  measurement,
  isProbeActive,
  onToggleProbe,
  onStartSimulation
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const lastProbedRef = useRef<string | null>(null);

  const isRunning = simulationState.mode === 'running';
  const isStopped = simulationState.mode === 'stopped';

  // Feedback sonoro realista estilo Fluke al tocar un punto nuevo del esquema
  useEffect(() => {
    if (!isOpen || !measurement) {
      lastProbedRef.current = null;
      return;
    }
    if (lastProbedRef.current !== measurement.targetId) {
      lastProbedRef.current = measurement.targetId;
      if (soundEnabled) {
        if (!isStopped && measurement.currentA > 12) {
          soundEffects.playContinuityBeep(160);
        } else if (!isStopped && measurement.isEnergized) {
          soundEffects.playContinuityBeep(70);
        } else {
          soundEffects.playTripClick();
        }
      }
    }
  }, [isOpen, measurement, soundEnabled, isStopped]);

  if (!isOpen) return null;

  // Lecturas efectivas en pantalla (forzar 0 cuando la simulación está detenida)
  const hasReading = measurement !== null;
  const voltageV = !hasReading || isStopped ? 0 : measurement.voltageV;
  const voltageMode = measurement?.voltageMode ?? 'AC';
  const currentA = !hasReading || isStopped ? 0 : measurement.currentA;
  const powerW = !hasReading || isStopped ? 0 : measurement.powerW;
  const isEnergized = !isStopped && Boolean(measurement?.isEnergized);
  const isOverload = !isStopped && currentA > 12;

  const voltageUnit = voltageV > 0 ? `V ${voltageMode}` : 'V';
  const powerFmt = formatPower(powerW);
  const freqLabel = !hasReading
    ? '---'
    : isStopped
      ? '0.0 Hz'
      : voltageMode === 'DC'
        ? 'DC'
        : `${measurement.frequencyHz.toFixed(1)} Hz`;

  const statusNote = !hasReading
    ? 'Esperando contacto de sonda...'
    : isStopped
      ? 'Circuito desenergizado (simulación detenida)'
      : measurement.statusNote;

  const isFaultNote =
    isOverload ||
    /falla|sobrecarga|sobrecorriente|cortocircuito|disparado|error|abierta|soldado/i.test(statusNote);

  // Porcentaje para barra analógica Fluke
  const barPercent = isOverload
    ? 100
    : voltageV >= 380
      ? 92
      : voltageV >= 200
        ? 62
        : voltageV >= 20
          ? 28
          : currentA > 0
            ? Math.min(85, Math.max(15, currentA * 10))
            : 0;

  return (
    <div className="absolute top-4 right-4 z-40 w-80 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] border-2 border-slate-900 select-none text-slate-100 animate-in fade-in zoom-in-95 duration-150">
      {/* Carcasa interior oscura Fluke 87V */}
      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/90 space-y-2.5">
        {/* 1. CABECERA FLUKE + SONDA + AUDIO + CERRAR */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/90">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10.5px] font-black tracking-wider font-mono text-amber-400 truncate">
              FLUKE-87V • SONDA EN VIVO
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) soundEffects.playContinuityBeep(65);
              }}
              title={soundEnabled ? 'Silenciar zumbador' : 'Activar zumbador de sonda'}
              aria-label={soundEnabled ? 'Silenciar zumbador' : 'Activar zumbador de sonda'}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                soundEnabled
                  ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar multímetro"
              aria-label="Cerrar multímetro"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Píldora interactiva de control de Sonda Activa */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleProbe}
            className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
              isProbeActive
                ? 'bg-amber-500/15 border-amber-400/70 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.18)]'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Crosshair className={`w-3.5 h-3.5 ${isProbeActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{isProbeActive ? 'Sonda Activa' : 'Activar Sonda'}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono">
              {isProbeActive ? (
                <>
                  <span className="text-amber-300/80">TOCAR PUNTO</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                </>
              ) : (
                <span className="text-slate-500">OFF</span>
              )}
            </span>
          </button>
        </div>

        {/* 5. BANNER INLINE SI LA SIMULACIÓN NO ESTÁ CORRIENDO */}
        {!isRunning && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-amber-500/12 border border-amber-400/45 text-amber-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10.5px] leading-tight font-medium">
                {simulationState.mode === 'paused'
                  ? 'Simulación en pausa.'
                  : 'Simulación detenida (0.0 V).'}
              </span>
            </div>
            {onStartSimulation && (
              <button
                type="button"
                onClick={onStartSimulation}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-extrabold tracking-tight transition-colors shadow-xs cursor-pointer"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                Iniciar simulación
              </button>
            )}
          </div>
        )}

        {/* 2. BADGE DEL PUNTO TOCADO O INSTRUCCIÓN DE SONDA */}
        {measurement ? (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8.5px] font-mono font-bold text-slate-400 shrink-0">
                {getTargetTypeBadge(measurement.targetType)}
              </span>
              <span
                className="text-[11px] font-semibold text-slate-100 truncate"
                title={measurement.label}
              >
                {measurement.label}
              </span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-md border text-[9.5px] font-mono font-bold shrink-0 ${getPotentialBadgeStyle(
                isStopped ? 'Sin tensión' : measurement.potential,
                isEnergized
              )}`}
            >
              {isStopped ? 'Sin tensión' : measurement.potential}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900/80 border border-dashed border-slate-700/90 text-slate-400">
            <Crosshair className="w-4 h-4 text-amber-400/80 shrink-0" />
            <p className="text-[10.5px] leading-snug">
              Haz clic en cualquier cable, borne o componente del esquema para medir en vivo
            </p>
          </div>
        )}

        {/* 3. PANTALLA LCD RETROILUMINADA DE 3 CANALES SIMULTÁNEOS */}
        <div className="rounded-xl bg-[#071912] border border-emerald-900/90 p-2.5 font-mono shadow-[inset_0_2px_14px_rgba(0,0,0,0.85)] space-y-2">
          {/* Barra superior LCD */}
          <div className="flex items-center justify-between text-[8.5px] font-bold tracking-wider text-emerald-500/80">
            <span>TRUE RMS</span>
            <span>AUTO RANGE</span>
            <span className={isOverload ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>
              {isOverload ? 'OVERLOAD' : freqLabel}
            </span>
          </div>

          {/* CANAL 1: VOLTAJE (Principal) */}
          <div className="flex items-end justify-between border-b border-emerald-950/90 pb-1.5">
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold tracking-widest text-emerald-600">
                VOLTAJE
              </span>
              <span className="text-[9px] text-emerald-700 mt-0.5">
                {!hasReading ? 'STANDBY' : isEnergized ? 'CON TENSIÓN' : 'SIN TENSIÓN'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-[27px] leading-none font-black tracking-tight tabular-nums ${
                  voltageV > 0
                    ? 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                    : 'text-emerald-500/55'
                }`}
              >
                {voltageV.toFixed(1)}
              </span>
              <span
                className={`text-xs font-extrabold ${
                  voltageV > 0 ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                {voltageUnit}
              </span>
            </div>
          </div>

          {/* CANALES 2 y 3: CORRIENTE y POTENCIA en paralelo */}
          <div className="grid grid-cols-2 gap-2">
            {/* CORRIENTE */}
            <div
              className={`rounded-lg px-2 py-1.5 border transition-colors ${
                isOverload
                  ? 'bg-rose-950/50 border-rose-500/60'
                  : 'bg-emerald-950/35 border-emerald-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[8px] font-bold tracking-widest ${
                    isOverload ? 'text-rose-400' : 'text-emerald-600'
                  }`}
                >
                  CORRIENTE
                </span>
                {isOverload && (
                  <span className="text-[8px] font-black text-rose-400 animate-pulse">OL!</span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline justify-end gap-1">
                <span
                  className={`text-lg leading-tight font-extrabold tabular-nums ${
                    isOverload
                      ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.7)] animate-pulse'
                      : currentA > 0
                        ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]'
                        : 'text-emerald-500/55'
                  }`}
                >
                  {currentA.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    isOverload ? 'text-rose-300' : currentA > 0 ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  A
                </span>
              </div>
            </div>

            {/* POTENCIA */}
            <div className="rounded-lg px-2 py-1.5 bg-emerald-950/35 border border-emerald-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold tracking-widest text-emerald-600">
                  POTENCIA
                </span>
                <span className="text-[8px] text-emerald-700">ACTIVA</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-end gap-1">
                <span
                  className={`text-lg leading-tight font-extrabold tabular-nums ${
                    powerW > 0
                      ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.35)]'
                      : 'text-emerald-500/55'
                  }`}
                >
                  {powerFmt.value}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    powerW > 0 ? 'text-amber-400' : 'text-emerald-700'
                  }`}
                >
                  {powerFmt.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico de barras analógico */}
          <div className="w-full bg-emerald-950/80 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                isOverload
                  ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-rose-400'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-300'
              }`}
              style={{ width: `${barPercent}%` }}
            />
          </div>

          {/* 4. PIE DE DIAGNÓSTICO DENTRO DEL LCD */}
          <div className="pt-1 border-t border-emerald-950/90 flex items-center justify-between gap-2 text-[9.5px] leading-tight">
            <span
              className={`truncate ${
                isOverload
                  ? 'text-rose-300 font-bold'
                  : isFaultNote
                    ? 'text-amber-300 font-semibold'
                    : hasReading && !isStopped
                      ? 'text-emerald-300/90'
                      : 'text-emerald-600'
              }`}
              title={statusNote}
            >
              {statusNote}
            </span>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-900/70 text-[8.5px] font-bold text-emerald-400">
              {freqLabel}
            </span>
          </div>
        </div>

        {/* Aviso compacto si hay fallas inyectadas activas */}
        {activeFaults.size > 0 && (
          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-200 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              {activeFaults.size === 1
                ? '1 avería activa en el esquema'
                : `${activeFaults.size} averías activas en el esquema`}
            </span>
            <span className="font-mono text-[9px] text-rose-300/90">DIAGNÓSTICO</span>
          </div>
        )}

        {/* Bornes inferiores compactos Fluke (V Ω / COM / 10A) */}
        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-around">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-300/60 shadow-inner" />
            <span className="text-[9px] font-mono font-bold text-slate-400">V Ω</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
            <span className="text-[9px] font-mono font-bold text-slate-400">COM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-red-700 border border-amber-400/50 shadow-inner" />
            <span className="text-[9px] font-mono font-bold text-slate-400">10A MAX</span>
          </div>
        </div>
      </div>
    </div>
  );
};
