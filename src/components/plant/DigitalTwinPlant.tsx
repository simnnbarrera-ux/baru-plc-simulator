import React, { useState, useEffect, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { CircuitDocument } from '../../types/circuit';
import {
  Play,
  Square,
  RotateCcw,
  Cpu,
  Droplets,
  ArrowDownToLine,
  Minimize2,
  Maximize2,
  X,
  ExternalLink
} from 'lucide-react';

interface Props {
  simulationState: SimulationState;
  document?: CircuitDocument;
  onPressButton: (buttonTag: string, isPressed: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  embeddedMode?: boolean;
  onLoadExample?: (exampleId: string) => void;
}

type PlantMode = 'conveyor' | 'tank' | 'pneumatic' | 'bottling';
type LocalPneumaticPhase = 'idle' | 'extending' | 'dwell_end' | 'retracting' | 'dwell_start';
type BottlingStage = 'advance_fill' | 'filling' | 'advance_cap' | 'capping' | 'exit';

interface BottlingState {
  stage: BottlingStage;
  bottleX: number;
  fillLevel: number;
  capProgress: number;
  isCapped: boolean;
}

const INITIAL_BOTTLING_STATE: BottlingState = {
  stage: 'advance_fill',
  bottleX: 38,
  fillLevel: 0,
  capProgress: 0,
  isCapped: false
};

export const DigitalTwinPlant: React.FC<Props> = ({
  simulationState,
  document,
  onPressButton,
  isOpen,
  onClose,
  embeddedMode = false,
  onLoadExample
}) => {
  const [plantMode, setPlantMode] = useState<PlantMode>('conveyor');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Estado compartido de animación continua (flujos, rodillos, impulsor)
  const [flowOffset, setFlowOffset] = useState<number>(0);
  const [rollerAngle, setRollerAngle] = useState<number>(0);
  const [pumpAngle, setPumpAngle] = useState<number>(0);
  const [bottlingRollerAngle, setBottlingRollerAngle] = useState<number>(0);

  // Modo 1: Cinta / Clasificadora
  const [boxPos, setBoxPos] = useState<number>(8);
  const [processedBoxes, setProcessedBoxes] = useState<number>(0);
  const [sensorActive, setSensorActive] = useState<boolean>(false);
  const [diverterExtend, setDiverterExtend] = useState<number>(0);

  // Modo 2: Tanque + Bomba + Válvula Salida + Histéresis
  const [tankLevel, setTankLevel] = useState<number>(20);
  const [drainValveOpen, setDrainValveOpen] = useState<boolean>(true);
  const [isQuickDraining, setIsQuickDraining] = useState<boolean>(false);
  const [tankHysteresisHold, setTankHysteresisHold] = useState<boolean>(false);
  const tankLevelRef = useRef<number>(20);
  const tankHysteresisRef = useRef<boolean>(false);

  // Modo 3: Neumática (real o gemelo local sincronizado)
  const [pneumaticCycles, setPneumaticCycles] = useState<number>(0);
  const [localPistonPos, setLocalPistonPos] = useState<number>(0);
  const [localPneumaticPhase, setLocalPneumaticPhase] = useState<LocalPneumaticPhase>('idle');
  const localPosRef = useRef<number>(0);
  const localPhaseRef = useRef<LocalPneumaticPhase>('idle');
  const localDwellRef = useRef<number>(0);
  const wasAtEndRef = useRef<boolean>(false);

  // Modo 4: Embotelladora GEMMA
  const [bottling, setBottling] = useState<BottlingState>(INITIAL_BOTTLING_STATE);
  const [bottledCount, setBottledCount] = useState<number>(0);
  const bottlingRef = useRef<BottlingState>(INITIAL_BOTTLING_STATE);

  // Refs de botones Marcha / Paro (previenen disparos accidentales al hacer hover)
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStartHeldRef = useRef<boolean>(false);
  const isStopHeldRef = useRef<boolean>(false);

  // Auto-selección inteligente del modo de planta cuando cambia el circuito cargado
  const docTitle = document?.titleBlock?.title || '';
  const docHasCylinder = Boolean(
    document?.components.some(c => c.type === 'pneumatic_cylinder_da')
  );

  useEffect(() => {
    if (!document) return;
    const titleLower = docTitle.toLowerCase();

    if (titleLower.includes('embotell')) {
      setPlantMode('bottling');
    } else if (titleLower.includes('tanque') || titleLower.includes('bomba')) {
      setPlantMode('tank');
    } else if (
      titleLower.includes('neum') ||
      titleLower.includes('pist') ||
      (docHasCylinder &&
        !titleLower.includes('cinta') &&
        !titleLower.includes('banda') &&
        !titleLower.includes('embotell'))
    ) {
      setPlantMode('pneumatic');
    } else {
      setPlantMode('conveyor');
    }
  }, [docTitle, docHasCylinder]);

  // Limpieza de temporizadores de pulsadores al desmontar
  useEffect(() => {
    return () => {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  // Señales del motor de simulación y PLC
  const isSimRunning = simulationState.mode === 'running';

  const isMotorRunning =
    isSimRunning &&
    (simulationState.activeCoils.has('-KM1') ||
      simulationState.activeCoils.has('-KM2') ||
      simulationState.activeCoils.has('-KM3') ||
      simulationState.activeCoils.has('PLC:%Q0.0') ||
      Array.from(simulationState.motorStates.values()).some(
        m => m.rpm > 40 && m.targetRpm > 0
      ));

  const q01Active = isSimRunning && simulationState.activeCoils.has('PLC:%Q0.1');

  const realY1Active =
    isSimRunning &&
    (simulationState.activeCoils.has('Y1') ||
      simulationState.activeCoils.has('-A:Y1') ||
      simulationState.activeCoils.has('PLC:%Q0.2'));

  const realY2Active =
    isSimRunning &&
    (simulationState.activeCoils.has('Y2') ||
      simulationState.activeCoils.has('-A:Y2') ||
      simulationState.activeCoils.has('PLC:%Q0.3'));

  const isAnyActuatorRunning =
    isMotorRunning ||
    realY1Active ||
    realY2Active ||
    q01Active ||
    (isSimRunning && simulationState.activeCoils.has('PLC:%Q0.0'));

  const isTankPumpCommand =
    isMotorRunning ||
    (isSimRunning &&
      (simulationState.activeCoils.has('PLC:%Q0.0') ||
        simulationState.activeCoils.has('-KM1') ||
        q01Active));

  const isBottlingRunning = isMotorRunning || realY1Active || realY2Active || q01Active;
  const isLocalPneumaticDrive = isMotorRunning || realY1Active || realY2Active || q01Active;

  // Estado neumático real vs gemelo local sincronizado
  const firstPneumaticEntry =
    simulationState.pneumaticStates && simulationState.pneumaticStates.size > 0
      ? Array.from(simulationState.pneumaticStates.values())[0]
      : undefined;
  const hasRealPneumatic = Boolean(firstPneumaticEntry);

  const pistonPos = hasRealPneumatic
    ? (firstPneumaticEntry?.position ?? 0)
    : localPistonPos;
  const reedA0 = hasRealPneumatic
    ? (firstPneumaticEntry ? firstPneumaticEntry.atStart : true)
    : localPistonPos <= 0.04;
  const reedA1 = hasRealPneumatic
    ? (firstPneumaticEntry ? firstPneumaticEntry.atEnd : false)
    : localPistonPos >= 0.96;
  const y1Active = hasRealPneumatic
    ? realY1Active
    : isLocalPneumaticDrive &&
      (localPneumaticPhase === 'extending' || localPneumaticPhase === 'dwell_end');
  const y2Active = hasRealPneumatic
    ? realY2Active
    : isLocalPneumaticDrive &&
      (localPneumaticPhase === 'retracting' || localPneumaticPhase === 'dwell_start');

  // Contador unificado de ciclos A+ / A-
  useEffect(() => {
    if (reedA1 && !wasAtEndRef.current) {
      wasAtEndRef.current = true;
      setPneumaticCycles(c => c + 1);
    } else if (!reedA1 && reedA0) {
      wasAtEndRef.current = false;
    }
  }, [reedA1, reedA0]);

  // Ref con las señales vivas para evitar reinicios del intervalo a 40 fps
  const liveRef = useRef({
    isSimRunning,
    isAnyActuatorRunning,
    isTankPumpCommand,
    isBottlingRunning,
    isLocalPneumaticDrive,
    hasRealPneumatic,
    realY1Active,
    drainValveOpen,
    isQuickDraining
  });

  liveRef.current = {
    isSimRunning,
    isAnyActuatorRunning,
    isTankPumpCommand,
    isBottlingRunning,
    isLocalPneumaticDrive,
    hasRealPneumatic,
    realY1Active,
    drainValveOpen,
    isQuickDraining
  };

  const shouldTick = isSimRunning || isQuickDraining;

  // Bucle maestro de simulación física 2D (~40 fps)
  useEffect(() => {
    if (!shouldTick) return;

    const interval = setInterval(() => {
      const s = liveRef.current;

      // Avance de flujos visuales (agua, aire comprimido, banda)
      if (
        s.isAnyActuatorRunning ||
        s.isTankPumpCommand ||
        s.isBottlingRunning ||
        s.isQuickDraining ||
        (s.drainValveOpen && tankLevelRef.current > 15 && s.isSimRunning)
      ) {
        setFlowOffset(prev => (prev + 1.8) % 24);
      }

      // 1. CINTA / CLASIFICADORA
      if (s.isAnyActuatorRunning) {
        setRollerAngle(prev => (prev + 8) % 360);
        setBoxPos(prev => {
          const next = prev + 0.55;
          const inSensor = next >= 54 && next <= 69;
          setSensorActive(inSensor);

          if (next >= 65 && next <= 81) {
            const pulse = Math.sin(((next - 65) / 16) * Math.PI);
            setDiverterExtend(Math.max(0, Math.min(1, pulse)));
          } else {
            setDiverterExtend(s.realY1Active ? 0.85 : 0);
          }

          if (next >= 96) {
            setProcessedBoxes(b => b + 1);
            return 5;
          }
          return next;
        });
      } else {
        setDiverterExtend(0);
      }

      // 2. TANQUE + BOMBA + VÁLVULA DE SALIDA + HISTÉRESIS AUTOMÁTICA
      if (s.isQuickDraining) {
        const nextLevel = Math.max(15, tankLevelRef.current - 2.1);
        tankLevelRef.current = nextLevel;
        setTankLevel(nextLevel);
        if (nextLevel <= 15) {
          tankHysteresisRef.current = false;
          setTankHysteresisHold(false);
          setIsQuickDraining(false);
        }
      } else {
        const currentLevel = tankLevelRef.current;

        // Si el comando de bomba se apaga y bajó de MAX, limpiar histéresis
        if (!s.isTankPumpCommand && tankHysteresisRef.current && currentLevel < 92) {
          tankHysteresisRef.current = false;
          setTankHysteresisHold(false);
        }

        const activelyPumping = s.isTankPumpCommand && !tankHysteresisRef.current;
        if (activelyPumping) {
          setPumpAngle(prev => (prev + 14) % 360);
        }

        let delta = 0;
        if (activelyPumping) {
          delta += 0.6;
        }
        if (s.drainValveOpen && currentLevel > 15 && s.isSimRunning) {
          delta -= 0.18;
        }

        if (delta !== 0) {
          const clamped = Math.max(15, Math.min(95, currentLevel + delta));
          tankLevelRef.current = clamped;
          setTankLevel(clamped);

          if (clamped >= 95 && !tankHysteresisRef.current) {
            tankHysteresisRef.current = true;
            setTankHysteresisHold(true);
          } else if (clamped <= 65 && tankHysteresisRef.current) {
            tankHysteresisRef.current = false;
            setTankHysteresisHold(false);
          }
        }
      }

      // 3. GEMELO LOCAL NEUMÁTICO (solo si no hay cilindro real en solver)
      if (!s.hasRealPneumatic) {
        if (s.isLocalPneumaticDrive) {
          let phase = localPhaseRef.current;
          let pos = localPosRef.current;

          if (phase === 'idle') {
            phase = pos >= 0.96 ? 'retracting' : 'extending';
            localPhaseRef.current = phase;
            setLocalPneumaticPhase(phase);
          }

          if (phase === 'extending') {
            pos = Math.min(1, pos + 0.032);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
            if (pos >= 1) {
              localPhaseRef.current = 'dwell_end';
              localDwellRef.current = 7;
              setLocalPneumaticPhase('dwell_end');
            }
          } else if (phase === 'dwell_end') {
            localDwellRef.current -= 1;
            if (localDwellRef.current <= 0) {
              localPhaseRef.current = 'retracting';
              setLocalPneumaticPhase('retracting');
            }
          } else if (phase === 'retracting') {
            pos = Math.max(0, pos - 0.032);
            localPosRef.current = pos;
            setLocalPistonPos(pos);
            if (pos <= 0) {
              localPhaseRef.current = 'dwell_start';
              localDwellRef.current = 7;
              setLocalPneumaticPhase('dwell_start');
            }
          } else if (phase === 'dwell_start') {
            localDwellRef.current -= 1;
            if (localDwellRef.current <= 0) {
              localPhaseRef.current = 'extending';
              setLocalPneumaticPhase('extending');
            }
          }
        } else if (localPhaseRef.current !== 'idle') {
          localPhaseRef.current = 'idle';
          setLocalPneumaticPhase('idle');
        }
      }

      // 4. EMBOTELLADORA GEMMA (AVANCE -> LLENADO -> TAPADO -> SALIDA)
      if (s.isBottlingRunning) {
        const cur = bottlingRef.current;
        let next: BottlingState = { ...cur };
        let completedBottle = false;

        if (cur.stage === 'advance_fill') {
          setBottlingRollerAngle(prev => (prev + 8) % 360);
          next.bottleX = cur.bottleX + 2.2;
          if (next.bottleX >= 132) {
            next.bottleX = 132;
            next.stage = 'filling';
          }
        } else if (cur.stage === 'filling') {
          next.fillLevel = Math.min(100, cur.fillLevel + 2.4);
          if (next.fillLevel >= 100) {
            next.stage = 'advance_cap';
          }
        } else if (cur.stage === 'advance_cap') {
          setBottlingRollerAngle(prev => (prev + 8) % 360);
          next.bottleX = cur.bottleX + 2.2;
          if (next.bottleX >= 232) {
            next.bottleX = 232;
            next.stage = 'capping';
            next.capProgress = 0;
          }
        } else if (cur.stage === 'capping') {
          next.capProgress = Math.min(100, cur.capProgress + 3.2);
          if (next.capProgress >= 50) {
            next.isCapped = true;
          }
          if (next.capProgress >= 100) {
            next.capProgress = 0;
            next.stage = 'exit';
          }
        } else if (cur.stage === 'exit') {
          setBottlingRollerAngle(prev => (prev + 8) % 360);
          next.bottleX = cur.bottleX + 2.5;
          if (next.bottleX >= 326) {
            completedBottle = true;
            next = { ...INITIAL_BOTTLING_STATE };
          }
        }

        bottlingRef.current = next;
        setBottling(next);
        if (completedBottle) {
          setBottledCount(c => c + 1);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [shouldTick]);

  // Manejadores de pulsadores I (Marcha) y O (Paro) protegidos contra hover
  const handleStartPress = (isPressed: boolean) => {
    if (isPressed) {
      isStartHeldRef.current = true;
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      onPressButton('btn_start', true);
    } else if (isStartHeldRef.current) {
      isStartHeldRef.current = false;
      startTimerRef.current = setTimeout(() => {
        onPressButton('btn_start', false);
      }, 380);
    }
  };

  const handleStartClick = () => {
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    onPressButton('btn_start', true);
    startTimerRef.current = setTimeout(() => {
      onPressButton('btn_start', false);
    }, 400);
  };

  const handleStopPress = (isPressed: boolean) => {
    if (isPressed) {
      isStopHeldRef.current = true;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      onPressButton('btn_stop', true);
    } else if (isStopHeldRef.current) {
      isStopHeldRef.current = false;
      stopTimerRef.current = setTimeout(() => {
        onPressButton('btn_stop', false);
      }, 320);
    }
  };

  const handleStopClick = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    onPressButton('btn_stop', true);
    stopTimerRef.current = setTimeout(() => {
      onPressButton('btn_stop', false);
    }, 380);
  };

  const handleResetAll = () => {
    setBoxPos(8);
    setProcessedBoxes(0);
    setSensorActive(false);
    setDiverterExtend(0);

    tankLevelRef.current = 20;
    tankHysteresisRef.current = false;
    setTankLevel(20);
    setTankHysteresisHold(false);
    setIsQuickDraining(false);

    localPosRef.current = 0;
    localPhaseRef.current = 'idle';
    localDwellRef.current = 0;
    wasAtEndRef.current = false;
    setLocalPistonPos(0);
    setLocalPneumaticPhase('idle');
    setPneumaticCycles(0);

    bottlingRef.current = { ...INITIAL_BOTTLING_STATE };
    setBottling({ ...INITIAL_BOTTLING_STATE });
    setBottledCount(0);
  };

  if (!isOpen && !embeddedMode) return null;

  // Variables derivadas para renderizado
  const boxX = 52 + ((boxPos - 5) / 91) * 218;
  const rodExtendPx = Math.round(pistonPos * 92);

  // Derivados del tanque
  const isActivelyPumping = isTankPumpCommand && !tankHysteresisHold && !isQuickDraining;
  const isTankDraining =
    isQuickDraining || (drainValveOpen && tankLevel > 15.2 && isSimRunning);
  const tankMaxReached = tankLevel >= 94.5;
  const tankMinActive = tankLevel <= 22;
  const waterHeightPx = Math.max(4, (tankLevel / 100) * 102);
  const waterTopY = 128 - waterHeightPx;

  // Derivados de la embotelladora
  const bottlingKm1 =
    isBottlingRunning &&
    (bottling.stage === 'advance_fill' ||
      bottling.stage === 'advance_cap' ||
      bottling.stage === 'exit');
  const bottlingY1 = (isBottlingRunning && bottling.stage === 'filling') || realY1Active;
  const bottlingY2 =
    (isBottlingRunning && bottling.stage === 'capping' && bottling.capProgress <= 65) ||
    realY2Active;
  const bottlingSensorA0 = Math.abs(bottling.bottleX - 132) < 12;
  const bottlingSensorA1 = Math.abs(bottling.bottleX - 232) < 12;
  const capDropPx =
    bottling.stage === 'capping'
      ? bottling.capProgress <= 50
        ? (bottling.capProgress / 50) * 19
        : ((100 - bottling.capProgress) / 50) * 19
      : 0;

  const bottlingStationLabel = !isBottlingRunning
    ? 'REPOSO'
    : bottling.stage === 'filling'
      ? 'LLENANDO'
      : bottling.stage === 'capping'
        ? 'TAPANDO'
        : 'BANDA';

  const isGlobalActive =
    isAnyActuatorRunning || isActivelyPumping || y1Active || y2Active || isBottlingRunning;

  const plantBadge =
    plantMode === 'conveyor'
      ? 'CINTA'
      : plantMode === 'tank'
        ? 'TANQUE'
        : plantMode === 'pneumatic'
          ? 'NEUMÁTICA'
          : 'EMBOTELLADORA';

  const wrapperClass = embeddedMode
    ? 'w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 select-none'
    : `absolute top-14 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 transition-all select-none animate-in fade-in zoom-in-95 duration-200 ${
        isMinimized ? 'w-72 shadow-lg' : 'w-[470px]'
      }`;

  const modeButtons: Array<{ id: PlantMode; label: string }> = [
    { id: 'conveyor', label: 'Cinta' },
    { id: 'tank', label: 'Tanque' },
    { id: 'pneumatic', label: 'Neumática' },
    { id: 'bottling', label: 'Embotelladora' }
  ];

  return (
    <div className={wrapperClass}>
      {/* Cabecera Industrial */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white cursor-pointer"
        onClick={() => !embeddedMode && isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
              isGlobalActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'
            }`}
          />
          <h3 className="text-xs font-bold font-sans tracking-wide flex items-center gap-1.5 truncate">
            <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">
              Gemelo Digital Planta 2D
              {!embeddedMode && isMinimized && (isGlobalActive ? ' · EN MARCHA' : ' · PARADO')}
            </span>
          </h3>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 font-bold shrink-0">
            {plantBadge}
          </span>
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${
              isSimRunning
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
            }`}
          >
            {isSimRunning ? 'SIM EN VIVO' : 'EN ESPERA'}
          </span>
        </div>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {(!isMinimized || embeddedMode) && (
            <div className="flex items-center bg-slate-700/80 rounded-lg p-0.5 text-[10px] font-bold">
              {modeButtons.map(m => (
                <button
                  key={m.id}
                  onClick={() => setPlantMode(m.id)}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    plantMode === m.id
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {!embeddedMode && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isMinimized ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={onClose}
                title="Cerrar"
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {(!isMinimized || embeddedMode) && (
        <>
          {/* Área SVG 2D */}
          <div
            className={`relative bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200 border-b border-slate-200 overflow-hidden flex items-center justify-center p-3 ${
              embeddedMode ? 'h-80' : 'h-56'
            }`}
          >
            {/* ==================== MODO 1: CINTA / CLASIFICADORA ==================== */}
            {plantMode === 'conveyor' && (
              <svg className="w-full h-full" viewBox="0 0 360 175">
                <defs>
                  <linearGradient id="conv-frame" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="conv-motor" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isAnyActuatorRunning ? '#0284c7' : '#64748b'} />
                    <stop offset="100%" stopColor={isAnyActuatorRunning ? '#0369a1' : '#334155'} />
                  </linearGradient>
                  <linearGradient id="conv-box" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>

                {/* Guía técnica de fondo y piso */}
                <line x1="0" y1="26" x2="360" y2="26" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="16" y1="160" x2="346" y2="160" stroke="#94a3b8" strokeWidth="2" />

                {/* Torreta Andon */}
                <g transform="translate(20, 20)">
                  <line x1="7" y1="40" x2="7" y2="140" stroke="#475569" strokeWidth="2.5" />
                  <rect x="2" y="136" width="10" height="4" rx="1" fill="#334155" />
                  <rect x="0" y="0" width="14" height="40" rx="2.5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  {!isAnyActuatorRunning && (
                    <circle cx="7" cy="8" r="6" fill="#ef4444" fillOpacity="0.25" />
                  )}
                  <circle cx="7" cy="8" r="4" fill={!isAnyActuatorRunning ? '#ef4444' : '#450a0a'} />
                  {sensorActive && (
                    <circle cx="7" cy="20" r="6" fill="#f59e0b" fillOpacity="0.3" />
                  )}
                  <circle cx="7" cy="20" r="4" fill={sensorActive ? '#f59e0b' : '#451a03'} />
                  {isAnyActuatorRunning && (
                    <circle cx="7" cy="32" r="6" fill="#10b981" fillOpacity="0.3" />
                  )}
                  <circle cx="7" cy="32" r="4" fill={isAnyActuatorRunning ? '#10b981' : '#064e3b'} />
                </g>

                {/* Empujador / Desviador Neumático en Zona de Clasificación */}
                <g transform="translate(226, 20)">
                  <rect x="0" y="0" width="22" height="28" rx="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
                  <rect
                    x="18"
                    y="6"
                    width="8"
                    height="10"
                    rx="1.5"
                    fill={diverterExtend > 0.1 ? '#0284c7' : '#475569'}
                  />
                  {/* Vástago vertical empujador */}
                  <rect
                    x="8.5"
                    y="28"
                    width="5"
                    height={12 + diverterExtend * 14}
                    fill="#f8fafc"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  {/* Zapata clasificadora */}
                  <rect
                    x="2"
                    y={38 + diverterExtend * 14}
                    width="18"
                    height="6"
                    rx="1.5"
                    fill={diverterExtend > 0.1 ? '#0284c7' : '#64748b'}
                    stroke="#0f172a"
                    strokeWidth="1"
                  />
                  <text x="11" y="-4" textAnchor="middle" fontSize="7" fontWeight="bold" fill={diverterExtend > 0.1 ? '#0284c7' : '#64748b'}>
                    -Y1 DESV.
                  </text>
                </g>

                {/* Patas soporte */}
                <rect x="70" y="118" width="6" height="42" fill="#334155" rx="1" />
                <rect x="170" y="118" width="6" height="42" fill="#334155" rx="1" />
                <rect x="270" y="118" width="6" height="42" fill="#334155" rx="1" />

                {/* Estructura y Banda Transportadora */}
                <rect x="44" y="110" width="258" height="12" rx="2" fill="url(#conv-frame)" stroke="#0f172a" strokeWidth="1" />
                <path
                  d="M 54,105 L 292,105 A 10,10 0 0,1 292,125 L 54,125 A 10,10 0 0,1 54,105 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Marcas de tracción animadas sobre la banda */}
                <line
                  x1="58"
                  y1="106.5"
                  x2="288"
                  y2="106.5"
                  stroke="#38bdf8"
                  strokeOpacity={isAnyActuatorRunning ? 0.8 : 0.25}
                  strokeWidth="2"
                  strokeDasharray="6 10"
                  strokeDashoffset={-flowOffset}
                />
                <line
                  x1="58"
                  y1="123.5"
                  x2="288"
                  y2="123.5"
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeDasharray="6 10"
                  strokeDashoffset={flowOffset}
                />

                {/* Rodillos rotatorios */}
                {[54, 90, 130, 170, 210, 250, 292].map(rx => (
                  <g key={rx} transform={`translate(${rx}, 115)`}>
                    <circle cx="0" cy="0" r="6" fill="#94a3b8" stroke="#334155" strokeWidth="1.2" />
                    <g transform={`rotate(${rollerAngle})`}>
                      <line x1="-4" y1="0" x2="4" y2="0" stroke="#0f172a" strokeWidth="1.2" />
                      <line x1="0" y1="-4" x2="0" y2="4" stroke="#0f172a" strokeWidth="1.2" />
                    </g>
                  </g>
                ))}

                {/* Foto-sensor -B1 */}
                <g transform="translate(186, 40)">
                  <line x1="5" y1="0" x2="5" y2="12" stroke="#64748b" strokeWidth="2" />
                  <rect x="0" y="12" width="10" height="18" rx="2" fill="#0f172a" />
                  <circle cx="5" cy="18" r="2.2" fill={sensorActive ? '#f59e0b' : '#475569'} />
                  {sensorActive && (
                    <circle cx="5" cy="18" r="5" fill="#f59e0b" fillOpacity="0.3" />
                  )}
                  <line
                    x1="5"
                    y1="30"
                    x2="5"
                    y2={sensorActive ? 38 : 65}
                    stroke={sensorActive ? '#f59e0b' : '#ef4444'}
                    strokeWidth={sensorActive ? 2.2 : 1.4}
                    strokeDasharray="2 2"
                  />
                  <text x="5" y="-3" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={sensorActive ? '#d97706' : '#64748b'}>
                    -B1
                  </text>
                </g>

                {/* Caja Industrial en movimiento */}
                <g transform={`translate(${boxX}, 78)`}>
                  <rect x="1" y="25" width="28" height="3" rx="1" fill="#0f172a" fillOpacity="0.2" />
                  <rect x="0" y="0" width="30" height="26" rx="2.5" fill="url(#conv-box)" stroke="#78350f" strokeWidth="1.5" />
                  <line x1="0" y1="13" x2="30" y2="13" stroke="#92400e" strokeWidth="0.8" strokeOpacity="0.45" />
                  <rect x="6" y="4" width="18" height="7" fill="#fef3c7" rx="1" />
                  <text x="15" y="9.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#78350f">
                    BARU
                  </text>
                  {/* Código de barras */}
                  <g transform="translate(8, 16)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#451a03" strokeWidth="1" />
                    <line x1="3" y1="0" x2="3" y2="6" stroke="#451a03" strokeWidth="1.5" />
                    <line x1="6" y1="0" x2="6" y2="6" stroke="#451a03" strokeWidth="0.8" />
                    <line x1="9" y1="0" x2="9" y2="6" stroke="#451a03" strokeWidth="1.4" />
                    <line x1="13" y1="0" x2="13" y2="6" stroke="#451a03" strokeWidth="1" />
                  </g>
                </g>

                {/* Motor Motoreductor -KM1 */}
                <g transform="translate(308, 84)">
                  <rect x="0" y="0" width="36" height="30" rx="3" fill="url(#conv-motor)" stroke="#0f172a" strokeWidth="1.5" />
                  <g transform="translate(18, 15)">
                    <circle cx="0" cy="0" r="9" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                    <g transform={`rotate(${rollerAngle * 1.4})`}>
                      <line x1="-6" y1="0" x2="6" y2="0" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" />
                    </g>
                    <circle cx="0" cy="0" r="4.5" fill="#f8fafc" />
                    <text x="0" y="2.2" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">
                      M
                    </text>
                  </g>
                  <text x="18" y="40" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#0369a1">
                    -KM1
                  </text>
                </g>
              </svg>
            )}

            {/* ==================== MODO 2: TANQUE + BOMBA + DESCARGA ==================== */}
            {plantMode === 'tank' && (
              <>
                {/* Controles interactivos de Válvula Salida y Vaciado */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                  <button
                    onClick={() => setDrainValveOpen(v => !v)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs flex items-center gap-1 transition-colors cursor-pointer ${
                      drainValveOpen
                        ? 'bg-sky-600 text-white border-sky-700 hover:bg-sky-500'
                        : 'bg-white/95 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Droplets className="w-3 h-3" />
                    <span>Válvula Salida: {drainValveOpen ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => setIsQuickDraining(true)}
                    disabled={tankLevel <= 15.2}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 hover:bg-amber-50 text-slate-700 border border-slate-300 shadow-xs flex items-center gap-1 transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3 h-3 text-amber-600" />
                    <span>Vaciar</span>
                  </button>
                </div>

                {/* Insignia de NIVEL MÁXIMO */}
                {tankMaxReached && (
                  <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>NIVEL MÁXIMO</span>
                  </div>
                )}

                <svg className="w-full h-full" viewBox="0 0 360 175">
                  <defs>
                    <linearGradient id="tank-water" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
                    </linearGradient>
                    <linearGradient id="tank-body" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="22%" stopColor="#ffffff" />
                      <stop offset="85%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <clipPath id="tank-inner-clip">
                      <rect x="128" y="24" width="124" height="106" rx="5" />
                    </clipPath>
                  </defs>

                  {/* Piso industrial */}
                  <line x1="16" y1="160" x2="346" y2="160" stroke="#94a3b8" strokeWidth="2" />

                  {/* Tubería de succión izquierda */}
                  <path d="M 18,128 L 46,128" stroke="#475569" strokeWidth="8" fill="none" strokeLinecap="round" />
                  <path
                    d="M 18,128 L 46,128"
                    stroke={isActivelyPumping ? '#38bdf8' : '#94a3b8'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="6 6"
                    strokeDashoffset={-flowOffset}
                  />

                  {/* Tubería de impulsión desde bomba hasta tope del tanque */}
                  <path
                    d="M 64,104 L 64,16 L 166,16 L 166,28"
                    stroke="#334155"
                    strokeWidth="9"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 64,104 L 64,16 L 166,16 L 166,28"
                    stroke="#cbd5e1"
                    strokeWidth="5"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  {isActivelyPumping && (
                    <path
                      d="M 64,104 L 64,16 L 166,16 L 166,28"
                      stroke="#0ea5e9"
                      strokeWidth="4.2"
                      fill="none"
                      strokeLinejoin="round"
                      strokeDasharray="7 7"
                      strokeDashoffset={-flowOffset}
                    />
                  )}

                  {/* Boquilla de entrada de agua en la parte superior del tanque */}
                  <rect x="160" y="22" width="12" height="8" rx="1.5" fill="#334155" />

                  {/* Patas soporte del tanque */}
                  <rect x="136" y="132" width="8" height="28" fill="#334155" rx="1" />
                  <rect x="236" y="132" width="8" height="28" fill="#334155" rx="1" />

                  {/* Cuerpo del Tanque Principal */}
                  <rect
                    x="126"
                    y="22"
                    width="128"
                    height="110"
                    rx="7"
                    fill="url(#tank-body)"
                    stroke="#334155"
                    strokeWidth="2.2"
                  />

                  {/* Interior recortado: chorro vertiendo + agua subiendo/bajando */}
                  <g clipPath="url(#tank-inner-clip)">
                    {/* Chorro cayendo desde la boquilla hasta la superficie del agua */}
                    {isActivelyPumping && (
                      <>
                        <rect
                          x="163"
                          y="28"
                          width="6"
                          height={Math.max(4, waterTopY - 26)}
                          fill="#38bdf8"
                          fillOpacity="0.7"
                        />
                        <line
                          x1="166"
                          y1="28"
                          x2="166"
                          y2={Math.max(32, waterTopY + 2)}
                          stroke="#e0f2fe"
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          strokeDashoffset={-flowOffset * 1.4}
                        />
                      </>
                    )}

                    {/* Columna de agua */}
                    <rect
                      x="128"
                      y={waterTopY}
                      width="124"
                      height={waterHeightPx + 4}
                      fill="url(#tank-water)"
                    />

                    {/* Superficie luminosa del agua + ondas cuando bombea */}
                    <line
                      x1="128"
                      y1={waterTopY}
                      x2="252"
                      y2={waterTopY}
                      stroke="#bae6fd"
                      strokeWidth="2.5"
                    />
                    {isActivelyPumping && (
                      <>
                        <ellipse
                          cx="166"
                          cy={waterTopY + 1}
                          rx={8 + (flowOffset % 10)}
                          ry="2.5"
                          fill="none"
                          stroke="#ffffff"
                          strokeOpacity="0.8"
                          strokeWidth="1.5"
                        />
                        <circle cx="158" cy={waterTopY + 10} r="1.8" fill="#e0f2fe" fillOpacity="0.85" />
                        <circle cx="174" cy={waterTopY + 16} r="1.4" fill="#e0f2fe" fillOpacity="0.75" />
                      </>
                    )}
                  </g>

                  {/* Escala graduada del tanque */}
                  {[25, 50, 75].map(pct => {
                    const gy = 128 - (pct / 100) * 102;
                    return (
                      <g key={pct}>
                        <line x1="128" y1={gy} x2="136" y2={gy} stroke="#475569" strokeWidth="1" />
                        <text x="139" y={gy + 2.5} fontSize="6.5" fill="#475569" fontFamily="monospace">
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Sensor de nivel MAX (95%) */}
                  <g transform="translate(242, 31)">
                    <line x1="-10" y1="0" x2="12" y2="0" stroke={tankMaxReached ? '#f59e0b' : '#475569'} strokeWidth="1.5" />
                    <rect x="12" y="-5" width="18" height="10" rx="2" fill="#0f172a" />
                    <circle cx="17" cy="0" r="2.5" fill={tankMaxReached ? '#f59e0b' : '#475569'} />
                    {tankMaxReached && <circle cx="17" cy="0" r="5" fill="#f59e0b" fillOpacity="0.35" />}
                    <text x="34" y="3" fontSize="7.5" fontWeight="bold" fill={tankMaxReached ? '#d97706' : '#64748b'}>
                      MAX
                    </text>
                  </g>

                  {/* Sensor de nivel MIN (20%) */}
                  <g transform="translate(242, 108)">
                    <line x1="-10" y1="0" x2="12" y2="0" stroke={tankMinActive ? '#0ea5e9' : '#475569'} strokeWidth="1.5" />
                    <rect x="12" y="-5" width="18" height="10" rx="2" fill="#0f172a" />
                    <circle cx="17" cy="0" r="2.5" fill={tankMinActive ? '#38bdf8' : '#475569'} />
                    {tankMinActive && <circle cx="17" cy="0" r="5" fill="#38bdf8" fillOpacity="0.35" />}
                    <text x="34" y="3" fontSize="7.5" fontWeight="bold" fill={tankMinActive ? '#0284c7' : '#64748b'}>
                      MIN
                    </text>
                  </g>

                  {/* Lectura digital central sobre cápsula legible */}
                  <g transform="translate(190, 78)">
                    <rect x="-26" y="-13" width="52" height="22" rx="6" fill="#0f172a" fillOpacity="0.78" />
                    <text x="0" y="3" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">
                      {Math.round(tankLevel)}%
                    </text>
                  </g>

                  {/* Tubería de salida / consumo derecha + Válvula -V1 */}
                  <path
                    d="M 254,122 L 332,122 L 332,148"
                    stroke="#334155"
                    strokeWidth="8"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 254,122 L 332,122 L 332,148"
                    stroke="#cbd5e1"
                    strokeWidth="4.5"
                    fill="none"
                    strokeLinejoin="round"
                  />
                  {isTankDraining && (
                    <>
                      <path
                        d="M 254,122 L 332,122 L 332,148"
                        stroke="#0ea5e9"
                        strokeWidth="3.8"
                        fill="none"
                        strokeLinejoin="round"
                        strokeDasharray="6 6"
                        strokeDashoffset={-flowOffset}
                      />
                      <line
                        x1="332"
                        y1="148"
                        x2="332"
                        y2="159"
                        stroke="#38bdf8"
                        strokeWidth="4"
                        strokeDasharray="3 3"
                        strokeDashoffset={-flowOffset}
                      />
                    </>
                  )}

                  {/* Símbolo Válvula de Salida -V1 */}
                  <g transform="translate(292, 122)">
                    <polygon
                      points="-8,-7 0,0 -8,7"
                      fill={drainValveOpen || isQuickDraining ? '#10b981' : '#ef4444'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <polygon
                      points="8,-7 0,0 8,7"
                      fill={drainValveOpen || isQuickDraining ? '#10b981' : '#ef4444'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    <line x1="0" y1="0" x2="0" y2="-11" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="-6" y1="-11" x2="6" y2="-11" stroke="#0f172a" strokeWidth="2" />
                    <text x="0" y="18" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#475569">
                      -V1
                    </text>
                  </g>

                  {/* Bomba Centrífuga -KM1 con impulsor rotatorio animado */}
                  <g transform="translate(64, 128)">
                    <rect x="-18" y="20" width="36" height="12" rx="2" fill="#334155" />
                    <circle
                      cx="0"
                      cy="0"
                      r="23"
                      fill={
                        isActivelyPumping
                          ? '#0284c7'
                          : tankHysteresisHold && isTankPumpCommand
                            ? '#d97706'
                            : '#64748b'
                      }
                      stroke="#0f172a"
                      strokeWidth="2.2"
                    />
                    <circle cx="0" cy="0" r="15" fill="#e0f2fe" stroke="#0f172a" strokeWidth="1.2" />
                    {/* Aspas del impulsor girando */}
                    <g transform={`rotate(${pumpAngle})`}>
                      {[0, 60, 120, 180, 240, 300].map(deg => (
                        <path
                          key={deg}
                          d="M 0,0 Q 5,-6 12,-4"
                          transform={`rotate(${deg})`}
                          stroke={isActivelyPumping ? '#0369a1' : '#475569'}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          fill="none"
                        />
                      ))}
                    </g>
                    <circle cx="0" cy="0" r="4" fill="#0f172a" />
                    <text x="0" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0369a1">
                      BOMBA -KM1
                    </text>
                  </g>
                </svg>
              </>
            )}

            {/* ==================== MODO 3: NEUMÁTICA A+ / A- ==================== */}
            {plantMode === 'pneumatic' && (
              <>
                {/* Indicador de fuente y botón directo a esquema electroneumático */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                      hasRealPneumatic
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-sky-100 text-sky-700 border-sky-300'
                    }`}
                  >
                    {hasRealPneumatic ? 'PLC REAL' : 'GEMELO LOCAL SYNC'}
                  </span>
                  {!hasRealPneumatic && onLoadExample && (
                    <button
                      onClick={() => onLoadExample('pneumatic_plc')}
                      className="px-2.5 py-1 rounded-full bg-white/95 hover:bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Cargar esquema Electroneumática</span>
                    </button>
                  )}
                </div>

                <svg className="w-full h-full" viewBox="0 0 360 175">
                  {/* Banco neumático */}
                  <line x1="18" y1="154" x2="342" y2="154" stroke="#94a3b8" strokeWidth="2" />

                  {/* Unidad FRL de aire comprimido */}
                  <g transform="translate(24, 78)">
                    <rect x="0" y="0" width="28" height="48" rx="4" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
                    <circle cx="14" cy="15" r="8" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
                    <line
                      x1="14"
                      y1="15"
                      x2={y1Active || y2Active ? 19 : 18}
                      y2={y1Active || y2Active ? 11 : 10}
                      stroke="#dc2626"
                      strokeWidth="1.6"
                    />
                    <circle cx="14" cy="15" r="1.5" fill="#0f172a" />
                    <text x="14" y="38" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0369a1">
                      6 BAR
                    </text>
                  </g>

                  {/* Alimentación FRL -> Válvula 5/2 */}
                  <path d="M 52,118 L 106,118" fill="none" stroke="#64748b" strokeWidth="3" />

                  {/* Tubería aire Y1 (Cámara izquierda -> Avance A+) */}
                  <path
                    d="M 122,106 L 122,94 L 108,94 L 108,82"
                    fill="none"
                    stroke={y1Active ? '#0284c7' : '#94a3b8'}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {y1Active && (
                    <path
                      d="M 122,106 L 122,94 L 108,94 L 108,82"
                      fill="none"
                      stroke="#bae6fd"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      strokeDashoffset={-flowOffset}
                    />
                  )}

                  {/* Tubería aire Y2 (Cámara derecha -> Retorno A-) */}
                  <path
                    d="M 176,106 L 176,94 L 194,94 L 194,82"
                    fill="none"
                    stroke={y2Active ? '#f59e0b' : '#94a3b8'}
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {y2Active && (
                    <path
                      d="M 176,106 L 176,94 L 194,94 L 194,82"
                      fill="none"
                      stroke="#fef3c7"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      strokeDashoffset={-flowOffset}
                    />
                  )}

                  {/* Cilindro Doble Efecto -A */}
                  <g transform="translate(100, 36)">
                    {/* Camisa de aluminio */}
                    <rect x="0" y="10" width="102" height="36" rx="3" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
                    {/* Cámara izquierda (presurizada con Y1) */}
                    <rect
                      x="3"
                      y="13"
                      width={Math.max(4, rodExtendPx * 0.85)}
                      height="30"
                      fill={y1Active ? '#38bdf8' : '#e2e8f0'}
                      fillOpacity={y1Active ? 0.65 : 0.45}
                    />
                    {/* Cámara derecha (presurizada con Y2) */}
                    <rect
                      x={16 + rodExtendPx * 0.85}
                      y="13"
                      width={Math.max(2, 83 - rodExtendPx * 0.85)}
                      height="30"
                      fill={y2Active ? '#fbbf24' : '#e2e8f0'}
                      fillOpacity={y2Active ? 0.55 : 0.35}
                    />
                    {/* Émbolo interno con sellos */}
                    <rect x={5 + rodExtendPx * 0.85} y="12" width="11" height="32" rx="1" fill="#334155" />
                    <line x1={7 + rodExtendPx * 0.85} y1="12" x2={7 + rodExtendPx * 0.85} y2="44" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1={14 + rodExtendPx * 0.85} y1="12" x2={14 + rodExtendPx * 0.85} y2="44" stroke="#0f172a" strokeWidth="1.5" />

                    {/* Vástago cromado */}
                    <rect
                      x={16 + rodExtendPx * 0.85}
                      y="23"
                      width="96"
                      height="10"
                      rx="1.5"
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />
                    {/* Empujador / Actuador */}
                    <rect
                      x={110 + rodExtendPx * 0.85}
                      y="16"
                      width="14"
                      height="24"
                      rx="2"
                      fill="#0284c7"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Sensores Reed Magnéticos a0 y a1 */}
                    <g transform="translate(4, -3)">
                      <rect x="0" y="0" width="15" height="10" rx="2" fill={reedA0 ? '#10b981' : '#475569'} />
                      {reedA0 && <circle cx="7.5" cy="5" r="7" fill="#10b981" fillOpacity="0.28" />}
                      <text x="7.5" y="-3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={reedA0 ? '#059669' : '#64748b'}>
                        a0
                      </text>
                    </g>
                    <g transform="translate(83, -3)">
                      <rect x="0" y="0" width="15" height="10" rx="2" fill={reedA1 ? '#10b981' : '#475569'} />
                      {reedA1 && <circle cx="7.5" cy="5" r="7" fill="#10b981" fillOpacity="0.28" />}
                      <text x="7.5" y="-3" textAnchor="middle" fontSize="8" fontWeight="bold" fill={reedA1 ? '#059669' : '#64748b'}>
                        a1
                      </text>
                    </g>
                  </g>

                  {/* Bloque Electroválvula 5/2 Biestable */}
                  <g transform="translate(106, 106)">
                    <rect x="0" y="0" width="90" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                    <rect x="4" y="4" width="20" height="22" rx="2" fill={y1Active ? '#0284c7' : '#334155'} />
                    <text x="14" y="18" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">
                      Y1
                    </text>
                    {/* Indicador corredera */}
                    <rect x="28" y="6" width="34" height="18" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    <rect
                      x={y1Active ? 31 : y2Active ? 49 : 40}
                      y="9"
                      width="10"
                      height="12"
                      rx="1.5"
                      fill={y1Active ? '#38bdf8' : y2Active ? '#fbbf24' : '#64748b'}
                    />
                    <rect x="66" y="4" width="20" height="22" rx="2" fill={y2Active ? '#f59e0b' : '#334155'} />
                    <text x="76" y="18" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#fff">
                      Y2
                    </text>
                    <text x="45" y="40" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#475569">
                      VÁLVULA 5/2
                    </text>
                  </g>

                  {/* Tope / Estación de trabajo derecha */}
                  <rect x="306" y="46" width="14" height="108" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1.2" />
                  <rect x="303" y="52" width="3" height="24" rx="1" fill={reedA1 ? '#10b981' : '#94a3b8'} />
                </svg>
              </>
            )}

            {/* ==================== MODO 4: EMBOTELLADORA GEMMA 2D ==================== */}
            {plantMode === 'bottling' && (
              <svg className="w-full h-full" viewBox="0 0 360 175">
                <defs>
                  <linearGradient id="bot-hopper" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="45%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                  <linearGradient id="bot-liquid" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="bot-glass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Piso y viga superior de estaciones */}
                <line x1="12" y1="162" x2="348" y2="162" stroke="#94a3b8" strokeWidth="2" />
                <rect x="52" y="8" width="256" height="5" rx="2" fill="#334155" />

                {/* Torreta GEMMA de 3 colores (D1 Rojo / A1 Ámbar / F1 Verde) */}
                <g transform="translate(12, 22)">
                  <line x1="8" y1="46" x2="8" y2="140" stroke="#475569" strokeWidth="2.5" />
                  <rect x="3" y="136" width="10" height="4" rx="1" fill="#334155" />
                  <rect x="0" y="0" width="16" height="46" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />

                  {/* D1 Paro / Stop (Rojo) */}
                  {!isSimRunning && <circle cx="8" cy="9" r="6.5" fill="#ef4444" fillOpacity="0.3" />}
                  <circle cx="8" cy="9" r="4" fill={!isSimRunning ? '#ef4444' : '#450a0a'} />
                  <text x="20" y="11.5" fontSize="6.5" fontWeight="bold" fill={!isSimRunning ? '#dc2626' : '#94a3b8'}>
                    D1
                  </text>

                  {/* A1 Pausa / Reposo (Ámbar) */}
                  {isSimRunning && !isBottlingRunning && (
                    <circle cx="8" cy="23" r="6.5" fill="#f59e0b" fillOpacity="0.32" />
                  )}
                  <circle cx="8" cy="23" r="4" fill={isSimRunning && !isBottlingRunning ? '#f59e0b' : '#451a03'} />
                  <text x="20" y="25.5" fontSize="6.5" fontWeight="bold" fill={isSimRunning && !isBottlingRunning ? '#d97706' : '#94a3b8'}>
                    A1
                  </text>

                  {/* F1 Producción Normal (Verde) */}
                  {isBottlingRunning && <circle cx="8" cy="37" r="6.5" fill="#10b981" fillOpacity="0.32" />}
                  <circle cx="8" cy="37" r="4" fill={isBottlingRunning ? '#10b981' : '#064e3b'} />
                  <text x="20" y="39.5" fontSize="6.5" fontWeight="bold" fill={isBottlingRunning ? '#059669' : '#94a3b8'}>
                    F1
                  </text>
                </g>

                {/* ESTACIÓN 1: TOLVA + BOQUILLA DE LLENADO (Y1) */}
                <g transform="translate(132, 13)">
                  {/* Cuerpo Tolva */}
                  <rect x="-26" y="2" width="52" height="38" rx="4" fill="url(#bot-hopper)" stroke="#334155" strokeWidth="1.6" />
                  {/* Ventana de nivel de líquido */}
                  <rect x="-18" y="10" width="36" height="24" rx="2" fill="#e0f2fe" stroke="#64748b" strokeWidth="1" />
                  <rect x="-17" y="15" width="34" height="18" rx="1" fill="url(#bot-liquid)" fillOpacity="0.85" />
                  <text x="0" y="8" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#334155">
                    LLENADO
                  </text>

                  {/* Válvula solenoide Y1 */}
                  <rect x="-12" y="40" width="24" height="14" rx="2" fill={bottlingY1 ? '#0284c7' : '#334155'} stroke="#0f172a" strokeWidth="1.2" />
                  <text x="0" y="49.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#ffffff">
                    Y1
                  </text>
                  {/* Boquilla dispensadora */}
                  <polygon points="-4,54 4,54 2.5,66 -2.5,66" fill="#475569" stroke="#0f172a" strokeWidth="1" />

                  {/* Chorro de líquido cian vertiendo dentro de la botella */}
                  {bottlingY1 && (
                    <>
                      <rect x="-2.2" y="66" width="4.4" height="44" fill="#22d3ee" fillOpacity="0.85" />
                      <line
                        x1="0"
                        y1="66"
                        x2="0"
                        y2="108"
                        stroke="#ecfeff"
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                        strokeDashoffset={-flowOffset * 1.5}
                      />
                    </>
                  )}
                </g>

                {/* ESTACIÓN 2: CILINDRO TAPADOR NEUMÁTICO (Y2) */}
                <g transform="translate(232, 13)">
                  {/* Cuerpo del cilindro vertical */}
                  <rect x="-15" y="2" width="30" height="36" rx="3" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.6" />
                  <text x="0" y="12" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#334155">
                    TAPADO
                  </text>
                  {/* Bobina Y2 lateral */}
                  <rect x="15" y="12" width="16" height="16" rx="2" fill={bottlingY2 ? '#f59e0b' : '#334155'} stroke="#0f172a" strokeWidth="1" />
                  <text x="23" y="22.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#ffffff">
                    Y2
                  </text>

                  {/* Vástago vertical + cabezal tapador */}
                  <rect x="-3" y="38" width="6" height={12 + capDropPx} fill="#f8fafc" stroke="#334155" strokeWidth="1.2" />
                  <rect
                    x="-10"
                    y={48 + capDropPx}
                    width="20"
                    height="8"
                    rx="1.5"
                    fill={bottlingY2 ? '#1d4ed8' : '#475569'}
                    stroke="#0f172a"
                    strokeWidth="1.2"
                  />
                  {/* Tapa azul sostenida en la pinza al bajar */}
                  {bottling.stage === 'capping' && !bottling.isCapped && (
                    <rect
                      x="-5.5"
                      y={55 + capDropPx}
                      width="11"
                      height="5"
                      rx="1.5"
                      fill="#1d4ed8"
                      stroke="#1e3a8a"
                      strokeWidth="1"
                    />
                  )}
                </g>

                {/* Patas y Banda Transportadora de Botellas */}
                <rect x="64" y="138" width="6" height="24" fill="#334155" rx="1" />
                <rect x="180" y="138" width="6" height="24" fill="#334155" rx="1" />
                <rect x="292" y="138" width="6" height="24" fill="#334155" rx="1" />

                <path
                  d="M 48,128 L 314,128 A 8,8 0 0,1 314,144 L 48,144 A 8,8 0 0,1 48,128 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <line
                  x1="52"
                  y1="129.5"
                  x2="310"
                  y2="129.5"
                  stroke="#38bdf8"
                  strokeOpacity={bottlingKm1 ? 0.85 : 0.25}
                  strokeWidth="2"
                  strokeDasharray="6 10"
                  strokeDashoffset={-flowOffset}
                />

                {[54, 96, 138, 180, 222, 264, 306].map(rx => (
                  <g key={rx} transform={`translate(${rx}, 136)`}>
                    <circle cx="0" cy="0" r="5" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                    <g transform={`rotate(${bottlingRollerAngle})`}>
                      <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#0f172a" strokeWidth="1.1" />
                      <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#0f172a" strokeWidth="1.1" />
                    </g>
                  </g>
                ))}

                {/* Sensores Ópticos a0 (Posición Llenado) y a1 (Tapado) */}
                <g transform="translate(132, 146)">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-24"
                    stroke={bottlingSensorA0 ? '#10b981' : '#ef4444'}
                    strokeWidth={bottlingSensorA0 ? 2 : 1.2}
                    strokeDasharray="2 2"
                  />
                  <rect x="-11" y="0" width="22" height="12" rx="2.5" fill="#0f172a" />
                  <circle cx="-5" cy="6" r="2.5" fill={bottlingSensorA0 ? '#10b981' : '#475569'} />
                  <text x="4" y="8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={bottlingSensorA0 ? '#34d399' : '#cbd5e1'}>
                    a0
                  </text>
                </g>

                <g transform="translate(232, 146)">
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-24"
                    stroke={bottlingSensorA1 ? '#10b981' : '#ef4444'}
                    strokeWidth={bottlingSensorA1 ? 2 : 1.2}
                    strokeDasharray="2 2"
                  />
                  <rect x="-11" y="0" width="22" height="12" rx="2.5" fill="#0f172a" />
                  <circle cx="-5" cy="6" r="2.5" fill={bottlingSensorA1 ? '#10b981' : '#475569'} />
                  <text x="4" y="8.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={bottlingSensorA1 ? '#34d399' : '#cbd5e1'}>
                    a1
                  </text>
                </g>

                {/* Botella de vidrio en transporte */}
                <g transform={`translate(${bottling.bottleX}, 128)`}>
                  {/* Sombra sobre la banda */}
                  <ellipse cx="0" cy="-1" rx="9" ry="2" fill="#0f172a" fillOpacity="0.22" />

                  {/* Líquido cian interno (0% -> 100%) */}
                  {bottling.fillLevel > 0 && (
                    <>
                      <rect
                        x="-8"
                        y={-2 - (bottling.fillLevel / 100) * 23}
                        width="16"
                        height={(bottling.fillLevel / 100) * 23}
                        rx="2"
                        fill="url(#bot-liquid)"
                      />
                      <line
                        x1="-7.5"
                        y1={-2 - (bottling.fillLevel / 100) * 23}
                        x2="7.5"
                        y2={-2 - (bottling.fillLevel / 100) * 23}
                        stroke="#a5f3fc"
                        strokeWidth="1.4"
                      />
                    </>
                  )}

                  {/* Contorno botella de vidrio */}
                  <path
                    d="M -9,-2 L -9,-23 Q -9,-28 -4,-31 L -4,-38 L 4,-38 L 4,-31 Q 9,-28 9,-23 L 9,-2 Q 9,0 7,0 L -7,0 Q -9,0 -9,-2 Z"
                    fill="url(#bot-glass)"
                    stroke="#334155"
                    strokeWidth="1.4"
                  />
                  {/* Reflejo cristal */}
                  <line x1="-6" y1="-22" x2="-6" y2="-5" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" strokeLinecap="round" />
                  {/* Etiqueta frontal */}
                  <rect x="-7" y="-17" width="14" height="7" rx="1" fill="#ffffff" fillOpacity="0.85" stroke="#94a3b8" strokeWidth="0.6" />
                  <text x="0" y="-12" textAnchor="middle" fontSize="4.2" fontWeight="bold" fill="#0369a1">
                    H2O
                  </text>

                  {/* Tapa azul estampada */}
                  {bottling.isCapped && (
                    <rect
                      x="-5.5"
                      y="-41"
                      width="11"
                      height="5"
                      rx="1.5"
                      fill="#1d4ed8"
                      stroke="#1e3a8a"
                      strokeWidth="1"
                    />
                  )}
                </g>

                {/* Motor de Banda -KM1 */}
                <g transform="translate(322, 118)">
                  <rect
                    x="0"
                    y="0"
                    width="28"
                    height="24"
                    rx="3"
                    fill={bottlingKm1 ? '#0284c7' : '#64748b'}
                    stroke="#0f172a"
                    strokeWidth="1.4"
                  />
                  <circle cx="14" cy="12" r="7" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />
                  <text x="14" y="14.5" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#0f172a">
                    M
                  </text>
                  <text x="14" y="34" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0369a1">
                    -KM1
                  </text>
                </g>
              </svg>
            )}
          </div>

          {/* Telemetría y Controles */}
          <div className="p-3.5 bg-slate-50 space-y-3">
            {plantMode === 'conveyor' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Motor (-KM1)</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isAnyActuatorRunning ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {isAnyActuatorRunning ? 'MARCHA' : 'PARADO'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Sensor -B1</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      sensorActive ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {sensorActive ? 'DETECTADO' : 'LIBRE'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Empujador -Y1</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      diverterExtend > 0.1 ? 'text-sky-600' : 'text-slate-400'
                    }`}
                  >
                    {diverterExtend > 0.1 ? 'ACTIVO' : 'REPOSO'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Piezas OK</div>
                  <div className="text-xs font-mono font-bold text-sky-700">{processedBoxes}</div>
                </div>
              </div>
            )}

            {plantMode === 'tank' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Bomba (-KM1)</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isActivelyPumping
                        ? 'text-emerald-600'
                        : tankHysteresisHold && isTankPumpCommand
                          ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {isActivelyPumping
                      ? 'BOMBEO ON'
                      : tankHysteresisHold && isTankPumpCommand
                        ? 'ESPERA MAX'
                        : 'PARADA'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Nivel Tanque</div>
                  <div className="text-xs font-mono font-bold text-sky-700">
                    {Math.round(tankLevel)}%
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Sensores MIN / MAX</div>
                  <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] font-mono font-bold">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tankMinActive ? 'bg-sky-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className={tankMinActive ? 'text-sky-700' : 'text-slate-400'}>MIN</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tankMaxReached ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <span className={tankMaxReached ? 'text-amber-600' : 'text-slate-400'}>MAX</span>
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Caudal</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isActivelyPumping ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  >
                    {isActivelyPumping ? '45 L/min' : '0 L/min'}
                  </div>
                </div>
              </div>
            )}

            {plantMode === 'pneumatic' && (
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
            )}

            {plantMode === 'bottling' && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Estado GEMMA</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isBottlingRunning ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {isBottlingRunning ? 'F1 PRODUCCIÓN' : 'A1 REPOSO'}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Estación</div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      bottling.stage === 'filling' && isBottlingRunning
                        ? 'text-cyan-600'
                        : bottling.stage === 'capping' && isBottlingRunning
                          ? 'text-amber-600'
                          : isBottlingRunning
                            ? 'text-sky-700'
                            : 'text-slate-400'
                    }`}
                  >
                    {bottlingStationLabel}
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Actuadores</div>
                  <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] font-mono font-bold">
                    <span
                      className={`px-1 rounded ${
                        bottlingKm1
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      KM1
                    </span>
                    <span
                      className={`px-1 rounded ${
                        bottlingY1
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Y1
                    </span>
                    <span
                      className={`px-1 rounded ${
                        bottlingY2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Y2
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Botellas OK</div>
                  <div className="text-xs font-mono font-bold text-sky-700">{bottledCount}</div>
                </div>
              </div>
            )}

            {/* Barra de Mandos Locales HMI */}
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
                onClick={handleResetAll}
                title="Reiniciar Contadores y Planta"
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
