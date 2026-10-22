import React, { useState } from 'react';
import { SimulationState } from '../../types/simulation';
import { Gauge, X, Zap, Volume2 } from 'lucide-react';
import { soundEffects } from '../../core/simulation/soundEffects';

interface Props {
  simulationState: SimulationState;
  isOpen: boolean;
  onClose: () => void;
  activeFaults?: Set<string>;
}

export const VirtualMultimeter: React.FC<Props> = ({
  simulationState,
  isOpen,
  onClose,
  activeFaults = new Set()
}) => {
  const [selectedChannel, setSelectedChannel] = useState<
    'voltage_ll' | 'voltage_ln' | 'current' | 'resistance' | 'coil_v' | 'power'
  >('voltage_ll');

  const [phasePair, setPhasePair] = useState<'L1_L2' | 'L2_L3' | 'L1_L3'>('L1_L2');
  const [resistancePoint, setResistancePoint] = useState<'coil_km1' | 'thermal_95_96' | 'breaker_q1'>('coil_km1');

  if (!isOpen) return null;

  const isSimulating = simulationState.mode === 'running';
  const isKm1Active = simulationState.activeCoils.has('-KM1');

  // Evaluar presencia de fallas
  const hasPhaseLossL2 = activeFaults.has('phase_loss_l2');
  const hasPhaseLossL3 = activeFaults.has('phase_loss_l3');
  const hasThermalTrip = activeFaults.has('thermal_overload');
  const hasOpenCoil = activeFaults.has('open_coil_km1');
  const hasShortCircuit = activeFaults.has('short_circuit');

  // Cálculos de Tensión Línea - Línea (400V)
  let voltageLL = 0.0;
  if (isSimulating && !hasShortCircuit) {
    if (phasePair === 'L1_L2') {
      voltageLL = hasPhaseLossL2 ? 0.0 : 400.2;
    } else if (phasePair === 'L2_L3') {
      voltageLL = (hasPhaseLossL2 || hasPhaseLossL3) ? 0.0 : 400.1;
    } else if (phasePair === 'L1_L3') {
      voltageLL = hasPhaseLossL3 ? 0.0 : 399.8;
    }
  }

  // Cálculos de Tensión Línea - Neutro (230V)
  let voltageLN = 0.0;
  if (isSimulating && !hasShortCircuit) {
    voltageLN = 230.8;
  }

  // Tensión directa en bornas A1-A2 de la bobina -KM1
  // Si la maniobra está en marcha (sin térmico disparado), hay 230V aunque la bobina esté abierta internamente!
  let coilVoltage = 0.0;
  if (isSimulating && !hasThermalTrip && !hasShortCircuit) {
    coilVoltage = 230.0;
  }

  // Corriente de motor (Pinza Amperimétrica)
  let currentMotor = 0.0;
  if (isSimulating && isKm1Active) {
    if (hasPhaseLossL2 || hasPhaseLossL3) {
      // Sobreintensidad por régimen bifásico asimétrico en motor trifásico
      currentMotor = 18.65;
    } else {
      currentMotor = 7.42;
    }
  }

  // Potencia activa en kW
  const activePowerKW = (isSimulating && isKm1Active && !hasPhaseLossL2 && !hasPhaseLossL3)
    ? (Math.sqrt(3) * 400 * 7.42 * 0.85 / 1000).toFixed(2)
    : "0.00";

  // Medición de Resistencia Ω / Continuidad (con circuito sin tensión para prueba de taller)
  let resistanceDisplay = "560.0";
  let isResistanceOL = false;

  if (resistancePoint === 'coil_km1') {
    if (hasOpenCoil) {
      resistanceDisplay = " O.L ";
      isResistanceOL = true;
    } else {
      resistanceDisplay = "562.4";
    }
  } else if (resistancePoint === 'thermal_95_96') {
    if (hasThermalTrip) {
      resistanceDisplay = " O.L ";
      isResistanceOL = true;
    } else {
      resistanceDisplay = "000.2";
    }
  } else if (resistancePoint === 'breaker_q1') {
    if (hasShortCircuit) {
      resistanceDisplay = " O.L ";
      isResistanceOL = true;
    } else {
      resistanceDisplay = "000.1";
    }
  }

  // Pitido de continuidad al tocar bornas si no está abierto
  const handleTriggerBeep = () => {
    if (!isResistanceOL) {
      soundEffects.playContinuityBeep(200);
    }
  };

  return (
    <div className="absolute top-14 left-6 z-40 w-80 bg-gradient-to-b from-amber-500 to-amber-600 p-2.5 rounded-2xl shadow-2xl border-4 border-slate-900 select-none text-slate-900 animate-in fade-in zoom-in-95 duration-150">
      {/* Marco de polímero amarillo del multímetro Fluke */}
      <div className="bg-slate-900 rounded-xl p-3 text-white">
        {/* Cabecera de la carátula */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold tracking-wider font-mono text-amber-400">
              FLUKE-87V TRUE RMS PRO
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-0.5 rounded text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PANTALLA LCD RETROILUMINADA */}
        <div className="mt-2.5 p-3 rounded-lg bg-[#0c1f17] border border-emerald-950 font-mono text-emerald-400 shadow-inner flex flex-col justify-between h-28">
          <div className="flex justify-between items-center text-[10px] text-emerald-600 font-bold">
            <span>TRUE RMS</span>
            <span>AUTO RANGE</span>
            <span>
              {selectedChannel === 'resistance' ? 'Ω CONTINUIDAD' : '60.0 Hz'}
            </span>
          </div>

          <div className="flex items-baseline justify-end gap-1.5 my-auto">
            <span className="text-3xl font-extrabold tracking-wider font-mono text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]">
              {selectedChannel === 'voltage_ll' && voltageLL.toFixed(1).padStart(5, '0')}
              {selectedChannel === 'voltage_ln' && voltageLN.toFixed(1).padStart(5, '0')}
              {selectedChannel === 'coil_v' && coilVoltage.toFixed(1).padStart(5, '0')}
              {selectedChannel === 'current' && currentMotor.toFixed(2).padStart(5, '0')}
              {selectedChannel === 'resistance' && resistanceDisplay}
              {selectedChannel === 'power' && activePowerKW}
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {(selectedChannel === 'voltage_ll' || selectedChannel === 'voltage_ln' || selectedChannel === 'coil_v') && "V AC"}
              {selectedChannel === 'current' && "A"}
              {selectedChannel === 'resistance' && (isResistanceOL ? "" : "Ω")}
              {selectedChannel === 'power' && "kW"}
            </span>
          </div>

          {/* Gráfico de barras analógico */}
          <div className="w-full bg-emerald-950/60 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                currentMotor > 15 ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{
                width: selectedChannel === 'voltage_ll' && voltageLL > 0 ? '80%' :
                       selectedChannel === 'current' && currentMotor > 15 ? '98%' :
                       selectedChannel === 'current' && currentMotor > 0 ? '60%' :
                       selectedChannel === 'coil_v' && coilVoltage > 0 ? '70%' :
                       selectedChannel === 'resistance' && !isResistanceOL ? '45%' : '0%'
              }}
            />
          </div>
        </div>

        {/* SUB-SELECTORES SEGÚN CANAL */}
        {selectedChannel === 'voltage_ll' && (
          <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-mono">
            {(['L1_L2', 'L2_L3', 'L1_L3'] as const).map(pair => (
              <button
                key={pair}
                onClick={() => setPhasePair(pair)}
                className={`flex-1 py-1 rounded transition-colors ${
                  phasePair === pair
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {pair.replace('_', '-')}
              </button>
            ))}
          </div>
        )}

        {selectedChannel === 'resistance' && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>PUNTAS DE PRUEBA EN:</span>
              <button
                onClick={handleTriggerBeep}
                title="Comprobar zumbador de continuidad"
                className="text-amber-400 hover:text-white flex items-center gap-0.5"
              >
                <Volume2 className="w-3 h-3" /> Beep
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <button
                onClick={() => setResistancePoint('coil_km1')}
                className={`flex-1 py-1 rounded transition-colors ${
                  resistancePoint === 'coil_km1'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Bobina A1-A2
              </button>
              <button
                onClick={() => setResistancePoint('thermal_95_96')}
                className={`flex-1 py-1 rounded transition-colors ${
                  resistancePoint === 'thermal_95_96'
                    ? 'bg-orange-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Térmico 95-96
              </button>
              <button
                onClick={() => setResistancePoint('breaker_q1')}
                className={`flex-1 py-1 rounded transition-colors ${
                  resistancePoint === 'breaker_q1'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Guardamotor
              </button>
            </div>
          </div>
        )}

        {/* SELECTOR GIRATORIO DE MAGNITUDES */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] font-mono font-semibold">
          <button
            onClick={() => setSelectedChannel('voltage_ll')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'voltage_ll'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            V~ Fase-Fase (400V)
          </button>

          <button
            onClick={() => setSelectedChannel('voltage_ln')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'voltage_ln'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            V~ Fase-N (230V)
          </button>

          <button
            onClick={() => setSelectedChannel('coil_v')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'coil_v'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            V~ Bobina (A1-A2)
          </button>

          <button
            onClick={() => setSelectedChannel('resistance')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'resistance'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Ω Continuidad
          </button>

          <button
            onClick={() => setSelectedChannel('current')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'current'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            I~ Pinza (A)
          </button>

          <button
            onClick={() => setSelectedChannel('power')}
            className={`py-1.5 px-2 rounded-lg border transition-all ${
              selectedChannel === 'power'
                ? 'bg-amber-500 text-slate-900 font-bold border-amber-300 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Potencia (kW)
          </button>
        </div>

        {/* Bornes de conexión COM / V / A */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-around">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-red-600 border border-white/50" />
            <span className="text-[9px] text-slate-400 mt-0.5">V Ω</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600" />
            <span className="text-[9px] text-slate-400 mt-0.5">COM</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-red-600 border border-white/50" />
            <span className="text-[9px] text-slate-400 mt-0.5">10A</span>
          </div>
        </div>
      </div>
    </div>
  );
};
